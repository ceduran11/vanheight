import React, { useState, useEffect, useMemo } from "react";
import thirdPlaceTable from "../data/wc2026-third-place-table.json";
import BracketView from "./BracketView.jsx";

const FONT_DISPLAY = "'Georgia', 'Iowan Old Style', serif";
const FONT_BODY = "'Helvetica Neue', Arial, sans-serif";

const COLORS = {
  bg: "#0B1F3A",
  bgCard: "#11264A",
  bgCardAlt: "#0E2240",
  accent: "#00A859",
  accentWarm: "#FFC72C",
  text: "#F4F6F8",
  textMuted: "#9FB3CC",
  border: "#1E3A5F",
  live: "#E0483E",
};

const LIVE_API_BASE = "https://worldcup26.ir";
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// Display-only shorthand for this page — does not affect any other page.
const DISPLAY_NAME_OVERRIDES = {
  "Democratic Republic of the Congo": "Republic of the Congo",
};
function displayName(name) {
  return DISPLAY_NAME_OVERRIDES[name] || name;
}
const FIXED_THIRD_SLOTS = ["A", "B", "D", "E", "G", "I", "K", "L"];

// Fixed Round-of-32 pairing template for the 2026 (48-team) format — this
// never changes regardless of who actually qualifies, only WHO fills each
// label does. Source: official match list (matches 73-88).
const R32_TEMPLATE = [
  { id: 73, home: "Runner-up Group A", away: "Runner-up Group B" },
  { id: 74, home: "Winner Group E", away: "3rd Group A/B/C/D/F" },
  { id: 75, home: "Winner Group F", away: "Runner-up Group C" },
  { id: 76, home: "Winner Group C", away: "Runner-up Group F" },
  { id: 77, home: "Winner Group I", away: "3rd Group C/D/F/G/H" },
  { id: 78, home: "Runner-up Group E", away: "Runner-up Group I" },
  { id: 79, home: "Winner Group A", away: "3rd Group C/E/F/H/I" },
  { id: 80, home: "Winner Group L", away: "3rd Group E/H/I/J/K" },
  { id: 81, home: "Winner Group D", away: "3rd Group B/E/F/I/J" },
  { id: 82, home: "Winner Group G", away: "3rd Group A/E/H/I/J" },
  { id: 83, home: "Runner-up Group K", away: "Runner-up Group L" },
  { id: 84, home: "Winner Group H", away: "Runner-up Group J" },
  { id: 85, home: "Winner Group B", away: "3rd Group E/F/G/I/J" },
  { id: 86, home: "Winner Group J", away: "Runner-up Group H" },
  { id: 87, home: "Winner Group K", away: "3rd Group D/E/I/J/L" },
  { id: 88, home: "Runner-up Group D", away: "Runner-up Group G" },
];

const LATER_ROUNDS = [
  { label: "Ronda de 16", count: 8 },
  { label: "Cuartos de Final", count: 4 },
  { label: "Semifinales", count: 2 },
  { label: "Final", count: 1 },
];

function fetchWithTimeout(url, ms = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then((r) => r.json())
    .finally(() => clearTimeout(timer));
}

async function fetchWithRetry(url, key, retries = 5, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const data = await fetchWithTimeout(url);
      if (Array.isArray(data?.[key])) return data[key];
    } catch {
      // fall through to retry
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`failed to fetch ${url}`);
}

function sortByStats(rows) {
  return [...rows].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

// Resolve a R32 label using the user's manual picks instead of live results.
function resolveSimLabel(label, picksByGroup, thirdAssignment) {
  let m = label.match(/^Winner Group ([A-L])$/);
  if (m) return picksByGroup.get(m[1])?.first || null;

  m = label.match(/^Runner-up Group ([A-L])$/);
  if (m) return picksByGroup.get(m[1])?.second || null;

  if (label.startsWith("3rd Group")) return null; // resolved separately (needs sibling)
  return null;
}

function resolveThirdSimSide(label, siblingLabel, picksByGroup, thirdAssignment) {
  if (!label.startsWith("3rd Group")) return null;
  const siblingGroup = siblingLabel.match(/^Winner Group ([A-L])$/)?.[1];
  if (!siblingGroup) return null;
  const assignedGroup = thirdAssignment?.[`1${siblingGroup}`];
  if (!assignedGroup) return null;
  return picksByGroup.get(assignedGroup)?.third || null;
}

function TeamFlag({ flag }) {
  if (!flag) return null;
  return <img src={flag} alt="" style={styles.flag} />;
}

export default function WorldCupSimulator() {
  const [groupTeams, setGroupTeams] = useState(null); // Map<letter, [{id,name,flag,pts,gd,gf}]>
  const [picks, setPicks] = useState(null); // { [letter]: {first,second,third} }
  const [loadError, setLoadError] = useState(false);
  const [winners, setWinners] = useState({}); // { [matchId]: "home" | "away" }

  function pickWinner(matchId, side) {
    setWinners((prev) => ({ ...prev, [matchId]: prev[matchId] === side ? null : side }));
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [groupsList, teamsList] = await Promise.all([
          fetchWithRetry(`${LIVE_API_BASE}/get/groups`, "groups"),
          fetchWithRetry(`${LIVE_API_BASE}/get/teams`, "teams"),
        ]);
        if (cancelled) return;

        const teamsById = new Map(teamsList.map((t) => [t.id, t]));
        const gt = new Map();
        const initialPicks = {};

        groupsList.forEach((g) => {
          const rows = (g.teams || []).map((row) => ({
            id: row.team_id,
            name: displayName(teamsById.get(row.team_id)?.name_en || "TBD"),
            flag: teamsById.get(row.team_id)?.flag || null,
            pts: Number(row.pts) || 0,
            gd: Number(row.gd) || 0,
            gf: Number(row.gf) || 0,
          }));
          // Keep current real standings as the display order (just easier to
          // read) — but nothing starts checked, the user picks everything.
          gt.set(g.name, sortByStats(rows));
          initialPicks[g.name] = { first: null, second: null, third: null };
        });

        setGroupTeams(gt);
        setPicks(initialPicks);
      } catch (err) {
        console.warn("Simulator failed to load group/team data:", err);
        if (!cancelled) setLoadError(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const thirdCount = useMemo(() => {
    if (!picks) return 0;
    return Object.values(picks).filter((p) => p.third).length;
  }, [picks]);

  function setFirst(group, teamId) {
    setPicks((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        first: teamId,
        second: prev[group].second === teamId ? null : prev[group].second,
        third: prev[group].third === teamId ? null : prev[group].third,
      },
    }));
  }

  function setSecond(group, teamId) {
    setPicks((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        second: teamId,
        first: prev[group].first === teamId ? null : prev[group].first,
        third: prev[group].third === teamId ? null : prev[group].third,
      },
    }));
  }

  function toggleThird(group, teamId) {
    setPicks((prev) => {
      const current = prev[group].third;
      if (current === teamId) {
        return { ...prev, [group]: { ...prev[group], third: null } };
      }
      if (thirdCount >= 8) return prev; // cap reached, ignore
      return { ...prev, [group]: { ...prev[group], third: teamId } };
    });
  }

  // Build the lookup used by resolveThirdSimSide: letter -> {first,second,third} names
  const picksByGroupNames = useMemo(() => {
    if (!picks || !groupTeams) return new Map();
    const map = new Map();
    GROUPS.forEach((g) => {
      const teams = groupTeams.get(g) || [];
      const byId = new Map(teams.map((t) => [t.id, t.name]));
      map.set(g, {
        first: byId.get(picks[g]?.first) || null,
        second: byId.get(picks[g]?.second) || null,
        third: byId.get(picks[g]?.third) || null,
      });
    });
    return map;
  }, [picks, groupTeams]);

  const thirdAssignment = useMemo(() => {
    if (thirdCount !== 8) return null;
    const advancing = GROUPS.filter((g) => picks[g]?.third).sort().join("");
    return thirdPlaceTable[advancing] || null;
  }, [picks, thirdCount]);

  const r32Resolved = useMemo(() => {
    return R32_TEMPLATE.map((match) => {
      const home =
        resolveSimLabel(match.home, picksByGroupNames) ||
        resolveThirdSimSide(match.home, match.away, picksByGroupNames, thirdAssignment);
      const away =
        resolveSimLabel(match.away, picksByGroupNames) ||
        resolveThirdSimSide(match.away, match.home, picksByGroupNames, thirdAssignment);
      const flagFor = (name) => {
        for (const g of GROUPS) {
          const found = (groupTeams?.get(g) || []).find((t) => t.name === name);
          if (found) return found.flag;
        }
        return null;
      };
      return {
        id: match.id,
        home: home || match.home,
        away: away || match.away,
        homeFlag: home ? flagFor(home) : null,
        awayFlag: away ? flagFor(away) : null,
        homeUnresolved: !home,
        awayUnresolved: !away,
        winner: winners[match.id] || null,
      };
    });
  }, [picksByGroupNames, thirdAssignment, groupTeams, winners]);

  // Each later round is built from the previous round's chosen winners —
  // clicking a winner checkbox advances that team into the next round's
  // matching slot, cascading all the way to the Final.
  const allRounds = useMemo(() => {
    const rounds = [{ label: "Ronda de 32", matches: r32Resolved }];
    let prevMatches = r32Resolved;
    LATER_ROUNDS.forEach((round) => {
      const matches = [];
      for (let i = 0; i < round.count; i++) {
        const feederA = prevMatches[2 * i];
        const feederB = prevMatches[2 * i + 1];
        const homeName = feederA && feederA.winner ? feederA[feederA.winner] : null;
        const awayName = feederB && feederB.winner ? feederB[feederB.winner] : null;
        const id = `${round.label}-${i}`;
        matches.push({
          id,
          home: homeName,
          away: awayName,
          homeFlag: homeName === feederA?.home ? feederA?.homeFlag : feederA?.awayFlag,
          awayFlag: awayName === feederB?.home ? feederB?.homeFlag : feederB?.awayFlag,
          homeUnresolved: !homeName,
          awayUnresolved: !awayName,
          winner: winners[id] || null,
        });
      }
      rounds.push({ label: round.label, matches });
      prevMatches = matches;
    });
    return rounds;
  }, [r32Resolved, winners]);

  if (loadError) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>No se pudo conectar con el servicio de datos. Recarga la página para reintentar.</div>
      </div>
    );
  }

  if (!groupTeams || !picks) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>Cargando equipos… puede tardar hasta un minuto.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.eyebrow}>FIFA · CANADÁ · MÉXICO · ESTADOS UNIDOS</span>
        <h1 style={styles.title}>Simulador de Bracket</h1>
        <p style={styles.subtitle}>
          Elige el 1° y 2° lugar de cada grupo, y marca hasta 8 equipos como "mejor tercero". El bracket de abajo se
          actualiza al instante con cada cambio. Empieza en blanco — tú decides cada posición.
        </p>
        <div style={styles.thirdCounter}>
          Mejores terceros elegidos: <strong>{thirdCount} / 8</strong>
        </div>
      </div>

      <div style={styles.groupsGrid}>
        {GROUPS.map((g) => {
          const teams = groupTeams.get(g) || [];
          const p = picks[g] || {};
          return (
            <div key={g} style={styles.groupCard}>
              <div style={styles.groupHeader}>Grupo {g}</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.thTeam}>Equipo</th>
                    <th style={styles.th}>1°</th>
                    <th style={styles.th}>2°</th>
                    <th style={styles.th}>Mejor 3°</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => {
                    const isFirst = p.first === t.id;
                    const isSecond = p.second === t.id;
                    const isThird = p.third === t.id;
                    const thirdDisabled = !isThird && thirdCount >= 8;
                    const eligibleForThird = !isFirst && !isSecond;
                    return (
                      <tr key={t.id}>
                        <td style={styles.tdTeam}>
                          <span style={styles.tdTeamInner}>
                            <TeamFlag flag={t.flag} />
                            <span>{t.name}</span>
                          </span>
                        </td>
                        <td style={styles.td}>
                          <input type="checkbox" checked={isFirst} onChange={() => setFirst(g, t.id)} style={styles.checkbox} />
                        </td>
                        <td style={styles.td}>
                          <input type="checkbox" checked={isSecond} onChange={() => setSecond(g, t.id)} style={styles.checkbox} />
                        </td>
                        <td style={styles.td}>
                          {eligibleForThird && (
                            <input
                              type="checkbox"
                              checked={isThird}
                              disabled={thirdDisabled}
                              onChange={() => toggleThird(g, t.id)}
                              style={styles.checkbox}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div style={styles.bracketHeader}>
        <h2 style={styles.bracketTitle}>Bracket resultante</h2>
        <p style={styles.bracketSubtitle}>Marca la casilla junto al equipo que gana cada partido para que avance a la siguiente ronda.</p>
      </div>

      <BracketView rounds={allRounds} onPickWinner={pickWinner} />

      <div style={styles.footnote}>
        Resolución de "mejor tercero" usando la tabla oficial de la FIFA (Anexo C, 495 combinaciones). Roster de equipos
        y posición de partida tomados de worldcup26.ir — todo lo demás es una simulación local, no se guarda ni se envía a ningún lado.
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: FONT_BODY,
    background: COLORS.bg,
    color: COLORS.text,
    minHeight: "100%",
    padding: "0 0 40px 0",
    boxSizing: "border-box",
  },
  header: {
    padding: "28px 20px 18px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: `linear-gradient(180deg, ${COLORS.bgCardAlt} 0%, ${COLORS.bg} 100%)`,
  },
  eyebrow: { fontSize: 11, letterSpacing: "0.14em", color: COLORS.accentWarm, fontWeight: 700 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, margin: "4px 0 6px", fontWeight: 700 },
  subtitle: { margin: "0 0 10px", color: COLORS.textMuted, fontSize: 13, maxWidth: 720, lineHeight: 1.5 },
  thirdCounter: { fontSize: 13, color: COLORS.accentWarm },

  empty: { color: COLORS.textMuted, padding: "60px 20px", textAlign: "center" },

  groupsGrid: {
    padding: "20px 20px 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  groupCard: { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" },
  groupHeader: {
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.accentWarm,
    padding: "10px 14px",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { textAlign: "center", color: COLORS.textMuted, fontWeight: 600, padding: "6px 4px", fontSize: 10.5 },
  thTeam: { textAlign: "left", color: COLORS.textMuted, fontWeight: 600, padding: "6px 8px 6px 14px", fontSize: 10.5 },
  td: { textAlign: "center", padding: "6px 4px" },
  tdTeam: { padding: "6px 8px 6px 14px", fontWeight: 600, whiteSpace: "nowrap" },
  tdTeamInner: { display: "flex", alignItems: "center", gap: 8 },
  flag: { width: 18, height: 13, objectFit: "cover", borderRadius: 2, flexShrink: 0 },
  checkbox: { width: 16, height: 16, accentColor: COLORS.accent, cursor: "pointer" },

  bracketHeader: { padding: "32px 20px 0" },
  bracketTitle: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: "0 0 4px" },
  bracketSubtitle: { margin: 0, color: COLORS.textMuted, fontSize: 12.5 },

  footnote: { padding: "20px 20px 0", fontSize: 11, color: COLORS.textMuted, lineHeight: 1.6 },
};

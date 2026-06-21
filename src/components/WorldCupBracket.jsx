import React, { useState, useEffect } from "react";
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
const REFRESH_MS = 5 * 60 * 1000;

const ROUNDS = [
  { type: "r32", label: "Ronda de 32" },
  { type: "r16", label: "Ronda de 16" },
  { type: "qf", label: "Cuartos de Final" },
  { type: "sf", label: "Semifinales" },
  { type: "final", label: "Final" },
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

// Sort a group's standings the same way GroupStandings.jsx does:
// points, then goal difference, then goals for.
function sortStandings(rows) {
  return [...rows].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

function buildGroupStandings(groups, teamsById) {
  const standingsByGroup = new Map();
  groups.forEach((g) => {
    const rows = (g.teams || []).map((row) => ({
      id: row.team_id,
      name: teamsById.get(row.team_id)?.name_en || "TBD",
      pts: Number(row.pts) || 0,
      gd: Number(row.gd) || 0,
      gf: Number(row.gf) || 0,
    }));
    standingsByGroup.set(g.name, sortStandings(rows));
  });
  return standingsByGroup;
}

function winnerOf(match) {
  if (!match || match.homeScore == null || match.awayScore == null) return null;
  if (match.homeScore > match.awayScore) return match.home;
  if (match.awayScore > match.homeScore) return match.away;
  return null; // draw with no penalty info available — leave unresolved
}

function loserOf(match) {
  if (!match || match.homeScore == null || match.awayScore == null) return null;
  if (match.homeScore > match.awayScore) return match.away;
  if (match.awayScore > match.homeScore) return match.home;
  return null;
}

// The 8 Round-of-32 slots that face a third-placed team instead of a
// runner-up, per FIFA's official 48-team format (verified against the
// 2026 knockout-stage match list: matches 74/77/79/80/81/82/85/87 pair
// the winners of groups A, B, D, E, G, I, K, L with a third-place team).
const FIXED_THIRD_SLOTS = ["A", "B", "D", "E", "G", "I", "K", "L"];

// Ranks all 12 third-placed teams by FIFA's published criteria — points,
// goal difference, goals scored — to find the 8 that advance. (FIFA's full
// regulations also break remaining ties on disciplinary/fair-play points
// and then the FIFA World Ranking; neither is available from this API, so
// fully tied teams keep their group-letter order here instead.)
function rankBestThirds(standingsByGroup) {
  const thirds = [];
  standingsByGroup.forEach((rows, group) => {
    const third = rows[2];
    if (third) thirds.push({ group, pts: third.pts, gd: third.gd, gf: third.gf });
  });
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  return thirds;
}

// Given which 8 groups' thirds advance, looks up FIFA's Annex C table
// (495 possible combinations) for which specific third fills which of the
// 8 fixed slots above.
function lookupThirdPlaceAssignment(standingsByGroup) {
  const advancing = rankBestThirds(standingsByGroup).slice(0, 8).map((t) => t.group);
  if (advancing.length < 8) return null;
  const key = [...advancing].sort().join("");
  return thirdPlaceTable[key] || null;
}

// Resolves placeholder labels like "Winner Match 74", "Runner-up Group A"
// into an actual team name, using already-completed matches and group
// standings — so the bracket advances on its own as real results come in,
// instead of waiting for the API to rewrite each downstream match.
function resolveLabel(label, matchesById, standingsByGroup, thirdPlaceAssignment) {
  if (!label) return "TBD";

  let m = label.match(/^Winner Match (\d+)$/);
  if (m) return winnerOf(matchesById.get(m[1])) || label;

  m = label.match(/^Loser Match (\d+)$/);
  if (m) return loserOf(matchesById.get(m[1])) || label;

  m = label.match(/^Winner Group ([A-L])$/);
  if (m) return standingsByGroup.get(m[1])?.[0]?.name || label;

  m = label.match(/^Runner-up Group ([A-L])$/);
  if (m) return standingsByGroup.get(m[1])?.[1]?.name || label;

  return label;
}

// "3rd Group A/B/C/D/F" only resolves once we know which fixed slot this
// particular match is (read off its sibling side's "Winner Group X" label,
// X being one of FIXED_THIRD_SLOTS) and FIFA's table for the current best-8.
function resolveThirdPlaceSide(label, siblingLabel, standingsByGroup, thirdPlaceAssignment) {
  if (!label?.startsWith("3rd Group")) return null;
  const siblingGroup = siblingLabel?.match(/^Winner Group ([A-L])$/)?.[1];
  if (!siblingGroup || !FIXED_THIRD_SLOTS.includes(siblingGroup)) return label;
  const assignedGroup = thirdPlaceAssignment?.[`1${siblingGroup}`];
  if (!assignedGroup) return label;
  return standingsByGroup.get(assignedGroup)?.[2]?.name || label;
}

async function fetchBracketData() {
  const [gamesList, groupsList, teamsList] = await Promise.all([
    fetchWithRetry(`${LIVE_API_BASE}/get/games`, "games"),
    fetchWithRetry(`${LIVE_API_BASE}/get/groups`, "groups"),
    fetchWithRetry(`${LIVE_API_BASE}/get/teams`, "teams"),
  ]);

  const teamsById = new Map();
  const flagByName = new Map();
  teamsList.forEach((t) => {
    teamsById.set(t.id, t);
    flagByName.set(t.name_en, t.flag);
  });

  const standingsByGroup = buildGroupStandings(groupsList, teamsById);

  const matchesById = new Map();
  gamesList.forEach((g) => {
    matchesById.set(g.id, {
      id: g.id,
      type: g.type,
      home: g.home_team_id !== "0" ? g.home_team_name_en : null,
      away: g.away_team_id !== "0" ? g.away_team_name_en : null,
      homeLabel: g.home_team_label,
      awayLabel: g.away_team_label,
      homeScore: g.home_score != null ? Number(g.home_score) : null,
      awayScore: g.away_score != null ? Number(g.away_score) : null,
      status: (g.time_elapsed || "").toLowerCase(),
      date: g.local_date,
    });
  });

  const thirdPlaceAssignment = lookupThirdPlaceAssignment(standingsByGroup);

  // Resolve every knockout match's team names (real, or derived from an
  // already-decided earlier match / group standing, or the raw label).
  const byRound = new Map(ROUNDS.map((r) => [r.type, []]));
  let thirdPlace = null;
  matchesById.forEach((m) => {
    if (m.type === "group") return;
    const home =
      m.home ||
      resolveThirdPlaceSide(m.homeLabel, m.awayLabel, standingsByGroup, thirdPlaceAssignment) ||
      resolveLabel(m.homeLabel, matchesById, standingsByGroup);
    const away =
      m.away ||
      resolveThirdPlaceSide(m.awayLabel, m.homeLabel, standingsByGroup, thirdPlaceAssignment) ||
      resolveLabel(m.awayLabel, matchesById, standingsByGroup);
    const resolved = {
      ...m,
      home,
      away,
      homeFlag: flagByName.get(home) || null,
      awayFlag: flagByName.get(away) || null,
    };
    if (m.type === "third") {
      thirdPlace = resolved;
    } else if (byRound.has(m.type)) {
      byRound.get(m.type).push(resolved);
    }
  });
  byRound.forEach((list) => list.sort((a, b) => Number(a.id) - Number(b.id)));

  return { byRound, thirdPlace };
}

export default function WorldCupBracket() {
  const [data, setData] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const result = await fetchBracketData();
        if (!cancelled) {
          setData(result);
          setSyncedAt(new Date());
          setError(false);
        }
      } catch (err) {
        console.warn("Bracket sync failed:", err);
        if (!cancelled) setError(true);
      }
    }
    sync();
    const interval = setInterval(sync, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.eyebrow}>FIFA · CANADÁ · MÉXICO · ESTADOS UNIDOS</span>
        <h1 style={styles.title}>Bracket — Eliminación Directa</h1>
        <p style={styles.subtitle}>
          Se llena automáticamente conforme avanzan los resultados. Del 28 de junio (Ronda de 32) al 19 de julio (Final).
        </p>
      </div>

      {!data && !error && (
        <div style={styles.empty}>Cargando bracket en vivo… puede tardar hasta un minuto.</div>
      )}
      {!data && error && (
        <div style={styles.empty}>No se pudo conectar con el servicio de resultados en vivo. Intentando de nuevo automáticamente…</div>
      )}

      {data && (
        <BracketView
          rounds={ROUNDS.map(({ type, label }) => ({ label, matches: data.byRound.get(type) || [] }))}
          extraColumn={data.thirdPlace ? { label: "Tercer Lugar", match: data.thirdPlace } : null}
        />
      )}

      <div style={styles.footnote}>
        {syncedAt ? (
          <>Bracket en vivo, sincronizado automáticamente — última actualización {syncedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.</>
        ) : (
          <>Conectando con el servicio de resultados en vivo…</>
        )}{" "}
        Equipos no decididos se calculan en el navegador a partir de resultados reales: ganador/perdedor de partido, 1°/2° de grupo, y los cupos de "mejor tercero" usando la tabla oficial de la FIFA (Anexo C, 495 combinaciones) que asigna cada tercer lugar a su cruce exacto. El desempate de terceros usa puntos, diferencia de gol y goles a favor — los criterios de juego limpio y ranking FIFA (para empates totales) no están disponibles en esta fuente.
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
    padding: "0 0 32px 0",
    boxSizing: "border-box",
  },
  header: {
    padding: "28px 20px 16px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: `linear-gradient(180deg, ${COLORS.bgCardAlt} 0%, ${COLORS.bg} 100%)`,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.14em",
    color: COLORS.accentWarm,
    fontWeight: 700,
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28,
    margin: "4px 0 6px",
    fontWeight: 700,
  },
  subtitle: { margin: 0, color: COLORS.textMuted, fontSize: 13, maxWidth: 640 },

  empty: { color: COLORS.textMuted, padding: "60px 20px", textAlign: "center" },

  footnote: {
    padding: "16px 20px 0",
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 1.6,
  },
};

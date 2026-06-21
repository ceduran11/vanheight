import React, { useState, useEffect } from "react";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

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
};

const LIVE_API_BASE = "https://worldcup26.ir";
const LIVE_REFRESH_MS = 5 * 60 * 1000;

function fetchWithTimeout(url, ms = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then((r) => r.json())
    .finally(() => clearTimeout(timer));
}

// teams is "enrichment" data (names, flags) — retry it a few times on its
// own so one unlucky parallel request doesn't blank out names for an
// entire cycle even though groups succeeded.
async function fetchEnrichmentWithRetry(url, key, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const data = await fetchWithTimeout(url);
      if (Array.isArray(data?.[key])) return data[key];
    } catch {
      // fall through to retry
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 1000));
  }
  return [];
}

async function fetchGroupsOnce() {
  const [groupsRes, teamsList] = await Promise.allSettled([
    fetchWithTimeout(`${LIVE_API_BASE}/get/groups`),
    fetchEnrichmentWithRetry(`${LIVE_API_BASE}/get/teams`, "teams"),
  ]);

  if (groupsRes.status !== "fulfilled" || !Array.isArray(groupsRes.value?.groups)) {
    throw new Error("live groups fetch failed");
  }

  const teamsById = new Map();
  if (teamsList.status === "fulfilled") {
    teamsList.value.forEach((t) => teamsById.set(t.id, t));
  }

  const byName = new Map();
  groupsRes.value.groups.forEach((g) => {
    const rows = (g.teams || [])
      .map((row) => {
        const team = teamsById.get(row.team_id);
        return {
          id: row.team_id,
          name: team?.name_en || "TBD",
          flag: team?.flag || null,
          mp: Number(row.mp) || 0,
          w: Number(row.w) || 0,
          d: Number(row.d) || 0,
          l: Number(row.l) || 0,
          gf: Number(row.gf) || 0,
          ga: Number(row.ga) || 0,
          gd: Number(row.gd) || 0,
          pts: Number(row.pts) || 0,
        };
      })
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    byName.set(g.name, rows);
  });

  return byName;
}

async function fetchGroups(onAttempt, retries = 5, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    onAttempt?.(attempt, retries);
    try {
      return await fetchGroupsOnce();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export default function GroupStandings() {
  const [groups, setGroups] = useState(new Map());
  const [liveSyncedAt, setLiveSyncedAt] = useState(null);
  const [liveError, setLiveError] = useState(false);
  const [syncAttempt, setSyncAttempt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const data = await fetchGroups((attempt, total) => {
          if (!cancelled) setSyncAttempt({ attempt, total });
        });
        if (!cancelled) {
          setGroups(data);
          setLiveSyncedAt(new Date());
          setLiveError(false);
          setSyncAttempt(null);
        }
      } catch (err) {
        console.warn("Group standings live sync failed:", err);
        if (!cancelled) {
          setLiveError(true);
          setSyncAttempt(null);
        }
      }
    }

    sync();
    const interval = setInterval(sync, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hasData = groups.size > 0;

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
      <div style={styles.header}>
        <span style={styles.eyebrow}>FIFA · CANADÁ · MÉXICO · ESTADOS UNIDOS</span>
        <h1 style={styles.title}>Grupos</h1>
        <p style={styles.subtitle}>Tabla de posiciones de la fase de grupos</p>
      </div>

      {!hasData && !liveError && (
        <div style={styles.empty}>
          Cargando posiciones en vivo…
          {syncAttempt && syncAttempt.total > 1 && (
            <> (intento {syncAttempt.attempt} de {syncAttempt.total})</>
          )}
        </div>
      )}
      {!hasData && liveError && (
        <div style={styles.empty}>
          No se pudo conectar con el servicio de resultados en vivo. Intentando de nuevo automáticamente…
        </div>
      )}

      {hasData && (
        <div style={styles.grid}>
          {GROUPS.filter((g) => groups.has(g)).map((g) => (
            <div key={g} style={styles.groupCard}>
              <div style={styles.groupHeader}>Grupo {g}</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.thTeam}>Equipo</th>
                    <th style={styles.th}>PJ</th>
                    <th style={styles.th}>G</th>
                    <th style={styles.th}>E</th>
                    <th style={styles.th}>P</th>
                    <th style={styles.th}>DG</th>
                    <th style={styles.th}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.get(g).map((row, i) => (
                    <tr key={row.id} style={i < 2 ? styles.qualifyRow : undefined}>
                      <td style={styles.tdTeam}>
                        <div style={styles.tdTeamInner}>
                          {row.flag && <img src={row.flag} alt="" style={styles.flag} />}
                          <span>{row.name}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{row.mp}</td>
                      <td style={styles.td}>{row.w}</td>
                      <td style={styles.td}>{row.d}</td>
                      <td style={styles.td}>{row.l}</td>
                      <td style={styles.td}>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td style={styles.tdPts}>{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div style={styles.footnote}>
        {liveSyncedAt ? (
          <>Posiciones en vivo, sincronizadas automáticamente — última actualización {liveSyncedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}. Se actualiza cada 5 minutos.</>
        ) : (
          <>Conectando con el servicio de resultados en vivo…</>
        )}{" "}
        Los dos primeros lugares de cada grupo (resaltados) avanzan a la siguiente ronda.
      </div>
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
    fontFamily: FONT_BODY,
    fontSize: 11,
    letterSpacing: "0.14em",
    color: COLORS.accentWarm,
    fontWeight: 700,
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 34,
    margin: "4px 0 2px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  subtitle: { margin: 0, color: COLORS.textMuted, fontSize: 14 },

  empty: { color: COLORS.textMuted, padding: "40px 20px", textAlign: "center" },

  inner: { maxWidth: 1000, margin: "0 auto" },

  grid: {
    padding: "20px 20px 0",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  groupCard: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  groupHeader: {
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.accentWarm,
    padding: "10px 14px",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontWeight: 600,
    padding: "6px 4px",
    fontSize: 11,
  },
  thTeam: {
    textAlign: "left",
    color: COLORS.textMuted,
    fontWeight: 600,
    padding: "6px 8px 6px 14px",
    fontSize: 11,
  },
  td: { textAlign: "center", padding: "6px 4px", color: COLORS.text },
  tdPts: { textAlign: "center", padding: "6px 4px", color: COLORS.accentWarm, fontWeight: 700 },
  tdTeam: {
    padding: "6px 8px 6px 14px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  tdTeamInner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  flag: { width: 18, height: 13, objectFit: "cover", borderRadius: 2, flexShrink: 0 },
  qualifyRow: { background: "rgba(0,168,89,0.08)" },

  footnote: {
    padding: "20px 20px 0",
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 1.5,
  },
};

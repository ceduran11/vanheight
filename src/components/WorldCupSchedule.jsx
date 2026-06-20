import React, { useState, useMemo, useEffect } from "react";

// ---------- Data ----------
// status: "final" | "live" | "scheduled"
const RAW_MATCHES = [
  // June 11
  { date: "2026-06-11", group: "A", home: "México", away: "Sudáfrica", venue: "Ciudad de México", homeScore: 2, awayScore: 0, status: "final" },
  { date: "2026-06-11", group: "A", home: "Corea del Sur", away: "Chequia", venue: "Zapopan", homeScore: 2, awayScore: 1, status: "final" },
  // June 12
  { date: "2026-06-12", group: "B", home: "Canadá", away: "Bosnia y Herzegovina", venue: "Toronto", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-12", group: "D", home: "Paraguay", away: "Estados Unidos", venue: "Inglewood", homeScore: 1, awayScore: 4, status: "final" },
  // June 13
  { date: "2026-06-13", group: "B", home: "Qatar", away: "Suiza", venue: "Santa Clara", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-13", group: "C", home: "Brasil", away: "Marruecos", venue: "East Rutherford", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-13", group: "C", home: "Haití", away: "Escocia", venue: "Foxborough", homeScore: 0, awayScore: 1, status: "final" },
  { date: "2026-06-13", group: "D", home: "Australia", away: "Türkiye", venue: "Vancouver", homeScore: 2, awayScore: 0, status: "final" },
  // June 14
  { date: "2026-06-14", group: "E", home: "Alemania", away: "Curazao", venue: "Houston", homeScore: 7, awayScore: 1, status: "final" },
  { date: "2026-06-14", group: "F", home: "Países Bajos", away: "Japón", venue: "Arlington", homeScore: 2, awayScore: 2, status: "final" },
  { date: "2026-06-14", group: "E", home: "Costa de Marfil", away: "Ecuador", venue: "Filadelfia", homeScore: 1, awayScore: 0, status: "final" },
  { date: "2026-06-14", group: "F", home: "Suecia", away: "Túnez", venue: "Guadalupe", homeScore: 5, awayScore: 1, status: "final" },
  // June 15
  { date: "2026-06-15", group: "H", home: "España", away: "Cabo Verde", venue: "Atlanta", homeScore: 0, awayScore: 0, status: "final" },
  { date: "2026-06-15", group: "G", home: "Bélgica", away: "Egipto", venue: "Seattle", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-15", group: "H", home: "Uruguay", away: "Arabia Saudita", venue: "Miami Gardens", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-15", group: "G", home: "Irán", away: "Nueva Zelanda", venue: "Inglewood", homeScore: 2, awayScore: 2, status: "final" },
  // June 16
  { date: "2026-06-16", group: "I", home: "Francia", away: "Senegal", venue: "East Rutherford", homeScore: 2, awayScore: 1, status: "final" },
  { date: "2026-06-16", group: "I", home: "Irak", away: "Noruega", venue: "Foxborough", homeScore: 1, awayScore: 0, status: "final" },
  { date: "2026-06-16", group: "J", home: "Argentina", away: "Argelia", venue: "Kansas City", homeScore: 3, awayScore: 1, status: "final" },
  { date: "2026-06-16", group: "J", home: "Austria", away: "Jordania", venue: "Santa Clara", homeScore: 0, awayScore: 0, status: "final" },
  // June 17
  { date: "2026-06-17", group: "K", home: "Portugal", away: "RD Congo", venue: "Houston", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-17", group: "L", home: "Inglaterra", away: "Croacia", venue: "Arlington", homeScore: 2, awayScore: 0, status: "final" },
  { date: "2026-06-17", group: "L", home: "Ghana", away: "Panamá", venue: "Toronto", homeScore: 1, awayScore: 2, status: "final" },
  { date: "2026-06-17", group: "K", home: "Uzbekistán", away: "Colombia", venue: "Ciudad de México", homeScore: 0, awayScore: 1, status: "final" },
  // June 18
  { date: "2026-06-18", group: "A", home: "Chequia", away: "Sudáfrica", venue: "Atlanta", homeScore: 2, awayScore: 2, status: "final" },
  { date: "2026-06-18", group: "B", home: "Suiza", away: "Bosnia y Herzegovina", venue: "Inglewood", homeScore: 0, awayScore: 1, status: "final" },
  { date: "2026-06-18", group: "B", home: "Canadá", away: "Qatar", venue: "Vancouver", homeScore: 3, awayScore: 0, status: "final" },
  { date: "2026-06-18", group: "A", home: "México", away: "Corea del Sur", venue: "Zapopan", homeScore: 1, awayScore: 1, status: "final" },
  // June 19
  { date: "2026-06-19", group: "D", home: "Estados Unidos", away: "Australia", venue: "Seattle", homeScore: 1, awayScore: 0, status: "final" },
  { date: "2026-06-19", group: "C", home: "Escocia", away: "Marruecos", venue: "Foxborough", homeScore: 2, awayScore: 1, status: "final" },
  { date: "2026-06-19", group: "C", home: "Brasil", away: "Haití", venue: "Filadelfia", homeScore: 2, awayScore: 2, status: "final" },
  { date: "2026-06-19", group: "D", home: "Türkiye", away: "Paraguay", venue: "Santa Clara", homeScore: 0, awayScore: 2, status: "final" },
  // June 20
  { date: "2026-06-20", group: "F", home: "Países Bajos", away: "Suecia", venue: "Houston", homeScore: 1, awayScore: 1, status: "final" },
  { date: "2026-06-20", group: "E", home: "Alemania", away: "Costa de Marfil", venue: "Toronto", homeScore: 3, awayScore: 2, status: "final" },
  { date: "2026-06-20", group: "E", home: "Ecuador", away: "Curazao", venue: "Kansas City", homeScore: 0, awayScore: 0, status: "final" },
  { date: "2026-06-20", group: "F", home: "Túnez", away: "Japón", venue: "Guadalupe", homeScore: 2, awayScore: 0, status: "final" },
  // June 21
  { date: "2026-06-21", group: "H", home: "España", away: "Arabia Saudita", venue: "Atlanta", time: "12:00 PM ET", status: "scheduled" },
  { date: "2026-06-21", group: "G", home: "Bélgica", away: "Irán", venue: "Inglewood", time: "3:00 PM ET", status: "scheduled" },
  { date: "2026-06-21", group: "H", home: "Uruguay", away: "Cabo Verde", venue: "Miami Gardens", time: "6:00 PM ET", status: "scheduled" },
  { date: "2026-06-21", group: "G", home: "Nueva Zelanda", away: "Egipto", venue: "Vancouver", time: "9:00 PM ET", status: "scheduled" },
  // June 22
  { date: "2026-06-22", group: "J", home: "Argentina", away: "Austria", venue: "Arlington", time: "1:00 PM ET", status: "scheduled" },
  { date: "2026-06-22", group: "I", home: "Francia", away: "Irak", venue: "Filadelfia", time: "5:00 PM ET", status: "scheduled" },
  { date: "2026-06-22", group: "I", home: "Noruega", away: "Senegal", venue: "East Rutherford", time: "8:00 PM ET", status: "scheduled" },
  { date: "2026-06-22", group: "J", home: "Jordania", away: "Argelia", venue: "Santa Clara", time: "11:00 PM ET", status: "scheduled" },
  // June 23
  { date: "2026-06-23", group: "K", home: "Portugal", away: "Uzbekistán", venue: "Houston", time: "1:00 PM ET", status: "scheduled" },
  { date: "2026-06-23", group: "L", home: "Inglaterra", away: "Ghana", venue: "Foxborough", time: "4:00 PM ET", status: "scheduled" },
  { date: "2026-06-23", group: "L", home: "Panamá", away: "Croacia", venue: "Toronto", time: "7:00 PM ET", status: "scheduled" },
  { date: "2026-06-23", group: "K", home: "Colombia", away: "RD Congo", venue: "Zapopan", time: "10:00 PM ET", status: "scheduled" },
  // June 24
  { date: "2026-06-24", group: "B", home: "Suiza", away: "Canadá", venue: "Vancouver", time: "3:00 PM ET", status: "scheduled" },
  { date: "2026-06-24", group: "B", home: "Bosnia y Herzegovina", away: "Qatar", venue: "Seattle", time: "3:00 PM ET", status: "scheduled" },
  { date: "2026-06-24", group: "C", home: "Escocia", away: "Brasil", venue: "Miami Gardens", time: "6:00 PM ET", status: "scheduled" },
  { date: "2026-06-24", group: "C", home: "Marruecos", away: "Haití", venue: "Atlanta", time: "6:00 PM ET", status: "scheduled" },
  { date: "2026-06-24", group: "A", home: "Chequia", away: "México", venue: "Ciudad de México", time: "9:00 PM ET", status: "scheduled" },
  { date: "2026-06-24", group: "A", home: "Sudáfrica", away: "Corea del Sur", venue: "Guadalupe", time: "9:00 PM ET", status: "scheduled" },
  // June 25
  { date: "2026-06-25", group: "E", home: "Ecuador", away: "Alemania", venue: "East Rutherford", time: "4:00 PM ET", status: "scheduled" },
  { date: "2026-06-25", group: "E", home: "Curazao", away: "Costa de Marfil", venue: "Filadelfia", time: "4:00 PM ET", status: "scheduled" },
  { date: "2026-06-25", group: "F", home: "Japón", away: "Suecia", venue: "Arlington", time: "7:00 PM ET", status: "scheduled" },
  { date: "2026-06-25", group: "F", home: "Túnez", away: "Países Bajos", venue: "Kansas City", time: "7:00 PM ET", status: "scheduled" },
  { date: "2026-06-25", group: "D", home: "Türkiye", away: "Estados Unidos", venue: "Inglewood", time: "10:00 PM ET", status: "scheduled" },
  { date: "2026-06-25", group: "D", home: "Paraguay", away: "Australia", venue: "Santa Clara", time: "10:00 PM ET", status: "scheduled" },
  // June 26
  { date: "2026-06-26", group: "I", home: "Noruega", away: "Francia", venue: "Foxborough", time: "3:00 PM ET", status: "scheduled" },
  { date: "2026-06-26", group: "I", home: "Senegal", away: "Irak", venue: "Toronto", time: "3:00 PM ET", status: "scheduled" },
  { date: "2026-06-26", group: "H", home: "Cabo Verde", away: "Arabia Saudita", venue: "Houston", time: "8:00 PM ET", status: "scheduled" },
  { date: "2026-06-26", group: "H", home: "Uruguay", away: "España", venue: "Zapopan", time: "8:00 PM ET", status: "scheduled" },
  { date: "2026-06-26", group: "G", home: "Egipto", away: "Irán", venue: "Seattle", time: "11:00 PM ET", status: "scheduled" },
  { date: "2026-06-26", group: "G", home: "Nueva Zelanda", away: "Bélgica", venue: "Vancouver", time: "11:00 PM ET", status: "scheduled" },
  // June 27
  { date: "2026-06-27", group: "L", home: "Panamá", away: "Inglaterra", venue: "East Rutherford", time: "5:00 PM ET", status: "scheduled" },
  { date: "2026-06-27", group: "L", home: "Croacia", away: "Ghana", venue: "Filadelfia", time: "5:00 PM ET", status: "scheduled" },
  { date: "2026-06-27", group: "K", home: "Colombia", away: "Portugal", venue: "Miami Gardens", time: "7:30 PM ET", status: "scheduled" },
  { date: "2026-06-27", group: "K", home: "RD Congo", away: "Uzbekistán", venue: "Atlanta", time: "7:30 PM ET", status: "scheduled" },
  { date: "2026-06-27", group: "J", home: "Argelia", away: "Austria", venue: "Kansas City", time: "10:00 PM ET", status: "scheduled" },
  { date: "2026-06-27", group: "J", home: "Jordania", away: "Argentina", venue: "Arlington", time: "10:00 PM ET", status: "scheduled" },
];

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const STATUS_LABEL = {
  final: "Final",
  live: "En vivo",
  scheduled: "Programado",
};

function formatDateLabel(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

// ---------- Live data (worldcup26.ir) ----------
const LIVE_API_BASE = "https://worldcup26.ir";
const LIVE_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

function apiTimeTo12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period} ET`;
}

function apiStatusToLocal(timeElapsed) {
  const v = (timeElapsed || "").toLowerCase();
  if (v === "live") return "live";
  if (v === "notstarted") return "scheduled";
  return "final";
}

function mapApiGames(games, stadiumsById) {
  return games.map((g) => {
    const [datePart, timePart] = (g.local_date || "").split(" ");
    const [mm, dd, yyyy] = (datePart || "").split("/");
    const isoDate = yyyy ? `${yyyy}-${mm}-${dd}` : "";
    const status = apiStatusToLocal(g.time_elapsed);
    const venue = stadiumsById.get(g.stadium_id)?.city_en || "";

    return {
      id: `api-${g.id}`,
      date: isoDate,
      time: timePart ? apiTimeTo12h(timePart) : undefined,
      group: g.group,
      home: g.home_team_name_en,
      away: g.away_team_name_en,
      venue,
      homeScore: status === "scheduled" ? undefined : Number(g.home_score),
      awayScore: status === "scheduled" ? undefined : Number(g.away_score),
      status,
    };
  });
}

async function fetchLiveMatches() {
  const [gamesRes, stadiumsRes] = await Promise.allSettled([
    fetch(`${LIVE_API_BASE}/get/games`).then((r) => r.json()),
    fetch(`${LIVE_API_BASE}/get/stadiums`).then((r) => r.json()),
  ]);

  if (gamesRes.status !== "fulfilled" || !Array.isArray(gamesRes.value?.games)) {
    throw new Error("live games fetch failed");
  }

  const stadiumsById = new Map();
  if (stadiumsRes.status === "fulfilled" && Array.isArray(stadiumsRes.value?.stadiums)) {
    stadiumsRes.value.stadiums.forEach((s) => stadiumsById.set(s.id, s));
  }

  return mapApiGames(gamesRes.value.games, stadiumsById);
}

export default function WorldCupSchedule() {
  const [matches, setMatches] = useState(
    RAW_MATCHES.map((m, i) => ({ ...m, id: `m${i}` }))
  );
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [liveSyncedAt, setLiveSyncedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const liveMatches = await fetchLiveMatches();
        if (!cancelled) {
          setMatches(liveMatches);
          setLiveSyncedAt(new Date());
        }
      } catch (err) {
        // Live API unavailable — keep showing whatever data is currently loaded.
        console.warn("World Cup live sync failed, keeping existing data:", err);
      }
    }

    sync();
    const interval = setInterval(sync, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (groupFilter !== "ALL" && m.group !== groupFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!m.home.toLowerCase().includes(q) && !m.away.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [matches, groupFilter, search]);

  const groupedByDate = useMemo(() => {
    const map = new Map();
    filtered.forEach((m) => {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date).push(m);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const totalFinal = matches.filter((m) => m.status === "final").length;
  const totalLive = matches.filter((m) => m.status === "live").length;

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.eyebrow}>FIFA · CANADÁ · MÉXICO · ESTADOS UNIDOS</span>
          <h1 style={styles.title}>Mundial 2026</h1>
          <p style={styles.subtitle}>Calendario y resultados de la fase de grupos</p>
        </div>
        <div style={styles.statsRow}>
          <div style={styles.statPill}>
            <span style={styles.statNum}>{totalFinal}</span>
            <span style={styles.statLabel}>jugados</span>
          </div>
          <div style={{ ...styles.statPill, ...(totalLive > 0 ? styles.statPillLive : {}) }}>
            <span style={styles.statNum}>{totalLive}</span>
            <span style={styles.statLabel}>en vivo</span>
          </div>
          <div style={styles.statPill}>
            <span style={styles.statNum}>{matches.length - totalFinal - totalLive}</span>
            <span style={styles.statLabel}>por jugar</span>
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Buscar selección…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
        <div style={styles.groupTabs}>
          <button
            onClick={() => setGroupFilter("ALL")}
            style={groupFilter === "ALL" ? styles.tabActive : styles.tab}
          >
            Todos
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              style={groupFilter === g ? styles.tabActive : styles.tab}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.list}>
        {groupedByDate.map(([date, dayMatches]) => (
          <div key={date} style={styles.dayBlock}>
            <div style={styles.dayLabel}>{formatDateLabel(date)}</div>
            {dayMatches.map((m) => (
              <div key={m.id} style={styles.matchRow}>
                <div style={styles.matchGroupBadge}>{m.group}</div>

                <div style={styles.teamsCol}>
                  <div style={styles.teamLine}>
                    <span style={styles.teamName}>{m.home}</span>
                  </div>
                  <div style={styles.teamLine}>
                    <span style={styles.teamName}>{m.away}</span>
                  </div>
                </div>

                <div style={styles.scoreCol}>
                  {m.status === "scheduled" ? (
                    <div style={styles.timeBox}>{m.time}</div>
                  ) : (
                    <div style={styles.scoreBox}>
                      <span>{m.homeScore}</span>
                      <span style={styles.scoreDash}>–</span>
                      <span>{m.awayScore}</span>
                    </div>
                  )}
                </div>

                <div style={styles.metaCol}>
                  <span
                    style={{
                      ...styles.statusTag,
                      ...(m.status === "live" ? styles.statusLive : {}),
                      ...(m.status === "final" ? styles.statusFinal : {}),
                    }}
                  >
                    {m.status === "live" && <span style={styles.liveDot} />}
                    {STATUS_LABEL[m.status]}
                  </span>
                  <span style={styles.venue}>{m.venue}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
        {groupedByDate.length === 0 && (
          <div style={styles.empty}>No hay partidos que coincidan con la búsqueda.</div>
        )}
      </div>

      <div style={styles.footnote}>
        {liveSyncedAt ? (
          <>Resultados en vivo, sincronizados automáticamente — última actualización {liveSyncedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}. Se actualiza cada 5 minutos.</>
        ) : (
          <>Cargando resultados en vivo… mostrando datos de ejemplo mientras tanto.</>
        )}
      </div>
      </div>
    </div>
  );
}

// ---------- Styles ----------
const FONT_DISPLAY = "'Georgia', 'Iowan Old Style', serif";
const FONT_BODY = "'Helvetica Neue', Arial, sans-serif";

const COLORS = {
  bg: "#0B1F3A",
  bgCard: "#11264A",
  bgCardAlt: "#0E2240",
  accent: "#00A859", // pitch green
  accentWarm: "#FFC72C", // gold accent (trophy)
  text: "#F4F6F8",
  textMuted: "#9FB3CC",
  border: "#1E3A5F",
  live: "#E0483E",
};

const styles = {
  page: {
    fontFamily: FONT_BODY,
    background: COLORS.bg,
    color: COLORS.text,
    minHeight: "100%",
    padding: "0 0 32px 0",
    boxSizing: "border-box",
  },
  inner: {
    maxWidth: 640,
    margin: "0 auto",
  },
  header: {
    padding: "28px 20px 16px",
    borderBottom: `1px solid ${COLORS.border}`,
    background: `linear-gradient(180deg, ${COLORS.bgCardAlt} 0%, ${COLORS.bg} 100%)`,
  },
  headerTop: { marginBottom: 14 },
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
  subtitle: {
    margin: 0,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  statsRow: { display: "flex", gap: 10 },
  statPill: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "6px 14px",
  },
  statPillLive: {
    borderColor: COLORS.live,
  },
  statNum: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700 },
  statLabel: { fontSize: 11, color: COLORS.textMuted },

  controls: {
    padding: "16px 20px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  search: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "10px 14px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none",
  },
  groupTabs: {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 4,
  },
  tab: {
    flex: "0 0 auto",
    background: "transparent",
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textMuted,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
  tabActive: {
    flex: "0 0 auto",
    background: COLORS.accent,
    border: `1px solid ${COLORS.accent}`,
    color: "#06210F",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  list: { padding: "8px 20px 0" },
  dayBlock: { marginBottom: 22 },
  dayLabel: {
    fontSize: 12,
    color: COLORS.accentWarm,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 8,
    marginTop: 8,
  },

  matchRow: {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto",
    gridTemplateAreas: `"badge teams score" "badge meta meta"`,
    columnGap: 10,
    rowGap: 8,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "12px 12px",
    marginBottom: 8,
    alignItems: "center",
  },
  matchGroupBadge: {
    gridArea: "badge",
    width: 24,
    height: 24,
    borderRadius: 6,
    background: COLORS.bgCardAlt,
    border: `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.textMuted,
  },
  teamsCol: { gridArea: "teams", display: "flex", flexDirection: "column", gap: 4 },
  teamLine: { display: "flex", alignItems: "center" },
  teamName: { fontSize: 14.5, fontWeight: 600 },

  scoreCol: { gridArea: "score", justifySelf: "end" },
  scoreBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: FONT_DISPLAY,
    fontSize: 20,
    fontWeight: 700,
    background: COLORS.bgCardAlt,
    borderRadius: 8,
    padding: "4px 10px",
  },
  scoreDash: { color: COLORS.textMuted, fontWeight: 400, fontSize: 14 },
  timeBox: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    whiteSpace: "nowrap",
  },
  metaCol: { gridArea: "meta", display: "flex", alignItems: "center", gap: 8 },
  statusTag: {
    fontSize: 11,
    color: COLORS.textMuted,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "2px 8px",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  statusFinal: { color: COLORS.accent, borderColor: COLORS.accent },
  statusLive: { color: COLORS.live, borderColor: COLORS.live },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: COLORS.live,
    display: "inline-block",
  },
  venue: { fontSize: 11.5, color: COLORS.textMuted },

  empty: { color: COLORS.textMuted, padding: "40px 0", textAlign: "center" },
  footnote: {
    padding: "16px 20px 0",
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 1.5,
  },
};

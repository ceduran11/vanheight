import React from "react";

const FONT_DISPLAY = "'Georgia', 'Iowan Old Style', serif";

const COLORS = {
  bgCard: "#11264A",
  accent: "#00A859",
  accentWarm: "#FFC72C",
  text: "#F4F6F8",
  textMuted: "#9FB3CC",
  border: "#1E3A5F",
  live: "#E0483E",
};

const SLOT_HEIGHT = 60;
const SLOT_GAP = 18;
const COLUMN_WIDTH = 220;
const COLUMN_GAP = 36;

// Computes the vertical center (px) of every match in every round, given
// only the first round's match count — round k+1's centers are just the
// midpoint of each pair of round k centers. This sidesteps flexbox's
// space-around/gap math (which gets unreliable once a `gap` is mixed in)
// in favor of plain arithmetic we fully control.
function computeCenters(counts) {
  const centers = [];
  centers[0] = counts[0].map((_, i) => i * (SLOT_HEIGHT + SLOT_GAP) + SLOT_HEIGHT / 2);
  for (let r = 1; r < counts.length; r++) {
    const prev = centers[r - 1];
    centers[r] = counts[r].map((_, i) => (prev[2 * i] + prev[2 * i + 1]) / 2);
  }
  return centers;
}

function MatchBox({ m, top }) {
  const isDecided = m.homeScore != null && m.awayScore != null;
  const homeWins = isDecided && m.homeScore > m.awayScore;
  const awayWins = isDecided && m.awayScore > m.homeScore;
  const isLive = m.status === "live";

  return (
    <div
      style={{
        ...styles.slot,
        ...(isLive ? styles.slotLive : {}),
        position: "absolute",
        top,
        left: 0,
        width: COLUMN_WIDTH,
        height: SLOT_HEIGHT,
      }}
    >
      <div style={{ ...styles.slotRow, ...(homeWins ? styles.slotRowWinner : {}) }}>
        <span style={styles.slotTeamInner}>
          {m.homeFlag && <img src={m.homeFlag} alt="" style={styles.slotFlag} />}
          <span style={{ ...styles.slotTeam, ...(m.homeUnresolved ? styles.slotTeamPending : {}) }}>
            {m.home || "Por definir"}
          </span>
        </span>
        {isDecided && <span style={styles.slotScore}>{m.homeScore}</span>}
      </div>
      <div style={{ ...styles.slotRow, ...(awayWins ? styles.slotRowWinner : {}), borderBottom: "none" }}>
        <span style={styles.slotTeamInner}>
          {m.awayFlag && <img src={m.awayFlag} alt="" style={styles.slotFlag} />}
          <span style={{ ...styles.slotTeam, ...(m.awayUnresolved ? styles.slotTeamPending : {}) }}>
            {m.away || "Por definir"}
          </span>
        </span>
        {isDecided && <span style={styles.slotScore}>{m.awayScore}</span>}
      </div>
      {isLive && (
        <span style={styles.slotLiveTag}>
          <span style={styles.liveDot} />
          En vivo
        </span>
      )}
    </div>
  );
}

// rounds: [{ label, matches: [{id,home,away,homeFlag,awayFlag,homeScore,awayScore,status,homeUnresolved,awayUnresolved}] }]
// Match counts must halve each round (16 -> 8 -> 4 -> 2 -> 1).
export default function BracketView({ rounds, extraColumn }) {
  const centers = computeCenters(rounds.map((r) => r.matches));
  const totalHeight = rounds[0].matches.length * (SLOT_HEIGHT + SLOT_GAP) - SLOT_GAP;

  return (
    <div style={styles.scroll}>
      <div style={{ ...styles.inner, height: totalHeight }}>
        {rounds.map((round, r) => (
          <div key={round.label} style={{ ...styles.column, left: r * (COLUMN_WIDTH + COLUMN_GAP) }}>
            <div style={styles.columnLabel}>{round.label}</div>
            <div style={{ position: "relative", height: totalHeight }}>
              {round.matches.map((m, i) => (
                <MatchBox key={m.id ?? i} m={m} top={centers[r][i]} />
              ))}
            </div>
          </div>
        ))}

        {extraColumn && (
          <div
            style={{
              ...styles.column,
              left: rounds.length * (COLUMN_WIDTH + COLUMN_GAP),
            }}
          >
            <div style={styles.columnLabel}>{extraColumn.label}</div>
            <div style={{ position: "relative", height: totalHeight }}>
              <MatchBox m={extraColumn.match} top={totalHeight / 2 - SLOT_HEIGHT / 2} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  scroll: { overflowX: "auto", padding: "24px 20px 32px" },
  inner: { position: "relative", minWidth: "max-content" },
  column: { position: "absolute", top: 0, width: COLUMN_WIDTH },
  columnLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.accentWarm,
    textAlign: "center",
    marginBottom: 14,
  },

  slot: { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" },
  slotLive: { borderColor: COLORS.live },
  slotRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    borderBottom: `1px solid ${COLORS.border}`,
    height: SLOT_HEIGHT / 2 - 1,
    boxSizing: "border-box",
  },
  slotRowWinner: { background: "rgba(0,168,89,0.1)" },
  slotTeamInner: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 },
  slotTeam: { fontSize: 12, fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  slotTeamPending: { color: COLORS.textMuted, fontWeight: 500, fontStyle: "italic" },
  slotFlag: { width: 16, height: 12, objectFit: "cover", borderRadius: 2, flexShrink: 0 },
  slotScore: { fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: COLORS.accentWarm },
  slotLiveTag: {
    position: "absolute",
    bottom: -2,
    right: 6,
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.live,
  },
  liveDot: { width: 5, height: 5, borderRadius: "50%", background: COLORS.live, display: "inline-block" },
};

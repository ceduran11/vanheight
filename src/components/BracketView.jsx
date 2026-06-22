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

// Splits a round's matches into the pairs that feed the next round
// (indices 2i/2i+1 always feed index i of the following round — the same
// pairing every caller of BracketView already relies on).
function pairUp(matches) {
  const pairs = [];
  for (let i = 0; i < matches.length; i += 2) pairs.push([matches[i], matches[i + 1]]);
  return pairs;
}

function MatchBox({ m, onPickWinner }) {
  const isDecided = m.homeScore != null && m.awayScore != null;
  const homeWins = isDecided && m.homeScore > m.awayScore;
  const awayWins = isDecided && m.awayScore > m.homeScore;
  const isLive = m.status === "live";
  const canPick = typeof onPickWinner === "function" && !m.homeUnresolved && !m.awayUnresolved;

  return (
    <div style={{ ...styles.slot, ...(isLive ? styles.slotLive : {}) }}>
      <div style={{ ...styles.slotRow, ...(homeWins || m.winner === "home" ? styles.slotRowWinner : {}) }}>
        <span style={styles.slotTeamInner}>
          {m.homeFlag && !m.homeUnresolved && <img src={m.homeFlag} alt="" style={styles.slotFlag} />}
          <span style={{ ...styles.slotTeam, ...(m.homeUnresolved ? styles.slotTeamPending : {}) }}>
            {m.home || "Por definir"}
          </span>
        </span>
        {isDecided && <span style={styles.slotScore}>{m.homeScore}</span>}
        {canPick && (
          <input
            type="checkbox"
            checked={m.winner === "home"}
            onChange={() => onPickWinner(m.id, "home")}
            style={styles.winnerCheckbox}
            title={`Avanza: ${m.home}`}
          />
        )}
      </div>
      <div style={{ ...styles.slotRow, ...(awayWins || m.winner === "away" ? styles.slotRowWinner : {}), borderBottom: "none" }}>
        <span style={styles.slotTeamInner}>
          {m.awayFlag && !m.awayUnresolved && <img src={m.awayFlag} alt="" style={styles.slotFlag} />}
          <span style={{ ...styles.slotTeam, ...(m.awayUnresolved ? styles.slotTeamPending : {}) }}>
            {m.away || "Por definir"}
          </span>
        </span>
        {isDecided && <span style={styles.slotScore}>{m.awayScore}</span>}
        {canPick && (
          <input
            type="checkbox"
            checked={m.winner === "away"}
            onChange={() => onPickWinner(m.id, "away")}
            style={styles.winnerCheckbox}
            title={`Avanza: ${m.away}`}
          />
        )}
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

// rounds: [{ label, matches: [{id,home,away,homeFlag,awayFlag,homeScore,awayScore,status,homeUnresolved,awayUnresolved,winner}], extra }]
// `extra` (optional) renders as a normal-flow block directly below that round's matches — e.g. a champion banner under the Final.
// Match counts must halve each round (16 -> 8 -> 4 -> 2 -> 1).
// onPickWinner(matchId, "home"|"away") — when provided, matches with both
// sides resolved get a checkbox per side to mark who advances.
//
// Connector lines: every round except the last groups its matches into pairs
// (the two feeders of the next round's match). Each pair lives in its own
// position:relative wrapper that is split 50/50 by two flex:1 slots — so the
// pair's vertical connector (anchored to that wrapper) always spans exactly
// from the first slot's center (25%) to the second slot's center (75%),
// with no pixel math, however the column's height changes across breakpoints.
export default function BracketView({ rounds, extraColumn, onPickWinner }) {
  const totalHeight = rounds[0].matches.length * (SLOT_HEIGHT + SLOT_GAP);

  return (
    <div style={styles.scroll}>
      <div style={styles.inner}>
        {rounds.map((round, r) => {
          const isFirst = r === 0;
          const isLast = r === rounds.length - 1;
          return (
            <div key={round.label} style={styles.column}>
              <div style={styles.columnLabel}>{round.label}</div>
              <div style={{ ...styles.matchesCol, height: totalHeight }}>
                {isLast
                  ? round.matches.map((m, i) => (
                      <div key={m.id ?? i} style={styles.slotRegion}>
                        {!isFirst && <span style={styles.stubLeft} />}
                        <MatchBox m={m} onPickWinner={onPickWinner} />
                      </div>
                    ))
                  : pairUp(round.matches).map((pair, pi) => (
                      <div key={pi} style={styles.pairWrap}>
                        {pair.map((m, si) => (
                          <div key={m.id ?? si} style={styles.slotRegion}>
                            {!isFirst && <span style={styles.stubLeft} />}
                            <MatchBox m={m} onPickWinner={onPickWinner} />
                            <span style={styles.stubRight} />
                          </div>
                        ))}
                        <span style={styles.vConnector} />
                      </div>
                    ))}
              </div>
              {round.extra}
            </div>
          );
        })}

        {extraColumn && (
          <div style={styles.column}>
            <div style={styles.columnLabel}>{extraColumn.label}</div>
            <div style={{ ...styles.matchesCol, height: totalHeight }}>
              <div style={styles.slotRegion}>
                <MatchBox m={extraColumn.match} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  scroll: { overflowX: "auto", padding: "24px 20px 32px" },
  // Columns are plain flex siblings now — the browser handles spacing and
  // horizontal scroll the same way regardless of viewport width.
  inner: { display: "flex", flexDirection: "row", gap: COLUMN_GAP, minWidth: "max-content" },
  column: { flexShrink: 0, width: COLUMN_WIDTH },
  columnLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.accentWarm,
    textAlign: "center",
    marginBottom: 14,
  },

  // A round's matches column: fixed total height, split evenly by the
  // flex:1 pair-wraps/slot-regions inside it — same math as a manual
  // pixel-center calculation, but computed by the browser's layout engine.
  matchesCol: { display: "flex", flexDirection: "column" },
  // Wraps exactly the 2 matches that feed one match in the next round.
  // position:relative so its own vConnector child has a direct, local
  // anchor — never the page or a distant ancestor.
  pairWrap: { flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 },
  // One match's share of its column/pair — centers the (fixed-height) card
  // inside an evenly-split region instead of placing it via a computed top.
  // position:relative so the stub lines below anchor to THIS match's own
  // container, never the card itself (which stays overflow:hidden for its
  // rounded corners) and never a distant ancestor.
  slotRegion: { flex: 1, position: "relative", display: "flex", alignItems: "center", minHeight: 0 },
  // Vertical bracket line: spans the middle 50% of its pairWrap parent,
  // i.e. exactly from the first match's center (25%) to the second's (75%).
  vConnector: {
    position: "absolute",
    top: "25%",
    bottom: "25%",
    right: -COLUMN_GAP / 2,
    borderRight: `1px solid ${COLORS.border}`,
  },
  // Short horizontal stubs reaching halfway into the gap on either side of
  // a card — anchored to that card's own slotRegion (their direct parent).
  stubLeft: { position: "absolute", left: -COLUMN_GAP / 2, top: "50%", width: COLUMN_GAP / 2, height: 1, background: COLORS.border },
  stubRight: { position: "absolute", right: -COLUMN_GAP / 2, top: "50%", width: COLUMN_GAP / 2, height: 1, background: COLORS.border },

  slot: {
    position: "relative",
    width: "100%",
    height: SLOT_HEIGHT,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    overflow: "hidden",
  },
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
  winnerCheckbox: { width: 14, height: 14, accentColor: COLORS.accent, cursor: "pointer", flexShrink: 0, marginLeft: 6 },
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

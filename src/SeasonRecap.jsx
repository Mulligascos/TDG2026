import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID = "1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby1o9A_xc6Kd24K0yNiMkFnW7ZX2E0cEHFoUjaZ98Vu_eSTzgaM6HHVGNqOX62viRh2Mw/exec";
const BRAND = "#006400";
const SEASON = "Summer League 2026";

// ─── SAMPLE DATA (used as fallback / for demo purposes) ──────────────────────
const SAMPLE_DATA = {
  players: [
    { name: "Rick Stevens", pool: "Pool A" },
    { name: "Tom Fletcher", pool: "Pool A" },
    { name: "Bryce Foster", pool: "Pool B" },
    { name: "Philip Loyal (J)", pool: "Pool B" },
    { name: "Emma Karl", pool: "Pool C" },
    { name: "Jake S", pool: "Pool C" },
    { name: "Aleyah B", pool: "Pool D" },
    { name: "Nevin", pool: "Pool D" },
  ],
  matches: [
    { player1: "Rick Stevens", player2: "Tom Fletcher", winner: "Rick Stevens", status: "Completed", scoresJson: Array(18).fill({ p1: 3, p2: 4, scored: true }) },
    { player1: "Bryce Foster", player2: "Rick Stevens", winner: "Rick Stevens", status: "Completed", scoresJson: Array(18).fill({ p1: 4, p2: 3, scored: true }) },
    { player1: "Rick Stevens", player2: "Emma Karl", winner: "Emma Karl", status: "Completed", scoresJson: Array(18).fill({ p1: 4, p2: 3, scored: true }) },
    { player1: "Rick Stevens", player2: "Jake S", winner: "Rick Stevens", status: "Completed", scoresJson: [
      ...Array(10).fill({ p1: 3, p2: 4, scored: true }),
      ...Array(8).fill({ p1: 3, p2: 3, scored: true }),
    ]},
  ],
  standings: {
    "Pool A": [
      { name: "Rick Stevens", points: 9, played: 4, win: 3, loss: 1 },
      { name: "Tom Fletcher", points: 3, played: 4, win: 1, loss: 3 },
    ]
  }
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmt = (name) => {
  if (!name) return "";
  const parts = name.replace(" (J)", "").trim().split(" ");
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}`;
};

const applyJunior = (score, name) =>
  name?.includes("(J)") ? Math.max(1, score - 1) : score;

const calcHoles = (match) => {
  let p1 = 0, p2 = 0;
  match.scoresJson?.forEach((s) => {
    if (!s?.scored) return;
    const a1 = applyJunior(s.p1, match.player1);
    const a2 = applyJunior(s.p2, match.player2);
    if (a1 < a2) p1++;
    else if (a2 < a1) p2++;
  });
  return { p1, p2 };
};

// ─── STATS ENGINE ─────────────────────────────────────────────────────────────
const buildPlayerStats = (playerName, allMatches, standings) => {
  const myMatches = allMatches.filter(
    (m) =>
      m.status === "Completed" &&
      (m.player1 === playerName || m.player2 === playerName)
  );

  if (myMatches.length === 0) return null;

  let wins = 0, losses = 0, ties = 0;
  let bestMatch = null, bestDiff = -Infinity;
  let worstMatch = null, worstDiff = Infinity;
  let closestMatch = null, closestDiff = Infinity;
  let totalHolesWon = 0, totalHolesLost = 0;
  let currentStreak = 0, bestStreak = 0, tempStreak = 0;
  const headToHead = {};

  myMatches.forEach((m) => {
    const isP1 = m.player1 === playerName;
    const opp = isP1 ? m.player2 : m.player1;
    const { p1, p2 } = calcHoles(m);
    const myHoles = isP1 ? p1 : p2;
    const theirHoles = isP1 ? p2 : p1;
    const diff = myHoles - theirHoles;

    totalHolesWon += myHoles;
    totalHolesLost += theirHoles;

    if (!headToHead[opp]) headToHead[opp] = { wins: 0, losses: 0, ties: 0 };

    if (m.winner === playerName) {
      wins++;
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
      headToHead[opp].wins++;
    } else if (!m.winner || m.winner === "Tie") {
      ties++;
      tempStreak = 0;
      headToHead[opp].ties++;
    } else {
      losses++;
      tempStreak = 0;
      headToHead[opp].losses++;
    }

    if (diff > bestDiff) { bestDiff = diff; bestMatch = { ...m, myHoles, theirHoles, opp, diff }; }
    if (diff < worstDiff) { worstDiff = diff; worstMatch = { ...m, myHoles, theirHoles, opp, diff }; }
    const absDiff = Math.abs(diff);
    if (absDiff < closestDiff) { closestDiff = absDiff; closestMatch = { ...m, myHoles, theirHoles, opp, diff }; }
  });

  // Find standing
  let poolPosition = null, poolName = null, poolSize = null;
  Object.entries(standings || {}).forEach(([pool, rows]) => {
    const idx = rows.findIndex((r) => r.name === playerName);
    if (idx !== -1) {
      poolPosition = idx + 1;
      poolName = pool;
      poolSize = rows.length;
    }
  });

  // Rivals
  const rivalries = Object.entries(headToHead)
    .map(([opp, r]) => ({ opp, ...r, played: r.wins + r.losses + r.ties }))
    .sort((a, b) => b.played - a.played);

  const nemesis = Object.entries(headToHead)
    .filter(([, r]) => r.losses > r.wins)
    .sort(([, a], [, b]) => b.losses - a.losses)[0];

  const bestRival = Object.entries(headToHead)
    .filter(([, r]) => r.wins > r.losses)
    .sort(([, a], [, b]) => b.wins - a.wins)[0];

  return {
    name: playerName,
    played: myMatches.length,
    wins, losses, ties,
    totalHolesWon, totalHolesLost,
    holeDiff: totalHolesWon - totalHolesLost,
    winRate: Math.round((wins / myMatches.length) * 100),
    bestStreak,
    bestMatch, worstMatch, closestMatch,
    poolPosition, poolName, poolSize,
    rivalries,
    nemesis: nemesis ? { name: nemesis[0], ...nemesis[1] } : null,
    bestRival: bestRival ? { name: bestRival[0], ...bestRival[1] } : null,
  };
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color = BRAND }) => (
  <div style={{
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: "16px 20px",
    flex: "1 1 120px",
    minWidth: 100,
  }}>
    <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{sub}</div>}
  </div>
);

const MatchHighlight = ({ label, match, color }) => {
  if (!match) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: `1px solid ${color}40`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      padding: "12px 16px",
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
        vs {fmt(match.opp)} — {match.myHoles} – {match.theirHoles} holes
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
        {match.diff > 0 ? `Won ${match.diff} up` : match.diff < 0 ? `Lost ${Math.abs(match.diff)} down` : "All square"}
      </div>
    </div>
  );
};

const RecapCard = ({ recap, isLoading }) => (
  <div style={{
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    position: "relative",
    overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", top: 16, right: 20,
      fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)",
      textTransform: "uppercase", letterSpacing: 1.5
    }}>AI Recap</div>

    {isLoading ? (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4ade80",
              animation: "bounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Writing your recap...</span>
      </div>
    ) : (
      <p style={{
        color: "rgba(255,255,255,0.85)", lineHeight: 1.8, fontSize: 15,
        margin: 0, whiteSpace: "pre-wrap", fontStyle: "italic",
      }}>{recap}</p>
    )}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SeasonRecap() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [stats, setStats] = useState(null);
  const [recap, setRecap] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingRecap, setIsLoadingRecap] = useState(false);
  const [dataSource, setDataSource] = useState("sheet");
  const [error, setError] = useState("");

  // Load data
  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
        if (!res.ok) throw new Error("Sheet unavailable");
        const data = await res.json();

        const parsedPlayers = (data.players || []).slice(1).map(r => ({ name: r[1], status: r[3] }));
        const parsedMatches = (data.matches || []).slice(1).map(r => ({
          id: r[0], date: r[1], venue: r[2], player1: r[3], player2: r[4],
          scoresJson: r[7] ? JSON.parse(r[7]) : [], winner: r[8], status: r[9] || "scheduled",
        }));
        const parsedPools = (data.pools || []).slice(1).map(r => ({
          pool: r[0], player: r[1], played: +r[2] || 0, win: +r[3] || 0, loss: +r[4] || 0, points: +r[5] || 0,
        }));

        // Build standings map
        const standingsMap = {};
        parsedPools.forEach(p => {
          if (!standingsMap[p.pool]) standingsMap[p.pool] = [];
          standingsMap[p.pool].push({ name: p.player, points: p.points, played: p.played, win: p.win, loss: p.loss });
        });
        Object.keys(standingsMap).forEach(pool => {
          standingsMap[pool].sort((a, b) => b.points - a.points);
        });

        setPlayers(parsedPlayers);
        setMatches(parsedMatches);
        setStandings(standingsMap);
        setDataSource("sheet");
      } catch (err) {
        console.warn("Using sample data:", err);
        setPlayers(SAMPLE_DATA.players.map(p => ({ name: p.name, status: "Active" })));
        setMatches(SAMPLE_DATA.matches);
        setStandings(SAMPLE_DATA.standings);
        setDataSource("demo");
      } finally {
        setIsLoadingData(false);
      }
    };
    load();
  }, []);

  // Generate stats when player selected
  useEffect(() => {
    if (!selectedPlayer) { setStats(null); setRecap(""); return; }
    const s = buildPlayerStats(selectedPlayer, matches, standings);
    setStats(s);
    setRecap("");
  }, [selectedPlayer, matches, standings]);

  // Generate AI recap
  const generateRecap = useCallback(async () => {
    if (!stats) return;
    setIsLoadingRecap(true);
    setRecap("");
    setError("");

    const prompt = `You are writing a warm, personalised end-of-season recap for a disc golf league player. 
Write it in second person ("You played..."). Make it feel genuine and specific, not generic. 
Vary the structure — don't just list facts in order. Include a highlight, a challenge, and something encouraging.
Keep it to 4-6 sentences. Be conversational, warm, and slightly witty where appropriate.

Here is the player's season data for the ${SEASON}:

Player: ${stats.name}
Matches played: ${stats.played}
Wins: ${stats.wins}, Losses: ${stats.losses}, Ties: ${stats.ties}
Win rate: ${stats.winRate}%
Pool: ${stats.poolName || "N/A"}
Pool position: ${stats.poolPosition ? `${stats.poolPosition} of ${stats.poolSize}` : "N/A"}
Total holes won: ${stats.totalHolesWon}, Total holes lost: ${stats.totalHolesLost}
Season hole differential: ${stats.holeDiff > 0 ? "+" : ""}${stats.holeDiff}
Best win streak: ${stats.bestStreak} matches
${stats.bestMatch ? `Best match: vs ${fmt(stats.bestMatch.opp)}, won ${stats.bestMatch.myHoles}–${stats.bestMatch.theirHoles} holes (${stats.bestMatch.diff} up)` : ""}
${stats.worstMatch ? `Toughest match: vs ${fmt(stats.worstMatch.opp)}, lost ${stats.worstMatch.myHoles}–${stats.worstMatch.theirHoles} holes` : ""}
${stats.closestMatch ? `Closest match: vs ${fmt(stats.closestMatch.opp)}, ${Math.abs(stats.closestMatch.diff) === 0 ? "all square" : `${Math.abs(stats.closestMatch.diff)} hole margin`}` : ""}
${stats.nemesis ? `Nemesis (lost most to): ${fmt(stats.nemesis.name)} (${stats.nemesis.losses} losses)` : ""}
${stats.bestRival ? `Best rival (beat most): ${fmt(stats.bestRival.name)} (${stats.bestRival.wins} wins)` : ""}
${stats.bestStreak >= 3 ? `Impressive: had a ${stats.bestStreak}-match winning streak` : ""}

Write the recap now:`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setRecap(text.trim());
    } catch (err) {
      setError("Failed to generate recap. Please try again.");
    } finally {
      setIsLoadingRecap(false);
    }
  }, [stats]);

  const completedPlayers = players.filter(p =>
    matches.some(m => m.status === "Completed" && (m.player1 === p.name || m.player2 === p.name))
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0f0a; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .stat-section { animation: fadeIn 0.4s ease both; }
        select:focus { outline: 2px solid #4ade80; outline-offset: 2px; }
        .generate-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(74,222,128,0.3); }
        .generate-btn:active { transform: translateY(0); }
        .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a1a0a 0%, #0d1f0d 40%, #0a120a 100%)",
        fontFamily: "'DM Sans', sans-serif",
        color: "white",
        padding: "0 0 60px",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(180deg, rgba(0,100,0,0.3) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "40px 24px 32px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
            Timaru Disc Golf
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(32px, 8vw, 52px)",
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
            background: "linear-gradient(135deg, #ffffff 0%, #4ade80 60%, #86efac 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Season Recap
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 10 }}>{SEASON}</p>

          {dataSource === "demo" && (
            <div style={{
              display: "inline-block", marginTop: 16,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#fbbf24",
            }}>
              ⚠ Demo mode — showing sample data
            </div>
          )}
        </div>

        <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px 0" }}>

          {/* Player selector */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
              Select Player
            </label>
            {isLoadingData ? (
              <div style={{
                height: 52, borderRadius: 14, background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
              }} />
            ) : (
              <select
                value={selectedPlayer}
                onChange={e => setSelectedPlayer(e.target.value)}
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 14,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "white", fontSize: 16, fontFamily: "'DM Sans', sans-serif",
                  appearance: "none", cursor: "pointer",
                }}
              >
                <option value="" style={{ background: "#0d1f0d" }}>Choose a player...</option>
                {completedPlayers.map(p => (
                  <option key={p.name} value={p.name} style={{ background: "#0d1f0d" }}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="stat-section">

              {/* Top stats row */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard label="Played" value={stats.played} />
                <StatCard label="Won" value={stats.wins} color="#4ade80" />
                <StatCard label="Lost" value={stats.losses} color="#f87171" />
                <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "#4ade80" : "#fbbf24"} />
              </div>

              {/* Second row */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                {stats.poolPosition && (
                  <StatCard
                    label="Pool Finish"
                    value={`${stats.poolPosition}${["st","nd","rd"][stats.poolPosition - 1] || "th"}`}
                    sub={stats.poolName}
                    color="#a78bfa"
                  />
                )}
                <StatCard
                  label="Hole Diff"
                  value={`${stats.holeDiff >= 0 ? "+" : ""}${stats.holeDiff}`}
                  color={stats.holeDiff >= 0 ? "#4ade80" : "#f87171"}
                />
                {stats.bestStreak > 1 && (
                  <StatCard label="Best Streak" value={`${stats.bestStreak}W`} color="#fbbf24" />
                )}
              </div>

              {/* Match highlights */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                  Highlights
                </div>
                <MatchHighlight label="Best Match" match={stats.bestMatch} color="#4ade80" />
                <MatchHighlight label="Toughest Match" match={stats.worstMatch} color="#f87171" />
                <MatchHighlight label="Closest Match" match={stats.closestMatch} color="#fbbf24" />
              </div>

              {/* Rivalries */}
              {(stats.nemesis || stats.bestRival) && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                    Rivalries
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {stats.bestRival && (
                      <div style={{ flex: 1, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Favourite win</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(stats.bestRival.name)}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{stats.bestRival.wins}W – {stats.bestRival.losses}L</div>
                      </div>
                    )}
                    {stats.nemesis && (
                      <div style={{ flex: 1, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Nemesis</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(stats.nemesis.name)}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{stats.nemesis.wins}W – {stats.nemesis.losses}L</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Head to head table */}
              {stats.rivalries.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                    Head to Head
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {stats.rivalries.map((r, i) => (
                      <div key={r.opp} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 16px",
                        borderBottom: i < stats.rivalries.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{fmt(r.opp)}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{r.wins}W</span>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>–</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{r.losses}L</span>
                          {r.ties > 0 && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{r.ties}T</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button
                className="generate-btn"
                onClick={generateRecap}
                disabled={isLoadingRecap}
                style={{
                  width: "100%", padding: "16px 24px",
                  background: "linear-gradient(135deg, #166534, #15803d)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: 14, color: "white",
                  fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", transition: "all 0.2s ease",
                  letterSpacing: 0.5,
                }}
              >
                {isLoadingRecap ? "Writing recap..." : recap ? "✨ Regenerate Recap" : "✨ Generate My Season Recap"}
              </button>

              {error && (
                <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
                  {error}
                </div>
              )}

              {(recap || isLoadingRecap) && <RecapCard recap={recap} isLoading={isLoadingRecap} />}
            </div>
          )}

          {!stats && !isLoadingData && selectedPlayer && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0" }}>
              No completed matches found for this player.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

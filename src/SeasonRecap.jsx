import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby1o9A_xc6Kd24K0yNiMkFnW7ZX2E0cEHFoUjaZ98Vu_eSTzgaM6HHVGNqOX62viRh2Mw/exec";
const SEASON = "Summer League 2026";

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
const SAMPLE_DATA = {
  players: [
    { name: "Rick Stevens", status: "Active" },
    { name: "Tom Fletcher", status: "Active" },
    { name: "Bryce Foster", status: "Active" },
    { name: "Philip Loyal (J)", status: "Active" },
    { name: "Emma Karl", status: "Active" },
  ],
  matches: [
    { player1: "Rick Stevens", player2: "Tom Fletcher", winner: "Rick Stevens", status: "Completed", scoresJson: Array(18).fill({ p1: 3, p2: 4, scored: true }) },
    { player1: "Bryce Foster", player2: "Rick Stevens", winner: "Rick Stevens", status: "Completed", scoresJson: Array(18).fill({ p1: 4, p2: 3, scored: true }) },
    { player1: "Rick Stevens", player2: "Emma Karl", winner: "Emma Karl", status: "Completed", scoresJson: Array(18).fill({ p1: 4, p2: 3, scored: true }) },
    { player1: "Rick Stevens", player2: "Philip Loyal (J)", winner: "Rick Stevens", status: "Completed", scoresJson: [...Array(12).fill({ p1: 3, p2: 4, scored: true }), ...Array(6).fill({ p1: 3, p2: 3, scored: true })] },
    { player1: "Tom Fletcher", player2: "Rick Stevens", winner: "Rick Stevens", status: "Completed", scoresJson: Array(18).fill({ p1: 4, p2: 3, scored: true }) },
  ],
  standings: {
    "Pool A": [
      { name: "Rick Stevens", points: 12, played: 5, win: 4, loss: 1 },
      { name: "Tom Fletcher", points: 3, played: 5, win: 1, loss: 4 },
    ]
  }
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmt = (name) => {
  if (!name) return "";
  const parts = name.replace(" (J)", "").trim().split(" ");
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}`;
};
const fmtFull = (name) => name?.replace(" (J)", "").trim() || "";
const ordinal = (n) => {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
};
const applyJunior = (score, name) => name?.includes("(J)") ? Math.max(1, score - 1) : score;
const calcHoles = (match) => {
  let p1 = 0, p2 = 0;
  match.scoresJson?.forEach((s) => {
    if (!s?.scored) return;
    const a1 = applyJunior(s.p1, match.player1);
    const a2 = applyJunior(s.p2, match.player2);
    if (a1 < a2) p1++; else if (a2 < a1) p2++;
  });
  return { p1, p2 };
};

// ─── STATS ENGINE ─────────────────────────────────────────────────────────────
const buildPlayerStats = (playerName, allMatches, standings) => {
  const myMatches = allMatches.filter(
    (m) => m.status === "Completed" && (m.player1 === playerName || m.player2 === playerName)
  );
  if (myMatches.length === 0) return null;

  let wins = 0, losses = 0, ties = 0;
  let bestMatch = null, bestDiff = -Infinity;
  let worstMatch = null, worstDiff = Infinity;
  let closestMatch = null, closestDiff = Infinity;
  let totalHolesWon = 0, totalHolesLost = 0;
  let bestStreak = 0, tempStreak = 0;
  const headToHead = {};

  myMatches.forEach((m) => {
    const isP1 = m.player1 === playerName;
    const opp = isP1 ? m.player2 : m.player1;
    const { p1, p2 } = calcHoles(m);
    const myHoles = isP1 ? p1 : p2;
    const theirHoles = isP1 ? p2 : p1;
    const diff = myHoles - theirHoles;
    totalHolesWon += myHoles; totalHolesLost += theirHoles;
    if (!headToHead[opp]) headToHead[opp] = { wins: 0, losses: 0, ties: 0 };
    if (m.winner === playerName) { wins++; tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); headToHead[opp].wins++; }
    else if (!m.winner || m.winner === "Tie") { ties++; tempStreak = 0; headToHead[opp].ties++; }
    else { losses++; tempStreak = 0; headToHead[opp].losses++; }
    if (diff > bestDiff) { bestDiff = diff; bestMatch = { ...m, myHoles, theirHoles, opp, diff }; }
    if (diff < worstDiff) { worstDiff = diff; worstMatch = { ...m, myHoles, theirHoles, opp, diff }; }
    if (Math.abs(diff) < closestDiff) { closestDiff = Math.abs(diff); closestMatch = { ...m, myHoles, theirHoles, opp, diff }; }
  });

  let poolPosition = null, poolName = null, poolSize = null;
  Object.entries(standings || {}).forEach(([pool, rows]) => {
    const idx = rows.findIndex((r) => r.name === playerName);
    if (idx !== -1) { poolPosition = idx + 1; poolName = pool; poolSize = rows.length; }
  });

  const rivalries = Object.entries(headToHead)
    .map(([opp, r]) => ({ opp, ...r, played: r.wins + r.losses + r.ties }))
    .sort((a, b) => b.played - a.played);
  const nemesis = Object.entries(headToHead).filter(([, r]) => r.losses > r.wins).sort(([, a], [, b]) => b.losses - a.losses)[0];
  const bestRival = Object.entries(headToHead).filter(([, r]) => r.wins > r.losses).sort(([, a], [, b]) => b.wins - a.wins)[0];

  return {
    name: playerName, played: myMatches.length, wins, losses, ties,
    totalHolesWon, totalHolesLost, holeDiff: totalHolesWon - totalHolesLost,
    winRate: Math.round((wins / myMatches.length) * 100), bestStreak,
    bestMatch, worstMatch, closestMatch, poolPosition, poolName, poolSize, rivalries,
    nemesis: nemesis ? { name: nemesis[0], ...nemesis[1] } : null,
    bestRival: bestRival ? { name: bestRival[0], ...bestRival[1] } : null,
  };
};

// ─── SHARE CARD (rendered off-screen then captured) ───────────────────────────
const ShareCard = ({ stats, recap, cardRef }) => {
  const diff = stats.holeDiff;
  const winPct = stats.winRate;

  return (
    <div ref={cardRef} style={{
      width: 420, fontFamily: "'Syne', sans-serif",
      background: "linear-gradient(145deg, #071407 0%, #0d2b0d 50%, #081808 100%)",
      borderRadius: 24, overflow: "hidden", position: "relative",
    }}>
      {/* Top accent bar */}
      <div style={{ height: 5, background: "linear-gradient(90deg, #15803d, #4ade80, #fbbf24, #4ade80, #15803d)" }} />

      {/* Disc texture overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.06,
        backgroundImage: `radial-gradient(circle at 70% 20%, rgba(74,222,128,0.4) 0%, transparent 50%),
          radial-gradient(circle at 20% 80%, rgba(251,191,36,0.3) 0%, transparent 40%)`,
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ padding: "24px 28px 16px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#4ade80", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
              🥏 Timaru Disc Golf
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -1, lineHeight: 1 }}>
              {fmtFull(stats.name)}
            </div>
            {stats.poolName && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 5 }}>
                {stats.poolName} · {ordinal(stats.poolPosition)} of {stats.poolSize}
              </div>
            )}
          </div>
          {/* Big win rate circle */}
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            border: "2px solid rgba(74,222,128,0.35)",
            background: "rgba(74,222,128,0.06)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: winPct >= 50 ? "#4ade80" : "#fbbf24", lineHeight: 1 }}>{winPct}%</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>Win Rate</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: "0 28px 20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { label: "Played", val: stats.played, color: "rgba(255,255,255,0.9)" },
          { label: "Won", val: stats.wins, color: "#4ade80" },
          { label: "Lost", val: stats.losses, color: "#f87171" },
          { label: "Streak", val: `${stats.bestStreak}W`, color: "#fbbf24" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 28px", height: 1, background: "rgba(255,255,255,0.07)" }} />

      {/* Match highlights */}
      <div style={{ padding: "16px 28px" }}>
        {stats.bestMatch && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <div>
              <div style={{ fontSize: 9, color: "#4ade80", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Best Win</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                vs {fmt(stats.bestMatch.opp)} — {stats.bestMatch.myHoles}–{stats.bestMatch.theirHoles} holes ({stats.bestMatch.diff} up)
              </div>
            </div>
          </div>
        )}
        {stats.nemesis && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚔️</span>
            <div>
              <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Nemesis</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                {fmt(stats.nemesis.name)} — {stats.nemesis.wins}W {stats.nemesis.losses}L
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ margin: "0 28px", height: 1, background: "rgba(255,255,255,0.07)" }} />

      {/* Hole diff bar */}
      <div style={{ padding: "14px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Hole Differential</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: diff >= 0 ? "#4ade80" : "#f87171" }}>
            {diff >= 0 ? "+" : ""}{diff}
          </span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4,
            width: `${Math.min(100, 50 + (diff / stats.played) * 10)}%`,
            background: diff >= 0 ? "linear-gradient(90deg, #15803d, #4ade80)" : "linear-gradient(90deg, #991b1b, #f87171)",
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* AI recap */}
      {recap && (
        <>
          <div style={{ margin: "0 28px", height: 1, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ padding: "14px 28px" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Season Story</div>
            <p style={{
              fontSize: 11.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.7,
              fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", margin: 0,
              display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{recap}</p>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{
        padding: "12px 28px", background: "rgba(0,0,0,0.25)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>tdg-2026.vercel.app/recap</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{SEASON}</div>
      </div>
    </div>
  );
};

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
const ShareModal = ({ stats, recap, onClose }) => {
  const cardRef = useRef(null);
  const [capturing, setCapturing] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    const capture = async () => {
      // Give fonts a moment to load
      await new Promise(r => setTimeout(r, 300));
      try {
        const { default: html2canvas } = await import("https://esm.sh/html2canvas@1.4.1");
        const canvas = await html2canvas(cardRef.current, {
          scale: 2, backgroundColor: null, useCORS: true, logging: false,
        });
        setImageUrl(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error("Capture failed:", err);
      } finally {
        setCapturing(false);
      }
    };
    capture();
  }, []);

  const getBlob = async () => {
    const res = await fetch(imageUrl);
    return res.blob();
  };

  const handleShare = async () => {
    const blob = await getBlob();
    const file = new File([blob], `${fmtFull(stats.name).replace(/\s+/g,"-")}-TDG-2026.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `${fmtFull(stats.name)} — TDG ${SEASON}`,
        text: `My season recap from the Timaru Disc Golf ${SEASON} 🥏`,
        files: [file],
      }).catch(() => {});
    } else {
      handleDownload();
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${fmtFull(stats.name).replace(/\s+/g,"-")}-TDG-recap-2026.png`;
    a.click();
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText("https://tdg-2026.vercel.app/recap");
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20, backdropFilter: "blur(10px)",
      }}
    >
      <div style={{
        background: "#0a1a0a", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24, padding: 28, maxWidth: 460, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "white", margin: 0 }}>
              Share Your Card
            </h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              Save or share your season recap card
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.7)",
            width: 36, height: 36, borderRadius: "50%", cursor: "pointer",
            fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 20, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {capturing ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#4ade80",
                    animation: "bounce 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 13 }}>Generating card...</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="Season card preview" style={{
              width: "100%", borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }} />
          ) : (
            <p style={{ color: "#f87171", fontSize: 13 }}>Failed to generate card. Please try again.</p>
          )}
        </div>

        {/* Hidden card for capture */}
        <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none" }}>
          <ShareCard stats={stats} recap={recap} cardRef={cardRef} />
        </div>

        {/* Buttons */}
        {imageUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={handleShare} style={{
              width: "100%", padding: "14px", borderRadius: 14,
              background: "linear-gradient(135deg, #166534, #15803d)",
              border: "1px solid rgba(74,222,128,0.3)",
              color: "white", fontFamily: "'Syne', sans-serif", fontSize: 15,
              fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {navigator.share ? "📤 Share Card" : "⬇️ Download Card"}
            </button>

            {navigator.share && (
              <button onClick={handleDownload} style={{
                width: "100%", padding: "12px", borderRadius: 14,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                ⬇️ Save to device
              </button>
            )}

            <button onClick={handleCopyLink} style={{
              width: "100%", padding: "12px", borderRadius: 14,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {copyState === "copied" ? "✓ Link copied!" : "🔗 Copy recap page link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = "#006400" }) => (
  <div style={{
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16, padding: "16px 20px", flex: "1 1 120px", minWidth: 100,
  }}>
    <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
  </div>
);

const MatchHighlight = ({ label, match, color }) => {
  if (!match) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", border: `1px solid ${color}40`,
      borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
        vs {fmt(match.opp)} — {match.myHoles}–{match.theirHoles} holes
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
        {match.diff > 0 ? `Won ${match.diff} up` : match.diff < 0 ? `Lost ${Math.abs(match.diff)} down` : "All square"}
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
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
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const parsedPlayers = (data.players||[]).slice(1).map(r => ({ name: r[1], status: r[3] }));
        const parsedMatches = (data.matches||[]).slice(1).map(r => ({
          id: r[0], date: r[1], venue: r[2], player1: r[3], player2: r[4],
          scoresJson: r[7] ? JSON.parse(r[7]) : [], winner: r[8], status: r[9]||"scheduled",
        }));
        const parsedPools = (data.pools||[]).slice(1).map(r => ({
          pool: r[0], player: r[1], played: +r[2]||0, win: +r[3]||0, loss: +r[4]||0, points: +r[5]||0,
        }));
        const standingsMap = {};
        parsedPools.forEach(p => {
          if (!standingsMap[p.pool]) standingsMap[p.pool] = [];
          standingsMap[p.pool].push({ name: p.player, points: p.points, played: p.played, win: p.win, loss: p.loss });
        });
        Object.keys(standingsMap).forEach(pool => standingsMap[pool].sort((a, b) => b.points - a.points));
        setPlayers(parsedPlayers); setMatches(parsedMatches); setStandings(standingsMap); setDataSource("sheet");
      } catch {
        setPlayers(SAMPLE_DATA.players); setMatches(SAMPLE_DATA.matches);
        setStandings(SAMPLE_DATA.standings); setDataSource("demo");
      } finally { setIsLoadingData(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedPlayer) { setStats(null); setRecap(""); return; }
    setStats(buildPlayerStats(selectedPlayer, matches, standings));
    setRecap("");
  }, [selectedPlayer, matches, standings]);

  const generateRecap = useCallback(async () => {
    if (!stats) return;
    setIsLoadingRecap(true); setRecap(""); setError("");
    const prompt = `You are writing a warm, personalised end-of-season recap for a disc golf league player.
Write in second person ("You played..."). Make it genuine and specific, not generic.
Include a highlight, a challenge, and something encouraging. 4-6 sentences. Conversational and slightly witty.

Player: ${stats.name} | Season: ${SEASON}
Record: ${stats.played} played, ${stats.wins}W ${stats.losses}L ${stats.ties}T | Win rate: ${stats.winRate}%
Pool: ${stats.poolName||"N/A"} · ${stats.poolPosition ? ordinal(stats.poolPosition)+" of "+stats.poolSize : "N/A"}
Hole diff: ${stats.holeDiff>=0?"+":""}${stats.holeDiff} | Best streak: ${stats.bestStreak} wins
${stats.bestMatch ? `Best: vs ${fmt(stats.bestMatch.opp)}, won ${stats.bestMatch.myHoles}–${stats.bestMatch.theirHoles} (${stats.bestMatch.diff} up)` : ""}
${stats.worstMatch ? `Toughest: vs ${fmt(stats.worstMatch.opp)}, lost ${stats.worstMatch.myHoles}–${stats.worstMatch.theirHoles}` : ""}
${stats.nemesis ? `Nemesis: ${fmt(stats.nemesis.name)} (${stats.nemesis.losses} losses)` : ""}
${stats.bestRival ? `Favourite win: ${fmt(stats.bestRival.name)} (${stats.bestRival.wins} wins)` : ""}

Write the recap:`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setRecap(data.content?.map(b => b.text||"").join("").trim()||"");
    } catch { setError("Failed to generate recap. Please try again."); }
    finally { setIsLoadingRecap(false); }
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
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
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
        .fade-in { animation: fadeIn 0.4s ease both; }
        .btn { transition: all 0.2s ease; cursor: pointer; }
        .btn:hover:not(:disabled) { transform: translateY(-1px); }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        select { appearance: none; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a1a0a 0%, #0d1f0d 40%, #0a120a 100%)",
        fontFamily: "'DM Sans', sans-serif", color: "white", paddingBottom: 60,
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(180deg, rgba(0,100,0,0.3) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "40px 24px 32px", textAlign: "center",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4ade80", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
            Timaru Disc Golf
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px,8vw,52px)",
            fontWeight: 800, letterSpacing: -2, lineHeight: 1.05,
            background: "linear-gradient(135deg, #fff 0%, #4ade80 60%, #86efac 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Season Recap</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 10 }}>{SEASON}</p>
          {dataSource === "demo" && (
            <div style={{
              display: "inline-block", marginTop: 16,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#fbbf24",
            }}>⚠ Demo mode — showing sample data</div>
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
                height: 52, borderRadius: 14,
                background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
              }} />
            ) : (
              <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} style={{
                width: "100%", padding: "14px 18px", borderRadius: 14,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                color: "white", fontSize: 16, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
              }}>
                <option value="" style={{ background: "#0d1f0d" }}>Choose a player...</option>
                {completedPlayers.map(p => (
                  <option key={p.name} value={p.name} style={{ background: "#0d1f0d" }}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="fade-in">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard label="Played" value={stats.played} />
                <StatCard label="Won" value={stats.wins} color="#4ade80" />
                <StatCard label="Lost" value={stats.losses} color="#f87171" />
                <StatCard label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "#4ade80" : "#fbbf24"} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                {stats.poolPosition && <StatCard label="Pool Finish" value={ordinal(stats.poolPosition)} color="#a78bfa" />}
                <StatCard label="Hole Diff" value={`${stats.holeDiff>=0?"+":""}${stats.holeDiff}`} color={stats.holeDiff>=0?"#4ade80":"#f87171"} />
                {stats.bestStreak > 1 && <StatCard label="Best Streak" value={`${stats.bestStreak}W`} color="#fbbf24" />}
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Highlights</div>
                <MatchHighlight label="Best Match" match={stats.bestMatch} color="#4ade80" />
                <MatchHighlight label="Toughest Match" match={stats.worstMatch} color="#f87171" />
                <MatchHighlight label="Closest Match" match={stats.closestMatch} color="#fbbf24" />
              </div>

              {(stats.nemesis || stats.bestRival) && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Rivalries</div>
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

              {stats.rivalries.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Head to Head</div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {stats.rivalries.map((r, i) => (
                      <div key={r.opp} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 16px",
                        borderBottom: i < stats.rivalries.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{fmt(r.opp)}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{r.wins}W</span>
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>–</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{r.losses}L</span>
                          {r.ties > 0 && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{r.ties}T</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate recap */}
              <button className="btn" onClick={generateRecap} disabled={isLoadingRecap} style={{
                width: "100%", padding: "16px 24px", borderRadius: 14,
                background: "linear-gradient(135deg, #166534, #15803d)",
                border: "1px solid rgba(74,222,128,0.3)", color: "white",
                fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
              }}>
                {isLoadingRecap ? "Writing recap..." : recap ? "✨ Regenerate Recap" : "✨ Generate My Season Recap"}
              </button>

              {error && (
                <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, fontSize: 13, color: "#f87171" }}>
                  {error}
                </div>
              )}

              {/* Recap text */}
              {(recap || isLoadingRecap) && (
                <div style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 20, padding: 24, marginTop: 20, position: "relative",
                }}>
                  <div style={{ position: "absolute", top: 16, right: 20, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5 }}>AI Recap</div>
                  {isLoadingRecap ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i*0.2}s` }} />
                        ))}
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Writing your recap...</span>
                    </div>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.8, fontSize: 15, margin: 0, fontStyle: "italic" }}>{recap}</p>
                  )}
                </div>
              )}

              {/* Share button — appears after recap is ready */}
              {recap && !isLoadingRecap && (
                <button className="btn" onClick={() => setShowShareModal(true)} style={{
                  width: "100%", marginTop: 12, padding: "16px 24px", borderRadius: 14,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "white", fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                  🎴 Create &amp; Share Season Card
                </button>
              )}
            </div>
          )}

          {!stats && !isLoadingData && selectedPlayer && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0" }}>
              No completed matches found for this player.
            </div>
          )}
        </div>
      </div>

      {showShareModal && stats && (
        <ShareModal stats={stats} recap={recap} onClose={() => setShowShareModal(false)} />
      )}
    </>
  );
}

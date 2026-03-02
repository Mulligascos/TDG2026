import { useState, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby1o9A_xc6Kd24K0yNiMkFnW7ZX2E0cEHFoUjaZ98Vu_eSTzgaM6HHVGNqOX62viRh2Mw/exec";
const SEASON = "Summer League 2026";

// ─── SAMPLE DATA ──────────────────────────────────────────────────────────────
const SAMPLE_DATA = {
  players: [
    { name: "Mark Cain", status: "Active" },
    { name: "Rick Stevens", status: "Active" },
    { name: "Emma Karl", status: "Active" },
    { name: "Dylan M", status: "Active" },
    { name: "Cody M", status: "Active" },
    { name: "Morgan B", status: "Active" },
  ],
  matches: [
    { player1: "Mark Cain", player2: "Emma Karl", winner: "Mark Cain", status: "Completed", scoresJson: Array(18).fill({ p1: 3, p2: 4, scored: true }) },
    { player1: "Dylan M", player2: "Mark Cain", winner: "Mark Cain", status: "Completed", scoresJson: Array(18).fill({ p1: 4, p2: 3, scored: true }) },
    { player1: "Mark Cain", player2: "Rick Stevens", winner: "Rick Stevens", status: "Completed", scoresJson: [...Array(9).fill({ p1: 3, p2: 4, scored: true }), ...Array(9).fill({ p1: 4, p2: 3, scored: true })] },
    { player1: "Cody M", player2: "Mark Cain", winner: "Mark Cain", status: "Completed", scoresJson: Array(18).fill({ p1: 3, p2: 4, scored: true }) },
    { player1: "Mark Cain", player2: "Morgan B", winner: "Morgan B", status: "Completed", scoresJson: Array(18).fill({ p1: 3, p2: 4, scored: true }) },
  ],
  standings: {
    "Pool A": [
      { name: "Mark Cain", points: 9, played: 5, win: 3, loss: 2 },
      { name: "Rick Stevens", points: 6, played: 5, win: 2, loss: 3 },
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
  if (!n) return "";
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
    totalHolesWon += myHoles;
    totalHolesLost += theirHoles;
    if (!headToHead[opp]) headToHead[opp] = { wins: 0, losses: 0, ties: 0 };
    if (m.winner === playerName) {
      wins++; tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); headToHead[opp].wins++;
    } else if (!m.winner || m.winner === "Tie") {
      ties++; tempStreak = 0; headToHead[opp].ties++;
    } else {
      losses++; tempStreak = 0; headToHead[opp].losses++;
    }
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
  const nemesis = Object.entries(headToHead)
    .filter(([, r]) => r.losses > r.wins)
    .sort(([, a], [, b]) => b.losses - a.losses)[0];
  const bestRival = Object.entries(headToHead)
    .filter(([, r]) => r.wins > r.losses)
    .sort(([, a], [, b]) => b.wins - a.wins)[0];

  return {
    name: playerName, played: myMatches.length, wins, losses, ties,
    totalHolesWon, totalHolesLost,
    holeDiff: totalHolesWon - totalHolesLost,
    winRate: Math.round((wins / myMatches.length) * 100),
    bestStreak, bestMatch, worstMatch, closestMatch,
    poolPosition, poolName, poolSize, rivalries,
    nemesis: nemesis ? { name: nemesis[0], ...nemesis[1] } : null,
    bestRival: bestRival ? { name: bestRival[0], ...bestRival[1] } : null,
  };
};

// ─── SHARE CARD ───────────────────────────────────────────────────────────────
// Rendered off-screen, captured by html2canvas
const ShareCard = ({ stats, cardRef }) => {
  const diff = stats.holeDiff;
  const winPct = stats.winRate;

  const Stat = ({ label, val, color }) => (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", flex: 1 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "white", lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>{label}</div>
    </div>
  );

  const Highlight = ({ emoji, label, color, line1, line2 }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 16, lineHeight: 1.4 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{line1}</div>
        {line2 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{line2}</div>}
      </div>
    </div>
  );

  return (
    <div ref={cardRef} style={{
      width: 400,
      background: "linear-gradient(145deg, #071407 0%, #0c2210 50%, #071407 100%)",
      fontFamily: "'Syne', sans-serif",
      borderRadius: 20,
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #15803d, #4ade80, #fbbf24, #4ade80, #15803d)" }} />

      {/* Header */}
      <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#4ade80", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
            🥏 Timaru Disc Golf · {SEASON}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "white", letterSpacing: -1, lineHeight: 1 }}>
            {fmtFull(stats.name)}
          </div>
          {stats.poolName && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              {stats.poolName} · {ordinal(stats.poolPosition)} of {stats.poolSize}
            </div>
          )}
        </div>
        {/* Win rate circle */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          border: `3px solid ${winPct >= 50 ? "rgba(74,222,128,0.4)" : "rgba(251,191,36,0.4)"}`,
          background: winPct >= 50 ? "rgba(74,222,128,0.07)" : "rgba(251,191,36,0.07)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: winPct >= 50 ? "#4ade80" : "#fbbf24", lineHeight: 1 }}>{winPct}%</div>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>Win Rate</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: "0 24px 16px", display: "flex", gap: 8 }}>
        <Stat label="Played" val={stats.played} />
        <Stat label="Won" val={stats.wins} color="#4ade80" />
        <Stat label="Lost" val={stats.losses} color="#f87171" />
        <Stat label="Hole +/-" val={`${diff >= 0 ? "+" : ""}${diff}`} color={diff >= 0 ? "#4ade80" : "#f87171"} />
        {stats.bestStreak > 1 && <Stat label="Streak" val={`${stats.bestStreak}W`} color="#fbbf24" />}
      </div>

      <div style={{ margin: "0 24px", height: 1, background: "rgba(255,255,255,0.07)" }} />

      {/* Highlights */}
      <div style={{ padding: "14px 24px" }}>
        {stats.bestMatch && (
          <Highlight emoji="🏆" label="Best Win" color="#4ade80"
            line1={`vs ${fmt(stats.bestMatch.opp)} — ${stats.bestMatch.myHoles}–${stats.bestMatch.theirHoles} holes`}
            line2={`Won ${stats.bestMatch.diff} up`} />
        )}
        {stats.worstMatch && (
          <Highlight emoji="💪" label="Toughest Match" color="#f87171"
            line1={`vs ${fmt(stats.worstMatch.opp)} — ${stats.worstMatch.myHoles}–${stats.worstMatch.theirHoles} holes`}
            line2={`Lost ${Math.abs(stats.worstMatch.diff)} down`} />
        )}
        {stats.closestMatch && (
          <Highlight emoji="⚡" label="Closest Match" color="#fbbf24"
            line1={`vs ${fmt(stats.closestMatch.opp)} — ${stats.closestMatch.myHoles}–${stats.closestMatch.theirHoles} holes`}
            line2={Math.abs(stats.closestMatch.diff) === 0 ? "All square" : `${Math.abs(stats.closestMatch.diff)} hole margin`} />
        )}
      </div>

      {/* Rivalries */}
      {(stats.bestRival || stats.nemesis) && (
        <>
          <div style={{ margin: "0 24px", height: 1, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ padding: "14px 24px", display: "flex", gap: 10 }}>
            {stats.bestRival && (
              <div style={{ flex: 1, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 8, color: "#4ade80", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Favourite Win</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{fmt(stats.bestRival.name)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{stats.bestRival.wins}W – {stats.bestRival.losses}L</div>
              </div>
            )}
            {stats.nemesis && (
              <div style={{ flex: 1, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 8, color: "#f87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Nemesis</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{fmt(stats.nemesis.name)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{stats.nemesis.wins}W – {stats.nemesis.losses}L</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Head to head — top 5 */}
      {stats.rivalries.length > 0 && (
        <>
          <div style={{ margin: "0 24px", height: 1, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ padding: "12px 24px" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Head to Head</div>
            {stats.rivalries.slice(0, 5).map((r) => (
              <div key={r.opp} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }}>{fmt(r.opp)}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>{r.wins}W</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>–</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>{r.losses}L</span>
                  {r.ties > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{r.ties}T</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{
        padding: "10px 24px", marginTop: 4,
        background: "rgba(0,0,0,0.3)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>tdg-2026.vercel.app/recap</div>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>🥏 timarudiscgolf.co.nz</div>
      </div>
    </div>
  );
};

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
const ShareModal = ({ stats, onClose }) => {
  const cardRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [capturing, setCapturing] = useState(true);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    const capture = async () => {
      await new Promise(r => setTimeout(r, 400)); // wait for fonts
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

  const handleShare = async () => {
    if (!imageUrl) return;
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const file = new File([blob], `${fmtFull(stats.name).replace(/\s+/g, "-")}-TDG-2026.png`, { type: "image/png" });
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
    a.download = `${fmtFull(stats.name).replace(/\s+/g, "-")}-TDG-recap-2026.png`;
    a.click();
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText("https://tdg-2026.vercel.app/recap");
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, backdropFilter: "blur(10px)",
    }}>
      <div style={{
        background: "#0a1a0a", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24, padding: 28, maxWidth: 460, width: "100%",
        maxHeight: "90vh", overflowY: "auto", fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "white", margin: 0 }}>Share Your Card</h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Save or share your season recap card</p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.7)",
            width: 36, height: 36, borderRadius: "50%", cursor: "pointer",
            fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 20, minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {capturing ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#4ade80",
                    animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 13 }}>Generating card...</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt="Season card" style={{ width: "100%", borderRadius: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }} />
          ) : (
            <p style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>Failed to generate card — try again.</p>
          )}
        </div>

        {/* Hidden card for capture */}
        <div style={{ position: "fixed", left: -9999, top: -9999, pointerEvents: "none" }}>
          <ShareCard stats={stats} cardRef={cardRef} />
        </div>

        {/* Buttons */}
        {imageUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={handleShare} style={{
              width: "100%", padding: "14px", borderRadius: 14,
              background: "linear-gradient(135deg, #166534, #15803d)",
              border: "1px solid rgba(74,222,128,0.3)", color: "white",
              fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {navigator.share ? "📤 Share Card" : "⬇️ Download Card"}
            </button>
            {navigator.share && (
              <button onClick={handleDownload} style={{
                width: "100%", padding: "12px", borderRadius: 14,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>⬇️ Save to device</button>
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
const StatBox = ({ label, value, color = "rgba(255,255,255,0.9)" }) => (
  <div style={{
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16, padding: "16px 20px", flex: "1 1 100px", minWidth: 90,
  }}>
    <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
  </div>
);

const HighlightRow = ({ label, match, color }) => {
  if (!match) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", borderLeft: `3px solid ${color}`,
      border: `1px solid ${color}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 8,
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataSource, setDataSource] = useState("sheet");
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
          id: r[0], player1: r[3], player2: r[4],
          scoresJson: r[7] ? JSON.parse(r[7]) : [],
          winner: r[8], status: r[9]||"scheduled",
        }));
        const parsedPools = (data.pools||[]).slice(1).map(r => ({
          pool: r[0], player: r[1], played: +r[2]||0, win: +r[3]||0, loss: +r[4]||0, points: +r[5]||0,
        }));
        const standingsMap = {};
        parsedPools.forEach(p => {
          if (!standingsMap[p.pool]) standingsMap[p.pool] = [];
          standingsMap[p.pool].push({ name: p.player, points: p.points, played: p.played, win: p.win, loss: p.loss });
        });
        Object.keys(standingsMap).forEach(k => standingsMap[k].sort((a, b) => b.points - a.points));
        setPlayers(parsedPlayers); setMatches(parsedMatches); setStandings(standingsMap); setDataSource("sheet");
      } catch {
        setPlayers(SAMPLE_DATA.players); setMatches(SAMPLE_DATA.matches);
        setStandings(SAMPLE_DATA.standings); setDataSource("demo");
      } finally { setIsLoadingData(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedPlayer) { setStats(null); return; }
    setStats(buildPlayerStats(selectedPlayer, matches, standings));
  }, [selectedPlayer, matches, standings]);

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
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        .fade-in { animation: fadeIn 0.35s ease both; }
        .btn { transition: all 0.2s ease; cursor: pointer; border: none; }
        .btn:hover { transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
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
          borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px 32px", textAlign: "center",
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
              {/* Row 1 */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <StatBox label="Played" value={stats.played} />
                <StatBox label="Won" value={stats.wins} color="#4ade80" />
                <StatBox label="Lost" value={stats.losses} color="#f87171" />
                <StatBox label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "#4ade80" : "#fbbf24"} />
              </div>

              {/* Row 2 */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                {stats.poolPosition && <StatBox label="Pool Finish" value={ordinal(stats.poolPosition)} color="#a78bfa" />}
                <StatBox label="Hole Diff" value={`${stats.holeDiff >= 0 ? "+" : ""}${stats.holeDiff}`} color={stats.holeDiff >= 0 ? "#4ade80" : "#f87171"} />
                {stats.bestStreak > 1 && <StatBox label="Best Streak" value={`${stats.bestStreak}W`} color="#fbbf24" />}
              </div>

              {/* Highlights */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Highlights</div>
                <HighlightRow label="Best Match" match={stats.bestMatch} color="#4ade80" />
                <HighlightRow label="Toughest Match" match={stats.worstMatch} color="#f87171" />
                <HighlightRow label="Closest Match" match={stats.closestMatch} color="#fbbf24" />
              </div>

              {/* Rivalries */}
              {(stats.nemesis || stats.bestRival) && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Rivalries</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {stats.bestRival && (
                      <div style={{ flex: 1, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Favourite Win</div>
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

              {/* Head to Head */}
              {stats.rivalries.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Head to Head</div>
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
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>–</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{r.losses}L</span>
                          {r.ties > 0 && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{r.ties}T</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share button */}
              <button className="btn" onClick={() => setShowShareModal(true)} style={{
                width: "100%", padding: "16px 24px", borderRadius: 14,
                background: "linear-gradient(135deg, #166534, #15803d)",
                border: "1px solid rgba(74,222,128,0.3)", color: "white",
                fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}>
                🎴 Create &amp; Share Season Card
              </button>
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
        <ShareModal stats={stats} onClose={() => setShowShareModal(false)} />
      )}
    </>
  );
}

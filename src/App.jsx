import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check, Moon, Sun } from 'lucide-react';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1o9A_xc6Kd24K0yNiMkFnW7ZX2E0cEHFoUjaZ98Vu_eSTzgaM6HHVGNqOX62viRh2Mw/exec';
const BRAND_PRIMARY = '#006400';
const BRAND_SECONDARY = '#FFD700';
const BRAND_ACCENT = '#228B22';
const ADMIN_USER = 'Mark Cain';
const SHIELD_DATE = '2026-03-01';
const SHIELD_VENUE = 'WEP';
const POOL_CUTOFF_DATE = '2026-02-28';

const ROUND_ROBIN_DRAW_8 = [
  [0, 7], [1, 6], [2, 5], [3, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
  [0, 5], [1, 7], [2, 4], [3, 6],
];

const ROUND_ROBIN_DRAW_7 = [
  [0, 6], [1, 5], [2, 4],
  [0, 3], [1, 4], [5, 6],
  [0, 2], [3, 6], [4, 5],
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatPlayerName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}`;
};

const isJuniorPlayer = (playerName) => playerName?.includes('(J)') ?? false;

const applyJuniorHandicap = (score, playerName) =>
  isJuniorPlayer(playerName) ? Math.max(1, score - 1) : score;

const triggerHaptic = (style = 'medium') => {
  if (!('vibrate' in navigator)) return;
  const patterns = { light: 10, medium: 20, heavy: 30, success: [10, 50, 10], error: [20, 100, 20] };
  navigator.vibrate(patterns[style] ?? patterns.medium);
};

const calculateMatchStats = (match) => {
  let p1Holes = 0, p2Holes = 0, lastHole = 0;
  match.scoresJson?.forEach((score, idx) => {
    if (!score.scored) return;
    lastHole = idx + 1;
    const p1 = applyJuniorHandicap(score.p1, match.player1);
    const p2 = applyJuniorHandicap(score.p2, match.player2);
    if (p1 < p2) p1Holes++;
    else if (p2 < p1) p2Holes++;
  });
  return { p1Holes, p2Holes, lastHole };
};

const formatTimeAgo = (date) => {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
};

const formatMatchTime = (startTime) => {
  if (!startTime || startTime.startsWith('1899')) return '';
  return new Date(startTime).toLocaleTimeString('en-NZ', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Pacific/Auckland'
  });
};

const postToSheet = (body) =>
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    mode: 'no-cors'
  });

// ============================================
// REUSABLE COMPONENTS
// ============================================

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-down">
      <div className={`${bgColor} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md`}>
        {type === 'success' && <Check size={20} />}
        {type === 'error' && <X size={20} />}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
};

const Header = ({ currentUser, onLogout, onChange, darkMode, setDarkMode, onRefresh, isLoading, isOnline, pendingUpdates, showTabs, activeTab, onTabChange }) => (
  <div className="text-white sticky top-0 z-10 shadow-lg" style={{ background: `linear-gradient(to bottom right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})` }}>
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
            <User size={20} />
          </div>
          <div>
            <p className="text-sm opacity-90">Signed in as</p>
            <p className="font-bold">{currentUser.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <button onClick={() => { triggerHaptic('light'); onRefresh(); }} disabled={isLoading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <span className={isLoading ? 'inline-block animate-spin' : ''}>🔄</span>
            </button>
          )}
          <button onClick={() => { triggerHaptic('light'); setDarkMode(!darkMode); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => { triggerHaptic('light'); onChange(); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <Edit size={20} />
          </button>
          <button onClick={() => { triggerHaptic('medium'); onLogout(); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {showTabs && (
        <div className="flex gap-2 mt-4">
          {['matches', 'standings', 'live'].map(tab => (
            <button key={tab} onClick={() => { triggerHaptic('light'); onTabChange(tab); }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold capitalize ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {!isOnline && (
        <div className="bg-white/10 px-3 py-2 rounded-lg text-sm flex items-center mt-4">
          <div className="w-2 h-2 bg-orange-300 rounded-full mr-2"></div>
          Offline • {pendingUpdates.length} pending updates
        </div>
      )}
    </div>
  </div>
);

const MatchCard = ({ match, onClick, showResult = false }) => (
  <div onClick={onClick} className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center text-sm text-gray-500">
        <Calendar size={14} className="mr-1" />
        <span>{new Date(match.date).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <Clock size={14} className="ml-3 mr-1" />
        <span>{formatMatchTime(match.startTime)}</span>
      </div>
      {!showResult && <ChevronRight className="text-blue-600" size={20} />}
    </div>
    <div>
      <p className="font-bold text-gray-900 text-lg mb-1">
        {formatPlayerName(match.player1)} <span className="text-gray-400 font-normal">vs</span> {formatPlayerName(match.player2)}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin size={14} className="mr-1" />
          {match.venue}
        </div>
        {showResult && match.winner && (
          <div className="flex items-center">
            <Check size={16} className="text-green-600 mr-1" />
            <span className="text-sm font-semibold text-green-600">{formatPlayerName(match.winner)} won</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const CollapsibleSection = ({ title, subtitle, isExpanded, onToggle, children, headerStyle = 'primary' }) => {
  const styles = {
    primary: { background: `linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})`, textColor: 'text-white' },
    secondary: { background: `linear-gradient(to right, ${BRAND_SECONDARY}, ${BRAND_PRIMARY})`, textColor: 'text-gray-900' },
    gray: { background: '#f3f4f6', textColor: 'text-gray-900' },
  };
  const s = styles[headerStyle] ?? styles.primary;
  const isGradient = s.background.includes('gradient');

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between"
        style={isGradient ? { background: s.background } : { backgroundColor: s.background }}>
        <div className="text-left">
          <h2 className={`text-lg font-bold ${s.textColor}`}>{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronRight size={20} className={`${s.textColor} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      {isExpanded && children}
    </div>
  );
};

// ============================================
// CUSTOM HOOKS
// ============================================

const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      * { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; }
      body.dark-mode { background-color: #111827; color: #f9fafb; }
      .dark-mode .bg-white { background-color: #1f2937 !important; }
      .dark-mode .bg-gray-50 { background-color: #111827 !important; }
      .dark-mode .bg-gray-100 { background-color: #374151 !important; }
      .dark-mode .text-gray-900 { color: #f9fafb !important; }
      .dark-mode .text-gray-700 { color: #d1d5db !important; }
      .dark-mode .text-gray-600 { color: #9ca3af !important; }
      .dark-mode .text-gray-500 { color: #6b7280 !important; }
      .dark-mode .border-gray-200 { border-color: #374151 !important; }
      .dark-mode .border-gray-100 { border-color: #1f2937 !important; }
      .dark-mode select, .dark-mode input, .dark-mode textarea { background-color: #374151 !important; color: #f9fafb !important; border-color: #4b5563 !important; }
      .dark-mode select option { background-color: #1f2937; color: #f9fafb; }
      .dark-mode input::placeholder { color: #9ca3af !important; }
      .dark-mode .bg-red-50 { background-color: rgba(153,27,27,0.2) !important; }
      .dark-mode .text-red-800 { color: #fca5a5 !important; }
      .dark-mode .bg-orange-50 { background-color: rgba(154,52,18,0.2) !important; }
      .dark-mode .text-orange-800 { color: #fdba74 !important; }
      .dark-mode .bg-blue-50 { background-color: rgba(30,58,138,0.3) !important; }
      .dark-mode .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.3) !important; }
      .dark-mode .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3) !important; }
      .dark-mode .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3) !important; }
      @keyframes slide-down {
        from { transform: translate(-50%, -100%); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .animate-slide-down { animation: slide-down 0.3s ease-out; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return [darkMode, setDarkMode];
};

const useAppData = () => {
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pools, setPools] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const loadSheetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
      if (!response.ok) throw new Error('Failed to load data');
      const data = await response.json();
      if (!data.players || !Array.isArray(data.players)) throw new Error('Invalid data structure');

      const playersData = data.players.slice(1).map(row => ({ id: row[0], name: row[1], pin: String(row[2]), status: row[3] || 'Active' }));
      const coursesData = data.courses.slice(1).map(row => ({ id: row[0], name: row[1], code: row[2], holes: parseInt(row[3]), pars: JSON.parse(row[4] || '{}') }));
      const matchesData = data.matches.slice(1).map(row => ({
        id: row[0], date: row[1], venue: row[2], player1: row[3], player2: row[4],
        startTime: row[5], endTime: row[6], scoresJson: row[7] ? JSON.parse(row[7]) : [],
        winner: row[8], status: row[9] || 'scheduled'
      }));
      const poolsData = data.pools.slice(1).map(row => ({
        pool: row[0], player: row[1], played: parseInt(row[2]) || 0,
        win: parseInt(row[3]) || 0, loss: parseInt(row[4]) || 0, points: parseInt(row[5]) || 0
      }));

      setPlayers(playersData); setCourses(coursesData); setMatches(matchesData); setPools(poolsData);
      localStorage.setItem('sheet-data', JSON.stringify({ players: playersData, courses: coursesData, matches: matchesData, pools: poolsData }));
    } catch (err) {
      console.error('Error loading sheet data:', err);
      try {
        const stored = localStorage.getItem('sheet-data');
        if (stored) {
          const data = JSON.parse(stored);
          setPlayers(data.players || []); setCourses(data.courses || []);
          setMatches(data.matches || []); setPools(data.pools || []);
        }
      } catch (e) { console.error('Unable to load cached data'); }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline) loadSheetData();
  }, [isOnline, loadSheetData]);

  const submitMatchToSheet = useCallback(async (matchId, finalScores, winner) => {
    if (!isOnline) {
      const updates = [...pendingUpdates, { matchId, scores: finalScores, winner }];
      setPendingUpdates(updates);
      localStorage.setItem('pending-updates', JSON.stringify(updates));
      return;
    }
    try {
      const updatedMatches = matches.map(m =>
        m.id === matchId ? { ...m, scoresJson: finalScores, winner, status: 'Completed' } : m
      );
      setMatches(updatedMatches);
      localStorage.setItem('sheet-data', JSON.stringify({ players, courses, matches: updatedMatches, pools }));
      await postToSheet({ action: 'submitMatch', matchId, scores: finalScores, winner, status: 'Completed' });
    } catch (err) {
      console.error('Error submitting match:', err);
    }
  }, [isOnline, matches, pools, players, courses, pendingUpdates]);

  return { players, setPlayers, courses, matches, setMatches, pools, isOnline, pendingUpdates, submitMatchToSheet, loadSheetData, isLoading };
};

// ============================================
// STANDINGS HOOKS
// ============================================

const useStandingsCalculations = (pools, players, matches) => {
  const calculateStandings = useCallback((poolName) => {
    const poolPlayers = pools.filter(p => p.pool === poolName);

    const standings = poolPlayers.map(player => {
      const playerData = players.find(p => p.name === player.player);
      const status = playerData?.status || 'Active';

      const poolMatches = matches.filter(m =>
        m.status === 'Completed' &&
        m.date <= POOL_CUTOFF_DATE &&
        (m.player1 === player.player || m.player2 === player.player)
      );

      let holesWon = 0, holesLost = 0, matchWins = 0, matchLosses = 0, matchTies = 0;

      poolMatches.forEach(match => {
        const isP1 = match.player1 === player.player;
        let p1h = 0, p2h = 0;
        match.scoresJson?.forEach(score => {
          if (!score.scored) return;
          const p1 = applyJuniorHandicap(score.p1, match.player1);
          const p2 = applyJuniorHandicap(score.p2, match.player2);
          if (p1 < p2) p1h++;
          else if (p2 < p1) p2h++;
        });
        if (isP1) { holesWon += p1h; holesLost += p2h; } else { holesWon += p2h; holesLost += p1h; }
        if (match.winner === player.player) matchWins++;
        else if (match.winner && match.winner !== player.player) matchLosses++;
        else matchTies++;
      });

      return {
        name: player.player, status,
        points: matchWins * 3 + matchTies,
        holesWon, holesLost, holeDiff: holesWon - holesLost,
        played: poolMatches.length, win: matchWins, loss: matchLosses
      };
    });

    const sortFn = (a, b) => b.points !== a.points ? b.points - a.points : b.holeDiff - a.holeDiff;
    const active = standings.filter(s => s.status === 'Active').sort(sortFn);
    const inactive = standings.filter(s => s.status !== 'Active').sort(sortFn);
    return [...active, ...inactive];
  }, [pools, players, matches]);

  const getPoolNames = useCallback(() =>
    [...new Set(pools.map(p => p.pool))].sort(),
    [pools]
  );

  return { calculateStandings, getPoolNames };
};

const useCrossoverMatches = (pools, players, matches) => {
  return useMemo(() => {
    const allPools = [...new Set(pools.map(p => p.pool))]
      .filter(p => !['cup', 'shield', 'plate', 'crossover'].some(x => p.toLowerCase().includes(x)))
      .sort();

    if (allPools.length < 4) return { week1: [], week2: [] };

    const getActivePlayers = (poolName) =>
      pools.filter(p => p.pool === poolName)
        .map(p => ({ name: p.player, status: players.find(pl => pl.name === p.player)?.status || 'Active' }))
        .filter(p => p.status === 'Active');

    const [poolA, poolB, poolC, poolD] = allPools.slice(0, 4).map(getActivePlayers);

    const createMatch = (pool1, pos1, pool2, pos2, n1, n2) => {
      const player1 = pool1[pos1 - 1]?.name || `${n1}${pos1}`;
      const player2 = pool2[pos2 - 1]?.name || `${n2}${pos2}`;
      const match = matches.find(m =>
        (m.player1 === player1 && m.player2 === player2) ||
        (m.player1 === player2 && m.player2 === player1)
      );
      return { player1, player2, winner: match?.winner, status: match?.status, label: `${n1}${pos1} v ${n2}${pos2}` };
    };

    const week1 = [
      createMatch(poolA, 1, poolB, 3, 'A', 'B'), createMatch(poolA, 2, poolB, 2, 'A', 'B'), createMatch(poolA, 3, poolB, 1, 'A', 'B'),
      createMatch(poolC, 1, poolD, 3, 'C', 'D'), createMatch(poolC, 2, poolD, 2, 'C', 'D'), createMatch(poolC, 3, poolD, 1, 'C', 'D'),
      createMatch(poolA, 4, poolB, 6, 'A', 'B'), createMatch(poolA, 5, poolB, 5, 'A', 'B'), createMatch(poolA, 6, poolB, 4, 'A', 'B'),
      createMatch(poolC, 4, poolD, 6, 'C', 'D'), createMatch(poolC, 5, poolD, 5, 'C', 'D'), createMatch(poolC, 6, poolD, 4, 'C', 'D'),
      createMatch(poolA, 7, poolB, 7, 'A', 'B'), createMatch(poolC, 7, poolD, 7, 'C', 'D'),
    ];

    const week2 = [
      createMatch(poolA, 1, poolC, 3, 'A', 'C'), createMatch(poolA, 2, poolC, 2, 'A', 'C'), createMatch(poolA, 3, poolC, 1, 'A', 'C'),
      createMatch(poolB, 1, poolD, 3, 'B', 'D'), createMatch(poolB, 2, poolD, 2, 'B', 'D'), createMatch(poolB, 3, poolD, 1, 'B', 'D'),
      createMatch(poolA, 4, poolC, 6, 'A', 'C'), createMatch(poolA, 5, poolC, 5, 'A', 'C'), createMatch(poolA, 6, poolC, 4, 'A', 'C'),
      createMatch(poolB, 4, poolD, 6, 'B', 'D'), createMatch(poolB, 5, poolD, 5, 'B', 'D'), createMatch(poolB, 6, poolD, 4, 'B', 'D'),
      createMatch(poolA, 7, poolC, 7, 'A', 'C'), createMatch(poolB, 7, poolD, 7, 'B', 'D'),
    ];

    return { week1, week2 };
  }, [pools, players, matches]);
};

// ============================================
// CUP BRACKET
// ============================================

const generatePlayoffBrackets = (pools, players, matches, calculateStandings) => {
  const poolNames = [...new Set(pools.map(p => p.pool))]
    .filter(p => !['cup', 'shield', 'plate'].some(x => p.toLowerCase().includes(x)))
    .sort();

  const poolStandings = Object.fromEntries(
    poolNames.map(n => [n, calculateStandings(n).filter(s => s.status === 'Active')])
  );

  const findMatch = (p1, p2) => matches.find(m =>
    m.id?.endsWith('C') &&
    ((m.player1 === p1 && m.player2 === p2) || (m.player1 === p2 && m.player2 === p1))
  );

  const matchCard = (p1, p2, label) => {
    const m = findMatch(p1, p2);
    return { player1: p1, player2: p2, winner: m?.winner || null, status: m?.status, label };
  };

  const r12 = poolNames.map(pool => {
    const s = poolStandings[pool];
    return matchCard(s[1]?.name || `${pool}2`, s[2]?.name || `${pool}3`, `${pool}2 v ${pool}3`);
  });

  const qf = poolNames.map((pool, idx) => {
    const s = poolStandings[pool];
    const r12Winner = r12[idx].winner || `Winner ${pool}R12`;
    return matchCard(s[0]?.name || `${pool}1`, r12Winner, `${pool}1 v Winner ${pool}R12`);
  });

  const sf = [[0, 3], [1, 2]].map(([i, j]) =>
    matchCard(qf[i].winner || `Winner ${poolNames[i]}QF`, qf[j].winner || `Winner ${poolNames[j]}QF`, `${poolNames[i]} v ${poolNames[j]}`)
  );

  const final = matchCard(sf[0].winner || 'Winner SF1', sf[1].winner || 'Winner SF2', 'Cup Final');

  return { r12, qf, sf, final, hasMatches: r12.length > 0 };
};

const generateCupMatchList = (round, bracket) => {
  if (round === 'qf') return bracket.qf.filter(m => !m.player1.includes('Winner') && !m.player2.includes('Winner'))
    .map((m, i) => ({ id: `cup-qf-${i + 1}`, date: SHIELD_DATE, venue: SHIELD_VENUE, player1: m.player1, player2: m.player2 }));
  if (round === 'sf') return bracket.sf.filter(m => !m.player1.includes('Winner') && !m.player2.includes('Winner'))
    .map((m, i) => ({ id: `cup-sf-${i + 1}`, date: SHIELD_DATE, venue: SHIELD_VENUE, player1: m.player1, player2: m.player2 }));
  if (round === 'final' && !bracket.final.player1.includes('Winner') && !bracket.final.player2.includes('Winner'))
    return [{ id: 'cup-final', date: SHIELD_DATE, venue: SHIELD_VENUE, player1: bracket.final.player1, player2: bracket.final.player2 }];
  return [];
};

const CupBracket = ({ bracket, isAdmin, r12Complete, qfComplete, sfComplete, qfGenerated, sfGenerated, finalGenerated, qfReady, sfReady, finalReady, onGenerateQF, onGenerateSF, onGenerateFinal }) => {
  const [generating, setGenerating] = useState(null);
  const [confirmRound, setConfirmRound] = useState(null);

  const handleGenerate = async (round, fn) => {
    setGenerating(round);
    await fn();
    setGenerating(null);
    setConfirmRound(null);
  };

  const RoundCol = ({ matches, label }) => (
    <div className="flex-shrink-0 w-40">
      <div className="text-center font-bold text-xs text-gray-600 mb-3">{label}</div>
      <div className="space-y-2">
        {matches.map((m, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
            {m.label && <div className="text-center text-xs font-semibold text-gray-400 mb-1">{m.label}</div>}
            <div className={`font-semibold ${m.winner === m.player1 ? 'text-green-600' : 'text-gray-700'}`}>
              {m.player1.includes('Winner') ? m.player1 : formatPlayerName(m.player1)}
            </div>
            <div className="text-gray-400 text-center my-0.5">vs</div>
            <div className={`font-semibold ${m.winner === m.player2 ? 'text-green-600' : 'text-gray-700'}`}>
              {m.player2.includes('Winner') ? m.player2 : formatPlayerName(m.player2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AdminBtn = ({ show, generated, ready, label, round }) => {
    if (!isAdmin || !show) return null;
    if (generated) return <div className="text-center text-xs text-green-600 font-semibold mt-2">✓ {label} generated</div>;
    if (!ready) return <div className="text-center text-xs text-gray-400 mt-2">Waiting for previous round</div>;
    return (
      <button onClick={() => setConfirmRound(round)} className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: BRAND_PRIMARY }}>
        ⚙ Generate {label}
      </button>
    );
  };

  const confirmLabels = {
    qf: { label: 'Cup QF', matches: bracket.qf },
    sf: { label: 'Cup SF', matches: bracket.sf },
    final: { label: 'Cup Final', matches: [bracket.final] },
  };

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          <RoundCol matches={bracket.r12} label="R12" />
          <RoundCol matches={bracket.qf} label="QF" />
          <RoundCol matches={bracket.sf} label="SF" />
          <div className="flex-shrink-0 w-40">
            <div className="text-center font-bold text-xs text-gray-600 mb-3">Final</div>
            <div className="rounded-lg p-3 text-xs border-2" style={{ borderColor: BRAND_SECONDARY, backgroundColor: `${BRAND_SECONDARY}10` }}>
              <div className={`font-bold ${bracket.final.winner === bracket.final.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                {bracket.final.player1.includes('Winner') ? bracket.final.player1 : formatPlayerName(bracket.final.player1)}
              </div>
              <div className="text-gray-400 text-center my-1">vs</div>
              <div className={`font-bold ${bracket.final.winner === bracket.final.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                {bracket.final.player2.includes('Winner') ? bracket.final.player2 : formatPlayerName(bracket.final.player2)}
              </div>
              {bracket.final.winner && !bracket.final.winner.includes('Winner') && (
                <div className="mt-2 pt-2 border-t border-gray-300 text-center font-bold" style={{ color: BRAND_PRIMARY }}>
                  🏆 {formatPlayerName(bracket.final.winner)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 space-y-2">
          <AdminBtn show={r12Complete} generated={qfGenerated} ready={qfReady} label="Cup QF" round="qf" />
          <AdminBtn show={qfComplete} generated={sfGenerated} ready={sfReady} label="Cup SF" round="sf" />
          <AdminBtn show={sfComplete} generated={finalGenerated} ready={finalReady} label="Cup Final" round="final" />
        </div>
      )}

      {confirmRound && confirmLabels[confirmRound] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Generate {confirmLabels[confirmRound].label}</h3>
            <p className="text-xs text-gray-500 mb-4">Date: 1 March 2026 • Venue: WEP</p>
            <div className="space-y-1 mb-6">
              {confirmLabels[confirmRound].matches.map((m, idx) => (
                <div key={idx} className="text-xs bg-gray-50 rounded-lg px-3 py-2 font-semibold text-gray-700">
                  {m.player1.includes('Winner') ? m.player1 : formatPlayerName(m.player1)} vs {m.player2.includes('Winner') ? m.player2 : formatPlayerName(m.player2)}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRound(null)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">Cancel</button>
              <button
                onClick={() => handleGenerate(confirmRound, confirmRound === 'qf' ? onGenerateQF : confirmRound === 'sf' ? onGenerateSF : onGenerateFinal)}
                disabled={generating === confirmRound}
                className="flex-1 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ backgroundColor: BRAND_PRIMARY }}>
                {generating === confirmRound ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STANDINGS COMPONENTS
// ============================================

const StandingsTable = ({ standings, currentUser }) => (
  <table className="w-full">
    <thead>
      <tr className="border-b-2 border-gray-200">
        {['#', 'Player', 'P', 'W', 'L', '+/-', 'Pts'].map(h => (
          <th key={h} className={`py-2 font-semibold text-gray-700 text-xs ${h === '#' || h === 'Player' ? 'text-left pr-2' : 'text-center px-1'} ${h === 'Pts' ? 'pl-2' : ''}`}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {standings.map((s, idx) => (
        <tr key={s.name} className={`border-b border-gray-100 ${s.name === currentUser.name ? 'bg-green-50' : ''} ${s.status === 'Inactive' ? 'opacity-50' : ''}`}>
          <td className="py-3 pr-2 text-gray-600 font-semibold text-xs">{idx + 1}</td>
          <td className="py-3 pr-2 font-semibold text-gray-900 text-xs">
            {formatPlayerName(s.name)}{s.status === 'Inactive' && <span className="ml-1 text-orange-500">⚠️</span>}
          </td>
          <td className="py-3 px-1 text-center text-gray-700 text-xs">{s.played}</td>
          <td className="py-3 px-1 text-center text-gray-700 text-xs">{s.win}</td>
          <td className="py-3 px-1 text-center text-gray-700 text-xs">{s.loss}</td>
          <td className={`py-3 px-1 text-center font-bold text-xs ${s.holeDiff > 0 ? 'text-green-600' : s.holeDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {s.holeDiff > 0 ? '+' : ''}{s.holeDiff}
          </td>
          <td className="py-3 pl-2 text-center text-gray-900 font-bold text-sm">{s.points}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const CrossoverMatchCard = ({ match }) => (
  <div className="bg-white rounded-lg p-2 text-xs border border-gray-200">
    <div className="text-center text-xs font-semibold text-gray-500 mb-1">{match.label}</div>
    <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>{formatPlayerName(match.player1)}</div>
    <div className="text-gray-400 text-center my-0.5">vs</div>
    <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>{formatPlayerName(match.player2)}</div>
    {match.status === 'Completed' && <div className="text-center mt-1 text-xs text-green-600">✓</div>}
  </div>
);

// ============================================
// SHIELD TOURNAMENT
// ============================================

const useShieldTournament = (pools, players, matches, cupPlayerNames) => {
  // Seeded players derived from pool standings, excluding cup qualifiers
  const seededPlayers = useMemo(() => {
    const poolNames = [...new Set(pools.map(p => p.pool))]
      .filter(p => !['cup', 'shield', 'plate'].some(x => p.toLowerCase().includes(x)))
      .sort();

    const seen = new Set();
    return poolNames.flatMap(poolName =>
      pools.filter(p => p.pool === poolName).map(player => {
        const status = players.find(p => p.name === player.player)?.status || 'Active';
        if (status !== 'Active') return null;

        const poolMatches = matches.filter(m =>
          m.status === 'Completed' &&
          !m.id?.endsWith('S') && !m.id?.endsWith('C') &&
          (m.player1 === player.player || m.player2 === player.player)
        );

        let holesWon = 0, holesLost = 0, matchWins = 0, matchTies = 0;
        poolMatches.forEach(m => {
          const isP1 = m.player1 === player.player;
          let p1h = 0, p2h = 0;
          m.scoresJson?.forEach(s => {
            if (!s.scored) return;
            if (s.p1 < s.p2) p1h++; else if (s.p2 < s.p1) p2h++;
          });
          if (isP1) { holesWon += p1h; holesLost += p2h; } else { holesWon += p2h; holesLost += p1h; }
          if (m.winner === player.player) matchWins++;
          else if (!m.winner || m.winner === 'Tie') matchTies++;
        });

        return { name: player.player, points: matchWins * 3 + matchTies, holeDiff: holesWon - holesLost };
      }).filter(Boolean)
    )
      .filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; })
      .filter(p => !cupPlayerNames.has(p.name))
      .sort((a, b) => b.points !== a.points ? b.points - a.points : b.holeDiff - a.holeDiff)
      .slice(0, 8);
  }, [pools, players, matches, cupPlayerNames]);

  // Read actual matches from sheet, don't try to reconstruct from draw
  const roundRobinMatches = useMemo(() => {
    return matches
      .filter(m => m.id?.startsWith('shield-r'))
      .map(m => {
        const round = parseInt(m.id.match(/shield-r(\d+)/)?.[1]) || 0;
        const matchNum = parseInt(m.id.match(/shield-r\d+-m(\d+)/)?.[1]) || 0;
        const p1Seed = seededPlayers.findIndex(p => p.name === m.player1) + 1;
        const p2Seed = seededPlayers.findIndex(p => p.name === m.player2) + 1;
        let p1Holes = 0, p2Holes = 0;
        m.scoresJson?.forEach(s => {
          if (!s.scored) return;
          if (s.p1 < s.p2) p1Holes++; else if (s.p2 < s.p1) p2Holes++;
        });
        return {
          id: m.id, round, matchNum,
          player1: m.player1, player2: m.player2,
          seed1: p1Seed || '?', seed2: p2Seed || '?',
          winner: m.winner || null, status: m.status || 'scheduled',
          p1Holes, p2Holes
        };
      })
      .sort((a, b) => a.round !== b.round ? a.round - b.round : a.matchNum - b.matchNum);
  }, [seededPlayers, matches]);

  const tournamentStandings = useMemo(() => {
    return seededPlayers.map(player => {
      let points = 0, holeDiff = 0, played = 0, wins = 0, losses = 0;
      roundRobinMatches
        .filter(m => m.player1 === player.name || m.player2 === player.name)
        .forEach(m => {
          if (!m.winner) return;
          played++;
          const isP1 = m.player1 === player.name;
          holeDiff += (isP1 ? m.p1Holes - m.p2Holes : m.p2Holes - m.p1Holes);
          if (m.winner === player.name) { points += 3; wins++; } else losses++;
        });
      return { name: player.name, points, holeDiff, played, wins, losses };
    }).sort((a, b) => b.points !== a.points ? b.points - a.points : b.holeDiff - a.holeDiff);
  }, [seededPlayers, roundRobinMatches]);

  const totalRRMatches = matches.filter(m => m.id?.startsWith('shield-r')).length;
  const allRoundsComplete = totalRRMatches > 0 && roundRobinMatches.length === totalRRMatches && roundRobinMatches.every(m => m.winner);

  const findFinalMatch = (p1, p2) => matches.find(m =>
    (m.id === 'shield-final' || m.id === 'shield-3rd') &&
    ((m.player1 === p1 && m.player2 === p2) || (m.player1 === p2 && m.player2 === p1))
  );

  const [f1, f2, t1, t2] = [0, 1, 2, 3].map(i => tournamentStandings[i]?.name || 'TBD');
  const shieldFinal = findFinalMatch(f1, f2) || { player1: f1, player2: f2, winner: null };
  const thirdPlaceFinal = findFinalMatch(t1, t2) || { player1: t1, player2: t2, winner: null };

  return { seededPlayers, roundRobinMatches, tournamentStandings, allRoundsComplete, shieldFinal, thirdPlaceFinal };
};

const ShieldTournament = ({ pools, players, matches, currentUser, cupPlayerNames }) => {
  const [expandedRound, setExpandedRound] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showFinalsModal, setShowFinalsModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isAdmin = currentUser?.name === ADMIN_USER;

  const { seededPlayers, roundRobinMatches, tournamentStandings, allRoundsComplete, shieldFinal, thirdPlaceFinal } =
    useShieldTournament(pools, players, matches, cupPlayerNames);

  const roundRobinAlreadyGenerated = matches.some(m => m.id?.startsWith('shield-r'));
  const finalsAlreadyGenerated = matches.some(m => m.id === 'shield-final' || m.id === 'shield-3rd');
  const hasAnyWinner = roundRobinMatches.some(m => m.winner);

  const generateRoundRobinMatchList = () => {
    const draw = seededPlayers.length >= 8 ? ROUND_ROBIN_DRAW_8 : ROUND_ROBIN_DRAW_7;
    return draw.map(([i, j], idx) => ({
      id: `shield-r${Math.floor(idx / 3) + 1}-m${(idx % 3) + 1}`,
      date: SHIELD_DATE, venue: SHIELD_VENUE,
      player1: seededPlayers[i]?.name, player2: seededPlayers[j]?.name,
    })).filter(m => m.player1 && m.player2);
  };

  const generateFinalsMatchList = () => {
    const [f1, f2, t1, t2] = [0, 1, 2, 3].map(i => tournamentStandings[i]?.name);
    return [
      f1 && f2 && { id: 'shield-final', date: SHIELD_DATE, venue: SHIELD_VENUE, player1: f1, player2: f2, label: '🛡️ Shield Final' },
      t1 && t2 && { id: 'shield-3rd', date: SHIELD_DATE, venue: SHIELD_VENUE, player1: t1, player2: t2, label: '🥉 3rd Place Playoff' },
    ].filter(Boolean);
  };

  const handleGenerateRoundRobin = async () => {
    setGenerating(true);
    try {
      await postToSheet({ action: 'createMatches', matches: generateRoundRobinMatchList() });
      triggerHaptic('success');
      setShowGenerateModal(false);
    } catch (err) { console.error(err); } finally { setGenerating(false); }
  };

  const handleGenerateFinals = async () => {
    setGenerating(true);
    try {
      await postToSheet({ action: 'createMatches', matches: generateFinalsMatchList() });
      triggerHaptic('success');
      setShowFinalsModal(false);
    } catch (err) { console.error(err); } finally { setGenerating(false); }
  };

  if (seededPlayers.length < 7) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        <p>Shield tournament requires at least 7 players.</p>
        <p className="text-xs mt-1">Currently {seededPlayers.length} eligible players.</p>
      </div>
    );
  }

  const rounds = [...new Set(roundRobinMatches.map(m => m.round))].sort();
  if (!roundRobinAlreadyGenerated) rounds.push(...[1, 2, 3].filter(r => !rounds.includes(r)));

  return (
    <div className="space-y-4 p-4">
      {/* Seeds */}
      <div className="bg-gray-50 rounded-xl p-3">
        <h4 className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wide">Seeds</h4>
        <div className="grid grid-cols-2 gap-1">
          {seededPlayers.map((p, idx) => (
            <div key={p.name} className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: BRAND_PRIMARY }}>{idx + 1}</span>
              <span className={`font-semibold ${p.name === currentUser?.name ? 'text-green-600' : 'text-gray-700'}`}>{formatPlayerName(p.name)}</span>
              <span className="text-gray-400">{p.points}pts</span>
            </div>
          ))}
        </div>
        {isAdmin && !roundRobinAlreadyGenerated && (
          <button onClick={() => setShowGenerateModal(true)} className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: BRAND_PRIMARY }}>
            ⚙ Generate All Round Robin Matches
          </button>
        )}
        {isAdmin && roundRobinAlreadyGenerated && <div className="mt-3 text-center text-xs text-green-600 font-semibold">✓ Round robin matches generated</div>}
      </div>

      {/* Rounds */}
      {[1, 2, 3].map(round => {
        const rMatches = roundRobinMatches.filter(m => m.round === round);
        const complete = rMatches.length > 0 && rMatches.every(m => m.winner);
        const expanded = expandedRound === round;
        return (
          <div key={round} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setExpandedRound(expanded ? null : round)} className="w-full px-4 py-3 flex items-center justify-between"
              style={{ background: `linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})` }}>
              <div className="text-left">
                <span className="font-bold text-white text-sm">Round {round}</span>
                {complete && <span className="ml-2 text-white/70 text-xs">✓ Complete</span>}
              </div>
              <span className={`text-white transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
            </button>
            {expanded && (
              <div className="p-3 space-y-2">
                {rMatches.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Matches not yet generated</p>
                ) : rMatches.map((m, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {[{ player: m.player1, seed: m.seed1, winner: m.winner === m.player1, holes: m.p1Holes },
                          { player: m.player2, seed: m.seed2, winner: m.winner === m.player2, holes: m.p2Holes }
                        ].map((p, i) => (
                          <div key={i}>
                            {i === 1 && <div className="text-center text-xs text-gray-400 my-0.5">vs</div>}
                            <div className={`text-sm font-semibold ${p.winner ? 'text-green-600' : 'text-gray-700'}`}>
                              <span className="text-gray-400 text-xs mr-1">S{p.seed}</span>
                              {formatPlayerName(p.player)}
                              {p.winner && <span className="ml-1 text-xs">✓</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {m.winner
                        ? <div className="text-right ml-3"><div className="text-lg font-bold text-gray-700">{m.p1Holes} – {m.p2Holes}</div><div className="text-xs text-gray-400">holes</div></div>
                        : <div className="text-xs text-gray-400 ml-3">Pending</div>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Shield Standings */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3" style={{ background: `linear-gradient(to right, ${BRAND_SECONDARY}, ${BRAND_PRIMARY})` }}>
          <h4 className="font-bold text-gray-900 text-sm">Shield Standings</h4>
        </div>
        <div className="p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {['#', 'Player', 'P', 'W', 'L', '+/-', 'Pts'].map(h => (
                  <th key={h} className={`py-2 font-semibold text-gray-600 ${h === '#' || h === 'Player' ? 'text-left pr-2' : 'text-center px-1'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tournamentStandings.map((s, idx) => (
                <tr key={s.name} className={`border-b border-gray-100 ${s.name === currentUser?.name ? 'bg-green-50' : ''}`}>
                  <td className="py-2 pr-2 text-gray-500 font-semibold">
                    {hasAnyWinner ? (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1) : idx + 1}
                  </td>
                  <td className="py-2 pr-2 font-semibold text-gray-900">{formatPlayerName(s.name)}</td>
                  <td className="py-2 px-1 text-center text-gray-700">{s.played}</td>
                  <td className="py-2 px-1 text-center text-gray-700">{s.wins}</td>
                  <td className="py-2 px-1 text-center text-gray-700">{s.losses}</td>
                  <td className={`py-2 px-1 text-center font-bold ${s.holeDiff > 0 ? 'text-green-600' : s.holeDiff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {s.holeDiff > 0 ? '+' : ''}{s.holeDiff}
                  </td>
                  <td className="py-2 pl-2 text-center font-bold text-gray-900 text-sm">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isAdmin && allRoundsComplete && !finalsAlreadyGenerated && tournamentStandings.length >= 4 && (
            <button onClick={() => setShowFinalsModal(true)} className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: BRAND_PRIMARY }}>
              ⚙ Generate Finals Matches
            </button>
          )}
          {isAdmin && finalsAlreadyGenerated && <div className="mt-3 text-center text-xs text-green-600 font-semibold">✓ Finals matches generated</div>}
        </div>
      </div>

      {/* Finals */}
      <div className="space-y-3">
        {[
          { match: thirdPlaceFinal, title: '🥉 3rd Place Playoff', border: false },
          { match: shieldFinal, title: '🛡️ Shield Final', border: true },
        ].map(({ match, title, border }) => (
          <div key={title} className={`rounded-xl shadow-sm overflow-hidden ${border ? 'border-2' : 'bg-white'}`}
            style={border ? { borderColor: BRAND_SECONDARY } : {}}>
            <div className={`px-4 py-2 border-b ${border ? '' : 'bg-gray-100 border-gray-200'}`}
              style={border ? { backgroundColor: `${BRAND_SECONDARY}20` } : {}}>
              <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
              {!hasAnyWinner && <p className="text-xs text-gray-400">Available after rounds begin</p>}
            </div>
            <div className="p-3 bg-white">
              {[{ name: match.player1, isWinner: match.winner === match.player1, emoji: border ? ' 🛡️' : ' 🥉' },
                { name: match.player2, isWinner: match.winner === match.player2, emoji: border ? ' 🛡️' : ' 🥉' }
              ].map((p, i) => (
                <div key={i}>
                  {i === 1 && <div className="text-xs text-gray-400 my-1 text-center">vs</div>}
                  <div className={`text-sm ${border ? 'font-bold' : 'font-semibold'} ${p.isWinner ? 'text-green-600' : 'text-gray-700'}`}>
                    {formatPlayerName(p.name)}{p.isWinner && p.emoji}
                  </div>
                </div>
              ))}
              {shieldFinal.winner && border && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-center font-bold text-sm" style={{ color: BRAND_PRIMARY }}>
                  🛡️ Champion: {formatPlayerName(shieldFinal.winner)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Generate RR Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Generate Round Robin Matches</h3>
            <p className="text-xs text-gray-500 mb-4">Date: 1 March 2026 • Venue: WEP</p>
            <div className="space-y-1 mb-6 max-h-64 overflow-y-auto">
              {generateRoundRobinMatchList().map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500 font-semibold w-20">R{m.id.match(/r(\d+)/)?.[1]} M{m.id.match(/m(\d+)/)?.[1]}</span>
                  <span className="text-gray-700 font-semibold">{formatPlayerName(m.player1)} vs {formatPlayerName(m.player2)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGenerateModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">Cancel</button>
              <button onClick={handleGenerateRoundRobin} disabled={generating} className="flex-1 text-white py-3 rounded-xl font-semibold disabled:opacity-50" style={{ backgroundColor: BRAND_PRIMARY }}>
                {generating ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Finals Modal */}
      {showFinalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Generate Finals Matches</h3>
            <p className="text-xs text-gray-500 mb-4">Date: 1 March 2026 • Venue: WEP</p>
            <div className="space-y-1 mb-6">
              {generateFinalsMatchList().map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500 font-semibold w-28">{m.label}</span>
                  <span className="text-gray-700 font-semibold">{formatPlayerName(m.player1)} vs {formatPlayerName(m.player2)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowFinalsModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">Cancel</button>
              <button onClick={handleGenerateFinals} disabled={generating} className="flex-1 text-white py-3 rounded-xl font-semibold disabled:opacity-50" style={{ backgroundColor: BRAND_PRIMARY }}>
                {generating ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// PAGE COMPONENTS
// ============================================

const LoginPage = ({ players, onLogin, error, darkMode, setDarkMode, isOnline }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(() => localStorage.getItem('lastLoggedInUser') || '');
  const [showTrustModal, setShowTrustModal] = useState(false);

  return (
    <div className="min-h-screen bg-white transition-colors">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="absolute top-4 right-4">
          <button onClick={() => { triggerHaptic('light'); setDarkMode(!darkMode); }} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="text-center mb-12 mt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg">
            <img src="/TDGcircle.GIF" alt="Timaru Disc Golf" className="w-36 h-36 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Timaru Disc Golf</h1>
          <p className="text-gray-500">Summer League 2026</p>
        </div>
        {!isOnline && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r">
            <p className="text-sm text-orange-800">You're offline. Data will sync when connected.</p>
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); onLogin(fd.get('player'), fd.get('pin')); }} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Player</label>
            <select name="player" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2"
              value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}>
              <option value="">Choose your name</option>
              {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PIN</label>
            <input type="tel" inputMode="numeric" name="pin" maxLength="4" pattern="[0-9]{4}" placeholder="Enter 4-digit PIN" required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2" />
          </div>
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r"><p className="text-sm text-red-800">{error}</p></div>}
          <button type="submit" onClick={() => triggerHaptic('medium')} className="w-full text-white py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
            style={{ backgroundColor: BRAND_PRIMARY, boxShadow: `0 10px 15px -3px ${BRAND_PRIMARY}30` }}
            onMouseEnter={e => (e.target.style.backgroundColor = BRAND_ACCENT)} onMouseLeave={e => (e.target.style.backgroundColor = BRAND_PRIMARY)}>
            Sign In
          </button>
          <button type="button" onClick={() => setShowTrustModal(true)} className="w-full text-gray-600 text-sm py-2 mt-2 hover:text-gray-900 transition-colors">
            About & Privacy Policy
          </button>
        </form>
        {showTrustModal && <TrustModal onClose={() => setShowTrustModal(false)} />}
      </div>
    </div>
  );
};

const TrustModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
        <h3 className="text-xl font-bold text-gray-900">About This App</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} className="text-gray-600" /></button>
      </div>
      <div className="p-6 space-y-6">
        {[
          { icon: 'ℹ️', title: 'About', text: 'Official score tracking for the Timaru Disc Golf Summer League 2026.' },
          { icon: '🔒', title: 'Privacy & Data', text: 'We collect only player names, PINs, match scores, and standings. Stored securely in Google Sheets, never shared with third parties.' },
          { icon: '🛡️', title: 'Security', text: 'Uses HTTPS and authenticated API access. PINs are used for login verification only.' },
          { icon: '📧', title: 'Contact', text: 'timarudiscgolf@gmail.com' },
        ].map(({ icon, title, text }) => (
          <div key={title}>
            <h4 className="font-bold text-gray-900 mb-2">{icon} {title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
          </div>
        ))}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">Timaru Disc Golf League App v1.0 • Summer League 2026</p>
        </div>
      </div>
      <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-3xl">
        <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Got it</button>
      </div>
    </div>
  </div>
);

const ChangePinPage = ({ currentUser, onBack, onPinChange, darkMode, setDarkMode }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePin = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) { setError('PIN must be 4 digits'); triggerHaptic('error'); return; }
    if (newPin !== confirmPin) { setError('PINs do not match'); triggerHaptic('error'); return; }
    setLoading(true); setError(''); triggerHaptic('medium');
    try {
      await postToSheet({ action: 'updatePin', playerId: currentUser.id, newPin });
      onPinChange(newPin);
    } catch (err) { setError('Failed to update PIN. Please try again.'); triggerHaptic('error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => { triggerHaptic('light'); onBack(); }} className="mr-4"><X size={24} className="text-gray-600" /></button>
            <h2 className="text-lg font-bold text-gray-900">Change PIN</h2>
          </div>
          <button onClick={() => { triggerHaptic('light'); setDarkMode(!darkMode); }} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {[{ label: 'New PIN', value: newPin, set: setNewPin }, { label: 'Confirm PIN', value: confirmPin, set: setConfirmPin }].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
              <input type="password" maxLength="4" placeholder="4 digits" value={value} onChange={e => set(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r"><p className="text-sm text-red-800">{error}</p></div>}
          <button onClick={handleChangePin} disabled={loading} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            {loading ? 'Updating...' : 'Update PIN'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MATCHES PAGE
// ============================================

const MatchesPage = ({ currentUser, matches, onLogout, onChangePin, onStartMatch, onReviewMatch, onViewStandings, darkMode, setDarkMode, isOnline, pendingUpdates, onRefresh, isLoading }) => {
  const [matchFilter, setMatchFilter] = useState('player');
  const [selectedFilterDate, setSelectedFilterDate] = useState('');
  const [selectedFilterPlayer, setSelectedFilterPlayer] = useState(currentUser.name);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [startingHole, setStartingHole] = useState(1);
  const [totalHoles, setTotalHoles] = useState(18);
  const [showLiveScores, setShowLiveScores] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeMatchData, setResumeMatchData] = useState(null);

  useEffect(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('match-progress-'));
    if (!keys.length) return;
    const progress = JSON.parse(localStorage.getItem(keys[keys.length - 1]));
    const match = matches.find(m => m.id === progress.matchId);
    if (match && (match.player1 === currentUser.name || match.player2 === currentUser.name)) {
      setResumeMatchData({ match, progress });
      setShowResumePrompt(true);
    }
  }, [matches, currentUser]);

  const userMatches = useMemo(() => matches.filter(m => m.player1 === currentUser.name || m.player2 === currentUser.name), [matches, currentUser.name]);
  const upcomingMatches = useMemo(() => userMatches.filter(m => m.status !== 'Completed'), [userMatches]);

  const completedMatches = useMemo(() => {
    let filtered = matches.filter(m => m.status === 'Completed');
    if (matchFilter === 'date' && selectedFilterDate) filtered = filtered.filter(m => m.date === selectedFilterDate);
    else if (matchFilter === 'player' && selectedFilterPlayer) filtered = filtered.filter(m => m.player1 === selectedFilterPlayer || m.player2 === selectedFilterPlayer);
    return filtered;
  }, [matches, matchFilter, selectedFilterDate, selectedFilterPlayer]);

  const uniqueDates = useMemo(() => [...new Set(matches.filter(m => m.status === 'Completed').map(m => m.date))].sort(), [matches]);
  const uniquePlayers = useMemo(() => [...new Set(matches.filter(m => m.status === 'Completed').flatMap(m => [m.player1, m.player2]))].sort(), [matches]);

  const handleStartMatch = useCallback((match) => { triggerHaptic('light'); setSelectedMatch(match); setShowStartModal(true); }, []);
  const confirmStart = useCallback(() => { triggerHaptic('medium'); onStartMatch(selectedMatch, startingHole, totalHoles); setShowStartModal(false); }, [selectedMatch, startingHole, totalHoles, onStartMatch]);

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <Header currentUser={currentUser} onLogout={onLogout} onChange={onChangePin} darkMode={darkMode} setDarkMode={setDarkMode}
        onRefresh={onRefresh} isLoading={isLoading} isOnline={isOnline} pendingUpdates={pendingUpdates}
        showTabs activeTab="matches" onTabChange={tab => { if (tab === 'standings') onViewStandings(); if (tab === 'live') setShowLiveScores(true); }} />

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Matches</h2>
          {upcomingMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trophy className="text-gray-400" size={28} /></div>
              <p className="text-gray-500">No upcoming matches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map(match => <MatchCard key={match.id} match={match} onClick={() => handleStartMatch(match)} />)}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Completed Matches</h2>
            <select value={matchFilter} onChange={e => { setMatchFilter(e.target.value); setSelectedFilterDate(''); setSelectedFilterPlayer(''); }}
              className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Matches</option>
              <option value="date">By Date</option>
              <option value="player">By Player</option>
            </select>
          </div>

          {matchFilter === 'date' && (
            <div className="mb-4">
              <select value={selectedFilterDate} onChange={e => setSelectedFilterDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a date</option>
                {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {matchFilter === 'player' && (
            <div className="mb-4">
              <select value={selectedFilterPlayer} onChange={e => setSelectedFilterPlayer(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a player</option>
                {uniquePlayers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {completedMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">{matchFilter !== 'all' ? 'No matches found for this filter' : 'No completed matches yet'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedMatches.map(match => <MatchCard key={match.id} match={match} onClick={() => { triggerHaptic('light'); onReviewMatch(match); }} showResult />)}
            </div>
          )}
        </div>
      </div>

      {/* Resume Prompt */}
      {showResumePrompt && resumeMatchData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Resume Match?</h3>
            <p className="text-gray-600 mb-4">
              <strong>{formatPlayerName(resumeMatchData.match.player1)}</strong> vs <strong>{formatPlayerName(resumeMatchData.match.player2)}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {resumeMatchData.progress.scores.filter(s => s.scored).length} of {resumeMatchData.progress.totalHoles || 18} holes completed
            </p>
            <div className="flex gap-3">
              <button onClick={() => { triggerHaptic('light'); localStorage.removeItem(`match-progress-${resumeMatchData.match.id}`); setShowResumePrompt(false); setResumeMatchData(null); }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors">Discard</button>
              <button onClick={() => { triggerHaptic('medium'); onStartMatch(resumeMatchData.match, resumeMatchData.progress.startingHole, resumeMatchData.progress.totalHoles || 18); setShowResumePrompt(false); }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Resume Match</button>
            </div>
          </div>
        </div>
      )}

      {/* Start Match Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Match Settings</h3>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Holes</label>
            <div className="flex gap-2 mb-4">
              {[9, 18].map(n => (
                <button key={n} onClick={() => { setTotalHoles(n); setStartingHole(1); }}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${totalHoles === n ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                  style={totalHoles === n ? { backgroundColor: BRAND_PRIMARY } : {}}>
                  {n} Holes
                </button>
              ))}
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Hole</label>
            <select value={startingHole} onChange={e => setStartingHole(Number(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: totalHoles }, (_, i) => i + 1).map(h => <option key={h} value={h}>Hole {h}</option>)}
            </select>

            <div className="flex gap-3">
              <button onClick={() => { triggerHaptic('light'); setShowStartModal(false); }} className="flex-1 bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-300 transition-colors">Cancel</button>
              <button onClick={confirmStart} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors">Start Match</button>
            </div>
          </div>
        </div>
      )}

      {showLiveScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <LiveScoresPage onBack={() => { triggerHaptic('light'); setShowLiveScores(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// STANDINGS PAGE
// ============================================

const StandingsPage = ({ currentUser, matches, pools, players, onLogout, onChangePin, onViewMatches, darkMode, setDarkMode, isOnline, pendingUpdates, onRefresh, isLoading }) => {
  const [expandedSections, setExpandedSections] = useState({ pools: true, crossover1: false, crossover2: false, cup: false, shield: false });
  const [showLiveScores, setShowLiveScores] = useState(false);

  const toggleSection = useCallback(section => { triggerHaptic('light'); setExpandedSections(prev => ({ ...prev, [section]: !prev[section] })); }, []);

  const { calculateStandings, getPoolNames } = useStandingsCalculations(pools, players, matches);
  const { week1, week2 } = useCrossoverMatches(pools, players, matches);

  const poolNames = useMemo(() =>
    getPoolNames().filter(p => !['cup', 'shield', 'plate'].some(x => p.toLowerCase().includes(x))),
    [getPoolNames]
  );

  // Compute cup player names once here and pass down — avoids duplicate calculation
  const cupPlayerNames = useMemo(() => {
    const set = new Set();
    poolNames.forEach(poolName => {
      calculateStandings(poolName).filter(s => s.status === 'Active').slice(0, 3).forEach(s => set.add(s.name));
    });
    return set;
  }, [poolNames, calculateStandings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentUser={currentUser} onLogout={onLogout} onChange={onChangePin} darkMode={darkMode} setDarkMode={setDarkMode}
        onRefresh={onRefresh} isLoading={isLoading} isOnline={isOnline} pendingUpdates={pendingUpdates}
        showTabs activeTab="standings" onTabChange={tab => { if (tab === 'matches') onViewMatches(); if (tab === 'live') setShowLiveScores(true); }} />

      <div className="max-w-md mx-auto px-4 py-6">
        {pools.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trophy className="text-gray-400" size={28} /></div>
            <p className="text-gray-500">No pools configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            <CollapsibleSection title="Pool Standings" isExpanded={expandedSections.pools} onToggle={() => toggleSection('pools')} headerStyle="primary">
              <div className="p-4 space-y-4">
                {poolNames.map(poolName => (
                  <div key={poolName} className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-gray-200"><h3 className="font-bold text-gray-900 text-sm">{poolName}</h3></div>
                    <div className="p-3"><StandingsTable standings={calculateStandings(poolName)} currentUser={currentUser} /></div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {[
              { key: 'crossover1', title: 'Crossover Week 1', subtitle: '15 February 7:00pm • A vs B, C vs D', data: week1 },
              { key: 'crossover2', title: 'Crossover Week 2', subtitle: '22 February 7:00pm • A vs C, B vs D', data: week2 },
            ].map(({ key, title, subtitle, data }) => (
              <CollapsibleSection key={key} title={title} subtitle={subtitle} isExpanded={expandedSections[key]} onToggle={() => toggleSection(key)} headerStyle="gray">
                <div className="p-4">
                  {data.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm p-6">Crossover matches will appear after pool play.</p>
                  ) : (
                    <div className="bg-gray-50 rounded-xl overflow-hidden" style={{ borderTop: '3px solid ' + BRAND_ACCENT }}>
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {data.map((match, idx) => <CrossoverMatchCard key={idx} match={match} />)}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            ))}

            <CollapsibleSection title="🏆 Cup Final" subtitle="Top 3 from each pool" isExpanded={expandedSections.cup} onToggle={() => toggleSection('cup')} headerStyle="secondary">
              {(() => {
                const bracket = generatePlayoffBrackets(pools, players, matches, calculateStandings);
                const isAdmin = currentUser?.name === ADMIN_USER;
                if (!bracket.hasMatches) return (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    <p>Pool play not complete yet.</p>
                    <p className="text-xs mt-2">Brackets will populate based on pool standings.</p>
                  </div>
                );
                const r12Complete = bracket.r12.every(m => m.winner);
                const qfComplete = bracket.qf.every(m => m.winner);
                const sfComplete = bracket.sf.every(m => m.winner);
                const qfGenerated = matches.some(m => m.id?.startsWith('cup-qf'));
                const sfGenerated = matches.some(m => m.id?.startsWith('cup-sf'));
                const finalGenerated = matches.some(m => m.id === 'cup-final');
                const noWinner = s => !s.includes('Winner');
                const qfReady = bracket.qf.every(m => noWinner(m.player1) && noWinner(m.player2));
                const sfReady = bracket.sf.every(m => noWinner(m.player1) && noWinner(m.player2));
                const finalReady = noWinner(bracket.final.player1) && noWinner(bracket.final.player2);

                const generateAndPost = async (round) => {
                  const list = generateCupMatchList(round, bracket);
                  await postToSheet({ action: 'createMatches', matches: list });
                  triggerHaptic('success');
                };

                return (
                  <CupBracket bracket={bracket} isAdmin={isAdmin}
                    r12Complete={r12Complete} qfComplete={qfComplete} sfComplete={sfComplete}
                    qfGenerated={qfGenerated} sfGenerated={sfGenerated} finalGenerated={finalGenerated}
                    qfReady={qfReady} sfReady={sfReady} finalReady={finalReady}
                    onGenerateQF={() => generateAndPost('qf')}
                    onGenerateSF={() => generateAndPost('sf')}
                    onGenerateFinal={() => generateAndPost('final')}
                  />
                );
              })()}
            </CollapsibleSection>

            <CollapsibleSection title="🛡️ Shield Tournament" subtitle="Round robin • Top 2 play final" isExpanded={expandedSections.shield} onToggle={() => toggleSection('shield')} headerStyle="gray">
              <ShieldTournament pools={pools} players={players} matches={matches} currentUser={currentUser} cupPlayerNames={cupPlayerNames} />
            </CollapsibleSection>
          </div>
        )}
      </div>

      {showLiveScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <LiveScoresPage onBack={() => { triggerHaptic('light'); setShowLiveScores(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// LIVE SCORES PAGE
// ============================================

const LiveScoresPage = ({ onBack }) => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLiveScores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getLiveScores`);
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setLiveMatches(data.matches.slice(1).map(row => ({
        id: row[0], date: row[1], venue: row[2], player1: row[3], player2: row[4],
        startTime: row[5], endTime: row[6], scoresJson: row[7] ? JSON.parse(row[7]) : [],
        winner: row[8], status: row[9] || 'scheduled'
      })));
      setLastUpdated(new Date());
    } catch (err) { console.error('Error loading live scores:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLiveScores(); }, [fetchLiveScores]);

  const inProgress = useMemo(() => liveMatches.filter(m => m.status === 'In-progress'), [liveMatches]);
  const completedToday = useMemo(() => {
    const today = new Date().toLocaleDateString('en-NZ', { day: '2-digit', month: 'long' });
    return liveMatches.filter(m => m.status === 'Completed' && m.date === today);
  }, [liveMatches]);

  const MatchRow = ({ match, showWinner }) => {
    const stats = calculateMatchStats(match);
    const p1Leading = stats.p1Holes > stats.p2Holes;
    const p2Leading = stats.p2Holes > stats.p1Holes;
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <span className={p1Leading && !showWinner ? 'font-bold text-green-600' : showWinner && match.winner === match.player1 ? 'font-bold text-green-600' : 'text-gray-900'}>
              {formatPlayerName(match.player1)} ({stats.p1Holes})
            </span>
            <span className="text-gray-400 mx-2">v</span>
            <span className={p2Leading && !showWinner ? 'font-bold text-green-600' : showWinner && match.winner === match.player2 ? 'font-bold text-green-600' : showWinner ? 'text-gray-600' : 'text-gray-900'}>
              {formatPlayerName(match.player2)} ({stats.p2Holes})
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          {showWinner
            ? <span className="text-green-600 font-semibold">{formatPlayerName(match.winner)} won</span>
            : <span className="text-gray-600">thru {stats.lastHole === 0 ? 'starting' : stats.lastHole > 18 ? `P${stats.lastHole - 18}` : stats.lastHole}</span>
          }
          <span className="text-gray-500 text-xs">{match.venue}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4"><X size={24} className="text-gray-600" /></button>
            <h2 className="text-lg font-bold text-gray-900">Live Scores</h2>
          </div>
          <button onClick={() => { triggerHaptic('light'); fetchLiveScores(); }} disabled={loading}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50">
            <div className={loading ? 'animate-spin' : ''}>🔄</div>
          </button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-6 text-center">Updated: {formatTimeAgo(lastUpdated)}</p>
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <h3 className="text-lg font-bold text-gray-900">In Progress ({inProgress.length})</h3>
          </div>
          {inProgress.length === 0
            ? <div className="bg-white rounded-2xl shadow-sm p-8 text-center"><p className="text-gray-500">No matches in progress</p></div>
            : <div className="space-y-3">{inProgress.map(m => <MatchRow key={m.id} match={m} showWinner={false} />)}</div>
          }
        </div>
        {completedToday.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <Check size={16} className="text-green-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">Completed Today ({completedToday.length})</h3>
            </div>
            <div className="space-y-3">{completedToday.map(m => <MatchRow key={m.id} match={m} showWinner />)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SCORING PAGE
// ============================================

const ScoringPage = ({ match, startingHole, courses, onCancel, onComplete, totalHoles = 18 }) => {
  const [scores, setScores] = useState([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [showLiveScores, setShowLiveScores] = useState(false);

  const course = useMemo(() => courses.find(c => c.name === match.venue || c.code === match.venue), [courses, match.venue]);

  useEffect(() => {
    const stored = localStorage.getItem(`match-progress-${match.id}`);
    if (stored) {
      const p = JSON.parse(stored);
      setScores(p.scores);
      setCurrentHole(p.currentHole);
    } else {
      const start = Number(startingHole);
      setScores(Array.from({ length: totalHoles }, (_, idx) => {
        const hole = ((start - 1 + idx) % 18) + 1;
        return { p1: course?.pars[hole] || 3, p2: course?.pars[hole] || 3, scored: false };
      }));
      setCurrentHole(0);
    }
  }, [match.id, startingHole, course, totalHoles]);

  useEffect(() => {
    if (match.status !== 'In-progress') postToSheet({ action: 'updateStatus', matchId: match.id, status: 'In-progress' });
  }, [match.id, match.status]);

  useEffect(() => {
    if (scores.length > 0) {
      localStorage.setItem(`match-progress-${match.id}`, JSON.stringify({ matchId: match.id, scores, currentHole, startingHole, totalHoles, timestamp: Date.now() }));
    }
  }, [scores, currentHole, match.id, startingHole, totalHoles]);

  const matchStatus = useCallback(() => {
    let p1Holes = 0, p2Holes = 0, holesPlayed = 0;
    scores.forEach(score => {
      if (!score.scored) return;
      holesPlayed++;
      const p1 = applyJuniorHandicap(score.p1, match.player1);
      const p2 = applyJuniorHandicap(score.p2, match.player2);
      if (p1 < p2) p1Holes++; else if (p2 < p1) p2Holes++;
    });
    const lead = Math.abs(p1Holes - p2Holes);
    const leader = p1Holes > p2Holes ? match.player1 : p2Holes > p1Holes ? match.player2 : null;
    const holesRemaining = Math.max(0, scores.length - holesPlayed);
    return {
      p1Holes, p2Holes, holesPlayed, lead, leader,
      isComplete: (holesPlayed >= totalHoles && leader !== null) || (lead > holesRemaining && holesPlayed > 0),
      needsPlayoff: holesPlayed >= totalHoles && p1Holes === p2Holes
    };
  }, [scores, match.player1, match.player2, totalHoles]);

  const recordScore = useCallback(() => {
    if (!scores[currentHole]?.p1 || !scores[currentHole]?.p2) return;
    triggerHaptic('medium');
    const newScores = scores.map((s, i) => i === currentHole ? { ...s, scored: true } : s);
    setScores(newScores);
    postToSheet({ action: 'updateProgress', matchId: match.id, scores: newScores }).catch(console.error);
    if (currentHole < scores.length - 1) setCurrentHole(h => h + 1);
  }, [scores, currentHole, match.id]);

  const updateScore = useCallback((player, delta) => {
    triggerHaptic('light');
    setScores(prev => prev.map((s, i) => i === currentHole ? { ...s, [player]: Math.max(1, (s[player] || 0) + delta) } : s));
  }, [currentHole]);

  const vsPar = useCallback((player) => {
    let score = 0, par = 0;
    scores.forEach((s, idx) => {
      if (!s.scored) return;
      score += s[player];
      const hole = idx < totalHoles ? ((Number(startingHole) - 1 + idx) % 18) + 1 : 1;
      par += course?.pars[hole] || 3;
    });
    const d = score - par;
    return d === 0 ? 'E' : d > 0 ? `+${d}` : String(d);
  }, [scores, startingHole, course, totalHoles]);

  const status = useMemo(() => matchStatus(), [matchStatus]);
  const actualHole = currentHole < totalHoles ? ((Number(startingHole) - 1 + currentHole) % 18) + 1 : currentHole - (totalHoles - 1);
  const par = currentHole < totalHoles && course ? course.pars[actualHole] : 3;
  const p1Name = formatPlayerName(match.player1);
  const p2Name = formatPlayerName(match.player2);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={onCancel} className="text-blue-600 font-medium text-sm">← Cancel Match</button>
        <button onClick={() => { triggerHaptic('light'); setShowLiveScores(true); }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm">
          📊 Live Scores
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-2">
        <div className="rounded-2xl shadow-sm p-4 mb-4" style={{ backgroundColor: BRAND_PRIMARY }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">
                {currentHole < totalHoles ? `Hole ${actualHole}` : `Playoff ${actualHole}`}
              </h3>
              <p className="text-white/60 text-xs">{status.holesPlayed} of {scores.length}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Par</p>
              <p className="text-2xl font-bold text-white">{par}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          {[{ name: p1Name, key: 'p1', fullName: match.player1, holes: status.p1Holes },
            { name: p2Name, key: 'p2', fullName: match.player2, holes: status.p2Holes }
          ].map(({ name, key, fullName, holes }) => (
            <div key={key} className="flex items-center justify-between mb-4 last:mb-0">
              <div className="font-bold text-gray-900 text-base w-20">
                {name}{isJuniorPlayer(fullName) && <span className="ml-1 text-xs text-blue-600">(J)</span>}
              </div>
              <button onClick={() => updateScore(key, -1)} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"><Minus size={18} /></button>
              <div className="text-4xl font-bold text-gray-900 w-16 text-center">{scores[currentHole]?.[key] || 0}</div>
              <button onClick={() => updateScore(key, 1)} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"><Plus size={18} /></button>
              <div className="text-2xl font-bold text-blue-600 w-12 text-center">{holes}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <button onClick={() => { triggerHaptic('light'); setCurrentHole(h => Math.max(0, h - 1)); }} disabled={currentHole === 0}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm">
            Previous
          </button>
          <button onClick={recordScore} disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm">
            Next Hole
          </button>
        </div>

        {status.isComplete ? (
          <button onClick={() => { if (!status.leader) return; triggerHaptic('success'); localStorage.removeItem(`match-progress-${match.id}`); onComplete(scores, status.leader); }}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors mb-3 text-sm">
            Submit Scorecard
          </button>
        ) : status.needsPlayoff ? (
          <button onClick={() => { triggerHaptic('medium'); const par = course?.pars[1] || 3; setScores(s => [...s, { p1: par, p2: par, scored: false }]); setCurrentHole(scores.length); }}
            className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-semibold hover:bg-orange-700 transition-colors mb-3 text-sm">
            Add Playoff Hole
          </button>
        ) : (
          <div className="w-full bg-gray-400 text-white py-2.5 rounded-xl font-semibold text-center mb-3 text-sm">Match In Progress</div>
        )}

        {/* Scorecard */}
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <h4 className="font-bold text-gray-900 mb-2 text-sm">Scorecard</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 font-semibold text-gray-700 sticky left-0 bg-white">Hole</th>
                  {scores.slice(0, totalHoles).map((_, idx) => {
                    const h = ((Number(startingHole) - 1 + idx) % 18) + 1;
                    return (
                      <th key={idx} className="px-1 py-1.5 text-center min-w-[28px]">
                        <button onClick={() => { triggerHaptic('light'); setCurrentHole(idx); }}
                          className={`font-bold text-sm transition-colors rounded-md px-1 ${currentHole === idx ? 'bg-green-700 text-white' : 'text-gray-700 hover:text-blue-500'}`}>
                          {h}
                        </button>
                      </th>
                    );
                  })}
                  {scores.slice(totalHoles).map((_, idx) => (
                    <th key={`p${idx}`} className="px-1 py-1.5 text-center min-w-[28px]">
                      <button onClick={() => { triggerHaptic('light'); setCurrentHole(totalHoles + idx); }}
                        className={`font-semibold transition-colors ${currentHole === totalHoles + idx ? 'text-blue-600 underline' : 'text-gray-700 hover:text-blue-500'}`}>
                        P{idx + 1}
                      </button>
                    </th>
                  ))}
                  <th className="text-center py-1.5 pl-2 font-semibold text-gray-700 border-l border-gray-200 sticky right-0 bg-white">vs Par</th>
                </tr>
              </thead>
              <tbody>
                {[{ name: p1Name, key: 'p1', fullName: match.player1 }, { name: p2Name, key: 'p2', fullName: match.player2 }].map(({ name, key, fullName }) => (
                  <tr key={key} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-2 text-gray-900 font-bold text-sm sticky left-0 bg-white">
                      {name}{isJuniorPlayer(fullName) && <span className="ml-1 text-xs text-blue-600">(J)</span>}
                    </td>
                    {scores.map((score, idx) => {
                      const p1a = applyJuniorHandicap(score.p1, match.player1);
                      const p2a = applyJuniorHandicap(score.p2, match.player2);
                      const mine = key === 'p1' ? p1a : p2a;
                      const theirs = key === 'p1' ? p2a : p1a;
                      return (
                        <td key={idx} className={`px-1 py-1.5 text-center font-extrabold text-sm ${!score.scored ? 'text-gray-400' : mine < theirs ? 'text-blue-600 bg-blue-50' : mine === theirs ? 'text-gray-600' : 'text-gray-900'}`}>
                          {score.scored ? (
                            <>
                              {score[key]}
                              {isJuniorPlayer(fullName) && score[key] > 1 && <span className="text-xs text-blue-600"> (-1)</span>}
                            </>
                          ) : '-'}
                        </td>
                      );
                    })}
                    <td className={`py-1.5 pl-2 text-center font-bold border-l border-gray-200 sticky right-0 bg-white ${vsPar(key).includes('-') ? 'text-green-600' : vsPar(key).includes('+') ? 'text-red-600' : 'text-gray-900'}`}>
                      {vsPar(key)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showLiveScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <LiveScoresPage onBack={() => { triggerHaptic('light'); setShowLiveScores(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// REVIEW PAGE
// ============================================

const ReviewPage = ({ match, onCancel }) => {
  const scores = match.scoresJson || [];
  const course = match.course;
  const p1Name = formatPlayerName(match.player1);
  const p2Name = formatPlayerName(match.player2);

  const vsPar = useCallback((key) => {
    let total = 0, par = 0;
    scores.forEach((s, idx) => {
      if (!s.scored) return;
      total += s[key];
      par += course?.pars[((idx) % 18) + 1] || 3;
    });
    const d = total - par;
    return d === 0 ? 'E' : d > 0 ? `+${d}` : String(d);
  }, [scores, course]);

  const { p1Holes, p2Holes } = useMemo(() => {
    let p1 = 0, p2 = 0;
    scores.forEach(s => {
      if (!s.scored) return;
      const a1 = applyJuniorHandicap(s.p1, match.player1);
      const a2 = applyJuniorHandicap(s.p2, match.player2);
      if (a1 < a2) p1++; else if (a2 < a1) p2++;
    });
    return { p1Holes: p1, p2Holes: p2 };
  }, [scores, match]);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <button onClick={() => { triggerHaptic('light'); onCancel(); }} className="text-blue-600 font-medium text-sm">← Back to Matches</button>
        </div>
      </div>
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{p1Name} <span className="text-gray-400 font-normal">vs</span> {p2Name}</h2>
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <MapPin size={14} className="mr-1" /> {match.venue}
          <span className="ml-2 text-xs">{new Date(match.date).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h4 className="font-bold text-gray-900 mb-3">Match Summary</h4>
          <div className="flex items-center justify-between">
            {[{ name: p1Name, holes: p1Holes }, { name: p2Name, holes: p2Holes }].map(({ name, holes }, i) => (
              <React.Fragment key={name}>
                {i === 1 && <div className="text-2xl text-gray-400 font-light px-4">—</div>}
                <div className="text-center flex-1">
                  <div className="text-sm text-gray-500 mb-1">{name}</div>
                  <div className="text-3xl font-bold text-blue-600">{holes}</div>
                  <div className="text-xs text-gray-500 mt-1">Holes Won</div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-sm font-semibold text-gray-700">Winner: <span className="text-green-600">{formatPlayerName(match.winner)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h4 className="font-bold text-gray-900 mb-3">Scorecard</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 pr-2 font-semibold text-gray-700 text-xs sticky left-0 bg-white">Hole</th>
                  {scores.slice(0, 18).map((_, idx) => (
                    <th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[32px]">{idx + 1}</th>
                  ))}
                  {scores.slice(18).map((_, idx) => (
                    <th key={`p${idx}`} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[32px]">P{idx + 1}</th>
                  ))}
                  <th className="text-center py-2 pl-2 font-semibold text-gray-700 text-xs border-l-2 border-gray-200 sticky right-0 bg-white">vs Par</th>
                </tr>
              </thead>
              <tbody>
                {[{ name: p1Name, key: 'p1' }, { name: p2Name, key: 'p2' }].map(({ name, key }) => (
                  <tr key={key} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-2 text-gray-900 font-bold text-sm sticky left-0 bg-white">{name}</td>
                    {scores.map((s, idx) => (
                      <td key={idx} className={`px-1 py-2 text-center font-extrabold text-sm ${s.scored ? (s.p1 < s.p2 && key === 'p1' ? 'text-blue-600 bg-blue-50' : s.p2 < s.p1 && key === 'p2' ? 'text-blue-600 bg-blue-50' : s.p1 === s.p2 ? 'text-gray-600' : 'text-gray-900') : 'text-gray-400'}`}>
                        {s.scored ? s[key] : '-'}
                      </td>
                    ))}
                    <td className={`py-2 pl-2 text-center font-bold text-xs border-l-2 border-gray-200 sticky right-0 bg-white ${vsPar(key).includes('-') ? 'text-green-600' : vsPar(key).includes('+') ? 'text-red-600' : 'text-gray-900'}`}>
                      {vsPar(key)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

const DiscGolfApp = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [darkMode, setDarkMode] = useDarkMode();
  const appData = useAppData();
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => { triggerHaptic(type); setToast({ message, type }); }, []);

  const handleLogin = useCallback((playerName, pin) => {
    const player = appData.players.find(p => p.name === playerName && p.pin === pin);
    if (player) {
      localStorage.setItem('lastLoggedInUser', playerName);
      setCurrentUser(player); setView('matches'); setError('');
      showToast(`Welcome back, ${formatPlayerName(player.name)}!`);
    } else {
      setError('Invalid player name or PIN');
      triggerHaptic('error');
    }
  }, [appData.players, showToast]);

  const handleLogout = useCallback(() => { setCurrentUser(null); setView('login'); setSelectedMatch(null); }, []);

  const handleChangePin = useCallback((newPin) => {
    const updatedPlayers = appData.players.map(p => p.id === currentUser.id ? { ...p, pin: newPin } : p);
    appData.setPlayers(updatedPlayers);
    setCurrentUser(u => ({ ...u, pin: newPin }));
    localStorage.setItem('sheet-data', JSON.stringify({ players: updatedPlayers, courses: appData.courses, matches: appData.matches, pools: appData.pools }));
    setView('matches');
    showToast('PIN updated successfully!');
  }, [appData, currentUser, showToast]);

  const handleCancelMatch = useCallback(async () => {
    if (!selectedMatch?.match || !window.confirm('Cancel this match? All progress will be lost.')) return;
    try {
      localStorage.removeItem(`match-progress-${selectedMatch.match.id}`);
      const updatedMatches = appData.matches.map(m => m.id === selectedMatch.match.id ? { ...m, scoresJson: [], winner: '', status: 'scheduled' } : m);
      appData.setMatches(updatedMatches);
      localStorage.setItem('sheet-data', JSON.stringify({ players: appData.players, courses: appData.courses, matches: updatedMatches, pools: appData.pools }));
      await postToSheet({ action: 'cancelMatch', matchId: selectedMatch.match.id });
      setSelectedMatch(null); setView('matches');
      showToast('Match cancelled', 'info');
    } catch (err) { showToast('Error cancelling match', 'error'); }
  }, [selectedMatch, appData, showToast]);

  const commonProps = { darkMode, setDarkMode };

  const views = {
    login: <LoginPage players={appData.players} onLogin={handleLogin} error={error} isOnline={appData.isOnline} {...commonProps} />,
    changePin: <ChangePinPage currentUser={currentUser} onBack={() => setView('matches')} onPinChange={handleChangePin} {...commonProps} />,
    matches: <MatchesPage currentUser={currentUser} matches={appData.matches} onLogout={handleLogout} onChangePin={() => setView('changePin')}
      onStartMatch={(match, startingHole, totalHoles) => { setSelectedMatch({ match, startingHole, totalHoles }); setView('scoring'); }}
      onReviewMatch={match => { setSelectedMatch(match); setView('review'); }}
      onViewStandings={() => setView('standings')} isOnline={appData.isOnline} pendingUpdates={appData.pendingUpdates}
      onRefresh={appData.loadSheetData} isLoading={appData.isLoading} {...commonProps} />,
    scoring: selectedMatch && <ScoringPage match={selectedMatch.match} startingHole={selectedMatch.startingHole}
      totalHoles={selectedMatch.totalHoles} courses={appData.courses} onCancel={handleCancelMatch}
      onComplete={(scores, winner) => { appData.submitMatchToSheet(selectedMatch.match.id, scores, winner); showToast('Match completed!'); setSelectedMatch(null); setView('matches'); }} />,
    standings: <StandingsPage currentUser={currentUser} matches={appData.matches} pools={appData.pools} players={appData.players}
      onLogout={handleLogout} onChangePin={() => setView('changePin')} onViewMatches={() => setView('matches')}
      isOnline={appData.isOnline} pendingUpdates={appData.pendingUpdates} onRefresh={appData.loadSheetData} isLoading={appData.isLoading} {...commonProps} />,
    review: selectedMatch && <ReviewPage match={selectedMatch} onCancel={() => { setSelectedMatch(null); setView('matches'); }} />,
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {views[view] || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Page under construction...</p>
            <button onClick={handleLogout} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Login</button>
          </div>
        </div>
      )}
    </>
  );
};

export default DiscGolfApp;

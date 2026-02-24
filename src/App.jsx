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

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatPlayerName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial}`;
};

const isJuniorPlayer = (playerName) => playerName && playerName.includes('(J)');

const applyJuniorHandicap = (score, playerName) => 
  isJuniorPlayer(playerName) ? Math.max(1, score - 1) : score;

const triggerHaptic = (style = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      error: [20, 100, 20]
    };
    navigator.vibrate(patterns[style] || patterns.medium);
  }
};

const calculateMatchStats = (match) => {
  let p1Holes = 0;
  let p2Holes = 0;
  let lastHole = 0;

  if (match.scoresJson?.length > 0) {
    match.scoresJson.forEach((score, idx) => {
      if (score.scored) {
        lastHole = idx + 1;
        const p1Adjusted = applyJuniorHandicap(score.p1, match.player1);
        const p2Adjusted = applyJuniorHandicap(score.p2, match.player2);
        
        if (p1Adjusted < p2Adjusted) p1Holes++;
        else if (p2Adjusted < p1Adjusted) p2Holes++;
      }
    });
  }

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
  <div className="text-white sticky top-0 z-10 shadow-lg" style={{background: `linear-gradient(to bottom right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})`}}>
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
            <button 
              onClick={() => {
                triggerHaptic('light');
                onRefresh();
              }}
              disabled={isLoading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={isLoading ? 'inline-block animate-s' : ''}>🔄</span>
            </button>
          )}
          <button onClick={() => {
            triggerHaptic('light');
            setDarkMode(!darkMode);
          }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => {
            triggerHaptic('light');
            onChange();
          }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <Edit size={20} />
          </button>
          <button onClick={() => {
            triggerHaptic('medium');
            onLogout();
          }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>
      
      {showTabs && (
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => {
              triggerHaptic('light');
              onTabChange('matches');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold ${
              activeTab === 'matches' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Matches
          </button>
          <button 
            onClick={() => {
              triggerHaptic('light');
              onTabChange('standings');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold ${
              activeTab === 'standings' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Standings
          </button>
          <button 
  onClick={() => {
    triggerHaptic('light');
    onTabChange('live');
  }}
  className={`flex-1 py-2 px-4 rounded-lg font-semibold ${
    activeTab === 'live' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
  }`}
>
  Live
</button>
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
  <div 
    onClick={onClick}
    className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center text-sm text-gray-500">
        <Calendar size={14} className="mr-1" />
        <span>{new Date(match.date).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        <Clock size={14} className="ml-3 mr-1" />
        <span>{match.startTime}</span>
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
  const getHeaderClass = () => {
    if (headerStyle === 'primary') {
      return { background: `linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})`, textColor: 'text-white' };
    } else if (headerStyle === 'secondary') {
      return { background: `linear-gradient(to right, ${BRAND_SECONDARY}, ${BRAND_PRIMARY})`, textColor: 'text-gray-900' };
    } else {
      return { background: 'bg-gray-100', textColor: 'text-gray-900' };
    }
  };

  const style = getHeaderClass();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={typeof style.background === 'string' && style.background.includes('gradient') ? { background: style.background } : {}}
        {...(style.background === 'bg-gray-100' ? { className: `w-full px-4 py-3 flex items-center justify-between ${style.background}` } : {})}
      >
        <div className="text-left">
          <h2 className={`text-lg font-bold ${style.textColor}`}>{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronRight 
          size={20} 
          className={`${style.textColor} transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
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
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
      .dark-mode .bg-red-50 { background-color: rgba(153, 27, 27, 0.2) !important; }
      .dark-mode .text-red-800 { color: #fca5a5 !important; }
      .dark-mode .bg-orange-50 { background-color: rgba(154, 52, 18, 0.2) !important; }
      .dark-mode .text-orange-800 { color: #fdba74 !important; }
      .dark-mode .bg-blue-50 { background-color: rgba(30, 58, 138, 0.3) !important; }
      .dark-mode .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3) !important; }
      .dark-mode .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important; }
      .dark-mode .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important; }
      
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
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      loadSheetData();
      processPendingUpdates();
    }
  }, [isOnline]);

  const loadSheetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
      if (!response.ok) throw new Error('Failed to load data');
      
      const data = await response.json();

      if (!data.players || !Array.isArray(data.players)) {
        throw new Error('Invalid data structure');
      }

      const playersData = data.players.slice(1).map(row => ({
        id: row[0], 
        name: row[1], 
        pin: String(row[2]),
        status: row[3] || 'Active'
      }));
      
      const coursesData = data.courses.slice(1).map(row => ({
        id: row[0], 
        name: row[1], 
        code: row[2], 
        holes: parseInt(row[3]), 
        pars: JSON.parse(row[4] || '{}')
      }));
      
      const matchesData = data.matches.slice(1).map(row => ({
        id: row[0], 
        date: row[1], 
        venue: row[2], 
        player1: row[3], 
        player2: row[4],
        startTime: row[5], 
        endTime: row[6], 
        scoresJson: row[7] ? JSON.parse(row[7]) : [],
        winner: row[8], 
        status: row[9] || 'scheduled'
      }));
      
      const poolsData = data.pools.slice(1).map(row => ({
        pool: row[0], 
        player: row[1], 
        played: parseInt(row[2]) || 0,
        win: parseInt(row[3]) || 0, 
        loss: parseInt(row[4]) || 0, 
        points: parseInt(row[5]) || 0
      }));
      
      setPlayers(playersData);
      setCourses(coursesData);
      setMatches(matchesData);
      setPools(poolsData);
      
      localStorage.setItem('sheet-data', JSON.stringify({
        players: playersData, 
        courses: coursesData, 
        matches: matchesData, 
        pools: poolsData
      }));
    } catch (err) {
      console.error('Error loading sheet data:', err);
      try {
        const stored = localStorage.getItem('sheet-data');
        if (stored) {
          const data = JSON.parse(stored);
          setPlayers(data.players || []);
          setCourses(data.courses || []);
          setMatches(data.matches || []);
          setPools(data.pools || []);
        }
      } catch (e) {
        console.error('Unable to load data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processPendingUpdates = useCallback(async () => {
    try {
      const stored = localStorage.getItem('pending-updates');
      if (stored) {
        const updates = JSON.parse(stored);
        for (const update of updates) {
          await submitMatchToSheet(update.matchId, update.scores, update.winner);
        }
        localStorage.removeItem('pending-updates');
        setPendingUpdates([]);
      }
    } catch (err) {
      console.error('Error processing pending updates:', err);
    }
  }, []);

  const submitMatchToSheet = useCallback(async (matchId, finalScores, winner) => {
    if (!isOnline) {
      const updates = [...pendingUpdates, { matchId, scores: finalScores, winner }];
      setPendingUpdates(updates);
      localStorage.setItem('pending-updates', JSON.stringify(updates));
      return;
    }

    try {
      const match = matches.find(m => m.id === matchId);
      const updatedMatches = matches.map(m => 
        m.id === matchId ? { ...m, scoresJson: finalScores, winner, status: 'Completed' } : m
      );
      setMatches(updatedMatches);
      
      const updatedPools = pools.map(p => {
        if (p.player === match.player1 || p.player === match.player2) {
          const isWinner = p.player === winner;
          const isTie = !winner || winner === 'Tie';
          
          return {
            ...p,
            played: p.played + 1,
            win: isWinner ? p.win + 1 : p.win,
            loss: (!isWinner && !isTie) ? p.loss + 1 : p.loss,
            points: p.points + (isWinner ? 3 : isTie ? 1 : 0)
          };
        }
        return p;
      });
      setPools(updatedPools);
      
      localStorage.setItem('sheet-data', JSON.stringify({
        players, courses, matches: updatedMatches, pools: updatedPools
      }));
        
      await fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'submitMatch',  // add this
    matchId, 
    scores: finalScores, 
    winner,
    status: 'Completed'     // add this
  }),
  mode: 'no-cors'
});
    } catch (err) {
      console.error('Error submitting match:', err);
    }
  }, [isOnline, matches, pools, players, courses, pendingUpdates]);

  return {
    players, 
    setPlayers, 
    courses, 
    matches, 
    setMatches, 
    pools,
    isOnline, 
    pendingUpdates, 
    submitMatchToSheet, 
    loadSheetData,
    isLoading
  };
};

// ============================================
// PAGE COMPONENTS
// ============================================

const LoginPage = ({ players, onLogin, error, darkMode, setDarkMode, isOnline }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(() => 
    localStorage.getItem('lastLoggedInUser') || ''
  );
 const [showTrustModal, setShowTrustModal] = useState(false);
  return (
    <div className="min-h-screen bg-white transition-colors">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => {
              triggerHaptic('light');
              setDarkMode(!darkMode);
            }}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <div className="text-center mb-12 mt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg">
            <img
              src="/TDGcircle.GIF"
              alt="Timaru Disc Golf"
              className="w-36 h-36 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Timaru Disc Golf</h1>
          <p className="text-gray-500">Summer League 2026</p>
        </div>

        {!isOnline && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r">
            <p className="text-sm text-orange-800">You're offline. Data will sync when connected.</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            onLogin(formData.get('player'), formData.get('pin'));
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Player</label>
            <select
              name="player"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="">Choose your name</option>
              {players.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PIN</label>
            <input
              type="tel"
              inputMode="numeric"
              name="pin"
              maxLength="4"
              pattern="[0-9]{4}"
              placeholder="Enter 4-digit PIN"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

<button
            type="submit"
            onClick={() => triggerHaptic('medium')}
            className="w-full text-white py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
            style={{
              backgroundColor: BRAND_PRIMARY,
              boxShadow: `0 10px 15px -3px ${BRAND_PRIMARY}30`,
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = BRAND_ACCENT)}
            onMouseLeave={(e) => (e.target.style.backgroundColor = BRAND_PRIMARY)}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => setShowTrustModal(true)}
            className="w-full text-gray-600 text-sm py-2 mt-2 hover:text-gray-900 transition-colors"
          >
            About & Privacy Policy
          </button>
        </form>

        {showTrustModal && <TrustModal onClose={() => setShowTrustModal(false)} />}
      </div>
    </div>
  );
};
// Trust & Safety Modal
const TrustModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h3 className="text-xl font-bold text-gray-900">About This App</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* About Section */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">ℹ️</span>
              About
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              This is the official score tracking application for the Timaru Disc Golf Summer League 2026. 
              This app helps players track matches, view standings, and manage their league participation.
            </p>
          </div>

          {/* Privacy Section */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">🔒</span>
              Privacy & Data
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              We collect only essential information:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Player names and PINs for authentication</li>
              <li>• Match scores and results</li>
              <li>• League standings data</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              All data is stored securely in Google Sheets and is only accessible to league participants. 
              We never share your information with third parties.
            </p>
          </div>

          {/* Security Section */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">🛡️</span>
              Security
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              This application uses secure connections (HTTPS) and authenticated API access to protect your data. 
              Your PIN is used only for login verification and is never displayed or shared.
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">📧</span>
              Contact
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              For questions, issues, or concerns about this app, please contact:
            </p>
            <p className="text-sm text-blue-600 mt-1">
              timarudiscgolf@gmail.com
            </p>
          </div>

          {/* Terms Section */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">📋</span>
              Terms of Use
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              By using this app, you agree to:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 mt-2">
              <li>• Provide accurate match scores</li>
              <li>• Use your own login credentials only</li>
              <li>• Respect other players' privacy</li>
              <li>• Follow league rules and sportsmanship guidelines</li>
            </ul>
          </div>

          {/* Version Info */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Timaru Disc Golf League App v1.0<br />
              Summer League 2026
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
const ChangePinPage = ({ currentUser, onBack, onPinChange, darkMode, setDarkMode }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePin = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError('PIN must be 4 digits');
      triggerHaptic('error');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      triggerHaptic('error');
      return;
    }
    
    setLoading(true);
    setError('');
    triggerHaptic('medium');
    
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePin',
          playerId: currentUser.id,
          newPin: newPin
        }),
        mode: 'no-cors'
      });
      
      onPinChange(newPin);
    } catch (err) {
      console.error('Error updating PIN:', err);
      setError('Failed to update PIN. Please try again.');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => {
              triggerHaptic('light');
              onBack();
            }} className="mr-4">
              <X size={24} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Change PIN</h2>
          </div>
          <button onClick={() => {
            triggerHaptic('light');
            setDarkMode(!darkMode);
          }} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New PIN</label>
            <input 
              type="password" 
              maxLength="4" 
              pattern="[0-9]{4}" 
              placeholder="4 digits" 
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
            <input 
              type="password" 
              maxLength="4" 
              pattern="[0-9]{4}" 
              placeholder="4 digits" 
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <button 
            onClick={handleChangePin} 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
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

const MatchesPage = ({ 
  currentUser, 
  matches, 
  onLogout, 
  onChangePin, 
  onStartMatch, 
  onReviewMatch,
  onViewStandings,
  darkMode,
  setDarkMode,
  isOnline,
  pendingUpdates,
  onRefresh,
  isLoading
}) => {
  const [matchFilter, setMatchFilter] = useState('player');
  const [selectedFilterDate, setSelectedFilterDate] = useState('');
  const [selectedFilterPlayer, setSelectedFilterPlayer] = useState(currentUser.name);
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [startingHole, setStartingHole] = useState(1);
  const [showLiveScores, setShowLiveScores] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeMatchData, setResumeMatchData] = useState(null);

  // Check for in-progress match on mount
  useEffect(() => {
    const checkForInProgressMatch = () => {
      const keys = Object.keys(localStorage);
      const progressKeys = keys.filter(key => key.startsWith('match-progress-'));
      
      if (progressKeys.length > 0) {
        const latestKey = progressKeys[progressKeys.length - 1];
        const progressData = JSON.parse(localStorage.getItem(latestKey));
        const match = matches.find(m => m.id === progressData.matchId);
        
        if (match && (match.player1 === currentUser.name || match.player2 === currentUser.name)) {
          setResumeMatchData({ match, progress: progressData });
          setShowResumePrompt(true);
        }
      }
    };
    
    checkForInProgressMatch();
  }, [matches, currentUser]);

  const handleResumeMatch = () => {
    triggerHaptic('medium');
    onStartMatch(resumeMatchData.match, resumeMatchData.progress.startingHole);
    setShowResumePrompt(false);
  };

  const handleDiscardMatch = () => {
    triggerHaptic('light');
    localStorage.removeItem(`match-progress-${resumeMatchData.match.id}`);
    setShowResumePrompt(false);
    setResumeMatchData(null);
  };

  const userMatches = useMemo(() => 
    matches.filter(m => m.player1 === currentUser.name || m.player2 === currentUser.name),
    [matches, currentUser.name]
  );

  const upcomingMatches = useMemo(() => 
    userMatches.filter(m => m.status !== 'Completed'),
    [userMatches]
  );
  
  const completedMatches = useMemo(() => {
    let filtered = matches.filter(m => m.status === 'Completed');
    
    if (matchFilter === 'date' && selectedFilterDate) {
      filtered = filtered.filter(m => m.date === selectedFilterDate);
    } else if (matchFilter === 'player' && selectedFilterPlayer) {
      filtered = filtered.filter(m => 
        m.player1 === selectedFilterPlayer || m.player2 === selectedFilterPlayer
      );
    }
    
    return filtered;
  }, [matches, matchFilter, selectedFilterDate, selectedFilterPlayer]);
  
  const uniqueDates = useMemo(() => 
    [...new Set(matches.filter(m => m.status === 'Completed').map(m => m.date))].sort(),
    [matches]
  );

  const uniquePlayers = useMemo(() => 
    [...new Set(matches.filter(m => m.status === 'Completed').flatMap(m => [m.player1, m.player2]))].sort(),
    [matches]
  );

  const handleStartMatch = useCallback((match) => {
    triggerHaptic('light');
    setSelectedMatch(match);
    setShowStartHoleModal(true);
  }, []);

  const confirmStartHole = useCallback(() => {
    triggerHaptic('medium');
    onStartMatch(selectedMatch, startingHole);
    setShowStartHoleModal(false);
  }, [selectedMatch, startingHole, onStartMatch]);

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <Header
        currentUser={currentUser}
        onLogout={onLogout}
        onChangePin={onChangePin}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onRefresh={onRefresh}
        isLoading={isLoading}
        isOnline={isOnline}
        pendingUpdates={pendingUpdates}
        showTabs
        activeTab="matches"
        onTabChange={(tab) => {
  if (tab === 'standings') onViewStandings();
  if (tab === 'live') setShowLiveScores(true);
}}
      />
      
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Matches</h2>
          {upcomingMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="text-gray-400" size={28} />
              </div>
              <p className="text-gray-500">No upcoming matches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map(match => (
                <MatchCard 
                  key={match.id}
                  match={match}
                  onClick={() => handleStartMatch(match)}
                />
              ))}
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Completed Matches</h2>
            <select
              value={matchFilter}
              onChange={(e) => {
                setMatchFilter(e.target.value);
                setSelectedFilterDate('');
                setSelectedFilterPlayer('');
              }}
              className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Matches</option>
              <option value="date">By Date</option>
              <option value="player">By Player</option>
            </select>
          </div>
          
          {matchFilter === 'date' && (
            <div className="mb-4">
              <select
                value={selectedFilterDate}
                onChange={(e) => setSelectedFilterDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a date</option>
                {uniqueDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          )}
          
          {matchFilter === 'player' && (
            <div className="mb-4">
              <select
                value={selectedFilterPlayer}
                onChange={(e) => setSelectedFilterPlayer(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a player</option>
                {uniquePlayers.map(player => (
                  <option key={player} value={player}>{player}</option>
                ))}
              </select>
            </div>
          )}
          
          {completedMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">
                {matchFilter !== 'all' ? 'No matches found for this filter' : 'No completed matches yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedMatches.map(match => (
                <MatchCard 
                  key={match.id}
                  match={match}
                  onClick={() => {
                    triggerHaptic('light');
                    onReviewMatch(match);
                  }}
                  showResult
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resume Match Prompt */}
      {showResumePrompt && resumeMatchData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Resume Match?</h3>
            <p className="text-gray-600 mb-4">
              You have an in-progress match: <strong>{formatPlayerName(resumeMatchData.match.player1)}</strong> vs <strong>{formatPlayerName(resumeMatchData.match.player2)}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {resumeMatchData.progress.scores.filter(s => s.scored).length} of 18 holes completed
            </p>
            <div className="flex gap-3">
              <button 
                onClick={handleDiscardMatch}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleResumeMatch}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Resume Match
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartHoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Select Starting Hole</h3>
            <select 
              value={startingHole}
              onChange={(e) => setStartingHole(Number(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({length: 18}, (_, i) => i + 1).map(h => (
                <option key={h} value={h}>Hole {h}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowStartHoleModal(false);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmStartHole}
                className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Match
              </button>
            </div>
          </div>
        </div>
      )}

      {showLiveScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <LiveScoresPage onBack={() => {
              triggerHaptic('light');
              setShowLiveScores(false);
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
//  STANDINGS PAGE - Optimized with hooks
// ============================================

const useStandingsCalculations = (pools, players, matches) => {
  const calculateStandings = useCallback((poolName) => {
    const poolPlayers = pools.filter(p => p.pool === poolName);
    
    const standings = poolPlayers.map(player => {
      const playerData = players.find(p => p.name === player.player);
      const status = playerData?.status || 'Active';
      
      const poolMatches = matches.filter(m => 
        m.status === 'Completed' && 
        (m.player1 === player.player || m.player2 === player.player)
      );

      let holesWon = 0;
      let holesLost = 0;
      let matchWins = 0;
      let matchLosses = 0;
      let matchTies = 0;

      poolMatches.forEach(match => {
        const isPlayer1 = match.player1 === player.player;
        let p1Holes = 0;
        let p2Holes = 0;
        
        if (match.scoresJson?.length > 0) {
          match.scoresJson.forEach(score => {
            if (score.scored) {
              const p1Adjusted = applyJuniorHandicap(score.p1, match.player1);
              const p2Adjusted = applyJuniorHandicap(score.p2, match.player2);
              if (p1Adjusted < p2Adjusted) p1Holes++;
              else if (p2Adjusted < p1Adjusted) p2Holes++;
            }
          });
        }

        if (isPlayer1) {
          holesWon += p1Holes;
          holesLost += p2Holes;
          if (match.winner === player.player) matchWins++;
          else if (match.winner && match.winner !== player.player) matchLosses++;
          else if (p1Holes === p2Holes) matchTies++;
        } else {
          holesWon += p2Holes;
          holesLost += p1Holes;
          if (match.winner === player.player) matchWins++;
          else if (match.winner && match.winner !== player.player) matchLosses++;
          else if (p1Holes === p2Holes) matchTies++;
        }
      });
      
      return {
        name: player.player,
        status,
        points: (matchWins * 3) + (matchTies * 1),
        holesWon,
        holesLost,
        holeDiff: holesWon - holesLost,
        played: poolMatches.length,
        win: matchWins,
        loss: matchLosses
      };
    });

    const activePlayers = standings.filter(s => s.status === 'Active');
    const inactivePlayers = standings.filter(s => s.status === 'Inactive');

    const sortFn = (a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.holeDiff - a.holeDiff;
    };

    activePlayers.sort(sortFn);
    inactivePlayers.sort(sortFn);

    return [...activePlayers, ...inactivePlayers];
  }, [pools, players, matches]);

  const getPoolNames = useCallback(() => 
    [...new Set(pools.map(p => p.pool))].sort(),
    [pools]
  );

  return { calculateStandings, getPoolNames };
};

const StandingsTable = ({ standings, currentUser }) => (
  <table className="w-full">
    <thead>
      <tr className="border-b-2 border-gray-200">
        <th className="text-left py-2 pr-2 font-semibold text-gray-700 text-xs w-8">#</th>
        <th className="text-left py-2 pr-2 font-semibold text-gray-700 text-xs">Player</th>
        <th className="text-center py-2 px-1 font-semibold text-gray-700 text-xs">P</th>
        <th className="text-center py-2 px-1 font-semibold text-gray-700 text-xs">W</th>
        <th className="text-center py-2 px-1 font-semibold text-gray-700 text-xs">L</th>
        <th className="text-center py-2 px-1 font-semibold text-gray-700 text-xs">+/-</th>
        <th className="text-center py-2 pl-2 font-semibold text-gray-700 text-xs">Pts</th>
      </tr>
    </thead>
    <tbody>
      {standings.map((standing, idx) => (
        <tr 
          key={standing.name} 
          className={`border-b border-gray-100 ${
            standing.name === currentUser.name ? 'bg-green-50' : ''
          } ${
            standing.status === 'Inactive' ? 'opacity-50 text-gray-400' : ''
          }`}
        >
          <td className="py-3 pr-2 text-gray-600 font-semibold text-xs">{idx + 1}</td>
          <td className="py-3 pr-2 font-semibold text-gray-900 text-xs">
            {formatPlayerName(standing.name)}
            {standing.status === 'Inactive' && <span className="ml-1 text-orange-500">⚠️</span>}
          </td>
          <td className="py-3 px-1 text-center text-gray-700 text-xs">{standing.played}</td>
          <td className="py-3 px-1 text-center text-gray-700 text-xs">{standing.win}</td>
          <td className="py-3 px-1 text-center text-gray-700 text-xs">{standing.loss}</td>
          <td className={`py-3 px-1 text-center font-bold text-xs ${
            standing.holeDiff > 0 ? 'text-green-600' : 
            standing.holeDiff < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {standing.holeDiff > 0 ? '+' : ''}{standing.holeDiff}
          </td>
          <td className="py-3 pl-2 text-center text-gray-900 font-bold text-sm">{standing.points}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
const useCrossoverMatches = (pools, players, matches) => {
  return useMemo(() => {
    const getPoolNames = () => [...new Set(pools.map(p => p.pool))].sort();
    
    const allPools = getPoolNames().filter(p => 
      !p.toLowerCase().includes('cup') && 
      !p.toLowerCase().includes('shield') && 
      !p.toLowerCase().includes('plate') &&
      !p.toLowerCase().includes('crossover')
    );
    
    if (allPools.length < 4) return { week1: [], week2: [] };
    
    const calculateStandings = (poolName) => {
      const poolPlayers = pools.filter(p => p.pool === poolName);
      
      return poolPlayers.map(player => {
        const playerData = players.find(p => p.name === player.player);
        return { name: player.player, status: playerData?.status || 'Active' };
      }).filter(s => s.status === 'Active');
    };
    
    const poolA = calculateStandings(allPools[0]) || [];
    const poolB = calculateStandings(allPools[1]) || [];
    const poolC = calculateStandings(allPools[2]) || [];
    const poolD = calculateStandings(allPools[3]) || [];
      
    const crossoverMatches = matches.filter(m => {
      const id = m.id?.toLowerCase() || '';
      const venue = m.venue?.toLowerCase() || '';
      return id.includes('crossover') || venue.includes('crossover');
    });
    const findMatch = (p1, p2) => matches.find(m =>
  (m.player1 === p1 && m.player2 === p2) ||
  (m.player1 === p2 && m.player2 === p1)
);
 
    const createMatch = (pool1, pos1, pool2, pos2, poolName1, poolName2) => {
      const player1 = pool1[pos1 - 1]?.name || `${poolName1}${pos1}`;
      const player2 = pool2[pos2 - 1]?.name || `${poolName2}${pos2}`;
      const match = crossoverMatches.find(m =>
  (m.player1 === player1 && m.player2 === player2) ||
  (m.player1 === player2 && m.player2 === player1)
);
      
      return {
        player1,
        player2,
        winner: match?.winner,
        status: match?.status,
        label: `${poolName1}${pos1} v ${poolName2}${pos2}`
      };
    };
    
    const week1 = [
      createMatch(poolA, 1, poolB, 3, 'A', 'B'),
      createMatch(poolA, 2, poolB, 2, 'A', 'B'),
      createMatch(poolA, 3, poolB, 1, 'A', 'B'),
      createMatch(poolC, 1, poolD, 3, 'C', 'D'),
      createMatch(poolC, 2, poolD, 2, 'C', 'D'),
      createMatch(poolC, 3, poolD, 1, 'C', 'D'),
      createMatch(poolA, 4, poolB, 6, 'A', 'B'),
      createMatch(poolA, 5, poolB, 5, 'A', 'B'),
      createMatch(poolA, 6, poolB, 4, 'A', 'B'),
      createMatch(poolC, 4, poolD, 6, 'C', 'D'),
      createMatch(poolC, 5, poolD, 5, 'C', 'D'),
      createMatch(poolC, 6, poolD, 4, 'C', 'D'),
      createMatch(poolA, 7, poolB, 7, 'A', 'B'),
      createMatch(poolC, 7, poolD, 7, 'C', 'D')
    ];
    
    const week2 = [
      createMatch(poolA, 1, poolC, 3, 'A', 'C'),
      createMatch(poolA, 2, poolC, 2, 'A', 'C'),
      createMatch(poolA, 3, poolC, 1, 'A', 'C'),
      createMatch(poolB, 1, poolD, 3, 'B', 'D'),
      createMatch(poolB, 2, poolD, 2, 'B', 'D'),
      createMatch(poolB, 3, poolD, 1, 'B', 'D'),
      createMatch(poolA, 4, poolC, 6, 'A', 'C'),
      createMatch(poolA, 5, poolC, 5, 'A', 'C'),
      createMatch(poolA, 6, poolC, 4, 'A', 'C'),
      createMatch(poolB, 4, poolD, 6, 'B', 'D'),
      createMatch(poolB, 5, poolD, 5, 'B', 'D'),
      createMatch(poolB, 6, poolD, 4, 'B', 'D'),
      createMatch(poolA, 7, poolC, 7, 'A', 'C'),
      createMatch(poolB, 7, poolD, 7, 'B', 'D')
    ];
    
    return { week1, week2 };
  }, [pools, players, matches]);
};

const CrossoverMatchCard = ({ match }) => (
  <div className="bg-white rounded-lg p-2 text-xs border border-gray-200">
    <div className="text-center text-xs font-semibold text-gray-500 mb-1">{match.label}</div>
    <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>
      {formatPlayerName(match.player1)}
    </div>
    <div className="text-gray-400 text-center my-0.5">vs</div>
    <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>
      {formatPlayerName(match.player2)}
    </div>
    {match.status === 'Completed' && (
      <div className="text-center mt-1">
        <span className="text-xs text-green-600">✓</span>
      </div>
    )}
  </div>
);
 const generatePlayoffBrackets = (playoffType, pools, players, matches, calculateStandings) => {
  const poolNames = [...new Set(pools.map(p => p.pool))]
    .filter(p => !p.toLowerCase().includes('cup') && 
                 !p.toLowerCase().includes('shield') && 
                 !p.toLowerCase().includes('plate'))
    .sort();

  // Get standings for each pool
  const poolStandings = {};
  poolNames.forEach(poolName => {
    poolStandings[poolName] = calculateStandings(poolName).filter(s => s.status === 'Active');
  });

     const idSuffix = playoffType === 'Cup' ? 'C' : 'S';
const findMatch = (p1, p2) => matches.find(m =>
  m.id?.endsWith(idSuffix) &&
  m.status !== 'Completed' &&
  ((m.player1 === p1 && m.player2 === p2) ||
   (m.player1 === p2 && m.player2 === p1))
);
    

  const matchCard = (p1, p2, label) => {
    const m = findMatch(p1, p2);
    return { player1: p1, player2: p2, winner: m?.winner || null, status: m?.status, label };
  };

  if (playoffType === 'Cup') {
    // R12: 2nd vs 3rd in each pool
    const r12 = poolNames.map(pool => {
      const s = poolStandings[pool];
      const p1 = s[1]?.name || `${pool}2`;
      const p2 = s[2]?.name || `${pool}3`;
      return matchCard(p1, p2, `${pool}2 v ${pool}3`);
    });

    // QF: 1st vs winner of R12
    const qf = poolNames.map((pool, idx) => {
      const s = poolStandings[pool];
      const p1 = s[0]?.name || `${pool}1`;
      const r12Winner = r12[idx].winner || `Winner ${pool}R12`;
      return matchCard(p1, r12Winner, `${pool}1 v Winner ${pool}R12`);
    });

    // SF: A winner v D winner, B winner v C winner
    const sfMatches = [
      [0, 3], // A vs D
      [1, 2], // B vs C
    ].map(([i, j]) => {
      const p1 = qf[i].winner || `Winner ${poolNames[i]}QF`;
      const p2 = qf[j].winner || `Winner ${poolNames[j]}QF`;
      return matchCard(p1, p2, `${poolNames[i]} v ${poolNames[j]}`);
    });

    // Final
    const p1 = sfMatches[0].winner || 'Winner SF1';
    const p2 = sfMatches[1].winner || 'Winner SF2';
    const final = matchCard(p1, p2, 'Cup Final');

    return { r12, qf, sf: sfMatches, final, hasMatches: r12.length > 0 };
  }

  if (playoffType === 'Shield') {
    // Combine all players ranked 4th+ from each pool, sort by points then holeDiff
    const allRemaining = poolNames.flatMap(pool => {
      const s = poolStandings[pool];
      return s.slice(3); // positions 4th and beyond
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.holeDiff - a.holeDiff;
    });

    if (allRemaining.length < 2) return { r16: [], qf: [], sf: [], final: null, hasMatches: false };

    // Seed 1-16 (or however many there are)
    const seeded = allRemaining.slice(0, 16);
    const n = seeded.length;

    // R16: 1v16, 2v15, 3v14... (seed n+1-i vs seed i for top half)
    const r16 = [];
    for (let i = 0; i < n / 2; i++) {
      const p1 = seeded[i]?.name || `Seed ${i + 1}`;
      const p2 = seeded[n - 1 - i]?.name || `Seed ${n - i}`;
      r16.push(matchCard(p1, p2, `S${i + 1} v S${n - i}`));
    }

    // QF: winners from r16[0] v r16[7], r16[1] v r16[6], r16[2] v r16[5], r16[3] v r16[4]
    const qf = [
      [0, 7], [1, 6], [2, 5], [3, 4]
    ].map(([i, j]) => {
      const p1 = r16[i]?.winner || `Winner R16 M${i + 1}`;
      const p2 = r16[j]?.winner || `Winner R16 M${j + 1}`;
      return matchCard(p1, p2, `QF`);
    });

    // SF
    const sf = [
      [0, 3], [1, 2]
    ].map(([i, j]) => {
      const p1 = qf[i]?.winner || `Winner QF${i + 1}`;
      const p2 = qf[j]?.winner || `Winner QF${j + 1}`;
      return matchCard(p1, p2, 'SF');
    });

    // Final
    const fp1 = sf[0]?.winner || 'Winner SF1';
    const fp2 = sf[1]?.winner || 'Winner SF2';
    const final = matchCard(fp1, fp2, 'Shield Final');

    return { r16, qf, sf, final, hasMatches: r16.length > 0 };
  }

  return { hasMatches: false };
};   

const ROUND_ROBIN_DRAW = [
  [0, 7], [1, 6], [2, 5], [3, 4], // Round 1
  [0, 4], [1, 5], [2, 6], [3, 7], // Round 2
  [0, 5], [1, 7], [2, 4], [3, 6], // Round 3
];

const useShieldTournament = (pools, players, matches, calculateStandings) => {
  const seededPlayers = useMemo(() => {
    const poolNames = [...new Set(pools.map(p => p.pool))]
      .filter(p => !p.toLowerCase().includes('cup') && !p.toLowerCase().includes('shield') && !p.toLowerCase().includes('plate'))
      .sort();

    const allPlayers = poolNames.flatMap(poolName => {
      const poolPlayers = pools.filter(p => p.pool === poolName);
      return poolPlayers.map(player => {
        const playerData = players.find(p => p.name === player.player);
        if (playerData?.status !== 'Active' && playerData?.status !== undefined) return null;
        if (playerData?.status === undefined && player.player) {
          // keep if no player record found, assume active
        }
        const status = playerData?.status || 'Active';
        if (status !== 'Active') return null;

        const poolMatches = matches.filter(m =>
          m.status === 'Completed' &&
          !m.id?.endsWith('S') && !m.id?.endsWith('C') &&
          (m.player1 === player.player || m.player2 === player.player)
        );

        let holesWon = 0, holesLost = 0, matchWins = 0, matchTies = 0;
        poolMatches.forEach(match => {
          const isP1 = match.player1 === player.player;
          let p1h = 0, p2h = 0;
          match.scoresJson?.forEach(score => {
            if (score.scored) {
              if (score.p1 < score.p2) p1h++;
              else if (score.p2 < score.p1) p2h++;
            }
          });
          if (isP1) { holesWon += p1h; holesLost += p2h; }
          else { holesWon += p2h; holesLost += p1h; }
          if (match.winner === player.player) matchWins++;
          else if (!match.winner || match.winner === 'Tie') matchTies++;
        });

        return {
          name: player.player,
          points: (matchWins * 3) + matchTies,
          holeDiff: holesWon - holesLost,
        };
      }).filter(Boolean);
    });

// Get top 3 names from each pool to exclude
const cupPlayers = new Set();
poolNames.forEach(poolName => {
  const standings = calculateStandings(poolName)
    .filter(s => s.status === 'Active')
    .slice(0, 3);
  standings.forEach(s => cupPlayers.add(s.name));
});

const seen = new Set();
return allPlayers
  .filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; })
  .filter(p => !cupPlayers.has(p.name))
  .sort((a, b) => b.points !== a.points ? b.points - a.points : b.holeDiff - a.holeDiff)
  .slice(0, 8);
  }, [pools, players, matches]); 

  const roundRobinMatches = useMemo(() => {
    if (seededPlayers.length < 8) return [];
    return ROUND_ROBIN_DRAW.map(([i, j], idx) => {
      const p1 = seededPlayers[i].name;
      const p2 = seededPlayers[j].name;
      const round = Math.floor(idx / 4) + 1;
      const matchNum = (idx % 4) + 1;
      const result = matches.find(m =>
        m.id?.endsWith('S') &&
        ((m.player1 === p1 && m.player2 === p2) || (m.player1 === p2 && m.player2 === p1))
      );
      let p1Holes = 0, p2Holes = 0;
      result?.scoresJson?.forEach(score => {
        if (score.scored) {
          if (score.p1 < score.p2) p1Holes++;
          else if (score.p2 < score.p1) p2Holes++;
        }
      });
      if (result && result.player1 === p2) [p1Holes, p2Holes] = [p2Holes, p1Holes];
      return { id: result?.id || `shield-r${round}-m${matchNum}`, round, matchNum, player1: p1, player2: p2, seed1: i + 1, seed2: j + 1, winner: result?.winner || null, status: result?.status || 'scheduled', p1Holes, p2Holes };
    });
  }, [seededPlayers, matches]);

  const tournamentStandings = useMemo(() => {
    return seededPlayers.map(player => {
      const playerMatches = roundRobinMatches.filter(m => m.player1 === player.name || m.player2 === player.name);
      let points = 0, holeDiff = 0, played = 0, wins = 0, losses = 0;
      playerMatches.forEach(m => {
        if (!m.winner) return;
        played++;
        const isP1 = m.player1 === player.name;
        const myHoles = isP1 ? m.p1Holes : m.p2Holes;
        const oppHoles = isP1 ? m.p2Holes : m.p1Holes;
        holeDiff += myHoles - oppHoles;
        if (m.winner === player.name) { points += 3; wins++; }
        else { losses++; }
      });
      return { name: player.name, points, holeDiff, played, wins, losses };
    }).sort((a, b) => b.points !== a.points ? b.points - a.points : b.holeDiff - a.holeDiff);
  }, [seededPlayers, roundRobinMatches]);

  const allRoundsComplete = roundRobinMatches.length === 12 && roundRobinMatches.every(m => m.winner);

  const findFinalMatch = (p1, p2) => matches.find(m =>
    m.id?.endsWith('S') &&
    ((m.player1 === p1 && m.player2 === p2) || (m.player1 === p2 && m.player2 === p1)) &&
    (m.id?.includes('final') || m.id?.includes('3rd'))
  );

  const finalist1 = tournamentStandings[0]?.name || 'TBD';
  const finalist2 = tournamentStandings[1]?.name || 'TBD';
  const thirdPlace1 = tournamentStandings[2]?.name || 'TBD';
  const thirdPlace2 = tournamentStandings[3]?.name || 'TBD';

  const shieldFinal = findFinalMatch(finalist1, finalist2) ||
    { player1: finalist1, player2: finalist2, winner: null, status: 'scheduled' };
  const thirdPlaceFinal = findFinalMatch(thirdPlace1, thirdPlace2) ||
    { player1: thirdPlace1, player2: thirdPlace2, winner: null, status: 'scheduled' };

  return { seededPlayers, roundRobinMatches, tournamentStandings, allRoundsComplete, shieldFinal, thirdPlaceFinal };
};

const ShieldTournament = ({ pools, players, matches, currentUser, calculateStandings }) => {
  const [expandedRound, setExpandedRound] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showFinalsModal, setShowFinalsModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isAdmin = currentUser?.name === ADMIN_USER;

  const {
    seededPlayers,
    roundRobinMatches,
    tournamentStandings,
    allRoundsComplete,
    shieldFinal,
    thirdPlaceFinal,
  } = useShieldTournament(pools, players, matches, calculateStandings);

  const roundRobinAlreadyGenerated = matches.some(m => m.id?.startsWith('shield-r'));

  const finalsAlreadyGenerated = matches.some(m =>
    m.id === 'shield-final' || m.id === 'shield-3rd'
  );

  const round1Complete = roundRobinMatches.filter(m => m.round === 1).every(m => m.winner);
  const round2Complete = roundRobinMatches.filter(m => m.round === 2).every(m => m.winner);
  const round3Complete = roundRobinMatches.filter(m => m.round === 3).every(m => m.winner);
  const anyRoundComplete = round1Complete || round2Complete || round3Complete;

  const generateRoundRobinMatchList = () => {
    return ROUND_ROBIN_DRAW.map(([i, j], idx) => {
      const round = Math.floor(idx / 4) + 1;
      const matchNum = (idx % 4) + 1;
      return {
        id: `shield-r${round}-m${matchNum}`,
        date: SHIELD_DATE,
        venue: SHIELD_VENUE,
        player1: seededPlayers[i]?.name,
        player2: seededPlayers[j]?.name,
        round,
        matchNum,
      };
    }).filter(m => m.player1 && m.player2);
  };

  const generateFinalsMatchList = () => {
    const finalist1 = tournamentStandings[0]?.name;
    const finalist2 = tournamentStandings[1]?.name;
    const third1 = tournamentStandings[2]?.name;
    const third2 = tournamentStandings[3]?.name;
    const list = [];
    if (finalist1 && finalist2) {
      list.push({ id: 'shield-final', date: SHIELD_DATE, venue: SHIELD_VENUE, player1: finalist1, player2: finalist2, label: '🛡️ Shield Final' });
    }
    if (third1 && third2) {
      list.push({ id: 'shield-3rd', date: SHIELD_DATE, venue: SHIELD_VENUE, player1: third1, player2: third2, label: '🥉 3rd Place Playoff' });
    }
    return list;
  };

  const handleGenerateRoundRobin = async () => {
    setGenerating(true);
    const matchList = generateRoundRobinMatchList();
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createMatches', matches: matchList }),
        mode: 'no-cors'
      });
      triggerHaptic('success');
      setShowGenerateModal(false);
    } catch (err) {
      console.error('Error generating matches:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFinals = async () => {
    setGenerating(true);
    const matchList = generateFinalsMatchList();
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createMatches', matches: matchList }),
        mode: 'no-cors'
      });
      triggerHaptic('success');
      setShowFinalsModal(false);
    } catch (err) {
      console.error('Error generating finals:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (seededPlayers.length < 8) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        <p>Shield tournament requires 8 players.</p>
        <p className="text-xs mt-1">Currently {seededPlayers.length} eligible players.</p>
      </div>
    );
  }

  const rounds = [1, 2, 3];

  return (
    <div className="space-y-4 p-4">

      {/* Seedings */}
      <div className="bg-gray-50 rounded-xl p-3">
        <h4 className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wide">Seeds</h4>
        <div className="grid grid-cols-2 gap-1">
          {seededPlayers.map((p, idx) => (
            <div key={p.name} className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-xs"
                style={{ backgroundColor: BRAND_PRIMARY }}>
                {idx + 1}
              </span>
              <span className={`font-semibold ${p.name === currentUser?.name ? 'text-green-600' : 'text-gray-700'}`}>
                {formatPlayerName(p.name)}
              </span>
              <span className="text-gray-400">{p.points}pts</span>
            </div>
          ))}
        </div>

        {/* Admin: Generate Round Robin Button */}
        {isAdmin && !roundRobinAlreadyGenerated && (
          <button
            onClick={() => setShowGenerateModal(true)}
            className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            ⚙ Generate All Round Robin Matches
          </button>
        )}
        {isAdmin && roundRobinAlreadyGenerated && (
          <div className="mt-3 text-center text-xs text-green-600 font-semibold">✓ Round robin matches generated</div>
        )}
      </div>

      {/* Round Robin Matches */}
      {rounds.map(round => {
        const roundMatches = roundRobinMatches.filter(m => m.round === round);
        const roundComplete = roundMatches.every(m => m.winner);
        const isExpanded = expandedRound === round;

        return (
          <div key={round} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedRound(isExpanded ? null : round)}
              className="w-full px-4 py-3 flex items-center justify-between"
              style={{ background: `linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})` }}
            >
              <div className="text-left">
                <span className="font-bold text-white text-sm">Round {round}</span>
                {roundComplete && <span className="ml-2 text-white/70 text-xs">✓ Complete</span>}
              </div>
              <span className={`text-white transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
            </button>

            {isExpanded && (
              <div className="p-3 space-y-2">
                {roundMatches.map((m, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${m.winner === m.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                          <span className="text-gray-400 text-xs mr-1">S{m.seed1}</span>
                          {formatPlayerName(m.player1)}
                          {m.winner === m.player1 && <span className="ml-1 text-xs">✓</span>}
                        </div>
                        <div className="text-center text-xs text-gray-400 my-0.5">vs</div>
                        <div className={`text-sm font-semibold ${m.winner === m.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                          <span className="text-gray-400 text-xs mr-1">S{m.seed2}</span>
                          {formatPlayerName(m.player2)}
                          {m.winner === m.player2 && <span className="ml-1 text-xs">✓</span>}
                        </div>
                      </div>
                      {m.winner && (
                        <div className="text-right ml-3">
                          <div className="text-lg font-bold text-gray-700">{m.p1Holes} – {m.p2Holes}</div>
                          <div className="text-xs text-gray-400">holes</div>
                        </div>
                      )}
                      {!m.winner && <div className="text-xs text-gray-400 ml-3">Pending</div>}
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
                <th className="text-left py-2 pr-2 text-gray-600 font-semibold w-6">#</th>
                <th className="text-left py-2 pr-2 text-gray-600 font-semibold">Player</th>
                <th className="text-center py-2 px-1 text-gray-600 font-semibold">P</th>
                <th className="text-center py-2 px-1 text-gray-600 font-semibold">W</th>
                <th className="text-center py-2 px-1 text-gray-600 font-semibold">L</th>
                <th className="text-center py-2 px-1 text-gray-600 font-semibold">+/-</th>
                <th className="text-center py-2 pl-2 text-gray-600 font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {tournamentStandings.map((s, idx) => (
                <tr key={s.name} className={`border-b border-gray-100 ${s.name === currentUser?.name ? 'bg-green-50' : ''}`}>
                  <td className="py-2 pr-2 text-gray-500 font-semibold">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
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

          {/* Admin: Generate Finals Button */}
          {isAdmin && anyRoundComplete && !finalsAlreadyGenerated && tournamentStandings.length >= 4 && (
            <button
              onClick={() => setShowFinalsModal(true)}
              className="mt-3 w-full py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              ⚙ Generate Finals Matches
            </button>
          )}
          {isAdmin && finalsAlreadyGenerated && (
            <div className="mt-3 text-center text-xs text-green-600 font-semibold">✓ Finals matches generated</div>
          )}
        </div>
      </div>

      {/* Finals */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
            <h4 className="font-bold text-gray-700 text-sm">🥉 3rd Place Playoff</h4>
            {!anyRoundComplete && <p className="text-xs text-gray-400">Available after rounds complete</p>}
          </div>
          <div className="p-3">
            <div className={`text-sm font-semibold ${thirdPlaceFinal.winner === thirdPlaceFinal.player1 ? 'text-green-600' : 'text-gray-700'}`}>
              {formatPlayerName(thirdPlaceFinal.player1)}{thirdPlaceFinal.winner === thirdPlaceFinal.player1 && ' 🥉'}
            </div>
            <div className="text-xs text-gray-400 my-1 text-center">vs</div>
            <div className={`text-sm font-semibold ${thirdPlaceFinal.winner === thirdPlaceFinal.player2 ? 'text-green-600' : 'text-gray-700'}`}>
              {formatPlayerName(thirdPlaceFinal.player2)}{thirdPlaceFinal.winner === thirdPlaceFinal.player2 && ' 🥉'}
            </div>
          </div>
        </div>

        <div className="rounded-xl shadow-sm overflow-hidden border-2" style={{ borderColor: BRAND_SECONDARY }}>
          <div className="px-4 py-2 border-b" style={{ backgroundColor: `${BRAND_SECONDARY}20` }}>
            <h4 className="font-bold text-gray-800 text-sm">🛡️ Shield Final</h4>
            {!anyRoundComplete && <p className="text-xs text-gray-400">Available after rounds complete</p>}
          </div>
          <div className="p-3">
            <div className={`text-sm font-bold ${shieldFinal.winner === shieldFinal.player1 ? 'text-green-600' : 'text-gray-700'}`}>
              {formatPlayerName(shieldFinal.player1)}{shieldFinal.winner === shieldFinal.player1 && ' 🛡️'}
            </div>
            <div className="text-xs text-gray-400 my-1 text-center">vs</div>
            <div className={`text-sm font-bold ${shieldFinal.winner === shieldFinal.player2 ? 'text-green-600' : 'text-gray-700'}`}>
              {formatPlayerName(shieldFinal.player2)}{shieldFinal.winner === shieldFinal.player2 && ' 🛡️'}
            </div>
            {shieldFinal.winner && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-center font-bold text-sm" style={{ color: BRAND_PRIMARY }}>
                🛡️ Champion: {formatPlayerName(shieldFinal.winner)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Round Robin Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Generate Round Robin Matches</h3>
            <p className="text-xs text-gray-500 mb-4">Date: 1 March 2026 • Venue: WEP</p>
            <div className="space-y-1 mb-6 max-h-64 overflow-y-auto">
              {generateRoundRobinMatchList().map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500 font-semibold w-20">R{m.round} M{m.matchNum}</span>
                  <span className="text-gray-700 font-semibold">{formatPlayerName(m.player1)} vs {formatPlayerName(m.player2)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGenerateModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">
                Cancel
              </button>
              <button onClick={handleGenerateRoundRobin} disabled={generating}
                className="flex-1 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ backgroundColor: BRAND_PRIMARY }}>
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
              <button onClick={() => setShowFinalsModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold">
                Cancel
              </button>
              <button onClick={handleGenerateFinals} disabled={generating}
                className="flex-1 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                style={{ backgroundColor: BRAND_PRIMARY }}>
                {generating ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const StandingsPage = ({ 
  currentUser, 
  matches, 
  pools,
  players,
  onLogout, 
  onChangePin, 
  onViewMatches,
  darkMode,
  setDarkMode,
  isOnline,
  pendingUpdates,
  onRefresh,
  isLoading
}) => {
  const [expandedSections, setExpandedSections] = useState({
    pools: true,
    crossover1: false,
    crossover2: false,
    cup: false,
    shield: false
  });
  const [showLiveScores, setShowLiveScores] = useState(false);
  
  const toggleSection = useCallback((section) => {
    triggerHaptic('light');
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);
  
  const { calculateStandings, getPoolNames } = useStandingsCalculations(pools, players, matches);
  const { week1, week2 } = useCrossoverMatches(pools, players, matches);

  const poolNames = useMemo(() => 
    getPoolNames().filter(p => 
      !p.toLowerCase().includes('cup') && 
      !p.toLowerCase().includes('shield') && 
      !p.toLowerCase().includes('plate')
    ),
    [getPoolNames]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentUser={currentUser}
        onLogout={onLogout}
        onChange={onChangePin}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onRefresh={onRefresh}
        isLoading={isLoading}
        isOnline={isOnline}
        pendingUpdates={pendingUpdates}
        showTabs
        activeTab="standings"
        onTabChange={(tab) => {
          if (tab === 'matches') onViewMatches();
          if (tab === 'live') setShowLiveScores(true);
        }}
      />
      
      <div className="max-w-md mx-auto px-4 py-6">
        {pools.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="text-gray-400" size={28} />
            </div>
            <p className="text-gray-500">No pools configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            <CollapsibleSection
              title="Pool Standings"
              isExpanded={expandedSections.pools}
              onToggle={() => toggleSection('pools')}
              headerStyle="primary"
            >
              <div className="p-4 space-y-4">
                {poolNames.map(poolName => {
                  const standings = calculateStandings(poolName);
                  return (
                    <div key={poolName} className="bg-gray-50 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-gray-200">
                        <h3 className="font-bold text-gray-900 text-sm">{poolName}</h3>
                      </div>
                      <div className="p-3">
                        <StandingsTable standings={standings} currentUser={currentUser} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Crossover Week 1"
              subtitle="15 February 7:00pm • A vs B, C vs D"
              isExpanded={expandedSections.crossover1}
              onToggle={() => toggleSection('crossover1')}
              headerStyle="gray"
            >
              <div className="p-4">
                {week1.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    <p>Crossover matches will appear after pool play.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl overflow-hidden" style={{borderTop: '3px solid ' + BRAND_ACCENT}}>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {week1.map((match, idx) => (
                          <CrossoverMatchCard key={idx} match={match} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Crossover Week 2"
              subtitle="22 February 7:00pm • A vs C, B vs D"
              isExpanded={expandedSections.crossover2}
              onToggle={() => toggleSection('crossover2')}
              headerStyle="gray"
            >
              <div className="p-4">
                {week2.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    <p>Crossover matches will appear after pool play.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl overflow-hidden" style={{borderTop: '3px solid ' + BRAND_ACCENT}}>
                    <div className="p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {week2.map((match, idx) => (
                          <CrossoverMatchCard key={idx} match={match} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Cup Final */}
<CollapsibleSection
  title="🏆 Cup Final"
  subtitle="Top 3 from each pool"
  isExpanded={expandedSections.cup}
  onToggle={() => toggleSection('cup')}
  headerStyle="secondary"
>
  {(() => {
    const bracket = generatePlayoffBrackets('Cup', pools, players, matches, calculateStandings);
    if (!bracket.hasMatches) return (
      <div className="p-6 text-center text-gray-500 text-sm">
        <p>Pool play not complete yet.</p>
        <p className="text-xs mt-2">Brackets will populate based on pool standings.</p>
      </div>
    );
    return (
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {/* R12 */}
          <div className="flex-shrink-0 w-40">
            <div className="text-center font-bold text-xs text-gray-600 mb-3">R12</div>
            <div className="space-y-2">
              {bracket.r12.map((m, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                  <div className="text-center text-xs font-semibold text-gray-400 mb-1">{m.label}</div>
                  <div className={`font-semibold ${m.winner === m.player1 ? 'text-green-600' : 'text-gray-700'}`}>{formatPlayerName(m.player1)}</div>
                  <div className="text-gray-400 text-center my-0.5">vs</div>
                  <div className={`font-semibold ${m.winner === m.player2 ? 'text-green-600' : 'text-gray-700'}`}>{formatPlayerName(m.player2)}</div>
                </div>
              ))}
            </div>
          </div>
          {/* QF */}
          <div className="flex-shrink-0 w-40">
            <div className="text-center font-bold text-xs text-gray-600 mb-3">QF</div>
            <div className="space-y-2">
              {bracket.qf.map((m, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                  <div className={`font-semibold ${m.winner === m.player1 ? 'text-green-600' : 'text-gray-700'}`}>{m.player1.includes('Winner') ? m.player1 : formatPlayerName(m.player1)}</div>
                  <div className="text-gray-400 text-center my-0.5">vs</div>
                  <div className={`font-semibold ${m.winner === m.player2 ? 'text-green-600' : 'text-gray-700'}`}>{m.player2.includes('Winner') ? m.player2 : formatPlayerName(m.player2)}</div>
                </div>
              ))}
            </div>
          </div>
          {/* SF */}
          <div className="flex-shrink-0 w-40">
            <div className="text-center font-bold text-xs text-gray-600 mb-3">SF</div>
            <div className="space-y-2">
              {bracket.sf.map((m, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                  <div className={`font-semibold ${m.winner === m.player1 ? 'text-green-600' : 'text-gray-700'}`}>{m.player1.includes('Winner') ? m.player1 : formatPlayerName(m.player1)}</div>
                  <div className="text-gray-400 text-center my-0.5">vs</div>
                  <div className={`font-semibold ${m.winner === m.player2 ? 'text-green-600' : 'text-gray-700'}`}>{m.player2.includes('Winner') ? m.player2 : formatPlayerName(m.player2)}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Final */}
          <div className="flex-shrink-0 w-40">
            <div className="text-center font-bold text-xs text-gray-600 mb-3">Final</div>
            <div className="rounded-lg p-3 text-xs border-2" style={{borderColor: BRAND_SECONDARY, backgroundColor: `${BRAND_SECONDARY}10`}}>
              <div className={`font-bold ${bracket.final.winner === bracket.final.player1 ? 'text-green-600' : 'text-gray-700'}`}>{bracket.final.player1.includes('Winner') ? bracket.final.player1 : formatPlayerName(bracket.final.player1)}</div>
              <div className="text-gray-400 text-center my-1">vs</div>
              <div className={`font-bold ${bracket.final.winner === bracket.final.player2 ? 'text-green-600' : 'text-gray-700'}`}>{bracket.final.player2.includes('Winner') ? bracket.final.player2 : formatPlayerName(bracket.final.player2)}</div>
              {bracket.final.winner && !bracket.final.winner.includes('Winner') && (
                <div className="mt-2 pt-2 border-t border-gray-300 text-center font-bold" style={{color: BRAND_PRIMARY}}>🏆 {formatPlayerName(bracket.final.winner)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  })()}
</CollapsibleSection>

{/* Shield Final */}
<CollapsibleSection
  title="🛡️ Shield Tournament"
  subtitle="Round robin • Top 2 play final"
  isExpanded={expandedSections.shield}
  onToggle={() => toggleSection('shield')}
  headerStyle="gray"
>
<ShieldTournament
  pools={pools}
  players={players}
  matches={matches}
  currentUser={currentUser}
  calculateStandings={calculateStandings}
/>
</CollapsibleSection>
          </div>
        )}
      </div>

      {showLiveScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <LiveScoresPage onBack={() => {
              triggerHaptic('light');
              setShowLiveScores(false);
            }} />
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
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLiveScores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getLiveScores`);
      if (!response.ok) throw new Error('Failed to load data');
      
      const data = await response.json();
      const matchesData = data.matches.slice(1).map(row => ({
        id: row[0], 
        date: row[1], 
        venue: row[2], 
        player1: row[3], 
        player2: row[4],
        startTime: row[5], 
        endTime: row[6], 
        scoresJson: row[7] ? JSON.parse(row[7]) : [],
        winner: row[8], 
        status: row[9] || 'scheduled'
      }));
      
      setMatches(matchesData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading live scores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveScores();
  }, [fetchLiveScores]);

  const inProgressMatches = useMemo(() => 
    matches.filter(m => m.status === 'In-progress'),
    [matches]
  );

  const completedToday = useMemo(() => {
    const today = new Date().toLocaleDateString('en-NZ', { day: '2-digit', month: 'long' });
    return matches.filter(m => m.status === 'Completed' && m.date === today);
  }, [matches]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4">
              <X size={24} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Live Scores</h2>
          </div>
          <button 
            onClick={() => {
              triggerHaptic('light');
              fetchLiveScores();
            }}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <div className={loading ? 'animate-spin' : ''}>🔄</div>
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-6 text-center">
          Updated: {formatTimeAgo(lastUpdated)}
        </p>

        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <h3 className="text-lg font-bold text-gray-900">
              In Progress ({inProgressMatches.length})
            </h3>
          </div>

          {inProgressMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">No matches in progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressMatches.map(match => {
                const stats = calculateMatchStats(match);
                const p1Name = formatPlayerName(match.player1);
                const p2Name = formatPlayerName(match.player2);
                const p1Leading = stats.p1Holes > stats.p2Holes;
                const p2Leading = stats.p2Holes > stats.p1Holes;

                return (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <span className={`${p1Leading ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                          {p1Name} ({stats.p1Holes})
                        </span>
                        <span className="text-gray-400 mx-2">v</span>
                        <span className={`${p2Leading ? 'font-bold text-green-600' : 'text-gray-900'}`}>
                          {p2Name} ({stats.p2Holes})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        thru {stats.lastHole === 0 ? 'starting' : stats.lastHole > 18 ? `P${stats.lastHole - 18}` : stats.lastHole}
                      </span>
                      <span className="text-gray-500 text-xs">{match.venue}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {completedToday.length > 0 && (
          <div>
            <div className="flex items-center mb-4">
              <Check size={16} className="text-green-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">
                Completed Today ({completedToday.length})
              </h3>
            </div>

            <div className="space-y-3">
              {completedToday.map(match => {
                const stats = calculateMatchStats(match);
                const p1Name = formatPlayerName(match.player1);
                const p2Name = formatPlayerName(match.player2);
                const winnerName = formatPlayerName(match.winner);

                return (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <span className={`${match.winner === match.player1 ? 'font-bold text-green-600' : 'text-gray-600'}`}>
                          {p1Name} ({stats.p1Holes})
                        </span>
                        <span className="text-gray-400 mx-2">v</span>
                        <span className={`${match.winner === match.player2 ? 'font-bold text-green-600' : 'text-gray-600'}`}>
                          {p2Name} ({stats.p2Holes})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 font-semibold">
                        {winnerName} won
                      </span>
                      <span className="text-gray-500 text-xs">{match.venue}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SCORING PAGE
// ============================================

const ScoringPage = ({ match, startingHole, courses, onCancel, onComplete }) => {
  const [scores, setScores] = useState([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [showLiveScores, setShowLiveScores] = useState(false);
  
  const course = useMemo(() => 
    courses.find(c => c.name === match.venue || c.code === match.venue),
    [courses, match.venue]
  );

  useEffect(() => {
    const stored = localStorage.getItem(`match-progress-${match.id}`);
    if (stored) {
      const progress = JSON.parse(stored);
      setScores(progress.scores);
      setCurrentHole(progress.currentHole);
    } else {
      const startHoleNum = Number(startingHole);
      const initScores = Array(18).fill(null).map((_, idx) => {
        const actualHoleNumber = ((startHoleNum - 1 + idx) % 18) + 1;
        const par = course?.pars[actualHoleNumber] || 3;
        return { p1: par, p2: par, scored: false };
      });
      
      setScores(initScores);
      setCurrentHole(0);
    }
  }, [match.id, startingHole, course]);

  useEffect(() => {
    const updateMatchStatus = async () => {
      try {
         fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'updateStatus',
            matchId: match.id, 
            status: 'In-progress' 
          }),
          mode: 'no-cors'
        });
      } catch (err) {
        console.error('Error updating match status:', err);
      }
    };
    
    if (match.status !== 'In-progress') {
      updateMatchStatus();
    }
  }, [match.id, match.status]);

  useEffect(() => {
    if (scores.length > 0) {
      localStorage.setItem(`match-progress-${match.id}`, JSON.stringify({
        matchId: match.id,
        scores,
        currentHole,
        startingHole,
        timestamp: Date.now()
      }));
    }
  }, [scores, currentHole, match.id, startingHole]);

  const calculateMatchStatus = useCallback(() => {
    let p1Holes = 0;
    let p2Holes = 0;
    let holesPlayed = 0;
    
    scores.forEach((score) => {
      if (score.scored) {
        holesPlayed++;
        const p1Adjusted = applyJuniorHandicap(score.p1, match.player1);
        const p2Adjusted = applyJuniorHandicap(score.p2, match.player2);
        
        if (p1Adjusted < p2Adjusted) p1Holes++;
        else if (p2Adjusted < p1Adjusted) p2Holes++;
      }
    });
      
    const lead = Math.abs(p1Holes - p2Holes);
    const leader = p1Holes > p2Holes ? match.player1 : 
                   p2Holes > p1Holes ? match.player2 : null;
    
    const holesRemaining = Math.max(0, scores.length - holesPlayed);
    const isComplete = (holesPlayed >= 18 && leader !== null) || (lead > holesRemaining && holesPlayed > 0);
    const needsPlayoff = holesPlayed >= 18 && p1Holes === p2Holes;
    
    return { p1Holes, p2Holes, holesPlayed, lead, leader, isComplete, needsPlayoff };
  }, [scores, match.player1, match.player2]);

  const recordScore = useCallback(async () => {
    if (scores[currentHole]?.p1 > 0 && scores[currentHole]?.p2 > 0) {
      triggerHaptic('medium');
      const newScores = [...scores];
      newScores[currentHole] = { ...newScores[currentHole], scored: true };
      setScores(newScores);
      
      try {
         fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'updateProgress',
            matchId: match.id, 
            scores: newScores 
          }),
          mode: 'no-cors'
        });
      } catch (err) {
        console.error('Error updating progress:', err);
      }
      
      if (currentHole < scores.length - 1) {
        setCurrentHole(currentHole + 1);
      }
    }
  }, [scores, currentHole, match.id]);

  const updateScore = useCallback((player, delta) => {
    triggerHaptic('light');
    const newScores = [...scores];
    const current = newScores[currentHole]?.[player] || 0;
    newScores[currentHole] = {
      ...newScores[currentHole],
      [player]: Math.max(1, current + delta)
    };
    setScores(newScores);
  }, [scores, currentHole]);

  const addPlayoffHole = useCallback(() => {
    triggerHaptic('medium');
    const playoffPar = course?.pars[1] || 3;
    const newScores = [...scores, { p1: playoffPar, p2: playoffPar, scored: false }];
    setScores(newScores);
    setCurrentHole(scores.length);
  }, [scores, course]);

  const handleComplete = useCallback(() => {
    const status = calculateMatchStatus();
    if (!status.leader) return;
    
    triggerHaptic('success');
    localStorage.removeItem(`match-progress-${match.id}`);
    onComplete(scores, status.leader);
  }, [calculateMatchStatus, match.id, scores, onComplete]);

  const calculateVsPar = useCallback((playerScores) => {
    let totalScore = 0;
    let totalPar = 0;
    
    scores.forEach((score, idx) => {
      if (score.scored) {
        totalScore += playerScores === 'p1' ? score.p1 : score.p2;
        const actualHoleNumber = idx < 18 ? ((Number(startingHole) - 1 + idx) % 18) + 1 : 1;
        const par = course?.pars[actualHoleNumber] || 3;
        totalPar += par;
      }
    });
    
    const diff = totalScore - totalPar;
    if (diff === 0) return 'E';
    if (diff < 0) return String(diff);
    return `+${diff}`;
  }, [scores, startingHole, course]);

  const status = useMemo(() => calculateMatchStatus(), [calculateMatchStatus]);
  const actualHoleNumber = currentHole < 18 ? ((Number(startingHole) - 1 + currentHole) % 18) + 1 : currentHole - 17;
  const par = currentHole < 18 && course ? course.pars[actualHoleNumber] : 3;
  
  const player1FirstName = formatPlayerName(match.player1);
  const player2FirstName = formatPlayerName(match.player2);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={onCancel} className="text-blue-600 font-medium text-sm">
          ← Cancel Match
        </button>
        <button 
          onClick={() => {
            triggerHaptic('light');
            setShowLiveScores(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
        >
          📊 Live Scores
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-2">
        <div className="rounded-2xl shadow-sm p-4 mb-4" style={{backgroundColor: BRAND_PRIMARY}}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">
                Hole {currentHole < 18 ? actualHoleNumber : `Playoff ${actualHoleNumber}`}
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
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-gray-900 text-base w-20">{player1FirstName}</div>
            <button 
              onClick={() => updateScore('p1', -1)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Minus size={18} />
            </button>
            <div className="text-4xl font-bold text-gray-900 w-16 text-center">
              {scores[currentHole]?.p1 || 0}
            </div>
            <button 
              onClick={() => updateScore('p1', 1)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Plus size={18} />
            </button>
            <div className="text-2xl font-bold text-blue-600 w-12 text-center">{status.p1Holes}</div>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-bold text-gray-900 text-base w-20">{player2FirstName}</div>
            <button 
              onClick={() => updateScore('p2', -1)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Minus size={18} />
            </button>
            <div className="text-4xl font-bold text-gray-900 w-16 text-center">
              {scores[currentHole]?.p2 || 0}
            </div>
            <button 
              onClick={() => updateScore('p2', 1)}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Plus size={18} />
            </button>
            <div className="text-2xl font-bold text-blue-600 w-12 text-center">{status.p2Holes}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button 
            onClick={() => {
              triggerHaptic('light');
              setCurrentHole(Math.max(0, currentHole - 1));
            }}
            disabled={currentHole === 0}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            Previous
          </button>
          <button 
            onClick={recordScore}
            disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            Next Hole
          </button>
        </div>

        {status.isComplete ? (
          <button 
            onClick={handleComplete}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors mb-3 text-sm"
          >
            Submit Scorecard
          </button>
        ) : status.needsPlayoff ? (
          <button 
            onClick={addPlayoffHole}
            className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-semibold hover:bg-orange-700 transition-colors mb-3 text-sm"
          >
            Add Playoff Hole
          </button>
        ) : (
          <div className="w-full bg-gray-400 text-white py-2.5 rounded-xl font-semibold text-center mb-3 text-sm">
            Match In Progress
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-3">
          <h4 className="font-bold text-gray-900 mb-2 text-sm">Scorecard</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 font-semibold text-gray-700 sticky left-0 bg-white">Hole</th>
                  {scores.slice(0, 18).map((_, idx) => {
                    const holeNum = ((Number(startingHole) - 1 + idx) % 18) + 1;
                    return (
                      <th key={idx} className="px-1 py-1.5 text-center min-w-[28px]">
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setCurrentHole(idx);
                          }}
                          className={`font-bold text-sm transition-colors rounded-md px-1 ${
  currentHole === idx 
    ? 'bg-green-700 text-white' 
    : 'text-gray-700 hover:text-blue-500'
}`}
                        >
                          {holeNum}
                        </button>
                      </th>
                    );
                  })}
                  {scores.length > 18 && scores.slice(18).map((_, idx) => {
                    const playoffIdx = 18 + idx;
                    return (
                      <th key={`playoff-${idx}`} className="px-1 py-1.5 text-center min-w-[28px]">
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setCurrentHole(playoffIdx);
                          }}
                          className={`font-semibold transition-colors ${
                            currentHole === playoffIdx 
                              ? 'text-blue-600 underline' 
                              : 'text-gray-700 hover:text-blue-500'
                          }`}
                        >
                          P{idx + 1}
                        </button>
                      </th>
                    );
                  })}
                  <th className="text-center py-1.5 pl-2 font-semibold text-gray-700 border-l border-gray-200 sticky right-0 bg-white">vs Par</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 text-gray-900 font-bold text-sm sticky left-0 bg-white">
                    {player1FirstName}
                    {isJuniorPlayer(match.player1) && <span className="ml-1 text-xs text-blue-600">(J)</span>}
                  </td>
                  {scores.map((score, idx) => {
                    const adjustedP1 = applyJuniorHandicap(score.p1, match.player1);
                    const adjustedP2 = applyJuniorHandicap(score.p2, match.player2);
                    
                    return (
                      <td key={idx} className={`px-1 py-1.5 text-center font-extrabold text-sm ${
                        !score.scored ? 'text-gray-400' :
                        adjustedP1 < adjustedP2 ? 'text-blue-600 bg-blue-50' : 
                        adjustedP1 === adjustedP2 ? 'text-gray-600' : 
                        'text-gray-900'
                      }`}>
                        {score.scored ? (
                          <>
                            {score.p1}
                            {isJuniorPlayer(match.player1) && score.p1 > 1 && (
                              <span className="text-xs text-blue-600"> (-1)</span>
                            )}
                          </>
                        ) : '-'}
                      </td>
                    );
                  })}
                  <td className={`py-1.5 pl-2 text-center font-bold border-l border-gray-200 sticky right-0 bg-white ${
                    calculateVsPar('p1').includes('-') ? 'text-green-600' : 
                    calculateVsPar('p1').includes('+') ? 'text-red-600' : 
                    'text-gray-900'
                  }`}>
                    {calculateVsPar('p1')}
                  </td>
                </tr>
                
                <tr>
                  <td className="py-1.5 pr-2 text-gray-900 font-bold text-sm sticky left-0 bg-white">
                    {player2FirstName}
                    {isJuniorPlayer(match.player2) && <span className="ml-1 text-xs text-blue-600">(J)</span>}
                  </td>
                  {scores.map((score, idx) => {
                    const adjustedP1 = applyJuniorHandicap(score.p1, match.player1);
                    const adjustedP2 = applyJuniorHandicap(score.p2, match.player2);
                    
                    return (
                      <td key={idx} className={`px-1 py-1.5 text-center font-bold ${
                        !score.scored ? 'text-gray-400' :
                        adjustedP2 < adjustedP1 ? 'text-blue-600 bg-blue-50' : 
                        adjustedP1 === adjustedP2 ? 'text-gray-600' : 
                        'text-gray-900'
                      }`}>
                        {score.scored ? (
                          <>
                            {score.p2}
                            {isJuniorPlayer(match.player2) && score.p2 > 1 && (
                              <span className="text-xs text-blue-600"> (-1)</span>
                            )}
                          </>
                        ) : '-'}
                      </td>
                    );
                  })}
                  <td className={`py-1.5 pl-2 text-center font-bold border-l border-gray-200 sticky right-0 bg-white ${
                    calculateVsPar('p2').includes('-') ? 'text-green-600' : 
                    calculateVsPar('p2').includes('+') ? 'text-red-600' : 
                    'text-gray-900'
                  }`}>
                    {calculateVsPar('p2')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showLiveScores && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <LiveScoresPage onBack={() => {
              triggerHaptic('light');
              setShowLiveScores(false);
            }} />
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
  const startingHole = 1;
  const course = match.course;

  const player1Name = formatPlayerName(match.player1);
  const player2Name = formatPlayerName(match.player2);

  const calculateVsPar = useCallback((playerScores) => {
    let totalScore = 0;
    let totalPar = 0;
    scores.forEach((score, idx) => {
      if (score.scored) {
        totalScore += score[playerScores];
        const actualHoleNumber = ((Number(startingHole) - 1 + idx) % 18) + 1;
        const par = course?.pars[actualHoleNumber] || 3;
        totalPar += par;
      }
    });
    const diff = totalScore - totalPar;
    if (diff === 0) return 'E';
    if (diff < 0) return String(diff);
    return `+${diff}`;
  }, [scores, course]);

  const holesWonStats = useMemo(() => {
    let p1Holes = 0;
    let p2Holes = 0;
    scores.forEach(score => {
      if (score.scored) {
        const p1Adjusted = applyJuniorHandicap(score.p1, match.player1);
        const p2Adjusted = applyJuniorHandicap(score.p2, match.player2);
        if (p1Adjusted < p2Adjusted) p1Holes++;
        else if (p2Adjusted < p1Adjusted) p2Holes++;
      }
    });
    return { p1Holes, p2Holes };
  }, [scores, match]);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => {
            triggerHaptic('light');
            onCancel();
          }} className="text-blue-600 font-medium text-sm">
            ← Back to Matches
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {player1Name} <span className="text-gray-400 font-normal">vs</span> {player2Name}
        </h2>
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <MapPin size={14} className="mr-1" /> {match.venue} 
          <span className="text-xs text-gray-500 ml-2">- {new Date(match.date).toLocaleDateString('en-NZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h4 className="font-bold text-gray-900 mb-3">Match Summary</h4>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-500 mb-1">{player1Name}</div>
              <div className="text-3xl font-bold text-blue-600">
                {holesWonStats.p1Holes}
              </div>
              <div className="text-xs text-gray-500 mt-1">Holes Won</div>
            </div>
            <div className="text-2xl text-gray-400 font-light px-4">—</div>
            <div className="text-center flex-1">
              <div className="text-sm text-gray-500 mb-1">{player2Name}</div>
              <div className="text-3xl font-bold text-blue-600">
                {holesWonStats.p2Holes}
              </div>
              <div className="text-xs text-gray-500 mt-1">Holes Won</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <div className="text-sm font-semibold text-gray-700">
              Winner: <span className="text-green-600">{formatPlayerName(match.winner)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h4 className="font-bold text-gray-900 mb-3">Scorecard</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 pr-2 font-semibold text-gray-700 text-xs sticky left-0 bg-white">Hole</th>
                  {scores.slice(0, 18).map((_, idx) => {
                    const holeNum = ((Number(startingHole) - 1 + idx) % 18) + 1;
                    return (
                      <th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[32px]">
                        {holeNum}
                      </th>
                    );
                  })}
                  {scores.length > 18 && scores.slice(18).map((_, idx) => (
                    <th key={`playoff-${idx}`} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[32px]">
                      P{idx + 1}
                    </th>
                  ))}
                  <th className="text-center py-2 pl-2 font-semibold text-gray-700 text-xs border-l-2 border-gray-200 sticky right-0 bg-white">vs Par</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-2 text-gray-900 font-bold text-sm sticky left-0 bg-white">{player1Name}</td>
                  {scores.map((score, idx) => (
                    <td key={idx} className={`px-1 py-2 text-center font-extrabold text-sm ${
                      score.scored ? (score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900') : 'text-gray-400'
                    }`}>
                      {score.scored ? score.p1 : '-'}
                    </td>
                  ))}
                  <td className={`py-2 pl-2 text-center font-bold text-xs border-l-2 border-gray-200 sticky right-0 bg-white ${
                    calculateVsPar('p1').includes('-') ? 'text-green-600' : calculateVsPar('p1').includes('+') ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {calculateVsPar('p1')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 text-gray-900 font-bold text-sm sticky left-0 bg-white">{player2Name}</td>
                  {scores.map((score, idx) => (
                    <td key={idx} className={`px-1 py-2 text-center font-extrabold text-sm ${
                      score.scored ? (score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p2 === score.p1 ? 'text-gray-600' : 'text-gray-900') : 'text-gray-400'
                    }`}>
                      {score.scored ? score.p2 : '-'}
                    </td>
                  ))}
                  <td className={`py-2 pl-2 text-center font-bold text-xs border-l-2 border-gray-200 sticky right-0 bg-white ${
                    calculateVsPar('p2').includes('-') ? 'text-green-600' : calculateVsPar('p2').includes('+') ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {calculateVsPar('p2')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

const DiscGolfApp = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [darkMode, setDarkMode] = useDarkMode();
  const appData = useAppData();
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    triggerHaptic(type);
    setToast({ message, type });
  }, []);

  const handleLogin = useCallback((playerName, pin) => {
    const player = appData.players.find(p => p.name === playerName && p.pin === pin);
    if (player) {
      localStorage.setItem('lastLoggedInUser', playerName);
      setCurrentUser(player);
      setView('matches');
      setError('');
      showToast(`Welcome back, ${formatPlayerName(player.name)}!`, 'success');
    } else {
      setError('Invalid player name or PIN');
      triggerHaptic('error');
    }
  }, [appData.players, showToast]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setView('login');
    setSelectedMatch(null);
  }, []);

  const handleChangePin = useCallback((newPin) => {
    const updatedPlayers = appData.players.map(p => 
      p.id === currentUser.id ? { ...p, pin: newPin } : p
    );
    appData.setPlayers(updatedPlayers);
    setCurrentUser({ ...currentUser, pin: newPin });
    
    localStorage.setItem('sheet-data', JSON.stringify({
      players: updatedPlayers,
      courses: appData.courses,
      matches: appData.matches,
      pools: appData.pools
    }));
    
    setView('matches');
    setError('');
    showToast('PIN updated successfully!', 'success');
  }, [appData, currentUser, showToast]);

  const handleCancelMatch = useCallback(async () => {
    if (selectedMatch?.match && window.confirm('Cancel this match? All progress will be lost.')) {
      try {
        localStorage.removeItem(`match-progress-${selectedMatch.match.id}`);
        
        const updatedMatches = appData.matches.map(m => 
          m.id === selectedMatch.match.id 
            ? { ...m, scoresJson: [], winner: '', status: 'scheduled' }
            : m
        );
        appData.setMatches(updatedMatches);
        
        localStorage.setItem('sheet-data', JSON.stringify({
          players: appData.players,
          courses: appData.courses,
          matches: updatedMatches,
          pools: appData.pools
        }));
        
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'cancelMatch',
            matchId: selectedMatch.match.id
          }),
          mode: 'no-cors'
        });
        
        setSelectedMatch(null);
        setView('matches');
        showToast('Match cancelled', 'info');
      } catch (err) {
        console.error('Error cancelling match:', err);
        showToast('Error cancelling match', 'error');
      }
    }
  }, [selectedMatch, appData, showToast]);

  if (view === 'login') {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <LoginPage 
          players={appData.players}
          onLogin={handleLogin}
          error={error}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isOnline={appData.isOnline}
        />
      </>
    );
  }

  if (view === 'changePin') {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <ChangePinPage
          currentUser={currentUser}
          onBack={() => setView('matches')}
          onPinChange={handleChangePin}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </>
    );
  }

  if (view === 'matches') {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <MatchesPage
          currentUser={currentUser}
          matches={appData.matches}
          onLogout={handleLogout}
          onChangePin={() => setView('changePin')}
          onStartMatch={(match, startingHole) => {
            setSelectedMatch({ match, startingHole });
            setView('scoring');
          }}
          onReviewMatch={(match) => {
            setSelectedMatch(match);
            setView('review');
          }}
          onViewStandings={() => setView('standings')}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isOnline={appData.isOnline}
          pendingUpdates={appData.pendingUpdates}
          onRefresh={appData.loadSheetData}
          isLoading={appData.isLoading} 
        />
      </>
    );
  }

  if (view === 'scoring') {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <ScoringPage
          match={selectedMatch.match}
          startingHole={selectedMatch.startingHole}
          courses={appData.courses}
          onCancel={handleCancelMatch}
          onComplete={(scores, winner) => {
            appData.submitMatchToSheet(selectedMatch.match.id, scores, winner);
            showToast('Match completed successfully!', 'success');
            setSelectedMatch(null);
            setView('matches');
          }}
        />
      </>
    );
  }

  if (view === 'standings') {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <StandingsPage
          currentUser={currentUser}
          matches={appData.matches}
          pools={appData.pools}
          players={appData.players}
          onLogout={handleLogout}
          onChangePin={() => setView('changePin')}
          onViewMatches={() => setView('matches')}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          isOnline={appData.isOnline}
          pendingUpdates={appData.pendingUpdates}
          isLoading={appData.isLoading}
          onRefresh={appData.loadSheetData}       
        />
      </>
    );
  }

  if (view === 'review') {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <ReviewPage
          match={selectedMatch}
          onCancel={() => {
            setSelectedMatch(null);
            setView('matches');
          }}
        />
      </>
    );
  }
  
  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Page under construction...</p>
          <button 
            onClick={handleLogout}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    </>
  );
};

export default DiscGolfApp;

import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check, Moon, Sun } from 'lucide-react';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1o9A_xc6Kd24K0yNiMkFnW7ZX2E0cEHFoUjaZ98Vu_eSTzgaM6HHVGNqOX62viRh2Mw/exec';
const BRAND_PRIMARY = '#006400';
const BRAND_SECONDARY = '#FFD700';
const BRAND_ACCENT = '#228B22';

// ============================================
// CUSTOM HOOKS
// ============================================

// Dark Mode Hook
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
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
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return [darkMode, setDarkMode];
};

// Data Management Hook
const useAppData = () => {
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pools, setPools] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);

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

  const loadSheetData = async () => {
    try {
      const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J', 'Pools!A:F'];
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${GOOGLE_API_KEY}`
      );
      
      if (!response.ok) throw new Error('Failed to load data');
      
      const data = await response.json();
      
      const playersData = data.valueRanges[0].values.slice(1).map(row => ({
        id: row[0], name: row[1], pin: row[2]
      }));
      setPlayers(playersData);
      
      const coursesData = data.valueRanges[1].values.slice(1).map(row => ({
        id: row[0], name: row[1], code: row[2], holes: parseInt(row[3]), pars: JSON.parse(row[4] || '{}')
      }));
      setCourses(coursesData);
      
      const matchesData = data.valueRanges[2].values.slice(1).map(row => ({
        id: row[0], date: row[1], venue: row[2], player1: row[3], player2: row[4],
        startTime: row[5], endTime: row[6], scoresJson: row[7] ? JSON.parse(row[7]) : [],
        winner: row[8], status: row[9] || 'scheduled'
      }));
      setMatches(matchesData);
      
      const poolsData = data.valueRanges[3]?.values.slice(1).map(row => ({
        pool: row[0], player: row[1], played: parseInt(row[2]) || 0,
        win: parseInt(row[3]) || 0, loss: parseInt(row[4]) || 0, points: parseInt(row[5]) || 0
      })) || [];
      setPools(poolsData);
      
      localStorage.setItem('sheet-data', JSON.stringify({
        players: playersData, courses: coursesData, matches: matchesData, pools: poolsData
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
    }
  };

  const processPendingUpdates = async () => {
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
  };

  const submitMatchToSheet = async (matchId, finalScores, winner) => {
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
      
      localStorage.setItem('sheet-data', JSON.stringify({
        players, courses, matches: updatedMatches, pools
      }));
      
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scores: finalScores, winner }),
        mode: 'no-cors'
      });
    } catch (err) {
      console.error('Error submitting match:', err);
    }
  };

  return {
    players, setPlayers, courses, matches, setMatches, pools,
    isOnline, pendingUpdates, submitMatchToSheet, loadSheetData
  };
};

// ============================================
// PAGE COMPONENTS
// ============================================

// Login Page
const LoginPage = ({ players, onLogin, error, darkMode, setDarkMode, isOnline }) => (
  <div className="min-h-screen bg-white transition-colors">
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="absolute top-4 right-4">
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <div className="text-center mb-12 mt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" 
             style={{background: `linear-gradient(to bottom right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})`}}>
          <Trophy className="text-white" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Matchplay</h1>
        <p className="text-gray-500">Disc Golf Tournament Tracker</p>
      </div>
      
      {!isOnline && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r">
          <p className="text-sm text-orange-800">You're offline. Data will sync when connected.</p>
        </div>
      )}
      
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        onLogin(formData.get('player'), formData.get('pin'));
      }} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Player</label>
          <select name="player" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2">
            <option value="">Choose your name</option>
            {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">PIN</label>
          <input type="password" name="pin" maxLength="4" pattern="[0-9]{4}" placeholder="Enter 4-digit PIN" required
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2" />
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        <button type="submit" className="w-full text-white py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
                style={{ backgroundColor: BRAND_PRIMARY, boxShadow: `0 10px 15px -3px ${BRAND_PRIMARY}30` }}
                onMouseEnter={(e) => e.target.style.backgroundColor = BRAND_ACCENT}
                onMouseLeave={(e) => e.target.style.backgroundColor = BRAND_PRIMARY}>
          Sign In
        </button>
      </form>
    </div>
  </div>
);

// Change PIN Page
const ChangePinPage = ({ currentUser, players, courses, matches, pools, onBack, onPinChange, darkMode, setDarkMode }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleChangePin = () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    onPinChange(newPin);
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4"><X size={24} className="text-gray-600" /></button>
            <h2 className="text-lg font-bold text-gray-900">Change PIN</h2>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New PIN</label>
            <input type="password" maxLength="4" pattern="[0-9]{4}" placeholder="4 digits" value={newPin}
                   onChange={(e) => setNewPin(e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
            <input type="password" maxLength="4" pattern="[0-9]{4}" placeholder="4 digits" value={confirmPin}
                   onChange={(e) => setConfirmPin(e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <button onClick={handleChangePin} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Update PIN
          </button>
        </div>
      </div>
    </div>
  );
};

// I'll continue with the rest of the pages in the next artifact update...
// For now, let me create a proper file structure guide

const DiscGolfApp = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [darkMode, setDarkMode] = useDarkMode();
  const appData = useAppData();

  // Authentication
  const handleLogin = (playerName, pin) => {
    const player = appData.players.find(p => p.name === playerName && p.pin === pin);
    if (player) {
      setCurrentUser(player);
      setView('matches');
      setError('');
    } else {
      setError('Invalid player name or PIN');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
    setSelectedMatch(null);
  };

  const handleChangePin = (newPin) => {
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
  };

  // Render appropriate page
  if (view === 'login') {
    return <LoginPage 
      players={appData.players}
      onLogin={handleLogin}
      error={error}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      isOnline={appData.isOnline}
    />;
  }

  if (view === 'changePin') {
    return <ChangePinPage
      currentUser={currentUser}
      players={appData.players}
      courses={appData.courses}
      matches={appData.matches}
      pools={appData.pools}
      onBack={() => setView('matches')}
      onPinChange={handleChangePin}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    />;
  }

 
// Matches Page
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
  pendingUpdates
}) => {
  const [matchFilter, setMatchFilter] = useState('all');
  const [selectedFilterDate, setSelectedFilterDate] = useState('');
  const [selectedFilterPlayer, setSelectedFilterPlayer] = useState('');
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [startingHole, setStartingHole] = useState(1);

  const userMatches = matches.filter(m => 
    m.player1 === currentUser.name || m.player2 === currentUser.name
  );
  const upcomingMatches = userMatches.filter(m => m.status !== 'Completed');
  
  let completedMatches = matches.filter(m => m.status === 'Completed');
  
  if (matchFilter === 'date' && selectedFilterDate) {
    completedMatches = completedMatches.filter(m => m.date === selectedFilterDate);
  } else if (matchFilter === 'player' && selectedFilterPlayer) {
    completedMatches = completedMatches.filter(m => 
      m.player1 === selectedFilterPlayer || m.player2 === selectedFilterPlayer
    );
  }
  
  const uniqueDates = [...new Set(matches.filter(m => m.status === 'Completed').map(m => m.date))].sort();
  const uniquePlayers = [...new Set(matches.filter(m => m.status === 'Completed').flatMap(m => [m.player1, m.player2]))].sort();

  const handleStartMatch = (match) => {
    setSelectedMatch(match);
    setShowStartHoleModal(true);
  };

  const confirmStartHole = () => {
    onStartMatch(selectedMatch, startingHole);
    setShowStartHoleModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white sticky top-0 z-10 shadow-lg">
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
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={onChangePin} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <Edit size={20} />
              </button>
              <button onClick={onLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button className="flex-1 py-2 px-4 rounded-lg font-semibold bg-white/20 text-white">
              Matches
            </button>
            <button onClick={onViewStandings} className="flex-1 py-2 px-4 rounded-lg font-semibold bg-white/5 text-white/70 hover:bg-white/10">
              Standings
            </button>
          </div>
          
          {!isOnline && (
            <div className="bg-white/10 px-3 py-2 rounded-lg text-sm flex items-center mt-4">
              <div className="w-2 h-2 bg-orange-300 rounded-full mr-2"></div>
              Offline • {pendingUpdates.length} pending updates
            </div>
          )}
        </div>
      </div>
      
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
                <div 
                  key={match.id}
                  onClick={() => handleStartMatch(match)}
                  className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar size={14} className="mr-1" />
                      <span>{match.date}</span>
                      <Clock size={14} className="ml-3 mr-1" />
                      <span>{match.startTime}</span>
                    </div>
                    <ChevronRight className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg mb-1">
                      {match.player1} <span className="text-gray-400 font-normal">vs</span> {match.player2}
                    </p>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={14} className="mr-1" />
                      {match.venue}
                    </div>
                  </div>
                </div>
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
                <div 
                  key={match.id}
                  onClick={() => onReviewMatch(match)}
                  className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">
                      {match.player1} <span className="text-gray-400 font-normal">vs</span> {match.player2}
                    </p>
                    <span className="text-xs text-gray-500">{match.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={14} className="mr-1" />
                      {match.venue}
                    </div>
                    <div className="flex items-center">
                      <Check size={16} className="text-green-600 mr-1" />
                      <span className="text-sm font-semibold text-green-600">{match.winner} won</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                onClick={() => setShowStartHoleModal(false)}
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
    </div>
  );
};

const DiscGolfApp = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [darkMode, setDarkMode] = useDarkMode();
  const appData = useAppData();

  // Authentication
  const handleLogin = (playerName, pin) => {
    const player = appData.players.find(p => p.name === playerName && p.pin === pin);
    if (player) {
      setCurrentUser(player);
      setView('matches');
      setError('');
    } else {
      setError('Invalid player name or PIN');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
    setSelectedMatch(null);
  };

  const handleChangePin = (newPin) => {
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
  };

  // Render appropriate page
  if (view === 'login') {
    return <LoginPage 
      players={appData.players}
      onLogin={handleLogin}
      error={error}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      isOnline={appData.isOnline}
    />;
  }

  if (view === 'changePin') {
    return <ChangePinPage
      currentUser={currentUser}
      players={appData.players}
      courses={appData.courses}
      matches={appData.matches}
      pools={appData.pools}
      onBack={() => setView('matches')}
      onPinChange={handleChangePin}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    />;
  }

  if (view === 'matches') {
    return <MatchesPage
      currentUser={currentUser}
      matches={appData.matches}
      onLogout={handleLogout}
      onChangePin={() => setView('changePin')}
      onStartMatch={(match, startingHole) => {
        setSelectedMatch(match);
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
    />;
  }

// Scoring Page
const ScoringPage = ({ match, startingHole, courses, onCancel, onComplete }) => {
  const [scores, setScores] = useState([]);
  const [currentHole, setCurrentHole] = useState(0);

  const course = courses.find(c => c.name === match.venue || c.code === match.venue);

  // Initialize scores on mount or when match changes
  useEffect(() => {
    const stored = localStorage.getItem(`match-progress-${match.id}`);
    if (stored) {
      const progress = JSON.parse(stored);
      setScores(progress.scores);
      setCurrentHole(progress.currentHole);
    } else {
      const startHoleNum = Number(startingHole);
      const initScores = Array(18).fill(null).map((_, idx) => {
        const holeNumber = idx + 1;
        const par = course && course.pars[holeNumber] ? course.pars[holeNumber] : 3;
        
        if (holeNumber < startHoleNum) {
          return { p1: 0, p2: 0, scored: false };
        }
        
        return { p1: par, p2: par, scored: false };
      });
      
      setScores(initScores);
      setCurrentHole(startHoleNum - 1);
    }
  }, [match.id, startingHole, course]);

  // Save progress whenever scores change
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

  const calculateMatchStatus = () => {
    let p1Holes = 0;
    let p2Holes = 0;
    let holesPlayed = 0;
    
    scores.forEach((score) => {
      if (score.scored) {
        holesPlayed++;
        if (score.p1 < score.p2) p1Holes++;
        else if (score.p2 < score.p1) p2Holes++;
      }
    });
    
    const holesRemaining = Math.max(0, 18 - holesPlayed);
    const lead = Math.abs(p1Holes - p2Holes);
    const leader = p1Holes > p2Holes ? match.player1 : 
                   p2Holes > p1Holes ? match.player2 : null;
    
    const isComplete = (holesPlayed >= 18 && p1Holes !== p2Holes) || (lead > holesRemaining && holesPlayed > 0);
    const needsPlayoff = holesPlayed === 18 && p1Holes === p2Holes;
    
    return { p1Holes, p2Holes, holesPlayed, lead, leader, isComplete, needsPlayoff };
  };

  const recordScore = () => {
    if (scores[currentHole]?.p1 > 0 && scores[currentHole]?.p2 > 0) {
      const newScores = [...scores];
      newScores[currentHole] = { ...newScores[currentHole], scored: true };
      setScores(newScores);
      
      if (currentHole < scores.length - 1) {
        setCurrentHole(currentHole + 1);
      }
    }
  };

  const updateScore = (player, delta) => {
    const newScores = [...scores];
    const current = newScores[currentHole]?.[player] || 0;
    newScores[currentHole] = {
      ...newScores[currentHole],
      [player]: Math.max(1, current + delta)
    };
    setScores(newScores);
  };

  const addPlayoffHole = () => {
    const playoffPar = course && course.pars[1] ? course.pars[1] : 3;
    setScores([...scores, { p1: playoffPar, p2: playoffPar, scored: false }]);
    setCurrentHole(scores.length);
  };

  const handleComplete = () => {
    const status = calculateMatchStatus();
    if (!status.leader) return;
    
    localStorage.removeItem(`match-progress-${match.id}`);
    onComplete(scores, status.leader);
  };

  const calculateVsPar = (playerScores) => {
    let totalScore = 0;
    let totalPar = 0;
    
    scores.forEach((score, idx) => {
      if (score.scored) {
        totalScore += playerScores === 'p1' ? score.p1 : score.p2;
        const holeNum = idx < 18 ? idx + 1 : 1;
        const par = course && course.pars[holeNum] ? course.pars[holeNum] : 3;
        totalPar += par;
      }
    });
    
    const diff = totalScore - totalPar;
    if (diff === 0) return 'E';
    if (diff < 0) return String(diff);
    return `+${diff}`;
  };

  const status = calculateMatchStatus();
  const actualHoleNumber = currentHole < 18 ? currentHole + 1 : currentHole - 17;
  const par = currentHole < 18 && course ? course.pars[actualHoleNumber] : 3;
  
  const player1FirstName = match.player1.split(' ')[0];
  const player2FirstName = match.player2.split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <button onClick={onCancel} className="text-blue-600 font-medium text-sm mb-3">
            ← Cancel Match
          </button>
          
          <h2 className="text-xl font-bold text-gray-900">
            {match.player1} <span className="text-gray-400 font-normal">vs</span> {match.player2}
          </h2>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <MapPin size={14} className="mr-1" />
            {match.venue}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Hole Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Hole {currentHole < 18 ? actualHoleNumber : `Playoff ${actualHoleNumber}`}
            </h3>
            <p className="text-gray-500 text-sm">Par {par}</p>
          </div>
          <p className="text-gray-500 text-sm">{status.holesPlayed} of {scores.length} Holes</p>
        </div>

        {/* Score Input Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          {/* Player 1 */}
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-gray-900 text-lg w-24">{player1FirstName}</div>
            <button 
              onClick={() => updateScore('p1', -1)}
              className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="text-5xl font-bold text-gray-900 w-20 text-center">
              {scores[currentHole]?.p1 || 0}
            </div>
            <button 
              onClick={() => updateScore('p1', 1)}
              className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Player 2 */}
          <div className="flex items-center justify-between">
            <div className="font-bold text-gray-900 text-lg w-24">{player2FirstName}</div>
            <button 
              onClick={() => updateScore('p2', -1)}
              className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="text-5xl font-bold text-gray-900 w-20 text-center">
              {scores[currentHole]?.p2 || 0}
            </div>
            <button 
              onClick={() => updateScore('p2', 1)}
              className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Match Score Display */}
        <div className="bg-gray-100 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="font-semibold text-gray-900">{player1FirstName}</div>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-blue-600">{status.p1Holes}</span>
            <span className="text-3xl font-bold text-blue-600">{status.p2Holes}</span>
          </div>
          <div className="font-semibold text-gray-900">{player2FirstName}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4">
          <button 
            onClick={() => setCurrentHole(Math.max(0, currentHole - 1))}
            disabled={currentHole === 0}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Previous Hole
          </button>
          <button 
            onClick={recordScore}
            disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next Hole
          </button>
        </div>

        {/* Match Status / Submit Button */}
        {status.isComplete ? (
          <button 
            onClick={handleComplete}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors mb-4"
          >
            Submit Scorecard
          </button>
        ) : status.needsPlayoff && currentHole >= 17 && scores[currentHole]?.scored ? (
          <button 
            onClick={addPlayoffHole}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors mb-4"
          >
            Add Playoff Hole
          </button>
        ) : (
          <div className="w-full bg-gray-400 text-white py-3 rounded-xl font-semibold text-center mb-4">
            Match In Progress
          </div>
        )}

        {/* Scorecard Table */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h4 className="font-bold text-gray-900 mb-3">Scorecard</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-700">Hole</th>
                <th className="text-center py-2 font-semibold text-gray-700"></th>
                <th className="text-right py-2 font-semibold text-gray-700">vs Par</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-900 font-medium">{player1FirstName}</td>
                <td className="py-2"></td>
                <td className={`py-2 text-right font-bold ${
                  calculateVsPar('p1').includes('-') ? 'text-green-600' : 
                  calculateVsPar('p1').includes('+') ? 'text-red-600' : 
                  'text-gray-900'
                }`}>
                  {calculateVsPar('p1')}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-900 font-medium">{player2FirstName}</td>
                <td className="py-2"></td>
                <td className={`py-2 text-right font-bold ${
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
  );
};


  // Note: Other pages (Standings, Review) to be implemented
  
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Trophy size={48} className="mx-auto mb-4 text-gray-400" />
      <p className="text-gray-600">Additional pages (Standings, Scoring, Review) to be implemented...</p>
      <button 
        onClick={handleLogout}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Back to Login
      </button>
    </div>
  </div>;
};

export default DiscGolfApp;

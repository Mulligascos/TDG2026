import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check } from 'lucide-react';

const SHEET_ID = '1Bwv9h3gayde4Qvb7lk9NarOZop9JlmlnnMZQEYkGrzQ';
const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';

const DiscGolfApp = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [startingHole, setStartingHole] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);

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

  useEffect(() => {
    if (selectedMatch && scores.length > 0) {
      saveMatchProgress();
    }
  }, [scores, selectedMatch]);

  const loadSheetData = async () => {
    try {
      const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J'];
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${GOOGLE_API_KEY}`
      );
      
      if (!response.ok) {
        console.error('API response not OK:', response.status);
        throw new Error('Failed to load data');
      }
      
      const data = await response.json();
      
      const playersData = data.valueRanges[0].values.slice(1).map(row => ({
        id: row[0],
        name: row[1],
        pin: row[2]
      }));
      setPlayers(playersData);
      
      const coursesData = data.valueRanges[1].values.slice(1).map(row => ({
        id: row[0],
        name: row[1],
        code: row[2],
        holes: parseInt(row[3]),
        pars: JSON.parse(row[4] || '{}')
      }));
      setCourses(coursesData);
      
      const matchesData = data.valueRanges[2].values.slice(1).map(row => ({
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
      
      const stored = await window.storage.get('sheet-data');
      if (!stored) {
        await window.storage.set('sheet-data', JSON.stringify({
          players: playersData,
          courses: coursesData,
          matches: matchesData
        }));
      }
    } catch (err) {
      console.error('Error loading sheet data:', err);
      try {
        const stored = await window.storage.get('sheet-data');
        if (stored) {
          const data = JSON.parse(stored.value);
          setPlayers(data.players || []);
          setCourses(data.courses || []);
          setMatches(data.matches || []);
        }
      } catch (e) {
        setError('Unable to load data. Please check your connection.');
      }
    }
  };

  const saveMatchProgress = async () => {
    try {
      const progress = {
        matchId: selectedMatch.id,
        scores,
        currentHole,
        startingHole,
        timestamp: Date.now()
      };
      await window.storage.set(`match-progress-${selectedMatch.id}`, JSON.stringify(progress));
    } catch (err) {
      console.error('Error saving match progress:', err);
    }
  };

  const loadMatchProgress = async (matchId) => {
    try {
      const stored = await window.storage.get(`match-progress-${matchId}`);
      if (stored) {
        const progress = JSON.parse(stored.value);
        setScores(progress.scores);
        setCurrentHole(progress.currentHole);
        setStartingHole(progress.startingHole);
        return true;
      }
    } catch (err) {
      console.error('Error loading match progress:', err);
    }
    return false;
  };

  const processPendingUpdates = async () => {
    try {
      const stored = await window.storage.get('pending-updates');
      if (stored) {
        const updates = JSON.parse(stored.value);
        for (const update of updates) {
          await submitMatchToSheet(update.matchId, update.scores, update.winner);
        }
        await window.storage.delete('pending-updates');
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
      await window.storage.set('pending-updates', JSON.stringify(updates));
      return;
    }

    try {
      const updatedMatches = matches.map(m => 
        m.id === matchId 
          ? { ...m, scoresJson: finalScores, winner, status: 'completed' }
          : m
      );
      setMatches(updatedMatches);
      await window.storage.set('sheet-data', JSON.stringify({
        players,
        courses,
        matches: updatedMatches
      }));
    } catch (err) {
      console.error('Error submitting match:', err);
      throw err;
    }
  };

  const handleLogin = async (playerName, pin) => {
    const player = players.find(p => p.name === playerName && p.pin === pin);
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
    setScores([]);
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    const updatedPlayers = players.map(p => 
      p.id === currentUser.id ? { ...p, pin: newPin } : p
    );
    setPlayers(updatedPlayers);
    setCurrentUser({ ...currentUser, pin: newPin });
    
    await window.storage.set('sheet-data', JSON.stringify({
      players: updatedPlayers,
      courses,
      matches
    }));
    
    setNewPin('');
    setConfirmPin('');
    setView('matches');
    setError('');
  };

  const startMatch = async (match) => {
    setSelectedMatch(match);
    const hasProgress = await loadMatchProgress(match.id);
    
    if (!hasProgress) {
      // Get course pars
      const course = courses.find(c => c.name === match.venue);
      const initScores = Array(18).fill(null).map((_, idx) => {
        const holeNumber = idx + 1;
        const par = course && course.pars[holeNumber] ? course.pars[holeNumber] : 3;
        return {
          p1: par,
          p2: par,
          scored: false
        };
      });
      setScores(initScores);
      setCurrentHole(0);
      setShowStartHoleModal(true);
    } else {
      setView('scoring');
    }
  };

  const confirmStartHole = () => {
    setShowStartHoleModal(false);
    setView('scoring');
  };

  const cancelMatch = () => {
    setSelectedMatch(null);
    setScores([]);
    setCurrentHole(0);
    setStartingHole(1);
    setView('matches');
  };

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
  const leader = p1Holes > p2Holes ? selectedMatch.player1 : 
                 p2Holes > p1Holes ? selectedMatch.player2 : null;
  
  const isDormie = lead > 0 && lead >= holesRemaining && holesPlayed <= 18;
  
  const isComplete = (holesPlayed >= 18 && p1Holes !== p2Holes) || (holesPlayed > 18 && leader !== null);
  
  const needsPlayoff = holesPlayed === 18 && p1Holes === p2Holes;
  
  return { p1Holes, p2Holes, holesPlayed, lead, leader, isDormie, isComplete, needsPlayoff };
};
    
  const recordScore = (hole, p1Score, p2Score) => {
    const newScores = [...scores];
    newScores[hole] = { p1: p1Score, p2: p2Score, scored: true };
    setScores(newScores);
    
    if (hole < scores.length - 1) {
      setCurrentHole(hole + 1);
    }
  };

  const addPlayoffHole = () => {
    const course = courses.find(c => c.name === selectedMatch.venue);
    const playoffPar = course && course.pars[1] ? course.pars[1] : 3; // Use hole 1 par for playoff
    setScores([...scores, { p1: playoffPar, p2: playoffPar, scored: false }]);
    setCurrentHole(scores.length);
  };

  const completeMatch = async () => {
    const status = calculateMatchStatus();
    const winner = status.leader;
    
    if (!winner) {
      setError('Match is not complete yet');
      return;
    }
    
    setLoading(true);
    try {
      await submitMatchToSheet(selectedMatch.id, scores, winner);
      await window.storage.delete(`match-progress-${selectedMatch.id}`);
      setView('matches');
      setSelectedMatch(null);
      setScores([]);
    } catch (err) {
      setError('Error submitting match. It will be submitted when you are back online.');
    } finally {
      setLoading(false);
    }
  };

  const reviewMatch = (match) => {
    setSelectedMatch(match);
    setScores(match.scoresJson || []);
    setView('review');
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-12 mt-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg">
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
            handleLogin(formData.get('player'), formData.get('pin'));
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Player</label>
              <select 
                name="player" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose your name</option>
                {players.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">PIN</label>
              <input 
                type="password" 
                name="pin"
                maxLength="4"
                pattern="[0-9]{4}"
                placeholder="Enter 4-digit PIN"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'changePin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center">
            <button onClick={() => setView('matches')} className="mr-4">
              <X size={24} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Change PIN</h2>
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <button 
              onClick={handleChangePin}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Update PIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'matches') {
    const userMatches = matches.filter(m => 
      m.player1 === currentUser.name || m.player2 === currentUser.name
    );
    const upcomingMatches = userMatches.filter(m => m.status !== 'Completed');
    const completedMatches = matches.filter(m => m.status === 'Completed');
    
    return (
      <div className="min-h-screen bg-gray-50">
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
                <button 
                  onClick={() => setView('changePin')}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Edit size={20} />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
            {!isOnline && (
              <div className="bg-white/10 px-3 py-2 rounded-lg text-sm flex items-center">
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
                    onClick={() => startMatch(match)}
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Completed</h2>
            {completedMatches.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-gray-500">No completed matches yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedMatches.map(match => (
                  <div 
                    key={match.id}
                    onClick={() => reviewMatch(match)}
                    className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <p className="font-bold text-gray-900 mb-1">
                      {match.player1} <span className="text-gray-400 font-normal">vs</span> {match.player2}
                    </p>
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
                onChange={(e) => setStartingHole(parseInt(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({length: 18}, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hole {h}</option>
                ))}
              </select>
              <button 
                onClick={confirmStartHole}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Match
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'scoring') {
    const status = calculateMatchStatus();
    const course = courses.find(c => c.name === selectedMatch.venue);
    const actualHoleNumber = currentHole < 18 ? ((currentHole + startingHole - 1) % 18) + 1 : currentHole - 17;
    const par = currentHole < 18 && course ? course.pars[actualHoleNumber] : 3;
    
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4">
            <button 
              onClick={() => {
                setView('matches');
                setSelectedMatch(null);
              }}
              className="text-blue-600 font-semibold mb-3"
            >
              ← Matches
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedMatch.player1} <span className="text-gray-400">vs</span> {selectedMatch.player2}</h2>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPin size={14} className="mr-1" />
                {selectedMatch.venue}
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status.p1Holes}</div>
                <div className="text-sm text-gray-600 mt-1">{selectedMatch.player1}</div>
              </div>
              <div className="text-gray-300 text-2xl font-bold">-</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status.p2Holes}</div>
                <div className="text-sm text-gray-600 mt-1">{selectedMatch.player2}</div>
              </div>
            </div>
            
            {status.leader && (
              <div className="mt-3 text-center">
                <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {status.leader} {status.lead} {status.isDormie ? 'UP (Dormie)' : 'UP'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Hole {currentHole < 18 ? actualHoleNumber : `Playoff ${actualHoleNumber}`}
                </h3>
                <p className="text-gray-500">Par {par}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                {status.holesPlayed} of {scores.length} holes
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">{selectedMatch.player1}</label>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <button 
                    onClick={() => {
                      const newScores = [...scores];
                      const current = newScores[currentHole]?.p1 || 0;
                      newScores[currentHole] = {
                        ...newScores[currentHole],
                        p1: Math.max(1, current - 1)
                      };
                      setScores(newScores);
                    }}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600 active:bg-gray-100"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="text-4xl font-bold text-gray-900">{scores[currentHole]?.p1 || 0}</div>
                  <button 
                    onClick={() => {
                      const newScores = [...scores];
                      const current = newScores[currentHole]?.p1 || 0;
                      newScores[currentHole] = {
                        ...newScores[currentHole],
                        p1: current + 1
                      };
                      setScores(newScores);
                    }}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600 active:bg-gray-100"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">{selectedMatch.player2}</label>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <button 
                    onClick={() => {
                      const newScores = [...scores];
                      const current = newScores[currentHole]?.p2 || 0;
                      newScores[currentHole] = {
                        ...newScores[currentHole],
                        p2: Math.max(1, current - 1)
                      };
                      setScores(newScores);
                    }}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600 active:bg-gray-100"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="text-4xl font-bold text-gray-900">{scores[currentHole]?.p2 || 0}</div>
                  <button 
                    onClick={() => {
                      const newScores = [...scores];
                      const current = newScores[currentHole]?.p2 || 0;
                      newScores[currentHole] = {
                        ...newScores[currentHole],
                        p2: current + 1
                      };
                      setScores(newScores);
                    }}
                    className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600 active:bg-gray-100"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>


              
            </div>
            
            <button 
              onClick={() => {
                if (scores[currentHole]?.p1 > 0 && scores[currentHole]?.p2 > 0) {
                  recordScore(currentHole, scores[currentHole].p1, scores[currentHole].p2);
                }
              }}
              disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors mt-6 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {currentHole < scores.length - 1 ? 'Next Hole' : 'Record Score'}
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="sticky left-0 bg-white text-left py-2 pr-4 font-semibold text-gray-700 min-w-[100px]">Player</th>
                    {scores.map((_, idx) => (
                      scores[idx].scored && (
                        <th key={idx} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[50px]">
                          {idx < 18 ? ((idx + startingHole - 1) % 18) + 1 : `P${idx - 17}`}
                        </th>
                      )
                    ))}
                    <th className="sticky right-0 bg-white px-3 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 min-w-[60px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="sticky left-0 bg-white py-3 pr-4 font-semibold text-gray-900">{selectedMatch.player1.split(' ')[0]}</td>
                    {scores.map((score, idx) => (
                      score.scored && (
                        <td key={idx} className={`px-2 py-3 text-center font-semibold ${score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                          {score.p1}
                        </td>
                      )
                    ))}
                    <td className="sticky right-0 bg-white px-3 py-3 text-center font-bold text-gray-900 border-l-2 border-gray-200">
                      {scores.filter(s => s.scored).reduce((sum, s) => sum + s.p1, 0)}
                    </td>
                  </tr>
                  <tr>
                    <td className="sticky left-0 bg-white py-3 pr-4 font-semibold text-gray-900">{selectedMatch.player2.split(' ')[0]}</td>
                    {scores.map((score, idx) => (
                      score.scored && (
                        <td key={idx} className={`px-2 py-3 text-center font-semibold ${score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                          {score.p2}
                        </td>
                      )
                    ))}
                    <td className="sticky right-0 bg-white px-3 py-3 text-center font-bold text-gray-900 border-l-2 border-gray-200">
                      {scores.filter(s => s.scored).reduce((sum, s) => sum + s.p2, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {status.needsPlayoff && currentHole >= 17 && scores[currentHole]?.scored && (
            <button 
              onClick={addPlayoffHole}
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold hover:bg-orange-700 transition-colors mt-4"
            >
              Add Playoff Hole
            </button>
          )}
          
          {status.isComplete && (
            <button 
              onClick={completeMatch}
              disabled={loading}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold hover:bg-green-700 transition-colors mt-4 disabled:bg-gray-400 shadow-lg shadow-green-500/20"
            >
              {loading ? 'Submitting...' : '✓ Complete Match'}
            </button>
          )}
          
          {error && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r mt-4">
              <p className="text-sm text-orange-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'review') {
    const status = calculateMatchStatus();
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4">
            <button 
              onClick={() => {
                setView('matches');
                setSelectedMatch(null);
              }}
              className="text-blue-600 font-semibold mb-3"
            >
              ← Back
            </button>
            <h2 className="text-lg font-bold text-gray-900">{selectedMatch.player1} <span className="text-gray-400">vs</span> {selectedMatch.player2}</h2>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin size={14} className="mr-1" />
              {selectedMatch.venue}
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                <Check size={16} className="mr-1" />
                {selectedMatch.winner} won
              </span>
            </div>
          </div>
        </div>
        
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
            <div className="flex items-center justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status.p1Holes}</div>
                <div className="text-sm text-gray-600 mt-1">{selectedMatch.player1}</div>
              </div>
              <div className="text-gray-300 text-2xl font-bold">-</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{status.p2Holes}</div>
                <div className="text-sm text-gray-600 mt-1">{selectedMatch.player2}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Final Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="sticky left-0 bg-white text-left py-2 pr-4 font-semibold text-gray-700 min-w-[100px]">Player</th>
                    {scores.map((_, idx) => (
                      <th key={idx} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[50px]">
                        {idx < 18 ? idx + 1 : `P${idx - 17}`}
                      </th>
                    ))}
                    <th className="sticky right-0 bg-white px-3 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 min-w-[60px]">Total</th>
                    <th className="sticky right-[60px] bg-white px-3 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 min-w-[60px]">Holes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="sticky left-0 bg-white py-3 pr-4 font-semibold text-gray-900">{selectedMatch.player1.split(' ')[0]}</td>
                    {scores.map((score, idx) => (
                      <td key={idx} className={`px-2 py-3 text-center font-semibold ${score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                        {score.p1}
                      </td>
                    ))}
                    <td className="sticky right-0 bg-white px-3 py-3 text-center font-bold text-gray-900 border-l-2 border-gray-200">
                      {scores.reduce((sum, s) => sum + s.p1, 0)}
                    </td>
                    <td className="sticky right-[60px] bg-white px-3 py-3 text-center font-bold text-blue-600 border-l-2 border-gray-200">
                      {status.p1Holes}
                    </td>
                  </tr>
                  <tr>
                    <td className="sticky left-0 bg-white py-3 pr-4 font-semibold text-gray-900">{selectedMatch.player2.split(' ')[0]}</td>
                    {scores.map((score, idx) => (
                      <td key={idx} className={`px-2 py-3 text-center font-semibold ${score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                        {score.p2}
                      </td>
                    ))}
                    <td className="sticky right-0 bg-white px-3 py-3 text-center font-bold text-gray-900 border-l-2 border-gray-200">
                      {scores.reduce((sum, s) => sum + s.p2, 0)}
                    </td>
                    <td className="sticky right-[60px] bg-white px-3 py-3 text-center font-bold text-blue-600 border-l-2 border-gray-200">
                      {status.p2Holes}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Match Result</p>
                  <p className="text-2xl font-bold text-gray-900">{status.p1Holes} - {status.p2Holes}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Winner</p>
                  <p className="text-xl font-bold text-green-600">{selectedMatch.winner}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DiscGolfApp;

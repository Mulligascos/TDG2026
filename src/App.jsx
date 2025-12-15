import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, Save, X } from 'lucide-react';

const SHEET_ID = '1Bwv9h3gayde4Qvb7lk9NarOZop9JlmlnnMZQEYkGrzQ';
// You'll need to add your Google API key here or in environment variables
const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI'; // Replace with your actual API key

const DiscGolfApp = () => {
  const [view, setView] = useState('login'); // login, matches, scoring, review, changePin
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

  // Monitor online status
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

  // Load data from Google Sheets
  useEffect(() => {
    if (isOnline) {
      loadSheetData();
      processPendingUpdates();
    }
  }, [isOnline]);

  // Save in-progress match to storage
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
      
      // Parse Players
      const playersData = data.valueRanges[0].values.slice(1).map(row => ({
        id: row[0],
        name: row[1],
        pin: row[2]
      }));
      setPlayers(playersData);
      
      // Parse Courses
      const coursesData = data.valueRanges[1].values.slice(1).map(row => ({
        id: row[0],
        name: row[1],
        code: row[2],
        holes: parseInt(row[3]),
        pars: JSON.parse(row[4] || '{}')
      }));
      setCourses(coursesData);
      
      // Parse Matches
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
      
      // Load from storage
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
      // Load from storage if available
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
      // In a real implementation, you would update the sheet here
      // For now, we'll update local state
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
    
    // Update in local state
    const updatedPlayers = players.map(p => 
      p.id === currentUser.id ? { ...p, pin: newPin } : p
    );
    setPlayers(updatedPlayers);
    setCurrentUser({ ...currentUser, pin: newPin });
    
    // Save to storage
    await window.storage.set('sheet-data', JSON.stringify({
      players: updatedPlayers,
      courses,
      matches
    }));
    
    // In real implementation, update Google Sheet here
    
    setNewPin('');
    setConfirmPin('');
    setView('matches');
    setError('');
  };

  const startMatch = async (match) => {
    setSelectedMatch(match);
    
    // Try to load saved progress
    const hasProgress = await loadMatchProgress(match.id);
    
    if (!hasProgress) {
      // Initialize new match
      const course = courses.find(c => c.name === match.venue);
      const initScores = Array(18).fill(null).map(() => ({
        p1: 0,
        p2: 0,
        scored: false
      }));
      setScores(initScores);
      setCurrentHole(0);
    }
    
    setView('scoring');
  };

  const calculateMatchStatus = () => {
    let p1Holes = 0;
    let p2Holes = 0;
    let holesPlayed = 0;
    
    scores.forEach((score, idx) => {
      if (score.scored) {
        holesPlayed++;
        if (score.p1 < score.p2) p1Holes++;
        else if (score.p2 < score.p1) p2Holes++;
      }
    });
    
    const holesRemaining = 18 - holesPlayed;
    const lead = Math.abs(p1Holes - p2Holes);
    const leader = p1Holes > p2Holes ? selectedMatch.player1 : 
                   p2Holes > p1Holes ? selectedMatch.player2 : null;
    
    const isDormie = lead > 0 && lead >= holesRemaining;
    const isComplete = holesPlayed === 18 && p1Holes !== p2Holes;
    const needsPlayoff = holesPlayed === 18 && p1Holes === p2Holes;
    
    return { p1Holes, p2Holes, holesPlayed, lead, leader, isDormie, isComplete, needsPlayoff };
  };

  const recordScore = (hole, p1Score, p2Score) => {
    const newScores = [...scores];
    newScores[hole] = { p1: p1Score, p2: p2Score, scored: true };
    setScores(newScores);
    
    // Auto-advance to next hole
    if (hole < scores.length - 1) {
      setCurrentHole(hole + 1);
    }
  };

  const addPlayoffHole = () => {
    setScores([...scores, { p1: 0, p2: 0, scored: false }]);
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

  // LOGIN VIEW
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#f0f0f0] p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Trophy className="text-[#ceb627] mr-2" size={32} />
            <h1 className="text-2xl font-bold">Matchplay Tracker</h1>
          </div>
          
          {!isOnline && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded mb-4 text-sm">
              Offline mode - data will sync when connected
            </div>
          )}
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleLogin(formData.get('player'), formData.get('pin'));
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Player Name</label>
              <select 
                name="player" 
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select your name</option>
                {players.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">PIN</label>
              <input 
                type="password" 
                name="pin"
                maxLength="4"
                pattern="[0-9]{4}"
                placeholder="4-digit PIN"
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            
            <button 
              type="submit"
              className="w-full bg-[#ceb627] text-white py-2 rounded font-medium hover:bg-[#b8a322] transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // CHANGE PIN VIEW
  if (view === 'changePin') {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Change PIN</h2>
          <button onClick={() => setView('matches')} className="text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New PIN</label>
              <input 
                type="password"
                maxLength="4"
                pattern="[0-9]{4}"
                placeholder="4 digits"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Confirm PIN</label>
              <input 
                type="password"
                maxLength="4"
                pattern="[0-9]{4}"
                placeholder="4 digits"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            
            <button 
              onClick={handleChangePin}
              className="w-full bg-[#ceb627] text-white py-2 rounded font-medium hover:bg-[#b8a322] transition"
            >
              Update PIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MATCHES LIST VIEW
  if (view === 'matches') {
    const userMatches = matches.filter(m => 
      m.player1 === currentUser.name || m.player2 === currentUser.name
    );
    const upcomingMatches = userMatches.filter(m => m.status !== 'completed');
    const completedMatches = matches.filter(m => m.status === 'completed');
    
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <div className="bg-white shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User className="mr-2 text-[#ceb627]" size={24} />
              <span className="font-bold">{currentUser.name}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setView('changePin')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                <Edit size={20} />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
          {!isOnline && (
            <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
              Offline - {pendingUpdates.length} pending updates
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Your Upcoming Matches</h2>
          {upcomingMatches.length === 0 ? (
            <p className="text-gray-600">No upcoming matches</p>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map(match => (
                <div 
                  key={match.id}
                  onClick={() => startMatch(match)}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{match.player1} vs {match.player2}</p>
                      <p className="text-sm text-gray-600">{match.venue}</p>
                      <p className="text-sm text-gray-500">{match.date} • {match.startTime}</p>
                    </div>
                    <ChevronRight className="text-[#ceb627]" size={24} />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <h2 className="text-xl font-bold mt-6 mb-4">Completed Matches</h2>
          {completedMatches.length === 0 ? (
            <p className="text-gray-600">No completed matches yet</p>
          ) : (
            <div className="space-y-3">
              {completedMatches.map(match => (
                <div 
                  key={match.id}
                  onClick={() => reviewMatch(match)}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{match.player1} vs {match.player2}</p>
                      <p className="text-sm text-gray-600">{match.venue}</p>
                      <p className="text-sm text-[#ceb627] font-medium">Winner: {match.winner}</p>
                    </div>
                    <ChevronRight className="text-gray-400" size={24} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCORING VIEW
  if (view === 'scoring') {
    const status = calculateMatchStatus();
    const course = courses.find(c => c.name === selectedMatch.venue);
    
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <div className="bg-white shadow-sm p-4">
          <button 
            onClick={() => {
              setView('matches');
              setSelectedMatch(null);
            }}
            className="text-gray-600 mb-2"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold">{selectedMatch.player1} vs {selectedMatch.player2}</h2>
          <p className="text-sm text-gray-600">{selectedMatch.venue}</p>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#ceb627]">{status.p1Holes}</p>
              <p className="text-sm">{selectedMatch.player1}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ceb627]">{status.p2Holes}</p>
              <p className="text-sm">{selectedMatch.player2}</p>
            </div>
          </div>
          
          {status.leader && (
            <div className="mt-2 text-center">
              <p className="text-sm font-medium">
                {status.leader} leads by {status.lead} {status.isDormie ? '(Dormie)' : ''}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4">
          {currentHole === 0 && scores[0] && !scores[0].scored && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <label className="block text-sm font-medium mb-2">Starting Hole</label>
              <select 
                value={startingHole}
                onChange={(e) => setStartingHole(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                {Array.from({length: 18}, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hole {h}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-bold text-lg mb-4">
              Hole {currentHole < 18 ? ((currentHole + startingHole - 1) % 18) + 1 : `Playoff ${currentHole - 17}`}
              {currentHole < 18 && course && (
                <span className="text-sm text-gray-600 ml-2">
                  (Par {course.pars[((currentHole + startingHole - 1) % 18) + 1]})
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{selectedMatch.player1} Score</label>
                <input 
                  type="number"
                  min="1"
                  value={scores[currentHole]?.p1 || ''}
                  onChange={(e) => {
                    const newScores = [...scores];
                    newScores[currentHole] = {
                      ...newScores[currentHole],
                      p1: parseInt(e.target.value) || 0
                    };
                    setScores(newScores);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">{selectedMatch.player2} Score</label>
                <input 
                  type="number"
                  min="1"
                  value={scores[currentHole]?.p2 || ''}
                  onChange={(e) => {
                    const newScores = [...scores];
                    newScores[currentHole] = {
                      ...newScores[currentHole],
                      p2: parseInt(e.target.value) || 0
                    };
                    setScores(newScores);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <button 
                onClick={() => {
                  if (scores[currentHole]?.p1 > 0 && scores[currentHole]?.p2 > 0) {
                    recordScore(currentHole, scores[currentHole].p1, scores[currentHole].p2);
                  }
                }}
                className="w-full bg-[#ceb627] text-white py-2 rounded font-medium hover:bg-[#b8a322] transition"
              >
                Record Score
              </button>
            </div>
          </div>
          
          {/* Scorecard */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h3 className="font-bold mb-2">Scorecard</h3>
            <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {scores.map((score, idx) => (
                score.scored && (
                  <div key={idx} className="flex justify-between items-center border-b py-1">
                    <span className="font-medium">
                      Hole {idx < 18 ? ((idx + startingHole - 1) % 18) + 1 : `P${idx - 17}`}
                    </span>
                    <div className="flex gap-4">
                      <span className={score.p1 < score.p2 ? 'font-bold text-[#ceb627]' : ''}>
                        {selectedMatch.player1}: {score.p1}
                      </span>
                      <span className={score.p2 < score.p1 ? 'font-bold text-[#ceb627]' : ''}>
                        {selectedMatch.player2}: {score.p2}
                      </span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
          
          {status.needsPlayoff && currentHole === 17 && (
            <button 
              onClick={addPlayoffHole}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition mb-2"
            >
              Add Playoff Hole
            </button>
          )}
          
          {status.isComplete && (
            <button 
              onClick={completeMatch}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Submitting...' : 'Complete Match'}
            </button>
          )}
          
          {error && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded mt-2 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // REVIEW VIEW
  if (view === 'review') {
    const status = calculateMatchStatus();
    
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <div className="bg-white shadow-sm p-4">
          <button 
            onClick={() => {
              setView('matches');
              setSelectedMatch(null);
            }}
            className="text-gray-600 mb-2"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold">{selectedMatch.player1} vs {selectedMatch.player2}</h2>
          <p className="text-sm text-gray-600">{selectedMatch.venue}</p>
          <p className="text-lg font-bold text-[#ceb627] mt-2">Winner: {selectedMatch.winner}</p>
        </div>
        
        <div className="p-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4">Final Scorecard</h3>
            <div className="space-y-1 text-sm">
              {scores.map((score, idx) => (
                <div key={idx} className="flex justify-between items-center border-b py-2">
                  <span className="font-medium">
                    Hole {idx < 18 ? idx + 1 : `Playoff ${idx - 17}`}
                  </span>
                  <div className="flex gap-4">
                    <span className={score.p1 < score.p2 ? 'font-bold text-[#ceb627]' : ''}>
                      {selectedMatch.player1}: {score.p1}
                    </span>
                    <span className={score.p2 < score.p1 ? 'font-bold text-[#ceb627]' : ''}>
                      {selectedMatch.player2}: {score.p2}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-lg font-bold">
                <span>{selectedMatch.player1}: {status.p1Holes} holes won</span>
                <span>{selectedMatch.player2}: {status.p2Holes} holes won</span>
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

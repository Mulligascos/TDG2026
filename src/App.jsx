import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check, Moon, Sun, ChevronRight } from 'lucide-react';

// ============================================================================
// LOGIN COMPONENT
// ============================================================================
const LoginPage = ({ players, onLogin, isOnline, darkMode, setDarkMode, error }) => {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(selectedPlayer, pin);
  };

  return (
    <div className="min-h-screen bg-white transition-colors">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="absolute top-4 right-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="text-center mb-12 mt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" style={{background: 'linear-gradient(to bottom right, #006400, #228B22)'}}>
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
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Player</label>
            <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2">
              <option value="">Choose your name</option>
              {players.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PIN</label>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} maxLength="4" placeholder="Enter 4-digit PIN" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2" />
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <button onClick={handleSubmit} className="w-full text-white py-3.5 rounded-xl font-semibold transition-colors shadow-lg" style={{backgroundColor: '#006400'}}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MATCHES COMPONENT
// ============================================================================
const MatchesPage = ({ currentUser, matches, onStartMatch, onReviewMatch, onChangePin, onLogout, isOnline, pendingUpdates, darkMode, setDarkMode, setView }) => {
  const [matchFilter, setMatchFilter] = useState('player');
  const [selectedFilterDate, setSelectedFilterDate] = useState('');
  const [selectedFilterPlayer, setSelectedFilterPlayer] = useState(currentUser.name);

  const userMatches = matches.filter(m => m.player1 === currentUser.name || m.player2 === currentUser.name);
  const upcomingMatches = userMatches.filter(m => m.status !== 'Completed');
  
  let completedMatches = matches.filter(m => m.status === 'Completed');
  
  if (matchFilter === 'date' && selectedFilterDate) {
    completedMatches = completedMatches.filter(m => m.date === selectedFilterDate);
  } else if (matchFilter === 'player' && selectedFilterPlayer) {
    completedMatches = completedMatches.filter(m => m.player1 === selectedFilterPlayer || m.player2 === selectedFilterPlayer);
  }
  
  const uniqueDates = [...new Set(matches.filter(m => m.status === 'Completed').map(m => m.date))].sort();
  const uniquePlayers = [...new Set(matches.filter(m => m.status === 'Completed').flatMap(m => [m.player1, m.player2]))].sort();

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
            <button onClick={() => setView('matches')} className="flex-1 py-2 px-4 rounded-lg font-semibold bg-white/20 text-white">
              Matches
            </button>
            <button onClick={() => setView('standings')} className="flex-1 py-2 px-4 rounded-lg font-semibold bg-white/5 text-white/70 hover:bg-white/10">
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
                <div key={match.id} onClick={() => onStartMatch(match)} className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all">
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
            <select value={matchFilter} onChange={(e) => { setMatchFilter(e.target.value); setSelectedFilterDate(''); setSelectedFilterPlayer(''); }} className="text-sm bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700">
              <option value="all">All Matches</option>
              <option value="date">By Date</option>
              <option value="player">By Player</option>
            </select>
          </div>
          
          {matchFilter === 'date' && (
            <div className="mb-4">
              <select value={selectedFilterDate} onChange={(e) => setSelectedFilterDate(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700">
                <option value="">Select a date</option>
                {uniqueDates.map(date => <option key={date} value={date}>{date}</option>)}
              </select>
            </div>
          )}
          
          {matchFilter === 'player' && (
            <div className="mb-4">
              <select value={selectedFilterPlayer} onChange={(e) => setSelectedFilterPlayer(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-700">
                <option value="">Select a player</option>
                {uniquePlayers.map(player => <option key={player} value={player}>{player}</option>)}
              </select>
            </div>
          )}
          
          {completedMatches.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">{matchFilter !== 'all' ? 'No matches found for this filter' : 'No completed matches yet'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedMatches.map(match => (
                <div key={match.id} onClick={() => onReviewMatch(match)} className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">{match.player1} <span className="text-gray-400 font-normal">vs</span> {match.player2}</p>
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
    </div>
  );
};

// ============================================================================
// CHANGE PIN COMPONENT
// ============================================================================
const ChangePinPage = ({ currentUser, onSave, onCancel, error }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSave = () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setLocalError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setLocalError('PINs do not match');
      return;
    }
    onSave(newPin);
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={onCancel} className="mr-4">
              <X size={24} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Change PIN</h2>
          </div>
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New PIN</label>
            <input 
              type="password"
              maxLength="4"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4 digits"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
            <input 
              type="password"
              maxLength="4"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4 digits"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {(localError || error) && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
              <p className="text-sm text-red-800">{localError || error}</p>
            </div>
          )}
          
          <button 
            onClick={handleSave}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Update PIN
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STANDINGS COMPONENT
// ============================================================================
const StandingsPage = ({ currentUser, matches, pools, onLogout, onChangePin, isOnline, pendingUpdates, darkMode, setDarkMode, setView }) => {
  const calculateStandings = (poolName) => {
    const poolPlayers = pools.filter(p => p.pool === poolName);
    
    const standings = poolPlayers.map(player => {
      const poolMatches = matches.filter(m => 
        m.status === 'Completed' && 
        (m.player1 === player.player || m.player2 === player.player)
      );

      let holesWon = 0;
      let holesLost = 0;

      poolMatches.forEach(match => {
        const isPlayer1 = match.player1 === player.player;
        let p1Holes = 0;
        let p2Holes = 0;
        
        if (match.scoresJson && match.scoresJson.length > 0) {
          match.scoresJson.forEach(score => {
            if (score.scored) {
              if (score.p1 < score.p2) p1Holes++;
              else if (score.p2 < score.p1) p2Holes++;
            }
          });
        }

        if (isPlayer1) {
          holesWon += p1Holes;
          holesLost += p2Holes;
        } else {
          holesWon += p2Holes;
          holesLost += p1Holes;
        }
      });

      return {
        name: player.player,
        points: player.points,
        holesWon,
        holesLost,
        holeDiff: holesWon - holesLost
      };
    });

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.holeDiff - a.holeDiff;
    });

    return standings;
  };

  const getPoolNames = () => {
    return [...new Set(pools.map(p => p.pool))].sort();
  };

  const poolNames = getPoolNames().filter(p => 
    !p.toLowerCase().includes('cup') && 
    !p.toLowerCase().includes('shield') && 
    !p.toLowerCase().includes('plate')
  );

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
            <button onClick={() => setView('matches')} className="flex-1 py-2 px-4 rounded-lg font-semibold bg-white/5 text-white/70 hover:bg-white/10">
              Matches
            </button>
            <button onClick={() => setView('standings')} className="flex-1 py-2 px-4 rounded-lg font-semibold bg-white/20 text-white">
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
        {pools.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="text-gray-400" size={28} />
            </div>
            <p className="text-gray-500">No pools configured</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pool Standings</h2>
              <div className="space-y-4">
                {poolNames.map(poolName => {
                  const standings = calculateStandings(poolName);
                  
                  return (
                    <div key={poolName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3" style={{background: 'linear-gradient(to right, #006400, #228B22)'}}>
                        <h2 className="text-lg font-bold text-white">{poolName}</h2>
                      </div>
                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left py-2 pr-2 font-semibold text-gray-700 text-xs w-8">#</th>
                              <th className="text-left py-2 pr-2 font-semibold text-gray-700 text-sm">Player</th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700 text-sm">Pts</th>
                              <th className="text-center py-2 pl-2 font-semibold text-gray-700 text-sm">+/-</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((standing, idx) => (
                              <tr 
                                key={standing.name} 
                                className={`border-b border-gray-100 ${standing.name === currentUser.name ? 'bg-green-50' : ''}`}
                              >
                                <td className="py-3 pr-2 text-gray-600 font-semibold text-sm">{idx + 1}</td>
                                <td className="py-3 pr-2 font-semibold text-gray-900 text-sm">
                                  {(() => {
                                    const nameParts = standing.name.split(' ');
                                    return nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}` : nameParts[0];
                                  })()}
                                </td>
                                <td className="py-3 px-2 text-center text-gray-900 font-bold text-base">{standing.points}</td>
                                <td className={`py-3 pl-2 text-center font-bold text-sm ${
                                  standing.holeDiff > 0 ? 'text-green-600' : 
                                  standing.holeDiff < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {standing.holeDiff > 0 ? '+' : ''}{standing.holeDiff}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SCORING COMPONENT
// ============================================================================
const ScoringPage = ({ selectedMatch, scores, setScores, currentHole, setCurrentHole, courses, onCancel, onComplete, loading, error }) => {
  const calculateMatchStatus = () => {
    let p1Holes = 0, p2Holes = 0, holesPlayed = 0;
    scores.forEach((score) => {
      if (score.scored) {
        holesPlayed++;
        if (score.p1 < score.p2) p1Holes++;
        else if (score.p2 < score.p1) p2Holes++;
      }
    });
    const holesRemaining = Math.max(0, 18 - holesPlayed);
    const lead = Math.abs(p1Holes - p2Holes);
    const leader = p1Holes > p2Holes ? selectedMatch.player1 : p2Holes > p1Holes ? selectedMatch.player2 : null;
    
    // Match is complete if lead is greater than holes remaining (dormie/winner decided)
    const isDormie = lead > 0 && lead >= holesRemaining && holesPlayed > 0;
    const isComplete = isDormie || (holesPlayed >= 18 && p1Holes !== p2Holes);
    const needsPlayoff = holesPlayed >= 18 && p1Holes === p2Holes;
    
    return { p1Holes, p2Holes, holesPlayed, lead, leader, isDormie, isComplete, needsPlayoff };
  };

  const recordScore = () => {
    const newScores = [...scores];
    newScores[currentHole].scored = true;
    setScores(newScores);
    if (currentHole < scores.length - 1) {
      setCurrentHole(currentHole + 1);
    }
  };

  const status = calculateMatchStatus();
  const course = courses.find(c => c.name === selectedMatch.venue || c.code === selectedMatch.venue);
  const actualHoleNumber = scores[currentHole]?.holeNumber || currentHole + 1; // Use tracked hole number
  const par = course && course.pars[actualHoleNumber] ? course.pars[actualHoleNumber] : 3;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onCancel} className="text-blue-600 font-semibold">← Cancel Match</button>
          </div>
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
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                status.isDormie 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {status.leader} {status.lead} UP {status.isDormie ? '(Dormie)' : ''}
              </span>
            </div>
          )}
          
          {status.needsPlayoff && (
            <div className="mt-3 text-center">
              <span className="inline-block bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                Match Tied - Playoff Needed
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Hole {actualHoleNumber}</h3>
              <p className="text-gray-500">Par {par}</p>
            </div>
            <div className="text-right text-sm text-gray-500">{status.holesPlayed} of {scores.length} holes</div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{selectedMatch.player1}</label>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <button onClick={() => { const newScores = [...scores]; newScores[currentHole].p1 = Math.max(1, newScores[currentHole].p1 - 1); setScores(newScores); }} className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600">
                  <Minus size={20} />
                </button>
                <div className="text-4xl font-bold text-gray-900">{scores[currentHole]?.p1 || 0}</div>
                <button onClick={() => { const newScores = [...scores]; newScores[currentHole].p1 = newScores[currentHole].p1 + 1; setScores(newScores); }} className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600">
                  <Plus size={20} />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{selectedMatch.player2}</label>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <button onClick={() => { const newScores = [...scores]; newScores[currentHole].p2 = Math.max(1, newScores[currentHole].p2 - 1); setScores(newScores); }} className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600">
                  <Minus size={20} />
                </button>
                <div className="text-4xl font-bold text-gray-900">{scores[currentHole]?.p2 || 0}</div>
                <button onClick={() => { const newScores = [...scores]; newScores[currentHole].p2 = newScores[currentHole].p2 + 1; setScores(newScores); }} className="w-12 h-12 flex items-center justify-center bg-white rounded-xl border-2 border-gray-200 text-gray-600">
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            {currentHole > 0 ? (
              <div className="flex gap-3">
                <button onClick={() => setCurrentHole(currentHole - 1)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold">← Previous</button>
                <button onClick={recordScore} disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300">
                  {currentHole < scores.length - 1 ? 'Next →' : 'Record'}
                </button>
              </div>
            ) : (
              <button onClick={recordScore} disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300">
                {currentHole < scores.length - 1 ? 'Next Hole' : 'Record Score'}
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={onComplete} 
          disabled={loading || !status.isComplete} 
          className="w-full text-white py-4 rounded-xl font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mb-4" 
          style={{backgroundColor: (loading || !status.isComplete) ? '#9ca3af' : '#006400'}}
        >
          {loading ? 'Submitting...' : status.isComplete ? '✓ Complete Match' : '⏸ Match In Progress'}
        </button>
        
        {!status.isComplete && status.holesPlayed > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r mb-4">
            <p className="text-sm text-blue-800">
              {status.needsPlayoff 
                ? 'Match is tied. Continue playing to determine a winner.' 
                : 'Continue playing until a winner is decided or the match reaches dormie.'}
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h3 className="font-bold text-gray-900 mb-4">Scorecard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="sticky left-0 bg-white text-left py-2 pr-2 font-semibold text-gray-700 text-xs w-16">Hole</th>
                  {scores.map((score, idx) => (
                    score.scored && (
                      <th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[35px]">
                        {score.holeNumber || (idx < 18 ? idx + 1 : `P${idx - 17}`)}
                      </th>
                    )
                  ))}
                  <th className="sticky right-0 bg-white px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 text-xs w-12">vs Par</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td colSpan={scores.filter(s => s.scored).length + 2} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">
                    {(() => {
                      const nameParts = selectedMatch.player1.split(' ');
                      return nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}` : nameParts[0];
                    })()}
                  </td>
                </tr>
                <tr className="border-b-2 border-gray-200">
                  <td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>
                  {scores.map((score, idx) => {
                    if (!score.scored) return null;
                    const holeNum = score.holeNumber || (idx < 18 ? idx + 1 : 1);
                    const par = course && course.pars[holeNum] ? course.pars[holeNum] : 3;
                    return (
                      <td key={idx} className={`px-1 py-2 text-center font-bold text-sm ${score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                        {score.p1}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-white px-2 py-2 text-center font-bold border-l-2 border-gray-200 text-sm">
                    {(() => {
                      const totalScore = scores.filter(s => s.scored).reduce((sum, s) => sum + s.p1, 0);
                      let totalPar = 0;
                      scores.forEach((score, idx) => {
                        if (score.scored) {
                          const holeNum = score.holeNumber || (idx < 18 ? idx + 1 : 1);
                          const par = course && course.pars[holeNum] ? course.pars[holeNum] : 3;
                          totalPar += par;
                        }
                      });
                      const diff = totalScore - totalPar;
                      return (
                        <span className={diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-900'}>
                          {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td colSpan={scores.filter(s => s.scored).length + 2} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">
                    {(() => {
                      const nameParts = selectedMatch.player2.split(' ');
                      return nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}` : nameParts[0];
                    })()}
                  </td>
                </tr>
                <tr>
                  <td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>
                  {scores.map((score, idx) => {
                    if (!score.scored) return null;
                    return (
                      <td key={idx} className={`px-1 py-2 text-center font-bold text-sm ${score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                        {score.p2}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-white px-2 py-2 text-center font-bold border-l-2 border-gray-200 text-sm">
                    {(() => {
                      const totalScore = scores.filter(s => s.scored).reduce((sum, s) => sum + s.p2, 0);
                      let totalPar = 0;
                      scores.forEach((score, idx) => {
                        if (score.scored) {
                          const holeNum = score.holeNumber || (idx < 18 ? idx + 1 : 1);
                          const par = course && course.pars[holeNum] ? course.pars[holeNum] : 3;
                          totalPar += par;
                        }
                      });
                      const diff = totalScore - totalPar;
                      return (
                        <span className={diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-900'}>
                          {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {error && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r mt-4">
            <p className="text-sm text-orange-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP - Routes between components
// ============================================================================
const DiscGolfApp = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pools, setPools] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [startingHole, setStartingHole] = useState(1);
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
  const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';

  useEffect(() => {
    if (isOnline) loadSheetData();
  }, [isOnline]);

  const loadSheetData = async () => {
    try {
      const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J', 'Pools!A:F'];
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${GOOGLE_API_KEY}`);
      const data = await response.json();
      
      setPlayers(data.valueRanges[0].values.slice(1).map(row => ({id: row[0], name: row[1], pin: row[2]})));
      setCourses(data.valueRanges[1].values.slice(1).map(row => ({id: row[0], name: row[1], code: row[2], holes: parseInt(row[3]), pars: JSON.parse(row[4] || '{}')})));
      setMatches(data.valueRanges[2].values.slice(1).map(row => ({id: row[0], date: row[1], venue: row[2], player1: row[3], player2: row[4], startTime: row[5], endTime: row[6], scoresJson: row[7] ? JSON.parse(row[7]) : [], winner: row[8], status: row[9] || 'scheduled'})));
      setPools(data.valueRanges[3]?.values.slice(1).map(row => ({
        pool: row[0],
        player: row[1],
        played: parseInt(row[2]) || 0,
        win: parseInt(row[3]) || 0,
        loss: parseInt(row[4]) || 0,
        points: parseInt(row[5]) || 0
      })) || []);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const handleLogin = (playerName, pin) => {
    const player = players.find(p => p.name === playerName && p.pin === pin);
    if (player) {
      setCurrentUser(player);
      setView('matches');
      setError('');
    } else {
      setError('Invalid player name or PIN');
    }
  };

  const startMatch = (match) => {
    setSelectedMatch(match);
    localStorage.removeItem(`match-progress-${match.id}`);
    setScores([]);
    setCurrentHole(0);
    setStartingHole(1);
    setShowStartHoleModal(true);
  };

  const confirmStartHole = () => {
    const course = courses.find(c => c.name === selectedMatch.venue || c.code === selectedMatch.venue);
    const startHoleNum = Number(startingHole);
    
    // Create scores array where index = hole number - 1
    // BUT reorder based on starting hole to allow wraparound
    const initScores = [];
    
    // Add holes from starting hole to 18
    for (let i = startHoleNum; i <= 18; i++) {
      const par = course && course.pars[i] ? course.pars[i] : 3;
      initScores.push({ 
        p1: par, 
        p2: par, 
        scored: false,
        holeNumber: i  // Track actual hole number
      });
    }
    
    // Add holes from 1 to starting hole - 1 (wraparound)
    for (let i = 1; i < startHoleNum; i++) {
      const par = course && course.pars[i] ? course.pars[i] : 3;
      initScores.push({ 
        p1: par, 
        p2: par, 
        scored: false,
        holeNumber: i  // Track actual hole number
      });
    }
    
    setScores(initScores);
    setCurrentHole(0); // Always start at index 0 (which is the starting hole)
    setShowStartHoleModal(false);
    setView('scoring');
  };

  const completeMatch = async () => {
    let p1Holes = 0, p2Holes = 0;
    scores.forEach(s => {
      if (s.scored) {
        if (s.p1 < s.p2) p1Holes++;
        else if (s.p2 < s.p1) p2Holes++;
      }
    });
    const winner = p1Holes > p2Holes ? selectedMatch.player1 : selectedMatch.player2;
    
    setLoading(true);
    try {
      // Submit to backend
      setView('matches');
      setSelectedMatch(null);
      setScores([]);
    } catch (err) {
      setError('Error submitting match');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = (newPin) => {
    const updatedPlayers = players.map(p => 
      p.id === currentUser.id ? { ...p, pin: newPin } : p
    );
    setPlayers(updatedPlayers);
    setCurrentUser({ ...currentUser, pin: newPin });
    setView('matches');
    setError('');
  };

  // ROUTING
  if (view === 'login') {
    return <LoginPage 
      players={players} 
      onLogin={handleLogin} 
      isOnline={isOnline} 
      darkMode={darkMode} 
      setDarkMode={setDarkMode} 
      error={error} 
    />;
  }

  if (view === 'changePin') {
    return <ChangePinPage
      currentUser={currentUser}
      onSave={handleChangePin}
      onCancel={() => setView('matches')}
      error={error}
    />;
  }

  if (view === 'standings') {
    return <StandingsPage
      currentUser={currentUser}
      matches={matches}
      pools={pools}
      onLogout={() => {setCurrentUser(null); setView('login');}}
      onChangePin={() => setView('changePin')}
      isOnline={isOnline}
      pendingUpdates={pendingUpdates}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      setView={setView}
    />;
  }

  if (view === 'matches') {
    return (
      <>
        <MatchesPage 
          currentUser={currentUser}
          matches={matches}
          onStartMatch={startMatch}
          onReviewMatch={(match) => {setSelectedMatch(match); setView('review');}}
          onChangePin={() => setView('changePin')}
          onLogout={() => {setCurrentUser(null); setView('login');}}
          isOnline={isOnline}
          pendingUpdates={pendingUpdates}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setView={setView}
        />
        {showStartHoleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="bg-white w-full rounded-t-3xl p-6 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Select Starting Hole</h3>
              <select value={startingHole} onChange={(e) => setStartingHole(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4">
                {Array.from({length: 18}, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hole {h}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button onClick={() => {setShowStartHoleModal(false); setSelectedMatch(null);}} className="flex-1 bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold">
                  Cancel
                </button>
                <button onClick={confirmStartHole} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold">
                  Start Match
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (view === 'scoring') {
    return (
      <ScoringPage 
        selectedMatch={selectedMatch}
        scores={scores}
        setScores={setScores}
        currentHole={currentHole}
        setCurrentHole={setCurrentHole}
        courses={courses}
        onCancel={() => {setView('matches'); setSelectedMatch(null); setScores([]);}}
        onComplete={completeMatch}
        loading={loading}
        error={error}
      />
    );
  }

  return null;
};

export default DiscGolfApp;

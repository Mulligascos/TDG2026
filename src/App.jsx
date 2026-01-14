import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, X, MapPin, Calendar, Plus, Minus, Sun, Moon } from 'lucide-react';

// Configuration from your environment
const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxW0Sa-T_oBu-5ka0TU6Hf1kkY_VBj40891Xq3Md1LdbuJfaHCRSqAK25xfnebtQXwWmg/exec';
const BRAND_PRIMARY = '#006400';

const DiscGolfApp = () => {
  // --- CORE STATE ---
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
  const [error, setError] = useState('');
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);
  const [matchFilter, setMatchFilter] = useState('all');
  const [filterValue, setFilterValue] = useState('');

  // --- DATA SYNC ---
  const loadData = async () => {
    try {
      const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J'];
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${GOOGLE_API_KEY}`);
      const data = await res.json();
      
      if (data.valueRanges) {
        setPlayers(data.valueRanges[0].values.slice(1).map(r => ({ id: r[0], name: r[1], pin: r[2] })));
        setCourses(data.valueRanges[1].values.slice(1).map(r => ({ id: r[0], name: r[1], code: r[2], pars: JSON.parse(r[4] || '{}') })));
        setMatches(data.valueRanges[2].values.slice(1).map(r => ({
          id: r[0], date: r[1], venue: r[2], player1: r[3], player2: r[4], 
          scoresJson: r[7] ? JSON.parse(r[7]) : [], winner: r[8], status: r[9] || 'scheduled'
        })));
      }
    } catch (err) { setError("Sync failed. Check connection."); }
  };

  useEffect(() => { loadData(); }, []);

  // --- MATCHPLAY LOGIC ---
  const status = useMemo(() => {
    if (!selectedMatch || !scores.length) return {};
    let p1 = 0, p2 = 0, played = 0;
    scores.forEach(s => {
      if (s.scored) {
        played++;
        if (s.p1 < s.p2) p1++; else if (s.p2 < s.p1) p2++;
      }
    });
    const lead = Math.abs(p1 - p2);
    const rem = 18 - played;
    const leader = p1 > p2 ? selectedMatch.player1 : selectedMatch.player2;
    const isComplete = (played >= 18 && p1 !== p2) || (played > 18 && lead > 0);
    return { p1, p2, played, lead, rem, leader, isComplete, allSquare: p1 === p2 };
  }, [scores, selectedMatch]);

  // --- ACTIONS ---
  const handleLogin = (name, pin) => {
    const p = players.find(x => x.name === name && x.pin === pin);
    if (p) { setCurrentUser(p); setView('matches'); } else { setError("Invalid PIN"); }
  };

  const startMatch = (m) => {
    setSelectedMatch(m);
    setShowStartHoleModal(true);
  };

const confirmStartHole = () => {
  const course = courses.find(c => c.name === selectedMatch.venue || c.code === selectedMatch.venue);
  const startHoleNum = Number(startingHole); 
  
  // Create a wrapped sequence of hole numbers (e.g., if starting at 3: [3,4,5...18,1,2])
  const wrappedHoleSequence = [];
  for (let i = 0; i < 18; i++) {
    let holeNum = ((startHoleNum - 1 + i) % 18) + 1;
    wrappedHoleSequence.push(holeNum);
  }
  
  const initScores = wrappedHoleSequence.map((holeNumber) => {
    const par = course && course.pars[holeNumber] ? course.pars[holeNumber] : 3;
    return {
      holeNumber: holeNumber, // Store the actual hole number for display
      p1: par,
      p2: par,
      scored: false
    };
  });

  setScores(initScores);
  setCurrentHole(0); // Always start at the first index of our new wrapped array
  setShowStartHoleModal(false);
  setView('scoring');
};

  const submitResults = async () => {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ matchId: selectedMatch.id, scores, winner: status.leader })
      });
      alert("Results Submitted!");
      loadData();
      setView('matches');
    } catch (e) { setError("Submission error."); }
  };

  // --- RENDER VIEWS ---
  if (view === 'login') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <Trophy size={60} color={BRAND_PRIMARY} className="mb-4" />
      <h1 className="text-2xl font-bold mb-8">Matchplay Tracker</h1>
      <select id="pSelect" className="w-full max-w-xs p-4 rounded-xl border mb-4 bg-white">
        <option value="">Select Player</option>
        {players.map(p => <option key={p.id}>{p.name}</option>)}
      </select>
      <input id="pinIn" type="password" placeholder="4-digit PIN" className="w-full max-w-xs p-4 rounded-xl border mb-6 text-center text-xl" maxLength="4" />
      <button onClick={() => handleLogin(document.getElementById('pSelect').value, document.getElementById('pinIn').value)} className="w-full max-w-xs py-4 text-white font-bold rounded-xl" style={{backgroundColor: BRAND_PRIMARY}}>Sign In</button>
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );

  if (view === 'scoring') return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0">
        <button onClick={() => setView('matches')}><X /></button>
        <div className="text-center font-bold">Hole {currentHole + 1} | Par {scores[currentHole].p1}</div>
        <div className="w-6" />
      </div>

      <div className="flex-1 p-6 space-y-6">
        {[1, 2].map(num => (
          <div key={num} className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="font-bold">{num === 1 ? selectedMatch.player1 : selectedMatch.player2}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => { const s = [...scores]; s[currentHole][`p${num}`]--; setScores(s); }} className="p-2 bg-gray-100 rounded-full"><Minus /></button>
              <span className="text-3xl font-black">{scores[currentHole][`p${num}`]}</span>
              <button onClick={() => { const s = [...scores]; s[currentHole][`p${num}`]++; setScores(s); }} className="p-2 bg-gray-100 rounded-full"><Plus /></button>
            </div>
          </div>
        ))}
        <button onClick={() => { const s = [...scores]; s[currentHole].scored = true; setScores(s); if(currentHole < scores.length - 1) setCurrentHole(currentHole + 1); }} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold">Record Score</button>
        {status.played === 18 && status.allSquare && <button onClick={() => setScores([...scores, { p1: 3, p2: 3, scored: false }])} className="w-full py-4 border-2 border-dashed border-gray-400 rounded-xl">Add Playoff Hole</button>}
      </div>

      <div className="bg-white border-t p-4 sticky bottom-0">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold">{status.allSquare ? "All Square" : `${status.leader} is ${status.lead} up`}</span>
          {status.isComplete && <button onClick={submitResults} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold">Submit Results</button>}
        </div>
        <div className="flex overflow-x-auto gap-2 no-scrollbar">
          {scores.map((s, i) => (
            <div key={i} onClick={() => setCurrentHole(i)} className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold ${currentHole === i ? 'bg-green-800 text-white' : s.scored ? 'bg-gray-200' : 'bg-gray-50'}`}>{i + 1}</div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 bg-white shadow-sm flex justify-between items-center sticky top-0 z-10">
        <h1 className="font-bold text-xl">Matches</h1>
        <button onClick={() => setView('login')} className="p-2 bg-gray-100 rounded-lg"><LogOut size={20}/></button>
      </div>

      <div className="p-4 space-y-6">
        {/* UPCOMING MATCHES */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Your Upcoming</h2>
          <div className="space-y-3">
            {matches.filter(m => m.status !== 'Completed' && (m.player1 === currentUser.name || m.player2 === currentUser.name)).map(m => (
              <div key={m.id} onClick={() => startMatch(m)} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border-l-4 border-green-700">
                <div>
                  <div className="text-xs text-gray-400 mb-1">{m.date} • {m.venue}</div>
                  <div className="font-bold">{m.player1} vs {m.player2}</div>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>

        {/* COMPLETED HISTORY */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">History</h2>
            <div className="flex gap-2">
              <select onChange={(e) => { setMatchFilter(e.target.value); setFilterValue(''); }} className="text-xs p-1 rounded border bg-white">
                <option value="all">All</option>
                <option value="player">Player</option>
                <option value="date">Date</option>
              </select>
              {matchFilter !== 'all' && <input onChange={(e) => setFilterValue(e.target.value)} placeholder={`Filter ${matchFilter}...`} className="text-xs p-1 rounded border w-24" />}
            </div>
          </div>
          <div className="space-y-2">
            {matches.filter(m => m.status === 'Completed')
              .filter(m => matchFilter === 'all' || (matchFilter === 'player' ? (m.player1.includes(filterValue) || m.player2.includes(filterValue)) : m.date.includes(filterValue)))
              .map(m => (
                <div key={m.id} className="bg-white p-3 rounded-xl shadow-sm text-sm flex justify-between">
                  <span>{m.player1} vs {m.player2}</span>
                  <span className="font-bold text-green-700">Winner: {m.winner}</span>
                </div>
            ))}
          </div>
        </div>
      </div>

      {showStartHoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6">
            <h2 className="font-bold mb-4">Starting Hole?</h2>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {[...Array(18)].map((_, i) => <button key={i} onClick={() => setStartingHole(i+1)} className={`p-2 rounded-lg font-bold ${startingHole === i+1 ? 'bg-green-800 text-white' : 'bg-gray-100'}`}>{i+1}</button>)}
            </div>
            <button onClick={confirmStart} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold">Start Match</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscGolfApp;

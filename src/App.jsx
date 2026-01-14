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
  const course = courses.find(c => c.name === selectedMatch.venue) || courses[0];
  const startHoleNum = Number(startingHole); 
  
  // Create wrapped array [Start...18, 1...Start-1]
  const sequence = [];
  for (let i = 0; i < 18; i++) {
    sequence.push(((startHoleNum - 1 + i) % 18) + 1);
  }
  
  const initScores = sequence.map(num => ({
    holeNum: num,
    p1: course.pars[num] || 3,
    p2: course.pars[num] || 3,
    scored: false,
    isPlayoff: false
  }));

  setScores(initScores);
  setCurrentHole(0); 
  setView('scoring');
};

const addPlayoffHole = () => {
  const lastHoleNum = scores[scores.length - 1].holeNum;
  const nextHoleNum = (lastHoleNum % 18) + 1;
  const course = courses.find(c => c.name === selectedMatch.venue) || courses[0];
  
  const newHole = {
    holeNum: nextHoleNum,
    p1: course.pars[nextHoleNum] || 3,
    p2: course.pars[nextHoleNum] || 3,
    scored: false,
    isPlayoff: true
  };
  
  setScores([...scores, newHole]);
  setCurrentHole(scores.length); // Move to the new hole immediately
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

if (view === 'scoring') {
  const status = calculateMatchStatus(); // Uses logic from previous response
  const activeHole = scores[currentHole];

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* 1. HEADER & NAVIGATION */}
      <div className="bg-white p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => setCurrentHole(Math.max(0, currentHole - 1))} className="p-2 bg-gray-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-xs font-bold text-gray-400 uppercase">Hole {activeHole.holeNum} {activeHole.isPlayoff && '(Playoff)'}</h2>
            <p className="font-bold text-xl">{status.state}</p>
          </div>
          <button onClick={() => setCurrentHole(Math.min(scores.length - 1, currentHole + 1))} className="p-2 bg-gray-100 rounded-full">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* 2. SCORING CARDS */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {[1, 2].map(num => {
          const pName = num === 1 ? selectedMatch.player1 : selectedMatch.player2;
          return (
            <div key={num} className="bg-white rounded-3xl p-6 shadow-sm flex items-center justify-between border-2 border-transparent focus-within:border-green-700">
              <span className="font-bold text-lg text-gray-700">{pName}</span>
              <div className="flex items-center gap-6">
                <button onClick={() => { const s = [...scores]; s[currentHole][`p${num}`]--; setScores(s); }} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-2xl">-</button>
                <span className="text-5xl font-black w-16 text-center">{activeHole[`p${num}`]}</span>
                <button onClick={() => { const s = [...scores]; s[currentHole][`p${num}`]++; setScores(s); }} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-2xl">+</button>
              </div>
            </div>
          );
        })}
        <button 
          onClick={() => {
            const s = [...scores]; s[currentHole].scored = true; setScores(s);
            if (currentHole < scores.length - 1) setCurrentHole(currentHole + 1);
          }}
          className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-lg"
        >
          Confirm Hole {activeHole.holeNum}
        </button>
        
        {status.needsPlayoff && (
          <button onClick={addPlayoffHole} className="w-full py-4 border-2 border-dashed border-gray-400 text-gray-500 rounded-2xl font-bold">
            + Add Playoff Hole
          </button>
        )}

        {status.isComplete && (
          <button onClick={submitMatch} className="w-full py-5 bg-green-700 text-white rounded-2xl font-black text-xl animate-pulse shadow-xl">
            SUBMIT SCORES
          </button>
        )}
      </div>

      {/* 3. STICKY SCOREBOARD (Horizontal Scroll) */}
      <div className="bg-white border-t flex flex-row overflow-hidden h-32">
        {/* Fixed Left Names */}
        <div className="w-24 flex-shrink-0 bg-gray-50 border-r font-bold text-[10px] flex flex-col justify-around p-2">
          <div className="h-4 text-gray-400">HOLE</div>
          <div className="truncate">{selectedMatch.player1}</div>
          <div className="truncate">{selectedMatch.player2}</div>
        </div>

        {/* Scrollable Center Scores */}
        <div className="flex-1 overflow-x-auto flex flex-row">
          {scores.map((s, idx) => (
            <div key={idx} onClick={() => setCurrentHole(idx)} className={`flex-shrink-0 w-10 flex flex-col justify-around items-center border-r text-[10px] ${currentHole === idx ? 'bg-green-50' : ''}`}>
              <div className="font-bold text-gray-400">{s.holeNum}</div>
              <div className={s.scored ? 'font-bold' : 'text-gray-300'}>{s.p1}</div>
              <div className={s.scored ? 'font-bold' : 'text-gray-300'}>{s.p2}</div>
            </div>
          ))}
        </div>

        {/* Fixed Right Totals */}
        <div className="w-16 flex-shrink-0 bg-gray-100 border-l font-bold text-[10px] flex flex-col justify-around items-center">
          <div className="text-gray-400">TOT</div>
          <div>{scores.filter(s=>s.scored).reduce((a,b)=>a+b.p1, 0)}</div>
          <div>{scores.filter(s=>s.scored).reduce((a,b)=>a+b.p2, 0)}</div>
        </div>
      </div>
    </div>
  );
}

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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check, Moon, Sun, ChevronLeft, Lock } from 'lucide-react';

// --- CONFIGURATION ---
const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxW0Sa-T_oBu-5ka0TU6Hf1kkY_VBj40891Xq3Md1LdbuJfaHCRSqAK25xfnebtQXwWmg/exec';

const BRAND_PRIMARY = '#006400';
const BRAND_ACCENT = '#228B22';

const DiscGolfApp = () => {
  // --- STATE ---
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [currentHoleIdx, setCurrentHoleIdx] = useState(0);
  const [showStartHoleModal, setShowStartHoleModal] = useState(false);
  const [startingHole, setStartingHole] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  // --- DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J'];
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.valueRanges) {
        setPlayers(data.valueRanges[0].values?.slice(1).map(r => ({ id: r[0], name: r[1], pin: r[2] })) || []);
        setCourses(data.valueRanges[1].values?.slice(1).map(r => ({ id: r[0], name: r[1], code: r[2], holes: parseInt(r[3]), pars: JSON.parse(r[4] || '{}') })) || []);
        setMatches(data.valueRanges[2].values?.slice(1).map(r => ({
          id: r[0], date: r[1], venue: r[2], p1: r[3], p2: r[4], 
          scoresJson: r[7] ? JSON.parse(r[7]) : [], winner: r[8], status: r[9] || 'scheduled'
        })) || []);
      }
    } catch (err) {
      setError("Failed to sync with Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- MATCHPLAY LOGIC ---
  const matchStatus = useMemo(() => {
    if (!selectedMatch || !scores.length) return { p1Up: 0, p2Up: 0, status: 'All Square' };
    let p1Wins = 0, p2Wins = 0, played = 0;
    scores.forEach(s => {
      if (s.scored) {
        played++;
        if (s.p1 < s.p2) p1Wins++;
        else if (s.p2 < s.p1) p2Wins++;
      }
    });
    
    const lead = Math.abs(p1Wins - p2Wins);
    const rem = 18 - played;
    const leader = p1Wins > p2Wins ? selectedMatch.p1 : selectedMatch.p2;
    
    let state = lead === 0 ? 'All Square' : `${leader} is ${lead} up`;
    if (lead > rem && rem >= 0) state = `${leader} wins ${lead} & ${rem}`;
    
    return { p1Wins, p2Wins, played, lead, rem, leader, state, isOver: (lead > rem && played >= 1) || (played >= 18 && lead > 0) };
  }, [scores, selectedMatch]);

  // --- ACTIONS ---
  const handleLogin = (name, pin) => {
    const user = players.find(p => p.name === name && p.pin === pin);
    if (user) { setCurrentUser(user); setView('matches'); setError(''); }
    else { setError('Invalid Name or PIN'); }
  };

  const startMatch = (match) => {
    setSelectedMatch(match);
    setShowStartHoleModal(true);
  };

  const confirmStart = () => {
    const course = courses.find(c => c.name === selectedMatch.venue) || courses[0];
    const initScores = Array(18).fill(null).map((_, i) => ({
      hole: i + 1, p1: course.pars[i + 1] || 3, p2: course.pars[i + 1] || 3, scored: false
    }));
    setScores(initScores);
    setCurrentHoleIdx(startingHole - 1);
    setShowStartHoleModal(false);
    setView('scoring');
  };

  const submitMatch = async () => {
    setLoading(true);
    const payload = {
      matchId: selectedMatch.id,
      scores: scores,
      winner: matchStatus.leader,
      status: 'Completed'
    };

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Apps Script
        body: JSON.stringify(payload)
      });
      alert("Scores submitted successfully!");
      fetchData();
      setView('matches');
    } catch (e) {
      alert("Submission failed. Check internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  if (view === 'login') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6"><Trophy size={48} color={BRAND_PRIMARY} /></div>
        <h1 className="text-2xl font-bold text-center mb-8">Tournament Login</h1>
        <select id="loginName" className="w-full p-4 border rounded-xl mb-4 bg-gray-50">
          <option value="">Select Your Name</option>
          {players.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <input id="loginPin" type="password" placeholder="4-Digit PIN" className="w-full p-4 border rounded-xl mb-6 text-center text-2xl tracking-widest" maxLength="4" />
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <button onClick={() => handleLogin(document.getElementById('loginName').value, document.getElementById('loginPin').value)} className="w-full py-4 rounded-xl text-white font-bold" style={{backgroundColor: BRAND_PRIMARY}}>Sign In</button>
      </div>
    </div>
  );

  if (view === 'scoring') return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white p-4 flex justify-between items-center shadow-sm">
        <button onClick={() => setView('matches')}><X /></button>
        <div className="text-center">
          <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Hole {currentHoleIdx + 1}</span>
          <div className="font-bold text-xl">Par {scores[currentHoleIdx].p1}</div>
        </div>
        <div className="w-6" />
      </div>

      <div className="flex-1 p-6 flex flex-col justify-center gap-8">
        {[1, 2].map(num => (
          <div key={num} className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
            <span className="font-bold text-gray-700">{num === 1 ? selectedMatch.p1 : selectedMatch.p2}</span>
            <div className="flex items-center gap-6">
              <button onClick={() => {
                const s = [...scores]; s[currentHoleIdx][`p${num}`]--; setScores(s);
              }} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><Minus /></button>
              <span className="text-4xl font-black">{scores[currentHoleIdx][`p${num}`]}</span>
              <button onClick={() => {
                const s = [...scores]; s[currentHoleIdx][`p${num}`]++; setScores(s);
              }} className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><Plus /></button>
            </div>
          </div>
        ))}
        
        <button 
          onClick={() => { const s = [...scores]; s[currentHoleIdx].scored = true; setScores(s); if(currentHoleIdx < 17) setCurrentHoleIdx(currentHoleIdx + 1); }}
          className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold"
        >
          Confirm Hole Score
        </button>
      </div>

      {/* FIXED FOOTER SCOREBOARD */}
      <div className="bg-white border-t p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-lg">{matchStatus.state}</span>
          {matchStatus.isOver && (
            <button onClick={submitMatch} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold animate-bounce">Submit Results</button>
          )}
        </div>
        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2">
          {scores.map((s, i) => (
            <div key={i} onClick={() => setCurrentHoleIdx(i)} className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold ${currentHoleIdx === i ? 'bg-green-700 text-white' : s.scored ? 'bg-gray-200' : 'bg-gray-50 text-gray-400'}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 bg-white shadow-sm flex justify-between items-center">
        <h1 className="font-bold text-xl">My Matches</h1>
        <button onClick={() => setView('login')}><LogOut size={20}/></button>
      </div>
      
      <div className="p-4 space-y-4">
        {matches.filter(m => m.p1 === currentUser.name || m.p2 === currentUser.name).map(m => (
          <div key={m.id} onClick={() => m.status !== 'Completed' && startMatch(m)} className="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14}/> {m.venue}</div>
              <div className="font-bold text-lg">{m.p1} vs {m.p2}</div>
            </div>
            {m.status === 'Completed' ? <span className="text-green-600 font-bold">Done</span> : <ChevronRight className="text-gray-400"/>}
          </div>
        ))}
      </div>

      {/* START HOLE MODAL */}
      {showStartHoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-4">Select Starting Hole</h2>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {[...Array(18)].map((_, i) => (
                <button key={i} onClick={() => setStartingHole(i+1)} className={`p-2 rounded-lg font-bold ${startingHole === i+1 ? 'bg-green-700 text-white' : 'bg-gray-100'}`}>{i+1}</button>
              ))}
            </div>
            <button onClick={confirmStart} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold">Start Round</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscGolfApp;

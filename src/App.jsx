import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, ChevronRight, ChevronLeft, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check, Moon, Sun } from 'lucide-react';

const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxW0Sa-T_oBu-5ka0TU6Hf1kkY_VBj40891Xq3Md1LdbuJfaHCRSqAK25xfnebtQXwWmg/exec';
const PRIMARY = '#006400', SECONDARY = '#FFD700', ACCENT = '#228B22';

const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(dark));
    document.body.classList.toggle('dark-mode', dark);
  }, [dark]);

  useEffect(() => {
    const s = document.createElement('style');
    s.innerHTML = `* {transition: background-color 0.3s, color 0.3s, border-color 0.3s;}
      body.dark-mode {background: #111827; color: #f9fafb;}
      .dark-mode .bg-white {background: #1f2937 !important;}
      .dark-mode .bg-gray-50 {background: #111827 !important;}
      .dark-mode .bg-gray-100 {background: #374151 !important;}
      .dark-mode .text-gray-900 {color: #f9fafb !important;}
      .dark-mode .text-gray-700 {color: #d1d5db !important;}
      .dark-mode .text-gray-600 {color: #9ca3af !important;}
      .dark-mode .text-gray-500 {color: #6b7280 !important;}
      .dark-mode .border-gray-200 {border-color: #374151 !important;}
      .dark-mode select, .dark-mode input {background: #374151 !important; color: #f9fafb !important; border-color: #4b5563 !important;}
      .dark-mode .bg-red-50 {background: rgba(153,27,27,0.2) !important;}
      .dark-mode .text-red-800 {color: #fca5a5 !important;}
      .dark-mode .bg-orange-50 {background: rgba(154,52,18,0.2) !important;}
      .dark-mode .text-orange-800 {color: #fdba74 !important;}
      .dark-mode .bg-blue-50 {background: rgba(30,58,138,0.3) !important;}
      .dark-mode .shadow-lg {box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3) !important;}`;
    document.head.appendChild(s);
    return () => document.head.contains(s) && document.head.removeChild(s);
  }, []);
  return [dark, setDark];
};

const Modal = ({ open, close, children, dark }) => open ? (
  <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={close}>
    <div className={`${dark ? 'bg-gray-800' : 'bg-white'} w-full rounded-t-3xl p-6 max-w-md mx-auto`} onClick={e => e.stopPropagation()}>{children}</div>
  </div>
) : null;

const ChangePinModal = ({ open, close, submit, dark }) => {
  const [pin, setPin] = useState(''), [confirm, setConfirm] = useState(''), [err, setErr] = useState('');
  const handle = () => {
    if (pin.length !== 4 || confirm.length !== 4) return setErr('PIN must be 4 digits');
    if (pin !== confirm) return setErr('PINs do not match');
    submit(pin); setPin(''); setConfirm(''); setErr('');
  };
  return (
    <Modal open={open} close={close} dark={dark}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Change PIN</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New PIN</label>
          <input type="password" maxLength="4" placeholder="4 digits" value={pin} onChange={e => setPin(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
          <input type="password" maxLength="4" placeholder="4 digits" value={confirm} onChange={e => setConfirm(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        {err && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r"><p className="text-sm text-red-800">{err}</p></div>}
        <div className="flex gap-3">
          <button onClick={close} className="flex-1 bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold">Cancel</button>
          <button onClick={handle} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold">Update</button>
        </div>
      </div>
    </Modal>
  );
};

const StartHoleModal = ({ open, close, confirm, hole, setHole, dark }) => (
  <Modal open={open} close={close} dark={dark}>
    <h3 className="text-xl font-bold text-gray-900 mb-4">Select Starting Hole</h3>
    <select value={hole} onChange={e => setHole(parseInt(e.target.value))}
            className="w-full bg-gray-50 border rounded-xl px-4 py-3 mb-4 focus:ring-2">
      {[...Array(18)].map((_, i) => <option key={i+1} value={i+1}>Hole {i+1}</option>)}
    </select>
    <div className="flex gap-3">
      <button onClick={close} className="flex-1 bg-gray-200 py-3.5 rounded-xl font-semibold">Cancel</button>
      <button onClick={confirm} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold">Start</button>
    </div>
  </Modal>
);

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [players, setPlayers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [matches, setMatches] = useState([]);
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [hole, setHole] = useState(0);
  const [startHole, setStartHole] = useState(1);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [filter, setFilter] = useState('user');
  const [filterDate, setFilterDate] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => { if (online) { loadData(); processPending(); } }, [online]);
  useEffect(() => { if (match && scores.length) saveProgress(); }, [scores, match]);

  const loadData = async () => {
    try {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=Players!A:C&ranges=Courses!A:E&ranges=Matches!A:J&key=${API_KEY}`);
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      const p = d.valueRanges[0].values.slice(1).map(r => ({id: r[0], name: r[1], pin: r[2]}));
      const c = d.valueRanges[1].values.slice(1).map(r => ({id: r[0], name: r[1], holes: parseInt(r[3]), pars: JSON.parse(r[4]||'{}')}));
      const m = d.valueRanges[2].values.slice(1).map(r => ({id: r[0], date: r[1], venue: r[2], player1: r[3], player2: r[4], startTime: r[5], scoresJson: r[7] ? JSON.parse(r[7]) : [], winner: r[8], status: r[9]||'scheduled'}));
      setPlayers(p); setCourses(c); setMatches(m);
      localStorage.setItem('data', JSON.stringify({players: p, courses: c, matches: m}));
    } catch (e) {
      const s = localStorage.getItem('data');
      if (s) { const d = JSON.parse(s); setPlayers(d.players||[]); setCourses(d.courses||[]); setMatches(d.matches||[]); }
    }
  };

  const saveProgress = () => {
    try { localStorage.setItem(`progress-${match.id}`, JSON.stringify({scores, hole, startHole, ts: Date.now()})); } catch {}
  };

  const loadProgress = id => {
    try {
      const s = localStorage.getItem(`progress-${id}`);
      if (s) { const p = JSON.parse(s); setScores(p.scores); setHole(p.hole); setStartHole(p.startHole); return true; }
    } catch {}
    return false;
  };

  const processPending = async () => {
    try {
      const s = localStorage.getItem('pending');
      if (s) { const u = JSON.parse(s); for (const up of u) await submit(up.matchId, up.scores, up.winner); localStorage.removeItem('pending'); setPending([]); }
    } catch {}
  };

  const submit = async (id, sc, win) => {
    if (!online) { const u = [...pending, {matchId: id, scores: sc, winner: win}]; setPending(u); localStorage.setItem('pending', JSON.stringify(u)); return; }
    try {
      const up = matches.map(m => m.id === id ? {...m, scoresJson: sc, winner: win, status: 'Completed'} : m);
      setMatches(up);
      localStorage.setItem('data', JSON.stringify({players, courses, matches: up}));
      await fetch(SCRIPT_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({matchId: id, scores: sc, winner: win}), mode: 'no-cors'});
    } catch {}
  };

  const login = (name, pin) => {
    const p = players.find(p => p.name === name && p.pin === pin);
    if (p) { setUser(p); setView('matches'); setError(''); } else setError('Invalid');
  };

  const logout = () => { setUser(null); setView('login'); setMatch(null); setScores([]); };

  const changePin = pin => {
    const up = players.map(p => p.id === user.id ? {...p, pin} : p);
    setPlayers(up); setUser({...user, pin});
    localStorage.setItem('data', JSON.stringify({players: up, courses, matches}));
    setShowPin(false);
  };

  const start = async m => {
    setMatch(m);
    const has = await loadProgress(m.id);
    if (!has) {
      const c = courses.find(c => c.name === m.venue);
      const init = [...Array(18)].map((_, i) => ({p1: c?.pars[i+1]||3, p2: c?.pars[i+1]||3, scored: false}));
      setScores(init); setHole(0); setShowStart(true);
    } else setView('scoring');
  };

  const confirmStart = () => { setShowStart(false); setView('scoring'); };

  const cancel = () => { if (confirm('Cancel? Progress saved.')) { setMatch(null); setScores([]); setHole(0); setStartHole(1); setView('matches'); } };

  const calcStatus = () => {
    let p1=0, p2=0, played=0;
    scores.forEach(s => { if (s.scored) { played++; if (s.p1 < s.p2) p1++; else if (s.p2 < s.p1) p2++; } });
    const rem = Math.max(0, 18-played), lead = Math.abs(p1-p2);
    const leader = p1 > p2 ? match.player1 : p2 > p1 ? match.player2 : null;
    const dormie = lead > 0 && lead >= rem && played <= 18;
    const done = (played >= 18 && p1 !== p2) || (played > 18 && leader);
    const playoff = played === 18 && p1 === p2;
    return {p1, p2, played, lead, leader, dormie, done, playoff};
  };

  const record = (h, s1, s2) => { const n = [...scores]; n[h] = {p1: s1, p2: s2, scored: true}; setScores(n); };

  const nav = dir => { if (dir === 'next' && hole < scores.length-1) setHole(hole+1); else if (dir === 'prev' && hole > 0) setHole(hole-1); };

  const addPlayoff = () => { const c = courses.find(c => c.name === match.venue); setScores([...scores, {p1: c?.pars[1]||3, p2: c?.pars[1]||3, scored: false}]); setHole(scores.length); };

  const complete = async () => {
    const st = calcStatus();
    if (!st.leader) return setError('Not complete');
    setLoading(true);
    try { await submit(match.id, scores, st.leader); localStorage.removeItem(`progress-${match.id}`); setView('matches'); setMatch(null); setScores([]); }
    catch { setError('Will submit when online'); }
    finally { setLoading(false); }
  };

  const review = m => { setMatch(m); setScores(m.scoresJson||[]); setView('review'); };

  if (view === 'login') return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="absolute top-4 right-4">
          <button onClick={() => setDark(!dark)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="text-center mb-12 mt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" 
               style={{background: `linear-gradient(to bottom right, ${PRIMARY}, ${ACCENT})`}}>
            <Trophy className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Matchplay</h1>
          <p className="text-gray-500">Disc Golf Tournament</p>
        </div>
        {!online && <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r"><p className="text-sm text-orange-800">Offline. Will sync.</p></div>}
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.target); login(f.get('player'), f.get('pin')); }} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Player</label>
            <select name="player" required className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:ring-2">
              <option value="">Choose</option>
              {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PIN</label>
            <input type="password" name="pin" maxLength="4" placeholder="4 digits" required className="w-full bg-gray-50 border rounded-xl px-4 py-3 focus:ring-2" />
          </div>
          {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r"><p className="text-sm text-red-800">{error}</p></div>}
          <button type="submit" className="w-full text-white py-3.5 rounded-xl font-semibold shadow-lg" style={{backgroundColor: PRIMARY}}>Sign In</button>
        </form>
      </div>
    </div>
  );

  if (view === 'matches') {
    const userMatches = matches.filter(m => m.player1 === user.name || m.player2 === user.name);
    const upcoming = userMatches.filter(m => m.status !== 'Completed');
    let completed = matches.filter(m => m.status === 'Completed');
    if (filter === 'user') completed = completed.filter(m => m.player1 === user.name || m.player2 === user.name);
    else if (filter === 'date' && filterDate) completed = completed.filter(m => m.date === filterDate);
    else if (filter === 'player' && filterPlayer) completed = completed.filter(m => m.player1 === filterPlayer || m.player2 === filterPlayer);
    const dates = [...new Set(matches.filter(m => m.status === 'Completed').map(m => m.date))].sort();
    const plys = [...new Set(matches.filter(m => m.status === 'Completed').flatMap(m => [m.player1, m.player2]))].sort();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white sticky top-0 z-10 shadow-lg">
          <div className="max-w-md mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3"><User size={20} /></div>
                <div><p className="text-sm opacity-90">Signed in as</p><p className="font-bold">{user.name}</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDark(!dark)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
                <button onClick={() => setShowPin(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><Edit size={20} /></button>
                <button onClick={logout} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><LogOut size={20} /></button>
              </div>
            </div>
            {!online && <div className="bg-white/10 px-3 py-2 rounded-lg text-sm flex items-center"><div className="w-2 h-2 bg-orange-300 rounded-full mr-2"></div>Offline • {pending.length} pending</div>}
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Matches</h2>
            {upcoming.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trophy className="text-gray-400" size={28} /></div>
                <p className="text-gray-500">No upcoming matches</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(m => (
                  <div key={m.id} onClick={() => start(m)} className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" /><span>{m.date}</span>
                        <Clock size={14} className="ml-3 mr-1" /><span>{m.startTime}</span>
                      </div>
                      <ChevronRight className="text-blue-600" size={20} />
                    </div>
                    <p className="font-bold text-gray-900 text-lg mb-1">{m.player1} <span className="text-gray-400 font-normal">vs</span> {m.player2}</p>
                    <div className="flex items-center text-sm text-gray-600"><MapPin size={14} className="mr-1" />{m.venue}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Completed</h2>
              <select value={filter} onChange={e => {setFilter(e.target.value); setFilterDate(''); setFilterPlayer('');}}
                      className="text-sm bg-white border rounded-lg px-3 py-1.5 focus:ring-2">
                <option value="user">My Matches</option>
                <option value="all">All</option>
                <option value="date">By Date</option>
                <option value="player">By Player</option>
              </select>
            </div>
            {filter === 'date' && <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full bg-white border rounded-lg px-4 py-2 mb-4 focus:ring-2">
              <option value="">Select date</option>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>}
            {filter === 'player' && <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)} className="w-full bg-white border rounded-lg px-4 py-2 mb-4 focus:ring-2">
              <option value="">Select player</option>
              {plys.map(p => <option key={p} value={p}>{p}</option>)}
            </select>}
            {completed.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center"><p className="text-gray-500">{filter !== 'all' ? 'No matches' : 'No completed'}</p></div>
            ) : (
              <div className="space-y-3">
                {completed.map(m => (
                  <div key={m.id} onClick={() => review(m)} className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-gray-900">{m.player1} <span className="text-gray-400 font-normal">vs</span> {m.player2}</p>
                      <span className="text-xs text-gray-500">{m.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600"><MapPin size={14} className="mr-1" />{m.venue}</div>
                      <div className="flex items-center"><Check size={16} className="text-green-600 mr-1" /><span className="text-sm font-semibold text-green-600">{m.winner} won</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <ChangePinModal open={showPin} close={() => setShowPin(false)} submit={changePin} dark={dark} />
        <StartHoleModal open={showStart} close={() => {setShowStart(false); cancel();}} confirm={confirmStart} hole={startHole} setHole={setStartHole} dark={dark} />
      </div>
    );
  }

  if (view === 'scoring') {
    const st = calcStatus(), c = courses.find(c => c.name === match.venue), actualHole = hole < 18 ? ((hole + startHole - 1) % 18) + 1 : hole - 17, par = hole < 18 && c ? c.pars[actualHole] : 3;
    return (
      <div className="min-h-screen bg-gray-50"><div className="bg-white shadow-sm sticky top-0 z-10"><div className="max-w-md mx-auto px-4 py-2"><div className="flex items-center justify-between mb-2"><button onClick={cancel} className="text-blue-600 text-sm font-semibold">← Cancel</button><button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg bg-gray-100">{dark ? <Sun size={18} /> : <Moon size={18} />}</button></div><div className="flex items-center text-xs text-gray-600 mb-2"><MapPin size={12} className="mr-1" />{match.venue}</div></div></div><div className="max-w-md mx-auto px-4 py-3"><div className="bg-white rounded-xl shadow-sm p-3 mb-3"><div className="text-center mb-3"><div className="text-lg font-bold text-gray-900">{match.player1} <span className="text-gray-400 text-sm">vs</span> {match.player2}</div></div><div className="flex items-center justify-center gap-6 mb-2"><div className="text-3xl font-bold text-blue-600">{st.p1}</div><div className="text-gray-300 text-xl">-</div><div className="text-3xl font-bold text-blue-600">{st.p2}</div></div>{st.leader && <div className="text-center"><span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{st.leader} {st.lead} {st.dormie ? 'UP (Dormie)' : 'UP'}</span></div>}</div><div className="bg-white rounded-xl shadow-sm p-3 mb-3"><div className="flex items-center justify-between mb-3"><div><h3 className="text-xl font-bold text-gray-900">Hole {hole < 18 ? actualHole : `P${actualHole}`}</h3><p className="text-sm text-gray-500">Par {par} • {st.played} of {scores.length}</p></div><div className="flex gap-2"><button onClick={() => nav('prev')} disabled={hole === 0} className="p-2 bg-gray-100 rounded-lg disabled:opacity-30"><ChevronLeft size={20} /></button><button onClick={() => nav('next')} disabled={hole >= scores.length-1} className="p-2 bg-gray-100 rounded-lg disabled:opacity-30"><ChevronRight size={20} /></button></div></div><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-700 w-20">{match.player1.split(' ')[0]}</span><div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2"><button onClick={() => {const n=[...scores]; const cur=n[hole]?.p1||0; n[hole]={...n[hole],p1:Math.max(1,cur-1)}; setScores(n);}} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-gray-200 active:bg-gray-100"><Minus size={18} /></button><div className="text-3xl font-bold text-gray-900 w-12 text-center">{scores[hole]?.p1 || 0}</div><button onClick={() => {const n=[...scores]; const cur=n[hole]?.p1||0; n[hole]={...n[hole],p1:cur+1}; setScores(n);}} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-gray-200 active:bg-gray-100"><Plus size={18} /></button></div></div><div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-700 w-20">{match.player2.split(' ')[0]}</span><div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2"><button onClick={() => {const n=[...scores]; const cur=n[hole]?.p2||0; n[hole]={...n[hole],p2:Math.max(1,cur-1)}; setScores(n);}} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-gray-200 active:bg-gray-100"><Minus size={18} /></button><div className="text-3xl font-bold text-gray-900 w-12 text-center">{scores[hole]?.p2 || 0}</div><button onClick={() => {const n=[...scores]; const cur=n[hole]?.p2||0; n[hole]={...n[hole],p2:cur+1}; setScores(n);}} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-gray-200 active:bg-gray-100"><Plus size={18} /></button></div></div></div><button onClick={() => {if (scores[hole]?.p1 > 0 && scores[hole]?.p2 > 0) {record(hole, scores[hole].p1, scores[hole].p2); nav('next');}}} disabled={!scores[hole]?.p1 || !scores[hole]?.p2} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed">Next Hole</button></div><div className="bg-white rounded-xl shadow-sm p-3 mb-3"><h3 className="font-bold text-gray-900 mb-2 text-sm">Scorecard</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-gray-200"><th className="sticky left-0 bg-white text-left py-1 pr-2 font-semibold text-gray-700 w-12">Hole</th>{scores.map((_, idx) => (scores[idx].scored && <th key={idx} className="px-1 py-1 text-center font-semibold text-gray-700 min-w-[30px]">{idx < 18 ? ((idx + startHole - 1) % 18) + 1 : `P${idx - 17}`}</th>))}<th className="sticky right-0 bg-white px-1 py-1 text-center font-semibold text-gray-700 border-l border-gray-200 w-10">+/-</th></tr></thead><tbody><tr className="border-b border-gray-100"><td className="sticky left-0 bg-white py-1 pr-2 font-semibold text-gray-900 text-xs">{match.player1.split(' ')[0]}</td>{scores.map((score, idx) => {if (!score.scored) return null; return (<td key={idx} className={`px-1 py-1 text-center font-bold ${score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>{score.p1}</td>);})}<td className="sticky right-0 bg-white px-1 py-1 text-center font-bold border-l border-gray-200">{(() => {const totalScore = scores.filter(s => s.scored).reduce((sum, s) => sum + s.p1, 0); let totalPar = 0; scores.forEach((score, idx) => {if (score.scored) {const holeNum = idx < 18 ? ((idx + startHole - 1) % 18) + 1 : 1; const par = c && c.pars[holeNum] ? c.pars[holeNum] : 3; totalPar += par;}}); const diff = totalScore - totalPar; return (<span className={diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-900'}>{diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}</span>);})()}</td></tr><tr><td className="sticky left-0 bg-white py-1 pr-2 font-semibold text-gray-900 text-xs">{match.player2.split(' ')[0]}</td>{scores.map((score, idx) => {if (!score.scored) return null; return (<td key={idx} className={`px-1 py-1 text-center font-bold ${score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>{score.p2}</td>);})}<td className="sticky right-0 bg-white px-1 py-1 text-center font-bold border-l border-gray-200">{(() => {const totalScore = scores.filter(s => s.scored).reduce((sum, s) => sum + s.p2, 0); let totalPar = 0; scores.forEach((score, idx) => {if (score.scored) {const holeNum = idx < 18 ? ((idx + startHole - 1) % 18) + 1 : 1; const par = c && c.pars[holeNum] ? c.pars[holeNum] : 3; totalPar += par;}}); const diff = totalScore - totalPar; return (<span className={diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-900'}>{diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}</span>);})()}</td></tr></tbody></table></div></div>{st.playoff && hole >= 17 && scores[hole]?.scored && (<button onClick={addPlayoff} className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors mb-3">Add Playoff Hole</button>)}{st.done && (<button onClick={complete} disabled={loading} className="w-full text-white py-3 rounded-xl font-semibold transition-colors disabled:bg-gray-400 shadow-lg" style={{backgroundColor: loading ? '#9ca3af' : PRIMARY}} onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = ACCENT)} onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = PRIMARY)}>{loading ? 'Submitting...' : '✓ Complete Match'}</button>)}{error && (<div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r mt-3"><p className="text-xs text-orange-800">{error}</p></div>)}</div></div>
    );
  }

  if (view === 'review') {
    const st = calcStatus(), c = courses.find(c => c.name === match.venue);
    return (
      <div className="min-h-screen bg-gray-50"><div className="bg-white shadow-sm sticky top-0 z-10"><div className="max-w-md mx-auto px-4 py-4"><button onClick={() => {setView('matches'); setMatch(null);}} className="text-blue-600 font-semibold mb-3">← Back</button><h2 className="text-lg font-bold text-gray-900">{match.player1} <span className="text-gray-400">vs</span> {match.player2}</h2><div className="flex items-center text-sm text-gray-600 mt-1"><MapPin size={14} className="mr-1" />{match.venue}</div><div className="mt-3"><span className="inline-flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold"><Check size={16} className="mr-1" />{match.winner} won</span></div></div></div><div className="max-w-md mx-auto px-4 py-6"><div className="bg-white rounded-2xl shadow-sm p-6 mb-4"><div className="flex items-center justify-center space-x-8 mb-6"><div className="text-center"><div className="text-3xl font-bold text-blue-600">{st.p1}</div></div><div className="text-gray-300 text-2xl font-bold">-</div><div className="text-center"><div className="text-3xl font-bold text-blue-600">{st.p2}</div></div></div></div><div className="bg-white rounded-2xl shadow-sm p-6"><h3 className="font-bold text-gray-900 mb-4">Final Scorecard</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b-2 border-gray-200"><th className="sticky left-0 bg-white text-left py-2 pr-2 font-semibold text-gray-700 text-xs w-16">Hole</th>{scores.map((_, idx) => (<th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[35px]">{idx < 18 ? idx + 1 : `P${idx - 17}`}</th>))}<th className="sticky right-[40px] bg-white px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 text-xs w-10">Hls</th><th className="sticky right-0 bg-white px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 text-xs w-12">+/-</th></tr></thead><tbody><tr className="border-b border-gray-100"><td colSpan={scores.length + 3} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">{match.player1.split(' ')[0]}</td></tr><tr className="border-b-2 border-gray-200"><td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>{scores.map((score, idx) => (<td key={idx} className={`px-1 py-2 text-center font-bold text-sm ${score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>{score.p1}</td>))}<td className="sticky right-[40px] bg-white px-2 py-2 text-center font-bold text-blue-600 border-l-2 border-gray-200 text-sm">{st.p1}</td><td className="sticky right-0 bg-white px-2 py-2 text-center font-bold border-l-2 border-gray-200 text-sm">{(() => {const totalScore = scores.reduce((sum, s) => sum + s.p1, 0); let totalPar = 0; scores.forEach((score, idx) => {const holeNum = idx < 18 ? idx + 1 : 1; const par = c && c.pars[holeNum] ? c.pars[holeNum] : 3; totalPar += par;}); const diff = totalScore - totalPar; return (<span className={diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-900'}>{diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}</span>);})()}</td></tr><tr className="border-b border-gray-100"><td colSpan={scores.length + 3} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">{match.player2.split(' ')[0]}</td></tr><tr><td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>{scores.map((score, idx) => (<td key={idx} className={`px-1 py-2 text-center font-bold text-sm ${score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>{score.p2}</td>))}<td className="sticky right-[40px] bg-white px-2 py-2 text-center font-bold text-blue-600 border-l-2 border-gray-200 text-sm">{st.p2}</td><td className="sticky right-0 bg-white px-2 py-2 text-center font-bold border-l-2 border-gray-200 text-sm">{(() => {const totalScore = scores.reduce((sum, s) => sum + s.p2, 0); let totalPar = 0; scores.forEach((score, idx) => {const holeNum = idx < 18 ? idx + 1 : 1; const par = c && c.pars[holeNum] ? c.pars[holeNum] : 3; totalPar += par;}); const diff = totalScore - totalPar; return (<span className={diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-gray-900'}>{diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}</span>);})()}</td></tr></tbody></table></div><div className="mt-6 pt-6 border-t border-gray-200"><div className="flex justify-between items-center"><div><p className="text-sm text-gray-600">Match Result</p><p className="text-2xl font-bold text-gray-900">{st.p1} - {st.p2}</p></div><div className="text-right"><p className="text-sm text-gray-600">Winner</p><p className="text-xl font-bold text-green-600">{match.winner}</p></div></div></div></div></div></div>
    );
  }

  return null;

};

export default DiscGolfApp;

import React, { useState, useEffect } from 'react';
import { Trophy, User, LogOut, ChevronRight, Edit, X, Clock, MapPin, Calendar, Plus, Minus, Check, Moon, Sun } from 'lucide-react';

const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const GOOGLE_API_KEY = 'AIzaSyBzu0SSydX4hR8eHIjo3yeg_eHL_FJhRKI';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxW0Sa-T_oBu-5ka0TU6Hf1kkY_VBj40891Xq3Md1LdbuJfaHCRSqAK25xfnebtQXwWmg/exec';

// Brand colors
const BRAND_PRIMARY = '#006400'; // Dark green
const BRAND_SECONDARY = '#FFD700'; // Gold
const BRAND_ACCENT = '#228B22'; // Forest green

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
  const [pools, setPools] = useState([]);
  const [matchFilter, setMatchFilter] = useState('all');
  const [selectedFilterDate, setSelectedFilterDate] = useState('');
  const [selectedFilterPlayer, setSelectedFilterPlayer] = useState('');
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
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
      
      body.dark-mode {
        background-color: #111827;
        color: #f9fafb;
      }
      
      .dark-mode .bg-white {
        background-color: #1f2937 !important;
      }
      
      .dark-mode .bg-gray-50 {
        background-color: #111827 !important;
      }
      
      .dark-mode .bg-gray-100 {
        background-color: #374151 !important;
      }
      
      .dark-mode .text-gray-900 {
        color: #f9fafb !important;
      }
      
      .dark-mode .text-gray-700 {
        color: #d1d5db !important;
      }
      
      .dark-mode .text-gray-600 {
        color: #9ca3af !important;
      }
      
      .dark-mode .text-gray-500 {
        color: #6b7280 !important;
      }
      
      .dark-mode .border-gray-200 {
        border-color: #374151 !important;
      }
      
      .dark-mode .border-gray-100 {
        border-color: #1f2937 !important;
      }
      
      .dark-mode select,
      .dark-mode input,
      .dark-mode textarea {
        background-color: #374151 !important;
        color: #f9fafb !important;
        border-color: #4b5563 !important;
      }
      
      .dark-mode select option {
        background-color: #1f2937;
        color: #f9fafb;
      }
      
      .dark-mode input::placeholder {
        color: #9ca3af !important;
      }
      
      .dark-mode .bg-red-50 {
        background-color: rgba(153, 27, 27, 0.2) !important;
      }
      
      .dark-mode .text-red-800 {
        color: #fca5a5 !important;
      }
      
      .dark-mode .bg-orange-50 {
        background-color: rgba(154, 52, 18, 0.2) !important;
      }
      
      .dark-mode .text-orange-800 {
        color: #fdba74 !important;
      }
      
      .dark-mode .bg-blue-50 {
        background-color: rgba(30, 58, 138, 0.3) !important;
      }
      
      .dark-mode .shadow-sm {
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3) !important;
      }
      
      .dark-mode .shadow-md {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
      }
      
      .dark-mode .shadow-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

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
      const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J', 'Pools!A:F'];
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
      
      const poolsData = data.valueRanges[3]?.values.slice(1).map(row => ({
        pool: row[0],
        player: row[1],
        played: parseInt(row[2]) || 0,
        win: parseInt(row[3]) || 0,
        loss: parseInt(row[4]) || 0,
        points: parseInt(row[5]) || 0
      })) || [];
      setPools(poolsData);
      
      const stored = localStorage.getItem('sheet-data');
      if (!stored) {
        localStorage.setItem('sheet-data', JSON.stringify({
          players: playersData,
          courses: coursesData,
          matches: matchesData,
          pools: poolsData
        }));
      }
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
      localStorage.setItem(`match-progress-${selectedMatch.id}`, JSON.stringify(progress));
    } catch (err) {
      console.error('Error saving match progress:', err);
    }
  };

  const loadMatchProgress = async (matchId) => {
    try {
      const stored = localStorage.getItem(`match-progress-${matchId}`);
      if (stored) {
        const progress = JSON.parse(stored);
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
        m.id === matchId 
          ? { ...m, scoresJson: finalScores, winner, status: 'Completed' }
          : m
      );
      setMatches(updatedMatches);
      
      localStorage.setItem('sheet-data', JSON.stringify({
        players,
        courses,
        matches: updatedMatches,
        pools
      }));
      
      console.log('Submitting match to Google Sheets:', { matchId, winner });
      
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: matchId,
          scores: finalScores,
          winner: winner
        }),
        mode: 'no-cors'
      });
      
      console.log('Match submission request sent to Google Sheets');
      
    } catch (err) {
      console.error('Error submitting match:', err);
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
    
    localStorage.setItem('sheet-data', JSON.stringify({
      players: updatedPlayers,
      courses,
      matches,
      pools
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
      setScores([]);
      setCurrentHole(0);
      setShowStartHoleModal(true);
    } else {
      setView('scoring');
    }
  };

  const confirmStartHole = () => {
    const course = courses.find(c => c.name === selectedMatch.venue || c.code === selectedMatch.venue);
    const initScores = Array(18).fill(null).map((_, idx) => {
      const holeNumber = idx + 1;
      const par = course && course.pars[holeNumber] ? course.pars[holeNumber] : 3;
      
      // If this hole comes before the starting hole, set score to 0 (unplayed)
      if (holeNumber < startingHole) {
        return {
          p1: 0,
          p2: 0,
          scored: false
        };
      }
      
      // Otherwise set to par
      return {
        p1: par,
        p2: par,
        scored: false
      };
    });
    
    setScores(initScores);
    setCurrentHole(startingHole - 1); // Set current hole to the starting hole (0-indexed)
    setShowStartHoleModal(false);
    setView('scoring');
  };
 
  const cancelMatch = () => {
    if (selectedMatch) {
      localStorage.removeItem(`match-progress-${selectedMatch.id}`);
    }
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
    const playoffPar = course && course.pars[1] ? course.pars[1] : 3;
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
      localStorage.removeItem(`match-progress-${selectedMatch.id}`);
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

  const generatePlayoffBrackets = (playoffType) => {
    const allPools = getPoolNames().filter(p => 
      !p.toLowerCase().includes('cup') && 
      !p.toLowerCase().includes('shield') && 
      !p.toLowerCase().includes('plate')
    );
    
    const poolStandings = allPools.map(poolName => ({
      pool: poolName,
      standings: calculateStandings(poolName)
    }));
    
    let participants = [];
    
    if (playoffType === 'Cup') {
      poolStandings.forEach(({ pool, standings }) => {
        standings.slice(0, 3).forEach((player, idx) => {
          participants.push({
            ...player,
            pool,
            seed: idx + 1
          });
        });
      });
    } else if (playoffType === 'Shield') {
      poolStandings.forEach(({ pool, standings }) => {
        standings.slice(3, 6).forEach((player, idx) => {
          participants.push({
            ...player,
            pool,
            seed: idx + 4
          });
        });
      });
    } else if (playoffType === 'Plate') {
      poolStandings.forEach(({ pool, standings }) => {
        standings.slice(6).forEach((player, idx) => {
          participants.push({
            ...player,
            pool,
            seed: idx + 7
          });
        });
      });
    }
    
    if (participants.length === 0) {
      return { bracket: null, hasMatches: false };
    }
    
    const poolA = participants.filter(p => p.pool === allPools[0]) || [];
    const poolB = participants.filter(p => p.pool === allPools[1]) || [];
    const poolC = participants.filter(p => p.pool === allPools[2]) || [];
    const poolD = participants.filter(p => p.pool === allPools[3]) || [];
    
    const playoffMatches = matches.filter(m => {
      const id = m.id?.toLowerCase() || '';
      const venue = m.venue?.toLowerCase() || '';
      const type = playoffType.toLowerCase();
      return (id.includes(type) || venue.includes(type)) && m.status === 'Completed';
    });
    
    const findWinner = (p1Name, p2Name) => {
      const match = playoffMatches.find(m => 
        (m.player1 === p1Name && m.player2 === p2Name) ||
        (m.player1 === p2Name && m.player2 === p1Name)
      );
      return match?.winner;
    };
    
    const bracket = {
      r16: [],
      qf: [],
      sf: [],
      final: null
    };
    
    if (poolA.length >= 3) {
      const winner = findWinner(poolA[1].name, poolA[2].name);
      bracket.r16.push({
        id: 'Pool A: 2v3',
        player1: poolA[1].name,
        player2: poolA[2].name,
        winner: winner,
        poolLabel: allPools[0]
      });
    }
    if (poolB.length >= 3) {
      const winner = findWinner(poolB[1].name, poolB[2].name);
      bracket.r16.push({
        id: 'Pool B: 2v3',
        player1: poolB[1].name,
        player2: poolB[2].name,
        winner: winner,
        poolLabel: allPools[1]
      });
    }
    if (poolC.length >= 3) {
      const winner = findWinner(poolC[1].name, poolC[2].name);
      bracket.r16.push({
        id: 'Pool C: 2v3',
        player1: poolC[1].name,
        player2: poolC[2].name,
        winner: winner,
        poolLabel: allPools[2]
      });
    }
    if (poolD.length >= 3) {
      const winner = findWinner(poolD[1].name, poolD[2].name);
      bracket.r16.push({
        id: 'Pool D: 2v3',
        player1: poolD[1].name,
        player2: poolD[2].name,
        winner: winner,
        poolLabel: allPools[3]
      });
    }
    
    if (poolA.length >= 1) {
      const r16Winner = bracket.r16[0]?.winner || 'Winner 2v3';
      const winner = findWinner(poolA[0].name, r16Winner);
      bracket.qf.push({
        id: 'QF1',
        player1: poolA[0].name,
        player2: r16Winner,
        winner: winner,
        poolLabel: allPools[0]
      });
    }
    if (poolB.length >= 1) {
      const r16Winner = bracket.r16[1]?.winner || 'Winner 2v3';
      const winner = findWinner(poolB[0].name, r16Winner);
      bracket.qf.push({
        id: 'QF2',
        player1: poolB[0].name,
        player2: r16Winner,
        winner: winner,
        poolLabel: allPools[1]
      });
    }
    if (poolC.length >= 1) {
      const r16Winner = bracket.r16[2]?.winner || 'Winner 2v3';
      const winner = findWinner(poolC[0].name, r16Winner);
      bracket.qf.push({
        id: 'QF3',
        player1: poolC[0].name,
        player2: r16Winner,
        winner: winner,
        poolLabel: allPools[2]
      });
    }
    if (poolD.length >= 1) {
      const r16Winner = bracket.r16[3]?.winner || 'Winner 2v3';
      const winner = findWinner(poolD[0].name, r16Winner);
      bracket.qf.push({
        id: 'QF4',
        player1: poolD[0].name,
        player2: r16Winner,
        winner: winner,
        poolLabel: allPools[3]
      });
    }
    
    if (bracket.qf.length >= 2) {
      const qf1Winner = bracket.qf[0]?.winner || 'QF1 Winner';
      const qf4Winner = bracket.qf[3]?.winner || 'QF4 Winner';
      const winner = findWinner(qf1Winner, qf4Winner);
      bracket.sf.push({
        id: 'SF1',
        player1: qf1Winner,
        player2: qf4Winner,
        winner: winner
      });
    }
    if (bracket.qf.length >= 3) {
      const qf2Winner = bracket.qf[1]?.winner || 'QF2 Winner';
      const qf3Winner = bracket.qf[2]?.winner || 'QF3 Winner';
      const winner = findWinner(qf2Winner, qf3Winner);
      bracket.sf.push({
        id: 'SF2',
        player1: qf2Winner,
        player2: qf3Winner,
        winner: winner
      });
    }
    
    if (bracket.sf.length >= 2) {
      const sf1Winner = bracket.sf[0]?.winner || 'SF1 Winner';
      const sf2Winner = bracket.sf[1]?.winner || 'SF2 Winner';
      const winner = findWinner(sf1Winner, sf2Winner);
      bracket.final = {
        id: 'Final',
        player1: sf1Winner,
        player2: sf2Winner,
        winner: winner
      };
    }
    
    return { bracket, hasMatches: true };
  };

  const generateCrossoverMatches = () => {
    const allPools = getPoolNames().filter(p => 
      !p.toLowerCase().includes('cup') && 
      !p.toLowerCase().includes('shield') && 
      !p.toLowerCase().includes('plate') &&
      !p.toLowerCase().includes('crossover')
    );
    
    if (allPools.length < 4) return { week1: [], week2: [] };
    
    const poolStandings = allPools.map(poolName => ({
      pool: poolName,
      standings: calculateStandings(poolName)
    }));
    
    const poolA = poolStandings[0]?.standings || [];
    const poolB = poolStandings[1]?.standings || [];
    const poolC = poolStandings[2]?.standings || [];
    const poolD = poolStandings[3]?.standings || [];
    
    const crossoverMatches = matches.filter(m => {
      const id = m.id?.toLowerCase() || '';
      const venue = m.venue?.toLowerCase() || '';
      return id.includes('crossover') || venue.includes('crossover');
    });
    
    const findMatchResult = (p1, p2) => {
      const match = crossoverMatches.find(m => 
        (m.player1 === p1 && m.player2 === p2) ||
        (m.player1 === p2 && m.player2 === p1)
      );
      return match;
    };
    
    const createMatch = (pool1, pos1, pool2, pos2, poolName1, poolName2) => {
      const player1 = pool1[pos1 - 1]?.name || `${poolName1}${pos1}`;
      const player2 = pool2[pos2 - 1]?.name || `${poolName2}${pos2}`;
      const match = findMatchResult(player1, player2);
      
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
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-white transition-colors">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <div className="text-center mb-12 mt-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg" style={{background: `linear-gradient(to bottom right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})`}}>
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{focusRingColor: BRAND_PRIMARY}}
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <button 
              type="submit"
              className="w-full text-white py-3.5 rounded-xl font-semibold transition-colors shadow-lg"
              style={{
                backgroundColor: BRAND_PRIMARY,
                boxShadow: `0 10px 15px -3px ${BRAND_PRIMARY}30`
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = BRAND_ACCENT}
              onMouseLeave={(e) => e.target.style.backgroundColor = BRAND_PRIMARY}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Rest of the views continue...
  if (view === 'changePin') {
    return (
      <div className="min-h-screen bg-gray-50 transition-colors">
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setView('matches')} className="mr-4">
                <X size={24} className="text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Change PIN</h2>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
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
    
    let completedMatches = matches.filter(m => m.status === 'Completed');
    
    // Apply filters
    if (matchFilter === 'date' && selectedFilterDate) {
      completedMatches = completedMatches.filter(m => m.date === selectedFilterDate);
    } else if (matchFilter === 'player' && selectedFilterPlayer) {
      completedMatches = completedMatches.filter(m => 
        m.player1 === selectedFilterPlayer || m.player2 === selectedFilterPlayer
      );
    }
    
    // Get unique dates and players for filter dropdowns
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
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
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
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setView('matches')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  view === 'matches' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Matches
              </button>
              <button
                onClick={() => setView('standings')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  view === 'standings' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Standings
              </button>
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
                    onClick={() => reviewMatch(match)}
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
                onChange={(e) => setStartingHole(parseInt(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({length: 18}, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hole {h}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowStartHoleModal(false);
                    cancelMatch();
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
      </div>
    );
  }

  if (view === 'standings') {
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
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setView('matches')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  view === 'matches' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Matches
              </button>
              <button
                onClick={() => setView('standings')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                  view === 'standings' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
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
              {/* Pool Standings */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Pool Standings</h2>
                <div className="space-y-4">
                  {getPoolNames().filter(p => !p.toLowerCase().includes('cup') && !p.toLowerCase().includes('shield') && !p.toLowerCase().includes('plate')).map(poolName => {
                    const standings = calculateStandings(poolName);
                    
                    return (
                      <div key={poolName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3" style={{background: `linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_ACCENT})`}}>
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
                                    {standing.name.split(' ')[0]}
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

              {/* Crossover Matches */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Crossover Matches</h2>
                
                {(() => {
                  const { week1, week2 } = generateCrossoverMatches();
                  
                  if (week1.length === 0) {
                    return (
                      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-500 text-sm">
                        <p>Crossover matches will appear after pool play.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{borderTop: '4px solid ' + BRAND_ACCENT}}>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <h3 className="text-lg font-bold text-gray-900">Week 1</h3>
                          <p className="text-xs text-gray-500 mt-1">A vs B, C vs D</p>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-2">
                            {week1.map((match, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                                <div className="text-center text-xs font-semibold text-gray-500 mb-1">{match.label}</div>
                                <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                                  {match.player1.split(' ')[0]}
                                </div>
                                <div className="text-gray-400 text-center my-0.5">vs</div>
                                <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                                  {match.player2.split(' ')[0]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{borderTop: '4px solid ' + BRAND_ACCENT}}>
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <h3 className="text-lg font-bold text-gray-900">Week 2</h3>
                          <p className="text-xs text-gray-500 mt-1">A vs C, B vs D</p>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-2">
                            {week2.map((match, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                                <div className="text-center text-xs font-semibold text-gray-500 mb-1">{match.label}</div>
                                <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                                  {match.player1.split(' ')[0]}
                                </div>
                                <div className="text-gray-400 text-center my-0.5">vs</div>
                                <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                                  {match.player2.split(' ')[0]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
                
                {['Cup', 'Shield', 'Plate'].map(playoffType => {
                  const { bracket, hasMatches } = generatePlayoffBrackets(playoffType);
                  const icon = playoffType === 'Cup' ? '🏆' : playoffType === 'Shield' ? '🛡️' : '🥉';
                  
                  return (
                    <div key={playoffType} className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6" style={{borderTop: `4px solid ${BRAND_SECONDARY}`}}>
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                          <span className="mr-2">{icon}</span>
                          {playoffType} Final
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {playoffType === 'Cup' && "Top 3 from each pool"}
                          {playoffType === 'Shield' && "Next 3 from each pool"}
                          {playoffType === 'Plate' && "Remaining players"}
                        </p>
                      </div>
                      
                      {!hasMatches ? (
                        <div className="p-6 text-center text-gray-500 text-sm">
                          <p>Pool play not complete yet.</p>
                          <p className="text-xs mt-2">Brackets will populate automatically based on pool standings.</p>
                        </div>
                      ) : (
                        <div className="p-4 overflow-x-auto">
                          <div className="flex gap-4 min-w-max">
                            {/* R16 Column */}
                            {bracket.r16.length > 0 && (
                              <div className="flex-shrink-0 w-48">
                                <div className="text-center font-bold text-xs text-gray-600 mb-3">R16</div>
                                <div className="space-y-2">
                                  {bracket.r16.map((match, idx) => (
                                    <div key={match.id} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                                      <div className="text-center text-xs font-semibold text-gray-500 mb-1">{match.poolLabel}</div>
                                      <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                                        #{match.player1.includes('Winner') ? match.player1 : '2 ' + match.player1.split(' ')[0]}
                                      </div>
                                      <div className="text-gray-400 text-center my-0.5">vs</div>
                                      <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                                        #{match.player2.includes('Winner') ? match.player2 : '3 ' + match.player2.split(' ')[0]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* QF Column */}
                            {bracket.qf.length > 0 && (
                              <div className="flex-shrink-0 w-48">
                                <div className="text-center font-bold text-xs text-gray-600 mb-3">QF</div>
                                <div className="space-y-2">
                                  {bracket.qf.map((match, idx) => (
                                    <div key={match.id} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                                      <div className="text-center text-xs font-semibold text-gray-500 mb-1">{match.poolLabel}</div>
                                      <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                                        {match.player1.includes('Winner') ? match.player1 : '#1 ' + match.player1.split(' ')[0]}
                                      </div>
                                      <div className="text-gray-400 text-center my-0.5">vs</div>
                                      <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                                        {match.player2.includes('Winner') ? 'Winner R16' : match.player2.split(' ')[0]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* SF Column */}
                            {bracket.sf.length > 0 && (
                              <div className="flex-shrink-0 w-48">
                                <div className="text-center font-bold text-xs text-gray-600 mb-3">SF</div>
                                <div className="space-y-2">
                                  {bracket.sf.map((match, idx) => (
                                    <div key={match.id} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                                      <div className={`font-semibold ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                                        {match.player1.includes('Winner') ? match.player1 : match.player1.split(' ')[0]}
                                      </div>
                                      <div className="text-gray-400 text-center my-0.5">vs</div>
                                      <div className={`font-semibold ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                                        {match.player2.includes('Winner') ? match.player2 : match.player2.split(' ')[0]}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Final Column */}
                            {bracket.final && (
                              <div className="flex-shrink-0 w-48">
                                <div className="text-center font-bold text-xs text-gray-600 mb-3">Final</div>
                                <div className="rounded-lg p-3 text-xs border-2" style={{borderColor: BRAND_SECONDARY, backgroundColor: `${BRAND_SECONDARY}10`}}>
                                  <div className={`font-bold ${bracket.final.winner === bracket.final.player1 ? 'text-green-600' : 'text-gray-700'}`}>
                                    {bracket.final.player1.includes('Winner') ? bracket.final.player1 : bracket.final.player1.split(' ')[0]}
                                  </div>
                                  <div className="text-gray-400 text-center my-1 font-semibold">vs</div>
                                  <div className={`font-bold ${bracket.final.winner === bracket.final.player2 ? 'text-green-600' : 'text-gray-700'}`}>
                                    {bracket.final.player2.includes('Winner') ? bracket.final.player2 : bracket.final.player2.split(' ')[0]}
                                  </div>
                                  {bracket.final.winner && bracket.final.winner !== 'Winner' && !bracket.final.winner.includes('Winner') && (
                                    <div className="mt-2 pt-2 border-t border-gray-300 text-center font-bold" style={{color: BRAND_PRIMARY}}>
                                      🏆 {bracket.final.winner.split(' ')[0]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          )}
        </div>
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
            <div className="flex items-center justify-between mb-3">
              <button 
                onClick={cancelMatch}
                className="text-blue-600 font-semibold"
              >
                ← Cancel Match
              </button>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this match? All progress will be saved.')) {
                    cancelMatch();
                  }
                }}
                className="text-red-600 font-semibold text-sm"
              >
                Exit
              </button>
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
            
             <div className="mt-6">
              {currentHole > 0 ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setCurrentHole(currentHole - 1);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    ← Previous
                  </button>
                  <button 
                    onClick={() => {
                      if (scores[currentHole]?.p1 > 0 && scores[currentHole]?.p2 > 0) {
                        recordScore(currentHole, scores[currentHole].p1, scores[currentHole].p2);
                      }
                    }}
                    disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                  >
                    {currentHole < scores.length - 1 ? 'Next →' : 'Record'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    if (scores[currentHole]?.p1 > 0 && scores[currentHole]?.p2 > 0) {
                      recordScore(currentHole, scores[currentHole].p1, scores[currentHole].p2);
                    }
                  }}
                  disabled={!scores[currentHole]?.p1 || !scores[currentHole]?.p2}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  {currentHole < scores.length - 1 ? 'Next Hole' : 'Record Score'}
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Scorecard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="sticky left-0 bg-white text-left py-2 pr-2 font-semibold text-gray-700 text-xs w-16">Hole</th>
                    {scores.map((_, idx) => (
                      scores[idx].scored && (
                        <th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[35px]">
                          {idx < 18 ? ((idx + startingHole - 1) % 18) + 1 : `P${idx - 17}`}
                        </th>
                      )
                    ))}
                    <th className="sticky right-0 bg-white px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 text-xs w-12">vs Par</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td colSpan={scores.filter(s => s.scored).length + 2} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">
                      {selectedMatch.player1.split(' ')[0]}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-gray-200">
                    <td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>
                    {scores.map((score, idx) => {
                      if (!score.scored) return null;
                      const holeNum = idx < 18 ? ((idx + startingHole - 1) % 18) + 1 : 1;
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
                            const holeNum = idx < 18 ? ((idx + startingHole - 1) % 18) + 1 : 1;
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
                      {selectedMatch.player2.split(' ')[0]}
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
                            const holeNum = idx < 18 ? ((idx + startingHole - 1) % 18) + 1 : 1;
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
          
          {status.needsPlayoff && currentHole >= 17 && scores[currentHole]?.scored && (
            <button 
              onClick={addPlayoffHole}
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold hover:bg-orange-700 transition-colors mt-4"
            >
              Add Playoff Hole
            </button>
          )}
          
                      <button 
              onClick={completeMatch}
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-semibold transition-colors mt-4 disabled:bg-gray-400 shadow-lg"
              style={{
                backgroundColor: loading ? '#9ca3af' : BRAND_PRIMARY,
                boxShadow: `0 10px 15px -3px ${BRAND_PRIMARY}30`
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = BRAND_ACCENT)}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = BRAND_PRIMARY)}
            >
              {loading ? 'Submitting...' : '✓ Complete Match'}
            </button>
        
          
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
                    <th className="sticky left-0 bg-white text-left py-2 pr-2 font-semibold text-gray-700 text-xs w-16">Hole</th>
                    {scores.map((_, idx) => (
                      <th key={idx} className="px-1 py-2 text-center font-semibold text-gray-700 text-xs min-w-[35px]">
                        {idx < 18 ? idx + 1 : `P${idx - 17}`}
                      </th>
                    ))}
                    <th className="sticky right-[40px] bg-white px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 text-xs w-10">Hls</th>
                    <th className="sticky right-0 bg-white px-2 py-2 text-center font-semibold text-gray-700 border-l-2 border-gray-200 text-xs w-12">vs Par</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td colSpan={scores.length + 3} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">
                      {selectedMatch.player1.split(' ')[0]}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-gray-200">
                    <td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>
                    {scores.map((score, idx) => (
                      <td key={idx} className={`px-1 py-2 text-center font-bold text-sm ${score.p1 < score.p2 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                        {score.p1}
                      </td>
                    ))}
                    <td className="sticky right-[40px] bg-white px-2 py-2 text-center font-bold text-blue-600 border-l-2 border-gray-200 text-sm">
                      {status.p1Holes}
                    </td>
                    <td className="sticky right-0 bg-white px-2 py-2 text-center font-bold border-l-2 border-gray-200 text-sm">
                      {(() => {
                        const totalScore = scores.reduce((sum, s) => sum + s.p1, 0);
                        let totalPar = 0;
                        scores.forEach((score, idx) => {
                          const holeNum = idx < 18 ? idx + 1 : 1;
                          const foundCourse = courses.find(c => c.name === selectedMatch.venue);
                          const par = foundCourse && foundCourse.pars[holeNum] ? foundCourse.pars[holeNum] : 3;
                          totalPar += par;
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
                    <td colSpan={scores.length + 3} className="sticky left-0 bg-blue-50 px-2 py-1.5 font-bold text-gray-900 text-xs">
                      {selectedMatch.player2.split(' ')[0]}
                    </td>
                  </tr>
                  <tr>
                    <td className="sticky left-0 bg-white py-2 pr-2 text-xs text-gray-500"></td>
                    {scores.map((score, idx) => (
                      <td key={idx} className={`px-1 py-2 text-center font-bold text-sm ${score.p2 < score.p1 ? 'text-blue-600 bg-blue-50' : score.p1 === score.p2 ? 'text-gray-600' : 'text-gray-900'}`}>
                        {score.p2}
                      </td>
                    ))}
                    <td className="sticky right-[40px] bg-white px-2 py-2 text-center font-bold text-blue-600 border-l-2 border-gray-200 text-sm">
                      {status.p2Holes}
                    </td>
                    <td className="sticky right-0 bg-white px-2 py-2 text-center font-bold border-l-2 border-gray-200 text-sm">
                      {(() => {
                        const totalScore = scores.reduce((sum, s) => sum + s.p2, 0);
                        let totalPar = 0;
                        scores.forEach((score, idx) => {
                          const holeNum = idx < 18 ? idx + 1 : 1;
                          const foundCourse = courses.find(c => c.name === selectedMatch.venue);
                          const par = foundCourse && foundCourse.pars[holeNum] ? foundCourse.pars[holeNum] : 3;
                          totalPar += par;
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
            

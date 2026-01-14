export const calculateMatchStatus = (scores, player1, player2) => {
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

  const lead = Math.abs(p1Holes - p2Holes);
  const holesRemaining = Math.max(0, 18 - holesPlayed);
  const leader = p1Holes > p2Holes ? player1 : p2Holes > p1Holes ? player2 : null;

  return {
    p1Holes, p2Holes, holesPlayed, leader,
    isComplete: (holesPlayed >= 18 && p1Holes !== p2Holes) || (holesPlayed > 18 && leader !== null),
    needsPlayoff: holesPlayed === 18 && p1Holes === p2Holes [cite: 294, 295]
  };
};

export const calculateStandings = (poolName, pools, matches) => {
  const poolPlayers = pools.filter(p => p.pool === poolName);
  const standings = poolPlayers.map(player => {
    const playerMatches = matches.filter(m => 
      m.status === 'Completed' && (m.player1 === player.player || m.player2 === player.player)
    );
    // ... logic to calculate hole differences [cite: 308-311]
    return { name: player.player, points: player.points /* ... stats */ };
  });

  return standings.sort((a, b) => b.points - a.points || b.holeDiff - a.holeDiff);
};

const SHEET_ID = '1bzJdaMrV7sInlNtMP81hKST8-TTq2UTDujkk68w3IPU';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxW0Sa-T_oBu-5ka0TU6Hf1kkY_VBj40891Xq3Md1LdbuJfaHCRSqAK25xfnebtQXwWmg/exec';

export const loadSheetData = async (apiKey) => {
  const ranges = ['Players!A:C', 'Courses!A:E', 'Matches!A:J', 'Pools!A:F'];
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${apiKey}`
  );
  
  if (!response.ok) throw new Error('Failed to load data');
  const data = await response.json();

  return {
    players: data.valueRanges[0].values.slice(1).map(row => ({ id: row[0], name: row[1], pin: row[2] })),
    courses: data.valueRanges[1].values.slice(1).map(row => ({ 
      id: row[0], name: row[1], code: row[2], holes: parseInt(row[3]), pars: JSON.parse(row[4] || '{}') 
    })),
    matches: data.valueRanges[2].values.slice(1).map(row => ({
      id: row[0], date: row[1], venue: row[2], player1: row[3], player2: row[4],
      scoresJson: row[7] ? JSON.parse(row[7]) : [], status: row[9] || 'scheduled'
    })),
    pools: data.valueRanges[3]?.values.slice(1).map(row => ({
      pool: row[0], player: row[1], points: parseInt(row[5]) || 0
    })) || []
  };
};

export const submitMatchToSheet = async (matchData) => {
  // Uses 'no-cors' as per original implementation for Google Apps Script [cite: 269]
  return fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchData),
  });
};

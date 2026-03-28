// Simulated in-memory database with localStorage persistence
const DB = {
  users: [],
  progress: [],
  leaderboard: [],
};

function loadFromStorage() {
  try {
    const stored = localStorage.getItem('quizArenaDB');
    if (stored) {
      const parsed = JSON.parse(stored);
      DB.users = parsed.users || [];
      DB.progress = parsed.progress || [];
      DB.leaderboard = parsed.leaderboard || [];
    }
  } catch (e) {
    console.error('Failed to load from storage', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem('quizArenaDB', JSON.stringify(DB));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

loadFromStorage();

export function registerUser(username, pin) {
  const exists = DB.users.find(u => u.username === username);
  if (exists) return { success: false, error: 'User already exists' };
  DB.users.push({ username, pin });
  DB.leaderboard.push({ username, total_score: 0 });
  saveToStorage();
  return { success: true };
}

export function loginUser(username, pin) {
  const user = DB.users.find(u => u.username === username && u.pin === pin);
  if (!user) return { success: false, error: 'Invalid credentials' };
  return { success: true, user };
}

export function userExists(username) {
  return !!DB.users.find(u => u.username === username);
}

export function getProgress(username, category) {
  return DB.progress.find(p => p.username === username && p.category === category);
}

export function getAllProgress(username) {
  return DB.progress.filter(p => p.username === username);
}

export function updateProgress(username, category, level, score) {
  const existing = DB.progress.find(p => p.username === username && p.category === category);
  if (existing) {
    if (level > existing.level) existing.level = level;
    existing.score = (existing.score || 0) + score;
  } else {
    DB.progress.push({ username, category, level, score });
  }
  const lb = DB.leaderboard.find(l => l.username === username);
  if (lb) {
    lb.total_score = DB.progress
      .filter(p => p.username === username)
      .reduce((sum, p) => sum + (p.score || 0), 0);
  }
  saveToStorage();
}

export function getLeaderboard() {
  return [...DB.leaderboard].sort((a, b) => b.total_score - a.total_score).slice(0, 10);
}

export function getUserRank(username) {
  const sorted = [...DB.leaderboard].sort((a, b) => b.total_score - a.total_score);
  return sorted.findIndex(u => u.username === username) + 1;
}

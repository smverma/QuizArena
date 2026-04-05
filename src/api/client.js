import API_BASE_URL from '../config.js';

const SESSION_KEY = 'quizArenaSession';

// ── Session helpers ───────────────────────────────────────────────────────────

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    // Non-JSON response (e.g. nginx error page); use status text as error message
    data = { error: `Server error (${res.status} ${res.statusText})` };
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Login or register with username + PIN.
 * Server creates the account automatically if the username is new.
 * @param {string} username
 * @param {string} pin  4-digit string
 * @returns {Promise<{ ok: boolean, user?: { username: string, totalScore: number }, error?: string }>}
 */
export async function login(username, pin) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

/**
 * @param {number} [limit=50]
 * @returns {Promise<Array<{ userId: string, username: string, totalScore: number }>>}
 */
export async function fetchLeaderboard(limit = 50) {
  return request(`/leaderboard?limit=${limit}`);
}

// ── Scores ────────────────────────────────────────────────────────────────────

/**
 * Submit the score earned in a completed level.
 * @returns {Promise<{ ok: boolean, username: string, score: number, category: string, level: number, totalScore: number }>}
 */
export async function submitScore(username, pin, score, category, level) {
  return request('/scores', {
    method: 'POST',
    body: JSON.stringify({ username, pin, score, category, level }),
  });
}

// ── Progress ──────────────────────────────────────────────────────────────────

/**
 * Fetch all category progress for the user.
 * Credentials are sent in the request body (not query params).
 * @returns {Promise<Array<{ category: string, level: number, score: number }>>}
 */
export async function fetchProgress(username, pin) {
  return request('/progress/fetch', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });
}

/**
 * Update progress after completing a level.
 * @returns {Promise<{ ok: boolean }>}
 */
export async function updateProgress(username, pin, category, level, score) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ username, pin, category, level, score }),
  });
}

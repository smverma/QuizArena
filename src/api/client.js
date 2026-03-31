/**
 * QuizArena API client.
 * All requests go through here so the base URL is configured in one place.
 *
 * Token storage:
 *   - The JWT access token is stored in sessionStorage (cleared when the tab
 *     closes, not persisted across sessions).
 *   - Tradeoff: users must log in again when they reopen the browser.
 *     For "remember me" behaviour you could move to localStorage, but that
 *     exposes the token to XSS for a longer window.
 *   - The PIN is NEVER stored client-side at any point.
 */

import API_BASE_URL from '../config.js';

const TOKEN_KEY = 'quizArenaToken';
const USER_KEY = 'quizArenaUser';

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    // Non-JSON response (e.g. nginx error page); use status text as error message
    data = { error: `Server error (${res.status} ${res.statusText})` };
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

/**
 * Check whether a username is already registered.
 * @param {string} username
 * @returns {Promise<{ exists: boolean }>}
 */
export async function checkUser(username) {
  return request(`/auth/check?username=${encodeURIComponent(username)}`);
}

/**
 * Login or register with username + PIN.
 * @param {string} username
 * @param {string} pin  4-digit string – NEVER stored after this call
 * @returns {Promise<{ token: string, user: { id: string, username: string } }>}
 */
export async function authPin(username, pin) {
  return request('/auth/pin', {
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
 * @param {number} score
 * @param {string} category
 * @param {number} level
 * @returns {Promise<{ ok: boolean, totalScore: number }>}
 */
export async function submitScore(score, category, level) {
  return request('/scores', {
    method: 'POST',
    body: JSON.stringify({ score, category, level }),
  });
}

// ── Progress ──────────────────────────────────────────────────────────────────

/**
 * Fetch all category progress for the authenticated user.
 * @returns {Promise<Array<{ category: string, level: number, score: number }>>}
 */
export async function fetchProgress() {
  return request('/progress');
}

/**
 * Update progress after completing a level.
 * @param {string} category
 * @param {number} level
 * @param {number} score
 * @returns {Promise<{ ok: boolean }>}
 */
export async function updateProgress(category, level, score) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ category, level, score }),
  });
}

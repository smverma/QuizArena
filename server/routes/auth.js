import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { getPool } from '../db/mysql.js';
import { authLimiter } from '../middleware/limiters.js';

const router = Router();

// ── Validation helpers ────────────────────────────────────────────────────────
const USERNAME_RE = /^[a-zA-Z0-9_\-.]{3,30}$/;
const PIN_RE = /^\d{4}$/;

function safeComparePin(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /auth
 * Login or register with username + PIN.
 *
 * Behaviour:
 *   - Username not found → create new user and return { ok: true, user }.
 *   - Username found + PIN matches → return { ok: true, user }.
 *   - Username found + PIN wrong → return { ok: false, error }.
 *
 * Request:  { "username": "alice", "pin": "1234" }
 * Response: { "ok": true, "user": { "username": "alice", "totalScore": 0 } }
 */
router.post('/', authLimiter, async (req, res, next) => {
  try {
    const { username: rawUsername, pin } = req.body ?? {};
    const username = (rawUsername || '').trim();
    const usernameLower = username.toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3–30 alphanumeric characters (_, -, . allowed)',
      });
    }
    if (!PIN_RE.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const db = getPool();
    const [rows] = await db.query(
      'SELECT id, username, pin, total_score FROM users WHERE username_lower = ? LIMIT 1',
      [usernameLower]
    );

    if (rows.length === 0) {
      // ── Register new user ──
      const now = new Date();
      await db.query(
        'INSERT INTO users (username, username_lower, pin, total_score, created_at, last_login_at) VALUES (?, ?, ?, 0, ?, ?)',
        [username, usernameLower, pin, now, now]
      );
      return res.json({ ok: true, user: { username, totalScore: 0 } });
    }

    // ── Login existing user ──
    const user = rows[0];
    if (!safeComparePin(user.pin, pin)) {
      return res.status(401).json({
        ok: false,
        error: "Wrong PIN. If this isn't your account, try a different username.",
      });
    }
    await db.query('UPDATE users SET last_login_at = ? WHERE id = ?', [new Date(), user.id]);
    return res.json({ ok: true, user: { username: user.username, totalScore: user.total_score || 0 } });
  } catch (err) {
    next(err);
  }
});

export default router;

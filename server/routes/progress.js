import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { getPool } from '../db/mysql.js';
import { progressLimiter } from '../middleware/limiters.js';

const router = Router();

function safeComparePin(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function verifyUser(db, username, pin) {
  const [rows] = await db.query(
    'SELECT id, username, pin FROM users WHERE username_lower = ? LIMIT 1',
    [username.toLowerCase()]
  );
  if (rows.length === 0) return null;
  const user = rows[0];
  if (!safeComparePin(user.pin, pin)) return null;
  return user;
}

/**
 * POST /progress/fetch
 * Returns all category progress records for the user.
 * Credentials are sent in the request body to avoid exposing the PIN in URLs.
 *
 * Request:  { "username": "alice", "pin": "1234" }
 * Response: [ { "category": "cricket", "level": 3, "score": 270 }, ... ]
 */
router.post('/fetch', progressLimiter, async (req, res, next) => {
  try {
    const username = (req.body?.username || '').trim();
    const pin = req.body?.pin || '';
    if (!username || !pin) {
      return res.status(400).json({ error: 'username and pin are required' });
    }
    const db = getPool();
    const user = await verifyUser(db, username, pin);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const [rows] = await db.query(
      'SELECT category, level, score FROM progress WHERE user_id = ?',
      [user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /progress
 * Upserts the progress record for a category.
 * Only advances level if the submitted level is higher than stored.
 * Score is cumulative.
 *
 * Request:  { "username": "alice", "pin": "1234", "category": "cricket", "level": 3, "score": 90 }
 * Response: { "ok": true }
 */
router.post('/', progressLimiter, async (req, res, next) => {
  try {
    const { username: rawUsername, pin, category, level, score } = req.body ?? {};
    const username = (rawUsername || '').trim();

    if (!username || !pin) {
      return res.status(400).json({ error: 'username and pin are required' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'category is required' });
    }
    const numLevel = Number(level);
    const numScore = Number(score);
    if (!Number.isFinite(numLevel) || numLevel < 1 || numLevel > 10) {
      return res.status(400).json({ error: 'level must be 1–10' });
    }
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > 200) {
      return res.status(400).json({ error: 'score must be 0–200' });
    }

    const db = getPool();
    const user = await verifyUser(db, username, pin);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Upsert: insert or update level (take max) and accumulate score
    await db.query(
      `INSERT INTO progress (user_id, category, level, score)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         level  = GREATEST(level, VALUES(level)),
         score  = score + VALUES(score)`,
      [user.id, category, numLevel, numScore]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

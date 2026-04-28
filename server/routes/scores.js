import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { getPool } from '../db/mysql.js';
import { scoreLimiter } from '../middleware/limiters.js';

const router = Router();

function safeComparePin(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const VALID_CATEGORIES = new Set([
  'india-politics', 'indian-geography', 'bollywood', 'cricket',
  'world-map', 'books-authors', 'world-history', 'world-flags', 'mixed-gk',
]);

// Maximum score per level is 10 questions × 10 pts = 100.
// Maximum total across 9 categories × 10 levels = 9,000 pts.
// We add a generous upper bound to allow for future expansion.
const MAX_SCORE_PER_SUBMISSION = 200;
const MIN_SCORE = 0;

/**
 * POST /scores
 * Verifies username + PIN, then records the score earned in a level.
 *
 * Request:  { "username": "alice", "pin": "1234", "score": 80, "category": "cricket", "level": 3 }
 * Response: { "ok": true, "username": "alice", "score": 80, "category": "cricket", "level": 3, "totalScore": 320 }
 */
router.post('/', scoreLimiter, async (req, res, next) => {
  try {
    const { username: rawUsername, pin, score, category, level } = req.body ?? {};
    const username = (rawUsername || '').trim();
    const usernameLower = username.toLowerCase();

    if (!username || !pin) {
      return res.status(400).json({ error: 'username and pin are required' });
    }

    // Validate score value
    const numScore = Number(score);
    if (
      !Number.isFinite(numScore) ||
      numScore < MIN_SCORE ||
      numScore > MAX_SCORE_PER_SUBMISSION
    ) {
      return res.status(400).json({
        error: `score must be a number between ${MIN_SCORE} and ${MAX_SCORE_PER_SUBMISSION}`,
      });
    }

    // Validate optional category and level fields
    if (category !== undefined && category !== null) {
      if (!VALID_CATEGORIES.has(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }
    if (level !== undefined && level !== null) {
      const numLevel = Number(level);
      if (!Number.isFinite(numLevel) || numLevel < 1 || numLevel > 10) {
        return res.status(400).json({ error: 'level must be between 1 and 10' });
      }
    }

    const db = getPool();
    const [rows] = await db.query(
      'SELECT id, username, pin, total_score FROM users WHERE username_lower = ? LIMIT 1',
      [usernameLower]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = rows[0];
    if (!safeComparePin(user.pin, pin)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const conn = await db.getConnection();
    let totalScore;
    try {
      await conn.beginTransaction();

      // Record score entry
      await conn.query(
        'INSERT INTO scores (user_id, username_snapshot, score, category, level, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.username, numScore, category || null, level != null ? Number(level) : null, new Date()]
      );

      // Update user's totalScore atomically
      await conn.query(
        'UPDATE users SET total_score = total_score + ? WHERE id = ?',
        [numScore, user.id]
      );

      const [[updated]] = await conn.query('SELECT total_score FROM users WHERE id = ?', [user.id]);
      totalScore = updated.total_score;

      await conn.commit();
    } catch (err) {
      try { await conn.rollback(); } catch (rbErr) { console.error('Rollback failed:', rbErr); }
      throw err;
    } finally {
      conn.release();
    }

    res.json({
      ok: true,
      username: user.username,
      score: numScore,
      category: category || null,
      level: level != null ? Number(level) : null,
      totalScore,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

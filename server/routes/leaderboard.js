import { Router } from 'express';
import { getPool } from '../db/mysql.js';

const router = Router();

/**
 * GET /leaderboard?limit=50
 * Returns top users ordered by totalScore descending.
 *
 * Response:
 * [
 *   { "userId": 1, "username": "alice", "totalScore": 850 },
 *   ...
 * ]
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const db = getPool();
    const [rows] = await db.query(
      'SELECT id AS userId, username, total_score AS totalScore FROM users ORDER BY total_score DESC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;

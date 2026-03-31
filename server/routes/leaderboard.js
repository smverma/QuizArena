import { Router } from 'express';
import { getFirestore } from '../db/firestore.js';

const router = Router();

/**
 * GET /leaderboard?limit=50
 * Returns top users ordered by totalScore descending.
 *
 * Response:
 * [
 *   { "userId": "...", "username": "alice", "totalScore": 850 },
 *   ...
 * ]
 *
 * Firestore index required:
 *   Collection: users | Fields: totalScore DESC
 *   (created automatically on first query or via firestore.indexes.json)
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const db = getFirestore();
    const snap = await db
      .collection('users')
      .orderBy('totalScore', 'desc')
      .limit(limit)
      .get();

    const leaderboard = snap.docs.map(doc => ({
      userId: doc.id,
      username: doc.data().username,
      totalScore: doc.data().totalScore || 0,
    }));

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

export default router;

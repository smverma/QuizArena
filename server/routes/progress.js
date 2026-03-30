import { Router } from 'express';
import { getFirestore } from '../db/firestore.js';
import { requireAuth } from '../middleware/auth.js';
import { progressLimiter } from '../index.js';

const router = Router();

/**
 * GET /progress
 * Returns all category progress records for the authenticated user.
 *
 * Response:
 * [
 *   { "category": "cricket", "level": 3, "score": 270 },
 *   ...
 * ]
 */
router.get('/', progressLimiter, requireAuth, async (req, res, next) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection('users')
      .doc(req.user.id)
      .collection('progress')
      .get();

    const progress = snap.docs.map(doc => doc.data());
    res.json(progress);
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
 * Request:  { "category": "cricket", "level": 3, "score": 90 }
 * Response: { "ok": true }
 */
router.post('/', progressLimiter, requireAuth, async (req, res, next) => {
  try {
    const { category, level, score } = req.body ?? {};

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

    const db = getFirestore();
    const progressRef = db
      .collection('users')
      .doc(req.user.id)
      .collection('progress')
      .doc(category);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(progressRef);
      if (doc.exists) {
        const existing = doc.data();
        tx.update(progressRef, {
          level: Math.max(existing.level || 0, numLevel),
          score: (existing.score || 0) + numScore,
        });
      } else {
        tx.set(progressRef, {
          category,
          level: numLevel,
          score: numScore,
        });
      }
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

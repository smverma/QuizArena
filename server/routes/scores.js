import { Router } from 'express';
import { getFirestore } from '../db/firestore.js';
import { requireAuth } from '../middleware/auth.js';
import { scoreLimiter } from '../index.js';

const router = Router();

// Maximum score per level is 10 questions × 10 pts = 100.
// Maximum total across 9 categories × 10 levels = 9,000 pts.
// We add a generous upper bound to allow for future expansion.
const MAX_SCORE_PER_SUBMISSION = 200;
const MIN_SCORE = 0;

/**
 * POST /scores
 * Authenticated. Records the score delta earned in a level.
 *
 * Request:  { "score": 80, "category": "cricket", "level": 3 }
 * Response: { "ok": true, "totalScore": 320 }
 *
 * Server-side sanity check: score must be in [0, 100] range.
 * For stronger anti-cheat, issue a server-side game-session token and
 * validate it here. See docs/gcp-deployment.md for guidance.
 */
router.post('/', requireAuth, scoreLimiter, async (req, res, next) => {
  try {
    const { score, category, level } = req.body ?? {};
    const userId = req.user.id;

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

    const db = getFirestore();

    // Record score entry
    await db.collection('scores').add({
      userId,
      usernameSnapshot: req.user.username,
      score: numScore,
      category: category || null,
      level: level != null ? Number(level) : null,
      createdAt: new Date(),
    });

    // Update user's totalScore
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');
      const current = userDoc.data().totalScore || 0;
      tx.update(userRef, { totalScore: current + numScore });
    });

    const updatedUser = await userRef.get();
    res.json({ ok: true, totalScore: updatedUser.data().totalScore });
  } catch (err) {
    next(err);
  }
});

export default router;

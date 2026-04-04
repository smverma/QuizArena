import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { getFirestore } from '../db/firestore.js';
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

    const db = getFirestore();
    const snap = await db
      .collection('users')
      .where('usernameLower', '==', usernameLower)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ error: 'User not found' });
    }
    const doc = snap.docs[0];
    const data = doc.data();
    if (!safeComparePin(data.pin, pin)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Record score entry
    await db.collection('scores').add({
      userId: doc.id,
      usernameSnapshot: data.username,
      score: numScore,
      category: category || null,
      level: level != null ? Number(level) : null,
      createdAt: new Date(),
    });

    // Update user's totalScore
    const userRef = doc.ref;
    await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');
      const current = userDoc.data().totalScore || 0;
      tx.update(userRef, { totalScore: current + numScore });
    });

    const updatedUser = await userRef.get();
    const totalScore = updatedUser.data().totalScore;

    res.json({
      ok: true,
      username: data.username,
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

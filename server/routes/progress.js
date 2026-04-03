import { Router } from 'express';
import { getFirestore } from '../db/firestore.js';
import { progressLimiter } from '../index.js';

const router = Router();

async function verifyUser(db, username, pin) {
  const snap = await db
    .collection('users')
    .where('usernameLower', '==', username.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (doc.data().pin !== pin) return null;
  return doc;
}

/**
 * GET /progress?username=alice&pin=1234
 * Returns all category progress records for the user.
 *
 * Response:
 * [
 *   { "category": "cricket", "level": 3, "score": 270 },
 *   ...
 * ]
 */
router.get('/', progressLimiter, async (req, res, next) => {
  try {
    const username = (req.query.username || '').trim();
    const pin = (req.query.pin || '').trim();
    if (!username || !pin) {
      return res.status(400).json({ error: 'username and pin are required' });
    }
    const db = getFirestore();
    const doc = await verifyUser(db, username, pin);
    if (!doc) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const snap = await db.collection('users').doc(doc.id).collection('progress').get();
    res.json(snap.docs.map(d => d.data()));
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

    const db = getFirestore();
    const doc = await verifyUser(db, username, pin);
    if (!doc) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const progressRef = db
      .collection('users')
      .doc(doc.id)
      .collection('progress')
      .doc(category);

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(progressRef);
      if (existing.exists) {
        const d = existing.data();
        tx.update(progressRef, {
          level: Math.max(d.level || 0, numLevel),
          score: (d.score || 0) + numScore,
        });
      } else {
        tx.set(progressRef, { category, level: numLevel, score: numScore });
      }
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

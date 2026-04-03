import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { getFirestore } from '../db/firestore.js';
import { progressLimiter } from '../index.js';

const router = Router();

function safeComparePin(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function verifyUser(db, username, pin) {
  const snap = await db
    .collection('users')
    .where('usernameLower', '==', username.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  if (!safeComparePin(doc.data().pin, pin)) return null;
  return doc;
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

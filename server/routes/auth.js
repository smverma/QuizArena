import { Router } from 'express';
import { getFirestore } from '../db/firestore.js';
import { authLimiter } from '../index.js';

const router = Router();

// ── Validation helpers ────────────────────────────────────────────────────────
const USERNAME_RE = /^[a-zA-Z0-9_\-.]{3,30}$/;
const PIN_RE = /^\d{4}$/;

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

    const db = getFirestore();
    const usersRef = db.collection('users');
    const snap = await usersRef.where('usernameLower', '==', usernameLower).limit(1).get();

    if (snap.empty) {
      // ── Register new user ──
      const now = new Date();
      const docRef = usersRef.doc();
      await docRef.set({ username, usernameLower, pin, totalScore: 0, createdAt: now, lastLoginAt: now });
      return res.json({ ok: true, user: { username, totalScore: 0 } });
    }

    // ── Login existing user ──
    const doc = snap.docs[0];
    const data = doc.data();
    if (data.pin !== pin) {
      return res.status(401).json({
        ok: false,
        error: "Wrong PIN. If this isn't your account, try a different username.",
      });
    }
    await doc.ref.update({ lastLoginAt: new Date() });
    return res.json({ ok: true, user: { username: data.username, totalScore: data.totalScore || 0 } });
  } catch (err) {
    next(err);
  }
});

export default router;

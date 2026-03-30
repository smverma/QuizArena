import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getFirestore } from '../db/firestore.js';
import { signToken } from '../middleware/auth.js';
import { authLimiter } from '../index.js';

const router = Router();
const BCRYPT_ROUNDS = 12;

// ── Validation helpers ────────────────────────────────────────────────────────
const USERNAME_RE = /^[a-zA-Z0-9_\-.]{3,30}$/;
const PIN_RE = /^\d{4}$/;

function validateUsername(u) {
  return USERNAME_RE.test(u);
}
function validatePin(p) {
  return PIN_RE.test(p);
}

/**
 * GET /auth/check?username=xxx
 * Returns { exists: bool } so the frontend can decide whether to show
 * the "Create Account" or "Login" form without sending a PIN.
 */
router.get('/check', async (req, res, next) => {
  try {
    const username = (req.query.username || '').trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    const db = getFirestore();
    const snap = await db
      .collection('users')
      .where('usernameLower', '==', username)
      .limit(1)
      .get();
    res.json({ exists: !snap.empty });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/pin
 * Unified login / register endpoint.
 *
 * Behaviour:
 *   - If the username does NOT exist → register the user (4-digit PIN required).
 *   - If the username DOES exist → verify PIN and log in.
 *
 * Request:  { "username": "alice", "pin": "1234" }
 * Response: { "token": "<jwt>", "user": { "id": "...", "username": "alice" } }
 *
 * The PIN is NEVER stored in plain text. Only a bcrypt hash is persisted.
 * The client should store the returned token in sessionStorage (not localStorage)
 * and never store the PIN.
 */
router.post('/pin', authLimiter, async (req, res, next) => {
  try {
    const { username: rawUsername, pin } = req.body ?? {};
    const username = (rawUsername || '').trim();
    const usernameLower = username.toLowerCase();

    if (!validateUsername(username)) {
      return res.status(400).json({
        error: 'Username must be 3–30 alphanumeric characters (_, -, . allowed)',
      });
    }
    if (!validatePin(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const db = getFirestore();
    const usersRef = db.collection('users');
    const snap = await usersRef.where('usernameLower', '==', usernameLower).limit(1).get();

    let userId;
    let displayUsername;

    if (snap.empty) {
      // ── Register new user ──
      const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
      const now = new Date();
      const docRef = usersRef.doc(); // auto-generated id
      await docRef.set({
        username,
        usernameLower,
        pinHash,
        totalScore: 0,
        createdAt: now,
        lastLoginAt: now,
      });
      userId = docRef.id;
      displayUsername = username;
    } else {
      // ── Login existing user ──
      const doc = snap.docs[0];
      const data = doc.data();
      const match = await bcrypt.compare(pin, data.pinHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      await doc.ref.update({ lastLoginAt: new Date() });
      userId = doc.id;
      displayUsername = data.username;
    }

    const user = { id: userId, username: displayUsername };
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

export default router;

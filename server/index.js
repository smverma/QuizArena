import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import scoresRoutes from './routes/scores.js';
import leaderboardRoutes from './routes/leaderboard.js';
import progressRoutes from './routes/progress.js';
import { checkFirestoreConnectivity } from './db/firestore.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the Nginx reverse proxy so req.ip reflects the real client IP
// (used by rate limiters). '1' means trust one hop.
app.set('trust proxy', 1);

// CORS – allow configured origins (comma-separated list)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (curl, Postman, same-origin)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Firestore health state ────────────────────────────────────────────────────
// Tracks whether the startup Firestore connectivity check succeeded.
// Routes that depend on Firestore check this flag and return 503 immediately
// instead of letting a Firestore error bubble up as an unhandled 500.
let firestoreOk = false;
// Number of background retry attempts made after a failed startup check.
let firestoreRetryCount = 0;

// ── Middleware: require a reachable Firestore ─────────────────────────────────
function requireFirestore(_req, res, next) {
  if (!firestoreOk) {
    return res.status(503).json({
      error: 'Service temporarily unavailable. Firestore is not reachable. Please try again shortly.',
    });
  }
  next();
}

// ── Background retry loop ─────────────────────────────────────────────────────
// When the initial Firestore connectivity check fails the service stays up but
// all data routes return 503.  This loop retries the check every
// FIRESTORE_RETRY_INTERVAL_MS milliseconds so the service self-heals without
// requiring a container restart (e.g. after a transient cold-start failure,
// brief network blip, or IAM token refresh race).
const FIRESTORE_RETRY_INTERVAL_MS = 30_000;

async function startFirestoreRetryLoop() {
  while (!firestoreOk) {
    await new Promise(resolve => setTimeout(resolve, FIRESTORE_RETRY_INTERVAL_MS));
    firestoreRetryCount += 1;
    console.log(`Firestore retry attempt ${firestoreRetryCount}…`);
    const ok = await checkFirestoreConnectivity();
    if (ok) {
      firestoreOk = true;
      const word = firestoreRetryCount === 1 ? 'attempt' : 'attempts';
      console.log(`Firestore is now reachable after ${firestoreRetryCount} retry ${word}. Resuming normal operation.`);
    }
  }
}

// ── Health endpoint ───────────────────────────────────────────────────────────
// Always responds so Cloud Run startup and liveness probes succeed even when
// Firestore is misconfigured.  The `firestore` field lets operators quickly
// see whether the database connectivity check passed.  `firestoreRetries`
// shows how many background retry attempts have been made after a failed
// startup check (non-zero means the service is still in recovery mode).
app.get('/health', (_req, res) => res.json({ ok: true, firestore: firestoreOk, firestoreRetries: firestoreRetryCount }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', requireFirestore, authRoutes);
app.use('/scores', requireFirestore, scoresRoutes);
app.use('/leaderboard', requireFirestore, leaderboardRoutes);
app.use('/progress', requireFirestore, progressRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);

  // gRPC NOT_FOUND (5): the Firestore database does not exist in this project.
  // gRPC UNAVAILABLE (14): Firestore is temporarily unreachable.
  // Return 503 so callers know the service is temporarily unavailable rather
  // than treating it as a generic 500 (which suggests an application bug).
  if (err.code === 5 || err.code === 14) {
    return res.status(503).json({
      error: 'Service temporarily unavailable. Please try again shortly.',
    });
  }

  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});


// ── Startup: listen first, then verify Firestore ──────────────────────────────
// The server always binds to PORT before the Firestore check so that Cloud Run
// can detect a listening port and complete the startup health check.
//
// Set FAIL_FAST_ON_STARTUP=true to restore fail-fast behavior (the process
// will exit if Firestore is unreachable, which prevents Cloud Run from serving
// any traffic – use this only when a non-functional backend is unacceptable).
app.listen(PORT, () => {
  console.log(`QuizArena API listening on port ${PORT}`);
});

const ok = await checkFirestoreConnectivity();
if (ok) {
  firestoreOk = true;
} else {
  if (process.env.FAIL_FAST_ON_STARTUP === 'true') {
    console.error('FAIL_FAST_ON_STARTUP=true – Exiting: Firestore is not reachable. Fix the configuration errors above and restart.');
    process.exit(1);
  }
  console.warn(
    'WARNING: Firestore is not reachable. All data routes will return HTTP 503 until Firestore is available.\n' +
    `Retrying every ${FIRESTORE_RETRY_INTERVAL_MS / 1000}s in the background.\n` +
    'Set FAIL_FAST_ON_STARTUP=true to exit the process instead of serving degraded traffic.'
  );
  // Start the background retry loop – the process stays alive and the loop
  // keeps running until Firestore becomes reachable.  We intentionally do not
  // await this; it is meant to run concurrently while the server serves traffic.
  startFirestoreRetryLoop();
}

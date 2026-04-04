import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import scoresRoutes from './routes/scores.js';
import leaderboardRoutes from './routes/leaderboard.js';
import progressRoutes from './routes/progress.js';
import { getFirestore } from './db/firestore.js';

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

// ── Rate limiters ─────────────────────────────────────────────────────────────
// NOTE: express-rate-limit uses in-memory counters per Cloud Run instance.
// For multi-instance deployments use a Redis store (ioredis + rate-limit-redis).
// Cloud Armor can provide global rate limiting in front of Cloud Run.

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 login attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const scoreLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 score submissions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export const progressLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 progress reads/writes per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ── Health endpoint ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/scores', scoresRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/progress', progressRoutes);

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

// ── Verify Firestore connectivity at startup ──────────────────────────────────
async function checkFirestoreConnectivity() {
  try {
    const db = getFirestore();
    await db.collection('_health').limit(1).get();
    console.log('Firestore connectivity check passed');
  } catch (err) {
    // Log a clear, actionable message without crashing the server.
    // The server can still start and serve requests; individual route handlers
    // will surface the error to callers if Firestore remains unavailable.
    console.error('Firestore connectivity check failed:', err.message);
    if (err.code === 5) {
      console.error(
        'Hint: The Firestore database does not exist in this project. ' +
        'Create it at https://console.firebase.google.com or check GCP_PROJECT_ID.'
      );
    }
  }
}

app.listen(PORT, () => {
  console.log(`QuizArena API listening on port ${PORT}`);
  // Verify Firestore connectivity after the server starts so any database
  // mis-configuration is surfaced immediately in the logs.
  // Errors are already logged inside checkFirestoreConnectivity; suppress the
  // unhandled-rejection here to avoid a redundant top-level error.
  checkFirestoreConnectivity().catch(() => {});
});

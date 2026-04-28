import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import scoresRoutes from './routes/scores.js';
import leaderboardRoutes from './routes/leaderboard.js';
import progressRoutes from './routes/progress.js';
import { checkDbConnectivity, initSchema } from './db/mysql.js';

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

// ── DB health state ───────────────────────────────────────────────────────────
// Tracks whether the startup DB connectivity check succeeded.
// Routes that depend on the DB check this flag and return 503 immediately
// instead of letting a DB error bubble up as an unhandled 500.
let dbOk = false;

// ── Middleware: require a reachable DB ────────────────────────────────────────
function requireDb(_req, res, next) {
  if (!dbOk) {
    return res.status(503).json({
      error: 'Service temporarily unavailable. Database is not reachable. Please try again shortly.',
    });
  }
  next();
}

// ── Health endpoint ───────────────────────────────────────────────────────────
// Always responds so Cloud Run startup and liveness probes succeed even when
// the DB is misconfigured.  The `db` field lets operators quickly
// see whether the database connectivity check passed.
app.get('/health', (_req, res) => res.json({ ok: true, db: dbOk }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', requireDb, authRoutes);
app.use('/scores', requireDb, scoresRoutes);
app.use('/leaderboard', requireDb, leaderboardRoutes);
app.use('/progress', requireDb, progressRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});


// ── Startup: listen first, then verify DB ─────────────────────────────────────
// The server always binds to PORT before the DB check so that Cloud Run
// can detect a listening port and complete the startup health check.
//
// Set FAIL_FAST_ON_STARTUP=true to restore fail-fast behavior (the process
// will exit if the DB is unreachable, which prevents Cloud Run from serving
// any traffic – use this only when a non-functional backend is unacceptable).
app.listen(PORT, () => {
  console.log(`QuizArena API listening on port ${PORT}`);
});

const ok = await checkDbConnectivity();
if (ok) {
  await initSchema();
  dbOk = true;
} else {
  if (process.env.FAIL_FAST_ON_STARTUP === 'true') {
    console.error('FAIL_FAST_ON_STARTUP=true – Exiting: Database is not reachable. Fix the configuration errors above and restart.');
    process.exit(1);
  }
  console.warn(
    'WARNING: Database is not reachable. All data routes will return HTTP 503 until the database is available.\n' +
    'Set FAIL_FAST_ON_STARTUP=true to exit the process instead of serving degraded traffic.'
  );
}

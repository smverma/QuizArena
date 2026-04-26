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


// ── Startup: verify Firestore before accepting connections ─────────────────────
// Fail fast so the process manager / Cloud Run knows the service is unhealthy
// and does not route traffic to a server that cannot persist anything.
const ok = await checkFirestoreConnectivity();
if (!ok) {
  console.error('Exiting: Firestore is not reachable. Fix the configuration errors above and restart.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`QuizArena API listening on port ${PORT}`);
});

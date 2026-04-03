import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import scoresRoutes from './routes/scores.js';
import leaderboardRoutes from './routes/leaderboard.js';
import progressRoutes from './routes/progress.js';
import { authLimiter, scoreLimiter, progressLimiter } from './middleware/limiters.js';

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
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`QuizArena API listening on port ${PORT}`));

import { rateLimit } from 'express-rate-limit';

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

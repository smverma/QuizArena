/**
 * Runtime configuration for QuizArena frontend.
 *
 * This file is served as a static asset from the web server.
 * Override window.__API_BASE_URL__ here to point the frontend at your backend
 * WITHOUT rebuilding the app – ideal for Docker images shared across environments.
 *
 * In the Docker / Cloud Run deployment nginx serves both the static frontend
 * and proxies the API routes (/auth, /scores, /leaderboard, /progress, /health)
 * to the Express backend running on port 3001 inside the same container.
 * Using window.location.origin ensures that API calls always go to the same
 * host that served the page, so the app works at any Cloud Run URL without
 * having to hard-code the service address.
 *
 * For local development the Vite dev server proxy (vite.config.js) forwards
 * these same paths to the Express server running on http://localhost:3001.
 */
window.__API_BASE_URL__ = window.location.origin;

/**
 * API base URL resolution (in priority order):
 * 1. import.meta.env.VITE_API_URL – baked in at Vite build time
 *                               (set this in CI/CD when deploying to a static host
 *                               such as GitHub Pages that has no co-located backend)
 * 2. window.__API_BASE_URL__  – injected at runtime via public/config.js
 *                               (used by the Docker/nginx deployment where the
 *                               Express backend is served from the same origin)
 * 3. http://localhost:3001    – local development fallback
 */
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.__API_BASE_URL__) ||
  'http://localhost:3001';

export default API_BASE_URL;

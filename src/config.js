/**
 * API base URL resolution (in priority order):
 * 1. window.__API_BASE_URL__  – injected at runtime via public/config.js
 *                               (ideal for Docker images shared across environments)
 * 2. import.meta.env.VITE_API_URL – baked in at Vite build time
 * 3. http://localhost:3001    – local development fallback
 */
const API_BASE_URL =
  (typeof window !== 'undefined' && window.__API_BASE_URL__) ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001';

export default API_BASE_URL;

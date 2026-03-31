/**
 * Runtime configuration for QuizArena frontend.
 *
 * This file is served as a static asset from the web server.
 * Override window.__API_BASE_URL__ here to point the frontend at your backend
 * WITHOUT rebuilding the app – ideal for Docker images shared across environments.
 *
 * Preferred approach (CI/CD build-time):
 *   Pass VITE_API_URL as a Docker build argument in cloudbuild.yaml via the
 *   _API_URL substitution variable. The Vite build will bake the URL in.
 *   Example in Cloud Build trigger settings:
 *     _API_URL = https://quizarena-api-abc123-uc.a.run.app
 *
 * Alternative (runtime injection, no rebuild):
 *   Uncomment the line below and set the correct URL, then redeploy the nginx
 *   container (or use sed/envsubst in a Cloud Build step before docker build):
 *   window.__API_BASE_URL__ = 'https://your-cloud-run-api-url.run.app';
 */
// window.__API_BASE_URL__ = 'https://your-cloud-run-api-url.run.app';

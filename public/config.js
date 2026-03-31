/**
 * Runtime configuration for QuizArena frontend.
 *
 * This file is served as a static asset from the web server.
 * Override window.__API_BASE_URL__ here to point the frontend at your backend
 * WITHOUT rebuilding the app – ideal for Docker images shared across environments.
 *
 * In production, your CI/CD pipeline (or Cloud Build) should replace this file
 * or inject the correct URL via sed/envsubst before serving.
 *
 * Example (Cloud Build step):
 *   sed -i "s|__REPLACE_API_URL__|https://api.example.com|g" public/config.js
 */
// window.__API_BASE_URL__ = 'https://your-cloud-run-url.run.app';

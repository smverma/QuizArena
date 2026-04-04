import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    // During local development, window.__API_BASE_URL__ is set to
    // window.location.origin (http://localhost:5173 by default).
    // These proxy rules forward the API paths to the Express server
    // running on http://localhost:3001 so that local dev works without
    // needing to change any config.
    proxy: {
      '/auth':        'http://localhost:3001',
      '/scores':      'http://localhost:3001',
      '/leaderboard': 'http://localhost:3001',
      '/progress':    'http://localhost:3001',
      '/health':      'http://localhost:3001',
    },
  },
})

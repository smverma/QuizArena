# 🏆 QuizArena

A multi-category quiz game built with React + Vite, backed by a Node.js API on **Google Cloud Run** with **Firestore** for persistent leaderboard, user accounts, and progress.

## 🎮 Features

- **9 Quiz Categories**: India Politics, Indian Geography, Bollywood, Cricket, World Map, Books & Authors, World History, World Flags, Mixed GK
- **10 Levels per Category** (100 questions per category, 900 total)
- **Difficulty Progression**: Easy (1–3), Medium (4–7), Hard (8–10)
- **3 Lifelines per Level**: 50-50, Double Choice, Swap Question
- **15-second Timer** per question
- **User Accounts**: Username + 4-digit PIN (PIN stored as bcrypt hash server-side, never in browser)
- **Leaderboard**: Top 50 global scores persisted in Firestore (works across browsers/devices)
- **Sound Effects**: Web Audio API (no files needed)
- **Mobile Responsive**: Works on phones and desktops

## 🏗️ Architecture

```
Browser (React SPA + Vite)
        │  HTTPS
        ▼
 Cloud Run (Node.js / Express API)  ◄── Secret Manager (JWT_SECRET)
        │
        ▼
   Firestore (NoSQL)
```

- **Frontend**: React 19 + Vite, served as a static SPA (nginx / Firebase Hosting / Cloud Run)
- **Backend**: Node.js + Express in `server/`, deployed to Cloud Run
- **Database**: Firestore (collections: `users`, `users/{id}/progress`, `scores`)
- **Auth**: Username + 4-digit PIN → bcrypt hash server-side → JWT access token (short-lived, sessionStorage)
- **Alternative DB**: Cloud SQL (Postgres) — see [`docs/cloud-sql-alternative.md`](docs/cloud-sql-alternative.md)

## 🚀 Local Development

### Prerequisites
- Node.js 20+ and npm
- A GCP project with Firestore enabled (or the Firestore emulator)

### 1. Clone and install

```bash
git clone https://github.com/smverma/QuizArena.git
cd QuizArena
npm install        # frontend deps
cd server && npm install  # backend deps
```

### 2. Configure the backend

```bash
cp server/.env.example server/.env
# Edit server/.env — at minimum set JWT_SECRET
```

### 3. Authenticate with GCP (to use real Firestore)

```bash
gcloud auth application-default login
```

Or use the Firestore emulator (no GCP account needed):

```bash
npm install -g firebase-tools
firebase emulators:start --only firestore
# Add FIRESTORE_EMULATOR_HOST=localhost:8080 to server/.env
```

### 4. Start the backend

```bash
cd server && npm start
# API running at http://localhost:3001
```

### 5. Start the frontend

```bash
# In the repo root
npm run dev
# Open http://localhost:5173
```

The frontend reads the API URL from (in priority order):
1. `window.__API_BASE_URL__` (set in `public/config.js` at runtime — **no rebuild needed**)
2. `VITE_API_URL` env var (baked in at build time)
3. `http://localhost:3001` (default for local development)

### Configuring the API URL for production

**Runtime (recommended — change `public/config.js` and redeploy the container):**
```js
// public/config.js
window.__API_BASE_URL__ = 'https://quizarena-git-671240376666.europe-west1.run.app';
```

**Build-time (baked into the JS bundle):**
```bash
VITE_API_URL=https://quizarena-git-671240376666.europe-west1.run.app npm run build
```

> Local development uses `http://localhost:3001` by default — no changes needed.

## ☁️ GCP Deployment

See [`docs/gcp-deployment.md`](docs/gcp-deployment.md) for the full step-by-step guide covering:
- Enabling Firestore, Artifact Registry, Secret Manager
- Storing `JWT_SECRET` securely in Secret Manager
- Building and deploying the backend to Cloud Run
- Configuring the frontend API URL
- CI/CD with Cloud Build
- Rate limiting and anti-cheat guidance

### Cloud Run port binding

Cloud Run injects a `PORT` environment variable (default `8080`) and requires the container to listen on that port within the startup timeout.

The runtime image uses **Nginx + Express**:
- `docker-entrypoint.sh` reads `$PORT` (defaulting to `8080`), runs `envsubst` to write the final Nginx config, starts Express internally on port `3001`, and then starts Nginx in the foreground on `$PORT`.
- Nginx proxies `/health` and API routes (`/auth`, `/scores`, `/leaderboard`, `/progress`) to Express on `127.0.0.1:3001` and serves the React SPA for all other paths.
- The `/health` endpoint is reachable on the external port (e.g. `https://<service-url>/health`).

No extra Cloud Run flags are needed — the container will bind to port `8080` automatically.

## 🏗️ Build for Production

```bash
# Frontend
npm run build           # → dist/
VITE_API_URL=https://your-api.run.app npm run build  # with API URL

# Backend Docker image
cd server && docker build -t quizarena-api .
```

## 📁 Project Structure

```
QuizArena/
├── src/                        # React frontend
│   ├── api/
│   │   └── client.js           # API client (fetch wrapper + token helpers)
│   ├── config.js               # API base URL resolution
│   ├── context/
│   │   ├── AuthContext.jsx     # Auth state (login/register via API, JWT in sessionStorage)
│   │   └── GameContext.jsx     # Game state (score, level, category)
│   ├── data/                   # Question JSON files (9 categories × 100 questions)
│   ├── pages/
│   │   ├── LoginPage.jsx       # Username + PIN login/register (calls API)
│   │   ├── CategoryPage.jsx    # Category grid (loads progress from API)
│   │   ├── QuizPage.jsx        # Quiz with timer, lifelines, lives
│   │   ├── LevelCompletePage.jsx  # Submits score + progress to API
│   │   ├── GameOverPage.jsx
│   │   └── LeaderboardPage.jsx # Fetches leaderboard from API
│   ├── components/             # Timer, ProgressBar, LifelineButtons, etc.
│   └── utils/                  # soundManager, quizEngine
├── server/                     # Node.js backend
│   ├── index.js                # Express app entry point
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js             # POST /auth/pin, GET /auth/check
│   │   ├── scores.js           # POST /scores
│   │   ├── leaderboard.js      # GET /leaderboard
│   │   └── progress.js         # GET /progress, POST /progress
│   ├── db/
│   │   └── firestore.js        # Firestore client singleton
│   ├── firestore.indexes.json  # Firestore index definitions
│   ├── Dockerfile              # Cloud Run image for the API
│   └── .env.example            # Environment variable template
├── public/
│   └── config.js               # Runtime API URL override (no rebuild needed)
├── docs/
│   ├── gcp-deployment.md       # Full GCP deployment guide
│   └── cloud-sql-alternative.md  # Cloud SQL (Postgres) alternative
├── Dockerfile                  # Cloud Run image for the frontend (nginx)
└── cloudbuild.yaml             # Cloud Build CI/CD pipeline
```

## 🔒 Security

| Concern | Implementation |
|---|---|
| PIN storage | bcrypt hash (12 rounds), never stored in plain text |
| Token storage | JWT in `sessionStorage` (cleared on tab close) |
| PIN on client | Never stored — sent once over HTTPS, immediately discarded |
| Rate limiting | In-app (express-rate-limit): 20 login/15 min, 10 scores/min per IP |
| Score validation | Server-side range check (0–200 per submission) |
| CORS | Configured via `ALLOWED_ORIGINS` env var |
| Secrets | `JWT_SECRET` via Secret Manager (Cloud Run) |

For production hardening (Cloud Armor, signed game sessions, etc.) see [`docs/gcp-deployment.md`](docs/gcp-deployment.md).

## 🧩 Adding More Questions

Each category JSON in `src/data/` follows this format:

```json
{
  "category": "Category Name",
  "levels": [
    {
      "level": 1,
      "difficulty": "easy",
      "questions": [
        {
          "id": "unique_id",
          "question": "Question text?",
          "options": ["A", "B", "C", "D"],
          "correct": 0
        }
      ]
    }
  ]
}
```

- `correct` is the **0-based index** of the correct option
- Each level should have exactly 10 questions
- Levels 1–3 → `"difficulty": "easy"`, 4–7 → `"medium"`, 8–10 → `"hard"`

## 🎮 How to Play

1. Enter your username on the start screen
2. New users create a 4-digit PIN; returning users enter their PIN
3. Select a category from the home grid
4. Answer 10 questions per level within 15 seconds each
5. Use lifelines (50-50, Double Choice, Swap) to help
6. Complete all 10 levels to master a category
7. Check the Leaderboard to see your global rank

# GCP Deployment Guide – QuizArena

This guide walks through deploying QuizArena (frontend + backend) to Cloud Run with Firestore.

---

## Architecture

```
Browser (React SPA)
      │  HTTPS
      ▼
 Cloud Run (Node.js API)   ◄──── Secret Manager (JWT_SECRET)
      │
      ▼
  Firestore (NoSQL DB)
```

---

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Docker installed (for local image builds)
- Node.js 20+ for local development

---

## 1. Enable GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Create Firestore Database

```bash
# Replace YOUR_REGION with your preferred region (e.g., us-central1, asia-south1)
gcloud firestore databases create \
  --location=YOUR_REGION \
  --type=firestore-native
```

> **Native mode** is required for real-time capabilities and the query patterns used by this app.

### Deploy Firestore indexes

```bash
cd server
npx firebase-tools firestore:indexes --project YOUR_PROJECT_ID
# or apply manually via the console using server/firestore.indexes.json
```

---

## 3. Create Artifact Registry repository

```bash
gcloud artifacts repositories create quizarena \
  --repository-format=docker \
  --location=us-central1
```

---

## 4. Store JWT_SECRET in Secret Manager

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Store it
echo -n "YOUR_GENERATED_SECRET" | \
  gcloud secrets create QUIZ_JWT_SECRET --data-file=-

# Grant Cloud Run's service account access
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding QUIZ_JWT_SECRET \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Build and push the backend Docker image

```bash
cd server

PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/quizarena/quizarena-api:latest"

docker build -t $IMAGE .
docker push $IMAGE
```

Or use Cloud Build:

```bash
gcloud builds submit --tag $IMAGE .
```

---

## 6. Deploy to Cloud Run

```bash
gcloud run deploy quizarena-api \
  --image $IMAGE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-secrets "JWT_SECRET=QUIZ_JWT_SECRET:latest" \
  --set-env-vars "ALLOWED_ORIGINS=https://YOUR_FRONTEND_URL" \
  --min-instances 0 \
  --max-instances 10
```

Note the deployed URL — you will need it for the frontend configuration.

> **CORS**: The `ALLOWED_ORIGINS` env var must be set to your frontend Cloud Run URL
> (e.g., `https://quizarena-abc123-uc.a.run.app`). Without this the browser will
> block API requests from the frontend with a CORS error.

---

## 7. Configure the frontend to call the backend

The frontend determines the backend URL in this priority order:
1. `window.__API_BASE_URL__` (set in `public/config.js` at runtime)
2. `VITE_API_URL` env var (baked in at Vite build time — **recommended for CI/CD**)
3. `http://localhost:3001` (local dev fallback only — not usable in production)

### Option A: Cloud Build substitution variable (recommended)

Set the `_API_URL` substitution when creating/editing your Cloud Build trigger:

```
_API_URL = https://quizarena-api-abc123-uc.a.run.app
```

The `cloudbuild.yaml` already passes this as `--build-arg VITE_API_URL=${_API_URL}`
to the Docker build so Vite bakes the URL in. No manual file editing needed.

### Option B: Vite build-time env var (local / manual builds)

```bash
VITE_API_URL=https://YOUR_CLOUD_RUN_URL npm run build
```

### Option C: Runtime config (no rebuild required)

Uncomment and edit `public/config.js` before building the Docker image:

```js
window.__API_BASE_URL__ = 'https://YOUR_CLOUD_RUN_URL';
```

---

## 8. Deploy the frontend

### Option A: Firebase Hosting

```bash
npm run build
npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID
```

### Option B: Cloud Storage + CDN

```bash
npm run build
gsutil -m rsync -r dist gs://YOUR_BUCKET_NAME
# Configure a Cloud CDN / Load Balancer pointing at the bucket
```

### Option C: Same Cloud Run service (nginx)

The root `Dockerfile` serves the built frontend via nginx. Build and deploy it separately:

```bash
gcloud run deploy quizarena-frontend \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080
```

---

## 9. CI/CD with Cloud Build (optional)

### Trigger on push to main

```bash
gcloud builds triggers create github \
  --repo-name=QuizArena \
  --repo-owner=smverma \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --substitutions "_API_URL=https://YOUR_BACKEND_CLOUD_RUN_URL"
```

> **Required**: The `_API_URL` substitution must be set to your backend Cloud Run URL
> so the frontend knows where to send API requests. Without it the app will try to
> call `http://localhost:3001` (the local dev default) and all logins/registrations
> will fail with "Failed to fetch".
>
> You can also set substitutions via the Cloud Console:
> Cloud Build → Triggers → Edit trigger → Substitution variables → add `_API_URL`.

The existing `cloudbuild.yaml` builds and deploys the **frontend**. You can extend it to also build and deploy the backend.

---

## 10. Security hardening

### Rate limiting across Cloud Run instances

The in-app rate limiter (`express-rate-limit`) is **per-instance**. With Cloud Run auto-scaling, each instance has its own counter.

For multi-instance rate limiting:
- Use **Cloud Armor** (WAF rules) in front of Cloud Run — supports global rate limiting.
- Or add **Redis** (Memorystore) and use `rate-limit-redis` store.

### Cloud Armor (recommended for production)

```bash
gcloud compute security-policies create quizarena-policy

# Limit login endpoint to 20 requests/min/IP
gcloud compute security-policies rules create 1000 \
  --security-policy quizarena-policy \
  --expression "request.path.matches('/auth/pin')" \
  --action throttle \
  --rate-limit-threshold-count 20 \
  --rate-limit-threshold-interval-sec 60 \
  --conform-action allow \
  --exceed-action deny-429

gcloud compute backend-services update YOUR_BACKEND_SERVICE \
  --security-policy quizarena-policy --global
```

### Anti-cheat (score submissions)

Current protection:
- Server validates score range (0–200 per submission).
- Authentication required; scores are tied to verified user IDs.
- Rate limited to 10 submissions/min.

For stronger protection (future work):
1. **Server-issued game session tokens**: server issues a signed token when a game starts, validates it on score submission.
2. **Server-side answer verification**: server stores questions and checks answers server-side (requires moving question data to Firestore/Cloud Storage).
3. **Anomaly detection**: flag unusually high scores for manual review.

---

## Firestore data model

```
users/{userId}
  username:      string   (display name)
  usernameLower: string   (for case-insensitive lookup, indexed)
  pinHash:       string   (bcrypt hash, never returned to client)
  totalScore:    number   (sum across all category levels)
  createdAt:     timestamp
  lastLoginAt:   timestamp

  progress/{categoryId}
    category:  string
    level:     number  (highest level completed)
    score:     number  (cumulative score for this category)

scores/{scoreId}
  userId:           string
  usernameSnapshot: string  (denormalized for leaderboard display)
  score:            number
  category:         string | null
  level:            number | null
  createdAt:        timestamp
```

### Indexes

See `server/firestore.indexes.json`:
- `users` ordered by `totalScore DESC` — used for leaderboard
- `users` ordered by `usernameLower ASC` — used for username lookup

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Secret for signing JWT tokens |
| `PORT` | ❌ | 3001 | HTTP port (Cloud Run sets 8080) |
| `JWT_EXPIRES_IN` | ❌ | 7d | Token expiry |
| `GCP_PROJECT_ID` | ❌ | (from ADC) | GCP project ID |
| `ALLOWED_ORIGINS` | ❌ | localhost:5173 | CORS allowed origins |
| `FIRESTORE_EMULATOR_HOST` | ❌ | — | Point to local emulator |
| `GOOGLE_APPLICATION_CREDENTIALS` | ❌ | (from ADC) | Path to service account JSON |

---

## Local development

```bash
# 1. Authenticate with GCP (to use real Firestore)
gcloud auth application-default login

# 2. Copy and fill environment
cp server/.env.example server/.env
# Edit JWT_SECRET and optionally GCP_PROJECT_ID

# 3. Start the backend
cd server && npm install && npm start

# 4. Start the frontend (in a separate terminal)
cd .. && npm run dev

# The frontend at http://localhost:5173 will call the API at http://localhost:3001
```

### Using the Firestore emulator (no GCP account needed)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start the emulator
firebase emulators:start --only firestore

# Add to server/.env
FIRESTORE_EMULATOR_HOST=localhost:8080
```

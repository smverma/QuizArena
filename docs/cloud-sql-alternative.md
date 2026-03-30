# Cloud SQL (PostgreSQL) Alternative to Firestore

If you prefer a **relational database** over Firestore, Cloud SQL with PostgreSQL is an excellent alternative for QuizArena.

---

## When to choose Cloud SQL over Firestore

| Criteria | Firestore | Cloud SQL (Postgres) |
|---|---|---|
| Schema flexibility | High (schemaless) | Low (fixed schema) |
| Complex queries (JOINs) | ❌ Limited | ✅ Full SQL |
| Transactions | ✅ Multi-doc | ✅ ACID |
| Cost (low traffic) | Very low (free tier) | Higher (min ~$10/mo) |
| Cost (high traffic) | Pay-per-op | Predictable compute |
| Ops burden | Very low (serverless) | Medium (managed but stateful) |
| Scaling | Automatic | Manual / Autoscale |
| Strong consistency | ✅ | ✅ |

**Choose Cloud SQL if:**
- You need complex analytics queries (e.g., daily/weekly leaderboards)
- Your team is more comfortable with SQL
- You plan to add relational data (categories, question metadata, etc.)

---

## Schema

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT NOT NULL UNIQUE,
  pin_hash    TEXT NOT NULL,           -- bcrypt hash
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users (lower(username));
CREATE INDEX idx_users_score    ON users (total_score DESC);

CREATE TABLE progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  level       INTEGER NOT NULL DEFAULT 1,
  score       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, category)
);

CREATE INDEX idx_progress_user ON progress (user_id);

CREATE TABLE scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username_snapshot TEXT NOT NULL,
  score             INTEGER NOT NULL,
  category          TEXT,
  level             INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scores_user      ON scores (user_id);
CREATE INDEX idx_scores_created   ON scores (created_at DESC);
```

---

## Key queries

### Leaderboard (top users by total score)

```sql
SELECT id, username, total_score
FROM users
ORDER BY total_score DESC
LIMIT 50;
```

### User's category progress

```sql
SELECT category, level, score
FROM progress
WHERE user_id = $1;
```

### Update total score after level completion

```sql
-- Upsert progress, then recalculate total_score in one transaction
BEGIN;
INSERT INTO progress (user_id, category, level, score)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, category)
DO UPDATE SET
  level = GREATEST(progress.level, EXCLUDED.level),
  score = progress.score + EXCLUDED.score;

UPDATE users
SET total_score = (
  SELECT COALESCE(SUM(score), 0) FROM progress WHERE user_id = $1
)
WHERE id = $1;
COMMIT;
```

---

## GCP setup (not implemented – reference only)

```bash
# Create a Cloud SQL Postgres instance
gcloud sql instances create quizarena-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --deletion-protection

# Create the database and user
gcloud sql databases create quizarena --instance=quizarena-db
gcloud sql users create quizarena_user \
  --instance=quizarena-db \
  --password=YOUR_DB_PASSWORD

# Deploy Cloud Run with the Cloud SQL connection
gcloud run deploy quizarena-api \
  --image IMAGE_URL \
  --add-cloudsql-instances PROJECT_ID:us-central1:quizarena-db \
  --set-env-vars "DB_SOCKET=/cloudsql/PROJECT_ID:us-central1:quizarena-db,DB_NAME=quizarena,DB_USER=quizarena_user" \
  --set-secrets "DB_PASSWORD=quizarena-db-password:latest,JWT_SECRET=QUIZ_JWT_SECRET:latest"
```

### Recommended Node.js packages for Cloud SQL

```bash
npm install pg @google-cloud/cloud-sql-connector
```

```js
// db/postgres.js
import { Pool } from 'pg';
import { Connector } from '@google-cloud/cloud-sql-connector';

let pool;
export async function getPool() {
  if (!pool) {
    const connector = new Connector();
    const clientOpts = await connector.getOptions({
      instanceConnectionName: process.env.CLOUD_SQL_INSTANCE,
      ipType: 'PUBLIC',
    });
    pool = new Pool({
      ...clientOpts,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  }
  return pool;
}
```

---

## Migration path from Firestore to Cloud SQL

If you start with Firestore (as implemented) and later switch to Cloud SQL:

1. Export Firestore data to GCS: `gcloud firestore export gs://BUCKET`
2. Write a one-time script to import into Postgres using the export JSON.
3. Swap the `server/db/firestore.js` import with `server/db/postgres.js` in each route.
4. All API contracts remain identical — the frontend is not affected.

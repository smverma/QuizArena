import { Firestore } from '@google-cloud/firestore';

// On Cloud Run, Application Default Credentials (ADC) are used automatically.
// For local development, run: gcloud auth application-default login
// or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

let db;

export function getFirestore() {
  if (!db) {
    const opts = {};
    // Only set projectId when explicitly provided; otherwise ADC infers it.
    if (process.env.GCP_PROJECT_ID) opts.projectId = process.env.GCP_PROJECT_ID;
    // Support named Firestore databases (v7+ feature). Leave unset to use the
    // default "(default)" database.
    if (process.env.FIRESTORE_DATABASE_ID) opts.databaseId = process.env.FIRESTORE_DATABASE_ID;
    db = new Firestore(opts);
  }
  return db;
}

import { Firestore } from '@google-cloud/firestore';

// On Cloud Run, Application Default Credentials (ADC) are used automatically.
// For local development, run: gcloud auth application-default login
// or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

let db;

export function getFirestore() {
  if (!db) {
    db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID, // optional; ADC infers project
    });
  }
  return db;
}

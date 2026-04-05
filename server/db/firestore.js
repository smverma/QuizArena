import { Firestore } from '@google-cloud/firestore';

// On Cloud Run, Application Default Credentials (ADC) are used automatically.
// For local development, run: gcloud auth application-default login
// or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

let db;

export function getFirestore() {
  if (!db) {
    const opts = {};
    // Always set projectId when provided; otherwise ADC infers it from the
    // GCP metadata server.  Setting it explicitly avoids silent mis-detection
    // which can cause NOT_FOUND errors if the wrong project is resolved.
    if (process.env.GCP_PROJECT_ID) opts.projectId = process.env.GCP_PROJECT_ID;
    // Always set databaseId explicitly so there is never any ambiguity about
    // which Firestore database is targeted.  Defaults to "(default)" unless
    // FIRESTORE_DATABASE_ID is provided (e.g. for a named database created via
    // `gcloud firestore databases create --database=mydb`).
    opts.databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    db = new Firestore(opts);
  }
  return db;
}

/**
 * Run a lightweight Firestore query to verify that the database is reachable
 * and exists.  Returns true on success; logs a diagnostic message and returns
 * false on failure.  Intended to be called once at server startup.
 */
export async function checkFirestoreConnectivity() {
  try {
    const firestoreDb = getFirestore();
    // A limit-0 query is the cheapest possible round-trip – it verifies that
    // the project, database, and IAM permissions are all configured correctly
    // without reading any actual documents.
    await firestoreDb.collection('users').limit(0).get();
    console.log('Firestore connectivity OK (database: %s)', firestoreDb.databaseId);
    return true;
  } catch (err) {
    if (err.code === 5) {
      // gRPC NOT_FOUND – the Firestore database does not exist in this project.
      console.error(
        'Firestore database "%s" not found (gRPC 5 NOT_FOUND). ' +
          'Ensure the FIRESTORE_DATABASE_ID environment variable matches the ' +
          'database ID shown in the Firebase/GCP console (e.g. "quiz-free-tier"), ' +
          'and that GCP_PROJECT_ID points to the correct project.\n' +
          'Create a named database with: ' +
          'gcloud firestore databases create --database=YOUR_DATABASE_ID --location=YOUR_REGION --type=firestore-native',
        firestoreDb.databaseId
      );
    } else {
      console.error('Firestore connectivity check failed (code %s): %s', err.code, err.message);
    }
    return false;
  }
}

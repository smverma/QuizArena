import { Firestore } from '@google-cloud/firestore';

// On Cloud Run, Application Default Credentials (ADC) are used automatically.
// For local development, run: gcloud auth application-default login
// or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
// or set FIRESTORE_EMULATOR_HOST=localhost:8080 to use the local emulator.

let db;

/**
 * Returns true when the process is running on a GCP managed environment
 * (Cloud Run, App Engine, etc.) where ADC is available automatically.
 */
function runningOnGcp() {
  return Boolean(process.env.K_SERVICE || process.env.GAE_SERVICE);
}

export function getFirestore() {
  if (!db) {
    const opts = {};
    // Always set projectId when provided; otherwise ADC infers it from the
    // GCP metadata server.  Setting it explicitly avoids silent mis-detection
    // which can cause NOT_FOUND errors if the wrong project is resolved.
    if (process.env.GCP_PROJECT_ID) opts.projectId = process.env.GCP_PROJECT_ID;
    // Always set databaseId explicitly so there is never any ambiguity about
    // which Firestore database is targeted.  This project uses the named database
    // "quiz-free-tier"; override via FIRESTORE_DATABASE_ID if needed (e.g. for a
    // database created via `gcloud firestore databases create --database=mydb`).
    opts.databaseId = process.env.FIRESTORE_DATABASE_ID || 'quiz-free-tier';
    // Emulator support: when FIRESTORE_EMULATOR_HOST is set, configure the SDK
    // to connect to it directly (host + ssl:false) for reliable local development.
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      opts.host = process.env.FIRESTORE_EMULATOR_HOST;
      opts.ssl = false;
    }
    db = new Firestore(opts);
  }
  return db;
}

/**
 * Run a lightweight Firestore query to verify that the database is reachable
 * and exists.  Returns true on success; logs actionable diagnostic messages
 * and returns false on failure.  Intended to be called once at server startup.
 */
export async function checkFirestoreConnectivity() {
  try {
    const firestoreDb = getFirestore();
    // A limit-0 query is the cheapest possible round-trip – it verifies that
    // the project, database, and IAM permissions are all configured correctly
    // without reading any actual documents.
    await firestoreDb.collection('users').limit(0).get();
    console.log(
      'Firestore connectivity OK (project: %s, database: %s)',
      firestoreDb.projectId,
      firestoreDb.databaseId
    );
    return true;
  } catch (err) {
    if (err.code === 5) {
      // gRPC NOT_FOUND – the Firestore database does not exist in this project.
      console.error(
        'Firestore connectivity check failed (code 5 NOT_FOUND): ' +
          'Firestore database "%s" not found. ' +
          'Ensure FIRESTORE_DATABASE_ID matches the database ID in the Firebase/GCP console ' +
          '(e.g. "quiz-free-tier") and that GCP_PROJECT_ID points to the correct project.\n' +
          'Create a named database with: ' +
          'gcloud firestore databases create --database=YOUR_DATABASE_ID --location=YOUR_REGION --type=firestore-native',
        process.env.FIRESTORE_DATABASE_ID || '(default)'
      );
    } else if (err.code === 7) {
      // gRPC PERMISSION_DENIED – credentials present but IAM access not granted.
      console.error(
        'Firestore connectivity check failed (code 7 PERMISSION_DENIED): ' +
          'The runtime identity lacks Firestore permissions. ' +
          'Grant the Cloud Run service account the "Cloud Datastore User" role ' +
          '(roles/datastore.user) in IAM.'
      );
    } else {
      console.error('Firestore connectivity check failed (code %s): %s', err.code, err.message);
    }

    if (!runningOnGcp() && !process.env.FIRESTORE_EMULATOR_HOST) {
      console.error(
        'Local/non-GCP environment detected. Provide credentials or use the emulator:\n' +
          '  1) gcloud auth application-default login\n' +
          '  2) OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json\n' +
          '  3) OR set FIRESTORE_EMULATOR_HOST=localhost:8080 and run the emulator'
      );
    }

    return false;
  }
}

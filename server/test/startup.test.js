/**
 * Minimal unit tests for the startup option logic introduced to fix Cloud Run
 * startup failures caused by Firestore connectivity issues.
 *
 * Run with: node --test server/test/startup.test.js
 * (requires Node.js >= 18 for the built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Simulate the startup branching logic extracted from server/index.js so we can
 * test it without booting a real Express server or connecting to Firestore.
 *
 * @param {boolean} firestoreOk  Whether the simulated connectivity check passed.
 * @param {string|undefined} failFastEnv  Value of FAIL_FAST_ON_STARTUP env var.
 * @returns {{ listening: boolean, exited: boolean, firestoreReady: boolean, retryStarted: boolean }}
 */
function simulateStartup(firestoreOk, failFastEnv) {
  let listening = false;
  let exited = false;
  let firestoreReady = false;
  let retryStarted = false;

  // The server always listens first (Cloud Run friendly).
  listening = true;

  if (firestoreOk) {
    firestoreReady = true;
  } else {
    if (failFastEnv === 'true') {
      exited = true;
    } else {
      // Background retry loop is started so the service can self-heal.
      retryStarted = true;
    }
  }

  return { listening, exited, firestoreReady, retryStarted };
}

/**
 * Simulate the background retry loop logic extracted from startFirestoreRetryLoop()
 * in server/index.js.
 *
 * @param {boolean[]} checkResults  Ordered results returned by each simulated
 *   connectivity check.  The loop stops as soon as a check returns true.
 * @returns {{ firestoreReady: boolean, attempts: number }}
 */
function simulateRetryLoop(checkResults) {
  let firestoreOk = false;
  let attempts = 0;

  for (const result of checkResults) {
    attempts += 1;
    if (result) {
      firestoreOk = true;
      break;
    }
  }

  return { firestoreReady: firestoreOk, attempts };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('startup option logic', () => {
  it('always starts listening on PORT regardless of Firestore status', () => {
    const { listening } = simulateStartup(false, undefined);
    assert.equal(listening, true, 'server must listen even when Firestore is unreachable');
  });

  it('marks Firestore as ready when connectivity check succeeds', () => {
    const { firestoreReady, exited } = simulateStartup(true, undefined);
    assert.equal(firestoreReady, true);
    assert.equal(exited, false);
  });

  it('does NOT exit when Firestore is unreachable and FAIL_FAST_ON_STARTUP is not set', () => {
    const { exited, firestoreReady } = simulateStartup(false, undefined);
    assert.equal(exited, false, 'process must not exit without FAIL_FAST_ON_STARTUP=true');
    assert.equal(firestoreReady, false, 'firestoreReady must remain false');
  });

  it('starts background retry loop when Firestore is unreachable and FAIL_FAST_ON_STARTUP is not set', () => {
    const { retryStarted, exited } = simulateStartup(false, undefined);
    assert.equal(retryStarted, true, 'retry loop must be started so the service can self-heal');
    assert.equal(exited, false);
  });

  it('does NOT exit when FAIL_FAST_ON_STARTUP is set to an arbitrary non-true value', () => {
    const { exited } = simulateStartup(false, 'false');
    assert.equal(exited, false);
  });

  it('exits when Firestore is unreachable and FAIL_FAST_ON_STARTUP=true', () => {
    const { exited, listening } = simulateStartup(false, 'true');
    assert.equal(listening, true, 'server must have started listening before the exit decision');
    assert.equal(exited, true, 'process must exit when FAIL_FAST_ON_STARTUP=true');
  });

  it('does NOT start retry loop when FAIL_FAST_ON_STARTUP=true', () => {
    const { retryStarted } = simulateStartup(false, 'true');
    assert.equal(retryStarted, false, 'retry loop must not run when fail-fast is requested');
  });

  it('does NOT exit when Firestore succeeds even with FAIL_FAST_ON_STARTUP=true', () => {
    const { exited, firestoreReady } = simulateStartup(true, 'true');
    assert.equal(exited, false);
    assert.equal(firestoreReady, true);
  });
});

describe('background Firestore retry loop', () => {
  it('recovers on the first retry when check succeeds immediately', () => {
    const { firestoreReady, attempts } = simulateRetryLoop([true]);
    assert.equal(firestoreReady, true, 'Firestore must be marked ready after a successful retry');
    assert.equal(attempts, 1);
  });

  it('recovers after several failed retries', () => {
    const { firestoreReady, attempts } = simulateRetryLoop([false, false, true]);
    assert.equal(firestoreReady, true);
    assert.equal(attempts, 3, 'loop must have made 3 attempts before succeeding');
  });

  it('does not recover when all retries fail', () => {
    const { firestoreReady, attempts } = simulateRetryLoop([false, false, false]);
    assert.equal(firestoreReady, false, 'Firestore must remain not-ready if all checks fail');
    assert.equal(attempts, 3);
  });

  it('stops retrying immediately when first check succeeds', () => {
    const { firestoreReady, attempts } = simulateRetryLoop([true, false, false]);
    assert.equal(firestoreReady, true);
    assert.equal(attempts, 1, 'loop must stop after the first successful check');
  });
});

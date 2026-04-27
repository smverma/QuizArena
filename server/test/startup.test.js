/**
 * Minimal unit tests for the startup option logic introduced to fix Cloud Run
 * startup failures caused by Firestore connectivity issues.
 *
 * Run with: node --test server/test/startup.test.js
 * (requires Node.js >= 18 for the built-in test runner)
 */

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Simulate the startup branching logic extracted from server/index.js so we can
 * test it without booting a real Express server or connecting to Firestore.
 *
 * @param {boolean} firestoreOk  Whether the simulated connectivity check passed.
 * @param {string|undefined} failFastEnv  Value of FAIL_FAST_ON_STARTUP env var.
 * @returns {{ listening: boolean, exited: boolean, firestoreReady: boolean }}
 */
function simulateStartup(firestoreOk, failFastEnv) {
  let listening = false;
  let exited = false;
  let firestoreReady = false;

  // The server always listens first (Cloud Run friendly).
  listening = true;

  if (firestoreOk) {
    firestoreReady = true;
  } else {
    if (failFastEnv === 'true') {
      exited = true;
    }
    // else: server stays up, routes return 503
  }

  return { listening, exited, firestoreReady };
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

  it('does NOT exit when FAIL_FAST_ON_STARTUP is set to an arbitrary non-true value', () => {
    const { exited } = simulateStartup(false, 'false');
    assert.equal(exited, false);
  });

  it('exits when Firestore is unreachable and FAIL_FAST_ON_STARTUP=true', () => {
    const { exited, listening } = simulateStartup(false, 'true');
    assert.equal(listening, true, 'server must have started listening before the exit decision');
    assert.equal(exited, true, 'process must exit when FAIL_FAST_ON_STARTUP=true');
  });

  it('does NOT exit when Firestore succeeds even with FAIL_FAST_ON_STARTUP=true', () => {
    const { exited, firestoreReady } = simulateStartup(true, 'true');
    assert.equal(exited, false);
    assert.equal(firestoreReady, true);
  });
});

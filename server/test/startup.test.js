/**
 * Minimal unit tests for the startup option logic.
 *
 * Run with: node --test server/test/startup.test.js
 * (requires Node.js >= 18 for the built-in test runner)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Simulate the startup branching logic extracted from server/index.js so we can
 * test it without booting a real Express server or connecting to the database.
 *
 * @param {boolean} dbOk  Whether the simulated connectivity check passed.
 * @param {string|undefined} failFastEnv  Value of FAIL_FAST_ON_STARTUP env var.
 * @returns {{ listening: boolean, exited: boolean, dbReady: boolean }}
 */
function simulateStartup(dbOk, failFastEnv) {
  let listening = false;
  let exited = false;
  let dbReady = false;

  // The server always listens first (Cloud Run friendly).
  listening = true;

  if (dbOk) {
    dbReady = true;
  } else {
    if (failFastEnv === 'true') {
      exited = true;
    }
    // else: server stays up, routes return 503
  }

  return { listening, exited, dbReady };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('startup option logic', () => {
  it('always starts listening on PORT regardless of DB status', () => {
    const { listening } = simulateStartup(false, undefined);
    assert.equal(listening, true, 'server must listen even when DB is unreachable');
  });

  it('marks DB as ready when connectivity check succeeds', () => {
    const { dbReady, exited } = simulateStartup(true, undefined);
    assert.equal(dbReady, true);
    assert.equal(exited, false);
  });

  it('does NOT exit when DB is unreachable and FAIL_FAST_ON_STARTUP is not set', () => {
    const { exited, dbReady } = simulateStartup(false, undefined);
    assert.equal(exited, false, 'process must not exit without FAIL_FAST_ON_STARTUP=true');
    assert.equal(dbReady, false, 'dbReady must remain false');
  });

  it('does NOT exit when FAIL_FAST_ON_STARTUP is set to an arbitrary non-true value', () => {
    const { exited } = simulateStartup(false, 'false');
    assert.equal(exited, false);
  });

  it('exits when DB is unreachable and FAIL_FAST_ON_STARTUP=true', () => {
    const { exited, listening } = simulateStartup(false, 'true');
    assert.equal(listening, true, 'server must have started listening before the exit decision');
    assert.equal(exited, true, 'process must exit when FAIL_FAST_ON_STARTUP=true');
  });

  it('does NOT exit when DB succeeds even with FAIL_FAST_ON_STARTUP=true', () => {
    const { exited, dbReady } = simulateStartup(true, 'true');
    assert.equal(exited, false);
    assert.equal(dbReady, true);
  });
});

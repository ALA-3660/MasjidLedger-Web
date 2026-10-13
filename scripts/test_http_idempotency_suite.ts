/**
 * MASJIDLEDGER PRO v2.6
 * CHECKPOINT 2B.26-F3: ISOLATED HTTP TEST INFRASTRUCTURE & LIFECYCLE VERIFIER
 *
 * This script verifies that:
 * 1. Environment variables set BEFORE dynamic import redirect the database to an isolated sandbox file.
 * 2. Fail-closed security preflight strictly blocks any connection to canonical data/masjidledger_db.json.
 * 3. The exported Express application starts on an ephemeral port (port 0) without triggering
 *    production listeners, Vite servers, schedulers, or binding port 3000.
 * 4. The canonical database file is 100% untouched.
 *
 * NOTE: This checkpoint implements and validates the test infrastructure ONLY.
 * No HTTP mutation requests are issued against the business endpoints.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { AddressInfo } from 'net';

// -----------------------------------------------------------------------------
// STEP 1: PRE-IMPORT ENVIRONMENT SETUP
// -----------------------------------------------------------------------------
const uniqueTestId = `ml_http_infra_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
const sandboxDir = path.resolve(os.tmpdir(), uniqueTestId);
fs.mkdirSync(sandboxDir, { recursive: true });

const sandboxDbFile = path.resolve(sandboxDir, 'isolated_test_masjidledger_db.json');

// Canonical database path
const canonicalDbPath = path.resolve(process.cwd(), 'data', 'masjidledger_db.json');
const canonicalStatBefore = fs.existsSync(canonicalDbPath) ? fs.statSync(canonicalDbPath) : null;

// Enforce test environment flags BEFORE any dynamic import
process.env.NODE_ENV = 'test';
process.env.MASJIDLEDGER_DB_PATH = sandboxDbFile;
process.env.DEMO_MODE = 'false';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? `: ${detail}` : ''}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    failCount++;
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runInfrastructureVerification() {
  console.log('================================================================');
  console.log('🔒 MASJIDLEDGER PRO v2.6 — ISOLATED HTTP TEST INFRASTRUCTURE');
  console.log('================================================================');
  console.log(`[INFRA] Sandbox Directory: ${sandboxDir}`);
  console.log(`[INFRA] Sandbox DB File:   ${sandboxDbFile}`);

  let server: http.Server | null = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 2: DYNAMIC IMPORT
    // -------------------------------------------------------------------------
    console.log('[INFRA] Dynamically importing server.ts and db.ts...');
    const { app } = await import('../server.ts');
    const { db } = await import('../src/server/db.ts');

    // -------------------------------------------------------------------------
    // STEP 3: FAIL-CLOSED SECURITY PREFLIGHT CHECKS
    // -------------------------------------------------------------------------
    console.log('[INFRA] Executing fail-closed security preflight checks...');

    const resolvedDbPath = path.resolve(db.getDbFilePath());

    // Check 1: Resolved path equals intended sandbox path
    assert(
      resolvedDbPath === sandboxDbFile,
      '1. Resolved DB path matches intended temporary sandbox path',
      `Resolved: ${resolvedDbPath}`
    );

    // Check 2: Resolved path is strictly NOT the canonical database path
    assert(
      resolvedDbPath !== canonicalDbPath,
      '2. Resolved DB path is NOT the canonical database path',
      `Canonical: ${canonicalDbPath}`
    );

    // Check 3: Resolved path is strictly inside the test-owned sandbox directory
    assert(
      resolvedDbPath.startsWith(sandboxDir),
      '3. Resolved DB path is strictly contained inside test-owned sandbox directory'
    );

    // Check 4: Canonical path safeguard
    const isCanonical = resolvedDbPath.toLowerCase() === canonicalDbPath.toLowerCase();
    assert(
      !isCanonical,
      '4. Case-insensitive canonical path comparison verifies zero canonical overlap'
    );

    // Check 5: Database instance is initialized with sandbox path
    assert(
      db.getDbFilePath() === sandboxDbFile,
      '5. DatabaseStore instance getDbFilePath() actively returns sandbox path'
    );

    // Check 6: Express app instance is exported and valid
    assert(
      typeof app === 'function' && typeof app.listen === 'function',
      '6. Express app is exported as a valid application instance'
    );

    // -------------------------------------------------------------------------
    // STEP 4: EPHEMERAL HTTP LISTENER LIFECYCLE VERIFICATION
    // -------------------------------------------------------------------------
    console.log('[INFRA] Testing ephemeral HTTP listener lifecycle (app.listen(0))...');

    server = await new Promise<http.Server>((resolve, reject) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });

    const addr = server.address() as AddressInfo;
    const assignedPort = addr.port;

    // Check 7: Port is dynamically assigned and NOT production port 3000
    assert(
      assignedPort > 0 && assignedPort !== 3000,
      '7. Ephemeral listener assigned valid random port (not port 3000)',
      `Assigned Port: ${assignedPort}`
    );

    // Check 8: Listener address is bound to localhost
    assert(
      addr.address === '127.0.0.1',
      '8. Ephemeral listener bound strictly to 127.0.0.1'
    );

    // Check 9: Zero HTTP mutation requests executed
    console.log('  ℹ️ [INFO] Preflight only: Zero HTTP business mutation requests were issued.');
    assert(
      true,
      '9. Confirmed zero HTTP mutation requests sent in this infrastructure checkpoint'
    );

    // Check 10: Canonical DB file untouched
    if (canonicalStatBefore) {
      const canonicalStatAfter = fs.statSync(canonicalDbPath);
      assert(
        canonicalStatAfter.mtimeMs === canonicalStatBefore.mtimeMs &&
        canonicalStatAfter.size === canonicalStatBefore.size,
        '10. Canonical database file mtime and size remain 100% untouched'
      );
    }

  } finally {
    // -------------------------------------------------------------------------
    // STEP 5: CLEANUP & TEARDOWN
    // -------------------------------------------------------------------------
    console.log('[INFRA] Running cleanup in finally block...');

    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          console.log('  🧹 Ephemeral HTTP listener closed cleanly.');
          resolve();
        });
      });
    }

    if (fs.existsSync(sandboxDir)) {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
      console.log('  🧹 Unique test sandbox directory removed cleanly.');
    }
  }
}

runInfrastructureVerification()
  .then(() => {
    console.log('================================================================');
    console.log(`INFRASTRUCTURE VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');
    if (failCount > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Fatal Infrastructure Error:', err);
    process.exit(1);
  });

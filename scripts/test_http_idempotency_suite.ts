/**
 * MASJIDLEDGER PRO v2.6
 * CHECKPOINT 2B.26-G: ISOLATED HTTP IDEMPOTENCY INTEGRATION TEST SUITE
 *
 * Requirements:
 * - Isolated ephemeral HTTP server bound to 127.0.0.1 on port 0.
 * - Disposable sandbox JSON database in os.tmpdir().
 * - Fail-closed preflight protecting canonical data/masjidledger_db.json.
 * - Full suite covering HTTP-01 through HTTP-07.
 * - Zero requests to port 3000 or production server.
 * - Clean teardown of ephemeral server and temporary sandbox directory in finally block.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { AddressInfo } from 'net';

// -----------------------------------------------------------------------------
// STEP 1: PRE-IMPORT ENVIRONMENT SETUP
// -----------------------------------------------------------------------------
const uniqueTestId = `ml_http_suite_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
    throw new Error(`Assertion failed: ${testName}${detail ? ` (${detail})` : ''}`);
  }
}

async function runHttpIntegrationSuite() {
  console.log('================================================================');
  console.log('🔒 MASJIDLEDGER PRO v2.6 — ISOLATED HTTP IDEMPOTENCY INTEGRATION SUITE');
  console.log('================================================================');
  console.log(`[INFRA] Sandbox Directory: ${sandboxDir}`);
  console.log(`[INFRA] Sandbox DB File:   ${sandboxDbFile}`);

  let server: http.Server | null = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 2: DYNAMIC IMPORT
    // -------------------------------------------------------------------------
    console.log('[INFRA] Dynamically importing server.ts, db.ts, and jwt.ts...');
    const { app } = await import('../server.ts');
    const { db } = await import('../src/server/db.ts');
    const { generateAccessToken } = await import('../src/server/auth/jwt.ts');

    // -------------------------------------------------------------------------
    // STEP 3: FAIL-CLOSED SECURITY PREFLIGHT CHECKS
    // -------------------------------------------------------------------------
    console.log('[INFRA] Executing fail-closed security preflight checks...');

    const resolvedDbPath = path.resolve(db.getDbFilePath());

    assert(
      resolvedDbPath === sandboxDbFile,
      'Preflight 1. Resolved DB path matches intended temporary sandbox path',
      `Resolved: ${resolvedDbPath}`
    );

    assert(
      resolvedDbPath !== canonicalDbPath,
      'Preflight 2. Resolved DB path is NOT the canonical database path',
      `Canonical: ${canonicalDbPath}`
    );

    assert(
      resolvedDbPath.startsWith(sandboxDir),
      'Preflight 3. Resolved DB path is strictly contained inside test-owned sandbox directory'
    );

    const isCanonical = resolvedDbPath.toLowerCase() === canonicalDbPath.toLowerCase();
    assert(
      !isCanonical,
      'Preflight 4. Case-insensitive canonical path comparison verifies zero canonical overlap'
    );

    assert(
      db.getDbFilePath() === sandboxDbFile,
      'Preflight 5. DatabaseStore instance getDbFilePath() actively returns sandbox path'
    );

    assert(
      typeof app === 'function' && typeof app.listen === 'function',
      'Preflight 6. Express app is exported as a valid application instance'
    );

    // -------------------------------------------------------------------------
    // STEP 4: EPHEMERAL HTTP LISTENER SETUP (port 0, 127.0.0.1)
    // -------------------------------------------------------------------------
    console.log('[INFRA] Starting ephemeral HTTP listener on 127.0.0.1:0...');

    server = await new Promise<http.Server>((resolve, reject) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });

    const addr = server.address() as AddressInfo;
    const assignedPort = addr.port;

    assert(
      assignedPort > 0 && assignedPort !== 3000,
      'Preflight 7. Ephemeral listener assigned valid random port (not port 3000)',
      `Assigned Port: ${assignedPort}`
    );

    assert(
      addr.address === '127.0.0.1',
      'Preflight 8. Ephemeral listener bound strictly to 127.0.0.1'
    );

    const baseUrl = `http://127.0.0.1:${assignedPort}`;

    // -------------------------------------------------------------------------
    // STEP 5: SEED SYNTHETIC TEST DATA INTO DISPOSABLE DATABASE
    // -------------------------------------------------------------------------
    console.log('[SEED] Seeding isolated synthetic test data into sandbox database...');

    const now = new Date().toISOString();

    // Tenant A (Mosque A)
    const mosqueA = {
      id: 'mosque-synth-a',
      code: 'MSQ-A',
      name: 'Mosque A Synthetic',
      nameBn: 'বায়তুল জান্নাত জামে মসজিদ',
      nameEn: 'Baitul Jannat Jame Mosque',
      address: 'Test Road, Block A',
      country: 'Bangladesh',
      phone: '01700000001',
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    };

    // Tenant B (Mosque B)
    const mosqueB = {
      id: 'mosque-synth-b',
      code: 'MSQ-B',
      name: 'Mosque B Synthetic',
      nameBn: 'বায়তুল ফালাহ জামে মসজিদ',
      nameEn: 'Baitul Falah Jame Mosque',
      address: 'Test Road, Block B',
      country: 'Bangladesh',
      phone: '01700000002',
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    };

    // User A (Mosque Admin for Mosque A)
    const userA = {
      id: 'user-synth-a',
      name: 'Admin A',
      phone: '01700000001',
      mosqueId: mosqueA.id,
      role: 'MOSQUE_ADMIN' as const,
      permissions: ['CREATE_INCOME', 'CREATE_EXPENSE', 'MANAGE_ACCOUNTS', 'VIEW_DASHBOARD'] as any[],
      status: 'ACTIVE' as const,
      passwordHash: '$2a$10$syntheticHashForUserA',
      createdAt: now,
      updatedAt: now,
    };

    // User B (Mosque Admin for Mosque B)
    const userB = {
      id: 'user-synth-b',
      name: 'Admin B',
      phone: '01700000002',
      mosqueId: mosqueB.id,
      role: 'MOSQUE_ADMIN' as const,
      permissions: ['CREATE_INCOME', 'CREATE_EXPENSE', 'MANAGE_ACCOUNTS', 'VIEW_DASHBOARD'] as any[],
      status: 'ACTIVE' as const,
      passwordHash: '$2a$10$syntheticHashForUserB',
      createdAt: now,
      updatedAt: now,
    };

    // Accounts for Tenant A & Tenant B
    const accountA = {
      id: 'acc-synth-a-cash',
      mosqueId: mosqueA.id,
      name: 'Main Cash Account A',
      nameBn: 'সাধারণ তহবিল (ক্যাশ এ)',
      accountType: 'CASH' as const,
      accountNumber: 'CASH-A-01',
      openingBalance: 50000,
      currentBalance: 50000,
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    };

    const accountB = {
      id: 'acc-synth-b-cash',
      mosqueId: mosqueB.id,
      name: 'Main Cash Account B',
      nameBn: 'সাধারণ তহবিল (ক্যাশ বি)',
      accountType: 'CASH' as const,
      accountNumber: 'CASH-B-01',
      openingBalance: 50000,
      currentBalance: 50000,
      status: 'ACTIVE' as const,
      createdAt: now,
      updatedAt: now,
    };

    // Account Heads
    const headIncA = {
      id: 'head-synth-a-inc',
      mosqueId: mosqueA.id,
      code: 'INC-100',
      nameBn: 'সাধারণ দান',
      nameEn: 'General Donation',
      type: 'INCOME' as const,
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const headExpA = {
      id: 'head-synth-a-exp',
      mosqueId: mosqueA.id,
      code: 'EXP-100',
      nameBn: 'বিদ্যুৎ বিল',
      nameEn: 'Electricity Bill',
      type: 'EXPENSE' as const,
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const headIncB = {
      id: 'head-synth-b-inc',
      mosqueId: mosqueB.id,
      code: 'INC-100',
      nameBn: 'সাধারণ দান',
      nameEn: 'General Donation',
      type: 'INCOME' as const,
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const headExpB = {
      id: 'head-synth-b-exp',
      mosqueId: mosqueB.id,
      code: 'EXP-100',
      nameBn: 'বিদ্যুৎ বিল',
      nameEn: 'Electricity Bill',
      type: 'EXPENSE' as const,
      status: 'ACTIVE' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    db.mosques = [mosqueA as any, mosqueB as any];
    db.users = [userA as any, userB as any];
    db.accounts = [accountA as any, accountB as any];
    db.accountHeads = [headIncA as any, headExpA as any, headIncB as any, headExpB as any];
    db.incomeEntries = [];
    db.expenseEntries = [];

    // Atomically persist sandbox initial state to disk
    db.persistStateAtomically();

    // Generate real cryptographically signed JWT access tokens
    const { token: tokenA } = generateAccessToken(userA as any);
    const { token: tokenB } = generateAccessToken(userB as any);

    assert(
      Boolean(tokenA && tokenB),
      'Preflight 9. Successfully generated authentic signed JWT tokens for synthetic test users'
    );

    // -------------------------------------------------------------------------
    // STEP 6: REQUIRED HTTP TEST MATRIX (HTTP-01 to HTTP-07)
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('🧪 RUNNING HTTP IDEMPOTENCY INTEGRATION TESTS');
    console.log('================================================================');

    // -------------------------------------------------------------------------
    // TEST HTTP-01: Same request replay
    // Same authenticated tenant, route, and key; verify no duplicate posting and verify replay response
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-01] Same Request Replay ---');
    {
      const startBalance = accountA.currentBalance;
      const startIncomes = db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length;
      const idempotencyKey = 'key-http-01-replay-test';
      const postAmount = 10000;

      // Request 1: Fresh submission
      const res1 = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: postAmount,
          accountId: accountA.id,
          donorName: 'Musalli A',
          paymentMethod: 'CASH',
        }),
      });

      const body1: any = await res1.json();
      assert(res1.status === 200, 'HTTP-01.1 First submission returns status 200');
      assert(body1.success === true, 'HTTP-01.2 First submission returns success: true');
      assert(Boolean(body1.data?.voucherNumber), 'HTTP-01.3 Voucher generated on first submission', body1.data?.voucherNumber);
      assert(
        accountA.currentBalance === startBalance + postAmount,
        'HTTP-01.4 Account balance updated once after first submission',
        `Expected ${startBalance + postAmount}, got ${accountA.currentBalance}`
      );
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === startIncomes + 1,
        'HTTP-01.5 Income entries count incremented by 1'
      );

      // Request 2: Replay with exact same key
      const res2 = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: postAmount,
          accountId: accountA.id,
          donorName: 'Musalli A',
          paymentMethod: 'CASH',
        }),
      });

      const body2: any = await res2.json();
      assert(res2.status === 200, 'HTTP-01.6 Replay submission returns status 200');
      assert(
        body2.data?.voucherNumber === body1.data?.voucherNumber,
        'HTTP-01.7 Replay returns identical voucherNumber from idempotency cache',
        body2.data?.voucherNumber
      );
      assert(
        body2.data?.id === body1.data?.id,
        'HTTP-01.8 Replay returns identical record ID'
      );
      assert(
        accountA.currentBalance === startBalance + postAmount,
        'HTTP-01.9 Account balance remained strictly unchanged after replay (no double-crediting)'
      );
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === startIncomes + 1,
        'HTTP-01.10 Income entries count remained strictly 1 (no duplicate posting)'
      );
    }

    // -------------------------------------------------------------------------
    // TEST HTTP-02: Forged scoped-key injection
    // Client-supplied key containing another tenant's apparent prefix must not access that tenant's cached response
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-02] Forged Scoped-Key Injection ---');
    {
      // Target: Victim Tenant A has cached entry under key 'key-victim-http-02'
      const victimKey = 'key-victim-http-02';
      const victimAmount = 15000;
      const resVictim = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': victimKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: victimAmount,
          accountId: accountA.id,
          donorName: 'Victim Donor',
        }),
      });
      const bodyVictim: any = await resVictim.json();
      assert(resVictim.status === 200, 'HTTP-02.1 Victim submission succeeded');
      const victimVoucher = bodyVictim.data?.voucherNumber;

      // Attacker: Tenant B crafts a key attempting delimiter injection to match Victim Tenant A's scoped key
      // The attacker provides: mosque-synth-a::POST::%2Fapi%2Fv1%2Faccounting%2Fincome::key-victim-http-02
      const forgedKey = `${mosqueA.id}::POST::%2Fapi%2Fv1%2Faccounting%2Fincome::${victimKey}`;

      const resAttacker = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`, // Authenticated strictly as Tenant B
          'Idempotency-Key': forgedKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncB.id,
          amount: 7000,
          accountId: accountB.id,
          donorName: 'Attacker Attempt',
        }),
      });

      const bodyAttacker: any = await resAttacker.json();
      assert(resAttacker.status === 200, 'HTTP-02.2 Attacker request processed without server crash');
      assert(
        bodyAttacker.data?.voucherNumber !== victimVoucher,
        'HTTP-02.3 Delimiter injection blocked: Attacker did NOT receive victim voucher',
        `Attacker received: ${bodyAttacker.data?.voucherNumber}, Victim had: ${victimVoucher}`
      );
      assert(
        bodyAttacker.data?.mosqueId === mosqueB.id,
        'HTTP-02.4 Attacker posting bound strictly to authenticated tenant (Mosque B)'
      );
      assert(
        bodyAttacker.data?.amount === 7000,
        'HTTP-02.5 Attacker executed fresh posting with own amount (7000) rather than victim cache (15000)'
      );
    }

    // -------------------------------------------------------------------------
    // TEST HTTP-03: Tenant isolation
    // Two authorized test tenants using the same client key must receive independent idempotency behavior
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-03] Cross-Tenant Isolation with Identical Key ---');
    {
      const sharedClientKey = 'shared-client-key-http-03';
      const balanceABefore = accountA.currentBalance;
      const balanceBBefore = accountB.currentBalance;

      // Tenant A request with shared key
      const resA = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': sharedClientKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: 5000,
          accountId: accountA.id,
          donorName: 'Donor for A',
        }),
      });
      const bodyA: any = await resA.json();
      assert(resA.status === 200, 'HTTP-03.1 Tenant A request succeeded with status 200');

      // Tenant B request with identical shared key
      const resB = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`,
          'Idempotency-Key': sharedClientKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncB.id,
          amount: 8000,
          accountId: accountB.id,
          donorName: 'Donor for B',
        }),
      });
      const bodyB: any = await resB.json();
      assert(resB.status === 200, 'HTTP-03.2 Tenant B request succeeded with status 200');

      assert(
        bodyA.data?.voucherNumber !== bodyB.data?.voucherNumber,
        'HTTP-03.3 Different voucher numbers issued for different tenants despite identical client key'
      );
      assert(
        bodyA.data?.amount === 5000 && bodyB.data?.amount === 8000,
        'HTTP-03.4 Each tenant received response corresponding to their own payload'
      );
      assert(
        accountA.currentBalance === balanceABefore + 5000,
        'HTTP-03.5 Account A balance correctly increased by 5000'
      );
      assert(
        accountB.currentBalance === balanceBBefore + 8000,
        'HTTP-03.6 Account B balance correctly increased by 8000'
      );

      // Replay Tenant A
      const replayA = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': sharedClientKey,
        },
        body: JSON.stringify({ mainHeadId: headIncA.id, amount: 5000, accountId: accountA.id }),
      });
      const bodyReplayA: any = await replayA.json();
      assert(
        bodyReplayA.data?.voucherNumber === bodyA.data?.voucherNumber,
        'HTTP-03.7 Tenant A replay strictly returns Tenant A voucher'
      );

      // Replay Tenant B
      const replayB = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`,
          'Idempotency-Key': sharedClientKey,
        },
        body: JSON.stringify({ mainHeadId: headIncB.id, amount: 8000, accountId: accountB.id }),
      });
      const bodyReplayB: any = await replayB.json();
      assert(
        bodyReplayB.data?.voucherNumber === bodyB.data?.voucherNumber,
        'HTTP-03.8 Tenant B replay strictly returns Tenant B voucher'
      );
    }

    // -------------------------------------------------------------------------
    // TEST HTTP-04: Route isolation
    // Same tenant and client key on income and expense routes must not cross-replay
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-04] Cross-Route Isolation with Same Client Key ---');
    {
      const routeKey = 'key-http-04-cross-route';
      const balanceBefore = accountA.currentBalance;

      // 1. Submit Income
      const resInc = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': routeKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: 4000,
          accountId: accountA.id,
          donorName: 'Income Contributor',
        }),
      });
      const bodyInc: any = await resInc.json();
      assert(resInc.status === 200, 'HTTP-04.1 Income request succeeded');
      assert(bodyInc.data?.voucherNumber?.startsWith('INC-'), 'HTTP-04.2 Income voucher created with INC prefix');
      assert(accountA.currentBalance === balanceBefore + 4000, 'HTTP-04.3 Balance increased by 4000');

      // 2. Submit Expense with exact same Idempotency-Key
      const resExp = await fetch(`${baseUrl}/api/v1/accounting/expense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': routeKey,
        },
        body: JSON.stringify({
          mainHeadId: headExpA.id,
          amount: 1500,
          accountId: accountA.id,
          payeeName: 'Electric Supply Authority',
          paymentMethod: 'CASH',
        }),
      });
      const bodyExp: any = await resExp.json();
      assert(resExp.status === 200, 'HTTP-04.4 Expense request succeeded (did NOT return cached income)');
      assert(bodyExp.data?.voucherNumber?.startsWith('EXP-'), 'HTTP-04.5 Expense voucher created with EXP prefix');
      assert(
        bodyExp.data?.voucherNumber !== bodyInc.data?.voucherNumber,
        'HTTP-04.6 Route isolation verified: Income and Expense vouchers are completely distinct'
      );
      assert(
        accountA.currentBalance === balanceBefore + 4000 - 1500,
        'HTTP-04.7 Balance correctly decremented by 1500 after expense execution',
        `Expected ${balanceBefore + 4000 - 1500}, got ${accountA.currentBalance}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST HTTP-05: Financial idempotency
    // Known starting balance; repeat identical income request; verify balance changes exactly once
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-05] Financial Idempotency & Balance Invariant ---');
    {
      const knownStartBalance = accountA.currentBalance;
      const idempotencyKey = 'key-http-05-financial-invariant';
      const amount = 12000;
      const startIncomeCount = db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length;

      // 1st request
      const r1 = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount,
          accountId: accountA.id,
          donorName: 'Generous Donor',
        }),
      });
      const b1: any = await r1.json();
      assert(r1.status === 200, 'HTTP-05.1 Initial request status 200');
      assert(
        accountA.currentBalance === knownStartBalance + amount,
        'HTTP-05.2 Balance incremented exactly once by 12000 after 1st request'
      );
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === startIncomeCount + 1,
        'HTTP-05.3 Exactly 1 income record added after 1st request'
      );

      // 2nd request (replay)
      const r2 = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount,
          accountId: accountA.id,
          donorName: 'Generous Donor',
        }),
      });
      const b2: any = await r2.json();
      assert(r2.status === 200, 'HTTP-05.4 Replay request status 200');
      assert(b2.data?.voucherNumber === b1.data?.voucherNumber, 'HTTP-05.5 Replay returned identical voucher');
      assert(
        accountA.currentBalance === knownStartBalance + amount,
        'HTTP-05.6 Balance invariant holds: Balance did NOT increase on 2nd request'
      );
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === startIncomeCount + 1,
        'HTTP-05.7 Income record count unchanged on 2nd request'
      );

      // 3rd request (subsequent replay)
      const r3 = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount,
          accountId: accountA.id,
          donorName: 'Generous Donor',
        }),
      });
      assert(r3.status === 200, 'HTTP-05.8 3rd request status 200');
      assert(
        accountA.currentBalance === knownStartBalance + amount,
        'HTTP-05.9 Balance invariant holds: Balance strictly preserved on 3rd request'
      );
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === startIncomeCount + 1,
        'HTTP-05.10 Income records count remains strictly 1'
      );
    }

    // -------------------------------------------------------------------------
    // TEST HTTP-06: Authorization and tenant override
    // Missing/invalid authentication rejected; non-superadmin tenant override blocked
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-06] Authorization & Tenant Override Protection ---');
    {
      // 6a: Missing Authorization header
      const resNoAuth = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000 }),
      });
      const bodyNoAuth: any = await resNoAuth.json();
      assert(resNoAuth.status === 401, 'HTTP-06.1 Missing authentication returns status 401');
      assert(bodyNoAuth.error?.code === 'UNAUTHORIZED', 'HTTP-06.2 Error code is UNAUTHORIZED');

      // 6b: Invalid Bearer token
      const resBadToken = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer bad.invalid.token',
        },
        body: JSON.stringify({ amount: 1000 }),
      });
      const bodyBadToken: any = await resBadToken.json();
      assert(resBadToken.status === 401, 'HTTP-06.3 Malformed token returns status 401');
      assert(bodyBadToken.error?.code === 'UNAUTHORIZED', 'HTTP-06.4 Error code is UNAUTHORIZED');

      // 6c: Tenant override attempt: User A (non-superadmin MOSQUE_ADMIN of Mosque A) sends x-mosque-id: mosque-synth-b
      const resForgedMosque = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`, // Authenticated as Mosque A admin
          'x-mosque-id': mosqueB.id,          // Forged cross-tenant header
        },
        body: JSON.stringify({
          mainHeadId: headIncB.id,
          amount: 2000,
          accountId: accountB.id,
        }),
      });
      const bodyForgedMosque: any = await resForgedMosque.json();
      assert(
        resForgedMosque.status === 403,
        'HTTP-06.5 Cross-tenant override attempt by non-superadmin returns status 403',
        `Got status ${resForgedMosque.status}`
      );
      assert(
        bodyForgedMosque.error?.code === 'TENANT_FORBIDDEN',
        'HTTP-06.6 Error code is TENANT_FORBIDDEN'
      );
    }

    // -------------------------------------------------------------------------
    // TEST HTTP-07: Invalid request handling
    // Source-confirmed invalid input rejected; no mutation occurs; subsequent valid request not cached-failed
    // -------------------------------------------------------------------------
    console.log('\n--- [HTTP-07] Invalid Request Handling & Cache Non-Pollution ---');
    {
      const balanceBefore = accountA.currentBalance;
      const invalidKey = 'key-http-07-invalid-input';
      const incomeCountBefore = db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length;

      // 1. Submit invalid input: negative amount
      const resInvalid = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': invalidKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: -500, // Invalid: negative amount disallowed by line 3927 of server.ts
          accountId: accountA.id,
        }),
      });
      const bodyInvalid: any = await resInvalid.json();
      assert(resInvalid.status === 400, 'HTTP-07.1 Invalid amount rejected with HTTP 400');
      assert(bodyInvalid.error?.code === 'INVALID_AMOUNT', 'HTTP-07.2 Error code is INVALID_AMOUNT');
      assert(accountA.currentBalance === balanceBefore, 'HTTP-07.3 Balance remained unchanged after validation failure');
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === incomeCountBefore,
        'HTTP-07.4 No income entry persisted after validation failure'
      );

      // Verify that no poisoned cache was stored for this key
      const scopedKeyCheck = db.buildScopedKey(invalidKey, {
        mosqueId: mosqueA.id,
        method: 'POST',
        route: '/api/v1/accounting/income',
      });
      assert(
        db.checkIdempotency(scopedKeyCheck) === null,
        'HTTP-07.5 Idempotency cache is NOT polluted with failed 400 validation error'
      );

      // 2. Submit subsequent VALID request using the EXACT SAME idempotency key
      const resValid = await fetch(`${baseUrl}/api/v1/accounting/income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`,
          'Idempotency-Key': invalidKey,
        },
        body: JSON.stringify({
          mainHeadId: headIncA.id,
          amount: 2500, // Valid amount
          accountId: accountA.id,
          donorName: 'Retry Donor',
        }),
      });
      const bodyValid: any = await resValid.json();
      assert(
        resValid.status === 200,
        'HTTP-07.6 Subsequent valid request with same key succeeds with status 200 (not cached failure)'
      );
      assert(bodyValid.success === true, 'HTTP-07.7 Response indicates success: true');
      assert(
        bodyValid.data?.amount === 2500,
        'HTTP-07.8 Voucher contains valid amount 2500'
      );
      assert(
        accountA.currentBalance === balanceBefore + 2500,
        'HTTP-07.9 Account balance successfully credited with 2500'
      );
      assert(
        db.incomeEntries.filter(i => i.mosqueId === mosqueA.id).length === incomeCountBefore + 1,
        'HTTP-07.10 Exactly 1 income record saved after valid submission'
      );
    }

    // -------------------------------------------------------------------------
    // STEP 7: POST-TEST CANONICAL DATABASE INTEGRITY VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- [CANONICAL DB INTEGRITY VERIFICATION] ---');
    if (canonicalStatBefore) {
      const canonicalStatAfter = fs.statSync(canonicalDbPath);
      assert(
        canonicalStatAfter.mtimeMs === canonicalStatBefore.mtimeMs &&
        canonicalStatAfter.size === canonicalStatBefore.size,
        'Final Integrity: Canonical database file mtime and size remain 100% untouched',
        `Size: ${canonicalStatAfter.size} bytes`
      );
    }

  } finally {
    // -------------------------------------------------------------------------
    // STEP 8: CLEANUP & TEARDOWN
    // -------------------------------------------------------------------------
    console.log('\n[TEARDOWN] Running cleanup in finally block...');

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

runHttpIntegrationSuite()
  .then(() => {
    console.log('\n================================================================');
    console.log(`HTTP INTEGRATION SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');
    if (failCount > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Fatal HTTP Test Suite Error:', err);
    process.exit(1);
  });

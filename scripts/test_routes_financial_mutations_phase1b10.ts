/**
 * MASJIDLEDGER PRO v2.6 — PHASE 1B.10 VERIFICATION SUITE
 * Task ID: ML-V26-DAL-PHASE1B10-FINANCIAL-MUTATION-ROUTES
 *
 * Verifies the migration of the 5 Core Financial Mutation Express routes to DAL:
 * 1. POST /api/v1/accounting/income
 * 2. POST /api/v1/accounting/income/:id/reverse
 * 3. POST /api/v1/accounting/expense
 * 4. POST /api/v1/accounting/expense/:id/reverse
 * 5. POST /api/v1/accounting/accounts/transfer
 *
 * Runs against an isolated temporary copy of masjidledger_db.json via MASJIDLEDGER_DB_PATH
 * so that the live data/masjidledger_db.json file remains 100% untouched.
 */

process.env.NODE_ENV = 'test';

import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const liveJsonDbPath = path.join(process.cwd(), 'data', 'masjidledger_db.json');
const tempJsonDbPath = path.join(
  os.tmpdir(),
  `masjidledger_test_phase1b10_${process.pid}_${Date.now()}.json`
);
fs.copyFileSync(liveJsonDbPath, tempJsonDbPath);
process.env.MASJIDLEDGER_DB_PATH = tempJsonDbPath;

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${id}: ${name} — ${details}`);
}

function computeFileSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function httpRequest(
  port: number,
  method: 'GET' | 'POST',
  urlPath: string,
  body?: Record<string, any>,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload).toString(),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 0,
              body: raw ? JSON.parse(raw) : null,
            });
          } catch {
            resolve({ status: res.statusCode || 0, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runPhase1B10Verification() {
  console.log('======================================================================');
  console.log('MASJIDLEDGER PRO v2.6 — PHASE 1B.10 FINANCIAL MUTATION ROUTES SUITE');
  console.log('======================================================================');

  const liveShaBefore = computeFileSha256(liveJsonDbPath);

  const { db } = await import('../src/server/db');
  const { generateAccessToken } = await import('../src/server/auth/jwt');
  const {
    JsonIncomeParityRepository,
    JsonExpenseParityRepository,
    JsonTransferParityRepository,
  } = await import('../src/server/db/adapters/JsonStorageAdapter');
  const { app } = await import('../server');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const port = address.port;

  try {
    const mosque1 = db.mosques[0];
    const mosque2 = db.mosques.find((m) => m.id !== mosque1.id) || db.mosques[0];
    const mosque1Admin =
      db.users.find(
        (u) => u.mosqueId === mosque1.id && u.role === 'MOSQUE_ADMIN' && u.status === 'ACTIVE'
      ) ||
      db.users.find(
        (u) => u.role !== 'SUPER_ADMIN' && u.mosqueId === mosque1.id && u.status === 'ACTIVE'
      )!;

    const m1Token = generateAccessToken(mosque1Admin).token;

    // Pick active accounts and heads for mosque1
    const m1Accounts = db.accounts.filter(
      (a) => a.mosqueId === mosque1.id && (a.status === 'ACTIVE' || !a.status)
    );
    const primaryAccount = m1Accounts[0];
    const secondaryAccount = m1Accounts[1];
    const incomeHead = db.accountHeads.find(
      (h) => (h.mosqueId === mosque1.id || !h.mosqueId) && h.type === 'INCOME' && h.isActive !== false
    )!;
    const expenseHead = db.accountHeads.find(
      (h) => (h.mosqueId === mosque1.id || !h.mosqueId) && h.type === 'EXPENSE' && h.isActive !== false
    )!;

    // Seed sufficient positive balance on primaryAccount via an initial income voucher in the temp DB
    const neededLiquidity = Math.max(0, -primaryAccount.currentBalance) + 25000;
    await httpRequest(
      port,
      'POST',
      '/api/v1/accounting/income',
      {
        date: '2026-04-14',
        amount: neededLiquidity,
        mainHeadId: incomeHead.id,
        accountId: primaryAccount.id,
        donorName: 'Initial Liquidity Funding',
        paymentMethod: 'CASH',
        description: 'Base liquidity for Phase 1B.10 verification',
      },
      { Authorization: `Bearer ${m1Token}` }
    );

    // -------------------------------------------------------------------------
    // 1. POST /api/v1/accounting/income (DAL Create + Balance Credit + Idempotency)
    // -------------------------------------------------------------------------
    let incCreateSpyCalls = 0;
    const origIncCreate = JsonIncomeParityRepository.prototype.create;
    JsonIncomeParityRepository.prototype.create = async function (...args) {
      incCreateSpyCalls++;
      return origIncCreate.apply(this, args);
    };

    let createdIncomeId = '';
    try {
      const balBefore = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const idemKey = `idem-inc-p1b10-${Date.now()}`;
      const incomePayload = {
        date: '2026-04-15',
        amount: 2500,
        mainHeadId: incomeHead.id,
        accountId: primaryAccount.id,
        donorName: 'Phase 1B.10 Verification Donor',
        paymentMethod: 'CASH',
        description: 'Friday Jumuah Box Collection Test',
      };

      const resCreate = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/income',
        incomePayload,
        {
          Authorization: `Bearer ${m1Token}`,
          'Idempotency-Key': idemKey,
        }
      );

      const balAfterCreate = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;

      // Replay with same Idempotency-Key -> should return identical voucher without double-crediting
      const resReplay = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/income',
        incomePayload,
        {
          Authorization: `Bearer ${m1Token}`,
          'Idempotency-Key': idemKey,
        }
      );
      const balAfterReplay = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;

      createdIncomeId = resCreate.body?.data?.id || '';
      const passedIncomeCreate =
        resCreate.status === 200 &&
        resCreate.body?.success === true &&
        Boolean(createdIncomeId) &&
        resCreate.body?.data?.amount === 2500 &&
        resCreate.body?.data?.status === 'APPROVED' &&
        balAfterCreate === balBefore + 2500 &&
        resReplay.status === 200 &&
        resReplay.body?.data?.id === createdIncomeId &&
        balAfterReplay === balAfterCreate &&
        incCreateSpyCalls === 1;

      record(
        'P1B10-01',
        'POST /api/v1/accounting/income (DAL Create, Balance Credit & Idempotent Replay)',
        passedIncomeCreate,
        `Status=${resCreate.status}, Voucher=${resCreate.body?.data?.voucherNumber}, Bal=${balBefore}->${balAfterCreate}->${balAfterReplay}, SpyCalls=${incCreateSpyCalls}`
      );
    } finally {
      JsonIncomeParityRepository.prototype.create = origIncCreate;
    }

    // -------------------------------------------------------------------------
    // 2. POST /api/v1/accounting/income/:id/reverse (DAL Reverse + Balance Debit + Duplicate Guard)
    // -------------------------------------------------------------------------
    let incRevSpyCalls = 0;
    const origIncRev = JsonIncomeParityRepository.prototype.reverse;
    JsonIncomeParityRepository.prototype.reverse = async function (...args) {
      incRevSpyCalls++;
      return origIncRev.apply(this, args);
    };

    try {
      const balBeforeRev = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const resRev = await httpRequest(
        port,
        'POST',
        `/api/v1/accounting/income/${createdIncomeId}/reverse`,
        { reason: 'Verification test reversal of income voucher' },
        { Authorization: `Bearer ${m1Token}` }
      );
      const balAfterRev = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;

      // Second reversal must fail with 400 ALREADY_CANCELLED
      const resDupRev = await httpRequest(
        port,
        'POST',
        `/api/v1/accounting/income/${createdIncomeId}/reverse`,
        { reason: 'Duplicate reversal attempt' },
        { Authorization: `Bearer ${m1Token}` }
      );

      const passedIncRev =
        resRev.status === 200 &&
        resRev.body?.success === true &&
        resRev.body?.data?.status === 'CANCELLED' &&
        balAfterRev === balBeforeRev - 2500 &&
        resDupRev.status === 400 &&
        resDupRev.body?.error?.code === 'ALREADY_CANCELLED' &&
        incRevSpyCalls === 2;

      record(
        'P1B10-02',
        'POST /api/v1/accounting/income/:id/reverse (DAL Reverse, Balance Debit & Duplicate Guard)',
        passedIncRev,
        `RevStatus=${resRev.status}, DupStatus=${resDupRev.status} (${resDupRev.body?.error?.code}), Bal=${balBeforeRev}->${balAfterRev}, SpyCalls=${incRevSpyCalls}`
      );
    } finally {
      JsonIncomeParityRepository.prototype.reverse = origIncRev;
    }

    // -------------------------------------------------------------------------
    // 3. POST /api/v1/accounting/expense (DAL Create + Balance Debit + Idempotency + Overdraft Guard)
    // -------------------------------------------------------------------------
    let expCreateSpyCalls = 0;
    const origExpCreate = JsonExpenseParityRepository.prototype.create;
    JsonExpenseParityRepository.prototype.create = async function (...args) {
      expCreateSpyCalls++;
      return origExpCreate.apply(this, args);
    };

    let createdExpenseId = '';
    try {
      const balBefore = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const idemKey = `idem-exp-p1b10-${Date.now()}`;
      const expensePayload = {
        date: '2026-04-15',
        amount: 1200,
        mainHeadId: expenseHead.id,
        accountId: primaryAccount.id,
        payeeName: 'DESCO Electric Bill',
        paymentMethod: 'CASH',
        description: 'Monthly utility bill test',
      };

      const resExp = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/expense',
        expensePayload,
        {
          Authorization: `Bearer ${m1Token}`,
          'Idempotency-Key': idemKey,
        }
      );
      const balAfterExp = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;

      // Replay with same Idempotency-Key
      const resExpReplay = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/expense',
        expensePayload,
        {
          Authorization: `Bearer ${m1Token}`,
          'Idempotency-Key': idemKey,
        }
      );
      const balAfterReplay = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;

      // Attempt overdraft
      const resOverdraft = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/expense',
        {
          ...expensePayload,
          amount: balAfterReplay + 500000,
        },
        {
          Authorization: `Bearer ${m1Token}`,
        }
      );

      createdExpenseId = resExp.body?.data?.id || '';
      const passedExpenseCreate =
        resExp.status === 200 &&
        resExp.body?.success === true &&
        Boolean(createdExpenseId) &&
        resExp.body?.data?.amount === 1200 &&
        resExp.body?.data?.status === 'APPROVED' &&
        balAfterExp === balBefore - 1200 &&
        resExpReplay.status === 200 &&
        resExpReplay.body?.data?.id === createdExpenseId &&
        balAfterReplay === balAfterExp &&
        resOverdraft.status === 400 &&
        resOverdraft.body?.error?.code === 'INSUFFICIENT_BALANCE' &&
        expCreateSpyCalls === 1;

      record(
        'P1B10-03',
        'POST /api/v1/accounting/expense (DAL Create, Balance Debit, Idempotent Replay & Overdraft Guard)',
        passedExpenseCreate,
        `Status=${resExp.status}, OverdraftStatus=${resOverdraft.status} (${resOverdraft.body?.error?.code}), Bal=${balBefore}->${balAfterExp}->${balAfterReplay}, SpyCalls=${expCreateSpyCalls}`
      );
    } finally {
      JsonExpenseParityRepository.prototype.create = origExpCreate;
    }

    // -------------------------------------------------------------------------
    // 4. POST /api/v1/accounting/expense/:id/reverse (DAL Reverse + Balance Restore + isReversal)
    // -------------------------------------------------------------------------
    let expRevSpyCalls = 0;
    const origExpRev = JsonExpenseParityRepository.prototype.reverse;
    JsonExpenseParityRepository.prototype.reverse = async function (...args) {
      expRevSpyCalls++;
      return origExpRev.apply(this, args);
    };

    try {
      const balBeforeRev = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const resExpRev = await httpRequest(
        port,
        'POST',
        `/api/v1/accounting/expense/${createdExpenseId}/reverse`,
        { reason: 'Verification test reversal of expense voucher' },
        { Authorization: `Bearer ${m1Token}` }
      );
      const balAfterRev = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;

      // Second reversal must fail with 400 ALREADY_CANCELLED
      const resDupExpRev = await httpRequest(
        port,
        'POST',
        `/api/v1/accounting/expense/${createdExpenseId}/reverse`,
        { reason: 'Duplicate expense reversal attempt' },
        { Authorization: `Bearer ${m1Token}` }
      );

      const passedExpRev =
        resExpRev.status === 200 &&
        resExpRev.body?.success === true &&
        resExpRev.body?.data?.status === 'CANCELLED' &&
        resExpRev.body?.data?.isReversal === true &&
        balAfterRev === balBeforeRev + 1200 &&
        resDupExpRev.status === 400 &&
        resDupExpRev.body?.error?.code === 'ALREADY_CANCELLED' &&
        expRevSpyCalls === 2;

      record(
        'P1B10-04',
        'POST /api/v1/accounting/expense/:id/reverse (DAL Reverse, Balance Restore & Duplicate Guard)',
        passedExpRev,
        `RevStatus=${resExpRev.status}, isReversal=${resExpRev.body?.data?.isReversal}, DupStatus=${resDupExpRev.status}, Bal=${balBeforeRev}->${balAfterRev}, SpyCalls=${expRevSpyCalls}`
      );
    } finally {
      JsonExpenseParityRepository.prototype.reverse = origExpRev;
    }

    // -------------------------------------------------------------------------
    // 5. POST /api/v1/accounting/accounts/transfer (DAL Atomic Transfer + Idempotency + Guards)
    // -------------------------------------------------------------------------
    let trfCreateSpyCalls = 0;
    const origTrfCreate = JsonTransferParityRepository.prototype.create;
    JsonTransferParityRepository.prototype.create = async function (...args) {
      trfCreateSpyCalls++;
      return origTrfCreate.apply(this, args);
    };

    try {
      const fromBefore = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const toBefore = db.accounts.find((a) => a.id === secondaryAccount.id)!.currentBalance;
      const idemKey = `idem-trf-p1b10-${Date.now()}`;
      const transferPayload = {
        fromAccountId: primaryAccount.id,
        toAccountId: secondaryAccount.id,
        amount: 1500,
        date: '2026-04-15',
        description: 'Cash to Bank deposit verification',
      };

      const resTrf = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/accounts/transfer',
        transferPayload,
        {
          Authorization: `Bearer ${m1Token}`,
          'Idempotency-Key': idemKey,
        }
      );

      const fromAfter = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const toAfter = db.accounts.find((a) => a.id === secondaryAccount.id)!.currentBalance;

      // Replay with same Idempotency-Key
      const resTrfReplay = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/accounts/transfer',
        transferPayload,
        {
          Authorization: `Bearer ${m1Token}`,
          'Idempotency-Key': idemKey,
        }
      );
      const fromAfterReplay = db.accounts.find((a) => a.id === primaryAccount.id)!.currentBalance;
      const toAfterReplay = db.accounts.find((a) => a.id === secondaryAccount.id)!.currentBalance;

      // Same-account guard
      const resSameAcc = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/accounts/transfer',
        {
          fromAccountId: primaryAccount.id,
          toAccountId: primaryAccount.id,
          amount: 500,
          date: '2026-04-15',
        },
        { Authorization: `Bearer ${m1Token}` }
      );

      const passedTransfer =
        resTrf.status === 200 &&
        resTrf.body?.success === true &&
        fromAfter === fromBefore - 1500 &&
        toAfter === toBefore + 1500 &&
        resTrfReplay.status === 200 &&
        resTrfReplay.body?.data?.id === resTrf.body?.data?.id &&
        fromAfterReplay === fromAfter &&
        toAfterReplay === toAfter &&
        resSameAcc.status === 400 &&
        resSameAcc.body?.error?.code === 'SAME_ACCOUNT' &&
        trfCreateSpyCalls === 2;

      record(
        'P1B10-05',
        'POST /api/v1/accounting/accounts/transfer (DAL Atomic Transfer, Idempotent Replay & Validation)',
        passedTransfer,
        `Status=${resTrf.status}, From=${fromBefore}->${fromAfter}, To=${toBefore}->${toAfter}, SameAccStatus=${resSameAcc.status}, SpyCalls=${trfCreateSpyCalls}`
      );
    } finally {
      JsonTransferParityRepository.prototype.create = origTrfCreate;
    }

    // -------------------------------------------------------------------------
    // 6. Cross-Tenant Isolation on Financial Mutation Routes
    // -------------------------------------------------------------------------
    const crossTenantMutation = await httpRequest(
      port,
      'POST',
      '/api/v1/accounting/income',
      {
        date: '2026-04-15',
        amount: 500,
        mainHeadId: incomeHead.id,
        accountId: primaryAccount.id,
        donorName: 'Cross Tenant Test',
      },
      {
        Authorization: `Bearer ${m1Token}`,
        'x-mosque-id': mosque2.id,
      }
    );

    const m2Income = db.incomeEntries.find((i) => i.mosqueId === mosque2.id);
    const crossTenantReverse = m2Income
      ? await httpRequest(
          port,
          'POST',
          `/api/v1/accounting/income/${m2Income.id}/reverse`,
          { reason: 'Attempt cross-tenant reversal' },
          { Authorization: `Bearer ${m1Token}` }
        )
      : { status: 404, body: { error: { code: 'NOT_FOUND' } } };

    const passedCrossTenant =
      crossTenantMutation.status === 403 &&
      crossTenantMutation.body?.success === false &&
      crossTenantReverse.status === 404 &&
      crossTenantReverse.body?.error?.code === 'NOT_FOUND';

    record(
      'P1B10-06',
      'Cross-Tenant Isolation on Financial Mutation Routes (403 Header Override & 404 Foreign Voucher)',
      passedCrossTenant,
      `HeaderOverrideStatus=${crossTenantMutation.status}, ForeignVoucherReverseStatus=${crossTenantReverse.status}`
    );

    // -------------------------------------------------------------------------
    // 7. Live data/masjidledger_db.json Integrity Unchanged
    // -------------------------------------------------------------------------
    const liveShaAfter = computeFileSha256(liveJsonDbPath);
    record(
      'P1B10-07',
      'Live data/masjidledger_db.json File Integrity 100% Unchanged',
      liveShaBefore === liveShaAfter,
      `SHA256 before=${liveShaBefore.slice(0, 16)}... after=${liveShaAfter.slice(0, 16)}...`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (fs.existsSync(tempJsonDbPath)) {
      fs.unlinkSync(tempJsonDbPath);
    }
  }

  console.log('----------------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TOTAL: ${passedCount}/${results.length} CHECKS PASSED`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runPhase1B10Verification().catch((err) => {
  if (fs.existsSync(tempJsonDbPath)) {
    fs.unlinkSync(tempJsonDbPath);
  }
  console.error('Phase 1B.10 verification failed with unexpected error:', err);
  process.exit(1);
});

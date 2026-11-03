/**
 * MASJIDLEDGER PRO v2.6 — PHASE 1B.9 VERIFICATION SUITE
 * Task ID: ML-V26-DAL-PHASE1B9-READONLY-FINANCIAL-ROUTES
 *
 * Verifies the migration of the 8 Core Read-Only Financial & Ledger Express routes to DAL:
 * 1. GET /api/v1/accounting/account-heads
 * 2. GET /api/v1/accounting/accounts
 * 3. GET /api/v1/accounting/accounts/:id
 * 4. GET /api/v1/accounting/accounts/transfers
 * 5. GET /api/v1/accounting/income
 * 6. GET /api/v1/accounting/income/:id
 * 7. GET /api/v1/accounting/expense
 * 8. GET /api/v1/accounting/expense/:id
 */

process.env.NODE_ENV = 'test';

import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../src/server/db';
import { generateAccessToken } from '../src/server/auth/jwt';
import { createDataAccessLayer } from '../src/server/db/adapters/dalFactory';
import {
  JsonStorageAdapter,
  JsonAccountHeadReadOnlyRepository,
  JsonFinancialAccountReadOnlyRepository,
  JsonIncomeParityRepository,
  JsonExpenseParityRepository,
  JsonTransferParityRepository,
} from '../src/server/db/adapters/JsonStorageAdapter';

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

function httpGet(
  port: number,
  urlPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: 'GET',
        headers: {
          Accept: 'application/json',
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
    req.end();
  });
}

async function runPhase1B9Verification() {
  console.log('===================================================================');
  console.log('MASJIDLEDGER PRO v2.6 — PHASE 1B.9 READ-ONLY FINANCIAL ROUTES SUITE');
  console.log('===================================================================');

  const jsonDbPath = path.join(process.cwd(), 'data', 'masjidledger_db.json');
  const shaBefore = computeFileSha256(jsonDbPath);

  const { app } = await import('../server');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const port = address.port;

  try {
    // 1. Verify IReadOnlyDataAccessLayer & JsonStorageAdapter surface for accountHeads & financialAccounts
    const defaultAdapter = createDataAccessLayer({
      dalOptions: {
        mosqueId: 'mosque-01',
        userContext: {
          userId: 'usr-admin-01',
          userRole: 'MOSQUE_ADMIN',
          userMosqueId: 'mosque-01',
          permissions: [],
        },
      },
    });
    const isJsonDefault =
      defaultAdapter instanceof JsonStorageAdapter &&
      typeof defaultAdapter.accountHeads?.list === 'function' &&
      typeof defaultAdapter.accountHeads?.findById === 'function' &&
      typeof defaultAdapter.financialAccounts?.list === 'function' &&
      typeof defaultAdapter.financialAccounts?.findById === 'function' &&
      !('rawRepositories' in defaultAdapter) &&
      typeof (defaultAdapter.financialAccounts as any).updateBalance === 'undefined';

    record(
      'P1B9-01',
      'Read-Only DAL Contract & JsonStorageAdapter Surface',
      isJsonDefault,
      `JsonStorageAdapter exposes scoped accountHeads & financialAccounts without rawRepositories or direct updateBalance`
    );

    // Prepare tokens
    const mosque1 = db.mosques[0];
    const mosque2 = db.mosques.find((m) => m.id !== mosque1.id) || db.mosques[0];
    const mosque1Admin =
      db.users.find(
        (u) => u.mosqueId === mosque1.id && u.role === 'MOSQUE_ADMIN' && u.status === 'ACTIVE'
      ) ||
      db.users.find((u) => u.role !== 'SUPER_ADMIN' && u.mosqueId === mosque1.id && u.status === 'ACTIVE')!;
    const superAdmin = db.users.find((u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE')!;

    const m1Token = generateAccessToken(mosque1Admin).token;
    const superToken = generateAccessToken(superAdmin).token;

    // 2. GET /api/v1/accounting/account-heads (with DAL spy)
    let headsListSpyCalled = 0;
    const origHeadsList = JsonAccountHeadReadOnlyRepository.prototype.list;
    JsonAccountHeadReadOnlyRepository.prototype.list = async function (...args) {
      headsListSpyCalled++;
      return origHeadsList.apply(this, args);
    };
    try {
      const resHeads = await httpGet(port, '/api/v1/accounting/account-heads?type=INCOME&activeOnly=true', {
        Authorization: `Bearer ${m1Token}`,
      });
      const validHeads =
        resHeads.status === 200 &&
        resHeads.body?.success === true &&
        Array.isArray(resHeads.body?.data) &&
        resHeads.body.data.length > 0 &&
        resHeads.body.data.every(
          (h: any) =>
            h.mosqueId === mosque1.id &&
            h.type === 'INCOME' &&
            h.isActive === true &&
            typeof h.usageCount === 'number' &&
            typeof h.incomeUsageCount === 'number' &&
            typeof h.expenseUsageCount === 'number'
        ) &&
        headsListSpyCalled === 1;

      record(
        'P1B9-02',
        'GET /api/v1/accounting/account-heads (DAL + Usage Enrichment)',
        validHeads,
        `Status=${resHeads.status}, Count=${resHeads.body?.data?.length}, SpyCalls=${headsListSpyCalled}`
      );
    } finally {
      JsonAccountHeadReadOnlyRepository.prototype.list = origHeadsList;
    }

    // 3. GET /api/v1/accounting/accounts (with DAL spy)
    let accListSpyCalled = 0;
    const origAccList = JsonFinancialAccountReadOnlyRepository.prototype.list;
    JsonFinancialAccountReadOnlyRepository.prototype.list = async function (...args) {
      accListSpyCalled++;
      return origAccList.apply(this, args);
    };
    let sampleAccountId = '';
    try {
      const resAcc = await httpGet(port, '/api/v1/accounting/accounts', {
        Authorization: `Bearer ${m1Token}`,
      });
      const expectedCount = db.accounts.filter((a) => a.mosqueId === mosque1.id).length;
      sampleAccountId = resAcc.body?.data?.[0]?.id || '';
      const validAcc =
        resAcc.status === 200 &&
        resAcc.body?.success === true &&
        Array.isArray(resAcc.body?.data) &&
        resAcc.body.data.length === expectedCount &&
        resAcc.body.data.every((a: any) => a.mosqueId === mosque1.id) &&
        accListSpyCalled === 1;

      record(
        'P1B9-03',
        'GET /api/v1/accounting/accounts (DAL List)',
        validAcc,
        `Status=${resAcc.status}, Count=${resAcc.body?.data?.length}/${expectedCount}, SpyCalls=${accListSpyCalled}`
      );
    } finally {
      JsonFinancialAccountReadOnlyRepository.prototype.list = origAccList;
    }

    // 4. GET /api/v1/accounting/accounts/:id (200 Found + 404 Not Found + DAL spy)
    let accFindSpyCalled = 0;
    const origAccFind = JsonFinancialAccountReadOnlyRepository.prototype.findById;
    JsonFinancialAccountReadOnlyRepository.prototype.findById = async function (...args) {
      accFindSpyCalled++;
      return origAccFind.apply(this, args);
    };
    try {
      const resFound = await httpGet(port, `/api/v1/accounting/accounts/${sampleAccountId}`, {
        Authorization: `Bearer ${m1Token}`,
      });
      const resNotFound = await httpGet(port, `/api/v1/accounting/accounts/acc-nonexistent-999`, {
        Authorization: `Bearer ${m1Token}`,
      });
      const validAccById =
        resFound.status === 200 &&
        resFound.body?.success === true &&
        resFound.body?.data?.id === sampleAccountId &&
        resNotFound.status === 404 &&
        resNotFound.body?.error?.code === 'NOT_FOUND' &&
        accFindSpyCalled === 2;

      record(
        'P1B9-04',
        'GET /api/v1/accounting/accounts/:id (200 Found & 404 Not Found via DAL)',
        validAccById,
        `FoundStatus=${resFound.status}, NotFoundStatus=${resNotFound.status}, SpyCalls=${accFindSpyCalled}`
      );
    } finally {
      JsonFinancialAccountReadOnlyRepository.prototype.findById = origAccFind;
    }

    // 5. GET /api/v1/accounting/accounts/transfers (Not shadowed by :id, uses DAL transfers.list)
    let trfListSpyCalled = 0;
    const origTrfList = JsonTransferParityRepository.prototype.list;
    JsonTransferParityRepository.prototype.list = async function (...args) {
      trfListSpyCalled++;
      return origTrfList.apply(this, args);
    };
    try {
      const resTrf = await httpGet(port, '/api/v1/accounting/accounts/transfers', {
        Authorization: `Bearer ${m1Token}`,
      });
      const expectedTrfCount = db.transfers.filter((t) => t.mosqueId === mosque1.id).length;
      const validTrf =
        resTrf.status === 200 &&
        resTrf.body?.success === true &&
        Array.isArray(resTrf.body?.data) &&
        resTrf.body.data.length === expectedTrfCount &&
        trfListSpyCalled === 1;

      record(
        'P1B9-05',
        'GET /api/v1/accounting/accounts/transfers (Unshadowed & DAL-Backed)',
        validTrf,
        `Status=${resTrf.status}, Count=${resTrf.body?.data?.length}/${expectedTrfCount}, SpyCalls=${trfListSpyCalled}`
      );
    } finally {
      JsonTransferParityRepository.prototype.list = origTrfList;
    }

    // 6. GET /api/v1/accounting/income & GET /api/v1/accounting/income/:id
    let incListSpyCalled = 0;
    let incFindSpyCalled = 0;
    const origIncList = JsonIncomeParityRepository.prototype.list;
    const origIncFind = JsonIncomeParityRepository.prototype.findById;
    JsonIncomeParityRepository.prototype.list = async function (...args) {
      incListSpyCalled++;
      return origIncList.apply(this, args);
    };
    JsonIncomeParityRepository.prototype.findById = async function (...args) {
      incFindSpyCalled++;
      return origIncFind.apply(this, args);
    };
    try {
      const resIncList = await httpGet(port, '/api/v1/accounting/income', {
        Authorization: `Bearer ${m1Token}`,
      });
      const expectedIncCount = db.incomeEntries.filter((i) => i.mosqueId === mosque1.id).length;
      const sampleIncId = resIncList.body?.data?.[0]?.id;

      const resIncFound = await httpGet(port, `/api/v1/accounting/income/${sampleIncId}`, {
        Authorization: `Bearer ${m1Token}`,
      });
      const resIncMissing = await httpGet(port, '/api/v1/accounting/income/inc-missing-999', {
        Authorization: `Bearer ${m1Token}`,
      });

      const validInc =
        resIncList.status === 200 &&
        resIncList.body?.data?.length === expectedIncCount &&
        resIncFound.status === 200 &&
        resIncFound.body?.data?.id === sampleIncId &&
        resIncMissing.status === 404 &&
        incListSpyCalled === 1 &&
        incFindSpyCalled === 2;

      record(
        'P1B9-06',
        'GET /api/v1/accounting/income & /income/:id (DAL List & FindById)',
        validInc,
        `ListStatus=${resIncList.status} (${resIncList.body?.data?.length}), FoundStatus=${resIncFound.status}, MissingStatus=${resIncMissing.status}`
      );
    } finally {
      JsonIncomeParityRepository.prototype.list = origIncList;
      JsonIncomeParityRepository.prototype.findById = origIncFind;
    }

    // 7. GET /api/v1/accounting/expense & GET /api/v1/accounting/expense/:id
    let expListSpyCalled = 0;
    let expFindSpyCalled = 0;
    const origExpList = JsonExpenseParityRepository.prototype.list;
    const origExpFind = JsonExpenseParityRepository.prototype.findById;
    JsonExpenseParityRepository.prototype.list = async function (...args) {
      expListSpyCalled++;
      return origExpList.apply(this, args);
    };
    JsonExpenseParityRepository.prototype.findById = async function (...args) {
      expFindSpyCalled++;
      return origExpFind.apply(this, args);
    };
    try {
      const resExpList = await httpGet(port, '/api/v1/accounting/expense', {
        Authorization: `Bearer ${m1Token}`,
      });
      const expectedExpCount = db.expenseEntries.filter((e) => e.mosqueId === mosque1.id).length;
      const sampleExpId = resExpList.body?.data?.[0]?.id;

      const resExpFound = await httpGet(port, `/api/v1/accounting/expense/${sampleExpId}`, {
        Authorization: `Bearer ${m1Token}`,
      });
      const resExpMissing = await httpGet(port, '/api/v1/accounting/expense/exp-missing-999', {
        Authorization: `Bearer ${m1Token}`,
      });

      const validExp =
        resExpList.status === 200 &&
        resExpList.body?.data?.length === expectedExpCount &&
        resExpFound.status === 200 &&
        resExpFound.body?.data?.id === sampleExpId &&
        resExpMissing.status === 404 &&
        expListSpyCalled === 1 &&
        expFindSpyCalled === 2;

      record(
        'P1B9-07',
        'GET /api/v1/accounting/expense & /expense/:id (DAL List & FindById)',
        validExp,
        `ListStatus=${resExpList.status} (${resExpList.body?.data?.length}), FoundStatus=${resExpFound.status}, MissingStatus=${resExpMissing.status}`
      );
    } finally {
      JsonExpenseParityRepository.prototype.list = origExpList;
      JsonExpenseParityRepository.prototype.findById = origExpFind;
    }

    // 8. Cross-Tenant Isolation on Migrated Financial Routes
    const crossTenantRes = await httpGet(port, '/api/v1/accounting/accounts', {
      Authorization: `Bearer ${m1Token}`,
      'x-mosque-id': mosque2.id,
    });
    record(
      'P1B9-08',
      'Cross-Tenant Isolation on Financial Routes (403 Forbidden)',
      crossTenantRes.status === 403 && crossTenantRes.body?.success === false,
      `Status=${crossTenantRes.status}, Code=${crossTenantRes.body?.error?.code}`
    );

    // 9. SUPER_ADMIN Tenant Switching on Migrated Financial Routes
    const superSwitchRes = await httpGet(port, '/api/v1/accounting/accounts', {
      Authorization: `Bearer ${superToken}`,
      'x-mosque-id': mosque2.id,
    });
    const validSuperSwitch =
      superSwitchRes.status === 200 &&
      superSwitchRes.body?.success === true &&
      Array.isArray(superSwitchRes.body?.data) &&
      superSwitchRes.body.data.every((a: any) => a.mosqueId === mosque2.id);

    record(
      'P1B9-09',
      'SUPER_ADMIN Multi-Tenant Context Switch on Financial Routes',
      validSuperSwitch,
      `Status=${superSwitchRes.status}, Mosque2Accounts=${superSwitchRes.body?.data?.length}`
    );

    // 10. Active JSON Database File Integrity (Zero Unintended Writes)
    const shaAfter = computeFileSha256(jsonDbPath);
    record(
      'P1B9-10',
      'Active JSON Database File Integrity Unchanged',
      shaBefore === shaAfter,
      `SHA256 before=${shaBefore.slice(0, 16)}... after=${shaAfter.slice(0, 16)}...`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('-------------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TOTAL: ${passedCount}/${results.length} CHECKS PASSED`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runPhase1B9Verification().catch((err) => {
  console.error('Phase 1B.9 verification failed with unexpected error:', err);
  process.exit(1);
});

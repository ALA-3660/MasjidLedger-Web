process.env.NODE_ENV = 'test';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

// 1. Copy production JSON DB to an isolated temp file BEFORE importing server.ts
const prodDbPath = path.resolve(process.cwd(), 'data', 'masjidledger_db.json');
const prodBeforeSha = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-phase1b11-'));
const tempDbPath = path.join(tempDir, 'masjidledger_db.json');
fs.copyFileSync(prodDbPath, tempDbPath);
process.env.MASJIDLEDGER_DB_PATH = tempDbPath;

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];
function record(id: string, name: string, passed: boolean, detail: string) {
  results.push({ id, name, passed, detail });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${id}] ${name} — ${detail}`);
}

function httpRequest(
  port: number,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  reqPath: string,
  body?: Record<string, any>,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode || 0, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('===================================================================');
  console.log('MASJIDLEDGER PRO — PHASE 1B.11: COMPLETE ACCOUNTING DAL MIGRATION');
  console.log('===================================================================');

  const { db } = await import('../src/server/db');
  const { generateAccessToken } = await import('../src/server/auth/jwt');
  const {
    JsonAccountHeadParityRepository,
    JsonExpenseParityRepository,
    JsonFinancialAccountParityRepository,
    JsonIncomeParityRepository,
    JsonStorageAdapter,
  } = await import('../src/server/db/adapters/JsonStorageAdapter');
  const { createDataAccessLayer } = await import('../src/server/db/adapters/dalFactory');
  const { app } = await import('../server');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const port = address.port;

  try {
    // 1. Verify DAL Factory & Scoped Mutation Surface for Phase 1B.11
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
    const surfaceValid =
      defaultAdapter instanceof JsonStorageAdapter &&
      typeof defaultAdapter.accountHeads?.create === 'function' &&
      typeof defaultAdapter.accountHeads?.update === 'function' &&
      typeof defaultAdapter.accountHeads?.deleteOrArchive === 'function' &&
      typeof defaultAdapter.financialAccounts?.create === 'function' &&
      typeof defaultAdapter.financialAccounts?.update === 'function' &&
      typeof defaultAdapter.financialAccounts?.setOpeningBalance === 'function' &&
      typeof defaultAdapter.income?.update === 'function' &&
      typeof defaultAdapter.income?.updateDenomination === 'function' &&
      typeof defaultAdapter.expense?.update === 'function' &&
      !('rawRepositories' in defaultAdapter) &&
      typeof (defaultAdapter.financialAccounts as any).updateBalance === 'undefined';

    record(
      'P1B11-01',
      'Scoped Mutation DAL Surface & Safety Contract',
      surfaceValid,
      'JsonStorageAdapter exposes all 9 Phase 1B.11 accounting methods without rawRepositories or direct updateBalance'
    );

    const mosque1 = db.mosques[0];
    const mosque2 = db.mosques.find((m) => m.id !== mosque1.id) || db.mosques[0];
    const mosque1Admin =
      db.users.find(
        (u) => u.mosqueId === mosque1.id && u.role === 'MOSQUE_ADMIN' && u.status === 'ACTIVE'
      ) ||
      db.users.find((u) => u.role !== 'SUPER_ADMIN' && u.mosqueId === mosque1.id && u.status === 'ACTIVE')!;
    const m1Token = generateAccessToken(mosque1Admin).token;

    // 2. POST /api/v1/accounting/account-heads (Create Main Head + Sub-Head + Max Depth = 2 check)
    let headCreateSpy = 0;
    const origHeadCreate = JsonAccountHeadParityRepository.prototype.create;
    JsonAccountHeadParityRepository.prototype.create = async function (...args) {
      headCreateSpy++;
      return origHeadCreate.apply(this, args);
    };

    let createdMainHeadId = '';
    let createdSubHeadId = '';
    try {
      const resMain = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/account-heads',
        {
          nameBn: 'ফেজ ১বি.১১ টেস্ট প্রধান আয় খাত',
          nameEn: 'Phase 1B.11 Main Income Head',
          type: 'INCOME',
          description: 'DAL test main head',
        },
        { Authorization: `Bearer ${m1Token}` }
      );
      createdMainHeadId = resMain.body?.data?.id;

      const resSub = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/account-heads',
        {
          nameBn: 'ফেজ ১বি.১১ টেস্ট উপ-আয় খাত',
          nameEn: 'Phase 1B.11 Sub Income Head',
          type: 'INCOME',
          parentId: createdMainHeadId,
        },
        { Authorization: `Bearer ${m1Token}` }
      );
      createdSubHeadId = resSub.body?.data?.id;

      // Attempt depth 3 (should fail with 400 MAX_DEPTH_EXCEEDED)
      const resDepth3 = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/account-heads',
        {
          nameBn: 'স্তর ৩ অবৈধ খাত',
          type: 'INCOME',
          parentId: createdSubHeadId,
        },
        { Authorization: `Bearer ${m1Token}` }
      );

      const ok =
        resMain.status === 201 &&
        resMain.body?.success === true &&
        /^INC-\d+$/.test(resMain.body?.data?.code) &&
        resSub.status === 201 &&
        resSub.body?.data?.parentId === createdMainHeadId &&
        resDepth3.status === 400 &&
        resDepth3.body?.error?.code === 'MAX_DEPTH_EXCEEDED' &&
        headCreateSpy === 3;

      record(
        'P1B11-02',
        'POST /api/v1/accounting/account-heads (Main + Sub-Head + Max Depth=2)',
        ok,
        `main=${resMain.body?.data?.code}, sub=${resSub.body?.data?.code}, depth3=${resDepth3.body?.error?.code}, spy=${headCreateSpy}`
      );
    } finally {
      JsonAccountHeadParityRepository.prototype.create = origHeadCreate;
    }

    // 3. PUT /api/v1/accounting/account-heads/:id (Update Name & Status Cascade)
    let headUpdateSpy = 0;
    const origHeadUpdate = JsonAccountHeadParityRepository.prototype.update;
    JsonAccountHeadParityRepository.prototype.update = async function (...args) {
      headUpdateSpy++;
      return origHeadUpdate.apply(this, args);
    };
    try {
      const resUpdate = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/account-heads/${createdSubHeadId}`,
        {
          nameBn: 'ফেজ ১বি.১১ আপডেটেড উপ-খাত',
          description: 'Updated via DAL',
        },
        { Authorization: `Bearer ${m1Token}` }
      );
      const ok =
        resUpdate.status === 200 &&
        resUpdate.body?.success === true &&
        resUpdate.body?.data?.nameBn === 'ফেজ ১বি.১১ আপডেটেড উপ-খাত' &&
        headUpdateSpy === 1;

      record(
        'P1B11-03',
        'PUT /api/v1/accounting/account-heads/:id (Update Account Head via DAL)',
        ok,
        `status=${resUpdate.status}, nameBn=${resUpdate.body?.data?.nameBn}, spy=${headUpdateSpy}`
      );
    } finally {
      JsonAccountHeadParityRepository.prototype.update = origHeadUpdate;
    }

    // 4. DELETE /api/v1/accounting/account-heads/:id (Block parent with children, Delete unused, Archive used)
    let headDeleteSpy = 0;
    const origHeadDelete = JsonAccountHeadParityRepository.prototype.deleteOrArchive;
    JsonAccountHeadParityRepository.prototype.deleteOrArchive = async function (...args) {
      headDeleteSpy++;
      return origHeadDelete.apply(this, args);
    };
    try {
      // 4a. Deleting main head while child sub-head exists -> 400 CHILD_HEADS_EXIST
      const resChildBlock = await httpRequest(
        port,
        'DELETE',
        `/api/v1/accounting/account-heads/${createdMainHeadId}`,
        undefined,
        { Authorization: `Bearer ${m1Token}` }
      );

      // 4b. Deleting unused sub-head -> 200 DELETED
      const resDeleteSub = await httpRequest(
        port,
        'DELETE',
        `/api/v1/accounting/account-heads/${createdSubHeadId}`,
        undefined,
        { Authorization: `Bearer ${m1Token}` }
      );

      // 4c. Deleting a head that has existing income/expense usage -> 200 ARCHIVED
      const usedIncomeEntry = db.incomeEntries.find((i) => i.mosqueId === mosque1.id)!;
      const usedHeadId = usedIncomeEntry.subHeadId || usedIncomeEntry.mainHeadId;
      const resArchiveUsed = await httpRequest(
        port,
        'DELETE',
        `/api/v1/accounting/account-heads/${usedHeadId}`,
        undefined,
        { Authorization: `Bearer ${m1Token}` }
      );

      const ok =
        resChildBlock.status === 400 &&
        resChildBlock.body?.error?.code === 'CHILD_HEADS_EXIST' &&
        resDeleteSub.status === 200 &&
        resDeleteSub.body?.success === true &&
        !resDeleteSub.body?.data &&
        resArchiveUsed.status === 200 &&
        resArchiveUsed.body?.data?.status === 'ARCHIVED' &&
        resArchiveUsed.body?.data?.isActive === false &&
        headDeleteSpy === 3;

      record(
        'P1B11-04',
        'DELETE /api/v1/accounting/account-heads/:id (Child Block + Unused Delete + Used Archive)',
        ok,
        `childBlock=${resChildBlock.body?.error?.code}, deleteUnused=${resDeleteSub.status}, archiveUsed=${resArchiveUsed.body?.data?.status}, spy=${headDeleteSpy}`
      );
    } finally {
      JsonAccountHeadParityRepository.prototype.deleteOrArchive = origHeadDelete;
    }

    // 5. POST /api/v1/accounting/accounts (Create Financial Account via DAL)
    let accCreateSpy = 0;
    const origAccCreate = JsonFinancialAccountParityRepository.prototype.create;
    JsonFinancialAccountParityRepository.prototype.create = async function (...args) {
      accCreateSpy++;
      return origAccCreate.apply(this, args);
    };
    let createdAccountId = '';
    try {
      const resCreateAcc = await httpRequest(
        port,
        'POST',
        '/api/v1/accounting/accounts',
        {
          nameBn: 'ফেজ ১বি.১১ টেস্ট ব্যাংক ফান্ড',
          accountType: 'BANK',
          bankName: 'ইসলামী ব্যাংক বাংলাদেশ',
          branchName: 'মতিঝিল শাখা',
          accountNumber: '205011100999',
          openingBalance: 10000,
          openingBalanceType: 'DEBIT',
        },
        { Authorization: `Bearer ${m1Token}` }
      );
      createdAccountId = resCreateAcc.body?.data?.id;
      const ok =
        resCreateAcc.status === 200 &&
        resCreateAcc.body?.success === true &&
        resCreateAcc.body?.data?.openingBalance === 10000 &&
        resCreateAcc.body?.data?.currentBalance === 10000 &&
        accCreateSpy === 1;

      record(
        'P1B11-05',
        'POST /api/v1/accounting/accounts (Create Financial Account via DAL)',
        ok,
        `accId=${createdAccountId}, currentBalance=${resCreateAcc.body?.data?.currentBalance}, spy=${accCreateSpy}`
      );
    } finally {
      JsonFinancialAccountParityRepository.prototype.create = origAccCreate;
    }

    // 6. PUT /api/v1/accounting/accounts/:id (Update Account & Recalculate Balance via DAL)
    let accUpdateSpy = 0;
    const origAccUpdate = JsonFinancialAccountParityRepository.prototype.update;
    JsonFinancialAccountParityRepository.prototype.update = async function (...args) {
      accUpdateSpy++;
      return origAccUpdate.apply(this, args);
    };
    try {
      const resUpdateAcc = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/accounts/${createdAccountId}`,
        {
          nameBn: 'ফেজ ১বি.১১ আপডেটেড ব্যাংক ফান্ড',
          openingBalance: 15000,
          openingBalanceType: 'DEBIT',
        },
        { Authorization: `Bearer ${m1Token}` }
      );
      const ok =
        resUpdateAcc.status === 200 &&
        resUpdateAcc.body?.success === true &&
        resUpdateAcc.body?.data?.nameBn === 'ফেজ ১বি.১১ আপডেটেড ব্যাংক ফান্ড' &&
        resUpdateAcc.body?.data?.openingBalance === 15000 &&
        resUpdateAcc.body?.data?.currentBalance === 15000 &&
        accUpdateSpy === 1;

      record(
        'P1B11-06',
        'PUT /api/v1/accounting/accounts/:id (Update Account & Balance Recalculation)',
        ok,
        `opening=${resUpdateAcc.body?.data?.openingBalance}, current=${resUpdateAcc.body?.data?.currentBalance}, spy=${accUpdateSpy}`
      );
    } finally {
      JsonFinancialAccountParityRepository.prototype.update = origAccUpdate;
    }

    // 7. POST /api/v1/accounting/accounts/:id/opening-balance (Set Opening Balance + Idempotency)
    let setObSpy = 0;
    const origSetOb = JsonFinancialAccountParityRepository.prototype.setOpeningBalance;
    JsonFinancialAccountParityRepository.prototype.setOpeningBalance = async function (...args) {
      setObSpy++;
      return origSetOb.apply(this, args);
    };
    try {
      const idemKey = `idem-ob-${Date.now()}`;
      const resOb1 = await httpRequest(
        port,
        'POST',
        `/api/v1/accounting/accounts/${createdAccountId}/opening-balance`,
        {
          openingBalance: 25000,
          openingBalanceType: 'DEBIT',
          openingBalanceSource: 'AUDIT_ADJUSTMENT',
          openingBalanceNote: 'Phase 1B.11 Opening Balance Test',
        },
        { Authorization: `Bearer ${m1Token}`, 'x-idempotency-key': idemKey }
      );
      const resOb2 = await httpRequest(
        port,
        'POST',
        `/api/v1/accounting/accounts/${createdAccountId}/opening-balance`,
        {
          openingBalance: 99999,
          openingBalanceType: 'DEBIT',
        },
        { Authorization: `Bearer ${m1Token}`, 'x-idempotency-key': idemKey }
      );

      const ok =
        resOb1.status === 200 &&
        resOb1.body?.data?.currentBalance === 25000 &&
        resOb2.status === 200 &&
        resOb2.body?.data?.currentBalance === 25000 &&
        setObSpy === 1;

      record(
        'P1B11-07',
        'POST /api/v1/accounting/accounts/:id/opening-balance (DAL + Idempotency)',
        ok,
        `currentBalance=${resOb1.body?.data?.currentBalance}, idempotentReplayBalance=${resOb2.body?.data?.currentBalance}, spy=${setObSpy}`
      );
    } finally {
      JsonFinancialAccountParityRepository.prototype.setOpeningBalance = origSetOb;
    }

    // 8. PUT /api/v1/accounting/income/:id & PUT /api/v1/accounting/income/:id/denomination
    // Create an income voucher on createdAccountId (+5000 -> 30000), then update it to +8000 (-> 33000)
    const resNewInc = await httpRequest(
      port,
      'POST',
      '/api/v1/accounting/income',
      {
        mainHeadId: createdMainHeadId,
        amount: 5000,
        paymentMethod: 'BANK',
        accountId: createdAccountId,
        donorName: 'হাজী আব্দুল করিম',
        description: 'Initial income for update test',
      },
      { Authorization: `Bearer ${m1Token}` }
    );
    const incomeId = resNewInc.body?.data?.id;

    let incUpdateSpy = 0;
    let incDenomSpy = 0;
    const origIncUpdate = JsonIncomeParityRepository.prototype.update;
    const origIncDenom = JsonIncomeParityRepository.prototype.updateDenomination;
    JsonIncomeParityRepository.prototype.update = async function (...args) {
      incUpdateSpy++;
      return origIncUpdate.apply(this, args);
    };
    JsonIncomeParityRepository.prototype.updateDenomination = async function (...args) {
      incDenomSpy++;
      return origIncDenom.apply(this, args);
    };

    try {
      const idemIncUpd = `idem-inc-upd-${Date.now()}`;
      const resUpdInc = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/income/${incomeId}`,
        {
          amount: 8000,
          donorName: 'হাজী আব্দুল করিম (হালনাগাদকৃত)',
        },
        { Authorization: `Bearer ${m1Token}`, 'x-idempotency-key': idemIncUpd }
      );
      const resUpdIncReplay = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/income/${incomeId}`,
        {
          amount: 99000,
        },
        { Authorization: `Bearer ${m1Token}`, 'x-idempotency-key': idemIncUpd }
      );

      const resDenom = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/income/${incomeId}/denomination`,
        {
          denominationData: {
            notes: { '1000': 8 },
            coins: {},
            notesTotal: 8000,
            coinsTotal: 0,
            grandTotal: 8000,
          },
          editReason: 'নোট গণনা সমন্বয়',
        },
        { Authorization: `Bearer ${m1Token}` }
      );

      const accAfterInc = db.accounts.find((a) => a.id === createdAccountId)!;
      const ok =
        resUpdInc.status === 200 &&
        resUpdInc.body?.data?.amount === 8000 &&
        resUpdIncReplay.body?.data?.amount === 8000 &&
        accAfterInc.currentBalance === 33000 &&
        resDenom.status === 200 &&
        resDenom.body?.data?.denominationData?.grandTotal === 8000 &&
        incUpdateSpy === 1 &&
        incDenomSpy === 1;

      record(
        'P1B11-08',
        'PUT /api/v1/accounting/income/:id & /:id/denomination (Balance Recalc + Idempotency + Denom)',
        ok,
        `amount=${resUpdInc.body?.data?.amount}, accBalance=${accAfterInc.currentBalance}, denomTotal=${resDenom.body?.data?.denominationData?.grandTotal}, spies=${incUpdateSpy}/${incDenomSpy}`
      );
    } finally {
      JsonIncomeParityRepository.prototype.update = origIncUpdate;
      JsonIncomeParityRepository.prototype.updateDenomination = origIncDenom;
    }

    // 9. PUT /api/v1/accounting/expense/:id (Update Expense & Recalculate Account Balance)
    const expHead = db.accountHeads.find((h) => h.mosqueId === mosque1.id && h.type === 'EXPENSE' && !h.parentId)!;
    const resNewExp = await httpRequest(
      port,
      'POST',
      '/api/v1/accounting/expense',
      {
        mainHeadId: expHead.id,
        amount: 3000,
        paymentMethod: 'BANK',
        accountId: createdAccountId,
        payeeName: 'ডেসকো বিদ্যুৎ বিল',
        description: 'Initial expense for update test',
      },
      { Authorization: `Bearer ${m1Token}` }
    );
    const expenseId = resNewExp.body?.data?.id; // balance: 33000 - 3000 = 30000

    let expUpdateSpy = 0;
    const origExpUpdate = JsonExpenseParityRepository.prototype.update;
    JsonExpenseParityRepository.prototype.update = async function (...args) {
      expUpdateSpy++;
      return origExpUpdate.apply(this, args);
    };
    try {
      const idemExpUpd = `idem-exp-upd-${Date.now()}`;
      const resUpdExp = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/expense/${expenseId}`,
        {
          amount: 4500,
          payeeName: 'ডেসকো বিদ্যুৎ বিল (হালনাগাদ)',
        },
        { Authorization: `Bearer ${m1Token}`, 'x-idempotency-key': idemExpUpd }
      );
      const resUpdExpReplay = await httpRequest(
        port,
        'PUT',
        `/api/v1/accounting/expense/${expenseId}`,
        {
          amount: 10000,
        },
        { Authorization: `Bearer ${m1Token}`, 'x-idempotency-key': idemExpUpd }
      );

      const accAfterExp = db.accounts.find((a) => a.id === createdAccountId)!;
      const ok =
        resUpdExp.status === 200 &&
        resUpdExp.body?.data?.amount === 4500 &&
        resUpdExpReplay.body?.data?.amount === 4500 &&
        accAfterExp.currentBalance === 28500 &&
        expUpdateSpy === 1;

      record(
        'P1B11-09',
        'PUT /api/v1/accounting/expense/:id (Balance Recalc + Idempotency via DAL)',
        ok,
        `amount=${resUpdExp.body?.data?.amount}, accBalance=${accAfterExp.currentBalance}, spy=${expUpdateSpy}`
      );
    } finally {
      JsonExpenseParityRepository.prototype.update = origExpUpdate;
    }

    // 10. Cross-Tenant Isolation Checks on Phase 1B.11 Routes
    const resCrossTenant = await httpRequest(
      port,
      'PUT',
      `/api/v1/accounting/accounts/${createdAccountId}`,
      { nameBn: 'Cross Tenant Hack' },
      { Authorization: `Bearer ${m1Token}`, 'x-mosque-id': mosque2.id }
    );
    record(
      'P1B11-10',
      'Cross-Tenant Isolation on Phase 1B.11 Mutation Routes',
      resCrossTenant.status === 403,
      `Cross-tenant header returned HTTP ${resCrossTenant.status}`
    );

    // 11. Verify Production JSON Database Integrity
    const prodAfterSha = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
    record(
      'P1B11-11',
      'Production JSON Database Untouched (SHA-256 Checksum Match)',
      prodBeforeSha === prodAfterSha,
      `SHA-256=${prodAfterSha.slice(0, 16)}...`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('-------------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TOTAL: ${passedCount}/${results.length} PASSED`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in Phase 1B.11 tests:', err);
  process.exit(1);
});

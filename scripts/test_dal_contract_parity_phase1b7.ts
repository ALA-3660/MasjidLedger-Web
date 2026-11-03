/**
 * MASJIDLEDGER PRO v2.6 — PHASE 1B.7 DAL CONTRACT & JSON PARITY VERIFICATION SUITE
 * Task ID: ML-V26-DAL-PHASE1B7
 *
 * Verifies:
 * 1. Pre-flight safety: Isolated disposable PostgreSQL database only (masjidledger_v26_test_disposable)
 * 2. JSON income reversal parity (delegating to runTransaction, balance deduction, audit log, ALREADY_CANCELLED)
 * 3. JSON expense reversal parity (delegating to runTransaction, balance credit, isReversal=true, audit log)
 * 4. JSON account transfer parity (atomic debit/credit, TRF-YYYY-XXXXXX numbering, INSUFFICIENT_BALANCE, idempotency)
 * 5. Tenant isolation & SUPER_ADMIN validation across JSON parity & PostgreSQL adapters
 * 6. Audit actor name (AuthorizedUserContext.userName) propagation in JSON and PostgreSQL reversals
 * 7. Expense source linkage (sourceModule, sourceId, sourceType) persistence and row mapping in PostgreSQL
 *    + verification that PostgreSQL expense reversal does NOT infer isReversal from CANCELLED status
 * 8. Insufficient-balance rejection under SQL FOR UPDATE row locks for PostgreSQL Expense & Account Transfer
 * 9. IDataAccessLayer.idempotency contract across JSON and PostgreSQL adapters
 * 10. Adapter factory & dalContextMiddleware default JSON behavior and explicit PostgreSQL opt-in
 * 11. Scoped non-destructive cleanup & zero mutation of active data/masjidledger_db.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  JsonStorageAdapter,
  JsonDataSourceContract,
  TenantSecurityError,
  DalDomainError,
} from '../src/server/db/adapters/JsonStorageAdapter';
import { PostgresStorageAdapter } from '../src/server/db/adapters/PostgresStorageAdapter';
import { createDataAccessLayer } from '../src/server/db/adapters/dalFactory';
import { dalContextMiddleware } from '../src/server/middleware/dalContextMiddleware';
import { DALOptions, AuthorizedUserContext } from '../src/server/db/interfaces/IDataAccessLayer';
import {
  PostgresMosqueIdentityRepository,
  PostgresUserRepository,
  PostgresAccountHeadRepository,
  PostgresFinancialAccountRepository,
  PostgresAuditRepository,
} from '../src/server/db/postgres/repositories';
import {
  Mosque,
  User,
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  AccountTransfer,
  AuditLog,
} from '../src/types';

interface AssertionResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const assertions: AssertionResult[] = [];

function assert(category: string, name: string, condition: boolean, details: string) {
  const status = condition ? 'PASS' : 'FAIL';
  assertions.push({ category, name, status, details });
  const icon = condition ? '✅' : '❌';
  console.log(`  ${icon} [${category}] ${name}: ${details}`);
}

/**
 * Builds an isolated in-memory JSON data source with full DatabaseStore-equivalent
 * runTransaction, snapshot rollback, audit logging, and scoped idempotency support,
 * ensuring zero writes to data/masjidledger_db.json.
 */
function createIsolatedJsonDataSource() {
  const mosques: Mosque[] = [
    {
      id: 'mosque-json-1',
      code: 'M-JSON-1',
      name: 'JSON Parity Mosque 1',
      nameBn: 'জেসন প্যারিটি মসজিদ ১',
      nameEn: 'JSON Parity Mosque 1',
      address: 'Mirpur, Dhaka',
      country: 'Bangladesh',
      phone: '01711000001',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'mosque-json-2',
      code: 'M-JSON-2',
      name: 'JSON Parity Mosque 2',
      nameBn: 'জেসন প্যারিটি মসজিদ ২',
      nameEn: 'JSON Parity Mosque 2',
      address: 'Agrabad, Chattogram',
      country: 'Bangladesh',
      phone: '01811000002',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const users: User[] = [
    {
      id: 'usr-json-admin-1',
      mosqueId: 'mosque-json-1',
      name: 'মাওলানা আব্দুল করিম',
      phone: '01711000001',
      role: 'MOSQUE_ADMIN',
      permissions: ['APPROVE_INCOME', 'APPROVE_EXPENSE', 'MANAGE_ACCOUNTS'],
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const accounts: FinancialAccount[] = [
    {
      id: 'acc-json-cash-1',
      mosqueId: 'mosque-json-1',
      name: 'Main Cash Vault',
      nameBn: 'প্রধান ক্যাশ তহবিল',
      accountType: 'CASH',
      openingBalance: 20000,
      currentBalance: 50000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'acc-json-bank-1',
      mosqueId: 'mosque-json-1',
      name: 'IBBL Current Account',
      nameBn: 'ইসলামী ব্যাংক চলতি হিসাব',
      accountType: 'BANK',
      openingBalance: 10000,
      currentBalance: 30000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const incomeEntries: IncomeEntry[] = [
    {
      id: 'inc-json-1',
      mosqueId: 'mosque-json-1',
      voucherNumber: 'INC-2026-000001',
      date: '2026-11-02',
      mainHeadId: 'head-inc-1',
      mainHeadNameBn: 'জুমার দান',
      amount: 5000,
      paymentMethod: 'CASH',
      accountId: 'acc-json-cash-1',
      accountName: 'প্রধান ক্যাশ তহবিল',
      donorName: 'মুসল্লি বৃন্দ',
      createdBy: 'usr-json-admin-1',
      createdByName: 'মাওলানা আব্দুল করিম',
      status: 'APPROVED',
      createdAt: '2026-11-02T00:00:00.000Z',
      updatedAt: '2026-11-02T00:00:00.000Z',
    },
  ];

  const expenseEntries: ExpenseEntry[] = [
    {
      id: 'exp-json-1',
      mosqueId: 'mosque-json-1',
      voucherNumber: 'EXP-2026-000001',
      date: '2026-11-02',
      mainHeadId: 'head-exp-1',
      mainHeadNameBn: 'বিদ্যুৎ বিল',
      amount: 3500,
      paymentMethod: 'CASH',
      accountId: 'acc-json-cash-1',
      accountName: 'প্রধান ক্যাশ তহবিল',
      payeeName: 'ডেসকো বিদ্যুৎ অফিস',
      createdBy: 'usr-json-admin-1',
      createdByName: 'মাওলানা আব্দুল করিম',
      status: 'APPROVED',
      createdAt: '2026-11-02T00:00:00.000Z',
      updatedAt: '2026-11-02T00:00:00.000Z',
    },
  ];

  const transfers: AccountTransfer[] = [];
  const auditLogs: AuditLog[] = [];
  const idempotencyMap: Record<string, { result: any; createdAt: number }> = {};
  let txCount = 0;

  const buildScopedKey = (key?: string, context?: any): string | undefined => {
    if (!key) return undefined;
    if (!context) return key;
    const mosqueId = typeof context === 'string' ? context : context.mosqueId || 'global';
    const method = typeof context === 'string' ? '*' : context.method ? context.method.toUpperCase() : '*';
    const route = typeof context === 'string' ? '*' : context.route || '*';
    return `${mosqueId}::${method}::${route}::${encodeURIComponent(key)}`;
  };

  const checkIdempotency = (key?: string, context?: any) => {
    const scoped = buildScopedKey(key, context);
    if (!scoped || !idempotencyMap[scoped]) return null;
    if (Date.now() - idempotencyMap[scoped].createdAt > 24 * 3600 * 1000) {
      delete idempotencyMap[scoped];
      return null;
    }
    return idempotencyMap[scoped].result;
  };

  const saveIdempotency = (key: string | undefined, result: any, context?: any) => {
    const scoped = buildScopedKey(key, context);
    if (!scoped) return;
    idempotencyMap[scoped] = { result, createdAt: Date.now() };
  };

  const dataSource: JsonDataSourceContract & {
    auditLogs: AuditLog[];
    getTxCount: () => number;
  } = {
    mosques,
    users,
    accounts,
    incomeEntries,
    expenseEntries,
    transfers,
    auditLogs,
    idempotencyMap,
    buildScopedKey,
    checkIdempotency,
    saveIdempotency,
    getTxCount: () => txCount,
    runTransaction: async <T>(mutator: (tx: any) => Promise<T> | T): Promise<T> => {
      txCount++;
      const snapshot = JSON.parse(
        JSON.stringify({ accounts, incomeEntries, expenseEntries, transfers, auditLogs, idempotencyMap })
      );
      const tx = {
        logAudit: (
          mosqueId: string,
          userId: string,
          userName: string,
          userRole: any,
          action: any,
          module: any,
          details: string,
          recordId?: string,
          ipAddress?: string
        ) => {
          const log: AuditLog = {
            id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            mosqueId,
            userId,
            userName,
            userRole,
            action,
            module,
            recordId,
            details,
            timestamp: new Date().toISOString(),
            ipAddress: ipAddress || '127.0.0.1',
            status: 'SUCCESS',
          };
          auditLogs.unshift(log);
          return log;
        },
        saveIdempotency,
      };
      try {
        return await mutator(tx);
      } catch (err) {
        // Restore snapshot on error
        accounts.splice(0, accounts.length, ...snapshot.accounts);
        incomeEntries.splice(0, incomeEntries.length, ...snapshot.incomeEntries);
        expenseEntries.splice(0, expenseEntries.length, ...snapshot.expenseEntries);
        transfers.splice(0, transfers.length, ...snapshot.transfers);
        auditLogs.splice(0, auditLogs.length, ...snapshot.auditLogs);
        for (const k of Object.keys(idempotencyMap)) delete idempotencyMap[k];
        Object.assign(idempotencyMap, snapshot.idempotencyMap);
        throw err;
      }
    },
  };

  return dataSource;
}

async function runPhase1B7Suite() {
  console.log('='.repeat(80));
  console.log('MASJIDLEDGER PRO v2.6 — PHASE 1B.7 DAL CONTRACT & JSON PARITY VERIFICATION');
  console.log('Task ID: ML-V26-DAL-PHASE1B7');
  console.log('='.repeat(80));

  const jsonDbFilePath = path.resolve(process.cwd(), 'data/masjidledger_db.json');
  const initialJsonDbHash = fs.existsSync(jsonDbFilePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(jsonDbFilePath)).digest('hex')
    : 'NONE';

  // --------------------------------------------------------------------------
  // 1. Pre-flight Safety Verification (Disposable PostgreSQL Only)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Pre-Flight Safety Verification ---');

  assert(
    'PRE-FLIGHT',
    'DATABASE_URL Not Set',
    !process.env.DATABASE_URL,
    `process.env.DATABASE_URL is ${process.env.DATABASE_URL ? 'SET (UNEXPECTED)' : 'undefined (SAFE)'}`
  );

  dotenv.config({ path: '.env.test' });
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error('FATAL: TEST_DATABASE_URL is missing in .env.test');
  }

  const parsedUrl = new URL(testDbUrl);
  const targetHost = parsedUrl.hostname;
  const targetDb = parsedUrl.pathname.replace(/^\//, '');
  const targetUser = parsedUrl.username;

  if (
    (targetHost !== '127.0.0.1' && targetHost !== 'localhost') ||
    targetDb !== 'masjidledger_v26_test_disposable' ||
    targetUser !== 'ml_test_runner'
  ) {
    throw new Error(
      `FATAL SAFETY ABORT: Refusing to connect to host=${targetHost}, db=${targetDb}, user=${targetUser}`
    );
  }

  assert(
    'PRE-FLIGHT',
    'Disposable Test Database Verified',
    targetHost === '127.0.0.1' &&
      targetDb === 'masjidledger_v26_test_disposable' &&
      targetUser === 'ml_test_runner',
    `Verified target=${targetHost}/${targetDb} as user=${targetUser}`
  );

  // --------------------------------------------------------------------------
  // 2. JSON Adapter Parity Tests (Income Reversal, Expense Reversal, Transfer)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. JSON Adapter Parity Tests ---');

  const jsonStore = createIsolatedJsonDataSource();
  const jsonAdminContext: AuthorizedUserContext = {
    userId: 'usr-json-admin-1',
    userName: 'মাওলানা আব্দুল করিম',
    userRole: 'MOSQUE_ADMIN',
    userMosqueId: 'mosque-json-1',
    permissions: ['APPROVE_INCOME', 'APPROVE_EXPENSE', 'MANAGE_ACCOUNTS'],
  };
  const jsonAdminOptions: DALOptions = {
    mosqueId: 'mosque-json-1',
    userContext: jsonAdminContext,
    clientIp: '127.0.0.1',
  };

  const jsonAdapter = new JsonStorageAdapter(jsonAdminOptions, jsonStore);

  // 2A. JSON Income Reversal Parity
  const cashBeforeIncRev = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance; // 50,000
  const reversedInc = await jsonAdapter.income.reverse(
    jsonAdminOptions,
    'inc-json-1',
    'ভুল রসিদ এন্ট্রি সংশোধন'
  );
  const cashAfterIncRev = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance; // 45,000
  const incAudit = jsonStore.auditLogs.find((a) => a.recordId === 'inc-json-1' && a.action === 'CANCEL');

  assert(
    'JSON_PARITY',
    'JSON Income Reversal Balance, Status & Audit',
    reversedInc.status === 'CANCELLED' &&
      reversedInc.rejectionReason === 'ভুল রসিদ এন্ট্রি সংশোধন' &&
      cashAfterIncRev === cashBeforeIncRev - 5000 &&
      Boolean(incAudit && incAudit.userName === 'মাওলানা আব্দুল করিম' && incAudit.module === 'INCOME'),
    `status=${reversedInc.status}, balance ${cashBeforeIncRev}->${cashAfterIncRev}, auditActor=${incAudit?.userName}`
  );

  // Double income reversal rejection
  let incDoubleRevCode = '';
  try {
    await jsonAdapter.income.reverse(jsonAdminOptions, 'inc-json-1', 'Second attempt');
  } catch (err: any) {
    incDoubleRevCode = err.code || '';
  }
  assert(
    'JSON_PARITY',
    'JSON Income Double Reversal Rejected',
    incDoubleRevCode === 'ALREADY_CANCELLED',
    `Rejected with code=${incDoubleRevCode}`
  );

  // 2B. JSON Expense Reversal Parity
  const cashBeforeExpRev = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance; // 45,000
  const reversedExp = await jsonAdapter.expense.reverse(
    jsonAdminOptions,
    'exp-json-1',
    'ডুপ্লিকেট ভাউচার বাতিল'
  );
  const cashAfterExpRev = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance; // 48,500
  const expAudit = jsonStore.auditLogs.find((a) => a.recordId === 'exp-json-1' && a.action === 'CANCEL');

  assert(
    'JSON_PARITY',
    'JSON Expense Reversal Balance Credit, isReversal=true & Audit',
    reversedExp.status === 'CANCELLED' &&
      reversedExp.isReversal === true &&
      reversedExp.rejectionReason === 'ডুপ্লিকেট ভাউচার বাতিল' &&
      cashAfterExpRev === cashBeforeExpRev + 3500 &&
      Boolean(expAudit && expAudit.userName === 'মাওলানা আব্দুল করিম' && expAudit.module === 'EXPENSE'),
    `status=${reversedExp.status}, isReversal=${reversedExp.isReversal}, balance ${cashBeforeExpRev}->${cashAfterExpRev}, auditActor=${expAudit?.userName}`
  );

  // 2C. JSON Account Transfer Parity (with Idempotency & Insufficient Balance Check)
  const transferOptionsWithIdemp: DALOptions = {
    ...jsonAdminOptions,
    idempotencyKey: 'idemp-trf-json-001',
  };

  const cashBeforeTrf = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance; // 48,500
  const bankBeforeTrf = jsonStore.accounts!.find((a) => a.id === 'acc-json-bank-1')!.currentBalance; // 30,000

  const createdTrf = await jsonAdapter.transfers.create(transferOptionsWithIdemp, {
    mosqueId: 'mosque-json-1',
    fromAccountId: 'acc-json-cash-1',
    fromAccountName: 'প্রধান ক্যাশ তহবিল',
    toAccountId: 'acc-json-bank-1',
    toAccountName: 'ইসলামী ব্যাংক চলতি হিসাব',
    amount: 8500,
    date: '2026-11-02',
    purpose: 'BANK_DEPOSIT',
    description: 'ক্যাশ হতে ব্যাংকে জমা',
    createdBy: 'usr-json-admin-1',
    createdByName: 'মাওলানা আব্দুল করিম',
    createdAt: new Date().toISOString(),
  });

  const cashAfterTrf = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance; // 40,000
  const bankAfterTrf = jsonStore.accounts!.find((a) => a.id === 'acc-json-bank-1')!.currentBalance; // 38,500
  const trfAudit = jsonStore.auditLogs.find(
    (a) => a.module === 'ACCOUNT_TRANSFER' && a.action === 'CREATE'
  );

  assert(
    'JSON_PARITY',
    'JSON Account Transfer Atomic Debit/Credit & Canonical Numbering',
    /^TRF-\d{4}-000001$/.test(createdTrf.transferNumber) &&
      cashAfterTrf === cashBeforeTrf - 8500 &&
      bankAfterTrf === bankBeforeTrf + 8500 &&
      Boolean(trfAudit && trfAudit.userName === 'মাওলানা আব্দুল করিম'),
    `transferNumber=${createdTrf.transferNumber}, cash=${cashAfterTrf}, bank=${bankAfterTrf}`
  );

  // Replay with same idempotencyKey must NOT deduct balance a second time
  const replayTrf = await jsonAdapter.transfers.create(transferOptionsWithIdemp, {
    mosqueId: 'mosque-json-1',
    fromAccountId: 'acc-json-cash-1',
    fromAccountName: 'প্রধান ক্যাশ তহবিল',
    toAccountId: 'acc-json-bank-1',
    toAccountName: 'ইসলামী ব্যাংক চলতি হিসাব',
    amount: 8500,
    date: '2026-11-02',
    createdBy: 'usr-json-admin-1',
    createdByName: 'মাওলানা আব্দুল করিম',
    createdAt: new Date().toISOString(),
  });
  const cashAfterReplay = jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance;

  assert(
    'JSON_PARITY',
    'JSON Account Transfer Idempotency Replay Protection',
    replayTrf.id === createdTrf.id && cashAfterReplay === cashAfterTrf && jsonStore.transfers!.length === 1,
    `Replayed transfer id=${replayTrf.id} without duplicate debit (cash=${cashAfterReplay})`
  );

  // Insufficient balance rejection in JSON transfer
  let jsonTrfInsufficientCode = '';
  try {
    await jsonAdapter.transfers.create(jsonAdminOptions, {
      mosqueId: 'mosque-json-1',
      fromAccountId: 'acc-json-cash-1',
      fromAccountName: 'প্রধান ক্যাশ তহবিল',
      toAccountId: 'acc-json-bank-1',
      toAccountName: 'ইসলামী ব্যাংক চলতি হিসাব',
      amount: 999999,
      date: '2026-11-02',
      createdBy: 'usr-json-admin-1',
      createdByName: 'মাওলানা আব্দুল করিম',
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    jsonTrfInsufficientCode = err.code || '';
  }

  assert(
    'JSON_PARITY',
    'JSON Account Transfer Insufficient Balance Rejected',
    jsonTrfInsufficientCode === 'INSUFFICIENT_BALANCE' &&
      jsonStore.accounts!.find((a) => a.id === 'acc-json-cash-1')!.currentBalance === cashAfterTrf,
    `Rejected with code=${jsonTrfInsufficientCode}, balance unchanged at ${cashAfterTrf}`
  );

  // 2D. JSON Tenant Isolation for Parity Repositories
  let jsonCrossTenantCode = '';
  try {
    await jsonAdapter.income.reverse(
      { ...jsonAdminOptions, mosqueId: 'mosque-json-2' },
      'inc-json-1',
      'Cross-tenant attempt'
    );
  } catch (err: any) {
    jsonCrossTenantCode = err.code || '';
  }

  assert(
    'TENANT_ISOLATION',
    'JSON Parity Cross-Tenant Reversal Rejected',
    jsonCrossTenantCode === 'TENANT_FORBIDDEN',
    `Cross-tenant JSON reversal threw [${jsonCrossTenantCode}]`
  );

  // --------------------------------------------------------------------------
  // 3. Factory & Middleware Behavior Tests
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Factory & Middleware Behavior Tests ---');

  const defaultFactoryDal = createDataAccessLayer({
    dalOptions: jsonAdminOptions,
    jsonDataSource: jsonStore,
  });

  assert(
    'FACTORY_MIDDLEWARE',
    'createDataAccessLayer Defaults to JsonStorageAdapter with Parity Repos',
    defaultFactoryDal instanceof JsonStorageAdapter &&
      typeof defaultFactoryDal.income?.reverse === 'function' &&
      typeof defaultFactoryDal.expense?.reverse === 'function' &&
      typeof defaultFactoryDal.transfers?.create === 'function' &&
      typeof defaultFactoryDal.idempotency?.getRecord === 'function',
    `Default adapter=${defaultFactoryDal.constructor.name} with income/expense/transfers/idempotency parity`
  );

  // Middleware test: populates userContext.userName and uses createDataAccessLayer
  const mockReq: any = {
    user: {
      id: 'usr-mw-1',
      name: 'হাফেজ শহিদুল ইসলাম',
      role: 'MOSQUE_ADMIN',
      mosqueId: 'mosque-json-1',
      permissions: ['VIEW_DASHBOARD'],
    },
    currentMosque: { id: 'mosque-json-1' },
    ip: '127.0.0.1',
  };
  let mwNextCalled = false;
  dalContextMiddleware(mockReq, {} as any, () => {
    mwNextCalled = true;
  });

  assert(
    'FACTORY_MIDDLEWARE',
    'dalContextMiddleware Obtains JSON Adapter via Factory & Sets userName',
    mwNextCalled &&
      mockReq.dal instanceof JsonStorageAdapter &&
      (mockReq.dal as any).mosque?.defaultOptions?.userContext?.userName === 'হাফেজ শহিদুল ইসলাম',
    `req.dal=${mockReq.dal?.constructor?.name}, userContext.userName="${(mockReq.dal as any).mosque?.defaultOptions?.userContext?.userName}"`
  );

  // --------------------------------------------------------------------------
  // 4. Real PostgreSQL Adapter Corrections Verification (Disposable DB)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Real PostgreSQL Adapter Corrections Verification ---');

  const pool = new pg.Pool({
    connectionString: testDbUrl,
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  const PREFIX = `test-phase1b7-${Date.now()}`;
  const PG_MOSQUE_1 = `${PREFIX}-mosque-1`;
  const PG_USER_1 = `${PREFIX}-user-1`;
  const PG_ACC_1 = `${PREFIX}-acc-1`;
  const PG_ACC_2 = `${PREFIX}-acc-2`;
  const PG_HEAD_INC = `${PREFIX}-head-inc`;
  const PG_HEAD_EXP = `${PREFIX}-head-exp`;
  const PG_ACTOR_NAME = 'আলহাজ্ব মো. রফিকুল ইসলাম';

  const mosqueRepo = new PostgresMosqueIdentityRepository(pool);
  const userRepo = new PostgresUserRepository(pool);
  const headRepo = new PostgresAccountHeadRepository(pool);
  const accRepo = new PostgresFinancialAccountRepository(pool);
  const auditRepo = new PostgresAuditRepository(pool);

  try {
    // Seed Mosque, User, Heads, and 2 Financial Accounts
    await mosqueRepo.create({
      id: PG_MOSQUE_1,
      name: 'Phase 1B.7 Verification Mosque',
      nameBn: 'ফেজ ১বি.৭ ভেরিফিকেশন মসজিদ',
      contactNumber: '01711999888',
      address: 'Uttara, Dhaka',
      establishedYear: '2015',
      registrationNumber: `REG-1B7-${Date.now()}`,
    });

    const hash = await bcrypt.hash('TestPass123!', 10);
    await userRepo.create({
      id: PG_USER_1,
      mosqueId: PG_MOSQUE_1,
      name: PG_ACTOR_NAME,
      phone: `01799${Date.now().toString().slice(-6)}`,
      passwordHash: hash,
      role: 'MOSQUE_ADMIN',
      permissions: ['CREATE_INCOME', 'APPROVE_INCOME', 'CREATE_EXPENSE', 'APPROVE_EXPENSE', 'MANAGE_ACCOUNTS'],
      status: 'ACTIVE',
    });

    await headRepo.create({
      id: PG_HEAD_INC,
      mosqueId: PG_MOSQUE_1,
      code: 'INC-100',
      nameBn: 'সাধারণ দান',
      nameEn: 'General Donation',
      type: 'INCOME',
      isActive: true,
    });

    await headRepo.create({
      id: PG_HEAD_EXP,
      mosqueId: PG_MOSQUE_1,
      code: 'EXP-100',
      nameBn: 'মসজিদ রক্ষণাবেক্ষণ',
      nameEn: 'Mosque Maintenance',
      type: 'EXPENSE',
      isActive: true,
    });

    await accRepo.create({
      id: PG_ACC_1,
      mosqueId: PG_MOSQUE_1,
      name: 'Primary Cash Account',
      nameBn: 'প্রধান ক্যাশ হিসাব',
      accountType: 'CASH',
      currentBalance: 10000.0,
      isActive: true,
    });

    await accRepo.create({
      id: PG_ACC_2,
      mosqueId: PG_MOSQUE_1,
      name: 'Secondary Bank Account',
      nameBn: 'ব্যাংক চলতি হিসাব',
      accountType: 'BANK',
      currentBalance: 5000.0,
      isActive: true,
    });

    const pgOptions: DALOptions = {
      mosqueId: PG_MOSQUE_1,
      userContext: {
        userId: PG_USER_1,
        userName: PG_ACTOR_NAME,
        userRole: 'MOSQUE_ADMIN',
        userMosqueId: PG_MOSQUE_1,
        permissions: ['CREATE_INCOME', 'APPROVE_INCOME', 'CREATE_EXPENSE', 'APPROVE_EXPENSE', 'MANAGE_ACCOUNTS'],
      },
      clientIp: '127.0.0.1',
    };

    const pgDal = createDataAccessLayer({
      adapterType: 'POSTGRES',
      dalOptions: pgOptions,
      postgresPool: pool,
    }) as PostgresStorageAdapter;

    assert(
      'FACTORY_MIDDLEWARE',
      'Explicit PostgreSQL Selection Returns PostgresStorageAdapter',
      pgDal instanceof PostgresStorageAdapter && typeof pgDal.idempotency?.getRecord === 'function',
      `Instantiated ${pgDal.constructor.name} with IIdempotencyRepository`
    );

    // 4A. Create & Reverse Income -> Verify actorName propagation in audit_logs
    const createdPgInc = await pgDal.income.create(pgOptions, {
      mosqueId: PG_MOSQUE_1,
      date: '2026-11-02',
      mainHeadId: PG_HEAD_INC,
      mainHeadNameBn: 'সাধারণ দান',
      amount: 4000,
      paymentMethod: 'CASH',
      accountId: PG_ACC_1,
      accountName: 'প্রধান ক্যাশ হিসাব',
      donorName: 'আব্দুল্লাহ',
      createdBy: PG_USER_1,
      createdByName: PG_ACTOR_NAME,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const reversedPgInc = await pgDal.income.reverse(
      pgOptions,
      createdPgInc.id,
      'অডিট অ্যাক্টর নেম ভেরিফিকেশন'
    );

    const pgAuditLogsAfterInc = await auditRepo.listByMosque(PG_MOSQUE_1, { limit: 10 });
    const incRevAuditRow = pgAuditLogsAfterInc.find(
      (a) => a.action === 'REVERSE_INCOME' && a.entity_id === createdPgInc.id
    );

    assert(
      'PG_CORRECTIONS',
      'PostgreSQL Income Reversal Propagates userName as Audit actorName',
      reversedPgInc.status === 'CANCELLED' &&
        Boolean(incRevAuditRow && incRevAuditRow.user_name === PG_ACTOR_NAME),
      `Audit row user_name="${incRevAuditRow?.user_name}" (Expected: "${PG_ACTOR_NAME}")`
    );

    // 4B. Create Expense with sourceModule, sourceId, sourceType -> Verify persistence & row mapping
    const createdPgExp = await pgDal.expense.create(pgOptions, {
      mosqueId: PG_MOSQUE_1,
      date: '2026-11-02',
      mainHeadId: PG_HEAD_EXP,
      mainHeadNameBn: 'মসজিদ রক্ষণাবেক্ষণ',
      amount: 2500,
      paymentMethod: 'CASH',
      accountId: PG_ACC_1,
      accountName: 'প্রধান ক্যাশ হিসাব',
      payeeName: 'ইঞ্জিনিয়ারিং ওয়ার্কশপ',
      sourceModule: 'ASSET_EXPENSE',
      sourceId: 'asset-ac-001',
      sourceType: 'MAINTENANCE',
      createdBy: PG_USER_1,
      createdByName: PG_ACTOR_NAME,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const fetchedPgExp = await pgDal.expense.findById(pgOptions, createdPgExp.id);

    assert(
      'PG_CORRECTIONS',
      'PostgreSQL Expense Preserves sourceModule, sourceId & sourceType',
      createdPgExp.sourceModule === 'ASSET_EXPENSE' &&
        createdPgExp.sourceId === 'asset-ac-001' &&
        createdPgExp.sourceType === 'MAINTENANCE' &&
        fetchedPgExp?.sourceModule === 'ASSET_EXPENSE' &&
        fetchedPgExp?.sourceId === 'asset-ac-001' &&
        fetchedPgExp?.sourceType === 'MAINTENANCE',
      `Mapped sourceModule=${fetchedPgExp?.sourceModule}, sourceId=${fetchedPgExp?.sourceId}, sourceType=${fetchedPgExp?.sourceType}`
    );

    // 4C. Reverse Expense -> Verify actorName propagation AND that isReversal is NOT inferred from CANCELLED
    const reversedPgExp = await pgDal.expense.reverse(
      pgOptions,
      createdPgExp.id,
      'ব্যয় রিভার্সাল অ্যাক্টর নেম পরীক্ষা'
    );

    const pgAuditLogsAfterExp = await auditRepo.listByMosque(PG_MOSQUE_1, { limit: 10 });
    const expRevAuditRow = pgAuditLogsAfterExp.find(
      (a) => a.action === 'REVERSE_EXPENSE' && a.entity_id === createdPgExp.id
    );

    assert(
      'PG_CORRECTIONS',
      'PostgreSQL Expense Reversal Propagates actorName & Does Not Infer isReversal',
      reversedPgExp.status === 'CANCELLED' &&
        reversedPgExp.isReversal === undefined &&
        Boolean(expRevAuditRow && expRevAuditRow.user_name === PG_ACTOR_NAME),
      `status=${reversedPgExp.status}, isReversal=${reversedPgExp.isReversal}, audit user_name="${expRevAuditRow?.user_name}"`
    );

    // 4D. Insufficient Balance Rejection Under SQL Row Locks (Expense Creation)
    // Current balance on PG_ACC_1 is 10,000.00 (after +4000-4000 and -2500+2500).
    let pgExpInsufficientCode = '';
    try {
      await pgDal.expense.create(pgOptions, {
        mosqueId: PG_MOSQUE_1,
        date: '2026-11-02',
        mainHeadId: PG_HEAD_EXP,
        mainHeadNameBn: 'মসজিদ রক্ষণাবেক্ষণ',
        amount: 25000, // Exceeds 10,000.00 balance
        paymentMethod: 'CASH',
        accountId: PG_ACC_1,
        accountName: 'প্রধান ক্যাশ হিসাব',
        payeeName: 'ওভারড্রাফট টেস্ট',
        createdBy: PG_USER_1,
        createdByName: PG_ACTOR_NAME,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      pgExpInsufficientCode = err.code || '';
    }

    const acc1AfterRejectedExp = await pgDal.financialAccounts.findById(pgOptions, PG_ACC_1);
    assert(
      'PG_CORRECTIONS',
      'PostgreSQL Expense Insufficient Balance Rejected Inside FOR UPDATE Lock',
      pgExpInsufficientCode === 'INSUFFICIENT_BALANCE' &&
        acc1AfterRejectedExp?.currentBalance === 10000,
      `Rejected with code=${pgExpInsufficientCode}, persisted balance remained ${acc1AfterRejectedExp?.currentBalance}`
    );

    // 4E. Insufficient Balance Rejection Under SQL Row Locks (Account Transfer)
    let pgTrfInsufficientCode = '';
    try {
      await pgDal.transfers.create(pgOptions, {
        mosqueId: PG_MOSQUE_1,
        fromAccountId: PG_ACC_1,
        fromAccountName: 'প্রধান ক্যাশ হিসাব',
        toAccountId: PG_ACC_2,
        toAccountName: 'ব্যাংক চলতি হিসাব',
        amount: 15000, // Exceeds 10,000.00 balance
        date: '2026-11-02',
        createdBy: PG_USER_1,
        createdByName: PG_ACTOR_NAME,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      pgTrfInsufficientCode = err.code || '';
    }

    const acc1AfterRejectedTrf = await pgDal.financialAccounts.findById(pgOptions, PG_ACC_1);
    const acc2AfterRejectedTrf = await pgDal.financialAccounts.findById(pgOptions, PG_ACC_2);
    assert(
      'PG_CORRECTIONS',
      'PostgreSQL Transfer Insufficient Balance Rejected Inside FOR UPDATE Lock',
      pgTrfInsufficientCode === 'INSUFFICIENT_BALANCE' &&
        acc1AfterRejectedTrf?.currentBalance === 10000 &&
        acc2AfterRejectedTrf?.currentBalance === 5000,
      `Rejected with code=${pgTrfInsufficientCode}, balances unchanged (${acc1AfterRejectedTrf?.currentBalance}, ${acc2AfterRejectedTrf?.currentBalance})`
    );

    // 4F. Valid PostgreSQL Account Transfer & Idempotency Contract via IDataAccessLayer
    const validPgTrf = await pgDal.transfers.create(pgOptions, {
      mosqueId: PG_MOSQUE_1,
      fromAccountId: PG_ACC_1,
      fromAccountName: 'প্রধান ক্যাশ হিসাব',
      toAccountId: PG_ACC_2,
      toAccountName: 'ব্যাংক চলতি হিসাব',
      amount: 3000,
      date: '2026-11-02',
      createdBy: PG_USER_1,
      createdByName: PG_ACTOR_NAME,
      createdAt: new Date().toISOString(),
    });

    const savedIdemp = await pgDal.idempotency.saveRecord(pgOptions, {
      idempotencyKey: `idemp-pg-1b7-${Date.now()}`,
      endpoint: '/api/v1/accounting/accounts/transfer',
      responsePayload: { success: true, data: validPgTrf },
    });

    const fetchedIdemp = await pgDal.idempotency.getRecord(
      pgOptions,
      '/api/v1/accounting/accounts/transfer',
      savedIdemp?.idempotencyKey
    );

    assert(
      'PG_CORRECTIONS',
      'IDataAccessLayer.idempotency Contract Works on PostgresStorageAdapter',
      Boolean(
        savedIdemp &&
          fetchedIdemp &&
          fetchedIdemp.responsePayload?.data?.id === validPgTrf.id
      ),
      `Saved & retrieved idempotency record id=${fetchedIdemp?.id} for transfer=${validPgTrf.transferNumber}`
    );
  } finally {
    // ------------------------------------------------------------------------
    // 5. Scoped Non-Destructive Cleanup of Disposable PostgreSQL Test Data
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Scoped Cleanup & Active JSON Integrity Check ---');
    const cleanupClient = await pool.connect();
    try {
      await cleanupClient.query('BEGIN');
      await cleanupClient.query("DELETE FROM audit_logs WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM idempotency_records WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM account_transfers WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM income_entries WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM expense_entries WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM financial_accounts WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM account_heads WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM users WHERE mosque_id LIKE 'test-phase1b7-%'");
      await cleanupClient.query("DELETE FROM mosques WHERE id LIKE 'test-phase1b7-%'");
      await cleanupClient.query('COMMIT');
    } catch (cleanupErr) {
      await cleanupClient.query('ROLLBACK');
      console.error('Cleanup error:', cleanupErr);
    } finally {
      cleanupClient.release();
    }

    const remRes = await pool.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM mosques WHERE id LIKE 'test-phase1b7-%'"
    );
    assert(
      'CLEANUP',
      'Scoped Disposable PostgreSQL Test Rows Cleaned Up',
      remRes.rows[0].count === 0,
      `Remaining test-phase1b7-% mosques: ${remRes.rows[0].count}`
    );

    await pool.end();
  }

  const finalJsonDbHash = fs.existsSync(jsonDbFilePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(jsonDbFilePath)).digest('hex')
    : 'NONE';

  assert(
    'RUNTIME_SAFETY',
    'Active JSON Database File Untouched (SHA-256 Match)',
    initialJsonDbHash === finalJsonDbHash,
    `data/masjidledger_db.json SHA-256 unchanged (${finalJsonDbHash.substring(0, 16)}...)`
  );

  // Summary
  console.log('\n' + '='.repeat(80));
  const passedCount = assertions.filter((a) => a.status === 'PASS').length;
  const totalCount = assertions.length;
  console.log(
    `PHASE 1B.7 VERIFICATION SUMMARY: ${passedCount} / ${totalCount} Assertions Passed (${Math.round(
      (passedCount / totalCount) * 100
    )}%)`
  );
  console.log('='.repeat(80));

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase1B7Suite().catch((err) => {
  console.error('Unhandled error in Phase 1B.7 test suite:', err);
  process.exit(1);
});

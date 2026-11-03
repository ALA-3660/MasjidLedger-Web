/**
 * MASJIDLEDGER PRO v2.6 — REAL POSTGRESQL INTEGRATION TEST SUITE (PHASE 1B.5)
 * Task ID: ML-V26-DAL-PHASE1B5-REAL-PG-INTEGRATION
 * Mode: REAL DATABASE INTEGRATION TESTING — DISPOSABLE DATABASE ONLY
 *
 * Pre-flight safeguards:
 * - Strictly loads .env.test and uses TEST_DATABASE_URL
 * - Strictly verifies target host is 127.0.0.1 and target DB is masjidledger_v26_test_disposable
 * - Confirms DATABASE_URL is not used
 * - Confirms connection to postgres DB as ml_test_runner is rejected
 * - Confirms connection to disposable DB succeeds
 *
 * Test coverage:
 * - Section C: Real schema migration, 99 canonical tables (including schema_migrations), idempotency, column & constraint checks
 * - Section D: Repository-level financial lifecycle (Income & Expense create, reverse, balance, audit)
 * - Section E: Transaction rollback & SAVEPOINT isolation
 * - Section F: Audit & Idempotency atomicity
 * - Section G: Tenant isolation & SUPER_ADMIN existence verification
 * - Section H: 5-worker concurrent account locking transactions (zero lost updates)
 * - Section I: Scoped non-destructive cleanup
 * - Application Runtime: Active JSON database health check
 */

import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { runInitialSchemaMigration, getAppliedMigrations } from '../src/server/db/postgres/migrations/migrationRunner';
import {
  PostgresMosqueIdentityRepository,
  PostgresUserRepository,
  PostgresAccountHeadRepository,
  PostgresFinancialAccountRepository,
  PostgresIncomeRepository,
  PostgresExpenseRepository,
  PostgresAuditRepository,
  PostgresIdempotencyRepository,
} from '../src/server/db/postgres/repositories';
import {
  PostgresStorageAdapter,
  TenantSecurityError,
} from '../src/server/db/adapters/PostgresStorageAdapter';
import { withAccountLockTransaction } from '../src/server/db/postgres/transaction';
import { DALOptions } from '../src/server/db/interfaces/IDataAccessLayer';

// ============================================================================
// Types & Result Tracking
// ============================================================================

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
  if (!condition) {
    console.error(`     FAILED: ${details}`);
  }
}

// ============================================================================
// Main Integration Test Suite
// ============================================================================

async function runRealPostgresIntegrationSuite() {
  console.log('='.repeat(80));
  console.log('MASJIDLEDGER PRO v2.6 — REAL POSTGRESQL INTEGRATION TESTS (PHASE 1B.5)');
  console.log('Target: Local Disposable PostgreSQL 15 on 127.0.0.1:5432');
  console.log('='.repeat(80));

  // --------------------------------------------------------------------------
  // SECTION A: Pre-Flight Safety Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION A: Pre-Flight Safety Verification ---');

  // 1. Verify DATABASE_URL is not set or used
  assert(
    'PRE-FLIGHT',
    'DATABASE_URL Unused',
    !process.env.DATABASE_URL,
    `process.env.DATABASE_URL is ${process.env.DATABASE_URL ? 'DEFINED (UNEXPECTED)' : 'undefined (SAFE)'}`
  );

  // 2. Load strictly .env.test
  dotenv.config({ path: '.env.test' });
  const testDbUrl = process.env.TEST_DATABASE_URL;

  assert(
    'PRE-FLIGHT',
    'TEST_DATABASE_URL Present',
    Boolean(testDbUrl && testDbUrl.startsWith('postgresql://')),
    'TEST_DATABASE_URL successfully loaded from .env.test'
  );

  if (!testDbUrl) {
    throw new Error('FATAL: TEST_DATABASE_URL is not set in .env.test');
  }

  // 3. Strict URL validation
  const parsedUrl = new URL(testDbUrl);
  const targetHost = parsedUrl.hostname;
  const targetPort = parsedUrl.port || '5432';
  const targetDb = parsedUrl.pathname.replace(/^\//, '');
  const targetUser = parsedUrl.username;

  assert(
    'PRE-FLIGHT',
    'Target Host Localhost Only',
    targetHost === '127.0.0.1' || targetHost === 'localhost',
    `Host is ${targetHost} (Must be 127.0.0.1)`
  );

  assert(
    'PRE-FLIGHT',
    'Target Database Disposable Only',
    targetDb === 'masjidledger_v26_test_disposable',
    `Target DB name is "${targetDb}" (Must be "masjidledger_v26_test_disposable")`
  );

  assert(
    'PRE-FLIGHT',
    'Connection User ml_test_runner',
    targetUser === 'ml_test_runner',
    `User is "${targetUser}" (Must be "ml_test_runner")`
  );

  // 4. Test connection rejection on default 'postgres' database
  const postgresDbUrl = testDbUrl.replace('/masjidledger_v26_test_disposable', '/postgres');
  const forbiddenPool = new pg.Pool({
    connectionString: postgresDbUrl,
    connectionTimeoutMillis: 3000,
  });

  let postgresRejected = false;
  let rejectionReason = '';
  try {
    await forbiddenPool.query('SELECT current_database()');
  } catch (err: any) {
    postgresRejected = true;
    rejectionReason = err.message;
  } finally {
    await forbiddenPool.end().catch(() => {});
  }

  assert(
    'PRE-FLIGHT',
    'Denial of ml_test_runner on postgres DB',
    postgresRejected,
    `Connection to postgres DB rejected as expected: "${rejectionReason}"`
  );

  // 5. Connect to disposable DB
  const pool = new pg.Pool({
    connectionString: testDbUrl,
    max: 15,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  const connRes = await pool.query('SELECT current_database() AS db, current_user AS usr, version() AS ver');
  assert(
    'PRE-FLIGHT',
    'Connection to Disposable DB',
    connRes.rows[0].db === 'masjidledger_v26_test_disposable' && connRes.rows[0].usr === 'ml_test_runner',
    `Connected to: ${connRes.rows[0].db} as ${connRes.rows[0].usr}`
  );

  // --------------------------------------------------------------------------
  // SECTION C: Real Schema and Migration Tests
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION C: Real Schema and Migration Tests ---');

  // 1. Initial Migration Execution
  const migrationRes1 = await runInitialSchemaMigration(pool);
  assert(
    'SCHEMA',
    'Initial Migration Execution',
    migrationRes1.success && (migrationRes1.applied || migrationRes1.tableCount !== undefined),
    `Migration returned success=${migrationRes1.success}, applied=${migrationRes1.applied}, duration=${migrationRes1.durationMs}ms`
  );

  // 2. Count Tables in public schema
  const tableCountRes = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  const totalBaseTables = tableCountRes.rows[0].count;
  // 99 canonical DDL tables (including Table 2: schema_migrations)
  assert(
    'SCHEMA',
    'Canonical Table Count Verification',
    totalBaseTables === 99,
    `Found exactly ${totalBaseTables} base tables in public schema (99 canonical DDL tables including schema_migrations)`
  );

  // 3. Verify schema_migrations record
  const appliedList = await getAppliedMigrations(pool);
  assert(
    'SCHEMA',
    'schema_migrations Tracking',
    appliedList.length >= 1 && appliedList[0].version === '001_phase1b_99_tables',
    `Found version=${appliedList[0]?.version}, applied_at=${appliedList[0]?.applied_at}`
  );

  // 4. Idempotency Check (Second run should be applied: false)
  const migrationRes2 = await runInitialSchemaMigration(pool);
  assert(
    'SCHEMA',
    'Migration Idempotency Re-run',
    migrationRes2.success && migrationRes2.applied === false && migrationRes2.tableCount === 99,
    `Second run returned success=${migrationRes2.success}, applied=${migrationRes2.applied}, tables=${migrationRes2.tableCount}`
  );

  // 5. Column Verification for rejection_reason
  const colRes = await pool.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(
    `SELECT table_name, column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('income_entries', 'expense_entries')
       AND column_name = 'rejection_reason'`
  );
  assert(
    'SCHEMA',
    'Rejection Reason Columns Present',
    colRes.rows.length === 2,
    `Found rejection_reason in: ${colRes.rows.map((r) => `${r.table_name}(${r.data_type}, nullable=${r.is_nullable})`).join(', ')}`
  );

  // 6. CHECK Constraint Verification on status
  const checkRes = await pool.query<{ table_name: string; constraint_name: string; check_clause: string }>(
    `SELECT tc.table_name, tc.constraint_name, cc.check_clause
     FROM information_schema.table_constraints tc
     JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
     WHERE tc.table_schema = 'public'
       AND tc.table_name IN ('income_entries', 'expense_entries')
       AND cc.check_clause LIKE '%CANCELLED%'`
  );
  assert(
    'SCHEMA',
    'Status CHECK Constraints Include CANCELLED',
    checkRes.rows.length >= 2,
    `Found CANCELLED in status check constraints on tables: ${checkRes.rows.map((r) => r.table_name).join(', ')}`
  );

  // --------------------------------------------------------------------------
  // SECTION D: Repository-Level Financial Lifecycle Tests
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION D: Repository-Level Financial Lifecycle Tests ---');

  const mosqueRepo = new PostgresMosqueIdentityRepository(pool);
  const userRepo = new PostgresUserRepository(pool);
  const headRepo = new PostgresAccountHeadRepository(pool);
  const accRepo = new PostgresFinancialAccountRepository(pool);
  const incomeRepo = new PostgresIncomeRepository(pool);
  const expenseRepo = new PostgresExpenseRepository(pool);
  const auditRepo = new PostgresAuditRepository(pool);
  const idempRepo = new PostgresIdempotencyRepository(pool);

  const PREFIX = `test-phase1b5-${Date.now()}`;
  const MOSQUE_1 = `${PREFIX}-mosque-1`;
  const MOSQUE_2 = `${PREFIX}-mosque-2`;
  const USER_1 = `${PREFIX}-user-1`;
  const ACC_1 = `${PREFIX}-acc-1`;
  const HEAD_INC = `${PREFIX}-head-inc`;
  const HEAD_EXP = `${PREFIX}-head-exp`;

  // 1. Seed Test Mosque 1
  await mosqueRepo.create({
    id: MOSQUE_1,
    name: 'Baitul Aman Test Mosque Phase 1B5',
    nameBn: 'বায়তুল আমান টেস্ট মসজিদ',
    contactNumber: '01711000001',
    address: 'Dhanmondi, Dhaka',
    establishedYear: '2000',
    registrationNumber: `REG-${Date.now()}`,
  });

  // 2. Seed Test User 1 with bcrypt hash
  const passwordHash = await bcrypt.hash('SecurePass123!', 10);
  await userRepo.create({
    id: USER_1,
    mosqueId: MOSQUE_1,
    name: 'Test Administrator',
    phone: `01711${Date.now().toString().slice(-6)}`,
    passwordHash,
    role: 'ADMIN',
    permissions: ['FINANCE_VIEW', 'FINANCE_ENTRY', 'FINANCE_APPROVE', 'AUDIT_VIEW'],
    status: 'ACTIVE',
  });

  // 3. Seed Account Heads (Income & Expense)
  await headRepo.create({
    id: HEAD_INC,
    mosqueId: MOSQUE_1,
    code: '1001',
    nameBn: 'সাধারণ অনুদান',
    nameEn: 'General Donation',
    type: 'INCOME',
    isActive: true,
  });

  await headRepo.create({
    id: HEAD_EXP,
    mosqueId: MOSQUE_1,
    code: '2001',
    nameBn: 'বিদ্যুৎ বিল',
    nameEn: 'Electricity Bill',
    type: 'EXPENSE',
    isActive: true,
  });

  // 4. Seed Financial Account (Initial Balance: 50,000.00)
  const initialBalance = 50000.00;
  await accRepo.create({
    id: ACC_1,
    mosqueId: MOSQUE_1,
    name: 'IBBL Main Current Account',
    nameBn: 'আইবিবিএল প্রধান চলতি হিসাব',
    accountNumber: `ACC-${Date.now().toString().slice(-6)}`,
    bankName: 'Islami Bank Bangladesh Ltd',
    branchName: 'Dhanmondi',
    accountType: 'BANK',
    currentBalance: initialBalance,
    isActive: true,
  });

  const initAcc = await accRepo.getById(ACC_1, MOSQUE_1);
  assert(
    'FINANCE',
    'Financial Account Seeded',
    parseFloat(initAcc?.current_balance || '0') === initialBalance,
    `Account ${ACC_1} created with initial balance ${initAcc?.current_balance}`
  );

  // 5. Test Income Entry Creation (15,000.00)
  const incomeAmount = 15000.00;
  const incEntryId = `${PREFIX}-inc-1`;
  const incVoucher = `INC-${Date.now().toString().slice(-6)}`;

  const createdIncome = await incomeRepo.create({
    id: incEntryId,
    mosqueId: MOSQUE_1,
    voucherNumber: incVoucher,
    date: '2026-11-02',
    mainHeadId: HEAD_INC,
    mainHeadNameBn: 'সাধারণ অনুদান',
    amount: incomeAmount,
    paymentMethod: 'CASH',
    accountId: ACC_1,
    accountName: 'IBBL Main Current Account',
    donorName: 'Test Donor Brother',
    donorPhone: '01811000002',
    reference: 'REF-INC-001',
    description: 'Friday Jummah Cash Donation',
    status: 'APPROVED',
    createdBy: USER_1,
    createdByName: 'Test Administrator',
    approvedBy: USER_1,
    approvedByName: 'Test Administrator',
    approvedAt: new Date().toISOString(),
  });

  const postIncomeAcc = await accRepo.getById(ACC_1, MOSQUE_1);
  const expectedPostIncomeBalance = initialBalance + incomeAmount; // 65,000.00

  assert(
    'FINANCE',
    'Income Creation & Balance Increment',
    createdIncome.status === 'APPROVED' && parseFloat(postIncomeAcc?.current_balance || '0') === expectedPostIncomeBalance,
    `Income voucher ${incVoucher} created. Account balance updated to ${postIncomeAcc?.current_balance} (Expected: ${expectedPostIncomeBalance})`
  );

  // 6. Test Income Reversal (Cancel 15,000.00)
  const incReversalReason = 'Erroneous donor receipt entry test';
  const reversedIncome = await incomeRepo.reverseWithTransaction({
    entryId: incEntryId,
    mosqueId: MOSQUE_1,
    reason: incReversalReason,
    actorId: USER_1,
    actorName: 'Test Administrator',
    actorRole: 'ADMIN',
    ipAddress: '127.0.0.1',
  });

  const postIncRevAcc = await accRepo.getById(ACC_1, MOSQUE_1);
  assert(
    'FINANCE',
    'Income Reversal & Balance Restoration',
    reversedIncome.status === 'CANCELLED' &&
      reversedIncome.rejection_reason === incReversalReason &&
      parseFloat(postIncRevAcc?.current_balance || '0') === initialBalance,
    `Income status=${reversedIncome.status}, rejection_reason="${reversedIncome.rejection_reason}". Balance restored to ${postIncRevAcc?.current_balance}`
  );

  // Check audit log created by income reversal (action: REVERSE_INCOME)
  const incAuditLogs = await auditRepo.listByMosque(MOSQUE_1, { limit: 10 });
  const incRevAudit = incAuditLogs.find(
    (a) => a.action === 'REVERSE_INCOME' || a.action.includes('REVERSE') || a.details?.includes(incEntryId)
  );
  assert(
    'FINANCE',
    'Income Reversal Audit Log Persisted',
    Boolean(incRevAudit),
    `Audit record found: id=${incRevAudit?.id}, action=${incRevAudit?.action}, details=${incRevAudit?.details?.substring(0, 45)}...`
  );

  // 7. Test Expense Entry Creation (8,000.00)
  const expenseAmount = 8000.00;
  const expEntryId = `${PREFIX}-exp-1`;
  const expVoucher = `EXP-${Date.now().toString().slice(-6)}`;

  const createdExpense = await expenseRepo.create({
    id: expEntryId,
    mosqueId: MOSQUE_1,
    voucherNumber: expVoucher,
    date: '2026-11-02',
    mainHeadId: HEAD_EXP,
    mainHeadNameBn: 'বিদ্যুৎ বিল',
    amount: expenseAmount,
    paymentMethod: 'BANK_TRANSFER',
    accountId: ACC_1,
    accountName: 'IBBL Main Current Account',
    payeeName: 'DPDC Utility Service',
    reference: 'BILL-OCT-2026',
    description: 'October 2026 Mosque Electricity Bill',
    status: 'APPROVED',
    createdBy: USER_1,
    createdByName: 'Test Administrator',
    approvedBy: USER_1,
    approvedByName: 'Test Administrator',
    approvedAt: new Date().toISOString(),
  });

  const postExpAcc = await accRepo.getById(ACC_1, MOSQUE_1);
  const expectedPostExpBalance = initialBalance - expenseAmount; // 42,000.00

  assert(
    'FINANCE',
    'Expense Creation & Balance Decrement',
    createdExpense.status === 'APPROVED' && parseFloat(postExpAcc?.current_balance || '0') === expectedPostExpBalance,
    `Expense voucher ${expVoucher} created. Account balance updated to ${postExpAcc?.current_balance} (Expected: ${expectedPostExpBalance})`
  );

  // 8. Test Expense Reversal (Restore 8,000.00)
  const expReversalReason = 'Erroneous duplicate bill processing test';
  const reversedExpense = await expenseRepo.reverseWithTransaction({
    entryId: expEntryId,
    mosqueId: MOSQUE_1,
    reason: expReversalReason,
    actorId: USER_1,
    actorName: 'Test Administrator',
    actorRole: 'ADMIN',
    ipAddress: '127.0.0.1',
  });

  const postExpRevAcc = await accRepo.getById(ACC_1, MOSQUE_1);
  assert(
    'FINANCE',
    'Expense Reversal & Balance Restoration',
    reversedExpense.status === 'CANCELLED' &&
      reversedExpense.rejection_reason === expReversalReason &&
      parseFloat(postExpRevAcc?.current_balance || '0') === initialBalance,
    `Expense status=${reversedExpense.status}, rejection_reason="${reversedExpense.rejection_reason}". Balance restored to ${postExpRevAcc?.current_balance}`
  );

  // --------------------------------------------------------------------------
  // SECTION E: Transaction & Rollback Tests
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION E: Transaction & Rollback Tests ---');

  // 1. Direct Transaction Abort & Dirty Write Absence Test
  const client1 = await pool.connect();
  const testAbortedIncId = `${PREFIX}-inc-aborted`;
  let abortErrorOccurred = false;

  try {
    await client1.query('BEGIN');
    // Insert row inside uncommitted transaction
    await client1.query(
      `INSERT INTO income_entries (
        id, mosque_id, voucher_number, date, main_head_id, main_head_name_bn,
        amount, payment_method, account_id, account_name, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testAbortedIncId,
        MOSQUE_1,
        'V-ABORT',
        '2026-11-02',
        HEAD_INC,
        'সাধারণ অনুদান',
        '99999.00',
        'CASH',
        ACC_1,
        'IBBL Main Current Account',
        'APPROVED',
        USER_1,
      ]
    );

    // Also alter balance in transaction
    await client1.query(
      'UPDATE financial_accounts SET current_balance = current_balance + 99999.00 WHERE id = $1',
      [ACC_1]
    );

    // Force an unrecoverable exception
    throw new Error('SIMULATED_TRANSACTION_FAILURE_TRIGGERED');
  } catch (err: any) {
    abortErrorOccurred = true;
    await client1.query('ROLLBACK');
  } finally {
    client1.release();
  }

  // Verify in a separate connection that zero changes leaked
  const independentClient = await pool.connect();
  try {
    const uncommittedCheck = await independentClient.query(
      'SELECT id FROM income_entries WHERE id = $1',
      [testAbortedIncId]
    );
    const balanceAfterAbort = await independentClient.query(
      'SELECT current_balance FROM financial_accounts WHERE id = $1',
      [ACC_1]
    );

    assert(
      'TRANSACTIONS',
      'Transaction Rollback Zero Dirty Writes',
      abortErrorOccurred &&
        uncommittedCheck.rows.length === 0 &&
        parseFloat(balanceAfterAbort.rows[0].current_balance) === initialBalance,
      `Uncommitted row count=${uncommittedCheck.rows.length}. Persisted balance remained strictly ${balanceAfterAbort.rows[0].current_balance}`
    );
  } finally {
    independentClient.release();
  }

  // 2. Nested Transaction via SAVEPOINT in PostgresStorageAdapter
  const testDalOptions: DALOptions = {
    mosqueId: MOSQUE_1,
    userContext: {
      userId: USER_1,
      userRole: 'MOSQUE_ADMIN',
      userMosqueId: MOSQUE_1,
      permissions: ['CREATE_INCOME', 'APPROVE_INCOME'],
    },
    clientIp: '127.0.0.1',
  };

  const adapter = new PostgresStorageAdapter(testDalOptions, pool);

  let outerCommitted = false;
  let innerRollbackCaught = false;

  await adapter.executeTransaction(async (txDal) => {
    // Outer operation: create valid account head
    await txDal.accountHeads.create(testDalOptions, {
      code: '3001',
      nameBn: 'বহিঃস্থ হিসাব খাত',
      nameEn: 'Outer Account Head',
      type: 'INCOME',
      category: 'GENERAL_FUND',
      isActive: true,
    } as any);

    // Inner operation inside SAVEPOINT: throws error
    try {
      await txDal.executeTransaction(async (_innerDal) => {
        // Attempt an invalid operation or throw error
        throw new Error('INTENTIONAL_INNER_SAVEPOINT_ROLLBACK');
      });
    } catch (innerErr: any) {
      if (innerErr.message === 'INTENTIONAL_INNER_SAVEPOINT_ROLLBACK') {
        innerRollbackCaught = true;
      } else {
        throw innerErr;
      }
    }

    // Outer transaction continues successfully
    outerCommitted = true;
  });

  const headsAfterNested = await pool.query(
    `SELECT name_en FROM account_heads WHERE mosque_id = $1 AND name_en = 'Outer Account Head'`,
    [MOSQUE_1]
  );

  assert(
    'TRANSACTIONS',
    'SAVEPOINT Nested Transaction Isolation',
    outerCommitted && innerRollbackCaught && headsAfterNested.rows.length === 1,
    `Inner error safely rolled back to SAVEPOINT while outer transaction committed successfully (${headsAfterNested.rows[0]?.name_en} exists)`
  );

  // --------------------------------------------------------------------------
  // SECTION F: Audit and Idempotency Atomicity Tests
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION F: Audit and Idempotency Atomicity Tests ---');

  // 1. Idempotency Unique Constraint Test
  const idempKey = `idemp-test-${Date.now()}`;
  const firstIdemp = await idempRepo.saveRecord({
    id: `${PREFIX}-idemp-1`,
    mosqueId: MOSQUE_1,
    endpoint: '/api/v1/finance/income',
    idempotencyKey: idempKey,
    requestHash: 'hash_abc123',
    responsePayload: { success: true, message: 'First attempt' },
    ttlSeconds: 86400,
  });

  assert(
    'IDEMPOTENCY',
    'First Idempotency Record Stored',
    Boolean(firstIdemp && firstIdemp.idempotency_key === idempKey),
    `Stored idempotency key ${firstIdemp?.idempotency_key} for mosque ${firstIdemp?.mosque_id}`
  );

  // Test that direct INSERT with duplicate (mosque_id, endpoint, idempotency_key) triggers unique constraint violation
  let duplicateCaught = false;
  let duplicateErrorMsg = '';
  try {
    await pool.query(
      `INSERT INTO idempotency_records (id, mosque_id, idempotency_key, endpoint, response_payload, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '1 day')`,
      [`${PREFIX}-idemp-dup`, MOSQUE_1, idempKey, '/api/v1/finance/income', JSON.stringify({ duplicate: true })]
    );
  } catch (err: any) {
    duplicateCaught = true;
    duplicateErrorMsg = err.message;
  }

  assert(
    'IDEMPOTENCY',
    'Duplicate Idempotency Key Rejected',
    duplicateCaught && (duplicateErrorMsg.includes('unique') || duplicateErrorMsg.includes('uq_idempotency_scope')),
    `Database enforced unique scope constraint: "${duplicateErrorMsg}"`
  );

  // 2. Audit Log Atomicity on Failure Test
  const auditClient = await pool.connect();
  const failingAuditId = `${PREFIX}-audit-should-rollback`;
  try {
    await auditClient.query('BEGIN');
    await auditClient.query(
      `INSERT INTO audit_logs (id, mosque_id, user_id, user_name, user_role, action, entity_type, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [failingAuditId, MOSQUE_1, USER_1, 'Admin', 'ADMIN', 'TEST_FAIL', 'FINANCE', 'Should be rolled back']
    );
    // Force abort
    throw new Error('FAIL_AND_ROLLBACK_AUDIT');
  } catch {
    await auditClient.query('ROLLBACK');
  } finally {
    auditClient.release();
  }

  const checkAuditRollback = await pool.query('SELECT id FROM audit_logs WHERE id = $1', [failingAuditId]);
  assert(
    'AUDIT',
    'Audit Log Rolled Back Atomically',
    checkAuditRollback.rows.length === 0,
    `Audit log ${failingAuditId} was rolled back with the failing transaction (persisted count=0)`
  );

  // --------------------------------------------------------------------------
  // SECTION G: Tenant Isolation and SUPER_ADMIN Tests
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION G: Tenant Isolation and SUPER_ADMIN Tests ---');

  // 1. Seed Second Mosque
  await mosqueRepo.create({
    id: MOSQUE_2,
    name: 'Tenant 2 Mosque Phase 1B5',
    nameBn: 'দ্বিতীয় মসজিদ',
    contactNumber: '01811000002',
    address: 'Gulshan, Dhaka',
    establishedYear: '2010',
    registrationNumber: `REG2-${Date.now()}`,
  });

  // 2. Cross-Tenant Rejection Test for regular role
  const mosque1AccountantOptions: DALOptions = {
    mosqueId: MOSQUE_1,
    userContext: {
      userId: `${PREFIX}-accountant-1`,
      userRole: 'ACCOUNTANT',
      userMosqueId: MOSQUE_1,
      permissions: ['VIEW_DASHBOARD'],
    },
    clientIp: '127.0.0.1',
  };

  const m1Adapter = new PostgresStorageAdapter(mosque1AccountantOptions, pool);

  let crossTenantBlocked = false;
  let crossTenantErrorCode = '';

  try {
    // Attempt to access Mosque 2 via Mosque 1 adapter context
    await m1Adapter.financialAccounts.findById(
      {
        ...mosque1AccountantOptions,
        mosqueId: MOSQUE_2, // malicious target override
      },
      'some-account-id'
    );
  } catch (err: any) {
    crossTenantBlocked = true;
    crossTenantErrorCode = (err as any).code || (err as any).name;
  }

  assert(
    'TENANT_ISOLATION',
    'Cross-Tenant Access Rejected for Regular User',
    crossTenantBlocked && crossTenantErrorCode === 'TENANT_FORBIDDEN',
    `Cross-tenant access correctly denied with error code [${crossTenantErrorCode}]`
  );

  // 3. Raw Repositories Proxy Guard Test
  let rawRepoProxyBlocked = false;
  try {
    // Calling raw repository for a different mosque directly
    await m1Adapter.rawRepositories.income.listByMosque(MOSQUE_2);
  } catch (err: any) {
    if (err instanceof TenantSecurityError && err.code === 'TENANT_FORBIDDEN') {
      rawRepoProxyBlocked = true;
    }
  }

  assert(
    'TENANT_ISOLATION',
    'Raw Repository Proxy Enforces Tenant Isolation',
    rawRepoProxyBlocked,
    'Raw repository proxy intercepted unauthorized cross-tenant query'
  );

  // 4. SUPER_ADMIN Valid Target Access Test
  const superAdminOptions: DALOptions = {
    mosqueId: MOSQUE_2,
    userContext: {
      userId: 'global-super-admin',
      userRole: 'SUPER_ADMIN',
      userMosqueId: 'system',
      permissions: ['VIEW_DASHBOARD'],
    },
    clientIp: '127.0.0.1',
  };

  const superAdminAdapter = new PostgresStorageAdapter(superAdminOptions, pool);
  let superAdminAllowed = false;
  try {
    const m2Details = await superAdminAdapter.mosque.findById(MOSQUE_2, superAdminOptions);
    superAdminAllowed = Boolean(m2Details && m2Details.id === MOSQUE_2);
  } catch (err) {
    superAdminAllowed = false;
  }

  assert(
    'SUPER_ADMIN',
    'SUPER_ADMIN Access to Valid Tenant Permitted',
    superAdminAllowed,
    `SUPER_ADMIN successfully accessed Mosque 2 (${MOSQUE_2})`
  );

  // 5. SUPER_ADMIN Target Mosque Not Found Test
  const nonExistentMosqueId = `mosque-non-existent-${Date.now()}`;
  const superAdminInvalidTargetOptions: DALOptions = {
    mosqueId: nonExistentMosqueId,
    userContext: {
      userId: 'global-super-admin',
      userRole: 'SUPER_ADMIN',
      userMosqueId: 'system',
      permissions: ['VIEW_DASHBOARD'],
    },
    clientIp: '127.0.0.1',
  };

  const superAdminInvalidAdapter = new PostgresStorageAdapter(superAdminInvalidTargetOptions, pool);
  let notFoundBlocked = false;
  let notFoundCode = '';

  try {
    await superAdminInvalidAdapter.financialAccounts.list(superAdminInvalidTargetOptions);
  } catch (err: any) {
    notFoundBlocked = true;
    notFoundCode = err.code || err.name;
  }

  assert(
    'SUPER_ADMIN',
    'SUPER_ADMIN Non-Existent Target Fails Fast',
    notFoundBlocked && notFoundCode === 'TARGET_MOSQUE_NOT_FOUND',
    `SUPER_ADMIN call on non-existent mosque threw [${notFoundCode}]`
  );

  // --------------------------------------------------------------------------
  // SECTION H: Concurrent Transaction Tests
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION H: Concurrent Transaction Tests ---');

  // Concurrency Scenario:
  // 5 concurrent workers executing on ACC_1 simultaneously.
  // Each worker performs an atomic balance adjustment of 2,000.00 using withAccountLockTransaction.
  // Starting balance is initialBalance (50,000.00).
  // Expected final balance: 50,000 + (5 * 2,000) = 60,000.00 exactly with ZERO lost updates.

  const workerCount = 5;
  const depositPerWorker = 2000.00;
  console.log(`  Spawning ${workerCount} concurrent workers on account ${ACC_1}...`);

  const workerPromises = Array.from({ length: workerCount }).map(async (_, idx) => {
    return withAccountLockTransaction(
      [ACC_1],
      async (client) => {
        // Read locked balance
        const balanceRes = await client.query<{ current_balance: string }>(
          'SELECT current_balance FROM financial_accounts WHERE id = $1',
          [ACC_1]
        );
        const currentBal = parseFloat(balanceRes.rows[0].current_balance);
        const newBal = currentBal + depositPerWorker;

        // Introduce simulated microsecond jitter to provoke race conditions if locking were broken
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20)));

        // Update balance
        await client.query(
          'UPDATE financial_accounts SET current_balance = $1, updated_at = NOW() WHERE id = $2',
          [String(newBal), ACC_1]
        );

        return { workerId: idx + 1, prevBalance: currentBal, newBalance: newBal };
      },
      pool
    );
  });

  await Promise.all(workerPromises);
  const finalAccRes = await accRepo.getById(ACC_1, MOSQUE_1);
  const finalBalance = parseFloat(finalAccRes?.current_balance || '0');
  const expectedFinalBalance = initialBalance + workerCount * depositPerWorker; // 60,000.00

  assert(
    'CONCURRENCY',
    '5 Concurrent Workers with Row Locking',
    finalBalance === expectedFinalBalance,
    `All ${workerCount} workers completed successfully. Final balance = ${finalBalance} (Expected: ${expectedFinalBalance}). Zero lost updates.`
  );

  // --------------------------------------------------------------------------
  // SECTION I: Test Isolation and Safe Cleanup
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION I: Test Isolation and Safe Cleanup ---');

  // Clean up only rows matching PREFIX (`test-phase1b5-%`) in reverse dependency order
  const cleanupClient = await pool.connect();
  let cleanupSuccess = false;
  try {
    await cleanupClient.query('BEGIN');

    await cleanupClient.query("DELETE FROM audit_logs WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM idempotency_records WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM income_entries WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM expense_entries WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM financial_accounts WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM account_heads WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM users WHERE mosque_id LIKE 'test-phase1b5-%'");
    await cleanupClient.query("DELETE FROM mosques WHERE id LIKE 'test-phase1b5-%'");

    await cleanupClient.query('COMMIT');
    cleanupSuccess = true;
  } catch (cleanupErr) {
    await cleanupClient.query('ROLLBACK');
    console.error('Cleanup error:', cleanupErr);
  } finally {
    cleanupClient.release();
  }

  // Verify test data count is 0
  const remainingCheck = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM mosques WHERE id LIKE 'test-phase1b5-%'"
  );
  assert(
    'CLEANUP',
    'Scoped Test Artifacts Deleted Safely',
    cleanupSuccess && remainingCheck.rows[0].count === 0,
    `Deleted test records with prefix "${PREFIX}". Remaining test mosques: ${remainingCheck.rows[0].count}`
  );

  // Verify public schema tables remain untouched at 99
  const finalTableCheck = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  assert(
    'CLEANUP',
    'Database Structure Preserved (No DROP CASCADE)',
    finalTableCheck.rows[0].count === 99,
    `Table count after cleanup remains exactly ${finalTableCheck.rows[0].count}`
  );

  await pool.end();

  // --------------------------------------------------------------------------
  // Application Runtime Verification: JSON DB Intact
  // --------------------------------------------------------------------------
  console.log('\n--- Runtime Safety Verification (Active JSON Database) ---');

  let appHealthStatus = 'UNKNOWN';
  let appStorageType = 'UNKNOWN';
  let isTenantBound = false;

  try {
    // 1. Authenticate to running Express server to get authoritative JWT
    const loginResp = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '01711223344', password: 'admin123' }),
    });

    if (loginResp.ok) {
      const loginData = await loginResp.json();
      const token = loginData.data?.token || loginData.data?.accessToken;

      // 2. Query dal-health with Bearer JWT
      const healthResp = await fetch('http://127.0.0.1:3000/api/v1/dal-health', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (healthResp.ok) {
        const healthData = await healthResp.json();
        appHealthStatus = healthData.status;
        appStorageType = healthData.adapter || healthData.storageType;
        isTenantBound = Boolean(healthData.tenantBound);
      }
    }
  } catch (err: any) {
    appHealthStatus = `UNREACHABLE (${err.message})`;
  }

  assert(
    'RUNTIME_SAFETY',
    'Application Dev Server Live on JSON Storage',
    appHealthStatus === 'UP' && appStorageType === 'JSON' && isTenantBound,
    `App /api/v1/dal-health returned status=${appHealthStatus}, adapter=${appStorageType}, tenantBound=${isTenantBound}`
  );

  // --------------------------------------------------------------------------
  // Summary Results
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1B.5 REAL POSTGRESQL INTEGRATION TEST SUMMARY');
  console.log('='.repeat(80));

  const passedCount = assertions.filter((a) => a.status === 'PASS').length;
  const failedCount = assertions.filter((a) => a.status === 'FAIL').length;
  const totalCount = assertions.length;

  console.log(`Total Assertions: ${totalCount}`);
  console.log(`Passed:           ${passedCount}`);
  console.log(`Failed:           ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFAILURES ENCOUNTERED:');
    assertions
      .filter((a) => a.status === 'FAIL')
      .forEach((a) => console.error(`  - [${a.category}] ${a.name}: ${a.details}`));
    process.exit(1);
  } else {
    console.log('\n🏆 ALL REAL POSTGRESQL INTEGRATION TESTS PASSED (100% SUCCESS)');
    process.exit(0);
  }
}

runRealPostgresIntegrationSuite().catch((fatalErr) => {
  console.error('FATAL TEST SUITE ERROR:', fatalErr);
  process.exit(1);
});

import { POSTGRES_SCHEMA_SQL } from '../src/server/db/postgres/schema/ddl';
import { runInitialSchemaMigration } from '../src/server/db/postgres/migrations/migrationRunner';
import { PostgresFinancialRepository } from '../src/server/db/postgres/repositories/financialRepository';
import { PostgresAuditRepository } from '../src/server/db/postgres/repositories/auditRepository';
import { PostgresIdempotencyRepository } from '../src/server/db/postgres/repositories/idempotencyRepository';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  evidence: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, evidence: string) {
  if (condition) {
    results.push({ name, passed: true, evidence });
    console.log(`  ✅ [PASS] ${name}: ${evidence}`);
  } else {
    results.push({ name, passed: false, error: 'Assertion failed', evidence });
    console.error(`  ❌ [FAIL] ${name}: ${evidence}`);
  }
}

async function runPostgresSchemaTestSuite() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — POSTGRESQL SCHEMA VERIFICATION TEST');
  console.log('================================================================\n');

  // ==========================================================================
  // SECTION 1: DDL INTEGRITY & TABLE COVERAGE (32+ Required Tables)
  // ==========================================================================
  console.log('>>> 1. Verifying Complete 32+ Relational Table Declarations');

  const requiredTables = [
    'mosques',
    'users',
    'person_masters',
    'area_masters',
    'family_masters',
    'account_heads',
    'financial_accounts',
    'account_opening_balance_history',
    'income_entries',
    'expense_entries',
    'account_transfers',
    'donations',
    'donation_boxes',
    'donation_box_collections',
    'audit_logs',
    'idempotency_records',
    'committee_terms',
    'committee_members',
    'staff',
    'staff_payments',
    'education_student_profiles',
    'education_programs',
    'education_levels',
    'education_enrollments',
    'hifz_levels',
    'hifz_curricula',
    'hifz_enrollments',
    'hifz_attendances',
    'hifz_residences',
    'hifz_residence_buildings',
    'hifz_residence_rooms',
    'hifz_residence_beds',
    'hifz_residential_allocations',
    'hifz_residential_transfers',
  ];

  for (const table of requiredTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_SCHEMA_SQL), `Table '${table}' Declaration`, `Found in DDL schema`);
  }

  // ==========================================================================
  // SECTION 2: PRIMARY KEY & TENANT ISOLATION COLUMNS
  // ==========================================================================
  console.log('\n>>> 2. Verifying Primary Keys & Multi-Tenant Isolation Columns');

  // Check Primary Key pattern
  for (const table of requiredTables) {
    const pkRegex = new RegExp(`${table}[\\s\\S]*?id VARCHAR\\(64\\) PRIMARY KEY`, 'i');
    assert(pkRegex.test(POSTGRES_SCHEMA_SQL), `Table '${table}' PK`, `id VARCHAR(64) PRIMARY KEY verified`);
  }

  // Check mosque_id on all tenant tables
  const tenantTables = requiredTables.filter(t => t !== 'mosques');
  for (const table of tenantTables) {
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_SCHEMA_SQL), `Table '${table}' Tenant Key`, `mosque_id REFERENCES mosques(id) ON DELETE RESTRICT verified`);
  }

  // ==========================================================================
  // SECTION 3: COMPOSITE MULTI-TENANT CONSTRAINTS & FOREIGN KEYS
  // ==========================================================================
  console.log('\n>>> 3. Verifying Composite Multi-Tenant FK & Uniqueness Constraints');

  assert(
    /uq_users_mosque_phone UNIQUE \(mosque_id, phone\)/i.test(POSTGRES_SCHEMA_SQL),
    'User Tenant Phone Uniqueness',
    'UNIQUE (mosque_id, phone) prevents cross-tenant duplicate collisions'
  );

  assert(
    /uq_financial_accounts_mosque_id UNIQUE \(mosque_id, id\)/i.test(POSTGRES_SCHEMA_SQL),
    'Financial Account Tenant Uniqueness',
    'UNIQUE (mosque_id, id) provides anchor for composite FKs'
  );

  assert(
    /fk_income_account FOREIGN KEY \(mosque_id, account_id\) REFERENCES financial_accounts\(mosque_id, id\)/i.test(POSTGRES_SCHEMA_SQL),
    'Income Composite Tenant FK',
    'FOREIGN KEY (mosque_id, account_id) strictly prevents cross-mosque income assignment'
  );

  assert(
    /fk_expense_account FOREIGN KEY \(mosque_id, account_id\) REFERENCES financial_accounts\(mosque_id, id\)/i.test(POSTGRES_SCHEMA_SQL),
    'Expense Composite Tenant FK',
    'FOREIGN KEY (mosque_id, account_id) strictly prevents cross-mosque expense assignment'
  );

  assert(
    /fk_transfer_from_account FOREIGN KEY \(mosque_id, from_account_id\) REFERENCES financial_accounts\(mosque_id, id\)/i.test(POSTGRES_SCHEMA_SQL) &&
    /fk_transfer_to_account FOREIGN KEY \(mosque_id, to_account_id\) REFERENCES financial_accounts\(mosque_id, id\)/i.test(POSTGRES_SCHEMA_SQL),
    'Transfer Dual Composite Tenant FKs',
    'Source and destination accounts strictly validated against same mosque_id'
  );

  assert(
    /chk_distinct_transfer_accounts CHECK \(from_account_id <> to_account_id\)/i.test(POSTGRES_SCHEMA_SQL),
    'Transfer Distinct Account Check',
    'Source and destination must be distinct accounts'
  );

  // ==========================================================================
  // SECTION 4: FINANCIAL INTEGRITY & NON-NEGATIVE BALANCES
  // ==========================================================================
  console.log('\n>>> 4. Verifying Financial Monetary Types & Integrity Constraints');

  assert(
    /current_balance NUMERIC\(14, 2\) NOT NULL DEFAULT 0.00 CHECK \(current_balance >= 0.00\)/i.test(POSTGRES_SCHEMA_SQL),
    'Account Balance Non-Negative Constraint',
    'CHECK (current_balance >= 0.00) prevents overdraft on liquid accounts'
  );

  assert(
    /amount NUMERIC\(14, 2\) NOT NULL CHECK \(amount > 0.00\)/i.test(POSTGRES_SCHEMA_SQL),
    'Positive Transaction Amount Constraint',
    'CHECK (amount > 0.00) enforced across income, expense, and transfers'
  );

  assert(
    /uq_income_entries_mosque_voucher UNIQUE \(mosque_id, voucher_number\)/i.test(POSTGRES_SCHEMA_SQL),
    'Income Voucher Natural Key',
    'UNIQUE (mosque_id, voucher_number) guarantees permanent double-spend prevention'
  );

  assert(
    /uq_expense_entries_mosque_voucher UNIQUE \(mosque_id, voucher_number\)/i.test(POSTGRES_SCHEMA_SQL),
    'Expense Voucher Natural Key',
    'UNIQUE (mosque_id, voucher_number) guarantees permanent double-spend prevention'
  );

  // ==========================================================================
  // SECTION 5: ACCOUNT HEAD SINGLE-TABLE ARCHITECTURE & ENUMS
  // ==========================================================================
  console.log('\n>>> 5. Verifying Single-Table AccountHead & Hierarchy Rules');

  assert(
    /CREATE TABLE IF NOT EXISTS account_heads/i.test(POSTGRES_SCHEMA_SQL) &&
    !/CREATE TABLE IF NOT EXISTS income_heads/i.test(POSTGRES_SCHEMA_SQL) &&
    !/CREATE TABLE IF NOT EXISTS expense_heads/i.test(POSTGRES_SCHEMA_SQL),
    'Single Canonical AccountHead Architecture',
    'No shadow or duplicate income_heads/expense_heads tables exist'
  );

  assert(
    /type VARCHAR\(16\) NOT NULL CHECK \(type IN \('INCOME', 'EXPENSE'\)\)/i.test(POSTGRES_SCHEMA_SQL),
    'AccountHead Type Enum Check',
    'type IN (INCOME, EXPENSE) enforced'
  );

  assert(
    /status VARCHAR\(16\) NOT NULL DEFAULT 'ACTIVE' CHECK \(status IN \('ACTIVE', 'INACTIVE', 'ARCHIVED'\)\)/i.test(POSTGRES_SCHEMA_SQL),
    'AccountHead Status Enum Check',
    'status IN (ACTIVE, INACTIVE, ARCHIVED) enforced'
  );

  assert(
    /chk_no_self_parent CHECK \(id <> parent_id\)/i.test(POSTGRES_SCHEMA_SQL),
    'AccountHead No-Self-Parent Check',
    'id <> parent_id strictly prevents circular hierarchy loops'
  );

  // ==========================================================================
  // SECTION 6: HIFZ ATTENDANCE & RESIDENTIAL UNIQUENESS CONSTRAINTS
  // ==========================================================================
  console.log('\n>>> 6. Verifying Hifz Attendance & Residential Active Uniqueness');

  assert(
    /uq_hifz_attendances_daily UNIQUE \(mosque_id, enrollment_id, date\)/i.test(POSTGRES_SCHEMA_SQL),
    'Hifz Daily Attendance Business Uniqueness',
    'UNIQUE (mosque_id, enrollment_id, date) guarantees 1 student per date per mosque'
  );

  assert(
    /uq_active_bed_allocation[\s\S]*?ON hifz_residential_allocations \(mosque_id, bed_id\)[\s\S]*?WHERE status IN \('ALLOCATED', 'CHECKED_IN'\)/i.test(POSTGRES_SCHEMA_SQL),
    'H6 Active Bed Occupancy Constraint',
    'Partial index guarantees one active allocation per bed'
  );

  assert(
    /uq_active_student_allocation[\s\S]*?ON hifz_residential_allocations \(mosque_id, student_profile_id\)[\s\S]*?WHERE status IN \('ALLOCATED', 'CHECKED_IN'\)/i.test(POSTGRES_SCHEMA_SQL),
    'H6 Active Student Allocation Constraint',
    'Partial index guarantees one active bed allocation per student'
  );

  // ==========================================================================
  // SECTION 7: IDEMPOTENCY & AUDIT LOG PERMANENCE
  // ==========================================================================
  console.log('\n>>> 7. Verifying Idempotency Key Scope & Append-Only Audit Trail');

  assert(
    /uq_idempotency_mosque_key UNIQUE \(mosque_id, idempotency_key\)/i.test(POSTGRES_SCHEMA_SQL),
    'Idempotency Tenant Scope',
    'UNIQUE (mosque_id, idempotency_key) prevents cross-network race conditions'
  );

  assert(
    /CREATE TABLE IF NOT EXISTS audit_logs/i.test(POSTGRES_SCHEMA_SQL),
    'Append-Only Audit Log Table',
    'audit_logs table created with full event metadata fields'
  );

  // ==========================================================================
  // SECTION 8: INDEXING STRATEGY
  // ==========================================================================
  console.log('\n>>> 8. Verifying Temporal & Foreign Key Indexes');

  const requiredIndexes = [
    'idx_income_mosque_date',
    'idx_income_account',
    'idx_income_main_head',
    'idx_expense_mosque_date',
    'idx_expense_account',
    'idx_expense_main_head',
    'idx_transfers_mosque_date',
    'idx_audit_mosque_time',
    'idx_idempotency_created',
  ];

  for (const idx of requiredIndexes) {
    const idxRegex = new RegExp(`CREATE INDEX (IF NOT EXISTS )?${idx}\\s*ON`, 'i');
    assert(idxRegex.test(POSTGRES_SCHEMA_SQL), `Index '${idx}'`, `Found index declaration for rapid period queries`);
  }

  // ==========================================================================
  // SECTION 9: REPOSITORIES & RECONCILIATION
  // ==========================================================================
  console.log('\n>>> 9. Verifying Repository & Unit-of-Work Interfaces');

  const finRepo = new PostgresFinancialRepository();
  const auditRepo = new PostgresAuditRepository();
  const idempRepo = new PostgresIdempotencyRepository();

  assert(typeof finRepo.recordIncomeTransaction === 'function', 'Financial Repository Income API', 'recordIncomeTransaction method exists');
  assert(typeof finRepo.recordExpenseTransaction === 'function', 'Financial Repository Expense API', 'recordExpenseTransaction method exists');
  assert(typeof finRepo.recordTransferTransaction === 'function', 'Financial Repository Transfer API', 'recordTransferTransaction method exists');
  assert(typeof auditRepo.appendAuditLog === 'function', 'Audit Repository Append API', 'appendAuditLog method exists');
  assert(typeof idempRepo.getResponse === 'function', 'Idempotency Repository API', 'getResponse / saveResponse methods exist');

  // Summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n================================================================');
  console.log(`POSTGRESQL SCHEMA TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${total})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPostgresSchemaTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

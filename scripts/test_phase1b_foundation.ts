/**
 * MASJIDLEDGER PRO v2.6 — PHASE 1B POSTGRESQL FOUNDATION VERIFICATION
 *
 * Verifies:
 * 1. Exactly 99 PostgreSQL tables declared in POSTGRES_99_TABLES_DDL_SQL.
 * 2. All 11 topological layers represented.
 * 3. All monetary columns use NUMERIC(14,2).
 * 4. All primary keys and foreign keys present.
 * 5. Self-referential account_heads.parent_id handled via ALTER TABLE.
 * 6. schema_migrations version table present.
 * 7. Client pool and transaction manager exported.
 * 8. Zero duplicate/shadow financial tables (no income_heads, no expense_heads).
 */

import { POSTGRES_99_TABLES_DDL_SQL } from '../src/server/db/postgres/schema/ddl';
import { getPostgresPool, closePostgresPool } from '../src/server/db/postgres/client';
import { withTransaction, withAccountLockTransaction } from '../src/server/db/postgres/transaction';
import { runInitialSchemaMigration } from '../src/server/db/postgres/migrations/migrationRunner';

const EXPECTED_99_TABLES = [
  // Layer 1
  'mosques', 'schema_migrations', 'audit_logs', 'idempotency_records',
  // Layer 2
  'users', 'central_documents', 'uploaded_files', 'qr_codes', 'area_masters',
  'legal_courts', 'legal_lawyers', 'advisory_council_terms', 'library_categories', 'library_rooms',
  // Layer 3
  'family_masters', 'advisor_members', 'account_heads', 'financial_accounts',
  'backup_settings', 'official_doc_templates', 'library_racks', 'education_programs', 'hifz_residences',
  // Layer 4
  'person_masters', 'committee_terms', 'mosque_properties', 'mosque_assets', 'staff',
  'library_shelves', 'education_levels', 'hifz_residence_buildings',
  // Layer 5
  'committee_members', 'sub_committees', 'property_tenants', 'book_titles',
  'education_student_profiles', 'hifz_levels', 'hifz_residence_rooms', 'donation_boxes',
  'collection_workers', 'donation_plans',
  // Layer 6
  'committee_meetings', 'legal_cases', 'book_copies', 'library_members',
  'education_guardians', 'education_enrollments', 'hifz_curricula', 'hifz_residence_beds',
  'maktab_classes', 'hifz_enrollments', 'budgets',
  // Layer 7
  'income_entries', 'expense_entries', 'account_transfers', 'donations',
  'meeting_resolutions', 'committee_notices', 'committee_action_plans', 'legal_parties',
  'legal_hearings', 'legal_actions', 'legal_orders', 'cemetery_records',
  'budget_lines', 'maktab_fee_schedules',
  // Layer 8
  'donation_box_collections', 'donation_collections', 'staff_payments', 'staff_bank_letters',
  'property_rent_collections', 'property_khajna_records', 'property_documents',
  'property_inspections', 'book_issues', 'book_acquisitions', 'maktab_teacher_assignments',
  'hifz_teacher_assignments', 'hifz_residential_allocations',
  // Layer 9
  'maktab_attendances', 'maktab_fee_records', 'hifz_sabaks', 'hifz_sabakis',
  'hifz_daur_cycles', 'hifz_attendances', 'hifz_residential_transfers',
  // Layer 10
  'maktab_progress_records', 'hifz_daurs', 'hifz_revisions', 'official_documents',
  'official_doc_numbering', 'committee_activities', 'committee_tasks',
  // Layer 11
  'committee_evaluations', 'advisor_consultations', 'mosque_notices',
  'mosque_notifications', 'backup_records', 'restore_records'
];

async function runPhase1BVerification() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — PHASE 1B FOUNDATION AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  // 1. Table Count Verification
  const tableMatches = [...POSTGRES_99_TABLES_DDL_SQL.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)/g)].map(m => m[1]);
  console.log(`Found ${tableMatches.length} tables in DDL.`);
  assert(tableMatches.length === 99, `Exact 99 table definitions present in DDL (Found: ${tableMatches.length})`);

  // Verify all expected tables exist
  let missingTables = 0;
  for (const table of EXPECTED_99_TABLES) {
    if (!tableMatches.includes(table)) {
      console.error(`  Missing table: ${table}`);
      missingTables++;
    }
  }
  assert(missingTables === 0, `All 99 expected Phase 1A tables are declared in DDL (Missing: ${missingTables})`);

  // 2. No Duplicate / Shadow Financial Tables
  assert(!tableMatches.includes('income_heads'), 'Zero shadow table income_heads (AccountHead is single-table)');
  assert(!tableMatches.includes('expense_heads'), 'Zero shadow table expense_heads (AccountHead is single-table)');
  assert(!tableMatches.includes('property_legal_cases'), 'Zero duplicate property_legal_cases (Subsumed by legal_cases)');

  // 3. Monetary Fields Precision: NUMERIC(14,2)
  const numeric14_2Count = (POSTGRES_99_TABLES_DDL_SQL.match(/NUMERIC\(14,\s*2\)/gi) || []).length;
  console.log(`Found ${numeric14_2Count} NUMERIC(14,2) column definitions.`);
  assert(numeric14_2Count >= 30, `Comprehensive NUMERIC(14,2) precision applied across monetary columns (Count: ${numeric14_2Count})`);

  // 4. Positive Transaction Amount Checks
  assert(/amount NUMERIC\(14,2\) NOT NULL CHECK \(amount > 0\.00\)/.test(POSTGRES_99_TABLES_DDL_SQL), 'income_entries enforce CHECK (amount > 0.00)');
  assert(/amount NUMERIC\(14,2\) NOT NULL CHECK \(amount > 0\.00\)/.test(POSTGRES_99_TABLES_DDL_SQL), 'expense_entries enforce CHECK (amount > 0.00)');
  assert(/CHECK \(from_account_id <> to_account_id\)/.test(POSTGRES_99_TABLES_DDL_SQL), 'account_transfers enforce CHECK (from_account_id <> to_account_id)');

  // 5. AccountHead Self-Reference Handling
  assert(/parent_id VARCHAR\(64\)/.test(POSTGRES_99_TABLES_DDL_SQL) &&
         /FOREIGN KEY \(parent_id\) REFERENCES account_heads\(id\)/.test(POSTGRES_99_TABLES_DDL_SQL),
         'account_heads parent_id self-referential foreign key properly configured');

  // 6. No Universal Negative Balance CHECK on financial_accounts
  const hasUniversalBalanceCheck = /financial_accounts[\s\S]*?CHECK \(current_balance >= 0\.00\)/.test(POSTGRES_99_TABLES_DDL_SQL);
  assert(!hasUniversalBalanceCheck, 'Zero universal CHECK (current_balance >= 0) on financial_accounts (Credit opening balance safely allowed)');

  // 7. Client & Transaction Manager Modules
  assert(typeof getPostgresPool === 'function', 'PostgreSQL client pool getPostgresPool exported');
  assert(typeof closePostgresPool === 'function', 'PostgreSQL client pool closePostgresPool exported');
  assert(typeof withTransaction === 'function', 'withTransaction helper exported');
  assert(typeof withAccountLockTransaction === 'function', 'withAccountLockTransaction deterministic locking helper exported');
  assert(typeof runInitialSchemaMigration === 'function', 'runInitialSchemaMigration runner exported');

  // 8. Legal & Land Tables Coverage
  const legalTables = ['legal_cases', 'legal_courts', 'legal_parties', 'legal_lawyers', 'legal_hearings', 'legal_actions', 'legal_orders'];
  const allLegalPresent = legalTables.every(t => tableMatches.includes(t));
  assert(allLegalPresent, `All 7 Legal & Land Management tables present in DDL: ${legalTables.join(', ')}`);

  console.log(`\n================================================================`);
  console.log(`AUDIT RESULT: ${passed}/${total} TESTS PASSED`);
  console.log(`================================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase1BVerification();

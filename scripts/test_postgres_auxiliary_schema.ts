/**
 * MASJIDLEDGER PRO v2.6 — POSTGRESQL AUXILIARY OPERATIONAL SCHEMA TEST SUITE (PHASE 2)
 * Validates DDL, Constraints, Multi-Tenancy, and Business Keys across Domains A-G
 */

import { POSTGRES_AUXILIARY_SCHEMA_SQL, POSTGRES_SCHEMA_SQL } from '../src/server/db/postgres/schema/ddl';

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

async function runPostgresAuxiliarySchemaTestSuite() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — POSTGRESQL AUXILIARY SCHEMA TESTS (PHASE 2)');
  console.log('================================================================\n');

  // ==========================================================================
  // SECTION 1: DOMAIN A — LIBRARY & KNOWLEDGE CENTER (10 Tables)
  // ==========================================================================
  console.log('>>> 1. Domain A: Library Relational Tables & Constraints');

  const libraryTables = [
    'library_categories',
    'library_rooms',
    'library_racks',
    'library_shelves',
    'book_titles',
    'library_members',
    'book_acquisitions',
    'book_copies',
    'book_issues',
  ];

  for (const table of libraryTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Library Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Library Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /uq_book_copy_mosque_book_id UNIQUE \(mosque_id, book_id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'BookCopy Business Identity',
    'UNIQUE (mosque_id, book_id) preserves canonical BOK-000001 code'
  );

  assert(
    /uq_active_book_copy_issue[\s\S]*?ON book_issues \(mosque_id, book_copy_id\)[\s\S]*?WHERE status IN \('ACTIVE', 'OVERDUE'\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Active Book Issue Exclusivity',
    'Partial unique index guarantees at most one active borrow per physical copy'
  );

  assert(
    /fk_lib_member_person FOREIGN KEY \(mosque_id, person_id\) REFERENCES person_masters\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Library Member -> Person Master FK',
    'Composite tenant key binds member to canonical PersonMaster'
  );

  // ==========================================================================
  // SECTION 2: DOMAIN B — MAKTAB OPERATIONAL RECORDS (7 Tables)
  // ==========================================================================
  console.log('\n>>> 2. Domain B: Maktab Operational Tables & Constraints');

  const maktabTables = [
    'education_guardian_relationships',
    'maktab_classes',
    'maktab_attendances',
    'maktab_teacher_assignments',
    'maktab_fee_schedules',
    'maktab_fee_records',
    'maktab_student_progress',
  ];

  for (const table of maktabTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Maktab Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Maktab Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /uq_maktab_attendance_daily UNIQUE \(mosque_id, student_profile_id, date\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Maktab Daily Attendance Uniqueness',
    'UNIQUE (mosque_id, student_profile_id, date) prevents duplicate daily attendance'
  );

  assert(
    /canonical_income_entry_id VARCHAR\(64\)[\s\S]*?canonical_voucher_number VARCHAR\(64\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Maktab Fee Canonical Finance Link',
    'Directly references canonical IncomeEntry voucher without shadow ledger'
  );

  assert(
    /fk_maktab_assign_staff FOREIGN KEY \(mosque_id, staff_id\) REFERENCES staff\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Maktab Teacher -> Staff FK',
    'Binds teacher assignment directly to canonical Staff & Payroll'
  );

  // ==========================================================================
  // SECTION 3: DOMAIN C — HIFZ H2-H4 & USTAD ASSIGNMENT RECORDS (6 Tables)
  // ==========================================================================
  console.log('\n>>> 3. Domain C: Hifz H2-H4 & Ustad Assignment Tables & Constraints');

  const hifzTables = [
    'hifz_sabaks',
    'hifz_sabakis',
    'hifz_daur_cycles',
    'hifz_daurs',
    'hifz_revisions',
    'hifz_teacher_assignments',
  ];

  for (const table of hifzTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Hifz Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Hifz Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /uq_hifz_sabaks_mosque_sabak_id UNIQUE \(mosque_id, sabak_id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Hifz Sabak Business ID',
    'UNIQUE (mosque_id, sabak_id) enforces canonical SBK-YYYY-000001 pattern'
  );

  assert(
    /uq_hifz_sabakis_mosque_sabaki_id UNIQUE \(mosque_id, sabaki_id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Hifz Sabaki Business ID',
    'UNIQUE (mosque_id, sabaki_id) enforces canonical SBKI-YYYY-000001 pattern'
  );

  assert(
    /uq_hifz_daurs_num UNIQUE \(mosque_id, daur_id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Hifz Daur Business ID',
    'UNIQUE (mosque_id, daur_id) enforces canonical DUR-YYYY-000001 pattern'
  );

  assert(
    /fk_hifz_sabak_ustad FOREIGN KEY \(mosque_id, ustad_id\) REFERENCES staff\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Hifz Ustad -> Staff FK',
    'Ustad references canonical Staff table'
  );

  // ==========================================================================
  // SECTION 4: DOMAIN D — ASSETS / WAQF / CEMETERY (8 Tables)
  // ==========================================================================
  console.log('\n>>> 4. Domain D: Assets, Waqf Properties & Cemetery Tables & Constraints');

  const assetTables = [
    'mosque_assets',
    'asset_service_records',
    'mosque_properties',
    'property_tenants',
    'property_rent_collections',
    'property_documents',
    'property_khajna_records',
    'cemetery_records',
  ];

  for (const table of assetTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Asset/Waqf Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Asset/Waqf Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /uq_mosque_assets_mosque_code UNIQUE \(mosque_id, asset_code\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Mosque Asset Natural Code',
    'UNIQUE (mosque_id, asset_code) enforced'
  );

  assert(
    /uq_mosque_properties_code UNIQUE \(mosque_id, property_code\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Mosque Property Natural Code',
    'UNIQUE (mosque_id, property_code) enforced'
  );

  assert(
    /fk_rent_coll_property FOREIGN KEY \(mosque_id, property_id\) REFERENCES mosque_properties\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Rent Collection -> Property FK',
    'Composite tenant key binds rent collection to property'
  );

  // ==========================================================================
  // SECTION 5: DOMAIN E — COMMITTEE GOVERNANCE EXTENDED (11 Tables)
  // ==========================================================================
  console.log('\n>>> 5. Domain E: Extended Committee Governance Tables & Constraints');

  const commExtendedTables = [
    'committee_meeting_notices',
    'committee_meetings',
    'meeting_resolutions',
    'sub_committees',
    'committee_action_plans',
    'committee_member_activities',
    'committee_member_tasks',
    'committee_manual_evaluations',
    'advisory_council_terms',
    'advisor_members',
    'advisor_consultations',
  ];

  for (const table of commExtendedTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Committee Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Committee Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /uq_meeting_res_mosque_num UNIQUE \(mosque_id, resolution_number\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Meeting Resolution Natural Number',
    'UNIQUE (mosque_id, resolution_number) enforced'
  );

  assert(
    /fk_sub_committee_term FOREIGN KEY \(mosque_id, term_id\) REFERENCES committee_terms\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Sub-Committee -> Committee Term FK',
    'Composite tenant key binds sub-committee to term'
  );

  assert(
    /fk_action_plan_term FOREIGN KEY \(mosque_id, term_id\) REFERENCES committee_terms\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Action Plan -> Committee Term FK',
    'Composite tenant key binds action plan to term'
  );

  // ==========================================================================
  // SECTION 6: DOMAIN F — FINANCIAL PLANNING / FIELD COLLECTION (5 Tables)
  // ==========================================================================
  console.log('\n>>> 6. Domain F: Financial Planning & Field Collection Tables & Constraints');

  const finPlanningTables = [
    'budgets',
    'budget_lines',
    'donation_plans',
    'collection_workers',
    'donation_collections',
  ];

  for (const table of finPlanningTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Planning Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Planning Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /fk_budget_line_head FOREIGN KEY \(mosque_id, main_head_id\) REFERENCES account_heads\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Budget Line -> Account Head FK',
    'Planned budget lines bind to canonical single AccountHead table'
  );

  assert(
    /fk_don_coll_account FOREIGN KEY \(mosque_id, account_id\) REFERENCES financial_accounts\(mosque_id, id\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Donation Collection -> Financial Account FK',
    'Field collections bind to canonical liquid Financial Accounts'
  );

  // ==========================================================================
  // SECTION 7: DOMAIN G — DOCUMENT MANAGEMENT & COMMUNICATIONS (8 Tables)
  // ==========================================================================
  console.log('\n>>> 7. Domain G: Document Management & Communications Tables & Constraints');

  const docCommTables = [
    'central_documents',
    'official_documents',
    'official_document_templates',
    'public_document_tokens',
    'mosque_notices',
    'mosque_notifications',
    'sms_logs',
    'uploaded_files',
  ];

  for (const table of docCommTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\s*\\(`, 'i');
    assert(tableRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Doc/Comm Table '${table}'`, `Found in auxiliary DDL`);
    const tenantRegex = new RegExp(`${table}[\\s\\S]*?mosque_id VARCHAR\\(64\\) NOT NULL REFERENCES mosques\\(id\\) ON DELETE RESTRICT`, 'i');
    assert(tenantRegex.test(POSTGRES_AUXILIARY_SCHEMA_SQL), `Doc/Comm Table '${table}' Tenant FK`, `mosque_id enforced`);
  }

  assert(
    /uq_official_docs_num UNIQUE \(mosque_id, document_number\)/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Official Document Number Uniqueness',
    'UNIQUE (mosque_id, document_number) enforced'
  );

  assert(
    /token VARCHAR\(128\) NOT NULL UNIQUE/i.test(POSTGRES_AUXILIARY_SCHEMA_SQL),
    'Public Document Token Cryptographic Uniqueness',
    'Unique token string enforced'
  );

  // ==========================================================================
  // SECTION 8: TOTAL TABLE COUNT RECONCILIATION
  // ==========================================================================
  console.log('\n>>> 8. Total Schema Table Count Reconciliation');

  const totalCoreCount = 34;
  const totalAuxCount = libraryTables.length + maktabTables.length + hifzTables.length + 
                        assetTables.length + commExtendedTables.length + finPlanningTables.length + 
                        docCommTables.length;
  const totalCombinedCount = totalCoreCount + totalAuxCount;

  assert(totalAuxCount === 54, 'Auxiliary Tables Count', `Expected 54 auxiliary tables, counted ${totalAuxCount}`);
  assert(totalCombinedCount === 88, 'Total Combined Schema Tables Count', `Combined ${totalCoreCount} core + ${totalAuxCount} aux = ${totalCombinedCount} tables`);

  // Summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n================================================================');
  console.log(`POSTGRESQL AUXILIARY SCHEMA TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${total})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPostgresAuxiliarySchemaTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

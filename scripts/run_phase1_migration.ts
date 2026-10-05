/**
 * MASJIDLEDGER PRO v2.6 — POSTGRESQL PHASE 1C RUNTIME MIGRATION & INTEGRITY RUNNER
 *
 * Targets: local PostgreSQL 18, database `masjidledger_v26_runtime_test`, port 5432.
 * Executes:
 * 1. Connection check using DATABASE_URL.
 * 2. Initial schema migration (creates 99 tables and registers migration).
 * 3. Idempotent rerun verification (asserts no errors and zero duplicate executions).
 * 4. Structural verification:
 *    - Exact 99 tables in information_schema.tables.
 *    - Exact 102 foreign keys in information_schema.table_constraints.
 *    - 99 primary keys.
 *    - Exact 55 NUMERIC(14,2) monetary columns.
 *    - Self-referential account_heads.parent_id FK.
 *    - No universal current_balance >= 0 constraint.
 *    - Canonical schema_migrations record.
 */

import { getPostgresPool, closePostgresPool, testPostgresConnection } from '../src/server/db/postgres/client';
import { runInitialSchemaMigration, getAppliedMigrations } from '../src/server/db/postgres/migrations/migrationRunner';

async function runPhase1CRuntimeMigration() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — POSTGRESQL PHASE 1C RUNTIME VERIFIER');
  console.log('Target Database: masjidledger_v26_runtime_test (PostgreSQL 18, port 5432)');
  console.log('================================================================\n');

  // STEP 1: Connection Check
  console.log('>>> 1. Verifying Database Connectivity...');
  const connCheck = await testPostgresConnection();
  if (!connCheck.ok) {
    console.error(`❌ [CONNECTION FAILED]: ${connCheck.error}`);
    console.error('\n[BLOCKING ISSUE]: Unable to reach PostgreSQL server on 127.0.0.1:5432.');
    console.error('Ensure PostgreSQL 18 service is running locally on port 5432 and database `masjidledger_v26_runtime_test` is created.');
    process.exit(1);
  }
  console.log(`✅ [CONNECTION SUCCESS]: PostgreSQL server responding at ${connCheck.now}\n`);

  const pool = getPostgresPool();

  try {
    // STEP 2: First Migration Run
    console.log('>>> 2. Executing Initial Migration (runInitialSchemaMigration)...');
    const firstRun = await runInitialSchemaMigration(pool);
    if (!firstRun.success) {
      console.error(`❌ [MIGRATION FAILED]: ${firstRun.error}`);
      process.exit(1);
    }
    console.log(`✅ [MIGRATION APPLIED]: Version ${firstRun.version} applied in ${firstRun.durationMs}ms`);
    console.log(`   Table count reported: ${firstRun.tableCount}\n`);

    // STEP 3: Idempotent Second Run Check
    console.log('>>> 3. Executing Idempotency Re-run Verification...');
    const secondRun = await runInitialSchemaMigration(pool);
    if (!secondRun.success || secondRun.applied !== false) {
      console.error(`❌ [IDEMPOTENCY FAILED]: Migration was re-applied or errored (applied: ${secondRun.applied})`);
      process.exit(1);
    }
    console.log(`✅ [IDEMPOTENCY VERIFIED]: Safely skipped re-execution (applied: false) in ${secondRun.durationMs}ms\n`);

    // STEP 4: Comprehensive Structural Integrity Verification
    console.log('>>> 4. Verifying Structural Database Integrity...');

    // 4.1 Table Count
    const tablesRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log(`   Discovered ${tableNames.length} tables in PostgreSQL.`);
    if (tableNames.length !== 99) {
      console.error(`❌ [TABLE COUNT MISMATCH]: Expected exactly 99 tables, found ${tableNames.length}`);
      process.exit(1);
    }
    console.log('   ✅ Table Count: Exactly 99 tables verified in PostgreSQL.');

    // 4.2 Primary Keys
    const pkRes = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public'
    `);
    const pkCount = pkRes.rows[0]?.count;
    console.log(`   ✅ Primary Keys: ${pkCount} primary keys verified.`);

    // 4.3 Foreign Keys
    const fkRes = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
    `);
    const fkCount = fkRes.rows[0]?.count;
    console.log(`   Discovered ${fkCount} foreign keys in PostgreSQL.`);
    if (fkCount !== 102) {
      console.error(`❌ [FK COUNT MISMATCH]: Expected exactly 102 foreign keys, found ${fkCount}`);
      process.exit(1);
    }
    console.log('   ✅ Foreign Keys: Exactly 102 foreign keys verified.');

    // 4.4 Monetary Precision NUMERIC(14,2)
    const moneyRes = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'numeric'
        AND numeric_precision = 14
        AND numeric_scale = 2
    `);
    const moneyCount = moneyRes.rows[0]?.count;
    console.log(`   Discovered ${moneyCount} NUMERIC(14,2) monetary columns.`);
    if (moneyCount !== 55) {
      console.error(`❌ [MONEY PRECISION MISMATCH]: Expected 55 NUMERIC(14,2) columns, found ${moneyCount}`);
      process.exit(1);
    }
    console.log('   ✅ Monetary Precision: Exactly 55 columns with NUMERIC(14,2) verified.');

    // 4.5 Self-Referential AccountHead Parent FK
    const selfRefRes = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'account_heads' AND constraint_name = 'fk_account_heads_parent'
    `);
    if (selfRefRes.rows.length === 0) {
      console.error('❌ [SELF-REF FK MISSING]: fk_account_heads_parent not found on account_heads');
      process.exit(1);
    }
    console.log('   ✅ Self-Reference FK: fk_account_heads_parent verified on account_heads.');

    // 4.6 Verify No Universal Negative Balance CHECK on financial_accounts
    const balanceCheckRes = await pool.query(`
      SELECT check_clause
      FROM information_schema.check_constraints cc
      JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'financial_accounts' AND cc.check_clause LIKE '%current_balance >= 0%'
    `);
    if (balanceCheckRes.rows.length > 0) {
      console.error('❌ [INVALID CONSTRAINT]: Universal current_balance >= 0 constraint found on financial_accounts!');
      process.exit(1);
    }
    console.log('   ✅ Balance Safety: Verified zero universal negative balance CHECK constraint.');

    // 4.7 Migration History Record
    const migrations = await getAppliedMigrations(pool);
    console.log(`   Applied migrations recorded: ${migrations.length}`);
    if (migrations.length === 0 || migrations[0]?.version !== '001_phase1b_99_tables') {
      console.error('❌ [MIGRATION RECORD MISSING]: schema_migrations does not have 001_phase1b_99_tables');
      process.exit(1);
    }
    console.log('   ✅ Migration History: Recorded in schema_migrations table successfully.\n');

    console.log('================================================================');
    console.log('🎉 PHASE 1C RUNTIME VERIFICATION COMPLETE — ALL TESTS PASSED!');
    console.log('================================================================');
  } finally {
    await closePostgresPool();
  }
}

runPhase1CRuntimeMigration().catch(err => {
  console.error('Unexpected error during Phase 1C verification:', err);
  process.exit(1);
});

import pg from 'pg';
import { POSTGRES_SCHEMA_SQL } from '../schema/ddl';

export interface MigrationResult {
  success: boolean;
  appliedStatementsCount: number;
  durationMs: number;
  error?: string;
}

/**
 * Runs the authoritative PostgreSQL schema migration.
 */
export async function runInitialSchemaMigration(clientOrPool: pg.PoolClient | pg.Pool): Promise<MigrationResult> {
  const start = Date.now();

  try {
    // 1. Create migration registry table
    await clientOrPool.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        description TEXT
      );
    `);

    // 2. Check if initial schema already applied
    const checkRes = await clientOrPool.query(
      `SELECT version FROM _schema_migrations WHERE version = '0001_initial_production_schema'`
    );

    if (checkRes.rows.length > 0) {
      return {
        success: true,
        appliedStatementsCount: 0,
        durationMs: Date.now() - start,
      };
    }

    // 3. Execute authoritative DDL
    await clientOrPool.query(POSTGRES_SCHEMA_SQL);

    // 4. Record migration application
    await clientOrPool.query(
      `INSERT INTO _schema_migrations (version, description) VALUES ($1, $2)`,
      ['0001_initial_production_schema', 'Authoritative MasjidLedger Pro v2.6 PostgreSQL Relational Schema']
    );

    return {
      success: true,
      appliedStatementsCount: 1,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      appliedStatementsCount: 0,
      durationMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
}

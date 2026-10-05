import pg from 'pg';
import { POSTGRES_99_TABLES_DDL_SQL } from '../schema/ddl';
import { withTransaction } from '../transaction';

export interface MigrationResult {
  success: boolean;
  version: string;
  applied: boolean;
  tableCount?: number;
  durationMs: number;
  error?: string;
}

export interface AppliedMigration {
  version: string;
  description: string;
  applied_at: string;
  checksum?: string;
}

/**
 * Migration Runner for MasjidLedger Pro v2.6 PostgreSQL Foundation.
 * Tracks migrations via canonical 'schema_migrations' table.
 * Executes migrations inside transactions with safe re-run (idempotency).
 */
export async function runInitialSchemaMigration(
  poolOrClient: pg.Pool | pg.PoolClient
): Promise<MigrationResult> {
  const start = Date.now();
  const version = '001_phase1b_99_tables';
  const description = 'MasjidLedger Pro v2.6 Phase 1B Closed 99-Table Foundation';

  try {
    // 1. Ensure schema_migrations table exists (non-destructive)
    await poolOrClient.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64)
      );
    `);

    // 2. Check if migration already applied
    const checkRes = await poolOrClient.query(
      'SELECT version, applied_at FROM schema_migrations WHERE version = $1',
      [version]
    );

    if (checkRes.rows.length > 0) {
      // Already applied — safe re-run
      const countRes = await poolOrClient.query(
        "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
      );
      return {
        success: true,
        version,
        applied: false,
        tableCount: countRes.rows[0]?.count,
        durationMs: Date.now() - start,
      };
    }

    // 3. Execute authoritative 99-table DDL inside a transaction
    const target = poolOrClient as any;
    if (typeof target.connect === 'function' && 'totalCount' in target) {
      // It is a Pool
      await withTransaction(async (client) => {
        await client.query(POSTGRES_99_TABLES_DDL_SQL);
        await client.query(
          'INSERT INTO schema_migrations (version, description, checksum) VALUES ($1, $2, $3)',
          [version, description, 'sha256_phase1b_closed_99']
        );
      }, target as pg.Pool);
    } else {
      // It is already a Client
      await target.query('BEGIN');
      try {
        await target.query(POSTGRES_99_TABLES_DDL_SQL);
        await target.query(
          'INSERT INTO schema_migrations (version, description, checksum) VALUES ($1, $2, $3)',
          [version, description, 'sha256_phase1b_closed_99']
        );
        await target.query('COMMIT');
      } catch (e) {
        await target.query('ROLLBACK');
        throw e;
      }
    }

    // 4. Verify table count
    const finalCountRes = await poolOrClient.query(
      "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );

    return {
      success: true,
      version,
      applied: true,
      tableCount: finalCountRes.rows[0]?.count,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      version,
      applied: false,
      durationMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
}

/**
 * Returns all applied migrations from schema_migrations table.
 */
export async function getAppliedMigrations(
  poolOrClient: pg.Pool | pg.PoolClient
): Promise<AppliedMigration[]> {
  try {
    const res = await poolOrClient.query(
      'SELECT version, description, applied_at, checksum FROM schema_migrations ORDER BY applied_at ASC'
    );
    return res.rows;
  } catch {
    return [];
  }
}

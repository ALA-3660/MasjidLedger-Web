import pg from 'pg';
import { getPostgresPool } from './client';

/**
 * Unit of Work / Transaction execution helper.
 * Manages BEGIN, COMMIT, ROLLBACK and automatic client release.
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
  poolOverride?: pg.Pool
): Promise<T> {
  const pool = poolOverride || getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[PostgreSQL Transaction]: Rollback failed', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deterministic account-locking transaction helper for financial operations.
 * Sorts account IDs alphabetically to prevent deadlocks across concurrent transfers/expenses.
 */
export async function withAccountLockTransaction<T>(
  accountIds: string[],
  callback: (client: pg.PoolClient) => Promise<T>,
  poolOverride?: pg.Pool
): Promise<T> {
  return withTransaction(async (client) => {
    if (accountIds.length > 0) {
      // Deterministic alphabetical sort to eliminate deadlocks
      const sortedIds = [...new Set(accountIds)].sort();
      for (const accId of sortedIds) {
        await client.query(
          'SELECT id, current_balance FROM financial_accounts WHERE id = $1 FOR UPDATE',
          [accId]
        );
      }
    }
    return callback(client);
  }, poolOverride);
}

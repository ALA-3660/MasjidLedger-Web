import pg from 'pg';
import { getPostgresPool } from './dbClient';

export type TransactionCallback<T> = (client: pg.PoolClient) => Promise<T>;

/**
 * Executes a unit-of-work in an atomic PostgreSQL transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
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
      console.error('[PostgreSQL Transaction Manager] Error during rollback:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

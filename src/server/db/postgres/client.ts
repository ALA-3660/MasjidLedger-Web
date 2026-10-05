import pg from 'pg';

const { Pool } = pg;

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

let pool: pg.Pool | null = null;

/**
 * Get or initialize the PostgreSQL connection pool.
 * Uses environment variable DATABASE_URL with zero hardcoded credentials.
 */
export const getPostgresPool = (configOverride?: PostgresConfig): pg.Pool => {
  if (pool) return pool;

  const connectionString =
    configOverride?.connectionString ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      '[PostgreSQL Client Error]: DATABASE_URL environment variable is not defined and no connection configuration was provided.'
    );
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: configOverride?.maxConnections || 20,
    idleTimeoutMillis: configOverride?.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: configOverride?.connectionTimeoutMillis || 5000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
  });

  return pool;
};

/**
 * Close PostgreSQL pool gracefully.
 */
export const closePostgresPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

/**
 * Test connectivity against the target PostgreSQL database.
 */
export const testPostgresConnection = async (poolInstance?: pg.Pool): Promise<{ ok: boolean; now?: string; error?: string }> => {
  const p = poolInstance || getPostgresPool();
  try {
    const res = await p.query('SELECT NOW() AS now, current_database() AS db');
    return { ok: true, now: res.rows[0]?.now };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
};

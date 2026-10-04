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

export const getPostgresPool = (configOverride?: PostgresConfig): pg.Pool => {
  if (pool) return pool;

  const connectionString = configOverride?.connectionString || process.env.DATABASE_URL;

  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: configOverride?.maxConnections || 20,
      idleTimeoutMillis: configOverride?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: configOverride?.connectionTimeoutMillis || 5000,
    });
  } else {
    pool = new Pool({
      host: configOverride?.host || process.env.PGHOST || '127.0.0.1',
      port: configOverride?.port || Number(process.env.PGPORT) || 5432,
      user: configOverride?.user || process.env.PGUSER || 'masjidledger_app',
      password: configOverride?.password || process.env.PGPASSWORD || '',
      database: configOverride?.database || process.env.PGDATABASE || 'masjidledger_db',
      max: configOverride?.maxConnections || 20,
      idleTimeoutMillis: configOverride?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: configOverride?.connectionTimeoutMillis || 5000,
    });
  }

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err);
  });

  return pool;
};

export const closePostgresPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

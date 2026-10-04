import pg from 'pg';

export interface IdempotencyRecord {
  id: string;
  mosqueId: string;
  idempotencyKey: string;
  endpoint?: string;
  requestHash?: string;
  responsePayload: any;
  createdAt: string;
}

export class PostgresIdempotencyRepository {
  /**
   * Check if a cached idempotent response exists within the 48-hour retention window.
   */
  async getResponse(
    clientOrPool: pg.PoolClient | pg.Pool,
    mosqueId: string,
    idempotencyKey: string
  ): Promise<any | null> {
    const res = await clientOrPool.query(
      `SELECT response_payload, created_at 
       FROM idempotency_records 
       WHERE mosque_id = $1 AND idempotency_key = $2 
         AND created_at > NOW() - INTERVAL '48 HOURS'`,
      [mosqueId, idempotencyKey]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0].response_payload;
  }

  /**
   * Save an idempotent response into PostgreSQL.
   */
  async saveResponse(
    clientOrPool: pg.PoolClient | pg.Pool,
    record: {
      id: string;
      mosqueId: string;
      idempotencyKey: string;
      endpoint?: string;
      requestHash?: string;
      responsePayload: any;
    }
  ): Promise<void> {
    await clientOrPool.query(
      `INSERT INTO idempotency_records (
        id, mosque_id, idempotency_key, endpoint, request_hash, response_payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (mosque_id, idempotency_key) DO UPDATE
      SET response_payload = EXCLUDED.response_payload, created_at = NOW()`,
      [
        record.id,
        record.mosqueId,
        record.idempotencyKey,
        record.endpoint || null,
        record.requestHash || null,
        JSON.stringify(record.responsePayload),
      ]
    );
  }

  /**
   * Scheduled maintenance pruning of records older than 48 hours.
   */
  async pruneExpiredKeys(clientOrPool: pg.PoolClient | pg.Pool): Promise<number> {
    const res = await clientOrPool.query(
      `DELETE FROM idempotency_records WHERE created_at < NOW() - INTERVAL '48 HOURS'`
    );
    return res.rowCount || 0;
  }
}

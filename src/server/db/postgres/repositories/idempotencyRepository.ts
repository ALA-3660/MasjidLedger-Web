import pg from 'pg';
import { getPostgresPool } from '../client';

export interface PostgresIdempotencyRow {
  id: string;
  mosque_id: string | null;
  idempotency_key: string;
  endpoint: string;
  response_payload: any;
  created_at: Date;
  expires_at: Date;
}

export interface SaveIdempotencyDTO {
  id: string;
  mosqueId?: string | null;
  idempotencyKey: string;
  endpoint: string;
  responsePayload: any;
  ttlSeconds?: number;
}

export class PostgresIdempotencyRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * Get an active idempotency record by key and mosqueId.
   */
  async getRecord(
    idempotencyKey: string,
    mosqueId?: string | null,
    client?: pg.PoolClient
  ): Promise<PostgresIdempotencyRow | null> {
    const executor = client || this.pool;
    let query = `
      SELECT * FROM idempotency_records
      WHERE idempotency_key = $1
        AND expires_at > NOW()
    `;
    const params: any[] = [idempotencyKey];

    if (mosqueId) {
      query += ` AND (mosque_id = $2 OR mosque_id IS NULL)`;
      params.push(mosqueId);
    }

    const res = await executor.query<PostgresIdempotencyRow>(query, params);
    return res.rows[0] || null;
  }

  /**
   * Save an idempotency record with expiration TTL (defaults to 24 hours).
   */
  async saveRecord(
    dto: SaveIdempotencyDTO,
    client?: pg.PoolClient
  ): Promise<PostgresIdempotencyRow> {
    const executor = client || this.pool;
    const ttlSeconds = dto.ttlSeconds || 86400; // 24 hours default

    const query = `
      INSERT INTO idempotency_records (
        id, mosque_id, idempotency_key, endpoint, response_payload, created_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW(), NOW() + ($6 || ' seconds')::INTERVAL
      )
      ON CONFLICT (idempotency_key) DO UPDATE
      SET response_payload = EXCLUDED.response_payload,
          expires_at = EXCLUDED.expires_at
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId || null,
      dto.idempotencyKey,
      dto.endpoint,
      JSON.stringify(dto.responsePayload),
      String(ttlSeconds),
    ];

    const res = await executor.query<PostgresIdempotencyRow>(query, params);
    return res.rows[0];
  }

  /**
   * Delete expired idempotency records.
   */
  async cleanupExpired(client?: pg.PoolClient): Promise<number> {
    const executor = client || this.pool;
    const res = await executor.query(`DELETE FROM idempotency_records WHERE expires_at <= NOW()`);
    return res.rowCount || 0;
  }
}

import pg from 'pg';
import { getPostgresPool } from '../client';

export interface PostgresIdempotencyRow {
  id: string;
  mosque_id: string | null;
  idempotency_key: string;
  endpoint: string;
  request_hash: string | null;
  response_payload: any;
  created_at: Date;
  expires_at: Date;
}

export interface SaveIdempotencyDTO {
  id: string;
  mosqueId: string;
  idempotencyKey: string;
  endpoint: string;
  requestHash?: string | null;
  responsePayload: any;
  ttlSeconds?: number;
}

export class PostgresIdempotencyRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * Get an active idempotency record by key, endpoint, and mosqueId.
   */
  async getRecord(
    idempotencyKey: string,
    endpoint: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresIdempotencyRow | null> {
    const executor = client || this.pool;
    const query = `
      SELECT * FROM idempotency_records
      WHERE mosque_id = $1
        AND endpoint = $2
        AND idempotency_key = $3
        AND expires_at > NOW()
    `;
    const res = await executor.query<PostgresIdempotencyRow>(query, [mosqueId, endpoint, idempotencyKey]);
    return res.rows[0] || null;
  }

  /**
   * Save an idempotency record with expiration TTL (defaults to 24 hours).
   * Enforces composite unique constraint uq_idempotency_scope ON (mosque_id, endpoint, idempotency_key).
   */
  async saveRecord(
    dto: SaveIdempotencyDTO,
    client?: pg.PoolClient
  ): Promise<PostgresIdempotencyRow> {
    const executor = client || this.pool;
    const ttlSeconds = dto.ttlSeconds || 86400; // 24 hours default

    const query = `
      INSERT INTO idempotency_records (
        id, mosque_id, idempotency_key, endpoint, request_hash, response_payload, created_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW() + ($7 || ' seconds')::INTERVAL
      )
      ON CONFLICT (mosque_id, endpoint, idempotency_key) DO UPDATE
      SET response_payload = EXCLUDED.response_payload,
          request_hash = EXCLUDED.request_hash,
          expires_at = EXCLUDED.expires_at
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId,
      dto.idempotencyKey,
      dto.endpoint,
      dto.requestHash || null,
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

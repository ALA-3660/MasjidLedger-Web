import pg from 'pg';
import { getPostgresPool } from '../client';

export interface PostgresAuditLogRow {
  id: string;
  mosque_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_voucher_or_name: string | null;
  details: string | null;
  ip_address: string | null;
  meta_json: any | null;
  timestamp: Date;
}

export interface CreateAuditLogDTO {
  id: string;
  mosqueId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityVoucherOrName?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  metaJson?: any | null;
}

export interface AuditLogFilterOptions {
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class PostgresAuditRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * Append an immutable audit log record.
   */
  async insertLog(
    dto: CreateAuditLogDTO,
    client?: pg.PoolClient
  ): Promise<PostgresAuditLogRow> {
    const executor = client || this.pool;

    const query = `
      INSERT INTO audit_logs (
        id, mosque_id, user_id, user_name, user_role, action,
        entity_type, entity_id, entity_voucher_or_name, details,
        ip_address, meta_json, timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
      )
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId,
      dto.userId,
      dto.userName,
      dto.userRole,
      dto.action,
      dto.entityType,
      dto.entityId || null,
      dto.entityVoucherOrName || null,
      dto.details || null,
      dto.ipAddress || null,
      dto.metaJson ? JSON.stringify(dto.metaJson) : null,
    ];

    const res = await executor.query<PostgresAuditLogRow>(query, params);
    return res.rows[0];
  }

  /**
   * List audit logs for a mosque with filtering and pagination.
   */
  async listByMosque(
    mosqueId: string,
    filters?: AuditLogFilterOptions,
    client?: pg.PoolClient
  ): Promise<PostgresAuditLogRow[]> {
    const executor = client || this.pool;
    let query = `SELECT * FROM audit_logs WHERE mosque_id = $1`;
    const params: any[] = [mosqueId];
    let paramIdx = 2;

    if (filters?.entityType) {
      query += ` AND entity_type = $${paramIdx++}`;
      params.push(filters.entityType);
    }
    if (filters?.action) {
      query += ` AND action = $${paramIdx++}`;
      params.push(filters.action);
    }
    if (filters?.userId) {
      query += ` AND user_id = $${paramIdx++}`;
      params.push(filters.userId);
    }
    if (filters?.startDate) {
      query += ` AND timestamp >= $${paramIdx++}`;
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ` AND timestamp <= $${paramIdx++}`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY timestamp DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIdx++}`;
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ` OFFSET $${paramIdx++}`;
      params.push(filters.offset);
    }

    const res = await executor.query<PostgresAuditLogRow>(query, params);
    return res.rows;
  }

  /**
   * Get an audit log by ID and mosqueId.
   */
  async getById(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresAuditLogRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresAuditLogRow>(
      `SELECT * FROM audit_logs WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }
}

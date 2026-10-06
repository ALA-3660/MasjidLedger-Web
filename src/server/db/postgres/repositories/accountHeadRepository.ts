import pg from 'pg';
import { getPostgresPool } from '../client';

export interface PostgresAccountHeadRow {
  id: string;
  mosque_id: string;
  code: string;
  name_bn: string;
  name_en: string;
  type: 'INCOME' | 'EXPENSE';
  parent_id: string | null;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAccountHeadDTO {
  id: string;
  mosqueId: string;
  code: string;
  nameBn: string;
  nameEn: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string | null;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateAccountHeadDTO {
  nameBn?: string;
  nameEn?: string;
  description?: string;
  isActive?: boolean;
}

export class PostgresAccountHeadRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * List all account heads for a specific mosque with optional filtering.
   */
  async listByMosque(
    mosqueId: string,
    filters?: { type?: 'INCOME' | 'EXPENSE'; isActive?: boolean },
    client?: pg.PoolClient
  ): Promise<PostgresAccountHeadRow[]> {
    const executor = client || this.pool;
    let query = `
      SELECT id, mosque_id, code, name_bn, name_en, type, parent_id,
             description, is_system, is_active, created_by, created_at, updated_at
      FROM account_heads
      WHERE mosque_id = $1
    `;
    const params: any[] = [mosqueId];
    let paramIndex = 2;

    if (filters?.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(filters.isActive);
    }

    query += ` ORDER BY code ASC`;
    const res = await executor.query<PostgresAccountHeadRow>(query, params);
    return res.rows;
  }

  /**
   * Get a single account head by ID and Mosque ID (Enforcing Mosque Isolation).
   */
  async getById(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresAccountHeadRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresAccountHeadRow>(
      `SELECT * FROM account_heads WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Get a single account head by Code and Mosque ID.
   */
  async getByCode(
    code: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresAccountHeadRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresAccountHeadRow>(
      `SELECT * FROM account_heads WHERE code = $1 AND mosque_id = $2`,
      [code, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Create a new Account Head (Main head or Sub head).
   * Enforces max depth = 2 (parent must be a root head with parent_id = NULL).
   */
  async create(
    dto: CreateAccountHeadDTO,
    client?: pg.PoolClient
  ): Promise<PostgresAccountHeadRow> {
    const executor = client || this.pool;

    if (dto.parentId) {
      const parent = await this.getById(dto.parentId, dto.mosqueId, client);
      if (!parent) {
        throw new Error(`[AccountHeadRepository] Parent account head ${dto.parentId} not found in mosque ${dto.mosqueId}`);
      }
      if (parent.parent_id !== null) {
        throw new Error(`[AccountHeadRepository] Maximum hierarchy depth of 2 exceeded. Sub-head cannot have sub-heads.`);
      }
      if (parent.type !== dto.type) {
        throw new Error(`[AccountHeadRepository] Sub-head type '${dto.type}' must match parent type '${parent.type}'`);
      }
    }

    const query = `
      INSERT INTO account_heads (
        id, mosque_id, code, name_bn, name_en, type, parent_id,
        description, is_system, is_active, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      RETURNING *
    `;
    const params = [
      dto.id,
      dto.mosqueId,
      dto.code,
      dto.nameBn,
      dto.nameEn,
      dto.type,
      dto.parentId || null,
      dto.description || null,
      dto.isSystem ?? false,
      dto.isActive ?? true,
      dto.createdBy || null,
    ];

    const res = await executor.query<PostgresAccountHeadRow>(query, params);
    return res.rows[0];
  }

  /**
   * Update permitted display fields of an Account Head.
   * Immutable fields: id, mosque_id, code, type cannot be altered.
   */
  async update(
    id: string,
    mosqueId: string,
    dto: UpdateAccountHeadDTO,
    client?: pg.PoolClient
  ): Promise<PostgresAccountHeadRow | null> {
    const executor = client || this.pool;

    const existing = await this.getById(id, mosqueId, client);
    if (!existing) {
      return null;
    }

    const nameBn = dto.nameBn !== undefined ? dto.nameBn : existing.name_bn;
    const nameEn = dto.nameEn !== undefined ? dto.nameEn : existing.name_en;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const isActive = dto.isActive !== undefined ? dto.isActive : existing.is_active;

    const query = `
      UPDATE account_heads
      SET name_bn = $1,
          name_en = $2,
          description = $3,
          is_active = $4,
          updated_at = NOW()
      WHERE id = $5 AND mosque_id = $6
      RETURNING *
    `;

    const res = await executor.query<PostgresAccountHeadRow>(query, [
      nameBn,
      nameEn,
      description,
      isActive,
      id,
      mosqueId,
    ]);

    return res.rows[0] || null;
  }

  /**
   * Usage check: returns whether an account head is used in income, expense, or has child subheads.
   */
  async checkUsage(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<{ inIncome: number; inExpense: number; childCount: number }> {
    const executor = client || this.pool;

    const incRes = await executor.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM income_entries WHERE (main_head_id = $1 OR sub_head_id = $1) AND mosque_id = $2`,
      [id, mosqueId]
    );
    const expRes = await executor.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM expense_entries WHERE (main_head_id = $1 OR sub_head_id = $1) AND mosque_id = $2`,
      [id, mosqueId]
    );
    const childRes = await executor.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM account_heads WHERE parent_id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );

    return {
      inIncome: parseInt(incRes.rows[0]?.count || '0', 10),
      inExpense: parseInt(expRes.rows[0]?.count || '0', 10),
      childCount: parseInt(childRes.rows[0]?.count || '0', 10),
    };
  }
}

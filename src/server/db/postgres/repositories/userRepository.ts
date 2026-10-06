import pg from 'pg';
import { getPostgresPool } from '../client';
import { withTransaction } from '../transaction';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface PostgresUserRow {
  id: string;
  mosque_id: string;
  username: string | null;
  name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  role: string;
  permissions: string[];
  status: UserStatus;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  id: string;
  mosqueId: string;
  username?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  passwordHash: string;
  role: string;
  permissions?: string[];
  status?: UserStatus;
}

export interface UpdateUserProfileDTO {
  name?: string;
  phone?: string;
  email?: string | null;
  username?: string | null;
  userId?: string; // actor for audit
  userName?: string;
  userRole?: string;
  ipAddress?: string;
}

export interface UpdateUserRBACDTO {
  role: string;
  permissions: string[];
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  ipAddress?: string;
}

export class PostgresUserRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * Find a user by ID and Mosque ID (Enforces Tenant Isolation).
   */
  async findById(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresUserRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresUserRow>(
      `SELECT * FROM users WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Find a user by login identifier (phone, email, or username) within a mosque.
   */
  async findByLoginIdentifier(
    loginId: string,
    mosqueId?: string,
    client?: pg.PoolClient
  ): Promise<PostgresUserRow | null> {
    const executor = client || this.pool;
    let query = `
      SELECT * FROM users
      WHERE (phone = $1 OR email = $1 OR username = $1)
    `;
    const params: any[] = [loginId];

    if (mosqueId) {
      query += ` AND mosque_id = $2`;
      params.push(mosqueId);
    }

    query += ` LIMIT 1`;
    const res = await executor.query<PostgresUserRow>(query, params);
    return res.rows[0] || null;
  }

  /**
   * List all users for a specific mosque with optional status/role filter.
   */
  async listByMosque(
    mosqueId: string,
    filters?: { role?: string; status?: UserStatus },
    client?: pg.PoolClient
  ): Promise<PostgresUserRow[]> {
    const executor = client || this.pool;
    let query = `SELECT * FROM users WHERE mosque_id = $1`;
    const params: any[] = [mosqueId];
    let paramIdx = 2;

    if (filters?.role) {
      query += ` AND role = $${paramIdx++}`;
      params.push(filters.role);
    }
    if (filters?.status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY created_at ASC`;
    const res = await executor.query<PostgresUserRow>(query, params);
    return res.rows;
  }

  /**
   * Create a new User record with password hash and permissions.
   */
  async create(
    dto: CreateUserDTO,
    client?: pg.PoolClient
  ): Promise<PostgresUserRow> {
    const executor = client || this.pool;
    const query = `
      INSERT INTO users (
        id, mosque_id, username, name, phone, email, password_hash,
        role, permissions, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, NOW(), NOW()
      )
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId,
      dto.username || null,
      dto.name,
      dto.phone,
      dto.email || null,
      dto.passwordHash,
      dto.role,
      JSON.stringify(dto.permissions || []),
      dto.status || 'ACTIVE',
    ];

    const res = await executor.query<PostgresUserRow>(query, params);
    return res.rows[0];
  }

  /**
   * Update permitted user profile fields.
   */
  async updateProfile(
    id: string,
    mosqueId: string,
    dto: UpdateUserProfileDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresUserRow | null> {
    const executeLogic = async (client: pg.PoolClient) => {
      const existing = await this.findById(id, mosqueId, client);
      if (!existing) return null;

      const query = `
        UPDATE users
        SET name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            email = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE email END,
            username = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE username END,
            updated_at = NOW()
        WHERE id = $5 AND mosque_id = $6
        RETURNING *
      `;

      const res = await client.query<PostgresUserRow>(query, [
        dto.name !== undefined ? dto.name : null,
        dto.phone !== undefined ? dto.phone : null,
        dto.email !== undefined ? dto.email : null,
        dto.username !== undefined ? dto.username : null,
        id,
        mosqueId,
      ]);

      const updatedUser = res.rows[0];

      if (dto.userId) {
        await client.query(`
          INSERT INTO audit_logs (
            id, mosque_id, user_id, user_name, user_role, action,
            entity_type, entity_id, entity_voucher_or_name, details,
            ip_address, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, 'UPDATE', 'USER_PROFILE', $6, $7, $8, $9, NOW()
          )
        `, [
          `aud-usr-prof-${Date.now()}`,
          mosqueId,
          dto.userId,
          dto.userName || 'Admin',
          dto.userRole || 'ADMIN',
          id,
          updatedUser.name,
          `Updated profile for user ${updatedUser.name} (${updatedUser.phone})`,
          dto.ipAddress || '127.0.0.1',
        ]);
      }

      return updatedUser;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Update user status (ACTIVE, INACTIVE, SUSPENDED, BLOCKED).
   */
  async updateStatus(
    id: string,
    mosqueId: string,
    status: UserStatus,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresUserRow | null> {
    const executeLogic = async (client: pg.PoolClient) => {
      const existing = await this.findById(id, mosqueId, client);
      if (!existing) return null;

      const res = await client.query<PostgresUserRow>(
        `UPDATE users
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND mosque_id = $3
         RETURNING *`,
        [status, id, mosqueId]
      );
      return res.rows[0] || null;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Update user role and permissions.
   */
  async updateRoleAndPermissions(
    id: string,
    mosqueId: string,
    dto: UpdateUserRBACDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresUserRow | null> {
    const executeLogic = async (client: pg.PoolClient) => {
      const existing = await this.findById(id, mosqueId, client);
      if (!existing) return null;

      const query = `
        UPDATE users
        SET role = $1,
            permissions = $2::jsonb,
            updated_at = NOW()
        WHERE id = $3 AND mosque_id = $4
        RETURNING *
      `;

      const res = await client.query<PostgresUserRow>(query, [
        dto.role,
        JSON.stringify(dto.permissions),
        id,
        mosqueId,
      ]);

      const updated = res.rows[0];

      if (dto.actorId) {
        await client.query(`
          INSERT INTO audit_logs (
            id, mosque_id, user_id, user_name, user_role, action,
            entity_type, entity_id, entity_voucher_or_name, details,
            ip_address, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, 'UPDATE', 'USER_RBAC', $6, $7, $8, $9, NOW()
          )
        `, [
          `aud-usr-rbac-${Date.now()}`,
          mosqueId,
          dto.actorId,
          dto.actorName || 'Admin',
          dto.actorRole || 'ADMIN',
          id,
          updated.name,
          `Updated role to '${dto.role}' and set ${dto.permissions.length} permissions`,
          dto.ipAddress || '127.0.0.1',
        ]);
      }

      return updated;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Update user password hash.
   */
  async updatePasswordHash(
    id: string,
    mosqueId: string,
    passwordHash: string,
    clientOverride?: pg.PoolClient
  ): Promise<boolean> {
    const executeLogic = async (client: pg.PoolClient) => {
      const res = await client.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2 AND mosque_id = $3`,
        [passwordHash, id, mosqueId]
      );
      return (res.rowCount ?? 0) > 0;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Update last login timestamp.
   */
  async updateLastLogin(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<void> {
    const executor = client || this.pool;
    await executor.query(
      `UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
  }

  /**
   * Retrieve role and permissions for a user.
   */
  async getRoleAndPermissions(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<{ role: string; permissions: string[]; status: UserStatus } | null> {
    const user = await this.findById(id, mosqueId, client);
    if (!user) return null;
    return {
      role: user.role,
      permissions: user.permissions || [],
      status: user.status,
    };
  }
}

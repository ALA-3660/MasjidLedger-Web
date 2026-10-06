import pg from 'pg';
import { getPostgresPool } from '../client';
import { withTransaction } from '../transaction';

export interface PostgresMosqueRow {
  id: string;
  name: string;
  name_bn: string;
  address: string;
  contact_number: string;
  email: string | null;
  logo_url: string | null;
  established_year: string | null;
  registration_number: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  postal_code: string | null;
  letterhead_settings: any | null;
  prayer_settings: any | null;
  public_portal_settings: any | null;
  created_at: Date;
  updated_at: Date;
}

export interface PostgresBackupSettingsRow {
  id: string;
  mosque_id: string;
  auto_backup_enabled: boolean;
  frequency: string;
  time_of_day: string | null;
  retention_count: number;
  encryption_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMosqueDTO {
  id: string;
  name: string;
  nameBn: string;
  address: string;
  contactNumber: string;
  email?: string | null;
  logoUrl?: string | null;
  establishedYear?: string | null;
  registrationNumber?: string | null;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  postalCode?: string | null;
  letterheadSettings?: any;
  prayerSettings?: any;
  publicPortalSettings?: any;
}

export interface UpdateMosqueIdentityDTO {
  name?: string;
  nameBn?: string;
  address?: string;
  contactNumber?: string;
  email?: string | null;
  logoUrl?: string | null;
  establishedYear?: string | null;
  registrationNumber?: string | null;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  postalCode?: string | null;
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
}

export interface UpdateMosqueSettingsDTO {
  letterheadSettings?: any;
  prayerSettings?: any;
  publicPortalSettings?: any;
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
}

export interface UpdateBackupSettingsDTO {
  autoBackupEnabled?: boolean;
  frequency?: string;
  timeOfDay?: string | null;
  retentionCount?: number;
  encryptionEnabled?: boolean;
}

export class PostgresMosqueIdentityRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * Get complete mosque record by ID.
   */
  async getMosqueById(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresMosqueRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresMosqueRow>(
      `SELECT * FROM mosques WHERE id = $1`,
      [mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Get identity fields of a mosque (Strict Mosque Scope).
   */
  async getMosqueIdentity(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<Omit<PostgresMosqueRow, 'letterhead_settings' | 'prayer_settings' | 'public_portal_settings'> | null> {
    const executor = client || this.pool;
    const res = await executor.query(
      `SELECT id, name, name_bn, address, contact_number, email, logo_url,
              established_year, registration_number, division, district, upazila,
              postal_code, created_at, updated_at
       FROM mosques
       WHERE id = $1`,
      [mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Create a new Mosque record.
   */
  async create(
    dto: CreateMosqueDTO,
    client?: pg.PoolClient
  ): Promise<PostgresMosqueRow> {
    const executor = client || this.pool;
    const query = `
      INSERT INTO mosques (
        id, name, name_bn, address, contact_number, email, logo_url,
        established_year, registration_number, division, district, upazila,
        postal_code, letterhead_settings, prayer_settings, public_portal_settings,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        NOW(), NOW()
      )
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.name,
      dto.nameBn,
      dto.address,
      dto.contactNumber,
      dto.email || null,
      dto.logoUrl || null,
      dto.establishedYear || null,
      dto.registrationNumber || null,
      dto.division || null,
      dto.district || null,
      dto.upazila || null,
      dto.postalCode || null,
      dto.letterheadSettings ? JSON.stringify(dto.letterheadSettings) : null,
      dto.prayerSettings ? JSON.stringify(dto.prayerSettings) : null,
      dto.publicPortalSettings ? JSON.stringify(dto.publicPortalSettings) : null,
    ];

    const res = await executor.query<PostgresMosqueRow>(query, params);
    return res.rows[0];
  }

  /**
   * Update Mosque Identity fields with server-side mosque_id scoping and audit trail.
   */
  async updateMosqueIdentity(
    mosqueId: string,
    dto: UpdateMosqueIdentityDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresMosqueRow | null> {
    const executeLogic = async (client: pg.PoolClient) => {
      // 1. Check existing mosque
      const existing = await this.getMosqueById(mosqueId, client);
      if (!existing) {
        return null;
      }

      // 2. Perform selective update (Immutable ID protected)
      const query = `
        UPDATE mosques
        SET name = COALESCE($1, name),
            name_bn = COALESCE($2, name_bn),
            address = COALESCE($3, address),
            contact_number = COALESCE($4, contact_number),
            email = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE email END,
            logo_url = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE logo_url END,
            established_year = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE established_year END,
            registration_number = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE registration_number END,
            division = CASE WHEN $9::text IS NOT NULL THEN $9 ELSE division END,
            district = CASE WHEN $10::text IS NOT NULL THEN $10 ELSE district END,
            upazila = CASE WHEN $11::text IS NOT NULL THEN $11 ELSE upazila END,
            postal_code = CASE WHEN $12::text IS NOT NULL THEN $12 ELSE postal_code END,
            updated_at = NOW()
        WHERE id = $13
        RETURNING *
      `;

      const params = [
        dto.name !== undefined ? dto.name : null,
        dto.nameBn !== undefined ? dto.nameBn : null,
        dto.address !== undefined ? dto.address : null,
        dto.contactNumber !== undefined ? dto.contactNumber : null,
        dto.email !== undefined ? dto.email : null,
        dto.logoUrl !== undefined ? dto.logoUrl : null,
        dto.establishedYear !== undefined ? dto.establishedYear : null,
        dto.registrationNumber !== undefined ? dto.registrationNumber : null,
        dto.division !== undefined ? dto.division : null,
        dto.district !== undefined ? dto.district : null,
        dto.upazila !== undefined ? dto.upazila : null,
        dto.postalCode !== undefined ? dto.postalCode : null,
        mosqueId,
      ];

      const res = await client.query<PostgresMosqueRow>(query, params);
      const updatedMosque = res.rows[0];

      // 3. Append Audit Log if user metadata provided
      if (dto.userId) {
        await client.query(`
          INSERT INTO audit_logs (
            id, mosque_id, user_id, user_name, user_role, action,
            entity_type, entity_id, entity_voucher_or_name, details,
            ip_address, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, 'UPDATE', 'MOSQUE_IDENTITY', $6, $7, $8, $9, NOW()
          )
        `, [
          `aud-m-ident-${Date.now()}`,
          mosqueId,
          dto.userId,
          dto.userName || 'Admin',
          dto.userRole || 'ADMIN',
          mosqueId,
          updatedMosque.name_bn,
          `Updated mosque identity details for ${updatedMosque.name}`,
          dto.ipAddress || '127.0.0.1',
        ]);
      }

      return updatedMosque;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Get all settings (letterhead, prayer, public_portal, backup) for a mosque.
   */
  async getMosqueSettings(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<{
    letterheadSettings: any;
    prayerSettings: any;
    publicPortalSettings: any;
    backupSettings: PostgresBackupSettingsRow | null;
  } | null> {
    const executor = client || this.pool;
    const mosque = await this.getMosqueById(mosqueId, executor as any);
    if (!mosque) return null;

    const backupRes = await executor.query<PostgresBackupSettingsRow>(
      `SELECT * FROM backup_settings WHERE mosque_id = $1`,
      [mosqueId]
    );

    return {
      letterheadSettings: mosque.letterhead_settings,
      prayerSettings: mosque.prayer_settings,
      publicPortalSettings: mosque.public_portal_settings,
      backupSettings: backupRes.rows[0] || null,
    };
  }

  /**
   * Update JSONB settings for a mosque (letterhead, prayer, public portal) with audit trail.
   */
  async updateMosqueSettings(
    mosqueId: string,
    dto: UpdateMosqueSettingsDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresMosqueRow | null> {
    const executeLogic = async (client: pg.PoolClient) => {
      const existing = await this.getMosqueById(mosqueId, client);
      if (!existing) return null;

      const newLetterhead = dto.letterheadSettings !== undefined
        ? (dto.letterheadSettings ? JSON.stringify(dto.letterheadSettings) : null)
        : (existing.letterhead_settings ? JSON.stringify(existing.letterhead_settings) : null);

      const newPrayer = dto.prayerSettings !== undefined
        ? (dto.prayerSettings ? JSON.stringify(dto.prayerSettings) : null)
        : (existing.prayer_settings ? JSON.stringify(existing.prayer_settings) : null);

      const newPortal = dto.publicPortalSettings !== undefined
        ? (dto.publicPortalSettings ? JSON.stringify(dto.publicPortalSettings) : null)
        : (existing.public_portal_settings ? JSON.stringify(existing.public_portal_settings) : null);

      const query = `
        UPDATE mosques
        SET letterhead_settings = $1::jsonb,
            prayer_settings = $2::jsonb,
            public_portal_settings = $3::jsonb,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const res = await client.query<PostgresMosqueRow>(query, [
        newLetterhead,
        newPrayer,
        newPortal,
        mosqueId,
      ]);

      const updatedMosque = res.rows[0];

      // Audit log
      if (dto.userId) {
        await client.query(`
          INSERT INTO audit_logs (
            id, mosque_id, user_id, user_name, user_role, action,
            entity_type, entity_id, entity_voucher_or_name, details,
            ip_address, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, 'UPDATE', 'MOSQUE_SETTINGS', $6, $7, $8, $9, NOW()
          )
        `, [
          `aud-m-set-${Date.now()}`,
          mosqueId,
          dto.userId,
          dto.userName || 'Admin',
          dto.userRole || 'ADMIN',
          mosqueId,
          updatedMosque.name_bn,
          `Updated configuration/settings for ${updatedMosque.name}`,
          dto.ipAddress || '127.0.0.1',
        ]);
      }

      return updatedMosque;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Get backup settings for a mosque.
   */
  async getBackupSettings(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresBackupSettingsRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresBackupSettingsRow>(
      `SELECT * FROM backup_settings WHERE mosque_id = $1`,
      [mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Upsert backup settings for a mosque.
   */
  async updateBackupSettings(
    mosqueId: string,
    dto: UpdateBackupSettingsDTO,
    client?: pg.PoolClient
  ): Promise<PostgresBackupSettingsRow> {
    const executor = client || this.pool;
    const query = `
      INSERT INTO backup_settings (
        id, mosque_id, auto_backup_enabled, frequency, time_of_day,
        retention_count, encryption_enabled, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      ON CONFLICT (mosque_id) DO UPDATE
      SET auto_backup_enabled = COALESCE($3, backup_settings.auto_backup_enabled),
          frequency = COALESCE($4, backup_settings.frequency),
          time_of_day = COALESCE($5, backup_settings.time_of_day),
          retention_count = COALESCE($6, backup_settings.retention_count),
          encryption_enabled = COALESCE($7, backup_settings.encryption_enabled),
          updated_at = NOW()
      RETURNING *
    `;

    const params = [
      `bset-${mosqueId}`,
      mosqueId,
      dto.autoBackupEnabled !== undefined ? dto.autoBackupEnabled : true,
      dto.frequency || 'DAILY',
      dto.timeOfDay || '02:00',
      dto.retentionCount || 7,
      dto.encryptionEnabled !== undefined ? dto.encryptionEnabled : true,
    ];

    const res = await executor.query<PostgresBackupSettingsRow>(query, params);
    return res.rows[0];
  }
}

import pg from 'pg';
import { getPostgresPool } from '../client';

export interface PostgresFinancialAccountRow {
  id: string;
  mosque_id: string;
  name: string | null;
  name_bn: string;
  account_type: 'CASH' | 'BANK' | 'MFS';
  bank_name: string | null;
  branch_name: string | null;
  account_number: string | null;
  mfs_provider: string | null;
  mobile_number: string | null;
  routing_number: string | null;
  contact_person: string | null;
  notes: string | null;
  opening_balance: string; // NUMERIC is returned as string by pg driver for precision
  opening_balance_date: string | null;
  opening_balance_type: 'DEBIT' | 'CREDIT';
  opening_balance_source: string | null;
  opening_balance_note: string | null;
  current_balance: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFinancialAccountDTO {
  id: string;
  mosqueId: string;
  name?: string | null;
  nameBn: string;
  accountType: 'CASH' | 'BANK' | 'MFS';
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  mfsProvider?: string | null;
  mobileNumber?: string | null;
  routingNumber?: string | null;
  contactPerson?: string | null;
  notes?: string | null;
  openingBalance?: number | string;
  openingBalanceDate?: string | null;
  openingBalanceType?: 'DEBIT' | 'CREDIT';
  openingBalanceSource?: string | null;
  openingBalanceNote?: string | null;
  currentBalance?: number | string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isActive?: boolean;
}

export interface UpdateFinancialAccountDTO {
  name?: string | null;
  nameBn?: string;
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  mfsProvider?: string | null;
  mobileNumber?: string | null;
  routingNumber?: string | null;
  contactPerson?: string | null;
  notes?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isActive?: boolean;
}

export class PostgresFinancialAccountRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * List financial accounts for a specific mosque with optional status filter.
   */
  async listByMosque(
    mosqueId: string,
    filters?: { status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'; isActive?: boolean },
    client?: pg.PoolClient
  ): Promise<PostgresFinancialAccountRow[]> {
    const executor = client || this.pool;
    let query = `SELECT * FROM financial_accounts WHERE mosque_id = $1`;
    const params: any[] = [mosqueId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      params.push(filters.isActive);
    }

    query += ` ORDER BY created_at ASC`;
    const res = await executor.query<PostgresFinancialAccountRow>(query, params);
    return res.rows;
  }

  /**
   * Get an account by ID and Mosque ID (Enforcing strict mosque isolation).
   */
  async getById(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresFinancialAccountRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresFinancialAccountRow>(
      `SELECT * FROM financial_accounts WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Get an account with row-level lock (SELECT ... FOR UPDATE) inside a transaction.
   */
  async getByIdForUpdate(
    id: string,
    mosqueId: string,
    client: pg.PoolClient
  ): Promise<PostgresFinancialAccountRow | null> {
    const res = await client.query<PostgresFinancialAccountRow>(
      `SELECT * FROM financial_accounts WHERE id = $1 AND mosque_id = $2 FOR UPDATE`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Create a new financial account.
   */
  async create(
    dto: CreateFinancialAccountDTO,
    client?: pg.PoolClient
  ): Promise<PostgresFinancialAccountRow> {
    const executor = client || this.pool;
    const openingBal = dto.openingBalance !== undefined ? String(dto.openingBalance) : '0.00';
    const currentBal = dto.currentBalance !== undefined ? String(dto.currentBalance) : openingBal;

    const query = `
      INSERT INTO financial_accounts (
        id, mosque_id, name, name_bn, account_type, bank_name, branch_name,
        account_number, mfs_provider, mobile_number, routing_number,
        contact_person, notes, opening_balance, opening_balance_date,
        opening_balance_type, opening_balance_source, opening_balance_note,
        current_balance, status, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()
      )
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId,
      dto.name || null,
      dto.nameBn,
      dto.accountType,
      dto.bankName || null,
      dto.branchName || null,
      dto.accountNumber || null,
      dto.mfsProvider || null,
      dto.mobileNumber || null,
      dto.routingNumber || null,
      dto.contactPerson || null,
      dto.notes || null,
      openingBal,
      dto.openingBalanceDate || null,
      dto.openingBalanceType || 'DEBIT',
      dto.openingBalanceSource || null,
      dto.openingBalanceNote || null,
      currentBal,
      dto.status || 'ACTIVE',
      dto.isActive ?? true,
    ];

    const res = await executor.query<PostgresFinancialAccountRow>(query, params);
    return res.rows[0];
  }

  /**
   * Update permitted details of a financial account.
   */
  async update(
    id: string,
    mosqueId: string,
    dto: UpdateFinancialAccountDTO,
    client?: pg.PoolClient
  ): Promise<PostgresFinancialAccountRow | null> {
    const executor = client || this.pool;
    const existing = await this.getById(id, mosqueId, client);
    if (!existing) return null;

    const query = `
      UPDATE financial_accounts
      SET name = COALESCE($1, name),
          name_bn = COALESCE($2, name_bn),
          bank_name = COALESCE($3, bank_name),
          branch_name = COALESCE($4, branch_name),
          account_number = COALESCE($5, account_number),
          mfs_provider = COALESCE($6, mfs_provider),
          mobile_number = COALESCE($7, mobile_number),
          routing_number = COALESCE($8, routing_number),
          contact_person = COALESCE($9, contact_person),
          notes = COALESCE($10, notes),
          status = COALESCE($11, status),
          is_active = COALESCE($12, is_active),
          updated_at = NOW()
      WHERE id = $13 AND mosque_id = $14
      RETURNING *
    `;

    const params = [
      dto.name !== undefined ? dto.name : existing.name,
      dto.nameBn !== undefined ? dto.nameBn : existing.name_bn,
      dto.bankName !== undefined ? dto.bankName : existing.bank_name,
      dto.branchName !== undefined ? dto.branchName : existing.branch_name,
      dto.accountNumber !== undefined ? dto.accountNumber : existing.account_number,
      dto.mfsProvider !== undefined ? dto.mfsProvider : existing.mfs_provider,
      dto.mobileNumber !== undefined ? dto.mobileNumber : existing.mobile_number,
      dto.routingNumber !== undefined ? dto.routingNumber : existing.routing_number,
      dto.contactPerson !== undefined ? dto.contactPerson : existing.contact_person,
      dto.notes !== undefined ? dto.notes : existing.notes,
      dto.status !== undefined ? dto.status : existing.status,
      dto.isActive !== undefined ? dto.isActive : existing.is_active,
      id,
      mosqueId,
    ];

    const res = await executor.query<PostgresFinancialAccountRow>(query, params);
    return res.rows[0] || null;
  }

  /**
   * Adjust current_balance atomically inside a transaction with delta.
   */
  async adjustBalance(
    id: string,
    mosqueId: string,
    delta: number | string,
    client: pg.PoolClient
  ): Promise<PostgresFinancialAccountRow> {
    const res = await client.query<PostgresFinancialAccountRow>(
      `UPDATE financial_accounts
       SET current_balance = current_balance + $1,
           updated_at = NOW()
       WHERE id = $2 AND mosque_id = $3
       RETURNING *`,
      [String(delta), id, mosqueId]
    );

    if (res.rows.length === 0) {
      throw new Error(`[FinancialAccountRepository] Account ${id} not found in mosque ${mosqueId}`);
    }

    return res.rows[0];
  }

  /**
   * Get balance summary for an account.
   */
  async getBalance(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<{ openingBalance: string; currentBalance: string } | null> {
    const acc = await this.getById(id, mosqueId, client);
    if (!acc) return null;
    return {
      openingBalance: acc.opening_balance,
      currentBalance: acc.current_balance,
    };
  }
}

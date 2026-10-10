import pg from 'pg';
import { getPostgresPool } from '../client';
import { withTransaction } from '../transaction';

export interface PostgresExpenseEntryRow {
  id: string;
  mosque_id: string;
  voucher_number: string;
  date: string;
  main_head_id: string;
  main_head_name_bn: string;
  sub_head_id: string | null;
  sub_head_name_bn: string | null;
  amount: string;
  payment_method: string;
  account_id: string;
  account_name: string;
  payee_name: string;
  payee_phone: string | null;
  reference: string | null;
  description: string | null;
  attachment_url: string | null;
  source_module: string | null;
  source_id: string | null;
  source_type: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  created_by: string;
  created_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: Date | null;
  rejection_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExpenseEntryDTO {
  id: string;
  mosqueId: string;
  voucherNumber: string;
  date: string;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId?: string | null;
  subHeadNameBn?: string | null;
  amount: number | string;
  paymentMethod?: string;
  accountId: string;
  accountName: string;
  payeeName: string;
  payeePhone?: string | null;
  reference?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
  sourceModule?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdBy: string;
  createdByName?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

export interface ReverseExpenseDTO {
  entryId: string;
  mosqueId: string;
  reason: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  ipAddress?: string;
}

export interface ExpenseFilterOptions {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  mainHeadId?: string;
  subHeadId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class PostgresExpenseRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * List expense entries by mosque with optional filtering and pagination.
   */
  async listByMosque(
    mosqueId: string,
    filters?: ExpenseFilterOptions,
    client?: pg.PoolClient
  ): Promise<PostgresExpenseEntryRow[]> {
    const executor = client || this.pool;
    let query = `SELECT * FROM expense_entries WHERE mosque_id = $1`;
    const params: any[] = [mosqueId];
    let paramIdx = 2;

    if (filters?.startDate) {
      query += ` AND date >= $${paramIdx++}`;
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ` AND date <= $${paramIdx++}`;
      params.push(filters.endDate);
    }
    if (filters?.accountId) {
      query += ` AND account_id = $${paramIdx++}`;
      params.push(filters.accountId);
    }
    if (filters?.mainHeadId) {
      query += ` AND main_head_id = $${paramIdx++}`;
      params.push(filters.mainHeadId);
    }
    if (filters?.subHeadId) {
      query += ` AND sub_head_id = $${paramIdx++}`;
      params.push(filters.subHeadId);
    }
    if (filters?.status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY date DESC, created_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIdx++}`;
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ` OFFSET $${paramIdx++}`;
      params.push(filters.offset);
    }

    const res = await executor.query<PostgresExpenseEntryRow>(query, params);
    return res.rows;
  }

  /**
   * Get an expense entry by ID and Mosque ID.
   */
  async getById(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresExpenseEntryRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresExpenseEntryRow>(
      `SELECT * FROM expense_entries WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Create an expense entry with atomic account balance update and row-locking.
   */
  async create(
    dto: CreateExpenseEntryDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresExpenseEntryRow> {
    const executeLogic = async (client: pg.PoolClient) => {
      const numAmount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error(`[ExpenseRepository] Expense amount must be greater than 0.00 (Received: ${dto.amount})`);
      }

      // 1. Lock Account and Verify Mosque Isolation
      const accRes = await client.query(
        `SELECT id, current_balance, mosque_id FROM financial_accounts WHERE id = $1 AND mosque_id = $2 FOR UPDATE`,
        [dto.accountId, dto.mosqueId]
      );
      if (accRes.rows.length === 0) {
        throw new Error(`[ExpenseRepository] Target account ${dto.accountId} not found in mosque ${dto.mosqueId}`);
      }

      // 2. Insert Expense Entry
      const query = `
        INSERT INTO expense_entries (
          id, mosque_id, voucher_number, date, main_head_id, main_head_name_bn,
          sub_head_id, sub_head_name_bn, amount, payment_method, account_id,
          account_name, payee_name, payee_phone, reference, description,
          attachment_url, source_module, source_id, source_type, status,
          created_by, created_by_name, approved_by, approved_by_name, approved_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
          NOW(), NOW()
        )
        RETURNING *
      `;

      const params = [
        dto.id,
        dto.mosqueId,
        dto.voucherNumber,
        dto.date,
        dto.mainHeadId,
        dto.mainHeadNameBn,
        dto.subHeadId || null,
        dto.subHeadNameBn || null,
        String(numAmount),
        dto.paymentMethod || 'CASH',
        dto.accountId,
        dto.accountName,
        dto.payeeName,
        dto.payeePhone || null,
        dto.reference || null,
        dto.description || null,
        dto.attachmentUrl || null,
        dto.sourceModule || null,
        dto.sourceId || null,
        dto.sourceType || null,
        dto.status || 'APPROVED',
        dto.createdBy,
        dto.createdByName || null,
        dto.approvedBy || null,
        dto.approvedByName || null,
        dto.approvedAt || null,
      ];

      const res = await client.query<PostgresExpenseEntryRow>(query, params);

      // 3. Atomically Update Account Balance if status is APPROVED
      if (!dto.status || dto.status === 'APPROVED') {
        await client.query(
          `UPDATE financial_accounts
           SET current_balance = current_balance - $1,
               updated_at = NOW()
           WHERE id = $2 AND mosque_id = $3`,
          [String(numAmount), dto.accountId, dto.mosqueId]
        );
      }

      return res.rows[0];
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Atomically reverse an APPROVED expense entry.
   * Performs:
   * 1. Row-level pessimistic locking on expense entry FOR UPDATE.
   * 2. Verification of APPROVED status and tenant scope.
   * 3. Mutating status to 'CANCELLED' and setting rejection_reason.
   * 4. Restoring (crediting) the voucher amount to financial_accounts current_balance with row-locking.
   * 5. Appending an immutable forensic audit log inside the SAME transaction.
   */
  async reverseWithTransaction(
    dto: ReverseExpenseDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresExpenseEntryRow> {
    const executeLogic = async (client: pg.PoolClient) => {
      // 1. Lock and fetch target Expense Entry
      const entryRes = await client.query<PostgresExpenseEntryRow>(
        `SELECT * FROM expense_entries WHERE id = $1 AND mosque_id = $2 FOR UPDATE`,
        [dto.entryId, dto.mosqueId]
      );

      const entry = entryRes.rows[0];
      if (!entry) {
        throw new Error(`[ExpenseRepository] Expense entry [${dto.entryId}] not found in mosque [${dto.mosqueId}]`);
      }

      if (entry.status !== 'APPROVED') {
        throw new Error(`[ExpenseRepository] Only APPROVED expense entries can be reversed. Entry [${dto.entryId}] has status [${entry.status}].`);
      }

      const numAmount = parseFloat(entry.amount || '0');
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error(`[ExpenseRepository] Invalid entry amount for reversal: ${entry.amount}`);
      }

      // 2. Lock Account and restore (credit) balance
      const accRes = await client.query(
        `SELECT id, current_balance, mosque_id FROM financial_accounts WHERE id = $1 AND mosque_id = $2 FOR UPDATE`,
        [entry.account_id, dto.mosqueId]
      );

      if (accRes.rows.length === 0) {
        throw new Error(`[ExpenseRepository] Financial account [${entry.account_id}] not found in mosque [${dto.mosqueId}]`);
      }

      // Restore balance (credit back expense amount)
      await client.query(
        `UPDATE financial_accounts
         SET current_balance = current_balance + $1,
             updated_at = NOW()
         WHERE id = $2 AND mosque_id = $3`,
        [String(numAmount), entry.account_id, dto.mosqueId]
      );

      // 3. Update Expense Entry status to CANCELLED
      const updateRes = await client.query<PostgresExpenseEntryRow>(
        `UPDATE expense_entries
         SET status = 'CANCELLED',
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2 AND mosque_id = $3
         RETURNING *`,
        [dto.reason, dto.entryId, dto.mosqueId]
      );

      // 4. Append Audit Log inside the SAME SQL transaction
      await client.query(
        `INSERT INTO audit_logs (
          id, mosque_id, user_id, user_name, user_role, action,
          entity_type, entity_id, entity_voucher_or_name, details,
          ip_address, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, 'REVERSE_EXPENSE', 'EXPENSE_ENTRY', $6, $7, $8, $9, NOW()
        )`,
        [
          `aud-rev-exp-${Date.now()}`,
          dto.mosqueId,
          dto.actorId,
          dto.actorName || dto.actorId,
          dto.actorRole || 'ADMIN',
          dto.entryId,
          entry.voucher_number,
          `Expense voucher ${entry.voucher_number} reversed (৳${entry.amount}). Reason: ${dto.reason}`,
          dto.ipAddress || '127.0.0.1',
        ]
      );

      return updateRes.rows[0];
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Calculate total expenses for a mosque within an optional date range.
   */
  async getTotal(
    mosqueId: string,
    filters?: { startDate?: string; endDate?: string; status?: string },
    client?: pg.PoolClient
  ): Promise<string> {
    const executor = client || this.pool;
    let query = `SELECT COALESCE(SUM(amount), 0)::text AS total FROM expense_entries WHERE mosque_id = $1`;
    const params: any[] = [mosqueId];
    let paramIdx = 2;

    if (filters?.startDate) {
      query += ` AND date >= $${paramIdx++}`;
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ` AND date <= $${paramIdx++}`;
      params.push(filters.endDate);
    }
    if (filters?.status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(filters.status);
    } else {
      query += ` AND status = 'APPROVED'`;
    }

    const res = await executor.query<{ total: string }>(query, params);
    return res.rows[0]?.total || '0.00';
  }
}

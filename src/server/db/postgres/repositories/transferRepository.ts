import pg from 'pg';
import { getPostgresPool } from '../client';
import { withTransaction } from '../transaction';

export interface PostgresAccountTransferRow {
  id: string;
  mosque_id: string;
  transfer_number: string;
  from_account_id: string;
  from_account_name: string;
  to_account_id: string;
  to_account_name: string;
  amount: string;
  date: string;
  purpose: string | null;
  description: string | null;
  reference: string | null;
  attachment_url: string | null;
  status: string;
  created_by: string;
  created_by_name: string | null;
  created_at: Date;
}

export interface CreateAccountTransferDTO {
  id: string;
  mosqueId: string;
  transferNumber: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number | string;
  date: string;
  purpose?: string | null;
  description?: string | null;
  reference?: string | null;
  attachmentUrl?: string | null;
  status?: string;
  createdBy: string;
  createdByName?: string | null;
  userRole?: string;
  ipAddress?: string;
}

export class PostgresTransferRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * List account transfers by mosque.
   */
  async listByMosque(
    mosqueId: string,
    filters?: { startDate?: string; endDate?: string; accountId?: string; limit?: number; offset?: number },
    client?: pg.PoolClient
  ): Promise<PostgresAccountTransferRow[]> {
    const executor = client || this.pool;
    let query = `SELECT * FROM account_transfers WHERE mosque_id = $1`;
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
      query += ` AND (from_account_id = $${paramIdx} OR to_account_id = $${paramIdx})`;
      params.push(filters.accountId);
      paramIdx++;
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

    const res = await executor.query<PostgresAccountTransferRow>(query, params);
    return res.rows;
  }

  /**
   * Get an account transfer by ID and Mosque ID.
   */
  async getById(
    id: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresAccountTransferRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresAccountTransferRow>(
      `SELECT * FROM account_transfers WHERE id = $1 AND mosque_id = $2`,
      [id, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Execute an atomic Account Transfer.
   * Enforces:
   * 1. from_account_id <> to_account_id
   * 2. Both accounts belong to the same mosque_id
   * 3. Deterministic alphabetical row-locking (prevents deadlock)
   * 4. Deducts from source, credits to destination atomically
   * 5. Appends transfer record & audit log inside single transaction
   */
  async executeTransfer(
    dto: CreateAccountTransferDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresAccountTransferRow> {
    const executeLogic = async (client: pg.PoolClient) => {
      // 1. Validation
      if (dto.fromAccountId === dto.toAccountId) {
        throw new Error(`[TransferRepository] Source and destination accounts cannot be identical (${dto.fromAccountId})`);
      }

      const numAmount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : dto.amount;
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error(`[TransferRepository] Transfer amount must be greater than 0.00 (Received: ${dto.amount})`);
      }

      // 2. Deterministic Row-Locking (Alphabetical ID order to avoid deadlocks)
      const sortedIds = [dto.fromAccountId, dto.toAccountId].sort();
      const accountsMap: Record<string, { id: string; name_bn: string; current_balance: string; mosque_id: string }> = {};

      for (const accId of sortedIds) {
        const lockRes = await client.query(
          `SELECT id, name_bn, current_balance, mosque_id FROM financial_accounts WHERE id = $1 AND mosque_id = $2 FOR UPDATE`,
          [accId, dto.mosqueId]
        );
        if (lockRes.rows.length === 0) {
          throw new Error(`[TransferRepository] Account ${accId} not found in mosque ${dto.mosqueId}`);
        }
        accountsMap[accId] = lockRes.rows[0];
      }

      const sourceAcc = accountsMap[dto.fromAccountId];
      const destAcc = accountsMap[dto.toAccountId];

      if (!sourceAcc || !destAcc) {
        throw new Error('[TransferRepository] Failed to acquire locks on both transfer accounts.');
      }

      // 3. Update Source Account (Debit / Subtract)
      await client.query(
        `UPDATE financial_accounts
         SET current_balance = current_balance - $1,
             updated_at = NOW()
         WHERE id = $2 AND mosque_id = $3`,
        [String(numAmount), dto.fromAccountId, dto.mosqueId]
      );

      // 4. Update Destination Account (Credit / Add)
      await client.query(
        `UPDATE financial_accounts
         SET current_balance = current_balance + $1,
             updated_at = NOW()
         WHERE id = $2 AND mosque_id = $3`,
        [String(numAmount), dto.toAccountId, dto.mosqueId]
      );

      // 5. Insert Transfer Record
      const insertQuery = `
        INSERT INTO account_transfers (
          id, mosque_id, transfer_number, from_account_id, from_account_name,
          to_account_id, to_account_name, amount, date, purpose, description,
          reference, attachment_url, status, created_by, created_by_name, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
        )
        RETURNING *
      `;

      const insertParams = [
        dto.id,
        dto.mosqueId,
        dto.transferNumber,
        dto.fromAccountId,
        dto.fromAccountName || sourceAcc.name_bn,
        dto.toAccountId,
        dto.toAccountName || destAcc.name_bn,
        String(numAmount),
        dto.date,
        dto.purpose || 'GENERAL_TRANSFER',
        dto.description || null,
        dto.reference || null,
        dto.attachmentUrl || null,
        dto.status || 'APPROVED',
        dto.createdBy,
        dto.createdByName || null,
      ];

      const res = await client.query<PostgresAccountTransferRow>(insertQuery, insertParams);

      // 6. Append-Only Audit Log
      const auditQuery = `
        INSERT INTO audit_logs (
          id, mosque_id, user_id, user_name, user_role, action,
          entity_type, entity_id, entity_voucher_or_name, details,
          ip_address, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
        )
      `;

      const auditParams = [
        `aud-${dto.id}`,
        dto.mosqueId,
        dto.createdBy,
        dto.createdByName || 'System User',
        dto.userRole || 'ACCOUNTANT',
        'CREATE',
        'ACCOUNT_TRANSFER',
        dto.id,
        dto.transferNumber,
        `Account transfer of ৳${numAmount} from ${sourceAcc.name_bn} to ${destAcc.name_bn}`,
        dto.ipAddress || '127.0.0.1',
      ];

      await client.query(auditQuery, auditParams);

      return res.rows[0];
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }
}

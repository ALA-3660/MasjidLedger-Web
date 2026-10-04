import pg from 'pg';
import { FinancialAccount, IncomeEntry, ExpenseEntry, AccountTransfer } from '../../../../types';

export class PostgresFinancialRepository {
  /**
   * Acquire a row lock on a financial account within a transaction.
   */
  async lockAccountForUpdate(
    client: pg.PoolClient,
    mosqueId: string,
    accountId: string
  ): Promise<FinancialAccount | null> {
    const res = await client.query(
      `SELECT * FROM financial_accounts WHERE id = $1 AND mosque_id = $2 FOR UPDATE`,
      [accountId, mosqueId]
    );

    if (res.rows.length === 0) return null;
    return this.mapFinancialAccountRow(res.rows[0]);
  }

  /**
   * Lock multiple accounts in deterministic alphabetical ID order to prevent deadlocks.
   */
  async lockTransferAccountsForUpdate(
    client: pg.PoolClient,
    mosqueId: string,
    fromAccountId: string,
    toAccountId: string
  ): Promise<{ fromAccount: FinancialAccount | null; toAccount: FinancialAccount | null }> {
    const orderedIds = [fromAccountId, toAccountId].sort();

    const res = await client.query(
      `SELECT * FROM financial_accounts WHERE id = ANY($1) AND mosque_id = $2 ORDER BY id FOR UPDATE`,
      [orderedIds, mosqueId]
    );

    const accountsMap = new Map<string, FinancialAccount>();
    res.rows.forEach((r) => {
      const acc = this.mapFinancialAccountRow(r);
      accountsMap.set(acc.id, acc);
    });

    return {
      fromAccount: accountsMap.get(fromAccountId) || null,
      toAccount: accountsMap.get(toAccountId) || null,
    };
  }

  /**
   * Atomically records an approved income entry and updates account balance.
   */
  async recordIncomeTransaction(
    client: pg.PoolClient,
    income: IncomeEntry
  ): Promise<void> {
    // 1. Lock Account
    const acc = await this.lockAccountForUpdate(client, income.mosqueId, income.accountId);
    if (!acc) {
      throw new Error(`Financial account not found or cross-tenant access rejected: ${income.accountId}`);
    }

    // 2. Insert Income Record
    await client.query(
      `INSERT INTO income_entries (
        id, mosque_id, term_id, voucher_number, date, main_head_id, main_head_name_bn,
        sub_head_id, sub_head_name_bn, amount, payment_method, account_id, account_name,
        donor_name, donor_phone, reference, description, attachment_url, created_by,
        created_by_name, approved_by, approved_by_name, approved_at, rejection_reason,
        status, is_reversal, reversal_of_id, denomination_data, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )`,
      [
        income.id,
        income.mosqueId,
        income.termId || null,
        income.voucherNumber,
        income.date,
        income.mainHeadId,
        income.mainHeadNameBn,
        income.subHeadId || null,
        income.subHeadNameBn || null,
        income.amount,
        income.paymentMethod,
        income.accountId,
        income.accountName,
        income.donorName || null,
        income.donorPhone || null,
        income.reference || null,
        income.description || null,
        income.attachmentUrl || null,
        income.createdBy,
        income.createdByName,
        income.approvedBy || null,
        income.approvedByName || null,
        income.approvedAt || null,
        income.rejectionReason || null,
        income.status,
        income.isReversal || false,
        income.reversalOfId || null,
        income.denominationData ? JSON.stringify(income.denominationData) : null,
        income.createdAt || new Date().toISOString(),
        income.updatedAt || new Date().toISOString(),
      ]
    );

    // 3. Update Account Balance
    if (income.status === 'APPROVED') {
      await client.query(
        `UPDATE financial_accounts 
         SET current_balance = current_balance + $1, updated_at = NOW() 
         WHERE id = $2 AND mosque_id = $3`,
        [income.amount, income.accountId, income.mosqueId]
      );
    }
  }

  /**
   * Atomically records an approved expense entry and deducts account balance.
   */
  async recordExpenseTransaction(
    client: pg.PoolClient,
    expense: ExpenseEntry
  ): Promise<void> {
    // 1. Lock Account
    const acc = await this.lockAccountForUpdate(client, expense.mosqueId, expense.accountId);
    if (!acc) {
      throw new Error(`Financial account not found: ${expense.accountId}`);
    }

    if (expense.status === 'APPROVED' && acc.currentBalance < expense.amount) {
      throw new Error(`Insufficient funds: Available balance ৳${acc.currentBalance} < requested ৳${expense.amount}`);
    }

    // 2. Insert Expense Record
    await client.query(
      `INSERT INTO expense_entries (
        id, mosque_id, term_id, voucher_number, date, main_head_id, main_head_name_bn,
        sub_head_id, sub_head_name_bn, amount, payment_method, account_id, account_name,
        payee_name, payee_phone, reference, description, attachment_url, created_by,
        created_by_name, approved_by, approved_by_name, approved_at, rejection_reason,
        status, is_reversal, reversal_of_id, source_module, source_id, source_type,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      )`,
      [
        expense.id,
        expense.mosqueId,
        expense.termId || null,
        expense.voucherNumber,
        expense.date,
        expense.mainHeadId,
        expense.mainHeadNameBn,
        expense.subHeadId || null,
        expense.subHeadNameBn || null,
        expense.amount,
        expense.paymentMethod,
        expense.accountId,
        expense.accountName,
        expense.payeeName,
        expense.payeePhone || null,
        expense.reference || null,
        expense.description || null,
        expense.attachmentUrl || null,
        expense.createdBy,
        expense.createdByName,
        expense.approvedBy || null,
        expense.approvedByName || null,
        expense.approvedAt || null,
        expense.rejectionReason || null,
        expense.status,
        expense.isReversal || false,
        expense.reversalOfId || null,
        expense.sourceModule || null,
        expense.sourceId || null,
        expense.sourceType || null,
        expense.createdAt || new Date().toISOString(),
        expense.updatedAt || new Date().toISOString(),
      ]
    );

    // 3. Deduct Account Balance
    if (expense.status === 'APPROVED') {
      await client.query(
        `UPDATE financial_accounts 
         SET current_balance = current_balance - $1, updated_at = NOW() 
         WHERE id = $2 AND mosque_id = $3`,
        [expense.amount, expense.accountId, expense.mosqueId]
      );
    }
  }

  /**
   * Atomically executes an internal transfer between two accounts.
   */
  async recordTransferTransaction(
    client: pg.PoolClient,
    transfer: AccountTransfer
  ): Promise<void> {
    if (transfer.fromAccountId === transfer.toAccountId) {
      throw new Error('Source and destination accounts must be distinct');
    }

    // 1. Lock Accounts in deterministic order
    const { fromAccount, toAccount } = await this.lockTransferAccountsForUpdate(
      client,
      transfer.mosqueId,
      transfer.fromAccountId,
      transfer.toAccountId
    );

    if (!fromAccount || !toAccount) {
      throw new Error('Source or destination account not found');
    }

    if (fromAccount.currentBalance < transfer.amount) {
      throw new Error(`Insufficient funds: Source balance ৳${fromAccount.currentBalance} < transfer amount ৳${transfer.amount}`);
    }

    // 2. Insert Transfer Record
    await client.query(
      `INSERT INTO account_transfers (
        id, mosque_id, transfer_number, from_account_id, from_account_name,
        to_account_id, to_account_name, amount, date, reference, description,
        status, created_by, created_by_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        transfer.id,
        transfer.mosqueId,
        transfer.transferNumber,
        transfer.fromAccountId,
        transfer.fromAccountName,
        transfer.toAccountId,
        transfer.toAccountName,
        transfer.amount,
        transfer.date,
        transfer.reference || null,
        transfer.description || transfer.purpose || null,
        'COMPLETED',
        transfer.createdBy,
        transfer.createdByName,
        transfer.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    // 3. Debit Source & Credit Destination (Consolidated balance is strictly unchanged)
    await client.query(
      `UPDATE financial_accounts SET current_balance = current_balance - $1, updated_at = NOW() WHERE id = $2 AND mosque_id = $3`,
      [transfer.amount, transfer.fromAccountId, transfer.mosqueId]
    );

    await client.query(
      `UPDATE financial_accounts SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2 AND mosque_id = $3`,
      [transfer.amount, transfer.toAccountId, transfer.mosqueId]
    );
  }

  private mapFinancialAccountRow(row: any): FinancialAccount {
    return {
      id: row.id,
      mosqueId: row.mosque_id,
      name: row.name,
      nameBn: row.name_bn,
      accountType: row.account_type,
      bankName: row.bank_name,
      branchName: row.branch_name,
      accountNumber: row.account_number,
      mfsProvider: row.mfs_provider,
      mobileNumber: row.mobile_number,
      mfsAccountCategory: row.mfs_account_category,
      bankAccountCategory: row.bank_account_category,
      routingNumber: row.routing_number,
      contactPerson: row.contact_person,
      notes: row.notes,
      openingBalance: parseFloat(row.opening_balance),
      openingBalanceDate: row.opening_balance_date ? String(row.opening_balance_date).slice(0, 10) : undefined,
      openingBalanceType: row.opening_balance_type,
      openingBalanceSource: row.opening_balance_source,
      openingBalanceNote: row.opening_balance_note,
      currentBalance: parseFloat(row.current_balance),
      status: row.status,
      isDefault: Boolean(row.is_default),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }
}

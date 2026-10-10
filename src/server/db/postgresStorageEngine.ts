/**
 * MASJIDLEDGER PRO v2.6 — AUTHORITATIVE POSTGRESQL STORAGE ENGINE
 * Checkpoint 2B: Engine Implementation Bridging IDataAccessLayer to SQL Repositories
 */

import pg from 'pg';
import crypto from 'crypto';
import {
  IDataAccessLayer,
  AuthorizedUserContext,
  DALOptions,
  IUserRepository,
  IMosqueIdentityRepository,
  IAccountHeadRepository,
  IFinancialAccountRepository,
  IIncomeRepository,
  IExpenseRepository,
  ITransferRepository,
  IAuditRepository,
  ICommitteeRepository,
} from './interfaces/IDataAccessLayer';

import {
  PostgresUserRepository,
  PostgresMosqueIdentityRepository,
  PostgresAccountHeadRepository,
  PostgresFinancialAccountRepository,
  PostgresIncomeRepository,
  PostgresExpenseRepository,
  PostgresTransferRepository,
  PostgresAuditRepository,
  PostgresCommitteeRepository,
  PostgresIdempotencyRepository,
} from './postgres/repositories';

import { withTransaction } from './postgres/transaction';
import { getPostgresPool } from './postgres/client';

export class PostgresEngineError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'PostgresEngineError';
  }
}

/**
 * PostgreSQL Storage Engine implementation satisfying IDataAccessLayer contract.
 */
export class PostgresStorageEngine implements IDataAccessLayer {
  readonly users: IUserRepository;
  readonly mosque: IMosqueIdentityRepository;
  readonly accountHeads: IAccountHeadRepository;
  readonly financialAccounts: IFinancialAccountRepository;
  readonly income: IIncomeRepository;
  readonly expense: IExpenseRepository;
  readonly transfers: ITransferRepository;
  readonly audit: IAuditRepository;
  readonly committee: ICommitteeRepository;

  private userRepo: PostgresUserRepository;
  private mosqueRepo: PostgresMosqueIdentityRepository;
  private headRepo: PostgresAccountHeadRepository;
  private accountRepo: PostgresFinancialAccountRepository;
  private incomeRepo: PostgresIncomeRepository;
  private expenseRepo: PostgresExpenseRepository;
  private transferRepo: PostgresTransferRepository;
  private auditRepo: PostgresAuditRepository;
  private committeeRepo: PostgresCommitteeRepository;
  private idempotencyRepo: PostgresIdempotencyRepository;

  constructor(
    private userContext: AuthorizedUserContext,
    private pool: pg.Pool = getPostgresPool(),
    private activeClient?: pg.PoolClient
  ) {
    if (!userContext || !userContext.userId || !userContext.userRole || !userContext.userMosqueId) {
      throw new PostgresEngineError(
        'UNAUTHORIZED_CONTEXT',
        'PostgresStorageEngine requires a valid, server-verified AuthorizedUserContext.'
      );
    }

    this.userRepo = new PostgresUserRepository(this.pool);
    this.mosqueRepo = new PostgresMosqueIdentityRepository(this.pool);
    this.headRepo = new PostgresAccountHeadRepository(this.pool);
    this.accountRepo = new PostgresFinancialAccountRepository(this.pool);
    this.incomeRepo = new PostgresIncomeRepository(this.pool);
    this.expenseRepo = new PostgresExpenseRepository(this.pool);
    this.transferRepo = new PostgresTransferRepository(this.pool);
    this.auditRepo = new PostgresAuditRepository(this.pool);
    this.committeeRepo = new PostgresCommitteeRepository(this.pool);
    this.idempotencyRepo = new PostgresIdempotencyRepository(this.pool);

    const client = this.activeClient;

    // Users Sub-Repository
    this.users = {
      findById: async (options, userId) => {
        await this.verifyTenantAccess(options);
        const row = await this.userRepo.findById(userId, options.mosqueId, client);
        return row ? this.mapUserRow(row) : null;
      },
      findByPhone: async (options, phone) => {
        await this.verifyTenantAccess(options);
        const row = await this.userRepo.findByLoginIdentifier(phone, options.mosqueId, client);
        return row ? this.mapUserRow(row) : null;
      },
      listByMosque: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.userRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapUserRow(r));
      },
      createUser: async (options, user) => {
        await this.verifyTenantAccess(options);
        const created = await this.userRepo.create({
          id: `usr-${Date.now()}`,
          mosqueId: options.mosqueId,
          name: user.name,
          phone: user.phone,
          email: user.email,
          passwordHash: (user as any).passwordHash || 'N/A',
          role: user.role,
          permissions: user.permissions,
        }, client);
        return this.mapUserRow(created);
      },
      updateUser: async (options, userId, updates) => {
        await this.verifyTenantAccess(options);
        const updated = await this.userRepo.updateProfile(userId, options.mosqueId, {
          name: updates.name,
          phone: updates.phone,
          email: updates.email,
        }, client);
        return updated ? this.mapUserRow(updated) : null as any;
      },
    };

    // Mosque Sub-Repository
    this.mosque = {
      findById: async (mosqueId) => {
        const row = await this.mosqueRepo.getMosqueById(mosqueId, client);
        return row ? this.mapMosqueRow(row) : null;
      },
      updateSettings: async (options, updates) => {
        await this.verifyTenantAccess(options);
        const updated = await this.mosqueRepo.updateMosqueIdentity(options.mosqueId, updates as any, client);
        return updated ? this.mapMosqueRow(updated) : null as any;
      },
    };

    // Account Heads Sub-Repository
    this.accountHeads = {
      list: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.headRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapAccountHeadRow(r));
      },
      findById: async (options, headId) => {
        await this.verifyTenantAccess(options);
        const row = await this.headRepo.getById(headId, options.mosqueId, client);
        return row ? this.mapAccountHeadRow(row) : null;
      },
      create: async (options, head) => {
        await this.verifyTenantAccess(options);
        const created = await this.headRepo.create({
          id: `head-${Date.now()}`,
          mosqueId: options.mosqueId,
          code: head.code,
          nameBn: head.nameBn,
          nameEn: head.nameEn || head.nameBn,
          type: head.type,
          parentId: head.parentId,
          isSystem: head.isSystem,
          isActive: head.isActive,
        }, client);
        return this.mapAccountHeadRow(created);
      },
    };

    // Financial Accounts Sub-Repository
    this.financialAccounts = {
      list: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.accountRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapAccountRow(r));
      },
      findById: async (options, accountId) => {
        await this.verifyTenantAccess(options);
        const row = await this.accountRepo.getById(accountId, options.mosqueId, client);
        return row ? this.mapAccountRow(row) : null;
      },
      updateBalance: async (options, accountId, newBalance) => {
        await this.verifyTenantAccess(options);
        const currentAcc = await this.accountRepo.getById(accountId, options.mosqueId, client);
        if (currentAcc) {
          const delta = newBalance - parseFloat(currentAcc.current_balance || '0');
          await this.accountRepo.adjustBalance(accountId, options.mosqueId, delta, client || (this.pool as any));
        }
      },
    };

    // Income Ledger Sub-Repository
    this.income = {
      list: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.incomeRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapIncomeRow(r));
      },
      findById: async (options, entryId) => {
        await this.verifyTenantAccess(options);
        const row = await this.incomeRepo.getById(entryId, options.mosqueId, client);
        return row ? this.mapIncomeRow(row) : null;
      },
      create: async (options, entry) => {
        await this.verifyTenantAccess(options);
        const endpoint = '/api/v1/income-entries';
        const reqHash = crypto.createHash('sha256').update(JSON.stringify(entry, Object.keys(entry).sort())).digest('hex');

        if (options.idempotencyKey) {
          const existing = await this.idempotencyRepo.getRecord(options.idempotencyKey, endpoint, options.mosqueId, client);
          if (existing) {
            if (existing.request_hash && existing.request_hash !== reqHash) {
              throw new PostgresEngineError(
                'IDEMPOTENCY_PAYLOAD_MISMATCH',
                `Idempotency key [${options.idempotencyKey}] was previously used with a different request payload.`
              );
            }
            return existing.response_payload;
          }
        }

        const created = await this.incomeRepo.create({
          id: `inc-${Date.now()}`,
          mosqueId: options.mosqueId,
          voucherNumber: `INC-${Date.now()}`,
          date: entry.date,
          mainHeadId: entry.mainHeadId,
          mainHeadNameBn: entry.mainHeadNameBn,
          subHeadId: entry.subHeadId,
          subHeadNameBn: entry.subHeadNameBn,
          amount: entry.amount,
          paymentMethod: entry.paymentMethod,
          accountId: entry.accountId,
          accountName: entry.accountName,
          donorName: entry.donorName,
          donorPhone: entry.donorPhone,
          reference: entry.reference,
          description: entry.description,
          attachmentUrl: entry.attachmentUrl,
          createdBy: this.userContext.userId,
          createdByName: this.userContext.userId,
        }, client);

        const mapped = this.mapIncomeRow(created);

        if (options.idempotencyKey) {
          await this.idempotencyRepo.saveRecord({
            id: `idem-${Date.now()}`,
            mosqueId: options.mosqueId,
            idempotencyKey: options.idempotencyKey,
            endpoint,
            requestHash: reqHash,
            responsePayload: mapped,
          }, client);
        }

        return mapped;
      },
      reverse: async (options, entryId, reason) => {
        await this.verifyTenantAccess(options);
        const reversed = await this.incomeRepo.reverseWithTransaction({
          entryId,
          mosqueId: options.mosqueId,
          reason,
          actorId: this.userContext.userId,
          actorName: this.userContext.userId,
          actorRole: this.userContext.userRole,
          ipAddress: options.clientIp,
        }, client);
        return this.mapIncomeRow(reversed);
      },
    };

    // Expense Ledger Sub-Repository
    this.expense = {
      list: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.expenseRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapExpenseRow(r));
      },
      findById: async (options, entryId) => {
        await this.verifyTenantAccess(options);
        const row = await this.expenseRepo.getById(entryId, options.mosqueId, client);
        return row ? this.mapExpenseRow(row) : null;
      },
      create: async (options, entry) => {
        await this.verifyTenantAccess(options);
        const endpoint = '/api/v1/expense-entries';
        const reqHash = crypto.createHash('sha256').update(JSON.stringify(entry, Object.keys(entry).sort())).digest('hex');

        if (options.idempotencyKey) {
          const existing = await this.idempotencyRepo.getRecord(options.idempotencyKey, endpoint, options.mosqueId, client);
          if (existing) {
            if (existing.request_hash && existing.request_hash !== reqHash) {
              throw new PostgresEngineError(
                'IDEMPOTENCY_PAYLOAD_MISMATCH',
                `Idempotency key [${options.idempotencyKey}] was previously used with a different request payload.`
              );
            }
            return existing.response_payload;
          }
        }

        const created = await this.expenseRepo.create({
          id: `exp-${Date.now()}`,
          mosqueId: options.mosqueId,
          voucherNumber: `EXP-${Date.now()}`,
          date: entry.date,
          mainHeadId: entry.mainHeadId,
          mainHeadNameBn: entry.mainHeadNameBn,
          subHeadId: entry.subHeadId,
          subHeadNameBn: entry.subHeadNameBn,
          amount: entry.amount,
          paymentMethod: entry.paymentMethod,
          accountId: entry.accountId,
          accountName: entry.accountName,
          payeeName: entry.payeeName || 'N/A',
          payeePhone: entry.payeePhone,
          reference: entry.reference,
          description: entry.description,
          attachmentUrl: entry.attachmentUrl,
          createdBy: this.userContext.userId,
          createdByName: this.userContext.userId,
        }, client);

        const mapped = this.mapExpenseRow(created);

        if (options.idempotencyKey) {
          await this.idempotencyRepo.saveRecord({
            id: `idem-${Date.now()}`,
            mosqueId: options.mosqueId,
            idempotencyKey: options.idempotencyKey,
            endpoint,
            requestHash: reqHash,
            responsePayload: mapped,
          }, client);
        }

        return mapped;
      },
      reverse: async (options, entryId, reason) => {
        await this.verifyTenantAccess(options);
        const reversed = await this.expenseRepo.reverseWithTransaction({
          entryId,
          mosqueId: options.mosqueId,
          reason,
          actorId: this.userContext.userId,
          actorName: this.userContext.userId,
          actorRole: this.userContext.userRole,
          ipAddress: options.clientIp,
        }, client);
        return this.mapExpenseRow(reversed);
      },
    };

    // Transfers Sub-Repository
    this.transfers = {
      list: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.transferRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapTransferRow(r));
      },
      create: async (options, transfer) => {
        await this.verifyTenantAccess(options);
        const endpoint = '/api/v1/transfers';
        const reqHash = crypto.createHash('sha256').update(JSON.stringify(transfer, Object.keys(transfer).sort())).digest('hex');

        if (options.idempotencyKey) {
          const existing = await this.idempotencyRepo.getRecord(options.idempotencyKey, endpoint, options.mosqueId, client);
          if (existing) {
            if (existing.request_hash && existing.request_hash !== reqHash) {
              throw new PostgresEngineError(
                'IDEMPOTENCY_PAYLOAD_MISMATCH',
                `Idempotency key [${options.idempotencyKey}] was previously used with a different request payload.`
              );
            }
            return existing.response_payload;
          }
        }

        const created = await this.transferRepo.executeTransfer({
          id: `trf-${Date.now()}`,
          mosqueId: options.mosqueId,
          transferNumber: `TRF-${Date.now()}`,
          date: transfer.date,
          fromAccountId: transfer.fromAccountId,
          fromAccountName: transfer.fromAccountName,
          toAccountId: transfer.toAccountId,
          toAccountName: transfer.toAccountName,
          amount: transfer.amount,
          reference: transfer.reference,
          description: transfer.description,
          createdBy: this.userContext.userId,
          createdByName: this.userContext.userId,
        }, client);

        const mapped = this.mapTransferRow(created);

        if (options.idempotencyKey) {
          await this.idempotencyRepo.saveRecord({
            id: `idem-${Date.now()}`,
            mosqueId: options.mosqueId,
            idempotencyKey: options.idempotencyKey,
            endpoint,
            requestHash: reqHash,
            responsePayload: mapped,
          }, client);
        }

        return mapped;
      },
    };

    // Forensic Audit Sub-Repository
    this.audit = {
      log: async (options, action, entityType, entityId, details, meta) => {
        await this.verifyTenantAccess(options);
        const logged = await this.auditRepo.insertLog({
          id: `aud-${Date.now()}`,
          mosqueId: options.mosqueId,
          userId: this.userContext.userId,
          userName: this.userContext.userId,
          userRole: this.userContext.userRole,
          action,
          entityType,
          entityId,
          details,
          ipAddress: options.clientIp,
          metaJson: meta,
        }, client);
        return this.mapAuditRow(logged);
      },
      list: async (options) => {
        await this.verifyTenantAccess(options);
        const rows = await this.auditRepo.listByMosque(options.mosqueId, undefined, client);
        return rows.map(r => this.mapAuditRow(r));
      },
    };

    // Committee Management [LOCKED MODULE] Sub-Repository
    this.committee = {
      getActiveTerm: async (options) => {
        await this.verifyTenantAccess(options);
        const row = await this.committeeRepo.getActiveTerm(options.mosqueId, client);
        return row ? this.mapTermRow(row) : null;
      },
      listMembers: async (options, termId) => {
        await this.verifyTenantAccess(options);
        const rows = await this.committeeRepo.listMembersByTerm(options.mosqueId, termId, client);
        return rows.map(r => this.mapMemberRow(r));
      },
    };
  }

  /**
   * Execute multi-table transaction inside single PostgreSQL SQL connection client.
   * Guarantees that ALL repository calls inside the transaction callback share one transaction client.
   */
  async executeTransaction<T>(work: (txDal: IDataAccessLayer) => Promise<T>): Promise<T> {
    if (this.activeClient) {
      // Already inside an active transaction client; reuse current context
      return await work(this);
    }

    return withTransaction(async (poolClient) => {
      const txEngine = new PostgresStorageEngine(this.userContext, this.pool, poolClient);
      return await work(txEngine);
    });
  }

  /**
   * Server-side Tenant Security Guard.
   * Non-SUPER_ADMIN callers CANNOT query a tenant ID different from their JWT claim.
   * For SUPER_ADMIN cross-tenant requests, verifies target mosque existence in DB using active client.
   */
  private async verifyTenantAccess(options: DALOptions): Promise<void> {
    if (!options || !options.mosqueId) {
      throw new PostgresEngineError('TENANT_REQUIRED', 'Tenant ID (mosqueId) is required for all DAL operations.');
    }

    if (this.userContext.userRole !== 'SUPER_ADMIN' && options.mosqueId !== this.userContext.userMosqueId) {
      throw new PostgresEngineError(
        'TENANT_FORBIDDEN',
        `Access denied. User belongs to mosque [${this.userContext.userMosqueId}] but requested mosque [${options.mosqueId}].`
      );
    }

    if (this.userContext.userRole === 'SUPER_ADMIN' && options.mosqueId !== this.userContext.userMosqueId) {
      const mosque = await this.mosqueRepo.getMosqueById(options.mosqueId, this.activeClient);
      if (!mosque) {
        throw new PostgresEngineError(
          'TARGET_MOSQUE_NOT_FOUND',
          `SUPER_ADMIN target mosque [${options.mosqueId}] does not exist.`
        );
      }
    }
  }

  // Row Mapper Utilities (DB snake_case -> TypeScript camelCase)
  private mapUserRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      username: r.username,
      name: r.name,
      phone: r.phone,
      email: r.email,
      role: r.role,
      permissions: r.permissions || [],
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  private mapMosqueRow(r: any): any {
    return {
      id: r.id,
      name: r.name,
      nameBn: r.name_bn,
      address: r.address,
      phone: r.contact_number,
      email: r.email,
      logoUrl: r.logo_url,
      registrationNumber: r.registration_number,
      division: r.division,
      district: r.district,
      upazila: r.upazila,
      postalCode: r.postal_code,
      letterheadSettings: r.letterhead_settings,
      prayerSettings: r.prayer_settings,
      publicPortalSettings: r.public_portal_settings,
    };
  }

  private mapAccountHeadRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      code: r.code,
      nameBn: r.name_bn,
      nameEn: r.name_en,
      type: r.type,
      parentId: r.parent_id,
      isSystem: r.is_system,
      isActive: r.is_active,
    };
  }

  private mapAccountRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      nameBn: r.name_bn,
      name: r.name,
      accountType: r.account_type,
      bankName: r.bank_name,
      branchName: r.branch_name,
      accountNumber: r.account_number,
      openingBalance: parseFloat(r.opening_balance || '0'),
      currentBalance: parseFloat(r.current_balance || '0'),
      status: r.status,
      isDefault: r.is_default,
    };
  }

  private mapIncomeRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      voucherNumber: r.voucher_number,
      date: r.date,
      mainHeadId: r.main_head_id,
      mainHeadNameBn: r.main_head_name_bn,
      subHeadId: r.sub_head_id,
      subHeadNameBn: r.sub_head_name_bn,
      amount: parseFloat(r.amount || '0'),
      paymentMethod: r.payment_method,
      accountId: r.account_id,
      accountName: r.account_name,
      donorName: r.donor_name,
      donorPhone: r.donor_phone,
      reference: r.reference,
      description: r.description,
      attachmentUrl: r.attachment_url,
      status: r.status,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
    };
  }

  private mapExpenseRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      voucherNumber: r.voucher_number,
      date: r.date,
      mainHeadId: r.main_head_id,
      mainHeadNameBn: r.main_head_name_bn,
      subHeadId: r.sub_head_id,
      subHeadNameBn: r.sub_head_name_bn,
      amount: parseFloat(r.amount || '0'),
      paymentMethod: r.payment_method,
      accountId: r.account_id,
      accountName: r.account_name,
      payeeName: r.payee_name,
      payeePhone: r.payee_phone,
      reference: r.reference,
      description: r.description,
      attachmentUrl: r.attachment_url,
      status: r.status,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
    };
  }

  private mapTransferRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      transferNumber: r.transfer_number,
      date: r.date,
      fromAccountId: r.from_account_id,
      fromAccountName: r.from_account_name,
      toAccountId: r.to_account_id,
      toAccountName: r.to_account_name,
      amount: parseFloat(r.amount || '0'),
      reference: r.reference,
      description: r.description,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
    };
  }

  private mapAuditRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      userId: r.user_id,
      userName: r.user_name,
      userRole: r.user_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
    };
  }

  private mapTermRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      termNameBn: r.term_name_bn,
      termNameEn: r.term_name_en,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
    };
  }

  private mapMemberRow(r: any): any {
    return {
      id: r.id,
      mosqueId: r.mosque_id,
      termId: r.term_id,
      memberNameBn: r.member_name_bn,
      designationBn: r.designation_bn,
      mobileNumber: r.mobile_number,
      status: r.status,
    };
  }
}

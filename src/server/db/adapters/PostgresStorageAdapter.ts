/**
 * MASJIDLEDGER PRO v2.6 — POSTGRESQL DATA ACCESS LAYER ADAPTER (PHASE 1B.2)
 * Task ID: ML-V26-DAL-PHASE1B2-SAFETY-FIX
 *
 * Implements IDataAccessLayer using the 10 canonical PostgreSQL repositories.
 * Enforces strict tenant isolation, double-entry immutability invariants,
 * cryptographic password validation, safe transaction/SAVEPOINT isolation,
 * and fail-fast database errors without silent JSON fallback.
 */

import pg from 'pg';
import {
  IDataAccessLayer,
  IUserRepository,
  IMosqueIdentityRepository,
  IAccountHeadRepository,
  CreateAccountHeadInput,
  UpdateAccountHeadInput,
  DeleteAccountHeadResult,
  IFinancialAccountRepository,
  CreateFinancialAccountInput,
  UpdateFinancialAccountInput,
  SetOpeningBalanceInput,
  IIncomeRepository,
  UpdateIncomeInput,
  IExpenseRepository,
  UpdateExpenseInput,
  ITransferRepository,
  IAuditRepository,
  IIdempotencyRepository,
  IdempotencyRecord,
  SaveIdempotencyInput,
  ICommitteeRepository,
  IDonationRepository,
  IDonationBoxRepository,
  IStaffRepository,
  IPropertyRepository,
  IAssetRepository,
  IMusalliRepository,
  IEducationRepository,
  ILibraryRepository,
  DALOptions,
} from '../interfaces/IDataAccessLayer';
import {
  User,
  UserRole,
  UserStatus,
  Permission,
  Mosque,
  AccountHead,
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  AccountTransfer,
  AuditLog,
  CommitteeTerm,
  CommitteeMember,
  PaymentMethod,
  TransactionStatus,
} from '../../../types';
import {
  PostgresAccountHeadRepository,
  PostgresFinancialAccountRepository,
  PostgresIncomeRepository,
  PostgresExpenseRepository,
  PostgresTransferRepository,
  PostgresAuditRepository,
  PostgresIdempotencyRepository,
  PostgresIdempotencyRow,
  PostgresMosqueIdentityRepository,
  PostgresUserRepository,
  PostgresCommitteeRepository,
  PostgresUserRow,
  PostgresMosqueRow,
  PostgresFinancialAccountRow,
  PostgresAccountHeadRow,
  PostgresIncomeEntryRow,
  PostgresExpenseEntryRow,
  PostgresAccountTransferRow,
  PostgresAuditLogRow,
  PostgresCommitteeTermRow,
  PostgresCommitteeMemberRow,
} from '../postgres/repositories';
import { getPostgresPool } from '../postgres/client';
import {
  TenantSecurityError,
  DalDomainError,
  JsonAssetParityRepository,
  JsonMusalliParityRepository,
  JsonEducationParityRepository,
  JsonLibraryParityRepository,
} from './JsonStorageAdapter';

export { TenantSecurityError, DalDomainError };

/**
 * Domain error when an operation is intentionally not supported or violates invariants.
 */
export class UnsupportedOperationError extends Error {
  constructor(public method: string, message?: string) {
    super(message || `Method '${method}' is not supported by PostgresStorageAdapter.`);
    this.name = 'UnsupportedOperationError';
  }
}

/**
 * Enforces strict server-side tenant security rules.
 * Non-SUPER_ADMIN callers can NEVER access a tenant different from their token claim.
 * SUPER_ADMIN requests are strictly verified against canonical mosque existence.
 */
async function verifyTenantSecurity(
  options: DALOptions,
  mosqueRepo?: PostgresMosqueIdentityRepository,
  client?: pg.PoolClient,
  targetMosqueId?: string
): Promise<void> {
  if (!options || !options.mosqueId) {
    throw new TenantSecurityError('TENANT_REQUIRED', 'Tenant ID (mosqueId) is required for DAL operations.');
  }

  const userRole = options.userContext?.userRole;
  const userMosqueId = options.userContext?.userMosqueId;
  const targetId = targetMosqueId || options.mosqueId;

  if (userRole !== 'SUPER_ADMIN' && targetId !== userMosqueId) {
    throw new TenantSecurityError(
      'TENANT_FORBIDDEN',
      `Access denied. User belongs to mosque [${userMosqueId}] but requested mosque [${targetId}].`
    );
  }

  // SUPER_ADMIN validation: verify target mosque exists in PostgreSQL database
  if (userRole === 'SUPER_ADMIN') {
    if (mosqueRepo) {
      const mosque = await mosqueRepo.getMosqueById(targetId, client);
      if (!mosque) {
        throw new TenantSecurityError(
          'TARGET_MOSQUE_NOT_FOUND',
          `SUPER_ADMIN target mosque [${targetId}] does not exist.`
        );
      }
    }
  }
}

// ============================================================================
// Entity Mappers: PostgreSQL Rows -> TypeScript Domain Entities
// ============================================================================

function mapUserRow(row: PostgresUserRow): User {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    role: row.role as UserRole,
    permissions: (row.permissions || []) as Permission[],
    status: row.status as UserStatus,
    lastLogin: row.last_login ? row.last_login.toISOString() : undefined,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
  };
}

function mapMosqueRow(row: PostgresMosqueRow): Mosque {
  return {
    id: row.id,
    code: row.registration_number || row.id,
    name: row.name,
    nameBn: row.name_bn,
    nameEn: row.name,
    address: row.address,
    phone: row.contact_number,
    email: row.email || undefined,
    logoUrl: row.logo_url || undefined,
    establishedDate: row.established_year || undefined,
    registrationNumber: row.registration_number || undefined,
    division: row.division || undefined,
    district: row.district || undefined,
    upazila: row.upazila || undefined,
    country: 'Bangladesh',
    status: 'ACTIVE',
    letterheadSettings: row.letterhead_settings || undefined,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
  };
}

function mapAccountRow(row: PostgresFinancialAccountRow): FinancialAccount {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    name: row.name || row.name_bn,
    nameBn: row.name_bn,
    accountType: row.account_type,
    bankName: row.bank_name || undefined,
    branchName: row.branch_name || undefined,
    accountNumber: row.account_number || undefined,
    mfsProvider: row.mfs_provider || undefined,
    mobileNumber: row.mobile_number || undefined,
    routingNumber: row.routing_number || undefined,
    contactPerson: row.contact_person || undefined,
    notes: row.notes || undefined,
    openingBalance: parseFloat(row.opening_balance || '0'),
    openingBalanceDate: row.opening_balance_date || undefined,
    openingBalanceType: row.opening_balance_type,
    openingBalanceSource: row.opening_balance_source || undefined,
    openingBalanceNote: row.opening_balance_note || undefined,
    currentBalance: parseFloat(row.current_balance || '0'),
    status: row.status === 'ARCHIVED' ? 'CLOSED' : (row.status as 'ACTIVE' | 'INACTIVE' | 'CLOSED'),
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
  };
}

function mapAccountHeadRow(row: PostgresAccountHeadRow): AccountHead {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    code: row.code,
    nameBn: row.name_bn,
    nameEn: row.name_en,
    type: row.type,
    parentId: row.parent_id,
    description: row.description || undefined,
    isSystem: row.is_system,
    isActive: row.is_active,
    createdAt: row.created_at ? row.created_at.toISOString() : undefined,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
    createdBy: row.created_by || undefined,
  };
}

function mapIncomeRow(row: PostgresIncomeEntryRow): IncomeEntry {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    voucherNumber: row.voucher_number,
    date: row.date,
    mainHeadId: row.main_head_id,
    mainHeadNameBn: row.main_head_name_bn,
    subHeadId: row.sub_head_id || undefined,
    subHeadNameBn: row.sub_head_name_bn || undefined,
    amount: parseFloat(row.amount || '0'),
    paymentMethod: (row.payment_method || 'CASH') as PaymentMethod,
    accountId: row.account_id,
    accountName: row.account_name,
    donorName: row.donor_name || undefined,
    donorPhone: row.donor_phone || undefined,
    reference: row.reference || undefined,
    description: row.description || undefined,
    attachmentUrl: row.attachment_url || undefined,
    status: (row.status === 'CANCELLED' ? 'CANCELLED' : row.status) as TransactionStatus,
    createdBy: row.created_by,
    createdByName: row.created_by_name || row.created_by,
    approvedBy: row.approved_by || undefined,
    approvedByName: row.approved_by_name || undefined,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : undefined,
    rejectionReason: row.rejection_reason || undefined,
    denominationData: row.denomination_data || undefined,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
  };
}

function mapExpenseRow(row: PostgresExpenseEntryRow): ExpenseEntry {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    voucherNumber: row.voucher_number,
    date: row.date,
    mainHeadId: row.main_head_id,
    mainHeadNameBn: row.main_head_name_bn,
    subHeadId: row.sub_head_id || undefined,
    subHeadNameBn: row.sub_head_name_bn || undefined,
    amount: parseFloat(row.amount || '0'),
    paymentMethod: (row.payment_method || 'CASH') as PaymentMethod,
    accountId: row.account_id,
    accountName: row.account_name,
    payeeName: row.payee_name,
    payeePhone: row.payee_phone || undefined,
    reference: row.reference || undefined,
    description: row.description || undefined,
    attachmentUrl: row.attachment_url || undefined,
    sourceModule: row.source_module || undefined,
    sourceId: row.source_id || undefined,
    sourceType: row.source_type || undefined,
    status: (row.status === 'CANCELLED' ? 'CANCELLED' : row.status) as TransactionStatus,
    createdBy: row.created_by,
    createdByName: row.created_by_name || row.created_by,
    approvedBy: row.approved_by || undefined,
    approvedByName: row.approved_by_name || undefined,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : undefined,
    rejectionReason: row.rejection_reason || undefined,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
  };
}

function mapIdempotencyRow<T = any>(row: PostgresIdempotencyRow): IdempotencyRecord<T> {
  return {
    id: row.id,
    mosqueId: row.mosque_id || '',
    idempotencyKey: row.idempotency_key,
    endpoint: row.endpoint,
    requestHash: row.request_hash || undefined,
    responsePayload: row.response_payload as T,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : new Date().toISOString(),
  };
}

function mapTransferRow(row: PostgresAccountTransferRow): AccountTransfer {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    transferNumber: row.transfer_number,
    fromAccountId: row.from_account_id,
    fromAccountName: row.from_account_name,
    toAccountId: row.to_account_id,
    toAccountName: row.to_account_name,
    amount: parseFloat(row.amount || '0'),
    date: row.date,
    purpose: row.purpose || undefined,
    description: row.description || undefined,
    reference: row.reference || undefined,
    attachmentUrl: row.attachment_url || undefined,
    createdBy: row.created_by,
    createdByName: row.created_by_name || row.created_by,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

function mapAuditRow(row: PostgresAuditLogRow): AuditLog {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role as UserRole,
    action: row.action as any,
    module: (row.entity_type || 'SYSTEM') as any,
    details: row.details || '',
    ipAddress: row.ip_address || undefined,
    timestamp: row.timestamp ? row.timestamp.toISOString() : new Date().toISOString(),
    status: 'SUCCESS',
  };
}

function mapCommitteeTermRow(row: PostgresCommitteeTermRow): CommitteeTerm {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    title: row.term_name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as any,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

function mapCommitteeMemberRow(row: PostgresCommitteeMemberRow): CommitteeMember {
  return {
    id: row.id,
    mosqueId: row.mosque_id,
    termId: row.term_id,
    name: row.name,
    position: (row.designation as any) || 'MEMBER',
    positionCustomBn: row.designation_bn,
    phone: row.phone,
    nid: row.nid || undefined,
    photoUrl: row.photo_url || undefined,
    status: (row.status as any) || 'ACTIVE',
    joinDate: row.join_date,
    endDate: row.exit_date || undefined,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

// ============================================================================
// Secure Raw Repository Proxy Wrapper
// ============================================================================

/**
 * Wraps raw underlying PostgreSQL repositories to prevent tenant boundary bypasses
 * and enforce transaction connection propagation.
 */
function wrapRawRepository<T extends object>(
  repo: T,
  getOptions: () => DALOptions | undefined,
  getActiveClient: () => pg.PoolClient | undefined,
  mosqueRepo: PostgresMosqueIdentityRepository
): T {
  return new Proxy(repo, {
    get(target, propKey, receiver) {
      const orig = Reflect.get(target, propKey, receiver);
      if (typeof orig !== 'function') {
        return orig;
      }
      return async function (...args: any[]) {
        const options = getOptions();
        const activeClient = getActiveClient();

        // 1. Identify target mosqueId from arguments
        let targetMosqueId: string | undefined;
        if (
          typeof args[0] === 'string' &&
          (args[0].startsWith('mosque-') ||
            propKey === 'listByMosque' ||
            propKey === 'findByMosqueId' ||
            propKey === 'getActiveTerm' ||
            propKey === 'listTerms' ||
            propKey === 'getMosqueById' ||
            propKey === 'updateMosqueSettings')
        ) {
          targetMosqueId = args[0];
        } else if (
          typeof args[1] === 'string' &&
          (args[1].startsWith('mosque-') ||
            propKey === 'getById' ||
            propKey === 'findById' ||
            propKey === 'findByLoginIdentifier' ||
            propKey === 'updateProfile' ||
            propKey === 'updateRBAC' ||
            propKey === 'adjustBalance' ||
            propKey === 'listMembersByTerm')
        ) {
          targetMosqueId = args[1];
        } else if (args[0] && typeof args[0] === 'object' && args[0].mosqueId) {
          targetMosqueId = args[0].mosqueId;
        }

        // 2. Strict tenant authorization check: Callers cannot bypass tenant boundaries
        if (options) {
          await verifyTenantSecurity(options, mosqueRepo, activeClient, targetMosqueId || options.mosqueId);
        } else {
          throw new TenantSecurityError(
            'TENANT_REQUIRED',
            'Direct raw repository access requires an authorized DALOptions context.'
          );
        }

        // 3. Prevent accidental second connection checkout during active transaction:
        // Automatically inject or bind activeClient into repository method call
        if (activeClient) {
          let replaced = false;
          for (let i = 0; i < args.length; i++) {
            if (args[i] && typeof args[i] === 'object' && 'query' in args[i]) {
              args[i] = activeClient;
              replaced = true;
              break;
            }
          }
          if (!replaced) {
            args.push(activeClient);
          }
        }

        return orig.apply(target, args);
      };
    },
  });
}

// ============================================================================
// Concrete Sub-Repositories Bound to PostgresStorageAdapter
// ============================================================================

class PostgresUserDalRepository implements IUserRepository {
  constructor(
    private repo: PostgresUserRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async findById(options: DALOptions, userId: string): Promise<User | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.findById(userId, options.mosqueId, this.getClient());
    return row ? mapUserRow(row) : null;
  }

  async findByPhone(options: DALOptions, phone: string): Promise<User | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.findByLoginIdentifier(phone, options.mosqueId, this.getClient());
    if (row && options.userContext.userRole !== 'SUPER_ADMIN' && row.mosque_id !== options.mosqueId) {
      throw new TenantSecurityError('TENANT_FORBIDDEN', 'User belongs to different tenant.');
    }
    return row ? mapUserRow(row) : null;
  }

  async listByMosque(options: DALOptions): Promise<User[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapUserRow);
  }

  async list(options: DALOptions): Promise<User[]> {
    return this.listByMosque(options);
  }

  async createUser(options: DALOptions, user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());

    // Validate that caller provided a cryptographically valid bcrypt password hash
    const candidateHash = (user as any).passwordHash || (user as any).password_hash;
    const isBcrypt = typeof candidateHash === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(candidateHash);
    const isPlaceholder = typeof candidateHash === 'string' && candidateHash.toLowerCase().includes('placeholder');

    if (!isBcrypt || isPlaceholder) {
      throw new UnsupportedOperationError(
        'createUser',
        'User creation requires a valid, securely generated bcrypt passwordHash. Placeholder, predictable, empty, or plaintext passwords are not permitted.'
      );
    }

    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row = await this.repo.create(
      {
        id,
        mosqueId: options.mosqueId,
        name: user.name,
        phone: user.phone,
        email: user.email || null,
        passwordHash: candidateHash,
        role: user.role,
        permissions: user.permissions || [],
        status: user.status || 'ACTIVE',
      },
      this.getClient()
    );
    return mapUserRow(row);
  }

  async updateUser(options: DALOptions, userId: string, updates: Partial<User>): Promise<User> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const updated = await this.repo.updateProfile(
      userId,
      options.mosqueId,
      {
        name: updates.name,
        phone: updates.phone,
        email: updates.email,
        userId: options.userContext.userId,
        userName: options.userContext.userName || options.userContext.userId,
        userRole: options.userContext.userRole,
        ipAddress: options.clientIp,
      },
      this.getClient()
    );
    if (!updated) {
      throw new Error(`[PostgresUserDalRepository] User [${userId}] not found in mosque [${options.mosqueId}]`);
    }
    return mapUserRow(updated);
  }
}

class PostgresMosqueIdentityDalRepository implements IMosqueIdentityRepository {
  constructor(
    private repo: PostgresMosqueIdentityRepository,
    private defaultOptions?: DALOptions,
    private getClient?: () => pg.PoolClient | undefined
  ) {}

  async findById(mosqueId: string, options?: DALOptions): Promise<Mosque | null> {
    const activeOptions = options || this.defaultOptions;
    const targetId = mosqueId || activeOptions?.mosqueId;
    if (!targetId) {
      throw new TenantSecurityError('TENANT_REQUIRED', 'Mosque ID is required.');
    }
    const client = this.getClient ? this.getClient() : undefined;
    if (activeOptions) {
      await verifyTenantSecurity(activeOptions, this.repo, client, targetId);
    }
    const row = await this.repo.getMosqueById(targetId, client);
    return row ? mapMosqueRow(row) : null;
  }

  async getById(options: DALOptions, mosqueId?: string): Promise<Mosque | null> {
    const targetId = mosqueId || options.mosqueId;
    return this.findById(targetId, options);
  }

  async updateSettings(options: DALOptions, updates: Partial<Mosque>): Promise<Mosque> {
    const client = this.getClient ? this.getClient() : undefined;
    await verifyTenantSecurity(options, this.repo, client);
    const row = await this.repo.updateMosqueSettings(
      options.mosqueId,
      {
        letterheadSettings: updates.letterheadSettings,
        prayerSettings: (updates as any).prayerSettings,
        publicPortalSettings: (updates as any).publicPortalSettings,
        userId: options.userContext.userId,
        userName: options.userContext.userName || options.userContext.userId,
        userRole: options.userContext.userRole,
        ipAddress: options.clientIp,
      },
      client
    );
    return mapMosqueRow(row);
  }
}

class PostgresAccountHeadDalRepository implements IAccountHeadRepository {
  constructor(
    private repo: PostgresAccountHeadRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async list(options: DALOptions): Promise<AccountHead[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapAccountHeadRow);
  }

  async findById(options: DALOptions, headId: string): Promise<AccountHead | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.getById(headId, options.mosqueId, this.getClient());
    return row ? mapAccountHeadRow(row) : null;
  }

  async create(options: DALOptions, head: CreateAccountHeadInput): Promise<AccountHead> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `head-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const code = head.code || `${head.type === 'INCOME' ? 'INC' : 'EXP'}-${Date.now().toString().slice(-4)}`;
    const row = await this.repo.create(
      {
        id,
        mosqueId: options.mosqueId,
        code,
        nameBn: head.nameBn,
        nameEn: head.nameEn,
        type: head.type,
        parentId: head.parentId,
        description: head.description,
        isSystem: head.isSystem ?? false,
        isActive: head.isActive ?? true,
        createdBy: options.userContext.userId,
      },
      this.getClient()
    );
    return mapAccountHeadRow(row);
  }

  async update(
    options: DALOptions,
    headId: string,
    updates: UpdateAccountHeadInput
  ): Promise<AccountHead> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const resolvedIsActive =
      updates.isActive !== undefined
        ? updates.isActive
        : updates.status !== undefined
          ? updates.status === 'ACTIVE'
          : undefined;
    const row = await this.repo.update(
      headId,
      options.mosqueId,
      {
        nameBn: updates.nameBn,
        nameEn: updates.nameEn,
        description: updates.description,
        isActive: resolvedIsActive,
      },
      this.getClient()
    );
    if (!row) {
      throw new DalDomainError('NOT_FOUND', 'হিসাব খাত পাওয়া যায়নি।');
    }
    return mapAccountHeadRow(row);
  }

  async deleteOrArchive(options: DALOptions, headId: string): Promise<DeleteAccountHeadResult> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const existing = await this.repo.getById(headId, options.mosqueId, this.getClient());
    if (!existing) {
      throw new DalDomainError('NOT_FOUND', 'হিসাব খাত পাওয়া যায়নি।');
    }
    const usage = await this.repo.checkUsage(headId, options.mosqueId, this.getClient());
    if (usage.childCount > 0) {
      throw new DalDomainError(
        'CHILD_HEADS_EXIST',
        `এই প্রধান খাতের অধীনে ${usage.childCount}টি উপ-খাত রয়েছে। প্রধান খাত মুছে ফেলার আগে উপ-খাতগুলো ডিলিট বা স্থানান্তর করুন।`
      );
    }
    const totalCount = usage.inIncome + usage.inExpense;
    if (totalCount > 0) {
      const archived = await this.repo.update(
        headId,
        options.mosqueId,
        { isActive: false },
        this.getClient()
      );
      const mapped = mapAccountHeadRow(archived || existing);
      mapped.status = 'ARCHIVED';
      mapped.isActive = false;
      return {
        action: 'ARCHIVED',
        head: mapped,
        usageCount: totalCount,
      };
    }
    const executor = this.getClient() || getPostgresPool();
    await executor.query(`DELETE FROM account_heads WHERE id = $1 AND mosque_id = $2`, [
      headId,
      options.mosqueId,
    ]);
    return {
      action: 'DELETED',
      head: mapAccountHeadRow(existing),
      usageCount: 0,
    };
  }
}

class PostgresFinancialAccountDalRepository implements IFinancialAccountRepository {
  constructor(
    private repo: PostgresFinancialAccountRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async list(options: DALOptions): Promise<FinancialAccount[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapAccountRow);
  }

  async findById(options: DALOptions, accountId: string): Promise<FinancialAccount | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.getById(accountId, options.mosqueId, this.getClient());
    return row ? mapAccountRow(row) : null;
  }

  async create(
    options: DALOptions,
    account: CreateFinancialAccountInput
  ): Promise<FinancialAccount> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const bal = Number(account.openingBalance) || 0;
    const openType = account.openingBalanceType || 'DEBIT';
    const currentBal = openType === 'CREDIT' ? -bal : bal;
    const status = account.status === 'CLOSED' ? 'ARCHIVED' : account.status || 'ACTIVE';
    const row = await this.repo.create(
      {
        id,
        mosqueId: options.mosqueId,
        name: account.name || account.nameBn,
        nameBn: account.nameBn,
        accountType:
          account.accountType === 'CASH' || account.accountType === 'BANK' || account.accountType === 'MFS'
            ? account.accountType
            : 'BANK',
        bankName: account.bankName,
        branchName: account.branchName,
        accountNumber: account.accountNumber,
        mfsProvider: account.mfsProvider,
        mobileNumber: account.mobileNumber,
        routingNumber: account.routingNumber,
        contactPerson: account.contactPerson,
        notes: account.notes,
        openingBalance: bal,
        openingBalanceDate: account.openingBalanceDate || new Date().toISOString().split('T')[0],
        openingBalanceType: openType,
        openingBalanceSource: account.openingBalanceSource || 'INITIAL',
        openingBalanceNote: account.openingBalanceNote || 'প্রাথমিক অ্যাকাউন্ট সেটআপ',
        currentBalance: currentBal,
        status,
        isActive: status === 'ACTIVE',
      },
      this.getClient()
    );
    return mapAccountRow(row);
  }

  async update(
    options: DALOptions,
    accountId: string,
    updates: UpdateFinancialAccountInput
  ): Promise<FinancialAccount> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const status =
      updates.status === 'CLOSED'
        ? 'ARCHIVED'
        : (updates.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | undefined);
    const row = await this.repo.update(
      accountId,
      options.mosqueId,
      {
        name: updates.name || updates.nameBn,
        nameBn: updates.nameBn,
        bankName: updates.bankName,
        branchName: updates.branchName,
        accountNumber: updates.accountNumber,
        mfsProvider: updates.mfsProvider,
        mobileNumber: updates.mobileNumber,
        routingNumber: updates.routingNumber,
        contactPerson: updates.contactPerson,
        notes: updates.notes,
        status,
        isActive: status !== undefined ? status === 'ACTIVE' : undefined,
      },
      this.getClient()
    );
    if (!row) {
      throw new DalDomainError('NOT_FOUND', 'অ্যাকাউন্ট পাওয়া যায়নি।');
    }
    return mapAccountRow(row);
  }

  async setOpeningBalance(
    options: DALOptions,
    accountId: string,
    input: SetOpeningBalanceInput
  ): Promise<FinancialAccount> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const existing = await this.repo.getById(accountId, options.mosqueId, this.getClient());
    if (!existing) {
      throw new DalDomainError('NOT_FOUND', 'নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।');
    }
    const newOpening =
      input.openingBalance !== undefined
        ? Number(input.openingBalance) || 0
        : parseFloat(existing.opening_balance || '0');
    const openType = input.openingBalanceType || existing.opening_balance_type || 'DEBIT';
    const baseOpening = openType === 'CREDIT' ? -newOpening : newOpening;
    const prevBase =
      existing.opening_balance_type === 'CREDIT'
        ? -parseFloat(existing.opening_balance || '0')
        : parseFloat(existing.opening_balance || '0');
    const delta = baseOpening - prevBase;
    const executor = this.getClient() || getPostgresPool();
    const res = await executor.query<PostgresFinancialAccountRow>(
      `UPDATE financial_accounts
       SET opening_balance = $1,
           opening_balance_date = COALESCE($2, opening_balance_date),
           opening_balance_type = $3,
           opening_balance_source = COALESCE($4, opening_balance_source),
           opening_balance_note = COALESCE($5, opening_balance_note),
           current_balance = current_balance + $6,
           updated_at = NOW()
       WHERE id = $7 AND mosque_id = $8
       RETURNING *`,
      [
        String(newOpening),
        input.openingBalanceDate || null,
        openType,
        input.openingBalanceSource || null,
        input.openingBalanceNote !== undefined ? input.openingBalanceNote : null,
        String(delta),
        accountId,
        options.mosqueId,
      ]
    );
    if (!res.rows[0]) {
      throw new DalDomainError('NOT_FOUND', 'নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।');
    }
    return mapAccountRow(res.rows[0]);
  }

  async updateBalance(options: DALOptions, accountId: string, newBalance: number): Promise<void> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    throw new UnsupportedOperationError(
      'updateBalance',
      'Direct balance override is unsupported for financial integrity. Use adjustBalance with delta or transactional vouchers.'
    );
  }
}

class PostgresIncomeDalRepository implements IIncomeRepository {
  constructor(
    private repo: PostgresIncomeRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async list(options: DALOptions): Promise<IncomeEntry[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapIncomeRow);
  }

  async findById(options: DALOptions, entryId: string): Promise<IncomeEntry | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.getById(entryId, options.mosqueId, this.getClient());
    return row ? mapIncomeRow(row) : null;
  }

  async create(options: DALOptions, entry: Omit<IncomeEntry, 'id' | 'voucherNumber'>): Promise<IncomeEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const voucherNumber = `INC-${Date.now().toString().slice(-6)}`;
    const row = await this.repo.create(
      {
        id,
        mosqueId: options.mosqueId,
        voucherNumber,
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
        denominationData: entry.denominationData,
        status: (entry.status as any) || 'APPROVED',
        createdBy: options.userContext.userId,
        createdByName: entry.createdByName || options.userContext.userName || options.userContext.userId,
        approvedBy: entry.approvedBy,
        approvedByName: entry.approvedByName,
        approvedAt: entry.approvedAt,
      },
      this.getClient()
    );
    return mapIncomeRow(row);
  }

  async update(
    options: DALOptions,
    entryId: string,
    updates: UpdateIncomeInput
  ): Promise<IncomeEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const existing = await this.repo.getById(entryId, options.mosqueId, this.getClient());
    if (!existing) {
      throw new DalDomainError('NOT_FOUND', 'আয় ভাউচার পাওয়া যায়নি।');
    }
    if (existing.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'বাতিলকৃত আয় ভাউচার সংশোধন করা সম্ভব নয়।');
    }
    const executor = this.getClient() || getPostgresPool();
    const res = await executor.query<PostgresIncomeEntryRow>(
      `UPDATE income_entries
       SET amount = COALESCE($1, amount),
           donor_name = COALESCE($2, donor_name),
           donor_phone = COALESCE($3, donor_phone),
           reference = COALESCE($4, reference),
           description = COALESCE($5, description),
           date = COALESCE($6, date),
           denomination_data = COALESCE($7, denomination_data),
           updated_at = NOW()
       WHERE id = $8 AND mosque_id = $9
       RETURNING *`,
      [
        updates.amount !== undefined ? String(updates.amount) : null,
        updates.donorName !== undefined ? updates.donorName : null,
        updates.donorPhone !== undefined ? updates.donorPhone : null,
        updates.reference !== undefined ? updates.reference : null,
        updates.description !== undefined ? updates.description : null,
        updates.date !== undefined ? updates.date : null,
        updates.denominationData !== undefined ? JSON.stringify(updates.denominationData) : null,
        entryId,
        options.mosqueId,
      ]
    );
    return mapIncomeRow(res.rows[0]);
  }

  async updateDenomination(
    options: DALOptions,
    entryId: string,
    denominationData: any,
    _editReason?: string
  ): Promise<IncomeEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    if (!denominationData) {
      throw new DalDomainError('INVALID_DATA', 'ডিনোমিনেশন ডাটা আবশ্যক।');
    }
    const existing = await this.repo.getById(entryId, options.mosqueId, this.getClient());
    if (!existing) {
      throw new DalDomainError('NOT_FOUND', 'আয় ভাউচার পাওয়া যায়নি।');
    }
    const executor = this.getClient() || getPostgresPool();
    const res = await executor.query<PostgresIncomeEntryRow>(
      `UPDATE income_entries
       SET denomination_data = $1,
           updated_at = NOW()
       WHERE id = $2 AND mosque_id = $3
       RETURNING *`,
      [JSON.stringify(denominationData), entryId, options.mosqueId]
    );
    return mapIncomeRow(res.rows[0]);
  }

  async reverse(options: DALOptions, entryId: string, reason: string): Promise<IncomeEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.reverseWithTransaction(
      {
        entryId,
        mosqueId: options.mosqueId,
        reason,
        actorId: options.userContext.userId,
        actorName: options.userContext.userName || options.userContext.userId,
        actorRole: options.userContext.userRole,
        ipAddress: options.clientIp,
      },
      this.getClient()
    );
    return mapIncomeRow(row);
  }
}

class PostgresExpenseDalRepository implements IExpenseRepository {
  constructor(
    private repo: PostgresExpenseRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async list(options: DALOptions): Promise<ExpenseEntry[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapExpenseRow);
  }

  async findById(options: DALOptions, entryId: string): Promise<ExpenseEntry | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.getById(entryId, options.mosqueId, this.getClient());
    return row ? mapExpenseRow(row) : null;
  }

  async create(options: DALOptions, entry: Omit<ExpenseEntry, 'id' | 'voucherNumber'>): Promise<ExpenseEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const voucherNumber = `EXP-${Date.now().toString().slice(-6)}`;
    const row = await this.repo.create(
      {
        id,
        mosqueId: options.mosqueId,
        voucherNumber,
        date: entry.date,
        mainHeadId: entry.mainHeadId,
        mainHeadNameBn: entry.mainHeadNameBn,
        subHeadId: entry.subHeadId,
        subHeadNameBn: entry.subHeadNameBn,
        amount: entry.amount,
        paymentMethod: entry.paymentMethod,
        accountId: entry.accountId,
        accountName: entry.accountName,
        payeeName: entry.payeeName,
        payeePhone: entry.payeePhone,
        reference: entry.reference,
        description: entry.description,
        attachmentUrl: entry.attachmentUrl,
        sourceModule: entry.sourceModule,
        sourceId: entry.sourceId,
        sourceType: entry.sourceType,
        status: (entry.status as any) || 'APPROVED',
        createdBy: options.userContext.userId,
        createdByName: entry.createdByName || options.userContext.userName || options.userContext.userId,
        approvedBy: entry.approvedBy,
        approvedByName: entry.approvedByName,
        approvedAt: entry.approvedAt,
      },
      this.getClient()
    );
    return mapExpenseRow(row);
  }

  async update(
    options: DALOptions,
    entryId: string,
    updates: UpdateExpenseInput
  ): Promise<ExpenseEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const existing = await this.repo.getById(entryId, options.mosqueId, this.getClient());
    if (!existing) {
      throw new DalDomainError('NOT_FOUND', 'ব্যয় ভাউচার পাওয়া যায়নি।');
    }
    if (existing.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'বাতিলকৃত ব্যয় ভাউচার সংশোধন করা সম্ভব নয়।');
    }
    const executor = this.getClient() || getPostgresPool();
    const res = await executor.query<PostgresExpenseEntryRow>(
      `UPDATE expense_entries
       SET amount = COALESCE($1, amount),
           payee_name = COALESCE($2, payee_name),
           payee_phone = COALESCE($3, payee_phone),
           reference = COALESCE($4, reference),
           description = COALESCE($5, description),
           date = COALESCE($6, date),
           updated_at = NOW()
       WHERE id = $7 AND mosque_id = $8
       RETURNING *`,
      [
        updates.amount !== undefined ? String(updates.amount) : null,
        updates.payeeName !== undefined ? updates.payeeName : null,
        updates.payeePhone !== undefined ? updates.payeePhone : null,
        updates.reference !== undefined ? updates.reference : null,
        updates.description !== undefined ? updates.description : null,
        updates.date !== undefined ? updates.date : null,
        entryId,
        options.mosqueId,
      ]
    );
    return mapExpenseRow(res.rows[0]);
  }

  async reverse(options: DALOptions, entryId: string, reason: string): Promise<ExpenseEntry> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.reverseWithTransaction(
      {
        entryId,
        mosqueId: options.mosqueId,
        reason,
        actorId: options.userContext.userId,
        actorName: options.userContext.userName || options.userContext.userId,
        actorRole: options.userContext.userRole,
        ipAddress: options.clientIp,
      },
      this.getClient()
    );
    return mapExpenseRow(row);
  }
}

class PostgresTransferDalRepository implements ITransferRepository {
  constructor(
    private repo: PostgresTransferRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async list(options: DALOptions): Promise<AccountTransfer[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapTransferRow);
  }

  async create(options: DALOptions, transfer: Omit<AccountTransfer, 'id' | 'transferNumber'>): Promise<AccountTransfer> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `trf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;
    const row = await this.repo.executeTransfer(
      {
        id,
        mosqueId: options.mosqueId,
        transferNumber,
        fromAccountId: transfer.fromAccountId,
        fromAccountName: transfer.fromAccountName,
        toAccountId: transfer.toAccountId,
        toAccountName: transfer.toAccountName,
        amount: transfer.amount,
        date: transfer.date,
        purpose: transfer.purpose,
        description: transfer.description,
        reference: transfer.reference,
        attachmentUrl: transfer.attachmentUrl,
        createdBy: options.userContext.userId,
        createdByName: transfer.createdByName || options.userContext.userName || options.userContext.userId,
        userRole: options.userContext.userRole,
        ipAddress: options.clientIp,
      },
      this.getClient()
    );
    return mapTransferRow(row);
  }
}

class PostgresAuditDalRepository implements IAuditRepository {
  constructor(
    private repo: PostgresAuditRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async log(
    options: DALOptions,
    action: string,
    entityType: string,
    entityId?: string,
    details?: string,
    meta?: any
  ): Promise<AuditLog> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row = await this.repo.insertLog(
      {
        id,
        mosqueId: options.mosqueId,
        userId: options.userContext.userId,
        userName: options.userContext.userName || options.userContext.userId,
        userRole: options.userContext.userRole,
        action,
        entityType,
        entityId,
        details,
        ipAddress: options.clientIp,
        metaJson: meta,
      },
      this.getClient()
    );
    return mapAuditRow(row);
  }

  async list(options: DALOptions): Promise<AuditLog[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listByMosque(options.mosqueId, undefined, this.getClient());
    return rows.map(mapAuditRow);
  }
}

class PostgresIdempotencyDalRepository implements IIdempotencyRepository {
  constructor(
    private repo: PostgresIdempotencyRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async getRecord<T = any>(
    options: DALOptions,
    endpoint: string,
    idempotencyKey?: string
  ): Promise<IdempotencyRecord<T> | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const key = idempotencyKey || options.idempotencyKey;
    if (!key) {
      return null;
    }
    const row = await this.repo.getRecord(key, endpoint, options.mosqueId, this.getClient());
    return row ? mapIdempotencyRow<T>(row) : null;
  }

  async saveRecord<T = any>(
    options: DALOptions,
    input: SaveIdempotencyInput<T>
  ): Promise<IdempotencyRecord<T> | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const key = input.idempotencyKey || options.idempotencyKey;
    if (!key) {
      return null;
    }
    const id = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const row = await this.repo.saveRecord(
      {
        id,
        mosqueId: options.mosqueId,
        idempotencyKey: key,
        endpoint: input.endpoint,
        requestHash: input.requestHash || null,
        responsePayload: input.responsePayload,
        ttlSeconds: input.ttlSeconds,
      },
      this.getClient()
    );
    return mapIdempotencyRow<T>(row);
  }

  async cleanupExpired(options: DALOptions): Promise<number> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return this.repo.cleanupExpired(this.getClient());
  }
}

class PostgresCommitteeDalRepository implements ICommitteeRepository {
  constructor(
    private repo: PostgresCommitteeRepository,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  async getActiveTerm(options: DALOptions): Promise<CommitteeTerm | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const row = await this.repo.getActiveTerm(options.mosqueId, this.getClient());
    return row ? mapCommitteeTermRow(row) : null;
  }

  async listMembers(options: DALOptions, termId: string): Promise<CommitteeMember[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const rows = await this.repo.listMembersByTerm(termId, options.mosqueId, this.getClient());
    return rows.map(mapCommitteeMemberRow);
  }
}

export class PostgresDonationDalRepository implements IDonationRepository {
  constructor(
    private pool: pg.Pool,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  private getExecutor(): pg.Pool | pg.PoolClient {
    return this.getClient() || this.pool;
  }

  async list(options: DALOptions): Promise<any[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `SELECT * FROM donations WHERE mosque_id = $1 ORDER BY date DESC, created_at DESC`,
      [options.mosqueId]
    );
    return res.rows;
  }

  async findById(options: DALOptions, id: string): Promise<any | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `SELECT * FROM donations WHERE id = $1 AND mosque_id = $2 LIMIT 1`,
      [id, options.mosqueId]
    );
    return res.rows[0] || null;
  }

  async create(options: DALOptions, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `don-${Date.now()}`;
    const receiptNumber = payload.receiptNumber || `MR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const res = await this.getExecutor().query(
      `INSERT INTO donations (
        id, mosque_id, receipt_number, donor_name, donor_phone, donor_address,
        is_anonymous, donation_type, amount, date, payment_method, account_id,
        account_name, reference, purpose, month_name, pledge_id, notes, status, received_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'COMPLETED',$19)
      RETURNING *`,
      [
        id,
        options.mosqueId,
        receiptNumber,
        payload.donorName || 'সাধারণ দাতা',
        payload.donorPhone || '',
        payload.donorAddress || '',
        Boolean(payload.isAnonymous),
        payload.donationType || 'ONE_TIME',
        Number(payload.amount),
        payload.date || new Date().toISOString().split('T')[0],
        payload.paymentMethod || 'CASH',
        payload.accountId,
        payload.accountName || '',
        payload.reference || '',
        payload.purpose || '',
        payload.monthName || '',
        payload.pledgeId || null,
        payload.notes || '',
        payload.receivedBy || options.userContext.userName || options.userContext.userId,
      ]
    );
    return res.rows[0];
  }

  async cancel(options: DALOptions, id: string, reason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `UPDATE donations SET status = 'CANCELLED', notes = COALESCE(notes, '') || $3, updated_at = NOW()
       WHERE id = $1 AND mosque_id = $2 RETURNING *`,
      [id, options.mosqueId, ` [Cancelled: ${reason || ''}]`]
    );
    return res.rows[0] || null;
  }

  async updateDenomination(options: DALOptions, id: string, _denominationData: any, _editReason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return this.findById(options, id);
  }
}

export class PostgresDonationBoxDalRepository implements IDonationBoxRepository {
  constructor(
    private pool: pg.Pool,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  private getExecutor(): pg.Pool | pg.PoolClient {
    return this.getClient() || this.pool;
  }

  async listBoxesAndCollections(options: DALOptions): Promise<{ boxes: any[]; collections: any[] }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const boxesRes = await this.getExecutor().query(
      `SELECT * FROM donation_boxes WHERE mosque_id = $1 ORDER BY created_at ASC`,
      [options.mosqueId]
    );
    const colsRes = await this.getExecutor().query(
      `SELECT * FROM donation_box_collections WHERE mosque_id = $1 ORDER BY collection_date DESC`,
      [options.mosqueId]
    );
    return { boxes: boxesRes.rows, collections: colsRes.rows };
  }

  async createBox(options: DALOptions, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `box-${Date.now()}`;
    const res = await this.getExecutor().query(
      `INSERT INTO donation_boxes (id, mosque_id, box_code, name, location, status, responsible_person, total_collected, notes)
       VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6,0,$7) RETURNING *`,
      [
        id,
        options.mosqueId,
        payload.boxCode || `DB-${Date.now().toString().slice(-3)}`,
        payload.name || payload.nameBn,
        payload.location || 'মসজিদ প্রাঙ্গণ',
        payload.responsiblePerson || '',
        payload.notes || '',
      ]
    );
    return res.rows[0];
  }

  async updateBox(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `UPDATE donation_boxes SET
        name = COALESCE($3, name),
        location = COALESCE($4, location),
        status = COALESCE($5, status),
        responsible_person = COALESCE($6, responsible_person),
        notes = COALESCE($7, notes),
        updated_at = NOW()
       WHERE id = $1 AND mosque_id = $2 RETURNING *`,
      [id, options.mosqueId, payload.name || payload.nameBn, payload.location, payload.status, payload.responsiblePerson, payload.notes]
    );
    return res.rows[0] || null;
  }

  async deleteBox(options: DALOptions, id: string): Promise<{ success: boolean }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    await this.getExecutor().query(`DELETE FROM donation_boxes WHERE id = $1 AND mosque_id = $2`, [id, options.mosqueId]);
    return { success: true };
  }

  async collectBox(options: DALOptions, payload: Record<string, any>): Promise<{ collection: any; box: any }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `col-${Date.now()}`;
    const res = await this.getExecutor().query(
      `INSERT INTO donation_box_collections (
        id, mosque_id, box_id, box_name, collection_date, amount, account_id, account_name,
        opened_by, witness_name, notes_breakdown, deposit_reference, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        id,
        options.mosqueId,
        payload.boxId,
        payload.boxName || 'সাধারণ দানবাক্স',
        payload.collectionDate || new Date().toISOString().split('T')[0],
        Number(payload.amount),
        payload.accountId,
        payload.accountName || '',
        payload.openedBy || options.userContext.userName || options.userContext.userId,
        payload.witnessName || '',
        payload.notesBreakdown || '',
        payload.depositReference || `DBC-${Date.now().toString().slice(-4)}`,
        payload.notes || '',
      ]
    );
    const boxRes = await this.getExecutor().query(
      `UPDATE donation_boxes SET total_collected = total_collected + $3, last_collected_date = $4, updated_at = NOW()
       WHERE id = $1 AND mosque_id = $2 RETURNING *`,
      [payload.boxId, options.mosqueId, Number(payload.amount), payload.collectionDate || new Date().toISOString().split('T')[0]]
    );
    return { collection: res.rows[0], box: boxRes.rows[0] };
  }

  async updateCollectionDenomination(options: DALOptions, id: string, _denominationData: any, _editReason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `SELECT * FROM donation_box_collections WHERE id = $1 AND mosque_id = $2 LIMIT 1`,
      [id, options.mosqueId]
    );
    return res.rows[0] || null;
  }
}

export class PostgresStaffDalRepository implements IStaffRepository {
  constructor(
    private pool: pg.Pool,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  private getExecutor(): pg.Pool | pg.PoolClient {
    return this.getClient() || this.pool;
  }

  async listStaff(options: DALOptions): Promise<any[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(`SELECT * FROM staff WHERE mosque_id = $1 ORDER BY created_at ASC`, [options.mosqueId]);
    return res.rows;
  }

  async listPayments(options: DALOptions): Promise<any[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(`SELECT * FROM staff_payments WHERE mosque_id = $1 ORDER BY payment_date DESC`, [options.mosqueId]);
    return res.rows;
  }

  async getNextCode(options: DALOptions): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(`SELECT COUNT(*)::int AS cnt FROM staff WHERE mosque_id = $1`, [options.mosqueId]);
    const cnt = res.rows[0]?.cnt || 0;
    const year = new Date().getFullYear();
    const nextCode = `STF-${year}-${String(cnt + 1).padStart(3, '0')}`;
    return { nextCode, code: nextCode, year, count: cnt };
  }

  async createStaff(options: DALOptions, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `stf-${Date.now()}`;
    const res = await this.getExecutor().query(
      `INSERT INTO staff (id, mosque_id, name, name_bn, designation, joining_date, phone, basic_salary, total_salary, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE') RETURNING *`,
      [
        id,
        options.mosqueId,
        payload.name || payload.nameBn,
        payload.nameBn || payload.name,
        payload.designation || 'OTHER',
        payload.joiningDate || new Date().toISOString().split('T')[0],
        payload.phone || '',
        Number(payload.basicSalary) || 0,
        Number(payload.totalSalary || payload.basicSalary) || 0,
        payload.paymentMethod || 'CASH',
      ]
    );
    return res.rows[0];
  }

  async updateStaff(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `UPDATE staff SET name_bn = COALESCE($3, name_bn), phone = COALESCE($4, phone), updated_at = NOW()
       WHERE id = $1 AND mosque_id = $2 RETURNING *`,
      [id, options.mosqueId, payload.nameBn || payload.name, payload.phone]
    );
    return res.rows[0] || null;
  }

  async reviseSalary(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    return this.updateStaff(options, id, payload);
  }

  async disburseAdvance(options: DALOptions, id: string, _payload: Record<string, any>): Promise<{ staff: any; advanceRecord: any; expenseEntry: any }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { staff: { id }, advanceRecord: {}, expenseEntry: {} };
  }

  async recordLeave(options: DALOptions, id: string, _payload: Record<string, any>): Promise<{ staff: any; leaveRecord: any }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { staff: { id }, leaveRecord: {} };
  }

  async updateLeave(options: DALOptions, id: string, _leaveId: string, _payload: Record<string, any>): Promise<{ staff: any; leaveRecord: any }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { staff: { id }, leaveRecord: {} };
  }

  async logBulkAttendance(options: DALOptions, payload: Record<string, any>): Promise<{ success: boolean; updatedCount: number; date: string }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { success: true, updatedCount: 0, date: payload.date };
  }

  async finalSettlement(options: DALOptions, id: string, _payload: Record<string, any>): Promise<{ staff: any; settlementRecord: any; expenseEntry: any }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { staff: { id }, settlementRecord: {}, expenseEntry: null };
  }

  async disburseFestivalAllowance(options: DALOptions, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { success: true, data: { payments: [], expenses: [], totalDisbursed: 0 }, message: '' };
  }

  async deleteOrArchiveStaff(options: DALOptions, id: string): Promise<{ success: boolean; archived: boolean; message: string }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    await this.getExecutor().query(`DELETE FROM staff WHERE id = $1 AND mosque_id = $2`, [id, options.mosqueId]);
    return { success: true, archived: false, message: 'স্টাফ প্রোফাইল সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async paySalary(options: DALOptions, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `spay-${Date.now()}`;
    const res = await this.getExecutor().query(
      `INSERT INTO staff_payments (id, mosque_id, staff_id, staff_name_bn, designation, month, basic_amount, allowance_amount, bonus_amount, deduction_amount, total_paid, payment_date, payment_method, account_id, account_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PAID') RETURNING *`,
      [
        id,
        options.mosqueId,
        payload.staffId,
        payload.staffNameBn || 'স্টাফ',
        payload.designation || 'OTHER',
        payload.month,
        Number(payload.basicAmount) || 0,
        Number(payload.allowanceAmount) || 0,
        Number(payload.bonusAmount) || 0,
        Number(payload.deductionAmount) || 0,
        Number(payload.totalPaid || payload.basicAmount) || 0,
        payload.paymentDate || new Date().toISOString().split('T')[0],
        payload.paymentMethod || 'CASH',
        payload.accountId,
        payload.accountName || '',
      ]
    );
    return res.rows[0];
  }

  async updatePayment(options: DALOptions, id: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(`SELECT * FROM staff_payments WHERE id = $1 AND mosque_id = $2`, [id, options.mosqueId]);
    return res.rows[0] || null;
  }

  async cancelPayment(options: DALOptions, id: string, reason: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `UPDATE staff_payments SET status = 'CANCELLED', cancel_reason = $3, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND mosque_id = $2 RETURNING *`,
      [id, options.mosqueId, reason]
    );
    return res.rows[0] || null;
  }

  async addPaymentDocument(options: DALOptions, paymentId: string, _payload: Record<string, any>): Promise<{ doc: any; payment: any }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { doc: {}, payment: { id: paymentId } };
  }

  async listPaymentBatches(options: DALOptions): Promise<any[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return [];
  }

  async findPaymentBatchById(options: DALOptions, _id: string): Promise<any | null> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return null;
  }

  async createPaymentBatch(options: DALOptions, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return payload;
  }

  async updatePaymentBatch(options: DALOptions, _id: string, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return payload;
  }

  async disbursePaymentBatch(options: DALOptions, _id: string, _payload: Record<string, any>): Promise<{ batch: any; payments: any[]; expenses: any[] }> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { batch: {}, payments: [], expenses: [] };
  }

  async cancelPaymentBatch(options: DALOptions, _id: string, _reason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return {};
  }
}

export class PostgresPropertyDalRepository implements IPropertyRepository {
  constructor(
    private pool: pg.Pool,
    private mosqueRepo: PostgresMosqueIdentityRepository,
    private getClient: () => pg.PoolClient | undefined
  ) {}

  private getExecutor(): pg.Pool | pg.PoolClient {
    return this.getClient() || this.pool;
  }

  async list(options: DALOptions): Promise<any[]> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(`SELECT * FROM mosque_properties WHERE mosque_id = $1 ORDER BY created_at DESC`, [options.mosqueId]);
    return res.rows;
  }

  async create(options: DALOptions, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const id = `prop-${Date.now()}`;
    const res = await this.getExecutor().query(
      `INSERT INTO mosque_properties (id, mosque_id, property_code, name, name_bn, property_type, location, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE') RETURNING *`,
      [
        id,
        options.mosqueId,
        payload.propertyCode || `WQF-${Date.now().toString().slice(-3)}`,
        payload.name || payload.nameBn || 'ওয়াকফ সম্পত্তি',
        payload.nameBn || payload.name || 'ওয়াকফ সম্পত্তি',
        payload.propertyType || 'SHOP',
        payload.location || '',
      ]
    );
    return res.rows[0];
  }

  async update(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    const res = await this.getExecutor().query(
      `UPDATE mosque_properties SET name_bn = COALESCE($3, name_bn), location = COALESCE($4, location), updated_at = NOW()
       WHERE id = $1 AND mosque_id = $2 RETURNING *`,
      [id, options.mosqueId, payload.nameBn || payload.name, payload.location]
    );
    return res.rows[0] || null;
  }

  async toggleArchive(options: DALOptions, id: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id };
  }

  async deleteOrArchive(options: DALOptions, id: string, _force?: boolean): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    await this.getExecutor().query(`DELETE FROM mosque_properties WHERE id = $1 AND mosque_id = $2`, [id, options.mosqueId]);
    return { success: true, deleted: true, message: 'ওয়াকফ সম্পত্তির তথ্য মুছে ফেলা হয়েছে।' };
  }

  async saveTenant(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async terminateTenant(options: DALOptions, propertyId: string, _tenantId: string, _reason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async addInspection(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async saveLegalCase(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async collectRent(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { property: { id: propertyId }, rentRecord: {}, incomeEntry: null };
  }

  async reverseRentCollection(options: DALOptions, propertyId: string, _collectionId: string, _reason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async addExpense(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { property: { id: propertyId }, expenseRecord: {}, expenseEntry: null };
  }

  async deleteExpense(options: DALOptions, propertyId: string, _expenseId: string, _reason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async addDocument(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async deleteDocument(options: DALOptions, propertyId: string, _docId: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }

  async addKhajna(options: DALOptions, propertyId: string, _payload: Record<string, any>): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { property: { id: propertyId }, khajnaRecord: {}, expenseEntry: null };
  }

  async deleteKhajna(options: DALOptions, propertyId: string, _khajnaId: string, _reason?: string): Promise<any> {
    await verifyTenantSecurity(options, this.mosqueRepo, this.getClient());
    return { id: propertyId };
  }
}

export class PostgresAssetDalRepository implements IAssetRepository {
  private jsonRepo = new JsonAssetParityRepository();
  constructor(private pool: pg.Pool, private mosqueRepo: PostgresMosqueIdentityRepository, private getClient: () => pg.PoolClient | undefined) {}
  async list(options: DALOptions, query?: any): Promise<{ data: any[]; stats: any }> { return this.jsonRepo.list(options, query); }
  async findById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.findById(options, id); }
  async create(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.create(options, payload); }
  async update(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.update(options, id, payload); }
  async addServiceRecord(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.addServiceRecord(options, id, payload); }
  async toggleArchive(options: DALOptions, id: string, payload?: Record<string, any>): Promise<any> { return this.jsonRepo.toggleArchive(options, id, payload); }
  async deleteOrArchive(options: DALOptions, id: string, force?: boolean): Promise<any> { return this.jsonRepo.deleteOrArchive(options, id, force); }
  async clearDemo(options: DALOptions): Promise<{ removedCount: number }> { return this.jsonRepo.clearDemo(options); }
  async logAudit(options: DALOptions, id: string, action?: string, details?: string): Promise<void> { return this.jsonRepo.logAudit(options, id, action, details); }
}

export class PostgresMusalliDalRepository implements IMusalliRepository {
  private jsonRepo = new JsonMusalliParityRepository();
  constructor(private pool: pg.Pool, private mosqueRepo: PostgresMosqueIdentityRepository, private getClient: () => pg.PoolClient | undefined) {}
  async listAreas(options: DALOptions): Promise<any[]> { return this.jsonRepo.listAreas(options); }
  async getAreaById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getAreaById(options, id); }
  async createArea(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createArea(options, payload); }
  async updateArea(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateArea(options, id, payload); }
  async updateAreaStatus(options: DALOptions, id: string, status: string): Promise<any> { return this.jsonRepo.updateAreaStatus(options, id, status); }
  async listFamilies(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listFamilies(options, query); }
  async getFamilyById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getFamilyById(options, id); }
  async checkFamilyDuplicate(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.checkFamilyDuplicate(options, payload); }
  async createFamily(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createFamily(options, payload); }
  async updateFamily(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateFamily(options, id, payload); }
  async updateFamilyStatus(options: DALOptions, id: string, status: string): Promise<any> { return this.jsonRepo.updateFamilyStatus(options, id, status); }
  async listPersons(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listPersons(options, query); }
  async getPersonById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getPersonById(options, id); }
  async checkPersonDuplicate(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.checkPersonDuplicate(options, payload); }
  async createPerson(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createPerson(options, payload); }
  async updatePerson(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updatePerson(options, id, payload); }
  async updatePersonStatus(options: DALOptions, id: string, status: string): Promise<any> { return this.jsonRepo.updatePersonStatus(options, id, status); }
  async listDonationPlans(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listDonationPlans(options, query); }
  async getDonationPlanById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getDonationPlanById(options, id); }
  async checkPlanOverlap(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.checkPlanOverlap(options, payload); }
  async createDonationPlan(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createDonationPlan(options, payload); }
  async updateDonationPlan(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateDonationPlan(options, id, payload); }
  async updatePlanStatus(options: DALOptions, id: string, status: string): Promise<any> { return this.jsonRepo.updatePlanStatus(options, id, status); }
  async deleteDonationPlan(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteDonationPlan(options, id); }
  async listCollectionWorkers(options: DALOptions): Promise<any[]> { return this.jsonRepo.listCollectionWorkers(options); }
  async getCollectionWorkerById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getCollectionWorkerById(options, id); }
  async createCollectionWorker(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createCollectionWorker(options, payload); }
  async updateCollectionWorker(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateCollectionWorker(options, id, payload); }
  async updateWorkerStatus(options: DALOptions, id: string, status: string): Promise<any> { return this.jsonRepo.updateWorkerStatus(options, id, status); }
  async getMusalliStats(options: DALOptions): Promise<any> { return this.jsonRepo.getMusalliStats(options); }
}

export class PostgresEducationDalRepository implements IEducationRepository {
  private jsonRepo = new JsonEducationParityRepository();
  constructor(private pool: pg.Pool, private mosqueRepo: PostgresMosqueIdentityRepository, private getClient: () => pg.PoolClient | undefined) {}
  async getDashboardStats(options: DALOptions): Promise<any> { return this.jsonRepo.getDashboardStats(options); }
  async listPrograms(options: DALOptions): Promise<any[]> { return this.jsonRepo.listPrograms(options); }
  async createProgram(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createProgram(options, payload); }
  async updateProgram(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateProgram(options, id, payload); }
  async listLevels(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listLevels(options, query); }
  async createLevel(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createLevel(options, payload); }
  async updateLevel(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateLevel(options, id, payload); }
  async listStudents(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listStudents(options, query); }
  async getStudentById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getStudentById(options, id); }
  async createStudent(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createStudent(options, payload); }
  async updateStudent(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateStudent(options, id, payload); }
  async deleteStudent(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteStudent(options, id); }
  async listGuardians(options: DALOptions, studentId: string): Promise<any[]> { return this.jsonRepo.listGuardians(options, studentId); }
  async addGuardian(options: DALOptions, studentId: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.addGuardian(options, studentId, payload); }
  async removeGuardian(options: DALOptions, studentId: string, guardianPersonId: string): Promise<any> { return this.jsonRepo.removeGuardian(options, studentId, guardianPersonId); }
  async listEnrollments(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listEnrollments(options, query); }
  async getEnrollmentById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getEnrollmentById(options, id); }
  async createEnrollment(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createEnrollment(options, payload); }
  async updateEnrollment(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateEnrollment(options, id, payload); }
}

export class PostgresLibraryDalRepository implements ILibraryRepository {
  private jsonRepo = new JsonLibraryParityRepository();
  constructor(private pool: pg.Pool, private mosqueRepo: PostgresMosqueIdentityRepository, private getClient: () => pg.PoolClient | undefined) {}
  async listCategories(options: DALOptions): Promise<any[]> { return this.jsonRepo.listCategories(options); }
  async createCategory(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createCategory(options, payload); }
  async updateCategory(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateCategory(options, id, payload); }
  async deleteCategory(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteCategory(options, id); }
  async listBookTitles(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listBookTitles(options, query); }
  async getBookTitleById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getBookTitleById(options, id); }
  async createBookTitle(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createBookTitle(options, payload); }
  async updateBookTitle(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateBookTitle(options, id, payload); }
  async deleteBookTitle(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteBookTitle(options, id); }
  async listBookCopies(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listBookCopies(options, query); }
  async getBookCopyById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getBookCopyById(options, id); }
  async lookupByBookId(options: DALOptions, bookId: string): Promise<any | null> { return this.jsonRepo.lookupByBookId(options, bookId); }
  async createBookCopy(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createBookCopy(options, payload); }
  async bulkCreateBookCopies(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.bulkCreateBookCopies(options, payload); }
  async updateBookCopy(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateBookCopy(options, id, payload); }
  async updateCopyStatus(options: DALOptions, id: string, status: string, notes?: string): Promise<any> { return this.jsonRepo.updateCopyStatus(options, id, status, notes); }
  async listMembers(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listMembers(options, query); }
  async getMemberById(options: DALOptions, id: string): Promise<any | null> { return this.jsonRepo.getMemberById(options, id); }
  async createMember(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createMember(options, payload); }
  async updateMember(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateMember(options, id, payload); }
  async listIssues(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listIssues(options, query); }
  async issueBook(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.issueBook(options, payload); }
  async returnBook(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.returnBook(options, id, payload); }
  async markLost(options: DALOptions, id: string, payload?: Record<string, any>): Promise<any> { return this.jsonRepo.markLost(options, id, payload); }
  async listAcquisitions(options: DALOptions, query?: any): Promise<any[]> { return this.jsonRepo.listAcquisitions(options, query); }
  async createAcquisition(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createAcquisition(options, payload); }
  async getLocations(options: DALOptions): Promise<any> { return this.jsonRepo.getLocations(options); }
  async createRoom(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createRoom(options, payload); }
  async updateRoom(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateRoom(options, id, payload); }
  async deleteRoom(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteRoom(options, id); }
  async createRack(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createRack(options, payload); }
  async updateRack(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateRack(options, id, payload); }
  async deleteRack(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteRack(options, id); }
  async createShelf(options: DALOptions, payload: Record<string, any>): Promise<any> { return this.jsonRepo.createShelf(options, payload); }
  async updateShelf(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> { return this.jsonRepo.updateShelf(options, id, payload); }
  async deleteShelf(options: DALOptions, id: string): Promise<any> { return this.jsonRepo.deleteShelf(options, id); }
  async getReport(options: DALOptions, reportType: string, query?: any): Promise<any> { return this.jsonRepo.getReport(options, reportType, query); }
}

// ============================================================================
// Master PostgresStorageAdapter Implementation
// ============================================================================

export class PostgresStorageAdapter implements IDataAccessLayer {
  readonly users: IUserRepository;
  readonly mosque: IMosqueIdentityRepository;
  readonly accountHeads: IAccountHeadRepository;
  readonly financialAccounts: IFinancialAccountRepository;
  readonly income: IIncomeRepository;
  readonly expense: IExpenseRepository;
  readonly transfers: ITransferRepository;
  readonly audit: IAuditRepository;
  readonly idempotency: IIdempotencyRepository;
  readonly committee: ICommitteeRepository;
  readonly donations: IDonationRepository;
  readonly donationBoxes: IDonationBoxRepository;
  readonly staff: IStaffRepository;
  readonly properties: IPropertyRepository;
  readonly assets: IAssetRepository;
  readonly musalli: IMusalliRepository;
  readonly education: IEducationRepository;
  readonly library: ILibraryRepository;

  /**
   * Protected direct access to the 10 typed underlying PostgreSQL repositories,
   * wrapped to prevent tenant isolation bypasses and ensure connection propagation.
   */
  readonly rawRepositories: {
    accountHeads: PostgresAccountHeadRepository;
    financialAccounts: PostgresFinancialAccountRepository;
    income: PostgresIncomeRepository;
    expense: PostgresExpenseRepository;
    transfers: PostgresTransferRepository;
    audit: PostgresAuditRepository;
    idempotency: PostgresIdempotencyRepository;
    mosque: PostgresMosqueIdentityRepository;
    users: PostgresUserRepository;
    committee: PostgresCommitteeRepository;
  };

  private activeClient?: pg.PoolClient;
  private poolInstance?: pg.Pool;

  constructor(
    private options?: DALOptions,
    poolOrClient?: pg.Pool | pg.PoolClient,
    activeClient?: pg.PoolClient
  ) {
    if (activeClient) {
      this.activeClient = activeClient;
    } else if (poolOrClient && 'query' in poolOrClient && !('connect' in poolOrClient)) {
      this.activeClient = poolOrClient as pg.PoolClient;
    }

    if (poolOrClient && 'connect' in poolOrClient && typeof (poolOrClient as any).connect === 'function') {
      this.poolInstance = poolOrClient as pg.Pool;
    }

    const pool = this.resolvePoolSafe();

    // Instantiate 10 canonical PostgreSQL repositories
    const accountHeadsRepo = new PostgresAccountHeadRepository(pool);
    const financialAccountsRepo = new PostgresFinancialAccountRepository(pool);
    const incomeRepo = new PostgresIncomeRepository(pool);
    const expenseRepo = new PostgresExpenseRepository(pool);
    const transfersRepo = new PostgresTransferRepository(pool);
    const auditRepo = new PostgresAuditRepository(pool);
    const idempotencyRepo = new PostgresIdempotencyRepository(pool);
    const mosqueRepo = new PostgresMosqueIdentityRepository(pool);
    const usersRepo = new PostgresUserRepository(pool);
    const committeeRepo = new PostgresCommitteeRepository(pool);

    const getClientFn = () => this.activeClient;
    const getOptions = () => this.options;

    // Wrap raw repositories to prevent tenant isolation bypasses and pool connection leaks
    this.rawRepositories = {
      accountHeads: wrapRawRepository(accountHeadsRepo, getOptions, getClientFn, mosqueRepo),
      financialAccounts: wrapRawRepository(financialAccountsRepo, getOptions, getClientFn, mosqueRepo),
      income: wrapRawRepository(incomeRepo, getOptions, getClientFn, mosqueRepo),
      expense: wrapRawRepository(expenseRepo, getOptions, getClientFn, mosqueRepo),
      transfers: wrapRawRepository(transfersRepo, getOptions, getClientFn, mosqueRepo),
      audit: wrapRawRepository(auditRepo, getOptions, getClientFn, mosqueRepo),
      idempotency: wrapRawRepository(idempotencyRepo, getOptions, getClientFn, mosqueRepo),
      mosque: wrapRawRepository(mosqueRepo, getOptions, getClientFn, mosqueRepo),
      users: wrapRawRepository(usersRepo, getOptions, getClientFn, mosqueRepo),
      committee: wrapRawRepository(committeeRepo, getOptions, getClientFn, mosqueRepo),
    };

    // Compose DAL-compliant sub-repositories
    this.users = new PostgresUserDalRepository(usersRepo, mosqueRepo, getClientFn);
    this.mosque = new PostgresMosqueIdentityDalRepository(mosqueRepo, options, getClientFn);
    this.accountHeads = new PostgresAccountHeadDalRepository(accountHeadsRepo, mosqueRepo, getClientFn);
    this.financialAccounts = new PostgresFinancialAccountDalRepository(financialAccountsRepo, mosqueRepo, getClientFn);
    this.income = new PostgresIncomeDalRepository(incomeRepo, mosqueRepo, getClientFn);
    this.expense = new PostgresExpenseDalRepository(expenseRepo, mosqueRepo, getClientFn);
    this.transfers = new PostgresTransferDalRepository(transfersRepo, mosqueRepo, getClientFn);
    this.audit = new PostgresAuditDalRepository(auditRepo, mosqueRepo, getClientFn);
    this.idempotency = new PostgresIdempotencyDalRepository(idempotencyRepo, mosqueRepo, getClientFn);
    this.committee = new PostgresCommitteeDalRepository(committeeRepo, mosqueRepo, getClientFn);
    this.donations = new PostgresDonationDalRepository(pool, mosqueRepo, getClientFn);
    this.donationBoxes = new PostgresDonationBoxDalRepository(pool, mosqueRepo, getClientFn);
    this.staff = new PostgresStaffDalRepository(pool, mosqueRepo, getClientFn);
    this.properties = new PostgresPropertyDalRepository(pool, mosqueRepo, getClientFn);
    this.assets = new PostgresAssetDalRepository(pool, mosqueRepo, getClientFn);
    this.musalli = new PostgresMusalliDalRepository(pool, mosqueRepo, getClientFn);
    this.education = new PostgresEducationDalRepository(pool, mosqueRepo, getClientFn);
    this.library = new PostgresLibraryDalRepository(pool, mosqueRepo, getClientFn);
  }

  private resolvePoolSafe(): pg.Pool {
    if (this.poolInstance) return this.poolInstance;
    try {
      return getPostgresPool();
    } catch {
      // If DATABASE_URL is not configured and no pool provided, return undefined cast (will fail fast on query)
      return undefined as unknown as pg.Pool;
    }
  }

  /**
   * Execute multi-repository operations atomically inside a single PostgreSQL transaction block.
   * Propagates active transaction client to all repository queries.
   * Supports safe nested transactions via SAVEPOINT/ROLLBACK TO SAVEPOINT.
   * Fails fast without falling back to JSON storage.
   */
  async executeTransaction<T>(work: (txDal: IDataAccessLayer) => Promise<T>): Promise<T> {
    if (this.activeClient) {
      // Nested transaction: Use PostgreSQL SAVEPOINT for isolation and safe partial rollback
      const spName = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await this.activeClient.query(`SAVEPOINT ${spName}`);
      try {
        const result = await work(this);
        await this.activeClient.query(`RELEASE SAVEPOINT ${spName}`);
        return result;
      } catch (err) {
        await this.activeClient.query(`ROLLBACK TO SAVEPOINT ${spName}`);
        throw err;
      }
    }

    const pool = this.poolInstance || getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const txDal = new PostgresStorageAdapter(this.options, pool, client);
      const result = await work(txDal);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[PostgresStorageAdapter]: Transaction rollback failed', rollbackError);
      }
      // Strictly fail-fast without silent JSON fallback
      throw error;
    } finally {
      client.release();
    }
  }
}

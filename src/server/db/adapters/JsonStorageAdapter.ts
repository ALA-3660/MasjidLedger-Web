/**
 * MASJIDLEDGER PRO v2.6 — JSON STORAGE ADAPTER (PHASE 1A & PHASE 1B.7 PARITY)
 * Task ID: ML-V26-DAL-PHASE1B7
 *
 * Implements:
 * - Phase 1A Read-Only Mosque Identity Vertical Slice
 * - Phase 1B.7 JSON Adapter Parity for Income Reversal, Expense Reversal, Account Transfer, and Idempotency
 *
 * Delegates all write mutations to the authoritative JSON transaction engine (db.runTransaction)
 * and preserves existing accounting rules, audit handling, idempotency behavior, and tenant isolation.
 */

import crypto from 'crypto';
import {
  IReadOnlyDataAccessLayer,
  IScopedMutationDataAccessLayer,
  IMosqueIdentityReadOnlyRepository,
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
  IIdempotencyRepository,
  IdempotencyRecord,
  SaveIdempotencyInput,
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
  Mosque,
  User,
  AccountHead,
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  AccountTransfer,
} from '../../../types';
import { db } from '../../db.ts';

/**
 * Domain error for tenant access and boundary violations.
 */
export class TenantSecurityError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'TenantSecurityError';
  }
}

/**
 * Domain error for financial validation and state violations in JSON parity operations.
 */
export class DalDomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'DalDomainError';
  }
}

export interface JsonDataSourceContract {
  mosques: Mosque[];
  users?: User[];
  accountHeads?: AccountHead[];
  accounts?: FinancialAccount[];
  incomeEntries?: IncomeEntry[];
  expenseEntries?: ExpenseEntry[];
  transfers?: AccountTransfer[];
  donations?: any[];
  donationBoxes?: any[];
  donationBoxCollections?: any[];
  persons?: any[];
  donationPlans?: any[];
  donationCollections?: any[];
  collectionWorkers?: any[];
  families?: any[];
  areas?: any[];
  assets?: any[];
  recurringCollections?: any[];
  educationStudents?: any[];
  educationPrograms?: any[];
  educationLevels?: any[];
  educationEnrollments?: any[];
  libraryCategories?: any[];
  libraryBookTitles?: any[];
  libraryBookCopies?: any[];
  libraryMembers?: any[];
  libraryIssues?: any[];
  libraryAcquisitions?: any[];
  libraryRooms?: any[];
  libraryRacks?: any[];
  libraryShelves?: any[];
  staffList?: any[];
  staffPayments?: any[];
  paymentBatches?: any[];
  committeeTerms?: any[];
  properties?: any[];
  centralDocuments?: any[];
  idempotencyMap?: Record<string, { result: any; createdAt: number }>;
  runTransaction?: <T>(mutator: (tx: any) => Promise<T> | T) => Promise<T>;
  save?: () => void;
  logAudit?: (mosqueId: string, userId: string, userName: string, userRole: any, action: any, moduleName: string, details: string, meta?: any) => void;
  checkIdempotency?: (key?: string, context?: any) => any;
  saveIdempotency?: (key: string | undefined, result: any, context?: any) => void;
  buildScopedKey?: (key?: string, context?: any) => string | undefined;
  getDashboardStats?: (mosqueId: string) => any;
}

/**
 * Enforces strict server-side tenant security rules across all JSON DAL operations.
 * Non-SUPER_ADMIN callers can NEVER access a tenant different from their token claim.
 */
function verifyJsonTenantAccess(
  dataSource: JsonDataSourceContract,
  options?: DALOptions,
  targetMosqueId?: string
): string {
  const effectiveMosqueId = targetMosqueId || options?.mosqueId;
  if (!options || !options.mosqueId || !effectiveMosqueId) {
    throw new TenantSecurityError('TENANT_REQUIRED', 'Tenant ID (mosqueId) is required for DAL operations.');
  }

  const userRole = options.userContext?.userRole;
  const userMosqueId = options.userContext?.userMosqueId;

  if (userRole !== 'SUPER_ADMIN' && (effectiveMosqueId !== userMosqueId || options.mosqueId !== userMosqueId)) {
    throw new TenantSecurityError(
      'TENANT_FORBIDDEN',
      `Access denied. User belongs to mosque [${userMosqueId}] but requested mosque [${effectiveMosqueId}].`
    );
  }

  if (userRole === 'SUPER_ADMIN') {
    const exists = dataSource.mosques.some((m) => m.id === effectiveMosqueId);
    if (!exists) {
      throw new TenantSecurityError(
        'TARGET_MOSQUE_NOT_FOUND',
        `SUPER_ADMIN target mosque [${effectiveMosqueId}] does not exist.`
      );
    }
  }

  return effectiveMosqueId;
}

function resolveActorName(dataSource: JsonDataSourceContract, options: DALOptions, explicitName?: string): string {
  if (explicitName) return explicitName;
  if (options.userContext?.userName) return options.userContext.userName;
  const foundUser = dataSource.users?.find((u) => u.id === options.userContext?.userId);
  return foundUser?.name || options.userContext?.userId || 'System User';
}

function resolveActorMeta(
  dataSource: JsonDataSourceContract,
  options?: DALOptions
): { userId: string; userName: string; userRole: string } {
  const userId = options?.userContext?.userId || 'system';
  const foundUser = dataSource.users?.find((u) => u.id === userId);
  const userName = options?.userContext?.userName || foundUser?.name || userId || 'System User';
  const userRole = options?.userContext?.userRole || (foundUser as any)?.role || 'MOSQUE_ADMIN';
  return { userId, userName, userRole };
}

function resolveIdempotencyContext(
  key: string | undefined,
  mosqueId: string,
  route: string
): { key: string; context?: { mosqueId: string; method: string; route: string } } | null {
  if (!key) return null;
  if (key.startsWith(`${mosqueId}::`)) {
    return { key, context: undefined };
  }
  return {
    key,
    context: {
      mosqueId,
      method: 'POST',
      route,
    },
  };
}

async function runWithDomainErrorUnwrap<T>(
  dataSource: JsonDataSourceContract,
  work: (tx: any) => Promise<T> | T
): Promise<T> {
  if (typeof dataSource.runTransaction !== 'function') {
    throw new Error('JSON dataSource does not support runTransaction.');
  }
  try {
    return await dataSource.runTransaction((tx: any) => {
      const proxyTx = new Proxy(tx || {}, {
        get(target, prop, receiver) {
          if (prop in target) {
            const val = Reflect.get(target, prop, receiver);
            return typeof val === 'function' ? val.bind(target) : val;
          }
          const dsVal = (dataSource as any)[prop];
          return typeof dsVal === 'function' ? dsVal.bind(dataSource) : dsVal;
        },
        set(_target, prop, value) {
          (dataSource as any)[prop] = value;
          return true;
        },
      });
      return work(proxyTx);
    });
  } catch (err: any) {
    if (err?.cause instanceof DalDomainError || err?.cause instanceof TenantSecurityError) {
      throw err.cause;
    }
    throw err;
  }
}

/**
 * Read-Only Mosque Identity Repository implementation backed by in-memory JSON dataset.
 */
export class JsonMosqueIdentityReadOnlyRepository implements IMosqueIdentityReadOnlyRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  /**
   * Retrieves mosque profile by ID asynchronously with tenant isolation checks.
   * Guaranteed read-only: returns a defensive clone; performs zero disk writes.
   */
  async findById(mosqueId: string, options?: DALOptions): Promise<Mosque | null> {
    const activeOptions = options || this.defaultOptions;
    const targetId = mosqueId || activeOptions?.mosqueId;

    if (!targetId) {
      throw new TenantSecurityError('TENANT_REQUIRED', 'Mosque ID is required for findById operation.');
    }

    if (activeOptions) {
      verifyJsonTenantAccess(this.dataSource, activeOptions, targetId);
    }

    const record = this.dataSource.mosques.find((m) => m.id === targetId);
    // Return defensive shallow copy to guarantee caller mutations cannot alter in-memory state
    return record ? { ...record } : null;
  }

  /**
   * Alias matching options-first signature for compatibility with DALOptions pattern.
   */
  async getById(options: DALOptions, mosqueId?: string): Promise<Mosque | null> {
    const targetId = mosqueId || options.mosqueId;
    return this.findById(targetId, options);
  }
}

/**
 * Read-Only Account Head Repository implementation backed by in-memory JSON dataset (Phase 1B.9).
 */
export class JsonAccountHeadReadOnlyRepository implements Pick<IAccountHeadRepository, 'list' | 'findById'> {
  constructor(
    protected dataSource: JsonDataSourceContract = db,
    protected defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<AccountHead[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const heads = (this.dataSource.accountHeads || []).filter((h) => h.mosqueId === mosqueId);
    return heads.map((h) => ({ ...h }));
  }

  async findById(options: DALOptions, headId: string): Promise<AccountHead | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = (this.dataSource.accountHeads || []).find(
      (h) => h.id === headId && h.mosqueId === mosqueId
    );
    return item ? { ...item } : null;
  }
}

/**
 * JSON Account Head Parity Repository (Phase 1B.11):
 * Extends read-only repository with create, update, and deleteOrArchive delegating to db.runTransaction.
 */
export class JsonAccountHeadParityRepository
  extends JsonAccountHeadReadOnlyRepository
  implements IAccountHeadRepository
{
  private generateCanonicalHeadCode(
    mosqueId: string,
    type: 'INCOME' | 'EXPENSE',
    parentId?: string | null
  ): string {
    if (typeof (this.dataSource as any).generateAccountHeadCode === 'function') {
      return (this.dataSource as any).generateAccountHeadCode(mosqueId, type, parentId);
    }

    const prefix = type === 'INCOME' ? 'INC' : 'EXP';
    const heads = this.dataSource.accountHeads || [];
    const mosqueHeads = heads.filter((h) => h.mosqueId === mosqueId && h.type === type);

    if (!parentId) {
      const mainHeads = mosqueHeads.filter((h) => !h.parentId);
      let maxHundreds = 0;
      mainHeads.forEach((h) => {
        const match = h.code?.match(/^(?:INC|EXP)-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 100 && num % 100 === 0 && num > maxHundreds) {
            maxHundreds = num;
          } else if (num > maxHundreds) {
            maxHundreds = Math.floor(num / 100) * 100;
          }
        }
      });
      const nextNum = maxHundreds > 0 ? maxHundreds + 100 : 100;
      let candidate = `${prefix}-${nextNum}`;
      let counter = nextNum;
      while (heads.some((h) => h.mosqueId === mosqueId && h.code === candidate)) {
        counter += 100;
        candidate = `${prefix}-${counter}`;
      }
      return candidate;
    } else {
      const parent = heads.find((h) => h.id === parentId && h.mosqueId === mosqueId);
      let baseNumber = 100;
      if (parent && parent.code) {
        const parentMatch = parent.code.match(/^(?:INC|EXP)-(\d+)$/i);
        if (parentMatch) {
          baseNumber = parseInt(parentMatch[1], 10);
        }
      }
      const existingSubHeads = mosqueHeads.filter((h) => h.parentId === parentId);
      let maxSubNum = baseNumber;
      existingSubHeads.forEach((h) => {
        const match = h.code?.match(/^(?:INC|EXP)-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSubNum) maxSubNum = num;
        }
      });
      let nextNum = maxSubNum + 1;
      let candidate = `${prefix}-${nextNum}`;
      while (heads.some((h) => h.mosqueId === mosqueId && h.code === candidate)) {
        nextNum++;
        candidate = `${prefix}-${nextNum}`;
      }
      return candidate;
    }
  }

  async create(options: DALOptions, headInput: CreateAccountHeadInput): Promise<AccountHead> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    if (!headInput.nameBn || typeof headInput.nameBn !== 'string' || !headInput.nameBn.trim()) {
      throw new DalDomainError('VALIDATION_ERROR', 'হিসাব খাতের বাংলা নাম প্রদান আবশ্যক।');
    }

    if (headInput.type !== 'INCOME' && headInput.type !== 'EXPENSE') {
      throw new DalDomainError(
        'VALIDATION_ERROR',
        'খাতের ধরন অবশ্যই "INCOME" অথবা "EXPENSE" হতে হবে।'
      );
    }

    const headsList = this.dataSource.accountHeads || [];
    let parentHead: AccountHead | undefined;
    if (headInput.parentId) {
      parentHead = headsList.find(
        (h) => h.id === headInput.parentId && h.mosqueId === mosqueId
      );
      if (!parentHead) {
        throw new DalDomainError('INVALID_PARENT', 'নির্বাচিত প্রধান হিসাব খাতটি পাওয়া যায়নি।');
      }
      if (parentHead.type !== headInput.type) {
        throw new DalDomainError(
          'TYPE_MISMATCH',
          'উপ-খাতের ধরন প্রধান খাতের ধরনের সাথে মিল থাকতে হবে।'
        );
      }
      if (parentHead.parentId) {
        throw new DalDomainError(
          'MAX_DEPTH_EXCEEDED',
          'উপ-খাতের অধীনে আর কোনো সাব-উপখাত তৈরি করা যাবে না (সর্বোচ্চ স্তর ২)।'
        );
      }
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const heads = this.dataSource.accountHeads || [];
      let parentInside: AccountHead | undefined;
      if (headInput.parentId) {
        parentInside = heads.find(
          (h) => h.id === headInput.parentId && h.mosqueId === mosqueId
        );
        if (!parentInside) {
          throw new DalDomainError('INVALID_PARENT', 'নির্বাচিত প্রধান হিসাব খাতটি পাওয়া যায়নি।');
        }
        if (parentInside.type !== headInput.type) {
          throw new DalDomainError(
            'TYPE_MISMATCH',
            'উপ-খাতের ধরন প্রধান খাতের ধরনের সাথে মিল থাকতে হবে।'
          );
        }
        if (parentInside.parentId) {
          throw new DalDomainError(
            'MAX_DEPTH_EXCEEDED',
            'উপ-খাতের অধীনে আর কোনো সাব-উপখাত তৈরি করা যাবে না (সর্বোচ্চ স্তর ২)।'
          );
        }
      }

      const code =
        headInput.code && headInput.code.trim()
          ? headInput.code.trim()
          : this.generateCanonicalHeadCode(mosqueId, headInput.type, headInput.parentId);

      const nowIso = new Date().toISOString();
      const actorName = resolveActorName(this.dataSource, activeOptions!, headInput.createdBy);

      const newHead: AccountHead = {
        id: `head-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        mosqueId,
        code,
        nameBn: headInput.nameBn.trim(),
        nameEn:
          headInput.nameEn && typeof headInput.nameEn === 'string' && headInput.nameEn.trim()
            ? headInput.nameEn.trim()
            : headInput.nameBn.trim(),
        type: headInput.type,
        parentId: headInput.parentId || null,
        description:
          headInput.description && typeof headInput.description === 'string'
            ? headInput.description.trim()
            : '',
        isSystem: headInput.isSystem ?? false,
        status: headInput.status || 'ACTIVE',
        isActive: headInput.isActive ?? true,
        createdAt: headInput.createdAt || nowIso,
        updatedAt: headInput.updatedAt || nowIso,
        createdBy: actorName,
      };

      heads.push(newHead);

      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CREATE',
        'ACCOUNT_HEAD',
        `নতুন ${headInput.type === 'INCOME' ? 'আয়ের' : 'ব্যয়ের'} হিসাব খাত যুক্ত করা হয়েছে: ${newHead.nameBn} (${newHead.code})${parentInside ? ` [প্রধান খাত: ${parentInside.nameBn}]` : ' [প্রধান খাত]'}`,
        newHead.id,
        activeOptions!.clientIp,
        { newState: JSON.stringify(newHead), status: 'SUCCESS' }
      );

      return { ...newHead };
    });
  }

  async update(
    options: DALOptions,
    headId: string,
    updates: UpdateAccountHeadInput
  ): Promise<AccountHead> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const initialCheck = (this.dataSource.accountHeads || []).find(
      (h) => h.id === headId && h.mosqueId === mosqueId
    );
    if (!initialCheck) {
      throw new DalDomainError('NOT_FOUND', 'হিসাব খাত পাওয়া যায়নি।');
    }

    if (updates.nameBn !== undefined) {
      if (typeof updates.nameBn !== 'string' || !updates.nameBn.trim()) {
        throw new DalDomainError('VALIDATION_ERROR', 'হিসাব খাতের বাংলা নাম খালি রাখা যাবে না।');
      }
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const heads = this.dataSource.accountHeads || [];
      const targetHead = heads.find((h) => h.id === headId && h.mosqueId === mosqueId);
      if (!targetHead) {
        throw new DalDomainError('NOT_FOUND', 'হিসাব খাত পাওয়া যায়নি।');
      }

      const previousState = { ...targetHead };

      if (updates.nameBn !== undefined) {
        if (typeof updates.nameBn !== 'string' || !updates.nameBn.trim()) {
          throw new DalDomainError('VALIDATION_ERROR', 'হিসাব খাতের বাংলা নাম খালি রাখা যাবে না।');
        }
        targetHead.nameBn = updates.nameBn.trim();
      }

      if (updates.nameEn !== undefined) {
        targetHead.nameEn =
          typeof updates.nameEn === 'string' ? updates.nameEn.trim() : targetHead.nameBn;
      }

      if (updates.description !== undefined) {
        targetHead.description =
          typeof updates.description === 'string' ? updates.description.trim() : '';
      }

      if (updates.parentId !== undefined && updates.parentId !== targetHead.parentId) {
        if (updates.parentId) {
          const hasSubHeads = heads.some(
            (h) => h.parentId === targetHead.id && h.mosqueId === mosqueId
          );
          if (hasSubHeads) {
            throw new DalDomainError(
              'CANNOT_NEST_PARENT',
              'এই খাতের অধীনে ইতিমধ্যে উপ-খাত রয়েছে। এটিকে অন্য খাতের উপ-খাতে রূপান্তর করা যাবে না।'
            );
          }

          const parentCandidate = heads.find(
            (h) => h.id === updates.parentId && h.mosqueId === mosqueId
          );
          if (!parentCandidate) {
            throw new DalDomainError('INVALID_PARENT', 'নির্বাচিত প্রধান হিসাব খাত পাওয়া যায়নি।');
          }
          if (parentCandidate.type !== targetHead.type) {
            throw new DalDomainError('TYPE_MISMATCH', 'প্রধান খাতের ধরনের সাথে মিল থাকতে হবে।');
          }
          if (parentCandidate.parentId) {
            throw new DalDomainError(
              'MAX_DEPTH_EXCEEDED',
              'উপ-খাতের অধীনে আর কোনো সাব-উপখাত তৈরি করা যাবে না।'
            );
          }
          targetHead.parentId = updates.parentId;
        } else {
          targetHead.parentId = null;
        }
      }

      if (updates.status !== undefined || updates.isActive !== undefined) {
        let resolvedStatus = updates.status || targetHead.status || 'ACTIVE';
        if (updates.isActive === false && updates.status === undefined) {
          resolvedStatus = 'INACTIVE';
        } else if (updates.isActive === true && updates.status === undefined) {
          resolvedStatus = 'ACTIVE';
        }

        if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(resolvedStatus)) {
          throw new DalDomainError('INVALID_STATUS', 'অবৈধ স্ট্যাটাস মান।');
        }

        targetHead.status = resolvedStatus as any;
        targetHead.isActive = resolvedStatus === 'ACTIVE';

        if (resolvedStatus !== 'ACTIVE' && !targetHead.parentId) {
          const childHeads = heads.filter(
            (h) => h.parentId === targetHead.id && h.mosqueId === mosqueId
          );
          childHeads.forEach((ch) => {
            ch.status = resolvedStatus as any;
            ch.isActive = false;
            ch.updatedAt = new Date().toISOString();
          });
        }
      }

      targetHead.updatedAt = new Date().toISOString();

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'UPDATE',
        'ACCOUNT_HEAD',
        `হিসাব খাত আপডেট করা হয়েছে: ${targetHead.nameBn} (${targetHead.code}) [স্ট্যাটাস: ${targetHead.status}]`,
        targetHead.id,
        activeOptions!.clientIp,
        {
          previousState: JSON.stringify(previousState),
          newState: JSON.stringify(targetHead),
          status: 'SUCCESS',
        }
      );

      return { ...targetHead };
    });
  }

  async deleteOrArchive(options: DALOptions, headId: string): Promise<DeleteAccountHeadResult> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const initialCheck = (this.dataSource.accountHeads || []).find(
      (h) => h.id === headId && h.mosqueId === mosqueId
    );
    if (!initialCheck) {
      throw new DalDomainError('NOT_FOUND', 'হিসাব খাত পাওয়া যায়নি।');
    }

    const childSubHeads = (this.dataSource.accountHeads || []).filter(
      (h) => h.parentId === initialCheck.id && h.mosqueId === mosqueId
    );
    if (childSubHeads.length > 0) {
      throw new DalDomainError(
        'CHILD_HEADS_EXIST',
        `এই প্রধান খাতের অধীনে ${childSubHeads.length}টি উপ-খাত রয়েছে। প্রধান খাত মুছে ফেলার আগে উপ-খাতগুলো ডিলিট বা স্থানান্তর করুন।`
      );
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const heads = this.dataSource.accountHeads || [];
      const targetHead = heads.find((h) => h.id === headId && h.mosqueId === mosqueId);
      if (!targetHead) {
        throw new DalDomainError('NOT_FOUND', 'হিসাব খাত পাওয়া যায়নি।');
      }

      const children = heads.filter(
        (h) => h.parentId === targetHead.id && h.mosqueId === mosqueId
      );
      if (children.length > 0) {
        throw new DalDomainError(
          'CHILD_HEADS_EXIST',
          `এই প্রধান খাতের অধীনে ${children.length}টি উপ-খাত রয়েছে। প্রধান খাত মুছে ফেলার আগে উপ-খাতগুলো ডিলিট বা স্থানান্তর করুন।`
        );
      }

      const incomeCount = (this.dataSource.incomeEntries || []).filter(
        (i) => i.mosqueId === mosqueId && (i.mainHeadId === targetHead.id || i.subHeadId === targetHead.id)
      ).length;
      const expenseCount = (this.dataSource.expenseEntries || []).filter(
        (e) => e.mosqueId === mosqueId && (e.mainHeadId === targetHead.id || e.subHeadId === targetHead.id)
      ).length;
      const totalCount = incomeCount + expenseCount;
      const actorName = resolveActorName(this.dataSource, activeOptions!);

      if (totalCount > 0) {
        targetHead.status = 'ARCHIVED';
        targetHead.isActive = false;
        targetHead.updatedAt = new Date().toISOString();

        tx.logAudit(
          mosqueId,
          activeOptions!.userContext.userId,
          actorName,
          activeOptions!.userContext.userRole,
          'ARCHIVE',
          'ACCOUNT_HEAD',
          `হিসাব খাত আর্কাইভ করা হয়েছে (পূর্বের ${totalCount}টি লেনদেনের ইতিহাস সংরক্ষিত): ${targetHead.nameBn} (${targetHead.code})`,
          targetHead.id,
          activeOptions!.clientIp,
          { previousState: 'ACTIVE', newState: 'ARCHIVED', status: 'SUCCESS' }
        );

        return {
          action: 'ARCHIVED' as const,
          head: { ...targetHead },
          usageCount: totalCount,
        };
      }

      const snapshotHead = { ...targetHead };
      const index = heads.findIndex((h) => h.id === targetHead.id);
      if (index !== -1) {
        heads.splice(index, 1);
      }

      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'DELETE',
        'ACCOUNT_HEAD',
        `হিসাব খাত মুছে ফেলা হয়েছে (অব্যবহৃত খাত): ${snapshotHead.nameBn} (${snapshotHead.code})`,
        snapshotHead.id,
        activeOptions!.clientIp,
        { previousState: JSON.stringify(snapshotHead), newState: 'DELETED', status: 'SUCCESS' }
      );

      return {
        action: 'DELETED' as const,
        head: snapshotHead,
        usageCount: 0,
      };
    });
  }
}

/**
 * Read-Only Financial Account Repository implementation backed by in-memory JSON dataset (Phase 1B.9).
 */
export class JsonFinancialAccountReadOnlyRepository implements Pick<IFinancialAccountRepository, 'list' | 'findById'> {
  constructor(
    protected dataSource: JsonDataSourceContract = db,
    protected defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<FinancialAccount[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const accounts = (this.dataSource.accounts || []).filter((a) => a.mosqueId === mosqueId);
    return accounts.map((a) => ({ ...a }));
  }

  async findById(options: DALOptions, accountId: string): Promise<FinancialAccount | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = (this.dataSource.accounts || []).find(
      (a) => a.id === accountId && a.mosqueId === mosqueId
    );
    return item ? { ...item } : null;
  }
}

/**
 * JSON Financial Account Parity Repository (Phase 1B.11):
 * Extends read-only repository with create, update, and setOpeningBalance delegating to db.runTransaction.
 * Deliberately excludes direct updateBalance override to enforce double-entry ledger recalculation invariants.
 */
export class JsonFinancialAccountParityRepository
  extends JsonFinancialAccountReadOnlyRepository
  implements Omit<IFinancialAccountRepository, 'updateBalance'>
{
  private recalculateCurrentBalance(mosqueId: string, account: FinancialAccount): number {
    const totalIn = (this.dataSource.incomeEntries || [])
      .filter((i) => i.mosqueId === mosqueId && i.accountId === account.id && i.status === 'APPROVED')
      .reduce((s, i) => s + i.amount, 0);

    const totalOut = (this.dataSource.expenseEntries || [])
      .filter((e) => e.mosqueId === mosqueId && e.accountId === account.id && e.status === 'APPROVED')
      .reduce((s, e) => s + e.amount, 0);

    const transfersIn = (this.dataSource.transfers || [])
      .filter((t) => t.mosqueId === mosqueId && t.toAccountId === account.id)
      .reduce((s, t) => s + t.amount, 0);

    const transfersOut = (this.dataSource.transfers || [])
      .filter((t) => t.mosqueId === mosqueId && t.fromAccountId === account.id)
      .reduce((s, t) => s + t.amount, 0);

    const opening = account.openingBalance || 0;
    const baseOpening = account.openingBalanceType === 'CREDIT' ? -opening : opening;
    return baseOpening + totalIn - totalOut + transfersIn - transfersOut;
  }

  async create(
    options: DALOptions,
    accountInput: CreateFinancialAccountInput
  ): Promise<FinancialAccount> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const accounts = this.dataSource.accounts || [];
      const bal = Number(accountInput.openingBalance) || 0;
      const nowIso = new Date().toISOString();
      const actorName = resolveActorName(this.dataSource, activeOptions!);
      const openType = accountInput.openingBalanceType || 'DEBIT';

      const newAcc: FinancialAccount = {
        id: `acc-${Date.now()}`,
        mosqueId,
        name: accountInput.name || accountInput.nameBn,
        nameBn: accountInput.nameBn,
        accountType: accountInput.accountType || 'BANK',
        bankName: accountInput.bankName,
        branchName: accountInput.branchName,
        accountNumber: accountInput.accountNumber,
        mfsProvider: accountInput.mfsProvider,
        mobileNumber: accountInput.mobileNumber,
        mfsAccountCategory: accountInput.mfsAccountCategory,
        bankAccountCategory: accountInput.bankAccountCategory,
        routingNumber: accountInput.routingNumber,
        contactPerson: accountInput.contactPerson,
        notes: accountInput.notes,
        openingBalance: bal,
        openingBalanceDate: accountInput.openingBalanceDate || nowIso.split('T')[0],
        openingBalanceType: openType,
        openingBalanceSource: accountInput.openingBalanceSource || 'INITIAL',
        openingBalanceNote: accountInput.openingBalanceNote || 'প্রাথমিক অ্যাকাউন্ট সেটআপ',
        currentBalance: openType === 'CREDIT' ? -bal : bal,
        status: accountInput.status || 'ACTIVE',
        createdAt: accountInput.createdAt || nowIso,
      };

      accounts.push(newAcc);

      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CREATE',
        'FINANCIAL_ACCOUNT',
        `নতুন ফান্ড/অ্যাকাউন্ট তৈরি: ${newAcc.nameBn} (${newAcc.accountType}, প্রারম্ভিক স্থিতি: ৳ ${bal})`,
        newAcc.id,
        activeOptions!.clientIp
      );

      return { ...newAcc };
    });
  }

  async update(
    options: DALOptions,
    accountId: string,
    updates: UpdateFinancialAccountInput
  ): Promise<FinancialAccount> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const initialCheck = (this.dataSource.accounts || []).find(
      (a) => a.id === accountId && a.mosqueId === mosqueId
    );
    if (!initialCheck) {
      throw new DalDomainError('NOT_FOUND', 'অ্যাকাউন্ট পাওয়া যায়নি।');
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const account = (this.dataSource.accounts || []).find(
        (a) => a.id === accountId && a.mosqueId === mosqueId
      );
      if (!account) {
        throw new DalDomainError('NOT_FOUND', 'অ্যাকাউন্ট পাওয়া যায়নি।');
      }

      const prevOpening = account.openingBalance || 0;
      const newOpening =
        updates.openingBalance !== undefined
          ? Number(updates.openingBalance) || 0
          : prevOpening;

      if (updates.nameBn) {
        account.name = updates.nameBn;
        account.nameBn = updates.nameBn;
      }
      if (updates.accountType !== undefined) account.accountType = updates.accountType;
      if (updates.bankName !== undefined) account.bankName = updates.bankName;
      if (updates.branchName !== undefined) account.branchName = updates.branchName;
      if (updates.accountNumber !== undefined) account.accountNumber = updates.accountNumber;
      if (updates.mfsProvider !== undefined) account.mfsProvider = updates.mfsProvider;
      if (updates.mobileNumber !== undefined) account.mobileNumber = updates.mobileNumber;
      if (updates.mfsAccountCategory !== undefined)
        account.mfsAccountCategory = updates.mfsAccountCategory;
      if (updates.bankAccountCategory !== undefined)
        account.bankAccountCategory = updates.bankAccountCategory;
      if (updates.routingNumber !== undefined) account.routingNumber = updates.routingNumber;
      if (updates.contactPerson !== undefined) account.contactPerson = updates.contactPerson;
      if (updates.notes !== undefined) account.notes = updates.notes;
      if (updates.status !== undefined) account.status = updates.status;

      account.openingBalance = newOpening;
      if (updates.openingBalanceDate !== undefined)
        account.openingBalanceDate = updates.openingBalanceDate;
      if (updates.openingBalanceType !== undefined)
        account.openingBalanceType = updates.openingBalanceType;
      if (updates.openingBalanceSource !== undefined)
        account.openingBalanceSource = updates.openingBalanceSource;
      if (updates.openingBalanceNote !== undefined)
        account.openingBalanceNote = updates.openingBalanceNote;
      account.updatedAt = new Date().toISOString();

      account.currentBalance = this.recalculateCurrentBalance(mosqueId, account);

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'UPDATE',
        'FINANCIAL_ACCOUNT',
        `অ্যাকাউন্ট/প্রারম্ভিক স্থিতি হালনাগাদ: ${account.nameBn} (প্রারম্ভিক স্থিতি: ৳ ${prevOpening.toLocaleString('en-IN')} ➔ ৳ ${newOpening.toLocaleString('en-IN')}, কার্যকর তারিখ: ${account.openingBalanceDate || 'N/A'}, উৎস: ${account.openingBalanceSource || 'N/A'})`,
        account.id,
        activeOptions!.clientIp
      );

      return { ...account };
    });
  }

  async setOpeningBalance(
    options: DALOptions,
    accountId: string,
    input: SetOpeningBalanceInput
  ): Promise<FinancialAccount> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    if (!accountId) {
      throw new DalDomainError('INVALID_INPUT', 'হিসাব বা অ্যাকাউন্ট নির্বাচন করুন।');
    }

    const resolvedIdemp = resolveIdempotencyContext(
      activeOptions?.idempotencyKey,
      mosqueId,
      '/api/v1/accounting/accounts/opening-balance'
    );
    if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
      const cached = this.dataSource.checkIdempotency(resolvedIdemp.key, resolvedIdemp.context);
      if (cached) {
        return { ...(cached.data || cached) };
      }
    }

    const initialAccCheck = (this.dataSource.accounts || []).find(
      (a) => a.id === accountId && a.mosqueId === mosqueId
    );
    if (!initialAccCheck) {
      throw new DalDomainError('NOT_FOUND', 'নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।');
    }

    const numOpening = Number(input.openingBalance);
    if (input.openingBalance !== undefined && isNaN(numOpening)) {
      throw new DalDomainError('INVALID_INPUT', 'প্রারম্ভিক স্থিতির সঠিক সংখ্যা লিখুন।');
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
        const cachedInside = this.dataSource.checkIdempotency(
          resolvedIdemp.key,
          resolvedIdemp.context
        );
        if (cachedInside) {
          return { ...(cachedInside.data || cachedInside) };
        }
      }

      const account = (this.dataSource.accounts || []).find(
        (a) => a.id === accountId && a.mosqueId === mosqueId
      );
      if (!account) {
        throw new DalDomainError('NOT_FOUND', 'নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।');
      }

      const prevOpening = account.openingBalance || 0;
      const newOpening = !isNaN(numOpening) ? numOpening : prevOpening;

      account.openingBalance = newOpening;
      account.openingBalanceDate =
        input.openingBalanceDate ||
        account.openingBalanceDate ||
        new Date().toISOString().split('T')[0];
      account.openingBalanceType =
        input.openingBalanceType || account.openingBalanceType || 'DEBIT';
      account.openingBalanceSource =
        input.openingBalanceSource || account.openingBalanceSource || 'INITIAL_SETUP';
      account.openingBalanceNote =
        input.openingBalanceNote !== undefined
          ? input.openingBalanceNote
          : account.openingBalanceNote || '';
      account.updatedAt = new Date().toISOString();

      account.currentBalance = this.recalculateCurrentBalance(mosqueId, account);

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'UPDATE',
        'OPENING_BALANCE',
        `প্রারম্ভিক স্থিতি সমন্বয়: ${account.nameBn} (পূর্বের স্থিতি: ৳ ${prevOpening.toLocaleString('en-IN')}, নতুন স্থিতি: ৳ ${newOpening.toLocaleString('en-IN')}, কার্যকর তারিখ: ${account.openingBalanceDate}, উৎস: ${account.openingBalanceSource}, নোট: ${account.openingBalanceNote || 'N/A'})`,
        account.id,
        activeOptions!.clientIp
      );

      if (resolvedIdemp && typeof tx.saveIdempotency === 'function') {
        const payload = {
          success: true,
          data: account,
          message: 'প্রারম্ভিক স্থিতি সফলভাবে সংরক্ষণ ও খতিয়ানে প্রয়োগ করা হয়েছে।',
        };
        tx.saveIdempotency(resolvedIdemp.key, payload, resolvedIdemp.context);
      }

      return { ...account };
    });
  }
}

/**
 * JSON Income Parity Repository (Phase 1B.7 / Phase 1B.10):
 * Implements list, findById, create, and reverse delegating to db.runTransaction.
 */
export class JsonIncomeParityRepository implements IIncomeRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<IncomeEntry[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const entries = (this.dataSource.incomeEntries || [])
      .filter((i) => i.mosqueId === mosqueId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries.map((e) => ({ ...e }));
  }

  async findById(options: DALOptions, entryId: string): Promise<IncomeEntry | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = (this.dataSource.incomeEntries || []).find(
      (i) => i.id === entryId && i.mosqueId === mosqueId
    );
    return item ? { ...item } : null;
  }

  async create(
    options: DALOptions,
    entryInput: Omit<IncomeEntry, 'id' | 'voucherNumber'>
  ): Promise<IncomeEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const resolvedIdemp = resolveIdempotencyContext(
      activeOptions?.idempotencyKey,
      mosqueId,
      '/api/v1/accounting/income'
    );
    if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
      const cached = this.dataSource.checkIdempotency(resolvedIdemp.key, resolvedIdemp.context);
      if (cached) {
        return { ...(cached.data || cached) };
      }
    }

    const numAmount = Number(entryInput.amount);
    if (!numAmount || isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'টাকার পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।');
    }

    const heads = this.dataSource.accountHeads || [];
    const mainHead = heads.find(
      (h) => h.id === entryInput.mainHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
    );
    const subHead = entryInput.subHeadId
      ? heads.find((h) => h.id === entryInput.subHeadId && (h.mosqueId === mosqueId || !h.mosqueId))
      : undefined;

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
        const cachedInside = this.dataSource.checkIdempotency(
          resolvedIdemp.key,
          resolvedIdemp.context
        );
        if (cachedInside) {
          return { ...(cachedInside.data || cachedInside) };
        }
      }

      const accounts = this.dataSource.accounts || [];
      const account =
        accounts.find((a) => a.id === entryInput.accountId && a.mosqueId === mosqueId) ||
        accounts.find((a) => a.mosqueId === mosqueId);

      const incomeList = this.dataSource.incomeEntries || [];
      const year = new Date().getFullYear();
      const count = incomeList.filter((i) => i.mosqueId === mosqueId).length + 1;
      const voucherNumber = `INC-${year}-${String(count).padStart(6, '0')}`;
      const nowIso = new Date().toISOString();
      const actorName = resolveActorName(this.dataSource, activeOptions!, entryInput.createdByName);

      const entry: IncomeEntry = {
        id: `inc-${Date.now()}`,
        mosqueId,
        voucherNumber,
        date: entryInput.date || nowIso.split('T')[0],
        mainHeadId: entryInput.mainHeadId,
        mainHeadNameBn: entryInput.mainHeadNameBn || mainHead?.nameBn || 'সাধারণ দান',
        subHeadId: entryInput.subHeadId || subHead?.id,
        subHeadNameBn: entryInput.subHeadNameBn || subHead?.nameBn,
        amount: numAmount,
        paymentMethod: entryInput.paymentMethod || 'CASH',
        accountId: account?.id || entryInput.accountId || 'acc-cash-01',
        accountName: account?.nameBn || entryInput.accountName || 'প্রধান ক্যাশ',
        donorName: entryInput.donorName || mainHead?.nameBn || entryInput.mainHeadNameBn || 'সাধারণ আয়',
        donorPhone: entryInput.donorPhone,
        reference: entryInput.reference,
        description: entryInput.description,
        attachmentUrl: entryInput.attachmentUrl,
        denominationData: entryInput.denominationData || undefined,
        createdBy: activeOptions!.userContext.userId,
        createdByName: actorName,
        status: entryInput.status || 'APPROVED',
        approvedBy: entryInput.approvedBy || activeOptions!.userContext.userId,
        approvedByName: entryInput.approvedByName || actorName,
        approvedAt: entryInput.approvedAt || nowIso,
        createdAt: entryInput.createdAt || nowIso,
        updatedAt: entryInput.updatedAt || nowIso,
      };

      if (account && entry.status === 'APPROVED') {
        account.currentBalance += numAmount;
      }

      incomeList.unshift(entry);

      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CREATE',
        'INCOME',
        `আয় ভাউচার তৈরি (${voucherNumber}): ৳ ${numAmount}${entry.denominationData ? ' (ডিনোমিনেশন সহ)' : ''}`,
        entry.id,
        activeOptions!.clientIp
      );

      if (resolvedIdemp && typeof tx.saveIdempotency === 'function') {
        const payload = {
          success: true,
          data: entry,
          message: 'আয় ভাউচার সফলভাবে সংরক্ষণ ও অ্যাকাউন্টে পোস্টিং করা হয়েছে।',
        };
        tx.saveIdempotency(resolvedIdemp.key, payload, resolvedIdemp.context);
      }

      return { ...entry };
    });
  }

  async update(
    options: DALOptions,
    entryId: string,
    updates: UpdateIncomeInput
  ): Promise<IncomeEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const resolvedIdemp = resolveIdempotencyContext(
      activeOptions?.idempotencyKey,
      mosqueId,
      `/api/v1/accounting/income/${entryId}`
    );
    if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
      const cached = this.dataSource.checkIdempotency(resolvedIdemp.key, resolvedIdemp.context);
      if (cached) {
        return { ...(cached.data || cached) };
      }
    }

    const initialCheck = (this.dataSource.incomeEntries || []).find(
      (i) => i.id === entryId && i.mosqueId === mosqueId
    );
    if (!initialCheck) {
      throw new DalDomainError('NOT_FOUND', 'আয় ভাউচার পাওয়া যায়নি।');
    }
    if (initialCheck.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'বাতিলকৃত আয় ভাউচার সংশোধন করা সম্ভব নয়।');
    }

    if (updates.amount !== undefined) {
      const numAmount = Number(updates.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new DalDomainError('INVALID_AMOUNT', 'আয়ের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।');
      }
    }

    if (updates.accountId && updates.accountId !== initialCheck.accountId) {
      const targetAcc = (this.dataSource.accounts || []).find(
        (a) => a.id === updates.accountId && a.mosqueId === mosqueId
      );
      if (!targetAcc) {
        throw new DalDomainError(
          'ACCOUNT_NOT_FOUND',
          'নির্দিষ্ট অ্যাকাউন্ট পাওয়া যায়নি বা এটি এই মসজিদের আওতাধীন নয়।'
        );
      }
    }

    const heads = this.dataSource.accountHeads || [];
    if (updates.mainHeadId !== undefined) {
      const mh = heads.find(
        (h) => h.id === updates.mainHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
      );
      if (!mh) {
        throw new DalDomainError('HEAD_NOT_FOUND', 'প্রধান আয় খাত পাওয়া যায়নি।');
      }
    }

    if (updates.subHeadId !== undefined) {
      const sh = heads.find(
        (h) => h.id === updates.subHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
      );
      if (!sh) {
        throw new DalDomainError('SUBHEAD_NOT_FOUND', 'উপ-আয় খাত পাওয়া যায়নি।');
      }
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
        const cachedInside = this.dataSource.checkIdempotency(
          resolvedIdemp.key,
          resolvedIdemp.context
        );
        if (cachedInside) {
          return { ...(cachedInside.data || cachedInside) };
        }
      }

      const item = (this.dataSource.incomeEntries || []).find(
        (i) => i.id === entryId && i.mosqueId === mosqueId
      );
      if (!item) {
        throw new DalDomainError('NOT_FOUND', 'আয় ভাউচার পাওয়া যায়নি।');
      }
      if (item.status === 'CANCELLED') {
        throw new DalDomainError('ALREADY_CANCELLED', 'বাতিলকৃত আয় ভাউচার সংশোধন করা সম্ভব নয়।');
      }

      const oldAmount = item.amount;
      const oldAccountId = item.accountId;

      if (updates.amount !== undefined || updates.accountId !== undefined) {
        const targetAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
        const targetAccountId =
          updates.accountId !== undefined ? updates.accountId : oldAccountId;

        if (oldAccountId === targetAccountId) {
          const account = (this.dataSource.accounts || []).find(
            (a) => a.id === item.accountId && a.mosqueId === mosqueId
          );
          if (account && item.status === 'APPROVED') {
            account.currentBalance -= oldAmount;
            account.currentBalance += targetAmount;
            account.updatedAt = new Date().toISOString();
          }
        } else {
          const oldAccount = (this.dataSource.accounts || []).find(
            (a) => a.id === oldAccountId && a.mosqueId === mosqueId
          );
          if (oldAccount && item.status === 'APPROVED') {
            oldAccount.currentBalance -= oldAmount;
            oldAccount.updatedAt = new Date().toISOString();
          }

          const newAccount = (this.dataSource.accounts || []).find(
            (a) => a.id === targetAccountId && a.mosqueId === mosqueId
          );
          if (newAccount) {
            if (item.status === 'APPROVED') {
              newAccount.currentBalance += targetAmount;
              newAccount.updatedAt = new Date().toISOString();
            }
            item.accountId = newAccount.id;
            item.accountName = newAccount.nameBn;
          }
        }
        item.amount = targetAmount;
      }

      if (updates.mainHeadId !== undefined) {
        item.mainHeadId = updates.mainHeadId;
        const mh = (this.dataSource.accountHeads || []).find(
          (h) => h.id === updates.mainHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
        );
        if (mh) item.mainHeadNameBn = mh.nameBn;
      }
      if (updates.subHeadId !== undefined) {
        item.subHeadId = updates.subHeadId;
        const sh = (this.dataSource.accountHeads || []).find(
          (h) => h.id === updates.subHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
        );
        if (sh) item.subHeadNameBn = sh.nameBn;
      }
      if (updates.donorName !== undefined) item.donorName = updates.donorName;
      if (updates.donorPhone !== undefined) item.donorPhone = updates.donorPhone;
      if (updates.reference !== undefined) item.reference = updates.reference;
      if (updates.description !== undefined) item.description = updates.description;
      if (updates.date !== undefined) item.date = updates.date;
      if (updates.denominationData !== undefined) item.denominationData = updates.denominationData;
      item.updatedAt = new Date().toISOString();

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'UPDATE',
        'INCOME',
        `আয় ভাউচার আপডেট (${item.voucherNumber}): পরিমাণ ৳ ${oldAmount} → ৳ ${item.amount}`,
        item.id,
        activeOptions!.clientIp
      );

      if (resolvedIdemp && typeof tx.saveIdempotency === 'function') {
        const payload = {
          success: true,
          data: item,
          message: 'আয় ভাউচার সফলভাবে হালনাগাদ ও হিসাব সমন্বয় করা হয়েছে।',
        };
        tx.saveIdempotency(resolvedIdemp.key, payload, resolvedIdemp.context);
      }

      return { ...item };
    });
  }

  async updateDenomination(
    options: DALOptions,
    entryId: string,
    denominationData: any,
    editReason?: string
  ): Promise<IncomeEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const initialCheck = (this.dataSource.incomeEntries || []).find(
      (i) => i.id === entryId && i.mosqueId === mosqueId
    );
    if (!initialCheck) {
      throw new DalDomainError('NOT_FOUND', 'আয় ভাউচার পাওয়া যায়নি।');
    }

    if (!denominationData) {
      throw new DalDomainError('INVALID_DATA', 'ডিনোমিনেশন ডাটা আবশ্যক।');
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const item = (this.dataSource.incomeEntries || []).find(
        (i) => i.id === entryId && i.mosqueId === mosqueId
      );
      if (!item) {
        throw new DalDomainError('NOT_FOUND', 'আয় ভাউচার পাওয়া যায়নি।');
      }

      const oldTotal = item.denominationData?.grandTotal || item.amount;
      item.denominationData = denominationData;
      item.updatedAt = new Date().toISOString();

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'UPDATE',
        'INCOME_DENOMINATION',
        `আয় ভাউচার (${item.voucherNumber}) ডিনোমিনেশন পরিবর্তন (৳ ${oldTotal} -> ৳ ${denominationData.grandTotal}). কারণ: ${editReason || 'হিসাব সমন্বয়'}`,
        item.id,
        activeOptions!.clientIp
      );

      return { ...item };
    });
  }

  async reverse(options: DALOptions, entryId: string, reason: string): Promise<IncomeEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const initialItem = (this.dataSource.incomeEntries || []).find(
      (i) => i.id === entryId && i.mosqueId === mosqueId
    );
    if (!initialItem) {
      throw new DalDomainError('NOT_FOUND', 'ভাউচার পাওয়া যায়নি।');
    }
    if (initialItem.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'এই ভাউচার ইতিমধ্যে বাতিল করা হয়েছে।');
    }
    if (initialItem.status !== 'APPROVED') {
      throw new DalDomainError(
        'INVALID_STATUS',
        `Only APPROVED income entries can be reversed. Entry [${entryId}] has status [${initialItem.status}].`
      );
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const item = (this.dataSource.incomeEntries || []).find(
        (i) => i.id === entryId && i.mosqueId === mosqueId
      );
      if (!item) {
        throw new DalDomainError('NOT_FOUND', 'ভাউচার পাওয়া যায়নি।');
      }
      if (item.status === 'CANCELLED') {
        throw new DalDomainError('ALREADY_CANCELLED', 'এই ভাউচার ইতিমধ্যে বাতিল করা হয়েছে।');
      }
      if (item.status !== 'APPROVED') {
        throw new DalDomainError(
          'INVALID_STATUS',
          `Only APPROVED income entries can be reversed. Entry [${entryId}] has status [${item.status}].`
        );
      }

      const account = (this.dataSource.accounts || []).find(
        (a) => a.id === item.accountId && a.mosqueId === mosqueId
      );
      if (account && item.status === 'APPROVED') {
        account.currentBalance -= item.amount;
      }

      const cleanReason = reason || 'অ্যাডমিন কর্তৃক রিভার্সাল';
      item.status = 'CANCELLED';
      item.rejectionReason = cleanReason;
      item.updatedAt = new Date().toISOString();

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CANCEL',
        'INCOME',
        `আয় ভাউচার বাতিল (${item.voucherNumber}): ৳ ${item.amount} - কারণ: ${reason}`,
        item.id,
        activeOptions!.clientIp
      );

      return { ...item };
    });
  }
}

/**
 * JSON Expense Parity Repository (Phase 1B.7 / Phase 1B.10):
 * Implements list, findById, create, and reverse delegating to db.runTransaction.
 */
export class JsonExpenseParityRepository implements IExpenseRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<ExpenseEntry[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const entries = (this.dataSource.expenseEntries || [])
      .filter((e) => e.mosqueId === mosqueId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries.map((e) => ({ ...e }));
  }

  async findById(options: DALOptions, entryId: string): Promise<ExpenseEntry | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = (this.dataSource.expenseEntries || []).find(
      (e) => e.id === entryId && e.mosqueId === mosqueId
    );
    return item ? { ...item } : null;
  }

  async create(
    options: DALOptions,
    entryInput: Omit<ExpenseEntry, 'id' | 'voucherNumber'>
  ): Promise<ExpenseEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const resolvedIdemp = resolveIdempotencyContext(
      activeOptions?.idempotencyKey,
      mosqueId,
      '/api/v1/accounting/expense'
    );
    if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
      const cached = this.dataSource.checkIdempotency(resolvedIdemp.key, resolvedIdemp.context);
      if (cached) {
        return { ...(cached.data || cached) };
      }
    }

    const numAmount = Number(entryInput.amount);
    if (!numAmount || isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      throw new DalDomainError(
        'INVALID_AMOUNT',
        'খরচের পরিমাণ অবশ্যই বৈধ এবং শূন্যের চেয়ে বেশি হতে হবে।'
      );
    }

    if (!entryInput.accountId) {
      throw new DalDomainError(
        'REQUIRED_ACCOUNT',
        'পরিশোধের আর্থিক হিসাব/অ্যাকাউন্ট নির্বাচন করা বাধ্যতামূলক।'
      );
    }

    const initialAcc = (this.dataSource.accounts || []).find(
      (a) => a.id === entryInput.accountId && a.mosqueId === mosqueId
    );
    if (!initialAcc) {
      throw new DalDomainError(
        'INVALID_ACCOUNT',
        'পরিশোধের নির্বাচিত অ্যাকাউন্টটি সঠিক নয় বা এই মসজিদের আওতাভুক্ত নয়।'
      );
    }
    if (initialAcc.status && initialAcc.status !== 'ACTIVE') {
      throw new DalDomainError(
        'INACTIVE_ACCOUNT',
        'নির্বাচিত অ্যাকাউন্টটি নিষ্ক্রিয় (Inactive)। দয়া করে সক্রিয় অ্যাকাউন্ট নির্বাচন করুন।'
      );
    }
    if (initialAcc.currentBalance < numAmount) {
      throw new DalDomainError(
        'INSUFFICIENT_BALANCE',
        `হিসাবে অপর্যাপ্ত ব্যালেন্স। অ্যাকাউন্ট "${initialAcc.nameBn}"-এর বর্তমান স্থিতি: ৳${initialAcc.currentBalance.toLocaleString('en-IN')}, কিন্তু ব্যয়ের পরিমাণ: ৳${numAmount.toLocaleString('en-IN')}।`
      );
    }

    if (!entryInput.mainHeadId) {
      throw new DalDomainError('REQUIRED_HEAD', 'ব্যয়ের প্রধান খাত নির্বাচন করা বাধ্যতামূলক।');
    }

    const heads = this.dataSource.accountHeads || [];
    const mainHead = heads.find(
      (h) => h.id === entryInput.mainHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
    );
    if (!mainHead && !entryInput.mainHeadNameBn) {
      throw new DalDomainError('INVALID_HEAD', 'নির্বাচিত প্রধান ব্যয়ের খাতটি পাওয়া যায়নি।');
    }
    const subHead = entryInput.subHeadId
      ? heads.find((h) => h.id === entryInput.subHeadId && (h.mosqueId === mosqueId || !h.mosqueId))
      : undefined;

    const cleanPayee = (entryInput.payeeName || '').trim();
    if (!cleanPayee) {
      throw new DalDomainError('REQUIRED_PAYEE', 'প্রাপক বা সুবিধাভোগী ব্যক্তির নাম প্রদান করুন।');
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
        const cachedInside = this.dataSource.checkIdempotency(
          resolvedIdemp.key,
          resolvedIdemp.context
        );
        if (cachedInside) {
          return { ...(cachedInside.data || cachedInside) };
        }
      }

      const account = (this.dataSource.accounts || []).find(
        (a) => a.id === entryInput.accountId && a.mosqueId === mosqueId
      );
      if (!account) {
        throw new DalDomainError(
          'INVALID_ACCOUNT',
          'পরিশোধের নির্বাচিত অ্যাকাউন্টটি সঠিক নয় বা এই মসজিদের আওতাভুক্ত নয়।'
        );
      }
      if (account.status && account.status !== 'ACTIVE') {
        throw new DalDomainError(
          'INACTIVE_ACCOUNT',
          'নির্বাচিত অ্যাকাউন্টটি নিষ্ক্রিয় (Inactive)। দয়া করে সক্রিয় অ্যাকাউন্ট নির্বাচন করুন।'
        );
      }
      if (account.currentBalance < numAmount) {
        throw new DalDomainError(
          'INSUFFICIENT_BALANCE',
          `হিসাবে অপর্যাপ্ত ব্যালেন্স। অ্যাকাউন্ট "${account.nameBn}"-এর বর্তমান স্থিতি: ৳${account.currentBalance.toLocaleString('en-IN')}, কিন্তু ব্যয়ের পরিমাণ: ৳${numAmount.toLocaleString('en-IN')}।`
        );
      }

      const expenseList = this.dataSource.expenseEntries || [];
      const year = new Date().getFullYear();
      const count = expenseList.filter((e) => e.mosqueId === mosqueId).length + 1;
      const voucherNumber = `EXP-${year}-${String(count).padStart(6, '0')}`;
      const nowIso = new Date().toISOString();
      const actorName = resolveActorName(this.dataSource, activeOptions!, entryInput.createdByName);
      const resolvedMainHeadName = mainHead?.nameBn || entryInput.mainHeadNameBn || 'অন্যান্য ব্যয়';
      const resolvedSubHeadName = subHead?.nameBn || entryInput.subHeadNameBn;

      const entry: ExpenseEntry = {
        id: `exp-${Date.now()}`,
        mosqueId,
        voucherNumber,
        date: entryInput.date || nowIso.split('T')[0],
        mainHeadId: entryInput.mainHeadId,
        mainHeadNameBn: resolvedMainHeadName,
        subHeadId: subHead?.id || entryInput.subHeadId,
        subHeadNameBn: resolvedSubHeadName,
        amount: numAmount,
        paymentMethod: entryInput.paymentMethod || 'CASH',
        accountId: account.id,
        accountName: account.nameBn || entryInput.accountName || 'প্রধান ক্যাশ',
        payeeName: cleanPayee,
        payeePhone: entryInput.payeePhone ? String(entryInput.payeePhone).trim() : undefined,
        reference: entryInput.reference ? String(entryInput.reference).trim() : undefined,
        description: entryInput.description ? String(entryInput.description).trim() : undefined,
        attachmentUrl: entryInput.attachmentUrl ? String(entryInput.attachmentUrl).trim() : undefined,
        sourceModule: entryInput.sourceModule || undefined,
        sourceId: entryInput.sourceId || undefined,
        sourceType: entryInput.sourceType || undefined,
        createdBy: activeOptions!.userContext.userId,
        createdByName: actorName,
        status: entryInput.status || 'APPROVED',
        approvedBy: entryInput.approvedBy || activeOptions!.userContext.userId,
        approvedByName: entryInput.approvedByName || actorName,
        approvedAt: entryInput.approvedAt || nowIso,
        createdAt: entryInput.createdAt || nowIso,
        updatedAt: entryInput.updatedAt || nowIso,
      };

      if (entry.status === 'APPROVED') {
        account.currentBalance -= numAmount;
      }

      expenseList.unshift(entry);

      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CREATE',
        'EXPENSE',
        `ব্যয় ভাউচার তৈরি (${voucherNumber}): ৳${numAmount} [খাত: ${resolvedMainHeadName}${resolvedSubHeadName ? ` > ${resolvedSubHeadName}` : ''}, হিসাব: ${account.nameBn}, মাধ্যম: ${entry.paymentMethod || 'CASH'}, উৎস: ${entry.sourceModule || 'GENERAL_EXPENSE'}]`,
        entry.id,
        activeOptions!.clientIp
      );

      if (resolvedIdemp && typeof tx.saveIdempotency === 'function') {
        const payload = {
          success: true,
          data: entry,
          message: 'ব্যয় ভাউচার সফলভাবে অনুমোদিত ও পরিশোধ রেকর্ড করা হয়েছে।',
        };
        tx.saveIdempotency(resolvedIdemp.key, payload, resolvedIdemp.context);
      }

      return { ...entry };
    });
  }

  async update(
    options: DALOptions,
    entryId: string,
    updates: UpdateExpenseInput
  ): Promise<ExpenseEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const resolvedIdemp = resolveIdempotencyContext(
      activeOptions?.idempotencyKey,
      mosqueId,
      `/api/v1/accounting/expense/${entryId}`
    );
    if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
      const cached = this.dataSource.checkIdempotency(resolvedIdemp.key, resolvedIdemp.context);
      if (cached) {
        return { ...(cached.data || cached) };
      }
    }

    const initialCheck = (this.dataSource.expenseEntries || []).find(
      (e) => e.id === entryId && e.mosqueId === mosqueId
    );
    if (!initialCheck) {
      throw new DalDomainError('NOT_FOUND', 'ব্যয় ভাউচার পাওয়া যায়নি।');
    }
    if (initialCheck.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'বাতিলকৃত ব্যয় ভাউচার সংশোধন করা সম্ভব নয়।');
    }

    if (updates.amount !== undefined) {
      const numAmount = Number(updates.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new DalDomainError(
          'INVALID_AMOUNT',
          'খরচের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।'
        );
      }
    }

    if (updates.accountId && updates.accountId !== initialCheck.accountId) {
      const targetAcc = (this.dataSource.accounts || []).find(
        (a) => a.id === updates.accountId && a.mosqueId === mosqueId
      );
      if (!targetAcc) {
        throw new DalDomainError(
          'ACCOUNT_NOT_FOUND',
          'নির্দিষ্ট অ্যাকাউন্ট পাওয়া যায়নি বা এটি এই মসজিদের আওতাধীন নয়।'
        );
      }
    }

    const heads = this.dataSource.accountHeads || [];
    if (updates.mainHeadId !== undefined) {
      const mh = heads.find(
        (h) => h.id === updates.mainHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
      );
      if (!mh) {
        throw new DalDomainError('HEAD_NOT_FOUND', 'প্রধান ব্যয় খাত পাওয়া যায়নি।');
      }
    }

    if (updates.subHeadId !== undefined) {
      const sh = heads.find(
        (h) => h.id === updates.subHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
      );
      if (!sh) {
        throw new DalDomainError('SUBHEAD_NOT_FOUND', 'উপ-ব্যয় খাত পাওয়া যায়নি।');
      }
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
        const cachedInside = this.dataSource.checkIdempotency(
          resolvedIdemp.key,
          resolvedIdemp.context
        );
        if (cachedInside) {
          return { ...(cachedInside.data || cachedInside) };
        }
      }

      const item = (this.dataSource.expenseEntries || []).find(
        (e) => e.id === entryId && e.mosqueId === mosqueId
      );
      if (!item) {
        throw new DalDomainError('NOT_FOUND', 'ব্যয় ভাউচার পাওয়া যায়নি।');
      }
      if (item.status === 'CANCELLED') {
        throw new DalDomainError('ALREADY_CANCELLED', 'বাতিলকৃত ব্যয় ভাউচার সংশোধন করা সম্ভব নয়।');
      }

      const oldAmount = item.amount;
      const oldAccountId = item.accountId;

      if (updates.amount !== undefined || updates.accountId !== undefined) {
        const targetAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
        const targetAccountId =
          updates.accountId !== undefined ? updates.accountId : oldAccountId;

        if (oldAccountId === targetAccountId) {
          const account = (this.dataSource.accounts || []).find(
            (a) => a.id === item.accountId && a.mosqueId === mosqueId
          );
          if (account && item.status === 'APPROVED') {
            account.currentBalance += oldAmount;
            account.currentBalance -= targetAmount;
            account.updatedAt = new Date().toISOString();
          }
        } else {
          const oldAccount = (this.dataSource.accounts || []).find(
            (a) => a.id === oldAccountId && a.mosqueId === mosqueId
          );
          if (oldAccount && item.status === 'APPROVED') {
            oldAccount.currentBalance += oldAmount;
            oldAccount.updatedAt = new Date().toISOString();
          }

          const newAccount = (this.dataSource.accounts || []).find(
            (a) => a.id === targetAccountId && a.mosqueId === mosqueId
          );
          if (newAccount) {
            if (item.status === 'APPROVED') {
              newAccount.currentBalance -= targetAmount;
              newAccount.updatedAt = new Date().toISOString();
            }
            item.accountId = newAccount.id;
            item.accountName = newAccount.nameBn;
          }
        }
        item.amount = targetAmount;
      }

      if (updates.mainHeadId !== undefined) {
        item.mainHeadId = updates.mainHeadId;
        const mh = (this.dataSource.accountHeads || []).find(
          (h) => h.id === updates.mainHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
        );
        if (mh) item.mainHeadNameBn = mh.nameBn;
      }
      if (updates.subHeadId !== undefined) {
        item.subHeadId = updates.subHeadId;
        const sh = (this.dataSource.accountHeads || []).find(
          (h) => h.id === updates.subHeadId && (h.mosqueId === mosqueId || !h.mosqueId)
        );
        if (sh) item.subHeadNameBn = sh.nameBn;
      }
      if (updates.payeeName !== undefined) item.payeeName = updates.payeeName;
      if (updates.payeePhone !== undefined) item.payeePhone = updates.payeePhone;
      if (updates.reference !== undefined) item.reference = updates.reference;
      if (updates.description !== undefined) item.description = updates.description;
      if (updates.date !== undefined) item.date = updates.date;
      item.updatedAt = new Date().toISOString();

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'UPDATE',
        'EXPENSE',
        `ব্যয় ভাউচার আপডেট (${item.voucherNumber}): পরিমাণ ৳ ${oldAmount} → ৳ ${item.amount}`,
        item.id,
        activeOptions!.clientIp
      );

      if (resolvedIdemp && typeof tx.saveIdempotency === 'function') {
        const payload = {
          success: true,
          data: item,
          message: 'ব্যয় ভাউচার সফলভাবে হালনাগাদ ও হিসাব সমন্বয় করা হয়েছে।',
        };
        tx.saveIdempotency(resolvedIdemp.key, payload, resolvedIdemp.context);
      }

      return { ...item };
    });
  }

  async reverse(options: DALOptions, entryId: string, reason: string): Promise<ExpenseEntry> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const initialItem = (this.dataSource.expenseEntries || []).find(
      (e) => e.id === entryId && e.mosqueId === mosqueId
    );
    if (!initialItem) {
      throw new DalDomainError('NOT_FOUND', 'ভাউচার পাওয়া যায়নি।');
    }
    if (initialItem.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'এই ভাউচার ইতিমধ্যে বাতিল করা হয়েছে।');
    }
    if (initialItem.status !== 'APPROVED') {
      throw new DalDomainError(
        'INVALID_STATUS',
        `Only APPROVED expense entries can be reversed. Entry [${entryId}] has status [${initialItem.status}].`
      );
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const item = (this.dataSource.expenseEntries || []).find(
        (e) => e.id === entryId && e.mosqueId === mosqueId
      );
      if (!item) {
        throw new DalDomainError('NOT_FOUND', 'ভাউচার পাওয়া যায়নি।');
      }
      if (item.status === 'CANCELLED') {
        throw new DalDomainError('ALREADY_CANCELLED', 'এই ভাউচার ইতিমধ্যে বাতিল করা হয়েছে।');
      }
      if (item.status !== 'APPROVED') {
        throw new DalDomainError(
          'INVALID_STATUS',
          `Only APPROVED expense entries can be reversed. Entry [${entryId}] has status [${item.status}].`
        );
      }

      const account = (this.dataSource.accounts || []).find(
        (a) => a.id === item.accountId && a.mosqueId === mosqueId
      );
      if (account && item.status === 'APPROVED') {
        account.currentBalance += item.amount;
      }

      item.status = 'CANCELLED';
      item.isReversal = true;
      item.rejectionReason = reason || 'অ্যাডমিন কর্তৃক রিভার্সাল';
      item.updatedAt = new Date().toISOString();

      const actorName = resolveActorName(this.dataSource, activeOptions!);
      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CANCEL',
        'EXPENSE',
        `ব্যয় ভাউচার বাতিল (${item.voucherNumber}): ৳${item.amount} ফেরত প্রদান করা হয়েছে (${account ? account.nameBn : 'হিসাব'}). কারণ: ${reason || 'রিভার্সাল'}`,
        item.id,
        activeOptions!.clientIp
      );

      return { ...item };
    });
  }
}

/**
 * JSON Transfer Parity Repository (Phase 1B.7):
 * Implements list and create delegating to db.runTransaction.
 */
export class JsonTransferParityRepository implements ITransferRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<AccountTransfer[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const items = (this.dataSource.transfers || [])
      .filter((t) => t.mosqueId === mosqueId)
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
      );
    return items.map((t) => ({ ...t }));
  }

  async create(
    options: DALOptions,
    transfer: Omit<AccountTransfer, 'id' | 'transferNumber'>
  ): Promise<AccountTransfer> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const numAmount = Number(transfer.amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'স্থানান্তরের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।');
    }

    if (transfer.fromAccountId === transfer.toAccountId) {
      throw new DalDomainError('SAME_ACCOUNT', 'একই অ্যাকাউন্টে স্থানান্তর সম্ভব নয়।');
    }

    const resolvedIdemp = resolveIdempotencyContext(
      activeOptions?.idempotencyKey,
      mosqueId,
      '/api/v1/accounting/accounts/transfer'
    );

    if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
      const cached = this.dataSource.checkIdempotency(resolvedIdemp.key, resolvedIdemp.context);
      if (cached) {
        return { ...(cached.data || cached) };
      }
    }

    const initialFrom = (this.dataSource.accounts || []).find(
      (a) => a.id === transfer.fromAccountId && a.mosqueId === mosqueId
    );
    const initialTo = (this.dataSource.accounts || []).find(
      (a) => a.id === transfer.toAccountId && a.mosqueId === mosqueId
    );

    if (!initialFrom || !initialTo) {
      throw new DalDomainError('ACCOUNT_NOT_FOUND', 'প্রেরক বা প্রাপক অ্যাকাউন্ট পাওয়া যায়নি।');
    }

    if (initialFrom.currentBalance < numAmount) {
      throw new DalDomainError(
        'INSUFFICIENT_BALANCE',
        `উৎস অ্যাকাউন্টে পর্যাপ্ত স্থিতি নেই (বর্তমান স্থিতি: ৳ ${initialFrom.currentBalance})`
      );
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (resolvedIdemp && typeof this.dataSource.checkIdempotency === 'function') {
        const cachedInside = this.dataSource.checkIdempotency(
          resolvedIdemp.key,
          resolvedIdemp.context
        );
        if (cachedInside) {
          return { ...(cachedInside.data || cachedInside) };
        }
      }

      const fromAcc = (this.dataSource.accounts || []).find(
        (a) => a.id === transfer.fromAccountId && a.mosqueId === mosqueId
      );
      const toAcc = (this.dataSource.accounts || []).find(
        (a) => a.id === transfer.toAccountId && a.mosqueId === mosqueId
      );

      if (!fromAcc || !toAcc) {
        throw new DalDomainError('ACCOUNT_NOT_FOUND', 'প্রেরক বা প্রাপক অ্যাকাউন্ট পাওয়া যায়নি।');
      }

      if (fromAcc.currentBalance < numAmount) {
        throw new DalDomainError(
          'INSUFFICIENT_BALANCE',
          `উৎস অ্যাকাউন্টে পর্যাপ্ত স্থিতি নেই (বর্তমান স্থিতি: ৳ ${fromAcc.currentBalance})`
        );
      }

      fromAcc.currentBalance -= numAmount;
      toAcc.currentBalance += numAmount;

      const transfersList = this.dataSource.transfers || [];
      const count = transfersList.filter((t) => t.mosqueId === mosqueId).length + 1;
      const transferNumber = `TRF-${new Date().getFullYear()}-${String(count).padStart(6, '0')}`;
      const actorName = resolveActorName(this.dataSource, activeOptions!, transfer.createdByName);

      const tRecord: AccountTransfer = {
        id: `trf-${Date.now()}`,
        mosqueId,
        transferNumber,
        fromAccountId: fromAcc.id,
        fromAccountName: transfer.fromAccountName || fromAcc.nameBn,
        toAccountId: toAcc.id,
        toAccountName: transfer.toAccountName || toAcc.nameBn,
        amount: numAmount,
        date: transfer.date || new Date().toISOString().split('T')[0],
        purpose: transfer.purpose || 'GENERAL_TRANSFER',
        description: transfer.description,
        reference: transfer.reference,
        attachmentUrl: transfer.attachmentUrl,
        createdBy: activeOptions!.userContext.userId,
        createdByName: actorName,
        createdAt: new Date().toISOString(),
      };

      transfersList.unshift(tRecord);

      tx.logAudit(
        mosqueId,
        activeOptions!.userContext.userId,
        actorName,
        activeOptions!.userContext.userRole,
        'CREATE',
        'ACCOUNT_TRANSFER',
        `তহবিল স্থানান্তর (${transferNumber}): ${fromAcc.nameBn} -> ${toAcc.nameBn} (৳ ${numAmount})`,
        tRecord.id,
        activeOptions!.clientIp
      );

      if (resolvedIdemp && typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(resolvedIdemp.key, tRecord, resolvedIdemp.context);
      }

      return { ...tRecord };
    });
  }
}

/**
 * JSON Idempotency Parity Repository (Phase 1B.7):
 * Wraps the tenant-scoped JSON idempotency engine in a DAL-compliant contract.
 */
export class JsonIdempotencyParityRepository implements IIdempotencyRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async getRecord<T = any>(
    options: DALOptions,
    endpoint: string,
    idempotencyKey?: string
  ): Promise<IdempotencyRecord<T> | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const key = idempotencyKey || activeOptions?.idempotencyKey;
    const resolved = resolveIdempotencyContext(key, mosqueId, endpoint);
    if (!resolved || typeof this.dataSource.checkIdempotency !== 'function') {
      return null;
    }

    const cached = this.dataSource.checkIdempotency(resolved.key, resolved.context);
    if (!cached) {
      return null;
    }

    const nowIso = new Date().toISOString();
    return {
      id: `idemp-json-${mosqueId}-${resolved.key}`,
      mosqueId,
      idempotencyKey: resolved.key,
      endpoint,
      responsePayload: cached as T,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
  }

  async saveRecord<T = any>(
    options: DALOptions,
    input: SaveIdempotencyInput<T>
  ): Promise<IdempotencyRecord<T> | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const key = input.idempotencyKey || activeOptions?.idempotencyKey;
    const resolved = resolveIdempotencyContext(key, mosqueId, input.endpoint);
    if (!resolved || typeof this.dataSource.saveIdempotency !== 'function') {
      return null;
    }

    this.dataSource.saveIdempotency(resolved.key, input.responsePayload, resolved.context);

    const ttlMs = (input.ttlSeconds || 86400) * 1000;
    const nowIso = new Date().toISOString();
    return {
      id: `idemp-json-${mosqueId}-${resolved.key}`,
      mosqueId,
      idempotencyKey: resolved.key,
      endpoint: input.endpoint,
      requestHash: input.requestHash || null,
      responsePayload: input.responsePayload,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
  }

  async cleanupExpired(options: DALOptions): Promise<number> {
    const activeOptions = options || this.defaultOptions;
    verifyJsonTenantAccess(this.dataSource, activeOptions);
    const map = this.dataSource.idempotencyMap;
    if (!map) return 0;

    let removed = 0;
    const now = Date.now();
    for (const [k, v] of Object.entries(map)) {
      if (now - v.createdAt > 24 * 3600 * 1000) {
        delete map[k];
        removed++;
      }
    }
    return removed;
  }
}

function normalizeBdPhoneHelper(raw?: string): string {
  if (!raw) return '';
  let digits = String(raw).replace(/[\s\-\(\)]/g, '');
  if (digits.startsWith('+88')) digits = digits.slice(3);
  else if (digits.startsWith('8801')) digits = digits.slice(2);
  return digits;
}

/**
 * JSON Parity Repository for Donations (Section 7 — Phase 1B.12).
 */
export class JsonDonationParityRepository implements IDonationRepository {
  constructor(
    private readonly dataSource: JsonDataSourceContract,
    private readonly defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.donations || [])
      .filter((d: any) => d.mosqueId === mosqueId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async findById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.donations || []).find((d: any) => d.id === id && d.mosqueId === mosqueId) || null;
  }

  async create(
    options: DALOptions,
    payload: Record<string, any>
  ): Promise<{ donation: any; incEntry: any; targetCollection?: any; responsePayload: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const {
      donorName,
      donorPhone,
      donorAddress,
      donorEmail,
      isAnonymous,
      category,
      amount,
      paymentMethod,
      accountId,
      reference,
      date,
      denominationData,
      description,
      countingTeam,
      witness,
      personId,
      donationPlanId,
      familyId,
      areaId,
      collectionWorkerId,
      collectionId,
      _idempotencyKey
    } = payload;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'অনুদানের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।');
    }

    let verifiedPersonId: string | undefined = undefined;
    let verifiedPersonCode: string | undefined = undefined;
    let verifiedFamilyId: string | undefined = familyId || undefined;
    let verifiedAreaId: string | undefined = areaId || undefined;
    let verifiedPlanId: string | undefined = undefined;
    let verifiedPlanCode: string | undefined = undefined;
    let verifiedWorkerId: string | undefined = collectionWorkerId || undefined;
    let verifiedCollectionId: string | undefined = undefined;
    let targetCollection: any = undefined;

    if (collectionId) {
      targetCollection = (this.dataSource.donationCollections || []).find((c: any) => c.id === collectionId && c.mosqueId === mosqueId);
      if (!targetCollection) {
        throw new DalDomainError('INVALID_COLLECTION', 'নির্বাচিত সংগ্রহ কার্যক্রম এই মসজিদে অন্তর্ভুক্ত নয় বা বিদ্যমান নেই।');
      }
      if (targetCollection.status === 'CANCELLED') {
        throw new DalDomainError('COLLECTION_CANCELLED', 'বাতিলকৃত সংগ্রহের বিপরীতে নতুন অনুদান গ্রহণ করা সম্ভব নয়।');
      }
      verifiedCollectionId = targetCollection.id;
      if (!verifiedWorkerId && targetCollection.collectionWorkerId) {
        verifiedWorkerId = targetCollection.collectionWorkerId;
      }
      if (!verifiedFamilyId && targetCollection.familyId) {
        verifiedFamilyId = targetCollection.familyId;
      }
      if (!verifiedAreaId && targetCollection.areaId) {
        verifiedAreaId = targetCollection.areaId;
      }
    }

    if (personId) {
      const person = (this.dataSource.persons || []).find((p: any) => p.id === personId && p.mosqueId === mosqueId);
      if (!person) {
        throw new DalDomainError('INVALID_PERSON', 'নির্বাচিত ব্যক্তি এই মসজিদে অন্তর্ভুক্ত নয় বা বিদ্যমান নেই।');
      }
      verifiedPersonId = person.id;
      verifiedPersonCode = person.personCode;
      if (!verifiedFamilyId && person.familyId) verifiedFamilyId = person.familyId;
      if (!verifiedAreaId && person.areaId) verifiedAreaId = person.areaId;
    }

    if (targetCollection) {
      if (verifiedPersonId && targetCollection.personId !== verifiedPersonId) {
        throw new DalDomainError('PERSON_COLLECTION_MISMATCH', 'সংগ্রহ কার্যক্রমটি নির্বাচিত মুসল্লির সঙ্গে সামঞ্জস্যপূর্ণ নয়।');
      }
      if (!verifiedPersonId) {
        verifiedPersonId = targetCollection.personId;
        const person = (this.dataSource.persons || []).find((p: any) => p.id === targetCollection.personId && p.mosqueId === mosqueId);
        if (person) {
          verifiedPersonCode = person.personCode;
          if (!verifiedFamilyId && person.familyId) verifiedFamilyId = person.familyId;
          if (!verifiedAreaId && person.areaId) verifiedAreaId = person.areaId;
        }
      }
    }

    const targetPlanId = donationPlanId || targetCollection?.donationPlanId;
    if (targetPlanId) {
      const plan = (this.dataSource.donationPlans || []).find((p: any) => p.id === targetPlanId && p.mosqueId === mosqueId);
      if (!plan) {
        throw new DalDomainError('INVALID_PLAN', 'নির্বাচিত অনুদান পরিকল্পনা এই মসজিদে অন্তর্ভুক্ত নয় বা বিদ্যমান নেই।');
      }
      if (verifiedPersonId && plan.personId !== verifiedPersonId) {
        throw new DalDomainError('CROSS_PERSON_PLAN', 'নির্বাচিত অনুদান পরিকল্পনাটি এই ব্যক্তির নয়।');
      }
      if (targetCollection && targetCollection.donationPlanId !== plan.id) {
        throw new DalDomainError('PLAN_COLLECTION_MISMATCH', 'সংগ্রহ কার্যক্রমটি নির্বাচিত দান পরিকল্পনার সঙ্গে সামঞ্জস্যপূর্ণ নয়।');
      }

      verifiedPlanId = plan.id;
      verifiedPlanCode = plan.planCode || plan.id;
      if (!verifiedPersonId) {
        verifiedPersonId = plan.personId;
        const person = (this.dataSource.persons || []).find((p: any) => p.id === plan.personId && p.mosqueId === mosqueId);
        if (person) {
          verifiedPersonCode = person.personCode;
          if (!verifiedFamilyId && person.familyId) verifiedFamilyId = person.familyId;
          if (!verifiedAreaId && person.areaId) verifiedAreaId = person.areaId;
        }
      }
      if (!verifiedWorkerId && plan.collectionWorkerId) {
        verifiedWorkerId = plan.collectionWorkerId;
      }
    }

    if (verifiedWorkerId) {
      const worker = (this.dataSource.collectionWorkers || []).find(
        (w: any) => (w.id === verifiedWorkerId || w.userId === verifiedWorkerId) && w.mosqueId === mosqueId
      );
      const userWorker = (this.dataSource.users || []).find(
        (u: any) => u.id === verifiedWorkerId && (u.mosqueId === mosqueId || !u.mosqueId)
      );
      if (!worker && !userWorker) {
        throw new DalDomainError('INVALID_WORKER', 'সংগ্রহকারী কর্মী এই মসজিদের অন্তর্ভুক্ত নয়।');
      }
    }

    if (verifiedFamilyId) {
      const family = (this.dataSource.families || []).find((f: any) => f.id === verifiedFamilyId && f.mosqueId === mosqueId);
      if (!family) {
        throw new DalDomainError('INVALID_FAMILY', 'নির্বাচিত পরিবার এই মসজিদে অন্তর্ভুক্ত নয় বা বিদ্যমান নেই।');
      }
    }
    if (verifiedAreaId) {
      const area = (this.dataSource.areas || []).find((a: any) => a.id === verifiedAreaId && a.mosqueId === mosqueId);
      if (!area) {
        throw new DalDomainError('INVALID_AREA', 'নির্বাচিত এলাকা এই মসজিদে অন্তর্ভুক্ত নয় বা বিদ্যমান নেই।');
      }
    }

    const year = new Date().getFullYear();
    const count = (this.dataSource.donations || []).filter((d: any) => d.mosqueId === mosqueId).length + 1;
    const receiptNumber = `REC-${year}-${String(100 + count).padStart(6, '0')}`;
    const pMethod = (paymentMethod || 'CASH').toUpperCase();
    let account: any;
    if (accountId) {
      account = (this.dataSource.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId);
      if (!account) {
        throw new DalDomainError('INVALID_ACCOUNT', 'নির্বাচিত ব্যাংক বা ক্যাশ অ্যাকাউন্ট এই মসজিদে অন্তর্ভুক্ত নয় বা বিদ্যমান নেই।');
      }
      if (pMethod === 'BANK' && account.accountType === 'CASH') {
        throw new DalDomainError('ACCOUNT_TYPE_MISMATCH', 'ব্যাংক পেমেন্ট পদ্ধতির জন্য ক্যাশ অ্যাকাউন্ট নির্বাচন করা যাবে না। একটি ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।');
      }
      if (pMethod === 'CASH' && account.accountType === 'BANK') {
        throw new DalDomainError('ACCOUNT_TYPE_MISMATCH', 'নগদ পেমেন্ট পদ্ধতির জন্য ব্যাংক অ্যাকাউন্ট নির্বাচন করা যাবে না। একটি ক্যাশ অ্যাকাউন্ট নির্বাচন করুন।');
      }
    } else {
      if (pMethod === 'BANK' || pMethod === 'CHEQUE' || pMethod === 'ONLINE') {
        account =
          (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId && a.accountType === 'BANK') ||
          (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId);
      } else {
        account =
          (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId && a.accountType === 'CASH') ||
          (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId);
      }
      if (!account) {
        account = (this.dataSource.accounts || [])[0];
      }
    }

    const incEntryId = `inc-don-${Date.now()}`;
    const donation: any = {
      id: `don-${Date.now()}`,
      mosqueId,
      receiptNumber,
      donorName: isAnonymous ? 'আল্লাহর এক বান্দা (Anonymous)' : (donorName || 'সম্মানিত দানশীল'),
      donorPhone: isAnonymous ? '' : donorPhone,
      donorEmail: isAnonymous ? '' : donorEmail,
      donorAddress,
      isAnonymous: Boolean(isAnonymous),
      category: category || 'GENERAL',
      amount: numAmount,
      paymentMethod: paymentMethod || 'CASH',
      accountId: account.id,
      accountName: account.nameBn,
      reference,
      description: description || undefined,
      countingTeam: countingTeam || undefined,
      witness: witness || undefined,
      date: date || new Date().toISOString().split('T')[0],
      receivedBy: actor.userId,
      receivedByName: actor.userName,
      incomeEntryId: incEntryId,
      denominationData: denominationData || undefined,
      personId: verifiedPersonId,
      personCode: verifiedPersonCode,
      familyId: verifiedFamilyId,
      areaId: verifiedAreaId,
      donationPlanId: verifiedPlanId,
      planCode: verifiedPlanCode,
      collectionId: verifiedCollectionId,
      collectionWorkerId: verifiedWorkerId,
      status: 'COMPLETED' as const,
      createdAt: new Date().toISOString(),
    };

    const incVoucherNumber = `INC-${year}-${String((this.dataSource.incomeEntries || []).filter((i: any) => i.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;
    const isJumaRecord = Boolean(
      (reference && reference.includes('জুমা')) ||
      (description && description.includes('জুমা')) ||
      (donorName && donorName.includes('জুমা'))
    );
    const incEntry: any = {
      id: incEntryId,
      mosqueId,
      voucherNumber: incVoucherNumber,
      date: donation.date,
      mainHeadId: 'head-inc-01',
      mainHeadNameBn: 'দান ও অনুদান (Donations)',
      subHeadId: isJumaRecord ? 'head-inc-01-2' : 'head-inc-01-3',
      subHeadNameBn: isJumaRecord ? 'পবিত্র জুমার জামাত কালেকশন' : `মাসিক ও বিশেষ অনুদান (${donation.donorName})`,
      amount: numAmount,
      paymentMethod: donation.paymentMethod,
      accountId: account.id,
      accountName: account.nameBn,
      donorName: isJumaRecord ? 'পবিত্র জুমার জামাত ও মুসল্লিবৃন্দ' : donation.donorName,
      donorPhone: donation.donorPhone,
      reference: `Receipt: ${receiptNumber}`,
      description: description || `দান রসিদ ${receiptNumber} এর বিপরীতে সংগৃহীত অনুদান`,
      denominationData: denominationData || undefined,
      createdBy: actor.userId,
      createdByName: actor.userName,
      status: 'APPROVED' as const,
      approvedBy: actor.userId,
      approvedByName: actor.userName,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const responsePayload = await runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      account.currentBalance += numAmount;
      tx.donations.unshift(donation);

      if (verifiedCollectionId && targetCollection) {
        const validColDonations = (tx.donations || []).filter(
          (d: any) => d.collectionId === verifiedCollectionId && d.status !== 'CANCELLED' && d.mosqueId === mosqueId
        );
        const totalCollected = validColDonations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        targetCollection.collectedAmount = totalCollected;
        targetCollection.lastCollectionDate = donation.date;
        targetCollection.updatedAt = new Date().toISOString();
        targetCollection.updatedBy = actor.userId;
        targetCollection.updatedByName = actor.userName;

        if (targetCollection.status !== 'CANCELLED') {
          if (totalCollected >= targetCollection.plannedAmount) {
            targetCollection.status = 'COLLECTED';
          } else if (totalCollected > 0) {
            targetCollection.status = 'PARTIALLY_COLLECTED';
          } else {
            targetCollection.status = 'PENDING';
          }
        }

        tx.logAudit(
          mosqueId,
          actor.userId,
          actor.userName,
          actor.userRole,
          'UPDATE',
          'DONATION_COLLECTION',
          `সংগ্রহ কার্যক্রমে অনুদান সমন্বয় (${targetCollection.id}): সংগৃহীত ৳ ${totalCollected} / ৳ ${targetCollection.plannedAmount} (অবস্থা: ${targetCollection.status})`
        );
      }

      tx.incomeEntries.unshift(incEntry);

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'DONATION',
        `দান রসিদ প্রস্তুত (${receiptNumber}): ৳ ${numAmount} - ${donation.donorName}${verifiedPlanCode ? ` [প্ল্যান: ${verifiedPlanCode}]` : ''}${denominationData ? ' (ডিনোমিনেশন সহ)' : ''}`
      );

      const resPayload = { success: true, data: donation, message: 'অনুদানের মানি রিসিট প্রস্তুত ও ফান্ডে যোগ করা হয়েছে।' };
      const idempKey = _idempotencyKey || activeOptions?.idempotencyKey;
      if (typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(idempKey, resPayload);
      }

      return resPayload;
    });

    return { donation, incEntry, targetCollection: verifiedCollectionId ? targetCollection : undefined, responsePayload };
  }

  async cancel(
    options: DALOptions,
    id: string,
    reason?: string
  ): Promise<{ donation: any; payload: any; incEntry?: any; updatedCollection?: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const donation = (this.dataSource.donations || []).find((d: any) => d.id === id && d.mosqueId === mosqueId);
    if (!donation) {
      throw new DalDomainError('NOT_FOUND', 'দান রসিদ পাওয়া যায়নি।');
    }
    if (donation.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'এই রসিদটি ইতিমধ্যে বাতিল করা হয়েছে।');
    }

    const cancelReason = reason || 'ভুল এন্ট্রি বা হিসাব সংশোধন';

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (donation.status === 'CANCELLED') {
        throw new DalDomainError('ALREADY_CANCELLED', 'এই রসিদটি ইতিমধ্যে বাতিল করা হয়েছে।');
      }

      const account = (tx.accounts || []).find((a: any) => a.id === donation.accountId && a.mosqueId === mosqueId);
      if (account) {
        account.currentBalance -= donation.amount;
      }

      const incEntry = (tx.incomeEntries || []).find(
        (i: any) => (i.id === donation.incomeEntryId || i.reference === `Receipt: ${donation.receiptNumber}`) && i.mosqueId === mosqueId
      );
      if (incEntry) {
        incEntry.status = 'CANCELLED' as const;
        incEntry.rejectionReason = cancelReason;
        incEntry.updatedAt = new Date().toISOString();
      }

      donation.status = 'CANCELLED';
      donation.cancellationReason = cancelReason;
      donation.cancelledAt = new Date().toISOString();
      donation.cancelledBy = actor.userId;
      donation.updatedAt = new Date().toISOString();
      donation.updatedBy = actor.userId;

      let updatedCollection: any = undefined;
      const col = donation.collectionId
        ? (tx.donationCollections || []).find((c: any) => c.id === donation.collectionId && c.mosqueId === mosqueId)
        : (donation.donationPlanId && donation.personId
            ? (tx.donationCollections || []).find(
                (c: any) =>
                  c.donationPlanId === donation.donationPlanId &&
                  c.personId === donation.personId &&
                  (donation.date || '').startsWith(c.collectionPeriod.substring(0, 7)) &&
                  c.mosqueId === mosqueId
              )
            : undefined);

      if (col) {
        const remainingDonations = (tx.donations || []).filter(
          (d: any) =>
            (d.collectionId === col.id ||
              (d.donationPlanId === col.donationPlanId &&
                d.personId === col.personId &&
                d.date.startsWith(col.collectionPeriod.substring(0, 7)))) &&
            d.id !== donation.id &&
            d.status !== 'CANCELLED' &&
            d.mosqueId === mosqueId
        );
        const totalCollected = remainingDonations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        col.collectedAmount = totalCollected;
        col.updatedAt = new Date().toISOString();
        col.updatedBy = actor.userId;
        col.updatedByName = actor.userName;

        if (col.status !== 'CANCELLED') {
          if (totalCollected >= col.plannedAmount) {
            col.status = 'COLLECTED';
          } else if (totalCollected > 0) {
            col.status = 'PARTIALLY_COLLECTED';
          } else {
            if (col.status !== 'PAUSED') {
              col.status = 'PENDING';
            }
          }
        }
        updatedCollection = col;

        tx.logAudit(
          mosqueId,
          actor.userId,
          actor.userName,
          actor.userRole,
          'UPDATE',
          'DONATION_COLLECTION',
          `সংগ্রহ কার্যক্রমে অনুদান বাতিল সমন্বয় (${col.id}): সংগৃহীত হ্রাস পেয়ে ৳ ${totalCollected} / ৳ ${col.plannedAmount} (অবস্থা: ${col.status})`
        );
      }

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CANCEL',
        'DONATION',
        `দান রসিদ বাতিল (${donation.receiptNumber}): ৳ ${donation.amount} - ${donation.donorName}. কারণ: ${cancelReason}`
      );

      const payload = { success: true, data: donation, message: 'দান রসিদ সফলভাবে বাতিল ও আর্থিক সমন্বয় সম্পন্ন হয়েছে।' };
      if (typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(activeOptions?.idempotencyKey, payload);
      }

      return { donation, payload, incEntry, updatedCollection };
    });
  }

  async updateDenomination(options: DALOptions, id: string, denominationData: any, editReason?: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const donation = (this.dataSource.donations || []).find((d: any) => d.id === id && d.mosqueId === mosqueId);
    if (!donation) {
      throw new DalDomainError('NOT_FOUND', 'দান রসিদ পাওয়া যায়নি।');
    }

    if (!denominationData) {
      throw new DalDomainError('INVALID_DATA', 'ডিনোমিনেশন ডাটা আবশ্যক।');
    }

    const oldTotal = donation.denominationData?.grandTotal || donation.amount;
    donation.denominationData = denominationData;

    const incEntry = (this.dataSource.incomeEntries || []).find(
      (i: any) => i.reference === `Receipt: ${donation.receiptNumber}` && i.mosqueId === mosqueId
    );
    if (incEntry) {
      incEntry.denominationData = denominationData;
      incEntry.updatedAt = new Date().toISOString();
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'DONATION_DENOMINATION',
        `দান রসিদ (${donation.receiptNumber}) ডিনোমিনেশন পরিবর্তন (৳ ${oldTotal} -> ৳ ${denominationData.grandTotal}). কারণ: ${editReason || 'হিসাব সমন্বয়'}`
      );
    }

    return donation;
  }
}

/**
 * JSON Parity Repository for Donation Boxes & Collections (Section 7 — Phase 1B.12).
 */
export class JsonDonationBoxParityRepository implements IDonationBoxRepository {
  constructor(
    private readonly dataSource: JsonDataSourceContract,
    private readonly defaultOptions?: DALOptions
  ) {}

  async listBoxesAndCollections(options: DALOptions): Promise<{ boxes: any[]; collections: any[] }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const boxes = (this.dataSource.donationBoxes || []).filter((b: any) => b.mosqueId === mosqueId);
    const collections = (this.dataSource.donationBoxCollections || []).filter((c: any) => c.mosqueId === mosqueId);
    return { boxes, collections };
  }

  async createBox(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const {
      boxNumber, boxCode, manualName, location, shopName, ownerName,
      ownerPhone, address, area, ward, responsiblePerson, status,
      description, notes, lastCollectedDate, installationDate, createdAt
    } = payload;

    const existingCount = (this.dataSource.donationBoxes || []).filter((b: any) => b.mosqueId === mosqueId).length;
    const code = boxCode || boxNumber || `BOX-${String(existingCount + 1).padStart(3, '0')}`;

    const box: any = {
      id: `box-${Date.now()}`,
      mosqueId,
      boxCode: code,
      manualName: manualName || '',
      location: location || shopName || 'প্রধান ফটক',
      shopName: shopName || '',
      ownerName: ownerName || '',
      ownerPhone: ownerPhone || '',
      address: address || '',
      area: area || '',
      ward: ward || '',
      responsiblePerson: responsiblePerson || '',
      description: description || notes || '',
      notes: notes || description || '',
      status: status || 'ACTIVE',
      lastCollectedDate: lastCollectedDate ? lastCollectedDate : undefined,
      installationDate: installationDate || createdAt || new Date().toISOString().split('T')[0],
      totalCollected: 0,
      createdAt: installationDate || createdAt || new Date().toISOString()
    };

    if (!this.dataSource.donationBoxes) this.dataSource.donationBoxes = [];
    this.dataSource.donationBoxes.push(box);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'DONATION_BOX',
        `নতুন দানবাক্স তৈরি: ${box.boxCode} (${box.manualName || box.shopName || box.location})`
      );
    }

    return box;
  }

  async updateBox(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const box = (this.dataSource.donationBoxes || []).find((b: any) => b.id === id && b.mosqueId === mosqueId);
    if (!box) {
      throw new DalDomainError('NOT_FOUND', 'দানবাক্স পাওয়া যায়নি।');
    }

    const {
      boxCode, manualName, location, shopName, ownerName, ownerPhone,
      address, area, ward, responsiblePerson, status, description,
      notes, lastCollectedDate, installationDate, createdAt
    } = payload;

    if (boxCode !== undefined) box.boxCode = boxCode;
    if (manualName !== undefined) box.manualName = manualName;
    if (location !== undefined) box.location = location;
    if (shopName !== undefined) box.shopName = shopName;
    if (ownerName !== undefined) box.ownerName = ownerName;
    if (ownerPhone !== undefined) box.ownerPhone = ownerPhone;
    if (address !== undefined) box.address = address;
    if (area !== undefined) box.area = area;
    if (ward !== undefined) box.ward = ward;
    if (responsiblePerson !== undefined) box.responsiblePerson = responsiblePerson;
    if (status !== undefined) box.status = status;
    if (description !== undefined) box.description = description;
    if (notes !== undefined) box.notes = notes;
    if (lastCollectedDate !== undefined) box.lastCollectedDate = lastCollectedDate ? lastCollectedDate : undefined;
    if (installationDate !== undefined) box.installationDate = installationDate;
    if (createdAt !== undefined) box.createdAt = createdAt;

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'DONATION_BOX',
        `দানবাক্স তথ্য আপডেট: ${box.boxCode} (${box.manualName || box.shopName || box.location})`
      );
    }

    return box;
  }

  async deleteBox(options: DALOptions, id: string): Promise<{ success: boolean; id?: string }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const idx = (this.dataSource.donationBoxes || []).findIndex((b: any) => b.id === id && b.mosqueId === mosqueId);
    if (idx === -1) {
      throw new DalDomainError('NOT_FOUND', 'দানবাক্স পাওয়া যায়নি।');
    }

    const removed = this.dataSource.donationBoxes!.splice(idx, 1)[0];
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'DONATION_BOX',
        `দানবাক্স মুছে ফেলা হয়েছে: ${removed.boxCode}`
      );
    }

    return { success: true, id: removed.id };
  }

  async collectBox(
    options: DALOptions,
    payload: Record<string, any>
  ): Promise<{ collection: any; box: any; incEntry: any; responsePayload: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const { boxId, amount, witnesses, countingTeam, notes, accountId, date, denominationData, _idempotencyKey } = payload;
    const numAmount = Number(amount);
    const box = (this.dataSource.donationBoxes || []).find((b: any) => b.id === boxId && b.mosqueId === mosqueId);
    const account =
      (this.dataSource.accounts || []).find((a: any) => a.id === accountId) ||
      (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
      (this.dataSource.accounts || [])[0];

    if (!numAmount || numAmount <= 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'সংগৃহীত টাকার পরিমাণ আবশ্যক।');
    }

    const year = new Date().getFullYear();
    const count = (this.dataSource.donationBoxCollections || []).filter((c: any) => c.mosqueId === mosqueId).length + 1;
    const collectionNumber = `BOX-COL-${year}-${String(count).padStart(5, '0')}`;

    const colDate = date || new Date().toISOString().split('T')[0];
    const colWitnesses = Array.isArray(witnesses) ? witnesses : (witnesses ? String(witnesses).split(',') : ['কমিটি সদস্যবৃন্দ']);
    const colCountingTeam = Array.isArray(countingTeam) ? countingTeam : (countingTeam ? String(countingTeam).split(',') : [actor.userName]);

    const incVoucherNumber = `INC-${year}-${String((this.dataSource.incomeEntries || []).filter((i: any) => i.mosqueId === mosqueId).length + 1).padStart(6, '0')}`;

    const collection: any = {
      id: `col-${Date.now()}`,
      mosqueId,
      boxId: box?.id || 'box-01',
      boxCode: box?.boxCode || 'BOX-01',
      collectionDate: colDate,
      amount: numAmount,
      countingTeam: colCountingTeam,
      witnesses: colWitnesses,
      depositAccountId: account.id,
      depositAccountName: account.nameBn,
      depositReference: collectionNumber,
      incomeVoucherNumber: incVoucherNumber,
      denominationData: denominationData || undefined,
      notes,
      createdBy: actor.userId,
      createdByName: actor.userName,
      createdAt: new Date().toISOString()
    };

    let incEntry: any = null;
    const responsePayload = await runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (box) {
        box.lastCollectedDate = colDate;
        box.totalCollected = (box.totalCollected || 0) + numAmount;
      }
      account.currentBalance += numAmount;

      incEntry = {
        id: `inc-box-${Date.now()}`,
        mosqueId,
        voucherNumber: incVoucherNumber,
        date: colDate,
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-2',
        subHeadNameBn: `দানবাক্স খোলা কালেকশন (${box?.boxCode || 'বাক্স'})`,
        amount: numAmount,
        paymentMethod: 'CASH' as const,
        accountId: account.id,
        accountName: account.nameBn,
        donorName: `দানবাক্স সংগ্রাহক (${collectionNumber})`,
        description: `দানবাক্স কালেকশন ভাউচার ${collectionNumber}`,
        denominationData: denominationData || undefined,
        createdBy: actor.userId,
        createdByName: actor.userName,
        status: 'APPROVED' as const,
        approvedBy: actor.userId,
        approvedByName: actor.userName,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      tx.donationBoxCollections.unshift(collection);
      tx.incomeEntries.unshift(incEntry);

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'DONATION_BOX_COLLECT',
        `দানবাক্স খোলা ও জমা (${collectionNumber}): ৳ ${numAmount}${denominationData ? ' (ডিনোমিনেশন সহ)' : ''}`
      );

      const resPayload = {
        success: true,
        data: collection,
        box,
        incomeVoucher: incEntry,
        message: 'দানবাক্সের টাকা সফলভাবে গণনা ও তহবিলে জমা করা হয়েছে।'
      };
      const idempKey = _idempotencyKey || activeOptions?.idempotencyKey;
      if (typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(idempKey, resPayload);
      }

      return resPayload;
    });

    return { collection, box, incEntry, responsePayload };
  }

  async updateCollectionDenomination(options: DALOptions, id: string, denominationData: any, editReason?: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const collection = (this.dataSource.donationBoxCollections || []).find(
      (c: any) => c.id === id && c.mosqueId === mosqueId
    );
    if (!collection) {
      throw new DalDomainError('NOT_FOUND', 'দানবাক্স কালেকশন পাওয়া যায়নি।');
    }

    if (!denominationData) {
      throw new DalDomainError('INVALID_DATA', 'ডিনোমিনেশন ডাটা আবশ্যক।');
    }

    const oldTotal = collection.denominationData?.grandTotal || collection.amount;
    collection.denominationData = denominationData;

    if (collection.incomeVoucherNumber) {
      const inc = (this.dataSource.incomeEntries || []).find(
        (i: any) => i.voucherNumber === collection.incomeVoucherNumber && i.mosqueId === mosqueId
      );
      if (inc) {
        inc.denominationData = denominationData;
        inc.updatedAt = new Date().toISOString();
      }
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'DONATION_BOX_DENOMINATION',
        `দানবাক্স কালেকশন (${collection.depositReference || collection.id}) ডিনোমিনেশন পরিবর্তন (৳ ${oldTotal} -> ৳ ${denominationData.grandTotal}). কারণ: ${editReason || 'হিসাব সমন্বয়'}`
      );
    }

    return collection;
  }
}

/**
 * JSON Parity Repository for Staff, Payroll, Advances & Batches (Section 9 — Phase 1B.12).
 */
export class JsonStaffParityRepository implements IStaffRepository {
  constructor(
    private readonly dataSource: JsonDataSourceContract,
    private readonly defaultOptions?: DALOptions
  ) {}

  async listStaff(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.staffList || []).filter((s: any) => s.mosqueId === mosqueId);
  }

  async listPayments(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.staffPayments || []).filter((p: any) => p.mosqueId === mosqueId);
  }

  async getNextCode(options: DALOptions): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const currentYear = new Date().getFullYear();
    const yearStaff = (this.dataSource.staffList || []).filter(
      (s: any) => s.mosqueId === mosqueId && (s.staffCode?.startsWith(`STF-${currentYear}-`) || s.joiningDate?.startsWith(`${currentYear}`))
    );
    const nextSeq = yearStaff.length + 1;
    const nextCode = `STF-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
    return { nextCode, code: nextCode, year: currentYear, count: yearStaff.length };
  }

  async createStaff(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const {
      name, fatherName, motherName, dateOfBirth, gender, maritalStatus, bloodGroup,
      designationBn, roleCategory, employmentType, joiningDate, confirmationDate,
      appointmentLetterNo, committeeResolutionRef, dutyHoursDescription, offDay,
      monthlySalary, basicSalary, allowance, housingAllowance, medicalAllowance,
      transportAllowance, otherAllowance, annualLeaveQuota, festivalBonusEligible,
      phone, altPhone, email, nid, presentAddress, permanentAddress, address,
      emergencyContactName, emergencyContactRelation, emergencyContactPhone,
      paymentChannel, bankName, bankBranch, bankAccountName, bankAccountNo,
      routingNumber, mfsProvider, mfsAccountNo, isResidential, residenceDetails,
      linkedUserId, photoUrl, status, notes, documents
    } = payload;

    if (!name || !designationBn || !phone) {
      throw new DalDomainError('VALIDATION_ERROR', 'স্টাফের নাম, পদবী এবং মোবাইল নম্বর আবশ্যক।');
    }

    const baseSal = Number(basicSalary !== undefined ? basicSalary : monthlySalary) || 0;
    const houseAllow = Number(housingAllowance) || 0;
    const medAllow = Number(medicalAllowance) || 0;
    const transAllow = Number(transportAllowance) || 0;
    const othAllow = Number(otherAllowance) || 0;
    const subAllowances = houseAllow + medAllow + transAllow + othAllow;
    const totalAllow = subAllowances > 0 ? subAllowances : Number(allowance) || 0;

    if (
      baseSal < 0 ||
      houseAllow < 0 ||
      medAllow < 0 ||
      transAllow < 0 ||
      othAllow < 0 ||
      Number(allowance || 0) < 0 ||
      Number(monthlySalary || 0) < 0
    ) {
      throw new DalDomainError('NEGATIVE_SALARY_NOT_ALLOWED', 'বেতন বা ভাতার পরিমাণ ঋণাত্মক (Negative) হতে পারবে না।');
    }

    const pChannel = paymentChannel || 'CASH';
    if (pChannel === 'BANK' && (!bankName || !bankAccountNo)) {
      throw new DalDomainError(
        'BANK_DETAILS_REQUIRED',
        'ব্যাংক ট্রান্সফার চ্যানেলের জন্য ব্যাংকের নাম এবং অ্যাকাউন্ট নম্বর আবশ্যক।'
      );
    }
    if (pChannel === 'MFS' && (!mfsProvider || !mfsAccountNo)) {
      throw new DalDomainError(
        'MFS_DETAILS_REQUIRED',
        'মোবাইল ব্যাংকিং (MFS) চ্যানেলের জন্য প্রোভাইডার এবং অ্যাকাউন্ট নম্বর আবশ্যক।'
      );
    }

    const normalizedPhone = normalizeBdPhoneHelper(phone);
    if (normalizedPhone) {
      const duplicatePhoneStaff = (this.dataSource.staffList || []).find(
        (s: any) =>
          s.mosqueId === mosqueId &&
          s.status !== 'INACTIVE' &&
          s.status !== 'ARCHIVED' &&
          s.status !== 'EMPLOYMENT_ENDED' &&
          normalizeBdPhoneHelper(s.phone) === normalizedPhone
      );
      if (duplicatePhoneStaff) {
        throw new DalDomainError(
          'DUPLICATE_PHONE',
          `এই মোবাইল নম্বরটি (${phone}) ইতিমধ্যে সক্রিয় স্টাফ "${duplicatePhoneStaff.name}" (${duplicatePhoneStaff.designationBn})-এর জন্য ব্যবহৃত হচ্ছে।`
        );
      }
    }

    const trimmedNid = nid ? String(nid).trim() : '';
    if (trimmedNid) {
      const duplicateNidStaff = (this.dataSource.staffList || []).find(
        (s: any) =>
          s.mosqueId === mosqueId &&
          s.status !== 'INACTIVE' &&
          s.status !== 'ARCHIVED' &&
          s.status !== 'EMPLOYMENT_ENDED' &&
          s.nid &&
          String(s.nid).trim() === trimmedNid
      );
      if (duplicateNidStaff) {
        throw new DalDomainError(
          'DUPLICATE_NID',
          `এই জাতীয় পরিচয়পত্র নম্বরটি (${trimmedNid}) ইতিমধ্যে স্টাফ "${duplicateNidStaff.name}"-এর জন্য নিবন্ধিত আছে।`
        );
      }
    }

    const joinYear = joiningDate ? new Date(joiningDate).getFullYear() : new Date().getFullYear();
    const sameYearStaff = (this.dataSource.staffList || []).filter(
      (s: any) => s.mosqueId === mosqueId && (s.staffCode?.startsWith(`STF-${joinYear}-`) || s.joiningDate?.startsWith(`${joinYear}`))
    );
    const staffCode = payload.staffCode || `STF-${joinYear}-${String(sameYearStaff.length + 1).padStart(3, '0')}`;
    const grossSal = Number(monthlySalary) || baseSal + totalAllow;
    const nowIso = new Date().toISOString();
    const joinDateStr = joiningDate || nowIso.split('T')[0];

    const newStaff: any = {
      id: `st-${Date.now()}`,
      mosqueId,
      staffCode,
      name: String(name).trim(),
      fatherName: fatherName || '',
      motherName: motherName || '',
      dateOfBirth: dateOfBirth || '',
      gender: gender || 'MALE',
      maritalStatus: maritalStatus || '',
      bloodGroup: bloodGroup || '',
      designationBn: String(designationBn).trim(),
      roleCategory: roleCategory || 'OTHER',
      employmentType: employmentType || 'PERMANENT',
      joiningDate: joinDateStr,
      confirmationDate: confirmationDate || '',
      appointmentLetterNo: appointmentLetterNo || '',
      committeeResolutionRef: committeeResolutionRef || '',
      dutyHoursDescription: dutyHoursDescription || '',
      offDay: offDay || '',
      monthlySalary: grossSal,
      basicSalary: baseSal,
      allowance: totalAllow,
      housingAllowance: houseAllow,
      medicalAllowance: medAllow,
      transportAllowance: transAllow,
      otherAllowance: othAllow,
      grossSalary: grossSal,
      annualLeaveQuota: annualLeaveQuota !== undefined ? Number(annualLeaveQuota) : 15,
      festivalBonusEligible: festivalBonusEligible !== undefined ? Boolean(festivalBonusEligible) : true,
      phone: String(phone).trim(),
      altPhone: altPhone || '',
      email: email || '',
      nid: trimmedNid,
      presentAddress: presentAddress || address || '',
      permanentAddress: permanentAddress || '',
      address: address || presentAddress || '',
      emergencyContactName: emergencyContactName || '',
      emergencyContactRelation: emergencyContactRelation || '',
      emergencyContactPhone: emergencyContactPhone || '',
      paymentChannel: pChannel,
      bankName: bankName || '',
      bankBranch: bankBranch || '',
      bankAccountName: bankAccountName || '',
      bankAccountNo: bankAccountNo || '',
      routingNumber: routingNumber || '',
      mfsProvider: mfsProvider || '',
      mfsAccountNo: mfsAccountNo || '',
      isResidential: Boolean(isResidential),
      residenceDetails: residenceDetails || '',
      linkedUserId: linkedUserId || '',
      photoUrl: photoUrl || '',
      status: status || 'ACTIVE',
      notes: notes || '',
      documents: Array.isArray(documents) ? documents : [],
      salaryHistory: [
        {
          id: `sh-${Date.now()}`,
          previousSalary: 0,
          newSalary: grossSal,
          previousAllowance: 0,
          newAllowance: totalAllow,
          effectiveDate: joinDateStr,
          reason: 'প্রাথমিক নিয়োগ ও বেতন নির্ধারণ',
          changedBy: actor.userName,
          changedAt: nowIso,
        },
      ],
      employmentHistory: [
        {
          id: `eh-${Date.now()}`,
          newDesignation: String(designationBn).trim(),
          newEmploymentType: employmentType || 'PERMANENT',
          effectiveDate: joinDateStr,
          reason: 'নতুন নিয়োগ',
          orderRef: appointmentLetterNo || committeeResolutionRef || '',
          changedBy: actor.userName,
          changedAt: nowIso,
        },
      ],
      statusHistory: [
        {
          id: `sth-${Date.now()}`,
          newStatus: status || 'ACTIVE',
          effectiveDate: joinDateStr,
          reason: 'প্রাথমিক নিয়োগ',
          changedBy: actor.userName,
          changedAt: nowIso,
        },
      ],
      advanceRecords: [],
      leaveRecords: [],
      attendanceSummary: [],
      attendanceRecords: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (!this.dataSource.staffList) this.dataSource.staffList = [];
    this.dataSource.staffList.push(newStaff);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'STAFF',
        `নতুন স্টাফ নিয়োগ: ${newStaff.name} (${newStaff.designationBn}, কোড: ${newStaff.staffCode}, বেতন: ৳${newStaff.grossSalary})`
      );
    }

    return newStaff;
  }

  async updateStaff(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const index = (this.dataSource.staffList || []).findIndex((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (index === -1) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ খুঁজে পাওয়া যায়নি।');
    }

    const existing = this.dataSource.staffList![index];

    if (payload.phone) {
      const normalizedPhone = normalizeBdPhoneHelper(payload.phone);
      const duplicatePhoneStaff = (this.dataSource.staffList || []).find(
        (s: any) =>
          s.mosqueId === mosqueId &&
          s.id !== existing.id &&
          s.status !== 'INACTIVE' &&
          s.status !== 'ARCHIVED' &&
          s.status !== 'EMPLOYMENT_ENDED' &&
          normalizeBdPhoneHelper(s.phone) === normalizedPhone
      );
      if (duplicatePhoneStaff) {
        throw new DalDomainError(
          'DUPLICATE_PHONE',
          `এই মোবাইল নম্বরটি (${payload.phone}) ইতিমধ্যে সক্রিয় স্টাফ "${duplicatePhoneStaff.name}"-এর জন্য ব্যবহৃত হচ্ছে।`
        );
      }
    }

    if (payload.nid && String(payload.nid).trim()) {
      const trimmedNid = String(payload.nid).trim();
      const duplicateNidStaff = (this.dataSource.staffList || []).find(
        (s: any) =>
          s.mosqueId === mosqueId &&
          s.id !== existing.id &&
          s.status !== 'INACTIVE' &&
          s.status !== 'ARCHIVED' &&
          s.status !== 'EMPLOYMENT_ENDED' &&
          s.nid &&
          String(s.nid).trim() === trimmedNid
      );
      if (duplicateNidStaff) {
        throw new DalDomainError(
          'DUPLICATE_NID',
          `এই জাতীয় পরিচয়পত্র নম্বরটি (${trimmedNid}) ইতিমধ্যে স্টাফ "${duplicateNidStaff.name}"-এর জন্য নিবন্ধিত আছে।`
        );
      }
    }

    const baseSal =
      payload.basicSalary !== undefined
        ? Number(payload.basicSalary)
        : payload.monthlySalary !== undefined
          ? Number(payload.monthlySalary)
          : existing.basicSalary ?? existing.monthlySalary ?? 0;

    const houseAllow = payload.housingAllowance !== undefined ? Number(payload.housingAllowance) : existing.housingAllowance ?? 0;
    const medAllow = payload.medicalAllowance !== undefined ? Number(payload.medicalAllowance) : existing.medicalAllowance ?? 0;
    const transAllow = payload.transportAllowance !== undefined ? Number(payload.transportAllowance) : existing.transportAllowance ?? 0;
    const othAllow = payload.otherAllowance !== undefined ? Number(payload.otherAllowance) : existing.otherAllowance ?? 0;
    const subAllowSum = houseAllow + medAllow + transAllow + othAllow;

    const totalAllow =
      payload.allowance !== undefined
        ? Number(payload.allowance)
        : subAllowSum > 0
          ? subAllowSum
          : existing.allowance ?? 0;

    if (baseSal < 0 || houseAllow < 0 || medAllow < 0 || transAllow < 0 || othAllow < 0 || totalAllow < 0) {
      throw new DalDomainError('NEGATIVE_SALARY_NOT_ALLOWED', 'বেতন বা ভাতার পরিমাণ ঋণাত্মক (Negative) হতে পারবে না।');
    }

    const pChannel = payload.paymentChannel !== undefined ? payload.paymentChannel : existing.paymentChannel || 'CASH';
    const effBankName = payload.bankName !== undefined ? payload.bankName : existing.bankName;
    const effBankAcc = payload.bankAccountNo !== undefined ? payload.bankAccountNo : existing.bankAccountNo;
    const effMfsProv = payload.mfsProvider !== undefined ? payload.mfsProvider : existing.mfsProvider;
    const effMfsAcc = payload.mfsAccountNo !== undefined ? payload.mfsAccountNo : existing.mfsAccountNo;

    if (pChannel === 'BANK' && (!effBankName || !effBankAcc)) {
      throw new DalDomainError('BANK_DETAILS_REQUIRED', 'ব্যাংক ট্রান্সফার চ্যানেলের জন্য ব্যাংকের নাম এবং অ্যাকাউন্ট নম্বর আবশ্যক।');
    }
    if (pChannel === 'MFS' && (!effMfsProv || !effMfsAcc)) {
      throw new DalDomainError('MFS_DETAILS_REQUIRED', 'মোবাইল ব্যাংকিং (MFS) চ্যানেলের জন্য প্রোভাইডার এবং অ্যাকাউন্ট নম্বর আবশ্যক।');
    }

    const grossSal =
      payload.grossSalary !== undefined
        ? Number(payload.grossSalary)
        : payload.monthlySalary !== undefined && payload.basicSalary === undefined
          ? Number(payload.monthlySalary)
          : baseSal + totalAllow;

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    const salaryHistory = Array.isArray(existing.salaryHistory) ? [...existing.salaryHistory] : [];
    const oldGross = existing.grossSalary ?? existing.monthlySalary ?? 0;
    if (grossSal !== oldGross) {
      salaryHistory.unshift({
        id: `sh-${Date.now()}`,
        previousSalary: oldGross,
        newSalary: grossSal,
        previousAllowance: existing.allowance ?? 0,
        newAllowance: totalAllow,
        effectiveDate: payload.salaryEffectiveDate || todayStr,
        reason: payload.salaryChangeReason || 'প্রোফাইল সম্পাদনায় বেতন হালনাগাদ',
        changedBy: actor.userName,
        changedAt: nowIso,
      });
    }

    const employmentHistory = Array.isArray(existing.employmentHistory) ? [...existing.employmentHistory] : [];
    const newDesig = payload.designationBn !== undefined ? String(payload.designationBn).trim() : existing.designationBn;
    const newEmpType = payload.employmentType !== undefined ? payload.employmentType : existing.employmentType || 'PERMANENT';
    if (newDesig !== existing.designationBn || newEmpType !== (existing.employmentType || 'PERMANENT')) {
      employmentHistory.unshift({
        id: `eh-${Date.now()}`,
        previousDesignation: existing.designationBn,
        newDesignation: newDesig,
        previousEmploymentType: existing.employmentType || 'PERMANENT',
        newEmploymentType: newEmpType,
        effectiveDate: todayStr,
        reason: payload.employmentChangeReason || 'পদবী / নিয়োগের ধরন পরিবর্তন',
        orderRef: payload.appointmentLetterNo || payload.committeeResolutionRef || '',
        changedBy: actor.userName,
        changedAt: nowIso,
      });
    }

    const statusHistory = Array.isArray(existing.statusHistory) ? [...existing.statusHistory] : [];
    const newStatus = payload.status !== undefined ? payload.status : existing.status;
    if (newStatus !== existing.status) {
      statusHistory.unshift({
        id: `sth-${Date.now()}`,
        previousStatus: existing.status,
        newStatus,
        effectiveDate: payload.leavingDate || payload.resignationDate || todayStr,
        reason: payload.leavingReason || payload.statusChangeReason || 'স্ট্যাটাস পরিবর্তন',
        changedBy: actor.userName,
        changedAt: nowIso,
      });
    }

    const updatedStaff: any = {
      ...existing,
      ...payload,
      id: existing.id,
      mosqueId: existing.mosqueId,
      staffCode: existing.staffCode || payload.staffCode,
      basicSalary: baseSal,
      allowance: totalAllow,
      housingAllowance: houseAllow,
      medicalAllowance: medAllow,
      transportAllowance: transAllow,
      otherAllowance: othAllow,
      monthlySalary: grossSal,
      grossSalary: grossSal,
      presentAddress: payload.presentAddress !== undefined ? payload.presentAddress : payload.address ?? existing.presentAddress ?? existing.address,
      address: payload.address !== undefined ? payload.address : payload.presentAddress ?? existing.address ?? existing.presentAddress,
      salaryHistory,
      employmentHistory,
      statusHistory,
      advanceRecords: Array.isArray(payload.advanceRecords) ? payload.advanceRecords : existing.advanceRecords || [],
      leaveRecords: Array.isArray(payload.leaveRecords) ? payload.leaveRecords : existing.leaveRecords || [],
      attendanceSummary: Array.isArray(payload.attendanceSummary) ? payload.attendanceSummary : existing.attendanceSummary || [],
      attendanceRecords: Array.isArray(payload.attendanceRecords) ? payload.attendanceRecords : existing.attendanceRecords || [],
      updatedAt: nowIso,
    };

    this.dataSource.staffList![index] = updatedStaff;
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'STAFF',
        `স্টাফ তথ্য হালনাগাদ: ${updatedStaff.name} (${updatedStaff.designationBn}, বেতন: ৳${updatedStaff.grossSalary}, স্ট্যাটাস: ${updatedStaff.status})`
      );
    }

    return updatedStaff;
  }

  async reviseSalary(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const staff = (this.dataSource.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!staff) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ খুঁজে পাওয়া যায়নি।');
    }

    const { newSalary, allowance, housingAllowance, medicalAllowance, transportAllowance, otherAllowance, effectiveDate, reason } = payload;
    const numBase = Number(newSalary);
    if (!Number.isFinite(numBase) || numBase < 0) {
      throw new DalDomainError('INVALID_SALARY', 'সঠিক মূল বেতনের পরিমাণ প্রদান করুন।');
    }

    const houseAllow = housingAllowance !== undefined ? Number(housingAllowance) : staff.housingAllowance || 0;
    const medAllow = medicalAllowance !== undefined ? Number(medicalAllowance) : staff.medicalAllowance || 0;
    const transAllow = transportAllowance !== undefined ? Number(transportAllowance) : staff.transportAllowance || 0;
    const othAllow = otherAllowance !== undefined ? Number(otherAllowance) : staff.otherAllowance || 0;
    const subAllow = houseAllow + medAllow + transAllow + othAllow;
    const totalAllow = allowance !== undefined ? Number(allowance) : subAllow;
    const newGross = numBase + totalAllow;
    const oldGross = staff.grossSalary ?? staff.monthlySalary ?? 0;
    const oldAllow = staff.allowance ?? 0;
    const nowIso = new Date().toISOString();

    const historyEntry = {
      id: `sh-${Date.now()}`,
      previousSalary: oldGross,
      newSalary: newGross,
      previousAllowance: oldAllow,
      newAllowance: totalAllow,
      effectiveDate: effectiveDate || nowIso.split('T')[0],
      reason: reason || 'বার্ষিক বেতন বৃদ্ধি / সংশোধন',
      changedBy: actor.userName,
      changedAt: nowIso,
    };

    if (!Array.isArray(staff.salaryHistory)) staff.salaryHistory = [];
    staff.salaryHistory.unshift(historyEntry);

    staff.basicSalary = numBase;
    staff.allowance = totalAllow;
    staff.housingAllowance = houseAllow;
    staff.medicalAllowance = medAllow;
    staff.transportAllowance = transAllow;
    staff.otherAllowance = othAllow;
    staff.monthlySalary = newGross;
    staff.grossSalary = newGross;
    staff.updatedAt = nowIso;

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'SALARY_REVISION',
        'STAFF',
        `বেতন সংশোধন: ${staff.name} (পূর্ববর্তী: ৳${oldGross} -> নতুন: ৳${newGross}, কারণ: ${historyEntry.reason})`
      );
    }

    return { staff, historyEntry };
  }

  async disburseAdvance(
    options: DALOptions,
    id: string,
    payload: Record<string, any>
  ): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const { amount, date, monthlyDeductionPlan, paymentMethod, accountId, reason, notes } = payload;
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'সঠিক অগ্রিম টাকার পরিমাণ প্রদান করুন।');
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const staff = (tx.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
      if (!staff) {
        throw new DalDomainError('NOT_FOUND', 'স্টাফ খুঁজে পাওয়া যায়নি।');
      }

      const account = (tx.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId);
      if (!account) {
        throw new DalDomainError('INVALID_ACCOUNT', 'সংশ্লিষ্ট তহবিল অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।');
      }

      const pMethod = paymentMethod || 'CASH';
      if (pMethod === 'BANK' && account.accountType === 'CASH') {
        throw new DalDomainError('ACCOUNT_TYPE_MISMATCH', 'ব্যাংক লেনদেনের জন্য ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।');
      }
      if (pMethod === 'CASH' && account.accountType === 'BANK') {
        throw new DalDomainError('ACCOUNT_TYPE_MISMATCH', 'নগদ লেনদেনের জন্য ক্যাশ অ্যাকাউন্ট নির্বাচন করুন।');
      }
      if (account.currentBalance < numAmount) {
        throw new DalDomainError('INSUFFICIENT_BALANCE', `তহবিলে পর্যাপ্ত ব্যালেন্স নেই (${account.nameBn}: ৳${account.currentBalance})।`);
      }

      account.currentBalance -= numAmount;

      const currentYear = new Date().getFullYear();
      const mosqueExpenseCount = (tx.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length;
      const voucherNo = `EXP-ADV-${currentYear}-${String(mosqueExpenseCount + 1).padStart(5, '0')}`;
      const expId = `exp-adv-${Date.now()}`;
      const advDate = date || new Date().toISOString().split('T')[0];

      const advanceRec = {
        id: `adv-${Date.now()}`,
        amount: numAmount,
        date: advDate,
        reason: reason || 'বেতন অগ্রিম গ্রহণ',
        monthlyDeductionPlan: Number(monthlyDeductionPlan) || 0,
        adjustedAmount: 0,
        outstandingAmount: numAmount,
        status: 'ACTIVE',
        paymentMethod: pMethod,
        accountId: account.id,
        expenseEntryId: expId,
        expenseVoucherNumber: voucherNo,
        approvedBy: actor.userName,
        notes: notes || '',
      };

      if (!Array.isArray(staff.advanceRecords)) staff.advanceRecords = [];
      staff.advanceRecords.unshift(advanceRec);
      staff.updatedAt = new Date().toISOString();

      const head201 = (tx.accountHeads || []).find(
        (h: any) => h.mosqueId === mosqueId && (h.code === '201' || h.id.endsWith('head-201'))
      );

      const expEntry: any = {
        id: expId,
        mosqueId,
        voucherNumber: voucherNo,
        date: advDate,
        mainHeadId: head201 ? head201.id : `${mosqueId}-head-201`,
        amount: numAmount,
        paymentMethod: pMethod,
        accountId: account.id,
        paidTo: `${staff.name} (${staff.designationBn})`,
        payeeType: 'STAFF',
        staffId: staff.id,
        reference: `Staff-Adv: ${advanceRec.id}`,
        description: `${staff.name} (${staff.designationBn}) - বেতন অগ্রিম প্রদান। কারণ: ${advanceRec.reason}`,
        approvedBy: actor.userName,
        status: 'APPROVED',
        sourceModule: 'STAFF_PAYROLL',
        sourceId: advanceRec.id,
        sourceType: 'ADVANCE',
        createdBy: actor.userName,
        createdAt: new Date().toISOString(),
      };
      if (!tx.expenseEntries) tx.expenseEntries = [];
      tx.expenseEntries.unshift(expEntry);

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'STAFF_ADVANCE',
        'STAFF',
        `স্টাফ বেতন অগ্রিম প্রদান: ${staff.name} - ৳${numAmount} (ভাউচার: ${voucherNo})`
      );

      return { staff, advance: advanceRec, advanceRecord: advanceRec, expense: expEntry, expenseEntry: expEntry };
    });
  }

  async recordLeave(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const staff = (this.dataSource.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!staff) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ খুঁজে পাওয়া যায়নি।');
    }

    const { leaveType, startDate, endDate, days, reason, status, isSalaryDeductible, deductionAmount, substituteArrangement, notes } = payload;
    if (!startDate || !endDate) {
      throw new DalDomainError('VALIDATION_ERROR', 'ছুটির শুরুর ও শেষের তারিখ আবশ্যক।');
    }

    const calcDays =
      Number(days) ||
      Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leaveRec = {
      id: `lv-${Date.now()}`,
      leaveType: leaveType || 'CASUAL',
      startDate,
      endDate,
      days: calcDays,
      reason: reason || '',
      status: status || 'APPROVED',
      isSalaryDeductible: Boolean(isSalaryDeductible),
      deductionAmount: isSalaryDeductible ? Number(deductionAmount) || 0 : 0,
      substituteArrangement: substituteArrangement || '',
      approvedBy: actor.userName,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(staff.leaveRecords)) staff.leaveRecords = [];
    staff.leaveRecords.unshift(leaveRec);

    const todayStr = new Date().toISOString().split('T')[0];
    if (leaveRec.status === 'APPROVED' && startDate <= todayStr && endDate >= todayStr && staff.status === 'ACTIVE') {
      staff.status = 'ON_LEAVE';
    }
    staff.updatedAt = new Date().toISOString();

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'STAFF_LEAVE',
        'STAFF',
        `স্টাফ ছুটি রেকর্ড: ${staff.name} (${calcDays} দিন: ${startDate} থেকে ${endDate})`
      );
    }

    return { staff, leave: leaveRec, leaveRecord: leaveRec };
  }

  async updateLeave(
    options: DALOptions,
    id: string,
    leaveId: string,
    payload: Record<string, any>
  ): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const staff = (this.dataSource.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!staff) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ খুঁজে পাওয়া যায়নি।');
    }

    const leaveRec = (staff.leaveRecords || []).find((l: any) => l.id === leaveId);
    if (!leaveRec) {
      throw new DalDomainError('NOT_FOUND', 'ছুটির রেকর্ড খুঁজে পাওয়া যায়নি।');
    }

    const { status, isSalaryDeductible, deductionAmount, substituteArrangement, notes } = payload;
    if (status) leaveRec.status = status;
    if (isSalaryDeductible !== undefined) leaveRec.isSalaryDeductible = Boolean(isSalaryDeductible);
    if (deductionAmount !== undefined) leaveRec.deductionAmount = Number(deductionAmount) || 0;
    if (substituteArrangement !== undefined) leaveRec.substituteArrangement = substituteArrangement;
    if (notes !== undefined) leaveRec.notes = notes;
    leaveRec.approvedBy = actor.userName;

    const todayStr = new Date().toISOString().split('T')[0];
    const hasOngoingApprovedLeave = (staff.leaveRecords || []).some(
      (l: any) => l.status === 'APPROVED' && l.startDate <= todayStr && l.endDate >= todayStr
    );
    if (hasOngoingApprovedLeave && staff.status === 'ACTIVE') {
      staff.status = 'ON_LEAVE';
    } else if (!hasOngoingApprovedLeave && staff.status === 'ON_LEAVE') {
      staff.status = 'ACTIVE';
    }
    staff.updatedAt = new Date().toISOString();

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'STAFF_LEAVE_UPDATE',
        'STAFF',
        `স্টাফ ছুটির স্ট্যাটাস হালনাগাদ: ${staff.name} (${leaveRec.startDate} - স্ট্যাটাস: ${leaveRec.status})`
      );
    }

    return { staff, leave: leaveRec, leaveRecord: leaveRec };
  }

  async logBulkAttendance(
    options: DALOptions,
    payload: Record<string, any>
  ): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const { date, entries } = payload;
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      throw new DalDomainError('VALIDATION_ERROR', 'তারিখ এবং হাজিরা তালিকা আবশ্যক।');
    }

    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const entry of entries) {
      const staff = (this.dataSource.staffList || []).find((s: any) => s.id === entry.staffId && s.mosqueId === mosqueId);
      if (!staff) continue;

      if (!Array.isArray(staff.attendanceRecords)) staff.attendanceRecords = [];
      const existingIdx = staff.attendanceRecords.findIndex((a: any) => a.date === date);

      const record = {
        id: existingIdx >= 0 ? staff.attendanceRecords[existingIdx].id : `att-day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        status: entry.status || 'PRESENT',
        inTime: entry.inTime || '',
        outTime: entry.outTime || '',
        substituteName: entry.substituteName || '',
        remarks: entry.remarks || '',
        recordedBy: actor.userName,
        updatedAt: nowIso,
      };

      if (existingIdx >= 0) {
        staff.attendanceRecords[existingIdx] = record;
      } else {
        staff.attendanceRecords.unshift(record);
      }

      const monthPrefix = date.slice(0, 7);
      const monthLogs = staff.attendanceRecords.filter((a: any) => a.date && a.date.startsWith(monthPrefix));
      const presentDays = monthLogs.filter((a: any) => a.status === 'PRESENT').length;
      const absentDays = monthLogs.filter((a: any) => a.status === 'ABSENT').length;
      const leaveDays = monthLogs.filter((a: any) => a.status === 'LEAVE').length;
      const lateDays = monthLogs.filter((a: any) => a.status === 'LATE').length;
      const halfDays = monthLogs.filter((a: any) => a.status === 'HALF_DAY').length;

      if (!Array.isArray(staff.attendanceSummary)) staff.attendanceSummary = [];
      const sumIdx = staff.attendanceSummary.findIndex((s: any) => s.month === monthPrefix);
      const sumEntry = {
        id: sumIdx >= 0 ? staff.attendanceSummary[sumIdx].id : `att-sum-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        month: monthPrefix,
        workingDays: 30,
        presentDays,
        absentDays,
        leaveDays,
        lateDays,
        halfDays,
        updatedAt: nowIso,
      };
      if (sumIdx >= 0) {
        staff.attendanceSummary[sumIdx] = sumEntry;
      } else {
        staff.attendanceSummary.unshift(sumEntry);
      }

      staff.updatedAt = nowIso;
      updatedCount++;
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'BULK_ATTENDANCE',
        'STAFF',
        `দৈনিক হাজিরা সংরক্ষণ (${date}): মোট ${updatedCount} জন স্টাফ`
      );
    }

    return { updatedCount, date };
  }

  async finalSettlement(
    options: DALOptions,
    id: string,
    payload: Record<string, any>
  ): Promise<{ finalSettlementRecord: any; updatedStaff: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const staff = (this.dataSource.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!staff) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ পাওয়া যায়নি।');
    }

    const {
      settlementDate,
      resignationOrTerminationDate,
      lastMonthlySalary,
      dueSalaryAmount = 0,
      unadjustedAdvanceAmount = 0,
      gratuityOrHonorarium = 0,
      otherAllowances = 0,
      totalDeduction = 0,
      netSettlementAmount,
      paymentMethod = 'BANK',
      accountId,
      notes,
      settleAndEndEmployment = true,
    } = payload;

    const currentYear = new Date().getFullYear();
    const setDate = settlementDate || new Date().toISOString().split('T')[0];
    const lastDate = resignationOrTerminationDate || setDate;
    const netAmount = Number(netSettlementAmount) || 0;

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const txStaff = (tx.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
      if (!txStaff) {
        throw new DalDomainError('NOT_FOUND', 'স্টাফ পাওয়া যায়নি।');
      }

      const account =
        (tx.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId) ||
        (tx.accounts || []).find(
          (a: any) => a.mosqueId === mosqueId && a.accountType === (paymentMethod === 'BANK' ? 'BANK' : 'CASH')
        ) ||
        (tx.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
        (tx.accounts || [])[0];

      const activeTerm = (tx.committeeTerms || []).find((t: any) => t.mosqueId === mosqueId && t.status === 'ACTIVE');

      let expVoucher = '';
      if (netAmount > 0 && account) {
        account.currentBalance -= netAmount;
        expVoucher = `EXP-SETTLE-${currentYear}-${String(
          (tx.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1
        ).padStart(5, '0')}`;
        const expEntryId = `exp-settle-${Date.now()}`;

        tx.expenseEntries.unshift({
          id: expEntryId,
          mosqueId,
          termId: activeTerm ? activeTerm.id : undefined,
          voucherNumber: expVoucher,
          date: setDate,
          mainHeadId: 'head-exp-01',
          mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
          subHeadId: 'head-exp-01-settle',
          subHeadNameBn: `স্টাফ চূড়ান্ত নিষ্পত্তি ও বিদায়ী সম্মাননা (${txStaff.name})`,
          amount: netAmount,
          paymentMethod: paymentMethod as any,
          accountId: account.id,
          accountName: account.nameBn,
          payeeName: txStaff.name,
          payeePhone: txStaff.phone,
          reference: `Final Settlement - ${txStaff.staffCode || txStaff.name}`,
          description: `${txStaff.name} (${txStaff.designationBn}) এর চাকুরির চূড়ান্ত নিষ্পত্তি ও পাওনা পরিশোধ: ৳${netAmount} [ভাউচার: ${expVoucher}]`,
          createdBy: actor.userId,
          createdByName: actor.userName,
          approvedBy: actor.userId,
          approvedByName: actor.userName,
          approvedAt: new Date().toISOString(),
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }

      const settlementRec = {
        id: `settle-${Date.now()}`,
        mosqueId,
        staffId: txStaff.id,
        staffName: txStaff.name,
        settlementDate: setDate,
        resignationOrTerminationDate: lastDate,
        lastMonthlySalary: Number(lastMonthlySalary) || txStaff.monthlySalary,
        dueSalaryAmount: Number(dueSalaryAmount) || 0,
        unadjustedAdvanceAmount: Number(unadjustedAdvanceAmount) || 0,
        gratuityOrHonorarium: Number(gratuityOrHonorarium) || 0,
        otherAllowances: Number(otherAllowances) || 0,
        totalDeduction: Number(totalDeduction) || 0,
        netSettlementAmount: netAmount,
        paymentMethod: paymentMethod as any,
        accountId: account?.id,
        accountNameBn: account?.nameBn,
        expenseVoucherNumber: expVoucher || undefined,
        notes,
        status: 'SETTLED',
        settledBy: actor.userId,
        settledByName: actor.userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      txStaff.finalSettlement = settlementRec;
      if (settleAndEndEmployment) {
        txStaff.status = 'EMPLOYMENT_ENDED';
        txStaff.resignationDate = lastDate;
      }

      if (txStaff.advanceRecords) {
        txStaff.advanceRecords.forEach((a: any) => {
          if (a.status === 'ACTIVE') {
            a.status = 'FULLY_ADJUSTED';
            a.adjustedAmount = a.amount;
            a.outstandingAmount = 0;
          }
        });
      }

      if (!txStaff.employmentHistory) txStaff.employmentHistory = [];
      txStaff.employmentHistory.unshift({
        id: `eh-${Date.now()}`,
        date: setDate,
        eventType: 'SETTLEMENT',
        eventTitle: 'চাকুরির চূড়ান্ত হিসাব নিষ্পত্তি',
        description: `চাকুরির সমাপ্তি ও চূড়ান্ত পাওনা নিষ্পত্তি: ৳${netAmount} পরিশোধিত (ভাউচার: ${expVoucher || 'N/A'})`,
        performedBy: actor.userId,
        performedByName: actor.userName,
        createdAt: new Date().toISOString(),
      });

      txStaff.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'STAFF_SETTLEMENT',
        `${txStaff.name} এর চূড়ান্ত নিষ্পত্তি সম্পন্ন: মোট পরিশোধ ৳${netAmount}`
      );

      return { finalSettlementRecord: settlementRec, updatedStaff: txStaff };
    });
  }

  async disburseFestivalAllowance(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const {
      festivalName,
      paymentType = 'FESTIVAL_ALLOWANCE',
      month,
      paymentDate,
      paymentMethod = 'BANK',
      accountId,
      staffAllocations,
      notes,
      _idempotencyKey,
    } = payload;

    if (!festivalName) {
      throw new DalDomainError('VALIDATION_ERROR', 'উৎসবের নাম প্রদান করুন।');
    }
    if (!Array.isArray(staffAllocations) || staffAllocations.length === 0) {
      throw new DalDomainError('VALIDATION_ERROR', 'অন্তত একজন স্টাফ নির্বাচন করুন।');
    }

    const currentYear = new Date().getFullYear();
    const payDate = paymentDate || new Date().toISOString().split('T')[0];
    const payMonth = month || `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const account =
        (tx.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId) ||
        (tx.accounts || []).find((a: any) => a.mosqueId === mosqueId && a.accountType === 'BANK') ||
        (tx.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
        (tx.accounts || [])[0];

      const activeTerm = (tx.committeeTerms || []).find((t: any) => t.mosqueId === mosqueId && t.status === 'ACTIVE');

      let batchTotal = 0;
      const payments: any[] = [];

      for (const item of staffAllocations) {
        const staff = (tx.staffList || []).find((s: any) => s.id === item.staffId && s.mosqueId === mosqueId);
        if (!staff) continue;

        const amount = Number(item.amount) || 0;
        if (amount <= 0) continue;

        batchTotal += amount;
        const expVoucher = `EXP-${currentYear}-${String(
          (tx.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1
        ).padStart(6, '0')}`;
        const expEntryId = `exp-fest-${Date.now()}-${staff.id.slice(-4)}`;

        const payment = {
          id: `pay-${Date.now()}-${staff.id.slice(-4)}`,
          mosqueId,
          staffId: staff.id,
          staffName: staff.name,
          designationBn: staff.designationBn,
          month: payMonth,
          paymentDate: payDate,
          paymentType: paymentType as any,
          festivalName,
          basicSalary: 0,
          bonus: amount,
          otherAllowance: 0,
          allowance: amount,
          deduction: 0,
          totalPayable: amount,
          netPaid: amount,
          paymentMethod: paymentMethod || 'BANK',
          accountId: account.id,
          accountNameBn: account.nameBn,
          expenseVoucherNumber: expVoucher,
          expenseEntryId: expEntryId,
          notes: `${festivalName}: ${item.notes || notes || ''}`.trim(),
          status: 'PAID',
          termId: activeTerm ? activeTerm.id : undefined,
          createdAt: new Date().toISOString(),
        };

        tx.staffPayments.unshift(payment);
        payments.push(payment);

        tx.expenseEntries.unshift({
          id: expEntryId,
          mosqueId,
          termId: activeTerm ? activeTerm.id : undefined,
          voucherNumber: expVoucher,
          date: payDate,
          mainHeadId: 'head-exp-01',
          mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
          subHeadId: staff.designation === 'IMAM' || staff.designation === 'KHATIB' ? 'head-exp-01-1' : 'head-exp-01-2',
          subHeadNameBn: `${festivalName} ভাতা (${staff.name})`,
          amount,
          paymentMethod: payment.paymentMethod,
          accountId: account.id,
          accountName: account.nameBn,
          payeeName: staff.name,
          payeePhone: staff.phone,
          reference: `${festivalName} - ${payMonth}`,
          description: `${staff.name} (${staff.designationBn}) কে ${festivalName} বাবদ উৎসব ভাতা প্রদান [ভাউচার: ${expVoucher}]`,
          createdBy: actor.userId,
          createdByName: actor.userName,
          approvedBy: actor.userId,
          approvedByName: actor.userName,
          approvedAt: new Date().toISOString(),
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }

      if (account) {
        account.currentBalance -= batchTotal;
      }

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'STAFF_PAYMENT',
        `${festivalName} উৎসব ভাতা বিতরণ: ${payments.length} জন স্টাফকে সর্বমোট ৳${batchTotal} প্রদান`
      );

      const resPayload = {
        success: true,
        data: { payments, totalAmount: batchTotal, count: payments.length },
        message: `${festivalName} বাবদ ${payments.length} জন স্টাফের উৎসব ভাতা সফলভাবে একাউন্ট ও ভাউচারে যুক্ত হয়েছে।`,
      };

      const idempKey = _idempotencyKey || activeOptions?.idempotencyKey;
      if (idempKey && typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(idempKey, resPayload);
      }

      return { createdPayments: payments, batchTotalAmount: batchTotal, resPayload };
    });
  }

  async deleteOrArchiveStaff(
    options: DALOptions,
    id: string
  ): Promise<{ success: boolean; archived?: boolean; data?: any; deletedId?: string; message: string }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const staff = (this.dataSource.staffList || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!staff) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ পাওয়া যায়নি।');
    }

    const hasPayments = (this.dataSource.staffPayments || []).some(
      (p: any) => p.staffId === staff.id && p.mosqueId === mosqueId
    );
    if (hasPayments) {
      staff.status = 'INACTIVE';
      staff.updatedAt = new Date().toISOString();
      if (typeof this.dataSource.save === 'function') this.dataSource.save();
      if (typeof this.dataSource.logAudit === 'function') {
        this.dataSource.logAudit(
          mosqueId,
          actor.userId,
          actor.userName,
          actor.userRole,
          'UPDATE',
          'STAFF',
          `স্টাফ নিষ্ক্রিয় করা হয়েছে (পূর্ববর্তী পেমেন্ট ইতিহাস সংরক্ষিত): ${staff.name}`
        );
      }
      return {
        success: true,
        data: staff,
        archived: true,
        message: 'স্টাফের পূর্ববর্তী বেতন প্রদানের ইতিহাস থাকায় তাঁকে নিষ্ক্রিয় (Inactive) হিসেবে সংরক্ষণ করা হয়েছে।',
      };
    }

    const idx = (this.dataSource.staffList || []).findIndex((s: any) => s.id === id && s.mosqueId === mosqueId);
    const removed = this.dataSource.staffList!.splice(idx, 1)[0];
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'STAFF',
        `স্টাফ অপসারণ: ${removed.name}`
      );
    }

    return {
      success: true,
      archived: false,
      deletedId: removed.id,
      message: 'স্টাফ সফলভাবে অপসারণ করা হয়েছে।',
    };
  }

  async paySalary(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const {
      staffId,
      month,
      year,
      paymentDate,
      paymentType,
      festivalName,
      basicSalary,
      bonus,
      otherAllowance,
      allowance,
      deduction,
      advanceDeduction,
      netPaid,
      paymentMethod,
      accountId,
      staffSignatureUrl,
      receivedByConfirmation,
      notes,
      _idempotencyKey,
    } = payload;

    const staff = (this.dataSource.staffList || []).find((s: any) => s.id === staffId && s.mosqueId === mosqueId);
    if (!staff) {
      throw new DalDomainError('NOT_FOUND', 'স্টাফ পাওয়া যায়নি।');
    }

    const numBasic = Number(basicSalary) >= 0 ? Number(basicSalary) : staff.monthlySalary;
    const numBonus = Number(bonus) || 0;
    const numOther = Number(otherAllowance) || (Number(allowance) > numBonus ? Number(allowance) - numBonus : 0);
    const numAdvDeduction = Number(advanceDeduction) || Number(payload.advanceAdjustment) || 0;
    const numDeduction = (Number(deduction) || 0) + numAdvDeduction;
    const totalPayable = numBasic + numBonus + numOther;
    const totalAmount = Number(netPaid) > 0 ? Number(netPaid) : totalPayable - numDeduction;

    const currentYear = Number(year) || new Date().getFullYear();
    const monthName = month || `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const payDate = paymentDate || new Date().toISOString().split('T')[0];
    const effectivePaymentType = paymentType || 'REGULAR_SALARY';

    if (effectivePaymentType === 'REGULAR_SALARY') {
      const existingPayment = (this.dataSource.staffPayments || []).find(
        (p: any) =>
          p.mosqueId === mosqueId &&
          p.staffId === staff.id &&
          (p.month === monthName || p.paymentMonth === monthName) &&
          (p.paymentType === 'REGULAR_SALARY' || !p.paymentType) &&
          p.status === 'PAID'
      );
      if (existingPayment) {
        throw new DalDomainError(
          'DUPLICATE_SALARY',
          `${staff.name} (${staff.designationBn}) এর ${monthName} মাসের নিয়মিত বেতন ইতিমধ্যে পরিশোধ করা হয়েছে (ভাউচার: ${existingPayment.expenseVoucherNumber || existingPayment.id})।`
        );
      }
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const txStaff = (tx.staffList || []).find((s: any) => s.id === staffId && s.mosqueId === mosqueId);
      if (!txStaff) {
        throw new DalDomainError('NOT_FOUND', 'স্টাফ পাওয়া যায়নি।');
      }

      const account =
        (tx.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId) ||
        (tx.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
        (tx.accounts || [])[0];

      const activeTerm = (tx.committeeTerms || []).find((t: any) => t.mosqueId === mosqueId && t.status === 'ACTIVE');

      account.currentBalance -= totalAmount;

      const expVoucher = `EXP-${currentYear}-${String(
        (tx.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1
      ).padStart(6, '0')}`;
      const expEntryId = `exp-pay-${Date.now()}`;

      const paymentRecord: any = {
        id: `pay-${Date.now()}`,
        mosqueId,
        staffId: txStaff.id,
        staffName: txStaff.name,
        designationBn: txStaff.designationBn,
        month: monthName,
        paymentDate: payDate,
        paymentType: paymentType || 'REGULAR_SALARY',
        festivalName: festivalName || undefined,
        basicSalary: numBasic,
        bonus: numBonus,
        otherAllowance: numOther,
        allowance: numBonus + numOther,
        deduction: numDeduction,
        advanceDeduction: numAdvDeduction,
        totalPayable,
        netPaid: totalAmount,
        paymentMethod: paymentMethod || 'CASH',
        accountId: account.id,
        accountNameBn: account.nameBn,
        expenseVoucherNumber: expVoucher,
        expenseEntryId: expEntryId,
        notes,
        staffSignatureUrl: staffSignatureUrl || txStaff.signatureUrl || undefined,
        receivedByConfirmation: receivedByConfirmation !== undefined ? Boolean(receivedByConfirmation) : true,
        status: 'PAID',
        termId: activeTerm ? activeTerm.id : undefined,
        createdAt: new Date().toISOString(),
      };

      tx.staffPayments.unshift(paymentRecord);

      if (numAdvDeduction > 0 && txStaff.advanceRecords) {
        let remainingToAdjust = numAdvDeduction;
        for (const adv of txStaff.advanceRecords) {
          if (adv.status === 'ACTIVE' && remainingToAdjust > 0) {
            const canAdjust = Math.min(remainingToAdjust, adv.outstandingAmount);
            adv.adjustedAmount = (adv.adjustedAmount || 0) + canAdjust;
            adv.outstandingAmount -= canAdjust;
            if (!adv.adjustmentHistory) adv.adjustmentHistory = [];
            adv.adjustmentHistory.push({
              paymentId: paymentRecord.id,
              month: monthName,
              amount: canAdjust,
              date: payDate,
            });
            if (adv.outstandingAmount <= 0) {
              adv.status = 'FULLY_ADJUSTED';
            } else {
              adv.status = 'ACTIVE';
            }
            remainingToAdjust -= canAdjust;
          }
        }
      }

      tx.expenseEntries.unshift({
        id: expEntryId,
        mosqueId,
        termId: activeTerm ? activeTerm.id : undefined,
        voucherNumber: expVoucher,
        date: payDate,
        mainHeadId: 'head-exp-01',
        mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
        subHeadId:
          txStaff.designation === 'IMAM' || txStaff.designation === 'KHATIB' ? 'head-exp-01-1' : 'head-exp-01-2',
        subHeadNameBn: `${txStaff.designationBn} বেতন ও হাদিয়া (${txStaff.name} - ${monthName})`,
        amount: totalAmount,
        paymentMethod: paymentRecord.paymentMethod,
        accountId: account.id,
        accountName: account.nameBn,
        payeeName: txStaff.name,
        payeePhone: txStaff.phone,
        reference: `${paymentType === 'FESTIVAL_ALLOWANCE' ? festivalName || 'উৎসব ভাতা' : 'Salary Month'}: ${monthName}`,
        description: `${txStaff.name} (${txStaff.designationBn}) এর ${monthName} মাসের ${
          paymentType === 'FESTIVAL_ALLOWANCE' ? `${festivalName || 'উৎসব ভাতা'}` : 'বেতন/হাদিয়া'
        } পরিশোধ ${numBonus > 0 ? `(বোনাস: ৳${numBonus})` : ''} ${notes ? `[${notes}]` : ''}`.trim(),
        createdBy: actor.userId,
        createdByName: actor.userName,
        approvedBy: actor.userId,
        approvedByName: actor.userName,
        approvedAt: new Date().toISOString(),
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'STAFF_PAYMENT',
        `${txStaff.name} এর ${monthName} মাসের বেতন পরিশোধ (${expVoucher}): মূল ৳${numBasic}${
          numBonus > 0 ? ` + বোনাস ৳${numBonus}` : ''
        } = মোট ৳${totalAmount}`
      );

      const idempKey = _idempotencyKey || activeOptions?.idempotencyKey;
      if (idempKey && typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(idempKey, {
          success: true,
          data: paymentRecord,
          message: 'বেতন ও বোনাস সফলভাবে পরিশোধ ও হিসাবভুক্ত করা হয়েছে।',
        });
      }

      return paymentRecord;
    });
  }

  async updatePayment(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const payment = (this.dataSource.staffPayments || []).find((p: any) => p.id === id && p.mosqueId === mosqueId);
    if (!payment) {
      throw new DalDomainError('NOT_FOUND', 'পেমেন্ট রেকর্ড পাওয়া যায়নি।');
    }

    const { notes, basicSalary, bonus, otherAllowance, deduction, netPaid, paymentMethod, accountId, paymentDate } =
      payload;
    const expEntry = (this.dataSource.expenseEntries || []).find(
      (e: any) => e.voucherNumber === payment.expenseVoucherNumber || e.id === payment.expenseEntryId
    );

    const oldAmount = payment.netPaid;
    const oldAccountId = payment.accountId;

    if (basicSalary !== undefined) payment.basicSalary = Number(basicSalary);
    if (bonus !== undefined) payment.bonus = Number(bonus);
    if (otherAllowance !== undefined) payment.otherAllowance = Number(otherAllowance);
    if (payment.bonus !== undefined || payment.otherAllowance !== undefined) {
      payment.allowance = (payment.bonus || 0) + (payment.otherAllowance || 0);
    }
    if (deduction !== undefined) payment.deduction = Number(deduction);

    if (payment.basicSalary !== undefined) {
      payment.totalPayable = (payment.basicSalary || 0) + (payment.bonus || 0) + (payment.otherAllowance || 0);
    }

    const newAmount =
      netPaid !== undefined
        ? Number(netPaid)
        : payment.totalPayable
        ? payment.totalPayable - (payment.deduction || 0)
        : payment.netPaid;
    const newAccountId = accountId || payment.accountId;

    if (newAmount !== oldAmount || newAccountId !== oldAccountId) {
      const oldAcc = (this.dataSource.accounts || []).find((a: any) => a.id === oldAccountId);
      const newAcc = (this.dataSource.accounts || []).find((a: any) => a.id === newAccountId);

      if (oldAcc) oldAcc.currentBalance += oldAmount;
      if (newAcc) newAcc.currentBalance -= newAmount;

      payment.netPaid = newAmount;
      payment.accountId = newAccountId;
      if (newAcc) payment.accountNameBn = newAcc.nameBn;

      if (expEntry) {
        expEntry.amount = newAmount;
        expEntry.accountId = newAccountId;
        if (newAcc) expEntry.accountName = newAcc.nameBn;
        (expEntry as any).updatedAt = new Date().toISOString();
      }
    }

    if (paymentMethod) {
      payment.paymentMethod = paymentMethod;
      if (expEntry) expEntry.paymentMethod = paymentMethod;
    }

    if (paymentDate) {
      payment.paymentDate = paymentDate;
      if (expEntry) expEntry.date = paymentDate;
    }

    if (notes !== undefined) {
      payment.notes = notes;
      if (expEntry) {
        expEntry.description = `${payment.staffName} (${payment.designationBn}) এর ${payment.month} মাসের বেতন পরিশোধ [সংশোধিত] ${
          notes ? `(${notes})` : ''
        }`.trim();
      }
    }

    payment.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'STAFF_PAYMENT',
        `${payment.staffName} এর বেতন রেকর্ড সংশোধন (${payment.expenseVoucherNumber}): ৳${newAmount}`
      );
    }

    return payment;
  }

  async cancelPayment(options: DALOptions, id: string, reason?: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const paymentCheck = (this.dataSource.staffPayments || []).find(
      (p: any) => p.id === id && p.mosqueId === mosqueId
    );
    if (!paymentCheck) {
      throw new DalDomainError('NOT_FOUND', 'পেমেন্ট রেকর্ড পাওয়া যায়নি।');
    }
    if (paymentCheck.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'এই পেমেন্টটি ইতিমধ্যে বাতিল করা হয়েছে।');
    }

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const payment = (tx.staffPayments || []).find((p: any) => p.id === id && p.mosqueId === mosqueId);
      if (!payment) {
        throw new DalDomainError('NOT_FOUND', 'পেমেন্ট রেকর্ড পাওয়া যায়নি।');
      }

      const account = (tx.accounts || []).find((a: any) => a.id === payment.accountId);
      if (account) {
        account.currentBalance += payment.netPaid;
      }

      payment.status = 'CANCELLED';
      payment.notes = `${payment.notes ? payment.notes + ' | ' : ''}[বাতিলকৃত: ${reason || 'প্রশাসনিক সিদ্ধান্ত'}]`;
      payment.updatedAt = new Date().toISOString();

      const expEntry = (tx.expenseEntries || []).find(
        (e: any) => e.voucherNumber === payment.expenseVoucherNumber || e.id === payment.expenseEntryId
      );
      if (expEntry) {
        expEntry.status = 'REJECTED';
        expEntry.description = `[বাতিলকৃত ভাউচার] ${expEntry.description} (কারণ: ${reason || 'প্রশাসনিক সিদ্ধান্ত'})`;
        (expEntry as any).updatedAt = new Date().toISOString();
      }

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'STAFF_PAYMENT',
        `${payment.staffName} এর ${payment.month} মাসের বেতন বাতিল ও ব্যালেন্স সমন্বয় (${payment.expenseVoucherNumber}): ৳${payment.netPaid}`
      );

      return payment;
    });
  }

  async addPaymentDocument(
    options: DALOptions,
    paymentId: string,
    payload: Record<string, any>
  ): Promise<{ doc: any; payment: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const payment = (this.dataSource.staffPayments || []).find((p: any) => p.id === paymentId && p.mosqueId === mosqueId);
    if (!payment) {
      throw new DalDomainError('NOT_FOUND', 'পেমেন্ট রেকর্ড পাওয়া যায়নি।');
    }

    const { name, type, url, googleDriveLink, isPrivate, notes } = payload;
    if (!name || (!url && !googleDriveLink)) {
      throw new DalDomainError(
        'VALIDATION_ERROR',
        'ডকুমেন্টের নাম এবং ফাইল অথবা গুগল ড্রাইভ লিংক আবশ্যক।'
      );
    }

    const doc = {
      id: `pdoc-${Date.now()}`,
      name,
      type: type || 'TRANSFER_RECEIPT',
      url: url || googleDriveLink || '',
      googleDriveLink,
      uploadDate: new Date().toISOString(),
      uploadedBy: actor.userId,
      uploadedByName: actor.userName,
      isPrivate: isPrivate !== false,
      notes,
    };

    if (!payment.documents) payment.documents = [];
    payment.documents.push(doc);
    payment.updatedAt = new Date().toISOString();

    if (this.dataSource.centralDocuments) {
      this.dataSource.centralDocuments.unshift({
        id: `cdoc-${Date.now()}`,
        mosqueId,
        entityType: 'STAFF' as any,
        entityId: payment.id,
        entityTitle: `${payment.staffName} (${payment.designationBn})`,
        name: `${payment.staffName} এর পেমেন্ট ডকুমেন্ট: ${name}`,
        documentType: 'BANK_STATEMENT' as any,
        documentTypeBn: 'পেমেন্ট রসিদ / ব্যাংক নথি',
        fileUrl: url || googleDriveLink || '',
        googleDriveUrl: googleDriveLink,
        visibility: isPrivate !== false ? 'PRIVATE' : 'PUBLIC',
        uploadedBy: actor.userId,
        uploadedByName: actor.userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'STAFF',
        `পেমেন্ট ডকুমেন্ট যুক্ত: ${payment.staffName} (${name})`
      );
    }

    return { doc, payment };
  }

  async listPaymentBatches(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.paymentBatches || [])
      .filter((b: any) => b.mosqueId === mosqueId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findPaymentBatchById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.paymentBatches || []).find((b: any) => b.id === id && b.mosqueId === mosqueId) || null;
  }

  async createPaymentBatch(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const {
      title,
      paymentMonth,
      paymentYear,
      paymentDate,
      paymentType = 'SALARY',
      festivalName,
      disbursementMethod = 'BANK',
      accountId,
      items = [],
      reference,
      notes,
      googleDriveLink,
      documents = [],
    } = payload;

    if (!items || items.length === 0) {
      throw new DalDomainError('VALIDATION_ERROR', 'কমপক্ষে একজন স্টাফ ব্যাচে অন্তর্ভুক্ত করতে হবে।');
    }

    const staffIds = items.map((i: any) => i.staffId);
    const uniqueStaffIds = new Set(staffIds);
    if (uniqueStaffIds.size !== staffIds.length) {
      throw new DalDomainError('DUPLICATE_STAFF', 'একই স্টাফ ব্যাচে একাধিকবার অন্তর্ভুক্ত হতে পারে না।');
    }

    const activeTerm = (this.dataSource.committeeTerms || []).find(
      (t: any) => t.mosqueId === mosqueId && t.status === 'ACTIVE'
    );
    const account = accountId
      ? (this.dataSource.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId)
      : undefined;

    const currentYear = Number(paymentYear) || new Date().getFullYear();
    const existingBatches = (this.dataSource.paymentBatches || []).filter((b: any) => b.mosqueId === mosqueId);
    const nextSerial = existingBatches.length + 1;
    const batchNumber = `BATCH-${currentYear}-${String(nextSerial).padStart(4, '0')}`;

    let totalBasic = 0;
    let totalAllow = 0;
    let totalDeduct = 0;
    let totalAdv = 0;
    let totalNet = 0;

    const batchItems = items.map((item: any, idx: number) => {
      const staff = (this.dataSource.staffList || []).find(
        (s: any) => s.id === item.staffId && s.mosqueId === mosqueId
      );
      const basic = Number(item.basicSalary) >= 0 ? Number(item.basicSalary) : staff?.monthlySalary || 0;
      const bonus = Number(item.bonus) || 0;
      const allow = Number(item.allowance) || (Number(item.otherAllowance) || 0) + bonus;
      const otherAllow = Number(item.otherAllowance) || (allow > bonus ? allow - bonus : 0);
      const advAdj = Number(item.advanceAdjustment) || Number(item.advanceDeduction) || 0;
      const deduct = (Number(item.deduction) || 0) + advAdj;
      const payable = basic + allow;
      const net = Number(item.netPayable) > 0 ? Number(item.netPayable) : Math.max(0, payable - deduct);

      totalBasic += basic;
      totalAllow += allow;
      totalDeduct += deduct;
      totalAdv += advAdj;
      totalNet += net;

      return {
        id: `bi-${Date.now()}-${idx + 1}`,
        staffId: item.staffId,
        staffName: staff?.name || item.staffName || '',
        staffCode: staff?.staffCode,
        designationBn: staff?.designationBn || item.designationBn || '',
        phone: staff?.phone,
        basicSalary: basic,
        bonus,
        allowance: allow,
        otherAllowance: otherAllow,
        deduction: deduct,
        advanceAdjustment: advAdj,
        totalPayable: payable,
        netPayable: net,
        paymentMethod: item.paymentMethod || (disbursementMethod === 'MIXED' ? 'BANK' : disbursementMethod),
        bankName: staff?.bankName || item.bankName,
        branchName: staff?.branchName || item.branchName,
        accountNumber: staff?.accountNumber || item.accountNumber,
        accountHolderName: staff?.accountHolderName || staff?.name || item.accountHolderName,
        routingNumber: staff?.routingNumber || item.routingNumber,
        status: 'PENDING',
        notes: item.notes,
      };
    });

    const newBatch: any = {
      id: `batch-${Date.now()}`,
      mosqueId,
      batchNumber,
      title: title || `${paymentMonth || `${currentYear}-Month`} বেতন পেমেন্ট ব্যাচ`,
      paymentMonth: paymentMonth || `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      paymentYear: currentYear,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      paymentType: paymentType as any,
      festivalName,
      disbursementMethod: disbursementMethod as any,
      accountId: account?.id,
      accountNameBn: account?.nameBn,
      totalStaff: batchItems.length,
      totalAmount: totalNet,
      totalBasicSalary: totalBasic,
      totalAllowances: totalAllow,
      totalDeductions: totalDeduct,
      totalAdvanceAdjusted: totalAdv,
      status: 'APPROVED',
      items: batchItems,
      reference,
      notes,
      googleDriveLink,
      documents,
      approvedBy: actor.userId,
      approvedByName: actor.userName,
      approvedAt: new Date().toISOString(),
      termId: activeTerm?.id,
      termTitle: activeTerm?.title,
      createdBy: actor.userId,
      createdByName: actor.userName,
      createdAt: new Date().toISOString(),
    };

    if (!this.dataSource.paymentBatches) this.dataSource.paymentBatches = [];
    this.dataSource.paymentBatches.unshift(newBatch);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'STAFF',
        `পেমেন্ট ব্যাচ তৈরি (${batchNumber}): ${newBatch.title}, মোট স্টাফ: ${batchItems.length} জন, মোট টাকা: ৳${totalNet}`
      );
    }

    return newBatch;
  }

  async updatePaymentBatch(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const batch = (this.dataSource.paymentBatches || []).find((b: any) => b.id === id && b.mosqueId === mosqueId);
    if (!batch) {
      throw new DalDomainError('NOT_FOUND', 'পেমেন্ট ব্যাচ পাওয়া যায়নি।');
    }

    const { title, notes, reference, googleDriveLink } = payload;
    if (title) batch.title = title;
    if (notes !== undefined) batch.notes = notes;
    if (reference !== undefined) batch.reference = reference;
    if (googleDriveLink !== undefined) batch.googleDriveLink = googleDriveLink;
    batch.updatedAt = new Date().toISOString();

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'STAFF',
        `পেমেন্ট ব্যাচ তথ্য আপডেট (${batch.batchNumber})`
      );
    }

    return batch;
  }

  async disbursePaymentBatch(
    options: DALOptions,
    id: string,
    payload: Record<string, any>
  ): Promise<{ disbursedBatch: any; createdPayments: any[] }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const batchCheck = (this.dataSource.paymentBatches || []).find(
      (b: any) => b.id === id && b.mosqueId === mosqueId
    );
    if (!batchCheck) {
      throw new DalDomainError('NOT_FOUND', 'পেমেন্ট ব্যাচ পাওয়া যায়নি।');
    }
    if (batchCheck.status === 'PAID') {
      throw new DalDomainError('ALREADY_PAID', 'এই ব্যাচের অর্থ ইতিমধ্যে পরিশোধিত হয়েছে।');
    }

    const { accountId, paymentDate, notes } = payload;

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const batch = (tx.paymentBatches || []).find((b: any) => b.id === id && b.mosqueId === mosqueId);
      if (!batch) {
        throw new DalDomainError('NOT_FOUND', 'পেমেন্ট ব্যাচ পাওয়া যায়নি।');
      }

      const targetAccountId = accountId || batch.accountId;
      const account =
        (tx.accounts || []).find((a: any) => a.id === targetAccountId && a.mosqueId === mosqueId) ||
        (tx.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
        (tx.accounts || [])[0];

      const payDate = paymentDate || batch.paymentDate || new Date().toISOString().split('T')[0];
      const activeTerm = (tx.committeeTerms || []).find((t: any) => t.mosqueId === mosqueId && t.status === 'ACTIVE');
      const currentYear = batch.paymentYear || new Date().getFullYear();

      const paymentsList: any[] = [];

      for (const item of batch.items) {
        if (item.status === 'PAID') continue;

        const staff = (tx.staffList || []).find((s: any) => s.id === item.staffId && s.mosqueId === mosqueId);
        if (!staff) continue;

        account.currentBalance -= item.netPayable;

        const expVoucher = `EXP-${currentYear}-${String(
          (tx.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1
        ).padStart(6, '0')}`;
        const expEntryId = `exp-batch-${Date.now()}-${item.staffId}`;

        const payment: any = {
          id: `pay-${Date.now()}-${item.staffId}`,
          mosqueId,
          staffId: staff.id,
          staffName: staff.name,
          designationBn: staff.designationBn,
          month: batch.paymentMonth,
          paymentDate: payDate,
          paymentType:
            batch.paymentType === 'FESTIVAL_ALLOWANCE'
              ? 'FESTIVAL_ALLOWANCE'
              : batch.paymentType === 'HADIA'
              ? 'HADIA'
              : 'REGULAR_SALARY',
          festivalName: batch.festivalName,
          basicSalary: item.basicSalary,
          bonus: item.bonus || 0,
          otherAllowance: item.otherAllowance || 0,
          allowance: item.allowance || 0,
          deduction: item.deduction,
          advanceDeduction: item.advanceAdjustment,
          advanceAdjustment: item.advanceAdjustment,
          totalPayable: item.totalPayable,
          payableAmount: item.totalPayable,
          netPaid: item.netPayable,
          remainingDue: 0,
          paymentMethod: item.paymentMethod || 'BANK',
          accountId: account.id,
          accountNameBn: account.nameBn,
          bankName: item.bankName || staff.bankName,
          branchName: item.branchName || staff.branchName,
          accountNumber: item.accountNumber || staff.accountNumber,
          expenseVoucherNumber: expVoucher,
          expenseEntryId: expEntryId,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          notes: item.notes || notes || `ব্যাচ পেমেন্ট: ${batch.batchNumber}`,
          staffSignatureUrl: staff.signatureUrl || undefined,
          receivedByConfirmation: true,
          status: 'PAID',
          termId: activeTerm ? activeTerm.id : undefined,
          createdBy: actor.userId,
          createdByName: actor.userName,
          createdAt: new Date().toISOString(),
        };

        tx.staffPayments.unshift(payment);
        paymentsList.push(payment);

        item.status = 'PAID';
        item.paymentId = payment.id;
        item.voucherNumber = expVoucher;

        if (item.advanceAdjustment && item.advanceAdjustment > 0 && staff.advanceRecords) {
          let rem = item.advanceAdjustment;
          for (const adv of staff.advanceRecords) {
            if (adv.status === 'ACTIVE' && rem > 0) {
              const adj = Math.min(rem, adv.outstandingAmount);
              adv.adjustedAmount = (adv.adjustedAmount || 0) + adj;
              adv.outstandingAmount -= adj;
              if (!adv.adjustmentHistory) adv.adjustmentHistory = [];
              adv.adjustmentHistory.push({
                paymentId: payment.id,
                month: batch.paymentMonth,
                amount: adj,
                date: payDate,
              });
              if (adv.outstandingAmount <= 0) adv.status = 'FULLY_ADJUSTED';
              rem -= adj;
            }
          }
        }

        tx.expenseEntries.unshift({
          id: expEntryId,
          mosqueId,
          termId: activeTerm ? activeTerm.id : undefined,
          voucherNumber: expVoucher,
          date: payDate,
          mainHeadId: 'head-exp-01',
          mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
          subHeadId:
            staff.designation === 'IMAM' || staff.designation === 'KHATIB' ? 'head-exp-01-1' : 'head-exp-01-2',
          subHeadNameBn: `${staff.designationBn} বেতন ও হাদিয়া (${staff.name} - ${batch.paymentMonth})`,
          amount: item.netPayable,
          paymentMethod: item.paymentMethod || 'BANK',
          accountId: account.id,
          accountName: account.nameBn,
          payeeName: staff.name,
          payeePhone: staff.phone,
          reference: `ব্যাচ: ${batch.batchNumber} | মাস: ${batch.paymentMonth}`,
          description: `${staff.name} (${staff.designationBn}) এর ${batch.paymentMonth} মাসের বেতন/হাদিয়া পরিশোধ [ব্যাচ: ${batch.batchNumber}]`.trim(),
          createdBy: actor.userId,
          createdByName: actor.userName,
          approvedBy: actor.userId,
          approvedByName: actor.userName,
          approvedAt: new Date().toISOString(),
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }

      batch.status = 'PAID';
      batch.disbursedAt = new Date().toISOString();
      batch.accountId = account.id;
      batch.accountNameBn = account.nameBn;
      batch.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'STAFF_PAYMENT',
        `পেমেন্ট ব্যাচ বিতরণ সম্পন্ন (${batch.batchNumber}): মোট পরিশোধ ৳${batch.totalAmount} (${paymentsList.length} জন কর্মী)`
      );

      return { disbursedBatch: batch, createdPayments: paymentsList };
    });
  }

  async cancelPaymentBatch(options: DALOptions, id: string, reason?: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const batch = (this.dataSource.paymentBatches || []).find((b: any) => b.id === id && b.mosqueId === mosqueId);
    if (!batch) {
      throw new DalDomainError('NOT_FOUND', 'পেমেন্ট ব্যাচ পাওয়া যায়নি।');
    }
    if (batch.status === 'CANCELLED') {
      throw new DalDomainError('ALREADY_CANCELLED', 'এই ব্যাচটি ইতিমধ্যে বাতিল করা হয়েছে।');
    }

    const wasPaid = batch.status === 'PAID';
    if (wasPaid) {
      for (const item of batch.items) {
        if (item.paymentId) {
          const payment = (this.dataSource.staffPayments || []).find(
            (p: any) => p.id === item.paymentId && p.mosqueId === mosqueId
          );
          if (payment && payment.status !== 'CANCELLED') {
            const account = (this.dataSource.accounts || []).find((a: any) => a.id === payment.accountId);
            if (account) account.currentBalance += payment.netPaid;
            payment.status = 'CANCELLED';
            payment.notes = `${payment.notes ? payment.notes + ' | ' : ''}[ব্যাচ বাতিলকরণে বাতিল: ${
              reason || 'প্রশাসনিক সিদ্ধান্ত'
            }]`;
            payment.updatedAt = new Date().toISOString();

            const expEntry = (this.dataSource.expenseEntries || []).find(
              (e: any) => e.voucherNumber === payment.expenseVoucherNumber || e.id === payment.expenseEntryId
            );
            if (expEntry) {
              expEntry.status = 'REJECTED';
              expEntry.description = `[বাতিলকৃত ব্যাচ ভাউচার] ${expEntry.description}`;
              (expEntry as any).updatedAt = new Date().toISOString();
            }
          }
        }
      }
    }

    batch.status = 'CANCELLED';
    batch.cancellationReason = reason || 'প্রশাসনিক সিদ্ধান্ত';
    batch.notes = `${batch.notes ? batch.notes + ' | ' : ''}[বাতিলকৃত: ${reason || 'প্রশাসনিক সিদ্ধান্ত'}]`;
    batch.updatedAt = new Date().toISOString();

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'STAFF',
        `পেমেন্ট ব্যাচ বাতিল (${batch.batchNumber}): কারণ: ${reason || 'প্রশাসনিক সিদ্ধান্ত'}`
      );
    }

    return batch;
  }
}

/**
 * JSON Parity Repository for Waqf Properties, Tenants & Rent Collection (Section 10 — Phase 1B.12).
 */
export class JsonPropertyParityRepository implements IPropertyRepository {
  constructor(
    private readonly dataSource: JsonDataSourceContract,
    private readonly defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return (this.dataSource.properties || []).filter((p: any) => p.mosqueId === mosqueId);
  }

  async create(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const year = new Date().getFullYear();
    const count = (this.dataSource.properties || []).filter((p: any) => p.mosqueId === mosqueId).length + 1;
    const propertyCode = payload.propertyCode || `PROP-${year}-${String(count).padStart(3, '0')}`;

    const property = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      mosqueId,
      propertyCode,
      name: payload.name || payload.description || 'ওয়াকফ সম্পত্তি',
      nameBn: payload.nameBn || payload.name || payload.description || 'ওয়াকফ সম্পত্তি',
      type: payload.type || 'COMMERCIAL_LAND',
      propertyType: payload.propertyType || payload.type || 'COMMERCIAL_LAND',
      category: payload.category || 'LAND',
      description: payload.description || payload.name || 'ওয়াকফ সম্পত্তি ও জমি',
      location: payload.location || 'মসজিদ সংলগ্ন',
      fullAddress: payload.fullAddress || payload.location || '',
      area: payload.area || '০ শতাংশ',
      areaAmount: Number(payload.areaAmount) || 0,
      areaUnit: payload.areaUnit || 'DECIMAL',
      ownershipType: payload.ownershipType || 'WAQF',
      csPlotNo: payload.csPlotNo || '',
      saPlotNo: payload.saPlotNo || '',
      rsPlotNo: payload.rsPlotNo || '',
      bsPlotNo: payload.bsPlotNo || '',
      plotNo: payload.plotNo || payload.bsPlotNo || payload.rsPlotNo || '',
      csKhatianNo: payload.csKhatianNo || '',
      saKhatianNo: payload.saKhatianNo || '',
      rsKhatianNo: payload.rsKhatianNo || '',
      bsKhatianNo: payload.bsKhatianNo || '',
      mutationKhatianNo: payload.mutationKhatianNo || '',
      khatianNo: payload.khatianNo || payload.bsKhatianNo || payload.rsKhatianNo || '',
      mouza: payload.mouza || '',
      jlNumber: payload.jlNumber || '',
      subRegistryOffice: payload.subRegistryOffice || '',
      boundaryNorth: payload.boundaryNorth || '',
      boundarySouth: payload.boundarySouth || '',
      boundaryEast: payload.boundaryEast || '',
      boundaryWest: payload.boundaryWest || '',
      waqfEnrollmentNo: payload.waqfEnrollmentNo || '',
      waqfDeedNo: payload.waqfDeedNo || '',
      waqfYear: payload.waqfYear || '',
      waqfDeedDate: payload.waqfDeedDate || '',
      waqifName: payload.waqifName || '',
      waqifFatherName: payload.waqifFatherName || '',
      waqifAddress: payload.waqifAddress || '',
      waqfPurpose: payload.waqfPurpose || '',
      waqfEstateName: payload.waqfEstateName || '',
      currentUse: payload.currentUse || 'মসজিদের ওয়াকফ সম্পত্তি',
      possessionStatus: payload.possessionStatus || 'MOSQUE_CONTROL',
      status: payload.status || 'ACTIVE',
      estimatedValue: Number(payload.estimatedValue) || 0,
      monthlyIncome: Number(payload.monthlyIncome) || Number(payload.monthlyRent) || 0,
      monthlyRent: Number(payload.monthlyRent) || Number(payload.monthlyIncome) || 0,
      annualIncome: Number(payload.annualIncome) || 0,
      photoUrl: payload.photoUrl || '',
      documentsCount: Number(payload.documentsCount) || 0,
      isArchived: false,
      notes: payload.notes || '',
      tenants: Array.isArray(payload.tenants) ? payload.tenants : [],
      inspections: Array.isArray(payload.inspections) ? payload.inspections : [],
      legalCases: Array.isArray(payload.legalCases) ? payload.legalCases : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.dataSource.properties) this.dataSource.properties = [];
    this.dataSource.properties.unshift(property);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `নতুন ওয়াকফ সম্পত্তি অন্তর্ভুক্তি: ${property.name || property.description} (${propertyCode})`
      );
    }

    return property;
  }

  async update(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === id && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const prevName = property.name || property.description;
    Object.assign(property, payload, { updatedAt: new Date().toISOString() });

    if (payload.monthlyIncome !== undefined) {
      property.monthlyRent = Number(payload.monthlyIncome);
    } else if (payload.monthlyRent !== undefined) {
      property.monthlyIncome = Number(payload.monthlyRent);
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'PROPERTY',
        `সম্পত্তির বিবরণ আপডেট: ${property.name || property.description || prevName} (${property.propertyCode})`
      );
    }

    return property;
  }

  async toggleArchive(options: DALOptions, id: string, explicitArchived?: boolean): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === id && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const isArchived = explicitArchived !== undefined ? Boolean(explicitArchived) : !property.isArchived;
    property.isArchived = isArchived;
    property.updatedAt = new Date().toISOString();

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    const actionText = isArchived ? 'আর্কাইভ' : 'সক্রিয়করণ';
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'PROPERTY',
        `সম্পত্তি ${actionText}: ${property.name || property.description} (${property.propertyCode})`
      );
    }

    return property;
  }

  async deleteOrArchive(
    options: DALOptions,
    id: string,
    force?: boolean
  ): Promise<{ success: boolean; archived?: boolean; deleted?: boolean; property?: any; deletedId?: string; message: string }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const idx = (this.dataSource.properties || []).findIndex((p: any) => p.id === id && p.mosqueId === mosqueId);
    if (idx === -1) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const property = this.dataSource.properties![idx];
    const hasHistory = Boolean(
      (property.tenants && property.tenants.length > 0) ||
        (property.inspections && property.inspections.length > 0) ||
        (property.legalCases && property.legalCases.length > 0)
    );

    if (hasHistory || !force) {
      property.isArchived = true;
      property.updatedAt = new Date().toISOString();
      if (typeof this.dataSource.save === 'function') this.dataSource.save();
      if (typeof this.dataSource.logAudit === 'function') {
        this.dataSource.logAudit(
          mosqueId,
          actor.userId,
          actor.userName,
          actor.userRole,
          'UPDATE',
          'PROPERTY',
          `সম্পত্তি আর্কাইভ (স্থায়ী রেকর্ড সংরক্ষণের স্বার্থে সফট-ডিলিট): ${property.name || property.description} (${property.propertyCode})`
        );
      }
      return {
        success: true,
        archived: true,
        property,
        message: 'ওয়াকফ সম্পত্তির ঐতিহাসিক রেকর্ড বজায় রেখে এটি আর্কাইভ তালিকায় স্থানান্তরিত করা হয়েছে।',
      };
    }

    const removed = this.dataSource.properties!.splice(idx, 1)[0];
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'PROPERTY',
        `সম্পত্তি মুছে ফেলা: ${removed.name || removed.description} (${removed.propertyCode})`
      );
    }

    return {
      success: true,
      deleted: true,
      deletedId: removed.id,
      message: 'সম্পত্তির রেকর্ড সফলভাবে অপসারিত হয়েছে।',
    };
  }

  async saveTenant(
    options: DALOptions,
    propertyId: string,
    tenantData: Record<string, any>
  ): Promise<{ property: any; tenant: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    if (!property.tenants) property.tenants = [];

    let tenant: any;
    if (tenantData.id) {
      const tIdx = property.tenants.findIndex((t: any) => t.id === tenantData.id);
      if (tIdx !== -1) {
        property.tenants[tIdx] = {
          ...property.tenants[tIdx],
          ...tenantData,
          updatedAt: new Date().toISOString(),
        };
        tenant = property.tenants[tIdx];
      } else {
        tenant = {
          id: tenantData.id,
          mosqueId,
          propertyId: property.id,
          tenantCode: tenantData.tenantCode || `TNT-${String(property.tenants.length + 1).padStart(3, '0')}`,
          name: tenantData.name,
          fatherOrSpouseName: tenantData.fatherOrSpouseName,
          mobile: tenantData.mobile,
          nid: tenantData.nid,
          address: tenantData.address,
          photoUrl: tenantData.photoUrl,
          unitOrShopNo: tenantData.unitOrShopNo,
          businessName: tenantData.businessName,
          businessType: tenantData.businessType,
          agreementNo: tenantData.agreementNo,
          startDate: tenantData.startDate,
          endDate: tenantData.endDate,
          monthlyRent: Number(tenantData.monthlyRent) || 0,
          annualRent: Number(tenantData.annualRent) || (Number(tenantData.monthlyRent) || 0) * 12,
          securityDeposit: Number(tenantData.securityDeposit) || 0,
          paymentDueDate: Number(tenantData.paymentDueDate) || 10,
          status: tenantData.status || 'ACTIVE',
          notes: tenantData.notes,
          createdAt: new Date().toISOString(),
        };
        property.tenants.unshift(tenant);
      }
    } else {
      const tCode = `TNT-${String(property.tenants.length + 1).padStart(3, '0')}`;
      tenant = {
        id: `tnt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        mosqueId,
        propertyId: property.id,
        tenantCode: tenantData.tenantCode || tCode,
        name: tenantData.name,
        fatherOrSpouseName: tenantData.fatherOrSpouseName,
        mobile: tenantData.mobile,
        nid: tenantData.nid,
        address: tenantData.address,
        photoUrl: tenantData.photoUrl,
        unitOrShopNo: tenantData.unitOrShopNo,
        businessName: tenantData.businessName,
        businessType: tenantData.businessType,
        agreementNo:
          tenantData.agreementNo || `AGR-${new Date().getFullYear()}-${String(property.tenants.length + 1).padStart(2, '0')}`,
        startDate: tenantData.startDate || new Date().toISOString().split('T')[0],
        endDate: tenantData.endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        monthlyRent: Number(tenantData.monthlyRent) || 0,
        annualRent: Number(tenantData.annualRent) || (Number(tenantData.monthlyRent) || 0) * 12,
        securityDeposit: Number(tenantData.securityDeposit) || 0,
        paymentDueDate: Number(tenantData.paymentDueDate) || 10,
        status: tenantData.status || 'ACTIVE',
        notes: tenantData.notes,
        createdAt: new Date().toISOString(),
      };
      property.tenants.unshift(tenant);
    }

    const totalRent = property.tenants
      .filter((t: any) => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON')
      .reduce((sum: number, t: any) => sum + (t.monthlyRent || 0), 0);

    if (totalRent > 0) {
      property.monthlyIncome = totalRent;
      property.monthlyRent = totalRent;
      if (property.status === 'VACANT' || property.status === 'ACTIVE') {
        property.status = 'RENTED';
      }
    }

    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `ভাড়াটিয়া চুক্তি সংযোজন/আপডেট: ${tenant.name} (${tenant.unitOrShopNo || ''}) - ${property.name || property.propertyCode}`
      );
    }

    return { property, tenant };
  }

  async terminateTenant(options: DALOptions, propertyId: string, tenantId: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property || !property.tenants) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি বা ভাড়াটিয়া পাওয়া যায়নি।');
    }

    const tenant = property.tenants.find((t: any) => t.id === tenantId);
    if (!tenant) {
      throw new DalDomainError('NOT_FOUND', 'ভাড়াটিয়া পাওয়া যায়নি।');
    }

    tenant.status = 'TERMINATED';
    tenant.updatedAt = new Date().toISOString();

    const totalRent = property.tenants
      .filter((t: any) => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON')
      .reduce((sum: number, t: any) => sum + (t.monthlyRent || 0), 0);
    property.monthlyIncome = totalRent;
    property.monthlyRent = totalRent;

    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'PROPERTY',
        `ভাড়াটিয়া চুক্তি সমাপ্ত/টার্মিনেট: ${tenant.name} (${property.propertyCode})`
      );
    }

    return property;
  }

  async addInspection(
    options: DALOptions,
    propertyId: string,
    payload: Record<string, any>
  ): Promise<{ property: any; inspection: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    if (!property.inspections) property.inspections = [];

    const inspection = {
      id: `insp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      propertyId: property.id,
      inspectionDate: payload.inspectionDate || new Date().toISOString().split('T')[0],
      inspectorName: payload.inspectorName || actor.userName,
      inspectorDesignation: payload.inspectorDesignation || '',
      currentCondition: payload.currentCondition || 'GOOD',
      occupancyStatus: payload.occupancyStatus || '',
      problemsObserved: payload.problemsObserved || '',
      requiredAction: payload.requiredAction || '',
      nextInspectionDate: payload.nextInspectionDate || '',
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
    };

    property.inspections.unshift(inspection);
    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `সম্পত্তি পরিদর্শন রিপোর্ট যুক্ত: ${property.name || property.propertyCode} - পরিদর্শক: ${inspection.inspectorName}`
      );
    }

    return { property, inspection };
  }

  async saveLegalCase(
    options: DALOptions,
    propertyId: string,
    caseData: Record<string, any>
  ): Promise<{ property: any; legalCase: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    if (!property.legalCases) property.legalCases = [];

    let legalCase: any;
    if (caseData.id) {
      const cIdx = property.legalCases.findIndex((c: any) => c.id === caseData.id);
      if (cIdx !== -1) {
        property.legalCases[cIdx] = {
          ...property.legalCases[cIdx],
          ...caseData,
          updatedAt: new Date().toISOString(),
        };
        legalCase = property.legalCases[cIdx];
      } else {
        legalCase = {
          id: caseData.id,
          propertyId: property.id,
          caseNumber: caseData.caseNumber,
          courtName: caseData.courtName,
          parties: caseData.parties,
          caseSubject: caseData.caseSubject,
          lawyerName: caseData.lawyerName,
          lawyerContact: caseData.lawyerContact,
          filingDate: caseData.filingDate,
          nextHearingDate: caseData.nextHearingDate,
          status: caseData.status || 'RUNNING',
          courtOrders: caseData.courtOrders,
          notes: caseData.notes,
          createdAt: new Date().toISOString(),
        };
        property.legalCases.unshift(legalCase);
      }
    } else {
      legalCase = {
        id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        propertyId: property.id,
        caseNumber: caseData.caseNumber,
        courtName: caseData.courtName,
        parties: caseData.parties,
        caseSubject: caseData.caseSubject,
        lawyerName: caseData.lawyerName,
        lawyerContact: caseData.lawyerContact,
        filingDate: caseData.filingDate || new Date().toISOString().split('T')[0],
        nextHearingDate: caseData.nextHearingDate,
        status: caseData.status || 'RUNNING',
        courtOrders: caseData.courtOrders,
        notes: caseData.notes,
        createdAt: new Date().toISOString(),
      };
      property.legalCases.unshift(legalCase);
    }

    if (legalCase.status === 'RUNNING' || legalCase.status === 'STAY_ORDER') {
      property.status = 'LEGAL_CASE';
    }

    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `সম্পত্তি আইনি মামলা রেকর্ড সংরক্ষণ: ${legalCase.caseNumber} (${property.propertyCode})`
      );
    }

    return { property, legalCase };
  }

  async collectRent(
    options: DALOptions,
    propertyId: string,
    payload: Record<string, any>
  ): Promise<{ collectionRecord: any; returnedProperty: any; returnedIncomeEntry: any | null; payload: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const {
      tenantId,
      billingMonth,
      monthlyRent,
      previousDue,
      paidAmount,
      paymentDate,
      paymentMethod,
      accountId,
      notes,
      isAccountingLinked = true,
      _idempotencyKey
    } = payload;

    const tenant = (property.tenants || []).find((t: any) => t.id === tenantId);
    if (!tenant) {
      throw new DalDomainError('VALIDATION_ERROR', 'ভাড়াটিয়া বা ইজাদার নির্বাচন আবশ্যক।');
    }

    const numPaid = Number(paidAmount);
    if (isNaN(numPaid) || numPaid < 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'পরিশোধের সঠিক পরিমাণ প্রদান করুন।');
    }

    if (!property.rentCollections) property.rentCollections = [];

    const numMonthlyRent = Number(monthlyRent) || tenant.monthlyRent || 0;
    const numPrevDue = Number(previousDue) || 0;
    const totalDue = numMonthlyRent + numPrevDue;
    const remainingDue = Math.max(0, totalDue - numPaid);

    const year = new Date().getFullYear();
    const allMosqueRentCols = (this.dataSource.properties || [])
      .filter((p: any) => p.mosqueId === mosqueId)
      .flatMap((p: any) => p.rentCollections || []);
    const receiptNumber = `WQR-${year}-${String(allMosqueRentCols.length + 1).padStart(4, '0')}`;

    const account =
      (this.dataSource.accounts || []).find((a: any) => a.id === accountId) ||
      (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
      (this.dataSource.accounts || [])[0];

    let incomeVoucherNumber = '';
    let incomeEntryId = '';
    let incomeEntry: any = null;

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (isAccountingLinked && numPaid > 0) {
        const mainHead =
          (tx.accountHeads || []).find((h: any) => (h.nameBn?.includes('ভাড়া') || h.nameBn?.includes('ওয়াকফ')) && h.type === 'INCOME') ||
          (tx.accountHeads || []).find((h: any) => h.type === 'INCOME') ||
          (tx.accountHeads || [])[0];

        const incCount = (tx.incomeEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1;
        incomeVoucherNumber = `INC-${year}-${String(incCount).padStart(6, '0')}`;
        incomeEntryId = `inc-prop-${Date.now()}`;

        incomeEntry = {
          id: incomeEntryId,
          mosqueId,
          voucherNumber: incomeVoucherNumber,
          date: paymentDate || new Date().toISOString().split('T')[0],
          mainHeadId: mainHead?.id || 'head-inc-02',
          mainHeadNameBn: mainHead?.nameBn || 'ওয়াকফ ও দোকান ভাড়া আয়',
          amount: numPaid,
          paymentMethod: paymentMethod || 'CASH',
          accountId: account?.id || 'acc-cash-01',
          accountName: account?.nameBn || 'প্রধান ক্যাশ',
          donorName: `${tenant.name} (${property.name || property.propertyCode})`,
          donorPhone: tenant.mobile,
          reference: receiptNumber,
          description: `ওয়াকফ সম্পত্তি ভাড়া আদায়: ${property.name || property.propertyCode} - ইউনিট/দোকান: ${tenant.unitOrShopNo || ''} (মাস: ${billingMonth || ''})`,
          createdBy: actor.userId,
          createdByName: actor.userName,
          status: 'APPROVED' as const,
          approvedBy: actor.userId,
          approvedByName: actor.userName,
          approvedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (account) {
          account.currentBalance += numPaid;
        }

        tx.incomeEntries.unshift(incomeEntry);
      }

      const collectionRec = {
        id: `rent-col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        mosqueId,
        propertyId: property.id,
        propertyCode: property.propertyCode,
        propertyName: property.name || property.nameBn || property.description,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantCode: tenant.tenantCode,
        shopOrUnitNo: tenant.unitOrShopNo,
        billingMonth: billingMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        monthlyRent: numMonthlyRent,
        previousDue: numPrevDue,
        totalDue,
        paidAmount: numPaid,
        remainingDue,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod || 'CASH',
        accountId: account?.id,
        accountName: account?.nameBn,
        receiptNumber,
        incomeVoucherNumber: incomeVoucherNumber || undefined,
        incomeEntryId: incomeEntryId || undefined,
        isAccountingLinked: Boolean(isAccountingLinked),
        collectorName: actor.userName,
        collectorDesignation: actor.userRole === 'MOSQUE_ADMIN' ? 'অ্যাডমিন / মোতাওয়াল্লি' : 'হিসাবরক্ষক',
        notes,
        status: remainingDue === 0 ? 'PAID' : 'PARTIAL',
        createdAt: new Date().toISOString()
      };

      property.rentCollections.unshift(collectionRec);
      property.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `ওয়াকফ সম্পত্তি ভাড়া আদায়: ৳${numPaid.toLocaleString('en-IN')} (রসিদ: ${receiptNumber}, ভাড়াটিয়া: ${tenant.name})`
      );

      const resPayload = {
        success: true,
        data: property,
        rentCollection: collectionRec,
        incomeEntry,
        message: 'ভাড়া আদায় সফলভাবে সম্পন্ন হয়েছে ও রসিদ তৈরি হয়েছে।'
      };

      const idempKey = _idempotencyKey || activeOptions?.idempotencyKey;
      if (typeof tx.saveIdempotency === 'function') {
        tx.saveIdempotency(idempKey, resPayload);
      }

      return { collectionRecord: collectionRec, returnedProperty: property, returnedIncomeEntry: incomeEntry, payload: resPayload };
    });
  }

  async reverseRentCollection(
    options: DALOptions,
    propertyId: string,
    collectionId: string
  ): Promise<{ property: any; reversedInc: any | null }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property || !property.rentCollections) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি বা ভাড়া রেকর্ড পাওয়া যায়নি।');
    }

    const colIdx = property.rentCollections.findIndex((c: any) => c.id === collectionId);
    if (colIdx === -1) {
      throw new DalDomainError('NOT_FOUND', 'ভাড়া কালেকশন রেকর্ড পাওয়া যায়নি।');
    }

    const record = property.rentCollections[colIdx];

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      let reversedInc: any = null;
      if (record.incomeEntryId) {
        const inc = (tx.incomeEntries || []).find((i: any) => i.id === record.incomeEntryId && i.mosqueId === mosqueId);
        if (inc && inc.status === 'APPROVED') {
          const account = (tx.accounts || []).find((a: any) => a.id === inc.accountId);
          if (account) {
            account.currentBalance -= inc.amount;
          }
          inc.status = 'CANCELLED';
          inc.rejectionReason = 'ওয়াকফ ভাড়া কালেকশন বাতিল';
          inc.updatedAt = new Date().toISOString();
          reversedInc = inc;
        }
      }

      property.rentCollections.splice(colIdx, 1);
      property.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'PROPERTY',
        `ওয়াকফ ভাড়া কালেকশন বাতিল: ${record.receiptNumber} - ৳${record.paidAmount}`
      );

      return { property, reversedInc };
    });
  }

  async addExpense(
    options: DALOptions,
    propertyId: string,
    payload: Record<string, any>
  ): Promise<{ expRecord: any; updatedProperty: any; expenseEntry: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const {
      expenseCategory,
      expenseCategoryBn,
      amount,
      date,
      payeeName,
      paymentMethod,
      accountId,
      description,
      attachmentUrl
    } = payload;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new DalDomainError('INVALID_AMOUNT', 'ব্যয়ের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।');
    }

    if (!property.expenses) property.expenses = [];

    const account =
      (this.dataSource.accounts || []).find((a: any) => a.id === accountId) ||
      (this.dataSource.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
      (this.dataSource.accounts || [])[0];
    const year = new Date().getFullYear();
    const expCount = (this.dataSource.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1;
    const voucherNumber = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
    const expenseEntryId = `exp-prop-${Date.now()}`;

    const mainHead =
      (this.dataSource.accountHeads || []).find(
        (h: any) => (h.nameBn?.includes('মেরামত') || h.nameBn?.includes('সম্পত্তি') || h.nameBn?.includes('রক্ষণাবেক্ষণ')) && h.type === 'EXPENSE'
      ) ||
      (this.dataSource.accountHeads || []).find((h: any) => h.type === 'EXPENSE') ||
      (this.dataSource.accountHeads || [])[0];

    const expenseEntry: any = {
      id: expenseEntryId,
      mosqueId,
      voucherNumber,
      date: date || new Date().toISOString().split('T')[0],
      mainHeadId: mainHead?.id || 'head-exp-03',
      mainHeadNameBn: mainHead?.nameBn || 'সম্পত্তি মেরামত ও রক্ষণাবেক্ষণ',
      amount: numAmount,
      paymentMethod: paymentMethod || 'CASH',
      accountId: account?.id || 'acc-cash-01',
      accountName: account?.nameBn || 'প্রধান ক্যাশ',
      payeeName: payeeName || 'সরবরাহকারী/কারিগর',
      reference: property.propertyCode,
      description: `ওয়াকফ সম্পত্তি ব্যয় (${expenseCategoryBn || expenseCategory}): ${property.name || property.propertyCode} - ${description || ''}`,
      attachmentUrl,
      createdBy: actor.userId,
      createdByName: actor.userName,
      status: 'APPROVED' as const,
      approvedBy: actor.userId,
      approvedByName: actor.userName,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (account) {
        account.currentBalance -= numAmount;
      }

      tx.expenseEntries.unshift(expenseEntry);

      const expRec = {
        id: `exp-prop-rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        mosqueId,
        propertyId: property.id,
        propertyCode: property.propertyCode,
        propertyName: property.name || property.nameBn || property.description,
        expenseCategory: expenseCategory || 'REPAIR',
        expenseCategoryBn: expenseCategoryBn || 'মেরামত ও রক্ষণাবেক্ষণ',
        amount: numAmount,
        date: date || new Date().toISOString().split('T')[0],
        payeeName: payeeName || 'সরবরাহকারী/কারিগর',
        paymentMethod: paymentMethod || 'CASH',
        accountId: account?.id,
        accountName: account?.nameBn,
        voucherNumber,
        expenseEntryId,
        description,
        attachmentUrl,
        createdBy: actor.userId,
        createdByName: actor.userName,
        createdAt: new Date().toISOString()
      };

      property.expenses.unshift(expRec);
      property.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `ওয়াকফ সম্পত্তি বাবদ ব্যয়: ৳${numAmount.toLocaleString('en-IN')} (${property.propertyCode}, ভাউচার: ${voucherNumber})`
      );

      return { expRecord: expRec, updatedProperty: property, expenseEntry };
    });
  }

  async deleteExpense(
    options: DALOptions,
    propertyId: string,
    expenseId: string
  ): Promise<{ property: any; reversedExp: any | null }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property || !property.expenses) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি বা ব্যয় রেকর্ড পাওয়া যায়নি।');
    }

    const expIdx = property.expenses.findIndex((e: any) => e.id === expenseId);
    if (expIdx === -1) {
      throw new DalDomainError('NOT_FOUND', 'ব্যয় রেকর্ড পাওয়া যায়নি।');
    }

    const record = property.expenses[expIdx];
    let reversedExp: any = null;

    if (record.expenseEntryId) {
      const exp = (this.dataSource.expenseEntries || []).find((e: any) => e.id === record.expenseEntryId && e.mosqueId === mosqueId);
      if (exp && exp.status === 'APPROVED') {
        const account = (this.dataSource.accounts || []).find((a: any) => a.id === exp.accountId);
        if (account) {
          account.currentBalance += exp.amount;
        }
        exp.status = 'CANCELLED';
        exp.rejectionReason = 'ওয়াকফ সম্পত্তি ব্যয় রেকর্ড বাতিল';
        exp.updatedAt = new Date().toISOString();
        reversedExp = exp;
      }
    }

    property.expenses.splice(expIdx, 1);
    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'PROPERTY',
        `ওয়াকফ সম্পত্তি ব্যয় বাতিল: ${record.voucherNumber} - ৳${record.amount}`
      );
    }

    return { property, reversedExp };
  }

  async addDocument(
    options: DALOptions,
    propertyId: string,
    payload: Record<string, any>
  ): Promise<{ property: any; document: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const { title, documentType, documentTypeBn, issueDate, description, fileUrl, fileName, fileSize } = payload;
    if (!title || !documentType) {
      throw new DalDomainError('VALIDATION_ERROR', 'দলিল বা নথির শিরোনাম ও ধরন নির্বাচন আবশ্যক।');
    }

    if (!property.documents) property.documents = [];

    const doc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      mosqueId,
      propertyId: property.id,
      title,
      documentType,
      documentTypeBn: documentTypeBn || 'অন্যান্য দলিল',
      issueDate,
      description,
      fileUrl: fileUrl || '/uploads/sample-document.pdf',
      fileName: fileName || `${title}.pdf`,
      fileSize: fileSize || 1500000,
      uploadedBy: actor.userId,
      uploadedByName: actor.userName,
      createdAt: new Date().toISOString()
    };

    property.documents.unshift(doc);
    property.documentsCount = property.documents.length;
    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `ওয়াকফ সম্পত্তি দলিল/নথি আপলোড: ${doc.title} (${property.propertyCode})`
      );
    }

    return { property, document: doc };
  }

  async deleteDocument(options: DALOptions, propertyId: string, docId: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property || !property.documents) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি বা দলিল পাওয়া যায়নি।');
    }

    const docIdx = property.documents.findIndex((d: any) => d.id === docId);
    if (docIdx === -1) {
      throw new DalDomainError('NOT_FOUND', 'দলিল রেকর্ড পাওয়া যায়নি।');
    }

    const doc = property.documents[docIdx];
    property.documents.splice(docIdx, 1);
    property.documentsCount = property.documents.length;
    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'PROPERTY',
        `ওয়াকফ দলিল মুছে ফেলা হয়েছে: ${doc.title} (${property.propertyCode})`
      );
    }

    return property;
  }

  async addKhajna(
    options: DALOptions,
    propertyId: string,
    payload: Record<string, any>
  ): Promise<{ khajnaRecord: any; updatedProperty: any; createdExpenseEntry: any | null }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি পাওয়া যায়নি।');
    }

    const {
      taxYear,
      amount,
      paymentDate,
      receiptNumber,
      nextDueDate,
      holdingNo,
      paidToOffice,
      documentUrl,
      notes,
      isExpenseLinked = true,
      accountId,
      paymentMethod
    } = payload;

    const numAmount = Number(amount);
    if (!taxYear || isNaN(numAmount) || numAmount < 0) {
      throw new DalDomainError('VALIDATION_ERROR', 'কর বছর ও সঠিক টাকার পরিমাণ আবশ্যক।');
    }

    if (!property.khajnaRecords) property.khajnaRecords = [];

    let expenseVoucherNumber = '';
    let expenseEntryId = '';
    let createdExpenseEntry: any = null;

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (isExpenseLinked && numAmount > 0) {
        const account =
          (tx.accounts || []).find((a: any) => a.id === accountId) ||
          (tx.accounts || []).find((a: any) => a.mosqueId === mosqueId) ||
          (tx.accounts || [])[0];
        const year = new Date().getFullYear();
        const expCount = (tx.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1;
        expenseVoucherNumber = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
        expenseEntryId = `exp-prop-khajna-${Date.now()}`;

        const mainHead =
          (tx.accountHeads || []).find(
            (h: any) => (h.nameBn?.includes('খাজনা') || h.nameBn?.includes('কর') || h.nameBn?.includes('সম্পত্তি')) && h.type === 'EXPENSE'
          ) ||
          (tx.accountHeads || []).find((h: any) => h.type === 'EXPENSE') ||
          (tx.accountHeads || [])[0];

        createdExpenseEntry = {
          id: expenseEntryId,
          mosqueId,
          voucherNumber: expenseVoucherNumber,
          date: paymentDate || new Date().toISOString().split('T')[0],
          mainHeadId: mainHead?.id || 'head-exp-03',
          mainHeadNameBn: mainHead?.nameBn || 'ভূমি উন্নয়ন কর ও খাজনা',
          amount: numAmount,
          paymentMethod: paymentMethod || 'CASH',
          accountId: account?.id || 'acc-cash-01',
          accountName: account?.nameBn || 'প্রধান ক্যাশ',
          payeeName: paidToOffice || 'ভূমি রাজস্ব অফিস',
          reference: receiptNumber || property.propertyCode,
          description: `ভূমি উন্নয়ন কর ও খাজনা পরিশোধ (${taxYear}): ${property.name || property.propertyCode} - দাখিলা নং: ${receiptNumber || ''}`,
          attachmentUrl: documentUrl,
          createdBy: actor.userId,
          createdByName: actor.userName,
          status: 'APPROVED' as const,
          approvedBy: actor.userId,
          approvedByName: actor.userName,
          approvedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (account) {
          account.currentBalance -= numAmount;
        }

        tx.expenseEntries.unshift(createdExpenseEntry);
      }

      const khajnaRec = {
        id: `khajna-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        mosqueId,
        propertyId: property.id,
        taxYear,
        amount: numAmount,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        receiptNumber: receiptNumber || `DAK-${new Date().getFullYear()}-${String(property.khajnaRecords.length + 1).padStart(4, '0')}`,
        nextDueDate,
        holdingNo,
        paidToOffice,
        documentUrl,
        notes,
        expenseVoucherNumber: expenseVoucherNumber || undefined,
        expenseEntryId: expenseEntryId || undefined,
        isExpenseLinked: Boolean(isExpenseLinked),
        createdAt: new Date().toISOString()
      };

      property.khajnaRecords.unshift(khajnaRec);
      property.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'PROPERTY',
        `ভূমি কর ও খাজনা রেকর্ড সংযোজন: ৳${numAmount.toLocaleString('en-IN')} (${taxYear}, ${property.propertyCode})`
      );

      return { khajnaRecord: khajnaRec, updatedProperty: property, createdExpenseEntry };
    });
  }

  async deleteKhajna(
    options: DALOptions,
    propertyId: string,
    khajnaId: string
  ): Promise<{ property: any; reversedExp: any | null }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const property = (this.dataSource.properties || []).find((p: any) => p.id === propertyId && p.mosqueId === mosqueId);
    if (!property || !property.khajnaRecords) {
      throw new DalDomainError('NOT_FOUND', 'সম্পত্তি বা খাজনা রেকর্ড পাওয়া যায়নি।');
    }

    const kIdx = property.khajnaRecords.findIndex((k: any) => k.id === khajnaId);
    if (kIdx === -1) {
      throw new DalDomainError('NOT_FOUND', 'খাজনা রেকর্ড পাওয়া যায়নি।');
    }

    const record = property.khajnaRecords[kIdx];
    let reversedExp: any = null;

    if (record.expenseEntryId) {
      const exp = (this.dataSource.expenseEntries || []).find((e: any) => e.id === record.expenseEntryId && e.mosqueId === mosqueId);
      if (exp && exp.status === 'APPROVED') {
        const account = (this.dataSource.accounts || []).find((a: any) => a.id === exp.accountId);
        if (account) {
          account.currentBalance += exp.amount;
        }
        exp.status = 'CANCELLED';
        exp.rejectionReason = 'খাজনা রেকর্ড বাতিল';
        exp.updatedAt = new Date().toISOString();
        reversedExp = exp;
      }
    }

    property.khajnaRecords.splice(kIdx, 1);
    property.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'PROPERTY',
        `খাজনা রেকর্ড বাতিল: ${record.taxYear} - ৳${record.amount}`
      );
    }

    return { property, reversedExp };
  }
}

/**
 * JsonAssetParityRepository (Phase 1B.13): Assets & Maintenance Domain DAL Repository.
 */
export class JsonAssetParityRepository implements IAssetRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async list(options: DALOptions, query: any = {}): Promise<{ data: any[]; stats: any }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const { category, condition, search, location, includeArchived, termId } = query;

    let list = (this.dataSource.assets || []).filter((a: any) => a.mosqueId === mosqueId && !a.isDeleted);

    if (includeArchived !== 'true') {
      list = list.filter((a: any) => !a.isArchived);
    }
    if (category && category !== 'ALL') {
      list = list.filter((a: any) => a.category === category);
    }
    if (condition && condition !== 'ALL') {
      list = list.filter((a: any) => a.condition === condition);
    }
    if (location && location !== 'ALL') {
      list = list.filter((a: any) => a.location?.toLowerCase().includes(location.toLowerCase()));
    }
    if (termId && termId !== 'ALL') {
      list = list.filter((a: any) => a.termId === termId);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a: any) =>
        a.name?.toLowerCase().includes(q) ||
        a.assetCode?.toLowerCase().includes(q) ||
        a.brand?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q) ||
        a.serialNumber?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.responsiblePerson?.toLowerCase().includes(q) ||
        a.supplier?.toLowerCase().includes(q)
      );
    }

    const allMosqueAssets = (this.dataSource.assets || []).filter((a: any) => a.mosqueId === mosqueId && !a.isDeleted && !a.isArchived);
    const todayStr = new Date().toISOString().split('T')[0];

    const stats = {
      totalAssets: allMosqueAssets.length,
      goodCount: allMosqueAssets.filter((a: any) => a.condition === 'GOOD').length,
      needsRepairCount: allMosqueAssets.filter((a: any) => a.condition === 'NEEDS_REPAIR' || a.condition === 'FAIR' || a.condition === 'POOR').length,
      outOfOrderCount: allMosqueAssets.filter((a: any) => a.condition === 'OUT_OF_ORDER' || a.condition === 'DAMAGED').length,
      lostCount: allMosqueAssets.filter((a: any) => a.condition === 'LOST').length,
      disposedCount: allMosqueAssets.filter((a: any) => a.condition === 'DISPOSED').length,
      archivedCount: (this.dataSource.assets || []).filter((a: any) => a.mosqueId === mosqueId && !a.isDeleted && a.isArchived).length,
      demoCount: (this.dataSource.assets || []).filter((a: any) => a.mosqueId === mosqueId && !a.isDeleted && a.isDemo).length,
      totalPurchaseValue: allMosqueAssets.reduce((sum: number, a: any) => sum + (Number(a.purchaseValue) || 0), 0),
      totalCurrentValue: allMosqueAssets.reduce((sum: number, a: any) => sum + (Number(a.currentValue) || 0), 0),
      upcomingServiceCount: allMosqueAssets.filter((a: any) => a.nextServiceDate && a.nextServiceDate >= todayStr).length,
      overdueServiceCount: allMosqueAssets.filter((a: any) => a.nextServiceDate && a.nextServiceDate < todayStr).length,
    };

    return { data: list.map((a: any) => ({ ...a })), stats };
  }

  async findById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const asset = (this.dataSource.assets || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (!asset) return null;

    let linkedExpense = null;
    if (asset.expenseVoucherNumber || asset.expenseEntryId) {
      linkedExpense = (this.dataSource.expenseEntries || []).find(
        (e: any) => e.mosqueId === mosqueId && (e.voucherNumber === asset.expenseVoucherNumber || e.id === asset.expenseEntryId)
      );
    }

    return { ...asset, linkedExpense };
  }

  async create(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      const {
        assetCode: customCode,
        name,
        category,
        categoryBn,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchaseValue,
        currentValue,
        location,
        responsiblePerson,
        responsiblePersonPhone,
        condition,
        conditionBn,
        nextServiceDate,
        warrantyInfo,
        supplier,
        sourceOfPurchase,
        notes,
        description,
        photoUrl,
        attachments,
        termId,
        termTitle,
        expenseVoucherNumber,
        expenseEntryId,
        createExpenseVoucher,
        accountId,
        expenseHeadId
      } = payload;

      if (!name || !name.trim()) {
        throw new DalDomainError('VALIDATION_ERROR', 'সম্পদের নাম আবশ্যক।');
      }

      const categoryPrefixMap: Record<string, string> = {
        GENERATOR: 'GEN', FAN: 'FAN', AC: 'AC', REFRIGERATOR: 'FRG', DEEP_FREEZER: 'DFZ',
        SOUND_SYSTEM: 'SND', CCTV: 'CCTV', COMPUTER_ICT: 'ICT', FURNITURE: 'FUR',
        ELECTRICAL: 'ELE', WATER_WUDU: 'WDU', CONSTRUCTION: 'CON', RELIGIOUS: 'REL', OTHER: 'AST'
      };

      const prefix = categoryPrefixMap[category] || 'AST';
      const count = (this.dataSource.assets || []).filter((a: any) => a.mosqueId === mosqueId).length + 1;
      const autoCode = `AST-${prefix}-${String(count).padStart(3, '0')}`;
      const assetCode = customCode && customCode.trim() ? customCode.trim() : autoCode;

      const activeTerm = (this.dataSource.committeeTerms || []).find((t: any) => t.mosqueId === mosqueId && t.status === 'ACTIVE');
      const selectedTermId = termId || activeTerm?.id || '';
      const selectedTermTitle = termTitle || activeTerm?.title || '';

      const parsedPurchaseValue = Number(purchaseValue) || 0;
      const parsedCurrentValue = currentValue !== undefined && currentValue !== null && currentValue !== '' ? Number(currentValue) : parsedPurchaseValue;

      let linkedVoucherNo = expenseVoucherNumber || '';
      let linkedExpenseId = expenseEntryId || '';

      if (createExpenseVoucher && parsedPurchaseValue > 0 && accountId && expenseHeadId) {
        const account = (this.dataSource.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId);
        const head = (this.dataSource.accountHeads || []).find((h: any) => h.id === expenseHeadId && h.mosqueId === mosqueId);

        if (account && head) {
          const expCount = (this.dataSource.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1;
          const year = new Date().getFullYear();
          const expVoucherNo = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
          const newExpId = `exp-${Date.now()}`;

          const expenseEntry = {
            id: newExpId,
            mosqueId,
            voucherNumber: expVoucherNo,
            date: purchaseDate || new Date().toISOString().split('T')[0],
            mainHeadId: head.id,
            mainHeadNameBn: head.nameBn,
            subHeadNameBn: categoryBn || 'স্থায়ী সম্পদ ক্রয়',
            amount: parsedPurchaseValue,
            accountId: account.id,
            accountName: account.name || account.nameBn,
            payeeName: supplier || responsiblePerson || 'সরবরাহকারী',
            paymentMethod: account.accountType === 'CASH' ? 'CASH' : 'BANK',
            description: `সম্পদ ক্রয় ভাউচার: ${name} (${assetCode})${brand ? ' | ' + brand : ''}`,
            status: 'APPROVED',
            createdBy: actor.userId,
            createdByName: actor.userName,
            approvedBy: actor.userId,
            approvedByName: actor.userName,
            approvedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          account.currentBalance -= parsedPurchaseValue;
          if (!tx.expenseEntries) tx.expenseEntries = [];
          tx.expenseEntries.unshift(expenseEntry);
          linkedVoucherNo = expVoucherNo;
          linkedExpenseId = newExpId;

          tx.logAudit(
            mosqueId,
            actor.userId,
            actor.userName,
            actor.userRole,
            'CREATE',
            'EXPENSE',
            `সম্পদ ক্রয়ের সাথে স্বয়ংক্রিয় ব্যয় ভাউচার তৈরি (${expVoucherNo}): ৳${parsedPurchaseValue} (${name})`
          );
        }
      }

      const asset = {
        id: `ast-${Date.now()}`,
        mosqueId,
        assetCode,
        name: name.trim(),
        category: category || 'OTHER',
        categoryBn: categoryBn || '',
        brand: brand || '',
        model: model || '',
        serialNumber: serialNumber || '',
        purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
        purchaseValue: parsedPurchaseValue,
        currentValue: parsedCurrentValue,
        location: location || 'মূল ভবন',
        responsiblePerson: responsiblePerson || '',
        responsiblePersonPhone: responsiblePersonPhone || '',
        condition: condition || 'GOOD',
        conditionBn: conditionBn || '',
        nextServiceDate: nextServiceDate || '',
        warrantyInfo: warrantyInfo || '',
        supplier: supplier || '',
        sourceOfPurchase: sourceOfPurchase || '',
        notes: notes || '',
        description: description || '',
        photoUrl: photoUrl || '',
        attachments: attachments || [],
        serviceHistory: [],
        expenseVoucherNumber: linkedVoucherNo,
        expenseEntryId: linkedExpenseId,
        isExpenseLinked: Boolean(linkedVoucherNo || linkedExpenseId),
        termId: selectedTermId,
        termTitle: selectedTermTitle,
        isArchived: false,
        isDeleted: false,
        isDemo: false,
        createdBy: actor.userId,
        createdByName: actor.userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!this.dataSource.assets) this.dataSource.assets = [];
      this.dataSource.assets.unshift(asset);

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'ASSET',
        `নতুন সম্পদ রেজিস্ট্রি: ${asset.name} (${asset.assetCode}) | ক্রয়মূল্য: ৳${asset.purchaseValue} | অবস্থা: ${asset.condition}`
      );

      return asset;
    });
  }

  async update(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const asset = (this.dataSource.assets || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (!asset) throw new DalDomainError('NOT_FOUND', 'সম্পদ পাওয়া যায়নি।');

    const prevCondition = asset.condition;
    const prevValue = asset.currentValue;

    Object.assign(asset, payload);
    if (payload.name) asset.name = payload.name.trim();
    if (payload.purchaseValue !== undefined) asset.purchaseValue = Number(payload.purchaseValue) || 0;
    if (payload.currentValue !== undefined) asset.currentValue = Number(payload.currentValue) || 0;
    asset.updatedAt = new Date().toISOString();

    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    let changeDetail = `সম্পদের তথ্য আপডেট: ${asset.name} (${asset.assetCode})`;
    if (prevCondition !== asset.condition) changeDetail += ` | অবস্থা পরিবর্তন: ${prevCondition} → ${asset.condition}`;
    if (prevValue !== asset.currentValue) changeDetail += ` | বর্তমান মূল্য: ৳${prevValue} → ৳${asset.currentValue}`;

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(mosqueId, actor.userId, actor.userName, actor.userRole, 'UPDATE', 'ASSET', changeDetail);
    }

    return asset;
  }

  async addServiceRecord(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const asset = (this.dataSource.assets || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (!asset) throw new DalDomainError('NOT_FOUND', 'সম্পদ পাওয়া যায়নি।');

    const { description, cost, serviceDate, serviceType, serviceTypeBn, servicedBy, nextServiceDate, updateConditionTo, createMaintenanceExpense, accountId, expenseHeadId } = payload;
    if (!description || !description.trim()) throw new DalDomainError('VALIDATION_ERROR', 'সার্ভিসিং / মেরামতের বিবরণ আবশ্যক।');

    const serviceCost = Number(cost) || 0;
    let serviceVoucherNo = '';
    let serviceExpenseId = '';

    return runWithDomainErrorUnwrap(this.dataSource, (tx) => {
      if (createMaintenanceExpense && serviceCost > 0 && accountId && expenseHeadId) {
        const account = (this.dataSource.accounts || []).find((a: any) => a.id === accountId && a.mosqueId === mosqueId);
        const head = (this.dataSource.accountHeads || []).find((h: any) => h.id === expenseHeadId && h.mosqueId === mosqueId);

        if (account && head) {
          const expCount = (this.dataSource.expenseEntries || []).filter((e: any) => e.mosqueId === mosqueId).length + 1;
          const year = new Date().getFullYear();
          const expVoucherNo = `EXP-${year}-${String(expCount).padStart(6, '0')}`;
          const newExpId = `exp-${Date.now()}`;

          const expenseEntry = {
            id: newExpId,
            mosqueId,
            voucherNumber: expVoucherNo,
            date: serviceDate || new Date().toISOString().split('T')[0],
            mainHeadId: head.id,
            mainHeadNameBn: head.nameBn,
            subHeadNameBn: serviceTypeBn || 'সম্পদ মেরামত ও সার্ভিসিং',
            amount: serviceCost,
            accountId: account.id,
            accountName: account.name || account.nameBn,
            payeeName: servicedBy || 'সার্ভিসিং টেকনিশিয়ান',
            paymentMethod: account.accountType === 'CASH' ? 'CASH' : 'BANK',
            description: `সম্পদ মেরামত/সার্ভিসিং খরচ: ${asset.name} (${asset.assetCode}) - ${description}`,
            status: 'APPROVED',
            createdBy: actor.userId,
            createdByName: actor.userName,
            approvedBy: actor.userId,
            approvedByName: actor.userName,
            approvedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          account.currentBalance -= serviceCost;
          if (!tx.expenseEntries) tx.expenseEntries = [];
          tx.expenseEntries.unshift(expenseEntry);
          serviceVoucherNo = expVoucherNo;
          serviceExpenseId = newExpId;

          tx.logAudit(
            mosqueId,
            actor.userId,
            actor.userName,
            actor.userRole,
            'CREATE',
            'EXPENSE',
            `সম্পদ সার্ভিসিং খরচ বাবদ ব্যয় ভাউচার তৈরি (${expVoucherNo}): ৳${serviceCost} (${asset.name})`
          );
        }
      }

      const serviceRecord = {
        id: `srv-${Date.now()}`,
        serviceDate: serviceDate || new Date().toISOString().split('T')[0],
        serviceType: serviceType || 'REGULAR_MAINTENANCE',
        serviceTypeBn: serviceTypeBn || 'নিয়মিত সার্ভিসিং',
        servicedBy: servicedBy || '',
        cost: serviceCost,
        expenseVoucherNumber: serviceVoucherNo,
        expenseEntryId: serviceExpenseId,
        description: description.trim(),
        nextServiceDate: nextServiceDate || '',
        performedBy: actor.userName,
        createdAt: new Date().toISOString()
      };

      if (!asset.serviceHistory) asset.serviceHistory = [];
      asset.serviceHistory.unshift(serviceRecord);
      if (nextServiceDate) asset.nextServiceDate = nextServiceDate;
      if (updateConditionTo) asset.condition = updateConditionTo;
      asset.updatedAt = new Date().toISOString();

      tx.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'CREATE',
        'ASSET',
        `সম্পদ সার্ভিসিং লগ যুক্ত: ${asset.name} (${asset.assetCode}) | খরচ: ৳${serviceCost} | বিবরণ: ${description}`
      );

      return asset;
    });
  }

  async toggleArchive(options: DALOptions, id: string, payload: Record<string, any> = {}): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const asset = (this.dataSource.assets || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (!asset) throw new DalDomainError('NOT_FOUND', 'সম্পদ পাওয়া যায়নি।');

    asset.isArchived = payload.isArchived !== undefined ? Boolean(payload.isArchived) : !asset.isArchived;
    asset.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    const actionText = asset.isArchived ? 'আর্কাইভ' : 'সক্রিয়করণ';
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'UPDATE',
        'ASSET',
        `সম্পদ ${actionText}: ${asset.name} (${asset.assetCode})${payload.reason ? ' | কারণ: ' + payload.reason : ''}`
      );
    }

    return asset;
  }

  async deleteOrArchive(options: DALOptions, id: string, force?: boolean): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const idx = (this.dataSource.assets || []).findIndex((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'সম্পদ পাওয়া যায়নি।');

    const asset = this.dataSource.assets![idx];
    const hasHistory = Boolean(asset.expenseVoucherNumber || (asset.serviceHistory && asset.serviceHistory.length > 0));

    if (hasHistory && !force) {
      asset.isArchived = true;
      asset.updatedAt = new Date().toISOString();
      if (typeof this.dataSource.save === 'function') this.dataSource.save();

      if (typeof this.dataSource.logAudit === 'function') {
        this.dataSource.logAudit(
          mosqueId,
          actor.userId,
          actor.userName,
          actor.userRole,
          'DELETE',
          'ASSET',
          `সম্পদ আর্কাইভ (আর্থিক লেনদেন সংযুক্ত থাকার কারণে সফট-ডিলিট): ${asset.name} (${asset.assetCode})`
        );
      }
      return { asset, isArchived: true };
    }

    const removed = this.dataSource.assets!.splice(idx, 1)[0];
    if (typeof this.dataSource.save === 'function') this.dataSource.save();

    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'ASSET',
        `সম্পদ স্থায়ীভাবে মুছে ফেলা: ${removed.name} (${removed.assetCode})`
      );
    }
    return { asset: removed, isDeleted: true };
  }

  async clearDemo(options: DALOptions): Promise<{ removedCount: number }> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const initialCount = (this.dataSource.assets || []).length;
    this.dataSource.assets = (this.dataSource.assets || []).filter((a: any) => !(a.mosqueId === mosqueId && a.isDemo));
    const removedCount = initialCount - (this.dataSource.assets || []).length;

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        'DELETE',
        'ASSET',
        `ডেমো সম্পদ রেকর্ড সফলভাবে পরিচ্ছন্ন করা হয়েছে (${removedCount} টি রেকর্ড)`
      );
    }

    return { removedCount };
  }

  async logAudit(options: DALOptions, id: string, action?: string, details?: string): Promise<void> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const actor = resolveActorMeta(this.dataSource, activeOptions);

    const asset = (this.dataSource.assets || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (typeof this.dataSource.logAudit === 'function') {
      this.dataSource.logAudit(
        mosqueId,
        actor.userId,
        actor.userName,
        actor.userRole,
        action || 'PRINT',
        'ASSET',
        details || `সম্পদ তথ্য প্রিন্ট/রিপোর্ট দেখা হয়েছে: ${asset ? asset.name + ' (' + asset.assetCode + ')' : id}`
      );
    }
  }
}

/**
 * JsonMusalliParityRepository (Phase 1B.13): Musalli & Donor Management Domain DAL Repository.
 */
export class JsonMusalliParityRepository implements IMusalliRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async listAreas(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.areas || []).filter((a: any) => a.mosqueId === mosqueId)).map((a: any) => ({ ...a }));
  }

  async getAreaById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const area = (this.dataSource.areas || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    return area ? { ...area } : null;
  }

  async createArea(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `area-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.areas) this.dataSource.areas = [];
    this.dataSource.areas.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateArea(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const area = (this.dataSource.areas || []).find((a: any) => a.id === id && a.mosqueId === mosqueId);
    if (!area) throw new DalDomainError('NOT_FOUND', 'এলাকা পাওয়া যায়নি।');
    Object.assign(area, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return area;
  }

  async updateAreaStatus(options: DALOptions, id: string, status: string): Promise<any> {
    return this.updateArea(options, id, { status, isActive: status === 'ACTIVE' });
  }

  async listFamilies(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.families || []).filter((f: any) => f.mosqueId === mosqueId)).map((f: any) => ({ ...f }));
  }

  async getFamilyById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const fam = (this.dataSource.families || []).find((f: any) => f.id === id && f.mosqueId === mosqueId);
    return fam ? { ...fam } : null;
  }

  async checkFamilyDuplicate(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const { headName, headMobile } = payload;
    const matches = (this.dataSource.families || []).filter(
      (f: any) => f.mosqueId === mosqueId && (f.headName === headName || f.headMobile === headMobile)
    );
    return { isDuplicate: matches.length > 0, matches };
  }

  async createFamily(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `fam-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.families) this.dataSource.families = [];
    this.dataSource.families.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateFamily(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const fam = (this.dataSource.families || []).find((f: any) => f.id === id && f.mosqueId === mosqueId);
    if (!fam) throw new DalDomainError('NOT_FOUND', 'পরিবার রেকর্ড পাওয়া যায়নি।');
    Object.assign(fam, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return fam;
  }

  async updateFamilyStatus(options: DALOptions, id: string, status: string): Promise<any> {
    return this.updateFamily(options, id, { status, isActive: status === 'ACTIVE' });
  }

  async listPersons(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.persons || []).filter((p: any) => p.mosqueId === mosqueId)).map((p: any) => ({ ...p }));
  }

  async getPersonById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const p = (this.dataSource.persons || []).find((person: any) => person.id === id && person.mosqueId === mosqueId);
    return p ? { ...p } : null;
  }

  async checkPersonDuplicate(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const { name, mobile, nid } = payload;
    const matches = (this.dataSource.persons || []).filter(
      (p: any) => p.mosqueId === mosqueId && ((mobile && p.mobile === mobile) || (nid && p.nid === nid))
    );
    return { isDuplicate: matches.length > 0, matches };
  }

  async createPerson(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `per-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.persons) this.dataSource.persons = [];
    this.dataSource.persons.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updatePerson(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const p = (this.dataSource.persons || []).find((person: any) => person.id === id && person.mosqueId === mosqueId);
    if (!p) throw new DalDomainError('NOT_FOUND', 'মুসল্লী রেকর্ড পাওয়া যায়নি।');
    Object.assign(p, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return p;
  }

  async updatePersonStatus(options: DALOptions, id: string, status: string): Promise<any> {
    return this.updatePerson(options, id, { status, isActive: status === 'ACTIVE' });
  }

  async listDonationPlans(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.donationPlans || []).filter((dp: any) => dp.mosqueId === mosqueId)).map((dp: any) => ({ ...dp }));
  }

  async getDonationPlanById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const plan = (this.dataSource.donationPlans || []).find((dp: any) => dp.id === id && dp.mosqueId === mosqueId);
    return plan ? { ...plan } : null;
  }

  async checkPlanOverlap(options: DALOptions, payload: Record<string, any>): Promise<any> {
    return { hasOverlap: false };
  }

  async createDonationPlan(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `plan-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.donationPlans) this.dataSource.donationPlans = [];
    this.dataSource.donationPlans.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateDonationPlan(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const plan = (this.dataSource.donationPlans || []).find((dp: any) => dp.id === id && dp.mosqueId === mosqueId);
    if (!plan) throw new DalDomainError('NOT_FOUND', 'দান প্ল্যান পাওয়া যায়নি।');
    Object.assign(plan, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return plan;
  }

  async updatePlanStatus(options: DALOptions, id: string, status: string): Promise<any> {
    return this.updateDonationPlan(options, id, { status, isActive: status === 'ACTIVE' });
  }

  async deleteDonationPlan(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.donationPlans || []).findIndex((dp: any) => dp.id === id && dp.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'দান প্ল্যান পাওয়া যায়নি।');
    const [removed] = this.dataSource.donationPlans!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async listCollectionWorkers(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.collectionWorkers || []).filter((cw: any) => cw.mosqueId === mosqueId)).map((cw: any) => ({ ...cw }));
  }

  async getCollectionWorkerById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const cw = (this.dataSource.collectionWorkers || []).find((worker: any) => worker.id === id && worker.mosqueId === mosqueId);
    return cw ? { ...cw } : null;
  }

  async createCollectionWorker(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `worker-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.collectionWorkers) this.dataSource.collectionWorkers = [];
    this.dataSource.collectionWorkers.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateCollectionWorker(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const cw = (this.dataSource.collectionWorkers || []).find((worker: any) => worker.id === id && worker.mosqueId === mosqueId);
    if (!cw) throw new DalDomainError('NOT_FOUND', 'আদায়কারী কর্মীর রেকর্ড পাওয়া যায়নি।');
    Object.assign(cw, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return cw;
  }

  async updateWorkerStatus(options: DALOptions, id: string, status: string): Promise<any> {
    return this.updateCollectionWorker(options, id, { status, isActive: status === 'ACTIVE' });
  }

  async getMusalliStats(options: DALOptions): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const persons = (this.dataSource.persons || []).filter((p: any) => p.mosqueId === mosqueId);
    const families = (this.dataSource.families || []).filter((f: any) => f.mosqueId === mosqueId);
    const areas = (this.dataSource.areas || []).filter((a: any) => a.mosqueId === mosqueId);
    const plans = (this.dataSource.donationPlans || []).filter((dp: any) => dp.mosqueId === mosqueId);
    const workers = (this.dataSource.collectionWorkers || []).filter((cw: any) => cw.mosqueId === mosqueId);

    return {
      totalMusallis: persons.length,
      activeMusallis: persons.filter((p: any) => p.status === 'ACTIVE').length,
      totalFamilies: families.length,
      totalAreas: areas.length,
      totalActiveDonationPlans: plans.filter((dp: any) => dp.status === 'ACTIVE').length,
      totalCollectionWorkers: workers.length,
    };
  }
}

/**
 * JsonEducationParityRepository (Phase 1B.13): Education Domain DAL Repository.
 */
export class JsonEducationParityRepository implements IEducationRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async getDashboardStats(options: DALOptions): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);

    const students = (this.dataSource.educationStudents || []).filter((s: any) => s.mosqueId === mosqueId);
    const programs = (this.dataSource.educationPrograms || []).filter((p: any) => p.mosqueId === mosqueId);
    const levels = (this.dataSource.educationLevels || []).filter((l: any) => l.mosqueId === mosqueId);
    const enrollments = (this.dataSource.educationEnrollments || []).filter((e: any) => e.mosqueId === mosqueId);

    return {
      totalStudents: students.length,
      activeStudents: students.filter((s: any) => s.status === 'ACTIVE').length,
      totalPrograms: programs.length,
      totalLevels: levels.length,
      totalEnrollments: enrollments.length,
    };
  }

  async listPrograms(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.educationPrograms || []).filter((p: any) => p.mosqueId === mosqueId)).map((p: any) => ({ ...p }));
  }

  async createProgram(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `edu-prog-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.educationPrograms) this.dataSource.educationPrograms = [];
    this.dataSource.educationPrograms.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateProgram(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const prog = (this.dataSource.educationPrograms || []).find((p: any) => p.id === id && p.mosqueId === mosqueId);
    if (!prog) throw new DalDomainError('NOT_FOUND', 'শিক্ষা প্রোগ্রাম পাওয়া যায়নি।');
    Object.assign(prog, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return prog;
  }

  async listLevels(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.educationLevels || []).filter((l: any) => l.mosqueId === mosqueId)).map((l: any) => ({ ...l }));
  }

  async createLevel(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `edu-lvl-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.educationLevels) this.dataSource.educationLevels = [];
    this.dataSource.educationLevels.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateLevel(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const lvl = (this.dataSource.educationLevels || []).find((l: any) => l.id === id && l.mosqueId === mosqueId);
    if (!lvl) throw new DalDomainError('NOT_FOUND', 'শিক্ষা লেভেল/শ্রেণী পাওয়া যায়নি।');
    Object.assign(lvl, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return lvl;
  }

  async listStudents(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.educationStudents || []).filter((s: any) => s.mosqueId === mosqueId)).map((s: any) => ({ ...s }));
  }

  async getStudentById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const st = (this.dataSource.educationStudents || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    return st ? { ...st } : null;
  }

  async createStudent(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `std-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.educationStudents) this.dataSource.educationStudents = [];
    this.dataSource.educationStudents.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateStudent(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const st = (this.dataSource.educationStudents || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!st) throw new DalDomainError('NOT_FOUND', 'শিক্ষার্থী প্রোফাইল পাওয়া যায়নি।');
    Object.assign(st, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return st;
  }

  async deleteStudent(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.educationStudents || []).findIndex((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'শিক্ষার্থী প্রোফাইল পাওয়া যায়নি।');
    const [removed] = this.dataSource.educationStudents!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async listGuardians(options: DALOptions, studentId: string): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const st = (this.dataSource.educationStudents || []).find((s: any) => s.id === studentId && s.mosqueId === mosqueId);
    return st?.guardians || [];
  }

  async addGuardian(options: DALOptions, studentId: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const st = (this.dataSource.educationStudents || []).find((s: any) => s.id === studentId && s.mosqueId === mosqueId);
    if (!st) throw new DalDomainError('NOT_FOUND', 'শিক্ষার্থী প্রোফাইল পাওয়া যায়নি।');
    if (!st.guardians) st.guardians = [];
    st.guardians.push(payload);
    st.updatedAt = new Date().toISOString();
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return st;
  }

  async removeGuardian(options: DALOptions, studentId: string, guardianPersonId: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const st = (this.dataSource.educationStudents || []).find((s: any) => s.id === studentId && s.mosqueId === mosqueId);
    if (!st) throw new DalDomainError('NOT_FOUND', 'শিক্ষার্থী প্রোফাইল পাওয়া যায়নি।');
    if (st.guardians) {
      st.guardians = st.guardians.filter((g: any) => g.personId !== guardianPersonId && g.id !== guardianPersonId);
      st.updatedAt = new Date().toISOString();
      if (typeof this.dataSource.save === 'function') this.dataSource.save();
    }
    return st;
  }

  async listEnrollments(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.educationEnrollments || []).filter((e: any) => e.mosqueId === mosqueId)).map((e: any) => ({ ...e }));
  }

  async getEnrollmentById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const en = (this.dataSource.educationEnrollments || []).find((e: any) => e.id === id && e.mosqueId === mosqueId);
    return en ? { ...en } : null;
  }

  async createEnrollment(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `enr-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.educationEnrollments) this.dataSource.educationEnrollments = [];
    this.dataSource.educationEnrollments.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateEnrollment(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const en = (this.dataSource.educationEnrollments || []).find((e: any) => e.id === id && e.mosqueId === mosqueId);
    if (!en) throw new DalDomainError('NOT_FOUND', 'ভর্তি/এনরোলমেন্ট রেকর্ড পাওয়া যায়নি।');
    Object.assign(en, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return en;
  }
}

/**
 * JsonLibraryParityRepository (Phase 1B.13): Library & Knowledge Center Domain DAL Repository.
 */
export class JsonLibraryParityRepository implements ILibraryRepository {
  constructor(
    private dataSource: JsonDataSourceContract = db,
    private defaultOptions?: DALOptions
  ) {}

  async listCategories(options: DALOptions): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.libraryCategories || []).filter((c: any) => c.mosqueId === mosqueId)).map((c: any) => ({ ...c }));
  }

  async createCategory(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `cat-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryCategories) this.dataSource.libraryCategories = [];
    this.dataSource.libraryCategories.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateCategory(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const cat = (this.dataSource.libraryCategories || []).find((c: any) => c.id === id && c.mosqueId === mosqueId);
    if (!cat) throw new DalDomainError('NOT_FOUND', 'লাইব্রেরি ক্যাটাগরি পাওয়া যায়নি।');
    Object.assign(cat, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return cat;
  }

  async deleteCategory(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.libraryCategories || []).findIndex((c: any) => c.id === id && c.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'লাইব্রেরি ক্যাটাগরি পাওয়া যায়নি।');
    const [removed] = this.dataSource.libraryCategories!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async listBookTitles(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.libraryBookTitles || []).filter((bt: any) => bt.mosqueId === mosqueId)).map((bt: any) => ({ ...bt }));
  }

  async getBookTitleById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const bt = (this.dataSource.libraryBookTitles || []).find((t: any) => t.id === id && t.mosqueId === mosqueId);
    return bt ? { ...bt } : null;
  }

  async createBookTitle(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `book-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryBookTitles) this.dataSource.libraryBookTitles = [];
    this.dataSource.libraryBookTitles.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateBookTitle(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const bt = (this.dataSource.libraryBookTitles || []).find((t: any) => t.id === id && t.mosqueId === mosqueId);
    if (!bt) throw new DalDomainError('NOT_FOUND', 'বইয়ের রেকর্ড পাওয়া যায়নি।');
    Object.assign(bt, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return bt;
  }

  async deleteBookTitle(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.libraryBookTitles || []).findIndex((t: any) => t.id === id && t.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'বইয়ের রেকর্ড পাওয়া যায়নি।');
    const [removed] = this.dataSource.libraryBookTitles!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async listBookCopies(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.libraryBookCopies || []).filter((bc: any) => bc.mosqueId === mosqueId)).map((bc: any) => ({ ...bc }));
  }

  async getBookCopyById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const bc = (this.dataSource.libraryBookCopies || []).find((c: any) => c.id === id && c.mosqueId === mosqueId);
    return bc ? { ...bc } : null;
  }

  async lookupByBookId(options: DALOptions, bookId: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const copy = (this.dataSource.libraryBookCopies || []).find((c: any) => c.mosqueId === mosqueId && (c.id === bookId || c.accessionNo === bookId || c.barcode === bookId));
    return copy ? { ...copy } : null;
  }

  async createBookCopy(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `copy-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryBookCopies) this.dataSource.libraryBookCopies = [];
    this.dataSource.libraryBookCopies.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async bulkCreateBookCopies(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const copies = payload.copies || [];
    const created: any[] = [];
    for (const c of copies) {
      const item = { ...c, id: c.id || `copy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, mosqueId, createdAt: new Date().toISOString() };
      if (!this.dataSource.libraryBookCopies) this.dataSource.libraryBookCopies = [];
      this.dataSource.libraryBookCopies.unshift(item);
      created.push(item);
    }
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return created;
  }

  async updateBookCopy(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const bc = (this.dataSource.libraryBookCopies || []).find((c: any) => c.id === id && c.mosqueId === mosqueId);
    if (!bc) throw new DalDomainError('NOT_FOUND', 'বইয়ের কপি পাওয়া যায়নি।');
    Object.assign(bc, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return bc;
  }

  async updateCopyStatus(options: DALOptions, id: string, status: string, notes?: string): Promise<any> {
    return this.updateBookCopy(options, id, { status, notes });
  }

  async listMembers(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.libraryMembers || []).filter((m: any) => m.mosqueId === mosqueId)).map((m: any) => ({ ...m }));
  }

  async getMemberById(options: DALOptions, id: string): Promise<any | null> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const mem = (this.dataSource.libraryMembers || []).find((m: any) => m.id === id && m.mosqueId === mosqueId);
    return mem ? { ...mem } : null;
  }

  async createMember(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `mem-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryMembers) this.dataSource.libraryMembers = [];
    this.dataSource.libraryMembers.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateMember(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const mem = (this.dataSource.libraryMembers || []).find((m: any) => m.id === id && m.mosqueId === mosqueId);
    if (!mem) throw new DalDomainError('NOT_FOUND', 'লাইব্রেরি সদস্য পাওয়া যায়নি।');
    Object.assign(mem, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return mem;
  }

  async listIssues(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.libraryIssues || []).filter((i: any) => i.mosqueId === mosqueId)).map((i: any) => ({ ...i }));
  }

  async issueBook(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `issue-${Date.now()}`, mosqueId, status: 'ISSUED', issueDate: payload.issueDate || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryIssues) this.dataSource.libraryIssues = [];
    this.dataSource.libraryIssues.unshift(item);

    const copy = (this.dataSource.libraryBookCopies || []).find((c: any) => c.id === payload.bookCopyId && c.mosqueId === mosqueId);
    if (copy) {
      copy.status = 'ISSUED';
      copy.updatedAt = new Date().toISOString();
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async returnBook(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const issue = (this.dataSource.libraryIssues || []).find((i: any) => i.id === id && i.mosqueId === mosqueId);
    if (!issue) throw new DalDomainError('NOT_FOUND', 'ইস্যু রেকর্ড পাওয়া যায়নি।');

    issue.status = 'RETURNED';
    issue.returnDate = payload.returnDate || new Date().toISOString().split('T')[0];
    issue.fineAmount = Number(payload.fineAmount) || 0;
    issue.updatedAt = new Date().toISOString();

    const copy = (this.dataSource.libraryBookCopies || []).find((c: any) => c.id === issue.bookCopyId && c.mosqueId === mosqueId);
    if (copy) {
      copy.status = 'AVAILABLE';
      copy.updatedAt = new Date().toISOString();
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return issue;
  }

  async markLost(options: DALOptions, id: string, payload: Record<string, any> = {}): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const issue = (this.dataSource.libraryIssues || []).find((i: any) => i.id === id && i.mosqueId === mosqueId);
    if (!issue) throw new DalDomainError('NOT_FOUND', 'ইস্যু রেকর্ড পাওয়া যায়নি।');

    issue.status = 'LOST';
    issue.updatedAt = new Date().toISOString();

    const copy = (this.dataSource.libraryBookCopies || []).find((c: any) => c.id === issue.bookCopyId && c.mosqueId === mosqueId);
    if (copy) {
      copy.status = 'LOST';
      copy.updatedAt = new Date().toISOString();
    }

    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return issue;
  }

  async listAcquisitions(options: DALOptions, query: any = {}): Promise<any[]> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return ((this.dataSource.libraryAcquisitions || []).filter((a: any) => a.mosqueId === mosqueId)).map((a: any) => ({ ...a }));
  }

  async createAcquisition(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `acq-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryAcquisitions) this.dataSource.libraryAcquisitions = [];
    this.dataSource.libraryAcquisitions.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async getLocations(options: DALOptions): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    return {
      rooms: ((this.dataSource.libraryRooms || []).filter((r: any) => r.mosqueId === mosqueId)).map((r: any) => ({ ...r })),
      racks: ((this.dataSource.libraryRacks || []).filter((r: any) => r.mosqueId === mosqueId)).map((r: any) => ({ ...r })),
      shelves: ((this.dataSource.libraryShelves || []).filter((s: any) => s.mosqueId === mosqueId)).map((s: any) => ({ ...s })),
    };
  }

  async createRoom(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `room-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryRooms) this.dataSource.libraryRooms = [];
    this.dataSource.libraryRooms.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateRoom(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const room = (this.dataSource.libraryRooms || []).find((r: any) => r.id === id && r.mosqueId === mosqueId);
    if (!room) throw new DalDomainError('NOT_FOUND', 'রুম পাওয়া যায়নি।');
    Object.assign(room, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return room;
  }

  async deleteRoom(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.libraryRooms || []).findIndex((r: any) => r.id === id && r.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'রুম পাওয়া যায়নি।');
    const [removed] = this.dataSource.libraryRooms!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async createRack(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `rack-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryRacks) this.dataSource.libraryRacks = [];
    this.dataSource.libraryRacks.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateRack(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const rack = (this.dataSource.libraryRacks || []).find((r: any) => r.id === id && r.mosqueId === mosqueId);
    if (!rack) throw new DalDomainError('NOT_FOUND', 'র‍্যাক পাওয়া যায়নি।');
    Object.assign(rack, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return rack;
  }

  async deleteRack(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.libraryRacks || []).findIndex((r: any) => r.id === id && r.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'র‍্যাক পাওয়া যায়নি।');
    const [removed] = this.dataSource.libraryRacks!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async createShelf(options: DALOptions, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const item = { ...payload, id: payload.id || `shelf-${Date.now()}`, mosqueId, createdAt: new Date().toISOString() };
    if (!this.dataSource.libraryShelves) this.dataSource.libraryShelves = [];
    this.dataSource.libraryShelves.unshift(item);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return item;
  }

  async updateShelf(options: DALOptions, id: string, payload: Record<string, any>): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const shelf = (this.dataSource.libraryShelves || []).find((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (!shelf) throw new DalDomainError('NOT_FOUND', 'শেলফ পাওয়া যায়নি।');
    Object.assign(shelf, payload, { updatedAt: new Date().toISOString() });
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return shelf;
  }

  async deleteShelf(options: DALOptions, id: string): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const idx = (this.dataSource.libraryShelves || []).findIndex((s: any) => s.id === id && s.mosqueId === mosqueId);
    if (idx === -1) throw new DalDomainError('NOT_FOUND', 'শেলফ পাওয়া যায়নি।');
    const [removed] = this.dataSource.libraryShelves!.splice(idx, 1);
    if (typeof this.dataSource.save === 'function') this.dataSource.save();
    return removed;
  }

  async getReport(options: DALOptions, reportType: string, query: any = {}): Promise<any> {
    const activeOptions = options || this.defaultOptions;
    const mosqueId = verifyJsonTenantAccess(this.dataSource, activeOptions);
    const titles = (this.dataSource.libraryBookTitles || []).filter((t: any) => t.mosqueId === mosqueId);
    const copies = (this.dataSource.libraryBookCopies || []).filter((c: any) => c.mosqueId === mosqueId);
    const issues = (this.dataSource.libraryIssues || []).filter((i: any) => i.mosqueId === mosqueId);
    const members = (this.dataSource.libraryMembers || []).filter((m: any) => m.mosqueId === mosqueId);

    return {
      reportType,
      totalTitles: titles.length,
      totalCopies: copies.length,
      availableCopies: copies.filter((c: any) => c.status === 'AVAILABLE').length,
      issuedCopies: copies.filter((c: any) => c.status === 'ISSUED').length,
      totalMembers: members.length,
      totalIssues: issues.length,
    };
  }
}

/**
 * JsonStorageAdapter: Provides scoped DAL instances backed by the JSON storage engine.
 * Preserves Phase 1A read-only mosque slice, Phase 1B.7 financial parity methods,
 * Phase 1B.9 read-only accountHeads and financialAccounts repositories,
 * Phase 1B.12 domain repositories (donations, donationBoxes, staff, properties),
 * and Phase 1B.13 domain repositories (assets, musalli, education, library).
 */
export class JsonStorageAdapter implements IReadOnlyDataAccessLayer, IScopedMutationDataAccessLayer {
  readonly mosque: IMosqueIdentityReadOnlyRepository;
  readonly accountHeads: JsonAccountHeadParityRepository;
  readonly financialAccounts: JsonFinancialAccountParityRepository;
  readonly income: JsonIncomeParityRepository;
  readonly expense: JsonExpenseParityRepository;
  readonly transfers: JsonTransferParityRepository;
  readonly idempotency: JsonIdempotencyParityRepository;
  readonly donations: JsonDonationParityRepository;
  readonly donationBoxes: JsonDonationBoxParityRepository;
  readonly staff: JsonStaffParityRepository;
  readonly properties: JsonPropertyParityRepository;
  readonly assets: JsonAssetParityRepository;
  readonly musalli: JsonMusalliParityRepository;
  readonly education: JsonEducationParityRepository;
  readonly library: JsonLibraryParityRepository;

  constructor(
    options?: DALOptions,
    dataSource: JsonDataSourceContract = db
  ) {
    this.mosque = new JsonMosqueIdentityReadOnlyRepository(dataSource, options);
    this.accountHeads = new JsonAccountHeadParityRepository(dataSource, options);
    this.financialAccounts = new JsonFinancialAccountParityRepository(dataSource, options);
    this.income = new JsonIncomeParityRepository(dataSource, options);
    this.expense = new JsonExpenseParityRepository(dataSource, options);
    this.transfers = new JsonTransferParityRepository(dataSource, options);
    this.idempotency = new JsonIdempotencyParityRepository(dataSource, options);
    this.donations = new JsonDonationParityRepository(dataSource, options);
    this.donationBoxes = new JsonDonationBoxParityRepository(dataSource, options);
    this.staff = new JsonStaffParityRepository(dataSource, options);
    this.properties = new JsonPropertyParityRepository(dataSource, options);
    this.assets = new JsonAssetParityRepository(dataSource, options);
    this.musalli = new JsonMusalliParityRepository(dataSource, options);
    this.education = new JsonEducationParityRepository(dataSource, options);
    this.library = new JsonLibraryParityRepository(dataSource, options);
  }
}


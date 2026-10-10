/**
 * MASJIDLEDGER PRO v2.6 — AUTHORITATIVE DATA ACCESS LAYER (DAL) CONTRACT
 * Checkpoint 1: Unified Data Access Contract & Security Boundary Specifications
 */

import {
  User,
  UserRole,
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
} from '../../../types';

/**
 * Authenticated User Context provided strictly through server-verified JWT claims.
 * ordinary callers/clients CANNOT construct or forge this context.
 */
export interface AuthorizedUserContext {
  userId: string;
  userRole: UserRole;
  userMosqueId: string;
  permissions: Permission[];
}

/**
 * Options required for every tenant-scoped operation in the DAL.
 */
export interface DALOptions {
  /** Target tenant ID for query filtering */
  mosqueId: string;
  /** Server-verified authenticated user context */
  userContext: AuthorizedUserContext;
  /** Client IP address for forensic auditing */
  clientIp?: string;
  /** Optional idempotency key for financial mutation replay protection */
  idempotencyKey?: string;
}

/**
 * Interface contract for Users & Identity Repository operations.
 */
export interface IUserRepository {
  findById(options: DALOptions, userId: string): Promise<User | null>;
  findByPhone(options: DALOptions, phone: string): Promise<User | null>;
  listByMosque(options: DALOptions): Promise<User[]>;
  createUser(options: DALOptions, user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(options: DALOptions, userId: string, updates: Partial<User>): Promise<User>;
}

/**
 * Interface contract for Mosque Metadata & Tenant Settings operations.
 */
export interface IMosqueIdentityRepository {
  findById(mosqueId: string): Promise<Mosque | null>;
  updateSettings(options: DALOptions, updates: Partial<Mosque>): Promise<Mosque>;
}

/**
 * Interface contract for Chart of Accounts (Account Heads) operations.
 */
export interface IAccountHeadRepository {
  list(options: DALOptions): Promise<AccountHead[]>;
  findById(options: DALOptions, headId: string): Promise<AccountHead | null>;
  create(options: DALOptions, head: Omit<AccountHead, 'id'>): Promise<AccountHead>;
}

/**
 * Interface contract for Financial Accounts operations.
 */
export interface IFinancialAccountRepository {
  list(options: DALOptions): Promise<FinancialAccount[]>;
  findById(options: DALOptions, accountId: string): Promise<FinancialAccount | null>;
  updateBalance(options: DALOptions, accountId: string, newBalance: number): Promise<void>;
}

/**
 * Interface contract for Financial Income Ledger operations.
 */
export interface IIncomeRepository {
  list(options: DALOptions): Promise<IncomeEntry[]>;
  findById(options: DALOptions, entryId: string): Promise<IncomeEntry | null>;
  create(options: DALOptions, entry: Omit<IncomeEntry, 'id' | 'voucherNumber'>): Promise<IncomeEntry>;
  reverse(options: DALOptions, entryId: string, reason: string): Promise<IncomeEntry>;
}

/**
 * Interface contract for Financial Expense Ledger operations.
 */
export interface IExpenseRepository {
  list(options: DALOptions): Promise<ExpenseEntry[]>;
  findById(options: DALOptions, entryId: string): Promise<ExpenseEntry | null>;
  create(options: DALOptions, entry: Omit<ExpenseEntry, 'id' | 'voucherNumber'>): Promise<ExpenseEntry>;
  reverse(options: DALOptions, entryId: string, reason: string): Promise<ExpenseEntry>;
}

/**
 * Interface contract for Account Transfers operations.
 */
export interface ITransferRepository {
  list(options: DALOptions): Promise<AccountTransfer[]>;
  create(options: DALOptions, transfer: Omit<AccountTransfer, 'id' | 'transferNumber'>): Promise<AccountTransfer>;
}

/**
 * Interface contract for Forensic Audit Trail operations.
 */
export interface IAuditRepository {
  log(options: DALOptions, action: string, entityType: string, entityId?: string, details?: string, meta?: any): Promise<AuditLog>;
  list(options: DALOptions): Promise<AuditLog[]>;
}

/**
 * Interface contract for Committee Management [LOCKED MODULE].
 */
export interface ICommitteeRepository {
  getActiveTerm(options: DALOptions): Promise<CommitteeTerm | null>;
  listMembers(options: DALOptions, termId: string): Promise<CommitteeMember[]>;
}

/**
 * Master Unified Data Access Layer Interface Contract.
 * Positioned between Express route handlers and database persistence engines.
 */
export interface IDataAccessLayer {
  readonly users: IUserRepository;
  readonly mosque: IMosqueIdentityRepository;
  readonly accountHeads: IAccountHeadRepository;
  readonly financialAccounts: IFinancialAccountRepository;
  readonly income: IIncomeRepository;
  readonly expense: IExpenseRepository;
  readonly transfers: ITransferRepository;
  readonly audit: IAuditRepository;
  readonly committee: ICommitteeRepository;

  /**
   * Execute multi-table transaction in atomic unit of work block.
   */
  executeTransaction<T>(work: (txDal: IDataAccessLayer) => Promise<T>): Promise<T>;
}

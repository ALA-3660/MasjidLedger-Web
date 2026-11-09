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
  userName?: string;
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
 * Read-only interface contract for Mosque Identity operations (Phase 1A).
 */
export interface IMosqueIdentityReadOnlyRepository {
  findById(mosqueId: string, options?: DALOptions): Promise<Mosque | null>;
  getById?(options: DALOptions, mosqueId?: string): Promise<Mosque | null>;
}

/**
 * Interface contract for Mosque Metadata & Tenant Settings operations.
 */
export interface IMosqueIdentityRepository extends IMosqueIdentityReadOnlyRepository {
  findById(mosqueId: string, options?: DALOptions): Promise<Mosque | null>;
  updateSettings(options: DALOptions, updates: Partial<Mosque>): Promise<Mosque>;
}

/**
 * Input payload for creating an Account Head (code is optional and auto-generated if omitted).
 */
export type CreateAccountHeadInput = Omit<AccountHead, 'id' | 'code'> & {
  code?: string;
};

/**
 * Input payload for updating an Account Head.
 */
export interface UpdateAccountHeadInput {
  nameBn?: string;
  nameEn?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isActive?: boolean;
  parentId?: string | null;
}

/**
 * Result of deleting or archiving an Account Head.
 */
export interface DeleteAccountHeadResult {
  action: 'DELETED' | 'ARCHIVED';
  head: AccountHead;
  usageCount: number;
}

/**
 * Interface contract for Chart of Accounts (Account Heads) operations.
 */
export interface IAccountHeadRepository {
  list(options: DALOptions): Promise<AccountHead[]>;
  findById(options: DALOptions, headId: string): Promise<AccountHead | null>;
  create(options: DALOptions, head: CreateAccountHeadInput): Promise<AccountHead>;
  update(options: DALOptions, headId: string, updates: UpdateAccountHeadInput): Promise<AccountHead>;
  deleteOrArchive(options: DALOptions, headId: string): Promise<DeleteAccountHeadResult>;
}

/**
 * Input payload for creating a Financial Account.
 */
export type CreateFinancialAccountInput = Omit<FinancialAccount, 'id' | 'currentBalance' | 'createdAt'> & {
  currentBalance?: number;
  createdAt?: string;
};

/**
 * Input payload for updating a Financial Account.
 */
export type UpdateFinancialAccountInput = Partial<FinancialAccount>;

/**
 * Input payload for setting/adjusting a Financial Account's Opening Balance.
 */
export interface SetOpeningBalanceInput {
  openingBalance?: number;
  openingBalanceDate?: string;
  openingBalanceType?: 'DEBIT' | 'CREDIT';
  openingBalanceSource?: string;
  openingBalanceNote?: string;
}

/**
 * Interface contract for Financial Accounts operations.
 */
export interface IFinancialAccountRepository {
  list(options: DALOptions): Promise<FinancialAccount[]>;
  findById(options: DALOptions, accountId: string): Promise<FinancialAccount | null>;
  create(options: DALOptions, account: CreateFinancialAccountInput): Promise<FinancialAccount>;
  update(options: DALOptions, accountId: string, updates: UpdateFinancialAccountInput): Promise<FinancialAccount>;
  setOpeningBalance(options: DALOptions, accountId: string, input: SetOpeningBalanceInput): Promise<FinancialAccount>;
  updateBalance(options: DALOptions, accountId: string, newBalance: number): Promise<void>;
}

/**
 * Input payload for updating an Income Entry.
 */
export interface UpdateIncomeInput {
  amount?: number;
  donorName?: string;
  donorPhone?: string;
  reference?: string;
  description?: string;
  date?: string;
  denominationData?: any;
  accountId?: string;
  paymentMethod?: any;
  mainHeadId?: string;
  subHeadId?: string;
}

/**
 * Interface contract for Financial Income Ledger operations.
 */
export interface IIncomeRepository {
  list(options: DALOptions): Promise<IncomeEntry[]>;
  findById(options: DALOptions, entryId: string): Promise<IncomeEntry | null>;
  create(options: DALOptions, entry: Omit<IncomeEntry, 'id' | 'voucherNumber'>): Promise<IncomeEntry>;
  update(options: DALOptions, entryId: string, updates: UpdateIncomeInput): Promise<IncomeEntry>;
  updateDenomination(options: DALOptions, entryId: string, denominationData: any, editReason?: string): Promise<IncomeEntry>;
  reverse(options: DALOptions, entryId: string, reason: string): Promise<IncomeEntry>;
}

/**
 * Input payload for updating an Expense Entry.
 */
export interface UpdateExpenseInput {
  amount?: number;
  mainHeadId?: string;
  subHeadId?: string;
  accountId?: string;
  paymentMethod?: any;
  payeeName?: string;
  payeePhone?: string;
  reference?: string;
  description?: string;
  date?: string;
}

/**
 * Interface contract for Financial Expense Ledger operations.
 */
export interface IExpenseRepository {
  list(options: DALOptions): Promise<ExpenseEntry[]>;
  findById(options: DALOptions, entryId: string): Promise<ExpenseEntry | null>;
  create(options: DALOptions, entry: Omit<ExpenseEntry, 'id' | 'voucherNumber'>): Promise<ExpenseEntry>;
  update(options: DALOptions, entryId: string, updates: UpdateExpenseInput): Promise<ExpenseEntry>;
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
 * Canonical Idempotency Record DTO for replay protection.
 */
export interface IdempotencyRecord<T = any> {
  id: string;
  mosqueId: string;
  idempotencyKey: string;
  endpoint: string;
  requestHash?: string | null;
  responsePayload: T;
  createdAt: string;
  expiresAt: string;
}

/**
 * Input payload for saving a tenant-scoped idempotency record.
 */
export interface SaveIdempotencyInput<T = any> {
  idempotencyKey?: string;
  endpoint: string;
  requestHash?: string | null;
  responsePayload: T;
  ttlSeconds?: number;
}

/**
 * Interface contract for API Idempotency operations.
 */
export interface IIdempotencyRepository {
  getRecord<T = any>(options: DALOptions, endpoint: string, idempotencyKey?: string): Promise<IdempotencyRecord<T> | null>;
  saveRecord<T = any>(options: DALOptions, input: SaveIdempotencyInput<T>): Promise<IdempotencyRecord<T> | null>;
  cleanupExpired(options: DALOptions): Promise<number>;
}

/**
 * Interface contract for Committee Management [LOCKED MODULE].
 */
export interface ICommitteeRepository {
  getActiveTerm(options: DALOptions): Promise<CommitteeTerm | null>;
  listMembers(options: DALOptions, termId: string): Promise<CommitteeMember[]>;
}

/**
 * Interface contract for Donations (Section 7 — Phase 1B.12).
 */
export interface IDonationRepository {
  list(options: DALOptions): Promise<any[]>;
  findById(options: DALOptions, id: string): Promise<any | null>;
  create(options: DALOptions, payload: Record<string, any>): Promise<any>;
  cancel(options: DALOptions, id: string, reason?: string): Promise<any>;
  updateDenomination(options: DALOptions, id: string, denominationData: any, editReason?: string): Promise<any>;
}

/**
 * Interface contract for Donation Boxes & Box Collections (Section 7 — Phase 1B.12).
 */
export interface IDonationBoxRepository {
  listBoxesAndCollections(options: DALOptions): Promise<{ boxes: any[]; collections: any[] }>;
  createBox(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateBox(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteBox(options: DALOptions, id: string): Promise<any>;
  collectBox(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateCollectionDenomination(options: DALOptions, id: string, denominationData: any, editReason?: string): Promise<any>;
}

/**
 * Interface contract for Staff, Payroll, Advances & Batches (Section 9 — Phase 1B.12).
 */
export interface IStaffRepository {
  listStaff(options: DALOptions): Promise<any[]>;
  listPayments(options: DALOptions): Promise<any[]>;
  getNextCode(options: DALOptions): Promise<any>;
  createStaff(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateStaff(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  reviseSalary(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  disburseAdvance(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  recordLeave(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updateLeave(options: DALOptions, id: string, leaveId: string, payload: Record<string, any>): Promise<any>;
  logBulkAttendance(options: DALOptions, payload: Record<string, any>): Promise<any>;
  finalSettlement(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  disburseFestivalAllowance(options: DALOptions, payload: Record<string, any>): Promise<any>;
  deleteOrArchiveStaff(options: DALOptions, id: string): Promise<any>;
  paySalary(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updatePayment(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  cancelPayment(options: DALOptions, id: string, reason: string): Promise<any>;
  addPaymentDocument(options: DALOptions, paymentId: string, payload: Record<string, any>): Promise<any>;
  listPaymentBatches(options: DALOptions): Promise<any[]>;
  findPaymentBatchById(options: DALOptions, id: string): Promise<any | null>;
  createPaymentBatch(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updatePaymentBatch(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  disbursePaymentBatch(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  cancelPaymentBatch(options: DALOptions, id: string, reason?: string): Promise<any>;
}

/**
 * Interface contract for Waqf Properties, Tenants & Rent Collection (Section 10 — Phase 1B.12).
 */
export interface IPropertyRepository {
  list(options: DALOptions): Promise<any[]>;
  create(options: DALOptions, payload: Record<string, any>): Promise<any>;
  update(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  toggleArchive(options: DALOptions, id: string): Promise<any>;
  deleteOrArchive(options: DALOptions, id: string, force?: boolean): Promise<any>;
  saveTenant(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  terminateTenant(options: DALOptions, propertyId: string, tenantId: string, reason?: string): Promise<any>;
  addInspection(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  saveLegalCase(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  collectRent(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  reverseRentCollection(options: DALOptions, propertyId: string, collectionId: string, reason?: string): Promise<any>;
  addExpense(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  deleteExpense(options: DALOptions, propertyId: string, expenseId: string, reason?: string): Promise<any>;
  addDocument(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  deleteDocument(options: DALOptions, propertyId: string, docId: string): Promise<any>;
  addKhajna(options: DALOptions, propertyId: string, payload: Record<string, any>): Promise<any>;
  deleteKhajna(options: DALOptions, propertyId: string, khajnaId: string, reason?: string): Promise<any>;
}

/**
 * Interface contract for Assets & Maintenance (Section 8 — Phase 1B.13).
 */
export interface IAssetRepository {
  list(options: DALOptions, query?: any): Promise<{ data: any[]; stats: any }>;
  findById(options: DALOptions, id: string): Promise<any | null>;
  create(options: DALOptions, payload: Record<string, any>): Promise<any>;
  update(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  addServiceRecord(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  toggleArchive(options: DALOptions, id: string, payload?: Record<string, any>): Promise<any>;
  deleteOrArchive(options: DALOptions, id: string, force?: boolean): Promise<any>;
  clearDemo(options: DALOptions): Promise<{ removedCount: number }>;
  logAudit(options: DALOptions, id: string, action?: string, details?: string): Promise<void>;
}

/**
 * Interface contract for Musalli & Donor Management (Section 12 — Phase 1B.13).
 */
export interface IMusalliRepository {
  listAreas(options: DALOptions): Promise<any[]>;
  getAreaById(options: DALOptions, id: string): Promise<any | null>;
  createArea(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateArea(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updateAreaStatus(options: DALOptions, id: string, status: string): Promise<any>;

  listFamilies(options: DALOptions, query?: any): Promise<any[]>;
  getFamilyById(options: DALOptions, id: string): Promise<any | null>;
  checkFamilyDuplicate(options: DALOptions, payload: Record<string, any>): Promise<any>;
  createFamily(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateFamily(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updateFamilyStatus(options: DALOptions, id: string, status: string): Promise<any>;

  listPersons(options: DALOptions, query?: any): Promise<any[]>;
  getPersonById(options: DALOptions, id: string): Promise<any | null>;
  checkPersonDuplicate(options: DALOptions, payload: Record<string, any>): Promise<any>;
  createPerson(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updatePerson(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updatePersonStatus(options: DALOptions, id: string, status: string): Promise<any>;

  listDonationPlans(options: DALOptions, query?: any): Promise<any[]>;
  getDonationPlanById(options: DALOptions, id: string): Promise<any | null>;
  checkPlanOverlap(options: DALOptions, payload: Record<string, any>): Promise<any>;
  createDonationPlan(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateDonationPlan(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updatePlanStatus(options: DALOptions, id: string, status: string): Promise<any>;
  deleteDonationPlan(options: DALOptions, id: string): Promise<any>;

  listCollectionWorkers(options: DALOptions): Promise<any[]>;
  getCollectionWorkerById(options: DALOptions, id: string): Promise<any | null>;
  createCollectionWorker(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateCollectionWorker(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updateWorkerStatus(options: DALOptions, id: string, status: string): Promise<any>;

  getMusalliStats(options: DALOptions): Promise<any>;
}

/**
 * Interface contract for Education Foundation, Maktab & Hifzkhana Operations (Section 13 — Phase 1B.13).
 */
export interface IEducationRepository {
  getDashboardStats(options: DALOptions): Promise<any>;

  listPrograms(options: DALOptions): Promise<any[]>;
  createProgram(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateProgram(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;

  listLevels(options: DALOptions, query?: any): Promise<any[]>;
  createLevel(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateLevel(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;

  listStudents(options: DALOptions, query?: any): Promise<any[]>;
  getStudentById(options: DALOptions, id: string): Promise<any | null>;
  createStudent(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateStudent(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteStudent(options: DALOptions, id: string): Promise<any>;

  listGuardians(options: DALOptions, studentId: string): Promise<any[]>;
  addGuardian(options: DALOptions, studentId: string, payload: Record<string, any>): Promise<any>;
  removeGuardian(options: DALOptions, studentId: string, guardianPersonId: string): Promise<any>;

  listEnrollments(options: DALOptions, query?: any): Promise<any[]>;
  getEnrollmentById(options: DALOptions, id: string): Promise<any | null>;
  createEnrollment(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateEnrollment(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
}

/**
 * Interface contract for Library & Knowledge Center (Section 14 — Phase 1B.13).
 */
export interface ILibraryRepository {
  listCategories(options: DALOptions): Promise<any[]>;
  createCategory(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateCategory(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteCategory(options: DALOptions, id: string): Promise<any>;

  listBookTitles(options: DALOptions, query?: any): Promise<any[]>;
  getBookTitleById(options: DALOptions, id: string): Promise<any | null>;
  createBookTitle(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateBookTitle(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteBookTitle(options: DALOptions, id: string): Promise<any>;

  listBookCopies(options: DALOptions, query?: any): Promise<any[]>;
  getBookCopyById(options: DALOptions, id: string): Promise<any | null>;
  lookupByBookId(options: DALOptions, bookId: string): Promise<any | null>;
  createBookCopy(options: DALOptions, payload: Record<string, any>): Promise<any>;
  bulkCreateBookCopies(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateBookCopy(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  updateCopyStatus(options: DALOptions, id: string, status: string, notes?: string): Promise<any>;

  listMembers(options: DALOptions, query?: any): Promise<any[]>;
  getMemberById(options: DALOptions, id: string): Promise<any | null>;
  createMember(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateMember(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;

  listIssues(options: DALOptions, query?: any): Promise<any[]>;
  issueBook(options: DALOptions, payload: Record<string, any>): Promise<any>;
  returnBook(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  markLost(options: DALOptions, id: string, payload?: Record<string, any>): Promise<any>;

  listAcquisitions(options: DALOptions, query?: any): Promise<any[]>;
  createAcquisition(options: DALOptions, payload: Record<string, any>): Promise<any>;

  getLocations(options: DALOptions): Promise<any>;
  createRoom(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateRoom(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteRoom(options: DALOptions, id: string): Promise<any>;
  createRack(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateRack(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteRack(options: DALOptions, id: string): Promise<any>;
  createShelf(options: DALOptions, payload: Record<string, any>): Promise<any>;
  updateShelf(options: DALOptions, id: string, payload: Record<string, any>): Promise<any>;
  deleteShelf(options: DALOptions, id: string): Promise<any>;

  getReport(options: DALOptions, reportType: string, query?: any): Promise<any>;
}

/**
 * Read-Only Data Access Layer Contract (Phase 1A / Phase 1B.8 / Phase 1B.9 / Phase 1B.12 / Phase 1B.13).
 * Strictly read-only: NEVER exposes financial or state mutation methods.
 */
export interface IReadOnlyDataAccessLayer {
  readonly mosque: IMosqueIdentityReadOnlyRepository;
  readonly accountHeads?: Pick<IAccountHeadRepository, 'list' | 'findById'>;
  readonly financialAccounts?: Pick<IFinancialAccountRepository, 'list' | 'findById'>;
  readonly income?: Pick<IIncomeRepository, 'list' | 'findById'>;
  readonly expense?: Pick<IExpenseRepository, 'list' | 'findById'>;
  readonly transfers?: Pick<ITransferRepository, 'list'>;
  readonly idempotency?: Pick<IIdempotencyRepository, 'getRecord'>;
  readonly donations?: Pick<IDonationRepository, 'list' | 'findById'>;
  readonly donationBoxes?: Pick<IDonationBoxRepository, 'listBoxesAndCollections'>;
  readonly staff?: Pick<IStaffRepository, 'listStaff' | 'listPayments' | 'getNextCode' | 'listPaymentBatches' | 'findPaymentBatchById'>;
  readonly properties?: Pick<IPropertyRepository, 'list'>;
  readonly assets?: Pick<IAssetRepository, 'list' | 'findById'>;
  readonly musalli?: Pick<IMusalliRepository, 'listAreas' | 'getAreaById' | 'listFamilies' | 'getFamilyById' | 'listPersons' | 'getPersonById' | 'getMusalliStats'>;
  readonly education?: Pick<IEducationRepository, 'getDashboardStats' | 'listPrograms' | 'listLevels' | 'listStudents' | 'getStudentById' | 'listEnrollments'>;
  readonly library?: Pick<ILibraryRepository, 'listCategories' | 'listBookTitles' | 'getBookTitleById' | 'listBookCopies' | 'getBookCopyById' | 'listMembers' | 'getMemberById' | 'listIssues' | 'getLocations'>;
}

/**
 * Scoped Mutation & Parity Data Access Layer Contract (Phase 1B.7 – Phase 1B.13).
 * Cleanly separates mutation-capable parity operations
 * from the strictly read-only IReadOnlyDataAccessLayer contract.
 */
export interface IScopedMutationDataAccessLayer extends IReadOnlyDataAccessLayer {
  readonly mosque: IMosqueIdentityReadOnlyRepository;
  readonly accountHeads: IAccountHeadRepository;
  readonly financialAccounts: Omit<IFinancialAccountRepository, 'updateBalance'>;
  readonly income: IIncomeRepository;
  readonly expense: IExpenseRepository;
  readonly transfers: ITransferRepository;
  readonly idempotency?: IIdempotencyRepository;
  readonly donations: IDonationRepository;
  readonly donationBoxes: IDonationBoxRepository;
  readonly staff: IStaffRepository;
  readonly properties: IPropertyRepository;
  readonly assets: IAssetRepository;
  readonly musalli: IMusalliRepository;
  readonly education: IEducationRepository;
  readonly library: ILibraryRepository;
}

/**
 * Master Unified Data Access Layer Interface Contract.
 * Positioned between Express route handlers and database persistence engines.
 * Does NOT expose unrestricted raw repositories.
 */
export interface IDataAccessLayer extends IScopedMutationDataAccessLayer {
  readonly users: IUserRepository;
  readonly mosque: IMosqueIdentityRepository;
  readonly accountHeads: IAccountHeadRepository;
  readonly financialAccounts: IFinancialAccountRepository;
  readonly income: IIncomeRepository;
  readonly expense: IExpenseRepository;
  readonly transfers: ITransferRepository;
  readonly audit: IAuditRepository;
  readonly idempotency?: IIdempotencyRepository;
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
   * Execute multi-table transaction in atomic unit of work block.
   */
  executeTransaction<T>(work: (txDal: IDataAccessLayer) => Promise<T>): Promise<T>;
}



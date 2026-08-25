export type UserRole =
  | 'SUPER_ADMIN'
  | 'MOSQUE_ADMIN'
  | 'ACCOUNTANT'
  | 'COMMITTEE_ADMIN'
  | 'TREASURER'
  | 'DATA_ENTRY_OPERATOR'
  | 'AUDITOR'
  | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'CREATE_INCOME'
  | 'EDIT_INCOME'
  | 'DELETE_INCOME'
  | 'APPROVE_INCOME'
  | 'CREATE_EXPENSE'
  | 'EDIT_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'APPROVE_EXPENSE'
  | 'VIEW_REPORT'
  | 'EXPORT_REPORT'
  | 'MANAGE_COMMITTEE'
  | 'MANAGE_USERS'
  | 'MANAGE_ACCOUNTS'
  | 'MANAGE_SETTINGS'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_STAFF'
  | 'MANAGE_ASSETS'
  | 'MANAGE_PROPERTY'
  | 'MANAGE_CEMETERY';

export interface User {
  id: string;
  name: string;
  nid?: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  address?: string;
  mosqueId: string;
  role: UserRole;
  permissions: Permission[];
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mosque {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  nameEn: string;
  waqfEstateName?: string;
  registrationNumber?: string;
  address: string;
  village?: string;
  union?: string;
  upazila?: string;
  district?: string;
  division?: string;
  country: string;
  phone: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  logoAssetId?: string;
  logoMetadata?: {
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    uploadedAt?: string;
    uploadedBy?: string;
    source?: 'UPLOAD' | 'GOOGLE_DRIVE' | 'PRESET';
    originalDriveUrl?: string;
  };
  presidentSignatureUrl?: string;
  secretarySignatureUrl?: string;
  establishedDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  qrSettings?: {
    bkashNumber?: string;
    nagadNumber?: string;
    rocketNumber?: string;
    bankAccountInfo?: string;
    onlinePaymentUrl?: string;
    customQrImageUrl?: string;
    instructionsBn?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';

export interface AccountHead {
  id: string;
  mosqueId: string;
  code: string;
  nameBn: string;
  nameEn: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string | null;
  isSystem?: boolean;
  isActive: boolean;
  subHeads?: AccountHead[];
}

export type PaymentMethod =
  | 'CASH'
  | 'BANK'
  | 'BKASH'
  | 'NAGAD'
  | 'ROCKET'
  | 'CARD'
  | 'ONLINE'
  | 'OTHER';

export interface FinancialAccount {
  id: string;
  mosqueId: string;
  name: string;
  nameBn: string;
  accountType: 'CASH' | 'BANK' | 'MFS' | 'OTHER';
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  openingBalance: number;
  currentBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault?: boolean;
  createdAt: string;
}

export type TransactionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface IncomeEntry {
  id: string;
  mosqueId: string;
  voucherNumber: string;
  date: string;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId?: string;
  subHeadNameBn?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  accountName: string;
  donorName?: string;
  donorPhone?: string;
  reference?: string;
  description?: string;
  attachmentUrl?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  status: TransactionStatus;
  isReversal?: boolean;
  reversalOfId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseEntry {
  id: string;
  mosqueId: string;
  voucherNumber: string;
  date: string;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId?: string;
  subHeadNameBn?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  accountName: string;
  payeeName: string;
  payeePhone?: string;
  reference?: string;
  description?: string;
  attachmentUrl?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  status: TransactionStatus;
  isReversal?: boolean;
  reversalOfId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Donation {
  id: string;
  mosqueId: string;
  receiptNumber: string;
  donorName: string;
  donorPhone?: string;
  donorEmail?: string;
  donorAddress?: string;
  isAnonymous: boolean;
  category: 'GENERAL' | 'CONSTRUCTION' | 'WAQF' | 'CEMETERY' | 'WUDU_KHANA' | 'MADRASA' | 'SPECIAL_PROJECT' | 'OTHER';
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  accountName: string;
  reference?: string;
  date: string;
  receivedBy: string;
  receivedByName: string;
  incomeEntryId?: string;
  status: 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface DenominationCount {
  [key: number]: number; // denomination (1000, 500, 200, 100, 50, 20, 10, 5, 2, 1) -> quantity
}

export interface PublicDocumentToken {
  token: string;
  documentType: 'INCOME_RECEIPT' | 'EXPENSE_VOUCHER' | 'DONATION_RECEIPT' | 'NOTICE' | 'HEAD_REPORT' | 'STATEMENT';
  documentId: string;
  mosqueId: string;
  expiresAt: string;
  createdAt: string;
}

export interface SmsLog {
  id: string;
  mosqueId: string;
  recipientPhone: string;
  message: string;
  purpose: 'RECEIPT' | 'VOUCHER' | 'NOTICE' | 'NOTIFICATION' | 'CUSTOM';
  status: 'SENT' | 'FAILED' | 'PENDING';
  sentBy: string;
  sentByName: string;
  sentAt: string;
  documentLink?: string;
}

export interface DonationBox {
  id: string;
  mosqueId: string;
  boxCode: string;
  location: string;
  shopName?: string;
  ownerName?: string;
  ownerPhone?: string;
  address?: string;
  area?: string;
  ward?: string;
  responsiblePerson?: string;
  installationDate?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'REPLACED' | 'LOST' | 'DAMAGED' | 'MAINTENANCE';
  lastCollectedDate?: string;
  totalCollected: number;
  notes?: string;
  createdAt: string;
}

export interface SavedReportConfig {
  id: string;
  mosqueId: string;
  name: string;
  reportType: string;
  dateRangeType: string;
  fromDate?: string;
  toDate?: string;
  grouping?: string;
  level?: string;
  headId?: string;
  accountId?: string;
  createdAt: string;
}

export interface DonationBoxCollection {
  id: string;
  mosqueId: string;
  boxId: string;
  boxCode: string;
  collectionDate: string;
  amount: number;
  countingTeam: string[];
  witnesses: string[];
  depositAccountId: string;
  depositAccountName: string;
  depositReference?: string;
  incomeVoucherNumber?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type CommitteeTermStatus = 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface CommitteeTerm {
  id: string;
  mosqueId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: CommitteeTermStatus;
  description?: string;
  membersCount?: number;
  createdAt: string;
}

export interface CommitteeMember {
  id: string;
  mosqueId: string;
  termId: string;
  name: string;
  nid: string;
  phone: string;
  address?: string;
  photoUrl?: string;
  position: 'PRESIDENT' | 'VICE_PRESIDENT' | 'SECRETARY' | 'JOINT_SECRETARY' | 'TREASURER' | 'ORGANIZING_SECRETARY' | 'MEMBER' | 'IMAM' | 'ADVISOR' | 'OTHER';
  positionCustomBn?: string;
  joinDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'DECEASED';
  notes?: string;
  createdAt: string;
}

export interface CommitteeMeeting {
  id: string;
  mosqueId: string;
  meetingNumber: string;
  date: string;
  time: string;
  location: string;
  chairman: string;
  secretary: string;
  agenda: string[];
  membersPresent: string[];
  membersAbsent: string[];
  decisions: string[];
  resolutions: string[];
  notes?: string;
  resolutionNumber?: string;
  createdAt: string;
}

export interface Staff {
  id: string;
  mosqueId: string;
  name: string;
  nid: string;
  phone: string;
  designation: 'IMAM' | 'MUEZZIN' | 'KHATIB' | 'TEACHER' | 'CLEANER' | 'SECURITY' | 'OTHER';
  designationBn: string;
  address?: string;
  joiningDate: string;
  monthlySalary: number;
  allowance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface StaffPayment {
  id: string;
  mosqueId: string;
  staffId: string;
  staffName: string;
  designationBn: string;
  month: string; // YYYY-MM
  paymentDate: string;
  basicSalary: number;
  allowance: number;
  deduction: number;
  netPaid: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  expenseVoucherNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface MosqueAsset {
  id: string;
  mosqueId: string;
  assetCode: string;
  name: string;
  category: 'BUILDING' | 'LAND' | 'ELECTRICAL' | 'ELECTRONICS' | 'SOUND_SYSTEM' | 'GENERATOR' | 'FURNITURE' | 'CCTV' | 'OTHER';
  purchaseDate: string;
  purchaseValue: number;
  currentValue: number;
  location: string;
  condition: 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'DISPOSED';
  responsiblePerson?: string;
  warrantyInfo?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface MosqueProperty {
  id: string;
  mosqueId: string;
  propertyCode: string;
  type: 'AGRICULTURAL_LAND' | 'COMMERCIAL_LAND' | 'RESIDENTIAL_PLOT' | 'SHOP' | 'BUILDING' | 'POND' | 'OTHER';
  description: string;
  location: string;
  area: string; // e.g. "12 শতাংশ" or "0.5 একর"
  ownershipType: 'WAQF' | 'PURCHASED' | 'DONATED' | 'LEASED';
  waqfEnrollmentNo?: string;
  currentUse: string;
  monthlyIncome?: number;
  status: 'ACTIVE' | 'DISPUTED' | 'LEASED_OUT' | 'VACANT';
  documentsCount?: number;
  notes?: string;
  createdAt: string;
}

export interface CemeteryRecord {
  id: string;
  mosqueId: string;
  plotNumber: string;
  deceasedName: string;
  fatherOrSpouseName: string;
  dateOfDeath: string;
  burialDate: string;
  graveLocation: string;
  plotStatus: 'OCCUPIED' | 'RESERVED' | 'AVAILABLE' | 'MAINTENANCE';
  contactPersonName: string;
  contactPersonPhone: string;
  notes?: string;
  createdAt: string;
}

export interface MosqueNotice {
  id: string;
  mosqueId: string;
  title: string;
  description: string;
  publishDate: string;
  expiryDate?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isPublic: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  publishedBy: string;
  publishedByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  mosqueId: string;
  userId: string;
  userName: string;
  userRole: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'APPROVE'
    | 'REJECT'
    | 'CANCEL'
    | 'POST'
    | 'EXPORT'
    | 'SETTINGS_CHANGE'
    | 'PRESIDENT_SIGNATURE_ADDED'
    | 'PRESIDENT_SIGNATURE_UPDATED'
    | 'PRESIDENT_SIGNATURE_REMOVED'
    | 'SECRETARY_SIGNATURE_ADDED'
    | 'SECRETARY_SIGNATURE_UPDATED'
    | 'SECRETARY_SIGNATURE_REMOVED'
    | string;
  module: string;
  recordId?: string;
  voucherNumber?: string;
  details: string;
  previousState?: string;
  newState?: string;
  timestamp: string;
  ipAddress?: string;
  device?: string;
  status?: 'SUCCESS' | 'FAILED' | 'WARNING';
}

export interface DashboardStats {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  yearlyIncome: number;
  yearlyExpense: number;
  totalDonation: number;
  cashBalance: number;
  bankBalance: number;
  pendingApprovalsCount: number;
  recentTransactions: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    voucherNumber: string;
    headName: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    accountName: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  incomeCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  expenseCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

export interface MosqueNotification {
  id: string;
  mosqueId: string;
  userId?: string; // specific user or all if undefined
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' | 'TRANSACTION';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AccountTransfer {
  id: string;
  mosqueId: string;
  transferNumber: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  date: string;
  description?: string;
  reference?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  mosqueId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

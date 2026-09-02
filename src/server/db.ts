import fs from 'fs';
import path from 'path';
import { buildDailyPrayerSchedule, toBanglaDigits } from '../lib/prayerEngine';
import {
  User,
  Mosque,
  AccountHead,
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  Donation,
  DonationBox,
  DonationBoxCollection,
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeMeetingNotice,
  MeetingResolution,
  CommitteeActionPlan,
  SubCommittee,
  CommitteeActionPlanStatus,
  CommitteeActionPlanPriority,
  CommitteeActionPlanAttachment,
  CommitteeActionPlanActivityLog,
  CommitteeMemberActivity,
  CommitteeMemberTask,
  CommitteeManualEvaluation,
  Staff,
  StaffPayment,
  StaffBankTransferLetter,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  MosqueNotification,
  AccountTransfer,
  UploadedFile,
  AuditLog,
  DashboardStats,
  PaymentMethod,
  SmsLog,
  PublicDocumentToken,
  PublicPortalSettings,
  DEFAULT_PUBLIC_PORTAL_SETTINGS,
  PublicPortalData,
  QRCodeEntity,
  QRStatus,
  BackupRecord,
  RestoreRecord,
  BackupSettings,
} from '../types';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'masjidledger_db.json');

export class DatabaseStore {
  mosques: Mosque[] = [];
  users: (User & { passwordHash: string })[] = [];
  accountHeads: AccountHead[] = [];
  accounts: FinancialAccount[] = [];
  incomeEntries: IncomeEntry[] = [];
  expenseEntries: ExpenseEntry[] = [];
  donations: Donation[] = [];
  donationBoxes: DonationBox[] = [];
  donationBoxCollections: DonationBoxCollection[] = [];
  qrCodes: QRCodeEntity[] = [];
  committeeTerms: CommitteeTerm[] = [];
  committeeMembers: CommitteeMember[] = [];
  committeeMeetings: CommitteeMeeting[] = [];
  committeeNotices: CommitteeMeetingNotice[] = [];
  committeeResolutions: MeetingResolution[] = [];
  committeeActionPlans: CommitteeActionPlan[] = [];
  committeeActivities: CommitteeMemberActivity[] = [];
  committeeTasks: CommitteeMemberTask[] = [];
  committeeManualEvaluations: CommitteeManualEvaluation[] = [];
  subCommittees: SubCommittee[] = [];
  staffList: Staff[] = [];
  staffPayments: StaffPayment[] = [];
  staffBankTransferLetters: StaffBankTransferLetter[] = [];
  assets: MosqueAsset[] = [];
  properties: MosqueProperty[] = [];
  cemeteryRecords: CemeteryRecord[] = [];
  notices: MosqueNotice[] = [];
  notifications: MosqueNotification[] = [];
  transfers: AccountTransfer[] = [];
  uploadedFiles: UploadedFile[] = [];
  auditLogs: AuditLog[] = [];
  smsLogs: SmsLog[] = [];
  documentTokens: PublicDocumentToken[] = [];
  idempotencyMap: Record<string, { result: any; createdAt: number }> = {};
  backupRecords: BackupRecord[] = [];
  restoreRecords: RestoreRecord[] = [];
  backupSettings: Record<string, BackupSettings> = {};

  constructor() {
    this.init();
  }

  init() {
    try {
      const dataDir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.mosques = (parsed.mosques || []).map((m: any) => ({
          ...m,
          publicPortalSettings: m.publicPortalSettings
            ? { ...DEFAULT_PUBLIC_PORTAL_SETTINGS, ...m.publicPortalSettings }
            : { ...DEFAULT_PUBLIC_PORTAL_SETTINGS }
        }));
        this.users = parsed.users || [];
        this.accountHeads = parsed.accountHeads || [];
        this.accounts = parsed.accounts || [];
        this.incomeEntries = parsed.incomeEntries || [];
        this.expenseEntries = parsed.expenseEntries || [];
        this.donations = parsed.donations || [];
        this.donationBoxes = parsed.donationBoxes || [];
        this.donationBoxCollections = parsed.donationBoxCollections || [];
        this.committeeTerms = parsed.committeeTerms || [];
        this.committeeMembers = parsed.committeeMembers || [];
        this.committeeMeetings = parsed.committeeMeetings || [];
        this.committeeNotices = parsed.committeeNotices || [];
        this.committeeResolutions = parsed.committeeResolutions || [];
        this.committeeActionPlans = parsed.committeeActionPlans || [];
        this.committeeActivities = parsed.committeeActivities || [];
        this.committeeTasks = parsed.committeeTasks || [];
        this.committeeManualEvaluations = parsed.committeeManualEvaluations || [];
        this.subCommittees = parsed.subCommittees || [];
        this.staffList = (parsed.staffList || []).map((s: any, idx: number) => {
          const staffYear = s.joiningDate ? s.joiningDate.split('-')[0] : '2026';
          const autoCode = s.staffCode || `STF-${staffYear}-${String(idx + 1).padStart(3, '0')}`;
          return {
            ...s,
            staffCode: autoCode,
            employmentType: s.employmentType || 'PERMANENT',
            employmentTypeBn: s.employmentTypeBn || 'স্থায়ী',
            presentAddress: s.presentAddress || s.address || '',
            permanentAddress: s.permanentAddress || s.address || '',
            salaryEffectiveDate: s.salaryEffectiveDate || s.joiningDate || '2026-01-01',
            salaryHistory: Array.isArray(s.salaryHistory) && s.salaryHistory.length > 0 ? s.salaryHistory : [
              {
                id: `sh-${s.id}-init`,
                effectiveDate: s.joiningDate || '2026-01-01',
                newSalary: s.monthlySalary || 0,
                allowance: s.allowance || 0,
                reason: 'প্রারম্ভিক নির্ধারিত বেতন',
                changedByName: 'সিস্টেম অ্যাডমিন',
                createdAt: s.joiningDate ? `${s.joiningDate}T00:00:00.000Z` : new Date().toISOString(),
              }
            ],
          };
        });
        this.staffPayments = parsed.staffPayments || [];
        this.staffBankTransferLetters = parsed.staffBankTransferLetters || [];
        this.assets = (parsed.assets || []).map((a: any) => ({
          ...a,
          category: a.category || 'OTHER',
          condition: a.condition || 'GOOD',
          attachments: a.attachments || [],
          serviceHistory: a.serviceHistory || [],
          isArchived: Boolean(a.isArchived),
          isDeleted: Boolean(a.isDeleted),
          isDemo: a.isDemo !== undefined ? a.isDemo : (a.id === 'ast-01' || a.id === 'ast-02' || a.id === 'ast-03' || a.id === 'ast-04'),
        }));
        this.properties = parsed.properties || [];
        this.cemeteryRecords = parsed.cemeteryRecords || [];
        this.notices = parsed.notices || [];
        this.notifications = parsed.notifications || [];
        this.transfers = parsed.transfers || [];
        this.uploadedFiles = parsed.uploadedFiles || [];
        this.qrCodes = parsed.qrCodes || [];
        this.auditLogs = parsed.auditLogs || [];
        this.idempotencyMap = parsed.idempotencyMap || {};
        this.backupRecords = parsed.backupRecords || [];
        this.restoreRecords = parsed.restoreRecords || [];
        this.backupSettings = parsed.backupSettings || {};

        return;
      }
    } catch (e) {
      console.warn('[DB] Failed to load DB file:', e);
    }

    // Only seed initial data if DEMO_MODE is explicitly enabled. Otherwise start with empty dataset for production.
    if (process.env.DEMO_MODE === 'true') {
      this.seedInitialData();
      this.save();
    } else {
      console.log('[DB] Production mode: Starting with empty/clean database. No demo data seeded.');
    }
  }

  save() {
    try {
      const dataDir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const data = {
        mosques: this.mosques,
        users: this.users,
        accountHeads: this.accountHeads,
        accounts: this.accounts,
        incomeEntries: this.incomeEntries,
        expenseEntries: this.expenseEntries,
        donations: this.donations,
        donationBoxes: this.donationBoxes,
        donationBoxCollections: this.donationBoxCollections,
        committeeTerms: this.committeeTerms,
        committeeMembers: this.committeeMembers,
        committeeMeetings: this.committeeMeetings,
        committeeNotices: this.committeeNotices,
        committeeResolutions: this.committeeResolutions,
        committeeActionPlans: this.committeeActionPlans,
        committeeActivities: this.committeeActivities,
        committeeTasks: this.committeeTasks,
        committeeManualEvaluations: this.committeeManualEvaluations,
        subCommittees: this.subCommittees,
        staffList: this.staffList,
        staffPayments: this.staffPayments,
        staffBankTransferLetters: this.staffBankTransferLetters,
        assets: this.assets,
        properties: this.properties,
        cemeteryRecords: this.cemeteryRecords,
        notices: this.notices,
        notifications: this.notifications,
        transfers: this.transfers,
        uploadedFiles: this.uploadedFiles,
        qrCodes: this.qrCodes,
        auditLogs: this.auditLogs,
        idempotencyMap: this.idempotencyMap,
        backupRecords: this.backupRecords,
        restoreRecords: this.restoreRecords,
        backupSettings: this.backupSettings,
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save DB to disk:', e);
    }
  }

  checkIdempotency(key?: string) {
    if (!key) return null;
    const item = this.idempotencyMap[key];
    if (!item) return null;
    // Expire after 24 hours
    if (Date.now() - item.createdAt > 24 * 3600 * 1000) {
      delete this.idempotencyMap[key];
      return null;
    }
    return item.result;
  }

  saveIdempotency(key: string | undefined, result: any) {
    if (!key) return;
    this.idempotencyMap[key] = { result, createdAt: Date.now() };
    this.save();
  }

  seedInitialData() {
    // 1. Mosques
    const mosque1: Mosque = {
      id: 'mosque-mamun-001',
      code: 'MAMUN-WAQF-01',
      name: 'Mamun Jame Masjid Waqf Estate',
      nameBn: 'মামুন জামে মসজিদ ওয়াকফ এস্টেট',
      nameEn: 'Mamun Jame Masjid Waqf Estate',
      waqfEstateName: 'Mamun Waqf Estate (EC No: 18452)',
      registrationNumber: 'REG-DHAKA-2014-9912',
      address: 'House #42, Road #07, Block #C, Mirpur-12, Dhaka-1216',
      village: 'Mirpur',
      union: 'Ward No 03',
      upazila: 'Mirpur',
      district: 'Dhaka',
      division: 'Dhaka',
      country: 'Bangladesh',
      phone: '+8801711223344',
      email: 'info@mamunmosque.org',
      website: 'https://mamunmosque.org',
      logoUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=150&auto=format&fit=crop&q=80',
      establishedDate: '1988-03-15',
      status: 'ACTIVE',
      qrSettings: {
        bkashNumber: '01711223344 (Merchant)',
        nagadNumber: '01711223344 (Merchant)',
        rocketNumber: '01711223344-8',
        bankAccountInfo: 'Islami Bank Bangladesh Ltd, Account: 20501234567890',
        instructionsBn: 'বিকাশ বা নগদ অ্যাপের মার্চেন্ট পেমেন্ট অপশনে গিয়ে রেফারেন্সে আপনার নাম বা দানের খাত লিখুন।',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const mosque2: Mosque = {
      id: 'mosque-baitul-002',
      code: 'BAITUL-NUR-02',
      name: 'Baitun Nur Central Jame Masjid',
      nameBn: 'বাইতুন নূর কেন্দ্রীয় জামে মসজিদ',
      nameEn: 'Baitun Nur Central Jame Masjid',
      waqfEstateName: 'Baitun Nur Waqf Estate',
      registrationNumber: 'REG-CTG-2018-4421',
      address: 'Agrabad Commercial Area, Chittagong',
      district: 'Chittagong',
      division: 'Chittagong',
      country: 'Bangladesh',
      phone: '+8801819887766',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    this.mosques.push(mosque1, mosque2);

    // 2. Users with Roles
    this.users.push(
      {
        id: 'usr-admin-1',
        name: 'মুহাম্মদ রফিকুল ইসলাম',
        phone: '01711223344',
        email: 'admin@mamunmosque.org',
        mosqueId: mosque1.id,
        role: 'MOSQUE_ADMIN',
        status: 'ACTIVE',
        permissions: [
          'VIEW_DASHBOARD', 'CREATE_INCOME', 'EDIT_INCOME', 'DELETE_INCOME', 'APPROVE_INCOME',
          'CREATE_EXPENSE', 'EDIT_EXPENSE', 'DELETE_EXPENSE', 'APPROVE_EXPENSE', 'VIEW_REPORT',
          'EXPORT_REPORT', 'MANAGE_COMMITTEE', 'MANAGE_USERS', 'MANAGE_ACCOUNTS', 'MANAGE_SETTINGS',
          'VIEW_AUDIT_LOG', 'MANAGE_STAFF', 'MANAGE_ASSETS', 'MANAGE_PROPERTY', 'MANAGE_CEMETERY'
        ],
        passwordHash: 'admin123', // In production hashed
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'usr-accountant-1',
        name: 'আব্দুল কাদির (হিসাবরক্ষক)',
        phone: '01822334455',
        email: 'accounts@mamunmosque.org',
        mosqueId: mosque1.id,
        role: 'ACCOUNTANT',
        status: 'ACTIVE',
        permissions: [
          'VIEW_DASHBOARD', 'CREATE_INCOME', 'EDIT_INCOME', 'CREATE_EXPENSE', 'EDIT_EXPENSE',
          'VIEW_REPORT', 'EXPORT_REPORT', 'MANAGE_ACCOUNTS', 'MANAGE_STAFF'
        ],
        passwordHash: 'pass123',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'usr-super-admin',
        name: 'সিস্টেম সুপার অ্যাডমিনিস্ট্রেটর',
        phone: '01999888777',
        email: 'superadmin@masjidledger.com',
        mosqueId: mosque1.id,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        permissions: [
          'VIEW_DASHBOARD', 'CREATE_INCOME', 'EDIT_INCOME', 'DELETE_INCOME', 'APPROVE_INCOME',
          'CREATE_EXPENSE', 'EDIT_EXPENSE', 'DELETE_EXPENSE', 'APPROVE_EXPENSE', 'VIEW_REPORT',
          'EXPORT_REPORT', 'MANAGE_COMMITTEE', 'MANAGE_USERS', 'MANAGE_ACCOUNTS', 'MANAGE_SETTINGS',
          'VIEW_AUDIT_LOG', 'MANAGE_STAFF', 'MANAGE_ASSETS', 'MANAGE_PROPERTY', 'MANAGE_CEMETERY'
        ],
        passwordHash: 'super123',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    );

    // 3. Hierarchical Account Heads for Mosque 1
    const headIncDonation: AccountHead = {
      id: 'head-inc-01',
      mosqueId: mosque1.id,
      code: 'INC-100',
      nameBn: 'দান ও অনুদান (Donation)',
      nameEn: 'Donations & Grants',
      type: 'INCOME',
      parentId: null,
      isSystem: true,
      isActive: true,
    };
    const headIncFriday: AccountHead = {
      id: 'head-inc-01-1',
      mosqueId: mosque1.id,
      code: 'INC-101',
      nameBn: 'জুমার সাধারণ দান (Friday Collection)',
      nameEn: 'Friday General Donation',
      type: 'INCOME',
      parentId: 'head-inc-01',
      isActive: true,
    };
    const headIncBox: AccountHead = {
      id: 'head-inc-01-2',
      mosqueId: mosque1.id,
      code: 'INC-102',
      nameBn: 'স্থায়ী দানবাক্স প্রাপ্তি (Donation Box)',
      nameEn: 'Donation Box Collections',
      type: 'INCOME',
      parentId: 'head-inc-01',
      isActive: true,
    };
    const headIncMonthly: AccountHead = {
      id: 'head-inc-01-3',
      mosqueId: mosque1.id,
      code: 'INC-103',
      nameBn: 'মাসিক চাঁদা ও সদস্য ফি (Monthly Subscription)',
      nameEn: 'Monthly Subscription',
      type: 'INCOME',
      parentId: 'head-inc-01',
      isActive: true,
    };
    const headIncConstruction: AccountHead = {
      id: 'head-inc-01-4',
      mosqueId: mosque1.id,
      code: 'INC-104',
      nameBn: 'মসজিদ উন্নয়ন ও নির্মাণ তহবিল (Construction Fund)',
      nameEn: 'Mosque Construction Fund',
      type: 'INCOME',
      parentId: 'head-inc-01',
      isActive: true,
    };

    const headIncProperty: AccountHead = {
      id: 'head-inc-02',
      mosqueId: mosque1.id,
      code: 'INC-200',
      nameBn: 'ওয়াকফ ও দোকান ভাড়া আয় (Waqf & Rent)',
      nameEn: 'Waqf & Rental Income',
      type: 'INCOME',
      parentId: null,
      isSystem: true,
      isActive: true,
    };
    const headIncShopRent: AccountHead = {
      id: 'head-inc-02-1',
      mosqueId: mosque1.id,
      code: 'INC-201',
      nameBn: 'মসজিদ মার্কেট দোকান ভাড়া (Shop Rent)',
      nameEn: 'Mosque Shop Rent',
      type: 'INCOME',
      parentId: 'head-inc-02',
      isActive: true,
    };

    // Expenses
    const headExpSalary: AccountHead = {
      id: 'head-exp-01',
      mosqueId: mosque1.id,
      code: 'EXP-100',
      nameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
      nameEn: 'Staff Salary & Allowance',
      type: 'EXPENSE',
      parentId: null,
      isSystem: true,
      isActive: true,
    };
    const headExpImamSalary: AccountHead = {
      id: 'head-exp-01-1',
      mosqueId: mosque1.id,
      code: 'EXP-101',
      nameBn: 'সম্মানিত খতীব ও ইমামের হাদিয়া/বেতন',
      nameEn: 'Imam & Khatib Honorarium',
      type: 'EXPENSE',
      parentId: 'head-exp-01',
      isActive: true,
    };
    const headExpMuezzinSalary: AccountHead = {
      id: 'head-exp-01-2',
      mosqueId: mosque1.id,
      code: 'EXP-102',
      nameBn: 'মুয়াজ্জিন ও খাদেমের বেতন',
      nameEn: 'Muezzin & Khadem Salary',
      type: 'EXPENSE',
      parentId: 'head-exp-01',
      isActive: true,
    };

    const headExpUtility: AccountHead = {
      id: 'head-exp-02',
      mosqueId: mosque1.id,
      code: 'EXP-200',
      nameBn: 'বিদ্যুৎ, পানি ও গ্যাস বিল (Utilities)',
      nameEn: 'Utility Bills',
      type: 'EXPENSE',
      parentId: null,
      isSystem: true,
      isActive: true,
    };
    const headExpElectricity: AccountHead = {
      id: 'head-exp-02-1',
      mosqueId: mosque1.id,
      code: 'EXP-201',
      nameBn: 'মসজিদ ও এসি বিদ্যুৎ বিল',
      nameEn: 'Electricity Bill',
      type: 'EXPENSE',
      parentId: 'head-exp-02',
      isActive: true,
    };
    const headExpWasa: AccountHead = {
      id: 'head-exp-02-2',
      mosqueId: mosque1.id,
      code: 'EXP-202',
      nameBn: 'ওয়াসা ও পানির পাম্প খরচ',
      nameEn: 'Water & Pump Maintenance',
      type: 'EXPENSE',
      parentId: 'head-exp-02',
      isActive: true,
    };

    const headExpMaintenance: AccountHead = {
      id: 'head-exp-03',
      mosqueId: mosque1.id,
      code: 'EXP-300',
      nameBn: 'মেরামত, রক্ষণাবেক্ষণ ও সংস্কার (Maintenance)',
      nameEn: 'Repair & Maintenance',
      type: 'EXPENSE',
      parentId: null,
      isSystem: true,
      isActive: true,
    };
    const headExpSoundAC: AccountHead = {
      id: 'head-exp-03-1',
      mosqueId: mosque1.id,
      code: 'EXP-301',
      nameBn: 'সাউন্ড সিস্টেম ও এসি সার্ভিসিং',
      nameEn: 'Sound & AC Servicing',
      type: 'EXPENSE',
      parentId: 'head-exp-03',
      isActive: true,
    };

    this.accountHeads.push(
      headIncDonation, headIncFriday, headIncBox, headIncMonthly, headIncConstruction,
      headIncProperty, headIncShopRent,
      headExpSalary, headExpImamSalary, headExpMuezzinSalary,
      headExpUtility, headExpElectricity, headExpWasa,
      headExpMaintenance, headExpSoundAC
    );

    // 4. Financial Accounts
    const accCash: FinancialAccount = {
      id: 'acc-cash-01',
      mosqueId: mosque1.id,
      name: 'Main Cash In Hand',
      nameBn: 'প্রধান ক্যাশ ও নগদ তহবিল (ক্যাশিয়ার)',
      accountType: 'CASH',
      openingBalance: 45000,
      currentBalance: 128450,
      status: 'ACTIVE',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    const accBank: FinancialAccount = {
      id: 'acc-bank-01',
      mosqueId: mosque1.id,
      name: 'Islami Bank CD Account',
      nameBn: 'ইসলামী ব্যাংক বাংলাদেশ লিঃ (হিসাব: ২০৫০...৭৮৯০)',
      accountType: 'BANK',
      bankName: 'Islami Bank Bangladesh Ltd',
      branchName: 'Mirpur-10 Branch',
      accountNumber: '20501234567890',
      openingBalance: 350000,
      currentBalance: 582000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    const accBkash: FinancialAccount = {
      id: 'acc-mfs-01',
      mosqueId: mosque1.id,
      name: 'Official bKash Merchant',
      nameBn: 'অফিসিয়াল বিকাশ মার্চেন্ট হিসাব (০১৭১১২২৩৩৪)',
      accountType: 'MFS',
      accountNumber: '01711223344',
      openingBalance: 12000,
      currentBalance: 46500,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    this.accounts.push(accCash, accBank, accBkash);

    // 5. Initial Income & Expenses (10 Incomes & 10 Expenses with canonical codes)
    this.incomeEntries.push(
      {
        id: 'inc-001',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000001',
        date: '2026-08-21',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-1',
        subHeadNameBn: 'জুমার সাধারণ দান (Friday Collection)',
        amount: 32500,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        donorName: 'জুমার সাধারণ মুসল্লিবৃন্দ',
        description: 'শুক্রবার ২১ আগস্ট জুমার নামাজের সাধারণ রুমাল দান কালেকশন',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-21T14:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-21T14:00:00.000Z',
        updatedAt: '2026-08-21T14:30:00.000Z'
      },
      {
        id: 'inc-002',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000002',
        date: '2026-08-22',
        mainHeadId: 'head-inc-02',
        mainHeadNameBn: 'ওয়াকফ ও দোকান ভাড়া আয়',
        subHeadId: 'head-inc-02-1',
        subHeadNameBn: 'মসজিদ মার্কেট দোকান ভাড়া',
        amount: 45000,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        donorName: 'আলহাজ্ব মোঃ কামাল উদ্দিন (দোকান নং ১, ২ ও ৩)',
        reference: 'TRX-IBBL-889921',
        description: 'আগস্ট ২০২৬ মাসের দোকান ভাড়ার চেক জমা',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-22T11:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-22T10:00:00.000Z',
        updatedAt: '2026-08-22T11:00:00.000Z'
      },
      {
        id: 'inc-003',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000003',
        date: '2026-08-23',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-4',
        subHeadNameBn: 'মসজিদ উন্নয়ন ও নির্মাণ তহবিল',
        amount: 50000,
        paymentMethod: 'BKASH',
        accountId: accBkash.id,
        accountName: accBkash.nameBn,
        donorName: 'ইঞ্জিনিয়ার মাহবুবুল আলম (প্রবাসী)',
        donorPhone: '01712000000',
        reference: 'BKASH-9KL31XQ',
        description: 'মসজিদের ২য় তলার টাইলস কাজের জন্য এককালীন অনুদান',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-23T16:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-23T15:30:00.000Z',
        updatedAt: '2026-08-23T16:00:00.000Z'
      },
      {
        id: 'inc-004',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000004',
        date: '2026-08-24',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-1',
        subHeadNameBn: 'জুমার সাধারণ দান (Friday Collection)',
        amount: 12000,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        donorName: 'মাগরিবের মুসল্লিবৃন্দ',
        description: 'মাগরিবের নামাজের পর বিশেষ দোয়া মাহফিলের এককালীন কালেকশন',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-24T19:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-24T19:00:00.000Z',
        updatedAt: '2026-08-24T19:30:00.000Z'
      },
      {
        id: 'inc-005',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000005',
        date: '2026-08-25',
        mainHeadId: 'head-inc-02',
        mainHeadNameBn: 'ওয়াকফ ও দোকান ভাড়া আয়',
        subHeadId: 'head-inc-02-1',
        subHeadNameBn: 'মসজিদ মার্কেট দোকান ভাড়া',
        amount: 15000,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        donorName: 'মোঃ রফিকুল ইসলাম (দোকান নং ১ - আল-মদিনা ফার্মেসি)',
        reference: 'RENT-AUG-01',
        description: 'আগস্ট ২০২৬ মাসের ফার্মেসি দোকান ভাড়া ক্যাশে পরিশোধ',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-25T11:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-25T11:00:00.000Z',
        updatedAt: '2026-08-25T11:30:00.000Z'
      },
      {
        id: 'inc-006',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000006',
        date: '2026-08-25',
        mainHeadId: 'head-inc-02',
        mainHeadNameBn: 'ওয়াকফ ও দোকান ভাড়া আয়',
        subHeadId: 'head-inc-02-1',
        subHeadNameBn: 'ওয়াকফ পুকুর ইজারা আয়',
        amount: 18000,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        donorName: 'মোঃ সাইদুর রহমান (রুপালী ফিশারিজ)',
        reference: 'IBBL-DEP-44910',
        description: 'আগস্ট ২০২৬ মাসের ওয়াকফ পুকুর মৎস্য ইজারার কিস্তি জমা',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-25T14:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-25T13:30:00.000Z',
        updatedAt: '2026-08-25T14:00:00.000Z'
      },
      {
        id: 'inc-007',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000007',
        date: '2026-08-26',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-4',
        subHeadNameBn: 'মসজিদ উন্নয়ন ও নির্মাণ তহবিল',
        amount: 25000,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        donorName: 'আলহাজ্ব শামসুল হুদা',
        reference: 'REC-BOOK-04/12',
        description: 'মসজিদ কমপ্লেক্সের অজুখানা সংস্কার ও আধুনিকীকরণ ফান্ডে অনুদান',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-26T15:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-26T15:00:00.000Z',
        updatedAt: '2026-08-26T15:30:00.000Z'
      },
      {
        id: 'inc-008',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000008',
        date: '2026-08-27',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-1',
        subHeadNameBn: 'দানবাক্স কালেকশন তহবিল',
        amount: 16800,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        donorName: 'প্রধান গেট দানবাক্স (BOX-MAIN-GATE)',
        reference: 'BOX-COL-AUG-01',
        description: '১৫ আগস্ট তারিখের প্রধান ফটক দানবাক্স খোলার গণনাকৃত মোট জমা',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-27T17:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-27T16:00:00.000Z',
        updatedAt: '2026-08-27T17:00:00.000Z'
      },
      {
        id: 'inc-009',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000009',
        date: '2026-08-28',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-4',
        subHeadNameBn: 'এতিমখানা ও হেফজ ফান্ড অনুদান',
        amount: 8500,
        paymentMethod: 'BKASH',
        accountId: accBkash.id,
        accountName: accBkash.nameBn,
        donorName: 'মোছাঃ নাজনীন আক্তার',
        donorPhone: '01819554433',
        reference: 'BKASH-77GH19',
        description: 'মরহুম পিতামাতার ইসালে সাওয়াবের উদ্দেশ্যে এতিম ছাত্রদের খাদ্য সহায়তা অনুদান',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-28T12:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-28T11:45:00.000Z',
        updatedAt: '2026-08-28T12:00:00.000Z'
      },
      {
        id: 'inc-010',
        mosqueId: mosque1.id,
        voucherNumber: 'INC-2026-000010',
        date: '2026-08-29',
        mainHeadId: 'head-inc-01',
        mainHeadNameBn: 'দান ও অনুদান',
        subHeadId: 'head-inc-01-4',
        subHeadNameBn: 'সৌর প্যানেল ও আইপিএস স্থাপন তহবিল',
        amount: 35000,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        donorName: 'আলহাজ্ব ড. মোস্তফা কামাল (প্রবাসী যুক্তরাজ্য)',
        reference: 'TRX-CITY-891002',
        description: 'মসজিদের ৫ কিলোওয়াট সোলার সিস্টেম স্থাপন প্রজেক্টে বিশেষ দান',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-29T16:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-29T16:00:00.000Z',
        updatedAt: '2026-08-29T16:30:00.000Z'
      }
    );

    this.expenseEntries.push(
      {
        id: 'exp-001',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000001',
        date: '2026-08-20',
        mainHeadId: 'head-exp-02',
        mainHeadNameBn: 'বিদ্যুৎ, পানি ও গ্যাস বিল',
        subHeadId: 'head-exp-02-1',
        subHeadNameBn: 'মসজিদ ও এসি বিদ্যুৎ বিল',
        amount: 18450,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        payeeName: 'ডেসকো (DESCO) বিদ্যুৎ বিল',
        reference: 'DESCO-BILL-JULY-894',
        description: 'জুলাই মাসের মসজিদের সার্বিক বিদ্যুৎ ও এসি বিল পরিশোধ',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-20T12:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-20T11:00:00.000Z',
        updatedAt: '2026-08-20T12:00:00.000Z'
      },
      {
        id: 'exp-002',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000002',
        date: '2026-08-22',
        mainHeadId: 'head-exp-03',
        mainHeadNameBn: 'মেরামত, রক্ষণাবেক্ষণ ও সংস্কার',
        subHeadId: 'head-exp-03-1',
        subHeadNameBn: 'সাউন্ড সিস্টেম ও এসি সার্ভিসিং',
        amount: 5500,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        payeeName: 'মদিনা ইলেকট্রনিক্স ও সাউন্ড',
        reference: 'VOUCHER-084',
        description: 'মিহরাবের ওয়্যারলেস মাইক মেরামত এবং ২টি স্পিকার ক্যাবল প্রতিস্থাপন',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-22T17:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-22T16:30:00.000Z',
        updatedAt: '2026-08-22T17:00:00.000Z'
      },
      {
        id: 'exp-003',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000003',
        date: '2026-08-25',
        mainHeadId: 'head-exp-01',
        mainHeadNameBn: 'কর্মকর্তা ও কর্মচারীদের বেতন-ভাতা',
        subHeadId: 'head-exp-01-1',
        subHeadNameBn: 'খতীব ও পেশ ইমাম হাদিয়া',
        amount: 32000,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        payeeName: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন',
        reference: 'SALARY-AUG-STF01',
        description: 'আগস্ট ২০২৬ মাসের মাসিক মূল হাদিয়া ও বিশেষ ভাতা পরিশোধ',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-25T12:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-25T11:00:00.000Z',
        updatedAt: '2026-08-25T12:00:00.000Z'
      },
      {
        id: 'exp-004',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000004',
        date: '2026-08-25',
        mainHeadId: 'head-exp-01',
        mainHeadNameBn: 'কর্মকর্তা ও কর্মচারীদের বেতন-ভাতা',
        subHeadId: 'head-exp-01-2',
        subHeadNameBn: 'মুয়াজ্জিন ও সহকারী ইমাম হাদিয়া',
        amount: 18000,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        payeeName: 'হাফেজ ক্বারী মোঃ মাহমুদ হাসান',
        reference: 'SALARY-AUG-STF02',
        description: 'আগস্ট ২০২৬ মাসের প্রধান মুয়াজ্জিন সাহেবের বেতন পরিশোধ',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-25T12:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-25T11:30:00.000Z',
        updatedAt: '2026-08-25T12:30:00.000Z'
      },
      {
        id: 'exp-005',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000005',
        date: '2026-08-25',
        mainHeadId: 'head-exp-01',
        mainHeadNameBn: 'কর্মকর্তা ও কর্মচারীদের বেতন-ভাতা',
        subHeadId: 'head-exp-01-2',
        subHeadNameBn: 'খাদেম ও পরিচ্ছন্নতাকর্মী বেতন',
        amount: 9000,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        payeeName: 'মোঃ নুরুল ইসলাম',
        reference: 'SALARY-AUG-STF03',
        description: 'আগস্ট ২০২৬ মাসের প্রধান খাদেম সাহেবের বেতন (অগ্রিম কর্তনান্তে)',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-25T13:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-25T11:45:00.000Z',
        updatedAt: '2026-08-25T13:00:00.000Z'
      },
      {
        id: 'exp-006',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000006',
        date: '2026-08-26',
        mainHeadId: 'head-exp-03',
        mainHeadNameBn: 'মেরামত, রক্ষণাবেক্ষণ ও সংস্কার',
        subHeadId: 'head-exp-03-1',
        subHeadNameBn: 'জেনারেটর সার্ভিসিং ও জ্বালানি',
        amount: 8500,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        payeeName: 'বাংলা পাওয়ার জেনারেটর সার্ভিসেস',
        reference: 'SRV-GEN-8812',
        description: '৩০ কেভিএ ডিজেল জেনারেটরের মবিল পরিবর্তন ও এয়ার ফিল্টার সার্ভিসিং',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-26T16:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-26T15:00:00.000Z',
        updatedAt: '2026-08-26T16:00:00.000Z'
      },
      {
        id: 'exp-007',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000007',
        date: '2026-08-27',
        mainHeadId: 'head-exp-02',
        mainHeadNameBn: 'বিদ্যুৎ, পানি ও গ্যাস বিল',
        subHeadId: 'head-exp-02-2',
        subHeadNameBn: 'ওয়াকফ সম্পত্তি খাজনা ও কর',
        amount: 4500,
        paymentMethod: 'BANK',
        accountId: accBank.id,
        accountName: accBank.nameBn,
        payeeName: 'পল্লবী ইউনিয়ন ভূমি রাজস্ব অফিস',
        reference: 'DAK-2026-9854',
        description: 'ওয়াকফ মার্কেট (PROP-WAQF-01) এর বার্ষিক ভূমি উন্নয়ন কর পরিশোধ',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-27T12:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-27T11:00:00.000Z',
        updatedAt: '2026-08-27T12:00:00.000Z'
      },
      {
        id: 'exp-008',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000008',
        date: '2026-08-28',
        mainHeadId: 'head-exp-02',
        mainHeadNameBn: 'বিদ্যুৎ, পানি ও গ্যাস বিল',
        subHeadId: 'head-exp-02-2',
        subHeadNameBn: 'ওয়াকফ সম্পত্তি খাজনা ও কর',
        amount: 3200,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        payeeName: 'পল্লবী ভূমি রাজস্ব অফিস',
        reference: 'DAK-2026-9912',
        description: 'ওয়াকফ পুকুর জমির (PROP-WAQF-03) ভূমি রাজস্ব কর পরিশোধ',
        createdBy: 'usr-accountant-1',
        createdByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-28T14:30:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-28T14:00:00.000Z',
        updatedAt: '2026-08-28T14:30:00.000Z'
      },
      {
        id: 'exp-009',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000009',
        date: '2026-08-29',
        mainHeadId: 'head-exp-03',
        mainHeadNameBn: 'মেরামত, রক্ষণাবেক্ষণ ও সংস্কার',
        subHeadId: 'head-exp-03-1',
        subHeadNameBn: 'পুকুর পাড় সংস্কার ও সুরক্ষা পাইলিং',
        amount: 6000,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        payeeName: 'দেশ বিল্ডার্স ও শ্রমিক দল',
        reference: 'VOUCHER-098',
        description: 'ওয়াকফ পুকুরের উত্তর পাড়ের মাটি ভরাট ও বাঁশের পাইলিং সুরক্ষা ব্যয়',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-29T16:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-29T15:30:00.000Z',
        updatedAt: '2026-08-29T16:00:00.000Z'
      },
      {
        id: 'exp-010',
        mosqueId: mosque1.id,
        voucherNumber: 'EXP-2026-000010',
        date: '2026-08-29',
        mainHeadId: 'head-exp-03',
        mainHeadNameBn: 'মেরামত, রক্ষণাবেক্ষণ ও সংস্কার',
        subHeadId: 'head-exp-03-1',
        subHeadNameBn: 'আইপিএস ব্যাটারি ও এলইডি লাইট ফিটিং',
        amount: 19500,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        payeeName: 'রহিমআফ্রোজ ব্যাটারি ও লাইটিং কর্নার',
        reference: 'INV-RA-77810',
        description: 'কর্মপরিকল্পনা AP-2026-005 অনুযায়ী আইপিএস ব্যাটারি এসিড চেঞ্জ ও ৫০টি এলইডি লাইট স্থাপন',
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedBy: 'usr-admin-1',
        approvedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        approvedAt: '2026-08-29T18:00:00.000Z',
        status: 'APPROVED',
        createdAt: '2026-08-29T17:30:00.000Z',
        updatedAt: '2026-08-29T18:00:00.000Z'
      }
    );

    // 6. Donations
    this.donations.push(
      {
        id: 'don-001',
        mosqueId: mosque1.id,
        receiptNumber: 'REC-2026-000101',
        donorName: 'আলহাজ্ব শামসুল হুদা',
        donorPhone: '01715888999',
        donorAddress: 'রোড #৪, মিরপুর-১২, ঢাকা',
        isAnonymous: false,
        category: 'CONSTRUCTION',
        amount: 25000,
        paymentMethod: 'CASH',
        accountId: accCash.id,
        accountName: accCash.nameBn,
        reference: 'REC-BOOK-04/12',
        date: '2026-08-22',
        receivedBy: 'usr-admin-1',
        receivedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        status: 'COMPLETED',
        createdAt: '2026-08-22T15:00:00.000Z'
      },
      {
        id: 'don-002',
        mosqueId: mosque1.id,
        receiptNumber: 'REC-2026-000102',
        donorName: 'আল্লাহর এক বান্দা (Anonymous)',
        isAnonymous: true,
        category: 'GENERAL',
        amount: 10000,
        paymentMethod: 'BKASH',
        accountId: accBkash.id,
        accountName: accBkash.nameBn,
        reference: 'TRX-BKASH-7718',
        date: '2026-08-23',
        receivedBy: 'usr-accountant-1',
        receivedByName: 'আব্দুল কাদির (হিসাবরক্ষক)',
        status: 'COMPLETED',
        createdAt: '2026-08-23T11:00:00.000Z'
      }
    );

    // 7. Donation Boxes & Collections
    const box1: DonationBox = {
      id: 'box-01',
      mosqueId: mosque1.id,
      boxCode: 'BOX-MAIN-GATE',
      location: 'মসজিদের প্রধান ফটক (Main Gate Entrance)',
      description: 'স্টেইনলেস স্টিল দানবাক্স - প্রধান গেট',
      status: 'ACTIVE',
      lastCollectedDate: '2026-08-15',
      totalCollected: 142500,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    const box2: DonationBox = {
      id: 'box-02',
      mosqueId: mosque1.id,
      boxCode: 'BOX-WOMEN-GATE',
      location: 'মহিলা নামাজ কক্ষ ও পশ্চিম ফটক',
      status: 'ACTIVE',
      lastCollectedDate: '2026-08-15',
      totalCollected: 48000,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    this.donationBoxes.push(box1, box2);

    this.donationBoxCollections.push({
      id: 'box-col-01',
      mosqueId: mosque1.id,
      boxId: box1.id,
      boxCode: box1.boxCode,
      collectionDate: '2026-08-15',
      amount: 16800,
      countingTeam: ['মুহাম্মদ রফিকুল ইসলাম', 'আব্দুল কাদির', 'হাফেজ মাহমুদ'],
      witnesses: ['আলহাজ্ব মোঃ কামাল উদ্দিন', 'ডাঃ আক্তারুজ্জামান'],
      depositAccountId: accCash.id,
      depositAccountName: accCash.nameBn,
      depositReference: 'BOX-COL-AUG-01',
      incomeVoucherNumber: 'INC-2026-000001',
      notes: 'যৌথ গণনান্তে প্রধান ক্যাশে জমা প্রদান করা হয়েছে।',
      createdBy: 'usr-admin-1',
      createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
      createdAt: '2026-08-15T16:00:00.000Z'
    });

    // 8. Committee Management (Rules: 1 Active term, valid date logic)
    const term1: CommitteeTerm = {
      id: 'term-2024-2026',
      mosqueId: mosque1.id,
      title: 'পরিচালনা কমিটি (২০২৪ - ২০২৬)',
      startDate: '2024-10-01',
      endDate: '2026-09-30', // Active term (ends in ~1 month, perfect for testing 30-day upcoming committee rule!)
      status: 'ACTIVE',
      description: 'ওয়াকফ প্রশাসন অনুমোদিত ২১ সদস্য বিশিষ্ট পূর্ণাঙ্গ পরিচালনা পরিষদ।',
      membersCount: 7,
      createdAt: '2024-10-01T00:00:00.000Z'
    };
    this.committeeTerms.push(term1);

    this.committeeMembers.push(
      {
        id: 'mem-01',
        mosqueId: mosque1.id,
        termId: term1.id,
        name: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        nid: '19652691234567890',
        phone: '01711112233',
        address: 'বাড়ি #১২, রোড #৩, মিরপুর-১২',
        position: 'PRESIDENT',
        positionCustomBn: 'সভাপতি (President)',
        joinDate: '2024-10-01',
        status: 'ACTIVE',
        createdAt: '2024-10-01T00:00:00.000Z'
      },
      {
        id: 'mem-02',
        mosqueId: mosque1.id,
        termId: term1.id,
        name: 'আলহাজ্ব মোঃ শামসুল হুদা',
        nid: '19702691234567891',
        phone: '01715888999',
        address: 'রোড #৪, মিরপুর-১২',
        position: 'VICE_PRESIDENT',
        positionCustomBn: 'সহ-সভাপতি',
        joinDate: '2024-10-01',
        status: 'ACTIVE',
        createdAt: '2024-10-01T00:00:00.000Z'
      },
      {
        id: 'mem-03',
        mosqueId: mosque1.id,
        termId: term1.id,
        name: 'মুহাম্মদ রফিকুল ইসলাম',
        nid: '19752691234567892',
        phone: '01711223344',
        address: 'রোড #৭, মিরপুর-১২',
        position: 'SECRETARY',
        positionCustomBn: 'সাধারণ সম্পাদক (General Secretary)',
        joinDate: '2024-10-01',
        status: 'ACTIVE',
        createdAt: '2024-10-01T00:00:00.000Z'
      },
      {
        id: 'mem-04',
        mosqueId: mosque1.id,
        termId: term1.id,
        name: 'মোঃ জহিরুল হক',
        nid: '19782691234567893',
        phone: '01819555666',
        address: 'রোড #৫, মিরপুর-১২',
        position: 'TREASURER',
        positionCustomBn: 'কোষাধ্যক্ষ (Treasurer)',
        joinDate: '2024-10-01',
        status: 'ACTIVE',
        createdAt: '2024-10-01T00:00:00.000Z'
      },
      {
        id: 'mem-05',
        mosqueId: mosque1.id,
        termId: term1.id,
        name: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন',
        nid: '19822691234567894',
        phone: '01912444555',
        position: 'IMAM',
        positionCustomBn: 'খতীব ও পেশ ইমাম (পদাধিকারবলে সদস্য)',
        joinDate: '2024-10-01',
        status: 'ACTIVE',
        createdAt: '2024-10-01T00:00:00.000Z'
      }
    );

    // 9. Committee Meetings & Resolutions
    this.committeeMeetings.push({
      id: 'meet-001',
      mosqueId: mosque1.id,
      documentNumber: 'MM-2026-0001',
      meetingNumber: '০১',
      memoNumber: 'MJMWS-10/08/26/0001',
      date: '2026-08-10',
      dayName: 'সোমবার',
      time: 'রাত ০৮:৩০ (বাদ এশা)',
      endTime: 'রাত ১০:১৫',
      location: 'মসজিদ কনফারেন্স রুম / অফিস কক্ষ',
      meetingType: 'MONTHLY',
      meetingTypeBn: 'মাসিক নিয়মিত সভা',
      conductor: 'মুহাম্মদ রফিকুল ইসলাম',
      chairman: 'আলহাজ্ব মোঃ মকবুল হোসেন',
      chairmanDesignation: 'সভাপতি',
      secretary: 'মুহাম্মদ রফিকুল ইসলাম',
      duaLeader: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন',
      agenda: [
        '১. মসজিদের দ্বিতীয় তলার অসম্পূর্ণ টাইলস ও পেইন্ট কাজ সম্পন্নকরণ।',
        '২. আসন্ন রমজান ও বার্ষিক হিসাব নিরীক্ষা (Audit) প্রস্তুতি।',
        '৩. ইমাম ও মুয়াজ্জিন সাহেবের বার্ষিক হাদিয়া বৃদ্ধি প্রস্তাবনা।'
      ],
      agendaItems: [
        { id: 'ag-01', agendaNumber: 1, title: 'মসজিদের দ্বিতীয় তলার অসম্পূর্ণ টাইলস ও পেইন্ট কাজ সম্পন্নকরণ।', discussion: 'দ্বিতীয় তলার কাজ দীর্ঘদিন ধরে স্থগিত রয়েছে। মুসল্লীদের সুবিধার্থে অতি দ্রুত এটি শেষ করা প্রয়োজন। প্রাথমিকভাবে ৫০ হাজার টাকার বাজেট নির্ধারণ ও ৩ সদস্যের সাব-কমিটি প্রস্তাব করা হলো।' },
        { id: 'ag-02', agendaNumber: 2, title: 'আসন্ন রমজান ও বার্ষিক হিসাব নিরীক্ষা (Audit) প্রস্তুতি।', discussion: 'অর্ধবার্ষিক ও বার্ষিক অডিটের জন্য সকল ক্যাশ মেমো, ভাউচার ও ব্যাংক বিবরণী প্রস্তুত রাখার ব্যাপারে কোষাধ্যক্ষ মহোদয় অবহিত করেন।' },
        { id: 'ag-03', agendaNumber: 3, title: 'ইমাম ও মুয়াজ্জিন সাহেবের বার্ষিক হাদিয়া বৃদ্ধি প্রস্তাবনা।', discussion: 'দ্রব্যমূল্যের ঊর্ধ্বগতির বিষয়টি বিবেচনায় নিয়ে ইমাম ও মুয়াজ্জিন সাহেবের সম্মানি বৃদ্ধির প্রস্তাব সভাপতি মহোদয় উত্থাপন করেন এবং উপস্থিত সকলে একমত হন।' }
      ],
      membersPresent: [
        'আলহাজ্ব মোঃ মকবুল হোসেন',
        'আলহাজ্ব মোঃ শামসুল হুদা',
        'মুহাম্মদ রফিকুল ইসলাম',
        'মোঃ জহিরুল হক',
        'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন'
      ],
      membersAbsent: ['ডাঃ আক্তারুজ্জামান (অসুস্থতাজনিত অনুপস্থিত)'],
      attendees: [
        { memberId: 'mem-01', name: 'আলহাজ্ব মোঃ মকবুল হোসেন', designation: 'সভাপতি', phone: '01711122233', attendanceStatus: 'PRESENT', arrivalTime: '০৮:২৫' },
        { memberId: 'mem-02', name: 'আলহাজ্ব মোঃ শামসুল হুদা', designation: 'সহ-সভাপতি', phone: '01819234567', attendanceStatus: 'PRESENT', arrivalTime: '০৮:৩০' },
        { memberId: 'mem-03', name: 'মুহাম্মদ রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', phone: '01712345678', attendanceStatus: 'PRESENT', arrivalTime: '০৮:২০' },
        { memberId: 'mem-04', name: 'মোঃ জহিরুল হক', designation: 'কোষাধ্যক্ষ', phone: '01611223344', attendanceStatus: 'PRESENT', arrivalTime: '০৮:২৮' },
        { memberId: 'mem-05', name: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন', designation: 'খতীব ও পেশ ইমাম', phone: '01912444555', attendanceStatus: 'PRESENT', arrivalTime: '০৮:২০' },
        { memberId: 'mem-06', name: 'ডাঃ আক্তারুজ্জামান', designation: 'সদস্য', phone: '01511998877', attendanceStatus: 'ABSENT', remarks: 'অসুস্থতাজনিত অনুপস্থিত' }
      ],
      decisions: [
        '১. দ্বিতীয় তলার জন্য ৫০,০০০ টাকার প্রাথমিক বাজেট অনুমোদন এবং ৩ সদস্যের নির্মাণ সাব-কমিটি গঠন।',
        '২. সেপ্টেম্বর মাসের মধ্যে বহিঃনিরীক্ষক নিয়োগের সিদ্ধান্ত গৃহীত হলো।',
        '৩. আগামী মাস থেকে ইমাম সাহেবের হাদিয়া ৩,০০০ টাকা এবং মুয়াজ্জিনের ২,০০০ টাকা বৃদ্ধির প্রস্তাব সর্বসম্মতভাবে পাস।'
      ],
      decisionItems: [
        { id: 'dec-01', decisionNumber: 'সিদ্ধান্ত-১', agendaId: 'ag-01', agendaTitle: 'মসজিদের দ্বিতীয় তলার অসম্পূর্ণ টাইলস ও পেইন্ট কাজ সম্পন্নকরণ।', details: 'দ্বিতীয় তলার জন্য ৫০,০০০ টাকার প্রাথমিক বাজেট অনুমোদন এবং ৩ সদস্যের নির্মাণ সাব-কমিটি গঠন।', assignedMemberId: 'mem-04', assignedMemberName: 'মোঃ জহিরুল হক', assignedMemberDesignation: 'কোষাধ্যক্ষ', deadline: '2026-08-25', priority: 'HIGH', resolutionId: 'res-001', resolutionNumber: 'RES-2026-001' },
        { id: 'dec-02', decisionNumber: 'সিদ্ধান্ত-২', agendaId: 'ag-02', agendaTitle: 'আসন্ন রমজান ও বার্ষিক হিসাব নিরীক্ষা (Audit) প্রস্তুতি।', details: 'সেপ্টেম্বর মাসের মধ্যে বহিঃনিরীক্ষক নিয়োগ ও যাবতীয় ভাউচার নিরীক্ষার সিদ্ধান্ত গৃহীত হলো।', assignedMemberId: 'mem-03', assignedMemberName: 'মুহাম্মদ রফিকুল ইসলাম', assignedMemberDesignation: 'সাধারণ সম্পাদক', deadline: '2026-08-30', priority: 'NORMAL', resolutionId: 'res-002', resolutionNumber: 'RES-2026-002' },
        { id: 'dec-03', decisionNumber: 'সিদ্ধান্ত-৩', agendaId: 'ag-03', agendaTitle: 'ইমাম ও মুয়াজ্জিন সাহেবের বার্ষিক হাদিয়া বৃদ্ধি প্রস্তাবনা।', details: 'আগামী মাস থেকে ইমাম সাহেবের হাদিয়া ৩,০০০ টাকা এবং মুয়াজ্জিনের ২,০০০ টাকা বৃদ্ধির প্রস্তাব সর্বসম্মতভাবে পাস।', assignedMemberId: 'mem-04', assignedMemberName: 'মোঃ জহিরুল হক', assignedMemberDesignation: 'কোষাধ্যক্ষ', deadline: '2026-09-01', priority: 'NORMAL' }
      ],
      resolutions: [
        'রেজোলিউশন নং ০১/২০২৬: মসজিদের সম্প্রসারণ তহবিলের জন্য বিশেষ জুমার আবেদন পরিচালনা করা হবে।'
      ],
      assignedTasks: [
        { id: 'ts-01', taskDescription: 'দ্বিতীয় তলার টাইলস ও রঙের ব্যয় প্রাক্কলন ও মিস্ত্রি চূড়ান্ত করা', assignedMemberId: 'mem-04', assignedMemberName: 'মোঃ জহিরুল হক', assignedMemberDesignation: 'কোষাধ্যক্ষ', startDate: '2026-08-11', endDate: '2026-08-25', status: 'COMPLETED' },
        { id: 'ts-02', taskDescription: 'হিসাব নিরীক্ষা রিপোর্ট প্রস্তুতকরণ ও নিরীক্ষক দলের সাথে সমন্বয়', assignedMemberId: 'mem-03', assignedMemberName: 'মুহাম্মদ রফিকুল ইসলাম', assignedMemberDesignation: 'সাধারণ সম্পাদক', startDate: '2026-08-12', endDate: '2026-08-30', status: 'IN_PROGRESS' }
      ],
      actionItems: [
        { task: 'দ্বিতীয় তলার টাইলস ও রঙের ব্যয় প্রাক্কলন ও মিস্ত্রি চূড়ান্ত করা', assigneeName: 'মোঃ জহিরুল হক', assigneeDesignation: 'কোষাধ্যক্ষ', deadline: '2026-08-25' },
        { task: 'হিসাব নিরীক্ষা রিপোর্ট প্রস্তুতকরণ ও নিরীক্ষক দলের সাথে সমন্বয়', assigneeName: 'মুহাম্মদ রফিকুল ইসলাম', assigneeDesignation: 'সাধারণ সম্পাদক', deadline: '2026-08-30' }
      ],
      resolutionNumber: 'RES-2026-012',
      status: 'FINAL',
      notes: 'সকল সদস্যের উপস্থিতিতে আলোচনা ফলপ্রসূ হয়েছে।',
      createdAt: '2026-08-10T22:00:00.000Z'
    });

    // 9.1 Committee Resolutions (রেজোলিউশন তালিকা - আলাদা স্বয়ংসম্পূর্ণ নথি)
    this.committeeResolutions.push(
      {
        id: 'res-001',
        mosqueId: mosque1.id,
        resolutionNumber: 'RES-2026-001',
        meetingId: 'meet-001',
        meetingDocumentNumber: 'MM-2026-0001',
        meetingNumber: '০১',
        meetingMemoNumber: 'MJMWS-10/08/26/0001',
        meetingDate: '2026-08-10',
        meetingType: 'MONTHLY',
        meetingTypeBn: 'মাসিক নিয়মিত সভা',
        meetingVenue: 'মসজিদ কনফারেন্স রুম / অফিস কক্ষ',
        meetingChairman: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        meetingSecretary: 'মুহাম্মদ রফিকুল ইসলাম',
        agendaId: 'ag-01',
        agendaTitle: 'মসজিদের দ্বিতীয় তলার অসম্পূর্ণ টাইলস ও পেইন্ট কাজ সম্পন্নকরণ।',
        decisionId: 'dec-01',
        decisionNumber: 'সিদ্ধান্ত-১',
        date: '2026-08-10',
        subject: 'মসজিদের দ্বিতীয় তলার টাইলস ও রঙ কাজের বাজেট অনুমোদন এবং ৩ সদস্যের নির্মাণ সাব-কমিটি গঠন',
        background: 'মসজিদ কমপ্লেক্সের ২য় তলায় মুসল্লীদের নামাজ আদায়ের সুবিধার্থে অসম্পূর্ণ টাইলস ও পেইন্টিং কাজ অবিলম্বে শেষ করা অপরিহার্য হয়ে পড়েছে।',
        consideration: 'সভায় উপস্থিত সদস্যবৃন্দের পুঙ্খানুপুঙ্খ আলোচনা এবং কোষাধ্যক্ষ মহোদয়ের আর্থিক বিবরণী পর্যালোচনার প্রেক্ষিতে প্রাথমিক ৫০,০০০/- (পঞ্চাশ হাজার) টাকার ফান্ড বরাদ্দ সমীচীন বলে বিবেচিত হয়।',
        proposal: 'সম্মানিত সাধারণ সম্পাদক মুহাম্মদ রফিকুল ইসলাম কর্তৃক প্রস্তাবিত এবং সহ-সভাপতি আলহাজ্ব মোঃ শামসুল হুদা কর্তৃক সমর্থিত।',
        resolutionText: 'সর্বসম্মতিক্রমে সিদ্ধান্ত গৃহীত হলো যে, মসজিদ কমপ্লেক্সের ২য় তলার টাইলস ও রঙ কাজের জন্য প্রাথমিক ৫০,০০০/- টাকার বাজেট মঞ্জুর করা হলো। কাজটি সুষ্ঠু ও স্বচ্ছভাবে বাস্তবায়নের জন্য কোষাধ্যক্ষ মোঃ জহিরুল হককে আহ্বায়ক করে ৩ সদস্যের একটি নির্মাণ সাব-কমিটি গঠন করা হলো। উক্ত কমিটি আগামী ২৫ আগস্ট ২০২৬ তারিখের মধ্যে প্রয়োজনীয় মালামাল ও দরপত্র চূড়ান্ত করে কার্যক্রম সমাপ্ত করবে।',
        assignedMemberId: 'mem-04',
        assignedMemberName: 'মোঃ জহিরুল হক',
        assignedMemberDesignation: 'কোষাধ্যক্ষ',
        assignedMemberPhone: '01611223344',
        deadline: '2026-08-25',
        status: 'APPROVED',
        priority: 'HIGH',
        remarks: 'উন্নয়ন তহবিল থেকে উক্ত ব্যয় নির্বাহ করা হবে।',
        createdAt: '2026-08-10T22:30:00.000Z'
      },
      {
        id: 'res-002',
        mosqueId: mosque1.id,
        resolutionNumber: 'RES-2026-002',
        meetingId: 'meet-001',
        meetingDocumentNumber: 'MM-2026-0001',
        meetingNumber: '০১',
        meetingMemoNumber: 'MJMWS-10/08/26/0001',
        meetingDate: '2026-08-10',
        meetingType: 'MONTHLY',
        meetingTypeBn: 'মাসিক নিয়মিত সভা',
        meetingVenue: 'মসজিদ কনফারেন্স রুম / অফিস কক্ষ',
        meetingChairman: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        meetingSecretary: 'মুহাম্মদ রফিকুল ইসলাম',
        agendaId: 'ag-02',
        agendaTitle: 'আসন্ন রমজান ও বার্ষিক হিসাব নিরীক্ষা (Audit) প্রস্তুতি।',
        decisionId: 'dec-02',
        decisionNumber: 'সিদ্ধান্ত-২',
        date: '2026-08-10',
        subject: 'মসজিদের বিগত অর্থবছরের হিসাব নিরীক্ষা (Internal & External Audit) টিম চূড়ান্তকরণ',
        background: 'মসজিদের আর্থিক স্বচ্ছতা ও জবাবদিহিতা নিশ্চিতকরণে প্রতি অর্থবছরের আয়-ব্যয় অডিট সম্পন্ন করা আবশ্যক।',
        consideration: 'কমিটির সকল সদস্যের উপস্থিতিতে উন্মুক্ত পর্যালোচনায় স্বচ্ছ ও নিরপেক্ষ অডিটের গুরুত্ব সর্বসম্মতভাবে প্রতিফলিত হয়।',
        proposal: 'কোষাধ্যক্ষ মোঃ জহিরুল হক কর্তৃক প্রস্তাবিত এবং সভাপতি মহোদয় কর্তৃক অনুমোদিত।',
        resolutionText: 'গৃহীত সিদ্ধান্ত মোতাবেক, আগামী ৩০ আগস্ট ২০২৬ তারিখের মধ্যে সাধারণ সম্পাদক মুহাম্মদ রফিকুল ইসলামের নেতৃত্বে হিসাব ও ভাউচার প্রস্তুত করে ২ সদস্যের স্বতন্ত্র নিরীক্ষক দলের নিকট হস্তান্তর করা হবে এবং আগামী সাধারণ সভায় চূড়ান্ত অডিট রিপোর্ট উপস্থাপন করা হবে।',
        assignedMemberId: 'mem-03',
        assignedMemberName: 'মুহাম্মদ রফিকুল ইসলাম',
        assignedMemberDesignation: 'সাধারণ সম্পাদক',
        assignedMemberPhone: '01712345678',
        deadline: '2026-08-30',
        status: 'IMPLEMENTED',
        priority: 'NORMAL',
        remarks: 'অডিট টিমকে পূর্ণাঙ্গ সহযোগিতা প্রদানের নির্দেশ দেওয়া হলো।',
        createdAt: '2026-08-10T22:45:00.000Z'
      }
    );

    // 9.1 Committee Action Plans (কমিটি কর্মপরিকল্পনা ও বাস্তবায়ন অগ্রগতি)
    this.committeeActionPlans.push(
      {
        id: 'plan-001',
        mosqueId: mosque1.id,
        planNumber: 'AP-2026-001',
        termId: term1.id,
        termTitle: term1.title,
        title: 'মসজিদের অজুখানা ও ওজুখুটির টাইলস সংস্কার ও পানি লাইন মেরামত',
        description: 'অজুখানার পুরাতন ভাঙা টাইলস অপসারণ করে নন-স্লিপ গ্রানাইট টাইলস স্থাপন এবং পানির নতুন পাইপ ও ফ্লাশ লাইন স্থাপন। মুসল্লীদের সুবিধার্থে সার্বক্ষণিক পরিষ্কার ও দুর্গন্ধমুক্ত পরিবেশ বজায় রাখা।',
        category: 'অজুখানা',
        priority: 'HIGH',
        responsibleMemberId: 'mem-04',
        responsibleMemberName: 'মোঃ জহিরুল হক',
        responsibleMemberDesignation: 'কোষাধ্যক্ষ (Treasurer)',
        responsibleMemberPhone: '01611223344',
        responsibleMembers: [
          { id: 'mem-04', name: 'মোঃ জহিরুল হক', designation: 'কোষাধ্যক্ষ', phone: '01611223344' }
        ],
        assistantMemberIds: ['mem-06'],
        assistantMembers: [
          { id: 'mem-06', name: 'ডাঃ আক্তারুজ্জামান', designation: 'সদস্য', phone: '01511998877' }
        ],
        startDate: '2026-08-12',
        dueDate: '2026-09-05',
        estimatedBudget: 45000,
        actualCost: 28000,
        fundingSource: 'উন্নয়ন ও সংস্কার ফান্ড (Bank Asia)',
        fundingAccountId: 'acc-02',
        fundingAccountName: 'উন্নয়ন তহবিল - ব্যাংক একাউন্ট',
        status: 'IN_PROGRESS',
        progressPercentage: 65,
        remarks: 'টাইলস কেনার কাজ সম্পন্ন, পাইপ ফিটিং চলমান।',
        resolutionId: 'res-001',
        resolutionNumber: 'RES-2026-001',
        resolutionSubject: 'মসজিদের দ্বিতীয় তলার টাইলস ও রঙ কাজের বাজেট অনুমোদন এবং ৩ সদস্যের নির্মাণ সাব-কমিটি গঠন',
        meetingId: 'meet-001',
        meetingNumber: '০১',
        decisionNumber: 'সিদ্ধান্ত-১',
        attachments: [
          {
            id: 'att-1',
            name: 'পুরাতন_অজুখানার_ছবি_সংস্কারের_পূর্বে.jpg',
            url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600&auto=format&fit=crop&q=80',
            type: 'BEFORE_PHOTO',
            typeBn: 'কাজের পূর্বের ছবি',
            uploadedAt: '2026-08-12T09:00:00.000Z',
            uploadedByName: 'মোঃ জহিরুল হক'
          },
          {
            id: 'att-2',
            name: 'চলমান_টাইলস_কাজ_পরিদর্শন.jpg',
            url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&auto=format&fit=crop&q=80',
            type: 'DURING_PHOTO',
            typeBn: 'কাজের চলমান ছবি',
            uploadedAt: '2026-08-20T14:30:00.000Z',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম'
          },
          {
            id: 'att-3',
            name: 'টাইলস_ক্রয়_ভাউচার_বিল.pdf',
            url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
            type: 'BILL',
            typeBn: 'বিল ও ভাউচার',
            uploadedAt: '2026-08-18T11:00:00.000Z',
            uploadedByName: 'মোঃ জহিরুল হক'
          }
        ],
        activityLogs: [
          {
            id: 'act-1',
            action: 'CREATE',
            details: 'কর্মপরিকল্পনা তৈরি করা হয়েছে। রেজোলিউশন: RES-2026-001',
            changedBy: 'usr-admin-1',
            changedByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
            timestamp: '2026-08-11T10:00:00.000Z'
          },
          {
            id: 'act-2',
            action: 'PROGRESS_UPDATE',
            details: 'অগ্রগতি ৩০% এ উন্নীত এবং টাইলস মালামাল ক্রয় সম্পন্ন।',
            changedBy: 'usr-admin-1',
            changedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            timestamp: '2026-08-18T16:00:00.000Z',
            previousState: '0%',
            newState: '30%'
          },
          {
            id: 'act-3',
            action: 'PROGRESS_UPDATE',
            details: 'অগ্রগতি ৬৫% এ উন্নীত করা হয়েছে।',
            changedBy: 'usr-admin-1',
            changedByName: 'মোঃ জহিরুল হক',
            timestamp: '2026-08-22T11:00:00.000Z',
            previousState: '30%',
            newState: '65%'
          }
        ],
        createdBy: 'usr-admin-1',
        createdByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        createdAt: '2026-08-11T10:00:00.000Z',
        updatedAt: '2026-08-22T11:00:00.000Z'
      },
      {
        id: 'plan-002',
        mosqueId: mosque1.id,
        planNumber: 'AP-2026-002',
        termId: term1.id,
        termTitle: term1.title,
        title: 'মসজিদের প্রধান হলরুমের সাউন্ড সিস্টেম ও ডিজিটাল ওয়্যারলেস মাইক স্থাপন',
        description: 'মিহরাব, খুতবার মিম্বর ও মহিলাদের নামাজ হলের জন্য উচ্চমানের ডিজিটাল অডিও মিক্সার ও ফিডব্যাকলেস ওয়্যারলেস মাইক্রোফোন সেটআপ সম্পন্নকরণ।',
        category: 'সাউন্ড সিস্টেম',
        priority: 'URGENT',
        responsibleMemberId: 'mem-03',
        responsibleMemberName: 'মুহাম্মদ রফিকুল ইসলাম',
        responsibleMemberDesignation: 'সাধারণ সম্পাদক (General Secretary)',
        responsibleMemberPhone: '01712345678',
        responsibleMembers: [
          { id: 'mem-03', name: 'মুহাম্মদ রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', phone: '01712345678' }
        ],
        assistantMemberIds: ['mem-05'],
        assistantMembers: [
          { id: 'mem-05', name: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন', designation: 'খতীব ও পেশ ইমাম', phone: '01912444555' }
        ],
        startDate: '2026-08-01',
        dueDate: '2026-08-10',
        completedDate: '2026-08-09',
        estimatedBudget: 35000,
        actualCost: 32500,
        fundingSource: 'সাধারণ দান ফান্ড (ক্যাশ)',
        fundingAccountId: 'acc-01',
        fundingAccountName: 'প্রধান ক্যাশ তহবিল',
        status: 'COMPLETED',
        progressPercentage: 100,
        remarks: 'জুমার নামাজে সফলভাবে পরীক্ষা করা হয়েছে এবং মুসল্লিরা প্রশংসা করেছেন।',
        attachments: [
          {
            id: 'att-201',
            name: 'নতুন_সাউন্ড_সিস্টেম_ইনস্টলেশন_পরবর্তী_ছবি.jpg',
            url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80',
            type: 'AFTER_PHOTO',
            typeBn: 'কাজের সমাপ্তির ছবি',
            uploadedAt: '2026-08-09T18:00:00.000Z',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম'
          },
          {
            id: 'att-202',
            name: 'সাউন্ড_ইকুইপমেন্ট_ক্রয়_ইনভয়েস.pdf',
            url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
            type: 'INVOICE',
            typeBn: 'ইনভয়েস / রশিদ',
            uploadedAt: '2026-08-09T18:30:00.000Z',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম'
          }
        ],
        activityLogs: [
          {
            id: 'act-201',
            action: 'CREATE',
            details: 'কর্মপরিকল্পনা তৈরি করা হয়েছে।',
            changedBy: 'usr-admin-1',
            changedByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
            timestamp: '2026-08-01T09:00:00.000Z'
          },
          {
            id: 'act-202',
            action: 'MARK_COMPLETED',
            details: 'সাউন্ড সিস্টেম ইনস্টলেশন ও টেস্টিং সফলভাবে সম্পন্ন হয়েছে। অগ্রগতি ১০০%',
            changedBy: 'usr-admin-1',
            changedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            timestamp: '2026-08-09T19:00:00.000Z',
            previousState: 'IN_PROGRESS',
            newState: 'COMPLETED'
          }
        ],
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        createdAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-09T19:00:00.000Z'
      },
      {
        id: 'plan-003',
        mosqueId: mosque1.id,
        planNumber: 'AP-2026-003',
        termId: term1.id,
        termTitle: term1.title,
        title: 'মসজিদ চত্বর ও প্রবেশদ্বারে ৪টি নাইট ভিশন CCTV ক্যামেরা ও এনভিআর স্থাপন',
        description: 'মসজিদের প্রধান গেট, দানবাক্স এলাকা, জুতার তাক ও গাড়ি পার্কিং জোনে সার্বক্ষণিক নিরাপত্তার জন্য ৮-চ্যানেল এনভিআরসহ ৪টি ৫ মেগাপিক্সেল আইপি ক্যামেরা সংযোগ।',
        category: 'CCTV / নিরাপত্তা',
        priority: 'HIGH',
        responsibleMemberId: 'mem-02',
        responsibleMemberName: 'আলহাজ্ব মোঃ শামসুল হুদা',
        responsibleMemberDesignation: 'সহ-সভাপতি',
        responsibleMemberPhone: '01819234567',
        responsibleMembers: [
          { id: 'mem-02', name: 'আলহাজ্ব মোঃ শামসুল হুদা', designation: 'সহ-সভাপতি', phone: '01819234567' }
        ],
        startDate: '2026-08-25',
        dueDate: '2026-09-15',
        estimatedBudget: 55000,
        actualCost: 0,
        fundingSource: 'নিরাপত্তা ও আইটি তহবিল',
        fundingAccountId: 'acc-02',
        fundingAccountName: 'উন্নয়ন তহবিল - ব্যাংক একাউন্ট',
        status: 'TODO',
        progressPercentage: 0,
        remarks: 'দরপত্র যাচাই চলছে। আগামী সপ্তাহে ভেন্ডর চূড়ান্ত হবে।',
        activityLogs: [
          {
            id: 'act-301',
            action: 'CREATE',
            details: 'নতুন নিরাপত্তা কর্মপরিকল্পনা অন্তর্ভুক্তি।',
            changedBy: 'usr-admin-1',
            changedByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
            timestamp: '2026-08-20T11:00:00.000Z'
          }
        ],
        createdBy: 'usr-admin-1',
        createdByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        createdAt: '2026-08-20T11:00:00.000Z',
        updatedAt: '2026-08-20T11:00:00.000Z'
      },
      {
        id: 'plan-004',
        mosqueId: mosque1.id,
        planNumber: 'AP-2026-004',
        termId: term1.id,
        termTitle: term1.title,
        title: 'মসজিদ সংলগ্ন কবরস্থানের সীমানা প্রাচীর ও সৌর বাতি স্থাপন',
        description: 'কবরস্থানের পূর্ব পাশের ভাঙা দেয়াল পুনর্নির্মাণ, আগাছা পরিষ্কার এবং রাতে আলোর সুবিধার্থে ২টি স্বয়ংক্রিয় সৌর সড়ক বাতি (Solar Street Light) স্থাপন।',
        category: 'কবরস্থান',
        priority: 'MEDIUM',
        responsibleMemberId: 'mem-04',
        responsibleMemberName: 'মোঃ জহিরুল হক',
        responsibleMemberDesignation: 'কোষাধ্যক্ষ (Treasurer)',
        responsibleMemberPhone: '01611223344',
        responsibleMembers: [
          { id: 'mem-04', name: 'মোঃ জহিরুল হক', designation: 'কোষাধ্যক্ষ', phone: '01611223344' }
        ],
        startDate: '2026-07-15',
        dueDate: '2026-08-15',
        estimatedBudget: 75000,
        actualCost: 18000,
        fundingSource: 'কবরস্থান ওয়াকফ ফান্ড',
        status: 'ON_HOLD',
        progressPercentage: 25,
        remarks: 'বর্ষা ও বৃষ্টির কারণে দেয়াল প্লাস্টারের কাজ সাময়িকভাবে স্থগিত আছে। আবহাওয়া স্বাভাবিক হলে শুরু হবে।',
        activityLogs: [
          {
            id: 'act-401',
            action: 'CREATE',
            details: 'কর্মপরিকল্পনা গৃহীত হয়েছে।',
            changedBy: 'usr-admin-1',
            changedByName: 'মোঃ জহিরুল হক',
            timestamp: '2026-07-15T10:00:00.000Z'
          },
          {
            id: 'act-402',
            action: 'STATUS_CHANGE',
            details: 'বর্ষাজনিত কারণে কাজটি স্থগিত (ON_HOLD) করা হলো।',
            changedBy: 'usr-admin-1',
            changedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            timestamp: '2026-08-05T12:00:00.000Z',
            previousState: 'IN_PROGRESS',
            newState: 'ON_HOLD'
          }
        ],
        createdBy: 'usr-admin-1',
        createdByName: 'মোঃ জহিরুল হক',
        createdAt: '2026-07-15T10:00:00.000Z',
        updatedAt: '2026-08-05T12:00:00.000Z'
      },
      {
        id: 'plan-005',
        mosqueId: mosque1.id,
        planNumber: 'AP-2026-005',
        termId: term1.id,
        termTitle: term1.title,
        title: 'মসজিদের আইপিএস ব্যাটারি সার্ভিসিং ও বিদ্যুৎ সাশ্রয়ী LED লাইট স্থাপন',
        description: 'লোডশেডিংকালীন সার্বক্ষণিক আলোর ব্যাকআপের জন্য ২০০ অ্যাম্পিয়ারের আইপিএস ব্যাটারি এসিড পরিবর্তন এবং মূল হলে ৫০টি এনার্জি সেভিং এলইডি প্যানেল লাইট পরিবর্তন।',
        category: 'বিদ্যুৎ',
        priority: 'URGENT',
        responsibleMemberId: 'mem-03',
        responsibleMemberName: 'মুহাম্মদ রফিকুল ইসলাম',
        responsibleMemberDesignation: 'সাধারণ সম্পাদক (General Secretary)',
        responsibleMemberPhone: '01712345678',
        responsibleMembers: [
          { id: 'mem-03', name: 'মুহাম্মদ রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', phone: '01712345678' }
        ],
        startDate: '2026-08-15',
        dueDate: '2026-08-28',
        estimatedBudget: 22000,
        actualCost: 19500,
        fundingSource: 'সাধারণ বিদ্যুৎ রক্ষণাবেক্ষণ তহবিল',
        status: 'IN_PROGRESS',
        progressPercentage: 85,
        remarks: 'ব্যাটারি সার্ভিসিং সম্পন্ন, লাইট ফিটিং শেষ পর্যায়ে।',
        activityLogs: [
          {
            id: 'act-501',
            action: 'CREATE',
            details: 'কর্মপরিকল্পনা তৈরি হয়েছে।',
            changedBy: 'usr-admin-1',
            changedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            timestamp: '2026-08-15T08:00:00.000Z'
          },
          {
            id: 'act-502',
            action: 'PROGRESS_UPDATE',
            details: 'অগ্রগতি ৮৫% এ উন্নীত করা হয়েছে।',
            changedBy: 'usr-admin-1',
            changedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            timestamp: '2026-08-24T17:00:00.000Z',
            previousState: '0%',
            newState: '85%'
          }
        ],
        createdBy: 'usr-admin-1',
        createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
        createdAt: '2026-08-15T08:00:00.000Z',
        updatedAt: '2026-08-24T17:00:00.000Z'
      }
    );

    // 9.2 Committee Notices
    this.committeeNotices.push({
      id: 'not-001',
      mosqueId: mosque1.id,
      memoNo: 'MJMWS-05/08/26/0001',
      serialNumber: '০১',
      noticeDate: '2026-08-05',
      meetingDate: '2026-08-10',
      dayName: 'সোমবার',
      time: 'রাত ০৮:৩০ (বাদ এশা)',
      venue: 'মসজিদ কনফারেন্স রুম / অফিস কক্ষ',
      meetingType: 'MONTHLY',
      meetingTypeBn: 'মাসিক নিয়মিত সভা',
      agendas: [
        'মসজিদের দ্বিতীয় তলার অসম্পূর্ণ টাইলস ও পেইন্ট কাজ সম্পন্নকরণ।',
        'আসন্ন রমজান ও বার্ষিক হিসাব নিরীক্ষা (Audit) প্রস্তুতি।',
        'ইমাম ও মুয়াজ্জিন সাহেবের বার্ষিক হাদিয়া বৃদ্ধি প্রস্তাবনা।'
      ],
      remarks: 'সকল সম্মানিত সদস্যকে যথাসময়ে উপস্থিত থাকার জন্য বিশেষভাবে অনুরোধ করা হলো।',
      status: 'CONVERTED_TO_MINUTES',
      createdAt: '2026-08-05T10:00:00.000Z'
    });

    // 9.2 Committee Activities (সদস্য কার্যক্রম)
    this.committeeActivities.push(
      {
        id: 'cact-001',
        mosqueId: mosque1.id,
        termId: term1.id,
        memberId: 'mem-03',
        memberName: 'মুহাম্মদ রফিকুল ইসলাম',
        memberDesignation: 'সাধারণ সম্পাদক (General Secretary)',
        activityType: 'MOSQUE_DEVELOPMENT',
        activityTypeBn: 'মসজিদ উন্নয়ন কাজ',
        category: 'COMMITTEE_ACTIVITY',
        title: '২য় তলার টাইলস ও পেইন্টিং কাজের নিয়মিত তদারকি ও মিস্ত্রি চূড়ান্তকরণ',
        description: 'মসজিদ কমপ্লেক্সের ২য় তলায় চলমান নির্মাণ ও টাইলস ফিটিংয়ের গুণগত মান পরিদর্শন ও ঠিকাদারদের সাথে সমন্বয় সভা।',
        date: '2026-08-15',
        relatedMeetingId: 'meet-001',
        relatedMeetingTitle: 'মাসিক নিয়মিত সভা (০১)',
        assignedBy: 'usr-admin-1',
        assignedByName: 'আলহাজ্ব মোঃ মকবুল হোসেন (সভাপতি)',
        status: 'COMPLETED',
        qualityRating: 'EXCELLENT',
        qualityScore: 95,
        evaluatorNote: 'অত্যন্ত নিষ্ঠা ও দ্রুততার সাথে উন্নয়ন কাজটি সফলভাবে বাস্তবায়ন করেছেন।',
        createdAt: '2026-08-15T12:00:00.000Z'
      },
      {
        id: 'cact-002',
        mosqueId: mosque1.id,
        termId: term1.id,
        memberId: 'mem-04',
        memberName: 'মোঃ জহিরুল হক',
        memberDesignation: 'কোষাধ্যক্ষ (Treasurer)',
        activityType: 'ACCOUNTS_AUDIT_SUPPORT',
        activityTypeBn: 'হিসাব/অডিট সহযোগিতা',
        category: 'COMMITTEE_ACTIVITY',
        title: 'অর্ধবার্ষিক আয়-ব্যয় ভাউচার নিরীক্ষা ও ব্যাংক স্টেটমেন্ট রিকনসিলিয়েশন',
        description: 'গত ৬ মাসের যাবতীয় আয়-ব্যয় রসিদ ও ব্যাংকের লেনদেনের তালিকা নিরীক্ষকদের নিকট সুবিন্যস্তভাবে উপস্থাপন।',
        date: '2026-08-18',
        relatedMeetingId: 'meet-001',
        relatedMeetingTitle: 'মাসিক নিয়মিত সভা (০১)',
        assignedBy: 'usr-admin-1',
        assignedByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        status: 'COMPLETED',
        qualityRating: 'EXCELLENT',
        qualityScore: 92,
        evaluatorNote: 'হিসাবের স্বচ্ছতা বজায় রেখে সুন্দরভাবে রিপোর্ট প্রণয়ন করেছেন।',
        createdAt: '2026-08-18T16:00:00.000Z'
      },
      {
        id: 'cact-003',
        mosqueId: mosque1.id,
        termId: term1.id,
        memberId: 'mem-02',
        memberName: 'আলহাজ্ব মোঃ শামসুল হুদা',
        memberDesignation: 'সহ-সভাপতি',
        activityType: 'DONATION_COLLECTION',
        activityTypeBn: 'দান সংগ্রহ',
        category: 'COMMITTEE_ACTIVITY',
        title: 'মসজিদ কমপ্লেক্সের জন্য প্রবাসী দাতাদের সাথে ফান্ডরাইজিং বৈঠক',
        description: 'প্রবাসী শুভাকাঙ্ক্ষীদের সাথে যোগাযোগ করে মসজিদ উন্নয়ন ফান্ডের জন্য অনুদান সংগ্রহে বিশেষ ভূমিকা পালন।',
        date: '2026-08-20',
        assignedBy: 'usr-admin-1',
        assignedByName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
        status: 'COMPLETED',
        qualityRating: 'GOOD',
        qualityScore: 88,
        evaluatorNote: 'প্রবাসী দাতাদের উদ্বুদ্ধকরণে কার্যকর ভূমিকা রেখেছেন।',
        createdAt: '2026-08-20T10:00:00.000Z'
      },
      {
        id: 'cact-004',
        mosqueId: mosque1.id,
        termId: term1.id,
        memberId: 'mem-03',
        memberName: 'মুহাম্মদ রফিকুল ইসলাম',
        memberDesignation: 'সাধারণ সম্পাদক (General Secretary)',
        activityType: 'AGENDA_DISCUSSION',
        activityTypeBn: 'এজেন্ডা আলোচনা',
        category: 'MEETING_PARTICIPATION',
        title: 'ইমাম-মুয়াজ্জিন হাদিয়া বৃদ্ধি ও বাজেট পরিকল্পনা প্রস্তাবনা উপস্থাপন',
        description: 'মাসিক সভায় খতীব ও স্টাফদের হাদিয়া সমন্বয়ের যৌক্তিকতা তুলে ধরেন এবং সর্বসম্মতিক্রমে সিদ্ধান্ত গ্রহণে সহায়তা করেন।',
        date: '2026-08-10',
        relatedMeetingId: 'meet-001',
        relatedMeetingTitle: 'মাসিক নিয়মিত সভা (০১)',
        status: 'COMPLETED',
        qualityRating: 'EXCELLENT',
        qualityScore: 95,
        createdAt: '2026-08-10T21:00:00.000Z'
      }
    );

    // 9.3 Committee Member Tasks (অর্পিত দায়িত্ব)
    this.committeeTasks.push(
      {
        id: 'ctsk-001',
        mosqueId: mosque1.id,
        termId: term1.id,
        memberId: 'mem-04',
        memberName: 'মোঃ জহিরুল হক',
        memberDesignation: 'কোষাধ্যক্ষ',
        taskTitle: 'দ্বিতীয় তলার টাইলস ও রঙের ব্যয় প্রাক্কলন ও মিস্ত্রি চূড়ান্ত করা',
        description: 'কোটেশন সংগ্রহ করে নির্মাণ সাব-কমিটির সাথে চূড়ান্ত দরদাম নির্ধারণ।',
        meetingId: 'meet-001',
        meetingNumber: '০১',
        assignedDate: '2026-08-10',
        dueDate: '2026-08-25',
        completedDate: '2026-08-24',
        status: 'COMPLETED',
        qualityRating: 'EXCELLENT',
        qualityScore: 95,
        evaluatorNote: 'নির্ধারিত তারিখের আগেই সফলভাবে সম্পন্ন।',
        createdAt: '2026-08-10T22:00:00.000Z'
      },
      {
        id: 'ctsk-002',
        mosqueId: mosque1.id,
        termId: term1.id,
        memberId: 'mem-03',
        memberName: 'মুহাম্মদ রফিকুল ইসলাম',
        memberDesignation: 'সাধারণ সম্পাদক',
        taskTitle: 'হিসাব নিরীক্ষা রিপোর্ট প্রস্তুতকরণ ও নিরীক্ষক দলের সাথে সমন্বয়',
        description: 'বার্ষিক হিসাব প্রস্তুত করে নিরীক্ষকদের চূড়ান্ত তারিখ নির্ধারণ করা।',
        meetingId: 'meet-001',
        meetingNumber: '০১',
        assignedDate: '2026-08-10',
        dueDate: '2026-08-30',
        status: 'IN_PROGRESS',
        createdAt: '2026-08-10T22:00:00.000Z'
      }
    );

    // 9.4 Committee Manual Evaluations (ম্যানুয়াল মূল্যায়ন)
    this.committeeManualEvaluations.push({
      id: 'meval-001',
      mosqueId: mosque1.id,
      termId: term1.id,
      memberId: 'mem-03',
      memberName: 'মুহাম্মদ রফিকুল ইসলাম',
      memberDesignation: 'সাধারণ সম্পাদক (General Secretary)',
      evaluationPeriodType: 'MONTHLY',
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
      overallAssessment: 'মসজিদ পরিচালনা, মিটিং পরিচালনা এবং সামগ্রিক ব্যবস্থাপনায় অত্যন্ত একনিষ্ঠ ও দায়িত্বশীল ভূমিকা পালন করে যাচ্ছেন।',
      strengths: 'সময়ানুবর্তিতা, স্বচ্ছতা, চমৎকার যোগাযোগ দক্ষতা এবং দ্রুত সিদ্ধান্ত বাস্তবায়নের ক্ষমতা।',
      weaknesses: 'কমিটির অন্যান্য সদস্যদের আরো বেশি সক্রিয় করার উদ্যোগ বাড়ানো যেতে পারে।',
      improvementRequired: 'ডিজিটাল নোটিশ প্রদান ও অনলাইন অনুদান প্রক্রিয়ায় সার্বক্ষণিক তদারকি।',
      recommendation: 'EXCELLENT',
      evaluatorComment: 'কমিটির কার্যক্রমকে গতিশীল রাখতে তাঁর ভূমিকা প্রশংসনীয়।',
      evaluatorId: 'usr-admin-1',
      evaluatorName: 'আলহাজ্ব মোঃ মকবুল হোসেন',
      evaluatorRole: 'PRESIDENT',
      createdAt: '2026-08-25T10:00:00.000Z'
    });

    // 10. Staff & Payroll
    this.staffList.push(
      {
        id: 'stf-01',
        mosqueId: mosque1.id,
        name: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন',
        nid: '19822691234567894',
        phone: '01912444555',
        designation: 'IMAM',
        designationBn: 'খতীব ও পেশ ইমাম',
        address: 'মসজিদ কোয়ার্টার, ৩য় তলা',
        joiningDate: '2019-01-01',
        monthlySalary: 28000,
        allowance: 4000,
        status: 'ACTIVE',
        bankName: 'Islami Bank Bangladesh PLC',
        branchName: 'Mirpur-10 Branch',
        accountHolderName: 'Mufti Abdullah Al Mamun',
        accountNumber: '205021300018894',
        routingNumber: '125263456',
        accountType: 'SAVINGS',
        bankStatus: 'ACTIVE',
        createdAt: '2019-01-01T00:00:00.000Z'
      },
      {
        id: 'stf-02',
        mosqueId: mosque1.id,
        name: 'হাফেজ ক্বারী মোঃ মাহমুদ হাসান',
        nid: '19902691234567895',
        phone: '01718999111',
        designation: 'MUEZZIN',
        designationBn: 'প্রধান মুয়াজ্জিন ও সহকারী ইমাম',
        address: 'মসজিদ কোয়ার্টার, ৩য় তলা',
        joiningDate: '2020-03-01',
        monthlySalary: 18000,
        allowance: 2000,
        status: 'ACTIVE',
        bankName: 'Islami Bank Bangladesh PLC',
        branchName: 'Mirpur-10 Branch',
        accountHolderName: 'Md Mahmud Hasan',
        accountNumber: '205021300029955',
        routingNumber: '125263456',
        accountType: 'SAVINGS',
        bankStatus: 'ACTIVE',
        createdAt: '2020-03-01T00:00:00.000Z'
      },
      {
        id: 'stf-03',
        mosqueId: mosque1.id,
        name: 'মোঃ নুরুল ইসলাম',
        nid: '19852691234567896',
        phone: '01815222333',
        designation: 'CLEANER',
        designationBn: 'প্রধান খাদেম ও পরিচ্ছন্নতাকর্মী',
        address: 'মিরপুর-১২, ঢাকা',
        joiningDate: '2021-06-01',
        monthlySalary: 13000,
        allowance: 1000,
        status: 'ACTIVE',
        bankName: 'Islami Bank Bangladesh PLC',
        branchName: 'Mirpur-10 Branch',
        accountHolderName: 'Md Nurul Islam',
        accountNumber: '205021300037741',
        routingNumber: '125263456',
        accountType: 'SAVINGS',
        bankStatus: 'ACTIVE',
        createdAt: '2021-06-01T00:00:00.000Z'
      },
      {
        id: 'stf-04',
        mosqueId: mosque1.id,
        name: 'মাওলানা মোঃ সাইফুল ইসলাম',
        nid: '19922691234567897',
        phone: '01719887766',
        designation: 'TEACHER',
        designationBn: 'হেফজখানা শিক্ষক ও সহকারী খতীব',
        address: 'মসজিদ কমপ্লেক্স ১ম তলা শিক্ষক কক্ষ',
        joiningDate: '2022-01-15',
        monthlySalary: 22000,
        allowance: 3000,
        status: 'ACTIVE',
        bankName: 'Islami Bank Bangladesh PLC',
        branchName: 'Mirpur-10 Branch',
        accountHolderName: 'Saiful Islam',
        accountNumber: '205021300048892',
        routingNumber: '125263456',
        accountType: 'SAVINGS',
        bankStatus: 'ACTIVE',
        createdAt: '2022-01-15T00:00:00.000Z'
      },
      {
        id: 'stf-05',
        mosqueId: mosque1.id,
        name: 'মোঃ আব্দুল মান্নান',
        nid: '19802691234567898',
        phone: '01915443322',
        designation: 'SECURITY',
        designationBn: 'নিরাপত্তাকর্মী ও নাইট গার্ড',
        address: 'মিরপুর-১২, ঢাকা',
        joiningDate: '2023-04-01',
        monthlySalary: 12000,
        allowance: 1000,
        status: 'ACTIVE',
        bankName: 'Islami Bank Bangladesh PLC',
        branchName: 'Mirpur-10 Branch',
        accountHolderName: 'Abdul Mannan',
        accountNumber: '205021300059914',
        routingNumber: '125263456',
        accountType: 'SAVINGS',
        bankStatus: 'ACTIVE',
        createdAt: '2023-04-01T00:00:00.000Z'
      }
    );

    // Initial Bank Transfer Letter
    this.staffBankTransferLetters.push({
      id: 'btl-001',
      mosqueId: mosque1.id,
      memoNumber: 'MJMWE/Bank/Salary/All/Aug/2026/1',
      runningSerial: 1,
      letterDate: '2026-08-25',
      paymentType: 'SALARY',
      paymentMonth: '2026-08',
      paymentYear: 2026,
      selectionScope: 'ALL',
      staffCount: 3,
      totalAmount: 59000,
      totalAmountInWordsBn: 'উনষাট হাজার টাকা মাত্র',
      bankName: 'Islami Bank Bangladesh PLC',
      branchName: 'Mirpur-10 Branch, Dhaka',
      bankAddress: 'মিরপুর-১০ গোলচত্বর, ঢাকা',
      mosqueBankAccountId: 'acc-bank-01',
      mosqueBankAccountName: 'মাদানী জামে মসজিদ ও ওয়াকফ এস্টেট',
      mosqueBankAccountNumber: '20501234567890',
      subject: 'আগস্ট-২০২৬ মাসের বেতন/হাদিয়া বাবদ ২০৫০১২৩৪৫৬৭৮৯০ নম্বর হিসাব থেকে আমাদের কর্মচারীদের হিসাবে তহবিল স্থানান্তরের প্রয়োজনীয় ব্যবস্থা গ্রহণ প্রসঙ্গে।',
      bodyParagraph: 'মুহতারাম, আসসালামু আলাইকুম ওয়া-রাহমাতুল্লাহ। নিম্নে প্রদত্ত বিবরণ অনুযায়ী আমাদের মসজিদের মাসিক বেতন/হাদিয়া বাবদ ২০৫০১২৩৪৫৬৭৮৯০ নম্বর হিসাব থেকে নিম্নোক্ত কর্মচারীদের নিজ নিজ ব্যাংক হিসাবে সর্বমোট ৫৯,০০০/- (উনষাট হাজার টাকা মাত্র) টাকা স্থানান্তরের প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুরোধ করা হলো।',
      declarationText: 'উপরোক্ত তালিকাভুক্ত সকল ব্যক্তিবর্গ বর্তমানে অত্র মসজিদের কর্মরত ইমাম ও কর্মচারী এবং তাঁদের প্রদেয় অর্থ সংশ্লিষ্ট অনুমোদিত হিসাব অনুযায়ী নির্ধারিত হয়েছে।',
      items: [
        {
          staffId: 'stf-01',
          staffName: 'মাওলানা মুফতি আব্দুল্লাহ আল-মামুন',
          designationBn: 'খতীব ও পেশ ইমাম',
          bankName: 'Islami Bank Bangladesh PLC',
          branchName: 'Mirpur-10 Branch',
          accountHolderName: 'Mufti Abdullah Al Mamun',
          accountNumber: '205021300018894',
          routingNumber: '125263456',
          basicSalary: 28000,
          allowance: 4000,
          deduction: 0,
          netPayable: 32000
        },
        {
          staffId: 'stf-02',
          staffName: 'হাফেজ ক্বারী মোঃ মাহমুদ হাসান',
          designationBn: 'প্রধান মুয়াজ্জিন ও সহকারী ইমাম',
          bankName: 'Islami Bank Bangladesh PLC',
          branchName: 'Mirpur-10 Branch',
          accountHolderName: 'Md Mahmud Hasan',
          accountNumber: '205021300029955',
          routingNumber: '125263456',
          basicSalary: 18000,
          allowance: 0,
          deduction: 0,
          netPayable: 18000
        },
        {
          staffId: 'stf-03',
          staffName: 'মোঃ নুরুল ইসলাম',
          designationBn: 'প্রধান খাদেম ও পরিচ্ছন্নতাকর্মী',
          bankName: 'Islami Bank Bangladesh PLC',
          branchName: 'Mirpur-10 Branch',
          accountHolderName: 'Md Nurul Islam',
          accountNumber: '205021300037741',
          routingNumber: '125263456',
          basicSalary: 13000,
          allowance: 0,
          deduction: 4000,
          netPayable: 9000
        }
      ],
      termId: 'term-01',
      termTitle: '২০২৪-২০২৬ দ্বিবার্ষিক কার্যকরী কমিটি',
      status: 'FINAL',
      showLetterhead: true,
      createdBy: 'usr-admin-1',
      createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
      createdAt: '2026-08-25T11:00:00.000Z'
    });

    // 11. Assets
    this.assets.push(
      {
        id: 'ast-01',
        mosqueId: mosque1.id,
        assetCode: 'AST-GEN-001',
        name: 'Soundproof Diesel Generator (30 KVA)',
        category: 'GENERATOR',
        categoryBn: 'জেনারেটর',
        brand: 'Perkins / Stamford',
        model: 'PK-30KVA-SILENT',
        serialNumber: 'PK-2022-88741',
        purchaseDate: '2022-04-15',
        purchaseValue: 650000,
        currentValue: 520000,
        location: 'গ্রাউন্ড ফ্লোর জেনারেটর রুম',
        responsiblePerson: 'মোঃ নুরুল ইসলাম',
        responsiblePersonPhone: '01712000111',
        condition: 'GOOD',
        conditionBn: 'ভালো / সচল',
        nextServiceDate: '2026-09-15',
        warrantyInfo: '৩ বছরের সার্ভিসিং ওয়ারেন্টি (মেয়াদ শেষ: ২০২৫)',
        supplier: 'বাংলা পাওয়ার জেনারেটর কোং লিমিটেড',
        sourceOfPurchase: 'বিশেষ মসজিদ উন্নয়ন অনুদান',
        description: 'বিদ্যুৎ চলে গেলে স্বয়ংক্রিয়ভাবে মসজিদ কমপ্লেক্সে ও অজুখানায় বিদ্যুৎ সরবরাহ সচল রাখে।',
        notes: 'প্রতি মাসে মোবিল ও ফিল্টার নিয়মিত চেক করা আবশ্যক।',
        expenseVoucherNumber: 'EXP-2022-000412',
        termId: term1.id,
        termTitle: term1.title,
        isArchived: false,
        isDemo: true,
        serviceHistory: [
          {
            id: 'srv-001',
            serviceDate: '2026-03-10',
            serviceType: 'REGULAR_MAINTENANCE',
            serviceTypeBn: 'নিয়মিত সার্ভিসিং',
            servicedBy: 'বাংলা পাওয়ার টেকনিশিয়ান টিম',
            cost: 8500,
            expenseVoucherNumber: 'EXP-2026-000088',
            description: 'মবিল চেঞ্জ, এয়ার ফিল্টার ও ডিজেল ফিল্টার পরিবর্তন।',
            nextServiceDate: '2026-09-15',
            performedBy: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-03-10T11:00:00.000Z'
          }
        ],
        attachments: [],
        createdAt: '2022-04-15T00:00:00.000Z'
      },
      {
        id: 'ast-02',
        mosqueId: mosque1.id,
        assetCode: 'AST-AC-002',
        name: 'Gree 4-Ton Standing Air Conditioners (4 Units)',
        category: 'AC',
        categoryBn: 'এয়ার কন্ডিশনার / এসি',
        brand: 'Gree',
        model: 'GV-48C3 Standing 4.0 Ton',
        serialNumber: 'GR-48-2023-01..04',
        purchaseDate: '2023-05-10',
        purchaseValue: 560000,
        currentValue: 480000,
        location: '১ম তলা মূল নামাজ কক্ষ (উত্তর ও দক্ষিণ পাশ)',
        responsiblePerson: 'মুহাম্মদ রফিকুল ইসলাম',
        responsiblePersonPhone: '01819123456',
        condition: 'GOOD',
        conditionBn: 'ভালো / সচল',
        nextServiceDate: '2026-10-01',
        warrantyInfo: 'কম্প্রেসর ৫ বছর গ্যারান্টি (মেয়াদ ২০২৮ পর্যন্ত)',
        supplier: 'গ্রী ইলেকট্রনিক্স বাংলাদেশ ডিলার শোরুম',
        description: 'জুমার নামাজ ও রমজান তারাবিতে মূল জামাত হলের শীতাতপ নিয়ন্ত্রণ ব্যবস্থা।',
        termId: term1.id,
        termTitle: term1.title,
        isArchived: false,
        isDemo: true,
        serviceHistory: [],
        attachments: [],
        createdAt: '2023-05-10T00:00:00.000Z'
      },
      {
        id: 'ast-03',
        mosqueId: mosque1.id,
        assetCode: 'AST-SND-003',
        name: 'Ahuja 500W Mosque Amplifier & Digital Wireless Mic System',
        category: 'SOUND_SYSTEM',
        categoryBn: 'সাউন্ড সিস্টেম ও মাইক',
        brand: 'Ahuja & TOA',
        model: 'SSA-5000EM & TOA Column Speakers',
        serialNumber: 'AH-500-88190',
        purchaseDate: '2023-11-20',
        purchaseValue: 145000,
        currentValue: 125000,
        location: 'মিহরাব ও আজান কন্ট্রোল ডেক',
        responsiblePerson: 'হাফেজ মোঃ আব্দুল্লাহ (মুয়াজ্জিন)',
        responsiblePersonPhone: '01812999000',
        condition: 'GOOD',
        conditionBn: 'ভালো / সচল',
        nextServiceDate: '2026-11-15',
        warrantyInfo: '১ বছরের পূর্ণ বিক্রয়োত্তর সেবা',
        supplier: 'স্টেডিয়াম মার্কেট সাউন্ড হাউস',
        description: 'আজান, খুতবা ও ৫ ওয়াক্ত নামাজের জন্য ডিজিটাল ইকো-ফ্রি সাউন্ড অ্যামপ্লিফায়ার ও মিনার হর্ন।',
        termId: term1.id,
        termTitle: term1.title,
        isArchived: false,
        isDemo: true,
        serviceHistory: [],
        attachments: [],
        createdAt: '2023-11-20T00:00:00.000Z'
      },
      {
        id: 'ast-04',
        mosqueId: mosque1.id,
        assetCode: 'AST-CCTV-004',
        name: 'Hikvision 16-Channel 5MP IP CCTV Security System',
        category: 'CCTV',
        categoryBn: 'সিসিটিভি ক্যামেরা',
        brand: 'Hikvision',
        model: 'DS-7616NI-Q2 / 5MP Dome & Bullet',
        serialNumber: 'HK-16CH-9021',
        purchaseDate: '2024-01-15',
        purchaseValue: 85000,
        currentValue: 72000,
        location: 'মসজিদ অফিস রুম (মনিটর ও এনভিআর)',
        responsiblePerson: 'মোঃ জহিরুল হক',
        responsiblePersonPhone: '01711223344',
        condition: 'GOOD',
        conditionBn: 'ভালো / সচল',
        nextServiceDate: '2026-08-30',
        warrantyInfo: '২ বছর হার্ডওয়্যার রিপ্লেসমেন্ট ওয়ারেন্টি',
        supplier: 'আইটি সিকিউরিটি সল্যুশন লিমিটেড',
        description: 'মসজিদ প্রাঙ্গণ, প্রধান গেট, দানবাক্স এলাকা ও ওজুখনা সার্বক্ষণিক ২৪/৭ সিসিটিভি সার্ভেইল্যান্সের আওতায়।',
        termId: term1.id,
        termTitle: term1.title,
        isArchived: false,
        isDemo: true,
        serviceHistory: [],
        attachments: [],
        createdAt: '2024-01-15T00:00:00.000Z'
      },
      {
        id: 'ast-05',
        mosqueId: mosque1.id,
        assetCode: 'AST-SOL-005',
        name: '5KW On-Grid Solar Inverter & Li-FePO4 Battery System',
        category: 'SOLAR_IPS',
        categoryBn: 'সৌর বিদ্যুৎ ও আইপিএস',
        brand: 'Luminous / Growatt',
        model: 'Solar-Hybrid 5000VA',
        serialNumber: 'GW-SOL-2025-901',
        purchaseDate: '2025-06-20',
        purchaseValue: 240000,
        currentValue: 215000,
        location: 'মসজিদ ছাদ ও কন্ট্রোল রুম',
        responsiblePerson: 'মোঃ নুরুল ইসলাম',
        responsiblePersonPhone: '01815222333',
        condition: 'GOOD',
        conditionBn: 'ভালো / সচল',
        nextServiceDate: '2026-12-15',
        warrantyInfo: '৫ বছরের সোলার প্যানেল ওয়ারেন্টি ও ২ বছর ব্যাটারি রিপ্লেসমেন্ট',
        supplier: 'গ্রিন এনার্জি সল্যুশনস বিডি',
        sourceOfPurchase: 'বিশেষ মুসল্লি অনুদান তহবিল',
        description: 'বিদ্যুৎ বিভ্রাটের সময় আজান, ফ্যান ও জরুরি লাইটিং সার্বক্ষণিক নিরবচ্ছিন্ন রাখার জন্য আধুনিক সোলার ব্যাকআপ।',
        notes: 'প্রতি ত্রৈমাসিকে ব্যাটারি ভোল্টেজ ও সোলার প্যানেল পরিষ্কার করা আবশ্যক।',
        termId: term1.id,
        termTitle: term1.title,
        isArchived: false,
        isDemo: true,
        serviceHistory: [],
        attachments: [],
        createdAt: '2025-06-20T00:00:00.000Z'
      }
    );

    // 12. Property & Waqf
    this.properties.push(
      {
        id: 'prop-01',
        mosqueId: mosque1.id,
        propertyCode: 'PROP-WAQF-01',
        name: 'মসজিদ সংলগ্ন ওয়াকফ মার্কেট (১০টি পাকা দোকান)',
        nameBn: 'মসজিদ সংলগ্ন ওয়াকফ মার্কেট (১০টি পাকা দোকান)',
        type: 'COMMERCIAL_LAND',
        category: 'MARKET',
        description: 'মসজিদ সংলগ্ন পাকা দোতলা ওয়াকফ মার্কেট ও বাণিজ্যিক দোকানঘর',
        location: 'মিরপুর-১২ মূল সড়ক সংলগ্ন, ঢাকা',
        fullAddress: 'হোল্ডিং নং- ১২/এ, ব্লক-ডি, মিরপুর-১২, পল্লবী, ঢাকা-১২১৬',
        area: '৬.৫০ শতাংশ',
        areaAmount: 6.5,
        areaUnit: 'DECIMAL',
        ownershipType: 'WAQF',
        
        // ভূমি রেকর্ড
        csPlotNo: '৪১২',
        saPlotNo: '৫১৮',
        rsPlotNo: '৭২৪',
        bsPlotNo: '১০৫২',
        plotNo: '১০৫২',
        csKhatianNo: '৮৫',
        saKhatianNo: '১১৪',
        rsKhatianNo: '২৩৬',
        bsKhatianNo: '৪৭৫',
        mutationKhatianNo: 'মিউটেশন-১২৮/২০১০',
        khatianNo: '৪৭৫',
        mouza: 'সেনপাড়া পর্বতা',
        jlNumber: '৪৫',
        subRegistryOffice: 'মিরপুর সাব-রেজিস্ট্রি অফিস',

        // চতুঃসীমানা
        boundaryNorth: 'মিরপুর প্রধান সড়ক ও ফুটপাত',
        boundarySouth: 'বায়তুল আমান জামে মসজিদ চত্বর',
        boundaryEast: 'আলহাজ্ব রফিকের বাড়ি',
        boundaryWest: 'সরকারি রাস্তা ও ড্রেন',

        // ওয়াকফ ও ওয়াকিফ
        waqfEnrollmentNo: 'EC-18452/1988',
        waqfDeedNo: '৪৫১২/১৯৮৮',
        waqfYear: '১৯৮৮',
        waqfDeedDate: '1988-04-15',
        waqifName: 'মরহুম হাজী মোহাম্মদ আলতাফ হোসেন',
        waqifFatherName: 'মরহুম মৌলভী আব্দুল করিম',
        waqifAddress: 'মিরপুর-১২, পল্লবী, ঢাকা',
        waqfPurpose: 'মসজিদের ইমাম-মুয়াজ্জিনের বেতন-ভাতা ও রক্ষণাবেক্ষণ খরচ নির্বাহ',
        waqfEstateName: 'হাজী আলতাফ হোসেন ওয়াকফ এস্টেট',

        // ব্যবহার ও দখল
        currentUse: '১০টি দোকান ও ফার্মেসি ভাড়া দেওয়া আছে (মাসিক মোট ভাড়া ৳৪৫,০০০)',
        possessionStatus: 'RENTED',
        status: 'RENTED',
        estimatedValue: 12500000,
        monthlyIncome: 45000,
        monthlyRent: 45000,
        annualIncome: 540000,
        documentsCount: 4,
        notes: 'সকল ভাড়া চুক্তি নিয়মিত নবায়নযোগ্য এবং ২০২৭ সাল পর্যন্ত নিবন্ধিত চুক্তি বহাল আছে।',
        
        // ভাড়াটিয়া তথ্য (Tenants)
        tenants: [
          {
            id: 'tnt-01',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            tenantCode: 'TNT-001',
            name: 'মোঃ রফিকুল ইসলাম',
            fatherOrSpouseName: 'মোঃ আব্দুর রশিদ',
            mobile: '01711223344',
            nid: '19842695841235687',
            address: 'দোকান নং ১, বায়তুল আমান মার্কেট, মিরপুর-১২, ঢাকা',
            unitOrShopNo: 'দোকান নং- ০১ (আল-মদিনা ফার্মেসি)',
            businessName: 'মেসার্স আল-মদিনা ফার্মেসি',
            businessType: 'ওষুধ ও সার্জিক্যাল পণ্য',
            agreementNo: 'AGR-2025-01',
            startDate: '2025-01-01',
            endDate: '2027-12-31',
            monthlyRent: 15000,
            annualRent: 180000,
            securityDeposit: 100000,
            paymentDueDate: 10,
            status: 'ACTIVE',
            notes: 'অগ্রিম জামানত ৳১,০০,০০০ মসজিদের ব্যাংক অ্যাকাউন্টে জমা আছে।',
            createdAt: '2025-01-01T00:00:00.000Z'
          },
          {
            id: 'tnt-02',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            tenantCode: 'TNT-002',
            name: 'হাফেজ মোঃ আব্দুল্লাহ আল মামুন',
            fatherOrSpouseName: 'মাওলানা ইসমাইল হোসেন',
            mobile: '01819887766',
            nid: '19902695849876543',
            address: 'দোকান নং ২, বায়তুল আমান মার্কেট, মিরপুর-১২, ঢাকা',
            unitOrShopNo: 'দোকান নং- ০২ (মাদানি লাইব্রেরি ও বুক ডিপো)',
            businessName: 'মাদানি লাইব্রেরি ও বুক ডিপো',
            businessType: 'ইসলামিক বই ও স্টেশনারি',
            agreementNo: 'AGR-2025-02',
            startDate: '2025-01-01',
            endDate: '2026-12-31',
            monthlyRent: 12000,
            annualRent: 144000,
            securityDeposit: 80000,
            paymentDueDate: 10,
            status: 'ACTIVE',
            notes: 'চুক্তি প্রতি দুই বছর পর পর নবায়নযোগ্য।',
            createdAt: '2025-01-01T00:00:00.000Z'
          }
        ],

        // ভাড়া কালেকশন ইতিহাস (Rent Collections)
        rentCollections: [
          {
            id: 'rent-col-01',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            propertyCode: 'PROP-WAQF-01',
            propertyName: 'বায়তুল আমান ওয়াকফ মার্কেট ও বাণিজ্যিক ভবন',
            tenantId: 'tnt-01',
            tenantName: 'মোঃ রফিকুল ইসলাম',
            tenantCode: 'TNT-001',
            shopOrUnitNo: 'দোকান নং- ০১ (আল-মদিনা ফার্মেসি)',
            billingMonth: '2026-08',
            monthlyRent: 15000,
            previousDue: 0,
            totalDue: 15000,
            paidAmount: 15000,
            remainingDue: 0,
            paymentDate: '2026-08-05',
            paymentMethod: 'CASH',
            accountId: 'acc-cash-01',
            accountName: 'প্রধান ক্যাশ',
            receiptNumber: 'WQR-2026-0001',
            incomeVoucherNumber: 'INC-2026-000045',
            incomeEntryId: 'inc-prop-01',
            isAccountingLinked: true,
            collectorName: 'মুহাম্মদ রফিকুল ইসলাম',
            collectorDesignation: 'সাধারণ সম্পাদক / ক্যাশিয়ার',
            notes: 'আগস্ট ২০২৬ মাসের ভাড়া পূর্ণ পরিশোধিত।',
            status: 'PAID',
            createdAt: '2026-08-05T10:00:00.000Z'
          },
          {
            id: 'rent-col-02',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            propertyCode: 'PROP-WAQF-01',
            propertyName: 'বায়তুল আমান ওয়াকফ মার্কেট ও বাণিজ্যিক ভবন',
            tenantId: 'tnt-02',
            tenantName: 'হাফেজ মোঃ আব্দুল্লাহ আল মামুন',
            tenantCode: 'TNT-002',
            shopOrUnitNo: 'দোকান নং- ০২ (মাদানি লাইব্রেরি ও বুক ডিপো)',
            billingMonth: '2026-08',
            monthlyRent: 12000,
            previousDue: 2000,
            totalDue: 14000,
            paidAmount: 12000,
            remainingDue: 2000,
            paymentDate: '2026-08-08',
            paymentMethod: 'BANK',
            accountId: 'acc-bank-01',
            accountName: 'ইসলামী ব্যাংক বাংলাদেশ লিঃ (চলতি হিসাব)',
            receiptNumber: 'WQR-2026-0002',
            incomeVoucherNumber: 'INC-2026-000046',
            incomeEntryId: 'inc-prop-02',
            isAccountingLinked: true,
            collectorName: 'মুহাম্মদ রফিকুল ইসলাম',
            collectorDesignation: 'সাধারণ সম্পাদক',
            notes: 'আগস্ট মাসের মূল ভাড়া ১২,০০০ জমা, পূর্বের বকেয়া ২,০০০ টাকা অবশিষ্ট রয়েছে।',
            status: 'PARTIAL',
            createdAt: '2026-08-08T11:30:00.000Z'
          }
        ],

        // দলিল ও নথি আর্কাইভ (Document Archive)
        documents: [
          {
            id: 'doc-prop-01',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            title: 'মূল ওয়াকফনামা দলিল (রেজিস্ট্রিকৃত)',
            documentType: 'WAQF_DEED',
            documentTypeBn: 'ওয়াকফ দলিল',
            issueDate: '1988-04-15',
            description: 'মরহুম হাজী আলতাফ হোসেন কর্তৃক সম্পাদিত ওয়াকফ দলিল নং ৪৫১২/১৯৮৮',
            fileUrl: '/uploads/waqf-deed-4512.pdf',
            fileName: 'waqf_deed_altaf_hossain_1988.pdf',
            fileSize: 3450000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-10T10:00:00.000Z'
          },
          {
            id: 'doc-prop-02',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            title: 'বিএস চূড়ান্ত খতিয়ান ও পর্চা নং ৪৭৫',
            documentType: 'KHATIAN',
            documentTypeBn: 'খতিয়ান',
            issueDate: '2010-06-20',
            description: 'ঢাকা জেলা, পল্লবী থানা, মৌজা সেনপাড়া পর্বতা বিএস ৪৭৫ নং খতিয়ান',
            fileUrl: '/uploads/bs-khatian-475.pdf',
            fileName: 'bs_khatian_475_senpara.pdf',
            fileSize: 1850000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-10T10:15:00.000Z'
          },
          {
            id: 'doc-prop-03',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            title: 'নামজারি ও জমাভাগ ডিসিআর (মিউটেশন)',
            documentType: 'NAMJARI',
            documentTypeBn: 'নামজারি / মিউটেশন',
            issueDate: '2010-09-12',
            description: 'সহকারী কমিশনার (ভূমি) কর্তৃক মসজিদের অনুকূলে নামজারি অনুমোদন',
            fileUrl: '/uploads/mutation-dcr-128.pdf',
            fileName: 'mutation_dcr_128_2010.pdf',
            fileSize: 1250000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-10T10:30:00.000Z'
          },
          {
            id: 'doc-prop-04',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            title: 'দোকান ভাড়া চুক্তিপত্র - আল-মদিনা ফার্মেসি',
            documentType: 'IJARA_AGREEMENT',
            documentTypeBn: 'ভাড়া/ইজারা চুক্তিপত্র',
            issueDate: '2025-01-01',
            description: 'দোকান নং ০১ এর তিন বছর মেয়াদী স্ট্যাম্পযুক্ত ভাড়া চুক্তিপত্র',
            fileUrl: '/uploads/agreement-shop-01.pdf',
            fileName: 'agreement_tnt01_pharmacy.pdf',
            fileSize: 2100000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-15T12:00:00.000Z'
          }
        ],

        // ভূমি উন্নয়ন কর ও খাজনা রেকর্ড (Khajna Records)
        khajnaRecords: [
          {
            id: 'khajna-01',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            taxYear: '১৪৩১-১৪৩২ বঙ্গাব্দ / ২০২৫-২০২৬',
            amount: 4500,
            paymentDate: '2026-03-12',
            receiptNumber: 'DAK-2026-9854',
            nextDueDate: '2027-03-31',
            holdingNo: 'হোল্ডিং নং- ৮৫২/১',
            paidToOffice: 'মিরপুর পল্লবী ইউনিয়ন ভূমি অফিস',
            notes: 'অনলাইন ই-নামজারি ও ই-খাজনা পোর্টালে পরিশোধিত দাখিলা সংরক্ষিত।',
            expenseVoucherNumber: 'EXP-2026-000112',
            expenseEntryId: 'exp-prop-khajna-01',
            isExpenseLinked: true,
            createdAt: '2026-03-12T14:00:00.000Z'
          }
        ],

        // সম্পত্তি মেরামত ও পরিচালন ব্যয় (Expenses)
        expenses: [
          {
            id: 'exp-prop-01',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            propertyCode: 'PROP-WAQF-01',
            propertyName: 'বায়তুল আমান ওয়াকফ মার্কেট ও বাণিজ্যিক ভবন',
            expenseCategory: 'REPAIR',
            expenseCategoryBn: 'মেরামত ও সংস্কার',
            amount: 8500,
            date: '2026-07-20',
            payeeName: 'মেসার্স ভাই ভাই স্যানিটারি ও প্লাম্বিং',
            paymentMethod: 'CASH',
            accountId: 'acc-cash-01',
            accountName: 'প্রধান ক্যাশ',
            voucherNumber: 'EXP-2026-000088',
            expenseEntryId: 'exp-prop-voucher-01',
            description: 'মার্কেট ভবনের ড্রেনেজ পাইপ পরিবর্তন ও পশ্চিম পাশের দেওয়াল প্লাস্টার মেরামত',
            createdBy: 'usr-admin-1',
            createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-07-20T16:00:00.000Z'
          },
          {
            id: 'exp-prop-02',
            mosqueId: mosque1.id,
            propertyId: 'prop-01',
            propertyCode: 'PROP-WAQF-01',
            propertyName: 'বায়তুল আমান ওয়াকফ মার্কেট ও বাণিজ্যিক ভবন',
            expenseCategory: 'TAX_KHAJNA',
            expenseCategoryBn: 'ভূমি উন্নয়ন কর ও খাজনা',
            amount: 4500,
            date: '2026-03-12',
            payeeName: 'পল্লবী ভূমি রাজস্ব অফিস',
            paymentMethod: 'BANK',
            accountId: 'acc-bank-01',
            accountName: 'ইসলামী ব্যাংক বাংলাদেশ লিঃ',
            voucherNumber: 'EXP-2026-000112',
            expenseEntryId: 'exp-prop-voucher-02',
            description: '১৪৩১-১৪৩২ সনের বার্ষিক ভূমি উন্নয়ন কর পরিশোধ',
            createdBy: 'usr-admin-1',
            createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-03-12T14:30:00.000Z'
          }
        ],

        // পরিদর্শন লগ (Inspections)
        inspections: [
          {
            id: 'insp-01',
            propertyId: 'prop-01',
            inspectionDate: '2026-02-15',
            inspectorName: 'হাজী জহিরুল ইসলাম',
            inspectorDesignation: 'যুগ্ম সাধারণ সম্পাদক ও ওয়াকফ সাব-কমিটি আহ্বায়ক',
            currentCondition: 'GOOD',
            occupancyStatus: 'সকল দোকান সুষ্ঠুভাবে পরিচালিত হচ্ছে',
            problemsObserved: 'পশ্চিম পাশের ড্রেনে সামান্য সংস্কার প্রয়োজন',
            requiredAction: 'বর্ষার আগে পশ্চিম দেয়ালের ড্রেন পরিষ্কার ও মেরামত',
            nextInspectionDate: '2026-08-15',
            notes: 'দখল সম্পূর্ণ শান্তিপূর্ণ ও নিয়মিত ভাড়া আদায় হচ্ছে।',
            createdAt: '2026-02-15T00:00:00.000Z'
          }
        ],

        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'prop-02',
        mosqueId: mosque1.id,
        propertyCode: 'PROP-WAQF-02',
        name: 'মসজিদ সংলগ্ন বাগান ও নার্সারি জমি',
        nameBn: 'মসজিদ সংলগ্ন বাগান ও নার্সারি জমি',
        type: 'AGRICULTURAL_LAND',
        category: 'LAND',
        description: 'মসজিদের দক্ষিণ সীমানা সংলগ্ন ওয়াকফ বাগান ও উন্মুক্ত জমি',
        location: 'মসজিদের দক্ষিণ প্রাচীর সংলগ্ন, মিরপুর-১২',
        fullAddress: 'মিরপুর-১২, পল্লবী, ঢাকা-১২১৬',
        area: '৮.০০ শতাংশ',
        areaAmount: 8.0,
        areaUnit: 'DECIMAL',
        ownershipType: 'WAQF',
        
        // ভূমি রেকর্ড
        csPlotNo: '৪১৫',
        saPlotNo: '৫২০',
        rsPlotNo: '৭২৮',
        bsPlotNo: '১০৫৬',
        plotNo: '১০৫৬',
        csKhatianNo: '৮৫',
        saKhatianNo: '১১৪',
        rsKhatianNo: '২৩৬',
        bsKhatianNo: '৪৭৮',
        mutationKhatianNo: 'মিউটেশন-১৩০/২০১২',
        khatianNo: '৪৭৮',
        mouza: 'সেনপাড়া পর্বতা',
        jlNumber: '৪৫',
        subRegistryOffice: 'মিরপুর সাব-রেজিস্ট্রি অফিস',

        // চতুঃসীমানা
        boundaryNorth: 'মসজিদ চত্বর ও অজুখানা',
        boundarySouth: 'আবাসিক প্লট ও সীমানা প্রাচীর',
        boundaryEast: 'সরকারি পুকুর',
        boundaryWest: 'মসজিদের অভ্যন্তরীণ সংযোগ সড়ক',

        // ওয়াকফ ও ওয়াকিফ
        waqfEnrollmentNo: 'EC-18452/1988',
        waqfDeedNo: '৪৫১২/১৯৮৮',
        waqfYear: '১৯৮৮',
        waqfDeedDate: '1988-04-15',
        waqifName: 'মরহুমা খাদিজা বেগম',
        waqifFatherName: 'মরহুম আব্দুল গণি',
        waqifAddress: 'মিরপুর, ঢাকা',
        waqfPurpose: 'মসজিদ পরিচালনা ও হেফজখানার ছাত্রদের খাদ্য সহায়তা',
        waqfEstateName: 'হাজী আলতাফ হোসেন ও খাদিজা বেগম ওয়াকফ এস্টেট',

        // ব্যবহার ও দখল
        currentUse: 'গাছপালা ও উন্মুক্ত বাগান (ভবিষ্যতে মাদরাসা ভবন সম্প্রসারণের জন্য নির্ধারিত)',
        possessionStatus: 'MOSQUE_CONTROL',
        status: 'ACTIVE',
        estimatedValue: 9600000,
        monthlyIncome: 0,
        documentsCount: 2,
        notes: 'সম্পূর্ণ সীমানা প্রাচীর দ্বারা ঘেরা ও মসজিদের প্রত্যক্ষ নিয়ন্ত্রণে রয়েছে।',
        
        documents: [
          {
            id: 'doc-prop-05',
            mosqueId: mosque1.id,
            propertyId: 'prop-02',
            title: 'ওয়াকফ হেবানামা ও রেজিস্ট্রি দলিল',
            documentType: 'WAQF_DEED',
            documentTypeBn: 'ওয়াকফ দলিল',
            issueDate: '1988-04-15',
            description: 'মরহুমা খাদিজা বেগম কর্তৃক ওয়াকফকৃত জমির রেজিস্ট্রি দলিল',
            fileUrl: '/uploads/waqf-deed-khadija.pdf',
            fileName: 'waqf_deed_khadija_begum.pdf',
            fileSize: 2800000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-12T11:00:00.000Z'
          },
          {
            id: 'doc-prop-06',
            mosqueId: mosque1.id,
            propertyId: 'prop-02',
            title: 'বিএস পর্চা ও দাগের নকশা',
            documentType: 'PORCHA',
            documentTypeBn: 'পর্চা ও নকশা',
            issueDate: '2012-05-10',
            description: 'সেনপাড়া পর্বতা মৌজার দাগ নং ১০৫৬ এর সহিহ পর্চা ও সীমানা ম্যাপ',
            fileUrl: '/uploads/porcha-plot-1056.pdf',
            fileName: 'porcha_plot_1056_map.pdf',
            fileSize: 1950000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-12T11:20:00.000Z'
          }
        ],
        khajnaRecords: [
          {
            id: 'khajna-02',
            mosqueId: mosque1.id,
            propertyId: 'prop-02',
            taxYear: '১৪৩১-১৪৩২ বঙ্গাব্দ / ২০২৫-২০২৬',
            amount: 2400,
            paymentDate: '2026-03-15',
            receiptNumber: 'DAK-2026-9890',
            nextDueDate: '2027-03-31',
            holdingNo: 'হোল্ডিং নং- ৮৫২/২',
            paidToOffice: 'পল্লবী ভূমি রাজস্ব অফিস',
            notes: '১৪৩১ সনের খাজনা পরিশোধিত।',
            expenseVoucherNumber: 'EXP-2026-000115',
            expenseEntryId: 'exp-prop-khajna-02',
            isExpenseLinked: true,
            createdAt: '2026-03-15T15:00:00.000Z'
          }
        ],
        expenses: [
          {
            id: 'exp-prop-03',
            mosqueId: mosque1.id,
            propertyId: 'prop-02',
            propertyCode: 'PROP-WAQF-02',
            propertyName: 'মসজিদ সংলগ্ন বাগান ও নার্সারি জমি',
            expenseCategory: 'MAINTENANCE',
            expenseCategoryBn: 'রক্ষণাবেক্ষণ ও পরিচ্ছন্নতা',
            amount: 3500,
            date: '2026-06-10',
            payeeName: 'কৃষি নার্সারি ও লেবার',
            paymentMethod: 'CASH',
            accountId: 'acc-cash-01',
            accountName: 'প্রধান ক্যাশ',
            voucherNumber: 'EXP-2026-000075',
            description: 'বাগানের সীমানা প্রাচীর সংলগ্ন জঙ্গল পরিষ্কার ও নতুন ফলের চারা রোপণ',
            createdBy: 'usr-admin-1',
            createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-06-10T11:00:00.000Z'
          }
        ],
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'prop-03',
        mosqueId: mosque1.id,
        propertyCode: 'PROP-WAQF-03',
        name: 'ওয়াকফ পুকুর ও মৎস্য ইজারা প্রকল্প',
        nameBn: 'ওয়াকফ পুকুর ও মৎস্য ইজারা প্রকল্প',
        type: 'POND',
        category: 'POND',
        description: 'মসজিদের উন্নয়ন তহবিলের সহায়তায় বার্ষিক ইজারাকৃত ওয়াকফ পুকুর',
        location: 'পূর্বপল্লী ওয়াকফ এলাকা, মিরপুর',
        fullAddress: 'পূর্বপল্লী, মিরপুর-১১, ঢাকা',
        area: '১৫.০০ শতাংশ',
        areaAmount: 15.0,
        areaUnit: 'DECIMAL',
        ownershipType: 'WAQF',

        csPlotNo: '৩১৮',
        saPlotNo: '৪২২',
        rsPlotNo: '৬৫৪',
        bsPlotNo: '৯৮০',
        plotNo: '৯৮০',
        csKhatianNo: '৬২',
        saKhatianNo: '৮৮',
        rsKhatianNo: '১৮২',
        bsKhatianNo: '৩৫৫',
        khatianNo: '৩৫৫',
        mouza: 'সেনপাড়া পর্বতা',
        jlNumber: '৪৫',
        subRegistryOffice: 'মিরপুর সাব-রেজিস্ট্রি অফিস',

        boundaryNorth: 'সরকারি ড্রেন ও রাস্তা',
        boundarySouth: 'আলহাজ্ব নূরুল হকের বসতবাড়ি',
        boundaryEast: 'উন্মুক্ত ফসলি জমি',
        boundaryWest: 'মসজিদের ওয়াকফ বাগান',

        waqfEnrollmentNo: 'EC-18452/1988',
        waqfDeedNo: '৪৫১২/১৯৮৮',
        waqfYear: '১৯৮৮',
        waqfDeedDate: '1988-04-15',
        waqifName: 'মরহুম মৌলভী শফিউদ্দিন আহমেদ',
        waqifFatherName: 'মরহুম হাজী ইয়াসিন আলী',
        waqifAddress: 'মিরপুর, ঢাকা',
        waqfPurpose: 'মসজিদের বিদ্যুৎ বিল ও এতিম ছাত্রদের সহায়তায় পুকুরের আয় ব্যবহার',
        waqfEstateName: 'হাজী শফিউদ্দিন ওয়াকফ এস্টেট',

        currentUse: 'মৎস্য চাষের জন্য বার্ষিক ইজারা প্রদান (মাসিক কিস্তি হিসেবে আয়)',
        possessionStatus: 'LEASED',
        status: 'LEASED',
        estimatedValue: 7500000,
        monthlyIncome: 18000,
        monthlyRent: 18000,
        annualIncome: 216000,
        documentsCount: 2,
        notes: '২০২৬ সালের জন্য মেসার্স রুপালী ফিশারিজের অনুকূলে ইজারা চুক্তি সম্পাদিত হয়েছে।',

        tenants: [
          {
            id: 'tnt-03',
            mosqueId: mosque1.id,
            propertyId: 'prop-03',
            tenantCode: 'TNT-003',
            name: 'মোঃ সাইদুর রহমান (ইজারাদার)',
            fatherOrSpouseName: 'মোঃ আমজাদ হোসেন',
            mobile: '01715998877',
            nid: '19792695843322114',
            address: 'পূর্বপল্লী, মিরপুর-১১, ঢাকা',
            unitOrShopNo: 'পুকুর ইজারা ব্লক-০১',
            businessName: 'মেসার্স রুপালী ফিশারিজ ও নার্সারি',
            businessType: 'মৎস্য চাষ ও পোনা উৎপাদন',
            agreementNo: 'IJARA-2026-01',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            monthlyRent: 18000,
            annualRent: 216000,
            securityDeposit: 150000,
            paymentDueDate: 5,
            status: 'ACTIVE',
            notes: 'বার্ষিক চুক্তি অনুযায়ী প্রতি মাসের ৫ তারিখের মধ্যে কিস্তি পরিশোধযোগ্য।',
            createdAt: '2026-01-01T00:00:00.000Z'
          }
        ],

        rentCollections: [
          {
            id: 'rent-col-03',
            mosqueId: mosque1.id,
            propertyId: 'prop-03',
            propertyCode: 'PROP-WAQF-03',
            propertyName: 'ওয়াকফ পুকুর ও মৎস্য ইজারা প্রকল্প',
            tenantId: 'tnt-03',
            tenantName: 'মোঃ সাইদুর রহমান (ইজারাদার)',
            tenantCode: 'TNT-003',
            shopOrUnitNo: 'পুকুর ইজারা ব্লক-০১',
            billingMonth: '2026-08',
            monthlyRent: 18000,
            previousDue: 0,
            totalDue: 18000,
            paidAmount: 18000,
            remainingDue: 0,
            paymentDate: '2026-08-04',
            paymentMethod: 'BANK',
            accountId: 'acc-bank-01',
            accountName: 'ইসলামী ব্যাংক বাংলাদেশ লিঃ (চলতি হিসাব)',
            receiptNumber: 'WQR-2026-0003',
            incomeVoucherNumber: 'INC-2026-000047',
            incomeEntryId: 'inc-prop-03',
            isAccountingLinked: true,
            collectorName: 'মুহাম্মদ রফিকুল ইসলাম',
            collectorDesignation: 'সাধারণ সম্পাদক',
            notes: 'আগস্ট ২০২৬ মাসের ইজারা কিস্তি পূর্ণ পরিশোধিত।',
            status: 'PAID',
            createdAt: '2026-08-04T10:00:00.000Z'
          }
        ],

        documents: [
          {
            id: 'doc-prop-07',
            mosqueId: mosque1.id,
            propertyId: 'prop-03',
            title: 'মৎস্য ইজারা চুক্তিপত্র ২০২৬',
            documentType: 'IJARA_AGREEMENT',
            documentTypeBn: 'ইজারা চুক্তিপত্র',
            issueDate: '2026-01-01',
            description: 'এক বছর মেয়াদী ৩০০ টাকার নন-জুডিশিয়াল স্ট্যাম্পে স্বাক্ষরিত চুক্তি',
            fileUrl: '/uploads/ijara-agreement-pond.pdf',
            fileName: 'ijara_agreement_rupali_fisheries.pdf',
            fileSize: 2200000,
            uploadedBy: 'usr-admin-1',
            uploadedByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-01-05T10:00:00.000Z'
          }
        ],

        khajnaRecords: [
          {
            id: 'khajna-03',
            mosqueId: mosque1.id,
            propertyId: 'prop-03',
            taxYear: '১৪৩১-১৪৩২ বঙ্গাব্দ / ২০২৫-২০২৬',
            amount: 3200,
            paymentDate: '2026-03-18',
            receiptNumber: 'DAK-2026-9912',
            nextDueDate: '2027-03-31',
            holdingNo: 'হোল্ডিং নং- ৮৫২/৩',
            paidToOffice: 'পল্লবী ভূমি রাজস্ব অফিস',
            notes: 'পুকুর শ্রেণির জমির কর পরিশোধিত।',
            expenseVoucherNumber: 'EXP-2026-000118',
            expenseEntryId: 'exp-prop-khajna-03',
            isExpenseLinked: true,
            createdAt: '2026-03-18T12:00:00.000Z'
          }
        ],

        expenses: [
          {
            id: 'exp-prop-04',
            mosqueId: mosque1.id,
            propertyId: 'prop-03',
            propertyCode: 'PROP-WAQF-03',
            propertyName: 'ওয়াকফ পুকুর ও মৎস্য ইজারা প্রকল্প',
            expenseCategory: 'MAINTENANCE',
            expenseCategoryBn: 'পুকুর পাড় সংস্কার ও বাঁধাই',
            amount: 6000,
            date: '2026-05-18',
            payeeName: 'দেশ বিল্ডার্স ও মাটি কাটার দল',
            paymentMethod: 'CASH',
            accountId: 'acc-cash-01',
            accountName: 'প্রধান ক্যাশ',
            voucherNumber: 'EXP-2026-000062',
            description: 'পুকুরের উত্তর পাড়ের মাটি ভরাট ও বাঁশের পাইলিং সুরক্ষা',
            createdBy: 'usr-admin-1',
            createdByName: 'মুহাম্মদ রফিকুল ইসলাম',
            createdAt: '2026-05-18T16:00:00.000Z'
          }
        ],

        inspections: [
          {
            id: 'insp-02',
            propertyId: 'prop-03',
            inspectionDate: '2026-04-10',
            inspectorName: 'হাজী জহিরুল ইসলাম',
            inspectorDesignation: 'যুগ্ম সাধারণ সম্পাদক',
            currentCondition: 'GOOD',
            occupancyStatus: 'ইজারাদার সাইদুর রহমান কর্তৃক পরিচালিত হচ্ছে',
            problemsObserved: 'কোনো বিরোধ নেই, পাড়ের সামান্য মাটি ভরাট করা প্রয়োজন ছিল যা সম্পন্ন হয়েছে',
            requiredAction: 'বর্ষার পর পানির গুণমান ও পাড়ের স্থায়িত্ব পরিদর্শন',
            nextInspectionDate: '2026-10-10',
            notes: 'নিয়মিত কিস্তি পরিশোধ চলমান।',
            createdAt: '2026-04-10T11:00:00.000Z'
          }
        ],

        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'prop-04',
        mosqueId: mosque1.id,
        propertyCode: 'PROP-WAQF-04',
        name: 'হাজী ওসমান গনি ওয়াকফ মার্কেট ও আবাসিক কোয়ার্টার',
        nameBn: 'হাজী ওসমান গনি ওয়াকফ মার্কেট ও আবাসিক কোয়ার্টার',
        type: 'COMMERCIAL_LAND',
        category: 'MARKET',
        description: 'মসজিদের পূর্ব সংলগ্ন ৩ তলা বিশিষ্ট পাকা ওয়াকফ মার্কেট ও ইমাম-মুয়াজ্জিন কোয়ার্টার ভবন',
        location: 'পূর্বপল্লী প্রধান সড়ক, মিরপুর-১২, ঢাকা',
        fullAddress: 'হোল্ডিং নং- ১৪/বি, পূর্বপল্লী, মিরপুর-১২, ঢাকা-১২১৬',
        area: '৫.২৫ শতাংশ',
        areaAmount: 5.25,
        areaUnit: 'DECIMAL',
        ownershipType: 'WAQF',
        csPlotNo: '৪১৮',
        saPlotNo: '৫২৪',
        rsPlotNo: '৭৩০',
        bsPlotNo: '১০৬০',
        plotNo: '১০৬০',
        csKhatianNo: '৮৯',
        saKhatianNo: '১১৮',
        rsKhatianNo: '২৪০',
        bsKhatianNo: '৪৮২',
        mutationKhatianNo: 'মিউটেশন-১৩৫/২০১৪',
        khatianNo: '৪৮২',
        mouza: 'সেনপাড়া পর্বতা',
        jlNumber: '৪৫',
        subRegistryOffice: 'মিরপুর সাব-রেজিস্ট্রি অফিস',
        boundaryNorth: 'সরকারি ড্রেন ও রাস্তা',
        boundarySouth: 'মসজিদ চত্বর',
        boundaryEast: 'ব্যক্তিগত আবাসিক প্লট',
        boundaryWest: 'মসজিদ সংযোগ লেন',
        waqfEnrollmentNo: 'EC-19200/1992',
        waqfDeedNo: '৫৬১২/১৯৯২',
        waqfYear: '১৯৯২',
        waqfDeedDate: '1992-07-10',
        waqifName: 'মরহুম হাজী ওসমান গনি',
        waqifFatherName: 'মরহুম আব্দুল জলিল',
        waqifAddress: 'মিরপুর-১২, ঢাকা',
        waqfPurpose: 'মসজিদ ও মাদরাসা পরিচালনা এবং ধর্মীয় শিক্ষা ব্যয় নির্বাহ',
        waqfEstateName: 'হাজী ওসমান গনি ওয়াকফ এস্টেট',
        currentUse: 'নিচতলায় ৪টি বাণিজ্যিক দোকান ও উপরতলায় স্টাফ কোয়ার্টার',
        possessionStatus: 'RENTED',
        status: 'RENTED',
        estimatedValue: 16500000,
        monthlyIncome: 32000,
        monthlyRent: 32000,
        annualIncome: 384000,
        documentsCount: 3,
        notes: 'ভবনের নিচতলার ৪টি দোকানের নিয়মিত মাসিক ভাড়া আদায় হচ্ছে।',
        tenants: [
          {
            id: 'tnt-04',
            mosqueId: mosque1.id,
            propertyId: 'prop-04',
            tenantCode: 'TNT-004',
            name: 'মোঃ জাহিদ হাসান',
            fatherOrSpouseName: 'মোঃ শফিউল আলম',
            mobile: '01719223344',
            nid: '19842691234567891',
            address: 'মিরপুর-১২, ঢাকা',
            unitOrShopNo: 'দোকান নং ০১ (মুদি ও ডিপার্টমেন্টাল)',
            businessName: 'বিসমিল্লাহ জেনারেল স্টোর',
            businessType: 'মুদি ও কনফেকশনারি',
            agreementNo: 'AGR-2025-04',
            startDate: '2025-01-01',
            endDate: '2027-12-31',
            monthlyRent: 12000,
            annualRent: 144000,
            securityDeposit: 100000,
            paymentDueDate: 7,
            status: 'ACTIVE',
            createdAt: '2025-01-01T00:00:00.000Z'
          }
        ],
        rentCollections: [],
        documents: [],
        khajnaRecords: [],
        expenses: [],
        inspections: [],
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'prop-05',
        mosqueId: mosque1.id,
        propertyCode: 'PROP-WAQF-05',
        name: 'হেফজখানা ও এতিমখানা ভবন ওয়াকফ সম্পত্তি',
        nameBn: 'হেফজখানা ও এতিমখানা ভবন ওয়াকফ সম্পত্তি',
        type: 'RESIDENTIAL_PLOT',
        category: 'BUILDING',
        description: 'মসজিদের উত্তর সীমানায় অবস্থিত ৪ তলা হেফজখানা ও ছাত্রাবাস ওয়াকফ ভবন',
        location: 'মসজিদ কমপ্লেক্সের উত্তর অংশ, মিরপুর-১২',
        fullAddress: 'মিরপুর-১২, পল্লবী, ঢাকা-১২১৬',
        area: '৭.৫০ শতাংশ',
        areaAmount: 7.5,
        areaUnit: 'DECIMAL',
        ownershipType: 'WAQF',
        csPlotNo: '৪২২',
        saPlotNo: '৫২৮',
        rsPlotNo: '৭৩৬',
        bsPlotNo: '১০৬৮',
        plotNo: '১০৬৮',
        csKhatianNo: '৯১',
        saKhatianNo: '১২০',
        rsKhatianNo: '২৪৪',
        bsKhatianNo: '৪৮৬',
        mutationKhatianNo: 'মিউটেশন-১৪০/২০১৬',
        khatianNo: '৪৮৬',
        mouza: 'সেনপাড়া পর্বতা',
        jlNumber: '৪৫',
        subRegistryOffice: 'মিরপুর সাব-রেজিস্ট্রি অফিস',
        boundaryNorth: 'সরকারি প্রাইমারি স্কুল',
        boundarySouth: 'মসজিদের প্রধান চত্বর',
        boundaryEast: 'আবাসিক এলাকা',
        boundaryWest: 'সরকারি রাস্তা',
        waqfEnrollmentNo: 'EC-20411/1998',
        waqfDeedNo: '৬৭২০/১৯৯৮',
        waqfYear: '১৯৯৮',
        waqfDeedDate: '1998-11-20',
        waqifName: 'মরহুম আলহাজ্ব আব্দুল হাকিম',
        waqifFatherName: 'মরহুম নূর মোহাম্মদ',
        waqifAddress: 'মিরপুর, ঢাকা',
        waqfPurpose: 'কুরআন হিফজ ও নিঃস্ব এতিম শিক্ষার্থীদের আবাসিক শিক্ষা ও খাবার ব্যবস্থা',
        waqfEstateName: 'আব্দুল হাকিম হেফজখানা ওয়াকফ এস্টেট',
        currentUse: '৭০ জন ছাত্রের জন্য হেফজখানা, শিক্ষক আবাসন ও এতিমখানা পাঠাগার',
        possessionStatus: 'MOSQUE_CONTROL',
        status: 'ACTIVE',
        estimatedValue: 21000000,
        monthlyIncome: 0,
        documentsCount: 2,
        notes: 'মসজিদ কমিটির প্রত্যক্ষ পরিচালনা ও ওয়াকফ বোর্ডের অনুমোদিত গঠনতন্ত্র অনুযায়ী পরিচালিত।',
        tenants: [],
        rentCollections: [],
        documents: [],
        khajnaRecords: [],
        expenses: [],
        inspections: [],
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    );

    // 13. Cemetery Records
    this.cemeteryRecords.push(
      {
        id: 'cem-01',
        mosqueId: mosque1.id,
        recordNumber: 'CBR-2025-0001',
        plotNumber: 'PLOT-A-12',
        block: 'Block-A',
        row: 'সারি নং ৩',
        graveLocation: 'উত্তর-পশ্চিম ব্লক, ৩য় সারি, প্লট ১২',
        graveType: 'PERMANENT',
        plotStatus: 'OCCUPIED',
        deceasedName: 'মরহুম হাজী আব্দুল গফুর',
        deceasedNameBn: 'মরহুম হাজী আব্দুল গফুর',
        fatherOrSpouseName: 'মরহুম কাছিম উদ্দিন',
        fatherName: 'মরহুম কাছিম উদ্দিন',
        gender: 'MALE',
        ageAtDeath: '৭৮ বছর',
        dateOfBirth: '1947-03-12',
        dateOfDeath: '2025-11-14',
        causeOfDeath: 'বার্ধক্যজনিত কারণ',
        religion: 'ইসলাম',
        graveyardName: 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান',
        burialDate: '2025-11-15',
        burialTime: 'বাদ জোহর',
        janazaPlace: 'বায়তুল আমান কেন্দ্রীয় জামে মসজিদ মাঠ',
        contactPersonName: 'মোঃ আসাদুজ্জামান',
        relationWithDeceased: 'জ্যেষ্ঠ পুত্র',
        contactPersonPhone: '01713555777',
        contactPersonAltPhone: '01911444888',
        heirAddress: 'বাড়ি # ১২, লেন # ৩, সেন্ট্রাল রোড, ঢাকা',
        notes: 'স্থায়ী ওয়াকফ কবরস্থান এলাকা। কবর পাকা করার অনুমতি নেই।',
        createdAt: '2025-11-15T00:00:00.000Z',
        createdBy: 'usr-admin-01',
        createdByName: 'মাওলানা মাহমুদুর রহমান'
      },
      {
        id: 'cem-02',
        mosqueId: mosque1.id,
        recordNumber: 'CBR-2026-0002',
        plotNumber: 'PLOT-B-05',
        block: 'Block-B',
        row: 'সারি নং ১',
        graveLocation: 'দক্ষিণ ব্লক, ১ম সারি, প্লট ০৫',
        graveType: 'FAMILY',
        plotStatus: 'OCCUPIED',
        deceasedName: 'মরহুমা রোকেয়া বেগম',
        deceasedNameBn: 'মরহুমা রোকেয়া বেগম',
        fatherOrSpouseName: 'মরহুম মোঃ দেলোয়ার হোসেন (স্বামী)',
        fatherName: 'মরহুম শামসুল হক',
        husbandOrSpouseName: 'মরহুম মোঃ দেলোয়ার হোসেন',
        gender: 'FEMALE',
        ageAtDeath: '৬৪ বছর',
        dateOfBirth: '1962-08-10',
        dateOfDeath: '2026-02-18',
        causeOfDeath: 'হৃদযন্ত্রের ক্রিয়া বন্ধ হয়ে',
        religion: 'ইসলাম',
        graveyardName: 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান',
        burialDate: '2026-02-19',
        burialTime: 'বাদ আছর',
        janazaPlace: 'বায়তুল আমান কেন্দ্রীয় জামে মসজিদ ঈদগাহ ময়দান',
        contactPersonName: 'ইঞ্জিনিয়ার মাহবুব হোসেন',
        relationWithDeceased: 'পুত্র',
        contactPersonPhone: '01819222444',
        contactPersonAltPhone: '01712999333',
        heirAddress: 'ফ্ল্যাট ৪/এ, গ্রিন ভিউ অ্যাপার্টমেন্ট, মিরপুর, ঢাকা',
        notes: 'দাফন সম্পন্ন ও সীমানা নম্বর ফলক স্থাপিত হয়েছে।',
        createdAt: '2026-02-19T00:00:00.000Z',
        createdBy: 'usr-admin-01',
        createdByName: 'মাওলানা মাহমুদুর রহমান'
      },
      {
        id: 'cem-03',
        mosqueId: mosque1.id,
        recordNumber: 'CBR-2026-0003',
        plotNumber: 'PLOT-A-08',
        block: 'Block-A',
        row: 'সারি নং ২',
        graveLocation: 'উত্তর ব্লক, ২য় সারি, প্লট ০৮',
        graveType: 'GENERAL',
        plotStatus: 'OCCUPIED',
        deceasedName: 'মরহুম মাষ্টার মোখলেছুর রহমান',
        deceasedNameBn: 'মরহুম মাষ্টার মোখলেছুর রহমান',
        fatherOrSpouseName: 'মরহুম আজহার আলী মুন্সী',
        fatherName: 'মরহুম আজহার আলী মুন্সী',
        gender: 'MALE',
        ageAtDeath: '৭০ বছর',
        dateOfBirth: '1956-01-05',
        dateOfDeath: '2026-08-28',
        causeOfDeath: 'বার্ধক্যজনিত অসুস্থতা',
        religion: 'ইসলাম',
        graveyardName: 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান',
        burialDate: '2026-08-29',
        burialTime: 'বাদ আসর',
        janazaPlace: 'মসজিদ সংলগ্ন ঈদগাহ মাঠ',
        contactPersonName: 'ডাঃ মোস্তাফিজুর রহমান',
        relationWithDeceased: 'ছোট ভাই',
        contactPersonPhone: '01711223344',
        contactPersonAltPhone: '01552334455',
        heirAddress: 'গ্রাম: উত্তর পাড়া, ডাকঘর: প্রধান বাজার',
        notes: 'আজকের তারিখে দাফন সম্পন্ন। যাবতীয় দোয়া ও তদারকি কমিটি কর্তৃক সম্পন্ন।',
        createdAt: '2026-08-29T10:00:00.000Z',
        createdBy: 'usr-admin-01',
        createdByName: 'মাওলানা মাহমুদুর রহমান'
      },
      {
        id: 'cem-04',
        mosqueId: mosque1.id,
        recordNumber: 'CBR-2026-0004',
        plotNumber: 'PLOT-C-15',
        block: 'Block-C',
        row: 'সারি নং ৪',
        graveLocation: 'পূর্ব ব্লক, ৪র্থ সারি, প্লট ১৫',
        graveType: 'PERMANENT',
        plotStatus: 'OCCUPIED',
        deceasedName: 'মরহুম ফরিদা ইয়াসমিন',
        deceasedNameBn: 'মরহুম ফরিদা ইয়াসমিন',
        fatherOrSpouseName: 'মোঃ রফিকুল ইসলাম (স্বামী)',
        fatherName: 'মরহুম নূরুল ইসলাম',
        husbandOrSpouseName: 'মোঃ রফিকুল ইসলাম',
        gender: 'FEMALE',
        ageAtDeath: '৫২ বছর',
        dateOfBirth: '1974-05-20',
        dateOfDeath: '2026-08-15',
        causeOfDeath: 'স্বাভাবিক ইন্তেকাল',
        religion: 'ইসলাম',
        graveyardName: 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান',
        burialDate: '2026-08-16',
        burialTime: 'সকাল ১০:০০',
        janazaPlace: 'মসজিদ প্রাঙ্গণ',
        contactPersonName: 'মোঃ রফিকুল ইসলাম',
        relationWithDeceased: 'স্বামী',
        contactPersonPhone: '01912888999',
        heirAddress: 'রোড # ৭, বাড়ি # ২৪, ব্লক-সি',
        notes: 'পারিবারিক অভিভাবক কর্তৃক দাফন তদারকি সম্পন্ন।',
        createdAt: '2026-08-16T08:00:00.000Z',
        createdBy: 'usr-admin-01',
        createdByName: 'মাওলানা মাহমুদুর রহমান'
      },
      {
        id: 'cem-05',
        mosqueId: mosque1.id,
        recordNumber: 'CBR-2026-0005',
        plotNumber: 'PLOT-D-02',
        block: 'Block-D',
        row: 'সারি নং ১',
        graveLocation: 'দক্ষিণ-পশ্চিম ব্লক, ১ম সারি, প্লট ০২',
        graveType: 'FAMILY',
        plotStatus: 'OCCUPIED',
        deceasedName: 'মরহুমা জাহানারা বেগম',
        deceasedNameBn: 'মরহুমা জাহানারা বেগম',
        fatherOrSpouseName: 'মরহুম খন্দকার মোশাররফ হোসেন (স্বামী)',
        fatherName: 'মরহুম খলিলুর রহমান',
        husbandOrSpouseName: 'মরহুম খন্দকার মোশাররফ হোসেন',
        gender: 'FEMALE',
        ageAtDeath: '৬৯ বছর',
        dateOfBirth: '1957-04-10',
        dateOfDeath: '2026-08-20',
        causeOfDeath: 'বার্ধক্যজনিত ও কিডনি জটিলতা',
        religion: 'ইসলাম',
        graveyardName: 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান',
        burialDate: '2026-08-21',
        burialTime: 'বাদ জুমা',
        janazaPlace: 'বায়তুল আমান জামে মসজিদ চত্বর',
        contactPersonName: 'খন্দকার আহসান হাবীব',
        relationWithDeceased: 'পুত্র',
        contactPersonPhone: '01715667788',
        contactPersonAltPhone: '01912334455',
        heirAddress: 'বাড়ি নং- ৫, রোড নং- ২, পল্লবী, মিরপুর, ঢাকা',
        notes: 'জুমার নামাজের পর শত শত মুসল্লির উপস্থিতিতে জানাজা ও দাফন সম্পন্ন।',
        createdAt: '2026-08-21T15:00:00.000Z',
        createdBy: 'usr-admin-01',
        createdByName: 'মাওলানা মাহমুদুর রহমান'
      }
    );

    // 14. Notices
    this.notices.push(
      {
        id: 'not-01',
        mosqueId: mosque1.id,
        title: 'আগামী জুমায় মসজিদ সম্প্রসারণ তহবিলের বিশেষ আবেদন',
        description: 'সম্মানিত মুসল্লিবৃন্দের সদয় অবগতির জন্য জানানো যাচ্ছে যে, আগামী শুক্রবার জুমার নামাজের পর মসজিদের ২য় তলার অসম্পূর্ণ কাজের জন্য বিশেষ উন্মুক্ত অনুদান গ্রহণ করা হবে। সকলকে মুক্তহস্তে দানের অনুরোধ করা হলো।',
        publishDate: '2026-08-22',
        priority: 'HIGH',
        isPublic: true,
        status: 'ACTIVE',
        publishedBy: 'usr-admin-1',
        publishedByName: 'মুহাম্মদ রফিকুল ইসলাম (সাধারণ সম্পাদক)',
        createdAt: '2026-08-22T08:00:00.000Z'
      },
      {
        id: 'not-02',
        mosqueId: mosque1.id,
        title: 'আসন্ন পরিচালনা কমিটির সাধারণ সভা (AGM)',
        description: 'আগামী ১০ সেপ্টেম্বর বাদ মাগরিব মসজিদ অডিটোরিয়ামে দ্বিবার্ষিক সাধারণ সভা অনুষ্ঠিত হবে। কমিটির সকল সম্মানিত সদস্য ও উপদেষ্টামণ্ডলীকে যথাসময়ে উপস্থিত থাকার জন্য অনুরোধ করা হলো।',
        publishDate: '2026-08-24',
        priority: 'NORMAL',
        isPublic: false,
        status: 'ACTIVE',
        publishedBy: 'usr-admin-1',
        publishedByName: 'মুহাম্মদ রফিকুল ইসলাম',
        createdAt: '2026-08-24T09:00:00.000Z'
      }
    );

    // 15. Audit Log Seed (Comprehensive activity history)
    this.auditLogs.push(
      {
        id: 'aud-001',
        mosqueId: mosque1.id,
        userId: 'usr-admin-1',
        userName: 'মুহাম্মদ রফিকুল ইসলাম',
        userRole: 'MOSQUE_ADMIN',
        action: 'LOGIN',
        module: 'AUTH',
        details: 'ব্যবহারকারী মুহাম্মদ রফিকুল ইসলাম সফলভাবে সিস্টেমে লগইন করেছেন।',
        timestamp: '2026-08-25T08:00:00.000Z',
        ipAddress: '192.168.1.100',
        device: 'Chrome 128 (Windows 11)',
        status: 'SUCCESS'
      },
      {
        id: 'aud-002',
        mosqueId: mosque1.id,
        userId: 'usr-admin-1',
        userName: 'মুহাম্মদ রফিকুল ইসলাম',
        userRole: 'MOSQUE_ADMIN',
        action: 'SETTINGS_CHANGE',
        module: 'MOSQUE',
        recordId: mosque1.id,
        details: 'মসজিদ সেটিংস ও অনলাইন কিউআর পেমেন্ট তথ্য হালনাগাদ করা হয়েছে।',
        timestamp: '2026-08-24T18:15:00.000Z',
        ipAddress: '192.168.1.100',
        device: 'Chrome 128 (Windows 11)',
        status: 'SUCCESS'
      },
      {
        id: 'aud-003',
        mosqueId: mosque1.id,
        userId: 'usr-accountant-1',
        userName: 'আব্দুল করিম',
        userRole: 'ACCOUNTANT',
        action: 'CREATE',
        module: 'INCOME',
        recordId: 'inc-003',
        voucherNumber: 'INC-2026-000003',
        details: 'নতুন আয় ভাউচার তৈরি (INC-2026-000003): ৳ ৫০,০০০/- (খাত: জুমা উন্মুক্ত দান)',
        previousState: 'খসড়া এন্ট্রি',
        newState: 'অনুমোদিত ভাউচার',
        timestamp: '2026-08-23T14:30:00.000Z',
        ipAddress: '192.168.1.105',
        device: 'Firefox 129 (Windows 10)',
        status: 'SUCCESS'
      },
      {
        id: 'aud-004',
        mosqueId: mosque1.id,
        userId: 'usr-admin-1',
        userName: 'মুহাম্মদ রফিকুল ইসলাম',
        userRole: 'MOSQUE_ADMIN',
        action: 'APPROVE',
        module: 'EXPENSE',
        recordId: 'exp-001',
        voucherNumber: 'EXP-2026-000001',
        details: 'ব্যয় ভাউচার অনুমোদন (EXP-2026-000001): ৳ ২৫,০০০/- (খাত: খতিব ও ইমামের মাসিক সম্মানী)',
        timestamp: '2026-08-22T11:00:00.000Z',
        ipAddress: '192.168.1.100',
        device: 'Chrome 128 (Windows 11)',
        status: 'SUCCESS'
      },
      {
        id: 'aud-005',
        mosqueId: mosque1.id,
        userId: 'usr-accountant-1',
        userName: 'আব্দুল করিম',
        userRole: 'ACCOUNTANT',
        action: 'CREATE',
        module: 'DONATION_BOX',
        recordId: 'boxcol-01',
        voucherNumber: 'BOX-COL-001',
        details: 'দানবাক্স সিল খোলা ও অর্থ গণনা সম্পন্ন (প্রধান গেট ১ নং বক্স): ৳ ১২,৫০০/- ক্যাশ হিসেবে জমা',
        timestamp: '2026-08-22T15:45:00.000Z',
        ipAddress: '192.168.1.105',
        device: 'Firefox 129 (Windows 10)',
        status: 'SUCCESS'
      },
      {
        id: 'aud-006',
        mosqueId: mosque1.id,
        userId: 'usr-admin-1',
        userName: 'মুহাম্মদ রফিকুল ইসলাম',
        userRole: 'MOSQUE_ADMIN',
        action: 'CREATE',
        module: 'ACCOUNT_TRANSFER',
        recordId: 'trf-001',
        voucherNumber: 'TRF-2026-001',
        details: 'তহবিল স্থানান্তর: প্রধান ক্যাশ হতে ইসলামী ব্যাংক চলতি হিসাবে ৳ ১,০০,০০০/- স্থানান্তর',
        timestamp: '2026-08-21T10:20:00.000Z',
        ipAddress: '192.168.1.100',
        device: 'Chrome 128 (Windows 11)',
        status: 'SUCCESS'
      },
      {
        id: 'aud-007',
        mosqueId: mosque1.id,
        userId: 'usr-admin-1',
        userName: 'মুহাম্মদ রফিকুল ইসলাম',
        userRole: 'MOSQUE_ADMIN',
        action: 'CREATE',
        module: 'USER',
        recordId: 'usr-collector-1',
        details: 'নতুন ব্যবহারকারী অ্যাকাউন্ট তৈরি করা হয়েছে: মো: জাহিদ হাসান (পদবী: COLLECTOR)',
        timestamp: '2026-08-20T09:00:00.000Z',
        ipAddress: '192.168.1.100',
        device: 'Chrome 128 (Windows 11)',
        status: 'SUCCESS'
      }
    );
  }

  // --- Multi-tenant isolation helper ---
  verifyMosqueOwnership<T extends { mosqueId: string }>(item: T | undefined, userMosqueId: string): T | null {
    if (!item) return null;
    if (item.mosqueId !== userMosqueId) {
      return null;
    }
    return item;
  }

  logAudit(
    mosqueId: string,
    userId: string,
    userName: string,
    userRole: string,
    action: AuditLog['action'],
    module: string,
    details: string,
    recordId?: string,
    ipAddress?: string,
    extra?: {
      voucherNumber?: string;
      previousState?: string;
      newState?: string;
      device?: string;
      status?: 'SUCCESS' | 'FAILED' | 'WARNING';
    }
  ) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      mosqueId,
      userId,
      userName,
      userRole,
      action,
      module,
      recordId,
      voucherNumber: extra?.voucherNumber,
      details,
      previousState: extra?.previousState,
      newState: extra?.newState,
      timestamp: new Date().toISOString(),
      ipAddress: ipAddress || '127.0.0.1',
      device: extra?.device || 'Chrome 128 / Windows',
      status: extra?.status || 'SUCCESS'
    };
    this.auditLogs.unshift(log);
    this.save();
    return log;
  }

  // Calculate Dashboard Stats for a Mosque
  getDashboardStats(mosqueId: string): DashboardStats {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    const approvedIncomes = this.incomeEntries.filter(
      i => i.mosqueId === mosqueId && i.status === 'APPROVED'
    );
    const approvedExpenses = this.expenseEntries.filter(
      e => e.mosqueId === mosqueId && e.status === 'APPROVED'
    );
    const pendingIncomes = this.incomeEntries.filter(
      i => i.mosqueId === mosqueId && i.status === 'PENDING'
    );
    const pendingExpenses = this.expenseEntries.filter(
      e => e.mosqueId === mosqueId && e.status === 'PENDING'
    );

    const totalIncome = approvedIncomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = approvedExpenses.reduce((s, e) => s + e.amount, 0);

    const todayIncome = approvedIncomes
      .filter(i => i.date === todayStr)
      .reduce((s, i) => s + i.amount, 0);
    const todayExpense = approvedExpenses
      .filter(e => e.date === todayStr)
      .reduce((s, e) => s + e.amount, 0);

    const monthlyIncome = approvedIncomes
      .filter(i => i.date.startsWith(currentMonth))
      .reduce((s, i) => s + i.amount, 0);
    const monthlyExpense = approvedExpenses
      .filter(e => e.date.startsWith(currentMonth))
      .reduce((s, e) => s + e.amount, 0);

    const yearlyIncome = approvedIncomes
      .filter(i => i.date.startsWith(String(currentYear)))
      .reduce((s, i) => s + i.amount, 0);
    const yearlyExpense = approvedExpenses
      .filter(e => e.date.startsWith(String(currentYear)))
      .reduce((s, e) => s + e.amount, 0);

    const totalDonation = this.donations
      .filter(d => d.mosqueId === mosqueId && d.status === 'COMPLETED')
      .reduce((s, d) => s + d.amount, 0);

    const mosqueAccounts = this.accounts.filter(a => a.mosqueId === mosqueId && a.status === 'ACTIVE');
    const cashBalance = mosqueAccounts
      .filter(a => a.accountType === 'CASH')
      .reduce((s, a) => s + a.currentBalance, 0);
    const bankBalance = mosqueAccounts
      .filter(a => a.accountType === 'BANK' || a.accountType === 'MFS')
      .reduce((s, a) => s + a.currentBalance, 0);

    const currentBalance = mosqueAccounts.reduce((s, a) => s + a.currentBalance, 0);
    const netBalance = totalIncome - totalExpense;

    // Recent transactions combined
    const recentTx: DashboardStats['recentTransactions'] = [
      ...this.incomeEntries.filter(i => i.mosqueId === mosqueId).map(i => ({
        id: i.id,
        type: 'INCOME' as const,
        voucherNumber: i.voucherNumber,
        headName: i.subHeadNameBn || i.mainHeadNameBn,
        amount: i.amount,
        date: i.date,
        status: i.status,
        accountName: i.accountName,
      })),
      ...this.expenseEntries.filter(e => e.mosqueId === mosqueId).map(e => ({
        id: e.id,
        type: 'EXPENSE' as const,
        voucherNumber: e.voucherNumber,
        headName: e.subHeadNameBn || e.mainHeadNameBn,
        amount: e.amount,
        date: e.date,
        status: e.status,
        accountName: e.accountName,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

    // Monthly Trend (past 6 months)
    const monthNamesBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const monthlyTrend = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = monthNamesBn[d.getMonth()] + ' ' + d.getFullYear().toString().substring(2);
      const inc = approvedIncomes.filter(i => i.date.startsWith(mStr)).reduce((s, i) => s + i.amount, 0);
      const exp = approvedExpenses.filter(e => e.date.startsWith(mStr)).reduce((s, e) => s + e.amount, 0);
      monthlyTrend.push({
        month: mLabel,
        income: inc || (m === 0 ? monthlyIncome : 45000 + m * 8000),
        expense: exp || (m === 0 ? monthlyExpense : 32000 + m * 5000),
      });
    }

    // Category distribution
    const incCategoryMap: Record<string, number> = {};
    approvedIncomes.forEach(i => {
      const name = i.mainHeadNameBn || 'অন্যান্য';
      incCategoryMap[name] = (incCategoryMap[name] || 0) + i.amount;
    });
    const incomeCategories = Object.entries(incCategoryMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
    }));

    const expCategoryMap: Record<string, number> = {};
    approvedExpenses.forEach(e => {
      const name = e.mainHeadNameBn || 'অন্যান্য';
      expCategoryMap[name] = (expCategoryMap[name] || 0) + e.amount;
    });
    const expenseCategories = Object.entries(expCategoryMap).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

    return {
      currentBalance,
      totalIncome,
      totalExpense,
      netBalance,
      todayIncome,
      todayExpense,
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      yearlyExpense,
      totalDonation,
      cashBalance,
      bankBalance,
      pendingApprovalsCount: pendingIncomes.length + pendingExpenses.length,
      recentTransactions: recentTx,
      monthlyTrend,
      incomeCategories: incomeCategories.length ? incomeCategories : [{ name: 'দান ও অনুদান', amount: totalIncome, percentage: 100 }],
      expenseCategories: expenseCategories.length ? expenseCategories : [{ name: 'বিল ও মেরামত', amount: totalExpense, percentage: 100 }],
    };
  }

  updateMosquePublicPortalSettings(
    mosqueId: string,
    newSettings: Partial<PublicPortalSettings>,
    userId: string,
    userName: string,
    userRole: string,
    ip?: string
  ): Mosque {
    const mosque = this.mosques.find(m => m.id === mosqueId);
    if (!mosque) {
      throw new Error('Mosque not found');
    }

    const currentSettings: PublicPortalSettings = mosque.publicPortalSettings
      ? { ...mosque.publicPortalSettings }
      : { ...DEFAULT_PUBLIC_PORTAL_SETTINGS };

    // Track changes for detailed audit logging
    const changedFields: string[] = [];
    (Object.keys(newSettings) as Array<keyof PublicPortalSettings>).forEach(key => {
      if (newSettings[key] !== undefined && newSettings[key] !== currentSettings[key]) {
        changedFields.push(`${String(key)}: ${currentSettings[key] ? 'ON' : 'OFF'} → ${newSettings[key] ? 'ON' : 'OFF'}`);
      }
    });

    const updatedSettings: PublicPortalSettings = {
      ...currentSettings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: userName || userId,
    };

    mosque.publicPortalSettings = updatedSettings;
    mosque.updatedAt = new Date().toISOString();
    this.save();

    // Record Immutable Audit Log
    this.logAudit(
      mosque.id,
      userId,
      userName,
      userRole,
      'UPDATE',
      'PUBLIC_PORTAL_SETTINGS',
      changedFields.length > 0
        ? `পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস পরিবর্তন: ${changedFields.join(', ')}`
        : 'পাবলিক পোর্টাল সেটিংস আপডেট করা হয়েছে',
      mosque.id,
      ip,
      {
        previousState: JSON.stringify(currentSettings),
        newState: JSON.stringify(updatedSettings),
        status: 'SUCCESS',
      }
    );

    return mosque;
  }

  resetMosquePublicPortalSettings(
    mosqueId: string,
    userId: string,
    userName: string,
    userRole: string,
    ip?: string
  ): Mosque {
    const mosque = this.mosques.find(m => m.id === mosqueId);
    if (!mosque) {
      throw new Error('Mosque not found');
    }

    const prevSettings = mosque.publicPortalSettings ? { ...mosque.publicPortalSettings } : { ...DEFAULT_PUBLIC_PORTAL_SETTINGS };
    const resetSettings: PublicPortalSettings = {
      ...DEFAULT_PUBLIC_PORTAL_SETTINGS,
      updatedAt: new Date().toISOString(),
      updatedBy: userName || userId,
    };

    mosque.publicPortalSettings = resetSettings;
    mosque.updatedAt = new Date().toISOString();
    this.save();

    // Record Audit Log
    this.logAudit(
      mosque.id,
      userId,
      userName,
      userRole,
      'UPDATE',
      'PUBLIC_PORTAL_SETTINGS',
      'পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস নিরাপদ ডিফল্টে (Safe Defaults) রিসেট করা হয়েছে',
      mosque.id,
      ip,
      {
        previousState: JSON.stringify(prevSettings),
        newState: JSON.stringify(resetSettings),
        status: 'SUCCESS',
      }
    );

    return mosque;
  }

  getMosque(mosqueId: string): Mosque | undefined {
    return this.mosques.find(m => m.id === mosqueId);
  }

  getMosques(): Mosque[] {
    return this.mosques;
  }

  updateMosque(mosqueId: string, updates: Partial<Mosque>): Mosque {
    const mosque = this.mosques.find(m => m.id === mosqueId);
    if (!mosque) {
      throw new Error('Mosque not found');
    }
    Object.assign(mosque, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return mosque;
  }

  clearDemoData(
    mosqueId: string,
    userId: string,
    userName: string,
    userRole: string,
    ip?: string
  ): void {
    const mosque = this.mosques.find(m => m.id === mosqueId);
    if (!mosque) {
      throw new Error('Mosque not found');
    }

    this.incomeEntries = this.incomeEntries.filter(e => e.mosqueId !== mosqueId);
    this.expenseEntries = this.expenseEntries.filter(e => e.mosqueId !== mosqueId);
    this.donations = this.donations.filter(e => e.mosqueId !== mosqueId);
    this.donationBoxes = this.donationBoxes.filter(e => e.mosqueId !== mosqueId);
    this.donationBoxCollections = this.donationBoxCollections.filter(e => e.mosqueId !== mosqueId);
    this.committeeMembers = this.committeeMembers.filter(e => e.mosqueId !== mosqueId);
    this.committeeMeetings = this.committeeMeetings.filter(e => e.mosqueId !== mosqueId);
    this.committeeNotices = this.committeeNotices.filter(e => e.mosqueId !== mosqueId);
    this.committeeResolutions = this.committeeResolutions.filter(e => e.mosqueId !== mosqueId);
    this.committeeActionPlans = this.committeeActionPlans.filter(e => e.mosqueId !== mosqueId);
    this.committeeActivities = this.committeeActivities.filter(e => e.mosqueId !== mosqueId);
    this.committeeTasks = this.committeeTasks.filter(e => e.mosqueId !== mosqueId);
    this.committeeManualEvaluations = this.committeeManualEvaluations.filter(e => e.mosqueId !== mosqueId);
    this.subCommittees = this.subCommittees.filter(e => e.mosqueId !== mosqueId);
    this.staffList = this.staffList.filter(e => e.mosqueId !== mosqueId);
    this.staffPayments = this.staffPayments.filter(e => e.mosqueId !== mosqueId);
    this.staffBankTransferLetters = this.staffBankTransferLetters.filter(e => e.mosqueId !== mosqueId);
    this.assets = this.assets.filter(e => e.mosqueId !== mosqueId);
    this.properties = this.properties.filter(e => e.mosqueId !== mosqueId);
    this.cemeteryRecords = this.cemeteryRecords.filter(e => e.mosqueId !== mosqueId);
    this.notices = this.notices.filter(e => e.mosqueId !== mosqueId);
    this.notifications = this.notifications.filter(e => e.mosqueId !== mosqueId);
    this.transfers = this.transfers.filter(e => e.mosqueId !== mosqueId);
    this.smsLogs = this.smsLogs.filter(e => e.mosqueId !== mosqueId);

    this.accounts = this.accounts.map(acc => {
      if (acc.mosqueId === mosqueId) {
        return { ...acc, currentBalance: 0, initialBalance: 0 };
      }
      return acc;
    });

    this.save();

    this.logAudit(
      mosque.id,
      userId,
      userName,
      userRole,
      'DELETE',
      'SYSTEM',
      'ডেমু ডাটা মুছে দিয়ে নতুন প্রকৃত ডাটা এন্ট্রি করার উপযোগী করা হয়েছে',
      mosque.id,
      ip,
      { status: 'SUCCESS' }
    );
  }

  getSanitizedPublicPortalData(mosqueIdOrCode?: string): PublicPortalData {
    let mosque: Mosque | undefined;
    if (mosqueIdOrCode) {
      mosque = this.mosques.find(m => m.id === mosqueIdOrCode || m.code === mosqueIdOrCode);
    }
    if (!mosque) {
      mosque = this.mosques.find(m => m.status === 'ACTIVE') || this.mosques[0];
    }
    if (!mosque) {
      throw new Error('No active mosque found in database');
    }

    const settings: PublicPortalSettings = mosque.publicPortalSettings
      ? { ...DEFAULT_PUBLIC_PORTAL_SETTINGS, ...mosque.publicPortalSettings }
      : { ...DEFAULT_PUBLIC_PORTAL_SETTINGS };

    // 1. Whitelist-sanitized Mosque Profile
    let sanitizedMosque: PublicPortalData['mosque'] = null;
    if (settings.mosqueProfile) {
      sanitizedMosque = {
        id: mosque.id,
        code: mosque.code,
        nameBn: mosque.nameBn,
        nameEn: mosque.nameEn,
        address: settings.mosqueAddress ? mosque.address : undefined,
        village: settings.mosqueAddress ? mosque.village : undefined,
        union: settings.mosqueAddress ? mosque.union : undefined,
        upazila: settings.mosqueAddress ? mosque.upazila : undefined,
        district: settings.mosqueAddress ? mosque.district : undefined,
        country: settings.mosqueAddress ? mosque.country : undefined,
        phone: settings.mosquePhone ? mosque.phone : undefined,
        email: settings.mosqueEmail ? mosque.email : undefined,
        website: mosque.website,
        logoUrl: settings.mosqueLogo ? mosque.logoUrl : undefined,
        waqfEstateName: settings.waqfId ? mosque.waqfEstateName : undefined,
        registrationNumber: settings.registrationNumber ? mosque.registrationNumber : undefined,
        establishedDate: settings.establishedYear ? mosque.establishedDate : undefined,
        islamicTagline: settings.islamicTagline
          ? '"যারা আল্লাহর ঘরে সালাত কায়েম করে এবং যাকাত দেয়—তারাই তো আল্লাহর মসজিদসমূহ আবাদ করে।" — (সূরা আত-তাওবাহ: ১৮)'
          : undefined,
      };
    }

    // 2. Prayer Schedule
    const computedSchedule = buildDailyPrayerSchedule(
      new Date(),
      mosque.prayerSettings,
      mosque.jamaatSettings,
      mosque.district
    );

    const prayerTimes = settings.prayerSchedule
      ? computedSchedule.prayers.map(p => ({
          nameBn: `${p.nameBn} (${p.nameEn})`,
          nameEn: p.nameEn,
          adhan: toBanglaDigits(p.adhan),
          iqamah: p.jamaat ? toBanglaDigits(p.jamaat) : 'সময় নির্ধারণ করা হয়নি',
        }))
      : [];

    const jumuahTime = settings.jumuahSchedule && computedSchedule.jumuah
      ? {
          adhan: toBanglaDigits(computedSchedule.jumuah.adhan),
          khutbah: toBanglaDigits(computedSchedule.jumuah.khutbah),
          iqamah: toBanglaDigits(computedSchedule.jumuah.jamaat),
        }
      : undefined;

    // 3. Donation Channels & Payment Details
    let donationChannels: PublicPortalData['donationChannels'] = null;
    if (settings.donation) {
      const publicAccounts = settings.bankAccount
        ? this.accounts
            .filter(a => a.mosqueId === mosque!.id && a.status === 'ACTIVE' && (a.accountType === 'BANK' || a.accountType === 'CASH'))
            .map(a => ({
              id: a.id,
              nameBn: a.nameBn,
              bankName: a.bankName,
              branchName: a.branchName,
              accountNumber: a.accountNumber,
              accountTitle: a.nameBn || a.name,
              routingNumber: undefined,
            }))
        : [];

      const mobileBanking = settings.mobileBanking
        ? {
            bkash: mosque.qrSettings?.bkashNumber || '01711223344 (মার্চেন্ট)',
            nagad: mosque.qrSettings?.nagadNumber || '01711223344 (মার্চেন্ট)',
            rocket: mosque.qrSettings?.rocketNumber,
          }
        : {};

      donationChannels = {
        bankAccounts: publicAccounts,
        mobileBanking,
        qrCodeUrl: settings.donationQr
          ? (mosque.qrSettings?.customQrImageUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://masjidledger.org/donate')
          : undefined,
        instructionsBn: settings.donationInstructions
          ? (mosque.qrSettings?.instructionsBn || 'বিকাশ বা নগদ অ্যাপের মার্চেন্ট বা পেমেন্ট অপশনে গিয়ে মসজিদের তহবিলে আপনার সাদাকাহ/দান সরাসরি পাঠাতে পারেন।')
          : undefined,
      };
    }

    // 4. Financial Transparency (Summary only, whitelist enforced)
    let financialTransparency: PublicPortalData['financialTransparency'] = null;
    if (settings.financialSummary) {
      const stats = this.getDashboardStats(mosque.id);
      const now = new Date();
      const monthNamesBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
      const currentMonthNameBn = `${monthNamesBn[now.getMonth()]} ${now.getFullYear()}`;

      const monthlyInc = settings.monthlyIncome ? stats.monthlyIncome : undefined;
      const monthlyExp = settings.monthlyExpense ? stats.monthlyExpense : undefined;
      const monthlySurplus = settings.monthlySurplus && monthlyInc !== undefined && monthlyExp !== undefined
        ? monthlyInc - monthlyExp
        : undefined;

      financialTransparency = {
        currentMonthNameBn,
        monthlyIncome: monthlyInc,
        monthlyExpense: monthlyExp,
        monthlySurplus,
        currentBalance: settings.currentBalance ? stats.currentBalance : undefined,
        cashBalance: settings.cashBalance ? stats.cashBalance : undefined,
        bankBalance: settings.bankBalance ? stats.bankBalance : undefined,
        totalDonationsReceived: settings.totalDonationReceived ? stats.totalDonation : undefined,
      };
    }

    // 5. Notices (Only active public notices that are not expired)
    const todayStr = new Date().toISOString().split('T')[0];
    const publicNotices: PublicPortalData['notices'] = settings.notices
      ? this.notices
          .filter(n => {
            if (n.mosqueId !== mosque!.id) return false;
            if (n.isPublic !== true || n.status !== 'ACTIVE') return false;
            if (n.expiryDate && n.expiryDate < todayStr) return false; // Filter out expired
            return true;
          })
          .map(n => ({
            id: n.id,
            title: n.title,
            description: n.description,
            publishDate: n.publishDate,
            priority: n.priority,
            isEmergency: n.priority === 'URGENT' || n.priority === 'HIGH',
          }))
          .filter(n => {
            if (n.isEmergency && !settings.emergencyNotice) return false;
            return true;
          })
      : [];

    // 6. Projects & Action Plans
    const projects: PublicPortalData['projects'] = settings.projects
      ? this.committeeActionPlans
          .filter(p => p.mosqueId === mosque!.id && p.status !== 'CANCELLED')
          .map(p => {
            const progress = p.progressPercentage ?? (p.status === 'COMPLETED' ? 100 : 45);

            return {
              id: p.id,
              planNumber: p.planNumber,
              title: p.title,
              description: p.description,
              status: p.status === 'COMPLETED' ? 'সম্পন্ন' : p.status === 'IN_PROGRESS' ? 'চলমান' : 'পরিকল্পনাধীন',
              progressPercentage: settings.projectProgress ? progress : 0,
              targetDate: p.dueDate || p.startDate,
              approvedBudget: settings.projectBudget ? p.estimatedBudget : undefined,
              actualExpense: settings.projectBudget ? p.actualCost : undefined,
              remainingBudget: settings.projectBudget && p.estimatedBudget !== undefined
                ? Math.max(0, (p.estimatedBudget || 0) - (p.actualCost || 0))
                : undefined,
            };
          })
      : [];

    // 7. Waqf Property Public Summary (Strict whitelist - NO tenant personal phone/NID/leases)
    const waqfSummary: PublicPortalData['waqfSummary'] = settings.waqfSummary
      ? this.properties
          .filter(pr => pr.mosqueId === mosque!.id && !pr.isArchived)
          .map(pr => ({
            id: pr.id,
            propertyCode: pr.propertyCode,
            name: pr.nameBn || pr.name || pr.description,
            category: pr.category || pr.type,
            location: pr.location || pr.fullAddress || 'মসজিদ সংলগ্ন ওয়াকফ এলাকা',
            status: pr.status === 'RENTED' ? 'ভাড়া দেওয়া আছে' : pr.status === 'ACTIVE' ? 'মসজিদের নিজ নিয়ন্ত্রণে' : 'উন্নয়নাধীন',
            description: pr.description,
          }))
      : [];

    // 8. Committee & Leadership (Strict whitelist - NO personal phone, NID, address)
    let committee: PublicPortalData['committee'] = null;
    if (settings.committee) {
      const activeTerm = this.committeeTerms.find(t => t.mosqueId === mosque!.id && t.status === 'ACTIVE') || this.committeeTerms[0];
      const activeMembers = activeTerm
        ? this.committeeMembers.filter(m => m.termId === activeTerm.id && m.status === 'ACTIVE')
        : [];

      const getMemberDesignationBn = (m: CommitteeMember) => {
        if (m.positionCustomBn) return m.positionCustomBn;
        const positionMap: Record<string, string> = {
          PRESIDENT: 'সভাপতি',
          VICE_PRESIDENT: 'সহ-সভাপতি',
          SECRETARY: 'সাধারণ সম্পাদক',
          JOINT_SECRETARY: 'যুগ্ম সাধারণ সম্পাদক',
          TREASURER: 'কোষাধ্যক্ষ / ক্যাশিয়ার',
          ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
          MEMBER: 'সদস্য',
          IMAM: 'খতিব / ইমাম',
          ADVISOR: 'উপদেষ্টা',
          OTHER: 'কমিটি সদস্য',
        };
        return positionMap[m.position] || 'কমিটি সদস্য';
      };

      committee = {
        termTitle: activeTerm?.title || 'পরিচালনা কমিটি',
        members: activeMembers.map(m => {
          const desig = getMemberDesignationBn(m);
          return {
            id: m.id,
            name: m.name,
            designation: desig,
            role: desig,
          };
        }),
      };
    }

    // 9. Sub-Committees
    const subCommittees: PublicPortalData['subCommittees'] = settings.subCommittee
      ? this.subCommittees
          .filter(sc => sc.mosqueId === mosque!.id && sc.status === 'ACTIVE')
          .map(sc => ({
            id: sc.id,
            name: sc.name,
            category: sc.category,
            convener: sc.convenerName,
            memberCount: (sc.memberIds || []).length || (sc.members || []).length,
            responsibilities: sc.duties || sc.scopeOfWork,
          }))
      : [];

    // 10. Imam & Staff (Strict whitelist - NO salary, payments, bank info, NID)
    const staff: PublicPortalData['staff'] = settings.staff
      ? this.staffList
          .filter(s => s.mosqueId === mosque!.id && s.status === 'ACTIVE')
          .map(s => ({
            id: s.id,
            name: s.fullNameBn || s.name,
            designationBn: s.designationBn || s.designation,
            role: s.designation,
            joiningDate: s.joiningDate,
            contactNumber: s.phone ? `${s.phone.slice(0, 5)}•••••` : undefined, // Safe masked contact
          }))
      : [];

    // 11. Cemetery Information
    let cemetery: PublicPortalData['cemetery'] = null;
    if (settings.cemetery) {
      const totalPlots = this.cemeteryRecords.filter(c => c.mosqueId === mosque!.id).length;
      const availablePlots = this.cemeteryRecords.filter(c => c.mosqueId === mosque!.id && c.plotStatus === 'AVAILABLE').length;

      cemetery = {
        totalPlots: totalPlots || 120,
        availablePlots: availablePlots || 35,
        generalRules: 'মসজিদ কবরস্থানে দাফন ও সংরক্ষণের জন্য পরিচালনা কমিটির সাধারণ নিয়মাবলী ও তালিকাভুক্ত পরিবারের নীতিমালা প্রযোজ্য।',
        contactPerson: 'কবরস্থান সেবা তত্ত্বাবধায়ক',
        contactPhone: mosque.phone,
      };
    }

    return {
      mosque: sanitizedMosque,
      settings,
      prayerTimes,
      jumuahTime,
      donationChannels,
      financialTransparency,
      notices: publicNotices,
      projects,
      waqfSummary,
      committee,
      subCommittees,
      staff,
      cemetery,
      serverTime: new Date().toISOString(),
    };
  }

  getQrCodes(mosqueId?: string): QRCodeEntity[] {
    if (!mosqueId) return this.qrCodes;
    return this.qrCodes.filter(q => q.mosqueId === mosqueId);
  }

  createQrCode(data: Partial<QRCodeEntity>): QRCodeEntity {
    const newQr: QRCodeEntity = {
      id: `qr-${Date.now()}`,
      mosqueId: data.mosqueId || 'mosque-mamun-001',
      name: data.name || 'অপারেশনাল QR',
      type: data.type || 'OPERATIONAL',
      destinationType: data.destinationType || 'INCOME_NEW',
      token: `token-${Math.random().toString(36).substring(2, 10)}${Date.now()}`,
      status: data.status || 'ACTIVE',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.qrCodes.push(newQr);
    this.save();
    return newQr;
  }

  updateQrCode(id: string, data: Partial<QRCodeEntity>): QRCodeEntity {
    const idx = this.qrCodes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('QR code not found');
    this.qrCodes[idx] = {
      ...this.qrCodes[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.qrCodes[idx];
  }

  updateQrCodeStatus(id: string, status: QRStatus): QRCodeEntity {
    const idx = this.qrCodes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('QR code not found');
    this.qrCodes[idx].status = status;
    this.qrCodes[idx].updatedAt = new Date().toISOString();
    this.save();
    return this.qrCodes[idx];
  }

  deleteQrCode(id: string): boolean {
    const idx = this.qrCodes.findIndex(q => q.id === id);
    if (idx === -1) return false;
    this.qrCodes.splice(idx, 1);
    this.save();
    return true;
  }

  bulkCreateQrCodes(list: Partial<QRCodeEntity>[]): QRCodeEntity[] {
    const created: QRCodeEntity[] = [];
    for (const item of list) {
      const newQr: QRCodeEntity = {
        id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        mosqueId: item.mosqueId || 'mosque-mamun-001',
        name: item.name || 'স্মার্ট QR কোড',
        type: item.type || 'OPERATIONAL',
        destinationType: item.destinationType || 'INCOME_NEW',
        token: `token-${Math.random().toString(36).substring(2, 10)}${Date.now()}`,
        status: item.status || 'ACTIVE',
        description: item.description || '',
        targetRecordId: item.targetRecordId,
        targetRecordCode: item.targetRecordCode,
        targetCustomTitle: item.targetCustomTitle,
        useCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.qrCodes.push(newQr);
      created.push(newQr);
    }
    this.save();
    return created;
  }

  regenerateQrToken(id: string): QRCodeEntity {
    const idx = this.qrCodes.findIndex(q => q.id === id);
    if (idx === -1) throw new Error('QR code not found');
    this.qrCodes[idx].token = `token-${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
    this.qrCodes[idx].updatedAt = new Date().toISOString();
    this.save();
    return this.qrCodes[idx];
  }

  resolveQrToken(token: string): QRCodeEntity | null {
    const found = this.qrCodes.find(q => q.token === token);
    if (found) {
      found.lastUsedAt = new Date().toISOString();
      found.useCount = (found.useCount || 0) + 1;
      this.save();
    }
    return found || null;
  }
}

export const db = new DatabaseStore();


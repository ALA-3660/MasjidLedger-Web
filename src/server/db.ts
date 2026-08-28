import fs from 'fs';
import path from 'path';
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
  PublicDocumentToken
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
  committeeTerms: CommitteeTerm[] = [];
  committeeMembers: CommitteeMember[] = [];
  committeeMeetings: CommitteeMeeting[] = [];
  committeeNotices: CommitteeMeetingNotice[] = [];
  committeeResolutions: MeetingResolution[] = [];
  committeeActionPlans: CommitteeActionPlan[] = [];
  committeeActivities: CommitteeMemberActivity[] = [];
  committeeTasks: CommitteeMemberTask[] = [];
  committeeManualEvaluations: CommitteeManualEvaluation[] = [];
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
        this.mosques = parsed.mosques || [];
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
        this.auditLogs = parsed.auditLogs || [];
        this.idempotencyMap = parsed.idempotencyMap || {};
        return;
      }
    } catch (e) {
      console.warn('[DB] Failed to load DB file, seeding initial dataset:', e);
    }

    this.seedInitialData();
    this.save();
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
        auditLogs: this.auditLogs,
        idempotencyMap: this.idempotencyMap,
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

    // 5. Initial Income & Expenses
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
      }
    );

    // 12. Property & Waqf
    this.properties.push({
      id: 'prop-01',
      mosqueId: mosque1.id,
      propertyCode: 'PROP-WAQF-01',
      type: 'COMMERCIAL_LAND',
      description: 'মসজিদ সংলগ্ন ওয়াকফ মার্কেট (১০টি পাকা দোকান)',
      location: 'মিরপুর-১২ মূল সড়ক সংলগ্ন',
      area: '৬.৫ শতাংশ জমি',
      ownershipType: 'WAQF',
      waqfEnrollmentNo: 'EC-18452/1988',
      currentUse: '১০টি দোকান ভাড়া দেওয়া আছে (মাসিক আয় মোট ৪৫,০০০ টাকা)',
      monthlyIncome: 45000,
      status: 'ACTIVE',
      documentsCount: 4,
      notes: 'সকল ভাড়া চুক্তি ২০২৭ সাল পর্যন্ত কার্যকর।',
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    // 13. Cemetery Records
    this.cemeteryRecords.push(
      {
        id: 'cem-01',
        mosqueId: mosque1.id,
        plotNumber: 'PLOT-A-12',
        deceasedName: 'মরহুম হাজী আব্দুল গফুর',
        fatherOrSpouseName: 'মরহুম কাছিম উদ্দিন',
        dateOfDeath: '2025-11-14',
        burialDate: '2025-11-15',
        graveLocation: 'উত্তর-পশ্চিম ব্লক, সারি নং ৩',
        plotStatus: 'OCCUPIED',
        contactPersonName: 'মোঃ আসাদুজ্জামান (পুত্র)',
        contactPersonPhone: '01713555777',
        notes: 'স্থায়ী ওয়াকফ কবরস্থান এলাকা।',
        createdAt: '2025-11-15T00:00:00.000Z'
      },
      {
        id: 'cem-02',
        mosqueId: mosque1.id,
        plotNumber: 'PLOT-B-05',
        deceasedName: 'মরহুমা রোকেয়া বেগম',
        fatherOrSpouseName: 'মরহুম মোঃ দেলোয়ার হোসেন',
        dateOfDeath: '2026-02-18',
        burialDate: '2026-02-19',
        graveLocation: 'দক্ষিণ ব্লক, সারি নং ১',
        plotStatus: 'OCCUPIED',
        contactPersonName: 'ইঞ্জিনিয়ার মাহবুব (পুত্র)',
        contactPersonPhone: '01819222444',
        notes: 'দাফন সম্পন্ন ও নম্বর ফলক স্থাপিত।',
        createdAt: '2026-02-19T00:00:00.000Z'
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
}

export const db = new DatabaseStore();

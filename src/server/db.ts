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
  AdvisoryCouncilTerm,
  AdvisorMember,
  AdvisorConsultation,
  CentralDocument,
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
  advisoryTerms: AdvisoryCouncilTerm[] = [];
  advisors: AdvisorMember[] = [];
  advisorConsultations: AdvisorConsultation[] = [];
  staffList: Staff[] = [];
  staffPayments: StaffPayment[] = [];
  staffBankTransferLetters: StaffBankTransferLetter[] = [];
  paymentBatches: any[] = [];
  assets: MosqueAsset[] = [];
  properties: MosqueProperty[] = [];
  cemeteryRecords: CemeteryRecord[] = [];
  notices: MosqueNotice[] = [];
  notifications: MosqueNotification[] = [];
  transfers: AccountTransfer[] = [];
  uploadedFiles: UploadedFile[] = [];
  centralDocuments: CentralDocument[] = [];
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
        this.advisoryTerms = parsed.advisoryTerms || [];
        this.advisors = parsed.advisors || [];
        this.advisorConsultations = parsed.advisorConsultations || [];

        // Safe migration: Check if any executive committee members have ADVISOR position and safely migrate
        const existingAdvisorsInCommittee = this.committeeMembers.filter(m => (m as any).position === 'ADVISOR');
        if (existingAdvisorsInCommittee.length > 0) {
          const defaultAdvTermId = this.advisoryTerms[0]?.id || 'adv-term-2026-2028';
          for (const adv of existingAdvisorsInCommittee) {
            if (!this.advisors.some(a => a.id === adv.id || (a.phone === adv.phone && a.name === adv.name))) {
              this.advisors.push({
                id: adv.id,
                mosqueId: adv.mosqueId,
                termId: defaultAdvTermId,
                name: adv.name,
                fatherName: adv.fatherName,
                motherName: adv.motherName,
                nid: adv.nid,
                phone: adv.phone,
                altPhone: adv.altPhone,
                dateOfBirth: adv.dateOfBirth,
                bloodGroup: adv.bloodGroup,
                address: adv.address,
                photoUrl: adv.photoUrl,
                advisorRole: adv.positionCustomBn || 'উপদেষ্টা',
                occupation: adv.occupation,
                education: adv.education,
                email: adv.email,
                joinDate: adv.joinDate || new Date().toISOString().split('T')[0],
                status: adv.status || 'ACTIVE',
                notes: adv.notes,
                createdAt: adv.createdAt || new Date().toISOString()
              });
            }
          }
          // Remove them from executive committee members so they are strictly separated
          this.committeeMembers = this.committeeMembers.filter(m => (m as any).position !== 'ADVISOR');
        }

        // Initialize default advisory term if none exists
        if (this.advisoryTerms.length === 0) {
          const defaultMosqueId = this.mosques[0]?.id || 'mosque-1';
          this.advisoryTerms.push({
            id: 'adv-term-2026-2028',
            mosqueId: defaultMosqueId,
            title: '২০২৬–২০২৮ উপদেষ্টা পরিষদ',
            startDate: '2026-01-01',
            endDate: '2028-12-31',
            status: 'ACTIVE',
            description: 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট উপদেষ্টা পরিষদ',
            createdAt: new Date().toISOString()
          });
        }
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
        this.paymentBatches = parsed.paymentBatches || [];
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
        this.centralDocuments = parsed.centralDocuments || [];

        // Safe migration: Link pre-existing property documents to centralDocuments if not already present
        if (this.properties && this.properties.length > 0) {
          for (const prop of this.properties) {
            if (prop.documents && prop.documents.length > 0) {
              for (const doc of prop.documents) {
                if (!this.centralDocuments.some(cd => cd.id === doc.id || (cd.entityId === prop.id && cd.name === doc.title))) {
                  this.centralDocuments.push({
                    id: doc.id || `doc-prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    mosqueId: doc.mosqueId || prop.mosqueId,
                    entityType: 'WAQF',
                    entityId: prop.id,
                    entityTitle: prop.name || 'ওয়াকফ সম্পত্তি',
                    name: doc.title || 'ওয়াকফ দলিল/কাগজপত্র',
                    originalFileName: doc.fileName || 'document.pdf',
                    fileUrl: doc.fileUrl,
                    fileType: doc.fileUrl?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                    fileSize: 102400,
                    documentDate: doc.issueDate || new Date().toISOString().split('T')[0],
                    documentType: 'DEED',
                    documentTypeBn: doc.documentTypeBn || 'দলিল',
                    description: doc.description || '',
                    visibility: 'RESTRICTED',
                    version: 1,
                    uploadedBy: 'system',
                    uploadedByName: 'সিস্টেম অ্যাডমিন',
                    createdAt: doc.issueDate ? `${doc.issueDate}T00:00:00.000Z` : new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                }
              }
            }
          }
        }

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
        advisoryTerms: this.advisoryTerms,
        advisors: this.advisors,
        advisorConsultations: this.advisorConsultations,
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
        centralDocuments: this.centralDocuments,
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
      jamaatSettings: {
        fajr: { azan: '4:28 AM', jamaat: '5:15 AM' },
        dhuhr: { azan: '12:30 PM', jamaat: '1:30 PM' },
        asr: { azan: '4:21 PM', jamaat: '4:45 PM' },
        maghrib: { azan: '6:05 PM', jamaat: '6:30 PM' },
        isha: { azan: '7:21 PM', jamaat: '8:15 PM' },
        jumuah: { azan: '12:30 PM', khutbah: '1:00 PM', jamaat: '1:30 PM' }
      },
      prayerSettings: {
        district: 'Dhaka',
        timezone: 'Asia/Dhaka',
        calculationMethod: 'HANAFI_KARACHI',
        madhab: 'HANAFI',
        fajrAngle: 18,
        ishaAngle: 18,
        ishraqOffsetMinutes: 10,
        zawalForbiddenDurationMinutes: 10,
        sunriseForbiddenDurationMinutes: 12,
        sunsetForbiddenDurationMinutes: 15,
        tahajjudMode: 'LAST_THIRD',
        timeDisplayFormat: '12H',
        warningThresholdMinutes: 10,
        fajr: { adhan: '4:28 AM', jamaat: '5:15 AM', manualOffset: 0 },
        dhuhr: { adhan: '12:30 PM', jamaat: '1:30 PM', manualOffset: 0 },
        asr: { adhan: '4:21 PM', jamaat: '4:45 PM', manualOffset: 0 },
        maghrib: { adhan: '6:05 PM', jamaat: '6:30 PM', manualOffset: 0 },
        isha: { adhan: '7:21 PM', jamaat: '8:15 PM', manualOffset: 0 },
        jumuah: { adhan: '12:30 PM', khutbah: '1:00 PM', jamaat: '1:30 PM' }
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
      jamaatSettings: {
        fajr: { azan: '4:28 AM', jamaat: '5:15 AM' },
        dhuhr: { azan: '12:30 PM', jamaat: '1:30 PM' },
        asr: { azan: '4:21 PM', jamaat: '4:45 PM' },
        maghrib: { azan: '6:05 PM', jamaat: '6:30 PM' },
        isha: { azan: '7:21 PM', jamaat: '8:15 PM' },
        jumuah: { azan: '12:30 PM', khutbah: '1:00 PM', jamaat: '1:30 PM' }
      },
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

    // 4. Financial Accounts (Clean Opening Balances for Real Entry)
    const accCash: FinancialAccount = {
      id: "acc-cash-01",
      mosqueId: mosque1.id,
      name: "Main Cash In Hand",
      nameBn: "প্রধান ক্যাশ ও নগদ তহবিল (ক্যাশিয়ার)",
      accountType: "CASH",
      openingBalance: 0,
      currentBalance: 0,
      status: "ACTIVE",
      isDefault: true,
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    const accBank: FinancialAccount = {
      id: "acc-bank-01",
      mosqueId: mosque1.id,
      name: "Islami Bank CD Account",
      nameBn: "ইসলামী ব্যাংক বাংলাদেশ লিঃ (হিসাব: ২০৫০...৭৮৯০)",
      accountType: "BANK",
      bankName: "Islami Bank Bangladesh Ltd",
      branchName: "Mirpur-10 Branch",
      accountNumber: "20501234567890",
      openingBalance: 0,
      currentBalance: 0,
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    const accBkash: FinancialAccount = {
      id: "acc-mfs-01",
      mosqueId: mosque1.id,
      name: "Official bKash Merchant",
      nameBn: "অফিসিয়াল বিকাশ মার্চেন্ট হিসাব (০১৭১১২২৩৩৪)",
      accountType: "MFS",
      accountNumber: "01711223344",
      openingBalance: 0,
      currentBalance: 0,
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    this.accounts.push(accCash, accBank, accBkash);

    // Initial operational setup (Ready for real records)
    this.donationBoxes.push({
      id: "box-01",
      mosqueId: mosque1.id,
      boxCode: "MB-01",
      manualName: "প্রধান গেট ১নং দানবাক্স",
      location: "মসজিদের প্রধান ফটক (Main Gate)",
      status: "ACTIVE",
      totalCollected: 0,
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    this.committeeTerms.push({
      id: "term-2026",
      mosqueId: mosque1.id,
      title: "২০২৬-২০২৮ কার্যনির্বাহী পরিচালনা পরিষদ",
      startDate: "2026-01-01",
      endDate: "2028-12-31",
      status: "ACTIVE",
      membersCount: 0,
      description: "বর্তমান কার্যকর পরিচালনা পরিষদ",
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    this.auditLogs.push({
      id: "aud-init-001",
      mosqueId: mosque1.id,
      userId: "usr-admin-1",
      userName: "মুহাম্মদ রফিকুল ইসলাম",
      userRole: "MOSQUE_ADMIN",
      action: "SYSTEM_INITIALIZE",
      module: "SYSTEM",
      details: "সিস্টেমের সমস্ত ডেমো রেকর্ড পরিষ্কার করা হয়েছে। সফটওয়্যারটি এখন বাস্তব হিসাব ও নথি এন্ট্রির জন্য সম্পূর্ণ প্রস্তুত।",
      timestamp: "2026-09-10T12:00:00.000Z",
      ipAddress: "127.0.0.1",
      status: "SUCCESS"
    });
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


import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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
  AreaMaster,
  FamilyMaster,
  PersonMaster,
  DonationPlan,
  CollectionWorker,
  DonationCollection,
  Budget,
  BudgetLine,
  LibraryCategory,
  BookTitle,
  BookCopy,
  LibraryMember,
  BookIssue,
  BookAcquisition,
  LibraryRoom,
  LibraryRack,
  LibraryShelf,
  LibraryDashboardStats,
  EducationProgram,
  EducationLevel,
  EducationStudentProfile,
  EducationGuardianRelationship,
  EducationEnrollment,
  EducationDashboardStats,
  MaktabClass,
  MaktabAttendance,
  MaktabTeacherAssignment,
  MaktabFeeSchedule,
  MaktabFeeRecord,
  MaktabStudentProgress,
  MaktabDashboardStats,
  HifzLevel,
  HifzCurriculum,
  HifzkhanaEnrollment,
  HifzSabak,
  HifzSabaki,
  HifzDaurCycle,
  HifzDaur,
  HifzRevision,
  HifzAttendance,
  HifzUstadAssignment,
  HifzResidence,
  HifzResidenceBuilding,
  HifzResidenceRoom,
  HifzResidenceBed,
  HifzResidentialAllocation,
  HifzResidentialTransfer,
} from '../types';
import {
  OfficialDocument,
  OfficialDocumentTemplate,
  DocumentNumberingConfig,
} from '../types/officialDocumentTypes';
import { DEFAULT_DOCUMENT_TEMPLATES } from '../lib/officialDocumentTemplates';
import { getStarterOfficialDocuments } from '../lib/starterOfficialDocuments';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'masjidledger_db.json');

export const getStarterEducationPrograms = (mosqueId: string): EducationProgram[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `prog-${mosqueId}-maktab`,
      mosqueId,
      type: 'MAKTAB',
      nameBn: 'মক্তব ও প্রাথমিক দ্বীনি শিক্ষা',
      nameEn: 'Maktab & Primary Islamic Education',
      code: 'MAKTAB',
      description: 'সহীহ কুরআন তিলাওয়াত, মাসনূন দুআ ও বুনিয়াদি দ্বীনি শিক্ষা কার্যক্রম',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `prog-${mosqueId}-hifz`,
      mosqueId,
      type: 'HIFZKHANA',
      nameBn: 'হিফজুল কুরআন বিভাগ',
      nameEn: 'Tahfeezul Quran Division',
      code: 'HIFZKHANA',
      description: 'হিফজুল কুরআন, সবক, দৌর ও তাজভীদ শিক্ষা কার্যক্রম',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
  ];
};

export const getStarterEducationLevels = (mosqueId: string): EducationLevel[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `lvl-${mosqueId}-qaida`,
      mosqueId,
      programId: `prog-${mosqueId}-maktab`,
      programType: 'MAKTAB',
      nameBn: 'নূরানী কায়দা জামাত',
      nameEn: 'Noorani Qaida',
      code: 'QAIDA',
      sortOrder: 1,
      description: 'হুরুফ ও হরকত পরিচিতি, মাখরাজ শিক্ষা',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `lvl-${mosqueId}-ampara`,
      mosqueId,
      programId: `prog-${mosqueId}-maktab`,
      programType: 'MAKTAB',
      nameBn: 'আমপারা জামাত',
      nameEn: 'Ampara / Juz Amma',
      code: 'AMPARA',
      sortOrder: 2,
      description: '৩০তম পারার প্রাথমিক মাশক ও তিলাওয়াত',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `lvl-${mosqueId}-nazera`,
      mosqueId,
      programId: `prog-${mosqueId}-maktab`,
      programType: 'MAKTAB',
      nameBn: 'কুরআন নাজেরা জামাত',
      nameEn: 'Quran Nazera',
      code: 'NAZERA',
      sortOrder: 3,
      description: 'পূর্ণাঙ্গ আল-কুরআন দেখে সহীহ তিলাওয়াত অনুশীলন',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `lvl-${mosqueId}-deeniyat`,
      mosqueId,
      programId: `prog-${mosqueId}-maktab`,
      programType: 'MAKTAB',
      nameBn: 'বুনিয়াদি দ্বীনিয়াত ও মাসনূন দুআ',
      nameEn: 'Basic Deeniyat & Masnoon Dua',
      code: 'DEENIYAT',
      sortOrder: 4,
      description: 'নামাজের নিয়ম, প্রয়োজনীয় সুরা, জরুরি মাসআলা ও সুন্নাত',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `lvl-${mosqueId}-hifz-prep`,
      mosqueId,
      programId: `prog-${mosqueId}-hifz`,
      programType: 'HIFZKHANA',
      nameBn: 'হিফজ প্রস্তুতিমূলক জামাত',
      nameEn: 'Hifz Preparatory',
      code: 'HIFZ_PREP',
      sortOrder: 1,
      description: 'হিফজ আরম্ভের পূর্ববর্তী তাজভীদ ও মাশক স্তর',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `lvl-${mosqueId}-hifz-active`,
      mosqueId,
      programId: `prog-${mosqueId}-hifz`,
      programType: 'HIFZKHANA',
      nameBn: 'হিফজুল কুরআন (চলমান সবক)',
      nameEn: 'Tahfeez (Active Sabak)',
      code: 'HIFZ_ACTIVE',
      sortOrder: 2,
      description: 'দৈনিক সবক, সবকী ও আমপারা হিফজ স্তর',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `lvl-${mosqueId}-hifz-daur`,
      mosqueId,
      programId: `prog-${mosqueId}-hifz`,
      programType: 'HIFZKHANA',
      nameBn: 'দৌর ও পুনরাবৃত্তি স্তর',
      nameEn: 'Daur & Revision',
      code: 'HIFZ_DAUR',
      sortOrder: 3,
      description: 'হিফজ সমাপ্তকারী ও ইয়াদকারী শিক্ষার্থীদের পুনরাবৃত্তি স্তর',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
  ];
};

export const getStarterMaktabClasses = (mosqueId: string): MaktabClass[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `cls-${mosqueId}-qaida-morn`,
      mosqueId,
      levelId: `lvl-${mosqueId}-qaida`,
      levelCode: 'QAIDA',
      nameBn: 'নূরানী কায়দা সকাল ব্যাচ',
      nameEn: 'Noorani Qaida Morning Batch',
      shift: 'MORNING',
      room: 'মক্তব কক্ষ-১',
      maxCapacity: 30,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `cls-${mosqueId}-ampara-morn`,
      mosqueId,
      levelId: `lvl-${mosqueId}-ampara`,
      levelCode: 'AMPARA',
      nameBn: 'আমপারা জামাত সকাল ব্যাচ',
      nameEn: 'Ampara Morning Batch',
      shift: 'MORNING',
      room: 'মক্তব কক্ষ-২',
      maxCapacity: 25,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `cls-${mosqueId}-nazera-morn`,
      mosqueId,
      levelId: `lvl-${mosqueId}-nazera`,
      levelCode: 'NAZERA',
      nameBn: 'নাজেরা কুরআন সকাল ব্যাচ',
      nameEn: 'Nazera Morning Batch',
      shift: 'MORNING',
      room: 'মক্তব কক্ষ-৩',
      maxCapacity: 25,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `cls-${mosqueId}-deeniyat-eve`,
      mosqueId,
      levelId: `lvl-${mosqueId}-deeniyat`,
      levelCode: 'DEENIYAT',
      nameBn: 'বুনিয়াদি দ্বীনিয়াত সান্ধ্যকালীন ব্যাচ',
      nameEn: 'Deeniyat Evening Batch',
      shift: 'EVENING',
      room: 'মসজিদ বারান্দা',
      maxCapacity: 35,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
  ];
};

export const getStarterMaktabFeeSchedules = (mosqueId: string): MaktabFeeSchedule[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `fee-sch-${mosqueId}-monthly`,
      mosqueId,
      titleBn: 'মাসিক মক্তব শিক্ষা ফি',
      titleEn: 'Monthly Maktab Education Fee',
      defaultAmount: 500,
      frequency: 'MONTHLY',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
    {
      id: `fee-sch-${mosqueId}-admission`,
      mosqueId,
      titleBn: 'মক্তব নতুন ভর্তি ফি',
      titleEn: 'Maktab New Admission Fee',
      defaultAmount: 500,
      frequency: 'ONE_TIME',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
    },
  ];
};

export const getStarterHifzLevels = (mosqueId: string): HifzLevel[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `hlvl-${mosqueId}-beginner`,
      mosqueId,
      stage: 'BEGINNER',
      nameBn: 'প্রারম্ভিক হিফজ স্তর (হিফজ আরম্ভ)',
      nameEn: 'Hifz Beginner Stage',
      description: 'হিফজ আরম্ভ ও প্রাথমিক মুখস্থ স্তর',
      sortOrder: 1,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `hlvl-${mosqueId}-intermediate`,
      mosqueId,
      stage: 'INTERMEDIATE',
      nameBn: 'মধ্যবর্তী হিফজ স্তর (চলমান হিফজ)',
      nameEn: 'Hifz Intermediate Stage',
      description: 'নিয়মিত হিফজ ও মুখস্থ অগ্রগতির স্তর',
      sortOrder: 2,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `hlvl-${mosqueId}-advanced`,
      mosqueId,
      stage: 'ADVANCED',
      nameBn: 'উচ্চতর হিফজ স্তর (অগ্রবর্তী পারা)',
      nameEn: 'Hifz Advanced Stage',
      description: 'উচ্চতর পারা হিফজ ও মজবুতকরণ স্তর',
      sortOrder: 3,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `hlvl-${mosqueId}-completion`,
      mosqueId,
      stage: 'COMPLETION',
      nameBn: 'তাকমীল হিফজ স্তর (সমাপ্তি ও ইয়াদ)',
      nameEn: 'Hifz Completion Stage',
      description: 'হিফজ সমাপ্তি ও পূর্ণ কুরআন ইয়াদকরণ স্তর',
      sortOrder: 4,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const getStarterHifzCurricula = (mosqueId: string): HifzCurriculum[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `hcur-${mosqueId}-full`,
      mosqueId,
      type: 'FULL_QURAN_HIFZ',
      nameBn: 'পূর্ণ ৩০ পারা হিফজুল কুরআন',
      nameEn: 'Full Quran Hifz',
      description: 'পূর্ণ আল-কুরআনুল কারীম হিফজ কার্যক্রম (১ম থেকে ৩০তম পারা)',
      targetMonths: 36,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `hcur-${mosqueId}-surahs`,
      mosqueId,
      type: 'SELECTED_SURAHS',
      nameBn: 'নির্বাচিত সুরা ও আমপারা হিফজ',
      nameEn: 'Selected Surahs & Ampara Hifz',
      description: 'দৈনন্দিন সালাতে প্রয়োজনীয় গুরুত্বপূর্ণ সুরা ও ৩০তম পারা মুখস্থকরণ',
      targetMonths: 12,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `hcur-${mosqueId}-juz`,
      mosqueId,
      type: 'JUZ_BASED_HIFZ',
      nameBn: 'পারাভিত্তিক নির্ধারিত হিফজ',
      nameEn: 'Juz-Based Hifz',
      description: 'নির্দিষ্ট পারা বা পর্যায়ক্রমিক পারা হিফজ কার্যক্রম',
      targetMonths: 18,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const getStarterLibraryCategories = (mosqueId: string): LibraryCategory[] => [
  { id: `cat-${mosqueId}-01`, mosqueId, name: 'কুরআন ও তাফসীর', code: 'TAF', description: 'পবিত্র কুরআন মাজিদ, অনুবাদ ও নির্ভরযোগ্য তাফসীর গ্রন্থসমূহ', sortOrder: 1, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'SYSTEM' },
  { id: `cat-${mosqueId}-02`, mosqueId, name: 'হাদিস শাস্ত্র', code: 'HAD', description: 'সিহাহ সিত্তাহ ও অন্যান্য বিশুদ্ধ হাদিস সংকলন', sortOrder: 2, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'SYSTEM' },
  { id: `cat-${mosqueId}-03`, mosqueId, name: 'ইসলামী ফিকহ ও ফতোয়া', code: 'FIQ', description: 'দৈনন্দিন মাসআলা-মাসায়েল ও ফিকহ শাস্ত্রীয় কিতাব', sortOrder: 3, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'SYSTEM' },
  { id: `cat-${mosqueId}-04`, mosqueId, name: 'সীরাত ও ইসলামী ইতিহাস', code: 'SIR', description: 'রাসূলুল্লাহ (সা.)-এর পবিত্র জীবনী, সাহাবায়ে কেরামের জীবনচরিত ও ইতিহাস', sortOrder: 4, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'SYSTEM' },
  { id: `cat-${mosqueId}-05`, mosqueId, name: 'আখলাক ও আত্মশুদ্ধি', code: 'AKH', description: 'তাজকিয়া, দোয়া, মোনাজাত ও চরিত্র গঠনমূলক বই', sortOrder: 5, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'SYSTEM' },
  { id: `cat-${mosqueId}-06`, mosqueId, name: 'সাধারণ ইসলামী সাহিত্য ও শিশু-কিশোর', code: 'GEN', description: 'সহজ ভাষায় দ্বীনি শিক্ষা, আদর্শ ও শিশুতোষ ইসলামী বই', sortOrder: 6, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'SYSTEM' },
];

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
  officialDocuments: OfficialDocument[] = [];
  officialDocumentTemplates: OfficialDocumentTemplate[] = [];
  officialDocumentNumbering: Record<string, Record<string, DocumentNumberingConfig>> = {};
  areas: AreaMaster[] = [];
  families: FamilyMaster[] = [];
  persons: PersonMaster[] = [];
  donationPlans: DonationPlan[] = [];
  collectionWorkers: CollectionWorker[] = [];
  donationCollections: DonationCollection[] = [];
  budgets: Budget[] = [];
  budgetLines: BudgetLine[] = [];
  libraryCategories: LibraryCategory[] = [];
  bookTitles: BookTitle[] = [];
  bookCopies: BookCopy[] = [];
  libraryMembers: LibraryMember[] = [];
  bookIssues: BookIssue[] = [];
  bookAcquisitions: BookAcquisition[] = [];
  libraryRooms: LibraryRoom[] = [];
  libraryRacks: LibraryRack[] = [];
  libraryShelves: LibraryShelf[] = [];
  educationStudentProfiles: EducationStudentProfile[] = [];
  educationPrograms: EducationProgram[] = [];
  educationLevels: EducationLevel[] = [];
  educationEnrollments: EducationEnrollment[] = [];
  educationGuardianRelationships: EducationGuardianRelationship[] = [];
  maktabClasses: MaktabClass[] = [];
  maktabAttendances: MaktabAttendance[] = [];
  maktabTeacherAssignments: MaktabTeacherAssignment[] = [];
  maktabFeeSchedules: MaktabFeeSchedule[] = [];
  maktabFeeRecords: MaktabFeeRecord[] = [];
  maktabProgressRecords: MaktabStudentProgress[] = [];
  hifzEnrollments: HifzkhanaEnrollment[] = [];
  hifzLevels: HifzLevel[] = [];
  hifzCurricula: HifzCurriculum[] = [];
  hifzSabaks: HifzSabak[] = [];
  hifzSabakis: HifzSabaki[] = [];
  hifzDaurCycles: HifzDaurCycle[] = [];
  hifzDaurs: HifzDaur[] = [];
  hifzRevisions: HifzRevision[] = [];
  hifzAttendances: HifzAttendance[] = [];
  hifzTeacherAssignments: HifzUstadAssignment[] = [];
  hifzResidences: HifzResidence[] = [];
  hifzResidenceBuildings: HifzResidenceBuilding[] = [];
  hifzResidenceRooms: HifzResidenceRoom[] = [];
  hifzResidenceBeds: HifzResidenceBed[] = [];
  hifzResidentialAllocations: HifzResidentialAllocation[] = [];
  hifzResidentialTransfers: HifzResidentialTransfer[] = [];

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
        this.users = (parsed.users || []).map((u: any) => {
          let passwordHash = u.passwordHash;
          if (!passwordHash || (!passwordHash.startsWith('$2a$') && !passwordHash.startsWith('$2b$'))) {
            const raw = passwordHash || 'admin123';
            passwordHash = bcrypt.hashSync(raw, 10);
          }
          const userObj = { ...u, passwordHash };
          if (userObj.role === 'ACCOUNTANT' || userObj.role === 'TREASURER') {
            const existingPerms = new Set(userObj.permissions || []);
            ['VIEW_BUDGET', 'CREATE_BUDGET', 'EDIT_BUDGET', 'SUBMIT_BUDGET', 'VIEW_BUDGET_ANALYSIS', 'EXPORT_BUDGET_REPORT'].forEach(p => existingPerms.add(p));
            // Ensure accountant never has approval/revision/closing permissions
            existingPerms.delete('APPROVE_BUDGET');
            existingPerms.delete('REVISE_BUDGET');
            existingPerms.delete('CLOSE_BUDGET');
            userObj.permissions = Array.from(existingPerms);
          }
          return userObj;
        });
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
        this.officialDocuments = parsed.officialDocuments || [];
        if (this.officialDocuments.length === 0 && this.mosques.length > 0) {
          const m = this.mosques[0];
          this.officialDocuments = getStarterOfficialDocuments(m.id, m.nameBn || m.name);
        }
        this.officialDocumentTemplates = (parsed.officialDocumentTemplates && parsed.officialDocumentTemplates.length > 0)
          ? parsed.officialDocumentTemplates
          : DEFAULT_DOCUMENT_TEMPLATES;
        this.officialDocumentNumbering = parsed.officialDocumentNumbering || {};

        // Musalli & Donor collections
        this.areas = parsed.areas || [];
        this.families = parsed.families || [];
        this.persons = parsed.persons || [];
        this.donationPlans = parsed.donationPlans || [];
        this.collectionWorkers = parsed.collectionWorkers || [];
        this.donationCollections = parsed.donationCollections || [];
        this.budgets = parsed.budgets || [];
        this.budgetLines = parsed.budgetLines || [];

        // Library & Knowledge Center collections
        this.libraryCategories = parsed.libraryCategories || [];
        if (this.libraryCategories.length === 0 && this.mosques.length > 0) {
          const m = this.mosques[0];
          this.libraryCategories = getStarterLibraryCategories(m.id);
        }
        this.bookTitles = parsed.bookTitles || [];
        this.bookCopies = parsed.bookCopies || [];
        this.libraryMembers = parsed.libraryMembers || [];
        this.bookIssues = parsed.bookIssues || [];
        this.bookAcquisitions = parsed.bookAcquisitions || [];
        this.libraryRooms = parsed.libraryRooms || [];
        this.libraryRacks = parsed.libraryRacks || [];
        this.libraryShelves = parsed.libraryShelves || [];
        this.educationStudentProfiles = parsed.educationStudentProfiles || [];
        this.educationPrograms = parsed.educationPrograms || [];
        this.educationLevels = parsed.educationLevels || [];
        this.educationEnrollments = parsed.educationEnrollments || [];
        this.educationGuardianRelationships = parsed.educationGuardianRelationships || [];
        this.maktabClasses = parsed.maktabClasses || [];
        this.maktabAttendances = parsed.maktabAttendances || [];
        this.maktabTeacherAssignments = parsed.maktabTeacherAssignments || [];
        this.maktabFeeSchedules = parsed.maktabFeeSchedules || [];
        this.maktabFeeRecords = parsed.maktabFeeRecords || [];
        this.maktabProgressRecords = parsed.maktabProgressRecords || [];
        this.hifzEnrollments = parsed.hifzEnrollments || [];
        this.hifzLevels = parsed.hifzLevels || [];
        this.hifzCurricula = parsed.hifzCurricula || [];
        this.hifzSabaks = parsed.hifzSabaks || [];
        this.hifzSabakis = parsed.hifzSabakis || [];
        this.hifzDaurCycles = parsed.hifzDaurCycles || [];
        this.hifzDaurs = parsed.hifzDaurs || [];
        this.hifzRevisions = parsed.hifzRevisions || [];
        this.hifzAttendances = parsed.hifzAttendances || [];
        this.hifzTeacherAssignments = parsed.hifzTeacherAssignments || parsed.hifzUstadAssignments || [];
        this.hifzResidences = parsed.hifzResidences || [];
        this.hifzResidenceBuildings = parsed.hifzResidenceBuildings || [];
        this.hifzResidenceRooms = parsed.hifzResidenceRooms || [];
        this.hifzResidenceBeds = parsed.hifzResidenceBeds || [];
        this.hifzResidentialAllocations = parsed.hifzResidentialAllocations || [];
        this.hifzResidentialTransfers = parsed.hifzResidentialTransfers || [];

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
        officialDocuments: this.officialDocuments,
        officialDocumentTemplates: this.officialDocumentTemplates,
        officialDocumentNumbering: this.officialDocumentNumbering,
        areas: this.areas,
        families: this.families,
        persons: this.persons,
        donationPlans: this.donationPlans,
        collectionWorkers: this.collectionWorkers,
        donationCollections: this.donationCollections,
        budgets: this.budgets,
        budgetLines: this.budgetLines,
        libraryCategories: this.libraryCategories,
        bookTitles: this.bookTitles,
        bookCopies: this.bookCopies,
        libraryMembers: this.libraryMembers,
        bookIssues: this.bookIssues,
        bookAcquisitions: this.bookAcquisitions,
        libraryRooms: this.libraryRooms,
        libraryRacks: this.libraryRacks,
        libraryShelves: this.libraryShelves,
        educationStudentProfiles: this.educationStudentProfiles,
        educationPrograms: this.educationPrograms,
        educationLevels: this.educationLevels,
        educationEnrollments: this.educationEnrollments,
        educationGuardianRelationships: this.educationGuardianRelationships,
        maktabClasses: this.maktabClasses,
        maktabAttendances: this.maktabAttendances,
        maktabTeacherAssignments: this.maktabTeacherAssignments,
        maktabFeeSchedules: this.maktabFeeSchedules,
        maktabFeeRecords: this.maktabFeeRecords,
        maktabProgressRecords: this.maktabProgressRecords,
        hifzEnrollments: this.hifzEnrollments,
        hifzLevels: this.hifzLevels,
        hifzCurricula: this.hifzCurricula,
        hifzSabaks: this.hifzSabaks,
        hifzSabakis: this.hifzSabakis,
        hifzDaurCycles: this.hifzDaurCycles,
        hifzDaurs: this.hifzDaurs,
        hifzRevisions: this.hifzRevisions,
        hifzAttendances: this.hifzAttendances,
        hifzTeacherAssignments: this.hifzTeacherAssignments,
        hifzResidences: this.hifzResidences,
        hifzResidenceBuildings: this.hifzResidenceBuildings,
        hifzResidenceRooms: this.hifzResidenceRooms,
        hifzResidenceBeds: this.hifzResidenceBeds,
        hifzResidentialAllocations: this.hifzResidentialAllocations,
        hifzResidentialTransfers: this.hifzResidentialTransfers,
      };
      const tempPath = `${DB_FILE_PATH}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE_PATH);
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
        passwordHash: bcrypt.hashSync('admin123', 10),
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
          'VIEW_REPORT', 'EXPORT_REPORT', 'MANAGE_ACCOUNTS', 'MANAGE_STAFF',
          'VIEW_BUDGET', 'CREATE_BUDGET', 'EDIT_BUDGET', 'SUBMIT_BUDGET', 'VIEW_BUDGET_ANALYSIS', 'EXPORT_BUDGET_REPORT'
        ],
        passwordHash: bcrypt.hashSync('pass123', 10),
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
        passwordHash: bcrypt.hashSync('super123', 10),
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

    const sampleProperty: MosqueProperty = {
      id: "prop-waqf-001",
      mosqueId: mosque1.id,
      propertyCode: "PROP-2026-001",
      name: "মসজিদ মার্কেট কমপ্লেক্স",
      nameBn: "মসজিদ মার্কেট কমপ্লেক্স (ওয়াকফ সম্পত্তি)",
      type: "MARKET",
      description: "মসজিদ মার্কেট কমপ্লেক্স বাণিজ্যিক ওয়াকফ সম্পত্তি",
      location: "মসজিদ সংলগ্ন পূর্ব পার্শ্ব",
      area: "৫ শতাংশ",
      ownershipType: "WAQF",
      currentUse: "ভাড়া প্রদানকৃত বাণিজ্যিক মার্কেট",
      status: "ACTIVE",
      tenants: [
        {
          id: "tenant-001",
          mosqueId: mosque1.id,
          propertyId: "prop-waqf-001",
          tenantCode: "TNT-001",
          name: "হাজী আব্দুর রহিম",
          mobile: "01819000111",
          unitOrShopNo: "দোকান নং-০১ (গ্রাউন্ড ফ্লোর)",
          monthlyRent: 6000,
          securityDeposit: 50000,
          startDate: "2026-01-01",
          endDate: "2027-12-31",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      rentCollections: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };
    this.properties.push(sampleProperty);

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
      category: module,
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

  // ==========================================================
  // MUSALLI & DONOR MASTER DATABASE HELPERS
  // ==========================================================

  generateAreaId(mosqueId: string): string {
    return `area-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  generateAreaCode(mosqueId: string): string {
    const existing = this.areas.filter(a => a.mosqueId === mosqueId);
    const count = existing.length + 1;
    return `AREA-${String(count).padStart(2, '0')}`;
  }

  generateFamilyId(mosqueId: string): string {
    return `fam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  generateFamilyCode(mosqueId: string): string {
    const existing = this.families.filter(f => f.mosqueId === mosqueId);
    let maxNum = 0;
    for (const f of existing) {
      if (f.familyCode) {
        const match = f.familyCode.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = Math.max(existing.length + 1, maxNum + 1);
    return `FAM-${String(nextNum).padStart(4, '0')}`;
  }

  generatePersonId(mosqueId: string): string {
    return `per-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  generatePersonCode(mosqueId: string): string {
    const existing = this.persons.filter(p => p.mosqueId === mosqueId);
    let maxNum = 0;
    for (const p of existing) {
      if (p.personCode) {
        const match = p.personCode.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = Math.max(existing.length + 1, maxNum + 1);
    return `P-${String(nextNum).padStart(5, '0')}`;
  }

  generateDonationPlanId(mosqueId: string): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  generateDonationPlanCode(mosqueId: string): string {
    const existing = this.donationPlans.filter(p => p.mosqueId === mosqueId);
    let maxNum = 0;
    for (const p of existing) {
      const code = p.planCode || p.id;
      if (code) {
        const match = code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = Math.max(existing.length + 1, maxNum + 1);
    return `PLAN-${String(nextNum).padStart(5, '0')}`;
  }

  generateCollectionWorkerId(mosqueId: string): string {
    return `cw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  generateDonationCollectionId(mosqueId: string): string {
    const existing = this.donationCollections.filter(c => c.mosqueId === mosqueId);
    let maxNum = 0;
    for (const c of existing) {
      if (c.id) {
        const match = c.id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextNum = Math.max(existing.length + 1, maxNum + 1);
    let candidate = `COL-${String(nextNum).padStart(5, '0')}`;
    let counter = nextNum;
    while (this.donationCollections.some(c => c.id === candidate && c.mosqueId === mosqueId)) {
      counter++;
      candidate = `COL-${String(counter).padStart(5, '0')}`;
    }
    return candidate;
  }

  checkPotentialDuplicatePerson(
    mosqueId: string,
    payload: {
      fullName?: string;
      fatherOrHusbandName?: string;
      mobile?: string;
      nidNumber?: string;
      dateOfBirth?: string;
      familyId?: string;
      areaId?: string;
      address?: string;
    },
    excludeId?: string
  ): {
    hasPotentialDuplicates: boolean;
    matches: {
      person: PersonMaster;
      reasons: string[];
    }[];
  } {
    const persons = this.persons.filter(p => p.mosqueId === mosqueId && (!excludeId || p.id !== excludeId));
    const matches: { person: PersonMaster; reasons: string[] }[] = [];

    const norm = (str?: string) => (str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '');
    const cleanPhone = (str?: string) => (str ? str.replace(/[^\d]/g, '') : '');
    const cleanNid = (str?: string) => (str ? str.replace(/[^\d]/g, '') : '');

    const targetName = norm(payload.fullName);
    const targetFather = norm(payload.fatherOrHusbandName);
    const targetMobile = cleanPhone(payload.mobile);
    const targetNid = cleanNid(payload.nidNumber);

    for (const p of persons) {
      const reasons: string[] = [];
      const pName = norm(p.fullName);
      const pFather = norm(p.fatherOrHusbandName);
      const pMobile = cleanPhone(p.mobile);
      const pNid = cleanNid(p.nidNumber);

      // 1. NID exact match (if provided)
      if (targetNid && pNid && targetNid.length >= 10 && targetNid === pNid) {
        reasons.push(`জাতীয় পরিচয়পত্র (NID: ${p.nidNumber}) হুবহু মিলে গেছে`);
      }

      // 2. Mobile exact match (if mobile is provided)
      if (targetMobile && pMobile && targetMobile.length >= 10 && (targetMobile === pMobile || targetMobile.endsWith(pMobile) || pMobile.endsWith(targetMobile))) {
        reasons.push(`মোবাইল নম্বর (${p.mobile}) হুবহু মিলে গেছে`);
      }

      // 3. Full Name exact/strong match
      if (targetName && pName) {
        if (targetName === pName) {
          // If also father name matches or family matches
          if (targetFather && pFather && targetFather === pFather) {
            reasons.push(`নাম (${p.fullName}) এবং পিতা/স্বামীর নাম (${p.fatherOrHusbandName}) হুবহু এক`);
          } else if (payload.familyId && p.familyId && payload.familyId === p.familyId) {
            reasons.push(`নাম (${p.fullName}) এবং একই পরিবারে অন্তর্ভুক্তি মিলে গেছে`);
          } else if (payload.areaId && p.areaId && payload.areaId === p.areaId) {
            reasons.push(`নাম (${p.fullName}) এবং একই এলাকা/মহল্লায় অন্তর্ভুক্তি মিলে গেছে`);
          } else {
            reasons.push(`নাম (${p.fullName}) হুবহু মিলে গেছে`);
          }
        } else if (targetName.length > 4 && (pName.includes(targetName) || targetName.includes(pName))) {
          if (targetFather && pFather && targetFather === pFather) {
            reasons.push(`কাছাকাছি নাম (${p.fullName}) এবং একই পিতা/স্বামীর নাম (${p.fatherOrHusbandName})`);
          }
        }
      }

      if (reasons.length > 0) {
        matches.push({ person: p, reasons });
      }
    }

    return {
      hasPotentialDuplicates: matches.length > 0,
      matches,
    };
  }

  checkPotentialDuplicateFamily(
    mosqueId: string,
    payload: {
      name?: string;
      areaId?: string;
      familyCode?: string;
      mobile?: string;
      address?: string;
      houseRoadBlock?: string;
    },
    excludeId?: string
  ): {
    hasPotentialDuplicates: boolean;
    matches: {
      family: FamilyMaster;
      reasons: string[];
    }[];
  } {
    const families = this.families.filter(f => f.mosqueId === mosqueId && (!excludeId || f.id !== excludeId));
    const matches: { family: FamilyMaster; reasons: string[] }[] = [];

    const norm = (str?: string) => (str ? str.trim().toLowerCase().replace(/\s+/g, ' ') : '');
    const cleanPhone = (str?: string) => (str ? str.replace(/[^\d]/g, '') : '');

    const targetName = norm(payload.name);
    const targetMobile = cleanPhone(payload.mobile);
    const targetCode = norm(payload.familyCode);
    const targetAreaId = payload.areaId;
    const targetAddress = norm(payload.address);
    const targetHouseRoad = norm(payload.houseRoadBlock);

    for (const f of families) {
      const reasons: string[] = [];
      const fName = norm(f.name);
      const fMobile = cleanPhone(f.mobile);
      const fCode = norm(f.familyCode);
      const fAddress = norm(f.address);
      const fHouseRoad = norm(f.houseRoadBlock);

      // 1. Code match
      if (targetCode && fCode && targetCode === fCode) {
        reasons.push(`পারিবারিক কোড (${f.familyCode}) হুবহু মিলে গেছে`);
      }

      // 2. Mobile match
      if (targetMobile && fMobile && targetMobile.length >= 10 && (targetMobile === fMobile || targetMobile.endsWith(fMobile) || fMobile.endsWith(targetMobile))) {
        reasons.push(`মোবাইল নম্বর (${f.mobile}) মিলে গেছে`);
      }

      // 3. Name in same area
      if (targetName && fName) {
        if (targetName === fName) {
          if (targetAreaId && f.areaId && targetAreaId === f.areaId) {
            reasons.push(`একই এলাকায় হুবহু একই নামের পরিবার (${f.name}) ইতিমধ্যে বিদ্যমান`);
          } else {
            reasons.push(`একই নামের পরিবার (${f.name}) অন্য এলাকায় বিদ্যমান`);
          }
        } else if (targetAreaId && f.areaId && targetAreaId === f.areaId) {
          // Check substring / fuzzy similarity in same area
          if (targetName.includes(fName) || fName.includes(targetName)) {
            reasons.push(`একই এলাকায় কাছাকাছি নামের পরিবার (${f.name}) বিদ্যমান`);
          }
        }
      }

      // 4. Same Area and exact House/Road
      if (targetAreaId && f.areaId && targetAreaId === f.areaId) {
        if (targetHouseRoad && fHouseRoad && targetHouseRoad === fHouseRoad && targetHouseRoad.length > 3) {
          reasons.push(`একই এলাকায় একই বাড়ি/রোড/ব্লক (${f.houseRoadBlock}) পাওয়া গেছে`);
        } else if (targetAddress && fAddress && targetAddress === fAddress && targetAddress.length > 5) {
          reasons.push(`একই এলাকায় একই ঠিকানা (${f.address}) পাওয়া গেছে`);
        }
      }

      if (reasons.length > 0) {
        matches.push({ family: f, reasons });
      }
    }

    return {
      hasPotentialDuplicates: matches.length > 0,
      matches,
    };
  }

  checkOverlappingDonationPlan(
    mosqueId: string,
    personId: string,
    planType: string,
    excludeId?: string
  ): {
    hasOverlappingPlan: boolean;
    activePlans: DonationPlan[];
    reasons: string[];
  } {
    const activePlans = this.donationPlans.filter(
      p => p.mosqueId === mosqueId && p.personId === personId && p.status === 'ACTIVE' && (!excludeId || p.id !== excludeId)
    );

    const reasons: string[] = [];
    const sameType = activePlans.filter(p => p.planType === planType);
    if (sameType.length > 0) {
      const typeLabel = planType === 'MONTHLY' ? 'মাসিক' : planType === 'YEARLY' ? 'বার্ষিক' : planType === 'IRREGULAR' ? 'অনিয়মিত' : 'পরিকল্পনা';
      reasons.push(`এই ব্যক্তির জন্য ইতোমধ্যে ১টি সক্রিয় ${typeLabel} অনুদান পরিকল্পনা চালু রয়েছে (${sameType[0].planCode || sameType[0].id})`);
    } else if (activePlans.length > 0) {
      reasons.push(`এই ব্যক্তির জন্য ইতোমধ্যে ${activePlans.length}টি সক্রিয় অনুদান পরিকল্পনা চালু রয়েছে`);
    }

    return {
      hasOverlappingPlan: reasons.length > 0,
      activePlans,
      reasons,
    };
  }

  // ==========================================================================
  // PHASE E6: BUDGET & EXPENSE CONTROL STORE METHODS
  // (Zero Financial Delta - Planning & Control Layer Only)
  // ==========================================================================

  getBudgets(
    mosqueId: string,
    options?: { includeArchived?: boolean; type?: string }
  ): Budget[] {
    return this.budgets.filter((b) => {
      // Strict Mosque Isolation
      if (b.mosqueId !== mosqueId) return false;
      if (!options?.includeArchived && b.isArchived) return false;
      if (options?.type && options.type !== 'ALL' && b.budgetType !== options.type) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getBudgetById(id: string, mosqueId: string): { budget: Budget; lines: BudgetLine[] } | null {
    const budget = this.budgets.find((b) => b.id === id && b.mosqueId === mosqueId);
    if (!budget) return null;
    const lines = this.budgetLines.filter((l) => l.budgetId === budget.id);
    return { budget, lines };
  }

  getBudgetLines(budgetId: string): BudgetLine[] {
    return this.budgetLines.filter((l) => l.budgetId === budgetId);
  }

  validateAndCleanBudgetLines(
    lines: Partial<BudgetLine>[],
    budgetId: string
  ): { cleanLines: BudgetLine[]; totalPlannedAmount: number } {
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new Error('বাজেটের খাতের তালিকা আবশ্যক।');
    }

    const seenKeys = new Set<string>();
    const cleanLines: BudgetLine[] = [];
    let totalPlannedAmount = 0;

    for (let idx = 0; idx < lines.length; idx++) {
      const l = lines[idx];
      const mainHeadId = (l.mainHeadId || '').trim();
      if (!mainHeadId) {
        throw new Error('বাজেটের প্রতিটি লাইনে প্রধান খাত নির্বাচন করা আবশ্যক।');
      }
      const subHeadId = (l.subHeadId || '').trim();
      const key = `${mainHeadId}_${subHeadId}`;

      if (seenKeys.has(key)) {
        throw new Error('একই প্রধান খাত ও উপ-খাত এই বাজেটে ইতোমধ্যে যুক্ত আছে।');
      }
      seenKeys.add(key);

      const rawVal = l.plannedAmount as unknown;
      const numVal = Number(rawVal);
      if (rawVal === null || rawVal === undefined || rawVal === '' || isNaN(numVal) || !isFinite(numVal) || numVal < 0) {
        throw new Error('বাজেটের প্রাক্কলিত অর্থ অবশ্যই একটি বৈধ অ-ঋণাত্মক সংখ্যা হতে হবে।');
      }

      cleanLines.push({
        id: l.id || `bl-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        budgetId,
        mainHeadId,
        mainHeadNameBn: l.mainHeadNameBn || 'অনির্ধারিত খাত',
        subHeadId: subHeadId || undefined,
        subHeadNameBn: l.subHeadNameBn || undefined,
        plannedAmount: numVal,
        notes: l.notes || '',
      });

      totalPlannedAmount += numVal;
    }

    return { cleanLines, totalPlannedAmount };
  }

  createBudget(
    data: { budget: Partial<Budget>; lines: Partial<BudgetLine>[] },
    user: User
  ): { budget: Budget; lines: BudgetLine[] } {
    const budgetId = `bud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const { cleanLines, totalPlannedAmount } = this.validateAndCleanBudgetLines(data.lines, budgetId);

    const newBudget: Budget = {
      id: budgetId,
      mosqueId: user.mosqueId, // Strict multi-tenant isolation
      budgetName: data.budget.budgetName || 'নতুন বাজেট পরিকল্পনা',
      budgetType: data.budget.budgetType || 'OPERATING',
      startDate: data.budget.startDate || now.slice(0, 10),
      endDate: data.budget.endDate || now.slice(0, 10),
      status: (data.budget.status as any) || 'DRAFT',
      notes: data.budget.notes || '',
      totalPlannedAmount,
      revisionNumber: 1,
      projectId: data.budget.projectId || undefined,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    };

    this.budgets.unshift(newBudget);
    this.budgetLines.push(...cleanLines);
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'CREATE',
      'BUDGET_CONTROL',
      `নতুন বাজেট তৈরি করা হয়েছে: ${newBudget.budgetName} (মোট প্রাক্কলিত: ৳${newBudget.totalPlannedAmount})`,
      newBudget.id,
      undefined,
      { newState: JSON.stringify(newBudget) }
    );

    return { budget: newBudget, lines: cleanLines };
  }

  updateDraftBudget(
    id: string,
    data: { budget?: Partial<Budget>; lines?: Partial<BudgetLine>[] },
    user: User
  ): { budget: Budget; lines: BudgetLine[] } {
    const index = this.budgets.findIndex((b) => b.id === id && b.mosqueId === user.mosqueId);
    if (index === -1) {
      throw new Error('বাজেট রেকর্ড খুঁজে পাওয়া যায়নি বা অন্য মসজিদের ডেটা।');
    }

    const current = this.budgets[index];
    if (current.status !== 'DRAFT') {
      throw new Error('শুধুমাত্র ড্রাফট (খসড়া) অবস্থায় থাকা বাজেট সম্পাদনা করা যাবে।');
    }

    const now = new Date().toISOString();
    const previousState = JSON.stringify(current);

    let cleanLines = this.budgetLines.filter((l) => l.budgetId === id);
    let totalPlannedAmount = current.totalPlannedAmount;
    if (data.lines) {
      const validated = this.validateAndCleanBudgetLines(data.lines, id);
      cleanLines = validated.cleanLines;
      totalPlannedAmount = validated.totalPlannedAmount;
      // Replace existing lines with updated lines
      this.budgetLines = this.budgetLines.filter((l) => l.budgetId !== id);
      this.budgetLines.push(...cleanLines);
    }

    const updatedBudget: Budget = {
      ...current,
      budgetName: data.budget?.budgetName ?? current.budgetName,
      budgetType: data.budget?.budgetType ?? current.budgetType,
      startDate: data.budget?.startDate ?? current.startDate,
      endDate: data.budget?.endDate ?? current.endDate,
      notes: data.budget?.notes ?? current.notes,
      projectId: data.budget?.projectId ?? current.projectId,
      totalPlannedAmount,
      updatedAt: now,
    };

    this.budgets[index] = updatedBudget;
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'UPDATE',
      'BUDGET_CONTROL',
      `ড্রাফট বাজেট হালনাগাদ করা হয়েছে: ${updatedBudget.budgetName} (মোট প্রাক্কলিত: ৳${updatedBudget.totalPlannedAmount})`,
      updatedBudget.id,
      undefined,
      { previousState, newState: JSON.stringify(updatedBudget) }
    );

    return { budget: updatedBudget, lines: cleanLines };
  }

  submitBudget(id: string, user: User): Budget {
    const index = this.budgets.findIndex((b) => b.id === id && b.mosqueId === user.mosqueId);
    if (index === -1) {
      throw new Error('বাজেট পাওয়া যায়নি।');
    }
    const current = this.budgets[index];
    if (current.status !== 'DRAFT') {
      throw new Error('শুধুমাত্র ড্রাফট বাজেট অনুমোদনের জন্য পেশ করা যাবে।');
    }

    current.status = 'SUBMITTED';
    current.updatedAt = new Date().toISOString();
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'SUBMIT',
      'BUDGET_CONTROL',
      `বাজেট অনুমোদনের জন্য পেশ করা হয়েছে: ${current.budgetName}`,
      current.id
    );

    return current;
  }

  approveBudget(id: string, user: User): Budget {
    const index = this.budgets.findIndex((b) => b.id === id && b.mosqueId === user.mosqueId);
    if (index === -1) {
      throw new Error('বাজেট পাওয়া যায়নি।');
    }
    const current = this.budgets[index];
    if (current.status !== 'SUBMITTED' && current.status !== 'DRAFT') {
      throw new Error('শুধুমাত্র ড্রাফট বা পেশকৃত বাজেট অনুমোদন করা যাবে।');
    }

    const now = new Date().toISOString();
    current.status = 'ACTIVE';
    current.approvedBy = user.id;
    current.approvedByName = user.name;
    current.approvedAt = now;
    current.updatedAt = now;
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'APPROVE',
      'BUDGET_CONTROL',
      `বাজেট চূড়ান্তভাবে অনুমোদন ও সক্রিয় করা হয়েছে: ${current.budgetName} (মোট: ৳${current.totalPlannedAmount})`,
      current.id
    );

    return current;
  }

  reviseBudget(
    budgetId: string,
    newLines: Partial<BudgetLine>[],
    notes: string,
    user: User
  ): { budget: Budget; lines: BudgetLine[] } {
    const index = this.budgets.findIndex((b) => b.id === budgetId && b.mosqueId === user.mosqueId);
    if (index === -1) {
      throw new Error('বাজেট পাওয়া যায়নি।');
    }
    const current = this.budgets[index];
    if (current.status !== 'APPROVED' && current.status !== 'ACTIVE') {
      throw new Error('শুধুমাত্র অনুমোদিত বা সক্রিয় বাজেট সংশোধন (Revise) করা যাবে।');
    }

    const now = new Date().toISOString();
    const previousState = JSON.stringify(current);

    // 1. Mark existing budget as REVISED and archived
    current.status = 'REVISED';
    current.isArchived = true;
    current.updatedAt = now;

    // 2. Create newly revised Budget
    const newBudgetId = `bud-${Date.now()}-rev-${current.revisionNumber + 1}`;
    const { cleanLines, totalPlannedAmount } = this.validateAndCleanBudgetLines(newLines, newBudgetId);

    const revisedBudget: Budget = {
      id: newBudgetId,
      mosqueId: user.mosqueId,
      budgetName: current.budgetName,
      budgetType: current.budgetType,
      startDate: current.startDate,
      endDate: current.endDate,
      status: 'ACTIVE',
      notes: notes || `সংশোধিত রিভিশন #${current.revisionNumber + 1}`,
      totalPlannedAmount,
      revisionNumber: current.revisionNumber + 1,
      previousRevisionId: current.id,
      projectId: current.projectId,
      createdBy: user.id,
      createdByName: user.name,
      approvedBy: user.id,
      approvedByName: user.name,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    };

    this.budgets.unshift(revisedBudget);
    this.budgetLines.push(...cleanLines);
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'REVISE',
      'BUDGET_CONTROL',
      `বাজেট সংশোধন ও নতুন রিভিশন #${revisedBudget.revisionNumber} তৈরি করা হয়েছে: ${revisedBudget.budgetName}`,
      revisedBudget.id,
      undefined,
      { previousState, newState: JSON.stringify(revisedBudget) }
    );

    return { budget: revisedBudget, lines: cleanLines };
  }

  closeBudget(id: string, notes: string, user: User): Budget {
    const index = this.budgets.findIndex((b) => b.id === id && b.mosqueId === user.mosqueId);
    if (index === -1) {
      throw new Error('বাজেট পাওয়া যায়নি।');
    }
    const current = this.budgets[index];
    current.status = 'CLOSED';
    if (notes) current.notes = (current.notes ? current.notes + ' | ' : '') + notes;
    current.updatedAt = new Date().toISOString();
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'CLOSE',
      'BUDGET_CONTROL',
      `বাজেট মেয়াদ বা কার্যকাল সমাপ্ত (Closed) করা হয়েছে: ${current.budgetName}`,
      current.id
    );

    return current;
  }

  deleteDraftBudget(id: string, user: User): boolean {
    const index = this.budgets.findIndex((b) => b.id === id && b.mosqueId === user.mosqueId);
    if (index === -1) {
      throw new Error('বাজেট পাওয়া যায়নি।');
    }
    const current = this.budgets[index];
    if (current.status !== 'DRAFT') {
      throw new Error('শুধুমাত্র খসড়া (Draft) অবস্থায় থাকা বাজেট মোছা যাবে। অনুমোদিত বা সক্রিয় বাজেট মোছা নিষিদ্ধ।');
    }

    this.budgets.splice(index, 1);
    this.budgetLines = this.budgetLines.filter((l) => l.budgetId !== id);
    this.save();

    this.logAudit(
      user.mosqueId,
      user.id,
      user.name,
      user.role,
      'DELETE',
      'BUDGET_CONTROL',
      `খসড়া বাজেট মুছে ফেলা হয়েছে: ${current.budgetName}`,
      id
    );

    return true;
  }

  // ==========================================
  // LIBRARY & KNOWLEDGE CENTER HELPERS
  // ==========================================
  generateNextBookId(mosqueId: string): string {
    const mosqueCopies = this.bookCopies.filter(c => c.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueCopies.forEach(c => {
      const match = c.bookId.match(/^BOK-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `BOK-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextIssueNumber(mosqueId: string): string {
    const year = new Date().getFullYear();
    const count = this.bookIssues.filter(i => i.mosqueId === mosqueId).length + 1;
    return `ISS-${year}-${String(count).padStart(6, '0')}`;
  }

  generateNextAcquisitionNumber(mosqueId: string): string {
    const year = new Date().getFullYear();
    const count = this.bookAcquisitions.filter(a => a.mosqueId === mosqueId).length + 1;
    return `ACQ-${year}-${String(count).padStart(6, '0')}`;
  }

  generateNextMemberCode(mosqueId: string): string {
    const count = this.libraryMembers.filter(m => m.mosqueId === mosqueId).length + 1;
    return `LIB-MEM-${String(count).padStart(4, '0')}`;
  }

  getLibraryDashboardStats(mosqueId: string): LibraryDashboardStats {
    const mosqueTitles = this.bookTitles.filter(t => t.mosqueId === mosqueId && t.status !== 'ARCHIVED');
    const mosqueCopies = this.bookCopies.filter(c => c.mosqueId === mosqueId && c.status !== 'ARCHIVED');
    const mosqueMembers = this.libraryMembers.filter(m => m.mosqueId === mosqueId);
    const mosqueIssues = this.bookIssues.filter(i => i.mosqueId === mosqueId);

    const todayStr = new Date().toISOString().split('T')[0];

    const totalTitles = mosqueTitles.length;
    const totalCopies = mosqueCopies.length;
    const availableCopies = mosqueCopies.filter(c => c.status === 'AVAILABLE').length;
    const issuedCopies = mosqueCopies.filter(c => c.status === 'ISSUED').length;
    const overdueCopies = mosqueCopies.filter(c => c.status === 'OVERDUE').length;
    const lostCopies = mosqueCopies.filter(c => c.status === 'LOST').length;
    const damagedCopies = mosqueCopies.filter(c => c.status === 'DAMAGED').length;
    const underRepairCopies = mosqueCopies.filter(c => c.status === 'UNDER_REPAIR').length;

    const totalMembers = mosqueMembers.length;
    const activeMembers = mosqueMembers.filter(m => m.status === 'ACTIVE').length;

    const todayIssuesCount = mosqueIssues.filter(i => i.issueDate === todayStr).length;
    const todayReturnsCount = mosqueIssues.filter(i => i.returnDate === todayStr).length;

    const recentIssues = mosqueIssues
      .sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime())
      .slice(0, 10);

    // Calculate popular books
    const issueCountByTitle: Record<string, number> = {};
    mosqueIssues.forEach(i => {
      const copy = mosqueCopies.find(c => c.id === i.bookCopyId);
      if (copy) {
        issueCountByTitle[copy.bookTitleId] = (issueCountByTitle[copy.bookTitleId] || 0) + 1;
      }
    });

    const popularBooks = Object.entries(issueCountByTitle)
      .map(([bookTitleId, issueCount]) => {
        const titleObj = mosqueTitles.find(t => t.id === bookTitleId);
        return {
          bookTitleId,
          title: titleObj?.title || 'অজ্ঞাত বই',
          author: titleObj?.author || 'অজ্ঞাত লেখক',
          issueCount,
        };
      })
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 5);

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies,
      overdueCopies,
      lostCopies,
      damagedCopies,
      underRepairCopies,
      totalMembers,
      activeMembers,
      todayIssuesCount,
      todayReturnsCount,
      recentIssues,
      popularBooks,
    };
  }

  // ==========================================
  // EDUCATION FOUNDATION HELPERS
  // ==========================================
  generateNextStudentId(mosqueId: string): string {
    const mosqueStudents = this.educationStudentProfiles.filter(s => s.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueStudents.forEach(s => {
      const match = s.studentId?.match(/^STU-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `STU-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextEnrollmentNumber(mosqueId: string): string {
    const year = new Date().getFullYear();
    const count = this.educationEnrollments.filter(e => e.mosqueId === mosqueId).length + 1;
    return `ENR-${year}-${String(count).padStart(6, '0')}`;
  }

  getEducationDashboardStats(mosqueId: string): EducationDashboardStats {
    const students = this.educationStudentProfiles.filter(s => s.mosqueId === mosqueId && s.status !== 'ARCHIVED');
    const enrollments = this.educationEnrollments.filter(e => e.mosqueId === mosqueId);
    const activeEnrollments = enrollments.filter(e => e.status === 'ACTIVE');
    const maktabEnrollments = activeEnrollments.filter(e => e.programType === 'MAKTAB');
    const hifzEnrollments = activeEnrollments.filter(e => e.programType === 'HIFZKHANA');
    const programs = this.educationPrograms.filter(p => p.mosqueId === mosqueId && p.status !== 'ARCHIVED');
    const levels = this.educationLevels.filter(l => l.mosqueId === mosqueId && l.status !== 'ARCHIVED');

    const teacherSet = new Set<string>();
    activeEnrollments.forEach(e => {
      if (e.teacherStaffId) teacherSet.add(e.teacherStaffId);
    });

    const recentEnrollments = enrollments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'ACTIVE').length,
      totalMaktabEnrollments: maktabEnrollments.length,
      totalHifzEnrollments: hifzEnrollments.length,
      totalPrograms: programs.length,
      totalLevels: levels.length,
      totalTeachersAssigned: teacherSet.size,
      recentEnrollments,
    };
  }

  // ==========================================
  // MAKTAB OPERATIONAL SUBSYSTEM HELPERS
  // ==========================================
  getMaktabDashboardStats(mosqueId: string): MaktabDashboardStats {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // Active students in mosque
    const activeMaktabEnrollments = this.educationEnrollments.filter(
      e => e.mosqueId === mosqueId && e.programType === 'MAKTAB' && e.status === 'ACTIVE'
    );
    const activeStudentIdSet = new Set(activeMaktabEnrollments.map(e => e.studentProfileId));
    const activeStudents = this.educationStudentProfiles.filter(
      s => s.mosqueId === mosqueId && s.status === 'ACTIVE' && (activeStudentIdSet.has(s.id) || activeStudentIdSet.size === 0)
    );

    // Today's attendance
    const todayAttendances = this.maktabAttendances.filter(a => a.mosqueId === mosqueId && a.date === today);
    const presentToday = todayAttendances.filter(a => a.status === 'PRESENT').length;
    const absentToday = todayAttendances.filter(a => a.status === 'ABSENT').length;
    const leaveToday = todayAttendances.filter(a => a.status === 'LEAVE').length;
    const lateToday = todayAttendances.filter(a => a.status === 'LATE').length;
    const totalTodayRecorded = todayAttendances.length;
    const attendanceRateToday = totalTodayRecorded > 0 ? Math.round(((presentToday + lateToday) / totalTodayRecorded) * 100) : 0;

    // Active classes
    const activeClasses = this.maktabClasses.filter(c => c.mosqueId === mosqueId && c.status === 'ACTIVE');

    // Active teachers assigned
    const activeTeacherAssignments = this.maktabTeacherAssignments.filter(t => t.mosqueId === mosqueId && t.status === 'ACTIVE');
    const teacherIdSet = new Set<string>();
    activeTeacherAssignments.forEach(t => teacherIdSet.add(t.staffId));
    activeClasses.forEach(c => {
      if (c.teacherStaffId) teacherIdSet.add(c.teacherStaffId);
    });

    // Fee totals
    const feeRecords = this.maktabFeeRecords.filter(f => f.mosqueId === mosqueId);
    const totalFeeDue = feeRecords.reduce((sum, f) => sum + (f.dueAmount || 0), 0);
    const currentMonthFeeCollected = feeRecords
      .filter(f => f.billingMonth === currentMonth)
      .reduce((sum, f) => sum + (f.paidAmount || 0), 0);

    // Recent progress records
    const recentProgressRecords = this.maktabProgressRecords
      .filter(p => p.mosqueId === mosqueId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Alerts
    const alerts: string[] = [];
    if (absentToday > 0) {
      alerts.push(`আজকে ${absentToday} জন শিক্ষার্থী অনুপস্থিত রয়েছে।`);
    }
    const unpaidCount = feeRecords.filter(f => f.status === 'UNPAID' || f.status === 'PARTIAL').length;
    if (unpaidCount > 0) {
      alerts.push(`সর্বমোট ${unpaidCount}টি ফি রেকর্ডে বকেয়া রয়েছে (৳ ${totalFeeDue.toLocaleString('bn-BD')})।`);
    }
    const unassignedClasses = activeClasses.filter(c => !c.teacherStaffId);
    if (unassignedClasses.length > 0) {
      alerts.push(`${unassignedClasses.length}টি সক্রিয় জামাতে কোনো উস্তাদ নির্ধারিত নেই।`);
    }

    return {
      totalActiveStudents: activeStudents.length,
      todayAttendanceTotal: totalTodayRecorded,
      presentToday,
      absentToday,
      leaveToday,
      lateToday,
      attendanceRateToday,
      totalClasses: activeClasses.length,
      activeTeachersCount: teacherIdSet.size,
      totalFeeDue,
      currentMonthFeeCollected,
      recentProgressRecords,
      alerts,
    };
  }

  getHifzLevels(mosqueId: string): HifzLevel[] {
    let levels = this.hifzLevels.filter(l => l.mosqueId === mosqueId && l.status !== 'ARCHIVED');
    if (levels.length === 0) {
      const starters = getStarterHifzLevels(mosqueId);
      this.hifzLevels.push(...starters);
      this.save();
      levels = starters;
    }
    return levels.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getHifzCurricula(mosqueId: string): HifzCurriculum[] {
    let curricula = this.hifzCurricula.filter(c => c.mosqueId === mosqueId && c.status !== 'ARCHIVED');
    if (curricula.length === 0) {
      const starters = getStarterHifzCurricula(mosqueId);
      this.hifzCurricula.push(...starters);
      this.save();
      curricula = starters;
    }
    return curricula;
  }

  generateNextHifzEnrollmentId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueEnrollments = this.hifzEnrollments.filter(e => e.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueEnrollments.forEach(e => {
      const match = e.enrollmentId?.match(/^HENR-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HENR-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzSabakId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueSabaks = this.hifzSabaks.filter(s => s.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueSabaks.forEach(s => {
      const match = s.sabakId?.match(/^SBK-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `SBK-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzSabakiId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueSabakis = this.hifzSabakis.filter(s => s.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueSabakis.forEach(s => {
      const match = s.sabakiId?.match(/^SBKI-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `SBKI-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzDaurCycleId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueCycles = this.hifzDaurCycles.filter(c => c.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueCycles.forEach(c => {
      const match = c.cycleId?.match(/^DCR-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `DCR-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzDaurId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueDaurs = this.hifzDaurs.filter(d => d.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueDaurs.forEach(d => {
      const match = d.daurId?.match(/^DUR-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `DUR-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzRevisionId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueRevisions = this.hifzRevisions.filter(r => r.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueRevisions.forEach(r => {
      const match = r.revisionId?.match(/^REV-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `REV-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzAttendanceId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueAtt = this.hifzAttendances.filter(a => a.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueAtt.forEach(a => {
      const match = a.attendanceId?.match(/^HAT-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HAT-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzUstadAssignmentId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueAssignments = this.hifzTeacherAssignments.filter(a => a.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueAssignments.forEach(a => {
      const match = a.assignmentId?.match(/^HUA-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HUA-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzResidenceId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueList = this.hifzResidences.filter(r => r.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueList.forEach(r => {
      const match = r.residenceId?.match(/^HRS-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HRS-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzResidenceBuildingId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueList = this.hifzResidenceBuildings.filter(b => b.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueList.forEach(b => {
      const match = b.buildingId?.match(/^HRB-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HRB-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzResidenceRoomId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueList = this.hifzResidenceRooms.filter(r => r.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueList.forEach(r => {
      const match = r.roomId?.match(/^HRM-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HRM-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzResidenceBedId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueList = this.hifzResidenceBeds.filter(b => b.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueList.forEach(b => {
      const match = b.bedId?.match(/^HRBD-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HRBD-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzResidentialAllocationId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueList = this.hifzResidentialAllocations.filter(a => a.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueList.forEach(a => {
      const match = a.allocationId?.match(/^HRA-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HRA-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateNextHifzResidentialTransferId(mosqueId: string): string {
    const year = new Date().getFullYear();
    const mosqueList = this.hifzResidentialTransfers.filter(t => t.mosqueId === mosqueId);
    let maxNum = 0;
    mosqueList.forEach(t => {
      const match = t.transferId?.match(/^HRT-\d{4}-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `HRT-${year}-${String(maxNum + 1).padStart(6, '0')}`;
  }

  generateAccountHeadCode(mosqueId: string, type: 'INCOME' | 'EXPENSE', parentId?: string | null): string {
    const prefix = type === 'INCOME' ? 'INC' : 'EXP';
    const mosqueHeads = this.accountHeads.filter(h => h.mosqueId === mosqueId && h.type === type);

    if (!parentId) {
      // Main head: INC-100, INC-200, INC-300 ...
      const mainHeads = mosqueHeads.filter(h => !h.parentId);
      let maxHundreds = 0;
      mainHeads.forEach(h => {
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
      while (this.accountHeads.some(h => h.mosqueId === mosqueId && h.code === candidate)) {
        counter += 100;
        candidate = `${prefix}-${counter}`;
      }
      return candidate;
    } else {
      // Sub-head: INC-101, INC-102, INC-103 ...
      const parent = this.accountHeads.find(h => h.id === parentId && h.mosqueId === mosqueId);
      let baseNumber = 100;
      if (parent && parent.code) {
        const parentMatch = parent.code.match(/^(?:INC|EXP)-(\d+)$/i);
        if (parentMatch) {
          baseNumber = parseInt(parentMatch[1], 10);
        }
      }
      const existingSubHeads = mosqueHeads.filter(h => h.parentId === parentId);
      let maxSubNum = baseNumber;
      existingSubHeads.forEach(h => {
        const match = h.code?.match(/^(?:INC|EXP)-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSubNum) maxSubNum = num;
        }
      });
      let nextNum = maxSubNum + 1;
      let candidate = `${prefix}-${nextNum}`;
      while (this.accountHeads.some(h => h.mosqueId === mosqueId && h.code === candidate)) {
        nextNum++;
        candidate = `${prefix}-${nextNum}`;
      }
      return candidate;
    }
  }

  getAccountHeadUsageCount(mosqueId: string, headId: string): { incomeCount: number; expenseCount: number; totalCount: number } {
    const incomeCount = this.incomeEntries.filter(
      i => i.mosqueId === mosqueId && (i.mainHeadId === headId || i.subHeadId === headId)
    ).length;
    const expenseCount = this.expenseEntries.filter(
      e => e.mosqueId === mosqueId && (e.mainHeadId === headId || e.subHeadId === headId)
    ).length;
    return {
      incomeCount,
      expenseCount,
      totalCount: incomeCount + expenseCount,
    };
  }
}

export const db = new DatabaseStore();


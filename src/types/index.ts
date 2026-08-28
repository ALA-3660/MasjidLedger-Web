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
  | 'MANAGE_CEMETERY'
  | 'VIEW_MEMBER_PERFORMANCE'
  | 'CREATE_EVALUATION'
  | 'EDIT_EVALUATION'
  | 'ADD_MEMBER_ACTIVITY'
  | 'UPDATE_RESPONSIBILITY_STATUS'
  | 'PRINT_PERFORMANCE_REPORT';

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
  committeeEvaluationSettings?: {
    weights: {
      attendance: number; // default 30%
      responsibility: number; // default 30%
      participation: number; // default 15%
      activity: number; // default 15%
      quality: number; // default 10%
    };
    starThresholds: {
      fiveStar: number; // default 90
      fourStar: number; // default 80
      threeStar: number; // default 70
      twoStar: number; // default 60
      oneStar: number; // default 0
    };
    excludeExcusedLeaveFromAttendance?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type MosqueProfile = Mosque;

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
  termId?: string;
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
  termId?: string;
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
  manualName?: string;
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

export type CommitteeTermStatus = 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

export interface CommitteeTerm {
  id: string;
  mosqueId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: CommitteeTermStatus;
  description?: string;
  membersCount?: number;
  openingBalance?: number;
  openingBalanceDate?: string;
  openingBalanceSource?: 'PREVIOUS_COMMITTEE_HANDOVER' | 'MANUAL' | 'INITIAL';
  previousTermId?: string;
  previousTermTitle?: string;
  closingBalance?: number;
  closingBalanceDate?: string;
  handoverBalance?: number;
  handoverRecipientTermId?: string;
  handoverRecipientName?: string;
  handoverDate?: string;
  handoverNotes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvalDate?: string;
  cashOpening?: number;
  cashInflow?: number;
  cashOutflow?: number;
  cashClosing?: number;
  bankOpening?: number;
  bankDeposits?: number;
  bankWithdrawals?: number;
  bankTransfers?: number;
  bankClosing?: number;
  actualHandoverBalance?: number;
  reconciliationDifference?: number;
  reconciliationNotes?: string;
  createdAt: string;
  updatedAt?: string;
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

export type MeetingStatus = 'DRAFT' | 'FINAL' | 'REVISED' | 'CANCELLED';

export interface MeetingAttendee {
  memberId?: string;
  name: string;
  designation: string;
  phone: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LEAVE';
  arrivalTime?: string;
  remarks?: string;
  signatureUrl?: string;
}

export interface ResponsibleMember {
  memberId?: string;
  name: string;
  designation?: string;
  roleDescription: string;
}

export interface MeetingRevision {
  revisionNo: number;
  revisionDate: string;
  revisedBy: string;
  revisedByName: string;
  reason: string;
  previousDecisions?: string[];
  createdAt: string;
}

export interface CommitteeMeetingNotice {
  id: string;
  mosqueId: string;
  memoNo: string;
  serialNumber: string;
  noticeDate: string;
  meetingDate: string;
  dayName: string;
  time: string;
  venue: string;
  meetingType?: string;
  meetingTypeBn?: string;
  agendas: string[];
  remarks?: string;
  status: 'ISSUED' | 'CONVERTED_TO_MINUTES' | 'CANCELLED';
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}

export interface MeetingAgendaItem {
  id: string;
  agendaNumber: number;
  title: string;
  discussion?: string; // বিস্তারিত আলোচনা
}

export interface MeetingDecisionItem {
  id: string;
  decisionNumber: string; // e.g. "সিদ্ধান্ত-১"
  agendaId?: string;
  agendaTitle?: string;
  details: string; // সিদ্ধান্তের বিস্তারিত
  assignedMemberId?: string;
  assignedMemberName?: string;
  assignedMemberDesignation?: string;
  deadline?: string; // বাস্তবায়নের সময়সীমা
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  remarks?: string;
  resolutionId?: string; // Link to MeetingResolution
  resolutionNumber?: string;
}

export interface MeetingAssignedTask {
  id: string;
  taskDescription: string;
  assignedMemberId?: string;
  assignedMemberName: string;
  assignedMemberDesignation?: string;
  startDate?: string;
  endDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_COMPLETED';
  notes?: string;
}

export type ResolutionStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED' | 'CANCELLED';
export type ResolutionType = 'INDIVIDUAL' | 'COMBINED';
export type ResolutionImplementationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';

export type CommitteeActionPlanStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
export type CommitteeActionPlanPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL';

export interface CommitteeActionPlanAttachment {
  id: string;
  name: string;
  url: string;
  type: 'BEFORE_PHOTO' | 'DURING_PHOTO' | 'AFTER_PHOTO' | 'BILL' | 'INVOICE' | 'DOCUMENT' | 'OTHER';
  typeBn?: string;
  fileSize?: number;
  uploadedAt: string;
  uploadedBy?: string;
  uploadedByName?: string;
}

export interface CommitteeActionPlanActivityLog {
  id: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'STATUS_CHANGE'
    | 'ASSIGN_MEMBER'
    | 'PROGRESS_UPDATE'
    | 'BUDGET_UPDATE'
    | 'MARK_COMPLETED'
    | 'CANCEL'
    | 'ARCHIVE'
    | 'ATTACH_DOCUMENT'
    | string;
  details: string;
  changedBy: string;
  changedByName: string;
  timestamp: string;
  previousState?: string;
  newState?: string;
}

export interface CommitteeActionPlan {
  id: string;
  mosqueId: string;
  planNumber: string; // e.g. "AP-2026-001"
  termId: string;
  termTitle?: string;
  title: string; // কাজের নাম
  description?: string; // কাজের বিস্তারিত বিবরণ
  category: string; // কাজের বিভাগ
  priority: CommitteeActionPlanPriority; // 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL'

  // Responsible & Assistant Members
  responsibleMemberId?: string;
  responsibleMemberName?: string;
  responsibleMemberDesignation?: string;
  responsibleMemberPhone?: string;
  responsibleMemberIds?: string[];
  responsibleMembers?: Array<{
    id: string;
    name: string;
    designation?: string;
    phone?: string;
  }>;
  assistantMemberIds?: string[];
  assistantMembers?: Array<{
    id: string;
    name: string;
    designation?: string;
    phone?: string;
  }>;

  // Timeline
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  completedDate?: string; // YYYY-MM-DD

  // Budget & Financials
  estimatedBudget: number; // আনুমানিক বাজেট
  actualCost: number; // প্রকৃত ব্যয়
  fundingSource?: string; // অর্থের উৎস / Account
  fundingAccountId?: string;
  fundingAccountName?: string;
  financialVoucherNumber?: string;

  // Status & Progress
  status: CommitteeActionPlanStatus; // 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'
  progressPercentage: number; // 0 - 100
  remarks?: string;

  // Resolution Linkage
  resolutionId?: string;
  resolutionNumber?: string;
  resolutionSubject?: string;
  meetingId?: string;
  meetingNumber?: string;
  decisionNumber?: string;

  // Attachments & History
  attachments?: CommitteeActionPlanAttachment[];
  activityLogs?: CommitteeActionPlanActivityLog[];

  // Soft delete & Archive
  isArchived?: boolean;
  isDeleted?: boolean;

  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionDecisionEntry {
  id: string;
  decisionId?: string;
  decisionNumber: string; // e.g. "সিদ্ধান্ত-১"
  subject: string; // বিষয়
  details: string; // বিস্তারিত
  background?: string; // পটভূমি
  consideration?: string; // বিবেচনা ও সভার আলোচনা
  proposal?: string; // প্রস্তাবনা
  proposerName?: string; // প্রস্তাবক
  supporterName?: string; // সমর্থনকারী
  resolutionText: string; // গৃহীত সিদ্ধান্ত / চূড়ান্ত রেজোলিউশন
  assignedMemberId?: string; // দায়িত্বপ্রাপ্ত
  assignedMemberName?: string;
  assignedMemberDesignation?: string;
  assignedMemberPhone?: string;
  taskDescription?: string; // দায়িত্বের বিবরণ
  deadline?: string; // বাস্তবায়নের সময়সীমা
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  implementationStatus?: ResolutionImplementationStatus;
  progressPercentage?: number; // 0 - 100
  completionDate?: string;
  financialAmount?: number;
  remarks?: string;
}

export interface ResolutionRevision {
  revisionNo: number;
  revisionDate: string;
  revisedBy: string;
  revisedByName: string;
  reason: string;
  previousContent?: Partial<MeetingResolution>;
  createdAt: string;
}

export interface MeetingResolution {
  id: string;
  mosqueId: string;
  resolutionNumber: string; // e.g. "RES-MJMWS-2026/001" or "RES-2026-001"
  resolutionType?: ResolutionType; // 'INDIVIDUAL' | 'COMBINED'
  meetingId: string; // Link to CommitteeMeeting
  meetingDocumentNumber?: string;
  meetingNumber?: string;
  meetingMemoNumber?: string;
  meetingDate?: string;
  meetingDayName?: string;
  meetingTime?: string;
  meetingType?: string;
  meetingTypeBn?: string;
  meetingVenue?: string;
  meetingChairman?: string;
  meetingSecretary?: string;
  meetingConductor?: string;
  meetingAgendas?: string[];

  // Link to specific agenda or decision in meeting
  agendaId?: string;
  agendaTitle?: string;
  decisionId?: string;
  decisionNumber?: string;
  decisionIds?: string[]; // Multiple linked decisions
  items?: ResolutionDecisionEntry[]; // Selected decision items in combined resolution

  date: string; // YYYY-MM-DD
  subject: string; // বিষয়
  background?: string; // প্রেক্ষাপট
  consideration?: string; // বিবেচনা ও বিস্তারিত আলোচনা
  proposal?: string; // প্রস্তাবনা
  proposerName?: string; // প্রস্তাবক
  supporterName?: string; // সমর্থনকারী
  resolutionText: string; // গৃহীত সিদ্ধান্ত / রেজোলিউশন

  assignedMemberId?: string;
  assignedMemberName?: string;
  assignedMemberDesignation?: string;
  assignedMemberPhone?: string;
  taskDescription?: string;
  deadline?: string; // বাস্তবায়নের সময়সীমা

  status: ResolutionStatus;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  implementationStatus?: ResolutionImplementationStatus;
  progressPercentage?: number; // 0 - 100
  completionDate?: string;
  financialAmount?: number;
  termId?: string;
  termTitle?: string;
  remarks?: string;

  presidentSignatureUrl?: string;
  secretarySignatureUrl?: string;

  // Revision & Audit
  isRevised?: boolean;
  revisionNumber?: number;
  revisionReason?: string;
  revisionHistory?: ResolutionRevision[];
  auditLogs?: {
    id: string;
    action: string;
    details?: string;
    userName: string;
    timestamp: string;
  }[];

  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommitteeMeeting {
  id: string;
  mosqueId: string;
  documentNumber?: string; // e.g. "MM-2026-0001"
  meetingNumber: string; // e.g. "MEET-01" or "১"
  memoNumber?: string; // e.g. "MJMWS-26/08/26/0001"
  meetingNoticeId?: string; // Relation to CommitteeMeetingNotice if created from one
  noticeDate?: string;
  date: string; // YYYY-MM-DD
  dayName?: string; // e.g. "শুক্রবার"
  time: string; // e.g. "বাদ মাগরিব" or "06:30 PM"
  closingTime?: string; // e.g. "08:30 PM"
  endTime?: string;
  location: string;
  meetingType?: 'GENERAL' | 'MONTHLY' | 'EMERGENCY' | 'SPECIAL' | 'ANNUAL' | 'OTHER' | string;
  meetingTypeBn?: string;
  
  // Leadership
  conductor?: string; // মিটিং পরিচালনাকারী
  conductorMemberId?: string;
  chairman: string; // সভাপতিত্বকারী
  chairmanMemberId?: string;
  chairmanDesignation?: string;
  secretary?: string; // মোতাওয়াল্লী / সেক্রেটারী
  secretaryMemberId?: string;
  duaLeader?: string; // মোনাজাত পরিচালনাকারী
  duaLeaderMemberId?: string;

  // Content (Structured & Backward-compatible arrays)
  agenda: string[];
  agendaItems?: MeetingAgendaItem[];
  decisions: string[];
  decisionItems?: MeetingDecisionItem[];
  resolutions: string[];
  miscellaneous?: string; // বিবিধ (optional)

  // Assigned Members / Tasks
  responsibleMembers?: ResponsibleMember[];
  assignedTasks?: MeetingAssignedTask[];

  // Attendance
  attendees?: MeetingAttendee[];
  membersPresent: string[]; // backward compat string array
  membersAbsent: string[]; // backward compat string array

  // Signatures snapshot
  presidentSignatureUrl?: string;
  secretarySignatureUrl?: string;

  // System & Status
  status?: MeetingStatus;
  resolutionNumber?: string;
  notes?: string;
  
  // Revisions & Audit
  isRevised?: boolean;
  revisionNumber?: number;
  revisionReason?: string;
  originalDocumentNumber?: string;
  revisionHistory?: MeetingRevision[];
  actionItems?: {
    task: string;
    assigneeName: string;
    assigneeDesignation?: string;
    deadline?: string;
  }[];
  auditLogs?: {
    id: string;
    action: string;
    details?: string;
    userName: string;
    timestamp: string;
  }[];
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CommitteeActivityType =
  | 'MOSQUE_DEVELOPMENT' // মসজিদ উন্নয়ন কাজ
  | 'DONATION_COLLECTION' // দান সংগ্রহ
  | 'ACCOUNTS_AUDIT_SUPPORT' // হিসাব/অডিট সহযোগিতা
  | 'SOCIAL_ACTIVITY' // সামাজিক কার্যক্রম
  | 'CEMETERY_MANAGEMENT' // কবরস্থান ব্যবস্থাপনা
  | 'WAQF_MANAGEMENT' // ওয়াকফ সম্পত্তি ব্যবস্থাপনা
  | 'ADMINISTRATIVE_WORK' // কমিটির প্রশাসনিক কাজ
  | 'MEETING_ORGANIZATION' // সভা আয়োজন
  | 'EMERGENCY_DUTY' // জরুরি দায়িত্ব
  | 'AGENDA_DISCUSSION' // এজেন্ডা আলোচনা
  | 'PROPOSAL_SUBMITTED' // প্রস্তাব উপস্থাপন
  | 'DECISION_CONTRIBUTION' // সিদ্ধান্ত বাস্তবায়নে ভূমিকা
  | 'MEETING_PRESENTATION' // মিটিং উপস্থাপনা
  | 'OTHER'; // অন্যান্য

export type CommitteeActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type EvaluationQualityRating = 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT';

export interface CommitteeMemberActivity {
  id: string;
  mosqueId: string;
  termId: string;
  memberId: string;
  memberName: string;
  memberDesignation?: string;
  activityType: CommitteeActivityType;
  activityTypeBn: string;
  category: 'MEETING_PARTICIPATION' | 'COMMITTEE_ACTIVITY' | 'ASSIGNED_TASK';
  title: string;
  description: string;
  date: string;
  relatedMeetingId?: string;
  relatedMeetingTitle?: string;
  assignedBy?: string;
  assignedByName?: string;
  status: CommitteeActivityStatus;
  qualityRating?: EvaluationQualityRating;
  qualityScore?: number; // 0 - 100
  evidenceAttachmentUrl?: string;
  evidenceAttachmentName?: string;
  evaluatorNote?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CommitteeTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export interface CommitteeMemberTask {
  id: string;
  mosqueId: string;
  termId: string;
  memberId: string;
  memberName: string;
  memberDesignation?: string;
  taskTitle: string;
  description?: string;
  meetingId?: string;
  meetingNumber?: string;
  assignedDate: string;
  dueDate?: string;
  completedDate?: string;
  status: CommitteeTaskStatus;
  qualityRating?: EvaluationQualityRating;
  qualityScore?: number; // 0 - 100
  evidenceAttachmentUrl?: string;
  evidenceAttachmentName?: string;
  evaluatorNote?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type EvaluationRecommendation =
  | 'EXCELLENT'
  | 'GOOD'
  | 'SATISFACTORY'
  | 'NEEDS_IMPROVEMENT'
  | 'REVIEW_REQUIRED';

export interface CommitteeManualEvaluation {
  id: string;
  mosqueId: string;
  termId: string;
  memberId: string;
  memberName: string;
  memberDesignation?: string;
  evaluationPeriodType: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  fromDate: string;
  toDate: string;
  overallAssessment?: string;
  strengths?: string;
  weaknesses?: string;
  improvementRequired?: string;
  recommendation: EvaluationRecommendation;
  evaluatorComment?: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  manualOverrideScore?: number;
  overrideReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MemberEvaluationScoreResult {
  memberId: string;
  memberName: string;
  position: string;
  positionCustomBn?: string;
  phone: string;
  termId: string;
  termTitle?: string;
  joinDate?: string;
  status: string;
  photoUrl?: string;
  address?: string;
  
  // Attendance metrics
  totalMeetings: number;
  presentMeetings: number;
  absentMeetings: number;
  leaveMeetings: number;
  attendancePercentage: number; // 0 - 100
  attendanceWeight: number;
  attendanceWeightedContribution: number;
  
  // Responsibility / Task metrics
  totalAssignedTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  taskCompletionPercentage: number; // 0 - 100
  taskWeight: number;
  taskWeightedContribution: number;
  
  // Meeting Participation metrics
  meetingParticipationCount: number;
  meetingParticipationScore: number; // 0 - 100
  participationWeight: number;
  participationWeightedContribution: number;
  
  // Other Committee Activities metrics
  otherActivitiesCount: number;
  completedActivitiesCount: number;
  activityScore: number; // 0 - 100
  activityWeight: number;
  activityWeightedContribution: number;
  
  // Quality metrics
  qualityEvaluatedCount: number;
  qualityAverageScore: number; // 0 - 100
  qualityWeight: number;
  qualityWeightedContribution: number;
  
  // Final Score & Stars
  finalScore: number; // 0 - 100
  rawScore: number;
  isManuallyOverridden?: boolean;
  manualOverrideScore?: number;
  overrideReason?: string;
  starRating: number; // 1 - 5
  performanceLevel: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT';
  performanceLevelBn: string;
  
  // Evaluation Status & Manual info
  lastEvaluationDate?: string;
  evaluationStatus: 'EVALUATED' | 'AUTO_CALCULATED' | 'PENDING';
  manualEvaluation?: CommitteeManualEvaluation;
  
  // Breakdown history for trends
  monthlyTrend?: {
    month: string;
    monthBn: string;
    score: number;
    attendance: number;
    taskCompletion: number;
  }[];
}

export interface SalaryHistoryEntry {
  id: string;
  effectiveDate: string; // YYYY-MM-DD
  previousSalary?: number;
  newSalary: number;
  allowance?: number;
  incrementAmount?: number;
  reason?: string;
  changedBy?: string;
  changedByName?: string;
  revisedBy?: string;
  revisedByName?: string;
  revisedAt?: string;
  createdAt: string;
}

export type StaffEmploymentType = 'PERMANENT' | 'CONTRACTUAL' | 'PART_TIME' | 'TEMPORARY';

export interface Staff {
  id: string;
  mosqueId: string;
  name: string;
  fullNameBn?: string;
  staffCode?: string;
  nid: string;
  phone: string;
  designation: 'IMAM' | 'MUEZZIN' | 'KHATIB' | 'TEACHER' | 'CLEANER' | 'SECURITY' | 'OTHER';
  designationBn: string;
  employmentType?: StaffEmploymentType;
  employmentTypeBn?: string;
  address?: string;
  presentAddress?: string;
  permanentAddress?: string;
  joiningDate: string;
  resignationDate?: string;
  terminationDate?: string;
  educationQualification?: string;
  monthlySalary: number;
  allowance: number;
  salaryEffectiveDate?: string;
  salaryHistory?: SalaryHistoryEntry[];
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  notes?: string;
  photoUrl?: string;
  signatureUrl?: string;
  // Bank Account Information
  bankName?: string;
  branchName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: 'SAVINGS' | 'CURRENT' | 'SALARY' | string;
  bankStatus?: 'ACTIVE' | 'INACTIVE' | 'VERIFIED' | 'PENDING';
  createdAt: string;
  updatedAt?: string;
}

export type StaffBankPaymentType = 'SALARY' | 'FESTIVAL_ALLOWANCE' | 'BONUS' | 'SPECIAL_ALLOWANCE' | 'OTHER';

export interface StaffBankTransferLetterItem {
  staffId: string;
  staffName: string;
  designation?: string;
  designationBn: string;
  bankName: string;
  branchName: string;
  accountHolderName?: string;
  accountNumber: string;
  routingNumber?: string;
  basicSalary?: number;
  bonus?: number;
  allowance?: number;
  deduction?: number;
  netPayable: number;
  paymentId?: string;
  notes?: string;
}

export interface StaffBankTransferLetter {
  id: string;
  mosqueId: string;
  memoNumber: string;
  runningSerial: number;
  letterDate: string; // YYYY-MM-DD
  paymentType: StaffBankPaymentType;
  paymentTypeCustomBn?: string;
  paymentMonth: string; // e.g. "2026-08" or "আগস্ট-২০২৬"
  paymentYear: number;
  selectionScope: 'ALL' | 'SELECTED';
  staffCount: number;
  totalAmount: number;
  totalAmountInWordsBn: string;
  bankName: string;
  branchName: string;
  bankAddress?: string;
  mosqueBankAccountId?: string;
  mosqueBankAccountName: string;
  mosqueBankAccountNumber: string;
  subject: string;
  bodyParagraph: string;
  declarationText: string;
  items: StaffBankTransferLetterItem[];
  relatedPaymentIds?: string[];
  termId?: string;
  termTitle?: string;
  status: 'FINAL' | 'CANCELLED';
  showLetterhead?: boolean;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffPayment {
  id: string;
  mosqueId: string;
  staffId: string;
  staffName: string;
  designationBn: string;
  month: string; // YYYY-MM
  paymentDate: string;
  paymentType?: 'REGULAR_SALARY' | 'BONUS' | 'FESTIVAL_ALLOWANCE' | 'SPECIAL_ALLOWANCE' | 'OTHER';
  festivalName?: string;
  basicSalary: number;
  bonus?: number;
  otherAllowance?: number;
  allowance: number; // backward compatibility (bonus + otherAllowance)
  deduction: number;
  advanceDeduction?: number;
  totalPayable?: number; // basicSalary + bonus + otherAllowance
  netPaid: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  accountNameBn?: string;
  expenseVoucherNumber?: string;
  expenseEntryId?: string;
  notes?: string;
  status?: 'PAID' | 'CANCELLED';
  termId?: string;
  staffSignatureUrl?: string;
  receivedByConfirmation?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type AssetCategory =
  | 'GENERATOR'
  | 'FAN'
  | 'AC'
  | 'REFRIGERATOR'
  | 'DEEP_FREEZER'
  | 'SOUND_SYSTEM'
  | 'CCTV'
  | 'COMPUTER_ICT'
  | 'FURNITURE'
  | 'ELECTRICAL'
  | 'WATER_WUDU'
  | 'CONSTRUCTION'
  | 'RELIGIOUS'
  | 'BUILDING'
  | 'LAND'
  | 'ELECTRONICS'
  | 'OTHER'
  | string;

export type AssetCondition =
  | 'GOOD'
  | 'NEEDS_REPAIR'
  | 'OUT_OF_ORDER'
  | 'LOST'
  | 'DISPOSED'
  | 'FAIR'
  | 'POOR'
  | 'DAMAGED';

export interface AssetServiceRecord {
  id: string;
  serviceDate: string;
  serviceType: 'REGULAR_MAINTENANCE' | 'REPAIR' | 'PARTS_REPLACEMENT' | 'INSPECTION' | 'OTHER';
  serviceTypeBn?: string;
  servicedBy?: string;
  cost: number;
  expenseVoucherNumber?: string;
  expenseEntryId?: string;
  description: string;
  nextServiceDate?: string;
  performedBy?: string;
  createdAt: string;
}

export interface AssetAttachment {
  id: string;
  name: string;
  url: string;
  type: 'PHOTO' | 'INVOICE' | 'WARRANTY_CARD' | 'MANUAL' | 'DOCUMENT' | 'OTHER';
  fileSize?: number;
  uploadedAt: string;
}

export interface MosqueAsset {
  id: string;
  mosqueId: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  categoryBn?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate: string;
  purchaseValue: number;
  currentValue: number;
  location: string;
  responsiblePerson?: string;
  responsiblePersonPhone?: string;
  condition: AssetCondition;
  conditionBn?: string;
  nextServiceDate?: string;
  warrantyInfo?: string;
  supplier?: string;
  sourceOfPurchase?: string;
  notes?: string;
  description?: string;
  photoUrl?: string;
  attachments?: AssetAttachment[];
  serviceHistory?: AssetServiceRecord[];
  
  // Accounting & Expense Linkage
  expenseVoucherNumber?: string;
  expenseEntryId?: string;
  isExpenseLinked?: boolean;

  // Committee Term Linkage
  termId?: string;
  termTitle?: string;

  // Lifecycle & Status
  isArchived?: boolean;
  isDeleted?: boolean;
  isDemo?: boolean;

  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
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

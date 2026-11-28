/**
 * MasjidLedger Pro v2.6 — Agreement Management (চুক্তিপত্র ব্যবস্থাপনা) Types
 * Part 1: Core Structure, Multi-Party & Representatives, Dynamic Forms, Written Clauses & PDF
 *
 * STRICT POLICY:
 * - Zero Financial Engine / Ledger / Voucher / Receipt integration.
 * - Written payment terms are contract clauses only (text/document records).
 * - Multi-tenant isolated by `mosqueId` / `tenantId`.
 */

export type AgreementStatus =
  | 'DRAFT'
  | 'INFORMATION_PENDING'
  | 'AI_REVIEWED'
  | 'UNDER_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PENDING_SIGNATURE'
  | 'PARTIALLY_SIGNED'
  | 'FULLY_SIGNED'
  | 'EFFECTIVE'
  | 'ACTIVE' // Legacy alias kept for Part 1-2 backward compatibility (treated as EFFECTIVE)
  | 'COMPLETED'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'CANCELLED';

export type AgreementPermissionKey =
  | 'agreement.view'
  | 'agreement.create'
  | 'agreement.edit'
  | 'agreement.delete'
  | 'agreement.review'
  | 'agreement.approve'
  | 'agreement.reject'
  | 'agreement.manage_parties'
  | 'agreement.upload_documents'
  | 'agreement.view_sensitive_documents'
  | 'agreement.manage_templates'
  | 'agreement.use_ai'
  | 'agreement.sign'
  | 'agreement.manage_signatures'
  | 'agreement.view_reports'
  | 'agreement.manage_waqf_review';

export type BuiltInAgreementCategoryCode =
  | 'CONSTRUCTION'
  | 'LAND_PROPERTY'
  | 'WAQF_PROPERTY'
  | 'ROAD_RIGHT_OF_WAY'
  | 'PROCUREMENT_SUPPLY'
  | 'LABOR_WAGE'
  | 'SERVICE_PROVISION'
  | 'RENTAL_USAGE'
  | 'REPAIR_MAINTENANCE'
  | 'MUTUAL_COOPERATION'
  | 'SETTLEMENT_MOU'
  | 'RESPONSIBILITY_SHARING'
  | 'OTHER_CUSTOM';

export type AgreementCategoryCode = BuiltInAgreementCategoryCode | string;

export type AgreementPartyType =
  | 'MOSQUE_COMMITTEE'
  | 'INDIVIDUAL'
  | 'CONTRACTOR_FIRM'
  | 'ORGANIZATION'
  | 'WAQF_TRUST'
  | 'LOCAL_COMMUNITY'
  | 'OTHER';

export interface AgreementRepresentative {
  id: string;
  linkedPartyId?: string;
  linkedPartyCode?: string;
  name: string;
  designation: string;
  phone?: string;
  nid?: string;
  /** প্রতিনিধিত্বের ক্ষমতার ভিত্তি (যেমন: পরিচালনা কমিটির রেজুলেশন নং ও তারিখ / অনুমোদনপত্র / পাওয়ার অব অ্যাটর্নি) */
  authorityBasis: string;
  isSignatory: boolean;
}

export interface AgreementParty {
  id: string;
  linkedPartyId?: string;
  linkedPartyCode?: string;
  /** পক্ষের অবস্থান: প্রথম পক্ষ / দ্বিতীয় পক্ষ / তৃতীয় পক্ষ ইত্যাদি */
  roleLabel: string;
  roleOrder: number;
  partyType: AgreementPartyType;
  name: string;
  fatherOrOrgHead?: string;
  address?: string;
  phone?: string;
  nidOrRegNo?: string;
  representatives: AgreementRepresentative[];
}

export interface AgreementWitness {
  id: string;
  name: string;
  fatherName?: string;
  address?: string;
  phone?: string;
  nid?: string;
  partySide?: string;
}

export interface AgreementConstructionDetails {
  workSummary?: string;
  length?: string;
  width?: string;
  height?: string;
  dimensionUnit?: string;
  quantity?: string;
  quantityUnit?: string;
  unitRate?: string;
  /** লিখিত মোট চুক্তিমূল্য — শুধুমাত্র চুক্তিপত্রের লিখিত ধারা (কোনো অ্যাকাউন্টিং এন্ট্রি নয়) */
  totalContractValueText?: string;
  materialsResponsibility?: string;
  laborResponsibility?: string;
  timelineDuration?: string;
  completionDeadline?: string;
  qualityInspectionTerms?: string;
  handoverTerms?: string;
}

export interface AgreementLandWaqfDetails {
  mouza?: string;
  jlNumber?: string;
  khatianNumber?: string;
  dagNumber?: string;
  landArea?: string;
  landAreaUnit?: string;
  proposedPortionDesc?: string;
  roadLength?: string;
  roadWidth?: string;
  roadUnit?: string;
  partyContributions?: string;
  /** ওয়াকফ / আইনি পর্যালোচনা সতর্কতা */
  waqfLegalReviewRequired: boolean;
  waqfLegalCautionAcknowledged: boolean;
  waqfLegalReviewNote?: string;
}

export type WrittenPaymentMode = 'NON_FINANCIAL' | 'LUMP_SUM' | 'INSTALLMENT';

export interface AgreementPaymentScheduleItem {
  id: string;
  stageTitle: string;
  condition: string;
  timingOrMilestone: string;
  /** লিখিত টাকার অঙ্ক (শুধুমাত্র চুক্তির লিখিত শর্ত, লেনদেন বা বকেয়া হিসাব নয়) */
  writtenAmount: string;
  notes?: string;
}

export interface AgreementWrittenFinancialTerms {
  mode: WrittenPaymentMode;
  totalWrittenAmount?: string;
  paymentTermsNote?: string;
  schedules: AgreementPaymentScheduleItem[];
}

export interface AgreementAttachmentRef {
  id: string;
  title: string;
  docType?: string;
  referenceNo?: string;
  url?: string;
  notes?: string;
  addedAt: string;
}

export interface AgreementCategoryDef {
  id: string;
  code: AgreementCategoryCode;
  mosqueId?: string; // undefined for built-in system categories
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  formProfile: 'STANDARD' | 'CONSTRUCTION' | 'LAND_WAQF' | 'ROAD_RIGHT';
  isSystem: boolean;
  sortOrder: number;
  createdAt?: string;
  createdBy?: string;
}

export type AgreementTemplatePublishStatus = 'DRAFT' | 'PUBLISHED';

export interface AgreementTemplateDef {
  id: string;
  mosqueId?: string; // undefined for built-in templates
  titleBn: string;
  categoryCode: AgreementCategoryCode;
  descriptionBn: string;
  defaultPurpose?: string;
  defaultGeneralClauses: string;
  defaultSpecialClauses?: string;
  defaultTerminationClause?: string;
  defaultDisputeResolutionClause?: string;
  defaultWrittenFinancialMode?: WrittenPaymentMode;
  defaultConstructionDetails?: Partial<AgreementConstructionDetails>;
  defaultLandWaqfDetails?: Partial<AgreementLandWaqfDetails>;
  isSystem: boolean;
  publishStatus?: AgreementTemplatePublishStatus;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface AgreementRecord {
  id: string;
  mosqueId: string;
  tenantId: string;
  agreementNumber: string;
  title: string;
  categoryCode: AgreementCategoryCode;
  categoryNameBn: string;
  status: AgreementStatus;
  agreementDate: string; // YYYY-MM-DD
  effectiveDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  durationText?: string;
  executionPlace?: string;
  purpose: string;
  parties: AgreementParty[];
  constructionDetails?: AgreementConstructionDetails;
  landWaqfDetails?: AgreementLandWaqfDetails;
  writtenFinancialTerms: AgreementWrittenFinancialTerms;
  generalClauses: string;
  specialClauses?: string;
  terminationClause?: string;
  disputeResolutionClause?: string;
  witnesses: AgreementWitness[];
  attachments: AgreementAttachmentRef[];
  templateIdUsed?: string;
  isWaqfOrLandRelated: boolean;
  // Part 3: Approval Workflow, Digital Signatures, Versioning, Amendments & Archive
  versionNumber?: number;
  currentDocumentHash?: string;
  enforceSigningOrder?: boolean;
  isAmendment?: boolean;
  amendmentNumber?: number;
  parentAgreementId?: string;
  parentAgreementNumber?: string;
  waqfLegalReviewStatus?: 'NOT_REQUIRED' | 'PENDING' | 'CLEARED' | 'REJECTED';
  reviewRecords?: AgreementReviewRecord[];
  approvalRecords?: AgreementApprovalRecord[];
  signatures?: AgreementSignatureRecord[];
  witnessSignatures?: AgreementWitnessSignatureRecord[];
  signatureAuditTrail?: AgreementSignatureAuditEvent[];
  versionHistory?: AgreementVersionSnapshot[];
  closureInfo?: AgreementClosureInfo;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedByName?: string;
  archiveNote?: string;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Count-only dashboard stats — strictly ZERO financial totals, balances, or due sums.
 */
export interface AgreementDashboardStats {
  total: number;
  byStatus: Record<AgreementStatus, number>;
  waqfAndLandCount: number;
  waqfPendingReviewCount?: number;
  constructionCount: number;
  partiesCount: number;
  templatesCount: number;
  categoriesCount: number;
  archivedCount?: number;
  expiringSoonCount?: number;
  fullySignedOrEffectiveCount?: number;
  byCategory: Array<{
    code: string;
    nameBn: string;
    count: number;
  }>;
  recentAgreements: AgreementRecord[];
}

export interface AgreementPartyDirectoryItem {
  partyKey: string;
  name: string;
  partyType: AgreementPartyType;
  phone?: string;
  address?: string;
  nidOrRegNo?: string;
  rolesUsed: string[];
  representatives: AgreementRepresentative[];
  agreements: Array<{
    agreementId: string;
    agreementNumber: string;
    title: string;
    status: AgreementStatus;
    agreementDate: string;
    roleLabel: string;
  }>;
}

// ==========================================
// PART 2: AI AGREEMENT ASSISTANT, CLAUSE ASSISTANT, RISK REVIEW & ZERO-STORAGE OCR
// ==========================================

export interface AgreementAiDraftResult {
  detectedCategoryCode: AgreementCategoryCode;
  detectedCategoryNameBn: string;
  title: string;
  purpose: string;
  durationText?: string;
  parties: Array<{
    roleLabel: string;
    partyType: AgreementPartyType;
    name: string;
    address?: string;
    phone?: string;
    nidOrRegNo?: string;
    representatives: Array<{
      name: string;
      designation: string;
      authorityBasis: string;
      isSignatory: boolean;
    }>;
  }>;
  constructionDetails?: Partial<AgreementConstructionDetails>;
  landWaqfDetails?: Partial<AgreementLandWaqfDetails>;
  writtenFinancialTerms: {
    mode: WrittenPaymentMode;
    totalWrittenAmount?: string;
    paymentTermsNote?: string;
    schedules: Array<{
      stageTitle: string;
      condition: string;
      timingOrMilestone: string;
      writtenAmount: string;
    }>;
  };
  generalClauses: string;
  specialClauses?: string;
  terminationClause?: string;
  disputeResolutionClause?: string;
  /** অনুপস্থিত তথ্যের প্রশ্ন ও পেন্ডিং তালিকা — AI কখনো বানিয়ে লিখবে না */
  missingInfoQuestions: string[];
  safetyNoticeBn: string;
  modelUsed: string;
  generatedAt: string;
}

export type AgreementClauseAssistAction =
  | 'ADD_CLAUSE'
  | 'CLARIFY_TERMS'
  | 'FORMAL_BANGLA'
  | 'SIMPLE_BANGLA'
  | 'SEPARATE_RESPONSIBILITIES'
  | 'IDENTIFY_WEAKNESSES';

export interface AgreementClauseAssistResult {
  action: AgreementClauseAssistAction;
  revisedClauses: string;
  summaryBn: string;
  weaknessesDetected: string[];
  suggestedAdditions: string[];
  safetyNoticeBn: string;
  modelUsed: string;
  generatedAt: string;
}

export type AgreementRiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AgreementReviewFinding {
  id: string;
  severity: AgreementRiskSeverity;
  area:
    | 'PARTY_IDENTITY'
    | 'REPRESENTATIVE_AUTHORITY'
    | 'WORK_SCOPE'
    | 'ARITHMETIC_CONSISTENCY'
    | 'DATE_TIMELINE'
    | 'CLAUSE_CLARITY'
    | 'WAQF_LAND_LEGAL'
    | 'MISSING_INFO';
  titleBn: string;
  detailBn: string;
  suggestionBn: string;
}

export interface AgreementAiReviewResult {
  overallRiskLevel: AgreementRiskSeverity;
  legalReviewRequired: boolean;
  summaryBn: string;
  mathConsistencyCheck: {
    checked: boolean;
    totalParsed: number | null;
    installmentsSumParsed: number | null;
    isConsistent: boolean | null;
    noteBn: string;
  };
  findings: AgreementReviewFinding[];
  missingPlaceholders: string[];
  disclaimerBn: string;
  modelUsed: string;
  generatedAt: string;
}

export type AgreementOcrDocType =
  | 'NID'
  | 'PASSPORT'
  | 'TRADE_LICENSE'
  | 'LAND_DEED_KHATIAN'
  | 'PREVIOUS_AGREEMENT'
  | 'COMMITTEE_RESOLUTION'
  | 'OTHER';

export interface AgreementOcrExtractResult {
  docType: AgreementOcrDocType;
  /** ব্যবহারকারী যাচাই ও সংশোধন না করা পর্যন্ত সর্বদা UNVERIFIED_DRAFT */
  verificationStatus: 'UNVERIFIED_DRAFT';
  extractedTextRaw: string;
  partyCandidate?: {
    name?: string;
    fatherOrOrgHead?: string;
    nidOrRegNo?: string;
    address?: string;
    phone?: string;
    designation?: string;
    authorityBasis?: string;
  };
  landWaqfCandidate?: {
    mouza?: string;
    jlNumber?: string;
    khatianNumber?: string;
    dagNumber?: string;
    landArea?: string;
    landAreaUnit?: string;
    proposedPortionDesc?: string;
  };
  resolutionCandidate?: {
    resolutionNo?: string;
    resolutionDate?: string;
    authoritySummary?: string;
  };
  clausesCandidate?: {
    suggestedTitle?: string;
    suggestedPurpose?: string;
    extractedClauses?: string;
  };
  uncertainFields: string[];
  unverifiedWarningBn: string;
  modelUsed: string;
  generatedAt: string;
}

// ==========================================
// PART 3: APPROVAL WORKFLOW, DIGITAL SIGNATURES, VERSIONING & ARCHIVE
// ==========================================

export type AgreementReviewStage = 'INTERNAL' | 'COMMITTEE' | 'WAQF_LEGAL';

export type AgreementReviewDecision =
  | 'REVIEWED'
  | 'CHANGES_REQUESTED'
  | 'INFO_PENDING'
  | 'WAQF_LEGAL_CLEARED'
  | 'WAQF_LEGAL_REJECTED';

export interface AgreementReviewRecord {
  id: string;
  versionNumber: number;
  stage: AgreementReviewStage;
  decision: AgreementReviewDecision;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  comment: string;
  reviewedAt: string;
}

export type AgreementApprovalDecision = 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REVISION';

export interface AgreementApprovalRecord {
  id: string;
  versionNumber: number;
  decision: AgreementApprovalDecision;
  approverId: string;
  approverName: string;
  approverRole: string;
  committeeResolutionRef?: string;
  comment: string;
  decidedAt: string;
  documentHashAtApproval: string;
}

export type AgreementSignatureMethod =
  | 'DRAW_TOUCH'
  | 'TYPED_ELECTRONIC'
  | 'OTP_VERIFIED_ELECTRONIC';

export interface AgreementRequiredSignerSlot {
  slotKey: string;
  signingOrder: number;
  partyId: string;
  partyRoleLabel: string;
  partyName: string;
  representativeId?: string;
  signerName: string;
  signerDesignation: string;
  signerPhone?: string;
  signerNid?: string;
  authorityBasis: string;
}

export interface AgreementSignatureRecord {
  id: string;
  slotKey: string;
  signingOrder: number;
  partyId: string;
  partyRoleLabel: string;
  partyName: string;
  representativeId?: string;
  signerName: string;
  signerDesignation: string;
  signerIdentityRef?: string;
  authorityBasis: string;
  method: AgreementSignatureMethod;
  signatureImageDataUrl?: string;
  typedSignatureText?: string;
  otpVerified: boolean;
  otpMaskedTarget?: string;
  otpVerifiedAt?: string;
  versionNumber: number;
  documentHash: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  legalLimitationAcknowledged: boolean;
  legalLimitationNoteBn: string;
}

export interface AgreementWitnessSignatureRecord {
  id: string;
  witnessId?: string;
  witnessName: string;
  fatherName?: string;
  phone?: string;
  nid?: string;
  address?: string;
  partySide?: string;
  method: 'DRAW_TOUCH' | 'TYPED_ELECTRONIC';
  signatureImageDataUrl?: string;
  typedSignatureText?: string;
  versionNumber: number;
  documentHash: string;
  signedAt: string;
  recordedByUserId: string;
  recordedByUserName: string;
}

export interface AgreementSignatureAuditEvent {
  id: string;
  eventType:
    | 'OTP_REQUESTED'
    | 'OTP_VERIFIED'
    | 'OTP_FAILED'
    | 'PARTY_SIGNED'
    | 'WITNESS_SIGNED'
    | 'MARKED_FULLY_SIGNED'
    | 'MARKED_EFFECTIVE'
    | 'VERSION_CREATED'
    | 'AMENDMENT_CREATED';
  actorId: string;
  actorName: string;
  signerName?: string;
  partyRoleLabel?: string;
  versionNumber: number;
  documentHash: string;
  ipAddress?: string;
  detailsBn: string;
  timestamp: string;
}

export interface AgreementVersionSnapshot {
  id: string;
  versionNumber: number;
  previousVersionNumber?: number;
  isAmendment: boolean;
  amendmentTitle?: string;
  changeSummary: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  statusAtSnapshot: AgreementStatus;
  approvalStatusAtSnapshot: string;
  documentHash: string;
  signatureCountAtSnapshot: number;
  snapshotData: {
    title: string;
    categoryCode: string;
    categoryNameBn: string;
    agreementDate: string;
    effectiveDate?: string;
    expiryDate?: string;
    durationText?: string;
    purpose: string;
    partiesSummary: string[];
    generalClauses: string;
    specialClauses?: string;
    terminationClause?: string;
    disputeResolutionClause?: string;
    writtenFinancialSummary?: string;
  };
}

export interface AgreementClosureInfo {
  action: 'COMPLETED' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED';
  reason: string;
  effectiveClosureDate?: string;
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;
}

export interface AgreementArchiveReport {
  generatedAt: string;
  totalAgreements: number;
  activeOrEffectiveCount: number;
  pendingApprovalCount: number;
  pendingOrPartialSignatureCount: number;
  fullySignedCount: number;
  completedCount: number;
  expiredCount: number;
  terminatedOrCancelledCount: number;
  archivedCount: number;
  waqfLandTotalCount: number;
  waqfLandPendingLegalReviewCount: number;
  totalSignaturesRecorded: number;
  totalAmendmentsCount: number;
  expiringWithin30Days: Array<{
    id: string;
    agreementNumber: string;
    title: string;
    status: AgreementStatus;
    expiryDate: string;
    daysRemaining: number;
  }>;
  byStatus: Array<{ status: AgreementStatus; count: number }>;
  byCategory: Array<{ code: string; nameBn: string; count: number }>;
  archivedItems: AgreementRecord[];
}

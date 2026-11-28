export type PartyProfileType = 'INDIVIDUAL' | 'ORGANIZATION';

export type PartyStatus = 'ACTIVE' | 'INACTIVE';

export type BuiltInPartyRoleCode =
  | 'BUYER'
  | 'SELLER'
  | 'VENDOR'
  | 'SUPPLIER'
  | 'TECHNICIAN'
  | 'ELECTRICIAN'
  | 'MASON'
  | 'PAINTER'
  | 'AC_MECHANIC'
  | 'PLUMBER'
  | 'CARPENTER'
  | 'LABOURER'
  | 'CONTRACTOR'
  | 'SERVICE_PROVIDER'
  | 'CONSULTANT'
  | 'OTHER';

export type PartyRoleCode = BuiltInPartyRoleCode | (string & {});

export type PartyRoleCategoryGroup =
  | 'BUYER'
  | 'SELLER_SUPPLIER'
  | 'ARTISAN_LABOUR'
  | 'CONTRACTOR_PROVIDER'
  | 'OTHER';

export type PartyPermissionKey =
  | 'party.view'
  | 'party.create'
  | 'party.edit'
  | 'party.merge'
  | 'party.delete'
  | 'party.manage_roles'
  | 'party.view_audit'
  | 'party.view_sensitive'
  | 'party.ocr';

export interface PartyCustomRoleDef {
  id: string;
  mosqueId: string;
  code: string;
  labelBn: string;
  labelEn?: string;
  categoryGroup: PartyRoleCategoryGroup;
  descriptionBn?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface PartyOrganizationDetails {
  registrationOrTradeLicenseNo?: string;
  tinOrBin?: string;
  contactPersonName?: string;
  contactPersonDesignation?: string;
  contactPersonPhone?: string;
  website?: string;
  businessCategory?: string;
  establishedYear?: string;
}

/**
 * কারিগর ও শ্রমিকের অতিরিক্ত তথ্য — সম্পূর্ণ বর্ণনামূলক (কোনো স্বয়ংক্রিয় আর্থিক লেনদেন বা বেতন এন্ট্রি নয়)
 */
export interface PartyArtisanDetails {
  primaryTrade?: string;
  experienceYears?: string;
  wageUnitLabel?: string;
  descriptiveWageRateText?: string;
  teamSizeOrHelpers?: string;
  toolsAvailable?: string;
  availabilityNote?: string;
}

export interface PartyRecord {
  id: string;
  /** স্থায়ী কেন্দ্রীয় পার্টি আইডি (Merge-এর পরও ইতিহাস সংরক্ষণের জন্য অপরিবর্তনীয়) */
  partyId: string;
  /** মানবপাঠ্য সিরিয়াল কোড (যেমন PTY-2026-0001) */
  partyCode: string;
  mosqueId: string;
  tenantId: string;
  partyType: PartyProfileType;
  name: string;
  roles: PartyRoleCode[];
  photoOrLogoUrl?: string;
  phone: string;
  normalizedPhone: string;
  alternatePhone?: string;
  normalizedAltPhone?: string;
  email?: string;
  fullAddress?: string;
  villageOrMahalla?: string;
  unionOrWard?: string;
  upazila?: string;
  district?: string;
  division?: string;
  postCode?: string;
  nidNumber?: string;
  normalizedNid?: string;
  occupationOrSkill?: string;
  description?: string;
  notes?: string;
  status: PartyStatus;
  organizationDetails?: PartyOrganizationDetails;
  artisanDetails?: PartyArtisanDetails;
  /** Merge Lineage — পুরোনো partyId-এর ইতিহাস অক্ষত রাখার জন্য */
  mergedIntoPartyId?: string;
  mergedFromPartyIds?: string[];
  mergedAt?: string;
  mergedBy?: string;
  mergedByName?: string;
  /** Part 2: Cross-module read-only references (Zero financial mutation) */
  voucherReferences?: PartyVoucherReference[];
  agreementReferences?: PartyAgreementReference[];
  linkedStaffId?: string;
  linkedStaffCode?: string;
  linkedStaffRefs?: PartyStaffLinkRef[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export interface PartyVoucherSnapshot {
  partyId: string;
  partyCode: string;
  name: string;
  partyType?: PartyProfileType;
  phone?: string;
  address?: string;
  occupationOrSkill?: string;
  roles?: PartyRoleCode[];
}

export interface PartyVoucherReference {
  voucherId: string;
  voucherNumber: string;
  voucherType: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  headNameBn: string;
  subHeadNameBn?: string;
  status: string;
  snapshotName: string;
  snapshotPhone?: string;
  sourceModule?: string;
  description?: string;
  linkedAt: string;
  updatedAt: string;
}

export interface PartyAgreementReference {
  agreementId: string;
  agreementNumber: string;
  title: string;
  categoryNameBn: string;
  agreementDate: string;
  status: string;
  roleLabel: string;
  snapshotName: string;
  isRepresentative?: boolean;
  linkedAt: string;
  updatedAt: string;
}

export interface PartyStaffLinkRef {
  staffId: string;
  staffCode?: string;
  name: string;
  designationBn: string;
  phone: string;
  status: string;
  linkedAt: string;
}

export type PartyDuplicateReasonCode =
  | 'PHONE_MATCH'
  | 'ALT_PHONE_MATCH'
  | 'NID_MATCH'
  | 'ORG_NAME_PHONE_MATCH'
  | 'ORG_NAME_EXACT_MATCH'
  | 'NAME_PHONE_MATCH';

export interface PartyDuplicateCandidatePair {
  pairKey: string;
  confidence: 'HIGH' | 'MEDIUM';
  reasons: PartyDuplicateReasonCode[];
  reasonLabelsBn: string[];
  primaryParty: PartyRecord;
  duplicateParty: PartyRecord;
}

export interface PartyAuditFieldChange {
  field: string;
  labelBn: string;
  oldValue?: string;
  newValue?: string;
}

export type PartyAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'MERGED'
  | 'ROLE_ADDED'
  | 'STAFF_LINKED'
  | 'DELETED';

export interface PartyAuditLogEntry {
  id: string;
  mosqueId: string;
  partyId: string;
  partyCode?: string;
  partyName: string;
  action: PartyAuditAction;
  summaryBn: string;
  changedFields?: PartyAuditFieldChange[];
  mergedSourcePartyId?: string;
  mergedTargetPartyId?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  ipAddress?: string;
  timestamp: string;
}

export interface PartyMergeHistoryRecord {
  id: string;
  mosqueId: string;
  sourcePartyId: string;
  sourcePartyCode: string;
  sourcePartyName: string;
  targetPartyId: string;
  targetPartyCode: string;
  targetPartyName: string;
  matchReasons: string[];
  resolutionSummaryBn: string;
  sourceSnapshot: Partial<PartyRecord>;
  mergedBy: string;
  mergedByName: string;
  mergedAt: string;
  note?: string;
}

export interface PartyRegistryStats {
  totalActive: number;
  totalInactive: number;
  totalAll: number;
  individualsCount: number;
  organizationsCount: number;
  buyersCount: number;
  sellersSuppliersCount: number;
  artisansLabourersCount: number;
  contractorsProvidersCount: number;
  duplicatePairsCount: number;
  mergedRecordsCount: number;
  roleCounts: Record<string, number>;
}

// ==========================================
// Part 3: Activity History, Reports & AI OCR
// ==========================================
export type PartyTimelineItemKind =
  | 'PURCHASE_SUPPLY'
  | 'WORK_WAGE'
  | 'INCOME'
  | 'EXPENSE_OTHER'
  | 'AGREEMENT'
  | 'STAFF_LINK'
  | 'MERGE'
  | 'AUDIT';

export interface PartyCategorizedVoucher extends PartyVoucherReference {
  nature: 'PURCHASE_SUPPLY' | 'WORK_WAGE' | 'INCOME' | 'EXPENSE_OTHER';
  natureLabelBn: string;
  sourceLabelBn: string;
}

export interface PartyTimelineItem {
  id: string;
  date: string;
  timestamp: string;
  kind: PartyTimelineItemKind;
  sourceModuleLabelBn: string;
  referenceNumber?: string;
  titleBn: string;
  descriptionBn?: string;
  snapshotName?: string;
  amount?: number;
  status?: string;
  statusLabelBn?: string;
  actorName?: string;
}

export interface PartyHistorySummary {
  totalIncomeAmount: number;
  totalPurchaseSupplyAmount: number;
  totalWorkWageAmount: number;
  totalOtherExpenseAmount: number;
  totalExpenseAmount: number;
  incomeCount: number;
  purchaseSupplyCount: number;
  workWageCount: number;
  otherExpenseCount: number;
  expenseCount: number;
  agreementCount: number;
  staffLinkCount: number;
  timelineCount: number;
}

export interface PartyHistoryBundle {
  partyId: string;
  partyCode: string;
  partyName: string;
  summary: PartyHistorySummary;
  purchaseSupplyItems: PartyCategorizedVoucher[];
  workWageItems: PartyCategorizedVoucher[];
  allVouchers: PartyCategorizedVoucher[];
  agreements: PartyAgreementReference[];
  linkedStaff: PartyStaffLinkRef[];
  timeline: PartyTimelineItem[];
  generatedAt: string;
}

export interface PartyReportDirectoryRow {
  party: PartyRecord;
  rolesLabelBn: string;
  addressLine: string;
  incomeVoucherCount: number;
  totalIncomeAmount: number;
  expenseVoucherCount: number;
  totalExpenseAmount: number;
  purchaseSupplyAmount: number;
  workWageAmount: number;
  agreementCount: number;
  lastActivityDate?: string;
}

export interface PartyReportHistoryRow {
  id: string;
  date: string;
  partyId: string;
  partyCode: string;
  partyName: string;
  partyPhone: string;
  occupationOrSkill?: string;
  rolesLabelBn: string;
  sourceType: 'INCOME' | 'EXPENSE' | 'AGREEMENT';
  sourceLabelBn: string;
  categoryLabelBn: string;
  referenceNumber: string;
  titleOrHeadBn: string;
  snapshotName: string;
  descriptionBn?: string;
  amount?: number;
  status: string;
  statusLabelBn: string;
}

export interface PartyReportBundle {
  mosqueName?: string;
  generatedAt: string;
  filtersApplied: {
    mode: 'DIRECTORY' | 'HISTORY';
    categoryGroup: string;
    role?: string;
    partyType?: string;
    status: string;
    occupation?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sourceType: string;
  };
  summary: {
    totalPartiesMatched: number;
    activeCount: number;
    inactiveCount: number;
    individualsCount: number;
    organizationsCount: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
    totalPurchaseSupplyAmount: number;
    totalWorkWageAmount: number;
    totalVoucherCount: number;
    totalAgreementCount: number;
    historyRowCount: number;
  };
  directoryRows: PartyReportDirectoryRow[];
  historyRows: PartyReportHistoryRow[];
}

export type PartyOcrDocType = 'NID' | 'TRADE_LICENSE' | 'BUSINESS_CARD_OR_ID' | 'OTHER';

export interface PartyOcrDuplicateCandidate {
  party: PartyRecord;
  confidence: 'HIGH' | 'MEDIUM';
  reasons: PartyDuplicateReasonCode[];
  reasonLabelsBn: string[];
}

export interface PartyOcrExtractResult {
  draftStatus: 'UNVERIFIED_DRAFT';
  detectedDocType: PartyOcrDocType;
  detectedDocTypeBn: string;
  suggestedPartyType: PartyProfileType;
  name?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  nidNumber?: string;
  fullAddress?: string;
  villageOrMahalla?: string;
  unionOrWard?: string;
  upazila?: string;
  district?: string;
  division?: string;
  postCode?: string;
  occupationOrSkill?: string;
  description?: string;
  organizationDetails?: PartyOrganizationDetails;
  suggestedRoles: string[];
  unclearFieldsBn: string[];
  confidenceNoteBn: string;
  potentialDuplicates: PartyOcrDuplicateCandidate[];
  modelUsed: string;
}

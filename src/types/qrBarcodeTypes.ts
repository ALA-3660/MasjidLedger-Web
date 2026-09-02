export type UniversalPrefix =
  | 'REC' // Income Receipt (আয় রশিদ)
  | 'EXP' // Expense Voucher (ব্যয় ভাউচার)
  | 'DON' // Donor/Community Contribution (সাধারণ দান)
  | 'BOX' // Donation Box (দানবাক্স)
  | 'JUM' // Juma Collection (জুমা কালেকশন)
  | 'STF' // Staff (স্টাফ / কর্মচারী)
  | 'AST' // Asset (স্থাবর-অস্থাবর সম্পদ)
  | 'WPF' // Waqf Property (ওয়াকফ সম্পত্তি)
  | 'TEN' // Tenant (ভাড়াটিয়া)
  | 'CEM' // Cemetery Plot / Burial (কবরস্থান প্লট / দাফন)
  | 'CAP' // Committee Action Plan (কার্যপরিকল্পনা)
  | 'SUB' // Sub-Committee (উপ-কমিটি)
  | 'MEM' // Committee Member (কমিটি সদস্য)
  | 'MTG' // Meeting / Resolution (মিটিং / রেজুলেশন)
  | 'ACT'; // Module Quick Action (মডিউল অ্যাকশন)

export type QrEntityType =
  | 'INCOME'
  | 'EXPENSE'
  | 'DONATION'
  | 'DONATION_BOX'
  | 'JUMA_COLLECTION'
  | 'STAFF'
  | 'ASSET'
  | 'WAQF_PROPERTY'
  | 'TENANT'
  | 'CEMETERY'
  | 'ACTION_PLAN'
  | 'SUB_COMMITTEE'
  | 'COMMITTEE_MEMBER'
  | 'MEETING';

export type QrActionKey =
  | 'ACT-INC-NEW'       // নতুন আয় এন্ট্রি
  | 'ACT-EXP-NEW'       // নতুন ব্যয় এন্ট্রি
  | 'ACT-TRF-NEW'       // Fund Transfer
  | 'ACT-DON-NEW'       // নতুন সাধারণ দান
  | 'ACT-BOX-COLLECT'   // নতুন Donation Box Collection
  | 'ACT-JUM-COLLECT'   // নতুন Juma Collection
  | 'ACT-STF-SALARY'    // Salary Payment
  | 'ACT-STF-FESTIVAL'  // Festival Allowance
  | 'ACT-WPF-NEW'       // নতুন Property
  | 'ACT-WPF-RENT'      // নতুন Rent Collection
  | 'ACT-AST-NEW'       // নতুন Asset
  | 'ACT-AST-SERVICE'   // Service Entry
  | 'ACT-AST-REPAIR'    // Repair Entry
  | 'ACT-CEM-BURIAL'    // নতুন Burial Record
  | 'ACT-MTG-NEW'       // নতুন Meeting
  | 'ACT-MTG-RESOL'     // নতুন Resolution
  | 'ACT-CAP-NEW'       // নতুন Action Plan
  | 'ACT-SUB-NEW';      // Sub-Committee

export interface QrScanResult {
  raw: string;
  type: 'RECORD' | 'ACTION' | 'TOKEN' | 'UNKNOWN';
  prefix?: UniversalPrefix | string;
  code: string;
  entityType?: QrEntityType;
  actionKey?: QrActionKey;
  destinationType?: QRDestinationType;
  actionTitleBn?: string;
  actionTitleEn?: string;
  targetTab?: string;
  targetSubTab?: string;
  recordIdOrNumber?: string;
  requiredPermission?: string;
  hasPermission?: boolean;
  token?: string;
  qrEntity?: QRCodeEntity;
  isPublic?: boolean;
  error?: string;
}

export interface QrActionDefinition {
  id: QrActionKey;
  destinationType: QRDestinationType;
  titleBn: string;
  titleEn: string;
  categoryBn: string;
  categoryEn: string;
  descriptionBn: string;
  iconName: string;
  color: string;
  targetTab: string;
  targetSubTab?: string;
  actionModalType: string;
  requiredPermission?: string;
  isPublic?: boolean;
}

export interface RecordSpecificAction {
  id: string;
  labelBn: string;
  labelEn: string;
  descriptionBn?: string;
  iconName: string;
  color: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate' | 'indigo' | 'cyan';
  actionType:
    | 'VIEW_DETAILS'
    | 'ASSET_SERVICE'
    | 'ASSET_REPAIR'
    | 'ASSET_EXPENSE'
    | 'STAFF_SALARY'
    | 'STAFF_FESTIVAL'
    | 'STAFF_HISTORY'
    | 'STAFF_ID_PRINT'
    | 'WAQF_RENT_COLLECT'
    | 'WAQF_TENANT'
    | 'WAQF_DUE'
    | 'WAQF_AGREEMENT'
    | 'PLAN_PROGRESS'
    | 'PLAN_MILESTONE'
    | 'PLAN_EVIDENCE'
    | 'CEMETERY_DETAILS'
    | 'CEMETERY_CERTIFICATE'
    | 'BOX_COLLECT'
    | 'BOX_HISTORY'
    | 'PRINT_LABEL'
    | 'PRINT_RECEIPT'
    | 'DUPLICATE_ENTRY';
  isPrimary?: boolean;
}

export interface ResolvedRecordItem {
  canonicalCode: string;
  entityType: QrEntityType;
  titleBn: string;
  titleEn: string;
  subtitleBn?: string;
  categoryBn?: string;
  statusBadge: {
    labelBn: string;
    labelEn?: string;
    variant: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate' | 'gray';
  };
  keyDetails: Array<{
    labelBn: string;
    labelEn?: string;
    value: string | number;
    isHighlight?: boolean;
    isCurrency?: boolean;
  }>;
  actions: RecordSpecificAction[];
  rawRecord: any;
  targetTab: string;
  targetSubTab?: string;
}

export type LabelPrintFormat = 'TAG_COMPACT' | 'TAG_STANDARD' | 'ID_CARD' | 'A4_SHEET_GRID' | 'THERMAL_80';

export type QRType = 'PUBLIC' | 'OPERATIONAL';
export type QRStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type QRDestinationType =
  // Public Portals & Views
  | 'PUBLIC_PORTAL'
  | 'DONATION'
  | 'PRAYER_SCHEDULE'
  | 'RAMADAN_CALENDAR'
  | 'NOTICE_BOARD'
  | 'MOSQUE_INFO'
  // Operational Quick Entry
  | 'INCOME_NEW'
  | 'EXPENSE_NEW'
  | 'JUMUAH_COLLECTION'
  | 'DONATION_BOX_COLLECTION'
  | 'DONATION_NEW'
  | 'FUND_TRANSFER'
  | 'STAFF_SALARY'
  | 'STAFF_FESTIVAL'
  | 'WAQF_PROPERTY'
  | 'WAQF_RENT'
  | 'ASSET_SERVICE'
  | 'ASSET_NEW'
  | 'CEMETERY_BURIAL'
  | 'COMMITTEE_MEETING'
  // Operational Reports
  | 'REPORT_INCOME'
  | 'REPORT_EXPENSE'
  | 'REPORT_DONATION_BOX'
  | 'REPORT_JUMUAH'
  | 'REPORT_STAFF_SALARY'
  | 'REPORT_WAQF';

export interface QRCodeEntity {
  id: string;
  mosqueId: string;
  name: string;
  type: QRType;
  destinationType: QRDestinationType;
  token: string;
  status: QRStatus;
  description?: string;
  targetRecordId?: string;
  targetRecordCode?: string;
  targetCustomTitle?: string;
  useCount?: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DenominationBreakdown {
  notes: {
    1000?: number;
    500?: number;
    200?: number;
    100?: number;
    50?: number;
    20?: number;
    10?: number;
    5?: number;
    2?: number;
  };
  coins: {
    5?: number;
    2?: number;
    1?: number;
  };
  totalNotes: number;
  totalCoins: number;
  grandTotal: number;
}

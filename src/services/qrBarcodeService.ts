import {
  UniversalPrefix,
  QrEntityType,
  QrActionKey,
  QrScanResult,
  QrActionDefinition,
  RecordSpecificAction,
  ResolvedRecordItem,
} from '../types/qrBarcodeTypes';
import { User, Mosque } from '../types';

export type {
  UniversalPrefix,
  QrEntityType,
  QrActionKey,
  QrScanResult,
  QrActionDefinition,
  RecordSpecificAction,
  ResolvedRecordItem,
};

export const MODULE_ACTIONS: QrActionDefinition[] = [
  // 1. Accounting
  {
    id: 'ACT-INC-NEW',
    titleBn: 'নতুন আয় এন্ট্রি',
    titleEn: 'New Income Entry',
    categoryBn: 'হিসাব ও অর্থ',
    categoryEn: 'Accounting & Finance',
    descriptionBn: 'সরাসরি নতুন আয় ও প্রাপ্তি এন্ট্রি ফর্ম খুলুন',
    iconName: 'ArrowDownLeft',
    color: 'emerald',
    targetTab: 'income',
    actionModalType: 'ADD_INCOME',
    requiredPermission: 'CREATE_INCOME',
  },
  {
    id: 'ACT-EXP-NEW',
    titleBn: 'নতুন ব্যয় এন্ট্রি',
    titleEn: 'New Expense Entry',
    categoryBn: 'হিসাব ও অর্থ',
    categoryEn: 'Accounting & Finance',
    descriptionBn: 'সরাসরি নতুন ব্যয় ও ভাউচার এন্ট্রি ফর্ম খুলুন',
    iconName: 'ArrowUpRight',
    color: 'rose',
    targetTab: 'expense',
    actionModalType: 'ADD_EXPENSE',
    requiredPermission: 'CREATE_EXPENSE',
  },
  {
    id: 'ACT-TRF-NEW',
    titleBn: 'তহবিল স্থানান্তর (Fund Transfer)',
    titleEn: 'Inter-Account Fund Transfer',
    categoryBn: 'হিসাব ও অর্থ',
    categoryEn: 'Accounting & Finance',
    descriptionBn: 'ক্যাশ ও ব্যাংক অ্যাকাউন্টের মধ্যে ফান্ড ট্রান্সফার ফর্ম খুলুন',
    iconName: 'ArrowRightLeft',
    color: 'blue',
    targetTab: 'cashbook',
    actionModalType: 'FUND_TRANSFER',
    requiredPermission: 'MANAGE_FINANCE',
  },

  // 2. Donation
  {
    id: 'ACT-DON-NEW',
    titleBn: 'নতুন সাধারণ দান ও রশিদ',
    titleEn: 'New General Donation',
    categoryBn: 'দান ও অনুদান',
    categoryEn: 'Donation & Collections',
    descriptionBn: 'মুসল্লি বা দাতার সাধারণ দান এন্ট্রি ও রশিদ প্রিন্ট করুন',
    iconName: 'HeartHandshake',
    color: 'emerald',
    targetTab: 'donations',
    targetSubTab: 'donations',
    actionModalType: 'ADD_DONATION',
    requiredPermission: 'CREATE_INCOME',
  },
  {
    id: 'ACT-BOX-COLLECT',
    titleBn: 'দানবাক্স কালেকশন ও গণনা',
    titleEn: 'Donation Box Collection',
    categoryBn: 'দান ও অনুদান',
    categoryEn: 'Donation & Collections',
    descriptionBn: 'দানবাক্স খুলে নগদ অর্থ গণনা ও জমার ভাউচার তৈরি করুন',
    iconName: 'Box',
    color: 'amber',
    targetTab: 'donations',
    targetSubTab: 'boxes',
    actionModalType: 'BOX_COLLECTION',
    requiredPermission: 'CREATE_INCOME',
  },
  {
    id: 'ACT-JUM-COLLECT',
    titleBn: 'জুমা জামাত কালেকশন',
    titleEn: 'Juma Gathering Collection',
    categoryBn: 'দান ও অনুদান',
    categoryEn: 'Donation & Collections',
    descriptionBn: 'পবিত্র জুমার জামাতে সংগৃহীত অর্থের এন্ট্রি ও হিসাব',
    iconName: 'Users',
    color: 'teal',
    targetTab: 'donations',
    targetSubTab: 'juma',
    actionModalType: 'JUMA_COLLECTION',
    requiredPermission: 'CREATE_INCOME',
  },

  // 3. Staff & Payroll
  {
    id: 'ACT-STF-SALARY',
    titleBn: 'স্টাফ বেতন পরিশোধ (Payroll)',
    titleEn: 'Staff Salary Disbursement',
    categoryBn: 'স্টাফ ও বেতন',
    categoryEn: 'Staff & Payroll',
    descriptionBn: 'ইমাম, মুয়াজ্জিন, খাদেমদের মাসিক বেতন প্রদান ভাউচার',
    iconName: 'WalletCards',
    color: 'indigo',
    targetTab: 'staff',
    actionModalType: 'PAY_SALARY',
    requiredPermission: 'MANAGE_STAFF',
  },
  {
    id: 'ACT-STF-FESTIVAL',
    titleBn: 'উৎসব ভাতা / বোনাস প্রদান',
    titleEn: 'Festival Allowance / Bonus',
    categoryBn: 'স্টাফ ও বেতন',
    categoryEn: 'Staff & Payroll',
    descriptionBn: 'ঈদ বা বিশেষ উপলক্ষে স্টাফদের এককালীন বোনাস প্রদান',
    iconName: 'Gift',
    color: 'purple',
    targetTab: 'staff',
    actionModalType: 'PAY_BONUS',
    requiredPermission: 'MANAGE_STAFF',
  },

  // 4. Property & Waqf
  {
    id: 'ACT-WPF-NEW',
    titleBn: 'নতুন ওয়াকফ সম্পত্তি যোগ',
    titleEn: 'Add Waqf Property Unit',
    categoryBn: 'ওয়াকফ ও সম্পত্তি',
    categoryEn: 'Waqf & Property',
    descriptionBn: 'মসজিদের দোকান, মার্কেট বা জমি রেজিস্ট্রি করুন',
    iconName: 'Landmark',
    color: 'cyan',
    targetTab: 'property',
    actionModalType: 'ADD_PROPERTY',
    requiredPermission: 'MANAGE_PROPERTY',
  },
  {
    id: 'ACT-WPF-RENT',
    titleBn: 'দোকান ভাড়া আদায় ও রশিদ',
    titleEn: 'Collect Shop / Unit Rent',
    categoryBn: 'ওয়াকফ ও সম্পত্তি',
    categoryEn: 'Waqf & Property',
    descriptionBn: 'ওয়াকফ দোকান ও ইউনিটের মাসিক ভাড়া কালেকশন এন্ট্রি',
    iconName: 'Receipt',
    color: 'emerald',
    targetTab: 'property',
    actionModalType: 'COLLECT_RENT',
    requiredPermission: 'MANAGE_PROPERTY',
  },

  // 5. Assets & Maintenance
  {
    id: 'ACT-AST-NEW',
    titleBn: 'নতুন সম্পদ ও সরঞ্জাম এন্ট্রি',
    titleEn: 'Register New Asset',
    categoryBn: 'সম্পদ ও রক্ষণাবেক্ষণ',
    categoryEn: 'Assets & Maintenance',
    descriptionBn: 'এসি, জেনারেটর, সাউন্ড সিস্টেম বা অন্যান্য স্থায়ী সম্পদ এন্ট্রি',
    iconName: 'PackagePlus',
    color: 'blue',
    targetTab: 'assets',
    actionModalType: 'ADD_ASSET',
    requiredPermission: 'MANAGE_ASSETS',
  },
  {
    id: 'ACT-AST-SERVICE',
    titleBn: 'সম্পদ সার্ভিসিং ও রক্ষণাবেক্ষণ',
    titleEn: 'Asset Service Entry',
    categoryBn: 'সম্পদ ও রক্ষণাবেক্ষণ',
    categoryEn: 'Assets & Maintenance',
    descriptionBn: 'নিয়মিত সার্ভিসিং রেকর্ড ও ব্যয় এন্ট্রি',
    iconName: 'Wrench',
    color: 'amber',
    targetTab: 'assets',
    actionModalType: 'SERVICE_ENTRY',
    requiredPermission: 'MANAGE_ASSETS',
  },
  {
    id: 'ACT-AST-REPAIR',
    titleBn: 'মেরামত ও যন্ত্রাংশ প্রতিস্থাপন',
    titleEn: 'Asset Repair / Parts Replacement',
    categoryBn: 'সম্পদ ও রক্ষণাবেক্ষণ',
    categoryEn: 'Assets & Maintenance',
    descriptionBn: 'নষ্ট সরঞ্জাম মেরামত ও পার্টস ক্রয়ের রেকর্ড',
    iconName: 'Hammer',
    color: 'rose',
    targetTab: 'assets',
    actionModalType: 'REPAIR_ENTRY',
    requiredPermission: 'MANAGE_ASSETS',
  },

  // 6. Cemetery & Burial
  {
    id: 'ACT-CEM-BURIAL',
    titleBn: 'নতুন দাফন ও কবর এন্ট্রি',
    titleEn: 'New Burial / Cemetery Entry',
    categoryBn: 'কবরস্থান ব্যবস্থাপনা',
    categoryEn: 'Cemetery Management',
    descriptionBn: 'মরহুমের দাফন, প্লট বরাদ্দ ও ফি আদায়ের রেকর্ড',
    iconName: 'Flower2',
    color: 'slate',
    targetTab: 'cemetery',
    actionModalType: 'ADD_BURIAL',
    requiredPermission: 'MANAGE_CEMETERY',
  },

  // 7. Committee & Meetings
  {
    id: 'ACT-MTG-NEW',
    titleBn: 'নতুন মিটিং নোটিশ ও আলোচ্যসূচি',
    titleEn: 'New Meeting Notice',
    categoryBn: 'কমিটি ও প্রশাসন',
    categoryEn: 'Committee & Governance',
    descriptionBn: 'কার্যনির্বাহী বা সাধারণ সভার নোটিশ ও আলোচ্যসূচি তৈরি করুন',
    iconName: 'CalendarCheck',
    color: 'indigo',
    targetTab: 'committee',
    actionModalType: 'ADD_MEETING',
    requiredPermission: 'MANAGE_COMMITTEE',
  },
  {
    id: 'ACT-MTG-RESOL',
    titleBn: 'মিটিং সিদ্ধান্ত / রেজুলেশন',
    titleEn: 'Meeting Resolution',
    categoryBn: 'কমিটি ও প্রশাসন',
    categoryEn: 'Committee & Governance',
    descriptionBn: 'গৃহীত সিদ্ধান্ত ও রেজুলেশন নম্বর এন্ট্রি',
    iconName: 'FileText',
    color: 'blue',
    targetTab: 'committee',
    actionModalType: 'ADD_RESOLUTION',
    requiredPermission: 'MANAGE_COMMITTEE',
  },
  {
    id: 'ACT-CAP-NEW',
    titleBn: 'নতুন প্রকল্প / কার্যপরিকল্পনা',
    titleEn: 'New Action Plan',
    categoryBn: 'কমিটি ও প্রশাসন',
    categoryEn: 'Committee & Governance',
    descriptionBn: 'মসজিদ উন্নয়ন, সংস্কার বা মেগা প্রকল্পের অ্যাকশন প্ল্যান',
    iconName: 'Target',
    color: 'emerald',
    targetTab: 'committee',
    actionModalType: 'ADD_ACTION_PLAN',
    requiredPermission: 'MANAGE_COMMITTEE',
  },
  {
    id: 'ACT-SUB-NEW',
    titleBn: 'নতুন উপ-কমিটি গঠন',
    titleEn: 'New Sub-Committee',
    categoryBn: 'কমিটি ও প্রশাসন',
    categoryEn: 'Committee & Governance',
    descriptionBn: 'শিক্ষা, নির্মাণ, ওয়াকফ বা অডিট সাব-কমিটি তৈরি করুন',
    iconName: 'Users',
    color: 'slate',
    targetTab: 'committee',
    actionModalType: 'ADD_SUB_COMMITTEE',
    requiredPermission: 'MANAGE_COMMITTEE',
  },
];

/**
 * Universal QR Payload Deep Link Generator
 */
export function buildQrPayload(code: string, origin?: string): string {
  const cleanCode = code.trim();
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return `/scan/${cleanCode}`;
  return `${base}/scan/${cleanCode}`;
}

/**
 * Extracts and cleans the raw code from a QR URL, deep link, or direct barcode text
 */
export function extractCodeFromPayload(payload: string): string {
  if (!payload) return '';
  let text = payload.trim();

  // If it's a URL (e.g. https://domain.com/scan/AST-GEN-01?ref=xyz)
  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const pathname = url.pathname;
      const scanIndex = pathname.indexOf('/scan/');
      if (scanIndex !== -1) {
        text = decodeURIComponent(pathname.substring(scanIndex + 6));
      } else {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          text = decodeURIComponent(segments[segments.length - 1]);
        }
      }
    } else if (text.startsWith('masjidledger://scan/')) {
      text = decodeURIComponent(text.replace('masjidledger://scan/', ''));
    } else if (text.startsWith('/scan/')) {
      text = decodeURIComponent(text.replace('/scan/', ''));
    }
  } catch {
    // If URL parsing fails, fallback to raw string
  }

  // Remove any trailing query strings or slashes
  return text.split('?')[0].replace(/\/+$/, '').trim();
}

/**
 * Parses any QR Code / Barcode string into a structured QrScanResult
 */
export function parseQrCode(rawPayload: string): QrScanResult {
  const code = extractCodeFromPayload(rawPayload);

  if (!code) {
    return {
      raw: rawPayload,
      type: 'UNKNOWN',
      code: '',
      error: 'কোনো বৈধ কোড পাওয়া যায়নি (Empty Code)',
    };
  }

  // 1. Check if it's an Action QR (e.g. ACT-INC-NEW, NEW-INCOME, etc.)
  const upperCode = code.toUpperCase();
  
  // Action Aliases dictionary
  const ACTION_ALIASES: Record<string, QrActionKey> = {
    'NEW-INCOME': 'ACT-INC-NEW',
    'NEW_INCOME': 'ACT-INC-NEW',
    'INCOME-NEW': 'ACT-INC-NEW',
    'NEW-EXPENSE': 'ACT-EXP-NEW',
    'NEW_EXPENSE': 'ACT-EXP-NEW',
    'EXPENSE-NEW': 'ACT-EXP-NEW',
    'NEW-DONATION': 'ACT-DON-NEW',
    'NEW_DONATION': 'ACT-DON-NEW',
    'DONATION-NEW': 'ACT-DON-NEW',
    'NEW-JUMA': 'ACT-JUM-COLLECT',
    'NEW_JUMA': 'ACT-JUM-COLLECT',
    'JUMA-COLLECT': 'ACT-JUM-COLLECT',
    'JUMA-NEW': 'ACT-JUM-COLLECT',
    'DONATION-BOX': 'ACT-BOX-COLLECT',
    'DONATION-BOX-COLLECT': 'ACT-BOX-COLLECT',
    'BOX-COLLECT': 'ACT-BOX-COLLECT',
    'SALARY-PAY': 'ACT-STF-SALARY',
    'PAY-SALARY': 'ACT-STF-SALARY',
    'SALARY': 'ACT-STF-SALARY',
    'WAQF-RENT': 'ACT-WPF-RENT',
    'RENT-COLLECT': 'ACT-WPF-RENT',
    'SHOP-RENT': 'ACT-WPF-RENT',
    'ASSET-SERVICE': 'ACT-AST-SERVICE',
    'SERVICE-ENTRY': 'ACT-AST-SERVICE',
    'ASSET-REPAIR': 'ACT-AST-REPAIR',
    'REPAIR-ENTRY': 'ACT-AST-REPAIR',
    'CEMETERY-BURIAL': 'ACT-CEM-BURIAL',
    'NEW-BURIAL': 'ACT-CEM-BURIAL',
    'BURIAL-NEW': 'ACT-CEM-BURIAL',
    'ACTION-PLAN': 'ACT-CAP-NEW',
    'NEW-PLAN': 'ACT-CAP-NEW',
    'PLAN-NEW': 'ACT-CAP-NEW',
    'FUND-TRANSFER': 'ACT-TRF-NEW',
  };

  let resolvedActionKey: QrActionKey | undefined = undefined;

  if (code.startsWith('ACT-') || code.startsWith('ACT_')) {
    resolvedActionKey = code.replace('_', '-') as QrActionKey;
  } else if (ACTION_ALIASES[upperCode]) {
    resolvedActionKey = ACTION_ALIASES[upperCode];
  }

  if (resolvedActionKey) {
    const actionDef = MODULE_ACTIONS.find(
      (a) => a.id === resolvedActionKey || a.id.toLowerCase() === resolvedActionKey?.toLowerCase()
    );

    if (actionDef) {
      return {
        raw: rawPayload,
        type: 'ACTION',
        prefix: 'ACT',
        code: actionDef.id,
        actionKey: actionDef.id,
        actionTitleBn: actionDef.titleBn,
        actionTitleEn: actionDef.titleEn,
        targetTab: actionDef.targetTab,
        targetSubTab: actionDef.targetSubTab,
        requiredPermission: actionDef.requiredPermission,
      };
    }
  }

  // 2. Check Entity Record Prefixes

  // REC / INC: Income Receipt
  if (upperCode.startsWith('REC-') || upperCode.startsWith('INC-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'REC',
      code: code,
      entityType: 'INCOME',
      targetTab: 'income',
      recordIdOrNumber: code,
      actionTitleBn: 'আয় ও প্রাপ্তি রশিদ',
      actionTitleEn: 'Income Receipt',
      requiredPermission: 'CREATE_INCOME',
    };
  }

  // EXP: Expense Voucher
  if (upperCode.startsWith('EXP-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'EXP',
      code: code,
      entityType: 'EXPENSE',
      targetTab: 'expense',
      recordIdOrNumber: code,
      actionTitleBn: 'ব্যয় ভাউচার',
      actionTitleEn: 'Expense Voucher',
      requiredPermission: 'CREATE_EXPENSE',
    };
  }

  // DON: Donor Contribution
  if (upperCode.startsWith('DON-') || upperCode.startsWith('REC-DON')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'DON',
      code: code,
      entityType: 'DONATION',
      targetTab: 'donations',
      recordIdOrNumber: code,
      actionTitleBn: 'সাধারণ দান ও অনুদান রশিদ',
      actionTitleEn: 'Donation Receipt',
      requiredPermission: 'CREATE_INCOME',
    };
  }

  // BOX: Donation Box
  if (upperCode.startsWith('BOX-') || upperCode.startsWith('DBOX-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'BOX',
      code: code,
      entityType: 'DONATION_BOX',
      targetTab: 'donationBox',
      recordIdOrNumber: code,
      actionTitleBn: 'দানবাক্স রেকর্ড ও কালেকশন',
      actionTitleEn: 'Donation Box',
      requiredPermission: 'CREATE_INCOME',
    };
  }

  // JUM: Juma Collection
  if (upperCode.startsWith('JUM-') || upperCode.startsWith('JUMA-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'JUM',
      code: code,
      entityType: 'JUMA_COLLECTION',
      targetTab: 'donations',
      targetSubTab: 'juma',
      recordIdOrNumber: code,
      actionTitleBn: 'জুমা জামাত কালেকশন',
      actionTitleEn: 'Juma Collection',
      requiredPermission: 'CREATE_INCOME',
    };
  }

  // STF / EMP: Staff Member
  if (upperCode.startsWith('STF-') || upperCode.startsWith('EMP-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'STF',
      code: code,
      entityType: 'STAFF',
      targetTab: 'staff',
      recordIdOrNumber: code,
      actionTitleBn: 'স্টাফ প্রোফাইল ও বেতন রেজিস্টার',
      actionTitleEn: 'Staff Profile & Payroll',
      requiredPermission: 'MANAGE_STAFF',
    };
  }

  // AST: Asset
  if (upperCode.startsWith('AST-') || upperCode.startsWith('ASSET-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'AST',
      code: code,
      entityType: 'ASSET',
      targetTab: 'assets',
      recordIdOrNumber: code,
      actionTitleBn: 'মসজিদ সম্পদ ও যন্ত্রপাতি',
      actionTitleEn: 'Mosque Asset Item',
      requiredPermission: 'MANAGE_ASSETS',
    };
  }

  // WPF / PROP: Waqf Property
  if (upperCode.startsWith('WPF-') || upperCode.startsWith('PROP-') || upperCode.startsWith('SHOP-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'WPF',
      code: code,
      entityType: 'WAQF_PROPERTY',
      targetTab: 'property',
      recordIdOrNumber: code,
      actionTitleBn: 'ওয়াকফ সম্পত্তি ও দোকান ইউনিট',
      actionTitleEn: 'Waqf Property Unit',
      requiredPermission: 'MANAGE_PROPERTY',
    };
  }

  // TEN: Tenant
  if (upperCode.startsWith('TEN-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'TEN',
      code: code,
      entityType: 'TENANT',
      targetTab: 'property',
      recordIdOrNumber: code,
      actionTitleBn: 'দোকান/ইউনিট ভাড়াটিয়া রেকর্ড',
      actionTitleEn: 'Property Tenant',
      requiredPermission: 'MANAGE_PROPERTY',
    };
  }

  // CEM: Cemetery Plot / Burial Record
  if (upperCode.startsWith('CEM-') || upperCode.startsWith('GRAVE-') || upperCode.startsWith('PLOT-') || upperCode.startsWith('CBR-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'CEM',
      code: code,
      entityType: 'CEMETERY',
      targetTab: 'cemetery',
      recordIdOrNumber: code,
      actionTitleBn: 'কবরস্থান প্লট ও দাফন রেকর্ড',
      actionTitleEn: 'Cemetery Plot & Burial',
      requiredPermission: 'MANAGE_CEMETERY',
    };
  }

  // CAP: Committee Action Plan
  if (upperCode.startsWith('CAP-') || upperCode.startsWith('PLAN-') || upperCode.startsWith('AP-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'CAP',
      code: code,
      entityType: 'ACTION_PLAN',
      targetTab: 'committee',
      recordIdOrNumber: code,
      actionTitleBn: 'কমিটি কার্যপরিকল্পনা',
      actionTitleEn: 'Committee Action Plan',
      requiredPermission: 'MANAGE_COMMITTEE',
    };
  }

  // SUB: Sub-Committee
  if (upperCode.startsWith('SUB-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'SUB',
      code: code,
      entityType: 'SUB_COMMITTEE',
      targetTab: 'committee',
      recordIdOrNumber: code,
      actionTitleBn: 'উপ-কমিটি প্রোফাইল',
      actionTitleEn: 'Sub-Committee Profile',
      requiredPermission: 'MANAGE_COMMITTEE',
    };
  }

  // MEM: Committee Member
  if (upperCode.startsWith('MEM-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'MEM',
      code: code,
      entityType: 'COMMITTEE_MEMBER',
      targetTab: 'committee',
      recordIdOrNumber: code,
      actionTitleBn: 'কমিটি সদস্য পরিচিতি',
      actionTitleEn: 'Committee Member',
      requiredPermission: 'MANAGE_COMMITTEE',
    };
  }

  // MTG / RES: Meeting / Resolution
  if (upperCode.startsWith('MTG-') || upperCode.startsWith('RES-') || upperCode.startsWith('MM-') || upperCode.startsWith('MJMWS-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'MTG',
      code: code,
      entityType: 'MEETING',
      targetTab: 'committee',
      recordIdOrNumber: code,
      actionTitleBn: 'মিটিং কার্যবিবরণী ও রেজুলেশন',
      actionTitleEn: 'Meeting & Resolution',
      requiredPermission: 'MANAGE_COMMITTEE',
    };
  }

  // 3. Fallback for unrecognized format
  return {
    raw: rawPayload,
    type: 'UNKNOWN',
    code: code,
    error: `অপরিচিত কোড ফরম্যাট: "${code}"`,
  };
}

/**
 * Checks if the current authenticated user has permission to access the scanned target
 */
export function checkUserPermissionForScan(
  result: QrScanResult,
  currentUser: User | null
): { allowed: boolean; reasonBn?: string; reasonEn?: string } {
  if (!currentUser) {
    return {
      allowed: false,
      reasonBn: 'এই তথ্য দেখতে বা কাজ করতে প্রথমে সিস্টেমে লগইন করুন।',
      reasonEn: 'Please log in to system to view this record or execute action.',
    };
  }

  // Super Admins and Mosque Admins have full access
  if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MOSQUE_ADMIN') {
    return { allowed: true };
  }

  // If no specific permission is required
  if (!result.requiredPermission) {
    return { allowed: true };
  }

  const hasPerm = currentUser.permissions?.includes(result.requiredPermission as any);
  if (hasPerm) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reasonBn: `আপনার বর্তমান ইউজার রোল (${currentUser.role}) এই অ্যাকশন বা রেকর্ডের অনুমতি প্রদান করে না।`,
    reasonEn: `Your user role (${currentUser.role}) does not have permission for this module.`,
  };
}

/**
 * Canonical Unique Identifier Generation for Existing Entities
 */
export function getEntityCanonicalCode(
  entityType: QrEntityType,
  record: any
): string {
  if (!record) return '';

  switch (entityType) {
    case 'INCOME':
      return record.voucherNumber?.startsWith('REC-')
        ? record.voucherNumber
        : `REC-${record.voucherNumber || record.id}`;

    case 'EXPENSE':
      return record.voucherNumber?.startsWith('EXP-')
        ? record.voucherNumber
        : `EXP-${record.voucherNumber || record.id}`;

    case 'DONATION':
      return record.receiptNumber?.startsWith('DON-')
        ? record.receiptNumber
        : `DON-${record.receiptNumber || record.id}`;

    case 'DONATION_BOX':
      return record.boxCode?.startsWith('BOX-')
        ? record.boxCode
        : `BOX-${record.boxCode || record.id}`;

    case 'JUMA_COLLECTION':
      return `JUM-${record.date || record.id}`;

    case 'STAFF':
      return record.employeeId?.startsWith('STF-')
        ? record.employeeId
        : `STF-${record.employeeId || record.id}`;

    case 'ASSET':
      return record.assetCode?.startsWith('AST-')
        ? record.assetCode
        : `AST-${record.assetCode || record.id}`;

    case 'WAQF_PROPERTY':
      return record.propertyCode?.startsWith('WPF-')
        ? record.propertyCode
        : `WPF-${record.propertyCode || record.id}`;

    case 'TENANT':
      return record.tenantCode?.startsWith('TEN-')
        ? record.tenantCode
        : `TEN-${record.tenantCode || record.id}`;

    case 'CEMETERY':
      return record.plotNumber?.startsWith('CEM-')
        ? record.plotNumber
        : `CEM-${record.plotNumber || record.recordNumber || record.id}`;

    case 'ACTION_PLAN':
      return record.planCode?.startsWith('CAP-')
        ? record.planCode
        : `CAP-${record.planCode || record.id}`;

    case 'SUB_COMMITTEE':
      return record.subCommitteeCode?.startsWith('SUB-')
        ? record.subCommitteeCode
        : `SUB-${record.subCommitteeCode || record.id}`;

    case 'COMMITTEE_MEMBER':
      return `MEM-${record.id}`;

    case 'MEETING':
      return record.memoNo?.startsWith('MTG-')
        ? record.memoNo
        : `MTG-${record.memoNo || record.serialNumber || record.id}`;

    default:
      return record.id || '';
  }
}

/**
 * Universal System Collections Interface for Record Resolution
 */
export interface SystemCollections {
  incomes?: any[];
  expenses?: any[];
  donations?: any[];
  donationBoxes?: any[];
  staff?: any[];
  staffPayments?: any[];
  assets?: any[];
  properties?: any[];
  cemetery?: any[];
  cemeteryRecords?: any[];
  actionPlans?: any[];
  resolutions?: any[];
  subCommittees?: any[];
  members?: any[];
  committeeMembers?: any[];
  meetings?: any[];
}

/**
 * Resolves a raw scanned code or canonical identifier into an Interactive Record Action Model (Identify -> View -> Act)
 */
export function resolveRecordFromSystem(
  rawCode: string,
  collections: SystemCollections
): ResolvedRecordItem | null {
  if (!rawCode) return null;
  const parsed = parseQrCode(rawCode);
  const searchCode = (parsed.code || rawCode).trim().toUpperCase();
  const cleanBare = searchCode.replace(/^(AST|WPF|STF|EMP|REC|INC|EXP|DON|BOX|JUM|CEM|CAP|SUB|MEM|MTG|RES)-/i, '').trim();

  // 1. ASSET Lookup (e.g. AST-GEN-01, AST-01, GEN-01)
  if (parsed.entityType === 'ASSET' || searchCode.startsWith('AST-') || searchCode.startsWith('ASSET-')) {
    const assets = collections.assets || [];
    const found = assets.find((a) => {
      const code = (a.assetCode || '').toUpperCase();
      const id = (a.id || '').toUpperCase();
      return (
        code === searchCode ||
        `AST-${code}` === searchCode ||
        id === searchCode ||
        `AST-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('ASSET', found);
      const isDamaged = found.condition === 'DAMAGED' || found.status === 'DAMAGED';
      const inRepair = found.status === 'UNDER_REPAIR' || found.condition === 'UNDER_REPAIR';

      return {
        canonicalCode: canonical,
        entityType: 'ASSET',
        titleBn: found.nameBn || found.name || 'মসজিদ স্থায়ী সম্পদ',
        titleEn: found.nameEn || found.name || 'Asset Item',
        subtitleBn: `ক্যাটাগরি: ${found.categoryBn || found.category || 'সাধারণ'} • অবস্থান: ${found.location || 'মূল মসজিদ ভবন'}`,
        categoryBn: 'স্থায়ী সম্পদ ও যন্ত্রপাতি',
        statusBadge: {
          labelBn: inRepair ? 'মেরামতাধীন' : isDamaged ? 'ত্রুটিপূর্ণ' : 'সচল ও সক্রিয়',
          variant: inRepair ? 'amber' : isDamaged ? 'rose' : 'emerald',
        },
        keyDetails: [
          { labelBn: 'সম্পদ কোড (Asset Code)', value: found.assetCode || found.id, isHighlight: true },
          { labelBn: 'ক্রয় / প্রাপ্তির তারিখ', value: found.purchaseDate || 'উল্লেখ নেই' },
          { labelBn: 'মূল্য / খরচ (BDT)', value: found.purchaseCost || found.cost || 0, isCurrency: true },
          { labelBn: 'বর্তমান স্থিতি / অবস্থা', value: found.condition || 'GOOD' },
          { labelBn: 'সিরিয়াল নম্বর', value: found.serialNumber || 'N/A' },
          { labelBn: 'রক্ষণাবেক্ষণ দায়িত্ব', value: found.assignedPerson || 'মসজিদ খাদেম ও কমিটি' },
        ],
        actions: [
          {
            id: 'view',
            labelBn: 'বিস্তারিত বিবরণ',
            labelEn: 'Full Details',
            iconName: 'Eye',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'service',
            labelBn: 'সার্ভিসিং এন্ট্রি',
            labelEn: 'Service Entry',
            descriptionBn: 'নিয়মিত ওভারহোলিং ও রুটিন সার্ভিসিং',
            iconName: 'Wrench',
            color: 'amber',
            actionType: 'ASSET_SERVICE',
          },
          {
            id: 'repair',
            labelBn: 'মেরামত ও পার্টস',
            labelEn: 'Repair Entry',
            descriptionBn: 'ত্রুটি সমাধান ও পার্টস পরিবর্তন',
            iconName: 'Hammer',
            color: 'rose',
            actionType: 'ASSET_REPAIR',
          },
          {
            id: 'expense',
            labelBn: 'ব্যয় ভাউচার',
            labelEn: 'Expense Voucher',
            descriptionBn: 'সম্পদের সাথে যুক্ত ব্যয় রেজিস্ট্রি',
            iconName: 'Receipt',
            color: 'slate',
            actionType: 'ASSET_EXPENSE',
          },
          {
            id: 'print',
            labelBn: 'স্টিকার / ট্যাগ প্রিন্ট',
            labelEn: 'Print Tag',
            descriptionBn: 'কিউআর ও বারকোড লেবেল',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'assets',
      };
    }
  }

  // 2. WAQF PROPERTY / SHOP Lookup (e.g. WPF-SHOP-01, WPF-01, SHOP-01)
  if (parsed.entityType === 'WAQF_PROPERTY' || parsed.entityType === 'TENANT' || searchCode.startsWith('WPF-') || searchCode.startsWith('PROP-') || searchCode.startsWith('SHOP-')) {
    const properties = collections.properties || [];
    const found = properties.find((p) => {
      const code = (p.propertyCode || p.shopNumber || '').toUpperCase();
      const id = (p.id || '').toUpperCase();
      return (
        code === searchCode ||
        `WPF-${code}` === searchCode ||
        id === searchCode ||
        `WPF-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('WAQF_PROPERTY', found);
      const activeTenant = found.tenants && found.tenants.length > 0 ? found.tenants[0] : null;
      const isRented = found.status === 'RENTED' || !!activeTenant;

      return {
        canonicalCode: canonical,
        entityType: 'WAQF_PROPERTY',
        titleBn: found.propertyNameBn || found.nameBn || `দোকান/ইউনিট নং ${found.propertyCode || found.shopNumber || ''}`,
        titleEn: found.propertyNameEn || found.nameEn || 'Waqf Property Unit',
        subtitleBn: `ওয়াকফ এস্টেট: ${found.estateName || 'মসজিদ ওয়াকফ মার্কেট'} • ধরন: ${found.type || 'দোকান'}`,
        categoryBn: 'ওয়াকফ সম্পত্তি ও দোকান',
        statusBadge: {
          labelBn: isRented ? 'ভাড়াকৃত (Rented)' : 'খালি (Vacant)',
          variant: isRented ? 'emerald' : 'amber',
        },
        keyDetails: [
          { labelBn: 'সম্পত্তি কোড', value: found.propertyCode || found.id, isHighlight: true },
          { labelBn: 'বর্তমান ভাড়াটিয়া', value: activeTenant?.tenantName || found.tenantName || 'খালি (কোনো ভাড়াটিয়া নেই)' },
          { labelBn: 'মাসিক নির্ধারিত ভাড়া', value: found.monthlyRent || activeTenant?.monthlyRent || 0, isCurrency: true },
          { labelBn: 'জামানত / অ্যাডভান্স', value: found.securityDeposit || activeTenant?.securityDeposit || 0, isCurrency: true },
          { labelBn: 'বর্তমান বকেয়া স্থিতি', value: found.dueAmount || activeTenant?.dueAmount || 0, isCurrency: true, isHighlight: (found.dueAmount || 0) > 0 },
          { labelBn: 'চুক্তির মেয়াদ', value: activeTenant?.leaseEndDate || found.leaseEndDate || 'চলমান' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'সম্পত্তির বিবরণী',
            labelEn: 'Property Details',
            iconName: 'Building',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'rent',
            labelBn: 'ভাড়া আদায় ও রশিদ',
            labelEn: 'Rent Collection',
            descriptionBn: 'মাসিক ভাড়া কালেকশন ও ভাউচার',
            iconName: 'Receipt',
            color: 'emerald',
            actionType: 'WAQF_RENT_COLLECT',
          },
          {
            id: 'tenant',
            labelBn: 'ভাড়াটিয়া প্রোফাইল',
            labelEn: 'Tenant Info',
            descriptionBn: 'ভাড়াটিয়া চুক্তি ও তথ্য',
            iconName: 'UserCheck',
            color: 'indigo',
            actionType: 'WAQF_TENANT',
          },
          {
            id: 'due',
            labelBn: 'বকেয়া স্থিতি ও নোটিশ',
            labelEn: 'Dues & Notice',
            descriptionBn: 'বকেয়া বিবরণ ও তাগাদা',
            iconName: 'AlertCircle',
            color: 'amber',
            actionType: 'WAQF_DUE',
          },
          {
            id: 'agreement',
            labelBn: 'চুক্তিপত্র ও দলিল',
            labelEn: 'Agreement Document',
            descriptionBn: 'আইনি চুক্তিপত্র বিবরণ',
            iconName: 'FileText',
            color: 'slate',
            actionType: 'WAQF_AGREEMENT',
          },
          {
            id: 'print',
            labelBn: 'শপ নেমপ্লেট প্রিন্ট',
            labelEn: 'Print Plate',
            descriptionBn: 'দোকান নেমপ্লেট ও কিউআর',
            iconName: 'Printer',
            color: 'purple',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'property',
      };
    }
  }

  // 3. STAFF Lookup (e.g. STF-001, STF-IMAM-01, EMP-001)
  if (parsed.entityType === 'STAFF' || searchCode.startsWith('STF-') || searchCode.startsWith('EMP-')) {
    const staffList = collections.staff || [];
    const found = staffList.find((s) => {
      const code = (s.employeeId || s.staffCode || '').toUpperCase();
      const id = (s.id || '').toUpperCase();
      return (
        code === searchCode ||
        `STF-${code}` === searchCode ||
        id === searchCode ||
        `STF-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('STAFF', found);
      return {
        canonicalCode: canonical,
        entityType: 'STAFF',
        titleBn: found.nameBn || found.name || 'মসজিদ স্টাফ',
        titleEn: found.nameEn || found.name || 'Staff Member',
        subtitleBn: `পদবি: ${found.designationBn || found.designation || 'খাদেম'} • বিভাগ: ${found.department || 'মসজিদ পরিচালনা'}`,
        categoryBn: 'স্টাফ ও বেতন রেজিস্টার',
        statusBadge: {
          labelBn: found.status === 'ACTIVE' ? 'কর্মরত ও সক্রিয়' : 'ছুটি / নিষ্ক্রিয়',
          variant: found.status === 'ACTIVE' ? 'emerald' : 'slate',
        },
        keyDetails: [
          { labelBn: 'স্টাফ আইডি (Staff ID)', value: found.employeeId || found.id, isHighlight: true },
          { labelBn: 'পদবি ও দায়িত্ব', value: found.designationBn || found.designation || 'কর্মকর্তা' },
          { labelBn: 'মাসিক মূল বেতন (BDT)', value: found.monthlySalary || found.salary || 0, isCurrency: true },
          { labelBn: 'মোবাইল নম্বর', value: found.phone || found.mobile || 'উল্লেখ নেই' },
          { labelBn: 'যোগদানের তারিখ', value: found.joiningDate || 'N/A' },
          { labelBn: 'রক্তের গ্রুপ ও এনআইডি', value: `${found.bloodGroup || 'N/A'} | ${found.nid || 'N/A'}` },
        ],
        actions: [
          {
            id: 'profile',
            labelBn: 'পূর্ণ প্রোফাইল ও তথ্য',
            labelEn: 'View Profile',
            iconName: 'User',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'salary',
            labelBn: 'মাসিক বেতন পরিশোধ',
            labelEn: 'Disburse Salary',
            descriptionBn: 'বেতন ভাউচার ও স্লিপ প্রিন্ট',
            iconName: 'Wallet',
            color: 'emerald',
            actionType: 'STAFF_SALARY',
          },
          {
            id: 'bonus',
            labelBn: 'উৎসব ভাতা / বোনাস',
            labelEn: 'Festival Bonus',
            descriptionBn: 'ঈদ ও বিশেষ এককালীন বোনাস',
            iconName: 'Gift',
            color: 'purple',
            actionType: 'STAFF_FESTIVAL',
          },
          {
            id: 'history',
            labelBn: 'বেতনের ইতিহাস ও বিবরণী',
            labelEn: 'Payment History',
            descriptionBn: 'সকল পরিশোধিত স্লিপের তালিকা',
            iconName: 'History',
            color: 'slate',
            actionType: 'STAFF_HISTORY',
          },
          {
            id: 'print_id',
            labelBn: 'স্টাফ আইডি কার্ড প্রিন্ট',
            labelEn: 'Print ID Card',
            descriptionBn: 'কিউআর ও বারকোডযুক্ত ডিজিটাল কার্ড',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'staff',
      };
    }
  }

  // 4. ACTION PLAN Lookup (e.g. CAP-PLAN-01, CAP-001)
  if (parsed.entityType === 'ACTION_PLAN' || searchCode.startsWith('CAP-') || searchCode.startsWith('PLAN-')) {
    const plans = collections.actionPlans || [];
    const found = plans.find((p) => {
      const code = (p.planCode || '').toUpperCase();
      const id = (p.id || '').toUpperCase();
      return (
        code === searchCode ||
        `CAP-${code}` === searchCode ||
        id === searchCode ||
        `CAP-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('ACTION_PLAN', found);
      const isCompleted = found.status === 'COMPLETED' || found.progressPercentage === 100;
      return {
        canonicalCode: canonical,
        entityType: 'ACTION_PLAN',
        titleBn: found.titleBn || found.title || 'কমিটি কার্যপরিকল্পনা',
        titleEn: found.titleEn || found.title || 'Committee Action Plan',
        subtitleBn: `অগ্রাধিকার: ${found.priority || 'HIGH'} • লক্ষ্যমাত্রা: ${found.targetDate || 'চলতি বছর'}`,
        categoryBn: 'কমিটি উন্নয়ন ও কর্মপরিকল্পনা',
        statusBadge: {
          labelBn: isCompleted ? 'সম্পন্ন (100%)' : `চলমান (${found.progressPercentage || 0}%)`,
          variant: isCompleted ? 'emerald' : 'blue',
        },
        keyDetails: [
          { labelBn: 'প্ল্যান কোড (Plan Code)', value: found.planCode || found.id, isHighlight: true },
          { labelBn: 'মোট প্রাক্কলিত বাজেট', value: found.estimatedBudget || found.budget || 0, isCurrency: true },
          { labelBn: 'বর্তমান অগ্রগতি (%)', value: `${found.progressPercentage || 0}%`, isHighlight: true },
          { labelBn: 'বাস্তবায়নকারী উপ-কমিটি', value: found.subCommitteeName || 'মসজিদ উন্নয়ন উপ-কমিটি' },
          { labelBn: 'শুরুর তারিখ', value: found.startDate || 'N/A' },
          { labelBn: 'সমাপ্তির লক্ষ্যমাত্রা', value: found.targetDate || 'N/A' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'পরিকল্পনা ও বাজেট বিবরণ',
            labelEn: 'Plan Details',
            iconName: 'Target',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'progress',
            labelBn: 'অগ্রগতি আপডেট করুন',
            labelEn: 'Update Progress',
            descriptionBn: 'অগ্রগতি শতাংশ (%) পরিবর্তন',
            iconName: 'TrendingUp',
            color: 'emerald',
            actionType: 'PLAN_PROGRESS',
          },
          {
            id: 'milestone',
            labelBn: 'মাইলস্টোন যুক্ত করুন',
            labelEn: 'Add Milestone',
            descriptionBn: 'উপ-লক্ষ্য ও কাজের ধাপ এন্ট্রি',
            iconName: 'CheckCircle2',
            color: 'amber',
            actionType: 'PLAN_MILESTONE',
          },
          {
            id: 'evidence',
            labelBn: 'ডকুমেন্ট ও প্রমাণপত্র',
            labelEn: 'Add Evidence',
            descriptionBn: 'ছবি ও ভাউচার সংযুক্তি',
            iconName: 'Paperclip',
            color: 'slate',
            actionType: 'PLAN_EVIDENCE',
          },
          {
            id: 'print',
            labelBn: 'প্ল্যান রিপোর্ট প্রিন্ট',
            labelEn: 'Print Summary',
            descriptionBn: 'কার্যপরিকল্পনা কপি',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'committee',
        targetSubTab: 'action-plans',
      };
    }
  }

  // 5. CEMETERY PLOT / BURIAL Lookup (e.g. CEM-P-102, CEM-001)
  if (parsed.entityType === 'CEMETERY' || searchCode.startsWith('CEM-') || searchCode.startsWith('GRAVE-') || searchCode.startsWith('PLOT-')) {
    const cemeteries = collections.cemeteryRecords || [];
    const found = cemeteries.find((c) => {
      const code = (c.plotNumber || c.recordNumber || '').toUpperCase();
      const id = (c.id || '').toUpperCase();
      return (
        code === searchCode ||
        `CEM-${code}` === searchCode ||
        id === searchCode ||
        `CEM-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('CEMETERY', found);
      return {
        canonicalCode: canonical,
        entityType: 'CEMETERY',
        titleBn: `মরহুম ${found.deceasedNameBn || found.deceasedName || 'নাম উল্লেখ নেই'}`,
        titleEn: found.deceasedNameEn || found.deceasedName || 'Deceased Person',
        subtitleBn: `প্লট নং: ${found.plotNumber || 'N/A'} • ব্লক: ${found.blockNumber || 'কবরস্থান মূল ব্লক'}`,
        categoryBn: 'কবরস্থান ও দাফন রেজিস্ট্রি',
        statusBadge: {
          labelBn: found.status === 'OCCUPIED' ? 'দাফনকৃত (Occupied)' : 'সংরক্ষিত / বরাদ্দ',
          variant: 'slate',
        },
        keyDetails: [
          { labelBn: 'প্লট নম্বর (Plot No)', value: found.plotNumber || found.id, isHighlight: true },
          { labelBn: 'দাফনের তারিখ ও সময়', value: `${found.burialDate || 'N/A'} ${found.burialTime || ''}` },
          { labelBn: 'পিতার / স্বামীর নাম', value: found.fatherOrHusbandName || 'N/A' },
          { labelBn: 'ওয়ারিশ / যোগাযোগের ব্যক্তি', value: `${found.contactPerson || 'N/A'} (${found.contactPhone || ''})` },
          { labelBn: 'দাফন ও কবরস্থান ফি', value: found.burialFee || 0, isCurrency: true },
          { labelBn: 'স্থায়ী ঠিকানা / গ্রাম', value: found.permanentAddress || 'N/A' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'দাফন ও সনদের বিস্তারিত',
            labelEn: 'Burial Record',
            iconName: 'Eye',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'cert',
            labelBn: 'দাফন সনদ ও রসিদ',
            labelEn: 'Burial Certificate',
            descriptionBn: 'অফিসিয়াল মৃত্যু ও দাফন সনদ',
            iconName: 'FileText',
            color: 'emerald',
            actionType: 'CEMETERY_CERTIFICATE',
          },
          {
            id: 'print_marker',
            labelBn: 'কবর মার্কার স্টিকার প্রিন্ট',
            labelEn: 'Print Plot Marker',
            descriptionBn: 'প্লটের কিউআর ও বারকোড লেবেল',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'cemetery',
      };
    }
  }

  // 6. DONATION BOX Lookup (e.g. BOX-01, BOX-MAIN)
  if (parsed.entityType === 'DONATION_BOX' || searchCode.startsWith('BOX-') || searchCode.startsWith('DBOX-')) {
    const boxes = collections.donationBoxes || [];
    const found = boxes.find((b) => {
      const code = (b.boxCode || '').toUpperCase();
      const id = (b.id || '').toUpperCase();
      return (
        code === searchCode ||
        `BOX-${code}` === searchCode ||
        id === searchCode ||
        `BOX-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('DONATION_BOX', found);
      return {
        canonicalCode: canonical,
        entityType: 'DONATION_BOX',
        titleBn: found.nameBn || `দানবাক্স নং ${found.boxCode || ''}`,
        titleEn: found.nameEn || 'Donation Box',
        subtitleBn: `অবস্থান: ${found.location || 'মসজিদের প্রধান ফটক'} • ধরন: ${found.type || 'স্থায়ী কাঁচের বক্স'}`,
        categoryBn: 'দানবাক্স ও ক্যাশ কালেকশন',
        statusBadge: {
          labelBn: found.status === 'ACTIVE' || found.isActive ? 'সক্রিয় ও উন্মুক্ত' : 'নিষ্ক্রিয় / বন্ধ',
          variant: 'emerald',
        },
        keyDetails: [
          { labelBn: 'বাক্স নম্বর (Box Code)', value: found.boxCode || found.id, isHighlight: true },
          { labelBn: 'সর্বশেষ খোলার তারিখ', value: found.lastCollectionDate || 'সম্প্রতি গণনা করা হয়েছে' },
          { labelBn: 'সর্বশেষ কালেকশন পরিমাণ', value: found.lastCollectionAmount || 0, isCurrency: true },
          { labelBn: 'মোট ঐতিহাসিক কালেকশন', value: found.totalCollected || 0, isCurrency: true },
          { labelBn: 'চাবি জিম্মাদার ব্যক্তি', value: found.keyCustodian || 'মসজিদ কোষাধ্যক্ষ ও সভাপতি' },
        ],
        actions: [
          {
            id: 'collect',
            labelBn: 'কালেকশন ও নোট গণনা',
            labelEn: 'Count & Collect Cash',
            descriptionBn: 'বাক্স খুলে অর্থ গণনা ও জমা',
            iconName: 'Coins',
            color: 'emerald',
            actionType: 'BOX_COLLECT',
            isPrimary: true,
          },
          {
            id: 'history',
            labelBn: 'বিগত কালেকশনের ইতিহাস',
            labelEn: 'Collection History',
            descriptionBn: 'পূর্বে সংগৃহীত জমার তালিকা',
            iconName: 'History',
            color: 'slate',
            actionType: 'BOX_HISTORY',
          },
          {
            id: 'print_sticker',
            labelBn: 'বাক্সের সিকিউরিটি স্টিকার',
            labelEn: 'Print Box Tag',
            descriptionBn: 'দানবাক্সে লাগানোর বড় কিউআর স্টিকার',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'donations',
        targetSubTab: 'boxes',
      };
    }
  }

  // 7. INCOME RECEIPT Lookup (e.g. REC-2026-000106, INC-001)
  if (parsed.entityType === 'INCOME' || searchCode.startsWith('REC-') || searchCode.startsWith('INC-')) {
    const incomes = collections.incomes || [];
    const found = incomes.find((inc) => {
      const code = (inc.voucherNumber || inc.receiptNumber || '').toUpperCase();
      const id = (inc.id || '').toUpperCase();
      return (
        code === searchCode ||
        `REC-${code}` === searchCode ||
        `INC-${code}` === searchCode ||
        id === searchCode ||
        `REC-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('INCOME', found);
      return {
        canonicalCode: canonical,
        entityType: 'INCOME',
        titleBn: `আয় ও প্রাপ্তি রশিদ #${found.voucherNumber || found.id}`,
        titleEn: `Income Receipt #${found.voucherNumber || found.id}`,
        subtitleBn: `খাত: ${found.accountHeadNameBn || 'সাধারণ দান/আয়'} • গ্রহণকারী: ${found.collectedBy || 'মসজিদ কোষাধ্যক্ষ'}`,
        categoryBn: 'হিসাব ও অর্থ প্রাপ্তি',
        statusBadge: {
          labelBn: 'অনুমোদিত ও জমা সম্পন্ন',
          variant: 'emerald',
        },
        keyDetails: [
          { labelBn: 'রশিদ নম্বর (Receipt No)', value: found.voucherNumber || found.id, isHighlight: true },
          { labelBn: 'প্রাপ্তির তারিখ', value: found.date || 'N/A' },
          { labelBn: 'মোট জমার পরিমাণ (BDT)', value: found.amount || 0, isCurrency: true, isHighlight: true },
          { labelBn: 'দাতার নাম / উৎস', value: found.donorName || found.payerName || 'সাধারণ দাতা' },
          { labelBn: 'পেমেন্ট মেথড ও অ্যাকাউন্ট', value: `${found.paymentMethod || 'CASH'} (${found.accountName || 'ক্যাশ ইন হ্যান্ড'})` },
          { labelBn: 'বিবরণ / নোট', value: found.description || 'নিয়মিত আয়' },
        ],
        actions: [
          {
            id: 'receipt_print',
            labelBn: 'মানি রসিদ প্রিন্ট (Receipt)',
            labelEn: 'Print Receipt',
            iconName: 'Printer',
            color: 'emerald',
            actionType: 'PRINT_RECEIPT',
            isPrimary: true,
          },
          {
            id: 'duplicate',
            labelBn: 'এই খাতে নতুন এন্ট্রি',
            labelEn: 'New Entry in Head',
            iconName: 'Plus',
            color: 'blue',
            actionType: 'DUPLICATE_ENTRY',
          },
          {
            id: 'print_label',
            labelBn: 'ভাউচার কিউআর ও বারকোড',
            labelEn: 'Print QR Tag',
            iconName: 'QrCode',
            color: 'slate',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'income',
      };
    }
  }

  // 8. EXPENSE VOUCHER Lookup (e.g. EXP-2026-000084)
  if (parsed.entityType === 'EXPENSE' || searchCode.startsWith('EXP-')) {
    const expenses = collections.expenses || [];
    const found = expenses.find((exp) => {
      const code = (exp.voucherNumber || '').toUpperCase();
      const id = (exp.id || '').toUpperCase();
      return (
        code === searchCode ||
        `EXP-${code}` === searchCode ||
        id === searchCode ||
        `EXP-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('EXPENSE', found);
      return {
        canonicalCode: canonical,
        entityType: 'EXPENSE',
        titleBn: `ব্যয় ভাউচার #${found.voucherNumber || found.id}`,
        titleEn: `Expense Voucher #${found.voucherNumber || found.id}`,
        subtitleBn: `খাত: ${found.accountHeadNameBn || 'মসজিদ পরিচালনা ব্যয়'} • গ্রহীতা: ${found.payeeName || 'বিক্রেতা/সার্ভিস প্রোভাইডার'}`,
        categoryBn: 'হিসাব ও ব্যয় ভাউচার',
        statusBadge: {
          labelBn: 'অনুমোদিত ও পরিশোধিত',
          variant: 'rose',
        },
        keyDetails: [
          { labelBn: 'ভাউচার নম্বর (Voucher No)', value: found.voucherNumber || found.id, isHighlight: true },
          { labelBn: 'ব্যয়ের তারিখ', value: found.date || 'N/A' },
          { labelBn: 'মোট ব্যয়ের পরিমাণ (BDT)', value: found.amount || 0, isCurrency: true, isHighlight: true },
          { labelBn: 'টাকা গ্রহণকারী (Payee)', value: found.payeeName || 'সংশ্লিষ্ট ব্যক্তি/প্রতিষ্ঠান' },
          { labelBn: 'পরিশোধ মাধ্যম', value: `${found.paymentMethod || 'CASH'} (${found.accountName || 'ক্যাশ অ্যাকাউন্ট'})` },
          { labelBn: 'ব্যয়ের বিশদ উদ্দেশ্য', value: found.description || 'মসজিদের জরুরি রক্ষণাবেক্ষণ ও খরচ' },
        ],
        actions: [
          {
            id: 'voucher_print',
            labelBn: 'ব্যয় ভাউচার প্রিন্ট',
            labelEn: 'Print Voucher',
            iconName: 'Printer',
            color: 'rose',
            actionType: 'PRINT_RECEIPT',
            isPrimary: true,
          },
          {
            id: 'duplicate',
            labelBn: 'এই খাতে নতুন ব্যয়',
            labelEn: 'New Expense in Head',
            iconName: 'Plus',
            color: 'amber',
            actionType: 'DUPLICATE_ENTRY',
          },
          {
            id: 'print_label',
            labelBn: 'ভাউচার কিউআর ও বারকোড',
            labelEn: 'Print QR Tag',
            iconName: 'QrCode',
            color: 'slate',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'expense',
      };
    }
  }

  // 9. DONATION Lookup (e.g. DON-2026-000055)
  if (parsed.entityType === 'DONATION' || searchCode.startsWith('DON-')) {
    const donations = collections.donations || [];
    const found = donations.find((d) => {
      const code = (d.receiptNumber || '').toUpperCase();
      const id = (d.id || '').toUpperCase();
      return (
        code === searchCode ||
        `DON-${code}` === searchCode ||
        id === searchCode ||
        `DON-${id}` === searchCode ||
        code === cleanBare ||
        id === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('DONATION', found);
      return {
        canonicalCode: canonical,
        entityType: 'DONATION',
        titleBn: `দান ও অনুদান রশিদ #${found.receiptNumber || found.id}`,
        titleEn: `Donation Receipt #${found.receiptNumber || found.id}`,
        subtitleBn: `দাতা: ${found.donorName || 'এক আল্লাহর বান্দা'} • খাত: ${found.category || 'সাধারণ দান'}`,
        categoryBn: 'দান ও অনুদান',
        statusBadge: {
          labelBn: 'দান গৃহীত ও রসিদ জারি',
          variant: 'emerald',
        },
        keyDetails: [
          { labelBn: 'রশিদ নম্বর', value: found.receiptNumber || found.id, isHighlight: true },
          { labelBn: 'দানের তারিখ', value: found.date || 'N/A' },
          { labelBn: 'দানের পরিমাণ (BDT)', value: found.amount || 0, isCurrency: true, isHighlight: true },
          { labelBn: 'দাতার নাম ও ফোন', value: `${found.donorName || 'বেনামী'} (${found.donorPhone || 'N/A'})` },
          { labelBn: 'জমা অ্যাকাউন্ট', value: found.accountName || 'মসজিদ সাধারণ তহবিল' },
        ],
        actions: [
          {
            id: 'print_receipt',
            labelBn: 'দানের মানি রসিদ প্রিন্ট',
            labelEn: 'Print Receipt',
            iconName: 'Printer',
            color: 'emerald',
            actionType: 'PRINT_RECEIPT',
            isPrimary: true,
          },
          {
            id: 'print_tag',
            labelBn: 'রসিদ কিউআর লেবেল',
            labelEn: 'Print Tag',
            iconName: 'QrCode',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'donations',
      };
    }
  }

  // 10. JUMA COLLECTION Lookup (e.g. JUM-2026-08-28)
  if (parsed.entityType === 'JUMA_COLLECTION' || searchCode.startsWith('JUM-')) {
    return {
      canonicalCode: searchCode,
      entityType: 'JUMA_COLLECTION',
      titleBn: 'জুমা জামাত কালেকশন রেকর্ড',
      titleEn: 'Juma Gathering Collection Record',
      subtitleBn: 'পবিত্র জুমার জামাতে মুসল্লিদের স্বতঃস্ফূর্ত দান',
      categoryBn: 'জুমা কালেকশন',
      statusBadge: {
        labelBn: 'হিসাব সম্পন্ন',
        variant: 'emerald',
      },
      keyDetails: [
        { labelBn: 'কালেকশন কোড', value: searchCode, isHighlight: true },
        { labelBn: 'তারিখ', value: cleanBare || 'সম্প্রতি অনুষ্ঠিত জুমা' },
        { labelBn: 'গণনা ও তদারকি টিম', value: 'ইমাম, কোষাধ্যক্ষ ও খাদেম' },
      ],
      actions: [
        {
          id: 'juma_view',
          labelBn: 'জুমা কালেকশন রেজিস্টার',
          labelEn: 'View Juma Log',
          iconName: 'Users',
          color: 'cyan',
          actionType: 'VIEW_DETAILS',
          isPrimary: true,
        },
        {
          id: 'print_tag',
          labelBn: 'কিউআর ও বারকোড প্রিন্ট',
          labelEn: 'Print Tag',
          iconName: 'Printer',
          color: 'slate',
          actionType: 'PRINT_LABEL',
        },
      ],
      rawRecord: { code: searchCode },
      targetTab: 'donations',
      targetSubTab: 'juma',
    };
  }

  // 11. COMMITTEE MEMBER Lookup (e.g. MEM-001, MEM-P-01)
  if (parsed.entityType === 'COMMITTEE_MEMBER' || searchCode.startsWith('MEM-')) {
    const members = collections.committeeMembers || [];
    const found = members.find((m) => {
      const id = (m.id || '').toUpperCase();
      const code = (m.memberCode || m.code || '').toUpperCase();
      return (
        id === searchCode ||
        `MEM-${id}` === searchCode ||
        code === searchCode ||
        `MEM-${code}` === searchCode ||
        id === cleanBare ||
        code === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('COMMITTEE_MEMBER', found);
      return {
        canonicalCode: canonical,
        entityType: 'COMMITTEE_MEMBER',
        titleBn: found.nameBn || found.name || 'কমিটি সদস্য',
        titleEn: found.nameEn || found.name || 'Committee Member',
        subtitleBn: `পদবি: ${found.designationBn || found.designation || 'সদস্য'} • মেয়াদ: ${found.termName || 'বর্তমান কার্যনির্বাহী কমিটি'}`,
        categoryBn: 'কমিটি পরিচালনা পরিষদ',
        statusBadge: {
          labelBn: found.status === 'ACTIVE' || found.isActive ? 'সক্রিয় সদস্য' : 'সাবেক / নিষ্ক্রিয়',
          variant: 'emerald',
        },
        keyDetails: [
          { labelBn: 'সদস্য কোড (Member ID)', value: found.id || found.memberCode, isHighlight: true },
          { labelBn: 'পদবি ও দায়িত্ব', value: found.designationBn || found.designation || 'সদস্য' },
          { labelBn: 'মোবাইল নম্বর', value: found.phone || found.mobile || 'উল্লেখ নেই' },
          { labelBn: 'পেশা / ঠিকানা', value: found.profession || found.address || 'N/A' },
          { labelBn: 'যোগদানের তারিখ', value: found.joinedDate || found.startDate || 'N/A' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'সদস্য পরিচিতি ও বিবরণ',
            labelEn: 'Member Profile',
            iconName: 'UserCheck',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'print_id',
            labelBn: 'কমিটি পরিচয়পত্র প্রিন্ট',
            labelEn: 'Print Committee ID',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'committee',
        targetSubTab: 'members',
      };
    }
  }

  // 12. SUB-COMMITTEE Lookup (e.g. SUB-001, SUB-DEV-01)
  if (parsed.entityType === 'SUB_COMMITTEE' || searchCode.startsWith('SUB-')) {
    const subCommittees = collections.subCommittees || [];
    const found = subCommittees.find((s) => {
      const id = (s.id || '').toUpperCase();
      const code = (s.subCommitteeCode || s.code || '').toUpperCase();
      return (
        id === searchCode ||
        `SUB-${id}` === searchCode ||
        code === searchCode ||
        `SUB-${code}` === searchCode ||
        id === cleanBare ||
        code === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('SUB_COMMITTEE', found);
      return {
        canonicalCode: canonical,
        entityType: 'SUB_COMMITTEE',
        titleBn: found.nameBn || found.name || 'উপ-কমিটি',
        titleEn: found.nameEn || found.name || 'Sub-Committee',
        subtitleBn: `আহ্বায়ক: ${found.convenerName || 'নির্ধারিত নয়'} • সদস্য সংখ্যা: ${found.memberCount || found.members?.length || 0}`,
        categoryBn: 'উপ-কমিটি ও বিশেষ সেল',
        statusBadge: {
          labelBn: found.status === 'ACTIVE' || found.isActive ? 'কার্যকর' : 'স্থগিত',
          variant: 'blue',
        },
        keyDetails: [
          { labelBn: 'উপ-কমিটি কোড', value: found.subCommitteeCode || found.id, isHighlight: true },
          { labelBn: 'আহ্বায়ক / সভাপতি', value: found.convenerName || 'নির্ধারিত নয়' },
          { labelBn: 'সদস্য সচিব', value: found.secretaryName || 'নির্ধারিত নয়' },
          { labelBn: 'মূল দায়িত্ব ও ক্ষেত্র', value: found.purpose || found.description || 'মসজিদের বিশেষ কার্যক্রম বাস্তবায়ন' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'উপ-কমিটি পোর্টফোলিও',
            labelEn: 'Sub-Committee Details',
            iconName: 'Building',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'print_tag',
            labelBn: 'উপ-কমিটি অফিসিয়াল ট্যাগ',
            labelEn: 'Print Tag',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'committee',
        targetSubTab: 'sub-committees',
      };
    }
  }

  // 13. MEETING / RESOLUTION Lookup (e.g. MTG-001, RES-001, MM-2026-001)
  if (parsed.entityType === 'MEETING' || searchCode.startsWith('MTG-') || searchCode.startsWith('RES-') || searchCode.startsWith('MM-') || searchCode.startsWith('MJMWS-')) {
    const meetings = collections.meetings || [];
    const found = meetings.find((m) => {
      const id = (m.id || '').toUpperCase();
      const memo = (m.memoNo || m.meetingNumber || m.serialNumber || '').toUpperCase();
      return (
        id === searchCode ||
        `MTG-${id}` === searchCode ||
        `RES-${id}` === searchCode ||
        memo === searchCode ||
        `MTG-${memo}` === searchCode ||
        `RES-${memo}` === searchCode ||
        id === cleanBare ||
        memo === cleanBare
      );
    });

    if (found) {
      const canonical = getEntityCanonicalCode('MEETING', found);
      return {
        canonicalCode: canonical,
        entityType: 'MEETING',
        titleBn: found.titleBn || found.title || `মিটিং ও রেজুলেশন #${found.memoNo || found.id}`,
        titleEn: found.titleEn || found.title || 'Committee Meeting & Resolution',
        subtitleBn: `তারিখ: ${found.date || 'N/A'} • ধরন: ${found.meetingType || 'সাধারণ সভা'}`,
        categoryBn: 'কমিটি মিটিং ও রেজুলেশন',
        statusBadge: {
          labelBn: found.status === 'COMPLETED' || found.status === 'APPROVED' ? 'অনুমোদিত ও সংরক্ষিত' : 'চলমান / খসড়া',
          variant: 'purple',
        },
        keyDetails: [
          { labelBn: 'স্মারক / মিটিং নম্বর', value: found.memoNo || found.id, isHighlight: true },
          { labelBn: 'তারিখ ও সময়', value: `${found.date || 'N/A'} ${found.time || ''}` },
          { labelBn: 'সভাপতিত্ব করেছেন', value: found.chairpersonName || 'কমিটি সভাপতি' },
          { labelBn: 'উপস্থিত সদস্য সংখ্যা', value: found.attendeesCount || found.attendees?.length || 0 },
          { labelBn: 'গৃহীত সিদ্ধান্ত / রেজুলেশন', value: found.resolutionsSummary || found.description || 'সিদ্ধান্তসমূহ নথিবদ্ধ রয়েছে' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'কার্যবিবরণী ও রেজুলেশন পাঠ',
            labelEn: 'Meeting Minutes',
            iconName: 'FileText',
            color: 'purple',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'print_minutes',
            labelBn: 'রেজুলেশন কপি প্রিন্ট',
            labelEn: 'Print Minutes',
            iconName: 'Printer',
            color: 'indigo',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'committee',
        targetSubTab: 'meetings',
      };
    }
  }

  return null;
}

/**
 * Web Audio API Beep Synthesizer for instant scan feedback
 */
export function playScanSuccessSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.08);

    // Second tone (1320 Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Silent fail if audio is disabled by browser policies
  }
}

export function playScanErrorSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Silent fail
  }
}

/**
 * Mobile Haptic Vibration Trigger
 */
export function triggerHapticFeedback(pattern: number[] = [60, 40, 60]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

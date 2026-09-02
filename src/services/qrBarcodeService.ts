import QRCode from 'qrcode';
import {
  UniversalPrefix,
  QrEntityType,
  QrActionKey,
  QrScanResult,
  QrActionDefinition,
  RecordSpecificAction,
  ResolvedRecordItem,
  QRDestinationType,
  QRCodeEntity,
  QRType,
  DenominationBreakdown,
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
  QRDestinationType,
  QRCodeEntity,
  QRType,
  DenominationBreakdown,
};

export const MODULE_ACTIONS: QrActionDefinition[] = [
  // 1. Accounting & Finance
  {
    id: 'ACT-INC-NEW',
    destinationType: 'INCOME_NEW',
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
    destinationType: 'EXPENSE_NEW',
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
    destinationType: 'FUND_TRANSFER',
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

  // 2. Donation & Collections
  {
    id: 'ACT-DON-NEW',
    destinationType: 'DONATION_NEW',
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
    destinationType: 'DONATION_BOX_COLLECTION',
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
    destinationType: 'JUMUAH_COLLECTION',
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
    destinationType: 'STAFF_SALARY',
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
    destinationType: 'STAFF_FESTIVAL',
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
    destinationType: 'WAQF_PROPERTY',
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
    destinationType: 'WAQF_RENT',
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
    destinationType: 'ASSET_NEW',
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
    destinationType: 'ASSET_SERVICE',
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
    destinationType: 'ASSET_SERVICE',
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
    destinationType: 'CEMETERY_BURIAL',
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
    destinationType: 'COMMITTEE_MEETING',
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
    destinationType: 'COMMITTEE_MEETING',
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
    destinationType: 'COMMITTEE_MEETING',
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
    destinationType: 'COMMITTEE_MEETING',
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

export const STANDARD_MOSQUE_QR_PRESETS: Array<{
  name: string;
  type: QRType;
  destinationType: QRDestinationType;
  description: string;
}> = [
  {
    name: 'মসজিদ পাবলিক পোর্টাল',
    type: 'PUBLIC',
    destinationType: 'PUBLIC_PORTAL',
    description: 'সাধারণ মুসল্লিদের জন্য মসজিদের ডিজিটাল পোর্টাল ও পরিচিতি',
  },
  {
    name: 'অনলাইন দান ও সাদাকাহ',
    type: 'PUBLIC',
    destinationType: 'DONATION',
    description: 'মোবাইল ব্যাংকিং ও অনলাইন মাধ্যমে দ্রুত দান করার পাবলিক QR',
  },
  {
    name: 'নামাজের সময়সূচি ও জামাত',
    type: 'PUBLIC',
    destinationType: 'PRAYER_SCHEDULE',
    description: 'লাইভ ওয়াক্ত, আজান ও জামাতের সময়সূচি দেখার জন্য',
  },
  {
    name: 'রমজান ক্যালেন্ডার ও সেহরি-ইফতার',
    type: 'PUBLIC',
    destinationType: 'RAMADAN_CALENDAR',
    description: 'পবিত্র মাহে রমজানের সেহরি ও ইফতারের সময়সূচি',
  },
  {
    name: 'মসজিদ নোটিশ বোর্ড ও ঘোষণা',
    type: 'PUBLIC',
    destinationType: 'NOTICE_BOARD',
    description: 'মসজিদের জরুরি নোটিশ, ঘোষণা ও বিশেষ বয়ান সূচি',
  },
  {
    name: 'কুইক আয় এন্ট্রি (হিসাবরক্ষক টেবিল)',
    type: 'OPERATIONAL',
    destinationType: 'INCOME_NEW',
    description: 'হিসাবরক্ষক বা ক্যাশিয়ারের টেবিলে দ্রুত আয় এন্ট্রির জন্য',
  },
  {
    name: 'কুইক ব্যয় এন্ট্রি ও ভাউচার',
    type: 'OPERATIONAL',
    destinationType: 'EXPENSE_NEW',
    description: 'দৈনন্দিন কেনাকাটা ও খরচের ভাউচার তাৎক্ষণিক এন্ট্রি',
  },
  {
    name: 'জুমার জামাত কালেকশন কাউন্টার',
    type: 'OPERATIONAL',
    destinationType: 'JUMUAH_COLLECTION',
    description: 'পবিত্র জুমার জামাতের নগদ টাকা গণনা ও জমার এন্ট্রি',
  },
  {
    name: 'প্রধান দানবাক্স কালেকশন',
    type: 'OPERATIONAL',
    destinationType: 'DONATION_BOX_COLLECTION',
    description: 'মসজিদ গেটের দানবাক্স খুলে ক্যাশ গণনা ও ব্যাংক ভাউচার',
  },
  {
    name: 'স্টাফ মাসিক বেতন ও হাদিয়া প্রদান',
    type: 'OPERATIONAL',
    destinationType: 'STAFF_SALARY',
    description: 'ইমাম, মুয়াজ্জিন ও খাদেমদের বেতন পরিশোধ ও রসিদ',
  },
  {
    name: 'ওয়াকফ দোকান ও মার্কেট ভাড়া আদায়',
    type: 'OPERATIONAL',
    destinationType: 'WAQF_RENT',
    description: 'ওয়াকফ দোকানের মাসিক ভাড়া গ্রহণ ও ভাড়াটিয়া রসিদ',
  },
  {
    name: 'মসজিদ সম্পদ ও এসি সার্ভিসিং রেকর্ড',
    type: 'OPERATIONAL',
    destinationType: 'ASSET_SERVICE',
    description: 'এসি, জেনারেটর, মাইক সার্ভিসিং ও মেরামত ব্যয় রেকর্ড',
  },
  {
    name: 'কবরস্থান দাফন ও প্লট রেজিস্ট্রি',
    type: 'OPERATIONAL',
    destinationType: 'CEMETERY_BURIAL',
    description: 'কবরস্থান অফিসে তাৎক্ষণিক দাফন ও প্লট নম্বর এন্ট্রি',
  },
  {
    name: 'কমিটি মিটিং ও কার্যবিবরণী',
    type: 'OPERATIONAL',
    destinationType: 'COMMITTEE_MEETING',
    description: 'কার্যনির্বাহী কমিটির মিটিং উপস্থিতি ও সিদ্ধান্ত রেজিস্টার',
  },
];

/**
 * Universal QR Payload Generator
 */
export function buildQrPayload(codeOrToken: string, origin?: string): string {
  const clean = codeOrToken.trim();
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return `/quick/${clean}`;
  return `${base}/quick/${clean}`;
}

/**
 * Generates high quality Base64 PNG data URL of a QR code
 */
export async function generateQrDataUrl(
  payload: string,
  options?: { width?: number; margin?: number; color?: { dark?: string; light?: string } }
): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      width: options?.width || 300,
      margin: options?.margin ?? 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    return '';
  }
}

/**
 * Generates clean SVG string of a QR code
 */
export async function generateQrSvgString(
  payload: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  try {
    return await QRCode.toString(payload, {
      type: 'svg',
      width: options?.width || 300,
      margin: options?.margin ?? 2,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR SVG string:', err);
    return '';
  }
}

/**
 * Extracts and cleans the raw code from a QR URL, deep link, query string, or direct barcode text
 */
export function extractCodeFromPayload(payload: string): string {
  if (!payload) return '';
  let text = payload.trim();

  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      // Check query params ?qr=token or ?action=ACT-...
      const qrParam = url.searchParams.get('qr');
      const actionParam = url.searchParams.get('action');
      const quickParam = url.searchParams.get('quick');
      if (qrParam) return qrParam.trim();
      if (actionParam) return actionParam.trim();
      if (quickParam) return quickParam.trim();

      const pathname = url.pathname;
      const quickIndex = pathname.indexOf('/quick/');
      const qrIndex = pathname.indexOf('/qr/');
      const scanIndex = pathname.indexOf('/scan/');

      if (quickIndex !== -1) {
        text = decodeURIComponent(pathname.substring(quickIndex + 7));
      } else if (qrIndex !== -1) {
        text = decodeURIComponent(pathname.substring(qrIndex + 4));
      } else if (scanIndex !== -1) {
        text = decodeURIComponent(pathname.substring(scanIndex + 6));
      } else {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          text = decodeURIComponent(segments[segments.length - 1]);
        }
      }

      // Check hash route (e.g. #/quick/income)
      if (url.hash) {
        const hash = url.hash.replace(/^#\/?/, '');
        if (hash.startsWith('quick/')) {
          text = hash.replace('quick/', '');
        }
      }
    } else if (text.startsWith('masjidledger://quick/')) {
      text = decodeURIComponent(text.replace('masjidledger://quick/', ''));
    } else if (text.startsWith('masjidledger://scan/')) {
      text = decodeURIComponent(text.replace('masjidledger://scan/', ''));
    } else if (text.startsWith('/quick/')) {
      text = decodeURIComponent(text.replace('/quick/', ''));
    } else if (text.startsWith('/qr/')) {
      text = decodeURIComponent(text.replace('/qr/', ''));
    } else if (text.startsWith('/scan/')) {
      text = decodeURIComponent(text.replace('/scan/', ''));
    }
  } catch {
    // URL parsing fallback
  }

  return text.split('?')[0].replace(/\/+$/, '').trim();
}

/**
 * Maps QR Destination type to standard Action Definition
 */
export function getActionByDestination(destination: QRDestinationType): QrActionDefinition | undefined {
  return MODULE_ACTIONS.find((a) => a.destinationType === destination);
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

  // 1. Check if it's a generated token (starts with "token-" or contains UUID/timestamp)
  if (code.startsWith('token-') || code.startsWith('qr-token-')) {
    return {
      raw: rawPayload,
      type: 'TOKEN',
      code: code,
      token: code,
    };
  }

  const upperCode = code.toUpperCase();

  // Public Shortcuts
  if (upperCode === 'PUBLIC' || upperCode === 'PORTAL' || upperCode === 'PUBLIC-PORTAL' || upperCode === 'PUBLIC_PORTAL') {
    return {
      raw: rawPayload,
      type: 'ACTION',
      code: 'PUBLIC_PORTAL',
      destinationType: 'PUBLIC_PORTAL',
      actionTitleBn: 'মসজিদ পাবলিক পোর্টাল',
      targetTab: 'publicPortal',
      isPublic: true,
    };
  }

  if (upperCode === 'DONATION' || upperCode === 'DONATE' || upperCode === 'ONLINE-DONATION' || upperCode === 'SADAKAH') {
    return {
      raw: rawPayload,
      type: 'ACTION',
      code: 'DONATION',
      destinationType: 'DONATION',
      actionTitleBn: 'অনলাইন দান ও সাদাকাহ',
      targetTab: 'publicPortal',
      targetSubTab: 'donation',
      isPublic: true,
    };
  }

  if (upperCode === 'PRAYER' || upperCode === 'NAMAZ' || upperCode === 'PRAYER-SCHEDULE' || upperCode === 'PRAYER_SCHEDULE') {
    return {
      raw: rawPayload,
      type: 'ACTION',
      code: 'PRAYER_SCHEDULE',
      destinationType: 'PRAYER_SCHEDULE',
      actionTitleBn: 'নামাজের সময়সূচি ও জামাত',
      targetTab: 'publicPortal',
      targetSubTab: 'prayer',
      isPublic: true,
    };
  }

  if (upperCode === 'RAMADAN' || upperCode === 'RAMADAN-CALENDAR' || upperCode === 'RAMADAN_CALENDAR' || upperCode === 'SEHRI-IFTAR') {
    return {
      raw: rawPayload,
      type: 'ACTION',
      code: 'RAMADAN_CALENDAR',
      destinationType: 'RAMADAN_CALENDAR',
      actionTitleBn: 'রমজান ও সেহরি-ইফতার ক্যালেন্ডার',
      targetTab: 'publicPortal',
      targetSubTab: 'ramadan',
      isPublic: true,
    };
  }

  if (upperCode === 'NOTICES' || upperCode === 'NOTICE' || upperCode === 'NOTICE-BOARD' || upperCode === 'NOTICE_BOARD') {
    return {
      raw: rawPayload,
      type: 'ACTION',
      code: 'NOTICE_BOARD',
      destinationType: 'NOTICE_BOARD',
      actionTitleBn: 'মসজিদ নোটিশ বোর্ড',
      targetTab: 'publicPortal',
      targetSubTab: 'notices',
      isPublic: true,
    };
  }

  // Operational Action Aliases
  const ACTION_ALIASES: Record<string, { key: QrActionKey; destination: QRDestinationType }> = {
    'NEW-INCOME': { key: 'ACT-INC-NEW', destination: 'INCOME_NEW' },
    'NEW_INCOME': { key: 'ACT-INC-NEW', destination: 'INCOME_NEW' },
    'INCOME-NEW': { key: 'ACT-INC-NEW', destination: 'INCOME_NEW' },
    'INCOME_NEW': { key: 'ACT-INC-NEW', destination: 'INCOME_NEW' },
    'INCOME': { key: 'ACT-INC-NEW', destination: 'INCOME_NEW' },

    'NEW-EXPENSE': { key: 'ACT-EXP-NEW', destination: 'EXPENSE_NEW' },
    'NEW_EXPENSE': { key: 'ACT-EXP-NEW', destination: 'EXPENSE_NEW' },
    'EXPENSE-NEW': { key: 'ACT-EXP-NEW', destination: 'EXPENSE_NEW' },
    'EXPENSE_NEW': { key: 'ACT-EXP-NEW', destination: 'EXPENSE_NEW' },
    'EXPENSE': { key: 'ACT-EXP-NEW', destination: 'EXPENSE_NEW' },

    'NEW-DONATION': { key: 'ACT-DON-NEW', destination: 'DONATION_NEW' },
    'NEW_DONATION': { key: 'ACT-DON-NEW', destination: 'DONATION_NEW' },
    'DONATION-NEW': { key: 'ACT-DON-NEW', destination: 'DONATION_NEW' },
    'DONATION_NEW': { key: 'ACT-DON-NEW', destination: 'DONATION_NEW' },

    'NEW-JUMA': { key: 'ACT-JUM-COLLECT', destination: 'JUMUAH_COLLECTION' },
    'NEW_JUMA': { key: 'ACT-JUM-COLLECT', destination: 'JUMUAH_COLLECTION' },
    'JUMA-COLLECT': { key: 'ACT-JUM-COLLECT', destination: 'JUMUAH_COLLECTION' },
    'JUMUAH-COLLECTION': { key: 'ACT-JUM-COLLECT', destination: 'JUMUAH_COLLECTION' },
    'JUMUAH_COLLECTION': { key: 'ACT-JUM-COLLECT', destination: 'JUMUAH_COLLECTION' },
    'JUMA': { key: 'ACT-JUM-COLLECT', destination: 'JUMUAH_COLLECTION' },

    'DONATION-BOX': { key: 'ACT-BOX-COLLECT', destination: 'DONATION_BOX_COLLECTION' },
    'DONATION_BOX': { key: 'ACT-BOX-COLLECT', destination: 'DONATION_BOX_COLLECTION' },
    'DONATION-BOX-COLLECT': { key: 'ACT-BOX-COLLECT', destination: 'DONATION_BOX_COLLECTION' },
    'DONATION_BOX_COLLECTION': { key: 'ACT-BOX-COLLECT', destination: 'DONATION_BOX_COLLECTION' },
    'BOX-COLLECT': { key: 'ACT-BOX-COLLECT', destination: 'DONATION_BOX_COLLECTION' },

    'SALARY-PAY': { key: 'ACT-STF-SALARY', destination: 'STAFF_SALARY' },
    'PAY-SALARY': { key: 'ACT-STF-SALARY', destination: 'STAFF_SALARY' },
    'STAFF-SALARY': { key: 'ACT-STF-SALARY', destination: 'STAFF_SALARY' },
    'STAFF_SALARY': { key: 'ACT-STF-SALARY', destination: 'STAFF_SALARY' },

    'STAFF-FESTIVAL': { key: 'ACT-STF-FESTIVAL', destination: 'STAFF_FESTIVAL' },
    'STAFF_FESTIVAL': { key: 'ACT-STF-FESTIVAL', destination: 'STAFF_FESTIVAL' },

    'WAQF-RENT': { key: 'ACT-WPF-RENT', destination: 'WAQF_RENT' },
    'WAQF_RENT': { key: 'ACT-WPF-RENT', destination: 'WAQF_RENT' },
    'RENT-COLLECT': { key: 'ACT-WPF-RENT', destination: 'WAQF_RENT' },

    'WAQF-PROPERTY': { key: 'ACT-WPF-NEW', destination: 'WAQF_PROPERTY' },
    'WAQF_PROPERTY': { key: 'ACT-WPF-NEW', destination: 'WAQF_PROPERTY' },

    'ASSET-SERVICE': { key: 'ACT-AST-SERVICE', destination: 'ASSET_SERVICE' },
    'ASSET_SERVICE': { key: 'ACT-AST-SERVICE', destination: 'ASSET_SERVICE' },
    'SERVICE-ENTRY': { key: 'ACT-AST-SERVICE', destination: 'ASSET_SERVICE' },

    'ASSET-NEW': { key: 'ACT-AST-NEW', destination: 'ASSET_NEW' },
    'ASSET_NEW': { key: 'ACT-AST-NEW', destination: 'ASSET_NEW' },

    'CEMETERY-BURIAL': { key: 'ACT-CEM-BURIAL', destination: 'CEMETERY_BURIAL' },
    'CEMETERY_BURIAL': { key: 'ACT-CEM-BURIAL', destination: 'CEMETERY_BURIAL' },
    'NEW-BURIAL': { key: 'ACT-CEM-BURIAL', destination: 'CEMETERY_BURIAL' },

    'COMMITTEE-MEETING': { key: 'ACT-MTG-NEW', destination: 'COMMITTEE_MEETING' },
    'COMMITTEE_MEETING': { key: 'ACT-MTG-NEW', destination: 'COMMITTEE_MEETING' },
    'MEETING-NEW': { key: 'ACT-MTG-NEW', destination: 'COMMITTEE_MEETING' },

    'FUND-TRANSFER': { key: 'ACT-TRF-NEW', destination: 'FUND_TRANSFER' },
    'FUND_TRANSFER': { key: 'ACT-TRF-NEW', destination: 'FUND_TRANSFER' },
  };

  if (ACTION_ALIASES[upperCode]) {
    const matched = ACTION_ALIASES[upperCode];
    const actionDef = MODULE_ACTIONS.find((a) => a.id === matched.key);
    if (actionDef) {
      return {
        raw: rawPayload,
        type: 'ACTION',
        prefix: 'ACT',
        code: actionDef.id,
        actionKey: actionDef.id,
        destinationType: matched.destination,
        actionTitleBn: actionDef.titleBn,
        actionTitleEn: actionDef.titleEn,
        targetTab: actionDef.targetTab,
        targetSubTab: actionDef.targetSubTab,
        requiredPermission: actionDef.requiredPermission,
      };
    }
  }

  if (code.startsWith('ACT-') || code.startsWith('ACT_')) {
    const cleanKey = code.replace('_', '-') as QrActionKey;
    const actionDef = MODULE_ACTIONS.find((a) => a.id === cleanKey);
    if (actionDef) {
      return {
        raw: rawPayload,
        type: 'ACTION',
        prefix: 'ACT',
        code: actionDef.id,
        actionKey: actionDef.id,
        destinationType: actionDef.destinationType,
        actionTitleBn: actionDef.titleBn,
        actionTitleEn: actionDef.titleEn,
        targetTab: actionDef.targetTab,
        targetSubTab: actionDef.targetSubTab,
        requiredPermission: actionDef.requiredPermission,
      };
    }
  }

  // 2. Entity Record Identification Prefixes
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

  if (upperCode.startsWith('BOX-') || upperCode.startsWith('DBOX-')) {
    return {
      raw: rawPayload,
      type: 'RECORD',
      prefix: 'BOX',
      code: code,
      entityType: 'DONATION_BOX',
      targetTab: 'donations',
      targetSubTab: 'boxes',
      recordIdOrNumber: code,
      actionTitleBn: 'দানবাক্স রেকর্ড ও কালেকশন',
      actionTitleEn: 'Donation Box',
      requiredPermission: 'CREATE_INCOME',
    };
  }

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
  if (result.isPublic) {
    return { allowed: true };
  }

  if (!currentUser) {
    return {
      allowed: false,
      reasonBn: 'এই কার্যক্রম পরিচালনা করতে প্রথমে সিস্টেমে লগইন করুন।',
      reasonEn: 'Please log in to system to view this record or execute action.',
    };
  }

  if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'MOSQUE_ADMIN') {
    return { allowed: true };
  }

  if (!result.requiredPermission) {
    return { allowed: true };
  }

  const hasPerm = currentUser.permissions?.includes(result.requiredPermission as any);
  if (hasPerm) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reasonBn: `আপনার বর্তমান অ্যাকাউন্ট এই মডিউলের জন্য অনুমোদিত নয় (${currentUser.role})।`,
    reasonEn: `Your user role (${currentUser.role}) does not have permission for this module.`,
  };
}

/**
 * Canonical Unique Identifier Generation for Existing Entities
 */
export function getEntityCanonicalCode(entityType: QrEntityType, record: any): string {
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
      return `TEN-${record.tenantPhone || record.id}`;

    case 'CEMETERY':
      return record.plotNumber?.startsWith('CEM-')
        ? record.plotNumber
        : `CEM-${record.plotNumber || record.id}`;

    case 'ACTION_PLAN':
      return record.planCode?.startsWith('CAP-')
        ? record.planCode
        : `CAP-${record.planCode || record.id}`;

    case 'SUB_COMMITTEE':
      return `SUB-${record.code || record.id}`;

    case 'COMMITTEE_MEMBER':
      return `MEM-${record.phone || record.id}`;

    case 'MEETING':
      return record.memoNo?.startsWith('MTG-')
        ? record.memoNo
        : `MTG-${record.memoNo || record.id}`;

    default:
      return `${record.id || 'ITEM'}`;
  }
}

/**
 * Resolves full entity details from local state collections
 */
export function resolveRecordFromSystem(
  code: string,
  stateCollections: {
    incomes?: any[];
    expenses?: any[];
    donations?: any[];
    donationBoxes?: any[];
    staff?: any[];
    staffPayments?: any[];
    assets?: any[];
    properties?: any[];
    cemetery?: any[];
    members?: any[];
    subCommittees?: any[];
    resolutions?: any[];
    meetings?: any[];
  }
): ResolvedRecordItem | null {
  const cleanCode = extractCodeFromPayload(code).toUpperCase();
  if (!cleanCode) return null;

  // 1. Check Income Receipts
  if (cleanCode.startsWith('REC-') || cleanCode.startsWith('INC-')) {
    const idOrVoucher = cleanCode.replace(/^REC-/, '').replace(/^INC-/, '');
    const found = stateCollections.incomes?.find(
      (i) =>
        i.voucherNumber?.toUpperCase() === cleanCode ||
        i.voucherNumber?.toUpperCase() === idOrVoucher ||
        i.id === idOrVoucher ||
        i.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('INCOME', found);
      return {
        canonicalCode: canonical,
        entityType: 'INCOME',
        titleBn: `আয় রশিদ #${found.voucherNumber || found.id}`,
        titleEn: `Income Receipt #${found.voucherNumber || found.id}`,
        subtitleBn: `খাত: ${found.accountHeadNameBn || 'সাধারণ আয়'} • তারিখ: ${found.date}`,
        categoryBn: 'আয় ও প্রাপ্তি',
        statusBadge: {
          labelBn: found.status === 'REVERSED' ? 'বাতিলকৃত' : 'পরিশোধিত / গৃহীত',
          variant: found.status === 'REVERSED' ? 'rose' : 'emerald',
        },
        keyDetails: [
          { labelBn: 'রশিদ নম্বর', value: found.voucherNumber || found.id, isHighlight: true },
          { labelBn: 'পরিমাণ (টাকা)', value: found.amount, isHighlight: true, isCurrency: true },
          { labelBn: 'দাতার নাম / বিবরণ', value: found.donorName || found.description || 'N/A' },
          { labelBn: 'হিসাব খাত', value: found.accountHeadNameBn || 'সাধারণ ফান্ড' },
          { labelBn: 'পেমেন্ট মেথড', value: found.paymentMethod || 'ক্যাশ' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'বিস্তারিত দেখুন',
            labelEn: 'View Details',
            iconName: 'Eye',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'print_receipt',
            labelBn: 'রশিদ প্রিন্ট (POS / A4)',
            labelEn: 'Print Receipt',
            iconName: 'Printer',
            color: 'emerald',
            actionType: 'PRINT_RECEIPT',
          },
        ],
        rawRecord: found,
        targetTab: 'income',
      };
    }
  }

  // 2. Check Expense Vouchers
  if (cleanCode.startsWith('EXP-')) {
    const idOrVoucher = cleanCode.replace(/^EXP-/, '');
    const found = stateCollections.expenses?.find(
      (e) =>
        e.voucherNumber?.toUpperCase() === cleanCode ||
        e.voucherNumber?.toUpperCase() === idOrVoucher ||
        e.id === idOrVoucher ||
        e.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('EXPENSE', found);
      return {
        canonicalCode: canonical,
        entityType: 'EXPENSE',
        titleBn: `ব্যয় ভাউচার #${found.voucherNumber || found.id}`,
        titleEn: `Expense Voucher #${found.voucherNumber || found.id}`,
        subtitleBn: `খাত: ${found.accountHeadNameBn || 'সাধারণ ব্যয়'} • তারিখ: ${found.date}`,
        categoryBn: 'ব্যয় ও ভাউচার',
        statusBadge: {
          labelBn: found.status === 'REVERSED' ? 'বাতিলকৃত' : 'পরিশোধিত',
          variant: found.status === 'REVERSED' ? 'rose' : 'rose',
        },
        keyDetails: [
          { labelBn: 'ভাউচার নম্বর', value: found.voucherNumber || found.id, isHighlight: true },
          { labelBn: 'ব্যয় পরিমাণ (টাকা)', value: found.amount, isHighlight: true, isCurrency: true },
          { labelBn: 'প্রাপকের নাম / ভেন্ডর', value: found.paidTo || found.vendor || 'N/A' },
          { labelBn: 'ব্যয় বিবরণ', value: found.description || 'N/A' },
        ],
        actions: [
          {
            id: 'details',
            labelBn: 'বিস্তারিত দেখুন',
            labelEn: 'View Details',
            iconName: 'Eye',
            color: 'blue',
            actionType: 'VIEW_DETAILS',
            isPrimary: true,
          },
          {
            id: 'print_voucher',
            labelBn: 'ভাউচার প্রিন্ট (POS / A4)',
            labelEn: 'Print Voucher',
            iconName: 'Printer',
            color: 'rose',
            actionType: 'PRINT_RECEIPT',
          },
        ],
        rawRecord: found,
        targetTab: 'expense',
      };
    }
  }

  // 3. Check General Donations
  if (cleanCode.startsWith('DON-')) {
    const idOrReceipt = cleanCode.replace(/^DON-/, '');
    const found = stateCollections.donations?.find(
      (d) =>
        d.receiptNumber?.toUpperCase() === cleanCode ||
        d.receiptNumber?.toUpperCase() === idOrReceipt ||
        d.id === idOrReceipt ||
        d.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('DONATION', found);
      return {
        canonicalCode: canonical,
        entityType: 'DONATION',
        titleBn: `সাধারণ দান #${found.receiptNumber || found.id}`,
        titleEn: `Donation #${found.receiptNumber || found.id}`,
        subtitleBn: `দাতা: ${found.donorName || 'বেনামী'} • মোবাইল: ${found.donorPhone || 'N/A'}`,
        categoryBn: 'দান ও অনুদান',
        statusBadge: {
          labelBn: 'জমা সম্পন্ন',
          variant: 'emerald',
        },
        keyDetails: [
          { labelBn: 'রশিদ নম্বর', value: found.receiptNumber || found.id, isHighlight: true },
          { labelBn: 'দানের পরিমাণ', value: found.amount, isHighlight: true, isCurrency: true },
          { labelBn: 'দাতার নাম', value: found.donorName || 'বেনামী' },
          { labelBn: 'মোবাইল নম্বর', value: found.donorPhone || 'N/A' },
        ],
        actions: [
          {
            id: 'print_receipt',
            labelBn: 'মানি রসিদ প্রিন্ট',
            labelEn: 'Print Receipt',
            iconName: 'Printer',
            color: 'emerald',
            actionType: 'PRINT_RECEIPT',
            isPrimary: true,
          },
        ],
        rawRecord: found,
        targetTab: 'donations',
      };
    }
  }

  // 4. Check Donation Boxes
  if (cleanCode.startsWith('BOX-') || cleanCode.startsWith('DBOX-')) {
    const idOrCode = cleanCode.replace(/^BOX-/, '').replace(/^DBOX-/, '');
    const found = stateCollections.donationBoxes?.find(
      (b) =>
        b.boxCode?.toUpperCase() === cleanCode ||
        b.boxCode?.toUpperCase() === idOrCode ||
        b.id === idOrCode ||
        b.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('DONATION_BOX', found);
      return {
        canonicalCode: canonical,
        entityType: 'DONATION_BOX',
        titleBn: found.nameBn || found.name || `দানবাক্স #${found.boxCode || found.id}`,
        titleEn: found.nameEn || found.name || `Donation Box #${found.boxCode || found.id}`,
        subtitleBn: `অবস্থান: ${found.location || 'মসজিদ প্রাঙ্গণ'} • কোড: ${found.boxCode || found.id}`,
        categoryBn: 'দানবাক্স',
        statusBadge: {
          labelBn: found.status === 'ACTIVE' ? 'সক্রিয় ও উন্মুক্ত' : 'বন্ধ / নিষ্ক্রিয়',
          variant: found.status === 'ACTIVE' ? 'emerald' : 'slate',
        },
        keyDetails: [
          { labelBn: 'বক্স কোড', value: found.boxCode || found.id, isHighlight: true },
          { labelBn: 'বক্সের নাম', value: found.nameBn || found.name || 'দানবাক্স' },
          { labelBn: 'অবস্থান / স্থান', value: found.location || 'মসজিদ প্রাঙ্গণ' },
          { labelBn: 'সর্বশেষ কালেকশন', value: found.lastCollectionDate || 'এখনও হয়নি' },
        ],
        actions: [
          {
            id: 'collect',
            labelBn: 'ক্যাশ গণনা ও কালেকশন এন্ট্রি',
            labelEn: 'Collect Cash',
            iconName: 'Banknote',
            color: 'amber',
            actionType: 'BOX_COLLECT',
            isPrimary: true,
          },
          {
            id: 'print_sticker',
            labelBn: 'বক্স স্টিকার লেবেল প্রিন্ট',
            labelEn: 'Print Box Label',
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

  // 5. Check Staff
  if (cleanCode.startsWith('STF-') || cleanCode.startsWith('EMP-')) {
    const idOrEmp = cleanCode.replace(/^STF-/, '').replace(/^EMP-/, '');
    const found = stateCollections.staff?.find(
      (s) =>
        s.employeeId?.toUpperCase() === cleanCode ||
        s.employeeId?.toUpperCase() === idOrEmp ||
        s.id === idOrEmp ||
        s.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('STAFF', found);
      return {
        canonicalCode: canonical,
        entityType: 'STAFF',
        titleBn: found.nameBn || found.name,
        titleEn: found.nameEn || found.name,
        subtitleBn: `পদবী: ${found.designation || 'স্টাফ'} • মোবাইল: ${found.phone || 'N/A'}`,
        categoryBn: 'স্টাফ ও কর্মচারী',
        statusBadge: {
          labelBn: found.status === 'ACTIVE' ? 'কর্মরত' : 'অব্যাহতিপ্রাপ্ত',
          variant: found.status === 'ACTIVE' ? 'emerald' : 'slate',
        },
        keyDetails: [
          { labelBn: 'স্টাফ আইডি', value: found.employeeId || found.id, isHighlight: true },
          { labelBn: 'নাম', value: found.nameBn || found.name },
          { labelBn: 'পদবী', value: found.designation || 'কর্মচারী' },
          { labelBn: 'মাসিক মূল বেতন', value: found.baseSalary, isCurrency: true },
        ],
        actions: [
          {
            id: 'pay_salary',
            labelBn: 'বেতন প্রদান ভাউচার',
            labelEn: 'Pay Salary',
            iconName: 'WalletCards',
            color: 'emerald',
            actionType: 'STAFF_SALARY',
            isPrimary: true,
          },
          {
            id: 'print_id_card',
            labelBn: 'স্টাফ আইডি কার্ড প্রিন্ট',
            labelEn: 'Print ID Card',
            iconName: 'Printer',
            color: 'blue',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'staff',
      };
    }
  }

  // 6. Check Assets
  if (cleanCode.startsWith('AST-') || cleanCode.startsWith('ASSET-')) {
    const idOrAst = cleanCode.replace(/^AST-/, '').replace(/^ASSET-/, '');
    const found = stateCollections.assets?.find(
      (a) =>
        a.assetCode?.toUpperCase() === cleanCode ||
        a.assetCode?.toUpperCase() === idOrAst ||
        a.id === idOrAst ||
        a.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('ASSET', found);
      return {
        canonicalCode: canonical,
        entityType: 'ASSET',
        titleBn: found.nameBn || found.name,
        titleEn: found.nameEn || found.name,
        subtitleBn: `কোড: ${found.assetCode || found.id} • ক্যাটাগরি: ${found.category || 'যন্ত্রপাতি'}`,
        categoryBn: 'স্থাবর ও অস্থাবর সম্পদ',
        statusBadge: {
          labelBn: found.status === 'IN_USE' ? 'ব্যবহারযোগ্য' : found.status === 'UNDER_MAINTENANCE' ? 'রক্ষণাবেক্ষণাধীন' : 'নিষ্ক্রিয়',
          variant: found.status === 'IN_USE' ? 'emerald' : found.status === 'UNDER_MAINTENANCE' ? 'amber' : 'rose',
        },
        keyDetails: [
          { labelBn: 'সম্পদ কোড', value: found.assetCode || found.id, isHighlight: true },
          { labelBn: 'পণ্যের নাম', value: found.nameBn || found.name },
          { labelBn: 'অবস্থান / রুম', value: found.location || 'মসজিদ ভবন' },
          { labelBn: 'ক্রয় মূল্য', value: found.purchasePrice || 0, isCurrency: true },
        ],
        actions: [
          {
            id: 'service',
            labelBn: 'সার্ভিসিং / মেরামত ব্যয় এন্ট্রি',
            labelEn: 'Service Entry',
            iconName: 'Wrench',
            color: 'amber',
            actionType: 'ASSET_SERVICE',
            isPrimary: true,
          },
          {
            id: 'print_tag',
            labelBn: 'বারকোড/QR ট্যাগ প্রিন্ট',
            labelEn: 'Print Asset Tag',
            iconName: 'Printer',
            color: 'blue',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'assets',
      };
    }
  }

  // 7. Check Waqf Properties
  if (cleanCode.startsWith('WPF-') || cleanCode.startsWith('PROP-') || cleanCode.startsWith('SHOP-')) {
    const idOrProp = cleanCode.replace(/^WPF-/, '').replace(/^PROP-/, '').replace(/^SHOP-/, '');
    const found = stateCollections.properties?.find(
      (p) =>
        p.propertyCode?.toUpperCase() === cleanCode ||
        p.propertyCode?.toUpperCase() === idOrProp ||
        p.id === idOrProp ||
        p.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('WAQF_PROPERTY', found);
      return {
        canonicalCode: canonical,
        entityType: 'WAQF_PROPERTY',
        titleBn: found.nameBn || found.name,
        titleEn: found.nameEn || found.name,
        subtitleBn: `কোড: ${found.propertyCode || found.id} • ধরন: ${found.type || 'দোকান/মার্কেট'}`,
        categoryBn: 'ওয়াকফ সম্পত্তি ও দোকান',
        statusBadge: {
          labelBn: found.status === 'RENTED' ? 'ভাড়া দেওয়া আছে' : 'খালি / অব্যবহৃত',
          variant: found.status === 'RENTED' ? 'emerald' : 'blue',
        },
        keyDetails: [
          { labelBn: 'প্রপার্টি কোড', value: found.propertyCode || found.id, isHighlight: true },
          { labelBn: 'নাম / ঠিকানা', value: found.nameBn || found.name },
          { labelBn: 'ভাড়াটিয়ার নাম', value: found.currentTenantName || 'বর্তমানে খালি' },
          { labelBn: 'মাসিক নির্ধারিত ভাড়া', value: found.monthlyRent || 0, isCurrency: true },
        ],
        actions: [
          {
            id: 'collect_rent',
            labelBn: 'মাসিক ভাড়া গ্রহণ ও রসিদ',
            labelEn: 'Collect Rent',
            iconName: 'Receipt',
            color: 'emerald',
            actionType: 'WAQF_RENT_COLLECT',
            isPrimary: true,
          },
          {
            id: 'print_sticker',
            labelBn: 'দোকান QR কোড স্টিকার প্রিন্ট',
            labelEn: 'Print Shop Sticker',
            iconName: 'Printer',
            color: 'cyan',
            actionType: 'PRINT_LABEL',
          },
        ],
        rawRecord: found,
        targetTab: 'property',
      };
    }
  }

  // 8. Check Cemetery Records
  if (cleanCode.startsWith('CEM-') || cleanCode.startsWith('PLOT-')) {
    const idOrPlot = cleanCode.replace(/^CEM-/, '').replace(/^PLOT-/, '');
    const found = stateCollections.cemetery?.find(
      (c) =>
        c.plotNumber?.toUpperCase() === cleanCode ||
        c.plotNumber?.toUpperCase() === idOrPlot ||
        c.id === idOrPlot ||
        c.id === cleanCode
    );
    if (found) {
      const canonical = getEntityCanonicalCode('CEMETERY', found);
      return {
        canonicalCode: canonical,
        entityType: 'CEMETERY',
        titleBn: `কবরস্থান প্লট #${found.plotNumber || found.id}`,
        titleEn: `Cemetery Plot #${found.plotNumber || found.id}`,
        subtitleBn: `মরহুম: ${found.deceasedNameBn || found.deceasedName || 'N/A'} • ব্লক: ${found.block || 'A'}`,
        categoryBn: 'কবরস্থান রেকর্ড',
        statusBadge: {
          labelBn: 'দাফন সম্পন্ন',
          variant: 'slate',
        },
        keyDetails: [
          { labelBn: 'প্লট নম্বর', value: found.plotNumber || found.id, isHighlight: true },
          { labelBn: 'মরহুমের নাম', value: found.deceasedNameBn || found.deceasedName || 'N/A' },
          { labelBn: 'দাফনের তারিখ', value: found.burialDate || 'N/A' },
          { labelBn: 'অভিভাবক ও মোবাইল', value: `${found.relativeName || ''} (${found.relativePhone || 'N/A'})` },
        ],
        actions: [
          {
            id: 'print_certificate',
            labelBn: 'দাফন সনদপত্র প্রিন্ট',
            labelEn: 'Burial Certificate',
            iconName: 'Printer',
            color: 'slate',
            actionType: 'PRINT_RECEIPT',
            isPrimary: true,
          },
        ],
        rawRecord: found,
        targetTab: 'cemetery',
      };
    }
  }

  return null;
}

/**
 * Web Audio Synthesizer for instant scan feedback sound
 */
export function playScanSuccessSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone (880 Hz)
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

    // Second tone (1320 Hz)
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
  } catch {
    // Audio fail safe
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
  } catch {
    // Audio fail safe
  }
}

export function triggerHapticFeedback(pattern: number[] = [60, 40, 60]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

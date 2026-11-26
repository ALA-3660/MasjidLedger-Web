import {
  AgreementCategoryDef,
  AgreementPartyType,
  AgreementPermissionKey,
  AgreementRecord,
  AgreementRequiredSignerSlot,
  AgreementReviewStage,
  AgreementSignatureMethod,
  AgreementStatus,
  AgreementTemplateDef,
  WrittenPaymentMode,
} from '../types/agreementTypes';
import type { User } from '../types/index';

export const AGREEMENT_SIGNATURE_LIMITATION_BN =
  'আইনি সীমাবদ্ধতা নোট: স্ক্রিনে আঁকা, টাইপ করা বা OTP-যাচাইকৃত ইলেকট্রনিক স্বাক্ষর এই সফটওয়্যারে অভ্যন্তরীণ সম্মতি ও অডিট প্রমাণের জন্য সংরক্ষিত হয়। এটি সব ক্ষেত্রে প্রচলিত আইনে স্বীকৃত সার্টিফায়েড ডিজিটাল সিগনেচার (যেমন CCA-নিবন্ধিত DSC) বা রেজিস্ট্রিকৃত কাগুজে দলিলের বিকল্প নয়। জমি, ওয়াকফ বা স্ট্যাম্প-আবশ্যক চুক্তিতে প্রযোজ্য আইন অনুযায়ী কাগুজে স্ট্যাম্প, মূল স্বাক্ষর ও নিবন্ধন সম্পন্ন করতে হবে।';

export const AGREEMENT_STATUS_META: Record<
  AgreementStatus,
  { labelBn: string; shortBn: string; dotClass: string; textClass: string; bgClass: string; borderClass: string }
> = {
  DRAFT: {
    labelBn: 'খসড়া (Draft)',
    shortBn: 'খসড়া',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-700',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-200',
  },
  INFORMATION_PENDING: {
    labelBn: 'তথ্য অপেক্ষমাণ (Information Pending)',
    shortBn: 'তথ্য বাকি',
    dotClass: 'bg-yellow-500',
    textClass: 'text-yellow-900',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
  },
  AI_REVIEWED: {
    labelBn: 'AI পর্যালোচিত (AI Reviewed)',
    shortBn: 'AI পর্যালোচিত',
    dotClass: 'bg-cyan-500',
    textClass: 'text-cyan-900',
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-200',
  },
  UNDER_REVIEW: {
    labelBn: 'পর্যালোচনাধীন (Under Review)',
    shortBn: 'পর্যালোচনাধীন',
    dotClass: 'bg-sky-500',
    textClass: 'text-sky-800',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
  },
  PENDING_APPROVAL: {
    labelBn: 'অনুমোদন অপেক্ষমাণ (Pending Approval)',
    shortBn: 'অনুমোদন বাকি',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  APPROVED: {
    labelBn: 'অনুমোদিত (Approved)',
    shortBn: 'অনুমোদিত',
    dotClass: 'bg-lime-600',
    textClass: 'text-lime-900',
    bgClass: 'bg-lime-50',
    borderClass: 'border-lime-200',
  },
  PENDING_SIGNATURE: {
    labelBn: 'স্বাক্ষর অপেক্ষমাণ (Pending Signature)',
    shortBn: 'স্বাক্ষর বাকি',
    dotClass: 'bg-indigo-500',
    textClass: 'text-indigo-800',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
  },
  PARTIALLY_SIGNED: {
    labelBn: 'আংশিক স্বাক্ষরিত (Partially Signed)',
    shortBn: 'আংশিক স্বাক্ষরিত',
    dotClass: 'bg-violet-500',
    textClass: 'text-violet-800',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-200',
  },
  FULLY_SIGNED: {
    labelBn: 'সম্পূর্ণ স্বাক্ষরিত (Fully Signed)',
    shortBn: 'সম্পূর্ণ স্বাক্ষরিত',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-800',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  EFFECTIVE: {
    labelBn: 'কার্যকর (Effective)',
    shortBn: 'কার্যকর',
    dotClass: 'bg-emerald-700',
    textClass: 'text-emerald-900',
    bgClass: 'bg-emerald-100',
    borderClass: 'border-emerald-300',
  },
  ACTIVE: {
    labelBn: 'কার্যকর (Active)',
    shortBn: 'কার্যকর',
    dotClass: 'bg-emerald-700',
    textClass: 'text-emerald-900',
    bgClass: 'bg-emerald-100',
    borderClass: 'border-emerald-300',
  },
  COMPLETED: {
    labelBn: 'সম্পন্ন (Completed)',
    shortBn: 'সম্পন্ন',
    dotClass: 'bg-teal-600',
    textClass: 'text-teal-800',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
  },
  EXPIRED: {
    labelBn: 'মেয়াদোত্তীর্ণ (Expired)',
    shortBn: 'মেয়াদোত্তীর্ণ',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-800',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
  },
  TERMINATED: {
    labelBn: 'সমাপ্ত / অবসানকৃত (Terminated)',
    shortBn: 'অবসানকৃত',
    dotClass: 'bg-red-600',
    textClass: 'text-red-900',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
  CANCELLED: {
    labelBn: 'বাতিল (Cancelled)',
    shortBn: 'বাতিল',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-800',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  },
};

export const AGREEMENT_STATUS_ORDER: AgreementStatus[] = [
  'DRAFT',
  'INFORMATION_PENDING',
  'AI_REVIEWED',
  'UNDER_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
  'PENDING_SIGNATURE',
  'PARTIALLY_SIGNED',
  'FULLY_SIGNED',
  'EFFECTIVE',
  'COMPLETED',
  'EXPIRED',
  'TERMINATED',
  'CANCELLED',
];

export const AGREEMENT_REVIEW_STAGE_LABELS: Record<AgreementReviewStage, string> = {
  INTERNAL: 'অভ্যন্তরীণ পর্যালোচনা',
  COMMITTEE: 'কমিটি পর্যালোচনা',
  WAQF_LEGAL: 'ওয়াকফ / আইনগত পর্যালোচনা',
};

export const AGREEMENT_SIGNATURE_METHOD_LABELS: Record<AgreementSignatureMethod, string> = {
  DRAW_TOUCH: 'স্ক্রিনে আঁকা স্বাক্ষর (Touch/Draw)',
  TYPED_ELECTRONIC: 'টাইপকৃত ইলেকট্রনিক স্বাক্ষর',
  OTP_VERIFIED_ELECTRONIC: 'OTP যাচাইকৃত ইলেকট্রনিক স্বাক্ষর',
};

/**
 * Checks whether an agreement is locked against silent direct edits
 * (must use New Version or Amendment instead).
 */
export function isAgreementLockedForDirectEdit(ag?: Partial<AgreementRecord> | null): boolean {
  if (!ag) return false;
  if (Array.isArray(ag.signatures) && ag.signatures.length > 0) return true;
  const lockedStatuses: AgreementStatus[] = [
    'PARTIALLY_SIGNED',
    'FULLY_SIGNED',
    'EFFECTIVE',
    'ACTIVE',
    'COMPLETED',
    'TERMINATED',
    'CANCELLED',
  ];
  return Boolean(ag.status && lockedStatuses.includes(ag.status));
}

/**
 * Computes ordered required signatory slots across all parties & their signatory representatives.
 */
export function buildRequiredSignerSlots(ag: Pick<AgreementRecord, 'parties'>): AgreementRequiredSignerSlot[] {
  const slots: AgreementRequiredSignerSlot[] = [];
  let order = 1;
  for (const party of ag.parties || []) {
    const signatories = (party.representatives || []).filter((r) => r.isSignatory && r.name?.trim());
    if (signatories.length > 0) {
      for (const rep of signatories) {
        slots.push({
          slotKey: `${party.id}::${rep.id}`,
          signingOrder: order++,
          partyId: party.id,
          partyRoleLabel: party.roleLabel,
          partyName: party.name,
          representativeId: rep.id,
          signerName: rep.name,
          signerDesignation: rep.designation || 'ক্ষমতাপ্রাপ্ত প্রতিনিধি',
          signerPhone: rep.phone || party.phone,
          signerNid: rep.nid || party.nidOrRegNo,
          authorityBasis: rep.authorityBasis || 'পক্ষের ক্ষমতাপ্রাপ্ত প্রতিনিধি',
        });
      }
    } else if (party.name?.trim()) {
      slots.push({
        slotKey: `${party.id}::SELF`,
        signingOrder: order++,
        partyId: party.id,
        partyRoleLabel: party.roleLabel,
        partyName: party.name,
        signerName: party.name,
        signerDesignation: party.roleLabel,
        signerPhone: party.phone,
        signerNid: party.nidOrRegNo,
        authorityBasis: 'মূল পক্ষ স্বয়ং স্বাক্ষরকারী',
      });
    }
  }
  return slots;
}

/**
 * Client-side RBAC helper (UI visibility only — always strictly enforced on backend).
 */
export function hasClientAgreementPermission(
  user: User | null | undefined,
  perm: AgreementPermissionKey
): boolean {
  if (!user) return false;
  const role = user.role;
  const perms = user.permissions || [];
  if (perms.includes(perm)) return true;

  // Legacy permission compatibility
  if (perm === 'agreement.view' && perms.includes('VIEW_AGREEMENTS')) return true;
  if (perm === 'agreement.create' && perms.includes('CREATE_AGREEMENT')) return true;
  if (perm === 'agreement.edit' && perms.includes('EDIT_AGREEMENT')) return true;
  if (perm === 'agreement.delete' && perms.includes('DELETE_AGREEMENT')) return true;
  if (perm === 'agreement.manage_templates' && perms.includes('MANAGE_AGREEMENT_TEMPLATES')) return true;

  if (role === 'SUPER_ADMIN' || role === 'MOSQUE_ADMIN') return true;
  if (role === 'COMMITTEE_ADMIN') return true;

  if (role === 'ACCOUNTANT' || role === 'TREASURER') {
    return (
      perm === 'agreement.view' ||
      perm === 'agreement.create' ||
      perm === 'agreement.edit' ||
      perm === 'agreement.review' ||
      perm === 'agreement.manage_parties' ||
      perm === 'agreement.upload_documents' ||
      perm === 'agreement.manage_templates' ||
      perm === 'agreement.use_ai' ||
      perm === 'agreement.sign' ||
      perm === 'agreement.view_reports'
    );
  }
  if (role === 'DATA_ENTRY_OPERATOR') {
    return (
      perm === 'agreement.view' ||
      perm === 'agreement.create' ||
      perm === 'agreement.edit' ||
      perm === 'agreement.manage_parties' ||
      perm === 'agreement.upload_documents' ||
      perm === 'agreement.use_ai'
    );
  }
  if (role === 'AUDITOR') {
    return perm === 'agreement.view' || perm === 'agreement.review' || perm === 'agreement.view_reports';
  }
  if (role === 'VIEWER') {
    return perm === 'agreement.view' || perm === 'agreement.view_reports';
  }
  return false;
}

export const AGREEMENT_PARTY_TYPE_LABELS: Record<AgreementPartyType, string> = {
  MOSQUE_COMMITTEE: 'মসজিদ পরিচালনা কমিটি / প্রতিষ্ঠান',
  INDIVIDUAL: 'ব্যক্তি / স্থানীয় নাগরিক',
  CONTRACTOR_FIRM: 'ঠিকাদার / নির্মাণ প্রতিষ্ঠান',
  ORGANIZATION: 'প্রতিষ্ঠান / সংস্থা / দোকান',
  WAQF_TRUST: 'ওয়াকফ এস্টেট / ট্রাস্ট',
  LOCAL_COMMUNITY: 'এলাকাবাসী / মহল্লা কমিটি',
  OTHER: 'অন্যান্য পক্ষ',
};

export const WRITTEN_PAYMENT_MODE_LABELS: Record<WrittenPaymentMode, string> = {
  NON_FINANCIAL: 'অ-আর্থিক / শূন্য মূল্য চুক্তি',
  LUMP_SUM: 'এককালীন লিখিত মূল্য (Lump-sum)',
  INSTALLMENT: 'কিস্তিভিত্তিক লিখিত শর্ত (Installment)',
};

export const ORDINAL_PARTY_ROLES_BN = [
  'প্রথম পক্ষ',
  'দ্বিতীয় পক্ষ',
  'তৃতীয় পক্ষ',
  'চতুর্থ পক্ষ',
  'পঞ্চম পক্ষ',
  'ষষ্ঠ পক্ষ',
];

export function getOrdinalPartyRoleBn(order: number): string {
  if (order >= 1 && order <= ORDINAL_PARTY_ROLES_BN.length) {
    return ORDINAL_PARTY_ROLES_BN[order - 1];
  }
  return `${order}ম পক্ষ`;
}

/**
 * 13 Built-in Agreement Categories required for Mosque & Waqf operations
 */
export const BUILT_IN_AGREEMENT_CATEGORIES: AgreementCategoryDef[] = [
  {
    id: 'sys-cat-construction',
    code: 'CONSTRUCTION',
    nameBn: 'নির্মাণ চুক্তি',
    nameEn: 'Construction',
    descriptionBn: 'মসজিদ ভবন, অজুখানা, মিনার, ছাদ ঢালাই, বাউন্ডারি ওয়াল ও অবকাঠামো নির্মাণ চুক্তি',
    formProfile: 'CONSTRUCTION',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'sys-cat-land-property',
    code: 'LAND_PROPERTY',
    nameBn: 'জমি ও সম্পত্তি ব্যবস্থাপনা',
    nameEn: 'Land & Property Management',
    descriptionBn: 'মসজিদের জমি সীমানা নির্ধারণ, দখল-সংরক্ষণ, বিনিময় বা সম্পত্তি ব্যবস্থাপনা চুক্তি',
    formProfile: 'LAND_WAQF',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'sys-cat-waqf-property',
    code: 'WAQF_PROPERTY',
    nameBn: 'ওয়াকফ সম্পত্তি ব্যবহার ও সংক্রান্ত চুক্তি',
    nameEn: 'Waqf Property Usage & Agreement',
    descriptionBn: 'ওয়াকফ এস্টেটের ভূমি, স্থাপনা, বাগান বা মার্কেট অংশের ব্যবহার ও রক্ষণাবেক্ষণ সংক্রান্ত চুক্তি',
    formProfile: 'LAND_WAQF',
    isSystem: true,
    sortOrder: 3,
  },
  {
    id: 'sys-cat-road-right',
    code: 'ROAD_RIGHT_OF_WAY',
    nameBn: 'রাস্তা ও চলাচলের অধিকার',
    nameEn: 'Road & Right of Way',
    descriptionBn: 'মসজিদে প্রবেশপথ, চলাচলের রাস্তা, ড্রেনেজ ও পার্শ্ববর্তী জমির সাথে যৌথ রাস্তা ব্যবহারের চুক্তি',
    formProfile: 'ROAD_RIGHT',
    isSystem: true,
    sortOrder: 4,
  },
  {
    id: 'sys-cat-procurement',
    code: 'PROCUREMENT_SUPPLY',
    nameBn: 'ক্রয় ও সরবরাহ',
    nameEn: 'Procurement & Supply',
    descriptionBn: 'নির্মাণ সামগ্রী (ইট, বালু, রড, সিমেন্ট), সাউন্ড সিস্টেম, এসি, কার্পেট ও অন্যান্য মালামাল সরবরাহ চুক্তি',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 5,
  },
  {
    id: 'sys-cat-labor-wage',
    code: 'LABOR_WAGE',
    nameBn: 'শ্রমিক ও মজুরি',
    nameEn: 'Labor & Wage',
    descriptionBn: 'রাজমিস্ত্রি, কাঠমিস্ত্রি, ইলেকট্রিশিয়ান, প্লাম্বার বা মৌসুমি শ্রমিকের কাজের লিখিত শর্তাবলি চুক্তি',
    formProfile: 'CONSTRUCTION',
    isSystem: true,
    sortOrder: 6,
  },
  {
    id: 'sys-cat-service',
    code: 'SERVICE_PROVISION',
    nameBn: 'সেবা প্রদান',
    nameEn: 'Service Provision',
    descriptionBn: 'জেনারেটর সার্ভিসিং, এসি রক্ষণাবেক্ষণ, সিকিউরিটি, পরিচ্ছন্নতা, ইন্টারনেট বা টেকনিক্যাল সেবা চুক্তি',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 7,
  },
  {
    id: 'sys-cat-rental',
    code: 'RENTAL_USAGE',
    nameBn: 'ভাড়া ও ব্যবহার',
    nameEn: 'Rental & Usage',
    descriptionBn: 'মসজিদ মার্কেট দোকান, কক্ষ, গুদাম বা অস্থায়ী স্থাপনা ভাড়া ও ব্যবহারের লিখিত চুক্তিপত্র',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 8,
  },
  {
    id: 'sys-cat-repair',
    code: 'REPAIR_MAINTENANCE',
    nameBn: 'মেরামত ও রক্ষণাবেক্ষণ',
    nameEn: 'Repair & Maintenance',
    descriptionBn: 'প্লাস্টার, রঙ, টাইলস, পানির পাম্প, ছাদ সংস্কার ও স্থাপনা মেরামতের চুক্তি',
    formProfile: 'CONSTRUCTION',
    isSystem: true,
    sortOrder: 9,
  },
  {
    id: 'sys-cat-cooperation',
    code: 'MUTUAL_COOPERATION',
    nameBn: 'পারস্পরিক সহযোগিতা',
    nameEn: 'Mutual Cooperation',
    descriptionBn: 'মাদরাসা, কবরস্থান কমিটি, সমাজকল্যাণ সংস্থা বা স্থানীয় সংগঠনের সাথে যৌথ সহযোগিতা চুক্তি',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 10,
  },
  {
    id: 'sys-cat-settlement',
    code: 'SETTLEMENT_MOU',
    nameBn: 'সমঝোতা',
    nameEn: 'Settlement / MOU',
    descriptionBn: 'পারস্পরিক সমঝোতা স্মারক (MOU), সীমানা বা সামাজিক বিরোধ মীমাংসা ও অঙ্গীকারনামা',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 11,
  },
  {
    id: 'sys-cat-responsibility',
    code: 'RESPONSIBILITY_SHARING',
    nameBn: 'দায়িত্ব বণ্টন',
    nameEn: 'Responsibility Sharing',
    descriptionBn: 'মসজিদ পরিচালনা, উন্নয়ন উপ-কমিটি, তদারকি বা রক্ষণাবেক্ষণের দায়িত্ব বণ্টন চুক্তি',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 12,
  },
  {
    id: 'sys-cat-other',
    code: 'OTHER_CUSTOM',
    nameBn: 'অন্যান্য কাস্টম চুক্তি',
    nameEn: 'Other Custom Agreement',
    descriptionBn: 'মসজিদের যেকোনো বিশেষ বা প্রথাগত দাপ্তরিক চুক্তিপত্র',
    formProfile: 'STANDARD',
    isSystem: true,
    sortOrder: 13,
  },
];

export function isWaqfOrLandCategoryCode(code: string, categories?: AgreementCategoryDef[]): boolean {
  if (code === 'LAND_PROPERTY' || code === 'WAQF_PROPERTY' || code === 'ROAD_RIGHT_OF_WAY') {
    return true;
  }
  const found = categories?.find((c) => c.code === code);
  return found?.formProfile === 'LAND_WAQF' || found?.formProfile === 'ROAD_RIGHT';
}

export function isConstructionCategoryCode(code: string, categories?: AgreementCategoryDef[]): boolean {
  if (code === 'CONSTRUCTION' || code === 'REPAIR_MAINTENANCE' || code === 'LABOR_WAGE') {
    return true;
  }
  const found = categories?.find((c) => c.code === code);
  return found?.formProfile === 'CONSTRUCTION';
}

/**
 * Starter Built-in Bangla Agreement Templates
 */
export const BUILT_IN_AGREEMENT_TEMPLATES: AgreementTemplateDef[] = [
  {
    id: 'sys-tpl-construction-basic',
    titleBn: 'মসজিদ ভবন / অজুখানা নির্মাণ চুক্তিপত্র',
    categoryCode: 'CONSTRUCTION',
    descriptionBn: 'নির্মাণ পরিমাপ, সামগ্রী ও শ্রমিকের দায়িত্ব, মান যাচাই এবং কিস্তিভিত্তিক লিখিত শর্তসহ পূর্ণাঙ্গ নির্মাণ চুক্তি।',
    defaultPurpose: 'মসজিদের অনুমোদিত নকশা ও মানদণ্ড অনুযায়ী নির্ধারিত সময়ের মধ্যে মানসম্মত নির্মাণ কাজ সম্পন্ন ও হস্তান্তর করা।',
    defaultGeneralClauses:
      '১. দ্বিতীয় পক্ষ (ঠিকাদার/মিস্ত্রি) মসজিদ পরিচালনা কমিটি কর্তৃক অনুমোদিত নকশা, মাপ ও গুণগত মান অনুসরণ করে কাজ সম্পন্ন করতে বাধ্য থাকবেন।\n' +
      '২. কর্মস্থলে নিরাপত্তা, শ্রমিকদের শৃঙ্খলা এবং মসজিদের পবিত্রতা ও নামাজের সময়সূচির প্রতি সর্বোচ্চ সম্মান প্রদর্শন করতে হবে।\n' +
      '৩. নির্মাণ কাজের প্রতিটি ধাপ মসজিদ কমিটির দায়িত্বপ্রাপ্ত তদারকি সদস্যের যাচাই-বাছাই সাপেক্ষে পরবর্তী ধাপে অগ্রসর হবে।\n' +
      '৪. কাজের কোনো অংশ ত্রুটিপূর্ণ বা নিম্নমানের প্রমাণিত হলে দ্বিতীয় পক্ষ নিজ খরচে তা পুনর্নির্মাণ বা সংশোধন করে দেবেন।',
    defaultSpecialClauses:
      'নামাজের আজান ও জামাতের সময় উচ্চ শব্দ সৃষ্টিকারী মেশিন বা ভারী কাজ সাময়িকভাবে বন্ধ রাখতে হবে। অতিরিক্ত কোনো কাজ যুক্ত হলে উভয় পক্ষের লিখিত সম্মতিতে পৃথক সংযোজনী (Addendum) করা হবে।',
    defaultTerminationClause:
      'কোনো পক্ষ যুক্তিসংগত কারণ ব্যতীত চুক্তির মূল শর্ত ভঙ্গ করলে অপর পক্ষ লিখিত ৭ (সাত) দিনের নোটিশ প্রদান করে চুক্তি স্থগিত বা বাতিল করার অধিকার সংরক্ষণ করবে।',
    defaultDisputeResolutionClause:
      'এই চুক্তি সংক্রান্ত কোনো মতবিরোধ সৃষ্টি হলে প্রথমে উভয় পক্ষ মসজিদ পরিচালনা কমিটি ও এলাকার গণ্যমান্য মুরুব্বিদের উপস্থিতিতে পারস্পরিক আলোচনার মাধ্যমে শান্তিপূর্ণ মীমাংসা করবেন।',
    defaultWrittenFinancialMode: 'INSTALLMENT',
    defaultConstructionDetails: {
      dimensionUnit: 'ফুট',
      quantityUnit: 'বর্গফুট',
      materialsResponsibility: 'নির্মাণ সামগ্রী (ইট, বালু, রড, সিমেন্ট) প্রথম পক্ষ (মসজিদ কমিটি) সরবরাহ করবে।',
      laborResponsibility: 'সমস্ত দক্ষ ও অদক্ষ শ্রমিক, যন্ত্রপাতি ও কাজের তদারকি দ্বিতীয় পক্ষ বহন করবে।',
      qualityInspectionTerms: 'প্রতিটি ঢালাই ও গাঁথুনির পূর্বে মসজিদ নির্মাণ উপ-কমিটির সরেজমিন পরিদর্শন ও সম্মতি আবশ্যক।',
      handoverTerms: 'চূড়ান্ত পরিষ্কার-পরিচ্ছন্নতা, কিউরিং ও যৌথ পরিমাপ সম্পন্ন হওয়ার পর লিখিতভাবে কাজ হস্তান্তর করা হবে।',
    },
    isSystem: true,
  },
  {
    id: 'sys-tpl-waqf-land-use',
    titleBn: 'ওয়াকফ সম্পত্তি ও জমি ব্যবস্থাপনা চুক্তিপত্র',
    categoryCode: 'WAQF_PROPERTY',
    descriptionBn: 'মৌজা, জে.এল., খতিয়ান, দাগ নম্বর ও ওয়াকফ/আইনি পর্যালোচনা সতর্কতাসহ ওয়াকফ সম্পত্তি সংক্রান্ত চুক্তি।',
    defaultPurpose: 'ওয়াকফ এস্টেটের নির্ধারিত জমির সীমানা সুরক্ষা, সুষ্ঠু ব্যবস্থাপনা ও শরিয়ত ও প্রচলিত ওয়াকফ বিধি মোতাবেক ব্যবহার নিশ্চিত করা।',
    defaultGeneralClauses:
      '১. তফসিলে বর্ণিত সম্পত্তি সম্পূর্ণরূপে ওয়াকফ এস্টেট/মসজিদের মালিকানাধীন ও অহস্তান্তরযোগ্য সম্পত্তি হিসেবে গণ্য হবে।\n' +
      '২. দ্বিতীয় পক্ষ বা কোনো সংশ্লিষ্ট পক্ষ এই সম্পত্তির মূল প্রকৃতি পরিবর্তন, সাব-লিজ, বন্ধক বা মালিকানা দাবি করতে পারবেন না।\n' +
      '৩. ওয়াকফ সম্পত্তির রক্ষণাবেক্ষণ, সীমানা খুঁটি সংরক্ষণ এবং মসজিদের স্বার্থ পরিপন্থী যেকোনো কার্যক্রম থেকে সকল পক্ষ বিরত থাকবেন।\n' +
      '৪. বাংলাদেশ ওয়াকফ অধ্যাদেশ ও পরিচালনা কমিটির অনুমোদিত রেজুলেশন ব্যতীত কোনো স্থায়ী স্থাপনা নির্মাণ করা যাবে না।',
    defaultSpecialClauses:
      'এই চুক্তি কার্যকর হওয়ার পূর্বে মসজিদ পরিচালনা কমিটির সাধারণ সভার রেজুলেশন এবং প্রয়োজনীয় ক্ষেত্রে ওয়াকফ প্রশাসক/আইন উপদেষ্টার মতামত সংরক্ষণ করতে হবে।',
    defaultTerminationClause:
      'ওয়াকফ নীতিমালা বা চুক্তির যেকোনো শর্ত লঙ্ঘিত হলে প্রথম পক্ষ লিখিত ৩০ (ত্রিশ) দিনের নোটিশে চুক্তি বাতিল করে সম্পত্তির পূর্ণ দখল গ্রহণ করতে পারবে।',
    defaultDisputeResolutionClause:
      'কোনো বিরোধ দেখা দিলে প্রথমে স্থানীয় সালিশ ও পরিচালনা কমিটির মাধ্যমে নিষ্পত্তির চেষ্টা করা হবে; ব্যর্থ হলে প্রচলিত আইন ও ওয়াকফ বিধি অনুসরণ করা হবে।',
    defaultWrittenFinancialMode: 'NON_FINANCIAL',
    defaultLandWaqfDetails: {
      landAreaUnit: 'শতাংশ',
      waqfLegalReviewRequired: true,
      waqfLegalCautionAcknowledged: false,
      waqfLegalReviewNote: 'চূড়ান্ত স্বাক্ষরের পূর্বে মূল ওয়াকফ দলিল, খতিয়ান ও কমিটির রেজুলেশন যাচাই আবশ্যক।',
    },
    isSystem: true,
  },
  {
    id: 'sys-tpl-road-right-of-way',
    titleBn: 'মসজিদে চলাচলের রাস্তা ও অধিকার চুক্তিপত্র',
    categoryCode: 'ROAD_RIGHT_OF_WAY',
    descriptionBn: 'মসজিদের প্রবেশপথ ও পার্শ্ববর্তী জমির যৌথ রাস্তা ব্যবহার, প্রস্থ-দৈর্ঘ্য ও উভয় পক্ষের অবদান উল্লেখসহ চুক্তি।',
    defaultPurpose: 'মসজিদে মুসল্লিদের নির্বিঘ্ন যাতায়াত ও পার্শ্ববর্তী জমির অংশীদারদের পারস্পরিক চলাচলের জন্য নির্দিষ্ট মাপের স্থায়ী রাস্তা সংরক্ষণ ও ব্যবহারের শর্ত নির্ধারণ।',
    defaultGeneralClauses:
      '১. তফসিলে বর্ণিত দৈর্ঘ্য ও প্রস্থের রাস্তাটি উভয় পক্ষ ও মসজিদের মুসল্লিদের নির্বিঘ্ন চলাচলের জন্য উন্মুক্ত থাকবে।\n' +
      '২. কোনো পক্ষ রাস্তার ওপর বেড়া, দেয়াল, মালামাল স্তূপ বা অন্য কোনো প্রতিবন্ধকতা সৃষ্টি করতে পারবেন না।\n' +
      '৩. রাস্তার সংস্কার, ড্রেনেজ ও রক্ষণাবেক্ষণে উভয় পক্ষ চুক্তিতে বর্ণিত অবদান অনুযায়ী পারস্পরিক সহযোগিতা প্রদান করবেন।\n' +
      '৪. ভবিষ্যতে জমি হস্তান্তর বা উত্তরাধিকার সূত্রে মালিকানা পরিবর্তন হলেও চলাচলের এই অধিকার অক্ষুণ্ণ থাকবে।',
    defaultSpecialClauses:
      'রাস্তার সীমানা যৌথভাবে আমিন/সার্ভেয়ার দ্বারা পরিমাপ করে স্থায়ী খুঁটি স্থাপন করা হবে এবং নকশা এই চুক্তির সংযুক্তি হিসেবে সংরক্ষিত থাকবে।',
    defaultTerminationClause:
      'চলাচলের রাস্তা সংক্রান্ত এই চুক্তি উভয় পক্ষের লিখিত সম্মতি ও সমমানের বিকল্প রাস্তা নিশ্চিত না করা পর্যন্ত একতরফাভাবে বাতিল করা যাবে না।',
    defaultDisputeResolutionClause:
      'রাস্তার মাপ বা ব্যবহার নিয়ে কোনো মতানৈক্য হলে উভয় পক্ষের প্রতিনিধি, স্থানীয় গণ্যমান্য ব্যক্তি ও সার্ভেয়ারের উপস্থিতিতে মীমাংসা করা হবে।',
    defaultWrittenFinancialMode: 'NON_FINANCIAL',
    defaultLandWaqfDetails: {
      landAreaUnit: 'শতাংশ',
      roadUnit: 'ফুট',
      waqfLegalReviewRequired: true,
      waqfLegalCautionAcknowledged: false,
      waqfLegalReviewNote: 'মসজিদের ওয়াকফ জমির অংশ রাস্তার জন্য ব্যবহৃত হলে কমিটির রেজুলেশন ও আইনি/শরয়ি পরামর্শ গ্রহণ আবশ্যক।',
    },
    isSystem: true,
  },
  {
    id: 'sys-tpl-rental-shop',
    titleBn: 'মসজিদ মার্কেট দোকান / কক্ষ ভাড়া ও ব্যবহার চুক্তিপত্র',
    categoryCode: 'RENTAL_USAGE',
    descriptionBn: 'দোকান বা কক্ষ ব্যবহারের শর্তাবলি, মেয়াদ, রক্ষণাবেক্ষণ ও লিখিত ভাড়ার শর্ত (অ-অ্যাকাউন্টিং চুক্তি নথি)।',
    defaultPurpose: 'মসজিদ কমপ্লেক্সের নির্ধারিত কক্ষ/দোকান শালীন ও বৈধ ব্যবসায়িক কাজে নির্ধারিত মেয়াদের জন্য ব্যবহারের শর্তাবলি লিপিবদ্ধ করা।',
    defaultGeneralClauses:
      '১. দ্বিতীয় পক্ষ উক্ত দোকান/কক্ষে ইসলামি আদর্শ ও প্রচলিত আইন পরিপন্থী কোনো ব্যবসা বা কার্যক্রম পরিচালনা করতে পারবেন না।\n' +
      '২. মসজিদ কমিটির পূর্বানুমতি ব্যতীত দোকান অন্য কারো নিকট সাব-লেট বা হস্তান্তর করা সম্পূর্ণ নিষিদ্ধ।\n' +
      '৩. বিদ্যুৎ, পানি ও অভ্যন্তরীণ পরিচ্ছন্নতার দায়িত্ব দ্বিতীয় পক্ষ নিয়মিত পালন করবেন।\n' +
      '৪. চুক্তির মেয়াদ শেষে নবায়ন না হলে শান্তিপূর্ণভাবে কক্ষটি প্রথম পক্ষের নিকট হস্তান্তর করবেন।',
    defaultSpecialClauses:
      'এই চুক্তিপত্রে উল্লিখিত যেকোনো আর্থিক শর্ত শুধুমাত্র লিখিত চুক্তির অংশ হিসেবে গণ্য; প্রকৃত অর্থ গ্রহণ বা রসিদ প্রদানের বিষয়টি মসজিদের পৃথক হিসাব ব্যবস্থায় পরিচালিত হবে।',
    defaultTerminationClause:
      'যেকোনো পক্ষ চুক্তি বাতিল করতে চাইলে কমপক্ষে ৬০ (ষাট) দিন পূর্বে লিখিত নোটিশ প্রদান করবেন।',
    defaultDisputeResolutionClause:
      'উভয় পক্ষের মধ্যে কোনো বিরোধ সৃষ্টি হলে মসজিদ পরিচালনা কমিটির বৈঠকে আলোচনার মাধ্যমে নিষ্পত্তি করা হবে।',
    defaultWrittenFinancialMode: 'INSTALLMENT',
    isSystem: true,
  },
  {
    id: 'sys-tpl-service-maintenance',
    titleBn: 'সেবা প্রদান ও মেরামত-রক্ষণাবেক্ষণ চুক্তিপত্র',
    categoryCode: 'SERVICE_PROVISION',
    descriptionBn: 'এসি, জেনারেটর, সাউন্ড সিস্টেম, পানির পাম্প বা নিয়মিত টেকনিক্যাল সেবা ও রক্ষণাবেক্ষণ চুক্তি।',
    defaultPurpose: 'মসজিদের নির্ধারিত যন্ত্রপাতি ও সুবিধাসমূহের নিরবচ্ছিন্ন রক্ষণাবেক্ষণ ও সময়মতো টেকনিক্যাল সেবা নিশ্চিত করা।',
    defaultGeneralClauses:
      '১. দ্বিতীয় পক্ষ নির্ধারিত সূচি অনুযায়ী প্রতি মাসে নিয়মিত পরিদর্শন ও রক্ষণাবেক্ষণ সেবা প্রদান করবেন।\n' +
      '২. জরুরি ত্রুটি দেখা দিলে অবহিত করার ২৪ ঘণ্টার মধ্যে কারিগরি প্রতিনিধি প্রেরণ করে সমাধানের ব্যবস্থা করবেন।\n' +
      '৩. যন্ত্রাংশ পরিবর্তনের প্রয়োজন হলে পূর্বেই লিখিত প্রাক্কলন ও মসজিদ কমিটির অনুমোদন গ্রহণ করতে হবে।',
    defaultSpecialClauses:
      'সেবা প্রদানকারী টেকনিশিয়ানগণ প্রতি ভিজিটের পর সার্ভিস লগবুকে তারিখ ও কাজের বিবরণ লিপিবদ্ধ করবেন।',
    defaultTerminationClause:
      'সেবার মান সন্তোষজনক না হলে ১৫ (পনেরো) দিনের লিখিত নোটিশে চুক্তি বাতিল করা যাবে।',
    defaultDisputeResolutionClause:
      'যেকোনো কারিগরি বা সেবাগত মতবিরোধ উভয় পক্ষের প্রতিনিধিদের যৌথ পরিদর্শনের মাধ্যমে সমাধান করা হবে।',
    defaultWrittenFinancialMode: 'LUMP_SUM',
    isSystem: true,
  },
  {
    id: 'sys-tpl-mutual-mou',
    titleBn: 'পারস্পরিক সহযোগিতা ও সমঝোতা স্মারক (MOU)',
    categoryCode: 'SETTLEMENT_MOU',
    descriptionBn: 'এলাকাবাসী, মাদরাসা, কবরস্থান কমিটি বা সামাজিক সংগঠনের সাথে দায়িত্ব বণ্টন ও সমঝোতা চুক্তি।',
    defaultPurpose: 'সংশ্লিষ্ট পক্ষসমূহের মধ্যে পারস্পরিক সহযোগিতা, দায়িত্ব বণ্টন ও শান্তিপূর্ণ সমন্বয় প্রতিষ্ঠা করা।',
    defaultGeneralClauses:
      '১. সকল পক্ষ পারস্পরিক শ্রদ্ধা, স্বচ্ছতা ও জনকল্যাণমূলক মনোভাব নিয়ে চুক্তির লক্ষ্য বাস্তবায়নে সহযোগিতা করবেন।\n' +
      '২. কোনো পক্ষ অপর পক্ষের লিখিত সম্মতি ব্যতীত যৌথ সিদ্ধান্ত পরিবর্তন করবেন না।\n' +
      '৩. যৌথ কার্যক্রমের অগ্রগতি নিয়মিত বৈঠকের মাধ্যমে পর্যালোচনা ও নথিভুক্ত করা হবে।',
    defaultSpecialClauses:
      'এই সমঝোতা স্মারকটি সম্পূর্ণরূপে পারস্পরিক অঙ্গীকার ও দায়িত্ব বণ্টনের দলিল; এতে কোনো সরাসরি আর্থিক লেনদেন বা হিসাব-নিকাশ সংযুক্ত নয়।',
    defaultTerminationClause:
      'সকল পক্ষের যৌথ লিখিত সিদ্ধান্তে অথবা ৩০ দিনের পূর্ব নোটিশে এই সমঝোতা সংশোধন বা সমাপ্ত করা যাবে।',
    defaultDisputeResolutionClause:
      'কোনো ভুল বোঝাবুঝি হলে সকল পক্ষের প্রতিনিধিদের যৌথ সভায় সৌহার্দ্যপূর্ণভাবে সমাধান করা হবে।',
    defaultWrittenFinancialMode: 'NON_FINANCIAL',
    isSystem: true,
  },
];

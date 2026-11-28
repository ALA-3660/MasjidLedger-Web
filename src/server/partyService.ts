import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db.ts';
import { User, Mosque, IncomeEntry, ExpenseEntry, Staff } from '../types/index.ts';
import { AgreementRecord } from '../types/agreementTypes.ts';
import {
  PartyAgreementReference,
  PartyArtisanDetails,
  PartyAuditFieldChange,
  PartyAuditLogEntry,
  PartyCategorizedVoucher,
  PartyCustomRoleDef,
  PartyDuplicateCandidatePair,
  PartyDuplicateReasonCode,
  PartyHistoryBundle,
  PartyHistorySummary,
  PartyMergeHistoryRecord,
  PartyOcrDocType,
  PartyOrganizationDetails,
  PartyPermissionKey,
  PartyProfileType,
  PartyRecord,
  PartyRegistryStats,
  PartyReportBundle,
  PartyReportDirectoryRow,
  PartyReportHistoryRow,
  PartyRoleCategoryGroup,
  PartyStaffLinkRef,
  PartyStatus,
  PartyTimelineItem,
  PartyTimelineItemKind,
  PartyVoucherReference,
  PartyVoucherSnapshot,
} from '../types/partyTypes.ts';
import {
  ARTISAN_LABOUR_ROLES,
  BUILT_IN_PARTY_ROLES,
  CONTRACTOR_PROVIDER_ROLES,
  SELLER_SUPPLIER_ROLES,
  formatPartyAddressLine,
  getPartyRoleLabelBn,
  partyMatchesCategoryGroup,
} from '../lib/partyCatalog.ts';
import { getClientIp, logSecurityAuditEvent } from './security/securityMiddleware.ts';
import { checkPartyOcrRateLimit, scanPartyDocumentWithCentralAi } from './partyOcrService.ts';

export interface PartyAuthRequest extends Request {
  user?: User;
  currentMosque?: Mosque;
}

const VALID_PARTY_TYPES = new Set<PartyProfileType>(['INDIVIDUAL', 'ORGANIZATION']);
const VALID_PARTY_STATUSES = new Set<PartyStatus>(['ACTIVE', 'INACTIVE']);
const VALID_ROLE_CATEGORY_GROUPS = new Set<PartyRoleCategoryGroup>([
  'BUYER',
  'SELLER_SUPPLIER',
  'ARTISAN_LABOUR',
  'CONTRACTOR_PROVIDER',
  'OTHER',
]);

// ==========================================
// 1. Granular Backend RBAC Permission Engine
// ==========================================
const ACCOUNTANT_TREASURER_PERMS = new Set<PartyPermissionKey>([
  'party.view',
  'party.create',
  'party.edit',
  'party.manage_roles',
  'party.view_audit',
  'party.view_sensitive',
  'party.ocr',
]);

const OPERATOR_PERMS = new Set<PartyPermissionKey>([
  'party.view',
  'party.create',
  'party.edit',
  'party.view_sensitive',
  'party.ocr',
]);

const AUDITOR_PERMS = new Set<PartyPermissionKey>([
  'party.view',
  'party.view_audit',
  'party.view_sensitive',
]);

const VIEWER_PERMS = new Set<PartyPermissionKey>(['party.view']);

export function hasPartyPermission(user: User | undefined | null, perm: PartyPermissionKey): boolean {
  if (!user) return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes(perm)) return true;

  if (user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN' || user.role === 'COMMITTEE_ADMIN') {
    return true;
  }
  if (user.role === 'ACCOUNTANT' || user.role === 'TREASURER') {
    return ACCOUNTANT_TREASURER_PERMS.has(perm);
  }
  if (user.role === 'DATA_ENTRY_OPERATOR') {
    return OPERATOR_PERMS.has(perm);
  }
  if (user.role === 'AUDITOR') {
    return AUDITOR_PERMS.has(perm);
  }
  if (user.role === 'VIEWER') {
    return VIEWER_PERMS.has(perm);
  }
  return false;
}

function denyPermission(req: PartyAuthRequest, res: Response, perm: PartyPermissionKey) {
  const user = req.user;
  logSecurityAuditEvent({
    mosqueId: req.currentMosque?.id,
    userId: user?.id || 'UNKNOWN',
    userName: user?.name || 'Unknown',
    userRole: user?.role || 'UNKNOWN',
    action: 'PERMISSION_DENIED',
    details: `ব্যক্তি ও প্রতিষ্ঠান রেজিস্ট্রি অনুমতি (${perm}) না থাকায় অনুরোধ প্রত্যাখ্যাত (${req.method} ${req.path})`,
    ipAddress: getClientIp(req),
    status: 'FAILED',
  });
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'এই কার্যক্রমটি সম্পন্ন করার পর্যাপ্ত অনুমতি আপনার নেই।',
    },
  });
}

// ==========================================
// 2. Sanitization & Normalization Helpers
// ==========================================
function cleanStr(val: unknown, maxLen: number = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function cleanOptionalStr(val: unknown, maxLen: number = 500): string | undefined {
  const s = cleanStr(val, maxLen);
  return s ? s : undefined;
}

function toAsciiDigits(input: string): string {
  const bnMap: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return String(input || '').replace(/[০-৯٠-٩]/g, (d) => bnMap[d] ?? d);
}

export function normalizePhoneNumber(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('880') && digits.length >= 13) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('88') && digits.length === 13) {
    return digits.slice(2);
  }
  return digits;
}

export function normalizeNidNumber(raw?: string): string {
  if (!raw) return '';
  return toAsciiDigits(raw).replace(/[^\d]/g, '');
}

export function normalizeNameForMatch(raw?: string): string {
  if (!raw) return '';
  return toAsciiDigits(raw)
    .toLowerCase()
    .replace(/[.,\-_/()'"`~!@#$%^&*+=[\]{};:<>?\\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizePhotoOrLogoUrl(raw: unknown): string | undefined {
  const val = cleanStr(raw, 1_500_000);
  if (!val) return undefined;
  if (val.startsWith('/api/v1/') || val.startsWith('/uploads/')) return val;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(val)) {
    return val;
  }
  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return val.slice(0, 1000);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function sanitizeSafeWebsite(raw: unknown): string | undefined {
  const val = cleanStr(raw, 300);
  if (!val) return undefined;
  const candidate = /^https?:\/\//i.test(val) ? val : `https://${val}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function sanitizeRoles(raw: unknown, mosqueCustomRoles: PartyCustomRoleDef[]): string[] {
  if (!Array.isArray(raw)) return [];
  const validCodes = new Set<string>([
    ...BUILT_IN_PARTY_ROLES.map((r) => r.code),
    ...mosqueCustomRoles.map((cr) => cr.code),
  ]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const code = cleanStr(item, 60).toUpperCase();
    if (!code || !validCodes.has(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

function sanitizeOrganizationDetails(raw: unknown): PartyOrganizationDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const cleaned: PartyOrganizationDetails = {
    registrationOrTradeLicenseNo: cleanOptionalStr(r.registrationOrTradeLicenseNo, 100),
    tinOrBin: cleanOptionalStr(r.tinOrBin, 80),
    contactPersonName: cleanOptionalStr(r.contactPersonName, 160),
    contactPersonDesignation: cleanOptionalStr(r.contactPersonDesignation, 120),
    contactPersonPhone: cleanOptionalStr(r.contactPersonPhone, 35),
    website: sanitizeSafeWebsite(r.website),
    businessCategory: cleanOptionalStr(r.businessCategory, 160),
    establishedYear: cleanOptionalStr(r.establishedYear, 20),
  };
  return Object.values(cleaned).some((v) => v !== undefined) ? cleaned : undefined;
}

function sanitizeArtisanDetails(raw: unknown): PartyArtisanDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const cleaned: PartyArtisanDetails = {
    primaryTrade: cleanOptionalStr(r.primaryTrade, 160),
    experienceYears: cleanOptionalStr(r.experienceYears, 60),
    wageUnitLabel: cleanOptionalStr(r.wageUnitLabel, 80),
    descriptiveWageRateText: cleanOptionalStr(r.descriptiveWageRateText, 240),
    teamSizeOrHelpers: cleanOptionalStr(r.teamSizeOrHelpers, 80),
    toolsAvailable: cleanOptionalStr(r.toolsAvailable, 300),
    availabilityNote: cleanOptionalStr(r.availabilityNote, 240),
  };
  return Object.values(cleaned).some((v) => v !== undefined) ? cleaned : undefined;
}

function generateNextPartyCode(mosqueId: string): string {
  const year = new Date().getFullYear();
  const prefix = `PTY-${year}-`;
  const existing = (db.parties || []).filter((p) => p.mosqueId === mosqueId);
  let maxSeq = 0;
  for (const p of existing) {
    const code = String(p.partyCode || '');
    if (code.startsWith(prefix)) {
      const num = parseInt(code.slice(prefix.length), 10);
      if (Number.isFinite(num) && num > maxSeq) maxSeq = num;
    }
  }
  const nextNum = Math.max(existing.length + 1, maxSeq + 1);
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// ==========================================
// 3. Duplicate Detection Engine (Tenant-Scoped)
// ==========================================
const DUPLICATE_REASON_LABELS: Record<PartyDuplicateReasonCode, string> = {
  PHONE_MATCH: 'একই প্রাথমিক মোবাইল নম্বর',
  ALT_PHONE_MATCH: 'মোবাইল ও বিকল্প মোবাইল নম্বরের মিল',
  NID_MATCH: 'একই জাতীয় পরিচয়পত্র (NID) নম্বর',
  ORG_NAME_PHONE_MATCH: 'একই প্রতিষ্ঠানের নাম ও মোবাইল',
  ORG_NAME_EXACT_MATCH: 'একই প্রতিষ্ঠানের নাম',
  NAME_PHONE_MATCH: 'একই নাম ও মোবাইল নম্বর',
};

function comparePartyMatch(
  candidate: {
    id?: string;
    partyType: PartyProfileType;
    name: string;
    phone: string;
    alternatePhone?: string;
    nidNumber?: string;
  },
  existing: PartyRecord
): { reasons: PartyDuplicateReasonCode[]; confidence: 'HIGH' | 'MEDIUM' } | null {
  if (existing.mergedIntoPartyId) return null;
  if (candidate.id && existing.id === candidate.id) return null;

  const candPhone = normalizePhoneNumber(candidate.phone);
  const candAlt = normalizePhoneNumber(candidate.alternatePhone || '');
  const candNid = normalizeNidNumber(candidate.nidNumber);
  const candName = normalizeNameForMatch(candidate.name);

  const exPhone = existing.normalizedPhone || normalizePhoneNumber(existing.phone);
  const exAlt = existing.normalizedAltPhone || normalizePhoneNumber(existing.alternatePhone || '');
  const exNid = existing.normalizedNid || normalizeNidNumber(existing.nidNumber);
  const exName = normalizeNameForMatch(existing.name);

  const reasons: PartyDuplicateReasonCode[] = [];

  if (candPhone && exPhone && candPhone.length >= 6 && candPhone === exPhone) {
    reasons.push('PHONE_MATCH');
  } else if (
    (candPhone && exAlt && candPhone.length >= 6 && candPhone === exAlt) ||
    (candAlt && exPhone && candAlt.length >= 6 && candAlt === exPhone) ||
    (candAlt && exAlt && candAlt.length >= 6 && candAlt === exAlt)
  ) {
    reasons.push('ALT_PHONE_MATCH');
  }

  if (candNid && exNid && candNid.length >= 8 && candNid === exNid) {
    reasons.push('NID_MATCH');
  }

  const sameName = Boolean(candName && exName && candName.length >= 3 && candName === exName);
  if (sameName) {
    if (candidate.partyType === 'ORGANIZATION' || existing.partyType === 'ORGANIZATION') {
      if (reasons.includes('PHONE_MATCH') || reasons.includes('ALT_PHONE_MATCH')) {
        reasons.push('ORG_NAME_PHONE_MATCH');
      } else {
        reasons.push('ORG_NAME_EXACT_MATCH');
      }
    } else if (reasons.includes('PHONE_MATCH') || reasons.includes('ALT_PHONE_MATCH')) {
      reasons.push('NAME_PHONE_MATCH');
    }
  }

  if (reasons.length === 0) return null;

  const highConfidence =
    reasons.includes('PHONE_MATCH') ||
    reasons.includes('ALT_PHONE_MATCH') ||
    reasons.includes('NID_MATCH') ||
    reasons.includes('ORG_NAME_PHONE_MATCH') ||
    reasons.includes('NAME_PHONE_MATCH');

  return {
    reasons,
    confidence: highConfidence ? 'HIGH' : 'MEDIUM',
  };
}

function findTenantDuplicatePairs(mosqueId: string): PartyDuplicateCandidatePair[] {
  const activeRecords = (db.parties || [])
    .filter((p) => p.mosqueId === mosqueId && !p.mergedIntoPartyId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const pairs: PartyDuplicateCandidatePair[] = [];
  for (let i = 0; i < activeRecords.length; i++) {
    for (let j = i + 1; j < activeRecords.length; j++) {
      const primaryParty = activeRecords[i];
      const duplicateParty = activeRecords[j];
      const match = comparePartyMatch(
        {
          id: duplicateParty.id,
          partyType: duplicateParty.partyType,
          name: duplicateParty.name,
          phone: duplicateParty.phone,
          alternatePhone: duplicateParty.alternatePhone,
          nidNumber: duplicateParty.nidNumber,
        },
        primaryParty
      );
      if (!match) continue;
      pairs.push({
        pairKey: `${primaryParty.id}__${duplicateParty.id}`,
        confidence: match.confidence,
        reasons: match.reasons,
        reasonLabelsBn: match.reasons.map((r) => DUPLICATE_REASON_LABELS[r]),
        primaryParty,
        duplicateParty,
      });
    }
  }
  return pairs;
}

function appendPartyAudit(params: {
  mosqueId: string;
  partyId: string;
  partyCode?: string;
  partyName: string;
  action: PartyAuditLogEntry['action'];
  summaryBn: string;
  changedFields?: PartyAuditFieldChange[];
  mergedSourcePartyId?: string;
  mergedTargetPartyId?: string;
  user: User;
  ipAddress?: string;
}) {
  if (!db.partyAuditLogs) db.partyAuditLogs = [];
  const entry: PartyAuditLogEntry = {
    id: `paud-${crypto.randomUUID().slice(0, 10)}`,
    mosqueId: params.mosqueId,
    partyId: params.partyId,
    partyCode: params.partyCode,
    partyName: params.partyName,
    action: params.action,
    summaryBn: params.summaryBn,
    changedFields: params.changedFields && params.changedFields.length > 0 ? params.changedFields : undefined,
    mergedSourcePartyId: params.mergedSourcePartyId,
    mergedTargetPartyId: params.mergedTargetPartyId,
    actorId: params.user.id,
    actorName: params.user.name,
    actorRole: params.user.role,
    ipAddress: params.ipAddress,
    timestamp: new Date().toISOString(),
  };
  db.partyAuditLogs.unshift(entry);
  return entry;
}

// ==========================================
// 3B. Part 2 Cross-Module Helpers (Snapshot & Reference Only — Zero Financial Posting)
// ==========================================
function formatPartyAddressForSnapshot(party: PartyRecord): string | undefined {
  const parts = [
    party.fullAddress,
    party.villageOrMahalla,
    party.unionOrWard,
    party.upazila,
    party.district,
  ]
    .map((x) => (x || '').trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return Array.from(new Set(parts)).join(', ');
}

export function resolveTenantParty(mosqueId: string, partyIdOrCode?: string | null): PartyRecord | null {
  const needle = cleanStr(partyIdOrCode, 100);
  if (!needle) return null;
  const tenantParties = (db.parties || []).filter((p) => p.mosqueId === mosqueId);
  let matched = tenantParties.find(
    (p) => p.partyId === needle || p.id === needle || p.partyCode === needle
  );
  if (!matched) return null;

  // Follow merge chain safely with cycle protection
  const seen = new Set<string>([matched.partyId]);
  while (matched.mergedIntoPartyId && !seen.has(matched.mergedIntoPartyId)) {
    seen.add(matched.mergedIntoPartyId);
    const parent = tenantParties.find((p) => p.partyId === matched!.mergedIntoPartyId);
    if (!parent) break;
    matched = parent;
  }
  return matched;
}

export function buildPartySnapshot(party: PartyRecord): PartyVoucherSnapshot {
  return {
    partyId: party.partyId,
    partyCode: party.partyCode,
    name: party.name,
    partyType: party.partyType,
    phone: party.phone,
    address: formatPartyAddressForSnapshot(party),
    occupationOrSkill: party.occupationOrSkill,
    roles: Array.isArray(party.roles) ? [...party.roles] : [],
  };
}

export function syncVoucherReferenceToParty(
  mosqueId: string,
  voucherType: 'INCOME' | 'EXPENSE',
  entry: Partial<IncomeEntry & ExpenseEntry> & { id: string; voucherNumber: string }
): void {
  if (!db.parties || !entry?.id) return;
  const nowIso = new Date().toISOString();
  const targetParty = entry.partyId ? resolveTenantParty(mosqueId, entry.partyId) : null;
  let mutated = false;

  for (const party of db.parties) {
    if (party.mosqueId !== mosqueId) continue;
    const refs = Array.isArray(party.voucherReferences) ? party.voucherReferences : [];
    const existingIdx = refs.findIndex(
      (r) => r.voucherId === entry.id && r.voucherType === voucherType
    );

    if (targetParty && party.partyId === targetParty.partyId) {
      const nextRef: PartyVoucherReference = {
        voucherId: entry.id,
        voucherNumber: entry.voucherNumber || '',
        voucherType,
        date: entry.date || nowIso.slice(0, 10),
        amount: Number(entry.amount) || 0,
        headNameBn: entry.mainHeadNameBn || (voucherType === 'INCOME' ? 'সাধারণ আয়' : 'সাধারণ ব্যয়'),
        subHeadNameBn: entry.subHeadNameBn,
        status: entry.status || 'APPROVED',
        snapshotName:
          entry.partySnapshot?.name ||
          (voucherType === 'INCOME' ? entry.donorName : entry.payeeName) ||
          targetParty.name,
        snapshotPhone:
          entry.partySnapshot?.phone ||
          (voucherType === 'INCOME' ? entry.donorPhone : entry.payeePhone) ||
          targetParty.phone,
        sourceModule: (entry as any).sourceModule,
        description: entry.description,
        linkedAt: existingIdx >= 0 ? refs[existingIdx].linkedAt : nowIso,
        updatedAt: nowIso,
      };
      if (existingIdx >= 0) {
        refs[existingIdx] = nextRef;
      } else {
        refs.unshift(nextRef);
      }
      party.voucherReferences = refs.slice(0, 500);
      mutated = true;
    } else if (existingIdx >= 0) {
      refs.splice(existingIdx, 1);
      party.voucherReferences = refs;
      mutated = true;
    }
  }

  if (mutated && typeof db.save === 'function') {
    db.save();
  }
}

export function syncAgreementReferencesToParties(
  mosqueId: string,
  agreement: AgreementRecord
): void {
  if (!db.parties || !agreement?.id) return;
  const nowIso = new Date().toISOString();
  let mutated = false;

  // Map resolved partyId -> list of matching role entries on this agreement
  const linksByPartyId = new Map<string, PartyAgreementReference[]>();
  for (const ap of agreement.parties || []) {
    if (ap.linkedPartyId) {
      const resolved = resolveTenantParty(mosqueId, ap.linkedPartyId);
      if (resolved) {
        const list = linksByPartyId.get(resolved.partyId) || [];
        list.push({
          agreementId: agreement.id,
          agreementNumber: agreement.agreementNumber,
          title: agreement.title,
          categoryNameBn: agreement.categoryNameBn,
          agreementDate: agreement.agreementDate,
          status: agreement.status,
          roleLabel: ap.roleLabel || 'পক্ষ',
          snapshotName: ap.name,
          isRepresentative: false,
          linkedAt: nowIso,
          updatedAt: nowIso,
        });
        linksByPartyId.set(resolved.partyId, list);
      }
    }
    for (const rep of ap.representatives || []) {
      if (rep.linkedPartyId) {
        const resolvedRep = resolveTenantParty(mosqueId, rep.linkedPartyId);
        if (resolvedRep) {
          const list = linksByPartyId.get(resolvedRep.partyId) || [];
          list.push({
            agreementId: agreement.id,
            agreementNumber: agreement.agreementNumber,
            title: agreement.title,
            categoryNameBn: agreement.categoryNameBn,
            agreementDate: agreement.agreementDate,
            status: agreement.status,
            roleLabel: `${ap.roleLabel || 'পক্ষ'} (প্রতিনিধি: ${rep.designation || 'প্রতিনিধি'})`,
            snapshotName: rep.name,
            isRepresentative: true,
            linkedAt: nowIso,
            updatedAt: nowIso,
          });
          linksByPartyId.set(resolvedRep.partyId, list);
        }
      }
    }
  }

  for (const party of db.parties) {
    if (party.mosqueId !== mosqueId) continue;
    const refs = Array.isArray(party.agreementReferences) ? party.agreementReferences : [];
    const oldMatching = refs.filter((r) => r.agreementId === agreement.id);
    const otherRefs = refs.filter((r) => r.agreementId !== agreement.id);
    const newRefsForAgreement = linksByPartyId.get(party.partyId);

    if (newRefsForAgreement && newRefsForAgreement.length > 0 && !agreement.isArchived) {
      const preserved = newRefsForAgreement.map((nr, i) => ({
        ...nr,
        linkedAt: oldMatching[i]?.linkedAt || oldMatching[0]?.linkedAt || nr.linkedAt,
      }));
      party.agreementReferences = [...preserved, ...otherRefs].slice(0, 300);
      mutated = true;
    } else if (oldMatching.length > 0) {
      if (agreement.isArchived) {
        party.agreementReferences = [
          ...oldMatching.map((r) => ({ ...r, status: agreement.status || 'ARCHIVED', updatedAt: nowIso })),
          ...otherRefs,
        ];
      } else {
        party.agreementReferences = otherRefs;
      }
      mutated = true;
    }
  }

  if (mutated && typeof db.save === 'function') {
    db.save();
  }
}

export function findDuplicateStaffAndParties(params: {
  mosqueId: string;
  phone?: string;
  nid?: string;
  name?: string;
  excludeStaffId?: string;
}) {
  const { mosqueId, phone, nid, name, excludeStaffId } = params;
  const normPhone = normalizePhoneNumber(phone || '');
  const normNid = normalizeNidNumber(nid || '');
  const normName = normalizeNameForMatch(name || '');

  const matchingStaff = (db.staffList || []).filter((s) => {
    if (s.mosqueId !== mosqueId) return false;
    if (excludeStaffId && s.id === excludeStaffId) return false;
    if (s.status === 'INACTIVE' || s.status === 'TERMINATED' || s.status === 'EMPLOYMENT_ENDED') return false;
    const sPhone = normalizePhoneNumber(s.phone || '');
    const sAltPhone = normalizePhoneNumber(s.alternatePhone || s.altPhone || '');
    const sNid = normalizeNidNumber(s.nid || '');
    const sName = normalizeNameForMatch(s.fullNameBn || s.name);
    if (normPhone && normPhone.length >= 6 && (sPhone === normPhone || sAltPhone === normPhone)) return true;
    if (normNid && normNid.length >= 8 && sNid === normNid) return true;
    if (normName && normName.length >= 4 && sName === normName) return true;
    return false;
  });

  const matchingParties = (db.parties || [])
    .filter((p) => p.mosqueId === mosqueId && !p.mergedIntoPartyId)
    .filter((p) => {
      const pPhone = p.normalizedPhone || normalizePhoneNumber(p.phone || '');
      const pAlt = p.normalizedAltPhone || normalizePhoneNumber(p.alternatePhone || '');
      const pNid = p.normalizedNid || normalizeNidNumber(p.nidNumber || '');
      const pName = normalizeNameForMatch(p.name);
      if (normPhone && normPhone.length >= 6 && (pPhone === normPhone || pAlt === normPhone)) return true;
      if (normNid && normNid.length >= 8 && pNid === normNid) return true;
      if (normName && normName.length >= 4 && pName === normName) return true;
      return false;
    });

  return { matchingStaff, matchingParties };
}

export function syncStaffPartyLink(params: {
  mosqueId: string;
  staff: Staff;
  user: User;
  ipAddress?: string;
  partyId?: string | null;
  createNewIfMissing?: boolean;
}): { staff: Staff; party?: PartyRecord | null; errorCode?: string; errorMessage?: string } {
  const { mosqueId, staff, user, ipAddress, partyId, createNewIfMissing } = params;
  if (!db.parties) db.parties = [];
  if (!db.staffList) db.staffList = [];

  const nowIso = new Date().toISOString();

  // Clear previous party back-ref if unlinking or changing party
  const clearOtherPartiesForStaff = (keepPartyId?: string) => {
    for (const p of db.parties) {
      if (p.mosqueId !== mosqueId) continue;
      if (keepPartyId && p.partyId === keepPartyId) continue;
      if (p.linkedStaffId === staff.id) {
        p.linkedStaffId = undefined;
        p.linkedStaffCode = undefined;
      }
      if (Array.isArray(p.linkedStaffRefs) && p.linkedStaffRefs.some((r) => r.staffId === staff.id)) {
        p.linkedStaffRefs = p.linkedStaffRefs.filter((r) => r.staffId !== staff.id);
      }
    }
  };

  if (partyId === null) {
    staff.linkedPartyId = undefined;
    staff.linkedPartyCode = undefined;
    clearOtherPartiesForStaff(undefined);
    db.save();
    return { staff, party: null };
  }

  let targetParty: PartyRecord | null = null;
  if (partyId) {
    targetParty = resolveTenantParty(mosqueId, partyId);
    if (!targetParty) {
      return {
        staff,
        errorCode: 'PARTY_NOT_FOUND',
        errorMessage: 'সংযুক্ত করার জন্য নির্বাচিত পার্টি প্রোফাইলটি এই মসজিদে পাওয়া যায়নি।',
      };
    }
    const conflictingStaff = (db.staffList || []).find(
      (s) =>
        s.mosqueId === mosqueId &&
        s.id !== staff.id &&
        s.linkedPartyId === targetParty!.partyId &&
        s.status !== 'EMPLOYMENT_ENDED' &&
        s.status !== 'INACTIVE'
    );
    if (conflictingStaff) {
      return {
        staff,
        errorCode: 'PARTY_ALREADY_LINKED_TO_STAFF',
        errorMessage: `এই পার্টি প্রোফাইলটি ইতিমধ্যেই স্টাফ "${conflictingStaff.fullNameBn || conflictingStaff.name}" (${conflictingStaff.staffCode || conflictingStaff.id})-এর সাথে সংযুক্ত রয়েছে।`,
      };
    }
  } else if (createNewIfMissing) {
    // Prevent duplicate Party creation by matching phone or NID first
    const normPhone = normalizePhoneNumber(staff.phone || '');
    const normNid = normalizeNidNumber(staff.nid || '');
    const existingMatchedParty = db.parties.find((p) => {
      if (p.mosqueId !== mosqueId || p.mergedIntoPartyId) return false;
      const pPhone = p.normalizedPhone || normalizePhoneNumber(p.phone || '');
      const pNid = p.normalizedNid || normalizeNidNumber(p.nidNumber || '');
      if (normPhone && normPhone.length >= 6 && pPhone === normPhone) return true;
      if (normNid && normNid.length >= 8 && pNid === normNid) return true;
      return false;
    });

    if (existingMatchedParty) {
      const otherLinkedStaff = (db.staffList || []).find(
        (s) => s.mosqueId === mosqueId && s.id !== staff.id && s.linkedPartyId === existingMatchedParty.partyId
      );
      if (otherLinkedStaff) {
        return {
          staff,
          errorCode: 'DUPLICATE_PARTY_STAFF_CONFLICT',
          errorMessage: `এই মোবাইল/NID-এর পার্টি প্রোফাইল (${existingMatchedParty.partyCode}) ইতিমধ্যেই অন্য স্টাফ "${otherLinkedStaff.fullNameBn || otherLinkedStaff.name}"-এর সাথে সংযুক্ত।`,
        };
      }
      targetParty = existingMatchedParty;
    } else if (normPhone && normPhone.length >= 6) {
      const id = `pty-${crypto.randomUUID().slice(0, 12)}`;
      const newParty: PartyRecord = {
        id,
        partyId: id,
        partyCode: generateNextPartyCode(mosqueId),
        mosqueId,
        tenantId: mosqueId,
        partyType: 'INDIVIDUAL',
        name: (staff.fullNameBn || staff.name || '').trim(),
        roles: ['OTHER'],
        photoOrLogoUrl: staff.photoUrl || undefined,
        phone: (staff.phone || '').trim(),
        normalizedPhone: normPhone,
        alternatePhone: staff.alternatePhone || staff.altPhone || undefined,
        normalizedAltPhone:
          staff.alternatePhone || staff.altPhone
            ? normalizePhoneNumber(staff.alternatePhone || staff.altPhone || '')
            : undefined,
        email: staff.email || undefined,
        fullAddress: staff.presentAddress || staff.address || staff.permanentAddress || undefined,
        nidNumber: staff.nid || undefined,
        normalizedNid: normNid || undefined,
        occupationOrSkill: `মসজিদ স্টাফ · ${staff.designationBn || staff.designation}`,
        notes: `নিয়মিত স্টাফ প্রোফাইল (${staff.staffCode || staff.id}) থেকে স্বয়ংক্রিয়ভাবে সংযুক্ত।`,
        status: staff.status === 'INACTIVE' || staff.status === 'EMPLOYMENT_ENDED' ? 'INACTIVE' : 'ACTIVE',
        linkedStaffId: staff.id,
        linkedStaffCode: staff.staffCode,
        linkedStaffRefs: [
          {
            staffId: staff.id,
            staffCode: staff.staffCode,
            name: staff.fullNameBn || staff.name,
            designationBn: staff.designationBn,
            phone: staff.phone,
            status: staff.status,
            linkedAt: nowIso,
          },
        ],
        createdAt: nowIso,
        createdBy: user.id,
        createdByName: user.name,
        updatedAt: nowIso,
        updatedBy: user.id,
        updatedByName: user.name,
      };
      db.parties.unshift(newParty);
      appendPartyAudit({
        mosqueId,
        partyId: newParty.partyId,
        partyCode: newParty.partyCode,
        partyName: newParty.name,
        action: 'CREATED',
        summaryBn: `নিয়মিত স্টাফ (${staff.staffCode || staff.id}) থেকে কেন্দ্রীয় পার্টি প্রোফাইল তৈরি ও সংযুক্ত হয়েছে।`,
        user,
        ipAddress,
      });
      targetParty = newParty;
    }
  }

  if (!targetParty) {
    return { staff, party: null };
  }

  clearOtherPartiesForStaff(targetParty.partyId);

  staff.linkedPartyId = targetParty.partyId;
  staff.linkedPartyCode = targetParty.partyCode;

  targetParty.linkedStaffId = staff.id;
  targetParty.linkedStaffCode = staff.staffCode;
  const existingStaffRefs = Array.isArray(targetParty.linkedStaffRefs) ? targetParty.linkedStaffRefs : [];
  const nextStaffRef: PartyStaffLinkRef = {
    staffId: staff.id,
    staffCode: staff.staffCode,
    name: staff.fullNameBn || staff.name,
    designationBn: staff.designationBn,
    phone: staff.phone,
    status: staff.status,
    linkedAt: existingStaffRefs.find((r) => r.staffId === staff.id)?.linkedAt || nowIso,
  };
  targetParty.linkedStaffRefs = [
    nextStaffRef,
    ...existingStaffRefs.filter((r) => r.staffId !== staff.id),
  ];
  targetParty.updatedAt = nowIso;
  targetParty.updatedBy = user.id;
  targetParty.updatedByName = user.name;

  appendPartyAudit({
    mosqueId,
    partyId: targetParty.partyId,
    partyCode: targetParty.partyCode,
    partyName: targetParty.name,
    action: 'STAFF_LINKED',
    summaryBn: `নিয়মিত স্টাফ প্রোফাইল "${staff.fullNameBn || staff.name}" (${staff.staffCode || staff.id} · ${staff.designationBn}) এই পার্টি প্রোফাইলের সাথে সংযুক্ত হয়েছে।`,
    user,
    ipAddress,
  });

  db.save();
  return { staff, party: targetParty };
}

function buildPartyCrossReferences(mosqueId: string, targetIds: Set<string>, directMatch: PartyRecord) {
  const voucherMap = new Map<string, PartyVoucherReference>();
  for (const r of directMatch.voucherReferences || []) {
    voucherMap.set(`${r.voucherType}:${r.voucherId}`, r);
  }
  for (const inc of db.incomeEntries || []) {
    if (inc.mosqueId !== mosqueId || !inc.partyId || !targetIds.has(inc.partyId)) continue;
    const key = `INCOME:${inc.id}`;
    voucherMap.set(key, {
      voucherId: inc.id,
      voucherNumber: inc.voucherNumber,
      voucherType: 'INCOME',
      date: inc.date,
      amount: Number(inc.amount) || 0,
      headNameBn: inc.mainHeadNameBn || 'সাধারণ আয়',
      subHeadNameBn: inc.subHeadNameBn,
      status: inc.status,
      snapshotName: inc.partySnapshot?.name || inc.donorName || directMatch.name,
      snapshotPhone: inc.partySnapshot?.phone || inc.donorPhone,
      description: inc.description,
      linkedAt: inc.createdAt,
      updatedAt: inc.updatedAt,
    });
  }
  for (const exp of db.expenseEntries || []) {
    if (exp.mosqueId !== mosqueId || !exp.partyId || !targetIds.has(exp.partyId)) continue;
    const key = `EXPENSE:${exp.id}`;
    voucherMap.set(key, {
      voucherId: exp.id,
      voucherNumber: exp.voucherNumber,
      voucherType: 'EXPENSE',
      date: exp.date,
      amount: Number(exp.amount) || 0,
      headNameBn: exp.mainHeadNameBn || 'সাধারণ ব্যয়',
      subHeadNameBn: exp.subHeadNameBn,
      status: exp.status,
      snapshotName: exp.partySnapshot?.name || exp.payeeName || directMatch.name,
      snapshotPhone: exp.partySnapshot?.phone || exp.payeePhone,
      sourceModule: exp.sourceModule,
      description: exp.description,
      linkedAt: exp.createdAt,
      updatedAt: exp.updatedAt,
    });
  }

  const voucherReferences = Array.from(voucherMap.values()).sort(
    (a, b) => new Date(b.date || b.updatedAt).getTime() - new Date(a.date || a.updatedAt).getTime()
  );

  const agreementMap = new Map<string, PartyAgreementReference>();
  for (const agr of db.agreements || []) {
    if (agr.mosqueId !== mosqueId) continue;
    for (const ap of agr.parties || []) {
      if (ap.linkedPartyId && targetIds.has(ap.linkedPartyId)) {
        agreementMap.set(`${agr.id}:PARTY:${ap.id}`, {
          agreementId: agr.id,
          agreementNumber: agr.agreementNumber,
          title: agr.title,
          categoryNameBn: agr.categoryNameBn,
          agreementDate: agr.agreementDate,
          status: agr.status,
          roleLabel: ap.roleLabel || 'পক্ষ',
          snapshotName: ap.name,
          isRepresentative: false,
          linkedAt: agr.createdAt,
          updatedAt: agr.updatedAt,
        });
      }
      for (const rep of ap.representatives || []) {
        if (rep.linkedPartyId && targetIds.has(rep.linkedPartyId)) {
          agreementMap.set(`${agr.id}:REP:${rep.id}`, {
            agreementId: agr.id,
            agreementNumber: agr.agreementNumber,
            title: agr.title,
            categoryNameBn: agr.categoryNameBn,
            agreementDate: agr.agreementDate,
            status: agr.status,
            roleLabel: `${ap.roleLabel || 'পক্ষ'} (প্রতিনিধি: ${rep.designation || 'প্রতিনিধি'})`,
            snapshotName: rep.name,
            isRepresentative: true,
            linkedAt: agr.createdAt,
            updatedAt: agr.updatedAt,
          });
        }
      }
    }
  }
  const agreementReferences = Array.from(agreementMap.values()).sort(
    (a, b) => new Date(b.agreementDate || b.updatedAt).getTime() - new Date(a.agreementDate || a.updatedAt).getTime()
  );

  const staffMap = new Map<string, PartyStaffLinkRef>();
  for (const s of db.staffList || []) {
    if (s.mosqueId !== mosqueId) continue;
    if ((s.linkedPartyId && targetIds.has(s.linkedPartyId)) || directMatch.linkedStaffId === s.id) {
      staffMap.set(s.id, {
        staffId: s.id,
        staffCode: s.staffCode,
        name: s.fullNameBn || s.name,
        designationBn: s.designationBn,
        phone: s.phone,
        status: s.status,
        linkedAt: s.updatedAt || s.createdAt,
      });
    }
  }
  const linkedStaff = Array.from(staffMap.values());

  return { voucherReferences, agreementReferences, linkedStaff };
}

// ==========================================
// 3C. Part 3 Sensitive Masking, Read-Only Activity History & Report Aggregation
// ==========================================
function maskSensitiveNid(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function sanitizePartyForUser(
  party: PartyRecord,
  user: User | undefined | null
): PartyRecord {
  if (hasPartyPermission(user, 'party.view_sensitive')) {
    return party;
  }
  return {
    ...party,
    nidNumber: maskSensitiveNid(party.nidNumber),
    normalizedNid: maskSensitiveNid(party.normalizedNid),
  };
}

function sanitizeAuditLogsForUser(
  logs: PartyAuditLogEntry[],
  user: User | undefined | null
): PartyAuditLogEntry[] {
  if (hasPartyPermission(user, 'party.view_sensitive')) {
    return logs;
  }
  return logs.map((log) => {
    if (!log.changedFields || log.changedFields.length === 0) return log;
    const hasNidDiff = log.changedFields.some((cf) => cf.field === 'nidNumber');
    if (!hasNidDiff) return log;
    return {
      ...log,
      changedFields: log.changedFields.map((cf) =>
        cf.field === 'nidNumber'
          ? {
              ...cf,
              oldValue: cf.oldValue && cf.oldValue !== '—' ? maskSensitiveNid(cf.oldValue) : cf.oldValue,
              newValue: cf.newValue && cf.newValue !== '—' ? maskSensitiveNid(cf.newValue) : cf.newValue,
            }
          : cf
      ),
    };
  });
}

function isVoucherActiveAmount(status?: string): boolean {
  const s = String(status || '').toUpperCase();
  return s !== 'CANCELLED' && s !== 'REJECTED';
}

function getVoucherStatusLabelBn(status?: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'CANCELLED') return 'বাতিলকৃত';
  if (s === 'REJECTED') return 'প্রত্যাখ্যাত';
  if (s === 'PENDING') return 'অপেক্ষমাণ';
  return 'অনুমোদিত';
}

function getAgreementStatusLabelBn(status?: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'DRAFT') return 'খসড়া';
  if (s === 'APPROVED') return 'অনুমোদিত';
  if (s === 'ACTIVE') return 'সক্রিয়';
  if (s === 'COMPLETED') return 'সম্পন্ন';
  if (s === 'EXPIRED') return 'মেয়াদোত্তীর্ণ';
  if (s === 'CANCELLED') return 'বাতিল';
  if (s === 'ARCHIVED') return 'সংরক্ষিত';
  return status || 'সক্রিয়';
}

const PURCHASE_SUPPLY_RE =
  /(ক্রয়|ক্রয়|সরবরাহ|সাপ্লাই|মালামাল|আসবাব|সম্পদ|সামগ্রী|দোকান|টাইলস|রড|সিমেন্ট|বালি|ইট|পাথর|বৈদ্যুতিক\s*সামগ্রী|ফ্যান|লাইট|সাউন্ড|মাইক|কার্পেট|asset_expense|purchase|supply|vendor|material)/i;

const WORK_WAGE_RE =
  /(মজুরি|পারিশ্রমিক|কারিগর|মিস্ত্রী|মিস্ত্রি|শ্রমিক|নির্মাণ\s*কাজ|মেরামত|রক্ষণাবেক্ষণ|সার্ভিস|ইলেকট্রিক|প্লাম্বিং|স্যানিটারি|রঙ|ওয়েল্ডিং|ওয়েল্ডিং|ঠিকাদার|পরামর্শ|labour|labor|wage|artisan|repair|maintenance|service|contractor)/i;

export function classifyVoucherForPartyHistory(
  vr: PartyVoucherReference,
  partyRoles: string[],
  customRoles: PartyCustomRoleDef[]
): PartyCategorizedVoucher {
  if (vr.voucherType === 'INCOME') {
    return {
      ...vr,
      nature: 'INCOME',
      natureLabelBn: 'আয় / দান / প্রাপ্তি',
      sourceLabelBn: 'আয় ভাউচার',
    };
  }

  const haystack = [vr.headNameBn, vr.subHeadNameBn, vr.description, vr.sourceModule]
    .filter(Boolean)
    .join(' ');

  const hasWorkKeyword = WORK_WAGE_RE.test(haystack);
  const hasSupplyKeyword = PURCHASE_SUPPLY_RE.test(haystack);

  let nature: 'PURCHASE_SUPPLY' | 'WORK_WAGE' | 'EXPENSE_OTHER' = 'EXPENSE_OTHER';
  if (hasWorkKeyword && !hasSupplyKeyword) {
    nature = 'WORK_WAGE';
  } else if (hasSupplyKeyword && !hasWorkKeyword) {
    nature = 'PURCHASE_SUPPLY';
  } else if (hasWorkKeyword && hasSupplyKeyword) {
    nature = vr.sourceModule === 'ASSET_EXPENSE' ? 'PURCHASE_SUPPLY' : 'WORK_WAGE';
  } else {
    const hasSupplyRole = partyRoles.some(
      (r) =>
        SELLER_SUPPLIER_ROLES.has(r) ||
        customRoles.find((cr) => cr.code === r)?.categoryGroup === 'SELLER_SUPPLIER'
    );
    const hasWorkRole = partyRoles.some(
      (r) =>
        ARTISAN_LABOUR_ROLES.has(r) ||
        CONTRACTOR_PROVIDER_ROLES.has(r) ||
        ['ARTISAN_LABOUR', 'CONTRACTOR_PROVIDER'].includes(
          customRoles.find((cr) => cr.code === r)?.categoryGroup || ''
        )
    );
    if (hasWorkRole && !hasSupplyRole) {
      nature = 'WORK_WAGE';
    } else if (hasSupplyRole && !hasWorkRole) {
      nature = 'PURCHASE_SUPPLY';
    } else if (vr.sourceModule === 'ASSET_EXPENSE') {
      nature = 'PURCHASE_SUPPLY';
    }
  }

  if (nature === 'PURCHASE_SUPPLY') {
    return {
      ...vr,
      nature,
      natureLabelBn: 'ক্রয় ও সরবরাহ',
      sourceLabelBn: 'ব্যয় ভাউচার (ক্রয়/সরবরাহ)',
    };
  }
  if (nature === 'WORK_WAGE') {
    return {
      ...vr,
      nature,
      natureLabelBn: 'কাজ ও পারিশ্রমিক',
      sourceLabelBn: 'ব্যয় ভাউচার (কাজ/পারিশ্রমিক)',
    };
  }
  return {
    ...vr,
    nature: 'EXPENSE_OTHER',
    natureLabelBn: 'অন্যান্য ব্যয়',
    sourceLabelBn: 'ব্যয় ভাউচার',
  };
}

function inDateWindow(dateStr: string | undefined, startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true;
  const d = String(dateStr || '').slice(0, 10);
  if (!d) return false;
  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;
  return true;
}

export function buildPartyHistoryBundle(params: {
  mosqueId: string;
  party: PartyRecord;
  startDate?: string;
  endDate?: string;
  kind?: string;
  user?: User | null;
}): PartyHistoryBundle {
  const { mosqueId, party, startDate, endDate, kind, user } = params;
  const tenantParties = (db.parties || []).filter((p) => p.mosqueId === mosqueId);
  const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);

  let resolvedPrimary: PartyRecord | undefined;
  if (party.mergedIntoPartyId) {
    resolvedPrimary = tenantParties.find((p) => p.partyId === party.mergedIntoPartyId);
  }
  const targetIds = new Set<string>([
    party.partyId,
    ...(party.mergedFromPartyIds || []),
    ...(resolvedPrimary ? [resolvedPrimary.partyId, ...(resolvedPrimary.mergedFromPartyIds || [])] : []),
  ]);

  const crossRefs = buildPartyCrossReferences(mosqueId, targetIds, party);
  const allCategorized = crossRefs.voucherReferences
    .map((vr) => classifyVoucherForPartyHistory(vr, party.roles || [], customRoles))
    .filter((v) => inDateWindow(v.date, startDate, endDate));

  const purchaseSupplyItems = allCategorized.filter((v) => v.nature === 'PURCHASE_SUPPLY');
  const workWageItems = allCategorized.filter((v) => v.nature === 'WORK_WAGE');
  const incomeItems = allCategorized.filter((v) => v.nature === 'INCOME');
  const otherExpenseItems = allCategorized.filter((v) => v.nature === 'EXPENSE_OTHER');

  const filteredAgreements = crossRefs.agreementReferences.filter((ar) =>
    inDateWindow(ar.agreementDate, startDate, endDate)
  );

  const rawAudits = (db.partyAuditLogs || []).filter(
    (a) => a.mosqueId === mosqueId && targetIds.has(a.partyId) && inDateWindow(a.timestamp, startDate, endDate)
  );
  const safeAudits = sanitizeAuditLogsForUser(rawAudits, user);

  const mergeRecords = (db.partyMergeHistory || []).filter(
    (m) =>
      m.mosqueId === mosqueId &&
      (targetIds.has(m.targetPartyId) || targetIds.has(m.sourcePartyId)) &&
      inDateWindow(m.mergedAt, startDate, endDate)
  );

  const timelineItems: PartyTimelineItem[] = [];

  for (const v of allCategorized) {
    timelineItems.push({
      id: `tl-v-${v.voucherType}-${v.voucherId}`,
      date: (v.date || '').slice(0, 10),
      timestamp: v.updatedAt || v.linkedAt || v.date,
      kind: v.nature,
      sourceModuleLabelBn: v.sourceLabelBn,
      referenceNumber: v.voucherNumber,
      titleBn: `${v.headNameBn}${v.subHeadNameBn ? ` (${v.subHeadNameBn})` : ''}`,
      descriptionBn: v.description || `সংরক্ষিত নাম: ${v.snapshotName}`,
      snapshotName: v.snapshotName,
      amount: v.amount,
      status: v.status,
      statusLabelBn: getVoucherStatusLabelBn(v.status),
    });
  }

  for (const ar of filteredAgreements) {
    timelineItems.push({
      id: `tl-agr-${ar.agreementId}-${ar.roleLabel}`,
      date: (ar.agreementDate || '').slice(0, 10),
      timestamp: ar.updatedAt || ar.linkedAt || ar.agreementDate,
      kind: 'AGREEMENT',
      sourceModuleLabelBn: 'চুক্তিপত্র',
      referenceNumber: ar.agreementNumber,
      titleBn: ar.title,
      descriptionBn: `${ar.roleLabel} · ${ar.categoryNameBn} · দলিলের নাম: ${ar.snapshotName}`,
      snapshotName: ar.snapshotName,
      status: ar.status,
      statusLabelBn: getAgreementStatusLabelBn(ar.status),
    });
  }

  for (const st of crossRefs.linkedStaff) {
    if (!inDateWindow(st.linkedAt, startDate, endDate)) continue;
    timelineItems.push({
      id: `tl-stf-${st.staffId}`,
      date: (st.linkedAt || '').slice(0, 10),
      timestamp: st.linkedAt,
      kind: 'STAFF_LINK',
      sourceModuleLabelBn: 'স্টাফ সংযোগ',
      referenceNumber: st.staffCode || st.staffId,
      titleBn: `${st.name} · ${st.designationBn}`,
      descriptionBn: 'নিয়মিত স্টাফ প্রোফাইলের সাথে সংযুক্ত (বেতন/পেরোল স্টাফ মডিউলে পরিচালিত)',
      status: st.status,
      statusLabelBn: st.status === 'ACTIVE' ? 'সক্রিয় স্টাফ' : st.status,
    });
  }

  for (const m of mergeRecords) {
    timelineItems.push({
      id: `tl-mrg-${m.id}`,
      date: (m.mergedAt || '').slice(0, 10),
      timestamp: m.mergedAt,
      kind: 'MERGE',
      sourceModuleLabelBn: 'প্রোফাইল Merge',
      referenceNumber: `${m.sourcePartyCode} → ${m.targetPartyCode}`,
      titleBn: m.resolutionSummaryBn,
      descriptionBn: m.note ? `নোট: ${m.note}` : undefined,
      actorName: m.mergedByName,
    });
  }

  for (const a of safeAudits) {
    timelineItems.push({
      id: `tl-aud-${a.id}`,
      date: (a.timestamp || '').slice(0, 10),
      timestamp: a.timestamp,
      kind: 'AUDIT',
      sourceModuleLabelBn: 'পার্টি অডিট',
      referenceNumber: a.partyCode,
      titleBn: a.summaryBn,
      descriptionBn:
        a.changedFields && a.changedFields.length > 0
          ? a.changedFields.map((cf) => `${cf.labelBn}: ${cf.oldValue || '—'} → ${cf.newValue || '—'}`).join(' | ')
          : undefined,
      actorName: a.actorName,
    });
  }

  timelineItems.sort(
    (a, b) =>
      new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime()
  );

  const normalizedKind = cleanStr(kind, 40).toUpperCase();
  const filteredTimeline =
    normalizedKind && normalizedKind !== 'ALL'
      ? timelineItems.filter((item) => item.kind === (normalizedKind as PartyTimelineItemKind))
      : timelineItems;

  const sumActive = (list: PartyCategorizedVoucher[]) =>
    list.reduce((acc, item) => acc + (isVoucherActiveAmount(item.status) ? Number(item.amount) || 0 : 0), 0);

  const totalIncomeAmount = sumActive(incomeItems);
  const totalPurchaseSupplyAmount = sumActive(purchaseSupplyItems);
  const totalWorkWageAmount = sumActive(workWageItems);
  const totalOtherExpenseAmount = sumActive(otherExpenseItems);

  const summary: PartyHistorySummary = {
    totalIncomeAmount,
    totalPurchaseSupplyAmount,
    totalWorkWageAmount,
    totalOtherExpenseAmount,
    totalExpenseAmount: totalPurchaseSupplyAmount + totalWorkWageAmount + totalOtherExpenseAmount,
    incomeCount: incomeItems.length,
    purchaseSupplyCount: purchaseSupplyItems.length,
    workWageCount: workWageItems.length,
    otherExpenseCount: otherExpenseItems.length,
    expenseCount: purchaseSupplyItems.length + workWageItems.length + otherExpenseItems.length,
    agreementCount: filteredAgreements.length,
    staffLinkCount: crossRefs.linkedStaff.length,
    timelineCount: filteredTimeline.length,
  };

  return {
    partyId: party.partyId,
    partyCode: party.partyCode,
    partyName: party.name,
    summary,
    purchaseSupplyItems,
    workWageItems,
    allVouchers: allCategorized,
    agreements: filteredAgreements,
    linkedStaff: crossRefs.linkedStaff,
    timeline: filteredTimeline,
    generatedAt: new Date().toISOString(),
  };
}

export function buildPartyReportBundle(params: {
  mosqueId: string;
  mosqueName?: string;
  mode?: 'DIRECTORY' | 'HISTORY';
  categoryGroup?: string;
  role?: string;
  partyType?: string;
  status?: string;
  occupation?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  user?: User | null;
}): PartyReportBundle {
  const {
    mosqueId,
    mosqueName,
    mode = 'DIRECTORY',
    categoryGroup = 'ALL',
    role,
    partyType,
    status = 'ALL',
    occupation,
    search,
    startDate,
    endDate,
    sourceType = 'ALL',
    user,
  } = params;

  const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);
  const canViewSensitive = hasPartyPermission(user, 'party.view_sensitive');
  const searchLower = cleanStr(search, 160).toLowerCase();
  const searchDigits = normalizePhoneNumber(searchLower);
  const occupationLower = cleanStr(occupation, 120).toLowerCase();

  let matchedParties = (db.parties || []).filter((p) => p.mosqueId === mosqueId && !p.mergedIntoPartyId);

  if (
    categoryGroup === 'BUYER' ||
    categoryGroup === 'SELLER_SUPPLIER' ||
    categoryGroup === 'ARTISAN_LABOUR' ||
    categoryGroup === 'CONTRACTOR_PROVIDER' ||
    categoryGroup === 'ORGANIZATION'
  ) {
    matchedParties = matchedParties.filter((p) => partyMatchesCategoryGroup(p, categoryGroup, customRoles));
  }

  if (role && role !== 'ALL') {
    matchedParties = matchedParties.filter((p) => (p.roles || []).includes(role));
  }

  if (partyType === 'INDIVIDUAL' || partyType === 'ORGANIZATION') {
    matchedParties = matchedParties.filter((p) => p.partyType === partyType);
  }

  if (status === 'ACTIVE' || status === 'INACTIVE') {
    matchedParties = matchedParties.filter((p) => p.status === status);
  }

  if (occupationLower) {
    matchedParties = matchedParties.filter((p) => {
      const occHay = [p.occupationOrSkill, p.artisanDetails?.primaryTrade, p.organizationDetails?.businessCategory]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return occHay.includes(occupationLower);
    });
  }

  if (searchLower) {
    matchedParties = matchedParties.filter((p) => {
      const hay = [
        p.partyCode,
        p.partyId,
        p.name,
        p.phone,
        p.alternatePhone,
        p.email,
        p.fullAddress,
        p.district,
        p.upazila,
        canViewSensitive ? p.nidNumber : undefined,
        p.occupationOrSkill,
        p.artisanDetails?.primaryTrade,
        p.organizationDetails?.registrationOrTradeLicenseNo,
        ...(p.roles || []).map((r) => getPartyRoleLabelBn(r, customRoles)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (hay.includes(searchLower)) return true;
      if (
        searchDigits &&
        searchDigits.length >= 3 &&
        ((p.normalizedPhone && p.normalizedPhone.includes(searchDigits)) ||
          (p.normalizedAltPhone && p.normalizedAltPhone.includes(searchDigits)) ||
          (canViewSensitive && p.normalizedNid && p.normalizedNid.includes(searchDigits)))
      ) {
        return true;
      }
      return false;
    });
  }

  matchedParties.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const directoryRows: PartyReportDirectoryRow[] = [];
  const historyRows: PartyReportHistoryRow[] = [];

  let totalIncomeAmount = 0;
  let totalExpenseAmount = 0;
  let totalPurchaseSupplyAmount = 0;
  let totalWorkWageAmount = 0;
  let totalVoucherCount = 0;
  let totalAgreementCount = 0;

  const normSource = cleanStr(sourceType, 30).toUpperCase() || 'ALL';

  for (const rawParty of matchedParties) {
    const safeParty = sanitizePartyForUser(rawParty, user);
    const rolesLabelBn = (rawParty.roles || []).map((r) => getPartyRoleLabelBn(r, customRoles)).join(' · ');
    const history = buildPartyHistoryBundle({
      mosqueId,
      party: rawParty,
      startDate,
      endDate,
      user,
    });

    const filteredVouchers = history.allVouchers.filter((v) => {
      if (normSource === 'INCOME') return v.voucherType === 'INCOME';
      if (normSource === 'EXPENSE') return v.voucherType === 'EXPENSE';
      if (normSource === 'AGREEMENT') return false;
      return true;
    });

    const filteredAgreements = normSource === 'INCOME' || normSource === 'EXPENSE' ? [] : history.agreements;

    const incVouchers = filteredVouchers.filter((v) => v.voucherType === 'INCOME');
    const expVouchers = filteredVouchers.filter((v) => v.voucherType === 'EXPENSE');

    const rowIncAmount = incVouchers.reduce(
      (s, v) => s + (isVoucherActiveAmount(v.status) ? Number(v.amount) || 0 : 0),
      0
    );
    const rowExpAmount = expVouchers.reduce(
      (s, v) => s + (isVoucherActiveAmount(v.status) ? Number(v.amount) || 0 : 0),
      0
    );
    const rowPurchaseAmount = expVouchers
      .filter((v) => v.nature === 'PURCHASE_SUPPLY')
      .reduce((s, v) => s + (isVoucherActiveAmount(v.status) ? Number(v.amount) || 0 : 0), 0);
    const rowWorkAmount = expVouchers
      .filter((v) => v.nature === 'WORK_WAGE')
      .reduce((s, v) => s + (isVoucherActiveAmount(v.status) ? Number(v.amount) || 0 : 0), 0);

    const allDates = [
      ...filteredVouchers.map((v) => (v.date || '').slice(0, 10)),
      ...filteredAgreements.map((a) => (a.agreementDate || '').slice(0, 10)),
    ]
      .filter(Boolean)
      .sort()
      .reverse();

    directoryRows.push({
      party: safeParty,
      rolesLabelBn,
      addressLine: formatPartyAddressLine(safeParty) || '—',
      incomeVoucherCount: incVouchers.length,
      totalIncomeAmount: rowIncAmount,
      expenseVoucherCount: expVouchers.length,
      totalExpenseAmount: rowExpAmount,
      purchaseSupplyAmount: rowPurchaseAmount,
      workWageAmount: rowWorkAmount,
      agreementCount: filteredAgreements.length,
      lastActivityDate: allDates[0],
    });

    totalIncomeAmount += rowIncAmount;
    totalExpenseAmount += rowExpAmount;
    totalPurchaseSupplyAmount += rowPurchaseAmount;
    totalWorkWageAmount += rowWorkAmount;
    totalVoucherCount += filteredVouchers.length;
    totalAgreementCount += filteredAgreements.length;

    for (const v of filteredVouchers) {
      historyRows.push({
        id: `hr-v-${v.voucherType}-${v.voucherId}-${rawParty.partyId}`,
        date: (v.date || '').slice(0, 10),
        partyId: rawParty.partyId,
        partyCode: rawParty.partyCode,
        partyName: rawParty.name,
        partyPhone: rawParty.phone,
        occupationOrSkill: rawParty.occupationOrSkill,
        rolesLabelBn,
        sourceType: v.voucherType,
        sourceLabelBn: v.sourceLabelBn,
        categoryLabelBn: v.natureLabelBn,
        referenceNumber: v.voucherNumber,
        titleOrHeadBn: `${v.headNameBn}${v.subHeadNameBn ? ` (${v.subHeadNameBn})` : ''}`,
        snapshotName: v.snapshotName,
        descriptionBn: v.description,
        amount: v.amount,
        status: v.status,
        statusLabelBn: getVoucherStatusLabelBn(v.status),
      });
    }

    for (const ar of filteredAgreements) {
      historyRows.push({
        id: `hr-a-${ar.agreementId}-${rawParty.partyId}-${ar.roleLabel}`,
        date: (ar.agreementDate || '').slice(0, 10),
        partyId: rawParty.partyId,
        partyCode: rawParty.partyCode,
        partyName: rawParty.name,
        partyPhone: rawParty.phone,
        occupationOrSkill: rawParty.occupationOrSkill,
        rolesLabelBn,
        sourceType: 'AGREEMENT',
        sourceLabelBn: 'চুক্তিপত্র',
        categoryLabelBn: ar.categoryNameBn || 'চুক্তিপত্র',
        referenceNumber: ar.agreementNumber,
        titleOrHeadBn: `${ar.title} (${ar.roleLabel})`,
        snapshotName: ar.snapshotName,
        descriptionBn: ar.categoryNameBn,
        status: ar.status,
        statusLabelBn: getAgreementStatusLabelBn(ar.status),
      });
    }
  }

  historyRows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    mosqueName,
    generatedAt: new Date().toISOString(),
    filtersApplied: {
      mode,
      categoryGroup,
      role: role || undefined,
      partyType: partyType || undefined,
      status,
      occupation: occupation || undefined,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sourceType: normSource,
    },
    summary: {
      totalPartiesMatched: matchedParties.length,
      activeCount: matchedParties.filter((p) => p.status === 'ACTIVE').length,
      inactiveCount: matchedParties.filter((p) => p.status === 'INACTIVE').length,
      individualsCount: matchedParties.filter((p) => p.partyType === 'INDIVIDUAL').length,
      organizationsCount: matchedParties.filter((p) => p.partyType === 'ORGANIZATION').length,
      totalIncomeAmount,
      totalExpenseAmount,
      totalPurchaseSupplyAmount,
      totalWorkWageAmount,
      totalVoucherCount,
      totalAgreementCount,
      historyRowCount: historyRows.length,
    },
    directoryRows,
    historyRows,
  };
}

// ==========================================
// 4. Express Router Factory
// ==========================================
export function createPartyRouter(authenticate: any): Router {
  const router = Router();

  // 1. Dashboard & Directory Stats (Strictly scoped to currentMosque)
  router.get('/parties/stats', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }

    const mosqueId = req.currentMosque!.id;
    const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);
    const allTenant = (db.parties || []).filter((p) => p.mosqueId === mosqueId);
    const activeNonMerged = allTenant.filter((p) => !p.mergedIntoPartyId);
    const mergedRecordsCount = allTenant.filter((p) => Boolean(p.mergedIntoPartyId)).length;
    const duplicatePairsCount = findTenantDuplicatePairs(mosqueId).length;

    const roleCounts: Record<string, number> = {};
    for (const p of activeNonMerged) {
      for (const r of p.roles || []) {
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      }
    }

    const stats: PartyRegistryStats = {
      totalActive: activeNonMerged.filter((p) => p.status === 'ACTIVE').length,
      totalInactive: activeNonMerged.filter((p) => p.status === 'INACTIVE').length,
      totalAll: activeNonMerged.length,
      individualsCount: activeNonMerged.filter((p) => p.partyType === 'INDIVIDUAL').length,
      organizationsCount: activeNonMerged.filter((p) => p.partyType === 'ORGANIZATION').length,
      buyersCount: activeNonMerged.filter((p) => partyMatchesCategoryGroup(p, 'BUYER', customRoles)).length,
      sellersSuppliersCount: activeNonMerged.filter((p) =>
        partyMatchesCategoryGroup(p, 'SELLER_SUPPLIER', customRoles)
      ).length,
      artisansLabourersCount: activeNonMerged.filter((p) =>
        partyMatchesCategoryGroup(p, 'ARTISAN_LABOUR', customRoles)
      ).length,
      contractorsProvidersCount: activeNonMerged.filter((p) =>
        partyMatchesCategoryGroup(p, 'CONTRACTOR_PROVIDER', customRoles)
      ).length,
      duplicatePairsCount,
      mergedRecordsCount,
      roleCounts,
    };

    return res.json({ success: true, data: stats });
  });

  // 2. Roles Directory (Built-in + Mosque Custom Roles)
  router.get('/parties/roles', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }
    const mosqueId = req.currentMosque!.id;
    const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);
    return res.json({
      success: true,
      data: {
        builtIn: BUILT_IN_PARTY_ROLES,
        custom: customRoles,
      },
    });
  });

  // 3. Create New Custom Role (Tenant-scoped)
  router.post('/parties/roles', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.manage_roles')) {
      return denyPermission(req, res, 'party.manage_roles');
    }

    const mosqueId = req.currentMosque!.id;
    const labelBn = cleanStr(req.body?.labelBn, 80);
    if (!labelBn) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'নতুন ভূমিকার বাংলা নাম প্রদান করা আবশ্যক।' },
      });
    }

    const labelEn = cleanOptionalStr(req.body?.labelEn, 80);
    const rawCatGroup = cleanStr(req.body?.categoryGroup, 40) as PartyRoleCategoryGroup;
    const categoryGroup: PartyRoleCategoryGroup = VALID_ROLE_CATEGORY_GROUPS.has(rawCatGroup)
      ? rawCatGroup
      : 'OTHER';

    const existingCustom = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);
    const duplicateLabel =
      BUILT_IN_PARTY_ROLES.some((r) => r.labelBn === labelBn) ||
      existingCustom.some((r) => r.labelBn === labelBn);
    if (duplicateLabel) {
      return res.status(409).json({
        success: false,
        error: { code: 'ROLE_EXISTS', message: `"${labelBn}" ভূমিকাটি ইতিমধ্যেই সিস্টেমে রয়েছে।` },
      });
    }

    const rawCodeBase = (labelEn || labelBn)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
    const code = `CUSTOM_${rawCodeBase || 'ROLE'}_${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

    const newRole: PartyCustomRoleDef = {
      id: `prole-${crypto.randomUUID().slice(0, 10)}`,
      mosqueId,
      code,
      labelBn,
      labelEn,
      categoryGroup,
      descriptionBn: cleanOptionalStr(req.body?.descriptionBn, 250),
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.name,
    };

    if (!db.partyCustomRoles) db.partyCustomRoles = [];
    db.partyCustomRoles.push(newRole);

    appendPartyAudit({
      mosqueId,
      partyId: newRole.id,
      partyName: newRole.labelBn,
      action: 'ROLE_ADDED',
      summaryBn: `নতুন কাস্টম ভূমিকা যোগ করা হয়েছে: ${newRole.labelBn} (${newRole.code})`,
      user,
      ipAddress: getClientIp(req),
    });

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      user.role,
      'CREATE',
      'PARTY_REGISTRY',
      `নতুন পার্টি ভূমিকা তৈরি: ${newRole.labelBn}`,
      newRole.id,
      getClientIp(req)
    );
    db.save();

    return res.status(201).json({ success: true, data: newRole });
  });

  // 4. Live Duplicate Check before Create / Edit
  router.post('/parties/check-duplicates', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }
    const mosqueId = req.currentMosque!.id;
    const excludePartyId = cleanOptionalStr(req.body?.excludePartyId, 80);
    const partyType: PartyProfileType =
      req.body?.partyType === 'ORGANIZATION' ? 'ORGANIZATION' : 'INDIVIDUAL';
    const name = cleanStr(req.body?.name, 200);
    const phone = cleanStr(req.body?.phone, 40);
    const alternatePhone = cleanOptionalStr(req.body?.alternatePhone, 40);
    const nidNumber = cleanOptionalStr(req.body?.nidNumber, 40);

    const matches: Array<{
      party: PartyRecord;
      confidence: 'HIGH' | 'MEDIUM';
      reasons: PartyDuplicateReasonCode[];
      reasonLabelsBn: string[];
    }> = [];

    for (const existing of db.parties || []) {
      if (existing.mosqueId !== mosqueId || existing.mergedIntoPartyId) continue;
      if (excludePartyId && existing.id === excludePartyId) continue;
      const result = comparePartyMatch(
        { id: excludePartyId, partyType, name, phone, alternatePhone, nidNumber },
        existing
      );
      if (result) {
        matches.push({
          party: existing,
          confidence: result.confidence,
          reasons: result.reasons,
          reasonLabelsBn: result.reasons.map((r) => DUPLICATE_REASON_LABELS[r]),
        });
      }
    }

    return res.json({ success: true, data: matches });
  });

  // 5. Scan All Potential Duplicates in Mosque
  router.get('/parties/duplicates', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }
    const mosqueId = req.currentMosque!.id;
    const pairs = findTenantDuplicatePairs(mosqueId).map((pair) => ({
      ...pair,
      primaryParty: sanitizePartyForUser(pair.primaryParty, user),
      duplicateParty: sanitizePartyForUser(pair.duplicateParty, user),
    }));
    return res.json({ success: true, data: pairs });
  });

  // 6. Merge History List
  router.get('/parties/merge-history', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }
    const mosqueId = req.currentMosque!.id;
    const items = (db.partyMergeHistory || [])
      .filter((m) => m.mosqueId === mosqueId)
      .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());
    return res.json({ success: true, data: items });
  });

  // 7. Safe User-Confirmed Merge (Preserves Old partyId History & Audit Trail)
  router.post('/parties/merge', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.merge')) {
      return denyPermission(req, res, 'party.merge');
    }

    const mosqueId = req.currentMosque!.id;
    const targetPartyId = cleanStr(req.body?.targetPartyId, 100);
    const sourcePartyId = cleanStr(req.body?.sourcePartyId, 100);
    const note = cleanOptionalStr(req.body?.note, 400);
    const fieldChoices =
      req.body?.fieldChoices && typeof req.body.fieldChoices === 'object'
        ? (req.body.fieldChoices as Record<string, 'TARGET' | 'SOURCE'>)
        : {};

    if (!targetPartyId || !sourcePartyId || targetPartyId === sourcePartyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Merge করার জন্য দুটি ভিন্ন ব্যক্তি/প্রতিষ্ঠানের রেকর্ড নির্বাচন করুন।',
        },
      });
    }

    const parties = db.parties || [];
    const targetIdx = parties.findIndex((p) => p.id === targetPartyId && p.mosqueId === mosqueId);
    const sourceIdx = parties.findIndex((p) => p.id === sourcePartyId && p.mosqueId === mosqueId);

    if (targetIdx === -1 || sourceIdx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'নির্বাচিত পার্টি রেকর্ড পাওয়া যায়নি।' },
      });
    }

    const target = parties[targetIdx];
    const source = parties[sourceIdx];

    if (target.mergedIntoPartyId || source.mergedIntoPartyId) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_MERGED',
          message: 'এই রেকর্ডগুলোর মধ্যে একটি ইতিমধ্যেই অন্য রেকর্ডের সাথে একীভূত (Merged) হয়েছে।',
        },
      });
    }

    const pickVal = <T>(field: string, tVal: T | undefined, sVal: T | undefined): T | undefined => {
      const choice = fieldChoices[field];
      if (choice === 'SOURCE') {
        return sVal !== undefined && sVal !== '' ? sVal : tVal;
      }
      return tVal !== undefined && tVal !== '' ? tVal : sVal;
    };

    const combinedRoles = Array.from(new Set([...(target.roles || []), ...(source.roles || [])]));
    const combinedMergedFromIds = Array.from(
      new Set([
        ...(target.mergedFromPartyIds || []),
        source.partyId,
        ...(source.mergedFromPartyIds || []),
      ])
    );

    const resolvedPhone = pickVal('phone', target.phone, source.phone) || target.phone || source.phone;
    const resolvedAltPhone = pickVal(
      'alternatePhone',
      target.alternatePhone || (source.phone !== resolvedPhone ? source.phone : undefined),
      source.alternatePhone
    );
    const resolvedNid = pickVal('nidNumber', target.nidNumber, source.nidNumber);

    const mergedNotes = [target.notes, source.notes]
      .map((x) => (x || '').trim())
      .filter(Boolean)
      .filter((val, idx, arr) => arr.indexOf(val) === idx)
      .join('\n---\n') || undefined;

    const now = new Date().toISOString();
    const matchInfo = comparePartyMatch(
      {
        id: source.id,
        partyType: source.partyType,
        name: source.name,
        phone: source.phone,
        alternatePhone: source.alternatePhone,
        nidNumber: source.nidNumber,
      },
      target
    );
    const matchReasons = matchInfo
      ? matchInfo.reasons.map((r) => DUPLICATE_REASON_LABELS[r])
      : ['ব্যবহারকারীর সরাসরি পর্যালোচনা ও অনুমোদন'];

    const updatedTarget: PartyRecord = {
      ...target,
      partyType: pickVal('partyType', target.partyType, source.partyType) || target.partyType,
      name: pickVal('name', target.name, source.name) || target.name,
      roles: combinedRoles,
      photoOrLogoUrl: pickVal('photoOrLogoUrl', target.photoOrLogoUrl, source.photoOrLogoUrl),
      phone: resolvedPhone,
      normalizedPhone: normalizePhoneNumber(resolvedPhone),
      alternatePhone: resolvedAltPhone,
      normalizedAltPhone: resolvedAltPhone ? normalizePhoneNumber(resolvedAltPhone) : undefined,
      email: pickVal('email', target.email, source.email),
      fullAddress: pickVal('fullAddress', target.fullAddress, source.fullAddress),
      villageOrMahalla: pickVal('villageOrMahalla', target.villageOrMahalla, source.villageOrMahalla),
      unionOrWard: pickVal('unionOrWard', target.unionOrWard, source.unionOrWard),
      upazila: pickVal('upazila', target.upazila, source.upazila),
      district: pickVal('district', target.district, source.district),
      division: pickVal('division', target.division, source.division),
      postCode: pickVal('postCode', target.postCode, source.postCode),
      nidNumber: resolvedNid,
      normalizedNid: resolvedNid ? normalizeNidNumber(resolvedNid) : undefined,
      occupationOrSkill: pickVal('occupationOrSkill', target.occupationOrSkill, source.occupationOrSkill),
      description: pickVal('description', target.description, source.description),
      notes: mergedNotes,
      organizationDetails:
        target.organizationDetails || source.organizationDetails
          ? {
              ...(source.organizationDetails || {}),
              ...(target.organizationDetails || {}),
              ...(fieldChoices.organizationDetails === 'SOURCE' ? source.organizationDetails || {} : {}),
            }
          : undefined,
      artisanDetails:
        target.artisanDetails || source.artisanDetails
          ? {
              ...(source.artisanDetails || {}),
              ...(target.artisanDetails || {}),
              ...(fieldChoices.artisanDetails === 'SOURCE' ? source.artisanDetails || {} : {}),
            }
          : undefined,
      mergedFromPartyIds: combinedMergedFromIds,
      voucherReferences: (() => {
        const merged = new Map<string, PartyVoucherReference>();
        for (const r of [...(target.voucherReferences || []), ...(source.voucherReferences || [])]) {
          merged.set(`${r.voucherType}:${r.voucherId}`, r);
        }
        return Array.from(merged.values());
      })(),
      agreementReferences: (() => {
        const merged = new Map<string, PartyAgreementReference>();
        for (const r of [...(target.agreementReferences || []), ...(source.agreementReferences || [])]) {
          merged.set(`${r.agreementId}:${r.roleLabel}:${r.snapshotName}`, r);
        }
        return Array.from(merged.values());
      })(),
      linkedStaffId: target.linkedStaffId || source.linkedStaffId,
      linkedStaffCode: target.linkedStaffCode || source.linkedStaffCode,
      linkedStaffRefs: (() => {
        const merged = new Map<string, PartyStaffLinkRef>();
        for (const r of [...(target.linkedStaffRefs || []), ...(source.linkedStaffRefs || [])]) {
          merged.set(r.staffId, r);
        }
        return Array.from(merged.values());
      })(),
      updatedAt: now,
      updatedBy: user.id,
      updatedByName: user.name,
    };

    const sourceSnapshot: Partial<PartyRecord> = {
      id: source.id,
      partyId: source.partyId,
      partyCode: source.partyCode,
      partyType: source.partyType,
      name: source.name,
      roles: [...source.roles],
      phone: source.phone,
      alternatePhone: source.alternatePhone,
      email: source.email,
      fullAddress: source.fullAddress,
      nidNumber: source.nidNumber,
      occupationOrSkill: source.occupationOrSkill,
      status: source.status,
    };

    const archivedSource: PartyRecord = {
      ...source,
      status: 'INACTIVE',
      mergedIntoPartyId: target.partyId,
      mergedAt: now,
      mergedBy: user.id,
      mergedByName: user.name,
      updatedAt: now,
      updatedBy: user.id,
      updatedByName: user.name,
    };

    db.parties[targetIdx] = updatedTarget;
    db.parties[sourceIdx] = archivedSource;

    for (const s of db.staffList || []) {
      if (s.mosqueId === mosqueId && s.linkedPartyId === source.partyId) {
        s.linkedPartyId = updatedTarget.partyId;
        s.linkedPartyCode = updatedTarget.partyCode;
      }
    }

    const mergeRecord: PartyMergeHistoryRecord = {
      id: `pmerge-${crypto.randomUUID().slice(0, 10)}`,
      mosqueId,
      sourcePartyId: source.partyId,
      sourcePartyCode: source.partyCode,
      sourcePartyName: source.name,
      targetPartyId: target.partyId,
      targetPartyCode: target.partyCode,
      targetPartyName: updatedTarget.name,
      matchReasons,
      resolutionSummaryBn: `"${source.name}" (${source.partyCode}) রেকর্ডটি "${updatedTarget.name}" (${target.partyCode})-এর সাথে একীভূত করা হয়েছে এবং পুরোনো ${source.partyId} ইতিহাস সংরক্ষিত রয়েছে।`,
      sourceSnapshot,
      mergedBy: user.id,
      mergedByName: user.name,
      mergedAt: now,
      note,
    };

    if (!db.partyMergeHistory) db.partyMergeHistory = [];
    db.partyMergeHistory.unshift(mergeRecord);

    appendPartyAudit({
      mosqueId,
      partyId: updatedTarget.partyId,
      partyCode: updatedTarget.partyCode,
      partyName: updatedTarget.name,
      action: 'MERGED',
      summaryBn: `${source.name} (${source.partyCode} / ${source.partyId}) একীভূত হয়ে এই মূল প্রোফাইলে যুক্ত হয়েছে।${note ? ` নোট: ${note}` : ''}`,
      mergedSourcePartyId: source.partyId,
      mergedTargetPartyId: updatedTarget.partyId,
      user,
      ipAddress: getClientIp(req),
    });

    appendPartyAudit({
      mosqueId,
      partyId: source.partyId,
      partyCode: source.partyCode,
      partyName: source.name,
      action: 'MERGED',
      summaryBn: `এই প্রোফাইলটি মূল প্রোফাইল "${updatedTarget.name}" (${updatedTarget.partyCode})-এ নিরাপদে Merge হয়েছে (পুরোনো ইতিহাস সংরক্ষিত)।`,
      mergedSourcePartyId: source.partyId,
      mergedTargetPartyId: updatedTarget.partyId,
      user,
      ipAddress: getClientIp(req),
    });

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      user.role,
      'UPDATE',
      'PARTY_REGISTRY',
      `পার্টি একীভূতকরণ (Merge): ${source.partyCode} (${source.name}) → ${target.partyCode} (${updatedTarget.name})`,
      updatedTarget.partyId,
      getClientIp(req)
    );

    db.save();

    return res.json({
      success: true,
      data: {
        mergedParty: updatedTarget,
        mergeRecord,
      },
    });
  });

  // 8. List Parties (Unified Central DB with Category, Role, Type, Status, Search filters)
  router.get('/parties', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }

    const mosqueId = req.currentMosque!.id;
    const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);
    const search = cleanStr(req.query?.search, 160).toLowerCase();
    const searchDigits = normalizePhoneNumber(search);
    const categoryGroup = cleanStr(req.query?.categoryGroup, 40) || 'ALL';
    const roleFilter = cleanStr(req.query?.role, 60);
    const partyTypeFilter = cleanStr(req.query?.partyType, 30);
    const statusFilter = cleanStr(req.query?.status, 20) || 'ALL';
    const includeMerged = req.query?.includeMerged === 'true';

    let items = (db.parties || []).filter((p) => p.mosqueId === mosqueId);

    if (!includeMerged) {
      items = items.filter((p) => !p.mergedIntoPartyId);
    }

    if (
      categoryGroup === 'BUYER' ||
      categoryGroup === 'SELLER_SUPPLIER' ||
      categoryGroup === 'ARTISAN_LABOUR' ||
      categoryGroup === 'CONTRACTOR_PROVIDER' ||
      categoryGroup === 'ORGANIZATION'
    ) {
      items = items.filter((p) => partyMatchesCategoryGroup(p, categoryGroup, customRoles));
    }

    if (roleFilter && roleFilter !== 'ALL') {
      items = items.filter((p) => (p.roles || []).includes(roleFilter));
    }

    if (partyTypeFilter === 'INDIVIDUAL' || partyTypeFilter === 'ORGANIZATION') {
      items = items.filter((p) => p.partyType === partyTypeFilter);
    }

    if (statusFilter === 'ACTIVE' || statusFilter === 'INACTIVE') {
      items = items.filter((p) => p.status === statusFilter);
    }

    if (search) {
      items = items.filter((p) => {
        const hay = [
          p.partyCode,
          p.partyId,
          p.name,
          p.phone,
          p.alternatePhone,
          p.email,
          p.fullAddress,
          p.villageOrMahalla,
          p.unionOrWard,
          p.upazila,
          p.district,
          p.nidNumber,
          p.occupationOrSkill,
          p.organizationDetails?.contactPersonName,
          p.organizationDetails?.registrationOrTradeLicenseNo,
          p.artisanDetails?.primaryTrade,
          ...(p.roles || []).map((r) => getPartyRoleLabelBn(r, customRoles)),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (hay.includes(search)) return true;
        if (
          searchDigits &&
          searchDigits.length >= 3 &&
          ((p.normalizedPhone && p.normalizedPhone.includes(searchDigits)) ||
            (p.normalizedAltPhone && p.normalizedAltPhone.includes(searchDigits)) ||
            (p.normalizedNid && p.normalizedNid.includes(searchDigits)))
        ) {
          return true;
        }
        return false;
      });
    }

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return res.json({ success: true, data: items.map((p) => sanitizePartyForUser(p, user)) });
  });

  // 8B. Staff <-> Party Duplicate Pre-Check (Prevents duplicate staff/party records)
  router.get('/parties/staff/check-match', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }
    const mosqueId = req.currentMosque!.id;
    const phone = cleanStr(req.query?.phone, 40);
    const nid = cleanStr(req.query?.nid, 40);
    const name = cleanStr(req.query?.name, 160);
    const excludeStaffId = cleanStr(req.query?.excludeStaffId, 100) || undefined;

    const { matchingStaff, matchingParties } = findDuplicateStaffAndParties({
      mosqueId,
      phone,
      nid,
      name,
      excludeStaffId,
    });

    return res.json({
      success: true,
      data: {
        matchingStaff: matchingStaff.map((s) => ({
          id: s.id,
          staffCode: s.staffCode,
          name: s.fullNameBn || s.name,
          designationBn: s.designationBn,
          phone: s.phone,
          nid: s.nid,
          linkedPartyId: s.linkedPartyId,
          linkedPartyCode: s.linkedPartyCode,
        })),
        matchingParties,
      },
    });
  });

  // 8C. Link or Unlink Regular Staff Member to Central Party Registry (Zero Payroll Mutation)
  router.post('/parties/link-staff/:staffId', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    const canManageStaff =
      user.role === 'SUPER_ADMIN' ||
      user.role === 'MOSQUE_ADMIN' ||
      user.role === 'COMMITTEE_ADMIN' ||
      (Array.isArray(user.permissions) && user.permissions.includes('MANAGE_STAFF'));
    if (!canManageStaff && !hasPartyPermission(user, 'party.edit')) {
      return denyPermission(req, res, 'party.edit');
    }

    const mosqueId = req.currentMosque!.id;
    const staffId = cleanStr(req.params.staffId, 100);
    const staff = (db.staffList || []).find((s) => s.id === staffId && s.mosqueId === mosqueId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: { code: 'STAFF_NOT_FOUND', message: 'নিয়মিত স্টাফ প্রোফাইলটি পাওয়া যায়নি।' },
      });
    }

    const requestedPartyId = cleanOptionalStr(req.body?.partyId, 100);
    const createNewIfMissing = Boolean(req.body?.createNewIfMissing);

    const result = syncStaffPartyLink({
      mosqueId,
      staff,
      user,
      ipAddress: getClientIp(req),
      partyId: requestedPartyId,
      createNewIfMissing,
    });

    if (result.errorCode) {
      return res.status(409).json({
        success: false,
        error: { code: result.errorCode, message: result.errorMessage },
      });
    }

    return res.json({
      success: true,
      data: {
        staff: result.staff,
        party: result.party,
      },
      message: 'স্টাফ প্রোফাইল সফলভাবে কেন্দ্রীয় পার্টি রেজিস্ট্রির সাথে সংযুক্ত হয়েছে।',
    });
  });

  router.delete('/parties/link-staff/:staffId', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    const canManageStaff =
      user.role === 'SUPER_ADMIN' ||
      user.role === 'MOSQUE_ADMIN' ||
      user.role === 'COMMITTEE_ADMIN' ||
      (Array.isArray(user.permissions) && user.permissions.includes('MANAGE_STAFF'));
    if (!canManageStaff && !hasPartyPermission(user, 'party.edit')) {
      return denyPermission(req, res, 'party.edit');
    }

    const mosqueId = req.currentMosque!.id;
    const staffId = cleanStr(req.params.staffId, 100);
    const staff = (db.staffList || []).find((s) => s.id === staffId && s.mosqueId === mosqueId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: { code: 'STAFF_NOT_FOUND', message: 'নিয়মিত স্টাফ প্রোফাইলটি পাওয়া যায়নি।' },
      });
    }

    const result = syncStaffPartyLink({
      mosqueId,
      staff,
      user,
      ipAddress: getClientIp(req),
      partyId: null,
    });

    return res.json({
      success: true,
      data: { staff: result.staff },
      message: 'স্টাফ প্রোফাইল থেকে পার্টি সংযোগ বিচ্ছিন্ন করা হয়েছে (বেতন ও স্টাফ রেকর্ড অপরিবর্তিত)।',
    });
  });

  // 8D. Part 3: Read-Only Multi-Criteria Party Directory & Activity History Report Engine
  router.get('/parties/reports', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }

    const mosqueId = req.currentMosque!.id;
    const mode = req.query?.mode === 'HISTORY' ? 'HISTORY' : 'DIRECTORY';
    const categoryGroup = cleanStr(req.query?.categoryGroup, 40) || 'ALL';
    const role = cleanOptionalStr(req.query?.role, 60);
    const partyType = cleanOptionalStr(req.query?.partyType, 30);
    const status = cleanStr(req.query?.status, 20) || 'ALL';
    const occupation = cleanOptionalStr(req.query?.occupation, 120);
    const search = cleanOptionalStr(req.query?.search, 160);
    const startDate = cleanOptionalStr(req.query?.startDate, 20);
    const endDate = cleanOptionalStr(req.query?.endDate, 20);
    const sourceType = cleanStr(req.query?.sourceType, 30) || 'ALL';

    const bundle = buildPartyReportBundle({
      mosqueId,
      mosqueName: req.currentMosque?.name,
      mode,
      categoryGroup,
      role,
      partyType,
      status,
      occupation,
      search,
      startDate,
      endDate,
      sourceType,
      user,
    });

    return res.json({ success: true, data: bundle });
  });

  // 8E. Part 3: Zero-Storage Camera/Document AI OCR Scan (Central AI Proxy + UNVERIFIED_DRAFT)
  router.post('/parties/ocr/scan', authenticate, async (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (
      !hasPartyPermission(user, 'party.ocr') &&
      !hasPartyPermission(user, 'party.create') &&
      !hasPartyPermission(user, 'party.edit')
    ) {
      return denyPermission(req, res, 'party.ocr');
    }

    const rateCheck = checkPartyOcrRateLimit(user.id);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `অনুগ্রহ করে ${rateCheck.retryAfterSec} সেকেন্ড পর পুনরায় OCR স্ক্যান চেষ্টা করুন।`,
        },
      });
    }

    const mosqueId = req.currentMosque!.id;
    const docType = (cleanStr(req.body?.docType, 40).toUpperCase() || 'OTHER') as PartyOcrDocType;
    const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    const mimeType = cleanOptionalStr(req.body?.mimeType, 80);
    const userHint = cleanOptionalStr(req.body?.userHint, 250);

    try {
      const existingParties = (db.parties || [])
        .filter((p) => p.mosqueId === mosqueId && !p.mergedIntoPartyId)
        .map((p) => sanitizePartyForUser(p, user));

      const result = await scanPartyDocumentWithCentralAi({
        mosqueId,
        docType,
        dataUrl,
        mimeType,
        userHint,
        existingParties,
      });

      logSecurityAuditEvent({
        mosqueId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'PARTY_OCR_SCAN',
        details: `জিরো-স্টোরেজ OCR খসড়া বিশ্লেষণ (${result.detectedDocTypeBn}, মডেল: ${result.modelUsed}) — ছবি সংরক্ষণ করা হয়নি`,
        ipAddress: getClientIp(req),
        status: 'SUCCESS',
      });

      return res.json({ success: true, data: result });
    } catch (err: any) {
      const status = Number(err?.statusCode || err?.status || 500);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        success: false,
        error: {
          code: err?.code || 'OCR_FAILED',
          message: err?.message || 'ডকুমেন্ট OCR বিশ্লেষণ সম্পন্ন করা যায়নি।',
        },
      });
    }
  });

  // 9. Get Single Party Profile (Supports resolving old merged partyId history cleanly)
  router.get('/parties/:id', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }

    const mosqueId = req.currentMosque!.id;
    const requestedId = cleanStr(req.params.id, 100);
    const tenantParties = (db.parties || []).filter((p) => p.mosqueId === mosqueId);

    const directMatch = tenantParties.find(
      (p) => p.id === requestedId || p.partyId === requestedId || p.partyCode === requestedId
    );
    if (!directMatch) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'ব্যক্তি বা প্রতিষ্ঠানের প্রোফাইল পাওয়া যায়নি।' },
      });
    }

    let resolvedPrimaryParty: PartyRecord | undefined;
    if (directMatch.mergedIntoPartyId) {
      resolvedPrimaryParty = tenantParties.find((p) => p.partyId === directMatch.mergedIntoPartyId);
    }

    const targetIds = new Set<string>([
      directMatch.partyId,
      ...(directMatch.mergedFromPartyIds || []),
      ...(resolvedPrimaryParty ? [resolvedPrimaryParty.partyId, ...(resolvedPrimaryParty.mergedFromPartyIds || [])] : []),
    ]);

    const canViewAudit = hasPartyPermission(user, 'party.view_audit') || hasPartyPermission(user, 'party.view');
    const rawAuditLogs = canViewAudit
      ? (db.partyAuditLogs || [])
          .filter((a) => a.mosqueId === mosqueId && targetIds.has(a.partyId))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      : [];
    const auditLogs = sanitizeAuditLogsForUser(rawAuditLogs, user);

    const mergeHistory = (db.partyMergeHistory || [])
      .filter(
        (m) =>
          m.mosqueId === mosqueId &&
          (targetIds.has(m.targetPartyId) || targetIds.has(m.sourcePartyId))
      )
      .sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());

    const crossRefs = buildPartyCrossReferences(mosqueId, targetIds, directMatch);

    return res.json({
      success: true,
      data: {
        party: sanitizePartyForUser(directMatch, user),
        resolvedPrimaryParty: resolvedPrimaryParty
          ? sanitizePartyForUser(resolvedPrimaryParty, user)
          : undefined,
        auditLogs,
        mergeHistory,
        voucherReferences: crossRefs.voucherReferences,
        agreementReferences: crossRefs.agreementReferences,
        linkedStaff: crossRefs.linkedStaff,
      },
    });
  });

  // 9B. Part 3: Unified Read-Only Activity History (Purchases, Supplies, Work/Wages, Agreements & Timeline)
  router.get('/parties/:id/history', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view');
    }

    const mosqueId = req.currentMosque!.id;
    const requestedId = cleanStr(req.params.id, 100);
    const party = (db.parties || []).find(
      (p) =>
        p.mosqueId === mosqueId &&
        (p.id === requestedId || p.partyId === requestedId || p.partyCode === requestedId)
    );

    if (!party) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'ব্যক্তি বা প্রতিষ্ঠানের প্রোফাইল পাওয়া যায়নি।' },
      });
    }

    const startDate = cleanOptionalStr(req.query?.startDate, 20);
    const endDate = cleanOptionalStr(req.query?.endDate, 20);
    const kind = cleanOptionalStr(req.query?.kind, 40);

    const historyBundle = buildPartyHistoryBundle({
      mosqueId,
      party,
      startDate,
      endDate,
      kind,
      user,
    });

    return res.json({ success: true, data: historyBundle });
  });

  // 10. Per-Party Audit Logs
  router.get('/parties/:id/audit', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.view_audit') && !hasPartyPermission(user, 'party.view')) {
      return denyPermission(req, res, 'party.view_audit');
    }
    const mosqueId = req.currentMosque!.id;
    const requestedId = cleanStr(req.params.id, 100);
    const party = (db.parties || []).find((p) => p.mosqueId === mosqueId && p.id === requestedId);
    if (!party) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'প্রোফাইল পাওয়া যায়নি।' },
      });
    }
    const relatedIds = new Set([party.partyId, ...(party.mergedFromPartyIds || [])]);
    const logs = (db.partyAuditLogs || [])
      .filter((a) => a.mosqueId === mosqueId && relatedIds.has(a.partyId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json({ success: true, data: sanitizeAuditLogsForUser(logs, user) });
  });

  // 11. Create Party Profile (Zero Financial Side-Effects)
  router.post('/parties', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.create')) {
      return denyPermission(req, res, 'party.create');
    }

    const mosqueId = req.currentMosque!.id;
    const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);

    const rawType = cleanStr(req.body?.partyType, 30) as PartyProfileType;
    const partyType: PartyProfileType = VALID_PARTY_TYPES.has(rawType) ? rawType : 'INDIVIDUAL';
    const name = cleanStr(req.body?.name, 200);
    const roles = sanitizeRoles(req.body?.roles, customRoles);
    const phone = cleanStr(req.body?.phone, 40);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'নাম বা প্রতিষ্ঠানের নাম প্রদান করা আবশ্যক।' },
      });
    }
    if (roles.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'কমপক্ষে একটি ভূমিকা (Role) নির্বাচন করতে হবে।' },
      });
    }
    if (!normalizedPhone || normalizedPhone.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সঠিক প্রাথমিক মোবাইল নম্বর প্রদান করা আবশ্যক।' },
      });
    }

    const alternatePhone = cleanOptionalStr(req.body?.alternatePhone, 40);
    const normalizedAltPhone = alternatePhone ? normalizePhoneNumber(alternatePhone) : undefined;
    const nidNumber = cleanOptionalStr(req.body?.nidNumber, 40);
    const normalizedNid = nidNumber ? normalizeNidNumber(nidNumber) : undefined;
    const rawStatus = cleanStr(req.body?.status, 20) as PartyStatus;
    const status: PartyStatus = VALID_PARTY_STATUSES.has(rawStatus) ? rawStatus : 'ACTIVE';

    const id = `pty-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    const newRecord: PartyRecord = {
      id,
      partyId: id,
      partyCode: generateNextPartyCode(mosqueId),
      mosqueId,
      tenantId: mosqueId,
      partyType,
      name,
      roles,
      photoOrLogoUrl: sanitizePhotoOrLogoUrl(req.body?.photoOrLogoUrl),
      phone,
      normalizedPhone,
      alternatePhone,
      normalizedAltPhone,
      email: cleanOptionalStr(req.body?.email, 160),
      fullAddress: cleanOptionalStr(req.body?.fullAddress, 400),
      villageOrMahalla: cleanOptionalStr(req.body?.villageOrMahalla, 160),
      unionOrWard: cleanOptionalStr(req.body?.unionOrWard, 160),
      upazila: cleanOptionalStr(req.body?.upazila, 120),
      district: cleanOptionalStr(req.body?.district, 120),
      division: cleanOptionalStr(req.body?.division, 120),
      postCode: cleanOptionalStr(req.body?.postCode, 20),
      nidNumber,
      normalizedNid: normalizedNid || undefined,
      occupationOrSkill: cleanOptionalStr(req.body?.occupationOrSkill, 200),
      description: cleanOptionalStr(req.body?.description, 1500),
      notes: cleanOptionalStr(req.body?.notes, 1500),
      status,
      organizationDetails:
        partyType === 'ORGANIZATION' ? sanitizeOrganizationDetails(req.body?.organizationDetails) : undefined,
      artisanDetails: sanitizeArtisanDetails(req.body?.artisanDetails),
      createdAt: now,
      createdBy: user.id,
      createdByName: user.name,
      updatedAt: now,
      updatedBy: user.id,
      updatedByName: user.name,
    };

    if (!db.parties) db.parties = [];
    db.parties.unshift(newRecord);

    appendPartyAudit({
      mosqueId,
      partyId: newRecord.partyId,
      partyCode: newRecord.partyCode,
      partyName: newRecord.name,
      action: 'CREATED',
      summaryBn: `নতুন ${partyType === 'ORGANIZATION' ? 'প্রতিষ্ঠান' : 'ব্যক্তি'} প্রোফাইল তৈরি হয়েছে (${roles.map((r) => getPartyRoleLabelBn(r, customRoles)).join(', ')})।`,
      user,
      ipAddress: getClientIp(req),
    });

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      user.role,
      'CREATE',
      'PARTY_REGISTRY',
      `নতুন পার্টি নিবন্ধন (${newRecord.partyCode}): ${newRecord.name}`,
      newRecord.partyId,
      getClientIp(req)
    );

    db.save();

    return res.status(201).json({ success: true, data: newRecord });
  });

  // 12. Update Party Profile (With Field-Level Diff Audit Trail)
  router.put('/parties/:id', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.edit')) {
      return denyPermission(req, res, 'party.edit');
    }

    const mosqueId = req.currentMosque!.id;
    const customRoles = (db.partyCustomRoles || []).filter((r) => r.mosqueId === mosqueId);
    const idx = (db.parties || []).findIndex((p) => p.id === req.params.id && p.mosqueId === mosqueId);

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'ব্যক্তি বা প্রতিষ্ঠানের প্রোফাইল পাওয়া যায়নি।' },
      });
    }

    const existing = db.parties[idx];
    if (existing.mergedIntoPartyId) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'MERGED_RECORD_LOCKED',
          message:
            'এই রেকর্ডটি ইতিমধ্যেই অন্য একটি মূল প্রোফাইলের সাথে Merge হয়ে গেছে। অনুগ্রহ করে মূল প্রোফাইল থেকে সম্পাদনা করুন।',
        },
      });
    }

    const rawType = cleanStr(req.body?.partyType, 30) as PartyProfileType;
    const partyType: PartyProfileType = VALID_PARTY_TYPES.has(rawType) ? rawType : existing.partyType;
    const name = cleanStr(req.body?.name, 200);
    const roles = sanitizeRoles(req.body?.roles, customRoles);
    const phone = cleanStr(req.body?.phone, 40);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'নাম বা প্রতিষ্ঠানের নাম প্রদান করা আবশ্যক।' },
      });
    }
    if (roles.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'কমপক্ষে একটি ভূমিকা (Role) নির্বাচন করতে হবে।' },
      });
    }
    if (!normalizedPhone || normalizedPhone.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সঠিক প্রাথমিক মোবাইল নম্বর প্রদান করা আবশ্যক।' },
      });
    }

    const alternatePhone = cleanOptionalStr(req.body?.alternatePhone, 40);
    const normalizedAltPhone = alternatePhone ? normalizePhoneNumber(alternatePhone) : undefined;
    const nidNumber = cleanOptionalStr(req.body?.nidNumber, 40);
    const normalizedNid = nidNumber ? normalizeNidNumber(nidNumber) : undefined;
    const rawStatus = cleanStr(req.body?.status, 20) as PartyStatus;
    const status: PartyStatus = VALID_PARTY_STATUSES.has(rawStatus) ? rawStatus : existing.status;

    const updated: PartyRecord = {
      ...existing,
      partyType,
      name,
      roles,
      photoOrLogoUrl:
        req.body?.photoOrLogoUrl === null || req.body?.photoOrLogoUrl === ''
          ? undefined
          : sanitizePhotoOrLogoUrl(req.body?.photoOrLogoUrl) ?? existing.photoOrLogoUrl,
      phone,
      normalizedPhone,
      alternatePhone,
      normalizedAltPhone,
      email: cleanOptionalStr(req.body?.email, 160),
      fullAddress: cleanOptionalStr(req.body?.fullAddress, 400),
      villageOrMahalla: cleanOptionalStr(req.body?.villageOrMahalla, 160),
      unionOrWard: cleanOptionalStr(req.body?.unionOrWard, 160),
      upazila: cleanOptionalStr(req.body?.upazila, 120),
      district: cleanOptionalStr(req.body?.district, 120),
      division: cleanOptionalStr(req.body?.division, 120),
      postCode: cleanOptionalStr(req.body?.postCode, 20),
      nidNumber,
      normalizedNid: normalizedNid || undefined,
      occupationOrSkill: cleanOptionalStr(req.body?.occupationOrSkill, 200),
      description: cleanOptionalStr(req.body?.description, 1500),
      notes: cleanOptionalStr(req.body?.notes, 1500),
      status,
      organizationDetails:
        partyType === 'ORGANIZATION' ? sanitizeOrganizationDetails(req.body?.organizationDetails) : undefined,
      artisanDetails: sanitizeArtisanDetails(req.body?.artisanDetails),
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name,
    };

    const changedFields: PartyAuditFieldChange[] = [];
    const trackedFields: Array<[keyof PartyRecord, string]> = [
      ['name', 'নাম'],
      ['partyType', 'প্রোফাইলের ধরন'],
      ['phone', 'মোবাইল নম্বর'],
      ['alternatePhone', 'বিকল্প মোবাইল'],
      ['email', 'ইমেইল'],
      ['fullAddress', 'পূর্ণ ঠিকানা'],
      ['district', 'জেলা'],
      ['nidNumber', 'NID নম্বর'],
      ['occupationOrSkill', 'পেশা / দক্ষতা'],
      ['status', 'অবস্থা'],
    ];

    for (const [key, labelBn] of trackedFields) {
      const oldV = String(existing[key] ?? '');
      const newV = String(updated[key] ?? '');
      if (oldV !== newV) {
        changedFields.push({ field: String(key), labelBn, oldValue: oldV || '—', newValue: newV || '—' });
      }
    }
    const oldRolesStr = (existing.roles || []).join(', ');
    const newRolesStr = (updated.roles || []).join(', ');
    if (oldRolesStr !== newRolesStr) {
      changedFields.push({
        field: 'roles',
        labelBn: 'ভূমিকাসমূহ',
        oldValue: (existing.roles || []).map((r) => getPartyRoleLabelBn(r, customRoles)).join(', '),
        newValue: (updated.roles || []).map((r) => getPartyRoleLabelBn(r, customRoles)).join(', '),
      });
    }

    db.parties[idx] = updated;

    appendPartyAudit({
      mosqueId,
      partyId: updated.partyId,
      partyCode: updated.partyCode,
      partyName: updated.name,
      action: 'UPDATED',
      summaryBn:
        changedFields.length > 0
          ? `প্রোফাইলের ${changedFields.length}টি তথ্য হালনাগাদ করা হয়েছে।`
          : 'প্রোফাইল সংরক্ষণ ও হালনাগাদ করা হয়েছে।',
      changedFields,
      user,
      ipAddress: getClientIp(req),
    });

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      user.role,
      'UPDATE',
      'PARTY_REGISTRY',
      `পার্টি প্রোফাইল হালনাগাদ (${updated.partyCode}): ${updated.name}`,
      updated.partyId,
      getClientIp(req)
    );

    db.save();

    return res.json({ success: true, data: updated });
  });

  // 13. Quick Status Toggle (ACTIVE / INACTIVE)
  router.patch('/parties/:id/status', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.edit')) {
      return denyPermission(req, res, 'party.edit');
    }

    const mosqueId = req.currentMosque!.id;
    const idx = (db.parties || []).findIndex((p) => p.id === req.params.id && p.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'প্রোফাইল পাওয়া যায়নি।' },
      });
    }

    const existing = db.parties[idx];
    if (existing.mergedIntoPartyId) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'MERGED_RECORD_LOCKED',
          message: 'একীভূত (Merged) পুরোনো রেকর্ডের অবস্থা পরিবর্তন করা যাবে না।',
        },
      });
    }

    const nextStatus = cleanStr(req.body?.status, 20) as PartyStatus;
    if (!VALID_PARTY_STATUSES.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সঠিক স্ট্যাটাস (ACTIVE বা INACTIVE) দিন।' },
      });
    }

    const prevStatus = existing.status;
    if (prevStatus === nextStatus) {
      return res.json({ success: true, data: existing });
    }

    const updated: PartyRecord = {
      ...existing,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
      updatedByName: user.name,
    };

    db.parties[idx] = updated;

    appendPartyAudit({
      mosqueId,
      partyId: updated.partyId,
      partyCode: updated.partyCode,
      partyName: updated.name,
      action: 'STATUS_CHANGED',
      summaryBn: `অবস্থা পরিবর্তন: ${prevStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} → ${nextStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}`,
      changedFields: [
        {
          field: 'status',
          labelBn: 'অবস্থা',
          oldValue: prevStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
          newValue: nextStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
        },
      ],
      user,
      ipAddress: getClientIp(req),
    });

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      user.role,
      'UPDATE',
      'PARTY_REGISTRY',
      `পার্টি স্ট্যাটাস পরিবর্তন (${updated.partyCode}): ${prevStatus} → ${nextStatus}`,
      updated.partyId,
      getClientIp(req)
    );

    db.save();

    return res.json({ success: true, data: updated });
  });

  // 14. Delete Party (Blocks deleting records with Merge lineage to protect history)
  router.delete('/parties/:id', authenticate, (req: PartyAuthRequest, res: Response) => {
    const user = req.user!;
    if (!hasPartyPermission(user, 'party.delete')) {
      return denyPermission(req, res, 'party.delete');
    }

    const mosqueId = req.currentMosque!.id;
    const idx = (db.parties || []).findIndex((p) => p.id === req.params.id && p.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'প্রোফাইল পাওয়া যায়নি।' },
      });
    }

    const target = db.parties[idx];
    if (target.mergedIntoPartyId || (target.mergedFromPartyIds && target.mergedFromPartyIds.length > 0)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'MERGE_HISTORY_PROTECTED',
          message:
            'Merge ইতিহাসের সাথে যুক্ত রেকর্ড সরাসরি মুছে ফেলা যাবে না। প্রয়োজনে প্রোফাইলটি নিষ্ক্রিয় (Inactive) রাখুন।',
        },
      });
    }

    db.parties.splice(idx, 1);

    appendPartyAudit({
      mosqueId,
      partyId: target.partyId,
      partyCode: target.partyCode,
      partyName: target.name,
      action: 'DELETED',
      summaryBn: `পার্টি প্রোফাইল (${target.partyCode} - ${target.name}) তালিকা থেকে মুছে ফেলা হয়েছে।`,
      user,
      ipAddress: getClientIp(req),
    });

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      user.role,
      'DELETE',
      'PARTY_REGISTRY',
      `পার্টি প্রোফাইল মুছে ফেলা হয়েছে (${target.partyCode}): ${target.name}`,
      target.partyId,
      getClientIp(req)
    );

    db.save();

    return res.json({ success: true, data: { deletedId: target.id } });
  });

  return router;
}

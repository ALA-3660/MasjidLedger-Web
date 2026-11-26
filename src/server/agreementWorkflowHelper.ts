import crypto from 'crypto';
import { User, Permission } from '../types/index.ts';
import {
  AgreementArchiveReport,
  AgreementPermissionKey,
  AgreementRecord,
  AgreementStatus,
  AgreementVersionSnapshot,
} from '../types/agreementTypes.ts';
import {
  AGREEMENT_STATUS_ORDER,
  buildRequiredSignerSlots,
  isAgreementLockedForDirectEdit,
} from '../lib/agreementCatalog.ts';

// ==========================================
// 1. Granular Backend RBAC Permission Engine
// ==========================================

const LEGACY_PERMISSION_MAP: Partial<Record<AgreementPermissionKey, Permission>> = {
  'agreement.view': 'VIEW_AGREEMENTS',
  'agreement.create': 'CREATE_AGREEMENT',
  'agreement.edit': 'EDIT_AGREEMENT',
  'agreement.delete': 'DELETE_AGREEMENT',
  'agreement.manage_templates': 'MANAGE_AGREEMENT_TEMPLATES',
};

const ACCOUNTANT_TREASURER_PERMS = new Set<AgreementPermissionKey>([
  'agreement.view',
  'agreement.create',
  'agreement.edit',
  'agreement.review',
  'agreement.manage_parties',
  'agreement.upload_documents',
  'agreement.manage_templates',
  'agreement.use_ai',
  'agreement.sign',
  'agreement.view_reports',
]);

const OPERATOR_PERMS = new Set<AgreementPermissionKey>([
  'agreement.view',
  'agreement.create',
  'agreement.edit',
  'agreement.manage_parties',
  'agreement.upload_documents',
  'agreement.use_ai',
]);

const AUDITOR_PERMS = new Set<AgreementPermissionKey>([
  'agreement.view',
  'agreement.review',
  'agreement.view_reports',
]);

const VIEWER_PERMS = new Set<AgreementPermissionKey>([
  'agreement.view',
  'agreement.view_reports',
]);

export function hasAgreementPermission(user: User | undefined | null, perm: AgreementPermissionKey): boolean {
  if (!user) return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes(perm)) return true;

  const legacy = LEGACY_PERMISSION_MAP[perm];
  if (legacy && perms.includes(legacy)) return true;

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

// ==========================================
// 2. Deterministic SHA-256 Document Hash & Snapshots
// ==========================================

export function computeAgreementDocumentHash(ag: Partial<AgreementRecord>): string {
  const canonicalPayload = {
    agreementNumber: ag.agreementNumber || '',
    versionNumber: ag.versionNumber || 1,
    isAmendment: Boolean(ag.isAmendment),
    amendmentNumber: ag.amendmentNumber || 0,
    title: ag.title || '',
    categoryCode: ag.categoryCode || '',
    agreementDate: ag.agreementDate || '',
    effectiveDate: ag.effectiveDate || '',
    expiryDate: ag.expiryDate || '',
    durationText: ag.durationText || '',
    executionPlace: ag.executionPlace || '',
    purpose: ag.purpose || '',
    parties: (ag.parties || []).map((p) => ({
      roleOrder: p.roleOrder,
      roleLabel: p.roleLabel,
      partyType: p.partyType,
      name: p.name,
      nidOrRegNo: p.nidOrRegNo || '',
      representatives: (p.representatives || []).map((r) => ({
        name: r.name,
        designation: r.designation,
        authorityBasis: r.authorityBasis,
        isSignatory: Boolean(r.isSignatory),
      })),
    })),
    constructionDetails: ag.constructionDetails || null,
    landWaqfDetails: ag.landWaqfDetails || null,
    writtenFinancialTerms: ag.writtenFinancialTerms || null,
    generalClauses: ag.generalClauses || '',
    specialClauses: ag.specialClauses || '',
    terminationClause: ag.terminationClause || '',
    disputeResolutionClause: ag.disputeResolutionClause || '',
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload))
    .digest('hex');
}

export function buildAgreementVersionSnapshot(
  ag: AgreementRecord,
  meta: {
    changeSummary: string;
    changedBy: string;
    changedByName: string;
    previousVersionNumber?: number;
    isAmendment?: boolean;
    amendmentTitle?: string;
  }
): AgreementVersionSnapshot {
  const docHash = computeAgreementDocumentHash(ag);
  const latestApproval = (ag.approvalRecords || [])[0];
  const approvalStatusAtSnapshot = latestApproval
    ? `${latestApproval.decision} (${latestApproval.approverName})`
    : ag.status === 'APPROVED'
    ? 'APPROVED'
    : 'PENDING';

  const currentVersion = ag.versionNumber || 1;
  const sigCountForVersion = (ag.signatures || []).filter((s) => s.versionNumber === currentVersion).length;

  return {
    id: `ver-${crypto.randomUUID().slice(0, 10)}`,
    versionNumber: currentVersion,
    previousVersionNumber: meta.previousVersionNumber,
    isAmendment: Boolean(meta.isAmendment ?? ag.isAmendment),
    amendmentTitle: meta.amendmentTitle,
    changeSummary: meta.changeSummary,
    changedBy: meta.changedBy,
    changedByName: meta.changedByName,
    changedAt: new Date().toISOString(),
    statusAtSnapshot: ag.status,
    approvalStatusAtSnapshot,
    documentHash: docHash,
    signatureCountAtSnapshot: sigCountForVersion,
    snapshotData: {
      title: ag.title,
      categoryCode: ag.categoryCode,
      categoryNameBn: ag.categoryNameBn,
      agreementDate: ag.agreementDate,
      effectiveDate: ag.effectiveDate,
      expiryDate: ag.expiryDate,
      durationText: ag.durationText,
      purpose: ag.purpose,
      partiesSummary: (ag.parties || []).map((p) => `${p.roleLabel}: ${p.name}`),
      generalClauses: ag.generalClauses,
      specialClauses: ag.specialClauses,
      terminationClause: ag.terminationClause,
      disputeResolutionClause: ag.disputeResolutionClause,
      writtenFinancialSummary: ag.writtenFinancialTerms?.totalWrittenAmount
        ? `${ag.writtenFinancialTerms.mode} — ${ag.writtenFinancialTerms.totalWrittenAmount}`
        : ag.writtenFinancialTerms?.mode,
    },
  };
}

// ==========================================
// 3. Governance Gates (Waqf Legal Review, Signatures & Immutability)
// ==========================================

export function requiresWaqfLegalReview(ag: Pick<AgreementRecord, 'isWaqfOrLandRelated' | 'landWaqfDetails'>): boolean {
  return Boolean(ag.isWaqfOrLandRelated || ag.landWaqfDetails?.waqfLegalReviewRequired);
}

export function isWaqfLegalReviewCleared(ag: AgreementRecord): boolean {
  if (!requiresWaqfLegalReview(ag)) return true;
  if (ag.waqfLegalReviewStatus === 'CLEARED') return true;
  const currentVersion = ag.versionNumber || 1;
  return (ag.reviewRecords || []).some(
    (r) => r.stage === 'WAQF_LEGAL' && r.decision === 'WAQF_LEGAL_CLEARED' && r.versionNumber === currentVersion
  );
}

export function getSignatureProgressForCurrentVersion(ag: AgreementRecord): {
  requiredSlots: ReturnType<typeof buildRequiredSignerSlots>;
  signedSlotKeys: Set<string>;
  signedCount: number;
  requiredCount: number;
  allSigned: boolean;
  nextPendingSlot: ReturnType<typeof buildRequiredSignerSlots>[number] | null;
} {
  const currentVersion = ag.versionNumber || 1;
  const requiredSlots = buildRequiredSignerSlots(ag);
  const currentSigs = (ag.signatures || []).filter((s) => s.versionNumber === currentVersion);
  const signedSlotKeys = new Set(currentSigs.map((s) => s.slotKey));

  let signedCount = 0;
  let nextPendingSlot: ReturnType<typeof buildRequiredSignerSlots>[number] | null = null;
  for (const slot of requiredSlots) {
    if (signedSlotKeys.has(slot.slotKey)) {
      signedCount += 1;
    } else if (!nextPendingSlot) {
      nextPendingSlot = slot;
    }
  }

  return {
    requiredSlots,
    signedSlotKeys,
    signedCount,
    requiredCount: requiredSlots.length,
    allSigned: requiredSlots.length > 0 && signedCount >= requiredSlots.length,
    nextPendingSlot,
  };
}

export function canHardDeleteAgreement(ag: AgreementRecord): { allowed: boolean; reasonBn?: string } {
  if (isAgreementLockedForDirectEdit(ag)) {
    return {
      allowed: false,
      reasonBn: 'স্বাক্ষরিত, কার্যকর বা সমাপ্ত চুক্তিপত্র স্থায়ীভাবে মুছে ফেলা যাবে না; প্রয়োজনে আর্কাইভ বা বাতিল/অবসান নথিভুক্ত করুন।',
    };
  }
  if ((ag.approvalRecords && ag.approvalRecords.length > 0) || (ag.signatures && ag.signatures.length > 0)) {
    return {
      allowed: false,
      reasonBn: 'অনুমোদন বা স্বাক্ষরের রেকর্ড থাকা চুক্তিপত্র মুছে ফেলা নিষিদ্ধ (অডিট সংরক্ষণ নীতি)।',
    };
  }
  return { allowed: true };
}

export function sanitizeSignatureImageDataUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Strictly allow PNG or JPEG data URLs from HTML5 canvas, max 300KB
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return undefined;
  }
  if (trimmed.length > 300 * 1024) {
    return undefined;
  }
  return trimmed;
}

// ==========================================
// 4. Server-Side Signature OTP Verification Engine (In-Memory, SHA-256 Hashed)
// ==========================================

interface PendingOtpEntry {
  otpHash: string;
  mosqueId: string;
  agreementId: string;
  slotKey: string;
  maskedTarget: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}

const otpStore = new Map<string, PendingOtpEntry>();
const otpRateBuckets = new Map<string, number[]>();

function hashOtp(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

export function maskPhoneOrIdentity(val?: string): string {
  const s = (val || '').trim();
  if (!s) return 'উপস্থিত স্বাক্ষরকারী';
  if (s.length <= 4) return '****';
  return `${s.slice(0, 3)}****${s.slice(-2)}`;
}

export function issueSignatureOtpChallenge(params: {
  userId: string;
  mosqueId: string;
  agreementId: string;
  slotKey: string;
  targetPhone?: string;
}):
  | { allowed: false; retryAfterSec: number }
  | {
      allowed: true;
      challengeId: string;
      maskedTarget: string;
      expiresInSec: number;
      /** Shown in UI preview when no external SMS gateway is attached; never logged in plaintext */
      verificationCodePreview: string;
    } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const bucketKey = `${params.userId}:${params.agreementId}`;
  const recent = (otpRateBuckets.get(bucketKey) || []).filter((t) => now - t < windowMs);
  if (recent.length >= 6) {
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfterSec: Math.max(5, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }
  recent.push(now);
  otpRateBuckets.set(bucketKey, recent);

  // Prune expired OTP entries
  for (const [k, entry] of otpStore.entries()) {
    if (entry.expiresAt < now || entry.used) {
      otpStore.delete(k);
    }
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const challengeId = `otp-${crypto.randomUUID().slice(0, 12)}`;
  const maskedTarget = maskPhoneOrIdentity(params.targetPhone);

  otpStore.set(challengeId, {
    otpHash: hashOtp(code, challengeId),
    mosqueId: params.mosqueId,
    agreementId: params.agreementId,
    slotKey: params.slotKey,
    maskedTarget,
    expiresAt: now + 5 * 60 * 1000,
    attempts: 0,
    used: false,
  });

  return {
    allowed: true,
    challengeId,
    maskedTarget,
    expiresInSec: 300,
    verificationCodePreview: code,
  };
}

export function verifySignatureOtpChallenge(params: {
  challengeId: string;
  otpCode: string;
  mosqueId: string;
  agreementId: string;
  slotKey: string;
}): { ok: true; maskedTarget: string } | { ok: false; messageBn: string } {
  const entry = otpStore.get(params.challengeId);
  if (!entry) {
    return { ok: false, messageBn: 'OTP সেশন পাওয়া যায়নি বা মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নতুন OTP নিন।' };
  }
  if (entry.used) {
    return { ok: false, messageBn: 'এই OTP কোডটি ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে নতুন OTP নিন।' };
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(params.challengeId);
    return { ok: false, messageBn: 'OTP কোডের মেয়াদ (৫ মিনিট) শেষ হয়ে গেছে। নতুন OTP অনুরোধ করুন।' };
  }
  if (
    entry.mosqueId !== params.mosqueId ||
    entry.agreementId !== params.agreementId ||
    entry.slotKey !== params.slotKey
  ) {
    return { ok: false, messageBn: 'OTP কোডটি এই স্বাক্ষরকারীর জন্য প্রযোজ্য নয়।' };
  }
  if (entry.attempts >= 5) {
    otpStore.delete(params.challengeId);
    return { ok: false, messageBn: 'অতিরিক্ত ভুল চেষ্টার কারণে OTP বাতিল হয়েছে। নতুন OTP নিন।' };
  }

  entry.attempts += 1;
  const providedHash = hashOtp(params.otpCode.trim(), params.challengeId);
  const a = Buffer.from(entry.otpHash, 'hex');
  const b = Buffer.from(providedHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, messageBn: 'প্রদত্ত ৬ সংখ্যার OTP কোডটি সঠিক নয়।' };
  }

  entry.used = true;
  otpStore.delete(params.challengeId);
  return { ok: true, maskedTarget: entry.maskedTarget };
}

// ==========================================
// 5. Archive & Governance Report (STRICTLY Count-Only, ZERO Financials)
// ==========================================

export function buildAgreementArchiveReport(agreements: AgreementRecord[]): AgreementArchiveReport {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  const statusCounts = new Map<AgreementStatus, number>();
  for (const st of AGREEMENT_STATUS_ORDER) {
    statusCounts.set(st, 0);
  }

  const catCounts = new Map<string, { code: string; nameBn: string; count: number }>();

  let activeOrEffectiveCount = 0;
  let pendingApprovalCount = 0;
  let pendingOrPartialSignatureCount = 0;
  let fullySignedCount = 0;
  let completedCount = 0;
  let expiredCount = 0;
  let terminatedOrCancelledCount = 0;
  let archivedCount = 0;
  let waqfLandTotalCount = 0;
  let waqfLandPendingLegalReviewCount = 0;
  let totalSignaturesRecorded = 0;
  let totalAmendmentsCount = 0;

  const expiringWithin30Days: AgreementArchiveReport['expiringWithin30Days'] = [];
  const archivedItems: AgreementRecord[] = [];

  for (const ag of agreements) {
    const normalizedStatus: AgreementStatus = ag.status === 'ACTIVE' ? 'EFFECTIVE' : ag.status;
    statusCounts.set(normalizedStatus, (statusCounts.get(normalizedStatus) || 0) + 1);

    const existingCat = catCounts.get(ag.categoryCode);
    if (existingCat) {
      existingCat.count += 1;
    } else {
      catCounts.set(ag.categoryCode, {
        code: ag.categoryCode,
        nameBn: ag.categoryNameBn || ag.categoryCode,
        count: 1,
      });
    }

    if (normalizedStatus === 'EFFECTIVE') activeOrEffectiveCount += 1;
    if (normalizedStatus === 'PENDING_APPROVAL' || normalizedStatus === 'UNDER_REVIEW') {
      pendingApprovalCount += 1;
    }
    if (normalizedStatus === 'PENDING_SIGNATURE' || normalizedStatus === 'PARTIALLY_SIGNED') {
      pendingOrPartialSignatureCount += 1;
    }
    if (normalizedStatus === 'FULLY_SIGNED') fullySignedCount += 1;
    if (normalizedStatus === 'COMPLETED') completedCount += 1;
    if (normalizedStatus === 'EXPIRED') expiredCount += 1;
    if (normalizedStatus === 'TERMINATED' || normalizedStatus === 'CANCELLED') {
      terminatedOrCancelledCount += 1;
    }

    if (ag.isArchived) {
      archivedCount += 1;
      archivedItems.push(ag);
    }

    if (requiresWaqfLegalReview(ag)) {
      waqfLandTotalCount += 1;
      if (!isWaqfLegalReviewCleared(ag)) {
        waqfLandPendingLegalReviewCount += 1;
      }
    }

    totalSignaturesRecorded += (ag.signatures || []).length;
    if (ag.isAmendment || (ag.versionHistory || []).some((v) => v.isAmendment)) {
      totalAmendmentsCount += 1;
    }

    if (
      ag.expiryDate &&
      normalizedStatus !== 'COMPLETED' &&
      normalizedStatus !== 'CANCELLED' &&
      normalizedStatus !== 'TERMINATED' &&
      normalizedStatus !== 'EXPIRED'
    ) {
      const expTime = new Date(ag.expiryDate).getTime();
      if (!Number.isNaN(expTime)) {
        const diffDays = Math.ceil((expTime - todayStart) / msPerDay);
        if (diffDays >= 0 && diffDays <= 30) {
          expiringWithin30Days.push({
            id: ag.id,
            agreementNumber: ag.agreementNumber,
            title: ag.title,
            status: normalizedStatus,
            expiryDate: ag.expiryDate,
            daysRemaining: diffDays,
          });
        }
      }
    }
  }

  expiringWithin30Days.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    generatedAt: now.toISOString(),
    totalAgreements: agreements.length,
    activeOrEffectiveCount,
    pendingApprovalCount,
    pendingOrPartialSignatureCount,
    fullySignedCount,
    completedCount,
    expiredCount,
    terminatedOrCancelledCount,
    archivedCount,
    waqfLandTotalCount,
    waqfLandPendingLegalReviewCount,
    totalSignaturesRecorded,
    totalAmendmentsCount,
    expiringWithin30Days,
    byStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    byCategory: Array.from(catCounts.values()).sort((a, b) => b.count - a.count),
    archivedItems: archivedItems.sort(
      (a, b) => new Date(b.archivedAt || b.updatedAt).getTime() - new Date(a.archivedAt || a.updatedAt).getTime()
    ),
  };
}

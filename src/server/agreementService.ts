import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.ts';
import { User, Mosque, Permission } from '../types/index.ts';
import {
  AgreementApprovalDecision,
  AgreementApprovalRecord,
  AgreementAttachmentRef,
  AgreementCategoryDef,
  AgreementClosureInfo,
  AgreementConstructionDetails,
  AgreementDashboardStats,
  AgreementLandWaqfDetails,
  AgreementParty,
  AgreementPartyDirectoryItem,
  AgreementPartyType,
  AgreementPaymentScheduleItem,
  AgreementRecord,
  AgreementRepresentative,
  AgreementReviewDecision,
  AgreementReviewRecord,
  AgreementReviewStage,
  AgreementSignatureAuditEvent,
  AgreementSignatureMethod,
  AgreementSignatureRecord,
  AgreementStatus,
  AgreementTemplateDef,
  AgreementWitness,
  AgreementWitnessSignatureRecord,
  AgreementWrittenFinancialTerms,
  WrittenPaymentMode,
} from '../types/agreementTypes.ts';
import {
  AGREEMENT_SIGNATURE_LIMITATION_BN,
  AGREEMENT_STATUS_ORDER,
  BUILT_IN_AGREEMENT_CATEGORIES,
  BUILT_IN_AGREEMENT_TEMPLATES,
  getOrdinalPartyRoleBn,
  isAgreementLockedForDirectEdit,
  isConstructionCategoryCode,
  isWaqfOrLandCategoryCode,
} from '../lib/agreementCatalog.ts';
import {
  assistAgreementClauseWithAi,
  checkAgreementAiRateLimit,
  extractAgreementDocumentOcrWithAi,
  generateAgreementDraftWithAi,
  reviewAgreementRisksWithAi,
} from './agreementAiService.ts';
import {
  resolveTenantParty,
  syncAgreementReferencesToParties,
} from './partyService.ts';
import {
  buildAgreementArchiveReport,
  buildAgreementVersionSnapshot,
  canHardDeleteAgreement,
  computeAgreementDocumentHash,
  getSignatureProgressForCurrentVersion,
  hasAgreementPermission,
  issueSignatureOtpChallenge,
  isWaqfLegalReviewCleared,
  requiresWaqfLegalReview,
  sanitizeSignatureImageDataUrl,
  verifySignatureOtpChallenge,
} from './agreementWorkflowHelper.ts';
import { GeminiServiceError } from './geminiService.ts';
import { logSecurityAuditEvent, getClientIp } from './security/securityMiddleware.ts';

export interface AgreementAuthRequest extends Request {
  user?: User;
  currentMosque?: Mosque;
}

const VALID_STATUSES = new Set<AgreementStatus>([...AGREEMENT_STATUS_ORDER, 'ACTIVE']);
const VALID_PARTY_TYPES = new Set<AgreementPartyType>([
  'MOSQUE_COMMITTEE',
  'INDIVIDUAL',
  'CONTRACTOR_FIRM',
  'ORGANIZATION',
  'WAQF_TRUST',
  'LOCAL_COMMUNITY',
  'OTHER',
]);
const VALID_PAYMENT_MODES = new Set<WrittenPaymentMode>(['NON_FINANCIAL', 'LUMP_SUM', 'INSTALLMENT']);
const VALID_FORM_PROFILES = new Set(['STANDARD', 'CONSTRUCTION', 'LAND_WAQF', 'ROAD_RIGHT']);

// Granular Backend RBAC Wrappers (delegating to agreementWorkflowHelper)
function canViewAgreements(user: User): boolean {
  return hasAgreementPermission(user, 'agreement.view');
}

function canCreateOrEditAgreements(user: User, mode: 'CREATE' | 'EDIT'): boolean {
  return hasAgreementPermission(user, mode === 'CREATE' ? 'agreement.create' : 'agreement.edit');
}

function canDeleteAgreements(user: User): boolean {
  return hasAgreementPermission(user, 'agreement.delete');
}

function canManageAgreementCatalog(user: User): boolean {
  return hasAgreementPermission(user, 'agreement.manage_templates');
}

// ==========================================
// Input Validation & Sanitization Helpers
// ==========================================
function cleanStr(val: unknown, maxLen: number = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function cleanOptionalStr(val: unknown, maxLen: number = 500): string | undefined {
  const s = cleanStr(val, maxLen);
  return s ? s : undefined;
}

function cleanDateStr(val: unknown): string | undefined {
  const s = cleanStr(val, 30);
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return undefined;
}

function isSafeAttachmentUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/api/v1/') || trimmed.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function sanitizeRepresentatives(raw: unknown, mosqueId?: string): AgreementRepresentative[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 15)
    .map((item: any): AgreementRepresentative | null => {
      const name = cleanStr(item?.name, 160);
      if (!name) return null;
      const rawLinkedPartyId = cleanOptionalStr(item?.linkedPartyId, 80);
      const resolvedParty = rawLinkedPartyId && mosqueId ? resolveTenantParty(mosqueId, rawLinkedPartyId) : null;
      return {
        id: cleanStr(item?.id, 80) || `rep-${crypto.randomUUID().slice(0, 8)}`,
        name,
        designation: cleanStr(item?.designation, 120) || 'প্রতিনিধি',
        phone: cleanOptionalStr(item?.phone, 35),
        nid: cleanOptionalStr(item?.nid, 40),
        authorityBasis: cleanStr(item?.authorityBasis, 300),
        isSignatory: Boolean(item?.isSignatory ?? true),
        linkedPartyId: resolvedParty ? resolvedParty.partyId : undefined,
        linkedPartyCode: resolvedParty ? resolvedParty.partyCode : undefined,
      };
    })
    .filter((x): x is AgreementRepresentative => x !== null);
}

function sanitizeParties(raw: unknown, mosqueId?: string): AgreementParty[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 12)
    .map((item: any, idx: number): AgreementParty | null => {
      const name = cleanStr(item?.name, 200);
      if (!name) return null;
      const roleOrder = idx + 1;
      const rawType = cleanStr(item?.partyType, 40) as AgreementPartyType;
      const rawLinkedPartyId = cleanOptionalStr(item?.linkedPartyId, 80);
      const resolvedParty = rawLinkedPartyId && mosqueId ? resolveTenantParty(mosqueId, rawLinkedPartyId) : null;
      return {
        id: cleanStr(item?.id, 80) || `party-${crypto.randomUUID().slice(0, 8)}`,
        roleLabel: cleanStr(item?.roleLabel, 80) || getOrdinalPartyRoleBn(roleOrder),
        roleOrder,
        partyType: VALID_PARTY_TYPES.has(rawType) ? rawType : 'INDIVIDUAL',
        name,
        fatherOrOrgHead: cleanOptionalStr(item?.fatherOrOrgHead, 160),
        address: cleanOptionalStr(item?.address, 400),
        phone: cleanOptionalStr(item?.phone, 35),
        nidOrRegNo: cleanOptionalStr(item?.nidOrRegNo, 60),
        linkedPartyId: resolvedParty ? resolvedParty.partyId : undefined,
        linkedPartyCode: resolvedParty ? resolvedParty.partyCode : undefined,
        representatives: sanitizeRepresentatives(item?.representatives, mosqueId),
      };
    })
    .filter((x): x is AgreementParty => x !== null);
}

function sanitizeWitnesses(raw: unknown): AgreementWitness[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 12)
    .map((item: any): AgreementWitness | null => {
      if (!item || typeof item !== 'object') return null;
      return {
        id: cleanStr(item?.id, 80) || `wit-${crypto.randomUUID().slice(0, 8)}`,
        name: cleanStr(item?.name, 160),
        fatherName: cleanOptionalStr(item?.fatherName, 160),
        address: cleanOptionalStr(item?.address, 300),
        phone: cleanOptionalStr(item?.phone, 35),
        nid: cleanOptionalStr(item?.nid, 40),
        partySide: cleanOptionalStr(item?.partySide, 80),
      };
    })
    .filter((x): x is AgreementWitness => x !== null);
}

function sanitizeConstructionDetails(raw: unknown): AgreementConstructionDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const cleaned: AgreementConstructionDetails = {
    workSummary: cleanOptionalStr(r.workSummary, 1000),
    length: cleanOptionalStr(r.length, 60),
    width: cleanOptionalStr(r.width, 60),
    height: cleanOptionalStr(r.height, 60),
    dimensionUnit: cleanOptionalStr(r.dimensionUnit, 40),
    quantity: cleanOptionalStr(r.quantity, 80),
    quantityUnit: cleanOptionalStr(r.quantityUnit, 40),
    unitRate: cleanOptionalStr(r.unitRate, 100),
    totalContractValueText: cleanOptionalStr(r.totalContractValueText, 160),
    materialsResponsibility: cleanOptionalStr(r.materialsResponsibility, 1000),
    laborResponsibility: cleanOptionalStr(r.laborResponsibility, 1000),
    timelineDuration: cleanOptionalStr(r.timelineDuration, 160),
    completionDeadline: cleanDateStr(r.completionDeadline),
    qualityInspectionTerms: cleanOptionalStr(r.qualityInspectionTerms, 1500),
    handoverTerms: cleanOptionalStr(r.handoverTerms, 1500),
  };
  const hasAnyValue = Object.values(cleaned).some((v) => v !== undefined && v !== '');
  return hasAnyValue ? cleaned : undefined;
}

function sanitizeLandWaqfDetails(raw: unknown): AgreementLandWaqfDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const cleaned: AgreementLandWaqfDetails = {
    mouza: cleanOptionalStr(r.mouza, 160),
    jlNumber: cleanOptionalStr(r.jlNumber, 80),
    khatianNumber: cleanOptionalStr(r.khatianNumber, 120),
    dagNumber: cleanOptionalStr(r.dagNumber, 120),
    landArea: cleanOptionalStr(r.landArea, 80),
    landAreaUnit: cleanOptionalStr(r.landAreaUnit, 40),
    proposedPortionDesc: cleanOptionalStr(r.proposedPortionDesc, 1000),
    roadLength: cleanOptionalStr(r.roadLength, 60),
    roadWidth: cleanOptionalStr(r.roadWidth, 60),
    roadUnit: cleanOptionalStr(r.roadUnit, 40),
    partyContributions: cleanOptionalStr(r.partyContributions, 1500),
    waqfLegalReviewRequired: Boolean(r.waqfLegalReviewRequired),
    waqfLegalCautionAcknowledged: Boolean(r.waqfLegalCautionAcknowledged),
    waqfLegalReviewNote: cleanOptionalStr(r.waqfLegalReviewNote, 1500),
  };
  const hasAnyValue = Object.entries(cleaned).some(([k, v]) => {
    if (k === 'waqfLegalReviewRequired' || k === 'waqfLegalCautionAcknowledged') return Boolean(v);
    return v !== undefined && v !== '';
  });
  return hasAnyValue ? cleaned : undefined;
}

function sanitizeWrittenFinancialTerms(raw: unknown): AgreementWrittenFinancialTerms {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawMode = cleanStr(r.mode, 30) as WrittenPaymentMode;
  const mode: WrittenPaymentMode = VALID_PAYMENT_MODES.has(rawMode) ? rawMode : 'NON_FINANCIAL';

  const schedules: AgreementPaymentScheduleItem[] = Array.isArray(r.schedules)
    ? r.schedules
        .slice(0, 36)
        .map((item: any, idx: number): AgreementPaymentScheduleItem | null => {
          const stageTitle = cleanStr(item?.stageTitle, 160);
          const condition = cleanStr(item?.condition, 400);
          const timingOrMilestone = cleanStr(item?.timingOrMilestone, 200);
          const writtenAmount = cleanStr(item?.writtenAmount, 120);
          if (!stageTitle && !condition && !writtenAmount) return null;
          return {
            id: cleanStr(item?.id, 80) || `pay-${crypto.randomUUID().slice(0, 8)}`,
            stageTitle: stageTitle || `ধাপ / কিস্তি ${idx + 1}`,
            condition,
            timingOrMilestone,
            writtenAmount,
            notes: cleanOptionalStr(item?.notes, 300),
          };
        })
        .filter((x): x is AgreementPaymentScheduleItem => x !== null)
    : [];

  return {
    mode,
    totalWrittenAmount: mode === 'NON_FINANCIAL' ? undefined : cleanOptionalStr(r.totalWrittenAmount, 160),
    paymentTermsNote: cleanOptionalStr(r.paymentTermsNote, 1500),
    schedules: mode === 'NON_FINANCIAL' ? [] : schedules,
  };
}

function sanitizeAttachments(raw: unknown): AgreementAttachmentRef[] {
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();
  return raw
    .slice(0, 20)
    .map((item: any): AgreementAttachmentRef | null => {
      const title = cleanStr(item?.title, 200);
      if (!title) return null;
      const rawUrl = cleanStr(item?.url, 500);
      const safeUrl = rawUrl && isSafeAttachmentUrl(rawUrl) ? rawUrl : undefined;
      return {
        id: cleanStr(item?.id, 80) || `att-${crypto.randomUUID().slice(0, 8)}`,
        title,
        docType: cleanOptionalStr(item?.docType, 80),
        referenceNo: cleanOptionalStr(item?.referenceNo, 100),
        url: safeUrl,
        notes: cleanOptionalStr(item?.notes, 400),
        addedAt: cleanStr(item?.addedAt, 40) || now,
      };
    })
    .filter((x): x is AgreementAttachmentRef => x !== null);
}

// ==========================================
// Tenant Scoped Helpers
// ==========================================
function getMergedCategoriesForMosque(mosqueId: string): AgreementCategoryDef[] {
  const custom = (db.agreementCategories || []).filter((c) => c.mosqueId === mosqueId);
  return [...BUILT_IN_AGREEMENT_CATEGORIES, ...custom].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getMergedTemplatesForMosque(mosqueId: string): AgreementTemplateDef[] {
  const custom = (db.agreementTemplates || []).filter((t) => t.mosqueId === mosqueId);
  return [...custom, ...BUILT_IN_AGREEMENT_TEMPLATES];
}

function generateAgreementNumber(mosqueId: string, agreementDate?: string): string {
  const year = agreementDate && /^\d{4}/.test(agreementDate) ? agreementDate.slice(0, 4) : String(new Date().getFullYear());
  const prefix = `AGR-${year}-`;
  const existing = (db.agreements || []).filter(
    (a) => a.mosqueId === mosqueId && typeof a.agreementNumber === 'string' && a.agreementNumber.startsWith(prefix)
  );
  let maxSeq = 0;
  for (const ag of existing) {
    const numPart = Number.parseInt(ag.agreementNumber.slice(prefix.length), 10);
    if (!Number.isNaN(numPart) && numPart > maxSeq) {
      maxSeq = numPart;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function denyPermission(req: AgreementAuthRequest, res: Response, actionLabel: string) {
  logSecurityAuditEvent({
    mosqueId: req.currentMosque?.id,
    userId: req.user?.id,
    userName: req.user?.name,
    userRole: req.user?.role,
    action: 'PERMISSION_DENIED',
    details: `চুক্তিপত্র ব্যবস্থাপনায় অননুমোদিত অনুরোধ প্রত্যাখ্যাত (${actionLabel}: ${req.method} ${req.path})`,
    ipAddress: getClientIp(req),
    status: 'FAILED',
  });
  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'এই কার্যক্রমটি সম্পন্ন করার জন্য আপনার পর্যাপ্ত অনুমতি নেই।',
    },
  });
}

// ==========================================
// Express Router Factory
// ==========================================
export function createAgreementRouter(
  authenticate: (req: AgreementAuthRequest, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // 1. Dashboard Count-Only Stats (ZERO financial calculations)
  router.get('/agreements/dashboard/stats', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canViewAgreements(user)) {
      return denyPermission(req, res, 'VIEW_AGREEMENTS');
    }

    const categories = getMergedCategoriesForMosque(mosqueId);
    const templates = getMergedTemplatesForMosque(mosqueId);
    const list = (db.agreements || []).filter((a) => a.mosqueId === mosqueId);

    const byStatus: Record<AgreementStatus, number> = {
      DRAFT: 0,
      INFORMATION_PENDING: 0,
      AI_REVIEWED: 0,
      UNDER_REVIEW: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      PENDING_SIGNATURE: 0,
      PARTIALLY_SIGNED: 0,
      FULLY_SIGNED: 0,
      EFFECTIVE: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      EXPIRED: 0,
      TERMINATED: 0,
      CANCELLED: 0,
    };

    const catMap = new Map<string, { code: string; nameBn: string; count: number }>();
    for (const c of categories) {
      catMap.set(c.code, { code: c.code, nameBn: c.nameBn, count: 0 });
    }

    let waqfAndLandCount = 0;
    let waqfPendingReviewCount = 0;
    let constructionCount = 0;
    let archivedCount = 0;
    let fullySignedOrEffectiveCount = 0;
    const uniqueParties = new Set<string>();
    const reportPreview = buildAgreementArchiveReport(list);

    for (const ag of list) {
      const normalizedStatus: AgreementStatus = ag.status === 'ACTIVE' ? 'EFFECTIVE' : ag.status;
      if (VALID_STATUSES.has(normalizedStatus)) {
        byStatus[normalizedStatus] = (byStatus[normalizedStatus] || 0) + 1;
      }
      if (normalizedStatus === 'FULLY_SIGNED' || normalizedStatus === 'EFFECTIVE') {
        fullySignedOrEffectiveCount += 1;
      }
      if (ag.isArchived) archivedCount += 1;
      if (ag.isWaqfOrLandRelated || isWaqfOrLandCategoryCode(ag.categoryCode, categories)) {
        waqfAndLandCount += 1;
        if (!isWaqfLegalReviewCleared(ag)) waqfPendingReviewCount += 1;
      }
      if (isConstructionCategoryCode(ag.categoryCode, categories)) {
        constructionCount += 1;
      }
      const existingCat = catMap.get(ag.categoryCode);
      if (existingCat) {
        existingCat.count += 1;
      } else {
        catMap.set(ag.categoryCode, {
          code: ag.categoryCode,
          nameBn: ag.categoryNameBn || ag.categoryCode,
          count: 1,
        });
      }
      for (const p of ag.parties || []) {
        const key = `${p.name.trim().toLowerCase()}|${(p.phone || '').trim()}`;
        if (p.name.trim()) uniqueParties.add(key);
      }
    }

    const recentAgreements = [...list]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 8);

    const stats: AgreementDashboardStats = {
      total: list.length,
      byStatus,
      waqfAndLandCount,
      waqfPendingReviewCount,
      constructionCount,
      partiesCount: uniqueParties.size,
      templatesCount: templates.length,
      categoriesCount: categories.length,
      archivedCount,
      expiringSoonCount: reportPreview.expiringWithin30Days.length,
      fullySignedOrEffectiveCount,
      byCategory: Array.from(catMap.values()),
      recentAgreements,
    };

    return res.json({ success: true, data: stats });
  });

  // 1.5 Archive & Governance Count-Only Report (ZERO financials)
  router.get('/agreements/reports/archive', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.view_reports')) {
      return denyPermission(req, res, 'agreement.view_reports');
    }
    const list = (db.agreements || []).filter((a) => a.mosqueId === mosqueId);
    const report = buildAgreementArchiveReport(list);
    return res.json({ success: true, data: report });
  });

  // 2. Categories List & Create Custom Category
  router.get('/agreements/categories/list', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canViewAgreements(user)) {
      return denyPermission(req, res, 'VIEW_AGREEMENTS');
    }
    return res.json({ success: true, data: getMergedCategoriesForMosque(mosqueId) });
  });

  router.post('/agreements/categories', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canManageAgreementCatalog(user)) {
      return denyPermission(req, res, 'MANAGE_AGREEMENT_TEMPLATES');
    }

    const nameBn = cleanStr(req.body?.nameBn, 120);
    const nameEn = cleanStr(req.body?.nameEn, 120) || nameBn;
    const descriptionBn = cleanStr(req.body?.descriptionBn, 400);
    const rawProfile = cleanStr(req.body?.formProfile, 30);
    const formProfile = VALID_FORM_PROFILES.has(rawProfile)
      ? (rawProfile as AgreementCategoryDef['formProfile'])
      : 'STANDARD';

    if (!nameBn) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ক্যাটাগরির বাংলা নাম প্রদান করা আবশ্যক।' },
      });
    }

    const existingAll = getMergedCategoriesForMosque(mosqueId);
    if (existingAll.some((c) => c.nameBn.trim().toLowerCase() === nameBn.toLowerCase())) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CATEGORY', message: 'এই নামে একটি চুক্তির ক্যাটাগরি ইতিমধ্যে রয়েছে।' },
      });
    }

    const slugBase = nameEn
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 24);
    const code = `CUSTOM_${slugBase || 'CAT'}_${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

    const newCategory: AgreementCategoryDef = {
      id: `agr-cat-${crypto.randomUUID().slice(0, 10)}`,
      code,
      mosqueId,
      nameBn,
      nameEn,
      descriptionBn: descriptionBn || 'মসজিদের নিজস্ব কাস্টম চুক্তি ক্যাটাগরি',
      formProfile,
      isSystem: false,
      sortOrder: existingAll.length + 1,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    if (!db.agreementCategories) db.agreementCategories = [];
    db.agreementCategories.push(newCategory);
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'CREATE_AGREEMENT_CATEGORY',
      'AgreementCategory',
      newCategory.id,
      `নতুন কাস্টম চুক্তি ক্যাটাগরি যুক্ত করা হয়েছে: ${newCategory.nameBn}`
    );
    db.save();

    return res.status(201).json({ success: true, data: newCategory });
  });

  // 3. Hybrid Templates Library (List, Create, Edit, Publish/Unpublish, Delete Custom Template)
  router.get('/agreements/templates/list', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canViewAgreements(user)) {
      return denyPermission(req, res, 'VIEW_AGREEMENTS');
    }
    const isManager = canManageAgreementCatalog(user);
    const merged = getMergedTemplatesForMosque(mosqueId).map((t) => ({
      ...t,
      publishStatus: t.isSystem ? 'PUBLISHED' : t.publishStatus || 'PUBLISHED',
    }));
    const visible = isManager ? merged : merged.filter((t) => t.isSystem || t.publishStatus === 'PUBLISHED');
    return res.json({ success: true, data: visible });
  });

  router.post('/agreements/templates', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canManageAgreementCatalog(user)) {
      return denyPermission(req, res, 'MANAGE_AGREEMENT_TEMPLATES');
    }

    const titleBn = cleanStr(req.body?.titleBn, 200);
    const categoryCode = cleanStr(req.body?.categoryCode, 60) || 'OTHER_CUSTOM';
    const descriptionBn = cleanStr(req.body?.descriptionBn, 500);
    const defaultGeneralClauses = cleanStr(req.body?.defaultGeneralClauses, 12000);

    if (!titleBn || !defaultGeneralClauses) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'টেমপ্লেটের শিরোনাম ও সাধারণ শর্তাবলি প্রদান করা আবশ্যক।',
        },
      });
    }

    const rawPayMode = cleanStr(req.body?.defaultWrittenFinancialMode, 30) as WrittenPaymentMode;
    const rawPublish = cleanStr(req.body?.publishStatus, 20) === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
    const now = new Date().toISOString();
    const newTemplate: AgreementTemplateDef = {
      id: `agr-tpl-${crypto.randomUUID().slice(0, 10)}`,
      mosqueId,
      titleBn,
      categoryCode,
      descriptionBn: descriptionBn || 'মসজিদের নিজস্ব কাস্টম চুক্তি টেমপ্লেট',
      defaultPurpose: cleanOptionalStr(req.body?.defaultPurpose, 1000),
      defaultGeneralClauses,
      defaultSpecialClauses: cleanOptionalStr(req.body?.defaultSpecialClauses, 6000),
      defaultTerminationClause: cleanOptionalStr(req.body?.defaultTerminationClause, 3000),
      defaultDisputeResolutionClause: cleanOptionalStr(req.body?.defaultDisputeResolutionClause, 3000),
      defaultWrittenFinancialMode: VALID_PAYMENT_MODES.has(rawPayMode) ? rawPayMode : 'NON_FINANCIAL',
      isSystem: false,
      publishStatus: rawPublish,
      createdAt: now,
      createdBy: user.id,
      updatedAt: now,
      updatedBy: user.id,
      publishedAt: rawPublish === 'PUBLISHED' ? now : undefined,
      publishedBy: rawPublish === 'PUBLISHED' ? user.id : undefined,
    };

    if (!db.agreementTemplates) db.agreementTemplates = [];
    db.agreementTemplates.unshift(newTemplate);
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'CREATE_AGREEMENT_TEMPLATE',
      'AgreementTemplate',
      newTemplate.id,
      `নতুন কাস্টম চুক্তি টেমপ্লেট যুক্ত করা হয়েছে (${rawPublish}): ${newTemplate.titleBn}`
    );
    db.save();

    return res.status(201).json({ success: true, data: newTemplate });
  });

  router.put('/agreements/templates/:id', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canManageAgreementCatalog(user)) {
      return denyPermission(req, res, 'MANAGE_AGREEMENT_TEMPLATES');
    }

    const idx = (db.agreementTemplates || []).findIndex(
      (t) => t.id === req.params.id && t.mosqueId === mosqueId && !t.isSystem
    );
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'সম্পাদনার জন্য কাস্টম টেমপ্লেট পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreementTemplates[idx];
    const titleBn = cleanStr(req.body?.titleBn, 200);
    const defaultGeneralClauses = cleanStr(req.body?.defaultGeneralClauses, 12000);
    if (!titleBn || !defaultGeneralClauses) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'টেমপ্লেটের শিরোনাম ও সাধারণ শর্তাবলি আবশ্যক।' },
      });
    }

    const rawPayMode = cleanStr(req.body?.defaultWrittenFinancialMode, 30) as WrittenPaymentMode;
    const rawPublish =
      req.body?.publishStatus === 'DRAFT' || req.body?.publishStatus === 'PUBLISHED'
        ? req.body.publishStatus
        : existing.publishStatus || 'PUBLISHED';
    const now = new Date().toISOString();

    const updated: AgreementTemplateDef = {
      ...existing,
      titleBn,
      categoryCode: cleanStr(req.body?.categoryCode, 60) || existing.categoryCode,
      descriptionBn: cleanStr(req.body?.descriptionBn, 500) || existing.descriptionBn,
      defaultPurpose: cleanOptionalStr(req.body?.defaultPurpose, 1000),
      defaultGeneralClauses,
      defaultSpecialClauses: cleanOptionalStr(req.body?.defaultSpecialClauses, 6000),
      defaultTerminationClause: cleanOptionalStr(req.body?.defaultTerminationClause, 3000),
      defaultDisputeResolutionClause: cleanOptionalStr(req.body?.defaultDisputeResolutionClause, 3000),
      defaultWrittenFinancialMode: VALID_PAYMENT_MODES.has(rawPayMode)
        ? rawPayMode
        : existing.defaultWrittenFinancialMode || 'NON_FINANCIAL',
      publishStatus: rawPublish,
      updatedAt: now,
      updatedBy: user.id,
      publishedAt: rawPublish === 'PUBLISHED' ? existing.publishedAt || now : undefined,
      publishedBy: rawPublish === 'PUBLISHED' ? existing.publishedBy || user.id : undefined,
    };

    db.agreementTemplates[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'UPDATE_AGREEMENT_TEMPLATE',
      'AgreementTemplate',
      updated.id,
      `কাস্টম চুক্তি টেমপ্লেট হালনাগাদ করা হয়েছে: ${updated.titleBn}`
    );
    db.save();

    return res.json({ success: true, data: updated });
  });

  router.patch('/agreements/templates/:id/publish', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canManageAgreementCatalog(user)) {
      return denyPermission(req, res, 'MANAGE_AGREEMENT_TEMPLATES');
    }

    const idx = (db.agreementTemplates || []).findIndex(
      (t) => t.id === req.params.id && t.mosqueId === mosqueId && !t.isSystem
    );
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'কাস্টম টেমপ্লেট পাওয়া যায়নি।' },
      });
    }

    const nextStatus = req.body?.publishStatus === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
    const now = new Date().toISOString();
    db.agreementTemplates[idx] = {
      ...db.agreementTemplates[idx],
      publishStatus: nextStatus,
      updatedAt: now,
      updatedBy: user.id,
      publishedAt: nextStatus === 'PUBLISHED' ? now : undefined,
      publishedBy: nextStatus === 'PUBLISHED' ? user.id : undefined,
    };

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'PUBLISH_AGREEMENT_TEMPLATE',
      'AgreementTemplate',
      db.agreementTemplates[idx].id,
      `চুক্তি টেমপ্লেট (${db.agreementTemplates[idx].titleBn}) অবস্থা: ${nextStatus}`
    );
    db.save();

    return res.json({ success: true, data: db.agreementTemplates[idx] });
  });

  router.delete('/agreements/templates/:id', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canManageAgreementCatalog(user)) {
      return denyPermission(req, res, 'MANAGE_AGREEMENT_TEMPLATES');
    }

    const idx = (db.agreementTemplates || []).findIndex(
      (t) => t.id === req.params.id && t.mosqueId === mosqueId && !t.isSystem
    );
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'কাস্টম টেমপ্লেট পাওয়া যায়নি অথবা এটি সিস্টেম টেমপ্লেট।' },
      });
    }

    const removed = db.agreementTemplates.splice(idx, 1)[0];
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'DELETE_AGREEMENT_TEMPLATE',
      'AgreementTemplate',
      removed.id,
      `কাস্টম চুক্তি টেমপ্লেট মুছে ফেলা হয়েছে: ${removed.titleBn}`
    );
    db.save();

    return res.json({ success: true, data: { deletedId: removed.id } });
  });

  // 3.5 AI Agreement Assistant, AI Clause Assistant, AI Risk Review & Zero-Storage OCR (Central AI Config)
  const handleAiError = (res: Response, err: any) => {
    const status = err instanceof GeminiServiceError ? err.statusCode : 500;
    const code = err instanceof GeminiServiceError ? err.code : 'AGREEMENT_AI_ERROR';
    const message = err?.message || 'AI সহায়তা প্রক্রিয়াকরণে ত্রুটি ঘটেছে।';
    return res.status(status).json({ success: false, error: { code, message } });
  };

  router.post('/agreements/ai/draft', authenticate, async (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.use_ai') || !hasAgreementPermission(user, 'agreement.create')) {
      return denyPermission(req, res, 'agreement.use_ai');
    }
    const rl = checkAgreementAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর পুনরায় AI অনুরোধ করুন।`,
        },
      });
    }

    try {
      const categories = getMergedCategoriesForMosque(mosqueId);
      const result = await generateAgreementDraftWithAi(req.currentMosque || null, categories, {
        instructionBn: cleanStr(req.body?.instructionBn, 4000),
        preferredCategoryCode: cleanOptionalStr(req.body?.preferredCategoryCode, 60),
        existingContext: cleanOptionalStr(req.body?.existingContext, 1500),
      });
      db.logAudit(
        mosqueId,
        user.id,
        user.name,
        'AI_DRAFT_AGREEMENT',
        'Agreement',
        'DRAFT_PREVIEW',
        `AI চুক্তিপত্র খসড়া তৈরি (${result.detectedCategoryNameBn}, মডেল: ${result.modelUsed})`
      );
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return handleAiError(res, err);
    }
  });

  router.post('/agreements/ai/clause-assist', authenticate, async (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.use_ai') || !hasAgreementPermission(user, 'agreement.edit')) {
      return denyPermission(req, res, 'agreement.use_ai');
    }
    const rl = checkAgreementAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর পুনরায় AI অনুরোধ করুন।`,
        },
      });
    }

    const validActions = new Set([
      'ADD_CLAUSE',
      'CLARIFY_TERMS',
      'FORMAL_BANGLA',
      'SIMPLE_BANGLA',
      'SEPARATE_RESPONSIBILITIES',
      'IDENTIFY_WEAKNESSES',
    ]);
    const action = cleanStr(req.body?.action, 40);
    if (!validActions.has(action)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'অবৈধ ধারা সহায়তা অ্যাকশন নির্বাচন করা হয়েছে।' },
      });
    }

    try {
      const result = await assistAgreementClauseWithAi({
        action: action as any,
        currentClauses: cleanStr(req.body?.currentClauses, 20000),
        categoryNameBn: cleanOptionalStr(req.body?.categoryNameBn, 120),
        agreementTitle: cleanOptionalStr(req.body?.agreementTitle, 240),
        userInstruction: cleanOptionalStr(req.body?.userInstruction, 1500),
      });
      db.logAudit(
        mosqueId,
        user.id,
        user.name,
        'AI_CLAUSE_ASSIST',
        'Agreement',
        'CLAUSE_ASSIST',
        `AI ধারা সহায়তা (${action}, মডেল: ${result.modelUsed})`
      );
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return handleAiError(res, err);
    }
  });

  router.post('/agreements/ai/review', authenticate, async (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.review') && !hasAgreementPermission(user, 'agreement.use_ai')) {
      return denyPermission(req, res, 'agreement.review');
    }
    const rl = checkAgreementAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর পুনরায় AI অনুরোধ করুন।`,
        },
      });
    }

    try {
      const categories = getMergedCategoriesForMosque(mosqueId);
      let targetPayload: Partial<AgreementRecord> | undefined = req.body?.agreement;
      const agreementId = cleanOptionalStr(req.body?.agreementId, 80);

      if (agreementId) {
        const storedIdx = (db.agreements || []).findIndex((a) => a.id === agreementId && a.mosqueId === mosqueId);
        if (storedIdx === -1) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'পর্যালোচনার জন্য চুক্তিপত্রটি পাওয়া যায়নি।' },
          });
        }
        targetPayload = db.agreements[storedIdx];
      }

      if (!targetPayload || typeof targetPayload !== 'object') {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'পর্যালোচনার জন্য চুক্তির তথ্য প্রদান করুন।' },
        });
      }

      const result = await reviewAgreementRisksWithAi(targetPayload, categories);
      // Automatically mark DRAFT / INFORMATION_PENDING saved agreements as AI_REVIEWED when reviewed
      if (agreementId) {
        const storedIdx = (db.agreements || []).findIndex((a) => a.id === agreementId && a.mosqueId === mosqueId);
        if (storedIdx !== -1 && (db.agreements[storedIdx].status === 'DRAFT' || db.agreements[storedIdx].status === 'INFORMATION_PENDING')) {
          db.agreements[storedIdx] = {
            ...db.agreements[storedIdx],
            status: 'AI_REVIEWED',
            updatedAt: new Date().toISOString(),
            updatedBy: user.id,
            updatedByName: user.name,
          };
          db.save();
        }
      }
      db.logAudit(
        mosqueId,
        user.id,
        user.name,
        'AI_REVIEW_AGREEMENT',
        'Agreement',
        agreementId || 'DRAFT_REVIEW',
        `AI চুক্তি ও ঝুঁকি পর্যালোচনা সম্পন্ন (ঝুঁকির মাত্রা: ${result.overallRiskLevel}, আইনি পর্যালোচনা: ${result.legalReviewRequired ? 'আবশ্যক' : 'ঐচ্ছিক'})`
      );
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return handleAiError(res, err);
    }
  });

  router.post('/agreements/ocr/extract', authenticate, async (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    // Sensitive documents (NID, Passport, Land Deed) require upload_documents & use_ai permission
    if (!hasAgreementPermission(user, 'agreement.upload_documents') || !hasAgreementPermission(user, 'agreement.use_ai')) {
      return denyPermission(req, res, 'agreement.upload_documents');
    }
    const rl = checkAgreementAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর পুনরায় OCR স্ক্যান করুন।`,
        },
      });
    }

    const validDocTypes = new Set([
      'NID',
      'PASSPORT',
      'TRADE_LICENSE',
      'LAND_DEED_KHATIAN',
      'PREVIOUS_AGREEMENT',
      'COMMITTEE_RESOLUTION',
      'OTHER',
    ]);
    const rawDocType = cleanStr(req.body?.docType, 40) || 'OTHER';
    const docType = validDocTypes.has(rawDocType) ? rawDocType : 'OTHER';

    try {
      const result = await extractAgreementDocumentOcrWithAi({
        docType: docType as any,
        mimeType: cleanStr(req.body?.mimeType, 80),
        imageBase64: typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '',
        userHint: cleanOptionalStr(req.body?.userHint, 300),
      });
      // Audit log metadata only — NEVER logs or persists sensitive NID/document image payload
      db.logAudit(
        mosqueId,
        user.id,
        user.name,
        'OCR_EXTRACT_AGREEMENT_DOC',
        'Agreement',
        'ZERO_STORAGE_OCR',
        `জিরো-স্টোরেজ OCR নথি শনাক্তকরণ (${docType}, মডেল: ${result.modelUsed}) — ছবি সার্ভারে সংরক্ষিত নয়`
      );
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return handleAiError(res, err);
    }
  });

  // 4. Parties & Representatives Directory (Tenant Scoped)
  router.get('/agreements/parties/directory', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canViewAgreements(user)) {
      return denyPermission(req, res, 'VIEW_AGREEMENTS');
    }

    const search = cleanStr(req.query.search, 120).toLowerCase();
    const agreements = (db.agreements || []).filter((a) => a.mosqueId === mosqueId);
    const map = new Map<string, AgreementPartyDirectoryItem>();

    for (const ag of agreements) {
      for (const party of ag.parties || []) {
        const cleanName = party.name.trim();
        if (!cleanName) continue;
        const key = `${cleanName.toLowerCase()}|${(party.phone || '').trim()}`;
        let entry = map.get(key);
        if (!entry) {
          entry = {
            partyKey: key,
            name: cleanName,
            partyType: party.partyType,
            phone: party.phone,
            address: party.address,
            nidOrRegNo: party.nidOrRegNo,
            rolesUsed: [],
            representatives: [],
            agreements: [],
          };
          map.set(key, entry);
        }
        if (party.roleLabel && !entry.rolesUsed.includes(party.roleLabel)) {
          entry.rolesUsed.push(party.roleLabel);
        }
        for (const rep of party.representatives || []) {
          const existsRep = entry.representatives.some(
            (r) => r.name.toLowerCase() === rep.name.toLowerCase() && r.designation.toLowerCase() === rep.designation.toLowerCase()
          );
          if (!existsRep) {
            entry.representatives.push(rep);
          }
        }
        entry.agreements.push({
          agreementId: ag.id,
          agreementNumber: ag.agreementNumber,
          title: ag.title,
          status: ag.status,
          agreementDate: ag.agreementDate,
          roleLabel: party.roleLabel,
        });
      }
    }

    let items = Array.from(map.values()).sort((a, b) => b.agreements.length - a.agreements.length);
    if (search) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          (item.phone || '').toLowerCase().includes(search) ||
          (item.address || '').toLowerCase().includes(search) ||
          item.representatives.some(
            (r) =>
              r.name.toLowerCase().includes(search) ||
              r.designation.toLowerCase().includes(search) ||
              (r.authorityBasis || '').toLowerCase().includes(search)
          )
      );
    }

    return res.json({ success: true, data: items });
  });

  // 5. List Agreements with Search, Filter & Sorting
  router.get('/agreements', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canViewAgreements(user)) {
      return denyPermission(req, res, 'VIEW_AGREEMENTS');
    }

    const search = cleanStr(req.query.search, 160).toLowerCase();
    const categoryCode = cleanStr(req.query.categoryCode, 60);
    const status = cleanStr(req.query.status, 40);
    const waqfLandOnly = String(req.query.waqfLandOnly || '').toLowerCase() === 'true';
    const archivedOnly = String(req.query.archivedOnly || '').toLowerCase() === 'true';
    const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
    const sortBy = cleanStr(req.query.sortBy, 40) || 'updatedAt';
    const sortDir = cleanStr(req.query.sortDir, 10).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const categories = getMergedCategoriesForMosque(mosqueId);
    let items = (db.agreements || []).filter((a) => a.mosqueId === mosqueId);

    if (archivedOnly) {
      items = items.filter((a) => Boolean(a.isArchived));
    } else if (!includeArchived) {
      items = items.filter((a) => !a.isArchived);
    }
    if (waqfLandOnly) {
      items = items.filter((a) => a.isWaqfOrLandRelated || isWaqfOrLandCategoryCode(a.categoryCode, categories));
    }
    if (categoryCode && categoryCode !== 'ALL') {
      items = items.filter((a) => a.categoryCode === categoryCode);
    }
    if (status && status !== 'ALL') {
      items = items.filter((a) => {
        if (status === 'EFFECTIVE') return a.status === 'EFFECTIVE' || a.status === 'ACTIVE';
        return a.status === status;
      });
    }
    if (search) {
      items = items.filter((a) => {
        const partyMatch = (a.parties || []).some(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            (p.phone || '').toLowerCase().includes(search) ||
            (p.representatives || []).some(
              (r) => r.name.toLowerCase().includes(search) || (r.authorityBasis || '').toLowerCase().includes(search)
            )
        );
        const landMatch =
          (a.landWaqfDetails?.mouza || '').toLowerCase().includes(search) ||
          (a.landWaqfDetails?.khatianNumber || '').toLowerCase().includes(search) ||
          (a.landWaqfDetails?.dagNumber || '').toLowerCase().includes(search);

        return (
          a.title.toLowerCase().includes(search) ||
          a.agreementNumber.toLowerCase().includes(search) ||
          a.categoryNameBn.toLowerCase().includes(search) ||
          (a.purpose || '').toLowerCase().includes(search) ||
          (a.executionPlace || '').toLowerCase().includes(search) ||
          partyMatch ||
          landMatch
        );
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'agreementDate':
          return (a.agreementDate || '').localeCompare(b.agreementDate || '') * dir;
        case 'agreementNumber':
          return (a.agreementNumber || '').localeCompare(b.agreementNumber || '') * dir;
        case 'title':
          return (a.title || '').localeCompare(b.title || '') * dir;
        case 'status':
          return (a.status || '').localeCompare(b.status || '') * dir;
        default:
          return (
            (new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime()) * dir
          );
      }
    });

    return res.json({ success: true, data: items });
  });

  // 6. Get Single Agreement (Tenant Scoped)
  router.get('/agreements/:id', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canViewAgreements(user)) {
      return denyPermission(req, res, 'VIEW_AGREEMENTS');
    }

    const item = (db.agreements || []).find((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }
    return res.json({ success: true, data: item });
  });

  // 7. Create Agreement
  router.post('/agreements', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canCreateOrEditAgreements(user, 'CREATE')) {
      return denyPermission(req, res, 'CREATE_AGREEMENT');
    }

    const title = cleanStr(req.body?.title, 250);
    const categoryCode = cleanStr(req.body?.categoryCode, 60) || 'OTHER_CUSTOM';
    const purpose = cleanStr(req.body?.purpose, 2000);
    const generalClauses = cleanStr(req.body?.generalClauses, 25000);
    const parties = sanitizeParties(req.body?.parties, mosqueId);

    if (!title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'চুক্তিপত্রের শিরোনাম প্রদান করা আবশ্যক।' },
      });
    }
    if (parties.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'একটি বৈধ চুক্তিপত্রের জন্য কমপক্ষে দুই পক্ষের নাম যুক্ত করা আবশ্যক।' },
      });
    }
    if (!generalClauses) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'চুক্তির শর্তাবলি খালি রাখা যাবে না।' },
      });
    }

    const categories = getMergedCategoriesForMosque(mosqueId);
    const matchedCat = categories.find((c) => c.code === categoryCode);
    const categoryNameBn = matchedCat?.nameBn || cleanStr(req.body?.categoryNameBn, 120) || 'অন্যান্য কাস্টম চুক্তি';

    const agreementDate = cleanDateStr(req.body?.agreementDate) || new Date().toISOString().slice(0, 10);
    const rawStatus = cleanStr(req.body?.status, 30) as AgreementStatus;
    const allowedInitialStatuses = new Set<AgreementStatus>(['DRAFT', 'INFORMATION_PENDING', 'UNDER_REVIEW', 'PENDING_APPROVAL']);
    const status: AgreementStatus = allowedInitialStatuses.has(rawStatus) ? rawStatus : 'DRAFT';

    const now = new Date().toISOString();
    const landWaqfDetails = sanitizeLandWaqfDetails(req.body?.landWaqfDetails);
    const isWaqfOrLandRelated =
      Boolean(req.body?.isWaqfOrLandRelated) || isWaqfOrLandCategoryCode(categoryCode, categories);
    const needsWaqf = isWaqfOrLandRelated || Boolean(landWaqfDetails?.waqfLegalReviewRequired);

    const newRecord: AgreementRecord = {
      id: `agr-${crypto.randomUUID().slice(0, 12)}`,
      mosqueId,
      tenantId: mosqueId,
      agreementNumber: generateAgreementNumber(mosqueId, agreementDate),
      title,
      categoryCode,
      categoryNameBn,
      status,
      agreementDate,
      effectiveDate: cleanDateStr(req.body?.effectiveDate),
      expiryDate: cleanDateStr(req.body?.expiryDate),
      durationText: cleanOptionalStr(req.body?.durationText, 160),
      executionPlace: cleanOptionalStr(req.body?.executionPlace, 240),
      purpose: purpose || title,
      parties,
      constructionDetails: sanitizeConstructionDetails(req.body?.constructionDetails),
      landWaqfDetails,
      writtenFinancialTerms: sanitizeWrittenFinancialTerms(req.body?.writtenFinancialTerms),
      generalClauses,
      specialClauses: cleanOptionalStr(req.body?.specialClauses, 12000),
      terminationClause: cleanOptionalStr(req.body?.terminationClause, 6000),
      disputeResolutionClause: cleanOptionalStr(req.body?.disputeResolutionClause, 6000),
      witnesses: sanitizeWitnesses(req.body?.witnesses),
      attachments: sanitizeAttachments(req.body?.attachments),
      templateIdUsed: cleanOptionalStr(req.body?.templateIdUsed, 80),
      isWaqfOrLandRelated,
      versionNumber: 1,
      enforceSigningOrder: Boolean(req.body?.enforceSigningOrder ?? true),
      isAmendment: false,
      waqfLegalReviewStatus: needsWaqf ? 'PENDING' : 'NOT_REQUIRED',
      reviewRecords: [],
      approvalRecords: [],
      signatures: [],
      witnessSignatures: [],
      signatureAuditTrail: [],
      versionHistory: [],
      isArchived: false,
      createdBy: user.id,
      createdByName: user.name,
      updatedBy: user.id,
      updatedByName: user.name,
      createdAt: now,
      updatedAt: now,
    };

    newRecord.currentDocumentHash = computeAgreementDocumentHash(newRecord);
    newRecord.versionHistory = [
      buildAgreementVersionSnapshot(newRecord, {
        changeSummary: 'প্রাথমিক সংস্করণ (Version 1) তৈরি',
        changedBy: user.id,
        changedByName: user.name,
        isAmendment: false,
      }),
    ];

    if (!db.agreements) db.agreements = [];
    db.agreements.unshift(newRecord);

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'CREATE_AGREEMENT',
      'Agreement',
      newRecord.id,
      `নতুন চুক্তিপত্র তৈরি করা হয়েছে (v1): ${newRecord.agreementNumber} — ${newRecord.title}`
    );
    db.save();
    syncAgreementReferencesToParties(mosqueId, newRecord);

    return res.status(201).json({ success: true, data: newRecord });
  });

  // 8. Update Agreement (Strictly blocks silent modification of Signed / Effective / Closed agreements)
  router.put('/agreements/:id', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canCreateOrEditAgreements(user, 'EDIT')) {
      return denyPermission(req, res, 'agreement.edit');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'হালনাগাদ করার জন্য চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    if (isAgreementLockedForDirectEdit(existing)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SIGNED_IMMUTABLE',
          message:
            'স্বাক্ষরিত, কার্যকর বা সমাপ্ত চুক্তিপত্র নীরবে সম্পাদনা করা যাবে না। পরিবর্তনের জন্য অনুগ্রহ করে নতুন ভার্সন (New Version) বা সংশোধনী চুক্তি (Amendment) তৈরি করুন।',
        },
      });
    }

    const title = cleanStr(req.body?.title, 250);
    const categoryCode = cleanStr(req.body?.categoryCode, 60) || existing.categoryCode;
    const generalClauses = cleanStr(req.body?.generalClauses, 25000);
    const parties = sanitizeParties(req.body?.parties, mosqueId);

    if (!title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'চুক্তিপত্রের শিরোনাম প্রদান করা আবশ্যক।' },
      });
    }
    if (parties.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'কমপক্ষে দুই পক্ষের নাম যুক্ত করা আবশ্যক।' },
      });
    }
    if (!generalClauses) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'চুক্তির শর্তাবলি খালি রাখা যাবে না।' },
      });
    }

    const categories = getMergedCategoriesForMosque(mosqueId);
    const matchedCat = categories.find((c) => c.code === categoryCode);
    const categoryNameBn = matchedCat?.nameBn || cleanStr(req.body?.categoryNameBn, 120) || existing.categoryNameBn;

    const rawStatus = cleanStr(req.body?.status, 30) as AgreementStatus;
    const allowedEditStatuses = new Set<AgreementStatus>([
      'DRAFT',
      'INFORMATION_PENDING',
      'AI_REVIEWED',
      'UNDER_REVIEW',
      'PENDING_APPROVAL',
    ]);
    // Never allow silent jump to APPROVED/SIGNED/EFFECTIVE via direct edit
    const status: AgreementStatus = allowedEditStatuses.has(rawStatus)
      ? rawStatus
      : existing.status === 'APPROVED' || existing.status === 'PENDING_SIGNATURE'
      ? 'UNDER_REVIEW'
      : existing.status;

    const landWaqfDetails = sanitizeLandWaqfDetails(req.body?.landWaqfDetails);
    const isWaqfOrLandRelated =
      Boolean(req.body?.isWaqfOrLandRelated) || isWaqfOrLandCategoryCode(categoryCode, categories);
    const needsWaqf = isWaqfOrLandRelated || Boolean(landWaqfDetails?.waqfLegalReviewRequired);

    const updated: AgreementRecord = {
      ...existing,
      title,
      categoryCode,
      categoryNameBn,
      status,
      agreementDate: cleanDateStr(req.body?.agreementDate) || existing.agreementDate,
      effectiveDate: cleanDateStr(req.body?.effectiveDate),
      expiryDate: cleanDateStr(req.body?.expiryDate),
      durationText: cleanOptionalStr(req.body?.durationText, 160),
      executionPlace: cleanOptionalStr(req.body?.executionPlace, 240),
      purpose: cleanStr(req.body?.purpose, 2000) || title,
      parties,
      constructionDetails: sanitizeConstructionDetails(req.body?.constructionDetails),
      landWaqfDetails,
      writtenFinancialTerms: sanitizeWrittenFinancialTerms(req.body?.writtenFinancialTerms),
      generalClauses,
      specialClauses: cleanOptionalStr(req.body?.specialClauses, 12000),
      terminationClause: cleanOptionalStr(req.body?.terminationClause, 6000),
      disputeResolutionClause: cleanOptionalStr(req.body?.disputeResolutionClause, 6000),
      witnesses: sanitizeWitnesses(req.body?.witnesses),
      attachments: sanitizeAttachments(req.body?.attachments),
      isWaqfOrLandRelated,
      enforceSigningOrder:
        req.body?.enforceSigningOrder !== undefined
          ? Boolean(req.body.enforceSigningOrder)
          : existing.enforceSigningOrder ?? true,
      waqfLegalReviewStatus: needsWaqf
        ? existing.waqfLegalReviewStatus === 'CLEARED'
          ? 'PENDING' // Content changed — requires re-verification
          : existing.waqfLegalReviewStatus || 'PENDING'
        : 'NOT_REQUIRED',
      // Preserve immutable approval, review, signature & version trails
      reviewRecords: existing.reviewRecords || [],
      approvalRecords: existing.approvalRecords || [],
      signatures: existing.signatures || [],
      witnessSignatures: existing.witnessSignatures || [],
      signatureAuditTrail: existing.signatureAuditTrail || [],
      versionHistory: existing.versionHistory || [],
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: new Date().toISOString(),
    };

    updated.currentDocumentHash = computeAgreementDocumentHash(updated);

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'UPDATE_AGREEMENT',
      'Agreement',
      updated.id,
      `চুক্তিপত্র হালনাগাদ করা হয়েছে: ${updated.agreementNumber} — ${updated.title}`
    );
    db.save();
    syncAgreementReferencesToParties(mosqueId, updated);

    return res.json({ success: true, data: updated });
  });

  // 9. Quick Status Update (Strictly enforces approval, Waqf review, and signature completion gates)
  router.patch('/agreements/:id/status', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.edit') && !hasAgreementPermission(user, 'agreement.review')) {
      return denyPermission(req, res, 'agreement.edit');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const rawStatus = cleanStr(req.body?.status, 30) as AgreementStatus;
    if (!VALID_STATUSES.has(rawStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'অবৈধ স্ট্যাটাস নির্বাচন করা হয়েছে।' },
      });
    }

    // Protected transitions must go through dedicated governance endpoints
    if (rawStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USE_APPROVAL_WORKFLOW',
          message: 'অনুমোদন (Approved) স্ট্যাটাসে নিতে অনুমোদন ওয়ার্কফ্লো প্যানেল ব্যবহার করুন।',
        },
      });
    }
    if (rawStatus === 'PARTIALLY_SIGNED' || rawStatus === 'FULLY_SIGNED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SIGNATURES_REQUIRED',
          message: 'সব প্রয়োজনীয় স্বাক্ষর রেকর্ড না হওয়া পর্যন্ত স্বাক্ষরিত (Signed) স্ট্যাটাস দেওয়া যাবে না।',
        },
      });
    }
    if (rawStatus === 'EFFECTIVE' || rawStatus === 'ACTIVE') {
      const progress = getSignatureProgressForCurrentVersion(existing);
      if (!progress.allSigned) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SIGNATURES_INCOMPLETE',
            message: `সকল প্রয়োজনীয় পক্ষের স্বাক্ষর (${progress.signedCount}/${progress.requiredCount}) সম্পন্ন না হওয়া পর্যন্ত চুক্তি কার্যকর (Effective) করা যাবে না।`,
          },
        });
      }
      if (!isWaqfLegalReviewCleared(existing)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WAQF_LEGAL_REVIEW_REQUIRED',
            message: 'ওয়াকফ/জমি সংক্রান্ত এই চুক্তিতে আইনগত ও ওয়াকফ পর্যালোচনা সম্পন্ন না হওয়া পর্যন্ত কার্যকর করা যাবে না।',
          },
        });
      }
    }
    if (isAgreementLockedForDirectEdit(existing) && (rawStatus === 'DRAFT' || rawStatus === 'INFORMATION_PENDING')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SIGNED_IMMUTABLE',
          message: 'স্বাক্ষরিত বা কার্যকর চুক্তিকে খসড়ায় ফেরত নেওয়া যাবে না; নতুন ভার্সন বা সংশোধনী তৈরি করুন।',
        },
      });
    }

    const prevStatus = existing.status;
    db.agreements[idx] = {
      ...existing,
      status: rawStatus === 'ACTIVE' ? 'EFFECTIVE' : rawStatus,
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: new Date().toISOString(),
    };

    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'UPDATE_AGREEMENT_STATUS',
      'Agreement',
      db.agreements[idx].id,
      `চুক্তিপত্র (${db.agreements[idx].agreementNumber}) স্ট্যাটাস পরিবর্তন: ${prevStatus} → ${db.agreements[idx].status}`
    );
    db.save();
    syncAgreementReferencesToParties(mosqueId, db.agreements[idx]);

    return res.json({ success: true, data: db.agreements[idx] });
  });

  // ==========================================
  // PART 3 GOVERNANCE, APPROVAL, DIGITAL SIGNATURE, VERSIONING & ARCHIVE ROUTES
  // ==========================================

  // 10. Record Internal / Committee / Waqf-Legal Review
  router.post('/agreements/:id/reviews', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    const rawStage = cleanStr(req.body?.stage, 30) as AgreementReviewStage;
    const validStages = new Set<AgreementReviewStage>(['INTERNAL', 'COMMITTEE', 'WAQF_LEGAL']);
    if (!validStages.has(rawStage)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'পর্যালোচনার ধাপ (Internal / Committee / Waqf Legal) নির্বাচন করুন।' },
      });
    }

    if (rawStage === 'WAQF_LEGAL') {
      if (!hasAgreementPermission(user, 'agreement.manage_waqf_review')) {
        return denyPermission(req, res, 'agreement.manage_waqf_review');
      }
    } else if (!hasAgreementPermission(user, 'agreement.review')) {
      return denyPermission(req, res, 'agreement.review');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const rawDecision = cleanStr(req.body?.decision, 40) as AgreementReviewDecision;
    const validDecisions = new Set<AgreementReviewDecision>([
      'REVIEWED',
      'CHANGES_REQUESTED',
      'INFO_PENDING',
      'WAQF_LEGAL_CLEARED',
      'WAQF_LEGAL_REJECTED',
    ]);
    if (!validDecisions.has(rawDecision)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'পর্যালোচনার সিদ্ধান্ত সঠিক নয়।' },
      });
    }

    const comment = cleanStr(req.body?.comment, 2000);
    if (!comment) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'পর্যালোচনার মন্তব্য বা নোট লেখা আবশ্যক।' },
      });
    }

    const now = new Date().toISOString();
    const versionNumber = existing.versionNumber || 1;
    const reviewEntry: AgreementReviewRecord = {
      id: `rev-${crypto.randomUUID().slice(0, 10)}`,
      versionNumber,
      stage: rawStage,
      decision: rawDecision,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerRole: user.role,
      comment,
      reviewedAt: now,
    };

    let nextStatus: AgreementStatus = existing.status;
    let nextWaqfStatus = existing.waqfLegalReviewStatus || (requiresWaqfLegalReview(existing) ? 'PENDING' : 'NOT_REQUIRED');
    let nextLandWaqf = existing.landWaqfDetails;

    if (rawStage === 'WAQF_LEGAL') {
      if (rawDecision === 'WAQF_LEGAL_CLEARED') {
        nextWaqfStatus = 'CLEARED';
        if (nextLandWaqf) {
          nextLandWaqf = {
            ...nextLandWaqf,
            waqfLegalCautionAcknowledged: true,
            waqfLegalReviewNote: comment,
          };
        }
        if (!isAgreementLockedForDirectEdit(existing) && existing.status !== 'APPROVED') {
          nextStatus = 'PENDING_APPROVAL';
        }
      } else if (rawDecision === 'WAQF_LEGAL_REJECTED' || rawDecision === 'CHANGES_REQUESTED') {
        nextWaqfStatus = 'REJECTED';
        if (!isAgreementLockedForDirectEdit(existing)) {
          nextStatus = 'UNDER_REVIEW';
        }
      }
    } else if (!isAgreementLockedForDirectEdit(existing)) {
      if (rawDecision === 'INFO_PENDING') {
        nextStatus = 'INFORMATION_PENDING';
      } else if (rawDecision === 'CHANGES_REQUESTED') {
        nextStatus = 'UNDER_REVIEW';
      } else if (rawDecision === 'REVIEWED') {
        nextStatus = req.body?.sendForApproval === false ? 'UNDER_REVIEW' : 'PENDING_APPROVAL';
      }
    }

    const updated: AgreementRecord = {
      ...existing,
      status: nextStatus,
      waqfLegalReviewStatus: nextWaqfStatus,
      landWaqfDetails: nextLandWaqf,
      reviewRecords: [reviewEntry, ...(existing.reviewRecords || [])],
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'REVIEW_AGREEMENT',
      'Agreement',
      updated.id,
      `চুক্তিপত্র (${updated.agreementNumber}) পর্যালোচনা (${rawStage} — ${rawDecision}): ${comment.slice(0, 120)}`
    );
    db.save();

    return res.json({ success: true, data: updated });
  });

  // 11. Record Approval / Rejection Decision (Immutable Audit Record, Enforces Waqf Review Gate)
  router.post('/agreements/:id/approvals', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    const rawDecision = cleanStr(req.body?.decision, 40) as AgreementApprovalDecision;
    const validDecisions = new Set<AgreementApprovalDecision>(['APPROVED', 'REJECTED', 'RETURNED_FOR_REVISION']);
    if (!validDecisions.has(rawDecision)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'অনুমোদনের সিদ্ধান্ত সঠিক নয়।' },
      });
    }

    if (rawDecision === 'APPROVED' && !hasAgreementPermission(user, 'agreement.approve')) {
      return denyPermission(req, res, 'agreement.approve');
    }
    if (
      (rawDecision === 'REJECTED' || rawDecision === 'RETURNED_FOR_REVISION') &&
      !hasAgreementPermission(user, 'agreement.reject') &&
      !hasAgreementPermission(user, 'agreement.approve')
    ) {
      return denyPermission(req, res, 'agreement.reject');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    if (isAgreementLockedForDirectEdit(existing)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SIGNED_IMMUTABLE',
          message: 'স্বাক্ষরিত বা কার্যকর চুক্তিপত্রের অনুমোদন অবস্থা পরিবর্তন করা যাবে না।',
        },
      });
    }

    const comment = cleanStr(req.body?.comment, 2000);
    if (!comment) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'অনুমোদন বা প্রত্যাখ্যানের মন্তব্য প্রদান করা আবশ্যক।' },
      });
    }

    // Strict Waqf/Land legal review gate before Approval
    if (rawDecision === 'APPROVED' && requiresWaqfLegalReview(existing) && !isWaqfLegalReviewCleared(existing)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WAQF_LEGAL_REVIEW_REQUIRED',
          message:
            'এই চুক্তিটি ওয়াকফ বা জমি সংক্রান্ত। অনুমোদনের পূর্বে বাধ্যতামূলক "ওয়াকফ / আইনগত পর্যালোচনা (WAQF_LEGAL)" সম্পন্ন ও ছাড়পত্র দিতে হবে।',
        },
      });
    }

    const now = new Date().toISOString();
    const versionNumber = existing.versionNumber || 1;
    const docHash = computeAgreementDocumentHash(existing);

    const approvalRecord: AgreementApprovalRecord = {
      id: `apr-${crypto.randomUUID().slice(0, 10)}`,
      versionNumber,
      decision: rawDecision,
      approverId: user.id,
      approverName: user.name,
      approverRole: user.role,
      committeeResolutionRef: cleanOptionalStr(req.body?.committeeResolutionRef, 200),
      comment,
      decidedAt: now,
      documentHashAtApproval: docHash,
    };

    const moveToPendingSignature = rawDecision === 'APPROVED' && req.body?.readyForSignature !== false;
    const nextStatus: AgreementStatus =
      rawDecision === 'APPROVED'
        ? moveToPendingSignature
          ? 'PENDING_SIGNATURE'
          : 'APPROVED'
        : rawDecision === 'RETURNED_FOR_REVISION'
        ? 'UNDER_REVIEW'
        : 'CANCELLED';

    const updated: AgreementRecord = {
      ...existing,
      status: nextStatus,
      currentDocumentHash: docHash,
      approvalRecords: [approvalRecord, ...(existing.approvalRecords || [])],
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      `AGREEMENT_${rawDecision}`,
      'Agreement',
      updated.id,
      `চুক্তিপত্র (${updated.agreementNumber} v${versionNumber}) সিদ্ধান্ত: ${rawDecision} — ${comment.slice(0, 120)}`
    );
    db.save();

    return res.json({ success: true, data: updated });
  });

  // 12. Request OTP Verification Code for a Specific Signatory Slot
  router.post('/agreements/:id/signatures/otp/request', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.sign') && !hasAgreementPermission(user, 'agreement.manage_signatures')) {
      return denyPermission(req, res, 'agreement.sign');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const slotKey = cleanStr(req.body?.slotKey, 160);
    const progress = getSignatureProgressForCurrentVersion(existing);
    const targetSlot = progress.requiredSlots.find((s) => s.slotKey === slotKey);
    if (!targetSlot) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNER_SLOT', message: 'সঠিক স্বাক্ষরকারী স্লট নির্বাচন করুন।' },
      });
    }

    const otpResult = issueSignatureOtpChallenge({
      userId: user.id,
      mosqueId,
      agreementId: existing.id,
      slotKey,
      targetPhone: cleanOptionalStr(req.body?.phoneOverride, 30) || targetSlot.signerPhone,
    });

    if (otpResult.allowed === false || 'retryAfterSec' in otpResult) {
      const retrySec = 'retryAfterSec' in otpResult ? otpResult.retryAfterSec : 60;
      return res.status(429).json({
        success: false,
        error: {
          code: 'OTP_RATE_LIMITED',
          message: `অনুগ্রহ করে ${retrySec} সেকেন্ড পর পুনরায় OTP অনুরোধ করুন।`,
        },
      });
    }

    const versionNumber = existing.versionNumber || 1;
    const docHash = computeAgreementDocumentHash(existing);
    const auditEvent: AgreementSignatureAuditEvent = {
      id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
      eventType: 'OTP_REQUESTED',
      actorId: user.id,
      actorName: user.name,
      signerName: targetSlot.signerName,
      partyRoleLabel: targetSlot.partyRoleLabel,
      versionNumber,
      documentHash: docHash,
      ipAddress: getClientIp(req),
      detailsBn: `${targetSlot.partyRoleLabel} (${targetSlot.signerName})-এর স্বাক্ষরের জন্য OTP যাচাই সেশন তৈরি হয়েছে (${otpResult.maskedTarget})।`,
      timestamp: new Date().toISOString(),
    };

    db.agreements[idx] = {
      ...existing,
      signatureAuditTrail: [auditEvent, ...(existing.signatureAuditTrail || [])],
    };
    db.save();

    return res.json({
      success: true,
      data: {
        challengeId: otpResult.challengeId,
        maskedTarget: otpResult.maskedTarget,
        expiresInSec: otpResult.expiresInSec,
        verificationCodePreview: otpResult.verificationCodePreview,
        noticeBn:
          'স্বাক্ষর যাচাই কোড (OTP) তৈরি হয়েছে (মেয়াদ ৫ মিনিট)। উপস্থিত স্বাক্ষরকারীর সম্মতি নিয়ে ৬ সংখ্যার কোডটি প্রবেশ করান।',
      },
    });
  });

  // 13. Record Digital/Electronic Signatory Signature (Sequential Order, Hash, Audit Trail, Auto Partially/Fully Signed)
  router.post('/agreements/:id/signatures', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.sign') && !hasAgreementPermission(user, 'agreement.manage_signatures')) {
      return denyPermission(req, res, 'agreement.sign');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const allowedSignStatuses = new Set<AgreementStatus>(['APPROVED', 'PENDING_SIGNATURE', 'PARTIALLY_SIGNED']);
    if (!allowedSignStatuses.has(existing.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'APPROVAL_REQUIRED_BEFORE_SIGN',
          message:
            'স্বাক্ষর গ্রহণের পূর্বে চুক্তিপত্রটি অবশ্যই অনুমোদিত (Approved / Pending Signature) পর্যায়ে থাকতে হবে।',
        },
      });
    }

    if (requiresWaqfLegalReview(existing) && !isWaqfLegalReviewCleared(existing)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WAQF_LEGAL_REVIEW_REQUIRED',
          message: 'ওয়াকফ/জমি সংক্রান্ত এই চুক্তিতে আইনগত পর্যালোচনা সম্পন্ন না হওয়া পর্যন্ত স্বাক্ষর গ্রহণ করা যাবে না।',
        },
      });
    }

    if (!req.body?.legalLimitationAcknowledged) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DISCLAIMER_REQUIRED',
          message: 'স্বাক্ষরের আইনি সীমাবদ্ধতা নোটটি পড়ে নিশ্চিতকরণ টিক চিহ্ন দিন।',
        },
      });
    }

    const slotKey = cleanStr(req.body?.slotKey, 160);
    const progress = getSignatureProgressForCurrentVersion(existing);
    const targetSlot = progress.requiredSlots.find((s) => s.slotKey === slotKey);
    if (!targetSlot) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SIGNER_SLOT', message: 'নির্বাচিত স্বাক্ষরকারী এই চুক্তিপত্রের বৈধ পক্ষ নন।' },
      });
    }

    if (progress.signedSlotKeys.has(slotKey)) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_SIGNED', message: 'এই স্বাক্ষরকারীর স্বাক্ষর বর্তমান ভার্সনে ইতিমধ্যে সংরক্ষিত আছে।' },
      });
    }

    // Enforce signing order when enabled
    const enforceOrder = existing.enforceSigningOrder !== false;
    if (enforceOrder && progress.nextPendingSlot && progress.nextPendingSlot.slotKey !== targetSlot.slotKey) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SIGNING_ORDER_VIOLATION',
          message: `স্বাক্ষরের ক্রম অনুযায়ী প্রথমে #${progress.nextPendingSlot.signingOrder} (${progress.nextPendingSlot.partyRoleLabel} — ${progress.nextPendingSlot.signerName}) এর স্বাক্ষর সম্পন্ন করতে হবে।`,
        },
      });
    }

    const rawMethod = cleanStr(req.body?.method, 40) as AgreementSignatureMethod;
    const validMethods = new Set<AgreementSignatureMethod>([
      'DRAW_TOUCH',
      'TYPED_ELECTRONIC',
      'OTP_VERIFIED_ELECTRONIC',
    ]);
    if (!validMethods.has(rawMethod)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সঠিক স্বাক্ষর পদ্ধতি নির্বাচন করুন।' },
      });
    }

    const signatureImageDataUrl = sanitizeSignatureImageDataUrl(req.body?.signatureImageDataUrl);
    const typedSignatureText = cleanOptionalStr(req.body?.typedSignatureText, 160);

    if (rawMethod === 'DRAW_TOUCH' && !signatureImageDataUrl) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'স্ক্রিনে আঁকা স্বাক্ষর প্রদান করা আবশ্যক।' },
      });
    }
    if (rawMethod === 'TYPED_ELECTRONIC' && !typedSignatureText) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'স্বাক্ষরকারীর টাইপকৃত স্বাক্ষর লেখা আবশ্যক।' },
      });
    }

    const now = new Date().toISOString();
    const versionNumber = existing.versionNumber || 1;
    const docHash = computeAgreementDocumentHash(existing);
    const ipAddress = getClientIp(req);
    const userAgent = cleanOptionalStr(req.headers['user-agent'], 250);
    const newAuditEvents: AgreementSignatureAuditEvent[] = [];

    let otpVerified = false;
    let otpMaskedTarget: string | undefined;
    let otpVerifiedAt: string | undefined;

    if (rawMethod === 'OTP_VERIFIED_ELECTRONIC') {
      const challengeId = cleanStr(req.body?.otpChallengeId, 80);
      const otpCode = cleanStr(req.body?.otpCode, 12);
      const check = verifySignatureOtpChallenge({
        challengeId,
        otpCode,
        mosqueId,
        agreementId: existing.id,
        slotKey,
      });
      if (check.ok === false || 'messageBn' in check) {
        const failReason = 'messageBn' in check ? check.messageBn : 'OTP কোডটি সঠিক নয়।';
        const failEvent: AgreementSignatureAuditEvent = {
          id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
          eventType: 'OTP_FAILED',
          actorId: user.id,
          actorName: user.name,
          signerName: targetSlot.signerName,
          partyRoleLabel: targetSlot.partyRoleLabel,
          versionNumber,
          documentHash: docHash,
          ipAddress,
          detailsBn: `OTP যাচাই ব্যর্থ: ${failReason}`,
          timestamp: now,
        };
        db.agreements[idx] = {
          ...existing,
          signatureAuditTrail: [failEvent, ...(existing.signatureAuditTrail || [])],
        };
        db.save();
        return res.status(400).json({
          success: false,
          error: { code: 'OTP_INVALID', message: failReason },
        });
      }
      otpVerified = true;
      otpMaskedTarget = 'maskedTarget' in check ? check.maskedTarget : undefined;
      otpVerifiedAt = now;
      newAuditEvents.push({
        id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
        eventType: 'OTP_VERIFIED',
        actorId: user.id,
        actorName: user.name,
        signerName: targetSlot.signerName,
        partyRoleLabel: targetSlot.partyRoleLabel,
        versionNumber,
        documentHash: docHash,
        ipAddress,
        detailsBn: `OTP সফলভাবে যাচাই হয়েছে (${otpMaskedTarget})।`,
        timestamp: now,
      });
    }

    const sigRecord: AgreementSignatureRecord = {
      id: `sig-${crypto.randomUUID().slice(0, 10)}`,
      slotKey: targetSlot.slotKey,
      signingOrder: targetSlot.signingOrder,
      partyId: targetSlot.partyId,
      partyRoleLabel: targetSlot.partyRoleLabel,
      partyName: targetSlot.partyName,
      representativeId: targetSlot.representativeId,
      signerName: cleanStr(req.body?.signerNameOverride, 160) || targetSlot.signerName,
      signerDesignation: cleanStr(req.body?.signerDesignationOverride, 120) || targetSlot.signerDesignation,
      signerIdentityRef:
        cleanOptionalStr(req.body?.signerIdentityRef, 120) || targetSlot.signerNid || targetSlot.signerPhone,
      authorityBasis: cleanStr(req.body?.authorityBasisOverride, 300) || targetSlot.authorityBasis,
      method: rawMethod,
      signatureImageDataUrl,
      typedSignatureText: typedSignatureText || targetSlot.signerName,
      otpVerified,
      otpMaskedTarget,
      otpVerifiedAt,
      versionNumber,
      documentHash: docHash,
      signedAt: now,
      ipAddress,
      userAgent,
      recordedByUserId: user.id,
      recordedByUserName: user.name,
      legalLimitationAcknowledged: true,
      legalLimitationNoteBn: AGREEMENT_SIGNATURE_LIMITATION_BN,
    };

    const nextSignatures = [...(existing.signatures || []), sigRecord];
    const nextProgress = getSignatureProgressForCurrentVersion({ ...existing, signatures: nextSignatures });
    const nextStatus: AgreementStatus = nextProgress.allSigned ? 'FULLY_SIGNED' : 'PARTIALLY_SIGNED';

    newAuditEvents.unshift({
      id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
      eventType: 'PARTY_SIGNED',
      actorId: user.id,
      actorName: user.name,
      signerName: sigRecord.signerName,
      partyRoleLabel: sigRecord.partyRoleLabel,
      versionNumber,
      documentHash: docHash,
      ipAddress,
      detailsBn: `ক্রম #${sigRecord.signingOrder} — ${sigRecord.partyRoleLabel} (${sigRecord.signerName}) স্বাক্ষর সম্পন্ন করেছেন (${rawMethod}, SHA-256: ${docHash.slice(0, 12)}…)।`,
      timestamp: now,
    });

    if (nextProgress.allSigned) {
      newAuditEvents.unshift({
        id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
        eventType: 'MARKED_FULLY_SIGNED',
        actorId: user.id,
        actorName: user.name,
        versionNumber,
        documentHash: docHash,
        ipAddress,
        detailsBn: `সকল প্রয়োজনীয় পক্ষের (${nextProgress.signedCount}/${nextProgress.requiredCount}) স্বাক্ষর সম্পন্ন হওয়ায় চুক্তিপত্রটি "সম্পূর্ণ স্বাক্ষরিত (Fully Signed)" পর্যায়ে উন্নীত হয়েছে।`,
        timestamp: now,
      });
    }

    const updated: AgreementRecord = {
      ...existing,
      status: nextStatus,
      currentDocumentHash: docHash,
      signatures: nextSignatures,
      signatureAuditTrail: [...newAuditEvents, ...(existing.signatureAuditTrail || [])],
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'SIGN_AGREEMENT',
      'Agreement',
      updated.id,
      `চুক্তিপত্র (${updated.agreementNumber} v${versionNumber}) স্বাক্ষর: ${sigRecord.partyRoleLabel} — ${sigRecord.signerName} (${nextProgress.signedCount}/${nextProgress.requiredCount})`
    );
    db.save();

    return res.json({ success: true, data: updated });
  });

  // 14. Record Witness Details & Witness Signature
  router.post('/agreements/:id/witnesses/sign', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.sign') && !hasAgreementPermission(user, 'agreement.manage_signatures')) {
      return denyPermission(req, res, 'agreement.sign');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const witnessName = cleanStr(req.body?.witnessName, 160);
    if (!witnessName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সাক্ষীর পূর্ণ নাম প্রদান করা আবশ্যক।' },
      });
    }

    const method = req.body?.method === 'DRAW_TOUCH' ? 'DRAW_TOUCH' : 'TYPED_ELECTRONIC';
    const signatureImageDataUrl = sanitizeSignatureImageDataUrl(req.body?.signatureImageDataUrl);
    const typedSignatureText = cleanOptionalStr(req.body?.typedSignatureText, 160) || witnessName;
    if (method === 'DRAW_TOUCH' && !signatureImageDataUrl) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সাক্ষীর আঁকা স্বাক্ষর প্রদান করুন।' },
      });
    }

    const now = new Date().toISOString();
    const versionNumber = existing.versionNumber || 1;
    const docHash = computeAgreementDocumentHash(existing);

    const witnessSig: AgreementWitnessSignatureRecord = {
      id: `wsig-${crypto.randomUUID().slice(0, 10)}`,
      witnessId: cleanOptionalStr(req.body?.witnessId, 80),
      witnessName,
      fatherName: cleanOptionalStr(req.body?.fatherName, 160),
      phone: cleanOptionalStr(req.body?.phone, 35),
      nid: cleanOptionalStr(req.body?.nid, 40),
      address: cleanOptionalStr(req.body?.address, 300),
      partySide: cleanOptionalStr(req.body?.partySide, 100),
      method,
      signatureImageDataUrl,
      typedSignatureText,
      versionNumber,
      documentHash: docHash,
      signedAt: now,
      recordedByUserId: user.id,
      recordedByUserName: user.name,
    };

    const auditEvent: AgreementSignatureAuditEvent = {
      id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
      eventType: 'WITNESS_SIGNED',
      actorId: user.id,
      actorName: user.name,
      signerName: witnessName,
      partyRoleLabel: witnessSig.partySide || 'সাক্ষী',
      versionNumber,
      documentHash: docHash,
      ipAddress: getClientIp(req),
      detailsBn: `সাক্ষী "${witnessName}"-এর বিবরণ ও স্বাক্ষর সংরক্ষিত হয়েছে (v${versionNumber})।`,
      timestamp: now,
    };

    const updated: AgreementRecord = {
      ...existing,
      witnessSignatures: [...(existing.witnessSignatures || []), witnessSig],
      signatureAuditTrail: [auditEvent, ...(existing.signatureAuditTrail || [])],
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'WITNESS_SIGN_AGREEMENT',
      'Agreement',
      updated.id,
      `চুক্তিপত্র (${updated.agreementNumber}) সাক্ষীর স্বাক্ষর: ${witnessName}`
    );
    db.save();

    return res.json({ success: true, data: updated });
  });

  // 15. Mark Fully Signed Agreement as EFFECTIVE (Strictly enforces all signatures + Waqf legal clearance)
  router.post('/agreements/:id/mark-effective', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.approve') && !hasAgreementPermission(user, 'agreement.manage_signatures')) {
      return denyPermission(req, res, 'agreement.approve');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const progress = getSignatureProgressForCurrentVersion(existing);
    if (!progress.allSigned) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SIGNATURES_INCOMPLETE',
          message: `সকল প্রয়োজনীয় পক্ষের স্বাক্ষর (${progress.signedCount}/${progress.requiredCount}) সম্পন্ন না হওয়া পর্যন্ত চুক্তি কার্যকর (Effective) করা যাবে না।`,
        },
      });
    }
    if (requiresWaqfLegalReview(existing) && !isWaqfLegalReviewCleared(existing)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WAQF_LEGAL_REVIEW_REQUIRED',
          message: 'ওয়াকফ/জমি সংক্রান্ত এই চুক্তিতে আইনগত পর্যালোচনা ছাড়পত্র ছাড়া কার্যকর (Effective) করা যাবে না।',
        },
      });
    }

    const now = new Date().toISOString();
    const versionNumber = existing.versionNumber || 1;
    const docHash = computeAgreementDocumentHash(existing);
    const effectiveDate = cleanDateStr(req.body?.effectiveDate) || existing.effectiveDate || now.slice(0, 10);

    const auditEvent: AgreementSignatureAuditEvent = {
      id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
      eventType: 'MARKED_EFFECTIVE',
      actorId: user.id,
      actorName: user.name,
      versionNumber,
      documentHash: docHash,
      ipAddress: getClientIp(req),
      detailsBn: `সকল স্বাক্ষর ও যাচাই সম্পন্ন সাপেক্ষে চুক্তিপত্রটি "কার্যকর (Effective)" হিসেবে ঘোষণা করা হয়েছে (কার্যকর তারিখ: ${effectiveDate})।`,
      timestamp: now,
    };

    const updated: AgreementRecord = {
      ...existing,
      status: 'EFFECTIVE',
      effectiveDate,
      currentDocumentHash: docHash,
      signatureAuditTrail: [auditEvent, ...(existing.signatureAuditTrail || [])],
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'MARK_AGREEMENT_EFFECTIVE',
      'Agreement',
      updated.id,
      `চুক্তিপত্র (${updated.agreementNumber} v${versionNumber}) কার্যকর (Effective) ঘোষণা করা হয়েছে`
    );
    db.save();
    syncAgreementReferencesToParties(mosqueId, updated);

    return res.json({ success: true, data: updated });
  });

  // 16. Create New Version (V2, V3...) or Amendment (সংশোধনী চুক্তি) — Preserves Immutable Prior Versions & Signatures
  router.post('/agreements/:id/versions', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!hasAgreementPermission(user, 'agreement.edit') && !hasAgreementPermission(user, 'agreement.create')) {
      return denyPermission(req, res, 'agreement.edit');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const changeSummary = cleanStr(req.body?.changeSummary, 1500);
    if (!changeSummary) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'নতুন ভার্সন বা সংশোধনীর কারণ ও পরিবর্তনের বিবরণ লেখা আবশ্যক।' },
      });
    }

    const isAmendment = Boolean(req.body?.isAmendment);
    const amendmentTitle = cleanOptionalStr(req.body?.amendmentTitle, 200);
    const prevVersion = existing.versionNumber || 1;
    const nextVersion = prevVersion + 1;
    const now = new Date().toISOString();

    // Ensure prior version is preserved in versionHistory before mutating
    const existingHistory = [...(existing.versionHistory || [])];
    const prevAlreadyRecorded = existingHistory.some((v) => v.versionNumber === prevVersion);
    if (!prevAlreadyRecorded) {
      existingHistory.push(
        buildAgreementVersionSnapshot(existing, {
          changeSummary: `ভার্সন ${prevVersion} এর সংরক্ষিত স্ন্যাপশট`,
          changedBy: existing.updatedBy || existing.createdBy,
          changedByName: existing.updatedByName || existing.createdByName,
          isAmendment: Boolean(existing.isAmendment),
        })
      );
    }

    const nextTitle = cleanStr(req.body?.title, 250) || existing.title;
    const nextPurpose = cleanStr(req.body?.purpose, 2000) || existing.purpose;
    const nextGeneralClauses = cleanStr(req.body?.generalClauses, 25000) || existing.generalClauses;
    const nextSpecialClauses =
      req.body?.specialClauses !== undefined ? cleanOptionalStr(req.body.specialClauses, 12000) : existing.specialClauses;
    const nextTermination =
      req.body?.terminationClause !== undefined
        ? cleanOptionalStr(req.body.terminationClause, 6000)
        : existing.terminationClause;
    const nextDispute =
      req.body?.disputeResolutionClause !== undefined
        ? cleanOptionalStr(req.body.disputeResolutionClause, 6000)
        : existing.disputeResolutionClause;
    const nextExpiryDate =
      req.body?.expiryDate !== undefined ? cleanDateStr(req.body.expiryDate) : existing.expiryDate;
    const nextDurationText =
      req.body?.durationText !== undefined ? cleanOptionalStr(req.body.durationText, 160) : existing.durationText;

    const nextAmendmentNo = isAmendment ? (existing.amendmentNumber || 0) + 1 : existing.amendmentNumber;
    const needsWaqf = requiresWaqfLegalReview(existing);

    const updatedDraft: AgreementRecord = {
      ...existing,
      title: nextTitle,
      purpose: nextPurpose,
      generalClauses: nextGeneralClauses,
      specialClauses: nextSpecialClauses,
      terminationClause: nextTermination,
      disputeResolutionClause: nextDispute,
      expiryDate: nextExpiryDate,
      durationText: nextDurationText,
      versionNumber: nextVersion,
      isAmendment: isAmendment || existing.isAmendment,
      amendmentNumber: nextAmendmentNo,
      status: 'DRAFT', // New version/amendment requires fresh review, approval & signatures
      waqfLegalReviewStatus: needsWaqf ? 'PENDING' : 'NOT_REQUIRED',
      // Keep ALL historical approval, review & signature records permanently untouched!
      reviewRecords: existing.reviewRecords || [],
      approvalRecords: existing.approvalRecords || [],
      signatures: existing.signatures || [],
      witnessSignatures: existing.witnessSignatures || [],
      isArchived: false,
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    const nextHash = computeAgreementDocumentHash(updatedDraft);
    updatedDraft.currentDocumentHash = nextHash;

    const newSnapshot = buildAgreementVersionSnapshot(updatedDraft, {
      changeSummary,
      changedBy: user.id,
      changedByName: user.name,
      previousVersionNumber: prevVersion,
      isAmendment,
      amendmentTitle: isAmendment ? amendmentTitle || `সংশোধনী #${nextAmendmentNo}` : undefined,
    });

    const auditEvent: AgreementSignatureAuditEvent = {
      id: `sigaud-${crypto.randomUUID().slice(0, 10)}`,
      eventType: isAmendment ? 'AMENDMENT_CREATED' : 'VERSION_CREATED',
      actorId: user.id,
      actorName: user.name,
      versionNumber: nextVersion,
      documentHash: nextHash,
      ipAddress: getClientIp(req),
      detailsBn: isAmendment
        ? `সংশোধনী চুক্তি (Amendment #${nextAmendmentNo} / v${nextVersion}) তৈরি করা হয়েছে (পূর্ব ভার্সন v${prevVersion}): ${changeSummary.slice(0, 140)}`
        : `নতুন ভার্সন (v${nextVersion}) তৈরি করা হয়েছে (পূর্ব ভার্সন v${prevVersion}): ${changeSummary.slice(0, 140)}`,
      timestamp: now,
    };

    updatedDraft.versionHistory = [newSnapshot, ...existingHistory];
    updatedDraft.signatureAuditTrail = [auditEvent, ...(existing.signatureAuditTrail || [])];

    db.agreements[idx] = updatedDraft;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      isAmendment ? 'CREATE_AGREEMENT_AMENDMENT' : 'CREATE_AGREEMENT_VERSION',
      'Agreement',
      updatedDraft.id,
      `চুক্তিপত্র (${updatedDraft.agreementNumber}) v${prevVersion} → v${nextVersion}${isAmendment ? ' (সংশোধনী)' : ''}: ${changeSummary.slice(0, 120)}`
    );
    db.save();
    syncAgreementReferencesToParties(mosqueId, updatedDraft);

    return res.status(201).json({ success: true, data: updatedDraft });
  });

  // 17. Close (Complete / Expire / Terminate / Cancel with Mandatory Reason) or Archive / Unarchive
  router.post('/agreements/:id/close-or-archive', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    const mode = cleanStr(req.body?.mode, 20); // 'CLOSE' | 'ARCHIVE' | 'UNARCHIVE'

    if (mode === 'CLOSE') {
      if (!hasAgreementPermission(user, 'agreement.approve') && !hasAgreementPermission(user, 'agreement.reject')) {
        return denyPermission(req, res, 'agreement.approve');
      }
    } else if (!hasAgreementPermission(user, 'agreement.edit') && !hasAgreementPermission(user, 'agreement.approve')) {
      return denyPermission(req, res, 'agreement.edit');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const existing = db.agreements[idx];
    const now = new Date().toISOString();

    if (mode === 'ARCHIVE' || mode === 'UNARCHIVE') {
      const archiveFlag = mode === 'ARCHIVE';
      const archiveNote = cleanOptionalStr(req.body?.archiveNote, 500);
      const updated: AgreementRecord = {
        ...existing,
        isArchived: archiveFlag,
        archivedAt: archiveFlag ? now : undefined,
        archivedBy: archiveFlag ? user.id : undefined,
        archivedByName: archiveFlag ? user.name : undefined,
        archiveNote: archiveFlag ? archiveNote || existing.archiveNote : existing.archiveNote,
        updatedBy: user.id,
        updatedByName: user.name,
        updatedAt: now,
      };
      db.agreements[idx] = updated;
      db.logAudit(
        mosqueId,
        user.id,
        user.name,
        archiveFlag ? 'ARCHIVE_AGREEMENT' : 'UNARCHIVE_AGREEMENT',
        'Agreement',
        updated.id,
        `চুক্তিপত্র (${updated.agreementNumber}) ${archiveFlag ? 'আর্কাইভ করা হয়েছে' : 'আর্কাইভ থেকে ফিরিয়ে আনা হয়েছে'}`
      );
      db.save();
      syncAgreementReferencesToParties(mosqueId, updated);
      return res.json({ success: true, data: updated });
    }

    const rawAction = cleanStr(req.body?.action, 20) as AgreementClosureInfo['action'];
    const validClosureActions = new Set<AgreementClosureInfo['action']>([
      'COMPLETED',
      'EXPIRED',
      'TERMINATED',
      'CANCELLED',
    ]);
    if (!validClosureActions.has(rawAction)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'সঠিক সমাপ্তি/বাতিল স্ট্যাটাস নির্বাচন করুন।' },
      });
    }

    const reason = cleanStr(req.body?.reason, 1500);
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'চুক্তি সম্পন্ন, মেয়াদোত্তীর্ণ, অবসান বা বাতিলের সুস্পষ্ট কারণ লিখুন।' },
      });
    }

    const closureInfo: AgreementClosureInfo = {
      action: rawAction,
      reason,
      effectiveClosureDate: cleanDateStr(req.body?.effectiveClosureDate) || now.slice(0, 10),
      recordedBy: user.id,
      recordedByName: user.name,
      recordedAt: now,
    };

    const updated: AgreementRecord = {
      ...existing,
      status: rawAction,
      closureInfo,
      isArchived: req.body?.alsoArchive ? true : existing.isArchived,
      archivedAt: req.body?.alsoArchive ? now : existing.archivedAt,
      archivedBy: req.body?.alsoArchive ? user.id : existing.archivedBy,
      archivedByName: req.body?.alsoArchive ? user.name : existing.archivedByName,
      updatedBy: user.id,
      updatedByName: user.name,
      updatedAt: now,
    };

    db.agreements[idx] = updated;
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      `CLOSE_AGREEMENT_${rawAction}`,
      'Agreement',
      updated.id,
      `চুক্তিপত্র (${updated.agreementNumber}) অবস্থা: ${rawAction} — কারণ: ${reason.slice(0, 140)}`
    );
    db.save();
    syncAgreementReferencesToParties(mosqueId, updated);

    return res.json({ success: true, data: updated });
  });

  // 18. Delete Agreement (Strictly prohibits deleting agreements with approval/signature records)
  router.delete('/agreements/:id', authenticate, (req: AgreementAuthRequest, res: Response) => {
    const user = req.user!;
    const mosqueId = req.currentMosque!.id;
    if (!canDeleteAgreements(user)) {
      return denyPermission(req, res, 'agreement.delete');
    }

    const idx = (db.agreements || []).findIndex((a) => a.id === req.params.id && a.mosqueId === mosqueId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'মুছে ফেলার জন্য চুক্তিপত্রটি পাওয়া যায়নি।' },
      });
    }

    const target = db.agreements[idx];
    const deleteGuard = canHardDeleteAgreement(target);
    if (!deleteGuard.allowed) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SIGNED_DELETE_FORBIDDEN',
          message: deleteGuard.reasonBn || 'অনুমোদিত বা স্বাক্ষরিত চুক্তিপত্র মুছে ফেলা যাবে না।',
        },
      });
    }

    const removed = db.agreements.splice(idx, 1)[0];
    db.logAudit(
      mosqueId,
      user.id,
      user.name,
      'DELETE_AGREEMENT',
      'Agreement',
      removed.id,
      `চুক্তিপত্র মুছে ফেলা হয়েছে: ${removed.agreementNumber} — ${removed.title}`
    );
    db.save();

    return res.json({ success: true, data: { deletedId: removed.id, message: 'চুক্তিপত্রটি সফলভাবে মুছে ফেলা হয়েছে।' } });
  });

  return router;
}

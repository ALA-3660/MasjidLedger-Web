import express, { Request, Response, NextFunction, Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { db } from './db.ts';
import { User, Mosque } from '../types/index.ts';
import {
  DEFAULT_SMART_NOTE_CATEGORIES,
  SmartNote,
  SmartNoteActivity,
  SmartNoteAttachment,
  SmartNoteCategory,
  SmartNoteComment,
  SmartNotePrivacyMode,
  SmartNoteReminder,
  SmartNoteShareEntry,
  SmartNoteStats,
  SmartNoteStatus,
  SmartNoteType,
  SmartNoteVersion,
} from '../types/smartNotesTypes.ts';
import {
  assistSmartNoteWithAi,
  formatVoiceTranscriptWithAi,
  GeminiServiceError,
  ocrScanDocumentWithAi,
} from './geminiService.ts';
import {
  sanitizeRichHtmlServer,
  resolveConfinedTenantFilePath,
  logSecurityAuditEvent,
  getClientIp,
} from './security/securityMiddleware.ts';

export interface SmartNotesAuthRequest extends Request {
  user?: User;
  currentMosque?: Mosque;
}

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const MAX_NOTE_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'docx', 'txt']);

// Sliding-window in-memory rate limiter for AI endpoints (25 req / 5 min per user)
const aiRateBuckets = new Map<string, number[]>();
function checkAiRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 25;
  const timestamps = (aiRateBuckets.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    aiRateBuckets.set(userId, timestamps);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  aiRateBuckets.set(userId, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Strip dangerous scripts, iframes, objects, event handlers, and javascript:/data:text/html URIs
 * while preserving rich text formatting (headings, lists, tables, checklists).
 */
export function sanitizeRichTextHtml(rawHtml: string): string {
  return sanitizeRichHtmlServer(rawHtml, 250000);
}

export function stripHtmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizePathSegment(seg: string): string {
  return String(seg || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function resolveSafeNoteUploadDir(tenantId: string, noteId: string): string {
  const safeNote = sanitizePathSegment(noteId);
  const targetDir = resolveConfinedTenantFilePath(UPLOADS_ROOT, tenantId, 'notes', safeNote);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

function resolveSafeAttachmentFilePath(tenantId: string, noteId: string, storedName: string): string {
  const safeNote = sanitizePathSegment(noteId);
  return resolveConfinedTenantFilePath(UPLOADS_ROOT, tenantId, 'notes', safeNote, storedName);
}

function ensureTenantCategories(tenantId: string): SmartNoteCategory[] {
  const existing = db.smartNoteCategories.filter((c) => c.tenantId === tenantId);
  if (existing.length > 0) {
    return [...existing].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const now = new Date().toISOString();
  const seeded: SmartNoteCategory[] = DEFAULT_SMART_NOTE_CATEGORIES.map((c) => ({
    ...c,
    id: `${c.id}-${tenantId}`,
    tenantId,
    createdBy: 'SYSTEM',
    createdAt: now,
  }));
  db.smartNoteCategories.push(...seeded);
  db.save();
  return seeded;
}

function isCommitteeParticipant(user: User, tenantId: string): boolean {
  if (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MOSQUE_ADMIN' ||
    user.role === 'COMMITTEE_ADMIN' ||
    user.role === 'ACCOUNTANT' ||
    user.role === 'TREASURER' ||
    user.role === 'AUDITOR'
  ) {
    return true;
  }
  return db.committeeMembers.some(
    (m) =>
      m.mosqueId === tenantId &&
      m.status === 'ACTIVE' &&
      ((user.phone && m.phone === user.phone) || (user.email && m.email && m.email.toLowerCase() === user.email.toLowerCase()))
  );
}

function canAccessNote(note: SmartNote, user: User, tenantId: string): boolean {
  if (note.tenantId !== tenantId) return false;
  if (note.ownerId === user.id) return true;
  if (note.privacyMode === 'PRIVATE') {
    return false; // Strictly personal to owner
  }
  if (note.privacyMode === 'SHARED_SELECTED') {
    if (note.sharedWith.some((s) => s.userId === user.id)) return true;
    return false;
  }
  if (note.privacyMode === 'COMMITTEE_SHARED') {
    return isCommitteeParticipant(user, tenantId) || note.sharedWith.some((s) => s.userId === user.id);
  }
  return false;
}

function canEditNote(note: SmartNote, user: User, tenantId: string): boolean {
  if (note.tenantId !== tenantId) return false;
  if (note.ownerId === user.id) return true;
  if (note.privacyMode === 'PRIVATE') return false;
  const shareEntry = note.sharedWith.find((s) => s.userId === user.id);
  if (shareEntry && shareEntry.accessRole === 'EDITOR') return true;
  if (note.privacyMode === 'COMMITTEE_SHARED') {
    if (user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN' || user.role === 'COMMITTEE_ADMIN') {
      return true;
    }
  }
  return false;
}

function canCommentNote(note: SmartNote, user: User, tenantId: string): boolean {
  if (!canAccessNote(note, user, tenantId)) return false;
  if (canEditNote(note, user, tenantId)) return true;
  const shareEntry = note.sharedWith.find((s) => s.userId === user.id);
  if (shareEntry && (shareEntry.accessRole === 'COMMENTER' || shareEntry.accessRole === 'EDITOR')) {
    return true;
  }
  if (note.privacyMode === 'COMMITTEE_SHARED' && user.role !== 'VIEWER') {
    return true;
  }
  return false;
}

function canDeleteOrShareNote(note: SmartNote, user: User, tenantId: string): boolean {
  if (note.tenantId !== tenantId) return false;
  if (note.ownerId === user.id) return true;
  if (note.privacyMode !== 'PRIVATE' && (user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN')) {
    return true;
  }
  return false;
}

function decorateNoteForUser(note: SmartNote, user: User, tenantId: string): SmartNote {
  return {
    ...note,
    canEdit: canEditNote(note, user, tenantId),
    canDelete: canDeleteOrShareNote(note, user, tenantId),
    canShare: canDeleteOrShareNote(note, user, tenantId),
    canComment: canCommentNote(note, user, tenantId),
  };
}

function recordNoteActivity(
  noteId: string,
  tenantId: string,
  user: User,
  action: SmartNoteActivity['action'],
  detailsBn: string
) {
  const entry: SmartNoteActivity = {
    id: `nact-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    noteId,
    tenantId,
    actorId: user.id,
    actorName: user.name,
    action,
    detailsBn,
    createdAt: new Date().toISOString(),
  };
  db.smartNoteActivities.unshift(entry);
  // Keep latest 100 activities per note to avoid unbounded JSON bloat
  const noteActs = db.smartNoteActivities.filter((a) => a.noteId === noteId && a.tenantId === tenantId);
  if (noteActs.length > 100) {
    const keepIds = new Set(noteActs.slice(0, 100).map((a) => a.id));
    db.smartNoteActivities = db.smartNoteActivities.filter(
      (a) => !(a.noteId === noteId && a.tenantId === tenantId) || keepIds.has(a.id)
    );
  }
}

function saveNoteVersionSnapshot(note: SmartNote, user: User, changeSummary: string) {
  const snapshot: SmartNoteVersion = {
    id: `nver-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    noteId: note.id,
    tenantId: note.tenantId,
    versionNumber: note.version,
    title: note.title,
    contentHtml: note.contentHtml,
    plainText: note.plainText,
    categoryId: note.categoryId,
    noteType: note.noteType,
    savedBy: user.id,
    savedByName: user.name,
    changeSummary,
    createdAt: new Date().toISOString(),
  };
  db.smartNoteVersions.unshift(snapshot);
  // Cap version history at latest 30 per note
  const versionsForNote = db.smartNoteVersions.filter((v) => v.noteId === note.id && v.tenantId === note.tenantId);
  if (versionsForNote.length > 30) {
    const keepIds = new Set(versionsForNote.slice(0, 30).map((v) => v.id));
    db.smartNoteVersions = db.smartNoteVersions.filter(
      (v) => !(v.noteId === note.id && v.tenantId === note.tenantId) || keepIds.has(v.id)
    );
  }
}

// Configure Multer disk storage for note attachments (NO Base64 in JSON)
const attachmentStorage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    try {
      const tenantId = req.currentMosque?.id;
      const noteId = req.params?.id;
      if (!tenantId || !noteId) {
        return cb(new Error('INVALID_TENANT_OR_NOTE'), '');
      }
      const dir = resolveSafeNoteUploadDir(tenantId, noteId);
      cb(null, dir);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeUnique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeUnique);
  },
});

const uploadMiddleware = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: MAX_NOTE_ATTACHMENT_BYTES,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    const mimeOk = ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype);
    const extOk = ALLOWED_ATTACHMENT_EXTENSIONS.has(ext);
    if (!mimeOk || !extOk) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

const ocrFileMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_NOTE_ATTACHMENT_BYTES,
    files: 6,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_OCR_FILE_TYPE'));
    }
    cb(null, true);
  },
});

export function createSmartNotesRouter(
  authenticate: (req: Request, res: Response, next: NextFunction) => any
): Router {
  const router = Router();

  const requireNoteWritePermission = (req: SmartNotesAuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'অনুগ্রহ করে লগইন করুন।' } });
    }
    if (user.role === 'VIEWER' && !user.permissions?.includes('CREATE_SMART_NOTE')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'নতুন নোট তৈরি বা সম্পাদনার অনুমতি আপনার নেই।' },
      });
    }
    next();
  };

  // 1. Get Categories (12 defaults + tenant custom)
  router.get('/notes/categories', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const categories = ensureTenantCategories(tenantId);
    res.json({ success: true, data: categories });
  });

  // 2. Create Custom Category
  router.post('/notes/categories', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const { nameBn, nameEn, colorHex, icon } = req.body || {};

    if (!nameBn || !String(nameBn).trim()) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'ক্যাটাগরির বাংলা নাম প্রদান করুন।' } });
    }

    const categories = ensureTenantCategories(tenantId);
    const duplicate = categories.find((c) => c.nameBn.trim() === String(nameBn).trim());
    if (duplicate) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_CATEGORY', message: 'এই নামে ক্যাটাগরি ইতোমধ্যে রয়েছে।' } });
    }

    const newCat: SmartNoteCategory = {
      id: `cat-note-custom-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      tenantId,
      nameBn: String(nameBn).trim().slice(0, 60),
      nameEn: nameEn ? String(nameEn).trim().slice(0, 60) : undefined,
      colorHex: colorHex || '#0f766e',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-300',
      textClass: 'text-emerald-900',
      icon: icon ? String(icon).slice(0, 4) : '🏷️',
      sortOrder: categories.length + 1,
      isDefault: false,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    db.smartNoteCategories.push(newCat);
    db.save();
    res.json({ success: true, data: newCat, message: 'নতুন কাস্টম ক্যাটাগরি যুক্ত হয়েছে।' });
  });

  // 3. Get Summary Stats
  router.get('/notes/stats', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const accessible = db.smartNotes.filter((n) => canAccessNote(n, user, tenantId));
    const active = accessible.filter((n) => n.status === 'ACTIVE');

    const pendingRemindersCount = db.smartNoteReminders.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.status === 'PENDING' &&
        (r.ownerId === user.id || r.assignedToUserId === user.id || accessible.some((n) => n.id === r.noteId))
    ).length;

    const stats: SmartNoteStats = {
      totalActive: active.length,
      personalCount: active.filter((n) => n.privacyMode === 'PRIVATE').length,
      sharedSelectedCount: active.filter((n) => n.privacyMode === 'SHARED_SELECTED').length,
      committeeSharedCount: active.filter((n) => n.privacyMode === 'COMMITTEE_SHARED').length,
      pinnedCount: active.filter((n) => n.isPinned).length,
      favoriteCount: active.filter((n) => n.isFavorite).length,
      archivedCount: accessible.filter((n) => n.status === 'ARCHIVED').length,
      trashedCount: accessible.filter((n) => n.status === 'TRASHED').length,
      pendingRemindersCount,
    };

    res.json({ success: true, data: stats });
  });

  // 4. List Mosque Users for Sharing Picker
  router.get('/notes/share-candidates', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const candidates = db.users
      .filter((u) => u.mosqueId === tenantId && u.status === 'ACTIVE' && u.id !== user.id)
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        phone: u.phone,
      }));
    res.json({ success: true, data: candidates });
  });

  // 5. List Reminders
  router.get('/notes/reminders/list', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const accessibleIds = new Set(db.smartNotes.filter((n) => canAccessNote(n, user, tenantId)).map((n) => n.id));
    const reminders = db.smartNoteReminders
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          (r.ownerId === user.id || r.assignedToUserId === user.id || accessibleIds.has(r.noteId))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: reminders });
  });

  router.patch('/notes/reminders/:reminderId', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const rem = db.smartNoteReminders.find((r) => r.id === req.params.reminderId && r.tenantId === tenantId);
    if (!rem) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'অনুস্মারক পাওয়া যায়নি।' } });
    }
    const note = db.smartNotes.find((n) => n.id === rem.noteId && n.tenantId === tenantId);
    if (rem.ownerId !== user.id && rem.assignedToUserId !== user.id && (!note || !canAccessNote(note, user, tenantId))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
    }
    const nextStatus = req.body?.status === 'DONE' ? 'DONE' : 'PENDING';
    rem.status = nextStatus;
    rem.completedAt = nextStatus === 'DONE' ? new Date().toISOString() : undefined;
    db.save();
    res.json({ success: true, data: rem });
  });

  // 6. List Notes (with Filters & Multi-Tenant / Privacy Filtering)
  router.get('/notes', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    ensureTenantCategories(tenantId);

    const {
      status = 'ACTIVE',
      categoryId,
      noteType,
      privacyMode,
      tag,
      search,
      pinnedOnly,
      favoriteOnly,
      dateFrom,
      dateTo,
    } = req.query as Record<string, string | undefined>;

    let notes = db.smartNotes.filter((n) => canAccessNote(n, user, tenantId));

    if (status && status !== 'ALL') {
      notes = notes.filter((n) => n.status === status);
    }
    if (categoryId && categoryId !== 'ALL') {
      notes = notes.filter((n) => n.categoryId === categoryId);
    }
    if (noteType && noteType !== 'ALL') {
      notes = notes.filter((n) => n.noteType === noteType);
    }
    if (privacyMode && privacyMode !== 'ALL') {
      notes = notes.filter((n) => n.privacyMode === privacyMode);
    }
    if (pinnedOnly === 'true') {
      notes = notes.filter((n) => n.isPinned);
    }
    if (favoriteOnly === 'true') {
      notes = notes.filter((n) => n.isFavorite);
    }
    if (tag && tag.trim()) {
      const qTag = tag.trim().toLowerCase();
      notes = notes.filter((n) => Array.isArray(n.tags) && n.tags.some((t) => t.toLowerCase().includes(qTag)));
    }
    if (dateFrom) {
      notes = notes.filter((n) => n.updatedAt.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      notes = notes.filter((n) => n.updatedAt.slice(0, 10) <= dateTo);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      notes = notes.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.plainText || '').toLowerCase().includes(q) ||
          (n.categoryNameBn || '').toLowerCase().includes(q) ||
          (n.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    res.json({
      success: true,
      data: notes.map((n) => decorateNoteForUser(n, user, tenantId)),
    });
  });

  // 7. Get Single Note
  router.get('/notes/:id', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const rawNote = db.smartNotes.find((n) => n.id === req.params.id);
    if (!rawNote) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোট পাওয়া যায়নি।' } });
    }
    if (rawNote.tenantId !== tenantId) {
      logSecurityAuditEvent({
        mosqueId: tenantId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'CROSS_TENANT_NOTE_DENIED',
        details: `অন্য মসজিদের স্মার্ট নোট অ্যাক্সেস চেষ্টা প্রতিহত (${req.params.id})`,
        recordId: req.params.id,
        ipAddress: getClientIp(req),
        status: 'FAILED',
      });
      return res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'অন্য মসজিদের নোট দেখার অনুমতি নেই।' } });
    }
    if (!canAccessNote(rawNote, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'এই নোট দেখার অনুমতি আপনার নেই।' } });
    }
    res.json({ success: true, data: decorateNoteForUser(rawNote, user, tenantId) });
  });

  // 8. Create Note
  router.post('/notes', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const categories = ensureTenantCategories(tenantId);
    const body = req.body || {};

    const cleanHtml = sanitizeRichTextHtml(String(body.contentHtml || '<p></p>'));
    const plainText = stripHtmlToPlainText(cleanHtml);
    const title = String(body.title || '').trim() || 'শিরোনামহীন খসড়া নোট';

    const matchedCategory =
      categories.find((c) => c.id === body.categoryId) ||
      categories.find((c) => c.nameBn === body.categoryNameBn) ||
      categories[9] ||
      categories[0];

    const privacyMode: SmartNotePrivacyMode =
      body.privacyMode === 'SHARED_SELECTED' || body.privacyMode === 'COMMITTEE_SHARED'
        ? body.privacyMode
        : 'PRIVATE';

    const sharedWith: SmartNoteShareEntry[] = Array.isArray(body.sharedWith)
      ? body.sharedWith
          .filter((s: any) => s && s.userId && db.users.some((u) => u.id === s.userId && u.mosqueId === tenantId))
          .map((s: any) => ({
            userId: String(s.userId),
            userName: String(s.userName || 'ব্যবহারকারী'),
            userRole: s.userRole ? String(s.userRole) : undefined,
            accessRole: s.accessRole === 'EDITOR' || s.accessRole === 'COMMENTER' ? s.accessRole : 'VIEWER',
            addedAt: s.addedAt || new Date().toISOString(),
            addedBy: user.id,
          }))
      : [];

    const now = new Date().toISOString();
    const newNote: SmartNote = {
      id: `note-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      tenantId,
      mosqueId: tenantId,
      ownerId: user.id,
      ownerName: user.name,
      title: title.slice(0, 220),
      contentHtml: cleanHtml,
      plainText,
      categoryId: matchedCategory.id,
      categoryNameBn: matchedCategory.nameBn,
      categoryColorHex: matchedCategory.colorHex,
      noteType: (body.noteType || 'QUICK_NOTE') as SmartNoteType,
      tags: Array.isArray(body.tags)
        ? Array.from(new Set<string>(body.tags.map((t: any) => String(t).trim()).filter(Boolean))).slice(0, 20)
        : [],
      privacyMode,
      sharedWith,
      isPinned: Boolean(body.isPinned),
      isFavorite: Boolean(body.isFavorite),
      status: 'ACTIVE',
      attachments: [],
      version: 1,
      aiAssisted: Boolean(body.aiAssisted),
      sourceChannel: body.sourceChannel || 'WEB',
      createdAt: now,
      updatedAt: now,
      lastEditedBy: user.id,
      lastEditedByName: user.name,
    };

    db.smartNotes.unshift(newNote);
    saveNoteVersionSnapshot(newNote, user, 'প্রাথমিক নোট তৈরি');
    recordNoteActivity(newNote.id, tenantId, user, 'CREATED', `নতুন নোট "${newNote.title}" তৈরি হয়েছে।`);
    db.save();

    db.logAudit(
      tenantId,
      user.id,
      user.name,
      user.role,
      'CREATE',
      'SMART_NOTE',
      `স্মার্ট নোট তৈরি: ${newNote.title}`,
      newNote.id,
      req.ip || '127.0.0.1'
    );

    res.json({ success: true, data: decorateNoteForUser(newNote, user, tenantId), message: 'নোট সফলভাবে সংরক্ষিত হয়েছে।' });
  });

  // 9. Update Note (with optimistic version check & version snapshot)
  router.put('/notes/:id', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);

    if (!note) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোট পাওয়া যায়নি।' } });
    }
    if (!canEditNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'এই নোট সম্পাদনার অনুমতি আপনার নেই।' } });
    }

    const body = req.body || {};
    const categories = ensureTenantCategories(tenantId);

    // Optional conflict check if caller sends expectedVersion and explicit checkVersion flag
    if (body.checkVersion && typeof body.expectedVersion === 'number' && body.expectedVersion !== note.version) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: 'অন্য সেশন বা ব্যবহারকারী এই নোটটি ইতোমধ্যে পরিবর্তন করেছেন। অনুগ্রহ করে রিফ্রেশ করে আবার চেষ্টা করুন।',
        },
        data: decorateNoteForUser(note, user, tenantId),
      });
    }

    let meaningfulContentChange = false;

    if (body.title !== undefined) {
      const nextTitle = String(body.title).trim().slice(0, 220) || 'শিরোনামহীন খসড়া নোট';
      if (nextTitle !== note.title) meaningfulContentChange = true;
      note.title = nextTitle;
    }

    if (body.contentHtml !== undefined) {
      const cleanHtml = sanitizeRichTextHtml(String(body.contentHtml));
      if (cleanHtml !== note.contentHtml) meaningfulContentChange = true;
      note.contentHtml = cleanHtml;
      note.plainText = stripHtmlToPlainText(cleanHtml);
    }

    if (body.categoryId !== undefined) {
      const cat = categories.find((c) => c.id === body.categoryId);
      if (cat) {
        note.categoryId = cat.id;
        note.categoryNameBn = cat.nameBn;
        note.categoryColorHex = cat.colorHex;
      }
    }

    if (body.noteType !== undefined) {
      note.noteType = body.noteType as SmartNoteType;
    }

    if (Array.isArray(body.tags)) {
      note.tags = Array.from(new Set<string>(body.tags.map((t: any) => String(t).trim()).filter(Boolean))).slice(0, 20);
    }

    if (body.isPinned !== undefined) note.isPinned = Boolean(body.isPinned);
    if (body.isFavorite !== undefined) note.isFavorite = Boolean(body.isFavorite);
    if (body.aiAssisted !== undefined) note.aiAssisted = Boolean(body.aiAssisted);

    if (body.status !== undefined && ['ACTIVE', 'ARCHIVED', 'TRASHED'].includes(body.status)) {
      const prevStatus = note.status;
      note.status = body.status as SmartNoteStatus;
      const nowIso = new Date().toISOString();
      if (note.status === 'ARCHIVED') note.archivedAt = nowIso;
      if (note.status === 'TRASHED') note.trashedAt = nowIso;
      if (note.status === 'ACTIVE') {
        note.archivedAt = undefined;
        note.trashedAt = undefined;
      }
      if (prevStatus !== note.status) {
        const actType = note.status === 'ARCHIVED' ? 'ARCHIVED' : note.status === 'TRASHED' ? 'TRASHED' : 'RESTORED';
        recordNoteActivity(note.id, tenantId, user, actType, `নোটের অবস্থা পরিবর্তন: ${prevStatus} → ${note.status}`);
      }
    }

    const now = new Date().toISOString();
    if (meaningfulContentChange) {
      note.version = (note.version || 1) + 1;
      // Only create version snapshot on explicit save or when > 45s elapsed since last snapshot
      const latestVer = db.smartNoteVersions.find((v) => v.noteId === note.id && v.tenantId === tenantId);
      const elapsedMs = latestVer ? Date.now() - new Date(latestVer.createdAt).getTime() : Infinity;
      if (body.createSnapshot === true || elapsedMs > 45000) {
        saveNoteVersionSnapshot(note, user, body.changeSummary || 'নোট হালনাগাদ');
      }
      if (body.createSnapshot === true) {
        recordNoteActivity(note.id, tenantId, user, 'UPDATED', `"${note.title}" সংরক্ষণ ও সংস্করণ #${note.version} তৈরি।`);
      }
    }

    note.updatedAt = now;
    note.lastEditedBy = user.id;
    note.lastEditedByName = user.name;
    db.save();

    res.json({
      success: true,
      data: decorateNoteForUser(note, user, tenantId),
      message: 'নোট সংরক্ষিত হয়েছে।',
    });
  });

  // 10. Share & Privacy Update
  router.put('/notes/:id/sharing', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);

    if (!note) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোট পাওয়া যায়নি।' } });
    }
    if (!canDeleteOrShareNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'শেয়ারিং ও প্রাইভেসি পরিবর্তনের অনুমতি নেই।' } });
    }

    const { privacyMode, sharedWith } = req.body || {};
    if (!['PRIVATE', 'SHARED_SELECTED', 'COMMITTEE_SHARED'].includes(privacyMode)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PRIVACY_MODE', message: 'অবৈধ প্রাইভেসি মোড।' } });
    }

    const validShared: SmartNoteShareEntry[] = Array.isArray(sharedWith)
      ? sharedWith
          .filter((s: any) => s && s.userId && s.userId !== note.ownerId)
          .map((s: any) => {
            const targetUser = db.users.find((u) => u.id === s.userId && u.mosqueId === tenantId);
            if (!targetUser) return null;
            return {
              userId: targetUser.id,
              userName: targetUser.name,
              userRole: targetUser.role,
              accessRole: s.accessRole === 'EDITOR' || s.accessRole === 'COMMENTER' ? s.accessRole : 'VIEWER',
              addedAt: s.addedAt || new Date().toISOString(),
              addedBy: user.id,
            };
          })
          .filter(Boolean) as SmartNoteShareEntry[]
      : note.sharedWith;

    const prevMode = note.privacyMode;
    note.privacyMode = privacyMode;
    note.sharedWith = privacyMode === 'PRIVATE' ? [] : validShared;
    note.updatedAt = new Date().toISOString();

    recordNoteActivity(
      note.id,
      tenantId,
      user,
      prevMode !== privacyMode ? 'PRIVACY_CHANGED' : 'SHARED',
      `প্রাইভেসি সেটিংস হালনাগাদ: ${privacyMode} (শেয়ারকৃত সদস্য: ${note.sharedWith.length} জন)`
    );
    db.save();

    res.json({
      success: true,
      data: decorateNoteForUser(note, user, tenantId),
      message: 'প্রাইভেসি ও শেয়ারিং সেটিংস সফলভাবে আপডেট হয়েছে।',
    });
  });

  // 11. Delete Note (Soft Trash or Permanent Delete with Disk Attachment Cleanup)
  router.delete('/notes/:id', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const idx = db.smartNotes.findIndex((n) => n.id === req.params.id && n.tenantId === tenantId);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোট পাওয়া যায়নি।' } });
    }
    const note = db.smartNotes[idx];
    if (!canDeleteOrShareNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'এই নোট মুছে ফেলার অনুমতি আপনার নেই।' } });
    }

    const permanent = req.query.permanent === 'true' || note.status === 'TRASHED';
    if (!permanent) {
      note.status = 'TRASHED';
      note.trashedAt = new Date().toISOString();
      note.updatedAt = note.trashedAt;
      recordNoteActivity(note.id, tenantId, user, 'TRASHED', 'নোটটি ট্র্যাশে সরানো হয়েছে।');
      db.save();
      return res.json({ success: true, data: decorateNoteForUser(note, user, tenantId), message: 'নোট ট্র্যাশে পাঠানো হয়েছে।' });
    }

    // Permanent deletion: remove physical files from disk safely
    for (const att of note.attachments || []) {
      try {
        const filePath = resolveSafeAttachmentFilePath(tenantId, note.id, att.storedName);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}
    }
    try {
      const dir = resolveSafeNoteUploadDir(tenantId, note.id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {}

    db.smartNotes.splice(idx, 1);
    db.smartNoteVersions = db.smartNoteVersions.filter((v) => !(v.noteId === note.id && v.tenantId === tenantId));
    db.smartNoteComments = db.smartNoteComments.filter((c) => !(c.noteId === note.id && c.tenantId === tenantId));
    db.smartNoteActivities = db.smartNoteActivities.filter((a) => !(a.noteId === note.id && a.tenantId === tenantId));
    db.smartNoteReminders = db.smartNoteReminders.filter((r) => !(r.noteId === note.id && r.tenantId === tenantId));
    db.save();

    db.logAudit(tenantId, user.id, user.name, user.role, 'DELETE', 'SMART_NOTE', `নোট স্থায়ীভাবে মুছে ফেলা হয়েছে: ${note.title}`, note.id);
    res.json({ success: true, message: 'নোট ও সংযুক্ত ফাইল স্থায়ীভাবে মুছে ফেলা হয়েছে।' });
  });

  // 12. Version History & Restore
  router.get('/notes/:id/versions', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
    if (!note || !canAccessNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই বা নোট পাওয়া যায়নি।' } });
    }
    const versions = db.smartNoteVersions
      .filter((v) => v.noteId === note.id && v.tenantId === tenantId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
    res.json({ success: true, data: versions });
  });

  router.post('/notes/:id/versions/:versionId/restore', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
    if (!note || !canEditNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'নোট রিস্টোর করার অনুমতি নেই।' } });
    }
    const ver = db.smartNoteVersions.find((v) => v.id === req.params.versionId && v.noteId === note.id && v.tenantId === tenantId);
    if (!ver) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নির্বাচিত সংস্করণ পাওয়া যায়নি।' } });
    }

    note.title = ver.title;
    note.contentHtml = sanitizeRichTextHtml(ver.contentHtml);
    note.plainText = stripHtmlToPlainText(note.contentHtml);
    note.categoryId = ver.categoryId;
    note.noteType = ver.noteType;
    note.version = (note.version || 1) + 1;
    note.updatedAt = new Date().toISOString();
    note.lastEditedBy = user.id;
    note.lastEditedByName = user.name;

    saveNoteVersionSnapshot(note, user, `সংস্করণ #${ver.versionNumber} থেকে পুনরুদ্ধার`);
    recordNoteActivity(note.id, tenantId, user, 'RESTORED_VERSION', `পূর্বের সংস্করণ #${ver.versionNumber} রিস্টোর করা হয়েছে।`);
    db.save();

    res.json({
      success: true,
      data: decorateNoteForUser(note, user, tenantId),
      message: `সংস্করণ #${ver.versionNumber} সফলভাবে পুনরুদ্ধার হয়েছে।`,
    });
  });

  // 13. Comments & Activity Feed
  router.get('/notes/:id/comments', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
    if (!note || !canAccessNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
    }
    const comments = db.smartNoteComments
      .filter((c) => c.noteId === note.id && c.tenantId === tenantId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const activities = db.smartNoteActivities
      .filter((a) => a.noteId === note.id && a.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: { comments, activities } });
  });

  router.post('/notes/:id/comments', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
    if (!note || !canCommentNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'মন্তব্য করার অনুমতি নেই।' } });
    }
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ success: false, error: { code: 'EMPTY_COMMENT', message: 'মন্তব্যের লেখা খালি হতে পারবে না।' } });
    }
    const comment: SmartNoteComment = {
      id: `ncmt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      noteId: note.id,
      tenantId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      text: text.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    db.smartNoteComments.push(comment);
    recordNoteActivity(note.id, tenantId, user, 'COMMENTED', `${user.name} একটি মন্তব্য যুক্ত করেছেন।`);
    db.save();
    res.json({ success: true, data: comment, message: 'মন্তব্য যুক্ত হয়েছে।' });
  });

  // 14. Create Task / Reminder from Note
  router.post('/notes/:id/reminders', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
    if (!note || !canAccessNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
    }
    const title = String(req.body?.title || note.title || 'নোট অনুস্মারক').trim();
    const reminder: SmartNoteReminder = {
      id: `nrem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      noteId: note.id,
      tenantId,
      ownerId: user.id,
      title: title.slice(0, 200),
      description: req.body?.description ? String(req.body.description).trim().slice(0, 1000) : note.plainText.slice(0, 300),
      dueDate: req.body?.dueDate || undefined,
      priority: req.body?.priority === 'URGENT' || req.body?.priority === 'HIGH' ? req.body.priority : 'NORMAL',
      status: 'PENDING',
      assignedToUserId: req.body?.assignedToUserId || user.id,
      assignedToName: req.body?.assignedToName || user.name,
      createdAt: new Date().toISOString(),
    };
    db.smartNoteReminders.unshift(reminder);
    recordNoteActivity(note.id, tenantId, user, 'CONVERTED', `কাজ ও অনুস্মারক তৈরি: "${reminder.title}"`);
    db.save();
    res.json({ success: true, data: reminder, message: 'কাজ ও অনুস্মারক সফলভাবে তৈরি হয়েছে।' });
  });

  // 15. Disk File Attachment Upload (Multipart — NO Base64 in JSON!)
  router.post(
    '/notes/:id/attachments',
    authenticate,
    requireNoteWritePermission,
    (req: SmartNotesAuthRequest, res: Response, next: NextFunction) => {
      const tenantId = req.currentMosque!.id;
      const user = req.user!;
      const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
      if (!note || !canEditNote(note, user, tenantId)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'ফাইল সংযুক্ত করার অনুমতি নেই।' } });
      }
      next();
    },
    (req: SmartNotesAuthRequest, res: Response) => {
      uploadMiddleware.array('files', 5)(req, res, (err: any) => {
        if (err) {
          const msg =
            err.message === 'UNSUPPORTED_FILE_TYPE'
              ? 'শুধুমাত্র JPG, PNG, WebP, PDF, DOCX এবং TXT ফাইল আপলোড করা যাবে।'
              : err.code === 'LIMIT_FILE_SIZE'
              ? 'প্রতিটি ফাইলের সর্বোচ্চ সীমা ১০ মেগাবাইট (10MB)।'
              : 'ফাইল আপলোড ব্যর্থ হয়েছে।';
          return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: msg } });
        }

        const tenantId = req.currentMosque!.id;
        const user = req.user!;
        const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
        if (!note) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোট পাওয়া যায়নি।' } });
        }

        const uploaded = ((req as any).files as Express.Multer.File[]) || [];
        if (uploaded.length === 0) {
          return res.status(400).json({ success: false, error: { code: 'NO_FILES', message: 'কোনো ফাইল পাওয়া যায়নি।' } });
        }

        const now = new Date().toISOString();
        const addedAttachments: SmartNoteAttachment[] = uploaded.map((f) => {
          const attId = `natt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          return {
            id: attId,
            noteId: note.id,
            tenantId,
            uploadedBy: user.id,
            uploadedByName: user.name,
            originalName: String(f.originalname || 'attachment').replace(/[^a-zA-Z0-9.\-_ \u0980-\u09FF]/g, '_'),
            storedName: f.filename,
            mimeType: f.mimetype,
            sizeBytes: f.size,
            downloadUrl: `/api/v1/notes/${note.id}/attachments/${attId}/file`,
            createdAt: now,
          };
        });

        note.attachments = [...(note.attachments || []), ...addedAttachments];
        note.updatedAt = now;
        recordNoteActivity(
          note.id,
          tenantId,
          user,
          'ATTACHMENT_ADDED',
          `${addedAttachments.length}টি ফাইল সংযুক্ত করা হয়েছে: ${addedAttachments.map((a) => a.originalName).join(', ')}`
        );
        db.save();

        res.json({
          success: true,
          data: addedAttachments,
          note: decorateNoteForUser(note, user, tenantId),
          message: 'ফাইল সফলভাবে সংযুক্ত হয়েছে।',
        });
      });
    }
  );

  // 16. Authenticated Disk Attachment Download / Preview (Strictly Tenant-Checked & Path-Confined)
  router.get('/notes/:id/attachments/:attId/file', authenticate, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const rawNote = db.smartNotes.find((n) => n.id === req.params.id);
    if (!rawNote) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'নোট পাওয়া যায়নি।' } });
    }
    if (rawNote.tenantId !== tenantId) {
      logSecurityAuditEvent({
        mosqueId: tenantId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'CROSS_TENANT_ATTACHMENT_DENIED',
        details: `অন্য মসজিদের নোট সংযুক্তি ডাউনলোড চেষ্টা প্রতিহত (${req.params.id}/${req.params.attId})`,
        recordId: req.params.attId,
        ipAddress: getClientIp(req),
        status: 'FAILED',
      });
      return res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'অন্য মসজিদের ফাইল দেখার অনুমতি নেই।' } });
    }
    if (!canAccessNote(rawNote, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'ফাইল দেখার অনুমতি নেই।' } });
    }
    const att = (rawNote.attachments || []).find((a) => a.id === req.params.attId);
    if (!att) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সংযুক্ত ফাইল পাওয়া যায়নি।' } });
    }

    try {
      const safePath = resolveSafeAttachmentFilePath(tenantId, rawNote.id, att.storedName);
      if (!fs.existsSync(safePath)) {
        return res.status(404).json({ success: false, error: { code: 'FILE_MISSING_ON_DISK', message: 'ডিস্কে ফাইলটি পাওয়া যায়নি।' } });
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const rawMime = (att.mimeType || 'application/octet-stream').toLowerCase();
      const isDangerousInline = rawMime.includes('html') || rawMime.includes('svg') || rawMime.includes('javascript');
      res.setHeader('Content-Type', isDangerousInline ? 'application/octet-stream' : rawMime);
      const disposition = isDangerousInline || req.query.download === 'true' ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(att.originalName)}`);
      return res.sendFile(safePath);
    } catch {
      logSecurityAuditEvent({
        mosqueId: tenantId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'PATH_TRAVERSAL_BLOCKED',
        details: `সন্দেহজনক ফাইল পাথ অনুরোধ ব্লক করা হয়েছে (${req.params.id}/${req.params.attId})`,
        recordId: req.params.attId,
        ipAddress: getClientIp(req),
        status: 'FAILED',
      });
      return res.status(400).json({ success: false, error: { code: 'INVALID_PATH', message: 'অবৈধ ফাইল পাথ।' } });
    }
  });

  // 17. Delete Attachment
  router.delete('/notes/:id/attachments/:attId', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const user = req.user!;
    const note = db.smartNotes.find((n) => n.id === req.params.id && n.tenantId === tenantId);
    if (!note || !canEditNote(note, user, tenantId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
    }
    const attIdx = (note.attachments || []).findIndex((a) => a.id === req.params.attId);
    if (attIdx === -1) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'সংযুক্তি পাওয়া যায়নি।' } });
    }
    const [removed] = note.attachments.splice(attIdx, 1);
    try {
      const safePath = resolveSafeAttachmentFilePath(tenantId, note.id, removed.storedName);
      if (fs.existsSync(safePath)) fs.unlinkSync(safePath);
    } catch (_) {}

    note.updatedAt = new Date().toISOString();
    recordNoteActivity(note.id, tenantId, user, 'ATTACHMENT_REMOVED', `সংযুক্তি মুছে ফেলা হয়েছে: ${removed.originalName}`);
    db.save();

    res.json({ success: true, data: decorateNoteForUser(note, user, tenantId), message: 'সংযুক্তি অপসারণ করা হয়েছে।' });
  });

  // ==========================================
  // SMART NOTES AI ENDPOINTS (Using Central aiConfig.ts + Gemini)
  // ==========================================

  // A. Voice Transcript Punctuation & Spelling Fix
  router.post('/ai/notes/voice-format', authenticate, requireNoteWritePermission, async (req: SmartNotesAuthRequest, res: Response) => {
    const user = req.user!;
    const rl = checkAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর আবার AI ব্যবহার করুন।` },
      });
    }
    try {
      const result = await formatVoiceTranscriptWithAi(req.currentMosque || null, req.body || {});
      return res.json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof GeminiServiceError ? err.statusCode : 500;
      return res.status(status).json({
        success: false,
        error: { code: err?.code || 'AI_VOICE_ERROR', message: err?.message || 'ভয়েস লেখা সংশোধনে ত্রুটি হয়েছে।' },
      });
    }
  });

  // B. Camera Scanner & Document OCR (Supports Multipart Files OR Direct Cropped Image Payload)
  router.post('/ai/notes/ocr', authenticate, requireNoteWritePermission, (req: SmartNotesAuthRequest, res: Response) => {
    const user = req.user!;
    const rl = checkAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর আবার AI OCR ব্যবহার করুন।` },
      });
    }

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      ocrFileMemoryUpload.array('files', 6)(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({
            success: false,
            error: { code: 'OCR_UPLOAD_ERROR', message: 'শুধুমাত্র JPG, PNG, WebP বা PDF ফাইল (সর্বোচ্চ ১০MB) স্ক্যান করা যাবে।' },
          });
        }
        try {
          const uploaded = ((req as any).files as Express.Multer.File[]) || [];
          const filesPayload = uploaded.map((f) => ({
            mimeType: f.mimetype,
            base64Data: f.buffer.toString('base64'),
            fileName: f.originalname,
          }));
          const result = await ocrScanDocumentWithAi(req.currentMosque || null, {
            files: filesPayload,
            outputMode: (req.body?.outputMode as any) || 'SCAN_TO_SMART_NOTE',
            customHint: req.body?.customHint,
          });
          return res.json({ success: true, data: result });
        } catch (aiErr: any) {
          const status = aiErr instanceof GeminiServiceError ? aiErr.statusCode : 500;
          return res.status(status).json({
            success: false,
            error: { code: aiErr?.code || 'OCR_AI_ERROR', message: aiErr?.message || 'OCR বিশ্লেষণে ত্রুটি হয়েছে।' },
          });
        }
      });
      return;
    }

    (async () => {
      try {
        const result = await ocrScanDocumentWithAi(req.currentMosque || null, req.body || {});
        return res.json({ success: true, data: result });
      } catch (aiErr: any) {
        const status = aiErr instanceof GeminiServiceError ? aiErr.statusCode : 500;
        return res.status(status).json({
          success: false,
          error: { code: aiErr?.code || 'OCR_AI_ERROR', message: aiErr?.message || 'OCR বিশ্লেষণে ত্রুটি হয়েছে।' },
        });
      }
    })();
  });

  // C. Smart Note AI Writing Assistant (Polish, Official, Summarize, Expand, Minutes, Action Items, Translate)
  router.post('/ai/notes/assist', authenticate, requireNoteWritePermission, async (req: SmartNotesAuthRequest, res: Response) => {
    const user = req.user!;
    const rl = checkAiRateLimit(user.id);
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: `অনুগ্রহ করে ${rl.retryAfterSec} সেকেন্ড পর আবার AI সহকারী ব্যবহার করুন।` },
      });
    }
    try {
      const result = await assistSmartNoteWithAi(req.currentMosque || null, req.body || {});
      return res.json({ success: true, data: result });
    } catch (err: any) {
      const status = err instanceof GeminiServiceError ? err.statusCode : 500;
      return res.status(status).json({
        success: false,
        error: { code: err?.code || 'AI_NOTE_ASSIST_ERROR', message: err?.message || 'AI সহায়তায় ত্রুটি হয়েছে।' },
      });
    }
  });

  return router;
}

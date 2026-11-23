import { Request, Response, NextFunction, Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from './db.ts';
import { Mosque, User, Permission, BackupRecord } from '../types/index.ts';
import {
  AutoBackupFrequency,
  AutoBackupScheduleConfig,
  AutoBackupSnapshotMeta,
  AutoBackupSnapshotPreview,
  AutoBackupTriggerType,
  AutomationExecutionLog,
  AutomationReminderCategory,
  DetectedAutomationReminder,
  NotificationDraftChannel,
  NotificationDraftQueueItem,
} from '../types/automationTypes.ts';
import {
  generateAutomationReminderDraftWithAi,
  GeminiServiceError,
} from './geminiService.ts';
import {
  enforceTenantOwnershipOrRespond,
  getClientIp,
  logSecurityAuditEvent,
  resolveConfinedTenantFilePath,
} from './security/securityMiddleware.ts';

export interface AutomationAuthRequest extends Request {
  user?: User;
  currentMosque?: Mosque;
}

const AUTO_BACKUP_ROOT = path.resolve(process.cwd(), 'data', 'auto_backups');

const MODULE_LABELS_BN: Record<string, string> = {
  accounts: 'ক্যাশ ও ব্যাংক অ্যাকাউন্ট',
  accountHeads: 'হিসাব খাত (COA)',
  incomeEntries: 'আয় ভাউচার',
  expenseEntries: 'ব্যয় ভাউচার',
  donations: 'অনুদান রেকর্ড',
  donationBoxes: 'দানবাক্স',
  donationBoxCollections: 'দানবাক্স সংগ্রহ',
  committeeTerms: 'কমিটি মেয়াদ',
  committeeMembers: 'কমিটি সদস্য',
  committeeMeetings: 'কমিটি মিটিং',
  committeeResolutions: 'রেজুলেশন',
  staffList: 'ইমাম ও স্টাফ',
  staffPayments: 'বেতন ও ভাতা',
  assets: 'সম্পদ রেজিস্টার',
  properties: 'ওয়াকফ সম্পত্তি ও ভাড়াটিয়া',
  cemeteryRecords: 'কবরস্থান রেকর্ড',
  notices: 'মসজিদ নোটিশ',
  centralDocuments: 'সেন্ট্রাল ডকুমেন্ট',
  officialDocuments: 'দাপ্তরিক নথি',
  persons: 'মুসল্লি ও দাতা',
  donationPlans: 'নিয়মিত চাঁদা পরিকল্পনা',
  donationCollections: 'চাঁদা সংগ্রহ',
  bookTitles: 'পাঠাগার বই',
  bookIssues: 'বই ইস্যু ও ফেরত',
  smartNotes: 'স্মার্ট নোটস',
};

const TENANT_COLLECTION_KEYS = Object.keys(MODULE_LABELS_BN);

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFileAtomically(targetPath: string, content: string) {
  ensureDirExists(path.dirname(targetPath));
  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  const fd = fs.openSync(tmpPath, 'w', 0o600);
  try {
    fs.writeFileSync(fd, content, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, targetPath);
}

function toBnDigits(input: string | number): string {
  const map: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };
  return String(input).replace(/[0-9]/g, (d) => map[d] || d);
}

function formatTakaBn(amount: number): string {
  return `${toBnDigits(Math.round(amount).toLocaleString('en-IN'))} টাকা`;
}

function parseIsoDateOnly(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const parsed = new Date(`${clean}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDaysFromToday(targetDate: Date, todayUtc: Date): number {
  return Math.round((targetDate.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000));
}

export function appendAutomationLog(params: {
  tenantId: string;
  category: AutomationExecutionLog['category'];
  actionBn: string;
  status: AutomationExecutionLog['status'];
  detailsBn: string;
  actorId: string;
  actorName: string;
  recordId?: string;
}): AutomationExecutionLog {
  const entry: AutomationExecutionLog = {
    id: `autolog-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    tenantId: params.tenantId,
    mosqueId: params.tenantId,
    category: params.category,
    actionBn: params.actionBn,
    status: params.status,
    detailsBn: params.detailsBn,
    actorId: params.actorId,
    actorName: params.actorName,
    recordId: params.recordId,
    createdAt: new Date().toISOString(),
  };

  db.automationLogs.unshift(entry);
  // Keep latest 250 automation logs per tenant to keep JSON lightweight
  const tenantLogs = db.automationLogs.filter((l) => l.tenantId === params.tenantId);
  if (tenantLogs.length > 250) {
    const keepIds = new Set(tenantLogs.slice(0, 250).map((l) => l.id));
    db.automationLogs = db.automationLogs.filter(
      (l) => l.tenantId !== params.tenantId || keepIds.has(l.id)
    );
  }
  return entry;
}

export function computeNextScheduledTime(config: AutoBackupScheduleConfig): string | undefined {
  if (!config.enabled) return undefined;
  const now = new Date();
  const [hhStr, mmStr] = String(config.preferredTime || '23:30').split(':');
  const hh = Math.min(23, Math.max(0, Number(hhStr) || 23));
  const mm = Math.min(59, Math.max(0, Number(mmStr) || 30));

  const next = new Date(now.getTime());
  next.setHours(hh, mm, 0, 0);

  if (config.frequency === 'DAILY') {
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  if (config.frequency === 'WEEKLY') {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = Math.max(0, dayOrder.indexOf(config.weeklyDay || 'Friday'));
    const currentDay = next.getDay();
    let delta = (targetDay - currentDay + 7) % 7;
    if (delta === 0 && next.getTime() <= now.getTime()) {
      delta = 7;
    }
    next.setDate(next.getDate() + delta);
    return next.toISOString();
  }

  // MONTHLY
  const targetDate = Math.min(28, Math.max(1, Number(config.monthlyDay) || 1));
  next.setDate(targetDate);
  if (next.getTime() <= now.getTime()) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(targetDate);
  }
  return next.toISOString();
}

export function getTenantAutoBackupConfig(tenantId: string): AutoBackupScheduleConfig {
  const existing = db.backupSettings[tenantId];
  const base: AutoBackupScheduleConfig = {
    tenantId,
    mosqueId: tenantId,
    enabled: Boolean(existing?.automaticBackupEnabled ?? false),
    frequency: (existing?.frequency || 'DAILY') as AutoBackupFrequency,
    preferredTime: existing?.preferredTime || '23:30',
    weeklyDay: existing?.weeklyDay || 'Friday',
    monthlyDay: Number(existing?.monthlyDay || 1),
    retentionCount: Math.min(90, Math.max(3, Number(existing?.retentionCount ?? 15))),
    lastRunAt: existing?.lastRunAt,
    lastRunStatus:
      existing?.lastRunStatus === 'SUCCESS' || existing?.lastRunStatus === 'FAILED'
        ? existing.lastRunStatus
        : undefined,
  };
  base.nextScheduledAt = computeNextScheduledTime(base);
  return base;
}

function buildTenantBackupPayload(mosque: Mosque, actor: { id: string; name: string }, triggerType: AutoBackupTriggerType) {
  const mosqueId = mosque.id;
  const data: Record<string, any[]> = {};
  const moduleCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const key of TENANT_COLLECTION_KEYS) {
    const rawArr = Array.isArray((db as any)[key]) ? ((db as any)[key] as any[]) : [];
    const filtered = rawArr.filter((item) => item && (item.mosqueId === mosqueId || item.tenantId === mosqueId));
    data[key] = filtered;
    moduleCounts[key] = filtered.length;
    totalRecords += filtered.length;
  }

  return {
    payload: {
      app: 'MasjidLedger Pro',
      version: '2.6.0',
      snapshotFormat: 'AUTO_BACKUP_V1',
      tenantId: mosqueId,
      mosqueId,
      triggerType,
      exportedAt: new Date().toISOString(),
      exportedBy: actor.name,
      mosque: { ...mosque },
      data,
    },
    moduleCounts,
    totalRecords,
  };
}

function resolveSnapshotPath(tenantId: string, fileName: string): string {
  return resolveConfinedTenantFilePath(AUTO_BACKUP_ROOT, tenantId, fileName);
}

export function createTenantBackupSnapshot(
  mosque: Mosque,
  actor: { id: string; name: string; role: string },
  triggerType: AutoBackupTriggerType,
  noteBn?: string
): { ok: true; snapshot: AutoBackupSnapshotMeta } | { ok: false; errorMessage: string; snapshot: AutoBackupSnapshotMeta } {
  const tenantId = mosque.id;
  const nowIso = new Date().toISOString();
  const snapshotId = `snap-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const safeStamp = nowIso.replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `snapshot_${triggerType.toLowerCase()}_${safeStamp}_${snapshotId.slice(-6)}.json`;
  const cfg = getTenantAutoBackupConfig(tenantId);

  try {
    const { payload, moduleCounts, totalRecords } = buildTenantBackupPayload(mosque, actor, triggerType);
    const jsonString = JSON.stringify(payload, null, 2);
    const sizeBytes = Buffer.byteLength(jsonString, 'utf-8');
    const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');

    const targetPath = resolveSnapshotPath(tenantId, fileName);
    writeFileAtomically(targetPath, jsonString);

    const snapshot: AutoBackupSnapshotMeta = {
      id: snapshotId,
      tenantId,
      mosqueId: tenantId,
      mosqueNameBn: mosque.nameBn || mosque.name,
      triggerType,
      scheduleFrequency: cfg.frequency,
      status: 'SUCCESS',
      fileName,
      sizeBytes,
      checksum,
      recordCount: totalRecords,
      moduleCounts,
      createdAt: nowIso,
      createdBy: actor.id,
      createdByName: actor.name,
      noteBn,
    };

    db.autoBackupSnapshots.unshift(snapshot);

    // Sync with existing BackupRecord list so legacy health widgets stay accurate
    const legacyRecord: BackupRecord = {
      id: snapshotId,
      mosqueId: tenantId,
      backupType: triggerType,
      status: 'SUCCESS',
      createdAt: nowIso,
      completedAt: nowIso,
      initiatedByUserId: actor.id,
      initiatedByUserName: actor.name,
      googleDriveFileName: fileName,
      fileSize: sizeBytes,
      checksum,
      backupVersion: 'AUTO_V1',
      recordCount: totalRecords,
      moduleCount: Object.values(moduleCounts).filter((c) => c > 0).length,
    };
    db.backupRecords.unshift(legacyRecord);

    // Update schedule last run status
    db.backupSettings[tenantId] = {
      mosqueId: tenantId,
      automaticBackupEnabled: cfg.enabled,
      frequency: cfg.frequency,
      preferredTime: cfg.preferredTime,
      weeklyDay: cfg.weeklyDay,
      monthlyDay: cfg.monthlyDay,
      retentionCount: cfg.retentionCount,
      lastRunAt: nowIso,
      lastRunStatus: 'SUCCESS',
    };

    // Retention cleanup (preserve at least 5 recent PRE_RESTORE_SAFETY snapshots)
    const tenantNonSafety = db.autoBackupSnapshots.filter(
      (s) => s.tenantId === tenantId && s.triggerType !== 'PRE_RESTORE_SAFETY'
    );
    if (tenantNonSafety.length > cfg.retentionCount) {
      const toRemove = tenantNonSafety.slice(cfg.retentionCount);
      const removeIds = new Set(toRemove.map((s) => s.id));
      for (const old of toRemove) {
        try {
          const oldPath = resolveSnapshotPath(tenantId, old.fileName);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {
          // ignore cleanup failure
        }
      }
      db.autoBackupSnapshots = db.autoBackupSnapshots.filter((s) => !removeIds.has(s.id));
    }

    const triggerLabel =
      triggerType === 'AUTOMATIC'
        ? 'স্বয়ংক্রিয় ব্যাকআপ'
        : triggerType === 'PRE_RESTORE_SAFETY'
        ? 'প্রি-রিস্টোর সেফটি ব্যাকআপ'
        : 'ম্যানুয়াল স্ন্যাপশট ব্যাকআপ';

    appendAutomationLog({
      tenantId,
      category: 'AUTO_BACKUP',
      actionBn: `${triggerLabel} সফল`,
      status: 'SUCCESS',
      detailsBn: `${triggerLabel} সম্পন্ন হয়েছে (${toBnDigits(totalRecords)}টি রেকর্ড, ${toBnDigits((sizeBytes / 1024).toFixed(1))} KB)${noteBn ? ` — ${noteBn}` : ''}`,
      actorId: actor.id,
      actorName: actor.name,
      recordId: snapshotId,
    });

    db.logAudit(
      tenantId,
      actor.id,
      actor.name,
      actor.role,
      'CREATE',
      'BACKUP',
      `${triggerLabel} স্ন্যাপশট তৈরি (${toBnDigits(totalRecords)}টি রেকর্ড)`,
      snapshotId
    );

    db.save();
    return { ok: true, snapshot };
  } catch (err: any) {
    const errorMessage = err?.message || 'অজানা সিস্টেম ত্রুটি';
    const failedSnapshot: AutoBackupSnapshotMeta = {
      id: snapshotId,
      tenantId,
      mosqueId: tenantId,
      mosqueNameBn: mosque.nameBn || mosque.name,
      triggerType,
      scheduleFrequency: cfg.frequency,
      status: 'FAILED',
      fileName,
      sizeBytes: 0,
      checksum: '',
      recordCount: 0,
      moduleCounts: {},
      createdAt: nowIso,
      createdBy: actor.id,
      createdByName: actor.name,
      errorMessage,
    };

    db.autoBackupSnapshots.unshift(failedSnapshot);
    db.backupSettings[tenantId] = {
      mosqueId: tenantId,
      automaticBackupEnabled: cfg.enabled,
      frequency: cfg.frequency,
      preferredTime: cfg.preferredTime,
      weeklyDay: cfg.weeklyDay,
      monthlyDay: cfg.monthlyDay,
      retentionCount: cfg.retentionCount,
      lastRunAt: nowIso,
      lastRunStatus: 'FAILED',
    };

    appendAutomationLog({
      tenantId,
      category: 'AUTO_BACKUP',
      actionBn: 'ব্যাকআপ স্ন্যাপশট ব্যর্থ',
      status: 'FAILED',
      detailsBn: `ব্যাকআপ তৈরির সময় ত্রুটি ঘটেছে: ${errorMessage}`,
      actorId: actor.id,
      actorName: actor.name,
      recordId: snapshotId,
    });

    try {
      db.save();
    } catch {
      // never crash on secondary save
    }
    return { ok: false, errorMessage, snapshot: failedSnapshot };
  }
}

// ============================================================================
// BACKGROUND AUTO-BACKUP SCHEDULER (Non-blocking, Fail-Safe, Tenant-Isolated)
// ============================================================================
let schedulerStarted = false;

export function startAutoBackupScheduler() {
  if (schedulerStarted || process.env.NODE_ENV === 'test') return;
  schedulerStarted = true;

  const runTick = () => {
    try {
      const now = Date.now();
      for (const mosque of db.mosques) {
        if (mosque.status && mosque.status !== 'ACTIVE') continue;
        const cfg = getTenantAutoBackupConfig(mosque.id);
        if (!cfg.enabled) continue;

        const intervalMs =
          cfg.frequency === 'DAILY'
            ? 24 * 60 * 60 * 1000
            : cfg.frequency === 'WEEKLY'
            ? 7 * 24 * 60 * 60 * 1000
            : 28 * 24 * 60 * 60 * 1000;

        const lastSuccess = db.autoBackupSnapshots.find(
          (s) => s.tenantId === mosque.id && s.status === 'SUCCESS' && s.triggerType !== 'PRE_RESTORE_SAFETY'
        );
        const lastRunTs = lastSuccess
          ? new Date(lastSuccess.createdAt).getTime()
          : cfg.lastRunAt
          ? new Date(cfg.lastRunAt).getTime()
          : 0;

        if (!lastRunTs || now - lastRunTs >= intervalMs) {
          createTenantBackupSnapshot(
            mosque,
            { id: 'SYSTEM_SCHEDULER', name: 'সিস্টেম অটো-ব্যাকআপ শিডিউলার', role: 'SYSTEM' },
            'AUTOMATIC',
            `নির্ধারিত ${cfg.frequency === 'DAILY' ? 'দৈনিক' : cfg.frequency === 'WEEKLY' ? 'সাপ্তাহিক' : 'মাসিক'} অটো-ব্যাকআপ`
          );
        }
      }
    } catch (err) {
      console.warn('[AutoBackup Scheduler] Non-fatal tick error:', err);
    }
  };

  // Initial check 45 seconds after boot, then every 15 minutes
  const initialTimer = setTimeout(runTick, 45 * 1000);
  if (typeof initialTimer.unref === 'function') initialTimer.unref();

  const periodicTimer = setInterval(runTick, 15 * 60 * 1000);
  if (typeof periodicTimer.unref === 'function') periodicTimer.unref();
}

// ============================================================================
// DETERMINISTIC SMART REMINDER & FOLLOW-UP SCANNER (ZERO AI MATH GUESSING)
// ============================================================================
export function scanTenantReminders(
  tenantId: string,
  leadDays: number = 7
): DetectedAutomationReminder[] {
  const safeLeadDays = Math.min(90, Math.max(1, Number(leadDays) || 7));
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const todayUtc = new Date(`${todayIso}T00:00:00Z`);
  const currentMonth = todayIso.slice(0, 7); // YYYY-MM
  const dismissedSet = new Set(db.dismissedReminderKeys[tenantId] || []);

  // Index existing queue items by reminderId for this tenant
  const queueByReminder = new Map<string, NotificationDraftQueueItem>();
  for (const q of db.notificationDraftQueue) {
    if (q.tenantId === tenantId && !queueByReminder.has(q.reminderId)) {
      queueByReminder.set(q.reminderId, q);
    }
  }

  const reminders: DetectedAutomationReminder[] = [];

  const attachQueueMeta = (
    item: Omit<DetectedAutomationReminder, 'queueStatus' | 'linkedQueueId'>
  ) => {
    if (dismissedSet.has(item.id)) return;
    const existingQ = queueByReminder.get(item.id);
    reminders.push({
      ...item,
      queueStatus: existingQ ? existingQ.status : 'NONE',
      linkedQueueId: existingQ?.id,
    });
  };

  // --------------------------------------------------------------------------
  // (ক) বকেয়া দোকান/বাসা ভাড়া ও আসন্ন চুক্তির মেয়াদ (Waqf & Property Rent/Lease)
  // --------------------------------------------------------------------------
  const tenantProperties = db.properties.filter((p) => p.mosqueId === tenantId && !p.isArchived);
  for (const prop of tenantProperties) {
    const propName = prop.nameBn || prop.name || prop.propertyCode || 'ওয়াকফ সম্পত্তি';
    const tenants = Array.isArray(prop.tenants) ? prop.tenants : [];
    const rentCollections = Array.isArray(prop.rentCollections) ? prop.rentCollections : [];

    for (const tenant of tenants) {
      if (tenant.status === 'TERMINATED') continue;
      const unitLabel = tenant.unitOrShopNo ? ` (${tenant.unitOrShopNo})` : '';

      // 1. Check current month unpaid or partial rent
      const monthlyRent = Number(tenant.monthlyRent || 0);
      if (monthlyRent > 0) {
        const monthCollections = rentCollections.filter(
          (rc) =>
            rc.tenantId === tenant.id &&
            rc.billingMonth === currentMonth &&
            rc.status !== 'CANCELLED'
        );
        const totalPaidThisMonth = monthCollections.reduce((acc, rc) => acc + (Number(rc.paidAmount) || 0), 0);
        const remainingDue = Math.max(0, monthlyRent - totalPaidThisMonth);

        if (remainingDue > 0) {
          const dueDay = Math.min(28, Math.max(1, Number(tenant.paymentDueDate || 10)));
          const dueDateStr = `${currentMonth}-${String(dueDay).padStart(2, '0')}`;
          const dueObj = parseIsoDateOnly(dueDateStr) || todayUtc;
          const daysDelta = diffDaysFromToday(dueObj, todayUtc);

          if (daysDelta <= safeLeadDays) {
            attachQueueMeta({
              id: `rem-rent-${prop.id}-${tenant.id}-${currentMonth}`,
              tenantId,
              mosqueId: tenantId,
              category: 'RENT_DUE',
              categoryLabelBn: 'বকেয়া ভাড়া',
              priority: daysDelta < 0 ? 'URGENT' : daysDelta <= 2 ? 'HIGH' : 'MEDIUM',
              titleBn: `${tenant.name}${unitLabel} — চলতি মাসের (${currentMonth}) ভাড়া বকেয়া`,
              subtitleBn: `${propName} • বকেয়া: ${formatTakaBn(remainingDue)}`,
              targetEntityName: tenant.name,
              targetPhone: tenant.mobile,
              dueDate: dueDateStr,
              daysDelta,
              amountDue: remainingDue,
              sourceModule: 'WAQF_PROPERTY',
              sourceRecordId: prop.id,
              targetTab: 'assets',
              detailsBn: `${propName}${unitLabel}-এর ভাড়াটিয়া ${tenant.name}-এর ${currentMonth} মাসের মাসিক ভাড়া ${formatTakaBn(monthlyRent)}-এর মধ্যে পরিশোধিত ${formatTakaBn(totalPaidThisMonth)} এবং বকেয়া ${formatTakaBn(remainingDue)}। নির্ধারিত তারিখ: ${dueDateStr}।`,
              deterministicFacts: {
                সম্পত্তি: propName,
                দোকান_বা_ইউনিট: tenant.unitOrShopNo || 'সাধারণ',
                ভাড়াটিয়া: tenant.name,
                মোবাইল: tenant.mobile || 'নেই',
                মাস: currentMonth,
                মাসিক_ভাড়া: monthlyRent,
                পরিশোধিত: totalPaidThisMonth,
                বকেয়া_টাকা: remainingDue,
                নির্ধারিত_তারিখ: dueDateStr,
              },
            });
          }
        }
      }

      // 2. Check lease agreement expiry (expired or expiring within max(30, leadDays))
      const leaseEnd = parseIsoDateOnly(tenant.endDate);
      if (leaseEnd) {
        const leaseDelta = diffDaysFromToday(leaseEnd, todayUtc);
        const leaseWindow = Math.max(30, safeLeadDays);
        if (leaseDelta <= leaseWindow) {
          attachQueueMeta({
            id: `rem-lease-${prop.id}-${tenant.id}-${tenant.endDate}`,
            tenantId,
            mosqueId: tenantId,
            category: 'LEASE_EXPIRY',
            categoryLabelBn: 'চুক্তির মেয়াদ',
            priority: leaseDelta <= 0 ? 'URGENT' : leaseDelta <= 10 ? 'HIGH' : 'MEDIUM',
            titleBn:
              leaseDelta <= 0
                ? `${tenant.name}${unitLabel} — ভাড়ার চুক্তির মেয়াদ উত্তীর্ণ`
                : `${tenant.name}${unitLabel} — ভাড়ার চুক্তির মেয়াদ ${toBnDigits(leaseDelta)} দিন বাকি`,
            subtitleBn: `${propName} • শেষ তারিখ: ${tenant.endDate}`,
            targetEntityName: tenant.name,
            targetPhone: tenant.mobile,
            dueDate: tenant.endDate,
            daysDelta: leaseDelta,
            amountDue: monthlyRent || undefined,
            sourceModule: 'WAQF_PROPERTY',
            sourceRecordId: prop.id,
            targetTab: 'assets',
            detailsBn: `${propName}${unitLabel}-এর চুক্তি নং ${tenant.agreementNo || 'প্রযোজ্য নয়'} আগামী ${tenant.endDate} তারিখে শেষ হবে (${leaseDelta <= 0 ? `${toBnDigits(Math.abs(leaseDelta))} দিন পূর্বে উত্তীর্ণ` : `${toBnDigits(leaseDelta)} দিন বাকি`})। চুক্তি নবায়ন প্রয়োজন।`,
            deterministicFacts: {
              সম্পত্তি: propName,
              ভাড়াটিয়া: tenant.name,
              চুক্তি_নম্বর: tenant.agreementNo || 'নেই',
              চুক্তি_শেষের_তারিখ: tenant.endDate,
              বাকি_দিন: leaseDelta,
              মাসিক_ভাড়া: monthlyRent,
            },
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // (খ-১) আসন্ন নিয়মিত চাঁদা / কিস্তি সংগ্রহের তারিখ (Musalli Donation Installments)
  // --------------------------------------------------------------------------
  const activePlans = db.donationPlans.filter(
    (p) => p.mosqueId === tenantId && p.status === 'ACTIVE' && p.collectionRequired
  );
  const personById = new Map(
    db.persons.filter((p) => p.mosqueId === tenantId).map((p) => [p.id, p])
  );
  for (const plan of activePlans) {
    const person = personById.get(plan.personId);
    const personName = person?.fullName || (person as any)?.nameBn || 'দাতা সদস্য';
    const plannedAmount = Number(plan.amount ?? plan.plannedAmount ?? 0);
    if (plannedAmount <= 0) continue;

    // Check current month collection status
    const monthColl = db.donationCollections.filter(
      (c) =>
        c.mosqueId === tenantId &&
        c.donationPlanId === plan.id &&
        (c.collectionPeriod === currentMonth ||
          (c.scheduledDate && c.scheduledDate.startsWith(currentMonth)) ||
          (c.lastCollectionDate && c.lastCollectionDate.startsWith(currentMonth)))
    );
    const paidAmt = monthColl.reduce(
      (sum, c) => sum + (c.status === 'COLLECTED' || c.status === 'PARTIALLY_COLLECTED' ? Number(c.collectedAmount || 0) : 0),
      0
    );
    const remainingAmt = Math.max(0, plannedAmount - paidAmt);
    if (remainingAmt <= 0) continue;

    const collDayNum = Math.min(28, Math.max(1, Number(plan.collectionDay) || 5));
    const dueDateStr = `${currentMonth}-${String(collDayNum).padStart(2, '0')}`;
    const dueObj = parseIsoDateOnly(dueDateStr) || todayUtc;
    const daysDelta = diffDaysFromToday(dueObj, todayUtc);

    if (daysDelta <= safeLeadDays) {
      attachQueueMeta({
        id: `rem-installment-${plan.id}-${currentMonth}`,
        tenantId,
        mosqueId: tenantId,
        category: 'DONATION_INSTALLMENT',
        categoryLabelBn: 'কিস্তি ও চাঁদা',
        priority: daysDelta < 0 ? 'HIGH' : daysDelta <= 1 ? 'HIGH' : 'MEDIUM',
        titleBn:
          daysDelta < 0
            ? `${personName} — মাসিক চাঁদা/কিস্তি বকেয়া (${currentMonth})`
            : daysDelta === 0
            ? `${personName} — আজ মাসিক চাঁদা/কিস্তি সংগ্রহের দিন`
            : `${personName} — ${toBnDigits(daysDelta)} দিন পর চাঁদা/কিস্তির তারিখ`,
        subtitleBn: `পরিকল্পনা: ${plan.planCode || plan.planType} • পরিমাণ: ${formatTakaBn(remainingAmt)}`,
        targetEntityName: personName,
        targetPhone: person?.mobile,
        dueDate: dueDateStr,
        daysDelta,
        amountDue: remainingAmt,
        sourceModule: 'MUSALLI_DONOR',
        sourceRecordId: plan.id,
        targetTab: 'musalliDonor',
        detailsBn: `${personName}-এর নিয়মিত চাঁদা/কিস্তি (${currentMonth}) বাবদ নির্ধারিত ${formatTakaBn(plannedAmount)}-এর মধ্যে বকেয়া ${formatTakaBn(remainingAmt)}। সংগ্রহের নির্ধারিত তারিখ: ${dueDateStr}।`,
        deterministicFacts: {
          দাতার_নাম: personName,
          মোবাইল: person?.mobile || 'নেই',
          পরিকল্পনা_ধরন: plan.planType,
          মাস: currentMonth,
          নির্ধারিত_টাকা: plannedAmount,
          বকেয়া_টাকা: remainingAmt,
          সংগ্রহের_তারিখ: dueDateStr,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // (খ-২) পাঠাগারের বই ফেরতের আসন্ন বা উত্তীর্ণ তারিখ (Library Return Due Dates)
  // --------------------------------------------------------------------------
  const openIssues = db.bookIssues.filter(
    (bi) => bi.mosqueId === tenantId && (bi.status === 'ACTIVE' || bi.status === 'OVERDUE')
  );
  for (const issue of openIssues) {
    const dueObj = parseIsoDateOnly(issue.dueDate);
    if (!dueObj) continue;
    const daysDelta = diffDaysFromToday(dueObj, todayUtc);
    if (daysDelta <= safeLeadDays) {
      attachQueueMeta({
        id: `rem-library-${issue.id}`,
        tenantId,
        mosqueId: tenantId,
        category: 'LIBRARY_RETURN',
        categoryLabelBn: 'বই ফেরতের তারিখ',
        priority: daysDelta < 0 ? 'HIGH' : daysDelta <= 1 ? 'MEDIUM' : 'LOW',
        titleBn:
          daysDelta < 0
            ? `"${issue.bookTitle}" — বই ফেরতের মেয়াদ ${toBnDigits(Math.abs(daysDelta))} দিন অতিক্রান্ত`
            : daysDelta === 0
            ? `"${issue.bookTitle}" — আজ বই ফেরতের নির্ধারিত তারিখ`
            : `"${issue.bookTitle}" — ${toBnDigits(daysDelta)} দিন পর বই ফেরতের তারিখ`,
        subtitleBn: `পাঠক: ${issue.borrowerName} • ইস্যু নং: ${issue.issueNumber}`,
        targetEntityName: issue.borrowerName,
        targetPhone: issue.borrowerPhone,
        dueDate: issue.dueDate,
        daysDelta,
        amountDue: issue.fineAmount ? Number(issue.fineAmount) : undefined,
        sourceModule: 'LIBRARY',
        sourceRecordId: issue.id,
        targetTab: 'library',
        detailsBn: `পাঠক ${issue.borrowerName} কর্তৃক সংগৃহীত "${issue.bookTitle}" (ইস্যু নং ${issue.issueNumber}) বইটি ফেরতের নির্ধারিত তারিখ ${issue.dueDate}।`,
        deterministicFacts: {
          পাঠকের_নাম: issue.borrowerName,
          বইয়ের_নাম: issue.bookTitle,
          ইস্যু_নম্বর: issue.issueNumber,
          ইস্যু_তারিখ: issue.issueDate,
          ফেরতের_তারিখ: issue.dueDate,
          বাকি_দিন: daysDelta,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // (গ-১) কবর পুনঃব্যবহারের সময়সীমা পূর্ণ হওয়া (Cemetery 2-Year / 730-Day Reuse)
  // --------------------------------------------------------------------------
  const REUSE_DAYS_THRESHOLD = 730; // Standard 2-year milestone
  const cemeteryRows = db.cemeteryRecords.filter(
    (c) =>
      c.mosqueId === tenantId &&
      !c.isArchived &&
      c.plotStatus === 'OCCUPIED' &&
      c.graveType !== 'PERMANENT'
  );
  for (const cem of cemeteryRows) {
    const burialObj = parseIsoDateOnly(cem.burialDate);
    if (!burialObj) continue;
    const reuseDate = new Date(burialObj.getTime() + REUSE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
    const reuseDateStr = reuseDate.toISOString().slice(0, 10);
    const daysToReuse = diffDaysFromToday(reuseDate, todayUtc);

    if (daysToReuse <= Math.max(30, safeLeadDays)) {
      const elapsedDays = Math.max(0, Math.round((todayUtc.getTime() - burialObj.getTime()) / (24 * 60 * 60 * 1000)));
      const elapsedMonths = Math.floor(elapsedDays / 30);
      attachQueueMeta({
        id: `rem-cemetery-${cem.id}`,
        tenantId,
        mosqueId: tenantId,
        category: 'CEMETERY_REUSE',
        categoryLabelBn: 'কবর পুনঃব্যবহার মেয়াদ',
        priority: daysToReuse <= 0 ? 'HIGH' : 'MEDIUM',
        titleBn:
          daysToReuse <= 0
            ? `প্লট ${cem.plotNumber} (${cem.deceasedName}) — পুনঃব্যবহারের ২ বছর সময়সীমা পূর্ণ`
            : `প্লট ${cem.plotNumber} (${cem.deceasedName}) — পুনঃব্যবহারের মেয়াদ ${toBnDigits(daysToReuse)} দিন বাকি`,
        subtitleBn: `দাফনের তারিখ: ${cem.burialDate} • ওয়ারিশ: ${cem.contactPersonName}`,
        targetEntityName: cem.contactPersonName || cem.deceasedName,
        targetPhone: cem.contactPersonPhone,
        dueDate: reuseDateStr,
        daysDelta: daysToReuse,
        sourceModule: 'CEMETERY',
        sourceRecordId: cem.id,
        targetTab: 'cemetery',
        detailsBn: `মরহুম/মরহুমা ${cem.deceasedName} (প্লট: ${cem.plotNumber}, অবস্থান: ${cem.graveLocation})-এর দাফন তারিখ ${cem.burialDate} হতে প্রায় ${toBnDigits(elapsedMonths)} মাস অতিবাহিত হয়েছে। ওয়ারিশ ${cem.contactPersonName}-এর সাথে পরামর্শক্রমে পরবর্তী সিদ্ধান্ত নেওয়া যেতে পারে।`,
        deterministicFacts: {
          মরহুমের_নাম: cem.deceasedName,
          প্লট_নম্বর: cem.plotNumber,
          অবস্থান: cem.graveLocation || 'কবরস্থান',
          দাফনের_তারিখ: cem.burialDate,
          সময়সীমা_পূর্তির_তারিখ: reuseDateStr,
          অতিবাহিত_মাস: elapsedMonths,
          ওয়ারিশের_নাম: cem.contactPersonName || 'নেই',
          ওয়ারিশের_ফোন: cem.contactPersonPhone || 'নেই',
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // (গ-২) কমিটির মেয়াদ ও স্মার্ট নোট নির্ধারিত ফলো-আপ (Committee & Note Follow-ups)
  // --------------------------------------------------------------------------
  const activeTerms = db.committeeTerms.filter((t) => t.mosqueId === tenantId && t.status === 'ACTIVE');
  for (const term of activeTerms) {
    const endObj = parseIsoDateOnly(term.endDate);
    if (!endObj) continue;
    const daysDelta = diffDaysFromToday(endObj, todayUtc);
    if (daysDelta <= Math.max(30, safeLeadDays)) {
      attachQueueMeta({
        id: `rem-committee-${term.id}`,
        tenantId,
        mosqueId: tenantId,
        category: 'COMMITTEE_EXPIRY',
        categoryLabelBn: 'কমিটির মেয়াদ',
        priority: daysDelta <= 0 ? 'URGENT' : 'HIGH',
        titleBn:
          daysDelta <= 0
            ? `"${term.title}" — কমিটির মেয়াদ শেষ হয়েছে`
            : `"${term.title}" — কমিটির মেয়াদ ${toBnDigits(daysDelta)} দিন বাকি`,
        subtitleBn: `মেয়াদ সমাপ্তির তারিখ: ${term.endDate}`,
        targetEntityName: term.title,
        dueDate: term.endDate,
        daysDelta,
        sourceModule: 'COMMITTEE',
        sourceRecordId: term.id,
        targetTab: 'committee',
        detailsBn: `"${term.title}" কার্যনির্বাহী কমিটির মেয়াদ ${term.endDate} তারিখে শেষ হবে। সাধারণ সভা আহ্বান ও নতুন কমিটি গঠনের প্রস্তুতি প্রয়োজন।`,
        deterministicFacts: {
          কমিটির_নাম: term.title,
          শুরুর_তারিখ: term.startDate,
          শেষের_তারিখ: term.endDate,
          বাকি_দিন: daysDelta,
        },
      });
    }
  }

  const pendingNoteReminders = db.smartNoteReminders.filter(
    (r) => r.tenantId === tenantId && r.status === 'PENDING' && Boolean(r.dueDate)
  );
  for (const nr of pendingNoteReminders) {
    const dueObj = parseIsoDateOnly(nr.dueDate);
    if (!dueObj) continue;
    const daysDelta = diffDaysFromToday(dueObj, todayUtc);
    if (daysDelta <= safeLeadDays) {
      attachQueueMeta({
        id: `rem-note-${nr.id}`,
        tenantId,
        mosqueId: tenantId,
        category: 'NOTE_FOLLOWUP',
        categoryLabelBn: 'নোট ফলো-আপ',
        priority: nr.priority === 'URGENT' || daysDelta < 0 ? 'HIGH' : 'MEDIUM',
        titleBn: nr.title,
        subtitleBn: `দায়িত্বপ্রাপ্ত: ${nr.assignedToName || 'কমিটি'} • নির্ধারিত তারিখ: ${nr.dueDate}`,
        targetEntityName: nr.assignedToName || 'মসজিদ কমিটি',
        dueDate: nr.dueDate,
        daysDelta,
        sourceModule: 'SMART_NOTES',
        sourceRecordId: nr.noteId,
        targetTab: 'smartNotes',
        detailsBn: nr.description || `স্মার্ট নোট ফলো-আপ: "${nr.title}" (নির্ধারিত তারিখ: ${nr.dueDate})।`,
        deterministicFacts: {
          কাজের_শিরোনাম: nr.title,
          দায়িত্বপ্রাপ্ত: nr.assignedToName || 'মসজিদ কমিটি',
          নির্ধারিত_তারিখ: nr.dueDate || '',
          বাকি_দিন: daysDelta,
        },
      });
    }
  }

  // Sort by urgency then earliest due date
  const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  reminders.sort((a, b) => {
    const pDiff = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    if (pDiff !== 0) return pDiff;
    return a.daysDelta - b.daysDelta;
  });

  return reminders;
}

export function buildDeterministicReminderDraft(
  mosque: Mosque,
  reminder: DetectedAutomationReminder,
  channel: NotificationDraftChannel
): { titleBn: string; messageBn: string } {
  const mosqueName = mosque.nameBn || mosque.name || 'মসজিদ কর্তৃপক্ষ';
  if (reminder.category === 'RENT_DUE') {
    return {
      titleBn: `ভাড়া পরিশোধের বিনীত অনুস্মারক — ${reminder.targetEntityName}`,
      messageBn:
        channel === 'NOTICE_DRAFT'
          ? `আসসালামু আলাইকুম। ${mosqueName}-এর পক্ষ থেকে জানানো যাচ্ছে যে, ${reminder.detailsBn} অনুগ্রহপূর্বক নির্ধারিত সময়ের মধ্যে বকেয়া ভাড়া পরিশোধ করে রসিদ সংগ্রহ করার জন্য বিনীত অনুরোধ করা হলো। — ${mosqueName}`
          : `আসসালামু আলাইকুম, সম্মানিত ${reminder.targetEntityName}। ${mosqueName}-এর ওয়াকফ সম্পত্তির চলতি মাসের বকেয়া ভাড়া ${formatTakaBn(reminder.amountDue || 0)} (নির্ধারিত তারিখ: ${reminder.dueDate || 'সত্বর'})। অনুগ্রহ করে সুবিধামতো সময়ে পরিশোধ করবেন। জাযাকাল্লাহু খাইরান — ${mosqueName}`,
    };
  }
  if (reminder.category === 'LEASE_EXPIRY') {
    return {
      titleBn: `চুক্তি নবায়ন অনুস্মারক — ${reminder.targetEntityName}`,
      messageBn: `আসসালামু আলাইকুম, সম্মানিত ${reminder.targetEntityName}। ${reminder.detailsBn} অনুগ্রহ করে চুক্তি নবায়নের বিষয়ে মসজিদ কমিটির কার্যালয়ে যোগাযোগ করার জন্য বিনীত অনুরোধ জানাচ্ছি। — ${mosqueName}`,
    };
  }
  if (reminder.category === 'DONATION_INSTALLMENT') {
    return {
      titleBn: `নিয়মিত মাসিক চাঁদা/কিস্তি অনুস্মারক — ${reminder.targetEntityName}`,
      messageBn: `আসসালামু আলাইকুম, সম্মানিত ${reminder.targetEntityName}। ${mosqueName}-এর উন্নয়ন ও পরিচালনায় আপনার নিয়মিত চাঁদা/কিস্তি ${formatTakaBn(reminder.amountDue || 0)} (নির্ধারিত তারিখ: ${reminder.dueDate || 'চলতি মাস'})। আল্লাহ তায়ালা আপনার দান কবুল করুন। — ${mosqueName}`,
    };
  }
  if (reminder.category === 'LIBRARY_RETURN') {
    return {
      titleBn: `পাঠাগারের বই ফেরতের অনুস্মারক — ${reminder.targetEntityName}`,
      messageBn: `আসসালামু আলাইকুম, প্রিয় পাঠক ${reminder.targetEntityName}। ${reminder.detailsBn} অনুগ্রহ করে যথাসময়ে বইটি মসজিদ পাঠাগারে ফেরত দেওয়ার জন্য অনুরোধ করা হলো। — ${mosqueName}`,
    };
  }
  if (reminder.category === 'CEMETERY_REUSE') {
    return {
      titleBn: `কবরস্থান সময়সীমা ও ওয়ারিশ যোগাযোগ — ${reminder.targetEntityName}`,
      messageBn: `আসসালামু আলাইকুম, সম্মানিত ${reminder.targetEntityName}। ${reminder.detailsBn} এ বিষয়ে আপনার সুচিন্তিত মতামতের জন্য মসজিদ কবরস্থান কমিটির সাথে যোগাযোগ করার অনুরোধ জানাচ্ছি। — ${mosqueName}`,
    };
  }
  return {
    titleBn: reminder.titleBn,
    messageBn: `আসসালামু আলাইকুম। ${reminder.detailsBn} অনুগ্রহপূর্বক প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুরোধ করা হলো। — ${mosqueName}`,
  };
}

// ============================================================================
// EXPRESS ROUTER: /api/v1/automation/* (STRICTLY TENANT-ISOLATED)
// ============================================================================
export function createAutomationRouter(
  authenticate: (req: Request, res: Response, next: NextFunction) => any,
  requirePermission: (permission: Permission) => (req: Request, res: Response, next: NextFunction) => any
): Router {
  const router = Router();

  // 1. Get Auto-Backup Overview, Schedule Config & Snapshot History
  router.get('/backups/overview', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const config = getTenantAutoBackupConfig(tenantId);
    const snapshots = db.autoBackupSnapshots
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latest = snapshots[0] || null;
    const overview = {
      config,
      statusSummary: {
        lastBackupAt: latest?.createdAt || config.lastRunAt || null,
        lastBackupStatus: latest?.status || config.lastRunStatus || 'NONE',
        lastBackupSizeBytes: latest?.sizeBytes || 0,
        lastErrorMessage: latest?.status === 'FAILED' ? latest.errorMessage : undefined,
        nextScheduledAt: config.nextScheduledAt || null,
        totalSnapshots: snapshots.length,
        automaticCount: snapshots.filter((s) => s.triggerType === 'AUTOMATIC').length,
        manualCount: snapshots.filter((s) => s.triggerType === 'MANUAL').length,
        safetyCount: snapshots.filter((s) => s.triggerType === 'PRE_RESTORE_SAFETY').length,
        totalStorageBytes: snapshots.reduce((sum, s) => sum + (s.sizeBytes || 0), 0),
      },
      snapshots,
    };

    res.json({ success: true, data: overview });
  });

  // 2. Update Auto-Backup Schedule Settings
  router.put(
    '/backups/config',
    authenticate,
    requirePermission('MANAGE_SETTINGS'),
    (req: AutomationAuthRequest, res: Response) => {
      const mosque = req.currentMosque!;
      const user = req.user!;
      const body = req.body || {};

      const frequency: AutoBackupFrequency =
        body.frequency === 'WEEKLY' || body.frequency === 'MONTHLY' ? body.frequency : 'DAILY';
      const preferredTime =
        typeof body.preferredTime === 'string' && /^\d{2}:\d{2}$/.test(body.preferredTime)
          ? body.preferredTime
          : '23:30';
      const retentionCount = Math.min(90, Math.max(3, Number(body.retentionCount ?? 15) || 15));
      const allowedDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const weeklyDay = allowedDays.includes(body.weeklyDay) ? body.weeklyDay : 'Friday';
      const monthlyDay = Math.min(28, Math.max(1, Number(body.monthlyDay ?? 1) || 1));

      const prev = db.backupSettings[mosque.id];
      db.backupSettings[mosque.id] = {
        mosqueId: mosque.id,
        automaticBackupEnabled: Boolean(body.enabled),
        frequency,
        preferredTime,
        weeklyDay: weeklyDay as any,
        monthlyDay,
        retentionCount,
        lastRunAt: prev?.lastRunAt,
        lastRunStatus: prev?.lastRunStatus,
      };

      const updated = getTenantAutoBackupConfig(mosque.id);
      appendAutomationLog({
        tenantId: mosque.id,
        category: 'AUTO_BACKUP',
        actionBn: updated.enabled ? 'অটো-ব্যাকআপ শিডিউল সক্রিয় ও আপডেট' : 'অটো-ব্যাকআপ শিডিউল নিষ্ক্রিয়',
        status: 'SUCCESS',
        detailsBn: `ফ্রিকোয়েন্সি: ${frequency}, সময়: ${preferredTime}, সর্বোচ্চ সংরক্ষণ: ${toBnDigits(retentionCount)}টি`,
        actorId: user.id,
        actorName: user.name,
      });
      db.logAudit(
        mosque.id,
        user.id,
        user.name,
        user.role,
        'UPDATE',
        'BACKUP',
        `অটো-ব্যাকআপ কনফিগারেশন হালনাগাদ (${updated.enabled ? 'চালু' : 'বন্ধ'}, ${frequency})`,
        mosque.id,
        getClientIp(req)
      );
      db.save();

      res.json({
        success: true,
        data: updated,
        message: 'অটো-ব্যাকআপ শিডিউল সেটিংস সফলভাবে সংরক্ষিত হয়েছে।',
      });
    }
  );

  // 3. Run Auto-Backup Snapshot Now (Manual Trigger)
  router.post(
    '/backups/run-now',
    authenticate,
    requirePermission('MANAGE_SETTINGS'),
    (req: AutomationAuthRequest, res: Response) => {
      const mosque = req.currentMosque!;
      const user = req.user!;
      const noteBn = typeof req.body?.noteBn === 'string' ? req.body.noteBn.trim().slice(0, 140) : undefined;
      const result = createTenantBackupSnapshot(mosque, user, 'MANUAL', noteBn);

      if (!result.ok) {
        const errResult = result as { ok: false; errorMessage: string; snapshot: AutoBackupSnapshotMeta };
        return res.status(500).json({
          success: false,
          error: {
            code: 'BACKUP_SNAPSHOT_FAILED',
            message: `ব্যাকআপ স্ন্যাপশট তৈরি ব্যর্থ হয়েছে: ${errResult.errorMessage}। অনুগ্রহ করে ম্যানুয়াল এক্সপোর্ট ব্যবহার করুন।`,
          },
          data: errResult.snapshot,
        });
      }

      res.json({
        success: true,
        data: result.snapshot,
        message: 'নতুন ব্যাকআপ স্ন্যাপশট সফলভাবে তৈরি ও সংরক্ষিত হয়েছে।',
      });
    }
  );

  // 4. Preview Snapshot Before Restore (Strict Tenant Check + SHA-256 Integrity Verification)
  router.get('/backups/:id/preview', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const rawSnapshot = db.autoBackupSnapshots.find((s) => s.id === req.params.id);
    if (!enforceTenantOwnershipOrRespond(req, res, rawSnapshot, 'ব্যাকআপ স্ন্যাপশট পাওয়া যায়নি।')) {
      return;
    }

    try {
      const filePath = resolveSnapshotPath(tenantId, rawSnapshot.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: { code: 'SNAPSHOT_FILE_MISSING', message: 'সার্ভারে ব্যাকআপ ফাইলটি পাওয়া যায়নি।' },
        });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const actualChecksum = crypto.createHash('sha256').update(content).digest('hex');
      const parsed = JSON.parse(content);
      const integrityValid =
        (!rawSnapshot.checksum || actualChecksum === rawSnapshot.checksum) &&
        (parsed.tenantId === tenantId || parsed.mosqueId === tenantId);

      const moduleSummary = TENANT_COLLECTION_KEYS.map((key) => ({
        key,
        labelBn: MODULE_LABELS_BN[key] || key,
        count: Array.isArray(parsed?.data?.[key]) ? parsed.data[key].length : 0,
      })).filter((m) => m.count > 0);

      const preview: AutoBackupSnapshotPreview = {
        snapshot: rawSnapshot,
        integrityValid,
        integrityMessageBn: integrityValid
          ? 'SHA-256 অখণ্ডতা ও মসজিদ আইডি যাচাইকরণ সম্পূর্ণ সফল।'
          : 'সতর্কতা: ব্যাকআপ ফাইলের অখণ্ডতা বা মসজিদ আইডি মেলেনি! রিস্টোর করা নিরাপদ নয়।',
        fileExists: true,
        exportedAt: parsed.exportedAt || rawSnapshot.createdAt,
        mosqueNameBn: parsed?.mosque?.nameBn || parsed?.mosque?.name || rawSnapshot.mosqueNameBn,
        totalRecords: moduleSummary.reduce((sum, m) => sum + m.count, 0),
        moduleSummary,
      };

      res.json({ success: true, data: preview });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'PREVIEW_FAILED', message: `ব্যাকআপ প্রিভিউ লোড করতে সমস্যা হয়েছে: ${err?.message || 'অজানা ত্রুটি'}` },
      });
    }
  });

  // 5. Download Snapshot JSON File (Strictly Tenant-Confined)
  router.get('/backups/:id/download', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const rawSnapshot = db.autoBackupSnapshots.find((s) => s.id === req.params.id);
    if (!enforceTenantOwnershipOrRespond(req, res, rawSnapshot, 'ব্যাকআপ স্ন্যাপশট পাওয়া যায়নি।')) {
      return;
    }

    try {
      const filePath = resolveSnapshotPath(tenantId, rawSnapshot.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: { code: 'SNAPSHOT_FILE_MISSING', message: 'ডিস্কে ব্যাকআপ ফাইলটি পাওয়া যায়নি।' },
        });
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${rawSnapshot.fileName}"`);
      return res.sendFile(filePath);
    } catch {
      logSecurityAuditEvent({
        mosqueId: tenantId,
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'PATH_TRAVERSAL_BLOCKED',
        details: `সন্দেহজনক ব্যাকআপ ডাউনলোড পাথ ব্লক (${req.params.id})`,
        recordId: req.params.id,
        ipAddress: getClientIp(req),
        status: 'FAILED',
      });
      return res.status(400).json({ success: false, error: { code: 'INVALID_PATH', message: 'অবৈধ ব্যাকআপ পাথ।' } });
    }
  });

  // 6. Confirmed Restore From Auto-Backup Snapshot (With Mandatory Pre-Restore Safety Backup)
  router.post(
    '/backups/:id/restore',
    authenticate,
    requirePermission('MANAGE_SETTINGS'),
    (req: AutomationAuthRequest, res: Response) => {
      const mosque = req.currentMosque!;
      const user = req.user!;
      const tenantId = mosque.id;

      if (req.body?.confirmRestore !== true) {
        return res.status(400).json({
          success: false,
          error: { code: 'CONFIRMATION_REQUIRED', message: 'রিস্টোর চালানোর আগে স্পষ্ট নিশ্চিতকরণ আবশ্যক।' },
        });
      }

      const rawSnapshot = db.autoBackupSnapshots.find((s) => s.id === req.params.id);
      if (!enforceTenantOwnershipOrRespond(req, res, rawSnapshot, 'ব্যাকআপ স্ন্যাপশট পাওয়া যায়নি।')) {
        return;
      }

      try {
        const filePath = resolveSnapshotPath(tenantId, rawSnapshot.fileName);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            success: false,
            error: { code: 'SNAPSHOT_FILE_MISSING', message: 'সার্ভারে ব্যাকআপ ফাইলটি পাওয়া যায়নি।' },
          });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const actualChecksum = crypto.createHash('sha256').update(content).digest('hex');
        if (rawSnapshot.checksum && actualChecksum !== rawSnapshot.checksum) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CHECKSUM_MISMATCH',
              message: 'নিরাপত্তা ত্রুটি: ব্যাকআপ ফাইলের অখণ্ডতা (Checksum) মেলেনি। রিস্টোর বাতিল করা হয়েছে।',
            },
          });
        }

        const parsed = JSON.parse(content);
        const backupTenantId = parsed?.tenantId || parsed?.mosqueId || parsed?.mosque?.id;
        if (!backupTenantId || backupTenantId !== tenantId) {
          logSecurityAuditEvent({
            mosqueId: tenantId,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'CROSS_TENANT_RESTORE_BLOCKED',
            details: `অন্য মসজিদের ব্যাকআপ রিস্টোর চেষ্টা প্রতিহত (Snapshot: ${rawSnapshot.id})`,
            recordId: rawSnapshot.id,
            ipAddress: getClientIp(req),
            status: 'FAILED',
          });
          return res.status(403).json({
            success: false,
            error: {
              code: 'TENANT_FORBIDDEN',
              message: 'অন্য মসজিদের ব্যাকআপ এই মসজিদে রিস্টোর করা সম্পূর্ণ নিষিদ্ধ।',
            },
          });
        }

        // MANDATORY STEP: Create Pre-Restore Safety Backup of current state first
        const safetyResult = createTenantBackupSnapshot(
          mosque,
          user,
          'PRE_RESTORE_SAFETY',
          `স্ন্যাপশট ${rawSnapshot.id} রিস্টোর করার পূর্বের স্বয়ংক্রিয় সেফটি ব্যাকআপ`
        );
        if (!safetyResult.ok) {
          return res.status(500).json({
            success: false,
            error: {
              code: 'SAFETY_BACKUP_FAILED',
              message: 'নিরাপত্তার জন্য বর্তমান অবস্থার সেফটি ব্যাকআপ তৈরি ব্যর্থ হওয়ায় রিস্টোর বাতিল করা হয়েছে।',
            },
          });
        }

        // Apply tenant-only restore (never touching any other mosque's records!)
        const restoredData = parsed.data || {};
        const restoredModuleCounts: Record<string, number> = {};
        let totalRestored = 0;

        for (const key of TENANT_COLLECTION_KEYS) {
          if (!Array.isArray(restoredData[key])) continue;
          const existingAll = Array.isArray((db as any)[key]) ? ((db as any)[key] as any[]) : [];
          const otherTenantsOnly = existingAll.filter(
            (item) => item && item.mosqueId !== tenantId && item.tenantId !== tenantId
          );
          const sanitizedTenantItems = restoredData[key].map((item: any) => ({
            ...item,
            mosqueId: tenantId,
            ...(item.tenantId ? { tenantId } : {}),
          }));
          (db as any)[key] = [...otherTenantsOnly, ...sanitizedTenantItems];
          restoredModuleCounts[key] = sanitizedTenantItems.length;
          totalRestored += sanitizedTenantItems.length;
        }

        appendAutomationLog({
          tenantId,
          category: 'BACKUP_RESTORE',
          actionBn: 'স্ন্যাপশট থেকে সফল রিস্টোর',
          status: 'SUCCESS',
          detailsBn: `স্ন্যাপশট (${rawSnapshot.fileName}) থেকে ${toBnDigits(totalRestored)}টি রেকর্ড রিস্টোর হয়েছে। পূর্বের অবস্থার সেফটি ব্যাকআপ আইডি: ${safetyResult.snapshot.id}`,
          actorId: user.id,
          actorName: user.name,
          recordId: rawSnapshot.id,
        });

        db.logAudit(
          tenantId,
          user.id,
          user.name,
          user.role,
          'RESTORE',
          'BACKUP',
          `অটো-ব্যাকআপ স্ন্যাপশট (${rawSnapshot.id}) রিস্টোর সম্পন্ন (সেফটি ব্যাকআপ: ${safetyResult.snapshot.id})`,
          rawSnapshot.id,
          getClientIp(req)
        );
        db.save();

        res.json({
          success: true,
          data: {
            restoredSnapshotId: rawSnapshot.id,
            safetyBackupId: safetyResult.snapshot.id,
            totalRestored,
            restoredModuleCounts,
          },
          message: `ডাটা সফলভাবে রিস্টোর হয়েছে (${toBnDigits(totalRestored)}টি রেকর্ড)। পূর্বের অবস্থার একটি সেফটি ব্যাকআপ সংরক্ষিত রয়েছে।`,
        });
      } catch (err: any) {
        appendAutomationLog({
          tenantId,
          category: 'BACKUP_RESTORE',
          actionBn: 'রিস্টোর ব্যর্থ',
          status: 'FAILED',
          detailsBn: `রিস্টোর প্রক্রিয়ায় ত্রুটি: ${err?.message || 'অজানা ত্রুটি'}`,
          actorId: user.id,
          actorName: user.name,
          recordId: rawSnapshot.id,
        });
        db.save();
        res.status(500).json({
          success: false,
          error: { code: 'RESTORE_FAILED', message: `রিস্টোর করতে সমস্যা হয়েছে: ${err?.message || 'অজানা ত্রুটি'}` },
        });
      }
    }
  );

  // 7. Scan Smart Reminders & Follow-ups (100% Deterministic Logic)
  router.get('/reminders/scan', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const mosque = req.currentMosque!;
    const user = req.user!;
    const leadDays = Math.min(90, Math.max(1, Number(req.query.leadDays || 7) || 7));
    const categoryFilter = String(req.query.category || 'ALL');
    const recordAudit = req.query.manualScan === 'true';

    const allReminders = scanTenantReminders(mosque.id, leadDays);
    const filtered =
      categoryFilter !== 'ALL'
        ? allReminders.filter((r) => r.category === categoryFilter)
        : allReminders;

    const countsByCategory: Record<string, number> = {
      ALL: allReminders.length,
      RENT_DUE: 0,
      LEASE_EXPIRY: 0,
      DONATION_INSTALLMENT: 0,
      LIBRARY_RETURN: 0,
      CEMETERY_REUSE: 0,
      COMMITTEE_EXPIRY: 0,
      NOTE_FOLLOWUP: 0,
    };
    for (const r of allReminders) {
      countsByCategory[r.category] = (countsByCategory[r.category] || 0) + 1;
    }

    if (recordAudit) {
      appendAutomationLog({
        tenantId: mosque.id,
        category: 'REMINDER_SCAN',
        actionBn: 'স্মার্ট রিমাইন্ডার স্ক্যান সম্পন্ন',
        status: 'SUCCESS',
        detailsBn: `আগামী ${toBnDigits(leadDays)} দিনের সময়সীমায় মোট ${toBnDigits(allReminders.length)}টি বকেয়া/মেয়াদ/ফলো-আপ শনাক্ত হয়েছে।`,
        actorId: user.id,
        actorName: user.name,
      });
      db.save();
    }

    res.json({
      success: true,
      data: {
        leadDays,
        scannedAt: new Date().toISOString(),
        countsByCategory,
        reminders: filtered,
      },
    });
  });

  // 8. Dismiss Reminder Item for Current Tenant
  router.post('/reminders/:reminderId/dismiss', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const reminderId = String(req.params.reminderId || '').trim();
    if (!reminderId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'রিমাইন্ডার আইডি প্রয়োজন।' } });
    }
    if (!db.dismissedReminderKeys[tenantId]) {
      db.dismissedReminderKeys[tenantId] = [];
    }
    if (!db.dismissedReminderKeys[tenantId].includes(reminderId)) {
      db.dismissedReminderKeys[tenantId].push(reminderId);
      db.save();
    }
    res.json({ success: true, message: 'রিমাইন্ডার তালিকা থেকে সাময়িকভাবে সরানো হয়েছে।' });
  });

  // 9. Reset Dismissed Reminders for Current Tenant
  router.post('/reminders/reset-dismissed', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    db.dismissedReminderKeys[tenantId] = [];
    db.save();
    res.json({ success: true, message: 'সকল লুকানো রিমাইন্ডার পুনরায় দৃশ্যমান করা হয়েছে।' });
  });

  // 10. Generate AI or Manual Reminder/Notice Draft (Human-in-the-Loop — Saves ONLY as PENDING_REVIEW)
  router.post('/queue/draft', authenticate, async (req: AutomationAuthRequest, res: Response) => {
    const mosque = req.currentMosque!;
    const user = req.user!;
    const { reminderId, channel = 'SMS_DRAFT', useAi = true, leadDays = 30, toneBn } = req.body || {};

    if (!reminderId || typeof reminderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REMINDER', message: 'ড্রাফট তৈরির জন্য একটি রিমাইন্ডার নির্বাচন করুন।' },
      });
    }

    const safeChannel: NotificationDraftChannel =
      channel === 'WHATSAPP_DRAFT' || channel === 'NOTICE_DRAFT' ? channel : 'SMS_DRAFT';

    // Re-resolve reminder deterministically from live tenant data (never trust client-forged money/names!)
    const scanned = scanTenantReminders(mosque.id, Math.max(90, Number(leadDays) || 90));
    const reminder = scanned.find((r) => r.id === reminderId);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: { code: 'REMINDER_NOT_FOUND', message: 'নির্বাচিত রিমাইন্ডারটি সিস্টেমে পাওয়া যায়নি বা ইতোমধ্যে নিষ্পত্তি হয়েছে।' },
      });
    }

    let titleBn = '';
    let messageBn = '';
    let aiGenerated = false;
    let modelUsed: string | undefined;
    let warningBn: string | undefined;

    if (useAi) {
      try {
        const aiResult = await generateAutomationReminderDraftWithAi(mosque, {
          category: reminder.category,
          categoryLabelBn: reminder.categoryLabelBn,
          channel: safeChannel,
          targetEntityName: reminder.targetEntityName,
          targetPhone: reminder.targetPhone,
          titleBn: reminder.titleBn,
          detailsBn: reminder.detailsBn,
          dueDate: reminder.dueDate,
          amountDue: reminder.amountDue,
          daysDelta: reminder.daysDelta,
          deterministicFacts: reminder.deterministicFacts,
          toneBn: typeof toneBn === 'string' ? toneBn : undefined,
        });
        titleBn = aiResult.titleBn;
        messageBn = aiResult.messageBn;
        aiGenerated = true;
        modelUsed = aiResult.modelUsed;
      } catch (err: any) {
        // Fail-safe: Never crash; inform user clearly and offer deterministic fallback draft
        const status = err instanceof GeminiServiceError ? err.statusCode : 500;
        const fallback = buildDeterministicReminderDraft(mosque, reminder, safeChannel);
        titleBn = fallback.titleBn;
        messageBn = fallback.messageBn;
        aiGenerated = false;
        warningBn =
          err instanceof GeminiServiceError
            ? `AI সেবা সাময়িকভাবে অনুপলব্ধ (${err.message})। নিরাপদ সিস্টেম টেমপ্লেট থেকে খসড়া তৈরি করা হয়েছে।`
            : `AI খসড়া তৈরিতে সমস্যা হওয়ায় (${status}) নির্ভুল সিস্টেম টেমপ্লেট থেকে খসড়া প্রস্তুত করা হয়েছে।`;
      }
    } else {
      const manual = buildDeterministicReminderDraft(mosque, reminder, safeChannel);
      titleBn = manual.titleBn;
      messageBn = manual.messageBn;
    }

    const nowIso = new Date().toISOString();
    const queueItem: NotificationDraftQueueItem = {
      id: `nq-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      tenantId: mosque.id,
      mosqueId: mosque.id,
      reminderId: reminder.id,
      category: reminder.category,
      categoryLabelBn: reminder.categoryLabelBn,
      channel: safeChannel,
      recipientName: reminder.targetEntityName,
      recipientPhone: reminder.targetPhone,
      titleBn,
      messageBn,
      aiGenerated,
      modelUsed,
      status: 'PENDING_REVIEW',
      deterministicFacts: reminder.deterministicFacts,
      createdAt: nowIso,
      createdBy: user.id,
      createdByName: user.name,
      updatedAt: nowIso,
    };

    db.notificationDraftQueue.unshift(queueItem);
    appendAutomationLog({
      tenantId: mosque.id,
      category: 'AI_DRAFT',
      actionBn: aiGenerated ? 'AI রিমাইন্ডার/নোটিশ ড্রাফট প্রস্তুত' : 'টেমপ্লেট রিমাইন্ডার ড্রাফট প্রস্তুত',
      status: warningBn ? 'WARNING' : 'SUCCESS',
      detailsBn: `${reminder.categoryLabelBn} (${reminder.targetEntityName})-এর জন্য খসড়া তৈরি করে মানব-অনুমোদন কিউতে রাখা হয়েছে।`,
      actorId: user.id,
      actorName: user.name,
      recordId: queueItem.id,
    });
    db.save();

    res.json({
      success: true,
      data: queueItem,
      warningBn,
      message: warningBn || 'খসড়া সফলভাবে তৈরি হয়েছে। অনুগ্রহ করে যাচাই করে অনুমোদন দিন।',
    });
  });

  // 11. List Notification Draft Queue (Tenant-Scoped)
  router.get('/queue', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const statusFilter = String(req.query.status || 'ALL');
    let items = db.notificationDraftQueue.filter((q) => q.tenantId === tenantId);
    if (statusFilter !== 'ALL') {
      items = items.filter((q) => q.status === statusFilter);
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: items });
  });

  // 12. Edit Draft Content Before Approval (Tenant-Checked)
  router.put('/queue/:id', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const item = db.notificationDraftQueue.find((q) => q.id === req.params.id);
    if (!enforceTenantOwnershipOrRespond(req, res, item, 'নোটিফিকেশন খসড়া পাওয়া যায়নি।')) return;

    const { titleBn, messageBn, channel } = req.body || {};
    if (typeof titleBn === 'string' && titleBn.trim()) item.titleBn = titleBn.trim().slice(0, 180);
    if (typeof messageBn === 'string' && messageBn.trim()) item.messageBn = messageBn.trim().slice(0, 2000);
    if (channel === 'SMS_DRAFT' || channel === 'WHATSAPP_DRAFT' || channel === 'NOTICE_DRAFT') {
      item.channel = channel;
    }
    item.updatedAt = new Date().toISOString();
    db.save();

    res.json({ success: true, data: item, message: 'খসড়া হালনাগাদ হয়েছে।' });
  });

  // 13. Human Approval Action on Draft Queue Item (Copy / Save Notice Draft / Log SMS Draft / Dismiss)
  router.post('/queue/:id/approve', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const mosque = req.currentMosque!;
    const user = req.user!;
    const item = db.notificationDraftQueue.find((q) => q.id === req.params.id);
    if (!enforceTenantOwnershipOrRespond(req, res, item, 'নোটিফিকেশন খসড়া পাওয়া যায়নি।')) return;

    const { action, titleBn, messageBn, publishPublicly = false } = req.body || {};
    if (typeof titleBn === 'string' && titleBn.trim()) item.titleBn = titleBn.trim().slice(0, 180);
    if (typeof messageBn === 'string' && messageBn.trim()) item.messageBn = messageBn.trim().slice(0, 2000);

    const nowIso = new Date().toISOString();
    item.approvedAt = nowIso;
    item.approvedBy = user.id;
    item.approvedByName = user.name;
    item.updatedAt = nowIso;

    let actionSummaryBn = '';

    if (action === 'COPY_CONFIRMED') {
      item.status = 'APPROVED_COPIED';
      item.approvedActionNoteBn = 'ব্যবহারকারী যাচাই করে কপি করেছেন';
      actionSummaryBn = `খসড়া অনুমোদন ও কপি (${item.recipientName})`;
    } else if (action === 'SAVE_NOTICE_DRAFT') {
      const notice = {
        id: `not-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        mosqueId: mosque.id,
        title: item.titleBn,
        description: item.messageBn,
        publishDate: nowIso.slice(0, 10),
        priority: 'NORMAL' as const,
        isPublic: Boolean(publishPublicly),
        status: 'ACTIVE' as const,
        publishedBy: user.id,
        publishedByName: user.name,
        createdAt: nowIso,
      };
      db.notices.unshift(notice);
      item.status = 'APPROVED_NOTICE_SAVED';
      item.approvedActionNoteBn = publishPublicly
        ? 'অনুমোদিত পাবলিক নোটিশ হিসেবে সংরক্ষিত'
        : 'অনুমোদিত অভ্যন্তরীণ নোটিশ খসড়ায় সংরক্ষিত';
      actionSummaryBn = `অনুমোদিত নোটিশ সংরক্ষণ (${item.titleBn})`;
    } else if (action === 'LOG_SMS_DRAFT') {
      db.smsLogs.unshift({
        id: `sms-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        mosqueId: mosque.id,
        recipientPhone: item.recipientPhone || 'N/A',
        recipientName: item.recipientName,
        message: item.messageBn,
        status: 'PENDING',
        sentBy: user.id,
        sentByName: user.name,
        sentAt: nowIso,
        createdAt: nowIso,
      } as any);
      item.status = 'APPROVED_SMS_LOGGED';
      item.approvedActionNoteBn = 'অনুমোদিত SMS খসড়া কিউতে যুক্ত';
      actionSummaryBn = `অনুমোদিত SMS খসড়া সংরক্ষণ (${item.recipientName})`;
    } else if (action === 'DISMISS') {
      item.status = 'DISMISSED';
      item.approvedActionNoteBn = 'ব্যবহারকারী কর্তৃক বাতিল';
      actionSummaryBn = `খসড়া বাতিল (${item.recipientName})`;
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACTION', message: 'অবৈধ অনুমোদন অ্যাকশন।' },
      });
    }

    appendAutomationLog({
      tenantId: mosque.id,
      category: 'HUMAN_APPROVAL',
      actionBn: actionSummaryBn,
      status: 'SUCCESS',
      detailsBn: `${user.name} কর্তৃক "${item.titleBn}" — ${item.approvedActionNoteBn}`,
      actorId: user.id,
      actorName: user.name,
      recordId: item.id,
    });

    db.logAudit(
      mosque.id,
      user.id,
      user.name,
      user.role,
      'APPROVE',
      'NOTIFICATION',
      `${actionSummaryBn} — ${item.approvedActionNoteBn}`,
      item.id,
      getClientIp(req)
    );

    db.save();
    res.json({
      success: true,
      data: item,
      message: `${item.approvedActionNoteBn}।`,
    });
  });

  // 14. Get Automation Execution & Audit Logs (Strictly Tenant-Scoped)
  router.get('/logs', authenticate, (req: AutomationAuthRequest, res: Response) => {
    const tenantId = req.currentMosque!.id;
    const categoryFilter = String(req.query.category || 'ALL');
    let logs = db.automationLogs.filter((l) => l.tenantId === tenantId);
    if (categoryFilter !== 'ALL') {
      logs = logs.filter((l) => l.category === categoryFilter);
    }
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: logs.slice(0, 200) });
  });

  return router;
}

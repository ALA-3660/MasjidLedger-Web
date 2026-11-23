import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileJson,
  History,
  Clock,
  HardDrive,
  X,
  Info,
  BellRing,
  Sparkles,
  Copy,
  Check,
  Eye,
  FileText,
  MessageSquare,
  ListChecks,
  RotateCcw,
  CalendarClock,
  Send,
  Trash2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { api } from '../lib/api';
import { Language } from '../lib/i18n';
import {
  AutoBackupFrequency,
  AutoBackupOverviewResponse,
  AutoBackupSnapshotMeta,
  AutoBackupSnapshotPreview,
  AutomationExecutionLog,
  AutomationLogCategory,
  AutomationReminderCategory,
  DetectedAutomationReminder,
  NotificationDraftChannel,
  NotificationDraftQueueItem,
  NotificationQueueStatus,
} from '../types/automationTypes';

interface BackupRestoreViewProps {
  currentMosque: any;
  currentUser: any;
  language?: Language;
  onRefreshData?: () => void;
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBnDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

function formatTakaBn(amount: number): string {
  const num = Number(amount || 0);
  return `৳ ${toBnDigits(num.toLocaleString('en-IN'))}`;
}

function formatBytesBn(bytes: number): string {
  const n = Number(bytes || 0);
  if (n <= 0) return '০ বাইট';
  if (n < 1024) return `${toBnDigits(n)} বাইট`;
  if (n < 1024 * 1024) return `${toBnDigits((n / 1024).toFixed(1))} KB`;
  return `${toBnDigits((n / (1024 * 1024)).toFixed(2))} MB`;
}

function formatDateTimeBn(iso?: string | null): string {
  if (!iso) return 'এখনও হয়নি';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    return d.toLocaleString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

const WEEKDAY_OPTIONS = [
  { value: 'Friday', labelBn: 'শুক্রবার' },
  { value: 'Saturday', labelBn: 'শনিবার' },
  { value: 'Sunday', labelBn: 'রবিবার' },
  { value: 'Monday', labelBn: 'সোমবার' },
  { value: 'Tuesday', labelBn: 'মঙ্গলবার' },
  { value: 'Wednesday', labelBn: 'বুধবার' },
  { value: 'Thursday', labelBn: 'বৃহস্পতিবার' },
] as const;

const REMINDER_CATEGORY_TABS: Array<{ key: 'ALL' | AutomationReminderCategory; labelBn: string }> = [
  { key: 'ALL', labelBn: 'সবগুলো' },
  { key: 'RENT_DUE', labelBn: 'বকেয়া ভাড়া' },
  { key: 'LEASE_EXPIRY', labelBn: 'চুক্তির মেয়াদ' },
  { key: 'DONATION_INSTALLMENT', labelBn: 'কিস্তি ও চাঁদা' },
  { key: 'LIBRARY_RETURN', labelBn: 'বই ফেরত' },
  { key: 'CEMETERY_REUSE', labelBn: 'কবর পুনঃব্যবহার' },
  { key: 'COMMITTEE_EXPIRY', labelBn: 'কমিটির মেয়াদ' },
  { key: 'NOTE_FOLLOWUP', labelBn: 'নোট রিমাইন্ডার' },
];

const QUEUE_STATUS_META: Record<
  NotificationQueueStatus,
  { labelBn: string; badgeClass: string }
> = {
  PENDING_REVIEW: {
    labelBn: 'মানব যাচাই অপেক্ষমাণ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  APPROVED_COPIED: {
    labelBn: 'অনুমোদিত ও কপি সম্পন্ন',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  APPROVED_NOTICE_SAVED: {
    labelBn: 'নোটিশে সংরক্ষিত',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  APPROVED_SMS_LOGGED: {
    labelBn: 'SMS খসড়া লগে যুক্ত',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  DISMISSED: {
    labelBn: 'বাতিলকৃত',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const TRIGGER_LABELS_BN: Record<AutoBackupSnapshotMeta['triggerType'], string> = {
  AUTOMATIC: 'স্বয়ংক্রিয় শিডিউল',
  MANUAL: 'ম্যানুয়াল স্ন্যাপশট',
  PRE_RESTORE_SAFETY: 'রিস্টোর-পূর্ব সেফটি',
};

const LOG_CATEGORY_OPTIONS: Array<{ key: 'ALL' | AutomationLogCategory; labelBn: string }> = [
  { key: 'ALL', labelBn: 'সব লগ' },
  { key: 'AUTO_BACKUP', labelBn: 'অটো-ব্যাকআপ' },
  { key: 'BACKUP_RESTORE', labelBn: 'রিস্টোর' },
  { key: 'REMINDER_SCAN', labelBn: 'রিমাইন্ডার স্ক্যান' },
  { key: 'AI_DRAFT', labelBn: 'AI ড্রাফট' },
  { key: 'HUMAN_APPROVAL', labelBn: 'মানব অনুমোদন' },
];

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  currentMosque,
  currentUser,
  onRefreshData,
}) => {
  const [activeHubTab, setActiveHubTab] = useState<'backups' | 'reminders' | 'queueLogs'>('backups');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // ---------------- Manual Export & Restore (Preserved 100%) ----------------
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoringManual, setIsRestoringManual] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [isManualConfirmOpen, setIsManualConfirmOpen] = useState<boolean>(false);

  // ---------------- Auto-Backup State ----------------
  const [overview, setOverview] = useState<AutoBackupOverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(false);
  const [configEnabled, setConfigEnabled] = useState<boolean>(true);
  const [configFrequency, setConfigFrequency] = useState<AutoBackupFrequency>('DAILY');
  const [configTime, setConfigTime] = useState<string>('23:30');
  const [configWeeklyDay, setConfigWeeklyDay] = useState<string>('Friday');
  const [configMonthlyDay, setConfigMonthlyDay] = useState<number>(1);
  const [configRetention, setConfigRetention] = useState<number>(15);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isRunningSnapshot, setIsRunningSnapshot] = useState<boolean>(false);
  const [snapshotNote, setSnapshotNote] = useState<string>('');
  const [downloadingSnapId, setDownloadingSnapId] = useState<string | null>(null);

  // Snapshot Preview & Confirmed Restore Modal
  const [previewData, setPreviewData] = useState<AutoBackupSnapshotPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [confirmRestoreChecked, setConfirmRestoreChecked] = useState<boolean>(false);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState<boolean>(false);

  // ---------------- Smart Reminders & AI Draft State ----------------
  const [reminders, setReminders] = useState<DetectedAutomationReminder[]>([]);
  const [countsByCategory, setCountsByCategory] = useState<Record<string, number>>({});
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const [isScanningReminders, setIsScanningReminders] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AutomationReminderCategory>('ALL');
  const [leadDays, setLeadDays] = useState<number>(7);
  const [draftingReminderId, setDraftingReminderId] = useState<string | null>(null);
  const [draftChannelPicker, setDraftChannelPicker] = useState<NotificationDraftChannel>('SMS_DRAFT');

  // Draft Review & Human Approval Modal
  const [activeDraftItem, setActiveDraftItem] = useState<NotificationDraftQueueItem | null>(null);
  const [draftEditTitle, setDraftEditTitle] = useState<string>('');
  const [draftEditMessage, setDraftEditMessage] = useState<string>('');
  const [draftWarningBanner, setDraftWarningBanner] = useState<string | null>(null);
  const [publishNoticePublicly, setPublishNoticePublicly] = useState<boolean>(false);
  const [isApprovingDraft, setIsApprovingDraft] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ---------------- Queue & Automation Logs State ----------------
  const [queueItems, setQueueItems] = useState<NotificationDraftQueueItem[]>([]);
  const [queueStatusFilter, setQueueStatusFilter] = useState<'ALL' | NotificationQueueStatus>('ALL');
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(false);
  const [automationLogs, setAutomationLogs] = useState<AutomationExecutionLog[]>([]);
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | AutomationLogCategory>('ALL');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const canManageBackups =
    !currentUser?.role ||
    ['SUPER_ADMIN', 'MOSQUE_ADMIN', 'COMMITTEE_ADMIN', 'TREASURER'].includes(currentUser.role) ||
    Boolean(currentUser?.permissions?.includes('MANAGE_SETTINGS'));

  // ---------------- Data Loaders ----------------
  const loadBackupOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const data = await api.getAutoBackupOverview();
      setOverview(data);
      setConfigEnabled(Boolean(data.config.enabled));
      setConfigFrequency(data.config.frequency || 'DAILY');
      setConfigTime(data.config.preferredTime || '23:30');
      setConfigWeeklyDay(data.config.weeklyDay || 'Friday');
      setConfigMonthlyDay(data.config.monthlyDay || 1);
      setConfigRetention(data.config.retentionCount || 15);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'অটো-ব্যাকআপ তথ্য লোড করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  const loadReminders = useCallback(
    async (manualScan: boolean = false, overrideLeadDays?: number, overrideCategory?: string) => {
      setIsScanningReminders(true);
      try {
        const res = await api.scanAutomationReminders(
          overrideLeadDays ?? leadDays,
          overrideCategory ?? selectedCategory,
          manualScan
        );
        setReminders(res.reminders || []);
        setCountsByCategory(res.countsByCategory || {});
        setLastScannedAt(res.scannedAt || new Date().toISOString());
        if (manualScan) {
          setNotification({
            type: 'success',
            text: `স্ক্যান সম্পন্ন: মোট ${toBnDigits(res.countsByCategory?.ALL ?? res.reminders.length)}টি প্রাসঙ্গিক রিমাইন্ডার শনাক্ত হয়েছে।`,
          });
        }
      } catch (err: any) {
        setNotification({
          type: 'error',
          text: err?.message || 'রিমাইন্ডার স্ক্যান করতে সমস্যা হয়েছে।',
        });
      } finally {
        setIsScanningReminders(false);
      }
    },
    [leadDays, selectedCategory]
  );

  const loadQueueAndLogs = useCallback(async () => {
    setIsLoadingQueue(true);
    setIsLoadingLogs(true);
    try {
      const [qData, lData] = await Promise.all([
        api.getNotificationDraftQueue(queueStatusFilter),
        api.getAutomationLogs(logCategoryFilter),
      ]);
      setQueueItems(qData);
      setAutomationLogs(lData);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'নোটিফিকেশন কিউ ও অটোমেশন লগ লোড করতে ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsLoadingQueue(false);
      setIsLoadingLogs(false);
    }
  }, [queueStatusFilter, logCategoryFilter]);

  useEffect(() => {
    loadBackupOverview();
    loadReminders(false);
    loadQueueAndLogs();
  }, [currentMosque?.id]);

  useEffect(() => {
    loadReminders(false, leadDays, selectedCategory);
  }, [leadDays, selectedCategory]);

  useEffect(() => {
    if (activeHubTab === 'queueLogs') {
      loadQueueAndLogs();
    }
  }, [activeHubTab, queueStatusFilter, logCategoryFilter]);

  // ---------------- Manual Export & Restore Handlers ----------------
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setNotification(null);
    try {
      await api.downloadMosqueBackup();
      setNotification({
        type: 'success',
        text: 'মসজিদের ডাটাবেজের সম্পূর্ণ ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে।',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'ব্যাকআপ ডাউনলোডে ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setNotification({
        type: 'error',
        text: 'অনুগ্রহ করে শুধুমাত্র .json ব্যাকআপ ফাইল আপলোড করুন।',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || !json.data) {
          throw new Error('অকার্যকর ব্যাকআপ ফাইল বিন্যাস।');
        }
        setParsedBackupData(json);
        setIsManualConfirmOpen(true);
      } catch {
        setNotification({
          type: 'error',
          text: 'আপলোড করা ফাইলটি সঠিক ব্যাকআপ JSON ফরম্যাট নয়।',
        });
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteManualRestore = async () => {
    if (!parsedBackupData) return;

    setIsRestoringManual(true);
    setNotification(null);
    try {
      const result = await api.restoreMosqueBackup(parsedBackupData);
      setNotification({
        type: 'success',
        text: `ডাটা সফলভাবে রিস্টোর করা হয়েছে। (অ্যাকাউন্টস: ${toBnDigits(result?.restoredCounts?.accounts || 0)}, আয়: ${toBnDigits(result?.restoredCounts?.incomeEntries || 0)}, ব্যয়: ${toBnDigits(result?.restoredCounts?.expenseEntries || 0)})`,
      });
      setIsManualConfirmOpen(false);
      setSelectedFile(null);
      setParsedBackupData(null);
      if (onRefreshData) onRefreshData();
      loadBackupOverview();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'ডাটা রিস্টোর করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsRestoringManual(false);
    }
  };

  // ---------------- Auto-Backup Handlers ----------------
  const handleSaveScheduleConfig = async () => {
    setIsSavingConfig(true);
    setNotification(null);
    try {
      await api.updateAutoBackupConfig({
        enabled: configEnabled,
        frequency: configFrequency,
        preferredTime: configTime,
        weeklyDay: configWeeklyDay as any,
        monthlyDay: configMonthlyDay,
        retentionCount: configRetention,
      });
      setNotification({
        type: 'success',
        text: 'অটো-ব্যাকআপ শিডিউল সেটিংস সফলভাবে সংরক্ষিত হয়েছে।',
      });
      await loadBackupOverview();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'শিডিউল সংরক্ষণ ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRunBackupNow = async () => {
    setIsRunningSnapshot(true);
    setNotification(null);
    try {
      const snap = await api.runAutoBackupNow(snapshotNote.trim() || undefined);
      setSnapshotNote('');
      setNotification({
        type: 'success',
        text: `নতুন ব্যাকআপ স্ন্যাপশট সংরক্ষিত হয়েছে (${toBnDigits(snap.recordCount)}টি রেকর্ড, ${formatBytesBn(snap.sizeBytes)})।`,
      });
      await loadBackupOverview();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'ব্যাকআপ স্ন্যাপশট তৈরি ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsRunningSnapshot(false);
    }
  };

  const handleOpenSnapshotPreview = async (snap: AutoBackupSnapshotMeta) => {
    setIsPreviewModalOpen(true);
    setIsLoadingPreview(true);
    setPreviewData(null);
    setConfirmRestoreChecked(false);
    try {
      const data = await api.previewAutoBackupSnapshot(snap.id);
      setPreviewData(data);
    } catch (err: any) {
      setIsPreviewModalOpen(false);
      setNotification({
        type: 'error',
        text: err?.message || 'স্ন্যাপশট প্রিভিউ লোড করা যায়নি।',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmSnapshotRestore = async () => {
    if (!previewData || !confirmRestoreChecked) return;
    setIsRestoringSnapshot(true);
    setNotification(null);
    try {
      const res = await api.restoreAutoBackupSnapshot(previewData.snapshot.id);
      setNotification({
        type: 'success',
        text: `স্ন্যাপশট থেকে ${toBnDigits(res.totalRestored)}টি রেকর্ড সফলভাবে রিস্টোর হয়েছে। নিরাপত্তার জন্য পূর্বের অবস্থার একটি সেফটি ব্যাকআপ স্বয়ংক্রিয়ভাবে সংরক্ষিত রয়েছে।`,
      });
      setIsPreviewModalOpen(false);
      setPreviewData(null);
      if (onRefreshData) onRefreshData();
      await loadBackupOverview();
      await loadQueueAndLogs();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'স্ন্যাপশট রিস্টোর করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

  const handleDownloadSnapshot = async (snap: AutoBackupSnapshotMeta) => {
    setDownloadingSnapId(snap.id);
    try {
      await api.downloadAutoBackupSnapshot(snap.id, snap.fileName);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'স্ন্যাপশট ডাউনলোড ব্যর্থ হয়েছে।',
      });
    } finally {
      setDownloadingSnapId(null);
    }
  };

  // ---------------- Smart Reminder & AI Draft Handlers ----------------
  const openDraftReviewModal = (item: NotificationDraftQueueItem, warningBn?: string) => {
    setActiveDraftItem(item);
    setDraftEditTitle(item.titleBn);
    setDraftEditMessage(item.messageBn);
    setDraftWarningBanner(warningBn || null);
    setPublishNoticePublicly(false);
  };

  const handleGenerateDraft = async (
    reminder: DetectedAutomationReminder,
    useAi: boolean
  ) => {
    setDraftingReminderId(reminder.id);
    setNotification(null);
    try {
      const { item, warningBn } = await api.draftAutomationNotification({
        reminderId: reminder.id,
        channel: draftChannelPicker,
        useAi,
        leadDays: Math.max(leadDays, 30),
      });
      openDraftReviewModal(item, warningBn);
      await loadReminders(false);
      await loadQueueAndLogs();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'রিমাইন্ডার ড্রাফট তৈরি করতে সমস্যা হয়েছে।',
      });
    } finally {
      setDraftingReminderId(null);
    }
  };

  const handleDismissReminder = async (reminderId: string) => {
    try {
      await api.dismissAutomationReminder(reminderId);
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'রিমাইন্ডার লুকাতে সমস্যা হয়েছে।',
      });
    }
  };

  const handleResetDismissed = async () => {
    try {
      await api.resetDismissedAutomationReminders();
      await loadReminders(false);
      setNotification({
        type: 'success',
        text: 'সকল লুকানো রিমাইন্ডার পুনরায় দৃশ্যমান করা হয়েছে।',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'পুনরুদ্ধার ব্যর্থ হয়েছে।',
      });
    }
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // Fallback copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopiedId(key);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 2000);
    }
  };

  const handleApproveDraftAction = async (
    action: 'COPY_CONFIRMED' | 'SAVE_NOTICE_DRAFT' | 'LOG_SMS_DRAFT' | 'DISMISS'
  ) => {
    if (!activeDraftItem) return;
    setIsApprovingDraft(true);
    setNotification(null);
    try {
      if (action === 'COPY_CONFIRMED') {
        await handleCopyText(draftEditMessage, activeDraftItem.id);
      }
      const updated = await api.approveNotificationDraftQueueItem(activeDraftItem.id, {
        action,
        titleBn: draftEditTitle.trim(),
        messageBn: draftEditMessage.trim(),
        publishPublicly: action === 'SAVE_NOTICE_DRAFT' ? publishNoticePublicly : false,
      });
      setNotification({
        type: 'success',
        text:
          action === 'COPY_CONFIRMED'
            ? 'খসড়া ক্লিপবোর্ডে কপি হয়েছে এবং অনুমোদিত হিসেবে সংরক্ষিত হয়েছে। এখন আপনি নিরাপদে পাঠাতে পারেন।'
            : updated.approvedActionNoteBn || 'অনুমোদন সফলভাবে সংরক্ষিত হয়েছে।',
      });
      setActiveDraftItem(null);
      await loadReminders(false);
      await loadQueueAndLogs();
      if (action === 'SAVE_NOTICE_DRAFT' && onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'অনুমোদন সংরক্ষণে সমস্যা হয়েছে।',
      });
    } finally {
      setIsApprovingDraft(false);
    }
  };

  const pendingQueueCount = queueItems.filter((q) => q.status === 'PENDING_REVIEW').length;
  const totalReminderCount = countsByCategory.ALL ?? reminders.length;
  const statusSummary = overview?.statusSummary;

  return (
    <div className="space-y-6 font-tiro pb-12">
      {/* Top Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-siliguri font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>মাল্টি-টেন্যান্ট অটো-ব্যাকআপ ও মানব-নিয়ন্ত্রিত রিমাইন্ডার ইঞ্জিন</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-siliguri font-bold tracking-tight text-white">
              অটো-ব্যাকআপ ও রিমাইন্ডার অটোমেশন হাব
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/85 max-w-2xl leading-relaxed">
              {currentMosque?.nameBn || currentMosque?.name || 'আপনার মসজিদ'}-এর সম্পূর্ণ JSON ডাটাবেসের নির্ধারিত ব্যাকআপ, প্রিভিউসহ নিরাপদ রিস্টোর এবং বকেয়া ভাড়া, কিস্তি, বই ফেরত ও মেয়াদের নির্ভুল রিমাইন্ডার খসড়া।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {canManageBackups && (
              <button
                type="button"
                onClick={handleRunBackupNow}
                disabled={isRunningSnapshot}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-siliguri font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isRunningSnapshot ? 'animate-spin' : ''}`} />
                <span>{isRunningSnapshot ? 'স্ন্যাপশট হচ্ছে...' : 'এখনই স্ন্যাপশট নিন'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-siliguri font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'ডাউনলোড হচ্ছে...' : 'ম্যানুয়াল JSON এক্সপোর্ট'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap gap-2 relative z-10">
          <button
            type="button"
            onClick={() => setActiveHubTab('backups')}
            className={`px-4 py-2 rounded-xl text-xs font-siliguri font-bold flex items-center gap-2 transition cursor-pointer ${
              activeHubTab === 'backups'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>অটো-ব্যাকআপ ও রিস্টোর</span>
            <span className="font-baloo px-1.5 py-0.5 rounded bg-emerald-600/20 text-[11px]">
              {toBnDigits(statusSummary?.totalSnapshots ?? 0)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab('reminders')}
            className={`px-4 py-2 rounded-xl text-xs font-siliguri font-bold flex items-center gap-2 transition cursor-pointer ${
              activeHubTab === 'reminders'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>স্মার্ট রিমাইন্ডার ও ✨ AI ড্রাফট</span>
            <span className="font-baloo px-1.5 py-0.5 rounded bg-amber-500/25 text-[11px]">
              {toBnDigits(totalReminderCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab('queueLogs')}
            className={`px-4 py-2 rounded-xl text-xs font-siliguri font-bold flex items-center gap-2 transition cursor-pointer ${
              activeHubTab === 'queueLogs'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'bg-white/10 text-emerald-100 hover:bg-white/20'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>নোটিফিকেশন কিউ ও অটোমেশন লগ</span>
            {pendingQueueCount > 0 && (
              <span className="font-baloo px-1.5 py-0.5 rounded bg-rose-500 text-white text-[11px]">
                {toBnDigits(pendingQueueCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-siliguri font-semibold flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: AUTO-BACKUP SCHEDULE, SNAPSHOT HISTORY & MANUAL RESTORE       */}
      {/* ==================================================================== */}
      {activeHubTab === 'backups' && (
        <div className="space-y-6">
          {/* Live Auto-Backup Status Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>সর্বশেষ ব্যাকআপ</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-sm font-siliguri font-bold text-slate-900">
                {formatDateTimeBn(statusSummary?.lastBackupAt)}
              </div>
              <div className="text-[11px] flex items-center gap-1.5">
                {statusSummary?.lastBackupStatus === 'SUCCESS' ? (
                  <span className="text-emerald-700 font-semibold">সফলভাবে সম্পন্ন</span>
                ) : statusSummary?.lastBackupStatus === 'FAILED' ? (
                  <span className="text-rose-700 font-semibold">ব্যর্থ হয়েছে</span>
                ) : (
                  <span className="text-slate-500">এখনও স্ন্যাপশট নেই</span>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>সর্বশেষ ফাইলের সাইজ</span>
                <HardDrive className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl font-baloo font-bold text-slate-900">
                {formatBytesBn(statusSummary?.lastBackupSizeBytes || 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                মোট স্টোরেজ: <span className="font-baloo font-semibold">{formatBytesBn(statusSummary?.totalStorageBytes || 0)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>পরবর্তী অটো শিডিউল</span>
                <CalendarClock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-sm font-siliguri font-bold text-slate-900">
                {configEnabled ? formatDateTimeBn(statusSummary?.nextScheduledAt) : 'শিডিউল বন্ধ আছে'}
              </div>
              <div className="text-[11px] text-slate-500">
                {configEnabled
                  ? `${configFrequency === 'DAILY' ? 'দৈনিক' : configFrequency === 'WEEKLY' ? 'সাপ্তাহিক' : 'মাসিক'} • সময় ${toBnDigits(configTime)}`
                  : 'চালু করতে নিচে সেটিংস সংরক্ষণ করুন'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>সংরক্ষিত স্ন্যাপশট</span>
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xl font-baloo font-bold text-slate-900">
                {toBnDigits(statusSummary?.totalSnapshots ?? 0)}টি
              </div>
              <div className="text-[11px] text-slate-500">
                অটো: <span className="font-baloo">{toBnDigits(statusSummary?.automaticCount ?? 0)}</span> • সেফটি:{' '}
                <span className="font-baloo">{toBnDigits(statusSummary?.safetyCount ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Schedule Config + Instant Snapshot Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  <span>অটো-ব্যাকআপ শিডিউল ও রিটেনশন পলিসি</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  শুধুমাত্র এই মসজিদের ডাটা সম্পূর্ণ বিচ্ছিন্ন (Tenant-Isolated) JSON স্ন্যাপশট হিসেবে SHA-256 চেকসামসহ সংরক্ষিত হবে।
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                <input
                  type="checkbox"
                  checked={configEnabled}
                  disabled={!canManageBackups}
                  onChange={(e) => setConfigEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-xs font-siliguri font-bold text-slate-800">
                  {configEnabled ? 'অটো-ব্যাকআপ সক্রিয়' : 'অটো-ব্যাকআপ বন্ধ'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([
                {
                  key: 'DAILY',
                  title: 'দৈনিক অটো-ব্যাকআপ',
                  desc: 'প্রতিদিন নির্ধারিত সময়ে স্বয়ংক্রিয় স্ন্যাপশট তৈরি হবে',
                },
                {
                  key: 'WEEKLY',
                  title: 'সাপ্তাহিক ব্যাকআপ',
                  desc: 'সপ্তাহে একদিন (যেমন: জুমাবার শেষে) ব্যাকআপ সংরক্ষণ হবে',
                },
                {
                  key: 'MONTHLY',
                  title: 'মাসিক আর্কাইভ ব্যাকআপ',
                  desc: 'প্রতি মাসের নির্ধারিত তারিখে পূর্ণাঙ্গ অডিট স্ন্যাপশট হবে',
                },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!canManageBackups}
                  onClick={() => setConfigFrequency(opt.key)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    configFrequency === opt.key
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-siliguri font-bold text-slate-900">{opt.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                  নির্ধারিত সময়
                </label>
                <input
                  type="time"
                  value={configTime}
                  disabled={!canManageBackups}
                  onChange={(e) => setConfigTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-baloo border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              {configFrequency === 'WEEKLY' && (
                <div>
                  <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                    সাপ্তাহিক বার
                  </label>
                  <select
                    value={configWeeklyDay}
                    disabled={!canManageBackups}
                    onChange={(e) => setConfigWeeklyDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-siliguri border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  >
                    {WEEKDAY_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.labelBn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {configFrequency === 'MONTHLY' && (
                <div>
                  <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                    মাসের তারিখ (১–২৮)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={configMonthlyDay}
                    disabled={!canManageBackups}
                    onChange={(e) => setConfigMonthlyDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 text-xs font-baloo border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                  সর্বোচ্চ স্ন্যাপশট সংরক্ষণ (৩–৯০)
                </label>
                <input
                  type="number"
                  min={3}
                  max={90}
                  value={configRetention}
                  disabled={!canManageBackups}
                  onChange={(e) => setConfigRetention(Math.min(90, Math.max(3, Number(e.target.value) || 15)))}
                  className="w-full px-3 py-2 text-xs font-baloo border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                  তাৎক্ষণিক স্ন্যাপশট নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={snapshotNote}
                  disabled={!canManageBackups}
                  onChange={(e) => setSnapshotNote(e.target.value)}
                  placeholder="যেমন: মাসিক ক্লোজিং পূর্ব ব্যাকআপ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {canManageBackups && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveScheduleConfig}
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-siliguri font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isSavingConfig ? 'সংরক্ষণ হচ্ছে...' : 'শিডিউল সেটিংস সংরক্ষণ করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunBackupNow}
                  disabled={isRunningSnapshot}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-siliguri font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isRunningSnapshot ? 'animate-spin' : ''}`} />
                  <span>{isRunningSnapshot ? 'স্ন্যাপশট তৈরি হচ্ছে...' : 'এখনই স্ন্যাপশট সংরক্ষণ করুন'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Snapshot History List (Preview + Integrity + Safe Restore + Download) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  <span>অটো-ব্যাকআপ স্ন্যাপশট তালিকা ও নিরাপদ রিস্টোর</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  যেকোনো স্ন্যাপশট রিস্টোর করার আগে প্রিভিউ ও SHA-256 অখণ্ডতা যাচাই করুন; রিস্টোরের পূর্বে বর্তমান ডাটার একটি স্বয়ংক্রিয় সেফটি ব্যাকআপ রাখা হবে।
                </p>
              </div>
              <button
                type="button"
                onClick={loadBackupOverview}
                disabled={isLoadingOverview}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-bold rounded-xl flex items-center gap-1.5 cursor-pointer self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverview ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            </div>

            {!overview?.snapshots?.length ? (
              <div className="p-10 text-center space-y-2">
                <Database className="w-9 h-9 text-slate-300 mx-auto" />
                <p className="text-sm font-siliguri font-bold text-slate-700">
                  এখনও কোনো সার্ভার-সাইড স্ন্যাপশট তৈরি হয়নি
                </p>
                <p className="text-xs text-slate-500">
                  উপরের &ldquo;এখনই স্ন্যাপশট সংরক্ষণ করুন&rdquo; বাটনে ক্লিক করে প্রথম নিরাপদ ব্যাকআপ স্ন্যাপশট নিন।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-siliguri text-slate-600">
                    <tr>
                      <th className="px-5 py-3">তারিখ ও সময়</th>
                      <th className="px-4 py-3">ধরন ও নোট</th>
                      <th className="px-4 py-3">রেকর্ড ও সাইজ</th>
                      <th className="px-4 py-3">অবস্থা</th>
                      <th className="px-5 py-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.snapshots.map((snap) => (
                      <tr key={snap.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-siliguri font-bold text-slate-900">
                            {formatDateTimeBn(snap.createdAt)}
                          </div>
                          <div className="text-[11px] text-slate-500">{snap.createdByName}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-siliguri font-bold border ${
                              snap.triggerType === 'PRE_RESTORE_SAFETY'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : snap.triggerType === 'AUTOMATIC'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {TRIGGER_LABELS_BN[snap.triggerType]}
                          </span>
                          {snap.noteBn && (
                            <div className="text-[11px] text-slate-600 mt-1 max-w-xs truncate">
                              {snap.noteBn}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-baloo font-bold text-slate-900">
                            {toBnDigits(snap.recordCount)}টি রেকর্ড
                          </div>
                          <div className="text-[11px] font-baloo text-slate-500">
                            {formatBytesBn(snap.sizeBytes)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {snap.status === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-siliguri font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              সফল
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-siliguri font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ব্যর্থ
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {snap.status === 'SUCCESS' && (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenSnapshotPreview(snap)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg font-siliguri font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>প্রিভিউ ও রিস্টোর</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadSnapshot(snap)}
                                disabled={downloadingSnapId === snap.id}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-siliguri font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>ডাউনলোড</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Existing Manual 1-Click Export & File Upload Restore Cards (Preserved Intact) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-siliguri font-bold text-slate-900">
                    ম্যানুয়াল সম্পূর্ণ ডাটা এক্সপোর্ট (.json)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    যেকোনো সময় আপনার মসজিদের সকল হিসাব, ভাউচার, কমিটি, স্টাফ, সম্পদ ও নথির অফলাইন JSON কপি ডাউনলোড করে রাখুন।
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                  <div className="font-siliguri font-bold text-slate-900 flex items-center gap-1.5 mb-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600" />
                    <span>এক্সপোর্ট ফাইলে অন্তর্ভুক্ত:</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                    <li>✓ ক্যাশ ও ব্যাংক অ্যাকাউন্ট</li>
                    <li>✓ সকল আয় ও ব্যয় ভাউচার</li>
                    <li>✓ ওয়াকফ সম্পদ ও ভাড়াটিয়া</li>
                    <li>✓ কমিটি, স্টাফ ও কবরস্থান</li>
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-siliguri font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isExporting ? 'ব্যাকআপ ডাউনলোড হচ্ছে...' : 'ব্যাকআপ ফাইল ডাউনলোড করুন (.json)'}</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-siliguri font-bold text-slate-900">
                    অফলাইন ব্যাকআপ ফাইল থেকে রিস্টোর
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    পূর্বে ডাউনলোড করা `.json` ফাইল আপলোড করে যাচাইপূর্বক এই মসজিদের ডাটা পুনরুদ্ধার করুন।
                  </p>
                </div>
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-5 text-center transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <FileJson className="w-9 h-9 text-indigo-500 mx-auto mb-1.5" />
                  <p className="text-xs font-siliguri font-bold text-slate-800">
                    {selectedFile
                      ? selectedFile.name
                      : 'কম্পিউটার বা মোবাইল থেকে .json ব্যাকআপ ফাইল নির্বাচন করুন'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    শুধুমাত্র বৈধ MasjidLedger Backup JSON গ্রহণ করা হবে
                  </p>
                </div>
              </div>
              <div className="text-[11px] bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>অন্য মসজিদের ব্যাকআপ ফাইল এখানে রিস্টোর করা যাবে না; রিস্টোরের আগে বর্তমান অবস্থার স্ন্যাপশট নেওয়া উত্তম।</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SMART REMINDERS & AI DRAFT ENGINE (HUMAN-IN-THE-LOOP)         */}
      {/* ==================================================================== */}
      {activeHubTab === 'reminders' && (
        <div className="space-y-5">
          {/* Mandatory Human-in-the-Loop Protection Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-siliguri font-bold text-emerald-950">
                  কঠোর মানব-নিয়ন্ত্রিত সুরক্ষা (Human-in-the-Loop) সক্রিয় রয়েছে
                </div>
                <p className="text-xs text-emerald-900/85 leading-relaxed">
                  সব বকেয়া, টাকা ও তারিখ সিস্টেমের লাইভ ডাটাবেস থেকে নির্ভুলভাবে হিসাব করা হয়। কোনো SMS, WhatsApp, ইমেইল বা পাবলিক নোটিশ কখনোই স্বয়ংক্রিয়ভাবে পাঠানো হবে না — প্রতিটি খসড়া আপনি নিজে যাচাই, সম্পাদনা ও অনুমোদন করবেন।
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={draftChannelPicker}
                onChange={(e) => setDraftChannelPicker(e.target.value as NotificationDraftChannel)}
                className="px-3 py-2 text-xs font-siliguri font-bold bg-white border border-emerald-300 text-emerald-950 rounded-xl"
                title="ড্রাফট মাধ্যম"
              >
                <option value="SMS_DRAFT">SMS খসড়া</option>
                <option value="WHATSAPP_DRAFT">WhatsApp খসড়া</option>
                <option value="NOTICE_DRAFT">অফিসিয়াল নোটিশ খসড়া</option>
              </select>
            </div>
          </div>

          {/* Scan Toolbar & Filters */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-siliguri font-bold text-slate-700">অগ্রিম সময়সীমা:</span>
                {[1, 3, 7, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setLeadDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-siliguri font-bold transition cursor-pointer ${
                      leadDays === d
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="font-baloo">{toBnDigits(d)}</span> দিন আগে
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lastScannedAt && (
                  <span className="text-[11px] text-slate-500">
                    সর্বশেষ স্ক্যান: {formatDateTimeBn(lastScannedAt)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => loadReminders(true)}
                  disabled={isScanningReminders}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-siliguri font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningReminders ? 'animate-spin' : ''}`} />
                  <span>পুনরায় স্ক্যান করুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDismissed}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  title="লুকানো রিমাইন্ডার ফিরিয়ে আনুন"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>লুকানো দেখুন</span>
                </button>
              </div>
            </div>

            {/* Category Filter Strip */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
              {REMINDER_CATEGORY_TABS.map((cat) => {
                const count = countsByCategory[cat.key] ?? 0;
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-siliguri font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.labelBn}</span>
                    <span
                      className={`font-baloo text-[11px] px-1.5 py-0.2 rounded ${
                        active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                      }`}
                    >
                      {toBnDigits(count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detected Reminders List */}
          {isScanningReminders ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs font-siliguri">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-2" />
              লাইভ ডাটাবেস থেকে বকেয়া, মেয়াদ ও রিমাইন্ডার যাচাই করা হচ্ছে...
            </div>
          ) : reminders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-siliguri font-bold text-slate-900">
                এই সময়সীমায় কোনো বকেয়া বা আসন্ন রিমাইন্ডার পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                আপনি অগ্রিম সময়সীমা বাড়িয়ে (&ldquo;৩০ দিন আগে&rdquo;) বা &ldquo;লুকানো দেখুন&rdquo; ব্যবহার করে অন্যান্য আইটেম যাচাই করতে পারেন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reminders.map((rem) => {
                const isUrgent = rem.priority === 'URGENT' || rem.daysDelta < 0;
                const isDrafting = draftingReminderId === rem.id;
                return (
                  <div
                    key={rem.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition ${
                      isUrgent ? 'border-rose-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-siliguri font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {rem.categoryLabelBn}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-siliguri font-bold border ${
                              rem.daysDelta < 0
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : rem.daysDelta === 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {rem.daysDelta < 0
                              ? `${toBnDigits(Math.abs(rem.daysDelta))} দিন অতিক্রান্ত`
                              : rem.daysDelta === 0
                              ? 'আজ নির্ধারিত দিন'
                              : `${toBnDigits(rem.daysDelta)} দিন বাকি`}
                          </span>
                          {rem.queueStatus && rem.queueStatus !== 'NONE' && (
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-siliguri font-bold border ${
                                QUEUE_STATUS_META[rem.queueStatus].badgeClass
                              }`}
                            >
                              {QUEUE_STATUS_META[rem.queueStatus].labelBn}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-siliguri font-bold text-slate-900">
                          {rem.titleBn}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{rem.detailsBn}</p>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                          <span className="text-slate-700 font-siliguri">
                            প্রাপক: <strong>{rem.targetEntityName}</strong>
                          </span>
                          {rem.targetPhone && (
                            <span className="font-baloo text-slate-600">📞 {toBnDigits(rem.targetPhone)}</span>
                          )}
                          <span className="font-baloo text-slate-600">📅 {toBnDigits(rem.dueDate)}</span>
                          {typeof rem.amountDue === 'number' && rem.amountDue > 0 && (
                            <span className="font-baloo font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              বকেয়া: {formatTakaBn(rem.amountDue)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 lg:min-w-[215px]">
                        <button
                          type="button"
                          onClick={() => handleGenerateDraft(rem, true)}
                          disabled={isDrafting}
                          className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-siliguri font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isDrafting ? 'animate-spin' : ''}`} />
                          <span>{isDrafting ? 'খসড়া তৈরি হচ্ছে...' : '✨ AI রিমাইন্ডার/নোটিশ ড্রাফট'}</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateDraft(rem, false)}
                            disabled={isDrafting}
                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-siliguri font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>ম্যানুয়াল খসড়া</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissReminder(rem.id)}
                            className="px-2.5 py-2 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 rounded-xl transition cursor-pointer"
                            title="তালিকা থেকে লুকান"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: NOTIFICATION DRAFT QUEUE & AUTOMATION EXECUTION LOGS          */}
      {/* ==================================================================== */}
      {activeHubTab === 'queueLogs' && (
        <div className="space-y-6">
          {/* Notification Draft Queue */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <span>নোটিফিকেশন খসড়া কিউ ও মানব-অনুমোদন অবস্থা</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI বা টেমপ্লেটে প্রস্তুত প্রতিটি খসড়া এখানে সংরক্ষিত থাকে। ব্যবহারকারী যাচাই ও অনুমোদন না করা পর্যন্ত কোনো বার্তা প্রেরিত হয় না।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={queueStatusFilter}
                  onChange={(e) => setQueueStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-siliguri font-bold border border-slate-300 rounded-xl bg-white"
                >
                  <option value="ALL">সব স্ট্যাটাস</option>
                  <option value="PENDING_REVIEW">অপেক্ষমাণ যাচাই</option>
                  <option value="APPROVED_COPIED">কপি ও অনুমোদিত</option>
                  <option value="APPROVED_NOTICE_SAVED">নোটিশে সংরক্ষিত</option>
                  <option value="APPROVED_SMS_LOGGED">SMS খসড়া লগ</option>
                  <option value="DISMISSED">বাতিলকৃত</option>
                </select>
                <button
                  type="button"
                  onClick={loadQueueAndLogs}
                  disabled={isLoadingQueue}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            {queueItems.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs space-y-1">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-siliguri font-bold text-slate-700">কিউতে কোনো খসড়া নেই</p>
                <p>&ldquo;স্মার্ট রিমাইন্ডার&rdquo; ট্যাব থেকে যেকোনো আইটেমের খসড়া তৈরি করুন।</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {queueItems.map((item) => (
                  <div key={item.id} className="p-5 hover:bg-slate-50/70 transition space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-siliguri font-bold border ${
                            QUEUE_STATUS_META[item.status].badgeClass
                          }`}
                        >
                          {QUEUE_STATUS_META[item.status].labelBn}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-siliguri bg-slate-100 text-slate-700">
                          {item.categoryLabelBn}
                        </span>
                        {item.aiGenerated && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-siliguri font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✨ AI খসড়া
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {formatDateTimeBn(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.messageBn, item.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-siliguri font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>কপি</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDraftReviewModal(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-siliguri font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>পর্যালোচনা ও অনুমোদন</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-siliguri font-bold text-slate-900">
                        {item.titleBn}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                        {item.messageBn}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        প্রাপক: <strong className="text-slate-700">{item.recipientName}</strong>
                        {item.recipientPhone ? ` (${toBnDigits(item.recipientPhone)})` : ''}
                      </span>
                      {item.approvedByName && (
                        <span className="text-emerald-700 font-siliguri font-semibold">
                          অনুমোদনকারী: {item.approvedByName} • {item.approvedActionNoteBn}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Automation Execution & Audit Log */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>অটোমেশন অ্যাক্টিভিটি ও ব্যাকআপ অডিট লগ</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  অটো-ব্যাকআপ, রিস্টোর, রিমাইন্ডার স্ক্যান, AI ড্রাফট ও মানব-অনুমোদনের পূর্ণাঙ্গ টেন্যান্ট-ভিত্তিক ইতিহাস।
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LOG_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLogCategoryFilter(opt.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-siliguri font-bold cursor-pointer ${
                      logCategoryFilter === opt.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.labelBn}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="p-8 text-center text-xs text-slate-500">লগ লোড হচ্ছে...</div>
            ) : automationLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                এই ক্যাটাগরিতে এখনও কোনো অটোমেশন লগ রেকর্ড হয়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-siliguri text-slate-600">
                    <tr>
                      <th className="px-5 py-3">সময়</th>
                      <th className="px-4 py-3">কার্যক্রম</th>
                      <th className="px-4 py-3">বিবরণ</th>
                      <th className="px-4 py-3">পরিচালনাকারী</th>
                      <th className="px-5 py-3 text-right">ফলাফল</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {automationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                          {formatDateTimeBn(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-siliguri font-bold text-slate-900">
                          {log.actionBn}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-md">{log.detailsBn}</td>
                        <td className="px-4 py-3 text-slate-700">{log.actorName}</td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-siliguri font-bold border ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : log.status === 'WARNING'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {log.status === 'SUCCESS'
                              ? 'সফল'
                              : log.status === 'WARNING'
                              ? 'সতর্কতা'
                              : 'ব্যর্থ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: AUTO-BACKUP SNAPSHOT PREVIEW & CONFIRMED RESTORE            */}
      {/* ==================================================================== */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>স্ন্যাপশট প্রিভিউ ও নিরাপদ রিস্টোর</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingPreview || !previewData ? (
              <div className="py-10 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                SHA-256 অখণ্ডতা ও স্ন্যাপশট রেকর্ড যাচাই করা হচ্ছে...
              </div>
            ) : (
              <>
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    previewData.integrityValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {previewData.integrityValid ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-siliguri font-bold">{previewData.integrityMessageBn}</div>
                    <div className="text-[11px] opacity-85 mt-0.5">
                      মসজিদ: <strong>{previewData.mosqueNameBn}</strong> • সময়:{' '}
                      {formatDateTimeBn(previewData.exportedAt)} • মোট রেকর্ড:{' '}
                      <span className="font-baloo font-bold">{toBnDigits(previewData.totalRecords)}</span>টি
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-siliguri font-bold text-slate-800">
                    মডিউল-ভিত্তিক রেকর্ড প্রিভিউ:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                    {previewData.moduleSummary.map((m) => (
                      <div
                        key={m.key}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-700 truncate pr-2">{m.labelBn}</span>
                        <span className="font-baloo font-bold text-slate-900">
                          {toBnDigits(m.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-2">
                  <div className="font-siliguri font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>স্বয়ংক্রিয় রিস্টোর-পূর্ব সেফটি ব্যাকআপ সুরক্ষা</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    রিস্টোর শুরু হওয়ার ঠিক আগে সিস্টেম স্বয়ংক্রিয়ভাবে আপনার বর্তমান ডাটার একটি <strong>সেফটি ব্যাকআপ</strong> সংরক্ষণ করবে, যাতে প্রয়োজনে আপনি আবার বর্তমান অবস্থায় ফিরে আসতে পারেন।
                  </p>
                  {canManageBackups && previewData.integrityValid && (
                    <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmRestoreChecked}
                        onChange={(e) => setConfirmRestoreChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-xs font-siliguri font-bold text-amber-950">
                        আমি উপরের প্রিভিউ যাচাই করেছি এবং এই স্ন্যাপশট থেকে রিস্টোর করার নিশ্চিত অনুমতি দিচ্ছি।
                      </span>
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-bold rounded-xl cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  {canManageBackups && (
                    <button
                      type="button"
                      disabled={
                        !previewData.integrityValid ||
                        !confirmRestoreChecked ||
                        isRestoringSnapshot
                      }
                      onClick={handleConfirmSnapshotRestore}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-siliguri font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isRestoringSnapshot ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {isRestoringSnapshot ? 'রিস্টোর হচ্ছে...' : 'নিশ্চিতভাবে রিস্টোর করুন'}
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: HUMAN-IN-THE-LOOP DRAFT PREVIEW, EDIT & APPROVAL            */}
      {/* ==================================================================== */}
      {activeDraftItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>খসড়া যাচাই, সম্পাদনা ও মানব-অনুমোদন</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeDraftItem.aiGenerated
                    ? `✨ AI প্রস্তুতকৃত খসড়া (${activeDraftItem.modelUsed || 'Gemini'})`
                    : 'সিস্টেম টেমপ্লেট খসড়া'}{' '}
                  • প্রাপক: <strong>{activeDraftItem.recipientName}</strong>
                  {activeDraftItem.recipientPhone
                    ? ` (${toBnDigits(activeDraftItem.recipientPhone)})`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDraftItem(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {draftWarningBanner && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{draftWarningBanner}</span>
              </div>
            )}

            {/* Verified Deterministic Facts Box */}
            {activeDraftItem.deterministicFacts &&
              Object.keys(activeDraftItem.deterministicFacts).length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="text-[11px] font-siliguri font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ডাটাবেস থেকে যাচাইকৃত মূল তথ্য (মিলিয়ে নিন):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(activeDraftItem.deterministicFacts).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700"
                      >
                        <strong className="font-siliguri">{k.replace(/_/g, ' ')}:</strong>{' '}
                        <span className="font-baloo">{toBnDigits(String(v))}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Editable Title & Message */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                  শিরোনাম (সম্পাদনাযোগ্য)
                </label>
                <input
                  type="text"
                  value={draftEditTitle}
                  onChange={(e) => setDraftEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-siliguri font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-siliguri font-bold text-slate-700 mb-1">
                  বার্তা / নোটিশের মূল খসড়া (পাঠানোর আগে সম্পাদনা করুন)
                </label>
                <textarea
                  rows={6}
                  value={draftEditMessage}
                  onChange={(e) => setDraftEditMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-tiro leading-relaxed border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={publishNoticePublicly}
                  onChange={(e) => setPublishNoticePublicly(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="font-siliguri">
                  নোটিশ হিসেবে সংরক্ষণ করলে পাবলিক পোর্টালেও দৃশ্যমান করুন (ডিফল্ট: অভ্যন্তরীণ খসড়া)
                </span>
              </label>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900">
              সুরক্ষা নোট: নিচের যেকোনো বাটনে ক্লিক করলেও কোনো তৃতীয় পক্ষের SMS বা WhatsApp স্বয়ংক্রিয়ভাবে সেন্ড হবে না — কেবল আপনার অনুমোদিত খসড়া কপি বা সিস্টেম লগে সংরক্ষিত হবে।
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isApprovingDraft}
                onClick={() => handleApproveDraftAction('DISMISS')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-siliguri font-bold rounded-xl cursor-pointer"
              >
                খসড়া বাতিল
              </button>
              <button
                type="button"
                disabled={isApprovingDraft}
                onClick={() => handleApproveDraftAction('LOG_SMS_DRAFT')}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-siliguri font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SMS খসড়া লগে যুক্ত করুন</span>
              </button>
              <button
                type="button"
                disabled={isApprovingDraft}
                onClick={() => handleApproveDraftAction('SAVE_NOTICE_DRAFT')}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-siliguri font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>নোটিশে সংরক্ষণ করুন</span>
              </button>
              <button
                type="button"
                disabled={isApprovingDraft}
                onClick={() => handleApproveDraftAction('COPY_CONFIRMED')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-siliguri font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>কপি ও অনুমোদন করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: MANUAL JSON FILE RESTORE CONFIRMATION (PRESERVED)           */}
      {/* ==================================================================== */}
      {isManualConfirmOpen && parsedBackupData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-siliguri font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>অফলাইন ব্যাকআপ রিস্টোর নিশ্চিতকরণ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-siliguri font-bold text-indigo-900">ব্যাকআপ ফাইলের সংক্ষিপ্ত বিবরণ:</div>
              <div className="text-indigo-800 space-y-1 text-[11px]">
                <p>
                  ● মসজিদের নাম:{' '}
                  <strong>{parsedBackupData?.mosque?.nameBn || parsedBackupData?.mosque?.name || 'অজানা'}</strong>
                </p>
                <p>
                  ● ব্যাকআপ গ্রহণের তারিখ:{' '}
                  <strong>{formatDateTimeBn(parsedBackupData?.exportedAt)}</strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে এই ব্যাকআপ ফাইল থেকে আপনার মসজিদের ডাটা রিস্টোর করতে চান? এটি সিস্টেমে তথ্য আপডেট বা পুনরুদ্ধার করবে।
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManualConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-bold rounded-xl cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isRestoringManual}
                onClick={handleExecuteManualRestore}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-siliguri font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRestoringManual ? 'animate-spin' : ''}`} />
                <span>{isRestoringManual ? 'রিস্টোর হচ্ছে...' : 'হ্যাঁ, ডাটা রিস্টোর করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

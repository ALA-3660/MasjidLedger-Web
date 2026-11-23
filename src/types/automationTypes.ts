export type AutoBackupFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type AutoBackupTriggerType = 'AUTOMATIC' | 'MANUAL' | 'PRE_RESTORE_SAFETY';
export type AutoBackupSnapshotStatus = 'SUCCESS' | 'FAILED';

export interface AutoBackupScheduleConfig {
  tenantId: string;
  mosqueId: string;
  enabled: boolean;
  frequency: AutoBackupFrequency;
  preferredTime: string; // HH:MM (24h)
  weeklyDay: 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  monthlyDay: number; // 1-28
  retentionCount: number; // max snapshots to retain
  lastRunAt?: string;
  lastRunStatus?: AutoBackupSnapshotStatus;
  lastErrorMessage?: string;
  nextScheduledAt?: string;
}

export interface AutoBackupSnapshotMeta {
  id: string;
  tenantId: string;
  mosqueId: string;
  mosqueNameBn: string;
  triggerType: AutoBackupTriggerType;
  scheduleFrequency?: AutoBackupFrequency;
  status: AutoBackupSnapshotStatus;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  recordCount: number;
  moduleCounts: Record<string, number>;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  errorMessage?: string;
  noteBn?: string;
}

export interface AutoBackupSnapshotPreview {
  snapshot: AutoBackupSnapshotMeta;
  integrityValid: boolean;
  integrityMessageBn: string;
  fileExists: boolean;
  exportedAt: string;
  mosqueNameBn: string;
  totalRecords: number;
  moduleSummary: Array<{
    key: string;
    labelBn: string;
    count: number;
  }>;
}

export type AutomationReminderCategory =
  | 'RENT_DUE'
  | 'LEASE_EXPIRY'
  | 'DONATION_INSTALLMENT'
  | 'LIBRARY_RETURN'
  | 'CEMETERY_REUSE'
  | 'COMMITTEE_EXPIRY'
  | 'NOTE_FOLLOWUP';

export type AutomationReminderPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DetectedAutomationReminder {
  id: string;
  tenantId: string;
  mosqueId: string;
  category: AutomationReminderCategory;
  categoryLabelBn: string;
  priority: AutomationReminderPriority;
  titleBn: string;
  subtitleBn: string;
  targetEntityName: string;
  targetPhone?: string;
  dueDate?: string;
  daysDelta: number; // negative = overdue, 0 = today, positive = days remaining
  amountDue?: number;
  sourceModule: string;
  sourceRecordId: string;
  targetTab: string;
  detailsBn: string;
  deterministicFacts: Record<string, string | number>;
  queueStatus: 'NONE' | 'PENDING_REVIEW' | 'APPROVED_COPIED' | 'APPROVED_NOTICE_SAVED' | 'APPROVED_SMS_LOGGED' | 'DISMISSED';
  linkedQueueId?: string;
}

export type NotificationDraftChannel = 'SMS_DRAFT' | 'WHATSAPP_DRAFT' | 'NOTICE_DRAFT';

export type NotificationQueueStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED_COPIED'
  | 'APPROVED_NOTICE_SAVED'
  | 'APPROVED_SMS_LOGGED'
  | 'DISMISSED';

export interface NotificationDraftQueueItem {
  id: string;
  tenantId: string;
  mosqueId: string;
  reminderId: string;
  category: AutomationReminderCategory;
  categoryLabelBn: string;
  channel: NotificationDraftChannel;
  recipientName: string;
  recipientPhone?: string;
  titleBn: string;
  messageBn: string;
  aiGenerated: boolean;
  modelUsed?: string;
  status: NotificationQueueStatus;
  deterministicFacts: Record<string, string | number>;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedActionNoteBn?: string;
}

export type AutomationLogCategory =
  | 'AUTO_BACKUP'
  | 'BACKUP_RESTORE'
  | 'REMINDER_SCAN'
  | 'AI_DRAFT'
  | 'HUMAN_APPROVAL';

export interface AutomationExecutionLog {
  id: string;
  tenantId: string;
  mosqueId: string;
  category: AutomationLogCategory;
  actionBn: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  detailsBn: string;
  actorId: string;
  actorName: string;
  recordId?: string;
  createdAt: string;
}

export interface AutoBackupOverviewResponse {
  config: AutoBackupScheduleConfig;
  statusSummary: {
    lastBackupAt: string | null;
    lastBackupStatus: AutoBackupSnapshotStatus | 'NONE';
    lastBackupSizeBytes: number;
    lastErrorMessage?: string;
    nextScheduledAt: string | null;
    totalSnapshots: number;
    automaticCount: number;
    manualCount: number;
    safetyCount: number;
    totalStorageBytes: number;
  };
  snapshots: AutoBackupSnapshotMeta[];
}

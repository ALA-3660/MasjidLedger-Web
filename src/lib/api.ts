import {
  AutoBackupOverviewResponse,
  AutoBackupScheduleConfig,
  AutoBackupSnapshotMeta,
  AutoBackupSnapshotPreview,
  DetectedAutomationReminder,
  NotificationDraftChannel,
  NotificationDraftQueueItem,
  AutomationExecutionLog,
} from '../types/automationTypes';
import {
  ApiResponse,
  User,
  Mosque,
  DashboardStats,
  AccountHead,
  FinancialAccount,
  AccountOpeningBalancePayload,
  AccountTransfer,
  BankReconciliationRecord,
  BankAdjustmentRecord,
  BankAdjustmentDirection,
  BankAdjustmentCategory,
  IncomeEntry,
  CashDenominationData,
  ExpenseEntry,
  Donation,
  DonationBox,
  DonationBoxCollection,
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeMeetingNotice,
  MeetingResolution,
  Staff,
  StaffPayment,
  StaffAdvanceRecord,
  StaffLeaveRecord,
  StaffAttendanceRecord,
  StaffFinalSettlement,
  StaffBankTransferLetter,
  PaymentBatch,
  PaymentBatchItem,
  StaffPaymentDocument,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  AuditLog,
  SmsLog,
  UserStatus,
  SubCommittee,
  PublicPortalSettings,
  PublicPortalData,
  DEFAULT_PUBLIC_PORTAL_SETTINGS,
  QRCodeEntity,
  DailyPrayerSchedule,
  MosquePrayerSettings,
  MonthlyPrayerDay,
  AdvisoryCouncilTerm,
  AdvisorMember,
  AdvisorConsultation,
  CentralDocument,
  AreaMaster,
  FamilyMaster,
  PersonMaster,
  DonationPlan,
  CollectionWorker,
  DonationCollection,
  CollectionStatus,
  Budget,
  BudgetLine,
  CommitteeActionPlan,
  LibraryCategory,
  BookTitle,
  BookCopy,
  LibraryMember,
  BookIssue,
  BookAcquisition,
  LibraryRoom,
  LibraryRack,
  LibraryShelf,
  LibraryDashboardStats,
  EducationProgram,
  EducationLevel,
  EducationStudentProfile,
  EducationGuardianRelationship,
  EducationEnrollment,
  EducationDashboardStats,
  MaktabClass,
  MaktabAttendance,
  MaktabTeacherAssignment,
  MaktabFeeSchedule,
  MaktabFeeRecord,
  MaktabStudentProgress,
  MaktabDashboardStats,
  HifzLevel,
  HifzCurriculum,
  HifzkhanaEnrollment,
  HifzEnrollmentStatus,
  HifzSabak,
  HifzSabakStatus,
  HifzSabakPerformance,
  HifzSabaki,
  HifzSabakiStatus,
  HifzSabakiPerformance,
  HifzDaurCycle,
  HifzDaurCycleStatus,
  HifzDaur,
  HifzDaurStatus,
  HifzDaurPerformance,
  HifzRevision,
  HifzRevisionReason,
  HifzRevisionPriority,
  HifzRevisionStatus,
  HifzAttendance,
  HifzAttendanceStatus,
  HifzAttendanceReason,
  HifzUstadAssignment,
  HifzUstadAssignmentType,
  HifzUstadAssignmentStatus,
  HifzH5DashboardData,
  HifzStudentHistoryData,
  HifzUstadHistoryData,
  HifzAttendanceSummaryGroup,
  HifzReportType,
  HifzReportResult,
  HifzResidence,
  HifzResidenceBuilding,
  HifzResidenceRoom,
  HifzResidenceBed,
  HifzResidentialStatus,
  HifzResidentialAllocation,
  HifzResidentialTransfer,
  HifzResidentialTransferReason,
} from '../types';
import {
  OfficialDocument,
  OfficialDocumentTemplate,
  OfficialDocumentType,
  OfficialDocumentStatus,
} from '../types/officialDocumentTypes';
import {
  AgreementRecord,
  AgreementCategoryDef,
  AgreementTemplateDef,
  AgreementTemplatePublishStatus,
  AgreementDashboardStats,
  AgreementPartyDirectoryItem,
  AgreementStatus,
  AgreementAiDraftResult,
  AgreementClauseAssistAction,
  AgreementClauseAssistResult,
  AgreementAiReviewResult,
  AgreementOcrDocType,
  AgreementOcrExtractResult,
  AgreementReviewStage,
  AgreementReviewDecision,
  AgreementApprovalDecision,
  AgreementSignatureMethod,
  AgreementClosureInfo,
  AgreementArchiveReport,
} from '../types/agreementTypes';
import {
  QuranSurah,
  QuranJuz,
  QuranAyah,
  QuranReferenceStatus,
  QuranRangeResult,
} from '../types/quran';
import {
  SmartNote,
  SmartNoteCategory,
  SmartNoteStats,
  SmartNoteVersion,
  SmartNoteComment,
  SmartNoteActivity,
  SmartNoteReminder,
  SmartNoteAttachment,
  SmartNotePrivacyMode,
  SmartNoteShareEntry,
  SmartNoteVoiceFormatResult,
  SmartNoteOcrResult,
  SmartNoteAiAssistResult,
  NoteOcrMode,
  NoteAiAssistAction,
} from '../types/smartNotesTypes';
import {
  saveRecordToClientVault,
  mergeAndInspectClientVault,
  FinanceVaultRecordType,
} from './clientFinanceVault';

class ApiService {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private currentUserId: string = '';
  private currentMosqueId: string = '';
  private inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    const savedUser = localStorage.getItem('ml_user_id');
    const savedMosque = localStorage.getItem('ml_mosque_id');
    const savedToken = localStorage.getItem('ml_token');
    const savedRefreshToken = localStorage.getItem('ml_refresh_token');
    if (savedUser) this.currentUserId = savedUser;
    if (savedMosque) this.currentMosqueId = savedMosque;
    if (savedToken) this.token = savedToken;
    if (savedRefreshToken) this.refreshToken = savedRefreshToken;
  }

  setAuth(userId: string, mosqueId: string, token?: string, refreshToken?: string) {
    this.currentUserId = userId;
    this.currentMosqueId = mosqueId;
    if (token) {
      this.token = token;
      localStorage.setItem('ml_token', token);
    }
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('ml_refresh_token', refreshToken);
    }
    localStorage.setItem('ml_user_id', userId);
    localStorage.setItem('ml_mosque_id', mosqueId);
    localStorage.setItem('ml_last_activity_at', String(Date.now()));
  }

  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.currentUserId = '';
    this.currentMosqueId = '';
    localStorage.removeItem('ml_token');
    localStorage.removeItem('ml_refresh_token');
    localStorage.removeItem('ml_user_id');
    localStorage.removeItem('ml_mosque_id');
    localStorage.removeItem('ml_last_activity_at');
    this.inFlightRequests.clear();
    this.refreshPromise = null;
  }

  hasToken(): boolean {
    return Boolean(this.getToken());
  }

  getToken(): string | null {
    return this.token || (typeof window !== 'undefined' ? localStorage.getItem('ml_token') : null);
  }

  getAuthHeaders(overrideUserId?: string, overrideMosqueId?: string): Record<string, string> {
    const token = this.getToken();
    const userId =
      overrideUserId ||
      this.currentUserId ||
      (typeof window !== 'undefined' ? localStorage.getItem('ml_user_id') || '' : '');
    const mosqueId =
      overrideMosqueId ||
      this.currentMosqueId ||
      (typeof window !== 'undefined' ? localStorage.getItem('ml_mosque_id') || '' : '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-mosque-id': mosqueId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async refreshAccessToken(): Promise<boolean> {
    const activeRefreshToken =
      this.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('ml_refresh_token') : null);
    if (!activeRefreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: activeRefreshToken,
          }),
        });

        if (!response.ok) {
          return false;
        }

        const res = await response.json();
        if (res.success && res.data?.token) {
          this.token = res.data.token;
          localStorage.setItem('ml_token', res.data.token);
          if (res.data.refreshToken) {
            this.refreshToken = res.data.refreshToken;
            localStorage.setItem('ml_refresh_token', res.data.refreshToken);
          }
          return true;
        }
        return false;
      } catch (err) {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    const cacheKey = isGet ? `${endpoint}:${this.currentUserId}:${this.currentMosqueId}` : null;

    if (cacheKey && this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey) as Promise<ApiResponse<T>>;
    }

    const promise = this.executeRequest<T>(endpoint, options).finally(() => {
      if (cacheKey) {
        this.inFlightRequests.delete(cacheKey);
      }
    });

    if (cacheKey) {
      this.inFlightRequests.set(cacheKey, promise);
    }

    return promise;
  }

  private async executeRequest<T>(endpoint: string, options: RequestInit = {}, retryCount: number = 0): Promise<ApiResponse<T>> {
    const activeUserId =
      this.currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('ml_user_id') || '' : '');
    const activeMosqueId =
      this.currentMosqueId || (typeof window !== 'undefined' ? localStorage.getItem('ml_mosque_id') || '' : '');
    const activeToken = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': activeUserId,
      'x-mosque-id': activeMosqueId,
      ...(options.headers as Record<string, string>),
    };

    if (activeToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const controller = new AbortController();
    const timeoutMs = options.method && options.method.toUpperCase() !== 'GET' ? 30000 : 25000;
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new DOMException('Request timeout', 'TimeoutError'));
      } catch {
        controller.abort();
      }
    }, timeoutMs);

    if (options.signal) {
      if (options.signal.aborted) {
        try {
          controller.abort(options.signal.reason);
        } catch {
          controller.abort();
        }
      } else {
        options.signal.addEventListener(
          'abort',
          () => {
            try {
              controller.abort(options.signal?.reason);
            } catch {
              controller.abort();
            }
          },
          { once: true }
        );
      }
    }

    try {
      const response = await fetch(`/api/v1${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Token Expiry with automatic refresh and single-shot retry
      if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh') && retryCount === 0) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.executeRequest<T>(endpoint, options, 1);
        }
        // Clear invalid/expired local session so UI prompts a clean re-login
        this.clearAuth();
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        return json;
      }

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: text || `সার্ভার অনুরোধ ব্যর্থ হয়েছে (${response.status})`,
          },
        };
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort =
        err.name === 'AbortError' ||
        err.name === 'TimeoutError' ||
        (err.message && err.message.includes('aborted'));

      const isGet = !options.method || options.method.toUpperCase() === 'GET';

      // Auto-retry transient GET failures (e.g. during server startup or brief network reconnection)
      if (!isAbort && isGet && retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 350));
        return this.executeRequest<T>(endpoint, options, retryCount + 1);
      }

      if (!isAbort) {
        console.warn(`[MasjidLedger API] Request failed for ${endpoint}:`, err.message || err);
      }

      return {
        success: false,
        error: {
          code: isAbort ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
          message: isAbort
            ? 'সার্ভার অনুরোধের সময়সীমা পার হয়েছে বা বাতিল হয়েছে।'
            : (err.message && !err.message.includes('fetch') ? err.message : 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।'),
        },
      };
    }
  }

  // Auth & Mosque
  async login(credentials: { identifier?: string; phone?: string; phoneOrEmail?: string; password: string; mosqueId?: string }): Promise<{ user: User; token: string; refreshToken?: string }> {
    const payload = {
      identifier: credentials.identifier || credentials.phone || credentials.phoneOrEmail || '',
      phone: credentials.phone || credentials.identifier || '',
      phoneOrEmail: credentials.phoneOrEmail || credentials.identifier || credentials.phone || '',
      password: credentials.password,
      mosqueId: credentials.mosqueId,
    };
    const res = await this.request<{ user: User; token: string; refreshToken?: string; accessToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'লগইন ব্যর্থ হয়েছে। সঠিক তথ্য প্রদান করুন।');
    }
    const accessToken = res.data.token || res.data.accessToken || '';
    const refreshToken = res.data.refreshToken;
    this.setAuth(res.data.user.id, res.data.user.mosqueId, accessToken, refreshToken);
    return res.data;
  }

  async registerMosque(payload: {
    adminName: string;
    phone: string;
    email: string;
    mosqueName: string;
    address: string;
    password?: string;
  }): Promise<{ user: User; mosque: Mosque; token: string; refreshToken?: string }> {
    const res = await this.request<{ user: User; mosque: Mosque; token: string; refreshToken?: string; accessToken?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'মসজিদ রেজিস্ট্রেশন ব্যর্থ হয়েছে। সকল প্রয়োজনীয় তথ্য প্রদান করুন।');
    }
    const accessToken = res.data.token || res.data.accessToken || '';
    const refreshToken = res.data.refreshToken;
    this.setAuth(res.data.user.id, res.data.user.mosqueId || res.data.mosque.id, accessToken, refreshToken);
    return res.data;
  }

  async forgotPassword(identifier: string): Promise<any> {
    const res = await this.request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
    if (!res.success) throw new Error(res.error?.message || 'টোকেন পাঠাতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async resetPassword(identifier: string, token: string, newPassword: string): Promise<any> {
    const res = await this.request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, token, newPassword }),
    });
    if (!res.success) throw new Error(res.error?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  async logout(): Promise<void> {
    const refToken = this.refreshToken;
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refToken }),
      });
    } catch {}
    this.clearAuth();
  }

  async getCurrentUser(): Promise<User | null> {
    const res = await this.request<{ user: User; mosque: Mosque }>('/auth/me');
    return res.data?.user || null;
  }

  async getMosque(): Promise<Mosque | null> {
    const res = await this.request<Mosque>('/mosques/current');
    return res.data || null;
  }

  async getMosques(): Promise<Mosque[]> {
    const res = await this.request<Mosque[]>('/mosques');
    return res.data || [];
  }

  // SaaS Platform Admin Methods
  async getSaasStats(): Promise<any> {
    const res = await this.request<any>('/saas/stats');
    return res.data || null;
  }

  async getSaasMosques(): Promise<any[]> {
    const res = await this.request<any[]>('/saas/mosques');
    return res.data || [];
  }

  async updateSaasMosqueStatus(id: string, status: string, reason?: string): Promise<any> {
    const res = await this.request<any>(`/saas/mosques/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
    return res.data;
  }

  async sendSaasBroadcast(data: { title: string; message: string; priority?: string; isEmergency?: boolean }): Promise<any> {
    const res = await this.request<any>('/saas/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'ব্রডকাস্ট প্রেরণে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getSaasBroadcasts(): Promise<any[]> {
    const res = await this.request<any[]>('/saas/broadcasts');
    return res.data || [];
  }

  async deleteSaasBroadcast(id: string): Promise<boolean> {
    const res = await this.request<boolean>(`/saas/broadcasts/${id}`, { method: 'DELETE' });
    return res.success;
  }

  async getSaasAiSettings(): Promise<{
    activeModel: string;
    source: 'SUPER_ADMIN_OVERRIDE' | 'ENV_VARIABLE' | 'SYSTEM_DEFAULT';
    sourceLabelBn: string;
    overrideModel: string;
    envModel: string;
    defaultModel: string;
    updatedAt: string | null;
    updatedBy: string | null;
    updatedByName: string | null;
    notes: string;
    recommendedModels: Array<{
      id: string;
      labelBn: string;
      descriptionBn: string;
      badgeBn: string;
      recommended?: boolean;
    }>;
  }> {
    const res = await this.request<any>('/saas/ai-settings');
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI মডেল সেটিংস লোড করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateSaasAiSettings(payload: { modelName: string; notes?: string }): Promise<{
    data: any;
    message?: string;
  }> {
    const res = await this.request<any>('/saas/ai-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'AI মডেল সেভ করতে ব্যর্থ হয়েছে');
    }
    return { data: res.data, message: res.message };
  }

  async testSaasAiModel(modelName?: string): Promise<{
    ok: boolean;
    modelName: string;
    latencyMs: number;
    replyPreviewBn: string;
    testedAt: string;
  }> {
    const res = await this.request<any>('/saas/ai-settings/test', {
      method: 'POST',
      body: JSON.stringify({ modelName: modelName || '' }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI মডেল পরীক্ষা ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  // Backup & Restore Suite
  async downloadMosqueBackup(): Promise<void> {
    const response = await fetch('/api/v1/backup/export', {
      headers: {
        'x-user-id': this.currentUserId,
        'x-mosque-id': this.currentMosqueId,
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('ব্যাকআপ ডাউনলোড করতে ব্যর্থ হয়েছে');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MasjidLedger_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async restoreMosqueBackup(backupData: any): Promise<any> {
    const res = await this.request<any>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupData }),
    });
    if (!res.success) throw new Error(res.error?.message || 'ডাটা রিস্টোর ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // Auto-Backup & Reminder/Notification Automation Suite
  // ==========================================
  async getAutoBackupOverview(): Promise<AutoBackupOverviewResponse> {
    const res = await this.request<AutoBackupOverviewResponse>('/automation/backups/overview');
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'অটো-ব্যাকআপ তথ্য লোড করতে সমস্যা হয়েছে');
    }
    return res.data;
  }

  async updateAutoBackupConfig(
    config: Partial<AutoBackupScheduleConfig>
  ): Promise<AutoBackupScheduleConfig> {
    const res = await this.request<AutoBackupScheduleConfig>('/automation/backups/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'অটো-ব্যাকআপ সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async runAutoBackupNow(noteBn?: string): Promise<AutoBackupSnapshotMeta> {
    const res = await this.request<AutoBackupSnapshotMeta>('/automation/backups/run-now', {
      method: 'POST',
      body: JSON.stringify({ noteBn }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যাকআপ স্ন্যাপশট তৈরি করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async previewAutoBackupSnapshot(id: string): Promise<AutoBackupSnapshotPreview> {
    const res = await this.request<AutoBackupSnapshotPreview>(
      `/automation/backups/${encodeURIComponent(id)}/preview`
    );
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'স্ন্যাপশট প্রিভিউ লোড করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async restoreAutoBackupSnapshot(id: string): Promise<{
    restoredSnapshotId: string;
    safetyBackupId: string;
    totalRestored: number;
    restoredModuleCounts: Record<string, number>;
  }> {
    const res = await this.request<any>(
      `/automation/backups/${encodeURIComponent(id)}/restore`,
      {
        method: 'POST',
        body: JSON.stringify({ confirmRestore: true }),
      }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'স্ন্যাপশট রিস্টোর ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async downloadAutoBackupSnapshot(id: string, fileName?: string): Promise<void> {
    const response = await fetch(`/api/v1/automation/backups/${encodeURIComponent(id)}/download`, {
      headers: {
        'x-user-id': this.currentUserId,
        'x-mosque-id': this.currentMosqueId,
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!response.ok) {
      let msg = 'স্ন্যাপশট ডাউনলোড করতে ব্যর্থ হয়েছে';
      try {
        const errJson = await response.json();
        if (errJson?.error?.message) msg = errJson.error.message;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `MasjidLedger_Snapshot_${id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async scanAutomationReminders(
    leadDays: number = 7,
    category: string = 'ALL',
    manualScan: boolean = false
  ): Promise<{
    leadDays: number;
    scannedAt: string;
    countsByCategory: Record<string, number>;
    reminders: DetectedAutomationReminder[];
  }> {
    const qs = new URLSearchParams({
      leadDays: String(leadDays),
      category,
      manualScan: manualScan ? 'true' : 'false',
    });
    const res = await this.request<any>(`/automation/reminders/scan?${qs.toString()}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'রিমাইন্ডার স্ক্যান করতে সমস্যা হয়েছে');
    }
    return res.data;
  }

  async dismissAutomationReminder(reminderId: string): Promise<void> {
    const res = await this.request<any>(
      `/automation/reminders/${encodeURIComponent(reminderId)}/dismiss`,
      { method: 'POST' }
    );
    if (!res.success) {
      throw new Error(res.error?.message || 'রিমাইন্ডার লুকাতে সমস্যা হয়েছে');
    }
  }

  async resetDismissedAutomationReminders(): Promise<void> {
    const res = await this.request<any>('/automation/reminders/reset-dismissed', {
      method: 'POST',
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'লুকানো রিমাইন্ডার পুনরুদ্ধারে সমস্যা হয়েছে');
    }
  }

  async draftAutomationNotification(payload: {
    reminderId: string;
    channel: NotificationDraftChannel;
    useAi?: boolean;
    leadDays?: number;
    toneBn?: string;
  }): Promise<{ item: NotificationDraftQueueItem; warningBn?: string }> {
    const res = await this.request<NotificationDraftQueueItem>('/automation/queue/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'খসড়া তৈরি করতে সমস্যা হয়েছে');
    }
    return { item: res.data, warningBn: (res as any).warningBn };
  }

  async getNotificationDraftQueue(status: string = 'ALL'): Promise<NotificationDraftQueueItem[]> {
    const qs = new URLSearchParams({ status });
    const res = await this.request<NotificationDraftQueueItem[]>(
      `/automation/queue?${qs.toString()}`
    );
    if (!res.success) {
      throw new Error(res.error?.message || 'নোটিফিকেশন কিউ লোড করতে সমস্যা হয়েছে');
    }
    return res.data || [];
  }

  async updateNotificationDraftQueueItem(
    id: string,
    payload: { titleBn?: string; messageBn?: string; channel?: NotificationDraftChannel }
  ): Promise<NotificationDraftQueueItem> {
    const res = await this.request<NotificationDraftQueueItem>(
      `/automation/queue/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'খসড়া হালনাগাদ করতে সমস্যা হয়েছে');
    }
    return res.data;
  }

  async approveNotificationDraftQueueItem(
    id: string,
    payload: {
      action: 'COPY_CONFIRMED' | 'SAVE_NOTICE_DRAFT' | 'LOG_SMS_DRAFT' | 'DISMISS';
      titleBn?: string;
      messageBn?: string;
      publishPublicly?: boolean;
    }
  ): Promise<NotificationDraftQueueItem> {
    const res = await this.request<NotificationDraftQueueItem>(
      `/automation/queue/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'অনুমোদন প্রক্রিয়ায় সমস্যা হয়েছে');
    }
    return res.data;
  }

  async getAutomationLogs(category: string = 'ALL'): Promise<AutomationExecutionLog[]> {
    const qs = new URLSearchParams({ category });
    const res = await this.request<AutomationExecutionLog[]>(
      `/automation/logs?${qs.toString()}`
    );
    if (!res.success) {
      throw new Error(res.error?.message || 'অটোমেশন লগ লোড করতে সমস্যা হয়েছে');
    }
    return res.data || [];
  }

  // SMS Gateway Suite Methods
  async getSmsSettings(): Promise<any> {
    const res = await this.request<any>('/sms/settings');
    return res.data || null;
  }

  async updateSmsSettings(settings: any): Promise<any> {
    const res = await this.request<any>('/sms/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (!res.success) throw new Error(res.error?.message || 'এসএমএস সেটিংস আপডেট করতে সমস্যা হয়েছে');
    return res.data;
  }

  async getSmsLogs(): Promise<SmsLog[]> {
    const res = await this.request<SmsLog[]>('/sms/logs');
    return res.data || [];
  }

  async sendSmsGateway(payload: {
    recipientPhone?: string;
    recipientName?: string;
    messageText: string;
    templateType?: string;
    recipients?: Array<{ phone: string; name?: string }>;
  }): Promise<any> {
    const res = await this.request<any>('/sms/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success) throw new Error(res.error?.message || 'এসএমএস পাঠাতে সমস্যা হয়েছে');
    return res.data;
  }

  async deleteSmsLog(id: string): Promise<boolean> {
    const res = await this.request<boolean>(`/sms/logs/${id}`, { method: 'DELETE' });
    return res.success;
  }

  async getQrCodes(mosqueId?: string): Promise<QRCodeEntity[]> {
    const endpoint = mosqueId ? `/qr?mosqueId=${encodeURIComponent(mosqueId)}` : '/qr';
    const res = await this.request<QRCodeEntity[]>(endpoint);
    return res.data || [];
  }

  async createQrCode(data: Partial<QRCodeEntity>): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>('/qr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create QR code');
    return res.data!;
  }

  async updateQrCode(id: string, data: Partial<QRCodeEntity>): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>(`/qr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update QR code');
    return res.data!;
  }

  async activateQrCode(id: string): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>(`/qr/${id}/activate`, { method: 'POST' });
    if (!res.success) throw new Error(res.error?.message || 'Failed to activate QR');
    return res.data!;
  }

  async deactivateQrCode(id: string): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>(`/qr/${id}/deactivate`, { method: 'POST' });
    if (!res.success) throw new Error(res.error?.message || 'Failed to deactivate QR');
    return res.data!;
  }

  async archiveQrCode(id: string): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>(`/qr/${id}/archive`, { method: 'POST' });
    if (!res.success) throw new Error(res.error?.message || 'Failed to archive QR');
    return res.data!;
  }

  async deleteQrCode(id: string): Promise<boolean> {
    const res = await this.request<boolean>(`/qr/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete QR');
    return true;
  }

  async bulkCreateQrCodes(list: Partial<QRCodeEntity>[]): Promise<QRCodeEntity[]> {
    const res = await this.request<QRCodeEntity[]>('/qr/bulk', {
      method: 'POST',
      body: JSON.stringify({ list }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to bulk create QR codes');
    return res.data || [];
  }

  async regenerateQrToken(id: string): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>(`/qr/${id}/regenerate-token`, { method: 'POST' });
    if (!res.success) throw new Error(res.error?.message || 'Failed to regenerate QR token');
    return res.data!;
  }

  async resolveQrToken(token: string): Promise<QRCodeEntity> {
    const res = await this.request<QRCodeEntity>(`/qr/resolve/${encodeURIComponent(token)}`);
    if (!res.success) throw new Error(res.error?.message || 'QR code is invalid or expired');
    return res.data!;
  }

  async updateMosqueSettings(data: Partial<Mosque>): Promise<Mosque> {
    const res = await this.request<Mosque>('/mosques/current', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update mosque settings');
    return res.data!;
  }

  async getPublicPortalData(mosqueIdOrCode?: string): Promise<PublicPortalData> {
    const endpoint = mosqueIdOrCode ? `/public/portal/${encodeURIComponent(mosqueIdOrCode)}` : '/public/portal';
    const res = await this.request<PublicPortalData>(endpoint);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'পাবলিক পোর্টাল ডাটা পাওয়া যায়নি (No public portal data available)');
    }
    return res.data;
  }

  async getPublicPortalSettings(): Promise<PublicPortalSettings> {
    const res = await this.request<PublicPortalSettings>('/mosques/current/public-portal-settings');
    if (!res.success || !res.data) {
      return { ...DEFAULT_PUBLIC_PORTAL_SETTINGS };
    }
    return res.data;
  }

  async updatePublicPortalSettings(settings: Partial<PublicPortalSettings>): Promise<PublicPortalSettings> {
    const res = await this.request<PublicPortalSettings>('/mosques/current/public-portal-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস সংরক্ষণ করা সম্ভব হয়নি');
    }
    return res.data;
  }

  async resetPublicPortalSettings(): Promise<PublicPortalSettings> {
    const res = await this.request<PublicPortalSettings>('/mosques/current/public-portal-settings/reset', {
      method: 'POST',
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'পাবলিক পোর্টাল সেটিংস রিসেট করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  // Prayer Times API Methods
  async getPrayerSchedule(params?: { district?: string; date?: string; mosqueId?: string }): Promise<DailyPrayerSchedule> {
    const query = new URLSearchParams();
    if (params?.district) query.set('district', params.district);
    if (params?.date) query.set('date', params.date);
    if (params?.mosqueId) query.set('mosqueId', params.mosqueId);
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<DailyPrayerSchedule>(`/prayer/schedule${qs}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'নামাজের সময়সূচী লোড করা সম্ভব হয়নি');
    }
    return res.data;
  }

  async getMonthlyPrayerSchedule(params?: { year?: number; month?: number; district?: string; mosqueId?: string }): Promise<{
    year: number;
    month: number;
    district: string;
    days: MonthlyPrayerDay[];
  }> {
    const query = new URLSearchParams();
    if (params?.year) query.set('year', params.year.toString());
    if (params?.month) query.set('month', params.month.toString());
    if (params?.district) query.set('district', params.district);
    if (params?.mosqueId) query.set('mosqueId', params.mosqueId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<{ year: number; month: number; district: string; days: MonthlyPrayerDay[] }>(`/prayer/monthly${qs}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'মাসিক নামাজের সময়সূচী লোড করা সম্ভব হয়নি');
    }
    return res.data;
  }

  async updatePrayerSettings(settings: Partial<MosquePrayerSettings>): Promise<Mosque> {
    const res = await this.request<Mosque>('/mosques/current/prayer-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'নামাজের সময় সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateDailyPrayerOverride(date: string, override?: any, action?: 'UPDATE' | 'DELETE'): Promise<{
    success: boolean;
    data: Record<string, any>;
    message: string;
  }> {
    const res = await this.request<Record<string, any>>('/mosques/current/prayer-daily-override', {
      method: 'PUT',
      body: JSON.stringify({ date, override, action }),
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'নির্দিষ্ট দিনের সময়সূচি সংরক্ষণ করতে ব্যর্থ হয়েছে');
    }
    return {
      success: true,
      data: res.data || {},
      message: (res as any).message || 'সফলভাবে সংরক্ষিত হয়েছে',
    };
  }

  async uploadMosqueLogo(data: { fileName: string; fileType?: string; mimeType?: string; base64Data: string }): Promise<Mosque> {
    const res = await this.request<Mosque>('/mosques/current/branding/logo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'লোগো আপলোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async importMosqueLogoFromGoogleDrive(driveUrl: string): Promise<Mosque> {
    const res = await this.request<Mosque>('/mosques/current/branding/import-drive', {
      method: 'POST',
      body: JSON.stringify({ driveUrl }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'Google Drive থেকে লোগো ইমপোর্ট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteMosqueLogo(): Promise<Mosque> {
    const res = await this.request<Mosque>('/mosques/current/branding/logo', {
      method: 'DELETE',
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'লোগো মুছে ফেলতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getDashboardStats(): Promise<DashboardStats | null> {
    const res = await this.request<DashboardStats>('/dashboard/stats');
    return res.data || null;
  }

  // User Management
  async getUsers(): Promise<User[]> {
    const res = await this.request<User[]>('/users');
    return res.data || [];
  }

  async createUser(data: any): Promise<User> {
    const res = await this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create user');
    return res.data!;
  }

  async updateUser(id: string, data: any): Promise<User> {
    const res = await this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update user');
    return res.data!;
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const res = await this.request<User>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update user status');
    return res.data!;
  }

  async resetUserPassword(id: string, newPass: string): Promise<void> {
    const res = await this.request<void>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPass }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to reset password');
  }

  async deleteUser(id: string): Promise<void> {
    const res = await this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete user');
  }

  // Financial Accounts & Heads
  async getAccounts(): Promise<FinancialAccount[]> {
    const res = await this.request<FinancialAccount[]>('/accounting/accounts');
    return res.data || [];
  }

  async createAccount(data: Partial<FinancialAccount>): Promise<FinancialAccount> {
    const res = await this.request<FinancialAccount>('/accounting/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create account');
    return res.data!;
  }

  async updateAccount(id: string, data: Partial<FinancialAccount>): Promise<FinancialAccount> {
    const res = await this.request<FinancialAccount>(`/accounting/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update account');
    return res.data!;
  }

  async updateOpeningBalance(data: AccountOpeningBalancePayload): Promise<FinancialAccount> {
    const res = await this.request<FinancialAccount>('/accounting/accounts/opening-balance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update opening balance');
    return res.data!;
  }

  async getAccountHeads(): Promise<AccountHead[]> {
    const res = await this.request<AccountHead[]>('/accounting/account-heads');
    return res.data || [];
  }

  async createAccountHead(data: Partial<AccountHead>): Promise<AccountHead> {
    const res = await this.request<AccountHead>('/accounting/account-heads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create account head');
    return res.data!;
  }

  async updateAccountHead(id: string, data: Partial<AccountHead>): Promise<AccountHead> {
    const res = await this.request<AccountHead>(`/accounting/account-heads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update account head');
    return res.data!;
  }

  async deleteAccountHead(id: string): Promise<void> {
    const res = await this.request<void>(`/accounting/account-heads/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete account head');
  }

  private getActiveMosqueId(): string {
    return (
      this.currentMosqueId ||
      (typeof window !== 'undefined' ? localStorage.getItem('ml_mosque_id') || '' : '')
    );
  }

  private reconcileMissingVaultRecordsWithServer(
    type: FinanceVaultRecordType,
    records: any[]
  ): void {
    if (!Array.isArray(records) || records.length === 0) return;
    this.request('/accounting/reconcile-vault', {
      method: 'POST',
      body: JSON.stringify({ [type]: records }),
    }).catch(() => {});
  }

  // Incomes & Expenses
  async getIncomes(): Promise<IncomeEntry[]> {
    const res = await this.request<IncomeEntry[]>('/accounting/income');
    const serverList = res.data || [];
    const { mergedList, missingOrNewerInVault } = mergeAndInspectClientVault(
      this.getActiveMosqueId(),
      'incomeEntries',
      serverList
    );
    if (missingOrNewerInVault.length > 0) {
      this.reconcileMissingVaultRecordsWithServer('incomeEntries', missingOrNewerInVault);
    }
    return mergedList;
  }

  async createIncome(data: any): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>('/accounting/income', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add income');
    saveRecordToClientVault(this.getActiveMosqueId(), 'incomeEntries', res.data!);
    return res.data!;
  }

  async updateIncome(id: string, data: any): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update income');
    saveRecordToClientVault(this.getActiveMosqueId(), 'incomeEntries', res.data!);
    return res.data!;
  }

  async reverseIncome(id: string, reason: string): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to reverse income');
    saveRecordToClientVault(this.getActiveMosqueId(), 'incomeEntries', res.data!);
    return res.data!;
  }

  async restoreIncome(id: string, reason?: string): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to restore income');
    saveRecordToClientVault(this.getActiveMosqueId(), 'incomeEntries', res.data!);
    return res.data!;
  }

  async getExpenses(): Promise<ExpenseEntry[]> {
    const res = await this.request<ExpenseEntry[]>('/accounting/expense');
    const serverList = res.data || [];
    const { mergedList, missingOrNewerInVault } = mergeAndInspectClientVault(
      this.getActiveMosqueId(),
      'expenseEntries',
      serverList
    );
    if (missingOrNewerInVault.length > 0) {
      this.reconcileMissingVaultRecordsWithServer('expenseEntries', missingOrNewerInVault);
    }
    return mergedList;
  }

  async createExpense(data: any): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>('/accounting/expense', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add expense');
    saveRecordToClientVault(this.getActiveMosqueId(), 'expenseEntries', res.data!);
    return res.data!;
  }

  async updateExpense(id: string, data: any): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>(`/accounting/expense/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update expense');
    saveRecordToClientVault(this.getActiveMosqueId(), 'expenseEntries', res.data!);
    return res.data!;
  }

  async reverseExpense(id: string, reason: string): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>(`/accounting/expense/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to reverse expense');
    saveRecordToClientVault(this.getActiveMosqueId(), 'expenseEntries', res.data!);
    return res.data!;
  }

  async restoreExpense(id: string, reason?: string): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>(`/accounting/expense/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to restore expense');
    saveRecordToClientVault(this.getActiveMosqueId(), 'expenseEntries', res.data!);
    return res.data!;
  }

  // Donations & Donation Boxes
  async getDonations(): Promise<Donation[]> {
    const res = await this.request<Donation[]>('/donations');
    const serverList = res.data || [];
    const { mergedList, missingOrNewerInVault } = mergeAndInspectClientVault(
      this.getActiveMosqueId(),
      'donations',
      serverList
    );
    if (missingOrNewerInVault.length > 0) {
      this.reconcileMissingVaultRecordsWithServer('donations', missingOrNewerInVault);
    }
    return mergedList;
  }

  async createDonation(data: any, idempotencyKey?: string): Promise<Donation> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await this.request<Donation>('/donations', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create donation');
    saveRecordToClientVault(this.getActiveMosqueId(), 'donations', res.data!);
    return res.data!;
  }

  async cancelDonation(id: string, reason?: string): Promise<Donation> {
    const res = await this.request<Donation>(`/donations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to cancel donation');
    saveRecordToClientVault(this.getActiveMosqueId(), 'donations', res.data!);
    return res.data!;
  }

  async restoreDonation(id: string, reason?: string): Promise<Donation> {
    const res = await this.request<Donation>(`/donations/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to restore donation');
    saveRecordToClientVault(this.getActiveMosqueId(), 'donations', res.data!);
    return res.data!;
  }

  async getDonationBoxes(): Promise<DonationBox[]> {
    const res = await this.request<{ boxes: DonationBox[]; collections: DonationBoxCollection[] }>('/donation-boxes');
    return res.data?.boxes || [];
  }

  async getDonationBoxCollections(): Promise<DonationBoxCollection[]> {
    const res = await this.request<{ boxes: DonationBox[]; collections: DonationBoxCollection[] }>('/donation-boxes');
    const serverList = res.data?.collections || [];
    const { mergedList, missingOrNewerInVault } = mergeAndInspectClientVault(
      this.getActiveMosqueId(),
      'donationBoxCollections',
      serverList
    );
    if (missingOrNewerInVault.length > 0) {
      this.reconcileMissingVaultRecordsWithServer('donationBoxCollections', missingOrNewerInVault);
    }
    return mergedList;
  }

  async createDonationBox(data: any): Promise<DonationBox> {
    const res = await this.request<DonationBox>('/donation-boxes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create donation box');
    return res.data!;
  }

  async updateDonationBox(id: string, data: any): Promise<DonationBox> {
    const res = await this.request<DonationBox>(`/donation-boxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update donation box');
    return res.data!;
  }

  async createDonationBoxCollection(data: any): Promise<any> {
    const res = await this.request<any>('/donation-boxes/collect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to collect donation box');
    if (res.data?.collection) {
      saveRecordToClientVault(this.getActiveMosqueId(), 'donationBoxCollections', res.data.collection);
    }
    if (res.data?.incomeEntry) {
      saveRecordToClientVault(this.getActiveMosqueId(), 'incomeEntries', res.data.incomeEntry);
    }
    return res.data!;
  }

  // Denomination Update & Summary APIs
  async updateIncomeDenomination(id: string, denominationData: any, editReason?: string): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}/denomination`, {
      method: 'PUT',
      body: JSON.stringify({ denominationData, editReason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update income denomination');
    saveRecordToClientVault(this.getActiveMosqueId(), 'incomeEntries', res.data!);
    return res.data!;
  }

  async updateDonationDenomination(id: string, denominationData: any, editReason?: string): Promise<Donation> {
    const res = await this.request<Donation>(`/donations/${id}/denomination`, {
      method: 'PUT',
      body: JSON.stringify({ denominationData, editReason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update donation denomination');
    saveRecordToClientVault(this.getActiveMosqueId(), 'donations', res.data!);
    return res.data!;
  }

  async updateDonationBoxCollectionDenomination(id: string, denominationData: any, editReason?: string): Promise<DonationBoxCollection> {
    const res = await this.request<DonationBoxCollection>(`/donation-boxes/collections/${id}/denomination`, {
      method: 'PUT',
      body: JSON.stringify({ denominationData, editReason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update box collection denomination');
    saveRecordToClientVault(this.getActiveMosqueId(), 'donationBoxCollections', res.data!);
    return res.data!;
  }

  async getDenominationSummary(params?: { fromDate?: string; toDate?: string; collectionType?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.fromDate) query.append('fromDate', params.fromDate);
    if (params?.toDate) query.append('toDate', params.toDate);
    if (params?.collectionType) query.append('collectionType', params.collectionType);
    const res = await this.request<any>(`/accounting/denomination-summary?${query.toString()}`);
    return res.data || null;
  }

  // Inter-Account Transfer / Contra
  async transferFunds(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date?: string;
    description?: string;
    reference?: string;
    notes?: string;
  }) {
    const res = await this.request<any>('/accounting/accounts/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to transfer funds');
    return res.data!;
  }

  async transferFund(data: any) {
    return this.transferFunds(data);
  }

  async createFundTransfer(data: any) {
    return this.transferFunds(data);
  }

  async getTransfers(): Promise<AccountTransfer[]> {
    const res = await this.request<AccountTransfer[]>('/accounting/accounts/transfers');
    return res.data || [];
  }

  async getFundTransfers(): Promise<AccountTransfer[]> {
    return this.getTransfers();
  }

  async getBankReconciliations(): Promise<BankReconciliationRecord[]> {
    const res = await this.request<BankReconciliationRecord[]>('/accounting/bank-reconciliations');
    return res.data || [];
  }

  async createBankReconciliation(data: {
    accountId: string;
    accountName?: string;
    accountNumberMasked?: string;
    date: string;
    bookBalance: number;
    totalBankCredit?: number;
    totalBankDebit?: number;
    netBankAdjustment?: number;
    adjustedBookBalance?: number;
    statementBalance: number;
    verifiedBy?: string;
    notes?: string;
  }): Promise<BankReconciliationRecord> {
    const res = await this.request<BankReconciliationRecord>('/accounting/bank-reconciliations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যাংক সমন্বয় সংরক্ষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async deleteBankReconciliation(id: string): Promise<void> {
    const res = await this.request<{ id: string }>(`/accounting/bank-reconciliations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'ব্যাংক সমন্বয় লগ মুছতে সমস্যা হয়েছে।');
    }
  }

  async getBankAdjustments(accountId?: string): Promise<BankAdjustmentRecord[]> {
    const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
    const res = await this.request<BankAdjustmentRecord[]>(`/accounting/bank-adjustments${qs}`);
    return res.data || [];
  }

  async createBankAdjustment(data: {
    accountId: string;
    accountName?: string;
    accountNumberMasked?: string;
    date: string;
    direction: BankAdjustmentDirection;
    category: BankAdjustmentCategory;
    amount: number;
    reference?: string;
    notes?: string;
  }): Promise<BankAdjustmentRecord> {
    const res = await this.request<BankAdjustmentRecord>('/accounting/bank-adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যাংক মুনাফা/চার্জ সংরক্ষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async deleteBankAdjustment(id: string): Promise<void> {
    const res = await this.request<{ id: string }>(`/accounting/bank-adjustments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'ব্যাংক মুনাফা/চার্জ এন্ট্রি মুছতে সমস্যা হয়েছে।');
    }
  }

  // Committee
  async getCommitteeTerms(): Promise<CommitteeTerm[]> {
    const res = await this.request<{ terms: CommitteeTerm[]; members: CommitteeMember[]; meetings: CommitteeMeeting[] }>('/committee');
    return res.data?.terms || [];
  }

  async getCommitteeMembers(): Promise<CommitteeMember[]> {
    const res = await this.request<{ terms: CommitteeTerm[]; members: CommitteeMember[]; meetings: CommitteeMeeting[] }>('/committee');
    return res.data?.members || [];
  }

  async getCommitteeMeetings(): Promise<CommitteeMeeting[]> {
    const res = await this.request<{ terms: CommitteeTerm[]; members: CommitteeMember[]; meetings: CommitteeMeeting[] }>('/committee');
    return res.data?.meetings || [];
  }

  async createCommitteeTerm(data: any): Promise<CommitteeTerm> {
    const res = await this.request<CommitteeTerm>('/committee/terms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create committee term');
    return res.data!;
  }

  async updateCommitteeTerm(id: string, data: any): Promise<CommitteeTerm> {
    const res = await this.request<CommitteeTerm>(`/committee/terms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update committee term');
    return res.data!;
  }

  async deleteCommitteeTerm(id: string): Promise<void> {
    const res = await this.request<void>(`/committee/terms/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete committee term');
  }

  async createCommitteeMember(data: any): Promise<CommitteeMember> {
    const res = await this.request<CommitteeMember>('/committee/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add committee member');
    return res.data!;
  }

  async updateCommitteeMember(id: string, data: any): Promise<CommitteeMember> {
    const res = await this.request<CommitteeMember>(`/committee/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update committee member');
    return res.data!;
  }

  async deleteCommitteeMember(id: string): Promise<void> {
    const res = await this.request<void>(`/committee/members/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete committee member');
  }

  // Advisory Council (স্বতন্ত্র উপদেষ্টা পরিষদ)
  async getAdvisoryCouncil(): Promise<{ terms: AdvisoryCouncilTerm[]; advisors: AdvisorMember[]; consultations: AdvisorConsultation[] }> {
    const res = await this.request<{ terms: AdvisoryCouncilTerm[]; advisors: AdvisorMember[]; consultations: AdvisorConsultation[] }>('/advisors');
    if (!res.success) throw new Error(res.error?.message || 'উপদেষ্টা পরিষদের তথ্য লোড করতে ব্যর্থ হয়েছে');
    return res.data || { terms: [], advisors: [], consultations: [] };
  }

  async createAdvisoryTerm(data: any): Promise<AdvisoryCouncilTerm> {
    const res = await this.request<AdvisoryCouncilTerm>('/advisors/terms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add advisory term');
    return res.data!;
  }

  async updateAdvisoryTerm(id: string, data: any): Promise<AdvisoryCouncilTerm> {
    const res = await this.request<AdvisoryCouncilTerm>(`/advisors/terms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update advisory term');
    return res.data!;
  }

  async createAdvisorMember(data: any): Promise<AdvisorMember> {
    const res = await this.request<AdvisorMember>('/advisors/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add advisor member');
    return res.data!;
  }

  async updateAdvisorMember(id: string, data: any): Promise<AdvisorMember> {
    const res = await this.request<AdvisorMember>(`/advisors/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update advisor member');
    return res.data!;
  }

  async deleteAdvisorMember(id: string): Promise<void> {
    const res = await this.request<void>(`/advisors/members/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete advisor member');
  }

  async createAdvisorConsultation(data: any): Promise<AdvisorConsultation> {
    const res = await this.request<AdvisorConsultation>('/advisors/consultations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add consultation');
    return res.data!;
  }

  async updateAdvisorConsultation(id: string, data: any): Promise<AdvisorConsultation> {
    const res = await this.request<AdvisorConsultation>(`/advisors/consultations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update consultation');
    return res.data!;
  }

  async deleteAdvisorConsultation(id: string): Promise<void> {
    const res = await this.request<void>(`/advisors/consultations/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete consultation');
  }

  async createCommitteeMeeting(data: any): Promise<CommitteeMeeting> {
    const res = await this.request<CommitteeMeeting>('/committee/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add meeting');
    return res.data!;
  }

  async updateCommitteeMeeting(id: string, data: any): Promise<CommitteeMeeting> {
    const res = await this.request<CommitteeMeeting>(`/committee/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update meeting');
    return res.data!;
  }

  async deleteCommitteeMeeting(id: string): Promise<void> {
    const res = await this.request<void>(`/committee/meetings/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete meeting');
  }

  async logMeetingAudit(id: string, action: string, details?: string): Promise<void> {
    await this.request<void>(`/committee/meetings/${id}/audit`, {
      method: 'POST',
      body: JSON.stringify({ action, details }),
    });
  }

  async getCommitteeNotices(): Promise<CommitteeMeetingNotice[]> {
    const res = await this.request<CommitteeMeetingNotice[]>('/committee/notices');
    return res.data || [];
  }

  async createCommitteeNotice(data: any): Promise<CommitteeMeetingNotice> {
    const res = await this.request<CommitteeMeetingNotice>('/committee/notices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create notice');
    return res.data!;
  }

  async deleteCommitteeNotice(id: string): Promise<void> {
    const res = await this.request<void>(`/committee/notices/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete notice');
  }

  // Committee Resolutions (মিটিং রেজোলিউশন)
  async getCommitteeResolutions(params?: {
    meetingId?: string;
    status?: string;
    memberId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    month?: string;
    year?: string;
    priority?: string;
  }): Promise<MeetingResolution[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.append(key, val);
      });
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<MeetingResolution[]>(`/committee/resolutions${queryString}`);
    return res.data || [];
  }

  async getCommitteeResolution(id: string): Promise<MeetingResolution | null> {
    const res = await this.request<MeetingResolution>(`/committee/resolutions/${id}`);
    return res.data || null;
  }

  async createCommitteeResolution(data: any): Promise<MeetingResolution> {
    const res = await this.request<MeetingResolution>('/committee/resolutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'রেজোলিউশন তৈরি করতে ব্যর্থ হয়েছে');
    return res.data!;
  }

  async updateCommitteeResolution(id: string, data: any): Promise<MeetingResolution> {
    const res = await this.request<MeetingResolution>(`/committee/resolutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'রেজোলিউশন আপডেট করতে ব্যর্থ হয়েছে');
    return res.data!;
  }

  async updateCommitteeResolutionProgress(id: string, data: any): Promise<MeetingResolution> {
    const res = await this.request<MeetingResolution>(`/committee/resolutions/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'রেজোলিউশন অগ্রগতি আপডেট করতে ব্যর্থ হয়েছে');
    return res.data!;
  }

  async deleteCommitteeResolution(id: string, force: boolean = false): Promise<void> {
    const query = force ? '?force=true' : '';
    const res = await this.request<void>(`/committee/resolutions/${id}${query}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'রেজোলিউশন মুছে ফেলতে ব্যর্থ হয়েছে');
  }

  async duplicateCommitteeResolution(id: string): Promise<MeetingResolution> {
    const res = await this.request<MeetingResolution>(`/committee/resolutions/${id}/duplicate`, {
      method: 'POST',
    });
    if (!res.success) throw new Error(res.error?.message || 'রেজোলিউশন ডুপ্লিকেট করতে ব্যর্থ হয়েছে');
    return res.data!;
  }

  async logCommitteeResolutionAudit(id: string, action: string, details?: string): Promise<void> {
    await this.request<void>(`/committee/resolutions/${id}/audit`, {
      method: 'POST',
      body: JSON.stringify({ action, details }),
    });
  }

  // Sub-Committees Management (সাব-কমিটি ব্যবস্থাপনা)
  async getSubCommittees(): Promise<SubCommittee[]> {
    const res = await this.request<SubCommittee[]>('/sub-committees');
    return res.data || [];
  }

  async createSubCommittee(data: any): Promise<SubCommittee> {
    const res = await this.request<SubCommittee>('/sub-committees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'সাব-কমিটি তৈরি করতে ব্যর্থ হয়েছে');
    return res.data!;
  }

  async updateSubCommittee(id: string, data: any): Promise<SubCommittee> {
    const res = await this.request<SubCommittee>(`/sub-committees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'সাব-কমিটি আপডেট করতে ব্যর্থ হয়েছে');
    return res.data!;
  }

  async archiveSubCommittee(id: string): Promise<void> {
    const res = await this.request<void>(`/sub-committees/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'সাব-কমিটি আর্কাইভ করতে ব্যর্থ হয়েছে');
  }

  // Management (Staff, Assets, Properties, Cemetery, Notices)
  async getStaff(): Promise<Staff[]> {
    const res = await this.request<Staff[]>('/staff');
    return res.data || [];
  }

  async createStaff(data: Partial<Staff>): Promise<Staff> {
    const res = await this.request<Staff>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create staff');
    return res.data!;
  }

  async updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
    const res = await this.request<Staff>(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update staff');
    return res.data!;
  }

  async deleteStaff(id: string): Promise<boolean> {
    const res = await this.request<any>(`/staff/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete staff');
    return true;
  }

  async getStaffPayments(): Promise<StaffPayment[]> {
    const res = await this.request<StaffPayment[]>('/staff/payments');
    return res.data || [];
  }

  async payStaffSalary(data: any): Promise<StaffPayment> {
    const res = await this.request<StaffPayment>('/management/staff-pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to pay staff');
    return res.data!;
  }

  async createStaffPayment(data: any): Promise<StaffPayment> {
    return this.payStaffSalary(data);
  }

  async updateStaffPayment(id: string, data: any): Promise<StaffPayment> {
    const res = await this.request<StaffPayment>(`/staff/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update payment');
    return res.data!;
  }

  async cancelStaffPayment(id: string, reason?: string): Promise<boolean> {
    const res = await this.request<any>(`/staff/payments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to cancel payment');
    return true;
  }

  async getStaffBankTransferLetters(): Promise<StaffBankTransferLetter[]> {
    const res = await this.request<StaffBankTransferLetter[]>('/staff/bank-transfer-letters');
    return res.data || [];
  }

  async getNextBankTransferMemo(params?: {
    paymentType?: string;
    selectionScope?: string;
    paymentMonth?: string;
    paymentYear?: number | string;
  }): Promise<{ nextSerial: number; memoNumber: string }> {
    const query = new URLSearchParams();
    if (params?.paymentType) query.append('paymentType', params.paymentType);
    if (params?.selectionScope) query.append('selectionScope', params.selectionScope);
    if (params?.paymentMonth) query.append('paymentMonth', params.paymentMonth);
    if (params?.paymentYear) query.append('paymentYear', params.paymentYear.toString());
    const res = await this.request<{ nextSerial: number; memoNumber: string }>(`/staff/bank-transfer-letters/next-memo?${query.toString()}`);
    return res.data || { nextSerial: 1, memoNumber: '' };
  }

  async getStaffBankTransferLetter(id: string): Promise<StaffBankTransferLetter> {
    const res = await this.request<StaffBankTransferLetter>(`/staff/bank-transfer-letters/${id}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to get bank transfer letter');
    return res.data!;
  }

  async createStaffBankTransferLetter(data: Partial<StaffBankTransferLetter>): Promise<StaffBankTransferLetter> {
    const res = await this.request<StaffBankTransferLetter>('/staff/bank-transfer-letters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to save bank transfer letter');
    return res.data!;
  }

  async cancelStaffBankTransferLetter(id: string, reason?: string): Promise<boolean> {
    const res = await this.request<any>(`/staff/bank-transfer-letters/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to cancel bank transfer letter');
    return true;
  }

  // ==========================================
  // PAYMENT BATCH & DOCUMENTS APIS
  // ==========================================
  async getPaymentBatches(): Promise<PaymentBatch[]> {
    const res = await this.request<PaymentBatch[]>('/staff/payment-batches');
    return res.data || [];
  }

  async getPaymentBatch(id: string): Promise<PaymentBatch> {
    const res = await this.request<PaymentBatch>(`/staff/payment-batches/${id}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to get payment batch');
    return res.data!;
  }

  async createPaymentBatch(data: Partial<PaymentBatch>): Promise<PaymentBatch> {
    const res = await this.request<PaymentBatch>('/staff/payment-batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create payment batch');
    return res.data!;
  }

  async updatePaymentBatch(id: string, data: Partial<PaymentBatch>): Promise<PaymentBatch> {
    const res = await this.request<PaymentBatch>(`/staff/payment-batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update payment batch');
    return res.data!;
  }

  async disbursePaymentBatch(id: string, data: { accountId?: string; paymentDate?: string; notes?: string }): Promise<{ batch: PaymentBatch; payments: StaffPayment[] }> {
    const res = await this.request<{ batch: PaymentBatch; payments: StaffPayment[] }>(`/staff/payment-batches/${id}/disburse`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to disburse payment batch');
    return res.data as any;
  }

  async cancelPaymentBatch(id: string, reason?: string): Promise<boolean> {
    const res = await this.request<any>(`/staff/payment-batches/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to cancel payment batch');
    return true;
  }

  async addStaffPaymentDocument(paymentId: string, doc: Partial<StaffPaymentDocument>): Promise<{ payment: StaffPayment; document: StaffPaymentDocument }> {
    const res = await this.request<{ data: StaffPayment; document: StaffPaymentDocument }>(`/staff/payments/${paymentId}/documents`, {
      method: 'POST',
      body: JSON.stringify(doc),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to attach document to payment');
    return res.data as any;
  }

  async disburseFestivalAllowance(data: any): Promise<{ payments: StaffPayment[]; bankLetter?: any }> {
    const res = await this.request<{ payments: StaffPayment[]; bankLetter?: any }>('/staff/disburse-festival-allowance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to disburse festival allowance');
    return res.data!;
  }

  async reviseStaffSalary(id: string, data: { newSalary: number; allowance?: number; housingAllowance?: number; medicalAllowance?: number; transportAllowance?: number; otherAllowance?: number; effectiveDate: string; reason?: string }): Promise<Staff> {
    const res = await this.request<Staff>(`/staff/${id}/salary-revision`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to revise staff salary');
    return res.data!;
  }

  async addStaffAdvance(id: string, data: { amount: number; reason?: string; paymentMethod?: string; accountId?: string; advanceDate?: string; notes?: string }): Promise<{ advanceRecord: StaffAdvanceRecord; staff: Staff }> {
    const res = await this.request<{ data: StaffAdvanceRecord; staff: Staff }>(`/staff/${id}/advance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to issue staff advance');
    return { advanceRecord: res.data as any, staff: (res as any).staff };
  }

  async createStaffAdvance(id: string, data: any) {
    return this.addStaffAdvance(id, data);
  }

  async applyStaffLeave(id: string, data: { leaveType: string; leaveTypeBn?: string; startDate: string; endDate: string; daysCount?: number; reason?: string; emergencyContact?: string; notes?: string; autoApprove?: boolean }): Promise<{ leaveRecord: StaffLeaveRecord; staff: Staff }> {
    const res = await this.request<{ data: StaffLeaveRecord; staff: Staff }>(`/staff/${id}/leave`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to apply staff leave');
    return { leaveRecord: res.data as any, staff: (res as any).staff };
  }

  async createStaffLeave(id: string, data: any) {
    return this.applyStaffLeave(id, data);
  }

  async updateStaffLeave(staffId: string, leaveId: string, data: { status: string; rejectionReason?: string; notes?: string }): Promise<Staff> {
    const res = await this.request<Staff>(`/staff/${staffId}/leave/${leaveId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update leave record');
    return (res as any).staff || res.data!;
  }

  async logStaffAttendanceBulk(data: { date: string; records: Array<{ staffId: string; status: string; inTime?: string; outTime?: string; remarks?: string; prayersAttended?: string[] }> }): Promise<boolean> {
    const res = await this.request<any>('/staff/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to log attendance');
    return true;
  }

  async logStaffAttendance(data: any) {
    return this.logStaffAttendanceBulk(data);
  }

  async processStaffFinalSettlement(id: string, data: any): Promise<{ settlement: StaffFinalSettlement; staff: Staff }> {
    const res = await this.request<{ data: StaffFinalSettlement; staff: Staff }>(`/staff/${id}/final-settlement`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to process final settlement');
    return { settlement: res.data as any, staff: (res as any).staff };
  }

  async settleStaff(id: string, data: any) {
    return this.processStaffFinalSettlement(id, data);
  }

  async getAssets(params?: {
    category?: string;
    condition?: string;
    search?: string;
    location?: string;
    includeArchived?: boolean;
    termId?: string;
  }): Promise<MosqueAsset[]> {
    const query = new URLSearchParams();
    if (params) {
      if (params.category) query.append('category', params.category);
      if (params.condition) query.append('condition', params.condition);
      if (params.search) query.append('search', params.search);
      if (params.location) query.append('location', params.location);
      if (params.includeArchived) query.append('includeArchived', 'true');
      if (params.termId) query.append('termId', params.termId);
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<MosqueAsset[]>(`/assets${qs}`);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray((res.data as any).assets)) {
      return (res.data as any).assets;
    }
    return [];
  }

  async getAsset(id: string): Promise<MosqueAsset & { linkedExpense?: any; auditHistory?: any[] }> {
    const res = await this.request<any>(`/assets/${id}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch asset');
    return res.data;
  }

  async createAsset(data: any): Promise<MosqueAsset> {
    const res = await this.request<MosqueAsset>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create asset');
    return res.data!;
  }

  async updateAsset(id: string, data: any): Promise<MosqueAsset> {
    const res = await this.request<MosqueAsset>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update asset');
    return res.data!;
  }

  async addAssetServiceRecord(id: string, data: any): Promise<MosqueAsset> {
    const res = await this.request<MosqueAsset>(`/assets/${id}/service`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add service record');
    return res.data!;
  }

  async archiveAsset(id: string, isArchived: boolean, reason?: string): Promise<MosqueAsset> {
    const res = await this.request<MosqueAsset>(`/assets/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ isArchived, reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update archive status');
    return res.data!;
  }

  async deleteAsset(id: string, force: boolean = false): Promise<void> {
    const qs = force ? '?force=true' : '';
    const res = await this.request<void>(`/assets/${id}${qs}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete asset');
  }

  async clearDemoAssets(): Promise<{ count: number; message: string }> {
    const res = await this.request<{ count: number; message: string; removedCount: number }>('/assets/clear-demo', {
      method: 'POST',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to clear demo assets');
    return { count: (res as any).removedCount || (res.data as any)?.removedCount || 0, message: (res as any).message || 'Demo assets cleared' };
  }

  async logAssetAudit(id: string, action: string, details?: string): Promise<void> {
    await this.request<void>(`/assets/${id}/audit`, {
      method: 'POST',
      body: JSON.stringify({ action, details }),
    });
  }

  async getProperties(): Promise<MosqueProperty[]> {
    const res = await this.request<MosqueProperty[]>('/properties');
    return res.data || [];
  }

  async createProperty(data: any): Promise<MosqueProperty> {
    const res = await this.request<MosqueProperty>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create property');
    return res.data!;
  }

  async updateProperty(id: string, data: any): Promise<MosqueProperty> {
    const res = await this.request<MosqueProperty>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update property');
    return res.data!;
  }

  async archiveProperty(id: string, isArchived: boolean): Promise<MosqueProperty> {
    const res = await this.request<MosqueProperty>(`/properties/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ isArchived }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to archive property');
    return res.data!;
  }

  async deleteProperty(id: string, force?: boolean): Promise<{ success: boolean; message?: string }> {
    const query = force ? '?force=true' : '';
    const res = await this.request<any>(`/properties/${id}${query}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete property');
    return { success: true, message: (res as any).message };
  }

  async addPropertyTenant(propertyId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/tenants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add/update tenant');
    return res.data!;
  }

  async terminatePropertyTenant(propertyId: string, tenantId: string): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/tenants/${tenantId}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to terminate tenant');
    return res.data!;
  }

  async addPropertyInspection(propertyId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/inspections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add inspection report');
    return res.data!;
  }

  async addPropertyLegalCase(propertyId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/cases`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add legal case');
    return res.data!;
  }

  async addPropertyDocument(propertyId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add document');
    return res.data!;
  }

  async deletePropertyDocument(propertyId: string, documentId: string): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/documents/${documentId}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete document');
    return res.data!;
  }

  async collectPropertyRent(propertyId: string, data: any): Promise<any> {
    const res = await this.request<any>(`/properties/${propertyId}/rent-collections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to collect property rent');
    return res.data!;
  }

  async getCemeteryRecords(): Promise<CemeteryRecord[]> {
    const res = await this.request<CemeteryRecord[]>('/cemetery');
    return res.data || [];
  }

  async getNotices(): Promise<MosqueNotice[]> {
    const res = await this.request<MosqueNotice[]>('/notices');
    return res.data || [];
  }

  async createCemeteryRecord(data: any): Promise<CemeteryRecord> {
    const res = await this.request<CemeteryRecord>('/management/cemetery', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add cemetery record');
    return res.data!;
  }

  async updateCemeteryRecord(id: string, data: any): Promise<CemeteryRecord> {
    const res = await this.request<CemeteryRecord>(`/cemetery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update cemetery record');
    return res.data!;
  }

  async archiveCemeteryRecord(id: string, isArchived: boolean, reason?: string): Promise<CemeteryRecord> {
    const res = await this.request<CemeteryRecord>(`/cemetery/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ isArchived, reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to archive cemetery record');
    return res.data!;
  }

  async deleteCemeteryRecord(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/cemetery/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete cemetery record');
    return true;
  }

  async createNotice(data: any): Promise<MosqueNotice> {
    const res = await this.request<MosqueNotice>('/management/notices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create notice');
    return res.data!;
  }

  // SMS Gateway Simulator
  async sendSms(phone: string, message: string, tokenUrl?: string): Promise<{ success: boolean; messageId: string }> {
    const res = await this.request<{ success: boolean; messageId: string }>('/sms/send', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        message,
        recipientPhone: phone,
        messageText: message,
        tokenUrl,
      }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to send SMS');
    return res.data!;
  }

  // WebSocket Real-time Listener & Manager State
  private ws: WebSocket | null = null;
  private wsListeners: Set<(event: { type: string; mosqueId?: string; data?: any }) => void> = new Set();
  private reconnectTimeout: any = null;
  private reconnectDelay: number = 1000; // Start at 1s per requirements
  private maxReconnectDelay: number = 30000; // Max delay
  private wsState: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR' = 'DISCONNECTED';
  private isExplicitlyClosed: boolean = false;

  getWsState() {
    return this.wsState;
  }

  connectWebSocket(onEvent?: (event: any) => void) {
    if (onEvent) {
      this.wsListeners.add(onEvent);
    }

    if (typeof window === 'undefined' || !window.WebSocket) {
      return;
    }

    // Prevent duplicate connections if already open or connecting
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    this.isExplicitlyClosed = false;
    this.wsState = 'CONNECTING';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${encodeURIComponent(this.currentUserId || '')}&mosqueId=${encodeURIComponent(this.currentMosqueId || '')}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsState = 'CONNECTED';
        this.reconnectDelay = 1000; // Reset retry counter on successful connection (1s -> 2s -> 4s ...)
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        console.log('[WebSocket] Connected to MasjidLedger Realtime Server');
      };

      this.ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.wsListeners.forEach(listener => {
            try {
              listener(parsed);
            } catch (err) {
              console.warn('[WebSocket] Listener error:', err);
            }
          });
        } catch (err) {
          console.warn('[WebSocket] Error parsing message:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.wsState = 'DISCONNECTED';
        if (this.isExplicitlyClosed) return;

        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }

        const nextDelay = this.reconnectDelay;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        this.wsState = 'RECONNECTING';

        console.debug(`[WebSocket] Disconnected (code: ${event.code}). Reconnecting in ${nextDelay}ms...`);

        this.reconnectTimeout = setTimeout(() => {
          if (!this.isExplicitlyClosed) {
            this.connectWebSocket();
          }
        }, nextDelay);
      };

      this.ws.onerror = (err) => {
        this.wsState = 'ERROR';
        // Prevent unhandled promise rejection or uncaught error by catching gracefully
        console.debug('[WebSocket] Connection notice or temporary failure:', err);
      };
    } catch (err) {
      this.wsState = 'ERROR';
      console.debug('[WebSocket] Realtime connection could not be opened:', err);
      this.wsState = 'RECONNECTING';
      
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      const nextDelay = this.reconnectDelay;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isExplicitlyClosed) {
          this.connectWebSocket();
        }
      }, nextDelay);
    }
  }

  disconnectWebSocket() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.wsState = 'DISCONNECTED';
  }

  onWsEvent(callback: (event: { type: string; mosqueId?: string; data?: any }) => void) {
    this.wsListeners.add(callback);
    return () => {
      this.wsListeners.delete(callback);
    };
  }

  // Notifications
  async getNotifications() {
    const res = await this.request<any[]>('/notifications');
    return res.data || [];
  }

  async markAllNotificationsRead() {
    const res = await this.request<any>('/notifications/mark-all-read', { method: 'POST' });
    return res.data;
  }

  // Upload File
  async uploadFile(data: { fileName: string; fileType: string; base64Data: string }) {
    const res = await this.request<any>('/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to upload file');
    return res.data!;
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await this.request<AuditLog[]>('/audit/logs');
    return res.data || [];
  }

  // ==========================================
  // CENTRAL DOCUMENT & ATTACHMENT SYSTEM
  // ==========================================
  async getDocuments(params: {
    entityType?: string;
    entityId?: string;
    documentType?: string;
    visibility?: string;
    search?: string;
    hasFile?: boolean;
    hasDriveLink?: boolean;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<CentralDocument[]> {
    const query = new URLSearchParams();
    if (params.entityType) query.append('entityType', params.entityType);
    if (params.entityId) query.append('entityId', params.entityId);
    if (params.documentType) query.append('documentType', params.documentType);
    if (params.visibility) query.append('visibility', params.visibility);
    if (params.search) query.append('search', params.search);
    if (params.hasFile !== undefined) query.append('hasFile', String(params.hasFile));
    if (params.hasDriveLink !== undefined) query.append('hasDriveLink', String(params.hasDriveLink));
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const url = `/documents${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<CentralDocument[]>(url);
    return res.data || [];
  }

  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalDirectFiles: number;
    totalGoogleDriveLinks: number;
    totalBothAttachments: number;
    totalStorageBytes: number;
    byEntityType: Record<string, number>;
    byDocumentType: Record<string, number>;
  }> {
    const res = await this.request<any>('/documents/summary/stats');
    return res.data || {
      totalDocuments: 0,
      totalDirectFiles: 0,
      totalGoogleDriveLinks: 0,
      totalBothAttachments: 0,
      totalStorageBytes: 0,
      byEntityType: {},
      byDocumentType: {},
    };
  }

  async getDocument(id: string): Promise<CentralDocument> {
    const res = await this.request<CentralDocument>(`/documents/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ডকুমেন্ট লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createDocument(data: Partial<CentralDocument>): Promise<CentralDocument> {
    const res = await this.request<CentralDocument>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ডকুমেন্ট সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateDocument(id: string, data: Partial<CentralDocument>): Promise<CentralDocument> {
    const res = await this.request<CentralDocument>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ডকুমেন্ট হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    const res = await this.request<any>(`/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'ডকুমেন্ট মুছে ফেলতে ব্যর্থ হয়েছে');
    return res.data || { success: true, message: 'ডকুমেন্ট সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  // ==========================================
  // OFFICIAL CORRESPONDENCE & DOCUMENTS API
  // ==========================================
  async getOfficialDocuments(params: {
    docType?: string;
    subType?: string;
    status?: string;
    priority?: string;
    visibility?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    meetingId?: string;
    resolutionId?: string;
    committeeTermId?: string;
    memberId?: string;
    staffId?: string;
    sortBy?: string;
  } = {}): Promise<OfficialDocument[]> {
    const query = new URLSearchParams();
    if (params.docType) query.append('docType', params.docType);
    if (params.subType) query.append('subType', params.subType);
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.visibility) query.append('visibility', params.visibility);
    if (params.search) query.append('search', params.search);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.meetingId) query.append('meetingId', params.meetingId);
    if (params.resolutionId) query.append('resolutionId', params.resolutionId);
    if (params.committeeTermId) query.append('committeeTermId', params.committeeTermId);
    if (params.memberId) query.append('memberId', params.memberId);
    if (params.staffId) query.append('staffId', params.staffId);
    if (params.sortBy) query.append('sortBy', params.sortBy);

    const queryString = query.toString();
    const url = `/official-documents${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<OfficialDocument[]>(url);
    return res.data || [];
  }

  async getOfficialDocumentStats(): Promise<{
    total: number;
    draftCount: number;
    pendingApprovalCount: number;
    approvedCount: number;
    sentCount: number;
    replyAwaitedCount: number;
    inProgressCount: number;
    resolvedCount: number;
    urgentCount: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    recentDocuments: OfficialDocument[];
  }> {
    const res = await this.request<any>('/official-documents/summary/stats');
    return res.data || {
      total: 0,
      draftCount: 0,
      pendingApprovalCount: 0,
      approvedCount: 0,
      sentCount: 0,
      replyAwaitedCount: 0,
      inProgressCount: 0,
      resolvedCount: 0,
      urgentCount: 0,
      byType: {},
      byStatus: {},
      recentDocuments: [],
    };
  }

  async getOfficialDocument(id: string): Promise<OfficialDocument> {
    const res = await this.request<OfficialDocument>(`/official-documents/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দাপ্তরিক নথি লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createOfficialDocument(data: Partial<OfficialDocument>): Promise<OfficialDocument> {
    const res = await this.request<OfficialDocument>('/official-documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দাপ্তরিক নথি সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateOfficialDocument(id: string, data: Partial<OfficialDocument>): Promise<OfficialDocument> {
    const res = await this.request<OfficialDocument>(`/official-documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দাপ্তরিক নথি হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateOfficialDocumentStatus(id: string, status: OfficialDocumentStatus, notes?: string): Promise<OfficialDocument> {
    const res = await this.request<OfficialDocument>(`/official-documents/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteOfficialDocument(id: string): Promise<{ success: boolean; message: string }> {
    const res = await this.request<any>(`/official-documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'দাপ্তরিক নথি মুছে ফেলতে ব্যর্থ হয়েছে');
    return res.data || { success: true, message: 'দাপ্তরিক নথি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async getOfficialDocumentTemplates(): Promise<OfficialDocumentTemplate[]> {
    const res = await this.request<OfficialDocumentTemplate[]>('/official-documents/templates/list');
    return res.data || [];
  }

  async aiAssistOfficialDocument(payload: {
    action?: 'GENERATE' | 'OFFICIAL' | 'SUMMARIZE' | 'ELABORATE' | 'SPELLCHECK';
    docType?: string;
    subject?: string;
    keyPoints?: string;
    currentText?: string;
    tone?: string;
    sender?: string;
    recipient?: string;
  }): Promise<{ resultText: string; action: string; tone?: string; isFallback?: boolean }> {
    const res = await this.request<{ resultText: string; action: string; tone?: string; isFallback?: boolean }>('/official-documents/ai-assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'AI সহায়তায় ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // AGREEMENT MANAGEMENT ("চুক্তিপত্র ব্যবস্থাপনা") API — ZERO FINANCIAL COUPLING
  // ==========================================
  async getAgreementDashboardStats(): Promise<AgreementDashboardStats> {
    const res = await this.request<AgreementDashboardStats>('/agreements/dashboard/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্র ড্যাশবোর্ড তথ্য লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getAgreements(params?: {
    search?: string;
    categoryCode?: string;
    status?: string;
    waqfLandOnly?: boolean;
    archivedOnly?: boolean;
    includeArchived?: boolean;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }): Promise<AgreementRecord[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.categoryCode && params.categoryCode !== 'ALL') query.set('categoryCode', params.categoryCode);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.waqfLandOnly) query.set('waqfLandOnly', 'true');
    if (params?.archivedOnly) query.set('archivedOnly', 'true');
    if (params?.includeArchived) query.set('includeArchived', 'true');
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortDir) query.set('sortDir', params.sortDir);
    const qs = query.toString();
    const res = await this.request<AgreementRecord[]>(`/agreements${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'চুক্তিপত্র তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data || [];
  }

  async getAgreementById(id: string): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্রটি পাওয়া যায়নি');
    return res.data;
  }

  async createAgreement(payload: Partial<AgreementRecord>): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>('/agreements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্র সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateAgreement(id: string, payload: Partial<AgreementRecord>): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্র হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateAgreementStatus(id: string, status: AgreementStatus): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্রের স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteAgreement(id: string): Promise<{ deletedId: string; message: string }> {
    const res = await this.request<{ deletedId: string; message: string }>(`/agreements/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'চুক্তিপত্র মুছে ফেলতে ব্যর্থ হয়েছে');
    return res.data || { deletedId: id, message: 'চুক্তিপত্রটি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async getAgreementPartiesDirectory(search?: string): Promise<AgreementPartyDirectoryItem[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await this.request<AgreementPartyDirectoryItem[]>(`/agreements/parties/directory${qs}`);
    if (!res.success) throw new Error(res.error?.message || 'পক্ষসমূহের তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data || [];
  }

  async getAgreementCategories(): Promise<AgreementCategoryDef[]> {
    const res = await this.request<AgreementCategoryDef[]>('/agreements/categories/list');
    if (!res.success) throw new Error(res.error?.message || 'চুক্তির ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে');
    return res.data || [];
  }

  async createAgreementCategory(payload: {
    nameBn: string;
    nameEn?: string;
    descriptionBn?: string;
    formProfile?: 'STANDARD' | 'CONSTRUCTION' | 'LAND_WAQF' | 'ROAD_RIGHT';
  }): Promise<AgreementCategoryDef> {
    const res = await this.request<AgreementCategoryDef>('/agreements/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নতুন ক্যাটাগরি যুক্ত করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getAgreementTemplates(): Promise<AgreementTemplateDef[]> {
    const res = await this.request<AgreementTemplateDef[]>('/agreements/templates/list');
    if (!res.success) throw new Error(res.error?.message || 'চুক্তির টেমপ্লেট লোড করতে ব্যর্থ হয়েছে');
    return res.data || [];
  }

  async createAgreementTemplate(payload: Partial<AgreementTemplateDef>): Promise<AgreementTemplateDef> {
    const res = await this.request<AgreementTemplateDef>('/agreements/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নতুন টেমপ্লেট সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteAgreementTemplate(id: string): Promise<void> {
    const res = await this.request<any>(`/agreements/templates/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'টেমপ্লেট মুছে ফেলতে ব্যর্থ হয়েছে');
  }

  async updateAgreementTemplate(
    id: string,
    payload: Partial<AgreementTemplateDef>
  ): Promise<AgreementTemplateDef> {
    const res = await this.request<AgreementTemplateDef>(`/agreements/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'টেমপ্লেট হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async publishAgreementTemplate(
    id: string,
    publishStatus: AgreementTemplatePublishStatus
  ): Promise<AgreementTemplateDef> {
    const res = await this.request<AgreementTemplateDef>(`/agreements/templates/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ publishStatus }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'টেমপ্লেট প্রকাশের অবস্থা পরিবর্তন করা যায়নি');
    return res.data;
  }

  async aiDraftAgreement(payload: {
    instructionBn: string;
    preferredCategoryCode?: string;
    existingContext?: string;
  }): Promise<AgreementAiDraftResult> {
    const res = await this.request<AgreementAiDraftResult>('/agreements/ai/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'AI চুক্তিপত্র খসড়া তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async aiAssistAgreementClause(payload: {
    action: AgreementClauseAssistAction;
    currentClauses: string;
    categoryNameBn?: string;
    agreementTitle?: string;
    userInstruction?: string;
  }): Promise<AgreementClauseAssistResult> {
    const res = await this.request<AgreementClauseAssistResult>('/agreements/ai/clause-assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'AI ধারা সহায়তা ব্যর্থ হয়েছে');
    return res.data;
  }

  async aiReviewAgreement(payload: {
    agreementId?: string;
    agreement?: Partial<AgreementRecord>;
  }): Promise<AgreementAiReviewResult> {
    const res = await this.request<AgreementAiReviewResult>('/agreements/ai/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'AI চুক্তি ও ঝুঁকি পর্যালোচনা ব্যর্থ হয়েছে');
    return res.data;
  }

  async ocrExtractAgreementDocument(payload: {
    docType: AgreementOcrDocType;
    mimeType: string;
    imageBase64: string;
    userHint?: string;
  }): Promise<AgreementOcrExtractResult> {
    const res = await this.request<AgreementOcrExtractResult>('/agreements/ocr/extract', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ডকুমেন্ট OCR শনাক্তকরণ ব্যর্থ হয়েছে');
    return res.data;
  }

  // Part 3: Approval Workflow, Digital Signatures, Versioning & Archive
  async submitAgreementReview(
    id: string,
    payload: {
      stage: AgreementReviewStage;
      decision: AgreementReviewDecision;
      comment: string;
      sendForApproval?: boolean;
    }
  ): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পর্যালোচনা সংরক্ষণ করা যায়নি');
    return res.data;
  }

  async submitAgreementApproval(
    id: string,
    payload: {
      decision: AgreementApprovalDecision;
      comment: string;
      committeeResolutionRef?: string;
      readyForSignature?: boolean;
    }
  ): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/approvals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'অনুমোদন সিদ্ধান্ত সংরক্ষণ করা যায়নি');
    return res.data;
  }

  async requestAgreementSignatureOtp(
    id: string,
    payload: { slotKey: string; phoneOverride?: string }
  ): Promise<{
    challengeId: string;
    maskedTarget: string;
    expiresInSec: number;
    verificationCodePreview: string;
    noticeBn: string;
  }> {
    const res = await this.request<any>(`/agreements/${id}/signatures/otp/request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'OTP অনুরোধ ব্যর্থ হয়েছে');
    return res.data;
  }

  async signAgreementSlot(
    id: string,
    payload: {
      slotKey: string;
      method: AgreementSignatureMethod;
      signatureImageDataUrl?: string;
      typedSignatureText?: string;
      otpChallengeId?: string;
      otpCode?: string;
      signerNameOverride?: string;
      signerDesignationOverride?: string;
      signerIdentityRef?: string;
      authorityBasisOverride?: string;
      legalLimitationAcknowledged: boolean;
    }
  ): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/signatures`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'স্বাক্ষর সংরক্ষণ করা যায়নি');
    return res.data;
  }

  async signAgreementWitness(
    id: string,
    payload: {
      witnessId?: string;
      witnessName: string;
      fatherName?: string;
      phone?: string;
      nid?: string;
      address?: string;
      partySide?: string;
      method: 'DRAW_TOUCH' | 'TYPED_ELECTRONIC';
      signatureImageDataUrl?: string;
      typedSignatureText?: string;
    }
  ): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/witnesses/sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সাক্ষীর স্বাক্ষর সংরক্ষণ করা যায়নি');
    return res.data;
  }

  async markAgreementEffective(id: string, effectiveDate?: string): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/mark-effective`, {
      method: 'POST',
      body: JSON.stringify({ effectiveDate }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্র কার্যকর (Effective) করা যায়নি');
    return res.data;
  }

  async createAgreementVersionOrAmendment(
    id: string,
    payload: {
      isAmendment: boolean;
      amendmentTitle?: string;
      changeSummary: string;
      title?: string;
      purpose?: string;
      generalClauses?: string;
      specialClauses?: string;
      terminationClause?: string;
      disputeResolutionClause?: string;
      expiryDate?: string;
      durationText?: string;
    }
  ): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নতুন ভার্সন/সংশোধনী তৈরি করা যায়নি');
    return res.data;
  }

  async closeOrArchiveAgreement(
    id: string,
    payload:
      | { mode: 'ARCHIVE' | 'UNARCHIVE'; archiveNote?: string }
      | {
          mode: 'CLOSE';
          action: AgreementClosureInfo['action'];
          reason: string;
          effectiveClosureDate?: string;
          alsoArchive?: boolean;
        }
  ): Promise<AgreementRecord> {
    const res = await this.request<AgreementRecord>(`/agreements/${id}/close-or-archive`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'চুক্তিপত্রের অবস্থা হালনাগাদ করা যায়নি');
    return res.data;
  }

  async getAgreementArchiveReport(): Promise<AgreementArchiveReport> {
    const res = await this.request<AgreementArchiveReport>('/agreements/reports/archive');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আর্কাইভ ও গভর্ন্যান্স রিপোর্ট লোড করা যায়নি');
    return res.data;
  }

  // AI Smart Auditor, Smart Entry & Floating Chatbot
  async askAi(question: string, language: string = 'bn') {
    return this.request<any>('/ai/financial-audit', {
      method: 'POST',
      body: JSON.stringify({ question, language }),
    });
  }

  async runAiSmartAudit(question?: string) {
    const res = await this.request<any>('/ai/financial-audit', {
      method: 'POST',
      body: JSON.stringify({ question: question || '' }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI স্মার্ট অডিট বিশ্লেষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async parseAiSmartEntry(payload: {
    mode: 'RECEIPT_SCAN' | 'TEXT_ENTRY';
    entryType: 'INCOME' | 'EXPENSE';
    text?: string;
    imageBase64?: string;
    mimeType?: string;
  }) {
    const res = await this.request<{
      date: string;
      amount: number;
      mainHeadId: string;
      mainHeadNameBn: string;
      subHeadId: string;
      subHeadNameBn: string;
      personName: string;
      vendorOrOrgName?: string;
      personPhone: string;
      paymentMethod: 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET';
      reference: string;
      description: string;
      suggestedIncomeType?: 'JUMMA' | 'DONATION' | 'DONATION_BOX' | 'WAQF_RENT' | 'OTHER_INCOME';
      suggestedExpenseType?: 'GENERAL_EXPENSE' | 'STAFF_EXPENSE' | 'ASSET_EXPENSE' | 'PROPERTY_EXPENSE';
      matchedStaffId?: string;
      confidenceNoteBn: string;
      warningsBn?: string[];
    }>('/ai/smart-entry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI স্মার্ট এন্ট্রি বিশ্লেষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async chatWithMasjidAi(
    message: string,
    history: { role: 'user' | 'model'; text: string }[] = []
  ) {
    const res = await this.request<{ answer: string; generatedAt: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI চ্যাটবট থেকে উত্তর পাওয়া যায়নি।');
    }
    return res.data;
  }

  async askUserManualAssistant(payload: {
    question: string;
    sectionContext?: { id?: string; title?: string; summary?: string };
    history?: Array<{ role: 'user' | 'model'; text: string }>;
  }) {
    const res = await this.request<{
      answerBn: string;
      stepsBn: string[];
      tipBn: string;
      recommendedTab: string;
      recommendedTabLabelBn: string;
      modelUsed: string;
      generatedAt: string;
    }>('/ai/manual-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যবহার বিধি AI সহায়তা থেকে উত্তর পাওয়া যায়নি।');
    }
    return res.data;
  }

  async extractSmartMigrationData(payload: {
    migrationType: 'MUSALLI_DONOR' | 'WAQF_PROPERTY_TENANT' | 'LEDGER_OPENING_BALANCE';
    files: Array<{
      fileName: string;
      mimeType: string;
      base64Data?: string;
      extractedText?: string;
    }>;
    extraInstruction?: string;
  }) {
    const res = await this.request<{
      summaryBn: string;
      totalExtracted: number;
      needsReviewCount: number;
      rows: Array<{
        rowId: string;
        sourceFile: string;
        recordKind: 'DONOR' | 'WAQF_TENANT' | 'INCOME' | 'EXPENSE' | 'OPENING_BALANCE';
        name: string;
        fatherOrSpouseName: string;
        mobile: string;
        address: string;
        propertyOrUnitName: string;
        categoryLabelBn: string;
        mainHeadId: string;
        accountId: string;
        date: string;
        amount: number;
        securityDeposit: number;
        notes: string;
        needsReview: boolean;
        warningNoteBn: string;
      }>;
      availableIncomeHeads: Array<{ id: string; nameBn: string }>;
      availableExpenseHeads: Array<{ id: string; nameBn: string }>;
      availableAccounts: Array<{ id: string; nameBn: string; type: string }>;
    }>('/ai/smart-migration/extract', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI ফাইল বিশ্লেষণে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async commitSmartMigrationData(payload: {
    migrationType: 'MUSALLI_DONOR' | 'WAQF_PROPERTY_TENANT' | 'LEDGER_OPENING_BALANCE';
    rows: any[];
  }) {
    const res = await this.request<{
      personsCreated: number;
      donationPlansCreated: number;
      propertiesCreated: number;
      tenantsCreated: number;
      incomesCreated: number;
      expensesCreated: number;
      openingBalancesUpdated: number;
      skipped: number;
      errors: string[];
      totalSaved: number;
    }>('/ai/smart-migration/commit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ডাটাবেসে সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ==========================================
  // COMMITTEE MANAGEMENT AI AUTOMATIONS
  // ==========================================
  async generateCommitteeMeetingMinutesAi(payload: {
    mode: 'NOTES' | 'HANDWRITTEN_SCAN';
    meetingDate?: string;
    meetingTime?: string;
    venue?: string;
    meetingTypeBn?: string;
    chairmanName?: string;
    secretaryName?: string;
    attendeeNames?: string[];
    rawNotes?: string;
    imageBase64?: string;
    mimeType?: string;
  }) {
    const res = await this.request<{
      meetingTitleBn: string;
      meetingDate: string;
      dayNameBn: string;
      timeBn: string;
      venueBn: string;
      meetingTypeBn: string;
      chairmanName: string;
      secretaryName: string;
      attendeeNames: string[];
      openingRemarksBn: string;
      agendas: string[];
      resolutions: Array<{
        decisionNumber: string;
        agendaTopic: string;
        discussionSummaryBn: string;
        proposerName: string;
        seconderName: string;
        decisionTextBn: string;
        responsiblePersonName: string;
        targetDeadline: string;
        estimatedBudget: number;
      }>;
      closingRemarksBn: string;
      ocrConfidenceNoteBn: string;
    }>('/ai/committee/meeting-minutes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI কার্যবিবরণী তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async extractCommitteeActionPlansAi(payload: {
    meetingId?: string;
    resolutionId?: string;
    rawText?: string;
    termId?: string;
  }) {
    const res = await this.request<{
      sourceSummaryBn: string;
      actionItems: Array<{
        tempId: string;
        title: string;
        category: string;
        description: string;
        priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL';
        responsibleMemberId: string;
        responsibleMemberName: string;
        startDate: string;
        dueDate: string;
        estimatedBudget: number;
        remarks: string;
        meetingId?: string;
        meetingNumber?: string;
        resolutionId?: string;
        resolutionNumber?: string;
      }>;
    }>('/ai/committee/extract-action-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কার্যবিবরণী থেকে টাস্ক বের করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async analyzeCommitteeActionPlansAi(termId?: string) {
    const res = await this.request<{
      metrics: {
        total: number;
        completed: number;
        inProgress: number;
        todo: number;
        overdue: number;
        completionRate: number;
      };
      overallStatusBn: string;
      executiveSummaryBn: string;
      keyHighlightsBn: string[];
      riskAlertsBn: string[];
      reminderMessages: Array<{
        planId: string;
        planTitle: string;
        responsibleName: string;
        daysOverdue: number;
        recipientLabelBn: string;
        subjectBn: string;
        messageDraftBn: string;
      }>;
      generatedAt: string;
    }>('/ai/committee/action-plan-insights', {
      method: 'POST',
      body: JSON.stringify({ termId }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কর্মপরিকল্পনা বিশ্লেষণে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async getCommitteeMemberPerformanceAi(termId?: string) {
    const res = await this.request<{
      termTitle: string;
      overallSummaryBn: string;
      topPerformerNoteBn: string;
      improvementFocusBn: string;
      members: Array<{
        memberId: string;
        memberName: string;
        designationBn: string;
        totalMeetings: number;
        meetingsAttended: number;
        attendanceRate: number;
        assignedWorksCount: number;
        completedWorksCount: number;
        taskCompletionRate: number;
        activitiesCount: number;
        donationsCount: number;
        totalDonatedAmount: number;
        suggestedScore: number;
        suggestedStars: number;
        evaluationSummaryBn: string;
        strengthsBn: string;
        improvementTipBn: string;
      }>;
      generatedAt: string;
    }>('/ai/committee/member-performance', {
      method: 'POST',
      body: JSON.stringify({ termId }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'সদস্য মূল্যায়ন বিশ্লেষণে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateCommitteeHandoverProtocolAi(payload: {
    outgoingTermId?: string;
    incomingTermId?: string;
    handoverDate?: string;
  }) {
    const res = await this.request<{
      protocolTitleBn: string;
      memoNoSuggestion: string;
      executiveDeclarationBn: string;
      financialHandoverSummaryBn: string;
      waqfAndPropertySummaryBn: string;
      ongoingProjectsSummaryBn: string;
      recommendationsForIncomingBn: string[];
      closingPledgeBn: string;
      liveSnapshot: {
        outgoingTermTitle: string;
        incomingTermTitle: string;
        handoverDate: string;
        cashBalance: number;
        bankTotalBalance: number;
        totalFundBalance: number;
        cashAccounts: Array<{ nameBn: string; balance: number }>;
        bankBalances: Array<{ nameBn: string; accountNumber: string; bankName: string; accountType: string; balance: number }>;
        waqfStats: {
          totalProperties: number;
          totalActiveTenants: number;
          totalMonthlyExpectedRent: number;
          totalDueRent: number;
          dueTenantsCount: number;
          dueTenantsList: Array<{ propertyName: string; tenantName: string; shopNo: string; dueAmount: number }>;
        };
        pendingProjects: Array<{
          planNumber: string;
          title: string;
          category: string;
          status: string;
          progressPercentage: number;
          dueDate: string;
          estimatedBudget: number;
          actualCost: number;
          responsibleName: string;
        }>;
        pendingTasksCount: number;
        totalMeetingsCount: number;
        totalResolutionsCount: number;
      };
      generatedAt: string;
    }>('/ai/committee/handover-protocol', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'দায়িত্ব হস্তান্তর প্রতিবেদন তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async getCommitteeHealthCheckAi(payload?: { termId?: string; includeAiCommentary?: boolean }) {
    const res = await this.request<{
      metrics: {
        hasActiveTerm: boolean;
        activeTermTitle: string;
        startDate: string;
        endDate: string;
        daysRemaining: number;
        totalDays: number;
        elapsedPercent: number;
        isExpired: boolean;
        isNearEnd: boolean;
        totalMembers: number;
        activeMembers: number;
        totalMeetings: number;
        recentMeetings90Days: number;
        totalResolutions: number;
        totalActionPlans: number;
        completedActionPlans: number;
        inProgressActionPlans: number;
        overdueActionPlans: number;
        completionPercent: number;
      };
      aiAssessment: {
        healthScore: number;
        healthStatusLabelBn: string;
        summaryBn: string;
        strengthsBn: string[];
        priorityActionsBn: string[];
      } | null;
      generatedAt: string;
    }>('/ai/committee/health-check', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কমিটি হেলথ চেক লোড করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ==========================================
  // INCOME MANAGEMENT AI AUTOMATIONS (GEMINI 2.5 FLASH)
  // ==========================================
  async parseIncomeNoteCounterAi(payload: { text: string; context?: 'JUMA' | 'BOX' }) {
    const res = await this.request<{
      denominationData: CashDenominationData;
      items: Array<{ labelBn: string; denom: number; count: number; subtotal: number; isCoin: boolean }>;
      grandTotal: number;
      totalNotesCount: number;
      totalCoinsCount: number;
      breakdownSummaryBn: string;
    }>('/ai/income/note-counter', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI নোট হিসাব বিশ্লেষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async getJumaFourWeekComparisonAi() {
    const res = await this.request<{
      latestJumaDate: string | null;
      currentWeekAmount: number;
      fourWeekAvg: number;
      comparedWeeksCount: number;
      diffAmount: number;
      percentChange: number | null;
      trend: 'UP' | 'DOWN' | 'STEADY' | 'NO_DATA';
      oneLineCommentBn: string;
      weeklyHistory: Array<{ date: string; amount: number; count: number }>;
      generatedAt: string;
    }>('/ai/income/juma-comparison', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'জুমার গড় তুলনা বিশ্লেষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateDonationAppreciationAi(payload: {
    donorName: string;
    amount: number;
    date: string;
    categoryBn?: string;
    receiptNo?: string;
    tone?: 'FORMAL' | 'WARM_DUA' | 'SHORT_SMS';
  }) {
    const res = await this.request<{
      messageBn: string;
      shortSmsBn: string;
      mosqueName: string;
      generatedAt: string;
    }>('/ai/income/appreciation-message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কৃতজ্ঞতা বার্তা তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async checkWaqfRentDuesAi(payload?: { billingMonth?: string }) {
    const res = await this.request<{
      billingMonth: string;
      billingMonthLabelBn: string;
      totalProperties: number;
      totalActiveTenants: number;
      paidTenantsCount: number;
      unpaidCount: number;
      totalDueAmount: number;
      summaryBn: string;
      unpaidTenants: Array<{
        propertyId: string;
        propertyName: string;
        propertyCode: string;
        tenantId: string;
        tenantName: string;
        phone: string;
        unitOrShopNo: string;
        monthlyRent: number;
        paidThisMonth: number;
        dueAmount: number;
        status: 'UNPAID_THIS_MONTH' | 'PARTIAL_DUE';
        reminderDraftBn: string;
      }>;
      generatedAt: string;
    }>('/ai/income/waqf-dues', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ওয়াক্ফ ভাড়া বকেয়া যাচাই ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async checkIncomeRegisterDuplicatesAi(payload?: { fromDate?: string; toDate?: string }) {
    const res = await this.request<{
      scannedCount: number;
      duplicateIds: string[];
      groups: Array<{
        groupKey: string;
        date: string;
        amount: number;
        riskLevel: 'HIGH' | 'MEDIUM';
        entryIds: string[];
        voucherNumbers: string[];
        donorOrHeadBn: string;
        reasonBn: string;
      }>;
      summaryBn: string;
      generatedAt: string;
    }>('/ai/income/duplicate-check', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ডাবল এন্ট্রি যাচাই ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async getIncomeFinancialInsightsAi() {
    const res = await this.request<{
      currentMonthLabelBn: string;
      previousMonthLabelBn: string;
      nextMonthLabelBn: string;
      currentMonthTotal: number;
      previousMonthTotal: number;
      momDiff: number;
      momChangePercent: number | null;
      allTimeTotal: number;
      totalVouchers: number;
      topHeadNameBn: string;
      topHeadAmount: number;
      topHeadSharePercent: number;
      topHeadsBreakdown: Array<{ nameBn: string; total: number; currentMonth: number; count: number }>;
      monthlyHistory: Array<{ monthKey: string; labelBn: string; total: number; count: number }>;
      topHeadInsightBn: string;
      momComparisonBn: string;
      nextMonthForecastAmount: number;
      forecastRangeBn: string;
      forecastReasoningBn: string;
      executiveSummaryBn: string;
      recommendationsBn: string[];
      generatedAt: string;
    }>('/ai/income/financial-insights', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'আয় আর্থিক বিশ্লেষণ লোড করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ============================================================
  // EXPENSE MANAGEMENT AI AUTOMATIONS
  // ============================================================

  async analyzeUtilityBillAi(payload: {
    imageBase64?: string;
    mimeType?: string;
    text?: string;
    utilityHint?: 'ELECTRICITY' | 'GAS' | 'WATER' | 'ALL';
    compareOnly?: boolean;
  }) {
    const res = await this.request<{
      mode: 'BILL_SCAN' | 'HISTORICAL_CHECK';
      utilityType: string;
      utilityTypeBn: string;
      providerName: string;
      billingMonth: string;
      billingMonthBn: string;
      amount: number;
      dueDate: string;
      meterOrAccountNo: string;
      reference: string;
      mainHeadId: string;
      mainHeadNameBn: string;
      subHeadId: string;
      subHeadNameBn: string;
      descriptionBn: string;
      last3MonthsAvg: number;
      last3MonthsBreakdown: Array<{ monthKey: string; monthLabelBn: string; total: number }>;
      percentChange: number | null;
      spikeAlert: boolean;
      spikeWarningBn: string;
      commentaryBn: string;
      confidenceNoteBn: string;
      generatedAt: string;
    }>('/ai/expense/utility-scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ইউটিলিটি বিল বিশ্লেষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async prepareMonthlyPayrollDraftAi(payload?: { salaryMonth?: string }) {
    const res = await this.request<{
      salaryMonth: string;
      salaryMonthLabelBn: string;
      totalActiveStaff: number;
      alreadyPaidCount: number;
      pendingCount: number;
      totalGrossSalary: number;
      totalOutstandingAdvance: number;
      totalRecommendedDeduction: number;
      totalNetPayable: number;
      summaryBn: string;
      advanceAdvisoryBn: string;
      rows: Array<{
        staffId: string;
        staffName: string;
        designationBn: string;
        phone: string;
        baseSalary: number;
        allowance: number;
        grossSalary: number;
        outstandingAdvance: number;
        recommendedAdvanceDeduction: number;
        netPayable: number;
        alreadyPaid: boolean;
        alreadyPaidAmount: number;
        suggestedMainHeadId: string;
        suggestedMainHeadNameBn: string;
        voucherDescriptionBn: string;
      }>;
      generatedAt: string;
    }>('/ai/expense/payroll-draft', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'মাসিক বেতন ড্রাফট তৈরি ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async auditExpenseReconciliationAi(payload?: { fromDate?: string; toDate?: string }) {
    const res = await this.request<{
      scannedVoucherCount: number;
      totalScannedExpenseAmount: number;
      duplicateGroupCount: number;
      duplicateEntryIds: string[];
      duplicateGroups: Array<{
        groupKey: string;
        date: string;
        amount: number;
        entryIds: string[];
        voucherNumbers: string[];
        payeeOrHeadBn: string;
        riskLevel: 'HIGH' | 'MEDIUM';
        reasonBn: string;
      }>;
      mismatchedAccountCount: number;
      balanceDiscrepancies: Array<{
        accountId: string;
        accountNameBn: string;
        accountType: string;
        openingBalance: number;
        totalIncomes: number;
        totalExpenses: number;
        expectedBalance: number;
        recordedBalance: number;
        delta: number;
        hasMismatch: boolean;
        explanationBn: string;
      }>;
      orphanExpenses: Array<{
        id: string;
        voucherNumber: string;
        date: string;
        amount: number;
        payeeName: string;
        issue: string;
      }>;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      auditHeadlineBn: string;
      executiveSummaryBn: string;
      actionChecklistBn: string[];
      generatedAt: string;
    }>('/ai/expense/reconciliation-audit', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যয় অডিট ও রিকনসিলিয়েশন ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async analyzeExpenseBudgetGuardAi(payload?: { budgetId?: string }) {
    const res = await this.request<{
      hasFormalBudget: boolean;
      budgetName: string;
      nextMonthLabelBn: string;
      totalPlanned: number;
      totalActual: number;
      overallUtilizationPercent: number;
      redRiskCount: number;
      yellowRiskCount: number;
      overallStatus: 'RED' | 'YELLOW' | 'GREEN';
      executiveSummaryBn: string;
      nextMonthExpenseForecastAmount: number;
      forecastReasoningBn: string;
      atRiskHeads: Array<{
        mainHeadId: string;
        mainHeadNameBn: string;
        plannedAmount: number;
        actualAmount: number;
        remainingAmount: number;
        utilizationPercent: number;
        riskBadge: 'RED' | 'YELLOW' | 'GREEN';
        riskLabelBn: string;
        warningNoteBn: string;
      }>;
      costSavingTipsBn: string[];
      generatedAt: string;
    }>('/ai/expense/budget-guard', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট গার্ড ও ব্যয় পরামর্শ লোড করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ==========================================
  // ACCOUNTS & TRANSACTIONS AI AUTOMATIONS
  // ==========================================
  async diagnoseNegativeCashBalanceAi(payload?: { accountId?: string }) {
    const res = await this.request<{
      hasNegativeIssue: boolean;
      severity: 'CRITICAL' | 'WARNING' | 'HEALTHY';
      firstNegativeDate: string | null;
      lowestBalance: number;
      lowestDate: string | null;
      currentCashBalance: number;
      openingCashBalance: number;
      negativeAccounts: Array<{
        id: string;
        nameBn: string;
        accountType: string;
        openingBalance: number;
        currentBalance: number;
      }>;
      primaryCauseType:
        | 'OPENING_BALANCE_MISSING'
        | 'UNRECORDED_INCOME'
        | 'WRONG_ACCOUNT_POSTING'
        | 'OVER_EXPENSE_ENTRY'
        | 'NONE';
      headlineBn: string;
      rootCauseAnalysisBn: string;
      recommendedActionBn: string;
      stepByStepFixBn: string[];
      triggerTransactions: Array<{
        date: string;
        voucherNumber: string;
        type: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
        amount: number;
        runningBalanceAfter: number;
        description: string;
        accountName: string;
      }>;
      generatedAt: string;
    }>('/ai/ledger/balance-guardian', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'নেগেটিভ ক্যাশ ও প্রারম্ভিক স্থিতি বিশ্লেষণ ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async reconcileBankStatementAi(payload: {
    accountId?: string;
    fileBase64?: string;
    mimeType?: string;
    statementText?: string;
  }) {
    const res = await this.request<{
      statementAccountLabelBn: string;
      statementPeriodBn: string;
      statementClosingBalance: number | null;
      bookBalance: number;
      balanceDifference: number | null;
      totalStatementRows: number;
      matchedCount: number;
      unrecordedInSoftware: Array<{
        date: string;
        description: string;
        reference: string;
        direction: 'DEPOSIT' | 'WITHDRAWAL';
        amount: number;
        noteBn: string;
      }>;
      amountMismatches: Array<{
        date: string;
        statementDescription: string;
        statementAmount: number;
        softwareVoucherNumber: string;
        softwareAmount: number;
        difference: number;
        direction: 'DEPOSIT' | 'WITHDRAWAL';
        noteBn: string;
      }>;
      onlyInSoftware: Array<{
        id: string;
        date: string;
        voucherNumber: string;
        description: string;
        direction: 'DEPOSIT' | 'WITHDRAWAL';
        amount: number;
        noteBn: string;
      }>;
      summaryBn: string;
      actionStepsBn: string[];
      generatedAt: string;
    }>('/ai/ledger/bank-reconcile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যাংক ও এমএফএস স্টেটমেন্ট মিলিয়ে দেখা ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async smartSearchTransactionsAi(payload: {
    query: string;
    scope?: 'ALL' | 'CASH' | 'BANK';
    accountId?: string;
  }) {
    const res = await this.request<{
      query: string;
      interpretedQueryBn: string;
      appliedFilters: {
        startDate: string | null;
        endDate: string | null;
        transactionType: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
        minAmount: number | null;
        maxAmount: number | null;
        accountTypeFilter: 'ALL' | 'CASH' | 'BANK' | 'MFS';
        keywords: string[];
      };
      totalCount: number;
      totalDebit: number;
      totalCredit: number;
      totalTransfer: number;
      results: Array<{
        id: string;
        date: string;
        voucherNumber: string;
        txType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
        txTypeLabelBn: string;
        headNameBn: string;
        accountName: string;
        accountType: string;
        partyName: string;
        description: string;
        debit: number;
        credit: number;
        amount: number;
      }>;
      generatedAt: string;
    }>('/ai/ledger/smart-search', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'প্রাকৃতিক বাংলায় লেনদেন অনুসন্ধান ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateLedgerExecutiveSummaryAi(payload: {
    ledgerType: 'DAILY_STATEMENT' | 'CASHBOOK' | 'BANK_LEDGER' | 'SUMMARY';
    periodLabel: string;
    startDate?: string;
    endDate?: string;
    openingBalance: number;
    totalInflow: number;
    totalOutflow: number;
    closingBalance: number;
    transactionCount: number;
    accountScopeLabel?: string;
    topInflowHeads?: Array<{ name: string; amount: number }>;
    topOutflowHeads?: Array<{ name: string; amount: number }>;
  }) {
    const res = await this.request<{
      summaryParagraphBn: string;
      statusTagBn: string;
      keyHighlightsBn: string[];
      netChange: number;
      generatedAt: string;
    }>('/ai/ledger/executive-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI লেনদেন সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ==========================================
  // CHART OF ACCOUNTS (COA) AI AUTOMATIONS
  // ==========================================
  async optimizeChartOfAccountsAi() {
    const res = await this.request<{
      totalHeads: number;
      incomeHeadCount: number;
      expenseHeadCount: number;
      unusedHeadCount: number;
      healthScore: number;
      healthLabelBn: string;
      overallAssessmentBn: string;
      duplicateOrFragmentedSuggestions: Array<{
        headId: string;
        headCode: string;
        headNameBn: string;
        headType: 'INCOME' | 'EXPENSE';
        usageCount: number;
        issueType: 'DUPLICATE' | 'OVER_GRANULAR' | 'MISCLASSIFIED';
        issueBadgeBn: string;
        recommendedTargetHeadId: string;
        recommendedTargetHeadNameBn: string;
        recommendedTargetHeadCode: string;
        reasonBn: string;
        actionAdviceBn: string;
      }>;
      keyRecommendationsBn: string[];
      generatedAt: string;
    }>('/ai/coa/optimize', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI হিসাব খাত বিশ্লেষণ করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateStandardCoaTemplateAi(payload: {
    mosqueType: 'GENERAL' | 'WAQF_LARGE' | 'MADRASA_ATTACHED' | 'URBAN_COMPLEX';
  }) {
    const res = await this.request<{
      mosqueType: 'GENERAL' | 'WAQF_LARGE' | 'MADRASA_ATTACHED' | 'URBAN_COMPLEX';
      mosqueTypeLabelBn: string;
      templateTitleBn: string;
      summaryBn: string;
      incomeGroups: Array<{
        mainHeadNameBn: string;
        mainHeadNameEn: string;
        codeHint: string;
        descriptionBn: string;
        alreadyExists: boolean;
        subHeads: Array<{
          nameBn: string;
          nameEn: string;
          descriptionBn: string;
          alreadyExists: boolean;
        }>;
      }>;
      expenseGroups: Array<{
        mainHeadNameBn: string;
        mainHeadNameEn: string;
        codeHint: string;
        descriptionBn: string;
        alreadyExists: boolean;
        subHeads: Array<{
          nameBn: string;
          nameEn: string;
          descriptionBn: string;
          alreadyExists: boolean;
        }>;
      }>;
      generatedAt: string;
    }>('/ai/coa/standard-template', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI স্ট্যান্ডার্ড COA টেমপ্লেট তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async suggestNewAccountHeadAi(payload: { nameBn: string }) {
    const res = await this.request<{
      inputName: string;
      suggestedType: 'INCOME' | 'EXPENSE';
      suggestedParentId: string | null;
      suggestedParentNameBn: string | null;
      suggestedCode: string;
      suggestedNameEn: string;
      suggestedDescriptionBn: string;
      duplicateRisk: 'NONE' | 'SIMILAR' | 'EXACT';
      warningMessageBn: string;
      reasoningBn: string;
      similarExistingHeads: Array<{
        id: string;
        code: string;
        nameBn: string;
        nameEn: string;
        type: 'INCOME' | 'EXPENSE';
        parentNameBn: string;
        matchReasonBn: string;
      }>;
      generatedAt: string;
    }>('/ai/coa/suggest-head', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI স্মার্ট সাজেশন তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async findInactiveAccountHeadsAi(payload: { type: 'INCOME' | 'EXPENSE' | 'ALL' }) {
    const res = await this.request<{
      type: 'INCOME' | 'EXPENSE' | 'ALL';
      totalScopedHeads: number;
      unusedCount: number;
      recommendedArchiveCount: number;
      summaryBn: string;
      items: Array<{
        id: string;
        code: string;
        nameBn: string;
        type: 'INCOME' | 'EXPENSE';
        isSubHead: boolean;
        parentNameBn: string;
        usageCount: number;
        recommendation: 'ARCHIVE' | 'KEEP_SEASONAL' | 'REVIEW';
        recommendationLabelBn: string;
        reasonBn: string;
      }>;
      generatedAt: string;
    }>('/ai/coa/inactive-heads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI নিষ্ক্রিয় খাত খুঁজতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateCoaStructureNoteAi() {
    const res = await this.request<{
      structureNoteBn: string;
      structureGradeBn: string;
      stats: {
        totalHeads: number;
        incomeTotal: number;
        incomeMain: number;
        incomeSub: number;
        expenseTotal: number;
        expenseMain: number;
        expenseSub: number;
        activeCount: number;
        archivedCount: number;
        usedCount: number;
        unusedCount: number;
      };
      generatedAt: string;
    }>('/ai/coa/structure-note', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI অ্যাকাউন্টিং স্ট্রাকচার নোট তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ==========================================
  // IMAM, STAFF & PAYROLL AI AUTOMATIONS
  // ==========================================
  async scanStaffDocumentAi(payload: {
    fileBase64?: string;
    mimeType?: string;
    extraText?: string;
  }) {
    const res = await this.request<StaffDocumentScanResult>('/ai/staff/scan-document', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'NID বা ডকুমেন্ট স্ক্যান ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateStaffOfficialDocumentAi(payload: {
    staffId: string;
    documentType: 'APPOINTMENT_LETTER' | 'EXPERIENCE_CERTIFICATE' | 'CLEARANCE_LETTER';
    customNote?: string;
  }) {
    const res = await this.request<{
      staffId: string;
      staffNameBn: string;
      designationBn: string;
      documentType: 'APPOINTMENT_LETTER' | 'EXPERIENCE_CERTIFICATE' | 'CLEARANCE_LETTER';
      memoNumber: string;
      issueDate: string;
      titleBn: string;
      recipientBlockBn: string;
      subjectBn: string;
      salutationBn: string;
      bodyParagraphsBn: string[];
      termsOrPointsBn: string[];
      closingNoteBn: string;
      generatedAt: string;
    }>('/ai/staff/generate-document', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'আনুষ্ঠানিক ডকুমেন্ট তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async summarizeMonthlyAttendanceAi(payload: { month?: string }) {
    const res = await this.request<{
      month: string;
      activeStaffCount: number;
      totalRecordedEntries: number;
      perfectCount: number;
      irregularCount: number;
      overallStatusBn: string;
      summaryBn: string;
      perfectAttendanceNoteBn: string;
      irregularityAlertBn: string;
      actionSuggestionsBn: string[];
      staffBreakdown: Array<{
        staffId: string;
        staffCode: string;
        nameBn: string;
        designationBn: string;
        recordedDays: number;
        presentDays: number;
        lateDays: number;
        leaveDays: number;
        absentDays: number;
        attendanceRate: number;
        isPerfect: boolean;
        isIrregular: boolean;
      }>;
      generatedAt: string;
    }>('/ai/staff/attendance-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI মাসিক হাজিরা সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async verifyStaffLeaveRequestAi(payload: {
    staffId: string;
    leaveId?: string;
    leaveType?: string;
    leaveTypeBn?: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason?: string;
  }) {
    const res = await this.request<{
      staffId: string;
      staffNameBn: string;
      designationBn: string;
      startDate: string;
      endDate: string;
      daysCount: number;
      applicantIsPrayerRole: boolean;
      overlappingLeaves: Array<{
        staffId: string;
        staffNameBn: string;
        designationBn: string;
        designation: string;
        startDate: string;
        endDate: string;
        status: string;
        isPrayerRole: boolean;
      }>;
      hasConflict: boolean;
      annualQuotaDays: number;
      usedDaysThisYear: number;
      remainingBeforeRequest: number;
      remainingAfterRequest: number;
      recommendation: 'APPROVE' | 'APPROVE_WITH_BACKUP' | 'REVIEW_CAREFULLY' | 'REJECT_SUGGESTED';
      recommendationLabelBn: string;
      conflictAnalysisBn: string;
      quotaAnalysisBn: string;
      approvalLetterMemoNo: string;
      approvalLetterTitleBn: string;
      approvalLetterBodyBn: string;
      generatedAt: string;
    }>('/ai/staff/verify-leave', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI ছুটি যাচাই ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateStaffPayrollDraftAi(payload: {
    month?: string;
    festivalBonusPercent?: number;
    festivalName?: string;
  }) {
    const res = await this.request<{
      month: string;
      festivalName: string;
      festivalBonusPercent: number;
      payrollAuditNoteBn: string;
      payslipBlessingNoteBn: string;
      totals: {
        staffCount: number;
        totalBasic: number;
        totalAllowance: number;
        totalFestivalBonus: number;
        totalAttendanceDeduction: number;
        totalAdvanceDeduction: number;
        totalGross: number;
        totalNetPayable: number;
        alreadyPaidCount: number;
      };
      rows: Array<{
        staffId: string;
        staffCode: string;
        nameBn: string;
        designationBn: string;
        phone: string;
        paymentPreference: string;
        bankInfo: string;
        basicSalary: number;
        fixedAllowance: number;
        festivalBonus: number;
        presentDays: number;
        lateDays: number;
        leaveDays: number;
        absentDays: number;
        attendanceDeduction: number;
        advanceOutstanding: number;
        suggestedAdvanceDeduction: number;
        grossPayable: number;
        totalDeduction: number;
        netPayable: number;
        alreadyPaid: boolean;
        paidVoucherNumber: string;
        aiNoteBn: string;
      }>;
      generatedAt: string;
    }>('/ai/staff/payroll-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI মাসিক বেতন শিট ড্রাফট তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateStaffSalarySmsAi(payload: {
    staffId: string;
    paymentId?: string;
    month?: string;
    netPaid?: number;
    paymentMethod?: string;
    voucherNumber?: string;
  }) {
    const res = await this.request<{
      staffId: string;
      staffNameBn: string;
      designationBn: string;
      phone: string;
      month: string;
      netPaid: number;
      voucherNumber: string;
      whatsappMessageBn: string;
      shortSmsBn: string;
      generatedAt: string;
    }>('/ai/staff/salary-sms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI বেতন SMS তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // ==========================================
  // SMS & NOTIFICATION GATEWAY AI AUTOMATIONS
  // ==========================================
  async composeSmsMessageAi(payload: {
    action: 'COMPOSE' | 'POLISH' | 'SHORTEN' | 'WHATSAPP';
    currentText?: string;
    promptBrief?: string;
    templateType?: string;
    recipientType?: string;
    recipientName?: string;
  }) {
    const res = await this.request<{
      action: 'COMPOSE' | 'POLISH' | 'SHORTEN' | 'WHATSAPP';
      messageText: string;
      aiNoteBn: string;
      charCount: number;
      isUnicode: boolean;
      encoding: 'UNICODE' | 'ASCII';
      charsPerCredit: number;
      creditsPerPerson: number;
      generatedAt: string;
    }>('/ai/sms/compose', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI দিয়ে মেসেজ তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async generateAutoSmsTemplateAi(payload: {
    triggerType: 'DONATION' | 'SALARY' | 'MAKTAB_FEE';
    currentTemplate?: string;
    customInstruction?: string;
  }) {
    const res = await this.request<{
      triggerType: 'DONATION' | 'SALARY' | 'MAKTAB_FEE';
      templateText: string;
      samplePreviewBn: string;
      variablesUsed: string[];
      charCount: number;
      isUnicode: boolean;
      encoding: 'UNICODE' | 'ASCII';
      charsPerCredit: number;
      creditsPerPerson: number;
      generatedAt: string;
    }>('/ai/sms/auto-template', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI ডাইনামিক অটো-এসএমএস টেমপ্লেট তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  async analyzeSmsDeliveryInsightsAi(payload?: { creditsBalance?: number }) {
    const res = await this.request<{
      month: string;
      creditsBalance: number;
      totalLogsCount: number;
      monthlyLogsCount: number;
      totalCreditsInScope: number;
      totalAllTimeCredits: number;
      estimatedDailyBurn: number;
      estimatedDaysRemaining: number | null;
      topCategoryLabelBn: string;
      categoryBreakdown: Array<{
        key: string;
        labelBn: string;
        smsCount: number;
        creditsUsed: number;
        sharePercent: number;
      }>;
      summaryBn: string;
      forecastNoteBn: string;
      savingTipsBn: string[];
      generatedAt: string;
    }>('/ai/sms/delivery-insights', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'AI ব্যবহারের সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে।');
    }
    return res.data;
  }

  // Global Search
  async searchGlobal(q: string, category: string = 'ALL') {
    const query = new URLSearchParams({ q, category });
    const res = await this.request<any[]>(`/search/global?${query.toString()}`);
    return res.data || [];
  }

  // ==========================================
  // MUSALLI & DONOR DATABASE FOUNDATION HELPERS
  // ==========================================

  // --- Areas ---
  async getAreas(): Promise<AreaMaster[]> {
    const res = await this.request<AreaMaster[]>('/areas');
    return res.data || [];
  }

  async getArea(id: string): Promise<AreaMaster> {
    const res = await this.request<AreaMaster>(`/areas/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'এলাকার তথ্য পাওয়া যায়নি');
    return res.data;
  }

  async createArea(data: Partial<AreaMaster>): Promise<AreaMaster> {
    const res = await this.request<AreaMaster>('/areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'এলাকা তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateArea(id: string, data: Partial<AreaMaster>): Promise<AreaMaster> {
    const res = await this.request<AreaMaster>(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'এলাকার তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateAreaStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<AreaMaster> {
    const res = await this.request<AreaMaster>(`/areas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'এলাকার স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  // --- Families ---
  async getFamilies(params?: { areaId?: string; search?: string; status?: 'ACTIVE' | 'INACTIVE' }): Promise<FamilyMaster[]> {
    const q = new URLSearchParams();
    if (params?.areaId) q.set('areaId', params.areaId);
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<FamilyMaster[]>(`/families${queryString}`);
    return res.data || [];
  }

  async getFamily(id: string): Promise<FamilyMaster> {
    const res = await this.request<FamilyMaster>(`/families/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পরিবারের তথ্য পাওয়া যায়নি');
    return res.data;
  }

  async checkDuplicateFamily(payload: {
    name?: string;
    areaId?: string;
    familyCode?: string;
    mobile?: string;
    address?: string;
    houseRoadBlock?: string;
    excludeId?: string;
  }): Promise<{ hasPotentialDuplicates: boolean; matches: { family: FamilyMaster; reasons: string[] }[] }> {
    const res = await this.request<{ hasPotentialDuplicates: boolean; matches: { family: FamilyMaster; reasons: string[] }[] }>('/families/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || { hasPotentialDuplicates: false, matches: [] };
  }

  async createFamily(data: Partial<FamilyMaster>): Promise<FamilyMaster> {
    const res = await this.request<FamilyMaster>('/families', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পরিবার তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateFamily(id: string, data: Partial<FamilyMaster>): Promise<FamilyMaster> {
    const res = await this.request<FamilyMaster>(`/families/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পরিবারের তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateFamilyStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<FamilyMaster> {
    const res = await this.request<FamilyMaster>(`/families/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পরিবারের স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  // --- Persons ---
  async getPersons(params?: { familyId?: string; areaId?: string; search?: string; status?: string; profession?: string; isFamilyHead?: boolean }): Promise<PersonMaster[]> {
    const q = new URLSearchParams();
    if (params?.familyId) q.set('familyId', params.familyId);
    if (params?.areaId) q.set('areaId', params.areaId);
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.profession) q.set('profession', params.profession);
    if (params?.isFamilyHead !== undefined) q.set('isFamilyHead', String(params.isFamilyHead));
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<PersonMaster[]>(`/persons${queryString}`);
    return res.data || [];
  }

  async getPerson(id: string): Promise<PersonMaster> {
    const res = await this.request<PersonMaster>(`/persons/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ব্যক্তির তথ্য পাওয়া যায়নি');
    return res.data;
  }

  async checkDuplicatePerson(payload: {
    fullName?: string;
    fatherOrHusbandName?: string;
    mobile?: string;
    nidNumber?: string;
    dateOfBirth?: string;
    familyId?: string;
    areaId?: string;
    address?: string;
    excludeId?: string;
  }): Promise<{ hasPotentialDuplicates: boolean; matches: { person: PersonMaster; reasons: string[] }[] }> {
    const res = await this.request<{ hasPotentialDuplicates: boolean; matches: { person: PersonMaster; reasons: string[] }[] }>('/persons/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || { hasPotentialDuplicates: false, matches: [] };
  }

  async createPerson(data: Partial<PersonMaster>): Promise<PersonMaster> {
    const res = await this.request<PersonMaster>('/persons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ব্যক্তি তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updatePerson(id: string, data: Partial<PersonMaster>): Promise<PersonMaster> {
    const res = await this.request<PersonMaster>(`/persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ব্যক্তির তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updatePersonStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<PersonMaster> {
    const res = await this.request<PersonMaster>(`/persons/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ব্যক্তির স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  // --- Donation Plans ---
  async getDonationPlans(params?: {
    personId?: string;
    familyId?: string;
    areaId?: string;
    planType?: string;
    status?: string;
    collectionRequired?: boolean | string;
    collectionWorkerId?: string;
    search?: string;
  }): Promise<DonationPlan[]> {
    const q = new URLSearchParams();
    if (params?.personId) q.set('personId', params.personId);
    if (params?.familyId) q.set('familyId', params.familyId);
    if (params?.areaId) q.set('areaId', params.areaId);
    if (params?.planType) q.set('planType', params.planType);
    if (params?.status) q.set('status', params.status);
    if (params?.collectionRequired !== undefined) q.set('collectionRequired', String(params.collectionRequired));
    if (params?.collectionWorkerId) q.set('collectionWorkerId', params.collectionWorkerId);
    if (params?.search) q.set('search', params.search);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    const res = await this.request<DonationPlan[]>(`/donation-plans${queryString}`);
    return res.data || [];
  }

  async checkOverlapDonationPlan(payload: {
    personId: string;
    planType: string;
    excludeId?: string;
  }): Promise<{ hasOverlappingPlan: boolean; activePlans: DonationPlan[]; reasons: string[] }> {
    const res = await this.request<{ hasOverlappingPlan: boolean; activePlans: DonationPlan[]; reasons: string[] }>('/donation-plans/check-overlap', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data || { hasOverlappingPlan: false, activePlans: [], reasons: [] };
  }

  async getDonationPlan(id: string): Promise<DonationPlan> {
    const res = await this.request<DonationPlan>(`/donation-plans/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দান পরিকল্পনার তথ্য পাওয়া যায়নি');
    return res.data;
  }

  async createDonationPlan(data: Partial<DonationPlan>): Promise<DonationPlan> {
    const res = await this.request<DonationPlan>('/donation-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দান পরিকল্পনা তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateDonationPlan(id: string, data: Partial<DonationPlan>): Promise<DonationPlan> {
    const res = await this.request<DonationPlan>(`/donation-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দান পরিকল্পনা হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateDonationPlanStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'INACTIVE'): Promise<DonationPlan> {
    const res = await this.request<DonationPlan>(`/donation-plans/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দান পরিকল্পনার স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteDonationPlan(id: string): Promise<boolean> {
    const res = await this.request<{ success: boolean }>(`/donation-plans/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'দান পরিকল্পনা মুছতে ব্যর্থ হয়েছে');
    return true;
  }

  // --- Collection Workers ---
  async getCollectionWorkers(): Promise<CollectionWorker[]> {
    const res = await this.request<CollectionWorker[]>('/collection-workers');
    return res.data || [];
  }

  async getCollectionWorker(id: string): Promise<CollectionWorker> {
    const res = await this.request<CollectionWorker>(`/collection-workers/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহকারীর তথ্য পাওয়া যায়নি');
    return res.data;
  }

  async createCollectionWorker(data: Partial<CollectionWorker>): Promise<CollectionWorker> {
    const res = await this.request<CollectionWorker>('/collection-workers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহকারী তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateCollectionWorker(id: string, data: Partial<CollectionWorker>): Promise<CollectionWorker> {
    const res = await this.request<CollectionWorker>(`/collection-workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহকারীর তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateCollectionWorkerStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<CollectionWorker> {
    const res = await this.request<CollectionWorker>(`/collection-workers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহকারীর স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  // --- Donation Collections (B6) ---
  async getDonationCollections(params?: Record<string, string>): Promise<DonationCollection[]> {
    let queryString = '';
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, val);
        }
      });
      const qs = searchParams.toString();
      if (qs) queryString = `?${qs}`;
    }
    const res = await this.request<DonationCollection[]>(`/donation-collections${queryString}`);
    return res.data || [];
  }

  async getDonationCollection(id: string): Promise<DonationCollection> {
    const res = await this.request<DonationCollection>(`/donation-collections/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহের তথ্য পাওয়া যায়নি');
    return res.data;
  }

  async createDonationCollection(data: Partial<DonationCollection>): Promise<DonationCollection> {
    const res = await this.request<DonationCollection>('/donation-collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহ কার্যক্রম তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateDonationCollection(id: string, data: Partial<DonationCollection>): Promise<DonationCollection> {
    const res = await this.request<DonationCollection>(`/donation-collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহের তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateDonationCollectionStatus(id: string, status: CollectionStatus, note?: string): Promise<DonationCollection> {
    const res = await this.request<DonationCollection>(`/donation-collections/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংগ্রহের স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================================================
  // PHASE E6: BUDGET & EXPENSE CONTROL API METHODS
  // (Zero Financial Delta - Planning & Control Layer Only)
  // ==========================================================================

  async getBudgets(params?: { includeArchived?: boolean; type?: string }): Promise<Budget[]> {
    const query = new URLSearchParams();
    if (params?.includeArchived) query.set('includeArchived', 'true');
    if (params?.type && params.type !== 'ALL') query.set('type', params.type);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<Budget[]>(`/budgets${qStr}`);
    if (!res.success || !res.data) return [];
    return res.data;
  }

  async getBudget(id: string): Promise<{ budget: Budget; lines: BudgetLine[] }> {
    const res = await this.request<{ budget: Budget; lines: BudgetLine[] }>(`/budgets/${id}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট তথ্য লোড করা যায়নি');
    }
    return res.data;
  }

  async createBudget(data: {
    budget: Partial<Budget>;
    lines: Partial<BudgetLine>[];
  }): Promise<{ budget: Budget; lines: BudgetLine[] }> {
    const res = await this.request<{ budget: Budget; lines: BudgetLine[] }>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট তৈরি করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateBudget(
    id: string,
    data: { budget?: Partial<Budget>; lines?: Partial<BudgetLine>[] }
  ): Promise<{ budget: Budget; lines: BudgetLine[] }> {
    const res = await this.request<{ budget: Budget; lines: BudgetLine[] }>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট হালনাগাদ করা যায়নি');
    }
    return res.data;
  }

  async submitBudget(id: string): Promise<Budget> {
    const res = await this.request<Budget>(`/budgets/${id}/submit`, {
      method: 'POST',
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট সাবমিট করা যায়নি');
    }
    return res.data;
  }

  async approveBudget(id: string): Promise<Budget> {
    const res = await this.request<Budget>(`/budgets/${id}/approve`, {
      method: 'POST',
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট অনুমোদন করা যায়নি');
    }
    return res.data;
  }

  async reviseBudget(
    id: string,
    data: { lines: Partial<BudgetLine>[]; notes?: string }
  ): Promise<{ budget: Budget; lines: BudgetLine[] }> {
    const res = await this.request<{ budget: Budget; lines: BudgetLine[] }>(`/budgets/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট রিভাইজ করা যায়নি');
    }
    return res.data;
  }

  async closeBudget(id: string, notes?: string): Promise<Budget> {
    const res = await this.request<Budget>(`/budgets/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বাজেট ক্লোজ করা যায়নি');
    }
    return res.data;
  }

  async deleteBudget(id: string): Promise<boolean> {
    const res = await this.request(`/budgets/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'বাজেট মুছতে ব্যর্থ হয়েছে');
    }
    return true;
  }

  async getActionPlans(): Promise<CommitteeActionPlan[]> {
    const res = await this.request<CommitteeActionPlan[]>('/committee/action-plans');
    if (!res.success || !res.data) return [];
    return res.data;
  }

  // ==========================================
  // CLOUD BACKUP & RESTORE PIPELINE
  // ==========================================
  async createEncryptedBackup(backupType: 'MANUAL' | 'AUTOMATIC' = 'MANUAL'): Promise<{
    backupId: string;
    mosqueId: string;
    checksum: string;
    artifactJson: string;
  }> {
    const res = await this.request<{
      backupId: string;
      mosqueId: string;
      checksum: string;
      artifactJson: string;
    }>('/cloud/backup/create-encrypted', {
      method: 'POST',
      body: JSON.stringify({ backupType }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'এনক্রিপ্টেড ব্যাকআপ তৈরি করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async restoreEncryptedBackup(artifactJson: string): Promise<{ success: boolean; message: string }> {
    const res = await this.request<{ success: boolean; message: string }>('/cloud/backup/restore-encrypted', {
      method: 'POST',
      body: JSON.stringify({ artifactJson }),
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'ব্যাকআপ রিস্টোর করতে ব্যর্থ হয়েছে');
    }
    return { success: true, message: res.message || 'রিস্টোর সফল হয়েছে' };
  }

  async verifyBackupArtifact(artifactJson: string): Promise<{
    isValid: boolean;
    checksum?: string;
    metadata?: any;
    recordCount?: number;
    moduleCount?: number;
    reason?: string;
    message?: string;
  }> {
    const res = await this.request<{
      isValid: boolean;
      checksum?: string;
      metadata?: any;
      recordCount?: number;
      moduleCount?: number;
      reason?: string;
      message?: string;
    }>('/cloud/backup/verify', {
      method: 'POST',
      body: JSON.stringify({ artifactJson }),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যাকআপ ইন্টিগ্রিটি যাচাই করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async getBackupHistory(): Promise<any[]> {
    const res = await this.request<any[]>('/cloud/backups/history');
    return res.data || [];
  }

  async getRestoreHistory(): Promise<any[]> {
    const res = await this.request<any[]>('/cloud/restores/history');
    return res.data || [];
  }

  async getBackupHealth(): Promise<any> {
    const res = await this.request<any>('/cloud/backups/health');
    return res.data || null;
  }

  async getBackupSettings(): Promise<any> {
    const res = await this.request<any>('/cloud/backup/settings');
    return res.data || null;
  }

  async updateBackupSettings(settings: any): Promise<any> {
    const res = await this.request<any>('/cloud/backup/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ব্যাকআপ সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  // ==========================================================================
  // 📚 LIBRARY & KNOWLEDGE CENTER (পাঠাগার ও জ্ঞানকেন্দ্র) API METHODS
  // ==========================================================================

  // 1. Dashboard Stats
  async getLibraryDashboardStats(): Promise<LibraryDashboardStats | null> {
    const res = await this.request<LibraryDashboardStats>('/library/dashboard-stats');
    return res.data || null;
  }

  // 2. Categories
  async getLibraryCategories(): Promise<LibraryCategory[]> {
    const res = await this.request<LibraryCategory[]>('/library/categories');
    return res.data || [];
  }

  async createLibraryCategory(data: Partial<LibraryCategory>): Promise<LibraryCategory> {
    const res = await this.request<LibraryCategory>('/library/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ক্যাটাগরি তৈরি করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateLibraryCategory(id: string, data: Partial<LibraryCategory>): Promise<LibraryCategory> {
    const res = await this.request<LibraryCategory>(`/library/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ক্যাটাগরি হালনাগাদ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async deleteLibraryCategory(id: string): Promise<boolean> {
    const res = await this.request(`/library/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'ক্যাটাগরি মুছে ফেলতে ব্যর্থ হয়েছে');
    }
    return true;
  }

  // 3. Book Titles (Catalog)
  async getBookTitles(params?: { categoryId?: string; language?: string; search?: string; status?: string }): Promise<BookTitle[]> {
    const query = new URLSearchParams();
    if (params?.categoryId && params.categoryId !== 'ALL') query.set('categoryId', params.categoryId);
    if (params?.language && params.language !== 'ALL') query.set('language', params.language);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<BookTitle[]>(`/library/book-titles${qStr}`);
    return res.data || [];
  }

  async getBookTitle(id: string): Promise<BookTitle & { copies?: BookCopy[]; totalCopiesCount?: number; availableCopiesCount?: number; issuedCopiesCount?: number }> {
    const res = await this.request<BookTitle & { copies?: BookCopy[]; totalCopiesCount?: number; availableCopiesCount?: number; issuedCopiesCount?: number }>(`/library/book-titles/${id}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বইয়ের তথ্য লোড করা যায়নি');
    }
    return res.data;
  }

  async createBookTitle(data: any): Promise<BookTitle & { copies?: BookCopy[] }> {
    const res = await this.request<BookTitle & { copies?: BookCopy[] }>('/library/book-titles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই যোগ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateBookTitle(id: string, data: Partial<BookTitle>): Promise<BookTitle> {
    const res = await this.request<BookTitle>(`/library/book-titles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই হালনাগাদ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async deleteBookTitle(id: string): Promise<boolean> {
    const res = await this.request(`/library/book-titles/${id}`, {
      method: 'DELETE',
    });
    if (!res.success) {
      throw new Error(res.error?.message || 'বই মুছে ফেলতে ব্যর্থ হয়েছে');
    }
    return true;
  }

  // 4. Book Copies
  async getBookCopies(params?: {
    bookTitleId?: string;
    status?: string;
    condition?: string;
    roomId?: string;
    rackId?: string;
    shelfId?: string;
    search?: string;
  }): Promise<BookCopy[]> {
    const query = new URLSearchParams();
    if (params?.bookTitleId && params.bookTitleId !== 'ALL') query.set('bookTitleId', params.bookTitleId);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.condition && params.condition !== 'ALL') query.set('condition', params.condition);
    if (params?.roomId && params.roomId !== 'ALL') query.set('roomId', params.roomId);
    if (params?.rackId && params.rackId !== 'ALL') query.set('rackId', params.rackId);
    if (params?.shelfId && params.shelfId !== 'ALL') query.set('shelfId', params.shelfId);
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<BookCopy[]>(`/library/book-copies${qStr}`);
    return res.data || [];
  }

  async getBookCopy(id: string): Promise<BookCopy & { titleDetails?: BookTitle; roomName?: string; rackName?: string; shelfName?: string; issueHistory?: BookIssue[] }> {
    const res = await this.request<BookCopy & { titleDetails?: BookTitle; roomName?: string; rackName?: string; shelfName?: string; issueHistory?: BookIssue[] }>(`/library/book-copies/${id}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কপির তথ্য লোড করা যায়নি');
    }
    return res.data;
  }

  async createBookCopy(data: Partial<BookCopy>): Promise<BookCopy> {
    const res = await this.request<BookCopy>('/library/book-copies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কপি তৈরি করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async createBulkBookCopies(data: {
    bookTitleId: string;
    count: number;
    roomId?: string;
    rackId?: string;
    shelfId?: string;
    shelfLocationLabel?: string;
    condition?: string;
    purchasePrice?: number;
    donorPersonId?: string;
    donorName?: string;
    notes?: string;
  }): Promise<BookCopy[]> {
    const res = await this.request<BookCopy[]>('/library/book-copies/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কপিগুলো তৈরি করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateBookCopy(id: string, data: Partial<BookCopy>): Promise<BookCopy> {
    const res = await this.request<BookCopy>(`/library/book-copies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কপির তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateBookCopyStatus(id: string, data: { status: string; condition?: string; notes?: string }): Promise<BookCopy> {
    const res = await this.request<BookCopy>(`/library/book-copies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কপির স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  // 5. Universal QR / Barcode Quick Lookup
  async lookupBookByBarcode(bookId: string): Promise<{
    copy: BookCopy;
    title?: BookTitle;
    activeIssue?: BookIssue;
    locationHierarchy?: { room?: string; rack?: string; shelf?: string; label?: string };
  }> {
    const res = await this.request<{
      copy: BookCopy;
      title?: BookTitle;
      activeIssue?: BookIssue;
      locationHierarchy?: { room?: string; rack?: string; shelf?: string; label?: string };
    }>(`/library/lookup-by-book-id/${encodeURIComponent(bookId)}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বারকোড দিয়ে বই খুঁজে পাওয়া যায়নি');
    }
    return res.data;
  }

  // 6. Library Members
  async getLibraryMembers(params?: { status?: string; membershipType?: string; search?: string }): Promise<LibraryMember[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.membershipType && params.membershipType !== 'ALL') query.set('membershipType', params.membershipType);
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<LibraryMember[]>(`/library/members${qStr}`);
    return res.data || [];
  }

  async getLibraryMember(id: string): Promise<LibraryMember & { person?: PersonMaster; activeIssues?: BookIssue[]; issueHistory?: BookIssue[] }> {
    const res = await this.request<LibraryMember & { person?: PersonMaster; activeIssues?: BookIssue[]; issueHistory?: BookIssue[] }>(`/library/members/${id}`);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'সদস্যের তথ্য লোড করা যায়নি');
    }
    return res.data;
  }

  async createLibraryMember(data: Partial<LibraryMember>): Promise<LibraryMember> {
    const res = await this.request<LibraryMember>('/library/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'সদস্য নিবন্ধন করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async updateLibraryMember(id: string, data: Partial<LibraryMember>): Promise<LibraryMember> {
    const res = await this.request<LibraryMember>(`/library/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'সদস্য তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  // 7. Circulation (Issue & Return)
  async getBookIssues(params?: {
    status?: string;
    memberId?: string;
    personId?: string;
    bookCopyId?: string;
    overdueOnly?: boolean;
    search?: string;
  }): Promise<BookIssue[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.memberId && params.memberId !== 'ALL') query.set('memberId', params.memberId);
    if (params?.personId && params.personId !== 'ALL') query.set('personId', params.personId);
    if (params?.bookCopyId && params.bookCopyId !== 'ALL') query.set('bookCopyId', params.bookCopyId);
    if (params?.overdueOnly) query.set('overdueOnly', 'true');
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<BookIssue[]>(`/library/issues${qStr}`);
    return res.data || [];
  }

  async issueBook(data: {
    bookCopyId: string;
    memberId: string;
    issueDate?: string;
    dueDate?: string;
    notes?: string;
    conditionAtIssue?: string;
  }): Promise<BookIssue> {
    const res = await this.request<BookIssue>('/library/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই ইস্যু করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async returnBook(id: string, data: {
    returnDate?: string;
    conditionAtReturn?: string;
    fineAmount?: number;
    finePaid?: boolean;
    fineVoucherNumber?: string;
    notes?: string;
  }): Promise<BookIssue> {
    const res = await this.request<BookIssue>(`/library/issues/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই ফেরত গ্রহণ করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  async markBookLost(id: string, data: { fineAmount?: number; notes?: string }): Promise<BookIssue> {
    const res = await this.request<BookIssue>(`/library/issues/${id}/mark-lost`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই হারানো হিসেবে রেকর্ড করতে ব্যর্থ হয়েছে');
    }
    return res.data;
  }

  // 8. Acquisitions & Donations
  async getBookAcquisitions(params?: {
    sourceType?: string;
    bookTitleId?: string;
    donorPersonId?: string;
  }): Promise<BookAcquisition[]> {
    const query = new URLSearchParams();
    if (params?.sourceType && params.sourceType !== 'ALL') query.set('sourceType', params.sourceType);
    if (params?.bookTitleId && params.bookTitleId !== 'ALL') query.set('bookTitleId', params.bookTitleId);
    if (params?.donorPersonId && params.donorPersonId !== 'ALL') query.set('donorPersonId', params.donorPersonId);
    const qStr = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<BookAcquisition[]>(`/library/acquisitions${qStr}`);
    return res.data || [];
  }

  async createBookAcquisition(data: any): Promise<{ data: BookAcquisition; createdCopiesCount: number }> {
    const res = await this.request<BookAcquisition>('/library/acquisitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই সংগ্রহ রেকর্ড করতে ব্যর্থ হয়েছে');
    }
    return { data: res.data, createdCopiesCount: (res as any).createdCopiesCount || 0 };
  }

  // 9. Locations Hierarchy
  async getLibraryLocations(): Promise<{ rooms: LibraryRoom[]; racks: LibraryRack[]; shelves: LibraryShelf[] }> {
    const res = await this.request<{ rooms: LibraryRoom[]; racks: LibraryRack[]; shelves: LibraryShelf[] }>('/library/locations');
    if (!res.success || !res.data) {
      return { rooms: [], racks: [], shelves: [] };
    }
    return res.data;
  }

  async createLibraryRoom(data: Partial<LibraryRoom>): Promise<LibraryRoom> {
    const res = await this.request<LibraryRoom>('/library/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কক্ষ তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateLibraryRoom(id: string, data: Partial<LibraryRoom>): Promise<LibraryRoom> {
    const res = await this.request<LibraryRoom>(`/library/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কক্ষ হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteLibraryRoom(id: string): Promise<boolean> {
    const res = await this.request(`/library/rooms/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.error?.message || 'কক্ষ মুছতে ব্যর্থ হয়েছে');
    return true;
  }

  async createLibraryRack(data: Partial<LibraryRack>): Promise<LibraryRack> {
    const res = await this.request<LibraryRack>('/library/racks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'র‌্যাক তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateLibraryRack(id: string, data: Partial<LibraryRack>): Promise<LibraryRack> {
    const res = await this.request<LibraryRack>(`/library/racks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'র‌্যাক হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteLibraryRack(id: string): Promise<boolean> {
    const res = await this.request(`/library/racks/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.error?.message || 'র‌্যাক মুছতে ব্যর্থ হয়েছে');
    return true;
  }

  async createLibraryShelf(data: Partial<LibraryShelf>): Promise<LibraryShelf> {
    const res = await this.request<LibraryShelf>('/library/shelves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'তাক তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateLibraryShelf(id: string, data: Partial<LibraryShelf>): Promise<LibraryShelf> {
    const res = await this.request<LibraryShelf>(`/library/shelves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'তাক হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteLibraryShelf(id: string): Promise<boolean> {
    const res = await this.request(`/library/shelves/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.error?.message || 'তাক মুছতে ব্যর্থ হয়েছে');
    return true;
  }

  // ==========================================
  // EDUCATION FOUNDATION & MAKTAB SUBSYSTEM (V2.6)
  // ==========================================

  // Education Student Profiles
  async getEducationStudents(params?: { status?: string; programType?: string; levelId?: string; search?: string }): Promise<EducationStudentProfile[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.programType) query.append('programType', params.programType);
    if (params?.levelId) query.append('levelId', params.levelId);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<EducationStudentProfile[]>(`/education/students${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষার্থী তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getEducationStudent(id: string): Promise<EducationStudentProfile> {
    const res = await this.request<EducationStudentProfile>(`/education/students/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষার্থীর তথ্য লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createEducationStudent(data: any): Promise<EducationStudentProfile> {
    const res = await this.request<EducationStudentProfile>('/education/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষার্থী তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateEducationStudent(id: string, data: Partial<EducationStudentProfile>): Promise<EducationStudentProfile> {
    const res = await this.request<EducationStudentProfile>(`/education/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষার্থী তথ্য আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async deleteEducationStudent(id: string): Promise<boolean> {
    const res = await this.request(`/education/students/${id}`, { method: 'DELETE' });
    if (!res.success) throw new Error(res.error?.message || 'শিক্ষার্থী আর্কাইভ করতে ব্যর্থ হয়েছে');
    return true;
  }

  async getEducationPrograms(): Promise<EducationProgram[]> {
    const res = await this.request<EducationProgram[]>('/education/programs');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষা কার্যক্রম লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getEducationLevels(params?: { programId?: string; programType?: string }): Promise<EducationLevel[]> {
    const query = new URLSearchParams();
    if (params?.programId) query.append('programId', params.programId);
    if (params?.programType) query.append('programType', params.programType);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<EducationLevel[]>(`/education/levels${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষা জামাত লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getEducationEnrollments(params?: { studentProfileId?: string; studentId?: string; programType?: string; status?: string }): Promise<EducationEnrollment[]> {
    const query = new URLSearchParams();
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.programType) query.append('programType', params.programType);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<EducationEnrollment[]>(`/education/enrollments${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ভর্তি রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createEducationEnrollment(data: any): Promise<EducationEnrollment> {
    const res = await this.request<EducationEnrollment>('/education/enrollments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ভর্তি সম্পন্ন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // Maktab Operations
  async getMaktabDashboardStats(): Promise<MaktabDashboardStats> {
    const res = await this.request<MaktabDashboardStats>('/maktab/dashboard-stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মক্তব ড্যাশবোর্ড পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabClasses(): Promise<MaktabClass[]> {
    const res = await this.request<MaktabClass[]>('/maktab/classes');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মক্তব জামাত তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createMaktabClass(data: any): Promise<MaktabClass> {
    const res = await this.request<MaktabClass>('/maktab/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মক্তব জামাত তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateMaktabClass(id: string, data: any): Promise<MaktabClass> {
    const res = await this.request<MaktabClass>(`/maktab/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মক্তব জামাত আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabAttendance(params?: { date?: string; classId?: string; levelId?: string; studentProfileId?: string; studentId?: string; month?: string }): Promise<MaktabAttendance[]> {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.classId) query.append('classId', params.classId);
    if (params?.levelId) query.append('levelId', params.levelId);
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.month) query.append('month', params.month);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<MaktabAttendance[]>(`/maktab/attendance${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async recordMaktabAttendance(data: any): Promise<MaktabAttendance> {
    const res = await this.request<MaktabAttendance>('/maktab/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা রেকর্ড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async recordBulkMaktabAttendance(data: { date: string; classId?: string; levelId?: string; records: any[] }): Promise<{ createdCount: number; updatedCount: number }> {
    const res = await this.request<{ createdCount: number; updatedCount: number }>('/maktab/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'বাল্ক হাজিরা সম্পন্ন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabTeachers(): Promise<{ assignments: MaktabTeacherAssignment[]; availableStaff: any[] }> {
    const res = await this.request<{ assignments: MaktabTeacherAssignment[]; availableStaff: any[] }>('/maktab/teachers');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মক্তব শিক্ষক তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createMaktabTeacherAssignment(data: any): Promise<MaktabTeacherAssignment> {
    const res = await this.request<MaktabTeacherAssignment>('/maktab/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষক দায়িত্ব নির্ধারণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabFeeSchedules(): Promise<MaktabFeeSchedule[]> {
    const res = await this.request<MaktabFeeSchedule[]>('/maktab/fees/schedules');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ফি কাঠামো লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createMaktabFeeSchedule(data: any): Promise<MaktabFeeSchedule> {
    const res = await this.request<MaktabFeeSchedule>('/maktab/fees/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ফি কাঠামো তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabFeeRecords(params?: { studentProfileId?: string; studentId?: string; billingMonth?: string; status?: string }): Promise<MaktabFeeRecord[]> {
    const query = new URLSearchParams();
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.billingMonth) query.append('billingMonth', params.billingMonth);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<MaktabFeeRecord[]>(`/maktab/fees/records${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ফি রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async generateMonthlyMaktabFees(data: { feeScheduleId: string; billingMonth: string }): Promise<{ generatedCount: number; skippedCount: number }> {
    const res = await this.request<{ generatedCount: number; skippedCount: number }>('/maktab/fees/generate-monthly', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মাসিক ফি জেনারেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async collectMaktabFee(id: string, data: { paidAmount: number; paymentMethod?: string; accountId?: string; receiptNo?: string; notes?: string }): Promise<{ feeRecord: MaktabFeeRecord; canonicalIncome: IncomeEntry }> {
    const res = await this.request<{ feeRecord: MaktabFeeRecord; canonicalIncome: IncomeEntry }>(`/maktab/fees/${id}/collect`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ফি আদায় সম্পন্ন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabProgress(params?: { studentProfileId?: string; studentId?: string; levelId?: string; levelCode?: string; status?: string }): Promise<MaktabStudentProgress[]> {
    const query = new URLSearchParams();
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.levelId) query.append('levelId', params.levelId);
    if (params?.levelCode) query.append('levelCode', params.levelCode);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<MaktabStudentProgress[]>(`/maktab/progress${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পাঠ অগ্রগতি রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createMaktabProgress(data: any): Promise<MaktabStudentProgress> {
    const res = await this.request<MaktabStudentProgress>('/maktab/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পাঠ অগ্রগতি সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getMaktabReportsSummary(): Promise<any> {
    const res = await this.request<any>('/maktab/reports/summary');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মক্তব রিপোর্ট সারাংশ লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZKHANA — H1 FOUNDATION API METHODS
  // ==========================================

  async getHifzLevels(): Promise<HifzLevel[]> {
    const res = await this.request<HifzLevel[]>('/hifz/levels');
    return res.data || [];
  }

  async getHifzCurricula(): Promise<HifzCurriculum[]> {
    const res = await this.request<HifzCurriculum[]>('/hifz/curricula');
    return res.data || [];
  }

  async getHifzEligibleStudents(): Promise<EducationStudentProfile[]> {
    const res = await this.request<EducationStudentProfile[]>('/hifz/eligible-students');
    return res.data || [];
  }

  async getHifzEligibleUstads(): Promise<any[]> {
    const res = await this.request<any[]>('/hifz/eligible-ustads');
    return res.data || [];
  }

  async getHifzEnrollments(params?: {
    studentProfileId?: string;
    status?: string;
    levelId?: string;
    curriculumId?: string;
    studyType?: string;
    search?: string;
  }): Promise<HifzkhanaEnrollment[]> {
    const query = new URLSearchParams();
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.status) query.append('status', params.status);
    if (params?.levelId) query.append('levelId', params.levelId);
    if (params?.curriculumId) query.append('curriculumId', params.curriculumId);
    if (params?.studyType) query.append('studyType', params.studyType);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<HifzkhanaEnrollment[]>(`/hifz/enrollments${qs}`);
    return res.data || [];
  }

  async getHifzEnrollmentById(id: string): Promise<HifzkhanaEnrollment> {
    const res = await this.request<HifzkhanaEnrollment>(`/hifz/enrollments/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিফজ ভর্তি রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzEnrollment(data: any): Promise<HifzkhanaEnrollment> {
    const res = await this.request<HifzkhanaEnrollment>('/hifz/enrollments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিফজ শিক্ষার্থী ভর্তি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzEnrollment(id: string, data: any): Promise<HifzkhanaEnrollment> {
    const res = await this.request<HifzkhanaEnrollment>(`/hifz/enrollments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিফজ ভর্তি তথ্য হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzEnrollmentStatus(id: string, status: HifzEnrollmentStatus, remarks?: string): Promise<HifzkhanaEnrollment> {
    const res = await this.request<HifzkhanaEnrollment>(`/hifz/enrollments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিফজ ভর্তি স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H3-A — SABAK FOUNDATION
  // ==========================================

  async getHifzSabakStats(): Promise<{
    todayTotal: number;
    todayAssigned: number;
    todayPresented: number;
    todayEvaluated: number;
    todayCompleted: number;
    todayNeedsImprovement: number;
    totalAllTime: number;
    totalCompletedAllTime: number;
  }> {
    const res = await this.request<any>('/hifz/sabak/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবক পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzSabaks(params?: {
    date?: string;
    enrollmentId?: string;
    studentId?: string;
    ustadId?: string;
    status?: string;
    performance?: string;
    search?: string;
  }): Promise<HifzSabak[]> {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.ustadId) query.append('ustadId', params.ustadId);
    if (params?.status) query.append('status', params.status);
    if (params?.performance) query.append('performance', params.performance);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<HifzSabak[]>(`/hifz/sabak${qs}`);
    return res.data || [];
  }

  async getHifzSabakById(id: string): Promise<HifzSabak> {
    const res = await this.request<HifzSabak>(`/hifz/sabak/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবক রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzSabak(data: any): Promise<HifzSabak> {
    const res = await this.request<HifzSabak>('/hifz/sabak', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবক সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzSabak(id: string, data: any): Promise<HifzSabak> {
    const res = await this.request<HifzSabak>(`/hifz/sabak/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবক তথ্য আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzSabakStatus(
    id: string,
    status: HifzSabakStatus,
    performance?: HifzSabakPerformance,
    mistakeCount?: number,
    remarks?: string
  ): Promise<HifzSabak> {
    const res = await this.request<HifzSabak>(`/hifz/sabak/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, performance, mistakeCount, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবক স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H3-B — SABAKI FOUNDATION (সবকী)
  // ==========================================

  async getHifzSabakiStats(params?: {
    enrollmentId?: string;
    studentProfileId?: string;
    ustadId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalSabakis: number;
    todaySabakisCount: number;
    statusCounts: Record<HifzSabakiStatus, number>;
    performanceCounts: Record<HifzSabakiPerformance, number>;
    totalAyahsReviewed: number;
    studentCount: number;
    ustadActivity: Array<{
      ustadId: string;
      ustadName: string;
      totalSabakis: number;
      todaySabakis: number;
      completedSabakis: number;
    }>;
  }> {
    const query = new URLSearchParams();
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.ustadId) query.append('ustadId', params.ustadId);
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<any>(`/hifz/sabaki/stats${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবকী পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzSabakis(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    enrollmentId?: string;
    studentProfileId?: string;
    studentId?: string;
    ustadId?: string;
    sourceSabakId?: string;
    status?: string;
    performance?: string;
    search?: string;
  }): Promise<HifzSabaki[]> {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.ustadId) query.append('ustadId', params.ustadId);
    if (params?.sourceSabakId) query.append('sourceSabakId', params.sourceSabakId);
    if (params?.status) query.append('status', params.status);
    if (params?.performance) query.append('performance', params.performance);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await this.request<HifzSabaki[]>(`/hifz/sabaki${qs}`);
    return res.data || [];
  }

  async getHifzSabakiById(id: string): Promise<HifzSabaki> {
    const res = await this.request<HifzSabaki>(`/hifz/sabaki/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবকী রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzSabaki(data: any): Promise<HifzSabaki> {
    const res = await this.request<HifzSabaki>('/hifz/sabaki', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবকী সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzSabaki(id: string, data: any): Promise<HifzSabaki> {
    const res = await this.request<HifzSabaki>(`/hifz/sabaki/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবকী তথ্য আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzSabakiStatus(
    id: string,
    status: HifzSabakiStatus,
    performance?: HifzSabakiPerformance,
    mistakeCount?: number,
    remarks?: string
  ): Promise<HifzSabaki> {
    const res = await this.request<HifzSabaki>(`/hifz/sabaki/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, performance, mistakeCount, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সবকী স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H4 — DAUR & REVISION METHODS
  // ==========================================

  // Daur Cycles
  async getHifzDaurCycles(params?: {
    enrollmentId?: string;
    studentId?: string;
    status?: HifzDaurCycleStatus;
    search?: string;
  }): Promise<HifzDaurCycle[]> {
    const query = new URLSearchParams();
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const url = `/hifz/daur/cycles${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<HifzDaurCycle[]>(url);
    return res.data || [];
  }

  async getHifzDaurCycleById(id: string): Promise<HifzDaurCycle & { linkedDaurs?: HifzDaur[]; progressPercentage?: number }> {
    const res = await this.request<HifzDaurCycle & { linkedDaurs?: HifzDaur[]; progressPercentage?: number }>(`/hifz/daur/cycles/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর সাইকেল লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzDaurCycle(data: any): Promise<HifzDaurCycle> {
    const res = await this.request<HifzDaurCycle>('/hifz/daur/cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর সাইকেল তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzDaurCycle(id: string, data: any): Promise<HifzDaurCycle> {
    const res = await this.request<HifzDaurCycle>(`/hifz/daur/cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর সাইকেল আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzDaurCycleStatus(id: string, status: HifzDaurCycleStatus, remarks?: string): Promise<HifzDaurCycle> {
    const res = await this.request<HifzDaurCycle>(`/hifz/daur/cycles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর সাইকেল স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // Daur Entries & Stats
  async getHifzDaurStats(): Promise<any> {
    const res = await this.request<any>('/hifz/daur/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzDaurs(params?: {
    cycleId?: string;
    enrollmentId?: string;
    studentId?: string;
    ustadId?: string;
    status?: HifzDaurStatus;
    date?: string;
    startDate?: string;
    endDate?: string;
    performance?: HifzDaurPerformance;
    search?: string;
  }): Promise<HifzDaur[]> {
    const query = new URLSearchParams();
    if (params?.cycleId) query.append('cycleId', params.cycleId);
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.ustadId) query.append('ustadId', params.ustadId);
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.performance) query.append('performance', params.performance);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const url = `/hifz/daur${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<HifzDaur[]>(url);
    return res.data || [];
  }

  async getHifzDaurById(id: string): Promise<HifzDaur> {
    const res = await this.request<HifzDaur>(`/hifz/daur/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzDaur(data: any): Promise<HifzDaur> {
    const res = await this.request<HifzDaur>('/hifz/daur', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzDaur(id: string, data: any): Promise<HifzDaur> {
    const res = await this.request<HifzDaur>(`/hifz/daur/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর তথ্য আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzDaurStatus(
    id: string,
    status: HifzDaurStatus,
    performance?: HifzDaurPerformance,
    mistakeCount?: number,
    remarks?: string
  ): Promise<HifzDaur> {
    const res = await this.request<HifzDaur>(`/hifz/daur/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, performance, mistakeCount, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'দৌর স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // Revision / দুর্বল অংশ
  async getHifzRevisionStats(): Promise<any> {
    const res = await this.request<any>('/hifz/revision/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'রিভিশন পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzRevisions(params?: {
    enrollmentId?: string;
    studentId?: string;
    ustadId?: string;
    reason?: HifzRevisionReason;
    priority?: HifzRevisionPriority;
    status?: HifzRevisionStatus;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<HifzRevision[]> {
    const query = new URLSearchParams();
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.ustadId) query.append('ustadId', params.ustadId);
    if (params?.reason) query.append('reason', params.reason);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const url = `/hifz/revision${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<HifzRevision[]>(url);
    return res.data || [];
  }

  async getHifzRevisionById(id: string): Promise<HifzRevision> {
    const res = await this.request<HifzRevision>(`/hifz/revision/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'রিভিশন রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzRevision(data: any): Promise<HifzRevision> {
    const res = await this.request<HifzRevision>('/hifz/revision', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'রিভিশন সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzRevision(id: string, data: any): Promise<HifzRevision> {
    const res = await this.request<HifzRevision>(`/hifz/revision/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'রিভিশন তথ্য আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzRevisionStatus(
    id: string,
    status: HifzRevisionStatus,
    performance?: HifzDaurPerformance,
    mistakeCount?: number,
    remarks?: string
  ): Promise<HifzRevision> {
    const res = await this.request<HifzRevision>(`/hifz/revision/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, performance, mistakeCount, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'রিভিশন স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H5-A — ATTENDANCE FOUNDATION
  // ==========================================

  async getHifzAttendanceStats(): Promise<any> {
    const res = await this.request<any>('/hifz/attendance/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzAttendances(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    studentId?: string;
    studentProfileId?: string;
    enrollmentId?: string;
    status?: HifzAttendanceStatus;
    reason?: HifzAttendanceReason;
    search?: string;
  }): Promise<HifzAttendance[]> {
    const query = new URLSearchParams();
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.status) query.append('status', params.status);
    if (params?.reason) query.append('reason', params.reason);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const url = `/hifz/attendance${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<HifzAttendance[]>(url);
    return res.data || [];
  }

  async getHifzAttendanceById(id: string): Promise<HifzAttendance> {
    const res = await this.request<HifzAttendance>(`/hifz/attendance/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzAttendance(data: any): Promise<HifzAttendance> {
    const res = await this.request<HifzAttendance>('/hifz/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzAttendanceBulk(data: { date: string; records: any[] }): Promise<HifzAttendance[]> {
    const res = await this.request<HifzAttendance[]>('/hifz/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'যৌথ হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzAttendance(id: string, data: any): Promise<HifzAttendance> {
    const res = await this.request<HifzAttendance>(`/hifz/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা তথ্য আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzAttendanceStatus(
    id: string,
    status: HifzAttendanceStatus,
    reason?: HifzAttendanceReason,
    otherReason?: string,
    remarks?: string
  ): Promise<HifzAttendance> {
    const res = await this.request<HifzAttendance>(`/hifz/attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, otherReason, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হাজিরা স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H5-B1 — USTAD ASSIGNMENT FOUNDATION
  // ==========================================

  async getHifzUstadAssignmentStats(): Promise<any> {
    const res = await this.request<any>('/hifz/ustad-assignments/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'উস্তাদ অ্যাসাইনমেন্ট পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzUstadAssignments(params?: {
    studentId?: string;
    studentProfileId?: string;
    enrollmentId?: string;
    ustadStaffId?: string;
    assignmentType?: HifzUstadAssignmentType;
    status?: HifzUstadAssignmentStatus;
    isPrimary?: boolean;
    search?: string;
  }): Promise<HifzUstadAssignment[]> {
    const query = new URLSearchParams();
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.ustadStaffId) query.append('ustadStaffId', params.ustadStaffId);
    if (params?.assignmentType) query.append('assignmentType', params.assignmentType);
    if (params?.status) query.append('status', params.status);
    if (params?.isPrimary !== undefined) query.append('isPrimary', String(params.isPrimary));
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const url = `/hifz/ustad-assignments${queryString ? `?${queryString}` : ''}`;
    const res = await this.request<HifzUstadAssignment[]>(url);
    return res.data || [];
  }

  async getHifzUstadAssignmentById(id: string): Promise<HifzUstadAssignment> {
    const res = await this.request<HifzUstadAssignment>(`/hifz/ustad-assignments/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'উস্তাদ অ্যাসাইনমেন্ট রেকর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzUstadAssignment(data: any): Promise<HifzUstadAssignment> {
    const res = await this.request<HifzUstadAssignment>('/hifz/ustad-assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'উস্তাদ অ্যাসাইনমেন্ট সংরক্ষণ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzUstadAssignment(id: string, data: any): Promise<HifzUstadAssignment> {
    const res = await this.request<HifzUstadAssignment>(`/hifz/ustad-assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'উস্তাদ অ্যাসাইনমেন্ট আপডেট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzUstadAssignmentStatus(
    id: string,
    status: HifzUstadAssignmentStatus,
    endDate?: string,
    remarks?: string
  ): Promise<HifzUstadAssignment> {
    const res = await this.request<HifzUstadAssignment>(`/hifz/ustad-assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, endDate, remarks }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'অ্যাসাইনমেন্ট স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H5-C — DASHBOARD & HISTORY (READ-ONLY)
  // ==========================================

  async getHifzH5Dashboard(params?: { startDate?: string; endDate?: string; preset?: string }): Promise<HifzH5DashboardData> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.preset) query.append('preset', params.preset);

    const queryString = query.toString();
    const res = await this.request<HifzH5DashboardData>(`/hifz/h5/dashboard${queryString ? `?${queryString}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিফজ ড্যাশবোর্ড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzH5StudentHistory(studentId: string): Promise<HifzStudentHistoryData> {
    const res = await this.request<HifzStudentHistoryData>(`/hifz/h5/students/${studentId}/history`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষার্থীর ইতিহাস লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzH5UstadHistory(staffId: string): Promise<HifzUstadHistoryData> {
    const res = await this.request<HifzUstadHistoryData>(`/hifz/h5/ustads/${staffId}/history`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'উস্তাদের ইতিহাস লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzH5AttendanceSummary(params?: {
    startDate?: string;
    endDate?: string;
    studentId?: string;
    groupBy?: string;
  }): Promise<HifzAttendanceSummaryGroup[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.groupBy) query.append('groupBy', params.groupBy);

    const queryString = query.toString();
    const res = await this.request<HifzAttendanceSummaryGroup[]>(`/hifz/h5/attendance/summary${queryString ? `?${queryString}` : ''}`);
    return res.data || [];
  }

  async getHifzH5CurrentAssignments(params?: {
    assignmentType?: string;
    ustadStaffId?: string;
    studentId?: string;
    search?: string;
  }): Promise<HifzUstadAssignment[]> {
    const query = new URLSearchParams();
    if (params?.assignmentType) query.append('assignmentType', params.assignmentType);
    if (params?.ustadStaffId) query.append('ustadStaffId', params.ustadStaffId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const res = await this.request<HifzUstadAssignment[]>(`/hifz/h5/assignments/current${queryString ? `?${queryString}` : ''}`);
    return res.data || [];
  }

  async getHifzH5HistoricalAssignments(params?: {
    status?: string;
    ustadStaffId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<HifzUstadAssignment[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.ustadStaffId) query.append('ustadStaffId', params.ustadStaffId);
    if (params?.studentId) query.append('studentId', params.studentId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const res = await this.request<HifzUstadAssignment[]>(`/hifz/h5/assignments/history${queryString ? `?${queryString}` : ''}`);
    return res.data || [];
  }

  // ==========================================
  // HIFZ H5-D — SUB REPORT CENTER & REPORTS
  // ==========================================

  async getHifzH5Reports(params: {
    reportType?: HifzReportType;
    mode?: 'DATE_RANGE' | 'MONTH_RANGE' | 'YEAR_RANGE' | 'QUICK';
    startDate?: string;
    endDate?: string;
    startMonth?: string;
    endMonth?: string;
    startYear?: string;
    endYear?: string;
    preset?: string;
    studentId?: string;
    ustadStaffId?: string;
    attendanceStatus?: string;
    assignmentType?: string;
    assignmentStatus?: string;
  }): Promise<HifzReportResult> {
    const query = new URLSearchParams();
    if (params.reportType) query.append('reportType', params.reportType);
    if (params.mode) query.append('mode', params.mode);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.startMonth) query.append('startMonth', params.startMonth);
    if (params.endMonth) query.append('endMonth', params.endMonth);
    if (params.startYear) query.append('startYear', params.startYear);
    if (params.endYear) query.append('endYear', params.endYear);
    if (params.preset) query.append('preset', params.preset);
    if (params.studentId) query.append('studentId', params.studentId);
    if (params.ustadStaffId) query.append('ustadStaffId', params.ustadStaffId);
    if (params.attendanceStatus) query.append('attendanceStatus', params.attendanceStatus);
    if (params.assignmentType) query.append('assignmentType', params.assignmentType);
    if (params.assignmentStatus) query.append('assignmentStatus', params.assignmentStatus);

    const queryString = query.toString();
    const res = await this.request<HifzReportResult>(`/hifz/h5/reports${queryString ? `?${queryString}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিফজ রিপোর্ট লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H6-A — RESIDENTIAL FOUNDATION METHODS
  // ==========================================

  // 1. Residences
  async getHifzResidences(params?: { status?: string }): Promise<HifzResidence[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    const qStr = query.toString();
    const res = await this.request<HifzResidence[]>(`/hifz/h6/residences${qStr ? `?${qStr}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক কেন্দ্র তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidenceById(id: string): Promise<HifzResidence> {
    const res = await this.request<HifzResidence>(`/hifz/h6/residences/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক কেন্দ্র লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzResidence(data: Partial<HifzResidence>): Promise<HifzResidence> {
    const res = await this.request<HifzResidence>('/hifz/h6/residences', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক কেন্দ্র তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzResidence(id: string, data: Partial<HifzResidence>): Promise<HifzResidence> {
    const res = await this.request<HifzResidence>(`/hifz/h6/residences/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক কেন্দ্র হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // 2. Buildings
  async getHifzResidenceBuildings(params?: { residenceId?: string; status?: string }): Promise<HifzResidenceBuilding[]> {
    const query = new URLSearchParams();
    if (params?.residenceId) query.append('residenceId', params.residenceId);
    if (params?.status) query.append('status', params.status);
    const qStr = query.toString();
    const res = await this.request<HifzResidenceBuilding[]>(`/hifz/h6/buildings${qStr ? `?${qStr}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ভবন তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidenceBuildingById(id: string): Promise<HifzResidenceBuilding> {
    const res = await this.request<HifzResidenceBuilding>(`/hifz/h6/buildings/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ভবন লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzResidenceBuilding(data: Partial<HifzResidenceBuilding>): Promise<HifzResidenceBuilding> {
    const res = await this.request<HifzResidenceBuilding>('/hifz/h6/buildings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ভবন তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzResidenceBuilding(id: string, data: Partial<HifzResidenceBuilding>): Promise<HifzResidenceBuilding> {
    const res = await this.request<HifzResidenceBuilding>(`/hifz/h6/buildings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ভবন হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // 3. Rooms
  async getHifzResidenceRooms(params?: { residenceId?: string; buildingId?: string; status?: string }): Promise<HifzResidenceRoom[]> {
    const query = new URLSearchParams();
    if (params?.residenceId) query.append('residenceId', params.residenceId);
    if (params?.buildingId) query.append('buildingId', params.buildingId);
    if (params?.status) query.append('status', params.status);
    const qStr = query.toString();
    const res = await this.request<HifzResidenceRoom[]>(`/hifz/h6/rooms${qStr ? `?${qStr}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কক্ষ তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidenceRoomById(id: string): Promise<HifzResidenceRoom> {
    const res = await this.request<HifzResidenceRoom>(`/hifz/h6/rooms/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কক্ষ লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzResidenceRoom(data: Partial<HifzResidenceRoom>): Promise<HifzResidenceRoom> {
    const res = await this.request<HifzResidenceRoom>('/hifz/h6/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কক্ষ তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzResidenceRoom(id: string, data: Partial<HifzResidenceRoom>): Promise<HifzResidenceRoom> {
    const res = await this.request<HifzResidenceRoom>(`/hifz/h6/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কক্ষ হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // 4. Beds
  async getHifzResidenceBeds(params?: { residenceId?: string; buildingId?: string; roomId?: string; status?: string }): Promise<HifzResidenceBed[]> {
    const query = new URLSearchParams();
    if (params?.residenceId) query.append('residenceId', params.residenceId);
    if (params?.buildingId) query.append('buildingId', params.buildingId);
    if (params?.roomId) query.append('roomId', params.roomId);
    if (params?.status) query.append('status', params.status);
    const qStr = query.toString();
    const res = await this.request<HifzResidenceBed[]>(`/hifz/h6/beds${qStr ? `?${qStr}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'বেড তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidenceBedById(id: string): Promise<HifzResidenceBed> {
    const res = await this.request<HifzResidenceBed>(`/hifz/h6/beds/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'বেড লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzResidenceBed(data: Partial<HifzResidenceBed>): Promise<HifzResidenceBed> {
    const res = await this.request<HifzResidenceBed>('/hifz/h6/beds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'বেড তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzResidenceBed(id: string, data: Partial<HifzResidenceBed>): Promise<HifzResidenceBed> {
    const res = await this.request<HifzResidenceBed>(`/hifz/h6/beds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'বেড হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H6-B — RESIDENTIAL ALLOCATION METHODS
  // ==========================================

  async getHifzResidentialAllocations(params?: { residenceId?: string; buildingId?: string; roomId?: string; bedId?: string; status?: string; enrollmentId?: string }): Promise<HifzResidentialAllocation[]> {
    const query = new URLSearchParams();
    if (params?.residenceId) query.append('residenceId', params.residenceId);
    if (params?.buildingId) query.append('buildingId', params.buildingId);
    if (params?.roomId) query.append('roomId', params.roomId);
    if (params?.bedId) query.append('bedId', params.bedId);
    if (params?.status) query.append('status', params.status);
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    const qStr = query.toString();
    const res = await this.request<HifzResidentialAllocation[]>(`/hifz/h6/allocations${qStr ? `?${qStr}` : ''}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক অ্যালোকেশন তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidentialAllocationById(id: string): Promise<HifzResidentialAllocation> {
    const res = await this.request<HifzResidentialAllocation>(`/hifz/h6/allocations/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক অ্যালোকেশন লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async createHifzResidentialAllocation(data: Partial<HifzResidentialAllocation>): Promise<HifzResidentialAllocation> {
    const res = await this.request<HifzResidentialAllocation>('/hifz/h6/allocations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক অ্যালোকেশন তৈরি করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async updateHifzResidentialAllocation(id: string, data: Partial<HifzResidentialAllocation>): Promise<HifzResidentialAllocation> {
    const res = await this.request<HifzResidentialAllocation>(`/hifz/h6/allocations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক অ্যালোকেশন হালনাগাদ করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async checkInHifzResidentialAllocation(id: string): Promise<HifzResidentialAllocation> {
    const res = await this.request<HifzResidentialAllocation>(`/hifz/h6/allocations/${id}/check-in`, {
      method: 'POST',
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক চেক-ইন করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async checkOutHifzResidentialAllocation(id: string, checkOutDate?: string): Promise<HifzResidentialAllocation> {
    const res = await this.request<HifzResidentialAllocation>(`/hifz/h6/allocations/${id}/check-out`, {
      method: 'POST',
      body: JSON.stringify({ checkOutDate }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক চেক-আউট করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async cancelHifzResidentialAllocation(id: string): Promise<HifzResidentialAllocation> {
    const res = await this.request<HifzResidentialAllocation>(`/hifz/h6/allocations/${id}/cancel`, {
      method: 'POST',
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক অ্যালোকেশন বাতিল করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H6-C — RESIDENTIAL TRANSFER & HISTORY
  // ==========================================

  async createHifzResidentialTransfer(payload: {
    sourceAllocationId: string;
    destinationResidenceId: string;
    destinationBuildingId: string;
    destinationRoomId: string;
    destinationBedId: string;
    transferDate?: string;
    reason?: HifzResidentialTransferReason;
    remarks?: string;
  }): Promise<{ transfer: HifzResidentialTransfer; newAllocation: HifzResidentialAllocation; closedAllocation: HifzResidentialAllocation }> {
    const res = await this.request<{ transfer: HifzResidentialTransfer; newAllocation: HifzResidentialAllocation; closedAllocation: HifzResidentialAllocation }>('/hifz/h6/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক স্থানান্তর করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidentialTransfers(params?: {
    enrollmentId?: string;
    studentProfileId?: string;
    sourceAllocationId?: string;
    reason?: string;
  }): Promise<HifzResidentialTransfer[]> {
    const query = new URLSearchParams();
    if (params?.enrollmentId) query.append('enrollmentId', params.enrollmentId);
    if (params?.studentProfileId) query.append('studentProfileId', params.studentProfileId);
    if (params?.sourceAllocationId) query.append('sourceAllocationId', params.sourceAllocationId);
    if (params?.reason) query.append('reason', params.reason);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<HifzResidentialTransfer[]>(`/hifz/h6/transfers${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক স্থানান্তর তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getHifzResidentialTransfer(id: string): Promise<HifzResidentialTransfer> {
    const res = await this.request<HifzResidentialTransfer>(`/hifz/h6/transfers/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আবাসিক স্থানান্তর তথ্য লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getStudentResidentialHistory(studentProfileId: string): Promise<{
    studentProfile: EducationStudentProfile;
    enrollments: HifzkhanaEnrollment[];
    activeAllocation: HifzResidentialAllocation | null;
    allocations: HifzResidentialAllocation[];
    transfers: HifzResidentialTransfer[];
  }> {
    const res = await this.request<{
      studentProfile: EducationStudentProfile;
      enrollments: HifzkhanaEnrollment[];
      activeAllocation: HifzResidentialAllocation | null;
      allocations: HifzResidentialAllocation[];
      transfers: HifzResidentialTransfer[];
    }>(`/hifz/h6/residential-history/${studentProfileId}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শিক্ষার্থীর আবাসিক ইতিহাস লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  // ==========================================
  // HIFZ H2 — QURAN REFERENCE FOUNDATION (READ-ONLY)
  // ==========================================

  async getQuranStatus(): Promise<QuranReferenceStatus> {
    const res = await this.request<QuranReferenceStatus>('/quran/status');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কুরআন রেফারেন্স স্ট্যাটাস লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranSurahs(): Promise<QuranSurah[]> {
    const res = await this.request<QuranSurah[]>('/quran/surahs');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সূরা তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranSurah(surahNumber: number): Promise<{ surah: QuranSurah; ayahs: QuranAyah[] }> {
    const res = await this.request<{ surah: QuranSurah; ayahs: QuranAyah[] }>(`/quran/surahs/${surahNumber}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সূরা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranAyah(verseKey: string): Promise<QuranAyah> {
    const res = await this.request<QuranAyah>(`/quran/ayahs/${encodeURIComponent(verseKey)}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || `আয়াত '${verseKey}' লোড করতে ব্যর্থ হয়েছে`);
    return res.data;
  }

  async getQuranRange(startVerseKey: string, endVerseKey: string): Promise<QuranRangeResult> {
    const res = await this.request<QuranRangeResult>(
      `/quran/range?start=${encodeURIComponent(startVerseKey)}&end=${encodeURIComponent(endVerseKey)}`
    );
    if (!res.success || !res.data) throw new Error(res.error?.message || 'আয়াত রেঞ্জ লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranJuzs(): Promise<QuranJuz[]> {
    const res = await this.request<QuranJuz[]>('/quran/juz');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পারা তালিকা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranJuz(juzNumber: number): Promise<{ juz: QuranJuz; ayahs: QuranAyah[] }> {
    const res = await this.request<{ juz: QuranJuz; ayahs: QuranAyah[] }>(`/quran/juz/${juzNumber}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পারা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranPage(pageNumber: number): Promise<{ pageNumber: number; ayahs: QuranAyah[] }> {
    const res = await this.request<{ pageNumber: number; ayahs: QuranAyah[] }>(`/quran/pages/${pageNumber}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পৃষ্ঠা লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranHizb(hizbNumber: number): Promise<{ hizbNumber: number; ayahs: QuranAyah[] }> {
    const res = await this.request<{ hizbNumber: number; ayahs: QuranAyah[] }>(`/quran/hizb/${hizbNumber}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'হিযব লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranRub(rubNumber: number): Promise<{ rubHizbNumber: number; hizbNumber: number; ayahs: QuranAyah[] }> {
    const res = await this.request<{ rubHizbNumber: number; hizbNumber: number; ayahs: QuranAyah[] }>(`/quran/rub/${rubNumber}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'রুবুল হিযব লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async getQuranManzil(manzilNumber: number): Promise<{ manzilNumber: number; ayahs: QuranAyah[] }> {
    const res = await this.request<{ manzilNumber: number; ayahs: QuranAyah[] }>(`/quran/manzil/${manzilNumber}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মঞ্জিল লোড করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async resetMosquePassword(mosqueId: string, newPassword?: string): Promise<{ adminName: string; adminPhone: string; newPassword: string; message: string }> {
    const res = await this.request<{ adminName: string; adminPhone: string; newPassword: string }>(`/saas/mosques/${mosqueId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পাসওয়ার্ড রিসেট করতে ব্যর্থ হয়েছে');
    return { ...res.data, message: res.message || 'পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে' };
  }

  async syncClientVault(payload: {
    incomeEntries?: IncomeEntry[];
    expenseEntries?: ExpenseEntry[];
    donations?: Donation[];
    donationBoxCollections?: DonationBoxCollection[];
  }): Promise<{
    restoredCount: number;
    restoredIncomes: number;
    restoredExpenses: number;
    restoredDonations: number;
    restoredBoxCollections: number;
  }> {
    const res = await this.request<{
      restoredCount: number;
      restoredIncomes: number;
      restoredExpenses: number;
      restoredDonations: number;
      restoredBoxCollections: number;
    }>('/sync/client-vault', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      return { restoredCount: 0, restoredIncomes: 0, restoredExpenses: 0, restoredDonations: 0, restoredBoxCollections: 0 };
    }
    return res.data;
  }

  // ==========================================
  // SMART NOTES ("খসড়া — Smart Notes") API
  // ==========================================

  async getSmartNoteCategories(): Promise<SmartNoteCategory[]> {
    const res = await this.request<SmartNoteCategory[]>('/notes/categories');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নোট ক্যাটাগরি লোড করা যায়নি');
    return res.data;
  }

  async createSmartNoteCategory(payload: { nameBn: string; nameEn?: string; colorHex?: string; icon?: string }): Promise<SmartNoteCategory> {
    const res = await this.request<SmartNoteCategory>('/notes/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'ক্যাটাগরি তৈরি করা যায়নি');
    return res.data;
  }

  async getSmartNoteStats(): Promise<SmartNoteStats> {
    const res = await this.request<SmartNoteStats>('/notes/stats');
    if (!res.success || !res.data) throw new Error(res.error?.message || 'পরিসংখ্যান লোড করা যায়নি');
    return res.data;
  }

  async getSmartNoteShareCandidates(): Promise<Array<{ id: string; name: string; role: string; phone: string }>> {
    const res = await this.request<Array<{ id: string; name: string; role: string; phone: string }>>('/notes/share-candidates');
    if (!res.success || !res.data) return [];
    return res.data;
  }

  async getSmartNotes(params?: {
    status?: string;
    categoryId?: string;
    noteType?: string;
    privacyMode?: string;
    tag?: string;
    search?: string;
    pinnedOnly?: boolean;
    favoriteOnly?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<SmartNote[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.noteType) query.append('noteType', params.noteType);
    if (params?.privacyMode) query.append('privacyMode', params.privacyMode);
    if (params?.tag) query.append('tag', params.tag);
    if (params?.search) query.append('search', params.search);
    if (params?.pinnedOnly) query.append('pinnedOnly', 'true');
    if (params?.favoriteOnly) query.append('favoriteOnly', 'true');
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request<SmartNote[]>(`/notes${qs}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নোট তালিকা লোড করা যায়নি');
    return res.data;
  }

  async getSmartNoteById(id: string): Promise<SmartNote> {
    const res = await this.request<SmartNote>(`/notes/${id}`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নোট লোড করা যায়নি');
    return res.data;
  }

  async createSmartNote(payload: Partial<SmartNote>): Promise<SmartNote> {
    const res = await this.request<SmartNote>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নোট সংরক্ষণ করা যায়নি');
    return res.data;
  }

  async updateSmartNote(
    id: string,
    payload: Partial<SmartNote> & { expectedVersion?: number; checkVersion?: boolean; createSnapshot?: boolean; changeSummary?: string }
  ): Promise<SmartNote> {
    const res = await this.request<SmartNote>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'নোট আপডেট করা যায়নি');
    return res.data;
  }

  async updateSmartNoteSharing(
    id: string,
    payload: { privacyMode: SmartNotePrivacyMode; sharedWith: SmartNoteShareEntry[] }
  ): Promise<SmartNote> {
    const res = await this.request<SmartNote>(`/notes/${id}/sharing`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'শেয়ারিং সেটিংস আপডেট হয়নি');
    return res.data;
  }

  async deleteSmartNote(id: string, permanent = false): Promise<SmartNote | null> {
    const res = await this.request<SmartNote | null>(`/notes/${id}${permanent ? '?permanent=true' : ''}`, {
      method: 'DELETE',
    });
    if (!res.success) throw new Error(res.error?.message || 'নোট মুছে ফেলা যায়নি');
    return res.data || null;
  }

  async getSmartNoteVersions(id: string): Promise<SmartNoteVersion[]> {
    const res = await this.request<SmartNoteVersion[]>(`/notes/${id}/versions`);
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংস্করণ ইতিহাস লোড করা যায়নি');
    return res.data;
  }

  async restoreSmartNoteVersion(noteId: string, versionId: string): Promise<SmartNote> {
    const res = await this.request<SmartNote>(`/notes/${noteId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংস্করণ পুনরুদ্ধার করা যায়নি');
    return res.data;
  }

  async getSmartNoteCommentsAndActivities(noteId: string): Promise<{ comments: SmartNoteComment[]; activities: SmartNoteActivity[] }> {
    const res = await this.request<{ comments: SmartNoteComment[]; activities: SmartNoteActivity[] }>(`/notes/${noteId}/comments`);
    if (!res.success || !res.data) return { comments: [], activities: [] };
    return res.data;
  }

  async addSmartNoteComment(noteId: string, text: string): Promise<SmartNoteComment> {
    const res = await this.request<SmartNoteComment>(`/notes/${noteId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'মন্তব্য যুক্ত করা যায়নি');
    return res.data;
  }

  async getSmartNoteReminders(): Promise<SmartNoteReminder[]> {
    const res = await this.request<SmartNoteReminder[]>('/notes/reminders/list');
    if (!res.success || !res.data) return [];
    return res.data;
  }

  async createSmartNoteReminder(
    noteId: string,
    payload: { title: string; description?: string; dueDate?: string; priority?: 'NORMAL' | 'HIGH' | 'URGENT'; assignedToUserId?: string; assignedToName?: string }
  ): Promise<SmartNoteReminder> {
    const res = await this.request<SmartNoteReminder>(`/notes/${noteId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'অনুস্মারক তৈরি করা যায়নি');
    return res.data;
  }

  async toggleSmartNoteReminder(reminderId: string, status: 'PENDING' | 'DONE'): Promise<SmartNoteReminder> {
    const res = await this.request<SmartNoteReminder>(`/notes/reminders/${reminderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'অনুস্মারক আপডেট করা যায়নি');
    return res.data;
  }

  async uploadSmartNoteAttachments(noteId: string, files: File[]): Promise<{ attachments: SmartNoteAttachment[]; note: SmartNote }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const authHeaders = this.getAuthHeaders();
    delete authHeaders['Content-Type'];

    const response = await fetch(`/api/v1/notes/${noteId}/attachments`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json?.error?.message || 'ফাইল আপলোড করতে ব্যর্থ হয়েছে');
    }
    return { attachments: json.data, note: json.note };
  }

  async deleteSmartNoteAttachment(noteId: string, attId: string): Promise<SmartNote> {
    const res = await this.request<SmartNote>(`/notes/${noteId}/attachments/${attId}`, {
      method: 'DELETE',
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'সংযুক্তি মুছে ফেলা যায়নি');
    return res.data;
  }

  async fetchSmartNoteAttachmentBlobUrl(downloadUrl: string): Promise<string> {
    const authHeaders = this.getAuthHeaders();
    delete authHeaders['Content-Type'];
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: authHeaders,
    });
    if (!response.ok) {
      throw new Error('ফাইল লোড করতে ব্যর্থ হয়েছে');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async formatVoiceTranscriptAi(rawText: string): Promise<SmartNoteVoiceFormatResult> {
    const res = await this.request<SmartNoteVoiceFormatResult>('/ai/notes/voice-format', {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'AI ভয়েস বিন্যাস ব্যর্থ হয়েছে');
    return res.data;
  }

  async ocrScanDocumentAi(payload: {
    files: Array<{ mimeType: string; base64Data: string; fileName?: string }>;
    outputMode: NoteOcrMode;
    customHint?: string;
  }): Promise<SmartNoteOcrResult> {
    const res = await this.request<SmartNoteOcrResult>('/ai/notes/ocr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'কাগজ OCR স্ক্যান করতে ব্যর্থ হয়েছে');
    return res.data;
  }

  async assistSmartNoteAi(payload: {
    action: NoteAiAssistAction;
    title?: string;
    plainText: string;
  }): Promise<SmartNoteAiAssistResult> {
    const res = await this.request<SmartNoteAiAssistResult>('/ai/notes/assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) throw new Error(res.error?.message || 'AI সহায়তা পাওয়া যায়নি');
    return res.data;
  }

  // ==========================================
  // ASSET & WAQF AI AUTOMATION APIS (PREVIEW/DRAFT ONLY)
  // ==========================================
  async analyzeWaqfDocumentAi(payload: {
    mode: 'PROPERTY' | 'TENANT_LEASE';
    file: { mimeType: string; base64Data: string; fileName?: string };
    customHint?: string;
  }): Promise<WaqfDocumentAnalysisResult> {
    const res = await this.request<WaqfDocumentAnalysisResult>('/ai/waqf/analyze-document', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ডকুমেন্ট বিশ্লেষণ ব্যর্থ হয়েছে। অনুগ্রহ করে ম্যানুয়ালি ফর্ম পূরণ করুন।');
    }
    return res.data;
  }

  async getWaqfRentRemindersAi(payload?: {
    billingMonth?: string;
    tone?: 'POLITE' | 'FORMAL';
  }): Promise<WaqfRentRemindersResult> {
    const res = await this.request<WaqfRentRemindersResult>('/ai/waqf/rent-reminders', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বকেয়া ভাড়ার রিমাইন্ডার ড্রাফট তৈরি করা যায়নি।');
    }
    return res.data;
  }

  async getWaqfPortfolioSummaryAi(): Promise<WaqfPortfolioSummaryResult> {
    const res = await this.request<WaqfPortfolioSummaryResult>('/ai/waqf/portfolio-summary', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ওয়াকফ ও সম্পদ সারসংক্ষেপ লোড করা যায়নি।');
    }
    return res.data;
  }

  // ==========================================
  // CEMETERY MANAGEMENT AI AUTOMATION APIS (PREVIEW/DRAFT ONLY)
  // ==========================================
  async extractCemeteryEntryAi(payload: {
    rawNoteText?: string;
    file?: { mimeType: string; base64Data: string; fileName?: string } | null;
    customHint?: string;
  }): Promise<CemeteryAiEntryExtractResult> {
    const res = await this.request<CemeteryAiEntryExtractResult>('/ai/cemetery/extract-entry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'নোট বা রেজিস্টার বিশ্লেষণ ব্যর্থ হয়েছে। অনুগ্রহ করে ম্যানুয়ালি ফর্ম পূরণ করুন।');
    }
    return res.data;
  }

  async generateCemeteryCertificateAndCondolenceAi(payload: {
    recordId: string;
    tone?: 'FORMAL' | 'COMPASSIONATE';
  }): Promise<CemeteryAiCertificateDraftResult> {
    const res = await this.request<CemeteryAiCertificateDraftResult>('/ai/cemetery/certificate-condolence', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'দাফন সনদ ও শোক বার্তা ড্রাফট তৈরি করা যায়নি।');
    }
    return res.data;
  }

  async getCemeterySummaryAndReuseAi(payload?: {
    reuseYears?: number;
  }): Promise<CemeteryAiSummaryResult> {
    const res = await this.request<CemeteryAiSummaryResult>('/ai/cemetery/summary-reuse', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'কবরস্থান সারসংক্ষেপ ও মেয়াদ তথ্য লোড করা যায়নি।');
    }
    return res.data;
  }

  // ==========================================
  // LIBRARY & KNOWLEDGE CENTER AI APIS (PREVIEW/DRAFT ONLY)
  // ==========================================
  async draftLibraryBookAi(payload: {
    titleHint?: string;
    authorHint?: string;
    coverImage?: { mimeType: string; base64Data: string; fileName?: string } | null;
    extraNotes?: string;
  }): Promise<LibraryBookAiDraftResult> {
    const res = await this.request<LibraryBookAiDraftResult>('/ai/library/book-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বইয়ের খসড়া তথ্য তৈরি করা যায়নি। অনুগ্রহ করে ম্যানুয়ালি ফর্ম পূরণ করুন।');
    }
    return res.data;
  }

  async summarizeKnowledgeNoteAi(payload: {
    rawNotes: string;
    speakerName?: string;
    topicHint?: string;
    sessionDate?: string;
    format?: 'STUDY_NOTE' | 'KHUTBAH_SUMMARY' | 'BAYAN_OUTLINE';
  }): Promise<KnowledgeNoteAiSummaryResult> {
    const res = await this.request<KnowledgeNoteAiSummaryResult>('/ai/library/knowledge-note', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বয়ান/নোট সারসংক্ষেপ তৈরি করা যায়নি।');
    }
    return res.data;
  }

  async getLibraryOverdueRemindersAi(payload?: {
    tone?: 'POLITE' | 'FORMAL';
  }): Promise<LibraryOverdueRemindersAiResult> {
    const res = await this.request<LibraryOverdueRemindersAiResult>('/ai/library/overdue-reminders', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'বই ফেরতের রিমাইন্ডার ড্রাফট তৈরি করা যায়নি।');
    }
    return res.data;
  }

  // ==========================================
  // PUBLIC PORTAL AI APIS (WHITELIST SANITIZED & TENANT-ISOLATED)
  // ==========================================
  async draftPublicPortalUpdateAi(payload: {
    updateType?: 'GENERAL_UPDATE' | 'PROJECT_PROGRESS' | 'WAQF_UPDATE' | 'EVENT_NOTICE' | 'PRAYER_ANNOUNCEMENT';
    adminBrief?: string;
    tone?: 'FORMAL' | 'WARM';
  }): Promise<PublicPortalUpdateAiDraftResult> {
    const res = await this.request<PublicPortalUpdateAiDraftResult>('/ai/public-portal/update-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'পাবলিক আপডেট ড্রাফট তৈরি করা যায়নি।');
    }
    return res.data;
  }

  async askPublicPortalAssistantAi(payload: {
    mosqueIdOrCode?: string;
    question: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  }): Promise<PublicPortalAiAssistantResponse> {
    const res = await this.request<PublicPortalAiAssistantResponse>('/public/portal/ai-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'এই মুহূর্তে AI তথ্য সহকারী উত্তর দিতে পারেনি।');
    }
    return res.data;
  }

  // ==========================================
  // CENTRAL DOCUMENT & ARCHIVE AI APIS (PREVIEW/DRAFT ONLY)
  // ==========================================
  async scanDocumentMetadataAi(payload: {
    fileData?: { mimeType: string; base64Data: string; fileName?: string } | null;
    rawText?: string;
    titleHint?: string;
    fileNameHint?: string;
  }): Promise<DocumentScanAiDraftResult> {
    const res = await this.request<DocumentScanAiDraftResult>('/ai/documents/scan-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ডকুমেন্ট বিশ্লেষণ করা যায়নি। অনুগ্রহ করে ম্যানুয়ালি ফর্ম পূরণ করুন।');
    }
    return res.data;
  }

  async getDocumentArchiveSummaryAi(): Promise<DocumentArchiveAiSummaryResult> {
    const res = await this.request<DocumentArchiveAiSummaryResult>('/ai/documents/archive-summary', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'আর্কাইভ সারসংক্ষেপ তৈরি করা যায়নি।');
    }
    return res.data;
  }

  // ==========================================
  // REPORT CENTER AI APIS (SUGGESTION & PRINTABLE COMMENTARY)
  // ==========================================
  async suggestReportFiltersAi(payload: {
    query: string;
    todayIso?: string;
  }): Promise<ReportFilterAiSuggestionResult> {
    const res = await this.request<ReportFilterAiSuggestionResult>('/ai/reports/filter-suggest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'ফিল্টার সাজেশন তৈরি করা যায়নি। নিচের ম্যানুয়াল ফিল্টার ব্যবহার করুন।');
    }
    return res.data;
  }

  async generateReportExecutiveSummaryAi(payload: {
    reportType: string;
    reportTitleBn: string;
    fromDate: string;
    toDate: string;
    filterSummaryBn?: string;
    systemMetrics: {
      openingBalance: number;
      totalIncome: number;
      totalExpense: number;
      netChange: number;
      closingBalance: number;
      incomeVoucherCount: number;
      expenseVoucherCount: number;
      topIncomeHeads?: Array<{ name: string; amount: number; count?: number }>;
      topExpenseHeads?: Array<{ name: string; amount: number; count?: number }>;
      extraContextBn?: string;
    };
  }): Promise<ReportExecutiveSummaryAiResult> {
    const res = await this.request<ReportExecutiveSummaryAiResult>('/ai/reports/executive-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'রিপোর্ট সারসংক্ষেপ নোট তৈরি করা যায়নি।');
    }
    return res.data;
  }

  // ==========================================
  // CAMERA & LIVE SCAN AI APIS (PREVIEW/DRAFT ONLY)
  // ==========================================
  async scanSmartVoucherOrDocAi(payload: {
    fileData?: { mimeType: string; base64Data: string; fileName?: string } | null;
    rawHintText?: string;
    targetModuleHint?: 'AUTO' | 'INCOME' | 'EXPENSE' | 'DOCUMENT' | 'SMART_NOTE';
  }): Promise<LiveScanAiDraftResult> {
    const res = await this.request<LiveScanAiDraftResult>('/ai/scanner/smart-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(
        res.error?.message || 'ছবি বা ডকুমেন্ট বিশ্লেষণ করা যায়নি। অনুগ্রহ করে ম্যানুয়াল স্ক্যান বা ফর্ম ব্যবহার করুন।'
      );
    }
    return res.data;
  }

  // ==========================================
  // NOTE & COIN COUNTER AI APIS (DETERMINISTIC SYSTEM MATH)
  // ==========================================
  async parseDenominationCountsAi(payload: {
    rawText: string;
  }): Promise<DenominationParseAiResult> {
    const res = await this.request<DenominationParseAiResult>('/ai/counter/parse-counts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(
        res.error?.message || 'ভয়েস বা লেখা থেকে নোট/কয়েনের সংখ্যা বের করা যায়নি। ম্যানুয়ালি সংখ্যা বসান।'
      );
    }
    return res.data;
  }

  async generateDenominationSummaryNoteAi(payload: {
    notes: Record<number, number>;
    coins: Record<number, number>;
    contextLabelBn?: string;
    countedBy?: string;
    witnesses?: string;
    reference?: string;
    countingDateTime?: string;
  }): Promise<DenominationSummaryNoteAiResult> {
    const res = await this.request<DenominationSummaryNoteAiResult>('/ai/counter/summary-note', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(
        res.error?.message || 'গণনা সারসংক্ষেপ নোট তৈরি করা যায়নি। সাধারণ কপি বাটন ব্যবহার করুন।'
      );
    }
    return res.data;
  }

  // ==========================================
  // SYSTEM & FINANCIAL AUDIT LOG AI APIS (READ-ONLY)
  // ==========================================
  async summarizeAuditLogsAi(payload: {
    logIds?: string[];
    filterSummaryBn?: string;
  }): Promise<AuditLogAiSummaryResult> {
    const res = await this.request<AuditLogAiSummaryResult>('/ai/audit/summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'অডিট লগ সারসংক্ষেপ তৈরি করা যায়নি।');
    }
    return res.data;
  }

  async suggestAuditLogFiltersAi(payload: {
    query: string;
    todayIso?: string;
  }): Promise<AuditLogAiFilterSuggestionResult> {
    const res = await this.request<AuditLogAiFilterSuggestionResult>('/ai/audit/filter-suggest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(
        res.error?.message || 'অডিট লগ ফিল্টার সাজেশন তৈরি করা যায়নি। নিচের ম্যানুয়াল ফিল্টার ব্যবহার করুন।'
      );
    }
    return res.data;
  }

  async analyzeFormAlertAi(payload: {
    formNameBn: string;
    moduleKey: string;
    alertType?: 'ERROR' | 'WARNING' | 'VALIDATION';
    alertMessageBn: string;
    fieldValuesSnapshot?: Record<string, any>;
    availablePatchFields?: Array<{ fieldKey: string; fieldLabelBn: string; currentValue?: string }>;
  }): Promise<FormAlertAssistResult> {
    const res = await this.request<FormAlertAssistResult>('/ai/form-alert-assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'সতর্কতার AI ব্যাখ্যা পাওয়া যায়নি।');
    }
    return res.data;
  }
}

export interface WaqfDocumentAnalysisResult {
  mode: 'PROPERTY' | 'TENANT_LEASE';
  documentTypeDetectedBn: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  extractedSummaryBn: string;
  verificationNotesBn: string[];
  unclearFieldsBn: string[];
  propertyFields: {
    name: string;
    category: string;
    type: string;
    location: string;
    mouza: string;
    jlNumber: string;
    subRegistryOffice: string;
    areaAmount: number;
    areaUnit: string;
    csPlotNo: string;
    saPlotNo: string;
    rsPlotNo: string;
    bsPlotNo: string;
    plotNo: string;
    csKhatianNo: string;
    saKhatianNo: string;
    rsKhatianNo: string;
    bsKhatianNo: string;
    mutationKhatianNo: string;
    khatianNo: string;
    waqfDeedNo: string;
    waqfDeedDate: string;
    waqfEnrollmentNo: string;
    waqifName: string;
    waqifFatherName: string;
    waqifAddress: string;
    waqfPurpose: string;
    boundaryNorth: string;
    boundarySouth: string;
    boundaryEast: string;
    boundaryWest: string;
    estimatedValue: number;
    monthlyIncome: number;
  };
  tenantFields: {
    name: string;
    fatherOrSpouseName: string;
    mobile: string;
    nid: string;
    address: string;
    unitOrShopNo: string;
    businessName: string;
    businessType: string;
    agreementNo: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    paymentDueDate: number;
  };
  modelUsed: string;
  generatedAt: string;
}

export interface WaqfRentReminderItem {
  propertyId: string;
  propertyName: string;
  propertyCode: string;
  tenantId: string;
  tenantName: string;
  mobile: string;
  unitOrShopNo: string;
  monthlyRent: number;
  paidThisMonth: number;
  dueAmount: number;
  status: 'UNPAID' | 'PARTIAL';
  messageDraftBn: string;
}

export interface WaqfRentRemindersResult {
  billingMonth: string;
  billingMonthLabelBn: string;
  totalActiveTenants: number;
  paidTenantsCount: number;
  overdueCount: number;
  totalDueAmount: number;
  summaryBn: string;
  reminders: WaqfRentReminderItem[];
  modelUsed: string;
  generatedAt: string;
}

export interface WaqfPortfolioLeaseAlert {
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  unitOrShopNo: string;
  agreementNo: string;
  endDate: string;
  daysRemaining: number;
  alertType: 'EXPIRED' | 'EXPIRING_SOON';
}

export interface WaqfPortfolioSummaryResult {
  billingMonth: string;
  billingMonthLabelBn: string;
  metrics: {
    totalAssetsCount: number;
    assetsCurrentValue: number;
    assetsNeedingRepairCount: number;
    totalPropertiesCount: number;
    propertiesEstimatedValue: number;
    rentedPropertiesCount: number;
    vacantPropertiesCount: number;
    disputedPropertiesCount: number;
    totalActiveTenants: number;
    paidTenantsCount: number;
    overdueCount: number;
    totalExpectedMonthlyRent: number;
    totalCollectedThisMonth: number;
    totalDueAmount: number;
    collectionRatePercent: number;
    expiringSoonCount: number;
    expiredLeasesCount: number;
  };
  leaseAlerts: WaqfPortfolioLeaseAlert[];
  headlineBn: string;
  summaryParagraphBn: string;
  collectionStatusBn: string;
  upcomingRenewalsBn: string[];
  actionableHighlightsBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface CemeteryAiExtractedFields {
  plotNumber: string;
  block: string;
  row: string;
  graveLocation: string;
  graveType: string;
  deceasedName: string;
  fatherOrSpouseName: string;
  gender: string;
  ageAtDeath: string;
  dateOfDeath: string;
  causeOfDeath: string;
  burialDate: string;
  burialTime: string;
  janazaPlace: string;
  contactPersonName: string;
  relationWithDeceased: string;
  contactPersonPhone: string;
  heirAddress: string;
  notes: string;
}

export interface CemeteryAiEntryExtractResult {
  sourceMode: 'TEXT' | 'FILE' | 'BOTH';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceSummaryBn: string;
  verificationNotesBn: string[];
  unclearFieldsBn: string[];
  extractedFields: CemeteryAiExtractedFields;
  modelUsed: string;
  generatedAt: string;
}

export interface CemeteryAiVerifiedRecord {
  id: string;
  recordNumber: string;
  deceasedName: string;
  fatherOrSpouseName: string;
  ageLabelBn: string;
  dateOfDeath: string;
  dateOfDeathBn: string;
  burialDate: string;
  burialDateBn: string;
  burialTime: string;
  janazaPlace: string;
  plotNumber: string;
  block: string;
  row: string;
  graveyardName: string;
  graveTypeLabelBn: string;
  contactPersonName: string;
  relationWithDeceased: string;
  contactPersonPhone: string;
  heirAddress: string;
  elapsedSinceBurialBn: string;
}

export interface CemeteryAiCertificateDraftResult {
  verifiedRecord: CemeteryAiVerifiedRecord;
  certificateTitleBn: string;
  certificateSubtitleBn: string;
  certificateBodyParagraphsBn: string[];
  certificateClosingBn: string;
  condolenceHeadingBn: string;
  condolenceMessageBn: string;
  duaArabicText: string;
  duaBanglaMeaning: string;
  shortSmsDraftBn: string;
  modelUsed: string;
  generatedAt: string;
}

export interface CemeteryReuseCandidateItem {
  recordId: string;
  recordNumber: string;
  plotNumber: string;
  block: string;
  row: string;
  deceasedName: string;
  burialDate: string;
  burialDateBn: string;
  graveType: string;
  graveTypeLabelBn: string;
  isPermanentOrFamily: boolean;
  elapsedDays: number;
  elapsedTotalMonths: number;
  durationLabelBn: string;
  daysUntilEligible: number;
  status: 'ELIGIBLE' | 'APPROACHING';
}

export interface CemeteryAiSummaryResult {
  metrics: {
    totalPlots: number;
    occupiedCount: number;
    availableCount: number;
    reservedCount: number;
    maintenanceCount: number;
    burialsThisMonth: number;
    burialsThisYear: number;
    reuseYears: number;
    reuseThresholdMonths: number;
    eligibleTotalCount: number;
    eligibleGeneralOrTempCount: number;
    eligiblePermanentOrFamilyCount: number;
    approachingCount: number;
  };
  blockSummary: Array<{
    block: string;
    total: number;
    occupied: number;
    available: number;
  }>;
  eligibleGraves: CemeteryReuseCandidateItem[];
  approachingGraves: CemeteryReuseCandidateItem[];
  headlineBn: string;
  summaryParagraphBn: string;
  reuseGuidanceBn: string;
  highlightsBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface LibraryBookAiExtractedFields {
  title: string;
  author: string;
  publisher: string;
  publicationYear: string;
  language: string;
  isbn: string;
  edition: string;
  categoryId: string;
  suggestedCategoryNameBn: string;
  subject: string;
  description: string;
}

export interface LibraryBookAiDraftResult {
  sourceMode: 'TEXT' | 'IMAGE' | 'BOTH';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceSummaryBn: string;
  verificationNotesBn: string[];
  unclearFieldsBn: string[];
  extractedFields: LibraryBookAiExtractedFields;
  modelUsed: string;
  generatedAt: string;
}

export interface KnowledgeNoteAiSummaryResult {
  format: 'STUDY_NOTE' | 'KHUTBAH_SUMMARY' | 'BAYAN_OUTLINE';
  speakerName: string;
  sessionDate: string;
  titleBn: string;
  topicCategoryBn: string;
  summaryParagraphBn: string;
  keyPointsBn: string[];
  actionableLessonsBn: string[];
  referencesMentionedBn: string[];
  readableNoteDraftBn: string;
  verificationWarningBn: string;
  modelUsed: string;
  generatedAt: string;
}

export interface LibraryOverdueReminderItem {
  issueId: string;
  issueNumber: string;
  readerName: string;
  readerPhone: string;
  bookTitle: string;
  bookCopyCode: string;
  issueDate: string;
  dueDate: string;
  dueDateBn: string;
  daysOverdue: number;
  messageBn: string;
  shortSmsBn: string;
}

export interface LibraryOverdueRemindersAiResult {
  todayIso: string;
  overdueCount: number;
  summaryBn: string;
  reminders: LibraryOverdueReminderItem[];
  modelUsed: string;
  generatedAt: string;
}

export interface PublicPortalUpdateAiDraftResult {
  updateType: 'GENERAL_UPDATE' | 'PROJECT_PROGRESS' | 'WAQF_UPDATE' | 'EVENT_NOTICE' | 'PRAYER_ANNOUNCEMENT';
  titleBn: string;
  descriptionBn: string;
  suggestedPriority: 'NORMAL' | 'HIGH' | 'URGENT';
  highlightsBn: string[];
  safetyCheckNoteBn: string;
  sourceSectionsUsedBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface PublicPortalAiAssistantResponse {
  mosqueId: string;
  mosqueNameBn: string;
  answerBn: string;
  refusedPrivateOrUnavailable: boolean;
  suggestedFollowUpsBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface DocumentScanAiDraftResult {
  sourceMode: 'TEXT' | 'FILE' | 'BOTH';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedDocKindBn: string;
  sourceSummaryBn: string;
  extractedFields: {
    name: string;
    entityType: string;
    entityTypeLabelBn: string;
    entityTitle: string;
    documentType: string;
    documentTypeLabelBn: string;
    documentDate: string;
    summaryNoteBn: string;
    suggestedTagsBn: string[];
  };
  detectedSensitiveFacts: Array<{
    labelBn: string;
    value: string;
    verifyWarningBn: string;
  }>;
  verificationNotesBn: string[];
  unclearFieldsBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface DocumentArchiveAiSummaryResult {
  metrics: {
    totalDocuments: number;
    addedLast30DaysCount: number;
    directFileCount: number;
    driveLinkCount: number;
    publicCount: number;
    restrictedCount: number;
    privateCount: number;
    topCategories: Array<{ code: string; labelBn: string; count: number }>;
    topEntities: Array<{ code: string; labelBn: string; count: number }>;
  };
  headlineBn: string;
  summaryBn: string;
  highlightsBn: string[];
  suggestedSearchChips: Array<{
    labelBn: string;
    entityType: string;
    documentType: string;
    searchKeyword: string;
  }>;
  modelUsed: string;
  generatedAt: string;
}

export interface ReportFilterAiSuggestionResult {
  originalQuery: string;
  suggestedFilters: {
    reportType: string;
    reportTypeLabelBn: string;
    dateRangeType: string;
    fromDate: string;
    toDate: string;
    fromDateBn: string;
    toDateBn: string;
    grouping: string;
    level: string;
    selectedHeadId: string;
    selectedHeadLabelBn: string;
    selectedSubHeadId: string;
    selectedSubHeadLabelBn: string;
    selectedAccountId: string;
    selectedAccountLabelBn: string;
  };
  explanationBn: string;
  unmatchedNotesBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface ReportExecutiveSummaryAiResult {
  titleBn: string;
  summaryNoteBn: string;
  keyTakeawaysBn: string[];
  verifiedMetrics: {
    openingBalance: number;
    totalIncome: number;
    totalExpense: number;
    netChange: number;
    closingBalance: number;
    incomeVoucherCount: number;
    expenseVoucherCount: number;
    topIncomeHeads: Array<{ name: string; amount: number; count: number }>;
    topExpenseHeads: Array<{ name: string; amount: number; count: number }>;
    extraContextBn: string;
  };
  modelUsed: string;
  generatedAt: string;
}

export interface LiveScanAiDraftResult {
  sourceMode: 'TEXT' | 'IMAGE' | 'BOTH';
  suggestedTargetModule: 'INCOME' | 'EXPENSE' | 'DOCUMENT' | 'SMART_NOTE';
  suggestedTargetLabelBn: string;
  documentKindBn: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  draftFields: {
    titleBn: string;
    date: string;
    dateBn: string;
    amount: number | null;
    suggestedHeadId: string;
    suggestedHeadNameBn: string;
    voucherOrRefNo: string;
    partyName: string;
    descriptionBn: string;
  };
  detectedSensitiveFacts: Array<{
    labelBn: string;
    value: string;
    verifyWarningBn: string;
  }>;
  unclearFieldsBn: string[];
  verificationNotesBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface DenominationParseAiResult {
  originalText: string;
  notes: Record<number, number>;
  coins: Record<number, number>;
  totalNotesCount: number;
  totalCoinsCount: number;
  notesSubtotal: number;
  coinsSubtotal: number;
  grandTotal: number;
  parsedItems: Array<{
    kind: 'NOTE' | 'COIN';
    denom: number;
    count: number;
    lineTotal: number;
  }>;
  unparsedSegmentsBn: string[];
  verificationNoteBn: string;
  modelUsed: string;
  generatedAt: string;
}

export interface DenominationSummaryNoteAiResult {
  titleBn: string;
  summaryNoteBn: string;
  shortCopyTextBn: string;
  verifiedBreakdown: {
    notes: Record<number, number>;
    coins: Record<number, number>;
    totalNotesCount: number;
    totalCoinsCount: number;
    notesSubtotal: number;
    coinsSubtotal: number;
    grandTotal: number;
    parsedItems: Array<{
      kind: 'NOTE' | 'COIN';
      denom: number;
      count: number;
      lineTotal: number;
    }>;
  };
  modelUsed: string;
  generatedAt: string;
}

export interface AuditLogAiSummaryResult {
  metrics: {
    totalLogsAnalyzed: number;
    createCount: number;
    updateCount: number;
    deleteCount: number;
    cancelOrReverseCount: number;
    failedOrWarningCount: number;
    repeatedEntityEditsCount: number;
    topUsers: Array<{ userName: string; count: number }>;
  };
  headlineBn: string;
  summaryParagraphBn: string;
  keyObservationsBn: string[];
  attentionItemsBn: string[];
  disclaimerBn: string;
  modelUsed: string;
  generatedAt: string;
}

export interface AuditLogAiFilterSuggestionResult {
  originalQuery: string;
  suggestedFilters: {
    moduleFilter: string;
    moduleLabelBn: string;
    actionFilter: string;
    actionLabelBn: string;
    statusFilter: string;
    statusLabelBn: string;
    userFilter: string;
    fromDate: string;
    fromDateBn: string;
    toDate: string;
    toDateBn: string;
    searchQuery: string;
  };
  explanationBn: string;
  unmatchedNotesBn: string[];
  modelUsed: string;
  generatedAt: string;
}

export interface StaffDocumentScanResult {
  detectedDocTypeBn: string;
  fullNameBn: string;
  nameEn: string;
  fatherName: string;
  motherName: string;
  nid: string;
  dateOfBirth: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  presentAddress: string;
  permanentAddress: string;
  bloodGroup: string;
  generalEducation: string;
  religiousEducation: string;
  previousExperience: string;
  appointment?: {
    designation?: string;
    designationBn?: string;
    appointmentDate?: string;
    joiningDate?: string;
    appointmentLetterNo?: string;
    responsibilities?: string;
  };
  education?: {
    generalEducation?: string;
    religiousEducation?: string;
    specialSkills?: string;
    previousExperience?: string;
    quranMemorizationHifz?: boolean | null;
    qiratTajweedCertification?: boolean | null;
    institutionNameBn?: string;
  };
  salary?: {
    basicSalary?: number | null;
    housingAllowance?: number | null;
    medicalAllowance?: number | null;
    transportAllowance?: number | null;
    otherAllowance?: number | null;
    paymentPreference?: string;
  };
  bank?: {
    bankName?: string;
    branchName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  docsNotes?: {
    notes?: string;
    officialAdminNotes?: string;
  };
  verificationWarningsBn?: string[];
  confidenceNoteBn: string;
  generatedAt: string;
}

export interface FormAlertAssistResult {
  causeBn: string;
  howToFixBn: string;
  safeSuggestionBn: string;
  checklistBn: string[];
  patchSuggestions: Array<{
    fieldKey: string;
    fieldLabelBn: string;
    proposedValue: string;
    reasonBn: string;
  }>;
  modelUsed: string;
  generatedAt: string;
}

export const api = new ApiService();




import {
  ApiResponse,
  User,
  Mosque,
  DashboardStats,
  AccountHead,
  FinancialAccount,
  AccountOpeningBalancePayload,
  AccountTransfer,
  IncomeEntry,
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
} from '../types';
import {
  OfficialDocument,
  OfficialDocumentTemplate,
  OfficialDocumentType,
  OfficialDocumentStatus,
} from '../types/officialDocumentTypes';

class ApiService {
  private token: string | null = null;
  private currentUserId: string = '';
  private currentMosqueId: string = '';
  private inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

  constructor() {
    const savedUser = localStorage.getItem('ml_user_id');
    const savedMosque = localStorage.getItem('ml_mosque_id');
    const savedToken = localStorage.getItem('ml_token');
    if (savedUser) this.currentUserId = savedUser;
    if (savedMosque) this.currentMosqueId = savedMosque;
    if (savedToken) this.token = savedToken;
  }

  setAuth(userId: string, mosqueId: string, token?: string) {
    this.currentUserId = userId;
    this.currentMosqueId = mosqueId;
    if (token) {
      this.token = token;
      localStorage.setItem('ml_token', token);
    }
    localStorage.setItem('ml_user_id', userId);
    localStorage.setItem('ml_mosque_id', mosqueId);
  }

  clearAuth() {
    this.token = null;
    this.currentUserId = '';
    this.currentMosqueId = '';
    localStorage.removeItem('ml_token');
    localStorage.removeItem('ml_user_id');
    localStorage.removeItem('ml_mosque_id');
    this.inFlightRequests.clear();
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
      'x-mosque-id': this.currentMosqueId,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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
  async login(credentials: { identifier?: string; phone?: string; phoneOrEmail?: string; password: string; mosqueId?: string }): Promise<{ user: User; token: string }> {
    const payload = {
      identifier: credentials.identifier || credentials.phone || credentials.phoneOrEmail || '',
      phone: credentials.phone || credentials.identifier || '',
      phoneOrEmail: credentials.phoneOrEmail || credentials.identifier || credentials.phone || '',
      password: credentials.password,
      mosqueId: credentials.mosqueId,
    };
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'লগইন ব্যর্থ হয়েছে। সঠিক তথ্য প্রদান করুন।');
    }
    this.setAuth(res.data.user.id, res.data.user.mosqueId, res.data.token);
    return res.data;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
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

  // Incomes & Expenses
  async getIncomes(): Promise<IncomeEntry[]> {
    const res = await this.request<IncomeEntry[]>('/accounting/income');
    return res.data || [];
  }

  async createIncome(data: any): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>('/accounting/income', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add income');
    return res.data!;
  }

  async updateIncome(id: string, data: any): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update income');
    return res.data!;
  }

  async reverseIncome(id: string, reason: string): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to reverse income');
    return res.data!;
  }

  async getExpenses(): Promise<ExpenseEntry[]> {
    const res = await this.request<ExpenseEntry[]>('/accounting/expense');
    return res.data || [];
  }

  async createExpense(data: any): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>('/accounting/expense', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add expense');
    return res.data!;
  }

  async updateExpense(id: string, data: any): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>(`/accounting/expense/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update expense');
    return res.data!;
  }

  async reverseExpense(id: string, reason: string): Promise<ExpenseEntry> {
    const res = await this.request<ExpenseEntry>(`/accounting/expense/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to reverse expense');
    return res.data!;
  }

  // Donations & Donation Boxes
  async getDonations(): Promise<Donation[]> {
    const res = await this.request<Donation[]>('/donations');
    return res.data || [];
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
    return res.data!;
  }

  async cancelDonation(id: string, reason?: string): Promise<Donation> {
    const res = await this.request<Donation>(`/donations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to cancel donation');
    return res.data!;
  }

  async getDonationBoxes(): Promise<DonationBox[]> {
    const res = await this.request<{ boxes: DonationBox[]; collections: DonationBoxCollection[] }>('/donation-boxes');
    return res.data?.boxes || [];
  }

  async getDonationBoxCollections(): Promise<DonationBoxCollection[]> {
    const res = await this.request<{ boxes: DonationBox[]; collections: DonationBoxCollection[] }>('/donation-boxes');
    return res.data?.collections || [];
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
    return res.data!;
  }

  // Denomination Update & Summary APIs
  async updateIncomeDenomination(id: string, denominationData: any, editReason?: string): Promise<IncomeEntry> {
    const res = await this.request<IncomeEntry>(`/accounting/income/${id}/denomination`, {
      method: 'PUT',
      body: JSON.stringify({ denominationData, editReason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update income denomination');
    return res.data!;
  }

  async updateDonationDenomination(id: string, denominationData: any, editReason?: string): Promise<Donation> {
    const res = await this.request<Donation>(`/donations/${id}/denomination`, {
      method: 'PUT',
      body: JSON.stringify({ denominationData, editReason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update donation denomination');
    return res.data!;
  }

  async updateDonationBoxCollectionDenomination(id: string, denominationData: any, editReason?: string): Promise<DonationBoxCollection> {
    const res = await this.request<DonationBoxCollection>(`/donation-boxes/collections/${id}/denomination`, {
      method: 'PUT',
      body: JSON.stringify({ denominationData, editReason }),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update box collection denomination');
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
      body: JSON.stringify({ phone, message, tokenUrl }),
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

  // AI Advisor / Financial Auditor
  async askAi(question: string, language: string = 'bn') {
    return this.request<{ answer: string }>('/ai/financial-audit', {
      method: 'POST',
      body: JSON.stringify({ question, language }),
    });
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
}

export const api = new ApiService();

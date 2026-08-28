import {
  ApiResponse,
  User,
  Mosque,
  DashboardStats,
  AccountHead,
  FinancialAccount,
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
  StaffBankTransferLetter,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  AuditLog,
  UserStatus,
  SubCommittee,
} from '../types';

class ApiService {
  private token: string | null = null;
  private currentUserId: string = 'usr-admin-1';
  private currentMosqueId: string = 'mosque-mamun-001';
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
    localStorage.removeItem('ml_token');
    localStorage.removeItem('ml_user_id');
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

  private async executeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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

      if (!isAbort) {
        console.error(`API Error on ${endpoint}:`, err);
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
  async login(credentials: { identifier: string; password: string; mosqueId?: string }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Login failed');
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

  async updateMosqueSettings(data: Partial<Mosque>): Promise<Mosque> {
    const res = await this.request<Mosque>('/mosques/current', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update mosque settings');
    return res.data!;
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

  async createDonation(data: any): Promise<Donation> {
    const res = await this.request<Donation>('/donations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create donation');
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

  async disburseFestivalAllowance(data: any): Promise<{ payments: StaffPayment[]; bankLetter?: any }> {
    const res = await this.request<{ payments: StaffPayment[]; bankLetter?: any }>('/staff/disburse-festival-allowance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to disburse festival allowance');
    return res.data!;
  }

  async reviseStaffSalary(id: string, data: { newSalary: number; effectiveDate: string; reason?: string }): Promise<Staff> {
    const res = await this.request<Staff>(`/staff/${id}/salary-revision`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to revise staff salary');
    return res.data!;
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

  // WebSocket Real-time Listener
  private ws: WebSocket | null = null;
  private wsListeners: Set<(event: { type: string; mosqueId?: string; data?: any }) => void> = new Set();
  private reconnectTimeout: any = null;
  private reconnectDelay: number = 3000;

  connectWebSocket(onEvent?: (event: any) => void) {
    if (onEvent) {
      this.wsListeners.add(onEvent);
    }

    if (typeof window === 'undefined' || !window.WebSocket) {
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${encodeURIComponent(this.currentUserId)}&mosqueId=${encodeURIComponent(this.currentMosqueId)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectDelay = 3000;
        console.log('[WebSocket] Connected to MasjidLedger Realtime Server');
      };

      this.ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          this.wsListeners.forEach(listener => listener(parsed));
        } catch (err) {
          console.warn('[WebSocket] Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        const nextDelay = this.reconnectDelay;
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.connectWebSocket();
        }, nextDelay);
      };

      this.ws.onerror = (err) => {
        console.debug('[WebSocket] Notice: Realtime connection unavailable, falling back to polling.', err);
      };
    } catch (err) {
      console.debug('[WebSocket] Realtime connection could not be opened:', err);
    }
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

  // AI Advisor
  async askAi(question: string, language: string = 'bn') {
    return this.request<{ answer: string }>('/ai/advisor', {
      method: 'POST',
      body: JSON.stringify({ question, language }),
    });
  }
}

export const api = new ApiService();

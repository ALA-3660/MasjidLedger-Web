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
  Staff,
  StaffPayment,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  AuditLog,
  UserStatus,
} from '../types';

class ApiService {
  private token: string | null = null;
  private currentUserId: string = 'usr-admin-1';
  private currentMosqueId: string = 'mosque-mamun-001';

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
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`/api/v1${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await response.json();
      return json;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(`API Error on ${endpoint}:`, err);
      return {
        success: false,
        error: {
          code: err.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
          message: err.name === 'AbortError' ? 'সার্ভার অনুরোধের সময়সীমা পার হয়েছে (Timeout)।' : 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।',
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

  async createCommitteeMember(data: any): Promise<CommitteeMember> {
    const res = await this.request<CommitteeMember>('/committee/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add committee member');
    return res.data!;
  }

  async createCommitteeMeeting(data: any): Promise<CommitteeMeeting> {
    const res = await this.request<CommitteeMeeting>('/committee/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to add meeting');
    return res.data!;
  }

  // Management (Staff, Assets, Properties, Cemetery, Notices)
  async getStaff(): Promise<Staff[]> {
    const res = await this.request<any>('/management/all');
    return res.data?.staff || [];
  }

  async getStaffPayments(): Promise<StaffPayment[]> {
    const res = await this.request<any>('/management/all');
    return res.data?.staffPayments || [];
  }

  async getAssets(): Promise<MosqueAsset[]> {
    const res = await this.request<any>('/management/all');
    return res.data?.assets || [];
  }

  async getProperties(): Promise<MosqueProperty[]> {
    const res = await this.request<any>('/management/all');
    return res.data?.properties || [];
  }

  async getCemeteryRecords(): Promise<CemeteryRecord[]> {
    const res = await this.request<any>('/management/all');
    return res.data?.cemetery || [];
  }

  async getNotices(): Promise<MosqueNotice[]> {
    const res = await this.request<any>('/management/all');
    return res.data?.notices || [];
  }

  async payStaffSalary(data: any): Promise<StaffPayment> {
    const res = await this.request<StaffPayment>('/management/staff-pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to pay staff');
    return res.data!;
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

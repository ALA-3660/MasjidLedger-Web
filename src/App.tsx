import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import {
  Mosque,
  User,
  FinancialAccount,
  AccountOpeningBalancePayload,
  AccountHead,
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
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  AuditLog,
  SavedReportConfig,
  UserStatus,
  DashboardStats,
  SubCommittee,
} from './types';
import { Language, translations } from './lib/i18n';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { IncomeExpenseView } from './components/IncomeExpenseView';
import { DonationView } from './components/DonationView';
import { CashBankView } from './components/CashBankView';
import { CommitteeView } from './components/CommitteeView';
import { ManagementView } from './components/ManagementView';
import { ReportCenterView } from './components/ReportCenterView';
import { MosqueSettingsView } from './components/MosqueSettingsView';
import { AuditLogView } from './components/AuditLogView';
import { DailyTransactionsView } from './components/DailyTransactionsView';
import { UserManagementView } from './components/UserManagementView';
import { PublicPortalView } from './components/PublicPortalView';
import { QRManagementView } from './components/QRManagementView';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { MoneyReceiptModal, VoucherModal, PrintFormat } from './components/PrintModals';
import { ChangeCalculatorModal } from './components/ChangeCalculatorModal';
import { UniversalScannerModal } from './components/UniversalScannerModal';
import { QrActionCardsModal } from './components/QrActionCardsModal';
import { RecordActionModal } from './components/RecordActionModal';
import { RecordPrintLabelModal } from './components/RecordPrintLabelModal';
import { resolveRecordFromSystem } from './services/qrBarcodeService';
import { QrScanResult, ResolvedRecordItem, RecordSpecificAction } from './types/qrBarcodeTypes';
import {
  AlertCircle,
  RefreshCw,
  Sparkles,
  Send,
  X,
  Bot,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  Banknote,
  Calculator,
  QrCode,
  TrendingUp,
  Receipt,
  Camera,
  HeartHandshake,
  FileText,
} from 'lucide-react';

export default function App() {
  // App Global State
  const [language, setLanguage] = useState<Language>('bn');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [allMosques, setAllMosques] = useState<Mosque[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Mobile View & Drawer State
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // AI Advisor State
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Universal Calculator & Scanner Global State
  const [isGlobalCalculatorOpen, setIsGlobalCalculatorOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isActionCardHubOpen, setIsActionCardHubOpen] = useState<boolean>(false);
  const [scannedActionIntent, setScannedActionIntent] = useState<QrScanResult | null>(null);
  const [activeRecordAction, setActiveRecordAction] = useState<ResolvedRecordItem | null>(null);
  const [activePrintLabel, setActivePrintLabel] = useState<ResolvedRecordItem | null>(null);

  // Domain Entity Collections
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationBoxes, setDonationBoxes] = useState<DonationBox[]>([]);
  const [boxCollections, setBoxCollections] = useState<DonationBoxCollection[]>([]);
  const [terms, setTerms] = useState<CommitteeTerm[]>([]);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [meetings, setMeetings] = useState<CommitteeMeeting[]>([]);
  const [committeeNotices, setCommitteeNotices] = useState<CommitteeMeetingNotice[]>([]);
  const [resolutions, setResolutions] = useState<MeetingResolution[]>([]);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [assets, setAssets] = useState<MosqueAsset[]>([]);
  const [properties, setProperties] = useState<MosqueProperty[]>([]);
  const [cemetery, setCemetery] = useState<CemeteryRecord[]>([]);
  const [notices, setNotices] = useState<MosqueNotice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [savedReportConfigs, setSavedReportConfigs] = useState<SavedReportConfig[]>([]);

  // Print Modals State
  const [activeDonationReceipt, setActiveDonationReceipt] = useState<{
    donation: Donation | null;
    format?: PrintFormat;
    isReprint?: boolean;
    autoPrint?: boolean;
  } | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<{
    item: IncomeEntry | ExpenseEntry | null;
    type: 'INCOME' | 'EXPENSE';
    format?: PrintFormat;
    isReprint?: boolean;
    autoPrint?: boolean;
  }>({ item: null, type: 'INCOME', format: 'POS_80' });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Fetch all initial data from backend (isInitial = true shows full splash; isInitial = false performs background silent sync)
  const loadData = async (isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    setErrorMessage('');
    try {
      const [
        mosqueRes,
        userRes,
        usersListRes,
        accountsRes,
        headsRes,
        incomesRes,
        expensesRes,
        donationsRes,
        boxesRes,
        boxColsRes,
        termsRes,
        membersRes,
        meetingsRes,
        committeeNoticesRes,
        resolutionsRes,
        subCommitteesRes,
        staffRes,
        staffPaysRes,
        assetsRes,
        propsRes,
        cemeteryRes,
        noticesRes,
        auditRes,
        statsRes,
      ] = await Promise.all([
        api.getMosque().catch(() => null),
        api.getCurrentUser().catch(() => null),
        api.getUsers().catch(() => []),
        api.getAccounts().catch(() => []),
        api.getAccountHeads().catch(() => []),
        api.getIncomes().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getDonations().catch(() => []),
        api.getDonationBoxes().catch(() => []),
        api.getDonationBoxCollections().catch(() => []),
        api.getCommitteeTerms().catch(() => []),
        api.getCommitteeMembers().catch(() => []),
        api.getCommitteeMeetings().catch(() => []),
        api.getCommitteeNotices().catch(() => []),
        api.getCommitteeResolutions().catch(() => []),
        api.getSubCommittees().catch(() => []),
        api.getStaff().catch(() => []),
        api.getStaffPayments().catch(() => []),
        api.getAssets().catch(() => []),
        api.getProperties().catch(() => []),
        api.getCemeteryRecords().catch(() => []),
        api.getNotices().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getDashboardStats().catch(() => null),
      ]);

      if (mosqueRes) {
        setMosque(mosqueRes);
        setAllMosques([mosqueRes]);
      }
      if (userRes) {
        setCurrentUser(userRes);
        setIsAuthenticated(true);
      }
      if (usersListRes) setAllUsers(usersListRes);
      if (accountsRes) setAccounts(accountsRes);
      if (headsRes) setAccountHeads(headsRes);
      if (incomesRes) setIncomes(incomesRes);
      if (expensesRes) setExpenses(expensesRes);
      if (donationsRes) setDonations(donationsRes);
      if (boxesRes) setDonationBoxes(boxesRes);
      if (boxColsRes) setBoxCollections(boxColsRes);
      if (termsRes) setTerms(termsRes);
      if (membersRes) setMembers(membersRes);
      if (meetingsRes) setMeetings(meetingsRes);
      if (committeeNoticesRes) setCommitteeNotices(committeeNoticesRes);
      if (resolutionsRes) setResolutions(resolutionsRes);
      if (subCommitteesRes) setSubCommittees(subCommitteesRes);
      if (staffRes) setStaff(staffRes);
      if (staffPaysRes) setStaffPayments(staffPaysRes);
      if (assetsRes) {
        if (Array.isArray(assetsRes)) {
          setAssets(assetsRes);
        } else if ((assetsRes as any).assets && Array.isArray((assetsRes as any).assets)) {
          setAssets((assetsRes as any).assets);
        } else {
          setAssets([]);
        }
      }
      if (propsRes) setProperties(propsRes);
      if (cemeteryRes) setCemetery(cemeteryRes);
      if (noticesRes) setNotices(noticesRes);
      if (auditRes) setAuditLogs(auditRes);
      if (statsRes) setDashboardStats(statsRes);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      setErrorMessage(err.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);

    // Connect WebSocket for real-time synchronization with Android & other clients
    api.connectWebSocket((event) => {
      // Auto reload data silently on entity changes
      if (
        event.type?.includes('_CREATED') ||
        event.type?.includes('_UPDATED') ||
        event.type?.includes('_DELETED') ||
        event.type?.includes('_REVERSED') ||
        event.type?.includes('_COLLECTED') ||
        event.type?.includes('_PAID') ||
        event.type?.includes('_TRANSFER') ||
        event.type?.includes('_STATUS') ||
        event.type === 'DASHBOARD_STATS_UPDATED'
      ) {
        loadData(false);
      }
    });

    // Fallback polling sync (silent background fetch)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    }, 60000);

    // Global Keyboard Shortcut: Alt+C for calculator, Alt+Q for scanner
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && e.altKey && (e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
        setIsGlobalCalculatorOpen((prev) => !prev);
      } else if (
        (e.altKey && (e.key === 'q' || e.key === 'Q')) ||
        (e.ctrlKey && e.altKey && (e.key === 'q' || e.key === 'Q'))
      ) {
        e.preventDefault();
        setIsScannerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

  // Universal Scanner Action Dispatcher & Deep Link Router
  const getResolvedRecord = (code: string): ResolvedRecordItem | null => {
    return resolveRecordFromSystem(code, {
      incomes,
      expenses,
      donations,
      donationBoxes,
      staff,
      staffPayments,
      assets,
      properties,
      cemetery,
      members,
      subCommittees,
      resolutions,
      meetings,
    });
  };

  const handleOpenRecordAction = (target: string | ResolvedRecordItem) => {
    if (typeof target === 'string') {
      const resolved = getResolvedRecord(target);
      if (resolved) {
        setActiveRecordAction(resolved);
      }
    } else {
      setActiveRecordAction(target);
    }
  };

  const handleOpenPrintLabel = (target: string | ResolvedRecordItem) => {
    if (typeof target === 'string') {
      const resolved = getResolvedRecord(target);
      if (resolved) {
        setActivePrintLabel(resolved);
      }
    } else {
      setActivePrintLabel(target);
    }
  };

  const handleScannerNavigate = (result: QrScanResult) => {
    if (!result) return;
    
    if (result.type === 'RECORD') {
      const resolved = getResolvedRecord(result.code || result.raw);
      if (resolved) {
        setActiveRecordAction(resolved);
      }
    }

    // Switch to target module tab seamlessly
    if (result.targetTab) {
      setCurrentTab(result.targetTab);
    }
    setScannedActionIntent(result);
  };

  const handleExecuteRecordAction = (action: RecordSpecificAction, recordItem: ResolvedRecordItem) => {
    setActiveRecordAction(null);

    switch (action.actionType) {
      case 'VIEW_DETAILS':
        if (recordItem.targetTab) {
          setCurrentTab(recordItem.targetTab);
        }
        break;
      case 'PRINT_LABEL':
        setActivePrintLabel(recordItem);
        break;
      case 'PRINT_RECEIPT':
        if (recordItem.entityType === 'INCOME') {
          setActiveVoucher({ item: recordItem.rawRecord, type: 'INCOME', format: 'POS_80', isReprint: true });
        } else if (recordItem.entityType === 'EXPENSE') {
          setActiveVoucher({ item: recordItem.rawRecord, type: 'EXPENSE', format: 'POS_80', isReprint: true });
        } else if (recordItem.entityType === 'DONATION') {
          setActiveDonationReceipt({ donation: recordItem.rawRecord, format: 'POS_80', isReprint: true });
        }
        break;
      case 'ASSET_SERVICE':
      case 'ASSET_REPAIR':
      case 'ASSET_EXPENSE':
        setCurrentTab('assets');
        setScannedActionIntent({
          raw: recordItem.canonicalCode,
          type: 'RECORD',
          code: recordItem.canonicalCode,
          entityType: 'ASSET',
          targetTab: 'assets',
          recordIdOrNumber: recordItem.rawRecord?.id,
        });
        break;
      case 'WAQF_RENT_COLLECT':
      case 'WAQF_TENANT':
      case 'WAQF_DUE':
      case 'WAQF_AGREEMENT':
        setCurrentTab('property');
        setScannedActionIntent({
          raw: recordItem.canonicalCode,
          type: 'RECORD',
          code: recordItem.canonicalCode,
          entityType: 'WAQF_PROPERTY',
          targetTab: 'property',
          recordIdOrNumber: recordItem.rawRecord?.id,
        });
        break;
      case 'STAFF_SALARY':
      case 'STAFF_FESTIVAL':
      case 'STAFF_HISTORY':
        setCurrentTab('staff');
        setScannedActionIntent({
          raw: recordItem.canonicalCode,
          type: 'RECORD',
          code: recordItem.canonicalCode,
          entityType: 'STAFF',
          targetTab: 'staff',
          recordIdOrNumber: recordItem.rawRecord?.id,
        });
        break;
      case 'PLAN_PROGRESS':
      case 'PLAN_MILESTONE':
      case 'PLAN_EVIDENCE':
        setCurrentTab('committee');
        setScannedActionIntent({
          raw: recordItem.canonicalCode,
          type: 'RECORD',
          code: recordItem.canonicalCode,
          entityType: 'ACTION_PLAN',
          targetTab: 'committee',
          targetSubTab: 'resolutions',
          recordIdOrNumber: recordItem.rawRecord?.id,
        });
        break;
      case 'BOX_COLLECT':
      case 'BOX_HISTORY':
        setCurrentTab('donations');
        setScannedActionIntent({
          raw: recordItem.canonicalCode,
          type: 'RECORD',
          code: recordItem.canonicalCode,
          entityType: 'DONATION_BOX',
          targetTab: 'donations',
          recordIdOrNumber: recordItem.rawRecord?.id,
        });
        break;
      case 'CEMETERY_DETAILS':
      case 'CEMETERY_CERTIFICATE':
        setCurrentTab('cemetery');
        setScannedActionIntent({
          raw: recordItem.canonicalCode,
          type: 'RECORD',
          code: recordItem.canonicalCode,
          entityType: 'CEMETERY',
          targetTab: 'cemetery',
          recordIdOrNumber: recordItem.rawRecord?.id,
        });
        break;
      default:
        if (recordItem.targetTab) {
          setCurrentTab(recordItem.targetTab);
        }
        break;
    }
  };

  // Handlers for Data Mutations
  const handleLogin = async (phoneOrEmail: string, pass: string, mosqueId?: string) => {
    try {
      const res = await api.login({ identifier: phoneOrEmail, password: pass, mosqueId });
      if (res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        await loadData(true);
      }
    } catch (err: any) {
      throw new Error(err.message || 'লগইন ব্যর্থ হয়েছে। সঠিক তথ্য প্রদান করুন।');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleAddIncome = async (data: any, options?: { print?: boolean; format?: PrintFormat }) => {
    const created = await api.createIncome(data);
    await loadData(false);
    if (options?.print !== false) {
      setActiveVoucher({
        item: created,
        type: 'INCOME',
        format: options?.format || 'POS_80',
        isReprint: false,
      });
    }
    return created;
  };

  const handleUpdateIncome = async (id: string, data: any) => {
    await api.updateIncome(id, data);
    await loadData(false);
  };

  const handleAddExpense = async (data: any, options?: { print?: boolean; format?: PrintFormat }) => {
    const created = await api.createExpense(data);
    await loadData(false);
    if (options?.print !== false) {
      setActiveVoucher({
        item: created,
        type: 'EXPENSE',
        format: options?.format || 'POS_80',
        isReprint: false,
      });
    }
    return created;
  };

  const handleUpdateExpense = async (id: string, data: any) => {
    await api.updateExpense(id, data);
    await loadData(false);
  };

  const handleReverseIncome = async (id: string, reason: string) => {
    await api.reverseIncome(id, reason);
    await loadData(false);
  };

  const handleReverseExpense = async (id: string, reason: string) => {
    await api.reverseExpense(id, reason);
    await loadData(false);
  };

  const handleAddDonation = async (data: any) => {
    const created = await api.createDonation(data);
    await loadData(false);
    return created;
  };

  const handleCollectBox = async (data: any) => {
    await api.createDonationBoxCollection(data);
    await loadData(false);
  };

  const handleAddDonationBox = async (data: any) => {
    await api.createDonationBox(data);
    await loadData(false);
  };

  const handleUpdateDonationBox = async (id: string, data: any) => {
    await api.updateDonationBox(id, data);
    await loadData(false);
  };

  const handleAddAccount = async (data: any) => {
    await api.createAccount(data);
    await loadData(false);
  };

  const handleUpdateAccount = async (id: string, data: Partial<FinancialAccount>) => {
    await api.updateAccount(id, data);
    await loadData(false);
  };

  const handleUpdateOpeningBalance = async (data: AccountOpeningBalancePayload) => {
    await api.updateOpeningBalance(data);
    await loadData(false);
  };

  const handleAddAccountHead = async (data: any) => {
    await api.createAccountHead(data);
    await loadData(false);
  };

  const handleTransferFund = async (data: any) => {
    await api.transferFund(data);
    await loadData(false);
  };

  const handleAddCommitteeTerm = async (data: any) => {
    await api.createCommitteeTerm(data);
    await loadData(false);
  };

  const handleUpdateCommitteeTerm = async (id: string, data: any) => {
    await api.updateCommitteeTerm(id, data);
    await loadData(false);
  };

  const handleDeleteCommitteeTerm = async (id: string) => {
    await api.deleteCommitteeTerm(id);
    await loadData(false);
  };

  const handleAddCommitteeMember = async (data: any) => {
    await api.createCommitteeMember(data);
    await loadData(false);
  };

  const handleUpdateCommitteeMember = async (id: string, data: any) => {
    await api.updateCommitteeMember(id, data);
    await loadData(false);
  };

  const handleDeleteCommitteeMember = async (id: string) => {
    await api.deleteCommitteeMember(id);
    await loadData(false);
  };

  const handleAddCommitteeMeeting = async (data: any) => {
    await api.createCommitteeMeeting(data);
    await loadData(false);
  };

  const handleUpdateCommitteeMeeting = async (id: string, data: any) => {
    await api.updateCommitteeMeeting(id, data);
    await loadData(false);
  };

  const handleDeleteCommitteeMeeting = async (id: string) => {
    await api.deleteCommitteeMeeting(id);
    await loadData(false);
  };

  const handleLogMeetingAudit = async (id: string, action: string, details: string) => {
    await api.logMeetingAudit(id, action, details);
    await loadData(false);
  };

  const handleAddCommitteeNotice = async (data: any) => {
    await api.createCommitteeNotice(data);
    await loadData(false);
  };

  const handleDeleteCommitteeNotice = async (id: string) => {
    await api.deleteCommitteeNotice(id);
    await loadData(false);
  };

  const handleAddCommitteeResolution = async (data: any) => {
    await api.createCommitteeResolution(data);
    await loadData(false);
  };

  const handleUpdateCommitteeResolution = async (id: string, data: any) => {
    await api.updateCommitteeResolution(id, data);
    await loadData(false);
  };

  const handleUpdateCommitteeResolutionProgress = async (id: string, data: any) => {
    await api.updateCommitteeResolutionProgress(id, data);
    await loadData(false);
  };

  const handleDeleteCommitteeResolution = async (id: string, force?: boolean) => {
    await api.deleteCommitteeResolution(id, force);
    await loadData(false);
  };

  const handleDuplicateCommitteeResolution = async (id: string) => {
    await api.duplicateCommitteeResolution(id);
    await loadData(false);
  };

  const handleAddSubCommittee = async (data: any) => {
    await api.createSubCommittee(data);
    await loadData(false);
  };

  const handleUpdateSubCommittee = async (id: string, data: any) => {
    await api.updateSubCommittee(id, data);
    await loadData(false);
  };

  const handleArchiveSubCommittee = async (id: string) => {
    await api.archiveSubCommittee(id);
    await loadData(false);
  };

  const handleAddStaff = async (data: any) => {
    await api.createStaff(data);
    await loadData(false);
  };

  const handleUpdateStaff = async (id: string, data: any) => {
    await api.updateStaff(id, data);
    await loadData(false);
  };

  const handleDeleteStaff = async (id: string) => {
    await api.deleteStaff(id);
    await loadData(false);
  };

  const handlePayStaff = async (data: any) => {
    await api.payStaffSalary(data);
    await loadData(false);
  };

  const handleReviseStaffSalary = async (id: string, data: any) => {
    await api.reviseStaffSalary(id, data);
    await loadData(false);
  };

  const handleDisburseFestivalAllowance = async (data: any) => {
    await api.disburseFestivalAllowance(data);
    await loadData(false);
  };

  const handleUpdateStaffPayment = async (id: string, data: any) => {
    await api.updateStaffPayment(id, data);
    await loadData(false);
  };

  const handleCancelStaffPayment = async (id: string, reason?: string) => {
    await api.cancelStaffPayment(id, reason);
    await loadData(false);
  };

  const handleAddCemetery = async (data: any) => {
    await api.createCemeteryRecord(data);
    await loadData(false);
  };

  const handleUpdateCemetery = async (id: string, data: any) => {
    await api.updateCemeteryRecord(id, data);
    await loadData(false);
  };

  const handleArchiveCemetery = async (id: string, isArchived: boolean, reason?: string) => {
    await api.archiveCemeteryRecord(id, isArchived, reason);
    await loadData(false);
  };

  const handleDeleteCemetery = async (id: string) => {
    await api.deleteCemeteryRecord(id);
    await loadData(false);
  };

  const handleAddNotice = async (data: any) => {
    await api.createNotice(data);
    await loadData(false);
  };

  const handleAddAsset = async (data: any) => {
    await api.createAsset(data);
    await loadData(false);
  };

  const handleUpdateAsset = async (id: string, data: any) => {
    await api.updateAsset(id, data);
    await loadData(false);
  };

  const handleDeleteAsset = async (id: string, force?: boolean) => {
    await api.deleteAsset(id, force);
    await loadData(false);
  };

  const handleArchiveAsset = async (id: string, isArchived: boolean, reason?: string) => {
    await api.archiveAsset(id, isArchived, reason);
    await loadData(false);
  };

  const handleAddAssetService = async (id: string, data: any) => {
    await api.addAssetServiceRecord(id, data);
    await loadData(false);
  };

  const handleClearDemoAssets = async () => {
    const res = await api.clearDemoAssets();
    await loadData(false);
    return res;
  };

  const handleAddProperty = async (data: any) => {
    await api.createProperty(data);
    await loadData(false);
  };

  const handleUpdateProperty = async (id: string, data: any) => {
    await api.updateProperty(id, data);
    await loadData(false);
  };

  const handleArchiveProperty = async (id: string, isArchived: boolean) => {
    await api.archiveProperty(id, isArchived);
    await loadData(false);
  };

  const handleDeleteProperty = async (id: string, force?: boolean) => {
    await api.deleteProperty(id, force);
    await loadData(false);
  };

  const handleAddPropertyTenant = async (propertyId: string, data: any) => {
    await api.addPropertyTenant(propertyId, data);
    await loadData(false);
  };

  const handleTerminatePropertyTenant = async (propertyId: string, tenantId: string) => {
    await api.terminatePropertyTenant(propertyId, tenantId);
    await loadData(false);
  };

  const handleAddPropertyInspection = async (propertyId: string, data: any) => {
    await api.addPropertyInspection(propertyId, data);
    await loadData(false);
  };

  const handleAddPropertyLegalCase = async (propertyId: string, data: any) => {
    await api.addPropertyLegalCase(propertyId, data);
    await loadData(false);
  };

  const handleAddUser = async (data: any) => {
    await api.createUser(data);
    await loadData(false);
  };

  const handleUpdateUser = async (id: string, data: any) => {
    await api.updateUser(id, data);
    await loadData(false);
  };

  const handleUpdateUserStatus = async (id: string, status: UserStatus) => {
    await api.updateUserStatus(id, status);
    await loadData(false);
  };

  const handleResetUserPassword = async (id: string, newPass: string) => {
    await api.resetUserPassword(id, newPass);
    await loadData(false);
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    await loadData(false);
  };

  const handleSendSms = async (phone: string, message: string, tokenUrl?: string) => {
    return await api.sendSms(phone, message, tokenUrl);
  };

  const handleSaveMosqueSettings = async (data: Partial<Mosque>) => {
    const updated = await api.updateMosqueSettings(data);
    setMosque(updated);
    await loadData(false);
  };

  // AI Advisor query execution
  const handleAskAi = async (customPrompt?: string) => {
    const query = customPrompt || aiQuestion;
    if (!query.trim()) return;

    setIsAiLoading(true);
    try {
      const res = await api.askAi(query, language);
      if (res.success && res.data) {
        setAiAnswer(res.data.answer);
      } else {
        setAiAnswer(res.error?.message || 'বিশ্লেষণ সম্পন্ন করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setAiAnswer(err.message || 'সার্ভার যোগাযোগে ত্রুটি হয়েছে।');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <div className="text-sm font-semibold text-slate-200">মসজিদলেজার সিস্টেম প্রস্তুত হচ্ছে...</div>
      </div>
    );
  }

  // If not authenticated and not explicitly viewing public portal, show login screen
  if (!isAuthenticated && currentTab !== 'publicPortal') {
    return (
      <AdminLoginScreen
        mosques={allMosques}
        currentMosque={mosque}
        onLogin={handleLogin}
        language={language}
        onLanguageChange={setLanguage}
      />
    );
  }

  // Render Inner Content by active tab
  const renderMainContent = () => (
    <>
      {errorMessage && (
        <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="flex items-center space-x-1.5 font-bold text-rose-900 hover:underline bg-white px-2.5 py-1 rounded-md border border-rose-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>পুনরায় চেষ্টা করুন</span>
          </button>
        </div>
      )}

      {/* 1. Dashboard View */}
      {currentTab === 'dashboard' && (
        <DashboardView
          stats={dashboardStats}
          mosque={mosque}
          currentMosque={mosque}
          accounts={accounts}
          incomes={incomes}
          expenses={expenses}
          donations={donations}
          donationBoxes={donationBoxes}
          notices={notices}
          language={language}
          onNavigate={(tab) => setCurrentTab(tab)}
          onQuickAction={(act) => {
            if (act === 'income') setCurrentTab('income');
            else if (act === 'expense') setCurrentTab('expense');
            else if (act === 'donation') setCurrentTab('donations');
          }}
          onOpenAi={() => setIsAiOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenActionQrHub={() => setIsActionCardHubOpen(true)}
          onRefresh={() => loadData(false)}
        />
      )}

      {/* 2. Income & Expenses Ledger View */}
      {(currentTab === 'income' || currentTab === 'expense') && (
        <IncomeExpenseView
          initialTab={currentTab === 'expense' ? 'expense' : 'income'}
          incomes={incomes}
          expenses={expenses}
          accountHeads={accountHeads}
          accounts={accounts}
          currentUser={currentUser}
          currentMosque={mosque}
          language={language}
          scannedActionIntent={scannedActionIntent}
          onClearScannedAction={() => setScannedActionIntent(null)}
          onAddIncome={handleAddIncome}
          onAddExpense={handleAddExpense}
          onUpdateIncome={handleUpdateIncome}
          onUpdateExpense={handleUpdateExpense}
          onReverseIncome={handleReverseIncome}
          onReverseExpense={handleReverseExpense}
          onPrintVoucher={(item, type, format = 'POS_80', isReprint = true) =>
            setActiveVoucher({ item, type, format, isReprint })
          }
          onSendSms={handleSendSms}
        />
      )}

      {/* 3. Daily Transactions View */}
      {currentTab === 'dailyLedger' && (
        <DailyTransactionsView
          incomes={incomes}
          expenses={expenses}
          accounts={accounts}
          currentMosque={mosque}
          currentUser={currentUser}
          language={language}
          onUpdateOpeningBalance={handleUpdateOpeningBalance}
        />
      )}

      {/* 4. Donations & Donation Boxes View */}
      {(currentTab === 'donations' || currentTab === 'donationBox') && (
        <DonationView
          donations={donations}
          donationBoxes={donationBoxes}
          boxCollections={boxCollections}
          accounts={accounts}
          accountHeads={accountHeads}
          currentMosque={mosque}
          language={language}
          scannedActionIntent={scannedActionIntent}
          onClearScannedAction={() => setScannedActionIntent(null)}
          onAddDonation={handleAddDonation}
          onCollectBox={handleCollectBox}
          onAddBox={handleAddDonationBox}
          onUpdateBox={handleUpdateDonationBox}
          onPrintReceipt={(don, format = 'POS_80', isReprint = true) =>
            setActiveDonationReceipt({ donation: don, format, isReprint })
          }
          onSendSms={handleSendSms}
        />
      )}

      {/* 5. Cashbook, Bank Accounts, Opening Balance & Account Heads View */}
      {(currentTab === 'accounts' ||
        currentTab === 'cashbook' ||
        currentTab === 'bank' ||
        currentTab === 'openingBalance' ||
        currentTab === 'accountHeads') && (
        <CashBankView
          accounts={accounts}
          accountHeads={accountHeads}
          incomes={incomes}
          expenses={expenses}
          currentMosque={mosque}
          language={language}
          scannedActionIntent={scannedActionIntent}
          onClearScannedAction={() => setScannedActionIntent(null)}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onUpdateOpeningBalance={handleUpdateOpeningBalance}
          onAddAccountHead={handleAddAccountHead}
          onTransferFund={handleTransferFund}
        />
      )}

      {/* 6. Committee & Meeting Resolutions View */}
      {(currentTab === 'committee' || currentTab === 'meetings') && (
        <CommitteeView
          terms={terms}
          members={members}
          meetings={meetings}
          notices={committeeNotices}
          resolutions={resolutions}
          language={language}
          mosque={mosque}
          currentUser={currentUser}
          scannedActionIntent={scannedActionIntent}
          onClearScannedAction={() => setScannedActionIntent(null)}
          onRefreshMosqueSettings={async () => {
            await loadData(false);
          }}
          onAddTerm={handleAddCommitteeTerm}
          onUpdateTerm={handleUpdateCommitteeTerm}
          onDeleteTerm={handleDeleteCommitteeTerm}
          onAddMember={handleAddCommitteeMember}
          onUpdateMember={handleUpdateCommitteeMember}
          onDeleteMember={handleDeleteCommitteeMember}
          onAddMeeting={handleAddCommitteeMeeting}
          onUpdateMeeting={handleUpdateCommitteeMeeting}
          onDeleteMeeting={handleDeleteCommitteeMeeting}
          onLogMeetingAudit={handleLogMeetingAudit}
          onAddNotice={handleAddCommitteeNotice}
          onDeleteNotice={handleDeleteCommitteeNotice}
          onAddResolution={handleAddCommitteeResolution}
          onUpdateResolution={handleUpdateCommitteeResolution}
          onUpdateResolutionProgress={handleUpdateCommitteeResolutionProgress}
          onDeleteResolution={handleDeleteCommitteeResolution}
          onDuplicateResolution={handleDuplicateCommitteeResolution}
          subCommittees={subCommittees}
          onAddSubCommittee={handleAddSubCommittee}
          onUpdateSubCommittee={handleUpdateSubCommittee}
          onArchiveSubCommittee={handleArchiveSubCommittee}
        />
      )}

      {/* 7. Staff, Assets, Waqf Property & Cemetery View */}
      {(currentTab === 'staff' ||
        currentTab === 'assets' ||
        currentTab === 'property' ||
        currentTab === 'cemetery' ||
        currentTab === 'notices') && (
        <ManagementView
          initialTab={currentTab as any}
          staff={staff}
          staffPayments={staffPayments}
          assets={assets}
          properties={properties}
          cemetery={cemetery}
          notices={notices}
          accounts={accounts}
          accountHeads={accountHeads}
          committeeTerms={terms}
          expenseEntries={expenses}
          currentMosque={mosque}
          language={language}
          scannedActionIntent={scannedActionIntent}
          onClearScannedAction={() => setScannedActionIntent(null)}
          onAddStaff={handleAddStaff}
          onUpdateStaff={handleUpdateStaff}
          onDeleteStaff={handleDeleteStaff}
          onPayStaff={handlePayStaff}
          onReviseStaffSalary={handleReviseStaffSalary}
          onDisburseFestivalAllowance={handleDisburseFestivalAllowance}
          onUpdateStaffPayment={handleUpdateStaffPayment}
          onCancelStaffPayment={handleCancelStaffPayment}
          onAddAsset={handleAddAsset}
          onUpdateAsset={handleUpdateAsset}
          onDeleteAsset={handleDeleteAsset}
          onArchiveAsset={handleArchiveAsset}
          onAddAssetService={handleAddAssetService}
          onClearDemoAssets={handleClearDemoAssets}
          onAddProperty={handleAddProperty}
          onUpdateProperty={handleUpdateProperty}
          onDeleteProperty={handleDeleteProperty}
          onArchiveProperty={handleArchiveProperty}
          onAddPropertyTenant={handleAddPropertyTenant}
          onTerminatePropertyTenant={handleTerminatePropertyTenant}
          onAddPropertyInspection={handleAddPropertyInspection}
          onAddPropertyLegalCase={handleAddPropertyLegalCase}
          onAddCemeteryRecord={handleAddCemetery}
          onUpdateCemeteryRecord={handleUpdateCemetery}
          onArchiveCemeteryRecord={handleArchiveCemetery}
          onDeleteCemeteryRecord={handleDeleteCemetery}
          onAddNotice={handleAddNotice}
        />
      )}

      {/* 8. User Management View */}
      {currentTab === 'users' && (
        <UserManagementView
          users={allUsers}
          currentMosque={mosque}
          currentUser={currentUser}
          language={language}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onUpdateStatus={handleUpdateUserStatus}
          onResetPassword={handleResetUserPassword}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* 9. Comprehensive Report Center View */}
      {currentTab === 'reports' && (
        <ReportCenterView
          incomes={incomes}
          expenses={expenses}
          accounts={accounts}
          accountHeads={accountHeads}
          donationBoxes={donationBoxes}
          boxCollections={boxCollections}
          staffList={staff}
          staffPayments={staffPayments}
          assets={assets}
          properties={properties}
          cemeteryRecords={cemetery}
          committeeMembers={members}
          meetings={meetings}
          notices={notices}
          auditLogs={auditLogs}
          currentMosque={mosque}
          savedConfigs={savedReportConfigs}
          onSaveReportConfig={async (cfg) => {
            const newConfig: SavedReportConfig = {
              ...cfg,
              id: `cfg-${Date.now()}`,
              createdAt: new Date().toISOString(),
            };
            setSavedReportConfigs((prev) => [...prev, newConfig]);
          }}
          onDeleteReportConfig={async (id) => {
            setSavedReportConfigs((prev) => prev.filter((c) => c.id !== id));
          }}
          language={language}
        />
      )}

      {/* 10. Mosque Settings View (Dedicated Configuration Page) */}
      {(currentTab === 'admin' || currentTab === 'settings' || currentTab === 'publicPortalSettings') && (
        <MosqueSettingsView
          currentMosque={mosque}
          currentUser={currentUser}
          language={language}
          onSaveSettings={handleSaveMosqueSettings}
          onOpenLivePortal={() => setCurrentTab('publicPortal')}
        />
      )}

      {/* 11. Audit Log Trail View (Dedicated Immutable Audit Page) */}
      {currentTab === 'audit' && (
        <AuditLogView
          logs={auditLogs}
          currentMosque={mosque}
          currentUser={currentUser}
          language={language}
          onRefresh={() => loadData(false)}
        />
      )}

      {/* 12. QR Management View */}
      {currentTab === 'qrManagement' && (
        <QRManagementView
          currentMosque={mosque}
          currentUser={currentUser}
          language={language}
        />
      )}

      {/* 13. Public Portal View */}
      {(currentTab === 'public' || currentTab === 'publicPortal') && (
        <PublicPortalView
          mosque={mosque}
          accounts={accounts}
          notices={notices}
          language={language}
          onDonate={handleAddDonation}
          onPrintReceipt={(don) => setActiveDonationReceipt({ donation: don, format: 'POS_80', isReprint: false })}
          onNavigateToLogin={() => setCurrentTab('dashboard')}
        />
      )}
    </>
  );

  const isSingleInvoicePrintActive = Boolean(activeDonationReceipt || activeVoucher.item);

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900 ${
      isSingleInvoicePrintActive ? 'print:bg-white print:min-h-0 print:h-auto' : ''
    }`}>
      {/* Top Application Navbar & Main App Shell */}
      <div className={isSingleInvoicePrintActive ? 'app-shell-hidden-for-print print:hidden' : 'contents'}>
        <Navbar
          currentMosque={mosque}
          mosque={mosque}
          currentUser={currentUser}
          allMosques={allMosques}
          language={language}
          onLanguageChange={setLanguage}
          onLanguageToggle={() => setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'))}
          onRoleChange={(role) => setCurrentUser((prev) => (prev ? { ...prev, role } : null))}
          onNavigate={(tab) => setCurrentTab(tab)}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenAi={() => setIsAiOpen(true)}
          onOpenCalculator={() => setIsGlobalCalculatorOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenActionQrHub={() => setIsActionCardHubOpen(true)}
          onLogout={handleLogout}
          onQuickAction={(act) => {
            if (act === 'income') setCurrentTab('income');
            else if (act === 'expense') setCurrentTab('expense');
            else if (act === 'donation') setCurrentTab('donations');
          }}
        />

        {/* Main Container Layout */}
        {viewMode === 'mobile' ? (
          /* Native Android Phone Simulation Frame */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-900/90">
            <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border-[10px] border-slate-800 overflow-hidden flex flex-col h-[840px] relative">
              {/* Android Notch / Camera Pin */}
              <div className="h-7 bg-slate-900 text-white text-[11px] px-6 flex items-center justify-between font-mono shrink-0 select-none">
                <span>9:41</span>
                <div className="w-16 h-3.5 bg-black rounded-full mx-auto" />
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Mobile Header Bar */}
              <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-blue-200" />
                  <span className="font-heading font-bold text-sm">
                    {mosque?.nameBn || 'মসজিদলেজার'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('desktop')}
                  className="text-[10px] bg-blue-800 hover:bg-blue-900 text-blue-100 px-2 py-1 rounded font-medium border border-blue-600 cursor-pointer"
                >
                  ডেস্কটপ ভিউ
                </button>
              </div>

              {/* Mobile Scrollable Viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {renderMainContent()}
              </div>

              {/* Mobile Bottom Navigation Bar with Prominent Center SCAN Button */}
              <div className="h-16 bg-white border-t border-slate-200 grid grid-cols-5 items-center shrink-0 px-1 select-none shadow-lg">
                <button
                  type="button"
                  onClick={() => setCurrentTab('dashboard')}
                  className={`flex flex-col items-center justify-center text-[10px] font-semibold py-1 cursor-pointer font-siliguri ${
                    currentTab === 'dashboard' ? 'text-blue-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 mb-0.5" />
                  <span>সারসংক্ষেপ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('income')}
                  className={`flex flex-col items-center justify-center text-[10px] font-semibold py-1 cursor-pointer font-siliguri ${
                    currentTab === 'income' || currentTab === 'expense' ? 'text-blue-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  <Receipt className="w-4 h-4 mb-0.5" />
                  <span>আয়-ব্যয়</span>
                </button>
                
                {/* Central Prominent SCAN Button */}
                <button
                  type="button"
                  id="mobile-bottom-nav-scan-btn"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex flex-col items-center justify-center -mt-5 cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-all border-3 border-white">
                    <Camera className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 mt-0.5 font-siliguri">স্ক্যান</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab('donations')}
                  className={`flex flex-col items-center justify-center text-[10px] font-semibold py-1 cursor-pointer font-siliguri ${
                    currentTab === 'donations' ? 'text-blue-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 mb-0.5" />
                  <span>দান</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('reports')}
                  className={`flex flex-col items-center justify-center text-[10px] font-semibold py-1 cursor-pointer font-siliguri ${
                    currentTab === 'reports' ? 'text-blue-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  <FileText className="w-4 h-4 mb-0.5" />
                  <span>রিপোর্ট</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Responsive Desktop / Tablet Layout */
          <div className="flex flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
            {/* Left Navigation Sidebar */}
            <Sidebar
              activeTab={currentTab as NavTab}
              onSelectTab={(tab) => setCurrentTab(tab)}
              onTabChange={(tab) => setCurrentTab(tab)}
              onOpenCalculator={() => setIsGlobalCalculatorOpen(true)}
              onOpenScanner={() => setIsScannerOpen(true)}
              onOpenActionQrHub={() => setIsActionCardHubOpen(true)}
              language={language}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              currentUser={currentUser}
            />

            {/* Content Display Area */}
            <main className="flex-1 min-w-0">{renderMainContent()}</main>
          </div>
        )}
      </div>

      {/* AI Financial Auditor & Advisor Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in print:hidden">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base">
                    {language === 'bn' ? 'মসজিদলেজার এআই আর্থিক অডিটর' : 'MasjidLedger AI Financial Auditor'}
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    {language === 'bn'
                      ? 'বাস্তব সময়ে আয়-ব্যয় বিশ্লেষণ, বাজেট মূল্যায়ন ও আর্থিক সারসংক্ষেপ'
                      : 'Real-time ledger audit, budget evaluation and executive financial summaries'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Preset Quick Prompts */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  {language === 'bn' ? 'দ্রুত অডিট প্রশ্নাবলী:' : 'Quick Audit Questions:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    language === 'bn'
                      ? 'বর্তমান চলতি মাসের আয়-ব্যয় এবং নিট উদ্বৃত্ত কত?'
                      : 'What is the current month income, expense and net surplus?',
                    language === 'bn'
                      ? 'কোন খাতে সবচেয়ে বেশি ব্যয় হয়েছে এবং স্টাফ বেতন আপডেট দিন'
                      : 'Which category has highest expenses and staff salary status?',
                    language === 'bn'
                      ? 'গত মাসের তুলনায় দানের প্রবৃদ্ধি এবং দানবাক্স কালেকশন বিশ্লেষণ'
                      : 'Compare donation growth and donation box collection trends',
                    language === 'bn'
                      ? 'কমিটির জন্য পূর্ণাঙ্গ নিরীক্ষা ও আর্থিক সারসংক্ষেপ প্রতিবেদন'
                      : 'Generate complete executive audit summary for committee',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAiQuestion(preset);
                        handleAskAi(preset);
                      }}
                      className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs text-slate-700 transition-colors flex items-start space-x-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {language === 'bn' ? 'আপনার নির্দিষ্ট প্রশ্ন লিখুন:' : 'Ask custom question:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAskAi();
                    }}
                    placeholder={
                      language === 'bn'
                        ? 'যেমন: গত ৬ মাসের সাধারণ অনুদান ও নির্মাণ খাতের হিসাব দিন...'
                        : 'e.g. Give analysis of general donations vs construction expenses...'
                    }
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAskAi()}
                    disabled={isAiLoading || !aiQuestion.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    {isAiLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{language === 'bn' ? 'বিশ্লেষণ করুন' : 'Ask'}</span>
                  </button>
                </div>
              </div>

              {/* AI Response output */}
              {isAiLoading && (
                <div className="p-6 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-blue-800">
                    {language === 'bn'
                      ? 'এআই লেজার ডাটা বিশ্লেষণ করছে...'
                      : 'AI is analyzing financial ledger records...'}
                  </p>
                </div>
              )}

              {aiAnswer && !isAiLoading && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-800 leading-relaxed font-body whitespace-pre-wrap">
                  <div className="flex items-center space-x-1.5 text-blue-700 font-bold font-heading text-sm pb-1 border-b border-slate-200">
                    <Bot className="w-4 h-4" />
                    <span>{language === 'bn' ? 'এআই নিরীক্ষা প্রতিবেদন:' : 'AI Audit Summary:'}</span>
                  </div>
                  <div className="pt-1">{aiAnswer}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Money Receipt Modal (A4 & POS Thermal) */}
      <MoneyReceiptModal
        isOpen={!!activeDonationReceipt?.donation}
        onClose={() => setActiveDonationReceipt(null)}
        donation={activeDonationReceipt?.donation || null}
        mosque={mosque}
        language={language}
        initialFormat={activeDonationReceipt?.format || 'POS_80'}
        isReprint={activeDonationReceipt?.isReprint ?? false}
        autoPrint={activeDonationReceipt?.autoPrint ?? false}
      />

      {/* Official Debit/Credit Voucher Modal (A4 & POS Thermal) */}
      <VoucherModal
        isOpen={!!activeVoucher.item}
        onClose={() => setActiveVoucher({ item: null, type: 'INCOME' })}
        item={activeVoucher.item}
        type={activeVoucher.type}
        mosque={mosque}
        language={language}
        initialFormat={activeVoucher.format || 'POS_80'}
        isReprint={activeVoucher.isReprint ?? false}
        autoPrint={activeVoucher.autoPrint ?? false}
      />

      {/* Floating Action Buttons: QR Scanner and Denomination Counter */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col sm:flex-row items-end sm:items-center space-y-2.5 sm:space-y-0 sm:space-x-3 print:hidden">
        {/* Floating Quick QR Scanner Button */}
        <button
          id="btn-floating-qr-scanner"
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white p-3.5 sm:px-4 sm:py-3 rounded-full sm:rounded-2xl shadow-xl hover:shadow-2xl border-2 border-white/40 flex items-center space-x-2 transition-all transform hover:scale-105 active:scale-95 group cursor-pointer"
          title="QR ও বারকোড স্ক্যানার (Alt+Q)"
        >
          <QrCode className="w-5 h-5 text-blue-200 group-hover:rotate-12 transition-transform" />
          <span className="font-siliguri font-bold text-xs hidden sm:inline">
            {language === 'bn' ? 'QR স্ক্যানার' : 'QR Scanner'}
          </span>
          <span className="hidden sm:inline text-[10px] bg-white/20 text-blue-100 px-1.5 py-0.5 rounded font-mono font-bold">
            Alt+Q
          </span>
        </button>

        {/* Floating Quick Denomination Counter Action Button */}
        <button
          id="btn-floating-calculator"
          type="button"
          onClick={() => setIsGlobalCalculatorOpen(true)}
          className="bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white p-3.5 sm:px-4 sm:py-3 rounded-full sm:rounded-2xl shadow-xl hover:shadow-2xl border-2 border-white/40 flex items-center space-x-2 transition-all transform hover:scale-105 active:scale-95 group cursor-pointer"
          title="ভাংতি টাকা ও ক্যাশ নোট গণনা (Alt+C)"
        >
          <Banknote className="w-5 h-5 text-emerald-200 group-hover:rotate-12 transition-transform" />
          <span className="font-siliguri font-bold text-xs hidden sm:inline">
            {language === 'bn' ? 'ভাংতি টাকা গণনা' : 'Cash Counter'}
          </span>
          <span className="hidden sm:inline text-[10px] bg-white/20 text-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">
            Alt+C
          </span>
        </button>
      </div>

      {/* Universal Calculator & Denomination Counter Modal */}
      <ChangeCalculatorModal
        isOpen={isGlobalCalculatorOpen}
        onClose={() => setIsGlobalCalculatorOpen(false)}
        language={language}
      />

      {/* Universal QR & Barcode Camera Scanner Modal */}
      <UniversalScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        currentUser={currentUser}
        currentMosque={mosque}
        language={language}
        onNavigateToTarget={handleScannerNavigate}
        onOpenActionCardHub={() => setIsActionCardHubOpen(true)}
        onOpenRecordAction={handleOpenRecordAction}
        resolveRecord={getResolvedRecord}
      />

      {/* Module Action QR Code Catalog & Printable Card Hub */}
      <QrActionCardsModal
        isOpen={isActionCardHubOpen}
        onClose={() => setIsActionCardHubOpen(false)}
        currentMosque={mosque}
        currentUser={currentUser}
        language={language}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Record Action Hub Modal (Identify -> View -> Act) */}
      <RecordActionModal
        isOpen={!!activeRecordAction}
        onClose={() => setActiveRecordAction(null)}
        recordItem={activeRecordAction}
        currentUser={currentUser}
        currentMosque={mosque}
        language={language}
        onExecuteAction={handleExecuteRecordAction}
        onOpenPrintLabel={handleOpenPrintLabel}
      />

      {/* Record QR & Barcode Label Sticker Print Hub */}
      <RecordPrintLabelModal
        isOpen={!!activePrintLabel}
        onClose={() => setActivePrintLabel(null)}
        recordItem={activePrintLabel}
        mosque={mosque}
      />
    </div>
  );
}

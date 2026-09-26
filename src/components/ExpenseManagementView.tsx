import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Printer,
  Receipt,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Calculator,
  Banknote,
  MessageSquare,
  Edit2,
  Calendar,
  X,
  Layers,
  TrendingDown,
  Scale,
  Eye,
  Wallet,
  Landmark,
  Building,
  Users,
  Download,
  ChevronRight,
  Menu,
  Lightbulb,
  Sparkles,
  Wrench,
  Hammer,
  ShoppingBag,
  Coins,
  PieChart,
} from 'lucide-react';
import {
  ExpenseEntry,
  IncomeEntry,
  AccountTransfer,
  AccountHead,
  FinancialAccount,
  PaymentMethod,
  Staff,
  MosqueAsset,
  MosqueProperty,
  User,
  Mosque,
} from '../types';
import {
  buildExpenseReconciliationDataset,
  ExpenseReconciliationDataset,
} from '../lib/expenseReconciliationService';
import { ExpenseReconciliationView } from './ExpenseReconciliationView';
import { BudgetControlView } from './BudgetControlView';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { EditTransactionModal } from './EditModals';
import { SmsPreviewModal } from './SmsPreviewModal';
import { UnifiedExpenseEntryModal, ExpenseEntryType } from './UnifiedExpenseEntryModal';
import { QrScanResult } from '../types/qrBarcodeTypes';
import {
  DateFilterState,
  getDefaultDateFilterState,
  resolveEffectiveDates,
} from '../lib/reportingEngine';
import {
  buildExpenseReportDataset,
  exportExpenseReportToExcel,
  ExpenseReportItem,
  ExpenseReportDataset,
  ExpenseReportViewType,
  MainHeadExpenseReportRow,
  SubHeadExpenseReportRow,
  MonthlyExpenseReportRow,
  AnnualExpenseReportRow,
  AccountExpenseReportRow,
  PaymentMethodExpenseReportRow,
  StaffExpenseReportRow,
  AssetExpenseReportRow,
  PropertyExpenseReportRow,
  ExpenseTypeReportRow,
  CrossDimensionExpenseAnalysisResult,
  DetailedExpenseAnalysisResult,
  getMainHeadExpenseReport,
  getSubHeadExpenseReport,
  getMonthlyExpenseReport,
  getAnnualExpenseReport,
  getAccountExpenseReport,
  getPaymentMethodExpenseReport,
  getStaffExpenseReport,
  getAssetExpenseReport,
  getPropertyExpenseReport,
  getExpenseTypeReport,
  getCrossDimensionExpenseAnalysis,
  getDetailedExpenseAnalysis,
} from '../lib/expenseReportingService';
import { ReportFilterBar } from './ReportFilterBar';
import { A4ReportPreviewModal, ReportColumn } from './A4ReportPreviewModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export type ExpenseSecondaryTab =
  | 'expense_overview'
  | 'new_expense'
  | 'salary'
  | 'utilities'
  | 'cleaning'
  | 'maintenance'
  | 'construction'
  | 'purchases'
  | 'register'
  | 'analytics'
  | 'reports'
  | 'reconciliation'
  | 'budget';

interface ExpenseManagementViewProps {
  initialTab?: ExpenseSecondaryTab;
  expenses: ExpenseEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  incomes?: IncomeEntry[];
  transfers?: AccountTransfer[];
  staff?: Staff[];
  assets?: MosqueAsset[];
  properties?: MosqueProperty[];
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  scannedActionIntent?: QrScanResult | null;
  onClearScannedAction?: () => void;
  onNavigateTab?: (tab: string) => void;
  onAddExpense: (data: any, options?: { print?: boolean; format?: 'A4' | 'POS_80' | 'POS_58' }) => Promise<any>;
  onUpdateExpense?: (id: string, data: any) => Promise<void>;
  onReverseExpense: (id: string, reason: string) => Promise<void>;
  onPrintVoucher: (
    item: ExpenseEntry,
    type: 'EXPENSE',
    format?: 'A4' | 'POS_80' | 'POS_58',
    isReprint?: boolean
  ) => void;
  onSendSms?: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

export const ExpenseManagementView: React.FC<ExpenseManagementViewProps> = ({
  initialTab = 'expense_overview',
  expenses,
  accountHeads,
  accounts,
  incomes = [],
  transfers = [],
  staff,
  assets,
  properties,
  currentUser,
  currentMosque,
  language = 'bn',
  scannedActionIntent,
  onClearScannedAction,
  onNavigateTab,
  onAddExpense,
  onUpdateExpense,
  onReverseExpense,
  onPrintVoucher,
  onSendSms,
}) => {
  const t = translations[language] || translations.bn;
  const [activeTab, setActiveTab] = useState<ExpenseSecondaryTab>(initialTab);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Unified Expense Entry Modal State
  const [isUnifiedExpenseModalOpen, setIsUnifiedExpenseModalOpen] = useState(false);
  const [unifiedExpenseType, setUnifiedExpenseType] = useState<ExpenseEntryType>('GENERAL_EXPENSE');
  const [unifiedMainHeadId, setUnifiedMainHeadId] = useState<string | undefined>();
  const [unifiedStaffId, setUnifiedStaffId] = useState<string | undefined>();
  const [unifiedAssetId, setUnifiedAssetId] = useState<string | undefined>();
  const [unifiedPropertyId, setUnifiedPropertyId] = useState<string | undefined>();

  const handleOpenUnifiedExpense = (
    type: ExpenseEntryType = 'GENERAL_EXPENSE',
    options?: {
      headId?: string;
      staffId?: string;
      assetId?: string;
      propertyId?: string;
    }
  ) => {
    setUnifiedExpenseType(type);
    setUnifiedMainHeadId(options?.headId);
    setUnifiedStaffId(options?.staffId);
    setUnifiedAssetId(options?.assetId);
    setUnifiedPropertyId(options?.propertyId);
    setIsUnifiedExpenseModalOpen(true);
  };

  // Sync initialTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle QR scanned actions
  useEffect(() => {
    if (!scannedActionIntent) return;
    if (scannedActionIntent.actionKey === 'ACT-EXP-NEW' || (scannedActionIntent.actionKey as string) === 'ACT_EXP_NEW') {
      setActiveTab('expense_overview');
      handleOpenUnifiedExpense('GENERAL_EXPENSE');
      onClearScannedAction?.();
    }
  }, [scannedActionIntent]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseEntry | null>(null);
  const [smsItem, setSmsItem] = useState<ExpenseEntry | null>(null);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<ExpenseEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Form State
  const expenseMainHeads = useMemo(
    () => accountHeads.filter((h) => h.type === 'EXPENSE' && !h.parentId),
    [accountHeads]
  );
  const [mainHeadId, setMainHeadId] = useState(expenseMainHeads[0]?.id || '');
  const [subHeadId, setSubHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [payeeName, setPayeeName] = useState('');
  const [payeePhone, setPayeePhone] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSubHeads = useMemo(
    () => accountHeads.filter((h) => h.parentId === mainHeadId),
    [accountHeads, mainHeadId]
  );

  const openCreateModal = (suggestedHeadId?: string) => {
    if (suggestedHeadId) {
      setMainHeadId(suggestedHeadId);
    } else {
      setMainHeadId(expenseMainHeads[0]?.id || '');
    }
    setSubHeadId('');
    setAmount('');
    setPaymentMethod('CASH');
    setAccountId(accounts[0]?.id || '');
    setPayeeName('');
    setPayeePhone('');
    setReference('');
    setDescription('');
    setAttachmentUrl('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e?: React.FormEvent, printVoucher: boolean = true) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');
    const num = Number(amount);
    if (!num || num <= 0) {
      setFormError(t.amountMustBePositive);
      return;
    }
    if (!mainHeadId) {
      setFormError(language === 'bn' ? 'প্রধান খাত নির্বাচন করুন।' : 'Select main head.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        mainHeadId,
        subHeadId,
        amount: num,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        payeeName,
        payeePhone,
        reference,
        description,
        attachmentUrl,
        date: entryDate,
      };

      const res = await onAddExpense(payload, { print: printVoucher, format: 'POS_80' });
      setIsCreateModalOpen(false);
      // Reset form fields
      setAmount('');
      setPayeeName('');
      setPayeePhone('');
      setReference('');
      setDescription('');
      if (printVoucher && res) {
        onPrintVoucher(res, 'EXPENSE', 'POS_80', false);
      }
    } catch (err: any) {
      setFormError(err.message || 'ব্যয় এন্ট্রি সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reversal handler
  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      alert('বাতিল বা রিভার্সালের কারণ উল্লেখ করা বাধ্যতামূলক');
      return;
    }
    try {
      await onReverseExpense(reversalTarget.id, reversalReason.trim());
      setReversalTarget(null);
      setReversalReason('');
    } catch (err: any) {
      alert(err.message || 'ভাউচার বাতিল করতে ব্যর্থ হয়েছে');
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);

    let totalExpenseAll = 0;
    let monthlyExpense = 0;
    let todayExpense = 0;
    let salaryExpense = 0;
    let utilityExpense = 0;
    let maintenanceExpense = 0;
    let constructionExpense = 0;

    expenses.forEach((exp) => {
      if (exp.status === 'CANCELLED') return;
      const d = exp.date ? exp.date.slice(0, 10) : '';
      const amt = Number(exp.amount) || 0;
      totalExpenseAll += amt;

      if (d === todayStr) {
        todayExpense += amt;
      }
      if (d.startsWith(currentMonthStr)) {
        monthlyExpense += amt;
      }

      const headName = (exp.mainHeadNameBn || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();

      if (headName.includes('বেতন') || headName.includes('সম্মানী') || desc.includes('বেতন')) {
        salaryExpense += amt;
      }
      if (
        headName.includes('বিদ্যুৎ') ||
        headName.includes('পানি') ||
        headName.includes('গ্যাস') ||
        headName.includes('ইউটিলিটি') ||
        desc.includes('বিদ্যুৎ') ||
        desc.includes('বিল')
      ) {
        utilityExpense += amt;
      }
      if (headName.includes('মেরামত') || headName.includes('রক্ষণাবেক্ষণ') || desc.includes('মেরামত')) {
        maintenanceExpense += amt;
      }
      if (headName.includes('নির্মাণ') || headName.includes('উন্নয়ন') || desc.includes('নির্মাণ')) {
        constructionExpense += amt;
      }
    });

    return {
      totalExpenseAll,
      monthlyExpense,
      todayExpense,
      salaryExpense,
      utilityExpense,
      maintenanceExpense,
      constructionExpense,
      totalCount: expenses.length,
    };
  }, [expenses]);

  // Specific category filtered slices
  const categoryFilters = useMemo(() => {
    const matchCategory = (keywords: string[]) => {
      return expenses.filter((e) => {
        const text = `${e.mainHeadNameBn} ${e.subHeadNameBn || ''} ${e.description || ''}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw));
      });
    };

    return {
      salaryList: matchCategory(['বেতন', 'সম্মানী', 'ইমাম', 'মুয়াজ্জিন', 'খাদেম']),
      utilitiesList: matchCategory(['বিদ্যুৎ', 'পানি', 'গ্যাস', 'বিল', 'ওয়াসা', 'মিটার']),
      cleaningList: matchCategory(['পরিষ্কার', 'ঝাড়ু', 'স্যাভলন', 'ফিনাইল', 'ক্লিনার', 'টয়লেট']),
      maintenanceList: matchCategory(['মেরামত', 'সার্ভিসিং', 'ইলেকট্রিক', 'প্লাম্বিং', 'রং', 'এসি']),
      constructionList: matchCategory(['নির্মাণ', 'টাইলস', 'সিমেন্ট', 'রড', 'উন্নয়ন', 'গম্বুজ', 'মিনার']),
      purchasesList: matchCategory(['ক্রয়', 'মাইক', 'ঘড়ি', 'ফ্যান', 'স্টেশনারি', 'ইফতার', 'মিলাদ']),
    };
  }, [expenses]);

  // ===================== REGISTER & REPORTING ENGINE (PHASE E5-A & E5-B) =====================
  const [reportFilterState, setReportFilterState] = useState<DateFilterState>(getDefaultDateFilterState());
  const [registerSearch, setRegisterSearch] = useState('');
  const [registerStatus, setRegisterStatus] = useState<'ALL' | 'APPROVED' | 'CANCELLED'>('ALL');
  const [registerHeadId, setRegisterHeadId] = useState('ALL');
  const [registerAccountId, setRegisterAccountId] = useState('ALL');
  const [registerExpenseType, setRegisterExpenseType] = useState<string>('ALL');
  const [registerPaymentMethod, setRegisterPaymentMethod] = useState<string>('ALL');
  const [registerSortBy, setRegisterSortBy] = useState<
    'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'VOUCHER_DESC' | 'HEAD_ASC' | 'PAYEE_ASC'
  >('DATE_DESC');

  // E5-C Internal Report Sub-navigation Tab (All 12 Reports + E5-D Reconciliation)
  const [reportSubTab, setReportSubTab] = useState<
    | 'register'
    | 'main_head'
    | 'sub_head'
    | 'monthly'
    | 'annual'
    | 'account'
    | 'payment_method'
    | 'staff'
    | 'asset'
    | 'property'
    | 'expense_type'
    | 'analysis'
    | 'reconciliation'
  >('register');

  // E5-C Dimension Drill-down Detail Modal State
  const [selectedDrillDownEntity, setSelectedDrillDownEntity] = useState<{
    dimensionTitle: string;
    entityName: string;
    entitySubtext?: string;
    totalAmount: number;
    count: number;
    items: ExpenseReportItem[];
  } | null>(null);

  // Unified Read-Only Reporting Dataset
  const expenseReportDataset = useMemo(() => {
    return buildExpenseReportDataset({
      expenses,
      currentMosqueId: currentMosque?.id,
      accounts,
      staffList: staff,
      assets,
      properties,
      filters: {
        dateFilter: reportFilterState,
        headFilter: registerHeadId,
        accountFilter: registerAccountId,
        expenseTypeFilter: registerExpenseType,
        paymentMethodFilter: registerPaymentMethod,
        statusFilter: registerStatus,
        searchQuery: registerSearch,
        sortBy: registerSortBy,
      },
    });
  }, [
    expenses,
    currentMosque?.id,
    accounts,
    staff,
    assets,
    properties,
    reportFilterState,
    registerHeadId,
    registerAccountId,
    registerExpenseType,
    registerPaymentMethod,
    registerStatus,
    registerSearch,
    registerSortBy,
  ]);

  const effectiveDates = expenseReportDataset.effectiveDates;
  const filteredReportItems = expenseReportDataset.items;
  const filteredReportSummary = expenseReportDataset.summary;
  const filteredExpenses = filteredReportItems.map((item) => item.rawEntry);
  const filteredTotalAmount = filteredReportSummary.totalApprovedAmount;

  // E5-B & E5-C Pure Grouped Calculations (Read-Only, Financial Delta = 0)
  const mainHeadReportData = useMemo(() => {
    return getMainHeadExpenseReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const subHeadReportData = useMemo(() => {
    return getSubHeadExpenseReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const monthlyReportData = useMemo(() => {
    return getMonthlyExpenseReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const annualReportData = useMemo(() => {
    return getAnnualExpenseReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const accountReportData = useMemo(() => {
    return getAccountExpenseReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const paymentMethodReportData = useMemo(() => {
    return getPaymentMethodExpenseReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const staffReportData = useMemo(() => {
    return getStaffExpenseReport(expenseReportDataset, staff);
  }, [expenseReportDataset, staff]);

  const assetReportData = useMemo(() => {
    return getAssetExpenseReport(expenseReportDataset, assets);
  }, [expenseReportDataset, assets]);

  const propertyReportData = useMemo(() => {
    return getPropertyExpenseReport(expenseReportDataset, properties);
  }, [expenseReportDataset, properties]);

  const expenseTypeReportData = useMemo(() => {
    return getExpenseTypeReport(expenseReportDataset);
  }, [expenseReportDataset]);

  const detailedAnalysisData = useMemo(() => {
    return getDetailedExpenseAnalysis(expenseReportDataset);
  }, [expenseReportDataset]);

  const crossAnalysisData = useMemo(() => {
    return getCrossDimensionExpenseAnalysis(
      expenseReportDataset,
      staff,
      assets,
      properties
    );
  }, [expenseReportDataset, staff, assets, properties]);

  // Phase E5-D: Expense ↔ Account ↔ Ledger Pure Reconciliation Dataset
  const expenseReconciliationDataset = useMemo(() => {
    return buildExpenseReconciliationDataset({
      expenseReportDataset,
      accounts,
      incomes,
      transfers,
      staffList: staff,
      assets,
      properties,
      currentMosqueId: currentMosque?.id || '',
    });
  }, [expenseReportDataset, accounts, incomes, transfers, staff, assets, properties, currentMosque?.id]);

  // Standardized Excel (.xlsx) Exporter supporting all 12 Views
  const handleExportCurrentReportExcel = useCallback(
    (viewTypeOverride?: ExpenseReportViewType) => {
      let targetType: ExpenseReportViewType = 'REGISTER';
      if (viewTypeOverride) {
        targetType = viewTypeOverride;
      } else if (activeTab === 'reports' || activeTab === 'register' || activeTab === 'analytics') {
        if (reportSubTab === 'main_head') targetType = 'MAIN_HEAD';
        else if (reportSubTab === 'sub_head') targetType = 'SUB_HEAD';
        else if (reportSubTab === 'monthly') targetType = 'MONTHLY';
        else if (reportSubTab === 'annual') targetType = 'ANNUAL';
        else if (reportSubTab === 'account') targetType = 'ACCOUNT';
        else if (reportSubTab === 'payment_method') targetType = 'PAYMENT_METHOD';
        else if (reportSubTab === 'staff') targetType = 'STAFF';
        else if (reportSubTab === 'asset') targetType = 'ASSET';
        else if (reportSubTab === 'property') targetType = 'PROPERTY';
        else if (reportSubTab === 'expense_type') targetType = 'EXPENSE_TYPE';
        else if (reportSubTab === 'analysis' || activeTab === 'analytics') targetType = 'ANALYSIS';
        else targetType = 'REGISTER';
      }
      exportExpenseReportToExcel(
        expenseReportDataset,
        currentMosque,
        targetType,
        staff,
        assets,
        properties
      );
    },
    [activeTab, reportSubTab, expenseReportDataset, currentMosque, staff, assets, properties]
  );

  const handleExportExcel = () => {
    handleExportCurrentReportExcel();
  };

  // Report Preview Columns Definition (Matching Screen, Print, and PDF exactly)
  const reportColumns: ReportColumn<ExpenseReportItem>[] = [
    {
      header: 'ভাউচার নং',
      className: 'font-mono font-bold text-slate-900',
      render: (e) => e.voucherNumber,
    },
    {
      header: 'তারিখ',
      className: 'font-mono text-slate-600',
      render: (e) => formatDate(e.date),
    },
    {
      header: 'ব্যয়ের খাত',
      className: 'font-medium text-slate-900',
      render: (e) => (
        <div>
          <div className="font-bold">{e.mainHeadNameBn}</div>
          {e.subHeadNameBn && <div className="text-[10px] text-slate-500">{e.subHeadNameBn}</div>}
        </div>
      ),
    },
    {
      header: 'বিবরণ',
      className: 'text-slate-700 max-w-xs',
      render: (e) => e.description || '-',
    },
    {
      header: 'প্রাপক / সুবিধাভোগী',
      className: 'text-slate-800 font-medium',
      render: (e) => (
        <div>
          <div>{e.payeeName}</div>
          {e.payeePhone && <div className="text-[10px] text-slate-500 font-mono">{e.payeePhone}</div>}
        </div>
      ),
    },
    {
      header: 'হিসাব / মাধ্যম',
      className: 'text-slate-600 text-[11px]',
      render: (e) => `${e.accountName} (${e.paymentMethodLabelBn})`,
    },
    {
      header: 'পরিমাণ (৳)',
      className: 'text-right font-mono font-bold text-rose-700',
      render: (e) => (
        <span className={e.status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>
          ৳ {Number(e.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'অবস্থা',
      className: 'text-center',
      render: (e) => (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
            e.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {e.statusLabelBn}
        </span>
      ),
    },
  ];

  // Dynamic A4 Report Modal Config Generator matching active report subtab
  const activeReportModalConfig = useMemo(() => {
    if (reportSubTab === 'main_head') {
      return {
        title: 'প্রধান খাতভিত্তিক ব্যয় প্রতিবেদন (Main Head-wise Expense Report)',
        subtitle: 'প্রধান হিসাব খাত অনুযায়ী ব্যয়ের তুলনামূলক বিবরণী',
        data: mainHeadReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'প্রধান ব্যয়ের খাত', className: 'font-bold text-slate-900', render: (r: MainHeadExpenseReportRow) => r.headNameBn },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: MainHeadExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: MainHeadExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: MainHeadExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট খাত সংখ্যা', value: `${mainHeadReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'নগদ (ক্যাশ) ব্যয়', value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}` },
          { label: 'ব্যাংক ও MFS ব্যয়', value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={2} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('MAIN_HEAD'),
      };
    }
    if (reportSubTab === 'sub_head') {
      return {
        title: 'উপ-খাতভিত্তিক ব্যয় প্রতিবেদন (Sub-Head-wise Expense Report)',
        subtitle: 'প্রধান ও উপ-খাত অনুযায়ী ব্যয়ের পুঙ্খানুপুঙ্খ বিবরণী',
        data: subHeadReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'প্রধান খাত', className: 'font-bold text-slate-900', render: (r: SubHeadExpenseReportRow) => r.mainHeadNameBn },
          { header: 'উপ-খাত (Sub-Head)', className: 'text-slate-800 font-medium', render: (r: SubHeadExpenseReportRow) => r.subHeadNameBn },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: SubHeadExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: SubHeadExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: SubHeadExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট উপ-খাত সংখ্যা', value: `${subHeadReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'নগদ (ক্যাশ) ব্যয়', value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}` },
          { label: 'ব্যাংক ও MFS ব্যয়', value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('SUB_HEAD'),
      };
    }
    if (reportSubTab === 'monthly') {
      return {
        title: 'মাসিক ব্যয় বিবরণী প্রতিবেদন (Monthly Expense Report)',
        subtitle: 'মাসওয়ারি ব্যয়ের অগ্রগতি ও তুলনামূলক খতিয়ান',
        data: monthlyReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'মাস ও সাল', className: 'font-bold text-slate-900', render: (r: MonthlyExpenseReportRow) => r.monthNameBn },
          { header: 'মাসের কোড (YYYY-MM)', className: 'text-center font-mono text-slate-500', render: (r: MonthlyExpenseReportRow) => r.monthKey },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: MonthlyExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: MonthlyExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: MonthlyExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট সক্রিয় মাস', value: `${monthlyReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'নগদ (ক্যাশ) ব্যয়', value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}` },
          { label: 'ব্যাংক ও MFS ব্যয়', value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('MONTHLY'),
      };
    }
    if (reportSubTab === 'annual') {
      return {
        title: 'বার্ষিক ব্যয় বিবরণী প্রতিবেদন (Annual Expense Report)',
        subtitle: 'বছরভিত্তিক ব্যয়ের তুলনামূলক খতিয়ান',
        data: annualReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'অর্থবছর / সাল', className: 'font-bold text-slate-900', render: (r: AnnualExpenseReportRow) => r.yearNameBn },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: AnnualExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: AnnualExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: AnnualExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট অর্থবছর সংখ্যা', value: `${annualReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'নগদ (ক্যাশ) ব্যয়', value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}` },
          { label: 'ব্যাংক ও MFS ব্যয়', value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={2} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('ANNUAL'),
      };
    }
    if (reportSubTab === 'account') {
      return {
        title: 'হিসাবভিত্তিক ব্যয় বিবরণী (Account-wise Expense Report)',
        subtitle: 'আর্থিক হিসাব (ক্যাশ ও ব্যাংক) অনুযায়ী ব্যয়ের বিবরণী',
        data: accountReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'হিসাবের নাম (Financial Account)', className: 'font-bold text-slate-900', render: (r: AccountExpenseReportRow) => r.accountName },
          { header: 'হিসাবের ধরন', className: 'text-center font-medium text-slate-700', render: (r: AccountExpenseReportRow) => r.accountType || 'CASH' },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: AccountExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: AccountExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: AccountExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট হিসাব সংখ্যা', value: `${accountReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'নগদ হিসাব ব্যয়', value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}` },
          { label: 'ব্যাংক হিসাব ব্যয়', value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('ACCOUNT'),
      };
    }
    if (reportSubTab === 'payment_method') {
      return {
        title: 'পরিশোধ পদ্ধতিভিত্তিক ব্যয় বিবরণী (Payment Method-wise Expense Report)',
        subtitle: 'ক্যাশ, ব্যাংক, বিকাশ, নগদ ইত্যাদি মেথড অনুযায়ী পরিশোধ বিশ্লেষণ',
        data: paymentMethodReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'পরিশোধ পদ্ধতি (Payment Method)', className: 'font-bold text-slate-900', render: (r: PaymentMethodExpenseReportRow) => r.labelBn },
          { header: 'মেথড কোড', className: 'text-center font-mono text-slate-500', render: (r: PaymentMethodExpenseReportRow) => r.method },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: PaymentMethodExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: PaymentMethodExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: PaymentMethodExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট মেথড সংখ্যা', value: `${paymentMethodReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'নগদ পরিশোধ', value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}` },
          { label: 'ডিজিটাল ও ব্যাংক পরিশোধ', value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('PAYMENT_METHOD'),
      };
    }
    if (reportSubTab === 'staff') {
      return {
        title: 'স্টাফ ও বেতনভিত্তিক ব্যয় বিবরণী (Staff-wise Expense Report)',
        subtitle: 'ইমাম, মুয়াজ্জিন, খাদেম ও অন্যান্য স্টাফের বেতন ও ভাতা বিবরণী',
        data: staffReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'স্টাফের নাম', className: 'font-bold text-slate-900', render: (r: StaffExpenseReportRow) => r.staffNameBn },
          { header: 'পদবি / রেফারেন্স', className: 'text-slate-700', render: (r: StaffExpenseReportRow) => r.designationBn || '-' },
          { header: 'মোবাইল নম্বর', className: 'font-mono text-slate-500', render: (r: StaffExpenseReportRow) => r.phone || '-' },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: StaffExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট পরিশোধ (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: StaffExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: StaffExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট সুবিধাভোগী স্টাফ', value: `${staffReportData.length} জন` },
          { label: 'বেতন ভাউচার সংখ্যা', value: `${staffReportData.reduce((s, r) => s + r.count, 0)} টি` },
          { label: 'মোট স্টাফ ব্যয়', value: `৳ ${staffReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={4} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট স্টাফ ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{staffReportData.reduce((s, r) => s + r.count, 0)} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {staffReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('STAFF'),
      };
    }
    if (reportSubTab === 'asset') {
      return {
        title: 'সম্পদ ও সরঞ্জাম রক্ষণাবেক্ষণ ব্যয় বিবরণী (Asset-wise Expense Report)',
        subtitle: 'মসজিদের স্থায়ী সম্পদ, যন্ত্রপাতি ক্রয় ও সংস্কার খতিয়ান',
        data: assetReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'সম্পদের নাম', className: 'font-bold text-slate-900', render: (r: AssetExpenseReportRow) => r.assetNameBn },
          { header: 'সম্পদ কোড', className: 'font-mono text-slate-500', render: (r: AssetExpenseReportRow) => r.assetCode || '-' },
          { header: 'ক্যাটাগরি', className: 'text-slate-700', render: (r: AssetExpenseReportRow) => r.categoryBn || '-' },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: AssetExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: AssetExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: AssetExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট অন্তর্ভুক্ত সম্পদ', value: `${assetReportData.length} টি` },
          { label: 'সম্পদ ভাউচার সংখ্যা', value: `${assetReportData.reduce((s, r) => s + r.count, 0)} টি` },
          { label: 'মোট সম্পদ ব্যয়', value: `৳ ${assetReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={4} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট সম্পদ ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{assetReportData.reduce((s, r) => s + r.count, 0)} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {assetReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('ASSET'),
      };
    }
    if (reportSubTab === 'property') {
      return {
        title: 'ওয়াক্ফ সম্পত্তিভিত্তিক ব্যয় বিবরণী (Property-wise Expense Report)',
        subtitle: 'ওয়াক্ফ জমি, দোকান, মার্কেট ও আবাসিক ইউনিটের রক্ষণাবেক্ষণ ব্যয়',
        data: propertyReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'ওয়াক্ফ সম্পত্তির নাম', className: 'font-bold text-slate-900', render: (r: PropertyExpenseReportRow) => r.propertyNameBn },
          { header: 'সম্পত্তি কোড', className: 'font-mono text-slate-500', render: (r: PropertyExpenseReportRow) => r.propertyCode || '-' },
          { header: 'সম্পত্তির ধরন', className: 'text-slate-700', render: (r: PropertyExpenseReportRow) => r.propertyType || '-' },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: PropertyExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: PropertyExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: PropertyExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট অন্তর্ভুক্ত সম্পত্তি', value: `${propertyReportData.length} টি` },
          { label: 'সম্পত্তি ভাউচার সংখ্যা', value: `${propertyReportData.reduce((s, r) => s + r.count, 0)} টি` },
          { label: 'মোট সম্পত্তি ব্যয়', value: `৳ ${propertyReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={4} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট সম্পত্তি ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{propertyReportData.reduce((s, r) => s + r.count, 0)} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {propertyReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('PROPERTY'),
      };
    }
    if (reportSubTab === 'expense_type') {
      return {
        title: 'ব্যয়ের ধরনভিত্তিক ব্যয় বিবরণী (Expense Type-wise Report)',
        subtitle: 'সাধারণ ব্যয়, বেতন, ইউটিলিটি, কেনাকাটা ইত্যাদি মডিউল ভিত্তিক বিশ্লেষণ',
        data: expenseTypeReportData,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'ব্যয়ের ধরন (Expense Type)', className: 'font-bold text-slate-900', render: (r: ExpenseTypeReportRow) => r.labelBn },
          { header: 'টাইপ কোড', className: 'text-center font-mono text-slate-500', render: (r: ExpenseTypeReportRow) => r.type },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono', render: (r: ExpenseTypeReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: ExpenseTypeReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা অংশ (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: ExpenseTypeReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট ব্যয়ের ক্যাটাগরি', value: `${expenseTypeReportData.length} টি` },
          { label: 'মোট অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'সর্বমোট অনুমোদিত ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট অনুমোদিত ব্যয়:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('EXPENSE_TYPE'),
      };
    }
    if (reportSubTab === 'analysis') {
      return {
        title: 'সমন্বিত ব্যয় বিশ্লেষণ ও প্রধান মেট্রিক প্রতিবেদন (Expense Analysis Report)',
        subtitle: 'প্রধান খাতওয়ারি ব্যয় বিভাজন, গড় ব্যয় ও আর্থিক পরিসংখ্যান',
        data: detailedAnalysisData.mainHeads,
        columns: [
          { header: 'ক্রঃ', className: 'text-center w-12 font-mono', render: (_: any, idx?: number) => (idx !== undefined ? idx + 1 : '') },
          { header: 'প্রধান ব্যয়ের খাত', className: 'font-bold text-slate-900', render: (r: MainHeadExpenseReportRow) => r.headNameBn },
          { header: 'ভাউচার সংখ্যা', className: 'text-center font-mono font-bold text-slate-700', render: (r: MainHeadExpenseReportRow) => `${r.count} টি` },
          { header: 'মোট ব্যয় (৳)', className: 'text-right font-mono font-bold text-rose-700', render: (r: MainHeadExpenseReportRow) => `৳ ${r.amount.toLocaleString('en-IN')}` },
          { header: 'শতকরা হার (%)', className: 'text-right font-mono font-bold text-slate-800', render: (r: MainHeadExpenseReportRow) => `${r.percentage.toFixed(1)}%` },
        ],
        summaryMetrics: [
          { label: 'মোট খাত সংখ্যা', value: `${detailedAnalysisData.mainHeads.length} টি` },
          { label: 'অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
          { label: 'গড় ব্যয় / ভাউচার', value: `৳ ${detailedAnalysisData.overall.averageAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বোচ্চ একক ব্যয়', value: `৳ ${detailedAnalysisData.overall.maxAmount.toLocaleString('en-IN')}` },
          { label: 'সর্বমোট ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`, color: 'text-rose-700 font-bold' },
        ],
        totalRow: (
          <tr>
            <td colSpan={2} className="px-3 py-2.5 text-right font-bold text-slate-800">সর্বমোট:</td>
            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800">{filteredReportSummary.approvedTransactionsCount} টি</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">৳ {filteredTotalAmount.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">১০০.০%</td>
          </tr>
        ),
        onExcel: () => handleExportCurrentReportExcel('ANALYSIS'),
      };
    }
    // Default: Register
    return {
      title: 'ব্যয় ও পরিশোধ বিবরণী প্রতিবেদন (Expense Register Report)',
      subtitle: 'মসজিদের সকল আনুষ্ঠানিক ও অনুমোদিত ব্যয়ের রেজিস্টার খতিয়ান',
      data: filteredReportItems,
      columns: reportColumns,
      summaryMetrics: [
        { label: 'মোট রেকর্ড', value: `${filteredReportSummary.totalTransactionsCount} টি` },
        { label: 'অনুমোদিত ভাউচার', value: `${filteredReportSummary.approvedTransactionsCount} টি` },
        {
          label: 'নগদ (ক্যাশ) ব্যয়',
          value: `৳ ${filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}`,
        },
        {
          label: 'ব্যাংক ও MFS ব্যয়',
          value: `৳ ${filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}`,
        },
        {
          label: 'সর্বমোট ব্যয়',
          value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}`,
          color: 'text-rose-700 font-bold',
        },
      ],
      totalRow: (
        <tr>
          <td colSpan={6} className="px-3 py-2.5 text-right font-bold text-slate-800">
            সর্বমোট অনুমোদিত ব্যয়ের যোগফল:
          </td>
          <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">
            ৳ {filteredTotalAmount.toLocaleString('en-IN')}
          </td>
          <td></td>
        </tr>
      ),
      onExcel: () => handleExportCurrentReportExcel('REGISTER'),
    };
  }, [
    reportSubTab,
    mainHeadReportData,
    subHeadReportData,
    monthlyReportData,
    annualReportData,
    accountReportData,
    paymentMethodReportData,
    staffReportData,
    assetReportData,
    propertyReportData,
    expenseTypeReportData,
    detailedAnalysisData,
    filteredReportItems,
    filteredReportSummary,
    filteredTotalAmount,
    reportColumns,
    handleExportCurrentReportExcel,
  ]);

  // Secondary Sidebar items definition
  const sidebarItems: { id: ExpenseSecondaryTab; label: string; icon: any; count?: number; badgeColor?: string }[] = [
    { id: 'expense_overview', label: '📤 ব্যয় ও পরিশোধ', icon: ArrowUpRight },
    { id: 'new_expense', label: '🧾 নতুন ব্যয় এন্ট্রি', icon: Plus },
    { id: 'salary', label: '💰 বেতন ও সম্মানী', icon: Users, count: categoryFilters.salaryList.length, badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'utilities', label: '💡 বিদ্যুৎ/গ্যাস/পানি', icon: Lightbulb, count: categoryFilters.utilitiesList.length, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'cleaning', label: '🧹 পরিষ্কার-পরিচ্ছন্নতা', icon: Sparkles, count: categoryFilters.cleaningList.length, badgeColor: 'bg-teal-100 text-teal-800' },
    { id: 'maintenance', label: '🔧 মেরামত ও রক্ষণাবেক্ষণ', icon: Wrench, count: categoryFilters.maintenanceList.length, badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'construction', label: '🏗️ নির্মাণ ও উন্নয়ন', icon: Hammer, count: categoryFilters.constructionList.length, badgeColor: 'bg-indigo-100 text-indigo-800' },
    { id: 'purchases', label: '🛒 ক্রয় ও অন্যান্য ব্যয়', icon: ShoppingBag, count: categoryFilters.purchasesList.length, badgeColor: 'bg-slate-100 text-slate-800' },
    { id: 'register', label: '📊 ব্যয় রেজিস্টার', icon: Layers, count: expenses.length, badgeColor: 'bg-slate-100 text-slate-800' },
    { id: 'analytics', label: '📈 ব্যয় বিশ্লেষণ', icon: TrendingDown },
    { id: 'reports', label: '🖨️ রিপোর্ট ও প্রিন্ট', icon: Printer },
    { id: 'reconciliation', label: '📊 ব্যয় রিকনসিলিয়েশন', icon: Scale, count: expenses.length, badgeColor: 'bg-indigo-100 text-indigo-800' },
    { id: 'budget', label: '🎯 বাজেট ও ব্যয় নিয়ন্ত্রণ', icon: PieChart, badgeColor: 'bg-teal-100 text-teal-800' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Page Header (No "Module 8" - direct title) */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                💸 ব্যয় ও পরিশোধ ব্যবস্থাপনা
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের সকল ব্যয়, বিল, বেতন, ক্রয় ও পরিশোধের পূর্ণাঙ্গ হিসাব
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsReportPreviewOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>🖨️ রিপোর্ট প্রিভিউ</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>📊 Excel</span>
            </button>

            <button
              id="btn-add-expense-main"
              onClick={() => handleOpenUnifiedExpense('GENERAL_EXPENSE')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ নতুন ব্যয় ও পরিশোধ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <span>মেনু:</span>
          <strong className="text-rose-700">
            {sidebarItems.find((item) => item.id === activeTab)?.label}
          </strong>
        </span>
        <button
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>নেভিগেশন {isMobileDrawerOpen ? 'বন্ধ' : 'খুলুন'}</span>
        </button>
      </div>

      {/* 2. Main Layout: Secondary Sidebar (Left) + Content (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT SECONDARY SIDEBAR */}
        <aside
          className={`lg:col-span-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2 ${
            isMobileDrawerOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            ব্যয় ও পরিশোধ মেনু
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-rose-700 text-white'
                          : item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100 text-xs text-rose-950 space-y-1">
              <span className="font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                <span>অ্যাকাউন্টিং নীতি:</span>
              </span>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                টাকা পরিশোধ হয়েছে &rarr; ব্যয় ও পরিশোধ। প্রতিটি বৈধ ব্যয় এন্ট্রি সরাসরি ক্যাশ বা সংশ্লিষ্ট ব্যাংক হিসাব থেকে কর্তন করা হয়।
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="lg:col-span-9 space-y-5">
          {/* ==================== SUBTAB 1: EXPENSE OVERVIEW / DASHBOARD ==================== */}
          {activeTab === 'expense_overview' && (
            <div className="space-y-5">
              {/* Expense Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Monthly Total Expense */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">চলতি মাসের মোট ব্যয়</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-rose-700">
                    {formatCurrency(stats.monthlyExpense, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    চলতি মাসে পরিশোধিত মোট ব্যয়
                  </div>
                </div>

                {/* 2. Today's Total Expense */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">আজকের মোট ব্যয়</span>
                    <Calendar className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-900">
                    {formatCurrency(stats.todayExpense, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    আজকের তারিখে এন্ট্রি হওয়া ব্যয়
                  </div>
                </div>

                {/* 3. Salary & Honorarium */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">বেতন ও সম্মানী</span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-700">
                    {formatCurrency(stats.salaryExpense, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    ইমাম, মুয়াজ্জিন ও খাদেমদের সম্মানী
                  </div>
                </div>

                {/* 4. Utility Bills */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">বিদ্যুৎ / পানি / ইউটিলিটি</span>
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-700">
                    {formatCurrency(stats.utilityExpense, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    বিদ্যুৎ, গ্যাস, পানি ও অন্যান্য বিল
                  </div>
                </div>

                {/* 5. Repairs & Maintenance */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">মেরামত ও রক্ষণাবেক্ষণ</span>
                    <Wrench className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-blue-700">
                    {formatCurrency(stats.maintenanceExpense, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    যন্ত্রপাতি, এসি ও স্থাপনা মেরামত
                  </div>
                </div>

                {/* 6. Grand Total Expense */}
                <div className="bg-gradient-to-br from-rose-600 to-red-700 p-4 sm:p-5 rounded-2xl text-white shadow-sm">
                  <div className="flex items-center justify-between text-rose-100">
                    <span className="text-xs font-bold">সর্বমোট ব্যয়</span>
                    <CheckCircle2 className="w-4 h-4 text-rose-200" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono">
                    {formatCurrency(stats.totalExpenseAll, language)}
                  </div>
                  <div className="text-[11px] text-rose-100 mt-1">
                    মোট {expenses.length} টি ভাউচার রেকর্ড
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Expenses Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">সাম্প্রতিক ব্যয় ও পরিশোধসমূহ</h3>
                    <p className="text-xs text-slate-500">সর্বশেষ অন্তর্ভুক্ত ভাউচার ও পেমেন্ট রসিদ</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>সকল ব্যয় রেজিস্টার দেখুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">ভাউচার</th>
                        <th className="px-3 py-2.5">তারিখ</th>
                        <th className="px-3 py-2.5">খাত</th>
                        <th className="px-3 py-2.5">প্রাপক / বিবরণ</th>
                        <th className="px-3 py-2.5">হিসাব</th>
                        <th className="px-3 py-2.5 text-right">পরিমাণ (৳)</th>
                        <th className="px-3 py-2.5 text-center">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.slice(0, 7).map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                            {exp.voucherNumber}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            {formatDate(exp.date)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {exp.mainHeadNameBn}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {exp.payeeName || exp.description || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                            {exp.accountName}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700">
                            ৳ {Number(exp.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => onPrintVoucher(exp, 'EXPENSE', 'POS_80', true)}
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="ভাউচার প্রিন্ট করুন"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SUBTAB 2: DIRECT NEW EXPENSE ENTRY ==================== */}
          {activeTab === 'new_expense' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-rose-600" />
                    <span>🧾 নতুন ব্যয় ও পরিশোধ এন্ট্রি ফরম</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    মসজিদের যেকোনো খরচ বা ভাউচার পরিশোধ সরাসরি অন্তর্ভুক্ত করুন
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={(e) => handleCreateSubmit(e, true)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">তারিখ *</label>
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ব্যয়ের প্রধান খাত *</label>
                    <select
                      required
                      value={mainHeadId}
                      onChange={(e) => {
                        setMainHeadId(e.target.value);
                        setSubHeadId('');
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                    >
                      {expenseMainHeads.map((h) => (
                        <option key={h.id} value={h.id}>{h.nameBn}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeSubHeads.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">উপ-খাত (ঐচ্ছিক)</label>
                    <select
                      value={subHeadId}
                      onChange={(e) => setSubHeadId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                    >
                      <option value="">-- উপ-খাত নির্বাচন করুন --</option>
                      {activeSubHeads.map((h) => (
                        <option key={h.id} value={h.id}>{h.nameBn}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">টাকার পরিমাণ (৳) *</label>
                    <button
                      type="button"
                      onClick={() => setIsCalculatorOpen(true)}
                      className="text-[11px] text-rose-700 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>ক্যালকুলেটর</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-black font-mono text-rose-700 bg-rose-50/40 focus:bg-white"
                  />
                </div>

                {/* Account & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের হিসাব (Account) *</label>
                    <select
                      required
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} ({acc.accountType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">পেমেন্ট মাধ্যম *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                    >
                      <option value="CASH">ক্যাশ / নগদ</option>
                      <option value="BANK">ব্যাংক চেক / ট্রান্সফার</option>
                      <option value="BKASH">বিকাশ (bKash)</option>
                      <option value="NAGAD">নগদ (Nagad)</option>
                      <option value="ROCKET">রকেট (Rocket)</option>
                      <option value="OTHER">অন্যান্য</option>
                    </select>
                  </div>
                </div>

                {/* Payee Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">প্রাপক / ব্যক্তি / দোকানের নাম</label>
                    <input
                      type="text"
                      value={payeeName}
                      onChange={(e) => setPayeeName(e.target.value)}
                      placeholder="নাম লিখুন..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                    <input
                      type="text"
                      value={payeePhone}
                      onChange={(e) => setPayeePhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Reference & Description */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">রেফারেন্স / বিল নং / চেক নং</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="যেমন: বিল নং-৭৮৬, চেক নং-২৩৪৫..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ব্যয়ের বিস্তারিত বিবরণ / নোট</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ব্যয়ের কারণ ও বিস্তারিত তথ্য..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={(e) => handleCreateSubmit(e, false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'শুধুমাত্র সেভ করুন'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সেভ ও ডেবিট ভাউচার প্রিন্ট'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================== SUBTABS: CATEGORY FOCUSED VIEWS (Salary, Utilities, Cleaning, Maintenance, Construction, Purchases) ==================== */}
          {['salary', 'utilities', 'cleaning', 'maintenance', 'construction', 'purchases'].includes(activeTab) && (
            <div className="space-y-5">
              {/* Category Header Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    {activeTab === 'salary' && <Users className="w-5 h-5 text-emerald-600" />}
                    {activeTab === 'utilities' && <Lightbulb className="w-5 h-5 text-amber-600" />}
                    {activeTab === 'cleaning' && <Sparkles className="w-5 h-5 text-teal-600" />}
                    {activeTab === 'maintenance' && <Wrench className="w-5 h-5 text-blue-600" />}
                    {activeTab === 'construction' && <Hammer className="w-5 h-5 text-indigo-600" />}
                    {activeTab === 'purchases' && <ShoppingBag className="w-5 h-5 text-slate-600" />}
                    <span>{sidebarItems.find((s) => s.id === activeTab)?.label} খতিয়ান</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeTab === 'salary' && 'ইমাম, মুয়াজ্জিন, খতিব ও খাদেমদের বেতন ও সম্মানী পরিশোধ'}
                    {activeTab === 'utilities' && 'মসজিদের বিদ্যুৎ বিল, ওয়াসা বিল, গ্যাস ও পানির বিল ট্র্যাকিং'}
                    {activeTab === 'cleaning' && 'মসজিদের নিয়মিত পরিষ্কার-পরিচ্ছন্নতা ও হাইজিন দ্রব্যাদি ক্রয়'}
                    {activeTab === 'maintenance' && 'মাইক, সাউন্ড সিস্টেম, বৈদ্যুতিক কাজ, ফ্যান ও এসি মেরামত'}
                    {activeTab === 'construction' && 'মসজিদ সম্প্রসারণ, রাজমিস্ত্রি, টাইলস, রঙ ও উন্নয়নমূলক ব্যয়'}
                    {activeTab === 'purchases' && 'সাধারণ দ্রব্যাদি ক্রয়, স্টেশনারি ও প্রাসঙ্গিক অন্যান্য খরচ'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {activeTab === 'salary' && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('salaryBankTransfer')}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      🏦 বেতন ব্যাংক ট্রান্সফার
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (activeTab === 'salary') {
                        handleOpenUnifiedExpense('STAFF_EXPENSE');
                      } else if (activeTab === 'maintenance') {
                        handleOpenUnifiedExpense('ASSET_EXPENSE');
                      } else if (activeTab === 'construction') {
                        handleOpenUnifiedExpense('PROPERTY_EXPENSE');
                      } else if (activeTab === 'utilities') {
                        const uHead = expenseMainHeads.find((h) => h.nameBn.includes('বিদ্যুৎ') || h.nameBn.includes('ইউটিলিটি'));
                        handleOpenUnifiedExpense('GENERAL_EXPENSE', { headId: uHead?.id });
                      } else if (activeTab === 'cleaning') {
                        const cHead = expenseMainHeads.find((h) => h.nameBn.includes('পরিষ্কার'));
                        handleOpenUnifiedExpense('GENERAL_EXPENSE', { headId: cHead?.id });
                      } else {
                        handleOpenUnifiedExpense('GENERAL_EXPENSE');
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ এই খাতে ব্যয় এন্ট্রি</span>
                  </button>
                </div>
              </div>

              {/* Records Table for this Category */}
              {(() => {
                const list =
                  activeTab === 'salary'
                    ? categoryFilters.salaryList
                    : activeTab === 'utilities'
                    ? categoryFilters.utilitiesList
                    : activeTab === 'cleaning'
                    ? categoryFilters.cleaningList
                    : activeTab === 'maintenance'
                    ? categoryFilters.maintenanceList
                    : activeTab === 'construction'
                    ? categoryFilters.constructionList
                    : categoryFilters.purchasesList;

                const catSum = list.reduce(
                  (s, e) => (e.status === 'CANCELLED' ? s : s + (Number(e.amount) || 0)),
                  0
                );

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        মোট এন্ট্রি: <strong>{list.length}</strong> টি
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-700">
                        মোট পরিশোধ: ৳ {catSum.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">ভাউচার নং</th>
                            <th className="px-4 py-3">তারিখ</th>
                            <th className="px-4 py-3">খাত / উপ-খাত</th>
                            <th className="px-4 py-3">প্রাপক / ব্যক্তি</th>
                            <th className="px-4 py-3">বিবরণ / রেফারেন্স</th>
                            <th className="px-4 py-3">হিসাব</th>
                            <th className="px-4 py-3 text-right">পরিমাণ (৳)</th>
                            <th className="px-4 py-3 text-center">কার্যক্রম</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                                এই খাতে এখনো কোনো ভাউচার অন্তর্ভুক্ত হয়নি।
                              </td>
                            </tr>
                          ) : (
                            list.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                  {exp.voucherNumber}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {formatDate(exp.date)}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {exp.mainHeadNameBn}
                                  {exp.subHeadNameBn && (
                                    <span className="block text-[10px] text-slate-500 font-normal">
                                      {exp.subHeadNameBn}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-800 font-medium">
                                  {exp.payeeName || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                                  {exp.description || exp.reference || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-[11px]">
                                  {exp.accountName}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {Number(exp.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => onPrintVoucher(exp, 'EXPENSE', 'POS_80', true)}
                                    className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="প্রিন্ট ডেবিট ভাউচার"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ==================== E5-B UNIFIED REPORT WORKSPACE (REGISTER, ANALYTICS & REPORTS) ==================== */}
          {(activeTab === 'register' || activeTab === 'analytics' || activeTab === 'reports') && (
            <div className="space-y-4">
              {/* Report Header & Sub-navigation bar */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Printer className="w-5 h-5 text-rose-600" />
                      <span>ব্যয় রিপোর্ট ও রেজিস্টার কেন্দ্র (Expense Reporting & Register)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      মসজিদের প্রধান ও উপ-খাতভিত্তিক, মাসিক, বার্ষিক ও বিশ্লেষণাত্মক ব্যয় বিবরণী
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExportCurrentReportExcel()}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                      title="এক্সেল ফাইল ডাউনলোড করুন"
                    >
                      <Download className="w-4 h-4" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => setIsReportPreviewOpen(true)}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                      title="অফিসিয়াল A4 প্রিন্ট ও PDF প্রিভিউ"
                    >
                      <Printer className="w-4 h-4 text-emerald-400" />
                      <span>A4 প্রিন্ট / PDF</span>
                    </button>
                  </div>
                </div>

                {/* 12 E5-C Report Sub-Navigation Tabs */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setReportSubTab('register')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'register'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📋 ব্যয় রেজিস্টার</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('main_head')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'main_head'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📊 প্রধান খাত</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('sub_head')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'sub_head'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📑 উপ-খাত</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('monthly')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'monthly'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📅 মাসিক</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('annual')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'annual'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📆 বার্ষিক</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('account')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'account'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>🏦 একাউন্টভিত্তিক</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('payment_method')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'payment_method'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>💳 পেমেন্ট মাধ্যম</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('staff')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'staff'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>👥 স্টাফ ও বেতন</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('asset')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'asset'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>🏢 সম্পদ ও সরঞ্জাম</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('property')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'property'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>🏛️ ওয়াক্ফ সম্পত্তি</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('expense_type')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'expense_type'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📁 ব্যয়ের ধরন</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('analysis')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'analysis'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>🔎 সমন্বিত বিশ্লেষণ</span>
                  </button>

                  <button
                    onClick={() => setReportSubTab('reconciliation')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap cursor-pointer ${
                      reportSubTab === 'reconciliation'
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>📊 ব্যয় Reconciliation (E5-D)</span>
                  </button>
                </div>
              </div>

              {/* Conditional View: When reportSubTab is 'reconciliation', render E5-D directly */}
              {reportSubTab === 'reconciliation' ? (
                <ExpenseReconciliationView
                  dataset={expenseReconciliationDataset}
                  accounts={accounts}
                  mosque={currentMosque}
                />
              ) : (
                <>
                  {/* Universal Filter Bar (Persistent Context for all 6 reports) */}
                  <ReportFilterBar
                filterState={reportFilterState}
                onFilterChange={setReportFilterState}
                statusFilter={registerStatus}
                onStatusFilterChange={(st) => setRegisterStatus(st as any)}
                headFilter={registerHeadId}
                onHeadFilterChange={setRegisterHeadId}
                accountFilter={registerAccountId}
                onAccountFilterChange={setRegisterAccountId}
                headsList={expenseMainHeads.map((h) => ({ id: h.id, nameBn: h.nameBn }))}
                accountsList={accounts.map((a) => ({ id: a.id, nameBn: a.nameBn }))}
                onPrint={() => setIsReportPreviewOpen(true)}
                onPdf={() => setIsReportPreviewOpen(true)}
                onExcel={() => handleExportCurrentReportExcel()}
                totalRecordsCount={filteredReportItems.length}
                totalAmountSum={filteredTotalAmount}
                labelPrefix="মোট ব্যয়"
              />

              {/* Secondary Filter & Search Toolbar */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={registerSearch}
                    onChange={(e) => setRegisterSearch(e.target.value)}
                    placeholder="ভাউচার নম্বর, প্রাপক, ব্যয়ের খাত, বিবরণ বা ফোন দিয়ে খুঁজুন..."
                    className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-hidden"
                  />
                  {registerSearch && (
                    <button
                      onClick={() => setRegisterSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Expense Type Filter */}
                  <select
                    value={registerExpenseType}
                    onChange={(e) => setRegisterExpenseType(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white"
                  >
                    <option value="ALL">সকল ব্যয়ের ধরন</option>
                    <option value="GENERAL_EXPENSE">সাধারণ ব্যয় (General)</option>
                    <option value="STAFF_EXPENSE">স্টাফ বেতন ও সম্মানী (Salary)</option>
                    <option value="ASSET_EXPENSE">সম্পদ ও সরঞ্জাম (Asset)</option>
                    <option value="PROPERTY_EXPENSE">ওয়াকফ ও সম্পত্তি (Property)</option>
                  </select>

                  {/* Payment Method Filter */}
                  <select
                    value={registerPaymentMethod}
                    onChange={(e) => setRegisterPaymentMethod(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white"
                  >
                    <option value="ALL">সকল পেমেন্ট মাধ্যম</option>
                    <option value="CASH">ক্যাশ (নগদ)</option>
                    <option value="BANK">ব্যাংক একাউন্ট</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket)</option>
                  </select>

                  {/* Sort By Dropdown */}
                  <select
                    value={registerSortBy}
                    onChange={(e) => setRegisterSortBy(e.target.value as any)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white"
                  >
                    <option value="DATE_DESC">তারিখ (নতুন হতে পুরাতন)</option>
                    <option value="DATE_ASC">তারিখ (পুরাতন হতে নতুন)</option>
                    <option value="AMOUNT_DESC">পরিমাণ (বেশি হতে কম)</option>
                    <option value="AMOUNT_ASC">পরিমাণ (কম হতে বেশি)</option>
                    <option value="VOUCHER_DESC">ভাউচার নম্বর (বড় হতে ছোট)</option>
                    <option value="HEAD_ASC">খাতের নাম (অক্ষরানুসারে)</option>
                    <option value="PAYEE_ASC">প্রাপকের নাম</option>
                  </select>

                  {(registerSearch ||
                    registerExpenseType !== 'ALL' ||
                    registerPaymentMethod !== 'ALL' ||
                    registerHeadId !== 'ALL' ||
                    registerAccountId !== 'ALL' ||
                    registerStatus !== 'ALL') && (
                    <button
                      onClick={() => {
                        setRegisterSearch('');
                        setRegisterExpenseType('ALL');
                        setRegisterPaymentMethod('ALL');
                        setRegisterHeadId('ALL');
                        setRegisterAccountId('ALL');
                        setRegisterStatus('ALL');
                      }}
                      className="text-xs px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      রিসেট
                    </button>
                  )}
                </div>
              </div>

              {/* ==================== VIEW 1: 📋 ব্যয়ের রেজিস্টার (REGISTER) ==================== */}
              {reportSubTab === 'register' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট অনুমোদিত ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-0.5">
                        ৳ {filteredReportSummary.totalApprovedAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {filteredReportSummary.approvedTransactionsCount} টি অনুমোদিত ভাউচার
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">নগদ (ক্যাশ) ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-emerald-700 mt-0.5">
                        ৳ {filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">ক্যাশ তহবিল থেকে পরিশোধ</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">ব্যাংক ও MFS ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-blue-700 mt-0.5">
                        ৳ {filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">ব্যাংক / বিকাশ / নগদ</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট রেকর্ড সংখ্যা</span>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-800 mt-0.5">
                        {filteredReportSummary.totalTransactionsCount} টি
                      </div>
                      <span className="text-[10px] text-rose-600 font-medium">
                        {filteredReportSummary.cancelledTransactionsCount > 0
                          ? `${filteredReportSummary.cancelledTransactionsCount} টি বাতিলকৃত`
                          : 'সকল ভাউচার সক্রিয়'}
                      </span>
                    </div>
                  </div>

                  {/* Register Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">ব্যয় রেজিস্টার খতিয়ান</h3>
                        <p className="text-xs text-slate-500">সময়সীমা: {effectiveDates.labelBn}</p>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-700">
                        মোট প্রদর্শিত: <strong>{filteredReportItems.length}</strong> টি
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-3 text-center w-10">ক্রঃ</th>
                            <th className="px-3.5 py-3">ভাউচার নং</th>
                            <th className="px-3.5 py-3">তারিখ</th>
                            <th className="px-3.5 py-3">ব্যয়ের খাত</th>
                            <th className="px-3.5 py-3">বিবরণ</th>
                            <th className="px-3.5 py-3">প্রাপক / ব্যক্তি</th>
                            <th className="px-3.5 py-3">হিসাব / মাধ্যম</th>
                            <th className="px-3.5 py-3 text-right">পরিমাণ (৳)</th>
                            <th className="px-3.5 py-3 text-center">অবস্থা</th>
                            <th className="px-3.5 py-3 text-center">কার্যক্রম</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReportItems.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                                নির্বাচিত সময়কাল বা ফিল্টারে কোনো ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            filteredReportItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-3 text-center text-slate-400 font-mono">
                                  {idx + 1}
                                </td>
                                <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                                  {item.voucherNumber}
                                </td>
                                <td className="px-3.5 py-3 font-mono text-slate-600">
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-3.5 py-3 font-medium text-slate-900">
                                  <div className="font-bold">{item.mainHeadNameBn}</div>
                                  {item.subHeadNameBn && (
                                    <span className="block text-[10px] text-slate-500 font-normal">
                                      {item.subHeadNameBn}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3.5 py-3 text-slate-700 max-w-xs truncate">
                                  {item.description || '-'}
                                </td>
                                <td className="px-3.5 py-3 text-slate-800 font-medium">
                                  <div>{item.payeeName}</div>
                                  {item.payeePhone && (
                                    <div className="text-[10px] text-slate-500 font-mono">{item.payeePhone}</div>
                                  )}
                                </td>
                                <td className="px-3.5 py-3 text-slate-600 text-[11px]">
                                  {item.accountName}{' '}
                                  <span className="text-slate-400">({item.paymentMethodLabelBn})</span>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-700">
                                  <span className={item.status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>
                                    ৳ {Number(item.amount).toLocaleString('en-IN')}
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      item.status === 'CANCELLED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {item.statusLabelBn}
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() => onPrintVoucher(item.rawEntry, 'EXPENSE', 'POS_80', true)}
                                      className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                                      title="প্রিন্ট ডেবিট ভাউচার"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    {onUpdateExpense && item.status !== 'CANCELLED' && (
                                      <button
                                        onClick={() => setEditingItem(item.rawEntry)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                                        title="সম্পাদনা করুন"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {item.status !== 'CANCELLED' && (
                                      <button
                                        onClick={() => setReversalTarget(item.rawEntry)}
                                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                                        title="ভাউচার বাতিল / রিভার্স করুন"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {filteredReportItems.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={7} className="px-3.5 py-3 text-right text-slate-800">
                                মোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 2: 📊 প্রধান খাতভিত্তিক ব্যয় (MAIN HEAD) ==================== */}
              {reportSubTab === 'main_head' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট অনুমোদিত ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-0.5">
                        ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">সকল প্রধান খাত অন্তর্ভুক্ত</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">সক্রিয় প্রধান খাত সংখ্যা</span>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-800 mt-0.5">
                        {mainHeadReportData.length} টি
                      </div>
                      <span className="text-[10px] text-slate-400">ব্যয়সম্পন্ন খাতের সংখ্যা</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">সর্বোচ্চ ব্যয়ের খাত</span>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-1">
                        {mainHeadReportData.length > 0 ? mainHeadReportData[0].headNameBn : '-'}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">
                        {mainHeadReportData.length > 0
                          ? `৳ ${mainHeadReportData[0].amount.toLocaleString('en-IN')}`
                          : ''}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">গড় খাত প্রতি ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-indigo-700 mt-0.5">
                        ৳{' '}
                        {mainHeadReportData.length > 0
                          ? Math.round(filteredTotalAmount / mainHeadReportData.length).toLocaleString('en-IN')
                          : 0}
                      </div>
                      <span className="text-[10px] text-slate-400">খাতওয়ারি গড় খরচ</span>
                    </div>
                  </div>

                  {/* Chart Overview */}
                  {mainHeadReportData.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                        <span>প্রধান খাতসমূহের ব্যয়ের তুলনামূলক চার্ট</span>
                        <span className="text-[11px] text-slate-500 font-normal">পরিমাণ (টাকা)</span>
                      </h4>
                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={mainHeadReportData.slice(0, 8).map((h) => ({
                              name: h.headNameBn.length > 12 ? h.headNameBn.slice(0, 12) + '...' : h.headNameBn,
                              amount: h.amount,
                            }))}
                            margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" angle={-15} textAnchor="end" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any) => [`৳ ${Number(val).toLocaleString('en-IN')}`, 'মোট ব্যয়']}
                            />
                            <Bar dataKey="amount" fill="#E11D48" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Main Head Report Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">প্রধান খাতভিত্তিক ব্যয়ের তালিকা</h4>
                        <p className="text-xs text-slate-500">সময়কাল: {effectiveDates.labelBn}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700">
                        মোট খাত: {mainHeadReportData.length} টি
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-center w-12">ক্রঃ</th>
                            <th className="px-4 py-3">প্রধান ব্যয়ের খাত</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right w-32">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 w-40">ভিজ্যুয়াল অংশ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {mainHeadReportData.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                                নির্বাচিত সময়কালে কোনো প্রধান খাতের ব্যয়ের ডাটা পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            mainHeadReportData.map((row, idx) => (
                              <tr key={row.headId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.headNameBn}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3">
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {mainHeadReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 3: 📑 উপ-খাতভিত্তিক ব্যয় (SUB-HEAD) ==================== */}
              {reportSubTab === 'sub_head' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট অনুমোদিত ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-0.5">
                        ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">সকল উপ-খাত অন্তর্ভুক্ত</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট উপ-খাত সংখ্যা</span>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-800 mt-0.5">
                        {subHeadReportData.length} টি
                      </div>
                      <span className="text-[10px] text-slate-400">সক্রিয় উপ-খাত সংখ্যা</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">সর্বোচ্চ ব্যয়ের উপ-খাত</span>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-1">
                        {subHeadReportData.length > 0 ? subHeadReportData[0].subHeadNameBn : '-'}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">
                        {subHeadReportData.length > 0
                          ? `৳ ${subHeadReportData[0].amount.toLocaleString('en-IN')}`
                          : ''}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">গড় উপ-খাত প্রতি ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-indigo-700 mt-0.5">
                        ৳{' '}
                        {subHeadReportData.length > 0
                          ? Math.round(filteredTotalAmount / subHeadReportData.length).toLocaleString('en-IN')
                          : 0}
                      </div>
                      <span className="text-[10px] text-slate-400">উপ-খাতওয়ারি গড়</span>
                    </div>
                  </div>

                  {/* Sub-head Report Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">উপ-খাতভিত্তিক ব্যয়ের পূর্ণাঙ্গ তালিকা</h4>
                        <p className="text-xs text-slate-500">সময়কাল: {effectiveDates.labelBn}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700">
                        মোট উপ-খাত: {subHeadReportData.length} টি
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-center w-12">ক্রঃ</th>
                            <th className="px-4 py-3">প্রধান খাত</th>
                            <th className="px-4 py-3">উপ-খাত (Sub-Head)</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subHeadReportData.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো উপ-খাতের ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            subHeadReportData.map((row, idx) => (
                              <tr key={row.subHeadKey} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.mainHeadNameBn}</td>
                                <td className="px-4 py-3 text-slate-800 font-medium">{row.subHeadNameBn}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {subHeadReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 4: 📅 মাসিক ব্যয় (MONTHLY) ==================== */}
              {reportSubTab === 'monthly' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট অনুমোদিত ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-0.5">
                        ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">সকল মাসের মোট খরচ</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট সক্রিয় মাস</span>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-800 mt-0.5">
                        {monthlyReportData.length} টি মাস
                      </div>
                      <span className="text-[10px] text-slate-400">ব্যয়সম্পন্ন মাসের হিসাব</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">সর্বোচ্চ ব্যয়ের মাস</span>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-1">
                        {monthlyReportData.length > 0
                          ? [...monthlyReportData].sort((a, b) => b.amount - a.amount)[0].monthNameBn
                          : '-'}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">
                        {monthlyReportData.length > 0
                          ? `৳ ${[...monthlyReportData].sort((a, b) => b.amount - a.amount)[0].amount.toLocaleString('en-IN')}`
                          : ''}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মাসিক গড় ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-indigo-700 mt-0.5">
                        ৳{' '}
                        {monthlyReportData.length > 0
                          ? Math.round(filteredTotalAmount / monthlyReportData.length).toLocaleString('en-IN')
                          : 0}
                      </div>
                      <span className="text-[10px] text-slate-400">প্রতি মাসের গড় ব্যয়</span>
                    </div>
                  </div>

                  {/* Monthly Trend Chart */}
                  {monthlyReportData.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                        <span>মাসওয়ারি ব্যয়ের অগ্রগতি ও তুলনামূলক চার্ট</span>
                        <span className="text-[11px] text-slate-500 font-normal">পরিমাণ (টাকা)</span>
                      </h4>
                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={monthlyReportData.map((m) => ({
                              name: m.monthNameBn,
                              amount: m.amount,
                            }))}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any) => [`৳ ${Number(val).toLocaleString('en-IN')}`, 'মাসিক ব্যয়']}
                            />
                            <Bar dataKey="amount" fill="#E11D48" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Monthly Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">মাসিক ব্যয়ের বিবরণী</h4>
                        <p className="text-xs text-slate-500">সময়সীমা: {effectiveDates.labelBn}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700">
                        মোট মাস: {monthlyReportData.length} টি
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-center w-12">ক্রঃ</th>
                            <th className="px-4 py-3">মাস ও সাল</th>
                            <th className="px-4 py-3 text-center font-mono">মাসের কোড</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthlyReportData.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                                নির্বাচিত সময়কালে কোনো মাসিক ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            monthlyReportData.map((row, idx) => (
                              <tr key={row.monthKey} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.monthNameBn}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-500">{row.monthKey}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {monthlyReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 5: 📆 বার্ষিক ব্যয় (ANNUAL) ==================== */}
              {reportSubTab === 'annual' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট অনুমোদিত ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-0.5">
                        ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">সকল অর্থবছরের ব্যয়</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">মোট অর্থবছর সংখ্যা</span>
                      <div className="text-base sm:text-lg font-black font-mono text-slate-800 mt-0.5">
                        {annualReportData.length} টি বছর
                      </div>
                      <span className="text-[10px] text-slate-400">বার্ষিক খতিয়ান</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">সর্বোচ্চ ব্যয়ের বছর</span>
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate mt-1">
                        {annualReportData.length > 0
                          ? [...annualReportData].sort((a, b) => b.amount - a.amount)[0].yearNameBn
                          : '-'}
                      </div>
                      <span className="text-[10px] text-rose-600 font-mono font-bold">
                        {annualReportData.length > 0
                          ? `৳ ${[...annualReportData].sort((a, b) => b.amount - a.amount)[0].amount.toLocaleString('en-IN')}`
                          : ''}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500">বার্ষিক গড় ব্যয়</span>
                      <div className="text-base sm:text-lg font-black font-mono text-indigo-700 mt-0.5">
                        ৳{' '}
                        {annualReportData.length > 0
                          ? Math.round(filteredTotalAmount / annualReportData.length).toLocaleString('en-IN')
                          : 0}
                      </div>
                      <span className="text-[10px] text-slate-400">প্রতি বছরের গড়</span>
                    </div>
                  </div>

                  {/* Annual Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">বার্ষিক ব্যয় বিবরণী</h4>
                        <p className="text-xs text-slate-500">সময়সীমা: {effectiveDates.labelBn}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-700">
                        মোট অর্থবছর: {annualReportData.length} টি
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-center w-12">ক্রঃ</th>
                            <th className="px-4 py-3">অর্থবছর / সাল</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {annualReportData.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                নির্বাচিত সময়কালে কোনো বার্ষিক ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            annualReportData.map((row, idx) => (
                              <tr key={row.year} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.yearNameBn}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {annualReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 6: 🏦 একাউন্টভিত্তিক ব্যয় বিবরণী (ACCOUNT REPORT) ==================== */}
              {reportSubTab === 'account' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>🏦 আর্থিক একাউন্টভিত্তিক মোট ব্যয়ের হিসাব</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          মসজিদের নগদ (Cash) এবং বিভিন্ন ব্যাংক একাউন্ট থেকে পরিশোধিত ব্যয়ের তুলনামূলক বিবরণী
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">মোট ব্যয়</span>
                        <span className="text-sm font-black font-mono text-rose-700">
                          ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 font-mono">ক্রঃ</th>
                            <th className="px-4 py-3">হিসাবের নাম (Financial Account)</th>
                            <th className="px-4 py-3 text-center">হিসাবের ধরন</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {accountReportData.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো একাউন্টের ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            accountReportData.map((row, idx) => (
                              <tr key={row.accountId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.accountName}</td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      row.accountType === 'BANK'
                                        ? 'bg-blue-100 text-blue-800'
                                        : row.accountType === 'MFS'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {row.accountType || 'CASH'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() =>
                                      setSelectedDrillDownEntity({
                                        dimensionTitle: 'হিসাবভিত্তিক ব্যয় বিশ্লেষণ',
                                        entityName: row.accountName,
                                        entitySubtext: `ধরন: ${row.accountType || 'CASH'}`,
                                        totalAmount: row.amount,
                                        count: row.count,
                                        items: row.items || [],
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                    title="এই একাউন্টের সকল ভাউচার দেখুন"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>ভাউচারসমূহ</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {accountReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 7: 💳 পেমেন্ট মাধ্যমভিত্তিক ব্যয় বিবরণী (PAYMENT METHOD REPORT) ==================== */}
              {reportSubTab === 'payment_method' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>💳 পরিশোধ পদ্ধতিভিত্তিক ব্যয়ের হিসাব (Payment Method Report)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          ক্যাশ, ব্যাংক চেক, অনলাইন ট্রান্সফার, বিকাশ, নগদ ইত্যাদি পরিশোধ পদ্ধতির তুলনামূলক খতিয়ান
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">মোট পরিশোধ</span>
                        <span className="text-sm font-black font-mono text-rose-700">
                          ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 font-mono">ক্রঃ</th>
                            <th className="px-4 py-3">পরিশোধ পদ্ধতি (Payment Method)</th>
                            <th className="px-4 py-3 text-center">মেথড কোড</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paymentMethodReportData.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো পেমেন্ট মেথডের ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            paymentMethodReportData.map((row, idx) => (
                              <tr key={row.method} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900 flex items-center space-x-2">
                                  <span>{row.labelBn}</span>
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-slate-500 text-[11px]">
                                  {row.method}
                                </td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() =>
                                      setSelectedDrillDownEntity({
                                        dimensionTitle: 'পেমেন্ট মাধ্যম বিশ্লেষণ',
                                        entityName: row.labelBn,
                                        entitySubtext: `কোড: ${row.method}`,
                                        totalAmount: row.amount,
                                        count: row.count,
                                        items: row.items || [],
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                    title="এই মাধ্যমের সকল ভাউচার দেখুন"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>ভাউচারসমূহ</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {paymentMethodReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 8: 👥 স্টাফ ও বেতনভিত্তিক ব্যয় বিবরণী (STAFF REPORT) ==================== */}
              {reportSubTab === 'staff' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>👥 স্টাফ ও বেতনভিত্তিক ব্যয় বিবরণী (Staff Expense Report)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          ইমাম, মুয়াজ্জিন, খাদেম ও অন্যান্য স্টাফের বেতন, ভাতা ও এককালীন সম্মানীর পুঙ্খানুপুঙ্খ বিবরণী
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">মোট স্টাফ ব্যয়</span>
                        <span className="text-sm font-black font-mono text-rose-700">
                          ৳ {staffReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 font-mono">ক্রঃ</th>
                            <th className="px-4 py-3">স্টাফের নাম</th>
                            <th className="px-4 py-3">পদবি / পরিচিতি</th>
                            <th className="px-4 py-3 font-mono">মোবাইল</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট পরিশোধ (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {staffReportData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো স্টাফ ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            staffReportData.map((row, idx) => (
                              <tr key={row.staffId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.staffNameBn}</td>
                                <td className="px-4 py-3 text-slate-700">{row.designationBn || '-'}</td>
                                <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{row.phone || '-'}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() =>
                                      setSelectedDrillDownEntity({
                                        dimensionTitle: 'স্টাফ ব্যয় বিবরণী',
                                        entityName: row.staffNameBn,
                                        entitySubtext: row.designationBn ? `পদবি: ${row.designationBn}` : undefined,
                                        totalAmount: row.amount,
                                        count: row.count,
                                        items: row.items || [],
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                    title="এই স্টাফের সকল ভাউচার দেখুন"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>ভাউচারসমূহ</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {staffReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট স্টাফ ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {staffReportData.reduce((s, r) => s + r.count, 0)} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {staffReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 9: 🏢 সম্পদ ও সরঞ্জাম ব্যয় বিবরণী (ASSET REPORT) ==================== */}
              {reportSubTab === 'asset' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>🏢 সম্পদ ও সরঞ্জাম ব্যয় বিবরণী (Asset Maintenance Report)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          মসজিদের আসবাবপত্র, মাইক, ফ্যান, এসি, জেনারেটর, সোলার ও অন্যান্য সরঞ্জামের ক্রয় ও সংস্কার খতিয়ান
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">মোট সম্পদ ব্যয়</span>
                        <span className="text-sm font-black font-mono text-rose-700">
                          ৳ {assetReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 font-mono">ক্রঃ</th>
                            <th className="px-4 py-3">সম্পদের নাম</th>
                            <th className="px-4 py-3 text-center font-mono">কোড</th>
                            <th className="px-4 py-3">ক্যাটাগরি</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {assetReportData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো সম্পদ সংশ্লিষ্ট ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            assetReportData.map((row, idx) => (
                              <tr key={row.assetId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.assetNameBn}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-500 text-[11px]">
                                  {row.assetCode || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{row.categoryBn || '-'}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() =>
                                      setSelectedDrillDownEntity({
                                        dimensionTitle: 'সম্পদ ব্যয় বিশ্লেষণ',
                                        entityName: row.assetNameBn,
                                        entitySubtext: row.assetCode ? `কোড: ${row.assetCode}` : undefined,
                                        totalAmount: row.amount,
                                        count: row.count,
                                        items: row.items || [],
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                    title="এই সম্পদের সকল ভাউচার দেখুন"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>ভাউচারসমূহ</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {assetReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট সম্পদ ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {assetReportData.reduce((s, r) => s + r.count, 0)} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {assetReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 10: 🏛️ ওয়াক্ফ সম্পত্তি ব্যয় বিবরণী (PROPERTY REPORT) ==================== */}
              {reportSubTab === 'property' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>🏛️ ওয়াক্ফ সম্পত্তি ব্যয় বিবরণী (Property Maintenance Report)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          মসজিদের আওতাধীন ওয়াক্ফ দোকান, মার্কেট, জমি ও আবাসিক ইউনিটের মেরামত ও রক্ষণাবেক্ষণ খতিয়ান
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">মোট সম্পত্তি ব্যয়</span>
                        <span className="text-sm font-black font-mono text-rose-700">
                          ৳ {propertyReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 font-mono">ক্রঃ</th>
                            <th className="px-4 py-3">ওয়াক্ফ সম্পত্তির নাম</th>
                            <th className="px-4 py-3 text-center font-mono">কোড</th>
                            <th className="px-4 py-3">সম্পত্তির ধরন</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {propertyReportData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো ওয়াক্ফ সম্পত্তি সংশ্লিষ্ট ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            propertyReportData.map((row, idx) => (
                              <tr key={row.propertyId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.propertyNameBn}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-500 text-[11px]">
                                  {row.propertyCode || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{row.propertyType || '-'}</td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() =>
                                      setSelectedDrillDownEntity({
                                        dimensionTitle: 'ওয়াক্ফ সম্পত্তি ব্যয় বিশ্লেষণ',
                                        entityName: row.propertyNameBn,
                                        entitySubtext: row.propertyCode ? `কোড: ${row.propertyCode}` : undefined,
                                        totalAmount: row.amount,
                                        count: row.count,
                                        items: row.items || [],
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                    title="এই সম্পত্তির সকল ভাউচার দেখুন"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>ভাউচারসমূহ</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {propertyReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট সম্পত্তি ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {propertyReportData.reduce((s, r) => s + r.count, 0)} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {propertyReportData.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 11: 📁 ব্যয়ের ধরনভিত্তিক ব্যয় বিবরণী (EXPENSE TYPE REPORT) ==================== */}
              {reportSubTab === 'expense_type' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>📁 ব্যয়ের ধরন ও ক্যাটাগরি বিশ্লেষণ (Expense Type Report)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          সাধারণ ব্যয়, স্টাফ বেতন, ইউটিলিটি বিল, রক্ষণাবেক্ষণ, নির্মাণ ও ক্রয় মডিউল ভিত্তিক বিশ্লেষণ
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">মোট ব্যয়</span>
                        <span className="text-sm font-black font-mono text-rose-700">
                          ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="px-4 py-3 text-center w-12 font-mono">ক্রঃ</th>
                            <th className="px-4 py-3">ব্যয়ের ধরন (Expense Type)</th>
                            <th className="px-4 py-3 text-center font-mono">টাইপ কোড</th>
                            <th className="px-4 py-3 text-center">ভাউচার সংখ্যা</th>
                            <th className="px-4 py-3 text-right">মোট ব্যয় (৳)</th>
                            <th className="px-4 py-3 text-right">শতকরা অংশ (%)</th>
                            <th className="px-4 py-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {expenseTypeReportData.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-400">
                                নির্বাচিত ফিল্টারে কোনো ধরনের ব্যয়ের তথ্য পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            expenseTypeReportData.map((row, idx) => (
                              <tr key={row.type} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{row.labelBn}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-500 text-[11px]">
                                  {row.type}
                                </td>
                                <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">
                                  {row.count} টি
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                                  ৳ {row.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  {row.percentage.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() =>
                                      setSelectedDrillDownEntity({
                                        dimensionTitle: 'ব্যয়ের ধরন বিশ্লেষণ',
                                        entityName: row.labelBn,
                                        entitySubtext: `কোড: ${row.type}`,
                                        totalAmount: row.amount,
                                        count: row.count,
                                        items: row.items || [],
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                    title="এই ধরনের সকল ভাউচার দেখুন"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>ভাউচারসমূহ</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {expenseTypeReportData.length > 0 && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                                সর্বমোট অনুমোদিত ব্যয়:
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-800">
                                {filteredReportSummary.approvedTransactionsCount} টি
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-rose-800 font-black">
                                ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-800">১০০.০%</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== VIEW 12: 🔎 সমন্বিত বিস্তারিত বিশ্লেষণ (CROSS-DIMENSION ANALYSIS) ==================== */}
              {reportSubTab === 'analysis' && (
                <div className="space-y-4">
                  {/* Detailed Analysis High-level Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-500">মোট অনুমোদিত ব্যয়</span>
                      <div className="text-base font-black font-mono text-rose-700 mt-0.5">
                        ৳ {filteredReportSummary.totalApprovedAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {filteredReportSummary.approvedTransactionsCount} টি ভাউচার
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-500">গড় ভাউচার ব্যয়</span>
                      <div className="text-base font-black font-mono text-slate-800 mt-0.5">
                        ৳ {Math.round(detailedAnalysisData.overall.averageAmount || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">প্রতি ভাউচারের গড়</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-500">সর্বোচ্চ একক ব্যয়</span>
                      <div className="text-base font-black font-mono text-rose-700 mt-0.5">
                        ৳ {detailedAnalysisData.overall.maxAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {detailedAnalysisData.overall.maxVoucherNumber
                          ? `${detailedAnalysisData.overall.maxVoucherNumber} (${detailedAnalysisData.overall.maxPayeeName || ''})`
                          : '-'}
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-500">সর্বনিম্ন একক ব্যয়</span>
                      <div className="text-base font-black font-mono text-emerald-700 mt-0.5">
                        ৳ {detailedAnalysisData.overall.minAmount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">সর্বনিম্ন পরিশোধ</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-500">নগদ (ক্যাশ) অনুপাত</span>
                      <div className="text-base font-black font-mono text-amber-700 mt-0.5">
                        {filteredReportSummary.totalApprovedAmount > 0
                          ? (
                              (filteredReportSummary.cashExpenseAmount / filteredReportSummary.totalApprovedAmount) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ৳ {filteredReportSummary.cashExpenseAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold text-slate-500">ব্যাংক ও MFS অনুপাত</span>
                      <div className="text-base font-black font-mono text-blue-700 mt-0.5">
                        {filteredReportSummary.totalApprovedAmount > 0
                          ? (
                              (filteredReportSummary.bankMfsCombinedAmount /
                                filteredReportSummary.totalApprovedAmount) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ৳ {filteredReportSummary.bankMfsCombinedAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Multi-dimensional Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Payment Method Breakdown */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span>💳 পেমেন্ট মাধ্যম অনুপাত ও বিশ্লেষণ</span>
                        </h4>
                        <button
                          onClick={() => setReportSubTab('payment_method')}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                        >
                          বিস্তারিত তালিকা →
                        </button>
                      </div>
                      <div className="space-y-2">
                        {paymentMethodReportData.map((pm) => (
                          <div key={pm.method} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">{pm.labelBn}</span>
                              <div className="flex items-center space-x-2 font-mono">
                                <span className="text-slate-500 text-[11px]">{pm.count} টি ভাউচার</span>
                                <span className="font-bold text-rose-700">৳ {pm.amount.toLocaleString('en-IN')}</span>
                                <span className="text-slate-700 font-bold w-12 text-right">{pm.percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-rose-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, pm.percentage))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Expense Type / Category Breakdown */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span>📁 ব্যয়ের ধরন ও মডিউল বিশ্লেষণ</span>
                        </h4>
                        <button
                          onClick={() => setReportSubTab('expense_type')}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                        >
                          বিস্তারিত তালিকা →
                        </button>
                      </div>
                      <div className="space-y-2">
                        {expenseTypeReportData.map((et) => (
                          <div key={et.type} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">{et.labelBn}</span>
                              <div className="flex items-center space-x-2 font-mono">
                                <span className="text-slate-500 text-[11px]">{et.count} টি ভাউচার</span>
                                <span className="font-bold text-rose-700">৳ {et.amount.toLocaleString('en-IN')}</span>
                                <span className="text-slate-700 font-bold w-12 text-right">{et.percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, et.percentage))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Financial Accounts Breakdown */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 md:col-span-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span>🏦 আর্থিক একাউন্টভিত্তিক মোট ব্যয়ের হিসাব</span>
                        </h4>
                        <button
                          onClick={() => setReportSubTab('account')}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                        >
                          বিস্তারিত তালিকা →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {accountReportData.map((acc) => (
                          <div key={acc.accountId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{acc.accountName}</span>
                              <span className="text-[10px] font-mono text-slate-500">{acc.count} টি</span>
                            </div>
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-sm font-bold text-rose-700">৳ {acc.amount.toLocaleString('en-IN')}</span>
                              <span className="text-xs font-bold text-slate-700">{acc.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* ==================== E5-D EXPENSE ↔ ACCOUNT ↔ LEDGER RECONCILIATION ==================== */}
          {activeTab === 'reconciliation' && (
            <ExpenseReconciliationView
              dataset={expenseReconciliationDataset}
              accounts={accounts}
              mosque={currentMosque}
            />
          )}

          {/* ==================== E6 BUDGET & EXPENSE CONTROL ==================== */}
          {activeTab === 'budget' && (
            <BudgetControlView
              currentMosque={currentMosque}
              currentUser={currentUser}
              expenses={expenses}
              accountHeads={accountHeads}
              accounts={accounts}
              staff={staff}
              assets={assets}
              properties={properties}
              onNavigateToNewExpense={() => handleOpenUnifiedExpense('GENERAL_EXPENSE')}
            />
          )}
        </main>
      </div>

      {/* ==================== CREATE EXPENSE MODAL ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-5 h-5" />
                <h3 className="font-bold text-sm">নতুন ব্যয় ও পরিশোধ এন্ট্রি</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateSubmit(e, true)} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ব্যয়ের প্রধান খাত *</label>
                  <select
                    required
                    value={mainHeadId}
                    onChange={(e) => {
                      setMainHeadId(e.target.value);
                      setSubHeadId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  >
                    {expenseMainHeads.map((h) => (
                      <option key={h.id} value={h.id}>{h.nameBn}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeSubHeads.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">উপ-খাত (ঐচ্ছিক)</label>
                  <select
                    value={subHeadId}
                    onChange={(e) => setSubHeadId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- উপ-খাত নির্বাচন করুন --</option>
                    {activeSubHeads.map((h) => (
                      <option key={h.id} value={h.id}>{h.nameBn}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">টাকার পরিমাণ (৳) *</label>
                  <button
                    type="button"
                    onClick={() => setIsCalculatorOpen(true)}
                    className="text-[11px] text-rose-700 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>ক্যালকুলেটর</span>
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base font-black font-mono text-rose-700 bg-rose-50/40 focus:bg-white"
                />
              </div>

              {/* Account & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের হিসাব *</label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">পেমেন্ট মাধ্যম *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  >
                    <option value="CASH">ক্যাশ / নগদ</option>
                    <option value="BANK">ব্যাংক ট্রান্সফার / চেক</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket)</option>
                    <option value="OTHER">অন্যান্য</option>
                  </select>
                </div>
              </div>

              {/* Payee Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">প্রাপক / ব্যক্তি / প্রতিষ্ঠান</label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="নাম লিখুন..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={payeePhone}
                    onChange={(e) => setPayeePhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Reference & Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">রেফারেন্স / বিল নং / চেক নং</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="প্রযোজ্য ক্ষেত্রে লিখুন..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">বিবরণ / নোট</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ব্যয়ের বিস্তারিত বিবরণ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleCreateSubmit(e, false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'শুধুমাত্র সেভ করুন'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সেভ ও ভাউচার প্রিন্ট'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== REVERSAL / CANCEL MODAL ==================== */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">ব্যয় ভাউচার বাতিল / রিভার্সাল</h3>
            </div>
            <p className="text-xs text-slate-600">
              আপনি ভাউচার নং <strong className="font-mono text-slate-900">{reversalTarget.voucherNumber}</strong> বাতিল করতে যাচ্ছেন। এর ফলে সমপরিমাণ টাকা সংশ্লিষ্ট হিসেবে পুনরায় ফেরত আসবে।
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">বাতিলের কারণ লিখুন *</label>
              <textarea
                rows={3}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="যেমন: ভুল এন্ট্রি, অতিরিক্ত বিল বাতিল ইত্যাদি..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setReversalTarget(null);
                  setReversalReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                বাতিল নয়
              </button>
              <button
                onClick={handleConfirmReversal}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                নিশ্চিত বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CHANGE CALCULATOR MODAL ==================== */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        language={language}
        targetAmount={Number(amount) || 0}
        onApplyAmount={(val) => {
          setAmount(String(val));
          setIsCalculatorOpen(false);
        }}
      />

      {/* ==================== EDIT TRANSACTION MODAL ==================== */}
      {editingItem && onUpdateExpense && (
        <EditTransactionModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          type="EXPENSE"
          accountHeads={accountHeads}
          accounts={accounts}
          onSave={async (id, data) => {
            await onUpdateExpense(id, data);
            setEditingItem(null);
          }}
          language={language}
        />
      )}

      {/* ==================== E5-C DRILL-DOWN VOUCHERS MODAL ==================== */}
      {selectedDrillDownEntity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold rounded-md uppercase tracking-wider">
                    {selectedDrillDownEntity.dimensionTitle}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                  <span>{selectedDrillDownEntity.entityName}</span>
                </h3>
                {selectedDrillDownEntity.entitySubtext && (
                  <p className="text-xs text-slate-300">{selectedDrillDownEntity.entitySubtext}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedDrillDownEntity(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl cursor-pointer text-slate-300 hover:text-white transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drill-down Summary & Action Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-4">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block font-medium">ভাউচার সংখ্যা</span>
                  <span className="text-sm font-black font-mono text-slate-900">
                    {selectedDrillDownEntity.count} টি
                  </span>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block font-medium">সর্বমোট পরিমাণ</span>
                  <span className="text-sm font-black font-mono text-rose-700">
                    ৳ {selectedDrillDownEntity.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    exportExpenseReportToExcel(
                      {
                        items: selectedDrillDownEntity.items,
                        summary: {
                          totalApprovedAmount: selectedDrillDownEntity.totalAmount,
                          totalCancelledAmount: 0,
                          totalAllAmount: selectedDrillDownEntity.totalAmount,
                          approvedTransactionsCount: selectedDrillDownEntity.count,
                          cancelledTransactionsCount: 0,
                          totalTransactionsCount: selectedDrillDownEntity.count,
                          cashExpenseAmount: 0,
                          bankExpenseAmount: 0,
                          mfsExpenseAmount: 0,
                          bankMfsCombinedAmount: 0,
                          headwiseBreakdown: [],
                          accountwiseBreakdown: [],
                          typewiseBreakdown: [],
                          paymentMethodBreakdown: [],
                        },
                        effectiveDates,
                        filterParams: {
                          dateFilter: reportFilterState.dateFilter,
                          searchQuery: reportFilterState.searchQuery,
                        },
                        mosqueId: currentMosque?.id || 'default_mosque',
                        generatedAt: new Date().toISOString(),
                      },
                      currentMosque,
                      'REGISTER'
                    );
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>এক্সেল ডাউনলোড</span>
                </button>
              </div>
            </div>

            {/* Drill-down Vouchers List Table */}
            <div className="p-4 overflow-y-auto flex-1 max-h-[60vh]">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 font-mono">ভাউচার নং</th>
                      <th className="px-3 py-2.5 font-mono">তারিখ</th>
                      <th className="px-3 py-2.5">ব্যয়ের খাত</th>
                      <th className="px-3 py-2.5">প্রাপক / ব্যক্তি</th>
                      <th className="px-3 py-2.5">বিবরণ / রেফারেন্স</th>
                      <th className="px-3 py-2.5">হিসাব ও মাধ্যম</th>
                      <th className="px-3 py-2.5 text-right font-mono">পরিমাণ (৳)</th>
                      <th className="px-3 py-2.5 text-center">প্রিন্ট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedDrillDownEntity.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-slate-400">
                          কোনো ভাউচার পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      selectedDrillDownEntity.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                            {item.voucherNumber}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(item.date)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {item.mainHeadNameBn}
                            {item.subHeadNameBn && (
                              <span className="block text-[10px] text-slate-500 font-normal">
                                {item.subHeadNameBn}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-800 font-medium">
                            {item.payeeName || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">
                            {item.description || item.reference || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 text-[11px]">
                            <div>{item.accountName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.paymentMethodLabelBn}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            ৳ {Number(item.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => onPrintVoucher(item as unknown as ExpenseEntry, 'EXPENSE', 'POS_80', true)}
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="প্রিন্ট ডেবিট ভাউচার"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {selectedDrillDownEntity.items.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={6} className="px-3 py-2.5 text-right text-slate-800">
                          মোট পরিমাণ:
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-rose-800">
                          ৳ {selectedDrillDownEntity.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDrillDownEntity(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== UNIVERSAL A4 REPORT PREVIEW MODAL ==================== */}
      <A4ReportPreviewModal<any>
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportTitle={activeReportModalConfig.title}
        reportSubtitle={activeReportModalConfig.subtitle}
        periodLabel={effectiveDates.labelBn}
        currentMosque={currentMosque}
        columns={activeReportModalConfig.columns}
        data={activeReportModalConfig.data}
        summaryMetrics={activeReportModalConfig.summaryMetrics}
        totalRow={activeReportModalConfig.totalRow}
        onExcel={activeReportModalConfig.onExcel}
      />

      {/* ==================== UNIFIED EXPENSE ENTRY MODAL (Phase E2) ==================== */}
      <UnifiedExpenseEntryModal
        isOpen={isUnifiedExpenseModalOpen}
        onClose={() => setIsUnifiedExpenseModalOpen(false)}
        initialType={unifiedExpenseType}
        initialMainHeadId={unifiedMainHeadId}
        initialStaffId={unifiedStaffId}
        initialAssetId={unifiedAssetId}
        initialPropertyId={unifiedPropertyId}
        accounts={accounts}
        accountHeads={accountHeads}
        staff={staff}
        assets={assets}
        properties={properties}
        currentUser={currentUser}
        currentMosque={currentMosque}
        language={language}
        onSaveExpense={async (data, options) => {
          return await onAddExpense(data, options);
        }}
        onPrintVoucher={onPrintVoucher}
      />
    </div>
  );
};

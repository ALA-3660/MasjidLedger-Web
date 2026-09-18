import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import {
  ExpenseEntry,
  AccountHead,
  FinancialAccount,
  PaymentMethod,
  User,
  Mosque,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { EditTransactionModal } from './EditModals';
import { SmsPreviewModal } from './SmsPreviewModal';
import { QrScanResult } from '../types/qrBarcodeTypes';
import {
  DateFilterState,
  getDefaultDateFilterState,
  resolveEffectiveDates,
  filterByDateRange,
  exportToXlsx,
} from '../lib/reportingEngine';
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
  | 'reports';

interface ExpenseManagementViewProps {
  initialTab?: ExpenseSecondaryTab;
  expenses: ExpenseEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
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
      openCreateModal();
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

  // ===================== REGISTER & REPORTING ENGINE =====================
  const [reportFilterState, setReportFilterState] = useState<DateFilterState>(getDefaultDateFilterState());
  const [registerSearch, setRegisterSearch] = useState('');
  const [registerStatus, setRegisterStatus] = useState('ALL');
  const [registerHeadId, setRegisterHeadId] = useState('ALL');
  const [registerAccountId, setRegisterAccountId] = useState('ALL');

  const effectiveDates = useMemo(() => resolveEffectiveDates(reportFilterState), [reportFilterState]);

  // Filtered Expenses used for BOTH screen table, print, and excel
  const filteredExpenses = useMemo(() => {
    let list = filterByDateRange<ExpenseEntry>(expenses, effectiveDates.startDate, effectiveDates.endDate);

    if (registerSearch.trim()) {
      const q = registerSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.voucherNumber?.toLowerCase().includes(q) ||
          e.payeeName?.toLowerCase().includes(q) ||
          e.mainHeadNameBn?.toLowerCase().includes(q) ||
          e.subHeadNameBn?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.reference?.toLowerCase().includes(q)
      );
    }

    if (registerStatus !== 'ALL') {
      list = list.filter((e) => e.status === registerStatus);
    }

    if (registerHeadId !== 'ALL') {
      list = list.filter((e) => e.mainHeadId === registerHeadId || e.subHeadId === registerHeadId);
    }

    if (registerAccountId !== 'ALL') {
      list = list.filter((e) => e.accountId === registerAccountId);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, effectiveDates, registerSearch, registerStatus, registerHeadId, registerAccountId]);

  const filteredTotalAmount = useMemo(
    () => filteredExpenses.reduce((s, e) => (e.status === 'CANCELLED' ? s : s + (Number(e.amount) || 0)), 0),
    [filteredExpenses]
  );

  // Excel (.xlsx) Exporter
  const handleExportExcel = () => {
    exportToXlsx<ExpenseEntry>({
      filename: `ব্যয়_বিবরণী_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'ব্যয় ও পরিশোধ',
      mosqueName: currentMosque?.nameBn || currentMosque?.name || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট',
      reportTitle: 'ব্যয় ও পরিশোধ বিবরণী প্রতিবেদন',
      periodLabel: effectiveDates.labelBn,
      columns: [
        { header: 'ভাউচার নং', accessor: (e) => e.voucherNumber },
        { header: 'তারিখ', accessor: (e) => formatDate(e.date) },
        { header: 'ব্যয়ের খাত', accessor: (e) => `${e.mainHeadNameBn}${e.subHeadNameBn ? ` / ${e.subHeadNameBn}` : ''}` },
        { header: 'বিবরণ', accessor: (e) => e.description || '-' },
        { header: 'প্রাপক / সুবিধাভোগী', accessor: (e) => e.payeeName || '-' },
        { header: 'হিসাব / মাধ্যম', accessor: (e) => `${e.accountName} (${e.paymentMethod})` },
        { header: 'পরিমাণ (৳)', accessor: (e) => Number(e.amount) || 0 },
        { header: 'অবস্থা', accessor: (e) => (e.status === 'CANCELLED' ? 'বাতিলকৃত' : 'অনুমোদিত') },
        { header: 'রেফারেন্স / বিল নং', accessor: (e) => e.reference || '-' },
      ],
      data: filteredExpenses,
      summaryRows: [
        { label: 'মোট রেকর্ড সংখ্যা', value: `${filteredExpenses.length} টি` },
        { label: 'সর্বমোট অনুমোদিত ব্যয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}` },
      ],
    });
  };

  // Report Preview Columns Definition
  const reportColumns: ReportColumn<ExpenseEntry>[] = [
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
          <div>{e.mainHeadNameBn}</div>
          {e.subHeadNameBn && <div className="text-[10px] text-slate-500">{e.subHeadNameBn}</div>}
        </div>
      ),
    },
    {
      header: 'বিবরণ',
      className: 'text-slate-700',
      render: (e) => e.description || '-',
    },
    {
      header: 'প্রাপক / ব্যক্তি / প্রতিষ্ঠান',
      className: 'text-slate-800 font-medium',
      render: (e) => e.payeeName || '-',
    },
    {
      header: 'হিসাব / মাধ্যম',
      className: 'text-slate-600 text-[11px]',
      render: (e) => `${e.accountName} (${e.paymentMethod})`,
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
          {e.status === 'CANCELLED' ? 'বাতিল' : 'অনুমোদিত'}
        </span>
      ),
    },
  ];

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
              onClick={() => openCreateModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ ব্যয় এন্ট্রি</span>
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
                    onClick={() => openCreateModal()}
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

          {/* ==================== SUBTAB 8: EXPENSE REGISTER (ব্যয় রেজিস্টার) ==================== */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              {/* Universal Filter Bar */}
              <ReportFilterBar
                filterState={reportFilterState}
                onFilterChange={setReportFilterState}
                statusFilter={registerStatus}
                onStatusFilterChange={setRegisterStatus}
                headFilter={registerHeadId}
                onHeadFilterChange={setRegisterHeadId}
                accountFilter={registerAccountId}
                onAccountFilterChange={setRegisterAccountId}
                headsList={expenseMainHeads.map((h) => ({ id: h.id, nameBn: h.nameBn }))}
                accountsList={accounts.map((a) => ({ id: a.id, nameBn: a.nameBn }))}
                onPrint={() => setIsReportPreviewOpen(true)}
                onPdf={() => setIsReportPreviewOpen(true)}
                onExcel={handleExportExcel}
                totalRecordsCount={filteredExpenses.length}
                totalAmountSum={filteredTotalAmount}
                labelPrefix="মোট ব্যয়"
              />

              {/* Search Bar */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  placeholder="ভাউচার নম্বর, প্রাপক, ব্যয়ের খাত, বিবরণ বা রেফারেন্স দিয়ে খুঁজুন..."
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-hidden"
                />
                {registerSearch && (
                  <button
                    onClick={() => setRegisterSearch('')}
                    className="text-xs text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Register Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">ব্যয় রেজিস্টার খতিয়ান</h3>
                    <p className="text-xs text-slate-500">সময়সীমা: {effectiveDates.labelBn}</p>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    মোট প্রদর্শিত: <strong>{filteredExpenses.length}</strong> টি
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
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                            নির্বাচিত ফিল্টারে কোনো ব্যয় ভাউচার পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((item, idx) => (
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
                              {item.mainHeadNameBn}
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
                              {item.payeeName || '-'}
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 text-[11px]">
                              {item.accountName}{' '}
                              <span className="text-slate-400">({item.paymentMethod})</span>
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
                                {item.status === 'CANCELLED' ? 'বাতিলকৃত' : 'অনুমোদিত'}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => onPrintVoucher(item, 'EXPENSE', 'POS_80', true)}
                                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                                  title="প্রিন্ট ডেবিট ভাউচার"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {onUpdateExpense && item.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                                    title="সম্পাদনা করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {item.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => setReversalTarget(item)}
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
                    {filteredExpenses.length > 0 && (
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

          {/* ==================== SUBTAB 9: EXPENSE ANALYTICS ==================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-1">ব্যয় খাতওয়ারি বন্টন ও বিশ্লেষণ</h3>
                <p className="text-xs text-slate-500 mb-4">প্রধান প্রধান খাত অনুসারে মোট ব্যয়ের পরিসংখ্যান</p>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={expenseMainHeads.map((head) => {
                        const total = expenses
                          .filter((e) => e.mainHeadId === head.id && e.status !== 'CANCELLED')
                          .reduce((s, e) => s + (Number(e.amount) || 0), 0);
                        return {
                          name: head.nameBn.length > 14 ? head.nameBn.slice(0, 14) + '...' : head.nameBn,
                          amount: total,
                        };
                      })}
                      margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [`৳ ${Number(val).toLocaleString('en-IN')}`, 'ব্যয়']}
                      />
                      <Bar dataKey="amount" fill="#E11D48" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Head-wise breakdown cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseMainHeads.map((head) => {
                  const headExpenses = expenses.filter((e) => e.mainHeadId === head.id && e.status !== 'CANCELLED');
                  const sum = headExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                  return (
                    <div key={head.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold text-slate-800">{head.nameBn}</span>
                      <div className="mt-2 text-lg font-black font-mono text-rose-700">
                        ৳ {sum.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-slate-500">{headExpenses.length} টি ভাউচার এন্ট্রি</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== SUBTAB 10: REPORT & PRINT ==================== */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Printer className="w-5 h-5 text-rose-600" />
                      <span>ব্যয় ও পরিশোধ অফিসিয়াল রিপোর্ট কেন্দ্র</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      তারিখ, মাস বা বছরভিত্তিক ফিল্টার করে সরাসরি A4 প্রিন্ট, PDF বা Excel এক্সপোর্ট করুন
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportExcel}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => setIsReportPreviewOpen(true)}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Printer className="w-4 h-4 text-emerald-400" />
                      <span>A4 প্রিন্ট প্রিভিউ</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <ReportFilterBar
                    filterState={reportFilterState}
                    onFilterChange={setReportFilterState}
                    statusFilter={registerStatus}
                    onStatusFilterChange={setRegisterStatus}
                    headFilter={registerHeadId}
                    onHeadFilterChange={setRegisterHeadId}
                    accountFilter={registerAccountId}
                    onAccountFilterChange={setRegisterAccountId}
                    headsList={expenseMainHeads.map((h) => ({ id: h.id, nameBn: h.nameBn }))}
                    accountsList={accounts.map((a) => ({ id: a.id, nameBn: a.nameBn }))}
                    onPrint={() => setIsReportPreviewOpen(true)}
                    onPdf={() => setIsReportPreviewOpen(true)}
                    onExcel={handleExportExcel}
                    totalRecordsCount={filteredExpenses.length}
                    totalAmountSum={filteredTotalAmount}
                    labelPrefix="মোট ব্যয়"
                  />
                </div>
              </div>

              {/* Filtered Data Preview Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">রিপোর্ট প্রিভিউ ডাটা</h4>
                    <p className="text-xs text-slate-500">সময়সীমা: {effectiveDates.labelBn}</p>
                  </div>
                  <div className="text-xs font-mono font-bold text-rose-700">
                    মোট রেকর্ড: {filteredExpenses.length} টি | সর্বমোট: ৳ {filteredTotalAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10">ক্রঃ</th>
                        <th className="px-3 py-2.5">ভাউচার</th>
                        <th className="px-3 py-2.5">তারিখ</th>
                        <th className="px-3 py-2.5">খাত</th>
                        <th className="px-3 py-2.5">বিবরণ</th>
                        <th className="px-3 py-2.5">প্রাপক</th>
                        <th className="px-3 py-2.5">হিসাব</th>
                        <th className="px-3 py-2.5 text-right">পরিমাণ (৳)</th>
                        <th className="px-3 py-2.5 text-center">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.voucherNumber}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{formatDate(item.date)}</td>
                          <td className="px-3 py-2 text-slate-900">{item.mainHeadNameBn}</td>
                          <td className="px-3 py-2 text-slate-600">{item.description || '-'}</td>
                          <td className="px-3 py-2 text-slate-800 font-medium">{item.payeeName || '-'}</td>
                          <td className="px-3 py-2 text-slate-500 text-[11px]">{item.accountName}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">
                            ৳ {Number(item.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                item.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.status === 'CANCELLED' ? 'বাতিল' : 'অনুমোদিত'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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

      {/* ==================== UNIVERSAL A4 REPORT PREVIEW MODAL ==================== */}
      <A4ReportPreviewModal<ExpenseEntry>
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportTitle="ব্যয় ও পরিশোধ বিবরণী প্রতিবেদন (Expense Register Report)"
        reportSubtitle="মসজিদের সকল আনুষ্ঠানিক ও অনুমোদিত ব্যয়ের রেজিস্টার খতিয়ান"
        periodLabel={effectiveDates.labelBn}
        currentMosque={currentMosque}
        columns={reportColumns}
        data={filteredExpenses}
        summaryMetrics={[
          { label: 'মোট রেকর্ড', value: `${filteredExpenses.length} টি` },
          { label: 'সর্বমোট ব্যয়', value: filteredTotalAmount, color: 'text-rose-700 font-bold' },
        ]}
        totalRow={
          <tr>
            <td colSpan={7} className="px-3 py-2.5 text-right font-bold text-slate-800">
              সর্বমোট ব্যয়ের যোগফল:
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">
              ৳ {filteredTotalAmount.toLocaleString('en-IN')}
            </td>
            <td></td>
          </tr>
        }
        onExcel={handleExportExcel}
      />
    </div>
  );
};

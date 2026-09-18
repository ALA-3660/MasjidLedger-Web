import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
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
  Coins,
  HeartHandshake,
  TrendingUp,
  TrendingDown,
  Scale,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Wallet,
  Landmark,
  Building2,
  Users,
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  AccountHead,
  FinancialAccount,
  PaymentMethod,
  User,
  Mosque,
  CashDenominationData,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { DenominationDetailModal } from './DenominationDetailModal';
import { EditTransactionModal } from './EditModals';
import { SmsPreviewModal } from './SmsPreviewModal';
import { QuickIncomeExpenseReportModal } from './QuickIncomeExpenseReportModal';
import { JumaCollectionModal } from './JumaCollectionModal';
import { api } from '../lib/api';
import { QrScanResult } from '../types/qrBarcodeTypes';

export type IncomeExpenseSubTab = 'income' | 'expense' | 'juma' | 'donations' | 'analytics';

interface IncomeExpenseViewProps {
  initialTab?: 'income' | 'expense' | 'juma' | 'donations' | 'analytics';
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  scannedActionIntent?: QrScanResult | null;
  onClearScannedAction?: () => void;
  onAddIncome: (data: any, options?: { print?: boolean; format?: 'A4' | 'POS_80' | 'POS_58' }) => Promise<any>;
  onAddExpense: (data: any, options?: { print?: boolean; format?: 'A4' | 'POS_80' | 'POS_58' }) => Promise<any>;
  onUpdateIncome?: (id: string, data: any) => Promise<void>;
  onUpdateExpense?: (id: string, data: any) => Promise<void>;
  onReverseIncome: (id: string, reason: string) => Promise<void>;
  onReverseExpense: (id: string, reason: string) => Promise<void>;
  onPrintVoucher: (
    item: IncomeEntry | ExpenseEntry,
    type: 'INCOME' | 'EXPENSE',
    format?: 'A4' | 'POS_80' | 'POS_58',
    isReprint?: boolean
  ) => void;
  onSendSms?: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

export const IncomeExpenseView: React.FC<IncomeExpenseViewProps> = ({
  initialTab = 'income',
  incomes,
  expenses,
  accountHeads,
  accounts,
  currentUser,
  currentMosque,
  language = 'bn',
  scannedActionIntent,
  onClearScannedAction,
  onAddIncome,
  onAddExpense,
  onUpdateIncome,
  onUpdateExpense,
  onReverseIncome,
  onReverseExpense,
  onPrintVoucher,
  onSendSms,
}) => {
  const t = translations[language] || translations.bn;
  const [activeTab, setActiveTab] = useState<IncomeExpenseSubTab>(
    initialTab === 'expense' ? 'expense' : initialTab === 'juma' ? 'juma' : initialTab === 'donations' ? 'donations' : initialTab === 'analytics' ? 'analytics' : 'income'
  );

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [headFilter, setHeadFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJumaModalOpen, setIsJumaModalOpen] = useState(false);
  const [isQuickReportOpen, setIsQuickReportOpen] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    item: IncomeEntry | ExpenseEntry;
    type: 'INCOME' | 'EXPENSE';
  } | null>(null);
  const [smsItem, setSmsItem] = useState<{
    item: IncomeEntry | ExpenseEntry;
    type: 'INCOME' | 'EXPENSE';
  } | null>(null);

  // Form State
  const [mainHeadId, setMainHeadId] = useState('');
  const [subHeadId, setSubHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incomeDenominationData, setIncomeDenominationData] = useState<CashDenominationData | null>(null);

  // Denomination View/Edit Modal State
  const [isDenominationDetailOpen, setIsDenominationDetailOpen] = useState(false);
  const [activeDenominationDetail, setActiveDenominationDetail] = useState<CashDenominationData | null>(null);
  const [activeDenominationRef, setActiveDenominationRef] = useState('');
  const [activeDenominationRecordId, setActiveDenominationRecordId] = useState('');

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<{
    id: string;
    voucherNumber: string;
    type: 'INCOME' | 'EXPENSE';
  } | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Heads Filtering
  const incomeMainHeads = accountHeads.filter((h) => h.type === 'INCOME' && !h.parentId);
  const expenseMainHeads = accountHeads.filter((h) => h.type === 'EXPENSE' && !h.parentId);
  const activeMainHeads = modalType === 'INCOME' ? incomeMainHeads : expenseMainHeads;
  const activeSubHeads = accountHeads.filter((h) => h.parentId === mainHeadId);

  // Sync initialTab when prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(
        initialTab === 'expense'
          ? 'expense'
          : initialTab === 'juma'
          ? 'juma'
          : initialTab === 'donations'
          ? 'donations'
          : initialTab === 'analytics'
          ? 'analytics'
          : 'income'
      );
    }
  }, [initialTab]);

  // Handle QR Scanned Actions
  useEffect(() => {
    if (!scannedActionIntent) return;
    if (scannedActionIntent.actionKey === 'ACT-INC-NEW' || scannedActionIntent.actionKey === 'ACT_INC_NEW') {
      setActiveTab('income');
      openCreateModal('INCOME');
      onClearScannedAction?.();
    } else if (scannedActionIntent.actionKey === 'ACT-EXP-NEW' || scannedActionIntent.actionKey === 'ACT_EXP_NEW') {
      setActiveTab('expense');
      openCreateModal('EXPENSE');
      onClearScannedAction?.();
    }
  }, [scannedActionIntent]);

  const openCreateModal = (type: 'INCOME' | 'EXPENSE') => {
    setModalType(type);
    const firstMain = type === 'INCOME' ? incomeMainHeads[0] : expenseMainHeads[0];
    setMainHeadId(firstMain?.id || '');
    setSubHeadId('');
    setAmount('');
    setPaymentMethod('CASH');
    setAccountId(accounts[0]?.id || '');
    setPersonName('');
    setPersonPhone('');
    setReference('');
    setDescription('');
    setAttachmentUrl('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setErrorMessage('');
    setIncomeDenominationData(null);
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleFormSubmit = async (e?: React.FormEvent, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY' = 'SAVE_AND_PRINT') => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');
    const num = Number(amount);

    if (!num || num <= 0) {
      setErrorMessage(t.amountMustBePositive);
      return;
    }
    if (!mainHeadId) {
      setErrorMessage(language === 'bn' ? 'প্রধান খাত নির্বাচন করুন।' : 'Select main head.');
      return;
    }

    if (modalType === 'INCOME' && incomeDenominationData && incomeDenominationData.grandTotal !== num) {
      setErrorMessage(
        `ভাংতি গণনা অনুযায়ী মোট টাকা (৳${incomeDenominationData.grandTotal.toLocaleString('en-IN')}) এবং ভাউচারের টাকার পরিমাণ (৳${num.toLocaleString('en-IN')}) সমান হতে হবে।`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalType === 'INCOME') {
        const payload: any = {
          mainHeadId,
          subHeadId,
          amount: num,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          donorName: personName,
          donorPhone: personPhone,
          reference,
          description,
          date: entryDate,
          attachmentUrl: attachmentUrl || undefined,
        };
        if (paymentMethod === 'CASH' && incomeDenominationData && incomeDenominationData.grandTotal === num) {
          payload.denominationData = incomeDenominationData;
        }
        await onAddIncome(payload, { print: submitMode === 'SAVE_AND_PRINT', format: 'POS_80' });
      } else {
        await onAddExpense(
          {
            mainHeadId,
            subHeadId,
            amount: num,
            paymentMethod,
            accountId: accountId || accounts[0]?.id,
            payeeName: personName,
            payeePhone: personPhone,
            reference,
            description,
            date: entryDate,
            attachmentUrl: attachmentUrl || undefined,
          },
          { print: submitMode === 'SAVE_AND_PRINT', format: 'POS_80' }
        );
      }
      setIsModalOpen(false);
      setIncomeDenominationData(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reversal Execution
  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;
    try {
      if (reversalTarget.type === 'INCOME') {
        await onReverseIncome(reversalTarget.id, reversalReason);
      } else {
        await onReverseExpense(reversalTarget.id, reversalReason);
      }
      setReversalTarget(null);
      setReversalReason('');
    } catch (err) {
      console.error(err);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    const approvedIncomes = incomes.filter((i) => i.status === 'APPROVED');
    const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED');

    const totalIncomeAll = approvedIncomes.reduce((s, i) => s + (i.amount || 0), 0);
    const totalExpenseAll = approvedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const monthlyIncome = approvedIncomes
      .filter((i) => {
        const d = new Date(i.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((s, i) => s + (i.amount || 0), 0);

    const monthlyExpense = approvedExpenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);

    const todayIncome = approvedIncomes
      .filter((i) => i.date === todayStr)
      .reduce((s, i) => s + (i.amount || 0), 0);

    const todayExpense = approvedExpenses
      .filter((e) => e.date === todayStr)
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Juma Incomes
    const jumaList = approvedIncomes.filter(
      (i) =>
        (i.reference && i.reference.toLowerCase().includes('juma')) ||
        (i.description && i.description.includes('জুমা')) ||
        (i.subHeadNameBn && i.subHeadNameBn.includes('জুমা'))
    );
    const totalJuma = jumaList.reduce((s, i) => s + (i.amount || 0), 0);
    const latestJuma = jumaList.length > 0 ? jumaList[0] : null;

    // Project Donations
    const projectDonations = approvedIncomes.filter(
      (i) =>
        (i.subHeadNameBn && (i.subHeadNameBn.includes('প্রকল্প') || i.subHeadNameBn.includes('উন্নয়ন') || i.subHeadNameBn.includes('ছাদ') || i.subHeadNameBn.includes('ওজু') || i.subHeadNameBn.includes('এসি'))) ||
        (i.mainHeadNameBn && i.mainHeadNameBn.includes('দান'))
    );
    const totalProjectDonations = projectDonations.reduce((s, i) => s + (i.amount || 0), 0);

    const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

    return {
      totalIncomeAll,
      totalExpenseAll,
      monthlyIncome,
      monthlyExpense,
      monthlyNet: monthlyIncome - monthlyExpense,
      todayIncome,
      todayExpense,
      totalJuma,
      latestJuma,
      jumaCount: jumaList.length,
      avgJuma: jumaList.length > 0 ? Math.round(totalJuma / jumaList.length) : 0,
      totalProjectDonations,
      projectCount: projectDonations.length,
      totalBalance,
    };
  }, [incomes, expenses, accounts]);

  // Filter Helper
  const filterRecord = (item: IncomeEntry | ExpenseEntry) => {
    // 1. Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      item.voucherNumber.toLowerCase().includes(query) ||
      (item.mainHeadNameBn && item.mainHeadNameBn.toLowerCase().includes(query)) ||
      (item.subHeadNameBn && item.subHeadNameBn.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.reference && item.reference.toLowerCase().includes(query)) ||
      ('donorName' in item && item.donorName?.toLowerCase().includes(query)) ||
      ('payeeName' in item && item.payeeName?.toLowerCase().includes(query)) ||
      ('donorPhone' in item && (item as any).donorPhone?.includes(query)) ||
      ('payeePhone' in item && (item as any).payeePhone?.includes(query));

    // 2. Status Filter
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    // 3. Head Filter
    const matchesHead = headFilter === 'ALL' || item.mainHeadId === headFilter || item.subHeadId === headFilter;

    // 4. Account Filter
    const matchesAccount = accountFilter === 'ALL' || item.accountId === accountFilter;

    // 5. Date Period Filter
    let matchesPeriod = true;
    const itemDate = new Date(item.date);
    const now = new Date();

    if (periodFilter === 'TODAY') {
      matchesPeriod = item.date === now.toISOString().split('T')[0];
    } else if (periodFilter === 'THIS_WEEK') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      matchesPeriod = itemDate >= oneWeekAgo && itemDate <= now;
    } else if (periodFilter === 'THIS_MONTH') {
      matchesPeriod = itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    } else if (periodFilter === 'THIS_YEAR') {
      matchesPeriod = itemDate.getFullYear() === now.getFullYear();
    } else if (periodFilter === 'CUSTOM') {
      if (customStartDate && item.date < customStartDate) matchesPeriod = false;
      if (customEndDate && item.date > customEndDate) matchesPeriod = false;
    }

    return matchesSearch && matchesStatus && matchesHead && matchesAccount && matchesPeriod;
  };

  // Filtered Lists for Each Sub-Tab
  const filteredIncomes = useMemo(() => incomes.filter(filterRecord), [incomes, searchQuery, statusFilter, headFilter, accountFilter, periodFilter, customStartDate, customEndDate]);
  const filteredExpenses = useMemo(() => expenses.filter(filterRecord), [expenses, searchQuery, statusFilter, headFilter, accountFilter, periodFilter, customStartDate, customEndDate]);

  const filteredJumaList = useMemo(() => {
    return incomes.filter((i) => {
      const isJuma =
        (i.reference && i.reference.toLowerCase().includes('juma')) ||
        (i.description && i.description.includes('জুমা')) ||
        (i.subHeadNameBn && i.subHeadNameBn.includes('জুমা')) ||
        (i.donorName && i.donorName.includes('জুমা'));
      return isJuma && filterRecord(i);
    });
  }, [incomes, searchQuery, statusFilter, headFilter, accountFilter, periodFilter, customStartDate, customEndDate]);

  const filteredDonationsList = useMemo(() => {
    return incomes.filter((i) => {
      const isDonation =
        (i.mainHeadNameBn && (i.mainHeadNameBn.includes('দান') || i.mainHeadNameBn.includes('Donation'))) ||
        (i.subHeadNameBn && (i.subHeadNameBn.includes('অনুদান') || i.subHeadNameBn.includes('প্রকল্প') || i.subHeadNameBn.includes('চাঁদা')));
      return isDonation && filterRecord(i);
    });
  }, [incomes, searchQuery, statusFilter, headFilter, accountFilter, periodFilter, customStartDate, customEndDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-siliguri">
      {/* 1. Module Header with 5 Sub-Tabs & Quick Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  💵 আয় ও ব্যয় ব্যবস্থাপনা
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                  Module 8
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের আয় ও প্রাপ্তি, ব্যয় ও পরিশোধ, জুমার কালেকশন, দান ও পূর্ণাঙ্গ হিসাব রেজিস্টার
              </p>
            </div>
          </div>

          {/* Top Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-quick-juma-modal"
              onClick={() => setIsJumaModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>🕌 জুমার কালেকশন</span>
            </button>

            <button
              id="btn-quick-report-modal"
              onClick={() => setIsQuickReportOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>🖨️ রিপোর্ট ও প্রিন্ট (A4)</span>
            </button>

            <button
              id="btn-add-income-main"
              onClick={() => openCreateModal('INCOME')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ আয় ও প্রাপ্তি</span>
            </button>

            <button
              id="btn-add-expense-main"
              onClick={() => openCreateModal('EXPENSE')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➖ ব্যয় ও পরিশোধ</span>
            </button>
          </div>
        </div>

        {/* 5 Sub-Tab Switcher */}
        <div className="flex items-center overflow-x-auto gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
          <button
            id="subtab-income"
            onClick={() => setActiveTab('income')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>📥 আয় ও প্রাপ্তি</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'income' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {incomes.length}
            </span>
          </button>

          <button
            id="subtab-expense"
            onClick={() => setActiveTab('expense')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>📤 ব্যয় ও পরিশোধ</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'expense' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {expenses.length}
            </span>
          </button>

          <button
            id="subtab-juma"
            onClick={() => setActiveTab('juma')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'juma'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>🕌 জুমার কালেকশন</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'juma' ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {stats.jumaCount}
            </span>
          </button>

          <button
            id="subtab-donations"
            onClick={() => setActiveTab('donations')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'donations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>🤲 সাধারণ ও প্রকল্প অনুদান</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'donations' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {stats.projectCount}
            </span>
          </button>

          <button
            id="subtab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>📊 আয়-ব্যয় বিবরণী ও বিশ্লেষণ</span>
          </button>
        </div>
      </div>

      {/* 2. Key KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Income Card */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold">চলতি মাসের মোট আয়</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-emerald-800">
            {formatCurrency(stats.monthlyIncome, language)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>আজকের আয়:</span>
            <strong className="font-mono text-emerald-700">{formatCurrency(stats.todayIncome, language)}</strong>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold">চলতি মাসের মোট ব্যয়</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-rose-800">
            {formatCurrency(stats.monthlyExpense, language)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>আজকের ব্যয়:</span>
            <strong className="font-mono text-rose-700">{formatCurrency(stats.todayExpense, language)}</strong>
          </div>
        </div>

        {/* Monthly Net Surplus / Deficit */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold">চলতি মাসের নিট উদ্বৃত্ত</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className={`mt-2 text-lg sm:text-xl font-bold font-mono ${stats.monthlyNet >= 0 ? 'text-blue-800' : 'text-rose-700'}`}>
            {formatCurrency(stats.monthlyNet, language)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.monthlyNet >= 0 ? '✅ উদ্বৃত্ত তহবিলে যোগ হয়েছে' : '⚠️ ঘাটতি পূর্বের তহবিল থেকে সমন্বিত'}
          </div>
        </div>

        {/* Juma Collections */}
        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-xs hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-xs font-bold">মোট জুমার কালেকশন</span>
            <Banknote className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-teal-800">
            {formatCurrency(stats.totalJuma, language)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>গড় জুমা:</span>
            <strong className="font-mono text-teal-700">{formatCurrency(stats.avgJuma, language)}</strong>
          </div>
        </div>

        {/* Live Total Balance */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl text-white shadow-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-bold">সর্বমোট ক্যাশ ও ব্যাংক</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-amber-300">
            {formatCurrency(stats.totalBalance, language)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>সচল হিসাব:</span>
            <strong className="text-slate-200">{accounts.length} টি অ্যাকাউন্ট</strong>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar (Applicable to Income, Expense, Juma, Donations) */}
      {activeTab !== 'analytics' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-search-income-expense"
                type="text"
                placeholder="ভাউচার নং, দাতা/প্রাপকের নাম, মোবাইল বা বিবরণ খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Period Filter */}
            <div>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">সকল সময়ের লেনদেন</option>
                <option value="TODAY">আজকের লেনদেন</option>
                <option value="THIS_WEEK">চলতি সপ্তাহের</option>
                <option value="THIS_MONTH">চলতি মাসের</option>
                <option value="THIS_YEAR">চলতি বছরের</option>
                <option value="CUSTOM">কাস্টম তারিখ পরিসীমা</option>
              </select>
            </div>

            {/* Head Filter */}
            <div>
              <select
                value={headFilter}
                onChange={(e) => setHeadFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">সকল হিসাবের খাত</option>
                {(activeTab === 'expense' ? expenseMainHeads : incomeMainHeads).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nameBn}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">সকল ভাউচার অবস্থা</option>
                <option value="APPROVED">অনুমোদিত (APPROVED)</option>
                <option value="CANCELLED">বাতিলকৃত (CANCELLED)</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs if CUSTOM selected */}
          {periodFilter === 'CUSTOM' && (
            <div className="flex items-center space-x-3 pt-2 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-600">তারিখ শুরু:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <span className="font-semibold text-slate-600">থেকে শেষ:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* 4. Tab Content Renders */}

      {/* TAB 1: INCOME LEDGER */}
      {activeTab === 'income' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>আয় ও প্রাপ্তি রেজিস্টার ({filteredIncomes.length} টি ভাউচার)</span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-lg">
              ফিল্টার অনুযায়ী মোট আয়: {formatCurrency(filteredIncomes.filter(i => i.status === 'APPROVED').reduce((s, i) => s + i.amount, 0), language)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">ভাউচার নম্বর</th>
                  <th className="px-5 py-3.5">তারিখ</th>
                  <th className="px-5 py-3.5">খাত ও বিবরণ</th>
                  <th className="px-5 py-3.5">দানশীল / দাতার নাম</th>
                  <th className="px-5 py-3.5">হিসাব ও মাধ্যম</th>
                  <th className="px-5 py-3.5 text-right">পরিমাণ (৳)</th>
                  <th className="px-5 py-3.5 text-center">অবস্থা</th>
                  <th className="px-5 py-3.5 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                {filteredIncomes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      কোনো আয় ভাউচার পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredIncomes.map((item) => (
                    <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">
                        <span className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{item.voucherNumber}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {formatDate(item.date, language)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{item.mainHeadNameBn}</div>
                        {item.subHeadNameBn && (
                          <div className="text-[11px] text-slate-500">{item.subHeadNameBn}</div>
                        )}
                        {item.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{item.donorName || 'সম্মানিত দানশীল'}</div>
                        {item.donorPhone && <div className="text-[10px] font-mono text-slate-400">{item.donorPhone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{item.accountName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {t[item.paymentMethod as keyof typeof t] || item.paymentMethod}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-emerald-700">
                        + {formatCurrency(item.amount, language)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-700 line-through'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t[item.status as keyof typeof t] || item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        {item.denominationData && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDenominationDetail(item.denominationData || null);
                              setActiveDenominationRef(item.voucherNumber);
                              setActiveDenominationRecordId(item.id);
                              setIsDenominationDetailOpen(true);
                            }}
                            className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                            title="ভাংতি ও ক্যাশ নোট বিবরণী স্লিপ"
                          >
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}

                        <button
                          onClick={() => onPrintVoucher(item, 'INCOME', 'POS_80', true)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="POS থার্মাল রসিদ (80mm/58mm)"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        <button
                          onClick={() => onPrintVoucher(item, 'INCOME', 'A4', true)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="অফিসিয়াল A4 ভাউচার প্রিন্ট"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {onSendSms && item.donorPhone && (
                          <button
                            onClick={() => setSmsItem({ item, type: 'INCOME' })}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="এসএমএস পাঠান"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => setEditingItem({ item, type: 'INCOME' })}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="সংশোধন / এডিট"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() =>
                              setReversalTarget({
                                id: item.id,
                                voucherNumber: item.voucherNumber,
                                type: 'INCOME',
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="বাতিল ও রিভার্সাল"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSE LEDGER */}
      {activeTab === 'expense' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              <span>ব্যয় ও পরিশোধ রেজিস্টার ({filteredExpenses.length} টি ভাউচার)</span>
            </div>
            <div className="text-xs font-mono font-bold text-rose-900 bg-rose-100 px-3 py-1 rounded-lg">
              ফিল্টার অনুযায়ী মোট ব্যয়: {formatCurrency(filteredExpenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0), language)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">ভাউচার নম্বর</th>
                  <th className="px-5 py-3.5">তারিখ</th>
                  <th className="px-5 py-3.5">ব্যয়ের খাত ও বিবরণ</th>
                  <th className="px-5 py-3.5">প্রাপক / সরবরাহকারী</th>
                  <th className="px-5 py-3.5">পরিশোধ হিসাব ও মাধ্যম</th>
                  <th className="px-5 py-3.5 text-right">পরিমাণ (৳)</th>
                  <th className="px-5 py-3.5 text-center">অবস্থা</th>
                  <th className="px-5 py-3.5 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      কোনো ব্যয় ভাউচার পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((item) => (
                    <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">
                        <span className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>{item.voucherNumber}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {formatDate(item.date, language)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{item.mainHeadNameBn}</div>
                        {item.subHeadNameBn && (
                          <div className="text-[11px] text-slate-500">{item.subHeadNameBn}</div>
                        )}
                        {item.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{item.payeeName || 'সাধারণ'}</div>
                        {item.payeePhone && <div className="text-[10px] font-mono text-slate-400">{item.payeePhone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{item.accountName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {t[item.paymentMethod as keyof typeof t] || item.paymentMethod}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-rose-700">
                        - {formatCurrency(item.amount, language)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-700 line-through'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t[item.status as keyof typeof t] || item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => onPrintVoucher(item, 'EXPENSE', 'POS_80', true)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="POS থার্মাল রসিদ (80mm/58mm)"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        <button
                          onClick={() => onPrintVoucher(item, 'EXPENSE', 'A4', true)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="অফিসিয়াল A4 ভাউচার প্রিন্ট"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {onSendSms && item.payeePhone && (
                          <button
                            onClick={() => setSmsItem({ item, type: 'EXPENSE' })}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="এসএমএস পাঠান"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => setEditingItem({ item, type: 'EXPENSE' })}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="সংশোধন / এডিট"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() =>
                              setReversalTarget({
                                id: item.id,
                                voucherNumber: item.voucherNumber,
                                type: 'EXPENSE',
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="বাতিল ও রিভার্সাল"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: JUMA DAY COLLECTIONS */}
      {activeTab === 'juma' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start space-x-2">
                <span>🕌 পবিত্র জুমার দিনের জামাত কালেকশন রেজিস্টার</span>
              </h3>
              <p className="text-xs text-teal-100/90">
                প্রতি জুমার দিনে মুসল্লিদের স্বতঃস্ফূর্ত দান, ক্যাশ নোট গণনা ও স্বচ্ছ প্রতিবেদন
              </p>
            </div>
            <button
              onClick={() => setIsJumaModalOpen(true)}
              className="px-5 py-2.5 bg-white hover:bg-teal-50 text-teal-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              <span>নতুন জুমার কালেকশন এন্ট্রি</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-teal-50/70 text-[11px] uppercase tracking-wider text-teal-900 font-bold border-b border-teal-100">
                  <tr>
                    <th className="px-5 py-3.5">ভাউচার নম্বর</th>
                    <th className="px-5 py-3.5">জুমার তারিখ</th>
                    <th className="px-5 py-3.5">উপলক্ষ ও বিবরণ</th>
                    <th className="px-5 py-3.5">জমার হিসাব</th>
                    <th className="px-5 py-3.5 text-center">ক্যাশ নোট ও ভাংতি</th>
                    <th className="px-5 py-3.5 text-right">সংগৃহীত পরিমাণ (৳)</th>
                    <th className="px-5 py-3.5 text-right">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                  {filteredJumaList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        কোনো জুমার কালেকশন রেকর্ড পাওয়া যায়নি। &apos;নতুন জুমার কালেকশন এন্ট্রি&apos; বোতামে ক্লিক করে যুক্ত করুন।
                      </td>
                    </tr>
                  ) : (
                    filteredJumaList.map((item) => (
                      <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {item.voucherNumber}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">
                          {formatDate(item.date, language)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{item.subHeadNameBn || 'পবিত্র জুমার জামাত কালেকশন'}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.description}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800">{item.accountName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.paymentMethod}</div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {item.denominationData ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDenominationDetail(item.denominationData || null);
                                setActiveDenominationRef(item.voucherNumber);
                                setActiveDenominationRecordId(item.id);
                                setIsDenominationDetailOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-100 text-emerald-900 hover:bg-emerald-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 mx-auto transition-colors cursor-pointer"
                            >
                              <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{item.denominationData.totalNotesCount} নোট, {item.denominationData.totalCoinsCount} কয়েন</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">সরাসরি মোট</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-sm text-emerald-700">
                          {formatCurrency(item.amount, language)}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1">
                          <button
                            onClick={() => onPrintVoucher(item, 'INCOME', 'POS_80', true)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="POS থার্মাল রসিদ"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => onPrintVoucher(item, 'INCOME', 'A4', true)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="A4 ভাউচার প্রিন্ট"
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
        </div>
      )}

      {/* TAB 4: GENERAL & PROJECT DONATIONS */}
      {activeTab === 'donations' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start space-x-2">
                <span>🤲 সাধারণ ও বিশেষ প্রকল্প অনুদান রেজিস্টার</span>
              </h3>
              <p className="text-xs text-blue-100/90">
                মসজিদের উন্নয়ন প্রকল্প (যেমন: ছাদ ঢালাই, এসি, ওজুখানা) ও সাধারণ দান
              </p>
            </div>
            <button
              onClick={() => openCreateModal('INCOME')}
              className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>নতুন অনুদান রসিদ প্রস্তুত</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-blue-50/70 text-[11px] uppercase tracking-wider text-blue-900 font-bold border-b border-blue-100">
                  <tr>
                    <th className="px-5 py-3.5">রসিদ / ভাউচার</th>
                    <th className="px-5 py-3.5">তারিখ</th>
                    <th className="px-5 py-3.5">প্রকল্প ও খাত</th>
                    <th className="px-5 py-3.5">দানশীল মুসল্লির নাম</th>
                    <th className="px-5 py-3.5">হিসাব</th>
                    <th className="px-5 py-3.5 text-right">অনুদানের পরিমাণ (৳)</th>
                    <th className="px-5 py-3.5 text-right">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                  {filteredDonationsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        কোনো অনুদান রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDonationsList.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {item.voucherNumber}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {formatDate(item.date, language)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-siliguri mr-1.5">
                            {item.subHeadNameBn || 'সাধারণ দান'}
                          </span>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{item.donorName || 'আল্লাহর বান্দা (গোপন দান)'}</div>
                          {item.donorPhone && <div className="text-[10px] font-mono text-slate-400">{item.donorPhone}</div>}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {item.accountName}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-xs text-emerald-700">
                          {formatCurrency(item.amount, language)}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1">
                          <button
                            onClick={() => onPrintVoucher(item, 'INCOME', 'POS_80', true)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="POS থার্মাল রসিদ"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <button
                            onClick={() => onPrintVoucher(item, 'INCOME', 'A4', true)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="A4 রসিদ প্রিন্ট"
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
        </div>
      )}

      {/* TAB 5: FINANCIAL SUMMARY & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income by Head Distribution */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>খাতভিত্তিক আয়ের বিবরণী</span>
              </h3>
              <div className="space-y-3">
                {incomeMainHeads.map((head) => {
                  const headTotal = incomes
                    .filter((i) => i.mainHeadId === head.id && i.status === 'APPROVED')
                    .reduce((s, i) => s + i.amount, 0);
                  const percentage = stats.totalIncomeAll > 0 ? Math.round((headTotal / stats.totalIncomeAll) * 100) : 0;
                  return (
                    <div key={head.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-800">
                        <span>{head.nameBn}</span>
                        <span className="font-mono">{formatCurrency(headTotal, language)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense by Head Distribution */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>খাতভিত্তিক ব্যয়ের বিবরণী</span>
              </h3>
              <div className="space-y-3">
                {expenseMainHeads.map((head) => {
                  const headTotal = expenses
                    .filter((e) => e.mainHeadId === head.id && e.status === 'APPROVED')
                    .reduce((s, e) => s + e.amount, 0);
                  const percentage = stats.totalExpenseAll > 0 ? Math.round((headTotal / stats.totalExpenseAll) * 100) : 0;
                  return (
                    <div key={head.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-800">
                        <span>{head.nameBn}</span>
                        <span className="font-mono">{formatCurrency(headTotal, language)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Complete A4 Statement Trigger Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold">অফিসিয়াল মাসিক ও বার্ষিক আয়-ব্যয় অডিট রিপোর্ট (A4)</h4>
              <p className="text-xs text-slate-300 mt-1">
                সভাপতি ও সাধারণ সম্পাদকের অনুমোদিত স্বাক্ষর ও পূর্ণাঙ্গ হিসাব সহ A4 পেপারে প্রিন্ট বা PDF ডাউনলোড করুন
              </p>
            </div>
            <button
              onClick={() => setIsQuickReportOpen(true)}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>রিপোর্ট তৈরি ও প্রিন্ট করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE INCOME / EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[92vh] font-siliguri my-auto">
            <div
              className={`p-4 sm:p-5 text-white flex items-center justify-between ${
                modalType === 'INCOME' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                {modalType === 'INCOME' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                <h3 className="font-bold text-sm sm:text-base">
                  {modalType === 'INCOME' ? '➕ নতুন আয় ও প্রাপ্তি ভাউচার' : '➖ নতুন ব্যয় ও পরিশোধ ভাউচার'}
                </h3>
              </div>
              <button
                id="btn-close-voucher-modal"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleFormSubmit(e, 'SAVE_AND_PRINT')} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.date} *</label>
                  <input
                    id="input-voucher-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Amount with Denomination Counter for Income Only */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">{t.amount} *</label>
                    {modalType === 'INCOME' && (
                      <button
                        type="button"
                        id="btn-income-change-counter"
                        onClick={() => setIsCalculatorOpen(true)}
                        className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="ভাংতি টাকা ও ক্যাশ নোট গণনা"
                      >
                        <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ভাংতি গণনা</span>
                      </button>
                    )}
                  </div>
                  <input
                    id="input-voucher-amount"
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Denomination Info Badge if attached */}
              {modalType === 'INCOME' && incomeDenominationData && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center space-x-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span>ক্যাশ নোট ও ভাংতি গণনা সংযুক্ত</span>
                      <div className="text-[11px] font-mono text-emerald-700">
                        {incomeDenominationData.totalNotesCount} নোট, {incomeDenominationData.totalCoinsCount} কয়েন = ৳{incomeDenominationData.grandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCalculatorOpen(true)}
                      className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      পুনঃগণনা
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncomeDenominationData(null)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Dependent Account Heads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.mainHead} *</label>
                  <select
                    id="select-voucher-mainhead"
                    value={mainHeadId}
                    onChange={(e) => {
                      setMainHeadId(e.target.value);
                      setSubHeadId('');
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {activeMainHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.subHead}</label>
                  <select
                    id="select-voucher-subhead"
                    value={subHeadId}
                    onChange={(e) => setSubHeadId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="">-- প্রযোজ্য নয় / সাধারণ --</option>
                    {activeSubHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Financial Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.paymentMethod}</label>
                  <select
                    id="select-voucher-paymethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="CASH">ক্যাশ / নগদ</option>
                    <option value="BANK">ব্যাংক অ্যাকাউন্ট</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket)</option>
                    <option value="ONLINE">অনলাইন গেটওয়ে</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.account} *</label>
                  <select
                    id="select-voucher-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn} (স্থিতি: {formatCurrency(acc.currentBalance, language)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Person / Payee / Donor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {modalType === 'INCOME' ? 'দানশীল / দাতার নাম' : 'প্রাপক / সুবিধাভোগীর নাম'}
                  </label>
                  <input
                    id="input-voucher-person"
                    type="text"
                    placeholder={modalType === 'INCOME' ? 'দাতার নাম' : 'প্রাপকের নাম'}
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর (SMS এর জন্য)</label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={personPhone}
                    onChange={(e) => setPersonPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.reference}</label>
                <input
                  id="input-voucher-ref"
                  type="text"
                  placeholder="e.g. স্লিপ নং / চেক নং / মেমো নং / TRX ID"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.description}</label>
                <textarea
                  id="input-voucher-desc"
                  rows={2}
                  placeholder="বিস্তারিত বিবরণ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              {/* Google Drive Document / Voucher URL Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  গুগল ড্রাইভ লিংক / ভাউচার ফাইল URL (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white outline-hidden"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-only"
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleFormSubmit(e, 'SAVE_ONLY')}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  {isSubmitting ? 'প্রক্রিয়াধীন...' : 'শুধু সংরক্ষণ'}
                </button>
                <button
                  id="btn-save-voucher"
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    modalType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'প্রক্রিয়াধীন...' : 'সংরক্ষণ ও প্রিন্ট (POS)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JUMA COLLECTION DEDICATED MODAL */}
      <JumaCollectionModal
        isOpen={isJumaModalOpen}
        onClose={() => setIsJumaModalOpen(false)}
        accounts={accounts}
        accountHeads={accountHeads}
        currentMosque={currentMosque}
        language={language}
        onSaveJumaCollection={async (payload, opts) => {
          await onAddIncome(
            {
              mainHeadId: 'head-inc-01',
              subHeadId: 'head-inc-01-2',
              amount: payload.amount,
              paymentMethod: payload.paymentMethod,
              accountId: payload.accountId,
              donorName: payload.donorName,
              reference: payload.reference,
              description: payload.description,
              date: payload.date,
              denominationData: payload.denominationData,
            },
            opts
          );
        }}
      />

      {/* REVERSAL MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150 font-siliguri">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">ভাউচার বাতিল ও রিভার্সাল</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিতভাবে ভাউচার নম্বর{' '}
              <strong className="font-mono text-slate-900">{reversalTarget.voucherNumber}</strong> বাতিল ও
              রিভার্স করতে চান? এর ফলে সংশ্লিষ্ট অ্যাকাউন্টের ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে।
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                বাতিলের কারণ / অডিট মন্তব্য *
              </label>
              <input
                id="input-reversal-reason"
                type="text"
                placeholder="e.g. ভুল এন্ট্রি / চেক বাউন্স"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-reversal"
                onClick={handleConfirmReversal}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE CALCULATOR MODAL */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyTotal={(tot, data) => {
          setAmount(tot.toString());
          if (data) setIncomeDenominationData(data);
        }}
        initialData={incomeDenominationData}
        expectedAmount={Number(amount) || undefined}
        collectionType="INCOME"
        reference={reference || (personName ? `আদায় - ${personName}` : 'ক্যাশ আদায়')}
        mosque={currentMosque}
        language={language}
      />

      {/* DENOMINATION DETAIL & AUDIT SLIP MODAL */}
      <DenominationDetailModal
        isOpen={isDenominationDetailOpen}
        onClose={() => setIsDenominationDetailOpen(false)}
        denominationData={activeDenominationDetail}
        referenceId={activeDenominationRef}
        sourceType="INCOME"
        mosque={currentMosque || null}
        language={language}
        onSaveUpdatedDenomination={async (updatedData, editReason) => {
          if (!activeDenominationRecordId) return;
          try {
            await api.updateIncomeDenomination(activeDenominationRecordId, updatedData, editReason);
            setActiveDenominationDetail(updatedData);
            alert('ভাংতি ও ক্যাশ নোট গণনা বিবরণী সফলভাবে সংরক্ষিত হয়েছে।');
          } catch (err: any) {
            alert(err.message || 'ডিনোমিনেশন হালনাগাদ করতে ব্যর্থ হয়েছে।');
            throw err;
          }
        }}
        canEdit={true}
      />

      {/* EDIT TRANSACTION MODAL */}
      {editingItem && (
        <EditTransactionModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          transaction={editingItem.item}
          type={editingItem.type}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
          onSave={async (id, data) => {
            if (editingItem.type === 'INCOME' && onUpdateIncome) {
              await onUpdateIncome(id, data);
            } else if (editingItem.type === 'EXPENSE' && onUpdateExpense) {
              await onUpdateExpense(id, data);
            }
          }}
        />
      )}

      {/* SMS PREVIEW MODAL */}
      {smsItem && onSendSms && (
        <SmsPreviewModal
          isOpen={!!smsItem}
          onClose={() => setSmsItem(null)}
          recipientPhone={
            ('donorPhone' in smsItem.item
              ? (smsItem.item as any).donorPhone
              : (smsItem.item as any).payeePhone) || ''
          }
          donorOrPayeeName={
            'donorName' in smsItem.item
              ? smsItem.item.donorName
              : (smsItem.item as ExpenseEntry).payeeName
          }
          amount={smsItem.item.amount}
          voucherNumber={smsItem.item.voucherNumber}
          documentType={smsItem.type === 'INCOME' ? 'INCOME_VOUCHER' : 'EXPENSE_VOUCHER'}
          documentId={smsItem.item.id}
          mosque={currentMosque}
          language={language}
          onSendSms={onSendSms}
        />
      )}

      {/* QUICK INCOME / EXPENSE REPORT & A4 PRINT MODAL */}
      <QuickIncomeExpenseReportModal
        isOpen={isQuickReportOpen}
        onClose={() => setIsQuickReportOpen(false)}
        type={activeTab === 'expense' ? 'EXPENSE' : 'INCOME'}
        incomes={incomes}
        expenses={expenses}
        accounts={accounts}
        accountHeads={accountHeads}
        currentMosque={currentMosque}
        currentUser={currentUser}
        language={language}
        initialStatus={statusFilter}
      />
    </div>
  );
};

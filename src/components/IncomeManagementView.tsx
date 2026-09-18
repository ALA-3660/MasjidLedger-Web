import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownLeft,
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
  HeartHandshake,
  TrendingUp,
  Box,
  Eye,
  Wallet,
  Landmark,
  Building,
  Users,
  Download,
  ChevronRight,
  Menu,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';
import {
  IncomeEntry,
  AccountHead,
  FinancialAccount,
  PaymentMethod,
  User,
  Mosque,
  CashDenominationData,
  Donation,
  DonationBox,
  DonationBoxCollection,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { DenominationDetailModal } from './DenominationDetailModal';
import { EditTransactionModal } from './EditModals';
import { SmsPreviewModal } from './SmsPreviewModal';
import { JumaCollectionModal } from './JumaCollectionModal';
import { DonationView } from './DonationView';
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

export type IncomeSecondaryTab =
  | 'income_overview'
  | 'juma'
  | 'donations'
  | 'donation_boxes'
  | 'register'
  | 'analytics'
  | 'reports';

interface IncomeManagementViewProps {
  initialTab?: IncomeSecondaryTab;
  onNavigateTab?: (tab: string) => void;
  incomes: IncomeEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  donations?: Donation[];
  donationBoxes?: DonationBox[];
  boxCollections?: DonationBoxCollection[];
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  scannedActionIntent?: QrScanResult | null;
  onClearScannedAction?: () => void;
  onAddIncome: (data: any, options?: { print?: boolean; format?: 'A4' | 'POS_80' | 'POS_58' }) => Promise<any>;
  onUpdateIncome?: (id: string, data: any) => Promise<void>;
  onReverseIncome: (id: string, reason: string) => Promise<void>;
  onAddDonation?: (data: any) => Promise<Donation>;
  onCollectBox?: (data: any) => Promise<void>;
  onAddDonationBox?: (data: any) => Promise<void>;
  onUpdateDonationBox?: (id: string, data: any) => Promise<void>;
  onPrintReceipt?: (donation: Donation, format?: 'A4' | 'POS_80' | 'POS_58', isReprint?: boolean) => void;
  onPrintVoucher: (
    item: IncomeEntry,
    type: 'INCOME',
    format?: 'A4' | 'POS_80' | 'POS_58',
    isReprint?: boolean
  ) => void;
  onSendSms?: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

export const IncomeManagementView: React.FC<IncomeManagementViewProps> = ({
  initialTab = 'income_overview',
  onNavigateTab,
  incomes,
  accountHeads,
  accounts,
  donations = [],
  donationBoxes = [],
  boxCollections = [],
  currentUser,
  currentMosque,
  language = 'bn',
  scannedActionIntent,
  onClearScannedAction,
  onAddIncome,
  onUpdateIncome,
  onReverseIncome,
  onAddDonation,
  onCollectBox,
  onAddDonationBox,
  onUpdateDonationBox,
  onPrintReceipt,
  onPrintVoucher,
  onSendSms,
}) => {
  const t = translations[language] || translations.bn;
  const [activeTab, setActiveTab] = useState<IncomeSecondaryTab>(initialTab);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync initialTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSubTabChange = (tabId: IncomeSecondaryTab) => {
    setActiveTab(tabId);
    setIsMobileDrawerOpen(false);
    const tabMap: Record<IncomeSecondaryTab, string> = {
      income_overview: 'income',
      juma: 'income_juma',
      donations: 'donations',
      donation_boxes: 'donationBox',
      register: 'income_register',
      analytics: 'income_analytics',
      reports: 'income_reports',
    };
    if (onNavigateTab && tabMap[tabId]) {
      onNavigateTab(tabMap[tabId]);
    }
  };

  // Handle QR scanned actions
  useEffect(() => {
    if (!scannedActionIntent) return;
    if (scannedActionIntent.actionKey === 'ACT-INC-NEW' || (scannedActionIntent.actionKey as string) === 'ACT_INC_NEW') {
      setActiveTab('income_overview');
      openCreateModal();
      onClearScannedAction?.();
    }
  }, [scannedActionIntent]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJumaModalOpen, setIsJumaModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeEntry | null>(null);
  const [smsItem, setSmsItem] = useState<IncomeEntry | null>(null);
  const [isDenominationDetailOpen, setIsDenominationDetailOpen] = useState(false);
  const [activeDenominationDetail, setActiveDenominationDetail] = useState<CashDenominationData | null>(null);
  const [activeDenominationRef, setActiveDenominationRef] = useState('');
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);

  // Reversal Modal State
  const [reversalTarget, setReversalTarget] = useState<IncomeEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Create Form State
  const incomeMainHeads = useMemo(
    () => accountHeads.filter((h) => h.type === 'INCOME' && !h.parentId),
    [accountHeads]
  );
  const [mainHeadId, setMainHeadId] = useState(incomeMainHeads[0]?.id || '');
  const [subHeadId, setSubHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [incomeDenominationData, setIncomeDenominationData] = useState<CashDenominationData | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSubHeads = useMemo(
    () => accountHeads.filter((h) => h.parentId === mainHeadId),
    [accountHeads, mainHeadId]
  );

  const openCreateModal = () => {
    setMainHeadId(incomeMainHeads[0]?.id || '');
    setSubHeadId('');
    setAmount('');
    setPaymentMethod('CASH');
    setAccountId(accounts[0]?.id || '');
    setDonorName('');
    setDonorPhone('');
    setReference('');
    setDescription('');
    setAttachmentUrl('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setIncomeDenominationData(null);
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
    if (incomeDenominationData && incomeDenominationData.grandTotal !== num) {
      setFormError(
        `নোট গণনা মোট (৳${incomeDenominationData.grandTotal.toLocaleString('en-IN')}) এবং ভাউচারের টাকার পরিমাণ (৳${num.toLocaleString('en-IN')}) সমান হতে হবে।`
      );
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
        donorName,
        donorPhone,
        reference,
        description,
        attachmentUrl,
        date: entryDate,
        denominationData: incomeDenominationData || undefined,
      };

      const res = await onAddIncome(payload, { print: printVoucher, format: 'POS_80' });
      setIsCreateModalOpen(false);
      if (printVoucher && res) {
        onPrintVoucher(res, 'INCOME', 'POS_80', false);
      }
    } catch (err: any) {
      setFormError(err.message || 'আয় এন্ট্রি সংরক্ষণ ব্যর্থ হয়েছে');
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
      await onReverseIncome(reversalTarget.id, reversalReason.trim());
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

    let totalIncomeAll = 0;
    let monthlyIncome = 0;
    let todayIncome = 0;
    let monthlyDonations = 0;
    let totalJuma = 0;
    let totalWaqfRent = 0;

    incomes.forEach((inc) => {
      if (inc.status === 'CANCELLED') return;
      const d = inc.date ? inc.date.slice(0, 10) : '';
      const amt = Number(inc.amount) || 0;
      totalIncomeAll += amt;

      if (d === todayStr) {
        todayIncome += amt;
      }
      if (d.startsWith(currentMonthStr)) {
        monthlyIncome += amt;
      }

      // Identify Juma, Donation, Waqf
      const headName = (inc.mainHeadNameBn || '').toLowerCase();
      const desc = (inc.description || '').toLowerCase();
      if (headName.includes('জুমা') || desc.includes('জুমা') || inc.reference?.includes('JUMA')) {
        totalJuma += amt;
      }
      if (headName.includes('দান') || desc.includes('দান') || headName.includes('অনুদান')) {
        if (d.startsWith(currentMonthStr)) {
          monthlyDonations += amt;
        }
      }
      if (headName.includes('ভাড়া') || headName.includes('দোকান') || headName.includes('ওয়াকফ') || desc.includes('ভাড়া')) {
        totalWaqfRent += amt;
      }
    });

    // Also include external donation records if passed
    donations.forEach((don) => {
      const amt = Number(don.amount) || 0;
      const d = don.date ? don.date.slice(0, 10) : '';
      if (d.startsWith(currentMonthStr)) {
        monthlyDonations += amt;
      }
    });

    return {
      totalIncomeAll,
      monthlyIncome,
      todayIncome,
      monthlyDonations,
      totalJuma,
      totalWaqfRent,
      totalCount: incomes.length,
    };
  }, [incomes, donations]);

  // Juma collections derived from incomes + collections
  const jumaIncomeRecords = useMemo(() => {
    return incomes.filter((inc) => {
      const head = (inc.mainHeadNameBn || '').toLowerCase();
      const desc = (inc.description || '').toLowerCase();
      const ref = (inc.reference || '').toLowerCase();
      return head.includes('জুমা') || desc.includes('জুমা') || ref.includes('juma');
    });
  }, [incomes]);

  // ===================== REGISTER & REPORTING ENGINE =====================
  const [reportFilterState, setReportFilterState] = useState<DateFilterState>(getDefaultDateFilterState());
  const [registerSearch, setRegisterSearch] = useState('');
  const [registerStatus, setRegisterStatus] = useState('ALL');
  const [registerHeadId, setRegisterHeadId] = useState('ALL');
  const [registerAccountId, setRegisterAccountId] = useState('ALL');

  const effectiveDates = useMemo(() => resolveEffectiveDates(reportFilterState), [reportFilterState]);

  // Filtered Incomes used for BOTH screen table, print, and excel
  const filteredIncomes = useMemo(() => {
    let list = filterByDateRange<IncomeEntry>(incomes, effectiveDates.startDate, effectiveDates.endDate);

    if (registerSearch.trim()) {
      const q = registerSearch.toLowerCase();
      list = list.filter(
        (i) =>
          i.voucherNumber?.toLowerCase().includes(q) ||
          i.donorName?.toLowerCase().includes(q) ||
          i.mainHeadNameBn?.toLowerCase().includes(q) ||
          i.subHeadNameBn?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.reference?.toLowerCase().includes(q)
      );
    }

    if (registerStatus !== 'ALL') {
      list = list.filter((i) => i.status === registerStatus);
    }

    if (registerHeadId !== 'ALL') {
      list = list.filter((i) => i.mainHeadId === registerHeadId || i.subHeadId === registerHeadId);
    }

    if (registerAccountId !== 'ALL') {
      list = list.filter((i) => i.accountId === registerAccountId);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, effectiveDates, registerSearch, registerStatus, registerHeadId, registerAccountId]);

  const filteredTotalAmount = useMemo(
    () => filteredIncomes.reduce((s, i) => (i.status === 'CANCELLED' ? s : s + (Number(i.amount) || 0)), 0),
    [filteredIncomes]
  );

  // Excel (.xlsx) Exporter
  const handleExportExcel = () => {
    exportToXlsx<IncomeEntry>({
      filename: `আয়_বিবরণী_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'আয় ও প্রাপ্তি',
      mosqueName: currentMosque?.nameBn || currentMosque?.name || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট',
      reportTitle: 'আয় ও প্রাপ্তি বিবরণী প্রতিবেদন',
      periodLabel: effectiveDates.labelBn,
      columns: [
        { header: 'ভাউচার নং', accessor: (i) => i.voucherNumber },
        { header: 'তারিখ', accessor: (i) => formatDate(i.date) },
        { header: 'খাত', accessor: (i) => `${i.mainHeadNameBn}${i.subHeadNameBn ? ` / ${i.subHeadNameBn}` : ''}` },
        { header: 'বিবরণ', accessor: (i) => i.description || '-' },
        { header: 'দানশীল / দাতা', accessor: (i) => i.donorName || '-' },
        { header: 'হিসাব / মাধ্যম', accessor: (i) => `${i.accountName} (${i.paymentMethod})` },
        { header: 'পরিমাণ (৳)', accessor: (i) => Number(i.amount) || 0 },
        { header: 'অবস্থা', accessor: (i) => (i.status === 'CANCELLED' ? 'বাতিলকৃত' : 'অনুমোদিত') },
        { header: 'রেফারেন্স / নোট', accessor: (i) => i.reference || '-' },
      ],
      data: filteredIncomes,
      summaryRows: [
        { label: 'মোট রেকর্ড সংখ্যা', value: `${filteredIncomes.length} টি` },
        { label: 'সর্বমোট অনুমোদিত আয়', value: `৳ ${filteredTotalAmount.toLocaleString('en-IN')}` },
      ],
    });
  };

  // Report Preview Columns Definition
  const reportColumns: ReportColumn<IncomeEntry>[] = [
    {
      header: 'ভাউচার নং',
      className: 'font-mono font-bold text-slate-900',
      render: (i) => i.voucherNumber,
    },
    {
      header: 'তারিখ',
      className: 'font-mono text-slate-600',
      render: (i) => formatDate(i.date),
    },
    {
      header: 'খাত',
      className: 'font-medium text-slate-900',
      render: (i) => (
        <div>
          <div>{i.mainHeadNameBn}</div>
          {i.subHeadNameBn && <div className="text-[10px] text-slate-500">{i.subHeadNameBn}</div>}
        </div>
      ),
    },
    {
      header: 'বিবরণ',
      className: 'text-slate-700',
      render: (i) => i.description || '-',
    },
    {
      header: 'দাতা / পার্টি',
      className: 'text-slate-800 font-medium',
      render: (i) => i.donorName || '-',
    },
    {
      header: 'হিসাব / মাধ্যম',
      className: 'text-slate-600 text-[11px]',
      render: (i) => `${i.accountName} (${i.paymentMethod})`,
    },
    {
      header: 'পরিমাণ (৳)',
      className: 'text-right font-mono font-bold text-emerald-700',
      render: (i) => (
        <span className={i.status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>
          ৳ {Number(i.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'অবস্থা',
      className: 'text-center',
      render: (i) => (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
            i.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {i.status === 'CANCELLED' ? 'বাতিল' : 'অনুমোদিত'}
        </span>
      ),
    },
  ];

  // Secondary Sidebar items definition
  const sidebarItems: { id: IncomeSecondaryTab; label: string; icon: any; count?: number; badgeColor?: string }[] = [
    { id: 'income_overview', label: '📥 আয় ও প্রাপ্তি', icon: ArrowDownLeft },
    { id: 'juma', label: '🕌 জুমার কালেকশন', icon: Banknote, count: jumaIncomeRecords.length, badgeColor: 'bg-teal-100 text-teal-800' },
    { id: 'donations', label: '🤲 দান ও অনুদান', icon: HeartHandshake, count: donations.length, badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'donation_boxes', label: '📦 দানবাক্স কালেকশন', icon: Box, count: donationBoxes.length, badgeColor: 'bg-purple-100 text-purple-800' },
    { id: 'register', label: '📊 আয় রেজিস্টার', icon: Layers, count: incomes.length, badgeColor: 'bg-slate-100 text-slate-800' },
    { id: 'analytics', label: '📈 আয় বিশ্লেষণ', icon: TrendingUp },
    { id: 'reports', label: '🖨️ রিপোর্ট ও প্রিন্ট', icon: Printer },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Page Header (No "Module 8" - direct title) */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                💵 আয় ও প্রাপ্তি ব্যবস্থাপনা
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের আয় ও প্রাপ্তি, জুমার কালেকশন, দান ও পূর্ণাঙ্গ হিসাব রেজিস্টার
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
              id="btn-add-income-main"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ আয় এন্ট্রি</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <span>মেনু:</span>
          <strong className="text-emerald-700">
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
            আয় ও প্রাপ্তি মেনু
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSubTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
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
                          ? 'bg-emerald-700 text-white'
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
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
              <span className="font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>অ্যাকাউন্টিং নীতি:</span>
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                টাকা এসেছে &rarr; আয় ও প্রাপ্তি। প্রতিটি বৈধ আয় এন্ট্রি সরাসরি ক্যাশ বা সংশ্লিষ্ট ব্যাংক হিসেবে যুক্ত হয়।
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="lg:col-span-9 space-y-5">
          {/* ==================== SUBTAB 1: INCOME OVERVIEW / DASHBOARD ==================== */}
          {activeTab === 'income_overview' && (
            <div className="space-y-5">
              {/* Income Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Monthly Total Income */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">চলতি মাসের মোট আয়</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-700">
                    {formatCurrency(stats.monthlyIncome, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    চলতি মাসে সংগৃহীত মোট প্রাপ্তি
                  </div>
                </div>

                {/* 2. Today's Total Income */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">আজকের মোট আয়</span>
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-900">
                    {formatCurrency(stats.todayIncome, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    আজকের তারিখে এন্ট্রি হওয়া আয়
                  </div>
                </div>

                {/* 3. Monthly Donations */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">চলতি মাসের মোট দান</span>
                    <HeartHandshake className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-blue-700">
                    {formatCurrency(stats.monthlyDonations, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    সাধারণ ও প্রকল্প ভিত্তিক দান
                  </div>
                </div>

                {/* 4. Total Juma Collections */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">মোট জুমার কালেকশন</span>
                    <Banknote className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-teal-700">
                    {formatCurrency(stats.totalJuma, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    জুমার দিনের বক্স ও সাধারণ কালেকশন
                  </div>
                </div>

                {/* 5. Total Waqf / Rent Income */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold">মোট ওয়াকফ/ভাড়া আয়</span>
                    <Building className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-700">
                    {formatCurrency(stats.totalWaqfRent, language)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    দোকান ও সম্পত্তি হতে প্রাপ্ত ভাড়া
                  </div>
                </div>

                {/* 6. Grand Total Income */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 sm:p-5 rounded-2xl text-white shadow-sm">
                  <div className="flex items-center justify-between text-emerald-100">
                    <span className="text-xs font-bold">সর্বমোট আয়</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black font-mono">
                    {formatCurrency(stats.totalIncomeAll, language)}
                  </div>
                  <div className="text-[11px] text-emerald-100 mt-1">
                    মোট {incomes.length} টি ভাউচার রেকর্ড
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Receipts Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">সাম্প্রতিক আয় ও প্রাপ্তিসমূহ</h3>
                    <p className="text-xs text-slate-500">সর্বশেষ অন্তর্ভুক্ত ভাউচার ও রসিদ</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>সকল আয় রেজিস্টার দেখুন</span>
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
                        <th className="px-3 py-2.5">দাতা / বিবরণ</th>
                        <th className="px-3 py-2.5">হিসাব</th>
                        <th className="px-3 py-2.5 text-right">পরিমাণ (৳)</th>
                        <th className="px-3 py-2.5 text-center">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incomes.slice(0, 7).map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                            {inc.voucherNumber}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            {formatDate(inc.date)}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {inc.mainHeadNameBn}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {inc.donorName || inc.description || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                            {inc.accountName}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                            ৳ {Number(inc.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => onPrintVoucher(inc, 'INCOME', 'POS_80', true)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg cursor-pointer"
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

          {/* ==================== SUBTAB 2: JUMA COLLECTION ==================== */}
          {activeTab === 'juma' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Banknote className="w-5 h-5 text-teal-600" />
                    <span>🕌 জুমার কালেকশন ও হিসাব রেজিস্টার</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    প্রতি শুক্রবারের জুমার দিনের বক্স কালেকশন, দানশীলদের নগদ প্রাপ্তি ও হিসাব
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsReportPreviewOpen(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>🖨️ জুমার রিপোর্ট প্রিন্ট</span>
                  </button>
                  <button
                    onClick={() => setIsJumaModalOpen(true)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন জুমা কালেকশন এন্ট্রি</span>
                  </button>
                </div>
              </div>

              {/* Juma KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">মোট জুমার কালেকশন</span>
                  <div className="text-xl font-black font-mono text-teal-700 mt-1">
                    {formatCurrency(stats.totalJuma, language)}
                  </div>
                  <span className="text-[11px] text-slate-400">সর্বমোট রেকর্ডকৃত জুমা</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">মোট জুমার সংখ্যা</span>
                  <div className="text-xl font-black font-mono text-slate-900 mt-1">
                    {jumaIncomeRecords.length} টি জুমা
                  </div>
                  <span className="text-[11px] text-slate-400">হিসাবভুক্ত শুক্রবার</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">গড় জুমা কালেকশন</span>
                  <div className="text-xl font-black font-mono text-blue-700 mt-1">
                    ৳{' '}
                    {jumaIncomeRecords.length > 0
                      ? Math.round(stats.totalJuma / jumaIncomeRecords.length).toLocaleString('en-IN')
                      : 0}
                  </div>
                  <span className="text-[11px] text-slate-400">প্রতি জুমার গড় কালেকশন</span>
                </div>
              </div>

              {/* Double-counting Prevention Accounting Notice */}
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-teal-950 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-teal-900">জুমার কালেকশন হিসাব নীতি ও পোস্টিং:</span>
                  <p className="text-[11px] text-teal-800 leading-relaxed mt-0.5">
                    প্রতি শুক্রবারের জুমার জামাতে সংগৃহীত দান অনুমোদিত ভাউচার মূলে কেন্দ্রীয় ক্যাশ হিসেবে ক্রেডিট হয়। একই অর্থ পুনরায় সাধারণ দান বা ভিন্ন খাতে এন্ট্রি করা নিষিদ্ধ।
                  </p>
                </div>
              </div>

              {/* Juma Records Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">জুমার দিনের রেকর্ডসমূহ</span>
                  <span className="text-xs font-mono text-slate-500">মোট {jumaIncomeRecords.length} টি</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">তারিখ</th>
                        <th className="px-4 py-3">ভাউচার নং</th>
                        <th className="px-4 py-3">বিবরণ / পর্ব</th>
                        <th className="px-4 py-3">হিসাব / ফান্ড</th>
                        <th className="px-4 py-3 text-right">পরিমাণ (৳)</th>
                        <th className="px-4 py-3 text-center">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jumaIncomeRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            কোনো জুমার কালেকশন রেকর্ড পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        jumaIncomeRecords.map((juma) => (
                          <tr key={juma.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900">
                              {formatDate(juma.date)}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {juma.voucherNumber}
                            </td>
                            <td className="px-4 py-3 text-slate-800 font-medium">
                              {juma.description || 'জুমার কালেকশন'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {juma.accountName}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-teal-700">
                              ৳ {Number(juma.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => onPrintVoucher(juma, 'INCOME', 'POS_80', true)}
                                className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="প্রিন্ট ভাউচার"
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

          {/* ==================== SUBTAB 3: DONATIONS (দান ও অনুদান) ==================== */}
          {activeTab === 'donations' && (
            <div className="space-y-5">
              <DonationView
                forcedSubTab="donations"
                hideSubTabSwitcher={true}
                donations={donations}
                donationBoxes={donationBoxes}
                boxCollections={boxCollections}
                accounts={accounts}
                accountHeads={accountHeads}
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onAddDonation={onAddDonation || (async () => ({} as any))}
                onCollectBox={onCollectBox || (async () => {})}
                onAddDonationBox={onAddDonationBox}
                onUpdateDonationBox={onUpdateDonationBox}
                onPrintReceipt={onPrintReceipt || (() => {})}
                onSendSms={onSendSms}
              />
            </div>
          )}

          {/* ==================== SUBTAB 4: DONATION BOXES (দানবাক্স কালেকশন) ==================== */}
          {activeTab === 'donation_boxes' && (
            <div className="space-y-5">
              <DonationView
                forcedSubTab="boxes"
                hideSubTabSwitcher={true}
                donations={donations}
                donationBoxes={donationBoxes}
                boxCollections={boxCollections}
                accounts={accounts}
                accountHeads={accountHeads}
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onAddDonation={onAddDonation || (async () => ({} as any))}
                onCollectBox={onCollectBox || (async () => {})}
                onAddDonationBox={onAddDonationBox}
                onUpdateDonationBox={onUpdateDonationBox}
                onPrintReceipt={onPrintReceipt || (() => {})}
                onSendSms={onSendSms}
              />
            </div>
          )}

          {/* ==================== SUBTAB 5: INCOME REGISTER (আয় রেজিস্টার) ==================== */}
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
                headsList={incomeMainHeads.map((h) => ({ id: h.id, nameBn: h.nameBn }))}
                accountsList={accounts.map((a) => ({ id: a.id, nameBn: a.nameBn }))}
                onPrint={() => setIsReportPreviewOpen(true)}
                onPdf={() => setIsReportPreviewOpen(true)}
                onExcel={handleExportExcel}
                totalRecordsCount={filteredIncomes.length}
                totalAmountSum={filteredTotalAmount}
                labelPrefix="মোট আয়"
              />

              {/* Search Bar */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  placeholder="ভাউচার নম্বর, দাতার নাম, বিবরণ বা রেফারেন্স দিয়ে খুঁজুন..."
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
                    <h3 className="text-sm font-bold text-slate-900">আয় রেজিস্টার খতিয়ান</h3>
                    <p className="text-xs text-slate-500">সময়সীমা: {effectiveDates.labelBn}</p>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    মোট প্রদর্শিত: <strong>{filteredIncomes.length}</strong> টি
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-3 text-center w-10">ক্রঃ</th>
                        <th className="px-3.5 py-3">ভাউচার নং</th>
                        <th className="px-3.5 py-3">তারিখ</th>
                        <th className="px-3.5 py-3">খাত</th>
                        <th className="px-3.5 py-3">বিবরণ</th>
                        <th className="px-3.5 py-3">দানশীল / দাতা</th>
                        <th className="px-3.5 py-3">হিসাব / মাধ্যম</th>
                        <th className="px-3.5 py-3 text-right">পরিমাণ (৳)</th>
                        <th className="px-3.5 py-3 text-center">অবস্থা</th>
                        <th className="px-3.5 py-3 text-center">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIncomes.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                            নির্বাচিত ফিল্টারে কোনো আয় ভাউচার পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredIncomes.map((item, idx) => (
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
                              {item.donorName || '-'}
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 text-[11px]">
                              {item.accountName}{' '}
                              <span className="text-slate-400">({item.paymentMethod})</span>
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
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
                                  onClick={() => onPrintVoucher(item, 'INCOME', 'POS_80', true)}
                                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                                  title="প্রিন্ট ভাউচার"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {item.denominationData && (
                                  <button
                                    onClick={() => {
                                      setActiveDenominationDetail(item.denominationData!);
                                      setActiveDenominationRef(item.voucherNumber);
                                      setIsDenominationDetailOpen(true);
                                    }}
                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                                    title="নোট গণনা বিবরণ"
                                  >
                                    <Banknote className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onUpdateIncome && item.status !== 'CANCELLED' && (
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
                    {filteredIncomes.length > 0 && (
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={7} className="px-3.5 py-3 text-right text-slate-800">
                            মোট অনুমোদিত আয়:
                          </td>
                          <td className="px-3.5 py-3 text-right font-mono text-emerald-800 font-black">
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

          {/* ==================== SUBTAB 6: INCOME ANALYTICS ==================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-1">আয় খাতওয়ারি বন্টন ও বিশ্লেষণ</h3>
                <p className="text-xs text-slate-500 mb-4">প্রধান প্রধান খাত অনুসারে মোট আয়ের পরিসংখ্যান</p>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={incomeMainHeads.map((head) => {
                        const total = incomes
                          .filter((i) => i.mainHeadId === head.id && i.status !== 'CANCELLED')
                          .reduce((s, i) => s + (Number(i.amount) || 0), 0);
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
                        formatter={(val: any) => [`৳ ${Number(val).toLocaleString('en-IN')}`, 'আয়']}
                      />
                      <Bar dataKey="amount" fill="#059669" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Head-wise breakdown cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomeMainHeads.map((head) => {
                  const headIncomes = incomes.filter((i) => i.mainHeadId === head.id && i.status !== 'CANCELLED');
                  const sum = headIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
                  return (
                    <div key={head.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-bold text-slate-800">{head.nameBn}</span>
                      <div className="mt-2 text-lg font-black font-mono text-emerald-700">
                        ৳ {sum.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-slate-500">{headIncomes.length} টি ভাউচার এন্ট্রি</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== SUBTAB 7: REPORT & PRINT ==================== */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Printer className="w-5 h-5 text-emerald-600" />
                      <span>আয় ও প্রাপ্তি অফিসিয়াল রিপোর্ট কেন্দ্র</span>
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
                    headsList={incomeMainHeads.map((h) => ({ id: h.id, nameBn: h.nameBn }))}
                    accountsList={accounts.map((a) => ({ id: a.id, nameBn: a.nameBn }))}
                    onPrint={() => setIsReportPreviewOpen(true)}
                    onPdf={() => setIsReportPreviewOpen(true)}
                    onExcel={handleExportExcel}
                    totalRecordsCount={filteredIncomes.length}
                    totalAmountSum={filteredTotalAmount}
                    labelPrefix="মোট আয়"
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
                  <div className="text-xs font-mono font-bold text-emerald-700">
                    মোট রেকর্ড: {filteredIncomes.length} টি | সর্বমোট: ৳ {filteredTotalAmount.toLocaleString('en-IN')}
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
                        <th className="px-3 py-2.5">দাতা</th>
                        <th className="px-3 py-2.5">হিসাব</th>
                        <th className="px-3 py-2.5 text-right">পরিমাণ (৳)</th>
                        <th className="px-3 py-2.5 text-center">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIncomes.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.voucherNumber}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{formatDate(item.date)}</td>
                          <td className="px-3 py-2 text-slate-900">{item.mainHeadNameBn}</td>
                          <td className="px-3 py-2 text-slate-600">{item.description || '-'}</td>
                          <td className="px-3 py-2 text-slate-800 font-medium">{item.donorName || '-'}</td>
                          <td className="px-3 py-2 text-slate-500 text-[11px]">{item.accountName}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
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

      {/* ==================== CREATE INCOME MODAL ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowDownLeft className="w-5 h-5" />
                <h3 className="font-bold text-sm">নতুন আয় ও প্রাপ্তি এন্ট্রি</h3>
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">আয়ের প্রধান খাত *</label>
                  <select
                    required
                    value={mainHeadId}
                    onChange={(e) => {
                      setMainHeadId(e.target.value);
                      setSubHeadId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  >
                    {incomeMainHeads.map((h) => (
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

              {/* Amount & Change Calculator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">টাকার পরিমাণ (৳) *</label>
                  <button
                    type="button"
                    onClick={() => setIsCalculatorOpen(true)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>নোট গণনা / চেঞ্জ ক্যালকুলেটর</span>
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
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base font-black font-mono text-emerald-700 bg-emerald-50/40 focus:bg-white"
                />
                {incomeDenominationData && (
                  <div className="mt-1 text-[11px] text-emerald-700 font-bold flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <span>নোট গণনা সম্পন্ন: ৳{incomeDenominationData.grandTotal.toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={() => setIncomeDenominationData(null)}
                      className="text-rose-600 text-[10px] hover:underline"
                    >
                      রিসেট
                    </button>
                  </div>
                )}
              </div>

              {/* Account & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">জমার হিসাব (Account) *</label>
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

              {/* Donor Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">দানশীল / দাতার নাম</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="নাম লিখুন..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Reference & Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">রেফারেন্স / চেক নং / মানি রিসিট নং</label>
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
                  placeholder="আয়ের বিস্তারিত বিবরণ..."
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সেভ ও রসিদ প্রিন্ট'}</span>
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
              <h3 className="font-bold text-base text-slate-900">ভাউচার বাতিল / রিভার্সাল</h3>
            </div>
            <p className="text-xs text-slate-600">
              আপনি ভাউচার নং <strong className="font-mono text-slate-900">{reversalTarget.voucherNumber}</strong> বাতিল করতে যাচ্ছেন। এর ফলে সমপরিমাণ টাকা সংশ্লিষ্ট হিসাব থেকে বাদ যাবে।
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">বাতিলের কারণ লিখুন *</label>
              <textarea
                rows={3}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="যেমন: ভুল এন্ট্রি, চেক বাউন্স বা দাতার অনুরোধ..."
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
        onApplyDenomination={(denomData) => {
          setIncomeDenominationData(denomData);
          setAmount(String(denomData.grandTotal));
          setIsCalculatorOpen(false);
        }}
      />

      {/* ==================== DENOMINATION DETAIL MODAL ==================== */}
      <DenominationDetailModal
        isOpen={isDenominationDetailOpen}
        onClose={() => setIsDenominationDetailOpen(false)}
        denominationData={activeDenominationDetail}
        referenceTitle={activeDenominationRef}
        language={language}
      />

      {/* ==================== JUMA COLLECTION MODAL ==================== */}
      {isJumaModalOpen && (
        <JumaCollectionModal
          isOpen={isJumaModalOpen}
          onClose={() => setIsJumaModalOpen(false)}
          accounts={accounts}
          accountHeads={accountHeads}
          currentMosque={currentMosque}
          language={language}
          onAddIncome={async (data) => {
            const res = await onAddIncome(data, { print: true, format: 'POS_80' });
            if (res) {
              onPrintVoucher(res, 'INCOME', 'POS_80', false);
            }
            setIsJumaModalOpen(false);
            return res;
          }}
        />
      )}

      {/* ==================== EDIT TRANSACTION MODAL ==================== */}
      {editingItem && onUpdateIncome && (
        <EditTransactionModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          type="INCOME"
          accountHeads={accountHeads}
          accounts={accounts}
          onSave={async (id, data) => {
            await onUpdateIncome(id, data);
            setEditingItem(null);
          }}
          language={language}
        />
      )}

      {/* ==================== UNIVERSAL A4 REPORT PREVIEW MODAL ==================== */}
      <A4ReportPreviewModal<IncomeEntry>
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportTitle="আয় ও প্রাপ্তি বিবরণী প্রতিবেদন (Income Register Report)"
        reportSubtitle="মসজিদের সকল আনুষ্ঠানিক ও অনুমোদিত আয়ের রেজিস্টার খতিয়ান"
        periodLabel={effectiveDates.labelBn}
        currentMosque={currentMosque}
        columns={reportColumns}
        data={filteredIncomes}
        summaryMetrics={[
          { label: 'মোট রেকর্ড', value: `${filteredIncomes.length} টি` },
          { label: 'সর্বমোট আয়', value: filteredTotalAmount, color: 'text-emerald-700 font-bold' },
        ]}
        totalRow={
          <tr>
            <td colSpan={7} className="px-3 py-2.5 text-right font-bold text-slate-800">
              সর্বমোট আয়ের যোগফল:
            </td>
            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-800">
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

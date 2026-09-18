import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  Building,
  DollarSign,
  Calendar,
  Users,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Edit,
  FileText,
  CreditCard,
  Wallet,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  RefreshCw,
  Gift,
  Paperclip,
  Check,
  X,
  ExternalLink,
  ChevronDown,
  Info,
  TrendingUp,
  AlertTriangle,
  Lock,
  Globe,
  Share2,
  PieChart,
  FileSpreadsheet,
  Link as LinkIcon
} from 'lucide-react';
import {
  Staff,
  StaffPayment,
  FinancialAccount,
  AccountHead,
  Mosque,
  CommitteeTerm,
  StaffBankTransferLetter,
  PaymentBatch,
  StaffPaymentDocument
} from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { printElement } from '../lib/printUtils';
import { api } from '../lib/api';
import { BankTransferLetterModal } from './BankTransferLetterModal';
import { StaffPaymentModal } from './StaffPaymentModal';
import { StaffPaymentRegisterModal } from './StaffPaymentRegisterModal';
import { StaffSalarySlipModal } from './StaffSalarySlipModal';
import { StaffFestivalAllowanceModal } from './StaffFestivalAllowanceModal';
import { PaymentBatchModal } from './PaymentBatchModal';
import { PaymentDocumentModal } from './PaymentDocumentModal';

interface SalaryBankTransferViewProps {
  staff: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  currentMosque?: Mosque | null;
  committeeTerms?: CommitteeTerm[];
  currentUser?: any;
  language: Language;
  onPayStaff: (data: any) => Promise<void>;
  onUpdateStaffPayment: (id: string, data: any) => Promise<void>;
  onCancelStaffPayment: (id: string, reason?: string) => Promise<void>;
  onDisburseFestivalAllowance: (data: any) => Promise<void>;
  onNavigateToStaff?: () => void;
  onRefresh?: () => Promise<void>;
}

export type SalarySubTab =
  | 'dashboard'
  | 'payments'
  | 'batch'
  | 'transfers'
  | 'vouchers'
  | 'letters'
  | 'reports'
  | 'documents';

export const SalaryBankTransferView: React.FC<SalaryBankTransferViewProps> = ({
  staff,
  staffPayments,
  accounts,
  accountHeads,
  currentMosque,
  committeeTerms = [],
  currentUser,
  language,
  onPayStaff,
  onUpdateStaffPayment,
  onCancelStaffPayment,
  onDisburseFestivalAllowance,
  onNavigateToStaff,
  onRefresh,
}) => {
  // Navigation Sub-tabs (Phase-7: 8 distinct comprehensive modules)
  const [activeSubTab, setActiveSubTab] = useState<SalarySubTab>('dashboard');

  // Privacy: toggle masking of bank account numbers (admin / finance authorized only)
  const [revealAccountNumbers, setRevealAccountNumbers] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterStaffType, setFilterStaffType] = useState('ALL');
  const [filterStaffId, setFilterStaffId] = useState('ALL');
  const [filterPaymentType, setFilterPaymentType] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'BANK' | 'CASH' | 'MFS' | 'CHEQUE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL');
  const [filterDateRangePreset, setFilterDateRangePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payModalStaffId, setPayModalStaffId] = useState<string | undefined>(undefined);
  const [payModalMonth, setPayModalMonth] = useState<string | undefined>(undefined);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedBatchForModal, setSelectedBatchForModal] = useState<PaymentBatch | null>(null);

  const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
  const [isBankLetterModalOpen, setIsBankLetterModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Single Voucher / Pay Slip Modal
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<StaffPayment | null>(null);
  const [selectedSlipStaff, setSelectedSlipStaff] = useState<Staff | null>(null);

  // Payment Document Modal
  const [selectedDocPayment, setSelectedDocPayment] = useState<StaffPayment | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<StaffPayment | null>(null);
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [editOtherAllowance, setEditOtherAllowance] = useState<number>(0);
  const [editDeduction, setEditDeduction] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'CASH' | 'BANK' | 'MFS' | 'CHEQUE'>('CASH');
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Cancel Payment State
  const [cancellingPayment, setCancellingPayment] = useState<StaffPayment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // Payment Batches list (loaded from API)
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Bank Transfer Letters list (loaded from API)
  const [bankLetters, setBankLetters] = useState<StaffBankTransferLetter[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);

  // Reports state
  const [reportType, setReportType] = useState<'MONTHLY' | 'BANK_STATEMENT' | 'STAFF_STATEMENT' | 'YEARLY'>('MONTHLY');
  const [reportMonth, setReportMonth] = useState<string>('');
  const [reportStaffId, setReportStaffId] = useState<string>('ALL');

  // Current Month String (e.g. "2026-09")
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Fetch Payment Batches & Bank Letters
  const loadData = async () => {
    try {
      setLoadingBatches(true);
      setLoadingLetters(true);
      const [batches, letters] = await Promise.all([
        api.getPaymentBatches().catch(() => []),
        api.getStaffBankTransferLetters().catch(() => [])
      ]);
      setPaymentBatches(batches || []);
      setBankLetters(letters || []);
    } catch (err) {
      console.warn('Failed to load salary bank transfer data:', err);
    } finally {
      setLoadingBatches(false);
      setLoadingLetters(false);
    }
  };

  useEffect(() => {
    loadData();
    if (!reportMonth) setReportMonth(currentMonthStr);
  }, []);

  // Compute Active Staff & Monthly Overview
  const activeStaffList = useMemo(() => {
    return staff.filter((s) => s.status === 'ACTIVE');
  }, [staff]);

  // Compute Unique Available Months for Filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthStr);
    staffPayments.forEach((p) => {
      if (p.month) set.add(p.month);
    });
    return Array.from(set).sort().reverse();
  }, [staffPayments, currentMonthStr]);

  // Helper to Mask Bank Account Number
  const formatAccountNumber = (accNo?: string) => {
    if (!accNo) return '—';
    if (revealAccountNumbers) return accNo;
    const clean = accNo.trim();
    if (clean.length <= 4) return clean;
    return `•••• •••• ${clean.slice(-4)}`;
  };

  // -------------------------------------------------------------
  // REAL-TIME KPI CALCULATIONS (Database Driven - Zero Dummy Data)
  // -------------------------------------------------------------
  const kpiStats = useMemo(() => {
    const validPayments = staffPayments.filter((p) => p.status !== 'CANCELLED');
    const currentMonthPayments = validPayments.filter((p) => p.month === currentMonthStr);

    // 1. Total All-time Paid
    const totalAllTimePaid = validPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 2. Total Net Paid this month
    const totalNetPaidThisMonth = currentMonthPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 3. Bank Disbursal this month
    const bankDisbursedThisMonth = currentMonthPayments
      .filter((p) => p.paymentMethod === 'BANK')
      .reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 4. Cash Disbursal this month
    const cashDisbursedThisMonth = currentMonthPayments
      .filter((p) => p.paymentMethod === 'CASH' || p.paymentMethod === 'MFS')
      .reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 5. Total Expected Active Salary for this month
    const totalExpectedMonthlySalary = activeStaffList.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

    // 6. Paid Staff IDs this month
    const paidStaffIdsThisMonth = new Set(
      currentMonthPayments.filter((p) => (p.paymentType || 'REGULAR_SALARY') === 'REGULAR_SALARY').map((p) => p.staffId)
    );
    const unpaidStaff = activeStaffList.filter((s) => !paidStaffIdsThisMonth.has(s.id));
    const totalDueThisMonth = unpaidStaff.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

    // 7. Advance Adjusted this month
    const advanceAdjustedThisMonth = currentMonthPayments.reduce((sum, p) => sum + (p.advanceDeduction || p.advanceAdjustment || 0), 0);

    // 8. Total Cancelled Payments
    const cancelledCount = staffPayments.filter((p) => p.status === 'CANCELLED').length;

    // 9. Total Documents Attached
    const totalDocsCount = staffPayments.reduce((sum, p) => sum + (p.documents?.length || 0), 0);

    return {
      totalAllTimePaid,
      totalNetPaidThisMonth,
      bankDisbursedThisMonth,
      cashDisbursedThisMonth,
      totalExpectedMonthlySalary,
      totalDueThisMonth,
      paidStaffCount: paidStaffIdsThisMonth.size,
      unpaidStaffCount: unpaidStaff.length,
      advanceAdjustedThisMonth,
      cancelledCount,
      totalBatchesCount: paymentBatches.length,
      totalLettersCount: bankLetters.length,
      totalDocsCount
    };
  }, [staffPayments, currentMonthStr, activeStaffList, paymentBatches, bankLetters]);

  // -------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------
  const filteredPayments = useMemo(() => {
    return staffPayments.filter((pay) => {
      // 1. Status Filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'PAID' && pay.status === 'CANCELLED') return false;
        if (filterStatus === 'CANCELLED' && pay.status !== 'CANCELLED') return false;
      }

      // 2. Month Filter
      if (filterMonth !== 'ALL' && pay.month !== filterMonth) {
        return false;
      }

      // 3. Staff Filter
      if (filterStaffId !== 'ALL' && pay.staffId !== filterStaffId) {
        return false;
      }

      // 4. Payment Type Filter
      if (filterPaymentType !== 'ALL') {
        const pType = pay.paymentType || 'REGULAR_SALARY';
        if (pType !== filterPaymentType) return false;
      }

      // 5. Payment Method Filter
      if (filterMethod !== 'ALL' && pay.paymentMethod !== filterMethod) {
        return false;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const staffObj = staff.find((s) => s.id === pay.staffId);
        const matchName = pay.staffName?.toLowerCase().includes(q);
        const matchDesignation = pay.designationBn?.toLowerCase().includes(q);
        const matchVoucher = pay.expenseVoucherNumber?.toLowerCase().includes(q);
        const matchBank = pay.bankName?.toLowerCase().includes(q);
        const matchAcc = pay.accountNumber?.toLowerCase().includes(q);
        const matchNotes = pay.notes?.toLowerCase().includes(q);
        const matchBatch = pay.batchNumber?.toLowerCase().includes(q);
        const matchPhone = staffObj?.phone?.includes(q);
        if (!matchName && !matchDesignation && !matchVoucher && !matchBank && !matchAcc && !matchNotes && !matchBatch && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [staffPayments, filterStatus, filterMonth, filterStaffId, filterPaymentType, filterMethod, searchQuery, staff]);

  // Handle Edit Payment Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      setIsEditLoading(true);
      setEditError(null);
      const totalPayable = editBasicSalary + editBonus + editOtherAllowance;
      const netPaid = totalPayable - editDeduction;

      await onUpdateStaffPayment(editingPayment.id, {
        basicSalary: editBasicSalary,
        bonus: editBonus,
        otherAllowance: editOtherAllowance,
        allowance: editBonus + editOtherAllowance,
        deduction: editDeduction,
        netPaid,
        paymentMethod: editPaymentMethod,
        accountId: editAccountId,
        paymentDate: editPaymentDate,
        notes: editNotes,
      });

      setEditingPayment(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setEditError(err.message || 'পেমেন্ট আপডেট ব্যর্থ হয়েছে।');
    } finally {
      setIsEditLoading(false);
    }
  };

  // Handle Cancel Payment Submission
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPayment) return;
    try {
      setIsCancelLoading(true);
      await onCancelStaffPayment(cancellingPayment.id, cancelReason);
      setCancellingPayment(null);
      setCancelReason('');
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || 'পেমেন্ট বাতিলকরণ ব্যর্থ হয়েছে।');
    } finally {
      setIsCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" id="salary-bank-transfer-module">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-xl">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                বেতন ব্যাংক ট্রান্সফার
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                  Phase-7 Official
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                ইমাম, খতিব, মুয়াজ্জিন ও কর্মচারীদের মাসিক বেতন, হাদিয়া, ব্যাংক ট্রান্সফার ও ভাউচার রেজিস্টার
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setPayModalStaffId(undefined);
              setPayModalMonth(currentMonthStr);
              setIsPayModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            বেতন প্রদান
          </button>

          <button
            onClick={() => {
              setSelectedBatchForModal(null);
              setIsBatchModalOpen(true);
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            পেমেন্ট ব্যাচ তৈরি
          </button>

          <button
            onClick={() => setIsBankLetterModalOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <Building className="w-4 h-4 text-emerald-400" />
            ব্যাংক ট্রান্সফার পত্র
          </button>

          <button
            onClick={() => setIsFestivalModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Gift className="w-4 h-4" />
            উৎসব ভাতা
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            বেতন রেজিস্টার
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REAL-TIME STATS KPI BAR (11 Authentic Metrics) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: This Month Net Paid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">এই মাসের পরিশোধ</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-emerald-700">
              ৳{formatCurrency(kpiStats.totalNetPaidThisMonth, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {kpiStats.paidStaffCount} জন স্টাফ পরিশোধিত
            </div>
          </div>
        </div>

        {/* Card 2: Bank Disbursal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ব্যাংক ট্রান্সফার</span>
            <Building className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-teal-700">
              ৳{formatCurrency(kpiStats.bankDisbursedThisMonth, language)}
            </div>
            <div className="text-[11px] text-teal-600/80 mt-0.5">
              অ্যাকাউন্টে স্বয়ংক্রিয় ক্রেডিট
            </div>
          </div>
        </div>

        {/* Card 3: Cash Disbursal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ক্যাশ/হাতে পরিশোধ</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-blue-700">
              ৳{formatCurrency(kpiStats.cashDisbursedThisMonth, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              ভাউচার সংযুক্ত ক্যাশ
            </div>
          </div>
        </div>

        {/* Card 4: Due / Pending Salary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">এই মাসের বকেয়া</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-amber-700">
              ৳{formatCurrency(kpiStats.totalDueThisMonth, language)}
            </div>
            <div className="text-[11px] text-amber-600/90 mt-0.5">
              {kpiStats.unpaidStaffCount} জন অপেক্ষায়
            </div>
          </div>
        </div>

        {/* Card 5: Advance Adjusted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">অগ্রিম বেতন সমন্বয়</span>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-purple-700">
              ৳{formatCurrency(kpiStats.advanceAdjustedThisMonth, language)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              বেতন থেকে কর্তিত
            </div>
          </div>
        </div>

        {/* Card 6: Batches & Letters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ব্যাচ ও ব্যাংক পত্র</span>
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-xl font-black text-slate-800">
              {kpiStats.totalBatchesCount} <span className="text-xs font-normal text-slate-500">ব্যাচ</span> / {kpiStats.totalLettersCount} <span className="text-xs font-normal text-slate-500">পত্র</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {kpiStats.totalDocsCount} টি ডকুমেন্ট সংরক্ষিত
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. NAVIGATION SUB-TABS (Phase-7: 8 Modules) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'dashboard'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PieChart className="w-4 h-4" />
            সারসংক্ষেপ ও অ্যানালিটিক্স
          </button>

          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'payments'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-4 h-4" />
            পেমেন্ট রেজিস্টার ও ইতিহাস ({filteredPayments.length})
          </button>

          <button
            onClick={() => setActiveSubTab('batch')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'batch'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            পেমেন্ট ব্যাচ বিল্ডার ({paymentBatches.length})
          </button>

          <button
            onClick={() => setActiveSubTab('transfers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'transfers'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            ব্যাংক ও ক্যাশ স্থানান্তর
          </button>

          <button
            onClick={() => setActiveSubTab('letters')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'letters'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            ব্যাংক ট্রান্সফার পত্র ({bankLetters.length})
          </button>

          <button
            onClick={() => setActiveSubTab('vouchers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'vouchers'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4" />
            ভাউচার ও পে-স্লিপ প্রিন্ট
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'reports'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            রিপোর্ট ও স্টেটমেন্ট
          </button>

          <button
            onClick={() => setActiveSubTab('documents')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'documents'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            ডকুমেন্টস ও ড্রাইভ ব্যাকআপ
          </button>
        </div>

        {/* Masking Account Numbers Toggle */}
        <div className="flex items-center gap-2 px-2">
          <button
            type="button"
            onClick={() => setRevealAccountNumbers(!revealAccountNumbers)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="ব্যাংক হিসাব নম্বরের গোপনীয়তা নিয়ন্ত্রণ"
          >
            {revealAccountNumbers ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
            {revealAccountNumbers ? 'অ্যাকাউন্ট নম্বর মাস্ক করুন' : 'অ্যাকাউন্ট নম্বর প্রকাশ করুন'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SUB-TAB CONTENT ROUTING */}
      {/* ------------------------------------------------------------- */}

      {/* SUB-TAB 1: DASHBOARD & ANALYTICS */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Active Staff Salary Status Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    চলতি মাস ({currentMonthStr}) স্টাফ বেতন ও পরিশোধের অবস্থা
                  </h3>
                  <p className="text-xs text-slate-500">সকল সক্রিয় ইমাম, খতিব, মুয়াজ্জিন ও কর্মচারীদের বর্তমান স্থিতি</p>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  রেজিস্টার ভিউ
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-3">স্টাফের নাম</th>
                      <th className="p-3">পদবি</th>
                      <th className="p-3 text-right">নির্ধারিত বেতন</th>
                      <th className="p-3">পছন্দীয় মাধ্যম</th>
                      <th className="p-3 text-center">চলতি মাসের অবস্থা</th>
                      <th className="p-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeStaffList.map((st) => {
                      const paidThisMonth = staffPayments.find(
                        (p) => p.staffId === st.id && p.month === currentMonthStr && p.status !== 'CANCELLED'
                      );

                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">
                            {st.name}
                            {st.staffCode && <span className="text-[10px] text-slate-400 ml-1">({st.staffCode})</span>}
                          </td>
                          <td className="p-3 text-slate-600">{st.designationBn}</td>
                          <td className="p-3 text-right font-semibold text-slate-800">
                            ৳{formatCurrency(st.monthlySalary || 0, language)}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              {st.paymentPreference === 'BANK' ? <Building className="w-3.5 h-3.5 text-teal-600" /> : <Wallet className="w-3.5 h-3.5 text-blue-600" />}
                              {st.paymentPreference === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}
                            </span>
                            {st.accountNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {formatAccountNumber(st.accountNumber)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {paidThisMonth ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 max-w-[120px] mx-auto">
                                <CheckCircle className="w-3 h-3" />
                                পরিশোধিত (৳{formatCurrency(paidThisMonth.netPaid, language)})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 flex items-center justify-center gap-1 max-w-[100px] mx-auto">
                                <Clock className="w-3 h-3" />
                                বকেয়া রয়েছে
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {paidThisMonth ? (
                              <button
                                onClick={() => {
                                  setSelectedSlipPayment(paidThisMonth);
                                  setSelectedSlipStaff(st);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                              >
                                পে-স্লিপ
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setPayModalStaffId(st.id);
                                  setPayModalMonth(currentMonthStr);
                                  setIsPayModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-sm"
                              >
                                বেতন দিন
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Summary & Shortcuts */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">মাসিক বেতন পর্যালোচনা</span>
                  <Banknote className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black">
                    ৳{formatCurrency(kpiStats.totalExpectedMonthlySalary, language)}
                  </div>
                  <p className="text-xs text-emerald-200 mt-1">
                    মোট সক্রিয় স্টাফ ({activeStaffList.length} জন) এর অনুমোদিত মাসিক বাজেট
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-emerald-100">
                    <span>পরিশোধ সম্পন্ন:</span>
                    <strong>৳{formatCurrency(kpiStats.totalNetPaidThisMonth, language)} ({Math.round((kpiStats.totalNetPaidThisMonth / (kpiStats.totalExpectedMonthlySalary || 1)) * 100)}%)</strong>
                  </div>
                  <div className="flex justify-between text-amber-200">
                    <span>অবশিষ্ট প্রদেয় বকেয়া:</span>
                    <strong>৳{formatCurrency(kpiStats.totalDueThisMonth, language)}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedBatchForModal(null);
                      setIsBatchModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-emerald-700" />
                    অবশিষ্টদের জন্য পেমেন্ট ব্যাচ তৈরি করুন
                  </button>
                </div>
              </div>

              {/* Quick Bank Accounts Balance List */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-500" />
                  মসজিদ ব্যাংক ও ক্যাশ তহবিল স্থিতি
                </h4>
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{acc.nameBn}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {acc.accountType === 'BANK' ? `${acc.bankName || 'ব্যাংক'} (${formatAccountNumber(acc.accountNumber)})` : 'ক্যাশ তহবিল'}
                        </div>
                      </div>
                      <div className="text-right font-bold text-emerald-700">
                        ৳{formatCurrency(acc.currentBalance, language)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 2: PAYMENTS REGISTER & HISTORY */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="নাম, পদবি, ভাউচার, ব্যাংক নং..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Month Filter */}
              <div>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">সকল মাস</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Staff Filter */}
              <div>
                <select
                  value={filterStaffId}
                  onChange={(e) => setFilterStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">সকল স্টাফ</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.designationBn})</option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">সকল মাধ্যম (ব্যাংক / ক্যাশ)</option>
                  <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
                  <option value="CASH">ক্যাশ পেমেন্ট (Cash)</option>
                  <option value="MFS">মোবাইল ব্যাংকিং (bKash/Nagad)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">সকল স্ট্যাটাস</option>
                  <option value="PAID">পরিশোধিত (Paid)</option>
                  <option value="CANCELLED">বাতিলকৃত (Cancelled)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3">ভাউচার / তারিখ</th>
                    <th className="p-3">স্টাফের বিবরণ</th>
                    <th className="p-3">মাস ও প্রকার</th>
                    <th className="p-3 text-right">মূল বেতন</th>
                    <th className="p-3 text-right">ভাতা/বোনাস</th>
                    <th className="p-3 text-right">কর্তন</th>
                    <th className="p-3 text-right font-bold text-emerald-900 bg-emerald-50">পরিশোধিত অর্থ</th>
                    <th className="p-3">মাধ্যম ও একাউন্ট</th>
                    <th className="p-3">ডকুমেন্টস</th>
                    <th className="p-3 text-center">স্ট্যাটাস</th>
                    <th className="p-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pay) => {
                      const isCancelled = pay.status === 'CANCELLED';
                      const st = staff.find((s) => s.id === pay.staffId);

                      return (
                        <tr key={pay.id} className={`hover:bg-slate-50 transition ${isCancelled ? 'opacity-50 bg-rose-50/30' : ''}`}>
                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-800">{pay.expenseVoucherNumber || '—'}</div>
                            <div className="text-[11px] text-slate-500">{formatDate(pay.paymentDate, language)}</div>
                            {pay.batchNumber && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-teal-50 text-teal-700 rounded border border-teal-200">
                                {pay.batchNumber}
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{pay.staffName}</div>
                            <div className="text-[11px] text-slate-500">{pay.designationBn}</div>
                          </td>

                          <td className="p-3">
                            <span className="font-medium text-slate-700">{pay.month}</span>
                            <div className="text-[10px] text-slate-400">
                              {pay.paymentType === 'FESTIVAL_ALLOWANCE' ? (pay.festivalName || 'উৎসব ভাতা') :
                               pay.paymentType === 'HADIA' ? 'হাদিয়া/সম্মানী' : 'মাসিক বেতন'}
                            </div>
                          </td>

                          <td className="p-3 text-right">৳{formatCurrency(pay.basicSalary, language)}</td>
                          <td className="p-3 text-right">৳{formatCurrency((pay.bonus || 0) + (pay.otherAllowance || 0), language)}</td>
                          <td className="p-3 text-right text-rose-600">৳{formatCurrency(pay.deduction || 0, language)}</td>

                          <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50/50 text-sm">
                            ৳{formatCurrency(pay.netPaid, language)}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              {pay.paymentMethod === 'BANK' ? <Building className="w-3.5 h-3.5 text-teal-600" /> : <Wallet className="w-3.5 h-3.5 text-blue-600" />}
                              {pay.paymentMethod === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={pay.accountNameBn || ''}>
                              {pay.accountNameBn || (pay.accountNumber ? formatAccountNumber(pay.accountNumber) : '—')}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedDocPayment(pay);
                                  setIsDocModalOpen(true);
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-emerald-700 transition"
                                title="ডকুমেন্ট ও ড্রাইভ লিংক যুক্ত করুন"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                              {pay.documents && pay.documents.length > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 rounded-full text-slate-600">
                                  {pay.documents.length}
                                </span>
                              )}
                              {pay.googleDriveLink && (
                                <a
                                  href={pay.googleDriveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="গুগল ড্রাইভ লিংক দেখুন"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isCancelled ? 'বাতিলকৃত' : 'পরিশোধিত'}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedSlipPayment(pay);
                                  setSelectedSlipStaff(st || null);
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition"
                                title="পে-স্লিপ প্রিন্ট"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {!isCancelled && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingPayment(pay);
                                      setEditBasicSalary(pay.basicSalary);
                                      setEditBonus(pay.bonus || 0);
                                      setEditOtherAllowance(pay.otherAllowance || 0);
                                      setEditDeduction(pay.deduction || 0);
                                      setEditPaymentMethod(pay.paymentMethod as any);
                                      setEditAccountId(pay.accountId);
                                      setEditPaymentDate(pay.paymentDate);
                                      setEditNotes(pay.notes || '');
                                    }}
                                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-700 rounded-lg transition"
                                    title="পেমেন্ট সংশোধন"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setCancellingPayment(pay);
                                      setCancelReason('');
                                    }}
                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                    title="পেমেন্ট বাতিল ও রিভার্সাল"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PAYMENT BATCHES */}
      {activeSubTab === 'batch' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">পেমেন্ট ব্যাচ ব্যবস্থাপনা</h3>
              <p className="text-xs text-slate-500">একাধিক স্টাফের বেতন ও ভাতাসমূহ ব্যাচ আকারে অনুমোদন ও বিতরণ</p>
            </div>
            <button
              onClick={() => {
                setSelectedBatchForModal(null);
                setIsBatchModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              নতুন ব্যাচ তৈরি করুন
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentBatches.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                এখনো কোনো পেমেন্ট ব্যাচ তৈরি করা হয়নি। "নতুন ব্যাচ তৈরি করুন" বাটনে ক্লিক করে এক ক্লিকে সকল কর্মীর পেমেন্ট প্রসেস করুন।
              </div>
            ) : (
              paymentBatches.map((batch) => {
                const isPaid = batch.status === 'PAID';
                const isCancelled = batch.status === 'CANCELLED';

                return (
                  <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-emerald-300 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isPaid ? 'পরিশোধিত (Paid)' : isCancelled ? 'বাতিলকৃত' : 'অনুমোদিত (Approved)'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 mt-2">{batch.title}</h4>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">ব্যাচ নং: {batch.batchNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">মোট অর্থ</div>
                        <div className="text-base font-black text-emerald-700">৳{formatCurrency(batch.totalAmount, language)}</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>বেতনের মাস:</span>
                        <strong>{batch.paymentMonth}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>মোট কর্মী:</span>
                        <strong>{batch.totalStaff} জন</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>বিতরণ মাধ্যম:</span>
                        <strong>{batch.disbursementMethod === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedBatchForModal(batch);
                          setIsBatchModalOpen(true);
                        }}
                        className="flex-1 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-center"
                      >
                        বিস্তারিত বিবরণী
                      </button>

                      {!isPaid && !isCancelled && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`আপনি কি নিশ্চিত যে এই ব্যাচ (${batch.batchNumber}) এর অর্থ (৳${formatCurrency(batch.totalAmount, language)}) এখনই বিতরণ করতে চান?`)) {
                              try {
                                await api.disbursePaymentBatch(batch.id, {
                                  paymentDate: new Date().toISOString().split('T')[0]
                                });
                                loadData();
                                if (onRefresh) await onRefresh();
                              } catch (err: any) {
                                alert(err.message || 'বিতরণ ব্যর্থ হয়েছে');
                              }
                            }
                          }}
                          className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition shadow-sm text-center"
                        >
                          বিতরণ করুন
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: BANK TRANSFERS & CASH REGISTERS */}
      {activeSubTab === 'transfers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bank Transfers Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">ব্যাংক ট্রান্সফার রেজিস্টার</h3>
                    <p className="text-xs text-slate-500">ব্যাংক হিসাবের মাধ্যমে পরিশোধিত সকল রেকর্ড</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBankLetterModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition"
                >
                  নতুন ব্যাংক লেটার
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-3">স্টাফের নাম</th>
                      <th className="p-3">ব্যাংক ও অ্যাকাউন্ট নং</th>
                      <th className="p-3">মাস</th>
                      <th className="p-3 text-right">টাকার পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffPayments
                      .filter((p) => p.paymentMethod === 'BANK' && p.status !== 'CANCELLED')
                      .slice(0, 10)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{p.staffName}</td>
                          <td className="p-3 font-mono text-slate-600">
                            {p.bankName || 'ব্যাংক'} - {formatAccountNumber(p.accountNumber)}
                          </td>
                          <td className="p-3 text-slate-500">{p.month}</td>
                          <td className="p-3 text-right font-bold text-teal-700">
                            ৳{formatCurrency(p.netPaid, language)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash Transfers Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">ক্যাশ পেমেন্ট রেজিস্টার</h3>
                    <p className="text-xs text-slate-500">নগদে ও স্বাক্ষরিত রসিদের মাধ্যমে পরিশোধিত লেনদেন</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
                >
                  প্রিন্ট রেজিস্টার
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-3">স্টাফের নাম</th>
                      <th className="p-3">ভাউচার নং</th>
                      <th className="p-3">মাস</th>
                      <th className="p-3 text-right">টাকার পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffPayments
                      .filter((p) => (p.paymentMethod === 'CASH' || p.paymentMethod === 'MFS') && p.status !== 'CANCELLED')
                      .slice(0, 10)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{p.staffName}</td>
                          <td className="p-3 font-mono text-slate-600">{p.expenseVoucherNumber}</td>
                          <td className="p-3 text-slate-500">{p.month}</td>
                          <td className="p-3 text-right font-bold text-blue-700">
                            ৳{formatCurrency(p.netPaid, language)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 5: BANK TRANSFER LETTERS ARCHIVE & GENERATOR */}
      {activeSubTab === 'letters' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">ব্যাংক ট্রান্সফার পত্র (Bank Transfer Letters)</h3>
              <p className="text-xs text-slate-500">ব্যাংক ম্যানেজারের বরাবরে প্রেরিত সকল অফিশিয়াল দরখাস্ত ও স্মারক তালিকা</p>
            </div>
            <button
              onClick={() => setIsBankLetterModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              নতুন ব্যাংক ট্রান্সফার পত্র তৈরি
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankLetters.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                এখনো কোনো ব্যাংক ট্রান্সফার দরখাস্ত তৈরি করা হয়নি। "নতুন ব্যাংক ট্রান্সফার পত্র তৈরি" বাটনে ক্লিক করুন।
              </div>
            ) : (
              bankLetters.map((letter) => (
                <div key={letter.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-emerald-300 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800">
                        স্মারক: {letter.memoNumber}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-2">{letter.bankName}</h4>
                      <div className="text-[11px] text-slate-500">{letter.branchName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">মোট টাকা</div>
                      <div className="text-base font-black text-emerald-700">৳{formatCurrency(letter.totalAmount, language)}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>প্রদানের মাস:</span>
                      <strong>{letter.paymentMonth}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>স্টাফ সংখ্যা:</span>
                      <strong>{letter.staffCount} জন</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>তারিখ:</span>
                      <strong>{formatDate(letter.letterDate, language)}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setIsBankLetterModalOpen(true)}
                      className="flex-1 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-center flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      প্রিন্ট ও ভিউ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: VOUCHERS & PAY SLIPS */}
      {activeSubTab === 'vouchers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">পেমেন্ট ভাউচার ও মানি রসিদ সেন্টার</h3>
                <p className="text-xs text-slate-500">স্বাক্ষরিত পে-স্লিপ, মাসিক বেতন ভাউচার ও ক্যাশ মেমো প্রিন্ট</p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                পূর্ণাঙ্গ মাসিক রেজিস্টার প্রিন্ট
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3">ভাউচার নম্বর</th>
                    <th className="p-3">স্টাফের নাম</th>
                    <th className="p-3">পদবি</th>
                    <th className="p-3">মাস</th>
                    <th className="p-3 text-right">পরিশোধিত টাকা</th>
                    <th className="p-3 text-center">মাধ্যম</th>
                    <th className="p-3 text-right">প্রিন্ট অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {staffPayments.filter(p => p.status !== 'CANCELLED').map((p) => {
                    const st = staff.find(s => s.id === p.staffId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-800">{p.expenseVoucherNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{p.staffName}</td>
                        <td className="p-3 text-slate-500">{p.designationBn}</td>
                        <td className="p-3 text-slate-600">{p.month}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">৳{formatCurrency(p.netPaid, language)}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                            {p.paymentMethod === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedSlipPayment(p);
                              setSelectedSlipStaff(st || null);
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 font-semibold text-slate-700 rounded-lg transition flex items-center gap-1.5 ml-auto"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            পে-স্লিপ প্রিন্ট
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: REPORTS & STATEMENTS */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">বেতন ও ব্যাংক ট্রান্সফার রিপোর্ট জেনারেটর</h3>
                <p className="text-xs text-slate-500">কমিটি অডিট ও বার্ষিক হিসাব পরীক্ষার জন্য আনুষ্ঠানিক স্টেটমেন্ট</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  রিপোর্ট প্রিন্ট করুন
                </button>
              </div>
            </div>

            {/* Report Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">রিপোর্টের ধরন</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MONTHLY">মাসিক বেতন বিবরণী (Monthly Statement)</option>
                  <option value="BANK_STATEMENT">ব্যাংক ট্রান্সফার স্টেটমেন্ট (Bank Statement)</option>
                  <option value="STAFF_STATEMENT">স্টাফভিত্তিক একক ইতিহাস (Staff Statement)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">মাস নির্বাচন</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {reportType === 'STAFF_STATEMENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">নির্দিষ্ট স্টাফ</label>
                  <select
                    value={reportStaffId}
                    onChange={(e) => setReportStaffId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ALL">সকল স্টাফ</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.designationBn})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Printable Report Output Container */}
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 space-y-4">
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">{currentMosque?.name || 'মসজিদ কমপ্লেক্স'}</h2>
                <p className="text-xs text-slate-500">{currentMosque?.address || ''}</p>
                <h3 className="text-sm font-bold text-emerald-800 mt-2">
                  {reportType === 'MONTHLY' ? `${reportMonth} মাসের স্টাফ বেতন ও হাদিয়া বিবরণী` :
                   reportType === 'BANK_STATEMENT' ? `${reportMonth} মাসের ব্যাংক ট্রান্সফার স্টেটমেন্ট` :
                   'স্টাফভিত্তিক বার্ষিক বেতন ও বকেয়া খতিয়ান'}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs bg-white border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <th className="p-2.5">ক্র.</th>
                      <th className="p-2.5">স্টাফের নাম ও পদবি</th>
                      <th className="p-2.5 text-right">মূল বেতন</th>
                      <th className="p-2.5 text-right">ভাতা/বোনাস</th>
                      <th className="p-2.5 text-right">কর্তন</th>
                      <th className="p-2.5 text-right font-bold text-emerald-900">পরিশোধিত অর্থ</th>
                      <th className="p-2.5">মাধ্যম ও অ্যাকাউন্ট</th>
                      <th className="p-2.5 text-center">স্বাক্ষর / রসিদ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffPayments
                      .filter((p) => {
                        if (reportMonth && p.month !== reportMonth) return false;
                        if (reportType === 'BANK_STATEMENT' && p.paymentMethod !== 'BANK') return false;
                        if (reportType === 'STAFF_STATEMENT' && reportStaffId !== 'ALL' && p.staffId !== reportStaffId) return false;
                        return p.status !== 'CANCELLED';
                      })
                      .map((p, idx) => (
                        <tr key={p.id}>
                          <td className="p-2.5 text-center">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {p.staffName}
                            <div className="text-[10px] text-slate-400">{p.designationBn}</div>
                          </td>
                          <td className="p-2.5 text-right">৳{formatCurrency(p.basicSalary, language)}</td>
                          <td className="p-2.5 text-right">৳{formatCurrency((p.bonus || 0) + (p.otherAllowance || 0), language)}</td>
                          <td className="p-2.5 text-right text-rose-600">৳{formatCurrency(p.deduction || 0, language)}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">৳{formatCurrency(p.netPaid, language)}</td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {p.paymentMethod === 'BANK' ? `${p.bankName || 'ব্যাংক'} (${formatAccountNumber(p.accountNumber)})` : 'ক্যাশ ভাউচার'}
                          </td>
                          <td className="p-2.5 text-center text-[10px] text-slate-400">
                            {p.expenseVoucherNumber}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 8: DOCUMENTS & GOOGLE DRIVE BACKUP */}
      {activeSubTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">পেমেন্ট ডকুমেন্টস ও গুগল ড্রাইভ ব্যাকআপ</h3>
                <p className="text-xs text-slate-500">ব্যাংক ট্রান্সফার স্লিপ, বেতন শিট ও গুগল ড্রাইভ লিংক ভল্ট (Private by default)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffPayments
                .filter(p => p.documents && p.documents.length > 0)
                .flatMap(p => (p.documents || []).map(doc => ({ ...doc, payment: p })))
                .map((docItem) => (
                  <div key={docItem.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-emerald-300 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{docItem.name}</h4>
                          <div className="text-[10px] text-slate-500">{docItem.payment.staffName} ({docItem.payment.month})</div>
                        </div>
                      </div>
                      <span className="p-1 bg-white rounded border border-slate-200 text-[10px] text-slate-500">
                        {docItem.isPrivate ? <Lock className="w-3 h-3 text-amber-600" /> : <Globe className="w-3 h-3 text-emerald-600" />}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">{formatDate(docItem.uploadDate, language)}</span>
                      {docItem.url && (
                        <a
                          href={docItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded text-emerald-700 font-bold hover:bg-emerald-50 transition flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          ডকুমেন্ট খুলুন
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. ALL MODALS & DIALOGS */}
      {/* ------------------------------------------------------------- */}

      {/* 1. Single Staff Payment Modal */}
      {isPayModalOpen && (
        <StaffPaymentModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          staffList={staff}
          accounts={accounts}
          accountHeads={accountHeads}
          currentMosque={currentMosque}
          committeeTerms={committeeTerms}
          language={language}
          currentUser={currentUser}
          initialStaffId={payModalStaffId}
          initialMonth={payModalMonth}
          onPaymentSuccess={async () => {
            setIsPayModalOpen(false);
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {/* 2. Payment Batch Modal */}
      {isBatchModalOpen && (
        <PaymentBatchModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          staffList={staff}
          accounts={accounts}
          currentMosque={currentMosque}
          committeeTerms={committeeTerms}
          language={language}
          currentUser={currentUser}
          batchToView={selectedBatchForModal}
          onBatchCreated={async (batch) => {
            loadData();
            if (onRefresh) await onRefresh();
          }}
          onBatchDisbursed={async (batch) => {
            loadData();
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {/* 3. Bank Transfer Letter Modal */}
      {isBankLetterModalOpen && (
        <BankTransferLetterModal
          isOpen={isBankLetterModalOpen}
          onClose={() => setIsBankLetterModalOpen(false)}
          staffList={staff}
          staffPayments={staffPayments}
          accounts={accounts}
          currentMosque={currentMosque}
          committeeTerms={committeeTerms}
          language={language}
          currentUser={currentUser}
          onLetterCreated={async () => {
            loadData();
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {/* 4. Staff Festival Allowance Modal */}
      {isFestivalModalOpen && (
        <StaffFestivalAllowanceModal
          isOpen={isFestivalModalOpen}
          onClose={() => setIsFestivalModalOpen(false)}
          staffList={staff}
          accounts={accounts}
          currentMosque={currentMosque}
          committeeTerms={committeeTerms}
          language={language}
          currentUser={currentUser}
          onDisbursed={async () => {
            setIsFestivalModalOpen(false);
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {/* 5. Staff Payment Register Modal */}
      {isRegisterModalOpen && (
        <StaffPaymentRegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          staffList={staff}
          staffPayments={staffPayments}
          currentMosque={currentMosque}
          committeeTerms={committeeTerms}
          language={language}
          currentUser={currentUser}
          selectedMonth={currentMonthStr}
        />
      )}

      {/* 6. Staff Salary Slip Modal */}
      {selectedSlipPayment && (
        <StaffSalarySlipModal
          isOpen={Boolean(selectedSlipPayment)}
          onClose={() => {
            setSelectedSlipPayment(null);
            setSelectedSlipStaff(null);
          }}
          payment={selectedSlipPayment}
          staff={selectedSlipStaff}
          currentMosque={currentMosque}
          language={language}
        />
      )}

      {/* 7. Payment Document Modal */}
      {isDocModalOpen && selectedDocPayment && (
        <PaymentDocumentModal
          isOpen={isDocModalOpen}
          onClose={() => {
            setIsDocModalOpen(false);
            setSelectedDocPayment(null);
          }}
          payment={selectedDocPayment}
          onDocumentAdded={async () => {
            loadData();
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {/* 8. Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-400" />
                বেতন পরিশোধের তথ্য সংশোধন
              </h3>
              <button onClick={() => setEditingPayment(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মূল বেতন</label>
                  <input
                    type="number"
                    value={editBasicSalary}
                    onChange={(e) => setEditBasicSalary(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">বোনাস/হাদিয়া</label>
                  <input
                    type="number"
                    value={editBonus}
                    onChange={(e) => setEditBonus(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">অন্যান্য ভাতা</label>
                  <input
                    type="number"
                    value={editOtherAllowance}
                    onChange={(e) => setEditOtherAllowance(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কর্তন</label>
                  <input
                    type="number"
                    value={editDeduction}
                    onChange={(e) => setEditDeduction(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-rose-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>সংশোধিত নিট পরিশোধ:</span>
                <span className="text-sm">৳{formatCurrency((editBasicSalary + editBonus + editOtherAllowance) - editDeduction, language)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পরিশোধের তারিখ</label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সংশোধনের কারণ / নোট</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isEditLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition disabled:opacity-50"
                >
                  {isEditLoading ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট সম্পন্ন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Cancel Payment Modal */}
      {cancellingPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                পেমেন্ট বাতিল ও হিসাব রিভার্সাল
              </h3>
              <button onClick={() => setCancellingPayment(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                আপনি কি নিশ্চিত যে <strong>{cancellingPayment.staffName}</strong> এর {cancellingPayment.month} মাসের বেতন (৳{formatCurrency(cancellingPayment.netPaid, language)}) বাতিল করতে চান? এর ফলে ব্যাংক/ক্যাশ একাউন্টে তহবিল স্বয়ংক্রিয়ভাবে ফেরত যুক্ত হবে।
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বাতিলকরণের কারণ *</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="যেমন: ভুল এন্ট্রি / দ্বৈত পেমেন্ট"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingPayment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                >
                  না, ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={isCancelLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {isCancelLoading ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, পেমেন্ট বাতিল করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

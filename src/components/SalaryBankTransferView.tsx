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
  Info
} from 'lucide-react';
import {
  Staff,
  StaffPayment,
  FinancialAccount,
  AccountHead,
  Mosque,
  CommitteeTerm,
  StaffBankTransferLetter
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
  // Navigation Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'register' | 'bankLetters' | 'dueMatrix' | 'statements'>('history');

  // Privacy: toggle masking of bank account numbers (admin / finance authorized only)
  const [revealAccountNumbers, setRevealAccountNumbers] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterStaffType, setFilterStaffType] = useState('ALL');
  const [filterStaffId, setFilterStaffId] = useState('ALL');
  const [filterPaymentType, setFilterPaymentType] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'BANK' | 'CASH' | 'MFS'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'CANCELLED'>('ALL');
  const [filterDateRangePreset, setFilterDateRangePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals & Drawers State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payModalStaffId, setPayModalStaffId] = useState<string | undefined>(undefined);
  const [payModalMonth, setPayModalMonth] = useState<string | undefined>(undefined);

  const [isFestivalModalOpen, setIsFestivalModalOpen] = useState(false);
  const [isBankLetterModalOpen, setIsBankLetterModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Single Voucher / Pay Slip Modal
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<StaffPayment | null>(null);
  const [selectedSlipStaff, setSelectedSlipStaff] = useState<Staff | null>(null);

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

  // Staff Individual Statement Modal
  const [statementStaff, setStatementStaff] = useState<Staff | null>(null);

  // Bank Transfer Letters list (loaded from API)
  const [bankLetters, setBankLetters] = useState<StaffBankTransferLetter[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);

  // Current Month String (e.g. "2026-09")
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Fetch Bank Letters on mount / change
  const loadBankLetters = async () => {
    try {
      setLoadingLetters(true);
      const data = await api.getStaffBankTransferLetters();
      setBankLetters(data || []);
    } catch (err) {
      console.warn('Failed to load bank transfer letters:', err);
    } finally {
      setLoadingLetters(false);
    }
  };

  useEffect(() => {
    loadBankLetters();
  }, []);

  // Compute Active Staff & Monthly Due Overview
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
    const currentMonthPayments = staffPayments.filter(
      (p) => p.month === currentMonthStr && p.status !== 'CANCELLED'
    );

    // 1. Total Basic Salary paid this month
    const thisMonthSalary = currentMonthPayments.reduce((sum, p) => sum + (p.basicSalary || 0), 0);

    // 2. Total Hadia / Bonus paid this month
    const thisMonthHadia = currentMonthPayments.reduce((sum, p) => sum + (p.bonus || 0) + (p.otherAllowance || 0), 0);

    // 3. Bank Disbursal this month
    const bankDisbursed = currentMonthPayments
      .filter((p) => p.paymentMethod === 'BANK')
      .reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 4. Cash Disbursal this month
    const cashDisbursed = currentMonthPayments
      .filter((p) => p.paymentMethod === 'CASH' || p.paymentMethod === 'MFS')
      .reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 5. Total Net Paid this month
    const totalNetPaidThisMonth = currentMonthPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

    // 6. Expected Active Salary for this month
    const totalExpectedMonthlySalary = activeStaffList.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

    // 7. Total Due / Pending for this month
    const paidStaffIdsThisMonth = new Set(
      currentMonthPayments.filter((p) => (p.paymentType || 'REGULAR_SALARY') === 'REGULAR_SALARY').map((p) => p.staffId)
    );
    const unpaidStaff = activeStaffList.filter((s) => !paidStaffIdsThisMonth.has(s.id));
    const totalDueThisMonth = unpaidStaff.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

    // 8. Total Advance Adjusted this month
    const advanceAdjustedThisMonth = currentMonthPayments.reduce((sum, p) => sum + (p.advanceDeduction || 0), 0);

    return {
      thisMonthSalary,
      thisMonthHadia,
      bankDisbursed,
      cashDisbursed,
      totalNetPaidThisMonth,
      totalExpectedMonthlySalary,
      totalDueThisMonth,
      unpaidStaffCount: unpaidStaff.length,
      advanceAdjustedThisMonth,
    };
  }, [staffPayments, currentMonthStr, activeStaffList]);

  // -------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------
  const filteredPayments = useMemo(() => {
    return staffPayments.filter((pay) => {
      // 1. Status Filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'CANCELLED' && pay.status !== 'CANCELLED') return false;
        if (filterStatus === 'PAID' && pay.status === 'CANCELLED') return false;
      }

      // 2. Month Filter
      if (filterMonth !== 'ALL' && pay.month !== filterMonth) return false;

      // 3. Staff Filter
      if (filterStaffId !== 'ALL' && pay.staffId !== filterStaffId) return false;

      // 4. Staff Type / Designation Filter
      if (filterStaffType !== 'ALL') {
        const stf = staff.find((s) => s.id === pay.staffId);
        if (stf && stf.designation !== filterStaffType) return false;
      }

      // 5. Payment Type Filter
      if (filterPaymentType !== 'ALL') {
        const pType = pay.paymentType || 'REGULAR_SALARY';
        if (filterPaymentType === 'SALARY' && pType !== 'REGULAR_SALARY') return false;
        if (filterPaymentType === 'FESTIVAL' && pType !== 'FESTIVAL_ALLOWANCE') return false;
        if (filterPaymentType === 'BONUS' && pType !== 'BONUS' && pType !== 'SPECIAL_ALLOWANCE') return false;
      }

      // 6. Payment Method Filter
      if (filterMethod !== 'ALL') {
        if (filterMethod === 'BANK' && pay.paymentMethod !== 'BANK') return false;
        if (filterMethod === 'CASH' && pay.paymentMethod !== 'CASH') return false;
        if (filterMethod === 'MFS' && pay.paymentMethod !== 'MFS') return false;
      }

      // 7. Date Range Filter
      if (filterDateRangePreset !== 'ALL') {
        const payDate = pay.paymentDate;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (filterDateRangePreset === 'TODAY') {
          if (payDate !== todayStr) return false;
        } else if (filterDateRangePreset === 'THIS_MONTH') {
          if (pay.month !== currentMonthStr) return false;
        } else if (filterDateRangePreset === 'LAST_MONTH') {
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
          if (pay.month !== lastMonthStr) return false;
        } else if (filterDateRangePreset === 'THIS_YEAR') {
          if (!payDate || !payDate.startsWith(now.getFullYear().toString())) return false;
        } else if (filterDateRangePreset === 'CUSTOM') {
          if (customStartDate && payDate < customStartDate) return false;
          if (customEndDate && payDate > customEndDate) return false;
        }
      }

      // 8. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const stf = staff.find((s) => s.id === pay.staffId);
        const nameMatch = (pay.staffName || '').toLowerCase().includes(q);
        const phoneMatch = (stf?.phone || '').includes(q);
        const codeMatch = (stf?.staffCode || '').toLowerCase().includes(q);
        const voucherMatch = (pay.expenseVoucherNumber || '').toLowerCase().includes(q);
        const notesMatch = (pay.notes || '').toLowerCase().includes(q);
        const festivalMatch = (pay.festivalName || '').toLowerCase().includes(q);
        const bankMatch = (stf?.bankName || '').toLowerCase().includes(q);

        if (!nameMatch && !phoneMatch && !codeMatch && !voucherMatch && !notesMatch && !festivalMatch && !bankMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    staffPayments,
    filterStatus,
    filterMonth,
    filterStaffId,
    filterStaffType,
    filterPaymentType,
    filterMethod,
    filterDateRangePreset,
    customStartDate,
    customEndDate,
    searchQuery,
    staff,
    currentMonthStr,
  ]);

  // Aggregate stats of currently filtered records
  const filteredTotals = useMemo(() => {
    return filteredPayments.reduce(
      (acc, p) => {
        if (p.status !== 'CANCELLED') {
          acc.basic += p.basicSalary || 0;
          acc.bonus += p.bonus || 0;
          acc.other += p.otherAllowance || 0;
          acc.deduction += p.deduction || 0;
          acc.advanceDeduction += p.advanceDeduction || 0;
          acc.netPaid += p.netPaid || 0;
          acc.count += 1;
        }
        return acc;
      },
      { basic: 0, bonus: 0, other: 0, deduction: 0, advanceDeduction: 0, netPaid: 0, count: 0 }
    );
  }, [filteredPayments]);

  // Handlers for Voucher Modal
  const handleOpenSlip = (payment: StaffPayment) => {
    const stf = staff.find((s) => s.id === payment.staffId) || null;
    setSelectedSlipPayment(payment);
    setSelectedSlipStaff(stf);
  };

  // Handlers for Edit Payment
  const handleOpenEdit = (payment: StaffPayment) => {
    setEditingPayment(payment);
    setEditBasicSalary(payment.basicSalary || 0);
    setEditBonus(payment.bonus || 0);
    setEditOtherAllowance(payment.otherAllowance || 0);
    setEditDeduction(payment.deduction || 0);
    setEditPaymentMethod(payment.paymentMethod || 'CASH');
    setEditAccountId(payment.accountId || accounts[0]?.id || '');
    setEditPaymentDate(payment.paymentDate || new Date().toISOString().split('T')[0]);
    setEditNotes(payment.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      setIsEditLoading(true);
      setEditError(null);

      const netPaidCalc = Math.max(
        0,
        editBasicSalary + editBonus + editOtherAllowance - editDeduction
      );

      await onUpdateStaffPayment(editingPayment.id, {
        basicSalary: editBasicSalary,
        bonus: editBonus,
        otherAllowance: editOtherAllowance,
        allowance: editBonus + editOtherAllowance,
        deduction: editDeduction,
        netPaid: netPaidCalc,
        paymentMethod: editPaymentMethod,
        accountId: editAccountId,
        paymentDate: editPaymentDate,
        notes: editNotes.trim(),
      });

      setEditingPayment(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setEditError(err?.message || 'পেমেন্ট সংশোধন করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsEditLoading(false);
    }
  };

  // Handlers for Cancel Payment
  const handleConfirmCancel = async () => {
    if (!cancellingPayment) return;

    try {
      setIsCancelLoading(true);
      await onCancelStaffPayment(cancellingPayment.id, cancelReason);
      setCancellingPayment(null);
      setCancelReason('');
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err?.message || 'পেমেন্ট বাতিল করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsCancelLoading(false);
    }
  };

  // Print filtered payment table report directly
  const handlePrintFilteredTable = () => {
    printElement('salary-payment-filtered-table', {
      title: `${currentMosque?.nameBn || currentMosque?.name || 'মসজিদ'}_বেতন_হাদিয়া_বিবরণী`,
      pageSize: 'A4',
      pageOrientation: 'landscape',
      margin: '8mm 10mm',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================== */}
      {/* 1. TOP HEADER & PRIMARY WORKFLOW ACTIONS                       */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-siliguri">
                বেতন ব্যাংক ট্রান্সফার
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium font-siliguri">
                ইমাম ও স্টাফদের বেতন ও হাদিয়া পরিশোধ, ব্যাংক/ক্যাশ পেমেন্ট এবং ট্রান্সফার লেটার ব্যবস্থাপনা
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Hub */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Pay Staff Salary Modal */}
          <button
            id="btn-salary-open-pay-modal"
            onClick={() => {
              setPayModalStaffId(undefined);
              setPayModalMonth(undefined);
              setIsPayModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বেতন/হাদিয়া পরিশোধ</span>
          </button>

          {/* 2. Disburse Festival Allowance */}
          <button
            id="btn-salary-open-festival-modal"
            onClick={() => setIsFestivalModalOpen(true)}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Gift className="w-4 h-4 text-purple-600" />
            <span>উৎসব ভাতা বিতরণ</span>
          </button>

          {/* 3. Bank Transfer Letter Generator */}
          <button
            id="btn-salary-open-bank-letter-modal"
            onClick={() => setIsBankLetterModalOpen(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Building className="w-4 h-4 text-blue-600" />
            <span>ব্যাংক ট্রান্সফার লেটার</span>
          </button>

          {/* 4. Payment Register A4 Print */}
          <button
            id="btn-salary-open-register-modal"
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>A4 পেমেন্ট রেজিস্টার</span>
          </button>

          {/* 5. Refresh Data */}
          {onRefresh && (
            <button
              onClick={async () => {
                await onRefresh();
                await loadBankLetters();
              }}
              title="তথ্য রিফ্রেশ করুন"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. REAL DATABASE-DRIVEN DASHBOARD SUMMARY CARDS (SECTION 5)    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: এই মাসের মোট মূল বেতন */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 font-siliguri">এই মাসের মূল বেতন</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-siliguri">
            ৳{kpiStats.thisMonthSalary.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            পরিশোধিত বেসিক স্কেল
          </div>
        </div>

        {/* Card 2: এই মাসের মোট হাদিয়া ও বোনাস */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 font-siliguri">এই মাসের হাদিয়া/বোনাস</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Gift className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700 font-siliguri">
            ৳{kpiStats.thisMonthHadia.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            সম্মানী ও উৎসব ভাতা
          </div>
        </div>

        {/* Card 3: ব্যাংকের মাধ্যমে পরিশোধ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 font-siliguri">ব্যাংকে পরিশোধ</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-700 font-siliguri">
            ৳{kpiStats.bankDisbursed.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            অ্যাকাউন্ট ট্রান্সফার
          </div>
        </div>

        {/* Card 4: ক্যাশের মাধ্যমে পরিশোধ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 font-siliguri">ক্যাশ/MFS পরিশোধ</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-siliguri">
            ৳{kpiStats.cashDisbursed.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            নগদ ও মোবাইল ব্যাংকিং
          </div>
        </div>

        {/* Card 5: মোট বকেয়া (এই মাস) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 font-siliguri">চলতি মাসের বকেয়া</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 font-siliguri">
            ৳{kpiStats.totalDueThisMonth.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {kpiStats.unpaidStaffCount} জন স্টাফের বাকি
          </div>
        </div>

        {/* Card 6: মোট প্রদত্ত তহবিল */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 font-siliguri">সর্বমোট বিতরণ (মাস)</span>
            <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-800 font-siliguri">
            ৳{kpiStats.totalNetPaidThisMonth.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {kpiStats.advanceAdjustedThisMonth > 0 ? `অগ্রিম সমন্বয়: ৳${kpiStats.advanceAdjustedThisMonth}` : 'নেট পরিশোধিত'}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. NAVIGATION TABS                                             */}
      {/* ============================================================== */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer border-b-2 font-siliguri ${
            activeSubTab === 'history'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>পেমেন্ট ইতিহাস ও ভাউচার ({staffPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('register')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer border-b-2 font-siliguri ${
            activeSubTab === 'register'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>ব্যাংক ও ক্যাশ ভাউচার রেজিস্ট্রি</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bankLetters')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer border-b-2 font-siliguri ${
            activeSubTab === 'bankLetters'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ব্যাংক ট্রান্সফার লেটার আর্কাইভ ({bankLetters.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dueMatrix')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer border-b-2 font-siliguri ${
            activeSubTab === 'dueMatrix'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>স্টাফ বেতন স্থিতি ও বকেয়া ম্যাট্রিক্স</span>
        </button>

        <button
          onClick={() => setActiveSubTab('statements')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer border-b-2 font-siliguri ${
            activeSubTab === 'statements'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>বেতন ও হাদিয়া বিবরণী রিপোর্ট</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. TAB 1: RECENT PAYMENT HISTORY & VOUCHERS                   */}
      {/* ============================================================== */}
      {(activeSubTab === 'history' || activeSubTab === 'register') && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="কর্মী, মোবাইল, ভাউচার বা ব্যাংক সার্চ..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Preset Buttons & Privacy Toggle */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Privacy Masking Toggle */}
                <button
                  type="button"
                  onClick={() => setRevealAccountNumbers(!revealAccountNumbers)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="ব্যাংক অ্যাকাউন্ট নম্বর গোপন/প্রদর্শন করুন"
                >
                  {revealAccountNumbers ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>গোপন করুন</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>হিসাব নম্বর দেখুন</span>
                    </>
                  )}
                </button>

                {/* Print Filtered Report Button */}
                <button
                  onClick={handlePrintFilteredTable}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>তালিকা প্রিন্ট ({filteredPayments.length})</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs">
              {/* Month */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">মাস</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">সকল মাস</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === currentMonthStr ? '(চলতি)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Member */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">কর্মী</label>
                <select
                  value={filterStaffId}
                  onChange={(e) => setFilterStaffId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">সকল কর্মী</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.designationBn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Designation / Role */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">পদবী</label>
                <select
                  value={filterStaffType}
                  onChange={(e) => setFilterStaffType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">সকল পদবী</option>
                  <option value="IMAM">ইমাম</option>
                  <option value="KHATIB">খতিব</option>
                  <option value="MUEZZIN">মুয়াজ্জিন</option>
                  <option value="TEACHER">শিক্ষক</option>
                  <option value="CLEANER">খাদেম / পরিচ্ছন্নতাকর্মী</option>
                  <option value="SECURITY">নিরাপত্তাকর্মী</option>
                  <option value="OTHER">অন্যান্য</option>
                </select>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">পেমেন্টের ধরন</label>
                <select
                  value={filterPaymentType}
                  onChange={(e) => setFilterPaymentType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">সকল ধরন</option>
                  <option value="SALARY">নিয়মিত মাসিক বেতন</option>
                  <option value="FESTIVAL">উৎসব ভাতা</option>
                  <option value="BONUS">বোনাস / বিশেষ সম্মানী</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">পরিশোধ মাধ্যম</label>
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">সকল মাধ্যম</option>
                  <option value="BANK">ব্যাংক ট্রান্সফার</option>
                  <option value="CASH">নগদ ক্যাশ</option>
                  <option value="MFS">মোবাইল ব্যাংকিং (বিকাশ/নগদ)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">স্ট্যাটাস</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">সকল স্ট্যাটাস</option>
                  <option value="PAID">পরিশোধিত</option>
                  <option value="CANCELLED">বাতিলকৃত</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payments Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Table Header Summary Banner */}
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700 font-siliguri">
                  মোট পেমেন্ট রেকর্ড: {filteredPayments.length} টি
                </span>
                {filteredPayments.length !== staffPayments.length && (
                  <span className="text-[11px] text-slate-400">
                    (সর্বমোট {staffPayments.length} টির মধ্যে ফিল্টারকৃত)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 text-xs font-bold font-siliguri">
                <span className="text-slate-600">মূল বেতন: ৳{filteredTotals.basic.toLocaleString('en-IN')}</span>
                <span className="text-purple-700">বোনাস: +৳{filteredTotals.bonus.toLocaleString('en-IN')}</span>
                {filteredTotals.deduction > 0 && (
                  <span className="text-rose-700">কর্তন: -৳{filteredTotals.deduction.toLocaleString('en-IN')}</span>
                )}
                <span className="text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                  মোট পরিশোধ: ৳{filteredTotals.netPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Banknote className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700 font-siliguri">
                  কোনো বেতন বা হাদিয়া পেমেন্ট রেকর্ড পাওয়া যায়নি
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  আপনার অনুসন্ধান বা ফিল্টারের সাথে মিলে এমন কোনো পেমেন্ট রেকর্ড নেই। নতুন বেতন পরিশোধ করতে উপরের বাটনে ক্লিক করুন।
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterMonth('ALL');
                    setFilterStaffId('ALL');
                    setFilterStaffType('ALL');
                    setFilterPaymentType('ALL');
                    setFilterMethod('ALL');
                    setFilterStatus('ALL');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  ফিল্টার রিসেট করুন
                </button>
              </div>
            ) : (
              <div id="salary-payment-filtered-table" className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 font-siliguri">
                    <tr>
                      <th className="py-3 px-3.5">ভাউচার / আইডি</th>
                      <th className="py-3 px-3.5">তারিখ ও মাস</th>
                      <th className="py-3 px-3.5">কর্মীর তথ্য</th>
                      <th className="py-3 px-3.5">পেমেন্ট ধরন</th>
                      <th className="py-3 px-3.5">মূল বেতন</th>
                      <th className="py-3 px-3.5">হাদিয়া/বোনাস</th>
                      <th className="py-3 px-3.5">কর্তন/অগ্রিম</th>
                      <th className="py-3 px-3.5">নেট পরিশোধ</th>
                      <th className="py-3 px-3.5">পরিশোধ মাধ্যম ও ব্যাংক</th>
                      <th className="py-3 px-3.5">স্ট্যাটাস</th>
                      <th className="py-3 px-3.5 text-center no-print">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredPayments.map((pay) => {
                      const stf = staff.find((s) => s.id === pay.staffId);
                      const receiptNum = pay.expenseVoucherNumber || pay.id;
                      const isCancelled = pay.status === 'CANCELLED';
                      const baseSal = pay.basicSalary ?? (stf?.monthlySalary || 0);
                      const bonusVal = pay.bonus ?? pay.allowance ?? 0;
                      const otherVal = pay.otherAllowance ?? 0;
                      const totalBonusAll = bonusVal + otherVal;
                      const deductVal = pay.deduction || 0;

                      return (
                        <tr
                          key={pay.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCancelled ? 'bg-rose-50/30 opacity-75' : ''
                          }`}
                        >
                          {/* 1. Voucher Number */}
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-bold text-blue-700 block">
                              {receiptNum}
                            </span>
                            {pay.expenseEntryId && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Ledger Linked
                              </span>
                            )}
                          </td>

                          {/* 2. Date & Month */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block font-siliguri">
                              {pay.month}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {pay.paymentDate}
                            </span>
                          </td>

                          {/* 3. Staff Info */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center space-x-2">
                              {stf?.photoUrl ? (
                                <img
                                  src={stf.photoUrl}
                                  alt={pay.staffName}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {pay.staffName?.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 leading-tight">
                                  {pay.staffName}
                                </div>
                                <div className="text-[11px] text-blue-800 font-medium font-siliguri">
                                  {pay.designationBn || stf?.designationBn || 'স্টাফ'}
                                  {stf?.staffCode ? ` • ${stf.staffCode}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 4. Payment Type */}
                          <td className="py-3 px-3.5 whitespace-nowrap font-siliguri">
                            {pay.paymentType === 'FESTIVAL_ALLOWANCE' ? (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-bold text-[11px] border border-purple-100">
                                {pay.festivalName || 'উৎসব ভাতা'}
                              </span>
                            ) : pay.paymentType === 'BONUS' || pay.paymentType === 'SPECIAL_ALLOWANCE' ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold text-[11px] border border-amber-100">
                                বিশেষ হাদিয়া
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[11px] border border-blue-100">
                                মাসিক বেতন
                              </span>
                            )}
                          </td>

                          {/* 5. Basic Salary */}
                          <td className="py-3 px-3.5 font-siliguri font-semibold">
                            ৳{baseSal.toLocaleString('en-IN')}
                          </td>

                          {/* 6. Bonus / Hadia */}
                          <td className="py-3 px-3.5 font-siliguri text-purple-700 font-semibold">
                            {totalBonusAll > 0 ? `+৳${totalBonusAll.toLocaleString('en-IN')}` : '—'}
                          </td>

                          {/* 7. Deduction / Advance */}
                          <td className="py-3 px-3.5 font-siliguri text-rose-600">
                            {deductVal > 0 ? (
                              <span>
                                -৳{deductVal.toLocaleString('en-IN')}
                                {pay.advanceDeduction ? (
                                  <span className="block text-[10px] text-slate-400">
                                    (অগ্রিম: ৳{pay.advanceDeduction})
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* 8. Net Paid */}
                          <td className="py-3 px-3.5 font-siliguri font-black text-slate-900 text-sm">
                            ৳{(pay.netPaid || 0).toLocaleString('en-IN')}
                          </td>

                          {/* 9. Payment Method & Account Details */}
                          <td className="py-3 px-3.5">
                            <div className="space-y-0.5">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  pay.paymentMethod === 'BANK'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                    : pay.paymentMethod === 'MFS'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {pay.paymentMethod === 'BANK' ? (
                                  <>
                                    <Building className="w-3 h-3" />
                                    <span>ব্যাংক ট্রান্সফার</span>
                                  </>
                                ) : pay.paymentMethod === 'MFS' ? (
                                  <>
                                    <CreditCard className="w-3 h-3" />
                                    <span>মোবাইল ব্যাংকিং</span>
                                  </>
                                ) : (
                                  <>
                                    <Wallet className="w-3 h-3" />
                                    <span>নগদ ক্যাশ</span>
                                  </>
                                )}
                              </span>

                              {pay.paymentMethod === 'BANK' && (stf?.bankName || stf?.accountNumber) && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {stf.bankName} • {formatAccountNumber(stf.accountNumber)}
                                </div>
                              )}
                              {pay.accountNameBn && (
                                <div className="text-[10px] text-slate-400">
                                  উৎস: {pay.accountNameBn}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 10. Status */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {isCancelled ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[11px] border border-rose-200 inline-flex items-center space-x-1">
                                <X className="w-3 h-3" />
                                <span>বাতিলকৃত</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[11px] border border-emerald-200 inline-flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>পরিশোধিত</span>
                              </span>
                            )}
                          </td>

                          {/* 11. Actions */}
                          <td className="py-3 px-3.5 text-center no-print whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1">
                              {/* View / Print Slip */}
                              <button
                                onClick={() => handleOpenSlip(pay)}
                                title="বেতন রসিদ / ভাউচার প্রিন্ট করুন"
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Payment */}
                              {!isCancelled && (
                                <button
                                  onClick={() => handleOpenEdit(pay)}
                                  title="পেমেন্ট রেকর্ড সংশোধন করুন"
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Cancel Payment */}
                              {!isCancelled && (
                                <button
                                  onClick={() => setCancellingPayment(pay)}
                                  title="পেমেন্ট বাতিল ও ফান্ড রিভার্স করুন"
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. TAB 3: BANK TRANSFER LETTERS & MEMO ARCHIVE (SECTION 18)   */}
      {/* ============================================================== */}
      {activeSubTab === 'bankLetters' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-siliguri flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <span>অফিশিয়াল ব্যাংক ট্রান্সফার লেটার ও স্মারক রেজিস্টার</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium font-siliguri mt-1">
                ব্যাংক ম্যানেজারের বরাবর প্রেরিত অফিসিয়াল বেতন ও হাদিয়া ট্রান্সফার আবেদনের সংরক্ষিত আর্কাইভ
              </p>
            </div>

            <button
              onClick={() => setIsBankLetterModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ট্রান্সফার লেটার তৈরি করুন</span>
            </button>
          </div>

          {/* Saved Bank Transfer Letters List */}
          {loadingLetters ? (
            <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
              <div className="text-xs text-slate-500 font-bold">লোড হচ্ছে...</div>
            </div>
          ) : bankLetters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700 font-siliguri">
                কোনো সংরক্ষিত ব্যাংক ট্রান্সফার লেটার পাওয়া যায়নি
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                ইমাম ও স্টাফদের ব্যাংক অ্যাকাউন্টে একসাথে বেতন বা উৎসব ভাতা ট্রান্সফারের জন্য অফিশিয়াল স্মারকযুক্ত চিঠি তৈরি করুন।
              </p>
              <button
                onClick={() => setIsBankLetterModalOpen(true)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                প্রথম ট্রান্সফার লেটার তৈরি করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankLetters.map((letter) => (
                <div
                  key={letter.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-indigo-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded border border-indigo-100">
                        {letter.memoNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 font-siliguri">
                        {letter.subject || 'ইমাম ও স্টাফদের বেতন ব্যাংক হিসাবে স্থানান্তরের অনুরোধ'}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        letter.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {letter.status === 'CANCELLED' ? 'বাতিল' : 'অনুমোদিত / প্রেরিত'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">তারিখ ও মাস:</span>
                      <span className="font-bold text-slate-800">
                        {letter.paymentMonth} ({letter.letterDate})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">মোট কর্মী সংখ্যা:</span>
                      <span className="font-bold text-slate-800">
                        {letter.staffCount} জন স্টাফ
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ব্যাংকের নাম:</span>
                      <span className="font-bold text-slate-800">
                        {letter.bankName} ({letter.branchName})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">মোট ট্রান্সফার ফান্ড:</span>
                      <span className="font-black text-indigo-700 text-sm font-siliguri">
                        ৳{letter.totalAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      তৈরি করেছেন: {letter.createdByName || 'অ্যাডমিন'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setIsBankLetterModalOpen(true);
                        }}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>প্রিন্ট ও ভিউ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. TAB 4: STAFF SALARY DUE & ADVANCE MATRIX                   */}
      {/* ============================================================== */}
      {activeSubTab === 'dueMatrix' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-siliguri flex items-center space-x-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  <span>চলতি মাসের ({currentMonthStr}) স্টাফ বেতন স্থিতি ও বকেয়া তালিকা</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium font-siliguri mt-1">
                  সকল সক্রিয় স্টাফের নির্ধারিত বেতন, চলতি মাসের পরিশোধের অবস্থা এবং বকেয়া ট্র্যাকিং
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">চলতি মাসের মোট বকেয়া</span>
                <span className="text-xl font-black text-rose-600 font-siliguri">
                  ৳{kpiStats.totalDueThisMonth.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStaffList.map((stf) => {
              const currentMonthPay = staffPayments.find(
                (p) => p.staffId === stf.id && p.month === currentMonthStr && p.status !== 'CANCELLED'
              );
              const isPaid = Boolean(currentMonthPay);

              // All past payments for this staff
              const pastPayments = staffPayments.filter((p) => p.staffId === stf.id && p.status !== 'CANCELLED');
              const totalEverPaid = pastPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

              return (
                <div
                  key={stf.id}
                  className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all ${
                    isPaid ? 'border-emerald-200' : 'border-amber-200 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      {stf.photoUrl ? (
                        <img
                          src={stf.photoUrl}
                          alt={stf.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {stf.name.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{stf.name}</h3>
                        <p className="text-xs text-blue-800 font-medium font-siliguri">
                          {stf.designationBn} {stf.staffCode ? `• ${stf.staffCode}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>পরিশোধিত</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>বকেয়া রয়েছে</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">মাসিক নির্ধারিত বেতন:</span>
                      <span className="font-bold text-slate-900 font-siliguri">
                        ৳{(stf.monthlySalary || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {isPaid && (
                      <div className="flex justify-between text-emerald-700">
                        <span>চলতি মাসে পরিশোধিত:</span>
                        <span className="font-bold font-siliguri">
                          ৳{(currentMonthPay?.netPaid || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">ব্যাংক অ্যাকাউন্ট:</span>
                      <span className="font-mono text-slate-700">
                        {stf.bankName ? `${stf.bankName} (${formatAccountNumber(stf.accountNumber)})` : 'ব্যাংক তথ্য নেই'}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-500">সর্বমোট প্রাপ্ত বেতন:</span>
                      <span className="font-bold text-slate-800 font-siliguri">
                        ৳{totalEverPaid.toLocaleString('en-IN')} ({pastPayments.length} বার)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setStatementStaff(stf)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      পেমেন্ট স্টেটমেন্ট
                    </button>

                    {!isPaid ? (
                      <button
                        onClick={() => {
                          setPayModalStaffId(stf.id);
                          setPayModalMonth(currentMonthStr);
                          setIsPayModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>বেতন দিন</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenSlip(currentMonthPay!)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>রসিদ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. TAB 5: STATEMENTS & ANNUAL REPORTS (SECTION 25)            */}
      {/* ============================================================== */}
      {activeSubTab === 'statements' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-siliguri flex items-center space-x-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>বেতন ও হাদিয়া সামগ্রিক বিবরণী ও বার্ষিক রিপোর্ট</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium font-siliguri mt-1">
                মাসভিত্তিক এবং কর্মীভিত্তিক বেতন-ভাতা সংক্রান্ত পূর্ণাঙ্গ নিরীক্ষা ও এক্সপোর্ট সুবিধা
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Report 1: Full Payment Register */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 font-siliguri">মাসিক পেমেন্ট রেজিস্টার</h4>
                <p className="text-xs text-slate-500">
                  নির্বাচিত মাসের সকল কর্মীর বেসিক, বোনাস, কর্তন ও নিট পরিমাণের ল্যান্ডস্কেপ A4 শিট।
                </p>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="mt-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>রেজিস্টার প্রিন্ট ভিউ</span>
                </button>
              </div>

              {/* Report 2: Official Bank Transfer Letter */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 font-siliguri">অফিশিয়াল ব্যাংক লেটার</h4>
                <p className="text-xs text-slate-500">
                  স্মারক নম্বর, ব্যাংক রাউটিং ও সভাপতি-সেক্রেটারির স্বাক্ষরযুক্ত স্থানান্তরের অফিশিয়াল আবেদনপত্র।
                </p>
                <button
                  onClick={() => setIsBankLetterModalOpen(true)}
                  className="mt-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ট্রান্সফার লেটার তৈরি</span>
                </button>
              </div>

              {/* Report 3: Festival Disbursal */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 font-siliguri">উৎসব ভাতা বিতরণ রেজিস্টার</h4>
                <p className="text-xs text-slate-500">
                  ঈদ-উল-ফিতর / ঈদ-উল-আযহা উপলক্ষে সকল কর্মীর এককালীন বোনাস ও সম্মানী বিবরণী।
                </p>
                <button
                  onClick={() => setIsFestivalModalOpen(true)}
                  className="mt-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5 text-purple-600" />
                  <span>উৎসব ভাতা ব্যবস্থাপনা</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODALS & SUB-COMPONENTS INTEGRATION                         */}
      {/* ============================================================== */}

      {/* 8.1 Pay Staff Salary Modal */}
      <StaffPaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        staffList={staff}
        staffPayments={staffPayments}
        accounts={accounts}
        initialStaffId={payModalStaffId}
        initialMonth={payModalMonth}
        onPayStaff={onPayStaff}
        language={language}
      />

      {/* 8.2 Festival Allowance Modal */}
      <StaffFestivalAllowanceModal
        isOpen={isFestivalModalOpen}
        onClose={() => setIsFestivalModalOpen(false)}
        staffList={staff}
        accounts={accounts}
        currentMosque={currentMosque}
        language={language}
        onDisburse={onDisburseFestivalAllowance}
      />

      {/* 8.3 Bank Transfer Letter Modal */}
      <BankTransferLetterModal
        isOpen={isBankLetterModalOpen}
        onClose={() => {
          setIsBankLetterModalOpen(false);
          loadBankLetters();
        }}
        staffList={staff}
        staffPayments={staffPayments}
        accounts={accounts}
        currentMosque={currentMosque}
        committeeTerms={committeeTerms}
        language={language}
        currentUser={currentUser}
        onLetterCreated={() => {
          loadBankLetters();
        }}
      />

      {/* 8.4 Staff Payment Register Landscape Print Modal */}
      <StaffPaymentRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        staffList={staff}
        payments={staffPayments}
        currentMosque={currentMosque}
        language={language}
      />

      {/* 8.5 Single Staff Salary Slip / Voucher Print Modal */}
      <StaffSalarySlipModal
        isOpen={Boolean(selectedSlipPayment && selectedSlipStaff)}
        onClose={() => {
          setSelectedSlipPayment(null);
          setSelectedSlipStaff(null);
        }}
        staff={selectedSlipStaff}
        payment={selectedSlipPayment}
        currentMosque={currentMosque}
        language={language}
      />

      {/* 8.6 Edit Payment Modal (Safe Double-Entry Accounting Sync) */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm font-siliguri">
                  বেতন ও হাদিয়া রেকর্ড সংশোধন ({editingPayment.expenseVoucherNumber || editingPayment.id})
                </h3>
              </div>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 text-sm">{editingPayment.staffName}</div>
                <div className="text-slate-500 font-siliguri">
                  মাস: <span className="font-bold text-slate-900">{editingPayment.month}</span> • পদবী: {editingPayment.designationBn}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">মূল বেতন (৳)</label>
                  <input
                    type="number"
                    value={editBasicSalary}
                    onChange={(e) => setEditBasicSalary(Number(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-siliguri font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">বোনাস / হাদিয়া (৳)</label>
                  <input
                    type="number"
                    value={editBonus}
                    onChange={(e) => setEditBonus(Number(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-siliguri font-bold text-purple-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">অন্যান্য ভাতা (৳)</label>
                  <input
                    type="number"
                    value={editOtherAllowance}
                    onChange={(e) => setEditOtherAllowance(Number(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-siliguri"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">কর্তন / অগ্রিম সমন্বয় (৳)</label>
                  <input
                    type="number"
                    value={editDeduction}
                    onChange={(e) => setEditDeduction(Number(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-siliguri text-rose-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-900 font-siliguri">সংশোধিত নেট পরিশোধ:</span>
                <span className="text-base font-black text-emerald-800 font-siliguri">
                  ৳{Math.max(0, editBasicSalary + editBonus + editOtherAllowance - editDeduction).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পরিশোধ মাধ্যম</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="CASH">নগদ ক্যাশ</option>
                    <option value="BANK">ব্যাংক ট্রান্সফার</option>
                    <option value="MFS">মোবাইল ব্যাংকিং (MFS)</option>
                    <option value="CHEQUE">চেক</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">হিসাব একাউন্ট</label>
                  <select
                    value={editAccountId}
                    onChange={(e) => setEditAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nameBn} (ব্যালেন্স: ৳{a.currentBalance?.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">প্রদানের তারিখ</label>
                <input
                  type="date"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সংশোধনের বিবরণ / নোট</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="সংশোধনের কারণ লিখুন..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isEditLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isEditLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>হালনাগাদ সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8.7 Cancel Payment Confirmation Modal */}
      {cancellingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-6 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 font-siliguri">
                  পেমেন্ট বাতিল ও তহবিল রিভার্সাল
                </h3>
                <p className="text-xs text-slate-500">ভাউচার নং: {cancellingPayment.expenseVoucherNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="font-bold text-slate-900">{cancellingPayment.staffName}</span> এর {cancellingPayment.month} মাসের বেতন বাবদ <span className="font-bold text-rose-600">৳{cancellingPayment.netPaid?.toLocaleString('en-IN')}</span> বাতিল করতে চান?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>অ্যাকাউন্টিং সমন্বয় নিশ্চয়তা:</span>
              </div>
              <p className="text-[11px]">
                এই পেমেন্ট বাতিল করলে সংশ্লিষ্ট ব্যাংক/ক্যাশ অ্যাকাউন্টে ৳{cancellingPayment.netPaid} ফান্ড ফেরত যুক্ত হবে এবং ব্যয়ের ভাউচারটি বাতিল হিসেবে সংরক্ষিত থাকবে (অডিট ট্রেইল বিনষ্ট হবে না)।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বাতিলের কারণ (বাধ্যতামূলক নয়)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="যেমন: ভুল অ্যাকাউন্ট বা এন্ট্রি ত্রুটি"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCancellingPayment(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল নয়
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isCancelLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>হ্যাঁ, পেমেন্ট বাতিল করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8.8 Individual Staff Payment Statement Modal */}
      {statementStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm font-siliguri">
                  {statementStaff.name} - ব্যক্তিগত বেতন ও হাদিয়া বিবরণী
                </h3>
              </div>
              <button
                onClick={() => setStatementStaff(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">পদবী:</span>
                  <span className="font-bold text-slate-800">{statementStaff.designationBn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">মোবাইল:</span>
                  <span className="font-mono text-slate-800">{statementStaff.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">মাসিক নির্ধারিত বেতন:</span>
                  <span className="font-bold text-slate-900 font-siliguri">৳{statementStaff.monthlySalary?.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ব্যাংক তথ্য:</span>
                  <span className="font-mono text-slate-800 text-[11px]">
                    {statementStaff.bankName ? `${statementStaff.bankName} (${formatAccountNumber(statementStaff.accountNumber)})` : '—'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2 font-siliguri">সকল পেমেন্ট রেকর্ড</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold font-siliguri">
                      <tr>
                        <th className="py-2.5 px-3">ভাউচার</th>
                        <th className="py-2.5 px-3">তারিখ ও মাস</th>
                        <th className="py-2.5 px-3">মূল বেতন</th>
                        <th className="py-2.5 px-3">বোনাস</th>
                        <th className="py-2.5 px-3">কর্তন</th>
                        <th className="py-2.5 px-3">নেট পরিশোধ</th>
                        <th className="py-2.5 px-3">মাধ্যম</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {staffPayments
                        .filter((p) => p.staffId === statementStaff.id)
                        .map((p) => (
                          <tr key={p.id} className={p.status === 'CANCELLED' ? 'bg-rose-50/50 opacity-60' : ''}>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{p.expenseVoucherNumber || p.id}</td>
                            <td className="py-2.5 px-3">{p.month} ({p.paymentDate})</td>
                            <td className="py-2.5 px-3 font-siliguri">৳{p.basicSalary?.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 font-siliguri text-purple-700">+{p.bonus || p.allowance || 0}</td>
                            <td className="py-2.5 px-3 font-siliguri text-rose-600">-{p.deduction || 0}</td>
                            <td className="py-2.5 px-3 font-siliguri font-bold text-slate-900">৳{p.netPaid?.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 font-semibold">{p.paymentMethod}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setStatementStaff(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

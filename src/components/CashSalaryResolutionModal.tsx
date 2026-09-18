import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  FileCheck2,
  Users,
  Calendar,
  Building,
  CheckSquare,
  Square,
  DollarSign,
  Download,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ShieldCheck,
  FileText,
  UserCheck,
  CreditCard,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount, Mosque } from '../types';
import {
  Language,
  formatCurrency,
  formatDate,
  formatBengaliMonthYear,
  numberToBengaliWords,
  toBanglaNumber
} from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';

interface CashSalaryResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts?: FinancialAccount[];
  initialPaymentId?: string;
  initialMonth?: string;
  currentMosque?: Mosque | null;
  onPayStaff?: (data: any) => Promise<void>;
  language?: Language;
}

interface StaffSalaryCalcRow {
  staffId: string;
  staffCode: string;
  name: string;
  designation: string;
  basicSalary: number;
  allowance: number;
  otherAllowance: number;
  grossSalary: number;
  deduction: number;
  advanceAdjustment: number;
  loanAdjustment: number;
  netPayable: number;
  paidAmount: number;
  dueAmount: number;
  existingPaymentId?: string;
  isAlreadyPaid: boolean;
}

export const CashSalaryResolutionModal: React.FC<CashSalaryResolutionModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  staffPayments = [],
  accounts = [],
  initialPaymentId,
  initialMonth,
  currentMosque,
  onPayStaff,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultMonth = initialMonth || new Date().toISOString().substring(0, 7);

  // Active View Tab: 'FORM' or 'PREVIEW'
  const [activeTab, setActiveTab] = useState<'FORM' | 'PREVIEW'>('FORM');

  // Print Letterhead Toggle state (Default: ON)
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);

  // SECTION A: Resolution Info State
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [resolutionNo, setResolutionNo] = useState<string>(() => {
    const d = new Date();
    return `রেজ-বেতন/${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
  });
  const [resolutionDate, setResolutionDate] = useState<string>(todayStr);
  const [meetingReference, setMeetingReference] = useState<string>(
    'মসজিদ পরিচালনা পরিষদের মাসিক নির্বাহী কমিটির সাধারণ সভা'
  );
  const [meetingDate, setMeetingDate] = useState<string>(todayStr);
  const [meetingResolutionNo, setMeetingResolutionNo] = useState<string>('০১');
  const [meetingDecisionType, setMeetingDecisionType] = useState<string>(
    'নিয়মিত মাসিক সভা ও বেতন অনুমোদন'
  );
  const [resolutionRemarks, setResolutionRemarks] = useState<string>('');

  // SECTION B & C: Selected Staff IDs
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [customCalculations, setCustomCalculations] = useState<Record<string, Partial<StaffSalaryCalcRow>>>({});

  // SECTION D: Cash Payment Details
  const defaultCashAccount = accounts.find((a) => a.accountType === 'CASH' || a.name.includes('ক্যাশ') || a.name.includes('নগদ')) || accounts[0];
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultCashAccount?.id || '');
  const [disbursementDate, setDisbursementDate] = useState<string>(todayStr);
  const [voucherNumber, setVoucherNumber] = useState<string>(() => `V-CASH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [paymentRemarks, setPaymentRemarks] = useState<string>('নগদ বেতন পরিশোধ');

  // Confirmation & Action States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter active staff
  const activeStaff = useMemo(() => staffList.filter((s) => s.status === 'ACTIVE'), [staffList]);

  // Month Cash Payments for current month
  const monthPayments = useMemo(() => {
    return staffPayments.filter((p) => {
      const matchMonth = (p.paymentMonth || p.month) === selectedMonth;
      return matchMonth && p.status !== 'CANCELLED';
    });
  }, [staffPayments, selectedMonth]);

  // Initial staff selection logic
  useEffect(() => {
    if (isOpen) {
      if (initialPaymentId) {
        const p = staffPayments.find((x) => x.id === initialPaymentId);
        if (p) {
          setSelectedStaffIds([p.staffId]);
          if (p.paymentMonth || p.month) setSelectedMonth(p.paymentMonth || p.month);
          return;
        }
      }
      // If initial month had staff or active staff
      if (activeStaff.length > 0) {
        setSelectedStaffIds(activeStaff.map((s) => s.id));
      }
    }
  }, [isOpen, initialPaymentId, initialMonth, activeStaff, staffPayments]);

  // Derived Bengali Month Label (Prominent)
  const bengaliMonthLabel = useMemo(() => {
    return formatBengaliMonthYear(selectedMonth) || selectedMonth;
  }, [selectedMonth]);

  // Compute detailed Salary Rows for selected staff
  const salaryRows: StaffSalaryCalcRow[] = useMemo(() => {
    return selectedStaffIds.map((staffId) => {
      const staff = staffList.find((s) => s.id === staffId);
      const existingPayment = monthPayments.find((p) => p.staffId === staffId);
      const isAlreadyPaid = Boolean(existingPayment);

      const custom = customCalculations[staffId] || {};

      const basicSalary = custom.basicSalary !== undefined
        ? custom.basicSalary
        : (existingPayment?.basicSalary || staff?.monthlySalary || staff?.basicSalary || 0);

      const allowance = custom.allowance !== undefined
        ? custom.allowance
        : (existingPayment?.allowance || staff?.allowance || 0);

      const otherAllowance = custom.otherAllowance !== undefined
        ? custom.otherAllowance
        : (existingPayment?.otherAllowance || 0);

      const grossSalary = basicSalary + allowance + otherAllowance;

      const deduction = custom.deduction !== undefined
        ? custom.deduction
        : (existingPayment?.deduction || 0);

      const advanceAdjustment = custom.advanceAdjustment !== undefined
        ? custom.advanceAdjustment
        : (existingPayment?.advanceAdjustment || 0);

      const loanAdjustment = custom.loanAdjustment !== undefined
        ? custom.loanAdjustment
        : (existingPayment?.loanAdjustment || 0);

      const totalDeductions = deduction + advanceAdjustment + loanAdjustment;
      const netPayable = Math.max(0, grossSalary - totalDeductions);

      const paidAmount = custom.paidAmount !== undefined
        ? custom.paidAmount
        : (existingPayment?.paidAmount || existingPayment?.netPayable || netPayable);

      const dueAmount = Math.max(0, netPayable - paidAmount);

      return {
        staffId,
        staffCode: staff?.staffCode || staff?.id || 'N/A',
        name: staff?.fullNameBn || staff?.name || 'কর্মী',
        designation: staff?.designationBn || staff?.designation || 'স্টাফ',
        basicSalary,
        allowance,
        otherAllowance,
        grossSalary,
        deduction,
        advanceAdjustment,
        loanAdjustment,
        netPayable,
        paidAmount,
        dueAmount,
        existingPaymentId: existingPayment?.id,
        isAlreadyPaid,
      };
    });
  }, [selectedStaffIds, staffList, monthPayments, customCalculations]);

  // Aggregate Totals
  const totalGross = salaryRows.reduce((sum, r) => sum + r.grossSalary, 0);
  const totalDeductions = salaryRows.reduce((sum, r) => sum + r.deduction + r.advanceAdjustment + r.loanAdjustment, 0);
  const totalNetPayable = salaryRows.reduce((sum, r) => sum + r.netPayable, 0);
  const totalCashPaid = salaryRows.reduce((sum, r) => sum + r.paidAmount, 0);
  const totalDueRemaining = salaryRows.reduce((sum, r) => sum + r.dueAmount, 0);

  // Total cash in Bengali words
  const totalCashInWords = useMemo(() => {
    return numberToBengaliWords(totalCashPaid);
  }, [totalCashPaid]);

  // Handlers for Staff Selection
  const handleToggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSelectAllStaff = () => {
    if (selectedStaffIds.length === activeStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(activeStaff.map((s) => s.id));
    }
  };

  const handleUpdateCustomField = (staffId: string, field: keyof StaffSalaryCalcRow, value: number) => {
    setCustomCalculations((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value,
      },
    }));
  };

  // Print Handler
  const handlePrint = async () => {
    await printElement('printable-cash-salary-resolution-a4', {
      title: `নগদ_বেতন_পরিশোধ_রেজুলেশন_${selectedMonth}_${resolutionNo}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '8mm 10mm',
    });
  };

  // Validation Before Submission
  const validateBeforeSubmit = (): boolean => {
    if (!selectedMonth) {
      setValidationError('বেতনের মাস নির্বাচন করা আবশ্যক।');
      return false;
    }
    if (selectedStaffIds.length === 0) {
      setValidationError('অন্তত একজন কর্মী নির্বাচন করা আবশ্যক।');
      return false;
    }
    if (!resolutionNo.trim()) {
      setValidationError('রেজুলেশন নম্বর আবশ্যক।');
      return false;
    }
    if (!resolutionDate) {
      setValidationError('রেজুলেশনের তারিখ আবশ্যক।');
      return false;
    }
    if (totalCashPaid <= 0) {
      setValidationError('মোট পরিশোধিত নগদ অর্থের পরিমাণ ০-এর বেশি হতে হবে।');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Open Confirmation Modal
  const handleOpenConfirmation = () => {
    if (validateBeforeSubmit()) {
      setIsConfirmModalOpen(true);
    }
  };

  // Final Cash Payment Execution
  const handleExecutePayment = async () => {
    if (!onPayStaff) {
      setIsConfirmModalOpen(false);
      setActiveTab('PREVIEW');
      return;
    }

    try {
      setIsProcessingPayment(true);
      setValidationError(null);

      // Process payment for unpaid staff in this resolution
      const unpaidRows = salaryRows.filter((r) => !r.isAlreadyPaid);

      for (const row of unpaidRows) {
        await onPayStaff({
          staffId: row.staffId,
          month: selectedMonth,
          paymentDate: disbursementDate || resolutionDate,
          basicSalary: row.basicSalary,
          allowance: row.allowance + row.otherAllowance,
          deduction: row.deduction,
          advanceAdjustment: row.advanceAdjustment + row.loanAdjustment,
          totalPayable: row.grossSalary,
          netPaid: row.paidAmount,
          accountId: selectedAccountId,
          paymentMethod: 'CASH',
          voucherNumber: voucherNumber,
          notes: `নগদ বেতন রেজুলেশন নং: ${resolutionNo} | ${paymentRemarks}`,
        });
      }

      setIsProcessingPayment(false);
      setIsConfirmModalOpen(false);
      setActionSuccessMessage('নগদ বেতন পরিশোধ ও রেজুলেশন সফলভাবে সম্পন্ন হয়েছে!');
      setActiveTab('PREVIEW');

      setTimeout(() => {
        setActionSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setIsProcessingPayment(false);
      setValidationError(err?.message || 'বেতন পরিশোধ সম্পন্ন করতে ব্যর্থ হয়েছে।');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col print:border-none print:shadow-none print:rounded-none print:max-h-none print:w-full">
        
        {/* Top Header Controls (Hidden during print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold font-siliguri text-white leading-tight">
                  নগদ বেতন পরিশোধের রেজুলেশন
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-siliguri">
                  মাস: {bengaliMonthLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                একক বা একাধিক কর্মীর মাসিক বেতন নগদ পরিশোধের দাপ্তরিক রেজুলেশন ও গ্রহণ স্বীকৃতি
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('FORM')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'FORM'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                📝 এন্ট্রি ফর্ম
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'PREVIEW'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                📄 অফিসিয়াল রেজুলেশন প্রিভিউ
              </button>
            </div>

            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 cursor-pointer border border-slate-700 transition select-none">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span>{includeLetterhead ? '☑ লেটারহেডসহ' : '☐ লেটারহেড ছাড়া'}</span>
            </label>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
              title="A4 প্রিন্ট বা PDF ডাউনলোড"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {actionSuccessMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-900 font-bold flex items-center space-x-2 shrink-0 animate-in fade-in print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 text-xs text-rose-900 font-bold flex items-center space-x-2 shrink-0 animate-in fade-in print:hidden">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 print:p-0 print:bg-white print:overflow-visible">
          {activeTab === 'FORM' ? (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* SECTION A: রেজুলেশন সংক্রান্ত তথ্য */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">১</span>
                    <h3 className="text-sm font-bold text-slate-900 font-siliguri">রেজুলেশন সংক্রান্ত তথ্য</h3>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500 font-semibold">নির্বাচিত বেতন মাস: </span>
                    <span className="font-extrabold text-blue-900 font-siliguri text-sm">{bengaliMonthLabel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                  {/* Month Picker */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      বেতনের মাস <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-950 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-blue-700 font-semibold mt-1 font-siliguri">
                      👉 {bengaliMonthLabel}
                    </p>
                  </div>

                  {/* Resolution Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      রেজুলেশন নম্বর <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={resolutionNo}
                      onChange={(e) => setResolutionNo(e.target.value)}
                      placeholder="যেমন: রেজ-বেতন/২০২৬/০৯-০১"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Resolution Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      রেজুলেশনের তারিখ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={resolutionDate}
                      onChange={(e) => setResolutionDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Meeting Ref */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      সভা / সূত্র
                    </label>
                    <input
                      type="text"
                      value={meetingReference}
                      onChange={(e) => setMeetingReference(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Meeting Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      সভা / অনুমোদনের তারিখ
                    </label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Meeting Resolution No */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      সভার প্রস্তাব / রেজুলেশন নং
                    </label>
                    <input
                      type="text"
                      value={meetingResolutionNo}
                      onChange={(e) => setMeetingResolutionNo(e.target.value)}
                      placeholder="০১"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Decision Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      সিদ্ধান্তের ধরন
                    </label>
                    <input
                      type="text"
                      value={meetingDecisionType}
                      onChange={(e) => setMeetingDecisionType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      সাধারণ মন্তব্য
                    </label>
                    <input
                      type="text"
                      value={resolutionRemarks}
                      onChange={(e) => setResolutionRemarks(e.target.value)}
                      placeholder="প্রয়োজনে অতিরিক্ত নোট"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: কর্মী নির্বাচন */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">২</span>
                    <h3 className="text-sm font-bold text-slate-900 font-siliguri">কর্মী নির্বাচন ও তালিকা</h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ({selectedStaffIds.length} জন নির্বাচিত / মোট {activeStaff.length} জন সক্রিয়)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllStaff}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      {selectedStaffIds.length === activeStaff.length ? 'সব বাদ দিন' : '✓ সকল কর্মী নির্বাচন'}
                    </button>
                  </div>
                </div>

                {/* Staff Selection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {activeStaff.map((staff) => {
                    const isChecked = selectedStaffIds.includes(staff.id);
                    const existingPayment = monthPayments.find((p) => p.staffId === staff.id);
                    const isPaid = Boolean(existingPayment);

                    return (
                      <div
                        key={staff.id}
                        onClick={() => handleToggleStaff(staff.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                              isChecked
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            ✓
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block font-siliguri">
                              {staff.fullNameBn || staff.name}
                            </span>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                              <span className="font-semibold text-emerald-800">{staff.designationBn}</span>
                              <span>• #{staff.staffCode || staff.id.slice(0, 6)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-800 font-siliguri">
                            {formatCurrency(staff.monthlySalary || staff.basicSalary || 0, language)}
                          </div>
                          {isPaid ? (
                            <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              পরিশোধিত
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                              বকেয়া
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: কর্মীর বিস্তারিত বেতন হিসাব (Salary Breakdown) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center">৩</span>
                    <h3 className="text-sm font-bold text-slate-900 font-siliguri">কর্মীর বেতন হিসাব ও বিবরণী</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    সূত্র: মূল বেতন + নিয়মিত ভাতা + অন্যান্য পাওনা − কর্তন − সমন্বয় = নিট প্রদেয়
                  </p>
                </div>

                {salaryRows.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                    কোনো কর্মী নির্বাচিত নেই। উপরে সেকশন ২ থেকে অন্তত একজন কর্মী নির্বাচন করুন।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2.5 text-center w-8">নং</th>
                          <th className="p-2.5">কর্মীর নাম ও পদবি</th>
                          <th className="p-2.5 text-right">মূল বেতন</th>
                          <th className="p-2.5 text-right">ভাতা</th>
                          <th className="p-2.5 text-right">অন্যান্য</th>
                          <th className="p-2.5 text-right">মোট (গ্রস)</th>
                          <th className="p-2.5 text-right text-rose-700">কর্তন</th>
                          <th className="p-2.5 text-right text-amber-700">অগ্রিম/ঋণ</th>
                          <th className="p-2.5 text-right font-bold text-blue-900">নিট প্রদেয়</th>
                          <th className="p-2.5 text-right font-black text-emerald-900">পরিশোধ (নগদ)</th>
                          <th className="p-2.5 text-center">স্ট্যাটাস</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-siliguri">
                        {salaryRows.map((row, idx) => (
                          <tr key={row.staffId} className="hover:bg-slate-50/80">
                            <td className="p-2.5 text-center font-bold text-slate-500">{toBanglaNumber(idx + 1)}</td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 block">{row.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {row.designation} • ID: {row.staffCode}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono">
                              <input
                                type="number"
                                value={row.basicSalary}
                                onChange={(e) => handleUpdateCustomField(row.staffId, 'basicSalary', Number(e.target.value) || 0)}
                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono text-emerald-700">
                              <input
                                type="number"
                                value={row.allowance}
                                onChange={(e) => handleUpdateCustomField(row.staffId, 'allowance', Number(e.target.value) || 0)}
                                className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-700">
                              <input
                                type="number"
                                value={row.otherAllowance}
                                onChange={(e) => handleUpdateCustomField(row.staffId, 'otherAllowance', Number(e.target.value) || 0)}
                                className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800 font-mono">
                              {formatCurrency(row.grossSalary, language)}
                            </td>
                            <td className="p-2.5 text-right font-mono text-rose-700">
                              <input
                                type="number"
                                value={row.deduction}
                                onChange={(e) => handleUpdateCustomField(row.staffId, 'deduction', Number(e.target.value) || 0)}
                                className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-rose-700"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono text-amber-700">
                              <input
                                type="number"
                                value={row.advanceAdjustment}
                                onChange={(e) => handleUpdateCustomField(row.staffId, 'advanceAdjustment', Number(e.target.value) || 0)}
                                className="w-16 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-amber-700"
                              />
                            </td>
                            <td className="p-2.5 text-right font-bold text-blue-900 font-mono">
                              {formatCurrency(row.netPayable, language)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-emerald-950 bg-emerald-50/50">
                              <input
                                type="number"
                                value={row.paidAmount}
                                onChange={(e) => handleUpdateCustomField(row.staffId, 'paidAmount', Number(e.target.value) || 0)}
                                className="w-20 text-right bg-emerald-100/80 border border-emerald-300 rounded px-1.5 py-0.5 text-xs font-mono font-black text-emerald-950"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              {row.isAlreadyPaid ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  পরিশোধিত
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                                  নতুন বিল
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 font-siliguri text-slate-900">
                          <td colSpan={5} className="p-3 text-right">
                            সর্বমোট বাজেট ও হিসাব:
                          </td>
                          <td className="p-3 text-right font-bold font-mono text-slate-900">
                            {formatCurrency(totalGross, language)}
                          </td>
                          <td colSpan={2} className="p-3 text-right text-rose-700 font-mono">
                            -{formatCurrency(totalDeductions, language)}
                          </td>
                          <td className="p-3 text-right font-bold font-mono text-blue-950">
                            {formatCurrency(totalNetPayable, language)}
                          </td>
                          <td className="p-3 text-right font-black font-mono text-emerald-950 text-sm bg-emerald-100/70">
                            {formatCurrency(totalCashPaid, language)}
                          </td>
                          <td className="p-3 text-center text-xs font-semibold text-emerald-800">
                            নগদ
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Amount in words banner */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 font-siliguri">
                  <div>
                    <span className="font-bold text-emerald-950">সর্বমোট নগদ পরিশোধ: </span>
                    <span className="text-emerald-900 font-bold">{formatCurrency(totalCashPaid, language)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950">কথায়: </span>
                    <span className="text-emerald-900 font-bold">{totalCashInWords}</span>
                  </div>
                </div>
              </div>

              {/* SECTION D: নগদ পরিশোধের তথ্য */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">৪</span>
                  <h3 className="text-sm font-bold text-slate-900 font-siliguri">নগদ পরিশোধ সংক্রান্ত তথ্য</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
                  {/* Payment Method (Strictly Cash) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      পরিশোধের মাধ্যম
                    </label>
                    <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                      <Wallet className="w-4 h-4 text-emerald-700" />
                      <span>নগদ (Cash)</span>
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      পরিশোধের তারিখ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={disbursementDate}
                      onChange={(e) => setDisbursementDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Cash Account */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      নগদ হিসাব / অ্যাকাউন্ট <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.currentBalance, language)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Voucher Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ভাউচার / রেফারেন্স নম্বর
                    </label>
                    <input
                      type="text"
                      value={voucherNumber}
                      onChange={(e) => setVoucherNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer in Form Tab */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600 font-siliguri">
                  মোট <span className="font-bold text-slate-900">{salaryRows.length}</span> জন কর্মীর জন্য 
                  সর্বমোট নগদ প্রদেয় <span className="font-bold text-emerald-800">{formatCurrency(totalCashPaid, language)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PREVIEW')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>রেজুলেশন প্রিভিউ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenConfirmation}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>নগদ বেতন পরিশোধ ও অনুমোদন নিশ্চিত করুন</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* PREVIEW / A4 PRINT VIEW TAB */
            <div className="flex justify-center">
              <div
                id="printable-cash-salary-resolution-a4"
                className="w-full max-w-[210mm] bg-white shadow-xl rounded-sm p-8 sm:p-12 text-slate-900 min-h-[297mm] flex flex-col justify-between font-sans border border-slate-200 print:border-none print:shadow-none print:p-6 print:m-0"
              >
                <div>
                  {/* Dynamic Official Mosque Letterhead if enabled */}
                  {includeLetterhead && (
                    <div className="mb-4 break-inside-avoid">
                      <MosqueOfficialLetterhead
                        mosque={currentMosque}
                        refNumber={resolutionNo}
                        dateStr={formatDate(resolutionDate, language)}
                        documentTitle="কার্যনির্বাহী রেজুলেশন ও বেতন অনুমোদন"
                      />
                    </div>
                  )}

                  {/* Minimal Header when Letterhead is OFF */}
                  {!includeLetterhead && (
                    <div className="flex justify-between items-center text-xs text-slate-600 pb-2 mb-4 border-b border-slate-300 font-mono">
                      <div>স্মারক নম্বর: <strong>{resolutionNo}</strong></div>
                      <div>তারিখ: <strong>{formatDate(resolutionDate, language)}</strong></div>
                    </div>
                  )}

                  {/* Prominent Resolution Header & Bold Bengali Month */}
                  <div className="text-center my-4 border-b-2 border-slate-900 pb-3 break-inside-avoid">
                    <span className="inline-block bg-slate-900 text-white text-[11px] font-bold uppercase px-4 py-1 rounded-full mb-1 tracking-wide font-siliguri">
                      বেতন পরিশোধের রেজুলেশন ও গ্রহণ স্বীকৃতি
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-siliguri leading-snug tracking-tight mt-1">
                      মাসিক বেতন নগদ পরিশোধের রেজুলেশন
                    </h2>
                    
                    {/* Bold Prominent Bengali Month Box */}
                    <div className="mt-2 inline-flex flex-col items-center justify-center bg-slate-50 border border-slate-300 px-6 py-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-siliguri">বেতনের মাস</span>
                      <span className="text-base sm:text-lg font-extrabold text-slate-950 font-siliguri">
                        {bengaliMonthLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 mt-2 font-siliguri">
                      <span><strong>সূত্র / সভা:</strong> {meetingReference}</span>
                      <span>• <strong>সভার তারিখ:</strong> {formatDate(meetingDate, language)}</span>
                      <span>• <strong>প্রস্তাব নং:</strong> {meetingResolutionNo}</span>
                      <span>• <strong>পরিশোধের মাধ্যম:</strong> নগদ</span>
                    </div>
                  </div>

                  {/* Section E: Resolution Decision Narrative */}
                  <div className="my-4 p-4 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed text-justify break-inside-avoid font-siliguri">
                    <strong className="text-slate-950">রেজুলেশন সিদ্ধান্ত: </strong>
                    মসজিদ পরিচালনা পরিষদের অনুমোদিত সিদ্ধান্ত অনুযায়ী অত্র মসজিদের সম্মানিত ইমাম, মুয়াজ্জিন, খাদেম ও সংশ্লিষ্ট কর্মকর্তা-কর্মচারীদের <strong className="text-slate-950">{bengaliMonthLabel}</strong> মাসের বেতন নির্ধারিত হিসাব অনুযায়ী <strong className="text-slate-950">নগদ পরিশোধের</strong> সিদ্ধান্ত গৃহীত হয়। তালিকাভুক্ত কর্মীদের প্রাপ্যতা হিসাব অনুযায়ী নগদ অর্থ প্রদান করা হয়েছে এবং সংশ্লিষ্ট কর্মীগণ প্রাপ্য অর্থ পূর্ণ বুঝিয়া পাওয়ার স্বীকৃতিস্বরূপ দস্তখত প্রদান করিয়াছেন।
                  </div>

                  {/* Section C: Cash Salary Breakdown Table */}
                  <div className="my-4 break-inside-avoid">
                    <table className="w-full text-xs text-left border-collapse border border-slate-400">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-bold font-siliguri">
                          <th className="border border-slate-400 p-2 text-center w-8">নং</th>
                          <th className="border border-slate-400 p-2">কর্মীর নাম ও পদবি</th>
                          <th className="border border-slate-400 p-2 text-right">মূল বেতন</th>
                          <th className="border border-slate-400 p-2 text-right">ভাতা</th>
                          <th className="border border-slate-400 p-2 text-right">কর্তন/সমন্বয়</th>
                          <th className="border border-slate-400 p-2 text-right">নিট প্রদেয়</th>
                          <th className="border border-slate-400 p-2 text-right bg-slate-200/70">নগদ পরিশোধ</th>
                          <th className="border border-slate-400 p-2 text-center w-36">গ্রহীতার স্বাক্ষর</th>
                        </tr>
                      </thead>
                      <tbody className="font-siliguri divide-y divide-slate-300">
                        {salaryRows.map((row, idx) => (
                          <tr key={row.staffId} className="hover:bg-slate-50">
                            <td className="border border-slate-400 p-2 text-center font-bold text-slate-600">
                              {toBanglaNumber(idx + 1)}
                            </td>
                            <td className="border border-slate-400 p-2">
                              <span className="font-bold text-slate-950 block text-xs">{row.name}</span>
                              <span className="text-[10px] text-slate-600 block">{row.designation} (ID: {row.staffCode})</span>
                            </td>
                            <td className="border border-slate-400 p-2 text-right font-mono">
                              {formatCurrency(row.basicSalary, language)}
                            </td>
                            <td className="border border-slate-400 p-2 text-right font-mono text-emerald-800">
                              +{formatCurrency(row.allowance + row.otherAllowance, language)}
                            </td>
                            <td className="border border-slate-400 p-2 text-right font-mono text-rose-800">
                              -{formatCurrency(row.deduction + row.advanceAdjustment + row.loanAdjustment, language)}
                            </td>
                            <td className="border border-slate-400 p-2 text-right font-bold text-slate-900 font-mono">
                              {formatCurrency(row.netPayable, language)}
                            </td>
                            <td className="border border-slate-400 p-2 text-right font-black text-slate-950 bg-slate-100/80 font-mono">
                              {formatCurrency(row.paidAmount, language)}
                            </td>
                            <td className="border border-slate-400 p-2 text-center align-bottom bg-slate-50/50">
                              <div className="h-6 border-b border-dashed border-slate-400 mb-0.5" />
                              <span className="text-[8px] text-slate-400 block font-sans">স্বাক্ষর ও তারিখ</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-950 font-siliguri border-t-2 border-slate-400">
                          <td colSpan={5} className="border border-slate-400 p-2 text-right">
                            সর্বমোট নগদ পরিশোধ:
                          </td>
                          <td className="border border-slate-400 p-2 text-right font-bold font-mono">
                            {formatCurrency(totalNetPayable, language)}
                          </td>
                          <td className="border border-slate-400 p-2 text-right font-black font-mono text-sm bg-slate-200">
                            {formatCurrency(totalCashPaid, language)}
                          </td>
                          <td className="border border-slate-400 p-2 bg-slate-50" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Total In Words Strip */}
                  <div className="my-3 p-2.5 bg-slate-50 border border-slate-300 rounded text-xs flex justify-between font-siliguri break-inside-avoid">
                    <span><strong>কথায়: </strong>{totalCashInWords}</span>
                    <span><strong>পরিশোধের মাধ্যম:</strong> নগদ (ক্যাশ)</span>
                  </div>

                  {/* Section F: Individual Staff Acceptance Receipts */}
                  <div className="my-6 space-y-3 break-inside-avoid">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 font-siliguri">
                      কর্মীদের বেতন গ্রহণ স্বীকৃতি ও রসিদ
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {salaryRows.map((row) => (
                        <div
                          key={`rec-${row.staffId}`}
                          className="border border-slate-300 bg-slate-50/50 p-3 rounded text-xs space-y-2 font-siliguri"
                        >
                          <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                            <span>{row.name} ({row.designation})</span>
                            <span className="font-mono text-slate-800">{formatCurrency(row.paidAmount, language)}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 leading-snug">
                            "আমি উপরোক্ত হিসাব অনুযায়ী <strong className="text-slate-950">{bengaliMonthLabel}</strong> মাসের বেতন বাবদ <strong className="text-slate-950">{formatCurrency(row.paidAmount, language)} ({numberToBengaliWords(row.paidAmount)})</strong> নগদ অর্থ বুঝিয়া পাইলাম।"
                          </p>
                          <div className="pt-4 flex justify-between items-end text-[10px] text-slate-500">
                            <div>
                              <span>তারিখ: ________________</span>
                            </div>
                            <div className="text-right">
                              <div className="w-28 border-t border-slate-500 mb-0.5"></div>
                              <span>কর্মীর স্বাক্ষর</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section G: Committee Authority Signatures */}
                <div className="mt-8 pt-6 border-t-2 border-slate-400 grid grid-cols-4 gap-3 text-center text-xs font-siliguri break-inside-avoid">
                  <div>
                    <div className="h-10 border-b border-slate-400 mb-1.5" />
                    <span className="font-bold text-slate-900 block">প্রস্তুতকারক</span>
                    <span className="text-[10px] text-slate-500 block">হিসাবরক্ষক / অফিস সহকারী</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-400 mb-1.5" />
                    <span className="font-bold text-slate-900 block">যাচাইকারী</span>
                    <span className="text-[10px] text-slate-500 block">অর্থ সম্পাদক / কোষাধ্যক্ষ</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-400 mb-1.5" />
                    <span className="font-bold text-slate-900 block">অনুমোদনকারী</span>
                    <span className="text-[10px] text-slate-500 block">সাধারণ সম্পাদক</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-400 mb-1.5" />
                    <span className="font-bold text-slate-900 block">চূড়ান্ত অনুমোদন</span>
                    <span className="text-[10px] text-slate-500 block">সভাপতি / মোতওয়াল্লী</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Dialog Before Final Payment */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 font-sans">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 font-siliguri">
                নগদ বেতন পরিশোধ নিশ্চিত করুন
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                রেজুলেশন অনুযায়ী নির্বাচিত কর্মীদের বেতন নগদ ব্যালেন্স থেকে পরিশোধ করা হবে।
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs font-siliguri">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-600">বেতনের মাস:</span>
                <span className="font-extrabold text-blue-900">{bengaliMonthLabel}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-600">কর্মী সংখ্যা:</span>
                <span className="font-bold text-slate-900">{salaryRows.length} জন</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-600">মোট প্রদেয়:</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalNetPayable, language)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-600">মোট নগদ পরিশোধ:</span>
                <span className="font-black text-emerald-800 text-sm">{formatCurrency(totalCashPaid, language)}</span>
              </div>
              <div className="flex justify-between pt-0.5 text-[11px] text-slate-500">
                <span>পরিশোধের মাধ্যম:</span>
                <span className="font-bold text-slate-700">নগদ (Cash)</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isProcessingPayment}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isProcessingPayment}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
              >
                {isProcessingPayment ? (
                  <span>প্রক্রিয়াধীন...</span>
                ) : (
                  <span>নগদ বেতন নিশ্চিত করুন</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

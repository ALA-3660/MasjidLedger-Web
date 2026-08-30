import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  IncomeEntry,
  ExpenseEntry,
  Mosque,
  User,
  FinancialAccount,
  AccountHead,
} from '../types';
import { Language, formatCurrency, formatDate, toBanglaNumber } from '../lib/i18n';
import {
  Printer,
  Calendar,
  Filter,
  X,
  FileText,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  Smartphone,
  Layers,
  RotateCcw,
} from 'lucide-react';

export type ReportTimeFilterType = 'SINGLE_DATE' | 'DATE_RANGE' | 'MONTH_WISE' | 'YEAR_WISE' | 'ALL_TIME';

export interface QuickIncomeExpenseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'INCOME' | 'EXPENSE';
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  initialStatus?: string;
}

const BANGLA_MONTHS = [
  { value: '01', label: 'জানুয়ারি' },
  { value: '02', label: 'ফেব্রুয়ারি' },
  { value: '03', label: 'মার্চ' },
  { value: '04', label: 'এপ্রিল' },
  { value: '05', label: 'মে' },
  { value: '06', label: 'জুন' },
  { value: '07', label: 'জুলাই' },
  { value: '08', label: 'আগস্ট' },
  { value: '09', label: 'সেপ্টেম্বর' },
  { value: '10', label: 'অক্টোবর' },
  { value: '11', label: 'নভেম্বর' },
  { value: '12', label: 'ডিসেম্বর' },
];

export const QuickIncomeExpenseReportModal: React.FC<QuickIncomeExpenseReportModalProps> = ({
  isOpen,
  onClose,
  type,
  incomes,
  expenses,
  accounts,
  accountHeads,
  currentMosque,
  currentUser,
  language = 'bn',
  initialStatus = 'ALL',
}) => {
  const isIncome = type === 'INCOME';
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = now.toISOString().split('T')[0];

  // First day of current month
  const firstDayOfMonthStr = `${currentYearStr}-${currentMonthStr}-01`;

  // Filters State
  const [timeFilterType, setTimeFilterType] = useState<ReportTimeFilterType>('MONTH_WISE');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonthStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedHeadId, setSelectedHeadId] = useState<string>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || 'ALL');
  const [showLetterhead, setShowLetterhead] = useState<boolean>(true);
  const [showHeadSummary, setShowHeadSummary] = useState<boolean>(true);

  // Sync initialStatus when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStatusFilter(initialStatus || 'ALL');
    }
  }, [isOpen, initialStatus]);

  // Available Years from actual data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr);
    const dataset = isIncome ? incomes : expenses;
    dataset.forEach((item) => {
      if (item.date) {
        const y = item.date.substring(0, 4);
        if (y && y.length === 4) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [incomes, expenses, isIncome, currentYearStr]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    const rawDataset = isIncome ? incomes : expenses;

    return rawDataset.filter((item) => {
      if (!item.date) return false;

      // 1. Time filtering
      const itemDate = item.date.split('T')[0];
      if (timeFilterType === 'SINGLE_DATE') {
        if (itemDate !== singleDate) return false;
      } else if (timeFilterType === 'DATE_RANGE') {
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      } else if (timeFilterType === 'MONTH_WISE') {
        const targetPrefix = `${selectedYear}-${selectedMonth}`;
        if (!itemDate.startsWith(targetPrefix)) return false;
      } else if (timeFilterType === 'YEAR_WISE') {
        if (!itemDate.startsWith(selectedYear)) return false;
      }
      // ALL_TIME passes all dates

      // 2. Head filter
      if (selectedHeadId !== 'ALL') {
        if (item.mainHeadId !== selectedHeadId && (item as any).subHeadId !== selectedHeadId) {
          return false;
        }
      }

      // 3. Account filter
      if (selectedAccountId !== 'ALL') {
        if (item.accountId !== selectedAccountId) return false;
      }

      // 4. Payment method filter
      if (selectedPaymentMethod !== 'ALL') {
        if (item.paymentMethod !== selectedPaymentMethod) return false;
      }

      // 5. Status filter
      if (statusFilter !== 'ALL') {
        if (item.status !== statusFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort chronologically ascending for reports
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.voucherNumber || '').localeCompare(b.voucherNumber || '');
    });
  }, [
    isIncome,
    incomes,
    expenses,
    timeFilterType,
    singleDate,
    fromDate,
    toDate,
    selectedMonth,
    selectedYear,
    selectedHeadId,
    selectedAccountId,
    selectedPaymentMethod,
    statusFilter,
  ]);

  // Aggregated Summaries
  const {
    totalAmount,
    totalValidCount,
    totalReversedCount,
    cashTotal,
    bankTotal,
    mobileOtherTotal,
    headSummaryList,
  } = useMemo(() => {
    let sum = 0;
    let validCount = 0;
    let revCount = 0;
    let cash = 0;
    let bank = 0;
    let other = 0;

    const headMap: Record<string, { name: string; amount: number; count: number }> = {};

    filteredRecords.forEach((item) => {
      const isReversed = item.status === 'CANCELLED';

      if (statusFilter === 'ALL') {
        if (isReversed) {
          revCount++;
          return; // Exclude reversed items from net active totals when ALL are displayed
        }
      } else if (statusFilter === 'CANCELLED') {
        revCount++;
      }

      validCount++;
      const amt = Number(item.amount) || 0;
      sum += amt;

      if (item.paymentMethod === 'CASH') {
        cash += amt;
      } else if (item.paymentMethod === 'BANK') {
        bank += amt;
      } else {
        other += amt;
      }

      // Head grouping
      const headName = item.mainHeadNameBn || 'সাধারণ খাত';
      if (!headMap[headName]) {
        headMap[headName] = { name: headName, amount: 0, count: 0 };
      }
      headMap[headName].amount += amt;
      headMap[headName].count += 1;
    });

    const headList = Object.values(headMap).sort((a, b) => b.amount - a.amount);

    return {
      totalAmount: sum,
      totalValidCount: statusFilter === 'CANCELLED' ? revCount : validCount,
      totalReversedCount: revCount,
      cashTotal: cash,
      bankTotal: bank,
      mobileOtherTotal: other,
      headSummaryList: headList,
    };
  }, [filteredRecords, statusFilter]);

  // Dynamic Report Title
  const reportTitle = useMemo(() => {
    let statusWord = '';
    if (statusFilter === 'APPROVED') statusWord = 'অনুমোদিত ';
    else if (statusFilter === 'PENDING') statusWord = 'অপেক্ষমাণ ';
    else if (statusFilter === 'CANCELLED') statusWord = 'বাতিলকৃত ';

    const typeText = isIncome ? 'আয় ও প্রাপ্তির' : 'ব্যয় ও পরিশোধের';

    if (timeFilterType === 'SINGLE_DATE') {
      return `${formatDate(singleDate, 'bn')} তারিখের ${statusWord}${typeText} বিবরণী`;
    }
    if (timeFilterType === 'DATE_RANGE') {
      return `${formatDate(fromDate, 'bn')} হতে ${formatDate(toDate, 'bn')} পর্যন্ত সময়ের ${statusWord}${typeText} বিবরণী`;
    }
    if (timeFilterType === 'MONTH_WISE') {
      const monthObj = BANGLA_MONTHS.find((m) => m.value === selectedMonth);
      const monthName = monthObj ? monthObj.label : selectedMonth;
      return `${monthName} ${toBanglaNumber(selectedYear)} মাসের ${statusWord}${typeText} বিবরণী`;
    }
    if (timeFilterType === 'YEAR_WISE') {
      return `${toBanglaNumber(selectedYear)} সালের ${statusWord}${typeText} বার্ষিক বিবরণী`;
    }
    return `সার্বিক ${statusWord}${typeText} পূর্ণাঙ্গ আর্থিক বিবরণী`;
  }, [isIncome, timeFilterType, singleDate, fromDate, toDate, selectedMonth, selectedYear, statusFilter]);

  // Subtitle / Period display
  const periodSubtitle = useMemo(() => {
    let statusNote = '';
    if (statusFilter === 'APPROVED') statusNote = ' • অবস্থা: অনুমোদিত';
    else if (statusFilter === 'PENDING') statusNote = ' • অবস্থা: অপেক্ষমাণ';
    else if (statusFilter === 'CANCELLED') statusNote = ' • অবস্থা: বাতিলকৃত';
    else statusNote = ' • অবস্থা: সকল অবস্থা';

    if (timeFilterType === 'SINGLE_DATE') {
      return `হিসাবকাল: ${formatDate(singleDate, 'bn')}${statusNote}`;
    }
    if (timeFilterType === 'DATE_RANGE') {
      return `হিসাবকাল: ${formatDate(fromDate, 'bn')} থেকে ${formatDate(toDate, 'bn')}${statusNote}`;
    }
    if (timeFilterType === 'MONTH_WISE') {
      const monthObj = BANGLA_MONTHS.find((m) => m.value === selectedMonth);
      return `হিসাবকাল: ${monthObj?.label || selectedMonth} ${toBanglaNumber(selectedYear)}${statusNote}`;
    }
    if (timeFilterType === 'YEAR_WISE') {
      return `হিসাবকাল: ১ জানুয়ারি ${toBanglaNumber(selectedYear)} - ৩১ ডিসেম্বর ${toBanglaNumber(selectedYear)}${statusNote}`;
    }
    return `হিসাবকাল: সর্বমোট সংকলন${statusNote}`;
  }, [timeFilterType, singleDate, fromDate, toDate, selectedMonth, selectedYear, statusFilter]);

  // Relevant Main Heads for selector
  const relevantHeads = useMemo(() => {
    return accountHeads.filter((h) => h.type === type && !h.parentId);
  }, [accountHeads, type]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      id="quick-report-modal-portal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print-modal-portal"
    >
      {/* Dynamic Page Margins for A4 Landscape/Portrait */}
      <style>{`
        @page {
          size: A4 portrait !important;
          margin: 8mm 10mm !important;
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 print-modal-card print:max-h-none print:my-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* ============================================================
            1. MODAL TOP CONTROLS & FILTER BAR (Hidden during Print)
            ============================================================ */}
        <div className="bg-slate-900 text-white p-4 flex flex-col gap-3 flex-shrink-0 print:hidden no-print">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl ${isIncome ? 'bg-blue-600' : 'bg-rose-600'} text-white`}>
                {isIncome ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-base font-siliguri flex items-center gap-2">
                  <span>{isIncome ? 'আয় ও প্রাপ্তি কুইক রিপোর্ট' : 'ব্যয় ও পরিশোধ কুইক রিপোর্ট'}</span>
                  <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-baloo">
                    A4 ফরম্যাট
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-baloo">
                  তারিখ, মাস বা বছর অনুযায়ী তাৎক্ষণিক হিসাব নিরীক্ষা ও A4 প্রিন্ট
                </p>
              </div>
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 font-semibold font-siliguri text-xs text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 select-none transition-colors">
                <input
                  id="toggle-quick-report-letterhead"
                  type="checkbox"
                  checked={showLetterhead}
                  onChange={(e) => setShowLetterhead(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>লেটারহেড সহ</span>
              </label>

              <label className="flex items-center space-x-1.5 font-semibold font-siliguri text-xs text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 select-none transition-colors">
                <input
                  id="toggle-quick-report-head-summary"
                  type="checkbox"
                  checked={showHeadSummary}
                  onChange={(e) => setShowHeadSummary(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>খাতভিত্তিক সামারি</span>
              </label>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 text-xs">
            {/* 1. Time Mode */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">সময়ের ধরন:</label>
              <select
                id="select-quick-report-time-type"
                value={timeFilterType}
                onChange={(e) => setTimeFilterType(e.target.value as ReportTimeFilterType)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="MONTH_WISE">মাস ভিত্তিক (Month Wise)</option>
                <option value="DATE_RANGE">তারিখের পরিসর (Date Range)</option>
                <option value="SINGLE_DATE">নির্দিষ্ট একক দিন (Single Date)</option>
                <option value="YEAR_WISE">পুরো বছর (Year Wise)</option>
                <option value="ALL_TIME">সর্বমোট (All Time)</option>
              </select>
            </div>

            {/* 2. Dynamic Date Inputs */}
            {timeFilterType === 'MONTH_WISE' && (
              <>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">মাস:</label>
                  <select
                    id="select-quick-report-month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {BANGLA_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">বছর:</label>
                  <select
                    id="select-quick-report-year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        বছর: {toBanglaNumber(yr)} ({yr})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {timeFilterType === 'SINGLE_DATE' && (
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">নির্দিষ্ট তারিখ:</label>
                <input
                  id="input-quick-report-single-date"
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {timeFilterType === 'DATE_RANGE' && (
              <>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">শুরু তারিখ:</label>
                  <input
                    id="input-quick-report-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">শেষ তারিখ:</label>
                  <input
                    id="input-quick-report-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {timeFilterType === 'YEAR_WISE' && (
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">বছর:</label>
                <select
                  id="select-quick-report-only-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      বছর: {toBanglaNumber(yr)} ({yr})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Head Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">হিসাব খাত:</label>
              <select
                id="select-quick-report-head"
                value={selectedHeadId}
                onChange={(e) => setSelectedHeadId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">সকল প্রধান খাত</option>
                {relevantHeads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nameBn}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Status Filter */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">অবস্থা (Status):</label>
              <select
                id="select-quick-report-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">সকল অবস্থা</option>
                <option value="APPROVED">অনুমোদিত</option>
                <option value="PENDING">অপেক্ষমাণ</option>
                <option value="CANCELLED">বাতিলকৃত</option>
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================
            2. PRINTABLE REPORT PAPER (A4 Document Canvas)
            ============================================================ */}
        <div
          id="quick-income-expense-printable"
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-slate-900 bg-white font-baloo text-xs print-modal-paper print:p-0 print:overflow-visible print:space-y-3"
        >
          {/* Header Block: Software Letterhead vs Pad Margin */}
          {showLetterhead ? (
            <div className="relative pb-3 border-b-2 border-slate-900 text-center letterhead-header-box">
              {/* Logo Anchored to Left */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                {currentMosque?.logoUrl ? (
                  <img
                    src={currentMosque.logoUrl}
                    alt="Mosque Logo"
                    className="w-14 h-14 object-contain rounded-full border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Building className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Centered Mosque Information */}
              <div className="px-16">
                <p className="font-arabic text-xs font-semibold text-slate-800 mb-0.5">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                <h1 className="font-title text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                  {currentMosque?.nameBn || currentMosque?.name || 'মসজিদলেজার কেন্দ্রীয় জামে মসজিদ'}
                </h1>
                <p className="font-letterhead text-xs text-slate-700 mt-0.5">
                  {currentMosque?.address || `${currentMosque?.village || ''} ${currentMosque?.upazila || ''} ${currentMosque?.district || ''}`.trim() || 'বাংলাদেশ'}
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-600 font-medium mt-0.5">
                  {currentMosque?.phone && <span>মোবাইল: {currentMosque.phone}</span>}
                  {currentMosque?.email && <span>ইমেইল: {currentMosque.email}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-16 pb-2 text-center border-b border-slate-300">
              <span className="text-[10px] text-slate-400 font-sans tracking-wide block print:hidden">
                [লেটারহেড প্যাড মার্জিন স্পেস - Letterhead Pad Margin]
              </span>
            </div>
          )}

          {/* Report Title & Subtitle Badge */}
          <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent print:border-none print:py-1">
            <h2 className="text-base sm:text-lg font-bold font-siliguri text-slate-950">
              {reportTitle}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-0.5 text-xs text-slate-600 font-baloo">
              <span className="font-semibold">{periodSubtitle}</span>
              <span>•</span>
              <span>প্রস্তুতের তারিখ: {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* ============================================================
              3. SUMMARY KPI CARDS (Cash, Bank, Mobile, Total)
              ============================================================ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 kpi-summary-box">
            {/* Total */}
            <div className={`p-2.5 rounded-xl border ${isIncome ? 'bg-blue-50/70 border-blue-200' : 'bg-rose-50/70 border-rose-200'} print:border-slate-400`}>
              <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>
                  {statusFilter === 'APPROVED'
                    ? isIncome ? 'মোট অনুমোদিত আয় ও প্রাপ্তি' : 'মোট অনুমোদিত ব্যয় ও পরিশোধ'
                    : statusFilter === 'PENDING'
                    ? isIncome ? 'মোট অপেক্ষমাণ আয় ও প্রাপ্তি' : 'মোট অপেক্ষমাণ ব্যয় ও পরিশোধ'
                    : statusFilter === 'CANCELLED'
                    ? isIncome ? 'মোট বাতিলকৃত আয় ও প্রাপ্তি' : 'মোট বাতিলকৃত ব্যয় ও পরিশোধ'
                    : isIncome ? 'সর্বমোট আয় ও প্রাপ্তি' : 'সর্বমোট ব্যয় ও পরিশোধ'}
                </span>
                <Wallet className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className={`text-base font-bold font-mono mt-0.5 ${isIncome ? 'text-blue-900' : 'text-rose-900'}`}>
                {formatCurrency(totalAmount, 'bn')}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5 font-baloo">
                মোট লেনদেন: {toBanglaNumber(totalValidCount)} টি
              </div>
            </div>

            {/* Cash */}
            <div className="p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-200 print:border-slate-400">
              <div className="text-[11px] font-semibold text-emerald-900 flex items-center justify-between">
                <span>নগদ (Cash) মোট</span>
                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="text-base font-bold font-mono text-emerald-950 mt-0.5">
                {formatCurrency(cashTotal, 'bn')}
              </div>
              <div className="text-[10px] text-emerald-800 mt-0.5 font-baloo">
                ক্যাশ প্রাপ্তি/প্রদান
              </div>
            </div>

            {/* Bank */}
            <div className="p-2.5 rounded-xl border bg-cyan-50/70 border-cyan-200 print:border-slate-400">
              <div className="text-[11px] font-semibold text-cyan-900 flex items-center justify-between">
                <span>ব্যাংক (Bank) মোট</span>
                <Landmark className="w-3.5 h-3.5 text-cyan-700" />
              </div>
              <div className="text-base font-bold font-mono text-cyan-950 mt-0.5">
                {formatCurrency(bankTotal, 'bn')}
              </div>
              <div className="text-[10px] text-cyan-800 mt-0.5 font-baloo">
                চেক/ট্রান্সফার
              </div>
            </div>

            {/* Mobile / Other */}
            <div className="p-2.5 rounded-xl border bg-amber-50/70 border-amber-200 print:border-slate-400">
              <div className="text-[11px] font-semibold text-amber-900 flex items-center justify-between">
                <span>মোবাইল ও অন্যান্য</span>
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <div className="text-base font-bold font-mono text-amber-950 mt-0.5">
                {formatCurrency(mobileOtherTotal, 'bn')}
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5 font-baloo">
                বিকাশ/নগদ/অনলাইন
              </div>
            </div>
          </div>

          {/* ============================================================
              4. HEAD-WISE SUMMARY BREAKDOWN (Optional / Collapsible)
              ============================================================ */}
          {showHeadSummary && headSummaryList.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 print:bg-white print:border-slate-300 break-inside-avoid">
              <div className="flex items-center space-x-1.5 text-xs font-bold font-siliguri text-slate-800 mb-2">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>খাতভিত্তিক সারসংক্ষেপ (Head-wise Breakdown):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {headSummaryList.map((head, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] print:border-slate-300">
                    <div className="font-semibold text-slate-800 truncate" title={head.name}>
                      {head.name}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-slate-900">
                      <span className="font-mono font-bold">{formatCurrency(head.amount, 'bn')}</span>
                      <span className="text-[10px] text-slate-500 font-baloo">{toBanglaNumber(head.count)} টি</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              5. DETAILED TRANSACTIONS TABLE (With A4 Header Repeat)
              ============================================================ */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs print-table">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-[11px]">
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-8">ক্র.</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap w-20">তারিখ</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap w-24">ভাউচার নং</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">খাত ও উপ-খাত</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">বিবরণ</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 whitespace-nowrap">
                    {isIncome ? 'প্রদানকারী/উৎস' : 'প্রাপকের নাম'}
                  </th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center whitespace-nowrap">মাধ্যম</th>
                  <th className="py-2 px-2.5 border-r border-slate-300 text-right whitespace-nowrap w-24">পরিমাণ (৳)</th>
                  <th className="py-2 px-2 border-slate-300 text-center whitespace-nowrap w-16">অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                      নির্বাচিত ফিল্টারে কোনো লেনদেন পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, index) => {
                    const isCancelled = item.status === 'CANCELLED';
                    const isPending = item.status === 'PENDING';
                    const payerOrPayee = isIncome
                      ? (item as IncomeEntry).donorName || (item as IncomeEntry).reference || '-'
                      : (item as ExpenseEntry).payeeName || (item as ExpenseEntry).reference || '-';

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-200 hover:bg-slate-50/50 ${
                          statusFilter === 'ALL' && isCancelled ? 'bg-rose-50/60 text-slate-400 line-through' : ''
                        }`}
                      >
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                          {toBanglaNumber(index + 1)}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 whitespace-nowrap font-mono text-[11px]">
                          {formatDate(item.date, 'bn')}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 font-mono text-[11px] font-semibold whitespace-nowrap">
                          {item.voucherNumber}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200">
                          <div className="font-semibold text-slate-900">{item.mainHeadNameBn}</div>
                          {(item as any).subHeadNameBn && (
                            <div className="text-[10px] text-slate-600">{(item as any).subHeadNameBn}</div>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 text-[11px] max-w-[200px] break-words">
                          {item.description || '-'}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 text-[11px]">
                          {payerOrPayee}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center text-[10.5px]">
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {item.paymentMethod === 'CASH'
                              ? 'নগদ'
                              : item.paymentMethod === 'BANK'
                              ? 'ব্যাংক'
                              : item.paymentMethod}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                          {formatCurrency(item.amount, 'bn')}
                        </td>
                        <td className="py-1.5 px-2 border-slate-200 text-center">
                          {isCancelled ? (
                            <span className="inline-flex items-center text-[10px] text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                              বাতিলকৃত
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center text-[10px] text-amber-800 font-semibold bg-amber-100 px-1.5 py-0.5 rounded">
                              অপেক্ষমাণ
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                              অনুমোদিত
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRecords.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-950 text-xs">
                    <td colSpan={7} className="py-2.5 px-3 text-right border-r border-slate-300 font-siliguri">
                      {statusFilter === 'APPROVED'
                        ? `সর্বমোট অনুমোদিত ${isIncome ? 'আদায়/আয়' : 'ব্যয়/পরিশোধ'}:`
                        : statusFilter === 'PENDING'
                        ? `সর্বমোট অপেক্ষমাণ ${isIncome ? 'আদায়/আয়' : 'ব্যয়/পরিশোধ'}:`
                        : statusFilter === 'CANCELLED'
                        ? `সর্বমোট বাতিলকৃত ${isIncome ? 'আদায়/আয়' : 'ব্যয়/পরিশোধ'}:`
                        : `সর্বমোট কার্যকর ${isIncome ? 'আদায়/আয়' : 'ব্যয়/পরিশোধ'}:`}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-sm border-r border-slate-300">
                      {formatCurrency(totalAmount, 'bn')}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[10px] font-baloo text-slate-600">
                      {toBanglaNumber(totalValidCount)} টি রেকর্ড
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Reversal Note if applicable */}
          {statusFilter === 'ALL' && totalReversedCount > 0 && (
            <p className="text-[10px] text-rose-600 font-medium italic">
              * বি.দ্র.: মোট {toBanglaNumber(totalReversedCount)} টি বাতিলকৃত/রিভার্সড লেনদেন হিসাবের নিট যোগফল থেকে বাদ রাখা হয়েছে।
            </p>
          )}

          {/* ============================================================
              6. OFFICIAL 3-COLUMN COMMITTEE SIGNATURE BLOCK
              ============================================================ */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center print-signature-block break-inside-avoid">
            {/* Column 1: Prepared By */}
            <div>
              <div className="h-10 flex items-end justify-center mb-1">
                <span className="text-[11px] text-slate-400 font-mono italic">
                  {currentUser?.name || 'ক্যাশিয়ার / ডাটা এন্ট্রি'}
                </span>
              </div>
              <div className="border-t border-slate-500 pt-1 font-bold font-siliguri text-slate-900 text-xs">
                প্রস্তুতকারী / ক্যাশিয়ার
              </div>
              <div className="text-[10px] text-slate-600 font-baloo">হিসাব শাখা</div>
            </div>

            {/* Column 2: Accountant / Auditor */}
            <div>
              <div className="h-10 flex items-end justify-center mb-1">
                {currentMosque?.treasurerSignatureUrl && (
                  <img
                    src={currentMosque.treasurerSignatureUrl}
                    alt="Treasurer Signature"
                    className="max-h-9 object-contain mx-auto"
                  />
                )}
              </div>
              <div className="border-t border-slate-500 pt-1 font-bold font-siliguri text-slate-900 text-xs">
                হিসাব নিরীক্ষক / কোষাধ্যক্ষ
              </div>
              <div className="text-[10px] text-slate-600 font-baloo">অর্থ উপকমিটি</div>
            </div>

            {/* Column 3: General Secretary / President */}
            <div>
              <div className="h-10 flex items-end justify-center mb-1">
                {currentMosque?.presidentSignatureUrl ? (
                  <img
                    src={currentMosque.presidentSignatureUrl}
                    alt="President Signature"
                    className="max-h-9 object-contain mx-auto"
                  />
                ) : currentMosque?.secretarySignatureUrl ? (
                  <img
                    src={currentMosque.secretarySignatureUrl}
                    alt="Secretary Signature"
                    className="max-h-9 object-contain mx-auto"
                  />
                ) : null}
              </div>
              <div className="border-t border-slate-500 pt-1 font-bold font-siliguri text-slate-900 text-xs">
                সাধারণ সম্পাদক / সভাপতি
              </div>
              <div className="text-[10px] text-slate-600 font-baloo">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>

          {/* ============================================================
              7. FOOTER WATERMARK & TIMESTAMP
              ============================================================ */}
          <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200 flex items-center justify-between font-baloo">
            <span>MasjidLedger ডিজিটাল মসজিদ ব্যবস্থাপনা সিস্টেম</span>
            <span>প্রিন্ট সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>

        {/* ============================================================
            8. MODAL BOTTOM ACTION BAR (Print & Close)
            ============================================================ */}
        <div className="bg-slate-900 text-white px-5 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden no-print z-10">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-baloo">নির্বাচিত লেনদেন:</span>
            <span className="font-bold text-white font-siliguri">{toBanglaNumber(filteredRecords.length)} টি</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-baloo">কার্যকর মোট:</span>
            <span className={`font-mono font-bold ${isIncome ? 'text-blue-400' : 'text-rose-400'}`}>
              {formatCurrency(totalAmount, 'bn')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold font-siliguri transition-colors cursor-pointer"
            >
              বাতিল / বন্ধ করুন
            </button>
            <button
              type="button"
              id="btn-print-quick-report-a4"
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold font-siliguri rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>রিপোর্ট প্রিন্ট করুন (A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

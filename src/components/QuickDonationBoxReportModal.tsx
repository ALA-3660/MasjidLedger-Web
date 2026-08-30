import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DonationBox,
  DonationBoxCollection,
  FinancialAccount,
  Mosque,
  User,
} from '../types';
import { Language, formatCurrency, formatDate, toBanglaNumber } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import {
  Printer,
  Calendar,
  Filter,
  X,
  Building,
  CheckCircle2,
  Wallet,
  Landmark,
  Layers,
  RotateCcw,
  Archive,
  Store,
  MapPin,
  Users,
  Coins,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export type DonationBoxTimeFilterType = 'SINGLE_DATE' | 'DATE_RANGE' | 'MONTH_WISE' | 'YEAR_WISE' | 'ALL_TIME';

export interface QuickDonationBoxReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationBoxes: DonationBox[];
  boxCollections: DonationBoxCollection[];
  accounts?: FinancialAccount[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  initialBoxId?: string;
  initialTimeType?: DonationBoxTimeFilterType;
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

export const QuickDonationBoxReportModal: React.FC<QuickDonationBoxReportModalProps> = ({
  isOpen,
  onClose,
  donationBoxes,
  boxCollections,
  accounts = [],
  currentMosque,
  currentUser,
  language = 'bn',
  initialBoxId = 'ALL',
  initialTimeType = 'MONTH_WISE',
}) => {
  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = now.toISOString().split('T')[0];

  // First day of current month
  const firstDayOfMonthStr = `${currentYearStr}-${currentMonthStr}-01`;

  // Filters State
  const [timeFilterType, setTimeFilterType] = useState<DonationBoxTimeFilterType>(initialTimeType || 'MONTH_WISE');
  const [singleDate, setSingleDate] = useState<string>(todayStr);
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonthStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedBoxId, setSelectedBoxId] = useState<string>(initialBoxId || 'ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [pageOrientation, setPageOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showLetterhead, setShowLetterhead] = useState<boolean>(true);
  const [showBoxSummary, setShowBoxSummary] = useState<boolean>(true);
  const [showDenominationDetails, setShowDenominationDetails] = useState<boolean>(true);

  // Sync initial props on open
  React.useEffect(() => {
    if (isOpen) {
      if (initialBoxId) setSelectedBoxId(initialBoxId);
      if (initialTimeType) setTimeFilterType(initialTimeType);
    }
  }, [isOpen, initialBoxId, initialTimeType]);

  // Available Years from actual data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr);
    boxCollections.forEach((item) => {
      if (item.collectionDate) {
        const y = item.collectionDate.substring(0, 4);
        if (y && y.length === 4) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [boxCollections, currentYearStr]);

  // Filtered dataset
  const filteredCollections = useMemo(() => {
    return boxCollections
      .filter((item) => {
        // 1. Box Filter
        if (selectedBoxId !== 'ALL' && item.boxId !== selectedBoxId) {
          return false;
        }

        // 2. Account Filter
        if (selectedAccountId !== 'ALL' && item.depositAccountId !== selectedAccountId) {
          return false;
        }

        // 3. Time Filter
        const colDate = item.collectionDate;
        if (!colDate) return false;

        switch (timeFilterType) {
          case 'SINGLE_DATE':
            return colDate === singleDate;

          case 'DATE_RANGE': {
            if (fromDate && colDate < fromDate) return false;
            if (toDate && colDate > toDate) return false;
            return true;
          }

          case 'MONTH_WISE': {
            const prefix = `${selectedYear}-${selectedMonth}`;
            return colDate.startsWith(prefix);
          }

          case 'YEAR_WISE': {
            return colDate.startsWith(selectedYear);
          }

          case 'ALL_TIME':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        // Chronological sorting (earliest first for official register)
        const dComp = (a.collectionDate || '').localeCompare(b.collectionDate || '');
        if (dComp !== 0) return dComp;
        return (a.boxCode || '').localeCompare(b.boxCode || '');
      });
  }, [
    boxCollections,
    selectedBoxId,
    selectedAccountId,
    timeFilterType,
    singleDate,
    fromDate,
    toDate,
    selectedMonth,
    selectedYear,
  ]);

  // Aggregate Metrics
  const totalAmount = useMemo(() => {
    return filteredCollections.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredCollections]);

  const uniqueBoxesInReport = useMemo(() => {
    const set = new Set<string>();
    filteredCollections.forEach((c) => {
      if (c.boxId) set.add(c.boxId);
    });
    return set.size;
  }, [filteredCollections]);

  // Box-wise summary data
  const boxWiseSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        boxId: string;
        boxCode: string;
        shopName: string;
        location: string;
        ownerName: string;
        count: number;
        total: number;
      }
    >();

    filteredCollections.forEach((item) => {
      const bId = item.boxId || 'unknown';
      const bObj = donationBoxes.find((b) => b.id === item.boxId);
      const existing = map.get(bId) || {
        boxId: bId,
        boxCode: item.boxCode || bObj?.boxCode || 'BOX',
        shopName: bObj?.shopName || bObj?.manualName || '',
        location: bObj?.location || '',
        ownerName: bObj?.ownerName || '',
        count: 0,
        total: 0,
      };

      existing.count += 1;
      existing.total += Number(item.amount) || 0;
      map.set(bId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredCollections, donationBoxes]);

  // Deposit Accounts breakdown
  const accountBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; count: number }>();
    filteredCollections.forEach((item) => {
      const accId = item.depositAccountId || 'unspecified';
      const accName = item.depositAccountName || 'ক্যাশ / সাধারণ ফান্ড';
      const existing = map.get(accId) || { name: accName, amount: 0, count: 0 };
      existing.amount += Number(item.amount) || 0;
      existing.count += 1;
      map.set(accId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredCollections]);

  // Selected Box Details (if specific box selected)
  const targetBoxObj = useMemo(() => {
    if (selectedBoxId === 'ALL') return null;
    return donationBoxes.find((b) => b.id === selectedBoxId) || null;
  }, [selectedBoxId, donationBoxes]);

  // Dynamic Bengali Subtitle for period
  const periodSubtitle = useMemo(() => {
    switch (timeFilterType) {
      case 'SINGLE_DATE':
        return `তারিখ: ${formatDate(singleDate, 'bn')}`;
      case 'DATE_RANGE':
        return `সময়কাল: ${formatDate(fromDate, 'bn')} হতে ${formatDate(toDate, 'bn')} পর্যন্ত`;
      case 'MONTH_WISE': {
        const mObj = BANGLA_MONTHS.find((m) => m.value === selectedMonth);
        const mName = mObj ? mObj.label : selectedMonth;
        return `সময়কাল: ${mName} ${toBanglaNumber(selectedYear)} মাস`;
      }
      case 'YEAR_WISE':
        return `হিসাব বছর: ${toBanglaNumber(selectedYear)} সাল`;
      case 'ALL_TIME':
      default:
        return 'সর্বমোট সংগৃহীত পূর্ণাঙ্গ খতিয়ান (সর্বকাল)';
    }
  }, [timeFilterType, singleDate, fromDate, toDate, selectedMonth, selectedYear]);

  // Reset Filters to default
  const handleResetFilters = () => {
    setTimeFilterType('MONTH_WISE');
    setSelectedMonth(currentMonthStr);
    setSelectedYear(currentYearStr);
    setSingleDate(todayStr);
    setFromDate(firstDayOfMonthStr);
    setToDate(todayStr);
    setSelectedBoxId('ALL');
    setSelectedAccountId('ALL');
  };

  // Trigger Native Print Dialog
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      id="donation-box-report-modal-overlay"
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs overflow-y-auto flex justify-center p-0 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible"
    >
      {/* Dynamic Print CSS Setup */}
      <style>{`
        @page {
          size: A4 ${pageOrientation} !important;
          margin: ${pageOrientation === 'landscape' ? '8mm 10mm' : '10mm 12mm'} !important;
        }
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #donation-box-report-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .print\\:hidden, .no-print {
            display: none !important;
          }
          #donation-box-report-paper {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="bg-white w-full max-w-6xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col my-auto border border-slate-200 print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* ============================================================
            1. TOP TOOLBAR & CONTROLS (Hidden during printing)
            ============================================================ */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 rounded-t-none sm:rounded-t-2xl border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden no-print">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
              <Archive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                  <span>দানবাক্স কালেকশন রিপোর্ট ও A4 প্রিন্ট</span>
                </h2>
                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  A4 Print Ready
                </span>
              </div>
              <p className="text-xs text-slate-300">
                তারিখ, মাস ও নির্দিষ্ট দানবাক্স অনুযায়ী কালেকশন খতিয়ান ও প্রিন্ট-রেডি প্রতিবেদন
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2.5 flex-wrap">
            {/* Page Orientation Selector */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center space-x-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setPageOrientation('landscape')}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  pageOrientation === 'landscape'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="আড়াআড়ি প্রিন্ট ফরম্যাট (Landscape A4)"
              >
                আড়াআড়ি (Landscape)
              </button>
              <button
                type="button"
                onClick={() => setPageOrientation('portrait')}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  pageOrientation === 'portrait'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="লম্বালম্বি প্রিন্ট ফরম্যাট (Portrait A4)"
              >
                লম্বালম্বি (Portrait)
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              id="btn-print-box-collection-report"
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ প্রিন্ট রিপোর্ট (A4)</span>
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================
            2. FILTER CONTROLS BAR (Hidden during printing)
            ============================================================ */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 space-y-4 print:hidden no-print">
          {/* Time Filter Selection Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>সময়ের ধরন:</span>
              </span>

              {[
                { id: 'MONTH_WISE', label: '📅 মাস ভিত্তিক' },
                { id: 'DATE_RANGE', label: '📆 তারিখের পরিসর' },
                { id: 'SINGLE_DATE', label: '📌 নির্দিষ্ট একক দিন' },
                { id: 'YEAR_WISE', label: '📊 বছর ভিত্তিক' },
                { id: 'ALL_TIME', label: '🌐 সকল সময় (All)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeFilterType(tab.id as DonationBoxTimeFilterType)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    timeFilterType === tab.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>রিসেট ফিল্টার</span>
            </button>
          </div>

          {/* Dynamic Filter Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Dynamic Time Input Controls */}
            {timeFilterType === 'MONTH_WISE' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">মাস নির্বাচন</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {BANGLA_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} ({m.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">বছর নির্বাচন</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {toBanglaNumber(y)} সাল
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {timeFilterType === 'SINGLE_DATE' && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">নির্দিষ্ট কালেকশন তারিখ</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}

            {timeFilterType === 'DATE_RANGE' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">শুরু তারিখ (From)</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">শেষ তারিখ (To)</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {timeFilterType === 'YEAR_WISE' && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">হিসাব বছর নির্বাচন</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {toBanglaNumber(y)} সাল
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Donation Box Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Archive className="w-3 h-3 text-amber-600" />
                <span>দানবাক্স নির্বাচন</span>
              </label>
              <select
                value={selectedBoxId}
                onChange={(e) => setSelectedBoxId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">📦 সকল দানবাক্স ({toBanglaNumber(donationBoxes.length)} টি)</option>
                {donationBoxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.boxCode} — {box.shopName || box.manualName || box.location || 'উন্মুক্ত বাক্স'}
                  </option>
                ))}
              </select>
            </div>

            {/* Deposit Account Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Landmark className="w-3 h-3 text-teal-600" />
                <span>জমার হিসাব / ফান্ড</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">🏛️ সকল জমা হিসাব / ফান্ড</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn || acc.name} ({acc.accountType === 'CASH' ? 'ক্যাশ' : 'ব্যাংক/এমএফএস'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Letterhead & Display Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-700">
            <div className="flex items-center space-x-4 flex-wrap gap-y-2">
              <label className="flex items-center space-x-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={showLetterhead}
                  onChange={(e) => setShowLetterhead(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>মসজিদের অফিসিয়াল প্যাড (Letterhead) সহ প্রিন্ট</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={showBoxSummary}
                  onChange={(e) => setShowBoxSummary(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>দানবাক্সভিত্তিক সংক্ষিপ্ত সারসংক্ষেপ (Summary)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={showDenominationDetails}
                  onChange={(e) => setShowDenominationDetails(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>ভাংতি টাকা ও নোট গণনা বিস্তারিত (Denomination)</span>
              </label>
            </div>

            <div className="text-[11px] font-bold text-slate-500">
              পাওয়া গেছে: <span className="text-amber-700 font-mono">{toBanglaNumber(filteredCollections.length)}</span> টি রেকর্ড
            </div>
          </div>
        </div>

        {/* ============================================================
            3. PRINTABLE REPORT DOCUMENT (Screen View = Print Preview)
            ============================================================ */}
        <div
          id="donation-box-report-paper"
          className="p-6 sm:p-8 bg-white text-slate-950 flex-1 overflow-y-auto print:p-0 print:overflow-visible print:text-black font-sans"
        >
          {/* 3.1 OFFICIAL MOSQUE LETTERHEAD */}
          {showLetterhead ? (
            <div className="border-b-2 border-slate-900 pb-4 mb-5">
              {/* Bismillah */}
              <div className="text-center font-serif text-xs font-semibold text-slate-700 tracking-wider mb-2">
                بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ
              </div>

              <div className="flex items-start justify-between gap-4">
                {/* Mosque Logo */}
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                  {currentMosque?.logoUrl ? (
                    <img
                      src={currentMosque.logoUrl}
                      alt="Mosque Logo"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Building className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Mosque Title & Address */}
                <div className="text-center flex-1">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    {currentMosque?.nameBn || currentMosque?.name || 'মসজিদুল আকসা জামে মসজিদ'}
                  </h1>

                  {(currentMosque?.waqfEstateNumber || currentMosque?.waqfEstateName) && (
                    <div className="text-xs font-bold text-amber-900 mt-0.5">
                      ওয়াকফ এস্টেট ইসি নং: {currentMosque?.waqfEstateNumber || currentMosque?.waqfEstateName}
                    </div>
                  )}

                  <div className="text-xs text-slate-600 mt-1 max-w-xl mx-auto line-clamp-2">
                    {currentMosque?.address ? (
                      <span>{currentMosque.address}</span>
                    ) : (
                      <span>ডাকঘর ও থানা: সদর, জেলা: ঢাকা — বাংলাদেশ</span>
                    )}
                    {currentMosque?.phone && <span> • ফোন: {currentMosque.phone}</span>}
                    {currentMosque?.email && <span> • ইমেইল: {currentMosque.email}</span>}
                  </div>
                </div>

                {/* Top Right Meta Box */}
                <div className="text-right text-[11px] font-medium text-slate-600 border border-slate-300 rounded-xl p-2.5 bg-slate-50 min-w-[170px] space-y-0.5">
                  <div className="text-slate-500 font-semibold">প্রতিবেদন: দানবাক্স কালেকশন</div>
                  <div>
                    মসজিদ কোড: <strong className="text-slate-900 font-mono">{currentMosque?.code || 'ML-01'}</strong>
                  </div>
                  <div>
                    মুদ্রা: <strong className="text-slate-900">টাকা (৳ BDT)</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-0.5">
                    প্রিন্ট: {new Date().toLocaleDateString('bn-BD')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Blank Padding for Pre-printed Physical Pad */
            <div className="h-10 border-b border-dashed border-slate-300 mb-4 flex items-center justify-between text-[11px] text-slate-400 italic">
              <span>[মসজিদের অফিশিয়াল প্রি-প্রিন্টেড প্যাডে প্রিন্টের জন্য নির্ধারিত স্থান]</span>
              <span>মুদ্রা: টাকা (৳)</span>
            </div>
          )}

          {/* 3.2 REPORT TITLE & PERIOD BADGES */}
          <div className="text-center mb-5">
            <div className="inline-block bg-slate-900 text-white px-5 py-1.5 rounded-xl font-bold text-sm tracking-wide shadow-xs mb-1.5">
              দানবাক্স কালেকশন ও হিসাব বিবরণী রেজিস্টার
            </div>
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2 flex-wrap gap-y-1">
              <span className="bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg text-slate-800">
                {periodSubtitle}
              </span>
              <span className="text-slate-400">•</span>
              <span className="bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-amber-900 font-bold">
                {selectedBoxId === 'ALL'
                  ? `সকল দানবাক্স (মোট ${toBanglaNumber(donationBoxes.length)} টি)`
                  : `নির্দিষ্ট দানবাক্স: ${targetBoxObj?.boxCode || ''} (${targetBoxObj?.shopName || targetBoxObj?.manualName || targetBoxObj?.location || 'উন্মুক্ত'})`}
              </span>
              {selectedAccountId !== 'ALL' && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg text-teal-900 font-bold">
                    হিসাব: {accounts.find((a) => a.id === selectedAccountId)?.nameBn || 'নির্বাচিত হিসাব'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 3.3 EXECUTIVE METRICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-xs">
            {/* Card 1: Total Collected */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-bold text-amber-800 block">মোট সংগৃহীত অর্থ</span>
              <div className="text-lg font-black text-amber-950 font-mono mt-0.5">
                {formatCurrency(totalAmount, 'bn')}
              </div>
              <span className="text-[10px] text-amber-700">নির্বাচিত সময়সীমায় প্রাপ্ত</span>
            </div>

            {/* Card 2: Total Collections Count */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-bold text-slate-700 block">মোট কালেকশন সংখ্যা</span>
              <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                {toBanglaNumber(filteredCollections.length)} টি খোলার খতিয়ান
              </div>
              <span className="text-[10px] text-slate-500">স্বতন্ত্র গণনা ও জমার এন্ট্রি</span>
            </div>

            {/* Card 3: Active / Included Boxes */}
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
              <span className="text-[11px] font-bold text-teal-800 block">অন্তর্ভুক্ত দানবাক্স</span>
              <div className="text-lg font-black text-teal-950 font-mono mt-0.5">
                {toBanglaNumber(uniqueBoxesInReport)} টি বাক্স
              </div>
              <span className="text-[10px] text-teal-700">মোট সক্রিয় বাক্স: {toBanglaNumber(donationBoxes.length)} টি</span>
            </div>

            {/* Card 4: Main Deposit Account */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-[11px] font-bold text-blue-800 block">জমাকৃত প্রধান ফান্ড</span>
              <div className="text-xs font-black text-blue-950 truncate mt-1">
                {accountBreakdown[0]?.name || 'সাধারণ দানবাক্স ফান্ড'}
              </div>
              <span className="text-[10px] text-blue-700 font-mono">
                {accountBreakdown[0] ? formatCurrency(accountBreakdown[0].amount, 'bn') : '৳ ০'}
              </span>
            </div>
          </div>

          {/* 3.4 BOX-WISE SUMMARY TABLE (When enabled & all boxes or multi-box) */}
          {showBoxSummary && boxWiseSummary.length > 0 && selectedBoxId === 'ALL' && (
            <div className="mb-5 border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-xs text-slate-800 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-700" />
                  <span>দানবাক্সভিত্তিক সারসংক্ষেপ তালিকা (Box-wise Summary)</span>
                </span>
                <span className="text-[11px] text-slate-600 font-normal">
                  মোট বাক্স: {toBanglaNumber(boxWiseSummary.length)} টি
                </span>
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 border-b border-slate-300 font-bold text-[11px]">
                    <th className="py-1.5 px-2 border-r border-slate-300 text-center w-10">ক্র.</th>
                    <th className="py-1.5 px-2 border-r border-slate-300">দানবাক্স কোড ও নাম</th>
                    <th className="py-1.5 px-2 border-r border-slate-300">দোকান / অবস্থান ও এলাকা</th>
                    <th className="py-1.5 px-2 border-r border-slate-300 text-center">কালেকশন সংখ্যা</th>
                    <th className="py-1.5 px-2 border-r border-slate-300 text-right">মোট সংগৃহীত অর্থ (৳)</th>
                    <th className="py-1.5 px-2 text-right w-20">অংশ (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {boxWiseSummary.map((item, idx) => {
                    const percentage = totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(1) : '0';
                    return (
                      <tr key={item.boxId} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-500">
                          {toBanglaNumber(idx + 1)}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-slate-900">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded mr-1.5 text-amber-900 border border-slate-200">
                            {item.boxCode}
                          </span>
                          {item.shopName && <span>{item.shopName}</span>}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-slate-700">
                          {item.location || item.ownerName ? `${item.location} ${item.ownerName ? `(${item.ownerName})` : ''}` : 'সাধারণ উন্মুক্ত'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-bold text-slate-800">
                          {toBanglaNumber(item.count)} বার
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-right font-black font-mono text-slate-900">
                          ৳ {item.total.toLocaleString('en-IN')}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 font-semibold">
                          {toBanglaNumber(percentage)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900 text-xs">
                    <td colSpan={3} className="py-2 px-3 border-r border-slate-300 text-right">
                      মোট যোগফল:
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center">
                      {toBanglaNumber(filteredCollections.length)} বার
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-right font-black font-mono text-amber-900 text-sm">
                      ৳ {totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">১০০%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* 3.5 DETAILED COLLECTION REGISTER TABLE */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-5">
            <div className="bg-slate-900 text-white px-3 py-2 font-bold text-xs flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>দানবাক্স গণনা ও কালেকশন বিস্তারিত খতিয়ান (Detailed Collection Register)</span>
              </span>
              <span className="text-[11px] text-amber-300 font-normal">
                মোট রেকর্ড: {toBanglaNumber(filteredCollections.length)} টি
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold text-[11px]">
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-10">ক্রমিক</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-24">তারিখ</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-36">দানবাক্স নম্বর / নাম</th>
                  <th className="py-2 px-2 border-r border-slate-300">দোকান ও অবস্থান</th>
                  <th className="py-2 px-2 border-r border-slate-300">গণনাকারী টিম ও দায়িত্বপ্রাপ্ত</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-36">জমার ফান্ড / অ্যাকাউন্ট</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-24">ভাউচার নং</th>
                  <th className="py-2 px-2 text-right w-28">সংগৃহীত টাকা (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCollections.map((item, idx) => {
                  const boxObj = donationBoxes.find((b) => b.id === item.boxId);
                  const countingMembers = Array.isArray(item.countingTeam)
                    ? item.countingTeam.join(', ')
                    : item.countingTeam || '-';
                  const witnessMembers = Array.isArray(item.witnesses)
                    ? item.witnesses.join(', ')
                    : item.witnesses || '';

                  // Denomination breakdown checks
                  const hasDenom =
                    showDenominationDetails &&
                    item.denominationData &&
                    item.denominationData.noteBreakdown;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50">
                        {/* 1. SL */}
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-600 align-top">
                          {toBanglaNumber(idx + 1)}
                        </td>

                        {/* 2. Date */}
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-medium text-slate-800 whitespace-nowrap align-top">
                          {formatDate(item.collectionDate, 'bn')}
                        </td>

                        {/* 3. Box Code & Name */}
                        <td className="py-2 px-2 border-r border-slate-200 align-top">
                          <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mr-1">
                            {item.boxCode || boxObj?.boxCode || 'BOX'}
                          </span>
                          <div className="font-bold text-slate-900 text-[11px] mt-0.5">
                            {boxObj?.shopName || boxObj?.manualName || 'উন্মুক্ত দানবাক্স'}
                          </div>
                        </td>

                        {/* 4. Shop & Location */}
                        <td className="py-2 px-2 border-r border-slate-200 text-slate-700 align-top">
                          <div className="font-semibold text-slate-900">
                            {boxObj?.location || 'মসজিদ প্রাঙ্গণ'}
                          </div>
                          {boxObj?.ownerName && (
                            <div className="text-[10px] text-slate-500">
                              মালিক: {boxObj.ownerName} {boxObj.ownerPhone ? `(${boxObj.ownerPhone})` : ''}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[10px] text-amber-800 italic mt-0.5 bg-amber-50/50 p-1 rounded">
                              নোট: {item.notes}
                            </div>
                          )}
                        </td>

                        {/* 5. Counting Team & Witnesses */}
                        <td className="py-2 px-2 border-r border-slate-200 text-slate-700 align-top">
                          <div className="font-medium text-slate-800 text-[11px]">
                            {countingMembers || 'মসজিদ কালেকশন কমিটি'}
                          </div>
                          {witnessMembers && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              সাক্ষী: {witnessMembers}
                            </div>
                          )}
                        </td>

                        {/* 6. Deposit Account */}
                        <td className="py-2 px-2 border-r border-slate-200 text-slate-800 font-medium align-top">
                          <div>{item.depositAccountName || 'ক্যাশ হিসাব'}</div>
                          {item.depositReference && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              রেফ: {item.depositReference}
                            </div>
                          )}
                        </td>

                        {/* 7. Voucher No */}
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold text-teal-800 align-top">
                          {item.incomeVoucherNumber || '-'}
                        </td>

                        {/* 8. Amount */}
                        <td className="py-2 px-2 text-right font-black font-mono text-slate-950 text-xs align-top">
                          ৳ {Number(item.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* 9. Optional Denomination Row */}
                      {hasDenom && item.denominationData && (
                        <tr className="bg-amber-50/40 text-[10px] border-b border-slate-200">
                          <td colSpan={2} className="py-1 px-2 border-r border-slate-200 text-center text-amber-800 font-bold">
                            <span className="flex items-center justify-center space-x-1">
                              <Coins className="w-3 h-3" />
                              <span>ভাংতি নোট/কয়েন:</span>
                            </span>
                          </td>
                          <td colSpan={6} className="py-1 px-3 text-slate-700">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              {/* Notes */}
                              {item.denominationData.noteBreakdown &&
                                Object.entries(item.denominationData.noteBreakdown)
                                  .sort(([a], [b]) => Number(b) - Number(a))
                                  .filter(([_, qty]) => Number(qty) > 0)
                                  .map(([denom, qty]) => (
                                    <span
                                      key={`note-${denom}`}
                                      className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-slate-800"
                                    >
                                      {toBanglaNumber(denom)}×{toBanglaNumber(Number(qty))}={toBanglaNumber(Number(denom) * Number(qty))}
                                    </span>
                                  ))}

                              {/* Coins */}
                              {item.denominationData.coinBreakdown &&
                                Object.entries(item.denominationData.coinBreakdown)
                                  .sort(([a], [b]) => Number(b) - Number(a))
                                  .filter(([_, qty]) => Number(qty) > 0)
                                  .map(([denom, qty]) => (
                                    <span
                                      key={`coin-${denom}`}
                                      className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-slate-800"
                                    >
                                      কয়েন {toBanglaNumber(denom)}×{toBanglaNumber(Number(qty))}={toBanglaNumber(Number(denom) * Number(qty))}
                                    </span>
                                  ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredCollections.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                      নির্বাচিত সময়সীমায় বা দানবাক্সে কোনো কালেকশন রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Table Footer Total */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-900">
                  <td colSpan={7} className="py-2.5 px-3 text-right">
                    সর্বমোট সংগৃহীত অর্থের যোগফল:
                  </td>
                  <td className="py-2.5 px-2 text-right font-black font-mono text-amber-300 text-sm whitespace-nowrap">
                    ৳ {totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 3.6 IN WORDS SECTION (কথায়) */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 whitespace-nowrap">কথায় (In Words):</span>
              <span className="font-medium text-slate-800 italic">
                {numberToBanglaWords(totalAmount)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              সর্বমোট ভাউচার সংখ্যা: <strong className="text-slate-900 font-mono">{toBanglaNumber(filteredCollections.length)}</strong> টি
            </div>
          </div>

          {/* 3.7 OFFICIAL COMMITTEE APPROVAL SIGNATURES */}
          <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              {/* Signature 1: Chief Collector / Treasurer */}
              <div className="flex flex-col items-center justify-end">
                <div className="h-10 w-full flex items-end justify-center mb-1">
                  {/* Space for manual or digital signature */}
                </div>
                <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                  কোষাধ্যক্ষ / কালেকশন টিম প্রধান
                </div>
                <div className="text-[10px] text-slate-600">স্বাক্ষর ও তারিখ</div>
              </div>

              {/* Signature 2: General Secretary / Mutawalli */}
              <div className="flex flex-col items-center justify-end">
                <div className="h-10 w-full flex items-end justify-center mb-1">
                  {currentMosque?.secretarySignatureUrl && (
                    <img
                      src={currentMosque.secretarySignatureUrl}
                      alt="Secretary Signature"
                      referrerPolicy="no-referrer"
                      className="max-h-9 object-contain mx-auto"
                    />
                  )}
                </div>
                <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                  সাধারণ সম্পাদক / মোতাওয়াল্লী
                </div>
                <div className="text-[10px] text-slate-600">মসজিদ পরিচালনা কমিটি</div>
              </div>

              {/* Signature 3: President */}
              <div className="flex flex-col items-center justify-end">
                <div className="h-10 w-full flex items-end justify-center mb-1">
                  {currentMosque?.presidentSignatureUrl && (
                    <img
                      src={currentMosque.presidentSignatureUrl}
                      alt="President Signature"
                      referrerPolicy="no-referrer"
                      className="max-h-9 object-contain mx-auto"
                    />
                  )}
                </div>
                <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                  সভাপতি
                </div>
                <div className="text-[10px] text-slate-600">মসজিদ পরিচালনা কমিটি</div>
              </div>
            </div>
          </div>

          {/* 3.8 FOOTER WATERMARK & AUDIT TIMESTAMP */}
          <div className="text-center text-[10px] text-slate-400 pt-4 mt-6 border-t border-slate-200 flex items-center justify-between font-sans">
            <span>MasjidLedger স্বয়ংক্রিয় দানবাক্স ও ডিজিটাল মসজিদ হিসাব ব্যবস্থাপনা</span>
            <span>প্রিন্ট ও নিরীক্ষা সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>

        {/* ============================================================
            4. MODAL BOTTOM ACTION BAR (Hidden during printing)
            ============================================================ */}
        <div className="bg-slate-900 text-white px-5 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden no-print z-10">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">নির্বাচিত কালেকশন:</span>
            <span className="font-bold text-white">{toBanglaNumber(filteredCollections.length)} টি</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">সর্বমোট জমা:</span>
            <span className="font-mono font-bold text-amber-400">
              {formatCurrency(totalAmount, 'bn')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              বাতিল / বন্ধ করুন
            </button>
            <button
              type="button"
              id="btn-print-box-report-bottom"
              onClick={handlePrint}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ কালেকশন রিপোর্ট প্রিন্ট (A4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

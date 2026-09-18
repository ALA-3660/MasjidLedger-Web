import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Coins,
  RefreshCw,
  Building,
  Eye,
  Info,
} from 'lucide-react';
import { FinancialAccount, IncomeEntry, ExpenseEntry, Mosque, User, AccountTransfer } from '../types';
import { Language, translations, formatDate, formatCurrency } from '../lib/i18n';
import { FinancialSecondarySidebar, SecondarySidebarItem } from './FinancialSecondarySidebar';
import {
  calculateAccountingLedger,
  exportCashbookToExcel,
  UnifiedLedgerEntry,
} from '../lib/accountingLedgerService';
import { ReportPrintDocument } from './ReportPrintDocument';

interface CashBookViewProps {
  accounts: FinancialAccount[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  transfers?: AccountTransfer[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onNavigateToIncome?: () => void;
  onNavigateToExpense?: () => void;
  hideInternalSidebar?: boolean;
  forcedSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const CashBookView: React.FC<CashBookViewProps> = ({
  accounts = [],
  incomes = [],
  expenses = [],
  transfers = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onNavigateToIncome,
  onNavigateToExpense,
  hideInternalSidebar = false,
  forcedSubTab,
  onSubTabChange,
}) => {
  const [activeSubItem, setActiveSubItem] = useState<string>(forcedSubTab || 'CASHBOOK');

  useEffect(() => {
    if (forcedSubTab) {
      setActiveSubItem(forcedSubTab);
    }
  }, [forcedSubTab]);

  const handleSelectSubTab = (tabId: string) => {
    setActiveSubItem(tabId);
    if (onSubTabChange) {
      onSubTabChange(tabId);
    }
  };

  // Date Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = `${todayStr.slice(0, 7)}-01`;
  const [datePreset, setDatePreset] = useState<
    'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_YEAR' | 'ALL' | 'CUSTOM'
  >('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Type Filter & Search
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Dialog State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Cash Reconciliation Denomination State
  const [denominations, setDenominations] = useState<{ [denom: number]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });
  const [reconCountedBy, setReconCountedBy] = useState(currentUser?.name || '');
  const [reconVerifiedBy, setReconVerifiedBy] = useState('');
  const [reconNotes, setReconNotes] = useState('');
  const [reconSuccessMessage, setReconSuccessMessage] = useState('');

  // Primary Cash Account
  const cashAccounts = useMemo(() => accounts.filter((a) => a.accountType === 'CASH'), [accounts]);
  const primaryCashAccount = cashAccounts[0];
  const totalCashInHand = cashAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

  // Preset Date Handler
  const handlePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      setStartDate(yest);
      setEndDate(yest);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToSat = (day + 1) % 7;
      const sat = new Date(now.getTime() - diffToSat * 86400000).toISOString().split('T')[0];
      setStartDate(sat);
      setEndDate(todayStr);
    } else if (preset === 'LAST_WEEK') {
      const day = now.getDay();
      const diffToSat = (day + 1) % 7;
      const lastSat = new Date(now.getTime() - (diffToSat + 7) * 86400000).toISOString().split('T')[0];
      const lastFri = new Date(now.getTime() - (diffToSat + 1) * 86400000).toISOString().split('T')[0];
      setStartDate(lastSat);
      setEndDate(lastFri);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(`${todayStr.slice(0, 7)}-01`);
      setEndDate(todayStr);
    } else if (preset === 'LAST_MONTH') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevMonthDate.getFullYear();
      const m = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prevMonthDate.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(todayStr);
    } else if (preset === 'LAST_YEAR') {
      const py = now.getFullYear() - 1;
      setStartDate(`${py}-01-01`);
      setEndDate(`${py}-12-31`);
    } else if (preset === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate(todayStr);
    }
  };

  // Centralized Accounting Calculation for Cashbook (SAME DATASET RULE)
  const ledgerResult = useMemo(() => {
    return calculateAccountingLedger({
      accounts,
      incomes,
      expenses,
      transfers,
      accountFilter: 'CASH',
      startDate,
      endDate,
      typeFilter,
      searchQuery,
    });
  }, [accounts, incomes, expenses, transfers, startDate, endDate, typeFilter, searchQuery]);

  // Excel Export Handler
  const handleExportExcel = () => {
    exportCashbookToExcel({
      mosqueName: currentMosque?.nameBn || 'মসজিদ',
      periodLabel: `${formatDate(startDate)} হতে ${formatDate(endDate)}`,
      openingBalance: ledgerResult.openingBalance,
      closingBalance: ledgerResult.closingBalance,
      totalDebit: ledgerResult.totalDebit,
      totalCredit: ledgerResult.totalCredit,
      entries: ledgerResult.displayEntries,
    });
  };

  // Physical Cash Calculation for Reconciliation
  const physicalCashTotal = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [denom, count]) => {
      return sum + Number(denom) * (Number(count) || 0);
    }, 0);
  }, [denominations]);

  const cashDifference = physicalCashTotal - totalCashInHand;

  // Secondary Sidebar Items for Cashbook (Level 3)
  const sidebarItems: SecondarySidebarItem[] = [
    { id: 'CASHBOOK', label: '📋 ক্যাশ বুক', icon: Wallet },
    { id: 'NEW_ENTRY', label: '➕ নগদ লেনদেন', icon: Plus, isAction: true },
    { id: 'CASH_STATUS', label: '💰 নগদ স্থিতি', icon: Scale },
    { id: 'SEARCH', label: '🔎 লেনদেন অনুসন্ধান', icon: Search },
    { id: 'SUMMARY', label: '📊 সারসংক্ষেপ ও ট্রেন্ড', icon: Filter },
    { id: 'RECONCILIATION', label: '🔄 ক্যাশ সমন্বয়', icon: RefreshCw },
    { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
  ];

  return (
    <div className="space-y-4 font-siliguri">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                📊 হিসাব ও লেনদেন / ৩য় সাব-মডিউল
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1 flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span>নগদ ক্যাশ বুক (Cash Book)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              সকল নগদ প্রাপ্তি ও পরিশোধের কালানুক্রমিক বিবরণ এবং চলমান স্থিতি
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>এক্সেল (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Secondary Layout */}
      <div className={hideInternalSidebar ? 'w-full' : 'flex flex-col lg:flex-row gap-5 items-start'}>
        {/* Secondary Sidebar (Level 3) */}
        {!hideInternalSidebar && (
          <FinancialSecondarySidebar
            subModuleName="ক্যাশ বুক"
            subModuleIcon={Wallet}
            items={sidebarItems}
            activeItemId={activeSubItem}
            onSelectItem={handleSelectSubTab}
            quickStat={{
              label: 'বর্তমান ক্যাশ ইন হ্যান্ড',
              value: `৳ ${totalCashInHand.toLocaleString('en-IN')}`,
            }}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 w-full space-y-4">
          {/* 1. Main Cashbook Ledger View */}
          {activeSubItem === 'CASHBOOK' && (
            <>
              {/* Summary Cards (Section 12) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    💵 ক্যাশ ইন হ্যান্ড (বর্তমান)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-700 mt-1">
                    ৳ {totalCashInHand.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">সবগুলো নগদ হিসাবের মোট স্থিতি</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    📥 নির্বাচিত সময়ে নগদ জমা
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-blue-700 mt-1">
                    + ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">নগদ প্রাপ্তি ও অন্যান্য জমা</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    📤 নির্বাচিত সময়ে নগদ খরচ
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-1">
                    - ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">নগদ পরিশোধ ও খরচ</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    💰 সময়কালের সমাপনী স্থিতি
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">
                    ৳ {ledgerResult.closingBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-bold">
                    প্রারম্ভিক ছিল: ৳ {ledgerResult.openingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Filters & Date Controls (Section 13) */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                {/* Date Quick Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
                  {[
                    { key: 'TODAY', label: 'আজ' },
                    { key: 'YESTERDAY', label: 'গতকাল' },
                    { key: 'THIS_WEEK', label: 'চলতি সপ্তাহ' },
                    { key: 'LAST_WEEK', label: 'গত সপ্তাহ' },
                    { key: 'THIS_MONTH', label: 'চলতি মাস' },
                    { key: 'LAST_MONTH', label: 'গত মাস' },
                    { key: 'THIS_YEAR', label: 'চলতি বছর' },
                    { key: 'LAST_YEAR', label: 'গত বছর' },
                    { key: 'ALL', label: 'সকল সময়' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => handlePresetChange(p.key as any)}
                      className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        datePreset === p.key
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Date-to-Date inputs, Transaction Type, and Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">হতে (তারিখ)</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setDatePreset('CUSTOM');
                        setStartDate(e.target.value);
                      }}
                      className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">পর্যন্ত (তারিখ)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setDatePreset('CUSTOM');
                        setEndDate(e.target.value);
                      }}
                      className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">লেনদেনের ধরন</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                    >
                      <option value="ALL">সকল লেনদেন</option>
                      <option value="INCOME">শুধুমাত্র নগদ জমা (Income)</option>
                      <option value="EXPENSE">শুধুমাত্র নগদ খরচ (Expense)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">খাত / ভাউচার অনুসন্ধান</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ভাউচার, খাত, প্রাপক..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Ledger Table (Section 14) */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    নগদ লেনদেন তালিকা ({ledgerResult.displayEntries.length} টি এন্ট্রি)
                  </span>
                  <span className="text-xs text-slate-500">
                    সময়কাল: <span className="font-bold text-slate-700">{formatDate(startDate)}</span> হতে{' '}
                    <span className="font-bold text-slate-700">{formatDate(endDate)}</span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                        <th className="py-2.5 px-3 w-12 text-center">ক্রঃ</th>
                        <th className="py-2.5 px-3">তারিখ</th>
                        <th className="py-2.5 px-3">ভাউচার নং</th>
                        <th className="py-2.5 px-3">বিবরণ / খাত</th>
                        <th className="py-2.5 px-3">পার্টি / প্রাপক / দাতা</th>
                        <th className="py-2.5 px-3 text-right">নগদ জমা (৳)</th>
                        <th className="py-2.5 px-3 text-right">নগদ খরচ (৳)</th>
                        <th className="py-2.5 px-3 text-right">চলমান স্থিতি (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Opening Balance Row */}
                      <tr className="bg-amber-50/60 font-bold text-slate-800">
                        <td className="py-2.5 px-3 text-center">-</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(startDate)}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-800">OPENING</td>
                        <td className="py-2.5 px-3" colSpan={2}>
                          <div className="flex items-center space-x-1.5 text-amber-900">
                            <Scale className="w-3.5 h-3.5 text-amber-700" />
                            <span>প্রারম্ভিক নগদ জের (Opening Balance)</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ৳ {ledgerResult.openingBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {ledgerResult.displayEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            নির্বাচিত সময়ে কোনো নগদ লেনদেন পাওয়া যায়নি
                          </td>
                        </tr>
                      ) : (
                        ledgerResult.displayEntries.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {formatDate(item.date)}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                              {item.voucherNumber}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900">{item.headNameBn}</div>
                              {item.subHeadNameBn && (
                                <div className="text-[10px] text-slate-500">{item.subHeadNameBn}</div>
                              )}
                              {item.description && (
                                <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{item.partyName || '-'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {item.debit > 0 ? `৳ ${item.debit.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                              {item.credit > 0 ? `৳ ${item.credit.toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              ৳ {item.runningBalance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Closing Balance Row */}
                      <tr className="bg-emerald-50/70 font-black text-slate-900 border-t-2 border-emerald-200">
                        <td className="py-3 px-3 text-center font-mono">Σ</td>
                        <td className="py-3 px-3 font-mono">{formatDate(endDate)}</td>
                        <td className="py-3 px-3 font-mono text-emerald-800">CLOSING</td>
                        <td className="py-3 px-3" colSpan={2}>
                          সমাপনী নগদ জের (Closing Cash Balance)
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-blue-800">
                          ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-800">
                          ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-900 text-sm">
                          ৳ {ledgerResult.closingBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 2. New Entry Shortcut (Section 11) */}
          {activeSubItem === 'NEW_ENTRY' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>নতুন নগদ লেনদেন এন্ট্রি</span>
              </h2>
              <p className="text-xs text-slate-500">
                মসজিদের অ্যাকাউন্টিং নিয়ম অনুযায়ী সকল লেনদেন অনুমোদিত আয় বা ব্যয় মডিউলের মাধ্যমে এন্ট্রি করা হয়, যা স্বয়ংক্রিয়ভাবে ক্যাশ বুকে প্রতিফলিত হয়।
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      <span>নগদ জমা / আয় এন্ট্রি</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      জুমার কালেকশন, সাধারণ দান, দানবাক্স বা ভাড়ার নগদ টাকা জমা এন্ট্রি করুন।
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onNavigateToIncome) onNavigateToIncome();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    💵 আয় ও প্রাপ্তি মডিউলে যান
                  </button>
                </div>

                <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
                      <ArrowUpRight className="w-4 h-4 text-rose-600" />
                      <span>নগদ ব্যয় / পরিশোধ এন্ট্রি</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      ইমাম/মুয়াজ্জিন ভাতা, বিদ্যুৎ বিল, মসজিদ পরিষ্কার বা মেরামতের নগদ খরচ এন্ট্রি করুন।
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onNavigateToExpense) onNavigateToExpense();
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    💸 ব্যয় ও পরিশোধ মডিউলে যান
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Cash Status View */}
          {activeSubItem === 'CASH_STATUS' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                <span>নগদ তহবিলের পূর্ণাঙ্গ স্থিতি</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cashAccounts.map((acc) => (
                  <div key={acc.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{acc.nameBn}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        সক্রিয় ক্যাশ হিসাব
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-500">চলতি স্থিতি (Current Balance):</span>
                      <span className="text-lg font-black font-mono text-emerald-700">
                        ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-slate-500">
                      <span>প্রারম্ভিক স্থিতি (Opening):</span>
                      <span className="font-mono">৳ {(Number(acc.openingBalance) || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Search View */}
          {activeSubItem === 'SEARCH' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span>নগদ লেনদেন অনুসন্ধান</span>
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ভাউচার নং, দাতা, প্রাপক, খাত বা বিবরণ লিখুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">তারিখ</th>
                      <th className="p-2.5">ভাউচার</th>
                      <th className="p-2.5">বিবরণ</th>
                      <th className="p-2.5">পার্টি</th>
                      <th className="p-2.5 text-right">জমা</th>
                      <th className="p-2.5 text-right">খরচ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerResult.displayEntries.slice(0, 15).map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-mono">{formatDate(item.date)}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{item.voucherNumber}</td>
                        <td className="p-2.5">{item.headNameBn}</td>
                        <td className="p-2.5">{item.partyName}</td>
                        <td className="p-2.5 text-right font-mono text-blue-700">
                          {item.debit > 0 ? `৳ ${item.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-700">
                          {item.credit > 0 ? `৳ ${item.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Summary & Trends */}
          {activeSubItem === 'SUMMARY' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                <span>নগদ প্রবাহের সারসংক্ষেপ ও খতিয়ান বিশ্লেষণ</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-xs font-bold text-blue-700 block">মোট নগদ প্রাপ্তি</span>
                  <span className="text-lg font-black font-mono text-blue-900 block mt-1">
                    ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-700 block">মোট নগদ পরিশোধ</span>
                  <span className="text-lg font-black font-mono text-rose-900 block mt-1">
                    ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 block">নিট নগদ প্রবাহ</span>
                  <span className="text-lg font-black font-mono text-emerald-900 block mt-1">
                    ৳ {ledgerResult.netChange.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Cash Reconciliation (Sections 15 & 16) */}
          {activeSubItem === 'RECONCILIATION' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    <span>নগদ টাকা সমন্বয় ও গণনা (Physical Cash Reconciliation)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    সিস্টেমের হিসাবের সাথে বাস্তব নগদ টাকা গণনা করে যাচাই করুন
                  </p>
                </div>
              </div>

              {/* Safeguard Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">অ্যাকাউন্টিং সতর্কতা ও নীতিমালা:</span>
                  <span>
                    বাস্তব গণনা এবং সিস্টেমের ক্যাশ ব্যালেন্সের পার্থক্য সরাসরি স্বয়ংক্রিয়ভাবে Income বা Expense হিসেবে গ্রহণ করা হবে না। কোনো গরমিল থাকলে যাচাই ও অডিট কমিটির অনুমোদনক্রমে সমন্বিত হতে হবে।
                  </span>
                </div>
              </div>

              {/* Comparison KPI Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    সিস্টেম ব্যালেন্স (Book Balance)
                  </span>
                  <span className="text-lg font-black font-mono text-slate-800 block mt-1">
                    ৳ {totalCashInHand.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                    বাস্তব গণনা (Physical Count)
                  </span>
                  <span className="text-lg font-black font-mono text-blue-900 block mt-1">
                    ৳ {physicalCashTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div
                  className={`p-3.5 border rounded-xl ${
                    cashDifference === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : cashDifference > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider block">
                    পার্থক্য / গরমিল (Difference)
                  </span>
                  <span className="text-lg font-black font-mono block mt-1">
                    {cashDifference > 0 ? '+' : ''}৳ {cashDifference.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold block mt-0.5">
                    {cashDifference === 0
                      ? '✓ হিসাব সম্পূর্ণ মিলেছে'
                      : cashDifference > 0
                      ? 'বাস্তবে টাকা বেশি পাওয়া গেছে'
                      : 'বাস্তবে টাকা কম পাওয়া গেছে'}
                  </span>
                </div>
              </div>

              {/* Denomination Counter (Section 15) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>নোট অনুযায়ী গণনা (Denomination Breakdown)</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map((denom) => {
                    const count = denominations[denom] || 0;
                    const subtotal = denom * count;
                    return (
                      <div key={denom} className="bg-white border border-slate-200 rounded-lg p-2 shadow-2xs">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span>৳ {denom}</span>
                          <span className="font-mono text-slate-400">×</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={count || ''}
                          placeholder="০"
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setDenominations((prev) => ({ ...prev, [denom]: val }));
                          }}
                          className="w-full text-xs font-mono font-bold mt-1 px-2 py-1 border border-slate-200 rounded-md text-right focus:outline-hidden focus:border-blue-500"
                        />
                        <div className="text-[10px] font-mono text-right text-slate-500 mt-1">
                          = ৳ {subtotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reconciliation Verification Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">গণনাকারী (Counted By)</label>
                  <input
                    type="text"
                    value={reconCountedBy}
                    onChange={(e) => setReconCountedBy(e.target.value)}
                    placeholder="নাম লিখুন..."
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">যাচাইকারী (Verified By)</label>
                  <input
                    type="text"
                    value={reconVerifiedBy}
                    onChange={(e) => setReconVerifiedBy(e.target.value)}
                    placeholder="কোষাধ্যক্ষ / সভাপতি..."
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">মন্তব্য / নোট</label>
                  <textarea
                    rows={2}
                    value={reconNotes}
                    onChange={(e) => setReconNotes(e.target.value)}
                    placeholder="সমন্বয় সংক্রান্ত বিবরণ..."
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {reconSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{reconSuccessMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setReconSuccessMessage('ক্যাশ সমন্বয়ের স্ন্যাপশট ও নোট সফলভাবে সংরক্ষিত হয়েছে।');
                  setTimeout(() => setReconSuccessMessage(''), 4000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                সমন্বয় রেকর্ড সংরক্ষণ করুন
              </button>
            </div>
          )}

          {/* 7. Reports & Export (Section 17) */}
          {activeSubItem === 'REPORTS' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>ক্যাশ বুক রিপোর্ট ও এক্সপোর্ট সেন্টার</span>
              </h2>
              <p className="text-xs text-slate-500">
                নির্বাচিত সময়সীমার জন্য প্রিন্টযোগ্য ভাউচার লেজার, PDF এবং বাস্তব এক্সেল ফাইল তৈরি করুন।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors flex flex-col justify-between space-y-2 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">প্রিন্ট / PDF ভিউ</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      মসজিদের নাম ও প্যাড সহ স্ট্যান্ডার্ড প্রিন্ট রিপোর্ট
                    </span>
                  </div>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="p-4 border border-emerald-200 rounded-xl hover:bg-emerald-50/50 text-left transition-colors flex flex-col justify-between space-y-2 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">এক্সেল এক্সপোর্ট (.xlsx)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      পূর্ণাঙ্গ ফর্মুলা ও লেজার সহ ডাউনলোড করুন
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Standardized Print Document Dialog */}
      {isPrintModalOpen && (
        <ReportPrintDocument
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          currentMosque={currentMosque}
          reportTitle="নগদ ক্যাশ বুক খতিয়ান (Cash Book Ledger)"
          periodLabel={`${formatDate(startDate)} হতে ${formatDate(endDate)}`}
          columns={[
            { header: 'তারিখ', accessor: (item) => formatDate(item.date) },
            { header: 'ভাউচার নং', accessor: (item) => item.voucherNumber },
            { header: 'বিবরণ / খাত', accessor: (item) => item.headNameBn },
            { header: 'পার্টি / দাতা / প্রাপক', accessor: (item) => item.partyName },
            { header: 'নগদ জমা (৳)', accessor: (item) => (item.debit > 0 ? `৳ ${item.debit.toLocaleString('en-IN')}` : '-') },
            { header: 'নগদ খরচ (৳)', accessor: (item) => (item.credit > 0 ? `৳ ${item.credit.toLocaleString('en-IN')}` : '-') },
            { header: 'চলমান স্থিতি (৳)', accessor: (item) => `৳ ${item.runningBalance.toLocaleString('en-IN')}` },
          ]}
          data={ledgerResult.displayEntries}
          summaryRows={[
            { label: 'প্রারম্ভিক নগদ জের (Opening Balance)', value: `৳ ${ledgerResult.openingBalance.toLocaleString('en-IN')}` },
            { label: 'মোট নগদ জমা (Total Inflow)', value: `৳ ${ledgerResult.totalDebit.toLocaleString('en-IN')}` },
            { label: 'মোট নগদ খরচ (Total Outflow)', value: `৳ ${ledgerResult.totalCredit.toLocaleString('en-IN')}` },
            { label: 'সমাপনী নগদ জের (Closing Balance)', value: `৳ ${ledgerResult.closingBalance.toLocaleString('en-IN')}` },
          ]}
        />
      )}
    </div>
  );
};

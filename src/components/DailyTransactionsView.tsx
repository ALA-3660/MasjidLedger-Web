import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Scale,
  FileSpreadsheet,
  FileText,
  Clock,
  ChevronRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  FinancialAccount,
  Mosque,
  User,
  AccountOpeningBalancePayload,
  AccountTransfer,
} from '../types';
import { Language, translations, formatDate, formatCurrency } from '../lib/i18n';
import { OpeningBalanceModal } from './OpeningBalanceModal';
import { FinancialSecondarySidebar, SecondarySidebarItem } from './FinancialSecondarySidebar';
import {
  calculateAccountingLedger,
  exportDailyLedgerToExcel,
  UnifiedLedgerEntry,
} from '../lib/accountingLedgerService';
import { ReportPrintDocument } from './ReportPrintDocument';

interface DailyTransactionsViewProps {
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  transfers?: AccountTransfer[];
  currentMosque: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onUpdateOpeningBalance?: (data: AccountOpeningBalancePayload) => Promise<void>;
  hideInternalSidebar?: boolean;
  forcedSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  incomes = [],
  expenses = [],
  accounts = [],
  transfers = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onUpdateOpeningBalance,
  hideInternalSidebar = false,
  forcedSubTab,
  onSubTabChange,
}) => {
  const [activeSubItem, setActiveSubItem] = useState<string>(forcedSubTab || 'STATEMENT');

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
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);

  // Date Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = `${todayStr.slice(0, 7)}-01`;
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<
    'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_YEAR' | 'ALL' | 'CUSTOM'
  >('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Dialog
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Total mosque fund
  const totalCombinedFund = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  }, [accounts]);

  // Date Preset Handler
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

  // Centralized Accounting Calculation (SAME DATASET RULE)
  const ledgerResult = useMemo(() => {
    return calculateAccountingLedger({
      accounts,
      incomes,
      expenses,
      transfers,
      accountFilter: selectedAccountId,
      startDate,
      endDate,
      typeFilter,
      searchQuery,
    });
  }, [accounts, incomes, expenses, transfers, selectedAccountId, startDate, endDate, typeFilter, searchQuery]);

  // Excel Export Handler
  const handleExportExcel = () => {
    exportDailyLedgerToExcel({
      mosqueName: currentMosque?.nameBn || 'মসজিদ',
      periodLabel: `${formatDate(startDate)} হতে ${formatDate(endDate)}`,
      openingBalance: ledgerResult.openingBalance,
      closingBalance: ledgerResult.closingBalance,
      totalDebit: ledgerResult.totalDebit,
      totalCredit: ledgerResult.totalCredit,
      entries: ledgerResult.displayEntries,
    });
  };

  // Secondary Sidebar Items for Daily Ledger (Level 3 - Section 8)
  const sidebarItems: SecondarySidebarItem[] = [
    { id: 'STATEMENT', label: '📋 লেনদেন বিবরণী', icon: Calendar },
    { id: 'OPENING_BALANCE', label: '💰 প্রারম্ভিক স্থিতি', icon: Scale },
    { id: 'ACCOUNTS', label: '🏦 হিসাব / ফান্ড', icon: Building, badge: accounts.length },
    { id: 'SEARCH', label: '🔎 লেনদেন অনুসন্ধান', icon: Search },
    { id: 'SUMMARY', label: '📊 দৈনিক/মাসিক সারাংশ', icon: Filter },
    { id: 'RECONCILIATION', label: '📑 সমন্বয় ও যাচাই', icon: ShieldCheck },
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
                📊 হিসাব ও লেনদেন / ১ম সাব-মডিউল
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>দৈনিক কেন্দ্রীয় লেনদেন বিবরণী (Daily Statement)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              মসজিদের কেন্দ্রীয় রানিং লেজার: প্রারম্ভিক জের, সকল প্রাপ্তি, ব্যয় ও চলমান স্থিতির সমন্বিত খতিয়ান
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
            subModuleName="দৈনিক লেনদেন"
            subModuleIcon={Calendar}
            items={sidebarItems}
            activeItemId={activeSubItem}
            onSelectItem={handleSelectSubTab}
            quickStat={{
              label: 'মসজিদের সর্বমোট তহবিল',
              value: `৳ ${totalCombinedFund.toLocaleString('en-IN')}`,
            }}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 w-full space-y-4">
          {/* 1. Main Statement Ledger View */}
          {activeSubItem === 'STATEMENT' && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    প্রারম্ভিক জের (Opening Balance)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-slate-800 mt-1">
                    ৳ {ledgerResult.openingBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatDate(startDate)} তারিখের শুরুর জের
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    মোট প্রাপ্তি / জমা (Inflow)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-blue-700 mt-1">
                    + ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">অনুমোদিত সকল আয় ও প্রাপ্তি</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    মোট ব্যয় / পরিশোধ (Outflow)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-rose-700 mt-1">
                    - ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">অনুমোদিত সকল ব্যয় ও খরচ</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    সমাপনী স্থিতি (Closing Balance)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-700 mt-1">
                    ৳ {ledgerResult.closingBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-bold">
                    নিট তারতম্য: {ledgerResult.netChange >= 0 ? '+' : ''}৳{' '}
                    {ledgerResult.netChange.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Filters & Account Selector */}
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

                {/* Date inputs, Account filter, Type, and Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100">
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
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">হিসাব / ফান্ড ফিল্টার</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                    >
                      <option value="ALL">সকল হিসাব (সম্মিলিত)</option>
                      <option value="CASH">শুধুমাত্র ক্যাশ হিসাব</option>
                      <option value="BANK">সকল ব্যাংক ও এমএফএস</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nameBn} ({a.accountType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">লেনদেনের ধরন</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white"
                    >
                      <option value="ALL">সকল লেনদেন</option>
                      <option value="INCOME">শুধুমাত্র প্রাপ্তি / জমা</option>
                      <option value="EXPENSE">শুধুমাত্র ব্যয় / পরিশোধ</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">অনুসন্ধান</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ভাউচার, খাত, পার্টি..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    কেন্দ্রীয় রানিং খতিয়ান ({ledgerResult.displayEntries.length} টি লেনদেন)
                  </span>
                  <span className="text-xs text-slate-500">
                    সময়সীমা: <span className="font-bold text-slate-700">{formatDate(startDate)}</span> হতে{' '}
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
                        <th className="py-2.5 px-3">খাত ও বিবরণ</th>
                        <th className="py-2.5 px-3">হিসাব / ফান্ড</th>
                        <th className="py-2.5 px-3">পার্টি / দাতা / প্রাপক</th>
                        <th className="py-2.5 px-3 text-right">প্রাপ্তি / জমা (৳)</th>
                        <th className="py-2.5 px-3 text-right">ব্যয় / খরচ (৳)</th>
                        <th className="py-2.5 px-3 text-right">চলমান স্থিতি (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Opening Balance Row */}
                      <tr className="bg-amber-50/60 font-bold text-slate-800">
                        <td className="py-2.5 px-3 text-center">-</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(startDate)}</td>
                        <td className="py-2.5 px-3 font-mono text-amber-800">OPENING</td>
                        <td className="py-2.5 px-3" colSpan={3}>
                          <div className="flex items-center space-x-1.5 text-amber-900">
                            <Scale className="w-3.5 h-3.5 text-amber-700" />
                            <span>প্রারম্ভিক জের (Accounting Baseline Opening Balance)</span>
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
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি
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
                            <td className="py-2 px-3 text-slate-600 font-medium">
                              {item.accountName}
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
                      <tr className="bg-blue-50/70 font-black text-slate-900 border-t-2 border-blue-200">
                        <td className="py-3 px-3 text-center font-mono">Σ</td>
                        <td className="py-3 px-3 font-mono">{formatDate(endDate)}</td>
                        <td className="py-3 px-3 font-mono text-blue-800">CLOSING</td>
                        <td className="py-3 px-3" colSpan={3}>
                          সমাপনী জের (Closing Running Balance)
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

          {/* 2. Opening Balance Sub-Item */}
          {activeSubItem === 'OPENING_BALANCE' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Scale className="w-5 h-5 text-amber-600" />
                    <span>অ্যাকাউন্টিং প্রারম্ভিক স্থিতি (Opening Balance Baseline)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    সফটওয়্যার ব্যবহারের শুরুর দিনের ক্যাশ ও ব্যাংক হিসাবের জের
                  </p>
                </div>
                {onUpdateOpeningBalance && (
                  <button
                    onClick={() => setIsOpeningBalanceModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>প্রারম্ভিক স্থিতি সমন্বয়</span>
                  </button>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">মূল অ্যাকাউন্টিং নীতি:</span>
                <span>
                  প্রারম্ভিক স্থিতি কোনো চলতি আয় (Income) বা ব্যয় (Expense) নয়। এটি হিসাব শুরুর উদ্বৃত্ত হিসেবে
                  কেন্দ্রীয় খতিয়ানের শুরুর লাইন হিসেবে কাজ করে।
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/60">
                    <span className="font-bold text-xs text-slate-900 block">{acc.nameBn}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-semibold">
                      ধরন: {acc.accountType}
                    </span>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-500">প্রারম্ভিক ব্যালেন্স:</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        ৳ {(Number(acc.openingBalance) || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Accounts / Fund List */}
          {activeSubItem === 'ACCOUNTS' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>মসজিদের সকল হিসাব ও ফান্ডসমূহ ({accounts.length} টি)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map((acc) => (
                  <div key={acc.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{acc.nameBn}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                        {acc.accountType}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-500">বর্তমান স্থিতি:</span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                      </span>
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
                <span>সার্বজনীন কেন্দ্রীয় লেনদেন অনুসন্ধান</span>
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ভাউচার নং, দাতা, গ্রহীতা, খাতের নাম বা বর্ণনা..."
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
                      <th className="p-2.5">খাত</th>
                      <th className="p-2.5">হিসাব</th>
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
                        <td className="p-2.5">{item.accountName}</td>
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

          {/* 5. Summary View */}
          {activeSubItem === 'SUMMARY' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                <span>দৈনিক/মাসিক লেনদেন সারসংক্ষেপ</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-xs font-bold text-blue-700 block">মোট প্রাপ্তি (Inflow)</span>
                  <span className="text-lg font-black font-mono text-blue-900 block mt-1">
                    ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-700 block">মোট খরচ (Outflow)</span>
                  <span className="text-lg font-black font-mono text-rose-900 block mt-1">
                    ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 block">নিট তারতম্য</span>
                  <span className="text-lg font-black font-mono text-emerald-900 block mt-1">
                    ৳ {ledgerResult.netChange.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Reconciliation Checklist */}
          {activeSubItem === 'RECONCILIATION' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>ভাউচার অডিট ও হিসাবের সমন্বয় যাচাই</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 block">অনুমোদিত আয় এন্ট্রি</span>
                  <span className="text-lg font-black font-mono text-emerald-900 block mt-1">
                    {incomes.filter((i) => i.status === 'APPROVED').length} টি
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-800 block">অনুমোদিত ব্যয় এন্ট্রি</span>
                  <span className="text-lg font-black font-mono text-rose-900 block mt-1">
                    {expenses.filter((e) => e.status === 'APPROVED').length} টি
                  </span>
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-xs font-bold text-indigo-800 block">মোট সমন্বিত তহবিল</span>
                  <span className="text-lg font-black font-mono text-indigo-900 block mt-1">
                    ৳ {totalCombinedFund.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 7. Reports & Export */}
          {activeSubItem === 'REPORTS' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>দৈনিক লেনদেন রিপোর্ট ও এক্সপোর্ট</span>
              </h2>

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
                      মসজিদের প্যাড সহ প্রিন্টযোগ্য দৈনিক লেজার
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
                      পূর্ণাঙ্গ ফর্মুলা সহ .xlsx ফাইল ডাউনলোড
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opening Balance Modal */}
      {isOpeningBalanceModalOpen && onUpdateOpeningBalance && (
        <OpeningBalanceModal
          isOpen={isOpeningBalanceModalOpen}
          onClose={() => setIsOpeningBalanceModalOpen(false)}
          accounts={accounts}
          onSubmit={async (data) => {
            await onUpdateOpeningBalance(data);
            setIsOpeningBalanceModalOpen(false);
          }}
        />
      )}

      {/* Standardized Print Document Dialog */}
      {isPrintModalOpen && (
        <ReportPrintDocument
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          currentMosque={currentMosque}
          reportTitle="দৈনিক কেন্দ্রীয় লেনদেন ও খতিয়ান বিবরণী"
          periodLabel={`${formatDate(startDate)} হতে ${formatDate(endDate)}`}
          columns={[
            { header: 'তারিখ', accessor: (item) => formatDate(item.date) },
            { header: 'ভাউচার নং', accessor: (item) => item.voucherNumber },
            { header: 'খাত ও বিবরণ', accessor: (item) => item.headNameBn },
            { header: 'হিসাব / ফান্ড', accessor: (item) => item.accountName },
            { header: 'পার্টি / দাতা / প্রাপক', accessor: (item) => item.partyName },
            { header: 'প্রাপ্তি / জমা (৳)', accessor: (item) => (item.debit > 0 ? `৳ ${item.debit.toLocaleString('en-IN')}` : '-') },
            { header: 'ব্যয় / খরচ (৳)', accessor: (item) => (item.credit > 0 ? `৳ ${item.credit.toLocaleString('en-IN')}` : '-') },
            { header: 'চলমান স্থিতি (৳)', accessor: (item) => `৳ ${item.runningBalance.toLocaleString('en-IN')}` },
          ]}
          data={ledgerResult.displayEntries}
          summaryRows={[
            { label: 'প্রারম্ভিক জের (Opening Balance)', value: `৳ ${ledgerResult.openingBalance.toLocaleString('en-IN')}` },
            { label: 'মোট প্রাপ্তি (Total Inflow)', value: `৳ ${ledgerResult.totalDebit.toLocaleString('en-IN')}` },
            { label: 'মোট খরচ (Total Outflow)', value: `৳ ${ledgerResult.totalCredit.toLocaleString('en-IN')}` },
            { label: 'সমাপনী জের (Closing Balance)', value: `৳ ${ledgerResult.closingBalance.toLocaleString('en-IN')}` },
          ]}
        />
      )}
    </div>
  );
};

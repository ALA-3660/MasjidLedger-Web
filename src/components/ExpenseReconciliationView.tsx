import React, { useState, useMemo } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  Info,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  Coins,
  Wallet,
  Landmark,
  FileText,
  RotateCcw,
  Copy,
  ChevronRight,
  Sparkles,
  HelpCircle,
  TrendingDown,
  X,
} from 'lucide-react';
import {
  ExpenseReconciliationDataset,
  ExpenseReconciliationItem,
  ExpenseReconciliationSummary,
  AccountReconciliationGroup,
  SourceReconciliationGroup,
  ReconciliationStatus,
  RECONCILIATION_STATUS_LABELS,
  exportReconciliationDatasetToExcel,
} from '../lib/expenseReconciliationService';
import { FinancialAccount, Mosque } from '../types';
import { formatDate } from '../lib/i18n';
import { ExpenseReconciliationPrintModal } from './ExpenseReconciliationPrintModal';

export type ReconSecondaryTab =
  | 'recon_dashboard'
  | 'recon_account'
  | 'recon_ledger'
  | 'recon_impact'
  | 'recon_source'
  | 'recon_cancellation'
  | 'recon_exceptions'
  | 'recon_register'
  | 'recon_export';

interface ExpenseReconciliationViewProps {
  dataset: ExpenseReconciliationDataset;
  accounts: FinancialAccount[];
  mosque: Mosque | null;
}

export const ExpenseReconciliationView: React.FC<ExpenseReconciliationViewProps> = ({
  dataset,
  accounts,
  mosque,
}) => {
  // Navigation State for the 9 Secondary Tabs
  const [activeTab, setActiveTab] = useState<ReconSecondaryTab>('recon_dashboard');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReconciliationStatus>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Selected item for Read-Only Diagnostic Drill-Down
  const [selectedDrillDownItem, setSelectedDrillDownItem] = useState<ExpenseReconciliationItem | null>(null);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filter items based on local search & status
  const filteredItems = useMemo(() => {
    return dataset.items.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // Account filter
      if (accountFilter !== 'ALL' && item.accountId !== accountFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'ALL' && item.sourceModule !== sourceFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const vNo = item.voucherNumber?.toLowerCase() || '';
        const payee = item.payeeName?.toLowerCase() || '';
        const head = item.mainHeadNameBn?.toLowerCase() || '';
        const sub = item.subHeadNameBn?.toLowerCase() || '';
        const acc = item.accountName?.toLowerCase() || '';
        const desc = item.description?.toLowerCase() || '';
        const phone = item.payeePhone?.toLowerCase() || '';

        return (
          vNo.includes(q) ||
          payee.includes(q) ||
          head.includes(q) ||
          sub.includes(q) ||
          acc.includes(q) ||
          desc.includes(q) ||
          phone.includes(q)
        );
      }

      return true;
    });
  }, [dataset.items, statusFilter, accountFilter, sourceFilter, searchQuery]);

  // Secondary Navigation Tabs List
  const secondaryNavTabs: { id: ReconSecondaryTab; label: string; icon: any; count?: number; badgeColor?: string }[] = [
    { id: 'recon_dashboard', label: '🔍 ড্যাশবোর্ড', icon: Scale },
    { id: 'recon_account', label: '💰 Expense ↔ Account', icon: Landmark, count: dataset.accountGroups.length },
    { id: 'recon_ledger', label: '📒 Expense ↔ Ledger', icon: FileText },
    { id: 'recon_impact', label: '🔄 একাউন্ট প্রভাব', icon: Wallet },
    { id: 'recon_source', label: '👥 উৎস মডিউল', icon: Users, count: dataset.sourceGroups.length },
    { id: 'recon_cancellation', label: '🔐 বাতিল ও রিভার্সাল', icon: RotateCcw, count: dataset.cancelledItems.length },
    {
      id: 'recon_exceptions',
      label: '⚠️ ব্যতিক্রম ও অমিল',
      icon: AlertTriangle,
      count: dataset.exceptionItems.length,
      badgeColor: dataset.exceptionItems.length > 0 ? 'bg-rose-100 text-rose-700 font-black' : undefined,
    },
    { id: 'recon_register', label: '📋 রিকনসিলিয়েশন রেজিস্টার', icon: Layers, count: dataset.items.length },
    { id: 'recon_export', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 to-rose-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-siliguri flex items-center space-x-2">
              <span>📊 ব্যয় ↔ হিসাব ↔ লেজার রিকনসিলিয়েশন</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                Phase E5-D
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-siliguri mt-0.5">
              ব্যয় ভাউচার, আর্থিক পোস্টিং ও খতিয়ানের ত্রিমুখী নিরীক্ষা ও স্বয়ংক্রিয় সমন্বয় যাচাই
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportReconciliationDatasetToExcel({ dataset, mosque, mode: 'REGISTER' })}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-secondary flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold font-siliguri flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>A4 প্রিন্ট / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Secondary Navigation Tabs (9 Sub-views) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center space-x-1.5 min-w-max">
          {secondaryNavTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-siliguri flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ml-1 ${
                      isActive
                        ? 'bg-rose-700 text-white'
                        : tab.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 🔍 RECONCILIATION DASHBOARD                                         */}
      {/* ========================================================================= */}
      {activeTab === 'recon_dashboard' && (
        <div className="space-y-4">
          {/* Integrity Status Alert Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
              dataset.summary.hasZeroDelta
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {dataset.summary.hasZeroDelta ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm font-siliguri">
                  {dataset.summary.hasZeroDelta
                    ? 'নিখুঁত আর্থিক সমন্বয় (100% Integrity Verified • Zero Delta)'
                    : `আর্থিক অসঙ্গতি পরিলক্ষিত হয়েছে (${dataset.summary.mismatchedCount + dataset.summary.missingCount + dataset.summary.invalidCount} টি অমিল)`}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border font-bold">
                  Delta: ৳ {dataset.summary.differenceAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs font-siliguri opacity-90 mt-1">
                {dataset.summary.hasZeroDelta
                  ? 'সকল অনুমোদিত ব্যয় ভাউচার, নির্ধারিত ব্যাংক/ক্যাশ হিসাব এবং সাধারণ খতিয়ানের (Ledger) ক্রেডিট পোস্টিংয়ের মধ্যে শতভাগ মিল রয়েছে।'
                  : 'কিছু ব্যয় ভাউচারের বিপরীতে লেজারে পোস্টিংয়ের ঘাটতি, টাকার পরিমাণের অসঙ্গতি বা হিসাবের অমিল পাওয়া গেছে। বিস্তারিত তালিকা নিচে দেওয়া হলো।'}
              </p>
            </div>
          </div>

          {/* Primary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 font-siliguri">মোট ব্যয় ইভেন্ট</span>
              <div className="text-lg font-black font-secondary text-slate-900 mt-0.5">
                {dataset.summary.totalExpenseEvents} টি
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">ব্যয় ভাউচার সংখ্যা</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-600 font-siliguri">নিখুঁত (Matched)</span>
              <div className="text-lg font-black font-secondary text-emerald-700 mt-0.5">
                {dataset.summary.matchedCount} টি
              </div>
              <span className="text-[10px] text-emerald-600 font-secondary font-bold">
                {dataset.summary.matchedRate.toFixed(1)}% নিখুঁত মিল
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-600 font-siliguri">অমিল (Mismatched)</span>
              <div className="text-lg font-black font-secondary text-amber-700 mt-0.5">
                {dataset.summary.mismatchedCount} টি
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">পরিমাণ বা একাউন্ট অমিল</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-600 font-siliguri">অনুপস্থিত (Missing)</span>
              <div className="text-lg font-black font-secondary text-rose-700 mt-0.5">
                {dataset.summary.missingCount} টি
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">লেজারে পোস্টিং নেই</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-purple-600 font-siliguri">দ্বৈত (Duplicate)</span>
              <div className="text-lg font-black font-secondary text-purple-700 mt-0.5">
                {dataset.summary.duplicateCount} টি
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">একাধিক লেজার পোস্টিং</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-red-600 font-siliguri">ত্রুটিপূর্ণ (Invalid)</span>
              <div className="text-lg font-black font-secondary text-red-700 mt-0.5">
                {dataset.summary.invalidCount} টি
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">অবৈধ একাউন্ট বা মেটাডাটা</span>
            </div>
          </div>

          {/* Amount Balance KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 font-siliguri">মোট ভাউচার ব্যয়</span>
              <div className="text-xl font-black font-secondary text-rose-700 mt-1">
                ৳ {dataset.summary.totalExpenseAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">সকল ব্যয়ের সমষ্টি</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 font-siliguri">প্রত্যাশিত লেজার আউটফ্লো</span>
              <div className="text-xl font-black font-secondary text-slate-900 mt-1">
                ৳ {dataset.summary.expectedLedgerAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">অনুমোদিত ব্যয় থেকে গণনাকৃত</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 font-siliguri">প্রকৃত লেজার আউটফ্লো</span>
              <div className="text-xl font-black font-secondary text-blue-700 mt-1">
                ৳ {dataset.summary.actualLedgerAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 font-siliguri">লেজারে প্রকৃত ক্রেডিট যোগফল</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 font-siliguri">আর্থিক পার্থক্য (Financial Delta)</span>
              <div className={`text-xl font-black font-secondary mt-1 ${dataset.summary.hasZeroDelta ? 'text-emerald-700' : 'text-rose-700'}`}>
                ৳ {dataset.summary.differenceAmount.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-700 font-secondary font-bold">
                {dataset.summary.hasZeroDelta ? '✓ সমতা নিশ্চিত (Zero Discrepancy)' : '⚠️ অসমতা পরিলক্ষিত'}
              </span>
            </div>
          </div>

          {/* Account Breakdown Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Accounts Status */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold font-siliguri text-slate-900 flex items-center space-x-1.5">
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  <span>আর্থিক হিসাবসমূহের রিকনসিলিয়েশন অবস্থা</span>
                </h3>
                <button
                  onClick={() => setActiveTab('recon_account')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold font-siliguri flex items-center space-x-1 cursor-pointer"
                >
                  <span>বিস্তারিত দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {dataset.accountGroups.map((grp) => (
                  <div
                    key={grp.accountId}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 font-siliguri">{grp.accountName}</div>
                      <div className="text-[10px] text-slate-500 font-secondary">
                        {grp.accountType} • {grp.totalVouchersCount} টি ভাউচার
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black font-secondary text-rose-700">
                        ৳ {grp.expectedOutflow.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-siliguri font-bold">
                        {grp.status === 'BALANCED' ? (
                          <span className="text-emerald-700">✓ নিখুঁত</span>
                        ) : (
                          <span className="text-rose-700">⚠️ অমিল ({grp.exceptionCount})</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Source Modules Status */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold font-siliguri text-slate-900 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>উৎস মডিউল সমন্বয় (Source Linkage)</span>
                </h3>
                <button
                  onClick={() => setActiveTab('recon_source')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold font-siliguri flex items-center space-x-1 cursor-pointer"
                >
                  <span>বিস্তারিত দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {dataset.sourceGroups.map((grp) => (
                  <div
                    key={grp.sourceKey}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 font-siliguri">{grp.sourceLabelBn}</div>
                      <div className="text-[10px] text-slate-500 font-secondary">
                        মোট ভাউচার: {grp.totalVouchersCount} টি
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black font-secondary text-slate-900">
                        ৳ {grp.totalAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-siliguri font-bold text-emerald-700">
                        {grp.matchedCount} টি নিখুঁত মিল
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 💰 EXPENSE ↔ ACCOUNT RECONCILIATION                                */}
      {/* ========================================================================= */}
      {activeTab === 'recon_account' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 font-siliguri mb-1">
              আর্থিক হিসাবভিত্তিক ব্যয়ের প্রভাব ও খতিয়ান সমন্বয়
            </h3>
            <p className="text-xs text-slate-500 font-siliguri mb-4">
              প্রতিটি ব্যাংক ও ক্যাশ ড্রয়ার হিসাবের বিপরীতে অনুমোদিত ব্যয়ের প্রত্যাশিত আউটফ্লো এবং লেজারের প্রকৃত পোস্টিং যাচাই
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold font-siliguri border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-10">ক্রঃ</th>
                    <th className="px-3.5 py-3">হিসাবের নাম (Account)</th>
                    <th className="px-3.5 py-3">ধরন</th>
                    <th className="px-3.5 py-3 text-center">ভাউচার সংখ্যা</th>
                    <th className="px-3.5 py-3 text-right">প্রত্যাশিত ব্যয় (৳)</th>
                    <th className="px-3.5 py-3 text-right">প্রকৃত লেজার (৳)</th>
                    <th className="px-3.5 py-3 text-right">আর্থিক পার্থক্য (৳)</th>
                    <th className="px-3.5 py-3 text-right">বর্তমান ব্যালেন্স (তথ্য)</th>
                    <th className="px-3.5 py-3 text-center">সমন্বয় অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataset.accountGroups.map((grp, idx) => (
                    <tr key={grp.accountId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-secondary text-slate-400">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-bold text-slate-900 font-siliguri">{grp.accountName}</td>
                      <td className="px-3.5 py-3 text-slate-600 font-siliguri">{grp.accountType}</td>
                      <td className="px-3.5 py-3 text-center font-secondary font-bold text-slate-700">
                        {grp.totalVouchersCount} টি
                      </td>
                      <td className="px-3.5 py-3 text-right font-secondary font-bold text-rose-700">
                        ৳ {grp.expectedOutflow.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-right font-secondary font-bold text-blue-700">
                        ৳ {grp.actualOutflow.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-right font-secondary font-black">
                        ৳ {grp.difference.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-right font-secondary text-slate-500">
                        ৳ {grp.currentBalance.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-center font-siliguri font-bold">
                        {grp.status === 'BALANCED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ নিখুঁত সমতা
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                            ⚠️ অমিল ({grp.exceptionCount})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 📒 EXPENSE ↔ LEDGER RECONCILIATION                                  */}
      {/* ========================================================================= */}
      {activeTab === 'recon_ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 font-siliguri mb-1">
              ব্যয় ভাউচার ↔ সাধারণ খতিয়ান (General Ledger) ক্রেডিট পোস্টিং নিরীক্ষা
            </h3>
            <p className="text-xs text-slate-500 font-siliguri mb-4">
              প্রতিটি অনুমোদিত ভাউচারের বিপরীতে লেজারে ক্রেডিট পোস্টিংয়ের উপস্থিতি, পরিমাণ ও তারিখ যাচাই
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold font-siliguri border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-10">ক্রঃ</th>
                    <th className="px-3.5 py-3">ভাউচার নং</th>
                    <th className="px-3.5 py-3">তারিখ</th>
                    <th className="px-3.5 py-3">ব্যয়ের খাত</th>
                    <th className="px-3.5 py-3">হিসাব (Account)</th>
                    <th className="px-3.5 py-3 text-right">ভাউচার পরিমাণ (৳)</th>
                    <th className="px-3.5 py-3 text-right">লেজার ক্রেডিট (৳)</th>
                    <th className="px-3.5 py-3 text-center">পোস্টিং সংখ্যা</th>
                    <th className="px-3.5 py-3 text-center">অবস্থা</th>
                    <th className="px-3.5 py-3 text-center">নিরীক্ষা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dataset.items.slice(0, 50).map((item, idx) => (
                    <tr key={item.expenseId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-secondary text-slate-400">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{item.voucherNumber}</td>
                      <td className="px-3.5 py-3 font-secondary whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-3.5 py-3 font-bold font-siliguri text-slate-800">{item.mainHeadNameBn}</td>
                      <td className="px-3.5 py-3 font-siliguri text-slate-700">{item.accountName}</td>
                      <td className="px-3.5 py-3 text-right font-secondary font-bold text-rose-700">
                        ৳ {item.expenseAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-right font-secondary font-bold text-blue-700">
                        ৳ {item.actualLedgerAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3.5 py-3 text-center font-secondary font-bold">
                        {item.actualLedgerPostingCount} / {item.expectedLedgerPostingCount}
                      </td>
                      <td className="px-3.5 py-3 text-center font-siliguri font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${RECONCILIATION_STATUS_LABELS[item.status].badgeBg}`}>
                          {item.statusLabelBn}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <button
                          onClick={() => setSelectedDrillDownItem(item)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="ডিটেইল নিরীক্ষা"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* TAB 4: 🔄 ACCOUNT IMPACT RECONCILIATION                                   */}
      {/* ========================================================================= */}
      {activeTab === 'recon_impact' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 font-siliguri mb-1">
              হিসাব ও মাধ্যম সামঞ্জস্যতা নিরীক্ষা (Payment Method & Account Type Compatibility)
            </h3>
            <p className="text-xs text-slate-500 font-siliguri mb-4">
              পেমেন্ট মাধ্যম (ব্যাংক চেক, বিকাশ/নগদ, ক্যাশ) এবং নির্ধারিত হিসাবের টাইপ সামঞ্জস্যপূর্ণ কিনা তা যাচাই
            </p>

            <div className="space-y-3">
              {dataset.items.map((item) => {
                const hasMethodIssue = item.exceptionReasons.some((r) => r.includes('পদ্ধতি'));
                return (
                  <div
                    key={item.expenseId}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      hasMethodIssue ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{item.voucherNumber}</span>
                        <span className="text-xs font-bold font-siliguri text-slate-800">{item.mainHeadNameBn}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border font-bold text-slate-600 font-siliguri">
                          মাধ্যম: {item.paymentMethodLabelBn}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-siliguri">
                        নির্ধারিত হিসাব: <strong className="text-slate-800">{item.accountName}</strong> ({item.accountType || 'অজানা'}) • প্রাপক: {item.payeeName}
                      </div>
                      {hasMethodIssue && (
                        <div className="text-[11px] font-siliguri text-amber-800 font-bold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>{item.exceptionReasons.find((r) => r.includes('পদ্ধতি'))}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black font-secondary text-rose-700">
                        ৳ {item.expenseAmount.toLocaleString('en-IN')}
                      </div>
                      <span className={`text-[10px] font-bold font-siliguri ${hasMethodIssue ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {hasMethodIssue ? 'সতর্কতা: মাধ্যম অমিল' : '✓ সামঞ্জস্যপূর্ণ'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: 👥 SOURCE MODULE RECONCILIATION                                    */}
      {/* ========================================================================= */}
      {activeTab === 'recon_source' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 font-siliguri mb-1">
              উৎস মডিউল সংযুক্তি নিরীক্ষা (Source Module Linkage)
            </h3>
            <p className="text-xs text-slate-500 font-siliguri mb-4">
              স্টাফ বেতন, সম্পদ ও ওয়াকফ সম্পত্তির ব্যয়ের উৎস আইডি সঠিক ও বৈধ কিনা যাচাই
            </p>

            <div className="space-y-4">
              {dataset.sourceGroups.map((grp) => (
                <div key={grp.sourceKey} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-xs font-siliguri text-slate-900">{grp.sourceLabelBn}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-secondary font-bold">
                        {grp.totalVouchersCount} টি রেকর্ড
                      </span>
                    </div>
                    <div className="text-xs font-black font-secondary text-rose-700">
                      মোট: ৳ {grp.totalAmount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {grp.items.slice(0, 10).map((it) => (
                      <div
                        key={it.expenseId}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-siliguri"
                      >
                        <div>
                          <div className="font-bold text-slate-800">
                            {it.sourceEntityName || it.payeeName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-secondary">
                            ভাউচার: {it.voucherNumber} • {formatDate(it.date)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-secondary text-rose-700">
                            ৳ {it.expenseAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            {it.statusLabelBn}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 🔐 CANCELLATION & REVERSAL RECONCILIATION                          */}
      {/* ========================================================================= */}
      {activeTab === 'recon_cancellation' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 font-siliguri mb-1">
              বাতিলকৃত ও রিভার্সাল ভাউচারের প্রভাব নিরীক্ষা
            </h3>
            <p className="text-xs text-slate-500 font-siliguri mb-4">
              বাতিলকৃত (Cancelled) ভাউচারের বিপরীতে লেজার আউটফ্লো শূন্য (৳০.০০) রয়েছে কিনা এবং কোনো সক্রিয় পোস্টিং রয়েছে কিনা যাচাই
            </p>

            {dataset.cancelledItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-500 font-siliguri text-xs">
                নির্বাচিত সময়সীমায় কোনো বাতিলকৃত বা রিভার্সাল ভাউচার নেই।
              </div>
            ) : (
              <div className="space-y-3">
                {dataset.cancelledItems.map((item) => (
                  <div
                    key={item.expenseId}
                    className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{item.voucherNumber}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] font-siliguri">
                          বাতিলকৃত (Cancelled)
                        </span>
                      </div>
                      <div className="text-slate-700 font-siliguri mt-1">
                        খাত: {item.mainHeadNameBn} • প্রাপক: {item.payeeName} • হিসাব: {item.accountName}
                      </div>
                      {item.rejectionReason && (
                        <div className="text-[11px] text-rose-700 font-siliguri mt-0.5">
                          বাতিলের কারণ: {item.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black font-secondary text-slate-500 line-through">
                        ৳ {item.expenseAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] font-bold font-siliguri text-emerald-700">
                        লেজার প্রভাব: ৳ {item.actualLedgerAmount.toLocaleString('en-IN')} (নিষ্ক্রিয়)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ⚠️ EXCEPTION & MISMATCH REGISTER                                   */}
      {/* ========================================================================= */}
      {activeTab === 'recon_exceptions' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-siliguri">
                  ব্যতিক্রম ও অমিল রেজিস্টার (Exception Register)
                </h3>
                <p className="text-xs text-slate-500 font-siliguri mt-0.5">
                  শুধুমাত্র অমিল, অনুপস্থিত, দ্বৈত বা ত্রুটিপূর্ণ রেকর্ডসমূহের বিশদ তালিকা
                </p>
              </div>

              <button
                onClick={() => exportReconciliationDatasetToExcel({ dataset, mosque, mode: 'EXCEPTIONS' })}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-siliguri flex items-center space-x-1 transition-all cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ব্যতিক্রম তালিকা ডাউনলোড</span>
              </button>
            </div>

            {dataset.exceptionItems.length === 0 ? (
              <div className="p-12 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-emerald-900 font-siliguri">
                  কোনো আর্থিক ব্যতিক্রম বা অমিল পাওয়া যায়নি!
                </h4>
                <p className="text-xs text-emerald-700 font-siliguri mt-1">
                  সকল ব্যয় ভাউচার ও সাধারণ খতিয়ানের পোস্টিং সম্পূর্ণ নিখুঁতভাবে সমন্বিত রয়েছে (Financial Delta = ৳০.০০)।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-rose-50 text-rose-900 font-bold font-siliguri border-b border-rose-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-8">ক্রঃ</th>
                      <th className="px-3 py-2.5">ভাউচার নং</th>
                      <th className="px-3 py-2.5">তারিখ</th>
                      <th className="px-3 py-2.5">ব্যয়ের খাত</th>
                      <th className="px-3 py-2.5">হিসাব</th>
                      <th className="px-3 py-2.5 text-right">ভাউচার (৳)</th>
                      <th className="px-3 py-2.5 text-right">লেজার (৳)</th>
                      <th className="px-3 py-2.5 text-right">পার্থক্য (৳)</th>
                      <th className="px-3 py-2.5 text-center">অবস্থা</th>
                      <th className="px-3 py-2.5">কারণ ও পর্যবেক্ষণ</th>
                      <th className="px-3 py-2.5 text-center">নিরীক্ষা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {dataset.exceptionItems.map((item, idx) => (
                      <tr key={item.expenseId} className="hover:bg-rose-50/50 transition-colors">
                        <td className="px-3 py-2.5 text-center font-secondary text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-rose-900">{item.voucherNumber}</td>
                        <td className="px-3 py-2.5 font-secondary whitespace-nowrap">{formatDate(item.date)}</td>
                        <td className="px-3 py-2.5 font-bold font-siliguri text-slate-800">{item.mainHeadNameBn}</td>
                        <td className="px-3 py-2.5 font-siliguri text-slate-700">{item.accountName}</td>
                        <td className="px-3 py-2.5 text-right font-secondary font-bold text-rose-700">
                          ৳ {item.expenseAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-secondary font-bold text-blue-700">
                          ৳ {item.actualLedgerAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-secondary font-black text-rose-700">
                          ৳ {item.differenceAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2.5 text-center font-siliguri font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${RECONCILIATION_STATUS_LABELS[item.status].badgeBg}`}>
                            {item.statusLabelBn}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-siliguri text-[11px] text-rose-800">
                          {item.exceptionReasons.join('; ')}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => setSelectedDrillDownItem(item)}
                            className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-100 rounded-md cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: 📋 RECONCILIATION REGISTER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'recon_register' && (
        <div className="space-y-4">
          {/* Register Filter Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ভাউচার নম্বর, প্রাপক, খাত বা বিবরণ দিয়ে খুঁজুন..."
                className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-hidden font-siliguri"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-siliguri font-medium"
              >
                <option value="ALL">সকল অবস্থা (All Status)</option>
                <option value="MATCHED">সঠিক ও নিখুঁত (Matched)</option>
                <option value="MISMATCHED">অমিল (Mismatched)</option>
                <option value="MISSING">অনুপস্থিত (Missing)</option>
                <option value="DUPLICATE">দ্বৈত পোস্টিং (Duplicate)</option>
                <option value="INVALID">ত্রুটিপূর্ণ (Invalid)</option>
              </select>

              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-siliguri font-medium"
              >
                <option value="ALL">সকল আর্থিক হিসাব</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn}
                  </option>
                ))}
              </select>

              {(searchQuery || statusFilter !== 'ALL' || accountFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setAccountFilter('ALL');
                  }}
                  className="text-xs px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold font-siliguri cursor-pointer"
                >
                  রিসেট
                </button>
              )}
            </div>
          </div>

          {/* Full Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-siliguri">পূর্ণাঙ্গ ব্যয় রিকনসিলিয়েশন রেজিস্টার</h3>
                <p className="text-xs text-slate-500 font-siliguri">সময়সীমা: {dataset.effectiveDates.labelBn}</p>
              </div>
              <div className="text-xs font-secondary font-bold text-slate-700">
                মোট প্রদর্শিত: {filteredItems.length} টি
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold font-siliguri border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-10">ক্রঃ</th>
                    <th className="px-3.5 py-3">ভাউচার নং</th>
                    <th className="px-3.5 py-3">তারিখ</th>
                    <th className="px-3.5 py-3">ব্যয়ের খাত</th>
                    <th className="px-3.5 py-3">প্রাপক</th>
                    <th className="px-3.5 py-3">মাধ্যম</th>
                    <th className="px-3.5 py-3">হিসাব</th>
                    <th className="px-3.5 py-3 text-right">ভাউচার (৳)</th>
                    <th className="px-3.5 py-3 text-right">লেজার (৳)</th>
                    <th className="px-3.5 py-3 text-right">পার্থক্য (৳)</th>
                    <th className="px-3.5 py-3 text-center">পোস্টিং</th>
                    <th className="px-3.5 py-3 text-center">অবস্থা</th>
                    <th className="px-3.5 py-3 text-center">নিরীক্ষা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-10 text-center text-slate-400 font-siliguri">
                        কোনো রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={item.expenseId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-3 text-center font-secondary text-slate-400">{idx + 1}</td>
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{item.voucherNumber}</td>
                        <td className="px-3.5 py-3 font-secondary whitespace-nowrap">{formatDate(item.date)}</td>
                        <td className="px-3.5 py-3 font-bold font-siliguri text-slate-800">{item.mainHeadNameBn}</td>
                        <td className="px-3.5 py-3 text-slate-700 truncate max-w-[120px] font-siliguri">{item.payeeName}</td>
                        <td className="px-3.5 py-3 font-siliguri text-slate-600">{item.paymentMethodLabelBn}</td>
                        <td className="px-3.5 py-3 font-siliguri text-slate-700">{item.accountName}</td>
                        <td className="px-3.5 py-3 text-right font-secondary font-bold text-rose-700">
                          ৳ {item.expenseAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3.5 py-3 text-right font-secondary font-bold text-blue-700">
                          ৳ {item.actualLedgerAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3.5 py-3 text-right font-secondary font-bold">
                          ৳ {item.differenceAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3.5 py-3 text-center font-secondary">
                          {item.actualLedgerPostingCount} / {item.expectedLedgerPostingCount}
                        </td>
                        <td className="px-3.5 py-3 text-center font-siliguri font-bold">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${RECONCILIATION_STATUS_LABELS[item.status].badgeBg}`}>
                            {item.statusLabelBn}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <button
                            onClick={() => setSelectedDrillDownItem(item)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="বিস্তারিত নিরীক্ষা দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* TAB 9: 🖨️ REPORT & EXPORT HUB                                             */}
      {/* ========================================================================= */}
      {activeTab === 'recon_export' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-siliguri">
                ব্যয় রিকনসিলিয়েশন — রিপোর্ট ও এক্সপোর্ট কেন্দ্র
              </h3>
              <p className="text-xs text-slate-500 font-siliguri mt-0.5">
                অফিসিয়াল A4 সাইজ প্রিন্ট ও জেনুইন Excel (.xlsx) ওয়ার্কবুক জেনারেট করুন
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Full Register Excel */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-emerald-50/30 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl w-fit mb-2">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 font-siliguri">পূর্ণাঙ্গ রিকনসিলিয়েশন এক্সেল</h4>
                  <p className="text-xs text-slate-500 font-siliguri mt-1">
                    সকল ব্যয় ভাউচার, লেজার ক্রেডিট পোস্টিং এবং রিকনসিলিয়েশন স্ট্যাটাসসহ বিস্তারিত .xlsx ফাইল
                  </p>
                </div>
                <button
                  onClick={() => exportReconciliationDatasetToExcel({ dataset, mosque, mode: 'REGISTER' })}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-siliguri transition-all cursor-pointer shadow-xs"
                >
                  ডাউনলোড করুন (.xlsx)
                </button>
              </div>

              {/* Option 2: Exceptions Excel */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-rose-300 bg-slate-50/50 hover:bg-rose-50/30 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl w-fit mb-2">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 font-siliguri">ব্যতিক্রম ও অমিল রিপোর্ট</h4>
                  <p className="text-xs text-slate-500 font-siliguri mt-1">
                    শুধুমাত্র অমিল, অনুপস্থিত পোস্টিং ও ত্রুটিযুক্ত রেকর্ডের নিরীক্ষা এক্সেল ফাইল
                  </p>
                </div>
                <button
                  onClick={() => exportReconciliationDatasetToExcel({ dataset, mosque, mode: 'EXCEPTIONS' })}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-siliguri transition-all cursor-pointer shadow-xs"
                >
                  ব্যতিক্রম তালিকা ডাউনলোড
                </button>
              </div>

              {/* Option 3: A4 Print & PDF Preview */}
              <div className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/30 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl w-fit mb-2">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 font-siliguri">A4 প্রিন্ট ও PDF প্রিভিউ</h4>
                  <p className="text-xs text-slate-500 font-siliguri mt-1">
                    মসজিদের অফিসিয়াল লেটারহেড এবং নিরীক্ষক ও কর্মকর্তাদের স্বাক্ষর ব্লকসহ প্রিন্ট
                  </p>
                </div>
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold font-siliguri transition-all cursor-pointer shadow-xs"
                >
                  প্রিন্ট প্রিভিউ খুলুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* READ-ONLY DIAGNOSTIC DRILL-DOWN MODAL                                     */}
      {/* ========================================================================= */}
      {selectedDrillDownItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm font-siliguri">
                  ব্যয় ভাউচার নিরীক্ষা ও ডায়াগনস্টিক বিবরণ
                </h3>
              </div>
              <button
                onClick={() => setSelectedDrillDownItem(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-siliguri">
              {/* Top Summary Banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-sm text-slate-900">
                    ভাউচার: {selectedDrillDownItem.voucherNumber}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    তারিখ: {formatDate(selectedDrillDownItem.date)} • খাত: {selectedDrillDownItem.mainHeadNameBn}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black font-secondary text-rose-700">
                    ৳ {selectedDrillDownItem.expenseAmount.toLocaleString('en-IN')}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RECONCILIATION_STATUS_LABELS[selectedDrillDownItem.status].badgeBg}`}>
                    {selectedDrillDownItem.statusLabelBn}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison Box */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 border-b pb-1">১. ভাউচার ও প্রত্যাশিত প্রভাব</h4>
                  <div className="space-y-1 text-slate-600">
                    <div>ভাউচার পরিমাণ: <strong className="text-slate-900 font-secondary">৳ {selectedDrillDownItem.expenseAmount.toLocaleString('en-IN')}</strong></div>
                    <div>নির্ধারিত হিসাব: <strong className="text-slate-900">{selectedDrillDownItem.accountName}</strong></div>
                    <div>পেমেন্ট মাধ্যম: <strong className="text-slate-900">{selectedDrillDownItem.paymentMethodLabelBn}</strong></div>
                    <div>প্রত্যাশিত লেজার পোস্টিং: <strong className="text-slate-900 font-secondary">{selectedDrillDownItem.expectedLedgerPostingCount} টি</strong></div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 border-b pb-1">২. লেজারের প্রকৃত অবস্থা</h4>
                  <div className="space-y-1 text-slate-600">
                    <div>লেজার ক্রেডিট আউটফ্লো: <strong className="text-blue-700 font-secondary">৳ {selectedDrillDownItem.actualLedgerAmount.toLocaleString('en-IN')}</strong></div>
                    <div>প্রকৃত পোস্টিং সংখ্যা: <strong className="text-slate-900 font-secondary">{selectedDrillDownItem.actualLedgerPostingCount} টি</strong></div>
                    <div>আর্থিক পার্থক্য: <strong className={`font-secondary ${selectedDrillDownItem.differenceAmount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>৳ {selectedDrillDownItem.differenceAmount.toLocaleString('en-IN')}</strong></div>
                    <div>লেজার ম্যাচিং: <strong className="text-slate-900">{selectedDrillDownItem.statusLabelBn}</strong></div>
                  </div>
                </div>
              </div>

              {/* Diagnostic Reasons if any */}
              {selectedDrillDownItem.exceptionReasons.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>শনাক্তকৃত অমিল বা কারণসমূহ:</span>
                  </div>
                  <ul className="list-disc list-inside text-amber-800 space-y-0.5 pl-2">
                    {selectedDrillDownItem.exceptionReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Read-Only Guidance Note (Zero Auto-Mutation Rule) */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>সংশোধন নির্দেশনা (Read-Only Advice):</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  সিস্টেমের আর্থিক নির্ভরযোগ্যতা বজায় রাখতে কোনো অটো-রিপেয়ার বা স্বয়ংক্রিয় ডাটাবেস পরিবর্তন করা হবে না। যদি কোনো এন্ট্রিতে ভুল থাকে, তবে ব্যয় ম্যানেজমেন্ট থেকে ভাউচারটি এডিট করুন অথবা বাতিল (Reverse) করে নতুন ভাউচার ইস্যু করুন।
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDrillDownItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold font-siliguri cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official A4 Print & PDF Preview Modal */}
      <ExpenseReconciliationPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        dataset={dataset}
        mosque={mosque}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Printer,
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  PieChart,
  BarChart3,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Building,
  DollarSign,
  Search,
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  FinancialAccount,
  AccountHead,
  DonationBox,
  DonationBoxCollection,
  Staff,
  StaffPayment,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  CommitteeMember,
  CommitteeMeeting,
  MosqueNotice,
  AuditLog,
  Mosque,
  SavedReportConfig,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';

interface ReportCenterViewProps {
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  donationBoxes: DonationBox[];
  boxCollections: DonationBoxCollection[];
  staffList: Staff[];
  staffPayments: StaffPayment[];
  assets: MosqueAsset[];
  properties: MosqueProperty[];
  cemeteryRecords: CemeteryRecord[];
  committeeMembers: CommitteeMember[];
  meetings: CommitteeMeeting[];
  notices: MosqueNotice[];
  auditLogs: AuditLog[];
  currentMosque: Mosque | null;
  savedConfigs?: SavedReportConfig[];
  onSaveReportConfig?: (config: Omit<SavedReportConfig, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteReportConfig?: (id: string) => Promise<void>;
  language?: Language;
}

const REPORT_TYPES = [
  { id: 'SUMMARY', labelBn: 'আর্থিক সারসংক্ষেপ (Executive Summary)', category: 'আর্থিক' },
  { id: 'INCOME_STATEMENT', labelBn: 'আয় বিবরণী (Income Statement)', category: 'আর্থিক' },
  { id: 'EXPENSE_STATEMENT', labelBn: 'ব্যয় বিবরণী (Expense Statement)', category: 'আর্থিক' },
  { id: 'INCOME_EXPENSE_COMBINED', labelBn: 'আয় ও ব্যয় যৌথ বিবরণী (Income & Expense Statement)', category: 'আর্থিক' },
  { id: 'CASHBOOK', labelBn: 'নগদ বহি (Cashbook)', category: 'আর্থিক' },
  { id: 'BANKBOOK', labelBn: 'ব্যাংক বহি (Bankbook)', category: 'আর্থিক' },
  { id: 'CASH_BANK_COMBINED', labelBn: 'ক্যাশ ও ব্যাংক যৌথ বিবরণী', category: 'আর্থিক' },
  { id: 'HEADWISE_LEDGER', labelBn: 'খাতভিত্তিক লেজার (Head-wise Ledger)', category: 'আর্থিক' },
  { id: 'MONTHLY_SUMMARY', labelBn: 'মাসভিত্তিক তুলনামূলক প্রতিবেদন (Monthly Trend)', category: 'আর্থিক' },
  { id: 'DONATION_SUMMARY', labelBn: 'দান ও অনুদান প্রতিবেদন (Donations)', category: 'দান ও কালেকশন' },
  { id: 'DONATION_BOX_REPORT', labelBn: 'দানবাক্স কালেকশন ও স্ট্যাটাস রিপোর্ট', category: 'দান ও কালেকশন' },
  { id: 'JUMA_COLLECTION_REPORT', labelBn: 'জুমার কালেকশন রেজিস্টার', category: 'দান ও কালেকশন' },
  { id: 'STAFF_SALARY_REPORT', labelBn: 'স্টাফ ও বেতন বিবরণী (Staff Salary)', category: 'প্রশাসন' },
  { id: 'ASSET_REGISTER_REPORT', labelBn: 'সম্পদ রেজিস্ট্রি প্রতিবেদন (Asset Register)', category: 'প্রশাসন' },
  { id: 'PROPERTY_REGISTER_REPORT', labelBn: 'ওয়াকফ ও সম্পত্তি রেজিস্ট্রি (Property Register)', category: 'প্রশাসন' },
  { id: 'CEMETERY_REGISTER_REPORT', labelBn: 'কবরস্থান রেজিস্ট্রি প্রতিবেদন (Cemetery)', category: 'প্রশাসন' },
  { id: 'COMMITTEE_REPORT', labelBn: 'কমিটি ও সভার কার্যবিবরণী রিপোর্ট', category: 'প্রশাসন' },
  { id: 'AUDIT_LOG_REPORT', labelBn: 'সিস্টেম অডিট ট্রেইল লগ (Audit Trail)', category: 'নিরাপত্তা' },
];

const COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#475569'];

export const ReportCenterView: React.FC<ReportCenterViewProps> = ({
  incomes,
  expenses,
  accounts,
  accountHeads,
  donationBoxes,
  boxCollections,
  staffList,
  staffPayments,
  assets,
  properties,
  cemeteryRecords,
  committeeMembers,
  meetings,
  notices,
  auditLogs,
  currentMosque,
  savedConfigs = [],
  onSaveReportConfig,
  onDeleteReportConfig,
  language = 'bn',
}) => {
  const t = translations[language] || translations.bn;

  // Filter Form State
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [reportType, setReportType] = useState<string>('INCOME_EXPENSE_COMBINED');
  const [dateRangeType, setDateRangeType] = useState<string>('THIS_MONTH');
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [grouping, setGrouping] = useState<string>('HEAD');
  const [level, setLevel] = useState<string>('DETAILED');
  const [selectedHeadId, setSelectedHeadId] = useState<string>('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  // Save report modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [configName, setConfigName] = useState('');

  // Handle Preset ranges
  const handleRangePreset = (range: string) => {
    setDateRangeType(range);
    const d = new Date();
    if (range === 'TODAY') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (range === 'THIS_MONTH') {
      const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      setFromDate(first);
      setToDate(todayStr);
    } else if (range === 'LAST_MONTH') {
      const first = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
      const last = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(first);
      setToDate(last);
    } else if (range === 'THIS_YEAR') {
      const first = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
      setFromDate(first);
      setToDate(todayStr);
    } else if (range === 'LAST_YEAR') {
      const first = new Date(d.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      const last = new Date(d.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
      setFromDate(first);
      setToDate(last);
    }
  };

  // Filtered dataset calculations
  const filteredIncomes = incomes.filter((i) => {
    if (i.status !== 'APPROVED') return false;
    const matchesDate = i.date >= fromDate && i.date <= toDate;
    const matchesHead = selectedHeadId === 'ALL' || i.mainHeadId === selectedHeadId;
    const matchesAccount = selectedAccountId === 'ALL' || i.accountId === selectedAccountId;
    return matchesDate && matchesHead && matchesAccount;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (e.status !== 'APPROVED') return false;
    const matchesDate = e.date >= fromDate && e.date <= toDate;
    const matchesHead = selectedHeadId === 'ALL' || e.mainHeadId === selectedHeadId;
    const matchesAccount = selectedAccountId === 'ALL' || e.accountId === selectedAccountId;
    return matchesDate && matchesHead && matchesAccount;
  });

  const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netSurplus = totalIncome - totalExpense;

  // Head-wise grouping for charts & breakdown
  const headWiseIncome: Record<string, { name: string; amount: number }> = {};
  filteredIncomes.forEach((i) => {
    const key = i.mainHeadId;
    if (!headWiseIncome[key]) {
      headWiseIncome[key] = { name: i.mainHeadNameBn, amount: 0 };
    }
    headWiseIncome[key].amount += i.amount;
  });

  const headWiseExpense: Record<string, { name: string; amount: number }> = {};
  filteredExpenses.forEach((e) => {
    const key = e.mainHeadId;
    if (!headWiseExpense[key]) {
      headWiseExpense[key] = { name: e.mainHeadNameBn, amount: 0 };
    }
    headWiseExpense[key].amount += e.amount;
  });

  const incomeChartData = Object.values(headWiseIncome).map((h) => ({
    name: h.name,
    value: h.amount,
  }));

  const expenseChartData = Object.values(headWiseExpense).map((h) => ({
    name: h.name,
    value: h.amount,
  }));

  // Quick Preset Actions
  const applyPresetTemplate = (type: string, range: string, grp: string) => {
    setReportType(type);
    handleRangePreset(range);
    setGrouping(grp);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configName.trim() || !onSaveReportConfig) return;
    await onSaveReportConfig({
      mosqueId: currentMosque?.id || 'default',
      name: configName,
      reportType,
      dateRangeType,
      fromDate,
      toDate,
      grouping,
      level,
      headId: selectedHeadId,
      accountId: selectedAccountId,
    });
    setIsSaveModalOpen(false);
    setConfigName('');
  };

  const handleLoadSavedConfig = (cfg: SavedReportConfig) => {
    setReportType(cfg.reportType);
    setDateRangeType(cfg.dateRangeType);
    if (cfg.fromDate) setFromDate(cfg.fromDate);
    if (cfg.toDate) setToDate(cfg.toDate);
    if (cfg.grouping) setGrouping(cfg.grouping);
    if (cfg.level) setLevel(cfg.level);
    if (cfg.headId) setSelectedHeadId(cfg.headId);
    if (cfg.accountId) setSelectedAccountId(cfg.accountId);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['ক্রমিক', 'তারিখ', 'ভাউচার নং', 'ধরন', 'খাত', 'উপ-খাত', 'দাতা/গ্রহীতা', 'অ্যাকাউন্ট', 'টাকার পরিমাণ'];
    const rows = [
      ...filteredIncomes.map((i, idx) => [
        idx + 1,
        i.date,
        i.voucherNumber,
        'আয় (Income)',
        `"${i.mainHeadNameBn}"`,
        `"${i.subHeadNameBn || ''}"`,
        `"${i.donorName || ''}"`,
        `"${i.accountName}"`,
        i.amount,
      ]),
      ...filteredExpenses.map((e, idx) => [
        idx + 1,
        e.date,
        e.voucherNumber,
        'ব্যয় (Expense)',
        `"${e.mainHeadNameBn}"`,
        `"${e.subHeadNameBn || ''}"`,
        `"${e.payeeName || ''}"`,
        `"${e.accountName}"`,
        e.amount,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Masjid_Report_${reportType}_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                রিপোর্ট সেন্টার (Comprehensive Report Center)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                আর্থিক বিবরণী, ক্যাশবহি, ব্যাংকবহি, দানবাক্স ও সকল প্রশাসনিক মডিউলের মাল্টি-ডাইমেনশনাল কাস্টম রিপোর্ট
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onSaveReportConfig && (
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3.5 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>রিপোর্ট সেভ করুন</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV এক্সপোর্ট</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>রিপোর্ট প্রিন্ট করুন</span>
          </button>
        </div>
      </div>

      {/* Quick Templates Ribbon (Print Hidden) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-2 text-xs">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold">১-ক্লিক দ্রুত রিপোর্ট টেমপ্লেট:</span>
        </div>
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => applyPresetTemplate('CASHBOOK', 'THIS_MONTH', 'DAILY')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
          >
            চলতি মাসের ক্যাশবহি
          </button>
          <button
            onClick={() => applyPresetTemplate('INCOME_EXPENSE_COMBINED', 'LAST_MONTH', 'HEAD')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
          >
            বিগত মাসের আয়-ব্যয়
          </button>
          <button
            onClick={() => applyPresetTemplate('SUMMARY', 'THIS_YEAR', 'MONTHLY')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
          >
            বার্ষিক অডিট সারসংক্ষেপ
          </button>
          <button
            onClick={() => applyPresetTemplate('DONATION_BOX_REPORT', 'THIS_MONTH', 'NONE')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
          >
            দানবাক্স রিপোর্ট
          </button>
          <button
            onClick={() => applyPresetTemplate('STAFF_SALARY_REPORT', 'THIS_MONTH', 'NONE')}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
          >
            স্টাফ বেতন শিট
          </button>
        </div>
      </div>

      {/* Saved Configs Carousel if any */}
      {savedConfigs.length > 0 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-2 overflow-x-auto print:hidden">
          <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center space-x-1">
            <Bookmark className="w-3.5 h-3.5 text-blue-600" />
            <span>সংরক্ষিত রিপোর্টসমূহ:</span>
          </span>
          {savedConfigs.map((cfg) => (
            <div
              key={cfg.id}
              className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-800 shrink-0 hover:bg-blue-50 transition-colors"
            >
              <button onClick={() => handleLoadSavedConfig(cfg)} className="hover:text-blue-700">
                {cfg.name}
              </button>
              {onDeleteReportConfig && (
                <button
                  onClick={() => onDeleteReportConfig(cfg.id)}
                  className="text-slate-400 hover:text-rose-600 p-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filter Matrix Configuration Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Report Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">রিপোর্টের ধরন (Report Type)</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  [{rt.category}] {rt.labelBn}
                </option>
              ))}
            </select>
          </div>

          {/* Period Range Preset */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">সময়কাল নির্ধারণ</label>
            <select
              value={dateRangeType}
              onChange={(e) => handleRangePreset(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="THIS_MONTH">চলতি মাস (This Month)</option>
              <option value="LAST_MONTH">বিগত মাস (Last Month)</option>
              <option value="TODAY">আজ (Today)</option>
              <option value="THIS_YEAR">চলতি বছর (This Year)</option>
              <option value="LAST_YEAR">বিগত বছর (Last Year)</option>
              <option value="CUSTOM">কাস্টম তারিখ সীমা (Custom Range)</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ হতে (From Date)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDateRangeType('CUSTOM');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ পর্যন্ত (To Date)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDateRangeType('CUSTOM');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Secondary Filter Row: Grouping, Level, Head, Account */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">গ্রুপিং (Grouping)</label>
            <select
              value={grouping}
              onChange={(e) => setGrouping(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden"
            >
              <option value="HEAD">প্রধান খাত অনুযায়ী (By Main Head)</option>
              <option value="DAILY">দৈনিক ভিত্তিতে (Daily)</option>
              <option value="MONTHLY">মাসিক ভিত্তিতে (Monthly)</option>
              <option value="ACCOUNT">অ্যাকাউন্ট ভিত্তিক (By Account)</option>
              <option value="NONE">কোনো গ্রুপিং নেই (Flat List)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">বিস্তারিত স্তর (Level)</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden"
            >
              <option value="DETAILED">বিস্তারিত ভাউচার সহ (Detailed)</option>
              <option value="SUMMARY">সংক্ষিপ্ত সারসংক্ষেপ (Summary Only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">নির্দিষ্ট হিসাব খাত</label>
            <select
              value={selectedHeadId}
              onChange={(e) => setSelectedHeadId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden"
            >
              <option value="ALL">সকল প্রধান খাত</option>
              {accountHeads
                .filter((h) => !h.parentId)
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    [{h.type === 'INCOME' ? 'আয়' : 'ব্যয়'}] {h.nameBn}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">নির্দিষ্ট ব্যাংক/ক্যাশ</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-hidden"
            >
              <option value="ALL">সকল ফান্ড ও অ্যাকাউন্ট</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nameBn} ({a.accountType === 'CASH' ? 'ক্যাশ' : 'ব্যাংক'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ----------------- REPORT RENDER AREA ----------------- */}

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
        <h1 className="text-2xl font-black text-slate-900">{currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}</h1>
        <p className="text-xs text-slate-600">{currentMosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬'}</p>
        <div className="my-3 py-1.5 px-4 bg-slate-100 border border-slate-300 inline-block font-bold text-sm">
          {REPORT_TYPES.find((r) => r.id === reportType)?.labelBn || reportType}
        </div>
        <div className="flex justify-between text-xs text-slate-600 font-medium">
          <span>সময়সীমা: {formatDate(fromDate)} হতে {formatDate(toDate)}</span>
          <span>প্রিন্টের সময়: {new Date().toLocaleString('bn-BD')}</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">মোট অর্জিত আয় (Income)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-800 mt-2 block font-mono">
            ৳ {totalIncome.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            {filteredIncomes.length} টি অনুমোদিত ভাউচার
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">মোট পরিশোধিত ব্যয় (Expense)</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-800 mt-2 block font-mono">
            ৳ {totalExpense.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-rose-600 mt-0.5 block">
            {filteredExpenses.length} টি অনুমোদিত ভাউচার
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">নিট উদ্বৃত্ত / ঘাটতি (Net Balance)</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <span
            className={`text-2xl font-black mt-2 block font-mono ${
              netSurplus >= 0 ? 'text-blue-900' : 'text-rose-700'
            }`}
          >
            ৳ {netSurplus.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-blue-700 mt-0.5 block">
            {netSurplus >= 0 ? 'উদ্বৃত্ত তহবিল' : 'ঘাটতি'}
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts (Hidden on standard compact print) */}
      {(incomeChartData.length > 0 || expenseChartData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
          {incomeChartData.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center space-x-1.5">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>খাতভিত্তিক আয় পাই-চার্ট</span>
              </h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={incomeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {incomeChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `৳ ${value.toLocaleString('en-IN')}`} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expenseChartData.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center space-x-1.5">
                <BarChart3 className="w-4 h-4 text-rose-600" />
                <span>খাতভিত্তিক ব্যয় বার-চার্ট</span>
              </h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => `৳ ${value.toLocaleString('en-IN')}`} />
                    <Bar dataKey="value" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Head-wise Summary Breakdown Table */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            খাতভিত্তিক আয় ও ব্যয়ের সংকলন (Head-wise Financial Breakdown)
          </h3>
          <span className="text-xs font-mono text-slate-500">
            সময়: {formatDate(fromDate)} — {formatDate(toDate)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Income Breakdown */}
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>আয়ের খাতসমূহ (Income Heads)</span>
              <span className="font-mono">মোট: ৳ {totalIncome.toLocaleString('en-IN')}</span>
            </h4>
            <div className="space-y-2">
              {Object.keys(headWiseIncome).length === 0 ? (
                <p className="text-xs text-slate-400 italic">কোনো আয় রেকর্ড পাওয়া যায়নি</p>
              ) : (
                Object.values(headWiseIncome).map((h) => {
                  const pct = totalIncome > 0 ? (h.amount / totalIncome) * 100 : 0;
                  return (
                    <div key={h.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{h.name}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ৳ {h.amount.toLocaleString('en-IN')} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
              <span>ব্যয়ের খাতসমূহ (Expense Heads)</span>
              <span className="font-mono">মোট: ৳ {totalExpense.toLocaleString('en-IN')}</span>
            </h4>
            <div className="space-y-2">
              {Object.keys(headWiseExpense).length === 0 ? (
                <p className="text-xs text-slate-400 italic">কোনো ব্যয় রেকর্ড পাওয়া যায়নি</p>
              ) : (
                Object.values(headWiseExpense).map((h) => {
                  const pct = totalExpense > 0 ? (h.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={h.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{h.name}</span>
                        <span className="font-mono font-bold text-rose-700">
                          ৳ {h.amount.toLocaleString('en-IN')} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-600 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Detailed Transactions List if level === 'DETAILED' */}
        {level === 'DETAILED' && (
          <div className="border-t border-slate-200">
            <div className="p-3.5 bg-slate-100 font-bold text-xs text-slate-800">
              বিস্তারিত অনুমোদিত লেনদেন তালিকা (Approved Line Items)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">ভাউচার নং</th>
                    <th className="py-2.5 px-3">ধরন</th>
                    <th className="py-2.5 px-3">খাত ও বিবরণ</th>
                    <th className="py-2.5 px-3">দাতা / গ্রহীতা</th>
                    <th className="py-2.5 px-3">অ্যাকাউন্ট</th>
                    <th className="py-2.5 px-3 text-right">টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredIncomes.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(i.date)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{i.voucherNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                          আয়
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900">{i.mainHeadNameBn}</span>
                        {i.subHeadNameBn && <span className="text-slate-500"> ({i.subHeadNameBn})</span>}
                        {i.description && <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{i.description}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{i.donorName || 'সাধারণ দানশীল'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{i.accountName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ৳ {i.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}

                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(e.date)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{e.voucherNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                          ব্যয়
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900">{e.mainHeadNameBn}</span>
                        {e.subHeadNameBn && <span className="text-slate-500"> ({e.subHeadNameBn})</span>}
                        {e.description && <p className="text-[10px] text-slate-400 italic truncate max-w-xs">{e.description}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{e.payeeName || 'ভেন্ডর'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{e.accountName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        ৳ {e.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Print Signatures */}
        <div className="hidden print:grid grid-cols-3 gap-8 pt-16 px-6 pb-6 text-center text-xs">
          <div className="border-t border-slate-400 pt-2 font-bold">হিসাবরক্ষক / প্রস্তুতকারী</div>
          <div className="border-t border-slate-400 pt-2 font-bold">কোষাধ্যক্ষ</div>
          <div className="border-t border-slate-400 pt-2 font-bold">সভাপতি / সাধারণ সম্পাদক</div>
        </div>
      </div>

      {/* Save Config Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">এই রিপোর্ট কনফিগারেশন সংরক্ষণ করুন</h3>
            <p className="text-xs text-slate-500">
              পরবর্তীতে ১-ক্লিকে এই ফিল্টার ও সেটিংসের রিপোর্ট লোড করার জন্য একটি নাম দিন।
            </p>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="যেমন: মাসিক অডিট ও ব্যালেন্স রিপোর্ট"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

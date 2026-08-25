import React, { useState } from 'react';
import {
  FileText,
  Bookmark,
  Trash2,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building,
  Printer,
  Download,
  Sparkles,
  Eye,
  CheckCircle2,
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
  User,
} from '../types';
import { Language, translations } from '../lib/i18n';
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
import { ReportPrintDocument, REPORT_TITLES } from './ReportPrintDocument';

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
  currentUser?: User | null;
  savedConfigs?: SavedReportConfig[];
  onSaveReportConfig?: (config: Omit<SavedReportConfig, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteReportConfig?: (id: string) => Promise<void>;
  language?: Language;
}

const REPORT_TYPES = [
  { id: 'SUMMARY', labelBn: 'আর্থিক সারসংক্ষেপ (Executive Summary)', category: 'আর্থিক' },
  { id: 'DAILY_STATEMENT', labelBn: 'দৈনিক লেনদেন বিবরণী ও চলমান লেজার (Daily Ledger)', category: 'আর্থিক' },
  { id: 'INCOME_STATEMENT', labelBn: 'আয় বিবরণী (Income Statement)', category: 'আর্থিক' },
  { id: 'EXPENSE_STATEMENT', labelBn: 'ব্যয় বিবরণী (Expense Statement)', category: 'আর্থিক' },
  { id: 'INCOME_EXPENSE_COMBINED', labelBn: 'আয় ও ব্যয় যৌথ বিবরণী (Income & Expense Statement)', category: 'আর্থিক' },
  { id: 'CASHBOOK', labelBn: 'নগদ বহি (Cashbook Ledger)', category: 'আর্থিক' },
  { id: 'BANKBOOK', labelBn: 'ব্যাংক বহি ও স্টেটমেন্ট (Bankbook)', category: 'আর্থিক' },
  { id: 'CASH_BANK_COMBINED', labelBn: 'ক্যাশ ও ব্যাংক যৌথ সমন্বিত বিবরণী', category: 'আর্থিক' },
  { id: 'HEADWISE_LEDGER', labelBn: 'খাতভিত্তিক লেজার (Head-wise Ledger)', category: 'আর্থিক' },
  { id: 'MONTHLY_SUMMARY', labelBn: 'মাসভিত্তিক তুলনামূলক আর্থিক প্রতিবেদন', category: 'আর্থিক' },
  { id: 'DONATION_SUMMARY', labelBn: 'দান ও অনুদান সংকলন প্রতিবেদন', category: 'দান ও কালেকশন' },
  { id: 'DONATION_BOX_REPORT', labelBn: 'দানবাক্স কালেকশন ও স্ট্যাটাস রিপোর্ট', category: 'দান ও কালেকশন' },
  { id: 'JUMA_COLLECTION_REPORT', labelBn: 'জুমার কালেকশন রেজিস্টার', category: 'দান ও কালেকশন' },
  { id: 'STAFF_SALARY_REPORT', labelBn: 'স্টাফ ও বেতন বিবরণী (Staff Salary Sheet)', category: 'প্রশাসন' },
  { id: 'ASSET_REGISTER_REPORT', labelBn: 'সম্পদ রেজিস্ট্রি প্রতিবেদন (Asset Register)', category: 'প্রশাসন' },
  { id: 'PROPERTY_REGISTER_REPORT', labelBn: 'ওয়াকফ ও সম্পত্তি রেজিস্ট্রি (Property Register)', category: 'প্রশাসন' },
  { id: 'CEMETERY_REGISTER_REPORT', labelBn: 'কবরস্থান রেজিস্ট্রি প্রতিবেদন (Cemetery)', category: 'প্রশাসন' },
  { id: 'COMMITTEE_REPORT', labelBn: 'কমিটি ও সভার কার্যবিবরণী রিপোর্ট', category: 'প্রশাসন' },
  { id: 'AUDIT_LOG_REPORT', labelBn: 'সিস্টেম অডিট ট্রেইল ও নিরাপত্তা লগ (Audit Trail)', category: 'নিরাপত্তা' },
];

const CHART_COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#475569'];

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
  currentUser,
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
  const [showCharts, setShowCharts] = useState<boolean>(false);

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

  // Filtered dataset calculations for screen charts
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
    const key = i.mainHeadId || 'other';
    if (!headWiseIncome[key]) {
      headWiseIncome[key] = { name: i.mainHeadNameBn || 'অন্যান্য', amount: 0 };
    }
    headWiseIncome[key].amount += i.amount;
  });

  const headWiseExpense: Record<string, { name: string; amount: number }> = {};
  filteredExpenses.forEach((e) => {
    const key = e.mainHeadId || 'other';
    if (!headWiseExpense[key]) {
      headWiseExpense[key] = { name: e.mainHeadNameBn || 'অন্যান্য', amount: 0 };
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

  const currentReportMeta = REPORT_TITLES[reportType] || {
    titleBn: reportType,
    subtitleBn: '',
    isLandscape: false,
  };

  return (
    <div className="report-center-container space-y-5 max-w-7xl mx-auto pb-12 font-baloo">
      {/* ============================================================
          1. TOP BANNER & ACTION BAR (PRINT HIDDEN)
          ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black font-siliguri text-slate-900 tracking-tight">
                রিপোর্ট সেন্টার (Report Center)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                আর্থিক বিবরণী, ক্যাশবহি, ব্যাংক স্টেটমেন্ট ও সকল প্রশাসনিক মডিউলের প্রমিত A4 প্রিন্ট উপযোগী প্রতিবেদন
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {onSaveReportConfig && (
            <button
              id="btn-save-report-config"
              onClick={() => setIsSaveModalOpen(true)}
              className="px-3.5 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>কনফিগ সংরক্ষণ</span>
            </button>
          )}

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV এক্সপোর্ট</span>
          </button>

          <button
            id="btn-toggle-charts"
            onClick={() => setShowCharts((prev) => !prev)}
            className={`px-3.5 py-2 border text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer ${
              showCharts ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showCharts ? 'গ্রাফ লুকান' : 'গ্রাফ দেখুন'}</span>
          </button>

          <button
            id="btn-print-report-main"
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-siliguri rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>রিপোর্ট প্রিন্ট করুন (A4)</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          2. 1-CLICK QUICK TEMPLATES RIBBON (PRINT HIDDEN)
          ============================================================ */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-2 text-xs">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold font-siliguri">১-ক্লিক দ্রুত রিপোর্ট টেমপ্লেট:</span>
        </div>
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => applyPresetTemplate('CASHBOOK', 'THIS_MONTH', 'DAILY')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            চলতি মাসের ক্যাশবহি
          </button>
          <button
            onClick={() => applyPresetTemplate('INCOME_EXPENSE_COMBINED', 'LAST_MONTH', 'HEAD')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            বিগত মাসের আয়-ব্যয় যৌথ
          </button>
          <button
            onClick={() => applyPresetTemplate('SUMMARY', 'THIS_YEAR', 'MONTHLY')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            বার্ষিক আর্থিক নিরীক্ষা
          </button>
          <button
            onClick={() => applyPresetTemplate('BANKBOOK', 'THIS_MONTH', 'NONE')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            ব্যাংক স্টেটমেন্ট
          </button>
          <button
            onClick={() => applyPresetTemplate('DONATION_BOX_REPORT', 'THIS_MONTH', 'NONE')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            দানবাক্স রিপোর্ট
          </button>
          <button
            onClick={() => applyPresetTemplate('STAFF_SALARY_REPORT', 'THIS_MONTH', 'NONE')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            স্টাফ বেতন শিট
          </button>
          <button
            onClick={() => applyPresetTemplate('AUDIT_LOG_REPORT', 'THIS_MONTH', 'NONE')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            অডিট ট্রেইল লগ
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
              <button onClick={() => handleLoadSavedConfig(cfg)} className="hover:text-blue-700 cursor-pointer">
                {cfg.name}
              </button>
              {onDeleteReportConfig && (
                <button
                  onClick={() => onDeleteReportConfig(cfg.id)}
                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============================================================
          3. FILTER MATRIX CONFIGURATION BAR (PRINT HIDDEN)
          ============================================================ */}
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
              <option value="TODAY">আজকের হিসাব (Today)</option>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">নির্দিষ্ট ব্যাংক/ক্যাশ ফান্ড</label>
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

      {/* ============================================================
          4. OPTIONAL SCREEN-ONLY GRAPHICAL INSIGHTS (PRINT HIDDEN)
          ============================================================ */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold font-siliguri text-slate-800 mb-3 flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>আয়ের খাতসমূহের অনুপাত (Income Distribution)</span>
            </h4>
            <div className="h-56">
              {incomeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={incomeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {incomeChartData.map((entry, index) => (
                        <Cell key={`cell-inc-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => `৳ ${Number(val).toLocaleString('en-IN')}`} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  কোনো তথ্য পাওয়া যায়নি
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold font-siliguri text-slate-800 mb-3 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              <span>ব্যয়ের প্রধান খাতসমূহ (Top Expense Heads)</span>
            </h4>
            <div className="h-56">
              {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => `৳ ${Number(val).toLocaleString('en-IN')}`} />
                    <Bar dataKey="value" name="ব্যয়" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  কোনো তথ্য পাওয়া যায়নি
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          5. REPORT PREVIEW CARD & PRINT DOCUMENT RENDER
          ============================================================ */}
      <div className="bg-slate-200/70 p-2 sm:p-6 rounded-2xl border border-slate-300 shadow-inner">
        {/* Preview Control Bar (Print Hidden) */}
        <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs mb-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold font-siliguri text-slate-800">
              অফিসিয়াল প্রিন্ট প্রিভিউ ({currentReportMeta.isLandscape ? 'A4 ল্যান্ডস্কেপ' : 'A4 পোর্ট্রেট'})
            </span>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-siliguri">
              প্রিন্ট রেডি
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-siliguri px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

        {/* The Official Printable Document Canvas */}
        <div className="bg-white shadow-xl rounded-none border border-slate-300 overflow-x-auto">
          <ReportPrintDocument
            reportType={reportType}
            dateRangeType={dateRangeType}
            fromDate={fromDate}
            toDate={toDate}
            grouping={grouping}
            level={level}
            selectedHeadId={selectedHeadId}
            selectedAccountId={selectedAccountId}
            currentMosque={currentMosque}
            currentUser={currentUser}
            incomes={incomes}
            expenses={expenses}
            accounts={accounts}
            accountHeads={accountHeads}
            donationBoxes={donationBoxes}
            boxCollections={boxCollections}
            staffList={staffList}
            staffPayments={staffPayments}
            assets={assets}
            properties={properties}
            cemeteryRecords={cemeteryRecords}
            committeeMembers={committeeMembers}
            meetings={meetings}
            notices={notices}
            auditLogs={auditLogs}
          />
        </div>
      </div>

      {/* Save Config Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 font-baloo">
            <h3 className="text-base font-bold font-siliguri text-slate-900">এই রিপোর্ট কনফিগারেশন সংরক্ষণ করুন</h3>
            <p className="text-xs text-slate-500">
              পরবর্তীতে ১-ক্লিকে এই ফিল্টার ও সেটিংসের রিপোর্ট লোড করার জন্য একটি পরিচিত নাম দিন।
            </p>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="যেমন: মাসিক অডিট ও ব্যালেন্স রিপোর্ট"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500 font-baloo"
              />
              <div className="flex items-center justify-end space-x-2 font-siliguri">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
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

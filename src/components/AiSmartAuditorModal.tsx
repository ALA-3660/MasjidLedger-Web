import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  Printer,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  FileText,
  Send,
  Search,
  Building2,
  Coins,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { Mosque, User } from '../types';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { OfficialReportSignatures } from './common/OfficialReportSignatures';

interface DuplicateAlertItem {
  id: string;
  severity: 'HIGH' | 'MEDIUM';
  entryType: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  headNameBn: string;
  voucherNumbers: string[];
  parties: string[];
  reasonBn: string;
  count: number;
}

interface HeadComparisonItem {
  type: 'INCOME' | 'EXPENSE';
  headNameBn: string;
  previousMonthAmount: number;
  currentMonthAmount: number;
  diffAmount: number;
  percentChange: number | null;
  status: 'INCREASED' | 'DECREASED' | 'UNCHANGED' | 'NEW';
  isConcern: boolean;
}

interface SmartAuditResponse {
  generatedAt: string;
  periodLabelBn: string;
  currentMonthLabelBn: string;
  prevMonthLabelBn: string;
  mosqueInfo: {
    nameBn: string;
    address: string;
    phone: string;
    waqfEstateName: string;
  };
  summaryMetrics: {
    totalIncome: number;
    totalExpense: number;
    netSurplus: number;
    currentMonthIncome: number;
    prevMonthIncome: number;
    currentMonthExpense: number;
    prevMonthExpense: number;
    currentMonthSurplus: number;
    cashBalance: number;
    bankBalance: number;
    currentBalance: number;
    approvedIncomeCount: number;
    approvedExpenseCount: number;
  };
  jumaStats: {
    currentMonthTotal: number;
    prevMonthTotal: number;
    currentMonthCount: number;
    allTimeTotal: number;
  };
  waqfRentStats: {
    totalProperties: number;
    currentMonthRentTotal: number;
    prevMonthRentTotal: number;
    currentYearRentTotal: number;
  };
  duplicateAlerts: DuplicateAlertItem[];
  headComparisons: HeadComparisonItem[];
  aiAnalysis: {
    executiveSummaryBn: string;
    duplicateReviewBn: string;
    trendAnalysisBn: string;
    keyFindingsBn: string[];
    recommendationsBn: string[];
    customAnswerBn?: string;
  };
}

interface AiSmartAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMosque: Mosque | null;
  currentUser?: User | null;
  language?: 'bn' | 'en';
}

type AuditTab = 'summary' | 'duplicates' | 'comparison';

const fmtTaka = (n: number | undefined | null) =>
  `৳ ${Math.round(Number(n || 0)).toLocaleString('bn-BD')}`;

const fmtPct = (pct: number | null) => {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'নতুন';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toLocaleString('bn-BD')}%`;
};

export const AiSmartAuditorModal: React.FC<AiSmartAuditorModalProps> = ({
  isOpen,
  onClose,
  currentMosque,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<AuditTab>('summary');
  const [auditData, setAuditData] = useState<SmartAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [compFilter, setCompFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'CONCERN'>('ALL');

  const runAudit = useCallback(async (questionText?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.runAiSmartAudit(questionText);
      setAuditData(data);
    } catch (err: any) {
      setError(err?.message || 'AI অডিট বিশ্লেষণ লোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !auditData && !isLoading) {
      runAudit();
    }
  }, [isOpen, auditData, isLoading, runAudit]);

  const handleAskCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isLoading) return;
    setActiveTab('summary');
    await runAudit(customQuestion.trim());
  };

  const handlePrintAuditReport = async () => {
    if (!auditData) return;
    setIsPrinting(true);
    try {
      await printElement('printable-ai-audit-report', {
        title: `AI অডিট প্রতিবেদন - ${currentMosque?.nameBn || auditData.mosqueInfo.nameBn}`,
        pageSize: 'A4',
        pageOrientation: 'portrait',
        margin: '10mm 12mm',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  const highAlertsCount =
    auditData?.duplicateAlerts.filter((a) => a.severity === 'HIGH').length || 0;
  const totalAlertsCount = auditData?.duplicateAlerts.length || 0;
  const concernHeadsCount =
    auditData?.headComparisons.filter((h) => h.isConcern).length || 0;

  const filteredComparisons = (auditData?.headComparisons || []).filter((item) => {
    if (compFilter === 'INCOME') return item.type === 'INCOME';
    if (compFilter === 'EXPENSE') return item.type === 'EXPENSE';
    if (compFilter === 'CONCERN') return item.isConcern;
    return true;
  });

  const todayBn = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-siliguri">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-emerald-900/15 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Header */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#0f766e] px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">
                AI হিসাব সহকারী ও স্মার্ট অডিটর
              </h2>
              <p className="text-xs text-emerald-100/90 truncate">
                {currentMosque?.nameBn || auditData?.mosqueInfo.nameBn || 'মসজিদ লেজার'} • প্রকৃত আয়-ব্যয়, জুমা ও ওয়াকফ ভাড়ার স্বয়ংক্রিয় নিরীক্ষা
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runAudit(customQuestion.trim() || undefined)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold transition border border-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>পুনরায় বিশ্লেষণ</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAuditReport}
              disabled={!auditData || isLoading || isPrinting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>অডিট রিপোর্ট প্রিন্ট (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="p-2 rounded-xl hover:bg-white/15 text-white/90 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-5 pt-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'border-emerald-700 text-emerald-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-emerald-800 hover:bg-slate-100/80'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>অডিট সারসংক্ষেপ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('duplicates')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition whitespace-nowrap ${
                activeTab === 'duplicates'
                  ? 'border-emerald-700 text-emerald-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-emerald-800 hover:bg-slate-100/80'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 ${
                  highAlertsCount > 0
                    ? 'text-rose-600'
                    : totalAlertsCount > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              />
              <span>ডাবল এন্ট্রি ও সন্দেহজনক ভাউচার</span>
              {auditData && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                    totalAlertsCount > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {totalAlertsCount.toLocaleString('bn-BD')}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition whitespace-nowrap ${
                activeTab === 'comparison'
                  ? 'border-emerald-700 text-emerald-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-emerald-800 hover:bg-slate-100/80'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>গত মাস বনাম চলতি মাস</span>
              {auditData && concernHeadsCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-800">
                  {concernHeadsCount.toLocaleString('bn-BD')} সতর্কতা
                </span>
              )}
            </button>
          </div>

          {auditData && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>সময়কাল: {auditData.periodLabelBn}</span>
            </div>
          )}
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/40">
          {/* Loading State */}
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-700 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-bold text-slate-800">
                  মসজিদের প্রকৃত হিসাব ও ভাউচার নিরীক্ষা চলছে...
                </h3>
                <p className="text-sm text-slate-500">
                  সকল অনুমোদিত আয়-ব্যয়, জুমার কালেকশন, ওয়াকফ ভাড়া, ডাবল এন্ট্রি ও মাসভিত্তিক পরিবর্তন বিশ্লেষণ করা হচ্ছে।
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h3 className="font-bold text-rose-900">AI অডিট সম্পন্ন করা যায়নি</h3>
                <p className="text-sm text-rose-800">{error}</p>
                <button
                  type="button"
                  onClick={() => runAudit()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  পুনরায় চেষ্টা করুন
                </button>
              </div>
            </div>
          )}

          {/* Loaded Content */}
          {!isLoading && auditData && (
            <>
              {/* Real-Time KPI Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>চলতি মাসের আয়</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-800 mt-1">
                    {fmtTaka(auditData.summaryMetrics.currentMonthIncome)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    গত মাস: {fmtTaka(auditData.summaryMetrics.prevMonthIncome)}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>চলতি মাসের ব্যয়</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-rose-700 mt-1">
                    {fmtTaka(auditData.summaryMetrics.currentMonthExpense)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    গত মাস: {fmtTaka(auditData.summaryMetrics.prevMonthExpense)}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>জুমার কালেকশন (চলতি মাস)</span>
                    <Coins className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {fmtTaka(auditData.jumaStats.currentMonthTotal)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    গত মাস: {fmtTaka(auditData.jumaStats.prevMonthTotal)}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>ওয়াকফ ভাড়া আদায় (চলতি মাস)</span>
                    <Building2 className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-teal-800 mt-1">
                    {fmtTaka(auditData.waqfRentStats.currentMonthRentTotal)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    মোট স্থিতি: {fmtTaka(auditData.summaryMetrics.currentBalance)}
                  </div>
                </div>
              </div>

              {/* TAB 1: AUDIT SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {/* Custom Question Box */}
                  <form
                    onSubmit={handleAskCustomQuestion}
                    className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs flex flex-col sm:flex-row gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="বিশেষ কোনো অডিট প্রশ্ন করুন (যেমন: বিদ্যুৎ বিল বা রক্ষণাবেক্ষণ ব্যয় বাড়ার কারণ বিশ্লেষণ করো)..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!customQuestion.trim() || isLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold transition disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>বিশ্লেষণ করুন</span>
                    </button>
                  </form>

                  {/* Custom Answer Highlight */}
                  {auditData.aiAnalysis.customAnswerBn && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>আপনার বিশেষ প্রশ্নের উত্তর</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                        {auditData.aiAnalysis.customAnswerBn}
                      </p>
                    </div>
                  )}

                  {/* Executive Summary */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-base font-bold text-slate-900">
                          মসজিদ কমিটির জন্য নির্বাহী অডিট সারসংক্ষেপ
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        মোট নগদ ও ব্যাংক: {fmtTaka(auditData.summaryMetrics.currentBalance)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {auditData.aiAnalysis.executiveSummaryBn}
                    </p>
                  </div>

                  {/* Findings & Recommendations 2-Column Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                        <Info className="w-4 h-4 text-sky-600" />
                        মূল অডিট পর্যবেক্ষণসমূহ
                      </h4>
                      <ul className="space-y-2.5">
                        {(auditData.aiAnalysis.keyFindingsBn || []).map((finding, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed"
                          >
                            <span className="w-5 h-5 rounded-md bg-sky-50 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-sky-200">
                              {(idx + 1).toLocaleString('bn-BD')}
                            </span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-emerald-200/80 p-5 shadow-2xs space-y-3">
                      <h4 className="font-bold text-emerald-950 flex items-center gap-2 text-sm border-b border-emerald-100 pb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        কমিটির করণীয় ও পরামর্শ
                      </h4>
                      <ul className="space-y-2.5">
                        {(auditData.aiAnalysis.recommendationsBn || []).map((rec, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed"
                          >
                            <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                              {(idx + 1).toLocaleString('bn-BD')}
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DUPLICATE & SUSPICIOUS VOUCHERS */}
              {activeTab === 'duplicates' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      ডাবল এন্ট্রি ও সন্দেহজনক ভাউচারের ওপর অডিটর মন্তব্য
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {auditData.aiAnalysis.duplicateReviewBn}
                    </p>
                  </div>

                  {auditData.duplicateAlerts.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-2">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                      <h3 className="text-base font-bold text-emerald-950">
                        কোনো সন্দেহজনক ডাবল এন্ট্রি পাওয়া যায়নি
                      </h3>
                      <p className="text-sm text-emerald-800 max-w-md mx-auto">
                        সকল অনুমোদিত আয় ও ব্যয়ের ভাউচার যাচাই করা হয়েছে। একই তারিখে একই টাকার পুনরাবৃত্তি বা সন্দেহজনক ভাউচার শনাক্ত হয়নি।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditData.duplicateAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`rounded-xl border p-4 bg-white shadow-2xs ${
                            alert.severity === 'HIGH'
                              ? 'border-rose-300 bg-rose-50/30'
                              : 'border-amber-300 bg-amber-50/30'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    alert.severity === 'HIGH'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-amber-500 text-white'
                                  }`}
                                >
                                  {alert.severity === 'HIGH' ? 'উচ্চ ঝুঁকি' : 'যাচাই প্রয়োজন'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    alert.entryType === 'EXPENSE'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {alert.entryType === 'EXPENSE' ? 'ব্যয় ভাউচার' : 'আয় রসিদ'}
                                </span>
                                <span className="text-xs font-semibold text-slate-600">
                                  তারিখ: {alert.date}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm">
                                {alert.headNameBn} — {alert.count.toLocaleString('bn-BD')}টি ভাউচার
                              </h4>
                              <p className="text-xs text-slate-700">{alert.reasonBn}</p>
                            </div>

                            <div className="text-right">
                              <div className="text-base font-black text-slate-900">
                                {fmtTaka(alert.amount)}
                              </div>
                              <div className="text-[11px] text-slate-500">প্রতি ভাউচারে</div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap gap-2 text-xs">
                            <span className="font-semibold text-slate-600">ভাউচার নং:</span>
                            {alert.voucherNumbers.map((vn) => (
                              <span
                                key={vn}
                                className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-800"
                              >
                                {vn}
                              </span>
                            ))}
                            {alert.parties.length > 0 && (
                              <span className="text-slate-600 ml-auto">
                                প্রাপক/দাতা: <strong>{alert.parties.join(', ')}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MONTH-OVER-MONTH COMPARISON */}
              {activeTab === 'comparison' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-700" />
                      {auditData.prevMonthLabelBn} বনাম {auditData.currentMonthLabelBn} — তুলনামূলক বিশ্লেষণ
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {auditData.aiAnalysis.trendAnalysisBn}
                    </p>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'ALL', label: 'সকল খাত' },
                      { id: 'CONCERN', label: 'সতর্কতা (আয় হ্রাস / ব্যয় বৃদ্ধি)' },
                      { id: 'INCOME', label: 'শুধু আয়ের খাত' },
                      { id: 'EXPENSE', label: 'শুধু ব্যয়ের খাত' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setCompFilter(btn.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          compFilter === btn.id
                            ? 'bg-emerald-800 text-white border-emerald-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">ধরণ</th>
                            <th className="px-4 py-3">হিসাবের খাত</th>
                            <th className="px-4 py-3 text-right">{auditData.prevMonthLabelBn}</th>
                            <th className="px-4 py-3 text-right">{auditData.currentMonthLabelBn}</th>
                            <th className="px-4 py-3 text-right">পার্থক্য</th>
                            <th className="px-4 py-3 text-center">পরিবর্তন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredComparisons.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                                এই ফিল্টারে কোনো খাত পাওয়া যায়নি।
                              </td>
                            </tr>
                          ) : (
                            filteredComparisons.map((item, idx) => (
                              <tr
                                key={`${item.type}-${item.headNameBn}-${idx}`}
                                className={item.isConcern ? 'bg-amber-50/40' : 'hover:bg-slate-50'}
                              >
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      item.type === 'INCOME'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {item.type === 'INCOME' ? 'আয়' : 'ব্যয়'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                  {item.headNameBn}
                                  {item.isConcern && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                      লক্ষণীয়
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-600">
                                  {fmtTaka(item.previousMonthAmount)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                  {fmtTaka(item.currentMonthAmount)}
                                </td>
                                <td
                                  className={`px-4 py-2.5 text-right font-bold ${
                                    item.diffAmount > 0
                                      ? item.type === 'EXPENSE'
                                        ? 'text-rose-700'
                                        : 'text-emerald-700'
                                      : item.diffAmount < 0
                                      ? item.type === 'INCOME'
                                        ? 'text-amber-700'
                                        : 'text-emerald-700'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {item.diffAmount > 0 ? '+' : ''}
                                  {fmtTaka(item.diffAmount)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                                      item.isConcern
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {item.diffAmount > 0 ? (
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    ) : item.diffAmount < 0 ? (
                                      <ArrowDownRight className="w-3.5 h-3.5" />
                                    ) : null}
                                    {fmtPct(item.percentChange)}
                                  </span>
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
            </>
          )}
        </div>

        {/* Hidden Printable A4 Audit Summary Report */}
        {auditData && (
          <div className="hidden">
            <div
              id="printable-ai-audit-report"
              className="bg-white text-slate-900 p-4 font-siliguri max-w-[210mm] mx-auto"
            >
              <MosqueOfficialLetterhead
                mosque={currentMosque}
                documentTitle="AI স্মার্ট আর্থিক অডিট সারসংক্ষেপ"
                subTitle="মসজিদ কমিটির পর্যালোচনার জন্য প্রস্তুতকৃত"
                periodLabel={auditData.periodLabelBn}
                dateStr={todayBn}
              />

              {/* KPI Table */}
              <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                  <div className="text-slate-600">চলতি মাসের আয়</div>
                  <div className="text-sm font-bold text-emerald-900 mt-0.5">
                    {fmtTaka(auditData.summaryMetrics.currentMonthIncome)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    গত মাস: {fmtTaka(auditData.summaryMetrics.prevMonthIncome)}
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                  <div className="text-slate-600">চলতি মাসের ব্যয়</div>
                  <div className="text-sm font-bold text-rose-800 mt-0.5">
                    {fmtTaka(auditData.summaryMetrics.currentMonthExpense)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    গত মাস: {fmtTaka(auditData.summaryMetrics.prevMonthExpense)}
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                  <div className="text-slate-600">জুমার কালেকশন (চলতি মাস)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {fmtTaka(auditData.jumaStats.currentMonthTotal)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ওয়াকফ ভাড়া: {fmtTaka(auditData.waqfRentStats.currentMonthRentTotal)}
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                  <div className="text-slate-600">বর্তমান মোট স্থিতি</div>
                  <div className="text-sm font-bold text-emerald-900 mt-0.5">
                    {fmtTaka(auditData.summaryMetrics.currentBalance)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ক্যাশ: {fmtTaka(auditData.summaryMetrics.cashBalance)}
                  </div>
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-emerald-950 border-b border-emerald-800 pb-1 mb-2">
                  ১. নির্বাহী অডিট সারসংক্ষেপ
                </h3>
                <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                  {auditData.aiAnalysis.executiveSummaryBn}
                </p>
              </div>

              {/* 2. Duplicate Review */}
              <div className="mb-4 break-inside-avoid">
                <h3 className="text-sm font-bold text-emerald-950 border-b border-emerald-800 pb-1 mb-2">
                  ২. ডাবল এন্ট্রি ও সন্দেহজনক ভাউচার যাচাই ({auditData.duplicateAlerts.length.toLocaleString('bn-BD')}টি সতর্কতা)
                </h3>
                <p className="text-xs leading-relaxed text-slate-800 mb-2">
                  {auditData.aiAnalysis.duplicateReviewBn}
                </p>
                {auditData.duplicateAlerts.length > 0 && (
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1 text-left">তারিখ</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">ধরণ ও খাত</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">ভাউচারসমূহ</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditData.duplicateAlerts.slice(0, 10).map((a) => (
                        <tr key={a.id}>
                          <td className="border border-slate-300 px-2 py-1">{a.date}</td>
                          <td className="border border-slate-300 px-2 py-1">
                            ({a.entryType === 'EXPENSE' ? 'ব্যয়' : 'আয়'}) {a.headNameBn}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            {a.voucherNumbers.join(', ')}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                            {fmtTaka(a.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 3. Month-over-Month Comparison */}
              <div className="mb-4 break-inside-avoid">
                <h3 className="text-sm font-bold text-emerald-950 border-b border-emerald-800 pb-1 mb-2">
                  ৩. গত মাস বনাম চলতি মাস খাতভিত্তিক তুলনা
                </h3>
                <p className="text-xs leading-relaxed text-slate-800 mb-2">
                  {auditData.aiAnalysis.trendAnalysisBn}
                </p>
                {auditData.headComparisons.length > 0 && (
                  <table className="w-full text-[11px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1 text-left">ধরণ</th>
                        <th className="border border-slate-300 px-2 py-1 text-left">খাতের নাম</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">
                          {auditData.prevMonthLabelBn}
                        </th>
                        <th className="border border-slate-300 px-2 py-1 text-right">
                          {auditData.currentMonthLabelBn}
                        </th>
                        <th className="border border-slate-300 px-2 py-1 text-right">পার্থক্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditData.headComparisons.slice(0, 12).map((c, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 px-2 py-1">
                            {c.type === 'INCOME' ? 'আয়' : 'ব্যয়'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">{c.headNameBn}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right">
                            {fmtTaka(c.previousMonthAmount)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                            {fmtTaka(c.currentMonthAmount)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right">
                            {c.diffAmount > 0 ? '+' : ''}
                            {fmtTaka(c.diffAmount)} ({fmtPct(c.percentChange)})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 4. Recommendations */}
              <div className="mb-4 break-inside-avoid">
                <h3 className="text-sm font-bold text-emerald-950 border-b border-emerald-800 pb-1 mb-2">
                  ৪. মসজিদ কমিটির করণীয় ও সুপারিশ
                </h3>
                <ol className="list-decimal list-inside text-xs space-y-1 text-slate-800">
                  {(auditData.aiAnalysis.recommendationsBn || []).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ol>
              </div>

              <OfficialReportSignatures
                currentMosque={currentMosque}
                preparerTitle={currentUser?.name ? `প্রস্তুতকারী (${currentUser.name})` : 'হিসাবরক্ষক / প্রস্তুতকারী'}
                auditFooterText="মসজিদলেজার AI স্মার্ট অডিট ও নিরীক্ষা সিস্টেম"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

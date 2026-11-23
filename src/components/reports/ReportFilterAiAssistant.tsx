import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { api, ReportFilterAiSuggestionResult } from '../../lib/api';

export interface ReportFilterApplyPayload {
  reportType: string;
  dateRangeType: string;
  fromDate: string;
  toDate: string;
  grouping: string;
  level: string;
  selectedHeadId: string;
  selectedSubHeadId: string;
  selectedAccountId: string;
}

interface ReportFilterAiAssistantProps {
  onApplySuggestedFilters: (filters: ReportFilterApplyPayload) => void;
}

const SAMPLE_PROMPTS_BN = [
  'গত মাসের আয়-ব্যয় ও অনুদান রিপোর্ট',
  'চলতি বছরের উন্নয়ন খাতের রিপোর্ট',
  'চলতি মাসের নগদ বহি (ক্যাশবুক)',
  'গত মাসের স্টাফ বেতন বিবরণী',
];

const GROUPING_LABELS_BN: Record<string, string> = {
  HEAD: 'প্রধান খাত অনুযায়ী',
  DAILY: 'দৈনিক ভিত্তিতে',
  MONTHLY: 'মাসিক ভিত্তিতে',
  ACCOUNT: 'অ্যাকাউন্ট ভিত্তিক',
  NONE: 'গ্রুপিং ছাড়া (সাধারণ তালিকা)',
};

const LEVEL_LABELS_BN: Record<string, string> = {
  DETAILED: 'বিস্তারিত ভাউচারসহ',
  SUMMARY: 'সংক্ষিপ্ত সারসংক্ষেপ',
};

export const ReportFilterAiAssistant: React.FC<ReportFilterAiAssistantProps> = ({
  onApplySuggestedFilters,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ReportFilterAiSuggestionResult | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const runSuggestion = async (inputText: string) => {
    const trimmed = inputText.trim();
    if (trimmed.length < 3) {
      setErrorMsg('অনুগ্রহ করে বাংলায় কী ধরনের রিপোর্ট দেখতে চান তা লিখুন।');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuggestion(null);
    setAppliedBanner(null);

    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const data = await api.suggestReportFiltersAi({ query: trimmed, todayIso });
      setSuggestion(data);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'ফিল্টার সাজেশন তৈরি করা যায়নি। নিচের সাধারণ রিপোর্ট ফিল্টার ব্যবহার করে রিপোর্ট দেখুন।'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSuggestion(query);
  };

  const handleConfirmApply = () => {
    if (!suggestion) return;
    const sf = suggestion.suggestedFilters;
    onApplySuggestedFilters({
      reportType: sf.reportType,
      dateRangeType: sf.dateRangeType,
      fromDate: sf.fromDate,
      toDate: sf.toDate,
      grouping: sf.grouping,
      level: sf.level,
      selectedHeadId: sf.selectedHeadId,
      selectedSubHeadId: sf.selectedSubHeadId,
      selectedAccountId: sf.selectedAccountId,
    });
    setAppliedBanner(
      `ফিল্টার প্রয়োগ করা হয়েছে: ${sf.reportTypeLabelBn} (${sf.fromDateBn} — ${sf.toDateBn})`
    );
    setSuggestion(null);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/70 border border-indigo-200/80 rounded-2xl p-4 shadow-xs space-y-3 print:hidden">
      {/* Header + Search Input */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-siliguri font-bold text-sm text-slate-900">
              ✨ AI ফিল্টার সহায়ক
            </h3>
            <p className="font-tiro text-xs text-slate-500">
              স্বাভাবিক বাংলায় লিখুন — AI প্রস্তাবিত ফিল্টার দেখাবে, আপনি চাইলে প্রয়োগ করবেন
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col sm:flex-row gap-2 max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='যেমন: "গত মাসের আয়-ব্যয় ও অনুদান রিপোর্ট" বা "চলতি বছরের উন্নয়ন খাতের রিপোর্ট"'
            className="flex-1 px-3.5 py-2 text-xs font-tiro bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-siliguri font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                বিশ্লেষণ হচ্ছে...
              </>
            ) : (
              <>
                <Filter className="w-3.5 h-3.5" />
                ফিল্টার খুঁজুন
              </>
            )}
          </button>
        </form>
      </div>

      {/* Sample Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-siliguri text-slate-500 font-semibold">উদাহরণ:</span>
        {SAMPLE_PROMPTS_BN.map((sample) => (
          <button
            key={sample}
            type="button"
            disabled={loading}
            onClick={() => {
              setQuery(sample);
              runSuggestion(sample);
            }}
            className="px-2.5 py-1 text-[11px] font-tiro bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 hover:border-indigo-200 rounded-lg transition cursor-pointer"
          >
            {sample}
          </button>
        ))}
      </div>

      {/* Applied Banner */}
      {appliedBanner && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-tiro">{appliedBanner} — সকল সংখ্যা সিস্টেমের নির্ধারিত হিসাব লজিক থেকে গণনাকৃত।</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-tiro">{errorMsg}</span>
        </div>
      )}

      {/* Preview Box — Requires Explicit "ফিল্টার প্রয়োগ করুন" Click */}
      {suggestion && (
        <div className="p-4 bg-white border-2 border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <p className="font-siliguri font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                AI প্রস্তাবিত ফিল্টার সেটআপ (প্রিভিউ — এখনো প্রয়োগ হয়নি)
              </p>
              <p className="font-tiro text-xs text-slate-600 mt-0.5">{suggestion.explanationBn}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuggestion(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              title="প্রস্তাব বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-siliguri block">রিপোর্টের ধরন</span>
              <span className="font-bold text-slate-900 font-siliguri">
                {suggestion.suggestedFilters.reportTypeLabelBn}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-siliguri block">তারিখ ও সময়কাল</span>
              <span className="font-bold text-slate-900 font-baloo">
                {suggestion.suggestedFilters.fromDateBn} — {suggestion.suggestedFilters.toDateBn}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-siliguri block">খাত ও উপখাত</span>
              <span className="font-bold text-slate-900 font-tiro">
                {suggestion.suggestedFilters.selectedHeadLabelBn}
                {suggestion.suggestedFilters.selectedSubHeadId !== 'ALL'
                  ? ` › ${suggestion.suggestedFilters.selectedSubHeadLabelBn}`
                  : ''}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-siliguri block">ফান্ড / গ্রুপিং / স্তর</span>
              <span className="font-bold text-slate-900 font-tiro">
                {suggestion.suggestedFilters.selectedAccountLabelBn} •{' '}
                {GROUPING_LABELS_BN[suggestion.suggestedFilters.grouping] || suggestion.suggestedFilters.grouping} •{' '}
                {LEVEL_LABELS_BN[suggestion.suggestedFilters.level] || suggestion.suggestedFilters.level}
              </span>
            </div>
          </div>

          {suggestion.unmatchedNotesBn.length > 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-tiro">
              <span className="font-siliguri font-bold">লক্ষণীয়: </span>
              {suggestion.unmatchedNotesBn.join(' ')}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-tiro">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              সকল আয়, ব্যয়, স্থিতি ও যোগফল বিদ্যমান সিস্টেমের নির্ধারিত হিসাব লজিক থেকে গণনা হবে।
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="px-3.5 py-1.5 text-xs font-siliguri font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-siliguri font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                ফিল্টার প্রয়োগ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

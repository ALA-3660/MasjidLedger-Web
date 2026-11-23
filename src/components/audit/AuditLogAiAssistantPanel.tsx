import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Search,
  AlertTriangle,
  Check,
  Loader2,
  X,
  Eye,
  Filter,
  Info,
} from 'lucide-react';
import {
  api,
  AuditLogAiSummaryResult,
  AuditLogAiFilterSuggestionResult,
} from '../../lib/api';

interface AuditLogAiAssistantPanelProps {
  filteredLogIds: string[];
  totalFilteredCount: number;
  filterSummaryBn: string;
  onApplySuggestedFilters: (filters: {
    moduleFilter: string;
    actionFilter: string;
    statusFilter: string;
    userFilter: string;
    fromDate: string;
    toDate: string;
    searchQuery: string;
  }) => void;
}

const SAMPLE_AUDIT_QUERIES = [
  'গত সপ্তাহে সংশোধন (Update) হওয়া আর্থিক লগগুলো দেখাও',
  'এই মাসে মুছে ফেলা (Delete) বা বাতিল হওয়া এন্ট্রি দেখাও',
  'ব্যর্থ (Failed) বা সতর্কতামূলক লগইন ও কার্যক্রম দেখাও',
  'ব্যয় (Expense) মডিউলের সাম্প্রতিক পরিবর্তনগুলো দেখাও',
];

export const AuditLogAiAssistantPanel: React.FC<AuditLogAiAssistantPanelProps> = ({
  filteredLogIds,
  totalFilteredCount,
  filterSummaryBn,
  onApplySuggestedFilters,
}) => {
  // Audit Summary State (strictly read-only observation)
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<AuditLogAiSummaryResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Natural Language Filter Helper State
  const [showFilterHelper, setShowFilterHelper] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [isSuggestingFilter, setIsSuggestingFilter] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterSuggestion, setFilterSuggestion] = useState<AuditLogAiFilterSuggestionResult | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const handleRunAuditSummary = async () => {
    setSummaryError(null);
    setShowSummary(true);
    setIsSummarizing(true);
    try {
      const data = await api.summarizeAuditLogsAi({
        logIds: filteredLogIds.slice(0, 400),
        filterSummaryBn,
      });
      setSummaryResult(data);
    } catch (err: any) {
      setSummaryError(
        err?.message || 'অডিট লগ সারসংক্ষেপ তৈরি করা যায়নি। নিচের মূল অডিট টেবিল স্বাভাবিকভাবে পর্যবেক্ষণ করুন।'
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSuggestFilter = async (customQuery?: string) => {
    const q = (customQuery ?? filterQuery).trim();
    if (!q) {
      setFilterError('অনুগ্রহ করে বাংলায় লিখুন আপনি কোন অডিট লগ খুঁজতে চান।');
      return;
    }
    setFilterQuery(q);
    setFilterError(null);
    setAppliedBanner(null);
    setIsSuggestingFilter(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const data = await api.suggestAuditLogFiltersAi({ query: q, todayIso });
      setFilterSuggestion(data);
    } catch (err: any) {
      setFilterError(
        err?.message || 'ফিল্টার সাজেশন তৈরি করা যায়নি। অনুগ্রহ করে নিচের ম্যানুয়াল ফিল্টার ব্যবহার করুন।'
      );
    } finally {
      setIsSuggestingFilter(false);
    }
  };

  const handleApplyFilters = () => {
    if (!filterSuggestion) return;
    const f = filterSuggestion.suggestedFilters;
    onApplySuggestedFilters({
      moduleFilter: f.moduleFilter,
      actionFilter: f.actionFilter,
      statusFilter: f.statusFilter,
      userFilter: f.userFilter,
      fromDate: f.fromDate,
      toDate: f.toDate,
      searchQuery: f.searchQuery,
    });
    setAppliedBanner('প্রস্তাবিত ফিল্টারগুলো অডিট লগে প্রয়োগ করা হয়েছে।');
    setFilterSuggestion(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 font-siliguri print:hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-emerald-300 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              AI অডিট পর্যবেক্ষণ ও অনুসন্ধান সহায়ক (শুধুমাত্র পঠনযোগ্য)
            </h3>
            <p className="text-[11px] text-slate-500">
              অডিট লগ সম্পূর্ণ অপরিবর্তনীয় — AI কেবল নিরপেক্ষ সারসংক্ষেপ ও ফিল্টার সাজেশন দেয়
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunAuditSummary}
            disabled={isSummarizing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>বিশ্লেষণ চলছে...</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>✨ AI অডিট সারসংক্ষেপ ({totalFilteredCount})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowFilterHelper((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              showFilterHelper
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>✨ AI ফিল্টার সহায়ক</span>
          </button>
        </div>
      </div>

      {appliedBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-900 flex items-center justify-between">
          <span className="font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{appliedBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setAppliedBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Natural Language Bangla Filter Suggestion Panel */}
      {showFilterHelper && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-700" />
              <span>স্বাভাবিক বাংলায় অডিট লগ খুঁজুন (প্রিভিউ দেখে ফিল্টার প্রয়োগ করুন)</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowFilterHelper(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSuggestFilter();
                }
              }}
              placeholder="যেমন: গত সপ্তাহে এডিট বা ডিলিট হওয়া আর্থিক এন্ট্রিগুলো দেখাও..."
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <button
              type="button"
              onClick={() => handleSuggestFilter()}
              disabled={isSuggestingFilter || !filterQuery.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              {isSuggestingFilter ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>খুঁজছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ফিল্টার প্রস্তাব দেখুন</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_AUDIT_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestFilter(q)}
                className="text-[11px] px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {filterError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{filterError}</span>
            </div>
          )}

          {/* Filter Suggestion Preview Box */}
          {filterSuggestion && (
            <div className="bg-white border-2 border-emerald-300 rounded-xl p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    প্রস্তাবিত ফিল্টার প্রিভিউ
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {filterSuggestion.explanationBn}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterSuggestion(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">মডিউল</span>
                  <strong className="text-slate-900">{filterSuggestion.suggestedFilters.moduleLabelBn}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">অ্যাকশন</span>
                  <strong className="text-slate-900">{filterSuggestion.suggestedFilters.actionLabelBn}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">স্ট্যাটাস</span>
                  <strong className="text-slate-900">{filterSuggestion.suggestedFilters.statusLabelBn}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">ব্যবহারকারী</span>
                  <strong className="text-slate-900">
                    {filterSuggestion.suggestedFilters.userFilter === 'ALL'
                      ? 'সবাই'
                      : filterSuggestion.suggestedFilters.userFilter}
                  </strong>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">তারিখ সীমা</span>
                  <strong className="text-slate-900 font-baloo">
                    {filterSuggestion.suggestedFilters.fromDate || filterSuggestion.suggestedFilters.toDate
                      ? `${filterSuggestion.suggestedFilters.fromDateBn || 'শুরু'} – ${filterSuggestion.suggestedFilters.toDateBn || 'আজ'}`
                      : 'সব তারিখ'}
                  </strong>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block">কীওয়ার্ড</span>
                  <strong className="text-slate-900 truncate block">
                    {filterSuggestion.suggestedFilters.searchQuery || '—'}
                  </strong>
                </div>
              </div>

              {filterSuggestion.unmatchedNotesBn.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-900">
                  <strong>দৃষ্টি আকর্ষণ: </strong>
                  {filterSuggestion.unmatchedNotesBn.join(' ')}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFilterSuggestion(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ফিল্টার প্রয়োগ করুন</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Neutral Audit Summary Panel */}
      {showSummary && (
        <div className="bg-slate-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>নিরপেক্ষ অডিট লগ পর্যবেক্ষণ সারসংক্ষেপ</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowSummary(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSummarizing && (
            <div className="py-5 flex items-center justify-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>বর্তমান ফিল্টারকৃত অডিট লগগুলো নিরপেক্ষভাবে পর্যালোচনা করা হচ্ছে...</span>
            </div>
          )}

          {summaryError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{summaryError}</span>
            </div>
          )}

          {summaryResult && !isSummarizing && (
            <div className="space-y-3">
              {/* Deterministic Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                <div className="bg-white border border-slate-200 rounded-xl p-2">
                  <span className="block text-[10px] text-slate-500">মোট বিশ্লেষিত</span>
                  <strong className="text-sm font-baloo text-slate-900">
                    {summaryResult.metrics.totalLogsAnalyzed}
                  </strong>
                </div>
                <div className="bg-white border border-emerald-200 rounded-xl p-2">
                  <span className="block text-[10px] text-emerald-700">নতুন তৈরি</span>
                  <strong className="text-sm font-baloo text-emerald-800">
                    {summaryResult.metrics.createCount}
                  </strong>
                </div>
                <div className="bg-white border border-blue-200 rounded-xl p-2">
                  <span className="block text-[10px] text-blue-700">সংশোধন (Update)</span>
                  <strong className="text-sm font-baloo text-blue-800">
                    {summaryResult.metrics.updateCount}
                  </strong>
                </div>
                <div className="bg-white border border-rose-200 rounded-xl p-2">
                  <span className="block text-[10px] text-rose-700">মুছে ফেলা (Delete)</span>
                  <strong className="text-sm font-baloo text-rose-700">
                    {summaryResult.metrics.deleteCount}
                  </strong>
                </div>
                <div className="bg-white border border-amber-200 rounded-xl p-2">
                  <span className="block text-[10px] text-amber-700">বাতিল / ব্যর্থ</span>
                  <strong className="text-sm font-baloo text-amber-800">
                    {summaryResult.metrics.cancelOrReverseCount + summaryResult.metrics.failedOrWarningCount}
                  </strong>
                </div>
                <div className="bg-white border border-purple-200 rounded-xl p-2">
                  <span className="block text-[10px] text-purple-700">পুনরাবৃত্ত এডিট</span>
                  <strong className="text-sm font-baloo text-purple-800">
                    {summaryResult.metrics.repeatedEntityEditsCount}
                  </strong>
                </div>
              </div>

              {/* Headline & Summary Paragraph */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
                <h5 className="text-xs font-bold text-emerald-950">{summaryResult.headlineBn}</h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {summaryResult.summaryParagraphBn}
                </p>
              </div>

              {/* Observations & Attention Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summaryResult.keyObservationsBn.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <h6 className="text-[11px] font-bold text-slate-800 mb-1.5">
                      প্রধান পর্যবেক্ষণসমূহ
                    </h6>
                    <ul className="space-y-1 text-[11px] text-slate-700 list-disc list-inside">
                      {summaryResult.keyObservationsBn.map((obs, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {obs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryResult.attentionItemsBn.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                    <h6 className="text-[11px] font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>যাচাইয়ের জন্য নজরে রাখার বিষয়সমূহ</span>
                    </h6>
                    <ul className="space-y-1 text-[11px] text-amber-950 list-disc list-inside">
                      {summaryResult.attentionItemsBn.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Neutral Disclaimer */}
              <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{summaryResult.disclaimerBn}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

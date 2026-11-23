import React, { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderSearch,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api, DocumentArchiveAiSummaryResult } from '../../lib/api';

interface DocumentArchiveAiSummaryCardProps {
  totalDocuments: number;
  onApplySearchSuggestion: (filter: {
    entityType: string;
    documentType: string;
    searchKeyword: string;
  }) => void;
}

export const DocumentArchiveAiSummaryCard: React.FC<DocumentArchiveAiSummaryCardProps> = ({
  totalDocuments,
  onApplySearchSuggestion,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<DocumentArchiveAiSummaryResult | null>(null);
  const [expanded, setExpanded] = useState(true);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setErrorMsg(null);
    setExpanded(true);
    try {
      const data = await api.getDocumentArchiveSummaryAi();
      setSummary(data);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'আর্কাইভ সারসংক্ষেপ তৈরি করতে সাময়িক সমস্যা হয়েছে। নিচের সাধারণ অনুসন্ধান ও ফিল্টার ব্যবহার করুন।'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-xs print:hidden">
      {/* Compact Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-siliguri font-bold text-sm text-stone-900 flex items-center gap-2 flex-wrap">
              <span>✨ AI আর্কাইভ সারসংক্ষেপ</span>
              <span className="text-[11px] font-baloo font-semibold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800">
                মোট {totalDocuments} টি নথি
              </span>
            </h3>
            <p className="font-tiro text-xs text-stone-500">
              সংরক্ষিত ডকুমেন্টের ধরন ও সাম্প্রতিক সংযোজনের সংক্ষিপ্ত বাংলা বিশ্লেষণ এবং দ্রুত অনুসন্ধান সহায়তা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-siliguri font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                বিশ্লেষণ হচ্ছে...
              </>
            ) : summary ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                হালনাগাদ করুন
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                সারসংক্ষেপ দেখুন
              </>
            )}
          </button>

          {summary && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="p-2 text-stone-500 hover:text-stone-800 bg-white border border-stone-200 rounded-xl transition cursor-pointer"
              title={expanded ? 'সংকুচিত করুন' : 'বিস্তারিত দেখুন'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-tiro">{errorMsg}</span>
        </div>
      )}

      {/* Summary Body */}
      {summary && expanded && (
        <div className="mt-3.5 pt-3.5 border-t border-emerald-200/70 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <p className="font-siliguri font-bold text-sm text-emerald-950">
                {summary.headlineBn}
              </p>
              <p className="font-tiro text-xs text-stone-700 leading-relaxed">
                {summary.summaryBn}
              </p>
              {summary.highlightsBn.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-stone-600 font-tiro pt-1">
                  {summary.highlightsBn.map((h, idx) => (
                    <li key={idx}>{h}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* System-Computed Deterministic Mini Metrics */}
            <div className="flex flex-wrap lg:flex-col gap-1.5 lg:min-w-[190px] shrink-0 text-[11px] font-baloo">
              <div className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg flex items-center justify-between gap-3">
                <span className="text-stone-500 font-siliguri">গত ৩০ দিনে সংযোজন</span>
                <span className="font-bold text-emerald-800">
                  {summary.metrics.addedLast30DaysCount} টি
                </span>
              </div>
              {summary.metrics.topCategories.slice(0, 2).map((cat) => (
                <div
                  key={cat.code}
                  className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg flex items-center justify-between gap-3"
                >
                  <span className="text-stone-600 truncate max-w-[130px]">{cat.labelBn}</span>
                  <span className="font-bold text-stone-800">{cat.count} টি</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clickable Search Assist Chips */}
          {summary.suggestedSearchChips.length > 0 && (
            <div className="pt-2 border-t border-emerald-100 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-siliguri font-bold text-stone-600">
                <FolderSearch className="w-3.5 h-3.5 text-emerald-700" />
                দ্রুত অনুসন্ধান সহায়তা:
              </span>
              {summary.suggestedSearchChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    onApplySearchSuggestion({
                      entityType: chip.entityType,
                      documentType: chip.documentType,
                      searchKeyword: chip.searchKeyword,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-siliguri font-semibold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg transition cursor-pointer"
                  title="এই ফিল্টার প্রয়োগ করুন"
                >
                  <span>{chip.labelBn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

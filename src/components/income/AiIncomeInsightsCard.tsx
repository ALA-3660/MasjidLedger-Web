import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Award,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AiIncomeInsightsCardProps {
  compact?: boolean;
}

export const AiIncomeInsightsCard: React.FC<AiIncomeInsightsCardProps> = ({ compact = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    currentMonthLabelBn: string;
    previousMonthLabelBn: string;
    nextMonthLabelBn: string;
    currentMonthTotal: number;
    previousMonthTotal: number;
    momDiff: number;
    momChangePercent: number | null;
    allTimeTotal: number;
    totalVouchers: number;
    topHeadNameBn: string;
    topHeadAmount: number;
    topHeadSharePercent: number;
    topHeadInsightBn: string;
    momComparisonBn: string;
    nextMonthForecastAmount: number;
    forecastRangeBn: string;
    forecastReasoningBn: string;
    executiveSummaryBn: string;
    recommendationsBn: string[];
  } | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getIncomeFinancialInsightsAi();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'AI আর্থিক বিশ্লেষণ লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs overflow-hidden font-siliguri">
      {/* Header Bar */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-siliguri">
              AI আর্থিক বিশ্লেষণ ও আগামী মাসের আয়ের পূর্বাভাস
            </h3>
            <p className="text-xs text-emerald-100 font-tiro">
              সর্বোচ্চ আয়ের খাত, গত মাসের তুলনা এবং আগামী মাসের সম্ভাব্য আয়ের বাস্তবসম্মত বিশ্লেষণ
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleAnalyze}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>বিশ্লেষণ হচ্ছে...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{data ? 'পুনরায় বিশ্লেষণ' : 'AI আর্থিক বিশ্লেষণ দেখুন'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Initial Prompt State */}
      {!data && !loading && !error && (
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/40">
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold text-slate-800">
              মসজিদের প্রকৃত আয় খতিয়ান বিশ্লেষণের জন্য প্রস্তুত
            </div>
            <p className="text-xs text-slate-600 font-tiro leading-relaxed">
              উপরের <strong>“AI আর্থিক বিশ্লেষণ দেখুন”</strong> বাটনে ক্লিক করলে Gemini AI মসজিদের প্রকৃত আয় রেকর্ড থেকে সর্বোচ্চ আয়ের খাত, গত মাসের সাথে পরিবর্তন এবং আগামী মাসের সম্ভাব্য আয়ের পূর্বাভাস বাংলায় উপস্থাপন করবে।
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-8 flex flex-col items-center justify-center text-emerald-800 space-y-2">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <p className="text-xs font-bold">মসজিদের বিগত ৬ মাসের আয় বিশ্লেষণ ও পূর্বাভাস তৈরি হচ্ছে...</p>
        </div>
      )}

      {/* Rich 3-Pillar Insights Content */}
      {data && !loading && (
        <div className="p-5 space-y-4">
          {/* 3 Core Cards */}
          <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-3' : 'lg:grid-cols-3'} gap-4`}>
            {/* Pillar 1: Top Income Head */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                  সর্বোচ্চ আয়ের খাত
                </span>
                <Award className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900">
                {data.topHeadNameBn}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-emerald-700 font-baloo">
                  ৳ {data.topHeadAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  মোট আয়ের {data.topHeadSharePercent}%
                </span>
              </div>
              <p className="text-xs text-slate-700 font-tiro leading-relaxed pt-1 border-t border-emerald-200/70">
                {data.topHeadInsightBn}
              </p>
            </div>

            {/* Pillar 2: Month-over-Month Change */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  গত মাসের তুলনায় পরিবর্তন
                </span>
                {(data.momDiff ?? 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                )}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {data.currentMonthLabelBn} বনাম {data.previousMonthLabelBn}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-slate-900 font-baloo">
                  ৳ {data.currentMonthTotal.toLocaleString('en-IN')}
                </span>
                {data.momChangePercent !== null && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono ${
                      data.momChangePercent >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {data.momChangePercent > 0 ? '+' : ''}
                    {data.momChangePercent}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 font-tiro leading-relaxed pt-1 border-t border-slate-200">
                {data.momComparisonBn}
              </p>
            </div>

            {/* Pillar 3: Next Month Forecast */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">
                  আগামী মাসের পূর্বাভাস
                </span>
                <Calendar className="w-4 h-4 text-teal-700" />
              </div>
              <div className="text-xs text-teal-900 font-semibold">
                {data.nextMonthLabelBn} (সম্ভাব্য আয়)
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-black font-mono text-teal-800 font-baloo">
                  ৳ {data.nextMonthForecastAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-teal-200 truncate">
                  {data.forecastRangeBn}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-tiro leading-relaxed pt-1 border-t border-teal-200/70">
                {data.forecastReasoningBn}
              </p>
            </div>
          </div>

          {/* Executive Summary + Actionable Recommendations */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            {data.executiveSummaryBn && (
              <p className="text-xs sm:text-sm text-slate-800 font-medium font-tiro leading-relaxed">
                {data.executiveSummaryBn}
              </p>
            )}
            {data.recommendationsBn.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI পরামর্শ:</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 font-tiro list-disc list-inside">
                  {data.recommendationsBn.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

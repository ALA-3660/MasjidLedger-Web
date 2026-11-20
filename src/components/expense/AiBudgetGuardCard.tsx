import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AiBudgetGuardCardProps {
  budgetId?: string;
  compact?: boolean;
}

export const AiBudgetGuardCard: React.FC<AiBudgetGuardCardProps> = ({
  budgetId,
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.analyzeExpenseBudgetGuardAi>> | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeExpenseBudgetGuardAi({ budgetId });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'AI ব্যয় নিয়ন্ত্রণ ও বাজেট গার্ড বিশ্লেষণ ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-rose-200/90 shadow-xs overflow-hidden font-siliguri">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-rose-800 via-red-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold">
              AI ব্যয় নিয়ন্ত্রণ ও পরামর্শ (AI Budget Guard & Forecast)
            </h3>
            <p className="text-xs text-rose-100 font-tiro">
              খাত-ভিত্তিক বাজেট বনাম প্রকৃত খরচ তুলনা, লাল/হলুদ ঝুঁকি সতর্কতা এবং খরচ কমানোর বাস্তবসম্মত বাংলা পরামর্শ
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleAnalyze}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>বিশ্লেষণ হচ্ছে...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{data ? 'পুনরায় বিশ্লেষণ করুন' : 'AI বাজেট গার্ড চালু করুন'}</span>
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
        <div className="p-5 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold text-slate-800">
              বাজেট অতিক্রমের ঝুঁকি আগেই শনাক্ত করুন
            </div>
            <p className="text-xs text-slate-600 font-tiro leading-relaxed">
              উপরের <strong>“AI বাজেট গার্ড চালু করুন”</strong> বাটনে ক্লিক করলে Gemini AI মসজিদের প্রকৃত বাজেট ও ব্যয় খতিয়ান বিশ্লেষণ করে লাল/হলুদ ঝুঁকিপূর্ণ খাত, আগামী মাসের সম্ভাব্য ব্যয়ের পূর্বাভাস এবং খরচ কমানোর কার্যকরী পরামর্শ তুলে ধরবে।
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-8 flex flex-col items-center justify-center text-rose-800 space-y-2">
          <Loader2 className="w-7 h-7 animate-spin text-rose-600" />
          <p className="text-xs font-bold">খাত-ভিত্তিক বাজেট, প্রকৃত খরচ এবং সাশ্রয়ী পরামর্শ বিশ্লেষণ হচ্ছে...</p>
        </div>
      )}

      {/* Analysis Result */}
      {data && !loading && (
        <div className="p-5 space-y-4">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Overall Health */}
            <div
              className={`rounded-xl p-4 border space-y-1.5 ${
                data.overallStatus === 'RED'
                  ? 'bg-rose-50 border-rose-200'
                  : data.overallStatus === 'YELLOW'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-700">সামগ্রিক বাজেট স্থিতি</span>
                {data.overallStatus === 'GREEN' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      data.overallStatus === 'RED' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                    data.overallStatus === 'RED'
                      ? 'bg-rose-600 text-white'
                      : data.overallStatus === 'YELLOW'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {data.overallStatus === 'RED'
                    ? 'উচ্চ ঝুঁকি (লাল)'
                    : data.overallStatus === 'YELLOW'
                    ? 'সতর্কতা (হলুদ)'
                    : 'নিরাপদ (সবুজ)'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  ব্যয় {data.overallUtilizationPercent}%
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                লাল ঝুঁকি: <strong className="text-rose-700">{data.redRiskCount} টি</strong> • হলুদ সতর্কতা:{' '}
                <strong className="text-amber-700">{data.yellowRiskCount} টি</strong>
              </div>
            </div>

            {/* Budget vs Actual */}
            <div className="rounded-xl p-4 border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">
                  {data.hasFormalBudget ? 'নির্ধারিত বাজেট বনাম প্রকৃত ব্যয়' : 'পূর্বের ভিত্তি বনাম প্রকৃত ব্যয়'}
                </span>
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-base font-black font-mono text-rose-700 font-baloo">
                ৳ {data.totalActual.toLocaleString('en-IN')}
                <span className="text-xs font-semibold text-slate-500 ml-1">
                  / ৳ {data.totalPlanned.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 truncate">{data.budgetName}</div>
            </div>

            {/* Next Month Forecast */}
            <div className="rounded-xl p-4 border border-indigo-200 bg-indigo-50/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>আগামী মাসের সম্ভাব্য ব্যয়</span>
                </span>
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-base font-black font-mono text-indigo-900 font-baloo">
                ৳ {data.nextMonthExpenseForecastAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-700 font-tiro line-clamp-2">{data.forecastReasoningBn}</p>
            </div>
          </div>

          {/* Executive Summary */}
          {data.executiveSummaryBn && (
            <p className="text-xs sm:text-sm text-slate-800 font-tiro bg-slate-50 border border-slate-200 rounded-xl p-3.5 leading-relaxed">
              {data.executiveSummaryBn}
            </p>
          )}

          {/* Head-wise Risk Cards with Red / Yellow / Green Badges */}
          {data.atRiskHeads.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-800">খাত-ভিত্তিক ঝুঁকি ও বাজেট পর্যবেক্ষণ:</div>
              <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-3`}>
                {data.atRiskHeads.slice(0, compact ? 4 : 9).map((h) => {
                  const isRed = h.riskBadge === 'RED';
                  const isYellow = h.riskBadge === 'YELLOW';
                  const barPct = Math.min(100, Math.max(0, h.utilizationPercent));

                  return (
                    <div
                      key={h.mainHeadId}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        isRed
                          ? 'bg-rose-50/70 border-rose-300'
                          : isYellow
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-emerald-50/40 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 leading-snug">
                          {h.mainHeadNameBn}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isRed
                              ? 'bg-rose-600 text-white'
                              : isYellow
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {h.riskLabelBn}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-[11px] font-mono">
                        <span className="font-bold text-slate-900">
                          ব্যয়: ৳ {h.actualAmount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-slate-600">
                          বাজেট: ৳ {h.plannedAmount.toLocaleString('en-IN')} ({h.utilizationPercent}%)
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            isRed ? 'bg-rose-600' : isYellow ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-700 font-tiro leading-relaxed">
                        {h.warningNoteBn}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actionable Cost-Saving Tips */}
          {data.costSavingTipsBn.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>খরচ কমানোর বাস্তবসম্মত AI পরামর্শ:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-800 font-tiro space-y-1.5 leading-relaxed">
                {data.costSavingTipsBn.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

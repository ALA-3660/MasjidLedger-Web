import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface AiJumaComparisonBannerProps {
  jumaCount: number;
}

export const AiJumaComparisonBanner: React.FC<AiJumaComparisonBannerProps> = ({ jumaCount }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    latestJumaDate: string | null;
    currentWeekAmount: number;
    fourWeekAvg: number;
    comparedWeeksCount: number;
    diffAmount: number;
    percentChange: number | null;
    trend: 'UP' | 'DOWN' | 'STEADY' | 'NO_DATA';
    oneLineCommentBn: string;
  } | null>(null);

  const loadComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getJumaFourWeekComparisonAi();
      setData(res);
    } catch (err: any) {
      setError(err?.message || '৪ সপ্তাহের গড় তুলনা বিশ্লেষণ লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jumaCount > 0 && !data && !loading) {
      loadComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumaCount]);

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50/80 to-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs font-siliguri">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-950">
                AI ৪ সপ্তাহের জুমার গড় তুলনা
              </span>
              {data && data.percentChange !== null && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                    data.trend === 'UP'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : data.trend === 'DOWN'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {data.trend === 'UP' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : data.trend === 'DOWN' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>
                    {data.percentChange > 0 ? '+' : ''}
                    {data.percentChange}%
                  </span>
                </span>
              )}
              {data && (
                <span className="text-[11px] text-slate-600 font-mono">
                  সর্বশেষ জুমা: <strong className="text-teal-800">৳ {data.currentWeekAmount.toLocaleString('en-IN')}</strong> | ৪ সপ্তাহের গড়: <strong className="text-slate-800">৳ {data.fourWeekAvg.toLocaleString('en-IN')}</strong>
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-xs text-emerald-800 animate-pulse font-tiro">
                বিগত ৪ সপ্তাহের জুমার কালেকশনের গড় বিশ্লেষণ করা হচ্ছে...
              </p>
            ) : error ? (
              <div className="text-xs text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : data?.oneLineCommentBn ? (
              <p className="text-xs sm:text-sm text-emerald-950 font-medium font-tiro leading-snug">
                “{data.oneLineCommentBn}”
              </p>
            ) : (
              <p className="text-xs text-slate-600 font-tiro">
                চলতি ও বিগত ৪ সপ্তাহের জুমার কালেকশন তুলনা দেখতে বিশ্লেষণ বাটনে ক্লিক করুন।
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={loadComparison}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-300 text-xs font-bold shrink-0 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{data ? 'আপডেট করুন' : 'AI তুলনা দেখুন'}</span>
        </button>
      </div>
    </div>
  );
};

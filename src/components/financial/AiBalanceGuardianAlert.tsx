import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  ArrowRight,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';
import { FinancialAccount } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/i18n';

interface AiBalanceGuardianAlertProps {
  accounts: FinancialAccount[];
  periodOpeningBalance?: number;
  compact?: boolean;
  onNavigateOpeningBalance?: () => void;
  onNavigateIncome?: () => void;
}

export const AiBalanceGuardianAlert: React.FC<AiBalanceGuardianAlertProps> = ({
  accounts,
  periodOpeningBalance,
  compact = false,
  onNavigateOpeningBalance,
  onNavigateIncome,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<Awaited<ReturnType<typeof api.diagnoseNegativeCashBalanceAi>> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const negativeStats = useMemo(() => {
    const cashAccounts = accounts.filter((a) => a.accountType === 'CASH');
    const totalCash = cashAccounts.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
    const totalSignedOpening = accounts.reduce((s, a) => {
      const val = Number(a.openingBalance) || 0;
      return s + (a.openingBalanceType === 'CREDIT' ? -Math.abs(val) : val);
    }, 0);
    const cashSignedOpening = cashAccounts.reduce((s, a) => {
      const val = Number(a.openingBalance) || 0;
      return s + (a.openingBalanceType === 'CREDIT' ? -Math.abs(val) : val);
    }, 0);
    const hasAnyNegativeCash = totalCash < 0 || cashAccounts.some((a) => (Number(a.currentBalance) || 0) < 0);
    const hasAnyNegativeOpening =
      totalSignedOpening < 0 ||
      cashSignedOpening < 0 ||
      (typeof periodOpeningBalance === 'number' && periodOpeningBalance < 0) ||
      accounts.some((a) => (Number(a.openingBalance) || 0) < 0 || a.openingBalanceType === 'CREDIT');

    return {
      totalCash,
      totalSignedOpening,
      cashSignedOpening,
      hasNegativeAlert: hasAnyNegativeCash || hasAnyNegativeOpening,
      hasAnyNegativeCash,
      hasAnyNegativeOpening,
    };
  }, [accounts, periodOpeningBalance]);

  const handleDiagnose = async () => {
    setLoading(true);
    setError(null);
    if (compact) setIsModalOpen(true);
    try {
      const res = await api.diagnoseNegativeCashBalanceAi();
      setDiagnosis(res);
    } catch (err: any) {
      setError(err?.message || 'নেগেটিভ ক্যাশ ও প্রারম্ভিক স্থিতি বিশ্লেষণ ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (!negativeStats.hasNegativeAlert && !diagnosis) {
    return null;
  }

  const renderDiagnosisBody = () => (
    <div className="space-y-3.5 mt-3 pt-3 border-t border-rose-200/80">
      {error && (
        <div className="p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="p-4 rounded-xl bg-white/90 border border-rose-200 flex items-center gap-3 text-xs text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" />
          <span className="font-semibold">
            AI লেজারের প্রতিটি তারিখ ও লেনদেন পরীক্ষা করে ক্যাশ মাইনাস হওয়ার মূল কারণ নির্ণয় করছে...
          </span>
        </div>
      )}

      {diagnosis && !loading && (
        <div className="space-y-3">
          {/* Headline & Key Metrics */}
          <div className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs sm:text-sm font-extrabold text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{diagnosis.headlineBn}</span>
              </div>
              {diagnosis.firstNegativeDate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                  <Calendar className="w-3 h-3" />
                  <span>প্রথম মাইনাস তারিখ: {formatDate(diagnosis.firstNegativeDate)}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-800 leading-relaxed font-tiro">
              {diagnosis.rootCauseAnalysisBn}
            </p>

            {/* Quick Balance Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">প্রারম্ভিক ক্যাশ স্থিতি</span>
                <span className="text-xs font-mono font-black text-slate-900">
                  ৳ {diagnosis.openingCashBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 block">সর্বনিম্ন ব্যালেন্স</span>
                <span className="text-xs font-mono font-black text-rose-800">
                  ৳ {diagnosis.lowestBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-amber-800 block">বর্তমান নগদ স্থিতি</span>
                <span className="text-xs font-mono font-black text-amber-950">
                  ৳ {diagnosis.currentCashBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Recommended Fix Box */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
              <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>সমাধানের সুস্পষ্ট পরামর্শ:</span>
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed font-tiro">
                {diagnosis.recommendedActionBn}
              </p>
              {diagnosis.stepByStepFixBn.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {diagnosis.stepByStepFixBn.map((step, idx) => (
                    <li key={idx} className="text-[11px] text-emerald-900 flex items-start gap-1.5">
                      <span className="font-mono font-bold text-emerald-700">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Trigger Transactions Table */}
            {diagnosis.triggerTransactions.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  যে লেনদেনগুলোর পর ক্যাশ স্থিতি ঋণাত্মক হয়েছে ({diagnosis.triggerTransactions.length} টি)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold">
                      <tr>
                        <th className="px-2.5 py-1.5">তারিখ</th>
                        <th className="px-2.5 py-1.5">ভাউচার</th>
                        <th className="px-2.5 py-1.5">বিবরণ</th>
                        <th className="px-2.5 py-1.5 text-right">অঙ্ক (৳)</th>
                        <th className="px-2.5 py-1.5 text-right">পরবর্তী স্থিতি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diagnosis.triggerTransactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/40">
                          <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="px-2.5 py-1.5 font-mono font-bold text-slate-800">{tx.voucherNumber}</td>
                          <td className="px-2.5 py-1.5 text-slate-700">{tx.description}</td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-bold text-rose-700">
                            ৳ {tx.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-black text-rose-800">
                            ৳ {tx.runningBalanceAfter.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Action Navigation Buttons (Read-Only AI: user makes edits manually) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" />
                AI স্বয়ংক্রিয়ভাবে কোনো ব্যালেন্স বা লেনদেন পরিবর্তন করেনি — আপনি যাচাই করে আপডেট করুন।
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {onNavigateOpeningBalance && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      onNavigateOpeningBalance();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition cursor-pointer"
                  >
                    <span>প্রারম্ভিক স্থিতি যাচাই করুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {onNavigateIncome && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      onNavigateIncome();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition cursor-pointer"
                  >
                    <span>বাদ পড়া আয় এন্ট্রি করুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Compact mode for sidebar "মসজিদের সমন্বিত স্থিতি" card
  if (compact) {
    return (
      <>
        <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-300 space-y-2 font-siliguri">
          <div className="flex items-start gap-1.5 text-[11px] text-rose-900 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-bold">
              {negativeStats.hasAnyNegativeCash
                ? 'সতর্কতা: নগদ ক্যাশ ব্যালেন্স ঋণাত্মক (মাইনাস)!'
                : 'সতর্কতা: প্রারম্ভিক স্থিতি ঋণাত্মক রয়েছে!'}
            </span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleDiagnose}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span>AI দিয়ে কারণ খুঁজুন</span>
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-siliguri">
            <div className="bg-rose-50/95 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-rose-300 shadow-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-700 text-amber-300 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-rose-950">
                      AI ব্যালেন্স গার্ডিয়ান — নেগেটিভ ক্যাশ ও প্রারম্ভিক স্থিতি বিশ্লেষণ
                    </h3>
                    <p className="text-[11px] text-rose-800">
                      কোন তারিখের পর থেকে ক্যাশ মাইনাস হয়েছে এবং করণীয় কী
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderDiagnosisBody()}
            </div>
          </div>
        )}
      </>
    );
  }

  // Full Alert Banner Mode (Cash Book, Opening Balance, Daily Statement)
  return (
    <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-amber-50/70 to-rose-50 p-4 shadow-xs font-siliguri">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-700 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-extrabold text-rose-950">
                AI ব্যালেন্স গার্ডিয়ান সতর্কতা: ঋণাত্মক ক্যাশ বা প্রারম্ভিক স্থিতি শনাক্ত হয়েছে!
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                জরুরি যাচাই প্রয়োজন
              </span>
            </div>
            <p className="text-xs text-rose-900/90 mt-0.5 font-tiro leading-relaxed">
              {negativeStats.hasAnyNegativeCash
                ? `বর্তমান নগদ ক্যাশ ব্যালেন্স ৳ ${negativeStats.totalCash.toLocaleString('en-IN')} (মাইনাস) দেখাচ্ছে। সাধারণত প্রারম্ভিক স্থিতি এন্ট্রি না থাকলে বা কোনো আয় বাদ পড়লে এমন হয়।`
                : `প্রারম্ভিক স্থিতি ঋণাত্মক (৳ ${(periodOpeningBalance ?? negativeStats.totalSignedOpening).toLocaleString('en-IN')}) রয়েছে।`}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleDiagnose}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>কারণ খোঁজা হচ্ছে...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{diagnosis ? 'পুনরায় AI বিশ্লেষণ করুন' : 'AI দিয়ে কারণ খুঁজুন'}</span>
            </>
          )}
        </button>
      </div>

      {renderDiagnosisBody()}
    </div>
  );
};

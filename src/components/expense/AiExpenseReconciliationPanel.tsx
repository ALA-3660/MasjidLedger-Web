import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Landmark,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { api } from '../../lib/api';

export type ExpenseReconAuditResult = Awaited<ReturnType<typeof api.auditExpenseReconciliationAi>>;

interface AiExpenseReconciliationPanelProps {
  fromDate?: string;
  toDate?: string;
  compact?: boolean;
  onAuditComplete?: (result: ExpenseReconAuditResult) => void;
}

export const AiExpenseReconciliationPanel: React.FC<AiExpenseReconciliationPanelProps> = ({
  fromDate,
  toDate,
  compact = false,
  onAuditComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExpenseReconAuditResult | null>(null);

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auditExpenseReconciliationAi({ fromDate, toDate });
      setResult(res);
      if (onAuditComplete) onAuditComplete(res);
    } catch (err: any) {
      setError(err?.message || 'AI অডিট ও রিকনসিলিয়েশন সম্পন্ন করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200/90 shadow-xs overflow-hidden font-siliguri">
      {/* Header Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-indigo-900 via-slate-900 to-rose-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold">AI ডাবল পেমেন্ট ও ক্যাশ/ব্যাংক রিকনসিলিয়েশন অডিট</h4>
            <p className="text-[11px] text-indigo-100 font-tiro">
              একই তারিখে একই অঙ্কের ডুপ্লিকেট ব্যয় ভাউচার এবং ক্যাশ/ব্যাংক ব্যালেন্সের সাথে মোট ব্যয়ের গরমিল শনাক্ত করুন
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleRunAudit}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>নিরীক্ষা চলছে...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{result ? 'পুনরায় AI অডিট ও রিকনসাইল' : 'AI অডিট ও রিকনসাইল'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Headline & Risk Status */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              result.riskLevel === 'HIGH'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : result.riskLevel === 'MEDIUM'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.riskLevel === 'LOW' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    result.riskLevel === 'HIGH' ? 'text-rose-600' : 'text-amber-600'
                  }`}
                />
              )}
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-extrabold">{result.auditHeadlineBn}</div>
                <p className="text-xs font-tiro leading-relaxed opacity-90">{result.executiveSummaryBn}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800">
                ভাউচার: {result.scannedVoucherCount} টি
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg border ${
                  result.duplicateGroupCount > 0
                    ? 'bg-rose-100 border-rose-300 text-rose-800'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                }`}
              >
                ডুপ্লিকেট: {result.duplicateGroupCount} গ্রুপ
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg border ${
                  result.mismatchedAccountCount > 0
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                }`}
              >
                ব্যালেন্স অমিল: {result.mismatchedAccountCount} টি
              </span>
            </div>
          </div>

          {/* 1. Duplicate Expense Payments List */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-rose-600" />
              <span>সন্দেহজনক ডাবল পেমেন্ট / ডুপ্লিকেট ভাউচার ({result.duplicateGroupCount} টি গ্রুপ)</span>
            </div>
            {result.duplicateGroups.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>একই তারিখে একই অঙ্কের কোনো সন্দেহজনক ডুপ্লিকেট ব্যয় ভাউচার পাওয়া যায়নি।</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.duplicateGroups.map((grp) => (
                  <div
                    key={grp.groupKey}
                    className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-rose-900">
                        তারিখ: {grp.date} • ৳ {grp.amount.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          grp.riskLevel === 'HIGH'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {grp.riskLevel === 'HIGH' ? 'উচ্চ ঝুঁকি' : 'সতর্কতা'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-700">
                      ভাউচারসমূহ: {grp.voucherNumbers.join(', ')}
                    </div>
                    <div className="text-[11px] text-slate-700 font-semibold">{grp.payeeOrHeadBn}</div>
                    <p className="text-[11px] text-rose-900 font-tiro leading-relaxed">{grp.reasonBn}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Cash / Bank Balance vs Expense Discrepancy Table */}
          {!compact && result.balanceDiscrepancies.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-indigo-600" />
                <span>ক্যাশ ও ব্যাংক ব্যালেন্সের সাথে মোট ব্যয়ের সমন্বয় যাচাই</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">হিসাবের নাম</th>
                      <th className="p-2.5 text-right">মোট ব্যয়</th>
                      <th className="p-2.5 text-right">প্রত্যাশিত স্থিতি</th>
                      <th className="p-2.5 text-right">রেকর্ডকৃত স্থিতি</th>
                      <th className="p-2.5 text-right">পার্থক্য (Delta)</th>
                      <th className="p-2.5">AI মন্তব্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.balanceDiscrepancies.map((acc) => (
                      <tr
                        key={acc.accountId}
                        className={acc.hasMismatch ? 'bg-amber-50/80' : 'bg-white'}
                      >
                        <td className="p-2.5 font-bold text-slate-900">
                          {acc.accountNameBn}
                          <span className="ml-1.5 text-[10px] font-mono text-slate-500">({acc.accountType})</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-700 font-bold">
                          ৳ {acc.totalExpenses.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-800">
                          ৳ {acc.expectedBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ৳ {acc.recordedBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black">
                          {acc.hasMismatch ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                              {acc.delta > 0 ? '+' : ''}৳ {acc.delta.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              ০ (সঠিক)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-[11px] font-tiro text-slate-700 max-w-xs">
                          {acc.explanationBn}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Action Checklist */}
          {result.actionChecklistBn.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                <span>ক্যাশিয়ারের করণীয় চেকলিস্ট:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-700 font-tiro space-y-1">
                {result.actionChecklistBn.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

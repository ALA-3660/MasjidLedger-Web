import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Wallet,
  Info,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface PayrollVoucherPrefill {
  staffId: string;
  salaryMonth: string;
  amount: number;
  mainHeadId?: string;
  payeeName: string;
  payeePhone: string;
  description: string;
  reference: string;
}

interface AiPayrollAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStaffVoucherDraft: (prefill: PayrollVoucherPrefill) => void;
}

export const AiPayrollAssistantModal: React.FC<AiPayrollAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenStaffVoucherDraft,
}) => {
  const [salaryMonth, setSalaryMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Awaited<ReturnType<typeof api.prepareMonthlyPayrollDraftAi>> | null>(null);
  // Editable per-staff advance deduction overrides (cashier verification before applying)
  const [customDeductions, setCustomDeductions] = useState<Record<string, number>>({});

  const handleGenerateDraft = async (targetMonth = salaryMonth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.prepareMonthlyPayrollDraftAi({ salaryMonth: targetMonth });
      setDraft(res);
      const initialMap: Record<string, number> = {};
      res.rows.forEach((r) => {
        initialMap[r.staffId] = r.recommendedAdvanceDeduction;
      });
      setCustomDeductions(initialMap);
    } catch (err: any) {
      setError(err?.message || 'মাসিক বেতন ড্রাফট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !draft && !loading) {
      handleGenerateDraft(salaryMonth);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const computedTotalDeduction = (draft?.rows || []).reduce((sum, r) => {
    if (r.alreadyPaid) return sum;
    const ded = customDeductions[r.staffId] ?? r.recommendedAdvanceDeduction;
    return sum + Math.max(0, Math.min(ded, r.grossSalary));
  }, 0);

  const computedTotalNet = (draft?.rows || []).reduce((sum, r) => {
    if (r.alreadyPaid) return sum;
    const ded = customDeductions[r.staffId] ?? r.recommendedAdvanceDeduction;
    return sum + Math.max(0, r.grossSalary - Math.max(0, Math.min(ded, r.grossSalary)));
  }, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-siliguri">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">AI মাসিক পেরোল সহকারী (বেতন ও অগ্রিম সমন্বয় ড্রাফট)</h3>
              <p className="text-xs text-emerald-100 font-tiro">
                ইমাম ও স্টাফদের নির্ধারিত বেতন ও বকেয়া অগ্রিম সমন্বয় করে যাচাইযোগ্য ভাউচার ড্রাফট তৈরি করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Selector Toolbar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <label className="text-xs font-bold text-slate-700">বেতনের মাস নির্বাচন:</label>
            <input
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleGenerateDraft(salaryMonth)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            <span>{loading ? 'পেরোল প্রস্তুত হচ্ছে...' : 'মাসিক বেতন শিট প্রস্তুত করুন'}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-emerald-800 space-y-2.5">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-bold">সক্রিয় ইমাম ও স্টাফদের বেতন, ভাতা এবং অগ্রিম হিসাব বিশ্লেষণ হচ্ছে...</p>
            </div>
          )}

          {draft && !loading && (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-slate-500">সক্রিয় স্টাফ ({draft.salaryMonthLabelBn})</div>
                  <div className="text-lg font-black text-slate-900 font-baloo mt-0.5">
                    {draft.totalActiveStaff} জন
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">
                    পরিশোধিত: {draft.alreadyPaidCount} | বাকি: {draft.pendingCount}
                  </div>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-blue-800">মোট নির্ধারিত বেতন ও ভাতা</div>
                  <div className="text-lg font-black font-mono text-blue-900 font-baloo mt-0.5">
                    ৳ {draft.totalGrossSalary.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-amber-800">মোট অগ্রিম সমন্বয় (প্রস্তাবিত)</div>
                  <div className="text-lg font-black font-mono text-amber-900 font-baloo mt-0.5">
                    ৳ {computedTotalDeduction.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-amber-700">
                    মোট বকেয়া অগ্রিম: ৳ {draft.totalOutstandingAdvance.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[11px] font-bold text-emerald-800">বাকি স্টাফদের নীট পরিশোধযোগ্য</div>
                  <div className="text-lg font-black font-mono text-emerald-800 font-baloo mt-0.5">
                    ৳ {computedTotalNet.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* AI Summary & Advance Advisory */}
              {(draft.summaryBn || draft.advanceAdvisoryBn) && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-1.5">
                  {draft.summaryBn && (
                    <p className="text-xs text-slate-800 font-tiro leading-relaxed font-medium">
                      {draft.summaryBn}
                    </p>
                  )}
                  {draft.advanceAdvisoryBn && (
                    <p className="text-xs text-emerald-900 font-tiro flex items-start gap-1.5 pt-1 border-t border-emerald-200/70">
                      <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>{draft.advanceAdvisoryBn}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Editable Payroll Sheet Table */}
              {draft.rows.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
                  কোনো সক্রিয় ইমাম বা স্টাফ পাওয়া যায়নি।
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3">ইমাম / স্টাফ ও পদবী</th>
                          <th className="p-3 text-right">মোট বেতন ও ভাতা</th>
                          <th className="p-3 text-right">বকেয়া অগ্রিম</th>
                          <th className="p-3 text-right">এই মাসে সমন্বয় (৳)</th>
                          <th className="p-3 text-right">নীট পরিশোধযোগ্য</th>
                          <th className="p-3 text-center">অবস্থা / ভাউচার</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draft.rows.map((row) => {
                          const deductionVal = customDeductions[row.staffId] ?? row.recommendedAdvanceDeduction;
                          const safeDeduction = Math.max(0, Math.min(deductionVal, row.grossSalary));
                          const netPay = Math.max(0, row.grossSalary - safeDeduction);

                          return (
                            <tr
                              key={row.staffId}
                              className={row.alreadyPaid ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}
                            >
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{row.staffName}</div>
                                <div className="text-[11px] text-slate-500">{row.designationBn}</div>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800">
                                ৳ {row.grossSalary.toLocaleString('en-IN')}
                                {row.allowance > 0 && (
                                  <div className="text-[10px] text-slate-500 font-normal">
                                    (মূল {row.baseSalary.toLocaleString('en-IN')} + ভাতা {row.allowance.toLocaleString('en-IN')})
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-amber-700">
                                {row.outstandingAdvance > 0
                                  ? `৳ ${row.outstandingAdvance.toLocaleString('en-IN')}`
                                  : '—'}
                              </td>
                              <td className="p-3 text-right">
                                {row.alreadyPaid ? (
                                  <span className="text-slate-400 font-mono">—</span>
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    max={Math.min(row.outstandingAdvance || row.grossSalary, row.grossSalary)}
                                    value={deductionVal}
                                    disabled={row.outstandingAdvance <= 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      setCustomDeductions((prev) => ({
                                        ...prev,
                                        [row.staffId]: val,
                                      }));
                                    }}
                                    className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400"
                                  />
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                                ৳ {netPay.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-center">
                                {row.alreadyPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>পরিশোধিত (৳{row.alreadyPaidAmount.toLocaleString('en-IN')})</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const finalDesc =
                                        safeDeduction > 0
                                          ? `${draft.salaryMonthLabelBn} মাসের বেতন ও সম্মানী — ${row.staffName} (${row.designationBn}) | মোট: ৳${row.grossSalary.toLocaleString('en-IN')}, অগ্রিম সমন্বয়: ৳${safeDeduction.toLocaleString('en-IN')}, নীট: ৳${netPay.toLocaleString('en-IN')}`
                                          : row.voucherDescriptionBn;
                                      onOpenStaffVoucherDraft({
                                        staffId: row.staffId,
                                        salaryMonth: draft.salaryMonth,
                                        amount: netPay,
                                        mainHeadId: row.suggestedMainHeadId || undefined,
                                        payeeName: row.staffName,
                                        payeePhone: row.phone,
                                        description: finalDesc,
                                        reference: `PAYROLL-${draft.salaryMonth}`,
                                      });
                                      onClose();
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs transition cursor-pointer"
                                  >
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span>ভাউচার ফর্মে বসান</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
                <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  নিরাপত্তা নীতি: কোনো বেতন স্বয়ংক্রিয়ভাবে ডাটাবেসে সেভ করা হয়নি। প্রতিটি স্টাফের <strong>“ভাউচার ফর্মে বসান”</strong> বাটনে ক্লিক করে ক্যাশিয়ার যাচাইয়ের পর <strong>সংরক্ষণ করুন</strong>।
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

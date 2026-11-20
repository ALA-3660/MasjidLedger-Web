import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Printer,
  DollarSign,
  Receipt,
  CheckCircle2,
  ShieldAlert,
  Gift,
  ArrowLeft
} from 'lucide-react';
import { Mosque } from '../../types';
import { api } from '../../lib/api';
import { formatCurrency, formatBengaliMonthYear, formatDate } from '../../lib/i18n';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { OfficialReportSignatures } from '../common/OfficialReportSignatures';

interface AiPayrollDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  currentMosque?: Mosque | null;
  onOpenPayModal: (staffId: string) => void;
}

type PayrollDraftResponse = Awaited<ReturnType<typeof api.generateStaffPayrollDraftAi>>;
type PayrollDraftRow = PayrollDraftResponse['rows'][number];

export const AiPayrollDraftModal: React.FC<AiPayrollDraftModalProps> = ({
  isOpen,
  onClose,
  month,
  currentMosque,
  onOpenPayModal,
}) => {
  const [festivalName, setFestivalName] = useState('');
  const [festivalBonusPercent, setFestivalBonusPercent] = useState<number>(0);
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PayrollDraftResponse | null>(null);
  const [editableRows, setEditableRows] = useState<PayrollDraftRow[]>([]);
  const [previewPayslipRow, setPreviewPayslipRow] = useState<PayrollDraftRow | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPreviewPayslipRow(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setDraft(null);
    setEditableRows([]);
    setPreviewPayslipRow(null);
  }, [month]);

  if (!isOpen) return null;

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError(null);
    setPreviewPayslipRow(null);
    try {
      const data = await api.generateStaffPayrollDraftAi({
        month,
        festivalBonusPercent,
        festivalName: festivalBonusPercent > 0 ? festivalName || 'উৎসব বোনাস' : '',
      });
      setDraft(data);
      setEditableRows(data.rows || []);
    } catch (err: any) {
      setError(err?.message || 'AI মাসিক বেতন শিট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustDeduction = (
    staffId: string,
    field: 'attendanceDeduction' | 'suggestedAdvanceDeduction',
    rawVal: string
  ) => {
    const val = Math.max(0, Number(rawVal) || 0);
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.staffId !== staffId) return row;
        const nextAtt = field === 'attendanceDeduction' ? val : row.attendanceDeduction;
        const nextAdv = field === 'suggestedAdvanceDeduction' ? val : row.suggestedAdvanceDeduction;
        const totalDeduction = nextAtt + nextAdv;
        const netPayable = Math.max(0, row.grossPayable - totalDeduction);
        return {
          ...row,
          attendanceDeduction: nextAtt,
          suggestedAdvanceDeduction: nextAdv,
          totalDeduction,
          netPayable,
        };
      })
    );
  };

  const computedTotals = editableRows.reduce(
    (acc, r) => {
      acc.basic += r.basicSalary;
      acc.allowance += r.fixedAllowance;
      acc.festival += r.festivalBonus;
      acc.attDed += r.attendanceDeduction;
      acc.advDed += r.suggestedAdvanceDeduction;
      acc.gross += r.grossPayable;
      acc.net += r.netPayable;
      return acc;
    },
    { basic: 0, allowance: 0, festival: 0, attDed: 0, advDed: 0, gross: 0, net: 0 }
  );

  const handlePrintFullSheet = () => {
    printElement('printable-ai-payroll-draft-sheet', {
      title: `AI_মাসিক_বেতন_শিট_${month}`,
    });
  };

  const handlePrintPayslip = (row: PayrollDraftRow) => {
    setPreviewPayslipRow(row);
    setTimeout(() => {
      printElement('printable-ai-individual-payslip', {
        title: `পে-স্লিপ_${row.nameBn}_${month}`,
      });
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-siliguri">
                AI অটো-পেরোল ও পে-স্লিপ ড্রাফট ({formatBengaliMonthYear(month)})
              </h3>
              <p className="text-xs text-slate-300 font-siliguri">
                মূল বেতন, ভাতা, হাজিরা কর্তন, অগ্রিম সমন্বয় ও উৎসব ভাতার স্বয়ংক্রিয় প্রিভিউ শিট
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Safety Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-siliguri">
              <strong>নিরাপত্তা নোট:</strong> এটি শুধুমাত্র প্রিভিউ ও হিসাব-সমন্বয় শিট। AI কোনো বেতন স্বয়ংক্রিয়ভাবে পরিশোধ বা ডেটাবেসে সেভ করবে না। প্রতিটি কর্মীর হিসাব যাচাই করে নিচের <strong>&ldquo;পরিশোধ ফর্ম&rdquo;</strong> বাটনে ক্লিক করে চূড়ান্ত অনুমোদন দিন।
            </span>
          </div>

          {/* Generator Controls */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-emerald-600" />
                  <span>উৎসব ভাতা / বোনাসের নাম (প্রযোজ্য হলে)</span>
                </label>
                <select
                  value={festivalName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFestivalName(val);
                    if (!val) setFestivalBonusPercent(0);
                    else if (festivalBonusPercent === 0) setFestivalBonusPercent(50);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="">উৎসব ভাতা নেই (সাধারণ মাস)</option>
                  <option value="ঈদুল ফিতর উৎসব বোনাস">ঈদুল ফিতর উৎসব বোনাস</option>
                  <option value="ঈদুল আযহা উৎসব বোনাস">ঈদুল আযহা উৎসব বোনাস</option>
                  <option value="বিশেষ হাদিয়া / বোনাস">বিশেষ হাদিয়া / বোনাস</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  উৎসব বোনাস হার (মূল বেতনের %)
                </label>
                <div className="flex items-center gap-1.5">
                  {[0, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setFestivalBonusPercent(pct);
                        if (pct === 0) setFestivalName('');
                        else if (!festivalName) setFestivalName('ঈদ উৎসব বোনাস');
                      }}
                      className={`px-3 py-2 rounded-xl font-bold border transition ${
                        festivalBonusPercent === pct
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={festivalBonusPercent}
                    onChange={(e) => setFestivalBonusPercent(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
                    className="w-20 px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateDraft}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>বেতন শিট তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{draft ? 'পুনরায় ড্রাফট তৈরি করুন' : 'AI বেতন শিট ড্রাফট তৈরি করুন'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Individual Payslip Preview Sub-View */}
          {draft && previewPayslipRow && (
            <div className="bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPayslipRow(null)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>সম্পূর্ণ বেতন শিটে ফিরে যান</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      printElement('printable-ai-individual-payslip', {
                        title: `পে-স্লিপ_${previewPayslipRow.nameBn}_${month}`,
                      })
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>পে-স্লিপ প্রিন্ট করুন</span>
                  </button>
                </div>
              </div>

              {/* On-screen Pay-Slip Preview Card */}
              <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-6 max-w-2xl mx-auto space-y-4 shadow-xs">
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="text-base font-bold text-slate-900 font-siliguri">
                    {currentMosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5 font-siliguri">
                    মাসিক বেতন ও ভাতা পে-স্লিপ (ড্রাফট) — {formatBengaliMonthYear(month)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500">নাম:</span>{' '}
                    <strong className="font-siliguri text-slate-900">{previewPayslipRow.nameBn}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">পদবী:</span>{' '}
                    <strong className="font-siliguri text-indigo-800">{previewPayslipRow.designationBn}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">আইডি:</span>{' '}
                    <span className="font-mono">#{previewPayslipRow.staffCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>{' '}
                    <span>{previewPayslipRow.bankInfo || previewPayslipRow.paymentPreference}</span>
                  </div>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-200">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-semibold">মাসিক মূল বেতন</td>
                      <td className="p-2.5 text-right font-bold">{formatCurrency(previewPayslipRow.basicSalary, 'bn')}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-semibold">স্থায়ী ভাতা (বাড়িভাড়া/চিকিৎসা/অন্যান্য)</td>
                      <td className="p-2.5 text-right text-emerald-700 font-bold">
                        +{formatCurrency(previewPayslipRow.fixedAllowance, 'bn')}
                      </td>
                    </tr>
                    {previewPayslipRow.festivalBonus > 0 && (
                      <tr className="border-b border-slate-200 bg-emerald-50/40">
                        <td className="p-2.5 font-semibold">{draft.festivalName || 'উৎসব ভাতা'}</td>
                        <td className="p-2.5 text-right text-emerald-700 font-bold">
                          +{formatCurrency(previewPayslipRow.festivalBonus, 'bn')}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-semibold">অনুপস্থিতি / হাজিরা কর্তন ({previewPayslipRow.absentDays} দিন অনুপস্থিত)</td>
                      <td className="p-2.5 text-right text-rose-600 font-bold">
                        -{formatCurrency(previewPayslipRow.attendanceDeduction, 'bn')}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-semibold">অগ্রিম / ঋণ সমন্বয়</td>
                      <td className="p-2.5 text-right text-rose-600 font-bold">
                        -{formatCurrency(previewPayslipRow.suggestedAdvanceDeduction, 'bn')}
                      </td>
                    </tr>
                    <tr className="bg-indigo-50 font-bold text-sm">
                      <td className="p-3 font-siliguri text-indigo-950">সর্বমোট নিট প্রদেয় বেতন</td>
                      <td className="p-3 text-right text-indigo-900">
                        {formatCurrency(previewPayslipRow.netPayable, 'bn')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-xs italic text-slate-600 text-center font-tiro">
                  {draft.payslipBlessingNoteBn}
                </p>
              </div>
            </div>
          )}

          {/* Full Payroll Preview Table */}
          {draft && !previewPayslipRow && (
            <div className="space-y-4">
              {/* Audit Note + Print Controls */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-emerald-900 font-siliguri">AI পেরোল অডিট সারসংক্ষেপ</div>
                  <p className="text-emerald-950 font-siliguri leading-relaxed">{draft.payrollAuditNoteBn}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeLetterhead}
                      onChange={(e) => setIncludeLetterhead(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600"
                    />
                    <span>লেটারহেডসহ</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePrintFullSheet}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ড্রাফট শিট প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* Totals Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500">মোট মূল বেতন ও ভাতা</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrency(computedTotals.basic + computedTotals.allowance, 'bn')}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-emerald-600">মোট উৎসব বোনাস</span>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    +{formatCurrency(computedTotals.festival, 'bn')}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-rose-600">মোট কর্তন (হাজিরা + অগ্রিম)</span>
                  <div className="text-base font-bold text-rose-700 mt-0.5">
                    -{formatCurrency(computedTotals.attDed + computedTotals.advDed, 'bn')}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-700">সর্বমোট নিট প্রদেয়</span>
                  <div className="text-base font-bold text-indigo-900 mt-0.5">
                    {formatCurrency(computedTotals.net, 'bn')}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">কর্মী ও পদবী</th>
                        <th className="p-3 text-right">মূল + ভাতা</th>
                        <th className="p-3 text-right">উৎসব বোনাস</th>
                        <th className="p-3 text-center">হাজিরা কর্তন</th>
                        <th className="p-3 text-center">অগ্রিম সমন্বয়</th>
                        <th className="p-3 text-right">নিট প্রদেয়</th>
                        <th className="p-3">AI পর্যবেক্ষণ</th>
                        <th className="p-3 text-right">পদক্ষেপ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editableRows.map((row) => (
                        <tr key={row.staffId} className="hover:bg-slate-50/80">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 font-siliguri">{row.nameBn}</div>
                            <div className="text-[10px] text-indigo-700 font-semibold">{row.designationBn}</div>
                            <div className="text-[10px] text-slate-400">
                              উপস্থিত: {row.presentDays} | অনুপস্থিত: {row.absentDays} | বকেয়া অগ্রিম: {formatCurrency(row.advanceOutstanding, 'bn')}
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatCurrency(row.basicSalary + row.fixedAllowance, 'bn')}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {row.festivalBonus > 0 ? `+${formatCurrency(row.festivalBonus, 'bn')}` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={row.attendanceDeduction}
                              onChange={(e) => handleAdjustDeduction(row.staffId, 'attendanceDeduction', e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono text-rose-700 font-bold"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={row.suggestedAdvanceDeduction}
                              onChange={(e) => handleAdjustDeduction(row.staffId, 'suggestedAdvanceDeduction', e.target.value)}
                              className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono text-rose-700 font-bold"
                            />
                          </td>
                          <td className="p-3 text-right font-extrabold text-indigo-900 whitespace-nowrap">
                            {formatCurrency(row.netPayable, 'bn')}
                          </td>
                          <td className="p-3 text-[11px] text-slate-600 max-w-[200px] font-siliguri">
                            {row.aiNoteBn}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewPayslipRow(row)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold inline-flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>পে-স্লিপ</span>
                              </button>

                              {row.alreadyPaid ? (
                                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>পরিশোধিত</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenPayModal(row.staffId);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold inline-flex items-center gap-1"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>পরিশোধ ফর্ম</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!draft && !loading && (
            <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500">
              <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 font-siliguri">
                &ldquo;AI বেতন শিট ড্রাফট তৈরি করুন&rdquo; বাটনে ক্লিক করে {formatBengaliMonthYear(month)}-এর সমন্বিত বেতন শিট প্রস্তুত করুন
              </p>
              <p className="text-[11px] mt-1">
                প্রতিটি কর্মীর মূল বেতন, স্থায়ী ভাতা, মাসিক হাজিরা, সক্রিয় অগ্রিম ও উৎসব বোনাস সমন্বয় করে প্রিভিউ ও পে-স্লিপ তৈরি হবে।
              </p>
            </div>
          )}
        </div>

        {/* Hidden Printable Full Draft Sheet */}
        {draft && (
          <div id="printable-ai-payroll-draft-sheet" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
            {includeLetterhead ? (
              <MosqueOfficialLetterhead
                mosque={currentMosque}
                documentTitle="মাসিক বেতন ও ভাতা সমন্বিত বিবরণী (ড্রাফট)"
                dateStr={`বেতন মাস: ${formatBengaliMonthYear(month)}`}
              />
            ) : (
              <div className="text-center pb-4 border-b border-slate-300 mb-6">
                <h1 className="text-xl font-bold font-siliguri">মাসিক বেতন ও ভাতা সমন্বিত বিবরণী</h1>
                <p className="text-xs text-slate-600 mt-1">বেতন মাস: {formatBengaliMonthYear(month)}</p>
              </div>
            )}

            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="p-2 border border-slate-300">ক্রমিক</th>
                  <th className="p-2 border border-slate-300">নাম ও পদবী</th>
                  <th className="p-2 border border-slate-300 text-right">মূল বেতন</th>
                  <th className="p-2 border border-slate-300 text-right">ভাতা</th>
                  <th className="p-2 border border-slate-300 text-right">উৎসব বোনাস</th>
                  <th className="p-2 border border-slate-300 text-right">হাজিরা কর্তন</th>
                  <th className="p-2 border border-slate-300 text-right">অগ্রিম সমন্বয়</th>
                  <th className="p-2 border border-slate-300 text-right">নিট প্রদেয়</th>
                  <th className="p-2 border border-slate-300 text-center">স্বাক্ষর</th>
                </tr>
              </thead>
              <tbody>
                {editableRows.map((r, idx) => (
                  <tr key={r.staffId}>
                    <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-siliguri font-bold">
                      {r.nameBn} ({r.designationBn})
                    </td>
                    <td className="p-2 border border-slate-300 text-right">{formatCurrency(r.basicSalary, 'bn')}</td>
                    <td className="p-2 border border-slate-300 text-right">{formatCurrency(r.fixedAllowance, 'bn')}</td>
                    <td className="p-2 border border-slate-300 text-right">{formatCurrency(r.festivalBonus, 'bn')}</td>
                    <td className="p-2 border border-slate-300 text-right">{formatCurrency(r.attendanceDeduction, 'bn')}</td>
                    <td className="p-2 border border-slate-300 text-right">{formatCurrency(r.suggestedAdvanceDeduction, 'bn')}</td>
                    <td className="p-2 border border-slate-300 text-right font-bold">{formatCurrency(r.netPayable, 'bn')}</td>
                    <td className="p-2 border border-slate-300"></td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-2 border border-slate-300 text-right">সর্বমোট</td>
                  <td className="p-2 border border-slate-300 text-right">{formatCurrency(computedTotals.basic, 'bn')}</td>
                  <td className="p-2 border border-slate-300 text-right">{formatCurrency(computedTotals.allowance, 'bn')}</td>
                  <td className="p-2 border border-slate-300 text-right">{formatCurrency(computedTotals.festival, 'bn')}</td>
                  <td className="p-2 border border-slate-300 text-right">{formatCurrency(computedTotals.attDed, 'bn')}</td>
                  <td className="p-2 border border-slate-300 text-right">{formatCurrency(computedTotals.advDed, 'bn')}</td>
                  <td className="p-2 border border-slate-300 text-right">{formatCurrency(computedTotals.net, 'bn')}</td>
                  <td className="p-2 border border-slate-300"></td>
                </tr>
              </tbody>
            </table>

            <div className="mt-12">
              <OfficialReportSignatures
                currentMosque={currentMosque}
                preparerTitle="হিসাবরক্ষক / ক্যাশিয়ার"
                secretaryTitle="সাধারণ সম্পাদক / মোতাওয়াল্লী"
                presidentTitle="সভাপতি"
                showAuditFooter={true}
                auditFooterText="মসজিদ লেজার • সমন্বিত মাসিক বেতন শিট"
              />
            </div>
          </div>
        )}

        {/* Hidden Printable Individual Payslip */}
        {draft && previewPayslipRow && (
          <div id="printable-ai-individual-payslip" className="hidden print:block p-10 bg-white text-slate-900 font-siliguri">
            <MosqueOfficialLetterhead
              mosque={currentMosque}
              documentTitle="মাসিক বেতন পে-স্লিপ"
              dateStr={`মাস: ${formatBengaliMonthYear(month)} | তারিখ: ${formatDate(new Date().toISOString().split('T')[0], 'bn')}`}
            />

            <div className="grid grid-cols-2 gap-3 text-sm border border-slate-300 p-4 rounded-lg mb-5">
              <div><strong>কর্মীর নাম:</strong> {previewPayslipRow.nameBn}</div>
              <div><strong>পদবী:</strong> {previewPayslipRow.designationBn}</div>
              <div><strong>কর্মী আইডি:</strong> #{previewPayslipRow.staffCode}</div>
              <div><strong>মোবাইল:</strong> {previewPayslipRow.phone}</div>
            </div>

            <table className="w-full text-sm border-collapse border border-slate-300 mb-6">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2.5 border border-slate-300 text-left">বিবরণ</th>
                  <th className="p-2.5 border border-slate-300 text-right">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2.5 border border-slate-300">মাসিক মূল বেতন</td>
                  <td className="p-2.5 border border-slate-300 text-right">{formatCurrency(previewPayslipRow.basicSalary, 'bn')}</td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-slate-300">স্থায়ী ভাতা</td>
                  <td className="p-2.5 border border-slate-300 text-right">+{formatCurrency(previewPayslipRow.fixedAllowance, 'bn')}</td>
                </tr>
                {previewPayslipRow.festivalBonus > 0 && (
                  <tr>
                    <td className="p-2.5 border border-slate-300">{draft.festivalName || 'উৎসব ভাতা'}</td>
                    <td className="p-2.5 border border-slate-300 text-right">+{formatCurrency(previewPayslipRow.festivalBonus, 'bn')}</td>
                  </tr>
                )}
                <tr>
                  <td className="p-2.5 border border-slate-300">অনুপস্থিতি / হাজিরা কর্তন</td>
                  <td className="p-2.5 border border-slate-300 text-right">-{formatCurrency(previewPayslipRow.attendanceDeduction, 'bn')}</td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-slate-300">অগ্রিম / ঋণ সমন্বয়</td>
                  <td className="p-2.5 border border-slate-300 text-right">-{formatCurrency(previewPayslipRow.suggestedAdvanceDeduction, 'bn')}</td>
                </tr>
                <tr className="bg-slate-100 font-bold text-base">
                  <td className="p-3 border border-slate-300">নিট প্রদেয় বেতন</td>
                  <td className="p-3 border border-slate-300 text-right">{formatCurrency(previewPayslipRow.netPayable, 'bn')}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-sm text-center italic mb-10 font-tiro">{draft.payslipBlessingNoteBn}</p>

            <OfficialReportSignatures
              currentMosque={currentMosque}
              preparerTitle="গ্রহণকারীর স্বাক্ষর"
              secretaryTitle="সাধারণ সম্পাদক / ক্যাশিয়ার"
              presidentTitle="সভাপতি / মোতাওয়াল্লী"
              showAuditFooter={true}
              auditFooterText="মসজিদ লেজার • মাসিক বেতন পে-স্লিপ"
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            * আপনি টেবিলে হাজিরা কর্তন বা অগ্রিম সমন্বয়ের অঙ্ক সরাসরি সংশোধন করে পে-স্লিপ প্রিন্ট করতে পারবেন।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Award,
  Lightbulb
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatBengaliMonthYear } from '../../lib/i18n';

interface AiAttendanceSummaryPanelProps {
  selectedDate: string;
  activeStaffCount: number;
}

type AttendanceSummaryData = Awaited<ReturnType<typeof api.summarizeMonthlyAttendanceAi>>;

export const AiAttendanceSummaryPanel: React.FC<AiAttendanceSummaryPanelProps> = ({
  selectedDate,
  activeStaffCount,
}) => {
  const monthStr = (selectedDate || new Date().toISOString().split('T')[0]).slice(0, 7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AttendanceSummaryData | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.summarizeMonthlyAttendanceAi({ month: monthStr });
      setSummary(res);
      setIsExpanded(true);
    } catch (err: any) {
      setError(err?.message || 'AI মাসিক হাজিরা সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-indigo-50/60 rounded-2xl border border-emerald-200/80 shadow-xs overflow-hidden">
      {/* Top Action Bar */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 font-siliguri">
                AI হাজিরা বিশ্লেষণ ও সতর্কতা ({formatBengaliMonthYear(monthStr)})
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                সক্রিয় কর্মী: {activeStaffCount} জন
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              পুরো মাসের হাজিরা বিশ্লেষণ করে ১০০% সময়ানুবর্তী ও অনিয়মিত উপস্থিতির সংক্ষিপ্ত বাংলা প্রতিবেদন দেখুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={handleAnalyze}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>বিশ্লেষণ চলছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI মাসিক হাজিরা সারসংক্ষেপ</span>
              </>
            )}
          </button>

          {summary && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition"
              title={isExpanded ? 'সংকুচিত করুন' : 'বিস্তারিত দেখুন'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Report Body */}
      {summary && isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-emerald-100">
          {/* Executive Summary */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-indigo-900 font-siliguri">
                সার্বিক মূল্যায়ন: {summary.overallStatusBn}
              </span>
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ১০০% সময়ানুবর্তী: {summary.perfectCount} জন
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full border ${
                    summary.irregularCount > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  সতর্কতা প্রয়োজন: {summary.irregularCount} জন
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-siliguri">{summary.summaryBn}</p>
          </div>

          {/* 2 Callout Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs mb-1 font-siliguri">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>১০০% সময়ানুবর্তী ও নিয়মিত উপস্থিতি</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed font-siliguri">
                {summary.perfectAttendanceNoteBn}
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mb-1 font-siliguri">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>অনিয়মিত উপস্থিতি ও সতর্কতা</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-siliguri">
                {summary.irregularityAlertBn}
              </p>
            </div>
          </div>

          {/* Action Suggestions */}
          {summary.actionSuggestionsBn && summary.actionSuggestionsBn.length > 0 && (
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs mb-1.5 font-siliguri">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span>কমিটির জন্য করণীয় পরামর্শ</span>
              </div>
              <ul className="space-y-1 text-xs text-indigo-950 font-siliguri">
                {summary.actionSuggestionsBn.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-staff Monthly Breakdown Table */}
          {summary.staffBreakdown && summary.staffBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5">কর্মী ও পদবী</th>
                      <th className="p-2.5 text-center">এন্ট্রি দিন</th>
                      <th className="p-2.5 text-center text-emerald-700">উপস্থিত</th>
                      <th className="p-2.5 text-center text-amber-700">দেরি</th>
                      <th className="p-2.5 text-center text-blue-700">ছুটি</th>
                      <th className="p-2.5 text-center text-rose-700">অনুপস্থিত</th>
                      <th className="p-2.5 text-center">উপস্থিতি হার</th>
                      <th className="p-2.5 text-right">মূল্যায়ন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.staffBreakdown.map((row) => (
                      <tr key={row.staffId} className="hover:bg-slate-50/80">
                        <td className="p-2.5">
                          <span className="font-bold text-slate-900 block font-siliguri">{row.nameBn}</span>
                          <span className="text-[10px] text-slate-500">{row.designationBn}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono">{row.recordedDays}</td>
                        <td className="p-2.5 text-center font-bold text-emerald-700">{row.presentDays}</td>
                        <td className="p-2.5 text-center font-bold text-amber-600">{row.lateDays}</td>
                        <td className="p-2.5 text-center font-bold text-blue-600">{row.leaveDays}</td>
                        <td className="p-2.5 text-center font-bold text-rose-600">{row.absentDays}</td>
                        <td className="p-2.5 text-center font-bold">
                          {row.recordedDays > 0 ? `${row.attendanceRate}%` : 'তথ্য নেই'}
                        </td>
                        <td className="p-2.5 text-right">
                          {row.isPerfect ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ১০০% সময়ানুবর্তী
                            </span>
                          ) : row.isIrregular ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              সতর্কতা প্রয়োজন
                            </span>
                          ) : row.recordedDays === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              হাজিরা অলিখিত
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              স্বাভাবিক
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

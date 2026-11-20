import React, { useState } from 'react';
import {
  Sparkles,
  Star,
  Printer,
  X,
  CheckCircle2,
  TrendingUp,
  Award,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Mosque } from '../../types';
import { api } from '../../lib/api';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface AiMemberPerformancePanelProps {
  termId?: string;
  mosque?: Mosque | null;
}

const toBnNum = (val: string | number) => {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[+d]);
};

export const AiMemberPerformancePanel: React.FC<AiMemberPerformancePanelProps> = ({
  termId,
  mosque,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState<{
    termTitle: string;
    overallSummaryBn: string;
    topPerformerNoteBn: string;
    improvementFocusBn: string;
    members: Array<{
      memberId: string;
      memberName: string;
      designationBn: string;
      totalMeetings: number;
      meetingsAttended: number;
      attendanceRate: number;
      assignedWorksCount: number;
      completedWorksCount: number;
      taskCompletionRate: number;
      activitiesCount: number;
      donationsCount: number;
      totalDonatedAmount: number;
      suggestedScore: number;
      suggestedStars: number;
      evaluationSummaryBn: string;
      strengthsBn: string;
      improvementTipBn: string;
    }>;
    generatedAt: string;
  } | null>(null);

  const handleAnalyze = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await api.getCommitteeMemberPerformanceAi(termId);
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI সদস্য মূল্যায়ন বিশ্লেষণে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    printElement('ai-member-performance-printable', {
      title: `AI_সদস্য_মূল্যায়ন_${report.termTitle}`,
    });
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/70 rounded-2xl border border-indigo-200 p-4 sm:p-5 space-y-4 font-siliguri shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              AI সদস্য মূল্যায়ন ও স্কোর বিশ্লেষণ (Performance Insights)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              মিটিংয়ে উপস্থিতি, অর্পিত কাজ ও কর্মপরিকল্পনা বাস্তবায়ন এবং অবদানের বাস্তব তথ্য বিশ্লেষণ করে নিরপেক্ষ বাংলা মূল্যায়ন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {report && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setReport(null)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI মূল্যায়ন বিশ্লেষণ করছে...</span>
              </>
            ) : (
              <>
                {report ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-4 h-4" />}
                <span>{report ? 'পুনরায় বিশ্লেষণ করুন' : 'AI সদস্য মূল্যায়ন তৈরি করুন'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Top Overview Cards */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-tiro">
              {report.overallSummaryBn}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900">
                <div className="font-bold flex items-center space-x-1.5 mb-1">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>সেরা অবদান ও প্রশংসা</span>
                </div>
                <p className="leading-relaxed">{report.topPerformerNoteBn}</p>
              </div>
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900">
                <div className="font-bold flex items-center space-x-1.5 mb-1">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>সার্বিক উন্নতির ক্ষেত্র</span>
                </div>
                <p className="leading-relaxed">{report.improvementFocusBn}</p>
              </div>
            </div>
          </div>

          {/* Per-Member Insights Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {report.members.map((m) => (
              <div
                key={m.memberId}
                className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{m.memberName}</div>
                    <div className="text-[11px] font-semibold text-indigo-700">{m.designationBn}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-black">
                      <span>প্রস্তাবিত স্কোর: {toBnNum(m.suggestedScore)}/১০০</span>
                    </div>
                    <div className="flex items-center justify-end gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`w-3.5 h-3.5 ${
                            st <= m.suggestedStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Deterministic real stats bar */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <div className="text-xs font-black text-slate-900">{toBnNum(m.attendanceRate)}%</div>
                    <div className="text-[10px] text-slate-500">
                      উপস্থিতি ({toBnNum(m.meetingsAttended)}/{toBnNum(m.totalMeetings)})
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <div className="text-xs font-black text-slate-900">{toBnNum(m.taskCompletionRate)}%</div>
                    <div className="text-[10px] text-slate-500">
                      দায়িত্ব ({toBnNum(m.completedWorksCount)}/{toBnNum(m.assignedWorksCount)})
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <div className="text-xs font-black text-slate-900">{toBnNum(m.activitiesCount)}টি</div>
                    <div className="text-[10px] text-slate-500">কার্যক্রম / অবদান</div>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-tiro">{m.evaluationSummaryBn}</p>

                <div className="text-[11px] space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex items-start space-x-1.5 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    <span><strong>শক্তিশালী দিক:</strong> {m.strengthsBn}</span>
                  </div>
                  <div className="flex items-start space-x-1.5 text-amber-900">
                    <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span><strong>পরামর্শ:</strong> {m.improvementTipBn}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-right">
            * এটি AI-প্রস্তাবিত নিরপেক্ষ মূল্যায়ন সারসংক্ষেপ; আপনার ম্যানুয়াল মূল্যায়ন রেকর্ড স্বয়ংক্রিয়ভাবে পরিবর্তন করা হয়নি।
          </p>

          {/* Hidden Printable A4 Performance Insights */}
          <div className="hidden">
            <div id="ai-member-performance-printable" className="p-6 text-slate-900 font-tiro bg-white">
              <MosqueOfficialLetterhead
                mosque={mosque || undefined}
                reportTitle="কমিটি সদস্য মূল্যায়ন ও পারফরম্যান্স বিশ্লেষণ প্রতিবেদন"
                reportSubTitle={`মেয়াদ: ${report.termTitle} • প্রকৃত মিটিং উপস্থিতি ও দায়িত্ব বাস্তবায়ন ভিত্তিক`}
                language="bn"
              />
              <div className="mt-4 space-y-3 text-xs leading-relaxed">
                <p className="text-justify bg-slate-50 p-3 border border-slate-200 rounded">{report.overallSummaryBn}</p>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 text-left">সদস্য ও পদবী</th>
                      <th className="border border-slate-300 p-2 text-center">উপস্থিতি</th>
                      <th className="border border-slate-300 p-2 text-center">দায়িত্ব বাস্তবায়ন</th>
                      <th className="border border-slate-300 p-2 text-center">প্রস্তাবিত স্কোর</th>
                      <th className="border border-slate-300 p-2 text-left">নিরপেক্ষ মূল্যায়ন ও পরামর্শ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.members.map((m) => (
                      <tr key={m.memberId} className="break-inside-avoid">
                        <td className="border border-slate-300 p-2">
                          <div className="font-bold">{m.memberName}</div>
                          <div className="text-[10px] text-slate-600">{m.designationBn}</div>
                        </td>
                        <td className="border border-slate-300 p-2 text-center">{toBnNum(m.attendanceRate)}%</td>
                        <td className="border border-slate-300 p-2 text-center">{toBnNum(m.taskCompletionRate)}%</td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {toBnNum(m.suggestedScore)}/১০০ ({toBnNum(m.suggestedStars)}★)
                        </td>
                        <td className="border border-slate-300 p-2">
                          <div>{m.evaluationSummaryBn}</div>
                          <div className="text-[10px] text-slate-600 mt-1">পরামর্শ: {m.improvementTipBn}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

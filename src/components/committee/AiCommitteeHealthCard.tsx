import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AiCommitteeHealthCardProps {
  termId?: string;
  onNavigateSection?: (section: string) => void;
}

const toBnDigits = (val: string | number) => {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[+d]);
};

export const AiCommitteeHealthCard: React.FC<AiCommitteeHealthCardProps> = ({
  termId,
  onNavigateSection,
}) => {
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [data, setData] = useState<{
    metrics: {
      hasActiveTerm: boolean;
      activeTermTitle: string;
      startDate: string;
      endDate: string;
      daysRemaining: number;
      totalDays: number;
      elapsedPercent: number;
      isExpired: boolean;
      isNearEnd: boolean;
      totalMembers: number;
      activeMembers: number;
      totalMeetings: number;
      recentMeetings90Days: number;
      totalResolutions: number;
      totalActionPlans: number;
      completedActionPlans: number;
      inProgressActionPlans: number;
      overdueActionPlans: number;
      completionPercent: number;
    };
    aiAssessment: {
      healthScore: number;
      healthStatusLabelBn: string;
      summaryBn: string;
      strengthsBn: string[];
      priorityActionsBn: string[];
    } | null;
  } | null>(null);

  const loadMetrics = async (includeAiCommentary = false) => {
    setErrorMsg('');
    if (includeAiCommentary) {
      setLoadingAi(true);
    } else {
      setLoadingMetrics(true);
    }
    try {
      const res = await api.getCommitteeHealthCheckAi({
        termId,
        includeAiCommentary,
      });
      setData(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'হেলথ চেক তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingMetrics(false);
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    loadMetrics(false);
  }, [termId]);

  const metrics = data?.metrics;
  const ai = data?.aiAssessment;

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 rounded-2xl border border-emerald-200/90 shadow-xs p-5 space-y-4 font-siliguri">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">AI কমিটি হেলথ চেক</h3>
              {ai && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  স্কোর: {toBnDigits(ai.healthScore)}/১০০ • {ai.healthStatusLabelBn}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              বর্তমান কমিটির মেয়াদ, মিটিংয়ের ধারাবাহিকতা ও কর্মপরিকল্পনা বাস্তবায়নের তাৎক্ষণিক স্মার্ট মূল্যায়ন
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadMetrics(true)}
          disabled={loadingAi}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-60 shrink-0 cursor-pointer"
        >
          {loadingAi ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI বিশ্লেষণ করছে...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{ai ? 'পুনরায় AI বিশ্লেষণ করুন' : 'AI হেলথ বিশ্লেষণ দেখুন'}</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* 3 Core Live KPI Cards */}
      {loadingMetrics && !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-24 rounded-xl bg-white/80 border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Remaining Days */}
          <div
            onClick={() => onNavigateSection?.('terms')}
            className={`p-4 rounded-xl border bg-white transition-all cursor-pointer hover:shadow-xs ${
              metrics.isExpired
                ? 'border-rose-300 bg-rose-50/40'
                : metrics.isNearEnd
                ? 'border-amber-300 bg-amber-50/40'
                : 'border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-600">মেয়াদ শেষ হতে বাকি</span>
              <CalendarClock
                className={`w-4 h-4 ${
                  metrics.isExpired ? 'text-rose-600' : metrics.isNearEnd ? 'text-amber-600' : 'text-emerald-600'
                }`}
              />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {metrics.hasActiveTerm
                ? metrics.isExpired
                  ? 'মেয়াদোত্তীর্ণ'
                  : `${toBnDigits(metrics.daysRemaining)} দিন`
                : 'নির্ধারিত নয়'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {metrics.activeTermTitle} ({toBnDigits(metrics.elapsedPercent)}% অতিক্রান্ত)
            </div>
          </div>

          {/* Card 2: Total Meetings */}
          <div
            onClick={() => onNavigateSection?.('meetings')}
            className="p-4 rounded-xl border border-purple-200 bg-white transition-all cursor-pointer hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-600">মোট মিটিং ও রেজুলেশন</span>
              <CalendarCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {toBnDigits(metrics.totalMeetings)} টি মিটিং
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              গত ৯০ দিনে {toBnDigits(metrics.recentMeetings90Days)}টি • মোট রেজুলেশন {toBnDigits(metrics.totalResolutions)}টি
            </div>
          </div>

          {/* Card 3: Action Plan Completion % */}
          <div
            onClick={() => onNavigateSection?.('action-plans')}
            className="p-4 rounded-xl border border-blue-200 bg-white transition-all cursor-pointer hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-600">কর্মপরিকল্পনা বাস্তবায়ন</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900">
                {toBnDigits(metrics.completionPercent)}%
              </div>
              {metrics.overdueActionPlans > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-3 h-3" />
                  বিলম্বিত {toBnDigits(metrics.overdueActionPlans)}টি
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${metrics.completionPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              সম্পন্ন {toBnDigits(metrics.completedActionPlans)} / {toBnDigits(metrics.totalActionPlans)}টি • চলমান {toBnDigits(metrics.inProgressActionPlans)}টি
            </div>
          </div>
        </div>
      ) : null}

      {/* Gemini AI Assessment Commentary Box */}
      {ai && (
        <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-tiro">
              {ai.summaryBn}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {ai.strengthsBn.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-1.5">
                <div className="text-xs font-bold text-emerald-900">ইতিবাচক ও শক্তিশালী দিক</div>
                <ul className="space-y-1 text-xs text-emerald-800">
                  {ai.strengthsBn.map((s, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ai.priorityActionsBn.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 space-y-1.5">
                <div className="text-xs font-bold text-amber-900">অগ্রাধিকার ভিত্তিতে করণীয় পরামর্শ</div>
                <ul className="space-y-1 text-xs text-amber-900">
                  {ai.priorityActionsBn.map((p, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>{p}</span>
                    </li>
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

import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CalendarClock,
  TrendingUp,
  ShieldCheck,
  Loader2,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { api, WaqfPortfolioSummaryResult } from '../../lib/api';
import { formatCurrency } from '../../lib/i18n';

interface WaqfAiPortfolioSummaryCardProps {
  totalAssetsCount: number;
  totalPropertiesCount: number;
  totalTenantsCount: number;
  onOpenRentReminders?: () => void;
}

export const WaqfAiPortfolioSummaryCard: React.FC<WaqfAiPortfolioSummaryCardProps> = ({
  totalAssetsCount,
  totalPropertiesCount,
  totalTenantsCount,
  onOpenRentReminders,
}) => {
  const [summary, setSummary] = useState<WaqfPortfolioSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsExpanded(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('AI সারসংক্ষেপ তৈরিতে নির্ধারিত সময়ের বেশি লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।')),
          45000
        )
      );
      const res = await Promise.race([api.getWaqfPortfolioSummaryAi(), timeoutPromise]);
      setSummary(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'ওয়াকফ ও সম্পদ সারসংক্ষেপ লোড করা যায়নি। সাধারণ তালিকা স্বাভাবিকভাবে ব্যবহার করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/70 border border-emerald-200/80 rounded-2xl shadow-xs overflow-hidden font-siliguri">
      {/* Compact Header Strip */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                ✨ AI ওয়াকফ ও সম্পদ সারসংক্ষেপ
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-baloo">
                {totalPropertiesCount.toLocaleString('bn-BD')} প্রপার্টি • {totalAssetsCount.toLocaleString('bn-BD')} সরঞ্জাম • {totalTenantsCount.toLocaleString('bn-BD')} ভাড়াটিয়া
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-tiro truncate">
              মোট সম্পদ, চলতি মাসের ভাড়া আদায়ের হার ও আসন্ন চুক্তি নবায়নের একনজর সারসংক্ষেপ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenRentReminders && (
            <button
              type="button"
              onClick={onOpenRentReminders}
              className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
            >
              বকেয়া রিমাইন্ডার ড্রাফট
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerateSummary}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>বিশ্লেষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{summary ? 'হালনাগাদ করুন' : 'সারসংক্ষেপ দেখুন'}</span>
              </>
            )}
          </button>

          {summary && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg cursor-pointer"
              title={isExpanded ? 'সংকুচিত করুন' : 'বিস্তারিত দেখুন'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Error State (non-blocking) */}
      {errorMsg && (
        <div className="px-4 pb-3">
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-tiro">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Expanded AI Portfolio Body */}
      {summary && isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-emerald-200/60 space-y-3.5 animate-in fade-in duration-200">
          {/* Headline + Summary Paragraph */}
          <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-700" />
              <span>{summary.headlineBn}</span>
            </div>
            <p className="text-xs text-slate-700 font-tiro leading-relaxed">
              {summary.summaryParagraphBn}
            </p>
          </div>

          {/* Deterministic Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                ভাড়া আদায় ({summary.billingMonthLabelBn})
              </div>
              <div className="text-sm font-black text-emerald-800 font-baloo mt-0.5">
                {summary.metrics.collectionRatePercent.toLocaleString('bn-BD')}%
              </div>
              <div className="text-[10px] text-slate-500 font-baloo">
                আদায় {formatCurrency(summary.metrics.totalCollectedThisMonth)} / {formatCurrency(summary.metrics.totalExpectedMonthlyRent)}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-slate-500">চলতি মাসের বকেয়া</div>
              <div className="text-sm font-black text-rose-700 font-baloo mt-0.5">
                {formatCurrency(summary.metrics.totalDueAmount)}
              </div>
              <div className="text-[10px] text-rose-600 font-baloo">
                {summary.metrics.overdueCount.toLocaleString('bn-BD')} জন ভাড়াটিয়া বকেয়া
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <CalendarClock className="w-3 h-3 text-amber-600" />
                চুক্তি নবায়ন সতর্কতা
              </div>
              <div className="text-sm font-black text-amber-800 font-baloo mt-0.5">
                {(summary.metrics.expiringSoonCount + summary.metrics.expiredLeasesCount).toLocaleString('bn-BD')} টি
              </div>
              <div className="text-[10px] text-slate-500 font-baloo">
                আসন্ন {summary.metrics.expiringSoonCount.toLocaleString('bn-BD')} • মেয়াদোত্তীর্ণ {summary.metrics.expiredLeasesCount.toLocaleString('bn-BD')}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5">
              <div className="text-[10px] font-bold text-slate-500">মোট ওয়াকফ ও সম্পদ মূল্য</div>
              <div className="text-sm font-black text-slate-900 font-baloo mt-0.5">
                {formatCurrency(summary.metrics.propertiesEstimatedValue + summary.metrics.assetsCurrentValue)}
              </div>
              <div className="text-[10px] text-slate-500 font-baloo">
                বিরোধপূর্ণ: {summary.metrics.disputedPropertiesCount.toLocaleString('bn-BD')} • মেরামত: {summary.metrics.assetsNeedingRepairCount.toLocaleString('bn-BD')}
              </div>
            </div>
          </div>

          {/* Collection Status + Upcoming Lease Renewals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ভাড়া আদায় ও করণীয় দিক</span>
              </div>
              <p className="text-[11px] text-slate-700 font-tiro">{summary.collectionStatusBn}</p>
              {summary.actionableHighlightsBn.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-slate-600 font-tiro space-y-0.5 pt-1">
                  {summary.actionableHighlightsBn.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white/90 border border-amber-200/80 rounded-xl p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-amber-700" />
                <span>আসন্ন চুক্তি নবায়ন ও মেয়াদ</span>
              </div>
              {summary.leaseAlerts.length > 0 ? (
                <div className="space-y-1.5">
                  {summary.leaseAlerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.tenantId}
                      className="flex items-center justify-between gap-2 text-[11px] bg-amber-50/70 px-2.5 py-1.5 rounded-lg border border-amber-200/60"
                    >
                      <span className="font-semibold text-slate-800 truncate">
                        {alert.tenantName} ({alert.unitOrShopNo})
                      </span>
                      <span
                        className={`font-baloo font-bold shrink-0 ${
                          alert.alertType === 'EXPIRED' ? 'text-rose-700' : 'text-amber-800'
                        }`}
                      >
                        {alert.alertType === 'EXPIRED'
                          ? `মেয়াদোত্তীর্ণ (${alert.endDate})`
                          : `${alert.daysRemaining.toLocaleString('bn-BD')} দিন বাকি (${alert.endDate})`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : summary.upcomingRenewalsBn.length > 0 ? (
                <ul className="list-disc list-inside text-[11px] text-slate-700 font-tiro space-y-0.5">
                  {summary.upcomingRenewalsBn.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-emerald-700 font-tiro">
                  আগামী ৬০ দিনের মধ্যে মেয়াদোত্তীর্ণ হওয়ার মতো কোনো চুক্তি নেই।
                </p>
              )}
            </div>
          </div>

          {/* Protection Disclaimer Footer */}
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-tiro pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              সকল সংখ্যা ও চুক্তির তারিখ সিস্টেমের প্রকৃত ডাটা থেকে গণনাকৃত; এটি কেবল পর্যালোচনার সারসংক্ষেপ।
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

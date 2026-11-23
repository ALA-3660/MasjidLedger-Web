import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api, CemeteryAiSummaryResult } from '../../lib/api';

interface CemeteryAiSummaryCardProps {
  totalRecordsCount: number;
  onSelectRecordId?: (recordId: string) => void;
}

const REUSE_OPTIONS = [
  { years: 1.5, labelBn: '১.৫ বছর (১৮ মাস)' },
  { years: 2, labelBn: '২ বছর (২৪ মাস — প্রচলিত)' },
  { years: 3, labelBn: '৩ বছর (৩৬ মাস)' },
  { years: 5, labelBn: '৫ বছর (৬০ মাস)' },
];

const AI_TIMEOUT_MS = 45_000;

export const CemeteryAiSummaryCard: React.FC<CemeteryAiSummaryCardProps> = ({
  totalRecordsCount,
  onSelectRecordId,
}) => {
  const [reuseYears, setReuseYears] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [summary, setSummary] = useState<CemeteryAiSummaryResult | null>(null);
  const [showGravesTable, setShowGravesTable] = useState(true);

  const loadSummary = async (targetYears: number = reuseYears) => {
    setIsLoading(true);
    setErrorMsg('');

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI সারসংক্ষেপ লোড হতে বেশি সময় লাগছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const data = await Promise.race([
        api.getCemeterySummaryAndReuseAi({ reuseYears: targetYears }),
        timeoutPromise,
      ]);

      setSummary(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'কবরস্থান সারসংক্ষেপ ও মেয়াদ তথ্য লোড করা যায়নি।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleYearsChange = (nextYears: number) => {
    setReuseYears(nextYears);
    if (summary) {
      loadSummary(nextYears);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-siliguri">
                AI কবরস্থান সারসংক্ষেপ ও পুনঃব্যবহারের মেয়াদ সতর্কতা
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-siliguri">
                সিস্টেম তারিখভিত্তিক গণনা
              </span>
            </div>
            <p className="text-xs text-slate-600 font-tiro mt-0.5">
              নির্ধারিত মেয়াদ পূর্ণ হওয়া পুরনো কবর চিহ্নিতকরণ ও কবরস্থানের সার্বিক অবস্থা (শুধুমাত্র তথ্য-সহায়তা, স্বয়ংক্রিয় পরিবর্তন নয়)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold text-slate-600 font-siliguri">মেয়াদ:</span>
            <select
              value={reuseYears}
              onChange={(e) => handleYearsChange(Number(e.target.value))}
              disabled={isLoading}
              className="text-xs font-bold text-slate-900 bg-transparent outline-none font-baloo cursor-pointer"
            >
              {REUSE_OPTIONS.map((opt) => (
                <option key={opt.years} value={opt.years}>
                  {opt.labelBn}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadSummary(reuseYears)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold font-siliguri flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>বিশ্লেষণ হচ্ছে...</span>
              </>
            ) : summary ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>হালনাগাদ করুন</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>সারসংক্ষেপ ও মেয়াদ দেখুন</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Idle Prompt Hint */}
      {!summary && !isLoading && !errorMsg && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/80 border border-emerald-100 text-xs text-slate-600 font-tiro">
          <span>
            বর্তমানে এই মসজিদে মোট <strong className="font-baloo text-slate-900">{totalRecordsCount}</strong> টি রেকর্ড রয়েছে। মেয়াদ পূর্ণ হওয়া কবর ও সারসংক্ষেপ দেখতে উপরের বাটনে ক্লিক করুন।
          </span>
        </div>
      )}

      {/* Error Fallback */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-tiro">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => loadSummary(reuseYears)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold font-siliguri shrink-0"
          >
            আবার চেষ্টা
          </button>
        </div>
      )}

      {/* Loaded Summary Result */}
      {summary && !isLoading && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Deterministic Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="block text-[11px] text-slate-500 font-siliguri">মোট কবর/প্লট</span>
              <span className="text-lg font-bold text-slate-900 font-baloo">{summary.metrics.totalPlots}</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-200">
              <span className="block text-[11px] text-emerald-700 font-siliguri">দাফনকৃত</span>
              <span className="text-lg font-bold text-emerald-900 font-baloo">{summary.metrics.occupiedCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-blue-200">
              <span className="block text-[11px] text-blue-700 font-siliguri">খালি / উপলব্ধ</span>
              <span className="text-lg font-bold text-blue-900 font-baloo">{summary.metrics.availableCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
              <span className="block text-[11px] text-amber-800 font-siliguri">
                মেয়াদ পূর্ণ ({summary.metrics.reuseYears} বছর+)
              </span>
              <span className="text-lg font-bold text-amber-950 font-baloo">
                {summary.metrics.eligibleTotalCount}
              </span>
              {summary.metrics.eligibleTotalCount > 0 && (
                <span className="block text-[10px] text-amber-800 font-tiro">
                  সাধারণ/অস্থায়ী: {summary.metrics.eligibleGeneralOrTempCount} • স্থায়ী/পারিবারিক: {summary.metrics.eligiblePermanentOrFamilyCount}
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <span className="block text-[11px] text-indigo-800 font-siliguri">আগামী ৯০ দিনে পূর্ণ</span>
              <span className="text-lg font-bold text-indigo-950 font-baloo">{summary.metrics.approachingCount}</span>
            </div>
          </div>

          {/* AI Bengali Narrative Summary */}
          <div className="p-4 rounded-xl bg-white border border-emerald-200/80 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-emerald-950 font-siliguri">{summary.headlineBn}</h4>
              <span className="text-[10px] font-baloo text-slate-400 shrink-0">
                চলতি মাস: {summary.metrics.burialsThisMonth} | চলতি বছর: {summary.metrics.burialsThisYear}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-tiro leading-relaxed">
              {summary.summaryParagraphBn}
            </p>
            {summary.highlightsBn.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {summary.highlightsBn.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 font-tiro">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-900 font-tiro flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{summary.reuseGuidanceBn}</span>
            </div>
          </div>

          {/* Deterministic Eligible & Approaching Graves List */}
          {(summary.eligibleGraves.length > 0 || summary.approachingGraves.length > 0) && (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setShowGravesTable(!showGravesTable)}
                className="w-full px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 font-siliguri hover:bg-slate-100 transition-colors"
              >
                <span>
                  মেয়াদ পূর্ণ ও আসন্ন কবরের তালিকা (মোট {summary.eligibleGraves.length + summary.approachingGraves.length}টি)
                </span>
                {showGravesTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showGravesTable && (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-siliguri">
                      <tr>
                        <th className="py-2 px-3">প্লট ও ব্লক</th>
                        <th className="py-2 px-3">মরহুম/মরহুমা</th>
                        <th className="py-2 px-3">দাফনের তারিখ</th>
                        <th className="py-2 px-3">অতিবাহিত সময়</th>
                        <th className="py-2 px-3">কবরের ধরন</th>
                        <th className="py-2 px-3">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...summary.eligibleGraves, ...summary.approachingGraves].map((g) => (
                        <tr
                          key={g.recordId}
                          onClick={() => onSelectRecordId?.(g.recordId)}
                          className={`hover:bg-emerald-50/40 transition-colors ${
                            onSelectRecordId ? 'cursor-pointer' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-bold text-slate-900 font-baloo">
                            {g.plotNumber}
                            <span className="block text-[10px] font-normal text-slate-500 font-siliguri">
                              {g.block}{g.row ? ` • সারি ${g.row}` : ''}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 font-tiro">{g.deceasedName}</td>
                          <td className="py-2 px-3 text-slate-700 font-baloo">{g.burialDateBn}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 font-baloo">{g.durationLabelBn}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                g.isPermanentOrFamily
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {g.graveTypeLabelBn}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {g.status === 'ELIGIBLE' ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  g.isPermanentOrFamily
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {g.isPermanentOrFamily ? 'মেয়াদ পূর্ণ (স্থায়ী — যাচাই আবশ্যক)' : 'পুনঃব্যবহারের যোগ্য (যাচাই সাপেক্ষে)'}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-baloo">
                                আর {g.daysUntilEligible} দিন বাকি
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Protection Disclaimer Footer */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-tiro pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              সিস্টেমের সংরক্ষিত দাফন তারিখ থেকে সকল সময়সীমা নির্ভুলভাবে গণনা করা হয়েছে। কোনো কবরের স্ট্যাটাস স্বয়ংক্রিয়ভাবে পরিবর্তন করা হয় না।
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

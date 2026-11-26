import React from 'react';
import {
  FileSignature,
  Plus,
  Landmark,
  Hammer,
  Users,
  BookTemplate,
  Printer,
  Edit3,
  Clock,
  CheckCircle2,
  FileWarning,
  ShieldAlert,
  ArrowUpRight,
  Stamp,
  Lock,
} from 'lucide-react';
import {
  AgreementDashboardStats,
  AgreementRecord,
} from '../../types/agreementTypes';
import {
  AGREEMENT_STATUS_META,
  AGREEMENT_STATUS_ORDER,
  isAgreementLockedForDirectEdit,
} from '../../lib/agreementCatalog';

interface AgreementDashboardPanelProps {
  stats: AgreementDashboardStats | null;
  loading: boolean;
  canCreate: boolean;
  onCreateNew: (presetCategory?: string) => void;
  onOpenAllList: (categoryCode?: string, status?: string) => void;
  onOpenWaqfLand: () => void;
  onOpenTemplates: () => void;
  onOpenParties: () => void;
  onSelectPreview: (agreement: AgreementRecord) => void;
  onSelectEdit: (agreement: AgreementRecord) => void;
  onSelectGovernance?: (agreement: AgreementRecord) => void;
}

export const AgreementDashboardPanel: React.FC<AgreementDashboardPanelProps> = ({
  stats,
  loading,
  canCreate,
  onCreateNew,
  onOpenAllList,
  onOpenWaqfLand,
  onOpenTemplates,
  onOpenParties,
  onSelectPreview,
  onSelectEdit,
  onSelectGovernance,
}) => {
  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse border border-slate-200/70" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse border border-slate-200/70" />
      </div>
    );
  }

  const s: AgreementDashboardStats = stats || {
    total: 0,
    byStatus: {
      DRAFT: 0,
      INFORMATION_PENDING: 0,
      AI_REVIEWED: 0,
      UNDER_REVIEW: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      PENDING_SIGNATURE: 0,
      PARTIALLY_SIGNED: 0,
      FULLY_SIGNED: 0,
      EFFECTIVE: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      EXPIRED: 0,
      TERMINATED: 0,
      CANCELLED: 0,
    },
    waqfAndLandCount: 0,
    waqfPendingReviewCount: 0,
    constructionCount: 0,
    partiesCount: 0,
    templatesCount: 0,
    categoriesCount: 13,
    archivedCount: 0,
    expiringSoonCount: 0,
    fullySignedOrEffectiveCount: 0,
    byCategory: [],
    recentAgreements: [],
  };

  const effectiveCount = (s.byStatus.EFFECTIVE || 0) + (s.byStatus.ACTIVE || 0);
  const pendingWorkflowCount =
    (s.byStatus.UNDER_REVIEW || 0) +
    (s.byStatus.PENDING_APPROVAL || 0) +
    (s.byStatus.APPROVED || 0) +
    (s.byStatus.PENDING_SIGNATURE || 0) +
    (s.byStatus.PARTIALLY_SIGNED || 0);

  return (
    <div className="space-y-5">
      {/* Top Count-Only KPI Strip (Zero Financial Totals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onOpenAllList()}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-siliguri">
            <span>মোট চুক্তিপত্র</span>
            <FileSignature className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-baloo tabular-nums">
            {s.total}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-tiro">
            {s.categoriesCount}টি ক্যাটাগরি · {s.templatesCount}টি টেমপ্লেট
          </p>
        </button>

        <button
          type="button"
          onClick={() => onOpenAllList(undefined, 'EFFECTIVE')}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-siliguri">
            <span>কার্যকর চুক্তি (Effective)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-baloo tabular-nums">
            {effectiveCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-tiro">
            সম্পূর্ণ স্বাক্ষরিত: <span className="font-baloo font-semibold text-slate-700">{s.byStatus.FULLY_SIGNED || 0}</span> · খসড়া:{' '}
            <span className="font-baloo font-semibold text-slate-700">{s.byStatus.DRAFT || 0}</span>
          </p>
        </button>

        <button
          type="button"
          onClick={() => onOpenAllList(undefined, 'PENDING_SIGNATURE')}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-siliguri">
            <span>অনুমোদন / স্বাক্ষর অপেক্ষমাণ</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-baloo tabular-nums">
            {pendingWorkflowCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-tiro">
            অনুমোদন {s.byStatus.PENDING_APPROVAL || 0} · স্বাক্ষর {(s.byStatus.PENDING_SIGNATURE || 0) + (s.byStatus.PARTIALLY_SIGNED || 0)} · মেয়াদ আসন্ন {s.expiringSoonCount || 0}
          </p>
        </button>

        <button
          type="button"
          onClick={onOpenWaqfLand}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-siliguri">
            <span>ওয়াকফ, জমি ও রাস্তা</span>
            <Landmark className="w-4 h-4 text-teal-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-800 font-baloo tabular-nums">
            {s.waqfAndLandCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-tiro">
            আইনি পর্যালোচনা বাকি: <span className="font-baloo font-semibold text-amber-700">{s.waqfPendingReviewCount || 0}</span> · আর্কাইভ:{' '}
            <span className="font-baloo font-semibold text-slate-700">{s.archivedCount || 0}</span>
          </p>
        </button>
      </div>

      {/* Status Breakdown Rail */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-siliguri">
              স্ট্যাটাসভিত্তিক চুক্তিপত্রের সংখ্যা (১৪টি ওয়ার্কফ্লো ধাপ)
            </h3>
            <p className="text-xs text-slate-500 font-tiro">
              যেকোনো স্ট্যাটাসে ক্লিক করে সংশ্লিষ্ট চুক্তিগুলো ফিল্টার করুন
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-tiro">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>শুধুমাত্র সংখ্যার হিসাব — কোনো আর্থিক লেনদেন বা বকেয়া সংযুক্ত নয়</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {AGREEMENT_STATUS_ORDER.map((st) => {
            const meta = AGREEMENT_STATUS_META[st];
            const count = st === 'EFFECTIVE' ? effectiveCount : s.byStatus[st] || 0;
            return (
              <button
                key={st}
                type="button"
                onClick={() => onOpenAllList(undefined, st)}
                className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 font-siliguri">
                  <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                  <span className="truncate">{meta.shortBn}</span>
                </div>
                <span className="mt-1 text-lg font-bold text-slate-900 font-baloo tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Recent Agreements + Category Distribution & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Agreements */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-siliguri">
                সাম্প্রতিক চুক্তিপত্রসমূহ
              </h3>
              <p className="text-xs text-slate-500 font-tiro">
                সর্বশেষ সংরক্ষিত ও হালনাগাদকৃত দাপ্তরিক চুক্তি
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAllList()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 font-siliguri"
            >
              <span>সব দেখুন</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {s.recentAgreements.length === 0 ? (
            <div className="p-8 text-center">
              <FileSignature className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 font-siliguri">
                এখনো কোনো চুক্তিপত্র তৈরি করা হয়নি
              </p>
              <p className="text-xs text-slate-500 font-tiro mt-1 max-w-md mx-auto">
                নির্মাণ, ওয়াকফ ও জমি ব্যবস্থাপনা, রাস্তা ও চলাচলের অধিকার বা সেবা প্রদান সংক্রান্ত নতুন চুক্তিপত্র তৈরি করুন অথবা টেমপ্লেট লাইব্রেরি থেকে শুরু করুন।
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => onCreateNew()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>নতুন চুক্তিপত্র তৈরি করুন</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold font-siliguri hover:bg-slate-50"
                >
                  <BookTemplate className="w-3.5 h-3.5" />
                  <span>টেমপ্লেট লাইব্রেরি দেখুন</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {s.recentAgreements.map((ag) => {
                const stMeta = AGREEMENT_STATUS_META[ag.status] || AGREEMENT_STATUS_META.DRAFT;
                const locked = isAgreementLockedForDirectEdit(ag);
                return (
                  <div
                    key={ag.id}
                    className="px-4 py-3 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-800 font-baloo tabular-nums">
                          {ag.agreementNumber}
                        </span>
                        <span className="text-[10px] font-baloo text-slate-500">v{ag.versionNumber || 1}</span>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium font-siliguri text-slate-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${stMeta.dotClass}`} />
                          {stMeta.shortBn}
                        </span>
                        {locked && (
                          <span title="স্বাক্ষরিত — সরাসরি সম্পাদনা লকড" className="text-amber-700">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                        {ag.isWaqfOrLandRelated && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] font-medium text-teal-700 font-siliguri">
                              ওয়াকফ/জমি
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 font-siliguri truncate mt-0.5">
                        {ag.title}
                      </p>
                      <p className="text-xs text-slate-500 font-tiro truncate mt-0.5">
                        {ag.categoryNameBn} · তারিখ: <span className="font-baloo">{ag.agreementDate}</span> ·{' '}
                        {ag.parties.length} পক্ষ
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectGovernance && (
                        <button
                          type="button"
                          onClick={() => onSelectGovernance(ag)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-xs font-medium text-indigo-800 hover:bg-indigo-100 font-siliguri"
                        >
                          <Stamp className="w-3.5 h-3.5" />
                          <span>অনুমোদন ও স্বাক্ষর</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectPreview(ag)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white hover:border-emerald-300 font-siliguri"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                        <span>প্রিন্ট / PDF</span>
                      </button>
                      {canCreate && !locked && (
                        <button
                          type="button"
                          onClick={() => onSelectEdit(ag)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white hover:border-slate-300 font-siliguri"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>সম্পাদনা</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Rail: Quick Launch & Category Distribution */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 font-siliguri mb-3">
              দ্রুত শুরু করুন
            </h3>
            <div className="space-y-2">
              {canCreate && (
                <>
                  <button
                    type="button"
                    onClick={() => onCreateNew('CONSTRUCTION')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Hammer className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 font-siliguri">নির্মাণ ও মেরামত চুক্তি</p>
                        <p className="text-[11px] text-slate-500 font-tiro">পরিমাপ, সামগ্রী ও মান যাচাইসহ</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateNew('WAQF_PROPERTY')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Landmark className="w-4 h-4 text-teal-700 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 font-siliguri">ওয়াকফ ও জমি চুক্তি</p>
                        <p className="text-[11px] text-slate-500 font-tiro">মৌজা, খতিয়ান, দাগ ও আইনি সতর্কতাসহ</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateNew('ROAD_RIGHT_OF_WAY')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileWarning className="w-4 h-4 text-sky-700 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 font-siliguri">রাস্তা ও চলাচলের অধিকার</p>
                        <p className="text-[11px] text-slate-500 font-tiro">দৈর্ঘ্য-প্রস্থ ও পক্ষের অবদানসহ</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onOpenParties}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 font-siliguri">পক্ষ ও প্রতিনিধি ডিরেক্টরি</p>
                    <p className="text-[11px] text-slate-500 font-tiro">রেজুলেশন ও ক্ষমতার ভিত্তিসহ তালিকা</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-baloo text-slate-700">{s.partiesCount}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-800 font-siliguri mb-2.5">
              ক্যাটাগরি অনুযায়ী চুক্তি ({s.categoriesCount})
            </h3>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
              {s.byCategory.map((cat) => (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => onOpenAllList(cat.code)}
                  className="w-full py-2 flex items-center justify-between text-left hover:text-emerald-700 transition-colors"
                >
                  <span className="text-xs text-slate-700 font-tiro truncate pr-2">{cat.nameBn}</span>
                  <span className="text-xs font-bold font-baloo tabular-nums text-slate-800 shrink-0">
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

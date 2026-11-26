import React, { useState } from 'react';
import {
  Search,
  Printer,
  Edit3,
  Trash2,
  Plus,
  Landmark,
  AlertTriangle,
  ArrowUpDown,
  FileSignature,
  Users,
  X,
  ShieldAlert,
  Stamp,
  Lock,
  History,
} from 'lucide-react';
import {
  AgreementCategoryDef,
  AgreementRecord,
  AgreementStatus,
} from '../../types/agreementTypes';
import {
  AGREEMENT_STATUS_META,
  AGREEMENT_STATUS_ORDER,
  WRITTEN_PAYMENT_MODE_LABELS,
  buildRequiredSignerSlots,
  isAgreementLockedForDirectEdit,
} from '../../lib/agreementCatalog';
import type { GovernanceModalTab } from './AgreementGovernanceModal';

interface AgreementListViewProps {
  title: string;
  subtitle: string;
  waqfLandOnly?: boolean;
  agreements: AgreementRecord[];
  categories: AgreementCategoryDef[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  statusFilter: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  canCreate: boolean;
  canDelete: boolean;
  onSearchChange: (v: string) => void;
  onCategoryFilterChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onSortChange: (sortBy: string, sortDir: 'asc' | 'desc') => void;
  onCreateNew: (presetCategory?: string) => void;
  onSelectPreview: (ag: AgreementRecord) => void;
  onSelectEdit: (ag: AgreementRecord) => void;
  onSelectAiReview?: (ag: AgreementRecord) => void;
  onSelectGovernance?: (ag: AgreementRecord, tab?: GovernanceModalTab) => void;
  onQuickStatusChange: (id: string, status: AgreementStatus) => Promise<void>;
  onDeleteAgreement: (id: string) => Promise<void>;
}

export const AgreementListView: React.FC<AgreementListViewProps> = ({
  title,
  subtitle,
  waqfLandOnly = false,
  agreements,
  categories,
  loading,
  search,
  categoryFilter,
  statusFilter,
  sortBy,
  sortDir,
  canCreate,
  canDelete,
  onSearchChange,
  onCategoryFilterChange,
  onStatusFilterChange,
  onSortChange,
  onCreateNew,
  onSelectPreview,
  onSelectEdit,
  onSelectAiReview,
  onSelectGovernance,
  onQuickStatusChange,
  onDeleteAgreement,
}) => {
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<AgreementRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const safeQuickStatuses: AgreementStatus[] = [
    'DRAFT',
    'INFORMATION_PENDING',
    'AI_REVIEWED',
    'UNDER_REVIEW',
    'PENDING_APPROVAL',
  ];

  const visibleCategories = waqfLandOnly
    ? categories.filter(
        (c) =>
          c.code === 'LAND_PROPERTY' ||
          c.code === 'WAQF_PROPERTY' ||
          c.code === 'ROAD_RIGHT_OF_WAY' ||
          c.formProfile === 'LAND_WAQF' ||
          c.formProfile === 'ROAD_RIGHT'
      )
    : categories;

  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    setDeleting(true);
    try {
      await onDeleteAgreement(confirmDeleteItem.id);
      setConfirmDeleteItem(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: AgreementStatus) => {
    setStatusUpdatingId(id);
    try {
      await onQuickStatusChange(id, nextStatus);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-siliguri flex items-center gap-2">
            {waqfLandOnly ? (
              <Landmark className="w-4 h-4 text-teal-700" />
            ) : (
              <FileSignature className="w-4 h-4 text-emerald-700" />
            )}
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 font-tiro mt-0.5">{subtitle}</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => onCreateNew(waqfLandOnly ? 'WAQF_PROPERTY' : undefined)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{waqfLandOnly ? 'নতুন ওয়াকফ / জমি চুক্তি' : 'নতুন চুক্তিপত্র'}</span>
          </button>
        )}
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 grid grid-cols-1 md:grid-cols-12 gap-2.5">
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="চুক্তি নং, শিরোনাম, পক্ষ, মৌজা বা দাগ খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">সকল ক্যাটাগরি</option>
            {visibleCategories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.nameBn}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            {AGREEMENT_STATUS_ORDER.map((st) => (
              <option key={st} value={st}>
                {AGREEMENT_STATUS_META[st].shortBn}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex items-center gap-1.5">
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(':');
              onSortChange(field, (dir as 'asc' | 'desc') || 'desc');
            }}
            className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="updatedAt:desc">সর্বশেষ হালনাগাদ (নতুন আগে)</option>
            <option value="agreementDate:desc">চুক্তির তারিখ (নতুন আগে)</option>
            <option value="agreementDate:asc">চুক্তির তারিখ (পুরাতন আগে)</option>
            <option value="agreementNumber:desc">চুক্তি নম্বর (বড় থেকে ছোট)</option>
            <option value="title:asc">শিরোনাম (ক-হ)</option>
            <option value="status:asc">স্ট্যাটাস অনুযায়ী</option>
          </select>
          <span className="p-2 text-slate-400 hidden lg:inline-flex" title="সর্টিং">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 font-tiro">
          <span>
            মোট পাওয়া গেছে: <strong className="font-baloo text-slate-900">{agreements.length}</strong> টি চুক্তিপত্র
          </span>
          {(search || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onCategoryFilterChange('ALL');
                onStatusFilterChange('ALL');
              }}
              className="text-emerald-700 hover:underline font-siliguri font-medium"
            >
              ফিল্টার রিসেট
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-tiro">
            চুক্তিপত্র তালিকা লোড হচ্ছে...
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-10 text-center">
            <FileSignature className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-slate-700 font-siliguri">
              কোনো চুক্তিপত্র পাওয়া যায়নি
            </p>
            <p className="text-xs text-slate-500 font-tiro mt-1">
              ফিল্টার পরিবর্তন করুন অথবা নতুন চুক্তিপত্র তৈরি করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 font-siliguri bg-slate-50/50">
                  <th className="py-2.5 px-4">চুক্তি নং ও শিরোনাম</th>
                  <th className="py-2.5 px-3">ক্যাটাগরি ও ধরন</th>
                  <th className="py-2.5 px-3">পক্ষসমূহ</th>
                  <th className="py-2.5 px-3">তারিখ ও মেয়াদ</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-4 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {agreements.map((ag) => {
                  const stMeta = AGREEMENT_STATUS_META[ag.status] || AGREEMENT_STATUS_META.DRAFT;
                  const locked = isAgreementLockedForDirectEdit(ag);
                  const hasProtectedRecords =
                    locked ||
                    (ag.approvalRecords?.length || 0) > 0 ||
                    (ag.signatures?.length || 0) > 0;
                  const requiredCount = buildRequiredSignerSlots(ag).length;
                  const currentVer = ag.versionNumber || 1;
                  const signedCount = (ag.signatures || []).filter(
                    (s) => (s.versionNumber || 1) === currentVer
                  ).length;
                  const partyPreview = ag.parties
                    .slice(0, 2)
                    .map((p) => `${p.roleLabel}: ${p.name}`)
                    .join(' · ');

                  return (
                    <tr key={ag.id} className="hover:bg-slate-50/60 transition-colors align-top">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-emerald-800 font-baloo tabular-nums">
                            {ag.agreementNumber}
                          </span>
                          <span className="text-[10px] font-baloo font-semibold text-slate-600 px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                            v{currentVer}
                          </span>
                          {ag.isAmendment && (
                            <span className="text-[10px] font-siliguri font-semibold text-indigo-700 px-1.5 rounded bg-indigo-50 border border-indigo-200">
                              সংশোধনী
                            </span>
                          )}
                          {locked && (
                            <span title="স্বাক্ষরিত — সরাসরি সম্পাদনা লকড (নতুন ভার্সন/সংশোধনী করুন)" className="inline-flex items-center text-amber-700">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          {ag.landWaqfDetails?.waqfLegalReviewRequired &&
                            ag.waqfLegalReviewStatus !== 'CLEARED' && (
                              <span
                                title="ওয়াকফ/আইনি পর্যালোচনা ছাড়পত্র বাকি আছে"
                                className="inline-flex items-center text-amber-600"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectPreview(ag)}
                          className="text-left font-semibold text-slate-900 hover:text-emerald-700 font-siliguri mt-0.5 line-clamp-2"
                        >
                          {ag.title}
                        </button>
                        {ag.landWaqfDetails?.mouza && (
                          <p className="text-[11px] text-teal-700 font-tiro mt-0.5">
                            মৌজা: {ag.landWaqfDetails.mouza}
                            {ag.landWaqfDetails.khatianNumber ? ` · খতিয়ান: ${ag.landWaqfDetails.khatianNumber}` : ''}
                            {ag.landWaqfDetails.dagNumber ? ` · দাগ: ${ag.landWaqfDetails.dagNumber}` : ''}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800 font-siliguri">{ag.categoryNameBn}</p>
                        <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                          {WRITTEN_PAYMENT_MODE_LABELS[ag.writtenFinancialTerms?.mode || 'NON_FINANCIAL']}
                        </p>
                      </td>

                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="flex items-center gap-1.5 text-slate-700 font-siliguri font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{ag.parties.length} পক্ষ</span>
                          {requiredCount > 0 && (
                            <span className="text-[10px] font-baloo text-emerald-700">
                              (স্বাক্ষর {signedCount}/{requiredCount})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">
                          {partyPreview || 'পক্ষ নির্ধারিত নয়'}
                        </p>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="font-baloo text-slate-800 tabular-nums">{ag.agreementDate}</p>
                        {ag.expiryDate ? (
                          <p className="text-[11px] text-slate-500 font-tiro">
                            মেয়াদ: <span className="font-baloo">{ag.expiryDate}</span>
                          </p>
                        ) : ag.durationText ? (
                          <p className="text-[11px] text-slate-500 font-tiro">{ag.durationText}</p>
                        ) : null}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {canCreate && !locked && safeQuickStatuses.includes(ag.status) ? (
                          <select
                            value={ag.status}
                            disabled={statusUpdatingId === ag.id}
                            onChange={(e) => handleStatusChange(ag.id, e.target.value as AgreementStatus)}
                            className={`text-[11px] font-semibold font-siliguri px-2 py-1 rounded-md border ${stMeta.bgClass} ${stMeta.textClass} ${stMeta.borderClass} focus:outline-none`}
                          >
                            {safeQuickStatuses.map((st) => (
                              <option key={st} value={st} className="bg-white text-slate-800">
                                {AGREEMENT_STATUS_META[st].shortBn}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectGovernance && onSelectGovernance(ag, 'approval')}
                            title="অনুমোদন ও স্বাক্ষর ওয়ার্কফ্লো খুলুন"
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold font-siliguri px-2 py-1 rounded-md border ${stMeta.bgClass} ${stMeta.textClass} ${stMeta.borderClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${stMeta.dotClass}`} />
                            {stMeta.shortBn}
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {onSelectGovernance && (
                            <button
                              type="button"
                              onClick={() => onSelectGovernance(ag, 'approval')}
                              title="অনুমোদন, ডিজিটাল স্বাক্ষর, ভার্সন ও আর্কাইভ"
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-[11px] font-semibold font-siliguri"
                            >
                              <Stamp className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">অনুমোদন/স্বাক্ষর</span>
                            </button>
                          )}
                          {onSelectAiReview && (
                            <button
                              type="button"
                              onClick={() => onSelectAiReview(ag)}
                              title="AI ঝুঁকি ও অসঙ্গতি পর্যালোচনা"
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectPreview(ag)}
                            title="প্রিন্ট / PDF প্রিভিউ"
                            className="p-1.5 rounded-lg border border-slate-200 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canCreate &&
                            (locked ? (
                              onSelectGovernance && (
                                <button
                                  type="button"
                                  onClick={() => onSelectGovernance(ag, 'versions')}
                                  title="নতুন ভার্সন বা সংশোধনী (Amendment) তৈরি করুন"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectEdit(ag)}
                                title="সম্পাদনা"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            ))}
                          {canDelete && !hasProtectedRecords && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteItem(ag)}
                              title="মুছে ফেলুন (শুধুমাত্র খসড়া/অননুমোদিত)"
                              className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Safe Delete Confirmation Modal (No window.confirm) */}
      {confirmDeleteItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-bold font-siliguri">চুক্তিপত্র মুছে ফেলার নিশ্চিতকরণ</h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-600 font-tiro leading-relaxed">
              আপনি কি নিশ্চিতভাবে <strong className="font-baloo text-slate-900">{confirmDeleteItem.agreementNumber}</strong> —{' '}
              <strong className="font-siliguri text-slate-900">{confirmDeleteItem.title}</strong> চুক্তিপত্রটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteItem(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 font-siliguri disabled:opacity-60"
              >
                {deleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

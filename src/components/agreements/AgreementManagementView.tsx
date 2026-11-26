import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Users,
  BookTemplate,
  Landmark,
  Printer,
  RefreshCw,
  FileSignature,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Archive,
} from 'lucide-react';
import { Mosque, User } from '../../types';
import {
  AgreementAiDraftResult,
  AgreementCategoryDef,
  AgreementDashboardStats,
  AgreementPartyDirectoryItem,
  AgreementRecord,
  AgreementStatus,
  AgreementTemplateDef,
  AgreementTemplatePublishStatus,
} from '../../types/agreementTypes';
import { api } from '../../lib/api';
import {
  hasClientAgreementPermission,
  isAgreementLockedForDirectEdit,
} from '../../lib/agreementCatalog';
import { AgreementDashboardPanel } from './AgreementDashboardPanel';
import { AgreementListView } from './AgreementListView';
import { AgreementFormView } from './AgreementFormView';
import { AgreementPartiesView } from './AgreementPartiesView';
import { AgreementTemplateLibraryView } from './AgreementTemplateLibraryView';
import { AgreementPrintPreviewModal } from './AgreementPrintPreviewModal';
import { AgreementAiAssistantModal } from './AgreementAiAssistantModal';
import { AgreementReviewPanelModal } from './AgreementReviewPanelModal';
import {
  AgreementGovernanceModal,
  GovernanceModalTab,
} from './AgreementGovernanceModal';
import { AgreementArchiveReportView } from './AgreementArchiveReportView';

export type AgreementSubTab =
  | 'dashboard'
  | 'create'
  | 'all'
  | 'parties'
  | 'templates'
  | 'waqf-land'
  | 'print-pdf'
  | 'archive';

interface AgreementManagementViewProps {
  mosque?: Mosque | null;
  currentUser?: User | null;
  onAgreementCountChange?: (count: number) => void;
}

export const AgreementManagementView: React.FC<AgreementManagementViewProps> = ({
  mosque,
  currentUser,
  onAgreementCountChange,
}) => {
  const [subTab, setSubTab] = useState<AgreementSubTab>('dashboard');
  const [stats, setStats] = useState<AgreementDashboardStats | null>(null);
  const [agreements, setAgreements] = useState<AgreementRecord[]>([]);
  const [waqfAgreements, setWaqfAgreements] = useState<AgreementRecord[]>([]);
  const [categories, setCategories] = useState<AgreementCategoryDef[]>([]);
  const [templates, setTemplates] = useState<AgreementTemplateDef[]>([]);
  const [parties, setParties] = useState<AgreementPartyDirectoryItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [partySearch, setPartySearch] = useState('');

  // Create / Edit / Preview / AI Review state
  const [editingAgreement, setEditingAgreement] = useState<AgreementRecord | null>(null);
  const [presetCategoryCode, setPresetCategoryCode] = useState<string | undefined>(undefined);
  const [presetTemplate, setPresetTemplate] = useState<AgreementTemplateDef | null>(null);
  const [initialAiDraft, setInitialAiDraft] = useState<AgreementAiDraftResult | null>(null);
  const [showQuickAiDraftModal, setShowQuickAiDraftModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<AgreementRecord | null>(null);
  const [governanceTarget, setGovernanceTarget] = useState<AgreementRecord | null>(null);
  const [governanceInitialTab, setGovernanceInitialTab] = useState<GovernanceModalTab>('approval');
  const [modalPreviewAgreement, setModalPreviewAgreement] = useState<AgreementRecord | null>(null);
  const [selectedPrintAgreementId, setSelectedPrintAgreementId] = useState<string>('');

  // Client RBAC checks (always double-enforced on backend with 16 granular permissions)
  const canCreate =
    hasClientAgreementPermission(currentUser, 'agreement.create') ||
    hasClientAgreementPermission(currentUser, 'agreement.edit');
  const canDelete = hasClientAgreementPermission(currentUser, 'agreement.delete');
  const canManageCatalog = hasClientAgreementPermission(currentUser, 'agreement.manage_templates');
  const canViewReports = hasClientAgreementPermission(currentUser, 'agreement.view_reports');
  const canManageArchive =
    hasClientAgreementPermission(currentUser, 'agreement.approve') ||
    hasClientAgreementPermission(currentUser, 'agreement.reject');

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadCoreCatalogAndStats = useCallback(async () => {
    try {
      const [statsRes, catsRes, tplsRes] = await Promise.all([
        api.getAgreementDashboardStats(),
        api.getAgreementCategories(),
        api.getAgreementTemplates(),
      ]);
      setStats(statsRes);
      setCategories(catsRes);
      setTemplates(tplsRes);
      if (onAgreementCountChange) {
        onAgreementCountChange(statsRes.total || 0);
      }
    } catch (err: any) {
      showNotice('error', err?.message || 'চুক্তিপত্র তথ্য লোড করতে সমস্যা হয়েছে।');
    }
  }, [onAgreementCountChange, showNotice]);

  const loadAgreementsList = useCallback(async () => {
    setLoading(true);
    try {
      const [allList, waqfList] = await Promise.all([
        api.getAgreements({
          search,
          categoryCode: categoryFilter,
          status: statusFilter,
          sortBy,
          sortDir,
        }),
        api.getAgreements({
          search,
          categoryCode: categoryFilter,
          status: statusFilter,
          waqfLandOnly: true,
          sortBy,
          sortDir,
        }),
      ]);
      setAgreements(allList);
      setWaqfAgreements(waqfList);
      if (!selectedPrintAgreementId && allList.length > 0) {
        setSelectedPrintAgreementId(allList[0].id);
      }
    } catch (err: any) {
      showNotice('error', err?.message || 'চুক্তিপত্র তালিকা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, sortBy, sortDir, selectedPrintAgreementId, showNotice]);

  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAgreementPartiesDirectory(partySearch);
      setParties(data);
    } catch (err: any) {
      showNotice('error', err?.message || 'পক্ষসমূহের তালিকা লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [partySearch, showNotice]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCoreCatalogAndStats(), loadAgreementsList(), loadParties()]);
    } finally {
      setLoading(false);
    }
  }, [loadCoreCatalogAndStats, loadAgreementsList, loadParties]);

  useEffect(() => {
    loadCoreCatalogAndStats();
  }, [loadCoreCatalogAndStats]);

  useEffect(() => {
    loadAgreementsList();
  }, [loadAgreementsList]);

  useEffect(() => {
    if (subTab === 'parties') {
      loadParties();
    }
  }, [subTab, loadParties]);

  const handleOpenCreate = (catCode?: string) => {
    setEditingAgreement(null);
    setPresetTemplate(null);
    setInitialAiDraft(null);
    setPresetCategoryCode(catCode);
    setSubTab('create');
  };

  const handleOpenGovernance = (ag: AgreementRecord, tab: GovernanceModalTab = 'approval') => {
    setModalPreviewAgreement(null);
    setGovernanceInitialTab(tab);
    setGovernanceTarget(ag);
  };

  const handleGovernanceUpdated = async (updated: AgreementRecord, toastMsg?: string) => {
    setGovernanceTarget(updated);
    if (modalPreviewAgreement && modalPreviewAgreement.id === updated.id) {
      setModalPreviewAgreement(updated);
    }
    if (toastMsg) showNotice('success', toastMsg);
    await Promise.all([loadCoreCatalogAndStats(), loadAgreementsList()]);
  };

  const handleOpenEdit = (ag: AgreementRecord) => {
    if (isAgreementLockedForDirectEdit(ag)) {
      showNotice(
        'error',
        'স্বাক্ষরিত বা কার্যকর চুক্তিপত্র সরাসরি সম্পাদনা করা যায় না। অনুগ্রহ করে নতুন ভার্সন অথবা সংশোধনী চুক্তি তৈরি করুন।'
      );
      handleOpenGovernance(ag, 'versions');
      return;
    }
    setEditingAgreement(ag);
    setPresetTemplate(null);
    setInitialAiDraft(null);
    setPresetCategoryCode(undefined);
    setModalPreviewAgreement(null);
    setSubTab('create');
  };

  const handleUseTemplate = (tpl: AgreementTemplateDef) => {
    setEditingAgreement(null);
    setInitialAiDraft(null);
    setPresetTemplate(tpl);
    setPresetCategoryCode(tpl.categoryCode);
    setSubTab('create');
  };

  const handleApplyQuickAiDraft = (draft: AgreementAiDraftResult) => {
    setEditingAgreement(null);
    setPresetTemplate(null);
    setPresetCategoryCode(draft.detectedCategoryCode);
    setInitialAiDraft(draft);
    setShowQuickAiDraftModal(false);
    setSubTab('create');
  };

  const handleSaveAgreement = async (payload: Partial<AgreementRecord>, editingId?: string) => {
    let saved: AgreementRecord;
    if (editingId) {
      saved = await api.updateAgreement(editingId, payload);
      showNotice('success', `চুক্তিপত্র (${saved.agreementNumber}) সফলভাবে হালনাগাদ হয়েছে।`);
    } else {
      saved = await api.createAgreement(payload);
      showNotice('success', `নতুন চুক্তিপত্র (${saved.agreementNumber}) সফলভাবে সংরক্ষিত হয়েছে।`);
    }
    setEditingAgreement(null);
    setPresetTemplate(null);
    setInitialAiDraft(null);
    setPresetCategoryCode(undefined);
    setSelectedPrintAgreementId(saved.id);
    await refreshAll();
    setSubTab('all');
    setModalPreviewAgreement(saved);
  };

  const handleQuickStatusChange = async (id: string, status: AgreementStatus) => {
    try {
      const updated = await api.updateAgreementStatus(id, status);
      showNotice('success', `${updated.agreementNumber} এর স্ট্যাটাস হালনাগাদ হয়েছে।`);
      await Promise.all([loadCoreCatalogAndStats(), loadAgreementsList()]);
    } catch (err: any) {
      showNotice('error', err?.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
    }
  };

  const handleDeleteAgreement = async (id: string) => {
    try {
      await api.deleteAgreement(id);
      showNotice('success', 'চুক্তিপত্রটি সফলভাবে মুছে ফেলা হয়েছে।');
      if (selectedPrintAgreementId === id) {
        setSelectedPrintAgreementId('');
      }
      await refreshAll();
    } catch (err: any) {
      showNotice('error', err?.message || 'চুক্তিপত্র মুছে ফেলা যায়নি।');
    }
  };

  const handleOpenAgreementById = async (agreementId: string) => {
    const local = agreements.find((a) => a.id === agreementId);
    if (local) {
      setModalPreviewAgreement(local);
      return;
    }
    try {
      const fetched = await api.getAgreementById(agreementId);
      setModalPreviewAgreement(fetched);
    } catch (err: any) {
      showNotice('error', err?.message || 'চুক্তিপত্রটি খোলা যায়নি।');
    }
  };

  const SUB_TABS: Array<{ id: AgreementSubTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    ...(canCreate ? [{ id: 'create' as AgreementSubTab, label: editingAgreement ? 'সম্পাদনা' : 'নতুন চুক্তিপত্র', icon: FilePlus2 }] : []),
    { id: 'all', label: 'সব চুক্তিপত্র', icon: Files, count: stats?.total },
    { id: 'waqf-land', label: 'ওয়াকফ ও জমি চুক্তি', icon: Landmark, count: stats?.waqfAndLandCount },
    { id: 'parties', label: 'পক্ষসমূহ', icon: Users, count: stats?.partiesCount },
    { id: 'templates', label: 'টেমপ্লেট লাইব্রেরি', icon: BookTemplate, count: templates.length },
    { id: 'print-pdf', label: 'প্রিন্ট / PDF ভিউ', icon: Printer },
    ...(canViewReports ? [{ id: 'archive' as AgreementSubTab, label: 'আর্কাইভ ও রিপোর্ট', icon: Archive, count: stats?.archivedCount }] : []),
  ];

  const selectedPrintAgreement =
    agreements.find((a) => a.id === selectedPrintAgreementId) || agreements[0] || null;

  return (
    <div className="space-y-5">
      {/* Module Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-siliguri leading-tight">
                চুক্তিপত্র ব্যবস্থাপনা (Agreement Management)
              </h2>
              <p className="text-xs text-slate-500 font-tiro mt-0.5">
                মসজিদের নির্মাণ, ওয়াকফ ও জমি, রাস্তা ও চলাচলের অধিকার, সেবা ও দাপ্তরিক চুক্তিপত্র — সম্পূর্ণ নথিভিত্তিক ও হিসাব-বহির্ভূত সংরক্ষণ ব্যবস্থা
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowQuickAiDraftModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold font-siliguri"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI দিয়ে খসড়া তৈরি</span>
              </button>
            )}
            <button
              type="button"
              onClick={refreshAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (t.id !== 'create') {
                    setEditingAgreement(null);
                    setPresetTemplate(null);
                    setInitialAiDraft(null);
                  }
                  setSubTab(t.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold font-siliguri whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
                {typeof t.count === 'number' && (
                  <span
                    className={`text-[11px] font-baloo tabular-nums ${
                      active ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    ({t.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Feedback Toast */}
      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs font-siliguri flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Sub-Tab Views */}
      {subTab === 'dashboard' && (
        <AgreementDashboardPanel
          stats={stats}
          loading={loading}
          canCreate={canCreate}
          onCreateNew={handleOpenCreate}
          onOpenAllList={(cat, st) => {
            setCategoryFilter(cat || 'ALL');
            setStatusFilter(st || 'ALL');
            setSubTab('all');
          }}
          onOpenWaqfLand={() => {
            setCategoryFilter('ALL');
            setStatusFilter('ALL');
            setSubTab('waqf-land');
          }}
          onOpenTemplates={() => setSubTab('templates')}
          onOpenParties={() => setSubTab('parties')}
          onSelectPreview={setModalPreviewAgreement}
          onSelectEdit={handleOpenEdit}
          onSelectGovernance={(ag) => handleOpenGovernance(ag, 'approval')}
        />
      )}

      {subTab === 'create' && canCreate && (
        <AgreementFormView
          key={editingAgreement?.id || presetTemplate?.id || initialAiDraft?.generatedAt || presetCategoryCode || 'new'}
          mosque={mosque}
          categories={categories}
          templates={templates}
          editingAgreement={editingAgreement}
          presetCategoryCode={presetCategoryCode}
          presetTemplate={presetTemplate}
          initialAiDraft={initialAiDraft}
          onSave={handleSaveAgreement}
          onCancel={() => {
            setEditingAgreement(null);
            setPresetTemplate(null);
            setInitialAiDraft(null);
            setSubTab('all');
          }}
        />
      )}

      {subTab === 'all' && (
        <AgreementListView
          title="সব চুক্তিপত্র (All Agreements)"
          subtitle="মসজিদের সকল ক্যাটাগরির চুক্তিপত্রের মাস্টার তালিকা, ফিল্টার, সর্টিং ও A4 প্রিন্ট/PDF"
          agreements={agreements}
          categories={categories}
          loading={loading}
          search={search}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          sortBy={sortBy}
          sortDir={sortDir}
          canCreate={canCreate}
          canDelete={canDelete}
          onSearchChange={setSearch}
          onCategoryFilterChange={setCategoryFilter}
          onStatusFilterChange={setStatusFilter}
          onSortChange={(sb, sd) => {
            setSortBy(sb);
            setSortDir(sd);
          }}
          onCreateNew={handleOpenCreate}
          onSelectPreview={setModalPreviewAgreement}
          onSelectEdit={handleOpenEdit}
          onSelectAiReview={setReviewTarget}
          onSelectGovernance={handleOpenGovernance}
          onQuickStatusChange={handleQuickStatusChange}
          onDeleteAgreement={handleDeleteAgreement}
        />
      )}

      {subTab === 'waqf-land' && (
        <AgreementListView
          title="ওয়াকফ ও জমি-সংক্রান্ত চুক্তিপত্র"
          subtitle="জমি ও সম্পত্তি ব্যবস্থাপনা, ওয়াকফ সম্পত্তি ব্যবহার এবং রাস্তা ও চলাচলের অধিকার সংক্রান্ত চুক্তিসমূহ"
          waqfLandOnly
          agreements={waqfAgreements}
          categories={categories}
          loading={loading}
          search={search}
          categoryFilter={categoryFilter}
          statusFilter={statusFilter}
          sortBy={sortBy}
          sortDir={sortDir}
          canCreate={canCreate}
          canDelete={canDelete}
          onSearchChange={setSearch}
          onCategoryFilterChange={setCategoryFilter}
          onStatusFilterChange={setStatusFilter}
          onSortChange={(sb, sd) => {
            setSortBy(sb);
            setSortDir(sd);
          }}
          onCreateNew={handleOpenCreate}
          onSelectPreview={setModalPreviewAgreement}
          onSelectEdit={handleOpenEdit}
          onSelectAiReview={setReviewTarget}
          onSelectGovernance={handleOpenGovernance}
          onQuickStatusChange={handleQuickStatusChange}
          onDeleteAgreement={handleDeleteAgreement}
        />
      )}

      {subTab === 'parties' && (
        <AgreementPartiesView
          parties={parties}
          loading={loading}
          search={partySearch}
          onSearchChange={setPartySearch}
          onOpenAgreementById={handleOpenAgreementById}
        />
      )}

      {subTab === 'templates' && (
        <AgreementTemplateLibraryView
          categories={categories}
          templates={templates}
          canManageCatalog={canManageCatalog}
          canCreateAgreement={canCreate}
          onUseTemplate={handleUseTemplate}
          onCreateCategory={async (payload) => {
            await api.createAgreementCategory(payload);
            showNotice('success', `নতুন কাস্টম ক্যাটাগরি "${payload.nameBn}" সংরক্ষিত হয়েছে।`);
            await loadCoreCatalogAndStats();
          }}
          onCreateTemplate={async (payload) => {
            await api.createAgreementTemplate(payload);
            showNotice('success', `নতুন টেমপ্লেট "${payload.titleBn}" সংরক্ষিত হয়েছে।`);
            await loadCoreCatalogAndStats();
          }}
          onUpdateTemplate={async (id, payload) => {
            await api.updateAgreementTemplate(id, payload);
            showNotice('success', `টেমপ্লেট "${payload.titleBn || ''}" সফলভাবে হালনাগাদ হয়েছে।`);
            await loadCoreCatalogAndStats();
          }}
          onPublishTemplate={async (id: string, publishStatus: AgreementTemplatePublishStatus) => {
            await api.publishAgreementTemplate(id, publishStatus);
            showNotice(
              'success',
              publishStatus === 'PUBLISHED'
                ? 'কাস্টম টেমপ্লেটটি প্রকাশিত (Published) হয়েছে।'
                : 'কাস্টম টেমপ্লেটটি খসড়া (Draft) অবস্থায় নেওয়া হয়েছে।'
            );
            await loadCoreCatalogAndStats();
          }}
          onDeleteTemplate={async (id) => {
            await api.deleteAgreementTemplate(id);
            showNotice('success', 'কাস্টম টেমপ্লেট মুছে ফেলা হয়েছে।');
            await loadCoreCatalogAndStats();
          }}
        />
      )}

      {subTab === 'print-pdf' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-siliguri">
                প্রিন্ট ও A4 বাংলা PDF ভিউ
              </h3>
              <p className="text-xs text-slate-500 font-tiro">
                যেকোনো চুক্তিপত্র নির্বাচন করে পূর্ণাঙ্গ A4 ইউনিকোড বাংলা ডকুমেন্ট প্রিভিউ ও প্রিন্ট/PDF করুন
              </p>
            </div>
            <select
              value={selectedPrintAgreement?.id || ''}
              onChange={(e) => setSelectedPrintAgreementId(e.target.value)}
              className="px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 max-w-sm w-full"
            >
              {agreements.length === 0 && <option value="">কোনো চুক্তিপত্র নেই</option>}
              {agreements.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.agreementNumber} — {ag.title}
                </option>
              ))}
            </select>
          </div>

          {selectedPrintAgreement ? (
            <AgreementPrintPreviewModal
              agreement={selectedPrintAgreement}
              mosque={mosque}
              inlineMode
              canEdit={canCreate}
              onEdit={handleOpenEdit}
              onRunAiReview={setReviewTarget}
              onOpenGovernance={(ag) => handleOpenGovernance(ag, 'approval')}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Printer className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-700 font-siliguri">
                প্রিন্ট করার জন্য এখনো কোনো চুক্তিপত্র তৈরি হয়নি
              </p>
              <p className="text-xs text-slate-500 font-tiro mt-1">
                নতুন চুক্তিপত্র তৈরি করার পর এখানে A4 বাংলা প্রিন্ট ও PDF প্রিভিউ দেখতে পারবেন।
              </p>
            </div>
          )}
        </div>
      )}

      {subTab === 'archive' && canViewReports && (
        <AgreementArchiveReportView
          canManageArchive={canManageArchive}
          onSelectPreview={setModalPreviewAgreement}
          onSelectGovernance={handleOpenGovernance}
          onArchiveChanged={() => {
            loadCoreCatalogAndStats();
            loadAgreementsList();
          }}
        />
      )}

      {/* Modal Print / PDF Preview */}
      {modalPreviewAgreement && (
        <AgreementPrintPreviewModal
          agreement={modalPreviewAgreement}
          mosque={mosque}
          canEdit={canCreate}
          onEdit={handleOpenEdit}
          onRunAiReview={setReviewTarget}
          onOpenGovernance={(ag) => handleOpenGovernance(ag, 'approval')}
          onClose={() => setModalPreviewAgreement(null)}
        />
      )}

      {/* Part 3: Approval Workflow, Digital Signatures, Versioning & Archive Modal */}
      {governanceTarget && (
        <AgreementGovernanceModal
          key={`${governanceTarget.id}-${governanceInitialTab}`}
          agreement={governanceTarget}
          currentUser={currentUser}
          initialTab={governanceInitialTab}
          onAgreementUpdated={handleGovernanceUpdated}
          onOpenPrintPreview={(ag) => {
            setGovernanceTarget(null);
            setModalPreviewAgreement(ag);
          }}
          onClose={() => setGovernanceTarget(null)}
        />
      )}

      {/* Quick AI Agreement Assistant Modal (Header CTA) */}
      {showQuickAiDraftModal && (
        <AgreementAiAssistantModal
          categories={categories}
          onApplyDraft={handleApplyQuickAiDraft}
          onClose={() => setShowQuickAiDraftModal(false)}
        />
      )}

      {/* Saved Agreement AI Risk Review Panel Modal */}
      {reviewTarget && (
        <AgreementReviewPanelModal
          agreementId={reviewTarget.id}
          agreementTitle={`${reviewTarget.agreementNumber} — ${reviewTarget.title}`}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
};

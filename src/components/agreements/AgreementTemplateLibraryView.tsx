import React, { useState } from 'react';
import {
  BookTemplate,
  Plus,
  FolderPlus,
  Trash2,
  ArrowRight,
  X,
  CheckCircle2,
  Edit3,
  Copy,
  Globe,
  FileEdit,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  AgreementCategoryDef,
  AgreementTemplateDef,
  AgreementTemplatePublishStatus,
  WrittenPaymentMode,
} from '../../types/agreementTypes';
import { WRITTEN_PAYMENT_MODE_LABELS } from '../../lib/agreementCatalog';
import { AgreementClauseAssistModal } from './AgreementClauseAssistModal';

interface AgreementTemplateLibraryViewProps {
  categories: AgreementCategoryDef[];
  templates: AgreementTemplateDef[];
  canManageCatalog: boolean;
  canCreateAgreement: boolean;
  onUseTemplate: (tpl: AgreementTemplateDef) => void;
  onCreateCategory: (payload: {
    nameBn: string;
    nameEn?: string;
    descriptionBn?: string;
    formProfile: 'STANDARD' | 'CONSTRUCTION' | 'LAND_WAQF' | 'ROAD_RIGHT';
  }) => Promise<void>;
  onCreateTemplate: (payload: Partial<AgreementTemplateDef>) => Promise<void>;
  onUpdateTemplate: (id: string, payload: Partial<AgreementTemplateDef>) => Promise<void>;
  onPublishTemplate: (id: string, publishStatus: AgreementTemplatePublishStatus) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export const AgreementTemplateLibraryView: React.FC<AgreementTemplateLibraryViewProps> = ({
  categories,
  templates,
  canManageCatalog,
  canCreateAgreement,
  onUseTemplate,
  onCreateCategory,
  onCreateTemplate,
  onUpdateTemplate,
  onPublishTemplate,
  onDeleteTemplate,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showClauseAssist, setShowClauseAssist] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState<AgreementTemplateDef | null>(null);
  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Category form state
  const [catNameBn, setCatNameBn] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catDescBn, setCatDescBn] = useState('');
  const [catFormProfile, setCatFormProfile] = useState<'STANDARD' | 'CONSTRUCTION' | 'LAND_WAQF' | 'ROAD_RIGHT'>(
    'STANDARD'
  );

  // Template form state (Create / Edit / Customize Built-in)
  const [tplTitleBn, setTplTitleBn] = useState('');
  const [tplCategoryCode, setTplCategoryCode] = useState('OTHER_CUSTOM');
  const [tplDescBn, setTplDescBn] = useState('');
  const [tplPurpose, setTplPurpose] = useState('');
  const [tplGeneralClauses, setTplGeneralClauses] = useState('');
  const [tplSpecialClauses, setTplSpecialClauses] = useState('');
  const [tplTermination, setTplTermination] = useState('');
  const [tplDispute, setTplDispute] = useState('');
  const [tplPayMode, setTplPayMode] = useState<WrittenPaymentMode>('NON_FINANCIAL');
  const [tplPublishStatus, setTplPublishStatus] = useState<AgreementTemplatePublishStatus>('PUBLISHED');

  const filteredTemplates = templates.filter((t) => {
    if (selectedCat !== 'ALL' && t.categoryCode !== selectedCat) return false;
    if (sourceFilter === 'SYSTEM' && !t.isSystem) return false;
    if (sourceFilter === 'CUSTOM' && t.isSystem) return false;
    return true;
  });

  const getCategoryName = (code: string) =>
    categories.find((c) => c.code === code)?.nameBn || code;

  const openNewTemplateModal = () => {
    setErrorMsg(null);
    setEditingTemplateId(null);
    setTplTitleBn('');
    setTplCategoryCode(selectedCat !== 'ALL' ? selectedCat : 'OTHER_CUSTOM');
    setTplDescBn('');
    setTplPurpose('');
    setTplGeneralClauses('');
    setTplSpecialClauses('');
    setTplTermination('');
    setTplDispute('');
    setTplPayMode('NON_FINANCIAL');
    setTplPublishStatus('PUBLISHED');
    setShowTemplateModal(true);
  };

  const openEditCustomTemplate = (tpl: AgreementTemplateDef) => {
    setErrorMsg(null);
    setEditingTemplateId(tpl.id);
    setTplTitleBn(tpl.titleBn);
    setTplCategoryCode(tpl.categoryCode);
    setTplDescBn(tpl.descriptionBn || '');
    setTplPurpose(tpl.defaultPurpose || '');
    setTplGeneralClauses(tpl.defaultGeneralClauses || '');
    setTplSpecialClauses(tpl.defaultSpecialClauses || '');
    setTplTermination(tpl.defaultTerminationClause || '');
    setTplDispute(tpl.defaultDisputeResolutionClause || '');
    setTplPayMode(tpl.defaultWrittenFinancialMode || 'NON_FINANCIAL');
    setTplPublishStatus(tpl.publishStatus || 'PUBLISHED');
    setShowTemplateModal(true);
  };

  const openCustomizeBuiltInTemplate = (tpl: AgreementTemplateDef) => {
    setErrorMsg(null);
    setEditingTemplateId(null); // creates a new custom template cloned from built-in
    setTplTitleBn(`${tpl.titleBn} (কাস্টম সংস্করণ)`);
    setTplCategoryCode(tpl.categoryCode);
    setTplDescBn(tpl.descriptionBn || '');
    setTplPurpose(tpl.defaultPurpose || '');
    setTplGeneralClauses(tpl.defaultGeneralClauses || '');
    setTplSpecialClauses(tpl.defaultSpecialClauses || '');
    setTplTermination(tpl.defaultTerminationClause || '');
    setTplDispute(tpl.defaultDisputeResolutionClause || '');
    setTplPayMode(tpl.defaultWrittenFinancialMode || 'NON_FINANCIAL');
    setTplPublishStatus('DRAFT');
    setShowTemplateModal(true);
  };

  const handleTogglePublish = async (tpl: AgreementTemplateDef) => {
    const nextStatus: AgreementTemplatePublishStatus =
      (tpl.publishStatus || 'PUBLISHED') === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setTogglingPublishId(tpl.id);
    try {
      await onPublishTemplate(tpl.id, nextStatus);
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!catNameBn.trim()) {
      setErrorMsg('ক্যাটাগরির বাংলা নাম লিখুন।');
      return;
    }
    setSaving(true);
    try {
      await onCreateCategory({
        nameBn: catNameBn.trim(),
        nameEn: catNameEn.trim() || undefined,
        descriptionBn: catDescBn.trim() || undefined,
        formProfile: catFormProfile,
      });
      setCatNameBn('');
      setCatNameEn('');
      setCatDescBn('');
      setCatFormProfile('STANDARD');
      setShowCategoryModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'ক্যাটাগরি সংরক্ষণে ত্রুটি হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!tplTitleBn.trim() || !tplGeneralClauses.trim()) {
      setErrorMsg('টেমপ্লেটের শিরোনাম ও সাধারণ শর্তাবলি আবশ্যক।');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<AgreementTemplateDef> = {
        titleBn: tplTitleBn.trim(),
        categoryCode: tplCategoryCode,
        descriptionBn: tplDescBn.trim() || undefined,
        defaultPurpose: tplPurpose.trim() || undefined,
        defaultGeneralClauses: tplGeneralClauses.trim(),
        defaultSpecialClauses: tplSpecialClauses.trim() || undefined,
        defaultTerminationClause: tplTermination.trim() || undefined,
        defaultDisputeResolutionClause: tplDispute.trim() || undefined,
        defaultWrittenFinancialMode: tplPayMode,
        publishStatus: tplPublishStatus,
      };
      if (editingTemplateId) {
        await onUpdateTemplate(editingTemplateId, payload);
      } else {
        await onCreateTemplate(payload);
      }
      setEditingTemplateId(null);
      setShowTemplateModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'টেমপ্লেট সংরক্ষণে ত্রুটি হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!confirmDeleteTpl) return;
    setSaving(true);
    try {
      await onDeleteTemplate(confirmDeleteTpl.id);
      setConfirmDeleteTpl(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-siliguri flex items-center gap-2">
            <BookTemplate className="w-4 h-4 text-emerald-700" />
            <span>হাইব্রিড চুক্তিপত্র টেমপ্লেট ও ক্যাটাগরি লাইব্রেরি</span>
          </h3>
          <p className="text-xs text-slate-500 font-tiro mt-0.5">
            বিল্ট-ইন টেমপ্লেট সরাসরি ব্যবহার বা কাস্টমাইজ করুন এবং মসজিদের নিজস্ব কাস্টম টেমপ্লেট তৈরি, সম্পাদনা ও প্রকাশ (Publish) করুন
          </p>
        </div>

        {canManageCatalog && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowCategoryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold font-siliguri"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
              <span>নতুন কাস্টম ক্যাটাগরি</span>
            </button>
            <button
              type="button"
              onClick={openNewTemplateModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold font-siliguri"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কাস্টম টেমপ্লেট</span>
            </button>
          </div>
        )}
      </div>

      {/* Category & Source Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 font-siliguri shrink-0">ক্যাটাগরি:</label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-3 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">সকল ক্যাটাগরি ({templates.length} টেমপ্লেট)</option>
              {categories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.nameBn} {!cat.isSystem ? '(কাস্টম)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-siliguri">
            {(
              [
                { id: 'ALL', label: 'সকল' },
                { id: 'SYSTEM', label: 'বিল্ট-ইন' },
                { id: 'CUSTOM', label: 'কাস্টম' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSourceFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  sourceFilter === opt.id
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500 font-tiro">
          মোট ক্যাটাগরি: <strong className="font-baloo text-slate-800">{categories.length}</strong> · প্রদর্শিত টেমপ্লেট:{' '}
          <strong className="font-baloo text-slate-800">{filteredTemplates.length}</strong>
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((tpl) => {
          const isPublished = tpl.isSystem || (tpl.publishStatus || 'PUBLISHED') === 'PUBLISHED';
          return (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3 hover:border-emerald-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold font-siliguri">
                      <span className="text-emerald-800">{getCategoryName(tpl.categoryCode)}</span>
                      <span className="text-slate-300">·</span>
                      <span className={tpl.isSystem ? 'text-slate-500' : 'text-teal-700'}>
                        {tpl.isSystem ? 'বিল্ট-ইন' : 'কাস্টম'}
                      </span>
                      {!tpl.isSystem && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className={isPublished ? 'text-emerald-700' : 'text-amber-700'}>
                            {isPublished ? 'প্রকাশিত' : 'খসড়া (অপ্রকাশিত)'}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 font-siliguri mt-0.5">
                      {tpl.titleBn}
                    </h4>
                  </div>

                  {canManageCatalog && (
                    <div className="flex items-center gap-1 shrink-0">
                      {tpl.isSystem ? (
                        <button
                          type="button"
                          onClick={() => openCustomizeBuiltInTemplate(tpl)}
                          title="কাস্টম টেমপ্লেট হিসেবে কপি ও সম্পাদনা করুন"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
                        >
                          <Copy className="w-3 h-3" />
                          <span>কাস্টমাইজ</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={togglingPublishId === tpl.id}
                            onClick={() => handleTogglePublish(tpl)}
                            title={isPublished ? 'খসড়ায় নিন (Unpublish)' : 'প্রকাশ করুন (Publish)'}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold font-siliguri ${
                              isPublished
                                ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {isPublished ? (
                              <>
                                <FileEdit className="w-3 h-3" />
                                <span>খসড়ায় নিন</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3" />
                                <span>প্রকাশ করুন</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditCustomTemplate(tpl)}
                            title="কাস্টম টেমপ্লেট সম্পাদনা"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTpl(tpl)}
                            title="কাস্টম টেমপ্লেট মুছুন"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-tiro mt-1.5 leading-relaxed">
                  {tpl.descriptionBn}
                </p>
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-tiro line-clamp-3 whitespace-pre-line">
                  {tpl.defaultGeneralClauses}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-tiro">
                  {WRITTEN_PAYMENT_MODE_LABELS[tpl.defaultWrittenFinancialMode || 'NON_FINANCIAL']}
                </span>
                {canCreateAgreement && (
                  <button
                    type="button"
                    onClick={() => onUseTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800"
                  >
                    <span>ব্যবহার করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* All Categories Reference Directory */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-bold text-slate-800 font-siliguri mb-2.5">
          সক্রিয় চুক্তির ক্যাটাগরিসমূহ ({categories.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {categories.map((cat) => (
            <div key={cat.id} className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 font-siliguri">{cat.nameBn}</span>
                <span className="text-[10px] font-medium text-slate-500 font-siliguri">
                  {cat.formProfile === 'CONSTRUCTION'
                    ? 'নির্মাণ ফর্ম'
                    : cat.formProfile === 'LAND_WAQF'
                    ? 'জমি/ওয়াকফ ফর্ম'
                    : cat.formProfile === 'ROAD_RIGHT'
                    ? 'রাস্তা/জমি ফর্ম'
                    : 'সাধারণ ফর্ম'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">{cat.descriptionBn}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 font-siliguri">নতুন কাস্টম চুক্তি ক্যাটাগরি যোগ করুন</h4>
              <button type="button" onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="mt-4 space-y-3">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-tiro">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                  ক্যাটাগরির নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  required
                  value={catNameBn}
                  onChange={(e) => setCatNameBn(e.target.value)}
                  placeholder="যেমন: সৌরবিদ্যুৎ স্থাপন চুক্তি"
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    ইংরেজি নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={catNameEn}
                    onChange={(e) => setCatNameEn(e.target.value)}
                    placeholder="Solar Installation Agreement"
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    ডায়নামিক ফর্মের ধরন
                  </label>
                  <select
                    value={catFormProfile}
                    onChange={(e) => setCatFormProfile(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STANDARD">সাধারণ চুক্তি ফর্ম</option>
                    <option value="CONSTRUCTION">নির্মাণ ও পরিমাপ ফর্ম</option>
                    <option value="LAND_WAQF">জমি ও ওয়াকফ ফর্ম</option>
                    <option value="ROAD_RIGHT">রাস্তা ও চলাচলের অধিকার ফর্ম</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                  সংক্ষিপ্ত বিবরণ
                </label>
                <textarea
                  rows={2}
                  value={catDescBn}
                  onChange={(e) => setCatDescBn(e.target.value)}
                  placeholder="এই ক্যাটাগরিতে কোন ধরনের চুক্তি অন্তর্ভুক্ত থাকবে..."
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 font-siliguri"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাটাগরি সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit / Customize Custom Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-5 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 font-siliguri">
                {editingTemplateId ? 'কাস্টম চুক্তি টেমপ্লেট সম্পাদনা করুন' : 'নতুন কাস্টম চুক্তি টেমপ্লেট সংরক্ষণ করুন'}
              </h4>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="mt-4 space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-tiro">
                  {errorMsg}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    টেমপ্লেটের শিরোনাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={tplTitleBn}
                    onChange={(e) => setTplTitleBn(e.target.value)}
                    placeholder="যেমন: অজুখানা টাইলস স্থাপন চুক্তি টেমপ্লেট"
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    চুক্তির ক্যাটাগরি *
                  </label>
                  <select
                    value={tplCategoryCode}
                    onChange={(e) => setTplCategoryCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    সংক্ষিপ্ত বিবরণ
                  </label>
                  <input
                    type="text"
                    value={tplDescBn}
                    onChange={(e) => setTplDescBn(e.target.value)}
                    placeholder="এই টেমপ্লেটের ব্যবহার ক্ষেত্র..."
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    লিখিত আর্থিক শর্তের ধরন
                  </label>
                  <select
                    value={tplPayMode}
                    onChange={(e) => setTplPayMode(e.target.value as WrittenPaymentMode)}
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NON_FINANCIAL">অ-আর্থিক / শূন্য মূল্য চুক্তি</option>
                    <option value="LUMP_SUM">এককালীন লিখিত মূল্য</option>
                    <option value="INSTALLMENT">কিস্তিভিত্তিক লিখিত শর্ত</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    প্রকাশনার অবস্থা
                  </label>
                  <select
                    value={tplPublishStatus}
                    onChange={(e) => setTplPublishStatus(e.target.value as AgreementTemplatePublishStatus)}
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PUBLISHED">প্রকাশিত (সকল ব্যবহারকারী দেখবেন)</option>
                    <option value="DRAFT">খসড়া (শুধুমাত্র অ্যাডমিন দেখবেন)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                  প্রাথমিক উদ্দেশ্য
                </label>
                <input
                  type="text"
                  value={tplPurpose}
                  onChange={(e) => setTplPurpose(e.target.value)}
                  placeholder="চুক্তির মূল উদ্দেশ্য..."
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri">
                    সাধারণ শর্তাবলি (ধারা ১, ২, ৩...) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowClauseAssist(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-semibold font-siliguri"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI ধারা সহায়তা</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  required
                  value={tplGeneralClauses}
                  onChange={(e) => setTplGeneralClauses(e.target.value)}
                  placeholder="১. ...&#10;২. ...&#10;৩. ..."
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                  বিশেষ শর্তাবলি (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={tplSpecialClauses}
                  onChange={(e) => setTplSpecialClauses(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    সমাপ্তি / বাতিলের শর্ত
                  </label>
                  <textarea
                    rows={2}
                    value={tplTermination}
                    onChange={(e) => setTplTermination(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                    বিরোধ নিষ্পত্তির শর্ত
                  </label>
                  <textarea
                    rows={2}
                    value={tplDispute}
                    onChange={(e) => setTplDispute(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 font-siliguri"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {saving
                      ? 'সংরক্ষণ হচ্ছে...'
                      : editingTemplateId
                      ? 'টেমপ্লেট হালনাগাদ করুন'
                      : 'টেমপ্লেট সংরক্ষণ করুন'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Clause Assistant for Template Editor */}
      {showClauseAssist && (
        <AgreementClauseAssistModal
          currentClauses={tplGeneralClauses}
          agreementTitle={tplTitleBn || 'কাস্টম চুক্তি টেমপ্লেট'}
          categoryNameBn={getCategoryName(tplCategoryCode)}
          onApplyRevisedClauses={(revised) => {
            setTplGeneralClauses(revised);
            setShowClauseAssist(false);
          }}
          onClose={() => setShowClauseAssist(false)}
        />
      )}

      {/* Safe Delete Template Confirmation Modal */}
      {confirmDeleteTpl && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-bold font-siliguri">কাস্টম টেমপ্লেট মুছে ফেলার নিশ্চিতকরণ</h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteTpl(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-600 font-tiro leading-relaxed">
              আপনি কি নিশ্চিতভাবে <strong className="font-siliguri text-slate-900">{confirmDeleteTpl.titleBn}</strong> টেমপ্লেটটি মুছে ফেলতে চান?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDeleteTpl(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 font-siliguri"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmDeleteTemplate}
                className="px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold font-siliguri hover:bg-rose-700 disabled:opacity-60"
              >
                {saving ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

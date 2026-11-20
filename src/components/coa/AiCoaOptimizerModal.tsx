import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  LayoutTemplate,
  ArrowRight,
  ShieldCheck,
  Edit2,
  PlusCircle,
  Building2,
  BookOpen,
  Landmark,
  Home,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AccountHead } from '../../types';

interface AiCoaOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountHeads: AccountHead[];
  onOpenEditHead?: (head: AccountHead) => void;
  onAddAccountHead: (data: {
    nameBn: string;
    nameEn?: string;
    type: 'INCOME' | 'EXPENSE';
    parentId?: string | null;
    description?: string;
  }) => Promise<void>;
  onSuccessMessage?: (msg: string) => void;
}

type MosqueArchetype = 'GENERAL' | 'WAQF_LARGE' | 'MADRASA_ATTACHED' | 'URBAN_COMPLEX';

const ARCHETYPES: Array<{
  id: MosqueArchetype;
  titleBn: string;
  subtitleBn: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'GENERAL',
    titleBn: 'সাধারণ মসজিদ',
    subtitleBn: 'জুমা, দানবাক্স, মাসিক চাঁদা, ইমাম-মুয়াজ্জিন বেতন ও নিয়মিত বিল',
    icon: Home,
  },
  {
    id: 'WAQF_LARGE',
    titleBn: 'ওয়াকফ এস্টেটসহ বড় মসজিদ',
    subtitleBn: 'দোকান ভাড়া, মার্কেট, জমি লিজ, ওয়াকফ ফি ও বৃহৎ উন্নয়ন খাত',
    icon: Landmark,
  },
  {
    id: 'MADRASA_ATTACHED',
    titleBn: 'মাদ্রাসা সংযুক্ত মসজিদ',
    subtitleBn: 'মক্তব/হিফজখানা ফি, লিল্লাহ বোর্ডিং, যাকাত-ফিতরা ও ওস্তাদ বেতন',
    icon: BookOpen,
  },
  {
    id: 'URBAN_COMPLEX',
    titleBn: 'বহুতল কমপ্লেক্স মসজিদ',
    subtitleBn: 'এসি-লিফট-জেনারেটর, অনলাইন দান, লাইব্রেরি ও কমিউনিটি সেবা',
    icon: Building2,
  },
];

export const AiCoaOptimizerModal: React.FC<AiCoaOptimizerModalProps> = ({
  isOpen,
  onClose,
  accountHeads,
  onOpenEditHead,
  onAddAccountHead,
  onSuccessMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'OPTIMIZE' | 'TEMPLATE'>('OPTIMIZE');

  // Tab 1: Optimize & Duplicate Check state
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [optResult, setOptResult] = useState<Awaited<ReturnType<typeof api.optimizeChartOfAccountsAi>> | null>(null);

  // Tab 2: Standard COA Template state
  const [selectedArchetype, setSelectedArchetype] = useState<MosqueArchetype>('GENERAL');
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplResult, setTplResult] = useState<Awaited<ReturnType<typeof api.generateStandardCoaTemplateAi>> | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [applyStatusMsg, setApplyStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'OPTIMIZE' && !optResult && !optLoading) {
      handleRunOptimize();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleRunOptimize = async () => {
    setOptLoading(true);
    setOptError(null);
    try {
      const data = await api.optimizeChartOfAccountsAi();
      setOptResult(data);
    } catch (err: any) {
      setOptError(err?.message || 'AI হিসাব খাত বিশ্লেষণ ব্যর্থ হয়েছে।');
    } finally {
      setOptLoading(false);
    }
  };

  const handleGenerateTemplate = async (archetype?: MosqueArchetype) => {
    const target = archetype || selectedArchetype;
    setSelectedArchetype(target);
    setTplLoading(true);
    setTplError(null);
    setApplyStatusMsg(null);
    try {
      const data = await api.generateStandardCoaTemplateAi({ mosqueType: target });
      setTplResult(data);

      // Auto-select only non-existing items in preview so admin can review & approve
      const initialKeys = new Set<string>();
      data.incomeGroups.forEach((g, gi) => {
        if (!g.alreadyExists) initialKeys.add(`INC:M:${gi}`);
        g.subHeads.forEach((s, si) => {
          if (!s.alreadyExists) initialKeys.add(`INC:S:${gi}:${si}`);
        });
      });
      data.expenseGroups.forEach((g, gi) => {
        if (!g.alreadyExists) initialKeys.add(`EXP:M:${gi}`);
        g.subHeads.forEach((s, si) => {
          if (!s.alreadyExists) initialKeys.add(`EXP:S:${gi}:${si}`);
        });
      });
      setSelectedKeys(initialKeys);
    } catch (err: any) {
      setTplError(err?.message || 'AI স্ট্যান্ডার্ড COA টেমপ্লেট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setTplLoading(false);
    }
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApproveAndAddTemplate = async () => {
    if (!tplResult || selectedKeys.size === 0 || applyingTemplate) return;
    setApplyingTemplate(true);
    setTplError(null);
    setApplyStatusMsg(null);

    try {
      let addedCount = 0;

      const processGroups = async (
        groups: typeof tplResult.incomeGroups,
        type: 'INCOME' | 'EXPENSE',
        prefix: 'INC' | 'EXP'
      ) => {
        // Refresh current heads map to resolve parentIds accurately
        let latestHeads = await api.getAccountHeads();

        const findExistingMain = (nameBn: string) =>
          latestHeads.find(
            (h) =>
              h.type === type &&
              !h.parentId &&
              h.nameBn.trim().toLowerCase() === nameBn.trim().toLowerCase()
          );

        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi];
          const mainKey = `${prefix}:M:${gi}`;
          const hasSelectedSub = g.subHeads.some((_, si) => selectedKeys.has(`${prefix}:S:${gi}:${si}`));

          let parentHead = findExistingMain(g.mainHeadNameBn);

          if (!parentHead && (selectedKeys.has(mainKey) || hasSelectedSub)) {
            await onAddAccountHead({
              nameBn: g.mainHeadNameBn,
              nameEn: g.mainHeadNameEn || undefined,
              type,
              parentId: null,
              description: g.descriptionBn || undefined,
            });
            addedCount += 1;
            latestHeads = await api.getAccountHeads();
            parentHead = findExistingMain(g.mainHeadNameBn);
          }

          if (parentHead) {
            for (let si = 0; si < g.subHeads.length; si++) {
              const s = g.subHeads[si];
              if (!selectedKeys.has(`${prefix}:S:${gi}:${si}`)) continue;
              const subExists = latestHeads.some(
                (h) =>
                  h.type === type &&
                  h.nameBn.trim().toLowerCase() === s.nameBn.trim().toLowerCase()
              );
              if (subExists) continue;
              await onAddAccountHead({
                nameBn: s.nameBn,
                nameEn: s.nameEn || undefined,
                type,
                parentId: parentHead.id,
                description: s.descriptionBn || undefined,
              });
              addedCount += 1;
            }
          }
        }
      };

      await processGroups(tplResult.incomeGroups, 'INCOME', 'INC');
      await processGroups(tplResult.expenseGroups, 'EXPENSE', 'EXP');

      const msg =
        addedCount > 0
          ? `অ্যাডমিনের অনুমোদনে ${addedCount}টি নতুন স্ট্যান্ডার্ড হিসাব খাত সফলভাবে যুক্ত হয়েছে।`
          : 'নির্বাচিত সব খাত ইতিমধ্যেই মসজিদের চার্ট অব অ্যাকাউন্টসে বিদ্যমান।';
      setApplyStatusMsg(msg);
      if (onSuccessMessage) onSuccessMessage(msg);
      setSelectedKeys(new Set());
    } catch (err: any) {
      setTplError(err?.message || 'নির্বাচিত খাতসমূহ যুক্ত করতে সমস্যা হয়েছে।');
    } finally {
      setApplyingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-siliguri">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/40 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                AI হিসাব খাত অপটিমাইজার ও স্ট্যান্ডার্ড COA টেমপ্লেট
              </h3>
              <p className="text-[11px] text-slate-300 font-tiro">
                ডুপ্লিকেট খাত শনাক্তকরণ, মার্জ পরামর্শ এবং মসজিদের ধরন অনুযায়ী ১-ক্লিক আদর্শ খাত প্রিভিউ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Mode Tab Switcher */}
        <div className="px-5 pt-3.5 pb-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('OPTIMIZE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'OPTIMIZE'
                  ? 'bg-white text-blue-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>(ক) ডুপ্লিকেট ও মার্জ বিশ্লেষণ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TEMPLATE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'TEMPLATE'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>(খ) AI ১-ক্লিক স্ট্যান্ডার্ড COA টেমপ্লেট</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI নিজে কোনো খাত ডিলিট বা মার্জ করে না</span>
          </span>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'OPTIMIZE' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  বর্তমান <strong>{accountHeads.length}টি</strong> আয়-ব্যয় খাত বিশ্লেষণ করে ডুপ্লিকেট, অতিরিক্ত ক্ষুদ্র উপ-খাত এবং একীভূতকরণের (Merge) পরামর্শ দেখুন।
                </p>
                <button
                  type="button"
                  onClick={handleRunOptimize}
                  disabled={optLoading}
                  className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {optLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{optLoading ? 'AI বিশ্লেষণ করছে...' : 'পুনরায় বিশ্লেষণ করুন'}</span>
                </button>
              </div>

              {optError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{optError}</span>
                </div>
              )}

              {optLoading && !optResult && (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    AI আপনার মসজিদের সকল আয়-ব্যয় খাত ও লেনদেন ব্যবহার বিশ্লেষণ করছে...
                  </p>
                </div>
              )}

              {optResult && (
                <div className="space-y-4">
                  {/* Health Summary Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-blue-950">
                          COA কাঠামোগত স্বাস্থ্য মূল্যায়ন:
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          {optResult.healthLabelBn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-tiro">
                        {optResult.overallAssessmentBn}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-center px-3.5 py-2 bg-white rounded-xl border border-blue-200 shadow-2xs">
                        <div className="text-2xl font-extrabold font-mono text-blue-700">
                          {optResult.healthScore}%
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">কাঠামো স্কোর</div>
                      </div>
                    </div>
                  </div>

                  {/* Duplicate / Over-granular Suggestions */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
                      <GitMerge className="w-4 h-4 text-amber-600" />
                      <span>
                        ডুপ্লিকেট বা অতিরিক্ত ক্ষুদ্র উপ-খাত ও মার্জ পরামর্শ ({optResult.duplicateOrFragmentedSuggestions.length} টি)
                      </span>
                    </h4>

                    {optResult.duplicateOrFragmentedSuggestions.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>অভিনন্দন! আপনার বর্তমান চার্ট অব অ্যাকাউন্টসে কোনো উল্লেখযোগ্য ডুপ্লিকেট বা অপ্রয়োজনীয় ক্ষুদ্র উপ-খাত পাওয়া যায়নি।</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {optResult.duplicateOrFragmentedSuggestions.map((item, idx) => {
                          const matchedHead = accountHeads.find((h) => h.id === item.headId);
                          return (
                            <div
                              key={`${item.headId}-${idx}`}
                              className={`p-3.5 rounded-xl border space-y-2 ${
                                item.issueType === 'DUPLICATE'
                                  ? 'bg-rose-50/50 border-rose-200'
                                  : 'bg-amber-50/50 border-amber-200'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                      item.issueType === 'DUPLICATE'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-amber-600 text-white'
                                    }`}
                                  >
                                    {item.issueBadgeBn}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {item.headNameBn}
                                  </span>
                                  {item.headCode && (
                                    <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                      {item.headCode}
                                    </span>
                                  )}
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                    মার্জ লক্ষ্য: {item.recommendedTargetHeadNameBn}
                                    {item.recommendedTargetHeadCode ? ` (${item.recommendedTargetHeadCode})` : ''}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-bold text-slate-500">
                                    ব্যবহার: {item.usageCount} লেনদেন
                                  </span>
                                  {matchedHead && onOpenEditHead && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onOpenEditHead(matchedHead);
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>যাচাই / সম্পাদনা</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-700 leading-relaxed">
                                <strong>কারণ:</strong> {item.reasonBn}
                              </p>
                              <p className="text-[11px] text-slate-600 font-tiro">
                                <strong>করণীয় পরামর্শ:</strong> {item.actionAdviceBn}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* General Key Recommendations */}
                  {optResult.keyRecommendationsBn.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <h5 className="text-xs font-extrabold text-slate-800">
                        অতিরিক্ত পেশাদার সুপারিশমালা:
                      </h5>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                        {optResult.keyRecommendationsBn.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* TAB (খ): AI 1-CLICK STANDARD COA TEMPLATE */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800">
                  মসজিদের ধরন নির্বাচন করুন (AI আদর্শ চার্ট অব অ্যাকাউন্টস প্রিভিউ তৈরি করবে):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {ARCHETYPES.map((arch) => {
                    const Icon = arch.icon;
                    const active = selectedArchetype === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => setSelectedArchetype(arch.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                          active
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-900">{arch.titleBn}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{arch.subtitleBn}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerateTemplate()}
                    disabled={tplLoading}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {tplLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                    <span>{tplLoading ? 'AI টেমপ্লেট সাজাচ্ছে...' : 'AI ১-ক্লিক স্ট্যান্ডার্ড COA প্রিভিউ তৈরি করুন'}</span>
                  </button>
                </div>
              </div>

              {tplError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                  {tplError}
                </div>
              )}

              {applyStatusMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{applyStatusMsg}</span>
                </div>
              )}

              {tplResult && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                        {tplResult.templateTitleBn}
                      </h4>
                      <p className="text-xs text-emerald-800/90 mt-0.5 font-tiro">
                        {tplResult.summaryBn}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleApproveAndAddTemplate}
                      disabled={selectedKeys.size === 0 || applyingTemplate}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {applyingTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlusCircle className="w-4 h-4" />
                      )}
                      <span>
                        {applyingTemplate
                          ? 'যুক্ত হচ্ছে...'
                          : `অনুমোদন ও যুক্ত করুন (${selectedKeys.size} টি)`}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Income Template Column */}
                    <div className="rounded-xl border border-emerald-200 overflow-hidden bg-white">
                      <div className="px-3.5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-xs font-extrabold text-emerald-950">
                        📥 প্রস্তাবিত আয়ের খাতসমূহ
                      </div>
                      <div className="p-3 space-y-3">
                        {tplResult.incomeGroups.map((g, gi) => {
                          const mKey = `INC:M:${gi}`;
                          return (
                            <div key={mKey} className="space-y-1.5">
                              <label className="flex items-start space-x-2 text-xs font-bold text-slate-900 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={g.alreadyExists}
                                  checked={g.alreadyExists ? false : selectedKeys.has(mKey)}
                                  onChange={() => toggleKey(mKey)}
                                  className="mt-0.5 rounded border-slate-300 text-emerald-600"
                                />
                                <div className="flex-1">
                                  <span>{g.mainHeadNameBn}</span>
                                  {g.codeHint && (
                                    <span className="ml-1.5 font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                      {g.codeHint}
                                    </span>
                                  )}
                                  {g.alreadyExists && (
                                    <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                      বিদ্যমান
                                    </span>
                                  )}
                                </div>
                              </label>
                              <div className="pl-5 space-y-1 border-l-2 border-emerald-200 ml-1.5">
                                {g.subHeads.map((s, si) => {
                                  const sKey = `INC:S:${gi}:${si}`;
                                  return (
                                    <label
                                      key={sKey}
                                      className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={s.alreadyExists}
                                        checked={s.alreadyExists ? false : selectedKeys.has(sKey)}
                                        onChange={() => toggleKey(sKey)}
                                        className="rounded border-slate-300 text-emerald-600"
                                      />
                                      <span>{s.nameBn}</span>
                                      {s.alreadyExists && (
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">
                                          বিদ্যমান
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expense Template Column */}
                    <div className="rounded-xl border border-rose-200 overflow-hidden bg-white">
                      <div className="px-3.5 py-2.5 bg-rose-50 border-b border-rose-100 text-xs font-extrabold text-rose-950">
                        📤 প্রস্তাবিত ব্যয়ের খাতসমূহ
                      </div>
                      <div className="p-3 space-y-3">
                        {tplResult.expenseGroups.map((g, gi) => {
                          const mKey = `EXP:M:${gi}`;
                          return (
                            <div key={mKey} className="space-y-1.5">
                              <label className="flex items-start space-x-2 text-xs font-bold text-slate-900 cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={g.alreadyExists}
                                  checked={g.alreadyExists ? false : selectedKeys.has(mKey)}
                                  onChange={() => toggleKey(mKey)}
                                  className="mt-0.5 rounded border-slate-300 text-rose-600"
                                />
                                <div className="flex-1">
                                  <span>{g.mainHeadNameBn}</span>
                                  {g.codeHint && (
                                    <span className="ml-1.5 font-mono text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                                      {g.codeHint}
                                    </span>
                                  )}
                                  {g.alreadyExists && (
                                    <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                      বিদ্যমান
                                    </span>
                                  )}
                                </div>
                              </label>
                              <div className="pl-5 space-y-1 border-l-2 border-rose-200 ml-1.5">
                                {g.subHeads.map((s, si) => {
                                  const sKey = `EXP:S:${gi}:${si}`;
                                  return (
                                    <label
                                      key={sKey}
                                      className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={s.alreadyExists}
                                        checked={s.alreadyExists ? false : selectedKeys.has(sKey)}
                                        onChange={() => toggleKey(sKey)}
                                        className="rounded border-slate-300 text-rose-600"
                                      />
                                      <span>{s.nameBn}</span>
                                      {s.alreadyExists && (
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">
                                          বিদ্যমান
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

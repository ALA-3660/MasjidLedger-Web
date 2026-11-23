import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Send,
  RotateCcw,
} from 'lucide-react';
import { api, PublicPortalUpdateAiDraftResult } from '../../lib/api';

interface PublicPortalUpdateAiDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  canPublish: boolean;
  onPublishedSuccess?: (noticeTitle: string) => void;
}

const UPDATE_TYPES = [
  { id: 'GENERAL_UPDATE', labelBn: 'সাধারণ পরিচিতি ও নিয়মিত কার্যক্রম আপডেট' },
  { id: 'PROJECT_PROGRESS', labelBn: 'মসজিদ উন্নয়ন ও নির্মাণ কাজের অগ্রগতি' },
  { id: 'WAQF_UPDATE', labelBn: 'ওয়াকফ ও কল্যাণমূলক কাজের পাবলিক আপডেট' },
  { id: 'EVENT_NOTICE', labelBn: 'বিশেষ ধর্মীয় অনুষ্ঠান / মাহফিল ঘোষণা' },
  { id: 'PRAYER_ANNOUNCEMENT', labelBn: 'নামাজ / জুমা / জামাতের সময়সূচি ঘোষণা' },
] as const;

const AI_TIMEOUT_MS = 45_000;

export const PublicPortalUpdateAiDraftModal: React.FC<PublicPortalUpdateAiDraftModalProps> = ({
  isOpen,
  onClose,
  canPublish,
  onPublishedSuccess,
}) => {
  const [updateType, setUpdateType] = useState<
    'GENERAL_UPDATE' | 'PROJECT_PROGRESS' | 'WAQF_UPDATE' | 'EVENT_NOTICE' | 'PRAYER_ANNOUNCEMENT'
  >('GENERAL_UPDATE');
  const [tone, setTone] = useState<'FORMAL' | 'WARM'>('FORMAL');
  const [adminBrief, setAdminBrief] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [publishedSuccessMsg, setPublishedSuccessMsg] = useState('');
  const [draft, setDraft] = useState<PublicPortalUpdateAiDraftResult | null>(null);

  // Editable preview fields (admin reviews & approves before publishing)
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [expiryDate, setExpiryDate] = useState('');
  const [adminApprovedCheck, setAdminApprovedCheck] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setErrorMsg('');
    setPublishedSuccessMsg('');
    setIsGenerating(true);
    setAdminApprovedCheck(false);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI খসড়া তৈরিতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const res = await Promise.race([
        api.draftPublicPortalUpdateAi({
          updateType,
          adminBrief: adminBrief.trim() || undefined,
          tone,
        }),
        timeoutPromise,
      ]);

      setDraft(res);
      setEditTitle(res.titleBn);
      setEditDescription(res.descriptionBn);
      setEditPriority(res.suggestedPriority);
    } catch (err: any) {
      setErrorMsg(err?.message || 'পাবলিক আপডেট ড্রাফট তৈরি করা যায়নি।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(`${editTitle}\n\n${editDescription}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMsg('কপি করা যায়নি। অনুগ্রহ করে লেখাটি সিলেক্ট করে কপি করুন।');
    }
  };

  const handlePublishToPublicPortal = async () => {
    if (!canPublish || !adminApprovedCheck) return;
    if (!editTitle.trim() || !editDescription.trim()) {
      setErrorMsg('প্রকাশ করার জন্য শিরোনাম ও বিবরণ আবশ্যক।');
      return;
    }

    setIsPublishing(true);
    setErrorMsg('');
    try {
      await api.createNotice({
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        isPublic: true,
        expiryDate: expiryDate || undefined,
      });
      setPublishedSuccessMsg('আপনার অনুমোদিত ঘোষণাটি সফলভাবে পাবলিক পেজে প্রকাশিত হয়েছে!');
      onPublishedSuccess?.(editTitle.trim());
    } catch (err: any) {
      setErrorMsg(err?.message || 'পাবলিক পেজে প্রকাশ করতে সমস্যা হয়েছে।');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/25 border border-blue-400/40 rounded-xl">
              <Sparkles className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri">
                AI পাবলিক পেজ আপডেট ও ঘোষণা ড্রাফট
              </h3>
              <p className="text-xs text-blue-200/90 font-tiro">
                শুধুমাত্র অনুমোদিত পাবলিক তথ্য থেকে খসড়া — অ্যাডমিনের অনুমোদন ছাড়া লাইভ হবে না
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Whitelist Safety Banner */}
        <div className="px-5 py-2.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-950 font-tiro flex items-start gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong className="font-siliguri">হোয়াইটলিস্ট ও প্রকাশ সুরক্ষা:</strong> AI কেবল এই মসজিদের অনুমোদিত পাবলিক তথ্য ব্যবহার করে খসড়া তৈরি করে। কোনো ব্যক্তিগত দাতার তথ্য, গোপন নোট বা অডিট লগ কখনোই ব্যবহৃত হয় না।
          </span>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {publishedSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold font-siliguri">{publishedSuccessMsg}</span>
            </div>
          )}

          {!draft ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    আপডেট / ঘোষণার ধরন
                  </label>
                  <select
                    value={updateType}
                    onChange={(e) => setUpdateType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-siliguri bg-white"
                  >
                    {UPDATE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.labelBn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    ভাষার শৈলী
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-siliguri bg-white"
                  >
                    <option value="FORMAL">মার্জিত ও দাপ্তরিক বাংলা</option>
                    <option value="WARM">আন্তরিক ও মুসল্লিবান্ধব বাংলা</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                  অ্যাডমিনের মূল কথা / পয়েন্ট (ঐচ্ছিক — খালি রাখলে অনুমোদিত পাবলিক তথ্য থেকে সারসংক্ষেপ হবে)
                </label>
                <textarea
                  rows={4}
                  value={adminBrief}
                  onChange={(e) => setAdminBrief(e.target.value)}
                  placeholder="যেমন: আগামী শুক্রবার বাদ আসর মসজিদের ওজুখানা সংস্কার কাজের অগ্রগতি পরিদর্শন ও বিশেষ দোয়া অনুষ্ঠিত হবে..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm font-tiro focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-tiro">{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Source Sections Used */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 font-siliguri block">
                    ব্যবহৃত অনুমোদিত পাবলিক উৎসসমূহ:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.sourceSectionsUsedBn.map((sec, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold font-siliguri"
                      >
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setPublishedSuccessMsg('');
                    setErrorMsg('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold font-siliguri flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>আবার ড্রাফট</span>
                </button>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 font-siliguri mb-1">
                    পাবলিক ঘোষণার শিরোনাম (সম্পাদনাযোগ্য) *
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold font-siliguri"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 font-siliguri mb-1">
                    বিস্তারিত বিবরণ (সম্পাদনাযোগ্য) *
                  </label>
                  <textarea
                    rows={6}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-tiro leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                      গুরুত্ব (Priority)
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-siliguri bg-white"
                    >
                      <option value="NORMAL">সাধারণ ঘোষণা (Normal)</option>
                      <option value="HIGH">গুরুত্বপূর্ণ (High)</option>
                      <option value="URGENT">জরুরি (Urgent)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                      মেয়াদ শেষের তারিখ (ঐচ্ছিক)
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-baloo"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-tiro">
                <strong>নিরাপত্তা যাচাই:</strong> {draft.safetyCheckNoteBn}
              </div>

              {canPublish && !publishedSuccessMsg && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adminApprovedCheck}
                    onChange={(e) => setAdminApprovedCheck(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-800 font-tiro">
                    আমি ঘোষণাটির প্রতিটি তথ্য যাচাই করেছি এবং নিশ্চিত হয়েছি যে এতে কোনো ব্যক্তিগত বা গোপন তথ্য নেই। এখন এটি পাবলিক পেজে প্রকাশ করতে সম্মত।
                  </span>
                </label>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-tiro">
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri"
          >
            বন্ধ করুন
          </button>

          {!draft ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>খসড়া তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>পাবলিক আপডেট খসড়া তৈরি করুন</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyDraft}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-siliguri flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে' : 'শুধু কপি করুন'}</span>
              </button>

              {canPublish && !publishedSuccessMsg && (
                <button
                  type="button"
                  onClick={handlePublishToPublicPortal}
                  disabled={isPublishing || !adminApprovedCheck}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-1.5 cursor-pointer"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>প্রকাশ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>অনুমোদন ও পাবলিক পেজে প্রকাশ করুন</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

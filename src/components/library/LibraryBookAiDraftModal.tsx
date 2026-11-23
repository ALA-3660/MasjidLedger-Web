import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Camera,
  BookOpen,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api, LibraryBookAiDraftResult, LibraryBookAiExtractedFields } from '../../lib/api';
import { LibraryCategory } from '../../types';

export interface LibraryBookFormSnapshot {
  title: string;
  author: string;
  publisher: string;
  publicationYear: number | string;
  language: string;
  isbn: string;
  categoryId: string;
  edition: string;
  description: string;
}

interface LibraryBookAiDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormValues: LibraryBookFormSnapshot;
  categories: LibraryCategory[];
  onApplyDraftFields: (
    patch: Partial<LibraryBookAiExtractedFields>,
    meta: { sourceSummaryBn: string }
  ) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  BENGALI: 'বাংলা',
  ARABIC: 'আরবি',
  ENGLISH: 'ইংরেজি',
  URDU: 'উর্দু',
  OTHER: 'অন্যান্য',
};

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const AI_TIMEOUT_MS = 45_000;

export const LibraryBookAiDraftModal: React.FC<LibraryBookAiDraftModalProps> = ({
  isOpen,
  onClose,
  currentFormValues,
  categories,
  onApplyDraftFields,
}) => {
  const [titleHint, setTitleHint] = useState(currentFormValues.title || '');
  const [authorHint, setAuthorHint] = useState(currentFormValues.author || '');
  const [extraNotes, setExtraNotes] = useState('');
  const [coverImage, setCoverImage] = useState<{
    fileName: string;
    mimeType: string;
    base64Data: string;
    previewUrl: string;
    sizeKb: number;
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<LibraryBookAiDraftResult | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});
  const [verifiedCheck, setVerifiedCheck] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name || '';

  const fieldRows: Array<{
    key: keyof LibraryBookAiExtractedFields;
    labelBn: string;
    critical?: boolean;
    currentDisplay: string;
    proposedDisplay: (f: LibraryBookAiExtractedFields) => string;
  }> = [
    {
      key: 'title',
      labelBn: 'বইয়ের শিরোনাম',
      critical: true,
      currentDisplay: currentFormValues.title || 'খালি',
      proposedDisplay: (f) => f.title,
    },
    {
      key: 'author',
      labelBn: 'লেখকের নাম',
      critical: true,
      currentDisplay: currentFormValues.author || 'খালি',
      proposedDisplay: (f) => f.author,
    },
    {
      key: 'categoryId',
      labelBn: 'বিষয় / ক্যাটাগরি',
      critical: true,
      currentDisplay: getCategoryName(currentFormValues.categoryId) || 'নির্বাচিত নয়',
      proposedDisplay: (f) =>
        f.categoryId ? getCategoryName(f.categoryId) || f.suggestedCategoryNameBn : '',
    },
    {
      key: 'publisher',
      labelBn: 'প্রকাশনী',
      currentDisplay: currentFormValues.publisher || 'খালি',
      proposedDisplay: (f) => f.publisher,
    },
    {
      key: 'publicationYear',
      labelBn: 'প্রকাশনার সাল',
      currentDisplay: currentFormValues.publicationYear ? String(currentFormValues.publicationYear) : 'খালি',
      proposedDisplay: (f) => f.publicationYear,
    },
    {
      key: 'language',
      labelBn: 'ভাষা',
      currentDisplay: LANGUAGE_LABELS[currentFormValues.language] || currentFormValues.language || 'খালি',
      proposedDisplay: (f) => (f.language ? LANGUAGE_LABELS[f.language] || f.language : ''),
    },
    {
      key: 'isbn',
      labelBn: 'ISBN নম্বর',
      critical: true,
      currentDisplay: currentFormValues.isbn || 'খালি',
      proposedDisplay: (f) => f.isbn,
    },
    {
      key: 'edition',
      labelBn: 'সংস্করণ',
      currentDisplay: currentFormValues.edition || 'খালি',
      proposedDisplay: (f) => f.edition,
    },
    {
      key: 'description',
      labelBn: 'বইয়ের সংক্ষিপ্ত পরিচিতি',
      currentDisplay: currentFormValues.description || 'খালি',
      proposedDisplay: (f) => f.description,
    },
  ];

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase())) {
      setErrorMsg('শুধুমাত্র JPG, PNG অথবা WebP প্রচ্ছদের ছবি আপলোড করা যাবে।');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMsg('প্রচ্ছদের ছবির আকার ৮ মেগাবাইটের বেশি হতে পারবে না।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setCoverImage({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        previewUrl: dataUrl,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
    };
    reader.onerror = () => setErrorMsg('ছবি পড়তে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    if (!titleHint.trim() && !authorHint.trim() && !coverImage) {
      setErrorMsg('অনুগ্রহ করে বইয়ের নাম/লেখকের নাম লিখুন অথবা প্রচ্ছদের ছবি আপলোড করুন।');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setVerifiedCheck(false);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI বিশ্লেষণে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা ম্যানুয়ালি ফর্ম পূরণ করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const res = await Promise.race([
        api.draftLibraryBookAi({
          titleHint: titleHint.trim() || undefined,
          authorHint: authorHint.trim() || undefined,
          extraNotes: extraNotes.trim() || undefined,
          coverImage: coverImage
            ? {
                mimeType: coverImage.mimeType,
                base64Data: coverImage.base64Data,
                fileName: coverImage.fileName,
              }
            : null,
        }),
        timeoutPromise,
      ]);

      setResult(res);
      const initialChecked: Record<string, boolean> = {};
      for (const row of fieldRows) {
        const val = row.proposedDisplay(res.extractedFields);
        if (val && val.trim() !== '') {
          initialChecked[row.key] = true;
        }
      }
      setCheckedKeys(initialChecked);
    } catch (err: any) {
      setErrorMsg(err?.message || 'বইয়ের খসড়া তৈরি করা যায়নি। আপনি সরাসরি ম্যানুয়াল ফর্ম পূরণ করতে পারেন।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  };

  const availableRows = result
    ? fieldRows.filter((row) => {
        const val = row.proposedDisplay(result.extractedFields);
        return Boolean(val && val.trim() !== '');
      })
    : [];

  const selectedCount = availableRows.filter((r) => checkedKeys[r.key]).length;

  const handleApply = () => {
    if (!result || selectedCount === 0) return;
    const patch: Partial<LibraryBookAiExtractedFields> = {};
    for (const row of availableRows) {
      if (checkedKeys[row.key]) {
        patch[row.key] = result.extractedFields[row.key];
      }
    }
    onApplyDraftFields(patch, { sourceSummaryBn: result.sourceSummaryBn });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/25 border border-emerald-400/40 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri">AI বইয়ের তথ্য ও প্রচ্ছদ স্ক্যান সহায়ক</h3>
              <p className="text-xs text-emerald-100/90 font-tiro">
                বইয়ের প্রচ্ছদের ছবি বা নাম-লেখক থেকে খসড়া (Draft) পূরণ — যাচাই ছাড়া সেভ হবে না
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Policy */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2 text-xs text-amber-900 font-tiro shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong className="font-siliguri">সুরক্ষা নীতি:</strong> AI কখনোই ISBN নম্বর বা লেখকের নাম আন্দাজে বদলাবে না এবং সরাসরি ডাটাবেসে সেভ করবে না। প্রস্তাবিত খসড়া মিলিয়ে নিয়ে তবেই ফর্মে বসান।
          </span>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!result ? (
            <>
              {/* Text Hints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    বইয়ের নাম (ঐচ্ছিক, যদি ছবি না দেন)
                  </label>
                  <input
                    type="text"
                    value={titleHint}
                    onChange={(e) => setTitleHint(e.target.value)}
                    placeholder="যেমন: আর-রাহীকুল মাখতূম"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-tiro focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    লেখকের নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={authorHint}
                    onChange={(e) => setAuthorHint(e.target.value)}
                    placeholder="যেমন: আল্লামা সফিউর রহমান মুবারকপুরী"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-tiro focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Cover Upload */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 bg-slate-50/70 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 font-siliguri">
                  অথবা বইয়ের প্রচ্ছদের ছবি আপলোড করুন / ক্যামেরা দিয়ে তুলুন
                </p>
                <p className="text-[11px] text-slate-500 font-tiro">JPG, PNG, WebP (সর্বোচ্চ ৮ মেগাবাইট)</p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-siliguri flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>প্রচ্ছদের ছবি বাছাই করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold font-siliguri flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>ক্যামেরা</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImagePick}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImagePick}
                  className="hidden"
                />
              </div>

              {coverImage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={coverImage.previewUrl}
                      alt="বইয়ের প্রচ্ছদ"
                      className="w-12 h-14 rounded-lg object-cover border border-emerald-300 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate">{coverImage.fileName}</p>
                      <p className="text-[11px] text-emerald-700 font-baloo">{coverImage.sizeKb} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
                  >
                    সরান
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 font-siliguri mb-1">
                  অতিরিক্ত সূত্র / প্রকাশনীর তথ্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="যেমন: ইসলামিক ফাউন্ডেশন সংস্করণ, সীরাত বিষয়ক..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-tiro outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-tiro">{errorMsg}</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950 font-siliguri">
                      AI বইয়ের খসড়া প্রস্তুত হয়েছে
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-tiro">{result.sourceSummaryBn}</p>
                  {!result.extractedFields.categoryId && result.extractedFields.suggestedCategoryNameBn && (
                    <p className="text-[11px] text-amber-800 font-tiro">
                      প্রস্তাবিত বিষয়: <strong>{result.extractedFields.suggestedCategoryNameBn}</strong> (পাঠাগারের বিদ্যমান তালিকা থেকে উপযুক্ত বিষয় ম্যানুয়ালি নির্বাচন করুন)
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setVerifiedCheck(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold font-siliguri flex items-center gap-1 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>আবার চেষ্টা</span>
                </button>
              </div>

              {/* Side-by-side comparison */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 font-siliguri">
                  <span>বর্তমান ফর্ম বনাম AI প্রস্তাবিত খসড়া</span>
                  <span className="text-emerald-700 font-baloo">
                    নির্বাচিত: {selectedCount} / {availableRows.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-siliguri">
                        <th className="py-2 px-3 w-10 text-center">বাছাই</th>
                        <th className="py-2 px-3">ঘর</th>
                        <th className="py-2 px-3">বর্তমান ফর্ম</th>
                        <th className="py-2 px-2 w-5"></th>
                        <th className="py-2 px-3">AI প্রস্তাবিত খসড়া</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {availableRows.map((row) => {
                        const isChecked = !!checkedKeys[row.key];
                        return (
                          <tr
                            key={row.key}
                            onClick={() =>
                              setCheckedKeys((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
                            }
                            className={`cursor-pointer ${
                              isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50 opacity-70'
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 mx-auto" />
                              )}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-800 font-siliguri">
                              <span>{row.labelBn}</span>
                              {row.critical && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                                  যাচাই
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-tiro">{row.currentDisplay}</td>
                            <td className="py-2 px-1 text-slate-400">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </td>
                            <td className="py-2 px-3 font-bold text-emerald-950 font-tiro">
                              {row.proposedDisplay(result.extractedFields)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {(result.verificationNotesBn.length > 0 || result.unclearFieldsBn.length > 0) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-tiro space-y-1">
                  {result.verificationNotesBn.map((n, i) => (
                    <p key={i}>• {n}</p>
                  ))}
                  {result.unclearFieldsBn.length > 0 && (
                    <p className="text-rose-800 font-bold">
                      অস্পষ্ট/অনুপস্থিত: {result.unclearFieldsBn.join(', ')}
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifiedCheck}
                  onChange={(e) => setVerifiedCheck(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300"
                />
                <span className="text-xs text-slate-800 font-tiro">
                  আমি বইয়ের শিরোনাম, লেখক, ISBN ও বিবরণ যাচাই করেছি এবং এগুলো কেবল খসড়া হিসেবে ফর্মে বসাতে সম্মত।
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri"
          >
            ম্যানুয়াল ফর্মে ফিরে যান
          </button>

          {!result ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!titleHint.trim() && !authorHint.trim() && !coverImage)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI বিশ্লেষণ করছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>বইয়ের খসড়া তৈরি করুন</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedCount === 0 || !verifiedCheck}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ফর্মে খসড়া বসান ({selectedCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api, CemeteryAiEntryExtractResult, CemeteryAiExtractedFields } from '../../lib/api';

export interface CemeteryDraftFormSnapshot {
  plotNumber: string;
  block: string;
  row: string;
  graveLocation: string;
  graveType: string;
  deceasedName: string;
  fatherOrSpouseName: string;
  gender: string;
  ageAtDeath: string;
  dateOfDeath: string;
  causeOfDeath: string;
  burialDate: string;
  burialTime: string;
  janazaPlace: string;
  contactPersonName: string;
  relationWithDeceased: string;
  contactPersonPhone: string;
  heirAddress: string;
  notes: string;
}

interface CemeteryEntryAiHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormValues: CemeteryDraftFormSnapshot;
  onApplyDraftFields: (selectedFields: Partial<CemeteryAiExtractedFields>, meta: { sourceSummaryBn: string; confidenceLevel: string }) => void;
}

interface FieldMeta {
  key: keyof CemeteryAiExtractedFields;
  labelBn: string;
  critical?: boolean;
  formatValue?: (val: string) => string;
}

const GENDER_LABELS: Record<string, string> = {
  MALE: 'পুরুষ',
  FEMALE: 'মহিলা',
  OTHER: 'অন্যান্য',
};

const GRAVE_TYPE_LABELS: Record<string, string> = {
  PERMANENT: 'স্থায়ী কবর',
  TEMPORARY: 'অস্থায়ী কবর',
  FAMILY: 'পারিবারিক প্লট',
  GENERAL: 'সাধারণ ওয়াকফ কবর',
};

const FIELD_DEFINITIONS: FieldMeta[] = [
  { key: 'deceasedName', labelBn: 'মরহুম/মরহুমার নাম', critical: true },
  { key: 'fatherOrSpouseName', labelBn: 'পিতা / স্বামীর নাম', critical: true },
  { key: 'gender', labelBn: 'লিঙ্গ', formatValue: (v) => GENDER_LABELS[v] || v },
  { key: 'ageAtDeath', labelBn: 'মৃত্যুকালে বয়স', critical: true },
  { key: 'dateOfDeath', labelBn: 'মৃত্যুর তারিখ', critical: true },
  { key: 'causeOfDeath', labelBn: 'মৃত্যুর কারণ' },
  { key: 'burialDate', labelBn: 'দাফনের তারিখ', critical: true },
  { key: 'burialTime', labelBn: 'দাফনের সময় / ওয়াক্ত' },
  { key: 'janazaPlace', labelBn: 'জানাজার স্থান' },
  { key: 'block', labelBn: 'ব্লক / সেকশন', critical: true },
  { key: 'plotNumber', labelBn: 'কবর / প্লট নম্বর', critical: true },
  { key: 'row', labelBn: 'সারি (Row)' },
  { key: 'graveLocation', labelBn: 'কবরের অবস্থান / নিশানা' },
  { key: 'graveType', labelBn: 'কবরের ধরন', formatValue: (v) => GRAVE_TYPE_LABELS[v] || v },
  { key: 'contactPersonName', labelBn: 'ওয়ারিশ / অভিভাবকের নাম', critical: true },
  { key: 'relationWithDeceased', labelBn: 'মরহুমের সাথে সম্পর্ক' },
  { key: 'contactPersonPhone', labelBn: 'অভিভাবকের মোবাইল নম্বর', critical: true },
  { key: 'heirAddress', labelBn: 'ঠিকানা / পাড়া / মহল্লা' },
  { key: 'notes', labelBn: 'অতিরিক্ত নোট / মন্তব্য' },
];

const SAMPLE_NOTE_BN =
  'আজ ২ নং ব্লকের ৫ নম্বর কবরে দক্ষিণ পাড়ার মৃত রহিম উদ্দিন সাহেবকে (পিতা: মৃত আব্দুল করিম, বয়স ৬৮ বছর) বাদ আসর দাফন করা হলো। জানাজা হয়েছে মসজিদ প্রাঙ্গণে। অভিভাবক: মোঃ করিম উদ্দিন (পুত্র), মোবাইল: 01712345678।';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const AI_TIMEOUT_MS = 45_000;

export const CemeteryEntryAiHelperModal: React.FC<CemeteryEntryAiHelperModalProps> = ({
  isOpen,
  onClose,
  currentFormValues,
  onApplyDraftFields,
}) => {
  const [inputTab, setInputTab] = useState<'note' | 'file'>('note');
  const [rawNoteText, setRawNoteText] = useState('');
  const [customHint, setCustomHint] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    fileName: string;
    mimeType: string;
    base64Data: string;
    sizeKb: number;
    previewUrl?: string;
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<CemeteryAiEntryExtractResult | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});
  const [userVerifiedCheck, setUserVerifiedCheck] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('শুধুমাত্র JPG, PNG, WebP ছবি অথবা PDF ফাইল আপলোড করা যাবে।');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg('ফাইলের আকার ১০ মেগাবাইটের বেশি হতে পারবে না।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setSelectedFile({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        previewUrl: file.type.startsWith('image/') ? dataUrl : undefined,
      });
    };
    reader.onerror = () => {
      setErrorMsg('ফাইল পড়তে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    if (!rawNoteText.trim() && !selectedFile) {
      setErrorMsg('অনুগ্রহ করে বাংলা নোট লিখুন অথবা পুরনো রেজিস্টারের ছবি/PDF আপলোড করুন।');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setUserVerifiedCheck(false);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI বিশ্লেষণে প্রত্যাশার চেয়ে বেশি সময় লাগছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা ম্যানুয়ালি ফর্ম পূরণ করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const response = await Promise.race([
        api.extractCemeteryEntryAi({
          rawNoteText: rawNoteText.trim() || undefined,
          file: selectedFile
            ? {
                mimeType: selectedFile.mimeType,
                base64Data: selectedFile.base64Data,
                fileName: selectedFile.fileName,
              }
            : null,
          customHint: customHint.trim() || undefined,
        }),
        timeoutPromise,
      ]);

      setResult(response);
      // Pre-check all non-empty extracted fields for user review
      const initialChecked: Record<string, boolean> = {};
      for (const def of FIELD_DEFINITIONS) {
        const val = response.extractedFields?.[def.key];
        if (val && String(val).trim() !== '') {
          initialChecked[def.key] = true;
        }
      }
      setCheckedKeys(initialChecked);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI বিশ্লেষণ সম্পন্ন করা যায়নি। আপনি সরাসরি ম্যানুয়াল ফর্ম পূরণ করতে পারেন।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsAnalyzing(false);
    }
  };

  const extractedNonEmptyFields = result
    ? FIELD_DEFINITIONS.filter((def) => {
        const val = result.extractedFields?.[def.key];
        return Boolean(val && String(val).trim() !== '');
      })
    : [];

  const selectedCount = extractedNonEmptyFields.filter((f) => checkedKeys[f.key]).length;

  const toggleField = (key: string) => {
    setCheckedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyToForm = () => {
    if (!result || selectedCount === 0) return;
    const draftPatch: Partial<CemeteryAiExtractedFields> = {};
    for (const def of extractedNonEmptyFields) {
      if (checkedKeys[def.key]) {
        draftPatch[def.key] = result.extractedFields[def.key];
      }
    }
    onApplyDraftFields(draftPatch, {
      sourceSummaryBn: result.sourceSummaryBn,
      confidenceLevel: result.confidenceLevel,
    });
    onClose();
  };

  const handleReset = () => {
    setResult(null);
    setErrorMsg('');
    setUserVerifiedCheck(false);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/25 border border-emerald-400/40 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-siliguri text-white">
                AI দাফন নোট ও পুরনো রেজিস্টার স্ক্যান সহায়ক
              </h3>
              <p className="text-xs text-emerald-100/90 font-tiro">
                বাংলা নোট বা রেজিস্টারের ছবি থেকে কেবল খসড়া (Draft) পূরণ — যাচাই ছাড়া কিছুই সেভ হবে না
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strict Safety Notice */}
        <div className="px-5 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 shrink-0 font-tiro">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong className="font-siliguri">AI সুরক্ষা নীতি:</strong> AI কখনোই নাম, বয়স, তারিখ, কবর নম্বর বা মোবাইল নম্বর অনুমান করবে না এবং সরাসরি ডাটাবেসে সেভ করবে না। প্রতিটি প্রস্তাবিত তথ্য নিচে মিলিয়ে দেখে কেবল নির্বাচিত ফিল্ডগুলোই ফর্মে বসান।
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Input Step */}
          {!result && (
            <>
              {/* Source Mode Selector */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInputTab('note')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-siliguri flex items-center gap-2 border transition-all ${
                    inputTab === 'note'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>১. বাংলা নোট লিখুন / পেস্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('file')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-siliguri flex items-center gap-2 border transition-all ${
                    inputTab === 'file'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>২. পুরনো রেজিস্টার ছবি / PDF স্ক্যান (OCR)</span>
                </button>
                {selectedFile && inputTab === 'note' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> সংযুক্ত ফাইল: {selectedFile.fileName}
                  </span>
                )}
              </div>

              {inputTab === 'note' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 font-siliguri">
                      সংক্ষিপ্ত বাংলা নোট লিখুন (যেমন: ব্লক, কবর নম্বর, মরহুমের নাম, অভিভাবক ও ফোন)
                    </label>
                    <button
                      type="button"
                      onClick={() => setRawNoteText(SAMPLE_NOTE_BN)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline font-siliguri"
                    >
                      নমুনা নোট বসান
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={rawNoteText}
                    onChange={(e) => setRawNoteText(e.target.value)}
                    placeholder='উদাহরণ: "আজ ২ নং ব্লকের ৫ নম্বর কবরে দক্ষিণ পাড়ার মৃত রহিম উদ্দিন সাহেবকে দাফন করা হলো, অভিভাবক করিম, ফোন ০১৭..."'
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-tiro text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/70 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-siliguri">
                        পুরনো কবরস্থান রেজিস্টার পাতা বা কাগজের ছবি / PDF আপলোড করুন
                      </p>
                      <p className="text-xs text-slate-500 font-tiro mt-0.5">
                        সমর্থিত ফরম্যাট: JPG, PNG, WebP অথবা PDF (সর্বোচ্চ ১০ মেগাবাইট)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-siliguri flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>ফাইল নির্বাচন করুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold font-siliguri flex items-center gap-1.5 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>ক্যামেরা দিয়ে ছবি তুলুন</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFilePick}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFilePick}
                      className="hidden"
                    />
                  </div>

                  {selectedFile && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedFile.previewUrl ? (
                          <img
                            src={selectedFile.previewUrl}
                            alt="রেজিস্টার প্রিভিউ"
                            className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950 truncate">{selectedFile.fileName}</p>
                          <p className="text-[11px] text-emerald-700 font-baloo">
                            {selectedFile.mimeType} • {selectedFile.sizeKb} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2.5 py-1 rounded-lg hover:bg-rose-50"
                      >
                        সরান
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Hint */}
              <div>
                <label className="block text-xs font-bold text-slate-600 font-siliguri mb-1">
                  অতিরিক্ত নির্দেশনা (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  placeholder="যেমন: রেজিস্টারের ৩ নম্বর সারির তথ্য আলাদা করুন বা এটি উত্তর ব্লকের খাতা..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-tiro text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 font-tiro">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold font-siliguri">{errorMsg}</p>
                    <p className="text-[11px] text-rose-700">
                      AI সাময়িকভাবে ব্যস্ত বা অকার্যকর থাকলেও আপনি নিচের "ম্যানুয়াল ফর্মে ফিরে যান" বাটনে ক্লিক করে স্বাভাবিকভাবে তথ্য এন্ট্রি করতে পারবেন।
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Side-by-side Preview & Verification Step */}
          {result && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-emerald-950 font-siliguri">
                      AI বিশ্লেষণ সম্পন্ন (খসড়া প্রিভিউ)
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        result.confidenceLevel === 'HIGH'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : result.confidenceLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      নির্ভুলতার মাত্রা: {result.confidenceLevel === 'HIGH' ? 'উচ্চ' : result.confidenceLevel === 'MEDIUM' ? 'মাঝারি' : 'সতর্কতা আবশ্যক'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-tiro">{result.sourceSummaryBn}</p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold font-siliguri flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>আবার স্ক্যান করুন</span>
                </button>
              </div>

              {/* Unclear / Verification Warnings */}
              {(result.unclearFieldsBn.length > 0 || result.verificationNotesBn.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.verificationNotesBn.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                      <p className="text-xs font-bold text-amber-900 font-siliguri flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>যাচাইয়ের নির্দেশনা</span>
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900 font-tiro">
                        {result.verificationNotesBn.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.unclearFieldsBn.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                      <p className="text-xs font-bold text-rose-900 font-siliguri flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>অস্পষ্ট / অনুপস্থিত তথ্য (ম্যানুয়ালি পূরণ করুন)</span>
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-900 font-tiro">
                        {result.unclearFieldsBn.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Side-by-Side Comparison Table */}
              {extractedNonEmptyFields.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800 font-siliguri">
                    কোনো স্পষ্ট তথ্য পাওয়া যায়নি
                  </p>
                  <p className="text-xs text-slate-600 font-tiro">
                    নোটটি আরও স্পষ্ট করে লিখুন অথবা পরিষ্কার ছবি আপলোড করুন, কিংবা সরাসরি ম্যানুয়াল ফর্ম পূরণ করুন।
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 font-siliguri">
                      মূল ফর্ম বনাম AI প্রস্তাবিত খসড়া (তুলনামূলক যাচাই)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 font-baloo">
                      নির্বাচিত: {selectedCount} / {extractedNonEmptyFields.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-siliguri">
                          <th className="py-2.5 px-3 w-10 text-center">নির্বাচন</th>
                          <th className="py-2.5 px-3">তথ্যের ঘর (Field)</th>
                          <th className="py-2.5 px-3">বর্তমান ফর্মে যা আছে</th>
                          <th className="py-2.5 px-3 w-6 text-center"></th>
                          <th className="py-2.5 px-3">AI প্রস্তাবিত খসড়া</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {extractedNonEmptyFields.map((def) => {
                          const isChecked = !!checkedKeys[def.key];
                          const rawCurrent = currentFormValues[def.key] || '';
                          const rawProposed = result.extractedFields[def.key] || '';
                          const formattedCurrent = rawCurrent
                            ? def.formatValue
                              ? def.formatValue(rawCurrent)
                              : rawCurrent
                            : 'খালি';
                          const formattedProposed = def.formatValue ? def.formatValue(rawProposed) : rawProposed;

                          return (
                            <tr
                              key={def.key}
                              onClick={() => toggleField(def.key)}
                              className={`cursor-pointer transition-colors ${
                                isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50 opacity-70'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 mx-auto" />
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800 font-siliguri">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span>{def.labelBn}</span>
                                  {def.critical && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                      যাচাই আবশ্যক
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-tiro">
                                {formattedCurrent}
                              </td>
                              <td className="py-2.5 px-1 text-center text-slate-400">
                                <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-950 font-tiro">
                                {formattedProposed}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mandatory Verification Checkbox */}
              {extractedNonEmptyFields.length > 0 && (
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userVerifiedCheck}
                    onChange={(e) => setUserVerifiedCheck(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-800 font-tiro">
                    আমি প্রস্তাবিত নাম, বয়স, তারিখ, কবর নম্বর ও অভিভাবকের তথ্যগুলো মিলিয়ে দেখেছি এবং এগুলো কেবল <strong className="font-siliguri">খসড়া (Draft)</strong> হিসেবে ফর্মে বসাতে সম্মত। (ফর্ম সংরক্ষণ করতে হলে পরে নিজে "সংরক্ষণ করুন" বাটনে ক্লিক করতে হবে।)
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri transition-colors"
          >
            ম্যানুয়াল ফর্মে ফিরে যান
          </button>

          {!result ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!rawNoteText.trim() && !selectedFile)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-2 shadow-sm transition-all"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI বিশ্লেষণ করছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>খসড়া তথ্য বের করুন (প্রিভিউ)</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyToForm}
              disabled={selectedCount === 0 || !userVerifiedCheck}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-2 shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>নির্বাচিত খসড়া ফর্মে বসান ({selectedCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

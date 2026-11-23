import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  Sparkles,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_ENTITY_LABELS,
  DocumentCategoryType,
  DocumentEntityType,
} from '../../types';
import { api, DocumentScanAiDraftResult } from '../../lib/api';

export interface DocumentFormCurrentValues {
  name: string;
  entityType: DocumentEntityType;
  entityTitle: string;
  documentType: DocumentCategoryType;
  documentDate: string;
  description: string;
}

export interface DocumentFormAppliedDraft {
  name?: string;
  entityType?: DocumentEntityType;
  entityTitle?: string;
  documentType?: DocumentCategoryType;
  documentDate?: string;
  description?: string;
  scannedFile?: File | null;
  scannedFileBase64?: string | null;
}

interface DocumentScanAiDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentForm: DocumentFormCurrentValues;
  initialFile?: File | null;
  initialFileBase64?: string | null;
  onApplyDraft: (draft: DocumentFormAppliedDraft) => void;
}

const ALLOWED_SCAN_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

type FieldKey = 'name' | 'entityType' | 'entityTitle' | 'documentType' | 'documentDate' | 'description';

export const DocumentScanAiDraftModal: React.FC<DocumentScanAiDraftModalProps> = ({
  isOpen,
  onClose,
  currentForm,
  initialFile,
  initialFileBase64,
  onApplyDraft,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanFileBase64, setScanFileBase64] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentScanAiDraftResult | null>(null);

  const [selectedFields, setSelectedFields] = useState<Record<FieldKey, boolean>>({
    name: true,
    entityType: true,
    entityTitle: true,
    documentType: true,
    documentDate: true,
    description: true,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editableNote, setEditableNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setResult(null);
    setRawText('');
    if (
      initialFile &&
      initialFileBase64 &&
      ALLOWED_SCAN_TYPES.includes(initialFile.type.toLowerCase())
    ) {
      setScanFile(initialFile);
      setScanFileBase64(initialFileBase64);
    } else {
      setScanFile(null);
      setScanFileBase64(null);
    }
  }, [isOpen, initialFile, initialFileBase64]);

  if (!isOpen) return null;

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    if (!ALLOWED_SCAN_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('শুধুমাত্র JPG, PNG, WebP ছবি অথবা PDF ডকুমেন্ট AI স্ক্যানের জন্য নির্বাচন করুন।');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ফাইলের আকার সর্বোচ্চ ১০ মেগাবাইট (10MB) হতে পারবে।');
      return;
    }

    setScanFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setScanFileBase64(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!scanFileBase64 && !rawText.trim() && !currentForm.name.trim()) {
      setErrorMsg('অনুগ্রহ করে ডকুমেন্টের ছবি/PDF নির্বাচন করুন অথবা নিচের ঘরে নথির বিবরণ লিখুন।');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const data = await api.scanDocumentMetadataAi({
        fileData:
          scanFile && scanFileBase64
            ? {
                mimeType: scanFile.type,
                base64Data: scanFileBase64,
                fileName: scanFile.name,
              }
            : null,
        rawText: rawText.trim() || undefined,
        titleHint: currentForm.name.trim() || undefined,
        fileNameHint: scanFile?.name || undefined,
      });

      setResult(data);
      const ef = data.extractedFields;
      setSelectedTags(ef.suggestedTagsBn || []);
      setEditableNote(ef.summaryNoteBn || '');
      setSelectedFields({
        name: Boolean(ef.name),
        entityType: Boolean(ef.entityType),
        entityTitle: Boolean(ef.entityTitle),
        documentType: Boolean(ef.documentType),
        documentDate: Boolean(ef.documentDate),
        description: Boolean(ef.summaryNoteBn || (ef.suggestedTagsBn && ef.suggestedTagsBn.length > 0)),
      });
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'ডকুমেন্ট বিশ্লেষণে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে এই উইন্ডো বন্ধ করে ম্যানুয়ালি ফর্ম পূরণ করুন।'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (key: FieldKey) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const buildCombinedDescription = () => {
    const notePart = editableNote.trim();
    const tagsPart =
      selectedTags.length > 0
        ? `ট্যাগ: ${selectedTags.map((t) => `#${t.replace(/^#+/, '')}`).join(' ')}`
        : '';
    return [notePart, tagsPart].filter(Boolean).join('\n');
  };

  const handleApply = () => {
    if (!result) return;
    const ef = result.extractedFields;
    const payload: DocumentFormAppliedDraft = {};

    if (selectedFields.name && ef.name) payload.name = ef.name;
    if (selectedFields.entityType && ef.entityType) {
      payload.entityType = ef.entityType as DocumentEntityType;
    }
    if (selectedFields.entityTitle && ef.entityTitle) {
      payload.entityTitle = ef.entityTitle;
    }
    if (selectedFields.documentType && ef.documentType) {
      payload.documentType = ef.documentType as DocumentCategoryType;
    }
    if (selectedFields.documentDate && ef.documentDate) {
      payload.documentDate = ef.documentDate;
    }
    if (selectedFields.description) {
      const combined = buildCombinedDescription();
      if (combined) payload.description = combined;
    }
    if (scanFile && scanFileBase64 && scanFile !== initialFile) {
      payload.scannedFile = scanFile;
      payload.scannedFileBase64 = scanFileBase64;
    }

    onApplyDraft(payload);
    onClose();
  };

  const ef = result?.extractedFields;
  const combinedDescPreview = buildCombinedDescription();

  const comparisonRows: Array<{
    key: FieldKey;
    labelBn: string;
    currentVal: string;
    proposedVal: string;
    sensitive?: boolean;
  }> = ef
    ? [
        {
          key: 'name',
          labelBn: 'ডকুমেন্টের শিরোনাম',
          currentVal: currentForm.name || '— (খালি)',
          proposedVal: ef.name || '— (শনাক্ত হয়নি)',
        },
        {
          key: 'documentType',
          labelBn: 'ডকুমেন্টের ধরন / ক্যাটাগরি',
          currentVal: DOCUMENT_CATEGORY_LABELS[currentForm.documentType] || currentForm.documentType,
          proposedVal: ef.documentTypeLabelBn || ef.documentType,
        },
        {
          key: 'entityType',
          labelBn: 'সম্পর্কিত মডিউল',
          currentVal: DOCUMENT_ENTITY_LABELS[currentForm.entityType] || currentForm.entityType,
          proposedVal: ef.entityTypeLabelBn || ef.entityType,
        },
        {
          key: 'entityTitle',
          labelBn: 'সম্পর্কিত ব্যক্তি / প্রতিষ্ঠান / রেকর্ড',
          currentVal: currentForm.entityTitle || '— (খালি)',
          proposedVal: ef.entityTitle || '— (শনাক্ত হয়নি)',
          sensitive: true,
        },
        {
          key: 'documentDate',
          labelBn: 'নথির তারিখ',
          currentVal: currentForm.documentDate || '— (খালি)',
          proposedVal: ef.documentDate || '— (শনাক্ত হয়নি)',
          sensitive: true,
        },
        {
          key: 'description',
          labelBn: 'সংক্ষিপ্ত নোট ও ট্যাগ',
          currentVal: currentForm.description || '— (খালি)',
          proposedVal: combinedDescPreview || '— (শনাক্ত হয়নি)',
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-siliguri font-bold text-base">
                ✨ AI ডকুমেন্ট স্ক্যান ও মেটাডাটা খসড়া
              </h3>
              <p className="font-tiro text-xs text-emerald-100 mt-0.5">
                ছবি, PDF বা লিখিত তথ্য পড়ে কেবল খসড়া তৈরি করবে — যাচাই ছাড়া কোনো কিছুই সংরক্ষণ হবে না
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Safety Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950 font-tiro">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong className="font-siliguri">গুরুত্বপূর্ণ সুরক্ষা নীতি:</strong> দলিল নম্বর, খতিয়ান/দাগ নম্বর,
              রেজিস্ট্রি নম্বর, স্মারক নম্বর, তারিখ, টাকার অঙ্ক, ব্যক্তির নাম ও প্রতিষ্ঠানের নাম AI নিজে থেকে অনুমান করে না।
              প্রস্তাবিত খসড়া ফর্মে প্রয়োগ করার আগে মূল কাগজের সাথে মিলিয়ে যাচাই করুন।
            </p>
          </div>

          {/* Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* File / Camera Input */}
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-siliguri text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  স্ক্যান করা ছবি বা PDF (সর্বোচ্চ ১০MB)
                </span>
                {scanFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setScanFile(null);
                      setScanFileBase64(null);
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-medium cursor-pointer"
                  >
                    সরান
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-stone-300 hover:border-emerald-500 text-stone-700 rounded-lg transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  ফাইল নির্বাচন
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-lg transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  ক্যামেরা
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleSelectFile}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSelectFile}
                className="hidden"
              />

              {scanFile ? (
                <div className="p-2 bg-white border border-emerald-200 rounded-lg flex items-center gap-2.5">
                  {scanFile.type.startsWith('image/') && scanFileBase64 ? (
                    <img
                      src={scanFileBase64}
                      alt={scanFile.name}
                      className="w-11 h-11 rounded object-cover border border-stone-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-800 truncate">{scanFile.name}</p>
                    <p className="text-[11px] text-stone-500 font-baloo">
                      {(scanFile.size / 1024).toFixed(0)} KB • বিশ্লেষণের জন্য প্রস্তুত
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 font-tiro">
                  দলিল, খতিয়ান, ভাড়া চুক্তি, কমিটি রেজুলেশন, বিল/ভাউচার বা সরকারি চিঠির পরিষ্কার ছবি বা PDF দিন।
                </p>
              )}
            </div>

            {/* Raw Text Input */}
            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
              <label className="font-siliguri text-xs font-bold text-stone-800 block">
                অথবা ডকুমেন্টের লিখিত বিবরণ / পাঠ্য (ঐচ্ছিক)
              </label>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="যেমন: ২০২৫ সালের ১২ জানুয়ারি স্বাক্ষরিত মসজিদ মার্কেট দোকান নং-৩ এর ভাড়া চুক্তি, ভাড়াটিয়া মো: কামাল হোসেন, মাসিক ভাড়া ৮,৫০০ টাকা..."
                className="w-full px-3 py-2 text-xs font-tiro bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-stone-500 font-tiro">
              ফাইল ও লিখিত তথ্য—যেকোনো একটি অথবা উভয়ই একসাথে দেওয়া যাবে।
            </span>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-siliguri font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ডকুমেন্ট পড়া হচ্ছে...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {result ? 'পুনরায় বিশ্লেষণ করুন' : 'AI দিয়ে পড়ুন ও খসড়া তৈরি করুন'}
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-siliguri font-bold">AI বিশ্লেষণ সম্পন্ন করা যায়নি</p>
                  <p className="font-tiro mt-0.5">{errorMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 rounded-lg font-siliguri font-semibold shrink-0 hover:bg-rose-100 cursor-pointer"
              >
                ম্যানুয়াল ফর্মে ফিরুন
              </button>
            </div>
          )}

          {/* Result Preview & Side-by-Side Comparison */}
          {result && ef && (
            <div className="space-y-4 pt-2 border-t border-stone-200 animate-in fade-in duration-150">
              {/* Summary Strip */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-siliguri font-bold text-emerald-950">
                    শনাক্তকৃত ধরন: {result.detectedDocKindBn}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    result.confidenceLevel === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : result.confidenceLevel === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  নির্ভুলতার মাত্রা:{' '}
                  {result.confidenceLevel === 'HIGH'
                    ? 'উচ্চ'
                    : result.confidenceLevel === 'MEDIUM'
                    ? 'মাঝারি'
                    : 'কম — সাবধানে যাচাই করুন'}
                </span>
              </div>

              {/* Sensitive Facts Verification Box */}
              {result.detectedSensitiveFacts.length > 0 && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 font-siliguri font-bold text-xs text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>শনাক্তকৃত সংবেদনশীল তথ্য (দলিল/খতিয়ান/স্মারক/তারিখ/টাকা/নাম — অবশ্যই মূল কাগজে মিলিয়ে নিন)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.detectedSensitiveFacts.map((fact, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white border border-amber-200 rounded-lg text-xs"
                      >
                        <div className="text-[11px] text-stone-500 font-siliguri">{fact.labelBn}</div>
                        <div className="font-baloo font-bold text-stone-900 mt-0.5 break-words">
                          {fact.value}
                        </div>
                        <div className="text-[10px] text-amber-800 mt-0.5 font-tiro">
                          ⚠ {fact.verifyWarningBn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Tags + Editable Note */}
              {(ef.suggestedTagsBn.length > 0 || editableNote) && (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                  {ef.suggestedTagsBn.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-siliguri font-bold text-stone-700 mb-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-700" />
                        <span>প্রস্তাবিত ট্যাগসমূহ (ক্লিক করে নির্বাচন/বাতিল করুন):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ef.suggestedTagsBn.map((tag) => {
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                                active
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-white text-stone-500 border-stone-200 line-through'
                              }`}
                            >
                              {active && <Check className="w-3 h-3" />}
                              #{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-siliguri font-bold text-stone-700 mb-1">
                      সংক্ষিপ্ত নোট খসড়া (প্রয়োজনে এখানেই সম্পাদনা করুন):
                    </label>
                    <textarea
                      rows={2}
                      value={editableNote}
                      onChange={(e) => setEditableNote(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-tiro bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs font-siliguri font-bold text-stone-800">
                  <span>পাশাপাশি তুলনা: বর্তমান ফর্ম বনাম AI প্রস্তাবিত খসড়া</span>
                  <span className="text-[11px] font-normal text-stone-500">
                    যে ঘরগুলো ফর্মে বসাতে চান তা টিক চিহ্ন দিন
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-siliguri">
                        <th className="py-2 px-3 w-10 text-center">নির্বাচন</th>
                        <th className="py-2 px-3 w-1/4">ফিল্ডের নাম</th>
                        <th className="py-2 px-3 w-1/3">বর্তমান ফর্মের তথ্য</th>
                        <th className="py-2 px-3">AI প্রস্তাবিত খসড়া</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {comparisonRows.map((row) => (
                        <tr key={row.key} className="hover:bg-stone-50/70">
                          <td className="py-2 px-3 text-center align-top">
                            <input
                              type="checkbox"
                              checked={selectedFields[row.key]}
                              onChange={() => toggleField(row.key)}
                              className="rounded border-stone-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-siliguri font-semibold text-stone-800 align-top">
                            {row.labelBn}
                            {row.sensitive && (
                              <span className="block text-[10px] text-amber-700 font-normal">
                                মূল কাগজে যাচাই জরুরি
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-stone-500 font-tiro align-top whitespace-pre-wrap break-words">
                            {row.currentVal}
                          </td>
                          <td className="py-2 px-3 text-emerald-950 font-medium font-tiro align-top whitespace-pre-wrap break-words bg-emerald-50/30">
                            {row.proposedVal}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unclear Fields & Verification Notes */}
              {(result.unclearFieldsBn.length > 0 || result.verificationNotesBn.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {result.unclearFieldsBn.length > 0 && (
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
                      <p className="font-siliguri font-bold text-stone-800 mb-1">
                        অস্পষ্ট বা অনুপস্থিত তথ্য (ম্যানুয়ালি দিন):
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-stone-600 font-tiro">
                        {result.unclearFieldsBn.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.verificationNotesBn.length > 0 && (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                      <p className="font-siliguri font-bold text-blue-900 mb-1">যাচাই নির্দেশিকা:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-blue-900/90 font-tiro">
                        {result.verificationNotesBn.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-stone-500 font-tiro">
            খসড়া ফর্মে প্রয়োগ করলে ডাটাবেসে সেভ হবে না — ফর্ম দেখে নিজে &ldquo;ডকুমেন্ট সংরক্ষণ করুন&rdquo; চাপুন।
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-siliguri font-semibold text-stone-700 hover:bg-stone-200 rounded-xl transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-siliguri font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 rounded-xl shadow-xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              নির্বাচিত খসড়া ফর্মে প্রয়োগ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

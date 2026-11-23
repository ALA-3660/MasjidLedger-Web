import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api, WaqfDocumentAnalysisResult } from '../../lib/api';

interface WaqfDocumentAiAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'PROPERTY' | 'TENANT_LEASE';
  currentFormValues: Record<string, any>;
  onApplyDraftFields: (selectedFields: Record<string, any>) => void;
}

interface FieldMeta {
  key: string;
  labelBn: string;
  isCritical?: boolean; // Plot, Khatian, Deed/Agreement No, Date, Amount, Name
  isNumeric?: boolean;
}

const PROPERTY_FIELD_METAS: FieldMeta[] = [
  { key: 'name', labelBn: 'সম্পত্তির নাম', isCritical: true },
  { key: 'category', labelBn: 'ক্যাটাগরি' },
  { key: 'type', labelBn: 'সম্পত্তির ধরন' },
  { key: 'location', labelBn: 'অবস্থান / ঠিকানা' },
  { key: 'mouza', labelBn: 'মৌজা', isCritical: true },
  { key: 'jlNumber', labelBn: 'জে.এল. নম্বর', isCritical: true },
  { key: 'subRegistryOffice', labelBn: 'সাব-রেজিস্ট্রি অফিস' },
  { key: 'areaAmount', labelBn: 'জমির পরিমাণ (সংখ্যা)', isCritical: true, isNumeric: true },
  { key: 'areaUnit', labelBn: 'পরিমাপের একক' },
  { key: 'csPlotNo', labelBn: 'সি.এস. দাগ নম্বর', isCritical: true },
  { key: 'saPlotNo', labelBn: 'এস.এ. দাগ নম্বর', isCritical: true },
  { key: 'rsPlotNo', labelBn: 'আর.এস. দাগ নম্বর', isCritical: true },
  { key: 'bsPlotNo', labelBn: 'বি.এস. / সিটি দাগ নম্বর', isCritical: true },
  { key: 'plotNo', labelBn: 'সাধারণ দাগ নম্বর', isCritical: true },
  { key: 'csKhatianNo', labelBn: 'সি.এস. খতিয়ান নম্বর', isCritical: true },
  { key: 'saKhatianNo', labelBn: 'এস.এ. খতিয়ান নম্বর', isCritical: true },
  { key: 'rsKhatianNo', labelBn: 'আর.এস. খতিয়ান নম্বর', isCritical: true },
  { key: 'bsKhatianNo', labelBn: 'বি.এস. খতিয়ান নম্বর', isCritical: true },
  { key: 'mutationKhatianNo', labelBn: 'নামজারি খতিয়ান নম্বর', isCritical: true },
  { key: 'khatianNo', labelBn: 'সাধারণ খতিয়ান নম্বর', isCritical: true },
  { key: 'waqfDeedNo', labelBn: 'ওয়াকফ দলিল নম্বর', isCritical: true },
  { key: 'waqfDeedDate', labelBn: 'দলিলের তারিখ', isCritical: true },
  { key: 'waqfEnrollmentNo', labelBn: 'ওয়াকফ ই.সি. / এনরোলমেন্ট নং', isCritical: true },
  { key: 'waqifName', labelBn: 'ওয়াকিফের নাম', isCritical: true },
  { key: 'waqifFatherName', labelBn: 'ওয়াকিফের পিতার নাম' },
  { key: 'waqifAddress', labelBn: 'ওয়াকিফের ঠিকানা' },
  { key: 'waqfPurpose', labelBn: 'ওয়াকফের উদ্দেশ্য' },
  { key: 'boundaryNorth', labelBn: 'উত্তর সীমানা' },
  { key: 'boundarySouth', labelBn: 'দক্ষিণ সীমানা' },
  { key: 'boundaryEast', labelBn: 'পূর্ব সীমানা' },
  { key: 'boundaryWest', labelBn: 'পশ্চিম সীমানা' },
  { key: 'estimatedValue', labelBn: 'আনুমানিক বাজারমূল্য (৳)', isCritical: true, isNumeric: true },
  { key: 'monthlyIncome', labelBn: 'মাসিক সম্ভাব্য আয় (৳)', isCritical: true, isNumeric: true },
];

const TENANT_FIELD_METAS: FieldMeta[] = [
  { key: 'name', labelBn: 'ভাড়াটিয়া / ইজারাদারের নাম', isCritical: true },
  { key: 'fatherOrSpouseName', labelBn: 'পিতা / স্বামীর নাম' },
  { key: 'mobile', labelBn: 'মোবাইল নম্বর', isCritical: true },
  { key: 'nid', labelBn: 'জাতীয় পরিচয়পত্র (NID)', isCritical: true },
  { key: 'address', labelBn: 'ঠিকানা' },
  { key: 'unitOrShopNo', labelBn: 'দোকান / কক্ষ / ইউনিট নম্বর', isCritical: true },
  { key: 'businessName', labelBn: 'ব্যবসা প্রতিষ্ঠানের নাম' },
  { key: 'businessType', labelBn: 'ব্যবসার ধরন' },
  { key: 'agreementNo', labelBn: 'চুক্তি / ইজারা নম্বর', isCritical: true },
  { key: 'startDate', labelBn: 'চুক্তি শুরুর তারিখ', isCritical: true },
  { key: 'endDate', labelBn: 'চুক্তি শেষের তারিখ', isCritical: true },
  { key: 'monthlyRent', labelBn: 'মাসিক নির্ধারিত ভাড়া (৳)', isCritical: true, isNumeric: true },
  { key: 'securityDeposit', labelBn: 'জামানত / অগ্রিম (৳)', isCritical: true, isNumeric: true },
  { key: 'paymentDueDate', labelBn: 'ভাড়া পরিশোধের নির্ধারিত দিন', isNumeric: true },
];

function formatDisplayValue(val: any, isNumeric?: boolean): string {
  if (val === undefined || val === null || val === '' || (isNumeric && Number(val) <= 0)) {
    return '— (ফাঁকা)';
  }
  if (isNumeric) {
    return Number(val).toLocaleString('bn-BD');
  }
  return String(val);
}

export const WaqfDocumentAiAnalyzerModal: React.FC<WaqfDocumentAiAnalyzerModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentFormValues,
  onApplyDraftFields,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    mimeType: string;
    base64Data: string;
    previewUrl: string | null;
    sizeKb: number;
  } | null>(null);
  const [customHint, setCustomHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WaqfDocumentAnalysisResult | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const fieldMetas = mode === 'TENANT_LEASE' ? TENANT_FIELD_METAS : PROPERTY_FIELD_METAS;

  const handleFilePicked = (file?: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    setAnalysis(null);

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('শুধুমাত্র JPG, PNG, WebP ছবি অথবা PDF ডকুমেন্ট আপলোড করা যাবে।');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ফাইলের আকার সর্বোচ্চ ১০ মেগাবাইট হতে পারবে। অনুগ্রহ করে অপেক্ষাকৃত ছোট ফাইল দিন।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setSelectedFile({
        name: file.name,
        mimeType: file.type || 'image/jpeg',
        base64Data: dataUrl,
        previewUrl: file.type.startsWith('image/') ? dataUrl : null,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
    };
    reader.onerror = () => {
      setErrorMsg('ফাইলটি পড়তে সমস্যা হয়েছে। অনুগ্রহ করে আবার নির্বাচন করুন বা ম্যানুয়ালি ফর্ম পূরণ করুন।');
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) {
      setErrorMsg('অনুগ্রহ করে আগে দলিল, খতিয়ান বা চুক্তিপত্রের ছবি/PDF নির্বাচন করুন।');
      return;
    }
    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysis(null);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('AI বিশ্লেষণে নির্ধারিত সময়ের বেশি লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা ম্যানুয়ালি ফর্ম পূরণ করুন।')),
          45000
        )
      );

      const res = await Promise.race([
        api.analyzeWaqfDocumentAi({
          mode,
          file: {
            mimeType: selectedFile.mimeType,
            base64Data: selectedFile.base64Data,
            fileName: selectedFile.name,
          },
          customHint: customHint.trim() || undefined,
        }),
        timeoutPromise,
      ]);

      setAnalysis(res);

      // Auto-check extracted non-empty fields for review (never auto-applying without user click)
      const extractedSource: Record<string, any> =
        mode === 'TENANT_LEASE' ? res.tenantFields : res.propertyFields;
      const initialChecks: Record<string, boolean> = {};
      fieldMetas.forEach((fm) => {
        const val = extractedSource[fm.key];
        const hasVal = fm.isNumeric ? Number(val) > 0 : Boolean(val && String(val).trim());
        if (hasVal) {
          initialChecks[fm.key] = true;
        }
      });
      setCheckedKeys(initialChecks);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'AI ডকুমেন্ট পড়তে ব্যর্থ হয়েছে। আপনার মূল ফর্ম সম্পূর্ণ নিরাপদ রয়েছে—ম্যানুয়ালি তথ্য পূরণ করতে পারবেন।'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractedMap: Record<string, any> = analysis
    ? mode === 'TENANT_LEASE'
      ? analysis.tenantFields
      : analysis.propertyFields
    : {};

  const detectedRows = analysis
    ? fieldMetas.filter((fm) => {
        const val = extractedMap[fm.key];
        return fm.isNumeric ? Number(val) > 0 : Boolean(val && String(val).trim());
      })
    : [];

  const selectedCount = detectedRows.filter((r) => checkedKeys[r.key]).length;

  const handleApplyChecked = () => {
    if (!analysis) return;
    const patch: Record<string, any> = {};
    detectedRows.forEach((fm) => {
      if (checkedKeys[fm.key]) {
        patch[fm.key] = extractedMap[fm.key];
      }
    });
    if (Object.keys(patch).length === 0) {
      setErrorMsg('ফর্মে বসানোর জন্য অন্তত একটি তথ্য নির্বাচন করুন।');
      return;
    }
    onApplyDraftFields(patch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-siliguri">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                {mode === 'TENANT_LEASE'
                  ? 'AI ভাড়া ও ইজারা চুক্তিপত্র বিশ্লেষক'
                  : 'AI ওয়াকফ দলিল ও খতিয়ান বিশ্লেষক'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 font-semibold">
                  কেবল খসড়া প্রিভিউ
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100/90 font-tiro mt-0.5">
                দলিল, খতিয়ান বা ভাড়া চুক্তির ছবি/PDF থেকে তথ্য পড়ে ফর্মের খসড়া প্রস্তুত করবে — আপনার যাচাই ছাড়া কিছু সংরক্ষণ হবে না।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Error Protection Policy Banner */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/80 flex items-start gap-2.5 text-[11px] text-amber-950 font-tiro shrink-0">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong className="font-siliguri">কঠোর সুরক্ষা নীতি:</strong> AI কখনোই সরাসরি ডাটাবেসে সেভ করবে না। দাগ নম্বর, খতিয়ান নম্বর, দলিল/চুক্তি নম্বর, তারিখ, টাকার অঙ্ক ও ব্যক্তির নাম মূল কাগজের সাথে মিলিয়ে যাচাই করে তবেই ফর্মে বসান।
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Upload Area */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  ১. দলিল, খতিয়ান বা চুক্তিপত্রের ছবি / PDF নির্বাচন করুন
                </h4>
                <p className="text-[11px] text-slate-500 font-tiro">
                  সমর্থিত ফরম্যাট: JPG, PNG, WebP বা PDF (সর্বোচ্চ ১০ মেগাবাইট)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>ফাইল আপলোড</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>ক্যামেরা দিয়ে তুলুন</span>
                </button>
              </div>
            </div>

            {selectedFile && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedFile.previewUrl ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="Document Preview"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-rose-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</div>
                    <div className="text-[11px] text-slate-500 font-baloo">
                      {selectedFile.mimeType} • {selectedFile.sizeKb.toLocaleString('bn-BD')} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleRunAnalysis}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI ডকুমেন্ট পড়ছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{analysis ? 'পুনরায় বিশ্লেষণ করুন' : '✨ ডকুমেন্ট বিশ্লেষণ করুন'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div>
              <input
                type="text"
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
                placeholder="ঐচ্ছিক নির্দেশনা (যেমন: শুধুমাত্র বি.এস. খতিয়ান ও দাগ পড়ুন, অথবা দোকান নং ৩-এর ভাড়া চুক্তি)..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-tiro text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Error Alert with graceful manual fallback */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-rose-800">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">বিশ্লেষণে সমস্যা হয়েছে</div>
                  <p className="font-tiro mt-0.5">{errorMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer hover:bg-rose-100"
              >
                ম্যানুয়ালি লিখুন
              </button>
            </div>
          )}

          {/* Analysis Side-by-Side Comparison Preview */}
          {analysis && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary & Verification Notes */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">
                      শনাক্তকৃত নথি: {analysis.documentTypeDetectedBn}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      analysis.confidenceLevel === 'HIGH'
                        ? 'bg-emerald-200 text-emerald-900'
                        : analysis.confidenceLevel === 'LOW'
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    পাঠযোগ্যতা:{' '}
                    {analysis.confidenceLevel === 'HIGH'
                      ? 'উচ্চ'
                      : analysis.confidenceLevel === 'LOW'
                      ? 'কম (বিশেষ যাচাই প্রয়োজন)'
                      : 'মাঝারি (যাচাই করুন)'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-tiro leading-relaxed">
                  {analysis.extractedSummaryBn}
                </p>

                {analysis.verificationNotesBn.length > 0 && (
                  <div className="bg-white/90 border border-amber-200 rounded-xl p-3 space-y-1">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-700" />
                      <span>মূল তথ্য যাচাইয়ের নোট:</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 font-tiro space-y-0.5">
                      {analysis.verificationNotesBn.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.unclearFieldsBn.length > 0 && (
                  <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-tiro">
                    <strong className="font-siliguri">অস্পষ্ট বা নথিতে পাওয়া যায়নি:</strong>{' '}
                    {analysis.unclearFieldsBn.join(', ')}
                  </div>
                )}
              </div>

              {/* Side-by-side table: Current Form vs AI Proposed Draft */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800">
                    ২. মূল তথ্য বনাম AI প্রস্তাবিত খসড়া তুলনা ({detectedRows.length.toLocaleString('bn-BD')}টি তথ্য পাওয়া গেছে)
                  </div>
                  {detectedRows.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          detectedRows.forEach((r) => (all[r.key] = true));
                          setCheckedKeys(all);
                        }}
                        className="text-emerald-700 hover:underline font-bold cursor-pointer"
                      >
                        সব নির্বাচন
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setCheckedKeys({})}
                        className="text-slate-600 hover:underline font-bold cursor-pointer"
                      >
                        সব বাতিল
                      </button>
                    </div>
                  )}
                </div>

                {detectedRows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-tiro">
                    এই ডকুমেন্ট থেকে নিশ্চিত কোনো ফিল্ড পড়া যায়নি। অনুগ্রহ করে পরিষ্কার ছবি আপলোড করুন অথবা ম্যানুয়ালি ফর্ম পূরণ করুন।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2.5 w-10 text-center">বসান</th>
                          <th className="px-3 py-2.5">তথ্যের ক্ষেত্র</th>
                          <th className="px-3 py-2.5">বর্তমান ফর্মের মূল তথ্য</th>
                          <th className="px-3 py-2.5 w-6 text-center"></th>
                          <th className="px-3 py-2.5">AI প্রস্তাবিত খসড়া (যাচাই করুন)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detectedRows.map((fm) => {
                          const currentVal = currentFormValues[fm.key];
                          const proposedVal = extractedMap[fm.key];
                          const isChecked = Boolean(checkedKeys[fm.key]);
                          const hasExistingConflict =
                            (fm.isNumeric ? Number(currentVal) > 0 : Boolean(currentVal && String(currentVal).trim())) &&
                            String(currentVal) !== String(proposedVal);

                          return (
                            <tr
                              key={fm.key}
                              onClick={() =>
                                setCheckedKeys((prev) => ({ ...prev, [fm.key]: !prev[fm.key] }))
                              }
                              className={`cursor-pointer transition-colors ${
                                isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/80' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2.5 font-bold text-slate-800">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{fm.labelBn}</span>
                                  {fm.isCritical && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                      যাচাই আবশ্যক
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 font-tiro">
                                {formatDisplayValue(currentVal, fm.isNumeric)}
                              </td>
                              <td className="px-1 py-2.5 text-center text-slate-400">
                                <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-bold text-emerald-900 font-baloo">
                                  {formatDisplayValue(proposedVal, fm.isNumeric)}
                                </div>
                                {hasExistingConflict && (
                                  <div className="text-[10px] text-amber-700 font-tiro">
                                    বিদ্যমান মানের চেয়ে ভিন্ন — প্রয়োজনে আনচেক রাখুন
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            বাতিল / ম্যানুয়ালি পূরণ করুন
          </button>

          {analysis && detectedRows.length > 0 && (
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleApplyChecked}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                যাচাইকৃত খসড়া ফর্মে বসান ({selectedCount.toLocaleString('bn-BD')}টি তথ্য)
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

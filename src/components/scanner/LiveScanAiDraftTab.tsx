import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { api, LiveScanAiDraftResult } from '../../lib/api';

export interface ApprovedLiveScanDraft {
  targetModule: 'INCOME' | 'EXPENSE' | 'DOCUMENT' | 'SMART_NOTE';
  targetLabelBn: string;
  documentKindBn: string;
  titleBn: string;
  date: string;
  amount: string;
  suggestedHeadId: string;
  suggestedHeadNameBn: string;
  voucherOrRefNo: string;
  partyName: string;
  descriptionBn: string;
  previewImageDataUrl?: string | null;
  sourceFileName?: string;
}

interface LiveScanAiDraftTabProps {
  capturedSnapshotDataUrl?: string | null;
  onClearCapturedSnapshot?: () => void;
  onRequestLiveCapture?: () => void;
  canCaptureLiveCamera?: boolean;
  onSendDraftToModule?: (draft: ApprovedLiveScanDraft) => void;
}

const TARGET_MODULE_OPTIONS: Array<{
  value: 'INCOME' | 'EXPENSE' | 'DOCUMENT' | 'SMART_NOTE';
  labelBn: string;
  descBn: string;
}> = [
  { value: 'INCOME', labelBn: 'আয় খসড়া', descBn: 'দান, জুমা বা আয়ের রসিদ' },
  { value: 'EXPENSE', labelBn: 'ব্যয় / বিল খসড়া', descBn: 'বিল, মেমো বা ক্রয়ের ভাউচার' },
  { value: 'DOCUMENT', labelBn: 'সেন্ট্রাল ডকুমেন্ট', descBn: 'দলিল, খতিয়ান, চুক্তি বা চিঠি' },
  { value: 'SMART_NOTE', labelBn: 'স্মার্ট নোট', descBn: 'সভার নোট বা সাধারণ খসড়া' },
];

export const LiveScanAiDraftTab: React.FC<LiveScanAiDraftTabProps> = ({
  capturedSnapshotDataUrl,
  onClearCapturedSnapshot,
  onRequestLiveCapture,
  canCaptureLiveCamera = false,
  onSendDraftToModule,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadedFile, setUploadedFile] = useState<{
    mimeType: string;
    base64Data: string;
    fileName: string;
    previewUrl: string | null;
  } | null>(null);

  const [rawHintText, setRawHintText] = useState('');
  const [targetHint, setTargetHint] = useState<'AUTO' | 'INCOME' | 'EXPENSE' | 'DOCUMENT' | 'SMART_NOTE'>('AUTO');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<LiveScanAiDraftResult | null>(null);

  // Editable draft review states (user verifies & edits before routing — NEVER auto-saves)
  const [editTargetModule, setEditTargetModule] = useState<'INCOME' | 'EXPENSE' | 'DOCUMENT' | 'SMART_NOTE'>('EXPENSE');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editHeadId, setEditHeadId] = useState('');
  const [editHeadName, setEditHeadName] = useState('');
  const [editRefNo, setEditRefNo] = useState('');
  const [editPartyName, setEditPartyName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Active image comes from either uploaded file or captured live snapshot
  const activePreviewUrl = uploadedFile?.previewUrl || capturedSnapshotDataUrl || null;
  const activeFileName = uploadedFile?.fileName || (capturedSnapshotDataUrl ? 'live-camera-capture.jpg' : '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setErrorMsg('শুধুমাত্র JPG, PNG, WebP ছবি অথবা PDF ডকুমেন্ট আপলোড করা যাবে।');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ফাইলটি ১০ মেগাবাইটের বেশি বড়। অনুগ্রহ করে ছোট ছবি বা PDF নির্বাচন করুন।');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setErrorMsg('ফাইলটি পড়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        return;
      }
      if (onClearCapturedSnapshot) onClearCapturedSnapshot();
      setUploadedFile({
        mimeType: file.type,
        base64Data: dataUrl,
        fileName: file.name,
        previewUrl: file.type.startsWith('image/') ? dataUrl : null,
      });
      setResult(null);
    };
    reader.onerror = () => {
      setErrorMsg('ফাইল লোড করতে সমস্যা হয়েছে।');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearMedia = () => {
    setUploadedFile(null);
    if (onClearCapturedSnapshot) onClearCapturedSnapshot();
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    setErrorMsg(null);

    let fileDataPayload: { mimeType: string; base64Data: string; fileName?: string } | null = null;
    if (uploadedFile) {
      fileDataPayload = {
        mimeType: uploadedFile.mimeType,
        base64Data: uploadedFile.base64Data,
        fileName: uploadedFile.fileName,
      };
    } else if (capturedSnapshotDataUrl) {
      fileDataPayload = {
        mimeType: 'image/jpeg',
        base64Data: capturedSnapshotDataUrl,
        fileName: 'live-camera-capture.jpg',
      };
    }

    if (!fileDataPayload && !rawHintText.trim()) {
      setErrorMsg('বিশ্লেষণের জন্য ক্যামেরায় ছবি তুলুন, রসিদ/ডকুমেন্ট আপলোড করুন অথবা সংক্ষিপ্ত বিবরণ লিখুন।');
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await api.scanSmartVoucherOrDocAi({
        fileData: fileDataPayload,
        rawHintText: rawHintText.trim(),
        targetModuleHint: targetHint,
      });
      setResult(data);
      setEditTargetModule(data.suggestedTargetModule);
      setEditTitle(data.draftFields.titleBn || '');
      setEditDate(data.draftFields.date || '');
      setEditAmount(data.draftFields.amount !== null && data.draftFields.amount !== undefined ? String(data.draftFields.amount) : '');
      setEditHeadId(data.draftFields.suggestedHeadId || '');
      setEditHeadName(data.draftFields.suggestedHeadNameBn || '');
      setEditRefNo(data.draftFields.voucherOrRefNo || '');
      setEditPartyName(data.draftFields.partyName || '');
      setEditDescription(data.draftFields.descriptionBn || '');
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'AI বিশ্লেষণ করা যায়নি। আপনি সাধারণ QR স্ক্যান অথবা ম্যানুয়াল ফর্ম ব্যবহার করতে পারেন।'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyDraft = () => {
    const lines = [
      `[${TARGET_MODULE_OPTIONS.find((o) => o.value === editTargetModule)?.labelBn || 'স্ক্যান খসড়া'}]`,
      editTitle ? `শিরোনাম: ${editTitle}` : '',
      editDate ? `তারিখ: ${editDate}` : '',
      editAmount ? `টাকার পরিমাণ: ৳ ${editAmount}` : '',
      editHeadName ? `সম্ভাব্য খাত: ${editHeadName}` : '',
      editRefNo ? `ভাউচার/রসিদ/দলিল নং: ${editRefNo}` : '',
      editPartyName ? `ব্যক্তি/প্রতিষ্ঠান: ${editPartyName}` : '',
      editDescription ? `বিবরণ: ${editDescription}` : '',
    ].filter(Boolean);

    navigator.clipboard?.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendToModule = () => {
    if (!onSendDraftToModule) return;
    const targetOption = TARGET_MODULE_OPTIONS.find((o) => o.value === editTargetModule);
    onSendDraftToModule({
      targetModule: editTargetModule,
      targetLabelBn: targetOption?.labelBn || 'খসড়া',
      documentKindBn: result?.documentKindBn || 'স্ক্যানকৃত ডকুমেন্ট',
      titleBn: editTitle.trim(),
      date: editDate.trim(),
      amount: editAmount.trim(),
      suggestedHeadId: editHeadId.trim(),
      suggestedHeadNameBn: editHeadName.trim(),
      voucherOrRefNo: editRefNo.trim(),
      partyName: editPartyName.trim(),
      descriptionBn: editDescription.trim(),
      previewImageDataUrl: activePreviewUrl,
      sourceFileName: activeFileName,
    });
  };

  return (
    <div className="space-y-4 font-siliguri">
      {/* Safety Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>AI খসড়া সুরক্ষা:</strong> ক্যামেরা বা ছবি থেকে AI কেবল <strong>প্রিভিউ খসড়া</strong> তৈরি করে — কখনোই
          ডাটাবেসে সরাসরি সেভ করে না। লক্ষ্য মডিউলে পাঠানোর আগে মূল ছবি দেখে টাকার অঙ্ক, তারিখ ও রসিদ নম্বর যাচাই করে নিন।
        </p>
      </div>

      {/* Capture / Upload & Hint Input Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>ক্যাশ মেমো, বিল, রসিদ বা ডকুমেন্ট থেকে স্মার্ট খসড়া</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              লাইভ ক্যামেরায় ছবি তুলুন অথবা গ্যালারি থেকে ছবি/PDF নির্বাচন করুন
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCaptureLiveCamera && onRequestLiveCapture && (
              <button
                type="button"
                onClick={onRequestLiveCapture}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>লাইভ ক্যামেরা থেকে ছবি নিন</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ছবি / PDF আপলোড</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Media Preview */}
        {(activePreviewUrl || uploadedFile) && (
          <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3">
            {activePreviewUrl ? (
              <img
                src={activePreviewUrl}
                alt="স্ক্যানকৃত ছবি"
                className="w-20 h-20 object-cover rounded-lg border border-slate-300 shrink-0 bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <FileText className="w-7 h-7 text-rose-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{activeFileName || 'ক্যামেরায় তোলা ছবি'}</span>
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                AI বিশ্লেষণের জন্য প্রস্তুত — নিচের বাটনে চাপ দিয়ে খসড়া তৈরি করুন
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearMedia}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="ছবি সরান"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Target Module Hint + Optional Text */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              সম্ভাব্য মডিউল (ঐচ্ছিক)
            </label>
            <select
              value={targetHint}
              onChange={(e) => setTargetHint(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="AUTO">স্বয়ংক্রিয় শনাক্তকরণ (AI)</option>
              <option value="INCOME">আয় এন্ট্রি খসড়া</option>
              <option value="EXPENSE">ব্যয় / বিল খসড়া</option>
              <option value="DOCUMENT">সেন্ট্রাল ডকুমেন্ট খসড়া</option>
              <option value="SMART_NOTE">স্মার্ট নোট খসড়া</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              অতিরিক্ত তথ্য বা হাতে লেখা নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={rawHintText}
              onChange={(e) => setRawHintText(e.target.value)}
              placeholder="যেমন: এপ্রিল মাসের বিদ্যুৎ বিল, অথবা বাজারের সাউন্ড সিস্টেম মেরামতের মেমো..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!activePreviewUrl && !uploadedFile && !rawHintText.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI বিশ্লেষণ চলছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>✨ AI স্মার্ট খসড়া তৈরি করুন</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* AI Draft Preview & Verification Panel */}
      {result && (
        <div className="bg-white border-2 border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-emerald-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span className="text-xs font-bold">
                AI খসড়া প্রিভিউ — {result.documentKindBn}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-white/15 text-emerald-100">
                নিশ্চয়তা:{' '}
                {result.confidenceLevel === 'HIGH'
                  ? 'উচ্চ'
                  : result.confidenceLevel === 'MEDIUM'
                  ? 'মাঝারি'
                  : 'কম — ভালোভাবে যাচাই করুন'}
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="পুনরায় বিশ্লেষণ করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Sensitive Facts Verification Box */}
            {result.detectedSensitiveFacts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>মূল ছবির সাথে মিলিয়ে যাচাইযোগ্য সংবেদনশীল তথ্য:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {result.detectedSensitiveFacts.map((fact, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="font-bold text-slate-700">{fact.labelBn}: </span>
                      <span className="font-baloo font-bold text-amber-900">{fact.value}</span>
                      <p className="text-[10px] text-amber-700 mt-0.5">{fact.verifyWarningBn}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unclear Fields Alert */}
            {result.unclearFieldsBn.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-[11px] text-rose-800">
                <strong className="block mb-0.5">অস্পষ্ট বা অনুপস্থিত তথ্য (AI অনুমান করেনি — নিজ হাতে বসান):</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.unclearFieldsBn.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Draft Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  লক্ষ্য মডিউল নির্বাচন করুন (খসড়া কোথায় পাঠাবেন)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {TARGET_MODULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditTargetModule(opt.value)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        editTargetModule === opt.value
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{opt.labelBn}</div>
                      <div className="text-[10px] text-slate-500 truncate">{opt.descBn}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">শিরোনাম</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">তারিখ (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-baloo text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="অস্পষ্ট হলে খালি — নিজ হাতে লিখুন"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-baloo font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">প্রাসঙ্গিক হিসাব খাত / ক্যাটাগরি</label>
                <input
                  type="text"
                  value={editHeadName}
                  onChange={(e) => setEditHeadName(e.target.value)}
                  placeholder="যেমন: বিদ্যুৎ বিল / জুমা দান"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ভাউচার / রসিদ / দলিল নম্বর</label>
                <input
                  type="text"
                  value={editRefNo}
                  onChange={(e) => setEditRefNo(e.target.value)}
                  placeholder="মূল ছবি দেখে নিশ্চিত করুন"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ব্যক্তি বা প্রতিষ্ঠানের নাম</label>
                <input
                  type="text"
                  value={editPartyName}
                  onChange={(e) => setEditPartyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">সংক্ষিপ্ত বিবরণ</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCopyDraft}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">খসড়া কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>খসড়া কপি করুন</span>
                  </>
                )}
              </button>

              {onSendDraftToModule && (
                <button
                  type="button"
                  onClick={handleSendToModule}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <span>
                    {TARGET_MODULE_OPTIONS.find((o) => o.value === editTargetModule)?.labelBn || 'লক্ষ্য মডিউল'}-এ খসড়া পাঠান
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

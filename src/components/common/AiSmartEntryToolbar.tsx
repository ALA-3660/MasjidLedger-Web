import React, { useState, useRef } from 'react';
import {
  Camera,
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Wand2,
  ShieldCheck,
  Check,
  FileImage,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ZeroStorageCameraModal } from './ZeroStorageCameraModal';
import { FormAlertAssistant } from './FormAlertAssistant';
import { toBanglaNumber } from '../../lib/i18n';

export interface AiSmartEntryResult {
  date: string;
  amount: number;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId: string;
  subHeadNameBn: string;
  personName: string;
  vendorOrOrgName?: string;
  personPhone: string;
  paymentMethod?: 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET';
  reference: string;
  description: string;
  suggestedIncomeType?: 'JUMMA' | 'DONATION' | 'DONATION_BOX' | 'WAQF_RENT' | 'OTHER_INCOME';
  suggestedExpenseType?: 'GENERAL_EXPENSE' | 'STAFF_EXPENSE' | 'ASSET_EXPENSE' | 'PROPERTY_EXPENSE';
  matchedStaffId?: string;
  warningsBn?: string[];
  confidenceNoteBn: string;
}

function compressFileToEphemeralJpegBase64(file: File, maxDim = 1440): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ছবিটি পড়া যায়নি। অনুগ্রহ করে একটি স্পষ্ট ছবি নির্বাচন করুন।'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => {
        const idx = dataUrl.indexOf(',');
        resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
      };
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const idx = dataUrl.indexOf(',');
          resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.86);
        // Zero-storage cleanup: wipe canvas pixels immediately
        ctx.clearRect(0, 0, width, height);
        canvas.width = 0;
        canvas.height = 0;
        const idx = jpegUrl.indexOf(',');
        resolve(idx >= 0 ? jpegUrl.slice(idx + 1) : jpegUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

interface AiSmartEntryToolbarProps {
  entryType: 'INCOME' | 'EXPENSE';
  onApplyData: (data: AiSmartEntryResult) => void;
  accentColor?: 'emerald' | 'rose';
}

const INCOME_EXAMPLES = [
  'মোহাম্মদ ফিরোজ টেকনাফ থেকে দান বাবদ ৫০০০ টাকা দিয়েছেন',
  'You have received Tk 3,500.00 from 01712345678. Ref: মসজিদ দান। TrxID BKH9283741',
  'আজ জুমার কালেকশন ২৫,৫০০ টাকা',
  'দোকান নং ২ এর মার্চ মাসের ওয়াকফ ভাড়া ৮,০০০ টাকা বিকাশে পাওয়া গেছে',
];

const EXPENSE_EXAMPLES = [
  'আজ মসজিদের বাথরুম পরিষ্কারের সামগ্রী বাবদ ১,২৫০ টাকা খরচ হয়েছে',
  'মসজিদের ওজুখানার ট্যাপ ও মেরামত বাবদ ২,৩০০ টাকা নগদ পরিশোধ',
  'মসজিদের নির্মাণ ও উন্নয়নের জন্য ১০ বস্তা সিমেন্ট ক্রয় ৫,৪০০ টাকা',
  'মসজিদের বিদ্যুৎ বিল ৪,৮৫০ টাকা নগদ পরিশোধ',
];

type PreviewFieldKey =
  | 'date'
  | 'amount'
  | 'personName'
  | 'personPhone'
  | 'paymentMethod'
  | 'reference'
  | 'head'
  | 'description';

export const AiSmartEntryToolbar: React.FC<AiSmartEntryToolbarProps> = ({
  entryType,
  onApplyData,
  accentColor = entryType === 'INCOME' ? 'emerald' : 'rose',
}) => {
  const recognitionRef = useRef<any>(null);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<'CAMERA_SCAN' | 'FILE_SCAN' | 'TEXT_ENTRY' | null>(null);
  const [lastScanWasZeroStorage, setLastScanWasZeroStorage] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<AiSmartEntryResult | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<PreviewFieldKey, boolean>>({
    date: true,
    amount: true,
    personName: true,
    personPhone: true,
    paymentMethod: true,
    reference: true,
    head: true,
    description: true,
  });
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const examples = entryType === 'INCOME' ? INCOME_EXAMPLES : EXPENSE_EXAMPLES;
  const isEmerald = accentColor === 'emerald';

  const openPreviewCard = (parsed: AiSmartEntryResult) => {
    setPendingPreview(parsed);
    setSelectedFields({
      date: Boolean(parsed.date),
      amount: Number(parsed.amount) > 0,
      personName: Boolean(parsed.personName || parsed.vendorOrOrgName),
      personPhone: Boolean(parsed.personPhone),
      paymentMethod: Boolean(parsed.paymentMethod),
      reference: Boolean(parsed.reference),
      head: Boolean(parsed.mainHeadId),
      description: Boolean(parsed.description),
    });
  };

  const handleCameraExtractConfirm = async (payload: {
    base64: string;
    mimeType: string;
    source: 'CAMERA' | 'FILE';
  }) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    setIsProcessing(true);
    setProcessingMode(payload.source === 'CAMERA' ? 'CAMERA_SCAN' : 'FILE_SCAN');

    try {
      const parsed = await api.parseAiSmartEntry({
        mode: 'RECEIPT_SCAN',
        entryType,
        imageBase64: payload.base64,
        mimeType: payload.mimeType,
      });
      setLastScanWasZeroStorage(true);
      openPreviewCard(parsed);
    } catch (err: any) {
      setErrorBanner(
        err?.message ||
          'রসিদ/বিল স্ক্যান করতে ব্যর্থ হয়েছে। আলো কম বা ছবি ঝাপসা হলে পুনরায় চেষ্টা করুন অথবা নিচের টেক্সট/ম্যানুয়াল এন্ট্রি ব্যবহার করুন।'
      );
      throw err;
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleDirectFileScanChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorBanner('অনুগ্রহ করে রসিদ, স্ক্রিনশট বা ক্যাশ মেমোর একটি পরিষ্কার ছবি (JPG/PNG/WEBP) নির্বাচন করুন।');
      return;
    }

    setErrorBanner(null);
    setSuccessBanner(null);
    setIsProcessing(true);
    setProcessingMode('FILE_SCAN');

    let ephemeralBase64 = '';
    try {
      ephemeralBase64 = await compressFileToEphemeralJpegBase64(file, 1440);
      const parsed = await api.parseAiSmartEntry({
        mode: 'RECEIPT_SCAN',
        entryType,
        imageBase64: ephemeralBase64,
        mimeType: 'image/jpeg',
      });
      ephemeralBase64 = '';
      setLastScanWasZeroStorage(true);
      openPreviewCard(parsed);
    } catch (err: any) {
      ephemeralBase64 = '';
      setErrorBanner(
        err?.message ||
          'ছবি থেকে তথ্য পড়া যায়নি। অনুগ্রহ করে পরিষ্কার ছবি দিন অথবা টেক্সট/ম্যানুয়াল এন্ট্রি চালু রাখুন।'
      );
    } finally {
      ephemeralBase64 = '';
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleQuickTextSubmit = async () => {
    const cleaned = quickText.trim();
    if (!cleaned || isProcessing) return;

    setErrorBanner(null);
    setSuccessBanner(null);
    setIsProcessing(true);
    setProcessingMode('TEXT_ENTRY');

    try {
      const parsed = await api.parseAiSmartEntry({
        mode: 'TEXT_ENTRY',
        entryType,
        text: cleaned,
      });
      setLastScanWasZeroStorage(false);
      openPreviewCard(parsed);
      setQuickText('');
      setIsQuickOpen(false);
    } catch (err: any) {
      setErrorBanner(err?.message || 'AI দ্রুত এন্ট্রি বিশ্লেষণ ব্যর্থ হয়েছে। আপনি ম্যানুয়ালি ফর্ম পূরণ করতে পারবেন।');
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };

  const handleConfirmApplyToForm = () => {
    if (!pendingPreview) return;

    const filtered: AiSmartEntryResult = {
      ...pendingPreview,
      date: selectedFields.date ? pendingPreview.date : '',
      amount: selectedFields.amount ? pendingPreview.amount : 0,
      personName: selectedFields.personName ? pendingPreview.personName : '',
      vendorOrOrgName: selectedFields.personName ? pendingPreview.vendorOrOrgName : '',
      personPhone: selectedFields.personPhone ? pendingPreview.personPhone : '',
      paymentMethod: selectedFields.paymentMethod ? pendingPreview.paymentMethod : undefined,
      reference: selectedFields.reference ? pendingPreview.reference : '',
      mainHeadId: selectedFields.head ? pendingPreview.mainHeadId : '',
      mainHeadNameBn: selectedFields.head ? pendingPreview.mainHeadNameBn : '',
      subHeadId: selectedFields.head ? pendingPreview.subHeadId : '',
      subHeadNameBn: selectedFields.head ? pendingPreview.subHeadNameBn : '',
      description: selectedFields.description ? pendingPreview.description : '',
    };

    onApplyData(filtered);
    setPendingPreview(null);
    setSuccessBanner(
      lastScanWasZeroStorage
        ? 'অনুমোদিত তথ্যগুলো ফর্মে বসানো হয়েছে (ডাটাবেসে এখনো সেভ হয়নি এবং স্ক্যান করা ছবি মেমোরি থেকে মুছে ফেলা হয়েছে)। টাকার অঙ্ক, তারিখ ও রসিদ নম্বর যাচাই করে নিজে "সংরক্ষণ করুন" বাটনে ক্লিক করুন।'
        : 'অনুমোদিত তথ্যগুলো ফর্মে বসানো হয়েছে (ডাটাবেসে এখনো সেভ হয়নি)। অনুগ্রহ করে টাকার অঙ্ক, তারিখ ও রসিদ নম্বর যাচাই করে নিজে "সংরক্ষণ করুন" বাটনে ক্লিক করুন।'
    );
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorBanner(
        'আপনার ব্রাউজারে বাংলা ভয়েস ইনপুট সমর্থিত নয়। অনুগ্রহ করে নিচের বক্সে বাংলায় লিখে দিন।'
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    setErrorBanner(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuickText(transcript);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setErrorBanner('মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি। ব্রাউজার থেকে মাইক্রোফোন অ্যালাউ করুন।');
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div
      className={`rounded-xl border p-3 sm:p-3.5 font-siliguri transition-all ${
        isEmerald
          ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 border-emerald-200'
          : 'bg-gradient-to-r from-rose-50/90 via-amber-50/60 to-rose-50/90 border-rose-200'
      }`}
    >
      <ZeroStorageCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        titleBn={
          entryType === 'INCOME'
            ? '📷 ক্যামেরা দিয়ে রসিদ স্ক্যান করুন (ফাইল সেভ না করে)'
            : '📷 ক্যামেরা দিয়ে বিল/ক্যাশ মেমো স্ক্যান করুন (ফাইল সেভ না করে)'
        }
        subtitleBn="সরাসরি রসিদ/বিল/স্ক্রিনশট স্ক্যান করুন — ছবি সংরক্ষণ না করেই তথ্য প্রিভিউ দেখাবে।"
        accentColor={isEmerald ? 'emerald' : 'rose'}
        allowPdfFallback={false}
        onCaptureConfirm={handleCameraExtractConfirm}
      />

      <input
        ref={directFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleDirectFileScanChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isEmerald
                ? 'bg-emerald-700 text-amber-300'
                : 'bg-rose-700 text-amber-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
              {entryType === 'INCOME'
                ? 'AI স্মার্ট এন্ট্রি (রসিদ / বিকাশ SMS / টেক্সট)'
                : 'AI বিল/রসিদ স্ক্যান ও দ্রুত এন্ট্রি'}
            </div>
            <div className="text-[11px] text-slate-600 leading-tight font-tiro">
              {entryType === 'INCOME'
                ? 'লাইভ ক্যামেরা বা স্ক্রিনশট থেকে রসিদ পড়ুন (জিরো-স্টোরেজ: ছবি সেভ হবে না) — প্রিভিউ যাচাই করে ফর্মে বসান'
                : 'লাইভ ক্যামেরা বা ছবি দিয়ে ক্যাশ মেমো/হার্ডওয়্যার বিল পড়ুন (জিরো-স্টোরেজ: ছবি সেভ হবে না)'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Zero-Storage Live Camera Scan Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              setErrorBanner(null);
              setIsCameraModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer ${
              isEmerald
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                : 'bg-rose-700 hover:bg-rose-800 text-white'
            }`}
          >
            {isProcessing && processingMode === 'CAMERA_SCAN' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>
              {isProcessing && processingMode === 'CAMERA_SCAN'
                ? entryType === 'INCOME'
                  ? 'ক্যামেরা রসিদ পড়া হচ্ছে...'
                  : 'ক্যামেরা বিল পড়া হচ্ছে...'
                : entryType === 'INCOME'
                ? '📷 ক্যামেরা দিয়ে রসিদ স্ক্যান করুন (ফাইল সেভ না করে)'
                : '📷 ক্যামেরা দিয়ে বিল/ক্যাশ মেমো স্ক্যান করুন (ফাইল সেভ না করে)'}
            </span>
          </button>

          {/* 2. Existing Direct Screenshot / Cash Memo Image Scan Button (Zero-Storage) */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              setErrorBanner(null);
              directFileInputRef.current?.click();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border shadow-2xs transition disabled:opacity-50 cursor-pointer ${
              isEmerald
                ? 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-white hover:bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {isProcessing && processingMode === 'FILE_SCAN' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileImage className="w-3.5 h-3.5" />
            )}
            <span>
              {isProcessing && processingMode === 'FILE_SCAN'
                ? 'ছবি বিশ্লেষণ হচ্ছে...'
                : entryType === 'INCOME'
                ? 'রসিদ / স্ক্রিনশট স্ক্যান'
                : 'বিল / ক্যাশ মেমো স্ক্যান'}
            </span>
          </button>

          {/* 3. Existing SMS / Bangla Text & Voice Smart Entry Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              setIsQuickOpen((prev) => !prev);
              setErrorBanner(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border shadow-2xs transition disabled:opacity-50 cursor-pointer ${
              isQuickOpen
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            <span>{entryType === 'INCOME' ? 'বিকাশ SMS / টেক্সট ও ভয়েস' : 'AI দ্রুত এন্ট্রি'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Human-in-the-Loop Preview & Selective Apply Card */}
      {pendingPreview && (
        <div className="mt-3 p-3.5 rounded-xl bg-white border-2 border-indigo-300 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>স্ক্যান থেকে প্রাপ্ত তথ্যের প্রিভিউ (যাচাই করে ফর্মে বসান)</span>
              </div>
              <p className="text-[11px] text-amber-800 font-tiro mt-0.5">
                গুরুত্বপূর্ণ: টাকার অঙ্ক, তারিখ, দোকান/দাতার নাম ও রসিদ নম্বর নিজ চোখে মিলিয়ে তারপর অনুমোদন দিন।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingPreview(null)}
              className="text-slate-400 hover:text-slate-700 p-1"
              title="প্রিভিউ বাতিল করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {pendingPreview.warningsBn && pendingPreview.warningsBn.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 space-y-1 font-tiro">
              {pendingPreview.warningsBn.map((warn, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.amount}
                disabled={!(Number(pendingPreview.amount) > 0)}
                onChange={(e) => setSelectedFields((p) => ({ ...p, amount: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div>
                <div className="text-[10px] font-bold text-slate-500">টাকার পরিমাণ *</div>
                <div className={`font-bold font-baloo ${Number(pendingPreview.amount) > 0 ? 'text-slate-900' : 'text-amber-700 text-[11px]'}`}>
                  {Number(pendingPreview.amount) > 0
                    ? `৳ ${toBanglaNumber(pendingPreview.amount)}`
                    : 'স্পষ্ট নয় (ম্যানুয়ালি দিন)'}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.date}
                disabled={!pendingPreview.date}
                onChange={(e) => setSelectedFields((p) => ({ ...p, date: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div>
                <div className="text-[10px] font-bold text-slate-500">তারিখ</div>
                <div className={`font-bold font-baloo ${pendingPreview.date ? 'text-slate-900' : 'text-amber-700 text-[11px]'}`}>
                  {pendingPreview.date || 'পাওয়া যায়নি (ম্যানুয়ালি দিন)'}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.personName}
                onChange={(e) => setSelectedFields((p) => ({ ...p, personName: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500">
                  {entryType === 'INCOME' ? 'দাতা / প্রতিষ্ঠান' : 'দোকান / প্রতিষ্ঠান / প্রাপক'}
                </div>
                <div className="font-bold text-slate-900 truncate">
                  {entryType === 'EXPENSE'
                    ? pendingPreview.vendorOrOrgName || pendingPreview.personName || 'উল্লেখ নেই'
                    : pendingPreview.personName || pendingPreview.vendorOrOrgName || 'উল্লেখ নেই'}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.paymentMethod}
                onChange={(e) => setSelectedFields((p) => ({ ...p, paymentMethod: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div>
                <div className="text-[10px] font-bold text-slate-500">পেমেন্ট মাধ্যম</div>
                <div className="font-bold text-slate-900">{pendingPreview.paymentMethod || 'CASH'}</div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.reference}
                onChange={(e) => setSelectedFields((p) => ({ ...p, reference: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500">রসিদ / মেমো / TrxID</div>
                <div className="font-bold text-slate-900 truncate">{pendingPreview.reference || 'উল্লেখ নেই'}</div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.personPhone}
                onChange={(e) => setSelectedFields((p) => ({ ...p, personPhone: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div>
                <div className="text-[10px] font-bold text-slate-500">মোবাইল নম্বর</div>
                <div className="font-bold text-slate-900 font-baloo">{pendingPreview.personPhone || 'উল্লেখ নেই'}</div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.head}
                onChange={(e) => setSelectedFields((p) => ({ ...p, head: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500">প্রস্তাবিত খাত</div>
                <div className="font-bold text-slate-900 truncate">
                  {pendingPreview.mainHeadNameBn || 'সাধারণ'}
                  {pendingPreview.subHeadNameBn ? ` → ${pendingPreview.subHeadNameBn}` : ''}
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer sm:col-span-2 lg:col-span-1">
              <input
                type="checkbox"
                checked={selectedFields.description}
                onChange={(e) => setSelectedFields((p) => ({ ...p, description: e.target.checked }))}
                className="mt-0.5 rounded text-emerald-700"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500">আইটেম / বিবরণ</div>
                <div className="font-medium text-slate-800 line-clamp-2 font-tiro">
                  {pendingPreview.description || 'উল্লেখ নেই'}
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-600 font-tiro block">
                {pendingPreview.confidenceNoteBn}
              </span>
              {lastScanWasZeroStorage && (
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  জিরো-স্টোরেজ নিশ্চিত: ছবিটি ডিস্ক বা ডাটাবেসে সেভ করা হয়নি এবং মেমোরি থেকে পরিষ্কার করা হয়েছে।
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingPreview(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyToForm}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ফর্মে বসান / Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Bangla Voice / Text / bKash-Nagad SMS Smart Entry Box */}
      {isQuickOpen && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <textarea
                rows={2}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuickTextSubmit();
                  }
                }}
                placeholder={
                  entryType === 'INCOME'
                    ? 'বিকাশ/নগদ SMS পেস্ট করুন অথবা বাংলায় লিখুন/বলুন: যেমন "মোহাম্মদ ফিরোজ টেকনাফ থেকে দান বাবদ ৫০০০ টাকা দিয়েছেন"...'
                    : 'বাংলায় লিখুন বা বলুন: যেমন "আজ মসজিদের বাথরুম পরিষ্কারের সামগ্রী বাবদ ১,২৫০ টাকা খরচ হয়েছে"...'
                }
                className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700 font-tiro"
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? 'ভয়েস বন্ধ করুন' : 'বাংলায় বলুন (ভয়েস ইনপুট)'}
                className={`absolute right-2 top-2.5 p-1.5 rounded-md transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              disabled={!quickText.trim() || isProcessing}
              onClick={handleQuickTextSubmit}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isProcessing && processingMode === 'TEXT_ENTRY' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>বিশ্লেষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>প্রিভিউ দেখান</span>
                </>
              )}
            </button>
          </div>

          {isListening && (
            <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span>শুনছি... এখন বাংলায় বলুন (যেমন: "{examples[0]}")</span>
            </div>
          )}

          {/* Quick Example Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">উদাহরণ:</span>
            {examples.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuickText(ex)}
                className="text-[11px] px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition text-left"
              >
                “{ex}”
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verification Success Banner (Never auto-saves!) */}
      {successBanner && (
        <div className="mt-2.5 rounded-lg bg-emerald-100/90 border border-emerald-300 px-3 py-2 flex items-start justify-between gap-2 text-xs text-emerald-950">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-800 hover:text-emerald-950 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Banner + AI Form Alert Assistant */}
      {errorBanner && (
        <div className="mt-2.5 rounded-lg bg-rose-100/90 border border-rose-300 px-3 py-2 space-y-1.5 text-xs text-rose-900">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-800 hover:text-rose-950 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <FormAlertAssistant
            alertMessage={errorBanner}
            formNameBn={entryType === 'INCOME' ? 'আয় ও প্রাপ্তি স্ক্যানার' : 'ব্যয় ও বিল স্ক্যানার'}
            moduleKey={entryType === 'INCOME' ? 'INCOME_SCANNER' : 'EXPENSE_SCANNER'}
            alertType="ERROR"
            compact
          />
        </div>
      )}
    </div>
  );
};

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
} from 'lucide-react';
import { api } from '../../lib/api';

export interface AiSmartEntryResult {
  date: string;
  amount: number;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId: string;
  subHeadNameBn: string;
  personName: string;
  personPhone: string;
  paymentMethod: 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET';
  reference: string;
  description: string;
  suggestedIncomeType?: 'JUMMA' | 'DONATION' | 'DONATION_BOX' | 'WAQF_RENT' | 'OTHER_INCOME';
  suggestedExpenseType?: 'GENERAL_EXPENSE' | 'STAFF_EXPENSE' | 'ASSET_EXPENSE' | 'PROPERTY_EXPENSE';
  matchedStaffId?: string;
  confidenceNoteBn: string;
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

function compressImageToBase64(file: File, maxDim = 1400): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('রসিদের ছবিটি পড়া যায়নি।'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data URL if Image decode fails
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({ base64, mimeType: file.type || 'image/jpeg' });
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
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          resolve({ base64, mimeType: file.type || 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          base64: compressed.split(',')[1] || '',
          mimeType: 'image/jpeg',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const AiSmartEntryToolbar: React.FC<AiSmartEntryToolbarProps> = ({
  entryType,
  onApplyData,
  accentColor = entryType === 'INCOME' ? 'emerald' : 'rose',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<'RECEIPT_SCAN' | 'TEXT_ENTRY' | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const examples = entryType === 'INCOME' ? INCOME_EXAMPLES : EXPENSE_EXAMPLES;
  const isEmerald = accentColor === 'emerald';

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so selecting same file again works
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setErrorBanner('অনুগ্রহ করে রসিদ বা বিলের একটি পরিষ্কার ছবি (JPG/PNG/WEBP) নির্বাচন করুন।');
      return;
    }

    setErrorBanner(null);
    setSuccessBanner(null);
    setIsProcessing(true);
    setProcessingMode('RECEIPT_SCAN');

    try {
      const { base64, mimeType } = await compressImageToBase64(file);
      const parsed = await api.parseAiSmartEntry({
        mode: 'RECEIPT_SCAN',
        entryType,
        imageBase64: base64,
        mimeType,
      });
      onApplyData(parsed);
      setSuccessBanner(
        `AI রসিদ থেকে তথ্য ফর্মে বসিয়ে দিয়েছে${parsed.confidenceNoteBn ? ` (${parsed.confidenceNoteBn})` : ''} — অনুগ্রহ করে যাচাই করে নিচের 'সংরক্ষণ করুন' বাটনে ক্লিক করুন।`
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'রসিদ স্ক্যান করতে ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
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
      onApplyData(parsed);
      setSuccessBanner(
        `AI আপনার তথ্য বুঝে ফর্মে বসিয়ে দিয়েছে${parsed.confidenceNoteBn ? ` (${parsed.confidenceNoteBn})` : ''} — অনুগ্রহ করে যাচাই করে নিচের 'সংরক্ষণ করুন' বাটনে ক্লিক করুন।`
      );
      setQuickText('');
      setIsQuickOpen(false);
    } catch (err: any) {
      setErrorBanner(err?.message || 'AI দ্রুত এন্ট্রি বিশ্লেষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
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
      {/* Hidden File Input for Receipt Vision Scan */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptFileChange}
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
            <div className="text-[11px] text-slate-600 leading-tight">
              {entryType === 'INCOME'
                ? 'কাঁচা রসিদের ছবি, বিকাশ/নগদ SMS পেস্ট অথবা বাংলায় লিখে/বলে ফর্ম পূরণ করুন'
                : 'বাজারের ক্যাশ মেমো, হার্ডওয়্যার বা নির্মাণ বিলের ছবি আপলোড অথবা বাংলায় লিখে/বলে ফর্ম পূরণ করুন'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50 cursor-pointer ${
              isEmerald
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                : 'bg-rose-700 hover:bg-rose-800 text-white'
            }`}
          >
            {isProcessing && processingMode === 'RECEIPT_SCAN' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>
              {isProcessing && processingMode === 'RECEIPT_SCAN'
                ? entryType === 'INCOME'
                  ? 'রসিদ পড়া হচ্ছে...'
                  : 'বিল / মেমো পড়া হচ্ছে...'
                : entryType === 'INCOME'
                ? 'রসিদ / স্ক্রিনশট স্ক্যান'
                : 'বিল / ক্যাশ মেমো স্ক্যান'}
            </span>
          </button>

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
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition disabled:opacity-50 shrink-0"
            >
              {isProcessing && processingMode === 'TEXT_ENTRY' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>বিশ্লেষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>ফর্ম পূরণ করুন</span>
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

      {/* Error Banner */}
      {errorBanner && (
        <div className="mt-2.5 rounded-lg bg-rose-100/90 border border-rose-300 px-3 py-2 flex items-start justify-between gap-2 text-xs text-rose-900">
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
      )}
    </div>
  );
};

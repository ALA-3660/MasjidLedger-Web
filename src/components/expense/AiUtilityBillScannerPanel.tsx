import React, { useState, useRef } from 'react';
import {
  Camera,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  TrendingUp,
  ArrowRight,
  BarChart3,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface UtilityPrefillPayload {
  date: string;
  amount: number;
  mainHeadId?: string;
  subHeadId?: string;
  payeeName?: string;
  reference?: string;
  description?: string;
}

interface AiUtilityBillScannerPanelProps {
  onApplyToExpenseForm: (prefill: UtilityPrefillPayload) => void;
}

function compressBillImageToBase64(file: File, maxDim = 1400): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('বিলের ছবিটি পড়া যায়নি।'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => {
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

export const AiUtilityBillScannerPanel: React.FC<AiUtilityBillScannerPanelProps> = ({
  onApplyToExpenseForm,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [billText, setBillText] = useState('');
  const [showTextBox, setShowTextBox] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'SCAN' | 'TEXT' | 'COMPARE' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.analyzeUtilityBillAi>> | null>(null);

  const handleBillFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setError('অনুগ্রহ করে বিদ্যুৎ, গ্যাস বা পানির বিলের একটি পরিষ্কার ছবি (JPG/PNG) নির্বাচন করুন।');
      return;
    }

    setError(null);
    setLoadingMode('SCAN');
    try {
      const { base64, mimeType } = await compressBillImageToBase64(file);
      const data = await api.analyzeUtilityBillAi({ imageBase64: base64, mimeType });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'ইউটিলিটি বিল স্ক্যান করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleTextAnalyze = async () => {
    if (!billText.trim() || loadingMode) return;
    setError(null);
    setLoadingMode('TEXT');
    try {
      const data = await api.analyzeUtilityBillAi({ text: billText.trim() });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'বিলের তথ্য বিশ্লেষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleCompareHistory = async () => {
    if (loadingMode) return;
    setError(null);
    setLoadingMode('COMPARE');
    try {
      const data = await api.analyzeUtilityBillAi({ compareOnly: true });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'গত ৩ মাসের গড় তুলনা করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 rounded-2xl border border-amber-200/90 p-4 sm:p-5 shadow-xs space-y-4 font-siliguri">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBillFileSelect}
      />

      {/* Top Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>AI ইউটিলিটি বিল অ্যানালাইজার (বিদ্যুৎ / গ্যাস / পানি)</span>
            </h4>
            <p className="text-xs text-slate-600 font-tiro mt-0.5">
              বিলের ছবি স্ক্যান করে বিল মাস, টাকার অঙ্ক ও শেষ তারিখ বের করুন এবং গত ৩ মাসের গড়ের তুলনায় ১৫%-এর বেশি বাড়লে তাৎক্ষণিক সতর্কতা পান।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!!loadingMode}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loadingMode === 'SCAN' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>{loadingMode === 'SCAN' ? 'বিল স্ক্যান হচ্ছে...' : 'AI বিল স্ক্যান (ছবি)'}</span>
          </button>

          <button
            type="button"
            disabled={!!loadingMode}
            onClick={() => setShowTextBox((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>টেক্সট / SMS থেকে</span>
          </button>

          <button
            type="button"
            disabled={!!loadingMode}
            onClick={handleCompareHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {loadingMode === 'COMPARE' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>৩ মাসের গড় তুলনা</span>
          </button>
        </div>
      </div>

      {/* Optional Quick Bill Text Input */}
      {showTextBox && (
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-amber-200/70">
          <input
            type="text"
            value={billText}
            onChange={(e) => setBillText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTextAnalyze();
              }
            }}
            placeholder='যেমন: "DESCO নভেম্বর ২০২৬ বিদ্যুৎ বিল ৬,৪৫০ টাকা, পরিশোধের শেষ তারিখ ২৫ নভেম্বর"'
            className="flex-1 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 font-tiro focus:ring-2 focus:ring-amber-400 outline-hidden"
          />
          <button
            type="button"
            disabled={!billText.trim() || !!loadingMode}
            onClick={handleTextAnalyze}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loadingMode === 'TEXT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>বিশ্লেষণ করুন</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Parsed Result + 15% Spike Warning */}
      {result && (
        <div className="space-y-3 pt-2 border-t border-amber-200/70">
          {/* >15% Spike Alert Notification */}
          {result.spikeAlert && (
            <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="text-xs sm:text-sm font-extrabold text-rose-800 flex flex-wrap items-center gap-2">
                  <span>অস্বাভাবিক বিল বৃদ্ধির সতর্কতা (+{result.percentChange}%)</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                    ১৫%-এর বেশি বৃদ্ধি
                  </span>
                </div>
                <p className="text-xs text-rose-900 font-tiro leading-relaxed">
                  {result.spikeWarningBn}
                </p>
              </div>
            </div>
          )}

          {/* Extracted Bill Summary Grid */}
          <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-900">
                  {result.utilityTypeBn}
                  {result.providerName ? ` — ${result.providerName}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500">বিল মাস</div>
                <div className="text-xs font-extrabold text-slate-900 mt-0.5">{result.billingMonthBn}</div>
              </div>
              <div className="bg-rose-50/70 rounded-lg p-2.5 border border-rose-200">
                <div className="text-[10px] font-bold text-rose-700">বিলের পরিমাণ</div>
                <div className="text-sm font-black font-mono text-rose-700 font-baloo mt-0.5">
                  ৳ {result.amount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-amber-50/70 rounded-lg p-2.5 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>পরিশোধের শেষ তারিখ</span>
                </div>
                <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
                  {result.dueDate || 'উল্লেখ নেই'}
                </div>
              </div>
              <div className="bg-emerald-50/70 rounded-lg p-2.5 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>গত ৩ মাসের গড়</span>
                </div>
                <div className="text-xs font-extrabold font-mono text-slate-900 mt-0.5">
                  {result.last3MonthsAvg > 0
                    ? `৳ ${result.last3MonthsAvg.toLocaleString('en-IN')}${
                        result.percentChange !== null
                          ? ` (${result.percentChange > 0 ? '+' : ''}${result.percentChange}%)`
                          : ''
                      }`
                    : 'পূর্বের তথ্য নেই'}
                </div>
              </div>
            </div>

            {result.commentaryBn && (
              <p className="text-xs text-slate-700 font-tiro bg-slate-50 rounded-lg px-3 py-2 border border-slate-200/80 leading-relaxed">
                {result.commentaryBn}
              </p>
            )}

            {result.mode === 'BILL_SCAN' && result.amount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  * কোনো ডাটা অটো-সেভ হয়নি — ফর্মে বসিয়ে যাচাই করে সংরক্ষণ করুন।
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onApplyToExpenseForm({
                      date: new Date().toISOString().split('T')[0],
                      amount: result.amount,
                      mainHeadId: result.mainHeadId || undefined,
                      subHeadId: result.subHeadId || undefined,
                      payeeName: result.providerName || result.utilityTypeBn,
                      reference: result.reference || result.meterOrAccountNo || `বিল-${result.billingMonth}`,
                      description: `${result.descriptionBn}${result.dueDate ? ` | শেষ তারিখ: ${result.dueDate}` : ''}`,
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <span>ব্যয় ফর্মে বসান (যাচাই ও সংরক্ষণ)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

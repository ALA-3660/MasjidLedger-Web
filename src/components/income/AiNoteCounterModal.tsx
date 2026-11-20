import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Loader2,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { api } from '../../lib/api';
import { CashDenominationData } from '../../types';

interface AiNoteCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: 'JUMA' | 'BOX';
  onApplyToForm: (grandTotal: number, denominationData: CashDenominationData) => void;
}

const EXAMPLE_INPUTS = [
  '১০০০ টাকার ৫টা, ৫০০ টাকার ১২টা, ১০০ টাকার ২৫টা, ৫০ টাকার ১০টা, ২০ টাকার ১৫টা',
  '৫০০ টাকার ৮টা, ২০০ টাকার ১০টা, ১০০ টাকার ৩৫টা, ১০ টাকার ৪০টা আর ৫ টাকার কয়েন ২০টা',
  '১০০০ টাকার ৩টা, ৫০০ টাকার ১৫টা, ১০০ টাকার ১৮টা, ৫০ টাকার ২২টা, ৫ টাকার ৩০টা',
];

export const AiNoteCounterModal: React.FC<AiNoteCounterModalProps> = ({
  isOpen,
  onClose,
  context,
  onApplyToForm,
}) => {
  const recognitionRef = useRef<any>(null);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    denominationData: CashDenominationData;
    items: Array<{ labelBn: string; denom: number; count: number; subtotal: number; isCoin: boolean }>;
    grandTotal: number;
    totalNotesCount: number;
    totalCoinsCount: number;
    breakdownSummaryBn: string;
  } | null>(null);

  if (!isOpen) return null;

  const isJuma = context === 'JUMA';

  const toggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('আপনার ব্রাউজারে বাংলা ভয়েস ইনপুট সমর্থিত নয়। অনুগ্রহ করে নিচের ঘরে বাংলায় নোটের সংখ্যা লিখুন।');
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

    setErrorMsg(null);
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
      setInputText(transcript);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setErrorMsg('মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি। ব্রাউজার সেটিংস থেকে মাইক্রোফোন অ্যালাউ করুন।');
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCalculate = async () => {
    const cleaned = inputText.trim();
    if (!cleaned || isCalculating) return;

    setErrorMsg(null);
    setIsCalculating(true);
    try {
      const data = await api.parseIncomeNoteCounterAi({
        text: cleaned,
        context,
      });
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI নোট হিসাব বিশ্লেষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyToForm(result.grandTotal, result.denominationData);
    setResult(null);
    setInputText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-siliguri">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between shrink-0 ${
            isJuma
              ? 'bg-gradient-to-r from-teal-800 to-emerald-800'
              : 'bg-gradient-to-r from-emerald-800 to-teal-900'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-siliguri">
                AI নোট হিসাব ও এন্ট্রি ({isJuma ? 'জুমার কালেকশন' : 'দানবাক্স কালেকশন'})
              </h3>
              <p className="text-xs text-emerald-100 font-tiro">
                বাংলায় নোটের সংখ্যা লিখে বা মুখে বলুন — AI নির্ভুল মোট টাকা হিসাব করে ভাউচারের ঘরে বসিয়ে দেবে
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Input Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>নোট ও কয়েনের সংখ্যা লিখুন বা বলুন</span>
              </label>
              <button
                type="button"
                onClick={toggleVoice}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'শোনা বন্ধ করুন' : 'ভয়েস ইনপুট (বাংলা)'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='যেমন: "১০০০ টাকার ৫টা, ৫০০ টাকার ১২টা, ১০০ টাকার ২৫টা, ২০ টাকার ১০টা আর ৫ টাকার কয়েন ১৫টা"'
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-tiro"
            />

            {isListening && (
              <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span>শুনছি... স্পষ্টভাবে বাংলায় নোটের সংখ্যা বলুন</span>
              </div>
            )}

            {/* Quick Examples */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500">দ্রুত উদাহরণ (ক্লিক করে পরীক্ষা করুন):</div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_INPUTS.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputText(ex)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 text-left transition cursor-pointer"
                  >
                    “{ex}”
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={!inputText.trim() || isCalculating}
                onClick={handleCalculate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI হিসাব করছে...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 text-amber-300" />
                    <span>মোট টাকা হিসাব করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Calculation Result */}
          {result && (
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AI নোট বিভাজন ও নির্ভুল যোগফল</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  নোট: {result.totalNotesCount} টি | কয়েন: {result.totalCoinsCount} টি
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">নোট / কয়েনের ধরন</th>
                      <th className="px-3 py-2 text-center">সংখ্যা (টি)</th>
                      <th className="px-3 py-2 text-right">উপ-মোট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-800">{item.labelBn}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                          × {item.count}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          ৳ {item.subtotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 font-bold text-emerald-950 text-right">
                        সর্বমোট হিসাবকৃত টাকা:
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-base font-black text-emerald-800 font-baloo">
                        ৳ {result.grandTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-tiro">
                {result.breakdownSummaryBn} — এটি সরাসরি সেভ হবে না; ভাউচারের ঘরে বসানোর পর আপনি যাচাই করে <strong>সংরক্ষণ করুন</strong> বাটনে ক্লিক করবেন।
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  পুনরায় হিসাব
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
                >
                  <span>ভাউচারের ঘরে বসান (৳ {result.grandTotal.toLocaleString('en-IN')})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

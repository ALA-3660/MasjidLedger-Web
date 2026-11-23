import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  X,
  RotateCcw,
  AlertCircle,
  Loader2,
  Languages,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../lib/api';
import { SmartNoteVoiceFormatResult } from '../../types/smartNotesTypes';

interface SmartNoteVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptText: (text: string, aiFormatted: boolean) => void;
}

export const SmartNoteVoiceModal: React.FC<SmartNoteVoiceModalProps> = ({
  isOpen,
  onClose,
  onAcceptText,
}) => {
  const [speechLang, setSpeechLang] = useState<'bn-BD' | 'en-US'>('bn-BD');
  const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PAUSED'>('IDLE');
  const [rawTranscript, setRawTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAiFormatting, setIsAiFormatting] = useState(false);
  const [aiResult, setAiResult] = useState<SmartNoteVoiceFormatResult | null>(null);
  const [editableCorrected, setEditableCorrected] = useState('');

  const recognitionRef = useRef<any>(null);
  const statusRef = useRef<'IDLE' | 'LISTENING' | 'PAUSED'>('IDLE');
  statusRef.current = status;

  const stopRecognitionCleanly = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setInterimText('');
  };

  useEffect(() => {
    if (!isOpen) {
      stopRecognitionCleanly();
      setStatus('IDLE');
    }
    return () => {
      stopRecognitionCleanly();
    };
  }, [isOpen]);

  const startListening = (langOverride?: 'bn-BD' | 'en-US') => {
    setErrorMsg(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg(
        'আপনার বর্তমান ব্রাউজারে Web Speech API সাপোর্ট নেই। অনুগ্রহ করে Google Chrome বা Microsoft Edge ব্যবহার করুন অথবা নিচের বক্সে সরাসরি লেখা পেস্ট করে AI দিয়ে দাঁড়ি-কমা ঠিক করুন।'
      );
      return;
    }

    stopRecognitionCleanly();
    const recognition = new SpeechRecognition();
    recognition.lang = langOverride || speechLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalChunk += transcript + ' ';
        } else {
          interimChunk += transcript;
        }
      }
      if (finalChunk) {
        setRawTranscript((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${finalChunk.trim()}`);
      }
      setInterimText(interimChunk);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setErrorMsg('মাইক্রোফোনের অনুমতি (Microphone Permission) দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে মাইক্রোফোন অনুমতি দিন।');
        setStatus('IDLE');
      } else if (event.error === 'no-speech') {
        // Keep silent until user speaks
      } else if (event.error !== 'aborted') {
        setErrorMsg(`ভয়েস রেকর্ডিং ত্রুটি: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart continuous listening if user hasn't paused or stopped
      if (statusRef.current === 'LISTENING') {
        try {
          recognition.start();
        } catch {
          setStatus('PAUSED');
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setStatus('LISTENING');
    } catch {
      setErrorMsg('মাইক্রোফোন চালু করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      setStatus('IDLE');
    }
  };

  const handlePause = () => {
    setStatus('PAUSED');
    stopRecognitionCleanly();
  };

  const handleResume = () => {
    startListening();
  };

  const handleStop = () => {
    setStatus('IDLE');
    stopRecognitionCleanly();
  };

  const handleSwitchLang = (nextLang: 'bn-BD' | 'en-US') => {
    setSpeechLang(nextLang);
    if (status === 'LISTENING') {
      startListening(nextLang);
    }
  };

  const handleAiFixPunctuation = async () => {
    const combined = `${rawTranscript} ${interimText}`.trim();
    if (!combined) {
      setErrorMsg('আগে কিছু বলুন বা লিখুন, তারপর AI দাঁড়ি-কমা ও বানান সংশোধন করুন।');
      return;
    }
    if (status === 'LISTENING') {
      handleStop();
    }
    setErrorMsg(null);
    setIsAiFormatting(true);
    try {
      const res = await api.formatVoiceTranscriptAi(combined);
      setAiResult(res);
      setEditableCorrected(res.correctedText);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI দাঁড়ি-কমা সংশোধনে ত্রুটি হয়েছে।');
    } finally {
      setIsAiFormatting(false);
    }
  };

  const handleReset = () => {
    handleStop();
    setRawTranscript('');
    setInterimText('');
    setAiResult(null);
    setEditableCorrected('');
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const fullOriginal = `${rawTranscript}${interimText ? ` ${interimText}` : ''}`.trim();

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden font-siliguri">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#0f766e] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'LISTENING' ? 'bg-rose-500 animate-pulse' : 'bg-white/15'}`}>
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">🎙️ AI ভয়েস টাইপিং ও বানান শুদ্ধিকরণ</h3>
              <p className="text-[11px] text-emerald-100 font-tiro">
                বাংলা (bn-BD) ও ইংরেজি (en-US) লাইভ ভয়েস টাইপিং এবং Gemini AI দাঁড়ি-কমা বিন্যাস
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-700 mr-1">ভাষা:</span>
              <button
                type="button"
                onClick={() => handleSwitchLang('bn-BD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  speechLang === 'bn-BD'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                বাংলা (bn-BD)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLang('en-US')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  speechLang === 'en-US'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                English (en-US)
              </button>
            </div>

            {/* Record / Pause / Resume / Stop Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {status === 'IDLE' && (
                <button
                  type="button"
                  onClick={() => startListening()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>কথা বলা শুরু করুন</span>
                </button>
              )}

              {status === 'LISTENING' && (
                <>
                  <button
                    type="button"
                    onClick={handlePause}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>বিরতি (Pause)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>থামান (Stop)</span>
                  </button>
                </>
              )}

              {status === 'PAUSED' && (
                <>
                  <button
                    type="button"
                    onClick={handleResume}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>পুনরায় শুরু (Resume)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>সমাপ্ত</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleReset}
                title="সব লেখা মুছে নতুন করে শুরু করুন"
                className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Listening Indicator */}
          {status === 'LISTENING' && (
            <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2 rounded-xl text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>শুনছি... ({speechLang === 'bn-BD' ? 'বাংলা মোড' : 'ইংরেজি মোড'}) — স্বাভাবিকভাবে কথা বলুন</span>
              {interimText && <span className="text-rose-600 font-normal italic truncate ml-2">"{interimText}"</span>}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Safety Policy Notice */}
          <div className="flex items-start gap-2 bg-emerald-50/70 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-xl text-[11px] font-tiro">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>সুরক্ষা নীতি:</strong> ব্যক্তি/মসজিদ/এলাকার নাম, জমির দাগ-খতিয়ান নম্বর, তারিখ, টাকার অঙ্ক ও আরবি পরিভাষা AI পরিবর্তন করবে না। চূড়ান্ত লেখা আপনি যাচাই করে &quot;গ্রহণ করুন&quot; ক্লিক করলেই কেবল মূল নোটে যুক্ত হবে।
            </span>
          </div>

          {/* Side-by-Side Comparison Grid */}
          <div className={`grid gap-4 ${aiResult ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Original Transcript */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  ১. মূল ভয়েস লেখা (Original Text)
                </label>
                <span className="text-[11px] font-baloo text-slate-500">
                  অক্ষর: {fullOriginal.length.toLocaleString('bn-BD')}
                </span>
              </div>
              <textarea
                rows={aiResult ? 10 : 7}
                value={rawTranscript}
                onChange={(e) => setRawTranscript(e.target.value)}
                placeholder="মাইক্রোফোন চালু করে কথা বলুন—এখানে সরাসরি লেখা উঠবে (প্রয়োজনে হাতেও সম্পাদনা করতে পারবেন)..."
                className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-tiro leading-relaxed text-slate-800 bg-white resize-y"
              />
            </div>

            {/* AI Corrected Preview */}
            {aiResult && (
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>২. AI সংশোধিত লেখা (দাঁড়ি-কমা ও শুদ্ধ বানান)</span>
                  </label>
                  <span className="text-[10px] font-baloo bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    {aiResult.modelUsed}
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={editableCorrected}
                  onChange={(e) => setEditableCorrected(e.target.value)}
                  className="w-full p-3.5 rounded-xl border-2 border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-tiro leading-relaxed text-slate-900 bg-emerald-50/30 resize-y"
                />
                {aiResult.changesSummaryBn && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 font-tiro">
                    <strong>সংশোধন সারসংক্ষেপ:</strong> {aiResult.changesSummaryBn}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={isAiFormatting || !fullOriginal}
            onClick={handleAiFixPunctuation}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            {isAiFormatting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI দাঁড়ি-কমা ও বানান ঠিক করছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>✨ AI দাঁড়ি-কমা ও বানান ঠিক করুন</span>
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {fullOriginal && !aiResult && (
              <button
                type="button"
                onClick={() => {
                  onAcceptText(fullOriginal, false);
                  handleReset();
                  onClose();
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>মূল লেখা নোটে বসান</span>
              </button>
            )}

            {aiResult && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onAcceptText(fullOriginal, false);
                    handleReset();
                    onClose();
                  }}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  মূল লেখা নিন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAcceptText(editableCorrected.trim() || aiResult.correctedText, true);
                    handleReset();
                    onClose();
                  }}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>গ্রহণ করুন (AI সংশোধিত লেখা)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  FileText,
  Check,
  Copy,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  api,
  DenominationParseAiResult,
  DenominationSummaryNoteAiResult,
} from '../../lib/api';

interface DenominationAiHelperBarProps {
  currentNotes: Record<number, number>;
  currentCoins: Record<number, number>;
  grandTotal: number;
  contextLabelBn?: string;
  countedBy?: string;
  witnesses?: string;
  reference?: string;
  countingDateTime?: string;
  onApplyParsedCounts: (
    notes: Record<number, number>,
    coins: Record<number, number>,
    mode: 'REPLACE' | 'ADD'
  ) => void;
  onApplyNoteText?: (noteText: string) => void;
  compact?: boolean;
}

const SAMPLE_VOICE_PROMPTS = [
  '৫০০ টাকার নোট ১২টা, ১০০ টাকার নোট ২৫টা, ৫০ টাকার নোট ১০টা, ২০ টাকার নোট ১৫টা এবং ৫ টাকার কয়েন ২০টা',
  '১০০০ টাকার নোট ৫টা, ৫০০ টাকার নোট ৮টা, ২০০ টাকার নোট ১০টা আর ২ টাকার কয়েন ৫০টা',
];

export const DenominationAiHelperBar: React.FC<DenominationAiHelperBarProps> = ({
  currentNotes,
  currentCoins,
  grandTotal,
  contextLabelBn = 'নগদ অর্থ / কালেকশন গণনা',
  countedBy,
  witnesses,
  reference,
  countingDateTime,
  onApplyParsedCounts,
  onApplyNoteText,
  compact = false,
}) => {
  const [activePanel, setActivePanel] = useState<'NONE' | 'VOICE_PARSE' | 'SUMMARY_NOTE'>('NONE');

  // Voice / Text Parsing State
  const [rawText, setRawText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechUnsupportedMsg, setSpeechUnsupportedMsg] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<DenominationParseAiResult | null>(null);
  const [applyMode, setApplyMode] = useState<'REPLACE' | 'ADD'>('REPLACE');
  const [appliedSuccessMsg, setAppliedSuccessMsg] = useState<string | null>(null);

  // Summary Note State
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<DenominationSummaryNoteAiResult | null>(null);
  const [editableSummaryNote, setEditableSummaryNote] = useState('');
  const [editableShortNote, setEditableShortNote] = useState('');
  const [copiedNote, setCopiedNote] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    setSpeechUnsupportedMsg(null);
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setSpeechUnsupportedMsg(
        'আপনার ব্রাউজারে সরাসরি বাংলা ভয়েস সাপোর্ট নেই। অনুগ্রহ করে নিচের ঘরে বাংলায় নোট ও কয়েনের সংখ্যা লিখে দিন।'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'bn-BD';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setRawText((prev) => (prev.trim() ? `${prev.trim()}, ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setSpeechUnsupportedMsg(
          'মাইক্রোফোন অ্যাক্সেস বা ভয়েস শোনায় সমস্যা হয়েছে। আপনি নিচের ঘরে সরাসরি বাংলায় লিখে দিন।'
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechUnsupportedMsg(
        'ভয়েস চালু করা যায়নি। নিচের ঘরে বাংলায় নোট ও কয়েনের হিসাব লিখে দিন।'
      );
    }
  };

  const handleParseText = async () => {
    setParseError(null);
    setAppliedSuccessMsg(null);
    if (!rawText.trim()) {
      setParseError('অনুগ্রহ করে বাংলা ভয়েস দিন অথবা নোট ও কয়েনের সংখ্যা লিখুন।');
      return;
    }

    setIsParsing(true);
    try {
      const data = await api.parseDenominationCountsAi({ rawText: rawText.trim() });
      setParseResult(data);
    } catch (err: any) {
      setParseError(
        err?.message || 'নোট ও কয়েনের সংখ্যা বিশ্লেষণ করা যায়নি। অনুগ্রহ করে ম্যানুয়ালি সংখ্যা বসান।'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmApplyCounts = () => {
    if (!parseResult) return;
    onApplyParsedCounts(parseResult.notes, parseResult.coins, applyMode);
    setAppliedSuccessMsg(
      applyMode === 'REPLACE'
        ? 'নোট ও কয়েনের সংখ্যা কাউন্টারে খসড়া হিসেবে বসানো হয়েছে — সিস্টেম নিজেই মোট টাকা গণনা করেছে।'
        : 'নতুন সংখ্যাগুলো বর্তমান গণনার সাথে যোগ করা হয়েছে।'
    );
    setParseResult(null);
  };

  const handleGenerateSummaryNote = async () => {
    setNoteError(null);
    setActivePanel('SUMMARY_NOTE');
    if (grandTotal <= 0) {
      setNoteError('গণনা নোট তৈরির আগে অন্তত একটি নোট বা কয়েনের সংখ্যা লিখুন।');
      return;
    }
    setIsGeneratingNote(true);
    try {
      const data = await api.generateDenominationSummaryNoteAi({
        notes: currentNotes,
        coins: currentCoins,
        contextLabelBn,
        countedBy,
        witnesses,
        reference,
        countingDateTime,
      });
      setSummaryResult(data);
      setEditableSummaryNote(data.summaryNoteBn || '');
      setEditableShortNote(data.shortCopyTextBn || '');
    } catch (err: any) {
      setNoteError(
        err?.message || 'গণনা সারসংক্ষেপ নোট তৈরি করা যায়নি। আপনি সাধারণ কপি বাটন ব্যবহার করতে পারেন।'
      );
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleCopySummary = (text: string) => {
    if (!text.trim()) return;
    navigator.clipboard?.writeText(text.trim());
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 1800);
  };

  return (
    <div className={`font-siliguri ${compact ? 'mb-3' : 'mb-3.5'}`}>
      {/* Trigger Action Bar */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>AI গণনা সহায়ক (খসড়া প্রিভিউ — মোট হিসাব সিস্টেম নিজে করে)</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              setActivePanel((prev) => (prev === 'VOICE_PARSE' ? 'NONE' : 'VOICE_PARSE'))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              activePanel === 'VOICE_PARSE'
                ? 'bg-emerald-800 text-white'
                : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>✨ AI ভয়েস/নোট থেকে সংখ্যা বসান</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateSummaryNote}
            disabled={grandTotal <= 0 || isGeneratingNote}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              activePanel === 'SUMMARY_NOTE'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
          >
            {isGeneratingNote ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>✨ AI গণনা নোট তৈরি করুন</span>
          </button>
        </div>
      </div>

      {appliedSuccessMsg && (
        <div className="mt-2 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 text-[11px] text-emerald-900 flex items-center justify-between gap-2">
          <span className="font-medium">{appliedSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setAppliedSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Panel 1: Voice / Text to Denomination Counts */}
      {activePanel === 'VOICE_PARSE' && (
        <div className="mt-2 bg-white border-2 border-emerald-200 rounded-xl p-3 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-emerald-600" />
              <span>বাংলা ভয়েস বা লেখা থেকে নোট ও কয়েনের সংখ্যা বসান</span>
            </h5>
            <button
              type="button"
              onClick={() => setActivePanel('NONE')}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>শোনা বন্ধ করুন...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>বাংলায় বলুন (ভয়েস)</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-500">
                অথবা নিচে বাংলায় লিখুন (৫ ও ২ টাকার ক্ষেত্রে নোট/কয়েন আলাদা উল্লেখ করুন)
              </span>
            </div>

            {speechUnsupportedMsg && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                {speechUnsupportedMsg}
              </p>
            )}

            <textarea
              rows={2}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="উদাহরণ: ৫০০ টাকার নোট ১২টা, ১০০ টাকার নোট ২৫টা, ৫০ টাকার নোট ১০টা, ২০ টাকার নোট ১৫টা এবং ৫ টাকার কয়েন ২০টা"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">নমুনা:</span>
              {SAMPLE_VOICE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawText(sample)}
                  className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer truncate max-w-full"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseText}
                disabled={isParsing || !rawText.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>বিশ্লেষণ চলছে...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>সংখ্যা প্রিভিউ দেখুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {parseError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Side-by-Side Current vs Proposed Preview */}
          {parseResult && (
            <div className="bg-slate-50 border border-emerald-300 rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>প্রিভিউ যাচাই করুন (বর্তমান বনাম AI প্রস্তাবিত)</span>
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setApplyMode('REPLACE')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                      applyMode === 'REPLACE'
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    নতুন করে বসান
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyMode('ADD')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                      applyMode === 'ADD'
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    বর্তমানের সাথে যোগ
                  </button>
                </div>
              </div>

              {parseResult.parsedItems.length === 0 ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  প্রদত্ত লেখা থেকে কোনো সুনির্দিষ্ট নোট বা কয়েনের সংখ্যা পাওয়া যায়নি।
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="py-1.5 px-2.5">মান ও ধরন</th>
                        <th className="py-1.5 px-2 text-center">বর্তমান সংখ্যা</th>
                        <th className="py-1.5 px-2 text-center">AI প্রস্তাবিত</th>
                        <th className="py-1.5 px-2.5 text-right">সিস্টেম গুণফল (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.parsedItems.map((item) => {
                        const prevCount =
                          item.kind === 'NOTE'
                            ? currentNotes[item.denom] || 0
                            : currentCoins[item.denom] || 0;
                        return (
                          <tr key={`${item.kind}-${item.denom}`}>
                            <td className="py-1.5 px-2.5 font-bold text-slate-800">
                              ৳ {item.denom}{' '}
                              <span className="text-slate-500 font-normal">
                                ({item.kind === 'NOTE' ? 'নোট' : 'কয়েন'})
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-500">
                              {prevCount} টি
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-emerald-700">
                              {applyMode === 'ADD'
                                ? `+${item.count} → ${prevCount + item.count} টি`
                                : `${item.count} টি`}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              ৳ {item.lineTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {parseResult.unparsedSegmentsBn.length > 0 && (
                <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <strong>অস্পষ্ট অংশ (যাচাই করুন): </strong>
                  {parseResult.unparsedSegmentsBn.join(' | ')}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="text-xs text-slate-700">
                  <span>প্রস্তাবিত সিস্টেম মোট: </span>
                  <strong className="font-mono text-emerald-800 text-sm">
                    ৳ {parseResult.grandTotal.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-slate-500 ml-1">
                    (নোট {parseResult.totalNotesCount} + কয়েন {parseResult.totalCoinsCount} টি)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmApplyCounts}
                  disabled={parseResult.parsedItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>কাউন্টারে খসড়া বসান</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel 2: Deterministic Count Summary Note Draft */}
      {activePanel === 'SUMMARY_NOTE' && (
        <div className="mt-2 bg-white border-2 border-slate-200 rounded-xl p-3 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>AI গণনা সারসংক্ষেপ ও খসড়া নোট (সম্পাদনাযোগ্য)</span>
            </h5>
            <button
              type="button"
              onClick={() => setActivePanel('NONE')}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isGeneratingNote && (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>সিস্টেম-গণনাকৃত নির্ভুল হিসাব থেকে বাংলা নোট তৈরি হচ্ছে...</span>
            </div>
          )}

          {noteError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{noteError}</span>
            </div>
          )}

          {summaryResult && !isGeneratingNote && (
            <div className="space-y-2.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-1">
                <span>
                  সিস্টেম-নিশ্চিতকৃত সর্বমোট:{' '}
                  <strong className="font-mono">
                    ৳ {summaryResult.verifiedBreakdown.grandTotal.toLocaleString('en-IN')}
                  </strong>
                </span>
                <span className="text-emerald-700">
                  নোট {summaryResult.verifiedBreakdown.totalNotesCount} টি | কয়েন{' '}
                  {summaryResult.verifiedBreakdown.totalCoinsCount} টি
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  বিস্তারিত গণনা নোট (প্রয়োজনে সম্পাদনা করুন)
                </label>
                <textarea
                  rows={3}
                  value={editableSummaryNote}
                  onChange={(e) => setEditableSummaryNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {editableShortNote && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    রসিদের মন্তব্য ঘরের জন্য এক লাইনের খসড়া
                  </label>
                  <input
                    type="text"
                    value={editableShortNote}
                    onChange={(e) => setEditableShortNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopySummary(editableSummaryNote)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  {copiedNote ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>নোট কপি করুন</span>
                    </>
                  )}
                </button>

                {onApplyNoteText && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyNoteText(editableShortNote || editableSummaryNote);
                      setActivePanel('NONE');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>কাউন্টার নোট ঘরে বসান</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

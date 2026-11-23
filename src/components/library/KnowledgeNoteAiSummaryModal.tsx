import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  BookOpenText,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { api, KnowledgeNoteAiSummaryResult } from '../../lib/api';
import { Mosque, MosqueProfile } from '../../types';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface KnowledgeNoteAiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosque?: Mosque | MosqueProfile | null;
}

const SAMPLE_KHUTBAH_NOTE = `আজকের জুমার খুতবার বিষয় ছিল আমানতদারিতা ও প্রতিবেশীর হক।
খতিব সাহেব বলেন, আমানত শুধু টাকা-পয়সা নয়, বরং সময়, দায়িত্ব ও মানুষের গোপন কথাও আমানত।
মসজিদের ওয়াকফ সম্পদ ও সাধারণ মানুষের দান সঠিকভাবে সংরক্ষণ করা কমিটির বড় দায়িত্ব।
পাশাপাশি প্রতিবেশীর খোঁজখবর নেওয়া, বিপদে পাশে দাঁড়ানো এবং কষ্ট না দেওয়ার বিষয়ে বিশেষ গুরুত্ব দেওয়া হয়।`;

const AI_TIMEOUT_MS = 45_000;

export const KnowledgeNoteAiSummaryModal: React.FC<KnowledgeNoteAiSummaryModalProps> = ({
  isOpen,
  onClose,
  mosque,
}) => {
  const [format, setFormat] = useState<'KHUTBAH_SUMMARY' | 'BAYAN_OUTLINE' | 'STUDY_NOTE'>('KHUTBAH_SUMMARY');
  const [topicHint, setTopicHint] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawNotes, setRawNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<KnowledgeNoteAiSummaryResult | null>(null);

  // Editable draft fields
  const [editTitle, setEditTitle] = useState('');
  const [editReadableNote, setEditReadableNote] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSummarize = async () => {
    setErrorMsg('');
    if (rawNotes.trim().length < 10) {
      setErrorMsg('অনুগ্রহ করে খুতবা, বয়ান বা আলোচনার কমপক্ষে কয়েক লাইন নোট লিখুন।');
      return;
    }

    setIsLoading(true);
    setResult(null);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI সারসংক্ষেপ তৈরিতে বেশি সময় লাগছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const res = await Promise.race([
        api.summarizeKnowledgeNoteAi({
          rawNotes: rawNotes.trim(),
          speakerName: speakerName.trim() || undefined,
          topicHint: topicHint.trim() || undefined,
          sessionDate: sessionDate || undefined,
          format,
        }),
        timeoutPromise,
      ]);

      setResult(res);
      setEditTitle(res.titleBn);
      const formattedNote = [
        res.summaryParagraphBn,
        '',
        'মূল পয়েন্টসমূহ:',
        ...res.keyPointsBn.map((p, i) => `${i + 1}. ${p}`),
        ...(res.actionableLessonsBn.length > 0
          ? ['', 'আমলযোগ্য শিক্ষা:', ...res.actionableLessonsBn.map((l) => `• ${l}`)]
          : []),
        ...(res.referencesMentionedBn.length > 0
          ? ['', 'উল্লিখিত সূত্র (মূল নোট থেকে):', ...res.referencesMentionedBn.map((r) => `- ${r}`)]
          : []),
        ...(res.readableNoteDraftBn ? ['', res.readableNoteDraftBn] : []),
      ].join('\n');
      setEditReadableNote(formattedNote);
    } catch (err: any) {
      setErrorMsg(err?.message || 'বয়ান ও নোট সারসংক্ষেপ তৈরি করা যায়নি।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const fullText = `${editTitle}\n${speakerName ? `বক্তা/খতিব: ${speakerName}\n` : ''}${sessionDate ? `তারিখ: ${sessionDate}\n` : ''}\n${editReadableNote}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setErrorMsg('ক্লিপবোর্ডে কপি করা যায়নি। অনুগ্রহ করে লেখাটি সিলেক্ট করে কপি করুন।');
    }
  };

  const handlePrint = () => {
    printElement('knowledge-note-ai-print-doc', {
      title: `${mosque?.name || 'মসজিদ'}_জ্ঞানকেন্দ্র_নোট_${sessionDate}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '12mm 14mm',
    });
  };

  return (
    <div className="fixed inset-0 z-[65] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="no-print px-5 py-4 bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/25 border border-teal-400/40 rounded-xl">
              <BookOpenText className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri">
                AI খুতবা, বয়ান ও জ্ঞানকেন্দ্র নোট সারসংক্ষেপ
              </h3>
              <p className="text-xs text-teal-100/90 font-tiro">
                কাঁচা নোট থেকে মূল পয়েন্ট, বিষয়ভিত্তিক সারসংক্ষেপ ও পাঠযোগ্য নোট খসড়া
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!result ? (
            <>
              {/* Format & Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    নোটের ধরন
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-siliguri bg-white"
                  >
                    <option value="KHUTBAH_SUMMARY">জুমার খুতবা সারসংক্ষেপ</option>
                    <option value="BAYAN_OUTLINE">বয়ান ও আলোচনার মূল পয়েন্ট</option>
                    <option value="STUDY_NOTE">জ্ঞানকেন্দ্র অধ্যয়ন নোট</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    খতিব / বক্তা / শিক্ষক (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="যেমন: মাওলানা আব্দুর রহমান"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-tiro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    তারিখ
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-baloo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                  আলোচনার বিষয় (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={topicHint}
                  onChange={(e) => setTopicHint(e.target.value)}
                  placeholder="যেমন: আমানতদারিতা ও প্রতিবেশীর হক"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-tiro"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 font-siliguri">
                    খুতবা, বয়ান বা আলোচনার কাঁচা নোট লিখুন / পেস্ট করুন *
                  </label>
                  <button
                    type="button"
                    onClick={() => setRawNotes(SAMPLE_KHUTBAH_NOTE)}
                    className="text-[11px] font-bold text-emerald-700 hover:underline font-siliguri"
                  >
                    নমুনা নোট বসান
                  </button>
                </div>
                <textarea
                  rows={7}
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="খুতবা বা বয়ানের মূল কথা, পয়েন্ট বা আলোচনা এখানে লিখুন..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-tiro leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-tiro flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  মূল নোটে না থাকা কোনো কুরআনের আয়াত নম্বর বা হাদিসের সূত্র AI নিজে থেকে অনুমান করে বসাবে না। প্রস্তুত খসড়াটি সম্পাদনা করে কপি বা প্রিন্ট করতে পারবেন।
                </span>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-tiro">{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Draft Actions Bar */}
              <div className="no-print flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold font-siliguri">
                    {result.topicCategoryBn}
                  </span>
                  <span className="text-xs font-bold text-emerald-950 font-siliguri">
                    সম্পাদনাযোগ্য নোট খসড়া প্রস্তুত
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold font-siliguri flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>নতুন নোট</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold font-siliguri flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-siliguri flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>A4 প্রিন্ট</span>
                  </button>
                </div>
              </div>

              <div className="no-print p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-tiro">
                <strong>যাচাই সতর্কতা:</strong> {result.verificationWarningBn}
              </div>

              {/* Editable Inputs */}
              <div className="no-print space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    নোটের শিরোনাম (সম্পাদনাযোগ্য)
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold font-siliguri"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 font-siliguri mb-1">
                    সারসংক্ষেপ ও মূল পয়েন্ট (প্রয়োজনে সম্পাদনা করুন)
                  </label>
                  <textarea
                    rows={10}
                    value={editReadableNote}
                    onChange={(e) => setEditReadableNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-tiro leading-relaxed"
                  />
                </div>
              </div>

              {/* Hidden/Print-Ready Container */}
              <div
                id="knowledge-note-ai-print-doc"
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-slate-900"
              >
                {mosque && <MosqueOfficialLetterhead mosque={mosque} />}
                <div className="border-b border-slate-200 pb-3 text-center space-y-1">
                  <span className="text-[11px] font-bold text-emerald-700 font-siliguri">
                    জ্ঞানকেন্দ্র নোট • {result.topicCategoryBn}
                  </span>
                  <h2 className="text-lg font-bold font-siliguri text-slate-900">{editTitle}</h2>
                  <p className="text-xs text-slate-500 font-tiro">
                    {speakerName ? `বক্তা/খতিব: ${speakerName} • ` : ''}
                    তারিখ: {sessionDate}
                  </p>
                </div>
                <div className="text-sm font-tiro leading-relaxed whitespace-pre-line text-slate-800">
                  {editReadableNote}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="no-print px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri"
          >
            বন্ধ করুন
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isLoading || rawNotes.trim().length < 10}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold font-siliguri flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সারসংক্ষেপ তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>সারসংক্ষেপ খসড়া তৈরি করুন</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

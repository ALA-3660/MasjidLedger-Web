import React, { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';

export const AiCoaStructureNoteBox: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [gradeLabel, setGradeLabel] = useState('');
  const [includeInPrint, setIncludeInPrint] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleGenerateNote = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generateCoaStructureNoteAi();
      setNoteText(data.structureNoteBn);
      setGradeLabel(data.structureGradeBn);
      setIncludeInPrint(true);
    } catch (err: any) {
      setError(err?.message || 'AI অ্যাকাউন্টিং স্ট্রাকচার নোট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!noteText.trim()) return;
    navigator.clipboard?.writeText(noteText.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3 font-siliguri">
      {/* Interactive Toolbar (hidden during print) */}
      <div className="print:hidden p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
          <div>
            <span className="text-xs font-extrabold text-blue-950 block">
              AI অ্যাকাউন্টিং স্ট্রাকচার নোট (প্রিন্ট-রেডি সারসংক্ষেপ)
            </span>
            <span className="text-[11px] text-blue-800/80 font-tiro">
              মোট আয় খাত, ব্যয় খাত ও হিসাব কাঠামোর মান নিয়ে ২–৩ লাইনের মার্জিত বাংলা মন্তব্য যুক্ত করুন
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {noteText && (
            <>
              <button
                type="button"
                onClick={() => setIncludeInPrint((v) => !v)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
              >
                {includeInPrint ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>{includeInPrint ? 'প্রিন্টে যুক্ত আছে' : 'প্রিন্ট থেকে লুকানো'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerateNote}
            disabled={loading}
            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span>{loading ? 'মন্তব্য তৈরি হচ্ছে...' : noteText ? 'পুনরায় তৈরি করুন' : 'AI স্ট্রাকচার নোট তৈরি করুন'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="print:hidden p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editable Draft Field (screen-only) */}
      {noteText && (
        <div className="print:hidden">
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl bg-white text-slate-800 font-tiro leading-relaxed outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="প্রিন্টের আগে প্রয়োজনে মন্তব্যটি সম্পাদনা করতে পারেন..."
          />
        </div>
      )}

      {/* Clean Printable Official Note Box */}
      {noteText && includeInPrint && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">
              অ্যাকাউন্টিং স্ট্রাকচার নোট (Accounting Structure Note)
            </span>
            {gradeLabel && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                মূল্যায়ন: {gradeLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-800 leading-relaxed font-tiro">
            {noteText}
          </p>
        </div>
      )}
    </div>
  );
};

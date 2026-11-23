import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface PrintableReportAiNote {
  titleBn: string;
  bodyBn: string;
  includeInPrint: boolean;
  generatedAt?: string;
}

interface ReportAiSummaryPanelProps {
  reportType: string;
  reportTitleBn: string;
  fromDate: string;
  toDate: string;
  filterSummaryBn: string;
  filterFingerprint: string;
  systemMetrics: {
    openingBalance: number;
    totalIncome: number;
    totalExpense: number;
    netChange: number;
    closingBalance: number;
    incomeVoucherCount: number;
    expenseVoucherCount: number;
    topIncomeHeads: Array<{ name: string; amount: number; count: number }>;
    topExpenseHeads: Array<{ name: string; amount: number; count: number }>;
    extraContextBn?: string;
  };
  currentNote: PrintableReportAiNote | null;
  onChangeNote: (note: PrintableReportAiNote | null) => void;
}

export const ReportAiSummaryPanel: React.FC<ReportAiSummaryPanelProps> = ({
  reportType,
  reportTitleBn,
  fromDate,
  toDate,
  filterSummaryBn,
  filterFingerprint,
  systemMetrics,
  currentNote,
  onChangeNote,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedForFingerprint, setGeneratedForFingerprint] = useState<string | null>(null);
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([]);

  // If filters change while an AI note is attached to print, automatically detach from print & mark stale
  const isStale = Boolean(
    currentNote && generatedForFingerprint && generatedForFingerprint !== filterFingerprint
  );

  useEffect(() => {
    if (isStale && currentNote?.includeInPrint) {
      onChangeNote({
        ...currentNote,
        includeInPrint: false,
      });
    }
  }, [isStale]);

  const handleGenerate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.generateReportExecutiveSummaryAi({
        reportType,
        reportTitleBn,
        fromDate,
        toDate,
        filterSummaryBn,
        systemMetrics,
      });
      setGeneratedForFingerprint(filterFingerprint);
      setKeyTakeaways(res.keyTakeawaysBn || []);
      // Strictly draft/preview first: includeInPrint = false until user verifies & clicks apply
      onChangeNote({
        titleBn: res.titleBn || 'প্রতিবেদন সারসংক্ষেপ ও মন্তব্য',
        bodyBn: res.summaryNoteBn,
        includeInPrint: false,
        generatedAt: res.generatedAt,
      });
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'AI রিপোর্ট সারসংক্ষেপ তৈরি করা যায়নি। আপনি নোট ছাড়াই স্বাভাবিকভাবে রিপোর্ট প্রিন্ট বা এক্সপোর্ট করতে পারেন।'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!currentNote?.bodyBn) return;
    try {
      await navigator.clipboard.writeText(currentNote.bodyBn);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored safely
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 print:hidden">
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-siliguri font-bold text-sm text-slate-900">
              প্রিন্ট-যোগ্য AI রিপোর্ট সারসংক্ষেপ নোট
            </h3>
            <p className="font-tiro text-xs text-slate-500">
              বর্তমান ফিল্টার করা রিপোর্টের সিস্টেম-গণনাকৃত উপাত্ত থেকে ৩-৪ লাইনের মার্জিত বাংলা মন্তব্য খসড়া তৈরি করে
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-siliguri font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                সারসংক্ষেপ তৈরি হচ্ছে...
              </>
            ) : currentNote ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                পুনরায় তৈরি করুন
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                ✨ AI রিপোর্ট সারসংক্ষেপ তৈরি করুন
              </>
            )}
          </button>

          {currentNote && (
            <button
              type="button"
              onClick={() => {
                onChangeNote(null);
                setKeyTakeaways([]);
                setGeneratedForFingerprint(null);
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition cursor-pointer"
              title="নোট মুছুন"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-tiro">{errorMsg}</span>
        </div>
      )}

      {/* Stale Filter Warning */}
      {isStale && currentNote && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-tiro">
              রিপোর্টের ফিল্টার পরিবর্তিত হয়েছে। ভুল তথ্য প্রিন্ট হওয়া এড়াতে নোটটি সাময়িকভাবে প্রিন্ট থেকে সরানো হয়েছে — অনুগ্রহ করে পুনরায় তৈরি করুন।
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-siliguri font-bold cursor-pointer shrink-0"
          >
            নতুন ডেটায় আপডেট করুন
          </button>
        </div>
      )}

      {/* Draft Editor & Print Attachment Control */}
      {currentNote && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-siliguri font-bold border ${
                  currentNote.includeInPrint
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {currentNote.includeInPrint
                  ? '✓ প্রিন্ট / PDF রিপোর্টে যুক্ত আছে'
                  : 'খসড়া প্রিভিউ (এখনো রিপোর্টে যুক্ত হয়নি)'}
              </span>
              <span className="text-[11px] text-slate-500 font-tiro">
                প্রয়োজনে সরাসরি এডিট করুন
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-siliguri font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              value={currentNote.titleBn}
              onChange={(e) =>
                onChangeNote({
                  ...currentNote,
                  titleBn: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-siliguri font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="নোটের শিরোনাম..."
            />
            <textarea
              rows={3}
              value={currentNote.bodyBn}
              onChange={(e) =>
                onChangeNote({
                  ...currentNote,
                  bodyBn: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-xs font-tiro text-slate-800 leading-relaxed bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
              placeholder="৩-৪ লাইনের মার্জিত বাংলা মন্তব্য..."
            />
          </div>

          {keyTakeaways.length > 0 && (
            <div className="text-[11px] text-slate-600 font-tiro bg-white px-3 py-2 rounded-lg border border-slate-200">
              <span className="font-siliguri font-bold text-slate-700">উল্লেখযোগ্য পর্যবেক্ষণ: </span>
              {keyTakeaways.join(' • ')}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-500 font-tiro">
              সিস্টেম-গণনাকৃত অঙ্ক (আয় ৳{systemMetrics.totalIncome.toLocaleString('en-IN')}, ব্যয় ৳
              {systemMetrics.totalExpense.toLocaleString('en-IN')}, সমাপনী স্থিতি ৳
              {systemMetrics.closingBalance.toLocaleString('en-IN')}) যাচাই করে যুক্ত করুন।
            </p>
            <button
              type="button"
              disabled={isStale || !currentNote.bodyBn.trim()}
              onClick={() =>
                onChangeNote({
                  ...currentNote,
                  includeInPrint: !currentNote.includeInPrint,
                })
              }
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-siliguri font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-40 ${
                currentNote.includeInPrint
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentNote.includeInPrint
                ? 'রিপোর্ট থেকে নোট সরান'
                : 'রিপোর্টে যুক্ত করুন (প্রিন্ট/PDF)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

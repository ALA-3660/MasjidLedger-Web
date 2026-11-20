import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AiExecutiveSummaryPanelProps {
  ledgerType: 'DAILY_STATEMENT' | 'CASHBOOK' | 'BANK_LEDGER' | 'SUMMARY';
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  closingBalance: number;
  transactionCount: number;
  accountScopeLabel?: string;
  summaryText: string;
  onSummaryChange: (summary: string) => void;
  onOpenPrintModal?: () => void;
}

export const AiExecutiveSummaryPanel: React.FC<AiExecutiveSummaryPanelProps> = ({
  ledgerType,
  periodLabel,
  startDate,
  endDate,
  openingBalance,
  totalInflow,
  totalOutflow,
  closingBalance,
  transactionCount,
  accountScopeLabel,
  summaryText,
  onSummaryChange,
  onOpenPrintModal,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusTag, setStatusTag] = useState<string>('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateLedgerExecutiveSummaryAi({
        ledgerType,
        periodLabel,
        startDate,
        endDate,
        openingBalance,
        totalInflow,
        totalOutflow,
        closingBalance,
        transactionCount,
        accountScopeLabel,
      });
      onSummaryChange(res.summaryParagraphBn);
      setStatusTag(res.statusTagBn);
      setHighlights(res.keyHighlightsBn || []);
    } catch (err: any) {
      setError(err?.message || 'AI লেনদেন সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors in restricted frames
    }
  };

  return (
    <div className="bg-white border border-emerald-200/90 rounded-2xl shadow-2xs overflow-hidden font-siliguri">
      {/* Header Strip */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold">
              AI দৈনিক ও মাসিক লেনদেন সারসংক্ষেপ (প্রিন্ট-যোগ্য বাংলা মন্তব্য)
            </h4>
            <p className="text-[11px] text-emerald-100 font-tiro">
              প্রারম্ভিক জের, মোট প্রাপ্তি, মোট ব্যয় ও সমাপনী স্থিতি বিশ্লেষণ করে প্রিন্ট/PDF রিপোর্টের নিচে যুক্ত করার মতো ৩-৪ লাইনের মার্জিত মন্তব্য তৈরি করুন
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGenerate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>সারসংক্ষেপ তৈরি হচ্ছে...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{summaryText ? 'পুনরায় AI সারসংক্ষেপ তৈরি করুন' : 'AI সারসংক্ষেপ তৈরি করুন'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="m-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Printable Summary Preview & Editable Box */}
      {summaryText && (
        <div className="p-4 space-y-3 bg-emerald-50/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                <span>প্রিন্ট / PDF রিপোর্টের নিচে স্বয়ংক্রিয়ভাবে যুক্ত থাকবে</span>
              </span>
              {statusTag && (
                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[10px] font-bold">
                  {statusTag}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
              </button>
              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={onOpenPrintModal}
                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>মন্তব্যসহ প্রিন্ট / PDF</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSummaryChange('')}
                className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 border border-slate-300 text-slate-500 hover:text-rose-700 text-[11px] font-bold cursor-pointer"
              >
                সরান
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={summaryText}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="w-full p-3 text-xs sm:text-sm leading-relaxed text-slate-900 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-tiro"
          />

          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((hl, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-950 font-semibold"
                >
                  • {hl}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

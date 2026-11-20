import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Archive,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AccountHead } from '../../types';

interface AiInactiveHeadsPanelProps {
  scopeType: 'INCOME' | 'EXPENSE';
  accountHeads: AccountHead[];
  onHighlightInactiveIds: (ids: string[]) => void;
  onArchiveHead?: (head: AccountHead) => Promise<void>;
}

export const AiInactiveHeadsPanel: React.FC<AiInactiveHeadsPanelProps> = ({
  scopeType,
  accountHeads,
  onHighlightInactiveIds,
  onArchiveHead,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.findInactiveAccountHeadsAi>> | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Reset when switching between INCOME and EXPENSE tabs or unmounting
  useEffect(() => {
    setResult(null);
    setError(null);
    onHighlightInactiveIds([]);
    return () => {
      onHighlightInactiveIds([]);
    };
  }, [scopeType]);

  const handleScanInactive = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.findInactiveAccountHeadsAi({ type: scopeType });
      setResult(data);
      onHighlightInactiveIds(data.items.map((item) => item.id));
    } catch (err: any) {
      setError(err?.message || 'AI নিষ্ক্রিয় খাত খুঁজতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleManualArchive = async (headId: string) => {
    if (!onArchiveHead) return;
    const head = accountHeads.find((h) => h.id === headId);
    if (!head) return;
    setArchivingId(headId);
    try {
      await onArchiveHead(head);
      setResult((prev) => {
        if (!prev) return prev;
        const remaining = prev.items.filter((i) => i.id !== headId);
        onHighlightInactiveIds(remaining.map((i) => i.id));
        return {
          ...prev,
          unusedCount: remaining.length,
          recommendedArchiveCount: remaining.filter((i) => i.recommendation === 'ARCHIVE').length,
          items: remaining,
        };
      });
    } finally {
      setArchivingId(null);
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    onHighlightInactiveIds([]);
  };

  const isIncome = scopeType === 'INCOME';

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 space-y-3 font-siliguri ${
        isIncome
          ? 'bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 border-emerald-200'
          : 'bg-gradient-to-r from-rose-50/80 via-white to-amber-50/40 border-rose-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isIncome
                ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                : 'bg-rose-100 border-rose-200 text-rose-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
              {isIncome ? 'আয়ের নিষ্ক্রিয় / অব্যবহৃত খাত শনাক্তকরণ' : 'ব্যয়ের নিষ্ক্রিয় / অব্যবহৃত খাত শনাক্তকরণ'}
            </h4>
            <p className="text-[11px] text-slate-600 font-tiro">
              কোনো লেনদেন ছাড়া পড়ে থাকা অব্যবহৃত খাতগুলো হাইলাইট করে নিরাপদে আর্কাইভের পরামর্শ দেখুন
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {result && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>হাইলাইট মুছুন</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleScanInactive}
            disabled={loading}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 ${
              isIncome ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span>{loading ? 'AI খুঁজছে...' : 'AI নিষ্ক্রিয় খাত খুঁজুন'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-2.5 pt-1 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-slate-700 font-medium">{result.summaryBn}</p>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold">
                লেনদেনবিহীন: {result.unusedCount} টি
              </span>
              {result.recommendedArchiveCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-bold">
                  আর্কাইভ পরামর্শ: {result.recommendedArchiveCount} টি
                </span>
              )}
            </div>
          </div>

          {result.items.length === 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>সব সক্রিয় খাত নিয়মিত ব্যবহৃত হচ্ছে।</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {result.items.map((item) => {
                const isArchiveRec = item.recommendation === 'ARCHIVE';
                const isSeasonal = item.recommendation === 'KEEP_SEASONAL';
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border bg-white space-y-1.5 ${
                      isArchiveRec ? 'border-amber-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.nameBn}
                          </span>
                          {item.code && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                          )}
                        </div>
                        {item.isSubHead && item.parentNameBn && (
                          <span className="text-[10px] text-slate-500 block">
                            প্রধান খাত: {item.parentNameBn}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 inline-flex items-center space-x-1 ${
                          isArchiveRec
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : isSeasonal
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isSeasonal ? <CalendarClock className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        <span>{item.recommendationLabelBn}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug font-tiro">
                      {item.reasonBn}
                    </p>

                    {onArchiveHead && isArchiveRec && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleManualArchive(item.id)}
                          disabled={archivingId === item.id}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          {archivingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Archive className="w-3 h-3" />
                          )}
                          <span>আর্কাইভ অনুমোদন করুন</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

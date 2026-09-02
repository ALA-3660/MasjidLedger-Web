import React, { useState, useEffect } from 'react';
import { Banknote, Coins, RotateCcw, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { DenominationBreakdown } from '../types/qrBarcodeTypes';

interface DenominationCounterProps {
  initialData?: DenominationBreakdown;
  onChange?: (breakdown: DenominationBreakdown, totalAmount: number) => void;
  onApply?: (totalAmount: number) => void;
  className?: string;
  defaultExpanded?: boolean;
}

const NOTE_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2] as const;
const COIN_DENOMINATIONS = [5, 2, 1] as const;

export const DenominationCounter: React.FC<DenominationCounterProps> = ({
  initialData,
  onChange,
  onApply,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [notes, setNotes] = useState<Record<number, number>>({
    1000: initialData?.notes?.[1000] || 0,
    500: initialData?.notes?.[500] || 0,
    200: initialData?.notes?.[200] || 0,
    100: initialData?.notes?.[100] || 0,
    50: initialData?.notes?.[50] || 0,
    20: initialData?.notes?.[20] || 0,
    10: initialData?.notes?.[10] || 0,
    5: initialData?.notes?.[5] || 0,
    2: initialData?.notes?.[2] || 0,
  });

  const [coins, setCoins] = useState<Record<number, number>>({
    5: initialData?.coins?.[5] || 0,
    2: initialData?.coins?.[2] || 0,
    1: initialData?.coins?.[1] || 0,
  });

  // Calculate totals
  const totalNotesCount = Object.values(notes).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
  const totalCoinsCount = Object.values(coins).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);

  const notesSubtotal = Object.entries(notes).reduce<number>(
    (acc, [denom, count]) => acc + Number(denom) * (Number(count) || 0),
    0
  );

  const coinsSubtotal = Object.entries(coins).reduce<number>(
    (acc, [denom, count]) => acc + Number(denom) * (Number(count) || 0),
    0
  );

  const grandTotal = notesSubtotal + coinsSubtotal;

  useEffect(() => {
    if (onChange) {
      onChange(
        {
          notes: { ...notes },
          coins: { ...coins },
          totalNotes: totalNotesCount,
          totalCoins: totalCoinsCount,
          grandTotal,
        },
        grandTotal
      );
    }
  }, [notes, coins, grandTotal, totalNotesCount, totalCoinsCount, onChange]);

  const handleNoteChange = (denom: number, count: number) => {
    const validCount = Math.max(0, Math.floor(count || 0));
    setNotes((prev) => ({ ...prev, [denom]: validCount }));
  };

  const handleCoinChange = (denom: number, count: number) => {
    const validCount = Math.max(0, Math.floor(count || 0));
    setCoins((prev) => ({ ...prev, [denom]: validCount }));
  };

  const handleReset = () => {
    setNotes({
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
      2: 0,
    });
    setCoins({
      5: 0,
      2: 0,
      1: 0,
    });
  };

  const formatTaka = (amount: number) => {
    return new Intl.NumberFormat('bn-BD').format(amount);
  };

  return (
    <div
      id="denomination-counter-card"
      className={`bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl overflow-hidden transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-100">ভাংতি টাকা ও নোট গণনা</h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                ক্যাশ কাউন্টার
              </span>
            </div>
            <p className="text-xs text-slate-400">প্রত্যেক নোট ও কয়েন সংখ্যা বসান, মোট টাকা স্বয়ংক্রিয়ভাবে হিসাব হবে</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            title="সব রিসেট করুন"
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition text-xs flex items-center gap-1 border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">রিসেট</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-800 text-slate-300 rounded-xl transition border border-slate-800"
            title={isExpanded ? 'লুকান' : 'বিস্তারিত দেখুন'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 animate-fadeIn">
          {/* Paper Currency Notes Grid */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> কাগজের নোটসমূহ ({totalNotesCount} টি নোট)
              </span>
              <span>উপমোট: ৳ {formatTaka(notesSubtotal)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {NOTE_DENOMINATIONS.map((denom) => {
                const count = notes[denom] || 0;
                const total = denom * count;
                const isHighDenom = denom >= 500;
                return (
                  <div
                    key={`note-${denom}`}
                    className={`rounded-xl p-2.5 border transition-all ${
                      count > 0
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-inner'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          isHighDenom
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        ৳{denom}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        ৳{formatTaka(total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleNoteChange(denom, count - 1)}
                        className="w-7 h-7 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        placeholder="0"
                        onChange={(e) => handleNoteChange(denom, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg py-1 px-1.5 text-center text-sm font-bold text-white outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleNoteChange(denom, count + 1)}
                        className="w-7 h-7 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metal Coins Section */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold text-teal-400 mb-2">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> ধাতব কয়েন ও সিকি ({totalCoinsCount} টি কয়েন)
              </span>
              <span>উপমোট: ৳ {formatTaka(coinsSubtotal)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {COIN_DENOMINATIONS.map((denom) => {
                const count = coins[denom] || 0;
                const total = denom * count;
                return (
                  <div
                    key={`coin-${denom}`}
                    className={`rounded-xl p-2.5 border transition-all ${
                      count > 0
                        ? 'bg-teal-950/40 border-teal-500/50 shadow-inner'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        ৳{denom} কয়েন
                      </span>
                      <span className="text-[11px] font-mono text-teal-400 font-bold">
                        ৳{formatTaka(total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCoinChange(denom, count - 1)}
                        className="w-7 h-7 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        placeholder="0"
                        onChange={(e) => handleCoinChange(denom, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-lg py-1 px-1.5 text-center text-sm font-bold text-white outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleCoinChange(denom, count + 1)}
                        className="w-7 h-7 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl">
        <div className="flex items-baseline gap-2 text-center sm:text-left">
          <span className="text-xs text-slate-400 font-medium">সর্বমোট ক্যাশ:</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight font-mono">
            ৳ {formatTaka(grandTotal)}
          </span>
          <span className="text-xs text-slate-500">
            ({totalNotesCount} নোট, {totalCoinsCount} কয়েন)
          </span>
        </div>

        {onApply && (
          <button
            type="button"
            onClick={() => onApply(grandTotal)}
            disabled={grandTotal === 0}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-900/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>টাকার পরিমাণে যুক্ত করুন</span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Banknote,
  X,
  RotateCcw,
  Check,
  Copy,
  CheckCheck,
  Coins,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { Language } from '../lib/i18n';

export interface ChangeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTotal?: (totalAmount: number, breakdown?: Record<number, number>) => void;
  initialCounts?: Record<number, number>;
  initialAmount?: number;
  language?: Language;
  titleBn?: string;
  subtitleBn?: string;
}

export const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

// Convert Bengali numerals (০-৯) to standard English digits (0-9)
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return str.replace(/[০-৯]/g, (match) => bnToEn[match] || match);
}

// Convert English digits (0-9) to Bengali digits (০-৯)
export function toBengaliDigits(num: number | string): string {
  if (num === undefined || num === null) return '০';
  const str = num.toString();
  const enToBn: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  };
  return str.replace(/[0-9]/g, (match) => enToBn[match] || match);
}

// Bengali numbers in words converter helper
export function numberToBengaliWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'শূন্য টাকা মাত্র';

  const units = [
    '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
    'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
    'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ', 'ত্রিশ',
    'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
    'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
    'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
    'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
    'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি',
    'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতায়াশি', 'আটাশি', 'ঊননব্বই', 'নব্বই',
    'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
  ];

  const convertTwoDigits = (n: number) => units[n] || '';

  const integerPart = Math.floor(num);
  let remaining = integerPart;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = Math.floor(remaining / 100);
  remaining %= 100;

  if (crore > 0) {
    words += `${crore > 99 ? crore.toString() : convertTwoDigits(crore)} কোটি `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} লাখ `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} হাজার `;
  }
  if (hundred > 0) {
    words += `${convertTwoDigits(hundred)} শত `;
  }
  if (remaining > 0) {
    words += `${convertTwoDigits(remaining)} `;
  }

  return `${words.trim()} টাকা মাত্র`;
}

// Color badges for each currency denomination
const DENOM_BADGES: Record<number, { bg: string; text: string; border: string }> = {
  1000: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  500: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  200: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  100: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  50: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  20: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  10: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  5: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  2: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  1: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
};

export const ChangeCalculatorModal: React.FC<ChangeCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyTotal,
  initialCounts,
  language = 'bn',
  titleBn = 'ভাংতি টাকা ও ক্যাশ নোট গণনা কাউন্টার',
  subtitleBn = 'প্রতিটি নোটের সংখ্যা ইনপুট দিন — মোট টাকা সরাসরি রশিদে চলে আসবে',
}) => {
  // Internal state for denomination quantities
  const [counts, setCounts] = useState<Record<number, number>>(() => {
    const empty: Record<number, number> = {};
    DENOMINATIONS.forEach((d) => (empty[d] = 0));
    return empty;
  });

  const [copied, setCopied] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Initialize ONLY when modal opens (prevents re-render resets)
  useEffect(() => {
    if (isOpen) {
      if (!isInitializedRef.current) {
        if (initialCounts && Object.keys(initialCounts).length > 0) {
          setCounts({ ...initialCounts });
        } else {
          const empty: Record<number, number> = {};
          DENOMINATIONS.forEach((d) => (empty[d] = 0));
          setCounts(empty);
        }
        isInitializedRef.current = true;
      }
    } else {
      isInitializedRef.current = false;
    }
  }, [isOpen, initialCounts]);

  if (!isOpen) return null;

  // Handle direct manual typing in text input (supports English and Bengali numbers)
  const handleCountChange = (denom: number, rawVal: string) => {
    const cleaned = toEnglishDigits(rawVal).replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    const validNum = isNaN(num) ? 0 : Math.max(0, num);

    setCounts((prev) => ({
      ...prev,
      [denom]: validNum,
    }));
  };

  // Quick addition/subtraction
  const handleDelta = (denom: number, delta: number) => {
    setCounts((prev) => {
      const current = prev[denom] || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        [denom]: next,
      };
    });
  };

  // Clear a single note type
  const handleClearSingle = (denom: number) => {
    setCounts((prev) => ({
      ...prev,
      [denom]: 0,
    }));
  };

  // Reset all to 0
  const handleResetAll = () => {
    const empty: Record<number, number> = {};
    DENOMINATIONS.forEach((d) => (empty[d] = 0));
    setCounts(empty);
  };

  // Calculate grand total
  const grandTotal = DENOMINATIONS.reduce((sum, denom) => {
    const qty = counts[denom] || 0;
    return sum + denom * qty;
  }, 0);

  // Total count of notes
  const totalNotesCount = DENOMINATIONS.reduce((sum, denom) => {
    return sum + (counts[denom] || 0);
  }, 0);

  // Copy breakdown text to clipboard
  const handleCopyBreakdown = () => {
    const lines: string[] = ['=== ভাংতি টাকা ও ক্যাশ নোট গণনা বিবরণী ==='];
    DENOMINATIONS.forEach((d) => {
      const qty = counts[d] || 0;
      if (qty > 0) {
        lines.push(`৳ ${d} × ${qty} টি = ৳ ${(d * qty).toLocaleString('en-IN')}`);
      }
    });
    lines.push(`----------------------------------------`);
    lines.push(`মোট নোট সংখ্যা: ${totalNotesCount} টি`);
    lines.push(`সর্বমোট টাকা: ৳ ${grandTotal.toLocaleString('en-IN')}`);
    lines.push(`কথায়: ${numberToBengaliWords(grandTotal)}`);

    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Directly apply total to the voucher amount field
  const handleApplyToVoucher = () => {
    if (onApplyTotal) {
      onApplyTotal(grandTotal, counts);
    }
    onClose();
  };

  return (
    <div
      id="modal-change-calculator"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150 font-baloo"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-emerald-700/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 text-emerald-300 border border-white/15 rounded-xl shadow-inner">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri tracking-tight flex items-center gap-2">
                <span>{titleBn}</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                  আয় ও রসিদ
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100/90 font-baloo mt-0.5">
                {subtitleBn}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-emerald-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="বন্ধ করুন (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Summary Card */}
        <div className="bg-emerald-950 text-white p-3.5 sm:p-4 border-b border-emerald-900 shadow-inner flex flex-col justify-between shrink-0 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-siliguri">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>মোট নোটের সংখ্যা:</span>
              <span className="text-white font-mono font-bold text-sm bg-emerald-900/90 px-2.5 py-0.5 rounded-lg border border-emerald-700">
                {totalNotesCount} টি
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyBreakdown}
              className="text-[11px] text-emerald-200 hover:text-white flex items-center space-x-1.5 bg-emerald-900/70 hover:bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-300 font-bold">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>বিবরণী কপি</span>
                </>
              )}
            </button>
          </div>

          {/* Grand Total Amount Display */}
          <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-emerald-900/80">
            <span className="text-base sm:text-lg text-emerald-400 font-siliguri font-bold">
              সর্বমোট গণনাকৃত টাকা:
            </span>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-300 tracking-tight">
                ৳ {grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Words Preview */}
          <div className="mt-1.5 pt-1.5 border-t border-emerald-900/80 text-xs font-siliguri text-emerald-200 truncate">
            <span className="text-emerald-400 font-semibold mr-1">কথায়:</span>
            <span className="font-bold text-white">{numberToBengaliWords(grandTotal)}</span>
          </div>
        </div>

        {/* Scrollable Denomination Table */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-50">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-800 font-bold font-siliguri border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">নোট / মুদ্রা</th>
                  <th className="py-2.5 px-2 text-center w-28 sm:w-36">নোটের সংখ্যা</th>
                  <th className="py-2.5 px-2 text-center">দ্রুত যোগ</th>
                  <th className="py-2.5 px-3 text-right">মোট টাকা (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DENOMINATIONS.map((denom) => {
                  const qty = counts[denom] || 0;
                  const lineTotal = denom * qty;
                  const badge = DENOM_BADGES[denom] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' };

                  return (
                    <tr
                      key={denom}
                      className={`transition-colors ${
                        qty > 0 ? 'bg-emerald-50/60 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Denomination Name / Tag */}
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold font-mono text-xs border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            ৳ {denom}
                          </span>
                          <span className="text-[11px] text-slate-500 font-siliguri hidden sm:inline">
                            {denom >= 10 ? 'টাকার নোট' : 'টাকার কয়েন/নোট'}
                          </span>
                        </div>
                      </td>

                      {/* Quantity Input Field */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <input
                            id={`input-denom-${denom}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qty === 0 ? '' : qty.toString()}
                            placeholder="০"
                            onChange={(e) => handleCountChange(denom, e.target.value)}
                            className="w-20 sm:w-24 text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all text-sm shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* Quick Increment Buttons */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleDelta(denom, 1)}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200"
                            title="+১ যোগ করুন"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelta(denom, 5)}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200"
                            title="+৫ যোগ করুন"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelta(denom, 10)}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200 hidden sm:inline"
                            title="+১০ যোগ করুন"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelta(denom, 50)}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200 hidden sm:inline"
                            title="+৫০ যোগ করুন"
                          >
                            +50
                          </button>
                          {qty > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearSingle(denom)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="এই নোট মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Subtotal for this denomination */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {lineTotal > 0 ? (
                          <span className="text-emerald-700 font-bold text-xs sm:text-sm">
                            ৳ {lineTotal.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>সব ০ করুন (রিসেট)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              বাতিল (Esc)
            </button>

            {onApplyTotal && (
              <button
                id="btn-calc-apply-total"
                type="button"
                onClick={handleApplyToVoucher}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold font-siliguri rounded-xl shadow-md flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  মোট টাকা রশিদে বসান (৳ {grandTotal.toLocaleString('en-IN')})
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

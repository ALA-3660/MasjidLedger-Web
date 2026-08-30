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
  Printer,
  Calendar,
  User,
  Users,
  AlertTriangle,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { CashDenominationData, Mosque } from '../types';
import { Language } from '../lib/i18n';
import { DenominationPrintSlip } from './DenominationPrintSlip';

export interface ChangeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTotal?: (totalAmount: number, denominationData?: CashDenominationData) => void;
  initialData?: CashDenominationData | null;
  initialCounts?: Record<number, number>;
  expectedAmount?: number;
  initialAmount?: number;
  language?: Language;
  titleBn?: string;
  subtitleBn?: string;
  collectionType?: 'JUMA' | 'DONATION' | 'DONATION_BOX' | 'INCOME' | 'WAQF_RENT' | 'OTHER';
  reference?: string;
  countedByInitial?: string;
  witnessesInitial?: string;
  mosque?: Mosque | null;
}

export const NOTE_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2];
export const COIN_DENOMINATIONS = [5, 2, 1];
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
export const DENOM_BADGES: Record<number, { bg: string; text: string; border: string }> = {
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
  initialData,
  initialCounts,
  expectedAmount,
  initialAmount,
  language = 'bn',
  titleBn = 'ভাংতি টাকা ও ক্যাশ নোট-কয়েন গণনা কাউন্টার',
  subtitleBn = 'প্রতিটি নোট ও কয়েনের সংখ্যা ইনপুট দিন — স্বয়ংক্রিয়ভাবে মোট হিসাব হয়ে রশিদে যুক্ত হবে',
  collectionType = 'DONATION',
  reference,
  countedByInitial,
  witnessesInitial,
  mosque,
}) => {
  // Internal state for note and coin counts
  const [noteCounts, setNoteCounts] = useState<Record<number, number>>(() => {
    const empty: Record<number, number> = {};
    NOTE_DENOMINATIONS.forEach((d) => (empty[d] = 0));
    return empty;
  });

  const [coinCounts, setCoinCounts] = useState<Record<number, number>>(() => {
    const empty: Record<number, number> = {};
    COIN_DENOMINATIONS.forEach((d) => (empty[d] = 0));
    return empty;
  });

  // Meta information
  const [countedBy, setCountedBy] = useState<string>(countedByInitial || '');
  const [witnesses, setWitnesses] = useState<string>(witnessesInitial || '');
  const [countingDateTime, setCountingDateTime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'NOTES' | 'COINS'>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Target amount for validation comparison
  const targetAmount = expectedAmount !== undefined ? expectedAmount : initialAmount;

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!isInitializedRef.current) {
        if (initialData) {
          const notesState: Record<number, number> = {};
          NOTE_DENOMINATIONS.forEach((d) => (notesState[d] = initialData.noteBreakdown?.[d] || 0));
          setNoteCounts(notesState);

          const coinsState: Record<number, number> = {};
          COIN_DENOMINATIONS.forEach((d) => (coinsState[d] = initialData.coinBreakdown?.[d] || 0));
          setCoinCounts(coinsState);

          setCountedBy(initialData.countedBy || countedByInitial || '');
          setWitnesses(initialData.witnesses ? initialData.witnesses.join(', ') : (witnessesInitial || ''));
          setCountingDateTime(initialData.countingDateTime || new Date().toISOString().slice(0, 16));
          setNotes(initialData.notes || '');
        } else if (initialCounts && Object.keys(initialCounts).length > 0) {
          const notesState: Record<number, number> = {};
          NOTE_DENOMINATIONS.forEach((d) => (notesState[d] = initialCounts[d] || 0));
          setNoteCounts(notesState);

          const coinsState: Record<number, number> = {};
          COIN_DENOMINATIONS.forEach((d) => (coinsState[d] = initialCounts[d] || 0));
          setCoinCounts(coinsState);
        } else {
          const emptyNotes: Record<number, number> = {};
          NOTE_DENOMINATIONS.forEach((d) => (emptyNotes[d] = 0));
          setNoteCounts(emptyNotes);

          const emptyCoins: Record<number, number> = {};
          COIN_DENOMINATIONS.forEach((d) => (emptyCoins[d] = 0));
          setCoinCounts(emptyCoins);

          setCountedBy(countedByInitial || '');
          setWitnesses(witnessesInitial || '');
        }
        isInitializedRef.current = true;
      }
    } else {
      isInitializedRef.current = false;
      setIsPrintSlipOpen(false);
    }
  }, [isOpen, initialData, initialCounts, countedByInitial, witnessesInitial]);

  if (!isOpen) return null;

  // Handle Note count changes
  const handleNoteCountChange = (denom: number, rawVal: string) => {
    const cleaned = toEnglishDigits(rawVal).replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    const validNum = isNaN(num) ? 0 : Math.max(0, num);
    setNoteCounts((prev) => ({ ...prev, [denom]: validNum }));
  };

  // Handle Coin count changes
  const handleCoinCountChange = (denom: number, rawVal: string) => {
    const cleaned = toEnglishDigits(rawVal).replace(/[^0-9]/g, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned, 10);
    const validNum = isNaN(num) ? 0 : Math.max(0, num);
    setCoinCounts((prev) => ({ ...prev, [denom]: validNum }));
  };

  // Quick increment/decrement for Notes
  const handleNoteDelta = (denom: number, delta: number) => {
    setNoteCounts((prev) => {
      const current = prev[denom] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [denom]: next };
    });
  };

  // Quick increment/decrement for Coins
  const handleCoinDelta = (denom: number, delta: number) => {
    setCoinCounts((prev) => {
      const current = prev[denom] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [denom]: next };
    });
  };

  // Clear a single denomination
  const handleClearNote = (denom: number) => {
    setNoteCounts((prev) => ({ ...prev, [denom]: 0 }));
  };
  const handleClearCoin = (denom: number) => {
    setCoinCounts((prev) => ({ ...prev, [denom]: 0 }));
  };

  // Reset all counts
  const handleResetAll = () => {
    const emptyNotes: Record<number, number> = {};
    NOTE_DENOMINATIONS.forEach((d) => (emptyNotes[d] = 0));
    setNoteCounts(emptyNotes);

    const emptyCoins: Record<number, number> = {};
    COIN_DENOMINATIONS.forEach((d) => (emptyCoins[d] = 0));
    setCoinCounts(emptyCoins);
  };

  // Subtotal calculations
  const totalNotesAmount = NOTE_DENOMINATIONS.reduce((sum, denom) => {
    return sum + denom * (noteCounts[denom] || 0);
  }, 0);

  const totalNotesCount = NOTE_DENOMINATIONS.reduce((sum, denom) => {
    return sum + (noteCounts[denom] || 0);
  }, 0);

  const totalCoinsAmount = COIN_DENOMINATIONS.reduce((sum, denom) => {
    return sum + denom * (coinCounts[denom] || 0);
  }, 0);

  const totalCoinsCount = COIN_DENOMINATIONS.reduce((sum, denom) => {
    return sum + (coinCounts[denom] || 0);
  }, 0);

  const grandTotal = totalNotesAmount + totalCoinsAmount;
  const totalPieces = totalNotesCount + totalCoinsCount;

  // Compare with target amount
  const difference = targetAmount !== undefined ? grandTotal - targetAmount : 0;
  const hasMismatch = targetAmount !== undefined && targetAmount > 0 && difference !== 0;
  const isMatched = targetAmount !== undefined && targetAmount > 0 && difference === 0;

  // Build complete CashDenominationData object
  const buildDenominationData = (): CashDenominationData => {
    const witnessList = witnesses
      ? witnesses.split(',').map((w) => w.trim()).filter(Boolean)
      : [];

    return {
      collectionType: collectionType as CashDenominationData['collectionType'],
      reference,
      countedBy: countedBy.trim() || 'দায়িত্বপ্রাপ্ত গণনাকারী',
      countingDateTime,
      witnesses: witnessList,
      noteBreakdown: { ...noteCounts },
      coinBreakdown: { ...coinCounts },
      totalNotesCount,
      totalCoinsCount,
      totalNotesAmount,
      totalCoinsAmount,
      grandTotal,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Copy breakdown text to clipboard
  const handleCopyBreakdown = () => {
    const lines: string[] = ['=== ক্যাশ নোট ও মুদ্রা (ভাংতি) গণনা বিবরণী ==='];
    if (reference) lines.push(`রেফারেন্স/ভাউচার: ${reference}`);
    if (countedBy) lines.push(`গণনাকারী: ${countedBy}`);
    lines.push(`তারিখ ও সময়: ${countingDateTime.replace('T', ' ')}`);
    lines.push('');
    lines.push('--- ব্যাংক নোট ---');
    NOTE_DENOMINATIONS.forEach((d) => {
      const qty = noteCounts[d] || 0;
      if (qty > 0) {
        lines.push(`৳ ${d} × ${qty} টি = ৳ ${(d * qty).toLocaleString('en-IN')}`);
      }
    });
    lines.push(`নোটের মোট: ৳ ${totalNotesAmount.toLocaleString('en-IN')} (${totalNotesCount} টি)`);
    lines.push('');
    lines.push('--- ধাতব মুদ্রা / কয়েন ---');
    COIN_DENOMINATIONS.forEach((d) => {
      const qty = coinCounts[d] || 0;
      if (qty > 0) {
        lines.push(`৳ ${d} × ${qty} টি = ৳ ${(d * qty).toLocaleString('en-IN')}`);
      }
    });
    lines.push(`কয়েনের মোট: ৳ ${totalCoinsAmount.toLocaleString('en-IN')} (${totalCoinsCount} টি)`);
    lines.push('----------------------------------------');
    lines.push(`সর্বমোট পিস: ${totalPieces} টি`);
    lines.push(`সর্বমোট নগদ টাকা: ৳ ${grandTotal.toLocaleString('en-IN')}`);
    lines.push(`কথায়: ${numberToBengaliWords(grandTotal)}`);
    if (witnesses) lines.push(`সাক্ষীবৃন্দ: ${witnesses}`);
    if (notes) lines.push(`মন্তব্য: ${notes}`);

    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply to parent form
  const handleApplyToForm = () => {
    if (onApplyTotal) {
      const data = buildDenominationData();
      onApplyTotal(grandTotal, data);
    }
    onClose();
  };

  const currentDenomData = buildDenominationData();

  return (
    <>
      <div
        id="modal-universal-cash-counter"
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150 font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
          {/* Top Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-emerald-700/50 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 text-emerald-300 border border-white/15 rounded-xl shadow-inner">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-siliguri tracking-tight flex items-center gap-2">
                  <span>{titleBn}</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                    ইউনিভার্সাল ক্যাশ ইঞ্জিন
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100/90 font-siliguri mt-0.5">
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

          {/* Real-time Summary Card & Target Comparison */}
          <div className="bg-emerald-950 text-white p-3 sm:p-4 border-b border-emerald-900 shadow-inner flex flex-col gap-2 shrink-0">
            {/* Upper Stat Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300 font-siliguri">
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-1.5 bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>নোট:</span>
                  <span className="text-white font-mono font-bold text-xs sm:text-sm">
                    ৳ {totalNotesAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono">({totalNotesCount} টি)</span>
                </div>

                <div className="flex items-center space-x-1.5 bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>কয়েন:</span>
                  <span className="text-amber-200 font-mono font-bold text-xs sm:text-sm">
                    ৳ {totalCoinsAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">({totalCoinsCount} টি)</span>
                </div>

                <div className="hidden sm:flex items-center space-x-1 text-slate-300 text-xs">
                  <span>মোট পিস:</span>
                  <span className="text-white font-mono font-bold">{totalPieces} টি</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyBreakdown}
                  className="text-[11px] text-emerald-200 hover:text-white flex items-center space-x-1 bg-emerald-900/70 hover:bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-700 transition-colors cursor-pointer"
                  title="হিসাবের বিস্তারিত টেক্সট কপি করুন"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-emerald-300 font-bold">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span>কপি</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintSlipOpen(true)}
                  className="text-[11px] text-amber-200 hover:text-white flex items-center space-x-1 bg-amber-900/50 hover:bg-amber-800 px-2.5 py-1 rounded-lg border border-amber-700 transition-colors cursor-pointer"
                  title="গণনা স্লিপ প্রিন্ট করুন"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>স্লিপ প্রিন্ট</span>
                </button>
              </div>
            </div>

            {/* Grand Total Amount Display */}
            <div className="flex items-baseline justify-between pt-2 border-t border-emerald-900/80">
              <span className="text-sm sm:text-base text-emerald-300 font-siliguri font-bold">
                সর্বমোট গণনাকৃত টাকা:
              </span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-300 tracking-tight">
                  ৳ {grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Words Preview */}
            <div className="pt-1 border-t border-emerald-900/60 text-xs font-siliguri text-emerald-200 truncate flex items-center justify-between">
              <div className="truncate">
                <span className="text-emerald-400 font-semibold mr-1">কথায়:</span>
                <span className="font-bold text-white">{numberToBengaliWords(grandTotal)}</span>
              </div>
            </div>

            {/* Target Amount Validation Banner (if expectedAmount passed) */}
            {targetAmount !== undefined && targetAmount > 0 && (
              <div
                className={`p-2 rounded-xl text-xs font-siliguri flex items-center justify-between transition-all ${
                  isMatched
                    ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-600'
                    : 'bg-rose-950/90 text-rose-200 border border-rose-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isMatched ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span>মূল ফরমের টাকার পরিমাণ: </span>
                    <strong className="font-mono text-white">৳ {targetAmount.toLocaleString('en-IN')}</strong>
                    {isMatched ? (
                      <span className="ml-2 text-emerald-300 font-bold">✓ হিসাব সঠিকভাবে মিলেছে</span>
                    ) : (
                      <span className="ml-2 font-bold text-rose-300">
                        (পার্থক্য: ৳ {Math.abs(difference).toLocaleString('en-IN')}{' '}
                        {difference > 0 ? 'বেশি' : 'কম'})
                      </span>
                    )}
                  </div>
                </div>

                {hasMismatch && (
                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    className="text-[11px] bg-rose-800 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    ফরমে ৳ {grandTotal.toLocaleString('en-IN')} সেট করুন
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tab Filter & Meta Controls */}
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-1 bg-slate-200 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 text-xs font-bold font-siliguri rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সব কারেন্সি ({DENOMINATIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('NOTES')}
                className={`px-3 py-1 text-xs font-bold font-siliguri rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'NOTES'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>নোট ({NOTE_DENOMINATIONS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COINS')}
                className={`px-3 py-1 text-xs font-bold font-siliguri rounded-lg transition-colors cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'COINS'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>কয়েন ({COIN_DENOMINATIONS.length})</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs font-siliguri text-slate-600">
              <div className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={countedBy}
                  onChange={(e) => setCountedBy(e.target.value)}
                  placeholder="গণনাকারীর নাম"
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-emerald-600 w-28 sm:w-36"
                />
              </div>
              <div className="hidden sm:flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={witnesses}
                  onChange={(e) => setWitnesses(e.target.value)}
                  placeholder="সাক্ষীবৃন্দ (কমা দিয়ে)"
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-emerald-600 w-32 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Scrollable Denomination Table */}
          <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-50">
            {/* Notes Section */}
            {(activeTab === 'ALL' || activeTab === 'NOTES') && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold font-siliguri text-xs">
                    <Banknote className="w-4 h-4 text-emerald-700" />
                    <span>ব্যাংক নোটসমূহ (৳১০০০ থেকে ৳২)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    নোটের উপমোট: ৳ {totalNotesAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-800 font-bold font-siliguri border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">নোটের মান</th>
                        <th className="py-2.5 px-2 text-center w-28 sm:w-36">নোটের সংখ্যা</th>
                        <th className="py-2.5 px-2 text-center">দ্রুত যোগ</th>
                        <th className="py-2.5 px-3 text-right">মোট টাকা (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {NOTE_DENOMINATIONS.map((denom) => {
                        const qty = noteCounts[denom] || 0;
                        const lineTotal = denom * qty;
                        const badge = DENOM_BADGES[denom] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' };

                        return (
                          <tr
                            key={`note-${denom}`}
                            className={`transition-colors ${
                              qty > 0 ? 'bg-emerald-50/60 font-medium' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold font-mono text-xs border ${badge.bg} ${badge.text} ${badge.border}`}
                                >
                                  ৳ {denom}
                                </span>
                                <span className="text-[11px] text-slate-500 font-siliguri hidden sm:inline">
                                  টাকার নোট
                                </span>
                              </div>
                            </td>

                            <td className="py-1.5 px-2 text-center">
                              <input
                                id={`input-note-${denom}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={qty === 0 ? '' : qty.toString()}
                                placeholder="০"
                                onChange={(e) => handleNoteCountChange(denom, e.target.value)}
                                className="w-20 sm:w-24 text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all text-sm shadow-2xs"
                              />
                            </td>

                            <td className="py-1.5 px-2 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleNoteDelta(denom, 1)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200"
                                  title="+১ যোগ করুন"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleNoteDelta(denom, 5)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200"
                                  title="+৫ যোগ করুন"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleNoteDelta(denom, 10)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200 hidden sm:inline"
                                  title="+১০ যোগ করুন"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleNoteDelta(denom, 50)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-slate-200 hidden sm:inline"
                                  title="+৫০ যোগ করুন"
                                >
                                  +50
                                </button>
                                {qty > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearNote(denom)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                    title="এই নোট মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

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
            )}

            {/* Coins Section */}
            {(activeTab === 'ALL' || activeTab === 'COINS') && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold font-siliguri text-xs">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>ধাতব মুদ্রা / কয়েন (৳৫, ৳২, ৳১)</span>
                  </div>
                  <span className="text-[11px] text-amber-700 font-mono font-bold">
                    কয়েনের উপমোট: ৳ {totalCoinsAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-50 text-amber-900 font-bold font-siliguri border-b border-amber-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">মুদ্রা / কয়েন</th>
                        <th className="py-2.5 px-2 text-center w-28 sm:w-36">মুদ্রার সংখ্যা</th>
                        <th className="py-2.5 px-2 text-center">দ্রুত যোগ</th>
                        <th className="py-2.5 px-3 text-right">মোট টাকা (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {COIN_DENOMINATIONS.map((denom) => {
                        const qty = coinCounts[denom] || 0;
                        const lineTotal = denom * qty;

                        return (
                          <tr
                            key={`coin-${denom}`}
                            className={`transition-colors ${
                              qty > 0 ? 'bg-amber-50/70 font-medium' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded-full font-bold font-mono text-xs bg-amber-100 text-amber-900 border border-amber-300">
                                  ৳ {denom}
                                </span>
                                <span className="text-[11px] text-slate-500 font-siliguri hidden sm:inline">
                                  কয়েন / মুদ্রা
                                </span>
                              </div>
                            </td>

                            <td className="py-1.5 px-2 text-center">
                              <input
                                id={`input-coin-${denom}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={qty === 0 ? '' : qty.toString()}
                                placeholder="০"
                                onChange={(e) => handleCoinCountChange(denom, e.target.value)}
                                className="w-20 sm:w-24 text-center px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-bold font-mono focus:bg-amber-50 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all text-sm shadow-2xs"
                              />
                            </td>

                            <td className="py-1.5 px-2 text-center">
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleCoinDelta(denom, 1)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-900 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-amber-200"
                                  title="+১ কয়েন যোগ"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCoinDelta(denom, 5)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-900 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-amber-200"
                                  title="+৫ কয়েন যোগ"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCoinDelta(denom, 10)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-900 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-amber-200 hidden sm:inline"
                                  title="+১০ কয়েন যোগ"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCoinDelta(denom, 50)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-900 rounded-lg text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-2xs border border-amber-200 hidden sm:inline"
                                  title="+৫০ কয়েন যোগ"
                                >
                                  +50
                                </button>
                                {qty > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearCoin(denom)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                    title="এই কয়েন মুছুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-900">
                              {lineTotal > 0 ? (
                                <span className="text-amber-800 font-bold text-xs sm:text-sm">
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
            )}

            {/* Optional Notes or Description */}
            <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                বিশেষ নোট বা অডিট মন্তব্য (ঐচ্ছিক):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="যেমন: ৩য় তলার দানবাক্স হতে সংগৃহীত, জুমার ২য় জামাত ইত্যাদি"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer font-siliguri"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>সব ০ করুন (রিসেট)</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer font-siliguri"
              >
                বাতিল (Esc)
              </button>

              {onApplyTotal && (
                <button
                  id="btn-calc-apply-total"
                  type="button"
                  onClick={handleApplyToForm}
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

      {/* Denomination Print Slip Modal */}
      {isPrintSlipOpen && (
        <DenominationPrintSlip
          isOpen={isPrintSlipOpen}
          onClose={() => setIsPrintSlipOpen(false)}
          denominationData={currentDenomData}
          mosque={mosque || null}
          language={language}
        />
      )}
    </>
  );
};

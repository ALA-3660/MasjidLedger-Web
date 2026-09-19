import React, { useState } from 'react';
import { X, Calculator, Banknote, Coins, RotateCcw, Check } from 'lucide-react';
import { CashDenominationData } from '../types';
import { Language, toBanglaNumber, formatCurrency } from '../lib/i18n';

interface CashDenominationCalculatorModalProps {
  isOpen: boolean;
  initialData?: CashDenominationData;
  onClose: () => void;
  onSave: (data: CashDenominationData) => void;
  language?: Language;
}

const NOTE_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2] as const;
const COIN_DENOMINATIONS = [5, 2, 1] as const;

export const CashDenominationCalculatorModal: React.FC<CashDenominationCalculatorModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSave,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

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

  if (!isOpen) return null;

  const handleNoteChange = (denom: number, count: number) => {
    setNotes((prev) => ({ ...prev, [denom]: Math.max(0, count || 0) }));
  };

  const handleCoinChange = (denom: number, count: number) => {
    setCoins((prev) => ({ ...prev, [denom]: Math.max(0, count || 0) }));
  };

  const handleReset = () => {
    setNotes({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 });
    setCoins({ 5: 0, 2: 0, 1: 0 });
  };

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

  const handleApply = () => {
    onSave({
      notes,
      coins,
      totalNotesCount,
      totalCoinsCount,
      notesSubtotal,
      coinsSubtotal,
      grandTotal,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm font-siliguri">
                {isBn ? 'নগদ টাকা নোট ও কয়েন গণনা (Denomination)' : 'Cash Denomination Calculator'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isBn ? 'নোট ও কয়েনের সংখ্যা দিয়ে মোট হিসাব নিশ্চিত করুন' : 'Enter count of each denomination'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Notes Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'কাগুজে নোটসমূহ (Banknotes)' : 'Banknotes'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NOTE_DENOMINATIONS.map((denom) => {
                const count = notes[denom] || 0;
                const total = denom * count;
                return (
                  <div
                    key={`note-${denom}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-800 w-16 font-baloo">
                      ৳{denom}
                    </span>
                    <span className="text-[11px] text-slate-400 mx-1">×</span>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => handleNoteChange(denom, parseInt(e.target.value, 10) || 0)}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center text-xs font-bold text-slate-800 font-baloo focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-emerald-700 w-20 text-right font-baloo">
                      = ৳{isBn ? toBanglaNumber(formatCurrency(total)) : total.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coins Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>{isBn ? 'কয়েনসমূহ (Coins)' : 'Coins'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {COIN_DENOMINATIONS.map((denom) => {
                const count = coins[denom] || 0;
                const total = denom * count;
                return (
                  <div
                    key={`coin-${denom}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-300 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-800 font-baloo">
                      ৳{denom}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => handleCoinChange(denom, parseInt(e.target.value, 10) || 0)}
                      className="w-14 px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-center text-xs font-bold text-slate-800 font-baloo focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-700 font-baloo text-right">
                      ৳{isBn ? toBanglaNumber(formatCurrency(total)) : total.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-900 font-bold block font-siliguri">
                {isBn ? 'গণনাকৃত সর্বমোট নগদ টাকা:' : 'Calculated Total Cash:'}
              </span>
              <span className="text-[11px] text-emerald-700 font-siliguri">
                {isBn
                  ? `মোট নোট: ${toBanglaNumber(totalNotesCount)} টি | কয়েন: ${toBanglaNumber(totalCoinsCount)} টি`
                  : `Total Notes: ${totalNotesCount} | Coins: ${totalCoinsCount}`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-emerald-800 font-baloo">
                ৳ {isBn ? toBanglaNumber(formatCurrency(grandTotal)) : grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'রিসেট' : 'Reset'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={grandTotal <= 0}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 rounded-xl transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isBn ? 'টাকার পরিমাণ সেট করুন' : 'Apply Count'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

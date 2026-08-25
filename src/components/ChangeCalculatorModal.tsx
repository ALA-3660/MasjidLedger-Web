import React, { useState, useEffect } from 'react';
import { Calculator, X, RotateCcw, Check, Banknote } from 'lucide-react';
import { Language, translations, formatCurrency } from '../lib/i18n';

interface ChangeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTotal: (totalAmount: number, breakdown: Record<number, number>) => void;
  initialCounts?: Record<number, number>;
  language?: Language;
  titleBn?: string;
}

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export const ChangeCalculatorModal: React.FC<ChangeCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyTotal,
  initialCounts = {},
  language = 'bn',
  titleBn = 'ভাংতি ও নোট গণনা হিসাব (Denomination Calculator)',
}) => {
  const t = translations[language] || translations.bn;
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (isOpen) {
      setCounts(initialCounts || {});
    }
  }, [isOpen, initialCounts]);

  if (!isOpen) return null;

  const handleCountChange = (denom: number, valStr: string) => {
    const qty = Math.max(0, parseInt(valStr, 10) || 0);
    setCounts((prev) => ({
      ...prev,
      [denom]: qty,
    }));
  };

  const handleReset = () => {
    const empty: Record<number, number> = {};
    DENOMINATIONS.forEach((d) => (empty[d] = 0));
    setCounts(empty);
  };

  const calculateTotal = () => {
    return DENOMINATIONS.reduce((sum, denom) => {
      const qty = counts[denom] || 0;
      return sum + denom * qty;
    }, 0);
  };

  const totalNotesCount = DENOMINATIONS.reduce((sum, denom) => {
    return sum + (counts[denom] || 0);
  }, 0);

  const grandTotal = calculateTotal();

  const handleComplete = () => {
    onApplyTotal(grandTotal, counts);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">{titleBn}</h3>
              <p className="text-xs text-emerald-100/80">
                {language === 'bn' ? 'নোটের সংখ্যা ইনপুট দিলে স্বয়ংক্রিয়ভাবে মোট টাকার হিসাব হয়ে যাবে' : 'Enter note quantities to auto-calculate grand total'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Denomination Table */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">নোট / মুদ্রা (টাকা)</th>
                  <th className="py-2.5 px-3 w-28 sm:w-36 text-center">সংখ্যা (নোট/পিস)</th>
                  <th className="py-2.5 px-3 text-right">মোট টাকা (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DENOMINATIONS.map((denom) => {
                  const qty = counts[denom] || 0;
                  const lineTotal = denom * qty;
                  return (
                    <tr
                      key={denom}
                      className={`hover:bg-slate-50 transition-colors ${
                        qty > 0 ? 'bg-emerald-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-2 px-3 flex items-center space-x-2">
                        <Banknote className={`w-4 h-4 ${denom >= 100 ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-slate-800">৳ {denom}</span>
                        {denom >= 100 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                            নোট
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={counts[denom] === 0 || counts[denom] === undefined ? '' : counts[denom]}
                          placeholder="০"
                          onChange={(e) => handleCountChange(denom, e.target.value)}
                          className="w-full sm:w-28 text-center px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {lineTotal > 0 ? `৳ ${lineTotal.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 text-emerald-900">
              <div>
                <span className="text-xs text-emerald-700 block font-medium">সর্বমোট নোটের সংখ্যা:</span>
                <span className="text-sm font-bold">{totalNotesCount} টি</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-emerald-700 block font-medium">হিসাবকৃত সর্বমোট টাকা:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono tracking-tight">
                ৳ {grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>রিসেট (মুছুন)</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>সম্পন্ন (টাকা যোগ করুন)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

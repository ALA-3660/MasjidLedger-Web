import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Banknote,
  QrCode,
  Calculator,
  ChevronUp,
  ChevronDown,
  Coins,
  Receipt,
  Layers,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n';

export interface FloatingFinancialActionsProps {
  onOpenIncome: () => void;
  onOpenExpense: () => void;
  onOpenJuma: () => void;
  onOpenScanner: () => void;
  onOpenCalculator: () => void;
  language?: Language;
  className?: string;
}

export const FloatingFinancialActions: React.FC<FloatingFinancialActionsProps> = ({
  onOpenIncome,
  onOpenExpense,
  onOpenJuma,
  onOpenScanner,
  onOpenCalculator,
  language = 'bn',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const t = translations[language] || translations.bn;

  return (
    <div
      id="floating-financial-actions"
      className={`fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden font-siliguri ${className}`}
    >
      {/* Expanded Action Buttons */}
      {isExpanded && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* 1. New Income */}
          <button
            id="float-btn-income"
            type="button"
            onClick={onOpenIncome}
            className="group flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white pl-3 pr-3.5 py-2 rounded-2xl shadow-lg hover:shadow-xl border border-emerald-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
            title="নতুন আয় ও প্রাপ্তি ভাউচার"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>➕ আয় ও প্রাপ্তি</span>
          </button>

          {/* 2. New Expense */}
          <button
            id="float-btn-expense"
            type="button"
            onClick={onOpenExpense}
            className="group flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white pl-3 pr-3.5 py-2 rounded-2xl shadow-lg hover:shadow-xl border border-rose-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
            title="নতুন ব্যয় ও পরিশোধ ভাউচার"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Minus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>➖ ব্যয় ও পরিশোধ</span>
          </button>

          {/* 3. Juma Collection */}
          <button
            id="float-btn-juma"
            type="button"
            onClick={onOpenJuma}
            className="group flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white pl-3 pr-3.5 py-2 rounded-2xl shadow-lg hover:shadow-xl border border-teal-400/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
            title="পবিত্র জুমার দিনের কালেকশন ও হিসাব"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5 text-white" />
            </div>
            <span>🕌 জুমার দিনের কালেকশন</span>
          </button>

          {/* 4. Universal QR Scanner */}
          <button
            id="float-btn-scanner"
            type="button"
            onClick={onOpenScanner}
            className="group flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white pl-3 pr-3.5 py-2 rounded-2xl shadow-lg hover:shadow-xl border border-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
            title="ইউনিভার্সাল QR ও বারকোড স্ক্যানার"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span>▣ QR স্ক্যানার</span>
          </button>

          {/* 5. Change Calculator */}
          <button
            id="float-btn-calculator"
            type="button"
            onClick={onOpenCalculator}
            className="group flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white pl-3 pr-3.5 py-2 rounded-2xl shadow-lg hover:shadow-xl border border-amber-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
            title="ভাংতি টাকা ও ক্যাশ নোট গণনা ক্যালকুলেটর"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-white" />
            </div>
            <span>🪙 ভাংতি টাকা গণনা</span>
          </button>
        </div>
      )}

      {/* Main Trigger Toggle Pill */}
      <button
        id="btn-toggle-floating-menu"
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-3 rounded-full shadow-2xl border-2 border-white/40 transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs"
        title={isExpanded ? 'কুইক অ্যাকশন মেনু সংক্ষেপ করুন' : 'কুইক অ্যাকশন মেনু খুলুন'}
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>কুইক অ্যাকশন</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-blue-200" />
        ) : (
          <ChevronUp className="w-4 h-4 text-blue-200" />
        )}
      </button>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Banknote,
  QrCode,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Language } from '../lib/i18n';

export interface FloatingFinancialActionsProps {
  onOpenIncome: () => void;
  onOpenExpense: () => void;
  onOpenJuma: () => void;
  onOpenScanner: () => void;
  onOpenCalculator?: () => void;
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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <div
      id="floating-financial-actions"
      ref={menuRef}
      className={`relative inline-flex flex-col items-end print:hidden font-siliguri ${className}`}
    >
      {/* Main Trigger Toggle Pill (Positioned directly below the Clock) */}
      <button
        id="btn-toggle-floating-menu"
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-full shadow-md hover:shadow-lg border border-blue-500/40 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer font-bold text-xs"
        title={isExpanded ? 'কুইক অ্যাকশন মেনু সংক্ষেপ করুন' : 'কুইক অ্যাকশন মেনু খুলুন'}
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>{language === 'bn' ? 'কুইক অ্যাকশন' : 'Quick Action'}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-200" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-200" />
        )}
      </button>

      {/* Expanded Action Buttons Dropdown Below the Button */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 z-50 flex flex-col items-end gap-2 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* 1. New Income Entry */}
          <button
            id="float-btn-income"
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onOpenIncome();
            }}
            className="w-full group flex items-center space-x-2.5 bg-emerald-600 hover:bg-emerald-700 text-white pl-3 pr-3.5 py-2 rounded-xl shadow-sm hover:shadow-md border border-emerald-500/50 transition-all active:scale-95 cursor-pointer text-xs font-bold"
            title="নতুন আয় গ্রহণ ভাউচার ও ফর্ম"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>➕ নতুন আয় গ্রহণ</span>
          </button>

          {/* 2. New Expense Entry */}
          <button
            id="float-btn-expense"
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onOpenExpense();
            }}
            className="w-full group flex items-center space-x-2.5 bg-rose-600 hover:bg-rose-700 text-white pl-3 pr-3.5 py-2 rounded-xl shadow-sm hover:shadow-md border border-rose-500/50 transition-all active:scale-95 cursor-pointer text-xs font-bold"
            title="নতুন ব্যয় ও পরিশোধ ভাউচার ও ফর্ম"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            <span>➕ নতুন ব্যয় ও পরিশোধ</span>
          </button>

          {/* 3. Juma Collection */}
          <button
            id="float-btn-juma"
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onOpenJuma();
            }}
            className="w-full group flex items-center space-x-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white pl-3 pr-3.5 py-2 rounded-xl shadow-sm hover:shadow-md border border-teal-400/50 transition-all active:scale-95 cursor-pointer text-xs font-bold"
            title="পবিত্র জুমার দিনের কালেকশন ও হিসাব"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Banknote className="w-3.5 h-3.5 text-white" />
            </div>
            <span>🕌 জুমার দিনের কালেকশন</span>
          </button>

          {/* 4. Universal QR Scanner */}
          <button
            id="float-btn-scanner"
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onOpenScanner();
            }}
            className="w-full group flex items-center space-x-2.5 bg-slate-800 hover:bg-slate-900 text-white pl-3 pr-3.5 py-2 rounded-xl shadow-sm hover:shadow-md border border-slate-700 transition-all active:scale-95 cursor-pointer text-xs font-bold"
            title="ইউনিভার্সাল QR ও বারকোড স্ক্যানার"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span>▣ QR স্ক্যানার</span>
          </button>

          {/* 5. Cash Denomination Counter (if callback passed) */}
          {onOpenCalculator && (
            <button
              id="float-btn-calculator"
              type="button"
              onClick={() => {
                setIsExpanded(false);
                onOpenCalculator();
              }}
              className="w-full group flex items-center space-x-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 pl-3 pr-3.5 py-2 rounded-xl shadow-2xs border border-emerald-200 transition-all active:scale-95 cursor-pointer text-xs font-bold"
              title="ভাংতি টাকা ও ক্যাশ নোট গণনা"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-600/15 flex items-center justify-center shrink-0">
                <Banknote className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <span>💵 ভাংতি নোট গণনা</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

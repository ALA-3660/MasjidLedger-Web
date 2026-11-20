import React from 'react';
import { LayoutDashboard, Banknote, ArrowUpRight, Menu } from 'lucide-react';
import { Language } from '../../lib/i18n';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMenu: () => void;
  isMenuOpen: boolean;
  language?: Language;
}

const INCOME_TABS = new Set([
  'income',
  'new_income_entry',
  'income_juma',
  'donations',
  'donationBox',
  'income_waqf',
  'income_other',
  'income_register',
  'income_analytics',
  'income_reports',
]);

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMenu,
  isMenuOpen,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const isDashboard = activeTab === 'dashboard' && !isMenuOpen;
  const isIncome = INCOME_TABS.has(activeTab) && !isMenuOpen;
  const isExpense = activeTab === 'expense' && !isMenuOpen;

  return (
    <nav
      aria-label={isBn ? 'মোবাইল নেভিগেশন' : 'Mobile Navigation'}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-200/90 shadow-[0_-6px_24px_-8px_rgba(6,95,70,0.18)] print:hidden font-siliguri pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-1">
        {/* 1. ড্যাশবোর্ড */}
        <button
          id="mobile-nav-dashboard"
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 my-1 transition-all cursor-pointer active:scale-95 ${
            isDashboard
              ? 'bg-emerald-50 text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-emerald-700 font-medium'
          }`}
        >
          <LayoutDashboard
            className={`w-5 h-5 ${isDashboard ? 'text-emerald-700 stroke-[2.3]' : 'text-slate-500'}`}
          />
          <span className="text-[11px] leading-none">{isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
        </button>

        {/* 2. আয় */}
        <button
          id="mobile-nav-income"
          type="button"
          onClick={() => onSelectTab('income')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 my-1 transition-all cursor-pointer active:scale-95 ${
            isIncome
              ? 'bg-emerald-50 text-emerald-800 font-bold'
              : 'text-slate-500 hover:text-emerald-700 font-medium'
          }`}
        >
          <Banknote
            className={`w-5 h-5 ${isIncome ? 'text-emerald-700 stroke-[2.3]' : 'text-slate-500'}`}
          />
          <span className="text-[11px] leading-none">{isBn ? 'আয়' : 'Income'}</span>
        </button>

        {/* 3. ব্যয় */}
        <button
          id="mobile-nav-expense"
          type="button"
          onClick={() => onSelectTab('expense')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 my-1 transition-all cursor-pointer active:scale-95 ${
            isExpense
              ? 'bg-rose-50 text-rose-700 font-bold'
              : 'text-slate-500 hover:text-rose-600 font-medium'
          }`}
        >
          <ArrowUpRight
            className={`w-5 h-5 ${isExpense ? 'text-rose-600 stroke-[2.3]' : 'text-slate-500'}`}
          />
          <span className="text-[11px] leading-none">{isBn ? 'ব্যয়' : 'Expense'}</span>
        </button>

        {/* 4. মেনু (Full Sidebar Drawer) */}
        <button
          id="mobile-nav-menu"
          type="button"
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 my-1 transition-all cursor-pointer active:scale-95 ${
            isMenuOpen
              ? 'bg-teal-50 text-teal-800 font-bold'
              : 'text-slate-500 hover:text-emerald-700 font-medium'
          }`}
        >
          <Menu
            className={`w-5 h-5 ${isMenuOpen ? 'text-teal-700 stroke-[2.3]' : 'text-slate-500'}`}
          />
          <span className="text-[11px] leading-none">{isBn ? 'মেনু' : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};

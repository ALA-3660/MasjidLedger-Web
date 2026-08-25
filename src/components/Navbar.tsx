import React from 'react';
import {
  Building2,
  Globe,
  Sparkles,
  Smartphone,
  Monitor,
  PlusCircle,
  LogOut,
  ShieldCheck,
  Menu,
  FileSpreadsheet,
  Banknote,
  Calculator
} from 'lucide-react';
import { Mosque, User } from '../types';
import { Language, translations } from '../lib/i18n';

interface NavbarProps {
  currentMosque?: Mosque | null;
  mosque?: Mosque | null;
  currentUser?: User | null;
  allMosques?: Mosque[];
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  onLanguageToggle?: () => void;
  onMosqueChange?: (mosqueId: string) => void;
  viewMode?: 'desktop' | 'mobile';
  onViewModeChange?: (mode: 'desktop' | 'mobile') => void;
  onOpenAi?: () => void;
  onOpenCalculator?: () => void;
  onQuickAction?: (action: 'income' | 'expense' | 'donation') => void;
  onToggleSidebar?: () => void;
  onRoleChange?: (role: any) => void;
  onNavigate?: (tab: any) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMosque,
  mosque,
  currentUser = null,
  allMosques = [],
  language = 'bn',
  onLanguageChange,
  onLanguageToggle,
  onMosqueChange,
  viewMode = 'desktop',
  onViewModeChange,
  onOpenAi,
  onOpenCalculator,
  onQuickAction,
  onToggleSidebar,
  onRoleChange,
  onNavigate,
  onLogout,
}) => {
  const activeMosque = currentMosque || mosque;
  const t = translations[language] || translations.bn;
  const mosquesList = allMosques.length > 0 ? allMosques : (activeMosque ? [activeMosque] : []);

  const handleLanguageSwitch = () => {
    const nextLang: Language = language === 'bn' ? 'en' : 'bn';
    if (onLanguageChange) {
      onLanguageChange(nextLang);
    } else if (onLanguageToggle) {
      onLanguageToggle();
    }
  };

  const handleQuick = (act: 'income' | 'expense' | 'donation') => {
    if (onQuickAction) {
      onQuickAction(act);
    } else if (onNavigate) {
      onNavigate(act === 'donation' ? 'donations' : act);
    }
  };

  const handleModeChange = (mode: 'desktop' | 'mobile') => {
    if (typeof onViewModeChange === 'function') {
      onViewModeChange(mode);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm shrink-0 navbar-root print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Sidebar toggle */}
          <div className="flex items-center space-x-3">
            <button
              id="btn-sidebar-toggle"
              onClick={() => onToggleSidebar?.()}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-hidden"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                <Building2 className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1 font-siliguri">
                    <span>{language === 'bn' ? 'মসজিদলেজার' : 'MasjidLedger'}</span>
                    <span className="text-blue-600 italic font-black text-sm">Pro</span>
                  </h1>
                  <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60 hidden sm:inline-block uppercase font-siliguri">
                    v2.6
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block truncate max-w-[220px] font-baloo">
                  {activeMosque?.nameBn || activeMosque?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Mosque Selector & Android Sync Status */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex bg-slate-100 rounded-full px-3.5 py-1.5 items-center space-x-2 border border-slate-200 font-baloo">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-700 font-baloo">
                {language === 'bn' ? 'অ্যান্ড্রয়েড সিঙ্ক সক্রিয়' : 'Android Sync Active'}
              </span>
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && mosquesList.length > 1 && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-baloo">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-slate-700 font-semibold font-baloo">{language === 'bn' ? 'মসজিদ:' : 'Mosque:'}</span>
                <select
                  id="select-super-mosque"
                  value={activeMosque?.id || ''}
                  onChange={(e) => onMosqueChange?.(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden font-medium font-baloo"
                >
                  {mosquesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameBn || m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Action Menu */}
            <div className="relative group hidden sm:block">
              <button
                id="btn-quick-action"
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold font-siliguri shadow-sm transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-400" />
                <span className="font-siliguri">{language === 'bn' ? '+ দ্রুত এন্ট্রি' : '+ Quick Entry'}</span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 hidden group-hover:block z-50 divide-y divide-slate-100">
                <div className="py-1">
                  <button
                    id="btn-quick-income"
                    onClick={() => handleQuick('income')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold font-siliguri">{t.addIncome}</span>
                  </button>
                  <button
                    id="btn-quick-expense"
                    onClick={() => handleQuick('expense')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span className="font-semibold font-siliguri">{t.addExpense}</span>
                  </button>
                  <button
                    id="btn-quick-donation"
                    onClick={() => handleQuick('donation')}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span className="font-semibold font-siliguri">{t.addDonation}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Advisor Button */}
            <button
              id="btn-ai-advisor-trigger"
              onClick={() => onOpenAi?.()}
              className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold font-siliguri shadow-xs transition-all cursor-pointer"
              title="AI আর্থিক অডিটর ও সারসংক্ষেপ"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline font-siliguri">{language === 'bn' ? 'এআই অডিটর' : 'AI Advisor'}</span>
            </button>

            {/* Denomination Counter Button */}
            <button
              id="btn-navbar-calculator"
              onClick={() => onOpenCalculator?.()}
              className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri shadow-xs transition-all cursor-pointer"
              title="ভাংতি টাকা ও ক্যাশ নোট গণনা (Alt+C)"
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-siliguri">{language === 'bn' ? 'ভাংতি নোট গণনা' : 'Cash Counter'}</span>
            </button>

            {/* View Mode Toggle: Desktop / Android Phone Simulation */}
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 hidden sm:flex items-center">
              <button
                id="btn-mode-desktop"
                onClick={() => handleModeChange('desktop')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'desktop'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Web Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-mode-mobile"
                onClick={() => handleModeChange('mobile')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'mobile'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Native Android App Simulation"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Language Switcher */}
            <button
              id="btn-lang-toggle"
              onClick={handleLanguageSwitch}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold font-siliguri shadow-xs cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-siliguri">{language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* User Profile / Role / Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center font-siliguri">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px] font-siliguri">
                  {currentUser?.name}
                </p>
                <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider font-siliguri">
                  {translations[language][currentUser?.role as keyof typeof translations.bn] || currentUser?.role}
                </p>
              </div>

              {onLogout && (
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title={language === 'bn' ? 'লগআউট' : 'Logout'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

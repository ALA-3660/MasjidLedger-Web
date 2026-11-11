import React, { useState } from 'react';
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
  Calculator,
  QrCode,
  Search,
  Bell,
  RefreshCw,
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
  onOpenScanner?: () => void;
  onOpenActionQrHub?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onQuickAction?: (action: 'income' | 'expense' | 'donation') => void;
  onToggleSidebar?: () => void;
  onRoleChange?: (role: any) => void;
  onNavigate?: (tab: any) => void;
  onLogout?: () => void;
  onHardRefresh?: () => void;
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
  onOpenScanner,
  onOpenActionQrHub,
  onOpenSearch,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onQuickAction,
  onToggleSidebar,
  onRoleChange,
  onNavigate,
  onLogout,
  onHardRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const handleHardRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onHardRefresh) {
        await onHardRefresh();
      }
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      }
    } catch (e) {
      console.error('Cache clear error during hard refresh:', e);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-950 border-b border-emerald-700/80 shadow-md shrink-0 navbar-root print:hidden text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Sidebar toggle */}
          <div className="flex items-center space-x-3">
            <button
              id="btn-sidebar-toggle"
              onClick={() => onToggleSidebar?.()}
              className="p-2 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 lg:hidden focus:outline-hidden cursor-pointer"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400/70 shadow-sm flex items-center justify-center bg-slate-900 ring-2 ring-emerald-400/20 shrink-0">
                <img src="/mosque_dome_logo.jpg" alt="মসজিদে নববীর সবুজ গম্বুজ" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1 font-siliguri drop-shadow-2xs">
                    <span>{language === 'bn' ? 'মসজিদ লেজার' : 'Masjid Ledger'}</span>
                  </h1>
                  <span className="bg-emerald-500/25 text-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40 hidden sm:inline-block uppercase font-siliguri">
                    v2.6
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 font-medium hidden sm:block truncate max-w-[240px] font-baloo">
                  {activeMosque?.nameBn || activeMosque?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Mosque Selector & Android Sync Status */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex bg-white/10 backdrop-blur-xs rounded-full px-3.5 py-1.5 items-center space-x-2 border border-white/20 font-baloo shadow-2xs">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-50 font-baloo">
                {language === 'bn' ? 'অ্যান্ড্রয়েড সিঙ্ক সক্রিয়' : 'Android Sync Active'}
              </span>
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && mosquesList.length > 1 && (
              <div className="flex items-center space-x-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-baloo">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span className="text-emerald-100 font-semibold font-baloo">{language === 'bn' ? 'মসজিদ:' : 'Mosque:'}</span>
                <select
                  id="select-super-mosque"
                  value={activeMosque?.id || ''}
                  onChange={(e) => onMosqueChange?.(e.target.value)}
                  className="bg-emerald-950/90 border border-emerald-600 rounded px-2 py-0.5 text-xs text-white focus:ring-1 focus:ring-amber-400 focus:outline-hidden font-medium font-baloo"
                >
                  {mosquesList.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.nameBn || m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Global Search Button */}
            <button
              id="btn-navbar-global-search"
              onClick={() => onOpenSearch?.()}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold font-siliguri shadow-2xs transition-all cursor-pointer"
              title="গ্লোবাল অনুসন্ধান (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline font-siliguri">{language === 'bn' ? 'অনুসন্ধান' : 'Search'}</span>
              <kbd className="hidden lg:inline text-[10px] font-mono text-emerald-100 bg-black/25 px-1 rounded border border-white/15">
                ⌘K
              </kbd>
            </button>

            {/* Notification Center Bell */}
            <button
              id="btn-navbar-notifications"
              onClick={() => onOpenNotifications?.()}
              className="relative p-2 text-emerald-50 hover:text-white hover:bg-white/20 rounded-lg border border-white/20 bg-white/10 shadow-2xs transition-all cursor-pointer"
              title="নোটিফিকেশন সেন্টার"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Hard Refresh Button */}
            <button
              id="btn-navbar-hard-refresh"
              onClick={handleHardRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold font-siliguri shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-75"
              title={language === 'bn' ? 'সফটওয়্যার হার্ড রিফ্রেশ করুন' : 'Hard Refresh Application'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-900 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="font-siliguri">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>

            {/* AI Advisor Button */}
            <button
              id="btn-ai-advisor-trigger"
              onClick={() => onOpenAi?.()}
              className="flex items-center space-x-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 px-3 py-1.5 rounded-lg text-xs font-semibold font-siliguri shadow-xs transition-all cursor-pointer"
              title="AI আর্থিক অডিটর ও সারসংক্ষেপ"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline font-siliguri">{language === 'bn' ? 'এআই অডিটর' : 'AI Advisor'}</span>
            </button>

            {/* View Mode Toggle: Desktop / Android Phone Simulation */}
            <div className="bg-black/25 p-0.5 rounded-lg border border-white/15 hidden sm:flex items-center">
              <button
                id="btn-mode-desktop"
                onClick={() => handleModeChange('desktop')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors ${
                  viewMode === 'desktop'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                }`}
                title="Web Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-mode-mobile"
                onClick={() => handleModeChange('mobile')}
                className={`p-1.5 rounded-md text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors ${
                  viewMode === 'mobile'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-emerald-100 hover:text-white'
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs font-semibold font-siliguri shadow-xs cursor-pointer transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-siliguri">{language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* User Profile / Role / Logout */}
            <div className="flex items-center space-x-2 pl-2.5 border-l border-white/20">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-300/50 text-amber-200 font-bold text-xs flex items-center justify-center font-siliguri shadow-2xs">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white truncate max-w-[120px] font-siliguri">
                  {currentUser?.name}
                </p>
                <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wider font-siliguri">
                  {translations[language][currentUser?.role as keyof typeof translations.bn] || currentUser?.role}
                </p>
              </div>

              {onLogout && (
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-1.5 text-emerald-100 hover:text-white hover:bg-rose-500/80 rounded-lg transition-colors cursor-pointer"
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

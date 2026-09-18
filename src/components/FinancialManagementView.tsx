import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Scale,
  Wallet,
  Landmark,
  Plus,
  Minus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  ChevronRight,
  Menu,
  X,
  FileSpreadsheet,
  ArrowRightLeft,
  Building,
  FileText,
  CalendarCheck,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  FinancialAccount,
  AccountTransfer,
  Mosque,
  User,
  AccountOpeningBalancePayload,
} from '../types';
import { Language, translations } from '../lib/i18n';
import { DailyTransactionsView } from './DailyTransactionsView';
import { OpeningBalanceView } from './OpeningBalanceView';
import { CashBookView } from './CashBookView';
import { BankBookView } from './BankBookView';
import { NavTab } from './Sidebar';

export type FinancialSubModule = 'dailyLedger' | 'openingBalance' | 'cashbook' | 'bank';

interface FinancialManagementViewProps {
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  transfers?: AccountTransfer[];
  currentMosque: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  initialSubModule?: FinancialSubModule;
  onNavigateTab?: (tab: NavTab) => void;
  onUpdateOpeningBalance?: (data: AccountOpeningBalancePayload) => Promise<void>;
  onAddAccount?: (data: any) => Promise<void>;
  onUpdateAccount?: (id: string, data: any) => Promise<void>;
  onTransferFund?: (data: any) => Promise<void>;
}

export const FinancialManagementView: React.FC<FinancialManagementViewProps> = ({
  incomes = [],
  expenses = [],
  accounts = [],
  transfers = [],
  currentMosque,
  currentUser,
  language = 'bn',
  initialSubModule = 'dailyLedger',
  onNavigateTab,
  onUpdateOpeningBalance,
  onAddAccount,
  onUpdateAccount,
  onTransferFund,
}) => {
  const [activeSubModule, setActiveSubModule] = useState<FinancialSubModule>(initialSubModule);
  const [subTab, setSubTab] = useState<string>('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync when initialSubModule changes
  useEffect(() => {
    if (initialSubModule) {
      setActiveSubModule(initialSubModule);
      // Reset subTab to module default
      if (initialSubModule === 'dailyLedger') setSubTab('STATEMENT');
      else if (initialSubModule === 'openingBalance') setSubTab('OPENING_OVERVIEW');
      else if (initialSubModule === 'cashbook') setSubTab('CASHBOOK');
      else if (initialSubModule === 'bank') setSubTab('BANK_LEDGER');
    }
  }, [initialSubModule]);

  // Overall Financial Calculations for Summary
  const { totalCashInHand, totalBankBalance, grandTotalFunds } = useMemo(() => {
    const cash = accounts
      .filter((a) => a.accountType === 'CASH')
      .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    const bank = accounts
      .filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS')
      .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
    return {
      totalCashInHand: cash,
      totalBankBalance: bank,
      grandTotalFunds: cash + bank,
    };
  }, [accounts]);

  // Level 2 Sub-Module Navigation Options
  const subModules = [
    {
      id: 'dailyLedger' as FinancialSubModule,
      label: '📋 দৈনিক লেনদেন',
      subtitle: 'দৈনিক আয়, ব্যয় ও জের বিবরণী',
      icon: CalendarCheck,
      color: 'text-blue-600',
      activeBg: 'bg-blue-50 border-blue-200 text-blue-900',
      badge: 'মেইন লেজার',
    },
    {
      id: 'openingBalance' as FinancialSubModule,
      label: '💰 প্রারম্ভিক স্থিতি',
      subtitle: 'শুরুর ফান্ড ও বেসলাইন জের',
      icon: Scale,
      color: 'text-amber-600',
      activeBg: 'bg-amber-50 border-amber-200 text-amber-900',
      badge: `${accounts.filter((a) => (a.openingBalance || 0) > 0).length} হিসাব`,
    },
    {
      id: 'cashbook' as FinancialSubModule,
      label: '💵 ক্যাশ বুক',
      subtitle: 'নগদ প্রাপ্তি, পরিশোধ ও ক্যাশ স্থিতি',
      icon: Wallet,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badge: `৳ ${totalCashInHand.toLocaleString('en-IN')}`,
    },
    {
      id: 'bank' as FinancialSubModule,
      label: '🏦 ব্যাংক হিসাব',
      subtitle: 'ব্যাংক খতিয়ান ও ফান্ড ট্রান্সফার',
      icon: Landmark,
      color: 'text-indigo-600',
      activeBg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      badge: `৳ ${totalBankBalance.toLocaleString('en-IN')}`,
    },
  ];

  // Specific Sub-Items for the Active Sub-Module
  const activeLedgerOptions = useMemo(() => {
    switch (activeSubModule) {
      case 'dailyLedger':
        return [
          { id: 'STATEMENT', label: '📋 লেনদেন বিবরণী', icon: Calendar },
          { id: 'OPENING_BALANCE', label: '💰 প্রারম্ভিক স্থিতি', icon: Scale },
          { id: 'ACCOUNTS', label: '🏦 হিসাব / ফান্ড', icon: Landmark },
          { id: 'SEARCH', label: '🔎 লেনদেন অনুসন্ধান', icon: Search },
          { id: 'SUMMARY', label: '📊 দৈনিক/মাসিক সারাংশ', icon: Filter },
          { id: 'RECONCILIATION', label: '📑 সমন্বয় ও যাচাই', icon: RefreshCw },
          { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
        ];
      case 'openingBalance':
        return [
          { id: 'OPENING_OVERVIEW', label: '📋 প্রারম্ভিক স্থিতি তালিকা', icon: Scale },
          { id: 'NEW_ENTRY', label: '➕ নতুন প্রারম্ভিক স্থিতি', icon: Plus, isAction: true },
          { id: 'ACCOUNT_STATUS', label: '🏦 অ্যাকাউন্টভিত্তিক স্থিতি', icon: Building },
          { id: 'ADJUSTMENT_HISTORY', label: '🔄 সমন্বয় ইতিহাস', icon: RefreshCw },
          { id: 'SEARCH', label: '🔎 অনুসন্ধান', icon: Search },
          { id: 'SUMMARY', label: '📊 সারাংশ ও পরিসংখ্যান', icon: Filter },
          { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
        ];
      case 'cashbook':
        return [
          { id: 'CASHBOOK', label: '📋 ক্যাশ বুক খতিয়ান', icon: Wallet },
          { id: 'NEW_ENTRY', label: '➕ নগদ লেনদেন এন্ট্রি', icon: Plus, isAction: true },
          { id: 'CASH_STATUS', label: '💰 নগদ স্থিতি বিবরণী', icon: Scale },
          { id: 'SEARCH', label: '🔎 লেনদেন অনুসন্ধান', icon: Search },
          { id: 'SUMMARY', label: '📊 সারসংক্ষেপ ও ট্রেন্ড', icon: Filter },
          { id: 'RECONCILIATION', label: '🔄 ক্যাশ সমন্বয় ও ভাংতি', icon: RefreshCw },
          { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
        ];
      case 'bank':
        return [
          { id: 'BANK_LEDGER', label: '📋 ব্যাংক খতিয়ান', icon: Landmark },
          { id: 'ACCOUNTS_FUNDS', label: '🏦 ব্যাংক ও হিসাব', icon: Building },
          { id: 'DEPOSIT', label: '➕ টাকা জমা', icon: Plus, isAction: true },
          { id: 'WITHDRAWAL', label: '➖ টাকা উত্তোলন', icon: Minus, isAction: true },
          { id: 'FUND_TRANSFER', label: '🔄 তহবিল স্থানান্তর', icon: ArrowRightLeft, isAction: true },
          { id: 'SEARCH', label: '🔎 লেনদেন অনুসন্ধান', icon: Search },
          { id: 'RECONCILIATION', label: '🔄 ব্যাংক সমন্বয়', icon: RefreshCw },
          { id: 'SUMMARY', label: '📊 দৈনিক/মাসিক/বার্ষিক সারাংশ', icon: Filter },
          { id: 'STATEMENT_IMPORT', label: '🧾 ব্যাংক স্টেটমেন্ট', icon: FileText },
          { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
        ];
      default:
        return [];
    }
  }, [activeSubModule]);

  const handleSelectModule = (modId: FinancialSubModule) => {
    setActiveSubModule(modId);
    if (modId === 'dailyLedger') setSubTab('STATEMENT');
    else if (modId === 'openingBalance') setSubTab('OPENING_OVERVIEW');
    else if (modId === 'cashbook') setSubTab('CASHBOOK');
    else if (modId === 'bank') setSubTab('BANK_LEDGER');

    if (onNavigateTab) {
      onNavigateTab(modId);
    }
    setIsMobileDrawerOpen(false);
  };

  const handleSelectSubItem = (itemId: string) => {
    setSubTab(itemId);
    setIsMobileDrawerOpen(false);
  };

  // Reusable Sidebar Content component
  const renderSidebarContent = () => (
    <div className="space-y-4">
      {/* Module Brand Header */}
      <div className="p-3 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl text-white shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-200">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">📊 হিসাব ও লেনদেন</h3>
            <p className="text-[10px] text-blue-200/80">৪টি সমন্বিত খতিয়ান মডিউল</p>
          </div>
        </div>
      </div>

      {/* Level 2: Primary Ledgers Selection */}
      <div className="space-y-1.5">
        <div className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          খতিয়ান নির্বাচন (Primary Ledgers)
        </div>
        {subModules.map((mod) => {
          const Icon = mod.icon;
          const isCurrent = activeSubModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => handleSelectModule(mod.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isCurrent
                  ? `${mod.activeBg} font-bold shadow-2xs ring-1 ring-blue-400/30`
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-white shadow-2xs' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isCurrent ? mod.color : 'text-slate-500'}`} />
                </div>
                <div className="truncate">
                  <span className="text-xs block font-bold truncate">{mod.label}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{mod.subtitle}</span>
                </div>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                  isCurrent ? 'text-blue-700 translate-x-0.5' : 'text-slate-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Selected Ledger Actions / Sub-options */}
      <div className="space-y-1 pt-2 border-t border-slate-200">
        <div className="px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>নির্বাচিত খতিয়ান অপশন</span>
          <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-semibold">
            {activeLedgerOptions.length} টি
          </span>
        </div>
        <div className="space-y-0.5">
          {activeLedgerOptions.map((opt) => {
            const OptIcon = opt.icon;
            const isOptActive = subTab === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectSubItem(opt.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  opt.isAction
                    ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold my-1 shadow-2xs'
                    : isOptActive
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <OptIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      opt.isAction ? 'text-white' : isOptActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{opt.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Financial Snapshot Card */}
      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          মসজিদের সমন্বিত স্থিতি
        </span>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center space-x-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>নগদ ক্যাশ:</span>
            </span>
            <span className="font-mono font-bold text-slate-900">
              ৳ {totalCashInHand.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>ব্যাংক ও এমএফএস:</span>
            </span>
            <span className="font-mono font-bold text-slate-900">
              ৳ {totalBankBalance.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
            <span>সর্বমোট তহবিল:</span>
            <span className="font-mono text-blue-700">
              ৳ {grandTotalFunds.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 font-siliguri">
      {/* Mobile Drawer Trigger Bar (Visible only on small screens) */}
      <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-bold text-slate-900">
            {subModules.find((m) => m.id === activeSubModule)?.label}
          </span>
        </div>
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>মেনু ও অপশন</span>
        </button>
      </div>

      {/* Mobile Secondary Sidebar Modal Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">হিসাব ও লেনদেন মেনু</h2>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main 3-Column Architecture: Left Secondary Sidebar (Desktop) + Main Content */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Desktop Left Secondary Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs sticky top-4">
          {renderSidebarContent()}
        </aside>

        {/* Right Main Content Area (Level 3) */}
        <main className="flex-1 w-full min-w-0">
          {activeSubModule === 'dailyLedger' && (
            <DailyTransactionsView
              incomes={incomes}
              expenses={expenses}
              accounts={accounts}
              transfers={transfers}
              currentMosque={currentMosque}
              currentUser={currentUser}
              language={language}
              onUpdateOpeningBalance={onUpdateOpeningBalance}
              hideInternalSidebar={true}
              forcedSubTab={subTab}
              onSubTabChange={(t) => setSubTab(t)}
            />
          )}

          {activeSubModule === 'openingBalance' && (
            <OpeningBalanceView
              accounts={accounts}
              currentMosque={currentMosque}
              language={language}
              onUpdateOpeningBalance={onUpdateOpeningBalance}
              onNavigateToCashBank={() => handleSelectModule('cashbook')}
              hideInternalSidebar={true}
              forcedSubTab={subTab}
              onSubTabChange={(t) => setSubTab(t)}
            />
          )}

          {activeSubModule === 'cashbook' && (
            <CashBookView
              accounts={accounts}
              incomes={incomes}
              expenses={expenses}
              transfers={transfers}
              currentMosque={currentMosque}
              currentUser={currentUser}
              language={language}
              onNavigateToIncome={() => onNavigateTab && onNavigateTab('income')}
              onNavigateToExpense={() => onNavigateTab && onNavigateTab('expense')}
              hideInternalSidebar={true}
              forcedSubTab={subTab}
              onSubTabChange={(t) => setSubTab(t)}
            />
          )}

          {activeSubModule === 'bank' && (
            <BankBookView
              accounts={accounts}
              incomes={incomes}
              expenses={expenses}
              transfers={transfers}
              currentMosque={currentMosque}
              currentUser={currentUser}
              language={language}
              onAddAccount={onAddAccount}
              onUpdateAccount={onUpdateAccount}
              onTransferFund={onTransferFund}
              hideInternalSidebar={true}
              forcedSubTab={subTab}
              onSubTabChange={(t) => setSubTab(t)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  Receipt,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  RefreshCw,
  QrCode,
  Camera,
  Layers,
  Zap,
} from 'lucide-react';
import {
  DashboardStats,
  Mosque,
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  Donation,
  DonationBox,
  MosqueNotice,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  stats?: DashboardStats | null;
  mosque?: Mosque | null;
  currentMosque?: Mosque | null;
  accounts?: FinancialAccount[];
  incomes?: IncomeEntry[];
  expenses?: ExpenseEntry[];
  donations?: Donation[];
  donationBoxes?: DonationBox[];
  notices?: MosqueNotice[];
  language?: Language;
  onNavigate: (tab: NavTab) => void;
  onQuickAction?: (action: 'income' | 'expense' | 'donation') => void;
  onOpenAi?: () => void;
  onOpenScanner?: () => void;
  onOpenActionQrHub?: () => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  mosque,
  currentMosque: propCurrentMosque,
  accounts = [],
  incomes = [],
  expenses = [],
  donations = [],
  donationBoxes = [],
  notices = [],
  language = 'bn',
  onNavigate,
  onQuickAction,
  onOpenAi,
  onOpenScanner,
  onOpenActionQrHub,
  onRefresh,
}) => {
  const t = translations[language] || translations.bn;
  const activeMosque = propCurrentMosque || mosque || null;

  // Calculate live stats if not provided or to augment server stats
  const effectiveStats: DashboardStats = useMemo(() => {
    if (stats && stats.currentBalance !== undefined) {
      return stats;
    }

    // Dynamic derivation from state arrays
    const totalInc = incomes
      .filter((i) => i.status === 'APPROVED' || i.status === 'POSTED')
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const totalExp = expenses
      .filter((e) => e.status === 'APPROVED' || e.status === 'POSTED')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    let cashBal = 0;
    let bankBal = 0;

    accounts.forEach((acc) => {
      if (acc.type === 'CASH') {
        cashBal += acc.balance || 0;
      } else {
        bankBal += acc.balance || 0;
      }
    });

    const currBal = cashBal + bankBal;

    // Monthly calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyInc = incomes
      .filter((i) => {
        const d = new Date(i.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const monthlyExp = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Past 6 months trend
    const monthsNameBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const monthsNameEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend: { month: string; income: number; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = language === 'bn' ? monthsNameBn[m] : monthsNameEn[m];

      const mInc = incomes
        .filter((inc) => {
          const id = new Date(inc.date);
          return id.getFullYear() === y && id.getMonth() === m;
        })
        .reduce((sum, inc) => sum + (inc.amount || 0), 0);

      const mExp = expenses
        .filter((exp) => {
          const ed = new Date(exp.date);
          return ed.getFullYear() === y && ed.getMonth() === m;
        })
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      trend.push({ month: label, income: mInc, expense: mExp });
    }

    // Category distribution
    const categoryMap: Record<string, number> = {};
    incomes.forEach((inc) => {
      const name = inc.headName || 'সাধারণ অনুদান';
      categoryMap[name] = (categoryMap[name] || 0) + (inc.amount || 0);
    });

    const incomeCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalInc > 0 ? Math.round((amount / totalInc) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Recent transactions
    const combinedTx = [
      ...incomes.map((i) => ({
        id: i.id,
        voucherNumber: i.voucherNumber,
        date: i.date,
        type: 'INCOME' as const,
        headName: i.headName || 'আয়',
        accountName: i.accountName || 'তহবিল',
        amount: i.amount,
        status: i.status,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        voucherNumber: e.voucherNumber,
        date: e.date,
        type: 'EXPENSE' as const,
        headName: e.headName || 'ব্যয়',
        accountName: e.accountName || 'তহবিল',
        amount: e.amount,
        status: e.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      currentBalance: currBal,
      totalIncome: totalInc,
      totalExpense: totalExp,
      netBalance: totalInc - totalExp,
      cashBalance: cashBal,
      bankBalance: bankBal,
      monthlyIncome: monthlyInc,
      monthlyExpense: monthlyExp,
      recentTransactions: combinedTx,
      incomeCategories: incomeCategories.length > 0 ? incomeCategories : [
        { name: language === 'bn' ? 'সাধারণ অনুদান' : 'General Donation', amount: totalInc, percentage: 100 }
      ],
      monthlyTrend: trend,
    };
  }, [stats, incomes, expenses, accounts, language]);

  const handleAction = (act: 'income' | 'expense' | 'donation') => {
    if (onQuickAction) {
      onQuickAction(act);
    } else {
      if (act === 'income') onNavigate('income');
      else if (act === 'expense') onNavigate('expense');
      else if (act === 'donation') onNavigate('donations');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner / Mosque Header - Professional Polish Slate/Indigo Theme */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-50 text-blue-700 text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-blue-200/60 uppercase">
                {activeMosque?.waqfEstateName || 'Waqf Registered'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {activeMosque?.registrationNumber || 'EC-2024/0912'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight font-siliguri">
              {activeMosque?.nameBn || activeMosque?.name || 'মসজিদলেজার'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl font-baloo">
              {activeMosque?.address || 'বাংলাদেশ ওয়াকফ প্রশাসন অধিভুক্ত কেন্দ্রীয় হিসাব ব্যবস্থা'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Prominent Universal SCAN Button */}
            {onOpenScanner && (
              <button
                id="dash-btn-scan-qr"
                type="button"
                onClick={onOpenScanner}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold font-siliguri px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="QR ও বারকোড ক্যামেরা স্ক্যানার (Alt+Q)"
              >
                <Camera className="w-4 h-4 text-emerald-100 animate-pulse" />
                <span className="font-siliguri uppercase tracking-wider">{language === 'bn' ? '📷 স্ক্যান করুন' : '📷 SCAN'}</span>
              </button>
            )}

            <button
              id="dash-btn-add-income"
              type="button"
              onClick={() => handleAction('income')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold font-siliguri px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span className="font-siliguri">{t.addIncome}</span>
            </button>
            <button
              id="dash-btn-add-expense"
              type="button"
              onClick={() => handleAction('expense')}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold font-siliguri px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="font-siliguri">{t.addExpense}</span>
            </button>
            <button
              id="dash-btn-add-donation"
              type="button"
              onClick={() => handleAction('donation')}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-siliguri px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span className="font-siliguri">{t.addDonation}</span>
            </button>
            {onRefresh && (
              <button
                id="dash-btn-refresh"
                type="button"
                onClick={onRefresh}
                title="রিফ্রেশ করুন"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-siliguri transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Core Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Current Total Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 font-baloo">{t.currentBalance}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-taka">
            {formatCurrency(effectiveStats.currentBalance, language)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-baloo pt-2.5 border-t border-slate-100">
            <span>{t.cashBalance}:</span>
            <span className="font-bold text-slate-900 font-taka">{formatCurrency(effectiveStats.cashBalance, language)}</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 font-baloo">{t.totalIncome}</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-green-600 tracking-tight font-taka">
            {formatCurrency(effectiveStats.totalIncome, language)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-green-700 font-bold font-baloo pt-2.5 border-t border-slate-100">
            <span>↑ {language === 'bn' ? 'চলতি মাসে' : 'Monthly'}:</span>
            <span className="font-taka">{formatCurrency(effectiveStats.monthlyIncome, language)}</span>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 font-baloo">{t.totalExpense}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-rose-600 tracking-tight font-taka">
            {formatCurrency(effectiveStats.totalExpense, language)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-baloo pt-2.5 border-t border-slate-100">
            <span>{t.monthlyExpense}:</span>
            <span className="font-bold text-rose-600 font-taka">{formatCurrency(effectiveStats.monthlyExpense, language)}</span>
          </div>
        </div>

        {/* Bank & MFS Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 font-baloo">{t.bankBalance}</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-taka">
            {formatCurrency(effectiveStats.bankBalance, language)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-blue-700 font-bold font-baloo pt-2.5 border-t border-slate-100">
            <span>{t.netBalance}:</span>
            <span className="text-slate-900 font-taka">{formatCurrency(effectiveStats.netBalance, language)}</span>
          </div>
        </div>
      </div>

      {/* Universal Scan Center (Phase 4: One Scan → One Action) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-800 relative overflow-hidden font-siliguri">
        {/* Background decorative ambient circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Phase 4: One Scan → One Action</span>
              </span>
              <span className="text-xs text-slate-400">Universal Scan Hub</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-2">
              {language === 'bn' ? 'ইউনিভার্সাল স্ক্যান সেন্টার (QR & Barcode)' : 'Universal QR & Barcode Scan Center'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {language === 'bn'
                ? 'যেকোনো রশিদ, ভাউচার, সম্পদ ট্যাগ, ওয়াকফ দোকান বা মডিউল অ্যাকশন কিউআর স্ক্যান করুন। সিস্টেম সরাসরি সংশ্লিষ্ট ফর্ম বা স্মার্ট অ্যাকশন স্ক্রিন খুলবে।'
                : 'Scan any receipt, voucher, asset tag, waqf shop or module action QR. The system resolves the record and opens its contextual action screen instantly.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenScanner && (
              <button
                id="dash-scan-center-camera-btn"
                type="button"
                onClick={onOpenScanner}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-emerald-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{language === 'bn' ? 'ক্যামেরা স্ক্যানার চালু করুন' : 'Open Camera Scanner'}</span>
              </button>
            )}

            {onOpenActionQrHub && (
              <button
                id="dash-scan-center-hub-btn"
                type="button"
                onClick={onOpenActionQrHub}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-blue-300" />
                <span>{language === 'bn' ? 'অ্যাকশন কিউআর কার্ড' : 'Action QR Hub'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Scan Action Pills / Examples */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            onClick={onOpenScanner}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-xl cursor-pointer transition-all flex items-center space-x-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">{language === 'bn' ? 'দানবাক্স কালেকশন' : 'Donation Box'}</span>
              <span className="text-[10px] text-slate-400 font-mono">BOX-MAIN-01</span>
            </div>
          </div>

          <div
            onClick={onOpenScanner}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-xl cursor-pointer transition-all flex items-center space-x-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">{language === 'bn' ? 'ওয়াকফ দোকান ভাড়া' : 'Waqf Shop Rent'}</span>
              <span className="text-[10px] text-slate-400 font-mono">WPF-SHOP-01</span>
            </div>
          </div>

          <div
            onClick={onOpenScanner}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-xl cursor-pointer transition-all flex items-center space-x-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">{language === 'bn' ? 'সম্পদ সার্ভিসিং' : 'Asset Service'}</span>
              <span className="text-[10px] text-slate-400 font-mono">AST-GEN-01</span>
            </div>
          </div>

          <div
            onClick={onOpenScanner}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-2.5 rounded-xl cursor-pointer transition-all flex items-center space-x-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">{language === 'bn' ? 'স্টাফ বেতন পরিশোধ' : 'Staff Salary'}</span>
              <span className="text-[10px] text-slate-400 font-mono">STF-01</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Chart & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Income vs Expense Visual Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'মাসিক আয় বনাম ব্যয় বিশ্লেষণ' : 'Monthly Income vs Expense Trend'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn' ? 'বিগত ৬ মাসের তুলনামূলক চিত্র' : 'Past 6 months comparison'}
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600"></span>
                <span>{language === 'bn' ? 'আয়' : 'Income'}</span>
              </span>
              <span className="flex items-center space-x-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                <span>{language === 'bn' ? 'ব্যয়' : 'Expense'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {(effectiveStats.monthlyTrend || []).map((m, idx) => {
              const maxVal = Math.max(...(effectiveStats.monthlyTrend || []).map((t) => Math.max(t.income, t.expense)), 50000);
              const incPct = Math.min(100, Math.round((m.income / maxVal) * 100));
              const expPct = Math.min(100, Math.round((m.expense / maxVal) * 100));

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span className="font-semibold">{m.month}</span>
                    <div className="space-x-3">
                      <span className="text-blue-700 font-semibold">{formatCurrency(m.income, language)}</span>
                      <span className="text-rose-600 font-semibold">{formatCurrency(m.expense, language)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div className="w-full flex justify-end">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(incPct, 2)}%` }}
                      ></div>
                    </div>
                    <div className="w-full flex justify-start">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(expPct, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: AI Advisor Summary Card & Category Breakdown */}
        <div className="space-y-5">
          {/* AI Snapshot Card */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs relative">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{language === 'bn' ? 'এআই নিরীক্ষা পর্যালোচনা' : 'AI Audit Summary'}</span>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {language === 'bn'
                ? 'চলতি মাসে আয় ও ব্যয়ের অনুপাত সন্তোষজনক। তবে মসজিদ তহবিলের অতিরিক্ত নগদ অর্থ নিয়মিত ব্যাংক অ্যাকাউন্টে জমা রাখা জরুরি।'
                : 'Income vs Expense ratio is healthy this month. Keep excess cash deposited in the bank account regularly.'}
            </p>
            {onOpenAi && (
              <button
                id="dash-btn-ask-ai"
                type="button"
                onClick={onOpenAi}
                className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>{language === 'bn' ? 'বিস্তারিত অডিট রিপোর্ট জানুন' : 'Ask AI Auditor'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Income Category Distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              {language === 'bn' ? 'প্রধান আয়ের খাতসমূহ' : 'Top Income Heads'}
            </h2>
            <div className="space-y-3">
              {(effectiveStats.incomeCategories || []).slice(0, 4).map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{cat.name}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(cat.amount, language)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${cat.percentage || 25}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table - Professional Polish Table Design */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              {language === 'bn' ? 'সাম্প্রতিক ভাউচার ও কার্যক্রম' : 'Recent Activities'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'bn' ? 'অনুমোদিত ও পোস্টিংকৃত সর্বশেষ লেনদেন' : 'Latest posted transactions'}
            </p>
          </div>
          <button
            id="dash-btn-view-all-tx"
            type="button"
            onClick={() => onNavigate('income')}
            className="text-blue-600 text-xs font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {(!effectiveStats.recentTransactions || effectiveStats.recentTransactions.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {language === 'bn' ? 'কোন সাম্প্রতিক লেনদেন পাওয়া যায়নি' : 'No recent transactions found'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-100">{t.voucherNumber}</th>
                  <th className="px-6 py-3 border-b border-slate-100">{t.date}</th>
                  <th className="px-6 py-3 border-b border-slate-100">{language === 'bn' ? 'খাত ও বিবরণ' : 'Head'}</th>
                  <th className="px-6 py-3 border-b border-slate-100">{t.account}</th>
                  <th className="px-6 py-3 border-b border-slate-100 text-right">{t.amount}</th>
                  <th className="px-6 py-3 border-b border-slate-100 text-center">{t.status}</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                {effectiveStats.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 text-xs">
                      <span className="flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tx.type === 'INCOME' ? 'bg-green-500' : 'bg-rose-500'
                          }`}
                        ></span>
                        <span>{tx.voucherNumber}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{formatDate(tx.date, language)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 text-xs">{tx.headName}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{tx.accountName}</td>
                    <td
                      className={`px-6 py-4 text-right font-bold text-xs ${
                        tx.type === 'INCOME' ? 'text-green-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount, language)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.status === 'APPROVED' || (tx.status as string) === 'POSTED'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'PENDING'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {(t as any)[tx.status] || tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

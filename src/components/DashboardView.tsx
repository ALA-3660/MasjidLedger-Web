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
  RefreshCw
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

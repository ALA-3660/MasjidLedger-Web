import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  Clock as ClockIcon,
  RefreshCw,
  QrCode,
  Camera,
  Layers,
  Zap,
  Building,
  Smartphone,
  CheckCircle,
  Clock3,
  XCircle,
  Boxes,
  Repeat,
  BarChart3,
} from 'lucide-react';
import {
  DashboardStats,
  Mosque,
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  Donation,
  DonationBox,
  DonationBoxCollection,
  MosqueNotice,
  Staff,
  StaffPayment,
  CommitteeTerm,
  CommitteeMeeting,
  User,
  TransactionStatus,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { NavTab } from './Sidebar';
import { hasPermission } from '../lib/permissions';

export interface DashboardViewProps {
  stats?: DashboardStats | null;
  mosque?: Mosque | null;
  currentMosque?: Mosque | null;
  accounts?: FinancialAccount[];
  incomes?: IncomeEntry[];
  expenses?: ExpenseEntry[];
  donations?: Donation[];
  donationBoxes?: DonationBox[];
  boxCollections?: DonationBoxCollection[];
  staff?: Staff[];
  staffPayments?: StaffPayment[];
  terms?: CommitteeTerm[];
  meetings?: CommitteeMeeting[];
  notices?: MosqueNotice[];
  currentUser?: User | null;
  language?: Language;
  onNavigate: (tab: NavTab) => void;
  onQuickAction?: (action: 'income' | 'expense' | 'donation' | 'juma' | 'donationBox' | 'transfer' | 'report') => void;
  onOpenAi?: () => void;
  onOpenScanner?: () => void;
  onOpenActionQrHub?: () => void;
  onOpenJumaModal?: () => void;
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
  boxCollections = [],
  staff = [],
  staffPayments = [],
  terms = [],
  meetings = [],
  notices = [],
  currentUser,
  language = 'bn',
  onNavigate,
  onQuickAction,
  onOpenAi,
  onOpenScanner,
  onOpenActionQrHub,
  onOpenJumaModal,
  onRefresh,
}) => {
  const t = translations[language] || translations.bn;
  const activeMosque = propCurrentMosque || mosque || null;

  // Real-time live digital clock (BST / UTC+6) without any prayer calculation
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Bangladesh Time (BST)
  const timeFormatted = useMemo(() => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Dhaka',
      };
      return currentTime.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', options);
    } catch {
      return currentTime.toLocaleTimeString();
    }
  }, [currentTime, language]);

  const dateFormatted = useMemo(() => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Dhaka',
      };
      return currentTime.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', options);
    } catch {
      return currentTime.toLocaleDateString();
    }
  }, [currentTime, language]);

  // Derive authoritative financial totals from verified source records
  const effectiveStats = useMemo(() => {
    // 1. Incomes: ONLY APPROVED or POSTED are active posted income
    const validIncomes = (incomes || []).filter(
      (i) => (i?.status === 'APPROVED' || (i?.status as string) === 'POSTED') && i?.status !== 'CANCELLED'
    );
    const totalInc = validIncomes.reduce((sum, i) => sum + (Number(i?.amount) || 0), 0);

    // 2. Expenses: ONLY APPROVED or POSTED are active posted expense
    const validExpenses = (expenses || []).filter(
      (e) => (e?.status === 'APPROVED' || (e?.status as string) === 'POSTED') && e?.status !== 'CANCELLED'
    );
    const totalExp = validExpenses.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);

    // 3. Account Balances breakdown (Cash, Bank, MFS)
    let cashBal = 0;
    let bankBal = 0;
    let mfsBal = 0;
    let totalOpeningBal = 0;

    (accounts || []).forEach((acc) => {
      if (!acc) return;
      const balance = Number(acc.currentBalance ?? (acc as any).balance ?? 0);
      const opening = Number(acc.openingBalance || 0);
      totalOpeningBal += opening;

      const type = (acc.accountType || (acc as any).type || '').toUpperCase();
      if (type === 'CASH') {
        cashBal += balance;
      } else if (type === 'BANK') {
        bankBal += balance;
      } else if (type === 'MFS' || type === 'MOBILE_BANKING') {
        mfsBal += balance;
      } else {
        bankBal += balance;
      }
    });

    const currBal = (accounts && accounts.length > 0) ? (cashBal + bankBal + mfsBal) : (totalInc - totalExp);

    // 4. Current Month calculations (BST)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyInc = validIncomes
      .filter((i) => {
        if (!i?.date) return false;
        const d = new Date(i.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, i) => sum + (Number(i?.amount) || 0), 0);

    const monthlyExp = validExpenses
      .filter((e) => {
        if (!e?.date) return false;
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);

    // 5. Past 6 Months Trend
    const monthsNameBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const monthsNameEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend: { month: string; income: number; expense: number; net: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = language === 'bn' ? monthsNameBn[m] : monthsNameEn[m];

      const mInc = validIncomes
        .filter((inc) => {
          if (!inc?.date) return false;
          const id = new Date(inc.date);
          return id.getFullYear() === y && id.getMonth() === m;
        })
        .reduce((sum, inc) => sum + (Number(inc?.amount) || 0), 0);

      const mExp = validExpenses
        .filter((exp) => {
          if (!exp?.date) return false;
          const ed = new Date(exp.date);
          return ed.getFullYear() === y && ed.getMonth() === m;
        })
        .reduce((sum, exp) => sum + (Number(exp?.amount) || 0), 0);

      trend.push({ month: label, income: mInc, expense: mExp, net: mInc - mExp });
    }

    // 6. Top Income Categories
    const categoryMap: Record<string, number> = {};
    validIncomes.forEach((inc) => {
      const name = inc?.headName || (language === 'bn' ? 'সাধারণ অনুদান' : 'General Donation');
      categoryMap[name] = (categoryMap[name] || 0) + (Number(inc?.amount) || 0);
    });

    const incomeCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalInc > 0 ? Math.round((amount / totalInc) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // 7. Recent Transactions (Up to 8 practical records)
    const combinedTx = [
      ...(incomes || []).map((i) => ({
        id: i?.id || Math.random().toString(),
        voucherNumber: i?.voucherNumber || `INC-${String(i?.id || '').slice(0, 6)}`,
        date: i?.date || new Date().toISOString(),
        type: 'INCOME' as const,
        headName: i?.headName || (language === 'bn' ? 'আয়' : 'Income'),
        accountName: i?.accountName || (language === 'bn' ? 'সাধারণ তহবিল' : 'General Fund'),
        amount: Number(i?.amount) || 0,
        status: (i?.status || 'PENDING') as TransactionStatus,
      })),
      ...(expenses || []).map((e) => ({
        id: e?.id || Math.random().toString(),
        voucherNumber: e?.voucherNumber || `EXP-${String(e?.id || '').slice(0, 6)}`,
        date: e?.date || new Date().toISOString(),
        type: 'EXPENSE' as const,
        headName: e?.headName || (language === 'bn' ? 'ব্যয়' : 'Expense'),
        accountName: e?.accountName || (language === 'bn' ? 'সাধারণ তহবিল' : 'General Fund'),
        amount: Number(e?.amount) || 0,
        status: (e?.status || 'PENDING') as TransactionStatus,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return {
      currentBalance: currBal,
      totalOpeningBalance: totalOpeningBal,
      totalIncome: totalInc,
      totalExpense: totalExp,
      netBalance: totalInc - totalExp,
      cashBalance: cashBal,
      bankBalance: bankBal,
      mfsBalance: mfsBal,
      monthlyIncome: monthlyInc,
      monthlyExpense: monthlyExp,
      monthlyNet: monthlyInc - monthlyExp,
      recentTransactions: combinedTx,
      incomeCategories: incomeCategories.length > 0 ? incomeCategories : [
        { name: language === 'bn' ? 'সাধারণ অনুদান' : 'General Donation', amount: totalInc, percentage: 100 },
      ],
      monthlyTrend: trend,
    };
  }, [incomes, expenses, accounts, language]);

  // Actionable Reminders / Alert counts calculated from real state
  const remindersData = useMemo(() => {
    const pendingIncomes = (incomes || []).filter((i) => i?.status === 'PENDING');
    const pendingExpenses = (expenses || []).filter((e) => e?.status === 'PENDING');
    const pendingTotalCount = pendingIncomes.length + pendingExpenses.length;
    const pendingAmount =
      pendingIncomes.reduce((s, i) => s + (Number(i?.amount) || 0), 0) +
      pendingExpenses.reduce((s, e) => s + (Number(e?.amount) || 0), 0);

    const draftIncomes = (incomes || []).filter((i) => i?.status === 'DRAFT');
    const draftExpenses = (expenses || []).filter((e) => e?.status === 'DRAFT');
    const draftTotalCount = draftIncomes.length + draftExpenses.length;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const activeStaff = (staff || []).filter((s) => s?.status === 'ACTIVE');
    const paidStaffIds = new Set(
      (staffPayments || [])
        .filter((p) => p?.salaryMonth === currentMonthKey && p?.status === 'PAID')
        .map((p) => p.staffId)
    );
    const unpaidStaffList = activeStaff.filter((s) => !paidStaffIds.has(s.id));
    const unpaidStaffCount = unpaidStaffList.length;

    const activeDonationBoxes = (donationBoxes || []).filter((b) => b?.status === 'ACTIVE');
    const boxesPendingCount = activeDonationBoxes.filter((b) => {
      if (!b.lastCollectedDate) return true;
      const daysSince = (Date.now() - new Date(b.lastCollectedDate).getTime()) / (1000 * 3600 * 24);
      return daysSince > 30;
    }).length;

    const activeTerm = (terms || []).find((t) => t?.status === 'ACTIVE');
    let termExpiringDays: number | null = null;
    if (activeTerm?.endDate) {
      const end = new Date(activeTerm.endDate).getTime();
      const diff = Math.ceil((end - Date.now()) / (1000 * 3600 * 24));
      if (diff >= 0 && diff <= 60) {
        termExpiringDays = diff;
      }
    }

    const upcomingMeetings = (meetings || []).filter((m) => {
      if (!m?.date) return false;
      const mDate = new Date(m.date).getTime();
      return mDate >= Date.now() - 24 * 3600 * 1000 && m?.status === 'SCHEDULED';
    });

    const items: Array<{
      id: string;
      type: 'warning' | 'info' | 'urgent';
      title: string;
      description: string;
      actionText?: string;
      actionTab?: NavTab;
    }> = [];

    if (pendingTotalCount > 0) {
      items.push({
        id: 'rem-pending-vouchers',
        type: 'urgent',
        title: language === 'bn' ? `${pendingTotalCount}টি ভাউচার অনুমোদনের অপেক্ষায়` : `${pendingTotalCount} Vouchers Pending Approval`,
        description:
          language === 'bn'
            ? `মোট ${formatCurrency(pendingAmount, language)} টাকার লেনদেন অনুমোদন প্রয়োজন`
            : `Total ${formatCurrency(pendingAmount, language)} pending verification`,
        actionText: language === 'bn' ? 'অনুমোদন করুন' : 'Review',
        actionTab: 'income',
      });
    }

    if (draftTotalCount > 0) {
      items.push({
        id: 'rem-draft-vouchers',
        type: 'warning',
        title: language === 'bn' ? `${draftTotalCount}টি অপ্রকাশিত (Draft) ভাউচার` : `${draftTotalCount} Draft Vouchers`,
        description:
          language === 'bn'
            ? 'খসড়া ভাউচারগুলো পোস্ট বা নিশ্চিত করতে হবে'
            : 'Unposted draft transactions require confirmation',
        actionText: language === 'bn' ? 'ড্রাফট দেখুন' : 'View Drafts',
        actionTab: 'income',
      });
    }

    if (unpaidStaffCount > 0) {
      items.push({
        id: 'rem-unpaid-salary',
        type: 'info',
        title: language === 'bn' ? `চলতি মাসের স্টাফ বেতন বাকি (${unpaidStaffCount} জন)` : `Staff Salary Pending (${unpaidStaffCount} Staff)`,
        description:
          language === 'bn'
            ? `${now.toLocaleString('bn-BD', { month: 'long' })} মাসের বেতন বণ্টন সম্পন্ন করুন`
            : `Disburse salary for the current month`,
        actionText: language === 'bn' ? 'বেতন প্রদান' : 'Pay Salary',
        actionTab: 'staff',
      });
    }

    if (boxesPendingCount > 0) {
      items.push({
        id: 'rem-donation-box',
        type: 'info',
        title: language === 'bn' ? `${boxesPendingCount}টি দানবাক্স কালেকশন সময় হয়েছে` : `${boxesPendingCount} Donation Boxes Due`,
        description:
          language === 'bn'
            ? 'নিয়মিত দানবাক্স উন্মুক্ত করে ক্যাশে জমা করুন'
            : 'Open and record donation box collections',
        actionText: language === 'bn' ? 'দানবাক্স দেখুন' : 'View Boxes',
        actionTab: 'donationBox',
      });
    }

    if (termExpiringDays !== null) {
      items.push({
        id: 'rem-term-expiry',
        type: 'warning',
        title: language === 'bn' ? `কমিটির মেয়াদ সমাপ্তির পথে` : `Committee Term Expiring Soon`,
        description:
          language === 'bn'
            ? `বর্তমান কমিটির মেয়াদ শেষ হতে আর মাত্র ${termExpiringDays} দিন বাকি`
            : `Current committee term ends in ${termExpiringDays} days`,
        actionText: language === 'bn' ? 'কমিটি ব্যবস্থাপনা' : 'Committee',
        actionTab: 'committee',
      });
    }

    if (upcomingMeetings.length > 0) {
      items.push({
        id: 'rem-upcoming-meeting',
        type: 'info',
        title: language === 'bn' ? `আসন্ন কার্যকরী সভা (${upcomingMeetings.length}টি)` : `Upcoming Meeting (${upcomingMeetings.length})`,
        description:
          language === 'bn'
            ? `${upcomingMeetings[0]?.title || 'কমিটি সভা'} - তারিখ: ${formatDate(upcomingMeetings[0]?.date || '', language)}`
            : `${upcomingMeetings[0]?.title || 'Meeting'} on ${formatDate(upcomingMeetings[0]?.date || '', language)}`,
        actionText: language === 'bn' ? 'সভা বিবরণ' : 'View Meeting',
        actionTab: 'meetings',
      });
    }

    const postedIncomesCount = (incomes || []).filter(
      (i) => (i?.status === 'APPROVED' || (i?.status as string) === 'POSTED') && i?.status !== 'CANCELLED'
    ).length;
    const postedExpensesCount = (expenses || []).filter(
      (e) => (e?.status === 'APPROVED' || (e?.status as string) === 'POSTED') && e?.status !== 'CANCELLED'
    ).length;

    return {
      items,
      pendingCount: pendingTotalCount,
      draftCount: draftTotalCount,
      unpaidStaffCount,
      boxesPendingCount,
      completedCount: postedIncomesCount + postedExpensesCount,
    };
  }, [incomes, expenses, staff, staffPayments, donationBoxes, terms, meetings, language]);

  // Handle Quick Actions
  const handleAction = (act: 'income' | 'expense' | 'donation' | 'juma' | 'donationBox' | 'transfer' | 'report') => {
    if (onQuickAction) {
      onQuickAction(act);
    } else {
      if (act === 'income') onNavigate('income');
      else if (act === 'expense') onNavigate('expense');
      else if (act === 'donation') onNavigate('donations');
      else if (act === 'juma') {
        if (onOpenJumaModal) onOpenJumaModal();
        else onNavigate('income_juma');
      }
      else if (act === 'donationBox') onNavigate('donationBox');
      else if (act === 'transfer') onNavigate('bank');
      else if (act === 'report') onNavigate('reports');
    }
  };

  // Check RBAC permissions for current user (gracefully default to true if user session is not explicitly constrained)
  const canCreateIncome = !currentUser || hasPermission(currentUser, 'CREATE_INCOME');
  const canCreateExpense = !currentUser || hasPermission(currentUser, 'CREATE_EXPENSE');
  const canViewReports = !currentUser || hasPermission(currentUser, 'VIEW_REPORT');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-siliguri">
      {/* ========================================================================= */}
      {/* 1. HEADER: MOSQUE IDENTITY + BANGLADESH CLOCK (PURE FINANCIAL / ADMIN) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Mosque Identity Information */}
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-0.5 rounded-md border border-emerald-200/60 uppercase tracking-wide">
                {activeMosque?.waqfEstateName || (language === 'bn' ? 'ওয়াকফ এস্টেট নিবন্ধিত' : 'Waqf Registered')}
              </span>
              {activeMosque?.registrationNumber && (
                <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
                  নিবন্ধন নং: {activeMosque.registrationNumber}
                </span>
              )}
              {activeMosque?.establishedDate && (
                <span className="text-xs text-slate-500 font-medium">
                  • প্রতিষ্ঠিত: {activeMosque.establishedDate}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeMosque?.nameBn || activeMosque?.name || 'মসজিদলেজার প্রো'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 font-medium">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {[
                  activeMosque?.address,
                  activeMosque?.village,
                  activeMosque?.union,
                  activeMosque?.upazila,
                  activeMosque?.district,
                ]
                  .filter(Boolean)
                  .join(', ') || 'বাংলাদেশ ওয়াকফ প্রশাসন অধিভুক্ত কেন্দ্রীয় হিসাব ব্যবস্থা'}
              </span>
            </p>
          </div>

          {/* Simple Live Clock & Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4 shrink-0">
            {/* Clock Widget (BST / UTC+6) */}
            <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xs border border-slate-800 flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ClockIcon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-[150px]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base font-bold font-mono tracking-wider text-emerald-400">
                    {timeFormatted}
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                    BST
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                  {dateFormatted}
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <button
                id="dash-btn-refresh"
                type="button"
                onClick={onRefresh}
                title={language === 'bn' ? 'তথ্য রিফ্রেশ করুন' : 'Refresh Data'}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CRITICAL FINANCIAL ALERTS BANNER (IF ACTIVE) */}
      {/* ========================================================================= */}
      {effectiveStats.currentBalance < 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <h4 className="font-bold text-sm">
              {language === 'bn' ? '⚠️ সতর্কতা: বর্তমান মোট স্থিতি ঋণাত্মক' : '⚠️ Alert: Current Total Balance is Negative'}
            </h4>
            <p className="mt-0.5">
              {language === 'bn'
                ? `মসজিদ তহবিলের মোট বর্তমান স্থিতি ${formatCurrency(effectiveStats.currentBalance, language)}। অবিলম্বে তহবিল পুনঃসংস্থান ও অডিট যাচাই প্রয়োজন।`
                : `Total funds are in negative balance (${formatCurrency(effectiveStats.currentBalance, language)}). Immediate replenishment is required.`}
            </p>
          </div>
        </div>
      )}

      {effectiveStats.cashBalance < 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start space-x-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <h4 className="font-bold text-sm">
              {language === 'bn' ? '⚠️ সতর্কতা: নগদ ক্যাশ ব্যালেন্স ঋণাত্মক' : '⚠️ Warning: Cash Balance is Negative'}
            </h4>
            <p className="mt-0.5">
              {language === 'bn'
                ? `নগদ ক্যাশ ব্যালেন্স ${formatCurrency(effectiveStats.cashBalance, language)}। নগদ আয়ের হিসাব ও ক্যাশবই এন্ট্রি যাচাই করুন।`
                : `Cash balance is negative (${formatCurrency(effectiveStats.cashBalance, language)}). Verify cash book entries.`}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRIMARY FINANCIAL SUMMARY (AUTHORITATIVE ACCOUNTING METRICS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Current Total Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t.currentBalance}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              effectiveStats.currentBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${
            effectiveStats.currentBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {formatCurrency(effectiveStats.currentBalance, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
            <span>প্রারম্ভিক জের:</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(effectiveStats.totalOpeningBalance, language)}
            </span>
          </div>
        </div>

        {/* 2. Cash Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t.cashBalance}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              effectiveStats.cashBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${
            effectiveStats.cashBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {formatCurrency(effectiveStats.cashBalance, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
            <span>নগদ হিসাব সংখ্যা:</span>
            <span className="font-bold text-slate-800">
              {(accounts || []).filter((a) => (a?.accountType || (a as any)?.type) === 'CASH').length} টি
            </span>
          </div>
        </div>

        {/* 3. Bank Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t.bankBalance}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              effectiveStats.bankBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${
            effectiveStats.bankBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {formatCurrency(effectiveStats.bankBalance, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
            <span>সক্রিয় ব্যাংক হিসাব:</span>
            <span className="font-bold text-slate-800">
              {(accounts || []).filter((a) => (a?.accountType || (a as any)?.type) === 'BANK').length} টি
            </span>
          </div>
        </div>

        {/* 4. Mobile Banking (MFS) Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {language === 'bn' ? 'মোবাইল ব্যাংকিং (MFS)' : 'MFS Balance'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(effectiveStats.mfsBalance, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
            <span>বিকাশ/নগদ/রকেট:</span>
            <span className="font-bold text-slate-800">
              {(accounts || []).filter((a) => (a?.accountType || (a as any)?.type) === 'MFS').length > 0
                ? `${(accounts || []).filter((a) => (a?.accountType || (a as any)?.type) === 'MFS').length} টি সক্রিয়`
                : 'কনফিগার নেই'}
            </span>
          </div>
        </div>

        {/* 5. Total Income */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t.totalIncome}
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-green-600 tracking-tight">
            {formatCurrency(effectiveStats.totalIncome, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-green-700 font-bold pt-2.5 border-t border-slate-100">
            <span>↑ চলতি মাসে আয়:</span>
            <span>{formatCurrency(effectiveStats.monthlyIncome, language)}</span>
          </div>
        </div>

        {/* 6. Total Expense */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t.totalExpense}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
            {formatCurrency(effectiveStats.totalExpense, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-rose-700 font-bold pt-2.5 border-t border-slate-100">
            <span>↓ চলতি মাসে ব্যয়:</span>
            <span>{formatCurrency(effectiveStats.monthlyExpense, language)}</span>
          </div>
        </div>

        {/* 7. Net Surplus / Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {language === 'bn' ? 'মোট উদ্বৃত্ত / নিট ব্যালেন্স' : 'Net Surplus / Balance'}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              effectiveStats.netBalance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${
            effectiveStats.netBalance >= 0 ? 'text-indigo-700' : 'text-rose-600'
          }`}>
            {formatCurrency(effectiveStats.netBalance, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
            <span>সর্বমোট আয় - ব্যয়:</span>
            <span className={`font-bold ${effectiveStats.netBalance >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
              {effectiveStats.netBalance >= 0 ? '+উদ্বৃত্ত' : '-ঘাটতি'}
            </span>
          </div>
        </div>

        {/* 8. Current Month Net Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {language === 'bn' ? 'চলতি মাসের নিট অবস্থান' : 'Monthly Net Surplus'}
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              effectiveStats.monthlyNet >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${
            effectiveStats.monthlyNet >= 0 ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {effectiveStats.monthlyNet >= 0 ? '+' : ''}
            {formatCurrency(effectiveStats.monthlyNet, language)}
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
            <span>চলতি মাস স্থিতি:</span>
            <span className={`font-bold ${effectiveStats.monthlyNet >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {effectiveStats.monthlyNet >= 0 ? 'মাসিক উদ্বৃত্ত' : 'মাসিক ঘাটতি'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. QUICK FINANCIAL ACTIONS (RBAC ENFORCED) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {language === 'bn' ? 'দ্রুত আর্থিক কার্যক্রম' : 'Quick Financial Actions'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn' ? 'দৈনন্দিন আয়, ব্যয়, কালেকশন ও রিপোর্ট শর্টকাট' : 'Daily accounting entry & collection shortcuts'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Action 1: New Income */}
          {canCreateIncome && (
            <button
              id="dash-btn-quick-income"
              type="button"
              onClick={() => handleAction('income')}
              className="group p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 group-hover:bg-white/20 text-blue-700 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
                নতুন আয়
              </span>
            </button>
          )}

          {/* Action 2: New Expense */}
          {canCreateExpense && (
            <button
              id="dash-btn-quick-expense"
              type="button"
              onClick={() => handleAction('expense')}
              className="group p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-rose-100 group-hover:bg-white/20 text-rose-700 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
                নতুন ব্যয়
              </span>
            </button>
          )}

          {/* Action 3: Donation */}
          <button
            id="dash-btn-quick-donation"
            type="button"
            onClick={() => handleAction('donation')}
            className="group p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 group-hover:bg-white/20 text-emerald-700 group-hover:text-white flex items-center justify-center transition-colors">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
              অনুদান গ্রহণ
            </span>
          </button>

          {/* Action 4: Juma Collection */}
          <button
            id="dash-btn-quick-juma"
            type="button"
            onClick={() => handleAction('juma')}
            className="group p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-100 group-hover:bg-white/20 text-indigo-700 group-hover:text-white flex items-center justify-center transition-colors">
              <Building className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
              জুমার কালেকশন
            </span>
          </button>

          {/* Action 5: Donation Box */}
          <button
            id="dash-btn-quick-box"
            type="button"
            onClick={() => handleAction('donationBox')}
            className="group p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-600 hover:border-amber-600 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 group-hover:bg-white/20 text-amber-700 group-hover:text-white flex items-center justify-center transition-colors">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
              দানবাক্স কালেকশন
            </span>
          </button>

          {/* Action 6: Bank/Cash Transfer */}
          <button
            id="dash-btn-quick-transfer"
            type="button"
            onClick={() => handleAction('transfer')}
            className="group p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-600 hover:border-purple-600 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-100 group-hover:bg-white/20 text-purple-700 group-hover:text-white flex items-center justify-center transition-colors">
              <Repeat className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
              তহবিল স্থানান্তর
            </span>
          </button>

          {/* Action 7: Report Center */}
          {canViewReports && (
            <button
              id="dash-btn-quick-report"
              type="button"
              onClick={() => handleAction('report')}
              className="group p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-900 hover:border-slate-900 hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-200 group-hover:bg-white/20 text-slate-700 group-hover:text-white flex items-center justify-center transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-white mt-2">
                রিপোর্ট সেন্টার
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ACTIONABLE REMINDERS & WORK PROGRESS (কাজের অগ্রগতি ও তাগিদ) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Actionable Reminders / Alerts */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {language === 'bn' ? 'জরুরি তাগিদ ও নোটিফিকেশন' : 'Important Actionable Reminders'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'আজকের জন্য করণীয় ও প্রশাসনিক তাগিদ' : 'Tasks requiring immediate attention'}
                  </p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {remindersData.items.length} টি সক্রিয়
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {remindersData.items.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/75 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {language === 'bn' ? 'এই মুহূর্তে কোনো জরুরি কাজ নেই।' : 'No urgent reminders at this time.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'bn' ? 'সকল লেনদেন ও প্রশাসনিক কার্যক্রম আপ-টু-ডেট আছে' : 'All transactions and items are up to date'}
                  </p>
                </div>
              ) : (
                remindersData.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                      item.type === 'urgent'
                        ? 'bg-rose-50/60 border-rose-200/80 text-rose-900'
                        : item.type === 'warning'
                        ? 'bg-amber-50/60 border-amber-200/80 text-amber-900'
                        : 'bg-blue-50/60 border-blue-200/80 text-blue-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold">{item.title}</h4>
                      <p className="text-[11px] mt-0.5 opacity-90">{item.description}</p>
                    </div>

                    {item.actionText && item.actionTab && (
                      <button
                        type="button"
                        onClick={() => onNavigate(item.actionTab!)}
                        className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-white shadow-2xs border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-slate-800 flex items-center space-x-1"
                      >
                        <span>{item.actionText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Work Progress (কাজের অগ্রগতি) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {language === 'bn' ? 'কাজের অগ্রগতি ও স্ট্যাটাস' : 'Work Progress Status'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'আজ কী করা দরকার? কোন কাজ বাকি?' : 'Task execution & completion overview'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Pending */}
              <div className="bg-amber-50/80 border border-amber-200/60 p-3.5 rounded-xl">
                <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>অপেক্ষমাণ</span>
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-extrabold text-amber-900">
                  {remindersData.pendingCount}
                </div>
                <p className="text-[10px] text-amber-700 mt-1">ভাউচার অনুমোদন</p>
              </div>

              {/* 2. In Progress / Draft */}
              <div className="bg-blue-50/80 border border-blue-200/60 p-3.5 rounded-xl">
                <div className="flex items-center space-x-1.5 text-blue-800 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>চলমান/ড্রাফট</span>
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-extrabold text-blue-900">
                  {remindersData.draftCount}
                </div>
                <p className="text-[10px] text-blue-700 mt-1">খসড়া ভাউচার</p>
              </div>

              {/* 3. Completed */}
              <div className="bg-emerald-50/80 border border-emerald-200/60 p-3.5 rounded-xl">
                <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>সম্পন্ন</span>
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-900">
                  {remindersData.completedCount}
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">পোস্টেড লেনদেন</p>
              </div>

              {/* 4. Overdue / Due */}
              <div className="bg-rose-50/80 border border-rose-200/60 p-3.5 rounded-xl">
                <div className="flex items-center space-x-1.5 text-rose-800 text-xs font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>বকেয়া</span>
                </div>
                <div className="mt-2 text-xl sm:text-2xl font-extrabold text-rose-900">
                  {remindersData.unpaidStaffCount}
                </div>
                <p className="text-[10px] text-rose-700 mt-1">স্টাফ বেতন বাকি</p>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between items-center font-bold">
                <span>লেনদেন সম্পন্নতার অনুপাত</span>
                <span>
                  {remindersData.completedCount + remindersData.pendingCount > 0
                    ? Math.round(
                        (remindersData.completedCount /
                          (remindersData.completedCount + remindersData.pendingCount)) *
                          100
                      )
                    : 100}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      remindersData.completedCount + remindersData.pendingCount > 0
                        ? Math.round(
                            (remindersData.completedCount /
                              (remindersData.completedCount + remindersData.pendingCount)) *
                              100
                          )
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MONTHLY INCOME VS EXPENSE & AI AUDITOR INSIGHT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 6 Months Income vs Expense Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {language === 'bn' ? 'মাসিক আয় বনাম ব্যয় বিশ্লেষণ' : 'Monthly Income vs Expense Trend'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn' ? 'বিগত ৬ মাসের আর্থিক তুলনা ও নিট হিসাব' : 'Past 6 months comparison'}
              </p>
            </div>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1.5 text-blue-700">
                <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block"></span>
                <span>{language === 'bn' ? 'আয়' : 'Income'}</span>
              </span>
              <span className="flex items-center space-x-1.5 text-rose-600">
                <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
                <span>{language === 'bn' ? 'ব্যয়' : 'Expense'}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {(effectiveStats.monthlyTrend || []).map((m, idx) => {
              const maxVal = Math.max(
                ...(effectiveStats.monthlyTrend || []).map((t) => Math.max(t.income, t.expense)),
                50000
              );
              const incPct = Math.min(100, Math.round((m.income / maxVal) * 100));
              const expPct = Math.min(100, Math.round((m.expense / maxVal) * 100));

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span className="font-bold text-slate-900 w-12">{m.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-blue-700 font-bold">
                        আয়: {formatCurrency(m.income, language)}
                      </span>
                      <span className="text-rose-600 font-bold">
                        ব্যয়: {formatCurrency(m.expense, language)}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          m.net >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {m.net >= 0 ? '+' : ''}
                        {formatCurrency(m.net, language)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div className="w-full flex justify-end">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(incPct, 2)}%` }}
                        title={`আয়: ${m.income}`}
                      ></div>
                    </div>
                    <div className="w-full flex justify-start">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(expPct, 2)}%` }}
                        title={`ব্যয়: ${m.expense}`}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: AI Auditor Insights & Top Income Heads */}
        <div className="space-y-5">
          {/* AI Auditor Summary Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs relative overflow-hidden border border-slate-800">
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'এআই নিরীক্ষা ও পর্যবেক্ষণ' : 'AI Financial Insights'}</span>
            </div>

            <div className="mt-3 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                {effectiveStats.cashBalance > 50000 && effectiveStats.cashBalance > effectiveStats.bankBalance
                  ? '⚠️ নগদ ক্যাশ ব্যালেন্সের পরিমাণ তুলনামূলক বেশি। নিরাপত্তার স্বার্থে উদ্বৃত্ত অর্থ নিয়মিত ব্যাংক হিসাবে স্থানান্তর করা সুপারিশযোগ্য।'
                  : '✅ আয় ও ব্যয়ের অনুপাত সন্তোষজনক। তহবিল স্থিতি যথারীতি সমন্বিত আছে।'}
              </p>
              {remindersData.pendingCount > 0 && (
                <p className="text-amber-300 font-medium">
                  • {remindersData.pendingCount}টি অনিষ্পন্ন ভাউচার রয়েছে যা দ্রুত অনুমোদন প্রয়োজন।
                </p>
              )}
            </div>

            {onOpenAi && (
              <button
                id="dash-btn-ask-ai"
                type="button"
                onClick={onOpenAi}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>{language === 'bn' ? 'বিস্তারিত অডিট বিশ্লেষণ জানুন' : 'Open AI Auditor'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Top Income Heads */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {language === 'bn' ? 'প্রধান আয়ের খাতসমূহ' : 'Top Income Heads'}
            </h3>
            <div className="space-y-3">
              {(effectiveStats.incomeCategories || []).slice(0, 4).map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-semibold truncate max-w-[150px]">
                      {cat.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(cat.amount, language)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${cat.percentage || 25}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. RECENT FINANCIAL TRANSACTIONS TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {language === 'bn' ? 'সাম্প্রতিক ভাউচার ও আর্থিক কার্যক্রম' : 'Recent Vouchers & Activities'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'bn' ? 'অনুমোদিত, ড্রাফট ও সর্বশেষ লেনদেনের তালিকা' : 'Latest posted & pending transactions'}
            </p>
          </div>
          <button
            id="dash-btn-view-all-tx"
            type="button"
            onClick={() => onNavigate('income')}
            className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center space-x-1 cursor-pointer"
          >
            <span>{language === 'bn' ? 'সব দেখুন' : 'View All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {(!effectiveStats.recentTransactions || effectiveStats.recentTransactions.length === 0) ? (
            <div className="p-10 text-center text-slate-400 text-xs">
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
              <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
                {effectiveStats.recentTransactions.map((tx) => {
                  const isCancelled = tx.status === 'CANCELLED';
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/75 transition-colors ${
                        isCancelled ? 'opacity-50 line-through bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        <span className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCancelled
                                ? 'bg-slate-400'
                                : tx.type === 'INCOME'
                                ? 'bg-green-500'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          <span>{tx.voucherNumber}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{formatDate(tx.date, language)}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">{tx.headName}</td>
                      <td className="px-6 py-3.5 text-slate-600">{tx.accountName}</td>
                      <td
                        className={`px-6 py-3.5 text-right font-bold ${
                          isCancelled
                            ? 'text-slate-500'
                            : tx.type === 'INCOME'
                            ? 'text-green-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount, language)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isCancelled
                              ? 'bg-slate-200 text-slate-700'
                              : tx.status === 'APPROVED' || (tx.status as string) === 'POSTED'
                              ? 'bg-green-100 text-green-700'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isCancelled
                            ? (language === 'bn' ? 'বাতিল' : 'Cancelled')
                            : tx.status === 'APPROVED' || (tx.status as string) === 'POSTED'
                            ? (language === 'bn' ? 'অনুমোদিত' : 'Approved')
                            : tx.status === 'PENDING'
                            ? (language === 'bn' ? 'অপেক্ষমাণ' : 'Pending')
                            : tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. SECONDARY UTILITY: UNIVERSAL SCAN HUB */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xs border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'bn' ? 'ইউনিভার্সাল স্ক্যান হাব (QR & Barcode)' : 'Universal Scan Hub'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'রশিদ, ভাউচার, দানবাক্স বা সম্পদ কিউআর সরাসরি স্ক্যান করুন'
                  : 'Quick camera scan for receipts, donation boxes & asset tags'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenScanner && (
              <button
                id="dash-scan-center-camera-btn"
                type="button"
                onClick={onOpenScanner}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{language === 'bn' ? 'ক্যামেরা স্ক্যানার' : 'Camera Scanner'}</span>
              </button>
            )}

            {onOpenActionQrHub && (
              <button
                id="dash-scan-center-hub-btn"
                type="button"
                onClick={onOpenActionQrHub}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-blue-300" />
                <span>{language === 'bn' ? 'অ্যাকশন কিউআর' : 'Action QR'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

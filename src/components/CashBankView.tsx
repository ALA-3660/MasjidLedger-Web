import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Landmark,
  Layers,
  Plus,
  ArrowRightLeft,
  Building,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Search,
  RotateCcw,
  Shield,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { FinancialAccount, AccountHead, IncomeEntry, ExpenseEntry, Mosque } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

interface CashBankViewProps {
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  currentMosque?: Mosque | null;
  language?: Language;
  onAddAccount: (data: any) => Promise<void>;
  onAddAccountHead: (data: any) => Promise<void>;
  onTransferFund?: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
}

export const CashBankView: React.FC<CashBankViewProps> = ({
  accounts,
  accountHeads,
  incomes,
  expenses,
  currentMosque,
  language = 'bn',
  onAddAccount,
  onAddAccountHead,
  onTransferFund,
}) => {
  const t = translations[language] || translations.bn;
  const [activeTab, setActiveTab] = useState<'cashbook' | 'bankbook' | 'banks' | 'heads'>('cashbook');
  
  // Selected Bank for Bankbook
  const bankAccountsList = useMemo(() => {
    return accounts.filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS');
  }, [accounts]);

  const [selectedBankId, setSelectedBankId] = useState(
    bankAccountsList[0]?.id || accounts[0]?.id || ''
  );

  // Cashbook Filters & Print Modal
  const [cashSearchTerm, setCashSearchTerm] = useState('');
  const [cashFilterDateFrom, setCashFilterDateFrom] = useState('');
  const [cashFilterDateTo, setCashFilterDateTo] = useState('');
  const [cashFilterType, setCashFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [isPrintCashbookOpen, setIsPrintCashbookOpen] = useState(false);

  // Bankbook Filters & Print Modal
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const [bankFilterDateFrom, setBankFilterDateFrom] = useState('');
  const [bankFilterDateTo, setBankFilterDateTo] = useState('');
  const [bankFilterType, setBankFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [isPrintBankbookOpen, setIsPrintBankbookOpen] = useState(false);

  // New Account Modal
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [accNameBn, setAccNameBn] = useState('');
  const [accType, setAccType] = useState<FinancialAccount['accountType']>('BANK');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Transfer / Contra Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccId, setFromAccId] = useState(accounts[0]?.id || '');
  const [toAccId, setToAccId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferRef, setTransferRef] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // New Account Head Modal
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [headNameBn, setHeadNameBn] = useState('');
  const [headType, setHeadType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [headParentId, setHeadParentId] = useState('');

  // ===================== CASHBOOK CALCULATIONS =====================
  const cashAccounts = useMemo(() => accounts.filter((a) => a.accountType === 'CASH'), [accounts]);
  const cashAccountIds = useMemo(() => cashAccounts.map((a) => a.id), [cashAccounts]);
  const totalCashOpeningBalance = useMemo(
    () => cashAccounts.reduce((s, a) => s + (a.openingBalance || 0), 0),
    [cashAccounts]
  );
  const currentTotalCashBalance = useMemo(
    () => cashAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0),
    [cashAccounts]
  );

  // All Cash transactions sorted chronologically (oldest to newest)
  const allCashTxChronological = useMemo(() => {
    return [
      ...incomes
        .filter((i) => cashAccountIds.includes(i.accountId) && i.status === 'APPROVED')
        .map((i) => ({
          id: i.id,
          date: i.date,
          voucherNumber: i.voucherNumber || `INC-${i.id.slice(0, 6)}`,
          type: 'INCOME' as const,
          particulars: i.subHeadNameBn || i.mainHeadNameBn || 'নগদ জমা',
          party: i.donorName || 'সাধারণ দান',
          reference: i.reference || '',
          amount: i.amount || 0,
        })),
      ...expenses
        .filter((e) => cashAccountIds.includes(e.accountId) && e.status === 'APPROVED')
        .map((e) => ({
          id: e.id,
          date: e.date,
          voucherNumber: e.voucherNumber || `EXP-${e.id.slice(0, 6)}`,
          type: 'EXPENSE' as const,
          particulars: e.subHeadNameBn || e.mainHeadNameBn || 'নগদ খরচ',
          party: e.payeeName || 'বিবিধ খরচ',
          reference: e.reference || '',
          amount: e.amount || 0,
        })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomes, expenses, cashAccountIds]);

  // Cash Opening Balance for the filtered period
  const cashPeriodOpeningBalance = useMemo(() => {
    if (!cashFilterDateFrom) return totalCashOpeningBalance;
    const priorIncomes = allCashTxChronological
      .filter((t) => t.date < cashFilterDateFrom && t.type === 'INCOME')
      .reduce((s, t) => s + t.amount, 0);
    const priorExpenses = allCashTxChronological
      .filter((t) => t.date < cashFilterDateFrom && t.type === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0);
    return totalCashOpeningBalance + priorIncomes - priorExpenses;
  }, [allCashTxChronological, cashFilterDateFrom, totalCashOpeningBalance]);

  // Filtered Cash transactions with running balance
  const filteredCashTxWithBalance = useMemo(() => {
    let running = cashPeriodOpeningBalance;
    const filtered: Array<(typeof allCashTxChronological)[0] & { runningBalance: number }> = [];

    allCashTxChronological.forEach((tx) => {
      const matchDateFrom = !cashFilterDateFrom || tx.date >= cashFilterDateFrom;
      const matchDateTo = !cashFilterDateTo || tx.date <= cashFilterDateTo;
      const matchType = cashFilterType === 'ALL' || tx.type === cashFilterType;

      const q = cashSearchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.voucherNumber.toLowerCase().includes(q) ||
        tx.particulars.toLowerCase().includes(q) ||
        tx.party.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q);

      if (matchDateFrom && matchDateTo) {
        if (tx.type === 'INCOME') running += tx.amount;
        else running -= tx.amount;

        if (matchType && matchSearch) {
          filtered.push({ ...tx, runningBalance: running });
        }
      }
    });

    return filtered;
  }, [
    allCashTxChronological,
    cashPeriodOpeningBalance,
    cashFilterDateFrom,
    cashFilterDateTo,
    cashFilterType,
    cashSearchTerm,
  ]);

  const cashFilteredTotalInflow = useMemo(
    () => filteredCashTxWithBalance.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
    [filteredCashTxWithBalance]
  );
  const cashFilteredTotalOutflow = useMemo(
    () => filteredCashTxWithBalance.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    [filteredCashTxWithBalance]
  );
  const cashFilteredClosingBalance = useMemo(() => {
    return cashPeriodOpeningBalance + cashFilteredTotalInflow - cashFilteredTotalOutflow;
  }, [cashPeriodOpeningBalance, cashFilteredTotalInflow, cashFilteredTotalOutflow]);

  // Screen display list for Cashbook (sorted latest first)
  const cashScreenTxList = useMemo(() => {
    return [...filteredCashTxWithBalance].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredCashTxWithBalance]);

  // ===================== BANKBOOK CALCULATIONS =====================
  const selectedBankAccount = useMemo(() => {
    return (
      accounts.find((a) => a.id === selectedBankId) ||
      accounts.find((a) => a.accountType === 'BANK' || a.accountType === 'MFS') ||
      accounts[0]
    );
  }, [accounts, selectedBankId]);

  const selectedBankOpeningBalance = selectedBankAccount?.openingBalance || 0;

  // All Bank transactions for the selected account (sorted chronologically)
  const allBankTxChronological = useMemo(() => {
    if (!selectedBankAccount) return [];
    return [
      ...incomes
        .filter((i) => i.accountId === selectedBankAccount.id && i.status === 'APPROVED')
        .map((i) => ({
          id: i.id,
          date: i.date,
          voucherNumber: i.voucherNumber || `INC-${i.id.slice(0, 6)}`,
          type: 'INCOME' as const,
          particulars: i.subHeadNameBn || i.mainHeadNameBn || 'ব্যাংক জমা',
          party: i.donorName || 'অনলাইন/ব্যাংক দান',
          reference: i.reference || '',
          amount: i.amount || 0,
        })),
      ...expenses
        .filter((e) => e.accountId === selectedBankAccount.id && e.status === 'APPROVED')
        .map((e) => ({
          id: e.id,
          date: e.date,
          voucherNumber: e.voucherNumber || `EXP-${e.id.slice(0, 6)}`,
          type: 'EXPENSE' as const,
          particulars: e.subHeadNameBn || e.mainHeadNameBn || 'ব্যাংক খরচ',
          party: e.payeeName || 'বিবিধ ব্যাংক খরচ',
          reference: e.reference || '',
          amount: e.amount || 0,
        })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [incomes, expenses, selectedBankAccount]);

  // Bank Opening Balance for the filtered period
  const bankPeriodOpeningBalance = useMemo(() => {
    if (!bankFilterDateFrom) return selectedBankOpeningBalance;
    const priorIncomes = allBankTxChronological
      .filter((t) => t.date < bankFilterDateFrom && t.type === 'INCOME')
      .reduce((s, t) => s + t.amount, 0);
    const priorExpenses = allBankTxChronological
      .filter((t) => t.date < bankFilterDateFrom && t.type === 'EXPENSE')
      .reduce((s, t) => s + t.amount, 0);
    return selectedBankOpeningBalance + priorIncomes - priorExpenses;
  }, [allBankTxChronological, bankFilterDateFrom, selectedBankOpeningBalance]);

  // Filtered Bank transactions with running balance
  const filteredBankTxWithBalance = useMemo(() => {
    let running = bankPeriodOpeningBalance;
    const filtered: Array<(typeof allBankTxChronological)[0] & { runningBalance: number }> = [];

    allBankTxChronological.forEach((tx) => {
      const matchDateFrom = !bankFilterDateFrom || tx.date >= bankFilterDateFrom;
      const matchDateTo = !bankFilterDateTo || tx.date <= bankFilterDateTo;
      const matchType = bankFilterType === 'ALL' || tx.type === bankFilterType;

      const q = bankSearchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.voucherNumber.toLowerCase().includes(q) ||
        tx.particulars.toLowerCase().includes(q) ||
        tx.party.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q);

      if (matchDateFrom && matchDateTo) {
        if (tx.type === 'INCOME') running += tx.amount;
        else running -= tx.amount;

        if (matchType && matchSearch) {
          filtered.push({ ...tx, runningBalance: running });
        }
      }
    });

    return filtered;
  }, [
    allBankTxChronological,
    bankPeriodOpeningBalance,
    bankFilterDateFrom,
    bankFilterDateTo,
    bankFilterType,
    bankSearchTerm,
  ]);

  const bankFilteredTotalDeposit = useMemo(
    () => filteredBankTxWithBalance.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
    [filteredBankTxWithBalance]
  );
  const bankFilteredTotalWithdrawal = useMemo(
    () => filteredBankTxWithBalance.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    [filteredBankTxWithBalance]
  );
  const bankFilteredClosingBalance = useMemo(() => {
    return bankPeriodOpeningBalance + bankFilteredTotalDeposit - bankFilteredTotalWithdrawal;
  }, [bankPeriodOpeningBalance, bankFilteredTotalDeposit, bankFilteredTotalWithdrawal]);

  // Screen display list for Bankbook (sorted latest first)
  const bankScreenTxList = useMemo(() => {
    return [...filteredBankTxWithBalance].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredBankTxWithBalance]);

  // Handlers
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accNameBn) return;
    try {
      await onAddAccount({
        nameBn: accNameBn,
        accountType: accType,
        bankName,
        branchName,
        accountNumber,
        openingBalance: Number(openingBalance) || 0,
      });
      setIsAccModalOpen(false);
      setAccNameBn('');
      setBankName('');
      setBranchName('');
      setAccountNumber('');
      setOpeningBalance('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(transferAmount);
    if (!num || num <= 0 || fromAccId === toAccId) {
      alert('সঠিক অ্যাকাউন্ট ও টাকার পরিমাণ নির্বাচন করুন');
      return;
    }

    if (onTransferFund) {
      setIsSubmittingTransfer(true);
      try {
        await onTransferFund({
          fromAccountId: fromAccId,
          toAccountId: toAccId,
          amount: num,
          date: transferDate,
          reference: transferRef,
          notes: transferNotes,
        });
        setIsTransferModalOpen(false);
        setTransferAmount('');
        setTransferRef('');
        setTransferNotes('');
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmittingTransfer(false);
      }
    }
  };

  const handleHeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headNameBn) return;
    try {
      await onAddAccountHead({
        nameBn: headNameBn,
        type: headType,
        parentId: headParentId || null,
      });
      setIsHeadModalOpen(false);
      setHeadNameBn('');
      setHeadParentId('');
    } catch (err) {
      console.error(err);
    }
  };

  const mainHeads = accountHeads.filter((h) => !h.parentId);
  const isAnyPrintOpen = isPrintCashbookOpen || isPrintBankbookOpen;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Main Screen Content (Hidden when printing any report modal) */}
      <div className={isAnyPrintOpen ? 'space-y-5 print:hidden' : 'space-y-5'}>
        {/* Top Header & Sub-tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('cashbook')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'cashbook'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>নগদ ক্যাশ বই (Cashbook)</span>
            </button>

            <button
              onClick={() => setActiveTab('bankbook')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'bankbook'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ব্যাংক খতিয়ান (Bankbook)</span>
            </button>

            <button
              onClick={() => setActiveTab('banks')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'banks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>ব্যাংক ও তহবিল হিসাব তালিকা</span>
              <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {accounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('heads')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'heads'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>আয়-ব্যয়ের হিসাব খাত (COA)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {onTransferFund && (
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                <span>তহবিল স্থানান্তর / কন্ট্রা</span>
              </button>
            )}

            {activeTab === 'cashbook' && (
              <button
                onClick={() => setIsPrintCashbookOpen(true)}
                className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>ক্যাশ বই রিপোর্ট প্রিন্ট</span>
              </button>
            )}

            {activeTab === 'bankbook' && (
              <button
                onClick={() => setIsPrintBankbookOpen(true)}
                className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>ব্যাংক খতিয়ান প্রিন্ট</span>
              </button>
            )}

            {activeTab === 'banks' && (
              <button
                onClick={() => setIsAccModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন ব্যাংক/হিসাব যোগ</span>
              </button>
            )}

            {activeTab === 'heads' && (
              <button
                onClick={() => setIsHeadModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন খাত (Head) যোগ</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------- 1. CASHBOOK TAB ---------------- */}
        {activeTab === 'cashbook' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  ক্যাশ ইন হ্যান্ড (বর্তমান স্থিতি)
                </span>
                <div className="text-xl sm:text-2xl font-black text-blue-700 mt-2 font-mono">
                  {formatCurrency(currentTotalCashBalance, language)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {cashAccounts.length} টি ক্যাশ তহবিল হিসাব
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  নির্বাচিত সময়ে মোট জমা (Debit)
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2 font-mono">
                  {formatCurrency(cashFilteredTotalInflow, language)}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center">
                  <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                  মোট {filteredCashTxWithBalance.filter((t) => t.type === 'INCOME').length} টি জমা
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  নির্বাচিত সময়ে মোট খরচ (Credit)
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-700 mt-2 font-mono">
                  {formatCurrency(cashFilteredTotalOutflow, language)}
                </div>
                <div className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  মোট {filteredCashTxWithBalance.filter((t) => t.type === 'EXPENSE').length} টি খরচ
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  সময়কালের সমাপনী স্থিতি (Closing)
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">
                  {formatCurrency(cashFilteredClosingBalance, language)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  প্রারম্ভিক: {formatCurrency(cashPeriodOpeningBalance, language)}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={cashSearchTerm}
                    onChange={(e) => setCashSearchTerm(e.target.value)}
                    placeholder="ভাউচার, খাত বা পার্টির নাম খুঁজুন..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Type Filter */}
                  <select
                    value={cashFilterType}
                    onChange={(e) => setCashFilterType(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
                  >
                    <option value="ALL">সকল লেনদেন (All)</option>
                    <option value="INCOME">শুধুমাত্র নগদ জমা (Income)</option>
                    <option value="EXPENSE">শুধুমাত্র নগদ খরচ (Expense)</option>
                  </select>

                  {/* Date Range */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500 text-[11px]">হতে:</span>
                    <input
                      type="date"
                      value={cashFilterDateFrom}
                      onChange={(e) => setCashFilterDateFrom(e.target.value)}
                      className="bg-transparent text-slate-800 font-medium outline-hidden text-xs"
                    />
                    <span className="text-slate-400 text-[11px]">—</span>
                    <span className="text-slate-500 text-[11px]">পর্যন্ত:</span>
                    <input
                      type="date"
                      value={cashFilterDateTo}
                      onChange={(e) => setCashFilterDateTo(e.target.value)}
                      className="bg-transparent text-slate-800 font-medium outline-hidden text-xs"
                    />
                  </div>

                  {(cashSearchTerm || cashFilterDateFrom || cashFilterDateTo || cashFilterType !== 'ALL') && (
                    <button
                      onClick={() => {
                        setCashSearchTerm('');
                        setCashFilterDateFrom('');
                        setCashFilterDateTo('');
                        setCashFilterType('ALL');
                      }}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      title="ফিল্টার রিসেট করুন"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setIsPrintCashbookOpen(true)}
                    className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>ক্যাশ বই প্রিন্ট</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cashbook Ledger Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">নগদ ক্যাশ বই (Cashbook Ledger)</h2>
                  <p className="text-xs text-slate-500">
                    সকল নগদ প্রাপ্তি ও পরিশোধের কালানুক্রমিক বিবরণ (চলমান স্থিতি সহ)
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  মোট <strong>{filteredCashTxWithBalance.length}</strong> টি লেনদেন প্রদর্শিত
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">ক্রঃ</th>
                      <th className="px-4 py-3">তারিখ</th>
                      <th className="px-4 py-3">ভাউচার নং</th>
                      <th className="px-4 py-3">বিবরণ / খাত</th>
                      <th className="px-4 py-3">পার্টি / প্রাপক / দাতা</th>
                      <th className="px-4 py-3 text-right text-emerald-700">নগদ জমা (Debit ৳)</th>
                      <th className="px-4 py-3 text-right text-rose-700">নগদ খরচ (Credit ৳)</th>
                      <th className="px-4 py-3 text-right text-slate-900">চলমান স্থিতি (Balance ৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashScreenTxList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                          কোনো নগদ লেনদেন পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      cashScreenTxList.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {formatDate(tx.date, language)}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {tx.voucherNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{tx.particulars}</td>
                          <td className="px-4 py-3 text-slate-600">{tx.party}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {tx.type === 'INCOME' ? `+ ${tx.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                            {tx.type === 'EXPENSE' ? `- ${tx.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {tx.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {cashScreenTxList.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right text-slate-800">
                          মোট নির্বাচিত সময়ের যোগফল:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 font-black">
                          + ৳ {cashFilteredTotalInflow.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700 font-black">
                          - ৳ {cashFilteredTotalOutflow.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-950 font-black">
                          ৳ {cashFilteredClosingBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. BANKBOOK TAB ---------------- */}
        {activeTab === 'bankbook' && (
          <div className="space-y-4">
            {/* Account Selector & Balance Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-xs font-bold text-slate-700 shrink-0">ব্যাংক অ্যাকাউন্ট নির্বাচন:</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full sm:w-80 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {accounts
                    .filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS')
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn} ({acc.bankName || acc.accountType}) - স্থিতি: {formatCurrency(acc.currentBalance, language)}
                      </option>
                    ))}
                </select>
              </div>

              {selectedBankAccount && (
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ব্যাংক ও শাখা</span>
                    <strong className="text-slate-900 font-semibold">
                      {selectedBankAccount.bankName || selectedBankAccount.nameBn}{' '}
                      {selectedBankAccount.branchName ? `(${selectedBankAccount.branchName})` : ''}
                    </strong>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-slate-500 block text-[10px]">হিসাব নম্বর</span>
                    <strong className="text-slate-900 font-mono">
                      {selectedBankAccount.accountNumber || 'N/A'}
                    </strong>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <span className="text-slate-500 block text-[10px]">বর্তমান স্থিতি</span>
                    <strong className="text-blue-700 text-sm font-black font-mono">
                      {formatCurrency(selectedBankAccount.currentBalance, language)}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Cards for Selected Bank */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  হিসাবের বর্তমান স্থিতি
                </span>
                <div className="text-xl sm:text-2xl font-black text-blue-700 mt-2 font-mono">
                  {formatCurrency(selectedBankAccount?.currentBalance || 0, language)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {selectedBankAccount?.nameBn}
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  নির্বাচিত সময়ে মোট জমা (Deposit)
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2 font-mono">
                  {formatCurrency(bankFilteredTotalDeposit, language)}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center">
                  <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                  মোট {filteredBankTxWithBalance.filter((t) => t.type === 'INCOME').length} টি জমা
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  নির্বাচিত সময়ে মোট উত্তোলন / খরচ
                </span>
                <div className="text-xl sm:text-2xl font-black text-rose-700 mt-2 font-mono">
                  {formatCurrency(bankFilteredTotalWithdrawal, language)}
                </div>
                <div className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  মোট {filteredBankTxWithBalance.filter((t) => t.type === 'EXPENSE').length} টি ডেবিট
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  সময়কালের সমাপনী স্থিতি
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">
                  {formatCurrency(bankFilteredClosingBalance, language)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  প্রারম্ভিক: {formatCurrency(bankPeriodOpeningBalance, language)}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={bankSearchTerm}
                    onChange={(e) => setBankSearchTerm(e.target.value)}
                    placeholder="চেক, TRX, ভাউচার বা বিবরণ খুঁজুন..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Type Filter */}
                  <select
                    value={bankFilterType}
                    onChange={(e) => setBankFilterType(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
                  >
                    <option value="ALL">সকল ব্যাংক লেনদেন (All)</option>
                    <option value="INCOME">শুধুমাত্র জমা (Deposits)</option>
                    <option value="EXPENSE">শুধুমাত্র উত্তোলন/খরচ (Withdrawals)</option>
                  </select>

                  {/* Date Range */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500 text-[11px]">হতে:</span>
                    <input
                      type="date"
                      value={bankFilterDateFrom}
                      onChange={(e) => setBankFilterDateFrom(e.target.value)}
                      className="bg-transparent text-slate-800 font-medium outline-hidden text-xs"
                    />
                    <span className="text-slate-400 text-[11px]">—</span>
                    <span className="text-slate-500 text-[11px]">পর্যন্ত:</span>
                    <input
                      type="date"
                      value={bankFilterDateTo}
                      onChange={(e) => setBankFilterDateTo(e.target.value)}
                      className="bg-transparent text-slate-800 font-medium outline-hidden text-xs"
                    />
                  </div>

                  {(bankSearchTerm || bankFilterDateFrom || bankFilterDateTo || bankFilterType !== 'ALL') && (
                    <button
                      onClick={() => {
                        setBankSearchTerm('');
                        setBankFilterDateFrom('');
                        setBankFilterDateTo('');
                        setBankFilterType('ALL');
                      }}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      title="ফিল্টার রিসেট করুন"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setIsPrintBankbookOpen(true)}
                    className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>ব্যাংক খতিয়ান প্রিন্ট</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bankbook Statement Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedBankAccount?.nameBn || 'ব্যাংক'} খতিয়ান স্টেটমেন্ট
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedBankAccount?.bankName || selectedBankAccount?.nameBn}{' '}
                    {selectedBankAccount?.branchName ? `(${selectedBankAccount.branchName})` : ''} | হিসাব নং: {selectedBankAccount?.accountNumber || 'N/A'}
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  মোট <strong>{filteredBankTxWithBalance.length}</strong> টি লেনদেন
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">ক্রঃ</th>
                      <th className="px-4 py-3">তারিখ</th>
                      <th className="px-4 py-3">ভাউচার / চেক নং</th>
                      <th className="px-4 py-3">খাত ও বিবরণ</th>
                      <th className="px-4 py-3">পার্টি / প্রাপক / দাতা</th>
                      <th className="px-4 py-3 text-right text-emerald-700">জমা / Deposit (৳)</th>
                      <th className="px-4 py-3 text-right text-rose-700">উত্তোলন / Withdrawal (৳)</th>
                      <th className="px-4 py-3 text-right text-slate-900">ব্যালেন্স / জের (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankScreenTxList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                          এই ব্যাংক অ্যাকাউন্টে কোনো লেনদেন পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      bankScreenTxList.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono">
                            {formatDate(tx.date, language)}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-blue-700">
                            {tx.voucherNumber}
                            {tx.reference && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                চেক/TRX: {tx.reference}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{tx.particulars}</td>
                          <td className="px-4 py-3 text-slate-600">{tx.party}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {tx.type === 'INCOME' ? `+ ${tx.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                            {tx.type === 'EXPENSE' ? `- ${tx.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {tx.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {bankScreenTxList.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right text-slate-800">
                          সর্বমোট যোগফল:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 font-black">
                          + ৳ {bankFilteredTotalDeposit.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700 font-black">
                          - ৳ {bankFilteredTotalWithdrawal.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-950 font-black">
                          ৳ {bankFilteredClosingBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 3. BANK ACCOUNTS LIST TAB ---------------- */}
        {activeTab === 'banks' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      acc.accountType === 'CASH'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : acc.accountType === 'BANK'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}
                  >
                    {acc.accountType}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{acc.nameBn}</h3>
                  {acc.bankName && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {acc.bankName} ({acc.branchName || 'প্রধান শাখা'})
                    </p>
                  )}
                  {acc.accountNumber && (
                    <p className="font-mono text-xs text-slate-600 mt-1">
                      হিসাব নং: ••••{acc.accountNumber.slice(-4)}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">বর্তমান স্থিতি:</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {formatCurrency(acc.currentBalance, language)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- 4. ACCOUNT HEADS CHART TAB ---------------- */}
        {activeTab === 'heads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Heads */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-xs sm:text-sm">
                  আয়ের খাতসমূহ (Income Heads)
                </span>
                <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                  {accountHeads.filter((h) => h.type === 'INCOME').length} খাত
                </span>
              </div>
              <div className="p-4 space-y-3">
                {mainHeads
                  .filter((h) => h.type === 'INCOME')
                  .map((main) => {
                    const subs = accountHeads.filter((h) => h.parentId === main.id);
                    return (
                      <div key={main.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{main.nameBn}</span>
                          <span className="font-mono text-[10px] text-slate-400">{main.code}</span>
                        </div>
                        {subs.length > 0 && (
                          <div className="pl-3 border-l-2 border-emerald-400 space-y-1">
                            {subs.map((sub) => (
                              <div key={sub.id} className="text-xs text-slate-600 flex justify-between">
                                <span>• {sub.nameBn}</span>
                                <span className="font-mono text-[10px] text-slate-400">{sub.code}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Expense Heads */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
                <span className="font-bold text-rose-950 text-xs sm:text-sm">
                  ব্যয়ের খাতসমূহ (Expense Heads)
                </span>
                <span className="text-[11px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-bold">
                  {accountHeads.filter((h) => h.type === 'EXPENSE').length} খাত
                </span>
              </div>
              <div className="p-4 space-y-3">
                {mainHeads
                  .filter((h) => h.type === 'EXPENSE')
                  .map((main) => {
                    const subs = accountHeads.filter((h) => h.parentId === main.id);
                    return (
                      <div key={main.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{main.nameBn}</span>
                          <span className="font-mono text-[10px] text-slate-400">{main.code}</span>
                        </div>
                        {subs.length > 0 && (
                          <div className="pl-3 border-l-2 border-rose-400 space-y-1">
                            {subs.map((sub) => (
                              <div key={sub.id} className="text-xs text-slate-600 flex justify-between">
                                <span>• {sub.nameBn}</span>
                                <span className="font-mono text-[10px] text-slate-400">{sub.code}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 5. PRINT-READY CASHBOOK LEDGER MODAL ==================== */}
      {isPrintCashbookOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 report-modal-print-wrapper print:static print:inset-auto print:p-0 print:m-0 print:w-full print:h-auto print:bg-white print:overflow-visible print:block print:z-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] report-modal-print-card print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0">
            {/* Top Controls Toolbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">নগদ ক্যাশ বই রেজিস্টার প্রতিবেদন (Cashbook Print Preview)</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  onClick={() => setIsPrintCashbookOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-5 font-sans report-modal-print-body print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-h-none print:block print:shadow-none">
              {/* Official Mosque Header */}
              <div className="border-2 border-slate-900 bg-white p-3.5 rounded-none overflow-hidden">
                <div className="grid grid-cols-12 items-center gap-3">
                  {/* LEFT: Logo (2 cols) */}
                  <div className="col-span-2 flex items-center justify-start">
                    {currentMosque?.logoUrl ? (
                      <img
                        src={currentMosque.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-16 max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-emerald-600 bg-emerald-50/60 flex flex-col items-center justify-center text-emerald-800 rounded-lg">
                        <Building className="w-7 h-7 mb-0.5 text-emerald-700" />
                        <span className="text-[8px] font-bold">লোগো</span>
                      </div>
                    )}
                  </div>

                  {/* CENTER: Mosque Info & Title (7 cols) */}
                  <div className="col-span-7 text-center">
                    <div className="text-xs font-serif text-slate-600 mb-0.5">بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ</div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদুল মামুর কমপ্লেক্স ও ওয়াকফ এস্টেট'}
                    </h1>
                    {currentMosque?.address && (
                      <p className="text-xs text-slate-700 mt-0.5">
                        {currentMosque.address}{' '}
                        {currentMosque.district ? `• জেলা: ${currentMosque.district}` : ''}{' '}
                        {currentMosque.phone ? `• ফোন: ${currentMosque.phone}` : ''}
                      </p>
                    )}
                    {currentMosque?.waqfEstateNumber && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        ওয়াকফ এস্টেট ইসি নং: {currentMosque.waqfEstateNumber}
                      </p>
                    )}
                    <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white font-bold text-xs sm:text-sm tracking-wide">
                      দৈনিক ও পর্যায়ক্রমিক নগদ ক্যাশ বই (Cashbook Ledger) প্রতিবেদন
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      সময়কাল: <span className="font-bold text-slate-950">{cashFilterDateFrom ? formatDate(cashFilterDateFrom) : 'শুরু হতে'}</span> হতে{' '}
                      <span className="font-bold text-slate-950">{cashFilterDateTo ? formatDate(cashFilterDateTo) : 'হালনাগাদ'}</span> পর্যন্ত
                    </p>
                  </div>

                  {/* RIGHT: Structured Meta Box (3 cols) */}
                  <div className="col-span-3 border border-slate-800 bg-slate-50 p-2 text-[11px] space-y-1">
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">প্রতিবেদন ধরন:</span>
                      <span className="font-bold text-slate-950">নগদ ক্যাশ বই</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মোট লেনদেন:</span>
                      <span className="font-bold text-slate-900">{filteredCashTxWithBalance.length} টি</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মুদ্রা:</span>
                      <span className="font-bold text-slate-900">BDT (টাকা ৳)</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                      <span>প্রিন্টের তারিখ:</span>
                      <span className="font-mono">{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-slate-300 p-2 bg-slate-50">
                  <div className="text-[10px] text-slate-500 font-semibold">প্রারম্ভিক নগদ স্থিতি</div>
                  <div className="font-bold font-mono text-slate-900 mt-0.5">
                    ৳ {cashPeriodOpeningBalance.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="border border-emerald-300 p-2 bg-emerald-50/50">
                  <div className="text-[10px] text-emerald-800 font-semibold">মোট নগদ জমা (Debit)</div>
                  <div className="font-bold font-mono text-emerald-700 mt-0.5">
                    ৳ {cashFilteredTotalInflow.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="border border-rose-300 p-2 bg-rose-50/50">
                  <div className="text-[10px] text-rose-800 font-semibold">মোট নগদ খরচ (Credit)</div>
                  <div className="font-bold font-mono text-rose-700 mt-0.5">
                    ৳ {cashFilteredTotalOutflow.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="border border-blue-300 p-2 bg-blue-50/50">
                  <div className="text-[10px] text-blue-900 font-semibold">সমাপনী নগদ স্থিতি</div>
                  <div className="font-bold font-mono text-blue-800 mt-0.5">
                    ৳ {cashFilteredClosingBalance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Cash Ledger Master Table */}
              <div className="border border-slate-900 overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                    <tr>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-10">ক্রঃ</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-24">তারিখ</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-24">ভাউচার নং</th>
                      <th className="py-2 px-2 border-r border-slate-300">খাত ও লেনদেনের বিবরণ</th>
                      <th className="py-2 px-2 border-r border-slate-300">পার্টি / প্রাপক / দাতা</th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 w-28 text-emerald-900">
                        নগদ জমা (ডেবিট ৳)
                      </th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 w-28 text-rose-900">
                        নগদ খরচ (ক্রেডিট ৳)
                      </th>
                      <th className="py-2 px-2 text-right w-28 text-slate-900">নগদ জের (স্থিতি ৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-50 font-semibold italic text-slate-700">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono">—</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-mono">
                        {cashFilterDateFrom ? formatDate(cashFilterDateFrom) : 'শুরুতে'}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-mono">OPENING</td>
                      <td colSpan={2} className="py-1.5 px-2 border-r border-slate-200 text-slate-900">
                        প্রারম্ভিক নগদ স্থিতি (Opening Balance B/F)
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-slate-400">
                        —
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-slate-400">
                        —
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                        ৳ {cashPeriodOpeningBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {filteredCashTxWithBalance.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          কোনো নগদ লেনদেন রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredCashTxWithBalance.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-mono">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-bold font-mono text-slate-900">
                            {tx.voucherNumber}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-medium text-slate-900">
                            {tx.particulars}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-slate-700">
                            {tx.party}
                          </td>
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-bold text-emerald-800">
                            {tx.type === 'INCOME' ? `+ ৳ ${tx.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-bold text-rose-800">
                            {tx.type === 'EXPENSE' ? `- ৳ ${tx.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                            ৳ {tx.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right text-slate-900">
                        মোট নির্বাচিত সময়ের নগদ লেনদেন যোগফল:
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-900 font-black">
                        ৳ {cashFilteredTotalInflow.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-rose-900 font-black">
                        ৳ {cashFilteredTotalOutflow.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-sm font-black text-slate-950 bg-slate-200/80">
                        ৳ {cashFilteredClosingBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount In Words */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <strong>সমাপনী নগদ স্থিতি কথায় (In Words):</strong> {numberToBanglaWords(cashFilteredClosingBalance)}
              </div>

              {/* Official Approval Signatures Section */}
              <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  {/* Signature 1: Treasurer / Cashier */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {/* Physical handwriting line */}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      কোষাধ্যক্ষ / হিসাবরক্ষক
                    </div>
                    <div className="text-[10px] text-slate-600">হিসাব ও অর্থ বিভাগ</div>
                  </div>

                  {/* Signature 2: Secretary / Mutawalli */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.secretarySignatureUrl ? (
                        <img
                          src={currentMosque.secretarySignatureUrl}
                          alt="Secretary Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সাধারণ সম্পাদক / মোতাওয়াল্লী
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>

                  {/* Signature 3: President */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.presidentSignatureUrl ? (
                        <img
                          src={currentMosque.presidentSignatureUrl}
                          alt="President Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সভাপতি / সভাপতি মহোদয়
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>
                </div>
              </div>

              {/* System Security Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>এটি সফটওয়্যার থেকে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত অনুমোদিত ক্যাশ বই রেজিস্টার প্রতিবেদন।</span>
                </div>
                <div>মুদ্রণ সময়: {new Date().toLocaleString('bn-BD')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. PRINT-READY BANKBOOK LEDGER MODAL ==================== */}
      {isPrintBankbookOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 report-modal-print-wrapper print:static print:inset-auto print:p-0 print:m-0 print:w-full print:h-auto print:bg-white print:overflow-visible print:block print:z-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] report-modal-print-card print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0">
            {/* Top Controls Toolbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">ব্যাংক হিসাব খতিয়ান ও স্টেটমেন্ট প্রতিবেদন (Bankbook Print Preview)</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  onClick={() => setIsPrintBankbookOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-5 font-sans report-modal-print-body print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-h-none print:block print:shadow-none">
              {/* Official Mosque Header */}
              <div className="border-2 border-slate-900 bg-white p-3.5 rounded-none overflow-hidden">
                <div className="grid grid-cols-12 items-center gap-3">
                  {/* LEFT: Logo (2 cols) */}
                  <div className="col-span-2 flex items-center justify-start">
                    {currentMosque?.logoUrl ? (
                      <img
                        src={currentMosque.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-16 max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-blue-600 bg-blue-50/60 flex flex-col items-center justify-center text-blue-800 rounded-lg">
                        <Building className="w-7 h-7 mb-0.5 text-blue-700" />
                        <span className="text-[8px] font-bold">লোগো</span>
                      </div>
                    )}
                  </div>

                  {/* CENTER: Mosque Info & Title (7 cols) */}
                  <div className="col-span-7 text-center">
                    <div className="text-xs font-serif text-slate-600 mb-0.5">بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ</div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদুল মামুর কমপ্লেক্স ও ওয়াকফ এস্টেট'}
                    </h1>
                    {currentMosque?.address && (
                      <p className="text-xs text-slate-700 mt-0.5">
                        {currentMosque.address}{' '}
                        {currentMosque.district ? `• জেলা: ${currentMosque.district}` : ''}{' '}
                        {currentMosque.phone ? `• ফোন: ${currentMosque.phone}` : ''}
                      </p>
                    )}
                    {currentMosque?.waqfEstateNumber && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        ওয়াকফ এস্টেট ইসি নং: {currentMosque.waqfEstateNumber}
                      </p>
                    )}
                    <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white font-bold text-xs sm:text-sm tracking-wide">
                      ব্যাংক হিসাব খতিয়ান ও স্টেটমেন্ট (Bankbook Ledger) প্রতিবেদন
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      সময়কাল: <span className="font-bold text-slate-950">{bankFilterDateFrom ? formatDate(bankFilterDateFrom) : 'শুরু হতে'}</span> হতে{' '}
                      <span className="font-bold text-slate-950">{bankFilterDateTo ? formatDate(bankFilterDateTo) : 'হালনাগাদ'}</span> পর্যন্ত
                    </p>
                  </div>

                  {/* RIGHT: Structured Meta Box (3 cols) */}
                  <div className="col-span-3 border border-slate-800 bg-slate-50 p-2 text-[11px] space-y-1">
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">প্রতিবেদন ধরন:</span>
                      <span className="font-bold text-slate-950">ব্যাংক খতিয়ান</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">হিসাবের নাম:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[110px]" title={selectedBankAccount?.nameBn}>
                        {selectedBankAccount?.nameBn || 'ব্যাংক হিসাব'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মুদ্রা:</span>
                      <span className="font-bold text-slate-900">BDT (টাকা ৳)</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                      <span>প্রিন্টের তারিখ:</span>
                      <span className="font-mono">{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Bank Account Details Banner */}
              <div className="border border-slate-300 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">ব্যাংক ও শাখার নাম:</span>
                  <strong className="text-slate-950 font-bold">
                    {selectedBankAccount?.bankName || selectedBankAccount?.nameBn}{' '}
                    {selectedBankAccount?.branchName ? `(${selectedBankAccount.branchName} শাখা)` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">হিসাব নম্বর (A/C No):</span>
                  <strong className="text-slate-950 font-mono font-bold">
                    {selectedBankAccount?.accountNumber || 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">হিসাবের ধরন:</span>
                  <strong className="text-slate-950 font-bold">
                    {selectedBankAccount?.accountType === 'BANK'
                      ? 'ব্যাংক একাউন্ট (Bank)'
                      : selectedBankAccount?.accountType === 'MFS'
                      ? 'মোবাইল ব্যাংকিং (MFS)'
                      : selectedBankAccount?.accountType}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">হিসাবের বর্তমান স্থিতি:</span>
                  <strong className="text-blue-800 font-mono text-sm font-black">
                    ৳ {(selectedBankAccount?.currentBalance || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-slate-300 p-2 bg-slate-50">
                  <div className="text-[10px] text-slate-500 font-semibold">প্রারম্ভিক ব্যাংক স্থিতি</div>
                  <div className="font-bold font-mono text-slate-900 mt-0.5">
                    ৳ {bankPeriodOpeningBalance.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="border border-emerald-300 p-2 bg-emerald-50/50">
                  <div className="text-[10px] text-emerald-800 font-semibold">মোট জমা (Deposit)</div>
                  <div className="font-bold font-mono text-emerald-700 mt-0.5">
                    ৳ {bankFilteredTotalDeposit.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="border border-rose-300 p-2 bg-rose-50/50">
                  <div className="text-[10px] text-rose-800 font-semibold">মোট উত্তোলন / খরচ</div>
                  <div className="font-bold font-mono text-rose-700 mt-0.5">
                    ৳ {bankFilteredTotalWithdrawal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="border border-blue-300 p-2 bg-blue-50/50">
                  <div className="text-[10px] text-blue-900 font-semibold">সমাপনী ব্যাংক স্থিতি</div>
                  <div className="font-bold font-mono text-blue-800 mt-0.5">
                    ৳ {bankFilteredClosingBalance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Bank Ledger Master Table */}
              <div className="border border-slate-900 overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                    <tr>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-10">ক্রঃ</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-24">তারিখ</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-28">ভাউচার / চেক নং</th>
                      <th className="py-2 px-2 border-r border-slate-300">খাত ও লেনদেনের বিবরণ</th>
                      <th className="py-2 px-2 border-r border-slate-300">পার্টি / প্রাপক / দাতা</th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 w-28 text-emerald-900">
                        জমা / Deposit (৳)
                      </th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 w-28 text-rose-900">
                        উত্তোলন / Withdrawal (৳)
                      </th>
                      <th className="py-2 px-2 text-right w-28 text-slate-900">ব্যালেন্স / স্থিতি (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-50 font-semibold italic text-slate-700">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono">—</td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-mono">
                        {bankFilterDateFrom ? formatDate(bankFilterDateFrom) : 'শুরুতে'}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-mono">OPENING</td>
                      <td colSpan={2} className="py-1.5 px-2 border-r border-slate-200 text-slate-900">
                        প্রারম্ভিক ব্যাংক স্থিতি (Opening Balance B/F)
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-slate-400">
                        —
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-slate-400">
                        —
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                        ৳ {bankPeriodOpeningBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>

                    {filteredBankTxWithBalance.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500">
                          এই ব্যাংক হিসাবে কোনো লেনদেন পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredBankTxWithBalance.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-mono">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-bold font-mono text-blue-700">
                            {tx.voucherNumber}
                            {tx.reference && (
                              <span className="block text-[10px] text-slate-500 font-normal">
                                {tx.reference}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 font-medium text-slate-900">
                            {tx.particulars}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-slate-700">
                            {tx.party}
                          </td>
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-bold text-emerald-800">
                            {tx.type === 'INCOME' ? `+ ৳ ${tx.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-right border-r border-slate-200 font-mono font-bold text-rose-800">
                            {tx.type === 'EXPENSE' ? `- ৳ ${tx.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                            ৳ {tx.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right text-slate-900">
                        মোট ব্যাংক লেনদেন যোগফল:
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-900 font-black">
                        ৳ {bankFilteredTotalDeposit.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-rose-900 font-black">
                        ৳ {bankFilteredTotalWithdrawal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-sm font-black text-slate-950 bg-slate-200/80">
                        ৳ {bankFilteredClosingBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount In Words */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <strong>সমাপনী ব্যাংক স্থিতি কথায় (In Words):</strong> {numberToBanglaWords(bankFilteredClosingBalance)}
              </div>

              {/* Official Approval Signatures Section */}
              <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  {/* Signature 1: Treasurer / Cashier */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {/* Physical handwriting line */}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      কোষাধ্যক্ষ / হিসাবরক্ষক
                    </div>
                    <div className="text-[10px] text-slate-600">হিসাব ও অর্থ বিভাগ</div>
                  </div>

                  {/* Signature 2: Secretary / Mutawalli */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.secretarySignatureUrl ? (
                        <img
                          src={currentMosque.secretarySignatureUrl}
                          alt="Secretary Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সাধারণ সম্পাদক / মোতাওয়াল্লী
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>

                  {/* Signature 3: President */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.presidentSignatureUrl ? (
                        <img
                          src={currentMosque.presidentSignatureUrl}
                          alt="President Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সভাপতি / সভাপতি মহোদয়
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>
                </div>
              </div>

              {/* System Security Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>এটি সফটওয়্যার থেকে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত অনুমোদিত ব্যাংক খতিয়ান স্টেটমেন্ট প্রতিবেদন।</span>
                </div>
                <div>মুদ্রণ সময়: {new Date().toLocaleString('bn-BD')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TRANSFER / CONTRA MODAL ---------------- */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-slate-900">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">তহবিল স্থানান্তর / কন্ট্রা ভাউচার</h3>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  যে হিসাব থেকে যাবে (From Account) *
                </label>
                <select
                  value={fromAccId}
                  onChange={(e) => setFromAccId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn} (স্থিতি: {formatCurrency(a.currentBalance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  যে হিসাবে জমা হবে (To Account) *
                </label>
                <select
                  value={toAccId}
                  onChange={(e) => setToAccId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn} (স্থিতি: {formatCurrency(a.currentBalance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  চেক নং / ডিপোজিট স্লিপ নং / রেফারেন্স
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-104958 / ব্যাংক জমা স্লিপ"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য / নোট</label>
                <input
                  type="text"
                  placeholder="e.g. ক্যাশ থেকে ব্যাংকে জমা"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {isSubmittingTransfer ? 'স্থানান্তর হচ্ছে...' : 'স্থানান্তর নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD ACCOUNT MODAL ---------------- */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন ব্যাংক/হিসাব সংযোজন</h3>
            <form onSubmit={handleAccountSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  হিসাবের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. সোনালী ব্যাংক চলতি হিসাব"
                  value={accNameBn}
                  onChange={(e) => setAccNameBn(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">হিসাবের ধরন</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  <option value="BANK">ব্যাংক একাউন্ট (Bank)</option>
                  <option value="CASH">ক্যাশ তহবিল (Cash in Hand)</option>
                  <option value="MFS">মোবাইল ব্যাংকিং (bKash/Nagad/Rocket)</option>
                </select>
              </div>

              {accType === 'BANK' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ব্যাংকের নাম ও শাখা
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ইসলামী ব্যাংক, মিরপুর শাখা"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">হিসাব নম্বর</label>
                    <input
                      type="text"
                      placeholder="e.g. 20501234567890"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রারম্ভিক স্থিতি (টাকা)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD ACCOUNT HEAD MODAL ---------------- */}
      {isHeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন আয়-ব্যয় খাত (Head) সংযোজন</h3>
            <form onSubmit={handleHeadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  খাতের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. রমজান ইফতার ও সাহরি তহবিল"
                  value={headNameBn}
                  onChange={(e) => setHeadNameBn(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">খাতের ধরন *</label>
                <select
                  value={headType}
                  onChange={(e) => setHeadType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  <option value="INCOME">আয়ের খাত (Income Head)</option>
                  <option value="EXPENSE">ব্যয়ের খাত (Expense Head)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মূল প্যারেন্ট খাত (ঐচ্ছিক)
                </label>
                <select
                  value={headParentId}
                  onChange={(e) => setHeadParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  <option value="">-- এটি একটি প্রধান খাত (Main Head) --</option>
                  {mainHeads
                    .filter((h) => h.type === headType)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHeadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

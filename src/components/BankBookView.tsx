import React, { useState, useMemo, useEffect } from 'react';
import {
  Landmark,
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  Plus,
  Minus,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building,
  CreditCard,
  Smartphone,
  Wallet,
  Eye,
  EyeOff,
  Info,
  Layers,
  UploadCloud,
  Edit2,
  ExternalLink,
  Coins,
  TrendingUp,
  TrendingDown,
  Check,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  FinancialAccount,
  IncomeEntry,
  ExpenseEntry,
  Mosque,
  User,
  AccountTransfer,
} from '../types';
import { Language, translations, formatDate, formatCurrency } from '../lib/i18n';
import { FinancialSecondarySidebar, SecondarySidebarItem } from './FinancialSecondarySidebar';
import {
  calculateAccountingLedger,
  exportBankLedgerToExcel,
  UnifiedLedgerEntry,
} from '../lib/accountingLedgerService';
import { ReportPrintDocument } from './ReportPrintDocument';
import { FinancialAccountModal } from './FinancialAccountModal';

interface BankBookViewProps {
  accounts: FinancialAccount[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  transfers?: AccountTransfer[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onAddAccount?: (data: any) => Promise<void>;
  onUpdateAccount?: (id: string, data: any) => Promise<void>;
  onTransferFund?: (data: any) => Promise<void>;
  hideInternalSidebar?: boolean;
  forcedSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

// Masking helper for account numbers
export const maskAccountNumber = (accNo?: string) => {
  if (!accNo || accNo.length <= 4) return accNo || '—';
  const lastFour = accNo.slice(-4);
  const prefix = accNo.slice(0, Math.min(4, accNo.length - 4));
  return `${prefix}••••${lastFour}`;
};

export const BankBookView: React.FC<BankBookViewProps> = ({
  accounts = [],
  incomes = [],
  expenses = [],
  transfers = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onAddAccount,
  onUpdateAccount,
  onTransferFund,
  hideInternalSidebar = false,
  forcedSubTab,
  onSubTabChange,
}) => {
  const [activeSubItem, setActiveSubItem] = useState<string>(forcedSubTab || 'BANK_LEDGER');

  useEffect(() => {
    if (forcedSubTab) {
      setActiveSubItem(forcedSubTab);
    }
  }, [forcedSubTab]);

  const handleSelectSubTab = (tabId: string) => {
    setActiveSubItem(tabId);
    if (onSubTabChange) {
      onSubTabChange(tabId);
    }
  };

  // Filter bank/MFS accounts
  const bankAndMfsAccounts = useMemo(() => {
    return accounts.filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS');
  }, [accounts]);

  const bankAccountsOnly = useMemo(() => {
    return accounts.filter((a) => a.accountType === 'BANK');
  }, [accounts]);

  const mfsAccountsOnly = useMemo(() => {
    return accounts.filter((a) => a.accountType === 'MFS');
  }, [accounts]);

  const cashAccounts = useMemo(() => {
    return accounts.filter((a) => a.accountType === 'CASH');
  }, [accounts]);

  // Selected Bank Account for Ledger
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    bankAndMfsAccounts[0]?.id || 'BANK'
  );

  // Date Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = `${todayStr.slice(0, 7)}-01`;
  const [datePreset, setDatePreset] = useState<
    'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_YEAR' | 'ALL' | 'CUSTOM'
  >('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Type & Search Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Dialog
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Account Modal (Add & Edit)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState<'ALL' | 'BANK' | 'MFS' | 'CASH'>('ALL');
  const [unmaskedAccounts, setUnmaskedAccounts] = useState<Record<string, boolean>>({});

  // Toggle Mask/Unmask
  const toggleAccountMask = (accId: string) => {
    setUnmaskedAccounts((prev) => ({ ...prev, [accId]: !prev[accId] }));
  };

  // Deposit Form State (Dedicated ➕ টাকা জমা)
  const [depositFromId, setDepositFromId] = useState<string>(cashAccounts[0]?.id || accounts[0]?.id || '');
  const [depositToId, setDepositToId] = useState<string>(bankAccountsOnly[0]?.id || bankAndMfsAccounts[0]?.id || '');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositDate, setDepositDate] = useState<string>(todayStr);
  const [depositSlipRef, setDepositSlipRef] = useState<string>('');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string>('');

  // Withdrawal Form State (Dedicated ➖ টাকা উত্তোলন)
  const [withdrawFromId, setWithdrawFromId] = useState<string>(bankAccountsOnly[0]?.id || bankAndMfsAccounts[0]?.id || '');
  const [withdrawToId, setWithdrawToId] = useState<string>(cashAccounts[0]?.id || accounts[0]?.id || '');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawDate, setWithdrawDate] = useState<string>(todayStr);
  const [withdrawChequeNo, setWithdrawChequeNo] = useState<string>('');
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>('দৈনন্দিন মসজিদ পরিচালনার ক্যাশ উত্তোলন');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string>('');

  // Fund Transfer Form State (Inter-Account)
  const [transferFromId, setTransferFromId] = useState<string>(accounts[0]?.id || '');
  const [transferToId, setTransferToId] = useState<string>(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(todayStr);
  const [transferPurpose, setTransferPurpose] = useState<string>('GENERAL_TRANSFER');
  const [transferRef, setTransferRef] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferSubmitting, setTransferSubmitting] = useState<boolean>(false);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string>('');

  // Bank Reconciliation State
  const [reconAccountId, setReconAccountId] = useState<string>(bankAccountsOnly[0]?.id || bankAndMfsAccounts[0]?.id || '');
  const [reconStatementDate, setReconStatementDate] = useState<string>(todayStr);
  const [reconStatementBalance, setReconStatementBalance] = useState<string>('');
  const [reconOutstandingCheques, setReconOutstandingCheques] = useState<string>('');
  const [reconUncreditedDeposits, setReconUncreditedDeposits] = useState<string>('');
  const [reconVerifiedBy, setReconVerifiedBy] = useState<string>(currentUser?.name || '');
  const [reconNotes, setReconNotes] = useState<string>('');
  const [reconSuccessMsg, setReconSuccessMsg] = useState<string>('');
  const [reconciliationLogs, setReconciliationLogs] = useState<Array<{
    id: string;
    date: string;
    accountName: string;
    bookBalance: number;
    statementBalance: number;
    difference: number;
    status: 'VERIFIED' | 'DISCREPANCY';
    verifiedBy: string;
  }>>([
    {
      id: 'recon-1',
      date: '2026-03-01',
      accountName: 'ইসলামী ব্যাংক বাংলাদেশ (চলতি হিসাব)',
      bookBalance: 1250000,
      statementBalance: 1250000,
      difference: 0,
      status: 'VERIFIED',
      verifiedBy: 'আব্দুল কাদির (হিসাবরক্ষক)',
    },
  ]);

  // Summary Tabs
  const [summaryTab, setSummaryTab] = useState<'DAILY' | 'MONTHLY' | 'YEARLY' | 'BY_ACCOUNT'>('MONTHLY');

  // Selected account object
  const activeAccountObj = useMemo(() => {
    if (selectedAccountId === 'BANK') return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Balances
  const totalBankBalance = useMemo(() => {
    return bankAccountsOnly.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  }, [bankAccountsOnly]);

  const totalMfsBalance = useMemo(() => {
    return mfsAccountsOnly.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  }, [mfsAccountsOnly]);

  const totalCombinedBalance = useMemo(() => {
    return bankAndMfsAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  }, [bankAndMfsAccounts]);

  // Preset Date Handler
  const handleDatePreset = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'TODAY') {
      const today = now.toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const dStr = yest.toISOString().split('T')[0];
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'THIS_WEEK') {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_WEEK') {
      const dayOfWeek = now.getDay();
      const end = new Date(now);
      end.setDate(now.getDate() - dayOfWeek - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (preset === 'THIS_MONTH') {
      const start = `${now.toISOString().slice(0, 7)}-01`;
      setStartDate(start);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(prevMonth.toISOString().split('T')[0]);
      setEndDate(lastDayPrev.toISOString().split('T')[0]);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_YEAR') {
      const lastY = now.getFullYear() - 1;
      setStartDate(`${lastY}-01-01`);
      setEndDate(`${lastY}-12-31`);
    } else if (preset === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // UNIFIED LEDGER CALCULATION (SINGLE SOURCE OF TRUTH)
  const ledgerResult = useMemo(() => {
    return calculateAccountingLedger({
      accounts,
      incomes,
      expenses,
      transfers,
      accountFilter: selectedAccountId === 'BANK' ? 'BANK' : selectedAccountId,
      startDate,
      endDate,
      typeFilter,
      searchQuery,
    });
  }, [accounts, incomes, expenses, transfers, selectedAccountId, startDate, endDate, typeFilter, searchQuery]);

  const currentViewBalance = useMemo(() => {
    if (activeAccountObj) {
      return Number(activeAccountObj.currentBalance) || 0;
    }
    return totalCombinedBalance;
  }, [activeAccountObj, totalCombinedBalance]);

  // Reconciliation Difference Calculation
  const reconBookBalance = useMemo(() => {
    const targetAcc = accounts.find((a) => a.id === reconAccountId);
    return targetAcc ? Number(targetAcc.currentBalance) || 0 : currentViewBalance;
  }, [accounts, reconAccountId, currentViewBalance]);

  const reconDiff = useMemo(() => {
    const stmt = parseFloat(reconStatementBalance);
    if (isNaN(stmt)) return 0;
    return stmt - reconBookBalance;
  }, [reconStatementBalance, reconBookBalance]);

  // Handle Account Save (Add / Update)
  const handleSaveAccount = async (payload: Partial<FinancialAccount>) => {
    if (accountToEdit && onUpdateAccount) {
      await onUpdateAccount(accountToEdit.id, payload);
    } else if (onAddAccount) {
      await onAddAccount(payload);
    }
    setIsAccountModalOpen(false);
    setAccountToEdit(null);
  };

  // Status toggle handler
  const handleToggleStatus = async (account: FinancialAccount) => {
    if (!onUpdateAccount) return;
    const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await onUpdateAccount(account.id, { status: nextStatus });
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস পরিবর্তনে ত্রুটি হয়েছে।');
    }
  };

  // Dedicated Bank Deposit Handler (➕ টাকা জমা)
  const handleDoDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('অনুগ্রহ করে সঠিক জমার পরিমাণ লিখুন।');
      return;
    }
    if (!depositFromId || !depositToId) {
      alert('উৎস ও গন্তব্য ব্যাংক হিসাব নির্বাচন করুন।');
      return;
    }
    if (depositFromId === depositToId) {
      alert('উৎস ও গন্তব্য হিসাব একই হতে পারে না।');
      return;
    }

    try {
      setDepositSubmitting(true);
      if (onTransferFund) {
        await onTransferFund({
          fromAccountId: depositFromId,
          toAccountId: depositToId,
          amount: amt,
          date: depositDate,
          purpose: 'BANK_DEPOSIT',
          reference: depositSlipRef,
          description: depositNotes || 'ব্যাংকে নগদ/এমএফএস তহবিল জমা',
        });
      }
      const toAccName = accounts.find((a) => a.id === depositToId)?.nameBn || 'ব্যাংক হিসাব';
      setDepositSuccessMsg(`৳ ${amt.toLocaleString('en-IN')} সফলভাবে ${toAccName}-এ জমা হয়েছে (কন্ট্রা এন্ট্রি)।`);
      setDepositAmount('');
      setDepositSlipRef('');
      setDepositNotes('');
      setTimeout(() => setDepositSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'ব্যাংক জমা ব্যর্থ হয়েছে।');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Dedicated Bank Withdrawal Handler (➖ টাকা উত্তোলন)
  const handleDoWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('অনুগ্রহ করে সঠিক উত্তোলনের পরিমাণ লিখুন।');
      return;
    }
    if (!withdrawFromId || !withdrawToId) {
      alert('উৎস ব্যাংক ও গন্তব্য ক্যাশ হিসাব নির্বাচন করুন।');
      return;
    }
    if (withdrawFromId === withdrawToId) {
      alert('উৎস ও গন্তব্য হিসাব একই হতে পারে না।');
      return;
    }

    try {
      setWithdrawSubmitting(true);
      if (onTransferFund) {
        await onTransferFund({
          fromAccountId: withdrawFromId,
          toAccountId: withdrawToId,
          amount: amt,
          date: withdrawDate,
          purpose: 'BANK_WITHDRAWAL',
          reference: withdrawChequeNo,
          description: withdrawPurpose || 'ব্যাংক হতে নগদ ক্যাশ উত্তোলন',
        });
      }
      const fromAccName = accounts.find((a) => a.id === withdrawFromId)?.nameBn || 'ব্যাংক হিসাব';
      setWithdrawSuccessMsg(`৳ ${amt.toLocaleString('en-IN')} সফলভাবে ${fromAccName} হতে উত্তোলন করা হয়েছে (কন্ট্রা এন্ট্রি)।`);
      setWithdrawAmount('');
      setWithdrawChequeNo('');
      setTimeout(() => setWithdrawSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'ব্যাংক উত্তোলন ব্যর্থ হয়েছে।');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  // Inter-Account Transfer Handler (🔄 তহবিল স্থানান্তর)
  const handleDoTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('অনুগ্রহ করে সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (!transferFromId || !transferToId) {
      alert('অনুগ্রহ করে উৎস ও গন্তব্য হিসাব নির্বাচন করুন।');
      return;
    }
    if (transferFromId === transferToId) {
      alert('উৎস ও গন্তব্য হিসাব একই হতে পারে না।');
      return;
    }

    try {
      setTransferSubmitting(true);
      if (onTransferFund) {
        await onTransferFund({
          fromAccountId: transferFromId,
          toAccountId: transferToId,
          amount: amt,
          date: transferDate,
          purpose: transferPurpose,
          reference: transferRef,
          description: transferNotes,
        });
      }
      setTransferSuccessMsg(`৳ ${amt.toLocaleString('en-IN')} তহবিল সফলভাবে স্থানান্তর করা হয়েছে।`);
      setTransferAmount('');
      setTransferRef('');
      setTransferNotes('');
      setTimeout(() => setTransferSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'তহবিল স্থানান্তর ব্যর্থ হয়েছে।');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Save Reconciliation Snapshot
  const handleSaveReconciliation = () => {
    const acc = accounts.find((a) => a.id === reconAccountId);
    const stmtBal = parseFloat(reconStatementBalance) || reconBookBalance;
    const diff = stmtBal - reconBookBalance;

    const newLog = {
      id: `recon-${Date.now()}`,
      date: reconStatementDate,
      accountName: acc?.nameBn || 'ব্যাংক হিসাব',
      bookBalance: reconBookBalance,
      statementBalance: stmtBal,
      difference: diff,
      status: diff === 0 ? ('VERIFIED' as const) : ('DISCREPANCY' as const),
      verifiedBy: reconVerifiedBy || currentUser?.name || 'হিসাবরক্ষক',
    };

    setReconciliationLogs([newLog, ...reconciliationLogs]);
    setReconSuccessMsg('ব্যাংক সমন্বয়ের স্ন্যাপশট সফলভাবে সংরক্ষিত হয়েছে।');
    setTimeout(() => setReconSuccessMsg(''), 4000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportBankLedgerToExcel({
      mosqueName: currentMosque?.name || 'মসজিদ ম্যানেজমেন্ট সিস্টেম',
      accountName: activeAccountObj?.nameBn || 'সকল ব্যাংক ও এমএফএস হিসাব',
      accountNumberMasked: maskAccountNumber(activeAccountObj?.accountNumber),
      periodLabel: `${formatDate(startDate)} হতে ${formatDate(endDate)}`,
      openingBalance: ledgerResult.openingBalance,
      closingBalance: ledgerResult.closingBalance,
      totalDebit: ledgerResult.totalDebit,
      totalCredit: ledgerResult.totalCredit,
      entries: ledgerResult.displayEntries,
    });
  };

  // Grouping for Summary Views
  const dailySummary = useMemo(() => {
    const map: Record<string, { date: string; debit: number; credit: number; count: number }> = {};
    ledgerResult.displayEntries.forEach((e) => {
      if (!map[e.date]) {
        map[e.date] = { date: e.date, debit: 0, credit: 0, count: 0 };
      }
      map[e.date].debit += e.debit;
      map[e.date].credit += e.credit;
      map[e.date].count += 1;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [ledgerResult.displayEntries]);

  const monthlySummary = useMemo(() => {
    const map: Record<string, { month: string; debit: number; credit: number; count: number }> = {};
    ledgerResult.displayEntries.forEach((e) => {
      const monthKey = e.date.slice(0, 7);
      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, debit: 0, credit: 0, count: 0 };
      }
      map[monthKey].debit += e.debit;
      map[monthKey].credit += e.credit;
      map[monthKey].count += 1;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [ledgerResult.displayEntries]);

  const yearlySummary = useMemo(() => {
    const map: Record<string, { year: string; debit: number; credit: number; count: number }> = {};
    ledgerResult.displayEntries.forEach((e) => {
      const yearKey = e.date.slice(0, 4);
      if (!map[yearKey]) {
        map[yearKey] = { year: yearKey, debit: 0, credit: 0, count: 0 };
      }
      map[yearKey].debit += e.debit;
      map[yearKey].credit += e.credit;
      map[yearKey].count += 1;
    });
    return Object.values(map).sort((a, b) => b.year.localeCompare(a.year));
  }, [ledgerResult.displayEntries]);

  // Filtered accounts in ACCOUNTS_FUNDS tab
  const displayedAccounts = useMemo(() => {
    if (accountTypeFilter === 'BANK') return bankAccountsOnly;
    if (accountTypeFilter === 'MFS') return mfsAccountsOnly;
    if (accountTypeFilter === 'CASH') return cashAccounts;
    return accounts;
  }, [accounts, accountTypeFilter, bankAccountsOnly, mfsAccountsOnly, cashAccounts]);

  // Secondary Sidebar Items for Bank Ledger (Level 3 - Exact 10 items)
  const sidebarItems: SecondarySidebarItem[] = [
    { id: 'BANK_LEDGER', label: '📋 ব্যাংক খতিয়ান', icon: Landmark },
    { id: 'ACCOUNTS_FUNDS', label: '🏦 ব্যাংক ও হিসাব', icon: Building, badge: accounts.length },
    { id: 'DEPOSIT', label: '➕ টাকা জমা', icon: Plus, isAction: true },
    { id: 'WITHDRAWAL', label: '➖ টাকা উত্তোলন', icon: Minus, isAction: true },
    { id: 'FUND_TRANSFER', label: '🔄 তহবিল স্থানান্তর', icon: ArrowRightLeft, isAction: true },
    { id: 'SEARCH', label: '🔎 লেনদেন অনুসন্ধান', icon: Search },
    { id: 'RECONCILIATION', label: '🔄 ব্যাংক সমন্বয়', icon: RefreshCw },
    { id: 'SUMMARY', label: '📊 দৈনিক/মাসিক/বার্ষিক সারাংশ', icon: Filter },
    { id: 'STATEMENT_IMPORT', label: '🧾 ব্যাংক স্টেটমেন্ট', icon: FileText },
    { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
  ];

  return (
    <div className="space-y-4 font-siliguri">
      {/* Top Banner when internal sidebar is visible */}
      {!hideInternalSidebar && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  🏦 আর্থিক হিসাব ও ব্যাংক খতিয়ান
                </span>
              </div>
              <h1 className="text-xl font-black text-slate-900 mt-1 flex items-center space-x-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <span>ব্যাংক খতিয়ান ও তহবিল ব্যবস্থাপনা (Financial Accounts & Bank Ledger)</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের সকল ব্যাংক, এমএফএস ও নগদ ক্যাশ ফান্ড পরিচালনা, জমা, উত্তোলন ও সমন্বয়
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setAccountToEdit(null);
                  setIsAccountModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ নতুন হিসাব</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSubTab('DEPOSIT')}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>টাকা জমা</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSubTab('WITHDRAWAL')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>উত্তোলন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Layout with Secondary Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {!hideInternalSidebar && (
          <FinancialSecondarySidebar
            title="ব্যাংক ও তহবিল অপশন"
            moduleBadge="ব্যাংক বুক"
            items={sidebarItems}
            activeItemId={activeSubItem}
            onSelectItem={handleSelectSubTab}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 w-full space-y-4">
          {/* =========================================================================
              1. BANK LEDGER TAB (📋 ব্যাংক খতিয়ান)
          ========================================================================== */}
          {activeSubItem === 'BANK_LEDGER' && (
            <>
              {/* Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Account Selector */}
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                      হিসাব নির্বাচন:
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      <option value="BANK">সকল ব্যাংক ও এমএফএস হিসাব ({bankAndMfsAccounts.length}টি)</option>
                      {bankAndMfsAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} ({maskAccountNumber(acc.accountNumber)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Presets */}
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    {(
                      [
                        { id: 'THIS_MONTH', label: 'চলতি মাস' },
                        { id: 'LAST_MONTH', label: 'পূর্বের মাস' },
                        { id: 'THIS_YEAR', label: 'চলতি বছর' },
                        { id: 'ALL', label: 'সকল' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleDatePreset(p.id)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          datePreset === p.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Inputs & Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">হতে</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setDatePreset('CUSTOM');
                        setStartDate(e.target.value);
                      }}
                      className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">পর্যন্ত</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setDatePreset('CUSTOM');
                        setEndDate(e.target.value);
                      }}
                      className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">লেনদেনের ধরন</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      <option value="ALL">সকল লেনদেন</option>
                      <option value="INCOME">শুধুমাত্র জমা (Deposit / In)</option>
                      <option value="EXPENSE">শুধুমাত্র উত্তোলন (Withdrawal / Out)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">অনুসন্ধান</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ভাউচার / চেক / বিবরণ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Financial Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Opening Balance */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="text-xs text-slate-500 font-semibold block">প্রারম্ভিক স্থিতি</span>
                  <span className="text-base font-black font-mono text-slate-900 block mt-1">
                    ৳ {ledgerResult.openingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatDate(startDate)}-এর পূর্বের জের
                  </span>
                </div>

                {/* 2. Total Debit (Deposit) */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-bold">মোট জমা (Deposit)</span>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-base font-black font-mono text-emerald-800 block mt-1">
                    ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                    আয় ও ব্যাংক জমা
                  </span>
                </div>

                {/* 3. Total Credit (Withdrawal) */}
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-rose-700 font-bold">মোট উত্তোলন (Withdrawal)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <span className="text-base font-black font-mono text-rose-800 block mt-1">
                    ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-rose-600 block mt-0.5 font-medium">
                    ব্যয় ও ব্যাংক হতে উত্তোলন
                  </span>
                </div>

                {/* 4. Closing Balance */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-indigo-700 font-bold">সমাপনী স্থিতি (Closing)</span>
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-base font-black font-mono text-indigo-950 block mt-1">
                    ৳ {ledgerResult.closingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-indigo-600 block mt-0.5 font-medium">
                    {formatDate(endDate)} তারিখের স্থিতি
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs">
                <div className="text-xs font-semibold text-slate-600">
                  মোট লেনদেন: <span className="font-bold text-slate-900">{ledgerResult.displayEntries.length}</span> টি
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>এক্সেল এক্সপোর্ট</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট ভিউ</span>
                  </button>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5 text-center w-12">ক্রম</th>
                        <th className="p-2.5">তারিখ</th>
                        <th className="p-2.5">ভাউচার / চেক</th>
                        <th className="p-2.5">খাত ও বিবরণ</th>
                        <th className="p-2.5">প্রাপক / দাতা</th>
                        <th className="p-2.5">হিসাব</th>
                        <th className="p-2.5 text-right text-emerald-700">জমা (৳)</th>
                        <th className="p-2.5 text-right text-rose-700">উত্তোলন (৳)</th>
                        <th className="p-2.5 text-right text-indigo-900">চলমান জের (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/80 font-bold text-slate-800 italic">
                        <td className="p-2.5 text-center">—</td>
                        <td className="p-2.5 font-mono">{formatDate(startDate)}</td>
                        <td className="p-2.5 font-mono">OB-BALANCE</td>
                        <td className="p-2.5 text-indigo-900" colSpan={3}>
                          প্রারম্ভিক স্থিতি (Opening Balance B/F)
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-700">
                          {ledgerResult.openingBalance >= 0 ? `৳ ${ledgerResult.openingBalance.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-700">
                          {ledgerResult.openingBalance < 0 ? `৳ ${Math.abs(ledgerResult.openingBalance).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-indigo-950 font-black">
                          ৳ {ledgerResult.openingBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Entries */}
                      {ledgerResult.displayEntries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            নির্বাচিত ফিল্টারে কোনো ব্যাংক লেনদেন পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        ledgerResult.displayEntries.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                              {formatDate(item.date)}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {item.voucherNumber}
                            </td>
                            <td className="p-2.5 max-w-xs">
                              <span className="font-bold text-slate-900 block">{item.headNameBn}</span>
                              {item.description && (
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {item.description}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600">{item.partyName || '—'}</td>
                            <td className="p-2.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {item.accountName}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              {item.debit > 0 ? `৳ ${item.debit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                              {item.credit > 0 ? `৳ ${item.credit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                              ৳ {item.runningBalance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Total Period Row */}
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td className="p-2.5 text-center" colSpan={6}>
                          মোট পিরিয়ড যোগফল (Total Flow)
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800">
                          ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-rose-800">
                          ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-indigo-950 font-black">
                          ৳ {ledgerResult.closingBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              2. ACCOUNTS & FUNDS TAB (🏦 ব্যাংক ও হিসাব)
          ========================================================================== */}
          {activeSubItem === 'ACCOUNTS_FUNDS' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              {/* Header with KPI cards */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    <span>মসজিদের সকল আর্থিক হিসাব (Financial Accounts)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    বাণিজ্যিক ব্যাংক, ইসলামী ব্যাংক, মোবাইল ব্যাংকিং (MFS) এবং নগদ ক্যাশ ফান্ড
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAccountToEdit(null);
                    setIsAccountModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ নতুন আর্থিক হিসাব যোগ করুন</span>
                </button>
              </div>

              {/* KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700">বাণিজ্যিক ও ইসলামিক ব্যাংক ({bankAccountsOnly.length}টি)</span>
                    <Landmark className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-lg font-black font-mono text-indigo-950 block mt-1">
                    ৳ {totalBankBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">মোবাইল ব্যাংকিং MFS ({mfsAccountsOnly.length}টি)</span>
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-lg font-black font-mono text-emerald-950 block mt-1">
                    ৳ {totalMfsBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">নগদ ক্যাশ ব্যালেন্স</span>
                    <Wallet className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-lg font-black font-mono text-amber-950 block mt-1">
                    ৳ {cashAccounts.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-1.5 text-xs">
                {(
                  [
                    { id: 'ALL', label: `সকল হিসাব (${accounts.length})` },
                    { id: 'BANK', label: `ব্যাংক হিসাব (${bankAccountsOnly.length})` },
                    { id: 'MFS', label: `মোবাইল ব্যাংকিং (${mfsAccountsOnly.length})` },
                    { id: 'CASH', label: `ক্যাশ ফান্ড (${cashAccounts.length})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAccountTypeFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      accountTypeFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Accounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedAccounts.map((acc) => {
                  const isUnmasked = !!unmaskedAccounts[acc.id];
                  const displayNumber = isUnmasked ? acc.accountNumber : maskAccountNumber(acc.accountNumber);

                  return (
                    <div
                      key={acc.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-3 shadow-2xs"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                              acc.accountType === 'BANK'
                                ? 'bg-indigo-100 text-indigo-700'
                                : acc.accountType === 'MFS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : acc.accountType === 'CASH'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {acc.accountType === 'BANK' && <Landmark className="w-5 h-5" />}
                            {acc.accountType === 'MFS' && <Smartphone className="w-5 h-5" />}
                            {acc.accountType === 'CASH' && <Wallet className="w-5 h-5" />}
                            {acc.accountType === 'OTHER' && <CreditCard className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block">{acc.nameBn}</span>
                            <span className="text-[11px] text-slate-500 font-medium block">
                              {acc.bankName || acc.mfsProvider || acc.accountType}
                              {acc.branchName ? ` — ${acc.branchName}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              acc.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : acc.status === 'INACTIVE'
                                ? 'bg-slate-100 text-slate-600 border-slate-300'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {acc.status === 'ACTIVE' ? 'সক্রিয়' : acc.status === 'INACTIVE' ? 'নিষ্ক্রিয়' : 'বন্ধ'}
                          </span>
                        </div>
                      </div>

                      {/* Middle row: Account / Mobile Number & Current Balance */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {acc.accountType === 'MFS' ? 'মোবাইল নম্বর' : 'হিসাব নম্বর'}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono font-bold text-slate-800 block">
                              {displayNumber || '—'}
                            </span>
                            {acc.accountNumber && (
                              <button
                                type="button"
                                onClick={() => toggleAccountMask(acc.id)}
                                title={isUnmasked ? 'নম্বর লুকান' : 'নম্বর দেখুন'}
                                className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {isUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">বর্তমান সঞ্চিতি / জের</span>
                          <span className="text-base font-black font-mono text-emerald-800 block">
                            ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(acc.id);
                              handleSelectSubTab('BANK_LEDGER');
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <Landmark className="w-3 h-3" />
                            <span>খতিয়ান</span>
                          </button>

                          {(acc.accountType === 'BANK' || acc.accountType === 'MFS') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setDepositToId(acc.id);
                                  handleSelectSubTab('DEPOSIT');
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>জমা</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setWithdrawFromId(acc.id);
                                  handleSelectSubTab('WITHDRAWAL');
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <Minus className="w-3 h-3" />
                                <span>উত্তোলন</span>
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAccountToEdit(acc);
                              setIsAccountModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(acc)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                            title={acc.status === 'ACTIVE' ? 'হিসাব নিষ্ক্রিয় করুন' : 'হিসাব সক্রিয় করুন'}
                          >
                            {acc.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              3. DEPOSIT TAB (➕ টাকা জমা - Dedicated Bank Deposit Workflow)
          ========================================================================== */}
          {activeSubItem === 'DEPOSIT' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>ব্যাংক হিসাব বা এমএফএস-এ টাকা জমা (Bank Deposit Entry)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  হাতে থাকা ক্যাশ বা দানবক্সের টাকা মসজিদে অফিসিয়াল ব্যাংক হিসাবে জমা করার ভাউচার
                </p>
              </div>

              {/* Accounting Safeguard Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-emerald-950">
                <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">অ্যাকাউন্টিং কন্ট্রা এন্ট্রির নিয়ম:</span>
                  <span>
                    নগদ তহবিল ব্যাংকে জমা করলে এটি অভ্যন্তরীণ স্থানান্তর (Contra Entry) হিসেবে গণ্য হয়। এটি কোনো নতুন আয় বা ব্যয় নয়। ফলে মসজিদের সামগ্রিক মোট তহবিল অপরিবর্তিত থাকে—শুধু নগদ ক্যাশ কমে ব্যাংক ব্যালেন্স বৃদ্ধি পায়।
                  </span>
                </div>
              </div>

              {/* Deposit Form */}
              <form onSubmit={handleDoDeposit} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* From Account */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      উৎস হিসাব (যেখান থেকে টাকা জমা দেওয়া হচ্ছে) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={depositFromId}
                      onChange={(e) => setDepositFromId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                      required
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} (বর্তমান জের: ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Bank Account */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      গন্তব্য ব্যাংক / এমএফএস হিসাব <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={depositToId}
                      onChange={(e) => setDepositToId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                      required
                    >
                      {bankAndMfsAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} ({maskAccountNumber(acc.accountNumber)}) — জের: ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      জমার পরিমাণ (৳) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="০.০০"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                      required
                    />
                    {/* Quick Amount Buttons */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDepositAmount(String(amt))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold rounded cursor-pointer"
                        >
                          +{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">জমার তারিখ</label>
                    <input
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                      required
                    />
                  </div>

                  {/* Slip / Ref */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ডিপোজিট স্লিপ / চালান নং</label>
                    <input
                      type="text"
                      placeholder="ব্যাংকের জমা স্লিপ বা রেফারেন্স নম্বর..."
                      value={depositSlipRef}
                      onChange={(e) => setDepositSlipRef(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">মন্তব্য / বিবরণ</label>
                    <input
                      type="text"
                      placeholder="উদাঃ জুমার নামাজ কালেকশন ব্যাংকে জমা..."
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* Real-time Preview */}
                {parseFloat(depositAmount) > 0 && depositFromId !== depositToId && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-emerald-900 block">জমার পূর্বরূপ ও ব্যালেন্স প্রভাব:</span>
                    <div className="flex items-center space-x-2 text-slate-700">
                      <span className="font-semibold text-rose-700">
                        {accounts.find((a) => a.id === depositFromId)?.nameBn}: -৳ {parseFloat(depositAmount).toLocaleString('en-IN')}
                      </span>
                      <span>➔</span>
                      <span className="font-semibold text-emerald-700">
                        {accounts.find((a) => a.id === depositToId)?.nameBn}: +৳ {parseFloat(depositAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {depositSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{depositSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{depositSubmitting ? 'প্রসেস করা হচ্ছে...' : 'ব্যাংকে টাকা জমা সম্পন্ন করুন'}</span>
                </button>
              </form>
            </div>
          )}

          {/* =========================================================================
              4. WITHDRAWAL TAB (➖ টাকা উত্তোলন - Dedicated Bank Withdrawal Workflow)
          ========================================================================== */}
          {activeSubItem === 'WITHDRAWAL' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Minus className="w-5 h-5 text-rose-600" />
                  <span>ব্যাংক হিসাব হতে টাকা উত্তোলন (Bank Withdrawal Entry)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  মসজিদ পরিচালনার প্রয়োজনে ব্যাংক হতে নগদ ক্যাশ বা এমএফএস-এ অর্থ উত্তোলন
                </p>
              </div>

              {/* Safeguard Banner */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-rose-950">
                <Info className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">অ্যাকাউন্টিং কন্ট্রা এন্ট্রির নিয়ম:</span>
                  <span>
                    ব্যাংক থেকে নগদ অর্থ উত্তোলন করলে এটি একটি অভ্যন্তরীণ স্থানান্তর (Contra Entry)। এটি মসজিদের কোনো ব্যয় নয়। ব্যাংক ব্যালেন্স কমবে এবং সমপরিমাণ নগদ ক্যাশ ব্যালেন্স বৃদ্ধি পাবে।
                  </span>
                </div>
              </div>

              {/* Withdrawal Form */}
              <form onSubmit={handleDoWithdrawal} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* From Bank Account */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      উৎস ব্যাংক হিসাব (যেখান থেকে উত্তোলন করা হচ্ছে) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={withdrawFromId}
                      onChange={(e) => setWithdrawFromId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 bg-white"
                      required
                    >
                      {bankAndMfsAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} ({maskAccountNumber(acc.accountNumber)}) — বর্তমান জের: ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Account (Cash) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      গন্তব্য হিসাব (যেখানে টাকা রাখা হবে) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={withdrawToId}
                      onChange={(e) => setWithdrawToId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 bg-white"
                      required
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} (বর্তমান জের: ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      উত্তোলনের পরিমাণ (৳) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="০.০০"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 bg-white"
                      required
                    />
                    {/* Quick Amount Buttons */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {[5000, 10000, 20000, 50000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setWithdrawAmount(String(amt))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold rounded cursor-pointer"
                        >
                          +{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">উত্তোলনের তারিখ</label>
                    <input
                      type="date"
                      value={withdrawDate}
                      onChange={(e) => setWithdrawDate(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 bg-white"
                      required
                    />
                  </div>

                  {/* Cheque No */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">চেক নম্বর / স্লিপ নম্বর</label>
                    <input
                      type="text"
                      placeholder="ইস্যুকৃত চেক নম্বর..."
                      value={withdrawChequeNo}
                      onChange={(e) => setWithdrawChequeNo(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 bg-white"
                    />
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">উত্তোলনের উদ্দেশ্য</label>
                    <input
                      type="text"
                      placeholder="উদাঃ ইমাম ও মুয়াজ্জিনের মাসিক বেতন বা দৈনন্দিন বাজার খরচ..."
                      value={withdrawPurpose}
                      onChange={(e) => setWithdrawPurpose(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-rose-500 bg-white"
                    />
                  </div>
                </div>

                {/* Real-time Preview */}
                {parseFloat(withdrawAmount) > 0 && withdrawFromId !== withdrawToId && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-rose-900 block">উত্তোলনের পূর্বরূপ ও ব্যালেন্স প্রভাব:</span>
                    <div className="flex items-center space-x-2 text-slate-700">
                      <span className="font-semibold text-rose-700">
                        {accounts.find((a) => a.id === withdrawFromId)?.nameBn}: -৳ {parseFloat(withdrawAmount).toLocaleString('en-IN')}
                      </span>
                      <span>➔</span>
                      <span className="font-semibold text-emerald-700">
                        {accounts.find((a) => a.id === withdrawToId)?.nameBn}: +৳ {parseFloat(withdrawAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {withdrawSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{withdrawSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={withdrawSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <Minus className="w-4 h-4" />
                  <span>{withdrawSubmitting ? 'প্রসেস করা হচ্ছে...' : 'টাকা উত্তোলন সম্পন্ন করুন'}</span>
                </button>
              </form>
            </div>
          )}

          {/* =========================================================================
              5. FUND TRANSFER TAB (🔄 তহবিল স্থানান্তর)
          ========================================================================== */}
          {activeSubItem === 'FUND_TRANSFER' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                  <span>তহবিল স্থানান্তর (Inter-Account Fund Transfer)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  এক হিসাব থেকে অন্য হিসাবে ব্যালেন্স স্থানান্তর করুন (Cash ↔ Bank ↔ MFS)
                </p>
              </div>

              {/* Safeguard & Accounting Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-blue-900">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">অ্যাকাউন্টিং কন্ট্রা ট্রান্সফারের নিয়ম:</span>
                  <span>
                    এক অ্যাকাউন্ট থেকে অন্য অ্যাকাউন্টে টাকা স্থানান্তরের ফলে মসজিদের মোট সামগ্রিক তহবিল অপরিবর্তিত থাকে। এটি কোনো আয় বা ব্যয় নয়, বরং একটি অভ্যন্তরীণ ট্রান্সফার (Contra Entry)।
                  </span>
                </div>
              </div>

              {/* Transfer Form */}
              <form onSubmit={handleDoTransfer} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* From Account */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      উৎস হিসাব (From Account) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={transferFromId}
                      onChange={(e) => setTransferFromId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                      required
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} (বর্তমান: ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Account */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      গন্তব্য হিসাব (To Account) <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={transferToId}
                      onChange={(e) => setTransferToId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                      required
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} (বর্তমান: ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      স্থানান্তরের পরিমাণ (৳) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="০.০০"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">স্থানান্তরের তারিখ</label>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                      required
                    />
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">স্থানান্তরের উদ্দেশ্য</label>
                    <select
                      value={transferPurpose}
                      onChange={(e) => setTransferPurpose(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      <option value="GENERAL_TRANSFER">সাধারণ তহবিল স্থানান্তর</option>
                      <option value="JUMUAH_DEPOSIT">জুমার কালেকশন ব্যাংকে জমা</option>
                      <option value="EXPENSE_WITHDRAWAL">মসজিদ খরচের জন্য ক্যাশ উত্তোলন</option>
                      <option value="MFS_SETTLEMENT">বিকাশ/নগদ ব্যালেন্স ব্যাংক হিসাবে জমা</option>
                      <option value="PROJECT_FUND">বিশেষ প্রকল্প বা সংস্কার তহবিলে স্থানান্তর</option>
                      <option value="OTHER">অন্যান্য অভ্যন্তরীণ ট্রান্সফার</option>
                    </select>
                  </div>

                  {/* Reference / Cheque */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">রেফারেন্স / চেক নং / স্লিপ</label>
                    <input
                      type="text"
                      placeholder="চেক নম্বর বা ডিপোজিট স্লিপ..."
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    />
                  </div>

                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">মন্তব্য / বিবরণ</label>
                    <input
                      type="text"
                      placeholder="স্থানান্তরের বিস্তারিত উদ্দেশ্য বা নোট..."
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Real-time Impact Preview */}
                {parseFloat(transferAmount) > 0 && transferFromId !== transferToId && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-indigo-900 block">স্থানান্তরের পূর্বরূপ (Preview):</span>
                    <div className="flex items-center space-x-2 text-slate-700">
                      <span className="font-semibold text-rose-700">
                        {accounts.find((a) => a.id === transferFromId)?.nameBn}: -৳{' '}
                        {parseFloat(transferAmount).toLocaleString('en-IN')}
                      </span>
                      <span>➔</span>
                      <span className="font-semibold text-emerald-700">
                        {accounts.find((a) => a.id === transferToId)?.nameBn}: +৳{' '}
                        {parseFloat(transferAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                {transferSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{transferSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{transferSubmitting ? 'প্রসেস করা হচ্ছে...' : 'তহবিল স্থানান্তর সম্পন্ন করুন'}</span>
                </button>
              </form>

              {/* Recent Transfers List */}
              {transfers.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>সাম্প্রতিক স্থানান্তরসমূহ ({transfers.length} টি)</span>
                    <span className="text-[11px] text-slate-500 font-normal">সর্বশেষ রেকর্ডকৃত কন্ট্রা ভাউচার</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">তারিখ</th>
                        <th className="p-2.5">ট্রান্সফার নং</th>
                        <th className="p-2.5">উৎস হিসাব</th>
                        <th className="p-2.5">গন্তব্য হিসাব</th>
                        <th className="p-2.5">উদ্দেশ্য / রেফারেন্স</th>
                        <th className="p-2.5 text-right">পরিমাণ (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers.slice(0, 10).map((trf) => (
                        <tr key={trf.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">{formatDate(trf.date || trf.createdAt)}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-800">{trf.transferNumber}</td>
                          <td className="p-2.5 text-rose-700 font-semibold">{trf.fromAccountName}</td>
                          <td className="p-2.5 text-emerald-700 font-semibold">{trf.toAccountName}</td>
                          <td className="p-2.5 text-slate-600">
                            {trf.purpose || trf.reference || trf.description || '—'}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ৳ {Number(trf.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              6. SEARCH TAB (🔎 লেনদেন অনুসন্ধান)
          ========================================================================== */}
          {activeSubItem === 'SEARCH' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Search className="w-5 h-5 text-indigo-600" />
                <span>ব্যাংক লেনদেন অনুসন্ধান</span>
              </h2>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ভাউচার, চেক নম্বর, ট্রানজ্যাকশন আইডি, প্রাপক বা বিবরণ খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">তারিখ</th>
                      <th className="p-2.5">ভাউচার / চেক</th>
                      <th className="p-2.5">হিসাব</th>
                      <th className="p-2.5">বিবরণ</th>
                      <th className="p-2.5 text-right text-emerald-700">জমা</th>
                      <th className="p-2.5 text-right text-rose-700">উত্তোলন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerResult.displayEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          কোনো ফলাফল পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      ledgerResult.displayEntries.slice(0, 20).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">{formatDate(item.date)}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-800">{item.voucherNumber}</td>
                          <td className="p-2.5">{item.accountName}</td>
                          <td className="p-2.5">{item.headNameBn}</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700">
                            {item.debit > 0 ? `৳ ${item.debit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-700">
                            {item.credit > 0 ? `৳ ${item.credit.toLocaleString('en-IN')}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              7. BANK RECONCILIATION TAB (🔄 ব্যাংক সমন্বয়)
          ========================================================================== */}
          {activeSubItem === 'RECONCILIATION' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600" />
                  <span>ব্যাংক সমন্বয় বিবরণী (Bank Reconciliation Statement)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  সিস্টেমের লেজার ব্যালেন্সের সাথে ব্যাংকের মূল স্টেটমেন্টের ব্যালেন্স সমন্বয় ও অমিল যাচাই
                </p>
              </div>

              {/* Form Card */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ব্যাংক হিসাব নির্বাচন</label>
                    <select
                      value={reconAccountId}
                      onChange={(e) => setReconAccountId(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      {bankAndMfsAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} ({maskAccountNumber(acc.accountNumber)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">স্টেটমেন্টের তারিখ</label>
                    <input
                      type="date"
                      value={reconStatementDate}
                      onChange={(e) => setReconStatementDate(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      সিস্টেম বুক ব্যালেন্স (Book Balance)
                    </label>
                    <div className="text-sm font-mono font-bold text-slate-900 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                      ৳ {reconBookBalance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ব্যাংক স্টেটমেন্ট ব্যালেন্স (Bank Statement Balance)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="০.০০"
                      value={reconStatementBalance}
                      onChange={(e) => setReconStatementBalance(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    />
                  </div>

                  {/* Discrepancy Box */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">অমিল / পার্থক্য (Difference)</label>
                    <div
                      className={`text-sm font-mono font-bold px-3 py-2 border rounded-lg ${
                        reconDiff === 0 && reconStatementBalance
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : reconDiff !== 0 && reconStatementBalance
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-white text-slate-500 border-slate-300'
                      }`}
                    >
                      {reconStatementBalance ? (
                        reconDiff === 0 ? (
                          '৳ ০.০০ (সমন্বিত / Balanced)'
                        ) : (
                          `৳ ${reconDiff.toLocaleString('en-IN')} (${reconDiff > 0 ? 'স্টেটমেন্টে বেশি' : 'লেজারে বেশি'})`
                        )
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">যাচাইকারী কর্মকর্তা</label>
                    <input
                      type="text"
                      value={reconVerifiedBy}
                      onChange={(e) => setReconVerifiedBy(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      পার্থক্য বিবরণ (ইস্যুকৃত কিন্তু অদ্যাবধি আনক্লিয়ার্ড চেক বা ট্রানজিট জমা)
                    </label>
                    <input
                      type="text"
                      placeholder="উদাঃ চেক নং ৪৪৫৫৬৬ এখনও ব্যাংকে ক্লিয়ার হয়নি বা ব্যাংকের মাসিক চার্জ..."
                      value={reconOutstandingCheques}
                      onChange={(e) => setReconOutstandingCheques(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {reconSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{reconSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveReconciliation}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  ব্যাংক সমন্বয় স্ন্যাপশট সংরক্ষণ করুন
                </button>
              </div>

              {/* Saved Reconciliation Records */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  সংরক্ষিত ব্যাংক সমন্বয় লগ ({reconciliationLogs.length} টি)
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">তারিখ</th>
                      <th className="p-2.5">ব্যাংক হিসাব</th>
                      <th className="p-2.5 text-right">বুক ব্যালেন্স</th>
                      <th className="p-2.5 text-right">স্টেটমেন্ট ব্যালেন্স</th>
                      <th className="p-2.5 text-right">পার্থক্য</th>
                      <th className="p-2.5 text-center">অবস্থা</th>
                      <th className="p-2.5">যাচাইকারী</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono">{formatDate(log.date)}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{log.accountName}</td>
                        <td className="p-2.5 text-right font-mono">৳ {log.bookBalance.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-mono">৳ {log.statementBalance.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {log.difference === 0 ? '৳ ০.০০' : `৳ ${log.difference.toLocaleString('en-IN')}`}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.status === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {log.status === 'VERIFIED' ? 'সমন্বিত' : 'পার্থক্যযুক্ত'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{log.verifiedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              8. SUMMARY TAB (📊 দৈনিক/মাসিক/বার্ষিক সারাংশ)
          ========================================================================== */}
          {activeSubItem === 'SUMMARY' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    <span>ব্যাংক লেনদেন সারাংশ ও ট্রেন্ড বিশ্লেষণ</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    দৈনিক, মাসিক, বার্ষিক ও অ্যাকাউন্টভিত্তিক ব্যাংকিং প্রবাহ
                  </p>
                </div>

                {/* Sub-tab pills */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs">
                  {(
                    [
                      { id: 'DAILY', label: '📅 দৈনিক' },
                      { id: 'MONTHLY', label: '🗓️ মাসিক' },
                      { id: 'YEARLY', label: '📈 বার্ষিক' },
                      { id: 'BY_ACCOUNT', label: '🏦 হিসাবভিত্তিক' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSummaryTab(t.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        summaryTab === t.id
                          ? 'bg-white text-indigo-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 block">মোট ব্যাংক জমা (Debit)</span>
                  <span className="text-lg font-black font-mono text-emerald-950 block mt-1">
                    ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-700 block">মোট উত্তোলন (Credit)</span>
                  <span className="text-lg font-black font-mono text-rose-950 block mt-1">
                    ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-xs font-bold text-indigo-700 block">নিট ব্যাংক প্রবাহ (Net Change)</span>
                  <span className="text-lg font-black font-mono text-indigo-950 block mt-1">
                    ৳ {ledgerResult.netChange.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* 1. Daily Table */}
              {summaryTab === 'DAILY' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">তারিখ</th>
                        <th className="p-2.5 text-center">লেনদেন সংখ্যা</th>
                        <th className="p-2.5 text-right text-emerald-700">মোট জমা (৳)</th>
                        <th className="p-2.5 text-right text-rose-700">মোট উত্তোলন (৳)</th>
                        <th className="p-2.5 text-right text-indigo-900">নিট প্রবাহ (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dailySummary.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-800">{formatDate(row.date)}</td>
                          <td className="p-2.5 text-center font-mono">{row.count} টি</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700">৳ {row.debit.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono text-rose-700">৳ {row.credit.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ৳ {(row.debit - row.credit).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. Monthly Table */}
              {summaryTab === 'MONTHLY' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">মাস</th>
                        <th className="p-2.5 text-center">লেনদেন সংখ্যা</th>
                        <th className="p-2.5 text-right text-emerald-700">মোট জমা (৳)</th>
                        <th className="p-2.5 text-right text-rose-700">মোট উত্তোলন (৳)</th>
                        <th className="p-2.5 text-right text-indigo-900">নিট প্রবৃদ্ধি (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlySummary.map((row) => (
                        <tr key={row.month} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{row.month}</td>
                          <td className="p-2.5 text-center font-mono">{row.count} টি</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700">৳ {row.debit.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono text-rose-700">৳ {row.credit.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ৳ {(row.debit - row.credit).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. Yearly Table */}
              {summaryTab === 'YEARLY' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">অর্থবছর / সাল</th>
                        <th className="p-2.5 text-center">লেনদেন সংখ্যা</th>
                        <th className="p-2.5 text-right text-emerald-700">মোট জমা (৳)</th>
                        <th className="p-2.5 text-right text-rose-700">মোট উত্তোলন (৳)</th>
                        <th className="p-2.5 text-right text-indigo-900">নিট সঞ্চিতি পরিবর্তন (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {yearlySummary.map((row) => (
                        <tr key={row.year} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{row.year} সাল</td>
                          <td className="p-2.5 text-center font-mono">{row.count} টি</td>
                          <td className="p-2.5 text-right font-mono text-emerald-700">৳ {row.debit.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono text-rose-700">৳ {row.credit.toLocaleString('en-IN')}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ৳ {(row.debit - row.credit).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 4. By Account Table */}
              {summaryTab === 'BY_ACCOUNT' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">হিসাবের নাম</th>
                        <th className="p-2.5">ধরন</th>
                        <th className="p-2.5">হিসাব নম্বর</th>
                        <th className="p-2.5 text-right">প্রারম্ভিক স্থিতি</th>
                        <th className="p-2.5 text-right text-emerald-700">বর্তমান সঞ্চিতি (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bankAndMfsAccounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{acc.nameBn}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              {acc.accountType}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">{maskAccountNumber(acc.accountNumber)}</td>
                          <td className="p-2.5 text-right font-mono">
                            ৳ {(Number(acc.openingBalance) || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-800">
                            ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              9. STATEMENT IMPORT TAB (🧾 ব্যাংক স্টেটমেন্ট)
          ========================================================================== */}
          {activeSubItem === 'STATEMENT_IMPORT' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>ব্যাংক স্টেটমেন্ট ভিউয়ার ও ইম্পোর্ট সেন্টার</span>
              </h2>
              <p className="text-xs text-slate-500">
                ব্যাংক থেকে ডাউনলোডকৃত ই-স্টেটমেন্ট (.CSV বা .XLSX) আপলোড করে স্বয়ংক্রিয় খসড়া মিলানোর সুবিধা
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-800 block">ব্যাংক স্টেটমেন্ট ফাইল নির্বাচন করুন</span>
                  <span className="text-xs text-slate-500 block mt-1">
                    .CSV বা .XLSX ফরম্যাটের ফাইল ড্র্যাগ করুন অথবা ক্লিক করে ব্রাউজ করুন
                  </span>
                </div>
                <input type="file" accept=".csv, .xlsx" className="hidden" id="bank-stmt-file" />
                <label
                  htmlFor="bank-stmt-file"
                  className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  ফাইল ব্রাউজ করুন
                </label>
              </div>

              {/* Standard format guide */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <span className="font-bold text-slate-800 block">স্টেটমেন্টের স্ট্যান্ডার্ড কলাম বিন্যাস:</span>
                <p className="text-[11px] leading-relaxed">
                  Date (তারিখ), Description (বিবরণ), Cheque/Ref No (চেক নম্বর), Debit (উত্তোলন), Credit (জমা), Balance (ব্যালেন্স)। সিস্টেম স্বয়ংক্রিয়ভাবে কলাম শনাক্ত করে লেজারের সাথে রিকনসাইল করার সুযোগ দেবে।
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              10. REPORTS & EXPORT TAB (🖨️ রিপোর্ট ও এক্সপোর্ট)
          ========================================================================== */}
          {activeSubItem === 'REPORTS' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Printer className="w-5 h-5 text-indigo-600" />
                    <span>ব্যাংক খতিয়ান রিপোর্ট ও এক্সপোর্ট সেন্টার</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    মসজিদের কার্যকরী কমিটির জন্য অডিট উপযোগী আনুষ্ঠানিক ব্যাংক খতিয়ান রিপোর্ট
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>এক্সেল রিপোর্ট</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>প্রিন্ট প্রিভিউ ও পিডিএফ</span>
                  </button>
                </div>
              </div>

              {/* Report Preview Document in page */}
              <div className="border border-slate-300 rounded-xl p-6 bg-white space-y-4 shadow-xs">
                <div className="text-center border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-black text-slate-900">
                    {currentMosque?.name || 'মসজিদ ম্যানেজমেন্ট সিস্টেম'}
                  </h3>
                  <p className="text-xs text-slate-500">{currentMosque?.address || 'বাংলাদেশ'}</p>
                  <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-md font-bold text-xs">
                    ব্যাংক খতিয়ান ও স্থিতি বিবরণী
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    হিসাব: {activeAccountObj?.nameBn || 'সকল ব্যাংক হিসাব'} | সময়কাল: {formatDate(startDate)} হতে {formatDate(endDate)}
                  </p>
                </div>

                {/* 4 Summary Stats in Document */}
                <div className="grid grid-cols-4 gap-3 text-center border-b border-slate-200 pb-4">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">প্রারম্ভিক স্থিতি</span>
                    <span className="text-sm font-bold font-mono text-slate-800 block">
                      ৳ {ledgerResult.openingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <span className="text-[10px] text-emerald-700 block">মোট জমা</span>
                    <span className="text-sm font-bold font-mono text-emerald-800 block">
                      ৳ {ledgerResult.totalDebit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <span className="text-[10px] text-rose-700 block">মোট উত্তোলন</span>
                    <span className="text-sm font-bold font-mono text-rose-800 block">
                      ৳ {ledgerResult.totalCredit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <span className="text-[10px] text-indigo-700 block">সমাপনী স্থিতি</span>
                    <span className="text-sm font-bold font-mono text-indigo-900 block">
                      ৳ {ledgerResult.closingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Sample rows preview */}
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">তারিখ</th>
                      <th className="p-2">ভাউচার / চেক</th>
                      <th className="p-2">খাত ও বিবরণ</th>
                      <th className="p-2 text-right">জমা (৳)</th>
                      <th className="p-2 text-right">উত্তোলন (৳)</th>
                      <th className="p-2 text-right">জের (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerResult.displayEntries.slice(0, 10).map((row) => (
                      <tr key={row.id}>
                        <td className="p-2 font-mono">{formatDate(row.date)}</td>
                        <td className="p-2 font-mono font-bold text-slate-800">{row.voucherNumber}</td>
                        <td className="p-2">{row.headNameBn}</td>
                        <td className="p-2 text-right font-mono text-emerald-700">
                          {row.debit > 0 ? `৳ ${row.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2 text-right font-mono text-rose-700">
                          {row.credit > 0 ? `৳ ${row.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          ৳ {row.runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs text-slate-700">
                  <div>
                    <div className="border-t border-slate-400 pt-1.5 font-bold">হিসাবরক্ষক</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1.5 font-bold">সাধারণ সম্পাদক</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-1.5 font-bold">সভাপতি</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Account Modal (Create / Edit) */}
      <FinancialAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        onSave={handleSaveAccount}
        accountToEdit={accountToEdit}
      />

      {/* Print / PDF Document Modal */}
      {isPrintModalOpen && (
        <ReportPrintDocument
          title="ব্যাংক খতিয়ান ও স্থিতি বিবরণী"
          subtitle={`হিসাব: ${activeAccountObj?.nameBn || 'সকল ব্যাংক হিসাব'} (${maskAccountNumber(activeAccountObj?.accountNumber)})`}
          period={`${formatDate(startDate)} হতে ${formatDate(endDate)}`}
          mosque={currentMosque}
          onClose={() => setIsPrintModalOpen(false)}
          summaryCards={[
            { label: 'প্রারম্ভিক স্থিতি', value: `৳ ${ledgerResult.openingBalance.toLocaleString('en-IN')}` },
            { label: 'মোট ব্যাংক জমা', value: `৳ ${ledgerResult.totalDebit.toLocaleString('en-IN')}`, color: 'emerald' },
            { label: 'মোট ব্যাংক উত্তোলন', value: `৳ ${ledgerResult.totalCredit.toLocaleString('en-IN')}`, color: 'rose' },
            { label: 'সমাপনী স্থিতি', value: `৳ ${ledgerResult.closingBalance.toLocaleString('en-IN')}`, color: 'indigo' },
          ]}
          columns={[
            { header: 'ক্রম', key: 'sl', align: 'center', width: '40px' },
            { header: 'তারিখ', key: 'date', align: 'left', width: '80px' },
            { header: 'ভাউচার / চেক', key: 'voucher', align: 'left', width: '100px' },
            { header: 'খাত ও বিবরণ', key: 'head', align: 'left' },
            { header: 'প্রাপক / দাতা', key: 'party', align: 'left' },
            { header: 'হিসাব', key: 'account', align: 'left' },
            { header: 'জমা (৳)', key: 'debit', align: 'right' },
            { header: 'উত্তোলন (৳)', key: 'credit', align: 'right' },
            { header: 'চলমান জের (৳)', key: 'balance', align: 'right' },
          ]}
          data={[
            {
              sl: '—',
              date: formatDate(startDate),
              voucher: 'OB-BALANCE',
              head: 'প্রারম্ভিক স্থিতি (Opening Balance B/F)',
              party: '—',
              account: 'পূর্বের জের',
              debit: ledgerResult.openingBalance >= 0 ? `৳ ${ledgerResult.openingBalance.toLocaleString('en-IN')}` : '—',
              credit: ledgerResult.openingBalance < 0 ? `৳ ${Math.abs(ledgerResult.openingBalance).toLocaleString('en-IN')}` : '—',
              balance: `৳ ${ledgerResult.openingBalance.toLocaleString('en-IN')}`,
            },
            ...ledgerResult.displayEntries.map((e, idx) => ({
              sl: idx + 1,
              date: formatDate(e.date),
              voucher: e.voucherNumber,
              head: e.headNameBn + (e.description ? ` (${e.description})` : ''),
              party: e.partyName || '—',
              account: e.accountName,
              debit: e.debit > 0 ? `৳ ${e.debit.toLocaleString('en-IN')}` : '—',
              credit: e.credit > 0 ? `৳ ${e.credit.toLocaleString('en-IN')}` : '—',
              balance: `৳ ${e.runningBalance.toLocaleString('en-IN')}`,
            })),
          ]}
        />
      )}
    </div>
  );
};

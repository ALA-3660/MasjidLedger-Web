import { FinancialAccount, IncomeEntry, ExpenseEntry, AccountTransfer } from '../types';
import { exportToXlsx } from './reportingEngine';

export interface UnifiedLedgerEntry {
  id: string;
  date: string;
  voucherNumber: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'TRANSFER_INTERNAL' | 'OPENING';
  headNameBn: string;
  subHeadNameBn?: string;
  partyName: string;
  accountId: string;
  accountName: string;
  accountType?: string;
  debit: number;   // জমা (Inflow)
  credit: number;  // খরচ / উত্তোলন (Outflow)
  runningBalance: number;
  paymentMethod?: string;
  reference?: string;
  description?: string;
  rawItem?: any;
}

export interface LedgerCalculationResult {
  inScopeAccounts: FinancialAccount[];
  openingBalance: number;
  totalDebit: number;     // মোট প্রাপ্তি / জমা / ডিপোজিট
  totalCredit: number;    // মোট ব্যয় / খরচ / উত্তোলন
  netChange: number;
  closingBalance: number;
  entries: UnifiedLedgerEntry[];        // All entries in period with accurate running balance
  displayEntries: UnifiedLedgerEntry[]; // Filtered by type or search for UI/Export
  totalTransactionsCount: number;
}

export interface CalculateLedgerParams {
  accounts: FinancialAccount[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  transfers?: AccountTransfer[];
  accountFilter: 'ALL' | 'CASH' | 'BANK' | string; // 'ALL', 'CASH', 'BANK' (includes MFS), or specific accountId
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  typeFilter?: 'ALL' | 'INCOME' | 'EXPENSE';
  searchQuery?: string;
}

/**
 * Centralized Accounting Engine for Daily Ledger, Cashbook, and Bank Ledger.
 * Enforces the Same Dataset Rule across Screen, Print, PDF, and Excel.
 */
export const calculateAccountingLedger = (params: CalculateLedgerParams): LedgerCalculationResult => {
  const {
    accounts,
    incomes,
    expenses,
    transfers = [],
    accountFilter,
    startDate,
    endDate,
    typeFilter = 'ALL',
    searchQuery = '',
  } = params;

  // 1. Determine In-Scope Accounts
  let inScopeAccounts: FinancialAccount[] = [];
  if (accountFilter === 'ALL') {
    inScopeAccounts = accounts;
  } else if (accountFilter === 'CASH') {
    inScopeAccounts = accounts.filter((a) => a.accountType === 'CASH');
  } else if (accountFilter === 'BANK') {
    inScopeAccounts = accounts.filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS');
  } else {
    inScopeAccounts = accounts.filter((a) => a.id === accountFilter);
  }

  const inScopeIds = new Set(inScopeAccounts.map((a) => a.id));

  // Helper to check if date is strictly before startDate
  const isBeforeStart = (d?: string) => {
    if (!d) return false;
    return d.slice(0, 10) < startDate;
  };

  // Helper to check if date is within [startDate, endDate]
  const isInPeriod = (d?: string) => {
    if (!d) return false;
    const clean = d.slice(0, 10);
    return clean >= startDate && clean <= endDate;
  };

  // 2. Compute Baseline Opening Balance prior to `startDate`
  let openingBalance = 0;

  inScopeAccounts.forEach((acc) => {
    const rawOpening = Number(acc.openingBalance) || 0;
    const accOpening = acc.openingBalanceType === 'CREDIT' ? -rawOpening : rawOpening;
    openingBalance += accOpening;
  });

  // Add prior approved incomes for in-scope accounts
  incomes
    .filter((i) => i.status === 'APPROVED' && inScopeIds.has(i.accountId) && isBeforeStart(i.date))
    .forEach((i) => {
      openingBalance += Number(i.amount) || 0;
    });

  // Subtract prior approved expenses for in-scope accounts
  expenses
    .filter((e) => e.status === 'APPROVED' && inScopeIds.has(e.accountId) && isBeforeStart(e.date))
    .forEach((e) => {
      openingBalance -= Number(e.amount) || 0;
    });

  // Apply prior transfers
  transfers.forEach((trf) => {
    if (!isBeforeStart(trf.date || trf.createdAt)) return;
    const toInScope = inScopeIds.has(trf.toAccountId);
    const fromInScope = inScopeIds.has(trf.fromAccountId);
    const amt = Number(trf.amount) || 0;

    if (toInScope && !fromInScope) {
      openingBalance += amt;
    } else if (fromInScope && !toInScope) {
      openingBalance -= amt;
    }
    // If both in scope, internal transfer has net 0 impact
  });

  // 3. Collect all raw transactions within [startDate, endDate]
  interface RawTx {
    id: string;
    date: string;
    createdAt: string;
    voucherNumber: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'TRANSFER_INTERNAL';
    headNameBn: string;
    subHeadNameBn?: string;
    partyName: string;
    accountId: string;
    accountName: string;
    accountType?: string;
    amount: number;
    paymentMethod?: string;
    reference?: string;
    description?: string;
    raw: any;
  }

  const rawTxList: RawTx[] = [];

  // Incomes in period
  incomes
    .filter((i) => i.status === 'APPROVED' && inScopeIds.has(i.accountId) && isInPeriod(i.date))
    .forEach((i) => {
      rawTxList.push({
        id: i.id,
        date: i.date.slice(0, 10),
        createdAt: i.createdAt || i.date,
        voucherNumber: i.voucherNumber,
        type: 'INCOME',
        headNameBn: i.mainHeadNameBn,
        subHeadNameBn: i.subHeadNameBn,
        partyName: i.donorName || 'সাধারণ দানশীল',
        accountId: i.accountId,
        accountName: i.accountName,
        amount: Number(i.amount) || 0,
        paymentMethod: i.paymentMethod,
        reference: i.reference,
        description: i.description,
        raw: i,
      });
    });

  // Expenses in period
  expenses
    .filter((e) => e.status === 'APPROVED' && inScopeIds.has(e.accountId) && isInPeriod(e.date))
    .forEach((e) => {
      rawTxList.push({
        id: e.id,
        date: e.date.slice(0, 10),
        createdAt: e.createdAt || e.date,
        voucherNumber: e.voucherNumber,
        type: 'EXPENSE',
        headNameBn: e.mainHeadNameBn,
        subHeadNameBn: e.subHeadNameBn,
        partyName: e.payeeName || 'ভেন্ডর / সাধারণ',
        accountId: e.accountId,
        accountName: e.accountName,
        amount: Number(e.amount) || 0,
        paymentMethod: e.paymentMethod,
        reference: e.reference,
        description: e.description,
        raw: e,
      });
    });

  // Transfers in period
  transfers.forEach((trf) => {
    const d = (trf.date || trf.createdAt || '').slice(0, 10);
    if (!isInPeriod(d)) return;

    const toInScope = inScopeIds.has(trf.toAccountId);
    const fromInScope = inScopeIds.has(trf.fromAccountId);
    const amt = Number(trf.amount) || 0;

    if (toInScope && !fromInScope) {
      // Inflow from outside scope
      rawTxList.push({
        id: trf.id,
        date: d,
        createdAt: trf.createdAt || d,
        voucherNumber: trf.transferNumber || 'TRF',
        type: 'TRANSFER_IN',
        headNameBn: 'তহবিল স্থানান্তর (আন্তঃঅ্যাকাউন্ট)',
        partyName: `উৎস: ${trf.fromAccountName}`,
        accountId: trf.toAccountId,
        accountName: trf.toAccountName,
        amount: amt,
        paymentMethod: 'TRANSFER',
        reference: trf.reference,
        description: trf.description || `স্থানান্তর: ${trf.fromAccountName} হতে ${trf.toAccountName}`,
        raw: trf,
      });
    } else if (fromInScope && !toInScope) {
      // Outflow to outside scope
      rawTxList.push({
        id: trf.id,
        date: d,
        createdAt: trf.createdAt || d,
        voucherNumber: trf.transferNumber || 'TRF',
        type: 'TRANSFER_OUT',
        headNameBn: 'তহবিল স্থানান্তর (আন্তঃঅ্যাকাউন্ট)',
        partyName: `প্রাপক: ${trf.toAccountName}`,
        accountId: trf.fromAccountId,
        accountName: trf.fromAccountName,
        amount: amt,
        paymentMethod: 'TRANSFER',
        reference: trf.reference,
        description: trf.description || `স্থানান্তর: ${trf.fromAccountName} হতে ${trf.toAccountName}`,
        raw: trf,
      });
    } else if (toInScope && fromInScope) {
      // Internal transfer between two in-scope accounts (e.g. Cash -> Bank in 'ALL' scope)
      rawTxList.push({
        id: trf.id,
        date: d,
        createdAt: trf.createdAt || d,
        voucherNumber: trf.transferNumber || 'TRF',
        type: 'TRANSFER_INTERNAL',
        headNameBn: 'অভ্যন্তরীণ কন্ট্রা স্থানান্তর',
        partyName: `${trf.fromAccountName} ➔ ${trf.toAccountName}`,
        accountId: trf.toAccountId,
        accountName: `${trf.fromAccountName} ➔ ${trf.toAccountName}`,
        amount: amt,
        paymentMethod: 'TRANSFER',
        reference: trf.reference,
        description: trf.description || `কন্ট্রা এন্ট্রি: ${trf.fromAccountName} থেকে ${trf.toAccountName}`,
        raw: trf,
      });
    }
  });

  // 4. Chronological Sort (Date ASC, CreatedAt ASC)
  rawTxList.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // 5. Compute Running Balances Step-by-Step
  let currentBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries: UnifiedLedgerEntry[] = rawTxList.map((tx) => {
    let debit = 0;
    let credit = 0;

    if (tx.type === 'INCOME' || tx.type === 'TRANSFER_IN') {
      debit = tx.amount;
      totalDebit += debit;
      currentBalance += debit;
    } else if (tx.type === 'EXPENSE' || tx.type === 'TRANSFER_OUT') {
      credit = tx.amount;
      totalCredit += credit;
      currentBalance -= credit;
    } else if (tx.type === 'TRANSFER_INTERNAL') {
      // Net change on combined scoped balance is 0
      debit = 0;
      credit = 0;
    }

    const accObj = inScopeAccounts.find((a) => a.id === tx.accountId);

    return {
      id: tx.id,
      date: tx.date,
      voucherNumber: tx.voucherNumber,
      type: tx.type,
      headNameBn: tx.headNameBn,
      subHeadNameBn: tx.subHeadNameBn,
      partyName: tx.partyName,
      accountId: tx.accountId,
      accountName: tx.accountName,
      accountType: accObj?.accountType,
      debit,
      credit,
      runningBalance: currentBalance,
      paymentMethod: tx.paymentMethod,
      reference: tx.reference,
      description: tx.description,
      rawItem: tx.raw,
    };
  });

  const closingBalance = openingBalance + totalDebit - totalCredit;
  const netChange = totalDebit - totalCredit;

  // 6. Filter for Display / Table View without modifying actual running balance
  const q = searchQuery.toLowerCase().trim();
  const displayEntries = entries.filter((item) => {
    if (typeFilter === 'INCOME' && !(item.debit > 0)) return false;
    if (typeFilter === 'EXPENSE' && !(item.credit > 0)) return false;

    if (q) {
      const matchVoucher = (item.voucherNumber || '').toLowerCase().includes(q);
      const matchHead = (item.headNameBn || '').toLowerCase().includes(q);
      const matchSub = (item.subHeadNameBn || '').toLowerCase().includes(q);
      const matchParty = (item.partyName || '').toLowerCase().includes(q);
      const matchAcc = (item.accountName || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchRef = (item.reference || '').toLowerCase().includes(q);
      return matchVoucher || matchHead || matchSub || matchParty || matchAcc || matchDesc || matchRef;
    }
    return true;
  });

  return {
    inScopeAccounts,
    openingBalance,
    totalDebit,
    totalCredit,
    netChange,
    closingBalance,
    entries,
    displayEntries,
    totalTransactionsCount: entries.length,
  };
};

/**
 * Exports Cashbook dataset to genuine .xlsx
 */
export const exportCashbookToExcel = (options: {
  mosqueName: string;
  periodLabel: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: UnifiedLedgerEntry[];
}) => {
  const { mosqueName, periodLabel, openingBalance, closingBalance, totalDebit, totalCredit, entries } = options;

  exportToXlsx({
    filename: `CashBook_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}`,
    sheetName: 'ক্যাশ বুক খতিয়ান',
    mosqueName,
    reportTitle: 'নগদ ক্যাশ বুক রেজিস্টার (Cashbook Ledger)',
    periodLabel,
    columns: [
      { header: 'তারিখ', accessor: (item) => item.date },
      { header: 'ভাউচার নং', accessor: (item) => item.voucherNumber },
      { header: 'বিবরণ / খাত', accessor: (item) => item.headNameBn + (item.subHeadNameBn ? ` - ${item.subHeadNameBn}` : '') },
      { header: 'পার্টি / প্রাপক / দাতা', accessor: (item) => item.partyName },
      { header: 'নগদ জমা (৳)', accessor: (item) => (item.debit > 0 ? item.debit : '') },
      { header: 'নগদ খরচ (৳)', accessor: (item) => (item.credit > 0 ? item.credit : '') },
      { header: 'চলমান স্থিতি (৳)', accessor: (item) => item.runningBalance },
    ],
    data: entries,
    summaryRows: [
      { label: 'প্রারম্ভিক নগদ জের (Opening Balance)', value: `৳ ${openingBalance.toLocaleString('en-IN')}` },
      { label: 'মোট নগদ জমা (Total Inflow)', value: `৳ ${totalDebit.toLocaleString('en-IN')}` },
      { label: 'মোট নগদ খরচ (Total Outflow)', value: `৳ ${totalCredit.toLocaleString('en-IN')}` },
      { label: 'সমাপনী নগদ জের (Closing Balance)', value: `৳ ${closingBalance.toLocaleString('en-IN')}` },
    ],
  });
};

/**
 * Exports Bank Ledger dataset to genuine .xlsx
 */
export const exportBankLedgerToExcel = (options: {
  mosqueName: string;
  accountName: string;
  accountNumberMasked: string;
  periodLabel: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: UnifiedLedgerEntry[];
}) => {
  const {
    mosqueName,
    accountName,
    accountNumberMasked,
    periodLabel,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    entries,
  } = options;

  exportToXlsx({
    filename: `BankLedger_${accountName.replace(/[^a-zA-Z0-9]/g, '_')}`,
    sheetName: 'ব্যাংক খতিয়ান',
    mosqueName,
    reportTitle: `ব্যাংক খতিয়ান — ${accountName} (${accountNumberMasked})`,
    periodLabel,
    columns: [
      { header: 'তারিখ', accessor: (item) => item.date },
      { header: 'ভাউচার / চেক নং', accessor: (item) => item.voucherNumber },
      { header: 'খাত ও বিবরণ', accessor: (item) => item.headNameBn + (item.subHeadNameBn ? ` - ${item.subHeadNameBn}` : '') },
      { header: 'পার্টি / প্রাপক / দাতা', accessor: (item) => item.partyName },
      { header: 'হিসাবের নাম', accessor: (item) => item.accountName },
      { header: 'জমা / Deposit (৳)', accessor: (item) => (item.debit > 0 ? item.debit : '') },
      { header: 'উত্তোলন / Withdrawal (৳)', accessor: (item) => (item.credit > 0 ? item.credit : '') },
      { header: 'ব্যালেন্স / চলমান জের (৳)', accessor: (item) => item.runningBalance },
    ],
    data: entries,
    summaryRows: [
      { label: 'প্রারম্ভিক জের (Opening Balance)', value: `৳ ${openingBalance.toLocaleString('en-IN')}` },
      { label: 'নির্বাচিত সময়ে মোট জমা (Total Deposit)', value: `৳ ${totalDebit.toLocaleString('en-IN')}` },
      { label: 'নির্বাচিত সময়ে মোট উত্তোলন (Total Withdrawal)', value: `৳ ${totalCredit.toLocaleString('en-IN')}` },
      { label: 'সমাপনী জের (Closing Balance)', value: `৳ ${closingBalance.toLocaleString('en-IN')}` },
    ],
  });
};

/**
 * Exports Daily Central Ledger to genuine .xlsx
 */
export const exportDailyLedgerToExcel = (options: {
  mosqueName: string;
  periodLabel: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: UnifiedLedgerEntry[];
}) => {
  const { mosqueName, periodLabel, openingBalance, closingBalance, totalDebit, totalCredit, entries } = options;

  exportToXlsx({
    filename: `DailyStatement_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}`,
    sheetName: 'দৈনিক লেনদেন বিবরণী',
    mosqueName,
    reportTitle: 'দৈনিক কেন্দ্রীয় লেনদেন ও খতিয়ান বিবরণী',
    periodLabel,
    columns: [
      { header: 'তারিখ', accessor: (item) => item.date },
      { header: 'ভাউচার নং', accessor: (item) => item.voucherNumber },
      { header: 'ধরন', accessor: (item) => (item.debit > 0 ? 'প্রাপ্তি / জমা' : item.credit > 0 ? 'ব্যয় / খরচ' : 'কন্ট্রা') },
      { header: 'খাত ও বিবরণ', accessor: (item) => item.headNameBn + (item.subHeadNameBn ? ` - ${item.subHeadNameBn}` : '') },
      { header: 'হিসাব / ফান্ড', accessor: (item) => item.accountName },
      { header: 'পার্টি / দাতা / প্রাপক', accessor: (item) => item.partyName },
      { header: 'প্রাপ্তি / জমা (৳)', accessor: (item) => (item.debit > 0 ? item.debit : '') },
      { header: 'ব্যয় / খরচ (৳)', accessor: (item) => (item.credit > 0 ? item.credit : '') },
      { header: 'চলমান স্থিতি (৳)', accessor: (item) => item.runningBalance },
    ],
    data: entries,
    summaryRows: [
      { label: 'প্রারম্ভিক জের (Opening Balance)', value: `৳ ${openingBalance.toLocaleString('en-IN')}` },
      { label: 'মোট প্রাপ্তি (Total Inflow)', value: `৳ ${totalDebit.toLocaleString('en-IN')}` },
      { label: 'মোট খরচ (Total Outflow)', value: `৳ ${totalCredit.toLocaleString('en-IN')}` },
      { label: 'সমাপনী জের (Closing Balance)', value: `৳ ${closingBalance.toLocaleString('en-IN')}` },
    ],
  });
};

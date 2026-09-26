import {
  FinancialAccount,
  ExpenseEntry,
  IncomeEntry,
  AccountTransfer,
  PaymentMethod,
  Staff,
  MosqueAsset,
  MosqueProperty,
  Mosque,
} from '../types';
import {
  ExpenseReportDataset,
  ExpenseReportItem,
  ExpenseReportFilterParams,
} from './expenseReportingService';
import {
  calculateAccountingLedger,
  UnifiedLedgerEntry,
} from './accountingLedgerService';
import { exportToXlsx, ExcelColumnDef } from './reportingEngine';
import { formatDate, formatCurrency, toBanglaNumber } from './i18n';

/**
 * Reconciliation Status Hierarchy
 */
export type ReconciliationStatus =
  | 'MATCHED'
  | 'MISMATCHED'
  | 'MISSING'
  | 'DUPLICATE'
  | 'INVALID';

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, { labelBn: string; color: string; badgeBg: string }> = {
  MATCHED: {
    labelBn: 'সঠিক ও নিখুঁত (Matched)',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  MISMATCHED: {
    labelBn: 'অমিল (Mismatched)',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  MISSING: {
    labelBn: 'অনুপস্থিত (Missing)',
    color: 'text-rose-700',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  DUPLICATE: {
    labelBn: 'দ্বৈত পোস্টিং (Duplicate)',
    color: 'text-purple-700',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  INVALID: {
    labelBn: 'ত্রুটিপূর্ণ (Invalid)',
    color: 'text-red-700',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
  },
};

/**
 * Individual Expense Reconciliation Item
 */
export interface ExpenseReconciliationItem {
  expenseId: string;
  voucherNumber: string;
  date: string;
  expenseType: string;
  expenseTypeLabelBn: string;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId?: string;
  subHeadNameBn?: string;
  payeeName: string;
  payeePhone?: string;
  description?: string;
  paymentMethod: PaymentMethod | string;
  paymentMethodLabelBn: string;
  
  // Account Information
  accountId: string;
  accountName: string;
  accountType?: string;
  isAccountValid: boolean;
  
  // Financial Comparison
  expenseAmount: number;
  expectedAccountImpact: number;
  actualAccountImpact: number;
  
  expectedLedgerPostingCount: number;
  actualLedgerPostingCount: number;
  expectedLedgerAmount: number;
  actualLedgerAmount: number;
  differenceAmount: number;
  
  // Status and Diagnostic
  status: ReconciliationStatus;
  statusLabelBn: string;
  exceptionReasons: string[];
  
  // Source Module Linkage
  sourceModule?: string;
  sourceId?: string;
  sourceType?: string;
  sourceLabelBn?: string;
  sourceEntityName?: string;
  
  // Status flags
  isCancelled: boolean;
  isReversal: boolean;
  reversalOfId?: string;
  rejectionReason?: string;
  
  // Matching Ledger Entries
  matchedLedgerEntries: UnifiedLedgerEntry[];
  
  // Authoritative raw entry
  rawEntry: ExpenseEntry;
}

/**
 * Summary Statistics for Reconciliation Dashboard
 */
export interface ExpenseReconciliationSummary {
  totalExpenseEvents: number;
  matchedCount: number;
  mismatchedCount: number;
  missingCount: number;
  duplicateCount: number;
  invalidCount: number;
  
  // Amount metrics
  totalExpenseAmount: number;
  expectedAccountOutflow: number;
  actualAccountOutflow: number;
  expectedLedgerAmount: number;
  actualLedgerAmount: number;
  differenceAmount: number; // expectedLedgerAmount - actualLedgerAmount
  
  // Rates
  matchedRate: number; // percentage 0-100
  hasZeroDelta: boolean;
}

/**
 * Account Reconciliation Grouping
 */
export interface AccountReconciliationGroup {
  accountId: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
  totalVouchersCount: number;
  matchedCount: number;
  exceptionCount: number;
  expectedOutflow: number;
  actualOutflow: number;
  difference: number;
  status: 'BALANCED' | 'DISCREPANCY';
  items: ExpenseReconciliationItem[];
}

/**
 * Source Module Reconciliation Grouping
 */
export interface SourceReconciliationGroup {
  sourceKey: string;
  sourceLabelBn: string;
  totalVouchersCount: number;
  totalAmount: number;
  matchedCount: number;
  exceptionCount: number;
  items: ExpenseReconciliationItem[];
}

/**
 * Complete Reconciliation Dataset
 */
export interface ExpenseReconciliationDataset {
  items: ExpenseReconciliationItem[];
  summary: ExpenseReconciliationSummary;
  accountGroups: AccountReconciliationGroup[];
  sourceGroups: SourceReconciliationGroup[];
  exceptionItems: ExpenseReconciliationItem[];
  cancelledItems: ExpenseReconciliationItem[];
  effectiveDates: {
    startDate: string;
    endDate: string;
    labelBn: string;
  };
  filterParams: ExpenseReportFilterParams;
  currentMosqueId: string;
  generatedAt: string;
}

/**
 * Parameters for building the reconciliation dataset
 */
export interface BuildReconciliationParams {
  expenseReportDataset: ExpenseReportDataset;
  accounts: FinancialAccount[];
  incomes?: IncomeEntry[];
  transfers?: AccountTransfer[];
  staffList?: Staff[];
  assets?: MosqueAsset[];
  properties?: MosqueProperty[];
  currentMosqueId: string;
}

/**
 * PURE RECONCILIATION ENGINE:
 * Compares ExpenseReportDataset (E5-A) against Ledger & Account Postings.
 * Read-Only: Zero database mutations, zero side effects. Financial Delta = ৳0.00.
 */
export const buildExpenseReconciliationDataset = (
  params: BuildReconciliationParams
): ExpenseReconciliationDataset => {
  const {
    expenseReportDataset,
    accounts,
    incomes = [],
    transfers = [],
    staffList = [],
    assets = [],
    properties = [],
    currentMosqueId,
  } = params;

  const { items: expenseReportItems, effectiveDates, filterParams } = expenseReportDataset;

  // 1. Calculate the Canonical Unified Ledger for the entire period and all accounts
  // This reuses calculateAccountingLedger without inventing a secondary ledger engine!
  const ledgerResult = calculateAccountingLedger({
    accounts: accounts.filter((a) => !a.mosqueId || a.mosqueId === currentMosqueId),
    incomes: incomes.filter((i) => !i.mosqueId || i.mosqueId === currentMosqueId),
    expenses: expenseReportItems.map((item) => item.rawEntry),
    transfers: transfers.filter((t) => !t.mosqueId || t.mosqueId === currentMosqueId),
    accountFilter: 'ALL',
    startDate: effectiveDates.startDate,
    endDate: effectiveDates.endDate,
    typeFilter: 'EXPENSE',
  });

  // Map ledger entries by expense id and voucher number for rapid O(1) comparison
  const ledgerEntriesByExpenseId = new Map<string, UnifiedLedgerEntry[]>();
  const ledgerEntriesByVoucher = new Map<string, UnifiedLedgerEntry[]>();

  ledgerResult.entries.forEach((entry) => {
    if (entry.type === 'EXPENSE') {
      // By id
      const existingById = ledgerEntriesByExpenseId.get(entry.id) || [];
      existingById.push(entry);
      ledgerEntriesByExpenseId.set(entry.id, existingById);

      // By voucher
      if (entry.voucherNumber) {
        const existingByVoucher = ledgerEntriesByVoucher.get(entry.voucherNumber) || [];
        existingByVoucher.push(entry);
        ledgerEntriesByVoucher.set(entry.voucherNumber, existingByVoucher);
      }
    }
  });

  // Map accounts by ID
  const accountMap = new Map<string, FinancialAccount>();
  accounts.forEach((acc) => {
    accountMap.set(acc.id, acc);
  });

  // Map staff, asset, property for source resolution
  const staffMap = new Map<string, Staff>();
  staffList.forEach((s) => staffMap.set(s.id, s));

  const assetMap = new Map<string, MosqueAsset>();
  assets.forEach((a) => assetMap.set(a.id, a));

  const propertyMap = new Map<string, MosqueProperty>();
  properties.forEach((p) => propertyMap.set(p.id, p));

  // 2. Perform Per-Expense Financial Integrity & Reconciliation Analysis
  const reconciliationItems: ExpenseReconciliationItem[] = [];

  for (const expItem of expenseReportItems) {
    const raw = expItem.rawEntry;
    const isCancelled = expItem.status === 'CANCELLED' || raw.status === 'CANCELLED';
    const isReversal = Boolean(expItem.isReversal || raw.isReversal);
    const reasons: string[] = [];

    // Check account validity
    const targetAccount = accountMap.get(expItem.accountId);
    const isAccountValid = Boolean(targetAccount);
    if (!isAccountValid) {
      reasons.push(`আর্থিক হিসাব (Account ID: ${expItem.accountId}) সিস্টেমে খুঁজে পাওয়া যায়নি`);
    } else if (targetAccount && targetAccount.mosqueId && targetAccount.mosqueId !== currentMosqueId) {
      reasons.push(`নির্বাচিত একাউন্টটি বর্তমান মসজিদের অন্তর্ভুক্ত নয় (Mosque ID mismatch)`);
    }

    // Check payment method compatibility
    if (targetAccount) {
      const pMethod = expItem.paymentMethod;
      const accType = targetAccount.accountType;

      if ((pMethod === 'BANK' || pMethod === 'BANK_TRANSFER' || pMethod === 'CHEQUE') && accType === 'CASH') {
        reasons.push(`পদ্ধতি ব্যাংক চেক/ট্রান্সফার হলেও নির্ধারিত হিসাব ক্যাশ ড্রয়ার (${targetAccount.nameBn})`);
      } else if (pMethod === 'CASH' && (accType === 'BANK' || accType === 'MFS')) {
        reasons.push(`পদ্ধতি নগদ ক্যাশ হলেও নির্ধারিত হিসাব ব্যাংক/মোবাইল ব্যাংকিং (${targetAccount.nameBn})`);
      } else if ((pMethod === 'BKASH' || pMethod === 'NAGAD' || pMethod === 'ROCKET' || pMethod === 'MFS') && accType === 'CASH') {
        reasons.push(`পদ্ধতি মোবাইল ব্যাংকিং (MFS) হলেও নির্ধারিত হিসাব ক্যাশ ড্রয়ার (${targetAccount.nameBn})`);
      }
    }

    // Expected values
    let expectedAccountImpact = 0;
    let expectedLedgerPostingCount = 0;
    let expectedLedgerAmount = 0;

    if (!isCancelled) {
      expectedAccountImpact = expItem.amount;
      expectedLedgerPostingCount = 1;
      expectedLedgerAmount = expItem.amount;
    } else {
      // For cancelled expenses, expected ledger impact is 0
      expectedAccountImpact = 0;
      expectedLedgerPostingCount = 0;
      expectedLedgerAmount = 0;
    }

    // Find actual matching ledger entries
    let matchedEntries = ledgerEntriesByExpenseId.get(expItem.expenseId) || [];
    if (matchedEntries.length === 0 && expItem.voucherNumber) {
      matchedEntries = ledgerEntriesByVoucher.get(expItem.voucherNumber) || [];
    }

    const actualLedgerPostingCount = matchedEntries.length;
    const actualLedgerAmount = matchedEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const actualAccountImpact = actualLedgerAmount;

    // Determine Difference
    const diff = Math.round((expectedLedgerAmount - actualLedgerAmount) * 100) / 100;

    // Classify Reconciliation Status
    let status: ReconciliationStatus = 'MATCHED';

    if (!isAccountValid) {
      status = 'INVALID';
    } else if (isCancelled) {
      if (actualLedgerPostingCount > 0 && actualLedgerAmount > 0) {
        status = 'MISMATCHED';
        reasons.push(`ভাউচারটি বাতিল (CANCELLED) হওয়া সত্ত্বেও লেজারে ৳${actualLedgerAmount.toLocaleString('en-IN')} পোস্টিং বিদ্যমান`);
      } else {
        status = 'MATCHED';
      }
    } else {
      // Active approved expense
      if (actualLedgerPostingCount === 0) {
        status = 'MISSING';
        reasons.push(`অনুমোদিত ভাউচারের বিপরীতে লেজারে কোনো আর্থিক পোস্টিং পাওয়া যায়নি`);
      } else if (actualLedgerPostingCount > 1) {
        status = 'DUPLICATE';
        reasons.push(`একটি ব্যয় ভাউচারের বিপরীতে লেজারে ${actualLedgerPostingCount} টি দ্বৈত পোস্টিং পাওয়া গেছে`);
      } else {
        // Exactly 1 entry
        const single = matchedEntries[0];
        if (Math.abs(single.credit - expItem.amount) > 0.01) {
          status = 'MISMATCHED';
          reasons.push(
            `টাকার পরিমাণের অমিল: ভাউচারে ৳${expItem.amount.toLocaleString('en-IN')}, কিন্তু লেজারে ৳${single.credit.toLocaleString('en-IN')}`
          );
        }

        if (single.accountId !== expItem.accountId) {
          status = 'MISMATCHED';
          reasons.push(
            `পোস্টিং একাউন্টের অমিল: ভাউচারে ${expItem.accountName}, লেজারে ${single.accountName}`
          );
        }
      }
    }

    // Resolve source entity name
    let sourceEntityName: string | undefined;
    if (expItem.sourceModule === 'STAFF_SALARY' && expItem.sourceId) {
      const st = staffMap.get(expItem.sourceId);
      if (st) sourceEntityName = `${st.fullNameBn || st.name} (${st.designationBn})`;
    } else if (expItem.sourceModule === 'ASSET_PURCHASE' && expItem.sourceId) {
      const ast = assetMap.get(expItem.sourceId);
      if (ast) sourceEntityName = `${ast.name} (${ast.categoryBn || ast.category})`;
    } else if (expItem.sourceModule === 'PROPERTY_EXPENSE' && expItem.sourceId) {
      const prp = propertyMap.get(expItem.sourceId);
      if (prp) sourceEntityName = `${prp.nameBn || prp.name || prp.propertyCode}`;
    }

    reconciliationItems.push({
      expenseId: expItem.expenseId,
      voucherNumber: expItem.voucherNumber,
      date: expItem.date,
      expenseType: expItem.expenseType,
      expenseTypeLabelBn: expItem.expenseTypeLabelBn,
      mainHeadId: expItem.mainHeadId,
      mainHeadNameBn: expItem.mainHeadNameBn,
      subHeadId: expItem.subHeadId,
      subHeadNameBn: expItem.subHeadNameBn,
      payeeName: expItem.payeeName,
      payeePhone: expItem.payeePhone,
      description: expItem.description,
      paymentMethod: expItem.paymentMethod,
      paymentMethodLabelBn: expItem.paymentMethodLabelBn,
      accountId: expItem.accountId,
      accountName: expItem.accountName,
      accountType: expItem.accountType,
      isAccountValid,
      expenseAmount: expItem.amount,
      expectedAccountImpact,
      actualAccountImpact,
      expectedLedgerPostingCount,
      actualLedgerPostingCount,
      expectedLedgerAmount,
      actualLedgerAmount,
      differenceAmount: diff,
      status,
      statusLabelBn: RECONCILIATION_STATUS_LABELS[status].labelBn,
      exceptionReasons: reasons,
      sourceModule: expItem.sourceModule,
      sourceId: expItem.sourceId,
      sourceType: expItem.sourceType,
      sourceLabelBn: expItem.sourceLabelBn,
      sourceEntityName,
      isCancelled,
      isReversal,
      reversalOfId: raw.reversalOfId,
      rejectionReason: expItem.rejectionReason,
      matchedLedgerEntries: matchedEntries,
      rawEntry: raw,
    });
  }

  // 3. Calculate Summary Statistics
  let matchedCount = 0;
  let mismatchedCount = 0;
  let missingCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  let totalExpenseAmount = 0;
  let expectedAccountOutflow = 0;
  let actualAccountOutflow = 0;
  let expectedLedgerAmount = 0;
  let actualLedgerAmount = 0;

  reconciliationItems.forEach((r) => {
    totalExpenseAmount += r.expenseAmount;
    expectedAccountOutflow += r.expectedAccountImpact;
    actualAccountOutflow += r.actualAccountImpact;
    expectedLedgerAmount += r.expectedLedgerAmount;
    actualLedgerAmount += r.actualLedgerAmount;

    switch (r.status) {
      case 'MATCHED':
        matchedCount++;
        break;
      case 'MISMATCHED':
        mismatchedCount++;
        break;
      case 'MISSING':
        missingCount++;
        break;
      case 'DUPLICATE':
        duplicateCount++;
        break;
      case 'INVALID':
        invalidCount++;
        break;
    }
  });

  const totalExpenseEvents = reconciliationItems.length;
  const differenceAmount = Math.round((expectedLedgerAmount - actualLedgerAmount) * 100) / 100;
  const matchedRate = totalExpenseEvents > 0 ? (matchedCount / totalExpenseEvents) * 100 : 100;
  const hasZeroDelta = Math.abs(differenceAmount) < 0.01 && mismatchedCount === 0 && missingCount === 0 && duplicateCount === 0 && invalidCount === 0;

  const summary: ExpenseReconciliationSummary = {
    totalExpenseEvents,
    matchedCount,
    mismatchedCount,
    missingCount,
    duplicateCount,
    invalidCount,
    totalExpenseAmount,
    expectedAccountOutflow,
    actualAccountOutflow,
    expectedLedgerAmount,
    actualLedgerAmount,
    differenceAmount,
    matchedRate,
    hasZeroDelta,
  };

  // 4. Group by Financial Account
  const accountGroupMap = new Map<string, ExpenseReconciliationItem[]>();
  reconciliationItems.forEach((item) => {
    const list = accountGroupMap.get(item.accountId) || [];
    list.push(item);
    accountGroupMap.set(item.accountId, list);
  });

  const accountGroups: AccountReconciliationGroup[] = [];
  accounts.forEach((acc) => {
    const items = accountGroupMap.get(acc.id) || [];
    if (items.length > 0) {
      let expOut = 0;
      let actOut = 0;
      let matched = 0;
      let exc = 0;

      items.forEach((it) => {
        expOut += it.expectedAccountImpact;
        actOut += it.actualAccountImpact;
        if (it.status === 'MATCHED') matched++;
        else exc++;
      });

      const diff = Math.round((expOut - actOut) * 100) / 100;

      accountGroups.push({
        accountId: acc.id,
        accountName: acc.nameBn,
        accountType: acc.accountType,
        currentBalance: Number(acc.currentBalance) || 0,
        totalVouchersCount: items.length,
        matchedCount: matched,
        exceptionCount: exc,
        expectedOutflow: expOut,
        actualOutflow: actOut,
        difference: diff,
        status: Math.abs(diff) < 0.01 && exc === 0 ? 'BALANCED' : 'DISCREPANCY',
        items,
      });
    }
  });

  // 5. Group by Source Module
  const sourceGroupMap = new Map<string, { label: string; items: ExpenseReconciliationItem[] }>();
  reconciliationItems.forEach((item) => {
    const key = item.sourceModule || 'GENERAL_EXPENSE';
    const label = item.sourceLabelBn || 'সাধারণ ব্যয় ভাউচার';
    const entry = sourceGroupMap.get(key) || { label, items: [] };
    entry.items.push(item);
    sourceGroupMap.set(key, entry);
  });

  const sourceGroups: SourceReconciliationGroup[] = [];
  sourceGroupMap.forEach((val, key) => {
    let totAmt = 0;
    let matched = 0;
    let exc = 0;

    val.items.forEach((it) => {
      totAmt += it.expenseAmount;
      if (it.status === 'MATCHED') matched++;
      else exc++;
    });

    sourceGroups.push({
      sourceKey: key,
      sourceLabelBn: val.label,
      totalVouchersCount: val.items.length,
      totalAmount: totAmt,
      matchedCount: matched,
      exceptionCount: exc,
      items: val.items,
    });
  });

  // 6. Filter Out Exception Items and Cancelled Items
  const exceptionItems = reconciliationItems.filter((i) => i.status !== 'MATCHED');
  const cancelledItems = reconciliationItems.filter((i) => i.isCancelled);

  return {
    items: reconciliationItems,
    summary,
    accountGroups,
    sourceGroups,
    exceptionItems,
    cancelledItems,
    effectiveDates,
    filterParams,
    currentMosqueId,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Genuine Excel (.xlsx) Export for E5-D Reconciliation
 */
export const exportReconciliationDatasetToExcel = (options: {
  dataset: ExpenseReconciliationDataset;
  mosque: Mosque | null;
  mode?: 'REGISTER' | 'EXCEPTIONS' | 'ACCOUNTS' | 'SOURCES' | 'CANCELLATIONS';
}) => {
  const { dataset, mosque, mode = 'REGISTER' } = options;
  const mosqueName = mosque?.nameBn || 'মসজিদ কমপ্লেক্স';
  const periodLabel = dataset.effectiveDates.labelBn;

  if (mode === 'ACCOUNTS') {
    const columns: ExcelColumnDef<any>[] = [
      { header: 'হিসাবের নাম (Financial Account)', accessor: (g) => g.accountName },
      { header: 'হিসাবের ধরন', accessor: (g) => g.accountType || 'CASH' },
      { header: 'ভাউচার সংখ্যা', accessor: (g) => `${g.count} টি` },
      { header: 'মোট ব্যয় ভাউচার (৳)', accessor: (g) => g.totalExpenseAmount },
      { header: 'প্রত্যাশিত লেজার (৳)', accessor: (g) => g.expectedLedgerAmount },
      { header: 'প্রকৃত লেজার আউটফ্লো (৳)', accessor: (g) => g.actualLedgerAmount },
      { header: 'আর্থিক পার্থক্য (৳)', accessor: (g) => g.differenceAmount },
      { header: 'অবস্থা', accessor: (g) => (g.differenceAmount === 0 ? 'নিখুঁত মিল (Matched)' : 'অমিল (Discrepancy)') },
    ];

    exportToXlsx({
      filename: `Expense_Reconciliation_Accounts_${dataset.effectiveDates.startDate}_${dataset.effectiveDates.endDate}.xlsx`,
      sheetName: 'হিসাবওয়ারি রিকনসিলিয়েশন',
      mosqueName,
      reportTitle: 'ব্যয় রিকনসিলিয়েশন — ব্যাংক ও ক্যাশ হিসাবওয়ারি সমন্বয় খতিয়ান',
      periodLabel,
      columns,
      data: dataset.accountGroups,
      summaryRows: [
        { label: 'মোট আর্থিক হিসাব', value: `${dataset.accountGroups.length} টি` },
        { label: 'মোট ভাউচার ব্যয়', value: `৳ ${dataset.summary.totalExpenseAmount.toLocaleString('en-IN')}` },
        { label: 'প্রত্যাশিত লেজার আউটফ্লো', value: `৳ ${dataset.summary.expectedLedgerAmount.toLocaleString('en-IN')}` },
        { label: 'প্রকৃত লেজার আউটফ্লো', value: `৳ ${dataset.summary.actualLedgerAmount.toLocaleString('en-IN')}` },
        { label: 'আর্থিক ডেল্টা / পার্থক্য', value: `৳ ${dataset.summary.differenceAmount.toLocaleString('en-IN')}` },
      ],
      grandTotalRow: [
        '',
        `${dataset.summary.totalExpenseEvents} টি ভাউচার`,
        dataset.summary.totalExpenseAmount,
        dataset.summary.expectedLedgerAmount,
        dataset.summary.actualLedgerAmount,
        dataset.summary.differenceAmount,
        dataset.summary.differenceAmount === 0 ? 'সম্পূর্ণ নিখুঁত' : 'পার্থক্য বিদ্যমান',
      ],
    });
    return;
  }

  if (mode === 'EXCEPTIONS') {
    const columns: ExcelColumnDef<ExpenseReconciliationItem>[] = [
      { header: 'ভাউচার নং', accessor: (it) => it.voucherNumber },
      { header: 'তারিখ', accessor: (it) => formatDate(it.date) },
      { header: 'ব্যয়ের খাত', accessor: (it) => it.mainHeadNameBn },
      { header: 'প্রাপক', accessor: (it) => it.payeeName },
      { header: 'আর্থিক হিসাব', accessor: (it) => it.accountName },
      { header: 'ভাউচার পরিমাণ (৳)', accessor: (it) => it.expenseAmount },
      { header: 'প্রত্যাশিত লেজার (৳)', accessor: (it) => it.expectedLedgerAmount },
      { header: 'প্রকৃত লেজার (৳)', accessor: (it) => it.actualLedgerAmount },
      { header: 'পার্থক্য (৳)', accessor: (it) => it.differenceAmount },
      { header: 'অবস্থা', accessor: (it) => it.statusLabelBn },
      { header: 'কারণ / ত্রুটিসমূহ', accessor: (it) => it.exceptionReasons.join('; ') },
    ];

    exportToXlsx({
      filename: `Expense_Reconciliation_Exceptions_${dataset.effectiveDates.startDate}_${dataset.effectiveDates.endDate}.xlsx`,
      sheetName: 'ব্যতিক্রম ও অমিল রেজিস্টার',
      mosqueName,
      reportTitle: 'ব্যয় রিকনসিলিয়েশন — ব্যতিক্রম ও অমিল তালিকা (Exception Register)',
      periodLabel,
      columns,
      data: dataset.exceptionItems,
      summaryRows: [
        { label: 'মোট ব্যতিক্রম রেকর্ড', value: `${dataset.exceptionItems.length} টি` },
        { label: 'মোট প্রত্যাশিত পরিমাণ', value: `৳ ${dataset.summary.expectedLedgerAmount.toLocaleString('en-IN')}` },
        { label: 'মোট প্রকৃত পোস্টিং', value: `৳ ${dataset.summary.actualLedgerAmount.toLocaleString('en-IN')}` },
        { label: 'মোট আর্থিক পার্থক্য', value: `৳ ${dataset.summary.differenceAmount.toLocaleString('en-IN')}` },
      ],
      grandTotalRow: [
        '',
        '',
        '',
        '',
        dataset.summary.totalExpenseAmount,
        dataset.summary.expectedLedgerAmount,
        dataset.summary.actualLedgerAmount,
        dataset.summary.differenceAmount,
        `${dataset.exceptionItems.length} টি ব্যতিক্রম`,
        '',
      ],
    });
    return;
  }

  // Default: Full Reconciliation Register
  const columns: ExcelColumnDef<ExpenseReconciliationItem>[] = [
    { header: 'ভাউচার নং', accessor: (it) => it.voucherNumber },
    { header: 'তারিখ', accessor: (it) => formatDate(it.date) },
    { header: 'ব্যয়ের খাত', accessor: (it) => it.mainHeadNameBn },
    { header: 'উপ-খাত', accessor: (it) => it.subHeadNameBn || '-' },
    { header: 'প্রাপক', accessor: (it) => it.payeeName },
    { header: 'পেমেন্ট মাধ্যম', accessor: (it) => it.paymentMethodLabelBn },
    { header: 'হিসাব (Account)', accessor: (it) => it.accountName },
    { header: 'ভাউচার পরিমাণ (৳)', accessor: (it) => it.expenseAmount },
    { header: 'প্রত্যাশিত লেজার (৳)', accessor: (it) => it.expectedLedgerAmount },
    { header: 'প্রকৃত লেজার (৳)', accessor: (it) => it.actualLedgerAmount },
    { header: 'পার্থক্য (৳)', accessor: (it) => it.differenceAmount },
    { header: 'পোস্টিং সংখ্যা', accessor: (it) => `${it.actualLedgerPostingCount} / ${it.expectedLedgerPostingCount}` },
    { header: 'রিকনসিলিয়েশন অবস্থা', accessor: (it) => it.statusLabelBn },
    { header: 'পর্যবেক্ষণ / কারণ', accessor: (it) => (it.exceptionReasons.length > 0 ? it.exceptionReasons.join('; ') : 'সঠিক') },
  ];

  exportToXlsx({
    filename: `Expense_Reconciliation_Register_${dataset.effectiveDates.startDate}_${dataset.effectiveDates.endDate}.xlsx`,
    sheetName: 'ব্যয় রিকনসিলিয়েশন রেজিস্টার',
    mosqueName,
    reportTitle: 'ব্যয় ↔ হিসাব ↔ লেজার রিকনসিলিয়েশন পূর্ণাঙ্গ রেজিস্টার',
    periodLabel,
    columns,
    data: dataset.items,
    summaryRows: [
      { label: 'মোট ব্যয় ইভেন্ট', value: `${dataset.summary.totalExpenseEvents} টি` },
      { label: 'সঠিক ও নিখুঁত (Matched)', value: `${dataset.summary.matchedCount} টি (${dataset.summary.matchedRate.toFixed(1)}%)` },
      { label: 'অমিল (Mismatched)', value: `${dataset.summary.mismatchedCount} টি` },
      { label: 'অনুপস্থিত (Missing)', value: `${dataset.summary.missingCount} টি` },
      { label: 'দ্বৈত (Duplicate)', value: `${dataset.summary.duplicateCount} টি` },
      { label: 'ত্রুটিপূর্ণ (Invalid)', value: `${dataset.summary.invalidCount} টি` },
      { label: 'মোট ভাউচার ব্যয়', value: `৳ ${dataset.summary.totalExpenseAmount.toLocaleString('en-IN')}` },
      { label: 'প্রত্যাশিত লেজার আউটফ্লো', value: `৳ ${dataset.summary.expectedLedgerAmount.toLocaleString('en-IN')}` },
      { label: 'প্রকৃত লেজার আউটফ্লো', value: `৳ ${dataset.summary.actualLedgerAmount.toLocaleString('en-IN')}` },
      { label: 'মোট আর্থিক পার্থক্য (Delta)', value: `৳ ${dataset.summary.differenceAmount.toLocaleString('en-IN')}` },
    ],
    grandTotalRow: [
      '',
      '',
      '',
      '',
      '',
      '',
      dataset.summary.totalExpenseAmount,
      dataset.summary.expectedLedgerAmount,
      dataset.summary.actualLedgerAmount,
      dataset.summary.differenceAmount,
      `${dataset.summary.matchedCount} / ${dataset.summary.totalExpenseEvents} নিখুঁত`,
      dataset.summary.differenceAmount === 0 ? 'সম্পূর্ণ সমন্বিত' : 'পার্থক্য বিদ্যমান',
      '',
    ],
  });
};

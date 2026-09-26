import {
  ExpenseEntry,
  FinancialAccount,
  AccountHead,
  PaymentMethod,
  Staff,
  MosqueAsset,
  MosqueProperty,
  Mosque,
} from '../types';
import { formatDate, formatCurrency, formatBengaliMonthYear, toBanglaNumber } from './i18n';
import {
  DateFilterState,
  getDefaultDateFilterState,
  resolveEffectiveDates,
  exportToXlsx,
  ExcelColumnDef,
} from './reportingEngine';

/**
 * Standardized Read-Only Reporting Representation of an Expense.
 * Strictly derived from authoritative ExpenseEntry.
 */
export interface ExpenseReportItem {
  expenseId: string;
  voucherNumber: string;
  mosqueId: string;
  date: string;
  expenseType: 'GENERAL_EXPENSE' | 'STAFF_EXPENSE' | 'ASSET_EXPENSE' | 'PROPERTY_EXPENSE' | string;
  expenseTypeLabelBn: string;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId?: string;
  subHeadNameBn?: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  paymentMethodLabelBn: string;
  accountId: string;
  accountName: string;
  accountType?: string;
  payeeName: string;
  payeePhone?: string;
  description?: string;
  reference?: string;
  sourceModule?: string;
  sourceId?: string;
  sourceType?: string;
  sourceLabelBn?: string;
  status: 'APPROVED' | 'CANCELLED' | 'PENDING' | 'REJECTED';
  statusLabelBn: string;
  isReversal: boolean;
  rejectionReason?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  rawEntry: ExpenseEntry;
}

/**
 * Filter parameters for common Expense reporting queries
 */
export interface ExpenseReportFilterParams {
  dateFilter: DateFilterState;
  headFilter?: string; // 'ALL' or mainHeadId or subHeadId
  subHeadFilter?: string;
  expenseTypeFilter?: 'ALL' | 'GENERAL_EXPENSE' | 'STAFF_EXPENSE' | 'ASSET_EXPENSE' | 'PROPERTY_EXPENSE' | string;
  paymentMethodFilter?: 'ALL' | PaymentMethod | string;
  accountFilter?: 'ALL' | 'CASH' | 'BANK' | 'MFS' | string; // 'ALL', type, or specific accountId
  statusFilter?: 'ALL' | 'APPROVED' | 'CANCELLED';
  sourceModuleFilter?: 'ALL' | string;
  staffIdFilter?: string;
  assetIdFilter?: string;
  propertyIdFilter?: string;
  searchQuery?: string;
  sortBy?: 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'VOUCHER_DESC' | 'HEAD_ASC' | 'PAYEE_ASC';
}

/**
 * Summary breakdown of the filtered dataset
 */
export interface ExpenseReportSummary {
  totalApprovedAmount: number; // Valid total
  totalCancelledAmount: number; // Cancelled/Reversed total
  totalAllAmount: number; // Raw sum
  approvedTransactionsCount: number;
  cancelledTransactionsCount: number;
  totalTransactionsCount: number;
  cashExpenseAmount: number;
  bankExpenseAmount: number;
  mfsExpenseAmount: number;
  bankMfsCombinedAmount: number;
  headwiseBreakdown: {
    headId: string;
    headNameBn: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  accountwiseBreakdown: {
    accountId: string;
    accountName: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  typewiseBreakdown: {
    type: string;
    labelBn: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    labelBn: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
}

/**
 * Complete Unified Expense Report Dataset Contract
 * The exact same dataset is consumed by Screen UI, Print, PDF, and Excel export.
 */
export interface ExpenseReportDataset {
  items: ExpenseReportItem[];
  summary: ExpenseReportSummary;
  effectiveDates: {
    startDate: string;
    endDate: string;
    labelBn: string;
  };
  filterParams: ExpenseReportFilterParams;
  mosqueId: string;
  generatedAt: string;
}

/**
 * Report View Specific Row Models
 */
export interface MainHeadExpenseReportRow {
  headId: string;
  headNameBn: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface SubHeadExpenseReportRow {
  id: string;
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId?: string;
  subHeadNameBn: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface MonthlyExpenseReportRow {
  monthKey: string;
  monthNameBn: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface AnnualExpenseReportRow {
  yearKey: string;
  yearNameBn: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface DetailedExpenseAnalysisResult {
  overall: {
    totalApprovedAmount: number;
    totalCancelledAmount: number;
    totalTransactionsCount: number;
    approvedTransactionsCount: number;
    cancelledTransactionsCount: number;
    averageAmount: number;
    maxAmount: number;
    maxVoucherNumber?: string;
    maxPayeeName?: string;
    minAmount: number;
    cashExpenseAmount: number;
    bankExpenseAmount: number;
    mfsExpenseAmount: number;
    bankMfsCombinedAmount: number;
  };
  mainHeads: MainHeadExpenseReportRow[];
  subHeads: SubHeadExpenseReportRow[];
  monthly: MonthlyExpenseReportRow[];
  annual: AnnualExpenseReportRow[];
  paymentMethods: {
    method: string;
    labelBn: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  accounts: {
    accountId: string;
    accountName: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  expenseTypes: {
    type: string;
    labelBn: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  sources: {
    sourceModule: string;
    labelBn: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
}

export interface AccountExpenseReportRow {
  accountId: string;
  accountName: string;
  accountType?: string;
  count: number;
  amount: number;
  percentage: number;
  items?: ExpenseReportItem[];
}

export interface PaymentMethodExpenseReportRow {
  method: string;
  labelBn: string;
  count: number;
  amount: number;
  percentage: number;
  items?: ExpenseReportItem[];
}

export interface StaffExpenseReportRow {
  staffId: string;
  staffNameBn: string;
  designationBn?: string;
  phone?: string;
  expenseType: string;
  count: number;
  amount: number;
  percentage: number;
  items?: ExpenseReportItem[];
}

export interface AssetExpenseReportRow {
  assetId: string;
  assetNameBn: string;
  assetCode?: string;
  categoryBn?: string;
  expenseType: string;
  count: number;
  amount: number;
  percentage: number;
  items?: ExpenseReportItem[];
}

export interface PropertyExpenseReportRow {
  propertyId: string;
  propertyNameBn: string;
  propertyCode?: string;
  propertyType?: string;
  expenseType: string;
  count: number;
  amount: number;
  percentage: number;
  items?: ExpenseReportItem[];
}

export interface ExpenseTypeReportRow {
  type: string;
  labelBn: string;
  count: number;
  amount: number;
  percentage: number;
  items?: ExpenseReportItem[];
}

export interface CrossDimensionExpenseAnalysisResult {
  overall: DetailedExpenseAnalysisResult['overall'];
  accounts: AccountExpenseReportRow[];
  paymentMethods: PaymentMethodExpenseReportRow[];
  staffs: StaffExpenseReportRow[];
  assets: AssetExpenseReportRow[];
  properties: PropertyExpenseReportRow[];
  expenseTypes: ExpenseTypeReportRow[];
  mainHeads: MainHeadExpenseReportRow[];
  subHeads: SubHeadExpenseReportRow[];
  filteredItems: ExpenseReportItem[];
}

export type ExpenseReportViewType =
  | 'REGISTER'
  | 'MAIN_HEAD'
  | 'SUB_HEAD'
  | 'MONTHLY'
  | 'ANNUAL'
  | 'ANALYSIS'
  | 'ACCOUNT'
  | 'PAYMENT_METHOD'
  | 'STAFF'
  | 'ASSET'
  | 'PROPERTY'
  | 'EXPENSE_TYPE'
  | 'CROSS_ANALYSIS';

/**
 * Helper: Resolve Bengali label for Expense Type
 */
export const getExpenseTypeLabelBn = (type?: string): string => {
  switch (type) {
    case 'STAFF_EXPENSE':
      return 'স্টাফ ও বেতন ব্যয়';
    case 'ASSET_EXPENSE':
      return 'সম্পদ ও রক্ষণাবেক্ষণ ব্যয়';
    case 'PROPERTY_EXPENSE':
      return 'ওয়াকফ সম্পত্তি ব্যয়';
    case 'GENERAL_EXPENSE':
    default:
      return 'সাধারণ ব্যয় ও বিল';
  }
};

/**
 * Helper: Resolve Bengali label for Payment Method
 */
export const getPaymentMethodLabelBn = (method?: PaymentMethod | string): string => {
  switch (method) {
    case 'CASH':
      return '💵 নগদ টাকা (ক্যাশ)';
    case 'BANK':
      return '🏦 ব্যাংক ট্রান্সফার / চেক';
    case 'BKASH':
      return '📱 বিকাশ (bKash)';
    case 'NAGAD':
      return '📱 নগদ (Nagad)';
    case 'ROCKET':
      return '📱 রকেট (Rocket)';
    case 'CARD':
      return '💳 কার্ড';
    case 'OTHER':
    default:
      return 'অন্যান্য মাধ্যম';
  }
};

/**
 * Adapter: Convert raw ExpenseEntry to standardized ExpenseReportItem
 */
export const adaptExpenseEntryToReportItem = (
  entry: ExpenseEntry,
  accounts: FinancialAccount[] = [],
  staffList: Staff[] = [],
  assets: MosqueAsset[] = [],
  properties: MosqueProperty[] = []
): ExpenseReportItem => {
  const account = accounts.find((a) => a.id === entry.accountId);
  const expenseType = entry.sourceModule || 'GENERAL_EXPENSE';

  // Resolve source entity label
  let sourceLabelBn: string | undefined;
  if (entry.sourceModule === 'STAFF_EXPENSE' && entry.sourceId) {
    const s = staffList.find((st) => st.id === entry.sourceId);
    if (s) sourceLabelBn = `${s.fullNameBn || s.name} (${s.designationBn || s.designation || ''})`;
  } else if (entry.sourceModule === 'ASSET_EXPENSE' && entry.sourceId) {
    const a = assets.find((ast) => ast.id === entry.sourceId);
    if (a) sourceLabelBn = `${a.name} (${a.assetCode || a.categoryBn || a.category})`;
  } else if (entry.sourceModule === 'PROPERTY_EXPENSE' && entry.sourceId) {
    const p = properties.find((pr) => pr.id === entry.sourceId);
    if (p) sourceLabelBn = `${p.nameBn} (${p.propertyCode || p.type})`;
  }

  const status = (entry.status as any) || 'APPROVED';
  const statusLabelBn = status === 'CANCELLED' ? 'বাতিলকৃত' : 'অনুমোদিত';

  return {
    expenseId: entry.id,
    voucherNumber: entry.voucherNumber,
    mosqueId: entry.mosqueId,
    date: entry.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    expenseType,
    expenseTypeLabelBn: getExpenseTypeLabelBn(expenseType),
    mainHeadId: entry.mainHeadId,
    mainHeadNameBn: entry.mainHeadNameBn || 'অন্যান্য ব্যয়',
    subHeadId: entry.subHeadId,
    subHeadNameBn: entry.subHeadNameBn,
    amount: Number(entry.amount) || 0,
    paymentMethod: entry.paymentMethod || 'CASH',
    paymentMethodLabelBn: getPaymentMethodLabelBn(entry.paymentMethod),
    accountId: entry.accountId,
    accountName: entry.accountName || account?.nameBn || 'প্রধান ক্যাশ হিসাব',
    accountType: account?.accountType,
    payeeName: entry.payeeName || 'প্রাপক',
    payeePhone: entry.payeePhone,
    description: entry.description,
    reference: entry.reference,
    sourceModule: entry.sourceModule,
    sourceId: entry.sourceId,
    sourceType: entry.sourceType,
    sourceLabelBn,
    status,
    statusLabelBn,
    isReversal: Boolean(entry.isReversal),
    rejectionReason: entry.rejectionReason,
    createdBy: entry.createdBy || 'system',
    createdByName: entry.createdByName,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    rawEntry: entry,
  };
};

/**
 * Centralized, Read-Only Expense Report Filter & Dataset Builder
 */
export const buildExpenseReportDataset = (params: {
  expenses: ExpenseEntry[];
  currentMosqueId?: string;
  accounts?: FinancialAccount[];
  staffList?: Staff[];
  assets?: MosqueAsset[];
  properties?: MosqueProperty[];
  filters: ExpenseReportFilterParams;
}): ExpenseReportDataset => {
  const {
    expenses,
    currentMosqueId,
    accounts = [],
    staffList = [],
    assets = [],
    properties = [],
    filters,
  } = params;

  // 1. Resolve Effective Dates
  const effectiveDates = resolveEffectiveDates(filters.dateFilter);
  const startDate = effectiveDates.startDate;
  const endDate = effectiveDates.endDate;

  // 2. Tenant Scoping & Date Filtering
  let candidateEntries = expenses.filter((e) => {
    // Mosque Isolation
    if (currentMosqueId && e.mosqueId && e.mosqueId !== currentMosqueId) {
      return false;
    }
    // Date Range (Inclusive)
    const d = e.date ? e.date.slice(0, 10) : '';
    if (!d) return false;
    return d >= startDate && d <= endDate;
  });

  // 3. Adapt to standardized reporting item
  let reportItems = candidateEntries.map((e) =>
    adaptExpenseEntryToReportItem(e, accounts, staffList, assets, properties)
  );

  // 4. Combined Filtering (Strict AND logic)

  // A. Head Filter
  if (filters.headFilter && filters.headFilter !== 'ALL') {
    reportItems = reportItems.filter(
      (item) => item.mainHeadId === filters.headFilter || item.subHeadId === filters.headFilter
    );
  }

  // B. SubHead Filter
  if (filters.subHeadFilter && filters.subHeadFilter !== 'ALL') {
    reportItems = reportItems.filter((item) => item.subHeadId === filters.subHeadFilter);
  }

  // C. Expense Type / Source Module Filter
  if (filters.expenseTypeFilter && filters.expenseTypeFilter !== 'ALL') {
    reportItems = reportItems.filter((item) => item.expenseType === filters.expenseTypeFilter);
  }

  // D. Payment Method Filter
  if (filters.paymentMethodFilter && filters.paymentMethodFilter !== 'ALL') {
    reportItems = reportItems.filter((item) => item.paymentMethod === filters.paymentMethodFilter);
  }

  // E. Account Filter
  if (filters.accountFilter && filters.accountFilter !== 'ALL') {
    if (filters.accountFilter === 'CASH') {
      reportItems = reportItems.filter((item) => item.accountType === 'CASH' || item.paymentMethod === 'CASH');
    } else if (filters.accountFilter === 'BANK') {
      reportItems = reportItems.filter((item) => item.accountType === 'BANK' || item.paymentMethod === 'BANK');
    } else if (filters.accountFilter === 'MFS') {
      reportItems = reportItems.filter(
        (item) => item.accountType === 'MFS' || ['BKASH', 'NAGAD', 'ROCKET'].includes(item.paymentMethod as string)
      );
    } else {
      reportItems = reportItems.filter((item) => item.accountId === filters.accountFilter);
    }
  }

  // F. Status Filter
  if (filters.statusFilter && filters.statusFilter !== 'ALL') {
    reportItems = reportItems.filter((item) => item.status === filters.statusFilter);
  }

  // G. Staff ID Filter
  if (filters.staffIdFilter) {
    reportItems = reportItems.filter(
      (item) => item.sourceModule === 'STAFF_EXPENSE' && item.sourceId === filters.staffIdFilter
    );
  }

  // H. Asset ID Filter
  if (filters.assetIdFilter) {
    reportItems = reportItems.filter(
      (item) => item.sourceModule === 'ASSET_EXPENSE' && item.sourceId === filters.assetIdFilter
    );
  }

  // I. Property ID Filter
  if (filters.propertyIdFilter) {
    reportItems = reportItems.filter(
      (item) => item.sourceModule === 'PROPERTY_EXPENSE' && item.sourceId === filters.propertyIdFilter
    );
  }

  // J. Search Query (Case-insensitive Bengali & English text search)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    reportItems = reportItems.filter((item) => {
      const matchVoucher = item.voucherNumber?.toLowerCase().includes(q);
      const matchPayee = item.payeeName?.toLowerCase().includes(q);
      const matchPhone = item.payeePhone?.toLowerCase().includes(q);
      const matchHead = item.mainHeadNameBn?.toLowerCase().includes(q);
      const matchSubHead = item.subHeadNameBn?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchRef = item.reference?.toLowerCase().includes(q);
      const matchAccount = item.accountName?.toLowerCase().includes(q);
      const matchSource = item.sourceLabelBn?.toLowerCase().includes(q);
      const matchReason = item.rejectionReason?.toLowerCase().includes(q);

      return (
        matchVoucher ||
        matchPayee ||
        matchPhone ||
        matchHead ||
        matchSubHead ||
        matchDesc ||
        matchRef ||
        matchAccount ||
        matchSource ||
        matchReason
      );
    });
  }

  // 5. Sorting
  const sortBy = filters.sortBy || 'DATE_DESC';
  reportItems.sort((a, b) => {
    switch (sortBy) {
      case 'DATE_ASC':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'AMOUNT_DESC':
        return b.amount - a.amount;
      case 'AMOUNT_ASC':
        return a.amount - b.amount;
      case 'VOUCHER_DESC':
        return b.voucherNumber.localeCompare(a.voucherNumber);
      case 'HEAD_ASC':
        return a.mainHeadNameBn.localeCompare(b.mainHeadNameBn, 'bn');
      case 'PAYEE_ASC':
        return a.payeeName.localeCompare(b.payeeName, 'bn');
      case 'DATE_DESC':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  // 6. Summary Calculation (Golden Rule: Exclude CANCELLED from valid approved totals)
  let totalApprovedAmount = 0;
  let totalCancelledAmount = 0;
  let totalAllAmount = 0;
  let approvedTransactionsCount = 0;
  let cancelledTransactionsCount = 0;
  let cashExpenseAmount = 0;
  let bankExpenseAmount = 0;
  let mfsExpenseAmount = 0;

  const headMap = new Map<string, { headId: string; headNameBn: string; amount: number; count: number }>();
  const accountMap = new Map<string, { accountId: string; accountName: string; amount: number; count: number }>();
  const typeMap = new Map<string, { type: string; labelBn: string; amount: number; count: number }>();
  const methodMap = new Map<string, { method: string; labelBn: string; amount: number; count: number }>();

  reportItems.forEach((item) => {
    totalAllAmount += item.amount;

    if (item.status === 'CANCELLED') {
      totalCancelledAmount += item.amount;
      cancelledTransactionsCount += 1;
      return; // Do not include in approved expenditure breakdown
    }

    // Approved transactions
    totalApprovedAmount += item.amount;
    approvedTransactionsCount += 1;

    // Payment method breakdown
    if (item.paymentMethod === 'CASH') {
      cashExpenseAmount += item.amount;
    } else if (item.paymentMethod === 'BANK') {
      bankExpenseAmount += item.amount;
    } else if (['BKASH', 'NAGAD', 'ROCKET'].includes(item.paymentMethod as string)) {
      mfsExpenseAmount += item.amount;
    } else {
      bankExpenseAmount += item.amount;
    }

    // Head aggregation
    const headKey = item.mainHeadId;
    const existingHead = headMap.get(headKey) || {
      headId: headKey,
      headNameBn: item.mainHeadNameBn,
      amount: 0,
      count: 0,
    };
    existingHead.amount += item.amount;
    existingHead.count += 1;
    headMap.set(headKey, existingHead);

    // Account aggregation
    const accKey = item.accountId;
    const existingAcc = accountMap.get(accKey) || {
      accountId: accKey,
      accountName: item.accountName,
      amount: 0,
      count: 0,
    };
    existingAcc.amount += item.amount;
    existingAcc.count += 1;
    accountMap.set(accKey, existingAcc);

    // Type aggregation
    const typeKey = item.expenseType;
    const existingType = typeMap.get(typeKey) || {
      type: typeKey,
      labelBn: item.expenseTypeLabelBn,
      amount: 0,
      count: 0,
    };
    existingType.amount += item.amount;
    existingType.count += 1;
    typeMap.set(typeKey, existingType);

    // Method aggregation
    const methodKey = item.paymentMethod;
    const existingMethod = methodMap.get(methodKey) || {
      method: methodKey,
      labelBn: item.paymentMethodLabelBn,
      amount: 0,
      count: 0,
    };
    existingMethod.amount += item.amount;
    existingMethod.count += 1;
    methodMap.set(methodKey, existingMethod);
  });

  const headwiseBreakdown = Array.from(headMap.values())
    .map((h) => ({
      ...h,
      percentage: totalApprovedAmount > 0 ? (h.amount / totalApprovedAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const accountwiseBreakdown = Array.from(accountMap.values())
    .map((a) => ({
      ...a,
      percentage: totalApprovedAmount > 0 ? (a.amount / totalApprovedAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const typewiseBreakdown = Array.from(typeMap.values())
    .map((t) => ({
      ...t,
      percentage: totalApprovedAmount > 0 ? (t.amount / totalApprovedAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const paymentMethodBreakdown = Array.from(methodMap.values())
    .map((m) => ({
      ...m,
      percentage: totalApprovedAmount > 0 ? (m.amount / totalApprovedAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const summary: ExpenseReportSummary = {
    totalApprovedAmount,
    totalCancelledAmount,
    totalAllAmount,
    approvedTransactionsCount,
    cancelledTransactionsCount,
    totalTransactionsCount: reportItems.length,
    cashExpenseAmount,
    bankExpenseAmount,
    mfsExpenseAmount,
    bankMfsCombinedAmount: bankExpenseAmount + mfsExpenseAmount,
    headwiseBreakdown,
    accountwiseBreakdown,
    typewiseBreakdown,
    paymentMethodBreakdown,
  };

  return {
    items: reportItems,
    summary,
    effectiveDates,
    filterParams: filters,
    mosqueId: currentMosqueId || '',
    generatedAt: new Date().toISOString(),
  };
};

/**
 * 1. Main Head Expense Report Generator (Pure Transformation)
 */
export const getMainHeadExpenseReport = (
  dataset: ExpenseReportDataset
): MainHeadExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<string, { headId: string; headNameBn: string; count: number; amount: number }>();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const key = item.mainHeadId;
    const existing = map.get(key) || {
      headId: key,
      headNameBn: item.mainHeadNameBn,
      count: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.amount += item.amount;
    map.set(key, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 2. Sub-Head Expense Report Generator (Pure Transformation)
 */
export const getSubHeadExpenseReport = (
  dataset: ExpenseReportDataset
): SubHeadExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      id: string;
      mainHeadId: string;
      mainHeadNameBn: string;
      subHeadId?: string;
      subHeadNameBn: string;
      count: number;
      amount: number;
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const subId = item.subHeadId || 'NONE';
    const key = `${item.mainHeadId}_${subId}`;
    const existing = map.get(key) || {
      id: key,
      mainHeadId: item.mainHeadId,
      mainHeadNameBn: item.mainHeadNameBn,
      subHeadId: item.subHeadId,
      subHeadNameBn: item.subHeadNameBn || 'উপ-খাত নির্ধারিত নয় (সাধারণ)',
      count: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.amount += item.amount;
    map.set(key, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => {
      const mainComp = a.mainHeadNameBn.localeCompare(b.mainHeadNameBn, 'bn');
      if (mainComp !== 0) return mainComp;
      return b.amount - a.amount;
    });
};

/**
 * 3. Monthly Expense Report Generator (Pure Transformation)
 */
export const getMonthlyExpenseReport = (
  dataset: ExpenseReportDataset
): MonthlyExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    { monthKey: string; monthNameBn: string; count: number; amount: number }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const monthKey = item.date ? item.date.slice(0, 7) : 'UNKNOWN';
    const monthNameBn = formatBengaliMonthYear(monthKey) || monthKey;

    const existing = map.get(monthKey) || {
      monthKey,
      monthNameBn,
      count: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.amount += item.amount;
    map.set(monthKey, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

/**
 * 4. Annual Expense Report Generator (Pure Transformation)
 */
export const getAnnualExpenseReport = (
  dataset: ExpenseReportDataset
): AnnualExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    { yearKey: string; yearNameBn: string; count: number; amount: number }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const yearKey = item.date ? item.date.slice(0, 4) : 'UNKNOWN';
    const yearNameBn = `${toBanglaNumber(yearKey)} সাল`;

    const existing = map.get(yearKey) || {
      yearKey,
      yearNameBn,
      count: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.amount += item.amount;
    map.set(yearKey, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.yearKey.localeCompare(a.yearKey));
};

/**
 * 5. Detailed Expense Analysis Aggregator (Pure Transformation)
 */
export const getDetailedExpenseAnalysis = (
  dataset: ExpenseReportDataset
): DetailedExpenseAnalysisResult => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;
  const approvedItems = items.filter((i) => i.status !== 'CANCELLED');

  let maxAmount = 0;
  let maxVoucherNumber = '';
  let maxPayeeName = '';
  let minAmount = approvedItems.length > 0 ? approvedItems[0].amount : 0;

  approvedItems.forEach((item) => {
    if (item.amount > maxAmount) {
      maxAmount = item.amount;
      maxVoucherNumber = item.voucherNumber;
      maxPayeeName = item.payeeName;
    }
    if (item.amount < minAmount) {
      minAmount = item.amount;
    }
  });

  const averageAmount =
    summary.approvedTransactionsCount > 0
      ? Math.round(totalApproved / summary.approvedTransactionsCount)
      : 0;

  // Source mapping
  const sourceMap = new Map<
    string,
    { sourceModule: string; labelBn: string; amount: number; count: number }
  >();
  approvedItems.forEach((item) => {
    const srcKey = item.sourceModule || 'GENERAL_EXPENSE';
    const srcLabel = item.expenseTypeLabelBn || getExpenseTypeLabelBn(srcKey);
    const existing = sourceMap.get(srcKey) || {
      sourceModule: srcKey,
      labelBn: srcLabel,
      amount: 0,
      count: 0,
    };
    existing.amount += item.amount;
    existing.count += 1;
    sourceMap.set(srcKey, existing);
  });

  const sources = Array.from(sourceMap.values())
    .map((s) => ({
      ...s,
      percentage: totalApproved > 0 ? (s.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    overall: {
      totalApprovedAmount: summary.totalApprovedAmount,
      totalCancelledAmount: summary.totalCancelledAmount,
      totalTransactionsCount: summary.totalTransactionsCount,
      approvedTransactionsCount: summary.approvedTransactionsCount,
      cancelledTransactionsCount: summary.cancelledTransactionsCount,
      averageAmount,
      maxAmount,
      maxVoucherNumber,
      maxPayeeName,
      minAmount,
      cashExpenseAmount: summary.cashExpenseAmount,
      bankExpenseAmount: summary.bankExpenseAmount,
      mfsExpenseAmount: summary.mfsExpenseAmount,
      bankMfsCombinedAmount: summary.bankMfsCombinedAmount,
    },
    mainHeads: getMainHeadExpenseReport(dataset),
    subHeads: getSubHeadExpenseReport(dataset),
    monthly: getMonthlyExpenseReport(dataset),
    annual: getAnnualExpenseReport(dataset),
    paymentMethods: summary.paymentMethodBreakdown,
    accounts: summary.accountwiseBreakdown,
    expenseTypes: summary.typewiseBreakdown,
    sources,
  };
};

/**
 * =========================================================================
 * PHASE E5-C PURE AGGREGATION SERVICES (Read-Only, Financial Delta = 0)
 * =========================================================================
 */

/**
 * 6. Account-wise Expense Report Generator
 */
export const getAccountExpenseReport = (
  dataset: ExpenseReportDataset
): AccountExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      accountId: string;
      accountName: string;
      accountType?: string;
      count: number;
      amount: number;
      items: ExpenseReportItem[];
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const key = item.accountId || 'UNKNOWN_ACCOUNT';
    const existing = map.get(key) || {
      accountId: key,
      accountName: item.accountName || 'প্রধান ক্যাশ হিসাব',
      accountType: item.accountType || (item.paymentMethod === 'CASH' ? 'CASH' : 'BANK'),
      count: 0,
      amount: 0,
      items: [],
    };
    existing.count += 1;
    existing.amount += item.amount;
    existing.items.push(item);
    map.set(key, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 7. Payment Method-wise Expense Report Generator
 */
export const getPaymentMethodExpenseReport = (
  dataset: ExpenseReportDataset
): PaymentMethodExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      method: string;
      labelBn: string;
      count: number;
      amount: number;
      items: ExpenseReportItem[];
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const key = item.paymentMethod || 'OTHER';
    const existing = map.get(key) || {
      method: key,
      labelBn: item.paymentMethodLabelBn || getPaymentMethodLabelBn(key),
      count: 0,
      amount: 0,
      items: [],
    };
    existing.count += 1;
    existing.amount += item.amount;
    existing.items.push(item);
    map.set(key, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 8. Staff-wise Expense Report Generator
 */
export const getStaffExpenseReport = (
  dataset: ExpenseReportDataset,
  staffList: Staff[] = []
): StaffExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      staffId: string;
      staffNameBn: string;
      designationBn?: string;
      phone?: string;
      expenseType: string;
      count: number;
      amount: number;
      items: ExpenseReportItem[];
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const isStaff =
      item.sourceModule === 'STAFF_EXPENSE' ||
      item.expenseType === 'STAFF_EXPENSE' ||
      item.mainHeadNameBn?.includes('বেতন') ||
      item.mainHeadNameBn?.includes('স্টাফ');

    if (!isStaff && !item.sourceId) return;

    const staffId = item.sourceId || item.payeeName || 'UNSPECIFIED_STAFF';
    const staffObj = staffList.find((s) => s.id === item.sourceId);

    const existing = map.get(staffId) || {
      staffId,
      staffNameBn:
        staffObj?.fullNameBn ||
        staffObj?.name ||
        item.payeeName ||
        item.sourceLabelBn ||
        'মসজিদ স্টাফ',
      designationBn: staffObj?.designationBn || staffObj?.designation || 'স্টাফ সদস্য',
      phone: staffObj?.phone || item.payeePhone,
      expenseType: 'স্টাফ বেতন ও সম্মানী',
      count: 0,
      amount: 0,
      items: [],
    };
    existing.count += 1;
    existing.amount += item.amount;
    existing.items.push(item);
    map.set(staffId, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 9. Asset-wise Expense Report Generator
 */
export const getAssetExpenseReport = (
  dataset: ExpenseReportDataset,
  assets: MosqueAsset[] = []
): AssetExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      assetId: string;
      assetNameBn: string;
      assetCode?: string;
      categoryBn?: string;
      expenseType: string;
      count: number;
      amount: number;
      items: ExpenseReportItem[];
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const isAsset =
      item.sourceModule === 'ASSET_EXPENSE' ||
      item.expenseType === 'ASSET_EXPENSE' ||
      item.mainHeadNameBn?.includes('সম্পদ') ||
      item.mainHeadNameBn?.includes('মেরামত') ||
      item.mainHeadNameBn?.includes('ক্রয়') ||
      item.mainHeadNameBn?.includes('রক্ষণাবেক্ষণ');

    if (!isAsset && !item.sourceId) return;

    const assetId = item.sourceId || item.mainHeadId || 'UNSPECIFIED_ASSET';
    const assetObj = assets.find((a) => a.id === item.sourceId);

    const existing = map.get(assetId) || {
      assetId,
      assetNameBn: assetObj?.name || item.sourceLabelBn || item.description || 'মসজিদ সম্পদ ও সরঞ্জাম',
      assetCode: assetObj?.assetCode || assetId,
      categoryBn: assetObj?.categoryBn || assetObj?.category || 'সাধারণ সরঞ্জাম',
      expenseType: 'সম্পদ ও রক্ষণাবেক্ষণ ব্যয়',
      count: 0,
      amount: 0,
      items: [],
    };
    existing.count += 1;
    existing.amount += item.amount;
    existing.items.push(item);
    map.set(assetId, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 10. Waqf Property-wise Expense Report Generator
 */
export const getPropertyExpenseReport = (
  dataset: ExpenseReportDataset,
  properties: MosqueProperty[] = []
): PropertyExpenseReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      propertyId: string;
      propertyNameBn: string;
      propertyCode?: string;
      propertyType?: string;
      expenseType: string;
      count: number;
      amount: number;
      items: ExpenseReportItem[];
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const isProperty =
      item.sourceModule === 'PROPERTY_EXPENSE' ||
      item.expenseType === 'PROPERTY_EXPENSE' ||
      item.mainHeadNameBn?.includes('ওয়াকফ') ||
      item.mainHeadNameBn?.includes('সম্পত্তি') ||
      item.mainHeadNameBn?.includes('ভাড়া');

    if (!isProperty && !item.sourceId) return;

    const propertyId = item.sourceId || item.mainHeadId || 'UNSPECIFIED_PROPERTY';
    const propObj = properties.find((p) => p.id === item.sourceId);

    const existing = map.get(propertyId) || {
      propertyId,
      propertyNameBn: propObj?.nameBn || propObj?.name || item.sourceLabelBn || 'ওয়াক্ফ সম্পত্তি',
      propertyCode: propObj?.propertyCode || propertyId,
      propertyType: propObj?.type || 'রিয়েল এস্টেট / দোকান / মার্কেট',
      expenseType: 'ওয়াক্ফ সম্পত্তি ব্যয়',
      count: 0,
      amount: 0,
      items: [],
    };
    existing.count += 1;
    existing.amount += item.amount;
    existing.items.push(item);
    map.set(propertyId, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 11. Expense Type-wise Report Generator
 */
export const getExpenseTypeReport = (
  dataset: ExpenseReportDataset
): ExpenseTypeReportRow[] => {
  const { items, summary } = dataset;
  const totalApproved = summary.totalApprovedAmount;

  const map = new Map<
    string,
    {
      type: string;
      labelBn: string;
      count: number;
      amount: number;
      items: ExpenseReportItem[];
    }
  >();

  items.forEach((item) => {
    if (item.status === 'CANCELLED') return;
    const typeKey = item.expenseType || item.sourceModule || 'GENERAL_EXPENSE';
    const labelBn = item.expenseTypeLabelBn || getExpenseTypeLabelBn(typeKey);

    const existing = map.get(typeKey) || {
      type: typeKey,
      labelBn,
      count: 0,
      amount: 0,
      items: [],
    };
    existing.count += 1;
    existing.amount += item.amount;
    existing.items.push(item);
    map.set(typeKey, existing);
  });

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      percentage: totalApproved > 0 ? (row.amount / totalApproved) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
};

/**
 * 12. Cross-Dimension Integrated Expense Analysis Aggregator
 */
export const getCrossDimensionExpenseAnalysis = (
  dataset: ExpenseReportDataset,
  staffList: Staff[] = [],
  assets: MosqueAsset[] = [],
  properties: MosqueProperty[] = []
): CrossDimensionExpenseAnalysisResult => {
  const detailed = getDetailedExpenseAnalysis(dataset);
  return {
    overall: detailed.overall,
    accounts: getAccountExpenseReport(dataset),
    paymentMethods: getPaymentMethodExpenseReport(dataset),
    staffs: getStaffExpenseReport(dataset, staffList),
    assets: getAssetExpenseReport(dataset, assets),
    properties: getPropertyExpenseReport(dataset, properties),
    expenseTypes: getExpenseTypeReport(dataset),
    mainHeads: detailed.mainHeads,
    subHeads: detailed.subHeads,
    filteredItems: dataset.items.filter((i) => i.status !== 'CANCELLED'),
  };
};

/**
 * Standardized Excel (.xlsx) Exporter supporting all E5-B & E5-C Report Views
 */
export const exportExpenseReportToExcel = (
  dataset: ExpenseReportDataset,
  mosque?: Mosque | null,
  viewType: ExpenseReportViewType = 'REGISTER',
  staffList: Staff[] = [],
  assets: MosqueAsset[] = [],
  properties: MosqueProperty[] = []
): void => {
  const { items, summary, effectiveDates } = dataset;
  const mosqueName = mosque?.nameBn || mosque?.name || 'বায়তুল মোকাররম কেন্দ্রীয় জামে মসজিদ';

  const commonSummaryRows = [
    { label: 'মোট ট্রানজেকশন সংখ্যা', value: `${items.length} টি` },
    { label: 'অনুমোদিত ভাউচার সংখ্যা', value: `${summary.approvedTransactionsCount} টি` },
    { label: 'বাতিলকৃত ভাউচার সংখ্যা', value: `${summary.cancelledTransactionsCount} টি` },
    { label: 'নগদ (ক্যাশ) ব্যয়', value: `৳ ${summary.cashExpenseAmount.toLocaleString('en-IN')}` },
    { label: 'ব্যাংক ও MFS ব্যয়', value: `৳ ${summary.bankMfsCombinedAmount.toLocaleString('en-IN')}` },
    { label: 'সর্বমোট অনুমোদিত ব্যয়', value: `৳ ${summary.totalApprovedAmount.toLocaleString('en-IN')}` },
  ];

  if (viewType === 'MAIN_HEAD') {
    const mainHeadData = getMainHeadExpenseReport(dataset);
    const columns: ExcelColumnDef<MainHeadExpenseReportRow>[] = [
      { header: 'প্রধান ব্যয়ের খাত', accessor: (row) => row.headNameBn },
      { header: 'ভাউচার / লেনদেন সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<MainHeadExpenseReportRow>({
      filename: `প্রধান_খাতভিত্তিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'প্রধান খাতভিত্তিক ব্যয়',
      mosqueName,
      reportTitle: 'প্রধান খাতভিত্তিক ব্যয় প্রতিবেদন (Main Head-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: mainHeadData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'SUB_HEAD') {
    const subHeadData = getSubHeadExpenseReport(dataset);
    const columns: ExcelColumnDef<SubHeadExpenseReportRow>[] = [
      { header: 'প্রধান খাত', accessor: (row) => row.mainHeadNameBn },
      { header: 'উপ-খাত (Sub-Head)', accessor: (row) => row.subHeadNameBn },
      { header: 'ভাউচার / লেনদেন সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<SubHeadExpenseReportRow>({
      filename: `উপ-খাতভিত্তিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'উপ-খাতভিত্তিক ব্যয়',
      mosqueName,
      reportTitle: 'উপ-খাতভিত্তিক ব্যয় প্রতিবেদন (Sub-Head-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: subHeadData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'MONTHLY') {
    const monthlyData = getMonthlyExpenseReport(dataset);
    const columns: ExcelColumnDef<MonthlyExpenseReportRow>[] = [
      { header: 'মাস ও সাল', accessor: (row) => row.monthNameBn },
      { header: 'মাসের কোড (YYYY-MM)', accessor: (row) => row.monthKey },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<MonthlyExpenseReportRow>({
      filename: `মাসিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'মাসিক ব্যয়',
      mosqueName,
      reportTitle: 'মাসিক ব্যয় বিবরণী প্রতিবেদন (Monthly Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: monthlyData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'ANNUAL') {
    const annualData = getAnnualExpenseReport(dataset);
    const columns: ExcelColumnDef<AnnualExpenseReportRow>[] = [
      { header: 'অর্থবছর / সাল', accessor: (row) => row.yearNameBn },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<AnnualExpenseReportRow>({
      filename: `বার্ষিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'বার্ষিক ব্যয়',
      mosqueName,
      reportTitle: 'বার্ষিক ব্যয় বিবরণী প্রতিবেদন (Annual Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: annualData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'ACCOUNT') {
    const accountData = getAccountExpenseReport(dataset);
    const columns: ExcelColumnDef<AccountExpenseReportRow>[] = [
      { header: 'হিসাবের নাম (Financial Account)', accessor: (row) => row.accountName },
      { header: 'হিসাবের ধরন', accessor: (row) => row.accountType || 'CASH' },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<AccountExpenseReportRow>({
      filename: `হিসাবভিত্তিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'হিসাবভিত্তিক ব্যয়',
      mosqueName,
      reportTitle: 'হিসাবভিত্তিক ব্যয় বিবরণী (Account-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: accountData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'PAYMENT_METHOD') {
    const methodData = getPaymentMethodExpenseReport(dataset);
    const columns: ExcelColumnDef<PaymentMethodExpenseReportRow>[] = [
      { header: 'পরিশোধ পদ্ধতি (Payment Method)', accessor: (row) => row.labelBn },
      { header: 'মেথড কোড', accessor: (row) => row.method },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<PaymentMethodExpenseReportRow>({
      filename: `পরিশোধ_পদ্ধতিভিত্তিক_ব্যয়_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'পরিশোধ পদ্ধতি ব্যয়',
      mosqueName,
      reportTitle: 'পরিশোধ পদ্ধতিভিত্তিক ব্যয় বিবরণী (Payment Method-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: methodData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'STAFF') {
    const staffData = getStaffExpenseReport(dataset, staffList);
    const columns: ExcelColumnDef<StaffExpenseReportRow>[] = [
      { header: 'স্টাফের নাম', accessor: (row) => row.staffNameBn },
      { header: 'পদবি / রেফারেন্স', accessor: (row) => row.designationBn || '-' },
      { header: 'মোবাইল নম্বর', accessor: (row) => row.phone || '-' },
      { header: 'ব্যয়ের ধরন', accessor: (row) => row.expenseType },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<StaffExpenseReportRow>({
      filename: `স্টাফভিত্তিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'স্টাফ ব্যয়',
      mosqueName,
      reportTitle: 'স্টাফ ও বেতনভিত্তিক ব্যয় বিবরণী (Staff-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: staffData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', '', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'ASSET') {
    const assetData = getAssetExpenseReport(dataset, assets);
    const columns: ExcelColumnDef<AssetExpenseReportRow>[] = [
      { header: 'সম্পদের নাম', accessor: (row) => row.assetNameBn },
      { header: 'সম্পদ কোড', accessor: (row) => row.assetCode || '-' },
      { header: 'ক্যাটাগরি', accessor: (row) => row.categoryBn || '-' },
      { header: 'ব্যয়ের ধরন', accessor: (row) => row.expenseType },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<AssetExpenseReportRow>({
      filename: `সম্পদভিত্তিক_ব্যয়_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'সম্পদ ব্যয়',
      mosqueName,
      reportTitle: 'সম্পদ ও সরঞ্জাম রক্ষণাবেক্ষণ ব্যয় বিবরণী (Asset-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: assetData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', '', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'PROPERTY') {
    const propData = getPropertyExpenseReport(dataset, properties);
    const columns: ExcelColumnDef<PropertyExpenseReportRow>[] = [
      { header: 'ওয়াক্ফ সম্পত্তির নাম', accessor: (row) => row.propertyNameBn },
      { header: 'সম্পত্তি কোড', accessor: (row) => row.propertyCode || '-' },
      { header: 'সম্পত্তির ধরন', accessor: (row) => row.propertyType || '-' },
      { header: 'ব্যয়ের ধরন', accessor: (row) => row.expenseType },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<PropertyExpenseReportRow>({
      filename: `ওয়াক্ফ_সম্পত্তিভিত্তিক_ব্যয়_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'ওয়াক্ফ সম্পত্তি ব্যয়',
      mosqueName,
      reportTitle: 'ওয়াক্ফ সম্পত্তিভিত্তিক ব্যয় বিবরণী (Property-wise Expense Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: propData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', '', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'EXPENSE_TYPE') {
    const typeData = getExpenseTypeReport(dataset);
    const columns: ExcelColumnDef<ExpenseTypeReportRow>[] = [
      { header: 'ব্যয়ের ধরন (Expense Type)', accessor: (row) => row.labelBn },
      { header: 'টাইপ কোড', accessor: (row) => row.type },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<ExpenseTypeReportRow>({
      filename: `ব্যয়ের_ধরনভিত্তিক_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'ব্যয়ের ধরনভিত্তিক ব্যয়',
      mosqueName,
      reportTitle: 'ব্যয়ের ধরনভিত্তিক ব্যয় বিবরণী (Expense Type-wise Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: typeData,
      summaryRows: commonSummaryRows,
      grandTotalRow: ['', '', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  if (viewType === 'ANALYSIS' || viewType === 'CROSS_ANALYSIS') {
    const analysis = getDetailedExpenseAnalysis(dataset);
    const columns: ExcelColumnDef<MainHeadExpenseReportRow>[] = [
      { header: 'প্রধান খাত', accessor: (row) => row.headNameBn },
      { header: 'ভাউচার সংখ্যা', accessor: (row) => `${row.count} টি` },
      { header: 'মোট ব্যয় (৳)', accessor: (row) => row.amount },
      { header: 'শতকরা অংশ (%)', accessor: (row) => `${row.percentage.toFixed(1)}%` },
    ];

    exportToXlsx<MainHeadExpenseReportRow>({
      filename: `সমন্বিত_ব্যয়_বিশ্লেষণ_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
      sheetName: 'ব্যয় বিশ্লেষণ',
      mosqueName,
      reportTitle: 'সমন্বিত ব্যয় বিশ্লেষণ প্রতিবেদন (Integrated Expense Analysis Report)',
      periodLabel: effectiveDates.labelBn,
      columns,
      data: analysis.mainHeads,
      summaryRows: [
        ...commonSummaryRows,
        { label: 'গড় ব্যয় প্রতি ভাউচার', value: `৳ ${analysis.overall.averageAmount.toLocaleString('en-IN')}` },
        { label: 'সর্বোচ্চ একক ব্যয়', value: `৳ ${analysis.overall.maxAmount.toLocaleString('en-IN')} (${analysis.overall.maxVoucherNumber || '-'})` },
      ],
      grandTotalRow: ['', `${summary.approvedTransactionsCount} টি`, summary.totalApprovedAmount, '১০০.০%'],
    });
    return;
  }

  // Default: Register Detailed List
  const columns: ExcelColumnDef<ExpenseReportItem>[] = [
    { header: 'ভাউচার নং', accessor: (item) => item.voucherNumber },
    { header: 'তারিখ', accessor: (item) => formatDate(item.date) },
    {
      header: 'ব্যয়ের খাত',
      accessor: (item) => `${item.mainHeadNameBn}${item.subHeadNameBn ? ` / ${item.subHeadNameBn}` : ''}`,
    },
    { header: 'ব্যয়ের ধরন / মডিউল', accessor: (item) => item.expenseTypeLabelBn },
    { header: 'বিবরণ', accessor: (item) => item.description || '-' },
    { header: 'প্রাপক / ব্যক্তি / প্রতিষ্ঠান', accessor: (item) => item.payeeName || '-' },
    { header: 'মোবাইল নং', accessor: (item) => item.payeePhone || '-' },
    { header: 'পরিশোধের হিসাব', accessor: (item) => item.accountName },
    { header: 'পেমেন্ট মাধ্যম', accessor: (item) => item.paymentMethodLabelBn },
    {
      header: 'পরিমাণ (৳)',
      accessor: (item) => item.amount,
    },
    { header: 'অবস্থা', accessor: (item) => item.statusLabelBn },
    { header: 'রেফারেন্স / বিল নং', accessor: (item) => item.reference || '-' },
    { header: 'বাতিলের কারণ (যদি থাকে)', accessor: (item) => item.rejectionReason || '-' },
  ];

  exportToXlsx<ExpenseReportItem>({
    filename: `ব্যয়_রেজিস্টার_প্রতিবেদন_${effectiveDates.startDate}_হতে_${effectiveDates.endDate}`,
    sheetName: 'ব্যয় রেজিস্টার',
    mosqueName,
    reportTitle: 'ব্যয় ও পরিশোধ রেজিস্টার খতিয়ান (Expense Register Report)',
    periodLabel: effectiveDates.labelBn,
    columns,
    data: items,
    summaryRows: commonSummaryRows,
    grandTotalRow: ['', '', '', '', '', '', '', '', '', summary.totalApprovedAmount, `${summary.approvedTransactionsCount} টি অনুমোদিত`, '', ''],
  });
};


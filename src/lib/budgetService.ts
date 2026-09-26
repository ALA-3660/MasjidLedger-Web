/**
 * MasjidLedger Pro v2.6 — Phase E6: Budget & Expense Control Service
 *
 * ARCHITECTURAL CONSTRAINTS:
 * - ZERO Financial Delta: No Ledger, ExpenseEntry, or IncomeEntry postings.
 * - Pure calculation layer: Budget Master + Budget Lines + E5-A Expense Dataset.
 * - Actuals are sourced exclusively from buildExpenseReportDataset() Canonical Report Items.
 * - Multi-tenant isolation: mosqueId === currentMosqueId.
 */

import {
  Budget,
  BudgetLine,
  BudgetControlDataset,
  BudgetControlLineItem,
  BudgetControlSummary,
  BudgetMonthlyBreakdownItem,
  BudgetHeadwiseBreakdownItem,
  BudgetAnnualBreakdownItem,
  BudgetProjectItem,
  BudgetWarningStatus,
  CommitteeActionPlan,
} from '../types';
import { ExpenseReportDataset } from './expenseReportingService';

export const BN_MONTH_NAMES: Record<string, string> = {
  '01': 'জানুয়ারি',
  '02': 'ফেব্রুয়ারি',
  '03': 'মার্চ',
  '04': 'এপ্রিল',
  '05': 'মে',
  '06': 'জুন',
  '07': 'জুলাই',
  '08': 'আগস্ট',
  '09': 'সেপ্টেম্বর',
  '10': 'অক্টোবর',
  '11': 'নভেম্বর',
  '12': 'ডিসেম্বর',
};

/**
 * Convert English number or string to Bengali digits
 */
export const toBnDigits = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '০';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bnDigits[+d]);
};

/**
 * Format currency with ৳ and Bengali digits with thousands separators
 */
export const formatCurrencyBn = (amt: number | undefined | null): string => {
  if (amt === undefined || amt === null || isNaN(amt)) return '৳০';
  const isNegative = amt < 0;
  const absVal = Math.abs(Math.round(amt));
  const formatted = absVal.toLocaleString('bn-BD');
  return `${isNegative ? '-' : ''}৳${formatted}`;
};

/**
 * Format percentage with % and Bengali digits
 */
export const formatPercentBn = (percent: number | undefined | null): string => {
  if (percent === undefined || percent === null || isNaN(percent)) return '০%';
  return `${toBnDigits(percent.toFixed(1))}%`;
};

/**
 * Calculate Warning Status based on utilization percentage:
 * - < 75% -> NORMAL (স্বাভাবিক)
 * - 75% - 89.99% -> WARNING (সতর্কতা)
 * - 90% - 99.99% -> HIGH_UTILIZATION (উচ্চ ব্যবহার)
 * - >= 100% -> OVER_BUDGET (বাজেট অতিক্রম)
 */
export const calculateBudgetStatus = (utilizationPercent: number): BudgetWarningStatus => {
  if (utilizationPercent >= 100) return 'OVER_BUDGET';
  if (utilizationPercent >= 90) return 'HIGH_UTILIZATION';
  if (utilizationPercent >= 75) return 'WARNING';
  return 'NORMAL';
};

/**
 * Get human-readable Bengali label and styling metadata for status
 */
export const getBudgetStatusMeta = (
  status: BudgetWarningStatus
): {
  labelBn: string;
  badgeClass: string;
  dotColor: string;
  iconName: string;
} => {
  switch (status) {
    case 'OVER_BUDGET':
      return {
        labelBn: 'বাজেট অতিক্রম (১০০%+)',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        dotColor: 'bg-rose-500',
        iconName: 'AlertCircle',
      };
    case 'HIGH_UTILIZATION':
      return {
        labelBn: 'উচ্চ ব্যবহার (৯০%+)',
        badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
        dotColor: 'bg-orange-500',
        iconName: 'AlertTriangle',
      };
    case 'WARNING':
      return {
        labelBn: 'সতর্কতা (৭৫%+)',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        dotColor: 'bg-amber-500',
        iconName: 'Clock',
      };
    case 'NORMAL':
    default:
      return {
        labelBn: 'স্বাভাবিক',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        dotColor: 'bg-emerald-500',
        iconName: 'CheckCircle2',
      };
  }
};

/**
 * Get Bengali label for Budget status
 */
export const getBudgetLifecycleStatusLabel = (status: Budget['status']): string => {
  switch (status) {
    case 'DRAFT':
      return 'খসড়া (Draft)';
    case 'SUBMITTED':
      return 'পেশকৃত (Submitted)';
    case 'APPROVED':
      return 'অনুমোদিত (Approved)';
    case 'ACTIVE':
      return 'সক্রিয় (Active)';
    case 'REVISED':
      return 'সংশোধিত (Revised)';
    case 'CLOSED':
      return 'মেয়াদোত্তীর্ণ / সমাপ্ত (Closed)';
    default:
      return status;
  }
};

export const getBudgetTypeLabel = (type: Budget['budgetType']): string => {
  return type === 'PROJECT' ? 'প্রকল্প ও উন্নয়ন বাজেট' : 'নিয়মিত পরিচালনা বাজেট';
};

/**
 * PURE CALCULATION ENGINE:
 * Builds complete BudgetControlDataset from active Budget + Lines + E5-A ExpenseReportDataset
 */
export const buildBudgetControlDataset = (params: {
  budget: Budget | null;
  budgetLines: BudgetLine[];
  expenseDataset: ExpenseReportDataset;
  allBudgets?: Budget[];
  actionPlans?: CommitteeActionPlan[];
  selectedProjectId?: string;
}): BudgetControlDataset => {
  const {
    budget,
    budgetLines = [],
    expenseDataset,
    allBudgets = [],
    actionPlans = [],
    selectedProjectId,
  } = params;

  // Filter approved transactions from Canonical E5-A dataset (Cancelled entries are strictly excluded)
  const approvedItems = expenseDataset.items.filter((item) => item.status !== 'CANCELLED');

  // If a specific budget is selected, filter expenses within that budget's timeline
  const bStartDate = budget?.startDate ? budget.startDate.slice(0, 10) : '';
  const bEndDate = budget?.endDate ? budget.endDate.slice(0, 10) : '';

  const scopedItems = approvedItems.filter((item) => {
    const itemDate = item.date ? item.date.slice(0, 10) : '';
    if (bStartDate && itemDate < bStartDate) return false;
    if (bEndDate && itemDate > bEndDate) return false;
    const itemProjectId = (item.rawEntry as any)?.projectId || item.sourceId;
    if (budget?.projectId && itemProjectId && itemProjectId !== budget.projectId) return false;
    if (selectedProjectId && selectedProjectId !== 'ALL' && itemProjectId !== selectedProjectId) return false;
    return true;
  });

  // 1. Line-by-line computation
  const lines: BudgetControlLineItem[] = budgetLines.map((line) => {
    // Find all matching approved expense transactions for this line
    const matchingExpenses = scopedItems.filter((item) => {
      // Primary match: mainHeadId
      if (item.mainHeadId !== line.mainHeadId) return false;
      // Secondary match: subHeadId (if specified on line)
      if (line.subHeadId && item.subHeadId && item.subHeadId !== line.subHeadId) return false;
      return true;
    });

    const actualAmount = matchingExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const plannedAmount = Math.max(0, Number(line.plannedAmount) || 0);
    const remainingAmount = plannedAmount - actualAmount;
    const utilizationPercent =
      plannedAmount > 0
        ? (actualAmount / plannedAmount) * 100
        : actualAmount > 0
        ? 100
        : 0;
    const varianceAmount = plannedAmount - actualAmount;
    const isOverBudget = actualAmount > plannedAmount;
    const warningStatus = calculateBudgetStatus(utilizationPercent);

    return {
      id: line.id,
      budgetId: line.budgetId,
      budgetName: budget?.budgetName || 'বাজেট পরিকল্পনা',
      budgetType: budget?.budgetType || 'OPERATING',
      budgetPeriod: `${toBnDigits(bStartDate)} হতে ${toBnDigits(bEndDate)}`,
      mainHeadId: line.mainHeadId,
      mainHeadNameBn: line.mainHeadNameBn || 'অনির্ধারিত খাত',
      subHeadId: line.subHeadId,
      subHeadNameBn: line.subHeadNameBn,
      plannedAmount,
      actualAmount,
      remainingAmount,
      utilizationPercent,
      varianceAmount,
      isOverBudget,
      warningStatus,
      projectId: budget?.projectId,
      notes: line.notes,
    };
  });

  // 2. Summary Computation
  const totalPlannedAmount = lines.reduce((sum, l) => sum + l.plannedAmount, 0);
  const totalActualAmount = lines.reduce((sum, l) => sum + l.actualAmount, 0);
  const remainingAmount = totalPlannedAmount - totalActualAmount;
  const overallUtilizationPercent =
    totalPlannedAmount > 0
      ? (totalActualAmount / totalPlannedAmount) * 100
      : totalActualAmount > 0
      ? 100
      : 0;
  const varianceAmount = totalPlannedAmount - totalActualAmount;
  const isOverBudget = totalActualAmount > totalPlannedAmount;

  let normalCount = 0;
  let warningCount = 0;
  let highUtilizationCount = 0;
  let overBudgetCount = 0;

  lines.forEach((l) => {
    if (l.warningStatus === 'OVER_BUDGET') overBudgetCount++;
    else if (l.warningStatus === 'HIGH_UTILIZATION') highUtilizationCount++;
    else if (l.warningStatus === 'WARNING') warningCount++;
    else normalCount++;
  });

  const activeBudgetsCount = allBudgets.filter(
    (b) => (b.status === 'ACTIVE' || b.status === 'APPROVED') && !b.isArchived
  ).length;

  const activeProjectBudgetsCount = allBudgets.filter(
    (b) =>
      b.budgetType === 'PROJECT' &&
      (b.status === 'ACTIVE' || b.status === 'APPROVED') &&
      !b.isArchived
  ).length;

  const summary: BudgetControlSummary = {
    totalPlannedAmount,
    totalActualAmount,
    remainingAmount,
    overallUtilizationPercent,
    varianceAmount,
    isOverBudget,
    normalCount,
    warningCount,
    highUtilizationCount,
    overBudgetCount,
    activeBudgetsCount,
    activeProjectBudgetsCount,
  };

  // 3. Warning & Over Budget items
  const overBudgetItems = lines.filter((l) => l.warningStatus === 'OVER_BUDGET');
  const warningItems = lines.filter(
    (l) => l.warningStatus === 'WARNING' || l.warningStatus === 'HIGH_UTILIZATION'
  );

  // 4. Monthly Breakdown Calculation
  // Determine all distinct months in budget range
  const monthMap = new Map<
    string,
    { planned: number; actual: number }
  >();

  // If budget has startDate and endDate, establish month keys
  if (bStartDate && bEndDate) {
    const startYear = parseInt(bStartDate.slice(0, 4), 10);
    const startMonth = parseInt(bStartDate.slice(5, 7), 10);
    const endYear = parseInt(bEndDate.slice(0, 4), 10);
    const endMonth = parseInt(bEndDate.slice(5, 7), 10);

    let curYear = startYear;
    let curMonth = startMonth;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const mStr = String(curMonth).padStart(2, '0');
      const key = `${curYear}-${mStr}`;
      monthMap.set(key, { planned: 0, actual: 0 });
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }
  }

  // If no date range or no months, fallback to current 6 months
  if (monthMap.size === 0) {
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { planned: 0, actual: 0 });
    }
  }

  // Distribute planned amount evenly across months for period tracking
  const monthCount = Math.max(1, monthMap.size);
  const monthlyPlannedShare = totalPlannedAmount / monthCount;

  monthMap.forEach((val) => {
    val.planned = monthlyPlannedShare;
  });

  // Accumulate actual expenses into monthMap
  scopedItems.forEach((item) => {
    const itemMonth = item.date ? item.date.slice(0, 7) : '';
    if (monthMap.has(itemMonth)) {
      const cur = monthMap.get(itemMonth)!;
      cur.actual += item.amount || 0;
    }
  });

  const monthlyBreakdown: BudgetMonthlyBreakdownItem[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, val]) => {
      const [, mStr] = monthKey.split('-');
      const monthBn = BN_MONTH_NAMES[mStr] || mStr;
      const yearBn = toBnDigits(monthKey.slice(0, 4));
      const monthNameBn = `${monthBn} ${yearBn}`;
      const rem = val.planned - val.actual;
      const util = val.planned > 0 ? (val.actual / val.planned) * 100 : val.actual > 0 ? 100 : 0;
      return {
        monthKey,
        monthNameBn,
        plannedAmount: val.planned,
        actualAmount: val.actual,
        remainingAmount: rem,
        utilizationPercent: util,
        varianceAmount: rem,
        isOverBudget: val.actual > val.planned,
        status: calculateBudgetStatus(util),
      };
    });

  // 5. Head-wise Breakdown with Sub-head drill down
  const headMap = new Map<
    string,
    {
      mainHeadId: string;
      mainHeadNameBn: string;
      plannedAmount: number;
      actualAmount: number;
      subHeads: Map<
        string,
        {
          subHeadId?: string;
          subHeadNameBn?: string;
          plannedAmount: number;
          actualAmount: number;
        }
      >;
    }
  >();

  lines.forEach((line) => {
    if (!headMap.has(line.mainHeadId)) {
      headMap.set(line.mainHeadId, {
        mainHeadId: line.mainHeadId,
        mainHeadNameBn: line.mainHeadNameBn,
        plannedAmount: 0,
        actualAmount: 0,
        subHeads: new Map(),
      });
    }

    const h = headMap.get(line.mainHeadId)!;
    h.plannedAmount += line.plannedAmount;
    h.actualAmount += line.actualAmount;

    const subKey = line.subHeadId || '__none__';
    if (!h.subHeads.has(subKey)) {
      h.subHeads.set(subKey, {
        subHeadId: line.subHeadId,
        subHeadNameBn: line.subHeadNameBn || 'সাধারণ খাত',
        plannedAmount: 0,
        actualAmount: 0,
      });
    }
    const sh = h.subHeads.get(subKey)!;
    sh.plannedAmount += line.plannedAmount;
    sh.actualAmount += line.actualAmount;
  });

  const headwiseBreakdown: BudgetHeadwiseBreakdownItem[] = Array.from(headMap.values()).map(
    (h) => {
      const rem = h.plannedAmount - h.actualAmount;
      const util =
        h.plannedAmount > 0
          ? (h.actualAmount / h.plannedAmount) * 100
          : h.actualAmount > 0
          ? 100
          : 0;

      const subHeads = Array.from(h.subHeads.values()).map((sh) => {
        const sRem = sh.plannedAmount - sh.actualAmount;
        const sUtil =
          sh.plannedAmount > 0
            ? (sh.actualAmount / sh.plannedAmount) * 100
            : sh.actualAmount > 0
            ? 100
            : 0;
        return {
          subHeadId: sh.subHeadId,
          subHeadNameBn: sh.subHeadNameBn,
          plannedAmount: sh.plannedAmount,
          actualAmount: sh.actualAmount,
          remainingAmount: sRem,
          utilizationPercent: sUtil,
          varianceAmount: sRem,
          isOverBudget: sh.actualAmount > sh.plannedAmount,
          status: calculateBudgetStatus(sUtil),
        };
      });

      return {
        mainHeadId: h.mainHeadId,
        mainHeadNameBn: h.mainHeadNameBn,
        plannedAmount: h.plannedAmount,
        actualAmount: h.actualAmount,
        remainingAmount: rem,
        utilizationPercent: util,
        varianceAmount: rem,
        isOverBudget: h.actualAmount > h.plannedAmount,
        status: calculateBudgetStatus(util),
        subHeads,
      };
    }
  );

  // 6. Annual Breakdown
  const annualMap = new Map<number, { planned: number; actual: number }>();
  monthlyBreakdown.forEach((m) => {
    const yr = parseInt(m.monthKey.slice(0, 4), 10);
    if (!annualMap.has(yr)) {
      annualMap.set(yr, { planned: 0, actual: 0 });
    }
    const entry = annualMap.get(yr)!;
    entry.planned += m.plannedAmount;
    entry.actual += m.actualAmount;
  });

  const annualBreakdown: BudgetAnnualBreakdownItem[] = Array.from(annualMap.entries()).map(
    ([year, val]) => {
      const rem = val.planned - val.actual;
      const util = val.planned > 0 ? (val.actual / val.planned) * 100 : val.actual > 0 ? 100 : 0;
      return {
        year,
        yearBn: toBnDigits(year),
        plannedAmount: val.planned,
        actualAmount: val.actual,
        remainingAmount: rem,
        utilizationPercent: util,
        varianceAmount: rem,
        isOverBudget: val.actual > val.planned,
        status: calculateBudgetStatus(util),
      };
    }
  );

  // 7. Project Budgets (from CommitteeActionPlan)
  const projectBudgets: BudgetProjectItem[] = actionPlans.map((plan) => {
    const linkedBudget = allBudgets.find(
      (b) => b.projectId === plan.id && (b.status === 'ACTIVE' || b.status === 'APPROVED')
    );
    const approvedBudget = linkedBudget?.totalPlannedAmount || plan.estimatedBudget || 0;
    const actualExpense = approvedItems
      .filter((item) => ((item.rawEntry as any)?.projectId || item.sourceId) === plan.id)
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    const remaining = approvedBudget - actualExpense;
    const utilizationPercent =
      approvedBudget > 0
        ? (actualExpense / approvedBudget) * 100
        : actualExpense > 0
        ? 100
        : 0;

    return {
      projectId: plan.id,
      projectName: plan.title,
      estimatedBudget: plan.estimatedBudget || 0,
      approvedBudget,
      actualExpense,
      remaining,
      utilizationPercent,
      status: plan.status,
      warningStatus: calculateBudgetStatus(utilizationPercent),
    };
  });

  return {
    budget,
    lines,
    summary,
    monthlyBreakdown,
    headwiseBreakdown,
    annualBreakdown,
    projectBudgets,
    overBudgetItems,
    warningItems,
  };
};

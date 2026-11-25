import { ExpenseEntry, Staff, StaffPayment } from '../types';

export interface UnifiedStaffPaymentItem extends StaffPayment {
  paymentMonth?: string;
  isFromExpenseVoucher?: boolean;
  linkedExpense?: ExpenseEntry;
}

const SALARY_KEYWORDS = [
  'বেতন',
  'সম্মানী',
  'ভাতা',
  'হাদিয়া',
  'হাদিয়া',
  'বোনাস',
  'ইমাম',
  'মুয়াজ্জিন',
  'মুয়াজ্জিন',
  'খতিব',
  'খাদেম',
  'salary',
  'honorarium',
  'haadia',
];

const BONUS_KEYWORDS = ['বোনাস', 'ঈদ', 'উৎসব', 'শবেবরাত', 'শবে বরাত', 'শবে কদর', 'সম্মানী', 'bonus', 'festival'];

const MONTH_NAME_PATTERNS: Array<{ month: string; patterns: string[] }> = [
  { month: '01', patterns: ['জানুয়ারি', 'জানুয়ারি', 'জানুয়ারী', 'জানুয়ারী', 'january', 'jan'] },
  { month: '02', patterns: ['ফেব্রুয়ারি', 'ফেব্রুয়ারি', 'ফেব্রুয়ারী', 'ফেব্রুয়ারী', 'february', 'feb'] },
  { month: '03', patterns: ['মার্চ', 'march', 'mar'] },
  { month: '04', patterns: ['এপ্রিল', 'april', 'apr'] },
  { month: '05', patterns: ['মে', 'may'] },
  { month: '06', patterns: ['জুন', 'june', 'jun'] },
  { month: '07', patterns: ['জুলাই', 'july', 'jul'] },
  { month: '08', patterns: ['আগস্ট', 'আগষ্ট', 'august', 'aug'] },
  { month: '09', patterns: ['সেপ্টেম্বর', 'september', 'sep', 'sept'] },
  { month: '10', patterns: ['অক্টোবর', 'october', 'oct'] },
  { month: '11', patterns: ['নভেম্বর', 'november', 'nov'] },
  { month: '12', patterns: ['ডিসেম্বর', 'december', 'dec'] },
];

function bnToEnDigits(str: string): string {
  const map: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return str.replace(/[০-৯]/g, (ch) => map[ch] || ch);
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  const digits = bnToEnDigits(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeTextForMatch(text?: string): string {
  if (!text) return '';
  return bnToEnDigits(text)
    .toLowerCase()
    .replace(/[\(\)\[\]\{\},.\-:;'"/\\|–—]/g, ' ')
    // Normalize common Bangla/English honorific & spelling variants
    .replace(/মওঃ|মওলানা|মাওলানা|মৌলানা|mowlana|maulana|molana/g, 'maulana')
    .replace(/মোঃ|মো\.|মোহাম্মদ|মুহাম্মদ|md|mohammad|muhammad/g, 'md')
    .replace(/হাফেজ|হাঃ|hafez|hafiz/g, 'hafez')
    .replace(/মুবিনুল|মবিনুল|mubinul|mobinul/g, 'mubinul')
    .replace(/হক|hoque|haque|huq/g, 'hoque')
    .replace(/সম্মানীত|সম্মানিত|সাহেব|সাহেবকে/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSignificantTokens(text?: string): string[] {
  const stopWords = new Set(['md', 'hafez', 'maulana', 'খতিব', 'ইমাম', 'মুয়াজ্জিন', 'মুয়াজ্জিন', 'খাদেম', 'পেশ', 'প্রধান', 'সহকারী']);
  return normalizeTextForMatch(text)
    .split(' ')
    .filter((tok) => tok.length >= 2 && !stopWords.has(tok));
}

/**
 * Checks whether an ExpenseEntry belongs to Staff Salary / Honorarium / Bonus category.
 */
export function isSalaryExpenseEntry(expense: ExpenseEntry | null | undefined): boolean {
  if (!expense) return false;
  if (expense.sourceModule === 'STAFF_EXPENSE') return true;
  if (expense.staffId) return true;
  if (expense.mainHeadId === 'head-exp-01') return true;

  const headText = `${expense.mainHeadNameBn || ''} ${expense.subHeadNameBn || ''}`.toLowerCase();
  if (SALARY_KEYWORDS.some((kw) => headText.includes(kw))) {
    // Guard against labor/mason wages under construction/maintenance heads like "শ্রমিকের বেতন"
    const nonStaffHeadKeywords = ['নির্মাণ', 'মেরামত', 'রক্ষণাবেক্ষণ', 'সংস্কার', 'ক্রয়', 'বিদ্যুৎ', 'পরিষ্কার'];
    if (nonStaffHeadKeywords.some((nk) => (expense.mainHeadNameBn || '').includes(nk))) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Finds an existing StaffPayment linked to an ExpenseEntry (by expenseEntryId or expenseVoucherNumber).
 */
export function findLinkedStaffPaymentForExpense(
  expense: ExpenseEntry | null | undefined,
  staffPayments: StaffPayment[] = []
): StaffPayment | undefined {
  if (!expense) return undefined;
  return staffPayments.find(
    (p) =>
      (p.expenseEntryId && p.expenseEntryId === expense.id) ||
      (p.expenseVoucherNumber && expense.voucherNumber && p.expenseVoucherNumber === expense.voucherNumber)
  );
}

/**
 * Matches a salary ExpenseEntry to a Staff profile by staffId/sourceId, phone, normalized name/sub-head, or unique designation.
 */
export function findMatchingStaffForExpense(
  expense: ExpenseEntry | null | undefined,
  staffList: Staff[] = []
): Staff | undefined {
  if (!expense || staffList.length === 0) return undefined;

  // 1. Direct staffId / sourceId match
  const directStaffId = expense.staffId || (expense.sourceModule === 'STAFF_EXPENSE' ? expense.sourceId : undefined);
  if (directStaffId) {
    const byId = staffList.find((s) => s.id === directStaffId);
    if (byId) return byId;
  }

  // 2. Phone match
  const expPhone = normalizePhone(expense.payeePhone);
  if (expPhone.length >= 10) {
    const byPhone = staffList.find(
      (s) =>
        normalizePhone(s.phone) === expPhone ||
        normalizePhone(s.alternatePhone) === expPhone ||
        normalizePhone((s as any).contactNumber) === expPhone
    );
    if (byPhone) return byPhone;
  }

  // 3. Name / Sub-head matching
  const expCandidateTexts = [
    expense.payeeName || '',
    expense.subHeadNameBn || '',
    expense.description || '',
  ];
  const expPrimaryNorm = normalizeTextForMatch(`${expense.payeeName || ''} ${expense.subHeadNameBn || ''}`);
  const expPrimaryTokens = new Set(getSignificantTokens(`${expense.payeeName || ''} ${expense.subHeadNameBn || ''}`));

  let bestMatch: Staff | undefined;
  let bestScore = 0;

  for (const s of staffList) {
    const staffNames = [s.name, s.fullNameBn, (s as any).nameBn].filter(Boolean) as string[];
    let score = 0;

    for (const sn of staffNames) {
      const normSn = normalizeTextForMatch(sn);
      if (!normSn) continue;

      if (expPrimaryNorm === normSn) {
        score = Math.max(score, 100);
      } else if (expPrimaryNorm.includes(normSn) || normSn.includes(normalizeTextForMatch(expense.payeeName))) {
        if (normalizeTextForMatch(expense.payeeName).length >= 4) {
          score = Math.max(score, 85);
        }
      }

      const staffTokens = getSignificantTokens(sn);
      if (staffTokens.length > 0) {
        const matchedTokens = staffTokens.filter((t) => expPrimaryTokens.has(t));
        if (matchedTokens.length >= 2) {
          score = Math.max(score, 70 + matchedTokens.length * 5);
        } else if (matchedTokens.length === 1 && staffTokens.length === 1 && matchedTokens[0].length >= 4) {
          score = Math.max(score, 65);
        } else if (matchedTokens.length === 1 && matchedTokens[0].length >= 5) {
          // Single strong surname/given-name match plus designation boost
          const desigNorm = normalizeTextForMatch(s.designationBn);
          if (desigNorm && expPrimaryNorm.includes(desigNorm)) {
            score = Math.max(score, 75);
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = s;
    }
  }

  if (bestMatch && bestScore >= 65) {
    return bestMatch;
  }

  // 4. Unique designation match inside subHeadNameBn or description (only if unambiguous)
  const combinedText = normalizeTextForMatch(expCandidateTexts.join(' '));
  const designationMatches = staffList.filter((s) => {
    const desig = normalizeTextForMatch(s.designationBn);
    return desig.length >= 3 && combinedText.includes(desig);
  });
  if (designationMatches.length === 1) {
    return designationMatches[0];
  }

  return undefined;
}

/**
 * Extracts YYYY-MM salary month from an ExpenseEntry (explicit salaryMonth, Bengali/English month in description, or voucher date).
 */
export function extractSalaryMonthFromExpense(expense: ExpenseEntry): string {
  const explicit = expense.salaryMonth;
  if (explicit) {
    const norm = bnToEnDigits(String(explicit).trim());
    const m = norm.match(/^(\d{4})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  }

  const text = bnToEnDigits(`${expense.description || ''} ${expense.reference || ''}`).toLowerCase();

  // Check explicit YYYY-MM inside description
  const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const mNum = parseInt(isoMatch[2], 10);
    if (mNum >= 1 && mNum <= 12) {
      return `${isoMatch[1]}-${String(mNum).padStart(2, '0')}`;
    }
  }

  // Check Bengali or English month name + optional year
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const fallbackYear = (expense.date && expense.date.slice(0, 4)) || String(new Date().getFullYear());
  const resolvedYear = yearMatch ? yearMatch[1] : fallbackYear;

  for (const entry of MONTH_NAME_PATTERNS) {
    for (const pat of entry.patterns) {
      // Avoid matching short Bengali "মে" inside words like "মেরামত" or "সিমেন্ট"
      if (pat === 'মে') {
        if (/(?:^|\s|[-,/])মে(?:\s|[-,/]|20\d{2}|মাস|$)/.test(text)) {
          return `${resolvedYear}-${entry.month}`;
        }
      } else if (pat.length <= 3 && /^[a-z]+$/.test(pat)) {
        const re = new RegExp(`\\b${pat}\\b`, 'i');
        if (re.test(text)) {
          return `${resolvedYear}-${entry.month}`;
        }
      } else if (text.includes(pat)) {
        return `${resolvedYear}-${entry.month}`;
      }
    }
  }

  if (expense.date && /^\d{4}-\d{2}/.test(expense.date)) {
    return expense.date.slice(0, 7);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns the canonical paid amount for any StaffPayment record (handles legacy netPayable vs netPaid).
 */
export function resolveStaffPaymentNetAmount(p: Partial<StaffPayment> & { netPayable?: number; amount?: number }): number {
  if (typeof p.netPaid === 'number' && !isNaN(p.netPaid)) return p.netPaid;
  if (typeof p.netPayable === 'number' && !isNaN(p.netPayable)) return p.netPayable;
  if (typeof p.totalPayable === 'number' && !isNaN(p.totalPayable)) {
    return Math.max(0, p.totalPayable - (Number(p.deduction) || 0));
  }
  if (typeof p.amount === 'number' && !isNaN(p.amount)) return p.amount;
  const basic = Number(p.basicSalary) || 0;
  const allowance = Number(p.allowance) || ((Number(p.bonus) || 0) + (Number(p.otherAllowance) || 0));
  const deduction = Number(p.deduction) || 0;
  return Math.max(0, basic + allowance - deduction);
}

/**
 * Merges StaffPayment records with any unlinked salary ExpenseEntry vouchers belonging to the given staff member.
 */
export function buildUnifiedStaffPaymentHistory(
  staff: Staff,
  staffPayments: StaffPayment[] = [],
  expenses: ExpenseEntry[] = [],
  allStaff: Staff[] = []
): UnifiedStaffPaymentItem[] {
  const directPayments: UnifiedStaffPaymentItem[] = staffPayments
    .filter((p) => p.staffId === staff.id)
    .map((p) => {
      const linkedExp = expenses.find(
        (e) =>
          (p.expenseEntryId && e.id === p.expenseEntryId) ||
          (p.expenseVoucherNumber && e.voucherNumber === p.expenseVoucherNumber)
      );
      return {
        ...p,
        netPaid: resolveStaffPaymentNetAmount(p as any),
        linkedExpense: linkedExp,
        isFromExpenseVoucher: false,
      };
    });

  const coveredExpenseIds = new Set<string>();
  const coveredVoucherNumbers = new Set<string>();

  for (const p of staffPayments) {
    if (p.expenseEntryId) coveredExpenseIds.add(p.expenseEntryId);
    if (p.expenseVoucherNumber) coveredVoucherNumbers.add(p.expenseVoucherNumber);
  }

  const matchPool = allStaff.length > 0 ? allStaff : [staff];
  const syntheticFromExpenses: UnifiedStaffPaymentItem[] = [];

  for (const exp of expenses) {
    if (!exp || exp.status === 'CANCELLED' || exp.isReversal) continue;
    if (coveredExpenseIds.has(exp.id)) continue;
    if (exp.voucherNumber && coveredVoucherNumbers.has(exp.voucherNumber)) continue;
    if (!isSalaryExpenseEntry(exp)) continue;

    const matched = findMatchingStaffForExpense(exp, matchPool);
    if (!matched || matched.id !== staff.id) continue;

    const descLower = `${exp.description || ''} ${exp.subHeadNameBn || ''}`.toLowerCase();
    const isBonusLike =
      BONUS_KEYWORDS.some((kw) => descLower.includes(kw)) &&
      !descLower.includes('মাসের বেতন') &&
      !descLower.includes('মূল বেতন');

    const amt = Number(exp.amount) || 0;
    const month = extractSalaryMonthFromExpense(exp);

    syntheticFromExpenses.push({
      id: `exp-sal-${exp.id}`,
      mosqueId: exp.mosqueId,
      staffId: staff.id,
      staffName: staff.fullNameBn || staff.name,
      designationBn: staff.designationBn,
      month,
      paymentDate: exp.date,
      paymentType: isBonusLike ? 'BONUS' : 'REGULAR_SALARY',
      basicSalary: isBonusLike ? 0 : amt,
      bonus: isBonusLike ? amt : 0,
      otherAllowance: 0,
      allowance: isBonusLike ? amt : 0,
      deduction: 0,
      totalPayable: amt,
      netPaid: amt,
      paymentMethod: exp.paymentMethod,
      accountId: exp.accountId,
      accountNameBn: exp.accountName,
      expenseVoucherNumber: exp.voucherNumber,
      expenseEntryId: exp.id,
      notes: exp.description || exp.reference || '',
      status: 'PAID',
      createdAt: exp.createdAt || exp.date,
      updatedAt: exp.updatedAt,
      isFromExpenseVoucher: true,
      linkedExpense: exp,
    });
  }

  return [...directPayments, ...syntheticFromExpenses].sort((a, b) => {
    const dateA = a.paymentDate || a.month || '';
    const dateB = b.paymentDate || b.month || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

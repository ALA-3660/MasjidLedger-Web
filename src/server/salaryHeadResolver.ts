/**
 * Multi-tenant Staff Salary Account Head Resolver & Reconciler
 *
 * Ensures every staff salary / honorarium / festival / batch / settlement expense entry
 * is linked to its mosque's actual Chart of Accounts Salary Main Head (e.g. "বেতন-ভাতা প্রদান" / EXP-100)
 * and best-matching Sub-Head (per-staff sub-head if defined, otherwise role-based sub-head).
 */

export interface ResolvedSalaryHead {
  mainHeadId: string;
  mainHeadNameBn: string;
  subHeadId: string;
  subHeadNameBn: string;
  matchedRealMainHead: boolean;
  matchedRealSubHead: boolean;
}

const HONORIFIC_STOPWORDS = new Set([
  'হাফেজ',
  'হাফেয',
  'মাওলানা',
  'মওলানা',
  'মও',
  'মৌলানা',
  'মো',
  'মোঃ',
  'মোহাম্মদ',
  'মুহাম্মদ',
  'মোহাম্মাদ',
  'মুহাম্মাদ',
  'সাহেব',
  'জনাব',
  'আলহাজ্ব',
  'হাজী',
  'সম্মানীত',
  'সম্মানিত',
  'খতিব',
  'খতীব',
  'ইমাম',
  'পেশ',
  'মুয়াজ্জিন',
  'মুয়াজ্জিন',
  'খাদেম',
  'পরিচ্ছন্নতাকর্মী',
  'বেতন',
  'হাদিয়া',
  'হাদিয়া',
  'ভাতা',
  'সম্মানী',
  'ও',
  'এবং',
  'hafez',
  'hafiz',
  'mowlana',
  'maulana',
  'md',
  'mohammad',
  'muhammad',
  'saheb',
  'khatib',
  'imam',
  'muazzin',
  'khadem',
]);

function normalizeBnText(input: string): string {
  return String(input || '')
    .normalize('NFC')
    // Canonicalize Bengali nukta / decomposed forms & spelling variants
    .replace(/\u09AF\u09BC/g, 'য়')
    .replace(/\u09A1\u09BC/g, 'ড়')
    .replace(/\u09A2\u09BC/g, 'ঢ়')
    .replace(/য়/g, 'য়')
    .replace(/ড়/g, 'ড়')
    .replace(/ঢ়/g, 'ঢ়')
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/ঈ/g, 'ই')
    .replace(/ঊ/g, 'উ')
    .replace(/[ঃ\-_.,()[\]{}/\\|:'"`~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractCoreTokens(input: string): string[] {
  const norm = normalizeBnText(input);
  if (!norm) return [];
  return norm
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !HONORIFIC_STOPWORDS.has(t));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function tokenSimilarityScore(staffToken: string, headToken: string): number {
  if (!staffToken || !headToken) return 0;
  if (staffToken === headToken) return 100;
  const minLen = Math.min(staffToken.length, headToken.length);
  const maxLen = Math.max(staffToken.length, headToken.length);
  if (minLen >= 4 && (staffToken.startsWith(headToken) || headToken.startsWith(staffToken))) {
    return 85;
  }
  if (minLen >= 4) {
    const dist = levenshtein(staffToken, headToken);
    if (dist <= 1) return 88;
    if (dist <= 2 && maxLen >= 6) return 72;
  }
  return 0;
}

function scoreSubHeadAgainstStaff(
  subHead: any,
  staff: {
    id?: string;
    name?: string;
    fullNameBn?: string;
    designation?: string;
    designationBn?: string;
  } | null | undefined,
  payeeName?: string
): number {
  const subName = String(subHead?.nameBn || subHead?.nameEn || '');
  const subNorm = normalizeBnText(subName);
  if (!subNorm) return 0;

  const staffNameRaw = [staff?.fullNameBn, staff?.name, payeeName].filter(Boolean).join(' ');
  const staffTokens = Array.from(new Set(extractCoreTokens(staffNameRaw)));
  const subTokens = extractCoreTokens(subName);

  let score = 0;

  // 1. Direct full-name containment check
  const directNames = [staff?.fullNameBn, staff?.name, payeeName]
    .map((n) => normalizeBnText(String(n || '')))
    .filter((n) => n.length >= 4);
  for (const dn of directNames) {
    if (subNorm.includes(dn)) {
      score += 180;
      break;
    }
  }

  // 2. Core token fuzzy/exact matching (handles "শফিকুল" <-> "শফিক", "এহেতেরামুল" <-> "এহতেরামুল", "আয়াস" <-> "আয়াস")
  let matchedTokenCount = 0;
  for (const st of staffTokens) {
    let bestForToken = 0;
    for (const ht of subTokens) {
      const sim = tokenSimilarityScore(st, ht);
      if (sim > bestForToken) bestForToken = sim;
    }
    if (bestForToken >= 70) {
      matchedTokenCount += 1;
      score += bestForToken;
    }
  }
  if (matchedTokenCount >= 2) {
    score += 60;
  }

  // 3. Designation alignment bonus (helpful for both personal sub-heads like "(সম্মানীত ইমাম)" and generic role sub-heads)
  const desig = String(staff?.designation || '').toUpperCase();
  const desigBn = normalizeBnText(String(staff?.designationBn || ''));
  const isKhatib = desig === 'KHATIB' || desigBn.includes('খতিব');
  const isImam = desig === 'IMAM' || desigBn.includes('ইমাম');
  const isMuazzin = desig === 'MUAZZIN' || desigBn.includes('মুয়াজ্জিন');
  const isKhadem = desig === 'KHADEM' || desig === 'CLEANER' || desigBn.includes('খাদেম') || desigBn.includes('পরিচ্ছন্ন');

  const subHasKhatib = subNorm.includes('খতিব') || subNorm.includes('khatib');
  const subHasImam = subNorm.includes('ইমাম') || subNorm.includes('imam');
  const subHasMuazzin = subNorm.includes('মুয়াজ্জিন') || subNorm.includes('muazzin');
  const subHasKhadem = subNorm.includes('খাদেম') || subNorm.includes('পরিচ্ছন্ন') || subNorm.includes('khadem');

  if (isKhatib && subHasKhatib) score += 25;
  if (isImam && subHasImam) score += 25;
  if (isMuazzin && subHasMuazzin) score += 25;
  if (isKhadem && subHasKhadem) score += 25;

  return score;
}

export function isSalaryMainHeadCandidate(head: any): boolean {
  if (!head || head.type !== 'EXPENSE' || head.parentId) return false;
  const id = String(head.id || '').toLowerCase();
  const code = String(head.code || '').toUpperCase();
  const name = `${head.nameBn || ''} ${head.nameEn || ''}`.toLowerCase();
  return (
    name.includes('বেতন') ||
    name.includes('হাদিয়া') ||
    name.includes('হাদিয়া') ||
    name.includes('সম্মানী') ||
    name.includes('salary') ||
    name.includes('honorarium') ||
    code === 'EXP-100' ||
    code === 'SYS-EXP-100' ||
    id === 'head-exp-01' ||
    id.endsWith('-exp-01')
  );
}

export function findMosqueSalaryMainHead(accountHeads: any[], mosqueId: string): any | null {
  const mosqueExpenseMains = (accountHeads || []).filter(
    (h: any) => h && h.mosqueId === mosqueId && h.type === 'EXPENSE' && !h.parentId
  );
  if (mosqueExpenseMains.length === 0) return null;

  const activeMains = mosqueExpenseMains.filter(
    (h: any) => h.isActive !== false && h.status !== 'INACTIVE' && h.status !== 'ARCHIVED'
  );
  const pool = activeMains.length > 0 ? activeMains : mosqueExpenseMains;

  const candidates = pool.filter(isSalaryMainHeadCandidate);
  if (candidates.length === 0) return null;

  // Prefer user-facing non-SYS head (e.g. EXP-100 "বেতন-ভাতা প্রদান") over duplicate SYS-EXP-100
  const ranked = [...candidates].sort((a, b) => {
    const scoreHead = (h: any) => {
      let s = 0;
      const code = String(h.code || '').toUpperCase();
      const name = `${h.nameBn || ''} ${h.nameEn || ''}`.toLowerCase();
      if (!code.startsWith('SYS-')) s += 50;
      if (code === 'EXP-100') s += 40;
      if (h.id === `head-${mosqueId}-exp-01`) s += 30;
      if (name.includes('বেতন')) s += 20;
      if (name.includes('সম্মানী') || name.includes('ভাতা')) s += 10;
      return s;
    };
    return scoreHead(b) - scoreHead(a);
  });

  return ranked[0] || null;
}

export function resolveMosqueSalaryExpenseHead(params: {
  accountHeads: any[];
  mosqueId: string;
  staff?: {
    id?: string;
    name?: string;
    fullNameBn?: string;
    designation?: string;
    designationBn?: string;
  } | null;
  payeeName?: string;
  fallbackSubHeadLabelBn: string;
  preferredSubHeadId?: string;
  existingExpenses?: any[];
}): ResolvedSalaryHead {
  const {
    accountHeads,
    mosqueId,
    staff,
    payeeName,
    fallbackSubHeadLabelBn,
    preferredSubHeadId,
    existingExpenses,
  } = params;

  const mainHead = findMosqueSalaryMainHead(accountHeads, mosqueId);
  if (!mainHead) {
    const fallbackSubId =
      staff?.designation === 'IMAM' || staff?.designation === 'KHATIB'
        ? 'head-exp-01-1'
        : 'head-exp-01-2';
    return {
      mainHeadId: 'head-exp-01',
      mainHeadNameBn: 'ইমাম ও স্টাফ বেতন-ভাতা (Staff Salary)',
      subHeadId: fallbackSubId,
      subHeadNameBn: fallbackSubHeadLabelBn,
      matchedRealMainHead: false,
      matchedRealSubHead: false,
    };
  }

  const allSubHeads = (accountHeads || []).filter(
    (h: any) => h && h.mosqueId === mosqueId && h.type === 'EXPENSE' && h.parentId === mainHead.id
  );
  const activeSubHeads = allSubHeads.filter(
    (h: any) => h.isActive !== false && h.status !== 'INACTIVE' && h.status !== 'ARCHIVED'
  );
  const subPool = activeSubHeads.length > 0 ? activeSubHeads : allSubHeads;

  // 1. Honor explicit valid preferredSubHeadId under this mainHead
  if (preferredSubHeadId) {
    const preferred = subPool.find((sh: any) => sh.id === preferredSubHeadId);
    if (preferred) {
      return {
        mainHeadId: mainHead.id,
        mainHeadNameBn: mainHead.nameBn,
        subHeadId: preferred.id,
        subHeadNameBn: preferred.nameBn,
        matchedRealMainHead: true,
        matchedRealSubHead: true,
      };
    }
  }

  // 2. Score every sub-head under this mainHead against staff name & designation
  let bestSub: any = null;
  let bestScore = 0;

  // Build historical sub-head hint map for this staffId within the same mosque & mainHead
  const historicalSubCounts = new Map<string, number>();
  if (staff?.id && Array.isArray(existingExpenses)) {
    for (const exp of existingExpenses) {
      if (
        exp &&
        exp.mosqueId === mosqueId &&
        exp.mainHeadId === mainHead.id &&
        exp.subHeadId &&
        (exp.staffId === staff.id || exp.sourceId === staff.id)
      ) {
        historicalSubCounts.set(exp.subHeadId, (historicalSubCounts.get(exp.subHeadId) || 0) + 1);
      }
    }
  }

  for (const sh of subPool) {
    let sc = scoreSubHeadAgainstStaff(sh, staff, payeeName);
    const histHits = historicalSubCounts.get(sh.id) || 0;
    if (histHits > 0) {
      sc += 95;
    }
    if (sc > bestScore) {
      bestScore = sc;
      bestSub = sh;
    }
  }

  if (bestSub && bestScore >= 25) {
    return {
      mainHeadId: mainHead.id,
      mainHeadNameBn: mainHead.nameBn,
      subHeadId: bestSub.id,
      subHeadNameBn: bestSub.nameBn,
      matchedRealMainHead: true,
      matchedRealSubHead: true,
    };
  }

  // 3. Fallback when mosque has a real salary mainHead but no matching subHead
  const fallbackSubId =
    subPool.length === 1
      ? subPool[0].id
      : `${mainHead.id}-${staff?.designation === 'IMAM' || staff?.designation === 'KHATIB' ? '1' : '2'}`;
  const fallbackSubName = subPool.length === 1 ? subPool[0].nameBn : fallbackSubHeadLabelBn;

  return {
    mainHeadId: mainHead.id,
    mainHeadNameBn: mainHead.nameBn,
    subHeadId: fallbackSubId,
    subHeadNameBn: fallbackSubName,
    matchedRealMainHead: true,
    matchedRealSubHead: subPool.length === 1,
  };
}

/**
 * Idempotent migration / repair:
 * Re-links any staff salary expense entries whose `mainHeadId` or `subHeadId` points to a
 * synthetic/foreign head (e.g. hardcoded 'head-exp-01') so they belong to their mosque's real
 * Salary Main Head (e.g. 'বেতন-ভাতা প্রদান' / EXP-100) and matching staff Sub-Head.
 */
export function reconcileStaffSalaryExpenseHeads(state: {
  accountHeads: any[];
  staffList: any[];
  staffPayments: any[];
  expenseEntries: any[];
}): { fixedCount: number; repairedVouchers: string[] } {
  const accountHeads = state.accountHeads || [];
  const staffList = state.staffList || [];
  const staffPayments = state.staffPayments || [];
  const expenseEntries = state.expenseEntries || [];

  const paymentByExpenseId = new Map<string, any>();
  const paymentByVoucher = new Map<string, any>();
  for (const p of staffPayments) {
    if (!p) continue;
    if (p.expenseEntryId) paymentByExpenseId.set(`${p.mosqueId}::${p.expenseEntryId}`, p);
    if (p.expenseVoucherNumber) paymentByVoucher.set(`${p.mosqueId}::${p.expenseVoucherNumber}`, p);
  }

  const staffById = new Map<string, any>();
  for (const s of staffList) {
    if (s?.id) staffById.set(`${s.mosqueId}::${s.id}`, s);
  }

  let fixedCount = 0;
  const repairedVouchers: string[] = [];

  for (const exp of expenseEntries) {
    if (!exp || !exp.mosqueId) continue;
    const mosqueId = exp.mosqueId;

    const linkedPayment =
      paymentByExpenseId.get(`${mosqueId}::${exp.id}`) ||
      (exp.voucherNumber ? paymentByVoucher.get(`${mosqueId}::${exp.voucherNumber}`) : undefined);

    const isStaffSalaryExp =
      Boolean(linkedPayment) ||
      exp.sourceModule === 'STAFF_EXPENSE' ||
      exp.mainHeadId === 'head-exp-01';

    if (!isStaffSalaryExp) continue;

    const realMainHead = findMosqueSalaryMainHead(accountHeads, mosqueId);
    if (!realMainHead) continue;

    const mosqueHeads = accountHeads.filter((h: any) => h && h.mosqueId === mosqueId && h.type === 'EXPENSE');
    const hasValidMainHead = mosqueHeads.some((h: any) => h.id === exp.mainHeadId && !h.parentId);
    const hasValidSubHead = mosqueHeads.some(
      (h: any) => h.id === exp.subHeadId && h.parentId === (hasValidMainHead ? exp.mainHeadId : realMainHead.id)
    );

    // If both mainHeadId and subHeadId already belong to this mosque's Chart of Accounts, skip!
    if (hasValidMainHead && hasValidSubHead) continue;

    // Resolve staff object for sub-head matching
    const resolvedStaffId = linkedPayment?.staffId || exp.staffId || exp.sourceId;
    let staffObj = resolvedStaffId ? staffById.get(`${mosqueId}::${resolvedStaffId}`) : null;
    if (!staffObj && (linkedPayment?.staffName || exp.payeeName)) {
      const targetNorm = normalizeBnText(linkedPayment?.staffName || exp.payeeName || '');
      staffObj =
        staffList.find(
          (s: any) =>
            s.mosqueId === mosqueId &&
            (normalizeBnText(s.fullNameBn || '') === targetNorm || normalizeBnText(s.name || '') === targetNorm)
        ) || null;
    }

    const resolved = resolveMosqueSalaryExpenseHead({
      accountHeads,
      mosqueId,
      staff: staffObj,
      payeeName: linkedPayment?.staffName || exp.payeeName,
      fallbackSubHeadLabelBn: exp.subHeadNameBn || 'ইমাম ও স্টাফ বেতন ও হাদিয়া',
      preferredSubHeadId: hasValidSubHead ? exp.subHeadId : undefined,
      existingExpenses: expenseEntries,
    });

    const changed =
      exp.mainHeadId !== resolved.mainHeadId ||
      exp.mainHeadNameBn !== resolved.mainHeadNameBn ||
      exp.subHeadId !== resolved.subHeadId ||
      exp.subHeadNameBn !== resolved.subHeadNameBn;

    if (changed) {
      exp.mainHeadId = resolved.mainHeadId;
      exp.mainHeadNameBn = resolved.mainHeadNameBn;
      exp.subHeadId = resolved.subHeadId;
      exp.subHeadNameBn = resolved.subHeadNameBn;
      if (staffObj?.id && !exp.staffId) {
        exp.staffId = staffObj.id;
      }
      if (linkedPayment?.month && !exp.salaryMonth) {
        exp.salaryMonth = linkedPayment.month;
      }
      exp.updatedAt = new Date().toISOString();
      fixedCount += 1;
      repairedVouchers.push(
        `${mosqueId}:${exp.voucherNumber || exp.id} -> ${resolved.mainHeadNameBn} / ${resolved.subHeadNameBn}`
      );
    }
  }

  return { fixedCount, repairedVouchers };
}

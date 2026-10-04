import { calculateAccountingLedger } from '../src/lib/accountingLedgerService';
import { FinancialAccount, IncomeEntry, ExpenseEntry, AccountTransfer } from '../src/types';

function runCanonicalReportingAudit() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — CANONICAL REPORTING & AUDIT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (details) console.error(`   Details: ${details}`);
    }
  }

  // Sample setup
  const accounts: FinancialAccount[] = [
    {
      id: 'acc-cash',
      mosqueId: 'mosque-1',
      name: 'Central Mosque Cash',
      nameBn: 'মসজিদ কেন্দ্রীয় ক্যাশ',
      accountType: 'CASH',
      openingBalance: 50000,
      openingBalanceType: 'DEBIT',
      openingBalanceDate: '2026-01-01',
      currentBalance: 50000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'acc-bank',
      mosqueId: 'mosque-1',
      name: 'Islami Bank Savings',
      nameBn: 'ইসলামী ব্যাংক সঞ্চয়ী হিসাব',
      accountType: 'BANK',
      openingBalance: 100000,
      openingBalanceType: 'DEBIT',
      openingBalanceDate: '2026-01-01',
      currentBalance: 100000,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  // Incomes in January (10-15 Jan)
  const incomes: IncomeEntry[] = [
    {
      id: 'inc-1',
      mosqueId: 'mosque-1',
      voucherNumber: 'INC-2026-001',
      date: '2026-01-10',
      amount: 20000,
      accountId: 'acc-cash',
      accountName: 'মসজিদ কেন্দ্রীয় ক্যাশ',
      mainHeadId: 'head-juma',
      mainHeadNameBn: 'জুমার কালেকশন',
      paymentMethod: 'CASH',
      createdBy: 'user-admin',
      createdByName: 'হিসাবরক্ষক',
      status: 'APPROVED',
      createdAt: '2026-01-10T12:00:00Z',
      updatedAt: '2026-01-10T12:00:00Z',
    },
    {
      id: 'inc-2',
      mosqueId: 'mosque-1',
      voucherNumber: 'INC-2026-002',
      date: '2026-01-20',
      amount: 30000,
      accountId: 'acc-bank',
      accountName: 'ইসলামী ব্যাংক সঞ্চয়ী হিসাব',
      mainHeadId: 'head-donation',
      mainHeadNameBn: 'আজীবন সদস্য দান',
      paymentMethod: 'BANK',
      createdBy: 'user-admin',
      createdByName: 'হিসাবরক্ষক',
      status: 'APPROVED',
      createdAt: '2026-01-20T12:00:00Z',
      updatedAt: '2026-01-20T12:00:00Z',
    },
    // February Income
    {
      id: 'inc-3',
      mosqueId: 'mosque-1',
      voucherNumber: 'INC-2026-003',
      date: '2026-02-05',
      amount: 15000,
      accountId: 'acc-cash',
      accountName: 'মসজিদ কেন্দ্রীয় ক্যাশ',
      mainHeadId: 'head-juma',
      mainHeadNameBn: 'জুমার কালেকশন',
      paymentMethod: 'CASH',
      createdBy: 'user-admin',
      createdByName: 'হিসাবরক্ষক',
      status: 'APPROVED',
      createdAt: '2026-02-05T12:00:00Z',
      updatedAt: '2026-02-05T12:00:00Z',
    },
  ];

  // Expenses in January and February
  const expenses: ExpenseEntry[] = [
    {
      id: 'exp-1',
      mosqueId: 'mosque-1',
      voucherNumber: 'EXP-2026-001',
      date: '2026-01-15',
      amount: 10000,
      accountId: 'acc-cash',
      accountName: 'মসজিদ কেন্দ্রীয় ক্যাশ',
      mainHeadId: 'head-salary',
      mainHeadNameBn: 'স্টাফ বেতন',
      payeeName: 'ইমাম সাহেব',
      paymentMethod: 'CASH',
      createdBy: 'user-admin',
      createdByName: 'হিসাবরক্ষক',
      status: 'APPROVED',
      createdAt: '2026-01-15T12:00:00Z',
      updatedAt: '2026-01-15T12:00:00Z',
    },
    {
      id: 'exp-2',
      mosqueId: 'mosque-1',
      voucherNumber: 'EXP-2026-002',
      date: '2026-02-10',
      amount: 12000,
      accountId: 'acc-cash',
      accountName: 'মসজিদ কেন্দ্রীয় ক্যাশ',
      mainHeadId: 'head-salary',
      mainHeadNameBn: 'স্টাফ বেতন',
      payeeName: 'মুয়াজ্জিন সাহেব',
      paymentMethod: 'CASH',
      createdBy: 'user-admin',
      createdByName: 'হিসাবরক্ষক',
      status: 'APPROVED',
      createdAt: '2026-02-10T12:00:00Z',
      updatedAt: '2026-02-10T12:00:00Z',
    },
  ];

  // Transfer in January: Cash -> Bank ৳5,000 on 2026-01-25
  const transfers: AccountTransfer[] = [
    {
      id: 'trf-1',
      mosqueId: 'mosque-1',
      transferNumber: 'TRF-001',
      date: '2026-01-25',
      fromAccountId: 'acc-cash',
      fromAccountName: 'মসজিদ কেন্দ্রীয় ক্যাশ',
      toAccountId: 'acc-bank',
      toAccountName: 'ইসলামী ব্যাংক সঞ্চয়ী হিসাব',
      amount: 5000,
      createdBy: 'user-admin',
      createdByName: 'হিসাবরক্ষক',
      createdAt: '2026-01-25T10:00:00Z',
    },
  ];

  // --- TEST 1: First Accounting Period (Jan 1 - Jan 31) ---
  const janLedger = calculateAccountingLedger({
    accounts,
    incomes,
    expenses,
    transfers,
    accountFilter: 'ALL',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });

  // Jan Opening = 50,000 + 100,000 = 150,000
  assert(janLedger.openingBalance === 150000, 'Test 1.1: January Opening Balance equals sum of Account Opening Balances (৳150,000)', `Got ${janLedger.openingBalance}`);
  assert(janLedger.totalDebit === 50000, 'Test 1.2: January Total Income is ৳50,000', `Got ${janLedger.totalDebit}`);
  assert(janLedger.totalCredit === 10000, 'Test 1.3: January Total Expense is ৳10,000', `Got ${janLedger.totalCredit}`);
  // Transfer within 'ALL' scope is 0 net change
  // Closing = 150,000 + 50,000 - 10,000 = 190,000
  assert(janLedger.closingBalance === 190000, 'Test 1.4: January Closing Balance is ৳190,000', `Got ${janLedger.closingBalance}`);

  // --- TEST 2: Consecutive Period Continuity (February 1 - February 28) ---
  const febLedger = calculateAccountingLedger({
    accounts,
    incomes,
    expenses,
    transfers,
    accountFilter: 'ALL',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
  });

  assert(
    febLedger.openingBalance === janLedger.closingBalance,
    `Test 2.1: February Opening Balance (৳${febLedger.openingBalance}) === January Closing Balance (৳${janLedger.closingBalance})`,
    `Feb Opening: ${febLedger.openingBalance}, Jan Closing: ${janLedger.closingBalance}`
  );
  assert(febLedger.totalDebit === 15000, 'Test 2.2: February Total Income is ৳15,000', `Got ${febLedger.totalDebit}`);
  assert(febLedger.totalCredit === 12000, 'Test 2.3: February Total Expense is ৳12,000', `Got ${febLedger.totalCredit}`);
  assert(febLedger.closingBalance === 193000, 'Test 2.4: February Closing Balance is ৳193,000 (190k + 15k - 12k)', `Got ${febLedger.closingBalance}`);

  // --- TEST 3: Mid-Month Arbitrary Date Range (Jan 15 - Jan 25) ---
  const midJanLedger = calculateAccountingLedger({
    accounts,
    incomes,
    expenses,
    transfers,
    accountFilter: 'ALL',
    startDate: '2026-01-15',
    endDate: '2026-01-25',
  });
  // Before Jan 15: Baseline (150,000) + inc-1 on Jan 10 (20,000) = 170,000
  assert(midJanLedger.openingBalance === 170000, 'Test 3.1: Mid-period opening balance derived from transactions strictly prior to start date (৳170,000)', `Got ${midJanLedger.openingBalance}`);
  // During Jan 15-25: inc-2 (30k), exp-1 (10k), trf-1 (net 0)
  assert(midJanLedger.closingBalance === 190000, 'Test 3.2: Mid-period closing balance is ৳190,000', `Got ${midJanLedger.closingBalance}`);

  // --- TEST 4: Account-Level Balances & Transfer Rule ---
  // Cash Account in January:
  // Baseline: 50,000
  // Jan 10 Income: +20,000
  // Jan 15 Expense: -10,000
  // Jan 25 Transfer Out to Bank: -5,000
  // Jan 31 Closing Cash: 55,000
  const cashJanLedger = calculateAccountingLedger({
    accounts,
    incomes,
    expenses,
    transfers,
    accountFilter: 'acc-cash',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });
  assert(cashJanLedger.openingBalance === 50000, 'Test 4.1: Cash Account Opening Balance is ৳50,000', `Got ${cashJanLedger.openingBalance}`);
  assert(cashJanLedger.totalDebit === 20000, 'Test 4.2: Cash Inflow is ৳20,000', `Got ${cashJanLedger.totalDebit}`);
  assert(cashJanLedger.totalCredit === 15000, 'Test 4.3: Cash Outflow is ৳15,000 (10k expense + 5k transfer out)', `Got ${cashJanLedger.totalCredit}`);
  assert(cashJanLedger.closingBalance === 55000, 'Test 4.4: Cash Closing Balance is ৳55,000', `Got ${cashJanLedger.closingBalance}`);

  // Bank Account in January:
  // Baseline: 100,000
  // Jan 20 Income: +30,000
  // Jan 25 Transfer In from Cash: +5,000
  // Jan 31 Closing Bank: 135,000
  const bankJanLedger = calculateAccountingLedger({
    accounts,
    incomes,
    expenses,
    transfers,
    accountFilter: 'acc-bank',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });
  assert(bankJanLedger.openingBalance === 100000, 'Test 4.5: Bank Account Opening Balance is ৳100,000', `Got ${bankJanLedger.openingBalance}`);
  assert(bankJanLedger.totalDebit === 35000, 'Test 4.6: Bank Inflow is ৳35,000 (30k income + 5k transfer in)', `Got ${bankJanLedger.totalDebit}`);
  assert(bankJanLedger.closingBalance === 135000, 'Test 4.7: Bank Closing Balance is ৳135,000', `Got ${bankJanLedger.closingBalance}`);

  // Total consistency: Cash Closing (55k) + Bank Closing (135k) === Combined Closing (190k)
  assert(
    cashJanLedger.closingBalance + bankJanLedger.closingBalance === janLedger.closingBalance,
    `Test 4.8: Sum of Account Closing Balances (55k + 135k = 190k) equals Combined Closing Balance (190k)`,
    `Cash+Bank: ${cashJanLedger.closingBalance + bankJanLedger.closingBalance}, Combined: ${janLedger.closingBalance}`
  );

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passed} / ${total} Checks Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runCanonicalReportingAudit();

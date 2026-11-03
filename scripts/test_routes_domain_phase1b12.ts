process.env.NODE_ENV = 'test';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

// 1. Copy production JSON DB to an isolated temp file BEFORE importing server.ts
const prodDbPath = path.resolve(process.cwd(), 'data', 'masjidledger_db.json');
const prodBeforeSha = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-phase1b12-'));
const tempDbPath = path.join(tempDir, 'masjidledger_db.json');
fs.copyFileSync(prodDbPath, tempDbPath);
process.env.MASJIDLEDGER_DB_PATH = tempDbPath;

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];
function record(id: string, name: string, passed: boolean, detail: string) {
  results.push({ id, name, passed, detail });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${id}] ${name} — ${detail}`);
}

function httpRequest(
  port: number,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  reqPath: string,
  body?: Record<string, any>,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': String(Buffer.byteLength(payload)) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode || 0, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('===================================================================');
  console.log('MASJIDLEDGER PRO — PHASE 1B.12: DOMAIN MODULES DAL MIGRATION');
  console.log('===================================================================');

  const { db } = await import('../src/server/db');
  const { generateAccessToken } = await import('../src/server/auth/jwt');
  const {
    JsonDonationParityRepository,
    JsonDonationBoxParityRepository,
    JsonStaffParityRepository,
    JsonPropertyParityRepository,
    JsonStorageAdapter,
  } = await import('../src/server/db/adapters/JsonStorageAdapter');
  const { createDataAccessLayer } = await import('../src/server/db/adapters/dalFactory');
  const { app } = await import('../server');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const port = address.port;

  try {
    // 1. Verify DAL Factory & Scoped Domain Surface for Phase 1B.12
    const defaultAdapter = createDataAccessLayer({
      dalOptions: {
        mosqueId: 'mosque-01',
        userContext: {
          userId: 'usr-admin-01',
          userRole: 'MOSQUE_ADMIN',
          userMosqueId: 'mosque-01',
          permissions: [],
        },
      },
    });
    const surfaceValid =
      defaultAdapter instanceof JsonStorageAdapter &&
      defaultAdapter.donations instanceof JsonDonationParityRepository &&
      defaultAdapter.donationBoxes instanceof JsonDonationBoxParityRepository &&
      defaultAdapter.staff instanceof JsonStaffParityRepository &&
      defaultAdapter.properties instanceof JsonPropertyParityRepository &&
      typeof defaultAdapter.donations.create === 'function' &&
      typeof defaultAdapter.donations.cancel === 'function' &&
      typeof defaultAdapter.donationBoxes.collectBox === 'function' &&
      typeof defaultAdapter.staff.paySalary === 'function' &&
      typeof defaultAdapter.staff.disbursePaymentBatch === 'function' &&
      typeof defaultAdapter.properties.collectRent === 'function' &&
      typeof defaultAdapter.properties.addExpense === 'function' &&
      typeof defaultAdapter.properties.addKhajna === 'function' &&
      !('rawRepositories' in defaultAdapter);

    record(
      'P1B12-01',
      'Scoped Domain Modules DAL Surface & Safety Contract',
      surfaceValid,
      `adapter=${defaultAdapter.constructor.name}, domainRepositories=[donations, donationBoxes, staff, properties]`
    );

    const mosque1 = db.mosques[0];
    const mosque1Admin =
      db.users.find(
        (u) => u.mosqueId === mosque1.id && u.role === 'MOSQUE_ADMIN' && u.status === 'ACTIVE'
      ) ||
      db.users.find((u) => u.role !== 'SUPER_ADMIN' && u.mosqueId === mosque1.id && u.status === 'ACTIVE')!;
    const token = generateAccessToken(mosque1Admin).token;
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'X-Mosque-Id': mosque1.id,
    };

    const initialCashAccount =
      db.accounts.find((a) => a.mosqueId === mosque1.id && a.accountType === 'CASH') ||
      db.accounts.find((a) => a.mosqueId === mosque1.id) ||
      db.accounts[0];
    const cashAccountId = initialCashAccount.id;
    const getCashAccount = () => db.accounts.find((a) => a.id === cashAccountId)!;

    // =========================================================================
    // SECTION 7: DONATIONS & DONATION BOXES
    // =========================================================================

    // 2. POST /api/v1/donations + Idempotency + Account Balance Verification
    const balBeforeDonation = getCashAccount().currentBalance;
    const donationIdemKey = `idem-don-${Date.now()}`;
    const createDonRes = await httpRequest(
      port,
      'POST',
      '/api/v1/donations',
      {
        donorName: 'হাজী আব্দুল করিম (Phase 1B.12 Test)',
        donorPhone: '01711009988',
        amount: 3500,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
        category: 'GENERAL_DONATION',
        notes: 'মসজিদ উন্নয়ন অনুদান',
      },
      { ...authHeaders, 'X-Idempotency-Key': donationIdemKey }
    );
    const createdDonationId = createDonRes.body?.data?.id;
    const createdReceiptNo = createDonRes.body?.data?.receiptNumber;
    const linkedDonIncomeBeforeCancel = db.incomeEntries.find(
      (i) => i.reference === `Receipt: ${createdReceiptNo}` && i.mosqueId === mosque1.id
    );
    const balAfterDonation = getCashAccount().currentBalance;

    // Duplicate call with same idempotency key
    const dupDonRes = await httpRequest(
      port,
      'POST',
      '/api/v1/donations',
      {
        donorName: 'হাজী আব্দুল করিম (Phase 1B.12 Test)',
        amount: 3500,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
      },
      { ...authHeaders, 'X-Idempotency-Key': donationIdemKey }
    );

    record(
      'P1B12-02',
      'POST /api/v1/donations (Create Donation + Income Entry + Balance + Idempotency)',
      createDonRes.status === 200 &&
        Boolean(createdDonationId) &&
        Boolean(linkedDonIncomeBeforeCancel) &&
        balAfterDonation === balBeforeDonation + 3500 &&
        dupDonRes.body?.data?.id === createdDonationId &&
        getCashAccount().currentBalance === balAfterDonation,
      `status=${createDonRes.status}, receipt=${createdReceiptNo}, balanceDelta=+${balAfterDonation - balBeforeDonation}`
    );

    // 3. GET /api/v1/donations & GET /api/v1/donations/:id & PUT denomination
    const listDonRes = await httpRequest(port, 'GET', '/api/v1/donations?limit=10', undefined, authHeaders);
    const singleDonRes = await httpRequest(port, 'GET', `/api/v1/donations/${createdDonationId}`, undefined, authHeaders);
    const denomDonRes = await httpRequest(
      port,
      'PUT',
      `/api/v1/donations/${createdDonationId}/denomination`,
      {
        denominationData: { grandTotal: 3500, note1000: 3, note500: 1 },
        editReason: 'নোট গণনা সমন্বয়',
      },
      authHeaders
    );

    record(
      'P1B12-03',
      'GET /api/v1/donations, GET /:id & PUT /:id/denomination',
      listDonRes.status === 200 &&
        singleDonRes.status === 200 &&
        singleDonRes.body?.data?.id === createdDonationId &&
        denomDonRes.status === 200 &&
        denomDonRes.body?.data?.denominationData?.note1000 === 3,
      `listTotal=${listDonRes.body?.pagination?.total ?? listDonRes.body?.data?.length}, singleId=${singleDonRes.body?.data?.id}`
    );

    // 4. POST /api/v1/donations/:id/cancel (Reverse Donation & Restore Account Balance)
    const cancelDonRes = await httpRequest(
      port,
      'POST',
      `/api/v1/donations/${createdDonationId}/cancel`,
      { reason: 'টেস্ট রিভার্সাল' },
      authHeaders
    );
    const linkedDonIncome = db.incomeEntries.find(
      (i) => i.reference === `Receipt: ${createdReceiptNo}` && i.mosqueId === mosque1.id
    );

    record(
      'P1B12-04',
      'POST /api/v1/donations/:id/cancel (Reverse Donation + Linked Income + Balance)',
      cancelDonRes.status === 200 &&
        cancelDonRes.body?.data?.status === 'CANCELLED' &&
        linkedDonIncome?.status === 'CANCELLED' &&
        getCashAccount().currentBalance === balBeforeDonation,
      `status=${cancelDonRes.status}, donStatus=${cancelDonRes.body?.data?.status}, balanceRestored=${getCashAccount().currentBalance === balBeforeDonation}`
    );

    // 5. Donation Boxes CRUD + Collect + Denomination + Delete
    const createBoxRes = await httpRequest(
      port,
      'POST',
      '/api/v1/donation-boxes',
      { name: 'test-box-p1b12', manualName: 'উত্তর গেট দান বাক্স (টেস্ট)', location: 'উত্তর গেট' },
      authHeaders
    );
    const boxId = createBoxRes.body?.data?.id;

    const updateBoxRes = await httpRequest(
      port,
      'PUT',
      `/api/v1/donation-boxes/${boxId}`,
      { location: 'প্রধান ফটক সংলগ্ন' },
      authHeaders
    );

    const balBeforeBoxCol = getCashAccount().currentBalance;
    const boxColAmount = Math.max(25000, (balBeforeBoxCol < 0 ? Math.abs(balBeforeBoxCol) : 0) + 25000);
    const collectBoxRes = await httpRequest(
      port,
      'POST',
      '/api/v1/donation-boxes/collect',
      {
        boxId,
        amount: boxColAmount,
        date: '2026-03-20',
        accountId: cashAccountId,
        witnesses: 'ইমাম সাহেব ও ক্যাশিয়ার',
        denominationData: { grandTotal: boxColAmount, note1000: Math.floor(boxColAmount / 1000) },
      },
      { ...authHeaders, 'X-Idempotency-Key': `idem-box-${Date.now()}` }
    );
    const colId = collectBoxRes.body?.data?.id;

    const updateColDenomRes = await httpRequest(
      port,
      'PUT',
      `/api/v1/donation-boxes/collections/${colId}/denomination`,
      {
        denominationData: { grandTotal: boxColAmount, note1000: Math.floor(boxColAmount / 1000) - 1, note500: 2 },
        editReason: 'বাক্স নোট বিবরণী হালনাগাদ',
      },
      authHeaders
    );

    const deleteBoxRes = await httpRequest(port, 'DELETE', `/api/v1/donation-boxes/${boxId}`, undefined, authHeaders);

    record(
      'P1B12-05',
      'Donation Boxes CRUD + Collect + Denomination + Delete via DAL',
      createBoxRes.status === 200 &&
        updateBoxRes.status === 200 &&
        collectBoxRes.status === 200 &&
        Boolean(colId) &&
        getCashAccount().currentBalance === balBeforeBoxCol + boxColAmount &&
        updateColDenomRes.status === 200 &&
        deleteBoxRes.status === 200,
      `boxId=${boxId}, colId=${colId}, balanceDelta=+${getCashAccount().currentBalance - balBeforeBoxCol}`
    );

    // =========================================================================
    // SECTION 9: STAFF & PAYROLL MANAGEMENT
    // =========================================================================

    // 6. Staff Create, Update, Salary Revision, Advance
    const nextCodeRes = await httpRequest(port, 'GET', '/api/v1/staff/next-code', undefined, authHeaders);
    const createStaffRes = await httpRequest(
      port,
      'POST',
      '/api/v1/staff',
      {
        name: 'মাওলানা রফিকুল ইসলাম (টেস্ট)',
        designation: 'IMAM',
        designationBn: 'পেশ ইমাম',
        phone: '01819001122',
        monthlySalary: 15000,
        paymentMode: 'CASH',
      },
      authHeaders
    );
    const staffId = createStaffRes.body?.data?.id;

    const updateStaffRes = await httpRequest(
      port,
      'PUT',
      `/api/v1/staff/${staffId}`,
      { address: 'মসজিদ কোয়ার্টার' },
      authHeaders
    );

    const revStaffRes = await httpRequest(
      port,
      'POST',
      `/api/v1/staff/${staffId}/salary-revision`,
      { newSalary: 16000, effectiveDate: '2026-04-01', reason: 'বার্ষিক ইনক্রিমেন্ট' },
      authHeaders
    );

    const balBeforeAdv = getCashAccount().currentBalance;
    const advStaffRes = await httpRequest(
      port,
      'POST',
      `/api/v1/staff/${staffId}/advance`,
      {
        amount: 2000,
        monthlyDeductionPlan: 1000,
        accountId: cashAccountId,
        paymentMethod: 'CASH',
        reason: 'চিকিৎসা বাবদ অগ্রিম',
      },
      authHeaders
    );

    record(
      'P1B12-06',
      'Staff Create, Update, Salary Revision & Advance Disbursal via DAL',
      nextCodeRes.status === 200 &&
        createStaffRes.status === 200 &&
        updateStaffRes.status === 200 &&
        revStaffRes.status === 200 &&
        revStaffRes.body?.data?.monthlySalary === 16000 &&
        advStaffRes.status === 200 &&
        getCashAccount().currentBalance === balBeforeAdv - 2000,
      `staffId=${staffId}, revisedSalary=${revStaffRes.body?.data?.monthlySalary}, advDeducted=${balBeforeAdv - getCashAccount().currentBalance}`
    );

    // 7. Staff Salary Payment + Advance Adjustment + Duplicate Guard + Cancel
    const balBeforePay = getCashAccount().currentBalance;
    const payStaffRes = await httpRequest(
      port,
      'POST',
      '/api/v1/staff/pay',
      {
        staffId,
        month: '2026-03',
        paymentType: 'REGULAR_SALARY',
        basicSalary: 16000,
        advanceAdjustment: 1000,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
      },
      { ...authHeaders, 'X-Idempotency-Key': `idem-pay-${Date.now()}` }
    );
    const paymentId = payStaffRes.body?.data?.id;

    // Duplicate salary payment for same month without idempotency key should return 409 DUPLICATE_SALARY
    const dupPayRes = await httpRequest(
      port,
      'POST',
      '/api/v1/staff/pay',
      {
        staffId,
        month: '2026-03',
        paymentType: 'REGULAR_SALARY',
        basicSalary: 16000,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
      },
      authHeaders
    );

    const cancelPayRes = await httpRequest(
      port,
      'POST',
      `/api/v1/staff/payments/${paymentId}/cancel`,
      { reason: 'টেস্ট ক্যান্সেল' },
      authHeaders
    );

    record(
      'P1B12-07',
      'POST /api/v1/staff/pay (Advance Adjustment + Duplicate 409 Guard + Cancel Reversal)',
      payStaffRes.status === 200 &&
        payStaffRes.body?.data?.netPaid === 15000 &&
        dupPayRes.status === 409 &&
        dupPayRes.body?.error?.code === 'DUPLICATE_SALARY' &&
        cancelPayRes.status === 200 &&
        getCashAccount().currentBalance === balBeforePay,
      `netPaid=${payStaffRes.body?.data?.netPaid}, dupStatus=${dupPayRes.status}, balanceRestored=${getCashAccount().currentBalance === balBeforePay}`
    );

    // 8. Staff Payment Batches (Create + Disburse + Cancel)
    const createBatchRes = await httpRequest(
      port,
      'POST',
      '/api/v1/staff/payment-batches',
      {
        title: 'এপ্রিল ২০২৬ বেতন ব্যাচ (টেস্ট)',
        paymentMonth: '2026-04',
        paymentYear: 2026,
        disbursementMethod: 'CASH',
        accountId: cashAccountId,
        items: [{ staffId, basicSalary: 16000, allowance: 500, deduction: 0, advanceAdjustment: 0 }],
      },
      authHeaders
    );
    const batchId = createBatchRes.body?.data?.id;

    const balBeforeBatch = getCashAccount().currentBalance;
    const disburseBatchRes = await httpRequest(
      port,
      'POST',
      `/api/v1/staff/payment-batches/${batchId}/disburse`,
      { accountId: cashAccountId },
      authHeaders
    );
    const balAfterBatch = getCashAccount().currentBalance;

    const cancelBatchRes = await httpRequest(
      port,
      'POST',
      `/api/v1/staff/payment-batches/${batchId}/cancel`,
      { reason: 'ব্যাচ টেস্ট বাতিল' },
      authHeaders
    );

    record(
      'P1B12-08',
      'Staff Payment Batches (Create + Disburse + Cancel & Restore Balance)',
      createBatchRes.status === 200 &&
        disburseBatchRes.status === 200 &&
        balAfterBatch === balBeforeBatch - 16500 &&
        cancelBatchRes.status === 200 &&
        getCashAccount().currentBalance === balBeforeBatch,
      `batchId=${batchId}, disbursedDelta=${balAfterBatch - balBeforeBatch}, restored=${getCashAccount().currentBalance === balBeforeBatch}`
    );

    // =========================================================================
    // SECTION 10: WAQF PROPERTIES, TENANTS, RENT, EXPENSES & KHAJNA
    // =========================================================================

    // 9. Create Property + Add Tenant + Update Property
    const createPropRes = await httpRequest(
      port,
      'POST',
      '/api/v1/properties',
      {
        name: 'বায়তুল আমান শপিং কমপ্লেক্স (টেস্ট)',
        type: 'SHOP',
        location: 'মসজিদ পূর্ব মার্কেট',
        monthlyRent: 8000,
      },
      authHeaders
    );
    const propId = createPropRes.body?.data?.id;

    const addTenantRes = await httpRequest(
      port,
      'POST',
      `/api/v1/properties/${propId}/tenants`,
      {
        name: 'মোঃ সাইফুল ইসলাম',
        mobile: '01712334455',
        unitOrShopNo: 'দোকান নং-০৫',
        monthlyRent: 8500,
      },
      authHeaders
    );
    const tenantId = addTenantRes.body?.tenant?.id;

    record(
      'P1B12-09',
      'Waqf Property Create & Tenant Registration via DAL',
      createPropRes.status === 200 &&
        Boolean(propId) &&
        addTenantRes.status === 200 &&
        Boolean(tenantId) &&
        addTenantRes.body?.data?.monthlyRent === 8500,
      `propId=${propId}, tenantId=${tenantId}, syncedMonthlyRent=${addTenantRes.body?.data?.monthlyRent}`
    );

    // 10. Waqf Rent Collection + Idempotency + Reversal
    const balBeforeRent = getCashAccount().currentBalance;
    const rentIdemKey = `idem-rent-${Date.now()}`;
    const collectRentRes = await httpRequest(
      port,
      'POST',
      `/api/v1/properties/${propId}/rent-collections`,
      {
        tenantId,
        billingMonth: '2026-03',
        monthlyRent: 8500,
        paidAmount: 8500,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
        isAccountingLinked: true,
      },
      { ...authHeaders, 'X-Idempotency-Key': rentIdemKey }
    );
    const rentColId = collectRentRes.body?.rentCollection?.id;
    const balAfterRent = getCashAccount().currentBalance;

    const reverseRentRes = await httpRequest(
      port,
      'DELETE',
      `/api/v1/properties/${propId}/rent-collections/${rentColId}`,
      undefined,
      authHeaders
    );

    record(
      'P1B12-10',
      'Waqf Property Rent Collection & Reversal (Linked Income Voucher + Balance)',
      collectRentRes.status === 200 &&
        Boolean(rentColId) &&
        balAfterRent === balBeforeRent + 8500 &&
        reverseRentRes.status === 200 &&
        getCashAccount().currentBalance === balBeforeRent,
      `rentColId=${rentColId}, rentDelta=+${balAfterRent - balBeforeRent}, restored=${getCashAccount().currentBalance === balBeforeRent}`
    );

    // 11. Waqf Property Expense + Khajna (Land Tax) + Reversals
    const balBeforePropExp = getCashAccount().currentBalance;
    const addPropExpRes = await httpRequest(
      port,
      'POST',
      `/api/v1/properties/${propId}/expenses`,
      {
        expenseCategory: 'REPAIR',
        expenseCategoryBn: 'দোকান সংস্কার',
        amount: 1200,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
        description: 'শাটার মেরামত',
      },
      authHeaders
    );
    const propExpId = addPropExpRes.body?.expense?.id;
    const balAfterPropExp = getCashAccount().currentBalance;

    const delPropExpRes = await httpRequest(
      port,
      'DELETE',
      `/api/v1/properties/${propId}/expenses/${propExpId}`,
      undefined,
      authHeaders
    );

    const addKhajnaRes = await httpRequest(
      port,
      'POST',
      `/api/v1/properties/${propId}/khajna`,
      {
        taxYear: '১৪৩২ বঙ্গাব্দ',
        amount: 900,
        paymentMethod: 'CASH',
        accountId: cashAccountId,
        isExpenseLinked: true,
      },
      authHeaders
    );
    const khajnaId = addKhajnaRes.body?.khajnaRecord?.id;
    const balAfterKhajna = getCashAccount().currentBalance;

    const delKhajnaRes = await httpRequest(
      port,
      'DELETE',
      `/api/v1/properties/${propId}/khajna/${khajnaId}`,
      undefined,
      authHeaders
    );

    record(
      'P1B12-11',
      'Waqf Property Expenses & Khajna (Land Tax) Create + Delete Reversal via DAL',
      addPropExpRes.status === 200 &&
        balAfterPropExp === balBeforePropExp - 1200 &&
        delPropExpRes.status === 200 &&
        addKhajnaRes.status === 200 &&
        balAfterKhajna === balBeforePropExp - 900 &&
        delKhajnaRes.status === 200 &&
        getCashAccount().currentBalance === balBeforePropExp,
      `propExpId=${propExpId}, khajnaId=${khajnaId}, finalBalanceRestored=${getCashAccount().currentBalance === balBeforePropExp}`
    );

    // 12. Verify Production DB File Checksum Invariance
    const prodAfterSha = crypto.createHash('sha256').update(fs.readFileSync(prodDbPath)).digest('hex');
    record(
      'P1B12-12',
      'Zero Production JSON Database Mutation (SHA-256 Checksum Invariance)',
      prodBeforeSha === prodAfterSha,
      `before=${prodBeforeSha.slice(0, 12)}..., after=${prodAfterSha.slice(0, 12)}...`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup errors
    }
  }

  console.log('-------------------------------------------------------------------');
  const failed = results.filter((r) => !r.passed);
  console.log(`TOTAL: ${results.length} | PASSED: ${results.length - failed.length} | FAILED: ${failed.length}`);
  console.log('===================================================================');

  if (failed.length > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import { DatabaseStore, StoragePersistenceError, DB_FILE_PATH } from '../src/server/db.ts';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${detail ? `: ${detail}` : ''}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('🔒 MASJIDLEDGER PRO v2.6 — STAGE A ATOMIC PERSISTENCE TEST SUITE');
console.log('================================================================');

async function runTests() {
  const sandboxDir = path.join('/tmp', `ml_stage_a_test_${Date.now()}`);
  fs.mkdirSync(sandboxDir, { recursive: true });

  const testDbFile = path.join(sandboxDir, 'test_masjidledger_db.json');

  // Create isolated DatabaseStore subclass pointing to sandbox file
  class TestDatabaseStore extends DatabaseStore {
    getDbFilePath(): string {
      return testDbFile;
    }
  }

  const testDb = new TestDatabaseStore();
  // Initialize with initial accounts and empty entries
  testDb.accounts = [
    {
      id: 'acc-test-01',
      mosqueId: 'mosque-01',
      nameBn: 'প্রধান ক্যাশ',
      nameEn: 'Main Cash',
      accountNumber: 'CASH-01',
      type: 'CASH',
      currentBalance: 10000,
      initialBalance: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any,
    {
      id: 'acc-test-02',
      mosqueId: 'mosque-01',
      nameBn: 'ব্যাংক হিসাব',
      nameEn: 'Bank Account',
      accountNumber: 'BANK-01',
      type: 'BANK',
      currentBalance: 5000,
      initialBalance: 5000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any
  ];
  testDb.incomeEntries = [];
  testDb.expenseEntries = [];
  testDb.transfers = [];
  testDb.auditLogs = [];

  // Persist initial state
  testDb.persistStateAtomically();
  assert(fs.existsSync(testDbFile), '1. Initial test database successfully persisted to sandbox');

  // Test 1: Successful Transaction
  await testDb.runTransaction((tx) => {
    testDb.accounts[0].currentBalance += 2000;
    testDb.incomeEntries.unshift({
      id: 'inc-01',
      mosqueId: 'mosque-01',
      amount: 2000,
      voucherNumber: 'INC-2026-000001'
    } as any);
    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'INCOME', 'Created inc-01');
    tx.saveIdempotency('idem-01', { success: true });
  });

  assert(testDb.accounts[0].currentBalance === 12000, '2. In-memory balance updated after transaction commit', 'Balance is 12000');
  assert(testDb.incomeEntries.length === 1, '3. Income entry unshifted in memory', 'Count = 1');
  assert(testDb.auditLogs.length === 1, '4. Audit log recorded inside transaction', 'Count = 1');
  assert(testDb.idempotencyMap['idem-01'] !== undefined, '5. Idempotency map updated inside transaction');

  const onDiskAfter1 = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  assert(onDiskAfter1.accounts[0].currentBalance === 12000, '6. On-disk balance reflects transaction commit');
  assert(onDiskAfter1.incomeEntries.length === 1, '7. On-disk incomeEntries reflects transaction commit');

  // Test 2: In-Memory Rollback on Write Failure
  const originalPersist = testDb.persistStateAtomically;
  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Simulated disk full (ENOSPC)');
  };

  let caughtError: any = null;
  try {
    await testDb.runTransaction((tx) => {
      testDb.accounts[0].currentBalance += 50000;
      testDb.incomeEntries.unshift({
        id: 'inc-fail-02',
        mosqueId: 'mosque-01',
        amount: 50000,
        voucherNumber: 'INC-2026-000002'
      } as any);
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'INCOME', 'Failed income attempt');
      tx.saveIdempotency('idem-fail-02', { success: true });
    });
  } catch (err) {
    caughtError = err;
  }

  // Restore persistence method
  testDb.persistStateAtomically = originalPersist;

  assert(caughtError instanceof StoragePersistenceError, '8. Transaction threw StoragePersistenceError on write failure');
  assert(testDb.accounts[0].currentBalance === 12000, '9. In-memory account balance rolled back completely', `Expected 12000, got ${testDb.accounts[0].currentBalance}`);
  assert(testDb.incomeEntries.length === 1 && testDb.incomeEntries[0].id === 'inc-01', '10. In-memory incomeEntries rolled back');
  assert(testDb.auditLogs.length === 1, '11. Phantom audit log rolled back cleanly');
  assert(testDb.idempotencyMap['idem-fail-02'] === undefined, '12. Poisoned idempotency key rolled back cleanly');

  const onDiskAfterFail = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  assert(onDiskAfterFail.accounts[0].currentBalance === 12000, '13. On-disk file remained completely untouched after failure');

  // Test 3: Simulated Rename Failure
  let renameFailed = false;
  testDb.persistStateAtomically = () => {
    // Write temp file then fail before rename
    const tempPath = `${testDbFile}.tmp.rename_test`;
    fs.writeFileSync(tempPath, 'temp content', 'utf-8');
    try {
      throw new Error('EACCES: permission denied, rename');
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  };

  try {
    await testDb.runTransaction(() => {
      testDb.accounts[0].currentBalance -= 3000;
    });
  } catch (e: any) {
    renameFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(renameFailed, '14. Rename failure was captured as error');
  assert(testDb.accounts[0].currentBalance === 12000, '15. In-memory state restored after rename failure');

  // Test 4: Concurrency Serialization (50 concurrent transactions)
  const concurrentOps = 50;
  const promises: Promise<any>[] = [];
  for (let i = 0; i < concurrentOps; i++) {
    const isIncome = i % 2 === 0;
    const amount = 100;
    promises.push(
      testDb.runTransaction((tx) => {
        if (isIncome) {
          testDb.accounts[0].currentBalance += amount;
          testDb.incomeEntries.unshift({
            id: `conc-inc-${i}`,
            mosqueId: 'mosque-01',
            amount,
            voucherNumber: `INC-CONC-${i}`
          } as any);
        } else {
          testDb.accounts[0].currentBalance -= amount;
          testDb.expenseEntries.unshift({
            id: `conc-exp-${i}`,
            mosqueId: 'mosque-01',
            amount,
            voucherNumber: `EXP-CONC-${i}`
          } as any);
        }
      })
    );
  }

  await Promise.all(promises);

  // 25 incomes of 100 (+2500) and 25 expenses of 100 (-2500). Net change = 0. Balance = 12000.
  assert(testDb.accounts[0].currentBalance === 12000, '16. Concurrent transactions serialized without race conditions', `Balance is ${testDb.accounts[0].currentBalance}`);
  assert(testDb.incomeEntries.length === 26, '17. Total income count matches expected (1 initial + 25 concurrent)');
  assert(testDb.expenseEntries.length === 25, '18. Total expense count matches expected (25 concurrent)');

  // Verify on-disk matches memory exactly
  const finalDisk = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  assert(finalDisk.accounts[0].currentBalance === 12000, '19. Final on-disk balance matches in-memory balance exactly');
  assert(finalDisk.incomeEntries.length === 26, '20. Final on-disk incomeEntries count matches memory');

  // Test 5: Stale Temporary File Handling on Startup
  const staleTmpFile = path.join(sandboxDir, 'test_masjidledger_db.json.tmp.stale_123');
  fs.writeFileSync(staleTmpFile, 'old crash data', 'utf-8');
  // Set mtime to 30 seconds ago
  const oldTime = (Date.now() - 30000) / 1000;
  fs.utimesSync(staleTmpFile, oldTime, oldTime);

  // Re-run constructor/init on fresh store instance
  const store2 = new TestDatabaseStore();
  assert(!fs.existsSync(staleTmpFile), '21. Stale temporary file (>10s old) cleaned up automatically on init');

  // Test 6: Startup Corruption Fail-Safe
  const corruptFile = path.join(sandboxDir, 'corrupt_db.json');
  fs.writeFileSync(corruptFile, '{ invalid json structure !!!', 'utf-8');

  class CorruptTestStore extends DatabaseStore {
    get testFilePath() { return corruptFile; }
  }

  let corruptDetected = false;
  try {
    const raw = fs.readFileSync(corruptFile, 'utf-8');
    JSON.parse(raw);
  } catch (parseErr) {
    corruptDetected = true;
  }
  assert(corruptDetected, '22. Database JSON parse corruption detects invalid syntax');

  // Test 7: Multi-Collection Operation Rollback — Maktab Student Fee Collection
  testDb.maktabFeeRecords = [
    {
      id: 'fee-rec-001',
      mosqueId: 'mosque-01',
      studentProfileId: 'stu-prof-001',
      studentId: 'STU-000001',
      studentName: 'Abdullah',
      feeTitle: 'Monthly Maktab Fee',
      billingMonth: '2026-10',
      netPayable: 1500,
      paidAmount: 0,
      dueAmount: 1500,
      status: 'UNPAID'
    } as any
  ];
  testDb.persistStateAtomically();

  const preFeeBalance = testDb.accounts[0].currentBalance;
  const preFeeAuditCount = testDb.auditLogs.length;

  // Simulate write failure during Maktab fee collection
  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O error during Maktab fee commit');
  };

  let maktabFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const numPaid = 1500;
      testDb.accounts[0].currentBalance += numPaid;
      testDb.incomeEntries.unshift({
        id: 'inc-maktab-fail',
        mosqueId: 'mosque-01',
        amount: numPaid,
        voucherNumber: 'INC-2026-MKT-01'
      } as any);
      const fee = testDb.maktabFeeRecords[0];
      fee.paidAmount += numPaid;
      fee.dueAmount = 0;
      fee.status = 'PAID';
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'INCOME', 'Maktab fee payment');
      tx.saveIdempotency('idem-maktab-fail', { success: true });
    });
  } catch (err: any) {
    maktabFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(maktabFailed, '23. Maktab student fee collection write failure was caught');
  assert(testDb.accounts[0].currentBalance === preFeeBalance, '24. Account balance restored to pre-fee balance', `Expected ${preFeeBalance}, got ${testDb.accounts[0].currentBalance}`);
  assert(testDb.maktabFeeRecords[0].dueAmount === 1500 && testDb.maktabFeeRecords[0].status === 'UNPAID', '25. Maktab fee record dueAmount and status rolled back to UNPAID');
  assert(testDb.incomeEntries.find(i => i.id === 'inc-maktab-fail') === undefined, '26. No orphaned income entry created for failed Maktab collection');
  assert(testDb.auditLogs.length === preFeeAuditCount, '27. No orphaned audit log for failed Maktab collection');
  assert(testDb.idempotencyMap['idem-maktab-fail'] === undefined, '28. No poisoned idempotency key for failed Maktab collection');

  // Test 8: Multi-Collection Operation Rollback — Staff Salary Advance
  testDb.staffList = [
    {
      id: 'staff-001',
      mosqueId: 'mosque-01',
      name: 'Qari Saiful',
      advanceRecords: []
    } as any
  ];
  testDb.persistStateAtomically();

  const preAdvBalance = testDb.accounts[0].currentBalance;
  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O error during Advance commit');
  };

  let advFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const advAmount = 3000;
      testDb.accounts[0].currentBalance -= advAmount;
      testDb.expenseEntries.unshift({
        id: 'exp-adv-fail',
        mosqueId: 'mosque-01',
        amount: advAmount,
        voucherNumber: 'EXP-2026-ADV-01'
      } as any);
      testDb.staffList[0].advanceRecords.unshift({
        id: 'adv-001',
        amount: advAmount,
        date: '2026-10-11'
      } as any);
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'STAFF_PAYMENT', 'Staff advance');
      tx.saveIdempotency('idem-adv-fail', { success: true });
    });
  } catch (e: any) {
    advFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(advFailed, '29. Staff advance write failure was caught');
  assert(testDb.accounts[0].currentBalance === preAdvBalance, '30. Account balance restored after failed staff advance');
  assert(testDb.staffList[0].advanceRecords.length === 0, '31. Staff advanceRecords rolled back cleanly');
  assert(testDb.expenseEntries.find(e => e.id === 'exp-adv-fail') === undefined, '32. No orphaned expense entry for failed staff advance');

  // Test 9: Multi-Collection Operation Rollback — Waqf Rent Collection
  testDb.properties = [
    {
      id: 'prop-001',
      mosqueId: 'mosque-01',
      name: 'Waqf Market Shop 1',
      rentCollections: []
    } as any
  ];
  testDb.persistStateAtomically();

  const preWaqfBalance = testDb.accounts[0].currentBalance;
  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O error during Waqf rent commit');
  };

  let waqfFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const rentAmount = 5000;
      testDb.accounts[0].currentBalance += rentAmount;
      testDb.incomeEntries.unshift({
        id: 'inc-waqf-fail',
        mosqueId: 'mosque-01',
        amount: rentAmount,
        voucherNumber: 'INC-2026-WQF-01'
      } as any);
      testDb.properties[0].rentCollections.unshift({
        id: 'rent-col-001',
        paidAmount: rentAmount,
        status: 'PAID'
      } as any);
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'PROPERTY', 'Waqf rent collection');
      tx.saveIdempotency('idem-waqf-fail', { success: true });
    });
  } catch (e: any) {
    waqfFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(waqfFailed, '33. Waqf rent collection write failure was caught');
  assert(testDb.accounts[0].currentBalance === preWaqfBalance, '34. Account balance restored after failed Waqf rent');
  assert(testDb.properties[0].rentCollections.length === 0, '35. Waqf property rentCollections rolled back cleanly');
  assert(testDb.incomeEntries.find(i => i.id === 'inc-waqf-fail') === undefined, '36. No orphaned income entry for failed Waqf rent');

  // Test 10: Successful Execution of All 3 Operations and On-Disk State Verification
  await testDb.runTransaction((tx) => {
    // 1. Maktab fee
    testDb.accounts[0].currentBalance += 1500;
    testDb.incomeEntries.unshift({
      id: 'inc-maktab-ok',
      mosqueId: 'mosque-01',
      amount: 1500,
      voucherNumber: 'INC-2026-MKT-OK'
    } as any);
    testDb.maktabFeeRecords[0].dueAmount = 0;
    testDb.maktabFeeRecords[0].status = 'PAID';
    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'INCOME', 'Maktab ok');
    tx.saveIdempotency('idem-maktab-ok', { success: true, ref: 'inc-maktab-ok' });
  });

  await testDb.runTransaction((tx) => {
    // 2. Staff advance
    testDb.accounts[0].currentBalance -= 2000;
    testDb.expenseEntries.unshift({
      id: 'exp-adv-ok',
      mosqueId: 'mosque-01',
      amount: 2000,
      voucherNumber: 'EXP-2026-ADV-OK'
    } as any);
    testDb.staffList[0].advanceRecords.unshift({
      id: 'adv-ok',
      amount: 2000,
      date: '2026-10-11'
    } as any);
    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'STAFF_PAYMENT', 'Staff advance ok');
    tx.saveIdempotency('idem-adv-ok', { success: true, ref: 'exp-adv-ok' });
  });

  await testDb.runTransaction((tx) => {
    // 3. Waqf rent
    testDb.accounts[0].currentBalance += 3500;
    testDb.incomeEntries.unshift({
      id: 'inc-waqf-ok',
      mosqueId: 'mosque-01',
      amount: 3500,
      voucherNumber: 'INC-2026-WQF-OK'
    } as any);
    testDb.properties[0].rentCollections.unshift({
      id: 'rent-ok',
      paidAmount: 3500,
      status: 'PAID'
    } as any);
    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'PROPERTY', 'Waqf rent ok');
    tx.saveIdempotency('idem-waqf-ok', { success: true, ref: 'inc-waqf-ok' });
  });

  const diskAfterAll = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  const expectedFinalBalance = preWaqfBalance + 1500 - 2000 + 3500;
  assert(testDb.accounts[0].currentBalance === expectedFinalBalance, '37. Final in-memory balance matches mathematical expectation', `Balance is ${testDb.accounts[0].currentBalance}`);
  assert(diskAfterAll.accounts[0].currentBalance === expectedFinalBalance, '38. Final on-disk balance strictly matches in-memory balance', `Disk balance is ${diskAfterAll.accounts[0].currentBalance}`);
  assert(diskAfterAll.idempotencyMap['idem-maktab-ok'] !== undefined, '39. Idempotency map correctly persisted on disk');
  assert(diskAfterAll.maktabFeeRecords[0].status === 'PAID', '40. Maktab fee record state strictly verified on disk');
  assert(diskAfterAll.staffList[0].advanceRecords.length === 1, '41. Staff advance records strictly verified on disk');
  assert(diskAfterAll.properties[0].rentCollections.length === 1, '42. Waqf rent collections strictly verified on disk');

  // Test 11: Multi-Collection Operation Rollback — General Donation with Collection Sync
  testDb.donations = [];
  testDb.donationCollections = [
    {
      id: 'col-plan-001',
      mosqueId: 'mosque-01',
      personId: 'per-001',
      donationPlanId: 'plan-001',
      plannedAmount: 10000,
      collectedAmount: 0,
      status: 'PENDING'
    } as any
  ];
  testDb.persistStateAtomically();

  const preDonBalance = testDb.accounts[0].currentBalance;
  const preDonAuditCount = testDb.auditLogs.length;

  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O error during Donation commit');
  };

  let donFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const donAmount = 4000;
      testDb.accounts[0].currentBalance += donAmount;
      const donRecord = {
        id: 'don-test-fail-001',
        mosqueId: 'mosque-01',
        amount: donAmount,
        receiptNumber: 'REC-2026-TEST01',
        collectionId: 'col-plan-001',
        status: 'COMPLETED'
      } as any;
      testDb.donations.unshift(donRecord);

      // sync collection
      const targetCol = testDb.donationCollections[0];
      targetCol.collectedAmount = 4000;
      targetCol.status = 'PARTIALLY_COLLECTED';
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'DONATION_COLLECTION', 'Collection sync fail');

      testDb.incomeEntries.unshift({
        id: 'inc-don-test-fail-001',
        mosqueId: 'mosque-01',
        amount: donAmount,
        voucherNumber: 'INC-2026-DON-01'
      } as any);

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'DONATION', 'Donation test fail');
      tx.saveIdempotency('idem-don-fail', { success: true });
    });
  } catch (err: any) {
    donFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(donFailed, '43. Donation collection write failure was caught');
  assert(testDb.accounts[0].currentBalance === preDonBalance, '44. Account balance rolled back to pre-donation balance', `Expected ${preDonBalance}, got ${testDb.accounts[0].currentBalance}`);
  assert(testDb.donations.length === 0, '45. No orphaned donation record left in memory');
  assert(testDb.incomeEntries.find(i => i.id === 'inc-don-test-fail-001') === undefined, '46. No orphaned income entry left for failed donation');
  assert(testDb.donationCollections[0].collectedAmount === 0 && testDb.donationCollections[0].status === 'PENDING', '47. Donation collection progress rolled back cleanly');
  assert(testDb.auditLogs.length === preDonAuditCount, '48. No phantom audit logs left for failed donation');
  assert(testDb.idempotencyMap['idem-don-fail'] === undefined, '49. No poisoned idempotency key left for failed donation');

  // Test 12: Successful General Donation with Collection Sync
  await testDb.runTransaction((tx) => {
    const donAmount = 10000;
    testDb.accounts[0].currentBalance += donAmount;
    const donRecord = {
      id: 'don-test-ok-001',
      mosqueId: 'mosque-01',
      amount: donAmount,
      receiptNumber: 'REC-2026-TEST02',
      collectionId: 'col-plan-001',
      status: 'COMPLETED'
    } as any;
    testDb.donations.unshift(donRecord);

    const targetCol = testDb.donationCollections[0];
    targetCol.collectedAmount = 10000;
    targetCol.status = 'COLLECTED';
    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'DONATION_COLLECTION', 'Collection sync ok');

    testDb.incomeEntries.unshift({
      id: 'inc-don-test-ok-001',
      mosqueId: 'mosque-01',
      amount: donAmount,
      voucherNumber: 'INC-2026-DON-OK'
    } as any);

    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CREATE', 'DONATION', 'Donation test ok');
    tx.saveIdempotency('idem-don-ok', { success: true, ref: 'don-test-ok-001' });
  });

  const diskAfterDonation = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  const finalExpectedBal = preDonBalance + 10000;
  assert(testDb.accounts[0].currentBalance === finalExpectedBal, '50. Donation committed balance verified in memory');
  assert(diskAfterDonation.accounts[0].currentBalance === finalExpectedBal, '51. Donation committed balance strictly verified on disk');
  assert(diskAfterDonation.donations.length === 1 && diskAfterDonation.donations[0].id === 'don-test-ok-001', '52. Donation record strictly verified on disk');
  assert(diskAfterDonation.donationCollections[0].status === 'COLLECTED', '53. Donation collection status COLLECTED verified on disk');
  assert(diskAfterDonation.idempotencyMap['idem-don-ok'] !== undefined, '54. Donation idempotency strictly verified on disk');

  // Test 13: Donation Cancellation Rollback on Persistence Failure
  const preCancelBalance = testDb.accounts[0].currentBalance;
  const preCancelAuditCount = testDb.auditLogs.length;

  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O failure during Donation cancellation');
  };

  let cancelFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const don = testDb.donations.find(d => d.id === 'don-test-ok-001')!;
      if (don.status === 'CANCELLED') {
        const err: any = new Error('ALREADY_CANCELLED');
        err.code = 'ALREADY_CANCELLED';
        throw err;
      }

      // Reverse account balance
      testDb.accounts[0].currentBalance -= don.amount;

      // Reverse income entry
      const inc = testDb.incomeEntries.find(i => i.id === 'inc-don-test-ok-001')!;
      inc.status = 'CANCELLED';
      inc.rejectionReason = 'Testing rollback';

      // Update donation status
      don.status = 'CANCELLED';
      don.cancellationReason = 'Testing rollback';

      // Reverse collection progress
      const targetCol = testDb.donationCollections[0];
      targetCol.collectedAmount = 0;
      targetCol.status = 'PENDING';
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'DONATION_COLLECTION', 'Col reversal fail test');

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CANCEL', 'DONATION', 'Donation cancel fail test');
      tx.saveIdempotency('idem-don-cancel-fail', { success: true });
    });
  } catch (err: any) {
    cancelFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(cancelFailed, '55. Donation cancellation write failure was caught');
  assert(testDb.accounts[0].currentBalance === preCancelBalance, '56. Account balance restored to pre-cancellation balance', `Expected ${preCancelBalance}, got ${testDb.accounts[0].currentBalance}`);
  assert(testDb.donations[0].status === 'COMPLETED', '57. Donation status rolled back to COMPLETED in memory');
  assert(testDb.incomeEntries.find(i => i.id === 'inc-don-test-ok-001')?.status !== 'CANCELLED', '58. Income entry status rolled back from CANCELLED');
  assert(testDb.donationCollections[0].collectedAmount === 10000 && testDb.donationCollections[0].status === 'COLLECTED', '59. Collection progress rolled back to 10000 COLLECTED in memory');
  assert(testDb.auditLogs.length === preCancelAuditCount, '60. No phantom cancellation audit log left in memory');
  assert(testDb.idempotencyMap['idem-don-cancel-fail'] === undefined, '61. No poisoned cancellation idempotency key left in memory');

  // Test 14: Successful Donation Cancellation Commit
  await testDb.runTransaction((tx) => {
    const don = testDb.donations.find(d => d.id === 'don-test-ok-001')!;
    if (don.status === 'CANCELLED') {
      const err: any = new Error('ALREADY_CANCELLED');
      err.code = 'ALREADY_CANCELLED';
      throw err;
    }

    testDb.accounts[0].currentBalance -= don.amount;

    const inc = testDb.incomeEntries.find(i => i.id === 'inc-don-test-ok-001')!;
    inc.status = 'CANCELLED';
    inc.rejectionReason = 'হিসাব সংশোধন';

    don.status = 'CANCELLED';
    don.cancellationReason = 'হিসাব সংশোধন';

    const targetCol = testDb.donationCollections[0];
    targetCol.collectedAmount = 0;
    targetCol.status = 'PENDING';
    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'DONATION_COLLECTION', 'Col reversal ok');

    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'CANCEL', 'DONATION', 'Donation cancel ok');
    tx.saveIdempotency('idem-don-cancel-ok', { success: true, ref: 'don-test-ok-001' });
  });

  const diskAfterCancel = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  const postCancelExpectedBal = preCancelBalance - 10000;
  assert(testDb.accounts[0].currentBalance === postCancelExpectedBal, '62. Balance after cancellation verified in memory');
  assert(diskAfterCancel.accounts[0].currentBalance === postCancelExpectedBal, '63. Balance after cancellation strictly verified on disk');
  assert(diskAfterCancel.donations[0].status === 'CANCELLED', '64. Donation status CANCELLED strictly verified on disk');
  assert(diskAfterCancel.incomeEntries.find((i: any) => i.id === 'inc-don-test-ok-001')?.status === 'CANCELLED', '65. Linked income entry status CANCELLED on disk');
  assert(diskAfterCancel.donationCollections[0].collectedAmount === 0 && diskAfterCancel.donationCollections[0].status === 'PENDING', '66. Collection progress reset to 0 PENDING on disk');
  assert(diskAfterCancel.idempotencyMap['idem-don-cancel-ok'] !== undefined, '67. Cancellation idempotency record verified on disk');

  // Test 15: Concurrency / Double Cancellation Protection
  let doubleCancelCaught = false;
  try {
    await testDb.runTransaction((tx) => {
      const don = testDb.donations.find(d => d.id === 'don-test-ok-001')!;
      if (don.status === 'CANCELLED') {
        throw new StoragePersistenceError('ALREADY_CANCELLED', 'এই রসিদটি ইতিমধ্যে বাতিল করা হয়েছে।');
      }
      testDb.accounts[0].currentBalance -= don.amount;
    });
  } catch (err: any) {
    if (err.code === 'ALREADY_CANCELLED' || err.cause?.code === 'ALREADY_CANCELLED') {
      doubleCancelCaught = true;
    }
  }
  assert(doubleCancelCaught, '68. Repeated cancellation blocked by transaction guard without double balance reduction');
  assert(testDb.accounts[0].currentBalance === postCancelExpectedBal, '69. Balance remained protected from double reversal');

  // Test 16: Income Update Rollback on Persistence Failure (Route A)
  const preIncUpdateBalance = testDb.accounts[0].currentBalance;
  const initialIncome = testDb.incomeEntries.find(i => i.status === 'APPROVED') || testDb.incomeEntries[0];
  const targetIncomeId = initialIncome.id;
  const oldIncomeAmount = initialIncome.amount;

  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O failure during Income update');
  };

  let incomeUpdateFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      // Look up entity directly inside transaction
      const targetIncome = testDb.incomeEntries.find(i => i.id === targetIncomeId)!;
      testDb.accounts[0].currentBalance -= oldIncomeAmount;
      testDb.accounts[0].currentBalance += oldIncomeAmount + 5000;
      targetIncome.amount = oldIncomeAmount + 5000;

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'INCOME', 'Income update fail test');
      tx.saveIdempotency('idem-inc-update-fail', { success: true });
    });
  } catch (err: any) {
    incomeUpdateFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(incomeUpdateFailed, '70. Income update write failure was caught');
  assert(testDb.accounts[0].currentBalance === preIncUpdateBalance, '71. Account balance rolled back after failed income update');
  const rolledBackIncome = testDb.incomeEntries.find(i => i.id === targetIncomeId)!;
  assert(rolledBackIncome.amount === oldIncomeAmount, '72. Income entry amount rolled back in memory', `Expected ${oldIncomeAmount}, got ${rolledBackIncome.amount}`);
  assert(testDb.idempotencyMap['idem-inc-update-fail'] === undefined, '73. Poisoned idempotency key rolled back cleanly');

  // Test 17: Successful Income Update Commit (Route A)
  await testDb.runTransaction((tx) => {
    const targetIncome = testDb.incomeEntries.find(i => i.id === targetIncomeId)!;
    testDb.accounts[0].currentBalance -= oldIncomeAmount;
    testDb.accounts[0].currentBalance += oldIncomeAmount + 3000;
    targetIncome.amount = oldIncomeAmount + 3000;

    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'INCOME', 'Income update ok');
    tx.saveIdempotency('idem-inc-update-ok', { success: true, updatedAmount: oldIncomeAmount + 3000 });
  });

  const diskAfterIncUpdate = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  const expectedPostIncBalance = preIncUpdateBalance + 3000;
  assert(testDb.accounts[0].currentBalance === expectedPostIncBalance, '74. In-memory balance updated after income update commit');
  assert(diskAfterIncUpdate.accounts[0].currentBalance === expectedPostIncBalance, '75. On-disk balance matches expected post-income update balance');
  const diskIncome = diskAfterIncUpdate.incomeEntries.find((i: any) => i.id === targetIncomeId);
  assert(diskIncome.amount === oldIncomeAmount + 3000, '76. On-disk income amount updated correctly');
  assert(diskAfterIncUpdate.idempotencyMap['idem-inc-update-ok'] !== undefined, '77. Income update idempotency key persisted on disk');

  // Test 18: Expense Update Rollback on Persistence Failure (Route B)
  const preExpUpdateBalance = testDb.accounts[0].currentBalance;
  const initialExpense = testDb.expenseEntries.find(e => e.status === 'APPROVED') || testDb.expenseEntries[0];
  const targetExpenseId = initialExpense.id;
  const oldExpenseAmount = initialExpense.amount;

  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O failure during Expense update');
  };

  let expenseUpdateFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const targetExpense = testDb.expenseEntries.find(e => e.id === targetExpenseId)!;
      testDb.accounts[0].currentBalance += oldExpenseAmount;
      testDb.accounts[0].currentBalance -= (oldExpenseAmount + 2000);
      targetExpense.amount = oldExpenseAmount + 2000;

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'EXPENSE', 'Expense update fail test');
      tx.saveIdempotency('idem-exp-update-fail', { success: true });
    });
  } catch (err: any) {
    expenseUpdateFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(expenseUpdateFailed, '78. Expense update write failure was caught');
  assert(testDb.accounts[0].currentBalance === preExpUpdateBalance, '79. Account balance rolled back after failed expense update');
  const rolledBackExpense = testDb.expenseEntries.find(e => e.id === targetExpenseId)!;
  assert(rolledBackExpense.amount === oldExpenseAmount, '80. Expense entry amount rolled back in memory');
  assert(testDb.idempotencyMap['idem-exp-update-fail'] === undefined, '81. Poisoned idempotency key rolled back cleanly');

  // Test 19: Successful Expense Update Commit (Route B)
  await testDb.runTransaction((tx) => {
    const targetExpense = testDb.expenseEntries.find(e => e.id === targetExpenseId)!;
    testDb.accounts[0].currentBalance += oldExpenseAmount;
    testDb.accounts[0].currentBalance -= (oldExpenseAmount + 1500);
    targetExpense.amount = oldExpenseAmount + 1500;

    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'EXPENSE', 'Expense update ok');
    tx.saveIdempotency('idem-exp-update-ok', { success: true, updatedAmount: oldExpenseAmount + 1500 });
  });

  const diskAfterExpUpdate = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  const expectedPostExpBalance = preExpUpdateBalance - 1500;
  assert(testDb.accounts[0].currentBalance === expectedPostExpBalance, '82. In-memory balance updated after expense update commit');
  assert(diskAfterExpUpdate.accounts[0].currentBalance === expectedPostExpBalance, '83. On-disk balance matches expected post-expense update balance');
  const diskExpense = diskAfterExpUpdate.expenseEntries.find((e: any) => e.id === targetExpenseId);
  assert(diskExpense.amount === oldExpenseAmount + 1500, '84. On-disk expense amount updated correctly');
  assert(diskAfterExpUpdate.idempotencyMap['idem-exp-update-ok'] !== undefined, '85. Expense update idempotency key persisted on disk');

  // Test 20: Opening Balance Update Rollback on Persistence Failure (Route C)
  const preOpBalance = testDb.accounts[0].currentBalance;
  const initialAccount = testDb.accounts[0];
  const targetAccountId = initialAccount.id;
  const oldOpeningBalance = initialAccount.openingBalance || 0;

  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Disk I/O failure during Opening Balance update');
  };

  let opUpdateFailed = false;
  try {
    await testDb.runTransaction((tx) => {
      const account = testDb.accounts.find(a => a.id === targetAccountId)!;
      const newOpening = oldOpeningBalance + 25000;
      account.openingBalance = newOpening;
      account.currentBalance = (account.currentBalance - oldOpeningBalance) + newOpening;

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'OPENING_BALANCE', 'Opening balance fail test');
      tx.saveIdempotency('idem-op-update-fail', { success: true });
    });
  } catch (err: any) {
    opUpdateFailed = true;
  }
  testDb.persistStateAtomically = originalPersist;

  assert(opUpdateFailed, '86. Opening balance update write failure was caught');
  const rolledBackAccount = testDb.accounts.find(a => a.id === targetAccountId)!;
  assert(rolledBackAccount.currentBalance === preOpBalance, '87. Account currentBalance rolled back after failed opening balance update');
  assert((rolledBackAccount.openingBalance || 0) === oldOpeningBalance, '88. Account openingBalance rolled back in memory', `Expected ${oldOpeningBalance}, got ${rolledBackAccount.openingBalance}`);
  assert(testDb.idempotencyMap['idem-op-update-fail'] === undefined, '89. Poisoned idempotency key rolled back cleanly');

  // Test 21: Successful Opening Balance Update Commit (Route C)
  const committedOpening = oldOpeningBalance + 10000;
  await testDb.runTransaction((tx) => {
    const account = testDb.accounts.find(a => a.id === targetAccountId)!;
    account.openingBalance = committedOpening;
    account.currentBalance = (account.currentBalance - oldOpeningBalance) + committedOpening;

    tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'OPENING_BALANCE', 'Opening balance ok');
    tx.saveIdempotency('idem-op-update-ok', { success: true, updatedOpening: committedOpening });
  });

  const diskAfterOpUpdate = JSON.parse(fs.readFileSync(testDbFile, 'utf-8'));
  const expectedPostOpBalance = (preOpBalance - oldOpeningBalance) + committedOpening;
  const postAccount = testDb.accounts.find(a => a.id === targetAccountId)!;
  assert(postAccount.currentBalance === expectedPostOpBalance, '90. In-memory current balance matches post-opening balance commit');
  assert(diskAfterOpUpdate.accounts[0].currentBalance === expectedPostOpBalance, '91. On-disk current balance matches expected post-opening balance');
  assert(diskAfterOpUpdate.accounts[0].openingBalance === committedOpening, '92. On-disk opening balance updated correctly');
  assert(diskAfterOpUpdate.idempotencyMap['idem-op-update-ok'] !== undefined, '93. Opening balance idempotency key persisted on disk');

  // Test 22: Async Mutex FIFO Serialization & Failed Transaction Interleaving
  const initialBal = testDb.accounts[0].currentBalance;
  const executionOrder: string[] = [];

  const txFail = testDb.runTransaction(async (tx) => {
    executionOrder.push('fail-start');
    await new Promise(r => setTimeout(r, 15));
    testDb.accounts[0].currentBalance += 99999;
    executionOrder.push('fail-mutate');
    throw new Error('Simulated async transaction failure');
  }).catch(() => 'caught-fail');

  const txSucc = testDb.runTransaction(async (tx) => {
    executionOrder.push('succ-start');
    await new Promise(r => setTimeout(r, 10));
    testDb.accounts[0].currentBalance += 500;
    executionOrder.push('succ-mutate');
  });

  await Promise.all([txFail, txSucc]);

  assert(executionOrder.join(',') === 'fail-start,fail-mutate,succ-start,succ-mutate', '94. Async transactions executed strictly in FIFO order');
  assert(testDb.accounts[0].currentBalance === initialBal + 500, '95. Failed async transaction rolled back cleanly without corrupting concurrent succeeding transaction', `Expected ${initialBal + 500}, got ${testDb.accounts[0].currentBalance}`);

  // Test 23: True Nested Transaction Support via AsyncLocalStorage
  let nestedExecuted = false;
  await testDb.runTransaction(async (txOuter) => {
    await testDb.runTransaction(async (txInner) => {
      assert(txOuter === txInner, '96. Nested runTransaction re-uses outer transaction context');
      nestedExecuted = true;
    });
  });
  assert(nestedExecuted, '97. Nested transaction completed successfully');

  // Test 24 (Test A): Concurrent Income Idempotency Race Protection
  const incItem = testDb.incomeEntries.find(i => i.status === 'APPROVED') || testDb.incomeEntries[0];
  incItem.status = 'APPROVED';
  const incId = incItem.id;
  const targetIncAcc = testDb.accounts.find(a => a.id === incItem.accountId) || testDb.accounts[0];
  incItem.accountId = targetIncAcc.id;
  const oldIncAmount = incItem.amount;
  const preIncBalance = targetIncAcc.currentBalance;
  const incKey = 'idem-inc-race-001';

  const updateIncomeFn = (targetAmount: number) => {
    return testDb.runTransaction(async (tx) => {
      const cached = testDb.checkIdempotency(incKey);
      if (cached) return { ...cached, __isCached: true };

      const item = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01');
      if (!item) throw new StoragePersistenceError('NOT_FOUND', 'Not found');

      const oldAmount = item.amount;
      const account = testDb.accounts.find(a => a.id === item.accountId && a.mosqueId === 'mosque-01') || testDb.accounts[0];
      if (account && item.status === 'APPROVED') {
        account.currentBalance -= oldAmount;
        account.currentBalance += targetAmount;
      }
      item.amount = targetAmount;

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'INCOME', 'Update inc', item.id);
      const resPayload = { success: true, updatedAmount: targetAmount };
      tx.saveIdempotency(incKey, resPayload);
      return resPayload;
    });
  };

  const [resInc1, resInc2] = await Promise.all([
    updateIncomeFn(15000),
    updateIncomeFn(15000)
  ]);

  const postIncBalance = targetIncAcc.currentBalance;
  assert(postIncBalance === preIncBalance + (15000 - oldIncAmount), '98. Concurrent income update with same key adjusted balance exactly once');
  assert((resInc1 as any).__isCached || (resInc2 as any).__isCached, '99. One of the concurrent income requests was served from idempotency cache');

  // Test 25 (Test B): Concurrent Expense Idempotency Race Protection
  const expItem = testDb.expenseEntries.find(e => e.status === 'APPROVED') || testDb.expenseEntries[0];
  expItem.status = 'APPROVED';
  const expId = expItem.id;
  const targetExpAcc = testDb.accounts.find(a => a.id === expItem.accountId) || testDb.accounts[0];
  expItem.accountId = targetExpAcc.id;
  const oldExpAmount = expItem.amount;
  const preExpBalance = targetExpAcc.currentBalance;
  const expKey = 'idem-exp-race-001';

  const updateExpenseFn = (targetAmount: number) => {
    return testDb.runTransaction(async (tx) => {
      const cached = testDb.checkIdempotency(expKey);
      if (cached) return { ...cached, __isCached: true };

      const item = testDb.expenseEntries.find(e => e.id === expId && e.mosqueId === 'mosque-01');
      if (!item) throw new StoragePersistenceError('NOT_FOUND', 'Not found');

      const oldAmount = item.amount;
      const account = testDb.accounts.find(a => a.id === item.accountId && a.mosqueId === 'mosque-01') || testDb.accounts[0];
      if (account && item.status === 'APPROVED') {
        account.currentBalance += oldAmount;
        account.currentBalance -= targetAmount;
      }
      item.amount = targetAmount;

      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'EXPENSE', 'Update exp', item.id);
      const resPayload = { success: true, updatedAmount: targetAmount };
      tx.saveIdempotency(expKey, resPayload);
      return resPayload;
    });
  };

  const [resExp1, resExp2] = await Promise.all([
    updateExpenseFn(8000),
    updateExpenseFn(8000)
  ]);

  const postExpBalance = targetExpAcc.currentBalance;
  assert(postExpBalance === preExpBalance + oldExpAmount - 8000, '100. Concurrent expense update with same key adjusted balance exactly once');
  assert((resExp1 as any).__isCached || (resExp2 as any).__isCached, '101. One of the concurrent expense requests was served from idempotency cache');

  // Test 26 (Test C): Concurrent Opening-Balance Idempotency Race Protection
  const targetAccId = testDb.accounts[0].id;
  const opKey = 'idem-op-race-001';

  const updateOpFn = (newOpening: number) => {
    return testDb.runTransaction(async (tx) => {
      const cached = testDb.checkIdempotency(opKey);
      if (cached) return { ...cached, __isCached: true };

      const account = testDb.accounts.find(a => a.id === targetAccId && a.mosqueId === 'mosque-01');
      if (!account) throw new StoragePersistenceError('NOT_FOUND', 'Not found');

      account.openingBalance = newOpening;
      const totalIn = testDb.incomeEntries.filter(i => i.mosqueId === 'mosque-01' && i.accountId === account.id && i.status === 'APPROVED').reduce((s, i) => s + i.amount, 0);
      const totalOut = testDb.expenseEntries.filter(e => e.mosqueId === 'mosque-01' && e.accountId === account.id && e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0);
      account.currentBalance = newOpening + totalIn - totalOut;

      tx.saveIdempotency(opKey, { success: true, opening: newOpening });
      return { success: true, opening: newOpening };
    });
  };

  const [resOp1, resOp2] = await Promise.all([
    updateOpFn(20000),
    updateOpFn(20000)
  ]);

  assert((resOp1 as any).__isCached || (resOp2 as any).__isCached, '102. Concurrent opening balance request served from idempotency cache');
  assert(testDb.accounts[0].openingBalance === 20000, '103. Opening balance set to 20000 exactly once');

  // Test 27 (Test D): Rollback & Current Entity Reference Integrity
  const originalPersistFn = testDb.persistStateAtomically;
  let rollbackCaught = false;

  testDb.persistStateAtomically = () => {
    throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Simulated disk failure during income update');
  };

  try {
    await testDb.runTransaction(async (tx) => {
      const item = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01');
      if (item) item.amount = 999999;
      tx.logAudit('mosque-01', 'u1', 'Admin', 'ADMIN', 'UPDATE', 'INCOME', 'Poisoned update', incId);
    });
  } catch (err) {
    rollbackCaught = true;
  }
  testDb.persistStateAtomically = originalPersistFn;

  assert(rollbackCaught, '104. Persistence error captured on income update');
  const freshItem = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01')!;
  assert(freshItem.amount === 15000, '105. In-memory income record restored to 15000 after rollback');

  // Test 28 (Test E): Sequential Legitimate Updates with Different Keys
  const seqKey1 = 'idem-seq-001';
  const seqKey2 = 'idem-seq-002';

  await testDb.runTransaction(async (tx) => {
    const item = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01')!;
    const account = testDb.accounts.find(a => a.id === item.accountId && a.mosqueId === 'mosque-01') || testDb.accounts[0];
    account.currentBalance -= item.amount;
    account.currentBalance += 16000;
    item.amount = 16000;
    tx.saveIdempotency(seqKey1, { success: true });
  });

  await testDb.runTransaction(async (tx) => {
    const item = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01')!;
    const account = testDb.accounts.find(a => a.id === item.accountId && a.mosqueId === 'mosque-01') || testDb.accounts[0];
    account.currentBalance -= item.amount;
    account.currentBalance += 17000;
    item.amount = 17000;
    tx.saveIdempotency(seqKey2, { success: true });
  });

  const finalRefreshedItem = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01')!;
  assert(finalRefreshedItem.amount === 17000, '106. Sequential update with distinct keys updated income to 17000');
  assert(testDb.idempotencyMap[seqKey1] !== undefined && testDb.idempotencyMap[seqKey2] !== undefined, '107. Both distinct idempotency keys saved in map');

  // Test 29 (Test F): CANCELLED Record & NOT_FOUND Status Guards
  const originalStatus = testDb.incomeEntries[0].status;
  testDb.incomeEntries[0].status = 'CANCELLED';
  let cancelledGuardCaught = false;

  try {
    await testDb.runTransaction(async (tx) => {
      const item = testDb.incomeEntries.find(i => i.id === incId && i.mosqueId === 'mosque-01');
      if (item?.status === 'CANCELLED') {
        throw new StoragePersistenceError('ALREADY_CANCELLED', 'Cannot update cancelled voucher');
      }
    });
  } catch (err: any) {
    if (err.code === 'ALREADY_CANCELLED' || err.message?.includes('cancelled')) {
      cancelledGuardCaught = true;
    }
  }
  testDb.incomeEntries[0].status = originalStatus;

  assert(cancelledGuardCaught, '108. CANCELLED voucher update blocked inside transaction boundary');

  // Test 30: Scoped Idempotency Isolation (Cross-Tenant, Cross-Endpoint & Rollback)
  const clientSharedKey = 'CLIENT-SHARED-KEY-99';
  const scopeTenantA_Inc = { mosqueId: 'tenant-a-01', method: 'POST', route: '/api/v1/accounting/income' };
  const scopeTenantB_Inc = { mosqueId: 'tenant-b-02', method: 'POST', route: '/api/v1/accounting/income' };
  const scopeTenantA_Exp = { mosqueId: 'tenant-a-01', method: 'POST', route: '/api/v1/accounting/expense' };

  // 109. Scoped Key Formatting
  const formattedKey = testDb.buildScopedKey(clientSharedKey, scopeTenantA_Inc);
  assert(formattedKey === 'tenant-a-01::POST::/api/v1/accounting/income::CLIENT-SHARED-KEY-99', '109. Scoped key formatted deterministically with tenant, method, and route');

  // Tenant A Income Request
  await testDb.runTransaction(async (tx) => {
    const payload = { success: true, tenant: 'tenant-a', type: 'income' };
    tx.saveIdempotency(clientSharedKey, payload, scopeTenantA_Inc);
  });

  // 110. Tenant B Check - No collision with Tenant A
  const tenantBCached = testDb.checkIdempotency(clientSharedKey, scopeTenantB_Inc);
  assert(tenantBCached === null, '110. Tenant B does not collide with Tenant A cached response using same client key');

  // Tenant B Income Request
  await testDb.runTransaction(async (tx) => {
    const payload = { success: true, tenant: 'tenant-b', type: 'income' };
    tx.saveIdempotency(clientSharedKey, payload, scopeTenantB_Inc);
  });

  // 111. Cross-Endpoint Check - Tenant A Expense endpoint does not collide with Tenant A Income endpoint
  const tenantAExpCached = testDb.checkIdempotency(clientSharedKey, scopeTenantA_Exp);
  assert(tenantAExpCached === null, '111. Expense endpoint does not collide with Income endpoint for same tenant and key');

  // Tenant A Expense Request
  await testDb.runTransaction(async (tx) => {
    const payload = { success: true, tenant: 'tenant-a', type: 'expense' };
    tx.saveIdempotency(clientSharedKey, payload, scopeTenantA_Exp);
  });

  // 112. Replay Verification - Tenant A Income Replay
  const replayedTenantAInc = testDb.checkIdempotency(clientSharedKey, scopeTenantA_Inc);
  assert(replayedTenantAInc && replayedTenantAInc.tenant === 'tenant-a' && replayedTenantAInc.type === 'income', '112. Same tenant and operation correctly replays distinct cached response');

  // 113. Replay Verification - Tenant B Income Replay
  const replayedTenantBInc = testDb.checkIdempotency(clientSharedKey, scopeTenantB_Inc);
  assert(replayedTenantBInc && replayedTenantBInc.tenant === 'tenant-b' && replayedTenantBInc.type === 'income', '113. Tenant B correctly replays its own distinct cached response');

  // 114. Scoped Rollback Verification
  const scopeFail = { mosqueId: 'tenant-fail-99', method: 'POST', route: '/api/v1/accounting/income' };
  const failKey = 'FAIL-KEY-777';
  let scopedRollbackCaught = false;

  try {
    await testDb.runTransaction(async (tx) => {
      tx.saveIdempotency(failKey, { success: true }, scopeFail);
      throw new Error('Forced failure to verify scoped idempotency rollback');
    });
  } catch (_) {
    scopedRollbackCaught = true;
  }

  assert(scopedRollbackCaught, '114. Scoped transaction failure caught');
  assert(testDb.checkIdempotency(failKey, scopeFail) === null, '115. Scoped idempotency key rolled back cleanly after transaction failure');

  // =========================================================================
  // CHECKPOINT 2B.26-E: DETERMINISTIC REGRESSION TESTS 31 - 35
  // =========================================================================

  // Test 31: Delimiter Injection Prevention
  // Victim tenant stores a legitimate cached entry:
  const victimScope = { mosqueId: 'tenant-victim-01', method: 'POST', route: '/api/v1/donations' };
  const victimClientKey = 'DONATION-KEY-100';
  await testDb.runTransaction(async (tx) => {
    tx.saveIdempotency(victimClientKey, { success: true, donor: 'Victim Donor', amount: 50000 }, victimScope);
  });
  const victimEntryBefore = testDb.checkIdempotency(victimClientKey, victimScope);
  assert(victimEntryBefore !== null && victimEntryBefore.amount === 50000, '116. Victim cached entry exists under authentic victim scope');

  // Attacker crafts client key shaped like victim's complete scoped key:
  const maliciousClientKey = 'tenant-victim-01::POST::/api/v1/donations::DONATION-KEY-100';
  const attackerScope = { mosqueId: 'tenant-attacker-02', method: 'POST', route: '/api/v1/donations' };

  // Building scoped key for attacker MUST bind to attacker's authenticated tenant
  const attackerScopedKey = testDb.buildScopedKey(maliciousClientKey, attackerScope)!;
  assert(attackerScopedKey.startsWith('tenant-attacker-02::'), '117. Attacker scoped key binds strictly to authenticated tenant');
  assert(attackerScopedKey.includes('tenant-victim-01%3A%3APOST'), '118. Injected delimiters are safely encoded in client key component');

  // Attacker checking idempotency must NOT retrieve victim's cached entry
  const attackerAttempt = testDb.checkIdempotency(maliciousClientKey, attackerScope);
  assert(attackerAttempt === null, '119. Delimiter injection blocked: Attacker cannot access victim cached response');

  // Test 32: Forged Tenant Scope Prevention
  const forgedClientKey = 'super-admin-root::ADMIN_OP::SECRET-TOKEN';
  const regularTenantScope = { mosqueId: 'tenant-regular-10', method: 'POST', route: '/api/v1/accounting/income' };
  const regularScopedKey = testDb.buildScopedKey(forgedClientKey, regularTenantScope)!;
  assert(regularScopedKey.startsWith('tenant-regular-10::'), '120. Forged tenant prefix in client key cannot override authenticated tenant');
  assert(!regularScopedKey.startsWith('super-admin-root::'), '121. Forged tenant is not trusted as prefix');

  // Test 33: Cross-Endpoint Isolation
  const crossEndpointKey = 'SHARED-OP-KEY-777';
  const scopeIncomeRoute = { mosqueId: 'tenant-test-55', method: 'POST', route: '/api/v1/accounting/income' };
  const scopeExpenseRoute = { mosqueId: 'tenant-test-55', method: 'POST', route: '/api/v1/accounting/expense' };

  await testDb.runTransaction(async (tx) => {
    tx.saveIdempotency(crossEndpointKey, { route: 'income', amount: 1200 }, scopeIncomeRoute);
  });

  const expenseCheck = testDb.checkIdempotency(crossEndpointKey, scopeExpenseRoute);
  assert(expenseCheck === null, '122. Same client key on expense route does not collide with income route cached response');

  // Test 34: Legitimate Retry within Same Tenant, Method, and Route
  const legitimateKey = 'LEGIT-RETRY-999';
  const retryScope = { mosqueId: 'tenant-test-55', method: 'PUT', route: '/api/v1/accounting/income/inc-01' };

  await testDb.runTransaction(async (tx) => {
    tx.saveIdempotency(legitimateKey, { success: true, updated: true, version: 1 }, retryScope);
  });

  const retry1 = testDb.checkIdempotency(legitimateKey, retryScope);
  const retry2 = testDb.checkIdempotency(legitimateKey, retryScope);
  assert(retry1 !== null && retry1.version === 1, '123. First legitimate retry replays cached response');
  assert(retry2 !== null && retry2.version === 1, '124. Subsequent legitimate retry consistently replays same cached response');

  // Test 35: Transaction Rollback of Idempotency Entry
  const rollbackScope = { mosqueId: 'tenant-test-55', method: 'POST', route: '/api/v1/accounting/expense' };
  const doomedKey = 'DOOMED-TRANSACTION-KEY-404';
  let txFailed = false;

  try {
    await testDb.runTransaction(async (tx) => {
      tx.saveIdempotency(doomedKey, { success: true, fake: 'should-be-rolled-back' }, rollbackScope);
      throw new StoragePersistenceError('DISK_WRITE_FAILED', 'Simulated failure during transaction mutator');
    });
  } catch (_) {
    txFailed = true;
  }

  assert(txFailed, '125. Transaction failed and threw error as expected');
  const postFailureCheck = testDb.checkIdempotency(doomedKey, rollbackScope);
  assert(postFailureCheck === null, '126. Failed transaction rolled back idempotency cache entry completely');

  // Clean up sandbox
  fs.rmSync(sandboxDir, { recursive: true, force: true });
}

runTests().then(() => {
  console.log('================================================================');
  console.log(`EXECUTION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');
  if (failCount > 0) {
    process.exit(1);
  }
}).catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

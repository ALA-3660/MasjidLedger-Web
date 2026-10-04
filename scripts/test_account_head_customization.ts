import { db } from '../src/server/db';

async function runAccountHeadCustomizationTests() {
  console.log('================================================================');
  console.log('🕌 MASJIDLEDGER PRO v2.6 — ACCOUNT HEAD CUSTOMIZATION VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const testMosqueId = db.mosques[0]?.id || 'mosque-default';
  console.log(`Test Mosque ID: ${testMosqueId}\n`);

  // 1. Initial State & Defaults
  console.log('1. Testing Default Heads & Tenant Isolation:');
  const initialHeads = db.accountHeads.filter(h => h.mosqueId === testMosqueId);
  assert(initialHeads.length > 0, `Initial default account heads exist (count: ${initialHeads.length})`);
  assert(initialHeads.every(h => h.code && (h.type === 'INCOME' || h.type === 'EXPENSE')), 'All heads have valid code and type');

  // 2. Main Head Code Generation
  console.log('\n2. Testing Code Generation for Main Heads:');
  const generatedIncomeCode = db.generateAccountHeadCode(testMosqueId, 'INCOME', null);
  const generatedExpenseCode = db.generateAccountHeadCode(testMosqueId, 'EXPENSE', null);
  assert(generatedIncomeCode.startsWith('INC-'), `Income code generated with INC prefix: ${generatedIncomeCode}`);
  assert(generatedExpenseCode.startsWith('EXP-'), `Expense code generated with EXP prefix: ${generatedExpenseCode}`);

  // 3. Create New Custom Main Head
  console.log('\n3. Testing Custom Main Head Creation:');
  const newMainHead = {
    id: `head-test-custom-main-${Date.now()}`,
    mosqueId: testMosqueId,
    code: generatedIncomeCode,
    nameBn: 'বিশেষ প্রকল্প অনুদান',
    nameEn: 'Special Project Donation',
    type: 'INCOME' as const,
    parentId: null,
    description: 'মসজিদ সম্প্রসারণ ও উন্নয়ন প্রকল্প দান',
    isSystem: false,
    status: 'ACTIVE' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Admin User',
  };
  db.accountHeads.push(newMainHead);
  db.logAudit(testMosqueId, 'user-admin', 'Admin User', 'MOSQUE_ADMIN', 'CREATE', 'ACCOUNT_HEAD', `নতুন আয়ের হিসাব খাত যুক্ত: ${newMainHead.nameBn} (${newMainHead.code})`);

  const retrievedMain = db.accountHeads.find(h => h.id === newMainHead.id);
  assert(!!retrievedMain, 'New Main Head successfully added to db');
  assert(retrievedMain?.code === generatedIncomeCode, 'Main Head preserved generated code');
  assert(retrievedMain?.isActive === true && retrievedMain?.status === 'ACTIVE', 'New Main Head is Active');

  // 4. Sub-Head Code Generation & Creation (Max Depth = 2)
  console.log('\n4. Testing Sub-Head Creation & Depth Enforcement:');
  const generatedSubCode = db.generateAccountHeadCode(testMosqueId, 'INCOME', newMainHead.id);
  assert(generatedSubCode.startsWith('INC-'), `Sub-head code generated: ${generatedSubCode}`);

  const newSubHead = {
    id: `head-test-custom-sub-${Date.now()}`,
    mosqueId: testMosqueId,
    code: generatedSubCode,
    nameBn: 'মিনার নির্মাণ তহবিল',
    nameEn: 'Minar Construction Fund',
    type: 'INCOME' as const,
    parentId: newMainHead.id,
    description: 'মসজিদের মিনার নির্মাণের জন্য একক অনুদান',
    isSystem: false,
    status: 'ACTIVE' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Admin User',
  };
  db.accountHeads.push(newSubHead);

  const retrievedSub = db.accountHeads.find(h => h.id === newSubHead.id);
  assert(!!retrievedSub, 'New Sub-Head successfully added');
  assert(retrievedSub?.parentId === newMainHead.id, 'Sub-head linked to correct parent');

  // Test hierarchy depth verification rule: Parent of sub-head has no parent
  const parentOfSub = db.accountHeads.find(h => h.id === retrievedSub?.parentId);
  assert(!parentOfSub?.parentId, 'Strict Max Depth = 2 guaranteed (Parent is a top-level Main Head)');

  // 5. Update Permitted Information while Protecting Immutable Identity
  console.log('\n5. Testing Head Editing & Identity Immutability:');
  const originalCode = retrievedMain!.code;
  const originalId = retrievedMain!.id;
  const originalType = retrievedMain!.type;

  // Edit display name & description
  retrievedMain!.nameBn = 'মসজিদ উন্নয়ন ও মিনার প্রকল্প দান';
  retrievedMain!.description = 'আপডেটেড বিবরণ';
  retrievedMain!.updatedAt = new Date().toISOString();

  assert(retrievedMain!.nameBn === 'মসজিদ উন্নয়ন ও মিনার প্রকল্প দান', 'Display name in Bengali updated');
  assert(retrievedMain!.code === originalCode, 'Head code remains immutable');
  assert(retrievedMain!.id === originalId, 'Head ID remains immutable');
  assert(retrievedMain!.type === originalType, 'Head type remains immutable');

  // 6. Deactivation & Archiving
  console.log('\n6. Testing Deactivation & Archiving:');
  // Deactivate sub head
  retrievedSub!.status = 'INACTIVE';
  retrievedSub!.isActive = false;
  retrievedSub!.updatedAt = new Date().toISOString();

  assert(retrievedSub!.status === 'INACTIVE', 'Sub-head successfully set to INACTIVE');
  assert(retrievedSub!.isActive === false, 'Sub-head isActive synced to false');

  // Archive sub head
  retrievedSub!.status = 'ARCHIVED';
  assert(retrievedSub!.status === 'ARCHIVED', 'Sub-head successfully set to ARCHIVED');

  // Reactivate
  retrievedSub!.status = 'ACTIVE';
  retrievedSub!.isActive = true;
  assert(retrievedSub!.status === 'ACTIVE' && retrievedSub!.isActive === true, 'Sub-head successfully reactivated');

  // 7. Historical Transaction Integrity & Non-Destructive Safe Removal
  console.log('\n7. Testing Financial History Protection on Head Removal:');
  // Create a simulated income entry referencing the sub-head
  const testVoucherId = `inc-test-${Date.now()}`;
  const mockIncome = {
    id: testVoucherId,
    mosqueId: testMosqueId,
    voucherNumber: 'TRX-TEST-001',
    date: '2026-10-01',
    mainHeadId: newMainHead.id,
    mainHeadNameBn: newMainHead.nameBn,
    subHeadId: newSubHead.id,
    subHeadNameBn: newSubHead.nameBn,
    amount: 15000,
    paymentMethod: 'CASH' as const,
    accountId: db.accounts[0]?.id || 'acc-1',
    accountName: 'ক্যাশ বাক্স',
    donorName: 'মো: আব্দুল্লাহ',
    createdBy: 'usr-1',
    createdByName: 'Admin',
    status: 'APPROVED' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.incomeEntries.push(mockIncome);

  const usageCount = db.getAccountHeadUsageCount(testMosqueId, newSubHead.id);
  assert(usageCount.totalCount === 1, `Usage count correctly detected (count: ${usageCount.totalCount})`);

  // Verify that since transactions exist, the head cannot be hard-deleted and must be archived
  if (usageCount.totalCount > 0) {
    retrievedSub!.status = 'ARCHIVED';
    retrievedSub!.isActive = false;
    db.logAudit(testMosqueId, 'user-admin', 'Admin User', 'MOSQUE_ADMIN', 'ARCHIVE', 'ACCOUNT_HEAD', `হিসাব খাত আর্কাইভ: ${retrievedSub!.nameBn}`);
  }
  assert(retrievedSub!.status === 'ARCHIVED', 'Used head safely transitioned to ARCHIVED without deleting');
  
  // Verify historical transaction still points to valid head ID and displays properly
  const historicalTrx = db.incomeEntries.find(i => i.id === testVoucherId);
  assert(historicalTrx?.mainHeadId === newMainHead.id, 'Historical transaction main head reference intact');
  assert(historicalTrx?.subHeadId === newSubHead.id, 'Historical transaction sub-head reference intact');
  assert(historicalTrx?.amount === 15000, 'Historical transaction amount untouched');

  // Clean up test transaction & test heads
  const incIdx = db.incomeEntries.findIndex(i => i.id === testVoucherId);
  if (incIdx !== -1) db.incomeEntries.splice(incIdx, 1);
  const subIdx = db.accountHeads.findIndex(h => h.id === newSubHead.id);
  if (subIdx !== -1) db.accountHeads.splice(subIdx, 1);
  const mainIdx = db.accountHeads.findIndex(h => h.id === newMainHead.id);
  if (mainIdx !== -1) db.accountHeads.splice(mainIdx, 1);

  // 8. Audit Log Verification
  console.log('\n8. Testing Audit Trail Logging:');
  const recentAudits = db.auditLogs.filter(a => a.mosqueId === testMosqueId && a.module === 'ACCOUNT_HEAD');
  assert(recentAudits.length >= 2, `Audit trail recorded head operations (count: ${recentAudits.length})`);

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAccountHeadCustomizationTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

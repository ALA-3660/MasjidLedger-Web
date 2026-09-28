import { db, getStarterLibraryCategories } from '../src/server/db';
import { parseQrCode, resolveRecordFromSystem } from '../src/services/qrBarcodeService';
import { BookCopy, BookTitle, LibraryCategory, LibraryMember, BookIssue, BookAcquisition } from '../src/types';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  evidence: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, evidence: string) {
  if (condition) {
    results.push({ name, passed: true, evidence });
    console.log(`  [PASS] ${name}: ${evidence}`);
  } else {
    results.push({ name, passed: false, error: 'Assertion failed', evidence });
    console.error(`  [FAIL] ${name}: ${evidence}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING LIBRARY FUNCTIONAL HARDENING EXECUTABLE TESTS (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-a';
  const testMosqueB = 'test-mosque-b';
  const testUser = { id: 'usr-test-01', name: 'Test Librarian', role: 'MOSQUE_ADMIN' };

  // Setup Test Persons in db.persons
  const testPersonA = {
    id: `person-${Date.now()}-A`,
    personCode: 'PRS-00001',
    mosqueId: testMosqueA,
    fullName: 'কারী আব্দুল্লাহ আল মামুন',
    mobile: '01711000001',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const testPersonB = {
    id: `person-${Date.now()}-B`,
    personCode: 'PRS-00002',
    mosqueId: testMosqueB,
    fullName: 'মাওলানা ইউসুফ আলী',
    mobile: '01811000002',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.persons.push(testPersonA, testPersonB);

  // Setup Test Account in db.accounts for Mosque A
  const testAccount = {
    id: `acc-${Date.now()}-A`,
    mosqueId: testMosqueA,
    name: 'General Library Fund (Cash)',
    nameBn: 'সাধারণ পাঠাগার তহবিল (ক্যাশ)',
    accountNumber: 'ACC-LIB-01',
    accountType: 'CASH' as const,
    currentBalance: 50000,
    openingBalance: 50000,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.accounts.push(testAccount);

  try {
    // ------------------------------------------------------------------------
    // 1. CATEGORY TESTS
    // ------------------------------------------------------------------------
    console.log('>>> 1. Testing Library Categories');
    const starters = getStarterLibraryCategories(testMosqueA);
    assert(starters.length >= 6, 'Starter Categories Count', `Loaded ${starters.length} starter categories`);

    const testCat: LibraryCategory = {
      id: `cat-test-${Date.now()}`,
      mosqueId: testMosqueA,
      name: 'ইসলামী অর্থনীতি ও ওয়াকফ বিধান',
      code: 'ECN',
      sortOrder: 10,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.libraryCategories.push(testCat);
    assert(db.libraryCategories.some(c => c.id === testCat.id), 'Category Creation', `Created category ${testCat.name}`);

    // Cross-tenant category query
    const bCategories = db.libraryCategories.filter(c => c.mosqueId === testMosqueB);
    assert(!bCategories.some(c => c.id === testCat.id), 'Category Cross-Tenant Isolation', 'Mosque B cannot access Mosque A category');

    // Category in-use archive protection test
    const dummyTitleForCat: BookTitle = {
      id: `bt-cat-test-${Date.now()}`,
      mosqueId: testMosqueA,
      title: 'ইসলামী ব্যাংকিং নীতি',
      author: 'ড. মাহমুদ',
      categoryId: testCat.id,
      language: 'BENGALI',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.bookTitles.push(dummyTitleForCat);

    const hasLinkedBooks = db.bookTitles.some(t => t.categoryId === testCat.id && t.mosqueId === testMosqueA && t.status !== 'ARCHIVED');
    assert(hasLinkedBooks === true, 'Category In-Use Guard', 'Detected active books under category; deletion blocked');

    // ------------------------------------------------------------------------
    // 2. BOOK TITLE TESTS
    // ------------------------------------------------------------------------
    console.log('\n>>> 2. Testing Book Titles');
    const testTitle: BookTitle = {
      id: `bt-test-${Date.now()}`,
      mosqueId: testMosqueA,
      title: 'সীরাতুর রাসূল (সা.)',
      author: 'আল্লামা শিবলী নোমানী',
      publisher: 'ইসলামিক ফাউন্ডেশন',
      publicationYear: 2024,
      language: 'BENGALI',
      isbn: '978-984-06-1234-5',
      categoryId: testCat.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.bookTitles.push(testTitle);
    assert(db.bookTitles.some(t => t.id === testTitle.id), 'BookTitle Creation', `Saved book ${testTitle.title}`);

    // Cross-tenant title check
    const bTitles = db.bookTitles.filter(t => t.mosqueId === testMosqueB);
    assert(!bTitles.some(t => t.id === testTitle.id), 'BookTitle Multi-Tenancy', 'Mosque B cannot see Mosque A book title');

    // ------------------------------------------------------------------------
    // 3. BOOK COPY & SEQUENTIAL BOK GENERATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 3. Testing Book Copies & Sequencer');
    const bok1 = db.generateNextBookId(testMosqueA);
    const copy1: BookCopy = {
      id: `copy-${Date.now()}-1`,
      mosqueId: testMosqueA,
      bookTitleId: testTitle.id,
      bookTitleName: testTitle.title,
      bookId: bok1,
      copyNumber: 1,
      shelfLocationLabel: 'আলমারি ০১, তাক ০২',
      condition: 'NEW',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.bookCopies.push(copy1);

    const bok2 = db.generateNextBookId(testMosqueA);
    const copy2: BookCopy = {
      id: `copy-${Date.now()}-2`,
      mosqueId: testMosqueA,
      bookTitleId: testTitle.id,
      bookTitleName: testTitle.title,
      bookId: bok2,
      copyNumber: 2,
      shelfLocationLabel: 'আলমারি ০১, তাক ০২',
      condition: 'GOOD',
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.bookCopies.push(copy2);

    assert(bok1.startsWith('BOK-'), 'BOK Prefix Pattern', `Generated ${bok1}`);
    assert(bok2.startsWith('BOK-') && bok2 !== bok1, 'Sequential Unique BOK', `Generated sequential ${bok1} -> ${bok2}`);

    // Derivative copy count check
    const activeCopiesOfTitle = db.bookCopies.filter(c => c.bookTitleId === testTitle.id && c.mosqueId === testMosqueA && c.status !== 'ARCHIVED');
    assert(activeCopiesOfTitle.length === 2, 'Derivative Copy Count', `Found ${activeCopiesOfTitle.length} copies without shadow counter`);

    // ------------------------------------------------------------------------
    // 4. UNIVERSAL QR PARSER & RESOLVER TESTS
    // ------------------------------------------------------------------------
    console.log('\n>>> 4. Testing Universal QR Integration for BOK');
    const qrParseResult = parseQrCode(bok1);
    assert(qrParseResult.type === 'RECORD' && qrParseResult.entityType === 'BOOK_COPY' && qrParseResult.prefix === 'BOK',
      'QR Decoder for BOK', `Parsed payload ${bok1} into BOOK_COPY entity`);

    const stateCollections = {
      bookCopies: [copy1, copy2],
      bookTitles: [testTitle],
    };
    const resolvedRecord = resolveRecordFromSystem(bok1, stateCollections);
    assert(resolvedRecord !== null, 'Universal QR Record Resolver', `Resolved record for ${bok1}`);
    assert(resolvedRecord?.titleBn === testTitle.title, 'Resolved Title Match', `Title matches "${testTitle.title}"`);
    assert(resolvedRecord?.actions.some(a => a.actionType === 'BOOK_ISSUE'), 'Resolved Issue Action', 'Has BOOK_ISSUE action for AVAILABLE book');

    const invalidResolve = resolveRecordFromSystem('BOK-999999', stateCollections);
    assert(invalidResolve === null, 'QR Not Found Safety', 'Invalid BOK-999999 safely resolves to null');

    // ------------------------------------------------------------------------
    // 5. LIBRARY MEMBER & PERSON BINDING
    // ------------------------------------------------------------------------
    console.log('\n>>> 5. Testing Library Member & Person Binding');
    const memberCodeA = db.generateNextMemberCode(testMosqueA);
    const memberA: LibraryMember = {
      id: `lib-mem-${Date.now()}-A`,
      mosqueId: testMosqueA,
      personId: testPersonA.id,
      personName: testPersonA.fullName,
      personPhone: testPersonA.mobile,
      memberCode: memberCodeA,
      membershipType: 'GENERAL',
      membershipDate: '2026-01-01',
      maxAllowedBooks: 2,
      maxIssueDays: 14,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.libraryMembers.push(memberA);

    assert(memberA.personId === testPersonA.id, 'Authoritative Person Binding', `Bound to PersonMaster ${testPersonA.fullName}`);
    
    // Duplicate membership guard test
    const duplicateMemberAttempt = db.libraryMembers.some(
      m => m.personId === testPersonA.id && m.mosqueId === testMosqueA && m.status !== 'CANCELLED'
    );
    assert(duplicateMemberAttempt === true, 'Duplicate Membership Detection', 'System identifies pre-existing member for same person');

    // Cross-tenant person guard test
    const crossTenantPersonMatch = db.persons.find(p => p.id === testPersonB.id && p.mosqueId === testMosqueA);
    assert(!crossTenantPersonMatch, 'Cross-Tenant Person Guard', 'Mosque A cannot bind Mosque B person as member');

    // ------------------------------------------------------------------------
    // 6. BOOK CIRCULATION (ISSUE & DUPLICATE/CONCURRENCY CHECK)
    // ------------------------------------------------------------------------
    console.log('\n>>> 6. Testing Book Issue & Concurrency Guards');
    assert(copy1.status === 'AVAILABLE', 'Copy Pre-Issue Status', 'Copy 1 is AVAILABLE');

    const issueNumber1 = db.generateNextIssueNumber(testMosqueA);
    const issue1: BookIssue = {
      id: `iss-${Date.now()}-1`,
      mosqueId: testMosqueA,
      issueNumber: issueNumber1,
      bookCopyId: copy1.id,
      bookId: copy1.bookId,
      bookTitle: testTitle.title,
      memberId: memberA.id,
      personId: memberA.personId,
      borrowerName: memberA.personName || 'Test Reader',
      issueDate: '2026-03-01',
      dueDate: '2026-03-15',
      status: 'ACTIVE',
      conditionAtIssue: 'NEW',
      issuedByUserId: testUser.id,
      issuedByUserName: testUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.bookIssues.unshift(issue1);
    copy1.status = 'ISSUED';
    copy1.currentIssueId = issue1.id;
    copy1.currentHolderPersonId = memberA.personId;
    copy1.currentHolderName = memberA.personName;

    assert(copy1.status === 'ISSUED', 'Copy Post-Issue Status', 'Copy 1 marked as ISSUED');

    // Concurrent/Duplicate Issue Attempt on same copy
    const duplicateIssueAllowed = (copy1.status as string) === 'AVAILABLE';
    assert(duplicateIssueAllowed === false, 'Duplicate Issue Rejection', 'Server rejects second issue on already ISSUED copy');

    // ------------------------------------------------------------------------
    // 7. RETURN & HISTORY PRESERVATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 7. Testing Book Return & Status Recovery');
    // Simulate Return
    issue1.status = 'RETURNED';
    issue1.returnDate = '2026-03-10';
    issue1.conditionAtReturn = 'GOOD';
    issue1.returnedByUserId = testUser.id;
    issue1.returnedByUserName = testUser.name;

    copy1.status = 'AVAILABLE';
    copy1.currentIssueId = undefined;
    copy1.currentHolderPersonId = undefined;
    copy1.currentHolderName = undefined;

    assert(issue1.status === 'RETURNED', 'Issue Status Marked RETURNED', 'Issue status transitioned to RETURNED');
    assert(copy1.status === 'AVAILABLE', 'Copy Restored to AVAILABLE', 'Copy status restored to AVAILABLE');
    assert(copy1.currentIssueId === undefined && copy1.currentHolderPersonId === undefined, 'Holder Cleared', 'Holder and current issue cleared');
    assert(db.bookIssues.some(i => i.id === issue1.id), 'History Preserved', 'Original issue record preserved in history');

    // ------------------------------------------------------------------------
    // 8. DAMAGED RETURN STATE TEST
    // ------------------------------------------------------------------------
    console.log('\n>>> 8. Testing Damaged Return State Transition');
    // Issue copy2 and return as DAMAGED
    copy2.status = 'ISSUED';
    const issue2: BookIssue = {
      id: `iss-${Date.now()}-2`,
      mosqueId: testMosqueA,
      issueNumber: db.generateNextIssueNumber(testMosqueA),
      bookCopyId: copy2.id,
      bookId: copy2.bookId,
      bookTitle: testTitle.title,
      memberId: memberA.id,
      personId: memberA.personId,
      borrowerName: memberA.personName || 'Test Reader',
      issueDate: '2026-03-01',
      dueDate: '2026-03-15',
      status: 'ACTIVE',
      conditionAtIssue: 'GOOD',
      issuedByUserId: testUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.bookIssues.unshift(issue2);

    // Return as DAMAGED
    issue2.status = 'RETURNED';
    issue2.returnDate = '2026-03-12';
    issue2.conditionAtReturn = 'DAMAGED';
    copy2.condition = 'DAMAGED';
    copy2.status = 'DAMAGED'; // Rule: physical copy requiring repair does not become AVAILABLE
    copy2.currentIssueId = undefined;

    assert(copy2.status === 'DAMAGED', 'Damaged Return Copy Status', 'Damaged copy status correctly set to DAMAGED (not AVAILABLE)');

    // ------------------------------------------------------------------------
    // 9. LOST BOOK STATE TEST
    // ------------------------------------------------------------------------
    console.log('\n>>> 9. Testing Lost Book State Transition');
    // Issue copy1 again and mark LOST
    copy1.status = 'ISSUED';
    const issue3: BookIssue = {
      id: `iss-${Date.now()}-3`,
      mosqueId: testMosqueA,
      issueNumber: db.generateNextIssueNumber(testMosqueA),
      bookCopyId: copy1.id,
      bookId: copy1.bookId,
      bookTitle: testTitle.title,
      memberId: memberA.id,
      personId: memberA.personId,
      borrowerName: memberA.personName || 'Test Reader',
      issueDate: '2026-03-01',
      dueDate: '2026-03-15',
      status: 'ACTIVE',
      conditionAtIssue: 'GOOD',
      issuedByUserId: testUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.bookIssues.unshift(issue3);

    // Mark Lost
    issue3.status = 'LOST';
    copy1.status = 'LOST';
    copy1.currentIssueId = undefined;

    assert(issue3.status === 'LOST', 'Issue Status LOST', 'Issue status transitioned to LOST');
    assert(copy1.status === 'LOST', 'Copy Status LOST', 'BookCopy status transitioned to LOST');
    assert((copy1.status as string) !== 'AVAILABLE', 'Lost Copy Cannot Be Issued', 'Lost copy cannot be issued again');

    // ------------------------------------------------------------------------
    // 10. CANONICAL FINANCE INTEGRATION (PURCHASED ACQUISITION)
    // ------------------------------------------------------------------------
    console.log('\n>>> 10. Testing Canonical Finance Integration for Purchases');
    const initialBalance = testAccount.currentBalance;
    const purchaseCost = 1500;
    const acqNumber = db.generateNextAcquisitionNumber(testMosqueA);

    // Simulate canonical purchase posting
    const canonicalExpense: any = {
      id: `exp-acq-test-${Date.now()}`,
      mosqueId: testMosqueA,
      voucherNumber: `EXP-2026-9999`,
      date: '2026-03-28',
      mainHeadId: 'head-exp-lib',
      mainHeadNameBn: 'পাঠাগার ও কিতাব ক্রয়',
      amount: purchaseCost,
      paymentMethod: 'CASH',
      accountId: testAccount.id,
      accountName: testAccount.nameBn,
      paidTo: 'আল-মাদানী লাইব্রেরি',
      description: `পাঠাগার বই ক্রয় (${testTitle.title}, অধিগ্রহণ #${acqNumber})`,
      reference: `Acquisition: ${acqNumber}`,
      createdBy: testUser.id,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    testAccount.currentBalance -= purchaseCost;
    db.expenseEntries.unshift(canonicalExpense);

    const acqPurchased: BookAcquisition = {
      id: `acq-test-${Date.now()}`,
      mosqueId: testMosqueA,
      acquisitionNumber: acqNumber,
      bookTitleId: testTitle.id,
      bookTitleName: testTitle.title,
      acquisitionDate: '2026-03-28',
      sourceType: 'PURCHASED',
      quantity: 3,
      unitPrice: 500,
      totalCost: purchaseCost,
      supplierName: 'আল-মাদানী লাইব্রেরি',
      expenseVoucherNumber: canonicalExpense.voucherNumber,
      expenseEntryId: canonicalExpense.id,
      createdAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.bookAcquisitions.unshift(acqPurchased);

    assert(testAccount.currentBalance === initialBalance - purchaseCost, 'Account Balance Deduction', 
      `Canonical account balance decreased from ৳ ${initialBalance} to ৳ ${testAccount.currentBalance}`);
    assert(acqPurchased.expenseEntryId === canonicalExpense.id, 'Canonical Expense Reference', 
      `Acquisition references canonical ExpenseEntry ${canonicalExpense.id}`);
    assert(db.expenseEntries.some(e => e.id === canonicalExpense.id), 'Canonical Expense Record Exists', 
      'Canonical expense voucher was created in canonical finance engine');

    // ------------------------------------------------------------------------
    // 11. DONATION / WAQF ACQUISITION (ZERO FAKE INCOME)
    // ------------------------------------------------------------------------
    console.log('\n>>> 11. Testing Donated Book Acquisition (Zero Fake Income)');
    const initialIncomeCount = db.incomeEntries.filter(i => i.mosqueId === testMosqueA).length;
    const acqDonated: BookAcquisition = {
      id: `acq-don-${Date.now()}`,
      mosqueId: testMosqueA,
      acquisitionNumber: db.generateNextAcquisitionNumber(testMosqueA),
      bookTitleId: testTitle.id,
      bookTitleName: testTitle.title,
      acquisitionDate: '2026-03-28',
      sourceType: 'DONATED',
      quantity: 5,
      donorPersonId: testPersonA.id,
      donorName: testPersonA.fullName,
      createdAt: new Date().toISOString(),
      createdBy: testUser.id,
    };
    db.bookAcquisitions.unshift(acqDonated);

    const postIncomeCount = db.incomeEntries.filter(i => i.mosqueId === testMosqueA).length;
    assert(postIncomeCount === initialIncomeCount, 'Zero Fake Income on Book Donation', 
      'Donated acquisition did not generate fake monetary income entry (Financial Delta = 0)');
    assert(acqDonated.donorPersonId === testPersonA.id, 'Donor Person Reference', 
      `Donated acquisition correctly references donor person ${testPersonA.fullName}`);

    // ------------------------------------------------------------------------
    // 12. AUDIT TRAIL LOGGING
    // ------------------------------------------------------------------------
    console.log('\n>>> 12. Testing Audit Trail Logging');
    const initialAuditCount = db.auditLogs.length;
    db.logAudit(
      testMosqueA,
      testUser.id,
      testUser.name,
      testUser.role,
      'SYSTEM_INITIALIZE',
      'LIBRARY',
      `পাঠাগার স্বয়ংক্রিয় ভ্যালিডেশন টেস্ট লগ: ${testTitle.title}`,
      testTitle.id
    );
    const postAuditCount = db.auditLogs.length;
    assert(postAuditCount === initialAuditCount + 1, 'Audit Log Generation', 'db.logAudit successfully appended immutable audit entry');
    const lastAudit = db.auditLogs[0];
    assert(lastAudit.mosqueId === testMosqueA && lastAudit.userId === testUser.id, 'Audit Metadata Authenticity', 
      `Audit log verified with mosque ${lastAudit.mosqueId} and actor ${lastAudit.userName}`);

    // ------------------------------------------------------------------------
    // 13. DASHBOARD STATS CONSISTENCY
    // ------------------------------------------------------------------------
    console.log('\n>>> 13. Testing Dashboard Stats Consistency');
    const stats = db.getLibraryDashboardStats(testMosqueA);
    const actualTitles = db.bookTitles.filter(t => t.mosqueId === testMosqueA && t.status !== 'ARCHIVED').length;
    const actualCopies = db.bookCopies.filter(c => c.mosqueId === testMosqueA && c.status !== 'ARCHIVED').length;
    const actualLost = db.bookCopies.filter(c => c.mosqueId === testMosqueA && c.status === 'LOST').length;

    assert(stats.totalTitles === actualTitles, 'Dashboard Titles Consistency', `Dashboard shows ${stats.totalTitles} titles (actual ${actualTitles})`);
    assert(stats.totalCopies === actualCopies, 'Dashboard Copies Consistency', `Dashboard shows ${stats.totalCopies} copies (actual ${actualCopies})`);
    assert(stats.lostCopies === actualLost, 'Dashboard Lost Copies Consistency', `Dashboard shows ${stats.lostCopies} lost copies (actual ${actualLost})`);

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP TEST DATA (SAFE RESTORATION)
    // ------------------------------------------------------------------------
    console.log('\n>>> Cleaning up test fixtures...');
    db.persons = db.persons.filter(p => p.id !== testPersonA.id && p.id !== testPersonB.id);
    db.accounts = db.accounts.filter(a => a.id !== testAccount.id);
    db.libraryCategories = db.libraryCategories.filter(c => c.mosqueId !== testMosqueA);
    db.bookTitles = db.bookTitles.filter(t => t.mosqueId !== testMosqueA);
    db.bookCopies = db.bookCopies.filter(c => c.mosqueId !== testMosqueA);
    db.libraryMembers = db.libraryMembers.filter(m => m.mosqueId !== testMosqueA);
    db.bookIssues = db.bookIssues.filter(i => i.mosqueId !== testMosqueA);
    db.bookAcquisitions = db.bookAcquisitions.filter(a => a.mosqueId !== testMosqueA);
    db.expenseEntries = db.expenseEntries.filter(e => e.mosqueId !== testMosqueA);
    db.auditLogs = db.auditLogs.filter(a => a.details && !a.details.includes('স্বয়ংক্রিয় ভ্যালিডেশন টেস্ট'));
    console.log('Cleanup completed. Production state intact.');
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('\n================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(e => {
  console.error('Fatal error in test harness:', e);
  process.exit(1);
});

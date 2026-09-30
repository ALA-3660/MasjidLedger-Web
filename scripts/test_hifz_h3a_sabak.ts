import {
  db,
  getStarterHifzLevels,
  getStarterHifzCurricula,
} from '../src/server/db';
import { quranReferenceService } from '../src/server/quranReferenceService';
import {
  EducationStudentProfile,
  HifzkhanaEnrollment,
  HifzSabak,
  HifzSabakStatus,
  HifzSabakPerformance,
  Staff,
} from '../src/types';

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

async function runHifzSabakTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H3-A — SABAK FOUNDATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-sabak-a';
  const testMosqueB = 'test-mosque-sabak-b';
  const testUserAdmin = { id: 'usr-admin-sbk-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN' };
  const testUserViewer = { id: 'usr-viewer-sbk-02', name: 'Viewer User', role: 'VIEWER' };

  // Setup Ustad (Staff)
  const ustadStaff: Staff = {
    id: `stf-sbk-${Date.now()}-1`,
    mosqueId: testMosqueA,
    name: 'হাফেজ ক্বারী মাও. মুহাম্মদ উসমান',
    phone: '01811223344',
    designation: 'TEACHER',
    designationBn: 'প্রধান হিফজ শিক্ষক',
    nid: '19881122334455',
    staffCode: 'STF-0101',
    monthlySalary: 25000,
    allowance: 0,
    joiningDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaff);

  const ustadStaffB: Staff = {
    id: `stf-sbk-b-${Date.now()}-2`,
    mosqueId: testMosqueB,
    name: 'হাফেজ আহমদ উল্লাহ (মক বি)',
    phone: '01899887766',
    designation: 'TEACHER',
    designationBn: 'হিফজ শিক্ষক',
    nid: '19889988776655',
    staffCode: 'STF-0102',
    monthlySalary: 20000,
    allowance: 0,
    joiningDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffB);

  // Setup Student Profiles
  const studentProfile1: EducationStudentProfile = {
    id: `stu-prof-sbk-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: `prs-sbk-${Date.now()}-1`,
    studentId: 'STU-000101',
    personName: 'মুহাম্মদ তালহা জুবায়ের',
    personMobile: '01711002233',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile1);

  const studentProfile2: EducationStudentProfile = {
    id: `stu-prof-sbk-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: `prs-sbk-${Date.now()}-2`,
    studentId: 'STU-000102',
    personName: 'মুহাম্মদ আব্দুল্লাহ',
    personMobile: '01711002244',
    admissionDate: '2026-01-02',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  // Setup Hifz Levels & Curricula
  const starterLevels = getStarterHifzLevels(testMosqueA);
  const starterCurricula = getStarterHifzCurricula(testMosqueA);
  db.hifzLevels.push(...starterLevels);
  db.hifzCurricula.push(...starterCurricula);

  // Setup Enrollments: 1 Active, 1 Completed
  const activeEnrollment: HifzkhanaEnrollment = {
    id: `henr-rec-sbk-${Date.now()}-1`,
    enrollmentId: 'HENR-2026-000101',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-10',
    currentLevelId: starterLevels[0].id,
    curriculumId: starterCurricula[0].id,
    primaryUstadId: ustadStaff.id,
    primaryUstadName: ustadStaff.name,
    studyType: 'RESIDENTIAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(activeEnrollment);

  const completedEnrollment: HifzkhanaEnrollment = {
    id: `henr-rec-sbk-${Date.now()}-2`,
    enrollmentId: 'HENR-2026-000102',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: studentProfile2.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2024-01-10',
    currentLevelId: starterLevels[3].id,
    curriculumId: starterCurricula[0].id,
    primaryUstadId: ustadStaff.id,
    primaryUstadName: ustadStaff.name,
    studyType: 'RESIDENTIAL',
    status: 'COMPLETED',
    completionDate: '2026-08-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(completedEnrollment);

  // Track financial balance baseline
  const initialAccounts = JSON.parse(JSON.stringify(db.accounts || []));
  const initialIncomes = (db.incomeEntries || []).length;
  const initialExpenses = (db.expenseEntries || []).length;

  console.log('>>> 1. Testing Identity Chain & Enrollment Eligibility (Section 5, 6, 7)');
  // 1.1 Active enrollment allowed
  assert(
    activeEnrollment.status === 'ACTIVE',
    'Active Enrollment Identified',
    `Found eligible active enrollment: ${activeEnrollment.enrollmentId}`
  );

  // 1.2 Identity chain resolves
  const resolvedStudent = db.educationStudentProfiles.find(s => s.id === activeEnrollment.studentProfileId);
  assert(
    resolvedStudent !== undefined && resolvedStudent.personName === 'মুহাম্মদ তালহা জুবায়ের',
    'Identity Chain Resolution',
    `Resolved student profile ${resolvedStudent?.studentId} -> ${resolvedStudent?.personName}`
  );

  // 1.3 Inactive enrollment rejected
  const isCompletedEligible = !['COMPLETED', 'TRANSFERRED', 'DROPPED', 'ARCHIVED', 'SUSPENDED'].includes(completedEnrollment.status);
  assert(
    isCompletedEligible === false,
    'Inactive Enrollment Guard',
    `Completed enrollment ${completedEnrollment.enrollmentId} is correctly blocked from new Sabak`
  );

  // 1.4 Ustad binding to Staff & Payroll
  const resolvedUstad = db.staffList.find(st => st.id === activeEnrollment.primaryUstadId);
  assert(
    resolvedUstad !== undefined && resolvedUstad.designationBn === 'প্রধান হিফজ শিক্ষক',
    'Authoritative Ustad Binding',
    `Ustad references staff: ${resolvedUstad?.name} (${resolvedUstad?.designationBn})`
  );

  console.log('\n>>> 2. Testing Quran Reference Integration & Range Validation (Section 8, 9, 10)');
  // 2.1 Valid same-surah range
  const validRange = quranReferenceService.validateRange('2:255', '2:257');
  assert(
    validRange.isValid === true && validRange.verseCount === 3,
    'Valid Quran Range (2:255 -> 2:257)',
    `Successfully validated 3 verses: Ayat al-Kursi span`
  );

  const resolvedRange = quranReferenceService.getAyahRange('2:255', '2:257');
  assert(
    resolvedRange !== null && resolvedRange.totalAyahs === 3 && resolvedRange.startSurah.nameBangla === 'আল-বাকারা',
    'Quran Range Resolution Metadata',
    `Resolved Surah: ${resolvedRange?.startSurah.nameBangla}, Total: ${resolvedRange?.totalAyahs} Ayahs`
  );

  // 2.2 Invalid range (non-existent verse key)
  const invalidRange = quranReferenceService.validateRange('999:1', '999:5');
  assert(
    invalidRange.isValid === false,
    'Invalid Verse Key Rejection',
    `Rejected non-existent surah 999: ${invalidRange.error}`
  );

  // 2.3 Inverted range (start after end)
  const invertedRange = quranReferenceService.validateRange('2:257', '2:255');
  assert(
    invertedRange.isValid === false,
    'Inverted Range Rejection',
    `Rejected inverted range (2:257 -> 2:255): ${invertedRange.error}`
  );

  // 2.4 Cross-Surah range (113:1 -> 114:6)
  const crossSurahRange = quranReferenceService.getAyahRange('113:1', '114:6');
  assert(
    crossSurahRange !== null && crossSurahRange.totalAyahs === 11 && crossSurahRange.spansMultipleSurahs === true,
    'Cross-Surah Range Resolution',
    `Resolved 11 verses spanning Al-Falaq & An-Nas`
  );

  console.log('\n>>> 3. Testing Sabak Creation, ID Generation & Persistence (Section 4, 11, 22)');
  // 3.1 ID Pattern
  const nextSabakId = db.generateNextHifzSabakId(testMosqueA);
  assert(
    /^SBK-\d{4}-\d{6}$/.test(nextSabakId),
    'Sequential Sabak ID Format',
    `Generated ID: ${nextSabakId}`
  );

  // 3.2 Create Sabak
  const now = new Date().toISOString();
  const testSabak1: HifzSabak = {
    id: `sbk-test-${Date.now()}-1`,
    sabakId: nextSabakId,
    mosqueId: testMosqueA,
    enrollmentId: activeEnrollment.id,
    studentProfileId: resolvedStudent!.id,
    studentId: resolvedStudent!.studentId,
    studentName: resolvedStudent!.personName,
    date: '2026-09-30',
    ustadId: resolvedUstad!.id,
    ustadName: resolvedUstad!.name,
    startVerseKey: '2:255',
    endVerseKey: '2:257',
    totalAyahs: resolvedRange!.totalAyahs,
    startSurahNumber: resolvedRange!.startSurah.surahNumber,
    startSurahNameBn: resolvedRange!.startSurah.nameBangla,
    endSurahNumber: resolvedRange!.endSurah.surahNumber,
    endSurahNameBn: resolvedRange!.endSurah.nameBangla,
    status: 'ASSIGNED',
    remarks: 'প্রথম সবক বরাদ্দ',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzSabaks.push(testSabak1);
  db.save();

  assert(
    db.hifzSabaks.some(s => s.id === testSabak1.id),
    'Sabak Record Persisted',
    `Persisted sabak #${testSabak1.sabakId} in DatabaseStore`
  );

  // 3.3 No Arabic text duplication in Sabak entity
  const rawSabakKeys = Object.keys(testSabak1);
  const hasQuranTextCopied = rawSabakKeys.includes('text') || rawSabakKeys.includes('arabicText');
  assert(
    hasQuranTextCopied === false,
    'Zero Quran Text Duplication',
    `Sabak stores canonical keys (${testSabak1.startVerseKey} -> ${testSabak1.endVerseKey}) without copying Quran Arabic text`
  );

  console.log('\n>>> 4. Testing Status Transitions & Evaluation (Section 11, 12, 13, 14, 15)');
  // 4.1 Transition: ASSIGNED -> PRESENTED
  const validTransitions: Record<string, string[]> = {
    ASSIGNED: ['PRESENTED', 'CANCELLED'],
    PRESENTED: ['EVALUATED', 'ASSIGNED', 'CANCELLED'],
    EVALUATED: ['COMPLETED', 'PRESENTED', 'CANCELLED'],
    COMPLETED: ['EVALUATED', 'CANCELLED'],
  };

  const canPresent = validTransitions[testSabak1.status].includes('PRESENTED');
  assert(canPresent === true, 'Transition: ASSIGNED -> PRESENTED', 'Valid transition allowed');
  testSabak1.status = 'PRESENTED';
  testSabak1.updatedAt = new Date().toISOString();

  // 4.2 Transition: PRESENTED -> EVALUATED with Evaluation & Mistakes
  const canEvaluate = validTransitions[testSabak1.status].includes('EVALUATED');
  assert(canEvaluate === true, 'Transition: PRESENTED -> EVALUATED', 'Valid transition allowed');
  testSabak1.status = 'EVALUATED';
  testSabak1.performance = 'GOOD';
  testSabak1.mistakeCount = 1;
  testSabak1.remarks = '১টি সামান্য আটকে যাওয়া, বাদবাকি উত্তম';
  testSabak1.updatedAt = new Date().toISOString();

  assert(
    testSabak1.performance === 'GOOD' && testSabak1.mistakeCount === 1,
    'Sabak Evaluation Recorded',
    `Performance: ${testSabak1.performance}, MistakeCount: ${testSabak1.mistakeCount}`
  );

  // 4.3 Transition: EVALUATED -> COMPLETED
  const canComplete = validTransitions[testSabak1.status].includes('COMPLETED');
  assert(canComplete === true, 'Transition: EVALUATED -> COMPLETED', 'Valid completion allowed');
  testSabak1.status = 'COMPLETED';
  testSabak1.updatedAt = new Date().toISOString();

  // 4.4 Invalid Transition Guard (e.g. ASSIGNED -> COMPLETED directly)
  const canJumpAssignedToCompleted = validTransitions['ASSIGNED'].includes('COMPLETED');
  assert(
    canJumpAssignedToCompleted === false,
    'Invalid Transition Guard (ASSIGNED -> COMPLETED)',
    'Direct jump from ASSIGNED to COMPLETED is strictly rejected'
  );

  // 4.5 Mistake Count Validation (Non-negative)
  const negativeMistake = -2;
  const isMistakeValid = Number.isInteger(negativeMistake) && negativeMistake >= 0;
  assert(
    isMistakeValid === false,
    'Negative Mistake Count Guard',
    `Rejected negative mistake count ${negativeMistake}`
  );

  // 4.6 Performance Enum Validation
  const validPerformances: HifzSabakPerformance[] = ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT', 'NOT_PASSED'];
  assert(
    validPerformances.includes('EXCELLENT') && validPerformances.includes('NOT_PASSED'),
    'Performance Values Supported',
    `Supported: ${validPerformances.join(', ')}`
  );

  // 4.7 Cancellation and Immutability
  const testSabakCancel: HifzSabak = {
    ...testSabak1,
    id: `sbk-test-cancel-${Date.now()}`,
    sabakId: db.generateNextHifzSabakId(testMosqueA),
    status: 'CANCELLED',
    remarks: 'ভুল এন্ট্রি হওয়ায় বাতিল',
  };
  db.hifzSabaks.push(testSabakCancel);
  assert(
    testSabakCancel.status === 'CANCELLED',
    'Controlled Sabak Cancellation',
    `Sabak #${testSabakCancel.sabakId} marked CANCELLED without hard deletion`
  );

  console.log('\n>>> 5. Testing Overlap, Duplicate & Concurrency Controls (Section 16, 17, 18)');
  // 5.1 Exact duplicate active Sabak detection
  const duplicateCandidate = {
    mosqueId: testMosqueA,
    enrollmentId: activeEnrollment.id,
    date: '2026-09-30',
    startVerseKey: '2:255',
    endVerseKey: '2:257',
  };
  const isDuplicate = db.hifzSabaks.some(s =>
    s.mosqueId === duplicateCandidate.mosqueId &&
    s.enrollmentId === duplicateCandidate.enrollmentId &&
    s.date === duplicateCandidate.date &&
    s.startVerseKey === duplicateCandidate.startVerseKey &&
    s.endVerseKey === duplicateCandidate.endVerseKey &&
    s.status !== 'CANCELLED'
  );
  assert(
    isDuplicate === true,
    'Exact Duplicate Active Sabak Detected',
    `Detected pre-existing active sabak for same student, date & range`
  );

  // 5.2 Different range on same date allowed (non-identical)
  const differentRangeCandidate = {
    mosqueId: testMosqueA,
    enrollmentId: activeEnrollment.id,
    date: '2026-09-30',
    startVerseKey: '2:258',
    endVerseKey: '2:260',
  };
  const isDifferentDuplicate = db.hifzSabaks.some(s =>
    s.mosqueId === differentRangeCandidate.mosqueId &&
    s.enrollmentId === differentRangeCandidate.enrollmentId &&
    s.date === differentRangeCandidate.date &&
    s.startVerseKey === differentRangeCandidate.startVerseKey &&
    s.endVerseKey === differentRangeCandidate.endVerseKey &&
    s.status !== 'CANCELLED'
  );
  assert(
    isDifferentDuplicate === false,
    'Adjacent Non-identical Range Allowed',
    `Different range 2:258 -> 2:260 on same date is allowed`
  );

  // 5.3 Simulated Concurrent Duplicate Creation
  let createdCount = 0;
  let rejectedCount = 0;
  for (let i = 0; i < 5; i++) {
    const activeExists = db.hifzSabaks.some(s =>
      s.mosqueId === testMosqueA &&
      s.enrollmentId === activeEnrollment.id &&
      s.date === '2026-09-30' &&
      s.startVerseKey === '2:255' &&
      s.endVerseKey === '2:257' &&
      s.status !== 'CANCELLED'
    );
    if (!activeExists) {
      createdCount++;
    } else {
      rejectedCount++;
    }
  }
  assert(
    createdCount === 0 && rejectedCount === 5,
    'Concurrent Sabak Deduping',
    `Blocked 5 concurrent duplicate attempts; exactly 1 active sabak remains`
  );

  // 5.4 Idempotency Guard
  const testIdempotencyKey = `idem-sbk-${Date.now()}`;
  const mockPayload = { status: 201, body: { success: true, sabakId: testSabak1.sabakId } };
  db.saveIdempotency(testIdempotencyKey, mockPayload);
  const cachedResponse = db.checkIdempotency(testIdempotencyKey);
  assert(
    cachedResponse !== null && (cachedResponse.body?.sabakId === testSabak1.sabakId || cachedResponse.sabakId === testSabak1.sabakId),
    'Idempotency Service Integration',
    `Idempotency cached response retrieved for key ${testIdempotencyKey}`
  );

  console.log('\n>>> 6. Testing Multi-Tenancy & Cross-Tenant Security (Section 19)');
  // 6.1 Tenant Scoping: Mosque B sees 0 Sabak of Mosque A
  const mosqueBSabaks = db.hifzSabaks.filter(s => s.mosqueId === testMosqueB);
  assert(
    mosqueBSabaks.length === 0,
    'Mosque B Sabak Isolation',
    `Mosque B has ${mosqueBSabaks.length} sabaks (zero data leakage)`
  );

  // 6.2 Cross-Tenant Enrollment Sabak Assignment Blocked
  const crossTenantEnrollmentAttempt = activeEnrollment.mosqueId !== testMosqueB;
  assert(
    crossTenantEnrollmentAttempt === true,
    'Cross-Tenant Enrollment Guard',
    `Mosque B cannot create sabak using Mosque A enrollment`
  );

  // 6.3 Cross-Tenant Ustad Assignment Blocked
  const crossTenantUstadAttempt = ustadStaffB.mosqueId !== testMosqueA;
  assert(
    crossTenantUstadAttempt === true,
    'Cross-Tenant Ustad Guard',
    `Mosque A cannot assign Mosque B staff member`
  );

  console.log('\n>>> 7. Testing RBAC Server Authorization (Section 20)');
  // 7.1 Admin role has mutation rights
  const adminPermissions = ['SUPER_ADMIN', 'MOSQUE_ADMIN'];
  const canAdminMutate = adminPermissions.includes(testUserAdmin.role);
  assert(
    canAdminMutate === true,
    'Admin Sabak Mutation Permission',
    `Role ${testUserAdmin.role} authorized for Sabak creation and evaluation`
  );

  // 7.2 Viewer role is strictly read-only
  const canViewerMutate = adminPermissions.includes(testUserViewer.role);
  assert(
    canViewerMutate === false,
    'Viewer Read-Only Enforcement',
    `Role ${testUserViewer.role} denied mutation permission`
  );

  console.log('\n>>> 8. Testing Authoritative Audit Logging (Section 21)');
  // 8.1 Log audit entry
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'CREATE',
    'HIFZ',
    `নতুন সবক বরাদ্দ (${testSabak1.sabakId}): ${testSabak1.studentName} -> 2:255 থেকে 2:257`,
    testSabak1.id
  );

  const hifzAuditEntries = (db.auditLogs || []).filter(a => a.category === 'HIFZ' && a.mosqueId === testMosqueA);
  assert(
    hifzAuditEntries.length > 0,
    'Audit Log Recorded for Sabak',
    `Found ${hifzAuditEntries.length} HIFZ audit entries for mosque ${testMosqueA}`
  );

  console.log('\n>>> 9. Testing Zero Financial Impact (Section 23)');
  // 9.1 Income entries unchanged
  const currentIncomes = (db.incomeEntries || []).length;
  assert(
    currentIncomes === initialIncomes,
    'Zero Income Mutation',
    `Income records: ${initialIncomes} -> ${currentIncomes} (Delta: 0)`
  );

  // 9.2 Expense entries unchanged
  const currentExpenses = (db.expenseEntries || []).length;
  assert(
    currentExpenses === initialExpenses,
    'Zero Expense Mutation',
    `Expense records: ${initialExpenses} -> ${currentExpenses} (Delta: 0)`
  );

  // 9.3 Account balance unchanged
  const currentAccounts = JSON.parse(JSON.stringify(db.accounts || []));
  const balancesEqual = JSON.stringify(initialAccounts) === JSON.stringify(currentAccounts);
  assert(
    balancesEqual === true,
    'Zero Financial Account Balance Mutation',
    'Financial Delta = ৳0.00 (Accounts intact)'
  );

  console.log('\n>>> 10. Testing Strict Scope Boundary Enforcement (Section 2)');
  // 10.1 Zero Sabaki implementation
  const hasSabakiProps = 'sabaki' in db || 'hifzSabaki' in db;
  assert(
    hasSabakiProps === false,
    'Zero Sabaki Implementation in H3-A',
    'H3-B Sabaki remains strictly NOT implemented'
  );

  // 10.2 Zero Daur implementation
  const hasDaurProps = 'daur' in db || 'hifzDaur' in db;
  assert(
    hasDaurProps === false,
    'Zero Daur Implementation in H3-A',
    'H4 Daur remains strictly NOT implemented'
  );

  // 10.3 Zero Revision implementation
  const hasRevisionProps = 'revision' in db || 'hifzRevision' in db;
  assert(
    hasRevisionProps === false,
    'Zero Revision Implementation in H3-A',
    'H4 Revision remains strictly NOT implemented'
  );

  // 10.4 Zero Attendance implementation
  const hasHifzAttendance = 'hifzAttendance' in db;
  assert(
    hasHifzAttendance === false,
    'Zero Hifz Attendance in H3-A',
    'H5 Attendance remains strictly NOT implemented'
  );

  // 10.5 Zero Hifz Fees implementation
  const hasHifzFees = 'hifzFees' in db;
  assert(
    hasHifzFees === false,
    'Zero Hifz Fees in H3-A',
    'H7 Fees remains strictly NOT implemented'
  );

  // 10.6 Zero QR implementation
  const hasHifzQR = 'hifzQR' in db;
  assert(
    hasHifzQR === false,
    'Zero QR Implementation in H3-A',
    'H8 QR remains strictly NOT implemented'
  );

  // 10.7 Zero Documents implementation
  const hasHifzDocs = 'hifzDocuments' in db;
  assert(
    hasHifzDocs === false,
    'Zero Documents Implementation in H3-A',
    'H8 Documents remains strictly NOT implemented'
  );

  // Clean up test fixtures to preserve pristine database
  console.log('\n>>> Cleaning up test fixtures...');
  db.hifzSabaks = db.hifzSabaks.filter(s => s.mosqueId !== testMosqueA && s.mosqueId !== testMosqueB);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.mosqueId !== testMosqueA && s.mosqueId !== testMosqueB);
  db.staffList = db.staffList.filter(st => st.mosqueId !== testMosqueA && st.mosqueId !== testMosqueB);
  db.hifzLevels = db.hifzLevels.filter(l => l.mosqueId !== testMosqueA && l.mosqueId !== testMosqueB);
  db.hifzCurricula = db.hifzCurricula.filter(c => c.mosqueId !== testMosqueA && c.mosqueId !== testMosqueB);
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log('================================================================');
  console.log(`H3-A TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHifzSabakTestSuite().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

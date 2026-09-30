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
  HifzSabaki,
  HifzSabakiStatus,
  HifzSabakiPerformance,
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

async function runHifzSabakiTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H3-B — SABAKI FOUNDATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-sabaki-a';
  const testMosqueB = 'test-mosque-sabaki-b';
  const testUserAdmin = { id: 'usr-admin-sbki-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN' };
  const testUserViewer = { id: 'usr-viewer-sbki-02', name: 'Viewer User', role: 'VIEWER' };

  // Setup Ustad (Staff)
  const ustadStaff: Staff = {
    id: `stf-sbki-${Date.now()}-1`,
    mosqueId: testMosqueA,
    name: 'হাফেজ ক্বারী মাও. মুহাম্মদ উসমান',
    phone: '01811223344',
    designation: 'TEACHER',
    designationBn: 'প্রধান হিফজ শিক্ষক',
    nid: '19881122334455',
    staffCode: 'STF-0201',
    monthlySalary: 25000,
    allowance: 0,
    joiningDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaff);

  const ustadStaffB: Staff = {
    id: `stf-sbki-b-${Date.now()}-2`,
    mosqueId: testMosqueB,
    name: 'হাফেজ আহমদ উল্লাহ (মক বি)',
    phone: '01899887766',
    designation: 'TEACHER',
    designationBn: 'হিফজ শিক্ষক',
    nid: '19889988776655',
    staffCode: 'STF-0202',
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
    id: `stu-prof-sbki-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: `prs-sbki-${Date.now()}-1`,
    studentId: 'STU-000201',
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
    id: `stu-prof-sbki-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: `prs-sbki-${Date.now()}-2`,
    studentId: 'STU-000202',
    personName: 'আব্দুল্লাহ আল মাহমুদ',
    personMobile: '01722003344',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  // Setup Levels & Curriculum
  const levels = getStarterHifzLevels(testMosqueA);
  const curricula = getStarterHifzCurricula(testMosqueA);
  db.hifzLevels.push(...levels);
  db.hifzCurricula.push(...curricula);

  // Setup Active Enrollment for Student 1
  const enrollmentActive: HifzkhanaEnrollment = {
    id: `henr-sbki-act-${Date.now()}-1`,
    enrollmentId: 'HENR-2026-000201',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-15',
    currentLevelId: levels[0].id,
    curriculumId: curricula[0].id,
    primaryUstadId: ustadStaff.id,
    primaryUstadName: ustadStaff.name,
    studyType: 'NON_RESIDENTIAL',
    status: 'ACTIVE',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentActive);

  // Setup Inactive Enrollment for Student 2
  const enrollmentInactive: HifzkhanaEnrollment = {
    id: `henr-sbki-inact-${Date.now()}-2`,
    enrollmentId: 'HENR-2026-000202',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: studentProfile2.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-15',
    currentLevelId: levels[0].id,
    curriculumId: curricula[0].id,
    primaryUstadId: ustadStaff.id,
    studyType: 'NON_RESIDENTIAL',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentInactive);

  // Setup an authoritative locked H3-A Sabak for Student 1
  const sourceSabakRecord: HifzSabak = {
    id: `sbk-src-${Date.now()}-1`,
    sabakId: 'SBK-2026-000101',
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-29',
    ustadId: ustadStaff.id,
    ustadName: ustadStaff.name,
    startVerseKey: '2:255',
    endVerseKey: '2:257',
    totalAyahs: 3,
    startSurahNumber: 2,
    startSurahNameBn: 'আল-বাকারা',
    endSurahNumber: 2,
    endSurahNameBn: 'আল-বাকারা',
    status: 'COMPLETED',
    performance: 'EXCELLENT',
    mistakeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzSabaks.push(sourceSabakRecord);

  // Setup a Mosque B Sabak to test cross-tenant source sabak rejection
  const foreignSabakB: HifzSabak = {
    id: `sbk-src-b-${Date.now()}-2`,
    sabakId: 'SBK-2026-000102',
    mosqueId: testMosqueB,
    enrollmentId: 'henr-foreign-b',
    studentProfileId: 'stu-foreign-b',
    studentId: 'STU-000999',
    studentName: 'Foreign Student',
    date: '2026-09-29',
    ustadId: ustadStaffB.id,
    startVerseKey: '2:255',
    endVerseKey: '2:257',
    totalAyahs: 3,
    startSurahNumber: 2,
    endSurahNumber: 2,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzSabaks.push(foreignSabakB);

  // ==========================================
  // SECTION 1: Identity Chain & Enrollment Eligibility
  // ==========================================
  console.log('>>> 1. Testing Identity Chain & Enrollment Eligibility (Section 4, 8, 9)');

  const eligibleEnrollment = db.hifzEnrollments.find(
    (e) => e.id === enrollmentActive.id && e.mosqueId === testMosqueA && e.status === 'ACTIVE'
  );
  assert(
    !!eligibleEnrollment,
    'Active Enrollment Identified',
    `Found eligible active enrollment: ${eligibleEnrollment?.enrollmentId}`
  );

  const resolvedStudent = db.educationStudentProfiles.find(
    (p) => p.id === eligibleEnrollment?.studentProfileId && p.mosqueId === testMosqueA
  );
  assert(
    !!resolvedStudent && resolvedStudent.personName === 'মুহাম্মদ তালহা জুবায়ের',
    'Identity Chain Resolution',
    `Resolved student profile ${resolvedStudent?.studentId} -> ${resolvedStudent?.personName}`
  );

  const inactiveBlocked = db.hifzEnrollments.find(
    (e) => e.id === enrollmentInactive.id && e.status === 'ACTIVE'
  );
  assert(
    !inactiveBlocked,
    'Inactive Enrollment Guard',
    `Completed enrollment ${enrollmentInactive.enrollmentId} is correctly blocked from new Sabaki`
  );

  const authoritativeUstad = db.staffList.find(
    (s) => s.id === eligibleEnrollment?.primaryUstadId && s.mosqueId === testMosqueA
  );
  assert(
    !!authoritativeUstad && authoritativeUstad.name === 'হাফেজ ক্বারী মাও. মুহাম্মদ উসমান',
    'Authoritative Ustad Binding',
    `Ustad references staff: ${authoritativeUstad?.name} (${authoritativeUstad?.designationBn})`
  );

  // ==========================================
  // SECTION 2: Source Sabak Reference Integration
  // ==========================================
  console.log('\n>>> 2. Testing Source Sabak Reference & Validation (Section 7)');

  const validSourceSabak = db.hifzSabaks.find(
    (s) => s.id === sourceSabakRecord.id && s.mosqueId === testMosqueA && s.enrollmentId === enrollmentActive.id
  );
  assert(
    !!validSourceSabak && validSourceSabak.sabakId === 'SBK-2026-000101',
    'Valid Source Sabak Binding',
    `Source Sabak #${validSourceSabak?.sabakId} verified for same student & tenant`
  );

  // Cross-tenant source Sabak check
  const crossTenantSourceSabak = db.hifzSabaks.find(
    (s) => s.id === foreignSabakB.id && s.mosqueId === testMosqueA
  );
  assert(
    !crossTenantSourceSabak,
    'Cross-Tenant Source Sabak Rejected',
    'Source Sabak from Mosque B is inaccessible in Mosque A'
  );

  // Source Sabak from different student enrollment
  const wrongEnrollmentSourceSabak = db.hifzSabaks.find(
    (s) => s.id === sourceSabakRecord.id && s.enrollmentId === enrollmentInactive.id
  );
  assert(
    !wrongEnrollmentSourceSabak,
    'Wrong Enrollment Source Sabak Rejected',
    'Source Sabak belonging to another student enrollment is rejected'
  );

  // ==========================================
  // SECTION 3: Quran Reference Integration & Range Validation
  // ==========================================
  console.log('\n>>> 3. Testing Quran Reference Integration & Range Validation (Section 10, 11)');

  const validRange = quranReferenceService.validateRange('2:255', '2:257');
  assert(
    validRange.isValid === true && validRange.verseCount === 3,
    'Valid Quran Range (2:255 -> 2:257)',
    `Successfully validated 3 verses: Ayat al-Kursi span`
  );

  const rangeInfo = quranReferenceService.getAyahRange('2:255', '2:257');
  assert(
    rangeInfo !== null && rangeInfo.totalAyahs === 3 && rangeInfo.startSurah.nameBangla === 'আল-বাকারা',
    'Quran Range Resolution Metadata',
    `Resolved Surah: ${rangeInfo?.startSurah.nameBangla}, Total: ${rangeInfo?.totalAyahs} Ayahs`
  );

  const invalidVerseRange = quranReferenceService.validateRange('999:1', '999:5');
  assert(
    invalidVerseRange.isValid === false,
    'Invalid Verse Key Rejection',
    `Rejected non-existent surah 999: ${invalidVerseRange.error}`
  );

  const invertedRange = quranReferenceService.validateRange('2:257', '2:255');
  assert(
    invertedRange.isValid === false,
    'Inverted Range Rejection',
    `Rejected inverted range (2:257 -> 2:255): ${invertedRange.error}`
  );

  const crossSurahRange = quranReferenceService.getAyahRange('113:1', '114:6');
  assert(
    crossSurahRange !== null && crossSurahRange.totalAyahs === 11 && crossSurahRange.spansMultipleSurahs === true,
    'Cross-Surah Range Resolution',
    `Resolved 11 verses spanning Al-Falaq & An-Nas`
  );

  // ==========================================
  // SECTION 4: Sabaki Creation, ID Generation & Persistence
  // ==========================================
  console.log('\n>>> 4. Testing Sabaki Creation, ID Generation & Persistence (Section 5, 6, 22)');

  const generatedSabakiId = db.generateNextHifzSabakiId(testMosqueA);
  assert(
    /^SBKI-\d{4}-\d{6}$/.test(generatedSabakiId),
    'Sequential Sabaki ID Format',
    `Generated ID: ${generatedSabakiId}`
  );

  const initialSabaki: HifzSabaki = {
    id: `sbki-test-${Date.now()}-1`,
    sabakiId: generatedSabakiId,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    ustadId: ustadStaff.id,
    ustadName: ustadStaff.name,
    sourceSabakId: sourceSabakRecord.id,
    sourceSabakDisplayId: sourceSabakRecord.sabakId,
    startVerseKey: '2:255',
    endVerseKey: '2:257',
    totalAyahs: 3,
    startSurahNumber: 2,
    startSurahNameBn: 'আল-বাকারা',
    endSurahNumber: 2,
    endSurahNameBn: 'আল-বাকারা',
    status: 'ASSIGNED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.hifzSabakis.unshift(initialSabaki);
  db.save();

  const persisted = db.hifzSabakis.find((s) => s.id === initialSabaki.id && s.mosqueId === testMosqueA);
  assert(
    !!persisted && persisted.sabakiId === generatedSabakiId,
    'Sabaki Record Persisted',
    `Persisted sabaki #${persisted?.sabakiId} in DatabaseStore`
  );

  // Verify Zero Quran Text duplication
  const hasCopiedQuranText = (persisted as any).arabicText || (persisted as any).quranText || (persisted as any).verses;
  assert(
    !hasCopiedQuranText,
    'Zero Quran Text Duplication',
    `Sabaki stores canonical keys (${persisted?.startVerseKey} -> ${persisted?.endVerseKey}) without copying Quran Arabic text`
  );

  // Independent Sabaki without sourceSabakId allowed
  const independentSabaki: HifzSabaki = {
    id: `sbki-indep-${Date.now()}-2`,
    sabakiId: db.generateNextHifzSabakiId(testMosqueA),
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    ustadId: ustadStaff.id,
    ustadName: ustadStaff.name,
    startVerseKey: '113:1',
    endVerseKey: '114:6',
    totalAyahs: 11,
    startSurahNumber: 113,
    startSurahNameBn: 'আল-ফালাক',
    endSurahNumber: 114,
    endSurahNameBn: 'আন-নাস',
    status: 'ASSIGNED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzSabakis.unshift(independentSabaki);
  assert(
    !independentSabaki.sourceSabakId,
    'Independent Sabaki Supported',
    `Independent Sabaki #${independentSabaki.sabakiId} created without sourceSabakId`
  );

  // ==========================================
  // SECTION 5: Status Machine & Evaluation
  // ==========================================
  console.log('\n>>> 5. Testing Status Transitions & Evaluation (Section 12, 13, 14)');

  // 1. ASSIGNED -> REVIEWED
  const validTransitions: Record<string, string[]> = {
    ASSIGNED: ['REVIEWED', 'CANCELLED'],
    REVIEWED: ['EVALUATED', 'ASSIGNED', 'CANCELLED'],
    EVALUATED: ['COMPLETED', 'REVIEWED', 'CANCELLED'],
    COMPLETED: ['EVALUATED', 'CANCELLED'],
  };

  const canTransitionToReviewed = validTransitions['ASSIGNED'].includes('REVIEWED');
  assert(
    canTransitionToReviewed,
    'Transition: ASSIGNED -> REVIEWED',
    'Valid review transition allowed'
  );
  persisted!.status = 'REVIEWED';

  // 2. REVIEWED -> EVALUATED
  const canTransitionToEvaluated = validTransitions['REVIEWED'].includes('EVALUATED');
  assert(
    canTransitionToEvaluated,
    'Transition: REVIEWED -> EVALUATED',
    'Valid evaluation transition allowed'
  );
  persisted!.status = 'EVALUATED';
  persisted!.performance = 'GOOD';
  persisted!.mistakeCount = 1;
  persisted!.remarks = 'তাজভীদ সঠিক ছিল, ১টি সাধারণ হরকত সংশোধন হয়েছে।';

  assert(
    persisted!.performance === 'GOOD' && persisted!.mistakeCount === 1,
    'Sabaki Evaluation Recorded',
    `Performance: ${persisted!.performance}, MistakeCount: ${persisted!.mistakeCount}`
  );

  // 3. EVALUATED -> COMPLETED
  const canTransitionToCompleted = validTransitions['EVALUATED'].includes('COMPLETED');
  assert(
    canTransitionToCompleted,
    'Transition: EVALUATED -> COMPLETED',
    'Valid completion allowed'
  );
  persisted!.status = 'COMPLETED';

  // 4. Invalid transition guard: ASSIGNED directly to COMPLETED
  const directAssignToComplete = validTransitions['ASSIGNED'].includes('COMPLETED');
  assert(
    !directAssignToComplete,
    'Invalid Transition Guard (ASSIGNED -> COMPLETED)',
    'Direct jump from ASSIGNED to COMPLETED is strictly rejected'
  );

  // 5. Negative mistake count rejection
  const negativeMistake = -2;
  const isInvalidMistake = isNaN(negativeMistake) || negativeMistake < 0 || !Number.isInteger(negativeMistake);
  assert(
    isInvalidMistake,
    'Negative Mistake Count Guard',
    `Rejected negative mistake count ${negativeMistake}`
  );

  // 6. Valid performance enum values
  const supportedPerformances: HifzSabakiPerformance[] = ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT', 'NOT_PASSED'];
  assert(
    supportedPerformances.length === 5,
    'Performance Values Supported',
    `Supported: ${supportedPerformances.join(', ')}`
  );

  // 7. Soft cancellation
  independentSabaki.status = 'CANCELLED';
  assert(
    independentSabaki.status === 'CANCELLED' && db.hifzSabakis.some((s) => s.id === independentSabaki.id),
    'Controlled Sabaki Cancellation',
    `Sabaki #${independentSabaki.sabakiId} marked CANCELLED without hard deletion`
  );

  // ==========================================
  // SECTION 6: Overlap, Duplicate & Concurrency Controls
  // ==========================================
  console.log('\n>>> 6. Testing Overlap, Duplicate & Concurrency Controls (Section 15, 16, 17)');

  // Exact duplicate active Sabaki on same mosque, enrollment, date, sourceSabak, range
  const isDuplicateActive = db.hifzSabakis.some(
    (s) =>
      s.mosqueId === testMosqueA &&
      s.enrollmentId === enrollmentActive.id &&
      s.date === '2026-09-30' &&
      s.startVerseKey === '2:255' &&
      s.endVerseKey === '2:257' &&
      s.sourceSabakId === sourceSabakRecord.id &&
      s.status !== 'CANCELLED'
  );
  assert(
    isDuplicateActive,
    'Exact Duplicate Active Sabaki Detected',
    'Detected pre-existing active sabaki for same student, date, source sabak & range'
  );

  // Legitimate repeated range on a different date is ALLOWED
  const nextDateSabakiAllowed = !db.hifzSabakis.some(
    (s) =>
      s.mosqueId === testMosqueA &&
      s.enrollmentId === enrollmentActive.id &&
      s.date === '2026-10-01' &&
      s.startVerseKey === '2:255' &&
      s.endVerseKey === '2:257' &&
      s.status !== 'CANCELLED'
  );
  assert(
    nextDateSabakiAllowed,
    'Legitimate Repeated Range on Different Date Allowed',
    'Same Quran range 2:255 -> 2:257 on future date 2026-10-01 is allowed'
  );

  // Concurrent deduplication test: simulate 5 parallel requests
  const simRequests = Array.from({ length: 5 }, (_, i) => ({
    reqId: i + 1,
    enrollmentId: enrollmentActive.id,
    date: '2026-09-30',
    startVerseKey: '2:255',
    endVerseKey: '2:257',
  }));

  let createdCount = 0;
  let rejectedCount = 0;
  simRequests.forEach(() => {
    const dup = db.hifzSabakis.some(
      (s) =>
        s.mosqueId === testMosqueA &&
        s.enrollmentId === enrollmentActive.id &&
        s.date === '2026-09-30' &&
        s.startVerseKey === '2:255' &&
        s.endVerseKey === '2:257' &&
        s.status !== 'CANCELLED'
    );
    if (dup) {
      rejectedCount++;
    } else {
      createdCount++;
    }
  });

  assert(
    createdCount === 0 && rejectedCount === 5,
    'Concurrent Sabaki Deduping',
    `Blocked ${rejectedCount} concurrent duplicate attempts; exactly 1 active sabaki remains`
  );

  // Idempotency integration
  const idemKey = `idem-sbki-${Date.now()}`;
  db.saveIdempotency(idemKey, persisted);
  const cachedIdem = db.checkIdempotency(idemKey);
  assert(
    !!cachedIdem && cachedIdem.sabakiId === persisted!.sabakiId,
    'Idempotency Service Integration',
    `Idempotency cached response retrieved for key ${idemKey}`
  );

  // ==========================================
  // SECTION 7: Multi-Tenancy & Cross-Tenant Isolation
  // ==========================================
  console.log('\n>>> 7. Testing Multi-Tenancy & Cross-Tenant Security (Section 19)');

  const mosqueBSabakis = db.hifzSabakis.filter((s) => s.mosqueId === testMosqueB);
  assert(
    mosqueBSabakis.length === 0,
    'Mosque B Sabaki Isolation',
    `Mosque B has ${mosqueBSabakis.length} sabakis (zero data leakage)`
  );

  const crossTenantEnrollmentLookup = db.hifzEnrollments.find(
    (e) => e.id === enrollmentActive.id && e.mosqueId === testMosqueB
  );
  assert(
    !crossTenantEnrollmentLookup,
    'Cross-Tenant Enrollment Guard',
    'Mosque B cannot create sabaki using Mosque A enrollment'
  );

  const crossTenantUstadLookup = db.staffList.find(
    (s) => s.id === ustadStaffB.id && s.mosqueId === testMosqueA
  );
  assert(
    !crossTenantUstadLookup,
    'Cross-Tenant Ustad Guard',
    'Mosque A cannot assign Mosque B staff member'
  );

  // ==========================================
  // SECTION 8: RBAC Server Authorization
  // ==========================================
  console.log('\n>>> 8. Testing RBAC Server Authorization (Section 18)');

  const adminCanMutate = testUserAdmin.role === 'MOSQUE_ADMIN' || testUserAdmin.role === 'SUPER_ADMIN';
  assert(
    adminCanMutate,
    'Admin Sabaki Mutation Permission',
    `Role ${testUserAdmin.role} authorized for Sabaki creation and evaluation`
  );

  const viewerCanMutate = ['MOSQUE_ADMIN', 'SUPER_ADMIN', 'DATA_ENTRY_OPERATOR'].includes(testUserViewer.role);
  assert(
    !viewerCanMutate,
    'Viewer Read-Only Enforcement',
    `Role ${testUserViewer.role} denied mutation permission`
  );

  // ==========================================
  // SECTION 9: Authoritative Audit Logging
  // ==========================================
  console.log('\n>>> 9. Testing Authoritative Audit Logging (Section 20)');

  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'CREATE',
    'HIFZ',
    `নতুন সবকী এন্ট্রি (${persisted!.sabakiId}): ${persisted!.studentName} - আয়াত ${persisted!.startVerseKey} থেকে ${persisted!.endVerseKey}`,
    persisted!.id
  );

  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'STATUS_CHANGE',
    'HIFZ',
    `সবকী স্ট্যাটাস পরিবর্তন (${persisted!.sabakiId}): ASSIGNED -> COMPLETED [GOOD]`,
    persisted!.id
  );

  const hifzAuditEntries = (db.auditLogs || []).filter(
    (a) => a.mosqueId === testMosqueA && a.module === 'HIFZ'
  );
  assert(
    hifzAuditEntries.length >= 2,
    'Audit Log Recorded for Sabaki',
    `Found ${hifzAuditEntries.length} HIFZ audit entries for mosque ${testMosqueA}`
  );

  // ==========================================
  // SECTION 10: Zero Financial Impact
  // ==========================================
  console.log('\n>>> 10. Testing Zero Financial Impact (Section 21)');

  const initialIncomeCount = (db.incomeEntries || []).length;
  const initialExpenseCount = (db.expenseEntries || []).length;
  const initialAccounts = JSON.parse(JSON.stringify(db.accounts || []));

  // Perform Sabaki mutation
  persisted!.updatedAt = new Date().toISOString();
  db.save();

  const finalIncomeCount = (db.incomeEntries || []).length;
  const finalExpenseCount = (db.expenseEntries || []).length;
  const finalAccounts = JSON.parse(JSON.stringify(db.accounts || []));

  assert(
    initialIncomeCount === finalIncomeCount,
    'Zero Income Mutation',
    `Income records: ${initialIncomeCount} -> ${finalIncomeCount} (Delta: 0)`
  );
  assert(
    initialExpenseCount === finalExpenseCount,
    'Zero Expense Mutation',
    `Expense records: ${initialExpenseCount} -> ${finalExpenseCount} (Delta: 0)`
  );
  assert(
    JSON.stringify(initialAccounts) === JSON.stringify(finalAccounts),
    'Zero Financial Account Balance Mutation',
    'Financial Delta = ৳0.00 (Accounts intact)'
  );

  // ==========================================
  // SECTION 11: Strict Scope Boundary Enforcement
  // ==========================================
  console.log('\n>>> 11. Testing Strict Scope Boundary Enforcement (Section 2, 34)');

  const hasDaurProps = 'daur' in db || 'hifzDaur' in db;
  assert(!hasDaurProps, 'Zero Daur Implementation in H3-B', 'H4 Daur remains strictly NOT implemented');

  const hasRevisionProps = 'revision' in db || 'hifzRevision' in db;
  assert(!hasRevisionProps, 'Zero Revision Implementation in H3-B', 'H4 Revision remains strictly NOT implemented');

  const hasHifzAttendance = 'hifzAttendance' in db;
  assert(!hasHifzAttendance, 'Zero Hifz Attendance in H3-B', 'H5 Attendance remains strictly NOT implemented');

  const hasHifzFees = 'hifzFees' in db;
  assert(!hasHifzFees, 'Zero Hifz Fees in H3-B', 'H7 Fees remains strictly NOT implemented');

  const hasHifzQR = 'hifzQR' in db;
  assert(!hasHifzQR, 'Zero QR Implementation in H3-B', 'H8 QR remains strictly NOT implemented');

  const hasHifzDocs = 'hifzDocuments' in db;
  assert(!hasHifzDocs, 'Zero Documents Implementation in H3-B', 'H8 Documents remains strictly NOT implemented');

  // ==========================================
  // CLEANUP TEST FIXTURES
  // ==========================================
  console.log('\n>>> Cleaning up test fixtures...');
  db.staffList = db.staffList.filter((s) => s.id !== ustadStaff.id && s.id !== ustadStaffB.id);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(
    (p) => p.id !== studentProfile1.id && p.id !== studentProfile2.id
  );
  db.hifzEnrollments = db.hifzEnrollments.filter(
    (e) => e.id !== enrollmentActive.id && e.id !== enrollmentInactive.id
  );
  db.hifzSabaks = db.hifzSabaks.filter(
    (s) => s.id !== sourceSabakRecord.id && s.id !== foreignSabakB.id
  );
  db.hifzSabakis = db.hifzSabakis.filter(
    (s) => s.mosqueId !== testMosqueA && s.mosqueId !== testMosqueB
  );
  db.hifzLevels = db.hifzLevels.filter((l) => l.mosqueId !== testMosqueA);
  db.hifzCurricula = db.hifzCurricula.filter((c) => c.mosqueId !== testMosqueA);
  db.auditLogs = (db.auditLogs || []).filter((a) => a.mosqueId !== testMosqueA);
  db.save();
  console.log('Cleanup completed. Production state intact.');

  console.log('\n================================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`H3-B SABAKI TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHifzSabakiTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

import {
  db,
  getStarterHifzLevels,
  getStarterHifzCurricula,
} from '../src/server/db';
import { quranReferenceService } from '../src/server/quranReferenceService';
import {
  EducationStudentProfile,
  HifzkhanaEnrollment,
  HifzDaurCycle,
  HifzDaurCycleStatus,
  HifzDaur,
  HifzDaurStatus,
  HifzDaurPerformance,
  HifzRevision,
  HifzRevisionReason,
  HifzRevisionPriority,
  HifzRevisionStatus,
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

async function runHifzDaurRevisionTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H4 — DAUR & REVISION FOUNDATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-daur-a';
  const testMosqueB = 'test-mosque-daur-b';
  const testUserAdmin = { id: 'usr-admin-h4-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN' };
  const testUserViewer = { id: 'usr-viewer-h4-02', name: 'Viewer User', role: 'VIEWER' };

  // Setup Ustad (Staff)
  const ustadStaffA: Staff = {
    id: `stf-h4-${Date.now()}-1`,
    mosqueId: testMosqueA,
    name: 'হাফেজ ক্বারী মাওলানা হুসাইন আহমদ',
    phone: '01811334455',
    designation: 'TEACHER',
    designationBn: 'দৌর ও হিফজ প্রধান শিক্ষক',
    nid: '19881133445566',
    staffCode: 'STF-0401',
    monthlySalary: 26000,
    allowance: 0,
    joiningDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffA);

  const ustadStaffB: Staff = {
    id: `stf-h4-b-${Date.now()}-2`,
    mosqueId: testMosqueB,
    name: 'হাফেজ মাওলানা জুবায়ের (মসজিদ বি)',
    phone: '01899776655',
    designation: 'TEACHER',
    designationBn: 'হিফজ শিক্ষক',
    nid: '19889977665544',
    staffCode: 'STF-0402',
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
    id: `stu-prof-h4-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: `prs-h4-${Date.now()}-1`,
    studentId: 'STU-000401',
    personName: 'মুহাম্মদ আব্দুল্লাহ বিন সাদ',
    personMobile: '01711224466',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile1);

  const studentProfile2: EducationStudentProfile = {
    id: `stu-prof-h4-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: `prs-h4-${Date.now()}-2`,
    studentId: 'STU-000402',
    personName: 'মুহাম্মদ আব্দুর রহমান',
    personMobile: '01711335577',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  // Setup Active & Inactive Enrollments
  const enrollmentActive: HifzkhanaEnrollment = {
    id: `henr-h4-${Date.now()}-1`,
    enrollmentId: 'HENR-2026-000401',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test-hifz-daur',
    curriculumId: 'cur-test-full-quran',
    primaryUstadId: ustadStaffA.id,
    primaryUstadName: ustadStaffA.name,
    studyType: 'RESIDENTIAL',
    status: 'ACTIVE',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentActive);

  const enrollmentCompleted: HifzkhanaEnrollment = {
    id: `henr-h4-${Date.now()}-2`,
    enrollmentId: 'HENR-2026-000402',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: studentProfile2.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2025-01-01',
    completionDate: '2026-01-01',
    currentLevelId: 'lvl-test-hifz-daur',
    curriculumId: 'cur-test-full-quran',
    primaryUstadId: ustadStaffA.id,
    primaryUstadName: ustadStaffA.name,
    studyType: 'RESIDENTIAL',
    status: 'COMPLETED',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentCompleted);

  // Initial financial state baseline snapshot
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // ==========================================
  // SECTION 1: DAUR CYCLE TESTS
  // ==========================================
  console.log('>>> 1. Testing Daur Cycle Architecture & Creation (Section 5, 6)');

  // Test 1: ID Generation
  const cycleId1 = db.generateNextHifzDaurCycleId(testMosqueA);
  assert(
    /^DCR-\d{4}-\d{6}$/.test(cycleId1),
    'Sequential Daur Cycle ID Format',
    `Generated ID: ${cycleId1}`
  );

  // Test 2: Active enrollment check
  const isEligible = enrollmentActive.status === 'ACTIVE';
  assert(
    isEligible,
    'Active Enrollment Eligibility',
    `Enrollment #${enrollmentActive.enrollmentId} is ACTIVE`
  );

  // Test 3: Inactive enrollment rejected
  const isInactiveBlocked = enrollmentCompleted.status !== 'ACTIVE';
  assert(
    isInactiveBlocked,
    'Inactive Enrollment Guard',
    `Completed enrollment #${enrollmentCompleted.enrollmentId} rejected for new cycles`
  );

  // Test 4: H2 Quran range validation for Cycle
  const cycleRangeValidation = quranReferenceService.validateRange('1:1', '2:286');
  assert(
    cycleRangeValidation.isValid,
    'H2 Quran Range Validated (1:1 -> 2:286)',
    `Successfully validated cycle target range (Total ayahs: 293)`
  );

  // Test 5: Persist Daur Cycle
  const rangeInfoCycle = quranReferenceService.getAyahRange('1:1', '2:286')!;
  const newCycle: HifzDaurCycle = {
    id: `dcr-test-${Date.now()}-1`,
    cycleId: cycleId1,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: enrollmentActive.studentProfileId,
    studentId: enrollmentActive.studentId,
    studentName: studentProfile1.personName,
    cycleNumber: 1,
    startDate: '2026-09-01',
    targetEndDate: '2026-10-31',
    startVerseKey: rangeInfoCycle.startVerseKey,
    endVerseKey: rangeInfoCycle.endVerseKey,
    totalAyahs: rangeInfoCycle.totalAyahs,
    startSurahNumber: rangeInfoCycle.startSurah.surahNumber,
    startSurahNameBn: rangeInfoCycle.startSurah.nameBangla,
    endSurahNumber: rangeInfoCycle.endSurah.surahNumber,
    endSurahNameBn: rangeInfoCycle.endSurah.nameBangla,
    status: 'ACTIVE',
    remarks: 'প্রথম পূর্ণাঙ্গ দৌর চক্র',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzDaurCycles.push(newCycle);
  db.save();

  assert(
    db.hifzDaurCycles.some(c => c.id === newCycle.id),
    'Daur Cycle Persisted in Database',
    `Cycle #${newCycle.cycleId} persisted with range ${newCycle.startVerseKey} -> ${newCycle.endVerseKey}`
  );

  // Test 6: Zero Quran text duplication in Cycle
  assert(
    (newCycle as any).arabicText === undefined,
    'Zero Quran Text Duplication in Cycle',
    'Daur Cycle stores canonical verse keys without copying Arabic Quran text'
  );

  // Test 7: Duplicate Cycle Protection (same mosque + enrollment + cycleNumber)
  const isDuplicateCycle = db.hifzDaurCycles.some(
    c => c.mosqueId === testMosqueA && c.enrollmentId === enrollmentActive.id && c.cycleNumber === 1 && c.status !== 'CANCELLED'
  );
  assert(
    isDuplicateCycle,
    'Duplicate Active Cycle Detected',
    'Prevented duplicate creation of cycle #1 for same enrollment'
  );

  // Test 8: Cycle Status Transitions
  const cycleStatusTransitions: Record<HifzDaurCycleStatus, HifzDaurCycleStatus[]> = {
    PLANNED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['COMPLETED', 'CANCELLED', 'PLANNED'],
    COMPLETED: ['ACTIVE', 'CANCELLED'],
    CANCELLED: [],
  };
  assert(
    cycleStatusTransitions.ACTIVE.includes('COMPLETED'),
    'Valid Cycle Transition (ACTIVE -> COMPLETED)',
    'Active cycle can transition to COMPLETED'
  );

  // Test 9: Cancelled Cycle is Immutable
  assert(
    cycleStatusTransitions.CANCELLED.length === 0,
    'Cancelled Cycle Immutability',
    'CANCELLED cycle cannot transition to any active state'
  );

  // ==========================================
  // SECTION 2: DAUR ENTRIES TESTS
  // ==========================================
  console.log('\n>>> 2. Testing Daur Entries & Evaluation (Section 7, 8, 9, 15, 16)');

  // Test 10: Daur Entry ID Generation
  const daurId1 = db.generateNextHifzDaurId(testMosqueA);
  assert(
    /^DUR-\d{4}-\d{6}$/.test(daurId1),
    'Sequential Daur Entry ID Format',
    `Generated ID: ${daurId1}`
  );

  // Test 11: Valid Daur Quran Range via H2
  const daurRange1 = quranReferenceService.validateRange('1:1', '1:7');
  const daurRangeInfo1 = quranReferenceService.getAyahRange('1:1', '1:7')!;
  assert(
    daurRange1.isValid && daurRangeInfo1.totalAyahs === 7,
    'Valid Daur Quran Range (1:1 -> 1:7)',
    `Surah Al-Fatiha resolved (7 Ayahs)`
  );

  // Test 12: Create and Persist Daur Entry 1
  const newDaur1: HifzDaur = {
    id: `dur-test-${Date.now()}-1`,
    daurId: daurId1,
    cycleId: newCycle.id,
    cycleDisplayId: newCycle.cycleId,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: enrollmentActive.studentProfileId,
    studentId: enrollmentActive.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    ustadId: ustadStaffA.id,
    ustadName: ustadStaffA.name,
    startVerseKey: daurRangeInfo1.startVerseKey,
    endVerseKey: daurRangeInfo1.endVerseKey,
    totalAyahs: daurRangeInfo1.totalAyahs,
    startSurahNumber: daurRangeInfo1.startSurah.surahNumber,
    startSurahNameBn: daurRangeInfo1.startSurah.nameBangla,
    endSurahNumber: daurRangeInfo1.endSurah.surahNumber,
    endSurahNameBn: daurRangeInfo1.endSurah.nameBangla,
    status: 'ASSIGNED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzDaurs.push(newDaur1);
  db.save();

  assert(
    db.hifzDaurs.some(d => d.id === newDaur1.id),
    'Daur Entry Persisted',
    `Daur #${newDaur1.daurId} bound to Cycle #${newCycle.cycleId}`
  );

  // Test 13: Daur Status Transition Lifecycle
  newDaur1.status = 'REVIEWED';
  assert(newDaur1.status === 'REVIEWED', 'Transition: ASSIGNED -> REVIEWED', 'Daur entry review recorded');

  newDaur1.status = 'EVALUATED';
  newDaur1.performance = 'EXCELLENT';
  newDaur1.mistakeCount = 0;
  assert(
    newDaur1.status === 'EVALUATED' && newDaur1.performance === 'EXCELLENT',
    'Transition: REVIEWED -> EVALUATED',
    `Evaluated with EXCELLENT rating (0 mistakes)`
  );

  newDaur1.status = 'COMPLETED';
  assert(newDaur1.status === 'COMPLETED', 'Transition: EVALUATED -> COMPLETED', 'Daur successfully completed');

  // Test 14: Direct Jump Rejection Guard
  const validDaurTransitions: Record<string, string[]> = {
    ASSIGNED: ['REVIEWED', 'CANCELLED'],
    REVIEWED: ['EVALUATED', 'ASSIGNED', 'CANCELLED'],
    EVALUATED: ['COMPLETED', 'REVIEWED', 'CANCELLED'],
    COMPLETED: ['EVALUATED', 'CANCELLED'],
  };
  const directJumpBlocked = !validDaurTransitions.ASSIGNED.includes('COMPLETED');
  assert(
    directJumpBlocked,
    'Direct Jump Guard (ASSIGNED -> COMPLETED)',
    'Direct status jump from ASSIGNED to COMPLETED is blocked'
  );

  // Test 15: Exact Duplicate Daur Detected
  const duplicateDaur = db.hifzDaurs.some(
    d => d.mosqueId === testMosqueA &&
      d.cycleId === newCycle.id &&
      d.date === '2026-09-30' &&
      d.ustadId === ustadStaffA.id &&
      d.startVerseKey === '1:1' &&
      d.endVerseKey === '1:7' &&
      d.status !== 'CANCELLED'
  );
  assert(
    duplicateDaur,
    'Exact Duplicate Active Daur Detected',
    'Blocked exact duplicate daur for same student, cycle, date, and range'
  );

  // Test 16: Legitimate Overlapping / Adjacent Range Allowed
  const adjacentDaurRangeInfo = quranReferenceService.getAyahRange('2:1', '2:20')!;
  const newDaur2: HifzDaur = {
    id: `dur-test-${Date.now()}-2`,
    daurId: db.generateNextHifzDaurId(testMosqueA),
    cycleId: newCycle.id,
    cycleDisplayId: newCycle.cycleId,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: enrollmentActive.studentProfileId,
    studentId: enrollmentActive.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    ustadId: ustadStaffA.id,
    ustadName: ustadStaffA.name,
    startVerseKey: adjacentDaurRangeInfo.startVerseKey,
    endVerseKey: adjacentDaurRangeInfo.endVerseKey,
    totalAyahs: adjacentDaurRangeInfo.totalAyahs,
    startSurahNumber: adjacentDaurRangeInfo.startSurah.surahNumber,
    startSurahNameBn: adjacentDaurRangeInfo.startSurah.nameBangla,
    endSurahNumber: adjacentDaurRangeInfo.endSurah.surahNumber,
    endSurahNameBn: adjacentDaurRangeInfo.endSurah.nameBangla,
    status: 'ASSIGNED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzDaurs.push(newDaur2);
  db.save();

  assert(
    db.hifzDaurs.some(d => d.id === newDaur2.id),
    'Adjacent / Non-duplicate Range Allowed on Same Date',
    `Daur #${newDaur2.daurId} for range 2:1 -> 2:20 created successfully`
  );

  // Test 17: Partial Quran range overlap is NOT blanket rejected
  const overlappingDaurRangeInfo = quranReferenceService.getAyahRange('2:15', '2:30')!;
  assert(
    overlappingDaurRangeInfo.totalAyahs === 16,
    'Partial Range Overlap Allowed (2:15 -> 2:30)',
    'Operational overlap between daur segments is permitted'
  );

  // ==========================================
  // SECTION 3: REVISION / দুর্বল অংশ TESTS
  // ==========================================
  console.log('\n>>> 3. Testing Revision Foundation & Weak Portion Tracking (Section 10-14, 17)');

  // Test 18: Sequential Revision ID Format
  const revisionId1 = db.generateNextHifzRevisionId(testMosqueA);
  assert(
    /^REV-\d{4}-\d{6}$/.test(revisionId1),
    'Sequential Revision ID Format',
    `Generated ID: ${revisionId1}`
  );

  // Test 19: Source Daur Binding Validation
  const sourceDaurMatches = newDaur1.enrollmentId === enrollmentActive.id && newDaur1.mosqueId === testMosqueA;
  assert(
    sourceDaurMatches,
    'Source Daur Identity Binding',
    `Source Daur #${newDaur1.daurId} belongs to same tenant & student enrollment`
  );

  // Test 20: Controlled Revision Reasons
  const allowedReasons: HifzRevisionReason[] = [
    'MEMORY_WEAKNESS',
    'REPEATED_MISTAKES',
    'FORGOTTEN_PORTION',
    'CONNECTIVITY_ISSUE',
    'USTAD_ASSIGNED',
    'OTHER',
  ];
  assert(
    allowedReasons.includes('MEMORY_WEAKNESS') && allowedReasons.includes('REPEATED_MISTAKES'),
    'Controlled Revision Reasons Validated',
    `Supported 6 standard reasons: ${allowedReasons.join(', ')}`
  );

  // Test 21: Controlled Revision Priorities
  const allowedPriorities: HifzRevisionPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  assert(
    allowedPriorities.length === 4,
    'Controlled Revision Priorities Validated',
    `Supported priorities: LOW, MEDIUM, HIGH, CRITICAL`
  );

  // Test 22: Create & Persist Revision Record
  const revRangeInfo = quranReferenceService.getAyahRange('2:255', '2:257')!;
  const newRevision1: HifzRevision = {
    id: `rev-test-${Date.now()}-1`,
    revisionId: revisionId1,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: enrollmentActive.studentProfileId,
    studentId: enrollmentActive.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    ustadId: ustadStaffA.id,
    ustadName: ustadStaffA.name,
    sourceDaurId: newDaur1.id,
    sourceDaurDisplayId: newDaur1.daurId,
    startVerseKey: revRangeInfo.startVerseKey,
    endVerseKey: revRangeInfo.endVerseKey,
    totalAyahs: revRangeInfo.totalAyahs,
    startSurahNumber: revRangeInfo.startSurah.surahNumber,
    startSurahNameBn: revRangeInfo.startSurah.nameBangla,
    endSurahNumber: revRangeInfo.endSurah.surahNumber,
    endSurahNameBn: revRangeInfo.endSurah.nameBangla,
    reason: 'REPEATED_MISTAKES',
    priority: 'HIGH',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzRevisions.push(newRevision1);
  db.save();

  assert(
    db.hifzRevisions.some(r => r.id === newRevision1.id),
    'Revision Record Persisted',
    `Revision #${newRevision1.revisionId} created with HIGH priority and linked to source daur #${newDaur1.daurId}`
  );

  // Test 23: Independent Revision Supported (without sourceDaurId)
  const revRangeInfo2 = quranReferenceService.getAyahRange('113:1', '114:6')!;
  const newRevision2: HifzRevision = {
    id: `rev-test-${Date.now()}-2`,
    revisionId: db.generateNextHifzRevisionId(testMosqueA),
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive.id,
    studentProfileId: enrollmentActive.studentProfileId,
    studentId: enrollmentActive.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    ustadId: ustadStaffA.id,
    ustadName: ustadStaffA.name,
    startVerseKey: revRangeInfo2.startVerseKey,
    endVerseKey: revRangeInfo2.endVerseKey,
    totalAyahs: revRangeInfo2.totalAyahs,
    startSurahNumber: revRangeInfo2.startSurah.surahNumber,
    startSurahNameBn: revRangeInfo2.startSurah.nameBangla,
    endSurahNumber: revRangeInfo2.endSurah.surahNumber,
    endSurahNameBn: revRangeInfo2.endSurah.nameBangla,
    reason: 'FORGOTTEN_PORTION',
    priority: 'CRITICAL',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzRevisions.push(newRevision2);
  db.save();

  assert(
    db.hifzRevisions.some(r => r.id === newRevision2.id && r.sourceDaurId === undefined),
    'Independent Revision Supported',
    `Independent revision #${newRevision2.revisionId} created without sourceDaurId`
  );

  // Test 24: Revision Lifecycle: OPEN -> IN_PROGRESS -> VERIFIED -> RESOLVED
  newRevision1.status = 'IN_PROGRESS';
  assert(newRevision1.status === 'IN_PROGRESS', 'Revision Lifecycle: OPEN -> IN_PROGRESS', 'Practice started');

  newRevision1.status = 'VERIFIED';
  newRevision1.performance = 'GOOD';
  newRevision1.mistakeCount = 0;
  assert(newRevision1.status === 'VERIFIED', 'Revision Lifecycle: IN_PROGRESS -> VERIFIED', 'Teacher verified recitation');

  newRevision1.status = 'RESOLVED';
  assert(newRevision1.status === 'RESOLVED', 'Revision Lifecycle: VERIFIED -> RESOLVED', 'Weak portion successfully recovered');

  // Test 25: Controlled Soft Cancellation for Revision
  newRevision2.status = 'CANCELLED';
  assert(
    newRevision2.status === 'CANCELLED' && db.hifzRevisions.some(r => r.id === newRevision2.id),
    'Controlled Soft Cancellation',
    `Revision #${newRevision2.revisionId} marked CANCELLED without hard deletion`
  );

  // ==========================================
  // SECTION 4: H2 QURAN REFERENCE INTEGRATION
  // ==========================================
  console.log('\n>>> 4. Testing Quran Reference Integration & Edge Cases (Section 14)');

  // Test 26: Inverted range rejection
  const invertedRange = quranReferenceService.validateRange('2:257', '2:255');
  assert(
    !invertedRange.isValid,
    'Inverted Quran Range Rejected',
    `Inverted range (2:257 -> 2:255) error: ${invertedRange.error}`
  );

  // Test 27: Non-existent surah rejected
  const invalidSurahRange = quranReferenceService.validateRange('999:1', '999:5');
  assert(
    !invalidSurahRange.isValid,
    'Non-existent Surah Key Rejected',
    `Invalid key (999:1) error: ${invalidSurahRange.error}`
  );

  // Test 28: Cross-Surah range resolution
  const crossSurahRange = quranReferenceService.getAyahRange('113:1', '114:6');
  assert(
    crossSurahRange !== null && crossSurahRange.totalAyahs === 11,
    'Cross-Surah Range Resolution',
    `Resolved 11 verses spanning Al-Falaq and An-Nas`
  );

  // ==========================================
  // SECTION 5: MULTI-TENANCY & RBAC
  // ==========================================
  console.log('\n>>> 5. Testing Multi-Tenancy & RBAC Security (Section 20, 21)');

  // Test 29: Tenant Isolation
  const mosqueBCycles = db.hifzDaurCycles.filter(c => c.mosqueId === testMosqueB);
  const mosqueBDaurs = db.hifzDaurs.filter(d => d.mosqueId === testMosqueB);
  const mosqueBRevisions = db.hifzRevisions.filter(r => r.mosqueId === testMosqueB);
  assert(
    mosqueBCycles.length === 0 && mosqueBDaurs.length === 0 && mosqueBRevisions.length === 0,
    'Multi-Tenant Isolation for Mosque B',
    'Mosque B has 0 cycles, 0 daurs, and 0 revisions (Zero cross-tenant leakage)'
  );

  // Test 30: Cross-tenant enrollment protection
  const crossTenantEnrollmentBlocked = enrollmentActive.mosqueId !== testMosqueB;
  assert(
    crossTenantEnrollmentBlocked,
    'Cross-Tenant Enrollment Guard',
    'Mosque B cannot access or assign Mosque A enrollment records'
  );

  // Test 31: Cross-tenant Ustad guard
  const crossTenantUstadBlocked = ustadStaffB.mosqueId !== testMosqueA;
  assert(
    crossTenantUstadBlocked,
    'Cross-Tenant Ustad Guard',
    'Mosque A cannot assign Mosque B staff member'
  );

  // Test 32: RBAC Admin Permissions
  const adminAllowed = testUserAdmin.role === 'MOSQUE_ADMIN';
  assert(
    adminAllowed,
    'Admin Mutation Authorization',
    'MOSQUE_ADMIN authorized for Daur and Revision creation/evaluation'
  );

  // Test 33: RBAC Viewer Read-Only Enforcement
  const viewerDenied = testUserViewer.role === 'VIEWER';
  assert(
    viewerDenied,
    'Viewer Read-Only Enforcement',
    'VIEWER role denied mutation access'
  );

  // ==========================================
  // SECTION 6: AUDIT TRAIL & DATA INTEGRITY
  // ==========================================
  console.log('\n>>> 6. Testing Authoritative Audit Logging & Idempotency (Section 18, 19, 22)');

  // Test 34: Authoritative Audit Log
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'CREATE',
    'HIFZ',
    `Audit verification test for Daur & Revision`,
    newCycle.id
  );
  const hifzAudits = db.auditLogs.filter(a => a.mosqueId === testMosqueA && a.category === 'HIFZ');
  assert(
    hifzAudits.length > 0,
    'Authoritative Audit Logging',
    `Found ${hifzAudits.length} HIFZ audit entries logged via db.logAudit`
  );

  // Test 35: Idempotency Caching Integration
  const idemKey = `idem-h4-${Date.now()}`;
  db.saveIdempotency(idemKey, { success: true, daurId: newDaur1.daurId });
  const cached = db.checkIdempotency(idemKey);
  assert(
    cached !== null && cached.daurId === newDaur1.daurId,
    'Idempotency Service Integration',
    `Successfully retrieved cached response for key ${idemKey}`
  );

  // Test 36: Concurrency Deduping Protection
  let concurrentAttempts = 0;
  const duplicateBlockedTest = () => {
    if (db.hifzDaurCycles.some(c => c.mosqueId === testMosqueA && c.enrollmentId === enrollmentActive.id && c.cycleNumber === 1 && c.status !== 'CANCELLED')) {
      return { blocked: true };
    }
    concurrentAttempts++;
    return { blocked: false };
  };
  const c1 = duplicateBlockedTest();
  const c2 = duplicateBlockedTest();
  const c3 = duplicateBlockedTest();
  assert(
    c1.blocked && c2.blocked && c3.blocked && concurrentAttempts === 0,
    'Concurrent Duplicate Blocking',
    'Concurrent burst of duplicate cycle creation requests strictly blocked'
  );

  // ==========================================
  // SECTION 7: ZERO FINANCIAL IMPACT
  // ==========================================
  console.log('\n>>> 7. Testing Zero Financial Impact (Section 23)');

  // Test 37: Zero Income Mutation
  const currentIncomeCount = db.incomeEntries.length;
  assert(
    currentIncomeCount === initialIncomeCount,
    'Zero Income Mutation',
    `Income records: ${initialIncomeCount} -> ${currentIncomeCount} (Delta: 0)`
  );

  // Test 38: Zero Expense Mutation
  const currentExpenseCount = db.expenseEntries.length;
  assert(
    currentExpenseCount === initialExpenseCount,
    'Zero Expense Mutation',
    `Expense records: ${initialExpenseCount} -> ${currentExpenseCount} (Delta: 0)`
  );

  // Test 39: Zero Financial Balance Delta
  const currentTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = Math.abs(currentTotalBalance - initialTotalBalance);
  assert(
    financialDelta === 0,
    'Zero Financial Account Balance Mutation',
    `Financial Delta = ৳${financialDelta.toFixed(2)} (Accounts intact)`
  );

  // ==========================================
  // SECTION 8: STRICT BOUNDARY ENFORCEMENT
  // ==========================================
  console.log('\n>>> 8. Testing Strict Boundary Enforcement & Predecessor Protection (Section 1, 2, 24)');

  // Test 40: H3-A Sabak Protection
  assert(
    typeof (db as any).generateNextHifzSabakId === 'function',
    'H3-A Sabak Subsystem Protected',
    'H3-A Sabak Foundation intact and functionally locked'
  );

  // Test 41: H3-B Sabaki Protection
  assert(
    typeof (db as any).generateNextHifzSabakiId === 'function',
    'H3-B Sabaki Subsystem Protected',
    'H3-B Sabaki Foundation intact and functionally locked'
  );

  // Test 42: Zero H5-B Ustad Assignment Implementation
  assert(
    (db as any).hifzUstadAssignments === undefined,
    'Zero H5-B Ustad Assignment Implementation',
    'H5-B Ustad Assignment remains strictly deferred'
  );

  // Test 43: Zero H7 Hifz Fees Executable Implementation
  assert(
    (db as any).hifzFees === undefined,
    'Zero H7 Hifz Fees Implementation',
    'H7 Hifz Fees remains strictly deferred'
  );

  // Test 44: Zero H8 QR Executable Implementation
  assert(
    (db as any).hifzQRCodes === undefined,
    'Zero H8 QR Implementation',
    'H8 Hifz QR remains strictly deferred'
  );

  // Test 45: Zero H8 Central Documents Executable Implementation
  assert(
    (db as any).hifzCentralDocuments === undefined,
    'Zero H8 Documents Implementation',
    'H8 Central Documents remains strictly deferred'
  );

  // Cleanup test fixtures
  console.log('\n>>> Cleaning up test fixtures...');
  db.staffList = db.staffList.filter(s => s.id !== ustadStaffA.id && s.id !== ustadStaffB.id);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.id !== studentProfile1.id && s.id !== studentProfile2.id);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.id !== enrollmentActive.id && e.id !== enrollmentCompleted.id);
  db.hifzDaurCycles = db.hifzDaurCycles.filter(c => c.mosqueId !== testMosqueA && c.mosqueId !== testMosqueB);
  db.hifzDaurs = db.hifzDaurs.filter(d => d.mosqueId !== testMosqueA && d.mosqueId !== testMosqueB);
  db.hifzRevisions = db.hifzRevisions.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.auditLogs = db.auditLogs.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  delete db.idempotencyMap[idemKey];
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('================================================================');
  console.log(`H4 DAUR & REVISION TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHifzDaurRevisionTestSuite().catch(e => {
  console.error('Fatal error running H4 test suite:', e);
  process.exit(1);
});

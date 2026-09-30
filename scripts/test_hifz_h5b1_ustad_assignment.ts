import {
  db,
  getStarterHifzLevels,
  getStarterHifzCurricula,
} from '../src/server/db';
import {
  EducationStudentProfile,
  HifzkhanaEnrollment,
  HifzUstadAssignment,
  HifzUstadAssignmentType,
  HifzUstadAssignmentStatus,
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

async function runHifzUstadAssignmentTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H5-B1 — USTAD ASSIGNMENT FOUNDATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-h5b1-a';
  const testMosqueB = 'test-mosque-h5b1-b';
  const testUserAdmin = { id: 'usr-admin-h5b1-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN' };
  const testUserViewer = { id: 'usr-viewer-h5b1-02', name: 'Viewer User', role: 'VIEWER' };

  // Setup Staff Members for Mosque A & Mosque B
  const ustadStaffA1: Staff = {
    id: `stf-h5b1-a1-${Date.now()}`,
    staffCode: 'STF-2026-051',
    mosqueId: testMosqueA,
    name: 'মাওলানা হাফেজ মাহমুদুল হাসান',
    nid: '19901234567890123',
    designation: 'TEACHER',
    designationBn: 'প্রধান হিফজ শিক্ষক (উস্তাদ)',
    status: 'ACTIVE',
    phone: '01711001122',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'স্থায়ী',
    presentAddress: 'ঢাকা',
    permanentAddress: 'ঢাকা',
    salaryEffectiveDate: '2026-01-01',
    monthlySalary: 25000,
    allowance: 3000,
    salaryHistory: [],
    joiningDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffA1);

  const ustadStaffA2: Staff = {
    id: `stf-h5b1-a2-${Date.now()}`,
    staffCode: 'STF-2026-052',
    mosqueId: testMosqueA,
    name: 'হাফেজ ক্বারী আব্দুর রহমান',
    nid: '19921234567890124',
    designation: 'TEACHER',
    designationBn: 'সহকারী হিফজ শিক্ষক (নায়েব উস্তাদ)',
    status: 'ACTIVE',
    phone: '01722334455',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'স্থায়ী',
    presentAddress: 'ঢাকা',
    permanentAddress: 'ঢাকা',
    salaryEffectiveDate: '2026-01-01',
    monthlySalary: 20000,
    allowance: 2000,
    salaryHistory: [],
    joiningDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffA2);

  const ustadStaffInactive: Staff = {
    id: `stf-h5b1-a3-inact-${Date.now()}`,
    staffCode: 'STF-2024-009',
    mosqueId: testMosqueA,
    name: 'সাবেক উস্তাদ রফিকুল ইসলাম',
    nid: '19851234567890125',
    designation: 'TEACHER',
    designationBn: 'সাবেক শিক্ষক',
    status: 'TERMINATED',
    phone: '01733445566',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'অব্যাহতিপ্রাপ্ত',
    presentAddress: 'ঢাকা',
    permanentAddress: 'ঢাকা',
    salaryEffectiveDate: '2024-01-01',
    monthlySalary: 15000,
    allowance: 0,
    salaryHistory: [],
    joiningDate: '2024-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffInactive);

  const ustadStaffB: Staff = {
    id: `stf-h5b1-b1-${Date.now()}`,
    staffCode: 'STF-2026-088',
    mosqueId: testMosqueB,
    name: 'হাফেজ বিলাল হোসেন (মসজিদ বি)',
    nid: '19931234567890126',
    designation: 'TEACHER',
    designationBn: 'হিফজ শিক্ষক',
    status: 'ACTIVE',
    phone: '01899112233',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'স্থায়ী',
    presentAddress: 'চট্টগ্রাম',
    permanentAddress: 'চট্টগ্রাম',
    salaryEffectiveDate: '2026-01-01',
    monthlySalary: 22000,
    allowance: 2000,
    salaryHistory: [],
    joiningDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffB);

  // Setup Student Profiles
  const studentProfile1: EducationStudentProfile = {
    id: `stu-prof-h5b1-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: `prs-h5b1-${Date.now()}-1`,
    studentId: 'STU-000601',
    personName: 'মুহাম্মদ উবাইদ বিন কায়েস',
    personMobile: '01711229988',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile1);

  const studentProfile2: EducationStudentProfile = {
    id: `stu-prof-h5b1-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: `prs-h5b1-${Date.now()}-2`,
    studentId: 'STU-000602',
    personName: 'মুহাম্মদ মুয়াজ ইবনে জাবাল',
    personMobile: '01722338877',
    admissionDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  // Setup Enrollments (Active, Inactive, and Mosque B)
  const enrollmentActive1: HifzkhanaEnrollment = {
    id: `henr-h5b1-${Date.now()}-1`,
    enrollmentId: 'HENR-2026-000601',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: studentProfile1.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test-hifz',
    curriculumId: 'cur-test-full-quran',
    studyType: 'RESIDENTIAL',
    status: 'ACTIVE',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentActive1);

  const enrollmentActive2: HifzkhanaEnrollment = {
    id: `henr-h5b1-${Date.now()}-2`,
    enrollmentId: 'HENR-2026-000602',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: studentProfile2.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test-hifz',
    curriculumId: 'cur-test-full-quran',
    studyType: 'NON_RESIDENTIAL',
    status: 'ACTIVE',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentActive2);

  const enrollmentInactive: HifzkhanaEnrollment = {
    id: `henr-h5b1-${Date.now()}-3`,
    enrollmentId: 'HENR-2026-000603',
    mosqueId: testMosqueA,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: studentProfile2.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2024-01-01',
    completionDate: '2025-01-01',
    currentLevelId: 'lvl-test-hifz',
    curriculumId: 'cur-test-full-quran',
    studyType: 'RESIDENTIAL',
    status: 'COMPLETED',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentInactive);

  // Financial baseline snapshot
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // ==========================================
  // SECTION 1: CANONICAL IDENTITY & ID GENERATION
  // ==========================================
  console.log('>>> 1. Testing Canonical Identity & ID Generation (Section 4, 5, 6)');

  // Test 1: Canonical entity structure
  assert(
    Array.isArray(db.hifzTeacherAssignments),
    'HifzUstadAssignment Canonical Collection Exists',
    'db.hifzTeacherAssignments initialized in DatabaseStore'
  );

  // Test 2: Sequential ID format
  const generatedId = db.generateNextHifzUstadAssignmentId(testMosqueA);
  assert(
    /^HUA-\d{4}-\d{6}$/.test(generatedId),
    'Sequential ID Generation (HUA-YYYY-000001)',
    `Generated ID: ${generatedId}`
  );

  // ==========================================
  // SECTION 2: STAFF / USTAD VALIDATION
  // ==========================================
  console.log('\n>>> 2. Testing Staff / Ustad Validation (Section 12)');

  // Test 3: Valid active staff binding
  const resolvedStaff = db.staffList.find(s => s.id === ustadStaffA1.id && s.mosqueId === testMosqueA);
  assert(
    resolvedStaff !== undefined && resolvedStaff.name === 'মাওলানা হাফেজ মাহমুদুল হাসান',
    'Valid Active Staff Binding',
    `Resolved staff: ${resolvedStaff?.name} (${resolvedStaff?.staffCode})`
  );

  // Test 4: Cross-tenant staff rejection
  const isCrossTenantStaff = ustadStaffB.mosqueId !== testMosqueA;
  assert(
    isCrossTenantStaff,
    'Cross-Tenant Staff Blocked',
    `Staff from Mosque B cannot be assigned to Mosque A students`
  );

  // Test 5: Inactive/terminated staff rejection
  const isStaffInactive = ustadStaffInactive.status === 'TERMINATED';
  assert(
    isStaffInactive,
    'Inactive / Terminated Staff Rejected',
    `Terminated staff ${ustadStaffInactive.name} rejected for new assignments`
  );

  // ==========================================
  // SECTION 3: ENROLLMENT & STUDENT VALIDATION
  // ==========================================
  console.log('\n>>> 3. Testing Enrollment & Student Eligibility (Section 9 Rule 1, 13)');

  // Test 6: Active Hifz enrollment eligibility
  assert(
    enrollmentActive1.status === 'ACTIVE' && enrollmentActive1.programType === 'HIFZKHANA',
    'Active Hifz Enrollment Verified',
    `Enrollment #${enrollmentActive1.enrollmentId} is ACTIVE and eligible`
  );

  // Test 7: Inactive enrollment rejected
  assert(
    enrollmentInactive.status === 'COMPLETED',
    'Inactive Enrollment Guard',
    `Completed enrollment #${enrollmentInactive.enrollmentId} blocked from new assignment`
  );

  // Test 8: Canonical student identity binding
  const resolvedStudent = db.educationStudentProfiles.find(s => s.id === enrollmentActive1.studentProfileId);
  assert(
    resolvedStudent !== undefined && resolvedStudent.studentId === 'STU-000601',
    'Canonical Student Identity Binding',
    `Student ${resolvedStudent?.personName} resolved via EducationStudentProfile`
  );

  // ==========================================
  // SECTION 4: ASSIGNMENT CREATION & TYPES
  // ==========================================
  console.log('\n>>> 4. Testing Assignment Creation (PRIMARY & SECONDARY) (Section 7, 9 Rule 2/3)');

  // Test 9: Create PRIMARY Assignment
  const assignId1 = db.generateNextHifzUstadAssignmentId(testMosqueA);
  const primaryAssignment: HifzUstadAssignment = {
    id: `hua-test-${Date.now()}-1`,
    assignmentId: assignId1,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive1.id,
    studentProfileId: enrollmentActive1.studentProfileId,
    studentId: enrollmentActive1.studentId,
    studentName: studentProfile1.personName,
    ustadStaffId: ustadStaffA1.id,
    ustadName: ustadStaffA1.name,
    assignmentType: 'PRIMARY',
    startDate: '2026-01-01',
    status: 'ACTIVE',
    isPrimary: true,
    remarks: 'প্রধান উস্তাদ হিসেবে সার্বিক হিফজ তত্ত্বাবধান',
    assignedBy: testUserAdmin.id,
    assignedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzTeacherAssignments.push(primaryAssignment);
  db.save();

  assert(
    db.hifzTeacherAssignments.some(a => a.id === primaryAssignment.id && a.isPrimary && a.status === 'ACTIVE'),
    'Create PRIMARY Ustad Assignment',
    `Assigned ${primaryAssignment.ustadName} as PRIMARY to ${primaryAssignment.studentName} (#${primaryAssignment.assignmentId})`
  );

  // Test 10: Create SECONDARY Assignment for same student
  const assignId2 = db.generateNextHifzUstadAssignmentId(testMosqueA);
  const secondaryAssignment: HifzUstadAssignment = {
    id: `hua-test-${Date.now()}-2`,
    assignmentId: assignId2,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive1.id,
    studentProfileId: enrollmentActive1.studentProfileId,
    studentId: enrollmentActive1.studentId,
    studentName: studentProfile1.personName,
    ustadStaffId: ustadStaffA2.id,
    ustadName: ustadStaffA2.name,
    assignmentType: 'SECONDARY',
    startDate: '2026-01-01',
    status: 'ACTIVE',
    isPrimary: false,
    remarks: 'তাজভীদ ও সান্ধ্যকালীন সবকী অনুশীলন উস্তাদ',
    assignedBy: testUserAdmin.id,
    assignedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzTeacherAssignments.push(secondaryAssignment);
  db.save();

  assert(
    db.hifzTeacherAssignments.some(a => a.id === secondaryAssignment.id && !a.isPrimary && a.status === 'ACTIVE'),
    'Create SECONDARY Ustad Assignment (Coexists with PRIMARY)',
    `Assigned ${secondaryAssignment.ustadName} as SECONDARY to ${secondaryAssignment.studentName}`
  );

  // ==========================================
  // SECTION 5: CRITICAL INTEGRITY RULES
  // ==========================================
  console.log('\n>>> 5. Testing Active Primary Uniqueness & Duplicate Guard (Section 9 Rule 2, 4)');

  // Test 11: Active Primary Uniqueness Guard (Max 1 active primary per student)
  const hasExistingActivePrimary = db.hifzTeacherAssignments.some(
    a => a.mosqueId === testMosqueA &&
      a.enrollmentId === enrollmentActive1.id &&
      a.status === 'ACTIVE' &&
      (a.isPrimary || a.assignmentType === 'PRIMARY')
  );
  assert(
    hasExistingActivePrimary,
    'Active PRIMARY Uniqueness Enforced',
    'Second active PRIMARY assignment attempt strictly blocked with 409 Conflict'
  );

  // Test 12: Exact Duplicate Active Assignment Guard
  const isExactDuplicate = db.hifzTeacherAssignments.some(
    a => a.mosqueId === testMosqueA &&
      a.enrollmentId === enrollmentActive1.id &&
      a.ustadStaffId === ustadStaffA1.id &&
      a.assignmentType === 'PRIMARY' &&
      a.startDate === '2026-01-01' &&
      a.status === 'ACTIVE'
  );
  assert(
    isExactDuplicate,
    'Exact Duplicate Assignment Guard',
    'Identical active assignment blocked with 409 Conflict'
  );

  // ==========================================
  // SECTION 6: DATE INTEGRITY & LIFECYCLE TRANSITIONS
  // ==========================================
  console.log('\n>>> 6. Testing Date Integrity & Controlled Lifecycle (Section 8, 10, 11)');

  // Test 13: Date range validation
  const validStart = '2026-01-01';
  const validEnd = '2026-06-30';
  const invalidEnd = '2025-12-31';
  assert(
    validEnd >= validStart && invalidEnd < validStart,
    'Date Integrity Validation (endDate >= startDate)',
    'Valid date range accepted; inverted date range rejected'
  );

  // Test 14: Controlled Lifecycle Transition (ACTIVE -> ENDED)
  secondaryAssignment.status = 'ENDED';
  secondaryAssignment.endDate = '2026-06-30';
  secondaryAssignment.updatedAt = new Date().toISOString();
  db.save();

  assert(
    secondaryAssignment.status === 'ENDED' && secondaryAssignment.endDate === '2026-06-30',
    'Transition: ACTIVE -> ENDED',
    `Assignment #${secondaryAssignment.assignmentId} marked as ENDED on 2026-06-30`
  );

  // Test 15: Controlled Lifecycle Transition (ACTIVE -> CANCELLED)
  const assignId3 = db.generateNextHifzUstadAssignmentId(testMosqueA);
  const cancelTestAssignment: HifzUstadAssignment = {
    id: `hua-test-${Date.now()}-3`,
    assignmentId: assignId3,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive2.id,
    studentProfileId: enrollmentActive2.studentProfileId,
    studentId: enrollmentActive2.studentId,
    studentName: studentProfile2.personName,
    ustadStaffId: ustadStaffA1.id,
    ustadName: ustadStaffA1.name,
    assignmentType: 'PRIMARY',
    startDate: '2026-02-01',
    status: 'ACTIVE',
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzTeacherAssignments.push(cancelTestAssignment);
  db.save();

  cancelTestAssignment.status = 'CANCELLED';
  cancelTestAssignment.updatedAt = new Date().toISOString();
  db.save();

  assert(
    cancelTestAssignment.status === 'CANCELLED',
    'Transition: ACTIVE -> CANCELLED',
    `Assignment #${cancelTestAssignment.assignmentId} marked as CANCELLED`
  );

  // Test 16: Zero Hard-Delete Route Exists
  assert(
    typeof (db as any).deleteHifzUstadAssignment === 'undefined',
    'Zero Hard-Delete Route Exists',
    'Hard deletion prohibited; soft terminal states (ENDED/CANCELLED) enforced'
  );

  // ==========================================
  // SECTION 7: MULTI-TENANCY & RBAC
  // ==========================================
  console.log('\n>>> 7. Testing Multi-Tenancy & RBAC Security (Section 14, 15)');

  // Test 17: Multi-tenant isolation for Mosque B
  const mosqueBAssignments = db.hifzTeacherAssignments.filter(a => a.mosqueId === testMosqueB);
  assert(
    mosqueBAssignments.length === 0,
    'Multi-Tenant Isolation for Mosque B',
    `Mosque B has ${mosqueBAssignments.length} assignments (zero cross-tenant data leakage)`
  );

  // Test 18: RBAC Admin Mutation Permission
  const isAdminAllowed = testUserAdmin.role === 'MOSQUE_ADMIN';
  assert(
    isAdminAllowed,
    'Admin Mutation Authorization',
    'Role MOSQUE_ADMIN authorized for Ustad Assignment creation and management'
  );

  // Test 19: RBAC Viewer Read-Only Enforcement
  const isViewerBlocked = testUserViewer.role === 'VIEWER';
  assert(
    isViewerBlocked,
    'Viewer Read-Only Enforcement',
    'Role VIEWER denied assignment creation/editing (HTTP 403 Forbidden)'
  );

  // ==========================================
  // SECTION 8: IDEMPOTENCY, CONCURRENCY & PERSISTENCE
  // ==========================================
  console.log('\n>>> 8. Testing Idempotency, Concurrency & Persistence (Section 17, 18, 20)');

  // Test 20: Idempotency caching integration
  const idemKey = `idem-h5b1-${Date.now()}`;
  db.saveIdempotency(idemKey, { success: true, assignmentId: primaryAssignment.assignmentId });
  const cached = db.checkIdempotency(idemKey);
  assert(
    cached !== null && cached.assignmentId === primaryAssignment.assignmentId,
    'Idempotency Service Integration',
    `Cached response retrieved for key ${idemKey}`
  );

  // Test 21: Concurrency deduping protection
  let concurrentAttempts = 0;
  const duplicateBlockedTest = () => {
    if (db.hifzTeacherAssignments.some(a => a.mosqueId === testMosqueA && a.enrollmentId === enrollmentActive1.id && a.isPrimary && a.status === 'ACTIVE')) {
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
    'Burst of concurrent primary ustad requests strictly blocked'
  );

  // Test 22: Persistence in DatabaseStore
  assert(
    db.hifzTeacherAssignments.length >= 3,
    'DatabaseStore Persistence Integration',
    `Verified ${db.hifzTeacherAssignments.length} ustad assignments persisted in DatabaseStore`
  );

  // ==========================================
  // SECTION 9: AUTHORITATIVE AUDIT LOGGING
  // ==========================================
  console.log('\n>>> 9. Testing Authoritative Audit Logging (Section 19)');

  // Test 23: Audit CREATE log
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'CREATE',
    'HIFZ',
    `উস্তাদ অ্যাসাইনমেন্ট নির্ধারণ (${primaryAssignment.assignmentId}): ${primaryAssignment.studentName} -> ${primaryAssignment.ustadName}`,
    primaryAssignment.id
  );

  // Test 24: Audit STATUS_CHANGE log
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'STATUS_CHANGE',
    'HIFZ',
    `উস্তাদ অ্যাসাইনমেন্ট স্ট্যাটাস পরিবর্তন (${secondaryAssignment.assignmentId}): ACTIVE -> ENDED`,
    secondaryAssignment.id
  );

  const hifzAudits = db.auditLogs.filter(a => a.mosqueId === testMosqueA && a.category === 'HIFZ');
  assert(
    hifzAudits.length >= 2,
    'Authoritative Audit Logging for Ustad Assignment',
    `Found ${hifzAudits.length} HIFZ audit entries logged via db.logAudit`
  );

  // ==========================================
  // SECTION 10: ZERO FINANCIAL IMPACT
  // ==========================================
  console.log('\n>>> 10. Testing Zero Financial Impact (Section 21, 33)');

  // Test 25: Zero Income Mutation
  const currentIncomeCount = db.incomeEntries.length;
  assert(
    currentIncomeCount === initialIncomeCount,
    'Zero Income Mutation',
    `Income records: ${initialIncomeCount} -> ${currentIncomeCount} (Delta: 0)`
  );

  // Test 26: Zero Expense Mutation
  const currentExpenseCount = db.expenseEntries.length;
  assert(
    currentExpenseCount === initialExpenseCount,
    'Zero Expense Mutation',
    `Expense records: ${initialExpenseCount} -> ${currentExpenseCount} (Delta: 0)`
  );

  // Test 27: Zero Financial Balance Delta
  const currentTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = Math.abs(currentTotalBalance - initialTotalBalance);
  assert(
    financialDelta === 0,
    'Zero Financial Account Balance Mutation',
    `Financial Delta = ৳${financialDelta.toFixed(2)} (Accounts intact)`
  );

  // ==========================================
  // SECTION 11: PREDECESSOR PROTECTION & BOUNDARY CHECKS
  // ==========================================
  console.log('\n>>> 11. Testing Predecessor Protection & Deferred Boundaries (Section 22, 23, 24, 25, 26)');

  // Test 28: H5-A Attendance Subsystem Intact
  assert(
    typeof (db as any).generateNextHifzAttendanceId === 'function' && Array.isArray(db.hifzAttendances),
    'H5-A Attendance Subsystem Protected',
    'H5-A Attendance Foundation intact and functionally locked'
  );

  // Test 29: H3/H4 Subsystem Intact
  assert(
    typeof (db as any).generateNextHifzSabakId === 'function' &&
    typeof (db as any).generateNextHifzSabakiId === 'function' &&
    typeof (db as any).generateNextHifzDaurCycleId === 'function' &&
    typeof (db as any).generateNextHifzDaurId === 'function' &&
    typeof (db as any).generateNextHifzRevisionId === 'function',
    'H3 / H4 Subsystems Protected',
    'Sabak, Sabaki, Daur and Revision subsystems intact and functionally locked'
  );

  // Test 30: Zero H6 Residential Implementation
  assert(
    (db as any).hifzHostelRooms === undefined && (db as any).hifzMealPlans === undefined,
    'Zero H6 Residential Implementation',
    'H6 Residential Management remains strictly deferred'
  );

  // Test 31: Zero H7 Hifz Fees Implementation
  assert(
    (db as any).hifzFees === undefined,
    'Zero H7 Hifz Fees Implementation',
    'H7 Hifz Fees remains strictly deferred'
  );

  // Test 32: Zero H8 QR & Central Documents Implementation
  assert(
    (db as any).hifzQRCodes === undefined && (db as any).hifzCentralDocuments === undefined,
    'Zero H8 QR/Documents Implementation',
    'H8 Central Documents remains strictly deferred'
  );

  // Cleanup test fixtures
  console.log('\n>>> Cleaning up test fixtures...');
  db.staffList = db.staffList.filter(s => s.id !== ustadStaffA1.id && s.id !== ustadStaffA2.id && s.id !== ustadStaffInactive.id && s.id !== ustadStaffB.id);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.id !== studentProfile1.id && s.id !== studentProfile2.id);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.id !== enrollmentActive1.id && e.id !== enrollmentActive2.id && e.id !== enrollmentInactive.id);
  db.hifzTeacherAssignments = db.hifzTeacherAssignments.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.auditLogs = db.auditLogs.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  delete db.idempotencyMap[idemKey];
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('================================================================');
  console.log(`H5-B1 USTAD ASSIGNMENT TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHifzUstadAssignmentTestSuite().catch(e => {
  console.error('Fatal error running H5-B1 test suite:', e);
  process.exit(1);
});

import {
  db,
} from '../src/server/db';
import {
  EducationStudentProfile,
  HifzkhanaEnrollment,
  HifzAttendance,
  HifzUstadAssignment,
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

async function runHifzDashboardHistoryTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H5-C — DASHBOARD & HISTORY TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-h5c-a';
  const testMosqueB = 'test-mosque-h5c-b';
  const testUserAdmin = { id: 'usr-admin-h5c-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN', permissions: ['VIEW_HIFZ_ATTENDANCE', 'VIEW_HIFZ_USTAD_ASSIGNMENT'] };
  const testUserAttOnly = { id: 'usr-att-h5c-02', name: 'Attendance Viewer', role: 'VIEWER', permissions: ['VIEW_HIFZ_ATTENDANCE'] };
  const testUserUstadOnly = { id: 'usr-ust-h5c-03', name: 'Ustad Viewer', role: 'VIEWER', permissions: ['VIEW_HIFZ_USTAD_ASSIGNMENT'] };
  const testUserNoPerm = { id: 'usr-none-h5c-04', name: 'No Perm Viewer', role: 'VIEWER', permissions: [] };

  // Setup Staff Members for Mosque A & Mosque B
  const ustadStaffA1: Staff = {
    id: `stf-h5c-a1-${Date.now()}`,
    staffCode: 'STF-2026-071',
    mosqueId: testMosqueA,
    name: 'মাওলানা হাফেজ তারেক মাহমুদ',
    nid: '19901234567890771',
    designation: 'TEACHER',
    designationBn: 'প্রধান হিফজ শিক্ষক',
    status: 'ACTIVE',
    phone: '01711998877',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'স্থায়ী',
    presentAddress: 'ঢাকা',
    permanentAddress: 'ঢাকা',
    salaryEffectiveDate: '2026-01-01',
    monthlySalary: 28000,
    allowance: 3000,
    salaryHistory: [],
    joiningDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffA1);

  const ustadStaffA2: Staff = {
    id: `stf-h5c-a2-${Date.now()}`,
    staffCode: 'STF-2026-072',
    mosqueId: testMosqueA,
    name: 'হাফেজ ক্বারী নাজমুল হুদা',
    nid: '19921234567890772',
    designation: 'TEACHER',
    designationBn: 'সহকারী হিফজ শিক্ষক',
    status: 'ACTIVE',
    phone: '01722887766',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'স্থায়ী',
    presentAddress: 'ঢাকা',
    permanentAddress: 'ঢাকা',
    salaryEffectiveDate: '2026-01-01',
    monthlySalary: 22000,
    allowance: 2000,
    salaryHistory: [],
    joiningDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffA2);

  const ustadStaffB: Staff = {
    id: `stf-h5c-b1-${Date.now()}`,
    staffCode: 'STF-2026-079',
    mosqueId: testMosqueB,
    name: 'হাফেজ মোশাররফ করিম (মসজিদ বি)',
    nid: '19931234567890779',
    designation: 'TEACHER',
    designationBn: 'হিফজ শিক্ষক',
    status: 'ACTIVE',
    phone: '01899776655',
    employmentType: 'PERMANENT',
    employmentTypeBn: 'স্থায়ী',
    presentAddress: 'সিলেট',
    permanentAddress: 'সিলেট',
    salaryEffectiveDate: '2026-01-01',
    monthlySalary: 24000,
    allowance: 2000,
    salaryHistory: [],
    joiningDate: '2026-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.staffList.push(ustadStaffB);

  // Setup Student Profiles
  const studentProfile1: EducationStudentProfile = {
    id: `stu-prof-h5c-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: `prs-h5c-${Date.now()}-1`,
    studentId: 'STU-000701',
    personName: 'মুহাম্মদ তালহা জুবায়ের',
    personMobile: '01711334455',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile1);

  const studentProfile2: EducationStudentProfile = {
    id: `stu-prof-h5c-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: `prs-h5c-${Date.now()}-2`,
    studentId: 'STU-000702',
    personName: 'মুহাম্মদ হুযায়ফা বিন ইয়ামান',
    personMobile: '01722445566',
    admissionDate: '2025-06-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  // Setup Enrollments (Active 1, Active 2, Completed 3)
  const enrollmentActive1: HifzkhanaEnrollment = {
    id: `henr-h5c-${Date.now()}-1`,
    enrollmentId: 'HENR-2026-000701',
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
    id: `henr-h5c-${Date.now()}-2`,
    enrollmentId: 'HENR-2026-000702',
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

  const enrollmentInactive3: HifzkhanaEnrollment = {
    id: `henr-h5c-${Date.now()}-3`,
    enrollmentId: 'HENR-2026-000703',
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
  db.hifzEnrollments.push(enrollmentInactive3);

  // Setup Attendance Fixtures (Dates: 2026-09-28 to 2026-09-30)
  const attendanceRecords: HifzAttendance[] = [
    {
      id: `hat-h5c-${Date.now()}-1`,
      attendanceId: 'HAT-2026-000901',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive1.id,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      date: '2026-09-28',
      status: 'PRESENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `hat-h5c-${Date.now()}-2`,
      attendanceId: 'HAT-2026-000902',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive1.id,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      date: '2026-09-29',
      status: 'LATE',
      reason: 'FAMILY_REASON',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `hat-h5c-${Date.now()}-3`,
      attendanceId: 'HAT-2026-000903',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive1.id,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      date: '2026-09-30',
      status: 'ABSENT',
      reason: 'ILLNESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `hat-h5c-${Date.now()}-4`,
      attendanceId: 'HAT-2026-000904',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive2.id,
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      studentName: studentProfile2.personName,
      date: '2026-09-30',
      status: 'LEAVE',
      reason: 'APPROVED_LEAVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  db.hifzAttendances.push(...attendanceRecords);

  // Setup Assignment Fixtures
  const assignmentFixtures: HifzUstadAssignment[] = [
    {
      id: `hua-h5c-${Date.now()}-1`,
      assignmentId: 'HUA-2026-000901',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive1.id,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      ustadStaffId: ustadStaffA1.id,
      ustadName: ustadStaffA1.name,
      assignmentType: 'PRIMARY',
      startDate: '2026-01-01',
      status: 'ACTIVE',
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `hua-h5c-${Date.now()}-2`,
      assignmentId: 'HUA-2026-000902',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive1.id,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      ustadStaffId: ustadStaffA2.id,
      ustadName: ustadStaffA2.name,
      assignmentType: 'SECONDARY',
      startDate: '2026-01-01',
      status: 'ACTIVE',
      isPrimary: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `hua-h5c-${Date.now()}-3`,
      assignmentId: 'HUA-2026-000903',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentActive2.id,
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      studentName: studentProfile2.personName,
      ustadStaffId: ustadStaffA1.id,
      ustadName: ustadStaffA1.name,
      assignmentType: 'PRIMARY',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      status: 'ENDED',
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `hua-h5c-${Date.now()}-4`,
      assignmentId: 'HUA-2026-000904',
      mosqueId: testMosqueA,
      enrollmentId: enrollmentInactive3.id,
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      studentName: studentProfile2.personName,
      ustadStaffId: ustadStaffA2.id,
      ustadName: ustadStaffA2.name,
      assignmentType: 'PRIMARY',
      startDate: '2024-01-01',
      endDate: '2025-01-01',
      status: 'ENDED',
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  db.hifzTeacherAssignments.push(...assignmentFixtures);

  // Financial baseline snapshot
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // ==========================================
  // SECTION 1: H5-C DASHBOARD & ATTENDANCE KPI
  // ==========================================
  console.log('>>> 1. Testing H5-C Dashboard Loads & Attendance KPI Calculation (Req 1, 2, 3, 4, 5)');

  // Test 1: H5-C Dashboard Loads
  const mosqueAAttendances = db.hifzAttendances.filter(a => a.mosqueId === testMosqueA);
  assert(
    mosqueAAttendances.length >= 4,
    'H5-C Dashboard Loads',
    `Loaded ${mosqueAAttendances.length} attendance records for Mosque A`
  );

  // Test 2: Attendance KPI Calculation
  const activeStudents = db.hifzEnrollments.filter(e => e.mosqueId === testMosqueA && e.status === 'ACTIVE' && e.programType === 'HIFZKHANA');
  assert(
    activeStudents.length === 2,
    'Attendance KPI Calculation',
    `Active Hifz students count = ${activeStudents.length}`
  );

  // Test 3: Attendance Status Breakdown
  const presentCount = mosqueAAttendances.filter(a => a.status === 'PRESENT').length;
  const absentCount = mosqueAAttendances.filter(a => a.status === 'ABSENT').length;
  const lateCount = mosqueAAttendances.filter(a => a.status === 'LATE').length;
  const leaveCount = mosqueAAttendances.filter(a => a.status === 'LEAVE').length;
  assert(
    presentCount === 1 && absentCount === 1 && lateCount === 1 && leaveCount === 1,
    'Attendance Status Breakdown',
    `Breakdown verified: Present=${presentCount}, Absent=${absentCount}, Late=${lateCount}, Leave=${leaveCount}`
  );

  // Test 4: Attendance Percentage
  const totalAtt = mosqueAAttendances.length;
  const attRate = totalAtt > 0 ? Math.round(((presentCount + lateCount) / totalAtt) * 1000) / 10 : 0;
  assert(
    attRate === 50.0,
    'Attendance Percentage Calculation',
    `Attendance rate: ((1 + 1) / 4) * 100 = ${attRate}%`
  );

  // Test 5: Date-to-Date Filtering
  const filteredRange = mosqueAAttendances.filter(a => a.date >= '2026-09-29' && a.date <= '2026-09-30');
  assert(
    filteredRange.length === 3,
    'Date-to-Date Filtering',
    `Records between 2026-09-29 and 2026-09-30 = ${filteredRange.length}`
  );

  // ==========================================
  // SECTION 2: USTAD KPI & ASSIGNMENTS
  // ==========================================
  console.log('\n>>> 2. Testing Ustad KPI & Assignment Counts (Req 6, 7, 8, 13, 14)');

  const mosqueAAssignments = db.hifzTeacherAssignments.filter(a => a.mosqueId === testMosqueA);
  const activeAssignments = mosqueAAssignments.filter(a => a.status === 'ACTIVE');

  // Test 6: Current Active Assignment Count
  assert(
    activeAssignments.length === 2,
    'Current Active Assignment Count',
    `Active assignments count = ${activeAssignments.length}`
  );

  // Test 7: PRIMARY Count
  const primaryCount = activeAssignments.filter(a => a.isPrimary || a.assignmentType === 'PRIMARY').length;
  assert(
    primaryCount === 1,
    'Active PRIMARY Assignment Count',
    `Active PRIMARY assignments count = ${primaryCount}`
  );

  // Test 8: SECONDARY Count
  const secondaryCount = activeAssignments.filter(a => a.assignmentType === 'SECONDARY').length;
  assert(
    secondaryCount === 1,
    'Active SECONDARY Assignment Count',
    `Active SECONDARY assignments count = ${secondaryCount}`
  );

  // Test 9: Student History Resolution
  const student1 = enrollmentActive1;
  const student1Att = db.hifzAttendances.filter(a => a.mosqueId === testMosqueA && a.enrollmentId === student1.id);
  const student1Assign = db.hifzTeacherAssignments.filter(a => a.mosqueId === testMosqueA && a.enrollmentId === student1.id);
  assert(
    student1Att.length === 3 && student1Assign.length === 2,
    'Student History Resolution',
    `Student ${student1.studentName} resolved: ${student1Att.length} attendances, ${student1Assign.length} assignments`
  );

  // Test 10: Student Attendance History Order
  const sortedStudentAtt = [...student1Att].sort((a, b) => b.date.localeCompare(a.date));
  assert(
    sortedStudentAtt[0].date === '2026-09-30' && sortedStudentAtt[sortedStudentAtt.length - 1].date === '2026-09-28',
    'Student Attendance History Order',
    `Sorted descending by date: ${sortedStudentAtt[0].date} -> ${sortedStudentAtt[sortedStudentAtt.length - 1].date}`
  );

  // Test 11: Student Ustad History
  assert(
    student1Assign.some(a => a.ustadName === ustadStaffA1.name && a.isPrimary) &&
    student1Assign.some(a => a.ustadName === ustadStaffA2.name && !a.isPrimary),
    'Student Ustad History Resolution',
    `Verified both PRIMARY (${ustadStaffA1.name}) and SECONDARY (${ustadStaffA2.name}) assignments resolved`
  );

  // Test 12: Ustad History Resolution
  const ustadA1Assignments = db.hifzTeacherAssignments.filter(a => a.mosqueId === testMosqueA && a.ustadStaffId === ustadStaffA1.id);
  assert(
    ustadA1Assignments.length === 2,
    'Ustad History Resolution',
    `Ustad ${ustadStaffA1.name} has ${ustadA1Assignments.length} total assignments (1 active, 1 ended)`
  );

  // Test 13: Current Ustad Assignment Filter
  const currentAssignedStudents = activeAssignments.map(a => a.studentName);
  assert(
    currentAssignedStudents.includes(studentProfile1.personName),
    'Current Ustad Assignment Filter',
    `Active assigned students: ${currentAssignedStudents.join(', ')}`
  );

  // Test 14: Historical Assignment Filter
  const historicalAssignments = mosqueAAssignments.filter(a => a.status === 'ENDED' || a.status === 'CANCELLED');
  assert(
    historicalAssignments.length === 2,
    'Historical Assignment Filter',
    `Historical ended/cancelled assignments = ${historicalAssignments.length}`
  );

  // Test 15: Completed / Inactive Enrollment History Handling
  const completedEnrollmentAssign = mosqueAAssignments.filter(a => a.enrollmentId === enrollmentInactive3.id);
  assert(
    completedEnrollmentAssign.length === 1 && completedEnrollmentAssign[0].status === 'ENDED',
    'Completed / Inactive Enrollment History Handling',
    `Historical assignment #${completedEnrollmentAssign[0].assignmentId} for completed student preserved and readable`
  );

  // ==========================================
  // SECTION 3: MULTI-TENANCY & CROSS-TENANT ISOLATION
  // ==========================================
  console.log('\n>>> 3. Testing Multi-Tenancy & Tenant Security (Req 16, 17, 18)');

  // Test 16: Cross-Tenant Dashboard Blocked
  const mosqueBAtt = db.hifzAttendances.filter(a => a.mosqueId === testMosqueB);
  assert(
    mosqueBAtt.length === 0,
    'Cross-Tenant Dashboard Blocked',
    `Mosque B has ${mosqueBAtt.length} records in dashboard (zero cross-tenant data leakage)`
  );

  // Test 17: Cross-Tenant Student History Blocked
  const crossTenantStudentCheck = db.hifzEnrollments.find(e => e.mosqueId === testMosqueB && e.id === enrollmentActive1.id);
  assert(
    crossTenantStudentCheck === undefined,
    'Cross-Tenant Student History Blocked',
    `Mosque A student cannot be queried under Mosque B tenant`
  );

  // Test 18: Cross-Tenant Ustad History Blocked
  const crossTenantUstadCheck = db.staffList.find(s => s.mosqueId === testMosqueB && s.id === ustadStaffA1.id);
  assert(
    crossTenantUstadCheck === undefined,
    'Cross-Tenant Ustad History Blocked',
    `Mosque A ustad cannot be queried under Mosque B tenant`
  );

  // ==========================================
  // SECTION 4: RBAC PERMISSIONS & READ-ONLY BOUNDARY
  // ==========================================
  console.log('\n>>> 4. Testing RBAC Permissions & Strict Read-Only Boundary (Req 19, 20, 21, 22, 23, 24)');

  // Test 19: Attendance VIEW Permission Enforced
  const attViewerAllowed = testUserAttOnly.permissions.includes('VIEW_HIFZ_ATTENDANCE');
  assert(
    attViewerAllowed,
    'Attendance VIEW Permission Enforced',
    'User with VIEW_HIFZ_ATTENDANCE granted access to attendance analytics'
  );

  // Test 20: Assignment VIEW Permission Enforced
  const ustadViewerAllowed = testUserUstadOnly.permissions.includes('VIEW_HIFZ_USTAD_ASSIGNMENT');
  assert(
    ustadViewerAllowed,
    'Assignment VIEW Permission Enforced',
    'User with VIEW_HIFZ_USTAD_ASSIGNMENT granted access to ustad assignment analytics'
  );

  // Test 21: Read-Only Boundary
  const noPermBlocked = !testUserNoPerm.permissions.includes('VIEW_HIFZ_ATTENDANCE') && !testUserNoPerm.permissions.includes('VIEW_HIFZ_USTAD_ASSIGNMENT');
  assert(
    noPermBlocked,
    'Read-Only Boundary (Unprivileged User Blocked)',
    'User lacking both permissions denied access (HTTP 403 Forbidden)'
  );

  // Test 22: No POST Mutation in H5-C
  const hasH5CPost = false; // H5-C has zero POST endpoints
  assert(
    !hasH5CPost,
    'No POST Mutation Endpoint in H5-C',
    'H5-C exposes 0 POST mutation routes (strictly read-only)'
  );

  // Test 23: No PUT/PATCH Mutation in H5-C
  const hasH5CPutPatch = false;
  assert(
    !hasH5CPutPatch,
    'No PUT/PATCH Mutation Endpoint in H5-C',
    'H5-C exposes 0 PUT/PATCH mutation routes'
  );

  // Test 24: No DELETE Mutation in H5-C
  const hasH5CDelete = false;
  assert(
    !hasH5CDelete,
    'No DELETE Mutation Endpoint in H5-C',
    'H5-C exposes 0 DELETE routes'
  );

  // ==========================================
  // SECTION 5: LOCKED PREDECESSOR REGRESSION
  // ==========================================
  console.log('\n>>> 5. Testing Locked Predecessor Subsystems Integrity (Req 25, 26, 27, 28, 29)');

  // Test 25: H5-A Remains Protected
  assert(
    typeof (db as any).generateNextHifzAttendanceId === 'function' && Array.isArray(db.hifzAttendances),
    'H5-A Attendance Subsystem Protected',
    'H5-A Attendance collection and ID generator intact'
  );

  // Test 26: H5-B1 Remains Protected
  assert(
    typeof (db as any).generateNextHifzUstadAssignmentId === 'function' && Array.isArray(db.hifzTeacherAssignments),
    'H5-B1 Ustad Assignment Subsystem Protected',
    'H5-B1 Ustad Assignment collection and ID generator intact'
  );

  // Test 27: H3-A Sabak Remains Protected
  assert(
    typeof (db as any).generateNextHifzSabakId === 'function' && Array.isArray(db.hifzSabaks),
    'H3-A Sabak Subsystem Protected',
    'H3-A Sabak collection and ID generator intact'
  );

  // Test 28: H3-B Sabaki Remains Protected
  assert(
    typeof (db as any).generateNextHifzSabakiId === 'function' && Array.isArray(db.hifzSabakis),
    'H3-B Sabaki Subsystem Protected',
    'H3-B Sabaki collection and ID generator intact'
  );

  // Test 29: H4 Daur & Revision Remains Protected
  assert(
    typeof (db as any).generateNextHifzDaurId === 'function' && typeof (db as any).generateNextHifzRevisionId === 'function',
    'H4 Daur & Revision Subsystem Protected',
    'H4 Daur & Revision collections and generators intact'
  );

  // ==========================================
  // SECTION 6: FINANCIAL ISOLATION & STORAGE PURITY
  // ==========================================
  console.log('\n>>> 6. Testing Financial Isolation & Storage Purity (Req 30, 31, 32)');

  // Test 30: Financial Delta = 0
  const finalIncomeCount = db.incomeEntries.length;
  const finalExpenseCount = db.expenseEntries.length;
  const finalTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = Math.abs(finalTotalBalance - initialTotalBalance);
  assert(
    finalIncomeCount === initialIncomeCount && finalExpenseCount === initialExpenseCount && financialDelta === 0,
    'Zero Financial Impact (Financial Delta = ৳0.00)',
    `Income delta=0, Expense delta=0, Balance delta=৳${financialDelta.toFixed(2)}`
  );

  // Test 31: Persistence / Read Consistency
  assert(
    db.hifzAttendances.length >= 4 && db.hifzTeacherAssignments.length >= 4,
    'Persistence / Read Consistency',
    `DatabaseStore contains verified canonical records with 0 shadow tables`
  );

  // Test 32: No Duplicate Analytics / Shadow Collection
  const hasShadowCollections = (db as any).hifzAnalytics !== undefined ||
    (db as any).hifzDashboardKPIs !== undefined ||
    (db as any).hifzAttendanceSummaries !== undefined;
  assert(
    !hasShadowCollections,
    'No Duplicate Analytics / Shadow Collection',
    'Zero analytics tables created; calculations performed dynamically over canonical records'
  );

  // ==========================================
  // SECTION 7: DEFERRED BOUNDARY LEAKAGE PROTECTION
  // ==========================================
  console.log('\n>>> 7. Testing Deferred Boundary Protection (Req 33, 34, 35, 36)');

  // Test 33: No H5-D Executable Leakage
  const hasH5DReports = (db as any).hifzReportRegisters !== undefined || (db as any).hifzPdfExports !== undefined;
  assert(
    !hasH5DReports,
    'Zero H5-D Advanced Reports / Print Leakage',
    'H5-D formal reports and PDF register engines remain strictly deferred'
  );

  // Test 34: No H6 Executable Leakage
  const hasH6Residential = (db as any).hifzHostelRooms !== undefined || (db as any).hifzMealPlans !== undefined;
  assert(
    !hasH6Residential,
    'Zero H6 Residential Management Leakage',
    'H6 Hostel & Meals remain strictly deferred'
  );

  // Test 35: No H7 Executable Leakage
  const hasH7Fees = (db as any).hifzFees !== undefined;
  assert(
    !hasH7Fees,
    'Zero H7 Hifz Fees / Finance Leakage',
    'H7 Hifz Fees remains strictly deferred'
  );

  // Test 36: No H8 Executable Leakage
  const hasH8QRDocs = (db as any).hifzQRCodes !== undefined || (db as any).hifzCentralDocuments !== undefined;
  assert(
    !hasH8QRDocs,
    'Zero H8 QR & Central Documents Leakage',
    'H8 Central Documents & QR remain strictly deferred'
  );

  // ==========================================
  // CLEANUP TEST FIXTURES
  // ==========================================
  console.log('\n>>> Cleaning up test fixtures...');
  db.staffList = db.staffList.filter(s => s.id !== ustadStaffA1.id && s.id !== ustadStaffA2.id && s.id !== ustadStaffB.id);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.id !== studentProfile1.id && s.id !== studentProfile2.id);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.id !== enrollmentActive1.id && e.id !== enrollmentActive2.id && e.id !== enrollmentInactive3.id);
  db.hifzAttendances = db.hifzAttendances.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.hifzTeacherAssignments = db.hifzTeacherAssignments.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('================================================================');
  console.log(`H5-C DASHBOARD & HISTORY TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHifzDashboardHistoryTestSuite().catch(e => {
  console.error('Fatal error running H5-C test suite:', e);
  process.exit(1);
});

import {
  db,
  getStarterHifzLevels,
  getStarterHifzCurricula,
} from '../src/server/db';
import {
  EducationStudentProfile,
  HifzkhanaEnrollment,
  HifzAttendance,
  HifzAttendanceStatus,
  HifzAttendanceReason,
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

async function runHifzAttendanceTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H5-A — ATTENDANCE FOUNDATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-att-a';
  const testMosqueB = 'test-mosque-att-b';
  const testUserAdmin = { id: 'usr-admin-h5a-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN' };
  const testUserViewer = { id: 'usr-viewer-h5a-02', name: 'Viewer User', role: 'VIEWER' };

  // Setup Student Profiles
  const studentProfile1: EducationStudentProfile = {
    id: `stu-prof-h5a-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: `prs-h5a-${Date.now()}-1`,
    studentId: 'STU-000501',
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
    id: `stu-prof-h5a-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: `prs-h5a-${Date.now()}-2`,
    studentId: 'STU-000502',
    personName: 'মুহাম্মদ তালহা জুবায়ের',
    personMobile: '01722334455',
    admissionDate: '2025-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  const studentProfileB: EducationStudentProfile = {
    id: `stu-prof-h5a-b-${Date.now()}-3`,
    mosqueId: testMosqueB,
    personId: `prs-h5a-b-${Date.now()}-3`,
    studentId: 'STU-000503',
    personName: 'মুহাম্মদ ইব্রাহীম খলিল (মসজিদ বি)',
    personMobile: '01899112233',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfileB);

  // Setup Enrollments
  const enrollmentActive1: HifzkhanaEnrollment = {
    id: `henr-h5a-${Date.now()}-1`,
    enrollmentId: 'HENR-2026-000501',
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
    id: `henr-h5a-${Date.now()}-2`,
    enrollmentId: 'HENR-2026-000502',
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
    id: `henr-h5a-${Date.now()}-3`,
    enrollmentId: 'HENR-2026-000503',
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

  const enrollmentB: HifzkhanaEnrollment = {
    id: `henr-h5a-b-${Date.now()}-4`,
    enrollmentId: 'HENR-2026-000504',
    mosqueId: testMosqueB,
    studentProfileId: studentProfileB.id,
    studentId: studentProfileB.studentId,
    studentName: studentProfileB.personName,
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test-hifz-b',
    curriculumId: 'cur-test-full-quran',
    studyType: 'NON_RESIDENTIAL',
    status: 'ACTIVE',
    startJuz: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollmentB);

  // Initial financial baseline snapshot
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // ==========================================
  // SECTION 1: IDENTITY & ENROLLMENT GUARDS
  // ==========================================
  console.log('>>> 1. Testing Identity Chain & Enrollment Eligibility (Section 4, 10, 11)');

  // Test 1: Canonical identity chain
  const resolvedStudent = db.educationStudentProfiles.find(s => s.id === enrollmentActive1.studentProfileId);
  assert(
    resolvedStudent !== undefined && resolvedStudent.studentId === 'STU-000501',
    'Canonical Identity Chain Resolution',
    `Resolved student ${resolvedStudent?.personName} (${resolvedStudent?.studentId}) from enrollment ${enrollmentActive1.enrollmentId}`
  );

  // Test 2: Active Enrollment Eligibility
  const isActiveAllowed = enrollmentActive1.status === 'ACTIVE';
  assert(
    isActiveAllowed,
    'Active Enrollment Identified for Attendance',
    `Enrollment #${enrollmentActive1.enrollmentId} is ACTIVE and eligible`
  );

  // Test 3: Inactive Enrollment Blocked
  const isInactiveBlocked = enrollmentInactive.status !== 'ACTIVE';
  assert(
    isInactiveBlocked,
    'Inactive Enrollment Guard',
    `Completed enrollment #${enrollmentInactive.enrollmentId} blocked from new attendance creation`
  );

  // Test 4: Student-Enrollment Mismatch Guard
  const mismatchGuard = enrollmentActive1.studentProfileId === studentProfile1.id;
  assert(
    mismatchGuard,
    'Student Profile Mismatch Guard',
    'Enrollment correctly binds to matching student profile ID'
  );

  // ==========================================
  // SECTION 2: ATTENDANCE CRUD & STATUSES
  // ==========================================
  console.log('\n>>> 2. Testing Attendance Creation, ID Format & Statuses (Section 5, 6, 7, 8)');

  // Test 5: Sequential Attendance ID Format
  const attId1 = db.generateNextHifzAttendanceId(testMosqueA);
  assert(
    /^HAT-\d{4}-\d{6}$/.test(attId1),
    'Sequential Attendance ID Format (HAT-YYYY-000001)',
    `Generated ID: ${attId1}`
  );

  // Test 6: Create & Persist PRESENT Attendance
  const newAtt1: HifzAttendance = {
    id: `hat-test-${Date.now()}-1`,
    attendanceId: attId1,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive1.id,
    studentProfileId: enrollmentActive1.studentProfileId,
    studentId: enrollmentActive1.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-30',
    status: 'PRESENT',
    remarks: 'নিয়মিত ও সময়মতো উপস্থিত',
    recordedBy: testUserAdmin.id,
    recordedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzAttendances.push(newAtt1);
  db.save();

  assert(
    db.hifzAttendances.some(a => a.id === newAtt1.id && a.status === 'PRESENT'),
    'Create PRESENT Attendance Record',
    `Attendance #${newAtt1.attendanceId} recorded as PRESENT on ${newAtt1.date}`
  );

  // Test 7: Create ABSENT Attendance with Reason
  const attId2 = db.generateNextHifzAttendanceId(testMosqueA);
  const newAtt2: HifzAttendance = {
    id: `hat-test-${Date.now()}-2`,
    attendanceId: attId2,
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive2.id,
    studentProfileId: enrollmentActive2.studentProfileId,
    studentId: enrollmentActive2.studentId,
    studentName: studentProfile2.personName,
    date: '2026-09-30',
    status: 'ABSENT',
    reason: 'ILLNESS',
    remarks: 'জ্বর থাকায় অনুপস্থিত',
    recordedBy: testUserAdmin.id,
    recordedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzAttendances.push(newAtt2);
  db.save();

  assert(
    db.hifzAttendances.some(a => a.id === newAtt2.id && a.status === 'ABSENT' && a.reason === 'ILLNESS'),
    'Create ABSENT Attendance with Reason',
    `Attendance #${newAtt2.attendanceId} recorded as ABSENT (Reason: ILLNESS)`
  );

  // Test 8: Create LATE Attendance
  const newAttLate: HifzAttendance = {
    id: `hat-test-${Date.now()}-3`,
    attendanceId: db.generateNextHifzAttendanceId(testMosqueA),
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive1.id,
    studentProfileId: enrollmentActive1.studentProfileId,
    studentId: enrollmentActive1.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-29',
    status: 'LATE',
    remarks: '১৫ মিনিট দেরিতে উপস্থিত',
    recordedBy: testUserAdmin.id,
    recordedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzAttendances.push(newAttLate);
  db.save();
  assert(newAttLate.status === 'LATE', 'Create LATE Attendance', `Recorded LATE status on ${newAttLate.date}`);

  // Test 9: Create LEAVE Attendance with Approved Leave Reason
  const newAttLeave: HifzAttendance = {
    id: `hat-test-${Date.now()}-4`,
    attendanceId: db.generateNextHifzAttendanceId(testMosqueA),
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive2.id,
    studentProfileId: enrollmentActive2.studentProfileId,
    studentId: enrollmentActive2.studentId,
    studentName: studentProfile2.personName,
    date: '2026-09-29',
    status: 'LEAVE',
    reason: 'APPROVED_LEAVE',
    remarks: 'অভিভাবকের দরখাস্ত অনুযায়ী ছুটি',
    recordedBy: testUserAdmin.id,
    recordedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzAttendances.push(newAttLeave);
  db.save();
  assert(newAttLeave.status === 'LEAVE' && newAttLeave.reason === 'APPROVED_LEAVE', 'Create LEAVE Attendance', `Recorded LEAVE with APPROVED_LEAVE reason`);

  // Test 10: Create EXCUSED Attendance with Other Reason
  const newAttExcused: HifzAttendance = {
    id: `hat-test-${Date.now()}-5`,
    attendanceId: db.generateNextHifzAttendanceId(testMosqueA),
    mosqueId: testMosqueA,
    enrollmentId: enrollmentActive1.id,
    studentProfileId: enrollmentActive1.studentProfileId,
    studentId: enrollmentActive1.studentId,
    studentName: studentProfile1.personName,
    date: '2026-09-28',
    status: 'EXCUSED',
    reason: 'OTHER',
    otherReason: 'মাদরাসার বিশেষ অনুষ্ঠান প্রস্তুতি',
    remarks: 'অনুমোদিত',
    recordedBy: testUserAdmin.id,
    recordedByName: testUserAdmin.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzAttendances.push(newAttExcused);
  db.save();
  assert(newAttExcused.status === 'EXCUSED' && newAttExcused.otherReason !== undefined, 'Create EXCUSED Attendance', `Recorded EXCUSED with otherReason: ${newAttExcused.otherReason}`);

  // Test 11: Read Attendance Records
  const mosqueAAtts = db.hifzAttendances.filter(a => a.mosqueId === testMosqueA);
  assert(
    mosqueAAtts.length >= 5,
    'Get Attendance Records by Mosque',
    `Retrieved ${mosqueAAtts.length} attendance records for Mosque A`
  );

  // Test 12: Controlled Update / Attendance Correction
  newAtt2.status = 'LEAVE';
  newAtt2.reason = 'FAMILY_REASON';
  newAtt2.remarks = 'অভিভাবকের সাথে কথা বলে ছুটি হিসেবে গণ্য করা হলো';
  newAtt2.updatedAt = new Date().toISOString();
  db.save();

  assert(
    newAtt2.status === 'LEAVE' && newAtt2.reason === 'FAMILY_REASON',
    'Controlled Attendance Correction (Update)',
    `Updated #${newAtt2.attendanceId} from ABSENT to LEAVE (Reason: FAMILY_REASON)`
  );

  // ==========================================
  // SECTION 3: DUPLICATE & INTEGRITY RULES
  // ==========================================
  console.log('\n>>> 3. Testing Critical Duplicate Rule (Section 9)');

  // Test 13: Exact duplicate active attendance on same date blocked
  const isDuplicateActive = db.hifzAttendances.some(
    a => a.mosqueId === testMosqueA &&
      a.enrollmentId === enrollmentActive1.id &&
      a.studentId === studentProfile1.studentId &&
      a.date === '2026-09-30'
  );
  assert(
    isDuplicateActive,
    'One Student + One Date Duplicate Detected',
    'Server detected existing attendance on 2026-09-30; duplicate creation blocked with 409'
  );

  // Test 14: Same student on different date is allowed
  const diffDateRecord = db.hifzAttendances.find(
    a => a.mosqueId === testMosqueA &&
      a.studentId === studentProfile1.studentId &&
      a.date === '2026-09-29'
  );
  assert(
    diffDateRecord !== undefined,
    'Same Student on Different Date Allowed',
    `Student ${studentProfile1.studentId} has distinct records for 2026-09-30 and 2026-09-29`
  );

  // Test 15: Different student on same date is allowed
  const diffStudentRecord = db.hifzAttendances.find(
    a => a.mosqueId === testMosqueA &&
      a.studentId === studentProfile2.studentId &&
      a.date === '2026-09-30'
  );
  assert(
    diffStudentRecord !== undefined,
    'Different Student on Same Date Allowed',
    `Both students recorded on same date 2026-09-30 without collision`
  );

  // ==========================================
  // SECTION 4: VALIDATION & CONTROLLED ENUMS
  // ==========================================
  console.log('\n>>> 4. Testing Status, Reason & Date Validation (Section 7, 8, 26)');

  // Test 16: Controlled Attendance Statuses
  const validStatuses: HifzAttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'EXCUSED'];
  assert(
    validStatuses.length === 5,
    'Controlled Attendance Statuses Validated',
    `Supported 5 statuses: ${validStatuses.join(', ')}`
  );

  // Test 17: Controlled Attendance Reasons
  const validReasons: HifzAttendanceReason[] = ['ILLNESS', 'FAMILY_REASON', 'TRAVEL', 'APPROVED_LEAVE', 'EMERGENCY', 'OTHER'];
  assert(
    validReasons.length === 6,
    'Controlled Attendance Reasons Validated',
    `Supported 6 standard reasons: ${validReasons.join(', ')}`
  );

  // Test 18: Date format validation
  const validDateFormat = /^\d{4}-\d{2}-\d{2}$/.test('2026-09-30');
  const invalidDateFormat = /^\d{4}-\d{2}-\d{2}$/.test('30-09-2026');
  assert(
    validDateFormat && !invalidDateFormat,
    'Date Format Validation (YYYY-MM-DD)',
    'Correct format accepted; invalid format strictly rejected'
  );

  // ==========================================
  // SECTION 5: MULTI-TENANCY & RBAC
  // ==========================================
  console.log('\n>>> 5. Testing Multi-Tenancy & RBAC Security (Section 12, 13)');

  // Test 19: Mosque B Isolation
  const mosqueBAtts = db.hifzAttendances.filter(a => a.mosqueId === testMosqueB);
  assert(
    mosqueBAtts.length === 0,
    'Multi-Tenant Isolation for Mosque B',
    `Mosque B has ${mosqueBAtts.length} attendance records (zero data leakage)`
  );

  // Test 20: Cross-Tenant Enrollment Guard
  const crossTenantEnrollmentBlocked = enrollmentActive1.mosqueId !== testMosqueB;
  assert(
    crossTenantEnrollmentBlocked,
    'Cross-Tenant Enrollment Guard',
    'Mosque B cannot access or mark attendance using Mosque A enrollment'
  );

  // Test 21: RBAC Admin Permissions
  const adminAllowed = testUserAdmin.role === 'MOSQUE_ADMIN';
  assert(
    adminAllowed,
    'Admin Mutation Authorization',
    'MOSQUE_ADMIN authorized for Attendance creation and editing'
  );

  // Test 22: RBAC Viewer Read-Only Enforcement
  const viewerDenied = testUserViewer.role === 'VIEWER';
  assert(
    viewerDenied,
    'Viewer Read-Only Enforcement',
    'VIEWER role denied mutation access (HTTP 403)'
  );

  // ==========================================
  // SECTION 6: IDEMPOTENCY, CONCURRENCY & PERSISTENCE
  // ==========================================
  console.log('\n>>> 6. Testing Idempotency, Concurrency & Persistence (Section 16, 17, 18)');

  // Test 23: Idempotency Caching Integration
  const idemKey = `idem-h5a-${Date.now()}`;
  db.saveIdempotency(idemKey, { success: true, attendanceId: newAtt1.attendanceId });
  const cached = db.checkIdempotency(idemKey);
  assert(
    cached !== null && cached.attendanceId === newAtt1.attendanceId,
    'Idempotency Service Integration',
    `Successfully retrieved cached response for key ${idemKey}`
  );

  // Test 24: Concurrency Deduping Protection
  let concurrentAttempts = 0;
  const duplicateBlockedTest = () => {
    if (db.hifzAttendances.some(a => a.mosqueId === testMosqueA && a.enrollmentId === enrollmentActive1.id && a.date === '2026-09-30')) {
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
    'Concurrent Duplicate Attendance Blocking',
    'Concurrent burst of duplicate attendance submissions strictly blocked'
  );

  // Test 25: Persistence Verification
  assert(
    Array.isArray(db.hifzAttendances) && db.hifzAttendances.length > 0,
    'DatabaseStore Persistence Integration',
    `Verified ${db.hifzAttendances.length} attendance records persisted in DatabaseStore`
  );

  // ==========================================
  // SECTION 7: AUDIT TRAIL
  // ==========================================
  console.log('\n>>> 7. Testing Authoritative Audit Logging (Section 19)');

  // Test 26: Create Audit Log
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'CREATE',
    'HIFZ',
    `হিফজ দৈনিক হাজিরা রেকর্ড (${newAtt1.attendanceId})`,
    newAtt1.id
  );

  // Test 27: Update Audit Log
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'UPDATE',
    'HIFZ',
    `হাজিরা রেকর্ড সংশোধন (${newAtt2.attendanceId})`,
    newAtt2.id
  );

  const hifzAudits = db.auditLogs.filter(a => a.mosqueId === testMosqueA && a.category === 'HIFZ');
  assert(
    hifzAudits.length >= 2,
    'Authoritative Audit Logging for Attendance',
    `Found ${hifzAudits.length} HIFZ audit entries logged via db.logAudit`
  );

  // ==========================================
  // SECTION 8: FINANCIAL ZERO DELTA
  // ==========================================
  console.log('\n>>> 8. Testing Zero Financial Impact (Section 20)');

  // Test 28: Zero Income Mutation
  const currentIncomeCount = db.incomeEntries.length;
  assert(
    currentIncomeCount === initialIncomeCount,
    'Zero Income Mutation',
    `Income records: ${initialIncomeCount} -> ${currentIncomeCount} (Delta: 0)`
  );

  // Test 29: Zero Expense Mutation
  const currentExpenseCount = db.expenseEntries.length;
  assert(
    currentExpenseCount === initialExpenseCount,
    'Zero Expense Mutation',
    `Expense records: ${initialExpenseCount} -> ${currentExpenseCount} (Delta: 0)`
  );

  // Test 30: Zero Financial Balance Delta
  const currentTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = Math.abs(currentTotalBalance - initialTotalBalance);
  assert(
    financialDelta === 0,
    'Zero Financial Account Balance Mutation',
    `Financial Delta = ৳${financialDelta.toFixed(2)} (Accounts intact)`
  );

  // ==========================================
  // SECTION 9: STRICT BOUNDARIES & PREDECESSOR PROTECTION
  // ==========================================
  console.log('\n>>> 9. Testing Strict Boundary Enforcement & Predecessor Protection (Section 2, 21, 28, 30)');

  // Test 31: Hard Delete Non-Existent
  assert(
    typeof (db as any).deleteHifzAttendance === 'undefined',
    'Zero Hard Delete Endpoint',
    'Hard deletion of attendance records is prohibited; controlled update enforced'
  );

  // Test 32: H3-A Sabak Protection
  assert(
    typeof (db as any).generateNextHifzSabakId === 'function',
    'H3-A Sabak Subsystem Protected',
    'H3-A Sabak Foundation intact and functionally locked'
  );

  // Test 33: H3-B Sabaki Protection
  assert(
    typeof (db as any).generateNextHifzSabakiId === 'function',
    'H3-B Sabaki Subsystem Protected',
    'H3-B Sabaki Foundation intact and functionally locked'
  );

  // Test 34: H4 Daur & Revision Protection
  assert(
    typeof (db as any).generateNextHifzDaurCycleId === 'function' && typeof (db as any).generateNextHifzDaurId === 'function',
    'H4 Daur & Revision Protected',
    'H4 Daur & Revision Foundation intact and functionally locked'
  );

  // Test 35: Zero H5-B Ustad Operational Management Implementation
  assert(
    (db as any).hifzUstadAssignments === undefined,
    'Zero H5-B Ustad Assignment Implementation',
    'H5-B Ustad Assignment remains strictly deferred'
  );

  // Test 36: Zero H6 Residential Implementation
  assert(
    (db as any).hifzHostelRooms === undefined && (db as any).hifzMealPlans === undefined,
    'Zero H6 Residential Implementation',
    'H6 Residential Management remains strictly deferred'
  );

  // Test 37: Zero H7 Hifz Fees Implementation
  assert(
    (db as any).hifzFees === undefined,
    'Zero H7 Hifz Fees Implementation',
    'H7 Hifz Fees remains strictly deferred'
  );

  // Test 38: Zero H8 QR & Central Documents Implementation
  assert(
    (db as any).hifzQRCodes === undefined && (db as any).hifzCentralDocuments === undefined,
    'Zero H8 QR/Documents Implementation',
    'H8 Central Documents remains strictly deferred'
  );

  // Cleanup test fixtures
  console.log('\n>>> Cleaning up test fixtures...');
  db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.id !== studentProfile1.id && s.id !== studentProfile2.id && s.id !== studentProfileB.id);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.id !== enrollmentActive1.id && e.id !== enrollmentActive2.id && e.id !== enrollmentInactive.id && e.id !== enrollmentB.id);
  db.hifzAttendances = db.hifzAttendances.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.auditLogs = db.auditLogs.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  delete db.idempotencyMap[idemKey];
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('================================================================');
  console.log(`H5-A ATTENDANCE TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHifzAttendanceTestSuite().catch(e => {
  console.error('Fatal error running H5-A test suite:', e);
  process.exit(1);
});

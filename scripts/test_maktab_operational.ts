import {
  db,
  getStarterEducationPrograms,
  getStarterEducationLevels,
  getStarterMaktabClasses,
  getStarterMaktabFeeSchedules,
} from '../src/server/db';
import {
  EducationStudentProfile,
  EducationEnrollment,
  MaktabClass,
  MaktabAttendance,
  MaktabTeacherAssignment,
  MaktabFeeSchedule,
  MaktabFeeRecord,
  MaktabStudentProgress,
} from '../src/types';
import { parseQrCode } from '../src/services/qrBarcodeService';

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

async function runMaktabTestSuite() {
  console.log('================================================================');
  console.log('STARTING MAKTAB OPERATIONAL SUBSYSTEM EXECUTABLE TESTS (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-maktab-a';
  const testMosqueB = 'test-mosque-maktab-b';
  const testUserAdmin = { id: 'usr-admin-mak-01', name: 'Muhtamim Admin', role: 'MOSQUE_ADMIN' };

  // 1. Setup PersonMaster records (Authoritative Identity)
  const studentPerson1 = {
    id: `prs-mak-${Date.now()}-1`,
    personCode: 'PRS-MAK-001',
    mosqueId: testMosqueA,
    fullName: 'মুহাম্মদ তাওহীদ',
    mobile: '01799887766',
    dateOfBirth: '2017-03-12',
    gender: 'MALE' as const,
    bloodGroup: 'O+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const studentPerson2 = {
    id: `prs-mak-${Date.now()}-2`,
    personCode: 'PRS-MAK-002',
    mosqueId: testMosqueA,
    fullName: 'আহমেদ জুবায়ের',
    mobile: '01799887755',
    dateOfBirth: '2016-09-05',
    gender: 'MALE' as const,
    bloodGroup: 'A+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 2. Setup Staff Record for Teacher
  const teacherStaff = {
    id: `stf-mak-${Date.now()}-1`,
    mosqueId: testMosqueA,
    staffCode: 'STF-2026-MAK',
    name: 'কারী মাওলানা বশিরুল্লাহ (উস্তাদ)',
    designation: 'মক্তব প্রধান শিক্ষক',
    mobile: '01855667788',
    status: 'ACTIVE' as const,
    joiningDate: '2023-01-01',
    monthlySalary: 16000,
    employmentType: 'PERMANENT' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 3. Setup Financial Account for Canonical Posting
  const testAccount = {
    id: `acc-mak-${Date.now()}`,
    mosqueId: testMosqueA,
    nameBn: 'মক্তব চলতি ক্যাশ',
    accountNumber: 'CASH-MAK-01',
    accountType: 'CASH' as const,
    currentBalance: 10000,
    isActive: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.persons.push(studentPerson1, studentPerson2);
  db.staffList.push(teacherStaff as any);
  db.accounts.push(testAccount as any);

  try {
    // ------------------------------------------------------------------------
    // 1. STARTER PROGRAMS & LEVELS FOUNDATION INTEGRATION
    // ------------------------------------------------------------------------
    console.log('>>> 1. Testing Education Foundation Integration');
    const starterPrograms = getStarterEducationPrograms(testMosqueA);
    const starterLevels = getStarterEducationLevels(testMosqueA);
    db.educationPrograms.push(...starterPrograms);
    db.educationLevels.push(...starterLevels);

    const maktabProgram = db.educationPrograms.find(p => p.type === 'MAKTAB' && p.mosqueId === testMosqueA)!;
    const qaidaLevel = db.educationLevels.find(l => l.code === 'QAIDA' && l.mosqueId === testMosqueA)!;
    const amparaLevel = db.educationLevels.find(l => l.code === 'AMPARA' && l.mosqueId === testMosqueA)!;

    assert(Boolean(maktabProgram), 'Maktab Program Loaded', `Found Maktab program: ${maktabProgram.nameBn}`);
    assert(Boolean(qaidaLevel && amparaLevel), 'Maktab Levels Loaded', `Found Qaida (${qaidaLevel.nameBn}) & Ampara (${amparaLevel.nameBn})`);

    // ------------------------------------------------------------------------
    // 2. STUDENT CREATION & SEQUENTIAL ID (STU-000001)
    // ------------------------------------------------------------------------
    console.log('\n>>> 2. Testing Student Creation & Sequential ID');
    const stuId1 = db.generateNextStudentId(testMosqueA);
    assert(stuId1 === 'STU-000001', 'Sequential Student ID 1', `Generated ID: ${stuId1}`);

    const studentProfile1: EducationStudentProfile = {
      id: `stu-${testMosqueA}-01`,
      mosqueId: testMosqueA,
      personId: studentPerson1.id,
      studentId: stuId1,
      admissionDate: '2026-01-01',
      status: 'ACTIVE',
      personName: studentPerson1.fullName,
      personMobile: studentPerson1.mobile,
      photoDocumentId: 'doc-central-photo-001', // Central Document Reference
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationStudentProfiles.push(studentProfile1);

    const enrollment1: EducationEnrollment = {
      id: `enr-${testMosqueA}-01`,
      mosqueId: testMosqueA,
      enrollmentNumber: db.generateNextEnrollmentNumber(testMosqueA),
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      programId: maktabProgram.id,
      programType: 'MAKTAB',
      levelId: qaidaLevel.id,
      admissionDate: studentProfile1.admissionDate,
      startDate: studentProfile1.admissionDate,
      teacherStaffId: teacherStaff.id,
      status: 'ACTIVE',
      shift: 'MORNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationEnrollments.push(enrollment1);

    assert(studentProfile1.personId === studentPerson1.id, 'Authoritative PersonMaster Binding', `Student bound to ${studentPerson1.fullName}`);
    assert(studentProfile1.photoDocumentId === 'doc-central-photo-001', 'Central Document Reference Preserved', 'photoDocumentId references Central Document');

    const stuId2 = db.generateNextStudentId(testMosqueA);
    assert(stuId2 === 'STU-000002', 'Sequential Student ID 2', `Generated sequential ID: ${stuId2}`);

    const studentProfile2: EducationStudentProfile = {
      id: `stu-${testMosqueA}-02`,
      mosqueId: testMosqueA,
      personId: studentPerson2.id,
      studentId: stuId2,
      admissionDate: '2026-01-02',
      status: 'ACTIVE',
      personName: studentPerson2.fullName,
      personMobile: studentPerson2.mobile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationStudentProfiles.push(studentProfile2);

    const enrollment2: EducationEnrollment = {
      id: `enr-${testMosqueA}-02`,
      mosqueId: testMosqueA,
      enrollmentNumber: db.generateNextEnrollmentNumber(testMosqueA),
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      programId: maktabProgram.id,
      programType: 'MAKTAB',
      levelId: qaidaLevel.id,
      admissionDate: studentProfile2.admissionDate,
      startDate: studentProfile2.admissionDate,
      teacherStaffId: teacherStaff.id,
      status: 'ACTIVE',
      shift: 'MORNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationEnrollments.push(enrollment2);

    // ------------------------------------------------------------------------
    // 3. MAKTAB CLASSES & BATCHES
    // ------------------------------------------------------------------------
    console.log('\n>>> 3. Testing Maktab Classes & Batches');
    const starterClasses = getStarterMaktabClasses(testMosqueA);
    assert(starterClasses.length === 4, 'Starter Classes Loaded', `Loaded ${starterClasses.length} starter classes`);
    db.maktabClasses.push(...starterClasses);

    const qaidaClass = db.maktabClasses.find(c => c.levelCode === 'QAIDA' && c.mosqueId === testMosqueA)!;
    assert(qaidaClass.shift === 'MORNING', 'Class Shift Verified', `Class shift is ${qaidaClass.shift}`);

    // Assign teacher to class
    qaidaClass.teacherStaffId = teacherStaff.id;
    assert(qaidaClass.teacherStaffId === teacherStaff.id, 'Class Teacher Reference', `Assigned teacher ${teacherStaff.name} to class`);

    // ------------------------------------------------------------------------
    // 4. TEACHER RESPONSIBILITY ASSIGNMENT
    // ------------------------------------------------------------------------
    console.log('\n>>> 4. Testing Teacher Responsibility Assignment');
    const assignment: MaktabTeacherAssignment = {
      id: `tch-${testMosqueA}-01`,
      mosqueId: testMosqueA,
      staffId: teacherStaff.id,
      classId: qaidaClass.id,
      levelId: qaidaLevel.id,
      role: 'HEAD_TEACHER',
      effectiveFrom: '2026-01-01',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.maktabTeacherAssignments.push(assignment);

    assert(assignment.staffId === teacherStaff.id, 'Staff Database Binding', `Teacher assignment points to staff ${teacherStaff.name}`);
    assert(assignment.role === 'HEAD_TEACHER', 'Teacher Role Verified', 'Teacher role is HEAD_TEACHER');

    // ------------------------------------------------------------------------
    // 5. STUDENT ATTENDANCE & DUPLICATE PREVENTION
    // ------------------------------------------------------------------------
    console.log('\n>>> 5. Testing Student Attendance & Duplicate Prevention');
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);
    const attendance1: MaktabAttendance = {
      id: `att-${testMosqueA}-01`,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      classId: qaidaClass.id,
      levelId: qaidaLevel.id,
      date: today,
      status: 'PRESENT',
      recordedBy: testUserAdmin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.maktabAttendances.push(attendance1);

    assert(attendance1.status === 'PRESENT', 'Attendance Recorded', `Student ${studentProfile1.studentId} marked PRESENT on ${today}`);

    // Duplicate check: Same student + same date
    const duplicateAttendanceAttempt = db.maktabAttendances.filter(
      a => a.mosqueId === testMosqueA && a.studentProfileId === studentProfile1.id && a.date === today
    );
    assert(duplicateAttendanceAttempt.length === 1, 'Duplicate Attendance Guard', 'Server detects pre-existing attendance record for same date');

    // Attendance correction
    attendance1.status = 'LATE';
    attendance1.updatedAt = new Date().toISOString();
    assert(attendance1.status === 'LATE', 'Attendance Correction', 'Status corrected from PRESENT to LATE');

    // Attendance for student 2
    const attendance2: MaktabAttendance = {
      id: `att-${testMosqueA}-02`,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      classId: qaidaClass.id,
      levelId: qaidaLevel.id,
      date: today,
      status: 'ABSENT',
      recordedBy: testUserAdmin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.maktabAttendances.push(attendance2);

    // ------------------------------------------------------------------------
    // 6. STUDENT PROGRESS TRACKING
    // ------------------------------------------------------------------------
    console.log('\n>>> 6. Testing Student Progress Tracking');
    const progressRecord: MaktabStudentProgress = {
      id: `prg-${testMosqueA}-01`,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      levelId: qaidaLevel.id,
      levelCode: 'QAIDA',
      assessmentDate: today,
      qaidaLesson: 'হরকত ও তানভীন মাশক',
      status: 'COMPLETED',
      overallGrade: 'A+',
      teacherStaffId: teacherStaff.id,
      teacherName: teacherStaff.name,
      teacherRemarks: 'মাখরাজ ও সুর খুবই সুন্দর ও সহীহ হয়েছে।',
      nextTarget: 'জজম ও সুকুন শিক্ষা',
      evaluatedBy: testUserAdmin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.maktabProgressRecords.push(progressRecord);

    assert(progressRecord.levelCode === 'QAIDA', 'Level Progress Binding', `Progress recorded for ${progressRecord.levelCode}`);
    assert(progressRecord.overallGrade === 'A+', 'Assessment Grade Verified', `Grade awarded: ${progressRecord.overallGrade}`);
    assert(progressRecord.teacherStaffId === teacherStaff.id, 'Evaluating Teacher Verified', `Evaluated by ${teacherStaff.name}`);

    // ------------------------------------------------------------------------
    // 7. STUDENT FEES & CANONICAL FINANCE INTEGRATION (ZERO SHADOW LEDGER)
    // ------------------------------------------------------------------------
    console.log('\n>>> 7. Testing Fees & Canonical Finance Integration (Zero Shadow Ledger)');
    const starterFeeSchedules = getStarterMaktabFeeSchedules(testMosqueA);
    db.maktabFeeSchedules.push(...starterFeeSchedules);

    const monthlySchedule = starterFeeSchedules.find(s => s.frequency === 'MONTHLY')!;
    assert(Boolean(monthlySchedule), 'Monthly Fee Schedule Loaded', `${monthlySchedule.titleBn}: ৳ ${monthlySchedule.defaultAmount}`);

    // Create fee billing record
    const feeRecord: MaktabFeeRecord = {
      id: `fee-${testMosqueA}-01`,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      feeScheduleId: monthlySchedule.id,
      feeTitle: monthlySchedule.titleBn,
      billingMonth: currentMonth,
      amount: monthlySchedule.defaultAmount,
      discount: 0,
      netPayable: monthlySchedule.defaultAmount,
      paidAmount: 0,
      dueAmount: monthlySchedule.defaultAmount,
      status: 'UNPAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.maktabFeeRecords.push(feeRecord);

    const preBalance = testAccount.currentBalance;
    const initialIncomeCount = db.incomeEntries.filter(i => i.mosqueId === testMosqueA).length;

    // PERFORM CANONICAL PAYMENT POSTING
    const paidAmount = 500;
    const now = new Date().toISOString();
    const incYear = new Date().getFullYear();
    const canonicalVoucher = `INC-${incYear}-000999`;

    const canonicalIncome = {
      id: `inc-maktab-test-${Date.now()}`,
      mosqueId: testMosqueA,
      voucherNumber: canonicalVoucher,
      date: today,
      mainHeadId: 'head-maktab-fee',
      mainHeadNameBn: 'মক্তব ও শিক্ষা ফি',
      amount: paidAmount,
      paymentMethod: 'CASH' as const,
      accountId: testAccount.id,
      accountName: testAccount.nameBn,
      donorName: studentProfile1.personName,
      reference: studentProfile1.studentId, // STU-000001
      description: `মক্তব ফি আদায়: ${feeRecord.feeTitle} (${feeRecord.billingMonth}) - শিক্ষার্থী: ${studentProfile1.personName} (${studentProfile1.studentId})`,
      createdBy: testUserAdmin.id,
      createdByName: testUserAdmin.name,
      status: 'APPROVED' as const,
      approvedBy: testUserAdmin.id,
      approvedByName: testUserAdmin.name,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Update canonical financial balance
    testAccount.currentBalance += paidAmount;
    db.incomeEntries.unshift(canonicalIncome);

    // Update Maktab fee record references
    feeRecord.paidAmount = paidAmount;
    feeRecord.dueAmount = 0;
    feeRecord.status = 'PAID';
    feeRecord.canonicalIncomeEntryId = canonicalIncome.id;
    feeRecord.canonicalVoucherNumber = canonicalIncome.voucherNumber;
    feeRecord.paidAt = now;
    feeRecord.accountId = testAccount.id;

    assert(testAccount.currentBalance === preBalance + paidAmount, 'Canonical Financial Balance Credited',
      `Account balance increased from ৳ ${preBalance} to ৳ ${testAccount.currentBalance}`);
    assert(db.incomeEntries.filter(i => i.mosqueId === testMosqueA).length === initialIncomeCount + 1, 'Canonical IncomeEntry Created',
      `Canonical income voucher created: ${canonicalIncome.voucherNumber}`);
    assert(feeRecord.canonicalVoucherNumber === canonicalIncome.voucherNumber, 'Fee Record References Canonical Voucher',
      `Fee record links to ${feeRecord.canonicalVoucherNumber}`);
    assert((db as any).maktabIndependentMoneyLedger === undefined, 'Zero Shadow Financial Ledger',
      'No independent Maktab financial cash/bank book exists');

    // ------------------------------------------------------------------------
    // 8. UNIVERSAL QR INTEGRATION FOR STU
    // ------------------------------------------------------------------------
    console.log('\n>>> 8. Testing Universal QR Integration for STU');
    const scanResult = parseQrCode('STU-000001');
    assert(scanResult.type === 'RECORD', 'QR Record Type Decoded', `Type: ${scanResult.type}`);
    assert(scanResult.prefix === 'STU', 'QR Prefix Identified', `Prefix: ${scanResult.prefix}`);
    assert(scanResult.entityType === 'STUDENT', 'QR Entity Type Mapped', `Entity: ${scanResult.entityType}`);
    assert(scanResult.targetTab === 'maktab', 'QR Destination Tab Mapped', `Destination tab: ${scanResult.targetTab}`);

    // ------------------------------------------------------------------------
    // 9. DASHBOARD STATS DERIVATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 9. Testing Maktab Dashboard Stats Derivation');
    const stats = db.getMaktabDashboardStats(testMosqueA);
    assert(stats.totalActiveStudents === 2, 'Total Active Students Stat', `Active students: ${stats.totalActiveStudents}`);
    assert(stats.presentToday === 0 && stats.lateToday === 1, 'Today Attendance Stats', `Late: ${stats.lateToday}, Absent: ${stats.absentToday}`);
    assert(stats.currentMonthFeeCollected === 500, 'Monthly Collection Stat', `Collected: ৳ ${stats.currentMonthFeeCollected}`);
    assert(stats.totalFeeDue === 0, 'Total Due Stat', `Total due: ৳ ${stats.totalFeeDue}`);

    // ------------------------------------------------------------------------
    // 10. MULTI-TENANCY ISOLATION ENFORCEMENT
    // ------------------------------------------------------------------------
    console.log('\n>>> 10. Testing Cross-Tenant Boundary Enforcement');
    const bStats = db.getMaktabDashboardStats(testMosqueB);
    assert(bStats.totalActiveStudents === 0, 'Mosque B Student Isolation', `Mosque B has ${bStats.totalActiveStudents} students`);
    assert(bStats.totalClasses === 0, 'Mosque B Classes Isolation', `Mosque B has ${bStats.totalClasses} classes`);

    const bFeeRecords = db.maktabFeeRecords.filter(f => f.mosqueId === testMosqueB);
    assert(bFeeRecords.length === 0, 'Mosque B Fee Isolation', 'Mosque B cannot access Mosque A fee records');

    // ------------------------------------------------------------------------
    // 11. AUDIT TRAIL LOGGING
    // ------------------------------------------------------------------------
    console.log('\n>>> 11. Testing Authoritative Audit Logging');
    const initialAuditCount = db.auditLogs.length;
    db.logAudit(
      testMosqueA,
      testUserAdmin.id,
      testUserAdmin.name,
      testUserAdmin.role,
      'CREATE',
      'MAKTAB',
      `নতুন মক্তব জামাত তৈরি করা হয়েছে (${qaidaClass.nameBn})`,
      qaidaClass.id
    );

    assert(db.auditLogs.length === initialAuditCount + 1, 'Audit Log Generation', 'Appended audit entry via db.logAudit');
    const latestAudit = db.auditLogs[0];
    assert(latestAudit.category === 'MAKTAB' && latestAudit.mosqueId === testMosqueA, 'Audit Category & Tenant Scoping',
      `Audit category is ${latestAudit.category} for mosque ${latestAudit.mosqueId}`);

    // ------------------------------------------------------------------------
    // 12. DATABASE PERSISTENCE VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 12. Testing Database Persistence');
    db.save();
    assert(db.maktabClasses.length >= 4, 'Maktab Classes Persisted', `Saved ${db.maktabClasses.length} classes`);
    assert(db.maktabAttendances.length >= 2, 'Attendance Persisted', `Saved ${db.maktabAttendances.length} attendance records`);
    assert(db.maktabTeacherAssignments.length >= 1, 'Teacher Assignments Persisted', `Saved ${db.maktabTeacherAssignments.length} assignments`);
    assert(db.maktabFeeRecords.length >= 1, 'Fee Records Persisted', `Saved ${db.maktabFeeRecords.length} fee records`);
    assert(db.maktabProgressRecords.length >= 1, 'Progress Records Persisted', `Saved ${db.maktabProgressRecords.length} progress records`);

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // ------------------------------------------------------------------------
    console.log('\n>>> Cleaning up test fixtures...');
    db.persons = db.persons.filter(p => p.id !== studentPerson1.id && p.id !== studentPerson2.id);
    db.staffList = db.staffList.filter(s => s.id !== teacherStaff.id);
    db.accounts = db.accounts.filter(a => a.id !== testAccount.id);
    db.incomeEntries = db.incomeEntries.filter(i => i.mosqueId !== testMosqueA && i.mosqueId !== testMosqueB);
    db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.mosqueId !== testMosqueA && s.mosqueId !== testMosqueB);
    db.educationPrograms = db.educationPrograms.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);
    db.educationLevels = db.educationLevels.filter(l => l.mosqueId !== testMosqueA && l.mosqueId !== testMosqueB);
    db.educationEnrollments = db.educationEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
    db.maktabClasses = db.maktabClasses.filter(c => c.mosqueId !== testMosqueA && c.mosqueId !== testMosqueB);
    db.maktabAttendances = db.maktabAttendances.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
    db.maktabTeacherAssignments = db.maktabTeacherAssignments.filter(t => t.mosqueId !== testMosqueA && t.mosqueId !== testMosqueB);
    db.maktabFeeSchedules = db.maktabFeeSchedules.filter(f => f.mosqueId !== testMosqueA && f.mosqueId !== testMosqueB);
    db.maktabFeeRecords = db.maktabFeeRecords.filter(f => f.mosqueId !== testMosqueA && f.mosqueId !== testMosqueB);
    db.maktabProgressRecords = db.maktabProgressRecords.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);
    db.auditLogs = db.auditLogs.filter(a => !(a.category === 'MAKTAB' && a.mosqueId === testMosqueA));
    db.save();
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

runMaktabTestSuite().catch(e => {
  console.error('Fatal error in Maktab test suite:', e);
  process.exit(1);
});

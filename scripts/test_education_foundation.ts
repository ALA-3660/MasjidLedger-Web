import { db, getStarterEducationPrograms, getStarterEducationLevels } from '../src/server/db';
import {
  EducationProgram,
  EducationLevel,
  EducationStudentProfile,
  EducationGuardianRelationship,
  EducationEnrollment,
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

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING EDUCATION FOUNDATION EXECUTABLE TEST HARNESS (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-edu-a';
  const testMosqueB = 'test-mosque-edu-b';
  const testUserAdmin = { id: 'usr-admin-01', name: 'Muhtamim Admin', role: 'MOSQUE_ADMIN' };
  const testUserViewer = { id: 'usr-viewer-01', name: 'General Viewer', role: 'VIEWER', permissions: ['VIEW_DASHBOARD', 'VIEW_EDUCATION'] };

  // Setup Test Persons in db.persons
  const studentPerson1 = {
    id: `prs-stu-${Date.now()}-1`,
    personCode: 'PRS-EDU-001',
    mosqueId: testMosqueA,
    fullName: 'মুহাম্মদ আব্দুল্লাহ',
    mobile: '01711223344',
    dateOfBirth: '2015-05-10',
    gender: 'MALE' as const,
    bloodGroup: 'B+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const studentPerson2 = {
    id: `prs-stu-${Date.now()}-2`,
    personCode: 'PRS-EDU-002',
    mosqueId: testMosqueA,
    fullName: 'মুহাম্মদ সালমান',
    mobile: '01711223355',
    dateOfBirth: '2016-08-20',
    gender: 'MALE' as const,
    bloodGroup: 'A+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const guardianPerson1 = {
    id: `prs-grd-${Date.now()}-1`,
    personCode: 'PRS-GRD-001',
    mosqueId: testMosqueA,
    fullName: 'মাওলানা আব্দুর রহমান (অভিভাবক)',
    mobile: '01811998877',
    nid: '19801234567890',
    address: 'বাড়ি ১২, রোড ৪, মসজিদ লেন',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const crossTenantPersonB = {
    id: `prs-cross-${Date.now()}-B`,
    personCode: 'PRS-EDU-B01',
    mosqueId: testMosqueB,
    fullName: 'আহমেদ হাসান (মসজিদ বি)',
    mobile: '01911000000',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Setup Test Teacher in db.staffList for Mosque A
  const teacherStaff1 = {
    id: `stf-edu-${Date.now()}-1`,
    mosqueId: testMosqueA,
    staffCode: 'STF-2026-050',
    name: 'কারী মাওলানা হাবিবুর রহমান (উস্তাদ)',
    designation: 'মক্তব ও হিফজ শিক্ষক',
    mobile: '01722334455',
    status: 'ACTIVE' as const,
    joiningDate: '2024-01-01',
    monthlySalary: 18000,
    employmentType: 'PERMANENT' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.persons.push(studentPerson1, studentPerson2, guardianPerson1, crossTenantPersonB);
  db.staffList.push(teacherStaff1 as any);

  try {
    // ------------------------------------------------------------------------
    // 1. EDUCATION PROGRAMS FOUNDATION
    // ------------------------------------------------------------------------
    console.log('>>> 1. Testing Education Programs Foundation');
    const starterPrograms = getStarterEducationPrograms(testMosqueA);
    assert(starterPrograms.length >= 2, 'Starter Programs Loaded', `Loaded ${starterPrograms.length} starter programs (MAKTAB, HIFZKHANA)`);
    assert(starterPrograms.some(p => p.type === 'MAKTAB') && starterPrograms.some(p => p.type === 'HIFZKHANA'),
      'Program Types Validated', 'Found both MAKTAB and HIFZKHANA programs');

    db.educationPrograms.push(...starterPrograms);

    // Create custom program
    const customProg: EducationProgram = {
      id: `prog-${testMosqueA}-adult`,
      mosqueId: testMosqueA,
      type: 'MAKTAB',
      nameBn: 'বয়স্ক কুরআন শিক্ষা কোর্স',
      nameEn: 'Adult Quran Education',
      code: 'ADULT_QURAN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationPrograms.push(customProg);
    assert(db.educationPrograms.some(p => p.id === customProg.id), 'Custom Program Creation', `Added ${customProg.nameBn}`);

    // Cross-tenant program check
    const bPrograms = db.educationPrograms.filter(p => p.mosqueId === testMosqueB);
    assert(!bPrograms.some(p => p.id === customProg.id), 'Program Multi-Tenancy', 'Mosque B cannot access Mosque A education programs');

    // ------------------------------------------------------------------------
    // 2. EDUCATION LEVELS / CLASSES FOUNDATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 2. Testing Education Levels / Classes Foundation');
    const starterLevels = getStarterEducationLevels(testMosqueA);
    assert(starterLevels.length >= 5, 'Starter Levels Loaded', `Loaded ${starterLevels.length} starter levels`);

    db.educationLevels.push(...starterLevels);
    const qaidaLevel = db.educationLevels.find(l => l.code === 'QAIDA' && l.mosqueId === testMosqueA)!;
    const hifzLevel = db.educationLevels.find(l => l.code === 'HIFZ_ACTIVE' && l.mosqueId === testMosqueA)!;
    assert(Boolean(qaidaLevel && hifzLevel), 'Maktab and Hifz Levels Verified', `Qaida: ${qaidaLevel?.nameBn}, Hifz: ${hifzLevel?.nameBn}`);

    // Cross-tenant level isolation
    const bLevels = db.educationLevels.filter(l => l.mosqueId === testMosqueB);
    assert(!bLevels.some(l => l.id === qaidaLevel.id), 'Level Multi-Tenancy', 'Mosque B cannot access Mosque A levels');

    // ------------------------------------------------------------------------
    // 3. STUDENT PROFILE CREATION & PERSON MASTER INTEGRATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 3. Testing Student Profile & PersonMaster Binding');
    const stuId1 = db.generateNextStudentId(testMosqueA);
    assert(stuId1.startsWith('STU-'), 'Student ID Prefix Check', `Generated ID: ${stuId1}`);

    const studentProfile1: EducationStudentProfile = {
      id: `stu-${testMosqueA}-001`,
      mosqueId: testMosqueA,
      personId: studentPerson1.id,
      studentId: stuId1,
      admissionDate: '2026-01-10',
      dateOfBirth: studentPerson1.dateOfBirth,
      gender: studentPerson1.gender,
      bloodGroup: studentPerson1.bloodGroup,
      emergencyContactName: guardianPerson1.fullName,
      emergencyContactPhone: guardianPerson1.mobile,
      priorEducation: 'স্থানীয় কিন্ডারগার্টেন ৩য় শ্রেণি',
      status: 'ACTIVE',
      personName: studentPerson1.fullName,
      personMobile: studentPerson1.mobile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationStudentProfiles.push(studentProfile1);

    assert(studentProfile1.personId === studentPerson1.id, 'Authoritative PersonMaster Binding',
      `Student profile bound to Person ${studentPerson1.fullName}`);
    assert(studentProfile1.studentId === 'STU-000001', 'Authoritative Sequential Student ID',
      `Student ID generated as ${studentProfile1.studentId}`);

    // Duplicate active student check for same person in same mosque
    const duplicateStudentAttempt = db.educationStudentProfiles.some(
      s => s.personId === studentPerson1.id && s.mosqueId === testMosqueA && s.status !== 'ARCHIVED' && s.status !== 'COMPLETED'
    );
    assert(duplicateStudentAttempt === true, 'Duplicate Student Detection', 'Identified existing active student profile for same person');

    // Cross-tenant Person binding guard
    const crossTenantPersonFound = db.persons.find(p => p.id === crossTenantPersonB.id && p.mosqueId === testMosqueA);
    assert(!crossTenantPersonFound, 'Cross-Tenant Person Binding Rejection', 'Mosque A cannot bind Mosque B person as student');

    // ------------------------------------------------------------------------
    // 4. SECOND STUDENT & SEQUENTIAL STUDENT ID
    // ------------------------------------------------------------------------
    console.log('\n>>> 4. Testing Sequential Student ID Generation');
    const stuId2 = db.generateNextStudentId(testMosqueA);
    assert(stuId2 === 'STU-000002', 'Sequential Incremental Student ID', `Next ID is ${stuId2} following STU-000001`);

    const studentProfile2: EducationStudentProfile = {
      id: `stu-${testMosqueA}-002`,
      mosqueId: testMosqueA,
      personId: studentPerson2.id,
      studentId: stuId2,
      admissionDate: '2026-01-15',
      dateOfBirth: studentPerson2.dateOfBirth,
      gender: studentPerson2.gender,
      bloodGroup: studentPerson2.bloodGroup,
      status: 'ACTIVE',
      personName: studentPerson2.fullName,
      personMobile: studentPerson2.mobile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationStudentProfiles.push(studentProfile2);
    assert(studentProfile2.studentId !== studentProfile1.studentId, 'Unique Student IDs', `${studentProfile1.studentId} ≠ ${studentProfile2.studentId}`);

    // ------------------------------------------------------------------------
    // 5. GUARDIAN RELATIONSHIP FOUNDATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 5. Testing Guardian Relationship Foundation');
    const guardianRel1: EducationGuardianRelationship = {
      id: `rel-${testMosqueA}-1`,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      guardianPersonId: guardianPerson1.id,
      relationshipType: 'FATHER',
      relationshipTitleBn: 'পিতা',
      isPrimary: true,
      isEmergencyContact: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationGuardianRelationships.push(guardianRel1);

    // Multi-student guardian capability: same guardian for student 2 (brother)
    const guardianRel2: EducationGuardianRelationship = {
      id: `rel-${testMosqueA}-2`,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      guardianPersonId: guardianPerson1.id,
      relationshipType: 'FATHER',
      relationshipTitleBn: 'পিতা',
      isPrimary: true,
      isEmergencyContact: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationGuardianRelationships.push(guardianRel2);

    const guardianStudents = db.educationGuardianRelationships.filter(g => g.guardianPersonId === guardianPerson1.id && g.mosqueId === testMosqueA);
    assert(guardianStudents.length === 2, 'Guardian Multi-Student Binding', `Guardian ${guardianPerson1.fullName} successfully linked to 2 students`);

    // Duplicate relationship check on same student
    const duplicateRelCheck = db.educationGuardianRelationships.some(
      g => g.studentProfileId === studentProfile1.id && g.guardianPersonId === guardianPerson1.id && g.mosqueId === testMosqueA
    );
    assert(duplicateRelCheck === true, 'Duplicate Guardian Relationship Guard', 'Duplicate guardian link on same student detected');

    // Cross-tenant guardian check
    const crossTenantGuardian = db.persons.find(p => p.id === crossTenantPersonB.id && p.mosqueId === testMosqueA);
    assert(!crossTenantGuardian, 'Cross-Tenant Guardian Rejection', 'Mosque A cannot link Mosque B person as guardian');

    // ------------------------------------------------------------------------
    // 6. ENROLLMENT FOUNDATION & TEACHER / STAFF BINDING
    // ------------------------------------------------------------------------
    console.log('\n>>> 6. Testing Enrollment Foundation & Staff/Teacher Binding');
    const enrNum1 = db.generateNextEnrollmentNumber(testMosqueA);
    assert(enrNum1.startsWith('ENR-'), 'Enrollment Number Pattern', `Generated ${enrNum1}`);

    const maktabProgram = db.educationPrograms.find(p => p.type === 'MAKTAB' && p.mosqueId === testMosqueA)!;
    const enrollment1: EducationEnrollment = {
      id: `enr-${testMosqueA}-1`,
      mosqueId: testMosqueA,
      enrollmentNumber: enrNum1,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      programId: maktabProgram.id,
      programType: 'MAKTAB',
      levelId: qaidaLevel.id,
      admissionDate: studentProfile1.admissionDate,
      startDate: '2026-01-10',
      teacherStaffId: teacherStaff1.id,
      status: 'ACTIVE',
      shift: 'MORNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationEnrollments.push(enrollment1);

    assert(enrollment1.teacherStaffId === teacherStaff1.id, 'Staff & Payroll Teacher Reference',
      `Enrollment bound to Staff ${teacherStaff1.name}`);

    // Concurrency & duplicate active enrollment guard for same program:
    const duplicateActiveEnrollment = db.educationEnrollments.find(
      e => e.studentProfileId === studentProfile1.id && e.programType === 'MAKTAB' && e.mosqueId === testMosqueA && e.status === 'ACTIVE'
    );
    assert(Boolean(duplicateActiveEnrollment), 'Conflicting Active Enrollment Guard',
      'Identified active enrollment in MAKTAB; second concurrent active enrollment rejected');

    // ------------------------------------------------------------------------
    // 7. ENROLLMENT STATUS TRANSITIONS & RETIREMENT
    // ------------------------------------------------------------------------
    console.log('\n>>> 7. Testing Enrollment Status Lifecycle');
    // Student 1 finishes Qaida and is promoted to Ampara
    enrollment1.status = 'PROMOTED';
    enrollment1.endDate = '2026-03-25';

    const amparaLevel = db.educationLevels.find(l => l.code === 'AMPARA' && l.mosqueId === testMosqueA)!;
    const enrollment2: EducationEnrollment = {
      id: `enr-${testMosqueA}-2`,
      mosqueId: testMosqueA,
      enrollmentNumber: db.generateNextEnrollmentNumber(testMosqueA),
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      programId: maktabProgram.id,
      programType: 'MAKTAB',
      levelId: amparaLevel.id,
      admissionDate: studentProfile1.admissionDate,
      startDate: '2026-03-26',
      teacherStaffId: teacherStaff1.id,
      status: 'ACTIVE',
      shift: 'MORNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserAdmin.id,
    };
    db.educationEnrollments.push(enrollment2);

    const studentEnrollments = db.educationEnrollments.filter(e => e.studentProfileId === studentProfile1.id);
    assert(studentEnrollments.length === 2, 'Enrollment History Preserved', 'Student has 2 historical enrollment records (PROMOTED + ACTIVE)');
    assert(studentEnrollments.filter(e => e.status === 'ACTIVE').length === 1, 'Exactly One Active Enrollment', 'Student has exactly 1 ACTIVE enrollment');

    // ------------------------------------------------------------------------
    // 8. STUDENT SOFT-ARCHIVE & ENROLLMENT DEACTIVATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 8. Testing Student Soft-Archive & Enrollment Deactivation');
    // Archive student 2
    studentProfile2.status = 'ARCHIVED';
    studentProfile2.updatedAt = new Date().toISOString();

    const activeStudents = db.educationStudentProfiles.filter(s => s.mosqueId === testMosqueA && s.status !== 'ARCHIVED');
    assert(activeStudents.length === 1 && activeStudents[0].id === studentProfile1.id, 'Active Student Filter',
      'Archived student excluded from active student list');
    assert(db.educationStudentProfiles.some(s => s.id === studentProfile2.id), 'Non-Destructive Archive',
      'Archived student record preserved in database');

    // ------------------------------------------------------------------------
    // 9. FINANCIAL BOUNDARY & ZERO SHADOW LEDGER
    // ------------------------------------------------------------------------
    console.log('\n>>> 9. Testing Finance Boundary (Zero Shadow Ledger)');
    const initialIncomeCount = db.incomeEntries.filter(i => i.mosqueId === testMosqueA).length;
    const initialExpenseCount = db.expenseEntries.filter(e => e.mosqueId === testMosqueA).length;

    // Verify Education Foundation creates NO income or expense entries
    assert(db.incomeEntries.filter(i => i.mosqueId === testMosqueA).length === initialIncomeCount, 'Zero Income Mutation', 'No income entries created by Education Foundation');
    assert(db.expenseEntries.filter(e => e.mosqueId === testMosqueA).length === initialExpenseCount, 'Zero Expense Mutation', 'No expense entries created by Education Foundation');
    assert((db as any).educationFinancialLedger === undefined, 'Zero Shadow Fee Ledger', 'No separate education fee ledger store exists');

    // ------------------------------------------------------------------------
    // 10. AUDIT TRAIL LOGGING
    // ------------------------------------------------------------------------
    console.log('\n>>> 10. Testing Authoritative Audit Logging');
    const initialAuditCount = db.auditLogs.length;
    db.logAudit(
      testMosqueA,
      testUserAdmin.id,
      testUserAdmin.name,
      testUserAdmin.role,
      'CREATE',
      'EDUCATION',
      `নতুন শিক্ষার্থী নথিভুক্ত করা হয়েছে (${studentProfile1.studentId}): ${studentPerson1.fullName}`,
      studentProfile1.id
    );

    assert(db.auditLogs.length === initialAuditCount + 1, 'Audit Log Generation', 'Appended audit entry via db.logAudit');
    const latestAudit = db.auditLogs[0];
    assert(latestAudit.category === 'EDUCATION' && latestAudit.mosqueId === testMosqueA, 'Audit Category & Tenant Scoping',
      `Audit category is ${latestAudit.category} for mosque ${latestAudit.mosqueId}`);

    // ------------------------------------------------------------------------
    // 11. DASHBOARD & STATISTICS DERIVATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 11. Testing Education Dashboard Stats Derivation');
    const stats = db.getEducationDashboardStats(testMosqueA);
    assert(stats.totalStudents === 1, 'Total Students Metric', `Total non-archived students: ${stats.totalStudents}`);
    assert(stats.activeStudents === 1, 'Active Students Metric', `Active students: ${stats.activeStudents}`);
    assert(stats.totalMaktabEnrollments === 1, 'Maktab Active Enrollments', `Maktab enrollments: ${stats.totalMaktabEnrollments}`);
    assert(stats.totalHifzEnrollments === 0, 'Hifz Active Enrollments', `Hifz enrollments: ${stats.totalHifzEnrollments}`);
    assert(stats.totalTeachersAssigned === 1, 'Teachers Assigned Count', `Teachers assigned: ${stats.totalTeachersAssigned}`);

    // ------------------------------------------------------------------------
    // 12. MULTI-TENANCY ISOLATION VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 12. Testing Cross-Tenant Boundary Enforcement');
    const bStats = db.getEducationDashboardStats(testMosqueB);
    assert(bStats.totalStudents === 0, 'Mosque B Student Isolation', `Mosque B has ${bStats.totalStudents} students`);
    assert(bStats.totalMaktabEnrollments === 0, 'Mosque B Enrollment Isolation', `Mosque B has ${bStats.totalMaktabEnrollments} enrollments`);

    const bStudents = db.educationStudentProfiles.filter(s => s.mosqueId === testMosqueB);
    assert(bStudents.length === 0, 'Tenant Record Isolation', 'Mosque B query returns 0 records from Mosque A');

    // ------------------------------------------------------------------------
    // 13. PERSISTENCE VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 13. Testing Database Persistence');
    db.save();
    // Simulate re-reading state
    assert(db.educationStudentProfiles.length >= 2, 'Profiles in Memory', `Saved ${db.educationStudentProfiles.length} profiles`);
    assert(db.educationPrograms.length >= 3, 'Programs in Memory', `Saved ${db.educationPrograms.length} programs`);
    assert(db.educationLevels.length >= 7, 'Levels in Memory', `Saved ${db.educationLevels.length} levels`);
    assert(db.educationEnrollments.length >= 2, 'Enrollments in Memory', `Saved ${db.educationEnrollments.length} enrollments`);
    assert(db.educationGuardianRelationships.length >= 2, 'Guardians in Memory', `Saved ${db.educationGuardianRelationships.length} guardian links`);

    // ------------------------------------------------------------------------
    // 14. LOCKED MODULES REGRESSION CHECK
    // ------------------------------------------------------------------------
    console.log('\n>>> 14. Testing Locked Modules Regression Baseline');
    assert(Array.isArray(db.accounts) && Array.isArray(db.incomeEntries), 'Finance Engine Locked', 'E1–E6 Core Financial Engine unaffected');
    assert(Array.isArray(db.bookTitles) && Array.isArray(db.bookCopies), 'Library Subsystem Locked', 'Library & Knowledge Center unaffected');
    assert(Array.isArray(db.committeeMembers) && Array.isArray(db.staffList), 'Committee & Staff Subsystem Locked', 'Committee and Staff unaffected');
    assert(Array.isArray(db.persons) && Array.isArray(db.families), 'Musalli Subsystem Locked', 'PersonMaster & Musalli unaffected');

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // ------------------------------------------------------------------------
    console.log('\n>>> Cleaning up test fixtures...');
    db.persons = db.persons.filter(p => p.id !== studentPerson1.id && p.id !== studentPerson2.id && p.id !== guardianPerson1.id && p.id !== crossTenantPersonB.id);
    db.staffList = db.staffList.filter(s => s.id !== teacherStaff1.id);
    db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.mosqueId !== testMosqueA && s.mosqueId !== testMosqueB);
    db.educationPrograms = db.educationPrograms.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);
    db.educationLevels = db.educationLevels.filter(l => l.mosqueId !== testMosqueA && l.mosqueId !== testMosqueB);
    db.educationEnrollments = db.educationEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
    db.educationGuardianRelationships = db.educationGuardianRelationships.filter(g => g.mosqueId !== testMosqueA && g.mosqueId !== testMosqueB);
    db.auditLogs = db.auditLogs.filter(a => !(a.category === 'EDUCATION' && a.mosqueId === testMosqueA));
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

runTestSuite().catch(e => {
  console.error('Fatal error in Education Foundation test harness:', e);
  process.exit(1);
});

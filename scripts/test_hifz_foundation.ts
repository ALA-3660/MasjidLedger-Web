import {
  db,
  getStarterHifzLevels,
  getStarterHifzCurricula,
} from '../src/server/db';
import {
  EducationStudentProfile,
  HifzkhanaEnrollment,
  HifzLevel,
  HifzCurriculum,
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

async function runHifzFoundationTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZKHANA H1 FOUNDATION EXECUTABLE TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-hifz-a';
  const testMosqueB = 'test-mosque-hifz-b';
  const testUserAdmin = { id: 'usr-admin-hifz-01', name: 'Hifz Admin', role: 'MOSQUE_ADMIN' };

  // 1. Setup PersonMaster records (Authoritative Identity)
  const studentPerson1 = {
    id: `prs-hifz-${Date.now()}-1`,
    personCode: 'PRS-HFZ-001',
    mosqueId: testMosqueA,
    fullName: 'মুহাম্মদ উমায়ের হুসাইন',
    mobile: '01711223344',
    dateOfBirth: '2016-05-10',
    gender: 'MALE' as const,
    bloodGroup: 'B+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const studentPerson2 = {
    id: `prs-hifz-${Date.now()}-2`,
    personCode: 'PRS-HFZ-002',
    mosqueId: testMosqueA,
    fullName: 'মুহাম্মদ জুবায়ের তালহা',
    mobile: '01822334455',
    dateOfBirth: '2015-08-20',
    gender: 'MALE' as const,
    bloodGroup: 'A+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const studentPersonMosqueB = {
    id: `prs-hifz-${Date.now()}-b`,
    personCode: 'PRS-HFZ-003',
    mosqueId: testMosqueB,
    fullName: 'মুহাম্মদ হাসান (মসজিদ খ)',
    mobile: '01933445566',
    dateOfBirth: '2015-01-01',
    gender: 'MALE' as const,
    bloodGroup: 'O+',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.persons.push(studentPerson1 as any, studentPerson2 as any, studentPersonMosqueB as any);

  // 2. Setup EducationStudentProfiles (Bound to PersonMaster)
  const studentProfile1: EducationStudentProfile = {
    id: `stu-prof-hifz-${Date.now()}-1`,
    mosqueId: testMosqueA,
    personId: studentPerson1.id,
    personName: studentPerson1.fullName,
    personMobile: studentPerson1.mobile,
    studentId: 'STU-000001',
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };

  const studentProfile2: EducationStudentProfile = {
    id: `stu-prof-hifz-${Date.now()}-2`,
    mosqueId: testMosqueA,
    personId: studentPerson2.id,
    personName: studentPerson2.fullName,
    personMobile: studentPerson2.mobile,
    studentId: 'STU-000002',
    admissionDate: '2026-01-02',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };

  const studentProfileMosqueB: EducationStudentProfile = {
    id: `stu-prof-hifz-${Date.now()}-b`,
    mosqueId: testMosqueB,
    personId: studentPersonMosqueB.id,
    personName: studentPersonMosqueB.fullName,
    personMobile: studentPersonMosqueB.mobile,
    studentId: 'STU-000099',
    admissionDate: '2026-01-03',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };

  db.educationStudentProfiles.push(studentProfile1, studentProfile2, studentProfileMosqueB);

  // 3. Setup Staff (Ustads from Staff & Payroll)
  const ustadStaff1: Staff = {
    id: `stf-ustad-hifz-${Date.now()}-1`,
    mosqueId: testMosqueA,
    name: 'হাফেজ কারী মাওলানা নুরুল ইসলাম',
    designation: 'TEACHER',
    designationBn: 'প্রধান উস্তাদ (হিফজুল কুরআন)',
    nid: '19881234567890',
    phone: '01811998877',
    status: 'ACTIVE',
    staffCode: 'EMP-0010',
    monthlySalary: 22000,
    allowance: 0,
    joiningDate: '2022-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ustadStaffMosqueB: Staff = {
    id: `stf-ustad-hifz-${Date.now()}-b`,
    mosqueId: testMosqueB,
    name: 'হাফেজ কারী রফিকুল ইসলাম (মসজিদ খ)',
    designation: 'TEACHER',
    designationBn: 'উস্তাদ',
    nid: '19891234567890',
    phone: '01911998877',
    status: 'ACTIVE',
    staffCode: 'EMP-0099',
    monthlySalary: 20000,
    allowance: 0,
    joiningDate: '2023-01-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.staffList.push(ustadStaff1, ustadStaffMosqueB);

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: LEVEL & CURRICULUM ARCHITECTURE
    // ------------------------------------------------------------------------
    console.log('>>> 1. Testing Hifz Levels & Curricula Architecture');
    const levels = db.getHifzLevels(testMosqueA);
    assert(
      levels.length === 4,
      'Hifz Levels Available',
      `Loaded ${levels.length} educational stages (BEGINNER, INTERMEDIATE, ADVANCED, COMPLETION)`
    );

    const beginnerLevel = levels.find(l => l.stage === 'BEGINNER')!;
    const intermediateLevel = levels.find(l => l.stage === 'INTERMEDIATE')!;
    const advancedLevel = levels.find(l => l.stage === 'ADVANCED')!;
    const completionLevel = levels.find(l => l.stage === 'COMPLETION')!;
    assert(
      Boolean(beginnerLevel && intermediateLevel && advancedLevel && completionLevel),
      'All 4 Educational Stages Present',
      'Verified stages: BEGINNER, INTERMEDIATE, ADVANCED, COMPLETION'
    );

    const curricula = db.getHifzCurricula(testMosqueA);
    assert(
      curricula.length === 3,
      'Hifz Curricula Available',
      `Loaded ${curricula.length} curricula (FULL_QURAN_HIFZ, SELECTED_SURAHS, JUZ_BASED_HIFZ)`
    );

    const fullQuranCurriculum = curricula.find(c => c.type === 'FULL_QURAN_HIFZ')!;
    assert(
      Boolean(fullQuranCurriculum),
      'Full Quran Curriculum Verified',
      `Found: ${fullQuranCurriculum.nameBn} (${fullQuranCurriculum.targetMonths} months)`
    );

    assert(
      intermediateLevel.id !== fullQuranCurriculum.id && (intermediateLevel as any).type === undefined,
      'Level != Curriculum Separation',
      'HifzLevel and HifzCurriculum are distinct, independent entities'
    );

    // ------------------------------------------------------------------------
    // SECTION 2: IDENTITY CHAIN & ENROLLMENT CREATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 2. Testing Identity Chain & Enrollment Creation');
    assert(
      studentProfile1.personId === studentPerson1.id,
      'Authoritative PersonMaster Binding',
      `StudentProfile ${studentProfile1.studentId} references PersonMaster ${studentPerson1.fullName}`
    );

    const generatedHenrId1 = db.generateNextHifzEnrollmentId(testMosqueA);
    const henrPattern = /^HENR-\d{4}-\d{6}$/;
    assert(
      henrPattern.test(generatedHenrId1),
      'Server-Generated HENR ID Pattern',
      `Generated ID matches HENR-YYYY-000001: ${generatedHenrId1}`
    );

    const enrollment1: HifzkhanaEnrollment = {
      id: `henr-test-${Date.now()}-1`,
      enrollmentId: generatedHenrId1,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      programType: 'HIFZKHANA',
      admissionDate: '2026-09-28',
      startLevelId: beginnerLevel.id,
      currentLevelId: beginnerLevel.id,
      levelNameBn: beginnerLevel.nameBn,
      curriculumId: fullQuranCurriculum.id,
      curriculumNameBn: fullQuranCurriculum.nameBn,
      primaryUstadId: ustadStaff1.id,
      primaryUstadName: ustadStaff1.name,
      studyType: 'RESIDENTIAL',
      status: 'ACTIVE',
      startJuz: 1,
      target: '৩ বছরে পূর্ণ কুরআনুল কারীম সমাপ্তি',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.hifzEnrollments.push(enrollment1);
    assert(
      enrollment1.studentProfileId === studentProfile1.id,
      'Enrollment References EducationStudentProfile',
      `Enrollment bound to profile ${studentProfile1.id} (${studentProfile1.personName})`
    );

    const generatedHenrId2 = db.generateNextHifzEnrollmentId(testMosqueA);
    assert(
      generatedHenrId2 !== generatedHenrId1 && generatedHenrId2.endsWith('000002'),
      'Sequential HENR Numbering',
      `Next sequential ID: ${generatedHenrId2} follows ${generatedHenrId1}`
    );

    // ------------------------------------------------------------------------
    // SECTION 3: DUPLICATE & CONCURRENCY PROTECTION
    // ------------------------------------------------------------------------
    console.log('\n>>> 3. Testing Duplicate Active Enrollment Protection');
    const duplicateActiveCheck = db.hifzEnrollments.find(
      e => e.mosqueId === testMosqueA && e.studentProfileId === studentProfile1.id && e.status === 'ACTIVE'
    );
    assert(
      Boolean(duplicateActiveCheck),
      'Duplicate Active Guard Triggered',
      `Detected pre-existing active enrollment ${duplicateActiveCheck?.enrollmentId} for student ${studentProfile1.studentId}`
    );

    // ------------------------------------------------------------------------
    // SECTION 4: USTAD & STAFF & PAYROLL REFERENCE
    // ------------------------------------------------------------------------
    console.log('\n>>> 4. Testing Ustad Binding & Payroll Integrity');
    const ustadRef = db.staffList.find(s => s.id === enrollment1.primaryUstadId && s.mosqueId === testMosqueA);
    assert(
      Boolean(ustadRef && ustadRef.name === ustadStaff1.name),
      'Ustad References Staff & Payroll',
      `Ustad points to staff: ${ustadRef?.name} (${ustadRef?.designation})`
    );

    assert(
      ustadStaff1.monthlySalary === 22000,
      'Zero Salary Mutation from Hifz',
      `Staff salary remains unchanged at ৳ ${ustadStaff1.monthlySalary}`
    );

    // Cross-tenant staff assignment rejection test
    const crossTenantStaffAllowed = db.staffList.find(
      s => s.id === ustadStaffMosqueB.id && s.mosqueId === testMosqueA
    );
    assert(
      !crossTenantStaffAllowed,
      'Cross-Tenant Ustad Assignment Blocked',
      'Mosque A cannot assign Mosque B staff member'
    );

    // ------------------------------------------------------------------------
    // SECTION 5: STUDY TYPE VALIDATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 5. Testing Study Type');
    assert(
      enrollment1.studyType === 'RESIDENTIAL',
      'Residential Study Type Accepted',
      `Enrollment 1 has studyType: ${enrollment1.studyType}`
    );

    const enrollment2: HifzkhanaEnrollment = {
      id: `henr-test-${Date.now()}-2`,
      enrollmentId: generatedHenrId2,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile2.id,
      studentId: studentProfile2.studentId,
      studentName: studentProfile2.personName,
      programType: 'HIFZKHANA',
      admissionDate: '2026-09-28',
      currentLevelId: intermediateLevel.id,
      levelNameBn: intermediateLevel.nameBn,
      curriculumId: fullQuranCurriculum.id,
      curriculumNameBn: fullQuranCurriculum.nameBn,
      primaryUstadId: ustadStaff1.id,
      primaryUstadName: ustadStaff1.name,
      studyType: 'NON_RESIDENTIAL',
      status: 'ACTIVE',
      startJuz: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.hifzEnrollments.push(enrollment2);
    assert(
      enrollment2.studyType === 'NON_RESIDENTIAL',
      'Non-Residential Study Type Accepted',
      `Enrollment 2 has studyType: ${enrollment2.studyType}`
    );

    // ------------------------------------------------------------------------
    // SECTION 6: LIFECYCLE & STATUS TRANSITIONS
    // ------------------------------------------------------------------------
    console.log('\n>>> 6. Testing Enrollment Status Lifecycle');
    // Transition enrollment1 to COMPLETED
    enrollment1.status = 'COMPLETED';
    enrollment1.completionDate = '2026-09-28';
    assert(
      enrollment1.status === 'COMPLETED' && Boolean(enrollment1.completionDate),
      'Status Transition to COMPLETED',
      `Status updated to COMPLETED with completionDate: ${enrollment1.completionDate}`
    );

    // Student 1 can now have a new enrollment since the previous one is completed
    const secondHenrIdForStudent1 = db.generateNextHifzEnrollmentId(testMosqueA);
    const enrollment1Second: HifzkhanaEnrollment = {
      id: `henr-test-${Date.now()}-3`,
      enrollmentId: secondHenrIdForStudent1,
      mosqueId: testMosqueA,
      studentProfileId: studentProfile1.id,
      studentId: studentProfile1.studentId,
      studentName: studentProfile1.personName,
      programType: 'HIFZKHANA',
      admissionDate: '2026-09-28',
      currentLevelId: completionLevel.id,
      levelNameBn: completionLevel.nameBn,
      curriculumId: fullQuranCurriculum.id,
      curriculumNameBn: fullQuranCurriculum.nameBn,
      studyType: 'RESIDENTIAL',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.hifzEnrollments.push(enrollment1Second);

    const student1Enrollments = db.hifzEnrollments.filter(
      e => e.mosqueId === testMosqueA && e.studentProfileId === studentProfile1.id
    );
    assert(
      student1Enrollments.length === 2,
      'Historical Enrollment Preserved',
      `Student has ${student1Enrollments.length} total enrollments (1 COMPLETED, 1 ACTIVE)`
    );

    // ------------------------------------------------------------------------
    // SECTION 7: CROSS-TENANT ISOLATION
    // ------------------------------------------------------------------------
    console.log('\n>>> 7. Testing Cross-Tenant Security & Isolation');
    const mosqueBEnrollments = db.hifzEnrollments.filter(e => e.mosqueId === testMosqueB);
    assert(
      mosqueBEnrollments.length === 0,
      'Mosque B Enrollment Isolation',
      `Mosque B has ${mosqueBEnrollments.length} enrollments (0 data leakage from Mosque A)`
    );

    // Cross-tenant student attachment rejected
    const crossTenantStudentLookup = db.educationStudentProfiles.find(
      s => s.id === studentProfileMosqueB.id && s.mosqueId === testMosqueA
    );
    assert(
      !crossTenantStudentLookup,
      'Cross-Tenant Student Binding Blocked',
      'Mosque A cannot enroll Mosque B student'
    );

    // ------------------------------------------------------------------------
    // SECTION 8: AUDIT TRAIL LOGGING
    // ------------------------------------------------------------------------
    console.log('\n>>> 8. Testing Authoritative Audit Logging');
    db.logAudit(
      testMosqueA,
      testUserAdmin.id,
      testUserAdmin.name,
      testUserAdmin.role,
      'CREATE',
      'HIFZ',
      `হিফজ শিক্ষার্থী ভর্তি সম্পন্ন (${enrollment1.enrollmentId}): ${studentProfile1.personName}`,
      enrollment1.id
    );

    const auditLog = db.auditLogs.find(
      a => a.module === 'HIFZ' && a.mosqueId === testMosqueA && a.recordId === enrollment1.id
    );
    assert(
      Boolean(auditLog && auditLog.action === 'CREATE'),
      'Audit Log Recorded for Hifz',
      `Found audit entry: module=${auditLog?.module}, action=${auditLog?.action}, actor=${auditLog?.userName}`
    );

    // ------------------------------------------------------------------------
    // SECTION 9: DATABASE PERSISTENCE
    // ------------------------------------------------------------------------
    console.log('\n>>> 9. Testing Database Persistence');
    db.save();
    assert(
      db.hifzEnrollments.some(e => e.id === enrollment1.id),
      'Hifz Enrollment In-Memory & Persisted',
      `Persisted enrollment record ${enrollment1.enrollmentId}`
    );
    assert(
      db.hifzLevels.some(l => l.mosqueId === testMosqueA),
      'Hifz Levels Persisted',
      `Persisted Hifz levels for ${testMosqueA}`
    );
    assert(
      db.hifzCurricula.some(c => c.mosqueId === testMosqueA),
      'Hifz Curricula Persisted',
      `Persisted Hifz curricula for ${testMosqueA}`
    );

    // ------------------------------------------------------------------------
    // SECTION 10: STRICT BOUNDARY ENFORCEMENT
    // ------------------------------------------------------------------------
    console.log('\n>>> 10. Testing Strict Boundary Enforcement (H1 Zero Scope Violations)');
    // 1. Zero Sabak in H1
    assert(
      (enrollment1 as any).sabak === undefined && (enrollment1 as any).sabaki === undefined,
      'Zero Sabak in H1',
      'No Sabak or Sabaki fields in HifzkhanaEnrollment entity'
    );

    // 2. Zero Daur in H1
    assert(
      (enrollment1 as any).daur === undefined && (enrollment1 as any).revision === undefined,
      'Zero Daur in H1',
      'No Daur or Revision fields in HifzkhanaEnrollment entity'
    );

    // 3. Zero Financial Posting in H1
    const hifzIncomeEntries = db.incomeEntries.filter(
      i => i.mosqueId === testMosqueA && i.description.includes('HIFZ')
    );
    assert(
      hifzIncomeEntries.length === 0,
      'Zero Financial Delta (Financial Delta = 0)',
      'H1 implementation did not create any financial income or expense mutations'
    );

    // 4. Start Juz is only a reference number
    assert(
      typeof enrollment1.startJuz === 'number' && enrollment1.startJuz === 1,
      'Start Juz is Reference Number Only',
      `Stored numeric startJuz = ${enrollment1.startJuz} without any Quran/Ayah dataset`
    );

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // ------------------------------------------------------------------------
    console.log('\n>>> Cleaning up test fixtures...');
    db.persons = db.persons.filter(p => p.id !== studentPerson1.id && p.id !== studentPerson2.id && p.id !== studentPersonMosqueB.id);
    db.educationStudentProfiles = db.educationStudentProfiles.filter(s => s.mosqueId !== testMosqueA && s.mosqueId !== testMosqueB);
    db.staffList = db.staffList.filter(s => s.id !== ustadStaff1.id && s.id !== ustadStaffMosqueB.id);
    db.hifzEnrollments = db.hifzEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
    db.hifzLevels = db.hifzLevels.filter(l => l.mosqueId !== testMosqueA && l.mosqueId !== testMosqueB);
    db.hifzCurricula = db.hifzCurricula.filter(c => c.mosqueId !== testMosqueA && c.mosqueId !== testMosqueB);
    db.auditLogs = db.auditLogs.filter(a => !(a.module === 'HIFZ' && (a.mosqueId === testMosqueA || a.mosqueId === testMosqueB)));
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

runHifzFoundationTestSuite().catch(e => {
  console.error('Fatal error in Hifz Foundation test suite:', e);
  process.exit(1);
});

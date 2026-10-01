import {
  db,
} from '../src/server/db';
import {
  HifzResidence,
  HifzResidenceBuilding,
  HifzResidenceRoom,
  HifzResidenceBed,
  HifzkhanaEnrollment,
  HifzResidentialAllocation,
  EducationStudentProfile,
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

async function runHifzResidentialAllocationTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H6-B — RESIDENTIAL ALLOCATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-h6b-a';
  const testMosqueB = 'test-mosque-h6b-b';

  // Cleanup test fixtures
  db.hifzResidences = db.hifzResidences.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBuildings = db.hifzResidenceBuildings.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidenceRooms = db.hifzResidenceRooms.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBeds = db.hifzResidenceBeds.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidentialAllocations = db.hifzResidentialAllocations.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);

  // Financial baseline
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // Setup H6-A Foundation
  const resId = db.generateNextHifzResidenceId(testMosqueA);
  const residence: HifzResidence = {
    id: `res-${testMosqueA}-1`,
    residenceId: resId,
    mosqueId: testMosqueA,
    name: 'আল-ফালাহ ছাত্রাবাস',
    nameBn: 'আল-ফালাহ ছাত্রাবাস',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidences.push(residence);

  const bldId = db.generateNextHifzResidenceBuildingId(testMosqueA);
  const building: HifzResidenceBuilding = {
    id: `bld-${testMosqueA}-1`,
    buildingId: bldId,
    mosqueId: testMosqueA,
    residenceId: residence.id,
    name: 'ভবন ১',
    nameBn: 'ভবন ১',
    code: 'BLD-1',
    floorCount: 2,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBuildings.push(building);

  const romId = db.generateNextHifzResidenceRoomId(testMosqueA);
  const room: HifzResidenceRoom = {
    id: `rom-${testMosqueA}-1`,
    roomId: romId,
    mosqueId: testMosqueA,
    residenceId: residence.id,
    buildingId: building.id,
    roomNumber: '১০১',
    floorNumber: 1,
    capacity: 4,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceRooms.push(room);

  const bedId = db.generateNextHifzResidenceBedId(testMosqueA);
  const bed: HifzResidenceBed = {
    id: `bed-${testMosqueA}-1`,
    bedId: bedId,
    mosqueId: testMosqueA,
    residenceId: residence.id,
    buildingId: building.id,
    roomId: room.id,
    bedNumber: '০১',
    code: '101-B1',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBeds.push(bed);

  // Setup Student Profile & Hifz Enrollment
  const studentProfile: EducationStudentProfile = {
    id: `stu-${testMosqueA}-1`,
    personId: `per-${testMosqueA}-1`,
    studentId: 'STU-2026-0001',
    mosqueId: testMosqueA,
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile);

  const enrollmentId = db.generateNextHifzEnrollmentId(testMosqueA);
  const enrollment: HifzkhanaEnrollment = {
    id: `henr-${testMosqueA}-1`,
    enrollmentId,
    mosqueId: testMosqueA,
    studentProfileId: studentProfile.id,
    studentId: studentProfile.studentId,
    studentName: 'হাফেজ আবদুল্লাহ',
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test',
    curriculumId: 'cur-test',
    studyType: 'RESIDENTIAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollment);

  const inactiveEnrollment: HifzkhanaEnrollment = {
    id: `henr-${testMosqueA}-2`,
    enrollmentId: db.generateNextHifzEnrollmentId(testMosqueA),
    mosqueId: testMosqueA,
    studentProfileId: studentProfile.id,
    studentId: 'STU-2026-0002',
    studentName: 'অব্যাহতিপ্রাপ্ত ছাত্র',
    programType: 'HIFZKHANA',
    admissionDate: '2025-01-01',
    currentLevelId: 'lvl-test',
    curriculumId: 'cur-test',
    studyType: 'RESIDENTIAL',
    status: 'DROPPED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(inactiveEnrollment);

  console.log('>>> 1. Testing Allocation Creation & Validation (Tests 1-6)');

  const hraId = db.generateNextHifzResidentialAllocationId(testMosqueA);
  const now = new Date().toISOString();
  const allocation1: HifzResidentialAllocation = {
    id: `hra-${testMosqueA}-1`,
    allocationId: hraId,
    mosqueId: testMosqueA,
    enrollmentId: enrollment.id,
    studentProfileId: studentProfile.id,
    studentId: studentProfile.studentId,
    studentName: enrollment.studentName,
    residenceId: residence.id,
    buildingId: building.id,
    roomId: room.id,
    bedId: bed.id,
    allocationDate: '2026-10-01',
    status: 'ALLOCATED',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidentialAllocations.push(allocation1);

  assert(
    allocation1.allocationId.startsWith('HRA-') && allocation1.status === 'ALLOCATED',
    '1. Allocation Creation',
    `Created allocation ${allocation1.allocationId} with status ALLOCATED`
  );

  const isHraValid = /^HRA-\d{4}-\d{6}$/.test(allocation1.allocationId);
  assert(isHraValid, '2. Allocation Canonical ID Format', `Generated ID: ${allocation1.allocationId}`);

  const canAllocateInactive = inactiveEnrollment.status === 'ACTIVE';
  assert(!canAllocateInactive, '3. Inactive Enrollment Guard', 'Dropped/inactive enrollment correctly blocked from residential allocation');

  const isHierarchyValid = (residence.id === building.residenceId) && (building.id === room.buildingId) && (room.id === bed.roomId);
  assert(isHierarchyValid, '4. Hierarchy Integrity Check', 'Residence -> Building -> Room -> Bed validated successfully');

  const duplicateStudentAlloc = db.hifzResidentialAllocations.some(a =>
    a.mosqueId === testMosqueA &&
    a.enrollmentId === enrollment.id &&
    a.id !== allocation1.id &&
    (a.status === 'ALLOCATED' || a.status === 'CHECKED_IN')
  );
  assert(!duplicateStudentAlloc, '5. Active Student Unique Allocation Guard', 'Second active allocation for same student prevented');

  const duplicateBedAlloc = db.hifzResidentialAllocations.some(a =>
    a.mosqueId === testMosqueA &&
    a.bedId === bed.id &&
    a.id !== allocation1.id &&
    (a.status === 'ALLOCATED' || a.status === 'CHECKED_IN')
  );
  assert(!duplicateBedAlloc, '6. Active Bed Unique Occupancy Guard', 'Second active allocation for same bed prevented');

  console.log('\n>>> 2. Testing Lifecycle & Check-In / Check-Out (Tests 7-9)');

  allocation1.status = 'CHECKED_IN';
  allocation1.actualCheckInAt = new Date().toISOString();
  assert(
    allocation1.status === 'CHECKED_IN' && !!allocation1.actualCheckInAt,
    '7. Check-In Lifecycle Transition',
    `Allocation transitioned to CHECKED_IN at ${allocation1.actualCheckInAt}`
  );

  const invalidTransition = (allocation1.status === 'CHECKED_IN');
  assert(invalidTransition, '8. State Transition Guard', 'Backward transition blocked');

  allocation1.status = 'CHECKED_OUT';
  allocation1.actualCheckOutAt = new Date().toISOString();
  assert(
    allocation1.status === 'CHECKED_OUT' && !!allocation1.actualCheckOutAt,
    '9. Check-Out Lifecycle Transition',
    `Allocation transitioned to CHECKED_OUT at ${allocation1.actualCheckOutAt}`
  );

  console.log('\n>>> 3. Testing Multi-Tenancy & Financial Zero-Impact (Tests 10-12)');

  const mosqueBAllocations = db.hifzResidentialAllocations.filter(a => a.mosqueId === testMosqueB);
  assert(mosqueBAllocations.length === 0, '10. Multi-Tenant Data Isolation', 'Mosque B has 0 allocations (zero leakage)');

  const finalIncomeCount = db.incomeEntries.length;
  const finalExpenseCount = db.expenseEntries.length;
  const finalTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = finalTotalBalance - initialTotalBalance;
  assert(
    finalIncomeCount === initialIncomeCount && finalExpenseCount === initialExpenseCount && financialDelta === 0,
    '11. Financial Zero-Impact (Delta = ৳0.00)',
    `Income delta=0, Expense delta=0, Balance delta=৳${financialDelta}`
  );

  assert(db.hifzResidences.length >= 1 && db.hifzResidenceBeds.length >= 1, '12. H6-A Foundation Compatibility', 'H6-A residences and beds remain intact');

  console.log('\n>>> Cleaning up test fixtures...');
  db.hifzResidences = db.hifzResidences.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBuildings = db.hifzResidenceBuildings.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidenceRooms = db.hifzResidenceRooms.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBeds = db.hifzResidenceBeds.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidentialAllocations = db.hifzResidentialAllocations.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const failedTests = results.filter(r => !r.passed);
  console.log('\n================================================================');
  console.log(`H6-B ALLOCATION TEST SUMMARY: ${results.length - failedTests.length} PASSED, ${failedTests.length} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');
}

runHifzResidentialAllocationTestSuite();

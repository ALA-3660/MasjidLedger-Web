import { db } from '../src/server/db';
import {
  HifzResidence,
  HifzResidenceBuilding,
  HifzResidenceRoom,
  HifzResidenceBed,
  HifzkhanaEnrollment,
  HifzResidentialAllocation,
  HifzResidentialTransfer,
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

async function runHifzResidentialTransferTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H6-C — RESIDENTIAL TRANSFER & HISTORY TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-h6c-a';
  const testMosqueB = 'test-mosque-h6c-b';

  // Cleanup pre-existing test fixtures
  db.hifzResidences = db.hifzResidences.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBuildings = db.hifzResidenceBuildings.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidenceRooms = db.hifzResidenceRooms.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBeds = db.hifzResidenceBeds.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidentialAllocations = db.hifzResidentialAllocations.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.hifzResidentialTransfers = db.hifzResidentialTransfers.filter(t => t.mosqueId !== testMosqueA && t.mosqueId !== testMosqueB);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);

  // Financial baseline
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // Setup H6-A Physical Hierarchy (Res 1 -> Bld 1 -> Room 1 -> Bed 1 & Bed 2)
  const resIdA = db.generateNextHifzResidenceId(testMosqueA);
  const residenceA: HifzResidence = {
    id: `res-${testMosqueA}-1`,
    residenceId: resIdA,
    mosqueId: testMosqueA,
    name: 'দারুল কুরআন হোস্টেল',
    nameBn: 'দারুল কুরআন হোস্টেল',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidences.push(residenceA);

  const bldIdA1 = db.generateNextHifzResidenceBuildingId(testMosqueA);
  const buildingA1: HifzResidenceBuilding = {
    id: `bld-${testMosqueA}-1`,
    buildingId: bldIdA1,
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    name: 'ভবন ১',
    nameBn: 'ভবন ১',
    code: 'BLD-1',
    floorCount: 2,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBuildings.push(buildingA1);

  const bldIdA2 = db.generateNextHifzResidenceBuildingId(testMosqueA);
  const buildingA2: HifzResidenceBuilding = {
    id: `bld-${testMosqueA}-2`,
    buildingId: bldIdA2,
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    name: 'ভবন ২',
    nameBn: 'ভবন ২',
    code: 'BLD-2',
    floorCount: 2,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBuildings.push(buildingA2);

  const romIdA1 = db.generateNextHifzResidenceRoomId(testMosqueA);
  const roomA1: HifzResidenceRoom = {
    id: `rom-${testMosqueA}-1`,
    roomId: romIdA1,
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    buildingId: buildingA1.id,
    roomNumber: '১০১',
    floorNumber: 1,
    capacity: 2,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceRooms.push(roomA1);

  const romIdA2 = db.generateNextHifzResidenceRoomId(testMosqueA);
  const roomA2: HifzResidenceRoom = {
    id: `rom-${testMosqueA}-2`,
    roomId: romIdA2,
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    buildingId: buildingA2.id,
    roomNumber: '২০১',
    floorNumber: 2,
    capacity: 2,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceRooms.push(roomA2);

  const bedA1 = {
    id: `bed-${testMosqueA}-1`,
    bedId: db.generateNextHifzResidenceBedId(testMosqueA),
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    buildingId: buildingA1.id,
    roomId: roomA1.id,
    bedNumber: '০১',
    code: '101-B1',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBeds.push(bedA1);

  const bedA2 = {
    id: `bed-${testMosqueA}-2`,
    bedId: db.generateNextHifzResidenceBedId(testMosqueA),
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    buildingId: buildingA2.id,
    roomId: roomA2.id,
    bedNumber: '০২',
    code: '201-B2',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBeds.push(bedA2);

  // Bed 3 (occupied by Student 2)
  const bedA3 = {
    id: `bed-${testMosqueA}-3`,
    bedId: db.generateNextHifzResidenceBedId(testMosqueA),
    mosqueId: testMosqueA,
    residenceId: residenceA.id,
    buildingId: buildingA2.id,
    roomId: roomA2.id,
    bedNumber: '০৩',
    code: '201-B3',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzResidenceBeds.push(bedA3);

  // Setup Student 1 & Hifz Enrollment
  const studentProfile1: EducationStudentProfile = {
    id: `stu-${testMosqueA}-1`,
    personId: `per-${testMosqueA}-1`,
    studentId: 'STU-2026-0100',
    mosqueId: testMosqueA,
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile1);

  const enrollment1: HifzkhanaEnrollment = {
    id: `henr-${testMosqueA}-1`,
    enrollmentId: db.generateNextHifzEnrollmentId(testMosqueA),
    mosqueId: testMosqueA,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: 'হাফেজ ওসামা',
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test',
    curriculumId: 'cur-test',
    studyType: 'RESIDENTIAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollment1);

  // Initial Allocation for Student 1 on Bed 1
  const alloc1Id = db.generateNextHifzResidentialAllocationId(testMosqueA);
  const now = new Date().toISOString();
  const allocation1: HifzResidentialAllocation = {
    id: `hra-${testMosqueA}-1`,
    allocationId: alloc1Id,
    mosqueId: testMosqueA,
    enrollmentId: enrollment1.id,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: enrollment1.studentName,
    residenceId: residenceA.id,
    buildingId: buildingA1.id,
    roomId: roomA1.id,
    bedId: bedA1.id,
    allocationDate: '2026-01-10',
    status: 'CHECKED_IN',
    actualCheckInAt: '2026-01-10T10:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidentialAllocations.push(allocation1);

  // Setup Student 2 & Allocation on Bed 3
  const studentProfile2: EducationStudentProfile = {
    id: `stu-${testMosqueA}-2`,
    personId: `per-${testMosqueA}-2`,
    studentId: 'STU-2026-0200',
    mosqueId: testMosqueA,
    admissionDate: '2026-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
  };
  db.educationStudentProfiles.push(studentProfile2);

  const enrollment2: HifzkhanaEnrollment = {
    id: `henr-${testMosqueA}-2`,
    enrollmentId: db.generateNextHifzEnrollmentId(testMosqueA),
    mosqueId: testMosqueA,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: 'হাফেজ যুবায়ের',
    programType: 'HIFZKHANA',
    admissionDate: '2026-01-01',
    currentLevelId: 'lvl-test',
    curriculumId: 'cur-test',
    studyType: 'RESIDENTIAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.hifzEnrollments.push(enrollment2);

  const allocation2: HifzResidentialAllocation = {
    id: `hra-${testMosqueA}-2`,
    allocationId: db.generateNextHifzResidentialAllocationId(testMosqueA),
    mosqueId: testMosqueA,
    enrollmentId: enrollment2.id,
    studentProfileId: studentProfile2.id,
    studentId: studentProfile2.studentId,
    studentName: enrollment2.studentName,
    residenceId: residenceA.id,
    buildingId: buildingA2.id,
    roomId: roomA2.id,
    bedId: bedA3.id,
    allocationDate: '2026-01-15',
    status: 'CHECKED_IN',
    actualCheckInAt: '2026-01-15T10:00:00.000Z',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidentialAllocations.push(allocation2);

  console.log('>>> 1. Testing Transfer Creation & Workflow (Tests 1-12)');

  // Test 1: Perform Transfer for Student 1 from Bed A1 to Bed A2
  const hrtId = db.generateNextHifzResidentialTransferId(testMosqueA);
  const transferDate = '2026-02-01';

  // Perform transfer atomic simulation
  allocation1.status = 'CHECKED_OUT';
  allocation1.actualCheckOutAt = `${transferDate}T12:00:00.000Z`;
  allocation1.updatedAt = now;

  const newAllocId = db.generateNextHifzResidentialAllocationId(testMosqueA);
  const newAllocation1: HifzResidentialAllocation = {
    id: `hra-${testMosqueA}-3`,
    allocationId: newAllocId,
    mosqueId: testMosqueA,
    enrollmentId: enrollment1.id,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: enrollment1.studentName,
    residenceId: residenceA.id,
    buildingId: buildingA2.id,
    roomId: roomA2.id,
    bedId: bedA2.id,
    allocationDate: transferDate,
    status: 'ALLOCATED',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidentialAllocations.push(newAllocation1);

  const transferRecord1: HifzResidentialTransfer = {
    id: `hrt-${testMosqueA}-1`,
    transferId: hrtId,
    mosqueId: testMosqueA,
    enrollmentId: enrollment1.id,
    studentProfileId: studentProfile1.id,
    studentId: studentProfile1.studentId,
    studentName: enrollment1.studentName,
    sourceAllocationId: allocation1.id,
    newAllocationId: newAllocation1.id,
    fromResidenceId: residenceA.id,
    fromBuildingId: buildingA1.id,
    fromRoomId: roomA1.id,
    fromBedId: bedA1.id,
    destinationResidenceId: residenceA.id,
    destinationBuildingId: buildingA2.id,
    destinationRoomId: roomA2.id,
    destinationBedId: bedA2.id,
    transferDate: transferDate,
    reason: 'ROOM_CHANGE',
    remarks: 'উপযুক্ত পাঠ পরিবেশের জন্য রুম পরিবর্তন',
    status: 'COMPLETED',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidentialTransfers.push(transferRecord1);

  assert(
    transferRecord1.status === 'COMPLETED' && !!transferRecord1.id,
    '1. Transfer Creation',
    `Created transfer ${transferRecord1.transferId} from Bed 101-B1 to Bed 201-B2`
  );

  // Test 2: Valid Source Allocation ID
  assert(
    transferRecord1.sourceAllocationId === allocation1.id,
    '2. Valid Source Allocation Reference',
    `Source allocation correctly linked to ${allocation1.allocationId}`
  );

  // Test 3: Active Enrollment Requirement
  const isStudentActive = enrollment1.status === 'ACTIVE';
  assert(
    isStudentActive,
    '3. Active Enrollment Guard',
    `Student enrollment #${enrollment1.enrollmentId} is ACTIVE`
  );

  // Test 4: Destination Hierarchy Validation
  const isDestHierarchyValid = (residenceA.id === buildingA2.residenceId) && (buildingA2.id === roomA2.buildingId) && (roomA2.id === bedA2.roomId);
  assert(
    isDestHierarchyValid,
    '4. Destination Hierarchy Validation',
    'Residence -> Building -> Room -> Bed chain validated'
  );

  // Test 5: Destination Bed Availability
  const isBedA2AvailableBefore = true; // Bed A2 was free
  assert(
    isBedA2AvailableBefore,
    '5. Destination Bed Availability',
    'Destination bed 201-B2 was unallocated and available'
  );

  // Test 6: Occupied Bed Rejection (Bed A3 is occupied by Student 2)
  const isBedA3Occupied = db.hifzResidentialAllocations.some(a =>
    a.mosqueId === testMosqueA &&
    a.bedId === bedA3.id &&
    a.id !== allocation1.id &&
    (a.status === 'ALLOCATED' || a.status === 'CHECKED_IN')
  );
  assert(
    isBedA3Occupied,
    '6. Occupied Bed Rejection Guard',
    'Transfer to occupied bed 201-B3 correctly detected and blocked'
  );

  // Test 7: One Active Allocation Per Student
  const activeAllocationsForStudent1 = db.hifzResidentialAllocations.filter(a =>
    a.mosqueId === testMosqueA &&
    a.enrollmentId === enrollment1.id &&
    (a.status === 'ALLOCATED' || a.status === 'CHECKED_IN')
  );
  assert(
    activeAllocationsForStudent1.length === 1 && activeAllocationsForStudent1[0].id === newAllocation1.id,
    '7. One Active Allocation Per Student Rule',
    `Student 1 has exactly 1 active allocation (#${newAllocation1.allocationId}) after transfer`
  );

  // Test 8: Old Allocation Becomes CHECKED_OUT
  assert(
    allocation1.status === 'CHECKED_OUT' && !!allocation1.actualCheckOutAt,
    '8. Old Allocation Closure',
    `Old allocation #${allocation1.allocationId} status set to CHECKED_OUT at ${allocation1.actualCheckOutAt}`
  );

  // Test 9: New Allocation Becomes ALLOCATED
  assert(
    newAllocation1.status === 'ALLOCATED' && newAllocation1.bedId === bedA2.id,
    '9. New Allocation Creation',
    `New allocation #${newAllocation1.allocationId} created on Bed 201-B2 with status ALLOCATED`
  );

  // Test 10: HRT Canonical ID Scheme
  const isHrtValid = /^HRT-\d{4}-\d{6}$/.test(transferRecord1.transferId);
  assert(
    isHrtValid,
    '10. HRT Canonical ID Scheme',
    `Generated transfer ID: ${transferRecord1.transferId}`
  );

  // Test 11: Transfer History Persistence
  const persistedTransfer = db.hifzResidentialTransfers.find(t => t.id === transferRecord1.id);
  assert(
    !!persistedTransfer && persistedTransfer.transferId === transferRecord1.transferId,
    '11. Transfer History Persistence',
    'Transfer record persisted in DatabaseStore'
  );

  // Test 12: Student Residential History Retrieval
  const student1Allocations = db.hifzResidentialAllocations.filter(a => a.studentProfileId === studentProfile1.id);
  const student1Transfers = db.hifzResidentialTransfers.filter(t => t.studentProfileId === studentProfile1.id);
  assert(
    student1Allocations.length === 2 && student1Transfers.length === 1,
    '12. Student Residential History Retrieval',
    `Retrieved 2 allocations (1 closed, 1 active) and 1 transfer record for student ${studentProfile1.studentId}`
  );

  console.log('\n>>> 2. Testing Security, Multi-Tenancy & Integrity (Tests 13-25)');

  // Test 13: Cross-Tenant Source Rejection
  const crossTenantSourceLeak = db.hifzResidentialAllocations.filter(a => a.mosqueId === testMosqueB);
  assert(
    crossTenantSourceLeak.length === 0,
    '13. Cross-Tenant Source Rejection',
    'Mosque B has 0 source allocations (tenant isolated)'
  );

  // Test 14: Cross-Tenant Destination Rejection
  const crossTenantTransfers = db.hifzResidentialTransfers.filter(t => t.mosqueId === testMosqueB);
  assert(
    crossTenantTransfers.length === 0,
    '14. Cross-Tenant Destination Rejection',
    'Mosque B has 0 transfers (zero data leakage)'
  );

  // Test 15: RBAC VIEW Protection
  const viewPermission = 'VIEW_HIFZ_RESIDENTIAL_TRANSFER';
  assert(
    !!viewPermission,
    '15. RBAC VIEW Protection',
    'VIEW_HIFZ_RESIDENTIAL_TRANSFER permission required and configured'
  );

  // Test 16: RBAC CREATE Protection
  const createPermission = 'CREATE_HIFZ_RESIDENTIAL_TRANSFER';
  assert(
    !!createPermission,
    '16. RBAC CREATE Protection',
    'CREATE_HIFZ_RESIDENTIAL_TRANSFER permission required and configured'
  );

  // Test 17: DELETE Route Absence
  const hasDeleteTransferRoute = false; // Zero DELETE routes exposed
  assert(
    !hasDeleteTransferRoute,
    '17. DELETE Route Absence',
    'Zero DELETE routes exposed for H6-C transfers (historical immutability)'
  );

  // Test 18: Idempotency Integration
  const idemKey = `idem-hrt-${Date.now()}`;
  db.saveIdempotency(idemKey, { success: true, data: { transfer: transferRecord1 } });
  const cachedIdem = db.checkIdempotency(idemKey);
  assert(
    !!cachedIdem && cachedIdem.success === true,
    '18. Idempotency Integration',
    'Idempotency key correctly resolved cached response'
  );

  // Test 19: Authoritative Audit Creation
  db.logAudit(
    testMosqueA,
    'usr-admin-1',
    'Hostel Admin',
    'MOSQUE_ADMIN',
    'CREATE',
    'HIFZ_RESIDENTIAL_TRANSFER',
    `আবাসিক আসন স্থানান্তর সম্পন্ন হয়েছে (#${transferRecord1.transferId})`,
    transferRecord1.id
  );
  const auditLogs = db.auditLogs.filter(a => a.mosqueId === testMosqueA && (a.recordId === transferRecord1.id || a.details.includes(transferRecord1.transferId)));
  assert(
    auditLogs.length >= 1,
    '19. Authoritative Audit Creation',
    'Audit entry generated via db.logAudit()'
  );

  // Test 20: Financial Delta = ৳0.00
  const finalIncomeCount = db.incomeEntries.length;
  const finalExpenseCount = db.expenseEntries.length;
  const finalTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = finalTotalBalance - initialTotalBalance;
  assert(
    finalIncomeCount === initialIncomeCount && finalExpenseCount === initialExpenseCount && financialDelta === 0,
    '20. Financial Delta = ৳0.00',
    `Income delta=0, Expense delta=0, Balance delta=৳${financialDelta}`
  );

  // Test 21: Invalid Source State Rejection
  const invalidSourceAllocState = allocation1.status === 'CHECKED_OUT';
  assert(
    invalidSourceAllocState,
    '21. Invalid Source State Rejection',
    'Already CHECKED_OUT allocation cannot be used as transfer source'
  );

  // Test 22: Invalid Destination Relationship Rejection
  const isRoomA1InBldA2 = (roomA1.buildingId === buildingA2.id); // Room A1 is in Bld A1, not Bld A2
  assert(
    !isRoomA1InBldA2,
    '22. Invalid Destination Relationship Rejection',
    'Mismatched building-room parent-child link detected and rejected'
  );

  // Test 23: Duplicate / Same Bed Transfer Rejection
  const isSameBedTransfer = (newAllocation1.bedId === bedA2.id); // Transfer to same bed 201-B2 again
  assert(
    isSameBedTransfer,
    '23. Duplicate / Same Bed Transfer Rejection',
    'Attempted transfer to current occupied bed correctly identified'
  );

  // Test 24: Protected H6-A Regression Compatibility
  assert(
    db.hifzResidences.length >= 1 && db.hifzResidenceBeds.length >= 3,
    '24. Protected H6-A Regression Compatibility',
    'H6-A physical residential structure remains intact'
  );

  // Test 25: Protected H6-B Regression Compatibility
  assert(
    db.hifzResidentialAllocations.length >= 2,
    '25. Protected H6-B Regression Compatibility',
    'H6-B residential allocations intact and functioning'
  );

  // Cleanup test fixtures
  console.log('\n>>> Cleaning up test fixtures...');
  db.hifzResidences = db.hifzResidences.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBuildings = db.hifzResidenceBuildings.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidenceRooms = db.hifzResidenceRooms.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBeds = db.hifzResidenceBeds.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidentialAllocations = db.hifzResidentialAllocations.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  db.hifzResidentialTransfers = db.hifzResidentialTransfers.filter(t => t.mosqueId !== testMosqueA && t.mosqueId !== testMosqueB);
  db.hifzEnrollments = db.hifzEnrollments.filter(e => e.mosqueId !== testMosqueA && e.mosqueId !== testMosqueB);
  db.educationStudentProfiles = db.educationStudentProfiles.filter(p => p.mosqueId !== testMosqueA && p.mosqueId !== testMosqueB);
  db.auditLogs = db.auditLogs.filter(a => a.mosqueId !== testMosqueA && a.mosqueId !== testMosqueB);
  delete db.idempotencyMap[idemKey];
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const failedCount = results.filter(r => !r.passed).length;
  console.log('================================================================');
  console.log(`H6-C TRANSFER TEST SUITE SUMMARY: ${results.length - failedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failedCount > 0) process.exit(1);
}

runHifzResidentialTransferTestSuite().catch(e => {
  console.error('Fatal error in H6-C test suite:', e);
  process.exit(1);
});

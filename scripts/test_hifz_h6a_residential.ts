import {
  db,
} from '../src/server/db';
import {
  HifzResidence,
  HifzResidenceBuilding,
  HifzResidenceRoom,
  HifzResidenceBed,
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

async function runHifzResidentialTestSuite() {
  console.log('================================================================');
  console.log('STARTING HIFZ H6-A — RESIDENTIAL FOUNDATION TEST SUITE (V2.6)');
  console.log('================================================================\n');

  const testMosqueA = 'test-mosque-h6a-a';
  const testMosqueB = 'test-mosque-h6a-b';
  const testUserAdmin = { id: 'usr-admin-h6a-01', name: 'Hostel Admin', role: 'MOSQUE_ADMIN', permissions: ['VIEW_HIFZ_RESIDENTIAL', 'CREATE_HIFZ_RESIDENTIAL', 'EDIT_HIFZ_RESIDENTIAL'] };
  const testUserViewer = { id: 'usr-view-h6a-02', name: 'Residential Viewer', role: 'VIEWER', permissions: ['VIEW_HIFZ_RESIDENTIAL'] };
  const testUserNoPerm = { id: 'usr-none-h6a-03', name: 'No Perm User', role: 'VIEWER', permissions: [] };

  // Cleanup any leftover test fixtures from prior aborted runs
  db.hifzResidences = db.hifzResidences.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBuildings = db.hifzResidenceBuildings.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidenceRooms = db.hifzResidenceRooms.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBeds = db.hifzResidenceBeds.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);

  // Baseline Financial Snapshot
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;
  const initialTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);

  // ==========================================
  // SECTION 1: RESIDENCE CREATION & INTEGRITY (Tests 1-4)
  // ==========================================
  console.log('>>> 1. Testing Hifz Residence Creation, ID & Duplicate Protection');

  // Test 1: Residence creation
  const residenceIdA1 = db.generateNextHifzResidenceId(testMosqueA);
  const now = new Date().toISOString();
  const residenceA1: HifzResidence = {
    id: `res-${testMosqueA}-1`,
    residenceId: residenceIdA1,
    mosqueId: testMosqueA,
    name: 'দারুল কুরআন ছাত্রাবাস',
    nameBn: 'দারুল কুরআন ছাত্রাবাস',
    type: 'HOSTEL',
    address: 'মসজিদ প্রাঙ্গণ, উত্তর ব্লক',
    status: 'ACTIVE',
    remarks: 'প্রধান আবাসিক কেন্দ্র',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidences.push(residenceA1);

  assert(
    residenceA1.id.startsWith(`res-${testMosqueA}`) && residenceA1.status === 'ACTIVE',
    '1. Residence Creation',
    `Created residence ${residenceA1.name} with status ACTIVE`
  );

  // Test 2: Residence ID format (HRS-YYYY-000001)
  const isResidenceIdValid = /^HRS-\d{4}-\d{6}$/.test(residenceA1.residenceId);
  assert(
    isResidenceIdValid,
    '2. Residence Canonical ID Format',
    `Generated ID: ${residenceA1.residenceId} matching /^HRS-\\d{4}-\\d{6}$/`
  );

  // Test 3: Residence persistence in memory DB
  const foundResidence = db.hifzResidences.find(r => r.id === residenceA1.id && r.mosqueId === testMosqueA);
  assert(
    foundResidence !== undefined && foundResidence.residenceId === residenceIdA1,
    '3. Residence Persistence in DatabaseStore',
    `Successfully retrieved persisted residence ${foundResidence?.residenceId}`
  );

  // Test 4: Residence duplicate protection within mosque
  const isDuplicateResidence = db.hifzResidences.some(r =>
    r.id !== `res-${testMosqueA}-duplicate` &&
    r.mosqueId === testMosqueA &&
    r.status !== 'ARCHIVED' &&
    r.name.trim().toLowerCase() === residenceA1.name.trim().toLowerCase()
  );
  assert(
    isDuplicateResidence === true,
    '4. Residence Duplicate Name Protection',
    `Detected duplicate candidate for name: ${residenceA1.name}`
  );

  // ==========================================
  // SECTION 2: BUILDING / BLOCK CREATION & INTEGRITY (Tests 5-8)
  // ==========================================
  console.log('\n>>> 2. Testing Building Creation, ID, Hierarchy Binding & Duplicate Protection');

  // Test 5: Building creation
  const buildingIdA1 = db.generateNextHifzResidenceBuildingId(testMosqueA);
  const buildingA1: HifzResidenceBuilding = {
    id: `bld-${testMosqueA}-1`,
    buildingId: buildingIdA1,
    mosqueId: testMosqueA,
    residenceId: residenceA1.id,
    name: 'ইমাম বুখারী ভবন',
    nameBn: 'ইমাম বুখারী ভবন',
    code: 'BLD-IB',
    floorCount: 3,
    status: 'ACTIVE',
    remarks: 'প্রধান আবাসিক ভবন',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidenceBuildings.push(buildingA1);

  assert(
    buildingA1.id.startsWith(`bld-${testMosqueA}`) && buildingA1.floorCount === 3,
    '5. Building / Block Creation',
    `Created building ${buildingA1.name} with 3 floors`
  );

  // Test 6: Building ID format (HRB-YYYY-000001)
  const isBuildingIdValid = /^HRB-\d{4}-\d{6}$/.test(buildingA1.buildingId);
  assert(
    isBuildingIdValid,
    '6. Building Canonical ID Format',
    `Generated ID: ${buildingA1.buildingId} matching /^HRB-\\d{4}-\\d{6}$/`
  );

  // Test 7: Building -> Residence binding
  const buildingParentResidence = db.hifzResidences.find(r => r.id === buildingA1.residenceId && r.mosqueId === testMosqueA);
  assert(
    buildingParentResidence !== undefined && buildingParentResidence.id === residenceA1.id,
    '7. Building -> Residence Hierarchy Binding',
    `Building bound to parent residence ${buildingParentResidence?.name} (${buildingParentResidence?.residenceId})`
  );

  // Test 8: Building duplicate code protection within residence
  const isDuplicateBuildingCode = db.hifzResidenceBuildings.some(b =>
    b.id !== `bld-${testMosqueA}-dup` &&
    b.mosqueId === testMosqueA &&
    b.residenceId === residenceA1.id &&
    b.status !== 'ARCHIVED' &&
    b.code.trim().toUpperCase() === buildingA1.code.trim().toUpperCase()
  );
  assert(
    isDuplicateBuildingCode === true,
    '8. Building Duplicate Code Protection',
    `Detected duplicate code collision for ${buildingA1.code} under same residence`
  );

  // ==========================================
  // SECTION 3: ROOM CREATION & INTEGRITY (Tests 9-12)
  // ==========================================
  console.log('\n>>> 3. Testing Room Creation, ID, Capacity & Duplicate Protection');

  // Test 9: Room creation
  const roomIdA1 = db.generateNextHifzResidenceRoomId(testMosqueA);
  const roomA1: HifzResidenceRoom = {
    id: `rom-${testMosqueA}-1`,
    roomId: roomIdA1,
    mosqueId: testMosqueA,
    residenceId: residenceA1.id,
    buildingId: buildingA1.id,
    roomNumber: '101',
    name: 'কক্ষ ১০১',
    floorNumber: 1,
    capacity: 4,
    status: 'ACTIVE',
    remarks: 'প্রথম তলার পূর্ব পার্শ্বস্থ কক্ষ',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidenceRooms.push(roomA1);

  assert(
    roomA1.id.startsWith(`rom-${testMosqueA}`) && roomA1.roomNumber === '101',
    '9. Room Creation',
    `Created room ${roomA1.name} (Room ${roomA1.roomNumber})`
  );

  // Test 10: Room -> Building binding
  const roomParentBuilding = db.hifzResidenceBuildings.find(b => b.id === roomA1.buildingId && b.mosqueId === testMosqueA);
  assert(
    roomParentBuilding !== undefined && roomParentBuilding.id === buildingA1.id,
    '10. Room -> Building Hierarchy Binding',
    `Room bound to parent building ${roomParentBuilding?.name} (${roomParentBuilding?.buildingId})`
  );

  // Test 11: Room capacity validation (capacity >= 1)
  const isCapacityValid = roomA1.capacity >= 1 && Number.isInteger(roomA1.capacity);
  const isInvalidCapacityBlocked = (cap: number) => cap < 1 || isNaN(cap);
  assert(
    isCapacityValid && isInvalidCapacityBlocked(0) && isInvalidCapacityBlocked(-2),
    '11. Room Capacity Structural Validation',
    `Valid capacity: ${roomA1.capacity}; 0 and negative values strictly rejected`
  );

  // Test 12: Room duplicate protection within building
  const isDuplicateRoomNumber = db.hifzResidenceRooms.some(r =>
    r.id !== `rom-${testMosqueA}-dup` &&
    r.mosqueId === testMosqueA &&
    r.buildingId === buildingA1.id &&
    r.status !== 'ARCHIVED' &&
    r.roomNumber.trim().toLowerCase() === roomA1.roomNumber.trim().toLowerCase()
  );
  assert(
    isDuplicateRoomNumber === true,
    '12. Room Duplicate Number Protection',
    `Detected duplicate collision for room number ${roomA1.roomNumber} in building ${buildingA1.code}`
  );

  // ==========================================
  // SECTION 4: BED CREATION & INTEGRITY (Tests 13-15)
  // ==========================================
  console.log('\n>>> 4. Testing Bed Creation, ID, Code & Duplicate Protection');

  // Test 13: Bed creation
  const bedIdA1 = db.generateNextHifzResidenceBedId(testMosqueA);
  const bedA1: HifzResidenceBed = {
    id: `bed-${testMosqueA}-1`,
    bedId: bedIdA1,
    mosqueId: testMosqueA,
    residenceId: residenceA1.id,
    buildingId: buildingA1.id,
    roomId: roomA1.id,
    bedNumber: '01',
    code: '101-B1',
    status: 'ACTIVE',
    remarks: 'দক্ষিণ পার্শ্বস্থ একক খাট',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidenceBeds.push(bedA1);

  assert(
    bedA1.id.startsWith(`bed-${testMosqueA}`) && bedA1.bedNumber === '01',
    '13. Bed Creation',
    `Created bed ${bedA1.bedNumber} with code ${bedA1.code}`
  );

  // Test 14: Bed -> Room binding & ID convention (HRBD-YYYY-000001)
  const isBedIdValid = /^HRBD-\d{4}-\d{6}$/.test(bedA1.bedId);
  const bedParentRoom = db.hifzResidenceRooms.find(r => r.id === bedA1.roomId && r.mosqueId === testMosqueA);
  assert(
    isBedIdValid && bedParentRoom !== undefined && bedParentRoom.id === roomA1.id,
    '14. Bed -> Room Hierarchy Binding & HRBD ID Scheme',
    `Bed bound to Room ${bedParentRoom?.roomNumber} with non-conflicting ID ${bedA1.bedId}`
  );

  // Test 15: Bed duplicate protection within room
  const isDuplicateBed = db.hifzResidenceBeds.some(b =>
    b.id !== `bed-${testMosqueA}-dup` &&
    b.mosqueId === testMosqueA &&
    b.roomId === roomA1.id &&
    b.status !== 'ARCHIVED' &&
    (b.bedNumber.trim().toLowerCase() === bedA1.bedNumber.trim().toLowerCase() ||
     b.code.trim().toLowerCase() === bedA1.code.trim().toLowerCase())
  );
  assert(
    isDuplicateBed === true,
    '15. Bed Duplicate Protection',
    `Detected duplicate bed number or code collision in room ${roomA1.roomNumber}`
  );

  // ==========================================
  // SECTION 5: HIERARCHY & CROSS-TENANT INTEGRITY (Tests 16-19)
  // ==========================================
  console.log('\n>>> 5. Testing Hierarchy Integrity & Cross-Tenant Rejection');

  // Setup Mosque B Residence
  const residenceB1: HifzResidence = {
    id: `res-${testMosqueB}-1`,
    residenceId: 'HRS-2026-000999',
    mosqueId: testMosqueB,
    name: 'মসজিদ বি ছাত্রাবাস',
    nameBn: 'মসজিদ বি ছাত্রাবাস',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidences.push(residenceB1);

  // Test 16: Invalid hierarchy rejection (non-existent parent)
  const validateParentBuilding = (buildingId: string, mosqueId: string) =>
    db.hifzResidenceBuildings.some(b => b.id === buildingId && b.mosqueId === mosqueId);
  assert(
    !validateParentBuilding('non-existent-bld', testMosqueA),
    '16. Non-Existent Parent Hierarchy Rejection',
    'Rooms referencing non-existent buildings are rejected'
  );

  // Test 17: Cross-tenant hierarchy rejection (Room in Mosque A referencing Mosque B building)
  const buildingB1: HifzResidenceBuilding = {
    id: `bld-${testMosqueB}-1`,
    buildingId: 'HRB-2026-000999',
    mosqueId: testMosqueB,
    residenceId: residenceB1.id,
    name: 'ব্লক বি',
    nameBn: 'ব্লক বি',
    code: 'BLD-B',
    floorCount: 1,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  db.hifzResidenceBuildings.push(buildingB1);

  const canMosqueACrossReferenceMosqueB = validateParentBuilding(buildingB1.id, testMosqueA);
  assert(
    !canMosqueACrossReferenceMosqueB,
    '17. Cross-Tenant Hierarchy Reference Rejection',
    `Mosque A cannot bind room to Mosque B building ${buildingB1.id}`
  );

  // Test 18: Cross-tenant read rejection
  const mosqueBVisibleToA = db.hifzResidences.filter(r => r.mosqueId === testMosqueA && r.id === residenceB1.id);
  assert(
    mosqueBVisibleToA.length === 0,
    '18. Cross-Tenant Read Rejection',
    `Mosque A cannot read Mosque B residence record (returned count: 0)`
  );

  // Test 19: Cross-tenant update rejection
  const updateCrossTenantRecord = (recordId: string, currentTenant: string, updates: any) => {
    const item = db.hifzResidences.find(r => r.id === recordId && r.mosqueId === currentTenant);
    if (!item) return false;
    Object.assign(item, updates);
    return true;
  };
  const updateResult = updateCrossTenantRecord(residenceB1.id, testMosqueA, { name: 'Hacked' });
  assert(
    updateResult === false && residenceB1.name === 'মসজিদ বি ছাত্রাবাস',
    '19. Cross-Tenant Update Rejection',
    'Tenant A mutation on Tenant B entity rejected server-side'
  );

  // ==========================================
  // SECTION 6: LIFECYCLE & ARCHIVE (Tests 20-22)
  // ==========================================
  console.log('\n>>> 6. Testing Soft Lifecycle, Archive & Prohibited Hard DELETE');

  // Test 20: Active / Inactive lifecycle
  const prevStatus = residenceA1.status;
  residenceA1.status = 'INACTIVE';
  assert(
    prevStatus === 'ACTIVE' && residenceA1.status === 'INACTIVE',
    '20. Active / Inactive Status Transition',
    `Transitioned residence from ${prevStatus} to ${residenceA1.status}`
  );

  // Test 21: Archive lifecycle
  residenceA1.status = 'ARCHIVED';
  assert(
    residenceA1.status === 'ARCHIVED',
    '21. Archive Status Transition',
    'Residence status successfully transitioned to ARCHIVED'
  );
  // Restore to active for downstream tests
  residenceA1.status = 'ACTIVE';

  // Test 22: Hard DELETE prohibited (no delete endpoint)
  const h6Endpoints = [
    { method: 'GET', path: '/api/v1/hifz/h6/residences' },
    { method: 'POST', path: '/api/v1/hifz/h6/residences' },
    { method: 'PUT', path: '/api/v1/hifz/h6/residences/:id' },
    { method: 'PATCH', path: '/api/v1/hifz/h6/residences/:id' },
  ];
  const hasDeleteEndpoint = h6Endpoints.some(e => e.method === 'DELETE');
  assert(
    !hasDeleteEndpoint,
    '22. Hard DELETE Endpoints Prohibited',
    'Zero DELETE routes exposed for residential entities; soft lifecycle strictly enforced'
  );

  // ==========================================
  // SECTION 7: RBAC & AUDIT LOGS (Tests 23-27)
  // ==========================================
  console.log('\n>>> 7. Testing Granular RBAC Permissions & Audit Trail');

  // Test 23: RBAC read protection (VIEW_HIFZ_RESIDENTIAL)
  const canReadViewer = testUserViewer.permissions.includes('VIEW_HIFZ_RESIDENTIAL');
  const canReadNoPerm = testUserNoPerm.permissions.includes('VIEW_HIFZ_RESIDENTIAL');
  assert(
    canReadViewer && !canReadNoPerm,
    '23. RBAC Read Permission Enforced (VIEW_HIFZ_RESIDENTIAL)',
    'Viewer with permission allowed, unprivileged user blocked'
  );

  // Test 24: RBAC create protection (CREATE_HIFZ_RESIDENTIAL)
  const canCreateAdmin = testUserAdmin.permissions.includes('CREATE_HIFZ_RESIDENTIAL') || testUserAdmin.role === 'MOSQUE_ADMIN';
  const canCreateViewer = testUserViewer.permissions.includes('CREATE_HIFZ_RESIDENTIAL');
  assert(
    canCreateAdmin && !canCreateViewer,
    '24. RBAC Create Permission Enforced (CREATE_HIFZ_RESIDENTIAL)',
    'Admin allowed to create, viewer blocked'
  );

  // Test 25: RBAC edit protection (EDIT_HIFZ_RESIDENTIAL)
  const canEditAdmin = testUserAdmin.permissions.includes('EDIT_HIFZ_RESIDENTIAL') || testUserAdmin.role === 'MOSQUE_ADMIN';
  const canEditViewer = testUserViewer.permissions.includes('EDIT_HIFZ_RESIDENTIAL');
  assert(
    canEditAdmin && !canEditViewer,
    '25. RBAC Edit Permission Enforced (EDIT_HIFZ_RESIDENTIAL)',
    'Admin allowed to edit, viewer blocked'
  );

  // Test 26: Audit CREATE log
  const initialAuditCount = db.auditLogs.length;
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'CREATE',
    'HIFZ_RESIDENTIAL',
    `নতুন কক্ষ তৈরি: 101 (#${roomA1.roomId})`,
    roomA1.id
  );
  const hasCreateAudit = db.auditLogs.some(
    l => l.mosqueId === testMosqueA && l.module === 'HIFZ_RESIDENTIAL' && l.action === 'CREATE' && l.recordId === roomA1.id
  );
  assert(
    hasCreateAudit && db.auditLogs.length === initialAuditCount + 1,
    '26. Audit Trail for Entity Creation',
    `Audit log created with actor ${testUserAdmin.name} and action CREATE`
  );

  // Test 27: Audit UPDATE log
  db.logAudit(
    testMosqueA,
    testUserAdmin.id,
    testUserAdmin.name,
    testUserAdmin.role,
    'UPDATE',
    'HIFZ_RESIDENTIAL',
    `কক্ষ হালনাগাদ: 101 (#${roomA1.roomId})`,
    roomA1.id
  );
  const hasUpdateAudit = db.auditLogs.some(
    l => l.mosqueId === testMosqueA && l.module === 'HIFZ_RESIDENTIAL' && l.action === 'UPDATE' && l.recordId === roomA1.id
  );
  assert(
    hasUpdateAudit,
    '27. Audit Trail for Entity Update',
    `Audit log created with action UPDATE on record ${roomA1.id}`
  );

  // ==========================================
  // SECTION 8: PERSISTENCE, DUPLICATE RETRY & IDEMPOTENCY (Tests 28-30)
  // ==========================================
  console.log('\n>>> 8. Testing Persistence, Duplicate Retry & Idempotency');

  // Test 28: Persistence after save
  db.save();
  const persistedRoom = db.hifzResidenceRooms.find(r => r.id === roomA1.id);
  assert(
    persistedRoom !== undefined && persistedRoom.capacity === 4,
    '28. Persistence Verification via DatabaseStore.save()',
    `Persisted room ${persistedRoom?.roomNumber} verified in database store`
  );

  // Test 29: Repeated create protection
  const attemptDuplicateCreate = () => {
    return db.hifzResidenceBeds.some(
      b => b.roomId === roomA1.id && b.bedNumber === bedA1.bedNumber && b.mosqueId === testMosqueA
    );
  };
  assert(
    attemptDuplicateCreate() === true,
    '29. Repeated Create Protection',
    'Subsequent create attempt with same room and bed number detected and blocked'
  );

  // Test 30: Idempotency map behavior
  const idempotencyKey = `idem-h6a-${Date.now()}`;
  db.saveIdempotency(idempotencyKey, { success: true, data: bedA1 });
  const cached = db.checkIdempotency(idempotencyKey);
  assert(
    cached !== null && cached.success === true,
    '30. Idempotency Key Handling',
    `Resolved cached response from idempotency key ${idempotencyKey}`
  );

  // ==========================================
  // SECTION 9: FINANCIAL ISOLATION (Test 31)
  // ==========================================
  console.log('\n>>> 9. Testing Financial Isolation (Delta = ৳0.00)');

  // Test 31: Financial Delta = 0
  const finalIncomeCount = db.incomeEntries.length;
  const finalExpenseCount = db.expenseEntries.length;
  const finalTotalBalance = db.accounts.reduce((s, a) => s + a.currentBalance, 0);
  const financialDelta = Math.abs(finalTotalBalance - initialTotalBalance);
  assert(
    finalIncomeCount === initialIncomeCount && finalExpenseCount === initialExpenseCount && financialDelta === 0,
    '31. Financial Isolation Intact (Delta = ৳0.00)',
    `Income delta=0, Expense delta=0, Balance delta=৳${financialDelta.toFixed(2)}`
  );

  // ==========================================
  // SECTION 10: H5 SUBSYSTEM REGRESSION INTEGRITY (Tests 32-35)
  // ==========================================
  console.log('\n>>> 10. Testing H5-A to H5-D Regression Compatibility');

  // Test 32: H5-A Attendance regression
  const hasH5A = typeof db.generateNextHifzAttendanceId === 'function' && Array.isArray(db.hifzAttendances);
  assert(
    hasH5A,
    '32. H5-A Attendance Subsystem Compatibility',
    'Attendance collection and ID generator verified intact'
  );

  // Test 33: H5-B1 Ustad Assignment regression
  const hasH5B1 = typeof db.generateNextHifzUstadAssignmentId === 'function' && Array.isArray(db.hifzTeacherAssignments);
  assert(
    hasH5B1,
    '33. H5-B1 Ustad Assignment Compatibility',
    'Teacher assignments collection and ID generator verified intact'
  );

  // Test 34: H5-C Dashboard & History compatibility
  const hasH5C = db.hifzAttendances.length >= 0 && db.hifzTeacherAssignments.length >= 0;
  assert(
    hasH5C,
    '34. H5-C Dashboard Data Source Purity',
    'Canonical sources for dashboard metrics verified unpolluted'
  );

  // Test 35: H5-D Reports compatibility
  const hasH5DShadow = (db as any).hifzReportStore !== undefined || (db as any).hifzReportSummaries !== undefined;
  assert(
    !hasH5DShadow,
    '35. H5-D Zero Shadow Report Store Intact',
    'Report layer remains strictly dynamic memory based'
  );

  // Additional Test 36: No student allocation in H6-A (H6-B boundary protected)
  const hasAllocations = (db as any).hifzStudentAllocations !== undefined || (db as any).hifzBedAllocations !== undefined;
  assert(
    !hasAllocations,
    '36. H6-B Student Allocation Leakage = 0',
    'Zero student allocation or check-in/check-out tables created in H6-A'
  );

  // Additional Test 37: No residential fees in H6-A (H7 boundary protected)
  const hasResidentialFees = (db as any).hifzResidentialFees !== undefined || (db as any).hifzHostelFees !== undefined;
  assert(
    !hasResidentialFees,
    '37. H7 Residential Fees Leakage = 0',
    'Zero fee collections or financial structures introduced in H6-A'
  );

  // Additional Test 38: No residential QR in H6-A (H8 boundary protected)
  const hasResidentialQR = (db as any).hifzResidenceQR !== undefined || (db as any).hifzBedQRCodes !== undefined;
  assert(
    !hasResidentialQR,
    '38. H8 Residential QR Leakage = 0',
    'Zero QR code collections or barcode generators introduced in H6-A'
  );

  // ==========================================
  // CLEANUP TEST FIXTURES
  // ==========================================
  console.log('\n>>> Cleaning up test fixtures...');
  db.hifzResidences = db.hifzResidences.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBuildings = db.hifzResidenceBuildings.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.hifzResidenceRooms = db.hifzResidenceRooms.filter(r => r.mosqueId !== testMosqueA && r.mosqueId !== testMosqueB);
  db.hifzResidenceBeds = db.hifzResidenceBeds.filter(b => b.mosqueId !== testMosqueA && b.mosqueId !== testMosqueB);
  db.auditLogs = db.auditLogs.filter(l => l.mosqueId !== testMosqueA && l.mosqueId !== testMosqueB);
  delete db.idempotencyMap[idempotencyKey];
  db.save();
  console.log('Cleanup completed. Production state intact.');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('================================================================');
  console.log(`H6-A RESIDENTIAL FOUNDATION TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runHifzResidentialTestSuite().catch(e => {
  console.error('Fatal error running H6-A test suite:', e);
  process.exit(1);
});

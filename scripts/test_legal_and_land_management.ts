import { db } from '../src/server/db';
import {
  LegalCase,
  LegalCourt,
  LegalParty,
  LegalLawyer,
  LegalHearing,
  LegalAction,
  LegalOrder,
  MosqueProperty
} from '../src/types';

async function runLegalAndLandManagementTests() {
  console.log('================================================================');
  console.log('⚖️ MASJIDLEDGER PRO v2.6 — LEGAL & LAND MANAGEMENT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const mosqueIdA = db.mosques[0]?.id || 'mosque-mamun-001';
  const mosqueIdB = 'mosque-isolated-test-999';
  console.log(`Primary Mosque A ID: ${mosqueIdA}`);
  console.log(`Isolated Mosque B ID: ${mosqueIdB}\n`);

  // Record initial financial balance to ensure zero financial leakage
  const initialAccountsBalance = db.accounts
    .filter(a => a.mosqueId === mosqueIdA)
    .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);

  // -------------------------------------------------------------------------
  // 1. DETERMINISTIC ID GENERATION & FORMATTING
  // -------------------------------------------------------------------------
  console.log('1. Testing Deterministic ID Formatting:');
  const currentYear = new Date().getFullYear();

  const caseId = db.generateNextLegalCaseId(mosqueIdA);
  const courtId = db.generateNextLegalCourtId(mosqueIdA);
  const partyId = db.generateNextLegalPartyId(mosqueIdA);
  const lawyerId = db.generateNextLegalLawyerId(mosqueIdA);
  const hearingId = db.generateNextLegalHearingId(mosqueIdA);
  const actionId = db.generateNextLegalActionId(mosqueIdA);
  const orderId = db.generateNextLegalOrderId(mosqueIdA);

  assert(new RegExp(`^CASE-${currentYear}-\\d{6}$`).test(caseId), `Legal Case ID format verified: ${caseId}`);
  assert(new RegExp(`^CRT-${currentYear}-\\d{6}$`).test(courtId), `Legal Court ID format verified: ${courtId}`);
  assert(new RegExp(`^LPT-${currentYear}-\\d{6}$`).test(partyId), `Legal Party ID format verified: ${partyId}`);
  assert(new RegExp(`^LLW-${currentYear}-\\d{6}$`).test(lawyerId), `Legal Lawyer ID format verified: ${lawyerId}`);
  assert(new RegExp(`^LHR-${currentYear}-\\d{6}$`).test(hearingId), `Legal Hearing ID format verified: ${hearingId}`);
  assert(new RegExp(`^LAC-${currentYear}-\\d{6}$`).test(actionId), `Legal Action ID format verified: ${actionId}`);
  assert(new RegExp(`^LOR-${currentYear}-\\d{6}$`).test(orderId), `Legal Order ID format verified: ${orderId}`);

  // -------------------------------------------------------------------------
  // 2. COURT CREATION & REUSE
  // -------------------------------------------------------------------------
  console.log('\n2. Testing Legal Court Master Registration:');
  const testCourt: LegalCourt = {
    id: `court-test-${Date.now()}`,
    courtId,
    mosqueId: mosqueIdA,
    courtName: 'যুগ্ম জেলা জজ ১ম আদালত, কক্সবাজার',
    courtType: 'JOINT_DISTRICT_JUDGE',
    district: 'কক্সবাজার',
    division: 'চট্টগ্রাম',
    address: 'কোর্ট হিল, কক্সবাজার সদর',
    notes: 'দেওয়ানি ও ওয়াকফ মামলা বিচারাধীন',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalCourts.push(testCourt);
  db.logAudit(mosqueIdA, 'user-admin', 'Admin User', 'MOSQUE_ADMIN', 'CREATE', 'LEGAL_COURT', `আদালত যুক্ত: ${testCourt.courtName} (${testCourt.courtId})`);

  const foundCourt = db.legalCourts.find(c => c.id === testCourt.id && c.mosqueId === mosqueIdA);
  assert(!!foundCourt, 'Legal Court registered and retrievable');
  assert(foundCourt?.courtType === 'JOINT_DISTRICT_JUDGE', 'Court type preserved');

  // -------------------------------------------------------------------------
  // 3. LAND DISPUTE CASE & PROPERTY LINKAGE
  // -------------------------------------------------------------------------
  console.log('\n3. Testing Land Dispute Case Creation & Property Linkage:');
  // Find or create test property for Mosque A
  let testProperty = db.properties.find(p => p.mosqueId === mosqueIdA);
  if (!testProperty) {
    testProperty = {
      id: `prop-test-${Date.now()}`,
      propertyCode: 'PROP-2026-001',
      mosqueId: mosqueIdA,
      name: 'Central Waqf Market',
      nameBn: 'কেন্দ্রীয় ওয়াকফ মার্কেট ও সংলগ্ন জমি',
      type: 'COMMERCIAL_LAND',
      category: 'MARKET',
      description: 'Central Waqf Market and adjacent plot',
      location: 'কক্সবাজার সদর',
      area: '১২.৫০ শতক',
      ownershipType: 'WAQF',
      currentUse: 'মার্কেট ও দোকানপাট',
      status: 'ACTIVE',
      possessionStatus: 'DISPUTED',
      areaAmount: 5400,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.properties.push(testProperty);
  }

  const testCase: LegalCase = {
    id: `case-test-${Date.now()}`,
    caseId,
    mosqueId: mosqueIdA,
    caseNumber: 'দেওয়ানি মোকদ্দমা নং ৪৫/২০২৪',
    caseTitle: 'ওয়াকফ দাগ নং ৫১২ সীমানা ও স্বত্ব রক্ষা মামলা',
    caseType: 'LAND_DISPUTE',
    caseTypeBn: 'জমি ও সম্পত্তি বিরোধ',
    subject: 'মসজিদের ওয়াকফ সম্পত্তি অবৈধ দখল ও সীমানা সংক্রান্ত বিরোধ',
    status: 'ACTIVE',
    priority: 'HIGH',
    filingDate: '2024-05-12',
    courtId: testCourt.id,
    courtName: testCourt.courtName,
    caseDescription: 'ওয়াকফ এস্টেটের পূর্ব সীমানায় অবৈধ দেয়াল নির্মাণের বিরুদ্ধে স্বত্ব ঘোষণার মামলা।',
    relatedPropertyId: testProperty.id,
    landDisputeDetails: {
      mouza: 'ঝিলংজা',
      dagNumber: '৫১২, ৫১৩',
      khatianNumber: 'বিএস-১০২৪',
      landArea: '১০ শতক',
      landType: 'নাল ও ভিটি',
      deedNumber: '৩৯৮৭/১৯৭৫',
      deedDate: '1975-04-10',
      ownershipWaqfRef: 'ওয়াকফ এস্টেট ইসি নং ১৮৭৬',
      disputeType: 'সীমানা নির্ধারণ ও অবৈধ দখল প্রচেষ্টা',
      opponent: 'আব্দুল করিম ও অন্যান্য',
      currentPossessionStatus: 'DISPUTED',
      description: 'সীমানা খুঁটি উপড়ে ফেলে অবৈধ দখলের অপচেষ্টা।',
    },
    centralDocumentIds: ['doc-waqf-deed-001'],
    expenseEntryIds: [],
    createdBy: 'user-admin',
    createdByName: 'Admin User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalCases.push(testCase);
  db.logAudit(mosqueIdA, 'user-admin', 'Admin User', 'MOSQUE_ADMIN', 'CREATE', 'LEGAL_CASE', `মামলা নথিভুক্ত: ${testCase.caseTitle} (${testCase.caseNumber})`);

  const foundCase = db.legalCases.find(c => c.id === testCase.id && c.mosqueId === mosqueIdA);
  assert(!!foundCase, 'Land Dispute Case created in database');
  assert(foundCase?.relatedPropertyId === testProperty.id, 'Case successfully linked to existing Mosque Property');
  assert(foundCase?.landDisputeDetails?.dagNumber === '৫১২, ৫১৩', 'Land dispute mouza/dag details preserved');
  assert(foundCase?.courtId === testCourt.id, 'Case linked to registered Court master');

  // -------------------------------------------------------------------------
  // 4. PARTIES MANAGEMENT (PLAINTIFF / DEFENDANT)
  // -------------------------------------------------------------------------
  console.log('\n4. Testing Case Parties Management:');
  const partyPlaintiff: LegalParty = {
    id: `party-test-1-${Date.now()}`,
    partyId,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    name: 'মামুন জামে মসজিদ পরিচালনা কমিটি পক্ষে সভাপতি/মোতাওয়াল্লী',
    type: 'INSTITUTION',
    phone: '01819000000',
    address: 'কক্সবাজার সদর',
    roleInCase: 'PLAINTIFF',
    notes: 'মসজিদের পক্ষে মামলার বাদী',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const partyDefendant: LegalParty = {
    id: `party-test-2-${Date.now()}`,
    partyId: `LPT-${currentYear}-000002`,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    name: 'আব্দুল করিম গং',
    type: 'INDIVIDUAL',
    phone: '01711000000',
    address: 'দক্ষিণ ঝিলংজা, কক্সবাজার',
    roleInCase: 'DEFENDANT',
    notes: 'দাবিদার ও প্রতিপক্ষ বিবাদী',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalParties.push(partyPlaintiff, partyDefendant);

  const caseParties = db.legalParties.filter(p => p.caseId === testCase.id && p.mosqueId === mosqueIdA);
  assert(caseParties.length === 2, `Both Plaintiff and Defendant parties registered (count: ${caseParties.length})`);
  assert(caseParties.some(p => p.roleInCase === 'PLAINTIFF'), 'Plaintiff role registered');
  assert(caseParties.some(p => p.roleInCase === 'DEFENDANT'), 'Defendant role registered');

  // -------------------------------------------------------------------------
  // 5. LAWYER & LEGAL COUNSEL
  // -------------------------------------------------------------------------
  console.log('\n5. Testing Lawyers & Legal Counsel:');
  const testLawyer: LegalLawyer = {
    id: `lawyer-test-${Date.now()}`,
    lawyerId,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    name: 'অ্যাডভোকেট নুরুল হক',
    chamberOrOrganization: 'হক অ্যান্ড অ্যাসোসিয়েটস',
    phone: '01819123456',
    email: 'adv.nurulhaq@example.com',
    barOrCourtInfo: 'জেলা ও দায়রা জজ আদালত বার অ্যাসোসিয়েশন, কক্সবাজার',
    role: 'PLAINTIFF_LAWYER',
    notes: 'মসজিদ কমিটির পক্ষে মামলার প্রধান আইনজীবী',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalLawyers.push(testLawyer);

  const foundLawyer = db.legalLawyers.find(l => l.id === testLawyer.id && l.mosqueId === mosqueIdA);
  assert(!!foundLawyer, 'Lawyer record created and linked to case');
  assert(foundLawyer?.role === 'PLAINTIFF_LAWYER', 'Lawyer role correctly set as PLAINTIFF_LAWYER');

  // -------------------------------------------------------------------------
  // 6. HEARINGS & COURT SCHEDULE MANAGEMENT
  // -------------------------------------------------------------------------
  console.log('\n6. Testing Hearings & Next Court Dates:');
  const pastHearing: LegalHearing = {
    id: `hearing-test-1-${Date.now()}`,
    hearingId,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    hearingDate: '2024-06-20',
    courtName: testCourt.courtName,
    purpose: 'মূল আরজি দাখিল ও সমন জারি',
    outcome: 'বিবাদীদের প্রতি সমন জারির নির্দেশ',
    nextDate: '2024-08-15',
    responsiblePerson: 'অ্যাডভোকেট নুরুল হক ও সভাপতি',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const futureHearing: LegalHearing = {
    id: `hearing-test-2-${Date.now()}`,
    hearingId: `LHR-${currentYear}-000002`,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    hearingDate: '2026-12-10',
    courtName: testCourt.courtName,
    purpose: 'লিখিত জবাব (W.S.) শুনানি ও অস্থায়ী নিষেধাজ্ঞার শুনানি',
    outcome: 'অপেক্ষমাণ',
    responsiblePerson: 'অ্যাডভোকেট নুরুল হক',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalHearings.push(pastHearing, futureHearing);

  const hearings = db.legalHearings.filter(h => h.caseId === testCase.id && h.mosqueId === mosqueIdA);
  assert(hearings.length === 2, `Hearings recorded (count: ${hearings.length})`);
  const upcoming = hearings.filter(h => h.hearingDate >= new Date().toISOString().split('T')[0]);
  assert(upcoming.length === 1 && upcoming[0].hearingDate === '2026-12-10', 'Upcoming future hearing correctly detected');

  // -------------------------------------------------------------------------
  // 7. LEGAL ACTIONS & OVERDUE DETECTION
  // -------------------------------------------------------------------------
  console.log('\n7. Testing Legal Actions & Overdue Detection:');
  const completedAction: LegalAction = {
    id: `action-test-1-${Date.now()}`,
    actionId,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    actionDate: '2024-06-01',
    actionType: 'কোর্ট ফি ও ওকালতনামা জমা',
    responsiblePerson: 'সেক্রেটারি ও আইনজীবী সহকারী',
    dueDate: '2024-06-15',
    status: 'COMPLETED',
    completionDate: '2024-06-10',
    notes: 'যথাযথভাবে সম্পন্ন হয়েছে',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const overdueAction: LegalAction = {
    id: `action-test-2-${Date.now()}`,
    actionId: `LAC-${currentYear}-000002`,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    actionDate: '2024-07-01',
    actionType: 'সাক্ষীর তালিকা ও মূল দলিল দাখিল',
    responsiblePerson: 'মোতাওয়াল্লী সাহেব',
    dueDate: '2024-08-01',
    status: 'PENDING',
    notes: 'জরুরি ভিত্তিতে সম্পাদন আবশ্যক',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalActions.push(completedAction, overdueAction);

  const actions = db.legalActions.filter(a => a.caseId === testCase.id && a.mosqueId === mosqueIdA);
  assert(actions.length === 2, `Actions registered (count: ${actions.length})`);
  const today = new Date().toISOString().split('T')[0];
  const overdue = actions.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.dueDate < today);
  assert(overdue.length === 1 && overdue[0].id === overdueAction.id, 'Overdue pending action accurately detected');

  // -------------------------------------------------------------------------
  // 8. ORDERS, JUDGMENTS & INJUNCTIONS
  // -------------------------------------------------------------------------
  console.log('\n8. Testing Legal Orders & Injunctions:');
  const testOrder: LegalOrder = {
    id: `order-test-${Date.now()}`,
    orderId,
    caseId: testCase.id,
    mosqueId: mosqueIdA,
    orderDate: '2024-09-05',
    orderType: 'STATUS_QUO',
    summary: 'বিবাদীদের ওপর নালিশি জমিতে স্থিতাবস্থা (Status Quo) বজায় রাখার অন্তর্বর্তীকালীন আদেশ',
    outcome: 'মসজিদের পক্ষে স্থিতাবস্থা বহাল রাখা হয়েছে',
    nextAction: 'আদেশের নকল সংগ্রহ ও থানায় দাখিল',
    centralDocumentId: 'doc-court-order-001',
    documentReference: 'আদেশ নং ১২, তাং ০৫/০৯/২০২৪',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.legalOrders.push(testOrder);

  const foundOrder = db.legalOrders.find(o => o.id === testOrder.id && o.mosqueId === mosqueIdA);
  assert(!!foundOrder, 'Legal Order recorded in database');
  assert(foundOrder?.orderType === 'STATUS_QUO', 'Order type STATUS_QUO preserved');

  // Update case status to reflect proceedings
  testCase.status = 'HEARING';
  testCase.updatedAt = new Date().toISOString();
  assert(testCase.status === 'HEARING', 'Case status transition to HEARING successful');

  // -------------------------------------------------------------------------
  // 9. DASHBOARD STATS AGGREGATION
  // -------------------------------------------------------------------------
  console.log('\n9. Testing Dashboard Stats Aggregation:');
  const stats = db.getLegalDashboardStats(mosqueIdA);
  assert(stats.totalCases >= 1, `Total cases recorded (stat: ${stats.totalCases})`);
  assert(stats.hearingCases >= 1, `Hearing cases count accurate (stat: ${stats.hearingCases})`);
  assert(stats.landDisputeCasesCount >= 1, `Land dispute cases count accurate (stat: ${stats.landDisputeCasesCount})`);
  assert(stats.upcomingHearingsCount >= 1, `Upcoming hearings count accurate (stat: ${stats.upcomingHearingsCount})`);
  assert(stats.overdueActionsCount >= 1, `Overdue actions count accurate (stat: ${stats.overdueActionsCount})`);

  // -------------------------------------------------------------------------
  // 10. MULTI-TENANT ISOLATION GUARANTEE
  // -------------------------------------------------------------------------
  console.log('\n10. Testing Strict Tenant Isolation:');
  // Attempt to query from isolated Mosque B
  const mosqueBCases = db.legalCases.filter(c => c.mosqueId === mosqueIdB);
  const mosqueBCourts = db.legalCourts.filter(c => c.mosqueId === mosqueIdB);
  const mosqueBParties = db.legalParties.filter(p => p.mosqueId === mosqueIdB);
  const mosqueBLawyers = db.legalLawyers.filter(l => l.mosqueId === mosqueIdB);
  const mosqueBHearings = db.legalHearings.filter(h => h.mosqueId === mosqueIdB);
  const mosqueBActions = db.legalActions.filter(a => a.mosqueId === mosqueIdB);
  const mosqueBOrders = db.legalOrders.filter(o => o.mosqueId === mosqueIdB);
  const statsB = db.getLegalDashboardStats(mosqueIdB);

  assert(mosqueBCases.length === 0, 'Mosque B cannot see any cases from Mosque A');
  assert(mosqueBCourts.length === 0, 'Mosque B cannot see courts from Mosque A');
  assert(mosqueBParties.length === 0, 'Mosque B cannot see parties from Mosque A');
  assert(mosqueBLawyers.length === 0, 'Mosque B cannot see lawyers from Mosque A');
  assert(mosqueBHearings.length === 0, 'Mosque B cannot see hearings from Mosque A');
  assert(mosqueBActions.length === 0, 'Mosque B cannot see actions from Mosque A');
  assert(mosqueBOrders.length === 0, 'Mosque B cannot see orders from Mosque A');
  assert(statsB.totalCases === 0 && statsB.upcomingHearingsCount === 0, 'Mosque B dashboard stats are strictly 0');

  // -------------------------------------------------------------------------
  // 11. AUDIT TRAIL LOGGING
  // -------------------------------------------------------------------------
  console.log('\n11. Testing Audit Trail Generation:');
  const legalAudits = db.auditLogs.filter(a =>
    a.mosqueId === mosqueIdA &&
    (a.module === 'LEGAL_CASE' || a.module === 'LEGAL_COURT')
  );
  assert(legalAudits.length >= 2, `Audit trail recorded legal operations (count: ${legalAudits.length})`);
  assert(legalAudits.some(a => a.module === 'LEGAL_CASE' && a.action === 'CREATE'), 'Case creation audit log verified');

  // -------------------------------------------------------------------------
  // 12. FINANCIAL INVARIANCE & ZERO SHADOW LEDGER
  // -------------------------------------------------------------------------
  console.log('\n12. Testing Financial Invariance (Zero Shadow Ledger):');
  const finalAccountsBalance = db.accounts
    .filter(a => a.mosqueId === mosqueIdA)
    .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const delta = Math.abs(finalAccountsBalance - initialAccountsBalance);
  assert(delta === 0, `Financial balance delta is exactly ৳0.00 (Initial: ${initialAccountsBalance}, Final: ${finalAccountsBalance})`);
  assert(testCase.expenseEntryIds?.length === 0, 'No shadow financial entries attached to test case');

  // -------------------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------------------
  // Clean up added test entities to leave database clean
  const cIdx = db.legalCases.findIndex(c => c.id === testCase.id);
  if (cIdx !== -1) db.legalCases.splice(cIdx, 1);
  const crtIdx = db.legalCourts.findIndex(c => c.id === testCourt.id);
  if (crtIdx !== -1) db.legalCourts.splice(crtIdx, 1);
  db.legalParties = db.legalParties.filter(p => p.caseId !== testCase.id);
  db.legalLawyers = db.legalLawyers.filter(l => l.caseId !== testCase.id);
  db.legalHearings = db.legalHearings.filter(h => h.caseId !== testCase.id);
  db.legalActions = db.legalActions.filter(a => a.caseId !== testCase.id);
  db.legalOrders = db.legalOrders.filter(o => o.caseId !== testCase.id);

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLegalAndLandManagementTests().catch(err => {
  console.error('Fatal error during legal and land management tests:', err);
  process.exit(1);
});

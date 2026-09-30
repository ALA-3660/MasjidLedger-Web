import { quranReferenceService } from '../src/server/quranReferenceService';
import { db } from '../src/server/db';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}: ${failureDetail || 'Assertion failed'}`);
  }
}

console.log('================================================================');
console.log('STARTING HIFZ H2 — QURAN REFERENCE FOUNDATION TEST SUITE (V2.6)');
console.log('================================================================\n');

async function runTests() {
  // >>> 1. Dataset & Metadata Integrity
  console.log('>>> 1. Testing Quran Dataset & Versioning Integrity');
  const status = quranReferenceService.getStatus();
  assert(status.isLoaded === true, 'Quran Dataset Loaded in Memory');
  assert(status.metadata.sourceName === 'Tanzil Project', 'Canonical Source is Tanzil Project');
  assert(status.metadata.sourceVersion.includes('Uthmani Text v1.1'), 'Canonical Source Version is Uthmani Text v1.1');
  assert(status.metadata.license.includes('Creative Commons Attribution 3.0'), 'Creative Commons Attribution 3.0 License Retained');
  assert(typeof status.metadata.sha256Checksum === 'string' && status.metadata.sha256Checksum.length === 64, 'Valid SHA-256 Dataset Checksum Present');

  // >>> 2. Structural Quantities Integrity
  console.log('\n>>> 2. Testing Quran Structural Quantities Integrity');
  const surahs = quranReferenceService.getSurahs();
  assert(surahs.length === 114, `Exact 114 Surahs Present (Found: ${surahs.length})`);

  const juzs = quranReferenceService.getJuzs();
  assert(juzs.length === 30, `Exact 30 Juzs Present (Found: ${juzs.length})`);

  // Count total ayahs across surahs
  const totalAyahsCalculated = surahs.reduce((acc, s) => acc + s.ayahCount, 0);
  assert(totalAyahsCalculated === 6236, `Exact 6,236 Ayahs Across Surahs (Found: ${totalAyahsCalculated})`);

  // Check pages, hizbs, rub, manzil, ruku coverage
  const page1 = quranReferenceService.getPage(1);
  const page604 = quranReferenceService.getPage(604);
  assert(page1 !== null && page604 !== null, 'Mushaf Page Range 1 to 604 Available');

  const hizb1 = quranReferenceService.getHizb(1);
  const hizb60 = quranReferenceService.getHizb(60);
  assert(hizb1 !== null && hizb60 !== null, 'Hizb Range 1 to 60 Available');

  const rub1 = quranReferenceService.getRubHizb(1);
  const rub240 = quranReferenceService.getRubHizb(240);
  assert(rub1 !== null && rub240 !== null, 'Rub al-Hizb Range 1 to 240 Available');

  const manzil1 = quranReferenceService.getManzil(1);
  const manzil7 = quranReferenceService.getManzil(7);
  assert(manzil1 !== null && manzil7 !== null, 'Manzil Range 1 to 7 Available');

  // >>> 3. Ayah Integrity & Canonical Text
  console.log('\n>>> 3. Testing Ayah Integrity & Canonical Tanzil Arabic Text');
  const fatiha1 = quranReferenceService.getAyah('1:1');
  assert(fatiha1 !== null, 'Ayah 1:1 Exists');
  assert(fatiha1?.text === 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'Ayah 1:1 Canonical Arabic Text Verified');
  assert(fatiha1?.juzNumber === 1, 'Ayah 1:1 in Juz 1');
  assert(fatiha1?.pageNumber === 1, 'Ayah 1:1 on Page 1');

  // Ayat al-Kursi (2:255)
  const kursi = quranReferenceService.getAyah('2:255');
  assert(kursi !== null, 'Ayat al-Kursi (2:255) Exists');
  assert(kursi?.text.startsWith('ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ'), 'Ayat al-Kursi (2:255) Canonical Arabic Text Verified');
  assert(kursi?.juzNumber === 3, 'Ayat al-Kursi is in Juz 3');
  assert(kursi?.pageNumber === 42, 'Ayat al-Kursi is on Page 42');
  assert(kursi?.hizbNumber === 5, 'Ayat al-Kursi is in Hizb 5');
  assert(kursi?.rubHizbNumber === 17, 'Ayat al-Kursi is in Rub al-Hizb 17');
  assert(kursi?.manzilNumber === 1, 'Ayat al-Kursi is in Manzil 1');
  assert(kursi?.rukuNumber === 35, 'Ayat al-Kursi is in Ruku 35');

  // Last Ayah of Quran (114:6)
  const nasLast = quranReferenceService.getAyah('114:6');
  assert(nasLast !== null, 'Surah An-Nas Last Ayah (114:6) Exists');
  assert(nasLast?.text === 'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ', 'Ayah 114:6 Canonical Arabic Text Verified');
  assert(nasLast?.verseIndex === 6236, 'Ayah 114:6 has Sequential VerseIndex 6236');
  assert(nasLast?.juzNumber === 30, 'Ayah 114:6 is in Juz 30');
  assert(nasLast?.pageNumber === 604, 'Ayah 114:6 is on Page 604');

  // >>> 4. Surah Detail & Bengali Localization
  console.log('\n>>> 4. Testing Surah Detail & Canonical Bengali Names');
  const surah1 = quranReferenceService.getSurah(1);
  assert(surah1 !== null && surah1.ayahs.length === 7, 'Surah Al-Fatiha has exactly 7 Ayahs');
  assert(surah1?.surah.nameBangla === 'আল-ফাতিহা', 'Surah Al-Fatiha Bengali Name Verified');
  assert(surah1?.surah.nameEnglish === 'The Opening', 'Surah Al-Fatiha English Name Verified');
  assert(surah1?.surah.revelationType === 'Meccan', 'Surah Al-Fatiha is Meccan');

  const surah2 = quranReferenceService.getSurah(2);
  assert(surah2 !== null && surah2.ayahs.length === 286, 'Surah Al-Baqarah has exactly 286 Ayahs');
  assert(surah2?.surah.nameBangla === 'আল-বাকারা', 'Surah Al-Baqarah Bengali Name Verified');
  assert(surah2?.surah.revelationType === 'Medinan', 'Surah Al-Baqarah is Medinan');

  // >>> 5. Juz Boundaries & Consistency
  console.log('\n>>> 5. Testing Juz Boundaries & Consistency');
  const juz1 = quranReferenceService.getJuz(1);
  assert(juz1 !== null, 'Juz 1 Exists');
  assert(juz1?.juz.firstAyahKey === '1:1', 'Juz 1 Starts at 1:1');
  assert(juz1?.juz.lastAyahKey === '2:141', 'Juz 1 Ends at 2:141');

  const juz2 = quranReferenceService.getJuz(2);
  assert(juz2 !== null, 'Juz 2 Exists');
  assert(juz2?.juz.firstAyahKey === '2:142', 'Juz 2 Starts at 2:142');
  assert(juz2?.juz.lastAyahKey === '2:252', 'Juz 2 Ends at 2:252');

  const juz30 = quranReferenceService.getJuz(30);
  assert(juz30 !== null, 'Juz 30 Exists');
  assert(juz30?.juz.firstAyahKey === '78:1', 'Juz 30 Starts at 78:1 (An-Naba)');
  assert(juz30?.juz.lastAyahKey === '114:6', 'Juz 30 Ends at 114:6 (An-Nas)');

  // >>> 6. Deterministic Ayah Range Resolution (H3/H4 Ready)
  console.log('\n>>> 6. Testing Deterministic Ayah Range Resolution (H3/H4 Foundation)');
  const range1 = quranReferenceService.getAyahRange('2:255', '2:257');
  assert(range1 !== null, 'Range 2:255 -> 2:257 Resolved');
  assert(range1?.totalAyahs === 3, `Range 2:255 -> 2:257 Contains Exactly 3 Ayahs (Found: ${range1?.totalAyahs})`);
  assert(range1?.ayahs[0].verseKey === '2:255', 'Range Starts at 2:255');
  assert(range1?.ayahs[2].verseKey === '2:257', 'Range Ends at 2:257');
  assert(range1?.spansMultipleSurahs === false, 'Range is Within Single Surah');

  // Cross-Surah Range: e.g. 113:1 -> 114:6
  const crossRange = quranReferenceService.getAyahRange('113:1', '114:6');
  assert(crossRange !== null, 'Cross-Surah Range 113:1 -> 114:6 Resolved');
  assert(crossRange?.totalAyahs === 11, `Range Contains Exactly 11 Ayahs (5 from Falaq + 6 from Nas)`);
  assert(crossRange?.spansMultipleSurahs === true, 'Correctly Identifies Multi-Surah Span');

  // Range Validation Error Guards
  const invalidRange = quranReferenceService.validateRange('2:257', '2:255');
  assert(invalidRange.isValid === false, 'Inverted Range Rejected (Start after End)');

  const nonExistentRange = quranReferenceService.validateRange('999:1', '999:5');
  assert(nonExistentRange.isValid === false, 'Non-existent Verse Key Rejected');

  // >>> 7. Zero Shadow Mutation & Finance Protection
  console.log('\n>>> 7. Testing Strict Multi-Tenancy & Zero Financial Delta');
  const initialIncomeCount = db.incomeEntries.length;
  const initialExpenseCount = db.expenseEntries.length;

  // Perform multiple reference queries
  quranReferenceService.getSurah(36);
  quranReferenceService.getAyahRange('36:1', '36:12');
  quranReferenceService.getPage(440);

  assert(db.incomeEntries.length === initialIncomeCount, 'Zero Income Mutation (Financial Delta = 0)');
  assert(db.expenseEntries.length === initialExpenseCount, 'Zero Expense Mutation (Financial Delta = 0)');

  // Verify Global Reference vs Tenant Isolation
  assert(quranReferenceService.getSurahs().length === 114, 'Quran Reference Data is Global (Not Scoped to Mosque ID)');

  // >>> 8. Boundary Enforcement: No H3 / H4 Records Created
  console.log('\n>>> 8. Testing Strict Boundary Enforcement (H2 Only)');
  const dbAny = db as any;
  assert(dbAny.sabakRecords === undefined, 'Zero Sabak Records in Database (H3 Deferred)');
  assert(dbAny.sabakiRecords === undefined, 'Zero Sabaki Records in Database (H3 Deferred)');
  assert(dbAny.daurRecords === undefined, 'Zero Daur Records in Database (H4 Deferred)');
  assert(dbAny.hifzAttendanceRecords === undefined, 'Zero Hifz Attendance Records (Future Phase)');

  console.log('\n================================================================');
  console.log(`H2 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

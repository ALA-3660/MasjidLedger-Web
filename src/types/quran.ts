/**
 * Quran Reference Foundation (H2) Types
 * Strict Canonical Data Entities - Tanzil Uthmani v1.1
 */

export interface QuranSurah {
  id: string;
  surahNumber: number;
  nameArabic: string;
  nameEnglish: string;
  transliteration: string;
  nameBangla: string;
  revelationType: 'Meccan' | 'Medinan' | string;
  revelationOrder: number;
  ayahCount: number;
  rukuCount: number;
  source: string;
  sourceVersion: string;
}

export interface QuranJuz {
  juzNumber: number;
  firstAyahKey: string;
  lastAyahKey: string;
  totalAyahs: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startPage: number;
  endPage: number;
  source: string;
  sourceVersion: string;
}

export interface QuranAyah {
  id: string;
  verseKey: string; // e.g. "1:1", "2:255"
  surahNumber: number;
  ayahNumber: number;
  verseIndex: number; // 1 to 6236
  text: string; // Canonical Uthmani Arabic text
  juzNumber: number;
  hizbNumber: number;
  rubHizbNumber: number;
  pageNumber: number;
  manzilNumber: number;
  rukuNumber: number;
  source: string;
  sourceVersion: string;
}

export interface QuranReferenceMetadata {
  sourceName: string;
  sourceVersion: string;
  license: string;
  licenseNotice?: string;
  attributionUrl: string;
  importDate: string;
  totalSurahs: number;
  totalAyahs: number;
  totalJuz: number;
  totalPages: number;
  totalHizb: number;
  totalRubHizb: number;
  totalManzil: number;
  totalRukus: number;
  sha256Checksum: string;
}

export interface QuranReferenceStatus {
  isLoaded: boolean;
  metadata: QuranReferenceMetadata;
}

export interface QuranRangeResult {
  startVerseKey: string;
  endVerseKey: string;
  startIndex: number;
  endIndex: number;
  totalAyahs: number;
  startSurah: QuranSurah;
  endSurah: QuranSurah;
  spansMultipleSurahs: boolean;
  spansMultipleJuz: boolean;
  juzCovered: number[];
  pagesCovered: number[];
  ayahs: QuranAyah[];
}

export interface QuranRangeValidation {
  isValid: boolean;
  error?: string;
  verseCount?: number;
  startIndex?: number;
  endIndex?: number;
}

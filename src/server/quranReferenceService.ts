import fs from 'fs';
import path from 'path';
import {
  QuranSurah,
  QuranJuz,
  QuranAyah,
  QuranReferenceMetadata,
  QuranReferenceStatus,
  QuranRangeResult,
  QuranRangeValidation,
} from '../types/quran';

export class QuranReferenceService {
  private static instance: QuranReferenceService;
  private isLoaded: boolean = false;
  private metadata!: QuranReferenceMetadata;
  private surahs: QuranSurah[] = [];
  private juzs: QuranJuz[] = [];
  private ayahs: QuranAyah[] = [];

  // Fast index lookups
  private surahMap = new Map<number, QuranSurah>();
  private ayahByVerseKey = new Map<string, QuranAyah>();
  private ayahByVerseIndex = new Map<number, QuranAyah>();
  private ayahsBySurah = new Map<number, QuranAyah[]>();
  private ayahsByJuz = new Map<number, QuranAyah[]>();
  private ayahsByPage = new Map<number, QuranAyah[]>();
  private ayahsByHizb = new Map<number, QuranAyah[]>();
  private ayahsByRub = new Map<number, QuranAyah[]>();
  private ayahsByManzil = new Map<number, QuranAyah[]>();

  private constructor() {
    this.init();
  }

  public static getInstance(): QuranReferenceService {
    if (!QuranReferenceService.instance) {
      QuranReferenceService.instance = new QuranReferenceService();
    }
    return QuranReferenceService.instance;
  }

  private init() {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'data', 'quran', 'tanzil_quran_reference.json'),
        path.resolve(process.cwd(), 'data', 'quran', 'tanzil_quran_reference.json'),
        '/app/applet/data/quran/tanzil_quran_reference.json',
      ];

      let rawData = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          rawData = fs.readFileSync(p, 'utf-8');
          break;
        }
      }

      if (!rawData) {
        console.error('QuranReferenceService: Dataset file not found!');
        return;
      }

      const parsed = JSON.parse(rawData);
      this.metadata = parsed.metadata;
      this.surahs = parsed.surahs || [];
      this.juzs = parsed.juzs || [];
      this.ayahs = parsed.ayahs || [];

      // Build in-memory indexes
      for (const s of this.surahs) {
        this.surahMap.set(s.surahNumber, s);
      }

      for (const a of this.ayahs) {
        this.ayahByVerseKey.set(a.verseKey, a);
        this.ayahByVerseIndex.set(a.verseIndex, a);

        // Surah grouping
        if (!this.ayahsBySurah.has(a.surahNumber)) {
          this.ayahsBySurah.set(a.surahNumber, []);
        }
        this.ayahsBySurah.get(a.surahNumber)!.push(a);

        // Juz grouping
        if (!this.ayahsByJuz.has(a.juzNumber)) {
          this.ayahsByJuz.set(a.juzNumber, []);
        }
        this.ayahsByJuz.get(a.juzNumber)!.push(a);

        // Page grouping
        if (!this.ayahsByPage.has(a.pageNumber)) {
          this.ayahsByPage.set(a.pageNumber, []);
        }
        this.ayahsByPage.get(a.pageNumber)!.push(a);

        // Hizb grouping
        if (!this.ayahsByHizb.has(a.hizbNumber)) {
          this.ayahsByHizb.set(a.hizbNumber, []);
        }
        this.ayahsByHizb.get(a.hizbNumber)!.push(a);

        // Rub al-Hizb grouping
        if (!this.ayahsByRub.has(a.rubHizbNumber)) {
          this.ayahsByRub.set(a.rubHizbNumber, []);
        }
        this.ayahsByRub.get(a.rubHizbNumber)!.push(a);

        // Manzil grouping
        if (!this.ayahsByManzil.has(a.manzilNumber)) {
          this.ayahsByManzil.set(a.manzilNumber, []);
        }
        this.ayahsByManzil.get(a.manzilNumber)!.push(a);
      }

      this.isLoaded = true;
      console.log(
        `QuranReferenceService: Initialized successfully with ${this.surahs.length} Surahs, ${this.juzs.length} Juzs, ${this.ayahs.length} Ayahs. Version: ${this.metadata.sourceVersion}`
      );
    } catch (err) {
      console.error('QuranReferenceService: Error initializing dataset:', err);
    }
  }

  public getStatus(): QuranReferenceStatus {
    return {
      isLoaded: this.isLoaded,
      metadata: this.metadata,
    };
  }

  public getSurahs(): QuranSurah[] {
    return this.surahs;
  }

  public getSurah(surahNumber: number): { surah: QuranSurah; ayahs: QuranAyah[] } | null {
    const surah = this.surahMap.get(surahNumber);
    if (!surah) return null;
    const ayahs = this.ayahsBySurah.get(surahNumber) || [];
    return { surah, ayahs };
  }

  public getAyah(verseKey: string): QuranAyah | null {
    const normalizedKey = verseKey.trim();
    return this.ayahByVerseKey.get(normalizedKey) || null;
  }

  public getAyahByIndex(verseIndex: number): QuranAyah | null {
    return this.ayahByVerseIndex.get(verseIndex) || null;
  }

  public getJuzs(): QuranJuz[] {
    return this.juzs;
  }

  public getJuz(juzNumber: number): { juz: QuranJuz; ayahs: QuranAyah[] } | null {
    const juz = this.juzs.find((j) => j.juzNumber === juzNumber);
    if (!juz) return null;
    const ayahs = this.ayahsByJuz.get(juzNumber) || [];
    return { juz, ayahs };
  }

  public getPage(pageNumber: number): { pageNumber: number; ayahs: QuranAyah[] } | null {
    if (pageNumber < 1 || pageNumber > 604) return null;
    const ayahs = this.ayahsByPage.get(pageNumber) || [];
    return { pageNumber, ayahs };
  }

  public getHizb(hizbNumber: number): { hizbNumber: number; ayahs: QuranAyah[] } | null {
    if (hizbNumber < 1 || hizbNumber > 60) return null;
    const ayahs = this.ayahsByHizb.get(hizbNumber) || [];
    return { hizbNumber, ayahs };
  }

  public getRubHizb(rubNumber: number): { rubHizbNumber: number; hizbNumber: number; ayahs: QuranAyah[] } | null {
    if (rubNumber < 1 || rubNumber > 240) return null;
    const ayahs = this.ayahsByRub.get(rubNumber) || [];
    return {
      rubHizbNumber: rubNumber,
      hizbNumber: Math.ceil(rubNumber / 4),
      ayahs,
    };
  }

  public getManzil(manzilNumber: number): { manzilNumber: number; ayahs: QuranAyah[] } | null {
    if (manzilNumber < 1 || manzilNumber > 7) return null;
    const ayahs = this.ayahsByManzil.get(manzilNumber) || [];
    return { manzilNumber, ayahs };
  }

  /**
   * Validate a canonical verse range without creating records
   */
  public validateRange(startVerseKey: string, endVerseKey: string): QuranRangeValidation {
    const startAyah = this.getAyah(startVerseKey);
    if (!startAyah) {
      return { isValid: false, error: `শুরুর আয়াত '${startVerseKey}' পাওয়া যায়নি।` };
    }

    const endAyah = this.getAyah(endVerseKey);
    if (!endAyah) {
      return { isValid: false, error: `শেষের আয়াত '${endVerseKey}' পাওয়া যায়নি।` };
    }

    if (startAyah.verseIndex > endAyah.verseIndex) {
      return {
        isValid: false,
        error: `শুরুর আয়াত (${startVerseKey}) অবশ্যই শেষের আয়াতের (${endVerseKey}) পূর্বে বা সমতুল্য হতে হবে।`,
      };
    }

    const verseCount = endAyah.verseIndex - startAyah.verseIndex + 1;
    return {
      isValid: true,
      verseCount,
      startIndex: startAyah.verseIndex,
      endIndex: endAyah.verseIndex,
    };
  }

  /**
   * Deterministically resolve Ayah range: e.g. "2:255" -> "2:257"
   */
  public getAyahRange(startVerseKey: string, endVerseKey: string): QuranRangeResult | null {
    const validation = this.validateRange(startVerseKey, endVerseKey);
    if (!validation.isValid || !validation.startIndex || !validation.endIndex) {
      return null;
    }

    const startAyah = this.getAyahByIndex(validation.startIndex)!;
    const endAyah = this.getAyahByIndex(validation.endIndex)!;
    const startSurah = this.surahMap.get(startAyah.surahNumber)!;
    const endSurah = this.surahMap.get(endAyah.surahNumber)!;

    const rangeAyahs: QuranAyah[] = [];
    const juzSet = new Set<number>();
    const pageSet = new Set<number>();

    for (let idx = validation.startIndex; idx <= validation.endIndex; idx++) {
      const ayah = this.ayahByVerseIndex.get(idx);
      if (ayah) {
        rangeAyahs.push(ayah);
        juzSet.add(ayah.juzNumber);
        pageSet.add(ayah.pageNumber);
      }
    }

    return {
      startVerseKey,
      endVerseKey,
      startIndex: validation.startIndex,
      endIndex: validation.endIndex,
      totalAyahs: rangeAyahs.length,
      startSurah,
      endSurah,
      spansMultipleSurahs: startAyah.surahNumber !== endAyah.surahNumber,
      spansMultipleJuz: startAyah.juzNumber !== endAyah.juzNumber,
      juzCovered: Array.from(juzSet).sort((a, b) => a - b),
      pagesCovered: Array.from(pageSet).sort((a, b) => a - b),
      ayahs: rangeAyahs,
    };
  }
}

export const quranReferenceService = QuranReferenceService.getInstance();

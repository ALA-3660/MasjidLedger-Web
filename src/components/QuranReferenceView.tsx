import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  FileText,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  QuranSurah,
  QuranJuz,
  QuranAyah,
  QuranReferenceStatus,
  QuranRangeResult,
} from '../types/quran';
import { toBanglaNumber } from './CommitteeView';

interface QuranReferenceViewProps {
  language?: string;
}

export const QuranReferenceView: React.FC<QuranReferenceViewProps> = ({
  language = 'bn',
}) => {
  const [status, setStatus] = useState<QuranReferenceStatus | null>(null);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [juzs, setJuzs] = useState<QuranJuz[]>([]);
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [selectedJuzNumber, setSelectedJuzNumber] = useState<number>(1);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'surah' | 'juz' | 'page' | 'range'>('surah');

  // Verses display state
  const [activeSurahData, setActiveSurahData] = useState<{ surah: QuranSurah; ayahs: QuranAyah[] } | null>(null);
  const [activeJuzData, setActiveJuzData] = useState<{ juz: QuranJuz; ayahs: QuranAyah[] } | null>(null);
  const [activePageData, setActivePageData] = useState<{ pageNumber: number; ayahs: QuranAyah[] } | null>(null);
  const [rangeResult, setRangeResult] = useState<QuranRangeResult | null>(null);

  // Range query inputs
  const [rangeStart, setRangeStart] = useState<string>('2:255');
  const [rangeEnd, setRangeEnd] = useState<string>('2:257');
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Single verse lookup input
  const [searchAyahKey, setSearchAyahKey] = useState<string>('');
  const [singleAyahResult, setSingleAyahResult] = useState<QuranAyah | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [surahFilter, setSurahFilter] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, surahsRes, juzsRes] = await Promise.all([
        api.getQuranStatus().catch(() => null),
        api.getQuranSurahs().catch(() => []),
        api.getQuranJuzs().catch(() => []),
      ]);

      setStatus(statusRes);
      setSurahs(surahsRes);
      setJuzs(juzsRes);

      // Load initial Surah (Al-Fatiha)
      if (surahsRes.length > 0) {
        const surah1 = await api.getQuranSurah(1).catch(() => null);
        setActiveSurahData(surah1);
      }
    } catch (err) {
      console.error('Failed to load Quran reference data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSurah = async (sNum: number) => {
    setSelectedSurahNumber(sNum);
    setIsLoading(true);
    try {
      const data = await api.getQuranSurah(sNum);
      setActiveSurahData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectJuz = async (jNum: number) => {
    setSelectedJuzNumber(jNum);
    setIsLoading(true);
    try {
      const data = await api.getQuranJuz(jNum);
      setActiveJuzData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPage = async (pNum: number) => {
    setSelectedPageNumber(pNum);
    setIsLoading(true);
    try {
      const data = await api.getQuranPage(pNum);
      setActivePageData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveRange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rangeStart.trim() || !rangeEnd.trim()) {
      setRangeError('শুরুর আয়াত ও শেষের আয়াত উল্লেখ করুন (যেমন: 2:255 এবং 2:257)');
      return;
    }
    setIsLoading(true);
    setRangeError(null);
    try {
      const res = await api.getQuranRange(rangeStart.trim(), rangeEnd.trim());
      setRangeResult(res);
    } catch (err: any) {
      setRangeError(err.message || 'আয়াত রেঞ্জ অনুসন্ধান ব্যর্থ হয়েছে।');
      setRangeResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleAyahLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchAyahKey.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.getQuranAyah(searchAyahKey.trim());
      setSingleAyahResult(res);
    } catch (err: any) {
      setSingleAyahResult(null);
      alert(err.message || 'আয়াত পাওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSurahs = surahs.filter((s) => {
    if (!surahFilter.trim()) return true;
    const q = surahFilter.toLowerCase();
    return (
      s.surahNumber.toString().includes(q) ||
      s.nameEnglish.toLowerCase().includes(q) ||
      s.transliteration.toLowerCase().includes(q) ||
      s.nameBangla.toLowerCase().includes(q) ||
      s.nameArabic.includes(surahFilter)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Dataset & Version Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-xl p-5 text-white shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-100 border border-emerald-500/30">
                H2 Canonical Foundation
              </span>
              <span className="text-xs text-emerald-200">
                উসমানী স্ক্রিপ্ট (মদীনা মুসহাফ)
              </span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>পবিত্র কুরআন রেফারেন্স ও ক্যানোনিকাল ডাটাবেস</span>
            </h2>
            <p className="text-xs text-emerald-200/90 leading-relaxed max-w-3xl">
              হিফজখানা ভবিষ্যৎ স্তর (H3 সবক-সবকী এবং H4 দাওর-রিভিশন)-এর জন্য অপরিবর্তনীয় প্রামাণ্য ডিজিটাল রেফারেন্স।
              তানযিল প্রজেক্টের অনুমোদিত লাইসেন্স ও খাঁটি উসমানী টেক্সটের ভিত্তিতে সংরক্ষিত।
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-lg p-3 border border-white/15 text-right shrink-0">
            <div className="text-xs text-emerald-200">উৎস ও সংস্করণ</div>
            <div className="text-sm font-bold text-amber-300">
              {status?.metadata.sourceName || 'Tanzil Project'}
            </div>
            <div className="text-[11px] text-white/80">
              {status?.metadata.sourceVersion || 'Uthmani v1.1'}
            </div>
            <div className="text-[10px] text-emerald-300 font-mono mt-0.5">
              চেকসাম: {status?.metadata.sha256Checksum ? status.metadata.sha256Checksum.substring(0, 10) + '...' : 'Verified'}
            </div>
          </div>
        </div>

        {/* Quick Reference Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-4 pt-4 border-t border-emerald-700/50">
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">সূরা</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(114)}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">পারা (জুজ)</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(30)}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">মোট আয়াত</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(6236)}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">মুসহাফ পৃষ্ঠা</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(604)}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">হিযব</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(60)}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">রুবুল হিযব</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(240)}</div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2 text-center border border-emerald-700/30">
            <div className="text-[11px] text-emerald-300">মঞ্জিল</div>
            <div className="text-base font-bold text-white">{toBanglaNumber(7)}</div>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => {
              setViewMode('surah');
              if (!activeSurahData) handleSelectSurah(selectedSurahNumber);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'surah'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>সূরা অনুযায়ী</span>
          </button>

          <button
            onClick={() => {
              setViewMode('juz');
              if (!activeJuzData) handleSelectJuz(selectedJuzNumber);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'juz'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>পারা অনুযায়ী (১-৩০)</span>
          </button>

          <button
            onClick={() => {
              setViewMode('page');
              if (!activePageData) handleSelectPage(selectedPageNumber);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'page'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>পৃষ্ঠা অনুযায়ী (১-৬০৪)</span>
          </button>

          <button
            onClick={() => {
              setViewMode('range');
              if (!rangeResult) handleResolveRange();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'range'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>আয়াত রেঞ্জ রিজলভার (H3/H4 ভিত্তি)</span>
          </button>
        </div>

        {/* Quick Verse Key Direct Lookup */}
        <form onSubmit={handleSingleAyahLookup} className="flex items-center space-x-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="আয়াত লুকআপ (উদা: 2:255)"
              value={searchAyahKey}
              onChange={(e) => setSearchAyahKey(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-slate-300 w-44 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1.5 bg-slate-800 text-white rounded-md text-xs font-medium hover:bg-slate-700 flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>খুঁজুন</span>
          </button>
        </form>
      </div>

      {/* Single Ayah Modal/Popup if searched */}
      {singleAyahResult && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm relative">
          <button
            onClick={() => setSingleAyahResult(null)}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-md">
              ক্যানোনিকাল আয়াত {singleAyahResult.verseKey}
            </span>
            <span className="text-xs text-amber-800">
              পারা {toBanglaNumber(singleAyahResult.juzNumber)} • পৃষ্ঠা {toBanglaNumber(singleAyahResult.pageNumber)} • হিযব {toBanglaNumber(singleAyahResult.hizbNumber)} • রুকু {toBanglaNumber(singleAyahResult.rukuNumber)}
            </span>
          </div>
          <div className="text-right font-amiri text-2xl leading-loose text-slate-900 bg-white p-4 rounded-lg border border-amber-200">
            {singleAyahResult.text}
          </div>
        </div>
      )}

      {/* VIEW MODE 1: BY SURAH */}
      {viewMode === 'surah' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Surah List Column */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="সূরা খুঁজুন (নাম বা নম্বর)..."
                value={surahFilter}
                onChange={(e) => setSurahFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
              {filteredSurahs.map((s) => {
                const isSelected = selectedSurahNumber === s.surahNumber;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSurah(s.surahNumber)}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.surahNumber}
                      </span>
                      <div>
                        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          <span>{s.nameBangla}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({s.nameEnglish})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {s.revelationType === 'Meccan' ? 'মাক্কী' : 'মাদানী'} • {toBanglaNumber(s.ayahCount)} আয়াত
                        </div>
                      </div>
                    </div>
                    <div className="font-amiri text-sm font-semibold text-slate-800">
                      {s.nameArabic}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Surah Verses Column */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            {isLoading ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">আয়াতসমূহ লোড হচ্ছে...</p>
              </div>
            ) : activeSurahData ? (
              <>
                {/* Surah Header Card */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>ক্রম নম্বর: {toBanglaNumber(activeSurahData.surah.surahNumber)}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-medium">
                      {activeSurahData.surah.revelationType === 'Meccan' ? 'মাক্কী সূরা' : 'মাদানী সূরা'}
                    </span>
                    <span>রুকু: {toBanglaNumber(activeSurahData.surah.rukuCount)}</span>
                  </div>

                  <h3 className="font-amiri text-2xl font-bold text-emerald-950">
                    {activeSurahData.surah.nameArabic}
                  </h3>
                  <div className="text-sm font-bold text-slate-800">
                    সূরা {activeSurahData.surah.nameBangla} ({activeSurahData.surah.nameEnglish})
                  </div>

                  {activeSurahData.surah.surahNumber !== 9 && (
                    <div className="font-amiri text-xl text-emerald-900 pt-2 border-t border-emerald-200/60 mt-2">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </div>
                  )}
                </div>

                {/* Verses List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 divide-y divide-slate-100">
                  {activeSurahData.ayahs.map((ayah) => (
                    <div key={ayah.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          {ayah.verseKey}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px]">
                          <span>পারা {toBanglaNumber(ayah.juzNumber)}</span>
                          <span>•</span>
                          <span>পৃষ্ঠা {toBanglaNumber(ayah.pageNumber)}</span>
                          <span>•</span>
                          <span>হিযব {toBanglaNumber(ayah.hizbNumber)}</span>
                        </div>
                      </div>

                      <div className="text-right font-amiri text-2xl leading-loose text-slate-900 pr-2">
                        {ayah.text}
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-mono font-bold mx-2 border border-emerald-300">
                          {ayah.ayahNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BY JUZ (PARA) */}
      {viewMode === 'juz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Juz List Column */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              ৩০ পারা তালিকা
            </h4>

            <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1">
              {juzs.map((j) => {
                const isSelected = selectedJuzNumber === j.juzNumber;
                return (
                  <button
                    key={j.juzNumber}
                    onClick={() => handleSelectJuz(j.juzNumber)}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {j.juzNumber}
                      </span>
                      <div>
                        <div className="text-xs font-bold leading-tight">
                          পারা {toBanglaNumber(j.juzNumber)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {j.firstAyahKey} ➔ {j.lastAyahKey}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 text-right">
                      <div>পৃষ্ঠা {toBanglaNumber(j.startPage)} - {toBanglaNumber(j.endPage)}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">{toBanglaNumber(j.totalAyahs)} আয়াত</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Juz Verses Column */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            {isLoading ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs">পারার আয়াতসমূহ লোড হচ্ছে...</p>
              </div>
            ) : activeJuzData ? (
              <>
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-emerald-950">
                      পারা {toBanglaNumber(activeJuzData.juz.juzNumber)}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ব্যাপ্তি: {activeJuzData.juz.firstAyahKey} থেকে {activeJuzData.juz.lastAyahKey} • পৃষ্ঠা {toBanglaNumber(activeJuzData.juz.startPage)} - {toBanglaNumber(activeJuzData.juz.endPage)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-emerald-700 text-white rounded text-xs font-bold">
                      মোট {toBanglaNumber(activeJuzData.juz.totalAyahs)} আয়াত
                    </span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 divide-y divide-slate-100">
                  {activeJuzData.ayahs.map((ayah) => (
                    <div key={ayah.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          {ayah.verseKey} (সূরা {toBanglaNumber(ayah.surahNumber)}, আয়াত {toBanglaNumber(ayah.ayahNumber)})
                        </span>
                        <div className="flex items-center space-x-2 text-[10px]">
                          <span>পৃষ্ঠা {toBanglaNumber(ayah.pageNumber)}</span>
                          <span>•</span>
                          <span>হিযব {toBanglaNumber(ayah.hizbNumber)}</span>
                        </div>
                      </div>

                      <div className="text-right font-amiri text-2xl leading-loose text-slate-900 pr-2">
                        {ayah.text}
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-mono font-bold mx-2 border border-emerald-300">
                          {ayah.ayahNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: BY PAGE */}
      {viewMode === 'page' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">পৃষ্ঠা নির্বাচন করুন (১-৬০৪):</span>
              <input
                type="number"
                min="1"
                max="604"
                value={selectedPageNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 604) {
                    handleSelectPage(val);
                  }
                }}
                className="w-20 px-2 py-1 text-xs border border-slate-300 rounded text-center font-bold font-mono focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={selectedPageNumber <= 1}
                onClick={() => handleSelectPage(selectedPageNumber - 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
              >
                ◀ পূর্ববর্তী পৃষ্ঠা
              </button>
              <span className="text-xs text-slate-500">
                পৃষ্ঠা {toBanglaNumber(selectedPageNumber)} / {toBanglaNumber(604)}
              </span>
              <button
                disabled={selectedPageNumber >= 604}
                onClick={() => handleSelectPage(selectedPageNumber + 1)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
              >
                পরবর্তী পৃষ্ঠা ▶
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs">পৃষ্ঠা লোড হচ্ছে...</p>
            </div>
          ) : activePageData ? (
            <div className="border border-slate-300 rounded-xl p-6 bg-[#fcfbfa] shadow-inner max-w-3xl mx-auto space-y-4">
              <div className="text-center border-b border-slate-200 pb-2 text-xs text-slate-500">
                মুসহাফ পৃষ্ঠা নং {toBanglaNumber(activePageData.pageNumber)} • আয়াত সংখ্যা: {toBanglaNumber(activePageData.ayahs.length)}
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 divide-y divide-slate-200/60">
                {activePageData.ayahs.map((ayah) => (
                  <div key={ayah.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                        {ayah.verseKey} (সূরা {toBanglaNumber(ayah.surahNumber)}, আয়াত {toBanglaNumber(ayah.ayahNumber)})
                      </span>
                      <span className="text-[10px]">পারা {toBanglaNumber(ayah.juzNumber)}</span>
                    </div>

                    <div className="text-right font-amiri text-2xl leading-loose text-slate-900 pr-2">
                      {ayah.text}
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-mono font-bold mx-2 border border-emerald-300">
                        {ayah.ayahNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* VIEW MODE 4: RANGE RESOLVER (H3/H4 FOUNDATION) */}
      {viewMode === 'range' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-700" />
              <span>কুরআন রেঞ্জ রিজলভার (ডিটারমিনিস্টিক ভ্যালিডেশন)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ভবিষ্যতের H3 (সবক/সবকী) এবং H4 (দাওর/রিভিশন) এর জন্য ক্যানোনিকাল রেঞ্জ ভ্যালিডেশন ইঞ্জিন। কোনো কৃত্রিম রেকর্ড তৈরি ব্যতীত সম্পূর্ণ নির্ভুল আয়াত রেঞ্জ গণনা করে।
            </p>
          </div>

          <form onSubmit={handleResolveRange} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  শুরুর আয়াত (Start Verse Key)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 2:255"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  শেষের আয়াত (End Verse Key)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 2:257"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>রেঞ্জ অনুসন্ধান ও ভ্যালিডেশন</span>
                </button>
              </div>
            </div>

            {rangeError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                ⚠️ {rangeError}
              </div>
            )}
          </form>

          {/* Range Result Display */}
          {rangeResult && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>বৈধ ক্যানোনিকাল রেঞ্জ: {rangeResult.startVerseKey} ➔ {rangeResult.endVerseKey}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    সূরা: {rangeResult.startSurah.nameBangla}
                    {rangeResult.spansMultipleSurahs && ` থেকে ${rangeResult.endSurah.nameBangla}`} • মোট আয়াত: {toBanglaNumber(rangeResult.totalAyahs)} টি
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2.5 py-1 bg-white border border-emerald-200 rounded font-semibold text-slate-700">
                    পারা: {rangeResult.juzCovered.map((j) => toBanglaNumber(j)).join(', ')}
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-emerald-200 rounded font-semibold text-slate-700">
                    পৃষ্ঠা: {rangeResult.pagesCovered.map((p) => toBanglaNumber(p)).join(', ')}
                  </span>
                </div>
              </div>

              {/* Verses in Range */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 divide-y divide-slate-100">
                {rangeResult.ayahs.map((ayah) => (
                  <div key={ayah.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                        {ayah.verseKey} (সূরা {toBanglaNumber(ayah.surahNumber)}, আয়াত {toBanglaNumber(ayah.ayahNumber)})
                      </span>
                      <div className="flex items-center space-x-2 text-[10px]">
                        <span>পারা {toBanglaNumber(ayah.juzNumber)}</span>
                        <span>•</span>
                        <span>পৃষ্ঠা {toBanglaNumber(ayah.pageNumber)}</span>
                      </div>
                    </div>

                    <div className="text-right font-amiri text-2xl leading-loose text-slate-900 pr-2">
                      {ayah.text}
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-mono font-bold mx-2 border border-emerald-300">
                        {ayah.ayahNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attribution & Legal Notice Footer */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            কুরআন টেক্সট ও মেটাডাটা কৃতজ্ঞতা: <strong>তানযিল প্রজেক্ট (Tanzil Project)</strong>, উসমানী ক্যালিগ্রাফি সংস্করণ ১.১।
          </span>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <a
            href="https://tanzil.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>tanzil.net</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <span>লাইসেন্স: Creative Commons Attribution 3.0</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Bell,
  Heart,
  Landmark,
  Scale,
  TrendingUp,
  Building,
  Users2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Flame,
  CheckCircle2,
  Phone,
  QrCode,
  Calendar,
  Compass,
  Info,
  ShieldCheck
} from 'lucide-react';
import { PublicPortalData, PublicPortalSettings } from '../types';
import {
  calculateLiveWaqt,
  getBengaliDate,
  getHijriDate,
  toBanglaDigits,
  playPrayerNotificationSound,
  WaqtStatus
} from '../lib/prayerEngine';

interface MosqueDisplayScreenProps {
  portalData: PublicPortalData;
  settings: PublicPortalSettings;
  onExitDisplayMode: () => void;
  onNavigateToLogin?: () => void;
}

export const MosqueDisplayScreen: React.FC<MosqueDisplayScreenProps> = ({
  portalData,
  settings,
  onExitDisplayMode,
  onNavigateToLogin,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(settings.enableAutoSlideRotation ?? true);
  const [slideDuration, setSlideDuration] = useState<number>(settings.slideDurationSec || 15);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isAudioAlertEnabled, setIsAudioAlertEnabled] = useState(settings.enableDisplayAudioAlert ?? true);
  const [selectedTheme, setSelectedTheme] = useState<'EMERALD_NIGHT' | 'MIDNIGHT_GOLD' | 'LIGHT'>(
    (settings.displayModeTheme as any) || 'EMERALD_NIGHT'
  );
  const [hasPlayedJamaatSound, setHasPlayedJamaatSound] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Live Clock Tick (Every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Waqt & Prayer Engine calculations
  const waqtStatus: WaqtStatus = useMemo(() => {
    return calculateLiveWaqt(currentTime, portalData.prayerTimes, portalData.mosque);
  }, [currentTime, portalData.prayerTimes, portalData.mosque]);

  // Audio alerts for upcoming Jamaat or Azan
  useEffect(() => {
    if (isAudioAlertEnabled && waqtStatus.isJamaatNow && hasPlayedJamaatSound !== waqtStatus.nextPrayerBn) {
      playPrayerNotificationSound('IQAMAH_ALERT');
      setHasPlayedJamaatSound(waqtStatus.nextPrayerBn);
    }
  }, [waqtStatus.isJamaatNow, isAudioAlertEnabled, hasPlayedJamaatSound, waqtStatus.nextPrayerBn]);

  // Gregorian, Bengali, Hijri Date strings
  const bengaliDate = useMemo(() => getBengaliDate(currentTime), [currentTime]);
  const hijriDate = useMemo(() => getHijriDate(currentTime), [currentTime]);
  const gregorianDateStr = currentTime.toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dayNameBn = currentTime.toLocaleDateString('bn-BD', { weekday: 'long' });

  // Digital Clock format
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const timePeriod = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const clockStringBn = `${toBanglaDigits(String(displayHours).padStart(2, '0'))}:${toBanglaDigits(String(minutes).padStart(2, '0'))}:${toBanglaDigits(String(seconds).padStart(2, '0'))}`;

  // Filter Active Available Slides for the Left Dynamic Carousel
  const availableSlides = useMemo(() => {
    const slides: { id: string; titleBn: string; category: string; icon: any }[] = [];

    // Slide 1: Special Nawafil & Solar Milestones
    slides.push({
      id: 'SPECIAL_TIMES',
      titleBn: 'আজকের নফল ও বিশেষ ওয়াক্ত সূচি',
      category: 'বিশেষ সময়',
      icon: Sparkles
    });

    // Slide 2: Public Safe Financial & Jumu'ah Summary
    if (settings.financialSummary && portalData.financialTransparency) {
      slides.push({
        id: 'FINANCE',
        titleBn: 'আর্থিক হিসাব ও অনুদান চ্যানেল',
        category: 'হিসাব ও দান',
        icon: Scale
      });
    } else if (settings.donation) {
      slides.push({
        id: 'DONATION',
        titleBn: 'ডিজিটাল দান ও কিউআর চ্যানেল',
        category: 'অনলাইন দান',
        icon: Heart
      });
    }

    // Slide 3: Ongoing Development Activities & Projects
    if (settings.projects && portalData.projects.length > 0) {
      slides.push({
        id: 'PROJECTS',
        titleBn: 'চলমান উন্নয়ন কর্মপরিকল্পনা ও অগ্রগতি',
        category: 'উন্নয়ন',
        icon: TrendingUp
      });
    }

    // Slide 4: Notices & Urgent Announcements
    if (settings.notices && portalData.notices.length > 0) {
      slides.push({
        id: 'NOTICES',
        titleBn: 'মসজিদের নোটিশ বোর্ড ও জরুরি ঘোষণা',
        category: 'বিজ্ঞপ্তি',
        icon: Bell
      });
    }

    // Slide 5: Committee & Staff
    if ((settings.committee && portalData.committee) || (settings.staff && portalData.staff.length > 0)) {
      slides.push({
        id: 'LEADERSHIP',
        titleBn: 'মসজিদ পরিচালনা পরিষদ ও খাদেমবৃন্দ',
        category: 'পরিচালনা',
        icon: Users2
      });
    }

    // Slide 6: Ramadan Calendar if enabled
    if (settings.ramadanSchedule) {
      slides.push({
        id: 'RAMADAN',
        titleBn: 'মাহে রমজান সেহরি ও ইফতার সূচি',
        category: 'রমজান',
        icon: Moon
      });
    }

    return slides;
  }, [settings, portalData]);

  // Clamp currentSlideIndex within available bounds
  const activeSlideIndex = currentSlideIndex % availableSlides.length;
  const currentSlide = availableSlides[activeSlideIndex] || availableSlides[0];

  // Auto Slide Rotation Timer & Progress Bar
  useEffect(() => {
    if (!isAutoPlay || availableSlides.length <= 1) {
      setSlideProgress(0);
      return;
    }

    const intervalStep = 100; // update progress every 100ms
    const totalSteps = (slideDuration * 1000) / intervalStep;

    const progressTimer = setInterval(() => {
      setSlideProgress(prev => {
        if (prev >= 100) {
          setCurrentSlideIndex(s => (s + 1) % availableSlides.length);
          return 0;
        }
        return prev + (100 / totalSteps);
      });
    }, intervalStep);

    return () => clearInterval(progressTimer);
  }, [isAutoPlay, slideDuration, availableSlides.length]);

  // Keyboard Shortcuts Handler (F11/F for Fullscreen, Space for Pause, Arrow keys for slides)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsAutoPlay(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentSlideIndex(s => (s + 1) % availableSlides.length);
        setSlideProgress(0);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlideIndex(s => (s - 1 + availableSlides.length) % availableSlides.length);
        setSlideProgress(0);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [availableSlides.length, isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Dynamic Theme Styles
  const themeStyles = useMemo(() => {
    switch (selectedTheme) {
      case 'MIDNIGHT_GOLD':
        return {
          wrapper: 'bg-[#080D1A] text-amber-50',
          topBar: 'bg-[#0F172A]/95 border-amber-500/30 shadow-2xl backdrop-blur-md',
          card: 'bg-[#1E293B]/85 border-amber-500/20 text-slate-100 backdrop-blur-md shadow-lg',
          activeCard: 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 font-black border-amber-300 shadow-2xl ring-4 ring-amber-400/50',
          activeCardJamaatBox: 'bg-slate-950 text-amber-300 border border-amber-400/60 shadow-inner',
          accentText: 'text-amber-400',
          accentBadge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
          progressBar: 'bg-amber-400',
          tickerBg: 'bg-[#0A1020]/95 border-amber-500/30 text-amber-200',
          prayerPanelBg: 'bg-[#0F172A]/90 border-amber-500/30 shadow-2xl',
          prayerCardBg: 'bg-[#152033]/90 border-amber-500/20 hover:border-amber-500/40',
        };
      case 'LIGHT':
        return {
          wrapper: 'bg-slate-100 text-slate-900',
          topBar: 'bg-white/95 border-slate-300 shadow-lg backdrop-blur-md',
          card: 'bg-white border-slate-200 text-slate-800 shadow-md',
          activeCard: 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white font-black border-emerald-400 shadow-2xl ring-4 ring-emerald-400/40',
          activeCardJamaatBox: 'bg-white text-emerald-800 border border-emerald-300 shadow-inner',
          accentText: 'text-emerald-700',
          accentBadge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
          progressBar: 'bg-emerald-600',
          tickerBg: 'bg-white/95 border-slate-300 text-slate-800',
          prayerPanelBg: 'bg-white/95 border-slate-300 shadow-xl',
          prayerCardBg: 'bg-slate-50 border-slate-200 hover:border-slate-300',
        };
      case 'EMERALD_NIGHT':
      default:
        return {
          wrapper: 'bg-[#031B13] text-emerald-50',
          topBar: 'bg-[#062F22]/95 border-emerald-500/30 shadow-2xl backdrop-blur-md',
          card: 'bg-[#0A3D2D]/85 border-emerald-500/20 text-slate-100 backdrop-blur-md shadow-lg',
          activeCard: 'bg-gradient-to-b from-emerald-500 to-teal-600 text-slate-950 font-black border-emerald-300 shadow-2xl ring-4 ring-emerald-400/50',
          activeCardJamaatBox: 'bg-slate-950 text-emerald-300 border border-emerald-400/60 shadow-inner',
          accentText: 'text-emerald-400',
          accentBadge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
          progressBar: 'bg-emerald-400',
          tickerBg: 'bg-[#04241B]/95 border-emerald-500/30 text-emerald-200',
          prayerPanelBg: 'bg-[#062F22]/90 border-emerald-500/30 shadow-2xl',
          prayerCardBg: 'bg-[#083627]/90 border-emerald-500/20 hover:border-emerald-500/40',
        };
    }
  }, [selectedTheme]);

  const mosque = portalData.mosque;
  const emergencyNotice = portalData.notices.find(n => n.isEmergency || n.priority === 'URGENT');

  return (
    <div
      ref={containerRef}
      id="mosque-display-screen"
      className={`min-h-screen w-full select-none flex flex-col justify-between p-3 sm:p-5 lg:p-6 font-siliguri transition-colors duration-500 ${themeStyles.wrapper}`}
    >
      {/* =============================================================
          1. TOP IDENTITY & LIVE MULTI-CALENDAR BAR
          ============================================================= */}
      <header className={`rounded-3xl p-4 sm:p-5 border flex flex-wrap items-center justify-between gap-4 transition-all ${themeStyles.topBar}`}>
        {/* Left: Mosque Identity */}
        <div className="flex items-center space-x-3.5 max-w-xl">
          {settings.mosqueLogo && mosque?.logoUrl ? (
            <img
              src={mosque.logoUrl}
              alt="Mosque Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-contain bg-white/10 p-1 border border-white/20 shadow-md"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-white shadow-md">
              <Building className="w-8 h-8 text-emerald-300" />
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium line-clamp-1">
              {mosque?.address} {mosque?.district && `• ${mosque?.district}`} {mosque?.waqfEstateName && `• ${mosque?.waqfEstateName}`}
            </p>
            {settings.islamicTagline && (
              <div className="text-[11px] text-emerald-300/80 italic line-clamp-1 hidden sm:block">
                "নিশ্চয়ই নামাজ মুমিনের জন্য নির্ধারিত সময়ে ফরজ করা হয়েছে।" — (সূরা আন-নিসা: ১০৩)
              </div>
            )}
          </div>
        </div>

        {/* Center: Multi-Calendar Display (Hijri, Bengali, Gregorian) */}
        <div className="hidden lg:flex items-center space-x-3 bg-black/30 px-4 py-2 rounded-2xl border border-white/10 text-xs">
          <div className="text-center px-2.5 border-r border-white/10 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">হিজরি সন</span>
            <span className="font-bold text-white text-xs sm:text-sm">{hijriDate.fullBn}</span>
          </div>
          <div className="text-center px-2.5 border-r border-white/10 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">বঙ্গাব্দ</span>
            <span className="font-bold text-white text-xs sm:text-sm">{bengaliDate.fullBn}</span>
          </div>
          <div className="text-center px-2.5 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">{dayNameBn}</span>
            <span className="font-bold text-white text-xs sm:text-sm">{gregorianDateStr}</span>
          </div>
        </div>

        {/* Right: Digital Clock & Top Control Buttons */}
        <div className="flex items-center space-x-4">
          <div className="text-right space-y-0.5">
            <div className={`text-2xl sm:text-4xl lg:text-5xl font-mono font-black tracking-wider ${themeStyles.accentText} drop-shadow-md`}>
              {clockStringBn}
            </div>
            <div className="flex items-center justify-end space-x-2 text-[11px] text-slate-300 font-semibold">
              <span className="bg-black/40 px-2 py-0.5 rounded-md font-mono">{timePeriod}</span>
              <span>• {dayNameBn}</span>
            </div>
          </div>

          {/* Quick Action Icons Capsule */}
          <div className="flex items-center space-x-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/15">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              title="ফুলস্ক্রিন মোড (F11 বা F)"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsAudioAlertEnabled(a => !a)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isAudioAlertEnabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:bg-white/10'
              }`}
              title="সালাত ও জামাতের সাউন্ড অ্যালার্ট"
            >
              {isAudioAlertEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            {/* Theme Toggle */}
            <button
              onClick={() => {
                const nextTheme = selectedTheme === 'EMERALD_NIGHT' ? 'MIDNIGHT_GOLD' : selectedTheme === 'MIDNIGHT_GOLD' ? 'LIGHT' : 'EMERALD_NIGHT';
                setSelectedTheme(nextTheme);
              }}
              className="p-2 text-amber-300 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              title="থিম পরিবর্তন করুন"
            >
              {selectedTheme === 'EMERALD_NIGHT' ? <Moon className="w-5 h-5 text-emerald-400" /> : selectedTheme === 'MIDNIGHT_GOLD' ? <Flame className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            </button>
            {/* Exit button */}
            <button
              id="btn-exit-tv-mode"
              onClick={onExitDisplayMode}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              title="সাধারণ পোর্টালে ফিরুন"
            >
              প্রস্থান
            </button>
          </div>
        </div>
      </header>

      {/* =============================================================
          2. MAIN SPLIT SCREEN AREA:
             - LEFT: LIVE STATUS, COUNTDOWN & ROTATING SLIDE CAROUSEL (~62%)
             - RIGHT: FIXED VERTICAL PRAYER SCHEDULE PANEL (~38%)
          ============================================================= */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 my-3 min-h-0">
        {/* -----------------------------------------------------------
            LEFT COLUMN (62%): LIVE COUNTDOWN + ROTATING CONTENT CAROUSEL
            ----------------------------------------------------------- */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between space-y-4">
          {/* Top Status & Alerts Bar */}
          <div className="space-y-2.5">
            {/* Forbidden / Makruh Time Alert Banner */}
            {waqtStatus.isMakruh && (
              <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-100 px-5 py-2.5 rounded-2xl flex items-center justify-between shadow-xl animate-pulse">
                <div className="flex items-center space-x-3 text-sm sm:text-base font-bold">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                  <span>{waqtStatus.makruhReasonBn}</span>
                </div>
                <span className="text-xs font-bold uppercase bg-amber-500 text-slate-950 px-3 py-1 rounded-full">
                  সালাত নিষেধ
                </span>
              </div>
            )}

            {/* Emergency Notice Alert Banner */}
            {settings.emergencyNotice && emergencyNotice && (
              <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 px-5 py-2.5 rounded-2xl flex items-center space-x-3 shadow-xl">
                <Bell className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                <div className="text-sm sm:text-base font-bold">
                  <strong className="text-rose-300">জরুরি নোটিশ:</strong> {emergencyNotice.title} — {emergencyNotice.description}
                </div>
              </div>
            )}

            {/* Prominent Next Prayer & Current Waqt Status Strip */}
            <div className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3 shadow-md ${themeStyles.card}`}>
              <div className="flex items-center space-x-3">
                <span className={`font-bold px-3 py-1 rounded-full text-xs sm:text-sm ${themeStyles.accentBadge}`}>
                  বর্তমান ওয়াক্ত: {waqtStatus.currentWaqtBn}
                </span>
                <span className="text-xs sm:text-sm text-slate-200">
                  {waqtStatus.dynamicStatusMessageBn}
                </span>
              </div>

              {/* Next Prayer Countdown Capsule */}
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold">
                <span className="text-slate-300">আসন্ন {waqtStatus.nextPrayerBn || waqtStatus.nextWaqtBn}:</span>
                <span className="text-white font-mono bg-black/40 px-2 py-0.5 rounded-lg">
                  জামাত {waqtStatus.nextJamaatTimeStr12 || waqtStatus.nextAdhanTimeStr12}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black ${
                  waqtStatus.isJamaatApproaching ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                }`}>
                  {waqtStatus.waqtRemainingStrBn ? `আর বাকি: ${waqtStatus.waqtRemainingStrBn}` : waqtStatus.nextWaqtStartsInStrBn}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Rotating Slide Area */}
          <div className="flex-1 flex flex-col justify-center">
            {/* SLIDE 1: SPECIAL WAQTS & NAWAFIL (Sunrise, Ishraq, Duha, Zawal, Sehri, Iftar, Tahajjud) */}
            {currentSlide.id === 'SPECIAL_TIMES' && (
              <div className="space-y-4 animate-in fade-in zoom-in-98 duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg sm:text-xl font-black">আজকের বিশেষ নফল ও সূর্যভিত্তিক সময়সূচি</h2>
                  </div>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                    নফল ও তাহাজ্জুদ
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Tahajjud End */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-indigo-300 block font-bold">তাহাজ্জুদ ওয়াক্ত শেষ</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-indigo-200">{waqtStatus.tahajjudEndTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">ফজর ওয়াক্ত শুরু পর্যন্ত</p>
                  </div>

                  {/* Sehri End */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-purple-300 block font-bold">সেহরি শেষ সময়</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-purple-200">{waqtStatus.sehriEndTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">সতর্কতামূলক সেহরি শেষ</p>
                  </div>

                  {/* Sunrise */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-amber-300 block font-bold">সূর্যোদয় (Sunrise)</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-amber-200">{waqtStatus.sunriseTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">ফজর ওয়াক্তের সমাপ্তি</p>
                  </div>

                  {/* Ishraq */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-emerald-300 block font-bold">ইশরাক সালাত</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-emerald-200">{waqtStatus.ishraqTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">সূর্যোদয়ের ১৫ মিনিট পর</p>
                  </div>

                  {/* Duha / Chasht */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-teal-300 block font-bold">চাশত / দুহা সালাত</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-teal-200">{waqtStatus.duhaTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">দ্বিপ্রহরের পূর্ব পর্যন্ত</p>
                  </div>

                  {/* Solar Noon / Zawal */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-blue-300 block font-bold">ঠিক দুপুর / জাওয়াল</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-blue-200">{waqtStatus.solarNoonTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">যোহরের ওয়াক্ত শুরু</p>
                  </div>

                  {/* Sunset & Iftar */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-rose-300 block font-bold">সূর্যাস্ত ও ইফতার সময়</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-rose-200">{waqtStatus.sunsetTimeStr12}</div>
                    <p className="text-[11px] text-slate-400">মাগরিব ওয়াক্ত শুরু</p>
                  </div>

                  {/* Jumuah Box */}
                  <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                    <span className="text-xs text-amber-400 block font-bold">জুমার নামাজ (শুক্রবার)</span>
                    <div className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                      {portalData.jumuahTime?.iqamah || waqtStatus.jumuahJamaatTimeStr12}
                    </div>
                    <p className="text-[11px] text-slate-400">খুতবা: {portalData.jumuahTime?.khutbah || waqtStatus.jumuahKhutbahTimeStr12}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: FINANCIAL TRANSPARENCY & DONATION CHANNELS (PUBLIC-SAFE) */}
            {currentSlide.id === 'FINANCE' && portalData.financialTransparency && (
              <div className="space-y-4 animate-in fade-in zoom-in-98 duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <Scale className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg sm:text-xl font-black">
                      আর্থিক হিসাব ও ডিজিটাল অনুদান চ্যানেল ({portalData.financialTransparency.currentMonthNameBn || 'চলতি মাস'})
                    </h2>
                  </div>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                    স্বচ্ছতা ও দান
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Public Aggregate Stats */}
                  <div className="md:col-span-7 grid grid-cols-2 gap-3">
                    {settings.monthlyIncome && portalData.financialTransparency.monthlyIncome !== undefined && (
                      <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                        <span className="text-xs text-emerald-400 font-bold block">চলতি মাসের মোট আয়</span>
                        <div className="text-xl sm:text-2xl font-mono font-black text-emerald-300">
                          ৳ {portalData.financialTransparency.monthlyIncome.toLocaleString('bn-BD')}
                        </div>
                        <p className="text-[10px] text-slate-400">দানবাক্স ও অনুদান</p>
                      </div>
                    )}

                    {settings.monthlyExpense && portalData.financialTransparency.monthlyExpense !== undefined && (
                      <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                        <span className="text-xs text-rose-400 font-bold block">চলতি মাসের মোট ব্যয়</span>
                        <div className="text-xl sm:text-2xl font-mono font-black text-rose-300">
                          ৳ {portalData.financialTransparency.monthlyExpense.toLocaleString('bn-BD')}
                        </div>
                        <p className="text-[10px] text-slate-400">সম্মানী ও পরিচালনা ব্যয়</p>
                      </div>
                    )}

                    {settings.totalDonationReceived && portalData.financialTransparency.totalDonationsReceived !== undefined && (
                      <div className={`rounded-2xl p-4 border space-y-1 ${themeStyles.card}`}>
                        <span className="text-xs text-purple-400 font-bold block">মোট সংগৃহীত দান</span>
                        <div className="text-xl sm:text-2xl font-mono font-black text-purple-300">
                          ৳ {portalData.financialTransparency.totalDonationsReceived.toLocaleString('bn-BD')}
                        </div>
                        <p className="text-[10px] text-slate-400">সর্বমোট প্রাপ্ত দান</p>
                      </div>
                    )}

                    {/* Mobile banking strip */}
                    <div className={`rounded-2xl p-4 border space-y-1.5 ${themeStyles.card}`}>
                      <span className="text-xs text-amber-400 font-bold block">মোবাইল ব্যাংকিং মার্চেন্ট</span>
                      <div className="text-xs font-mono text-slate-200 space-y-0.5">
                        {portalData.donationChannels?.mobileBanking?.bkash && (
                          <div>বিকাশ: <strong className="text-white">{portalData.donationChannels.mobileBanking.bkash}</strong></div>
                        )}
                        {portalData.donationChannels?.mobileBanking?.nagad && (
                          <div>নগদ: <strong className="text-white">{portalData.donationChannels.mobileBanking.nagad}</strong></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Code Tile */}
                  {portalData.donationChannels?.qrCodeUrl && (
                    <div className={`md:col-span-5 rounded-2xl p-4 border text-center flex flex-col items-center justify-center space-y-2 ${themeStyles.card}`}>
                      <div className="p-2 bg-white rounded-xl shadow-lg">
                        <img
                          src={portalData.donationChannels.qrCodeUrl}
                          alt="Donation QR"
                          className="w-36 h-36 object-contain"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-200">স্ক্যান করে মসজিদে সদকা করুন</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SLIDE 3: ONGOING DEVELOPMENT ACTIVITIES & WORK PLANS */}
            {currentSlide.id === 'PROJECTS' && (
              <div className="space-y-4 animate-in fade-in zoom-in-98 duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg sm:text-xl font-black">মসজিদের চলমান উন্নয়ন কার্যক্রম ও কর্মপরিকল্পনা</h2>
                  </div>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                    উন্নয়ন কাজ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {portalData.projects.slice(0, 4).map((p) => (
                    <div key={p.id} className={`rounded-2xl p-4 border space-y-2.5 ${themeStyles.card}`}>
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm sm:text-base font-bold text-white">{p.title}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40">
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2">{p.description}</p>
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs font-bold text-slate-200">
                          <span>বাস্তবায়ন অগ্রগতি</span>
                          <span className="font-mono text-emerald-400">{toBanglaDigits(p.progressPercentage)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${p.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 4: NOTICES & ANNOUNCEMENTS */}
            {currentSlide.id === 'NOTICES' && (
              <div className="space-y-4 animate-in fade-in zoom-in-98 duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg sm:text-xl font-black">মসজিদের নোটিশ বোর্ড ও ধর্মীয় ঘোষণা</h2>
                  </div>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                    সর্বমোট {toBanglaDigits(portalData.notices.length)} টি নোটিশ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {portalData.notices.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-2xl p-4 border space-y-2 flex flex-col justify-between ${
                        n.isEmergency || n.priority === 'URGENT'
                          ? 'bg-rose-950/80 border-rose-500/60 ring-2 ring-rose-500/30'
                          : themeStyles.card
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{n.title}</h3>
                          {n.priority && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                              n.priority === 'URGENT' ? 'bg-rose-600 text-white' : 'bg-white/10 text-slate-300'
                            }`}>
                              {n.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">{n.description}</p>
                      </div>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-white/10 flex items-center justify-between font-mono">
                        <span>প্রকাশ: {n.publishDate}</span>
                        <span className="text-emerald-400 font-sans font-semibold">পরিচালনা কমিটি</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 5: LEADERSHIP & STAFF */}
            {currentSlide.id === 'LEADERSHIP' && (
              <div className="space-y-4 animate-in fade-in zoom-in-98 duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center space-x-2">
                    <Users2 className="w-5 h-5 text-sky-400" />
                    <h2 className="text-lg sm:text-xl font-black">মসজিদ পরিচালনা পরিষদ ও সম্মানিত ইমাম-খাদেমবৃন্দ</h2>
                  </div>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                    নেতৃত্ব ও খিদমত
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portalData.committee && (
                    <div className={`rounded-2xl p-4 border space-y-2.5 ${themeStyles.card}`}>
                      <span className="text-xs uppercase font-bold tracking-wider text-sky-300 block">
                        {portalData.committee.termTitle}
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {portalData.committee.members.slice(0, 5).map((m) => (
                          <div key={m.id} className="p-2 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{m.name}</span>
                            <span className="text-[11px] text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-500/30">
                              {m.designation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {portalData.staff.length > 0 && (
                    <div className={`rounded-2xl p-4 border space-y-2.5 ${themeStyles.card}`}>
                      <span className="text-xs uppercase font-bold tracking-wider text-emerald-300 block">
                        সম্মানিত খতিব, ইমাম ও মুয়াজ্জিনবৃন্দ
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {portalData.staff.slice(0, 5).map((s) => (
                          <div key={s.id} className="p-2 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                            <span className="font-bold text-white">{s.name}</span>
                            <span className="text-[11px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                              {s.designationBn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* -----------------------------------------------------------
            RIGHT COLUMN (38%): FIXED VERTICAL 5 PRAYER SCHEDULE PANEL
            (Always visible at all times - 4 fields: শুরু, আজান, জামাত, শেষ)
            ----------------------------------------------------------- */}
        <aside className={`lg:col-span-5 xl:col-span-4 rounded-3xl p-4 sm:p-5 border flex flex-col justify-between ${themeStyles.prayerPanelBg}`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/15 pb-2.5 mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                পাঁচ ওয়াক্ত নামাজের সময়সূচি
              </h2>
            </div>
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              দৈনিক সূচি
            </span>
          </div>

          {/* 5 Daily Prayers Vertical Stack */}
          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            {waqtStatus.prayerList.map((prayer) => {
              const isCurrent = prayer.key === waqtStatus.currentWaqtKey;
              const isNext = prayer.key === waqtStatus.nextWaqtKey;

              return (
                <div
                  key={prayer.key}
                  className={`rounded-2xl p-2.5 sm:p-3 border transition-all duration-300 ${
                    isCurrent
                      ? themeStyles.activeCard
                      : isNext
                      ? `${themeStyles.prayerCardBg} ring-2 ring-emerald-400/40`
                      : themeStyles.prayerCardBg
                  }`}
                >
                  {/* Prayer Name & Status Badge Row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className={`text-base sm:text-lg font-black ${isCurrent ? 'text-slate-950' : 'text-white'}`}>
                        {prayer.nameBn}
                      </span>
                      {prayer.key === 'dhuhr' && waqtStatus.isFriday && (
                        <span className="text-[10px] bg-purple-900/60 text-purple-200 border border-purple-400/30 px-1.5 py-0.5 rounded font-bold">
                          জুমা
                        </span>
                      )}
                    </div>

                    {isCurrent ? (
                      <span className="bg-slate-950 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>চলমান ওয়াক্ত</span>
                      </span>
                    ) : isNext ? (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                        আসন্ন
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {prayer.countdownTextBn}
                      </span>
                    )}
                  </div>

                  {/* 4-Field Grid: ওয়াক্ত শুরু (Auto), আজান (Manual), জামাত (Manual - Highlighted), ওয়াক্ত শেষ (Auto) */}
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                    {/* 1. Waqt Start */}
                    <div className={`p-1 rounded-xl ${isCurrent ? 'bg-black/15 text-slate-950' : 'bg-black/30 text-slate-200'}`}>
                      <span className={`text-[9px] block font-sans font-bold uppercase ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                        শুরু
                      </span>
                      <span className="text-xs sm:text-sm font-bold block">{prayer.waqtStart12}</span>
                    </div>

                    {/* 2. Azan */}
                    <div className={`p-1 rounded-xl ${isCurrent ? 'bg-black/15 text-slate-950' : 'bg-black/30 text-slate-200'}`}>
                      <span className={`text-[9px] block font-sans font-bold uppercase ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                        আজান
                      </span>
                      <span className="text-xs sm:text-sm font-bold block">{prayer.adhan12}</span>
                    </div>

                    {/* 3. Jamaat (MOST PROMINENT) */}
                    <div className={`p-1 rounded-xl col-span-1 ring-1 ${
                      isCurrent
                        ? themeStyles.activeCardJamaatBox
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-md ring-emerald-400/30'
                    }`}>
                      <span className={`text-[9px] block font-sans font-black uppercase ${isCurrent ? 'text-amber-300' : 'text-emerald-300'}`}>
                        জামাত
                      </span>
                      <span className="text-xs sm:text-base font-black block tracking-tight">{prayer.jamaat12}</span>
                    </div>

                    {/* 4. Waqt End */}
                    <div className={`p-1 rounded-xl ${isCurrent ? 'bg-black/15 text-slate-950' : 'bg-black/30 text-slate-200'}`}>
                      <span className={`text-[9px] block font-sans font-bold uppercase ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                        শেষ
                      </span>
                      <span className="text-xs sm:text-sm font-bold block">{prayer.waqtEnd12}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friday Jumu'ah Footer Box */}
          {settings.jumuahSchedule && portalData.jumuahTime && (
            <div className="mt-2.5 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs bg-black/25 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-amber-300">জুমার নামাজ (শুক্র):</span>
              <div className="font-mono text-slate-200 flex items-center space-x-2">
                <span>আজান: <strong className="text-white">{portalData.jumuahTime.adhan}</strong></span>
                <span>খুতবা: <strong className="text-white">{portalData.jumuahTime.khutbah}</strong></span>
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-black">
                  জামাত: {portalData.jumuahTime.iqamah}
                </span>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* =============================================================
          3. BOTTOM TICKER & CONTROLLER BAR:
             - SMOOTH CONTINUOUS SLIDING TICKER (RIGHT TO LEFT MARQUEE)
             - SLIDE SELECTION PILLS & CONTROLS
          ============================================================= */}
      <footer className="space-y-2 mt-1">
        {/* Continuous Right-to-Left Sliding Marquee Ticker */}
        <div className={`rounded-2xl px-4 py-2 border overflow-hidden relative flex items-center shadow-inner ${themeStyles.tickerBg}`}>
          <div className="flex items-center space-x-2 bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-xl shrink-0 z-10 shadow-md">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>ঘোষণা</span>
          </div>

          <div className="overflow-hidden whitespace-nowrap w-full ml-3 flex-1">
            <div className="animate-tv-marquee text-xs sm:text-sm font-bold tracking-wide flex items-center space-x-12">
              <span>🔔 মসজিদে প্রবেশের সময় মোবাইল ফোন সাইলেন্ট বা বন্ধ রাখুন।</span>
              <span>🕌 জামাতে দাঁড়ানোর সময় কাতার সোজা করে এবং ফাঁক বন্ধ করে দাঁড়ান।</span>
              <span>🧹 মসজিদের পবিত্রতা ও পরিষ্কার-পরিচ্ছন্নতা রক্ষা করুন।</span>
              <span>💧 অজু করার সময় অতিরিক্ত পানি অপচয় থেকে বিরত থাকুন।</span>
              <span>🤲 মসজিদের উন্নয়ন ও সেবামূলক কার্যক্রমে মুক্তহস্তে দান করুন।</span>
              {emergencyNotice && (
                <span className="text-rose-400">🚨 জরুরি ঘোষণা: {emergencyNotice.title} — {emergencyNotice.description}</span>
              )}
              {mosque?.phone && (
                <span>📞 জরুরি যোগাযোগ: {mosque.phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Slide Controls & Duration Selector */}
        <div className={`rounded-2xl p-2 sm:p-2.5 border flex flex-wrap items-center justify-between gap-3 text-xs ${themeStyles.topBar}`}>
          {/* Left: Play/Pause & Arrows */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAutoPlay(p => !p)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isAutoPlay ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-white/10 text-slate-300'
              }`}
              title="Space চাপলে প্লে/পজ হবে"
            >
              {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isAutoPlay ? 'চলমান' : 'বিরতি'}</span>
            </button>

            <button
              onClick={() => {
                setCurrentSlideIndex(s => (s - 1 + availableSlides.length) % availableSlides.length);
                setSlideProgress(0);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="পূর্ববর্তী স্লাইড (বাম তীর)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentSlideIndex(s => (s + 1) % availableSlides.length);
                setSlideProgress(0);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="পরবর্তী স্লাইড (ডান তীর)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Slide Progress Bar */}
            {isAutoPlay && (
              <div className="w-20 sm:w-28 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10 ml-1">
                <div
                  className={`h-full ${themeStyles.progressBar} transition-all duration-100 ease-linear`}
                  style={{ width: `${slideProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Center: Slide Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 max-w-full">
            {availableSlides.map((slide, idx) => {
              const isActive = idx === activeSlideIndex;
              const IconComp = slide.icon || Sparkles;
              return (
                <button
                  key={slide.id}
                  onClick={() => {
                    setCurrentSlideIndex(idx);
                    setSlideProgress(0);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-md scale-105'
                      : 'bg-black/30 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{toBanglaDigits(idx + 1)}. {slide.category}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Slide Duration Selector */}
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="text-[11px] hidden sm:inline">স্লাইড গতি:</span>
            <select
              value={slideDuration}
              onChange={(e) => setSlideDuration(Number(e.target.value))}
              className="bg-black/40 text-white border border-white/15 rounded-lg px-2 py-0.5 text-xs font-bold cursor-pointer focus:outline-hidden"
            >
              <option value={10}>১০ সেকেন্ড</option>
              <option value={15}>১৫ সেকেন্ড</option>
              <option value={20}>২০ সেকেন্ড</option>
              <option value={30}>৩০ সেকেন্ড</option>
            </select>
          </div>
        </div>
      </footer>
    </div>
  );
};

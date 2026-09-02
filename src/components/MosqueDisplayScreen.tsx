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
  TrendingDown,
  Building,
  Users2,
  UserCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  Layers,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  Flame,
  Tv
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
  const [textScale, setTextScale] = useState<'NORMAL' | 'LARGE' | 'XLARGE'>('LARGE');
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
  const timePeriod = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
  const displayHours = hours % 12 || 12;
  const clockStringBn = `${toBanglaDigits(String(displayHours).padStart(2, '0'))}:${toBanglaDigits(String(minutes).padStart(2, '0'))}:${toBanglaDigits(String(seconds).padStart(2, '0'))}`;

  // Filter Active Available Slides based on Admin Whitelist Settings
  const availableSlides = useMemo(() => {
    const slides: { id: string; titleBn: string; category: string }[] = [];

    // Slide 1: Prayer Timings (Always first if enabled)
    if (settings.prayerSchedule) {
      slides.push({ id: 'PRAYER', titleBn: 'নামাজের সময়সূচি ও ওয়াক্ত', category: 'ইবাদত' });
    }

    // Slide 2: Notices
    if (settings.notices && portalData.notices.length > 0) {
      slides.push({ id: 'NOTICES', titleBn: 'নোটিশ বোর্ড ও জরুরি ঘোষণা', category: 'বিজ্ঞপ্তি' });
    }

    // Slide 3: Donations & QR
    if (settings.donation) {
      slides.push({ id: 'DONATION', titleBn: 'ডিজিটাল দান ও কিউআর কোড', category: 'অনলাইন অনুদান' });
    }

    // Slide 4: Financial Transparency
    if (settings.financialSummary && portalData.financialTransparency) {
      slides.push({ id: 'FINANCE', titleBn: 'আর্থিক স্বচ্ছতা ও সারসংক্ষেপ', category: 'হিসাব' });
    }

    // Slide 5: Projects & Waqf
    if ((settings.projects && portalData.projects.length > 0) || (settings.waqfSummary && portalData.waqfSummary.length > 0)) {
      slides.push({ id: 'PROJECTS_WAQF', titleBn: 'উন্নয়ন প্রকল্প ও ওয়াকফ সম্পদ', category: 'উন্নয়ন' });
    }

    // Slide 6: Committee & Staff
    if ((settings.committee && portalData.committee) || (settings.staff && portalData.staff.length > 0)) {
      slides.push({ id: 'LEADERSHIP', titleBn: 'পরিচালনা কমিটি ও খাদেমবৃন্দ', category: 'পরিচালনা' });
    }

    // Slide 7: Ramadan Calendar if enabled
    if (settings.ramadanSchedule) {
      slides.push({ id: 'RAMADAN', titleBn: 'মাহে রমজান সেহরি ও ইফতার সূচি', category: 'রমজান' });
    }

    // Fallback if no specific slides enabled
    if (slides.length === 0) {
      slides.push({ id: 'PRAYER', titleBn: 'নামাজের সময়সূচি', category: 'ইবাদত' });
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

  // Dynamic Theme Colors & Styles
  const themeStyles = useMemo(() => {
    switch (selectedTheme) {
      case 'MIDNIGHT_GOLD':
        return {
          wrapper: 'bg-[#0B0F19] text-amber-50',
          topBar: 'bg-[#111827]/90 border-amber-500/30 shadow-2xl',
          card: 'bg-[#1E293B]/80 border-amber-500/20 text-slate-100 backdrop-blur-md',
          activeCard: 'bg-linear-to-b from-amber-500 to-amber-700 text-slate-950 font-black border-amber-300 shadow-2xl ring-4 ring-amber-400/50',
          accentText: 'text-amber-400',
          accentBadge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
          progressBar: 'bg-amber-400',
        };
      case 'LIGHT':
        return {
          wrapper: 'bg-slate-100 text-slate-900',
          topBar: 'bg-white/95 border-slate-300 shadow-lg',
          card: 'bg-white border-slate-200 text-slate-800 shadow-sm',
          activeCard: 'bg-linear-to-b from-blue-600 to-blue-800 text-white font-black border-blue-400 shadow-2xl ring-4 ring-blue-400/40',
          accentText: 'text-blue-700',
          accentBadge: 'bg-blue-100 text-blue-800 border border-blue-300',
          progressBar: 'bg-blue-600',
        };
      case 'EMERALD_NIGHT':
      default:
        return {
          wrapper: 'bg-[#041E15] text-emerald-50',
          topBar: 'bg-[#062F22]/90 border-emerald-500/30 shadow-2xl',
          card: 'bg-[#0A3D2D]/70 border-emerald-500/20 text-slate-100 backdrop-blur-md',
          activeCard: 'bg-linear-to-b from-emerald-500 to-emerald-700 text-slate-950 font-black border-emerald-300 shadow-2xl ring-4 ring-emerald-400/50',
          accentText: 'text-emerald-400',
          accentBadge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
          progressBar: 'bg-emerald-400',
        };
    }
  }, [selectedTheme]);

  // Font Scale Multiplier
  const scaleClass = textScale === 'XLARGE' ? 'scale-105 origin-top' : textScale === 'LARGE' ? 'scale-100' : 'scale-95';

  const mosque = portalData.mosque;
  const emergencyNotice = portalData.notices.find(n => n.isEmergency || n.priority === 'URGENT');

  return (
    <div
      ref={containerRef}
      id="mosque-display-screen"
      className={`min-h-screen w-full select-none flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-siliguri transition-colors duration-500 ${themeStyles.wrapper} ${scaleClass}`}
    >
      {/* -------------------------------------------------------------
          TOP HEADER: MOSQUE IDENTITY + 3 CALENDARS + DIGITAL CLOCK
          ------------------------------------------------------------- */}
      <div className={`rounded-3xl p-5 sm:p-6 border flex flex-wrap items-center justify-between gap-4 transition-all ${themeStyles.topBar}`}>
        {/* Left: Mosque Identity */}
        <div className="flex items-center space-x-4 max-w-xl">
          {settings.mosqueLogo && mosque?.logoUrl ? (
            <img
              src={mosque.logoUrl}
              alt="Mosque Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-white/10 p-1.5 border border-white/20 shadow-md"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-700/60 border border-emerald-400/40 flex items-center justify-center text-white shadow-md">
              <Building className="w-8 h-8 text-emerald-300" />
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium line-clamp-1">
              {mosque?.address} {mosque?.district && `• ${mosque?.district}`} {mosque?.waqfEstateName && `• ${mosque?.waqfEstateName}`}
            </p>
            {settings.islamicTagline && (
              <div className="text-[11px] text-emerald-300/80 italic line-clamp-1">
                "সালাত মুমিনের জন্য নির্ধারিত সময়ে ফরজ।" — (সূরা আন-নিসা: ১০৩)
              </div>
            )}
          </div>
        </div>

        {/* Center: Multi-Calendar Display (Hijri, Bengali, Gregorian) */}
        <div className="hidden md:flex items-center space-x-3 bg-black/25 px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
          <div className="text-center px-2 border-r border-white/10 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">হিজরি সন</span>
            <span className="font-bold font-mono text-white text-xs sm:text-sm">{hijriDate.fullBn}</span>
          </div>
          <div className="text-center px-2 border-r border-white/10 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">বঙ্গাব্দ</span>
            <span className="font-bold text-white text-xs sm:text-sm">{bengaliDate.fullBn}</span>
          </div>
          <div className="text-center px-2 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">{dayNameBn}</span>
            <span className="font-bold text-white text-xs sm:text-sm">{gregorianDateStr}</span>
          </div>
        </div>

        {/* Right: Digital Clock & Next Waqt Alert */}
        <div className="flex items-center space-x-5">
          <div className="text-right space-y-0.5">
            <div className={`text-3xl sm:text-5xl font-mono font-black tracking-widest ${themeStyles.accentText} drop-shadow-md`}>
              {clockStringBn}
            </div>
            <div className="flex items-center justify-end space-x-2 text-xs text-slate-300 font-semibold">
              <span className="bg-black/30 px-2.5 py-0.5 rounded-md font-mono">{timePeriod}</span>
              <span className="hidden sm:inline">• {dayNameBn}</span>
            </div>
          </div>

          {/* Controls Capsule */}
          <div className="flex flex-col space-y-1 bg-black/30 p-1.5 rounded-2xl border border-white/15">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              title="ফুলস্ক্রিন মোড (F11)"
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
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          COUNTDOWN TICKER & FORBIDDEN WAQT BANNER
          ------------------------------------------------------------- */}
      <div className="my-3 space-y-2">
        {/* Makruh / Forbidden Prayer Warning */}
        {waqtStatus.isMakruh && (
          <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-100 px-6 py-2.5 rounded-2xl flex items-center justify-between shadow-xl animate-pulse">
            <div className="flex items-center space-x-3 text-sm sm:text-base font-bold">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <span>{waqtStatus.makruhReasonBn}</span>
            </div>
            <span className="text-xs font-bold uppercase bg-amber-500 text-slate-950 px-3 py-1 rounded-full">
              সালাত নিষিদ্ধ
            </span>
          </div>
        )}

        {/* Emergency Notice Ticker */}
        {settings.emergencyNotice && emergencyNotice && (
          <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-100 px-6 py-2.5 rounded-2xl flex items-center space-x-3 shadow-xl">
            <Bell className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            <div className="text-sm sm:text-base font-bold">
              <strong className="text-rose-300">জরুরি নোটিশ:</strong> {emergencyNotice.title} — {emergencyNotice.description}
            </div>
          </div>
        )}

        {/* Next Prayer Countdown Bar */}
        <div className="bg-black/30 border border-white/10 rounded-2xl px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center space-x-3">
            <span className={`font-bold px-3 py-1 rounded-full ${themeStyles.accentBadge}`}>
              বর্তমান ওয়াক্ত: {waqtStatus.currentWaqtBn}
            </span>
            <span className="text-slate-300">
              পরবর্তী ওয়াক্ত: <strong className="text-white">{waqtStatus.nextPrayerBn || waqtStatus.nextWaqtBn}</strong> ({waqtStatus.nextJamaatTimeStr ? 'জামাত' : 'আজান'}: {waqtStatus.nextPrayerTime || waqtStatus.nextJamaatTimeStr || waqtStatus.nextAdhanTimeStr})
            </span>
          </div>

          <div className="flex items-center space-x-2 font-mono font-bold">
            <span className="text-slate-300">বাকি সময়:</span>
            <span className={`text-base sm:text-lg font-black px-3 py-0.5 rounded-xl bg-black/50 ${
              waqtStatus.isJamaatApproaching ? 'text-amber-400 animate-pulse border border-amber-500/50' : themeStyles.accentText
            }`}>
              {waqtStatus.waqtRemainingStrBn || waqtStatus.nextWaqtStartsInStrBn || ''}
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          DYNAMIC ROTATING SLIDE CONTENT AREA
          ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col justify-center my-2">
        {/* SLIDE 1: PRAYER TIMINGS & WAQT ENGINE */}
        {currentSlide.id === 'PRAYER' && (
          <div className="space-y-5 animate-in fade-in zoom-in-98 duration-300">
            {/* 5 Daily Prayers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {portalData.prayerTimes.map((p, idx) => {
                const isCurrent = p.nameBn.includes(waqtStatus.currentWaqtBn.split(' ')[0]);
                return (
                  <div
                    key={idx}
                    className={`rounded-3xl p-5 sm:p-7 border text-center transition-all duration-300 flex flex-col justify-between min-h-[170px] sm:min-h-[200px] ${
                      isCurrent ? themeStyles.activeCard : themeStyles.card
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className={`text-lg sm:text-2xl font-black ${isCurrent ? 'text-slate-950' : themeStyles.accentText}`}>
                          {p.nameBn}
                        </span>
                      </div>
                      <div className={`text-xs sm:text-sm mt-1.5 font-medium ${isCurrent ? 'text-slate-900' : 'text-slate-300'}`}>
                        আজান: <strong className="font-mono text-sm sm:text-base">{p.adhan}</strong>
                      </div>
                    </div>

                    <div className={`mt-3 py-2.5 px-3 rounded-2xl text-xl sm:text-3xl font-black tracking-tight ${
                      isCurrent ? 'bg-black/20 text-slate-950' : 'bg-black/40 text-white font-mono'
                    }`}>
                      জামাত {p.iqamah}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Jumu'ah & Secondary Sunnah/Nafl Times Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs sm:text-sm">
              {/* Jumu'ah Friday Box */}
              {settings.jumuahSchedule && portalData.jumuahTime && (
                <div className={`lg:col-span-6 rounded-3xl p-4 sm:p-5 border flex flex-wrap items-center justify-between gap-3 ${themeStyles.card}`}>
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-base font-black text-amber-300 block">জুমার বিশেষ নামাজ (শুক্রবার)</span>
                      <span className="text-xs text-slate-300">খুতবা ও জামাতের আনুষ্ঠানিক সময়</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 font-mono font-bold">
                    <span>আজান: <strong className="text-white">{portalData.jumuahTime.adhan}</strong></span>
                    <span>খুতবা: <strong className="text-white">{portalData.jumuahTime.khutbah}</strong></span>
                    <span className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl font-black text-sm">
                      জামাত: {portalData.jumuahTime.iqamah}
                    </span>
                  </div>
                </div>
              )}

              {/* Sunnah & Nawafil Timing Strip */}
              <div className={`${settings.jumuahSchedule ? 'lg:col-span-6' : 'lg:col-span-12'} rounded-3xl p-4 sm:p-5 border flex flex-wrap items-center justify-around gap-2 text-center ${themeStyles.card}`}>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block">সূর্যোদয় (Sunrise)</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">{waqtStatus.sunriseTimeStr}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block">ইশরাক (Ishraq)</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">{waqtStatus.ishraqTimeStr}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block">সূর্যাস্ত (Sunset)</span>
                  <span className="font-mono font-bold text-rose-300 text-sm">{waqtStatus.sunsetTimeStr}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block">তাহাজ্জুদ শেষ</span>
                  <span className="font-mono font-bold text-sky-300 text-sm">{waqtStatus.tahajjudEndTimeStr}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block">সেহরি শেষ</span>
                  <span className="font-mono font-bold text-purple-300 text-sm">{waqtStatus.sehriEndTimeStr}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 block">ইফতার সময়</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{waqtStatus.iftarTimeStr}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: NOTICE BOARD & ANNOUNCEMENTS */}
        {currentSlide.id === 'NOTICES' && (
          <div className="space-y-4 animate-in fade-in zoom-in-98 duration-300 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <Bell className="w-7 h-7 text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-black">মসজিদের নোটিশ বোর্ড ও ধর্মীয় বিজ্ঞপ্তি</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                মোট {toBanglaDigits(portalData.notices.length)} টি বিজ্ঞপ্তি
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {portalData.notices.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className={`rounded-3xl p-6 border space-y-3 flex flex-col justify-between ${
                    n.isEmergency || n.priority === 'URGENT'
                      ? 'bg-rose-950/80 border-rose-500/60 ring-2 ring-rose-500/30'
                      : themeStyles.card
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                        {n.title}
                      </h3>
                      {n.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                          n.priority === 'URGENT' ? 'bg-rose-600 text-white' : 'bg-white/10 text-slate-300'
                        }`}>
                          {n.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-4">
                      {n.description}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10 flex items-center justify-between font-mono">
                    <span>প্রকাশের তারিখ: {n.publishDate}</span>
                    <span className="text-emerald-400 font-sans font-semibold">পরিচালনা কমিটি</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 3: DONATIONS & QR CODES */}
        {currentSlide.id === 'DONATION' && (
          <div className="space-y-6 animate-in fade-in zoom-in-98 duration-300 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <Heart className="w-7 h-7 text-rose-400" />
                <h2 className="text-xl sm:text-2xl font-black">ডিজিটাল দান, সাদাকাহ ও অফিসিয়াল ব্যাংক চ্যানেল</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                সদকায়ে জারিয়া
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* QR Code Big Tile */}
              {settings.donationQr && portalData.donationChannels?.qrCodeUrl && (
                <div className={`lg:col-span-5 rounded-3xl p-6 border text-center space-y-3 flex flex-col items-center justify-center ${themeStyles.card}`}>
                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                    <img
                      src={portalData.donationChannels.qrCodeUrl}
                      alt="Donation QR"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white block">যেকোনো অ্যাপ দিয়ে স্ক্যান করে দান করুন</span>
                    <p className="text-xs text-slate-300">বিকাশ / নগদ / রকেট মার্চেন্ট বা পেমেন্ট কিউআর</p>
                  </div>
                </div>
              )}

              {/* Bank & Mobile Numbers */}
              <div className={`${settings.donationQr ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                {/* Mobile Banking Capsule */}
                {settings.mobileBanking && portalData.donationChannels?.mobileBanking && (
                  <div className={`rounded-3xl p-5 border space-y-3 ${themeStyles.card}`}>
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 block">মোবাইল ব্যাংকিং মার্চেন্ট একাউন্ট</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {portalData.donationChannels.mobileBanking.bkash && (
                        <div className="bg-pink-950/40 border border-pink-500/40 rounded-2xl p-3.5 space-y-1">
                          <span className="text-xs font-bold text-pink-300 block">বিকাশ (bKash) মার্চেন্ট</span>
                          <span className="font-mono font-black text-white text-base">
                            {portalData.donationChannels.mobileBanking.bkash}
                          </span>
                        </div>
                      )}
                      {portalData.donationChannels.mobileBanking.nagad && (
                        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 space-y-1">
                          <span className="text-xs font-bold text-amber-300 block">নগদ (Nagad) মার্চেন্ট</span>
                          <span className="font-mono font-black text-white text-base">
                            {portalData.donationChannels.mobileBanking.nagad}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bank Accounts List */}
                {settings.bankAccount && portalData.donationChannels?.bankAccounts && portalData.donationChannels.bankAccounts.length > 0 && (
                  <div className={`rounded-3xl p-5 border space-y-3 ${themeStyles.card}`}>
                    <span className="text-xs uppercase font-bold tracking-wider text-sky-400 block">অফিসিয়াল ব্যাংক হিসাব</span>
                    <div className="space-y-2">
                      {portalData.donationChannels.bankAccounts.map(acc => (
                        <div key={acc.id} className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-white block">{acc.nameBn}</span>
                            <span className="text-xs text-slate-300">{acc.bankName} {acc.branchName && `(${acc.branchName} শাখা)`}</span>
                          </div>
                          {acc.accountNumber && (
                            <span className="font-mono font-black text-emerald-400 text-sm sm:text-base">
                              {acc.accountNumber}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: FINANCIAL TRANSPARENCY DASHBOARD */}
        {currentSlide.id === 'FINANCE' && portalData.financialTransparency && (
          <div className="space-y-6 animate-in fade-in zoom-in-98 duration-300 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <Scale className="w-7 h-7 text-emerald-400" />
                <h2 className="text-xl sm:text-2xl font-black">
                  আর্থিক স্বচ্ছতা ড্যাশবোর্ড ({portalData.financialTransparency.currentMonthNameBn || 'চলতি মাস'})
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                স্বচ্ছতা ও জবাবদিহিতা
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {settings.monthlyIncome && portalData.financialTransparency.monthlyIncome !== undefined && (
                <div className={`rounded-3xl p-6 border space-y-2 ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span>চলতি মাসের মোট আয়</span>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300">
                    ৳ {portalData.financialTransparency.monthlyIncome.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-400">দানবাক্স, চাঁদা ও অনুদান</p>
                </div>
              )}

              {settings.monthlyExpense && portalData.financialTransparency.monthlyExpense !== undefined && (
                <div className={`rounded-3xl p-6 border space-y-2 ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs text-rose-400 font-bold">
                    <span>চলতি মাসের মোট ব্যয়</span>
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-rose-300">
                    ৳ {portalData.financialTransparency.monthlyExpense.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-400">সম্মানী ভাতা ও বিলসমূহ</p>
                </div>
              )}

              {settings.monthlySurplus && portalData.financialTransparency.monthlySurplus !== undefined && (
                <div className={`rounded-3xl p-6 border space-y-2 ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
                    <span>মাসের নিট উদ্বৃত্ত</span>
                    <Scale className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-blue-300">
                    ৳ {portalData.financialTransparency.monthlySurplus.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-400">আয় বিয়োগ চলতি ব্যয়</p>
                </div>
              )}

              {settings.totalDonationReceived && portalData.financialTransparency.totalDonationsReceived !== undefined && (
                <div className={`rounded-3xl p-6 border space-y-2 ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs text-purple-400 font-bold">
                    <span>মোট সংগৃহীত দান</span>
                    <Heart className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-purple-300">
                    ৳ {portalData.financialTransparency.totalDonationsReceived.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-400">সকল চ্যানেল থেকে সংগৃহীত</p>
                </div>
              )}

              {settings.currentBalance && portalData.financialTransparency.currentBalance !== undefined && (
                <div className={`rounded-3xl p-6 border space-y-2 ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                    <span>সর্বমোট তহবিল স্থিতি</span>
                    <Landmark className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                    ৳ {portalData.financialTransparency.currentBalance.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-400">ক্যাশ ও ব্যাংকের মোট রিজার্ভ</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLIDE 5: PROJECTS & WAQF PROPERTIES */}
        {currentSlide.id === 'PROJECTS_WAQF' && (
          <div className="space-y-6 animate-in fade-in zoom-in-98 duration-300 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <TrendingUp className="w-7 h-7 text-indigo-400" />
                <h2 className="text-xl sm:text-2xl font-black">চলমান উন্নয়ন কর্মপরিকল্পনা ও ওয়াকফ সম্পদ</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                অবকাঠামো ও ওয়াকফ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {portalData.projects.slice(0, 4).map((p) => (
                <div key={p.id} className={`rounded-3xl p-6 border space-y-3 ${themeStyles.card}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{p.title}</h3>
                      {p.planNumber && <span className="text-[10px] text-slate-400 font-mono">আইডি: {p.planNumber}</span>}
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40">
                      {p.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{p.description}</p>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-bold text-slate-200">
                      <span>বাস্তবায়ন অগ্রগতি</span>
                      <span className="font-mono text-emerald-400">{toBanglaDigits(p.progressPercentage)}%</span>
                    </div>
                    <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${p.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 6: LEADERSHIP & STAFF */}
        {currentSlide.id === 'LEADERSHIP' && (
          <div className="space-y-6 animate-in fade-in zoom-in-98 duration-300 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <Users2 className="w-7 h-7 text-sky-400" />
                <h2 className="text-xl sm:text-2xl font-black">মসজিদ পরিচালনা কমিটি ও ইমাম-খাদেমবৃন্দ</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${themeStyles.accentBadge}`}>
                নেতৃত্ব ও খিদমত
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Committee Members */}
              {portalData.committee && (
                <div className={`rounded-3xl p-6 border space-y-3 ${themeStyles.card}`}>
                  <span className="text-xs uppercase font-bold tracking-wider text-sky-300 block">
                    {portalData.committee.termTitle}
                  </span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {portalData.committee.members.slice(0, 6).map((m) => (
                      <div key={m.id} className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-bold text-white">{m.name}</span>
                        <span className="text-xs text-sky-300 bg-sky-950/60 px-2.5 py-0.5 rounded-lg border border-sky-500/30">
                          {m.designation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff / Imams */}
              {portalData.staff.length > 0 && (
                <div className={`rounded-3xl p-6 border space-y-3 ${themeStyles.card}`}>
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-300 block">
                    সম্মানিত ইমাম, খতিব ও মুয়াজ্জিনবৃন্দ
                  </span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {portalData.staff.slice(0, 6).map((s) => (
                      <div key={s.id} className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between text-xs sm:text-sm">
                        <div>
                          <span className="font-bold text-white block">{s.name}</span>
                          {s.joiningDate && <span className="text-[10px] text-slate-400">কার্যকাল: {s.joiningDate}</span>}
                        </div>
                        <span className="text-xs text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
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

      {/* -------------------------------------------------------------
          BOTTOM CONTROLLER BAR: AUTO-PLAY, SLIDE PILLS & THEME
          ------------------------------------------------------------- */}
      <div className={`rounded-3xl p-3.5 sm:p-4 border flex flex-wrap items-center justify-between gap-4 mt-3 ${themeStyles.topBar}`}>
        {/* Left: Auto-Play & Navigation Arrows */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoPlay(p => !p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isAutoPlay ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-white/10 text-slate-300'
            }`}
            title="Space চাপলে প্লে/পজ হবে"
          >
            {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAutoPlay ? 'চলমান' : 'বিরতি'}</span>
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
            <div className="w-24 sm:w-32 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full ${themeStyles.progressBar} transition-all duration-100 ease-linear`}
                style={{ width: `${slideProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Center: Slide Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full">
          {availableSlides.map((slide, idx) => {
            const isActive = idx === activeSlideIndex;
            return (
              <button
                key={slide.id}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setSlideProgress(0);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-md scale-105'
                    : 'bg-black/30 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {toBanglaDigits(idx + 1)}. {slide.titleBn.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Right: Theme Selector & Exit Button */}
        <div className="flex items-center space-x-2">
          {/* Theme Selector */}
          <div className="flex items-center space-x-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setSelectedTheme('EMERALD_NIGHT')}
              className={`p-1.5 rounded-lg transition-all ${
                selectedTheme === 'EMERALD_NIGHT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="এমারেল্ড নাইট থিম"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedTheme('MIDNIGHT_GOLD')}
              className={`p-1.5 rounded-lg transition-all ${
                selectedTheme === 'MIDNIGHT_GOLD' ? 'bg-amber-600 text-slate-950 shadow-xs font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="মিডনাইট গোল্ড থিম"
            >
              <Flame className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedTheme('LIGHT')}
              className={`p-1.5 rounded-lg transition-all ${
                selectedTheme === 'LIGHT' ? 'bg-slate-200 text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="উজ্জ্বল ডেলাইট থিম"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exit to Standard Portal View */}
          <button
            id="btn-exit-tv-mode"
            onClick={onExitDisplayMode}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all cursor-pointer"
          >
            সাধারণ ভিউ
          </button>
        </div>
      </div>
    </div>
  );
};

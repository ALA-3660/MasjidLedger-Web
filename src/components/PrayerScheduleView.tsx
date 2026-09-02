import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Compass,
  Calendar,
  AlertTriangle,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Volume2,
  VolumeX,
  Printer,
  Download,
  Settings,
  Tv,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Info,
  MapPin,
  Save,
  RotateCcw,
  Sparkles,
  Maximize,
  Minimize,
  Sliders,
  Check,
} from 'lucide-react';
import { Mosque, MosquePrayerSettings, DailyPrayerSchedule, MonthlyPrayerDay } from '../types';
import { Language } from '../lib/i18n';
import {
  buildDailyPrayerSchedule,
  buildMonthlyPrayerCalendar,
  BANGLADESH_DISTRICTS,
  toBanglaDigits,
  formatMinutesToBanglaTime,
  playPrayerNotificationSound,
  formatDurationDigital,
} from '../lib/prayerEngine';
import { api } from '../lib/api';

interface PrayerScheduleViewProps {
  currentMosque?: Mosque | null;
  language?: Language;
  onUpdateMosqueSettings?: (settings: Partial<Mosque>) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export const PrayerScheduleView: React.FC<PrayerScheduleViewProps> = ({
  currentMosque,
  language = 'bn',
  onUpdateMosqueSettings,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [selectedDistrict, setSelectedDistrict] = useState<string>(currentMosque?.district || 'ঢাকা');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY' | 'SETTINGS' | 'DISPLAY_KIOSK'>('DAILY');

  // Monthly Calendar State
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1);

  // Settings Edit State
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [editSettings, setEditSettings] = useState<Partial<MosquePrayerSettings>>({
    district: currentMosque?.district || 'ঢাকা',
    madhab: currentMosque?.prayerSettings?.madhab || 'HANAFI',
    fajrAngle: currentMosque?.prayerSettings?.fajrAngle || 18,
    ishaAngle: currentMosque?.prayerSettings?.ishaAngle || 18,
    ishraqOffsetMinutes: currentMosque?.prayerSettings?.ishraqOffsetMinutes || 10,
    zawalForbiddenDurationMinutes: currentMosque?.prayerSettings?.zawalForbiddenDurationMinutes || 10,
    sunriseForbiddenDurationMinutes: currentMosque?.prayerSettings?.sunriseForbiddenDurationMinutes || 12,
    sunsetForbiddenDurationMinutes: currentMosque?.prayerSettings?.sunsetForbiddenDurationMinutes || 15,
    warningThresholdMinutes: currentMosque?.prayerSettings?.warningThresholdMinutes || 10,
    fajr: { adhan: currentMosque?.prayerSettings?.fajr?.adhan || currentMosque?.jamaatSettings?.fajr?.azan || 'Auto', jamaat: currentMosque?.prayerSettings?.fajr?.jamaat || currentMosque?.jamaatSettings?.fajr?.jamaat || '05:15', manualOffset: 0 },
    dhuhr: { adhan: currentMosque?.prayerSettings?.dhuhr?.adhan || currentMosque?.jamaatSettings?.dhuhr?.azan || 'Auto', jamaat: currentMosque?.prayerSettings?.dhuhr?.jamaat || currentMosque?.jamaatSettings?.dhuhr?.jamaat || '13:30', manualOffset: 0 },
    asr: { adhan: currentMosque?.prayerSettings?.asr?.adhan || currentMosque?.jamaatSettings?.asr?.azan || 'Auto', jamaat: currentMosque?.prayerSettings?.asr?.jamaat || currentMosque?.jamaatSettings?.asr?.jamaat || '16:45', manualOffset: 0 },
    maghrib: { adhan: currentMosque?.prayerSettings?.maghrib?.adhan || currentMosque?.jamaatSettings?.maghrib?.azan || 'Auto', jamaat: currentMosque?.prayerSettings?.maghrib?.jamaat || currentMosque?.jamaatSettings?.maghrib?.jamaat || '18:25', manualOffset: 0 },
    isha: { adhan: currentMosque?.prayerSettings?.isha?.adhan || currentMosque?.jamaatSettings?.isha?.azan || 'Auto', jamaat: currentMosque?.prayerSettings?.isha?.jamaat || currentMosque?.jamaatSettings?.isha?.jamaat || '20:00', manualOffset: 0 },
    jumuah: { adhan: currentMosque?.prayerSettings?.jumuah?.adhan || '13:15', khutbah: currentMosque?.prayerSettings?.jumuah?.khutbah || '13:25', jamaat: currentMosque?.prayerSettings?.jumuah?.jamaat || '13:45' },
  });

  // Keep live time ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live prayer schedule
  const dailySchedule: DailyPrayerSchedule = useMemo(() => {
    return buildDailyPrayerSchedule(
      now,
      currentMosque?.prayerSettings || editSettings,
      currentMosque?.jamaatSettings,
      selectedDistrict
    );
  }, [now, currentMosque, editSettings, selectedDistrict]);

  // Compute monthly prayer days
  const monthlyDays: MonthlyPrayerDay[] = useMemo(() => {
    return buildMonthlyPrayerCalendar(
      calendarYear,
      calendarMonth,
      currentMosque?.prayerSettings || editSettings,
      selectedDistrict
    );
  }, [calendarYear, calendarMonth, currentMosque, editSettings, selectedDistrict]);

  // Play audio sound on jamaat approaching if audio enabled
  const prevApproachingRef = useRef<boolean>(false);
  useEffect(() => {
    if (audioEnabled && dailySchedule.currentPrayer?.status === 'JAMAT_UPCOMING' && !prevApproachingRef.current) {
      playPrayerNotificationSound('IQAMAH_ALERT');
    }
    prevApproachingRef.current = dailySchedule.currentPrayer?.status === 'JAMAT_UPCOMING';
  }, [audioEnabled, dailySchedule.currentPrayer?.status]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveSuccessMsg(null);
    try {
      const updatedMosque = await api.updatePrayerSettings(editSettings);
      if (onUpdateMosqueSettings) {
        await onUpdateMosqueSettings(updatedMosque);
      }
      setSaveSuccessMsg('নামাজের সময়সূচী ও জামাত কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('সংরক্ষণ ব্যর্থ হয়েছে: ' + (err.message || 'অজানা ত্রুটি'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Day', 'Hijri', 'Sehri End', 'Fajr Start', 'Fajr Jamaat', 'Sunrise', 'Ishraq', 'Solar Noon', 'Dhuhr Start', 'Dhuhr Jamaat', 'Asr Start', 'Asr Jamaat', 'Sunset', 'Iftar', 'Maghrib Start', 'Maghrib Jamaat', 'Isha Start', 'Isha Jamaat', 'Jumuah'];
    const rows = monthlyDays.map(d => [
      d.date,
      d.dayNameEn,
      `"${d.hijriDateBn}"`,
      d.sehriEnd,
      d.fajrStart,
      d.fajrJamaat,
      d.sunrise,
      d.ishraq,
      d.solarNoon,
      d.dhuhrStart,
      d.dhuhrJamaat,
      d.asrStart,
      d.asrJamaat,
      d.sunset,
      d.iftar,
      d.maghribStart,
      d.maghribJamaat,
      d.ishaStart,
      d.ishaJamaat,
      d.jumuah || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `masjid_prayer_schedule_${calendarYear}_${calendarMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  // Fullscreen TV Display Mode View
  if (activeTab === 'DISPLAY_KIOSK') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 font-siliguri select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                {currentMosque?.nameBn || 'মসজিদের নাম'}
              </h1>
              <p className="text-slate-400 text-sm flex items-center space-x-2 mt-0.5">
                <span>{dailySchedule.district} জেলা</span>
                <span>•</span>
                <span>{dailySchedule.hijriDateBn}</span>
                <span>•</span>
                <span>{dailySchedule.bengaliDateBn}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-3xl sm:text-5xl font-mono font-bold text-emerald-400 tracking-wider">
                {toBanglaDigits(dailySchedule.currentTimeStr)}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                বাংলাদেশ মান সময় (BST, UTC+06:00)
              </div>
            </div>
            <button
              onClick={() => setActiveTab('DAILY')}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
              title="ডিসপ্লে মোড বন্ধ করুন"
            >
              <Minimize className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Current / Forbidden Alert Banner */}
        {dailySchedule.forbiddenTimes.isForbiddenNow ? (
          <div className="my-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-600/50 flex items-center space-x-4 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-rose-200">
                হারাম / নিষিদ্ধ সময় চলছে
              </h3>
              <p className="text-sm text-rose-300">
                {dailySchedule.forbiddenTimes.currentForbiddenReasonBn} (নামাজ পড়া থেকে বিরত থাকুন)
              </p>
            </div>
          </div>
        ) : (
          <div className="my-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">বর্তমান অবস্থা</span>
                <p className="text-lg font-bold text-slate-100">{dailySchedule.currentWaqtMessageBn}</p>
              </div>
            </div>
            {dailySchedule.nextPrayer && (
              <div className="text-right">
                <span className="text-xs text-slate-400">পরবর্তী ওয়াক্ত ও জামাত</span>
                <p className="text-base font-bold text-amber-300">
                  {dailySchedule.nextPrayer.nameBn} — {toBanglaDigits(dailySchedule.nextPrayer.jamaat)} ({dailySchedule.nextPrayer.countdownFormattedBn} বাকি)
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5 Prayers Grand Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 my-auto">
          {dailySchedule.prayers.map((prayer) => {
            const isCurrent = prayer.isCurrent;
            const isNext = prayer.isNext;

            return (
              <div
                key={prayer.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                  isCurrent
                    ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500 shadow-2xl shadow-emerald-950/50 ring-2 ring-emerald-500/40'
                    : isNext
                    ? 'bg-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    বর্তমান ওয়াক্ত
                  </div>
                )}
                {isNext && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    পরবর্তী
                  </div>
                )}

                <div>
                  <h3 className="text-2xl font-bold text-slate-100 flex items-center justify-between">
                    <span>{prayer.nameBn}</span>
                    <span className="text-xs font-normal text-slate-400">{prayer.nameEn}</span>
                  </h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-1.5">
                      <span className="text-xs text-slate-400">ওয়াক্ত শুরু:</span>
                      <span className="text-lg font-mono font-semibold text-slate-200">{toBanglaDigits(prayer.waqtStart)}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-slate-800/80 pb-1.5">
                      <span className="text-xs text-slate-400">আজান:</span>
                      <span className="text-xl font-mono font-bold text-blue-400">{toBanglaDigits(prayer.adhan)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs font-bold text-emerald-400">জামাত:</span>
                      <span className="text-3xl font-mono font-extrabold text-emerald-300">{toBanglaDigits(prayer.jamaat)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>ওয়াক্ত সমাপ্তি</span>
                    <span className="font-mono">{toBanglaDigits(prayer.waqtEnd)}</span>
                  </div>
                  {isCurrent && (
                    <div className="mt-2 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${prayer.progressPercentage}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Auxiliary Cards: Tahajjud, Sunrise, Ishraq, Sunset */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400">তাহাজ্জুদ শেষ / সেহরি</span>
            <div className="text-xl font-mono font-bold text-indigo-300 mt-0.5">
              {toBanglaDigits(dailySchedule.tahajjud.endTimeStr)}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400">সূর্যোদয় (Sunrise)</span>
            <div className="text-xl font-mono font-bold text-amber-300 mt-0.5">
              {toBanglaDigits(dailySchedule.sunriseStr)}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400">ইশরাক শুরু (+১০ মিনিট)</span>
            <div className="text-xl font-mono font-bold text-teal-300 mt-0.5">
              {toBanglaDigits(dailySchedule.ishraq.startTimeStr)}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400">সূর্যাস্ত / ইফতার</span>
            <div className="text-xl font-mono font-bold text-rose-300 mt-0.5">
              {toBanglaDigits(dailySchedule.sunsetStr)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-siliguri max-w-7xl mx-auto pb-12">
      {/* Top Header & Quick Action Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                নামাজের সময়সূচি ও জামাত ব্যবস্থাপনা
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                লাইভ গণনা
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>{dailySchedule.gregorianFormattedBn}</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium">{dailySchedule.hijriDateBn}</span>
              <span>•</span>
              <span className="text-slate-600">{dailySchedule.bengaliDateBn}</span>
            </p>
          </div>
        </div>

        {/* Location Selector & View Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* District Selector */}
          <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <MapPin className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {BANGLADESH_DISTRICTS.map((d) => (
                <option key={d.id} value={d.nameBn}>
                  {d.nameBn} ({d.nameEn})
                </option>
              ))}
            </select>
          </div>

          {/* Audio Chime Button */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playPrayerNotificationSound('GENTLE_CHIME');
            }}
            className={`p-2 rounded-xl border text-sm font-medium flex items-center space-x-1.5 transition cursor-pointer ${
              audioEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title={audioEnabled ? 'জামাত অ্যালার্ট সাউন্ড চালু' : 'জামাত অ্যালার্ট সাউন্ড বন্ধ'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-xs hidden sm:inline">{audioEnabled ? 'অ্যালার্ট চালু' : 'শব্দ বন্ধ'}</span>
          </button>

          {/* TV / Kiosk Mode */}
          <button
            onClick={() => setActiveTab('DISPLAY_KIOSK')}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>মসজিদ ডিসপ্লে মোড</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeTab === 'DAILY'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>দৈনিক ওয়াক্ত ও জামাত</span>
        </button>

        <button
          onClick={() => setActiveTab('MONTHLY')}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeTab === 'MONTHLY'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>মাসিক ক্যালেন্ডার</span>
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer ${
            activeTab === 'SETTINGS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>মসজিদ জামাত কনফিগারেশন</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY PRAYER & LIVE STATUS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'DAILY' && (
        <div className="space-y-6">
          {/* Forbidden Time Warning Banner (If Active) */}
          {dailySchedule.forbiddenTimes.isForbiddenNow && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start space-x-3.5 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-base font-bold text-rose-900">
                  সতর্কতা: বর্তমানে নামাজের নিষিদ্ধ সময় চলছে!
                </h4>
                <p className="text-sm text-rose-800 mt-0.5">
                  {dailySchedule.forbiddenTimes.currentForbiddenReasonBn} এই সময়ে যে কোনো প্রকার নফল বা কাজা নামাজ আদায় করা মাকরূহে তাহরিমি।
                </p>
              </div>
            </div>
          )}

          {/* Hero Live Countdown Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700 relative overflow-hidden">
            {/* Background Glow Circles */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute left-10 -top-20 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Left Col: Current Status */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    রিয়েল-টাইম ওয়াক্ত স্ট্যাটাস
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {dailySchedule.currentWaqtMessageBn}
                </h2>

                <p className="text-slate-300 text-sm flex items-center space-x-2">
                  <span>{dailySchedule.nextWaqtMessageBn}</span>
                </p>

                {dailySchedule.currentPrayer && (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                      <span>ওয়াক্ত সমাপ্তির অগ্রগতি</span>
                      <span className="font-mono text-emerald-300">
                        {dailySchedule.currentPrayer.progressPercentage}% অতিবাহিত
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/80 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${dailySchedule.currentPrayer.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col: Live Countdown Clock */}
              <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700 text-center flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  {dailySchedule.currentPrayer ? `${dailySchedule.currentPrayer.nameBn} জামাত বা ওয়াক্ত শেষ হতে` : 'পরবর্তী ওয়াক্ত শুরু হতে'}
                </span>

                <div className="text-4xl sm:text-5xl font-mono font-bold text-emerald-400 tracking-wider my-2">
                  {dailySchedule.currentPrayer
                    ? formatDurationDigital(dailySchedule.currentPrayer.countdownSeconds)
                    : dailySchedule.nextPrayer
                    ? formatDurationDigital(dailySchedule.nextPrayer.countdownSeconds)
                    : '00:00:00'}
                </div>

                <div className="text-xs text-slate-300 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-700/60">
                  {dailySchedule.currentPrayer?.countdownFormattedBn || dailySchedule.nextPrayer?.countdownFormattedBn} বাকি
                </div>
              </div>
            </div>
          </div>

          {/* 5 Daily Prayers Detailed Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {dailySchedule.prayers.map((prayer) => {
              const isCurrent = prayer.isCurrent;
              const isNext = prayer.isNext;

              let cardBg = 'bg-white border-slate-200';
              let badgeBg = 'bg-slate-100 text-slate-700';

              if (isCurrent) {
                cardBg = 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-md';
                badgeBg = 'bg-emerald-600 text-white font-bold';
              } else if (isNext) {
                cardBg = 'bg-amber-50/60 border-amber-300 shadow-sm';
                badgeBg = 'bg-amber-500 text-white font-bold';
              }

              return (
                <div
                  key={prayer.id}
                  className={`rounded-2xl p-5 border transition flex flex-col justify-between ${cardBg}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-900">{prayer.nameBn}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${badgeBg}`}>
                        {prayer.statusLabelBn}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="text-xs">ওয়াক্ত শুরু:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {toBanglaDigits(prayer.waqtStart)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-xs font-medium text-blue-700">আজান:</span>
                        <span className="font-mono font-bold text-blue-700">
                          {toBanglaDigits(prayer.adhan)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/80">
                        <span className="text-xs font-bold text-emerald-800">জামাত:</span>
                        <span className="font-mono text-lg font-extrabold text-emerald-700">
                          {toBanglaDigits(prayer.jamaat)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500 text-xs pt-1">
                        <span>ওয়াক্ত শেষ:</span>
                        <span className="font-mono">{toBanglaDigits(prayer.waqtEnd)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {prayer.dynamicMessageBn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jumu'ah Box (If Friday or Friday Schedule active) */}
          {dailySchedule.isFriday && dailySchedule.jumuah && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200 font-bold">
                  জুমুআ
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">পবিত্র জুমু'আ নামাজের সময়সূচি</h4>
                  <p className="text-xs text-emerald-100">আজ শুক্রবার — জুমার বিশেষ খুতবা ও জামাত</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <span className="text-xs text-emerald-200">প্রথম আজান</span>
                  <p className="text-base font-mono font-bold">{toBanglaDigits(dailySchedule.jumuah.adhan)}</p>
                </div>
                <div className="text-center">
                  <span className="text-xs text-emerald-200">বয়ান ও খুতবা</span>
                  <p className="text-base font-mono font-bold">{toBanglaDigits(dailySchedule.jumuah.khutbah)}</p>
                </div>
                <div className="text-center bg-white/10 px-4 py-1.5 rounded-xl border border-white/20">
                  <span className="text-xs text-emerald-200 font-semibold">জুমার জামাত</span>
                  <p className="text-xl font-mono font-extrabold text-emerald-300">
                    {toBanglaDigits(dailySchedule.jumuah.jamaat)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Special Prayers & Astronomical Windows (Tahajjud, Sunrise, Ishraq, Forbidden) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Tahajjud Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">তাহাজ্জুদ ও সেহরি</h4>
                  <span className="text-xs text-slate-500">নফল সালাত ও রোযার সেহরি</span>
                </div>
              </div>

              <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-600">তাহাজ্জুদ শুরু:</span>
                  <span className="font-mono font-bold text-slate-800">{toBanglaDigits(dailySchedule.tahajjud.startTimeStr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">তাহাজ্জুদ শেষ (ফজর শুরু):</span>
                  <span className="font-mono font-bold text-indigo-700">{toBanglaDigits(dailySchedule.tahajjud.endTimeStr)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-3">
                {dailySchedule.tahajjud.statusMessageBn}
              </p>
            </div>

            {/* 2. Sunrise & Ishraq Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sunrise className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">সূর্যোদয় ও ইশরাক</h4>
                  <span className="text-xs text-slate-500">সূর্যোদয়ের ১০ মিনিট পর ইশরাক</span>
                </div>
              </div>

              <div className="space-y-2 text-sm bg-slate-50 p-3 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-600">সূর্যোদয়ের সময়:</span>
                  <span className="font-mono font-bold text-amber-700">{toBanglaDigits(dailySchedule.sunriseStr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">ইশরাক ওয়াক্ত শুরু:</span>
                  <span className="font-mono font-bold text-teal-700">{toBanglaDigits(dailySchedule.ishraq.startTimeStr)}</span>
                </div>
              </div>

              <p className={`text-xs mt-3 font-medium ${dailySchedule.ishraq.isActive ? 'text-emerald-700' : 'text-slate-600'}`}>
                {dailySchedule.ishraq.statusMessageBn}
              </p>
            </div>

            {/* 3. Forbidden Times (মাকরূহ / নিষিদ্ধ সময়) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">নামাজের ৩টি নিষিদ্ধ সময়</h4>
                  <span className="text-xs text-rose-600 font-medium">নামাজ পড়া থেকে বিরত থাকুন</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                <div className="flex justify-between text-rose-950">
                  <span>১. সূর্যোদয়ের সময়:</span>
                  <span className="font-mono font-bold">
                    {toBanglaDigits(dailySchedule.forbiddenTimes.sunriseForbiddenStart)} - {toBanglaDigits(dailySchedule.forbiddenTimes.sunriseForbiddenEnd)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-950">
                  <span>২. ঠিক দুপুর (জাওয়াল):</span>
                  <span className="font-mono font-bold">
                    {toBanglaDigits(dailySchedule.forbiddenTimes.zawalForbiddenStart)} - {toBanglaDigits(dailySchedule.forbiddenTimes.zawalForbiddenEnd)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-950">
                  <span>৩. সূর্যাস্তের সময়:</span>
                  <span className="font-mono font-bold">
                    {toBanglaDigits(dailySchedule.forbiddenTimes.sunsetForbiddenStart)} - {toBanglaDigits(dailySchedule.forbiddenTimes.sunsetForbiddenEnd)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                * হাদিস অনুযায়ী এই তিন সময়ে যে কোনো প্রকার নামাজ আদায় করা নিষিদ্ধ।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 30-DAY MONTHLY PRAYER CALENDAR */}
      {/* ========================================================================= */}
      {activeTab === 'MONTHLY' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-6">
          {/* Calendar Header Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (calendarMonth === 1) {
                      setCalendarMonth(12);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <h3 className="text-lg font-bold text-slate-900 min-w-[160px] text-center">
                  {monthNamesBn[calendarMonth - 1]} {toBanglaDigits(calendarYear)}
                </h3>

                <button
                  onClick={() => {
                    if (calendarMonth === 12) {
                      setCalendarMonth(1);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                {selectedDistrict} জেলা ভিত্তিক সময়সূচী
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrintSchedule}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>প্রিন্ট শিডিউল</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center space-x-1.5 border border-emerald-200 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>CSV এক্সপোর্ট</span>
              </button>
            </div>
          </div>

          {/* 30-Day Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3">তারিখ ও বার</th>
                  <th className="py-2.5 px-3">হিজরি</th>
                  <th className="py-2.5 px-3 text-indigo-700">সেহরি শেষ</th>
                  <th className="py-2.5 px-3">ফজর শুরু</th>
                  <th className="py-2.5 px-3 font-extrabold text-emerald-800">ফজর জামাত</th>
                  <th className="py-2.5 px-3 text-amber-700">সূর্যোদয়</th>
                  <th className="py-2.5 px-3 text-teal-700">ইশরাক</th>
                  <th className="py-2.5 px-3">যোহর শুরু</th>
                  <th className="py-2.5 px-3 font-extrabold text-emerald-800">যোহর জামাত</th>
                  <th className="py-2.5 px-3">আসর শুরু</th>
                  <th className="py-2.5 px-3 font-extrabold text-emerald-800">আসর জামাত</th>
                  <th className="py-2.5 px-3 text-rose-700">সূর্যাস্ত/ইফতার</th>
                  <th className="py-2.5 px-3">মাগরিব জামাত</th>
                  <th className="py-2.5 px-3">এশা শুরু</th>
                  <th className="py-2.5 px-3 font-extrabold text-emerald-800">এশা জামাত</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyDays.map((day) => {
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <tr
                      key={day.date}
                      className={`hover:bg-slate-50 transition ${
                        isToday ? 'bg-emerald-50/80 font-semibold' : day.isFriday ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{toBanglaDigits(day.dayNumber)}</span>{' '}
                        <span className="text-slate-500 text-[11px]">({day.dayNameBn})</span>
                        {isToday && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-xs bg-emerald-600 text-white text-[9px] uppercase">
                            আজ
                          </span>
                        )}
                        {day.isFriday && !isToday && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-xs bg-amber-200 text-amber-900 text-[9px] font-bold">
                            জুমা
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{day.hijriDateBn}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-indigo-700">{toBanglaDigits(day.sehriEnd)}</td>
                      <td className="py-2 px-3 font-mono">{toBanglaDigits(day.fajrStart)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">{toBanglaDigits(day.fajrJamaat)}</td>
                      <td className="py-2 px-3 font-mono text-amber-700">{toBanglaDigits(day.sunrise)}</td>
                      <td className="py-2 px-3 font-mono text-teal-700">{toBanglaDigits(day.ishraq)}</td>
                      <td className="py-2 px-3 font-mono">{toBanglaDigits(day.dhuhrStart)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                        {day.isFriday && day.jumuah ? toBanglaDigits(day.jumuah) : toBanglaDigits(day.dhuhrJamaat)}
                      </td>
                      <td className="py-2 px-3 font-mono">{toBanglaDigits(day.asrStart)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">{toBanglaDigits(day.asrJamaat)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-700">{toBanglaDigits(day.sunset)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">{toBanglaDigits(day.maghribJamaat)}</td>
                      <td className="py-2 px-3 font-mono">{toBanglaDigits(day.ishaStart)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">{toBanglaDigits(day.ishaJamaat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MOSQUE JAMAAT & ASTRONOMICAL CONFIGURATION SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">মসজিদ জামাত ও নামাজের ওয়াক্ত কনফিগারেশন</h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                আপনার মসজিদের নির্দিষ্ট আজান ও জামাত সময়সূচী এবং ভৌগোলিক গণনা প্যারামিটার নির্ধারণ করুন।
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-sm transition cursor-pointer"
              >
                {isSavingSettings ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold">{saveSuccessMsg}</span>
            </div>
          )}

          {/* Section 1: Mosque 5 Prayers Adhan & Jamaat Schedule */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>দৈনিক ৫ ওয়াক্ত আজান ও জামাতের নির্ধারিত সময় (২৪ ঘণ্টা বা ১২ ঘণ্টা ফরম্যাটে)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Fajr */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-sm">ফজর (Fajr)</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">আজান (Adhan)</label>
                    <input
                      type="text"
                      value={editSettings.fajr?.adhan || 'Auto'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        fajr: { ...editSettings.fajr, adhan: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Auto অথবা 05:00"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">জামাত (Jamaat)</label>
                    <input
                      type="text"
                      value={editSettings.fajr?.jamaat || '05:15'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        fajr: { ...editSettings.fajr, jamaat: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="05:15"
                    />
                  </div>
                </div>
              </div>

              {/* Dhuhr */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-sm">যোহর (Dhuhr)</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">আজান (Adhan)</label>
                    <input
                      type="text"
                      value={editSettings.dhuhr?.adhan || 'Auto'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        dhuhr: { ...editSettings.dhuhr, adhan: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Auto অথবা 13:10"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">জামাত (Jamaat)</label>
                    <input
                      type="text"
                      value={editSettings.dhuhr?.jamaat || '13:30'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        dhuhr: { ...editSettings.dhuhr, jamaat: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="13:30"
                    />
                  </div>
                </div>
              </div>

              {/* Asr */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-sm">আসর (Asr)</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">আজান (Adhan)</label>
                    <input
                      type="text"
                      value={editSettings.asr?.adhan || 'Auto'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        asr: { ...editSettings.asr, adhan: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Auto অথবা 16:30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">জামাত (Jamaat)</label>
                    <input
                      type="text"
                      value={editSettings.asr?.jamaat || '16:45'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        asr: { ...editSettings.asr, jamaat: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="16:45"
                    />
                  </div>
                </div>
              </div>

              {/* Maghrib */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-sm">মাগরিব (Maghrib)</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">আজান (Adhan)</label>
                    <input
                      type="text"
                      value={editSettings.maghrib?.adhan || 'Auto'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        maghrib: { ...editSettings.maghrib, adhan: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Auto অথবা 18:20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">জামাত (Jamaat)</label>
                    <input
                      type="text"
                      value={editSettings.maghrib?.jamaat || '18:25'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        maghrib: { ...editSettings.maghrib, jamaat: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="18:25"
                    />
                  </div>
                </div>
              </div>

              {/* Isha */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 text-sm">এশা (Isha)</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">আজান (Adhan)</label>
                    <input
                      type="text"
                      value={editSettings.isha?.adhan || 'Auto'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        isha: { ...editSettings.isha, adhan: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Auto অথবা 19:45"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">জামাত (Jamaat)</label>
                    <input
                      type="text"
                      value={editSettings.isha?.jamaat || '20:00'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        isha: { ...editSettings.isha, jamaat: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="20:00"
                    />
                  </div>
                </div>
              </div>

              {/* Jumu'ah */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-emerald-800 text-sm">পবিত্র জুমু'আ (Jumuah)</span>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">১ম আজান</label>
                      <input
                        type="text"
                        value={editSettings.jumuah?.adhan || '13:15'}
                        onChange={(e) => setEditSettings({
                          ...editSettings,
                          jumuah: { ...editSettings.jumuah, adhan: e.target.value } as any,
                        })}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        placeholder="13:15"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">খুতবা</label>
                      <input
                        type="text"
                        value={editSettings.jumuah?.khutbah || '13:25'}
                        onChange={(e) => setEditSettings({
                          ...editSettings,
                          jumuah: { ...editSettings.jumuah, khutbah: e.target.value } as any,
                        })}
                        className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        placeholder="13:25"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">জুমার জামাত</label>
                    <input
                      type="text"
                      value={editSettings.jumuah?.jamaat || '13:45'}
                      onChange={(e) => setEditSettings({
                        ...editSettings,
                        jumuah: { ...editSettings.jumuah, jamaat: e.target.value } as any,
                      })}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="13:45"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Astronomical & Jurisprudential Parameters */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Compass className="w-5 h-5 text-indigo-600" />
              <span>ফিকহ ও জ্যোতির্বৈজ্ঞানিক হিসাব প্যারামিটার</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">মাযহাব (Asr Shadow Multiplier)</label>
                <select
                  value={editSettings.madhab || 'HANAFI'}
                  onChange={(e) => setEditSettings({ ...editSettings, madhab: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="HANAFI">হানাফী (দ্বিগুণ ছায়া - আসর ২x)</option>
                  <option value="STANDARD">শাফেয়ী / মালেকী / হাম্বলী (একগুণ ছায়া)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">ইশরাক ব্যবধান (মিনিট)</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={editSettings.ishraqOffsetMinutes || 10}
                  onChange={(e) => setEditSettings({ ...editSettings, ishraqOffsetMinutes: parseInt(e.target.value, 10) || 10 })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">সূর্যোদয়ের কত মিনিট পর ইশরাক শুরু</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">জাওয়াল নিষিদ্ধ সময় (মিনিট)</label>
                <input
                  type="number"
                  min="5"
                  max="20"
                  value={editSettings.zawalForbiddenDurationMinutes || 10}
                  onChange={(e) => setEditSettings({ ...editSettings, zawalForbiddenDurationMinutes: parseInt(e.target.value, 10) || 10 })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">ঠিক দুপুরের নিষিদ্ধ সময়ের ব্যাপ্তি</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">ওয়াক্ত সমাপ্তি সতর্কতা (মিনিট)</label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={editSettings.warningThresholdMinutes || 10}
                  onChange={(e) => setEditSettings({ ...editSettings, warningThresholdMinutes: parseInt(e.target.value, 10) || 10 })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">কত মিনিট পূর্বে শেষ সতর্কতা দেখাবে</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Printer,
  Tv,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Compass,
  ArrowRight,
  RefreshCw,
  Bell,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  ShieldAlert,
  Edit3,
  X,
  Save,
} from 'lucide-react';
import { Mosque, CurrentUser } from '../types';
import {
  calculateLiveWaqt,
  generateMonthlyPrayerTimes,
  BANGLADESH_DISTRICTS,
  getDistrictGeo,
  toBanglaDigits,
  formatMinutesTo24h,
  formatTime12Hour,
  formatDurationDigital,
  playPrayerNotificationSound,
  WaqtStatus,
  MonthlyDayPrayerItem,
  parseTimeToMinutes,
} from '../lib/prayerEngine';
import { Language } from '../lib/i18n';
import { PrayerSchedulePrintModal } from './PrayerSchedulePrintModal';
import { DailyPrayerOverrideModal } from './DailyPrayerOverrideModal';

interface PrayerTimesViewProps {
  currentMosque?: Mosque | null;
  currentUser?: CurrentUser | null;
  language?: Language;
  onOpenDisplayScreen?: () => void;
  onOpenPrintSchedule?: () => void;
  onOpenSettings?: () => void;
  onSaveJamaatTimes?: (jamaatSettings: any) => Promise<void>;
  onRefreshMosque?: () => Promise<void>;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onOpenDisplayScreen,
  onOpenPrintSchedule,
  onOpenSettings,
  onSaveJamaatTimes,
  onRefreshMosque,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    currentMosque?.prayerSettings?.district || currentMosque?.district || 'ঢাকা'
  );
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedOverrideDayItem, setSelectedOverrideDayItem] = useState<MonthlyDayPrayerItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quick edit form state (12-hour format)
  const normTime = (t: string | undefined, def: string) => (!t ? def : formatTime12Hour(t));

  const [editFormData, setEditFormData] = useState({
    fajrAzan: normTime(currentMosque?.jamaatSettings?.fajr?.azan, '4:28 AM'),
    fajrJamaat: normTime(currentMosque?.jamaatSettings?.fajr?.jamaat, '5:15 AM'),
    dhuhrAzan: normTime(currentMosque?.jamaatSettings?.dhuhr?.azan, '12:30 PM'),
    dhuhrJamaat: normTime(currentMosque?.jamaatSettings?.dhuhr?.jamaat, '1:30 PM'),
    asrAzan: normTime(currentMosque?.jamaatSettings?.asr?.azan, '4:21 PM'),
    asrJamaat: normTime(currentMosque?.jamaatSettings?.asr?.jamaat, '4:45 PM'),
    maghribAzan: normTime(currentMosque?.jamaatSettings?.maghrib?.azan, '6:05 PM'),
    maghribJamaat: normTime(currentMosque?.jamaatSettings?.maghrib?.jamaat, '6:30 PM'),
    ishaAzan: normTime(currentMosque?.jamaatSettings?.isha?.azan, '7:21 PM'),
    ishaJamaat: normTime(currentMosque?.jamaatSettings?.isha?.jamaat, '8:15 PM'),
    jumuahAzan: normTime(currentMosque?.jamaatSettings?.jumuah?.azan, '12:30 PM'),
    jumuahKhutbah: normTime(currentMosque?.jamaatSettings?.jumuah?.khutbah, '1:00 PM'),
    jumuahJamaat: normTime(currentMosque?.jamaatSettings?.jumuah?.jamaat, '1:30 PM'),
  });

  // Real-time ticking state
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync district if mosque updates
  useEffect(() => {
    if (currentMosque?.district) {
      setSelectedDistrict(currentMosque.district);
    }
  }, [currentMosque?.district]);

  // Sync quick edit form if mosque changes
  useEffect(() => {
    if (currentMosque?.jamaatSettings) {
      const j = currentMosque.jamaatSettings;
      setEditFormData({
        fajrAzan: normTime(j.fajr?.azan, '4:28 AM'),
        fajrJamaat: normTime(j.fajr?.jamaat, '5:15 AM'),
        dhuhrAzan: normTime(j.dhuhr?.azan, '12:30 PM'),
        dhuhrJamaat: normTime(j.dhuhr?.jamaat, '1:30 PM'),
        asrAzan: normTime(j.asr?.azan, '4:21 PM'),
        asrJamaat: normTime(j.asr?.jamaat, '4:45 PM'),
        maghribAzan: normTime(j.maghrib?.azan, '6:05 PM'),
        maghribJamaat: normTime(j.maghrib?.jamaat, '6:30 PM'),
        ishaAzan: normTime(j.isha?.azan, '7:21 PM'),
        ishaJamaat: normTime(j.isha?.jamaat, '8:15 PM'),
        jumuahAzan: normTime(j.jumuah?.azan, '12:30 PM'),
        jumuahKhutbah: normTime(j.jumuah?.khutbah, '1:00 PM'),
        jumuahJamaat: normTime(j.jumuah?.jamaat, '1:30 PM'),
      });
    }
  }, [currentMosque?.jamaatSettings]);

  // Derive comprehensive live calculation with manual overrides precedence
  const waqtStatus: WaqtStatus = useMemo(() => {
    return calculateLiveWaqt(now, null, {
      district: selectedDistrict,
      latitude: currentMosque?.latitude,
      longitude: currentMosque?.longitude,
      jamaatSettings: currentMosque?.jamaatSettings,
      prayerSettings: currentMosque?.prayerSettings,
      prayerDailyOverrides: currentMosque?.prayerDailyOverrides,
    });
  }, [now, selectedDistrict, currentMosque]);

  // Sound Chime Alert on Jamaat Approaching
  useEffect(() => {
    if (soundEnabled && waqtStatus.isJamaatNow) {
      playPrayerNotificationSound('IQAMAH_ALERT');
    }
  }, [soundEnabled, waqtStatus.isJamaatNow]);

  // Monthly Schedule with overrides
  const monthlyList = useMemo(() => {
    return generateMonthlyPrayerTimes(
      selectedYear,
      selectedMonth,
      selectedDistrict,
      currentMosque?.latitude,
      currentMosque?.longitude,
      {
        madhab: currentMosque?.prayerSettings?.madhab || 'HANAFI',
        fajrAngle: currentMosque?.prayerSettings?.fajrAngle || 18,
        ishaAngle: currentMosque?.prayerSettings?.ishaAngle || 18,
        ishraqOffsetMins: (currentMosque?.prayerSettings as any)?.ishraqOffsetMinutes ?? currentMosque?.prayerSettings?.ishraqOffsetMins ?? 10,
        fajrOffset: (currentMosque?.prayerSettings as any)?.fajr?.manualOffset ?? 0,
        dhuhrOffset: (currentMosque?.prayerSettings as any)?.dhuhr?.manualOffset ?? 0,
        asrOffset: (currentMosque?.prayerSettings as any)?.asr?.manualOffset ?? 0,
        maghribOffset: (currentMosque?.prayerSettings as any)?.maghrib?.manualOffset ?? 0,
        ishaOffset: (currentMosque?.prayerSettings as any)?.isha?.manualOffset ?? 0,
      },
      {
        jamaatSettings: currentMosque?.jamaatSettings,
        prayerDailyOverrides: currentMosque?.prayerDailyOverrides,
        district: selectedDistrict,
      }
    );
  }, [selectedYear, selectedMonth, selectedDistrict, currentMosque]);

  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  // Fasting & Ramadan Live Countdown Logic
  const fastingCountdown = useMemo(() => {
    const curMin = now.getHours() * 60 + now.getMinutes();
    const iftarMin = parseTimeToMinutes(waqtStatus.iftarTimeStr || '18:05');
    const sehriMin = parseTimeToMinutes(waqtStatus.sehriEndTimeStr || '04:28');

    // Daytime: between sehri end and iftar
    if (curMin >= sehriMin && curMin < iftarMin) {
      const diffSec = (iftarMin - curMin) * 60 - now.getSeconds();
      const h = Math.floor(Math.max(0, diffSec) / 3600);
      const m = Math.floor((Math.max(0, diffSec) % 3600) / 60);
      const s = Math.max(0, diffSec) % 60;
      return {
        type: 'IFTAR' as const,
        title: '🌙 আজকের ইফতার হতে বাকি',
        timeStr: `${toBanglaDigits(h)} ঘণ্টা ${toBanglaDigits(m)} মিনিট ${toBanglaDigits(s)} সেকেন্ড`,
        targetTime: waqtStatus.iftarTimeStr12,
        badgeText: 'আজকের ইফতার',
      };
    } else {
      let diffMin = 0;
      if (curMin >= iftarMin) {
        diffMin = (1440 - curMin) + sehriMin;
      } else {
        diffMin = sehriMin - curMin;
      }
      const diffSec = diffMin * 60 - now.getSeconds();
      const h = Math.floor(Math.max(0, diffSec) / 3600);
      const m = Math.floor((Math.max(0, diffSec) % 3600) / 60);
      const s = Math.max(0, diffSec) % 60;
      return {
        type: 'SEHRI' as const,
        title: '🍲 আগামী সেহরির শেষ সময় হতে বাকি',
        timeStr: `${toBanglaDigits(h)} ঘণ্টা ${toBanglaDigits(m)} মিনিট ${toBanglaDigits(s)} সেকেন্ড`,
        targetTime: waqtStatus.sehriEndTimeStr12,
        badgeText: 'সেহরি শেষ সময়',
      };
    }
  }, [now, waqtStatus.iftarTimeStr, waqtStatus.sehriEndTimeStr, waqtStatus.iftarTimeStr12, waqtStatus.sehriEndTimeStr12]);

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveJamaatTimes) return;

    try {
      setIsSaving(true);
      const updatedJamaat = {
        ...(currentMosque?.jamaatSettings || {}),
        fajr: {
          azan: formatTime12Hour(editFormData.fajrAzan),
          jamaat: formatTime12Hour(editFormData.fajrJamaat),
        },
        dhuhr: {
          azan: formatTime12Hour(editFormData.dhuhrAzan),
          jamaat: formatTime12Hour(editFormData.dhuhrJamaat),
        },
        asr: {
          azan: formatTime12Hour(editFormData.asrAzan),
          jamaat: formatTime12Hour(editFormData.asrJamaat),
        },
        maghrib: {
          azan: formatTime12Hour(editFormData.maghribAzan),
          jamaat: formatTime12Hour(editFormData.maghribJamaat),
        },
        isha: {
          azan: formatTime12Hour(editFormData.ishaAzan),
          jamaat: formatTime12Hour(editFormData.ishaJamaat),
        },
        jumuah: {
          azan: formatTime12Hour(editFormData.jumuahAzan),
          khutbah: formatTime12Hour(editFormData.jumuahKhutbah),
          jamaat: formatTime12Hour(editFormData.jumuahJamaat),
        },
      };

      await onSaveJamaatTimes(updatedJamaat);
      setSaveSuccessMsg('আজান ও জামাতের নির্ধারিত ১২-ঘণ্টার সময়সূচি সফলভাবে সংরক্ষিত হয়েছে।');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setIsQuickEditOpen(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'ACCOUNTANT' ||
    Boolean(currentUser?.permissions?.includes('MANAGE_SETTINGS'));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-siliguri">
      {/* 1. Header Banner with Live Clock, District Selector & Action Buttons */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-7 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Mosque & Date Info */}
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>বাংলাদেশ মান সময় (BST / UTC+6)</span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {currentMosque?.nameBn || currentMosque?.name || 'মসজিদলেজার'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
              🕌 নামাজের সময়সূচি ও লাইভ ওয়াক্ত ব্যবস্থা
            </h1>

            <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 font-baloo">
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>{waqtStatus.dateBn}</span>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-300 font-medium">🌙 {waqtStatus.hijriDateBn}</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300 font-medium">🌾 {waqtStatus.bengaliDateBn}</span>
            </div>
          </div>

          {/* Right: Live Clock & Action Tools */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Live Clock Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-xl flex items-center space-x-3.5 shadow-inner">
              <Clock className="w-6 h-6 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-2xl font-bold text-white font-mono tracking-wider flex items-baseline space-x-1">
                  <span>{waqtStatus.currentTimeBn}</span>
                  <span className="text-xs text-emerald-300 font-sans ml-1 font-semibold">{waqtStatus.currentTime12.split(' ')[1] || 'BST'}</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  ১২ ঘণ্টার ঘড়ি: <span className="font-mono text-emerald-300 font-bold">{waqtStatus.currentTime12}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* District Dropdown */}
              <div className="relative">
                <select
                  id="prayer-district-select"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold px-3 py-2.5 rounded-xl appearance-none pr-8 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                  title="জেলা পরিবর্তন করুন"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.nameBn} className="bg-slate-900 text-white">
                      📍 {d.nameBn} ({d.nameEn})
                    </option>
                  ))}
                </select>
                <MapPin className="w-3.5 h-3.5 text-slate-300 absolute right-2.5 top-3 pointer-events-none" />
              </div>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/15'
                }`}
                title={soundEnabled ? 'সাউন্ড অ্যালার্ট সক্রিয়' : 'সাউন্ড অ্যালার্ট বন্ধ'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* TV Screen Button */}
              {onOpenDisplayScreen && (
                <button
                  type="button"
                  onClick={onOpenDisplayScreen}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                  title="মসজিদের টিভি ডিসপ্লে স্ক্রিন চালু করুন"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>টিভি ডিসপ্লে</span>
                </button>
              )}

              {/* Print Schedule Button - Isolated Engine */}
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                title="A4 সাইজে সময়সূচি প্রিন্ট বা PDF রিলিজ করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট / PDF</span>
              </button>

              {/* Quick Edit Jamaat Times */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsQuickEditOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  title="জামাতের সময় দ্রুত পরিবর্তন করুন"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>জামাত নির্ধারণ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Active Forbidden Time Alert Banner (If Applicable) */}
      {waqtStatus.isForbiddenNow && (
        <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-4 text-rose-900 flex items-start space-x-3.5 shadow-xs animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-rose-800">
                ⚠️ {waqtStatus.forbiddenReasonBn}
              </h3>
              <span className="text-xs bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold">
                নামাজ পড়া নিষেধ
              </span>
            </div>
            <p className="text-xs text-rose-700 mt-1">
              ইসলামিক হানাফি বিধান অনুসারে সূর্যোদয়, ঠিক দুপুর (জাওয়াল) এবং সূর্যাস্তের সময় নামাজ আদায় করা মাকরূহ তাহরিমি বা নিষিদ্ধ।
            </p>
          </div>
        </div>
      )}

      {/* 3. Hero Cards: Active Waqt Banner & Next Waqt Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Waqt Dynamic Status Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                বর্তমান অবস্থা ও লাইভ ওয়াক্ত
              </span>
              <div className="flex items-center space-x-3 mt-1.5">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {waqtStatus.isWaqtActive ? `${waqtStatus.currentWaqtBn}-এর ওয়াক্ত` : 'ইশরাক / চাশতের সময়'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  waqtStatus.isWaqtActive ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>{waqtStatus.isWaqtActive ? 'চলমান' : 'পরবর্তী ওয়াক্তের অপেক্ষা'}</span>
                </span>
              </div>
            </div>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              {waqtStatus.currentWaqtKey === 'fajr' ? (
                <Moon className="w-6 h-6" />
              ) : waqtStatus.currentWaqtKey === 'dhuhr' || waqtStatus.currentWaqtKey === 'asr' ? (
                <Sun className="w-6 h-6 text-amber-500" />
              ) : (
                <Moon className="w-6 h-6 text-indigo-500" />
              )}
            </div>
          </div>

          {/* Dynamic 5-State Status Message Box */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{waqtStatus.dynamicStatusMessageBn}</span>
            </div>
            {waqtStatus.dynamicSubMessageBn && (
              <p className="text-xs text-slate-600 mt-1 pl-6">
                {waqtStatus.dynamicSubMessageBn}
              </p>
            )}
          </div>

          {/* Time metrics strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="bg-slate-50/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-semibold">আজানের সময়</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {waqtStatus.currentAdhanTimeStr12 !== '--:--' ? waqtStatus.currentAdhanTimeStr12 : 'অটো'}
              </span>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-semibold">জামাতের সময়</span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {waqtStatus.currentJamaatTimeStr12 !== '--:--' ? waqtStatus.currentJamaatTimeStr12 : 'অনির্ধারিত'}
              </span>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-semibold">ওয়াক্ত শুরু হয়েছে</span>
              <span className="text-xs font-bold text-slate-800">
                {waqtStatus.isWaqtActive ? `${waqtStatus.waqtElapsedStrBn} আগে` : '—'}
              </span>
            </div>

            <div className="bg-slate-50/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block font-semibold">ওয়াক্ত শেষ হতে বাকি</span>
              <span className="text-xs font-bold text-rose-600">
                {waqtStatus.isWaqtActive ? waqtStatus.waqtRemainingStrBn : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Next Prayer Countdown Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xs border border-indigo-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                পরবর্তী নামাজ
              </span>
              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                আসন্ন
              </span>
            </div>

            <h3 className="text-2xl font-black text-white mt-2">
              {waqtStatus.nextWaqtBn}
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              ওয়াক্ত শুরু হবে: <span className="font-mono font-bold text-white">{waqtStatus.nextAdhanTimeStr12}</span>
            </p>

            {/* Countdown Box */}
            <div className="mt-5 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-center">
              <span className="text-[11px] text-indigo-200 block font-medium">
                ওয়াক্ত শুরু হতে বাকি
              </span>
              <div className="text-3xl font-black text-emerald-300 font-mono tracking-widest mt-1">
                {formatDurationDigital(waqtStatus.nextWaqtStartsInSeconds, true)}
              </div>
              <span className="text-xs text-indigo-200 mt-1 block">
                ({waqtStatus.nextWaqtStartsInStrBn})
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
            <span>জামাতের সময়:</span>
            <span className="font-mono font-bold text-white text-sm">{waqtStatus.nextJamaatTimeStr12}</span>
          </div>
        </div>
      </div>

      {/* 4. Special Solar & Nafl Milestones Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        {/* Tahajjud */}
        <div className={`p-4 rounded-xl border transition-all ${
          waqtStatus.isTahajjudActive ? 'bg-indigo-50 border-indigo-300 shadow-xs' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">তাহাজ্জুদ</span>
            <Moon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-2">
            ১২:০০ AM - {waqtStatus.tahajjudEndTimeStr12}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {waqtStatus.tahajjudStatusBn}
          </p>
        </div>

        {/* Sunrise */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">সূর্যোদয়</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-2">
            {waqtStatus.sunriseTimeStr12}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            ফজর শেষ: {waqtStatus.sunriseTimeStr12}
          </p>
        </div>

        {/* Ishraq */}
        <div className={`p-4 rounded-xl border transition-all ${
          waqtStatus.isIshraqActive ? 'bg-amber-50 border-amber-300 shadow-xs' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">ইশরাক</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-2">
            {waqtStatus.ishraqTimeStr12}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate" title={waqtStatus.ishraqStatusBn}>
            {waqtStatus.ishraqStatusBn}
          </p>
        </div>

        {/* Duha / Chasht */}
        <div className={`p-4 rounded-xl border transition-all ${
          waqtStatus.isDuhaActive ? 'bg-emerald-50 border-emerald-300 shadow-xs' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">চাশত / দুহা</span>
            <Sun className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-2">
            {waqtStatus.duhaTimeStr12}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate" title={waqtStatus.duhaStatusBn}>
            {waqtStatus.duhaStatusBn}
          </p>
        </div>

        {/* Solar Noon / Zawal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">ঠিক দুপুর</span>
            <Compass className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-2">
            {waqtStatus.solarNoonTimeStr12}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            জাওয়াল শুরু: {waqtStatus.solarNoonTimeStr12}
          </p>
        </div>

        {/* Sunset / Iftar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">সূর্যাস্ত ও ইফতার</span>
            <Sun className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono mt-2">
            {waqtStatus.sunsetTimeStr12}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            মাগরিব ওয়াক্ত শুরু
          </p>
        </div>

        {/* Jumuah */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900">জুমার নামাজ</span>
            <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.5 rounded-sm">শুক্র</span>
          </div>
          <div className="text-base font-bold text-purple-900 font-mono mt-2">
            {waqtStatus.jumuahJamaatTimeStr12}
          </div>
          <p className="text-[11px] text-purple-700 mt-1">
            খুতবা: {waqtStatus.jumuahKhutbahTimeStr12}
          </p>
        </div>
      </div>

      {/* 4.5 Fasting & Ramadan Schedule Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-emerald-800/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Moon className="w-3 h-3 text-emerald-300" />
                <span>রোজা ও রমজান সময়সূচি</span>
              </span>
              <span className="text-xs text-slate-300 font-sans">
                {waqtStatus.hijriDateBn}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{fastingCountdown.title}</span>
            </h3>
            <div className="text-sm font-mono text-emerald-300 font-semibold flex items-center gap-2">
              <span>কাউন্টডাউন:</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-md text-white font-bold">{fastingCountdown.timeStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Sehri Card */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5 rounded-xl text-center min-w-[130px]">
              <span className="text-[11px] text-slate-300 block">আজকের সেহরি শেষ</span>
              <span className="text-lg font-bold font-mono text-amber-300">{waqtStatus.sehriEndTimeStr12 || waqtStatus.tahajjudEndTimeStr12}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">সতর্কতামূলক ৩ মিনিট পূর্বে</span>
            </div>

            {/* Iftar Card */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2.5 rounded-xl text-center min-w-[130px]">
              <span className="text-[11px] text-slate-300 block">আজকের ইফতারের সময়</span>
              <span className="text-lg font-bold font-mono text-rose-300">{waqtStatus.iftarTimeStr12}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">সূর্যাস্তের সাথে সাথে</span>
            </div>

            {/* Print Fasting Schedule Quick Button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-3 rounded-xl flex items-center space-x-1.5 shadow-md transition cursor-pointer self-stretch md:self-auto justify-center"
              title="রমজান ও রোজার সময়সূচি প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট শিট</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Prayer Schedule Card: Daily vs 30-Day Monthly View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📅 আজকের সময়সূচি (Daily Table)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🗓️ ৩০ দিনের মাসিক ক্যালেন্ডার
            </button>
          </div>

          {/* Month Selector for Monthly View */}
          {activeTab === 'monthly' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear((prev) => prev - 1);
                  } else {
                    setSelectedMonth((prev) => prev - 1);
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="পূর্বের মাস"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 cursor-pointer focus:outline-hidden"
              >
                {monthNamesBn.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 cursor-pointer focus:outline-hidden"
              >
                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>{toBanglaDigits(y)}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear((prev) => prev + 1);
                  } else {
                    setSelectedMonth((prev) => prev + 1);
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="পরের মাস"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const curr = new Date();
                  setSelectedMonth(curr.getMonth());
                  setSelectedYear(curr.getFullYear());
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition cursor-pointer"
              >
                বর্তমান মাস
              </button>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 transition cursor-pointer flex items-center space-x-1"
                title="মাসিক সময়সূচি A4 সাইজে প্রিন্ট বা PDF করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ক্যালেন্ডার প্রিন্ট</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Daily Schedule Table */}
        {activeTab === 'daily' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">নামাজ / ওয়াক্ত</th>
                  <th className="px-6 py-3.5">ওয়াক্ত শুরু (Start)</th>
                  <th className="px-6 py-3.5">আজান (Adhan)</th>
                  <th className="px-6 py-3.5">জামাত (Jamaat)</th>
                  <th className="px-6 py-3.5">ওয়াক্ত শেষ (End)</th>
                  <th className="px-6 py-3.5 text-center">বর্তমান অবস্থা</th>
                  <th className="px-6 py-3.5">কাউন্টডাউন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-siliguri">
                {waqtStatus.prayerList.map((prayer) => {
                  const isCurrent = prayer.key === waqtStatus.currentWaqtKey;
                  const isNext = prayer.key === waqtStatus.nextWaqtKey;

                  return (
                    <tr
                      key={prayer.key}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50/70 font-semibold'
                          : isNext
                          ? 'bg-blue-50/40'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                        <div className="flex items-center space-x-2">
                          {isCurrent && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>}
                          <span>{prayer.nameBn}</span>
                          <span className="text-[11px] text-slate-400 font-normal font-sans">({prayer.nameEn})</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {prayer.waqtStart12 || prayer.waqtStart}
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {prayer.adhan12 || prayer.adhan}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                          {prayer.jamaat12 || prayer.jamaat}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-slate-600">
                        {prayer.waqtEnd12 || prayer.waqtEnd}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            prayer.status === 'ONGOING'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : prayer.status === 'NEXT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : prayer.status === 'ENDED'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {prayer.statusBn}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {prayer.countdownTextBn}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 30-Day Monthly Calendar with Authoritative 12h Times and Overrides */}
        {activeTab === 'monthly' && (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3.5 py-3">তারিখ ও বার</th>
                  <th className="px-2.5 py-3">হিজরি</th>
                  <th className="px-2.5 py-3 text-center bg-slate-200/60">সেহরি শেষ</th>
                  <th className="px-2.5 py-3">ফজর (আজান | জামাত)</th>
                  <th className="px-2 py-3 text-center">সূর্যোদয়</th>
                  <th className="px-2.5 py-3">যোহর / জুমা (আজান | জামাত)</th>
                  <th className="px-2.5 py-3">আসর (আজান | জামাত)</th>
                  <th className="px-2.5 py-3">মাগরিব / ইফতার (আজান | জামাত)</th>
                  <th className="px-2.5 py-3">এশা (আজান | জামাত)</th>
                  <th className="px-2 py-3 text-center">স্ট্যাটাস</th>
                  {canEdit && <th className="px-2 py-3 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {monthlyList.map((item) => (
                  <tr
                    key={item.day}
                    className={`transition-colors ${
                      item.isToday
                        ? 'bg-emerald-100/70 font-bold text-emerald-950'
                        : item.isFriday
                        ? 'bg-purple-50/60 text-purple-950'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-3.5 py-2.5 font-sans font-semibold">
                      <div className="flex items-center space-x-1.5">
                        {item.isToday && <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>}
                        <span>{toBanglaDigits(item.day)} {monthNamesBn[selectedMonth]} ({item.dayNameBn})</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 font-sans text-slate-600 text-[11px]">
                      {item.hijriDateBn}
                    </td>
                    <td className="px-2.5 py-2.5 text-center font-bold text-slate-800 bg-slate-100/60">
                      {item.sehriEnd12}
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 text-[11px]">{item.fajrAzan12}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1 rounded">{item.fajrJamaat12}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-slate-500 text-center">{item.sunrise12}</td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 text-[11px]">
                          {item.isFriday ? (item.jumuahAzan12 || item.dhuhrAzan12) : item.dhuhrAzan12}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1 rounded">
                          {item.isFriday ? (item.jumuahJamaat12 || item.dhuhrJamaat12) : item.dhuhrJamaat12}
                        </span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 text-[11px]">{item.asrAzan12}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1 rounded">{item.asrJamaat12}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-rose-700 font-bold text-[11px]">{item.iftar12 || item.maghribAzan12}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1 rounded">{item.maghribJamaat12}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 text-[11px]">{item.ishaAzan12}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1 rounded">{item.ishaJamaat12}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {item.hasOverride ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                          কাস্টম
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">ডিফল্ট</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOverrideDayItem(item)}
                          className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center space-x-1 mx-auto transition cursor-pointer"
                          title={`${item.dateStr} তারিখের সময়সূচি পরিবর্তন করুন`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>এডিট</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Quick Edit Jamaat Settings Modal */}
      {isQuickEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ✏️ আজান ও জামাতের সময়সূচি নির্ধারণ (১২-ঘণ্টা)
                </h3>
                <p className="text-xs text-slate-500">
                  ১২ ঘণ্টার সময় ফরম্যাট (যেমন: 4:28 AM, 1:30 PM, 6:30 PM) ব্যবহার করে হাতে সেট করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEditOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickEdit} className="mt-5 space-y-4">
              <div className="space-y-3">
                {/* FAJR */}
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ফজর আজান:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.fajrAzan}
                      onChange={(e) => setEditFormData({ ...editFormData, fajrAzan: e.target.value })}
                      placeholder="4:28 AM"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                      ফজর জামাত:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.fajrJamaat}
                      onChange={(e) => setEditFormData({ ...editFormData, fajrJamaat: e.target.value })}
                      placeholder="5:15 AM"
                      className="w-full px-3 py-1.5 bg-purple-50/60 border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* DHUHR */}
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      যোহর আজান:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.dhuhrAzan}
                      onChange={(e) => setEditFormData({ ...editFormData, dhuhrAzan: e.target.value })}
                      placeholder="12:30 PM"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                      যোহর জামাত:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.dhuhrJamaat}
                      onChange={(e) => setEditFormData({ ...editFormData, dhuhrJamaat: e.target.value })}
                      placeholder="1:30 PM"
                      className="w-full px-3 py-1.5 bg-purple-50/60 border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* ASR */}
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      আসর আজান:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.asrAzan}
                      onChange={(e) => setEditFormData({ ...editFormData, asrAzan: e.target.value })}
                      placeholder="4:21 PM"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                      আসর জামাত:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.asrJamaat}
                      onChange={(e) => setEditFormData({ ...editFormData, asrJamaat: e.target.value })}
                      placeholder="4:45 PM"
                      className="w-full px-3 py-1.5 bg-purple-50/60 border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* MAGHRIB */}
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মাগরিব আজান:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.maghribAzan}
                      onChange={(e) => setEditFormData({ ...editFormData, maghribAzan: e.target.value })}
                      placeholder="6:05 PM"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                      মাগরিব জামাত:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.maghribJamaat}
                      onChange={(e) => setEditFormData({ ...editFormData, maghribJamaat: e.target.value })}
                      placeholder="6:30 PM"
                      className="w-full px-3 py-1.5 bg-purple-50/60 border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* ISHA */}
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      এশা আজান:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.ishaAzan}
                      onChange={(e) => setEditFormData({ ...editFormData, ishaAzan: e.target.value })}
                      placeholder="7:21 PM"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-700 mb-1">
                      এশা জামাত:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.ishaJamaat}
                      onChange={(e) => setEditFormData({ ...editFormData, ishaJamaat: e.target.value })}
                      placeholder="8:15 PM"
                      className="w-full px-3 py-1.5 bg-purple-50/60 border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* JUMUAH */}
                <div className="grid grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-purple-50/40 border border-purple-200">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      জুমা আজান:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.jumuahAzan}
                      onChange={(e) => setEditFormData({ ...editFormData, jumuahAzan: e.target.value })}
                      placeholder="12:30 PM"
                      className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      খুতবা:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.jumuahKhutbah}
                      onChange={(e) => setEditFormData({ ...editFormData, jumuahKhutbah: e.target.value })}
                      placeholder="1:00 PM"
                      className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      জুমা জামাত:
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.jumuahJamaat}
                      onChange={(e) => setEditFormData({ ...editFormData, jumuahJamaat: e.target.value })}
                      placeholder="1:30 PM"
                      className="w-full px-2 py-1.5 bg-purple-100/70 border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuickEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Dedicated Isolated Prayer Print & PDF Modal (A4 Print Engine) */}
      <PrayerSchedulePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mosque={currentMosque}
        prayerTimes={waqtStatus}
        monthlyList={monthlyList}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedDistrict={selectedDistrict}
      />

      {/* 8. Single-Day Prayer Override Modal */}
      {selectedOverrideDayItem && (
        <DailyPrayerOverrideModal
          isOpen={Boolean(selectedOverrideDayItem)}
          onClose={() => setSelectedOverrideDayItem(null)}
          dayItem={selectedOverrideDayItem}
          existingOverride={currentMosque?.prayerDailyOverrides?.[selectedOverrideDayItem.dateStr]}
          defaultJamaatSettings={currentMosque?.jamaatSettings}
          onSuccess={async () => {
            if (onRefreshMosque) {
              await onRefreshMosque();
            }
          }}
        />
      )}
    </div>
  );
};

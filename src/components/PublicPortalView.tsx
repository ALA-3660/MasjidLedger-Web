import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Clock,
  Landmark,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Send,
  Sparkles,
  Tv,
  Maximize2,
  Minimize2,
  RefreshCw,
  Building,
  Users2,
  UserCheck,
  Layers,
  Crosshair,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Lock,
  ArrowRight,
  Receipt,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Mosque, FinancialAccount, MosqueNotice, Donation, PublicPortalSettings, PublicPortalData, DEFAULT_PUBLIC_PORTAL_SETTINGS } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { api } from '../lib/api';

interface PublicPortalViewProps {
  mosque?: Mosque | null;
  accounts?: FinancialAccount[];
  notices?: MosqueNotice[];
  language?: Language;
  previewSettings?: PublicPortalSettings;
  forcedDisplayMode?: boolean;
  onDonate?: (data: any) => Promise<Donation>;
  onPrintReceipt?: (donation: Donation) => void;
  onNavigateToLogin?: () => void;
}

export const PublicPortalView: React.FC<PublicPortalViewProps> = ({
  mosque: propMosque,
  accounts: propAccounts = [],
  notices: propNotices = [],
  language = 'bn',
  previewSettings,
  forcedDisplayMode = false,
  onDonate,
  onPrintReceipt,
  onNavigateToLogin,
}) => {
  const t = translations[language] || translations.bn;

  // Live Portal State fetched from backend
  const [portalData, setPortalData] = useState<PublicPortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [nextRefreshSec, setNextRefreshSec] = useState<number>(45);

  // TV / Display Mode
  const [isTvMode, setIsTvMode] = useState(forcedDisplayMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Donation Form State
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('1000');
  const [category, setCategory] = useState<Donation['category']>('GENERAL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState<Donation | null>(null);

  // Fetch Public Portal Data from Server
  const fetchPortalData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await api.getPublicPortalData(propMosque?.id || propMosque?.code);
      setPortalData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load public portal data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortalData(true);
  }, [propMosque?.id]);

  // Realtime Clock update for Display Mode & Prayer Timings
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync forcedDisplayMode prop
  useEffect(() => {
    if (forcedDisplayMode !== undefined) {
      setIsTvMode(forcedDisplayMode);
    }
  }, [forcedDisplayMode]);

  // Auto-refresh interval management
  const activeSettings: PublicPortalSettings = previewSettings || portalData?.settings || propMosque?.publicPortalSettings || DEFAULT_PUBLIC_PORTAL_SETTINGS;
  const refreshInterval = activeSettings.autoRefreshInterval || 45;

  useEffect(() => {
    setNextRefreshSec(refreshInterval);
    const intervalTimer = setInterval(() => {
      setNextRefreshSec(prev => {
        if (prev <= 1) {
          fetchPortalData(false);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [refreshInterval, propMosque?.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOnlineDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;

    setIsSubmitting(true);
    try {
      let created: Donation;
      if (onDonate) {
        created = await onDonate({
          donorName: donorName || 'আল্লাহর এক বান্দা (Anonymous)',
          donorPhone,
          amount: num,
          category,
          paymentMethod: 'BKASH',
          accountId: propAccounts[0]?.id,
          reference: `ONLINE-DON-${Math.floor(100000 + Math.random() * 900000)}`,
          date: new Date().toISOString().split('T')[0],
        });
      } else {
        // Direct local or API submission fallback
        created = {
          id: `don-pub-${Date.now()}`,
          mosqueId: propMosque?.id || 'mosque-001',
          receiptNumber: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          donorName: donorName || 'আল্লাহর এক বান্দা',
          donorPhone,
          amount: num,
          category,
          paymentMethod: 'BKASH',
          date: new Date().toISOString().split('T')[0],
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
        } as Donation;
      }

      setDonationSuccess(created);
      if (onPrintReceipt) onPrintReceipt(created);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolved Display Data based on backend sanitized responses and whitelist settings
  const mosqueInfo = portalData?.mosque || {
    id: propMosque?.id || 'mosque-001',
    code: propMosque?.code || 'MOSQUE-WAQF',
    nameBn: propMosque?.nameBn || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট',
    nameEn: propMosque?.nameEn || 'Mamun Jame Masjid Waqf Estate',
    address: activeSettings.mosqueAddress ? propMosque?.address : undefined,
    district: activeSettings.mosqueAddress ? propMosque?.district : undefined,
    phone: activeSettings.mosquePhone ? propMosque?.phone : undefined,
    email: activeSettings.mosqueEmail ? propMosque?.email : undefined,
    logoUrl: activeSettings.mosqueLogo ? propMosque?.logoUrl : undefined,
    waqfEstateName: activeSettings.waqfId ? propMosque?.waqfEstateName : undefined,
    registrationNumber: activeSettings.registrationNumber ? propMosque?.registrationNumber : undefined,
    establishedDate: activeSettings.establishedYear ? propMosque?.establishedDate : undefined,
    islamicTagline: activeSettings.islamicTagline
      ? '"যারা আল্লাহর ঘরে সালাত কায়েম করে এবং যাকাত দেয়—তারাই তো আল্লাহর মসজিদসমূহ আবাদ করে।" — (সূরা আত-তাওবাহ: ১৮)'
      : undefined,
  };

  const prayerTimes = portalData?.prayerTimes || (activeSettings.prayerSchedule ? [
    { nameBn: 'ফজর (Fajr)', nameEn: 'Fajr', adhan: '০৪:৫০', iqamah: '০৫:১৫' },
    { nameBn: 'যোহর (Dhuhr)', nameEn: 'Dhuhr', adhan: '১২:১৫', iqamah: '০১:১৫' },
    { nameBn: 'আসর (Asr)', nameEn: 'Asr', adhan: '০৪:৩০', iqamah: '০৪:৪৫' },
    { nameBn: 'মাগরিব (Maghrib)', nameEn: 'Maghrib', adhan: '০৬:২৫', iqamah: '০৬:৩০' },
    { nameBn: 'এশা (Isha)', nameEn: 'Isha', adhan: '০৭:৪৫', iqamah: '০৮:১৫' },
  ] : []);

  const jumuahTime = portalData?.jumuahTime || (activeSettings.jumuahSchedule ? {
    adhan: '১২:৩০',
    khutbah: '০১:০০',
    iqamah: '০১:৩০',
  } : undefined);

  const donationChannels = portalData?.donationChannels;
  const financialTransparency = portalData?.financialTransparency;
  const publicNotices = portalData?.notices || propNotices.filter(n => n.isPublic && n.status === 'ACTIVE');
  const emergencyNotice = publicNotices.find(n => n.isEmergency || n.priority === 'URGENT');
  const projects = portalData?.projects || [];
  const waqfList = portalData?.waqfSummary || [];
  const committee = portalData?.committee;
  const subCommittees = portalData?.subCommittees || [];
  const staffList = portalData?.staff || [];
  const cemeteryInfo = portalData?.cemetery;

  // Format Bangla Realtime Clock
  const formatBanglaDigits = (str: string | number) => {
    const banglaDigits: { [key: string]: string } = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return String(str).replace(/[0-9]/g, match => banglaDigits[match] || match);
  };

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const timePeriod = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
  const displayHours = hours % 12 || 12;
  const clockStringBn = `${formatBanglaDigits(String(displayHours).padStart(2, '0'))}:${formatBanglaDigits(String(minutes).padStart(2, '0'))}:${formatBanglaDigits(String(seconds).padStart(2, '0'))} ${timePeriod}`;
  const dateStringBn = currentTime.toLocaleDateString('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Current Waqt Calculation for Highlighting
  const getCurrentWaqt = () => {
    const currentMins = hours * 60 + minutes;
    if (currentMins >= 290 && currentMins < 735) return 'ফজর (Fajr)';
    if (currentMins >= 735 && currentMins < 990) return 'যোহর (Dhuhr)';
    if (currentMins >= 990 && currentMins < 1105) return 'আসর (Asr)';
    if (currentMins >= 1105 && currentMins < 1185) return 'মাগরিব (Maghrib)';
    return 'এশা (Isha)';
  };
  const activeWaqtName = getCurrentWaqt();

  // Theme Styles for TV / Display Mode
  const theme = activeSettings.displayModeTheme || 'EMERALD_NIGHT';
  const tvThemeClasses =
    theme === 'EMERALD_NIGHT'
      ? 'bg-slate-950 text-emerald-50'
      : theme === 'DARK'
      ? 'bg-slate-900 text-white'
      : 'bg-slate-100 text-slate-900';

  return (
    <div
      ref={containerRef}
      id="public-portal-container"
      className={`min-h-screen font-siliguri transition-all duration-300 ${
        isTvMode ? `${tvThemeClasses} p-4 sm:p-8 flex flex-col justify-between` : 'bg-slate-50 text-slate-900 p-3 sm:p-6 md:p-8'
      }`}
    >
      {/* Top Navbar & Floating Quick Controls (Hidden in TV Mode for clean kiosk display) */}
      {!isTvMode && (
        <div className="max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:px-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-3">
            {activeSettings.mosqueLogo && mosqueInfo?.logoUrl ? (
              <img
                src={mosqueInfo.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain border border-slate-200 p-0.5 bg-slate-50"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs font-bold text-lg">
                <Building className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {mosqueInfo?.nameBn || 'ডিজিタル মসজিদ পাবলিক পোর্টাল'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  পাবলিক পোর্টাল
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                স্বচ্ছতা, সময়সূচি ও নিরাপদ অনলাইন অনুদান প্ল্যাটফর্ম
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Auto Refresh Indicator */}
            <button
              onClick={() => fetchPortalData(false)}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-all"
              title="তথ্য রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">রিফ্রেশ ({formatBanglaDigits(nextRefreshSec)}s)</span>
            </button>

            {/* Toggle TV Mode Button */}
            <button
              id="btn-toggle-tv-mode"
              onClick={() => setIsTvMode(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center space-x-1.5 transition-all shadow-2xs"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400" />
              <span>বড় স্ক্রিন / টিভি মোড</span>
            </button>

            {/* Admin Login shortcut */}
            {onNavigateToLogin && (
              <button
                id="btn-portal-admin-login"
                onClick={onNavigateToLogin}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center space-x-1 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>অ্যাডমিন লগইন</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TV / LARGE DISPLAY MODE LAYOUT
          ======================================================== */}
      {isTvMode ? (
        <div className="space-y-6 flex-1 flex flex-col justify-between max-w-7xl mx-auto w-full">
          {/* TV Top Header Bar */}
          <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
            <div className="flex items-center space-x-4">
              {activeSettings.mosqueLogo && mosqueInfo?.logoUrl && (
                <img
                  src={mosqueInfo.logoUrl}
                  alt="Logo"
                  className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-1 border border-white/20"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                  {mosqueInfo?.nameBn}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-300/90 font-medium">
                  {mosqueInfo?.address} {mosqueInfo?.district && `• ${mosqueInfo?.district}`} {mosqueInfo?.waqfEstateName && `• ${mosqueInfo?.waqfEstateName}`}
                </p>
              </div>
            </div>

            {/* TV Clock & Controls */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl sm:text-4xl font-mono font-black tracking-wider text-emerald-400">
                  {clockStringBn}
                </div>
                <div className="text-xs sm:text-sm text-slate-300">
                  {dateStringBn}
                </div>
              </div>

              <div className="flex items-center space-x-1 bg-white/10 p-1.5 rounded-xl border border-white/20">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="ফুলস্ক্রিন করুন"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsTvMode(false)}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  সাধারণ ভিউ
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Ticker in TV Mode */}
          {activeSettings.emergencyNotice && emergencyNotice && (
            <div className="bg-rose-950/80 border border-rose-600/60 rounded-2xl px-6 py-3 flex items-center space-x-3 text-rose-100 animate-pulse">
              <Bell className="w-6 h-6 text-rose-400 shrink-0" />
              <div className="font-bold text-sm sm:text-base">
                জরুরি নোটিশ: {emergencyNotice.title} — {emergencyNotice.description}
              </div>
            </div>
          )}

          {/* Large TV Prayer Grid */}
          {activeSettings.prayerSchedule && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm text-emerald-300 font-bold uppercase tracking-wider">
                <span>আজকের নামাজের সময়সূচি (Prayer Timings)</span>
                <span className="bg-emerald-900/60 px-3 py-1 rounded-full text-emerald-200 border border-emerald-700/50">
                  বর্তমান ওয়াক্ত: {activeWaqtName}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {prayerTimes.map((p, idx) => {
                  const isCurrent = p.nameBn.includes(activeWaqtName.split(' ')[0]);
                  return (
                    <div
                      key={idx}
                      className={`rounded-3xl p-5 sm:p-6 border text-center transition-all duration-300 ${
                        isCurrent
                          ? 'bg-linear-to-b from-emerald-600 to-emerald-800 border-emerald-400 text-white shadow-2xl scale-105 ring-4 ring-emerald-400/40'
                          : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span className={`text-base sm:text-lg font-bold block ${isCurrent ? 'text-emerald-100' : 'text-emerald-400'}`}>
                        {p.nameBn}
                      </span>
                      <div className="text-xs sm:text-sm opacity-80 mt-1">আজান: {p.adhan}</div>
                      <div className={`mt-3 py-2 px-3 rounded-2xl text-xl sm:text-2xl font-black ${isCurrent ? 'bg-black/30 text-white' : 'bg-emerald-950/80 text-emerald-300'}`}>
                        জামাত {p.iqamah}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Jumu'ah in TV Mode */}
              {activeSettings.jumuahSchedule && jumuahTime && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-amber-300 text-base">জুমার বিশেষ নামাজ (শুক্রবার):</span>
                  </div>
                  <div className="flex items-center space-x-6">
                    <span>আজান: <strong className="text-white font-mono">{jumuahTime.adhan}</strong></span>
                    <span>খুতবা: <strong className="text-white font-mono">{jumuahTime.khutbah}</strong></span>
                    <span className="bg-amber-400 text-slate-950 px-3 py-1 rounded-xl font-bold font-mono">
                      জামাত: {jumuahTime.iqamah}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TV Footer Information: Donation QR + Financial / Notices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-emerald-900/60 text-xs sm:text-sm">
            {/* Left: Donation QR & Info */}
            {activeSettings.donation && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-4">
                {activeSettings.donationQr && donationChannels?.qrCodeUrl && (
                  <img
                    src={donationChannels.qrCodeUrl}
                    alt="Donation QR"
                    className="w-20 h-20 bg-white rounded-xl p-1 shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <span className="font-bold text-emerald-300 text-sm block">অনলাইন দান ও সাদাকাহ</span>
                  <p className="text-slate-300 text-xs">
                    বিকাশ/নগদ মার্চেন্ট নম্বরে সরাসরি আপনার দান পাঠাতে পারেন।
                  </p>
                  {donationChannels?.mobileBanking?.bkash && (
                    <div className="font-mono font-bold text-emerald-400">
                      বিকাশ: {donationChannels.mobileBanking.bkash}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Middle: Financial Transparency in TV Mode */}
            {activeSettings.financialSummary && financialTransparency && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center space-y-2">
                <span className="font-bold text-emerald-300 text-xs uppercase tracking-wider">
                  আর্থিক স্বচ্ছতা ({financialTransparency.currentMonthNameBn || 'চলতি মাস'})
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {activeSettings.monthlyIncome && financialTransparency.monthlyIncome !== undefined && (
                    <div className="bg-black/30 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px]">চলতি মাসের আয়</div>
                      <div className="text-emerald-400 font-bold font-mono text-sm">
                        ৳ {financialTransparency.monthlyIncome.toLocaleString('bn-BD')}
                      </div>
                    </div>
                  )}
                  {activeSettings.monthlyExpense && financialTransparency.monthlyExpense !== undefined && (
                    <div className="bg-black/30 p-2 rounded-xl">
                      <div className="text-slate-400 text-[10px]">চলতি মাসের ব্যয়</div>
                      <div className="text-rose-400 font-bold font-mono text-sm">
                        ৳ {financialTransparency.monthlyExpense.toLocaleString('bn-BD')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right: Islamic Quran Quote */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center text-center italic text-emerald-200/90 text-xs sm:text-sm">
              {mosqueInfo?.islamicTagline || '"নিশ্চয়ই সালাত মানুষকে অশ্লীল ও মন্দ কাজ থেকে বিরত রাখে।" — (সূরা আল-আনকাবুত: ৪৫)'}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           STANDARD PUBLIC PORTAL (DESKTOP & MOBILE RESPONSIVE)
           ======================================================== */
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
          {/* Emergency Ticker if enabled and active */}
          {activeSettings.emergencyNotice && emergencyNotice && (
            <div
              id="public-emergency-banner"
              className="bg-linear-to-r from-rose-900 to-red-950 text-white rounded-2xl p-4 shadow-md border border-rose-700/80 flex items-center space-x-3 animate-in fade-in"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-800 flex items-center justify-center text-rose-200 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-rose-200">জরুরি নোটিশ: </span>
                <span className="font-semibold">{emergencyNotice.title}</span> — {emergencyNotice.description}
              </div>
            </div>
          )}

          {/* Section 1: Mosque Identity & Hero Banner */}
          {activeSettings.mosqueProfile && (
            <div className="bg-linear-to-br from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 space-y-4 max-w-4xl">
                <div className="inline-flex items-center space-x-2 bg-blue-900/60 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-blue-700/50">
                  <Sparkles className="w-4 h-4 text-blue-300" />
                  <span>ডিজিটাল মসজিদ পাবলিক পোর্টাল ও স্বচ্ছতা ড্যাশবোর্ড</span>
                </div>

                <div className="flex items-start space-x-4">
                  {activeSettings.mosqueLogo && mosqueInfo?.logoUrl && (
                    <img
                      src={mosqueInfo.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-white/10 p-2 border border-white/20 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {mosqueInfo?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
                    </h1>
                    {mosqueInfo?.nameEn && (
                      <div className="text-xs sm:text-sm text-slate-400 font-medium font-sans">
                        {mosqueInfo.nameEn}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Row: Address, Waqf ID, Reg No, Established Year */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-300 pt-1">
                  {activeSettings.mosqueAddress && mosqueInfo?.address && (
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>{mosqueInfo.address}</span>
                    </div>
                  )}
                  {activeSettings.waqfId && mosqueInfo?.waqfEstateName && (
                    <div className="flex items-center space-x-1.5">
                      <Landmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>ওয়াকফ: {mosqueInfo.waqfEstateName}</span>
                    </div>
                  )}
                  {activeSettings.registrationNumber && mosqueInfo?.registrationNumber && (
                    <div className="flex items-center space-x-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>নিবন্ধন: {mosqueInfo.registrationNumber}</span>
                    </div>
                  )}
                  {activeSettings.establishedYear && mosqueInfo?.establishedDate && (
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>প্রতিষ্ঠা: {mosqueInfo.establishedDate}</span>
                    </div>
                  )}
                  {activeSettings.mosquePhone && mosqueInfo?.phone && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      <span>{mosqueInfo.phone}</span>
                    </div>
                  )}
                  {activeSettings.mosqueEmail && mosqueInfo?.email && (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-rose-400" />
                      <span>{mosqueInfo.email}</span>
                    </div>
                  )}
                </div>

                {activeSettings.islamicTagline && mosqueInfo?.islamicTagline && (
                  <div className="pt-2 text-xs sm:text-sm text-blue-200/90 italic border-t border-white/10">
                    {mosqueInfo.islamicTagline}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Prayer Times Schedule */}
          {activeSettings.prayerSchedule && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      আজকের নামাজের সময়সূচি (Prayer Schedule)
                    </h2>
                    <p className="text-[11px] text-slate-500">পাঁচ ওয়াক্ত আজান ও জামাতের নির্ধারিত সময়</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    বর্তমান ওয়াক্ত: {activeWaqtName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {prayerTimes.map((p, idx) => {
                  const isCurrent = p.nameBn.includes(activeWaqtName.split(' ')[0]);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        isCurrent
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-bold block ${isCurrent ? 'text-blue-100' : 'text-slate-700'}`}>
                        {p.nameBn}
                      </span>
                      <div className={`text-[11px] mt-1 ${isCurrent ? 'text-blue-100/90' : 'text-slate-500'}`}>
                        আজান: {p.adhan}
                      </div>
                      <div className={`text-sm sm:text-base font-black mt-2 py-1 rounded-xl ${isCurrent ? 'bg-black/20 text-white' : 'bg-blue-50 text-blue-800'}`}>
                        জামাত: {p.iqamah}
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeSettings.jumuahSchedule && jumuahTime && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">জুমার নামাজ (শুক্রবার):</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-600">আজান: <strong className="text-slate-900">{jumuahTime.adhan}</strong></span>
                    <span className="text-slate-600">খুতবা: <strong className="text-slate-900">{jumuahTime.khutbah}</strong></span>
                    <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-xl font-bold border border-amber-300">
                      জামাত: {jumuahTime.iqamah}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Financial Transparency Cards (Summary only) */}
          {activeSettings.financialSummary && financialTransparency && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      আর্থিক স্বচ্ছতা ও সারসংক্ষেপ (Financial Transparency)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {financialTransparency.currentMonthNameBn || 'চলতি মাস'} মাসের সার্বজনীন অনুমোদিত হিসাব
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  স্বচ্ছতা ও জবাবদিহিতা
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {activeSettings.monthlyIncome && financialTransparency.monthlyIncome !== undefined && (
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                      <span>চলতি মাসের আয়</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-emerald-950 font-mono">
                      ৳ {financialTransparency.monthlyIncome.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}

                {activeSettings.monthlyExpense && financialTransparency.monthlyExpense !== undefined && (
                  <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-rose-800 font-semibold">
                      <span>চলতি মাসের ব্যয়</span>
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-rose-950 font-mono">
                      ৳ {financialTransparency.monthlyExpense.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}

                {activeSettings.monthlySurplus && financialTransparency.monthlySurplus !== undefined && (
                  <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
                      <span>মাসের উদ্বৃত্ত / স্থিতি</span>
                      <Scale className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-blue-950 font-mono">
                      ৳ {financialTransparency.monthlySurplus.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}

                {activeSettings.totalDonationReceived && financialTransparency.totalDonationsReceived !== undefined && (
                  <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
                      <span>মোট দান সংগৃহীত</span>
                      <Heart className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-indigo-950 font-mono">
                      ৳ {financialTransparency.totalDonationsReceived.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}

                {activeSettings.currentBalance && financialTransparency.currentBalance !== undefined && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                      <span>বর্তমান মোট তহবিল</span>
                      <Landmark className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                      ৳ {financialTransparency.currentBalance.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}

                {activeSettings.cashBalance && financialTransparency.cashBalance !== undefined && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                      <span>ক্যাশ স্থিতি</span>
                      <Receipt className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                      ৳ {financialTransparency.cashBalance.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}

                {activeSettings.bankBalance && financialTransparency.bankBalance !== undefined && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                      <span>মোট ব্যাংক স্থিতি</span>
                      <Landmark className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                      ৳ {financialTransparency.bankBalance.toLocaleString('bn-BD')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Donation Channels & Online Donate Form */}
          {activeSettings.donation && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Quick Online Donation Form */}
              {activeSettings.onlineDonation && (
                <div className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2.5 text-blue-600">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">অনলাইন অনুদান ও তাৎক্ষণিক মানি রসিদ</h2>
                      <p className="text-[11px] text-slate-500">সদকায়ে জারিয়া ফান্ডে সরাসরি দান জমা করুন</p>
                    </div>
                  </div>

                  {donationSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 text-center animate-in zoom-in-95">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-emerald-900">আলহামদুলিল্লাহ! আপনার অনুদান গৃহীত হয়েছে</h3>
                        <p className="text-xs text-emerald-700">
                          রসিদ নং: <strong className="font-mono">{donationSuccess.receiptNumber}</strong> • পরিমাণ: ৳ {donationSuccess.amount.toLocaleString('bn-BD')}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {onPrintReceipt && (
                          <button
                            onClick={() => onPrintReceipt(donationSuccess)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs"
                          >
                            রসিদ প্রিন্ট করুন
                          </button>
                        )}
                        <button
                          onClick={() => setDonationSuccess(null)}
                          className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 rounded-xl text-xs font-semibold"
                        >
                          নতুন অনুদান
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleOnlineDonation} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">দানের খাত নির্বাচন করুন</label>
                        <select
                          id="select-public-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                        >
                          <option value="GENERAL">সাধারণ মসজিদ ফান্ড (General Fund)</option>
                          <option value="CONSTRUCTION">মসজিদ পুনঃনির্মাণ ও উন্নয়ন</option>
                          <option value="WUDU_KHANA">অজু খানা ও ওয়াশ ব্লক সংস্কার</option>
                          <option value="MADRASA">মক্তব ও হিফজখানা ফান্ড</option>
                          <option value="CEMETERY">কবরস্থান উন্নয়ন ও রক্ষণাবেক্ষণ</option>
                          <option value="ZAKAT">যাকাত ও দরিদ্র কল্যাণ তহবিল</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">আপনার নাম (ঐচ্ছিক)</label>
                          <input
                            id="input-public-donor-name"
                            type="text"
                            placeholder="বেনামী রাখতে খালি রাখুন"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর (এসএমএস এর জন্য)</label>
                          <input
                            id="input-public-donor-phone"
                            type="tel"
                            placeholder="017XXXXXXXX"
                            value={donorPhone}
                            onChange={(e) => setDonorPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">অনুদানের পরিমাণ (টাকা)</label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {['500', '1000', '2000', '5000'].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setAmount(amt)}
                              className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                amount === amt
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              ৳ {amt}
                            </button>
                          ))}
                        </div>
                        <input
                          id="input-public-amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>

                      <button
                        id="btn-public-submit-donation"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'প্রক্রিয়াধীন...' : 'অনুদান জমা দিন ও রসিদ তৈরি করুন'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Right: Bank Accounts & Mobile Banking Channels */}
              <div className={`${activeSettings.onlineDonation ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4`}>
                <div className="flex items-center space-x-2.5 text-blue-600">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">অফিসিয়াল ব্যাংক হিসাব ও মোবাইল ব্যাংকিং</h2>
                    <p className="text-[11px] text-slate-500">সরাসরি ব্যাংকিং ও কিউআর স্ক্যান তথ্য</p>
                  </div>
                </div>

                {/* Bank Accounts */}
                {activeSettings.bankAccount && (
                  <div className="space-y-2.5">
                    {(donationChannels?.bankAccounts || []).map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{acc.nameBn}</span>
                          {acc.bankName && (
                            <span className="text-[11px] text-slate-500 block">
                              {acc.bankName} {acc.branchName && `(${acc.branchName} শাখা)`}
                            </span>
                          )}
                          {acc.accountNumber && (
                            <span className="font-mono text-xs font-bold text-blue-700 block mt-0.5">
                              হিসাব নং: {acc.accountNumber}
                            </span>
                          )}
                        </div>

                        {acc.accountNumber && (
                          <button
                            onClick={() => handleCopy(acc.accountNumber || '', acc.id)}
                            className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors"
                            title="হিসাব নম্বর কপি করুন"
                          >
                            {copiedId === acc.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Mobile Banking & QR */}
                <div className="flex items-start gap-4 pt-2">
                  {activeSettings.donationQr && donationChannels?.qrCodeUrl && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl text-center shrink-0">
                      <img
                        src={donationChannels.qrCodeUrl}
                        alt="QR"
                        className="w-24 h-24 rounded-lg object-contain bg-white"
                      />
                      <span className="text-[10px] font-bold text-slate-600 block mt-1">স্ক্যান করে দান করুন</span>
                    </div>
                  )}

                  {activeSettings.mobileBanking && (
                    <div className="flex-1 space-y-2 text-xs">
                      {donationChannels?.mobileBanking?.bkash && (
                        <div className="p-2.5 bg-pink-50/70 border border-pink-200 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-pink-900 block text-xs">বিকাশ (bKash) মার্চেন্ট</span>
                            <span className="font-mono font-bold text-pink-700 text-xs">
                              {donationChannels.mobileBanking.bkash}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(donationChannels?.mobileBanking?.bkash || '', 'bkash')}
                            className="p-1.5 bg-white rounded-lg border border-pink-200 text-pink-700 hover:bg-pink-50"
                          >
                            {copiedId === 'bkash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {donationChannels?.mobileBanking?.nagad && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-amber-900 block text-xs">নগদ (Nagad) মার্চেন্ট</span>
                            <span className="font-mono font-bold text-amber-700 text-xs">
                              {donationChannels.mobileBanking.nagad}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(donationChannels?.mobileBanking?.nagad || '', 'nagad')}
                            className="p-1.5 bg-white rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            {copiedId === 'nagad' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {activeSettings.donationInstructions && donationChannels?.instructionsBn && (
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    💡 {donationChannels.instructionsBn}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Projects & Action Plans */}
          {activeSettings.projects && projects.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      চলমান উন্নয়ন প্রকল্প ও কর্মপরিকল্পনা (Action Plans)
                    </h2>
                    <p className="text-[11px] text-slate-500">মসজিদের অবকাঠামো ও সেবামূলক উন্নয়ন কর্মকাণ্ড</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  {projects.length} টি প্রকল্প
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">{proj.title}</h3>
                        {proj.planNumber && (
                          <span className="text-[10px] text-slate-400 font-mono block">আইডি: {proj.planNumber}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {proj.status}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">{proj.description}</p>
                    )}

                    {activeSettings.projectProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>অগ্রগতি</span>
                          <span>{formatBanglaDigits(proj.progressPercentage)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${proj.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {activeSettings.projectBudget && proj.approvedBudget !== undefined && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-semibold text-slate-600 font-mono">
                        <span>বাজেট: ৳ {proj.approvedBudget.toLocaleString('bn-BD')}</span>
                        {proj.actualExpense !== undefined && (
                          <span className="text-emerald-700">ব্যয়: ৳ {proj.actualExpense.toLocaleString('bn-BD')}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Waqf Property Summary */}
          {activeSettings.waqfSummary && waqfList.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    ওয়াকফ সম্পত্তি ও সম্পদের বিবরণ (Waqf Estate Summary)
                  </h2>
                  <p className="text-[11px] text-slate-500">মসজিদ ওয়াকফভুক্ত স্থাবর সম্পত্তির সারসংক্ষেপ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {waqfList.map((w) => (
                  <div key={w.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-900">{w.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {w.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{w.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 7: Committee & Staff Information */}
          {(activeSettings.committee || activeSettings.staff) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Committee Members */}
              {activeSettings.committee && committee && (
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Users2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        {committee.termTitle || 'পরিচালনা কমিটি'}
                      </h2>
                      <p className="text-[11px] text-slate-500">মসজিদের বর্তমান নির্বাচিত/মনোনীত নেতৃত্ব</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {committee.members.map((m) => (
                      <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{m.name}</span>
                        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                          {m.designation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff / Imams */}
              {activeSettings.staff && staffList.length > 0 && (
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">ইমাম, খতিব ও মুয়াজ্জিন পরিচিতি</h2>
                      <p className="text-[11px] text-slate-500">ধর্মীয় সেবা ও দায়িত্বপ্রাপ্ত খাদেমবৃন্দ</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {staffList.map((s) => (
                      <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{s.name}</span>
                          {s.joiningDate && (
                            <span className="text-[10px] text-slate-400 block">কার্যকাল শুরু: {s.joiningDate}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {s.designationBn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 8: Public Notices */}
          {activeSettings.notices && publicNotices.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">মসজিদের নোটিশ বোর্ড ও ঘোষণা</h2>
                  <p className="text-[11px] text-slate-500">সাম্প্রতিক বিজ্ঞপ্তি ও ধর্মীয় বার্তা</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicNotices.map((n) => (
                  <div key={n.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">{n.title}</span>
                      {activeSettings.noticeDate && n.publishDate && (
                        <span className="text-slate-400 text-[11px]">{formatDate(n.publishDate, language)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 9: Cemetery Facilities */}
          {activeSettings.cemetery && cemeteryInfo && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">কবরস্থান সেবা ও নীতিমালা</h2>
                  <p className="text-[11px] text-slate-500">দাফন ও সংরক্ষণ সম্পর্কিত সাধারণ তথ্য</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {cemeteryInfo.generalRules}
              </p>
              {cemeteryInfo.contactPhone && (
                <div className="text-xs text-slate-700 font-semibold pt-1 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>জরুরি দাফন যোগাযোগ: {cemeteryInfo.contactPhone}</span>
                </div>
              )}
            </div>
          )}

          {/* Public Portal Footer */}
          <div className="text-center pt-8 text-xs text-slate-400 space-y-1">
            <p>মসজিদলেজার ডিজিটাল পাবলিক পোর্টাল প্ল্যাটফর্ম • সর্বস্বত্ব সংরক্ষিত</p>
            <p className="text-[11px]">নিরাপদ ও এনক্রিপ্টেড হোয়াইটলিস্ট আর্কিটেকচার দ্বারা পরিচালিত</p>
          </div>
        </div>
      )}
    </div>
  );
};

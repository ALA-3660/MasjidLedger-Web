import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertCircle,
  AlertTriangle,
  Printer,
  FileText,
  HelpCircle,
  Share2,
  Sun,
  Moon,
  Compass,
  Navigation
} from 'lucide-react';
import {
  Mosque,
  FinancialAccount,
  MosqueNotice,
  Donation,
  PublicPortalSettings,
  PublicPortalData,
  DEFAULT_PUBLIC_PORTAL_SETTINGS
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { api } from '../lib/api';
import { MosqueDisplayScreen } from './MosqueDisplayScreen';
import { PublicPrayerSchedulePrint } from './PublicPrayerSchedulePrint';
import { PublicFinancialPrint } from './PublicFinancialPrint';
import { PublicNoticePrint } from './PublicNoticePrint';
import {
  calculateLiveWaqt,
  calculateHanafiDailyTimes,
  buildDailyPrayerSchedule,
  getBengaliDate,
  getHijriDate,
  toBanglaDigits,
  BANGLADESH_DISTRICTS,
  getDistrictGeo,
  formatMinutesToBanglaTime,
  WaqtStatus
} from '../lib/prayerEngine';

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
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Selected district for solar Hanafi calculator
  const defaultDistrictName = propMosque?.district || 'ঢাকা';
  const [selectedDistrict, setSelectedDistrict] = useState<string>(defaultDistrictName);

  // TV / Mosque Display Mode (Kiosk)
  const [isTvMode, setIsTvMode] = useState(forcedDisplayMode);
  const [activePrintSheet, setActivePrintSheet] = useState<'PRAYER' | 'FINANCE' | 'NOTICE' | null>(null);
  const [activeNoticeForPrint, setActiveNoticeForPrint] = useState<MosqueNotice | null>(null);

  // Donation Form State
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('1000');
  const [category, setCategory] = useState<Donation['category']>('GENERAL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState<Donation | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);

  // Live Clock Tick (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Public Portal Data from Server
  const fetchPortalData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await api.getPublicPortalData(propMosque?.id || propMosque?.code);
      setPortalData(data);
      if (data.mosque?.district) {
        setSelectedDistrict(data.mosque.district);
      }
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

  // Sync forcedDisplayMode prop
  useEffect(() => {
    if (forcedDisplayMode !== undefined) {
      setIsTvMode(forcedDisplayMode);
    }
  }, [forcedDisplayMode]);

  // Auto-refresh interval management
  const activeSettings: PublicPortalSettings =
    previewSettings || portalData?.settings || propMosque?.publicPortalSettings || DEFAULT_PUBLIC_PORTAL_SETTINGS;
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
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
    nameBn: propMosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ',
    nameEn: propMosque?.nameEn || 'Baitul Mamur Jame Masjid',
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

  const waqtStatus: WaqtStatus = useMemo(() => {
    return calculateLiveWaqt(currentTime, null, {
      district: selectedDistrict,
      latitude: propMosque?.latitude,
      longitude: propMosque?.longitude,
      jamaatSettings: propMosque?.jamaatSettings,
      prayerSettings: propMosque?.prayerSettings,
    });
  }, [currentTime, propMosque, selectedDistrict]);

  const prayerTimes = portalData?.prayerTimes && portalData.prayerTimes.length > 0
    ? portalData.prayerTimes
    : (activeSettings.prayerSchedule ? waqtStatus.prayerList.map(p => ({
        nameBn: `${p.nameBn} (${p.nameEn})`,
        nameEn: p.nameEn,
        adhan: toBanglaDigits(p.adhan),
        iqamah: p.jamaat ? toBanglaDigits(p.jamaat) : 'সময় নির্ধারণ করা হয়নি',
      })) : []);

  const jumuahTime = portalData?.jumuahTime || (activeSettings.jumuahSchedule ? {
    adhan: toBanglaDigits(waqtStatus.jumuahTimeStr),
    khutbah: toBanglaDigits(waqtStatus.jumuahKhutbahTimeStr),
    iqamah: toBanglaDigits(waqtStatus.jumuahJamaatTimeStr),
  } : undefined);

  // Daily Solar Hanafi Schedule calculated for the selected district
  const dailyHanafiCalc = useMemo(() => {
    return calculateHanafiDailyTimes(currentTime, selectedDistrict);
  }, [currentTime, selectedDistrict]);

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

  // Complete portal dataset assembled for Mosque Display Screen
  const resolvedPortalData: PublicPortalData = {
    mosque: mosqueInfo,
    prayerTimes,
    jumuahTime,
    donationChannels,
    financialTransparency,
    notices: publicNotices,
    projects,
    waqfSummary: waqfList,
    committee,
    subCommittees,
    staff: staffList,
    cemetery: cemeteryInfo,
    settings: activeSettings,
    serverTime: portalData?.serverTime || new Date().toISOString(),
  };

  // IF TV / MOSQUE DISPLAY MODE IS ACTIVE, RENDER THE FULL KIOSK ENGINE
  if (isTvMode) {
    return (
      <MosqueDisplayScreen
        portalData={resolvedPortalData}
        settings={activeSettings}
        onExitDisplayMode={() => setIsTvMode(false)}
        onNavigateToLogin={onNavigateToLogin}
      />
    );
  }

  const today = currentTime;
  const bengaliDate = getBengaliDate(today);
  const hijriDate = getHijriDate(today);

  return (
    <div id="public-portal-root" className="min-h-screen bg-slate-50 text-slate-900 font-siliguri pb-16">
      {/* -------------------------------------------------------------
          TOP BAR / NAVIGATION
          ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            {activeSettings.mosqueLogo && mosqueInfo?.logoUrl ? (
              <img
                src={mosqueInfo.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain border border-slate-200 p-0.5 bg-slate-50"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-2xs font-bold text-lg">
                <Building className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900">
                  {mosqueInfo?.nameBn || 'ডিজিটাল মসজিদ পাবলিক পোর্টাল'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  পাবলিক পোর্টাল
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {mosqueInfo?.address} {mosqueInfo?.district && `• ${mosqueInfo?.district}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Mosque Display / TV Mode Button */}
            <button
              id="btn-open-tv-mode"
              onClick={() => setIsTvMode(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              title="মসজিদ ডিসপ্লে মোড (টিভি ও বড় স্ক্রিন)"
            >
              <Tv className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">মসজিদ ডিসপ্লে মোড</span>
            </button>

            {/* Share Portal Button */}
            <button
              onClick={handleShareLink}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="লিংক কপি করুন"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchPortalData(false)}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="হালনাগাদ তথ্য দেখুন"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Admin Login Button */}
            {onNavigateToLogin && (
              <button
                id="btn-public-admin-login"
                onClick={onNavigateToLogin}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                এডমিন লগইন
              </button>
            )}
          </div>
        </div>

        {/* Quick Nav Anchor Bar */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs font-semibold text-slate-600 whitespace-nowrap">
            {activeSettings.prayerSchedule && (
              <a href="#section-prayer" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                নামাজের সময়সূচি
              </a>
            )}
            <a href="#section-calendar" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
              দৈনিক ও হানাফি ক্যালেন্ডার
            </a>
            {activeSettings.donation && (
              <a href="#section-donation" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                অনলাইন দান ও অনুদান
              </a>
            )}
            {activeSettings.financialSummary && (
              <a href="#section-financial" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                আর্থিক স্বচ্ছতা
              </a>
            )}
            {activeSettings.notices && (
              <a href="#section-notices" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                নোটিশ বোর্ড
              </a>
            )}
            {activeSettings.projects && (
              <a href="#section-projects" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                চলমান উন্নয়ন প্রকল্প
              </a>
            )}
            {activeSettings.committee && (
              <a href="#section-committee" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                পরিচালনা কমিটি
              </a>
            )}
            {activeSettings.locationMap && (
              <a href="#section-map" className="px-2.5 py-1 rounded-lg hover:bg-white hover:text-slate-900 transition-colors">
                অবস্থান ও ম্যাপ
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>পোর্টালের ওয়েব লিংক ক্লিপবোর্ডে কপি করা হয়েছে!</span>
        </div>
      )}

      {/* -------------------------------------------------------------
          HERO BANNER: ISLAMIC HEADER & DATES
          ------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        <div className="bg-linear-to-br from-emerald-800 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-emerald-700/40 relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="text-xs text-emerald-300 font-serif italic">
              بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {mosqueInfo?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
            </h1>
            {mosqueInfo?.nameEn && (
              <p className="text-xs sm:text-sm text-emerald-200 font-sans tracking-wide">
                {mosqueInfo.nameEn}
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
              {mosqueInfo?.address} {mosqueInfo?.district && `• জেলা: ${mosqueInfo?.district}`} {mosqueInfo?.waqfEstateName && `• ওয়াকফ এস্টেট: ${mosqueInfo?.waqfEstateName}`}
            </p>

            {activeSettings.islamicTagline && (
              <div className="pt-2 text-xs text-emerald-300/90 italic">
                {mosqueInfo.islamicTagline}
              </div>
            )}

            {/* Calendars Row */}
            <div className="pt-4 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="bg-white/10 px-3 py-1 rounded-xl border border-white/15">
                হিজরি: <strong>{hijriDate.fullBn}</strong>
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-xl border border-white/15">
                বঙ্গাব্দ: <strong>{bengaliDate.fullBn}</strong>
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-xl border border-white/15">
                খ্রিষ্টাব্দ: <strong>{today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            LIVE WAQT STATUS & 5-STATE DYNAMIC COUNTDOWN ENGINE
            ------------------------------------------------------------- */}
        {(activeSettings.liveWaqtStatus ?? true) && (
          <div className="space-y-3">
            {/* Makruh / Forbidden Prayer Warning */}
            {waqtStatus.isMakruh && (
              <div className="bg-amber-900 border-2 border-amber-400 text-amber-50 px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
                <div className="flex items-center space-x-3 text-xs sm:text-sm font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
                  <span>{waqtStatus.makruhReasonBn}</span>
                </div>
                <span className="text-[11px] font-bold uppercase bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                  সালাত নিষিদ্ধ
                </span>
              </div>
            )}

            {/* Live Dynamic Status Card */}
            <div className="bg-white border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Clock className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      লাইভ ওয়াক্ত ইঞ্জিন • {selectedDistrict} জেলা
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {waqtStatus.dynamicStatusMessageBn}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    বর্তমান ওয়াক্ত: <strong className="text-emerald-700">{waqtStatus.currentWaqtBn}</strong> • পরবর্তী ইভেন্ট: <strong className="text-slate-800">{waqtStatus.nextPrayerBn || waqtStatus.nextWaqtBn}</strong> ({waqtStatus.nextPrayerTime || waqtStatus.nextJamaatTimeStr || waqtStatus.nextAdhanTimeStr})
                  </p>
                </div>
              </div>

              {/* Countdown Ticker Box */}
              <div className="flex items-center space-x-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shrink-0 self-start md:self-auto">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    কাউন্টডাউন টাইমার
                  </span>
                  <div className="text-sm sm:text-base font-black font-mono text-white">
                    {waqtStatus.waqtRemainingStrBn || waqtStatus.nextWaqtStartsInStrBn || ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Notice Banner if present */}
        {activeSettings.emergencyNotice && emergencyNotice && (
          <div className="bg-rose-50 border-2 border-rose-400 text-rose-950 p-4 sm:p-5 rounded-2xl flex items-start space-x-3 shadow-xs">
            <Bell className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">জরুরি ঘোষণা</div>
              <h4 className="text-sm sm:text-base font-extrabold">{emergencyNotice.title}</h4>
              <p className="text-xs text-rose-900 leading-relaxed">{emergencyNotice.description}</p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 1: PRAYER SCHEDULE & LIVE TIMETABLE
            ------------------------------------------------------------- */}
        {activeSettings.prayerSchedule && (
          <section id="section-prayer" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">পাঁচ ওয়াক্ত সালাত ও জামাতের আনুষ্ঠানিক সময়সূচি</h2>
                  <p className="text-xs text-slate-500">মসজিদ পরিচালনা কমিটি কর্তৃক নির্ধারিত আজান ও জামাত সময়</p>
                </div>
              </div>

              {/* Printable Schedule Sheet Trigger */}
              <button
                onClick={() => setActivePrintSheet('PRAYER')}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>সময়সূচি প্রিন্ট (A4)</span>
              </button>
            </div>

            {/* 5 Prayers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {prayerTimes.map((p, idx) => {
                const isCurrent = p.nameBn.includes(waqtStatus.currentWaqtBn.split(' ')[0]);
                return (
                  <div
                    key={idx}
                    className={`border rounded-2xl p-4 text-center space-y-2 transition-all ${
                      isCurrent
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30'
                        : 'bg-slate-50 hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <span className={`text-base sm:text-lg font-bold block ${isCurrent ? 'text-emerald-950 font-black' : 'text-slate-900'}`}>
                      {p.nameBn}
                    </span>
                    <div className="text-xs text-slate-500">
                      আজান: <strong className="font-mono text-slate-800">{p.adhan}</strong>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/80">
                      <span className="text-[11px] text-slate-500 block">জামাত</span>
                      <span className="text-lg sm:text-xl font-black font-mono text-emerald-700 block">
                        {p.iqamah}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Jumu'ah Box */}
            {activeSettings.jumuahSchedule && jumuahTime && (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-sm font-bold text-emerald-950 block">জুমার নামাজ (সাপ্তাহিক শুক্রবার)</span>
                    <span className="text-xs text-emerald-800">সকল মুসল্লিকে যথাসময়ে উপস্থিত হওয়ার অনুরোধ</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs sm:text-sm font-semibold text-emerald-900 font-mono">
                  <span>আজান: <strong>{jumuahTime.adhan}</strong></span>
                  <span>খুতবা: <strong>{jumuahTime.khutbah}</strong></span>
                  <span className="bg-emerald-600 text-white px-3 py-1 rounded-xl font-bold font-sans">
                    জামাত: {jumuahTime.iqamah}
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* -------------------------------------------------------------
            DISTRICT-BASED HANAFI SOLAR PRAYER & RAMADAN CALENDAR (12 TIMES)
            ------------------------------------------------------------- */}
        <section id="section-calendar" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  জেলা ও তারিখ অনুযায়ী হানাফি নামাজের ওয়াক্ত ও রমজান সূচি (১২টি সময়)
                </h2>
                <p className="text-xs text-slate-500">
                  বাংলাদেশ ইসলামিক ফাউন্ডেশন ও হানাফি ফিকহ অনুযায়ী সূর্যভিত্তিক সঠিক সৌর সময় গণনা
                </p>
              </div>
            </div>

            {/* District Selector */}
            <div className="flex items-center space-x-2">
              <label htmlFor="select-calc-district" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                জেলা নির্বাচন:
              </label>
              <select
                id="select-calc-district"
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                {BANGLADESH_DISTRICTS.map(d => (
                  <option key={d.id} value={d.nameBn}>
                    {d.nameBn} ({d.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 12 Timing Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
            {/* 1. Fajr */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">১. ফজর শুরু</span>
              <span className="text-base font-black font-mono text-emerald-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.fajrMin)}
              </span>
              <span className="text-[10px] text-slate-400">সুবহে সাদিক</span>
            </div>

            {/* 2. Sunrise */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-amber-800 block">২. সূর্যোদয় (Sunrise)</span>
              <span className="text-base font-black font-mono text-amber-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.sunriseMin)}
              </span>
              <span className="text-[10px] text-amber-700">সালাত নিষিদ্ধ</span>
            </div>

            {/* 3. Ishraq */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">৩. ইশরাক (Ishraq)</span>
              <span className="text-base font-black font-mono text-slate-800 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.ishraqMin)}
              </span>
              <span className="text-[10px] text-slate-400">নফল সালাত শুরু</span>
            </div>

            {/* 4. Dhuhr */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">৪. যোহর শুরু</span>
              <span className="text-base font-black font-mono text-emerald-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.dhuhrMin)}
              </span>
              <span className="text-[10px] text-slate-400">সূর্য ঢলে পড়ার পর</span>
            </div>

            {/* 5. Asr (Hanafi 2x) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">৫. আসর শুরু (হানাফি)</span>
              <span className="text-base font-black font-mono text-emerald-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.asrMin)}
              </span>
              <span className="text-[10px] text-slate-400">মিছলায়ন (দ্বিগুণ ছায়া)</span>
            </div>

            {/* 6. Sunset */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-amber-800 block">৬. সূর্যাস্ত (Sunset)</span>
              <span className="text-base font-black font-mono text-amber-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.sunsetMin)}
              </span>
              <span className="text-[10px] text-amber-700">মাগরিব ওয়াক্ত শুরু</span>
            </div>

            {/* 7. Maghrib */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">৭. মাগরিব</span>
              <span className="text-base font-black font-mono text-emerald-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.maghribMin)}
              </span>
              <span className="text-[10px] text-slate-400">সূর্যাস্তের পর</span>
            </div>

            {/* 8. Isha */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">৮. এশা শুরু</span>
              <span className="text-base font-black font-mono text-emerald-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.ishaMin)}
              </span>
              <span className="text-[10px] text-slate-400">১৮° শাফাক্ব অন্তর্ধান</span>
            </div>

            {/* 9. Tahajjud */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">৯. তাহাজ্জুদ শেষ</span>
              <span className="text-base font-black font-mono text-slate-800 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.tahajjudEndMin)}
              </span>
              <span className="text-[10px] text-slate-400">উত্তম শেষ তৃতীয়াংশ</span>
            </div>

            {/* 10. Jumu'ah */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">১০. জুমা (শুক্রবার)</span>
              <span className="text-base font-black font-mono text-emerald-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.jumuahMin)}
              </span>
              <span className="text-[10px] text-slate-400">যোহরের ওয়াক্ত</span>
            </div>

            {/* 11. Ramadan Sehri End */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-blue-800 block">১১. সেহরি শেষ সময়</span>
              <span className="text-base font-black font-mono text-blue-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.sehriEndMin)}
              </span>
              <span className="text-[10px] text-blue-600">সতর্কতামূলক</span>
            </div>

            {/* 12. Ramadan Iftar */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold text-rose-800 block">১২. ইফতারের সময়</span>
              <span className="text-base font-black font-mono text-rose-700 block">
                {formatMinutesToBanglaTime(dailyHanafiCalc.iftarMin)}
              </span>
              <span className="text-[10px] text-rose-600">সূর্যাস্তের সাথে সাথে</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION 2: ONLINE DONATIONS & BANK CHANNELS
            ------------------------------------------------------------- */}
        {activeSettings.donation && (
          <section id="section-donation" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">অনলাইন অনুদান, ব্যাংক হিসাব ও মোবাইল ব্যাংকিং</h2>
                <p className="text-xs text-slate-500">আল্লাহর ঘরে দান করুন ও সদকায়ে জারিয়ার সওয়াব অর্জন করুন</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Quick Donation Form */}
              {activeSettings.onlineDonation && (
                <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>অনলাইন দান রশিদ ও তাৎক্ষণিক প্রদান</span>
                  </h3>

                  {donationSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h4 className="text-base font-bold text-emerald-950">আলহামদুলিল্লাহ! আপনার অনুদান গৃহীত হয়েছে</h4>
                      <p className="text-xs text-emerald-800">
                        রশিদ নম্বর: <strong className="font-mono">{donationSuccess.receiptNumber}</strong> • পরিমাণ: ৳ {donationSuccess.amount.toLocaleString('bn-BD')}
                      </p>
                      <div className="flex items-center justify-center space-x-2 pt-2">
                        <button
                          onClick={() => {
                            if (onPrintReceipt) onPrintReceipt(donationSuccess);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                          রশিদ প্রিন্ট করুন
                        </button>
                        <button
                          onClick={() => setDonationSuccess(null)}
                          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50"
                        >
                          নতুন দান করুন
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleOnlineDonation} className="space-y-3.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">দানকারীর নাম (ঐচ্ছিক)</label>
                        <input
                          type="text"
                          value={donorName}
                          onChange={e => setDonorName(e.target.value)}
                          placeholder="আল্লাহর এক বান্দা"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                        <input
                          type="tel"
                          value={donorPhone}
                          onChange={e => setDonorPhone(e.target.value)}
                          placeholder="০১৭xxxxxxxx"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">দানের খাত</label>
                        <select
                          value={category}
                          onChange={e => setCategory(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-semibold"
                        >
                          <option value="GENERAL">মসজিদের সাধারণ তহবিল</option>
                          <option value="CONSTRUCTION">উন্নয়ন ও নির্মাণ তহবিল</option>
                          <option value="ZAKAT">যাকাত ও সাহায্য তহবিল</option>
                          <option value="ORPHAN">এতিম ও শিক্ষা তহবিল</option>
                          <option value="RAMADAN">মাহে রমজান ইফতার তহবিল</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">টাকার পরিমাণ (৳)</label>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {['500', '1000', '2000', '5000'].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAmount(val)}
                              className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                                amount === val
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              ৳ {val}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          required
                          min="10"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono font-bold"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'অনলাইন দান সম্পন্ন ও রশিদ সংগ্রহ করুন'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Right Column: QR Code & Bank Accounts */}
              <div className={`${activeSettings.onlineDonation ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
                {/* QR Code */}
                {activeSettings.donationQr && donationChannels?.qrCodeUrl && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex items-center space-x-4">
                    <img
                      src={donationChannels.qrCodeUrl}
                      alt="Donation QR"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2 border border-slate-200 object-contain shadow-xs shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">কিউআর স্ক্যান করুন</span>
                      <h4 className="text-sm font-bold text-slate-900">বিকাশ / নগদ অ্যাপ দিয়ে স্ক্যান করে দান করুন</h4>
                      <p className="text-xs text-slate-500">মার্চেন্ট কিউআর কোড স্ক্যান করে সরাসরি ফান্ডে জমা দিন</p>
                    </div>
                  </div>
                )}

                {/* Mobile Banking Accounts */}
                {activeSettings.mobileBanking && donationChannels?.mobileBanking && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">মোবাইল ব্যাংকিং নম্বর</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {donationChannels.mobileBanking.bkash && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-pink-600 block">বিকাশ (bKash) মার্চেন্ট</span>
                            <span className="font-mono text-slate-800 font-bold">{donationChannels.mobileBanking.bkash}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(donationChannels.mobileBanking!.bkash!, 'bkash')}
                            className="p-1.5 text-slate-400 hover:text-slate-700"
                            title="কপি করুন"
                          >
                            {copiedId === 'bkash' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {donationChannels.mobileBanking.nagad && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-amber-600 block">নগদ (Nagad) মার্চেন্ট</span>
                            <span className="font-mono text-slate-800 font-bold">{donationChannels.mobileBanking.nagad}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(donationChannels.mobileBanking!.nagad!, 'nagad')}
                            className="p-1.5 text-slate-400 hover:text-slate-700"
                            title="কপি করুন"
                          >
                            {copiedId === 'nagad' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bank Accounts */}
                {activeSettings.bankAccount && donationChannels?.bankAccounts && donationChannels.bankAccounts.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">অফিসিয়াল ব্যাংক হিসাব নম্বর</span>
                    <div className="space-y-2">
                      {donationChannels.bankAccounts.map(acc => (
                        <div key={acc.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{acc.nameBn}</span>
                            <span className="text-slate-500">{acc.bankName} {acc.branchName && `• ${acc.branchName} শাখা`}</span>
                          </div>
                          {acc.accountNumber && (
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-emerald-700">{acc.accountNumber}</span>
                              <button
                                onClick={() => handleCopy(acc.accountNumber!, `acc-${acc.id}`)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                                title="হিসাব নম্বর কপি করুন"
                              >
                                {copiedId === `acc-${acc.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            SECTION 3: FINANCIAL TRANSPARENCY
            ------------------------------------------------------------- */}
        {activeSettings.financialSummary && financialTransparency && (
          <section id="section-financial" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    আর্থিক স্বচ্ছতা ও মাসিক সারসংক্ষেপ ({financialTransparency.currentMonthNameBn || 'চলতি মাস'})
                  </h2>
                  <p className="text-xs text-slate-500">মসজিদলেজার এনক্রিপ্টেড লেজারের স্বয়ংক্রিয় আর্থিক অডিট রিপোর্ট</p>
                </div>
              </div>

              {/* Printable Financial Statement Trigger */}
              <button
                onClick={() => setActivePrintSheet('FINANCE')}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>আর্থিক বিবরণী প্রিন্ট (A4)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeSettings.monthlyIncome && financialTransparency.monthlyIncome !== undefined && (
                <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>চলতি মাসের মোট আয়</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                    ৳ {financialTransparency.monthlyIncome.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-500">দানবাক্স ও অনুদান থেকে সংগৃহীত</p>
                </div>
              )}

              {activeSettings.monthlyExpense && financialTransparency.monthlyExpense !== undefined && (
                <div className="p-5 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                    <span>চলতি মাসের মোট ব্যয়</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-rose-700">
                    ৳ {financialTransparency.monthlyExpense.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-500">সম্মানী ভাতা ও বিলসমূহ</p>
                </div>
              )}

              {activeSettings.monthlySurplus && financialTransparency.monthlySurplus !== undefined && (
                <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                    <span>মাসিক নিট উদ্বৃত্ত</span>
                    <Scale className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-blue-700">
                    ৳ {financialTransparency.monthlySurplus.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-500">আয় বিয়োগ ব্যয় স্থিতি</p>
                </div>
              )}

              {activeSettings.totalDonationReceived && financialTransparency.totalDonationsReceived !== undefined && (
                <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-800">
                    <span>মোট সংগৃহীত দান</span>
                    <Heart className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-purple-700">
                    ৳ {financialTransparency.totalDonationsReceived.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-500">সকল চ্যানেলের মোট অনুদান</p>
                </div>
              )}

              {activeSettings.currentBalance && financialTransparency.currentBalance !== undefined && (
                <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                    <span>সর্বমোট তহবিল স্থিতি</span>
                    <Landmark className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-amber-700">
                    ৳ {financialTransparency.currentBalance.toLocaleString('bn-BD')}
                  </div>
                  <p className="text-[11px] text-slate-500">ক্যাশ ও ব্যাংকের মোট সংরক্ষিত তহবিল</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            SECTION 4: NOTICES & ANNOUNCEMENTS
            ------------------------------------------------------------- */}
        {activeSettings.notices && publicNotices.length > 0 && (
          <section id="section-notices" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">মসজিদের নোটিশ বোর্ড ও ধর্মীয় ঘোষণা</h2>
                <p className="text-xs text-slate-500">সর্বশেষ বিজ্ঞপ্তি ও গুরুত্বপূর্ণ নির্দেশনা</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publicNotices.map((n) => (
                <div key={n.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{n.title}</h3>
                      {n.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                          n.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {n.priority}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed line-clamp-4">
                      {n.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>তারিখ: {n.publishDate}</span>
                    <button
                      onClick={() => {
                        setActiveNoticeForPrint(n as any);
                        setActivePrintSheet('NOTICE');
                      }}
                      className="text-emerald-700 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>প্রিন্ট করুন</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            SECTION 5: PROJECTS & WAQF
            ------------------------------------------------------------- */}
        {((activeSettings.projects && projects.length > 0) || (activeSettings.waqfSummary && waqfList.length > 0)) && (
          <section id="section-projects" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">চলমান উন্নয়ন কর্মপরিকল্পনা ও ওয়াকফ সম্পদ</h2>
                <p className="text-xs text-slate-500">মসজিদ সম্প্রসারণ ও অবকাঠামোগত উন্নয়ন বিবরণী</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{p.title}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{p.description}</p>
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>অগ্রগতি</span>
                      <span className="font-mono text-emerald-700">{toBanglaDigits(p.progressPercentage)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${p.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            SECTION 6: COMMITTEE & STAFF
            ------------------------------------------------------------- */}
        {((activeSettings.committee && committee) || (activeSettings.staff && staffList.length > 0)) && (
          <section id="section-committee" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Users2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">মসজিদ পরিচালনা কমিটি ও সম্মানিত খাদেমবৃন্দ</h2>
                <p className="text-xs text-slate-500">নেতৃত্ব ও ধর্মীয় দায়িত্বপ্রাপ্ত সম্মানিত ব্যক্তিবর্গ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Committee */}
              {activeSettings.committee && committee && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {committee.termTitle || 'পরিচালনা কমিটি'}
                  </span>
                  <div className="space-y-2">
                    {committee.members.map(m => (
                      <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 font-semibold">
                          {m.designation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff */}
              {activeSettings.staff && staffList.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    সম্মানিত ইমাম, খতিব ও মুয়াজ্জিনবৃন্দ
                  </span>
                  <div className="space-y-2">
                    {staffList.map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          {s.joiningDate && <span className="text-[10px] text-slate-400">কার্যকাল: {s.joiningDate}</span>}
                        </div>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
                          {s.designationBn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------------
            SECTION 7: LOCATION & GOOGLE MAPS
            ------------------------------------------------------------- */}
        {(activeSettings.locationMap ?? true) && mosqueInfo?.address && (
          <section id="section-map" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">মসজিদের ভৌগোলিক অবস্থান ও দিকনির্দেশনা</h2>
                <p className="text-xs text-slate-500">গুগল ম্যাপ ও যোগাযোগের পূর্ণ ঠিকানা</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-start space-x-2.5">
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">পূর্ণ ঠিকানা</span>
                      <p className="text-sm font-semibold text-slate-900">
                        {mosqueInfo.address}, {mosqueInfo.district}
                      </p>
                    </div>
                  </div>

                  {mosqueInfo.phone && (
                    <div className="flex items-center space-x-2.5 pt-2 border-t border-slate-200 text-xs">
                      <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-slate-600">যোগাযোগ: <strong className="font-mono text-slate-900">{mosqueInfo.phone}</strong></span>
                    </div>
                  )}

                  {mosqueInfo.email && (
                    <div className="flex items-center space-x-2.5 text-xs">
                      <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-slate-600">ইমেইল: <strong className="text-slate-900">{mosqueInfo.email}</strong></span>
                    </div>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((mosqueInfo.nameBn || '') + ' ' + (mosqueInfo.address || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>গুগল ম্যাপে দিকনির্দেশনা (Get Directions)</span>
                </a>
              </div>

              <div className="lg:col-span-6 h-56 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center">
                <div className="text-center space-y-2 p-6">
                  <Compass className="w-10 h-10 text-emerald-600 mx-auto animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 block">
                    {mosqueInfo.nameBn} • {mosqueInfo.district}
                  </span>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    {mosqueInfo.address}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 text-xs text-slate-400 space-y-1 border-t border-slate-200">
          <p>মসজিদলেজার ডিজিটাল পাবলিক পোর্টাল প্ল্যাটফর্ম • সর্বস্বত্ব সংরক্ষিত</p>
          <p className="text-[11px]">সার্ভার-সাইড এনক্রিপ্টেড ডাটা ফিল্টারিং ও রিয়েলটাইম জামাত ইঞ্জিন দ্বারা পরিচালিত</p>
        </footer>
      </div>

      {/* -------------------------------------------------------------
          PRINTABLE MODALS (A4 TEMPLATES)
          ------------------------------------------------------------- */}
      {activePrintSheet === 'PRAYER' && (
        <PublicPrayerSchedulePrint
          mosque={mosqueInfo}
          prayerTimes={prayerTimes}
          jumuahTime={jumuahTime}
          onClose={() => setActivePrintSheet(null)}
        />
      )}

      {activePrintSheet === 'FINANCE' && financialTransparency && (
        <PublicFinancialPrint
          mosque={mosqueInfo}
          financialTransparency={financialTransparency}
          settings={activeSettings}
          onClose={() => setActivePrintSheet(null)}
        />
      )}

      {activePrintSheet === 'NOTICE' && activeNoticeForPrint && (
        <PublicNoticePrint
          mosque={mosqueInfo}
          notice={activeNoticeForPrint as any}
          onClose={() => {
            setActivePrintSheet(null);
            setActiveNoticeForPrint(null);
          }}
        />
      )}
    </div>
  );
};

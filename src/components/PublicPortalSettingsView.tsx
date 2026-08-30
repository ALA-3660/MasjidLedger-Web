import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building,
  Clock,
  HeartHandshake,
  DollarSign,
  Bell,
  CheckSquare,
  Landmark,
  Users2,
  UserCheck,
  Crosshair,
  Tv,
  HelpCircle,
  Sparkles,
  Smartphone,
  Monitor,
  RefreshCw,
  Info,
  X,
  Sliders,
  Lock,
  Calendar
} from 'lucide-react';
import { Mosque, User, PublicPortalSettings, DEFAULT_PUBLIC_PORTAL_SETTINGS } from '../types';
import { Language, translations } from '../lib/i18n';
import { api } from '../lib/api';
import { PublicPortalView } from './PublicPortalView';

interface PublicPortalSettingsViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onOpenLivePortal?: () => void;
  onSettingsUpdated?: (newSettings: PublicPortalSettings) => void;
}

export const PublicPortalSettingsView: React.FC<PublicPortalSettingsViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onOpenLivePortal,
  onSettingsUpdated,
}) => {
  const [settings, setSettings] = useState<PublicPortalSettings>(() => {
    return currentMosque?.publicPortalSettings
      ? { ...DEFAULT_PUBLIC_PORTAL_SETTINGS, ...currentMosque.publicPortalSettings }
      : { ...DEFAULT_PUBLIC_PORTAL_SETTINGS };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'DESKTOP' | 'MOBILE' | 'TV'>('DESKTOP');
  const [confirmResetModal, setConfirmResetModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Permission Check
  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('MANAGE_SETTINGS') ||
    currentUser?.permissions?.includes('MANAGE_PUBLIC_PORTAL');

  // Fetch settings from server on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await api.getPublicPortalSettings();
        if (isMounted && data) {
          setSettings(prev => ({ ...DEFAULT_PUBLIC_PORTAL_SETTINGS, ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to fetch public portal settings:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = (key: keyof PublicPortalSettings) => {
    if (!canEdit) return;
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSelectChange = (key: keyof PublicPortalSettings, value: any) => {
    if (!canEdit) return;
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const updated = await api.updatePublicPortalSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'সেটিংস সংরক্ষণে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      const resetData = await api.resetPublicPortalSettings();
      setSettings(resetData);
      setConfirmResetModal(false);
      setSaveSuccess(true);
      if (onSettingsUpdated) {
        onSettingsUpdated(resetData);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'রিসেট করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle switch subcomponent with high contrast and accessible layout
  const ToggleRow = ({
    id,
    label,
    desc,
    checked,
    onChange,
    isSensitive = false,
    badge,
  }: {
    id: string;
    label: string;
    desc?: string;
    checked: boolean;
    onChange: () => void;
    isSensitive?: boolean;
    badge?: string;
  }) => (
    <div
      id={`toggle-row-${id}`}
      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        checked
          ? 'bg-blue-50/40 border-blue-200/80 shadow-2xs'
          : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-50'
      }`}
    >
      <div className="space-y-0.5 max-w-[78%]">
        <div className="flex items-center space-x-2">
          <label htmlFor={`switch-${id}`} className="text-xs sm:text-sm font-bold text-slate-800 cursor-pointer">
            {label}
          </label>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              {badge}
            </span>
          )}
          {isSensitive && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-0.5" title="সংবেদনশীল তথ্য: সতর্কতার সাথে অন করুন">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>সংবেদনশীল</span>
            </span>
          )}
        </div>
        {desc && <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>}
      </div>

      <button
        type="button"
        id={`switch-${id}`}
        disabled={!canEdit}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 font-siliguri">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  পাবলিক পোর্টাল দৃশ্যমানতা নিয়ন্ত্রণ (Public Portal Visibility Control)
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Phase 1 • Whitelist Guard
                </span>
              </div>
              <p className="text-xs text-slate-500">
                মসজিদের কোন তথ্য সাধারণ মুসল্লি, অনুদানকারী ও দর্শনার্থীদের জন্য উন্মুক্ত থাকবে তা কঠোরভাবে নির্ধারণ করুন।
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-preview-portal"
            onClick={() => setPreviewModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center space-x-1.5 transition-all shadow-2xs"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>প্রিভিউ দেখুন</span>
          </button>

          {onOpenLivePortal && (
            <button
              id="btn-open-live-portal"
              onClick={onOpenLivePortal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center space-x-1.5 transition-all shadow-2xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>লাইভ পোর্টাল</span>
            </button>
          )}

          <button
            id="btn-reset-safe-defaults"
            disabled={!canEdit || isSaving}
            onClick={() => setConfirmResetModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center space-x-1.5 transition-all disabled:opacity-50"
            title="নিরাপদ ডিফল্ট সেটিংসে ফেরত যান"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ডিফল্ট রিসেট</span>
          </button>

          <button
            id="btn-save-public-settings"
            disabled={!canEdit || isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>পরিবর্তন সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permission & Status Alerts */}
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-xs flex items-center space-x-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            আপনার ব্যবহারকারী অ্যাকাউন্টে সেটিংস পরিবর্তনের অনুমতি নেই। আপনি শুধুমাত্র বর্তমান কনফিগারেশন দেখতে পারবেন।
          </span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            পাবলিক পোর্টাল দৃশ্যমানতা সেটিংস সফলভাবে আপডেট এবং সংরক্ষিত হয়েছে! পরিবর্তনসমূহ তাৎক্ষণিকভাবে কার্যকর হয়েছে।
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Principle of Whitelist Banner */}
      <div className="bg-linear-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-800/80 flex items-start space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-blue-300" />
        </div>
        <div className="space-y-1 text-xs leading-relaxed">
          <span className="font-bold text-white text-sm block">
            হোয়াইটলিস্ট নিরাপত্তা নীতি (Whitelist Security Architecture)
          </span>
          <p className="text-blue-100">
            অ্যাডমিন যে তথ্যগুলো দৃশ্যমান করতে "ON" করবেন, পাবলিক এপিআই শুধুমাত্র সেই তথ্যগুলোই পাঠাবে। কোনো ফিচার "OFF" থাকলে ব্যাকএন্ড কোনো অবস্থাতেই সেই তথ্য উন্মুক্ত করবে না। কোনো ব্যক্তিগত ফোন নম্বর, এনআইডি, বা অভ্যন্তরীণ ভাউচার পাবলিক পোর্টালে কখনো প্রদর্শিত হয় না।
          </p>
        </div>
      </div>

      {/* Grid of Settings Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category 1: Mosque Identity & Profile */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">১. মসজিদ পরিচিতি ও সাধারণ তথ্য</h2>
              <p className="text-[11px] text-slate-500">মসজিদের নাম, ঠিকানা ও অফিসিয়াল পরিচিতি</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="mosqueProfile"
              label="মসজিদ পরিচিতি হেডার ও প্রোফাইল"
              desc="পোর্টালের মূল হেডার ব্যানারে মসজিদের নাম ও বিবরণ প্রদর্শন"
              checked={settings.mosqueProfile}
              onChange={() => handleToggle('mosqueProfile')}
            />
            <ToggleRow
              id="mosqueLogo"
              label="অফিসিয়াল লোগো / মনোগ্রাম"
              desc="মসজিদের ব্র্যান্ডিং লোগো প্রদর্শন"
              checked={settings.mosqueLogo}
              onChange={() => handleToggle('mosqueLogo')}
            />
            <ToggleRow
              id="mosqueAddress"
              label="পূর্ণ ঠিকানা ও জেলা"
              desc="গ্রাম/মহল্লা, ইউনিয়ন, উপজেলা ও জেলার নাম প্রদর্শন"
              checked={settings.mosqueAddress}
              onChange={() => handleToggle('mosqueAddress')}
            />
            <ToggleRow
              id="mosquePhone"
              label="অফিসিয়াল যোগাযোগ নম্বর"
              desc="মসজিদের অফিস/তত্ত্বাবধায়কের হেল্পলাইন ফোন নম্বর"
              checked={settings.mosquePhone}
              onChange={() => handleToggle('mosquePhone')}
            />
            <ToggleRow
              id="mosqueEmail"
              label="অফিসিয়াল ইমেইল ঠিকানা"
              desc="পাবলিক পোর্টালে মসজিদের ইমেইল প্রদর্শন"
              checked={settings.mosqueEmail}
              onChange={() => handleToggle('mosqueEmail')}
            />
            <ToggleRow
              id="waqfId"
              label="ওয়াকফ এস্টেট নাম ও ইসি নম্বর"
              desc="বাংলাদেশ ওয়াকফ প্রশাসনের অন্তর্ভুক্তির বিবরণ"
              checked={settings.waqfId}
              onChange={() => handleToggle('waqfId')}
            />
            <ToggleRow
              id="registrationNumber"
              label="সরকারি নিবন্ধন নম্বর"
              desc="সরকারি বা স্থানীয় প্রশাসনের নিবন্ধন নম্বর"
              checked={settings.registrationNumber}
              onChange={() => handleToggle('registrationNumber')}
            />
            <ToggleRow
              id="establishedYear"
              label="প্রতিষ্ঠার সাল / তারিখ"
              desc="মসজিদ প্রতিষ্ঠার সন প্রদর্শন"
              checked={settings.establishedYear}
              onChange={() => handleToggle('establishedYear')}
            />
            <ToggleRow
              id="islamicTagline"
              label="কুরআন ও হাদিসের উদ্বৃতি"
              desc="পবিত্র কুরআনের আয়াত ও ইসলামিক বাণী ব্যানার"
              checked={settings.islamicTagline}
              onChange={() => handleToggle('islamicTagline')}
            />
          </div>
        </div>

        {/* Category 2: Prayer Schedule */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">২. নামাজের সময়সূচি (Prayer Schedule)</h2>
              <p className="text-[11px] text-slate-500">পাঁচ ওয়াক্ত নামাজ ও জুমার জামাতের সময়</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="prayerSchedule"
              label="দৈনিক পাঁচ ওয়াক্ত নামাজের আজান ও জামাত"
              desc="ফজর, যোহর, আসর, মাগরিব ও এশার নির্ধারিত সময়সূচি"
              checked={settings.prayerSchedule}
              onChange={() => handleToggle('prayerSchedule')}
            />
            <ToggleRow
              id="jumuahSchedule"
              label="জুমার আজান, খুতবা ও জামাত সময়"
              desc="শুক্রবার জুমার নামাজের বিশেষ সময়সূচি"
              checked={settings.jumuahSchedule}
              onChange={() => handleToggle('jumuahSchedule')}
            />
            <ToggleRow
              id="ramadanSchedule"
              label="রমজান ও সাহরি-ইফতারের সময়সূচি"
              desc="মাহে রমজানের সেহরি ও ইফতারের ক্যালেন্ডার সময়"
              checked={settings.ramadanSchedule}
              onChange={() => handleToggle('ramadanSchedule')}
              badge="মৌসুমি"
            />
          </div>
        </div>

        {/* Category 3: Donation Channels */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৩. দান ও অনুদান চ্যানেল (Donation Channels)</h2>
              <p className="text-[11px] text-slate-500">অনলাইন দান, ব্যাংক অ্যাকাউন্ট ও বিকাশ/নগদ নম্বর</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="donation"
              label="অনলাইন দান ও অনুদান মডিউল"
              desc="পাবলিক পোর্টালে সামগ্রিক দান সেকশন সক্রিয় করা"
              checked={settings.donation}
              onChange={() => handleToggle('donation')}
            />
            <ToggleRow
              id="onlineDonation"
              label="তাৎক্ষণিক অনলাইন দান ফরম"
              desc="দর্শনার্থীদের সরাসরি অনলাইনে নাম/বেনামে দান জমা ও মানি রসিদ পাওয়ার ফরম"
              checked={settings.onlineDonation}
              onChange={() => handleToggle('onlineDonation')}
            />
            <ToggleRow
              id="bankAccount"
              label="অফিসিয়াল ব্যাংক হিসাব নম্বর"
              desc="মসজিদের ব্যাংক নাম, হিসাবের নাম ও একাউন্ট নম্বর প্রদর্শন"
              checked={settings.bankAccount}
              onChange={() => handleToggle('bankAccount')}
            />
            <ToggleRow
              id="mobileBanking"
              label="মোবাইল ব্যাংকিং (বিকাশ / নগদ / রকেট)"
              desc="মসজিদের অফিসিয়াল মার্চেন্ট বা পার্সোনাল নম্বর প্রদর্শন"
              checked={settings.mobileBanking}
              onChange={() => handleToggle('mobileBanking')}
            />
            <ToggleRow
              id="donationQr"
              label="দান কিউআর কোড (Donation QR Code)"
              desc="সরাসরি স্ক্যান করে দান পাঠানোর কিউআর কোড"
              checked={settings.donationQr}
              onChange={() => handleToggle('donationQr')}
            />
            <ToggleRow
              id="donationInstructions"
              label="দান প্রেরণের নির্দেশিকা"
              desc="রেফারেন্সে খাতের নাম লেখার নির্দেশনা প্রদর্শন"
              checked={settings.donationInstructions}
              onChange={() => handleToggle('donationInstructions')}
            />
          </div>
        </div>

        {/* Category 4: Financial Transparency */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৪. আর্থিক স্বচ্ছতা ও সারসংক্ষেপ</h2>
              <p className="text-[11px] text-slate-500">মাসিক আয়-ব্যয় ও তহবিলের অনুমোদিত সারসংক্ষেপ</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="financialSummary"
              label="আর্থিক সারসংক্ষেপ মডিউল"
              desc="সার্বজনীন স্বচ্ছতার জন্য আর্থিক স্ট্যাটাস প্রদর্শন সক্রিয় করা"
              checked={settings.financialSummary}
              onChange={() => handleToggle('financialSummary')}
            />
            <ToggleRow
              id="monthlyIncome"
              label="চলতি মাসের মোট অনুমোদিত আয়"
              desc="চলতি মাসের মোট সংগৃহীত আয়ের পরিমাণ"
              checked={settings.monthlyIncome}
              onChange={() => handleToggle('monthlyIncome')}
            />
            <ToggleRow
              id="monthlyExpense"
              label="চলতি মাসের মোট অনুমোদিত ব্যয়"
              desc="চলতি মাসের মোট ব্যয়ের পরিমাণ"
              checked={settings.monthlyExpense}
              onChange={() => handleToggle('monthlyExpense')}
            />
            <ToggleRow
              id="monthlySurplus"
              label="চলতি মাসের উদ্বৃত্ত / ঘাটতি"
              desc="আয় ও ব্যয়ের পার্থক্য (Surplus/Deficit)"
              checked={settings.monthlySurplus}
              onChange={() => handleToggle('monthlySurplus')}
            />
            <ToggleRow
              id="totalDonationReceived"
              label="সর্বমোট সংগৃহীত দান"
              desc="চলতি অর্থবছর বা সামগ্রিক দানের যোগফল"
              checked={settings.totalDonationReceived}
              onChange={() => handleToggle('totalDonationReceived')}
            />
            <ToggleRow
              id="currentBalance"
              label="বর্তমান সর্বমোট তহবিল স্থিতি"
              desc="মসজিদের মোট ক্যাশ ও ব্যাংক তহবিলের যোগফল"
              checked={settings.currentBalance}
              onChange={() => handleToggle('currentBalance')}
              isSensitive={true}
            />
            <ToggleRow
              id="cashBalance"
              label="হাতে নগদ স্থিতি (Cash in Hand)"
              desc="অফিসের ক্যাশবাক্সে সংরক্ষিত স্থিতি"
              checked={settings.cashBalance}
              onChange={() => handleToggle('cashBalance')}
              isSensitive={true}
            />
            <ToggleRow
              id="bankBalance"
              label="মোট ব্যাংক স্থিতি (Bank Balance)"
              desc="মসজিদের সব ব্যাংক অ্যাকাউন্টের মোট জমা স্থিতি"
              checked={settings.bankBalance}
              onChange={() => handleToggle('bankBalance')}
              isSensitive={true}
            />
          </div>
        </div>

        {/* Category 5: Notices & Emergency Announcements */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৫. নোটিশ বোর্ড ও জরুরি ঘোষণা</h2>
              <p className="text-[11px] text-slate-500">পাবলিক নোটিশ ও স্ক্রোলিং ঘোষণা</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="notices"
              label="পাবলিক নোটিশ বোর্ড"
              desc="শুধুমাত্র 'পাবলিক' হিসেবে চিহ্নিত নোটিশগুলো প্রদর্শন"
              checked={settings.notices}
              onChange={() => handleToggle('notices')}
            />
            <ToggleRow
              id="emergencyNotice"
              label="জরুরি নোটিশ ও লাইভ টিকার ব্যানার"
              desc="জরুরি নোটিশ থাকলে পোর্টালে শীর্ষ স্ক্রোলিং টিকার প্রদর্শন"
              checked={settings.emergencyNotice}
              onChange={() => handleToggle('emergencyNotice')}
            />
            <ToggleRow
              id="noticeDate"
              label="নোটিশ প্রকাশের তারিখ"
              desc="নোটিশ কার্ডে প্রকাশের তারিখ উল্লেখ করা"
              checked={settings.noticeDate}
              onChange={() => handleToggle('noticeDate')}
            />
          </div>
        </div>

        {/* Category 6: Action Plan & Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৬. কর্মপরিকল্পনা ও উন্নয়ন প্রকল্প</h2>
              <p className="text-[11px] text-slate-500">মসজিদের উন্নয়নমূলক কাজের অগ্রগতি</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="projects"
              label="চলমান উন্নয়ন কর্মপরিকল্পনা ও প্রকল্পসমূহ"
              desc="যেমন: এসি স্থাপন, ওজুখনা বর্ধিতকরণ, মিনার সংস্কার ইত্যাদি"
              checked={settings.projects}
              onChange={() => handleToggle('projects')}
            />
            <ToggleRow
              id="projectProgress"
              label="প্রকল্পের সমাপ্তি শতকরা হার (Progress %)"
              desc="প্রকল্পের কাজ কত শতাংশ সম্পন্ন হয়েছে তার অগ্রগতি বার"
              checked={settings.projectProgress}
              onChange={() => handleToggle('projectProgress')}
            />
            <ToggleRow
              id="projectBudget"
              label="অনুমোদিত বাজেট ও ব্যয়কৃত অর্থ"
              desc="প্রকল্পের আনুমানিক বাজেট ও বর্তমান খরচের পরিমাণ"
              checked={settings.projectBudget}
              onChange={() => handleToggle('projectBudget')}
              isSensitive={true}
            />
          </div>
        </div>

        {/* Category 7: Waqf Property & Assets Summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৭. ওয়াকফ সম্পত্তি সারসংক্ষেপ</h2>
              <p className="text-[11px] text-slate-500">মসজিদ ওয়াকফভুক্ত জমি ও মার্কেটের বিবরণ</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="waqfSummary"
              label="ওয়াকফ সম্পত্তির সংক্ষিপ্ত তালিকা"
              desc="জমি/দোকানের নাম, অবস্থান ও স্ট্যাটাস (ভাড়াটিয়ার ব্যক্তিগত তথ্য সুরক্ষিত থাকে)"
              checked={settings.waqfSummary}
              onChange={() => handleToggle('waqfSummary')}
            />
          </div>
        </div>

        {/* Category 8: Committee & Staff */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৮. পরিচালনা কমিটি ও ইমাম-স্টাফ</h2>
              <p className="text-[11px] text-slate-500">নেতৃত্ব ও ধর্মীয় কর্মীদের পরিচিতি</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="committee"
              label="বর্তমান পরিচালনা কমিটির সদস্য তালিকা"
              desc="সভাপতি, সেক্রেটারি, কোষাধ্যক্ষ ও সদস্যদের নাম ও পদবি"
              checked={settings.committee}
              onChange={() => handleToggle('committee')}
            />
            <ToggleRow
              id="subCommittee"
              label="উপ-কমিটিসমূহের তালিকা (Sub-Committees)"
              desc="উন্নয়ন, অর্থ বা শৃঙ্খলা উপ-কমিটির বিবরণ"
              checked={settings.subCommittee}
              onChange={() => handleToggle('subCommittee')}
            />
            <ToggleRow
              id="staff"
              label="ইমাম, খতিব ও মুয়াজ্জিন পরিচিতি"
              desc="মসজিদের ধর্মীয় দায়িত্বপ্রাপ্ত আলেম ও স্টাফদের পদবি (বেতন তথ্য সম্পূর্ণ সুরক্ষিত)"
              checked={settings.staff}
              onChange={() => handleToggle('staff')}
            />
          </div>
        </div>

        {/* Category 9: Cemetery Facilities */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">৯. কবরস্থান ও সাধারণ সেবা</h2>
              <p className="text-[11px] text-slate-500">কবরস্থান সংক্রান্ত সাধারণ নিয়মাবলী</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <ToggleRow
              id="cemetery"
              label="কবরস্থান সেবার তথ্য ও নিয়মাবলী"
              desc="প্লট সংখ্যা, সাধারণ নীতিমালা ও যোগাযোগের ব্যক্তির তথ্য"
              checked={settings.cemetery}
              onChange={() => handleToggle('cemetery')}
            />
          </div>
        </div>

        {/* Category 10: Display & TV Settings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">১০. বড় স্ক্রিন / টিভি ডিসপ্লে মোড</h2>
              <p className="text-[11px] text-slate-500">মসজিদের ডিজিটাল ডিসপ্লে বোর্ডের থিম ও সময়</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ডিফল্ট টিভি স্ক্রিন থিম (TV Display Theme)
              </label>
              <select
                id="select-display-theme"
                disabled={!canEdit}
                value={settings.displayModeTheme || 'EMERALD_NIGHT'}
                onChange={(e) => handleSelectChange('displayModeTheme', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-600"
              >
                <option value="EMERALD_NIGHT">এমেরাল্ড নাইট (গাঢ় সবুজ ও সোনালী - ইসলামিক লুক)</option>
                <option value="DARK">স্লিট ডার্ক (উচ্চ কনট্রাস্ট ও আধুনিক লুক)</option>
                <option value="LIGHT">ক্লিন লাইট (পরিষ্কার সাদা ও নীল)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                অটো-রিফ্রেশ বিরতি (Auto Sync Interval)
              </label>
              <select
                id="select-refresh-interval"
                disabled={!canEdit}
                value={settings.autoRefreshInterval || 45}
                onChange={(e) => handleSelectChange('autoRefreshInterval', Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-600"
              >
                <option value={30}>৩০ সেকেন্ড পরপর লাইভ রিফ্রেশ</option>
                <option value={45}>৪৫ সেকেন্ড পরপর (প্রস্তাবিত)</option>
                <option value={60}>১ মিনিট পরপর</option>
                <option value={120}>২ মিনিট পরপর</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span>
            সর্বশেষ আপডেট: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString('bn-BD') : 'ডিফল্ট'} •{' '}
            ব্যবহারকারী: {settings.updatedBy || 'অ্যাডমিন'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          SECURE_SETTINGS_HASH: {currentMosque?.id || 'mosque-001'}
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {confirmResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">নিরাপদ ডিফল্টে রিসেট করতে চান?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                এটি সব দৃশ্যমানতা সেটিংসকে সিস্টেমের স্ট্যান্ডার্ড নিরাপদ ডিফল্টে ফেরত নেবে। সংবেদনশীল তহবিল তথ্য বন্ধ থাকবে।
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-xs"
              >
                হ্যাঁ, রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Admin Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col p-2 sm:p-6">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Modal Header & Device Selector */}
            <div className="p-3.5 sm:px-6 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold">পাবলিক পোর্টাল লাইভ প্রিভিউ (Admin Preview)</span>
                </div>
                <span className="hidden sm:inline-block text-[11px] bg-blue-900/60 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-700/50">
                  বর্তমান সেটিংসের প্রতিফলন
                </span>
              </div>

              {/* Device switcher */}
              <div className="flex items-center space-x-2">
                <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center space-x-1">
                  <button
                    onClick={() => setPreviewDevice('DESKTOP')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      previewDevice === 'DESKTOP' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">ডেস্কটপ</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('MOBILE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      previewDevice === 'MOBILE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">মোবাইল</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('TV')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                      previewDevice === 'TV' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">টিভি ডিসপ্লে</span>
                  </button>
                </div>

                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 overflow-y-auto bg-slate-900/50 p-4 sm:p-8 flex justify-center">
              <div
                className={`transition-all duration-300 w-full ${
                  previewDevice === 'MOBILE'
                    ? 'max-w-sm bg-white rounded-3xl border-8 border-slate-800 shadow-2xl overflow-y-auto p-4 text-slate-900'
                    : previewDevice === 'TV'
                    ? 'max-w-6xl'
                    : 'max-w-6xl'
                }`}
              >
                <PublicPortalView
                  mosque={currentMosque}
                  accounts={[]}
                  notices={[]}
                  language={language}
                  previewSettings={settings}
                  forcedDisplayMode={previewDevice === 'TV'}
                  onDonate={async (data) => {
                    return {} as any;
                  }}
                  onPrintReceipt={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

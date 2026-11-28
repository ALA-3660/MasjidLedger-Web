import React, { useState, useEffect } from 'react';
import {
  Globe,
  Building,
  Users,
  TrendingUp,
  Activity,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  Building2,
  X,
  Megaphone,
  Server,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  KeyRound,
  Sparkles,
  Cpu,
  Save,
  RotateCcw,
  Zap,
  Loader2,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { Language, translations } from '../lib/i18n';
import {
  sanitizeGeminiModelName,
  isValidGeminiModelName,
  RECOMMENDED_AI_MODELS,
  DEFAULT_GEMINI_MODEL,
} from '../config/aiConfig';

interface SaasAdminHubViewProps {
  currentUser: any;
  currentMosque: any;
  language?: Language;
  onSwitchMosqueContext?: (mosqueId: string) => void;
}

export const SaasAdminHubView: React.FC<SaasAdminHubViewProps> = ({
  currentUser,
  currentMosque,
  language = 'bn',
  onSwitchMosqueContext,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [mosques, setMosques] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'mosques' | 'broadcast' | 'aiSettings'>('mosques');

  // Central AI Model Settings State
  const [aiSettings, setAiSettings] = useState<any | null>(null);
  const [aiModelInput, setAiModelInput] = useState<string>('');
  const [aiModelNotes, setAiModelNotes] = useState<string>('');
  const [isRefreshingAiSettings, setIsRefreshingAiSettings] = useState<boolean>(false);
  const [isSavingAiModel, setIsSavingAiModel] = useState<boolean>(false);
  const [isTestingAiModel, setIsTestingAiModel] = useState<boolean>(false);
  const [aiSaveFeedback, setAiSaveFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    modelName?: string;
  } | null>(null);
  const [aiTestResult, setAiTestResult] = useState<{
    type: 'success' | 'error';
    modelName: string;
    statusLabelBn: string;
    text: string;
    latencyMs?: number;
    preview?: string;
  } | null>(null);

  // Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [broadcastTitle, setBroadcastTitle] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastPriority, setBroadcastPriority] = useState<string>('HIGH');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState<boolean>(false);

  // Status Change Modal State
  const [selectedMosqueForStatus, setSelectedMosqueForStatus] = useState<any | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);

  // Password Reset Modal State
  const [selectedMosqueForPasswordReset, setSelectedMosqueForPasswordReset] = useState<any | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState<string>('');
  const [passwordResetError, setPasswordResetError] = useState<string>('');
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState<boolean>(false);
  const [resetSuccessInfo, setResetSuccessInfo] = useState<any | null>(null);

  const handleResetMosquePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMosqueForPasswordReset) return;

    if (!newAdminPassword || newAdminPassword.trim().length < 4) {
      setPasswordResetError('নতুন পাসওয়ার্ড প্রদান করুন (ন্যূনতম ৪ অক্ষর)।');
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordResetError('নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড হুবহু মিলছে না।');
      return;
    }

    setIsSubmittingPasswordReset(true);
    setPasswordResetError('');
    try {
      const res = await api.resetMosquePassword(selectedMosqueForPasswordReset.id, newAdminPassword.trim());
      setResetSuccessInfo(res);
      setNotificationMsg({
        type: 'success',
        text: `"${selectedMosqueForPasswordReset.nameBn || selectedMosqueForPasswordReset.name}" মসজিদের অ্যাডমিনের পাসওয়ার্ড রিসেট সফল হয়েছে।`,
      });
      await loadData();
    } catch (err: any) {
      setPasswordResetError(err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmittingPasswordReset(false);
    }
  };

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, mosquesRes, broadcastsRes] = await Promise.all([
        api.getSaasStats().catch(() => null),
        api.getSaasMosques().catch(() => []),
        api.getSaasBroadcasts().catch(() => []),
      ]);
      if (statsRes) setStats(statsRes);
      if (mosquesRes) setMosques(mosquesRes);
      if (broadcastsRes) setBroadcasts(broadcastsRes);

      try {
        const aiSettingsRes = await api.getSaasAiSettings();
        setAiSettings(aiSettingsRes);
        const authoritativeModel = sanitizeGeminiModelName(
          aiSettingsRes.overrideModel || aiSettingsRes.activeModel || ''
        );
        setAiModelInput(authoritativeModel);
        setAiModelNotes(aiSettingsRes.notes || '');
      } catch (aiErr: any) {
        setAiSaveFeedback({
          type: 'error',
          text: aiErr?.message || 'সেন্ট্রাল AI মডেল স্ট্যাটাস লোড করতে ব্যর্থ হয়েছে।',
        });
      }
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAiSettings = async () => {
    setIsRefreshingAiSettings(true);
    setAiSaveFeedback(null);
    try {
      const aiSettingsRes = await api.getSaasAiSettings();
      setAiSettings(aiSettingsRes);
      const authoritativeModel = sanitizeGeminiModelName(
        aiSettingsRes.overrideModel || aiSettingsRes.activeModel || ''
      );
      setAiModelInput(authoritativeModel);
      setAiModelNotes(aiSettingsRes.notes || '');
      setStats((prev: any) =>
        prev ? { ...prev, activeAiModel: aiSettingsRes.activeModel } : prev
      );
    } catch (err: any) {
      const msg = err?.message || 'AI মডেল স্ট্যাটাস রিফ্রেশ করতে ব্যর্থ হয়েছে।';
      setAiSaveFeedback({ type: 'error', text: msg });
      setNotificationMsg({ type: 'error', text: msg });
    } finally {
      setIsRefreshingAiSettings(false);
    }
  };

  const handleSaveAiModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = sanitizeGeminiModelName(aiModelInput);
    if (!normalized) {
      const msg = 'অনুগ্রহ করে একটি বৈধ Gemini মডেলের নাম লিখুন (যেমন: gemini-4-hydrogen)।';
      setAiSaveFeedback({ type: 'error', text: msg });
      setNotificationMsg({ type: 'error', text: msg });
      return;
    }
    if (!isValidGeminiModelName(normalized)) {
      const msg =
        'মডেলের নাম সঠিক নয়। শুধুমাত্র ইংরেজি অক্ষর, সংখ্যা (0-9), ডট, ড্যাশ বা আন্ডারস্কোর ব্যবহার করুন (যেমন: gemini-4-hydrogen বা gemini-3.1-flash-lite)।';
      setAiSaveFeedback({ type: 'error', text: msg });
      setNotificationMsg({ type: 'error', text: msg });
      return;
    }

    setAiModelInput(normalized);
    setIsSavingAiModel(true);
    setAiSaveFeedback(null);
    setAiTestResult(null);
    try {
      const res = await api.updateSaasAiSettings({
        modelName: normalized,
        notes: aiModelNotes.trim(),
      });
      if (res.data) {
        setAiSettings(res.data);
        const savedModel = sanitizeGeminiModelName(
          res.data.overrideModel || res.data.activeModel || normalized
        );
        setAiModelInput(savedModel);
        setAiModelNotes(res.data.notes || '');
        setStats((prev: any) => (prev ? { ...prev, activeAiModel: res.data.activeModel } : prev));
        const successText =
          res.message || `সেন্ট্রাল AI মডেল "${savedModel}" স্থায়ীভাবে সংরক্ষণ করা হয়েছে।`;
        setAiSaveFeedback({ type: 'success', text: successText, modelName: savedModel });
        setNotificationMsg({ type: 'success', text: successText });
      }
    } catch (err: any) {
      const errorText = err?.message || 'AI মডেল সেভ করতে সমস্যা হয়েছে।';
      setAiSaveFeedback({ type: 'error', text: errorText });
      setNotificationMsg({ type: 'error', text: errorText });
    } finally {
      setIsSavingAiModel(false);
    }
  };

  const handleResetAiModelToDefault = async () => {
    setIsSavingAiModel(true);
    setAiSaveFeedback(null);
    setAiTestResult(null);
    try {
      const res = await api.updateSaasAiSettings({ modelName: '', notes: '' });
      if (res.data) {
        setAiSettings(res.data);
        const resolvedModel = sanitizeGeminiModelName(res.data.activeModel || DEFAULT_GEMINI_MODEL);
        setAiModelInput(resolvedModel);
        setAiModelNotes('');
        setStats((prev: any) => (prev ? { ...prev, activeAiModel: res.data.activeModel } : prev));
        const msg = res.message || `AI মডেল ডিফল্ট কনফিগারেশনে (${resolvedModel}) রিসেট করা হয়েছে।`;
        setAiSaveFeedback({ type: 'success', text: msg, modelName: resolvedModel });
        setNotificationMsg({ type: 'success', text: msg });
      }
    } catch (err: any) {
      const errorText = err?.message || 'ডিফল্টে রিসেট করতে সমস্যা হয়েছে।';
      setAiSaveFeedback({ type: 'error', text: errorText });
      setNotificationMsg({ type: 'error', text: errorText });
    } finally {
      setIsSavingAiModel(false);
    }
  };

  const handleTestAiModel = async (overrideCandidate?: string) => {
    const candidate = sanitizeGeminiModelName(overrideCandidate ?? aiModelInput);
    if (!candidate) {
      setAiTestResult({
        type: 'error',
        modelName: aiSettings?.activeModel || DEFAULT_GEMINI_MODEL,
        statusLabelBn: 'সংযোগ ব্যর্থ',
        text: 'সংযোগ পরীক্ষার জন্য অনুগ্রহ করে একটি বৈধ Gemini মডেলের নাম নির্বাচন করুন বা লিখুন।',
      });
      return;
    }
    if (!isValidGeminiModelName(candidate)) {
      setAiTestResult({
        type: 'error',
        modelName: candidate,
        statusLabelBn: 'অবৈধ মডেল আইডি',
        text: 'মডেলের নাম সঠিক ফরম্যাটে নয়। শুধুমাত্র ইংরেজি অক্ষর ও সংখ্যা ব্যবহার করুন (যেমন: gemini-4-hydrogen)।',
      });
      return;
    }

    setAiModelInput(candidate);
    setIsTestingAiModel(true);
    setAiTestResult(null);
    try {
      const res = await api.testSaasAiModel(candidate);
      const testedModel = sanitizeGeminiModelName(res.modelName) || candidate;
      const ms = typeof res.responseTimeMs === 'number' ? res.responseTimeMs : res.latencyMs;
      setAiTestResult({
        type: 'success',
        modelName: testedModel,
        statusLabelBn: res.statusLabelBn || 'সংযোগ সফল',
        text: `মডেলটি সক্রিয়ভাবে সাড়া দিয়েছে এবং ব্যবহারের জন্য প্রস্তুত।`,
        latencyMs: ms,
        preview: res.replyPreviewBn,
      });
    } catch (err: any) {
      setAiTestResult({
        type: 'error',
        modelName: candidate,
        statusLabelBn: 'সংযোগ ব্যর্থ',
        text: err?.message || 'মডেল সংযোগ পরীক্ষা ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsTestingAiModel(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setIsSubmittingBroadcast(true);
    try {
      await api.sendSaasBroadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        priority: broadcastPriority,
        isEmergency,
      });
      setNotificationMsg({ type: 'success', text: 'সেন্ট্রাল সিস্টেম মেসেজ সকল মসজিদে পাঠানো হয়েছে।' });
      setBroadcastTitle('');
      setBroadcastMessage('');
      setIsBroadcastModalOpen(false);
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'ব্রডকাস্ট পাঠাতে সমস্যা হয়েছে।' });
    } finally {
      setIsSubmittingBroadcast(false);
    }
  };

  const handleUpdateMosqueStatus = async (newStatus: string) => {
    if (!selectedMosqueForStatus) return;
    setIsSubmittingStatus(true);
    try {
      await api.updateSaasMosqueStatus(selectedMosqueForStatus.id, newStatus, statusReason);
      setNotificationMsg({
        type: 'success',
        text: `${selectedMosqueForStatus.nameBn || selectedMosqueForStatus.name} এর স্ট্যাটাস ${newStatus} করা হয়েছে।`,
      });
      setSelectedMosqueForStatus(null);
      setStatusReason('');
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।' });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ব্রডকাস্ট বার্তাটি মুছে ফেলতে চান?')) return;
    try {
      await api.deleteSaasBroadcast(id);
      setNotificationMsg({ type: 'success', text: 'ব্রডকাস্ট মুছে ফেলা হয়েছে।' });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: 'ব্রডকাস্ট মোছা সম্ভব হয়নি।' });
    }
  };

  const filteredMosques = mosques.filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nameBn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm) ||
      m.adminName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || m.status === statusFilter || (!m.status && statusFilter === 'ACTIVE');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
              <Globe className="w-3.5 h-3.5" />
              <span>Enterprise SaaS Super Admin Control Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>সেন্ট্রাল প্ল্যাটফর্ম সুপার অ্যাডমিন ড্যাশবোর্ড</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              শত শত নিবন্ধিত মসজিদ, টেন্যান্ট হেলথ, আর্থিক পরিসংখ্যান এবং সেন্ট্রাল সিস্টেম ব্রডকাস্ট নিয়ন্ত্রণ করুন
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-600 flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ ডাটা</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/50 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>সেন্ট্রাল ব্রডকাস্ট পাঠান</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {notificationMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global SaaS Platform Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Mosques */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">নিবন্ধিত মসজিদ</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats?.totalMosques || mosques.length || 0}</div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-bold">● {stats?.activeMosques || 0} সচল</span>
              <span>|</span>
              <span className="text-rose-600 font-bold">● {stats?.suspendedMosques || 0} স্থগিত</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">প্ল্যাটফর্ম ইউজার</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats?.totalUsers || 0} জন</div>
            <div className="text-[11px] text-slate-500 mt-1">সুপার এডমিন, একাউন্টেন্ট ও ব্যবহারকারী</div>
          </div>
        </div>

        {/* Card 3: Total Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">মোট লেনদেন ভলিউম</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ৳ {(stats?.totalIncomes || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              মোট {stats?.totalTransactions || 0} টি ডিজিটাল লেনদেন
            </div>
          </div>
        </div>

        {/* Card 4: System Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">সিস্টেম স্ট্যাটাস</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-teal-700 flex items-center space-x-1.5">
              <Activity className="w-5 h-5 text-teal-500 animate-pulse" />
              <span>{stats?.systemHealth || 'OPTIMAL'}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              ভার্সন: {stats?.version || '2.6.0-SaaS'}
            </div>
            {(aiSettings?.activeModel || stats?.activeAiModel) && (
              <div
                data-no-bn-digits="true"
                dir="ltr"
                className="text-[11px] text-indigo-700 mt-0.5 font-mono font-semibold truncate"
              >
                AI: {sanitizeGeminiModelName(aiSettings?.activeModel || stats?.activeAiModel)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('mosques')}
          className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'mosques'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>নিবন্ধিত মসজিদ ডিরেক্টরি ({filteredMosques.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'broadcast'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>সেন্ট্রাল ব্রডকাস্ট হাব ({broadcasts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aiSettings')}
          className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'aiSettings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI মডেল সেটিংস</span>
          {(aiSettings?.activeModel || stats?.activeAiModel) && (
            <span
              data-no-bn-digits="true"
              dir="ltr"
              className="ml-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px]"
            >
              {sanitizeGeminiModelName(aiSettings?.activeModel || stats?.activeAiModel)}
            </span>
          )}
        </button>
      </div>

      {/* ==================== TAB 1: MOSQUE DIRECTORY ==================== */}
      {activeTab === 'mosques' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="মসজিদের নাম, কোড বা ফোন খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="SUSPENDED">স্থগিত (Suspended)</option>
                <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Mosque Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3">মসজিদের নাম ও কোড</th>
                  <th className="p-3">ঠিকানা</th>
                  <th className="p-3">সুপার অ্যাডমিন</th>
                  <th className="p-3 text-center">ইউজার</th>
                  <th className="p-3 text-center">লেনদেন</th>
                  <th className="p-3 text-right">ব্যালেন্স ভলিউম</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMosques.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      কোনো মসজিদ পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredMosques.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{m.nameBn || m.name}</div>
                        <div className="text-[11px] text-indigo-600 font-mono font-bold mt-0.5">{m.code}</div>
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{m.address || 'ঢাকা, বাংলাদেশ'}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{m.adminName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.adminPhone}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{m.userCount} জন</td>
                      <td className="p-3 text-center font-bold text-slate-700">{m.transactionCount} টি</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        ৳ {(m.incomeTotal || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                            m.status === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : m.status === 'INACTIVE'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{m.status || 'ACTIVE'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMosqueForPasswordReset(m);
                              setNewAdminPassword('');
                              setConfirmAdminPassword('');
                              setPasswordResetError('');
                              setResetSuccessInfo(null);
                            }}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                            title="অ্যাডমিন পাসওয়ার্ড রিসেট করুন"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>পাসওয়ার্ড</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedMosqueForStatus(m)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                            title="স্ট্যাটাস পরিবর্তন করুন"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                            <span>স্ট্যাটাস</span>
                          </button>

                          {onSwitchMosqueContext && (
                            <button
                              type="button"
                              onClick={() => onSwitchMosqueContext(m.id)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                              title="এই মসজিদের ভিউতে যান"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ইন্সপেক্ট</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CENTRAL BROADCAST HUB ==================== */}
      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Radio className="w-5 h-5 text-indigo-600" />
                <span>সেন্ট্রাল সিস্টেম ব্রডকাস্ট মেসেজসমূহ</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                প্ল্যাটফর্ম থেকে সকল মসজিদের ড্যাশবোর্ডে প্রেরিত সিস্টেম মেসেজ
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>নতুন ব্রডকাস্ট লিখুন</span>
            </button>
          </div>

          <div className="space-y-4">
            {broadcasts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                এখনো কোনো ব্রডকাস্ট পাঠানো হয়নি।
              </div>
            ) : (
              broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{b.titleBn || b.title}</span>
                      {b.isEmergency && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold">
                          জরুরি অ্যালার্ট
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{b.descriptionBn || b.description}</p>
                    <div className="text-[11px] text-slate-400 font-mono">
                      তারিখ: {b.publishDate} | প্রেরক: {b.createdByName || 'সিস্টেম সুপার অ্যাডমিন'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBroadcast(b.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="ব্রডকাস্ট মুছুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CENTRAL AI MODEL SETTINGS ==================== */}
      {activeTab === 'aiSettings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-siliguri">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <span>সেন্ট্রাল AI মডেল সেটিংস (Central AI Configuration)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-tiro">
                সফটওয়্যারের সকল AI ফিচার (অডিটর, চ্যাট, স্মার্ট এন্ট্রি, কমিটি, চুক্তিপত্র, আয়-ব্যয় বিশ্লেষণ, ডাটা মাইগ্রেশন) এখান থেকে নির্ধারিত একটি সেন্ট্রাল মডেল ব্যবহার করে।
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshAiSettings}
              disabled={isRefreshingAiSettings}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAiSettings || isLoading ? 'animate-spin' : ''}`} />
              <span>{isRefreshingAiSettings ? 'রিফ্রেশ হচ্ছে...' : 'স্ট্যাটাস রিফ্রেশ'}</span>
            </button>
          </div>

          {/* Current Active Model Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 via-white to-emerald-50/60 border border-indigo-200/80 rounded-2xl p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  বর্তমান সক্রিয় AI মডেল
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    aiSettings?.source === 'SUPER_ADMIN_OVERRIDE'
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {aiSettings?.sourceLabelBn || 'সিস্টেম ডিফল্ট'}
                </span>
              </div>

              <div
                data-no-bn-digits="true"
                dir="ltr"
                className="text-2xl font-black font-mono text-slate-900 tracking-tight break-all"
              >
                {sanitizeGeminiModelName(aiSettings?.activeModel || stats?.activeAiModel) || DEFAULT_GEMINI_MODEL}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1">
                <span>
                  সুপার অ্যাডমিন সেভকৃত মডেল:{' '}
                  <strong data-no-bn-digits="true" dir="ltr" className="font-mono text-indigo-800">
                    {aiSettings?.overrideModel ? sanitizeGeminiModelName(aiSettings.overrideModel) : 'সেভ করা নেই'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  এনভায়রনমেন্ট ভেরিয়েবল (<code className="font-mono text-indigo-700">GEMINI_MODEL</code> / <code className="font-mono text-indigo-700">VITE_GEMINI_MODEL</code>):{' '}
                  <strong data-no-bn-digits="true" dir="ltr" className="font-mono text-slate-800">
                    {aiSettings?.envModel ? sanitizeGeminiModelName(aiSettings.envModel) : 'সেট করা নেই'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  সিস্টেম ডিফল্ট:{' '}
                  <strong data-no-bn-digits="true" dir="ltr" className="font-mono text-slate-800">
                    {sanitizeGeminiModelName(aiSettings?.defaultModel) || DEFAULT_GEMINI_MODEL}
                  </strong>
                </span>
              </div>

              {aiSettings?.updatedAt && (
                <div className="text-[11px] text-slate-500 pt-1.5 border-t border-indigo-100">
                  সর্বশেষ আপডেট: <strong>{new Date(aiSettings.updatedAt).toLocaleString('bn-BD')}</strong>
                  {aiSettings.updatedByName ? ` — ${aiSettings.updatedByName}` : ''}
                  {aiSettings.notes ? ` (${aiSettings.notes})` : ''}
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-siliguri">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>মডেল লোড হওয়ার অগ্রাধিকার ক্রম</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed font-tiro">
                <li>
                  <strong className="text-slate-800">সুপার অ্যাডমিন সেটিংস</strong> (এই প্যানেল থেকে সেভ করা মডেল — সর্বোচ্চ অগ্রাধিকার)
                </li>
                <li>
                  <strong className="text-slate-800">এনভায়রনমেন্ট ভেরিয়েবল</strong> (<code className="font-mono text-[11px]">GEMINI_MODEL</code> / <code className="font-mono text-[11px]">VITE_GEMINI_MODEL</code>)
                </li>
                <li>
                  <strong className="text-slate-800">সিস্টেম ডিফল্ট</strong> (সেন্ট্রাল <code className="font-mono text-[11px]">aiConfig.ts</code>)
                </li>
              </ol>
            </div>
          </div>

          {/* Model Edit Form */}
          <form onSubmit={handleSaveAiModel} className="space-y-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  নতুন Gemini মডেলের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  spellCheck={false}
                  autoComplete="off"
                  data-no-bn-digits="true"
                  value={aiModelInput}
                  onChange={(e) => {
                    const cleanedLive = e.target.value.replace(/[০-৯٠-٩]/g, (d) =>
                      sanitizeGeminiModelName(d)
                    );
                    setAiModelInput(cleanedLive);
                    setAiSaveFeedback(null);
                    setAiTestResult(null);
                  }}
                  onBlur={() => {
                    const normalized = sanitizeGeminiModelName(aiModelInput);
                    if (normalized !== aiModelInput) {
                      setAiModelInput(normalized);
                    }
                  }}
                  placeholder="যেমন: gemini-4-hydrogen বা gemini-3.1-flash-lite"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 font-tiro">
                  মডেল আইডি সর্বদা শুদ্ধ ASCII অক্ষর ও ইংরেজি সংখ্যায় (<code className="font-mono text-[10px]">0-9</code>) সংরক্ষিত হবে। ভবিষ্যতে গুগল নতুন কোনো মডেল রিলিজ করলে কোড পরিবর্তন না করেই এখানে লিখে সেভ করতে পারবেন।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  পরিবর্তনের নোট / কারণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={aiModelNotes}
                  onChange={(e) => setAiModelNotes(e.target.value)}
                  placeholder="যেমন: সর্বশেষ স্টেবল ফ্ল্যাশ মডেলে আপগ্রেড"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 font-tiro">
                  প্রতিটি পরিবর্তন সিস্টেম অডিট লগে সংরক্ষিত হয়।
                </p>
              </div>
            </div>

            {/* Quick Select Preset Models */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">দ্রুত নির্বাচন (প্রস্তাবিত মডেল তালিকা):</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(aiSettings?.recommendedModels || RECOMMENDED_AI_MODELS).map((opt: any) => {
                  const normalizedOptId = sanitizeGeminiModelName(opt.id);
                  const isSelected = sanitizeGeminiModelName(aiModelInput) === normalizedOptId;
                  return (
                    <button
                      key={normalizedOptId}
                      type="button"
                      onClick={() => {
                        setAiModelInput(normalizedOptId);
                        setAiSaveFeedback(null);
                        setAiTestResult(null);
                      }}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code
                          data-no-bn-digits="true"
                          dir="ltr"
                          className="font-mono text-xs font-extrabold text-slate-900 bg-transparent"
                        >
                          {normalizedOptId}
                        </code>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            opt.recommended
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {opt.badgeBn}
                        </span>
                      </div>
                      <div data-no-bn-digits="true" className="text-[11px] font-bold text-indigo-800">
                        {opt.labelBn}
                      </div>
                      <p data-no-bn-digits="true" className="text-[11px] text-slate-600 leading-relaxed font-tiro">
                        {opt.descriptionBn}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline Save Feedback Banner (Always visible right inside the AI tab) */}
            {aiSaveFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  aiSaveFeedback.type === 'success'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {aiSaveFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold">{aiSaveFeedback.text}</div>
                    {aiSaveFeedback.modelName && (
                      <div className="text-[11px] text-indigo-700">
                        সক্রিয় মডেল আইডি:{' '}
                        <code data-no-bn-digits="true" dir="ltr" className="font-mono font-bold px-1.5 py-0.5 bg-white rounded border border-indigo-200">
                          {aiSaveFeedback.modelName}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiSaveFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Live Connection Test Result */}
            {aiTestResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  aiTestResult.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                  <div className="flex flex-wrap items-center gap-2">
                    {aiTestResult.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        aiTestResult.type === 'success'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {aiTestResult.statusLabelBn}
                    </span>
                    <code
                      data-no-bn-digits="true"
                      dir="ltr"
                      className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900"
                    >
                      {aiTestResult.modelName}
                    </code>
                  </div>
                  {typeof aiTestResult.latencyMs === 'number' && (
                    <span className="font-baloo text-[11px] px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-700 font-bold">
                      রেসপন্স টাইম: {aiTestResult.latencyMs} ms
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed pl-6 font-tiro">{aiTestResult.text}</p>
                {aiTestResult.preview && (
                  <p className="text-[11px] text-emerald-800 pl-6 font-tiro">
                    AI উত্তর: “{aiTestResult.preview}”
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingAiModel || isTestingAiModel || !sanitizeGeminiModelName(aiModelInput)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
                >
                  {isSavingAiModel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingAiModel ? 'সেভ হচ্ছে...' : 'নতুন মডেল সেভ করুন'}</span>
                </button>

                <button
                  type="button"
                  disabled={isTestingAiModel || isSavingAiModel || !sanitizeGeminiModelName(aiModelInput)}
                  onClick={() => handleTestAiModel()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
                >
                  {isTestingAiModel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{isTestingAiModel ? 'সংযোগ পরীক্ষা চলছে...' : 'মডেল সংযোগ পরীক্ষা করুন'}</span>
                </button>
              </div>

              {aiSettings?.overrideModel && (
                <button
                  type="button"
                  disabled={isSavingAiModel || isTestingAiModel}
                  onClick={handleResetAiModelToDefault}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ডিফল্টে রিসেট করুন</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ==================== MODAL: SEND BROADCAST ==================== */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <span>নতুন ব্রডকাস্ট নোটিশ লিখুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নোটিশের শিরোনাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="যেমন: রমাদান উপলক্ষে প্ল্যাটফর্ম আপডেট নোটিশ"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিস্তারিত বার্তা <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="বার্তা বিস্তারিত লিখুন..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>জরুরি সিস্টেম অ্যালার্ট (Emergency)</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBroadcast}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingBroadcast ? 'পাঠানো হচ্ছে...' : 'সকল মসজিদে ব্রডকাস্ট পাঠান'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: STATUS UPDATE ==================== */}
      {selectedMosqueForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>মসজিদ স্ট্যাটাস পরিবর্তন</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedMosqueForStatus(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {selectedMosqueForStatus.nameBn || selectedMosqueForStatus.name}
              </p>
              <p>বর্তমান স্ট্যাটাস: <strong className="text-indigo-600">{selectedMosqueForStatus.status || 'ACTIVE'}</strong></p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                পরিবর্তনের কারণ (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="যেমন: নিয়ম লংঘন বা এডমিন অনুমোদন স্থগিত"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={() => handleUpdateMosqueStatus('ACTIVE')}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Unlock className="w-4 h-4" />
                <span>সক্রিয় করুন (ACTIVE)</span>
              </button>

              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={() => handleUpdateMosqueStatus('SUSPENDED')}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>স্থগিত করুন (SUSPEND)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: SUPER ADMIN PASSWORD RESET ==================== */}
      {selectedMosqueForPasswordReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>সুপার অ্যাডমিন পাসওয়ার্ড রিসেট</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedMosqueForPasswordReset(null);
                  setResetSuccessInfo(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="font-bold text-slate-900 text-sm">
                {selectedMosqueForPasswordReset.nameBn || selectedMosqueForPasswordReset.name}
              </p>
              <p>অ্যাডমিন নাম: <strong className="text-slate-800">{selectedMosqueForPasswordReset.adminName}</strong></p>
              <p>মোবাইল নম্বর: <strong className="text-indigo-600 font-mono">{selectedMosqueForPasswordReset.adminPhone || selectedMosqueForPasswordReset.phone}</strong></p>
            </div>

            {resetSuccessInfo ? (
              <div className="space-y-4 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100 font-mono text-xs text-slate-800 space-y-1">
                  <div>নতুন পাসওয়ার্ড: <strong className="text-emerald-700 text-sm">{resetSuccessInfo.newPassword}</strong></div>
                  <div className="text-[11px] text-slate-500">এই পাসওয়ার্ড দিয়ে এখন উক্ত মসজিদ অ্যাডমিন লগইন করতে পারবেন।</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMosqueForPasswordReset(null);
                    setResetSuccessInfo(null);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetMosquePassword} className="space-y-4">
                {passwordResetError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{passwordResetError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    নতুন পাসওয়ার্ড নির্ধারণ করুন (ন্যূনতম ৪ অক্ষর) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="নতুন পাসওয়ার্ড লিখুন"
                    required
                    minLength={4}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                    required
                    minLength={4}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 outline-hidden ${
                      confirmAdminPassword && newAdminPassword === confirmAdminPassword
                        ? 'border-emerald-500 focus:ring-emerald-500'
                        : confirmAdminPassword && newAdminPassword !== confirmAdminPassword
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200 focus:ring-amber-500'
                    }`}
                  />
                  {confirmAdminPassword.length > 0 && (
                    <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] font-semibold">
                      {newAdminPassword === confirmAdminPassword ? (
                        <span className="text-emerald-600 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>✓ পাসওয়ার্ড দুটি হুবহু মিলেছে</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>✕ পাসওয়ার্ড দুটি মিলছে না</span>
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">সুপার অ্যাডমিন হিসেবে আপনি এই পাসওয়ার্ড সরাসরি সেট করে দিচ্ছেন।</p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMosqueForPasswordReset(null);
                      setPasswordResetError('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPasswordReset || !newAdminPassword || newAdminPassword !== confirmAdminPassword}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isSubmittingPasswordReset ? 'রিসেট হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
} from 'lucide-react';
import { api } from '../lib/api';
import { Language, translations } from '../lib/i18n';

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
  const [activeTab, setActiveTab] = useState<'mosques' | 'broadcast' | 'audit'>('mosques');

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
  const [newAdminPassword, setNewAdminPassword] = useState<string>('admin123');
  const [isSubmittingPasswordReset, setIsSubmittingPasswordReset] = useState<boolean>(false);
  const [resetSuccessInfo, setResetSuccessInfo] = useState<any | null>(null);

  const handleResetMosquePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMosqueForPasswordReset) return;

    setIsSubmittingPasswordReset(true);
    try {
      const res = await api.resetMosquePassword(selectedMosqueForPasswordReset.id, newAdminPassword);
      setResetSuccessInfo(res);
      setNotificationMsg({
        type: 'success',
        text: `"${selectedMosqueForPasswordReset.nameBn || selectedMosqueForPasswordReset.name}" মসজিদের অ্যাডমিনের পাসওয়ার্ড রিসেট সফল হয়েছে।`,
      });
      await loadData();
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।' });
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
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।' });
    } finally {
      setIsLoading(false);
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
                              setNewAdminPassword('admin123');
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    নতুন পাসওয়ার্ড নির্ধারণ করুন (ন্যূনতম ৪ অক্ষর)
                  </label>
                  <input
                    type="text"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="যেমন: admin123"
                    required
                    minLength={4}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">সুপার অ্যাডমিন হিসেবে আপনি এই পাসওয়ার্ড সরাসরি সেট করে দিচ্ছেন।</p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedMosqueForPasswordReset(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPasswordReset}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
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

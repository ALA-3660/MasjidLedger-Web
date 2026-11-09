import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Settings,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Users,
  Search,
  Filter,
  Trash2,
  Sparkles,
  Smartphone,
  MessageCircle,
  FileText,
  UserCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { SmsLog } from '../types';
import { Language, translations } from '../lib/i18n';

interface SmsGatewayViewProps {
  currentMosque: any;
  currentUser: any;
  members?: any[];
  staff?: any[];
  language?: Language;
}

export const SmsGatewayView: React.FC<SmsGatewayViewProps> = ({
  currentMosque,
  currentUser,
  members = [],
  staff = [],
  language = 'bn',
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'settings' | 'logs'>('send');
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Send SMS Form State
  const [recipientType, setRecipientType] = useState<'SINGLE' | 'COMMITTEE' | 'STAFF' | 'DONORS'>('SINGLE');
  const [singlePhone, setSinglePhone] = useState<string>('');
  const [singleName, setSingleName] = useState<string>('');
  const [templateType, setTemplateType] = useState<string>('CUSTOM');
  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Settings State
  const [provider, setProvider] = useState<string>('Qolek SMS');
  const [apiKey, setApiKey] = useState<string>('gw_live_89a24d7f9');
  const [senderId, setSenderId] = useState<string>('MASJID');
  const [autoDonationSms, setAutoDonationSms] = useState<boolean>(true);
  const [autoSalarySms, setAutoSalarySms] = useState<boolean>(true);
  const [autoFeeSms, setAutoFeeSms] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logSearchTerm, setLogSearchTerm] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        api.getSmsSettings().catch(() => null),
        api.getSmsLogs().catch(() => []),
      ]);
      if (settingsRes) {
        setSettings(settingsRes);
        setProvider(settingsRes.provider || 'Qolek SMS');
        setApiKey(settingsRes.apiKey || 'gw_live_89a24d7f9');
        setSenderId(settingsRes.senderId || 'MASJID');
        setAutoDonationSms(!!settingsRes.autoDonationSms);
        setAutoSalarySms(!!settingsRes.autoSalarySms);
        setAutoFeeSms(!!settingsRes.autoFeeSms);
      }
      if (logsRes) setLogs(logsRes);
    } catch (err: any) {
      setNotification({ type: 'error', text: 'এসএমএস তথ্য লোড করতে ব্যর্থ হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTemplateChange = (tmpl: string) => {
    setTemplateType(tmpl);
    const msqName = currentMosque?.nameBn || currentMosque?.name || 'বায়তুল মোকাররম মসজিদ';

    switch (tmpl) {
      case 'DONATION':
        setMessageText(`${msqName}: মহোদয়/মহোদয়া, আপনার মূল্যবান দান জমার রসিদ নং #V-2026/01 গ্রহণ করা হয়েছে। শুকরিয়া।`);
        break;
      case 'MAKTAB_FEE':
        setMessageText(`${msqName} মক্তব: অভিভাবক মহোদয়, আপনার সন্তানের চলতি মাসের বকেয়া ফি ৩০০ টাকা পরিশোধের বিনীত অনুরোধ।`);
        break;
      case 'STAFF_SALARY':
        setMessageText(`${msqName}: আপনার চলতি মাসের সম্মাননা/বেতন ১২,০০০ টাকা একাউন্টে পরিশোধ করা হয়েছে।`);
        break;
      case 'MEETING_NOTICE':
        setMessageText(`${msqName} কমিটি: সুধী সদস্য, আগামী শুক্রবার বাদ এশা কার্যকরী পরিষদের জরুরী সভায় উপস্থিত থাকার বিনীত অনুরোধ।`);
        break;
      default:
        setMessageText('');
        break;
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSending(true);
    setNotification(null);
    try {
      let payload: any = { messageText, templateType };

      if (recipientType === 'SINGLE') {
        if (!singlePhone.trim()) {
          setNotification({ type: 'error', text: 'প্রাপকের মোবাইল নম্বর প্রদান আবশ্যক।' });
          setIsSending(false);
          return;
        }
        payload.recipientPhone = singlePhone.trim();
        payload.recipientName = singleName.trim() || 'সংশ্লিষ্ট গ্রহীতা';
      } else if (recipientType === 'COMMITTEE') {
        const recipientsList = members.filter(m => m.phone).map(m => ({ phone: m.phone, name: m.name }));
        if (recipientsList.length === 0) {
          setNotification({ type: 'error', text: 'কমিটিতে কোনো মোবাইল নম্বর পাওয়া যায়নি।' });
          setIsSending(false);
          return;
        }
        payload.recipients = recipientsList;
      } else if (recipientType === 'STAFF') {
        const recipientsList = staff.filter(s => s.phone).map(s => ({ phone: s.phone, name: s.name }));
        if (recipientsList.length === 0) {
          setNotification({ type: 'error', text: 'স্টাফ তালিকায় কোনো মোবাইল নম্বর পাওয়া যায়নি।' });
          setIsSending(false);
          return;
        }
        payload.recipients = recipientsList;
      }

      const res = await api.sendSmsGateway(payload);
      setNotification({
        type: 'success',
        text: res?.message || 'এসএমএস সফলভাবে প্রেক্ষিত হয়েছে।',
      });
      setSinglePhone('');
      setSingleName('');
      setMessageText('');
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'এসএমএস প্রেরণে ত্রুটি হয়েছে।' });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenWhatsapp = () => {
    if (!singlePhone.trim()) {
      setNotification({ type: 'error', text: 'হোয়াটসঅ্যাপে মেসেজ পাঠাতে মোবাইল নম্বর দিন।' });
      return;
    }
    const cleanNumber = singlePhone.replace(/\D/g, '');
    const formatted = cleanNumber.startsWith('88') ? cleanNumber : `88${cleanNumber}`;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await api.updateSmsSettings({
        provider,
        apiKey,
        senderId,
        autoDonationSms,
        autoSalarySms,
        autoFeeSms,
      });
      setNotification({ type: 'success', text: 'এসএমএস গেটওয়ে সেটিংস আপডেট করা হয়েছে।' });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'সেটিংস সেভ করতে সমস্যা হয়েছে।' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await api.deleteSmsLog(id);
      setNotification({ type: 'success', text: 'এসএমএস লগ মোছা হয়েছে।' });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'লগ মুছতে ব্যর্থ হয়েছে।' });
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.recipientPhone?.includes(logSearchTerm) ||
      l.recipientName?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      l.messageText?.toLowerCase().includes(logSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Bulk SMS & WhatsApp Notification Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>এসএমএস ও নোটিফিকেশন গেটওয়ে সেন্টার</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              দান রসিদ কনফার্মেশন, মক্তব ফি রিমাইন্ডার, স্টাফ বেতন ও জুমার বিজ্ঞপ্তির মোবাইল বার্তা সার্ভিস
            </p>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-slate-700 text-center space-y-0.5 shadow-md">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">অবশিষ্ট এসএমএস ক্রেডিট</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {(settings?.creditsBalance || 1250).toLocaleString('en-IN')} টি
            </div>
          </div>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Section Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-2xl shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('send')}
          className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'send'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>ইনস্ট্যান্ট এসএমএস ও হোয়াটসঅ্যাপ পাঠান</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>অটো-এসএমএস ট্রিগার ও গেটওয়ে কনফিগারেশন</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`py-3.5 px-5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>এসএমএস প্রেরণের ইতিহাস ({logs.length})</span>
        </button>
      </div>

      {/* ==================== TAB 1: SEND SMS TOOL ==================== */}
      {activeTab === 'send' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSendSms} className="space-y-6">
            {/* Recipient Category Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                ১. গ্রহীতার ধরণ নির্বাচন করুন:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setRecipientType('SINGLE')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    recipientType === 'SINGLE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>একক ব্যক্তি</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('COMMITTEE')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    recipientType === 'COMMITTEE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>কমিটি সদস্য ({members.length} জন)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('STAFF')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                    recipientType === 'STAFF'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>ইমাম ও স্টাফ ({staff.length} জন)</span>
                </button>
              </div>
            </div>

            {/* Single Recipient Input */}
            {recipientType === 'SINGLE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    গ্রহীতার নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="যেমন: জনাব আব্দুর রহমান"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Preset Template Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                ২. রেডিমেড মেসেজ টেমপ্লেট নির্বাচন করুন:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTemplateChange('DONATION')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    templateType === 'DONATION'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  💵 দান রসিদ ধন্যবাদ
                </button>

                <button
                  type="button"
                  onClick={() => handleTemplateChange('MAKTAB_FEE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    templateType === 'MAKTAB_FEE'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📖 মক্তব ফি রিমাইন্ডার
                </button>

                <button
                  type="button"
                  onClick={() => handleTemplateChange('STAFF_SALARY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    templateType === 'STAFF_SALARY'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  👤 ইমাম/স্টাফ বেতন
                </button>

                <button
                  type="button"
                  onClick={() => handleTemplateChange('MEETING_NOTICE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    templateType === 'MEETING_NOTICE'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  👥 কমিটি সভা বিজ্ঞপ্তি
                </button>

                <button
                  type="button"
                  onClick={() => handleTemplateChange('CUSTOM')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    templateType === 'CUSTOM'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ✍️ কাস্টম মেসেজ
                </button>
              </div>
            </div>

            {/* Message Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  ৩. মেসেজ বিস্তারিত (বাংলা বা ইংরেজি):
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  দৈর্ঘ্য: {messageText.length} অক্ষর
                </span>
              </div>
              <textarea
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="এখানে আপনার মেসেজ লিখুন..."
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {recipientType === 'SINGLE' && (
                <button
                  type="button"
                  onClick={handleOpenWhatsapp}
                  className="px-5 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all cursor-pointer border border-emerald-200"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp এ সরাসরি পাঠান</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/40 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'এসএমএস পাঠানো হচ্ছে...' : 'মোবাইল এসএমএস পাঠান'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB 2: SETTINGS & AUTO TRIGGERS ==================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>এসএমএস গেটওয়ে কনফিগারেশন</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                আপনার বাল্ক এসএমএস সার্ভিস প্রোভাইডারের API Key ও মাস্কিং সেন্ডার আইডি কনফিগার করুন
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  এসএমএস প্রোভাইডার
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                >
                  <option value="Qolek SMS">Qolek SMS (মেয়াদ বিহীন / Lifetime Validity)</option>
                  <option value="GIO SMS">GIO SMS (মেয়াদ বিহীন / Lifetime Validity)</option>
                  <option value="Automas Technologies">Automas Technologies (মেয়াদ বিহীন / Lifetime Validity)</option>
                  <option value="ZAMAN IT">ZAMAN IT (মেয়াদ বিহীন / Lifetime Validity)</option>
                  <option value="Greenweb SMS Gateway">Greenweb SMS Gateway BD</option>
                  <option value="BulkSMS BD">BulkSMS BD API</option>
                  <option value="Elitbuzz SMS">Elitbuzz SMS BD</option>
                  <option value="SSL Wireless">SSL Wireless SMS</option>
                  <option value="Infobip Gateway">Infobip Global Gateway</option>
                  <option value="Custom HTTP API">Custom HTTP SMS Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মাস্কিং / Sender ID
                </label>
                <input
                  type="text"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  placeholder="যেমন: MASJID"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-hidden"
                />
              </div>
            </div>

            {/* Auto SMS Trigger Toggles */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                স্বয়ংক্রিয় এসএমএস ট্রিগার সেটিংস (Auto-SMS Rules):
              </h3>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800">দান গ্রহণের সাথে সাথে স্বয়ংক্রিয় এসএমএস ধন্যবাদ</div>
                    <div className="text-[11px] text-slate-500">দাতার মোবাইল নম্বর দেওয়া থাকলে সঙ্গে সঙ্গে রসিদের মেসেজ যাবে</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDonationSms}
                    onChange={(e) => setAutoDonationSms(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800">বেতন পরিষদের পর স্টাফদের কনফার্মেশন এসএমএস</div>
                    <div className="text-[11px] text-slate-500">ইমাম ও স্টাফদের বেতন পেমেন্ট সাবমিট হওয়ামাত্র এসএমএস যাবে</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSalarySms}
                    onChange={(e) => setAutoSalarySms(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800">মক্তব ও হিফজ ফি জমার এসএমএস কনফার্মেশন</div>
                    <div className="text-[11px] text-slate-500">শিক্ষার্থীর অভিভাবকের মোবাইলে ডিজিটাল পেমেন্ট রসিদ যাবে</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoFeeSms}
                    onChange={(e) => setAutoFeeSms(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
              >
                <span>{isSavingSettings ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB 3: SMS HISTORY LOGS ==================== */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                placeholder="মোবাইল নম্বর, নাম বা বার্তা দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3">প্রাপক ও নম্বর</th>
                  <th className="p-3">মেসেজ বিবরণ</th>
                  <th className="p-3 text-center">টাইপ</th>
                  <th className="p-3 text-center">প্রেরণের সময়</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      কোনো এসএমএস প্রেক্ষিত রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{log.recipientName || 'গ্রহীতা'}</div>
                        <div className="text-[11px] text-emerald-700 font-mono font-bold mt-0.5">
                          {log.recipientPhone}
                        </div>
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-700" title={log.messageText}>
                        {log.messageText}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                          {log.templateType || 'CUSTOM'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                        {new Date(log.sentAt).toLocaleString('bn-BD')}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{log.status || 'DELIVERED'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="লগ মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

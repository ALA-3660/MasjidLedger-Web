import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Loader2,
  Wand2,
  Minimize2,
  PenLine,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
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
  initialDraftMessage?: string;
}

type SmsComposeAction = 'COMPOSE' | 'POLISH' | 'SHORTEN' | 'WHATSAPP';
type AutoTriggerType = 'DONATION' | 'SALARY' | 'MAKTAB_FEE';
type DeliveryInsightsData = Awaited<ReturnType<typeof api.analyzeSmsDeliveryInsightsAi>>;

export const SmsGatewayView: React.FC<SmsGatewayViewProps> = ({
  currentMosque,
  currentUser,
  members = [],
  staff = [],
  language = 'bn',
  initialDraftMessage,
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
  const [messageText, setMessageText] = useState<string>(initialDraftMessage || '');
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    if (initialDraftMessage && initialDraftMessage.trim()) {
      setMessageText(initialDraftMessage);
      setActiveTab('send');
      setNotification({
        type: 'success',
        text: 'খসড়া নোট থেকে SMS বার্তা তৈরি হয়েছে। যাচাই করে পাঠাতে পারবেন।',
      });
    }
  }, [initialDraftMessage]);

  // Floating AI Menu inside Message Box State
  const [isAiMenuOpen, setIsAiMenuOpen] = useState<boolean>(false);
  const [aiTopicInput, setAiTopicInput] = useState<string>('');
  const [aiComposeLoading, setAiComposeLoading] = useState<SmsComposeAction | null>(null);
  const [aiComposeNote, setAiComposeNote] = useState<string | null>(null);
  const aiMenuRef = useRef<HTMLDivElement | null>(null);

  // Settings State
  const [provider, setProvider] = useState<string>('Qolek SMS');
  const [apiKey, setApiKey] = useState<string>('gw_live_89a24d7f9');
  const [senderId, setSenderId] = useState<string>('MASJID');
  const [autoDonationSms, setAutoDonationSms] = useState<boolean>(true);
  const [autoSalarySms, setAutoSalarySms] = useState<boolean>(true);
  const [autoFeeSms, setAutoFeeSms] = useState<boolean>(true);
  const [autoDonationTemplate, setAutoDonationTemplate] = useState<string>(
    '{মসজিদের_নাম}: মুহতারাম {নাম}, {তারিখ} তারিখে আপনার {টাকা} দান গৃহীত হয়েছে। জাযাকাল্লাহু খাইরান।'
  );
  const [autoSalaryTemplate, setAutoSalaryTemplate] = useState<string>(
    '{মসজিদের_নাম}: সম্মানিত {নাম}, {তারিখ} তারিখে আপনার মাসিক হাদিয়া/বেতন {টাকা} পরিশোধ করা হয়েছে।'
  );
  const [autoFeeTemplate, setAutoFeeTemplate] = useState<string>(
    '{মসজিদের_নাম} মক্তব: প্রিয় অভিভাবক ({নাম}), {তারিখ} তারিখের {টাকা} মক্তব ফি সংক্রান্ত তথ্য নিশ্চিত করা হলো।'
  );
  const [templatePreviews, setTemplatePreviews] = useState<Partial<Record<AutoTriggerType, string>>>({});
  const [generatingTemplateFor, setGeneratingTemplateFor] = useState<AutoTriggerType | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Delivery Insights State (Tab 3)
  const [insightsData, setInsightsData] = useState<DeliveryInsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsExpanded, setInsightsExpanded] = useState<boolean>(true);

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
        if (settingsRes.autoDonationTemplate) setAutoDonationTemplate(settingsRes.autoDonationTemplate);
        if (settingsRes.autoSalaryTemplate) setAutoSalaryTemplate(settingsRes.autoSalaryTemplate);
        if (settingsRes.autoFeeTemplate) setAutoFeeTemplate(settingsRes.autoFeeTemplate);
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

  // Close floating AI popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isAiMenuOpen && aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setIsAiMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isAiMenuOpen]);

  // Live SMS Credit Estimator (Bengali Unicode: 70 chars = 1 SMS; English/ASCII: 160 chars = 1 SMS)
  const smsEstimator = useMemo(() => {
    const len = messageText.length;
    const isUnicode = /[^\x00-\x7F]/.test(messageText);
    const charsPerCredit = isUnicode ? 70 : 160;
    const creditsPerPerson = len === 0 ? 0 : Math.ceil(len / charsPerCredit);

    let recipientCount = 1;
    if (recipientType === 'COMMITTEE') {
      recipientCount = members.filter((m) => m.phone).length;
    } else if (recipientType === 'STAFF') {
      recipientCount = staff.filter((s) => s.phone).length;
    }

    const totalCreditsNeeded = creditsPerPerson * recipientCount;
    const availableCredits = settings?.creditsBalance ?? 1250;
    const isInsufficient = totalCreditsNeeded > availableCredits;

    return {
      len,
      isUnicode,
      charsPerCredit,
      creditsPerPerson,
      recipientCount,
      totalCreditsNeeded,
      availableCredits,
      isInsufficient,
    };
  }, [messageText, recipientType, members, staff, settings]);

  const handleTemplateChange = (tmpl: string) => {
    setTemplateType(tmpl);
    setAiComposeNote(null);
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

  // Floating AI 4 Quick Actions Handler (Never auto-sends)
  const handleAiComposeAction = async (action: SmsComposeAction) => {
    if ((action === 'POLISH' || action === 'SHORTEN') && !messageText.trim()) {
      setNotification({
        type: 'error',
        text: 'ভাষা মার্জিত বা সংক্ষিপ্ত করার জন্য আগে মেসেজ বক্সে কিছু টেক্সট লিখুন।',
      });
      return;
    }

    setAiComposeLoading(action);
    setNotification(null);
    try {
      const res = await api.composeSmsMessageAi({
        action,
        currentText: messageText,
        promptBrief: aiTopicInput.trim() || undefined,
        templateType,
        recipientType,
        recipientName: singleName.trim() || undefined,
      });

      if (res.messageText) {
        setMessageText(res.messageText);
      }
      setAiComposeNote(
        res.aiNoteBn ||
          `AI মেসেজ বক্সে বসানো হয়েছে (${res.charCount} অক্ষর, প্রতি জনে ${res.creditsPerPerson} ক্রেডিট)। যাচাই করে প্রেরণ করুন।`
      );
      setIsAiMenuOpen(false);
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'AI মেসেজ তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
      });
    } finally {
      setAiComposeLoading(null);
    }
  };

  // Auto-SMS Dynamic Template Generator (Tab 2)
  const handleGenerateAutoTemplate = async (triggerType: AutoTriggerType) => {
    setGeneratingTemplateFor(triggerType);
    setNotification(null);
    const currentTemplate =
      triggerType === 'DONATION'
        ? autoDonationTemplate
        : triggerType === 'SALARY'
        ? autoSalaryTemplate
        : autoFeeTemplate;

    try {
      const res = await api.generateAutoSmsTemplateAi({
        triggerType,
        currentTemplate,
      });

      if (triggerType === 'DONATION') setAutoDonationTemplate(res.templateText);
      else if (triggerType === 'SALARY') setAutoSalaryTemplate(res.templateText);
      else setAutoFeeTemplate(res.templateText);

      setTemplatePreviews((prev) => ({
        ...prev,
        [triggerType]: res.samplePreviewBn,
      }));

      setNotification({
        type: 'success',
        text: 'AI ডাইনামিক অটো-এসএমএস টেমপ্লেট তৈরি হয়েছে। স্থায়ীভাবে সংরক্ষণ করতে "সেটিংস সেভ করুন" বাটনে ক্লিক করুন।',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err?.message || 'AI ডাইনামিক টেমপ্লেট তৈরি করতে ব্যর্থ হয়েছে।',
      });
    } finally {
      setGeneratingTemplateFor(null);
    }
  };

  // AI Delivery Insights Handler (Tab 3)
  const handleAnalyzeDeliveryInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await api.analyzeSmsDeliveryInsightsAi({
        creditsBalance: settings?.creditsBalance ?? 1250,
      });
      setInsightsData(res);
      setInsightsExpanded(true);
    } catch (err: any) {
      setInsightsError(err?.message || 'AI ব্যবহারের সারসংক্ষেপ তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setInsightsLoading(false);
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
        const recipientsList = members.filter((m) => m.phone).map((m) => ({ phone: m.phone, name: m.name }));
        if (recipientsList.length === 0) {
          setNotification({ type: 'error', text: 'কমিটিতে কোনো মোবাইল নম্বর পাওয়া যায়নি।' });
          setIsSending(false);
          return;
        }
        payload.recipients = recipientsList;
      } else if (recipientType === 'STAFF') {
        const recipientsList = staff.filter((s) => s.phone).map((s) => ({ phone: s.phone, name: s.name }));
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
      setAiComposeNote(null);
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'এসএমএস প্রেরণে ত্রুটি হয়েছে।' });
    } finally {
      setIsSending(false);
    }
  };

  const getWhatsappHref = () => {
    const cleanNumber = singlePhone.replace(/\D/g, '');
    const formatted = cleanNumber.startsWith('88') ? cleanNumber : `88${cleanNumber}`;
    return `https://wa.me/${formatted}?text=${encodeURIComponent(messageText)}`;
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
        autoDonationTemplate,
        autoSalaryTemplate,
        autoFeeTemplate,
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

  const renderTemplateVarChips = (tpl: string) => {
    const vars = ['{নাম}', '{টাকা}', '{তারিখ}', '{মসজিদের_নাম}'];
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span className="text-[10px] text-slate-500 font-semibold">ভেরিয়েবল:</span>
        {vars.map((v) => (
          <span
            key={v}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
              tpl.includes(v)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {v}
          </span>
        ))}
        <span className="text-[10px] text-slate-400 ml-auto font-mono">
          {tpl.length} অক্ষর • {tpl.length === 0 ? 0 : Math.ceil(tpl.length / (/[^\x00-\x7F]/.test(tpl) ? 70 : 160))} ক্রেডিট
        </span>
      </div>
    );
  };

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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 font-siliguri">
              <span>এসএমএস ও নোটিফিকেশন গেটওয়ে সেন্টার</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              দান রসিদ কনফার্মেশন, মক্তব ফি রিমাইন্ডার, স্টাফ বেতন ও জুমার বিজ্ঞপ্তির মোবাইল বার্তা সার্ভিস
            </p>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-slate-700 text-center space-y-0.5 shadow-md">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">অবশিষ্ট এসএমএস ক্রেডিট</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {(settings?.creditsBalance ?? 1250).toLocaleString('en-IN')} টি
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

            {/* Message Text Area + Live SMS Credit Estimator + Floating AI Button */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  ৩. মেসেজ বিস্তারিত (বাংলা বা ইংরেজি):
                </label>

                {/* Live SMS Credit Estimator right beside character length */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-mono font-semibold border border-slate-200">
                    দৈর্ঘ্য: {smsEstimator.len} অক্ষর
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                    {smsEstimator.isUnicode ? 'বাংলা ইউনিকোড (৭০/SMS)' : 'ইংরেজি (১৬০/SMS)'}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    প্রতি জনে: {smsEstimator.creditsPerPerson} ক্রেডিট
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg border font-bold ${
                      smsEstimator.isInsufficient
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    মোট ({smsEstimator.recipientCount} জন): {smsEstimator.totalCreditsNeeded} ক্রেডিট
                  </span>
                </div>
              </div>

              {/* Textarea Wrapper with Floating AI Button at Top-Right */}
              <div className="relative" ref={aiMenuRef}>
                {/* Floating Compact AI Button */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={Boolean(aiComposeLoading)}
                    onClick={() => setIsAiMenuOpen((prev) => !prev)}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {aiComposeLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI লিখছে...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                        <span>✨ AI দিয়ে লিখুন</span>
                        <ChevronDown className="w-3 h-3 opacity-80" />
                      </>
                    )}
                  </button>
                </div>

                {/* Floating 4-Action AI Popover Dropdown */}
                {isAiMenuOpen && (
                  <div className="absolute top-12 right-2.5 z-30 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-emerald-200 p-3.5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 font-siliguri">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>AI স্মার্ট মেসেজ সহকারী</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAiMenuOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* (ক) Compose New Message Input + Button */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 space-y-2">
                      <div className="text-[11px] font-bold text-emerald-950 font-siliguri">
                        (ক) নতুন মেসেজ লিখুন
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={aiTopicInput}
                          onChange={(e) => setAiTopicInput(e.target.value)}
                          placeholder="যেমন: আগামীকাল বাদ এশা কমিটির মিটিং..."
                          className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          disabled={Boolean(aiComposeLoading)}
                          onClick={() => handleAiComposeAction('COMPOSE')}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-60"
                        >
                          <PenLine className="w-3 h-3" />
                          <span>লিখুন</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-800/80">
                        খালি রাখলে উপরের টেমপ্লেট ও গ্রহীতার ধরন অনুযায়ী লিখবে।
                      </p>
                    </div>

                    {/* (খ), (গ), (ঘ) Quick Action Buttons */}
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled={Boolean(aiComposeLoading)}
                        onClick={() => handleAiComposeAction('POLISH')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left flex items-start gap-2.5 transition cursor-pointer disabled:opacity-60"
                      >
                        <Wand2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-800 font-siliguri">
                            (খ) ভাষা মার্জিত করুন (Polish)
                          </div>
                          <div className="text-[10px] text-slate-500">
                            কাঁচা লেখা শুদ্ধ, বিনম্র ও ইসলামী আদবসম্মত বাংলায় সাজান
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(aiComposeLoading)}
                        onClick={() => handleAiComposeAction('SHORTEN')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left flex items-start gap-2.5 transition cursor-pointer disabled:opacity-60"
                      >
                        <Minimize2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-800 font-siliguri">
                            (গ) এসএমএস সংক্ষিপ্ত করুন (ক্রেডিট সেভার)
                          </div>
                          <div className="text-[10px] text-slate-500">
                            মূল অর্থ ঠিক রেখে ১-২ এসএমএস ক্রেডিটের (৭০-১৪০ অক্ষর) মধ্যে আনুন
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(aiComposeLoading)}
                        onClick={() => handleAiComposeAction('WHATSAPP')}
                        className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left flex items-start gap-2.5 transition cursor-pointer disabled:opacity-60"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-800 font-siliguri">
                            (ঘ) WhatsApp ফরম্যাট করুন
                          </div>
                          <div className="text-[10px] text-slate-500">
                            সুন্দর ইমোজি, *বোল্ড হেডিং* ও পরিচ্ছন্ন প্যারাগ্রাফ যুক্ত করুন
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="এখানে আপনার মেসেজ লিখুন অথবা ডান কোণায় '✨ AI দিয়ে লিখুন' বাটনে ক্লিক করুন..."
                  required
                  className="w-full px-3.5 pt-11 pb-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-hidden leading-relaxed font-siliguri"
                />
              </div>

              {aiComposeNote && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{aiComposeNote}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiComposeNote(null)}
                    className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {smsEstimator.isInsufficient && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    সতর্কতা: মোট প্রয়োজনীয় ক্রেডিট ({smsEstimator.totalCreditsNeeded} টি) অবশিষ্ট ব্যালেন্স ({smsEstimator.availableCredits} টি)-এর চেয়ে বেশি। &ldquo;ক্রেডিট সেভার&rdquo; ব্যবহার করে মেসেজ সংক্ষিপ্ত করতে পারেন।
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {recipientType === 'SINGLE' &&
                (singlePhone.trim() ? (
                  <a
                    href={getWhatsappHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all cursor-pointer border border-emerald-200"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp এ সরাসরি পাঠান</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setNotification({ type: 'error', text: 'হোয়াটসঅ্যাপে মেসেজ পাঠাতে মোবাইল নম্বর দিন।' })
                    }
                    className="px-5 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all cursor-pointer border border-emerald-200"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp এ সরাসরি পাঠান</span>
                  </button>
                ))}

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

            {/* Auto SMS Trigger Toggles + AI Dynamic Template Generator */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  স্বয়ংক্রিয় এসএমএস ট্রিগার ও ডাইনামিক টেমপ্লেট (Auto-SMS Rules):
                </h3>
                <span className="text-[11px] text-slate-500">
                  সমর্থিত ভেরিয়েবল: <code className="text-emerald-700 font-bold">{'{নাম}, {টাকা}, {তারিখ}, {মসজিদের_নাম}'}</code>
                </span>
              </div>

              <div className="space-y-3">
                {/* Trigger 1: Donation */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDonationSms}
                        onChange={(e) => setAutoDonationSms(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          দান গ্রহণের সাথে সাথে স্বয়ংক্রিয় এসএমএস ধন্যবাদ
                        </div>
                        <div className="text-[11px] text-slate-500">
                          দাতার মোবাইল নম্বর দেওয়া থাকলে সঙ্গে সঙ্গে রসিদের মেসেজ যাবে
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      disabled={generatingTemplateFor === 'DONATION'}
                      onClick={() => handleGenerateAutoTemplate('DONATION')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center shadow-xs transition cursor-pointer"
                    >
                      {generatingTemplateFor === 'DONATION' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      )}
                      <span>AI দিয়ে ডাইনামিক টেমপ্লেট তৈরি করুন</span>
                    </button>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={autoDonationTemplate}
                      onChange={(e) => setAutoDonationTemplate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-siliguri focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    {renderTemplateVarChips(autoDonationTemplate)}
                    {templatePreviews.DONATION && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                        <strong className="text-emerald-800">নমুনা প্রিভিউ:</strong> {templatePreviews.DONATION}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trigger 2: Salary */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSalarySms}
                        onChange={(e) => setAutoSalarySms(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          বেতন পরিশোধের পর স্টাফদের কনফার্মেশন এসএমএস
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ইমাম ও স্টাফদের বেতন পেমেন্ট সাবমিট হওয়ামাত্র এসএমএস যাবে
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      disabled={generatingTemplateFor === 'SALARY'}
                      onClick={() => handleGenerateAutoTemplate('SALARY')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center shadow-xs transition cursor-pointer"
                    >
                      {generatingTemplateFor === 'SALARY' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      )}
                      <span>AI দিয়ে ডাইনামিক টেমপ্লেট তৈরি করুন</span>
                    </button>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={autoSalaryTemplate}
                      onChange={(e) => setAutoSalaryTemplate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-siliguri focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    {renderTemplateVarChips(autoSalaryTemplate)}
                    {templatePreviews.SALARY && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                        <strong className="text-emerald-800">নমুনা প্রিভিউ:</strong> {templatePreviews.SALARY}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trigger 3: Maktab Fee / Dues */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoFeeSms}
                        onChange={(e) => setAutoFeeSms(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          মক্তব ও হিফজ ফি জমা / বকেয়া রিমাইন্ডার এসএমএস কনফার্মেশন
                        </div>
                        <div className="text-[11px] text-slate-500">
                          শিক্ষার্থীর অভিভাবকের মোবাইলে ডিজিটাল পেমেন্ট রসিদ ও বকেয়া রিমাইন্ডার যাবে
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      disabled={generatingTemplateFor === 'MAKTAB_FEE'}
                      onClick={() => handleGenerateAutoTemplate('MAKTAB_FEE')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-center shadow-xs transition cursor-pointer"
                    >
                      {generatingTemplateFor === 'MAKTAB_FEE' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      )}
                      <span>AI দিয়ে ডাইনামিক টেমপ্লেট তৈরি করুন</span>
                    </button>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={autoFeeTemplate}
                      onChange={(e) => setAutoFeeTemplate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-siliguri focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    {renderTemplateVarChips(autoFeeTemplate)}
                    {templatePreviews.MAKTAB_FEE && (
                      <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                        <strong className="text-emerald-800">নমুনা প্রিভিউ:</strong> {templatePreviews.MAKTAB_FEE}
                      </div>
                    )}
                  </div>
                </div>
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
        <div className="space-y-5">
          {/* AI Delivery & Credit Usage Insights Card */}
          <div className="bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 rounded-3xl border border-emerald-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                    <span>AI ব্যবহারের সারসংক্ষেপ ও ক্রেডিট পূর্বাভাস</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    মাসে কোন খাতে বেশি এসএমএস ক্রেডিট খরচ হচ্ছে এবং বর্তমান অবশিষ্ট ক্রেডিট আর কতদিন চলবে তা বিশ্লেষণ করুন
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={insightsLoading}
                  onClick={handleAnalyzeDeliveryInsights}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  {insightsLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>বিশ্লেষণ চলছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      <span>{insightsData ? 'পুনরায় বিশ্লেষণ' : 'AI ব্যবহারের সারসংক্ষেপ দেখুন'}</span>
                    </>
                  )}
                </button>

                {insightsData && (
                  <button
                    type="button"
                    onClick={() => setInsightsExpanded((v) => !v)}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
                  >
                    {insightsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {insightsError && (
              <div className="mx-5 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{insightsError}</span>
              </div>
            )}

            {insightsData && insightsExpanded && (
              <div className="px-5 pb-5 pt-2 border-t border-emerald-100 space-y-4 text-xs">
                {/* Summary KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">সর্বাধিক খরচের খাত</span>
                    <div className="text-sm font-bold text-emerald-800 font-siliguri mt-0.5">
                      {insightsData.topCategoryLabelBn}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">চলতি মাসে খরচ</span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {insightsData.totalCreditsInScope} ক্রেডিট ({insightsData.monthlyLogsCount} SMS)
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">দৈনিক গড় ব্যয়</span>
                    <div className="text-sm font-bold text-indigo-800 mt-0.5">
                      {insightsData.estimatedDailyBurn} ক্রেডিট / দিন
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>অবশিষ্ট চলবে</span>
                    </span>
                    <div className="text-sm font-bold text-emerald-900 mt-0.5">
                      {insightsData.estimatedDaysRemaining !== null
                        ? `প্রায় ${insightsData.estimatedDaysRemaining} দিন`
                        : 'পর্যাপ্ত ব্যালেন্স'}
                    </div>
                  </div>
                </div>

                {/* AI Summary & Forecast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 font-siliguri">খাতভিত্তিক ব্যবহার ও বিশ্লেষণ</div>
                    <p className="text-slate-700 leading-relaxed font-siliguri">{insightsData.summaryBn}</p>
                    <p className="text-emerald-800 font-semibold pt-1 font-siliguri">
                      {insightsData.forecastNoteBn}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 font-siliguri">খাতভিত্তিক ক্রেডিট বণ্টন</div>
                    <div className="space-y-1.5">
                      {insightsData.categoryBreakdown.map((cat) => (
                        <div key={cat.key} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700 font-siliguri">{cat.labelBn}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {cat.creditsUsed} ক্রেডিট ({cat.sharePercent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${cat.sharePercent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {insightsData.savingTipsBn && insightsData.savingTipsBn.length > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-900">
                    <strong className="font-siliguri">ক্রেডিট সাশ্রয়ী পরামর্শ:</strong>
                    {insightsData.savingTipsBn.map((tip, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{tip}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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
                        <td className="p-3 max-w-xs truncate text-slate-700" title={log.messageText || log.message}>
                          {log.messageText || log.message}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                            {log.templateType || log.purpose || 'CUSTOM'}
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
        </div>
      )}
    </div>
  );
};


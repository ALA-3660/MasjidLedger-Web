import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Shield,
  Users2,
  Lightbulb,
  CalendarCheck,
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  Download,
  Filter,
  Check,
  Award,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';
import {
  AdvisorMember,
  AdvisoryCouncilTerm,
  AdvisorConsultation,
  Mosque
} from '../types';
import { api } from '../lib/api';
import { printElement } from '../lib/printUtils';
import { toBanglaNumber } from './CommitteeView';
import { AdvisorFormModal } from './AdvisorFormModal';
import { AdvisorProfileModal } from './AdvisorProfileModal';
import { AdvisorConsultationModal } from './AdvisorConsultationModal';

interface AdvisoryCouncilViewProps {
  mosque?: Mosque | null;
  onRefresh?: () => void;
}

export const AdvisoryCouncilView: React.FC<AdvisoryCouncilViewProps> = ({
  mosque,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'advisors' | 'consultations' | 'terms'>('advisors');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Server state
  const [terms, setTerms] = useState<AdvisoryCouncilTerm[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorMember[]>([]);
  const [consultations, setConsultations] = useState<AdvisorConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<AdvisorMember | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedAdvisorForProfile, setSelectedAdvisorForProfile] = useState<AdvisorMember | null>(null);

  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<AdvisorConsultation | null>(null);
  const [preselectedAdvisorId, setPreselectedAdvisorId] = useState<string | undefined>();

  const [isAddTermModalOpen, setIsAddTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AdvisoryCouncilTerm | null>(null);
  const [termForm, setTermForm] = useState({ title: '', startDate: '', endDate: '', description: '' });

  // Print ref & Modal states for Council Member List
  const councilPrintRef = useRef<HTMLDivElement>(null);
  const [isPrintCouncilModalOpen, setIsPrintCouncilModalOpen] = useState(false);
  const [printTermFilter, setPrintTermFilter] = useState<string>('ALL');
  const [printStatusOnlyActive, setPrintStatusOnlyActive] = useState(false);
  const [showLetterhead, setShowLetterhead] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdvisoryCouncil();
      setTerms(data.terms || []);
      setAdvisors(data.advisors || []);
      setConsultations(data.consultations || []);
    } catch (err) {
      console.error('Failed to load advisory council data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Advisors
  const filteredAdvisors = useMemo(() => {
    return advisors.filter((adv) => {
      if (selectedTermFilter !== 'ALL' && adv.termId !== selectedTermFilter) return false;
      if (selectedRoleFilter !== 'ALL' && adv.advisorRole !== selectedRoleFilter) return false;
      if (selectedStatusFilter !== 'ALL' && adv.status !== selectedStatusFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = adv.name.toLowerCase().includes(query);
        const matchesPhone = adv.phone.includes(query);
        const matchesRole = (adv.advisorRole || '').toLowerCase().includes(query);
        const matchesOccupation = (adv.occupation || '').toLowerCase().includes(query);
        const matchesAddress = (adv.address || '').toLowerCase().includes(query);
        return matchesName || matchesPhone || matchesRole || matchesOccupation || matchesAddress;
      }
      return true;
    });
  }, [advisors, selectedTermFilter, selectedRoleFilter, selectedStatusFilter, searchQuery]);

  // Filtered Consultations
  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTopic = c.topic.toLowerCase().includes(query);
        const matchesAdvice = c.advice.toLowerCase().includes(query);
        const matchesAdvisor = c.advisorName.toLowerCase().includes(query);
        return matchesTopic || matchesAdvice || matchesAdvisor;
      }
      return true;
    });
  }, [consultations, searchQuery]);

  // Statistics
  const activeAdvisorsCount = useMemo(() => advisors.filter((a) => a.status === 'ACTIVE').length, [advisors]);
  const honoraryCount = useMemo(() => advisors.filter((a) => a.status === 'HONORARY').length, [advisors]);

  // Advisor CRUD Handlers
  const handleSaveAdvisor = async (data: Partial<AdvisorMember>) => {
    if (editingAdvisor) {
      const updated = await api.updateAdvisorMember(editingAdvisor.id, data);
      setAdvisors((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedAdvisorForProfile?.id === updated.id) {
        setSelectedAdvisorForProfile(updated);
      }
    } else {
      const created = await api.createAdvisorMember(data);
      setAdvisors((prev) => [created, ...prev]);
    }
    if (onRefresh) onRefresh();
  };

  const handleDeleteAdvisor = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${name}"-কে উপদেষ্টা পরিষদ থেকে অপসারণ করতে চান?`)) {
      return;
    }
    try {
      await api.deleteAdvisorMember(id);
      setAdvisors((prev) => prev.filter((a) => a.id !== id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'উপদেষ্টা অপসারণ করতে সমস্যা হয়েছে।');
    }
  };

  // Consultation CRUD Handlers
  const handleSaveConsultation = async (data: Partial<AdvisorConsultation>) => {
    if (editingConsultation) {
      const updated = await api.updateAdvisorConsultation(editingConsultation.id, data);
      setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await api.createAdvisorConsultation(data);
      setConsultations((prev) => [created, ...prev]);
    }
  };

  const handleDeleteConsultation = async (id: string, topic: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${topic}" পরামর্শ রেকর্ড মুছে ফেলতে চান?`)) {
      return;
    }
    try {
      await api.deleteAdvisorConsultation(id);
      setConsultations((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'পরামর্শ মুছে ফেলতে সমস্যা হয়েছে।');
    }
  };

  // Term CRUD Handlers
  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termForm.title.trim()) return;

    try {
      if (editingTerm) {
        const updated = await api.updateAdvisoryTerm(editingTerm.id, termForm);
        setTerms((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await api.createAdvisoryTerm(termForm);
        setTerms((prev) => [created, ...prev]);
      }
      setIsAddTermModalOpen(false);
      setEditingTerm(null);
      setTermForm({ title: '', startDate: '', endDate: '', description: '' });
    } catch (err: any) {
      alert(err.message || 'মেয়াদকাল সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  // Filtered Advisors for Printing
  const printAdvisorsList = useMemo(() => {
    return advisors.filter((adv) => {
      if (printTermFilter !== 'ALL' && adv.termId !== printTermFilter) return false;
      if (printStatusOnlyActive && adv.status !== 'ACTIVE') return false;
      return true;
    });
  }, [advisors, printTermFilter, printStatusOnlyActive]);

  const activePrintTerm = useMemo(() => {
    if (printTermFilter === 'ALL') {
      return terms[0] || null;
    }
    return terms.find((t) => t.id === printTermFilter) || null;
  }, [terms, printTermFilter]);

  const handlePrintCouncilList = () => {
    setIsPrintCouncilModalOpen(true);
  };

  const handleTriggerPrint = async () => {
    const target = document.getElementById('advisory-council-print-document') || councilPrintRef.current;
    if (target) {
      await printElement(target, {
        title: `উপদেষ্টা_পরিষদ_তালিকা_${mosque?.name || 'মসজিদ'}`,
        pageSize: 'A4',
        pageOrientation: 'portrait',
        margin: '10mm 12mm',
      });
    } else {
      window.print();
    }
  };

  const handleExportCsv = () => {
    const headers = ['ক্রমিক', 'নাম', 'পদবি', 'পিতার নাম', 'মাতার নাম', 'মোবাইল', 'NID', 'পেশা', 'শিক্ষাগত যোগ্যতা', 'ঠিকানা', 'স্ট্যাটাস'];
    const rows = printAdvisorsList.map((adv, idx) => [
      (idx + 1).toString(),
      `"${(adv.name || '').replace(/"/g, '""')}"`,
      `"${(adv.advisorRole || 'উপদেষ্টা').replace(/"/g, '""')}"`,
      `"${(adv.fatherName || '').replace(/"/g, '""')}"`,
      `"${(adv.motherName || '').replace(/"/g, '""')}"`,
      `"${adv.phone || ''}"`,
      `"${adv.nid || ''}"`,
      `"${(adv.occupation || '').replace(/"/g, '""')}"`,
      `"${(adv.education || '').replace(/"/g, '""')}"`,
      `"${(adv.address || '').replace(/"/g, '""')}"`,
      `"${adv.status === 'ACTIVE' ? 'সক্রিয়' : adv.status === 'HONORARY' ? 'সম্মানসূচক' : 'নিষ্ক্রিয়'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `advisory_council_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>স্বতন্ত্র পরিষদ • পরিচালনা পরিষদ থেকে সম্পূর্ণ পৃথক</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-3">
              <span>উপদেষ্টা পরিষদ ব্যবস্থাপনা</span>
            </h1>
            <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
              মামুন জামে মসজিদ ওয়াক্ফ এস্টেটের সম্মানিত উপদেষ্টাবৃন্দ, দ্বীনি ও সামাজিক পরামর্শ এবং দিকনির্দেশনা সংরক্ষণের একটি সম্পূর্ণ স্বতন্ত্র ও ডেডিকেটেড মডিউল।
            </p>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
            <button
              onClick={() => {
                setEditingAdvisor(null);
                setIsAdvisorModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>উপদেষ্টা অন্তর্ভুক্ত করুন</span>
            </button>

            <button
              onClick={() => {
                setEditingConsultation(null);
                setPreselectedAdvisorId(undefined);
                setIsConsultationModalOpen(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer border border-white/15"
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>পরামর্শ নথিভুক্ত করুন</span>
            </button>

            <button
              onClick={handlePrintCouncilList}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-white/15"
              title="A4 আকারে পরিষদ তালিকা প্রিন্ট বা PDF ডাউনলোড করুন"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              <span>তালিকা প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-level Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">মোট উপদেষ্টা</span>
            <span className="text-xl font-bold text-slate-900">{toBanglaNumber(advisors.length)} জন</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">সক্রিয় উপদেষ্টাবৃন্দ</span>
            <span className="text-xl font-bold text-emerald-700">{toBanglaNumber(activeAdvisorsCount)} জন</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">সম্মানসূচক / আজীবন</span>
            <span className="text-xl font-bold text-amber-700">{toBanglaNumber(honoraryCount)} জন</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">পরামর্শ ও দিকনির্দেশনা</span>
            <span className="text-xl font-bold text-purple-700">{toBanglaNumber(consultations.length)} টি</span>
          </div>
        </div>
      </div>

      {/* Section Navigation & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('advisors')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'advisors'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>উপদেষ্টা তালিকা</span>
              <span className="ml-1 bg-indigo-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {advisors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('consultations')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'consultations'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              <span>পরামর্শ ও দিকনির্দেশনা রেজিস্টার</span>
              <span className="ml-1 bg-indigo-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {consultations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'terms'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>পরিষদ মেয়াদকাল</span>
              <span className="ml-1 bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {terms.length}
              </span>
            </button>
          </div>

          {activeTab === 'advisors' && (
            <div className="flex items-center space-x-2">
              <button
                id="btn-print-council-tab-toolbar"
                onClick={() => setIsPrintCouncilModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 border border-indigo-200 shadow-2xs"
                title="A4 আকারে পরিষদ তালিকা প্রিন্ট বা PDF সংরক্ষণ করুন"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>তালিকা প্রিন্ট</span>
              </button>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <span className="text-xs text-slate-500 font-medium hidden sm:inline">ভিউ মোড:</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${
                    viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  গ্রিড কার্ড
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-all ${
                    viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  টেবিল তালিকা
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'advisors'
                  ? 'উপদেষ্টার নাম, মোবাইল, পদবি, পেশা বা ঠিকানা দিয়ে খুঁজুন...'
                  : 'পরামর্শের বিষয়, বিবরণ বা উপদেষ্টার নাম দিয়ে খুঁজুন...'
              }
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {activeTab === 'advisors' && (
            <>
              <div className="sm:col-span-3">
                <select
                  value={selectedTermFilter}
                  onChange={(e) => setSelectedTermFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">সকল মেয়াদকাল</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL">সকল স্ট্যাটাস</option>
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="HONORARY">সম্মানসূচক (Honorary)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                  <option value="DECEASED">মরহুম (Deceased)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'advisors' && (
        <div className="space-y-4">
          {filteredAdvisors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Shield className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">কোনো উপদেষ্টা পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                আপনার অনুসন্ধানের সাথে মিল পাওয়া যায়নি অথবা এখনও কোনো উপদেষ্টা যুক্ত করা হয়নি।
              </p>
              <button
                onClick={() => {
                  setEditingAdvisor(null);
                  setIsAdvisorModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>প্রথম উপদেষ্টা যুক্ত করুন</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAdvisors.map((adv) => {
                const termObj = terms.find((t) => t.id === adv.termId);
                return (
                  <div
                    key={adv.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Card Info */}
                      <div className="flex items-start space-x-3.5">
                        <div className="relative flex-shrink-0">
                          {adv.photoUrl ? (
                            <img
                              src={adv.photoUrl}
                              alt={adv.name}
                              className="w-14 h-14 rounded-2xl object-cover border border-indigo-200 shadow-xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xl">
                              {adv.name.slice(0, 1)}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                              adv.status === 'ACTIVE'
                                ? 'bg-emerald-500'
                                : adv.status === 'HONORARY'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3
                            onClick={() => {
                              setSelectedAdvisorForProfile(adv);
                              setIsProfileModalOpen(true);
                            }}
                            className="text-sm font-bold text-slate-900 truncate hover:text-indigo-600 transition-colors cursor-pointer"
                            title={adv.name}
                          >
                            {adv.name}
                          </h3>
                          <span className="inline-block px-2 py-0.5 mt-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 truncate max-w-full">
                            {adv.advisorRole || 'উপদেষ্টা'}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            {adv.occupation || termObj?.title || 'উপদেষ্টা পরিষদ'}
                          </p>
                        </div>
                      </div>

                      {/* Detail Rows */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center text-slate-600 space-x-2">
                          <Phone className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-800">{adv.phone}</span>
                        </div>

                        {adv.address && (
                          <div className="flex items-start text-slate-600 space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-600 line-clamp-1">{adv.address}</span>
                          </div>
                        )}

                        {adv.education && (
                          <div className="flex items-center text-slate-600 space-x-2">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-600 truncate">{adv.education}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedAdvisorForProfile(adv);
                          setIsProfileModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>প্রোফাইল দেখুন</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingAdvisor(adv);
                            setIsAdvisorModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="তথ্য সম্পাদনা"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdvisor(adv.id, adv.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="অপসারণ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px]">
                    <tr>
                      <th className="p-3.5">উপদেষ্টার নাম</th>
                      <th className="p-3.5">পদবি / দায়িত্ব</th>
                      <th className="p-3.5">মোবাইল নম্বর</th>
                      <th className="p-3.5">পেশা ও শিক্ষা</th>
                      <th className="p-3.5">মেয়াদকাল</th>
                      <th className="p-3.5">স্ট্যাটাস</th>
                      <th className="p-3.5 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdvisors.map((adv) => {
                      const termObj = terms.find((t) => t.id === adv.termId);
                      return (
                        <tr key={adv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center space-x-3">
                              {adv.photoUrl ? (
                                <img
                                  src={adv.photoUrl}
                                  alt={adv.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100">
                                  {adv.name.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <button
                                  onClick={() => {
                                    setSelectedAdvisorForProfile(adv);
                                    setIsProfileModalOpen(true);
                                  }}
                                  className="font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer text-left block"
                                >
                                  {adv.name}
                                </button>
                                <span className="text-[10px] text-slate-500 block">
                                  যোগদান: {adv.joinDate ? toBanglaNumber(adv.joinDate) : '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-indigo-700">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100">
                              {adv.advisorRole || 'উপদেষ্টা'}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold font-mono text-slate-800">{adv.phone}</td>
                          <td className="p-3.5 text-slate-600">
                            <div>{adv.occupation || '—'}</div>
                            <div className="text-[10px] text-slate-400">{adv.education || ''}</div>
                          </td>
                          <td className="p-3.5 text-slate-700">{termObj?.title || '—'}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                adv.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : adv.status === 'HONORARY'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {adv.status === 'ACTIVE'
                                ? 'সক্রিয়'
                                : adv.status === 'HONORARY'
                                ? 'সম্মানসূচক'
                                : 'নিষ্ক্রিয়'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedAdvisorForProfile(adv);
                                  setIsProfileModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="প্রোফাইল দেখুন"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAdvisor(adv);
                                  setIsAdvisorModalOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdvisor(adv.id, adv.name)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consultations Tab */}
      {activeTab === 'consultations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">পরামর্শ ও দিকনির্দেশনা রেজিস্টার</h3>
              <p className="text-xs text-slate-500">সম্মানিত উপদেষ্টাবৃন্দের মতামত, দিকনির্দেশনা ও সুপারিশমালা</p>
            </div>
            <button
              onClick={() => {
                setEditingConsultation(null);
                setPreselectedAdvisorId(undefined);
                setIsConsultationModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন পরামর্শ নথিভুক্ত করুন</span>
            </button>
          </div>

          {filteredConsultations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-1" />
              <p className="text-sm font-bold text-slate-700">কোনো পরামর্শ নথিভুক্ত পাওয়া যায়নি</p>
              <p className="text-xs text-slate-500">
                মসজিদ উন্নয়ন, ওয়াক্ফ সংরক্ষণ বা পরিচালনায় উপদেষ্টাদের সুচিন্তিত মতামত এখানে লিখে রাখুন।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConsultations.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          তারিখ: {toBanglaNumber(c.date)}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{c.topic}</h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          c.status === 'IMPLEMENTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status === 'IMPLEMENTED'
                          ? 'বাস্তবায়িত'
                          : c.status === 'IN_PROGRESS'
                          ? 'বাস্তবায়নাধীন'
                          : 'নথিভুক্ত'}
                      </span>
                    </div>

                    <div className="text-xs text-indigo-700 font-semibold flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>উপদেষ্টা: {c.advisorName}</span>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                      {c.advice}
                    </p>

                    {c.relatedContext && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">প্রেক্ষাপট:</span> {c.relatedContext}
                      </div>
                    )}

                    {c.impactOutcome && (
                      <div className="text-[11px] text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>ফলাফল / অগ্রগতি: {c.impactOutcome}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingConsultation(c);
                        setIsConsultationModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => handleDeleteConsultation(c.id, c.topic)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছুন</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Terms Tab */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">উপদেষ্টা পরিষদের মেয়াদকালসমূহ</h3>
              <p className="text-xs text-slate-500">উপদেষ্টা পরিষদ গঠনের সময়সীমা ও মেয়াদ পরিচালনা</p>
            </div>
            <button
              onClick={() => {
                setEditingTerm(null);
                setTermForm({ title: '', startDate: '', endDate: '', description: '' });
                setIsAddTermModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন মেয়াদকাল তৈরি করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {terms.map((term) => {
              const termAdvisorsCount = advisors.filter((a) => a.termId === term.id).length;
              return (
                <div
                  key={term.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    term.status === 'ACTIVE'
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{term.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        শুরু: {toBanglaNumber(term.startDate)} {term.endDate ? `• সমাপ্তি: ${toBanglaNumber(term.endDate)}` : ''}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${
                        term.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {term.status === 'ACTIVE' ? 'সক্রিয় মেয়াদ' : 'অতীত মেয়াদ'}
                    </span>
                  </div>

                  {term.description && (
                    <p className="text-xs text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-100">
                      {term.description}
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      এই মেয়াদে উপদেষ্টা: <strong className="text-indigo-700">{toBanglaNumber(termAdvisorsCount)} জন</strong>
                    </span>

                    <button
                      onClick={() => {
                        setEditingTerm(term);
                        setTermForm({
                          title: term.title,
                          startDate: term.startDate,
                          endDate: term.endDate || '',
                          description: term.description || '',
                        });
                        setIsAddTermModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-slate-700 hover:text-indigo-700 hover:bg-white rounded-lg transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>সম্পাদনা</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AdvisorFormModal
        isOpen={isAdvisorModalOpen}
        onClose={() => {
          setIsAdvisorModalOpen(false);
          setEditingAdvisor(null);
        }}
        onSubmit={handleSaveAdvisor}
        initialData={editingAdvisor}
        terms={terms}
      />

      <AdvisorProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedAdvisorForProfile(null);
        }}
        advisor={selectedAdvisorForProfile}
        terms={terms}
        allAdvisors={advisors}
        consultations={consultations}
        mosque={mosque}
        onEdit={(adv) => {
          setIsProfileModalOpen(false);
          setEditingAdvisor(adv);
          setIsAdvisorModalOpen(true);
        }}
        onAddConsultation={(advId) => {
          setIsProfileModalOpen(false);
          setEditingConsultation(null);
          setPreselectedAdvisorId(advId);
          setIsConsultationModalOpen(true);
        }}
      />

      <AdvisorConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => {
          setIsConsultationModalOpen(false);
          setEditingConsultation(null);
          setPreselectedAdvisorId(undefined);
        }}
        onSubmit={handleSaveConsultation}
        initialData={editingConsultation}
        advisors={advisors}
        preselectedAdvisorId={preselectedAdvisorId}
      />

      {/* Modal: Add/Edit Term */}
      {isAddTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingTerm ? 'উপদেষ্টা পরিষদ মেয়াদ সম্পাদনা' : 'নতুন পরিষদ মেয়াদ গঠন'}
              </h3>
              <button
                onClick={() => setIsAddTermModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveTerm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মেয়াদকাল শিরোনাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={termForm.title}
                  onChange={(e) => setTermForm({ ...termForm, title: e.target.value })}
                  placeholder="যেমন: ২০২৬–২০২৮ উপদেষ্টা পরিষদ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    শুরুর তারিখ
                  </label>
                  <input
                    type="date"
                    value={termForm.startDate}
                    onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সমাপ্তির তারিখ
                  </label>
                  <input
                    type="date"
                    value={termForm.endDate}
                    onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিবরণ / উদ্দেশ্য
                </label>
                <textarea
                  rows={2}
                  value={termForm.description}
                  onChange={(e) => setTermForm({ ...termForm, description: e.target.value })}
                  placeholder="পরিষদের রূপরেখা ও কার্যপরিধি..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTermModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs"
                >
                  {editingTerm ? 'আপডেট করুন' : 'তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          OFFICIAL ADVISORY COUNCIL LIST PRINT PREVIEW MODAL
          ============================================================ */}
      {isPrintCouncilModalOpen && (
        <div
          id="advisory-council-print-modal-wrapper"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto report-modal-print-wrapper"
        >
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto report-modal-print-card font-sans">
            {/* Modal Control Bar - hidden on print */}
            <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden print-controls-bar">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-siliguri text-white flex items-center space-x-2">
                    <span>উপদেষ্টা পরিষদ তালিকা প্রিন্ট প্রিভিউ</span>
                    <span className="bg-indigo-700/80 text-indigo-200 text-[11px] px-2 py-0.5 rounded-full font-bold font-mono">
                      {toBanglaNumber(printAdvisorsList.length)} জন
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    A4 সাইজে প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন
                  </p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                {/* Term Filter */}
                <select
                  id="select-print-term"
                  value={printTermFilter}
                  onChange={(e) => setPrintTermFilter(e.target.value)}
                  className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">সকল মেয়াদকাল</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                {/* Only Active Filter */}
                <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={printStatusOnlyActive}
                    onChange={(e) => setPrintStatusOnlyActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>সক্রিয় মাত্র</span>
                </label>

                {/* Letterhead Toggle */}
                <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showLetterhead}
                    onChange={(e) => setShowLetterhead(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>প্যাড সহ</span>
                </label>

                {/* CSV Download */}
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all border border-slate-700 cursor-pointer"
                  title="CSV এক্সপোর্ট"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSV</span>
                </button>

                {/* Main Print Button */}
                <button
                  id="btn-do-print-council-list"
                  type="button"
                  onClick={handleTriggerPrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট বা PDF সংরক্ষণ</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsPrintCouncilModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Document Paper Canvas */}
            <div className="p-4 sm:p-8 bg-slate-100/80 max-h-[80vh] overflow-y-auto print:p-0 print:bg-white print:max-h-none print:overflow-visible">
              <div
                id="advisory-council-print-document"
                ref={councilPrintRef}
                className="p-8 sm:p-10 max-w-[210mm] mx-auto bg-white text-slate-900 font-sans shadow-md print:shadow-none print:p-4 print:max-w-none border border-slate-300 print:border-none"
                style={{ width: '100%', minHeight: '297mm' }}
              >
                {/* Bismillah */}
                <div className="text-center font-arabic text-sm text-slate-700 mb-2">
                  بِسْمِ اللَّهِ الرَّحْمَٰনِ الرَّحِيمِ
                </div>

                {/* Official Letterhead (if showLetterhead is on) */}
                {showLetterhead ? (
                  <div className="text-center pb-4 border-b-2 border-slate-900">
                    <h1 className="text-2xl font-bold font-siliguri text-slate-900 tracking-tight">
                      {mosque?.name || 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট'}
                    </h1>
                    <p className="text-xs text-slate-600 mt-1">
                      {mosque?.address || 'মিরপুর, ঢাকা-১২১৬, বাংলাদেশ'}
                      {mosque?.phone && <span> • ফোন: {mosque.phone}</span>}
                      {mosque?.email && <span> • ইমেইল: {mosque.email}</span>}
                    </p>
                    <div className="mt-3 inline-block px-5 py-1.5 bg-slate-900 text-white text-xs font-bold font-siliguri rounded-md tracking-wider">
                      স্বতন্ত্র উপদেষ্টা পরিষদ — সম্মানিত উপদেষ্টাবৃন্দের পূর্ণাঙ্গ তালিকা
                    </div>
                  </div>
                ) : (
                  <div className="text-center pb-3 border-b-2 border-slate-800">
                    <div className="inline-block px-5 py-1.5 bg-slate-900 text-white text-xs font-bold font-siliguri rounded-md tracking-wider">
                      স্বতন্ত্র উপদেষ্টা পরিষদ — সম্মানিত উপদেষ্টাবৃন্দের তালিকা
                    </div>
                  </div>
                )}

                {/* Term & Meta Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-300 text-xs text-slate-800 gap-2">
                  <div>
                    <span className="font-bold text-slate-900">পরিষদ মেয়াদকাল:</span>{' '}
                    <span className="font-semibold text-indigo-900">
                      {activePrintTerm?.title || 'সার্বিক উপদেষ্টা পরিষদ'}
                    </span>
                    {activePrintTerm?.startDate && activePrintTerm?.endDate && (
                      <span className="text-slate-600 ml-1.5">
                        ({toBanglaNumber(activePrintTerm.startDate)} হতে {toBanglaNumber(activePrintTerm.endDate)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="font-bold text-slate-900">মোট উপদেষ্টা:</span>{' '}
                      <span className="font-bold text-indigo-900 font-mono">
                        {toBanglaNumber(printAdvisorsList.length)} জন
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">মুদ্রণ তারিখ:</span>{' '}
                      <span>{toBanglaNumber(new Date().toISOString().split('T')[0])}</span>
                    </div>
                  </div>
                </div>

                {/* Table of Advisors */}
                <div className="py-4">
                  {printAdvisorsList.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-300 rounded-lg">
                      কোনো উপদেষ্টা সদস্য পাওয়া যায়নি।
                    </div>
                  ) : (
                    <table className="w-full text-[11px] sm:text-xs border-collapse border border-slate-800" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-800 font-bold text-slate-900">
                          <th className="p-2 border-r border-slate-400 text-center" style={{ width: '6%' }}>ক্র.নং</th>
                          <th className="p-2 border-r border-slate-400 text-left" style={{ width: '22%' }}>উপদেষ্টার নাম ও পরিচয়</th>
                          <th className="p-2 border-r border-slate-400 text-left" style={{ width: '16%' }}>পরিষদে পদবি / দায়িত্ব</th>
                          <th className="p-2 border-r border-slate-400 text-left" style={{ width: '18%' }}>পেশা ও শিক্ষাগত যোগ্যতা</th>
                          <th className="p-2 border-r border-slate-400 text-center" style={{ width: '14%' }}>মোবাইল নম্বর</th>
                          <th className="p-2 border-r border-slate-400 text-center" style={{ width: '14%' }}>জাতীয় পরিচয়পত্র (NID)</th>
                          <th className="p-2 text-center" style={{ width: '10%' }}>স্ট্যাটাস</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {printAdvisorsList.map((adv, idx) => (
                          <tr key={adv.id} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-700">
                              {toBanglaNumber(idx + 1)}
                            </td>
                            <td className="p-2 border-r border-slate-300 font-medium text-slate-900">
                              <div className="font-bold text-slate-900">{adv.name}</div>
                              {adv.fatherName && (
                                <div className="text-[10px] text-slate-600">পিতা: {adv.fatherName}</div>
                              )}
                              {adv.address && (
                                <div className="text-[10px] text-slate-500 truncate">{adv.address}</div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-300 font-bold text-indigo-950">
                              {adv.advisorRole || 'উপদেষ্টা'}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-slate-700">
                              <div>{adv.occupation || '—'}</div>
                              {adv.education && (
                                <div className="text-[10px] text-slate-500">{adv.education}</div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-900">
                              {adv.phone}
                            </td>
                            <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-700">
                              {adv.nid || '—'}
                            </td>
                            <td className="p-2 text-center font-medium">
                              <span
                                className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  adv.status === 'ACTIVE'
                                    ? 'text-emerald-700 bg-emerald-50'
                                    : adv.status === 'HONORARY'
                                    ? 'text-amber-700 bg-amber-50'
                                    : 'text-slate-600 bg-slate-100'
                                }`}
                              >
                                {adv.status === 'ACTIVE'
                                  ? 'সক্রিয়'
                                  : adv.status === 'HONORARY'
                                  ? 'সম্মানসূচক'
                                  : 'নিষ্ক্রিয়'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Signatures */}
                <div className="pt-20 grid grid-cols-3 gap-6 text-center text-xs font-siliguri text-slate-800 print:pt-24 break-inside-avoid">
                  <div>
                    <div className="border-t border-slate-500 w-40 mx-auto pt-1.5 font-bold">
                      প্রধান উপদেষ্টা
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">সম্মানিত উপদেষ্টা পরিষদ</p>
                  </div>
                  <div>
                    <div className="border-t border-slate-500 w-40 mx-auto pt-1.5 font-bold">
                      সাধারণ সম্পাদক
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">কার্যনির্বাহী পরিচালনা পরিষদ</p>
                  </div>
                  <div>
                    <div className="border-t border-slate-500 w-40 mx-auto pt-1.5 font-bold">
                      সভাপতি / মোতাওয়াল্লী
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{mosque?.name || 'মামুন জামে মসজিদ'}</p>
                  </div>
                </div>

                {/* Document Footer Note */}
                <div className="pt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 mt-8 print:mt-12 flex justify-between items-center">
                  <span>মসজিদলেজার (MasjidLedger) • স্বতন্ত্র উপদেষ্টা পরিষদ মডিউল</span>
                  <span>অফিসিয়াল কপি</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

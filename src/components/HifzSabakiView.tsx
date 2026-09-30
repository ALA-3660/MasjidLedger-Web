import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  Eye,
  Edit,
  Award,
  AlertTriangle,
  Calendar,
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  HifzSabaki,
  HifzSabakiStatus,
  HifzSabakiPerformance,
  HifzSabak,
  HifzkhanaEnrollment,
  QuranSurah,
  QuranRangeResult,
} from '../types';
import { toBanglaNumber } from './CommitteeView';

interface HifzSabakiViewProps {
  currentMosque?: any;
  currentUser?: any;
  language?: string;
}

export const HifzSabakiView: React.FC<HifzSabakiViewProps> = ({
  currentMosque,
  currentUser,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [sabakis, setSabakis] = useState<HifzSabaki[]>([]);
  const [stats, setStats] = useState<any>({
    totalSabakis: 0,
    todaySabakisCount: 0,
    statusCounts: { ASSIGNED: 0, REVIEWED: 0, EVALUATED: 0, COMPLETED: 0, CANCELLED: 0 },
    performanceCounts: { EXCELLENT: 0, GOOD: 0, ACCEPTABLE: 0, NEEDS_IMPROVEMENT: 0, NOT_PASSED: 0 },
    totalAyahsReviewed: 0,
    studentCount: 0,
    ustadActivity: [],
  });
  const [activeEnrollments, setActiveEnrollments] = useState<HifzkhanaEnrollment[]>([]);
  const [eligibleUstads, setEligibleUstads] = useState<any[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [studentSabaks, setStudentSabaks] = useState<HifzSabak[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPerformance, setSelectedPerformance] = useState<string>('ALL');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');
  const [selectedUstadFilter, setSelectedUstadFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEvaluateModalOpen, setIsEvaluateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSabaki, setSelectedSabaki] = useState<HifzSabaki | null>(null);

  // New Sabaki Form
  const [newSabakiForm, setNewSabakiForm] = useState({
    enrollmentId: '',
    date: new Date().toISOString().split('T')[0],
    ustadId: '',
    sourceSabakId: '',
    startSurah: 1,
    startAyah: 1,
    endSurah: 1,
    endAyah: 7,
    status: 'ASSIGNED' as HifzSabakiStatus,
    remarks: '',
  });

  // Range preview state
  const [rangePreview, setRangePreview] = useState<QuranRangeResult | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isValidatingRange, setIsValidatingRange] = useState(false);

  // Evaluation Form
  const [evalForm, setEvalForm] = useState<{
    status: HifzSabakiStatus;
    performance: HifzSabakiPerformance;
    mistakeCount: number;
    remarks: string;
  }>({
    status: 'EVALUATED',
    performance: 'GOOD',
    mistakeCount: 0,
    remarks: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sabakiList, statsRes, enrollmentsRes, ustadsRes, surahsRes] = await Promise.all([
        api.getHifzSabakis(),
        api.getHifzSabakiStats().catch(() => null),
        api.getHifzEnrollments({ status: 'ACTIVE' }).catch(() => []),
        api.getHifzEligibleUstads().catch(() => []),
        api.getQuranSurahs().catch(() => []),
      ]);

      setSabakis(sabakiList);
      if (statsRes) setStats(statsRes);
      setActiveEnrollments(enrollmentsRes);
      setEligibleUstads(ustadsRes);
      setSurahs(surahsRes);

      if (enrollmentsRes.length > 0 && !newSabakiForm.enrollmentId) {
        const first = enrollmentsRes[0];
        setNewSabakiForm((prev) => ({
          ...prev,
          enrollmentId: first.id,
          ustadId: first.primaryUstadId || (ustadsRes[0]?.id ?? ''),
        }));
        // Load recent sabaks for first student
        loadStudentRecentSabaks(first.id);
      }
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'সবকী ডাটা লোড করতে ব্যর্থ হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentRecentSabaks = async (enrollmentId: string) => {
    try {
      const sabakList = await api.getHifzSabaks({ enrollmentId });
      setStudentSabaks(sabakList);
    } catch {
      setStudentSabaks([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Validate range preview using H2 API when start/end verse changes
  useEffect(() => {
    const startKey = `${newSabakiForm.startSurah}:${newSabakiForm.startAyah}`;
    const endKey = `${newSabakiForm.endSurah}:${newSabakiForm.endAyah}`;

    let isMounted = true;
    setIsValidatingRange(true);
    setRangeError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await api.getQuranRange(startKey, endKey);
        if (isMounted) {
          setRangePreview(res);
          setRangeError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setRangePreview(null);
          setRangeError(err.message || 'অবৈধ আয়াত রেঞ্জ');
        }
      } finally {
        if (isMounted) setIsValidatingRange(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [newSabakiForm.startSurah, newSabakiForm.startAyah, newSabakiForm.endSurah, newSabakiForm.endAyah]);

  // Handle enrollment selection change
  const handleEnrollmentChange = (eId: string) => {
    const enrollment = activeEnrollments.find((e) => e.id === eId);
    setNewSabakiForm((prev) => ({
      ...prev,
      enrollmentId: eId,
      ustadId: enrollment?.primaryUstadId || prev.ustadId,
      sourceSabakId: '',
    }));
    loadStudentRecentSabaks(eId);
  };

  // Handle Source Sabak Selection
  const handleSourceSabakChange = (sabakId: string) => {
    const chosenSabak = studentSabaks.find((s) => s.id === sabakId);
    if (chosenSabak) {
      setNewSabakiForm((prev) => {
        const [sSurah, sAyah] = chosenSabak.startVerseKey.split(':').map(Number);
        const [eSurah, eAyah] = chosenSabak.endVerseKey.split(':').map(Number);
        return {
          ...prev,
          sourceSabakId: sabakId,
          startSurah: sSurah || prev.startSurah,
          startAyah: sAyah || prev.startAyah,
          endSurah: eSurah || prev.endSurah,
          endAyah: eAyah || prev.endAyah,
          ustadId: chosenSabak.ustadId || prev.ustadId,
        };
      });
    } else {
      setNewSabakiForm((prev) => ({ ...prev, sourceSabakId: '' }));
    }
  };

  // Handle Create Sabaki
  const handleCreateSabaki = async (e: React.FormEvent) => {
    e.preventDefault();
    const startVerseKey = `${newSabakiForm.startSurah}:${newSabakiForm.startAyah}`;
    const endVerseKey = `${newSabakiForm.endSurah}:${newSabakiForm.endAyah}`;

    try {
      const res = await api.createHifzSabaki({
        enrollmentId: newSabakiForm.enrollmentId,
        date: newSabakiForm.date,
        ustadId: newSabakiForm.ustadId,
        sourceSabakId: newSabakiForm.sourceSabakId || undefined,
        startVerseKey,
        endVerseKey,
        status: newSabakiForm.status,
        remarks: newSabakiForm.remarks || undefined,
      });

      setFeedbackMessage({
        type: 'success',
        text: `সবকী সফলভাবে বরাদ্দ হয়েছে (সবকী #${res.sabakiId})।`,
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'সবকী বরাদ্দ করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  // Handle quick status change (e.g. mark REVIEWED)
  const handleQuickStatusChange = async (sabaki: HifzSabaki, targetStatus: HifzSabakiStatus) => {
    try {
      await api.updateHifzSabakiStatus(sabaki.id, targetStatus);
      setFeedbackMessage({
        type: 'success',
        text: `সবকী #${sabaki.sabakiId} সফলভাবে '${targetStatus}' করা হয়েছে।`,
      });
      loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'স্ট্যাটাস হালনাগাদ করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  // Open evaluation modal
  const openEvaluateModal = (sabaki: HifzSabaki) => {
    setSelectedSabaki(sabaki);
    setEvalForm({
      status: sabaki.status === 'COMPLETED' ? 'COMPLETED' : 'EVALUATED',
      performance: sabaki.performance || 'GOOD',
      mistakeCount: sabaki.mistakeCount ?? 0,
      remarks: sabaki.remarks || '',
    });
    setIsEvaluateModalOpen(true);
  };

  // Submit evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSabaki) return;
    try {
      await api.updateHifzSabakiStatus(
        selectedSabaki.id,
        evalForm.status,
        evalForm.performance,
        Number(evalForm.mistakeCount),
        evalForm.remarks || undefined
      );
      setFeedbackMessage({
        type: 'success',
        text: `সবকী #${selectedSabaki.sabakiId} মূল্যায়ন সফলভাবে সংরক্ষিত হয়েছে।`,
      });
      setIsEvaluateModalOpen(false);
      setSelectedSabaki(null);
      loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'মূল্যায়ন সংরক্ষণ করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  // Filtered Sabakis
  const filteredSabakis = sabakis.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.sabakiId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentName && s.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.ustadName && s.ustadName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.sourceSabakDisplayId && s.sourceSabakDisplayId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.startSurahNameBn && s.startSurahNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.endSurahNameBn && s.endSurahNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.remarks && s.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDate = !selectedDate || s.date === selectedDate;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    const matchesPerformance = selectedPerformance === 'ALL' || s.performance === selectedPerformance;
    const matchesStudent = selectedStudentFilter === 'ALL' || s.studentId === selectedStudentFilter;
    const matchesUstad = selectedUstadFilter === 'ALL' || s.ustadId === selectedUstadFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesPerformance && matchesStudent && matchesUstad;
  });

  const getStatusBadge = (status: HifzSabakiStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">বরাদ্দকৃত</span>;
      case 'REVIEWED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">পঠিত/শুনানি</span>;
      case 'EVALUATED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">মূল্যায়িত</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">উত্তীর্ণ/সম্পন্ন</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">বাতিলকৃত</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getPerformanceBadge = (perf?: HifzSabakiPerformance) => {
    switch (perf) {
      case 'EXCELLENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-tiro">চমৎকার (মুমতাজ)</span>;
      case 'GOOD':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 font-tiro">উত্তম (জাইয়্যিদ জিদ্দান)</span>;
      case 'ACCEPTABLE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 font-tiro">সন্তোষজনক (জাইয়্যিদ)</span>;
      case 'NEEDS_IMPROVEMENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 font-tiro">উন্নতি প্রয়োজন (মাকবুল)</span>;
      case 'NOT_PASSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 font-tiro">পুনরাবৃত্তি প্রয়োজন (রাসিব)</span>;
      default:
        return <span className="text-xs text-slate-400 font-tiro">অপেক্ষমান</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
              H3-B SABAKI FOUNDATION
            </span>
            <span className="text-xs text-slate-400 font-tiro">সাম্প্রতিক মুখস্থ অংশ নিয়মিত পুনরালোচনা ও নিরীক্ষণ</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 font-hind mt-1 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-700" />
            <span>হিফজ সবকী ব্যবস্থাপনা ও দৈনিক শুনানি (Sabaki)</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="রিফ্রেশ"
            className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-semibold font-tiro shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সবকী বরাদ্দ</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-tiro flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline hover:opacity-75 ml-4"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* STATS METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-tiro mb-1">মোট সবকী রেকর্ড</div>
          <div className="text-2xl font-bold text-slate-900 font-baloo">
            {toBanglaNumber(stats.totalSabakis || sabakis.length)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-tiro">
            শিক্ষার্থী সংখ্যা: {toBanglaNumber(stats.studentCount || 0)} জন
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <div className="text-xs text-indigo-700 font-tiro mb-1">আজকের সবকী</div>
          <div className="text-2xl font-bold text-indigo-900 font-baloo">
            {toBanglaNumber(stats.todaySabakisCount || 0)}
          </div>
          <div className="text-[11px] text-indigo-600 mt-1 font-tiro">
            বরাদ্দকৃত: {toBanglaNumber(stats.statusCounts?.ASSIGNED || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs text-blue-700 font-tiro mb-1">শুনানি/পর্যালোচিত</div>
          <div className="text-2xl font-bold text-blue-900 font-baloo">
            {toBanglaNumber((stats.statusCounts?.REVIEWED || 0) + (stats.statusCounts?.EVALUATED || 0))}
          </div>
          <div className="text-[11px] text-blue-600 mt-1 font-tiro">
            মূল্যায়িত: {toBanglaNumber(stats.statusCounts?.EVALUATED || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs text-emerald-700 font-tiro mb-1">উত্তীর্ণ/সম্পন্ন</div>
          <div className="text-2xl font-bold text-emerald-900 font-baloo">
            {toBanglaNumber(stats.statusCounts?.COMPLETED || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-tiro">
            মুমতাজ/উত্তম: {toBanglaNumber((stats.performanceCounts?.EXCELLENT || 0) + (stats.performanceCounts?.GOOD || 0))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-tiro mb-1">মোট পঠিত আয়াত</div>
          <div className="text-2xl font-bold text-slate-800 font-baloo">
            {toBanglaNumber(stats.totalAyahsReviewed || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-tiro">
            কুরআন রেফারেন্স H2 ভেরিফাইড
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 font-tiro">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="সবকী আইডি, শিক্ষার্থী, উস্তাদ বা সূরা খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-sans focus:outline-hidden focus:border-indigo-600"
            />
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
              title="তারিখ ফিল্টার"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="ALL">সকল অবস্থা (Status)</option>
              <option value="ASSIGNED">বরাদ্দকৃত (ASSIGNED)</option>
              <option value="REVIEWED">শুনানি (REVIEWED)</option>
              <option value="EVALUATED">মূল্যায়িত (EVALUATED)</option>
              <option value="COMPLETED">সম্পন্ন (COMPLETED)</option>
              <option value="CANCELLED">বাতিলকৃত (CANCELLED)</option>
            </select>
          </div>

          {/* Performance Filter */}
          <div>
            <select
              value={selectedPerformance}
              onChange={(e) => setSelectedPerformance(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="ALL">সকল মূল্যায়ন</option>
              <option value="EXCELLENT">চমৎকার (মুমতাজ)</option>
              <option value="GOOD">উত্তম (জাইয়্যিদ জিদ্দান)</option>
              <option value="ACCEPTABLE">সন্তোষজনক (জাইয়্যিদ)</option>
              <option value="NEEDS_IMPROVEMENT">উন্নতি প্রয়োজন (মাকবুল)</option>
              <option value="NOT_PASSED">পুনরাবৃত্তি প্রয়োজন (রাসিব)</option>
            </select>
          </div>

          {/* Student Filter */}
          <div>
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="ALL">সকল শিক্ষার্থী</option>
              {activeEnrollments.map((e) => (
                <option key={e.id} value={e.studentId}>
                  {e.studentName} ({e.studentId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedDate || selectedStatus !== 'ALL' || selectedPerformance !== 'ALL' || selectedStudentFilter !== 'ALL' || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              ফিল্টারকৃত সবকী ফলাফল: <strong className="font-baloo text-indigo-900">{toBanglaNumber(filteredSabakis.length)}</strong> টি
            </span>
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedStatus('ALL');
                setSelectedPerformance('ALL');
                setSelectedStudentFilter('ALL');
                setSelectedUstadFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-700 hover:underline font-semibold"
            >
              ফিল্টার রিসেট করুন
            </button>
          </div>
        )}
      </div>

      {/* SABAKI LIST TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden font-tiro">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-hind">
              <tr>
                <th className="p-3">সবকী আইডি ও তারিখ</th>
                <th className="p-3">শিক্ষার্থী (আইডি ও নাম)</th>
                <th className="p-3">রেফারেন্স সবক</th>
                <th className="p-3">কুরআন পরিসীমা (আয়াত ও সূরা)</th>
                <th className="p-3">উস্তাদ</th>
                <th className="p-3">অবস্থা</th>
                <th className="p-3">মূল্যায়ন ও ভুল</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSabakis.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>কোনো সবকী রেকর্ড পাওয়া যায়নি।</span>
                  </td>
                </tr>
              ) : (
                filteredSabakis.map((sabaki) => (
                  <tr key={sabaki.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-mono font-bold text-indigo-900">{sabaki.sabakiId}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{sabaki.date}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{sabaki.studentName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{sabaki.studentId}</div>
                    </td>
                    <td className="p-3">
                      {sabaki.sourceSabakDisplayId ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-800 font-mono text-[11px] font-semibold">
                          {sabaki.sourceSabakDisplayId}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">স্বতন্ত্র সবকী</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">
                        {sabaki.startSurahNameBn === sabaki.endSurahNameBn
                          ? `সূরা ${sabaki.startSurahNameBn}`
                          : `সূরা ${sabaki.startSurahNameBn} হতে ${sabaki.endSurahNameBn}`}
                      </div>
                      <div className="font-mono text-[11px] text-indigo-700 font-semibold">
                        আয়াত {sabaki.startVerseKey} ➔ {sabaki.endVerseKey}
                        <span className="text-slate-400 ml-1">({toBanglaNumber(sabaki.totalAyahs)} আয়াত)</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-700">{sabaki.ustadName || 'অনির্ধারিত'}</div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(sabaki.status)}
                    </td>
                    <td className="p-3">
                      <div>{getPerformanceBadge(sabaki.performance)}</div>
                      {sabaki.mistakeCount !== undefined && sabaki.mistakeCount > 0 && (
                        <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                          ভুল: {toBanglaNumber(sabaki.mistakeCount)} টি
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedSabaki(sabaki);
                          setIsDetailModalOpen(true);
                        }}
                        title="বিস্তারিত দেখুন"
                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {sabaki.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleQuickStatusChange(sabaki, 'REVIEWED')}
                          title="শুনানি সম্পন্ন হিসেবে মার্ক করুন"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {sabaki.status !== 'CANCELLED' && (
                        <button
                          onClick={() => openEvaluateModal(sabaki)}
                          title="মূল্যায়ন ও ফলাফল সংরক্ষণ"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD SABAKI ASSIGNMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-hind flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-700" />
                <span>নতুন সবকী বরাদ্দ (H3-B Sabaki Assignment)</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSabaki} className="space-y-4 mt-4 font-tiro text-xs">
              {/* Student Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  শিক্ষার্থী নির্বাচন (Active Hifz Enrollment) *
                </label>
                <select
                  required
                  value={newSabakiForm.enrollmentId}
                  onChange={(e) => handleEnrollmentChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- সক্রিয় শিক্ষার্থী নির্বাচন করুন --</option>
                  {activeEnrollments.map((enr) => (
                    <option key={enr.id} value={enr.id}>
                      {enr.studentName} ({enr.studentId}) — {enr.enrollmentId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Sabak Optional Selector */}
              {studentSabaks.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    রেফারেন্স মূল সবক (ঐচ্ছিক - পূর্ববর্তী সবক হতে তথ্য নিতে পারেন)
                  </label>
                  <select
                    value={newSabakiForm.sourceSabakId}
                    onChange={(e) => handleSourceSabakChange(e.target.value)}
                    className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/20 rounded-lg text-xs"
                  >
                    <option value="">-- কোনো নির্দিষ্ট মূল সবক ছাড়া স্বতন্ত্র নির্ধারণ --</option>
                    {studentSabaks.map((sbk) => (
                      <option key={sbk.id} value={sbk.id}>
                        {sbk.sabakId} ({sbk.date}) — সূরা {sbk.startSurahNameBn || ''} ({sbk.startVerseKey} হতে {sbk.endVerseKey})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date & Ustad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সবকী শুনানির তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={newSabakiForm.date}
                    onChange={(e) => setNewSabakiForm({ ...newSabakiForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">দায়িত্বপ্রাপ্ত উস্তাদ *</label>
                  <select
                    required
                    value={newSabakiForm.ustadId}
                    onChange={(e) => setNewSabakiForm({ ...newSabakiForm, ustadId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- উস্তাদ নির্বাচন করুন --</option>
                    {eligibleUstads.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.designation || 'শিক্ষক'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quran Reference Range Selection */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 font-hind">
                  <Sparkles className="w-4 h-4 text-indigo-700" />
                  <span>কুরআন রেফারেন্স রেঞ্জ (Authoritative H2 Resolver)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Surah & Ayah */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-600">শুরুর সূরা ও আয়াত</label>
                    <select
                      value={newSabakiForm.startSurah}
                      onChange={(e) => {
                        const sNum = Number(e.target.value);
                        setNewSabakiForm({
                          ...newSabakiForm,
                          startSurah: sNum,
                          endSurah: sNum < newSabakiForm.endSurah ? newSabakiForm.endSurah : sNum,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    >
                      {surahs.map((s) => (
                        <option key={s.number} value={s.number}>
                          {toBanglaNumber(s.number)}. {s.nameBn} ({s.nameArabic})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">আয়াত নং:</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newSabakiForm.startAyah}
                        onChange={(e) => setNewSabakiForm({ ...newSabakiForm, startAyah: Number(e.target.value) })}
                        className="w-20 px-2 py-1 border border-slate-200 rounded-lg font-mono text-xs text-center"
                      />
                    </div>
                  </div>

                  {/* End Surah & Ayah */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-600">শেষের সূরা ও আয়াত</label>
                    <select
                      value={newSabakiForm.endSurah}
                      onChange={(e) => setNewSabakiForm({ ...newSabakiForm, endSurah: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                    >
                      {surahs.map((s) => (
                        <option key={s.number} value={s.number}>
                          {toBanglaNumber(s.number)}. {s.nameBn} ({s.nameArabic})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">আয়াত নং:</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newSabakiForm.endAyah}
                        onChange={(e) => setNewSabakiForm({ ...newSabakiForm, endAyah: Number(e.target.value) })}
                        className="w-20 px-2 py-1 border border-slate-200 rounded-lg font-mono text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Range Live Preview */}
                <div className="pt-2 border-t border-slate-200">
                  {isValidatingRange ? (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>কুরআন রেফারেন্স রেঞ্জ যাচাই করা হচ্ছে...</span>
                    </div>
                  ) : rangeError ? (
                    <div className="text-xs text-rose-600 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{rangeError}</span>
                    </div>
                  ) : rangePreview ? (
                    <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-indigo-950">
                          {rangePreview.startSurah.nameBn} ({newSabakiForm.startSurah}:{newSabakiForm.startAyah}) হতে{' '}
                          {rangePreview.endSurah.nameBn} ({newSabakiForm.endSurah}:{newSabakiForm.endAyah})
                        </div>
                        <div className="text-[11px] text-indigo-700">
                          পারা {toBanglaNumber(rangePreview.startJuz)} • পৃষ্ঠা {toBanglaNumber(rangePreview.startPage)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-900 font-baloo text-sm">
                          {toBanglaNumber(rangePreview.totalAyahs)} আয়াত
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">মন্তব্য / বিশেষ দিকনির্দেশনা (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  value={newSabakiForm.remarks}
                  onChange={(e) => setNewSabakiForm({ ...newSabakiForm, remarks: e.target.value })}
                  placeholder="যেমন: তাজভীদ ও মাদ্দের নিয়ম সতর্কতার সাথে পর্যালোচনা করতে হবে..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!rangePreview || !!rangeError}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  সবকী সংরক্ষণ ও বরাদ্দ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EVALUATE SABAKI */}
      {isEvaluateModalOpen && selectedSabaki && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 font-hind flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-700" />
                <span>সবকী মূল্যায়ন ও শুনানি ফলাফল (#{selectedSabaki.sabakiId})</span>
              </h2>
              <button
                onClick={() => setIsEvaluateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4 mt-4 font-tiro text-xs">
              {/* Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 text-sm">{selectedSabaki.studentName}</div>
                <div className="text-slate-500">
                  সূরা {selectedSabaki.startSurahNameBn} ({selectedSabaki.startVerseKey} ➔ {selectedSabaki.endVerseKey}) •{' '}
                  {toBanglaNumber(selectedSabaki.totalAyahs)} আয়াত
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সবকী স্ট্যাটাস *</label>
                <select
                  value={evalForm.status}
                  onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value as HifzSabakiStatus })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="REVIEWED">পঠিত/শুনানি গৃহীত (REVIEWED)</option>
                  <option value="EVALUATED">মূল্যায়িত (EVALUATED)</option>
                  <option value="COMPLETED">সফলভাবে উত্তীর্ণ ও সম্পন্ন (COMPLETED)</option>
                  <option value="CANCELLED">বাতিল (CANCELLED)</option>
                </select>
              </div>

              {/* Performance */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">পারফরম্যান্স মান (Performance) *</label>
                <select
                  value={evalForm.performance}
                  onChange={(e) => setEvalForm({ ...evalForm, performance: e.target.value as HifzSabakiPerformance })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="EXCELLENT">চমৎকার (মুমতাজ - কোনো বড় ভুল ছাড়া নিখুঁত)</option>
                  <option value="GOOD">উত্তম (জাইয়্যিদ জিদ্দান - সাধারণ ১/২টি সংশোধন)</option>
                  <option value="ACCEPTABLE">সন্তোষজনক (জাইয়্যিদ - মাঝারি মানের)</option>
                  <option value="NEEDS_IMPROVEMENT">উন্নতি প্রয়োজন (মাকবুল - পুনরায় অনুশীলন দরকার)</option>
                  <option value="NOT_PASSED">পুনরাবৃত্তি প্রয়োজন (রাসিব - আগামীকাল আবার শুনানি)</option>
                </select>
              </div>

              {/* Mistake Count */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ভুল/লুকমার সংখ্যা (Mistake Count)</label>
                <input
                  type="number"
                  min="0"
                  value={evalForm.mistakeCount}
                  onChange={(e) => setEvalForm({ ...evalForm, mistakeCount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">মূল্যায়ন মন্তব্য / শিক্ষকের পর্যবেক্ষণ</label>
                <textarea
                  rows={3}
                  value={evalForm.remarks}
                  onChange={(e) => setEvalForm({ ...evalForm, remarks: e.target.value })}
                  placeholder="শুনানির বিশেষ পর্যবেক্ষণ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEvaluateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  মূল্যায়ন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SABAKI DETAILS */}
      {isDetailModalOpen && selectedSabaki && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto font-tiro text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono font-bold text-indigo-900 text-sm">#{selectedSabaki.sabakiId}</span>
                <h2 className="text-base font-bold text-slate-900 font-hind">সবকী সম্পূর্ণ বিবরণ</h2>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">শিক্ষার্থী:</span>
                <span className="font-semibold text-slate-800">{selectedSabaki.studentName} ({selectedSabaki.studentId})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">তারিখ:</span>
                <span className="font-mono font-semibold">{selectedSabaki.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">রেফারেন্স মূল সবক:</span>
                <span className="font-mono font-semibold text-indigo-800">{selectedSabaki.sourceSabakDisplayId || 'স্বতন্ত্র'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">কুরআন রেঞ্জ:</span>
                <span className="font-mono font-semibold text-indigo-900">
                  {selectedSabaki.startVerseKey} ➔ {selectedSabaki.endVerseKey} ({toBanglaNumber(selectedSabaki.totalAyahs)} আয়াত)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">উস্তাদ:</span>
                <span className="font-semibold text-slate-800">{selectedSabaki.ustadName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">স্ট্যাটাস:</span>
                <span>{getStatusBadge(selectedSabaki.status)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">মূল্যায়ন মান:</span>
                <span>{getPerformanceBadge(selectedSabaki.performance)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400">ভুল সংখ্যা:</span>
                <span className="font-semibold">{toBanglaNumber(selectedSabaki.mistakeCount ?? 0)} টি</span>
              </div>
              {selectedSabaki.remarks && (
                <div className="py-1.5">
                  <span className="text-slate-400 block mb-1">মন্তব্য:</span>
                  <p className="bg-slate-50 p-2.5 rounded-lg text-slate-700 leading-relaxed border border-slate-100">
                    {selectedSabaki.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 mt-4 border-t border-slate-100">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

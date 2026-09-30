import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Edit,
  Award,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  GraduationCap,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  HifzSabak,
  HifzSabakStatus,
  HifzSabakPerformance,
  HifzkhanaEnrollment,
  QuranSurah,
  QuranRangeResult,
} from '../types';
import { toBanglaNumber } from './CommitteeView';

interface HifzSabakViewProps {
  currentMosque?: any;
  currentUser?: any;
  language?: string;
}

export const HifzSabakView: React.FC<HifzSabakViewProps> = ({
  currentMosque,
  currentUser,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [sabaks, setSabaks] = useState<HifzSabak[]>([]);
  const [stats, setStats] = useState<any>({
    todayTotal: 0,
    todayAssigned: 0,
    todayPresented: 0,
    todayEvaluated: 0,
    todayCompleted: 0,
    todayNeedsImprovement: 0,
    totalAllTime: 0,
    totalCompletedAllTime: 0,
  });
  const [activeEnrollments, setActiveEnrollments] = useState<HifzkhanaEnrollment[]>([]);
  const [eligibleUstads, setEligibleUstads] = useState<any[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPerformance, setSelectedPerformance] = useState<string>('ALL');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEvaluateModalOpen, setIsEvaluateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSabak, setSelectedSabak] = useState<HifzSabak | null>(null);

  // New Sabak Form
  const [newSabakForm, setNewSabakForm] = useState({
    enrollmentId: '',
    date: new Date().toISOString().split('T')[0],
    ustadId: '',
    startSurah: 1,
    startAyah: 1,
    endSurah: 1,
    endAyah: 7,
    status: 'ASSIGNED' as HifzSabakStatus,
    remarks: '',
  });

  // Range preview state
  const [rangePreview, setRangePreview] = useState<QuranRangeResult | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [isValidatingRange, setIsValidatingRange] = useState(false);

  // Evaluation Form
  const [evalForm, setEvalForm] = useState<{
    status: HifzSabakStatus;
    performance: HifzSabakPerformance;
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
      const [sabakList, statsRes, enrollmentsRes, ustadsRes, surahsRes] = await Promise.all([
        api.getHifzSabaks(),
        api.getHifzSabakStats().catch(() => null),
        api.getHifzEnrollments({ status: 'ACTIVE' }).catch(() => []),
        api.getHifzEligibleUstads().catch(() => []),
        api.getQuranSurahs().catch(() => []),
      ]);

      setSabaks(sabakList);
      if (statsRes) setStats(statsRes);
      setActiveEnrollments(enrollmentsRes);
      setEligibleUstads(ustadsRes);
      setSurahs(surahsRes);

      if (enrollmentsRes.length > 0 && !newSabakForm.enrollmentId) {
        const first = enrollmentsRes[0];
        setNewSabakForm((prev) => ({
          ...prev,
          enrollmentId: first.id,
          ustadId: first.primaryUstadId || (ustadsRes[0]?.id ?? ''),
        }));
      }
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'সবক ডাটা লোড করতে ব্যর্থ হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Validate range preview using H2 API when start/end verse changes
  useEffect(() => {
    const startKey = `${newSabakForm.startSurah}:${newSabakForm.startAyah}`;
    const endKey = `${newSabakForm.endSurah}:${newSabakForm.endAyah}`;

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
  }, [newSabakForm.startSurah, newSabakForm.startAyah, newSabakForm.endSurah, newSabakForm.endAyah]);

  // Handle enrollment selection change
  const handleEnrollmentChange = (eId: string) => {
    const enrollment = activeEnrollments.find((e) => e.id === eId);
    setNewSabakForm((prev) => ({
      ...prev,
      enrollmentId: eId,
      ustadId: enrollment?.primaryUstadId || prev.ustadId,
    }));
  };

  // Handle Create Sabak
  const handleCreateSabak = async (e: React.FormEvent) => {
    e.preventDefault();
    const startVerseKey = `${newSabakForm.startSurah}:${newSabakForm.startAyah}`;
    const endVerseKey = `${newSabakForm.endSurah}:${newSabakForm.endAyah}`;

    try {
      const res = await api.createHifzSabak({
        enrollmentId: newSabakForm.enrollmentId,
        date: newSabakForm.date,
        ustadId: newSabakForm.ustadId,
        startVerseKey,
        endVerseKey,
        status: newSabakForm.status,
        remarks: newSabakForm.remarks || undefined,
      });

      setFeedbackMessage({
        type: 'success',
        text: `সবক সফলভাবে বরাদ্দ হয়েছে (সবক #${res.sabakId})।`,
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'সবক বরাদ্দ করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  // Handle quick status change (e.g. mark PRESENTED)
  const handleQuickStatusChange = async (sabak: HifzSabak, targetStatus: HifzSabakStatus) => {
    try {
      await api.updateHifzSabakStatus(sabak.id, targetStatus);
      setFeedbackMessage({
        type: 'success',
        text: `সবক #${sabak.sabakId} সফলভাবে '${targetStatus}' করা হয়েছে।`,
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
  const openEvaluateModal = (sabak: HifzSabak) => {
    setSelectedSabak(sabak);
    setEvalForm({
      status: sabak.status === 'COMPLETED' ? 'COMPLETED' : 'EVALUATED',
      performance: sabak.performance || 'GOOD',
      mistakeCount: sabak.mistakeCount ?? 0,
      remarks: sabak.remarks || '',
    });
    setIsEvaluateModalOpen(true);
  };

  // Submit evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSabak) return;
    try {
      await api.updateHifzSabakStatus(
        selectedSabak.id,
        evalForm.status,
        evalForm.performance,
        Number(evalForm.mistakeCount),
        evalForm.remarks || undefined
      );
      setFeedbackMessage({
        type: 'success',
        text: `সবক #${selectedSabak.sabakId} মূল্যায়ন সফলভাবে সংরক্ষিত হয়েছে।`,
      });
      setIsEvaluateModalOpen(false);
      setSelectedSabak(null);
      loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'মূল্যায়ন সংরক্ষণ করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  // Filtered Sabaks
  const filteredSabaks = sabaks.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.sabakId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentName && s.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.ustadName && s.ustadName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.startSurahNameBn && s.startSurahNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.endSurahNameBn && s.endSurahNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.remarks && s.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDate = !selectedDate || s.date === selectedDate;
    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    const matchesPerformance = selectedPerformance === 'ALL' || s.performance === selectedPerformance;
    const matchesStudent = selectedStudentFilter === 'ALL' || s.studentId === selectedStudentFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesPerformance && matchesStudent;
  });

  const getStatusBadge = (status: HifzSabakStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">বরাদ্দকৃত</span>;
      case 'PRESENTED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">উপস্থাপিত</span>;
      case 'EVALUATED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">মূল্যায়িত</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">সম্পন্ন</span>;
      case 'CANCELLED':
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">বাতিলকৃত</span>;
    }
  };

  const getPerformanceBadge = (perf?: HifzSabakPerformance) => {
    if (!perf) return <span className="text-slate-400 text-xs">—</span>;
    switch (perf) {
      case 'EXCELLENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">মুমতায (অনবদ্য)</span>;
      case 'GOOD':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">জায়্যিদ জিদ্দান (উত্তম)</span>;
      case 'ACCEPTABLE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">জায়্যিদ (গ্রহণযোগ্য)</span>;
      case 'NEEDS_IMPROVEMENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">মাকবুল (উন্নতি চাই)</span>;
      case 'NOT_PASSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">রাসিব (পুনঃপড়তে হবে)</span>;
      default:
        return <span className="text-slate-500 text-xs">{perf}</span>;
    }
  };

  const currentStartSurah = surahs.find((s) => s.surahNumber === newSabakForm.startSurah);
  const currentEndSurah = surahs.find((s) => s.surahNumber === newSabakForm.endSurah);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-hind flex items-center gap-2.5">
            <BookMarked className="w-6 h-6 text-teal-700" />
            <span>সবক ব্যবস্থাপনা (H3-A Sabak Foundation)</span>
          </h1>
          <p className="text-xs text-slate-500 font-tiro mt-0.5">
            হিফজ শিক্ষার্থীদের দৈনিক নতুন সবক বরাদ্দ, উপস্থাপন, মূল্যায়ন ও অগ্রগতি ট্র্যাকিং
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="রিফ্রেশ"
            className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সবক বরাদ্দ</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between font-tiro text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-700" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline text-slate-500 hover:text-slate-800"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Metric Cards (Section 28) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-tiro block">আজকের মোট সবক</span>
          <p className="text-xl font-bold font-baloo text-slate-900 mt-1">
            {toBanglaNumber(stats.todayTotal || 0)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-amber-700 font-tiro block">বরাদ্দকৃত (Assigned)</span>
          <p className="text-xl font-bold font-baloo text-amber-700 mt-1">
            {toBanglaNumber(stats.todayAssigned || 0)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-blue-700 font-tiro block">উপস্থাপিত (Presented)</span>
          <p className="text-xl font-bold font-baloo text-blue-700 mt-1">
            {toBanglaNumber(stats.todayPresented || 0)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-purple-700 font-tiro block">মূল্যায়িত (Evaluated)</span>
          <p className="text-xl font-bold font-baloo text-purple-700 mt-1">
            {toBanglaNumber(stats.todayEvaluated || 0)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-emerald-700 font-tiro block">সম্পন্ন (Completed)</span>
          <p className="text-xl font-bold font-baloo text-emerald-700 mt-1">
            {toBanglaNumber(stats.todayCompleted || 0)}
          </p>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-rose-700 font-tiro block">উন্নতি চাই (Needs Work)</span>
          <p className="text-xl font-bold font-baloo text-rose-700 mt-1">
            {toBanglaNumber(stats.todayNeedsImprovement || 0)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="শিক্ষার্থী, আইডি, সূরা বা মন্তব্য দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="ASSIGNED">বরাদ্দকৃত (ASSIGNED)</option>
              <option value="PRESENTED">উপস্থাপিত (PRESENTED)</option>
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">সকল মূল্যায়ন</option>
              <option value="EXCELLENT">মুমতায (EXCELLENT)</option>
              <option value="GOOD">জায়্যিদ জিদ্দান (GOOD)</option>
              <option value="ACCEPTABLE">জায়্যিদ (ACCEPTABLE)</option>
              <option value="NEEDS_IMPROVEMENT">মাকবুল (NEEDS_IMPROVEMENT)</option>
              <option value="NOT_PASSED">রাসিব (NOT_PASSED)</option>
            </select>
          </div>
        </div>

        {(searchQuery || selectedDate || selectedStatus !== 'ALL' || selectedPerformance !== 'ALL') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
            <span>ফিল্টার প্রযোজ্য: {toBanglaNumber(filteredSabaks.length)}টি সবক প্রদর্শিত</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDate('');
                setSelectedStatus('ALL');
                setSelectedPerformance('ALL');
              }}
              className="text-teal-700 hover:underline"
            >
              ফিল্টার মুছুন
            </button>
          </div>
        )}
      </div>

      {/* Sabak Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-tiro">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold">
              <tr>
                <th className="p-3.5">তারিখ ও আইডি</th>
                <th className="p-3.5">শিক্ষার্থী</th>
                <th className="p-3.5">নির্ধারিত উস্তাদ</th>
                <th className="p-3.5">কুরআন সবক রেঞ্জ (H2)</th>
                <th className="p-3.5">আয়াত সংখ্যা</th>
                <th className="p-3.5">স্ট্যাটাস</th>
                <th className="p-3.5">মূল্যায়ন ও ভুল</th>
                <th className="p-3.5 text-right">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSabaks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-tiro">
                    কোনো সবক রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredSabaks.map((sabak) => (
                  <tr key={sabak.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-900 block font-mono text-xs">
                        {sabak.sabakId}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {sabak.date}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-900 block">
                        {sabak.studentName || '—'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {sabak.studentId}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sabak.ustadName || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-900">
                        {sabak.startSurahNameBn || `সূরা ${sabak.startSurahNumber}`}
                        {sabak.startSurahNumber !== sabak.endSurahNumber &&
                          ` ➔ ${sabak.endSurahNameBn || `সূরা ${sabak.endSurahNumber}`}`}
                      </div>
                      <div className="text-xs text-teal-800 font-mono mt-0.5">
                        {sabak.startVerseKey} ➔ {sabak.endVerseKey}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-800">
                        {toBanglaNumber(sabak.totalAyahs)} আয়াত
                      </span>
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(sabak.status)}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div>{getPerformanceBadge(sabak.performance)}</div>
                        {sabak.mistakeCount !== undefined && sabak.mistakeCount > 0 && (
                          <span className="text-[11px] text-rose-700 font-medium block">
                            ভুল: {toBanglaNumber(sabak.mistakeCount)}টি
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Action: Mark Presented */}
                        {sabak.status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleQuickStatusChange(sabak, 'PRESENTED')}
                            title="উপস্থাপন হিসেবে চিহ্নিত করুন"
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-medium transition-colors"
                          >
                            উপস্থাপন
                          </button>
                        )}

                        {/* Evaluate button */}
                        {sabak.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openEvaluateModal(sabak)}
                            title="মূল্যায়ন বা স্ট্যাটাস আপডেট"
                            className="px-2 py-1 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md font-medium transition-colors flex items-center gap-1"
                          >
                            <Award className="w-3 h-3" />
                            <span>মূল্যায়ন</span>
                          </button>
                        )}

                        {/* Detail view */}
                        <button
                          onClick={() => {
                            setSelectedSabak(sabak);
                            setIsDetailModalOpen(true);
                          }}
                          title="বিস্তারিত বিবরণ"
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CREATE NEW SABAK ASSIGNMENT                           */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-teal-700" />
                <h3 className="text-lg font-bold text-slate-900 font-hind">
                  নতুন সবক বরাদ্দ করুন
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSabak} className="mt-4 space-y-4 font-tiro text-sm">
              {/* Student & Ustad Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    শিক্ষার্থী নির্বাচন (সক্রিয় ভর্তি) *
                  </label>
                  <select
                    required
                    value={newSabakForm.enrollmentId}
                    onChange={(e) => handleEnrollmentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">— শিক্ষার্থী নির্বাচন করুন —</option>
                    {activeEnrollments.map((enr) => (
                      <option key={enr.id} value={enr.id}>
                        {enr.studentName} ({enr.studentId}) — #{enr.enrollmentId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    দায়িত্বপ্রাপ্ত উস্তাদ *
                  </label>
                  <select
                    required
                    value={newSabakForm.ustadId}
                    onChange={(e) => setNewSabakForm({ ...newSabakForm, ustadId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">— উস্তাদ নির্বাচন করুন —</option>
                    {eligibleUstads.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={newSabakForm.date}
                    onChange={(e) => setNewSabakForm({ ...newSabakForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রাথমিক স্ট্যাটাস
                  </label>
                  <select
                    value={newSabakForm.status}
                    onChange={(e) => setNewSabakForm({ ...newSabakForm, status: e.target.value as HifzSabakStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="ASSIGNED">বরাদ্দকৃত (ASSIGNED)</option>
                    <option value="PRESENTED">উপস্থাপিত (PRESENTED)</option>
                  </select>
                </div>
              </div>

              {/* Quran Range Selectors (H2 Integration) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <BookOpen className="w-4 h-4 text-teal-700" />
                  <span>কুরআন রেফারেন্স রেঞ্জ (H2 Canonical Layer)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Start Surah */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      শুরু সূরা *
                    </label>
                    <select
                      value={newSabakForm.startSurah}
                      onChange={(e) => setNewSabakForm({ ...newSabakForm, startSurah: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      {surahs.map((s) => (
                        <option key={s.surahNumber} value={s.surahNumber}>
                          {s.surahNumber}. {s.nameBangla || s.transliteration}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start Ayah */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      শুরু আয়াত (১–{currentStartSurah?.ayahCount || 7}) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentStartSurah?.ayahCount || 286}
                      value={newSabakForm.startAyah}
                      onChange={(e) => setNewSabakForm({ ...newSabakForm, startAyah: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  {/* End Surah */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      শেষ সূরা *
                    </label>
                    <select
                      value={newSabakForm.endSurah}
                      onChange={(e) => setNewSabakForm({ ...newSabakForm, endSurah: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      {surahs.map((s) => (
                        <option key={s.surahNumber} value={s.surahNumber}>
                          {s.surahNumber}. {s.nameBangla || s.transliteration}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* End Ayah */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      শেষ আয়াত (১–{currentEndSurah?.ayahCount || 7}) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={currentEndSurah?.ayahCount || 286}
                      value={newSabakForm.endAyah}
                      onChange={(e) => setNewSabakForm({ ...newSabakForm, endAyah: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Live Range Preview from H2 */}
                {isValidatingRange ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-teal-600" />
                    <span>কুরআন রেফারেন্স রেঞ্জ যাচাই হচ্ছে...</span>
                  </div>
                ) : rangeError ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{rangeError}</span>
                  </div>
                ) : rangePreview ? (
                  <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-lg space-y-1.5 text-xs text-teal-950 font-tiro">
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-hind text-teal-900">
                        রেঞ্জ: {rangePreview.startSurah.nameBangla} ({rangePreview.startVerseKey}) ➔{' '}
                        {rangePreview.endSurah.nameBangla} ({rangePreview.endVerseKey})
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-mono bg-teal-200/80 text-teal-900 text-[11px]">
                        মোট {toBanglaNumber(rangePreview.totalAyahs)}টি আয়াত
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] flex flex-wrap gap-x-4 gap-y-1 font-mono">
                      <span>পারা/জুজ: {rangePreview.juzCovered.map(toBanglaNumber).join(', ')}</span>
                      <span>পৃষ্ঠা: {rangePreview.pagesCovered.map(toBanglaNumber).join(', ')}</span>
                    </div>
                    {rangePreview.ayahs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-teal-200/60 font-arabic text-sm text-slate-800 line-clamp-2">
                        {rangePreview.ayahs[0].text} ...
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মন্তব্য / নির্দেশিকা (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={newSabakForm.remarks}
                  onChange={(e) => setNewSabakForm({ ...newSabakForm, remarks: e.target.value })}
                  placeholder="উস্তাদের বিশেষ কোনো নির্দেশনা থাকলে লিখুন..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!rangePreview || !!rangeError}
                  className="px-5 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  সবক সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EVALUATION & STATUS UPDATE                            */}
      {/* ============================================================ */}
      {isEvaluateModalOpen && selectedSabak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-700" />
                <h3 className="text-lg font-bold text-slate-900 font-hind">
                  সবক মূল্যায়ন ও স্ট্যাটাস হালনাগাদ
                </h3>
              </div>
              <button
                onClick={() => setIsEvaluateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-tiro text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">শিক্ষার্থী:</span> {selectedSabak.studentName} ({selectedSabak.studentId})
              </div>
              <div>
                <span className="font-semibold text-slate-900">রেঞ্জ:</span> {selectedSabak.startSurahNameBn} ({selectedSabak.startVerseKey}) ➔ {selectedSabak.endSurahNameBn} ({selectedSabak.endVerseKey})
              </div>
              <div>
                <span className="font-semibold text-slate-900">বর্তমান স্ট্যাটাস:</span> {getStatusBadge(selectedSabak.status)}
              </div>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4 font-tiro text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পরবর্তী স্ট্যাটাস *
                </label>
                <select
                  value={evalForm.status}
                  onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value as HifzSabakStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="PRESENTED">উপস্থাপিত (PRESENTED)</option>
                  <option value="EVALUATED">মূল্যায়িত (EVALUATED)</option>
                  <option value="COMPLETED">সম্পন্ন (COMPLETED)</option>
                  <option value="CANCELLED">বাতিল (CANCELLED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পারফরম্যান্স মান (Performance)
                </label>
                <select
                  value={evalForm.performance}
                  onChange={(e) => setEvalForm({ ...evalForm, performance: e.target.value as HifzSabakPerformance })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="EXCELLENT">মুমতায / অনবদ্য (EXCELLENT)</option>
                  <option value="GOOD">জায়্যিদ জিদ্দান / উত্তম (GOOD)</option>
                  <option value="ACCEPTABLE">জায়্যিদ / গ্রহণযোগ্য (ACCEPTABLE)</option>
                  <option value="NEEDS_IMPROVEMENT">মাকবুল / আরও ভালো করা প্রয়োজন (NEEDS_IMPROVEMENT)</option>
                  <option value="NOT_PASSED">রাসিব / পুনরায় পড়া আবশ্যক (NOT_PASSED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ভুলের সংখ্যা (Mistake Count) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={evalForm.mistakeCount}
                  onChange={(e) => setEvalForm({ ...evalForm, mistakeCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  উস্তাদের মন্তব্য (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={evalForm.remarks}
                  onChange={(e) => setEvalForm({ ...evalForm, remarks: e.target.value })}
                  placeholder="উস্তাদের মূল্যায়ন মন্তব্য..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEvaluateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 text-white rounded-xl hover:bg-teal-800 font-semibold shadow-xs transition-colors"
                >
                  মূল্যায়ন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SABAK DETAIL VIEW                                     */}
      {/* ============================================================ */}
      {isDetailModalOpen && selectedSabak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 font-tiro text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-700" />
                <h3 className="text-lg font-bold text-slate-900 font-hind">
                  সবক বিস্তারিত তথ্য (#{selectedSabak.sabakId})
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">তারিখ:</span>
                <span className="font-semibold text-slate-900">{selectedSabak.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">শিক্ষার্থী:</span>
                <span className="font-semibold text-slate-900">{selectedSabak.studentName} ({selectedSabak.studentId})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">উস্তাদ:</span>
                <span className="font-semibold text-slate-900">{selectedSabak.ustadName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">কুরআন রেঞ্জ:</span>
                <span className="font-semibold text-teal-800 font-mono">
                  {selectedSabak.startSurahNameBn} ({selectedSabak.startVerseKey}) ➔ {selectedSabak.endSurahNameBn} ({selectedSabak.endVerseKey})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">মোট আয়াত:</span>
                <span className="font-semibold text-slate-900">{toBanglaNumber(selectedSabak.totalAyahs)}টি</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">স্ট্যাটাস:</span>
                <span>{getStatusBadge(selectedSabak.status)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">পারফরম্যান্স:</span>
                <span>{getPerformanceBadge(selectedSabak.performance)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">ভুলের সংখ্যা:</span>
                <span className="font-semibold text-slate-900">{toBanglaNumber(selectedSabak.mistakeCount ?? 0)}টি</span>
              </div>
              {selectedSabak.remarks && (
                <div className="py-1.5">
                  <span className="text-slate-500 block mb-1">মন্তব্য:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-800 text-xs">
                    {selectedSabak.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium transition-colors"
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

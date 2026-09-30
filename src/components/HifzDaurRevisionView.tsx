import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User,
  Users,
  Printer,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  FileText,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Eye,
  CheckSquare,
  History,
  GraduationCap
} from 'lucide-react';
import {
  Mosque,
  HifzkhanaEnrollment,
  HifzDaurCycle,
  HifzDaurCycleStatus,
  HifzDaur,
  HifzDaurStatus,
  HifzDaurPerformance,
  HifzRevision,
  HifzRevisionReason,
  HifzRevisionPriority,
  HifzRevisionStatus,
  QuranSurah,
  Staff,
  EducationStudentProfile
} from '../types';
import { api } from '../lib/api';

interface Props {
  currentMosque: Mosque;
}

type SubSection =
  | 'dashboard'
  | 'daurs'
  | 'cycles'
  | 'revisions'
  | 'student_history'
  | 'ustad_activity'
  | 'reports'
  | 'print_register';

export const HifzDaurRevisionView: React.FC<Props> = ({ currentMosque }) => {
  const [activeSection, setActiveSection] = useState<SubSection>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core data states
  const [cycles, setCycles] = useState<HifzDaurCycle[]>([]);
  const [daurs, setDaurs] = useState<HifzDaur[]>([]);
  const [revisions, setRevisions] = useState<HifzRevision[]>([]);
  const [enrollments, setEnrollments] = useState<HifzkhanaEnrollment[]>([]);
  const [students, setStudents] = useState<EducationStudentProfile[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterUstadId, setFilterUstadId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Modals state
  const [showAddCycleModal, setShowAddCycleModal] = useState(false);
  const [showAddDaurModal, setShowAddDaurModal] = useState(false);
  const [showAddRevisionModal, setShowAddRevisionModal] = useState(false);
  const [showEvaluateDaurModal, setShowEvaluateDaurModal] = useState<HifzDaur | null>(null);
  const [showResolveRevisionModal, setShowResolveRevisionModal] = useState<HifzRevision | null>(null);
  const [showCycleDetailsModal, setShowCycleDetailsModal] = useState<HifzDaurCycle | null>(null);

  // Form states - Cycle
  const [cycleForm, setCycleForm] = useState({
    enrollmentId: '',
    cycleNumber: 1,
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: '',
    startVerseKey: '1:1',
    endVerseKey: '2:286',
    status: 'ACTIVE' as HifzDaurCycleStatus,
    remarks: ''
  });

  // Form states - Daur Entry
  const [daurForm, setDaurForm] = useState({
    cycleId: '',
    enrollmentId: '',
    date: new Date().toISOString().split('T')[0],
    ustadId: '',
    startVerseKey: '1:1',
    endVerseKey: '1:7',
    status: 'ASSIGNED' as HifzDaurStatus,
    performance: 'GOOD' as HifzDaurPerformance,
    mistakeCount: 0,
    remarks: ''
  });

  // Form states - Revision
  const [revisionForm, setRevisionForm] = useState({
    enrollmentId: '',
    date: new Date().toISOString().split('T')[0],
    ustadId: '',
    sourceDaurId: '',
    sourceSabakiId: '',
    startVerseKey: '2:255',
    endVerseKey: '2:257',
    reason: 'MEMORY_WEAKNESS' as HifzRevisionReason,
    priority: 'MEDIUM' as HifzRevisionPriority,
    status: 'OPEN' as HifzRevisionStatus,
    remarks: ''
  });

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        cyclesData,
        daursData,
        revisionsData,
        statsData,
        enrollmentsData,
        studentsData,
        staffData,
        surahsData
      ] = await Promise.all([
        api.getHifzDaurCycles(),
        api.getHifzDaurs(),
        api.getHifzRevisions(),
        api.getHifzDaurStats().catch(() => null),
        api.getHifzEnrollments().catch(() => []),
        api.getEducationStudents().catch(() => []),
        api.getStaff().catch(() => []),
        api.getQuranSurahs().catch(() => [])
      ]);

      setCycles(cyclesData || []);
      setDaurs(daursData || []);
      setRevisions(revisionsData || []);
      setStats(statsData);
      setEnrollments((enrollmentsData || []).filter(e => e.status === 'ACTIVE'));
      setStudents(studentsData || []);
      setStaffList(staffData || []);
      setSurahs(surahsData || []);
    } catch (err: any) {
      setError(err?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMosque.id]);

  // Active student options
  const activeEnrollmentOptions = useMemo(() => {
    return enrollments.map(e => {
      const stu = students.find(s => s.id === e.studentProfileId || s.studentId === e.studentId);
      return {
        enrollmentId: e.id,
        studentId: e.studentId,
        studentProfileId: e.studentProfileId,
        name: stu?.fullNameBangla || stu?.fullNameEnglish || e.studentId,
        code: e.enrollmentId
      };
    });
  }, [enrollments, students]);

  // Handle create cycle
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleForm.enrollmentId || !cycleForm.startVerseKey || !cycleForm.endVerseKey) {
      alert('সবগুলো আবশ্যক ফিল্ড পূরণ করুন।');
      return;
    }
    setLoading(true);
    try {
      await api.createHifzDaurCycle(cycleForm);
      setSuccessMessage('দৌর সাইকেল সফলভাবে তৈরি হয়েছে।');
      setShowAddCycleModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'সাইকেল তৈরিতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // Handle create daur entry
  const handleCreateDaur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daurForm.cycleId || !daurForm.ustadId || !daurForm.startVerseKey || !daurForm.endVerseKey) {
      alert('সবগুলো আবশ্যক ফিল্ড পূরণ করুন।');
      return;
    }
    setLoading(true);
    try {
      await api.createHifzDaur(daurForm);
      setSuccessMessage('দৌর এন্ট্রি সফলভাবে বরাদ্দ করা হয়েছে।');
      setShowAddDaurModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'দৌর সংরক্ষণে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // Handle create revision
  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionForm.enrollmentId || !revisionForm.ustadId || !revisionForm.startVerseKey || !revisionForm.endVerseKey) {
      alert('সবগুলো আবশ্যক ফিল্ড পূরণ করুন।');
      return;
    }
    setLoading(true);
    try {
      await api.createHifzRevision(revisionForm);
      setSuccessMessage('রিভিশন রেকর্ড সফলভাবে বরাদ্দ করা হয়েছে।');
      setShowAddRevisionModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'রিভিশন সংরক্ষণে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // Status badge colors
  const getCycleStatusBadge = (status: HifzDaurCycleStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">সক্রিয় (Active)</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">সমাপ্ত (Completed)</span>;
      case 'PLANNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">পরিকল্পিত (Planned)</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">বাতিল (Cancelled)</span>;
    }
  };

  const getDaurStatusBadge = (status: HifzDaurStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">বরাদ্দকৃত</span>;
      case 'REVIEWED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">শোনা হয়েছে</span>;
      case 'EVALUATED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">মূল্যায়িত</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">পাস/সমাপ্ত</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">বাতিল</span>;
    }
  };

  const getRevisionStatusBadge = (status: HifzRevisionStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">উন্মুক্ত (Open)</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">অনুশীলন চলছে</span>;
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">যাচাইকৃত</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">দুর্বলতা মুক্ত (Resolved)</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">বাতিল</span>;
    }
  };

  const getPriorityBadge = (priority: HifzRevisionPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">জরুরি (Critical)</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">উচ্চ (High)</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">মাঝারি (Medium)</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-xs font-normal bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">সাধারণ (Low)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-teal-600/60 text-teal-100 text-xs px-2.5 py-0.5 rounded-full font-medium tracking-wide">
                HIFZ H4 FOUNDATION
              </span>
              <span className="text-teal-200 text-xs">• ধারাবাহিক পুনরাবৃত্তি ও দুর্বল অংশ পুনরুদ্ধার</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">দৌর (Daur) ও Revision ব্যবস্থাপনা</h1>
            <p className="text-teal-100 text-sm mt-1">
              হিফজকৃত অংশের নিয়মতান্ত্রিক চক্রভিত্তিক পর্যালোচনা এবং দুর্বল আয়াতসমূহের বিশেষ তদারকি
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddCycleModal(true)}
              className="px-3.5 py-2 bg-white text-teal-900 font-semibold rounded-lg shadow hover:bg-teal-50 transition-colors text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              নতুন দৌর সাইকেল
            </button>
            <button
              onClick={() => setShowAddDaurModal(true)}
              className="px-3.5 py-2 bg-emerald-500 text-white font-semibold rounded-lg shadow hover:bg-emerald-600 transition-colors text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              দৈনিক দৌর বরাদ্দ
            </button>
            <button
              onClick={() => setShowAddRevisionModal(true)}
              className="px-3.5 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow hover:bg-amber-600 transition-colors text-sm flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              রিভিশন এন্ট্রি
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 mt-6 pt-4 border-t border-teal-600/40">
          {[
            { id: 'dashboard', label: '📊 ড্যাশবোর্ড', count: null },
            { id: 'daurs', label: '🔄 দৌর ব্যবস্থাপনা', count: daurs.length },
            { id: 'cycles', label: '📚 দৌর সাইকেল', count: cycles.length },
            { id: 'revisions', label: '⚠️ Revision / দুর্বল অংশ', count: revisions.filter(r => r.status !== 'RESOLVED').length },
            { id: 'student_history', label: '👨‍🎓 শিক্ষার্থীভিত্তিক ইতিহাস', count: null },
            { id: 'ustad_activity', label: '👨‍🏫 উস্তাদভিত্তিক কার্যক্রম', count: null },
            { id: 'reports', label: '📈 রিপোর্ট ও বিশ্লেষণ', count: null },
            { id: 'print_register', label: '🖨️ রেজিস্টার ও প্রিন্ট', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as SubSection)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeSection === tab.id
                  ? 'bg-white text-teal-900 shadow-sm font-semibold'
                  : 'bg-teal-900/40 text-teal-100 hover:bg-teal-900/70 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeSection === tab.id ? 'bg-teal-100 text-teal-900' : 'bg-teal-800 text-teal-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: DASHBOARD */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">সক্রিয় দৌর সাইকেল</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {stats?.activeCycles ?? cycles.filter(c => c.status === 'ACTIVE').length}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">মোট সাইকেল: {cycles.length}</p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded-xl text-teal-600 dark:text-teal-400">
                  <Layers className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">আজকের দৌর এন্ট্রি</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {stats?.todayDaurs ?? daurs.filter(d => d.date === new Date().toISOString().split('T')[0]).length}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">মোট এন্ট্রি: {daurs.length}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
                  <RotateCcw className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">চলমান Revision (দুর্বল অংশ)</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {revisions.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length}
                  </p>
                  <p className="text-xs text-rose-600 mt-0.5">
                    জরুরি: {revisions.filter(r => r.priority === 'CRITICAL' && r.status !== 'RESOLVED').length}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">সফলভাবে সমাধানকৃত</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {revisions.filter(r => r.status === 'RESOLVED').length}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">রিভিশন সমাপ্তি হার</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Cycles Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  সক্রিয় দৌর সাইকেলসমূহ
                </h3>
                <button
                  onClick={() => setActiveSection('cycles')}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  সব দেখুন →
                </button>
              </div>

              {cycles.filter(c => c.status === 'ACTIVE').length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  কোনো সক্রিয় দৌর সাইকেল নেই।
                </div>
              ) : (
                <div className="space-y-3">
                  {cycles.filter(c => c.status === 'ACTIVE').slice(0, 5).map(c => {
                    const studentDaurs = daurs.filter(d => d.cycleId === c.id && d.status === 'COMPLETED');
                    const completedAyahs = studentDaurs.reduce((s, d) => s + (d.totalAyahs || 0), 0);
                    const progress = c.totalAyahs > 0 ? Math.min(100, Math.round((completedAyahs / c.totalAyahs) * 100)) : 0;
                    return (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{c.studentName}</span>
                          <span className="text-teal-600 font-medium">সাইকেল #{c.cycleNumber} ({progress}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                          <span>রেঞ্জ: {c.startVerseKey} ➔ {c.endVerseKey}</span>
                          <span>{completedAyahs} / {c.totalAyahs} আয়াত</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* High Priority Revisions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  জরুরি / উচ্চ প্রায়োরিটি Revision
                </h3>
                <button
                  onClick={() => setActiveSection('revisions')}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  সব দেখুন →
                </button>
              </div>

              {revisions.filter(r => (r.priority === 'CRITICAL' || r.priority === 'HIGH') && r.status !== 'RESOLVED').length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  আলহামদুলিল্লাহ, কোনো উচ্চ বা জরুরি রিভিশন বাকি নেই।
                </div>
              ) : (
                <div className="space-y-3">
                  {revisions
                    .filter(r => (r.priority === 'CRITICAL' || r.priority === 'HIGH') && r.status !== 'RESOLVED')
                    .slice(0, 5)
                    .map(r => (
                      <div key={r.id} className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{r.studentName}</span>
                            {getPriorityBadge(r.priority)}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            আয়াত: {r.startVerseKey} ➔ {r.endVerseKey} ({r.totalAyahs} আয়াত)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            কারণ: {r.reason === 'MEMORY_WEAKNESS' ? 'মুখস্থ দুর্বলতা' : r.reason === 'REPEATED_MISTAKES' ? 'বারবার ভুল' : r.reason}
                          </p>
                        </div>
                        <div>
                          {getRevisionStatusBadge(r.status)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DAUR ENTRIES MANAGEMENT */}
      {activeSection === 'daurs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="শিক্ষার্থী, উস্তাদ বা দৌর আইডি দিয়ে খুঁজুন..."
                className="w-full text-xs bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddDaurModal(true)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                নতুন দৌর বরাদ্দ
              </button>
              <button
                onClick={loadData}
                className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200"
                title="রিফ্রেশ"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Daur Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">দৌর আইডি</th>
                    <th className="py-3 px-4 font-semibold">শিক্ষার্থী</th>
                    <th className="py-3 px-4 font-semibold">তারিখ</th>
                    <th className="py-3 px-4 font-semibold">উস্তাদ</th>
                    <th className="py-3 px-4 font-semibold">কুরআন রেঞ্জ</th>
                    <th className="py-3 px-4 font-semibold">আয়াত</th>
                    <th className="py-3 px-4 font-semibold">স্ট্যাটাস</th>
                    <th className="py-3 px-4 font-semibold">মূল্যায়ন</th>
                    <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {daurs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        কোনো দৌর রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    daurs.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono font-medium text-teal-700 dark:text-teal-400">
                          {d.daurId}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {d.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {d.date}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {d.ustadName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                            {d.startVerseKey} ➔ {d.endVerseKey}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {d.totalAyahs}
                        </td>
                        <td className="py-3 px-4">
                          {getDaurStatusBadge(d.status)}
                        </td>
                        <td className="py-3 px-4">
                          {d.performance ? (
                            <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {d.performance} ({d.mistakeCount || 0} ভুল)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {d.status !== 'CANCELLED' && d.status !== 'COMPLETED' && (
                            <button
                              onClick={() => setShowEvaluateDaurModal(d)}
                              className="px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 rounded text-xs font-semibold"
                            >
                              মূল্যায়ন
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
        </div>
      )}

      {/* SECTION 3: DAUR CYCLES */}
      {activeSection === 'cycles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">দৌর সাইকেল রেজিস্টার</h3>
              <p className="text-xs text-slate-500">শিক্ষার্থীভিত্তিক পূর্ণাঙ্গ কুরআন বা নির্দিষ্ট পারার ধারাবাহিক পর্যালোচনা চক্র</p>
            </div>
            <button
              onClick={() => setShowAddCycleModal(true)}
              className="px-3.5 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              নতুন সাইকেল খুলুন
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cycles.map(c => {
              const linkedDaurs = daurs.filter(d => d.cycleId === c.id && d.status === 'COMPLETED');
              const totalCompletedAyahs = linkedDaurs.reduce((acc, d) => acc + (d.totalAyahs || 0), 0);
              const progress = c.totalAyahs > 0 ? Math.min(100, Math.round((totalCompletedAyahs / c.totalAyahs) * 100)) : 0;
              return (
                <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">{c.cycleId}</span>
                    {getCycleStatusBadge(c.status)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{c.studentName}</h4>
                    <p className="text-xs text-slate-500">সাইকেল নং: #{c.cycleNumber} • শুরু: {c.startDate}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                      <span>কুরআন রেঞ্জ:</span>
                      <span className="font-semibold">{c.startVerseKey} ➔ {c.endVerseKey}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>মোট আয়াত:</span>
                      <span className="font-bold">{c.totalAyahs} আয়াত</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>অগ্রগতি:</span>
                      <span className="font-bold text-teal-600">{progress}% ({totalCompletedAyahs}/{c.totalAyahs})</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-600 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button
                      onClick={() => setShowCycleDetailsModal(c)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                    >
                      বিস্তারিত দেখুন <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: REVISIONS / দুর্বল অংশ */}
      {activeSection === 'revisions' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Revision / দুর্বল আয়াত ট্র্যাকিং</h3>
              <p className="text-xs text-slate-500">যেসব অংশ মুখস্থে দুর্বল বা ভুলে যাওয়ার সম্ভাবনা রয়েছে তাদের বিশেষ নজরদারি</p>
            </div>
            <button
              onClick={() => setShowAddRevisionModal(true)}
              className="px-3.5 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              নতুন রিভিশন বরাদ্দ
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 font-semibold">রিভিশন আইডি</th>
                    <th className="py-3 px-4 font-semibold">শিক্ষার্থী</th>
                    <th className="py-3 px-4 font-semibold">উস্তাদ</th>
                    <th className="py-3 px-4 font-semibold">কুরআন রেঞ্জ</th>
                    <th className="py-3 px-4 font-semibold">কারণ</th>
                    <th className="py-3 px-4 font-semibold">প্রায়োরিটি</th>
                    <th className="py-3 px-4 font-semibold">স্ট্যাটাস</th>
                    <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {revisions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        কোনো রিভিশন রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    revisions.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono font-medium text-amber-700 dark:text-amber-400">
                          {r.revisionId}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {r.studentName}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {r.ustadName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                            {r.startVerseKey} ➔ {r.endVerseKey}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {r.reason === 'MEMORY_WEAKNESS' ? 'মুখস্থ দুর্বলতা' : r.reason === 'REPEATED_MISTAKES' ? 'বারবার ভুল' : r.reason}
                        </td>
                        <td className="py-3 px-4">
                          {getPriorityBadge(r.priority)}
                        </td>
                        <td className="py-3 px-4">
                          {getRevisionStatusBadge(r.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.status !== 'RESOLVED' && r.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setShowResolveRevisionModal(r)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 rounded text-xs font-semibold"
                            >
                              সমাধান/আপডেট
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
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add Cycle Modal */}
      {showAddCycleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">নতুন দৌর সাইকেল খুলুন</h3>
              <button onClick={() => setShowAddCycleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCycle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শিক্ষার্থী নির্বাচন *</label>
                <select
                  value={cycleForm.enrollmentId}
                  onChange={e => setCycleForm({ ...cycleForm, enrollmentId: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  required
                >
                  <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                  {activeEnrollmentOptions.map(opt => (
                    <option key={opt.enrollmentId} value={opt.enrollmentId}>
                      {opt.name} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">সাইকেল নং *</label>
                  <input
                    type="number"
                    min={1}
                    value={cycleForm.cycleNumber}
                    onChange={e => setCycleForm({ ...cycleForm, cycleNumber: Number(e.target.value) })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শুরুর তারিখ *</label>
                  <input
                    type="date"
                    value={cycleForm.startDate}
                    onChange={e => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শুরুর আয়াত কি (e.g. 1:1) *</label>
                  <input
                    type="text"
                    value={cycleForm.startVerseKey}
                    onChange={e => setCycleForm({ ...cycleForm, startVerseKey: e.target.value.trim() })}
                    placeholder="1:1"
                    className="w-full text-xs font-mono rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শেষের আয়াত কি (e.g. 2:286) *</label>
                  <input
                    type="text"
                    value={cycleForm.endVerseKey}
                    onChange={e => setCycleForm({ ...cycleForm, endVerseKey: e.target.value.trim() })}
                    placeholder="2:286"
                    className="w-full text-xs font-mono rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">মন্তব্য</label>
                <textarea
                  value={cycleForm.remarks}
                  onChange={e => setCycleForm({ ...cycleForm, remarks: e.target.value })}
                  rows={2}
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  placeholder="সাইকেল সম্পর্কিত কোনো নির্দেশনা..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddCycleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow"
                >
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'সাইকেল তৈরি করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Daur Entry Modal */}
      {showAddDaurModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">দৈনিক দৌর এন্ট্রি বরাদ্দ</h3>
              <button onClick={() => setShowAddDaurModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDaur} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">দৌর সাইকেল নির্বাচন *</label>
                <select
                  value={daurForm.cycleId}
                  onChange={e => {
                    const cId = e.target.value;
                    const cyc = cycles.find(c => c.id === cId);
                    setDaurForm({
                      ...daurForm,
                      cycleId: cId,
                      enrollmentId: cyc?.enrollmentId || ''
                    });
                  }}
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  required
                >
                  <option value="">-- সাইকেল নির্বাচন করুন --</option>
                  {cycles.filter(c => c.status === 'ACTIVE').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.studentName} — সাইকেল #{c.cycleNumber} ({c.startVerseKey}➔{c.endVerseKey})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={daurForm.date}
                    onChange={e => setDaurForm({ ...daurForm, date: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">উস্তাদ / শিক্ষক *</label>
                  <select
                    value={daurForm.ustadId}
                    onChange={e => setDaurForm({ ...daurForm, ustadId: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  >
                    <option value="">-- উস্তাদ নির্বাচন --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শুরুর আয়াত (e.g. 1:1) *</label>
                  <input
                    type="text"
                    value={daurForm.startVerseKey}
                    onChange={e => setDaurForm({ ...daurForm, startVerseKey: e.target.value.trim() })}
                    placeholder="1:1"
                    className="w-full text-xs font-mono rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শেষের আয়াত (e.g. 1:7) *</label>
                  <input
                    type="text"
                    value={daurForm.endVerseKey}
                    onChange={e => setDaurForm({ ...daurForm, endVerseKey: e.target.value.trim() })}
                    placeholder="1:7"
                    className="w-full text-xs font-mono rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddDaurModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow"
                >
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'দৌর বরাদ্দ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Revision Modal */}
      {showAddRevisionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Revision / দুর্বল অংশ বরাদ্দ</h3>
              <button onClick={() => setShowAddRevisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শিক্ষার্থী *</label>
                <select
                  value={revisionForm.enrollmentId}
                  onChange={e => setRevisionForm({ ...revisionForm, enrollmentId: e.target.value })}
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  required
                >
                  <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                  {activeEnrollmentOptions.map(opt => (
                    <option key={opt.enrollmentId} value={opt.enrollmentId}>
                      {opt.name} ({opt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={revisionForm.date}
                    onChange={e => setRevisionForm({ ...revisionForm, date: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">উস্তাদ / শিক্ষক *</label>
                  <select
                    value={revisionForm.ustadId}
                    onChange={e => setRevisionForm({ ...revisionForm, ustadId: e.target.value })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  >
                    <option value="">-- উস্তাদ নির্বাচন --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">দুর্বলতার কারণ *</label>
                  <select
                    value={revisionForm.reason}
                    onChange={e => setRevisionForm({ ...revisionForm, reason: e.target.value as HifzRevisionReason })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="MEMORY_WEAKNESS">মুখস্থ দুর্বলতা (Memory Weakness)</option>
                    <option value="REPEATED_MISTAKES">বারবার ভুল (Repeated Mistakes)</option>
                    <option value="FORGOTTEN_PORTION">ভুলে যাওয়া অংশ (Forgotten Portion)</option>
                    <option value="CONNECTIVITY_ISSUE">আয়াতের যোগসূত্রে জড়তা (Connectivity)</option>
                    <option value="USTAD_ASSIGNED">উস্তাদের বিশেষ নির্দেশ (Ustad Assigned)</option>
                    <option value="OTHER">অন্যান্য (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">প্রায়োরিটি *</label>
                  <select
                    value={revisionForm.priority}
                    onChange={e => setRevisionForm({ ...revisionForm, priority: e.target.value as HifzRevisionPriority })}
                    className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="LOW">সাধারণ (Low)</option>
                    <option value="MEDIUM">মাঝারি (Medium)</option>
                    <option value="HIGH">উচ্চ (High)</option>
                    <option value="CRITICAL">জরুরি (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শুরুর আয়াত (e.g. 2:255) *</label>
                  <input
                    type="text"
                    value={revisionForm.startVerseKey}
                    onChange={e => setRevisionForm({ ...revisionForm, startVerseKey: e.target.value.trim() })}
                    placeholder="2:255"
                    className="w-full text-xs font-mono rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">শেষের আয়াত (e.g. 2:257) *</label>
                  <input
                    type="text"
                    value={revisionForm.endVerseKey}
                    onChange={e => setRevisionForm({ ...revisionForm, endVerseKey: e.target.value.trim() })}
                    placeholder="2:257"
                    className="w-full text-xs font-mono rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddRevisionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 rounded-lg shadow"
                >
                  {loading ? 'সংরক্ষণ হচ্ছে...' : 'রিভিশন বরাদ্দ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Evaluate Daur Modal */}
      {showEvaluateDaurModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">
              দৌর মূল্যায়ন: {showEvaluateDaurModal.studentName} ({showEvaluateDaurModal.daurId})
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <p><span className="font-semibold">রেঞ্জ:</span> {showEvaluateDaurModal.startVerseKey} ➔ {showEvaluateDaurModal.endVerseKey} ({showEvaluateDaurModal.totalAyahs} আয়াত)</p>
                <p className="mt-0.5"><span className="font-semibold">উস্তাদ:</span> {showEvaluateDaurModal.ustadName}</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">স্ট্যাটাস রূপান্তর</label>
                <select
                  id="evalDaurStatus"
                  defaultValue={showEvaluateDaurModal.status === 'ASSIGNED' ? 'REVIEWED' : 'EVALUATED'}
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="REVIEWED">শোনা সম্পন্ন (REVIEWED)</option>
                  <option value="EVALUATED">মূল্যায়িত (EVALUATED)</option>
                  <option value="COMPLETED">পাস / সমাপ্ত (COMPLETED)</option>
                  <option value="CANCELLED">বাতিল (CANCELLED)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">পারফরম্যান্স রেটিং</label>
                <select
                  id="evalDaurPerf"
                  defaultValue="GOOD"
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="EXCELLENT">চমৎকার (EXCELLENT)</option>
                  <option value="GOOD">উত্তম (GOOD)</option>
                  <option value="ACCEPTABLE">গ্রহণযোগ্য (ACCEPTABLE)</option>
                  <option value="NEEDS_IMPROVEMENT">উন্নতি প্রয়োজন (NEEDS_IMPROVEMENT)</option>
                  <option value="NOT_PASSED">অনুত্তীর্ণ (NOT_PASSED)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">ভুল সংখ্যা</label>
                <input
                  id="evalDaurMistakes"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowEvaluateDaurModal(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const statusVal = (document.getElementById('evalDaurStatus') as HTMLSelectElement).value as HifzDaurStatus;
                    const perfVal = (document.getElementById('evalDaurPerf') as HTMLSelectElement).value as HifzDaurPerformance;
                    const mistakesVal = Number((document.getElementById('evalDaurMistakes') as HTMLInputElement).value);

                    try {
                      await api.updateHifzDaurStatus(showEvaluateDaurModal.id, statusVal, perfVal, mistakesVal);
                      setShowEvaluateDaurModal(null);
                      setSuccessMessage('দৌর মূল্যায়ন সংরক্ষিত হয়েছে।');
                      loadData();
                    } catch (err: any) {
                      alert(err.message || 'মূল্যায়ন ব্যর্থ হয়েছে');
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 rounded-lg"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Resolve Revision Modal */}
      {showResolveRevisionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">
              রিভিশন স্ট্যাটাস পরিবর্তন: {showResolveRevisionModal.studentName}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">নতুন স্ট্যাটাস</label>
                <select
                  id="resolveRevStatus"
                  defaultValue="RESOLVED"
                  className="w-full text-xs rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="IN_PROGRESS">অনুশীলন চলছে (IN_PROGRESS)</option>
                  <option value="VERIFIED">যাচাই সম্পন্ন (VERIFIED)</option>
                  <option value="RESOLVED">দুর্বলতা মুক্ত / সমাধান (RESOLVED)</option>
                  <option value="CANCELLED">বাতিল (CANCELLED)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowResolveRevisionModal(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const statusVal = (document.getElementById('resolveRevStatus') as HTMLSelectElement).value as HifzRevisionStatus;
                    try {
                      await api.updateHifzRevisionStatus(showResolveRevisionModal.id, statusVal);
                      setShowResolveRevisionModal(null);
                      setSuccessMessage('রিভিশন স্ট্যাটাস আপডেট হয়েছে।');
                      loadData();
                    } catch (err: any) {
                      alert(err.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg"
                >
                  আপডেট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

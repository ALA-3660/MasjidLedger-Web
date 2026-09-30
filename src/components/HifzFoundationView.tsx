import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Edit,
  GraduationCap,
  Home,
  Compass,
  FileText,
  AlertCircle,
  Sparkles,
  BookMarked,
  RotateCcw,
  Calendar,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  HifzkhanaEnrollment,
  HifzLevel,
  HifzCurriculum,
  EducationStudentProfile,
  HifzEnrollmentStatus,
  HifzStudyType,
} from '../types';
import { toBanglaNumber } from './CommitteeView';
import { QuranReferenceView } from './QuranReferenceView';
import { HifzSabakView } from './HifzSabakView';
import { HifzSabakiView } from './HifzSabakiView';
import { HifzDaurRevisionView } from './HifzDaurRevisionView';
import { HifzAttendanceView } from './HifzAttendanceView';
import { HifzUstadAssignmentView } from './HifzUstadAssignmentView';
import { HifzDashboardHistoryView } from './HifzDashboardHistoryView';
import { HifzSubReportCenterView } from './HifzSubReportCenterView';
import { HifzResidentialFoundationView } from './HifzResidentialFoundationView';

interface HifzFoundationViewProps {
  currentMosque?: any;
  currentUser?: any;
  language?: string;
  onNavigateTab?: (tab: string) => void;
}

export const HifzFoundationView: React.FC<HifzFoundationViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
}) => {
  const [activeTab, setActiveTab] = useState<'enrollments' | 'sabak' | 'sabaki' | 'daur_revision' | 'attendance' | 'ustad_assignment' | 'dashboard_history' | 'sub_report_center' | 'residential' | 'levels' | 'curricula' | 'quranReference'>('enrollments');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [enrollments, setEnrollments] = useState<HifzkhanaEnrollment[]>([]);
  const [sabakCount, setSabakCount] = useState<number>(0);
  const [sabakiCount, setSabakiCount] = useState<number>(0);
  const [daurCount, setDaurCount] = useState<number>(0);
  const [attendanceCount, setAttendanceCount] = useState<number>(0);
  const [ustadAssignmentCount, setUstadAssignmentCount] = useState<number>(0);
  const [levels, setLevels] = useState<HifzLevel[]>([]);
  const [curricula, setCurricula] = useState<HifzCurriculum[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<EducationStudentProfile[]>([]);
  const [eligibleUstads, setEligibleUstads] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('ALL');
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('ALL');
  const [selectedStudyType, setSelectedStudyType] = useState<string>('ALL');

  // Modals
  const [isAddEnrollmentOpen, setIsAddEnrollmentOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<HifzkhanaEnrollment | null>(null);

  // New Enrollment Form
  const [newEnrollmentForm, setNewEnrollmentForm] = useState({
    studentProfileId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    currentLevelId: '',
    curriculumId: '',
    primaryUstadId: '',
    studyType: 'NON_RESIDENTIAL' as HifzStudyType,
    startJuz: '',
    target: '',
    remarks: '',
  });

  // Status Change Form
  const [statusForm, setStatusForm] = useState<{
    status: HifzEnrollmentStatus;
    remarks: string;
  }>({
    status: 'ACTIVE',
    remarks: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [enrollmentRes, levelRes, curriculumRes, studentRes, ustadRes, sabakStatsRes, sabakiStatsRes, daurStatsRes, attendanceStatsRes, ustadAssignStatsRes] = await Promise.all([
        api.getHifzEnrollments().catch(() => []),
        api.getHifzLevels().catch(() => []),
        api.getHifzCurricula().catch(() => []),
        api.getHifzEligibleStudents().catch(() => []),
        api.getHifzEligibleUstads().catch(() => []),
        api.getHifzSabakStats().catch(() => null),
        api.getHifzSabakiStats().catch(() => null),
        api.getHifzDaurStats().catch(() => null),
        api.getHifzAttendanceStats().catch(() => null),
        api.getHifzUstadAssignmentStats().catch(() => null),
      ]);

      setEnrollments(enrollmentRes);
      setLevels(levelRes);
      setCurricula(curriculumRes);
      setEligibleStudents(studentRes);
      setEligibleUstads(ustadRes);
      if (sabakStatsRes?.totalAllTime !== undefined) {
        setSabakCount(sabakStatsRes.totalAllTime);
      }
      if (sabakiStatsRes?.totalSabakis !== undefined) {
        setSabakiCount(sabakiStatsRes.totalSabakis);
      }
      if (daurStatsRes?.totalDaurs !== undefined) {
        setDaurCount(daurStatsRes.totalDaurs);
      }
      if (attendanceStatsRes?.todayTotal !== undefined) {
        setAttendanceCount(attendanceStatsRes.todayTotal);
      }
      if (ustadAssignStatsRes?.activeAssignments !== undefined) {
        setUstadAssignmentCount(ustadAssignStatsRes.activeAssignments);
      }

      if (levelRes.length > 0 && !newEnrollmentForm.currentLevelId) {
        setNewEnrollmentForm((prev) => ({ ...prev, currentLevelId: levelRes[0].id }));
      }
      if (curriculumRes.length > 0 && !newEnrollmentForm.curriculumId) {
        setNewEnrollmentForm((prev) => ({ ...prev, curriculumId: curriculumRes[0].id }));
      }
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'ডাটা লোড করতে সমস্যা হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Create Enrollment
  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        studentProfileId: newEnrollmentForm.studentProfileId,
        admissionDate: newEnrollmentForm.admissionDate,
        currentLevelId: newEnrollmentForm.currentLevelId,
        curriculumId: newEnrollmentForm.curriculumId,
        primaryUstadId: newEnrollmentForm.primaryUstadId || undefined,
        studyType: newEnrollmentForm.studyType,
        target: newEnrollmentForm.target || undefined,
        remarks: newEnrollmentForm.remarks || undefined,
      };

      if (newEnrollmentForm.startJuz) {
        payload.startJuz = Number(newEnrollmentForm.startJuz);
      }

      const res = await api.createHifzEnrollment(payload);
      setFeedbackMessage({
        type: 'success',
        text: `হিফজ শিক্ষার্থী সফলভাবে ভর্তি হয়েছেন (ভর্তি #${res.enrollmentId})।`,
      });
      setIsAddEnrollmentOpen(false);
      setNewEnrollmentForm({
        studentProfileId: '',
        admissionDate: new Date().toISOString().split('T')[0],
        currentLevelId: levels[0]?.id || '',
        curriculumId: curricula[0]?.id || '',
        primaryUstadId: '',
        studyType: 'NON_RESIDENTIAL',
        startJuz: '',
        target: '',
        remarks: '',
      });
      loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'হিফজ শিক্ষার্থী ভর্তি করতে ত্রুটি ঘটেছে।' });
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;
    try {
      await api.updateHifzEnrollmentStatus(
        selectedEnrollment.id,
        statusForm.status,
        statusForm.remarks || undefined
      );
      setFeedbackMessage({
        type: 'success',
        text: `ভর্তি স্ট্যাটাস সফলভাবে ${statusForm.status} করা হয়েছে।`,
      });
      setIsStatusModalOpen(false);
      setSelectedEnrollment(null);
      loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'স্ট্যাটাস পরিবর্তনে ত্রুটি ঘটেছে।' });
    }
  };

  // Filtered enrollments
  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.enrollmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.studentId && e.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.studentName && e.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.remarks && e.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'ALL' || e.status === selectedStatus;
    const matchesLevel = selectedLevelId === 'ALL' || e.currentLevelId === selectedLevelId;
    const matchesCurriculum = selectedCurriculumId === 'ALL' || e.curriculumId === selectedCurriculumId;
    const matchesStudyType = selectedStudyType === 'ALL' || e.studyType === selectedStudyType;

    return matchesSearch && matchesStatus && matchesLevel && matchesCurriculum && matchesStudyType;
  });

  const getStatusBadge = (status: HifzEnrollmentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">সক্রিয়</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">সম্পন্ন (হাফেজ)</span>;
      case 'TRANSFERRED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">স্থানান্তরিত</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">স্থগিত</span>;
      case 'DROPPED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">অব্যাহতি</span>;
      case 'ARCHIVED':
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">আর্কাইভ</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* INTERNAL SECONDARY SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-hind flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-700" />
              <span>হিফজখানা সাবসিস্টেম</span>
            </h2>
            <p className="text-xs text-slate-500 font-tiro">এইচ-১ ভিত্তি স্তর (H1 Foundation)</p>
          </div>
          <button
            onClick={loadData}
            title="রিফ্রেশ"
            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <nav className="p-2 space-y-1 font-tiro text-sm">
          {[
            { id: 'enrollments' as const, label: 'শিক্ষার্থী ভর্তি ও তালিকা', icon: Users, badge: enrollments.length },
            { id: 'sabak' as const, label: '📖 সবক', icon: BookMarked, badge: sabakCount },
            { id: 'sabaki' as const, label: '🔄 সবকী', icon: RotateCcw, badge: sabakiCount },
            { id: 'daur_revision' as const, label: '📚 দৌর ও রিভিশন (H4)', icon: BookOpen, badge: daurCount },
            { id: 'attendance' as const, label: '📅 দৈনিক হাজিরা (H5-A)', icon: Calendar, badge: attendanceCount },
            { id: 'ustad_assignment' as const, label: '👤 উস্তাদ নির্ধারণ (H5-B1)', icon: UserCheck, badge: ustadAssignmentCount },
            { id: 'dashboard_history' as const, label: '📊 ড্যাশবোর্ড ও ইতিহাস (H5-C)', icon: BarChart3 },
            { id: 'sub_report_center' as const, label: '📊 সাব রিপোর্ট সেন্টার (H5-D)', icon: FileText },
            { id: 'residential' as const, label: '🏠 আবাসিক ব্যবস্থাপনা (H6-A)', icon: Home },
            { id: 'levels' as const, label: 'হিফজ স্তরসমূহ (Stages)', icon: GraduationCap, badge: levels.length },
            { id: 'curricula' as const, label: 'হিফজ পাঠ্যক্রম (Curricula)', icon: Compass, badge: curricula.length },
            { id: 'quranReference' as const, label: '📖 কুরআন রেফারেন্স (H2)', icon: BookOpen, badge: '১১৪ সূরা' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setFeedbackMessage(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-teal-200 text-teal-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {toBanglaNumber(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Boundary Notice Card */}
        <div className="m-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-tiro text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950 font-hind">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>এইচ-১ ভিত্তি নীতি</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800">
            এই পর্বে শুধুমাত্র হিফজ ভর্তি, স্তর ও পাঠ্যক্রম কাঠামো কার্যকর। সবক, দৌর, উপস্থিতি ও কুরআন রেফারেন্স পরবর্তী ধাপে অন্তর্ভুক্ত হবে।
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
        {/* Feedback Message */}
        {feedbackMessage && (
          <div
            className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between font-tiro text-sm ${
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

        {/* TAB 1: ENROLLMENTS */}
        {activeTab === 'enrollments' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">হিফজ শিক্ষার্থী ভর্তি ব্যবস্থাপনা</h1>
                <p className="text-xs text-slate-500 font-tiro">
                  মোট ভর্তি: {toBanglaNumber(enrollments.length)} জন (সক্রিয়: {toBanglaNumber(enrollments.filter(e => e.status === 'ACTIVE').length)} জন)
                </p>
              </div>
              <button
                onClick={() => setIsAddEnrollmentOpen(true)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-xs transition-colors self-start font-tiro"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন হিফজ ভর্তি</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5 items-center font-tiro text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ভর্তি নম্বর, স্টুডেন্ট আইডি বা নাম..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">সকল অবস্থা (Status)</option>
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="COMPLETED">সম্পন্ন (Completed)</option>
                <option value="TRANSFERRED">স্থানান্তরিত (Transferred)</option>
                <option value="SUSPENDED">স্থগিত (Suspended)</option>
                <option value="DROPPED">অব্যাহতি (Dropped)</option>
                <option value="ARCHIVED">আর্কাইভ (Archived)</option>
              </select>

              <select
                value={selectedLevelId}
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">সকল স্তর (Level)</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.nameBn}
                  </option>
                ))}
              </select>

              <select
                value={selectedCurriculumId}
                onChange={(e) => setSelectedCurriculumId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">সকল পাঠ্যক্রম (Curriculum)</option>
                {curricula.map((cur) => (
                  <option key={cur.id} value={cur.id}>
                    {cur.nameBn}
                  </option>
                ))}
              </select>

              <select
                value={selectedStudyType}
                onChange={(e) => setSelectedStudyType(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
              >
                <option value="ALL">আবাসন (Study Type)</option>
                <option value="NON_RESIDENTIAL">অনাবাসিক (Non-Residential)</option>
                <option value="RESIDENTIAL">আবাসিক (Residential)</option>
              </select>
            </div>

            {/* Enrollments Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden font-tiro text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-hind">
                      <th className="p-3">ভর্তি নম্বর</th>
                      <th className="p-3">শিক্ষার্থী ও আইডি</th>
                      <th className="p-3">হিফজ স্তর</th>
                      <th className="p-3">পাঠ্যক্রম</th>
                      <th className="p-3">নির্ধারিত উস্তাদ</th>
                      <th className="p-3">ধরন</th>
                      <th className="p-3">আরম্ভিক পারা</th>
                      <th className="p-3">অবস্থা</th>
                      <th className="p-3 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          কোনো হিফজ শিক্ষার্থী ভর্তি রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map((enr) => (
                        <tr key={enr.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono font-bold text-teal-800">{enr.enrollmentId}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 font-hind">{enr.studentName}</div>
                            <div className="text-[11px] font-mono text-slate-500">{enr.studentId}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-800">{enr.levelNameBn || '—'}</td>
                          <td className="p-3 text-slate-600">{enr.curriculumNameBn || '—'}</td>
                          <td className="p-3 text-slate-600">{enr.primaryUstadName || '—'}</td>
                          <td className="p-3">
                            {enr.studyType === 'RESIDENTIAL' ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                                <Home className="w-3 h-3" /> আবাসিক
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                অনাবাসিক
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-700">
                            {enr.startJuz ? `পারা ${toBanglaNumber(enr.startJuz)}` : '১ম পারা'}
                          </td>
                          <td className="p-3">{getStatusBadge(enr.status)}</td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => {
                                setSelectedEnrollment(enr);
                                setIsDetailModalOpen(true);
                              }}
                              title="বিবরণ"
                              className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEnrollment(enr);
                                setStatusForm({ status: enr.status, remarks: enr.remarks || '' });
                                setIsStatusModalOpen(true);
                              }}
                              title="স্ট্যাটাস পরিবর্তন"
                              className="p-1 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
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

        {/* TAB 2: LEVELS REFERENCE */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-hind">হিফজ শিক্ষাগত স্তরসমূহ (Educational Stages)</h1>
              <p className="text-xs text-slate-500 font-tiro">
                স্তর এবং পাঠ্যক্রম পরস্পর স্বতন্ত্র। স্তরসমূহ কোনো নির্দিষ্ট পারা সংখ্যা নির্দেশ করে না, বরং শিক্ষার্থীর সার্বিক ধারণক্ষমতা ও অগ্রগতির ধাপ নির্দেশ করে।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map((lvl, index) => (
                <div key={lvl.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-tiro space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full font-mono">
                      ধাপ #{toBanglaNumber(index + 1)} • {lvl.stage}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      সক্রিয়
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-hind">{lvl.nameBn}</h3>
                  <p className="text-xs text-slate-500">{lvl.nameEn}</p>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {lvl.description || 'হিফজুল কুরআনের নির্ধারিত ধাপ।'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CURRICULA REFERENCE */}
        {activeTab === 'curricula' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-hind">হিফজ পাঠ্যক্রম রেফারেন্স (Curricula)</h1>
              <p className="text-xs text-slate-500 font-tiro">
                শিক্ষার্থীর মেধা ও লক্ষ্য অনুযায়ী পাঠ্যক্রম নির্ধারণ করা হয়।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {curricula.map((cur) => (
                <div key={cur.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-tiro space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full font-mono">
                      {cur.type}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 font-hind pt-1">{cur.nameBn}</h3>
                    <p className="text-xs text-slate-500">{cur.nameEn}</p>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {cur.description}
                    </p>
                  </div>
                  {cur.targetMonths && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>প্রস্তাবিত মেয়াদ:</span>
                      <span className="font-semibold text-slate-800">{toBanglaNumber(cur.targetMonths)} মাস</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: HIFZ H3-A SABAK FOUNDATION */}
        {activeTab === 'sabak' && (
          <HifzSabakView
            currentMosque={currentMosque}
            currentUser={currentUser}
            language={language}
          />
        )}

        {/* TAB: HIFZ H3-B SABAKI FOUNDATION */}
        {activeTab === 'sabaki' && (
          <HifzSabakiView
            currentMosque={currentMosque}
            currentUser={currentUser}
            language={language}
          />
        )}

        {/* TAB: HIFZ H4 DAUR & REVISION FOUNDATION */}
        {activeTab === 'daur_revision' && (
          <HifzDaurRevisionView
            currentMosque={currentMosque}
          />
        )}

        {/* TAB: HIFZ H5-A ATTENDANCE FOUNDATION */}
        {activeTab === 'attendance' && (
          <HifzAttendanceView
            currentMosque={currentMosque}
          />
        )}

        {/* TAB: HIFZ H5-B1 USTAD ASSIGNMENT FOUNDATION */}
        {activeTab === 'ustad_assignment' && (
          <HifzUstadAssignmentView
            currentMosque={currentMosque}
          />
        )}

        {/* TAB: HIFZ H5-C DASHBOARD & HISTORY */}
        {activeTab === 'dashboard_history' && (
          <HifzDashboardHistoryView
            currentMosque={currentMosque}
          />
        )}

        {/* TAB: HIFZ H5-D SUB REPORT CENTER */}
        {activeTab === 'sub_report_center' && (
          <HifzSubReportCenterView
            currentMosque={currentMosque}
          />
        )}

        {/* TAB: HIFZ H6-A RESIDENTIAL FOUNDATION */}
        {activeTab === 'residential' && (
          <HifzResidentialFoundationView
            currentMosque={currentMosque}
          />
        )}

        {/* TAB 4: QURAN REFERENCE FOUNDATION (H2) */}
        {activeTab === 'quranReference' && (
          <QuranReferenceView language={language} />
        )}
      </main>

      {/* MODAL 1: ADD HIFZ ENROLLMENT */}
      {isAddEnrollmentOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-700" />
              <span>নতুন হিফজ শিক্ষার্থী ভর্তি (এইচ-১)</span>
            </h2>
            <form onSubmit={handleCreateEnrollment} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  শিক্ষার্থী নির্বাচন (Education Foundation) *
                </label>
                <select
                  required
                  value={newEnrollmentForm.studentProfileId}
                  onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, studentProfileId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                  {eligibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.personName} ({s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ভর্তির তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={newEnrollmentForm.admissionDate}
                    onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">আবাসন ধরন *</label>
                  <select
                    value={newEnrollmentForm.studyType}
                    onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, studyType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="NON_RESIDENTIAL">অনাবাসিক (Non-Residential)</option>
                    <option value="RESIDENTIAL">আবাসিক (Residential)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রাথমিক হিফজ স্তর *</label>
                  <select
                    required
                    value={newEnrollmentForm.currentLevelId}
                    onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, currentLevelId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">হিফজ পাঠ্যক্রম *</label>
                  <select
                    required
                    value={newEnrollmentForm.curriculumId}
                    onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, curriculumId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    {curricula.map((cur) => (
                      <option key={cur.id} value={cur.id}>
                        {cur.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">নির্ধারিত উস্তাদ (স্টাফ তালিকা)</label>
                  <select
                    value={newEnrollmentForm.primaryUstadId}
                    onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, primaryUstadId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- উস্তাদ নির্ধারণ (ঐচ্ছিক) --</option>
                    {eligibleUstads.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.designation})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">আরম্ভিক পারা (১-৩০, ঐচ্ছিক)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="যেমন: ১ অথবা ৩০"
                    value={newEnrollmentForm.startJuz}
                    onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, startJuz: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">লক্ষ্যমাত্রা (Target, ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: ৩ বছরে পূর্ণ কুরআন সমাপ্তি"
                  value={newEnrollmentForm.target}
                  onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, target: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিশেষ মন্তব্য/নোট</label>
                <textarea
                  rows={2}
                  placeholder="ভর্তি সংক্রান্ত অতিরিক্ত বিবরণ..."
                  value={newEnrollmentForm.remarks}
                  onChange={(e) => setNewEnrollmentForm({ ...newEnrollmentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEnrollmentOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium shadow-xs"
                >
                  ভর্তি নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STATUS CHANGE */}
      {isStatusModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 font-hind mb-2">হিফজ ভর্তি স্ট্যাটাস পরিবর্তন</h2>
            <p className="text-xs text-slate-500 font-tiro mb-4">
              ভর্তি #{selectedEnrollment.enrollmentId} ({selectedEnrollment.studentName})
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-3 font-tiro text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নতুন অবস্থা (Status) *</label>
                <select
                  required
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="COMPLETED">সম্পন্ন / হাফেজ (Completed)</option>
                  <option value="TRANSFERRED">স্থানান্তরিত (Transferred)</option>
                  <option value="SUSPENDED">স্থগিত (Suspended)</option>
                  <option value="DROPPED">অব্যাহতি (Dropped)</option>
                  <option value="ARCHIVED">আর্কাইভ (Archived)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">মন্তব্য/কারণ</label>
                <textarea
                  rows={3}
                  placeholder="স্ট্যাটাস পরিবর্তনের কারণ..."
                  value={statusForm.remarks}
                  onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  হালনাগাদ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENROLLMENT DETAIL */}
      {isDetailModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 font-tiro text-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-teal-700 font-bold uppercase">Hifz Enrollment</span>
                <h2 className="text-base font-bold text-slate-900 font-hind">{selectedEnrollment.enrollmentId}</h2>
              </div>
              <div>{getStatusBadge(selectedEnrollment.status)}</div>
            </div>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">শিক্ষার্থীর নাম:</span>
                <span className="font-semibold text-slate-900 font-hind">{selectedEnrollment.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">স্টুডেন্ট আইডি:</span>
                <span className="font-mono font-bold text-teal-800">{selectedEnrollment.studentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">হিফজ স্তর:</span>
                <span className="font-medium">{selectedEnrollment.levelNameBn || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">পাঠ্যক্রম:</span>
                <span>{selectedEnrollment.curriculumNameBn || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">উস্তাদ:</span>
                <span>{selectedEnrollment.primaryUstadName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">আবাসন ধরন:</span>
                <span>{selectedEnrollment.studyType === 'RESIDENTIAL' ? 'আবাসিক' : 'অনাবাসিক'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">ভর্তির তারিখ:</span>
                <span className="font-mono">{selectedEnrollment.admissionDate}</span>
              </div>
              {selectedEnrollment.startJuz && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">আরম্ভিক পারা:</span>
                  <span className="font-mono font-semibold">{toBanglaNumber(selectedEnrollment.startJuz)}তম পারা</span>
                </div>
              )}
              {selectedEnrollment.target && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">লক্ষ্যমাত্রা:</span>
                  <span>{selectedEnrollment.target}</span>
                </div>
              )}
              {selectedEnrollment.remarks && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">নোট/মন্তব্য:</span>
                  <p className="bg-slate-50 p-2 rounded text-slate-600">{selectedEnrollment.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
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

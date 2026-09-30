import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  History,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { api } from '../lib/api';
import { Mosque } from '../types';
import {
  HifzH5DashboardData,
  HifzStudentHistoryData,
  HifzUstadHistoryData,
  HifzAttendanceSummaryGroup,
  HifzUstadAssignment,
} from '../types';

interface HifzDashboardHistoryViewProps {
  currentMosque: Mosque;
}

type H5CSubTab = 'dashboard' | 'student_history' | 'ustad_history' | 'attendance_summary' | 'current_assignments' | 'assignment_history';

export const HifzDashboardHistoryView: React.FC<HifzDashboardHistoryViewProps> = ({ currentMosque }) => {
  const [activeSubTab, setActiveSubTab] = useState<H5CSubTab>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters for Dashboard & Summary
  const [preset, setPreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<HifzH5DashboardData | null>(null);

  // Students & Ustads for Selection
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [ustadStaffList, setUstadStaffList] = useState<any[]>([]);

  // Student History state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentHistoryData, setStudentHistoryData] = useState<HifzStudentHistoryData | null>(null);
  const [isStudentHistoryLoading, setIsStudentHistoryLoading] = useState(false);

  // Ustad History state
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [ustadHistoryData, setUstadHistoryData] = useState<HifzUstadHistoryData | null>(null);
  const [isUstadHistoryLoading, setIsUstadHistoryLoading] = useState(false);

  // Attendance Summary state
  const [summaryGroupBy, setSummaryGroupBy] = useState<'date' | 'monthly'>('date');
  const [attendanceSummaries, setAttendanceSummaries] = useState<HifzAttendanceSummaryGroup[]>([]);
  const [summarySearchStudent, setSummarySearchStudent] = useState<string>('');

  // Assignments state
  const [currentAssignments, setCurrentAssignments] = useState<HifzUstadAssignment[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<HifzUstadAssignment[]>([]);
  const [assignmentSearch, setAssignmentSearch] = useState<string>('');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<string>('ALL');

  // Set default dates on preset change
  const applyPreset = (p: string) => {
    setPreset(p);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (p === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === 'last7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (p === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      setStartDate(start);
      setEndDate(todayStr);
    } else if (p === 'last_month') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const start = prev.toISOString().split('T')[0];
      const end = prevEnd.toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (p === 'custom') {
      // Keep existing custom dates
    }
  };

  useEffect(() => {
    applyPreset('this_month');
    loadInitialDropdowns();
  }, [currentMosque.id]);

  useEffect(() => {
    if (activeSubTab === 'dashboard') {
      loadDashboard();
    } else if (activeSubTab === 'attendance_summary') {
      loadAttendanceSummary();
    } else if (activeSubTab === 'current_assignments') {
      loadCurrentAssignments();
    } else if (activeSubTab === 'assignment_history') {
      loadAssignmentHistory();
    }
  }, [activeSubTab, startDate, endDate, preset, currentMosque.id]);

  const loadInitialDropdowns = async () => {
    try {
      const [enrList, staffList] = await Promise.all([
        api.getHifzEnrollments().catch(() => []),
        api.getStaff().catch(() => []),
      ]);
      setEnrollments(enrList || []);
      setUstadStaffList(staffList || []);
      if (enrList && enrList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(enrList[0].id);
      }
      if (staffList && staffList.length > 0 && !selectedStaffId) {
        setSelectedStaffId(staffList[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load initial dropdowns:', err);
    }
  };

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getHifzH5Dashboard({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        preset: preset || undefined,
      });
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'ড্যাশবোর্ড লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentHistory = async (studentId: string) => {
    if (!studentId) return;
    setIsStudentHistoryLoading(true);
    setError(null);
    try {
      const data = await api.getHifzH5StudentHistory(studentId);
      setStudentHistoryData(data);
    } catch (err: any) {
      setError(err.message || 'শিক্ষার্থীর ইতিহাস লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsStudentHistoryLoading(false);
    }
  };

  const loadUstadHistory = async (staffId: string) => {
    if (!staffId) return;
    setIsUstadHistoryLoading(true);
    setError(null);
    try {
      const data = await api.getHifzH5UstadHistory(staffId);
      setUstadHistoryData(data);
    } catch (err: any) {
      setError(err.message || 'উস্তাদের ইতিহাস লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsUstadHistoryLoading(false);
    }
  };

  const loadAttendanceSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getHifzH5AttendanceSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        studentId: summarySearchStudent || undefined,
        groupBy: summaryGroupBy,
      });
      setAttendanceSummaries(list);
    } catch (err: any) {
      setError(err.message || 'হাজিরা সারসংক্ষেপ লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentAssignments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getHifzH5CurrentAssignments({
        assignmentType: assignmentTypeFilter !== 'ALL' ? assignmentTypeFilter : undefined,
        search: assignmentSearch || undefined,
      });
      setCurrentAssignments(list);
    } catch (err: any) {
      setError(err.message || 'বর্তমান দায়িত্ব লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignmentHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getHifzH5HistoricalAssignments({
        search: assignmentSearch || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setAssignmentHistory(list);
    } catch (err: any) {
      setError(err.message || 'দায়িত্বের ইতিহাস লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">উপস্থিত</span>;
      case 'ABSENT':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">অনুপস্থিত</span>;
      case 'LATE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">বিলম্ব</span>;
      case 'LEAVE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">ছুটি</span>;
      case 'EXCUSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">মার্জনা</span>;
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">সক্রিয়</span>;
      case 'ENDED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">সমাপ্ত</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">বাতিলকৃত</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'ILLNESS': return 'অসুস্থতা';
      case 'FAMILY_REASON': return 'পারিবারিক কারণ';
      case 'TRAVEL': return 'সফর / ভ্রমণ';
      case 'APPROVED_LEAVE': return 'অনুমোদিত ছুটি';
      case 'EMERGENCY': return 'জরুরি প্রয়োজন';
      case 'OTHER': return 'অন্যান্য';
      default: return '—';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-100 text-teal-800">
              এইচ৫-সি (H5-C)
            </span>
            <h1 className="text-xl font-bold text-slate-900 font-hind">
              হিফজ ড্যাশবোর্ড ও ইতিহাস (Dashboard & History)
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-tiro mt-1">
            দৈনিক হাজিরা ও উস্তাদ নির্ধারণ সাবসিস্টেমের সমন্বিত বিশ্লেষণ ও বিস্তারিত ইতিহাস
          </p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl text-xs font-tiro">
          {[
            { id: 'dashboard' as const, label: '📊 ড্যাশবোর্ড' },
            { id: 'student_history' as const, label: '👨‍🎓 শিক্ষার্থীভিত্তিক ইতিহাস' },
            { id: 'ustad_history' as const, label: '👨‍🏫 উস্তাদভিত্তিক ইতিহাস' },
            { id: 'attendance_summary' as const, label: '📅 হাজিরা সারসংক্ষেপ' },
            { id: 'current_assignments' as const, label: '👥 বর্তমান দায়িত্ব' },
            { id: 'assignment_history' as const, label: '🔄 দায়িত্বের ইতিহাস' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeSubTab === tab.id
                  ? 'bg-white text-teal-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {error && (
        <div className="p-3 rounded-xl text-sm font-tiro bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* TAB 1: 📊 DASHBOARD */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-5">
          {/* DATE FILTER BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs font-tiro">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">সময়কাল:</span>
              {[
                { id: 'today', label: 'আজ' },
                { id: 'last7days', label: 'গত ৭ দিন' },
                { id: 'this_month', label: 'চলতি মাস' },
                { id: 'last_month', label: 'পূর্ববর্তী মাস' },
                { id: 'custom', label: 'কাস্টম' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    preset === p.id
                      ? 'bg-teal-700 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset('custom');
                }}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <span className="text-slate-400">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset('custom');
                }}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <button
                onClick={loadDashboard}
                disabled={isLoading}
                className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-md transition-colors border border-teal-200"
                title="রিফ্রেশ"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ATTENDANCE KPI CARDS */}
          <div>
            <h2 className="text-base font-bold text-slate-800 font-hind mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>দৈনিক হাজিরা বিশ্লেষণ (Attendance Analytics)</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 font-tiro">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500 block">মোট শিক্ষার্থী</span>
                <span className="text-xl font-bold text-slate-900 font-baloo">
                  {dashboardData?.attendanceKPI?.totalStudents ?? 0}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500 block">হাজিরা রেকর্ড</span>
                <span className="text-xl font-bold text-slate-900 font-baloo">
                  {dashboardData?.attendanceKPI?.totalRecords ?? 0}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-[11px] text-emerald-700 font-medium block">উপস্থিত</span>
                <span className="text-xl font-bold text-emerald-800 font-baloo">
                  {dashboardData?.attendanceKPI?.presentCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
                <span className="text-[11px] text-rose-700 font-medium block">অনুপস্থিত</span>
                <span className="text-xl font-bold text-rose-800 font-baloo">
                  {dashboardData?.attendanceKPI?.absentCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
                <span className="text-[11px] text-amber-700 font-medium block">বিলম্ব</span>
                <span className="text-xl font-bold text-amber-800 font-baloo">
                  {dashboardData?.attendanceKPI?.lateCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
                <span className="text-[11px] text-blue-700 font-medium block">ছুটি</span>
                <span className="text-xl font-bold text-blue-800 font-baloo">
                  {dashboardData?.attendanceKPI?.leaveCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-200 bg-purple-50/30 shadow-xs">
                <span className="text-[11px] text-purple-700 font-medium block">মার্জনা</span>
                <span className="text-xl font-bold text-purple-800 font-baloo">
                  {dashboardData?.attendanceKPI?.excusedCount ?? 0}
                </span>
              </div>
              <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 shadow-xs">
                <span className="text-[11px] text-teal-800 font-semibold block">উপস্থিতির হার</span>
                <span className="text-xl font-bold text-teal-900 font-baloo">
                  {dashboardData?.attendanceKPI?.attendanceRate ?? 0}%
                </span>
              </div>
            </div>
          </div>

          {/* USTAD ASSIGNMENT KPI CARDS */}
          <div>
            <h2 className="text-base font-bold text-slate-800 font-hind mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-700" />
              <span>উস্তাদ দায়িত্ব বিশ্লেষণ (Ustad Assignment Analytics)</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-tiro">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 block">সক্রিয় অ্যাসাইনমেন্ট</span>
                <span className="text-2xl font-bold text-teal-800 font-baloo">
                  {dashboardData?.ustadKPI?.totalActiveAssignments ?? 0}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-xs text-emerald-800 font-medium block">প্রধান উস্তাদ (PRIMARY)</span>
                <span className="text-2xl font-bold text-emerald-900 font-baloo">
                  {dashboardData?.ustadKPI?.activePrimaryCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs">
                <span className="text-xs text-blue-800 font-medium block">সহকারী (SECONDARY)</span>
                <span className="text-2xl font-bold text-blue-900 font-baloo">
                  {dashboardData?.ustadKPI?.activeSecondaryCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 block">দায়িত্বপ্রাপ্ত শিক্ষার্থী</span>
                <span className="text-2xl font-bold text-slate-900 font-baloo">
                  {dashboardData?.ustadKPI?.assignedStudentsCount ?? 0}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 block">নিযুক্ত উস্তাদ সংখ্যা</span>
                <span className="text-2xl font-bold text-slate-900 font-baloo">
                  {dashboardData?.ustadKPI?.totalUstadsActive ?? 0}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500 block">সমাপ্ত / বাতিলকৃত</span>
                <span className="text-2xl font-bold text-slate-600 font-baloo">
                  {(dashboardData?.ustadKPI?.endedAssignmentsCount ?? 0) + (dashboardData?.ustadKPI?.cancelledAssignmentsCount ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 👨‍🎓 STUDENT-WISE HISTORY */}
      {activeSubTab === 'student_history' && (
        <div className="space-y-4 font-tiro">
          {/* SELECTOR BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">শিক্ষার্থী নির্বাচন করুন:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                loadStudentHistory(e.target.value);
              }}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-600 focus:border-teal-600 min-w-[240px]"
            >
              <option value="">-- শিক্ষার্থী বাছাই করুন --</option>
              {enrollments.map((enr) => (
                <option key={enr.id} value={enr.id}>
                  {enr.studentName} ({enr.studentId || enr.enrollmentId}) — {enr.status}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadStudentHistory(selectedStudentId)}
              disabled={!selectedStudentId || isStudentHistoryLoading}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isStudentHistoryLoading ? 'animate-spin' : ''}`} />
              <span>ইতিহাস লোড করুন</span>
            </button>
          </div>

          {studentHistoryData && (
            <div className="space-y-4">
              {/* STUDENT PROFILE CARD */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-hind">
                    {studentHistoryData.student.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    আইডি: {studentHistoryData.student.studentId || studentHistoryData.student.enrollmentId} | ভর্তি: {studentHistoryData.student.admissionDate} | বিভাগ: {studentHistoryData.student.studyType === 'RESIDENTIAL' ? 'আবাসিক' : 'অনাবাসিক'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(studentHistoryData.student.status)}
                  {studentHistoryData.attendanceSummary && (
                    <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-md text-teal-800 text-xs font-bold font-baloo">
                      উপস্থিতি: {studentHistoryData.attendanceSummary.attendanceRate}%
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION: USTAD ASSIGNMENT HISTORY */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 font-hind flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>উস্তাদ নির্ধারণের ইতিহাস (Assignment History)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-baloo">মোট: {studentHistoryData.assignments.length}টি</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">অ্যাসাইনমেন্ট আইডি</th>
                        <th className="p-3">উস্তাদের নাম</th>
                        <th className="p-3">ধরন</th>
                        <th className="p-3">শুরুর তারিখ</th>
                        <th className="p-3">সমাপ্তির তারিখ</th>
                        <th className="p-3">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentHistoryData.assignments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            কোনো উস্তাদ নির্ধারণের রেকর্ড নেই
                          </td>
                        </tr>
                      ) : (
                        studentHistoryData.assignments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-baloo font-medium">{a.assignmentId}</td>
                            <td className="p-3 font-semibold text-slate-800">{a.ustadName || '—'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                a.assignmentType === 'PRIMARY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {a.assignmentType === 'PRIMARY' ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ'}
                              </span>
                            </td>
                            <td className="p-3 font-baloo">{a.startDate}</td>
                            <td className="p-3 font-baloo">{a.endDate || '—'}</td>
                            <td className="p-3">{getStatusBadge(a.status)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: ATTENDANCE HISTORY */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 font-hind flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>দৈনিক হাজিরা ইতিহাস (Attendance History)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-baloo">মোট রেকর্ড: {studentHistoryData.attendances.length}টি</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">হাজিরা আইডি</th>
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">স্ট্যাটাস</th>
                        <th className="p-3">কারণ</th>
                        <th className="p-3">মন্তব্য</th>
                        <th className="p-3">লিপিবদ্ধকারী</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentHistoryData.attendances.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            কোনো হাজিরা রেকর্ড পাওয়া যায়নি
                          </td>
                        </tr>
                      ) : (
                        studentHistoryData.attendances.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-baloo font-medium">{att.attendanceId}</td>
                            <td className="p-3 font-baloo font-semibold text-slate-800">{att.date}</td>
                            <td className="p-3">{getStatusBadge(att.status)}</td>
                            <td className="p-3 text-slate-600">
                              {getReasonLabel(att.reason)}
                              {att.otherReason && <span className="text-[11px] block text-slate-400">({att.otherReason})</span>}
                            </td>
                            <td className="p-3 text-slate-500">{att.remarks || '—'}</td>
                            <td className="p-3 text-slate-500">{att.recordedByName || 'সিস্টেম'}</td>
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
      )}

      {/* TAB 3: 👨‍🏫 USTAD-WISE HISTORY */}
      {activeSubTab === 'ustad_history' && (
        <div className="space-y-4 font-tiro">
          {/* SELECTOR BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">উস্তাদ নির্বাচন করুন:</span>
            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                loadUstadHistory(e.target.value);
              }}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-600 focus:border-teal-600 min-w-[240px]"
            >
              <option value="">-- উস্তাদ বাছাই করুন --</option>
              {ustadStaffList.map((stf) => (
                <option key={stf.id} value={stf.id}>
                  {stf.name} ({stf.staffCode || stf.designationBn || stf.designation})
                </option>
              ))}
            </select>

            <button
              onClick={() => loadUstadHistory(selectedStaffId)}
              disabled={!selectedStaffId || isUstadHistoryLoading}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUstadHistoryLoading ? 'animate-spin' : ''}`} />
              <span>ইতিহাস লোড করুন</span>
            </button>
          </div>

          {ustadHistoryData && (
            <div className="space-y-4">
              {/* USTAD PROFILE CARD */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-hind">
                    {ustadHistoryData.ustad.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    পদবি: {ustadHistoryData.ustad.designationBn || ustadHistoryData.ustad.designation} | কোড: {ustadHistoryData.ustad.staffCode || '—'} | মোবাইল: {ustadHistoryData.ustad.phone || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3 font-baloo text-xs">
                  <div className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg text-teal-800">
                    <span className="block text-[10px] text-teal-600">বর্তমান শিক্ষার্থী</span>
                    <span className="text-base font-bold">{ustadHistoryData.currentStudentsCount} জন</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                    <span className="block text-[10px] text-slate-500">সক্রিয় প্রধান উস্তাদ</span>
                    <span className="text-base font-bold">{ustadHistoryData.primaryAssignmentsCount}টি</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                    <span className="block text-[10px] text-slate-500">সহকারী উস্তাদ</span>
                    <span className="text-base font-bold">{ustadHistoryData.secondaryAssignmentsCount}টি</span>
                  </div>
                </div>
              </div>

              {/* SECTION: ACTIVE ASSIGNMENTS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-emerald-900 font-hind flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>বর্তমানে দায়িত্বপ্রাপ্ত শিক্ষার্থীরা (Active Students)</span>
                  </h4>
                  <span className="text-xs text-emerald-700 font-baloo">সক্রিয়: {ustadHistoryData.activeAssignments.length}টি</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">অ্যাসাইনমেন্ট আইডি</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        <th className="p-3">শিক্ষার্থী আইডি</th>
                        <th className="p-3">ধরন</th>
                        <th className="p-3">শুরুর তারিখ</th>
                        <th className="p-3">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ustadHistoryData.activeAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            বর্তমানে কোনো শিক্ষার্থী দায়িত্বে নেই
                          </td>
                        </tr>
                      ) : (
                        ustadHistoryData.activeAssignments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-baloo font-medium">{a.assignmentId}</td>
                            <td className="p-3 font-semibold text-slate-800">{a.studentName || '—'}</td>
                            <td className="p-3 font-baloo">{a.studentId || '—'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                a.assignmentType === 'PRIMARY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {a.assignmentType === 'PRIMARY' ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ'}
                              </span>
                            </td>
                            <td className="p-3 font-baloo">{a.startDate}</td>
                            <td className="p-3">{getStatusBadge(a.status)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: HISTORICAL ASSIGNMENTS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 font-hind flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    <span>পূর্ববর্তী দায়িত্বের ইতিহাস (Historical Assignments)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-baloo">মোট: {ustadHistoryData.historicalAssignments.length}টি</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">অ্যাসাইনমেন্ট আইডি</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        <th className="p-3">ধরন</th>
                        <th className="p-3">শুরুর তারিখ</th>
                        <th className="p-3">সমাপ্তির তারিখ</th>
                        <th className="p-3">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ustadHistoryData.historicalAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            কোনো পূর্ববর্তী দায়িত্বের রেকর্ড নেই
                          </td>
                        </tr>
                      ) : (
                        ustadHistoryData.historicalAssignments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-baloo font-medium">{a.assignmentId}</td>
                            <td className="p-3 font-semibold text-slate-800">{a.studentName || '—'}</td>
                            <td className="p-3">{a.assignmentType === 'PRIMARY' ? 'প্রধান' : 'সহকারী'}</td>
                            <td className="p-3 font-baloo">{a.startDate}</td>
                            <td className="p-3 font-baloo">{a.endDate || '—'}</td>
                            <td className="p-3">{getStatusBadge(a.status)}</td>
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
      )}

      {/* TAB 4: 📅 ATTENDANCE SUMMARY */}
      {activeSubTab === 'attendance_summary' && (
        <div className="space-y-4 font-tiro">
          {/* FILTER & GROUP TOGGLE */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">গ্রুপিং:</span>
              <button
                onClick={() => {
                  setSummaryGroupBy('date');
                  loadAttendanceSummary();
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  summaryGroupBy === 'date' ? 'bg-teal-700 text-white font-bold' : 'bg-slate-100 text-slate-700'
                }`}
              >
                দৈনিক (Daily)
              </button>
              <button
                onClick={() => {
                  setSummaryGroupBy('monthly');
                  loadAttendanceSummary();
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  summaryGroupBy === 'monthly' ? 'bg-teal-700 text-white font-bold' : 'bg-slate-100 text-slate-700'
                }`}
              >
                মাসিক (Monthly)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <span className="text-slate-400">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <button
                onClick={loadAttendanceSummary}
                className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-medium transition-colors"
              >
                ফিল্টার
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">{summaryGroupBy === 'monthly' ? 'মাস (YYYY-MM)' : 'তারিখ (YYYY-MM-DD)'}</th>
                    <th className="p-3 text-center">মোট রেকর্ড</th>
                    <th className="p-3 text-center text-emerald-800">উপস্থিত</th>
                    <th className="p-3 text-center text-rose-800">অনুপস্থিত</th>
                    <th className="p-3 text-center text-amber-800">বিলম্ব</th>
                    <th className="p-3 text-center text-blue-800">ছুটি</th>
                    <th className="p-3 text-center text-purple-800">মার্জনা</th>
                    <th className="p-3 text-center text-teal-800">উপস্থিতির হার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-baloo">
                  {attendanceSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 font-tiro">
                        কোনো হাজিরা রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    attendanceSummaries.map((grp) => (
                      <tr key={grp.dateOrMonth} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{grp.dateOrMonth}</td>
                        <td className="p-3 text-center font-medium text-slate-600">{grp.totalRecords}</td>
                        <td className="p-3 text-center font-bold text-emerald-700">{grp.present}</td>
                        <td className="p-3 text-center font-bold text-rose-700">{grp.absent}</td>
                        <td className="p-3 text-center font-bold text-amber-700">{grp.late}</td>
                        <td className="p-3 text-center font-bold text-blue-700">{grp.leave}</td>
                        <td className="p-3 text-center font-bold text-purple-700">{grp.excused}</td>
                        <td className="p-3 text-center font-bold text-teal-800">{grp.attendanceRate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: 👥 CURRENT ASSIGNMENTS */}
      {activeSubTab === 'current_assignments' && (
        <div className="space-y-4 font-tiro">
          {/* SEARCH & FILTER BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="উস্তাদ / শিক্ষার্থী দিয়ে খুঁজুন..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="w-full px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">ধরন:</span>
              <select
                value={assignmentTypeFilter}
                onChange={(e) => {
                  setAssignmentTypeFilter(e.target.value);
                  loadCurrentAssignments();
                }}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              >
                <option value="ALL">সকল ধরন</option>
                <option value="PRIMARY">প্রধান উস্তাদ (PRIMARY)</option>
                <option value="SECONDARY">সহকারী উস্তাদ (SECONDARY)</option>
              </select>
              <button
                onClick={loadCurrentAssignments}
                className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-medium transition-colors"
              >
                খুঁজুন
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">অ্যাসাইনমেন্ট আইডি</th>
                    <th className="p-3">শিক্ষার্থীর নাম</th>
                    <th className="p-3">আইডি</th>
                    <th className="p-3">উস্তাদের নাম</th>
                    <th className="p-3">ধরন</th>
                    <th className="p-3">শুরুর তারিখ</th>
                    <th className="p-3">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        কোনো সক্রিয় উস্তাদ দায়িত্ব পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    currentAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-baloo font-medium">{a.assignmentId}</td>
                        <td className="p-3 font-semibold text-slate-900">{a.studentName || '—'}</td>
                        <td className="p-3 font-baloo text-slate-500">{a.studentId || '—'}</td>
                        <td className="p-3 font-semibold text-teal-800">{a.ustadName || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            a.assignmentType === 'PRIMARY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {a.assignmentType === 'PRIMARY' ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ'}
                          </span>
                        </td>
                        <td className="p-3 font-baloo">{a.startDate}</td>
                        <td className="p-3">{getStatusBadge(a.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 🔄 ASSIGNMENT HISTORY */}
      {activeSubTab === 'assignment_history' && (
        <div className="space-y-4 font-tiro">
          {/* SEARCH & FILTER BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="উস্তাদ / শিক্ষার্থী দিয়ে খুঁজুন..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="w-full px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <span className="text-slate-400">থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
              />
              <button
                onClick={loadAssignmentHistory}
                className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-medium transition-colors"
              >
                ফিল্টার
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">অ্যাসাইনমেন্ট আইডি</th>
                    <th className="p-3">শিক্ষার্থীর নাম</th>
                    <th className="p-3">উস্তাদের নাম</th>
                    <th className="p-3">ধরন</th>
                    <th className="p-3">শুরুর তারিখ</th>
                    <th className="p-3">সমাপ্তির তারিখ</th>
                    <th className="p-3">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignmentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        কোনো সমাপ্ত বা বাতিলকৃত দায়িত্বের ইতিহাস নেই
                      </td>
                    </tr>
                  ) : (
                    assignmentHistory.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-baloo font-medium">{a.assignmentId}</td>
                        <td className="p-3 font-semibold text-slate-900">{a.studentName || '—'}</td>
                        <td className="p-3 font-semibold text-slate-700">{a.ustadName || '—'}</td>
                        <td className="p-3">{a.assignmentType === 'PRIMARY' ? 'প্রধান' : 'সহকারী'}</td>
                        <td className="p-3 font-baloo">{a.startDate}</td>
                        <td className="p-3 font-baloo">{a.endDate || '—'}</td>
                        <td className="p-3">{getStatusBadge(a.status)}</td>
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

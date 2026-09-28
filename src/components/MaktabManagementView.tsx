import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  UserCheck,
  CreditCard,
  TrendingUp,
  QrCode,
  FileBarChart,
  Printer,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  Download,
  Eye,
  RefreshCw,
  Phone,
  Calendar,
  DollarSign,
  Award,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  EducationStudentProfile,
  EducationLevel,
  MaktabClass,
  MaktabAttendance,
  MaktabTeacherAssignment,
  MaktabFeeSchedule,
  MaktabFeeRecord,
  MaktabStudentProgress,
  MaktabDashboardStats,
  FinancialAccount,
  PersonMaster,
} from '../types';
import { toBanglaNumber } from './CommitteeView';

export type MaktabSubSection =
  | 'dashboard'
  | 'students'
  | 'classes'
  | 'attendance'
  | 'teachers'
  | 'fees'
  | 'progress'
  | 'idCard'
  | 'reports'
  | 'print';

interface MaktabManagementViewProps {
  currentMosque?: any;
  currentUser?: any;
  accounts?: FinancialAccount[];
  language?: string;
  onNavigateTab?: (tab: string) => void;
}

export const MaktabManagementView: React.FC<MaktabManagementViewProps> = ({
  currentMosque,
  currentUser,
  accounts = [],
  language = 'bn',
}) => {
  const [activeSection, setActiveSection] = useState<MaktabSubSection>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Domain data
  const [stats, setStats] = useState<MaktabDashboardStats | null>(null);
  const [students, setStudents] = useState<EducationStudentProfile[]>([]);
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [classes, setClasses] = useState<MaktabClass[]>([]);
  const [attendances, setAttendances] = useState<MaktabAttendance[]>([]);
  const [teachersData, setTeachersData] = useState<{ assignments: MaktabTeacherAssignment[]; availableStaff: any[] }>({
    assignments: [],
    availableStaff: [],
  });
  const [feeSchedules, setFeeSchedules] = useState<MaktabFeeSchedule[]>([]);
  const [feeRecords, setFeeRecords] = useState<MaktabFeeRecord[]>([]);
  const [progressList, setProgressList] = useState<MaktabStudentProgress[]>([]);
  const [personsList, setPersonsList] = useState<PersonMaster[]>([]);

  // Selected student for details or ID card
  const [selectedStudent, setSelectedStudent] = useState<EducationStudentProfile | null>(null);

  // Filters & Pickers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('ALL');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceClassId, setAttendanceClassId] = useState<string>('ALL');

  // Daily attendance draft map: studentProfileId -> status
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE'>>({});
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isCollectFeeOpen, setIsCollectFeeOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<MaktabFeeRecord | null>(null);
  const [isAddProgressOpen, setIsAddProgressOpen] = useState(false);
  const [isMonthlyFeeGenOpen, setIsMonthlyFeeGenOpen] = useState(false);

  // Form States
  const [newStudentForm, setNewStudentForm] = useState({
    personId: '',
    admissionDate: new Date().toISOString().split('T')[0],
    levelId: '',
    guardianPersonId: '',
    relationshipType: 'FATHER',
    priorEducation: '',
    notes: '',
  });

  const [newClassForm, setNewClassForm] = useState({
    nameBn: '',
    levelId: '',
    shift: 'MORNING' as 'MORNING' | 'AFTERNOON' | 'EVENING',
    teacherStaffId: '',
    room: '',
    maxCapacity: 30,
  });

  const [newTeacherForm, setNewTeacherForm] = useState({
    staffId: '',
    classId: '',
    levelId: '',
    role: 'HEAD_TEACHER' as 'HEAD_TEACHER' | 'ASSISTANT_TEACHER' | 'SUBJECT_TEACHER',
    effectiveFrom: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [collectFeeForm, setCollectFeeForm] = useState({
    paidAmount: 0,
    paymentMethod: 'CASH',
    accountId: accounts[0]?.id || '',
    receiptNo: '',
    notes: '',
  });

  const [newProgressForm, setNewProgressForm] = useState({
    studentProfileId: '',
    levelId: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    qaidaLesson: '',
    amparaSurah: '',
    nazeraPara: 1,
    deeniyatTopic: '',
    status: 'IN_PROGRESS' as 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVISION',
    overallGrade: 'A' as any,
    teacherStaffId: '',
    teacherRemarks: '',
    nextTarget: '',
  });

  const [monthlyFeeForm, setMonthlyFeeForm] = useState({
    feeScheduleId: '',
    billingMonth: new Date().toISOString().slice(0, 7),
  });

  // Load all operational data
  const loadMaktabData = async () => {
    setIsLoading(true);
    try {
      const [
        statsData,
        studentsData,
        levelsData,
        classesData,
        teachersRes,
        schedulesData,
        feesData,
        progressData,
        personsRes,
      ] = await Promise.all([
        api.getMaktabDashboardStats().catch(() => null),
        api.getEducationStudents().catch(() => []),
        api.getEducationLevels({ programType: 'MAKTAB' }).catch(() => []),
        api.getMaktabClasses().catch(() => []),
        api.getMaktabTeachers().catch(() => ({ assignments: [], availableStaff: [] })),
        api.getMaktabFeeSchedules().catch(() => []),
        api.getMaktabFeeRecords().catch(() => []),
        api.getMaktabProgress().catch(() => []),
        api.getPersons().catch(() => []),
      ]);

      setStats(statsData);
      setStudents(studentsData);
      setLevels(levelsData);
      setClasses(classesData);
      setTeachersData(teachersRes);
      setFeeSchedules(schedulesData);
      setFeeRecords(feesData);
      setProgressList(progressData);
      setPersonsList(personsRes);

      // Load today's attendance
      const todayAtt = await api.getMaktabAttendance({ date: attendanceDate }).catch(() => []);
      setAttendances(todayAtt);

      // Populate draft attendance
      const draft: Record<string, 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE'> = {};
      todayAtt.forEach((a) => {
        draft[a.studentProfileId] = a.status;
      });
      studentsData.forEach((s) => {
        if (!draft[s.id]) {
          draft[s.id] = 'PRESENT';
        }
      });
      setAttendanceDraft(draft);
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'ডাটা লোড করতে সমস্যা হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaktabData();
  }, []);

  // Handle Attendance date change
  const handleDateChange = async (newDate: string) => {
    setAttendanceDate(newDate);
    try {
      const att = await api.getMaktabAttendance({ date: newDate });
      setAttendances(att);
      const draft: Record<string, 'PRESENT' | 'ABSENT' | 'LEAVE' | 'LATE'> = {};
      att.forEach((a) => {
        draft[a.studentProfileId] = a.status;
      });
      students.forEach((s) => {
        if (!draft[s.id]) {
          draft[s.id] = 'PRESENT';
        }
      });
      setAttendanceDraft(draft);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Submit bulk attendance
  const handleSubmitBulkAttendance = async () => {
    setIsSubmittingAttendance(true);
    setFeedbackMessage(null);
    try {
      const records = Object.entries(attendanceDraft).map(([studentProfileId, status]) => {
        const student = students.find((s) => s.id === studentProfileId);
        return {
          studentProfileId,
          studentId: student?.studentId,
          status,
        };
      });

      const res = await api.recordBulkMaktabAttendance({
        date: attendanceDate,
        classId: attendanceClassId !== 'ALL' ? attendanceClassId : undefined,
        records,
      });

      setFeedbackMessage({ type: 'success', text: `হাজিরা সফলভাবে সংরক্ষণ হয়েছে (${res.createdCount} নতুন, ${res.updatedCount} সংশোধিত)।` });
      const updated = await api.getMaktabAttendance({ date: attendanceDate });
      setAttendances(updated);
      const updatedStats = await api.getMaktabDashboardStats();
      setStats(updatedStats);
    } catch (e: any) {
      setFeedbackMessage({ type: 'error', text: e.message || 'হাজিরা সংরক্ষণে ত্রুটি ঘটেছে।' });
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // Create Student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newStudent = await api.createEducationStudent({
        personId: newStudentForm.personId,
        admissionDate: newStudentForm.admissionDate,
        guardianPersonId: newStudentForm.guardianPersonId || undefined,
        relationshipType: newStudentForm.relationshipType,
        priorEducation: newStudentForm.priorEducation,
        notes: newStudentForm.notes,
        initialEnrollment: newStudentForm.levelId ? {
          programId: levels.find((l) => l.id === newStudentForm.levelId)?.programId,
          levelId: newStudentForm.levelId,
          startDate: newStudentForm.admissionDate,
        } : undefined,
      });

      setFeedbackMessage({ type: 'success', text: `নতুন শিক্ষার্থী ${newStudent.personName} সফলভাবে যুক্ত হয়েছে (আইডি: ${newStudent.studentId})।` });
      setIsAddStudentOpen(false);
      loadMaktabData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'শিক্ষার্থী যোগ করতে ব্যর্থ হয়েছে।' });
    }
  };

  // Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaktabClass(newClassForm);
      setFeedbackMessage({ type: 'success', text: 'নতুন জামাত/ব্যাচ সফলভাবে তৈরি হয়েছে।' });
      setIsAddClassOpen(false);
      loadMaktabData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'জামাত তৈরি করতে ব্যর্থ হয়েছে।' });
    }
  };

  // Assign Teacher
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMaktabTeacherAssignment(newTeacherForm);
      setFeedbackMessage({ type: 'success', text: 'শিক্ষক দায়িত্ব সফলভাবে যুক্ত হয়েছে।' });
      setIsAddTeacherOpen(false);
      loadMaktabData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'শিক্ষক দায়িত্ব প্রদানে ত্রুটি।' });
    }
  };

  // Collect Fee -> Posts directly to Canonical Finance
  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeRecord) return;
    try {
      const res = await api.collectMaktabFee(selectedFeeRecord.id, collectFeeForm);
      setFeedbackMessage({
        type: 'success',
        text: `ফি সফলভাবে আদায় হয়েছে এবং মূল আর্থিক তহবিলে ৳ ${res.feeRecord.paidAmount} জমা হয়েছে (ভাউচার #${res.canonicalIncome.voucherNumber})।`,
      });
      setIsCollectFeeOpen(false);
      setSelectedFeeRecord(null);
      loadMaktabData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'ফি আদায়ে ত্রুটি ঘটেছে।' });
    }
  };

  // Generate Monthly Fees
  const handleGenerateMonthlyFees = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.generateMonthlyMaktabFees(monthlyFeeForm);
      setFeedbackMessage({
        type: 'success',
        text: `${res.generatedCount} জন শিক্ষার্থীর জন্য মাসিক ফি রেকর্ড সফলভাবে তৈরি হয়েছে (স্কিপ: ${res.skippedCount})।`,
      });
      setIsMonthlyFeeGenOpen(false);
      loadMaktabData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'মাসিক ফি জেনারেট করতে ত্রুটি।' });
    }
  };

  // Add Progress Record
  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedLvl = levels.find((l) => l.id === newProgressForm.levelId);
      await api.createMaktabProgress({
        ...newProgressForm,
        levelCode: selectedLvl?.code || 'QAIDA',
      });
      setFeedbackMessage({ type: 'success', text: 'পাঠ অগ্রগতি সফলভাবে লিপিবদ্ধ হয়েছে।' });
      setIsAddProgressOpen(false);
      loadMaktabData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'পাঠ অগ্রগতি সংরক্ষণে ত্রুটি।' });
    }
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.personName && s.personName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.personMobile && s.personMobile.includes(searchQuery));

    const matchesLevel =
      selectedLevelId === 'ALL' ||
      s.activeEnrollments?.some((e) => e.levelId === selectedLevelId);

    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* INTERNAL SECONDARY SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-hind">🕌 মক্তব সাবসিস্টেম</h2>
            <p className="text-xs text-slate-500 font-tiro">কুরআন ও দ্বীনিয়াত শিক্ষা</p>
          </div>
          <button
            onClick={loadMaktabData}
            title="রিফ্রেশ"
            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <nav className="p-2 space-y-1">
          {[
            { id: 'dashboard' as const, label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
            { id: 'students' as const, label: 'শিক্ষার্থী ব্যবস্থাপনা', icon: Users, badge: students.length },
            { id: 'classes' as const, label: 'জামাত ও পাঠ্যক্রম', icon: BookOpen, badge: classes.length },
            { id: 'attendance' as const, label: 'শিক্ষার্থী হাজিরা', icon: CalendarCheck },
            { id: 'teachers' as const, label: 'শিক্ষক ও দায়িত্ব', icon: UserCheck, badge: teachersData.assignments.length },
            { id: 'fees' as const, label: 'শিক্ষার্থী ফি ও আদায়', icon: CreditCard },
            { id: 'progress' as const, label: 'পাঠ অগ্রগতি', icon: TrendingUp },
            { id: 'idCard' as const, label: 'স্টুডেন্ট আইডি কার্ড', icon: QrCode },
            { id: 'reports' as const, label: 'মক্তব রিপোর্টস', icon: FileBarChart },
            { id: 'print' as const, label: 'রেজিস্টার ও ফরম প্রিন্ট', icon: Printer },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setFeedbackMessage(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className="font-tiro">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {toBanglaNumber(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`mb-4 p-3.5 rounded-lg border text-sm flex items-center justify-between transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
              <span className="font-tiro font-medium">{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. DASHBOARD */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-hind">মক্তব শিক্ষা সারসংক্ষেপ</h1>
                <p className="text-sm text-slate-500 font-tiro">
                  আজকের তারিখ: {toBanglaNumber(new Date().toLocaleDateString('bn-BD'))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন ভর্তি</span>
                </button>
                <button
                  onClick={() => setActiveSection('attendance')}
                  className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  <span>আজকের হাজিরা</span>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-tiro">মোট সক্রিয় শিক্ষার্থী</span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {toBanglaNumber(stats?.totalActiveStudents || students.length)} জন
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-tiro">আজকের উপস্থিতি হার</span>
                  <CalendarCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700 font-mono">
                  {toBanglaNumber(stats?.attendanceRateToday || 0)}%
                </div>
                <div className="text-xs text-slate-400 mt-1 font-tiro">
                  উপস্থিত: {toBanglaNumber(stats?.presentToday || 0)} | অনুপস্থিত: {toBanglaNumber(stats?.absentToday || 0)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-tiro">চলতি মাসের ফি আদায়</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700 font-mono">
                  ৳ {toBanglaNumber(stats?.currentMonthFeeCollected || 0)}
                </div>
                <div className="text-xs text-rose-500 mt-1 font-tiro">
                  মোট বকেয়া: ৳ {toBanglaNumber(stats?.totalFeeDue || 0)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-tiro">সক্রিয় জামাত ও উস্তাদ</span>
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {toBanglaNumber(stats?.totalClasses || classes.length)} জামাত
                </div>
                <div className="text-xs text-slate-500 mt-1 font-tiro">
                  নির্ধারিত উস্তাদ: {toBanglaNumber(stats?.activeTeachersCount || 0)} জন
                </div>
              </div>
            </div>

            {/* Alerts if any */}
            {stats?.alerts && stats.alerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5 font-hind mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>প্রয়োজনীয় সতর্কবার্তা ({toBanglaNumber(stats.alerts.length)})</span>
                </h3>
                <ul className="space-y-1">
                  {stats.alerts.map((alert, idx) => (
                    <li key={idx} className="text-xs text-amber-800 font-tiro list-disc list-inside">
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Progress / Fast actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 font-hind">সর্বশেষ পাঠ অগ্রগতি ও মূল্যায়ন</h3>
                <button
                  onClick={() => setIsAddProgressOpen(true)}
                  className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-tiro"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন মূল্যায়ন যোগ করুন</span>
                </button>
              </div>

              {progressList.length === 0 ? (
                <p className="text-sm text-slate-400 font-tiro py-6 text-center">এখনো কোনো মূল্যায়ন রেকর্ড নেই।</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 font-tiro">
                        <th className="pb-2">শিক্ষার্থী</th>
                        <th className="pb-2">জামাত</th>
                        <th className="pb-2">পাঠ্য বিষয়</th>
                        <th className="pb-2">গ্রেড</th>
                        <th className="pb-2">তারিখ</th>
                        <th className="pb-2">উস্তাদ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-tiro">
                      {progressList.slice(0, 5).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 font-medium text-slate-900">{p.studentName || p.studentId}</td>
                          <td className="py-2.5 text-slate-600">{p.levelNameBn || p.levelCode}</td>
                          <td className="py-2.5 text-slate-600">{p.qaidaLesson || p.amparaSurah || p.deeniyatTopic || 'সাধারণ পাঠ'}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                              {p.overallGrade}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-500 font-mono text-xs">{p.assessmentDate}</td>
                          <td className="py-2.5 text-slate-600">{p.teacherName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. STUDENTS MANAGEMENT */}
        {activeSection === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">শিক্ষার্থী ব্যবস্থাপনা</h1>
                <p className="text-xs text-slate-500 font-tiro">PersonMaster অথরিটেটিভ যুক্ত শিক্ষার্থী তালিকা</p>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-xs transition-colors self-start"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন শিক্ষার্থী ভর্তি</span>
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 shadow-xs">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="শিক্ষার্থী নাম, আইডি বা মোবাইল খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-tiro"
                />
              </div>

              <select
                value={selectedLevelId}
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-tiro"
              >
                <option value="ALL">সকল জামাত/স্তর</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.nameBn}
                  </option>
                ))}
              </select>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-tiro">
                  <tr>
                    <th className="px-4 py-3">শিক্ষার্থী আইডি</th>
                    <th className="px-4 py-3">নাম ও মোবাইল</th>
                    <th className="px-4 py-3">বর্তমান জামাত</th>
                    <th className="px-4 py-3">অভিভাবক</th>
                    <th className="px-4 py-3">ভর্তি তারিখ</th>
                    <th className="px-4 py-3">অবস্থা</th>
                    <th className="px-4 py-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-tiro">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        কোনো শিক্ষার্থী পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const activeEnr = s.activeEnrollments?.[0];
                      const primaryGuardian = s.guardians?.[0];
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-emerald-800">{s.studentId}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{s.personName}</div>
                            {s.personMobile && <div className="text-xs text-slate-400 font-mono">{s.personMobile}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {activeEnr ? activeEnr.levelNameBn || activeEnr.levelId : 'জামাত নির্ধারিত নয়'}
                          </td>
                          <td className="px-4 py-3">
                            {primaryGuardian ? (
                              <div>
                                <span className="font-medium text-slate-800">{primaryGuardian.guardianName}</span>
                                <span className="text-xs text-slate-400 block font-mono">({primaryGuardian.relationshipTitleBn || primaryGuardian.relationshipType})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">অনির্ধারিত</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.admissionDate}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudent(s);
                                setActiveSection('idCard');
                              }}
                              title="আইডি কার্ড"
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. CLASSES & CURRICULUM */}
        {activeSection === 'classes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">জামাত ও পাঠ্যক্রম</h1>
                <p className="text-xs text-slate-500 font-tiro">মক্তব ব্যাচ ও সিল্যাবাস রূপরেখা</p>
              </div>
              <button
                onClick={() => setIsAddClassOpen(true)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন জামাত/ব্যাচ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div key={cls.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold">
                        {cls.shift === 'MORNING' ? 'সকাল শিফট' : cls.shift === 'AFTERNOON' ? 'বিকাল শিফট' : 'সান্ধ্যকালীন'}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        ধারক ক্ষমতা: {toBanglaNumber(cls.maxCapacity || 30)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-hind">{cls.nameBn}</h3>
                    <p className="text-xs text-slate-500 font-tiro mt-1">
                      স্তর: <span className="font-medium text-slate-700">{cls.levelNameBn || cls.levelCode}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-tiro mt-0.5">
                      কক্ষ: <span className="font-medium text-slate-700">{cls.room || 'অনির্ধারিত'}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-tiro mt-0.5">
                      উস্তাদ: <span className="font-medium text-emerald-800">{cls.teacherName || 'উস্তাদ নির্ধারিত নেই'}</span>
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-tiro">
                    <span>সক্রিয় শিক্ষার্থী: {toBanglaNumber(cls.activeStudentCount || 0)} জন</span>
                    <span className="text-emerald-700 font-semibold">{cls.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Curriculum reference guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
              <h3 className="text-sm font-bold text-slate-900 font-hind mb-2">মক্তব প্রমিত পাঠ্যক্রম রূপরেখা</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-tiro">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-emerald-800">১. কায়দা জামাত</div>
                  <div className="text-slate-500 mt-1">হরফ, মাখরাজ, হরকত, তানভীন, জজম, তাশদীদ ও মাদ শিক্ষা।</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-emerald-800">২. আমপারা জামাত</div>
                  <div className="text-slate-500 mt-1">৩০তম পারার প্রাথমিক মাশক, সুর ও সহীহ তিলাওয়াত অনুশীলন।</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-emerald-800">৩. নাজেরা জামাত</div>
                  <div className="text-slate-500 mt-1">পূর্ণ আল-কুরআন দেখে বিশুদ্ধ তাজভীদ সহ নিয়মিত তিলাওয়াত।</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="font-bold text-emerald-800">৪. দ্বীনিয়াত জামাত</div>
                  <div className="text-slate-500 mt-1">নামাজ, জরুরি মাসআলা, মাসনূন দুআ, হাদিস ও চরিত্র গঠন।</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ATTENDANCE */}
        {activeSection === 'attendance' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">দৈনিক শিক্ষার্থী হাজিরা</h1>
                <p className="text-xs text-slate-500 font-tiro">এক ক্লিকে হাজিরা গ্রহণ ও ডুপ্লিকেট প্রটেকশন</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white font-mono"
                />
                <button
                  onClick={handleSubmitBulkAttendance}
                  disabled={isSubmittingAttendance}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingAttendance ? 'সংরক্ষণ হচ্ছে...' : 'হাজিরা নিশ্চিত করুন'}</span>
                </button>
              </div>
            </div>

            {/* Quick bulk presets */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
              <span className="text-xs font-tiro text-slate-600 font-medium">দ্রুত নির্ধারণ:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allPresent: Record<string, 'PRESENT'> = {};
                    students.forEach((s) => (allPresent[s.id] = 'PRESENT'));
                    setAttendanceDraft(allPresent);
                  }}
                  className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  সবাই উপস্থিত
                </button>
              </div>
            </div>

            {/* Attendance list */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm font-tiro">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">আইডি</th>
                    <th className="px-4 py-3">শিক্ষার্থী নাম</th>
                    <th className="px-4 py-3">জামাত</th>
                    <th className="px-4 py-3">হাজিরার অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => {
                    const currentStatus = attendanceDraft[s.id] || 'PRESENT';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{s.studentId}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{s.personName}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {s.activeEnrollments?.[0]?.levelNameBn || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {[
                              { id: 'PRESENT', label: 'উপস্থিত', color: 'bg-emerald-600 text-white' },
                              { id: 'ABSENT', label: 'অনুপস্থিত', color: 'bg-rose-600 text-white' },
                              { id: 'LEAVE', label: 'ছুটি', color: 'bg-amber-600 text-white' },
                              { id: 'LATE', label: 'দেরি', color: 'bg-blue-600 text-white' },
                            ].map((btn) => (
                              <button
                                key={btn.id}
                                onClick={() =>
                                  setAttendanceDraft((prev) => ({
                                    ...prev,
                                    [s.id]: btn.id as any,
                                  }))
                                }
                                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                                  currentStatus === btn.id
                                    ? btn.color
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
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

        {/* 5. TEACHERS & RESPONSIBILITIES */}
        {activeSection === 'teachers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">শিক্ষক ও দায়িত্ব বণ্টন</h1>
                <p className="text-xs text-slate-500 font-tiro">Staff & Payroll ডাটাবেজ সমন্বিত শিক্ষক দায়িত্ব</p>
              </div>
              <button
                onClick={() => setIsAddTeacherOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>শিক্ষক দায়িত্ব নির্ধারণ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teachersData.assignments.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 font-hind">
                      {t.role === 'HEAD_TEACHER' ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                      {t.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-hind">{t.staffName}</h3>
                  <p className="text-xs text-slate-500 font-tiro mt-1">{t.staffDesignation}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{t.staffMobile}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-tiro text-slate-600">
                    দায়িত্বপ্রাপ্ত জামাত: <span className="font-semibold text-slate-800">{t.classNameBn || 'সার্বিক'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. FEES & CANONICAL FINANCE POSTING */}
        {activeSection === 'fees' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">মক্তব শিক্ষার্থী ফি ও আদায়</h1>
                <p className="text-xs text-slate-500 font-tiro">
                  ক্যানোনিকাল ফাইন্যান্স সমন্বিত (Zero Shadow Ledger - সরাসরি আয় ভাউচার সৃষ্টি)
                </p>
              </div>
              <button
                onClick={() => setIsMonthlyFeeGenOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors self-start"
              >
                <DollarSign className="w-4 h-4" />
                <span>মাসিক ফি বিল জেনারেট</span>
              </button>
            </div>

            {/* Fee Billing List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm font-tiro">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">শিক্ষার্থী</th>
                    <th className="px-4 py-3">ফি বিবরণ</th>
                    <th className="px-4 py-3">মাস</th>
                    <th className="px-4 py-3">ধার্যকৃত টাকা</th>
                    <th className="px-4 py-3">আদায়কৃত</th>
                    <th className="px-4 py-3">বকেয়া</th>
                    <th className="px-4 py-3">ভাউচার নং</th>
                    <th className="px-4 py-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        কোনো ফি রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    feeRecords.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {f.studentName || f.studentId}
                          <span className="text-xs text-slate-400 block font-mono">{f.studentId}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{f.feeTitle}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{f.billingMonth || '—'}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">৳ {toBanglaNumber(f.netPayable)}</td>
                        <td className="px-4 py-2.5 font-mono text-emerald-700 font-bold">৳ {toBanglaNumber(f.paidAmount)}</td>
                        <td className="px-4 py-2.5 font-mono text-rose-600 font-bold">৳ {toBanglaNumber(f.dueAmount)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-700 font-semibold">
                          {f.canonicalVoucherNumber || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {f.status !== 'PAID' ? (
                            <button
                              onClick={() => {
                                setSelectedFeeRecord(f);
                                setCollectFeeForm({
                                  paidAmount: f.dueAmount,
                                  paymentMethod: 'CASH',
                                  accountId: accounts[0]?.id || '',
                                  receiptNo: '',
                                  notes: '',
                                });
                                setIsCollectFeeOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              ফি আদায় করুন
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              পরিশোধিত
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. PROGRESS */}
        {activeSection === 'progress' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">পাঠ অগ্রগতি ও মূল্যায়ন</h1>
                <p className="text-xs text-slate-500 font-tiro">কায়দা, আমপারা, নাজেরা ও দ্বীনিয়াত অগ্রগতি ট্র্যাকিং</p>
              </div>
              <button
                onClick={() => setIsAddProgressOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন মূল্যায়ন যোগ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progressList.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-tiro">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {p.levelNameBn || p.levelCode}
                    </span>
                    <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      গ্রেড: {p.overallGrade}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-hind">{p.studentName}</h3>
                  <div className="text-xs text-slate-600 mt-2 space-y-1">
                    {p.qaidaLesson && <div>কায়দা পাঠ: <span className="font-semibold">{p.qaidaLesson}</span></div>}
                    {p.amparaSurah && <div>আমপারা সুরা: <span className="font-semibold">{p.amparaSurah}</span></div>}
                    {p.nazeraPara && <div>নাজেরা পারা: <span className="font-semibold">পারা #{toBanglaNumber(p.nazeraPara)}</span></div>}
                    {p.deeniyatTopic && <div>দ্বীনিয়াত বিষয়: <span className="font-semibold">{p.deeniyatTopic}</span></div>}
                    {p.teacherRemarks && <div className="text-slate-500 italic">উস্তাদের মন্তব্য: {p.teacherRemarks}</div>}
                    {p.nextTarget && <div className="text-emerald-700 font-medium">পরবর্তী লক্ষ্য: {p.nextTarget}</div>}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between font-mono">
                    <span>মূল্যায়ন: {p.assessmentDate}</span>
                    <span>উস্তাদ: {p.teacherName || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. STUDENT ID CARD */}
        {activeSection === 'idCard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">স্টুডেন্ট আইডি কার্ড ও QR</h1>
                <p className="text-xs text-slate-500 font-tiro">ইউনিভার্সাল QR কোড সহ প্রমিত ছাত্র কার্ড</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>

            {/* Student selector */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block mb-1 font-tiro">শিক্ষার্থী নির্বাচন করুন:</label>
              <select
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const s = students.find((st) => st.id === e.target.value);
                  setSelectedStudent(s || null);
                }}
                className="w-full md:w-96 px-3 py-2 text-sm border border-slate-200 rounded-lg font-tiro"
              >
                <option value="">-- শিক্ষার্থী বাছাই করুন --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentId} - {s.personName}
                  </option>
                ))}
              </select>
            </div>

            {/* ID Card Preview */}
            {selectedStudent ? (
              <div className="max-w-sm mx-auto bg-white border-2 border-emerald-700 rounded-2xl p-5 shadow-lg relative overflow-hidden font-tiro">
                <div className="text-center pb-3 border-b border-emerald-100">
                  <h2 className="text-lg font-bold text-emerald-900 font-hind">
                    {currentMosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ মক্তব'}
                  </h2>
                  <p className="text-xs text-slate-500">মক্তব ও কুরআন শিক্ষা বিভাগ</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">শিক্ষার্থী পরিচয়পত্র</p>
                </div>

                <div className="my-4 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-600 flex items-center justify-center text-2xl font-bold text-emerald-800 mb-2">
                    {selectedStudent.personName?.charAt(0) || 'ম'}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-hind">{selectedStudent.personName}</h3>
                  <div className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
                    আইডি: {selectedStudent.studentId}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-700 border-t border-b border-slate-100 py-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">বর্তমান জামাত:</span>
                    <span className="font-semibold">{selectedStudent.activeEnrollments?.[0]?.levelNameBn || 'নূরানী কায়দা'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">অভিভাবক:</span>
                    <span className="font-semibold">{selectedStudent.guardians?.[0]?.guardianName || 'অভিভাবক'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">জরুরি যোগাযোগ:</span>
                    <span className="font-mono">{selectedStudent.emergencyContactPhone || selectedStudent.personMobile || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ভর্তির তারিখ:</span>
                    <span className="font-mono">{selectedStudent.admissionDate}</span>
                  </div>
                </div>

                {/* Universal QR Code */}
                <div className="mt-4 pt-2 text-center">
                  <div className="inline-block p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-24 h-24 bg-white flex flex-col items-center justify-center text-center p-1">
                      <QrCode className="w-16 h-16 text-slate-900" />
                      <span className="text-[9px] font-mono text-slate-600 mt-1">{selectedStudent.studentId}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-tiro">স্ক্যান করে বিস্তারিত প্রোফাইল দেখুন</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400 font-tiro py-10">আইডি কার্ড প্রিভিউ দেখতে শিক্ষার্থী নির্বাচন করুন।</p>
            )}
          </div>
        )}

        {/* 9. REPORTS */}
        {activeSection === 'reports' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-slate-900 font-hind">মক্তব সার্বিক রিপোর্টস</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'শিক্ষার্থী রেজিস্টার বই', desc: 'সকল শিক্ষার্থীর তালিকা ও পূর্ণ বিবরণী', action: 'print' },
                { title: 'মাসিক হাজিরা বিবরণী', desc: 'মাসভিত্তিক উপস্থিতি ও অনুপস্থিতি বিশ্লেষণ', action: 'print' },
                { title: 'ফি আদায় ও বকেয়া রিপোর্ট', desc: 'ক্যানোনিকাল ভাউচার সহ আদায় রিপোর্ট', action: 'fees' },
              ].map((r, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-tiro">
                  <h3 className="font-bold text-slate-900 font-hind">{r.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                  <button
                    onClick={() => setActiveSection(r.action as any)}
                    className="mt-3 text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>রিপোর্ট দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. PRINT REGISTERS */}
        {activeSection === 'print' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-hind">রেজিস্টার ও ফরম প্রিন্ট</h1>
                <p className="text-xs text-slate-500 font-tiro">A4 প্রমিত প্রিন্ট ফরম্যাট</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট প্রিভিউ</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs font-tiro print:m-0 print:border-none">
              <div className="text-center pb-4 border-b border-slate-200 mb-4">
                <h2 className="text-xl font-bold text-slate-900 font-hind">{currentMosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ মক্তব'}</h2>
                <p className="text-sm text-slate-600">মক্তব শিক্ষার্থী রেজিস্টার — ২০২৬</p>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 font-hind">
                    <th className="p-2 border border-slate-200">ক্রমিক</th>
                    <th className="p-2 border border-slate-200">আইডি</th>
                    <th className="p-2 border border-slate-200">শিক্ষার্থীর নাম</th>
                    <th className="p-2 border border-slate-200">অভিভাবকের নাম</th>
                    <th className="p-2 border border-slate-200">মোবাইল</th>
                    <th className="p-2 border border-slate-200">বর্তমান জামাত</th>
                    <th className="p-2 border border-slate-200">ভর্তির তারিখ</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 text-center font-mono">{toBanglaNumber(idx + 1)}</td>
                      <td className="p-2 border border-slate-200 font-mono font-bold">{s.studentId}</td>
                      <td className="p-2 border border-slate-200 font-medium">{s.personName}</td>
                      <td className="p-2 border border-slate-200">{s.guardians?.[0]?.guardianName || '—'}</td>
                      <td className="p-2 border border-slate-200 font-mono">{s.personMobile || '—'}</td>
                      <td className="p-2 border border-slate-200">{s.activeEnrollments?.[0]?.levelNameBn || '—'}</td>
                      <td className="p-2 border border-slate-200 font-mono">{s.admissionDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD STUDENT */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-4">নতুন শিক্ষার্থী ভর্তি</h2>
            <form onSubmit={handleCreateStudent} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মুসল্লি/ব্যক্তি নির্বাচন (PersonMaster) *</label>
                <select
                  required
                  value={newStudentForm.personId}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, personId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- ব্যক্তি নির্বাচন করুন --</option>
                  {personsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.mobile || 'মোবাইল নেই'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ভর্তির তারিখ</label>
                <input
                  type="date"
                  value={newStudentForm.admissionDate}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, admissionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্রাথমিক জামাত/স্তর</label>
                <select
                  value={newStudentForm.levelId}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, levelId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- জামাত নির্বাচন করুন --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">অভিভাবক নির্বাচন (PersonMaster)</label>
                <select
                  value={newStudentForm.guardianPersonId}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, guardianPersonId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- অভিভাবক বাছাই করুন --</option>
                  {personsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CLASS */}
      {isAddClassOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-4">নতুন মক্তব জামাত/ব্যাচ তৈরি</h2>
            <form onSubmit={handleCreateClass} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জামাত/স্তরের নাম (বাংলা) *</label>
                <input
                  required
                  type="text"
                  placeholder="যেমন: নূরানী কায়দা সকাল ব্যাচ"
                  value={newClassForm.nameBn}
                  onChange={(e) => setNewClassForm({ ...newClassForm, nameBn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শিক্ষা স্তর নির্বাচন *</label>
                <select
                  required
                  value={newClassForm.levelId}
                  onChange={(e) => setNewClassForm({ ...newClassForm, levelId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- স্তর নির্বাচন করুন --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শিফট</label>
                <select
                  value={newClassForm.shift}
                  onChange={(e) => setNewClassForm({ ...newClassForm, shift: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="MORNING">সকাল শিফট</option>
                  <option value="AFTERNOON">বিকাল শিফট</option>
                  <option value="EVENING">সান্ধ্যকালীন শিফট</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নির্ধারিত শিক্ষক (স্টাফ ডাটাবেজ)</label>
                <select
                  value={newClassForm.teacherStaffId}
                  onChange={(e) => setNewClassForm({ ...newClassForm, teacherStaffId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- শিক্ষক নির্ধারণ করুন --</option>
                  {teachersData.availableStaff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN TEACHER */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-4">শিক্ষক দায়িত্ব নির্ধারণ</h2>
            <form onSubmit={handleAssignTeacher} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">স্টাফ/শিক্ষক নির্বাচন *</label>
                <select
                  required
                  value={newTeacherForm.staffId}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, staffId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- স্টাফ নির্বাচন করুন --</option>
                  {teachersData.availableStaff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">দায়িত্বপ্রাপ্ত জামাত</label>
                <select
                  value={newTeacherForm.classId}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- জামাত নির্বাচন করুন --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  নির্ধারণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: COLLECT FEE (CANONICAL POSTING) */}
      {isCollectFeeOpen && selectedFeeRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-1">ফি আদায় ও আর্থিক পোস্টিং</h2>
            <p className="text-xs text-slate-500 font-tiro mb-4">
              সরাসরি মূল ফাইন্যান্স ইঞ্জিনে আয় ভাউচার সৃষ্টি ও ক্যাশ ব্যালেন্সে জমা হবে।
            </p>
            <form onSubmit={handleCollectFee} className="space-y-3 font-tiro text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div>শিক্ষার্থী: <span className="font-bold text-slate-900">{selectedFeeRecord.studentName}</span> ({selectedFeeRecord.studentId})</div>
                <div>ফি টাইটেল: <span className="font-semibold text-slate-800">{selectedFeeRecord.feeTitle}</span></div>
                <div>বকেয়া পরিমাণ: <span className="font-bold text-rose-700">৳ {toBanglaNumber(selectedFeeRecord.dueAmount)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আদায়কৃত টাকার পরিমাণ (৳) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max={selectedFeeRecord.dueAmount}
                  value={collectFeeForm.paidAmount}
                  onChange={(e) => setCollectFeeForm({ ...collectFeeForm, paidAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আর্থিক ফান্ড/অ্যাকাউন্ট *</label>
                <select
                  required
                  value={collectFeeForm.accountId}
                  onChange={(e) => setCollectFeeForm({ ...collectFeeForm, accountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn} (বর্তমান ব্যালেন্স: ৳ {toBanglaNumber(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মেথড</label>
                <select
                  value={collectFeeForm.paymentMethod}
                  onChange={(e) => setCollectFeeForm({ ...collectFeeForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="CASH">নগদ (Cash)</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ (Nagad)</option>
                  <option value="BANK">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCollectFeeOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  ফি আদায় ও ভাউচার তৈরি
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: GENERATE MONTHLY FEES */}
      {isMonthlyFeeGenOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-4">মাসিক ফি বিল জেনারেট</h2>
            <form onSubmit={handleGenerateMonthlyFees} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ফি কাঠামো নির্বাচন *</label>
                <select
                  required
                  value={monthlyFeeForm.feeScheduleId}
                  onChange={(e) => setMonthlyFeeForm({ ...monthlyFeeForm, feeScheduleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- ফি কাঠামো বাছাই করুন --</option>
                  {feeSchedules.map((fs) => (
                    <option key={fs.id} value={fs.id}>
                      {fs.titleBn} (৳ {toBanglaNumber(fs.defaultAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিলিং মাস (YYYY-MM) *</label>
                <input
                  required
                  type="month"
                  value={monthlyFeeForm.billingMonth}
                  onChange={(e) => setMonthlyFeeForm({ ...monthlyFeeForm, billingMonth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsMonthlyFeeGenOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  বিল প্রস্তুত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ADD PROGRESS */}
      {isAddProgressOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-4">পাঠ অগ্রগতি লিপিবদ্ধকরণ</h2>
            <form onSubmit={handleAddProgress} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শিক্ষার্থী নির্বাচন *</label>
                <select
                  required
                  value={newProgressForm.studentProfileId}
                  onChange={(e) => setNewProgressForm({ ...newProgressForm, studentProfileId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentId} - {s.personName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জামাত/স্তর *</label>
                <select
                  required
                  value={newProgressForm.levelId}
                  onChange={(e) => setNewProgressForm({ ...newProgressForm, levelId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">-- স্তর নির্বাচন করুন --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কায়দা পাঠ (যদি প্রযোজ্য)</label>
                <input
                  type="text"
                  placeholder="যেমন: হরকত ও তানভীন মাশক"
                  value={newProgressForm.qaidaLesson}
                  onChange={(e) => setNewProgressForm({ ...newProgressForm, qaidaLesson: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আমপারা সুরা (যদি প্রযোজ্য)</label>
                <input
                  type="text"
                  placeholder="যেমন: সুরা আল-ফালাক"
                  value={newProgressForm.amparaSurah}
                  onChange={(e) => setNewProgressForm({ ...newProgressForm, amparaSurah: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মূল্যায়ন গ্রেড</label>
                <select
                  value={newProgressForm.overallGrade}
                  onChange={(e) => setNewProgressForm({ ...newProgressForm, overallGrade: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="A+">A+ (উত্তম)</option>
                  <option value="A">A (ভালো)</option>
                  <option value="B">B (সন্তোষজনক)</option>
                  <option value="NEEDS_IMPROVEMENT">অনুশীলন প্রয়োজন</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উস্তাদের মন্তব্য</label>
                <textarea
                  rows={2}
                  placeholder="পাঠ সম্পর্কিত মন্তব্য..."
                  value={newProgressForm.teacherRemarks}
                  onChange={(e) => setNewProgressForm({ ...newProgressForm, teacherRemarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddProgressOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm"
                >
                  বাতিল
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium">
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

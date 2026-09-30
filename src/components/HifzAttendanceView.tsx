import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Users,
  ChevronRight,
  TrendingUp,
  FileText,
  Save,
  CheckSquare,
  Sparkles,
  Info,
  X,
  Eye,
  History,
  GraduationCap
} from 'lucide-react';
import {
  Mosque,
  HifzkhanaEnrollment,
  HifzAttendance,
  HifzAttendanceStatus,
  HifzAttendanceReason,
  EducationStudentProfile
} from '../types';
import { api } from '../lib/api';
import { toBanglaNumber } from './CommitteeView';

interface Props {
  currentMosque: Mosque;
}

type TabMode = 'daily_sheet' | 'history' | 'summary';

export const HifzAttendanceView: React.FC<Props> = ({ currentMosque }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('daily_sheet');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [enrollments, setEnrollments] = useState<HifzkhanaEnrollment[]>([]);
  const [students, setStudents] = useState<EducationStudentProfile[]>([]);
  const [attendances, setAttendances] = useState<HifzAttendance[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Daily Sheet State: map enrollmentId -> { status, reason, otherReason, remarks }
  const [sheetData, setSheetData] = useState<Record<string, {
    status: HifzAttendanceStatus;
    reason?: HifzAttendanceReason;
    otherReason?: string;
    remarks?: string;
  }>>({});

  // Filter states for History Tab
  const [filterStudentId, setFilterStudentId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Edit Modal State
  const [editAttendance, setEditAttendance] = useState<HifzAttendance | null>(null);
  const [editStatus, setEditStatus] = useState<HifzAttendanceStatus>('PRESENT');
  const [editReason, setEditReason] = useState<HifzAttendanceReason | ''>('');
  const [editOtherReason, setEditOtherReason] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');

  // Load active enrollments and students
  const loadBaseData = async () => {
    try {
      const [enrollRes, stuRes] = await Promise.all([
        api.getHifzEnrollments().catch(() => []),
        api.getEducationStudents().catch(() => [])
      ]);
      const activeEnrolls = (enrollRes || []).filter(e => e.status === 'ACTIVE');
      setEnrollments(activeEnrolls);
      setStudents(stuRes || []);
    } catch (e: any) {
      console.error('Error loading base data:', e);
    }
  };

  // Load attendance data for selected date and overall stats
  const loadDateAttendance = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const [dateAttRes, statsRes, allAttRes] = await Promise.all([
        api.getHifzAttendances({ date }),
        api.getHifzAttendanceStats().catch(() => null),
        api.getHifzAttendances().catch(() => [])
      ]);

      setAttendances(allAttRes || []);
      setStats(statsRes);

      // Populate sheet data from existing records for this date
      const initialSheet: Record<string, any> = {};
      enrollments.forEach(e => {
        const existing = dateAttRes.find(a => a.enrollmentId === e.id || (a.studentId && a.studentId === e.studentId));
        if (existing) {
          initialSheet[e.id] = {
            status: existing.status,
            reason: existing.reason,
            otherReason: existing.otherReason,
            remarks: existing.remarks || ''
          };
        } else {
          initialSheet[e.id] = {
            status: 'PRESENT',
            remarks: ''
          };
        }
      });
      setSheetData(initialSheet);
    } catch (e: any) {
      setError(e.message || 'হাজিরা ডাটা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [currentMosque.id]);

  useEffect(() => {
    if (enrollments.length > 0) {
      loadDateAttendance(selectedDate);
    }
  }, [selectedDate, enrollments.length]);

  // Quick action: Mark all present
  const handleMarkAll = (status: HifzAttendanceStatus) => {
    const updated = { ...sheetData };
    enrollments.forEach(e => {
      updated[e.id] = {
        ...updated[e.id],
        status,
        reason: status === 'PRESENT' ? undefined : updated[e.id]?.reason
      };
    });
    setSheetData(updated);
  };

  // Update single student in sheet
  const handleStudentStatusChange = (enrollmentId: string, status: HifzAttendanceStatus) => {
    setSheetData(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        status,
        reason: status === 'PRESENT' ? undefined : prev[enrollmentId]?.reason
      }
    }));
  };

  const handleStudentReasonChange = (enrollmentId: string, reason: HifzAttendanceReason) => {
    setSheetData(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        reason
      }
    }));
  };

  const handleStudentRemarksChange = (enrollmentId: string, remarks: string) => {
    setSheetData(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        remarks
      }
    }));
  };

  // Save Daily Sheet (Bulk)
  const handleSaveSheet = async () => {
    setSaving(true);
    setError(null);
    try {
      const records = enrollments.map(e => {
        const item = sheetData[e.id] || { status: 'PRESENT' };
        return {
          enrollmentId: e.id,
          status: item.status,
          reason: item.reason,
          otherReason: item.otherReason,
          remarks: item.remarks
        };
      });

      await api.createHifzAttendanceBulk({
        date: selectedDate,
        records
      });

      setSuccessMessage(`${toBanglaNumber(records.length)} জন শিক্ষার্থীর হাজিরা সফলভাবে সংরক্ষিত হয়েছে (${selectedDate})।`);
      loadDateAttendance(selectedDate);
    } catch (e: any) {
      setError(e.message || 'হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  // Save Edit Single Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAttendance) return;
    setSaving(true);
    try {
      await api.updateHifzAttendance(editAttendance.id, {
        status: editStatus,
        reason: editReason || undefined,
        otherReason: editOtherReason || undefined,
        remarks: editRemarks || undefined
      });
      setSuccessMessage(`হাজিরা রেকর্ড #${editAttendance.attendanceId} সফলভাবে আপডেট হয়েছে।`);
      setEditAttendance(null);
      loadDateAttendance(selectedDate);
    } catch (err: any) {
      alert(err.message || 'হাজিরা আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  // Status badges & text
  const getStatusBadge = (status: HifzAttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">উপস্থিত (Present)</span>;
      case 'ABSENT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">অনুপস্থিত (Absent)</span>;
      case 'LATE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">দেরিতে (Late)</span>;
      case 'LEAVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">ছুটি (Leave)</span>;
      case 'EXCUSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">অনুমোদিত (Excused)</span>;
    }
  };

  const getReasonLabel = (reason?: HifzAttendanceReason) => {
    switch (reason) {
      case 'ILLNESS': return 'অসুস্থতা';
      case 'FAMILY_REASON': return 'পারিবারিক কারণ';
      case 'TRAVEL': return 'সফর / ভ্রমণ';
      case 'APPROVED_LEAVE': return 'পূর্বানুমোদিত ছুটি';
      case 'EMERGENCY': return 'জরুরি পরিস্থিতি';
      case 'OTHER': return 'অন্যান্য কারণ';
      default: return '—';
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return attendances.filter(a => {
      const matchStudent = filterStudentId === 'ALL' || a.studentId === filterStudentId || a.enrollmentId === filterStudentId;
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const matchReason = filterReason === 'ALL' || a.reason === filterReason;
      const matchStart = !startDate || a.date >= startDate;
      const matchEnd = !endDate || a.date <= endDate;
      const matchSearch = !searchQuery ||
        a.attendanceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.studentName && a.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.studentId && a.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.remarks && a.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchStudent && matchStatus && matchReason && matchStart && matchEnd && matchSearch;
    });
  }, [attendances, filterStudentId, filterStatus, filterReason, startDate, endDate, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-600/60 text-emerald-100 text-xs px-2.5 py-0.5 rounded-full font-medium tracking-wide">
                HIFZ H5-A FOUNDATION
              </span>
              <span className="text-emerald-200 text-xs">• দৈনিক হাজিরা ও শৃঙ্খলা ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">হিফজখানা শিক্ষার্থী দৈনিক হাজিরা</h1>
            <p className="text-emerald-100 text-sm mt-1">
              হিফজ বিভাগের সকল সক্রিয় শিক্ষার্থীদের নিয়মিত দৈনিক উপস্থিতি, অনুপস্থিতি ও ছুটির নির্ভুল ট্র্যাকিং
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-center min-w-[120px]">
              <p className="text-xs text-emerald-200 font-medium">সক্রিয় শিক্ষার্থী</p>
              <p className="text-xl font-bold text-white mt-0.5 font-mono">{toBanglaNumber(enrollments.length)} জন</p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-emerald-700/50">
          {[
            { id: 'daily_sheet', label: '📅 দৈনিক হাজিরা গ্রহণ' },
            { id: 'history', label: '👨‍🎓 শিক্ষার্থীভিত্তিক হাজিরা ইতিহাস' },
            { id: 'summary', label: '📊 হাজিরা সারাংশ ও পরিসংখ্যান' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabMode);
                setError(null);
                setSuccessMessage(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-950 font-semibold shadow-xs'
                  : 'bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/70 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
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

      {/* TAB 1: DAILY ATTENDANCE SHEET */}
      {activeTab === 'daily_sheet' && (
        <div className="space-y-4">
          {/* Action & Date Header */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                হাজিরার তারিখ:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs font-mono font-medium"
              />
              <button
                onClick={() => loadDateAttendance(selectedDate)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">এক ক্লিকে মার্ক:</span>
              <button
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-xs font-medium"
              >
                সকল উপস্থিত
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('ABSENT')}
                className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-xs font-medium"
              >
                সকল অনুপস্থিত
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('LEAVE')}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-xs font-medium"
              >
                সকল ছুটি
              </button>
              <button
                type="button"
                onClick={handleSaveSheet}
                disabled={saving || enrollments.length === 0}
                className="ml-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'হাজিরা শিট সংরক্ষণ'}</span>
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            {enrollments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                কোনো সক্রিয় হিফজ শিক্ষার্থী পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      <th className="py-3 px-4 font-semibold">ক্র নং</th>
                      <th className="py-3 px-4 font-semibold">শিক্ষার্থীর নাম ও আইডি</th>
                      <th className="py-3 px-4 font-semibold">ভর্তি কোড / স্তর</th>
                      <th className="py-3 px-4 font-semibold text-center">হাজিরা স্ট্যাটাস (নির্বাচন করুন)</th>
                      <th className="py-3 px-4 font-semibold">অনুপস্থিতি/ছুটির কারণ</th>
                      <th className="py-3 px-4 font-semibold">মন্তব্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {enrollments.map((enrollment, idx) => {
                      const student = students.find(s => s.id === enrollment.studentProfileId || s.studentId === enrollment.studentId);
                      const currentItem = sheetData[enrollment.id] || { status: 'PRESENT' };
                      const isAbsentOrLeave = currentItem.status === 'ABSENT' || currentItem.status === 'LEAVE' || currentItem.status === 'EXCUSED';

                      return (
                        <tr key={enrollment.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 font-hind">
                              {student?.personName || enrollment.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {enrollment.studentId}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-emerald-800 dark:text-emerald-300 font-medium">
                              #{enrollment.enrollmentId}
                            </span>
                            <div className="text-[11px] text-slate-500">
                              {enrollment.levelNameBn || 'হিফজ স্তর'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {(['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'EXCUSED'] as HifzAttendanceStatus[]).map(st => {
                                const isSelected = currentItem.status === st;
                                let btnClasses = 'border px-2 py-1 rounded text-[11px] font-medium transition-all ';
                                if (st === 'PRESENT') {
                                  btnClasses += isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                                } else if (st === 'ABSENT') {
                                  btnClasses += isSelected
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
                                } else if (st === 'LATE') {
                                  btnClasses += isSelected
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
                                } else if (st === 'LEAVE') {
                                  btnClasses += isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
                                } else {
                                  btnClasses += isSelected
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
                                }

                                const labelMap: Record<string, string> = {
                                  PRESENT: 'উপস্থিত',
                                  ABSENT: 'অনুপস্থিত',
                                  LATE: 'দেরিতে',
                                  LEAVE: 'ছুটি',
                                  EXCUSED: 'অনুমোদিত'
                                };

                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStudentStatusChange(enrollment.id, st)}
                                    className={btnClasses}
                                  >
                                    {labelMap[st]}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isAbsentOrLeave ? (
                              <select
                                value={currentItem.reason || ''}
                                onChange={(e) => handleStudentReasonChange(enrollment.id, e.target.value as HifzAttendanceReason)}
                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900"
                              >
                                <option value="">-- কারণ নির্বাচন করুন --</option>
                                <option value="ILLNESS">অসুস্থতা</option>
                                <option value="FAMILY_REASON">পারিবারিক কারণ</option>
                                <option value="TRAVEL">সফর / ভ্রমণ</option>
                                <option value="APPROVED_LEAVE">পূর্বানুমোদিত ছুটি</option>
                                <option value="EMERGENCY">জরুরি পরিস্থিতি</option>
                                <option value="OTHER">অন্যান্য কারণ</option>
                              </select>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="মন্তব্য (ঐচ্ছিক)..."
                              value={currentItem.remarks || ''}
                              onChange={(e) => handleStudentRemarksChange(enrollment.id, e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap gap-3 items-center text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="হাজিরা আইডি, শিক্ষার্থীর নাম বা মন্তব্য..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs"
              />
            </div>

            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs"
            >
              <option value="ALL">সকল শিক্ষার্থী</option>
              {enrollments.map(e => (
                <option key={e.id} value={e.studentId}>
                  {e.studentName} ({e.studentId})
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="PRESENT">উপস্থিত (Present)</option>
              <option value="ABSENT">অনুপস্থিত (Absent)</option>
              <option value="LATE">দেরিতে (Late)</option>
              <option value="LEAVE">ছুটি (Leave)</option>
              <option value="EXCUSED">অনুমোদিত (Excused)</option>
            </select>

            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs"
            >
              <option value="ALL">সকল কারণ</option>
              <option value="ILLNESS">অসুস্থতা</option>
              <option value="FAMILY_REASON">পারিবারিক কারণ</option>
              <option value="TRAVEL">সফর / ভ্রমণ</option>
              <option value="APPROVED_LEAVE">পূর্বানুমোদিত ছুটি</option>
              <option value="EMERGENCY">জরুরি পরিস্থিতি</option>
              <option value="OTHER">অন্যান্য কারণ</option>
            </select>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">শুরু:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">শেষ:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* History List Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                কোনো হাজিরা রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      <th className="py-3 px-4 font-semibold">হাজিরা আইডি</th>
                      <th className="py-3 px-4 font-semibold">তারিখ</th>
                      <th className="py-3 px-4 font-semibold">শিক্ষার্থীর নাম ও আইডি</th>
                      <th className="py-3 px-4 font-semibold">স্ট্যাটাস</th>
                      <th className="py-3 px-4 font-semibold">কারণ</th>
                      <th className="py-3 px-4 font-semibold">মন্তব্য</th>
                      <th className="py-3 px-4 font-semibold">নথিবদ্ধকারী</th>
                      <th className="py-3 px-4 text-right font-semibold">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredHistory.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800 dark:text-emerald-300">
                          {att.attendanceId}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-200">
                          {att.date}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 font-hind">
                            {att.studentName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {att.studentId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(att.status)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {getReasonLabel(att.reason)}
                          {att.otherReason && <span className="block text-[11px] text-slate-400">({att.otherReason})</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-[180px] truncate">
                          {att.remarks || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {att.recordedByName || 'সিস্টেম'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditAttendance(att);
                              setEditStatus(att.status);
                              setEditReason(att.reason || '');
                              setEditOtherReason(att.otherReason || '');
                              setEditRemarks(att.remarks || '');
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 rounded-md text-xs inline-flex items-center gap-1"
                            title="হাজিরা সংশোধন করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>সম্পাদনা</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUMMARY & STATS */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">আজকের উপস্থিতি</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    {stats?.todayPresent ?? 0} জন
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">মোট শিক্ষার্থী: {stats?.totalActiveStudents ?? enrollments.length} জন</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">আজকের অনুপস্থিতি</p>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
                    {stats?.todayAbsent ?? 0} জন
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">দেরিতে: {stats?.todayLate ?? 0} জন</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600">
                  <UserX className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">আজকের ছুটি / অনুমোদিত</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    {(stats?.todayLeave ?? 0) + (stats?.todayExcused ?? 0)} জন
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">অনুমোদিত ছুটি</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">আজকের উপস্থিতির হার</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 font-mono">
                    {enrollments.length > 0 && stats?.todayPresent !== undefined
                      ? `${Math.round((stats.todayPresent / enrollments.length) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">মোট রেকর্ড: {stats?.totalRecords ?? attendances.length}</p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded-xl text-teal-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5 font-tiro">
            <div className="flex items-center gap-2 font-bold text-emerald-950 font-hind">
              <Info className="w-4 h-4 text-emerald-700" />
              <span>হিফজ হাজিরা অখণ্ডতা নীতি (H5-A Foundation)</span>
            </div>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              প্রতি শিক্ষার্থীর জন্য প্রতিদিন একটিমাত্র নির্ভরযোগ্য হাজিরা রেকর্ড তৈরি হয়। হাজিরা ভুল হলে হার্ড ডিলিট নিষিদ্ধ; নিরাপদ সম্পাদনা ও অডিট ট্রেইল কার্যকর রয়েছে।
            </p>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editAttendance && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-hind flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <span>হাজিরা রেকর্ড সংশোধন (#{editAttendance.attendanceId})</span>
              </h2>
              <button
                onClick={() => setEditAttendance(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg space-y-1 text-slate-600 dark:text-slate-300">
                <p><strong>শিক্ষার্থী:</strong> {editAttendance.studentName}</p>
                <p><strong>স্টুডেন্ট আইডি:</strong> <span className="font-mono">{editAttendance.studentId}</span></p>
                <p><strong>তারিখ:</strong> <span className="font-mono">{editAttendance.date}</span></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  হাজিরা স্ট্যাটাস *
                </label>
                <select
                  required
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as HifzAttendanceStatus)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900"
                >
                  <option value="PRESENT">উপস্থিত (PRESENT)</option>
                  <option value="ABSENT">অনুপস্থিত (ABSENT)</option>
                  <option value="LATE">দেরিতে (LATE)</option>
                  <option value="LEAVE">ছুটি (LEAVE)</option>
                  <option value="EXCUSED">অনুমোদিত ছুটি (EXCUSED)</option>
                </select>
              </div>

              {(editStatus === 'ABSENT' || editStatus === 'LEAVE' || editStatus === 'EXCUSED') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      অনুপস্থিতি/ছুটির কারণ
                    </label>
                    <select
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value as HifzAttendanceReason)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900"
                    >
                      <option value="">-- কারণ নির্বাচন করুন --</option>
                      <option value="ILLNESS">অসুস্থতা</option>
                      <option value="FAMILY_REASON">পারিবারিক কারণ</option>
                      <option value="TRAVEL">সফর / ভ্রমণ</option>
                      <option value="APPROVED_LEAVE">পূর্বানুমোদিত ছুটি</option>
                      <option value="EMERGENCY">জরুরি পরিস্থিতি</option>
                      <option value="OTHER">অন্যান্য কারণ</option>
                    </select>
                  </div>

                  {editReason === 'OTHER' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        অন্যান্য কারণের বিবরণ
                      </label>
                      <input
                        type="text"
                        value={editOtherReason}
                        onChange={(e) => setEditOtherReason(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মন্তব্য / নোট
                </label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900"
                  placeholder="কোনো বিশেষ মন্তব্য..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditAttendance(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

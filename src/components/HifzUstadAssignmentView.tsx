import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Award,
  ChevronRight,
  User,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import {
  Mosque,
  HifzkhanaEnrollment,
  HifzUstadAssignment,
  HifzUstadAssignmentType,
  HifzUstadAssignmentStatus,
  Staff,
  EducationStudentProfile
} from '../types';
import { api } from '../lib/api';
import { toBanglaNumber } from './CommitteeView';

interface Props {
  currentMosque: Mosque;
}

export const HifzUstadAssignmentView: React.FC<Props> = ({ currentMosque }) => {
  const [assignments, setAssignments] = useState<HifzUstadAssignment[]>([]);
  const [enrollments, setEnrollments] = useState<HifzkhanaEnrollment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [students, setStudents] = useState<EducationStudentProfile[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterUstadId, setFilterUstadId] = useState<string>('ALL');
  const [filterStudentId, setFilterStudentId] = useState<string>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<HifzUstadAssignment | null>(null);

  // Form State for Add
  const [addForm, setAddForm] = useState({
    enrollmentId: '',
    ustadStaffId: '',
    assignmentType: 'PRIMARY' as HifzUstadAssignmentType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    remarks: ''
  });

  // Form State for Edit/Status
  const [editForm, setEditForm] = useState({
    status: 'ACTIVE' as HifzUstadAssignmentStatus,
    endDate: '',
    remarks: ''
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, enrollRes, staffRes, stuRes, statsRes] = await Promise.all([
        api.getHifzUstadAssignments(),
        api.getHifzEnrollments().catch(() => []),
        api.getStaff().catch(() => []),
        api.getEducationStudents().catch(() => []),
        api.getHifzUstadAssignmentStats().catch(() => null)
      ]);

      setAssignments(assignRes || []);
      setEnrollments((enrollRes || []).filter(e => e.status === 'ACTIVE'));
      setStaffList(staffRes || []);
      setStudents(stuRes || []);
      setStats(statsRes);
    } catch (e: any) {
      setError(e.message || 'উস্তাদ অ্যাসাইনমেন্ট ডাটা লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMosque.id]);

  const activeStaffList = useMemo(() => {
    return staffList.filter(s => (s as any).employmentType !== 'TERMINATED' && (s as any).status !== 'INACTIVE');
  }, [staffList]);

  // Handle Add Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.createHifzUstadAssignment({
        enrollmentId: addForm.enrollmentId,
        ustadStaffId: addForm.ustadStaffId,
        assignmentType: addForm.assignmentType,
        startDate: addForm.startDate,
        endDate: addForm.endDate || undefined,
        remarks: addForm.remarks || undefined
      });

      setSuccessMessage(`উস্তাদ অ্যাসাইনমেন্ট #${res.assignmentId} সফলভাবে তৈরি করা হয়েছে।`);
      setIsAddModalOpen(false);
      setAddForm({
        enrollmentId: '',
        ustadStaffId: '',
        assignmentType: 'PRIMARY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        remarks: ''
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'অ্যাসাইনমেন্ট তৈরি করতে ত্রুটি ঘটেছে');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit/Status Update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.updateHifzUstadAssignmentStatus(
        selectedAssignment.id,
        editForm.status,
        editForm.endDate || undefined,
        editForm.remarks || undefined
      );

      setSuccessMessage(`অ্যাসাইনমেন্ট #${res.assignmentId} স্ট্যাটাস সফলভাবে ${res.status} করা হয়েছে।`);
      setIsEditModalOpen(false);
      setSelectedAssignment(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'স্ট্যাটাস আপডেট করতে ত্রুটি ঘটেছে');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered list
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchesSearch = !searchQuery ||
        a.assignmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.studentName && a.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.studentId && a.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.ustadName && a.ustadName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.remarks && a.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterType === 'ALL' || a.assignmentType === filterType;
      const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const matchesUstad = filterUstadId === 'ALL' || a.ustadStaffId === filterUstadId;
      const matchesStudent = filterStudentId === 'ALL' || a.studentId === filterStudentId || a.enrollmentId === filterStudentId;

      return matchesSearch && matchesType && matchesStatus && matchesUstad && matchesStudent;
    });
  }, [assignments, searchQuery, filterType, filterStatus, filterUstadId, filterStudentId]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 font-mono">
              H5-B1
            </span>
            <h1 className="text-xl font-bold text-slate-900 font-hind">
              উস্তাদ নির্ধারণ ও ব্যবস্থাপনা (Ustad Assignment)
            </h1>
          </div>
          <p className="text-sm text-slate-500 font-tiro mt-1">
            হিফজ শিক্ষার্থীদের জন্য প্রধান ও সহকারী উস্তাদ নির্ধারণ, সমন্বয় ও কার্যকাল পর্যবেক্ষণ
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            title="রিফ্রেশ"
            className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setError(null);
              setSuccessMessage(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-all font-hind"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন উস্তাদ নির্ধারণ</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2.5 font-tiro">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold font-hind">ত্রুটি ঘটেছে</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-start gap-2.5 font-tiro">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold font-hind">সফল হয়েছে</p>
            <p className="text-xs mt-0.5">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-tiro">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">সক্রিয় অ্যাসাইনমেন্ট</span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-hind">
            {toBanglaNumber(stats?.activeAssignments ?? assignments.filter(a => a.status === 'ACTIVE').length)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            মোট রেকর্ড: {toBanglaNumber(stats?.totalAssignments ?? assignments.length)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">প্রধান উস্তাদ (Primary)</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-hind">
            {toBanglaNumber(stats?.activePrimaryAssignments ?? assignments.filter(a => a.status === 'ACTIVE' && a.isPrimary).length)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">শিক্ষার্থী প্রতি ১ জন সর্বোচ্চ</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">সহকারী উস্তাদ (Secondary)</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-800 font-hind">
            {toBanglaNumber(stats?.activeSecondaryAssignments ?? assignments.filter(a => a.status === 'ACTIVE' && a.assignmentType === 'SECONDARY').length)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">সহায়ক শিক্ষকতা</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">দায়িত্বপ্রাপ্ত উস্তাদ সংখ্যা</span>
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-800 font-hind">
            {toBanglaNumber(stats?.activeUstadsAssignedCount ?? new Set(assignments.filter(a => a.status === 'ACTIVE').map(a => a.ustadStaffId)).size)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">স্টাফ ডাটাবেজ থেকে</p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 font-tiro">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="শিক্ষার্থী বা উস্তাদের নাম দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">সকল ধরন (Primary & Secondary)</option>
            <option value="PRIMARY">প্রধান উস্তাদ (PRIMARY)</option>
            <option value="SECONDARY">সহকারী উস্তাদ (SECONDARY)</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ACTIVE">সক্রিয় (ACTIVE)</option>
            <option value="ENDED">সমাপ্ত (ENDED)</option>
            <option value="CANCELLED">বাতিল (CANCELLED)</option>
          </select>

          {/* Ustad Filter */}
          <select
            value={filterUstadId}
            onChange={(e) => setFilterUstadId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">সকল উস্তাদ</option>
            {activeStaffList.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.designation || 'শিক্ষক'})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ASSIGNMENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-tiro">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">আইডি</th>
                <th className="px-4 py-3">শিক্ষার্থীর নাম</th>
                <th className="px-4 py-3">দায়িত্বপ্রাপ্ত উস্তাদ</th>
                <th className="px-4 py-3 text-center">ধরন</th>
                <th className="px-4 py-3">কার্যকাল (শুরু - সমাপ্তি)</th>
                <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3">মন্তব্য</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>কোনো উস্তাদ অ্যাসাইনমেন্ট রেকর্ড পাওয়া যায়নি।</p>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assign) => (
                  <tr key={assign.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      #{assign.assignmentId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{assign.studentName || 'শিক্ষার্থী'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{assign.studentId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{assign.ustadName || 'উস্তাদ'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {assign.isPrimary || assign.assignmentType === 'PRIMARY' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          প্রধান উস্তাদ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
                          সহকারী উস্তাদ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <div>{assign.startDate}</div>
                      {assign.endDate ? (
                        <div className="text-[11px] text-slate-500">পর্যন্ত {assign.endDate}</div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 font-sans">চলমান</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {assign.status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          সক্রিয়
                        </span>
                      )}
                      {assign.status === 'ENDED' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          সমাপ্ত
                        </span>
                      )}
                      {assign.status === 'CANCELLED' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                          বাতিল
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {assign.remarks || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {assign.status === 'ACTIVE' && (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assign);
                            setEditForm({
                              status: 'ENDED',
                              endDate: new Date().toISOString().split('T')[0],
                              remarks: assign.remarks || ''
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors font-sans font-medium"
                        >
                          সম্পাদনা / সমাপ্ত
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

      {/* MODAL 1: ADD USTAD ASSIGNMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-700" />
              <span>নতুন উস্তাদ অ্যাসাইনমেন্ট নির্ধারণ (H5-B1)</span>
            </h2>

            <form onSubmit={handleCreateAssignment} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  হিফজ শিক্ষার্থী নির্বাচন (সক্রিয় শিক্ষার্থী) *
                </label>
                <select
                  required
                  value={addForm.enrollmentId}
                  onChange={(e) => setAddForm({ ...addForm, enrollmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                  {enrollments.map((enr) => (
                    <option key={enr.id} value={enr.id}>
                      {enr.studentName} ({enr.studentId}) — ভর্তি #{enr.enrollmentId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  উস্তাদ / শিক্ষক নির্বাচন (স্টাফ ডাটাবেজ) *
                </label>
                <select
                  required
                  value={addForm.ustadStaffId}
                  onChange={(e) => setAddForm({ ...addForm, ustadStaffId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- উস্তাদ নির্বাচন করুন --</option>
                  {activeStaffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.designation || 'শিক্ষক'}) — {st.staffCode || st.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    অ্যাসাইনমেন্টের ধরন *
                  </label>
                  <select
                    required
                    value={addForm.assignmentType}
                    onChange={(e) => setAddForm({ ...addForm, assignmentType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="PRIMARY">প্রধান উস্তাদ (Primary)</option>
                    <option value="SECONDARY">সহকারী উস্তাদ (Secondary)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    শুরুর তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.startDate}
                    onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সমাপ্তির তারিখ (ঐচ্ছিক)
                </label>
                <input
                  type="date"
                  value={addForm.endDate}
                  onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মন্তব্য / নির্দেশনা
                </label>
                <textarea
                  rows={2}
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })}
                  placeholder="অ্যাসাইনমেন্ট সম্পর্কিত কোনো বিশেষ নির্দেশনা..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>নিয়মাবলী:</strong> একজন শিক্ষার্থীর জন্য একই সময়ে সর্বোচ্চ ১ জন সক্রিয় প্রধান উস্তাদ (PRIMARY) থাকতে পারেন।
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 font-sans">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE STATUS MODAL */}
      {isEditModalOpen && selectedAssignment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 font-hind mb-3 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-teal-700" />
              <span>অ্যাসাইনমেন্ট স্ট্যাটাস পরিবর্তন</span>
            </h2>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-tiro space-y-1 mb-4">
              <p><strong>আইডি:</strong> #{selectedAssignment.assignmentId}</p>
              <p><strong>শিক্ষার্থী:</strong> {selectedAssignment.studentName} ({selectedAssignment.studentId})</p>
              <p><strong>উস্তাদ:</strong> {selectedAssignment.ustadName}</p>
              <p><strong>ধরন:</strong> {selectedAssignment.isPrimary ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ'}</p>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3 font-tiro text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নতুন স্ট্যাটাস *
                </label>
                <select
                  required
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ACTIVE">সক্রিয় (ACTIVE)</option>
                  <option value="ENDED">সমাপ্ত (ENDED)</option>
                  <option value="CANCELLED">বাতিল (CANCELLED)</option>
                </select>
              </div>

              {editForm.status === 'ENDED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সমাপ্তির তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মন্তব্য
                </label>
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  placeholder="স্ট্যাটাস পরিবর্তনের কারণ/মন্তব্য..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 font-sans">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

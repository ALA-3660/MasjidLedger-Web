import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  CalendarDays,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { Mosque } from '../types';
import { HifzReportType, HifzReportResult } from '../types';
import { printElement } from '../lib/printUtils';

interface HifzSubReportCenterViewProps {
  currentMosque: Mosque;
}

export const HifzSubReportCenterView: React.FC<HifzSubReportCenterViewProps> = ({ currentMosque }) => {
  // Report selection
  const [reportType, setReportType] = useState<HifzReportType>('ATTENDANCE');

  // Filter modes: DATE_RANGE | MONTH_RANGE | YEAR_RANGE | QUICK
  const [filterMode, setFilterMode] = useState<'DATE_RANGE' | 'MONTH_RANGE' | 'YEAR_RANGE' | 'QUICK'>('DATE_RANGE');
  const [preset, setPreset] = useState<string>('THIS_MONTH');

  // Date states
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = todayStr.slice(0, 4);

  const [startDate, setStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [startMonth, setStartMonth] = useState<string>(currentMonthStr);
  const [endMonth, setEndMonth] = useState<string>(currentMonthStr);
  const [startYear, setStartYear] = useState<string>(currentYearStr);
  const [endYear, setEndYear] = useState<string>(currentYearStr);

  // Entity filters
  const [studentId, setStudentId] = useState<string>('');
  const [ustadStaffId, setUstadStaffId] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<string>('ALL');
  const [assignmentType, setAssignmentType] = useState<string>('ALL');
  const [assignmentStatus, setAssignmentStatus] = useState<string>('ALL');

  // Dropdown lists
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // State for loaded report
  const [reportData, setReportData] = useState<HifzReportResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize dropdowns
  useEffect(() => {
    loadDropdowns();
  }, [currentMosque.id]);

  // Load report whenever criteria change
  useEffect(() => {
    loadReport();
  }, [reportType, filterMode, startDate, endDate, startMonth, endMonth, startYear, endYear, preset, studentId, ustadStaffId, attendanceStatus, assignmentType, assignmentStatus, currentMosque.id]);

  const loadDropdowns = async () => {
    try {
      const [enrs, staffs] = await Promise.all([
        api.getHifzEnrollments().catch(() => []),
        api.getStaff().catch(() => []),
      ]);
      setEnrollments(enrs || []);
      setStaffList(staffs || []);
    } catch (e) {
      console.warn('Could not load report dropdowns:', e);
    }
  };

  const handleApplyPreset = (p: string) => {
    setPreset(p);
    setFilterMode('QUICK');
    const today = new Date();
    const tStr = today.toISOString().split('T')[0];

    if (p === 'TODAY') {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (p === 'LAST_7_DAYS') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(tStr);
    } else if (p === 'THIS_MONTH') {
      setStartDate(`${tStr.slice(0, 7)}-01`);
      setEndDate(tStr);
    } else if (p === 'LAST_MONTH') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(prev.toISOString().split('T')[0]);
      setEndDate(prevEnd.toISOString().split('T')[0]);
    } else if (p === 'THIS_YEAR') {
      setStartDate(`${today.getFullYear()}-01-01`);
      setEndDate(tStr);
    }
  };

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getHifzH5Reports({
        reportType,
        mode: filterMode,
        startDate: filterMode === 'DATE_RANGE' || filterMode === 'QUICK' ? startDate : undefined,
        endDate: filterMode === 'DATE_RANGE' || filterMode === 'QUICK' ? endDate : undefined,
        startMonth: filterMode === 'MONTH_RANGE' ? startMonth : undefined,
        endMonth: filterMode === 'MONTH_RANGE' ? endMonth : undefined,
        startYear: filterMode === 'YEAR_RANGE' ? startYear : undefined,
        endYear: filterMode === 'YEAR_RANGE' ? endYear : undefined,
        preset: filterMode === 'QUICK' ? preset : undefined,
        studentId: studentId || undefined,
        ustadStaffId: ustadStaffId || undefined,
        attendanceStatus: attendanceStatus !== 'ALL' ? attendanceStatus : undefined,
        assignmentType: assignmentType !== 'ALL' ? assignmentType : undefined,
        assignmentStatus: assignmentStatus !== 'ALL' ? assignmentStatus : undefined,
      });
      setReportData(res);
    } catch (err: any) {
      setError(err.message || 'রিপোর্ট তথ্য লোড করতে ত্রুটি ঘটেছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    const isLandscape = reportType === 'ATTENDANCE' || reportType === 'REGISTER' || reportType === 'ASSIGNMENT';
    printElement('hifz-printable-report-area', {
      title: `MasjidLedger_Hifz_Report_${reportType}_${new Date().toISOString().split('T')[0]}`,
      pageSize: 'A4',
      pageOrientation: isLandscape ? 'landscape' : 'portrait',
      margin: '8mm 10mm',
    });
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();

    let sheetData: any[][] = [
      [currentMosque.name],
      [`প্রতিবেদন: ${getReportTitle(reportType)}`],
      [`সময়কাল: ${reportData.period.labelBn}`],
      [`তারিখ: ${new Date().toLocaleDateString('bn-BD')}`],
      [],
    ];

    if (reportType === 'DAILY_SUMMARY' || reportType === 'MONTHLY_SUMMARY' || reportType === 'YEARLY_SUMMARY') {
      const headerLabel = reportType === 'YEARLY_SUMMARY' ? 'বছর' : reportType === 'MONTHLY_SUMMARY' ? 'মাস' : 'তারিখ';
      sheetData.push([headerLabel, 'মোট রেকর্ড', 'উপস্থিত', 'অনুপস্থিত', 'বিলম্ব', 'ছুটি', 'মার্জনা', 'উপস্থিতির হার (%)']);
      (reportData.groupedData || []).forEach(g => {
        sheetData.push([
          g.periodKey,
          g.totalRecords,
          g.presentCount,
          g.absentCount,
          g.lateCount,
          g.leaveCount,
          g.excusedCount,
          `${g.attendanceRate}%`
        ]);
      });
    } else if (reportType === 'ASSIGNMENT' || reportType === 'USTAD_WISE') {
      sheetData.push(['ক্রমিক', 'অ্যাসাইনমেন্ট আইডি', 'শিক্ষার্থীর নাম', 'উস্তাদের নাম', 'ধরন', 'শুরুর তারিখ', 'সমাপ্তির তারিখ', 'স্ট্যাটাস']);
      (reportData.records || []).forEach((r, idx) => {
        sheetData.push([
          idx + 1,
          r.assignmentId,
          r.studentName || '—',
          r.ustadName || '—',
          r.assignmentType === 'PRIMARY' ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ',
          r.startDate,
          r.endDate || '—',
          r.status
        ]);
      });
    } else {
      sheetData.push(['ক্রমিক', 'তারিখ', 'হাজিরা আইডি', 'শিক্ষার্থীর নাম', 'শিক্ষার্থী আইডি', 'স্ট্যাটাস', 'কারণ', 'মন্তব্য']);
      (reportData.records || []).forEach((r, idx) => {
        sheetData.push([
          idx + 1,
          r.date,
          r.attendanceId,
          r.studentName || '—',
          r.studentId || '—',
          getStatusLabel(r.status),
          r.reason || '—',
          r.remarks || '—'
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Hifz_Report');
    XLSX.writeFile(wb, `Hifz_${reportType}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getReportTitle = (rt: HifzReportType) => {
    switch (rt) {
      case 'ATTENDANCE': return 'হাজিরা রিপোর্ট (Attendance Report)';
      case 'STUDENT_WISE': return 'শিক্ষার্থীভিত্তিক রিপোর্ট (Student-wise Report)';
      case 'USTAD_WISE': return 'উস্তাদভিত্তিক রিপোর্ট (Ustad-wise Report)';
      case 'ASSIGNMENT': return 'উস্তাদ দায়িত্ব রিপোর্ট (Ustad Assignment Report)';
      case 'DAILY_SUMMARY': return 'দৈনিক সারসংক্ষেপ (Daily Summary)';
      case 'MONTHLY_SUMMARY': return 'মাসিক সারসংক্ষেপ (Monthly Summary)';
      case 'YEARLY_SUMMARY': return 'বার্ষিক সারসংক্ষেপ (Yearly Summary)';
      case 'REGISTER': return 'রেজিস্টার ও প্রিন্ট (Register & Print)';
      default: return 'হিফজ রিপোর্ট';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'উপস্থিত';
      case 'ABSENT': return 'অনুপস্থিত';
      case 'LATE': return 'বিলম্ব';
      case 'LEAVE': return 'ছুটি';
      case 'EXCUSED': return 'মার্জনা';
      case 'ACTIVE': return 'সক্রিয়';
      case 'ENDED': return 'সমাপ্ত';
      case 'CANCELLED': return 'বাতিলকৃত';
      default: return status;
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

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & SUB-NAVIGATION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-100 text-teal-800">
              এইচ৫-ডি (H5-D)
            </span>
            <h1 className="text-xl font-bold text-slate-900 font-hind">
              হিফজ সাব রিপোর্ট সেন্টার (Hifz Sub Report Center)
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-tiro mt-1">
            হিফজখানা হাজিরা ও উস্তাদ নির্ধারণ সাবসিস্টেমের অফিশিয়াল প্রিন্ট ও রেজিস্টার রিপোর্ট
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold font-hind flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট করুন (A4)</span>
          </button>
        </div>
      </div>

      {/* 2. REPORT SELECTION RIBBON (SECTION 4 OF BRIEF) */}
      <div className="bg-slate-100 p-2 rounded-2xl flex flex-wrap gap-1.5 text-xs font-tiro">
        {[
          { id: 'ATTENDANCE' as const, label: '📊 হাজিরা রিপোর্ট' },
          { id: 'STUDENT_WISE' as const, label: '👨‍🎓 শিক্ষার্থীভিত্তিক রিপোর্ট' },
          { id: 'USTAD_WISE' as const, label: '👨‍🏫 উস্তাদভিত্তিক রিপোর্ট' },
          { id: 'ASSIGNMENT' as const, label: '👥 উস্তাদ দায়িত্ব রিপোর্ট' },
          { id: 'DAILY_SUMMARY' as const, label: '📅 দৈনিক সারসংক্ষেপ' },
          { id: 'MONTHLY_SUMMARY' as const, label: '📆 মাসিক সারসংক্ষেপ' },
          { id: 'YEARLY_SUMMARY' as const, label: '🗓️ বার্ষিক সারসংক্ষেপ' },
          { id: 'REGISTER' as const, label: '🖨️ রেজিস্টার ও প্রিন্ট' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setReportType(item.id)}
            className={`px-3 py-2 rounded-xl font-medium transition-all ${
              reportType === item.id
                ? 'bg-teal-700 text-white font-bold shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. REPORT PERIOD & FILTER BAR (SECTION 5 OF BRIEF) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 font-tiro text-xs">
        {/* ROW 1: MODE & QUICK PRESETS */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">ফিল্টার মোড:</span>
            {[
              { id: 'DATE_RANGE' as const, label: 'তারিখ সীমা (Date-to-Date)' },
              { id: 'MONTH_RANGE' as const, label: 'মাসভিত্তিক (Month-to-Month)' },
              { id: 'YEAR_RANGE' as const, label: 'বছরভিত্তিক (Year-to-Year)' },
              { id: 'QUICK' as const, label: 'দ্রুত প্রিসেট' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setFilterMode(m.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterMode === m.id
                    ? 'bg-teal-700 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {filterMode === 'QUICK' && (
            <div className="flex items-center gap-1.5">
              {[
                { id: 'TODAY', label: 'আজ' },
                { id: 'LAST_7_DAYS', label: 'গত ৭ দিন' },
                { id: 'THIS_MONTH', label: 'বর্তমান মাস' },
                { id: 'LAST_MONTH', label: 'গত মাস' },
                { id: 'THIS_YEAR', label: 'বর্তমান বছর' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    preset === p.id ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ROW 2: DATE PICKERS DEPENDING ON MODE */}
        <div className="flex flex-wrap items-center gap-4">
          {filterMode === 'DATE_RANGE' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">তারিখ থেকে:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
              />
              <span className="font-semibold text-slate-700">তারিখ পর্যন্ত:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
              />
            </div>
          )}

          {filterMode === 'MONTH_RANGE' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">মাস থেকে:</span>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
              />
              <span className="font-semibold text-slate-700">মাস পর্যন্ত:</span>
              <input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
              />
            </div>
          )}

          {filterMode === 'YEAR_RANGE' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">বছর থেকে:</span>
              <input
                type="number"
                min="2000"
                max="2100"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 w-24"
              />
              <span className="font-semibold text-slate-700">বছর পর্যন্ত:</span>
              <input
                type="number"
                min="2000"
                max="2100"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 w-24"
              />
            </div>
          )}

          {/* ROW 3: CONTEXTUAL FILTERS */}
          {(reportType === 'ATTENDANCE' || reportType === 'STUDENT_WISE' || reportType === 'REGISTER' || reportType === 'DAILY_SUMMARY') && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">শিক্ষার্থী:</span>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 max-w-[200px]"
              >
                <option value="">সকল শিক্ষার্থী</option>
                {enrollments.map((enr) => (
                  <option key={enr.id} value={enr.id}>
                    {enr.studentName} ({enr.studentId || enr.enrollmentId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(reportType === 'USTAD_WISE' || reportType === 'ASSIGNMENT') && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">উস্তাদ:</span>
              <select
                value={ustadStaffId}
                onChange={(e) => setUstadStaffId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 max-w-[200px]"
              >
                <option value="">সকল উস্তাদ</option>
                {staffList.map((stf) => (
                  <option key={stf.id} value={stf.id}>
                    {stf.name} ({stf.staffCode || stf.designationBn || stf.designation})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(reportType === 'ATTENDANCE' || reportType === 'REGISTER') && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">স্ট্যাটাস:</span>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                <option value="PRESENT">উপস্থিত</option>
                <option value="ABSENT">অনুপস্থিত</option>
                <option value="LATE">বিলম্ব</option>
                <option value="LEAVE">ছুটি</option>
                <option value="EXCUSED">মার্জনা</option>
              </select>
            </div>
          )}

          {reportType === 'ASSIGNMENT' && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">ধরন:</span>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                >
                  <option value="ALL">সকল ধরন</option>
                  <option value="PRIMARY">প্রধান উস্তাদ (PRIMARY)</option>
                  <option value="SECONDARY">সহকারী উস্তাদ (SECONDARY)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">স্ট্যাটাস:</span>
                <select
                  value={assignmentStatus}
                  onChange={(e) => setAssignmentStatus(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600"
                >
                  <option value="ALL">সকল স্ট্যাটাস</option>
                  <option value="ACTIVE">সক্রিয়</option>
                  <option value="ENDED">সমাপ্ত</option>
                  <option value="CANCELLED">বাতিলকৃত</option>
                </select>
              </div>
            </>
          )}

          <button
            onClick={loadReport}
            disabled={isLoading}
            className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>রিপোর্ট রিলোড</span>
          </button>
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {error && (
        <div className="p-3.5 rounded-xl text-sm font-tiro bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* 4. SUMMARY BADGES RIBBON */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-tiro text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 block">মোট রেকর্ড</span>
            <span className="text-lg font-bold text-slate-900 font-baloo">{reportData.summary.totalRecords}</span>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 shadow-xs">
            <span className="text-emerald-700 font-medium block">উপস্থিত</span>
            <span className="text-lg font-bold text-emerald-800 font-baloo">{reportData.summary.presentCount}</span>
          </div>
          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200 shadow-xs">
            <span className="text-rose-700 font-medium block">অনুপস্থিত</span>
            <span className="text-lg font-bold text-rose-800 font-baloo">{reportData.summary.absentCount}</span>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 shadow-xs">
            <span className="text-amber-700 font-medium block">বিলম্ব</span>
            <span className="text-lg font-bold text-amber-800 font-baloo">{reportData.summary.lateCount}</span>
          </div>
          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 shadow-xs">
            <span className="text-blue-700 font-medium block">ছুটি</span>
            <span className="text-lg font-bold text-blue-800 font-baloo">{reportData.summary.leaveCount}</span>
          </div>
          <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200 shadow-xs">
            <span className="text-purple-700 font-medium block">মার্জনা</span>
            <span className="text-lg font-bold text-purple-800 font-baloo">{reportData.summary.excusedCount}</span>
          </div>
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 shadow-xs">
            <span className="text-teal-800 font-bold block">উপস্থিতির হার</span>
            <span className="text-lg font-bold text-teal-900 font-baloo">{reportData.summary.attendanceRate}%</span>
          </div>
        </div>
      )}

      {/* 5. A4 PRINTABLE DOCUMENT CONTAINER */}
      <div id="hifz-printable-report-area" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 md:p-8 font-tiro">
        {/* OFFICIAL MOSQUE LETTERHEAD (SECTION 14 OF BRIEF) */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center space-y-1">
          <h2 className="text-2xl font-black font-hind text-slate-900 tracking-tight">
            {currentMosque.name}
          </h2>
          <p className="text-xs text-slate-600 font-tiro">
            {currentMosque.address || 'ঠিকানা নির্ধারিত নেই'}
          </p>
          <div className="pt-2">
            <span className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-bold font-hind">
              {getReportTitle(reportType)}
            </span>
          </div>
          {reportData && (
            <p className="text-[11px] text-slate-500 font-baloo mt-1">
              সময়কাল: {reportData.period.labelBn} | মুদ্রণ তারিখ: {new Date().toLocaleDateString('bn-BD')}
            </p>
          )}
        </div>

        {/* CONTENT TABLE ACCORDING TO REPORT TYPE */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" />
            <span>প্রতিবেদন প্রস্তুত করা হচ্ছে...</span>
          </div>
        ) : !reportData || (reportData.records.length === 0 && (!reportData.groupedData || reportData.groupedData.length === 0)) ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <span>নির্বাচিত সময়সীমায় কোনো রেকর্ড পাওয়া যায়নি</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* A. AGGREGATED SUMMARIES (DAILY, MONTHLY, YEARLY) */}
            {(reportType === 'DAILY_SUMMARY' || reportType === 'MONTHLY_SUMMARY' || reportType === 'YEARLY_SUMMARY') && reportData.groupedData && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-3 border border-slate-200">
                      {reportType === 'YEARLY_SUMMARY' ? 'বছর' : reportType === 'MONTHLY_SUMMARY' ? 'মাস (YYYY-MM)' : 'তারিখ (YYYY-MM-DD)'}
                    </th>
                    <th className="p-3 text-center border border-slate-200">মোট রেকর্ড</th>
                    <th className="p-3 text-center text-emerald-800 border border-slate-200">উপস্থিত</th>
                    <th className="p-3 text-center text-rose-800 border border-slate-200">অনুপস্থিত</th>
                    <th className="p-3 text-center text-amber-800 border border-slate-200">বিলম্ব</th>
                    <th className="p-3 text-center text-blue-800 border border-slate-200">ছুটি</th>
                    <th className="p-3 text-center text-purple-800 border border-slate-200">মার্জনা</th>
                    <th className="p-3 text-center text-teal-800 border border-slate-200">উপস্থিতির হার (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-baloo">
                  {reportData.groupedData.map((g) => (
                    <tr key={g.periodKey} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900 border border-slate-200">{g.periodKey}</td>
                      <td className="p-3 text-center border border-slate-200">{g.totalRecords}</td>
                      <td className="p-3 text-center font-bold text-emerald-700 border border-slate-200">{g.presentCount}</td>
                      <td className="p-3 text-center font-bold text-rose-700 border border-slate-200">{g.absentCount}</td>
                      <td className="p-3 text-center font-bold text-amber-700 border border-slate-200">{g.lateCount}</td>
                      <td className="p-3 text-center font-bold text-blue-700 border border-slate-200">{g.leaveCount}</td>
                      <td className="p-3 text-center font-bold text-purple-700 border border-slate-200">{g.excusedCount}</td>
                      <td className="p-3 text-center font-bold text-teal-900 border border-slate-200">{g.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* B. ASSIGNMENT & USTAD REPORTS */}
            {(reportType === 'ASSIGNMENT' || reportType === 'USTAD_WISE') && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-3 border border-slate-200">ক্রমিক</th>
                    <th className="p-3 border border-slate-200">অ্যাসাইনমেন্ট আইডি</th>
                    <th className="p-3 border border-slate-200">শিক্ষার্থীর নাম</th>
                    <th className="p-3 border border-slate-200">উস্তাদের নাম</th>
                    <th className="p-3 border border-slate-200">ধরন</th>
                    <th className="p-3 border border-slate-200">শুরুর তারিখ</th>
                    <th className="p-3 border border-slate-200">সমাপ্তির তারিখ</th>
                    <th className="p-3 border border-slate-200">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-tiro">
                  {reportData.records.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-baloo border border-slate-200">{idx + 1}</td>
                      <td className="p-3 font-baloo font-medium border border-slate-200">{r.assignmentId}</td>
                      <td className="p-3 font-semibold text-slate-900 border border-slate-200">{r.studentName || '—'}</td>
                      <td className="p-3 font-semibold text-teal-800 border border-slate-200">{r.ustadName || '—'}</td>
                      <td className="p-3 border border-slate-200">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          r.assignmentType === 'PRIMARY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.assignmentType === 'PRIMARY' ? 'প্রধান উস্তাদ' : 'সহকারী উস্তাদ'}
                        </span>
                      </td>
                      <td className="p-3 font-baloo border border-slate-200">{r.startDate}</td>
                      <td className="p-3 font-baloo border border-slate-200">{r.endDate || '—'}</td>
                      <td className="p-3 border border-slate-200">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* C. ATTENDANCE & STUDENT-WISE REPORTS */}
            {(reportType === 'ATTENDANCE' || reportType === 'STUDENT_WISE' || reportType === 'REGISTER') && (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-3 border border-slate-200">ক্রমিক</th>
                    <th className="p-3 border border-slate-200">তারিখ</th>
                    <th className="p-3 border border-slate-200">হাজিরা আইডি</th>
                    <th className="p-3 border border-slate-200">শিক্ষার্থীর নাম</th>
                    <th className="p-3 border border-slate-200">শিক্ষার্থী আইডি</th>
                    <th className="p-3 border border-slate-200">উপস্থিতি স্ট্যাটাস</th>
                    <th className="p-3 border border-slate-200">কারণ</th>
                    <th className="p-3 border border-slate-200">মন্তব্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-tiro">
                  {reportData.records.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-baloo border border-slate-200">{idx + 1}</td>
                      <td className="p-3 font-baloo font-semibold text-slate-900 border border-slate-200">{r.date}</td>
                      <td className="p-3 font-baloo border border-slate-200">{r.attendanceId}</td>
                      <td className="p-3 font-semibold text-slate-900 border border-slate-200">{r.studentName || '—'}</td>
                      <td className="p-3 font-baloo border border-slate-200">{r.studentId || '—'}</td>
                      <td className="p-3 border border-slate-200">{getStatusBadge(r.status)}</td>
                      <td className="p-3 text-slate-600 border border-slate-200">
                        {r.reason ? getStatusLabel(r.reason) : '—'}
                        {r.otherReason && <span className="block text-[10px] text-slate-400">({r.otherReason})</span>}
                      </td>
                      <td className="p-3 text-slate-500 border border-slate-200">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SIGNATURE SECTION FOR REGISTER/PRINT */}
        <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs font-tiro">
          <div>
            <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">হাজিরা তত্ত্বাবধায়ক</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">প্রধান উস্তাদ</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold">মুহতামিম / সভাপতি</div>
          </div>
        </div>
      </div>
    </div>
  );
};

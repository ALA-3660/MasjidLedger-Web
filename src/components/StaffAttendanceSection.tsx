import React, { useState } from 'react';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Fingerprint,
  Users,
  Search,
  Check,
  X,
  AlertCircle,
  Printer,
  History,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Staff, StaffAttendanceRecord, StaffAttendanceStatus, Mosque } from '../types';
import { Language, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';

interface StaffAttendanceSectionProps {
  staffList: Staff[];
  currentMosque?: Mosque | null;
  onLogAttendance: (data: {
    staffId: string;
    date: string;
    status: StaffAttendanceStatus;
    inTime?: string;
    outTime?: string;
    prayersAttended?: ('FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA' | 'JUMA')[];
    remarks?: string;
  }) => Promise<void>;
  language: Language;
}

export const StaffAttendanceSection: React.FC<StaffAttendanceSectionProps> = ({
  staffList = [],
  currentMosque,
  onLogAttendance,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);

  // Active staff only for attendance
  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');

  // Filtered staff
  const filteredStaff = activeStaff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.fullNameBn && s.fullNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.designationBn && s.designationBn.includes(searchQuery))
  );

  // Today stats
  const totalStaff = activeStaff.length;
  const presentCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    return rec?.status === 'PRESENT';
  }).length;
  const lateCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    return rec?.status === 'LATE';
  }).length;
  const leaveCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    return rec?.status === 'ON_LEAVE';
  }).length;
  const absentCount = totalStaff - (presentCount + lateCount + leaveCount);

  // Quick mark prayer/attendance
  const handleQuickMark = async (staff: Staff, status: StaffAttendanceStatus) => {
    setSavingStaffId(staff.id);
    try {
      await onLogAttendance({
        staffId: staff.id,
        date: selectedDate,
        status,
        inTime: status === 'PRESENT' || status === 'LATE' ? new Date().toTimeString().substring(0, 5) : undefined,
        prayersAttended: ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'],
        remarks: 'সরাসরি হাজিরা রেজিস্টার থেকে এন্ট্রি',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStaffId(null);
    }
  };

  // Bulk mark all active as Present
  const handleBulkMarkPresent = async () => {
    for (const staff of activeStaff) {
      const existing = staff.attendanceRecords?.find((r) => r.date === selectedDate);
      if (!existing) {
        await onLogAttendance({
          staffId: staff.id,
          date: selectedDate,
          status: 'PRESENT',
          inTime: '05:00',
          prayersAttended: ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'],
          remarks: 'একত্রে সকল কর্মীর হাজিরা এন্ট্রি',
        });
      }
    }
  };

  const handlePrint = () => {
    printElement('printable-staff-attendance-sheet', {
      title: `দৈনিক_হাজিরা_${selectedDate}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Device Status */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">দৈনিক নামাজভিত্তিক হাজিরা হাব</h3>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center space-x-1">
              <Fingerprint className="w-3 h-3" />
              <span>ফিঙ্গারপ্রিন্ট ও ম্যানুয়াল অডিট সক্রিয়</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ইমাম, মুয়াজ্জিন ও খাদেমদের পাঁচ ওয়াক্ত নামাজ ও দায়িত্ব পালনের সময়ানুবর্তিতা সংরক্ষণ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mandatory Letterhead Toggle */}
          <label className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer select-none transition">
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={(e) => setIncludeLetterhead(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>{includeLetterhead ? '☑ লেটারহেডসহ প্রিন্ট' : '☐ লেটারহেড ছাড়া প্রিন্ট'}</span>
          </label>

          {/* Date Picker */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleBulkMarkPresent}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-indigo-200 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>সবাইকে উপস্থিত করুন</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট শিট</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">মোট সক্রিয় কর্মী</span>
          <div className="text-xl font-bold text-slate-900 font-siliguri mt-0.5">{totalStaff} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">উপস্থিত</span>
          <div className="text-xl font-bold text-emerald-700 font-siliguri mt-0.5">{presentCount} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase">দেরিতে উপস্থিত / ছুটি</span>
          <div className="text-xl font-bold text-amber-700 font-siliguri mt-0.5">{lateCount + leaveCount} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 uppercase">অনুপস্থিত</span>
          <div className="text-xl font-bold text-rose-700 font-siliguri mt-0.5">{absentCount} জন</div>
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কর্মী খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            তারিখ: {formatDate(selectedDate, language)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">কর্মী ও পদবী</th>
                <th className="p-3 text-center">পাঁচ ওয়াক্ত নামাজ উপস্থিতি</th>
                <th className="p-3">ইন টাইম</th>
                <th className="p-3">বর্তমান স্ট্যাটাস</th>
                <th className="p-3 text-right">দ্রুত অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => {
                const record = staff.attendanceRecords?.find((r) => r.date === selectedDate);
                const currentStatus = record?.status || 'ABSENT';

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 font-bold text-indigo-700">
                          {staff.photoUrl ? (
                            <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            staff.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block font-siliguri">{staff.fullNameBn || staff.name}</span>
                          <span className="text-[11px] text-indigo-700 font-medium">{staff.designationBn}</span>
                        </div>
                      </div>
                    </td>

                    {/* Prayer checkboxes indicator */}
                    <td className="p-3">
                      <div className="flex items-center justify-center space-x-1.5">
                        {['ফজর', 'যোহর', 'আসর', 'মাগরিব', 'এশা'].map((pName, pIdx) => (
                          <span
                            key={pName}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 font-mono">{record?.inTime || '-'}</td>

                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          currentStatus === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentStatus === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : currentStatus === 'ON_LEAVE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span>
                          {currentStatus === 'PRESENT'
                            ? '● উপস্থিত'
                            : currentStatus === 'LATE'
                            ? '● দেরিতে'
                            : currentStatus === 'ON_LEAVE'
                            ? '● ছুটিতে'
                            : '● অনুপস্থিত'}
                        </span>
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          disabled={savingStaffId === staff.id}
                          onClick={() => handleQuickMark(staff, 'PRESENT')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          উপস্থিত
                        </button>
                        <button
                          type="button"
                          disabled={savingStaffId === staff.id}
                          onClick={() => handleQuickMark(staff, 'LATE')}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          দেরি
                        </button>
                        <button
                          type="button"
                          disabled={savingStaffId === staff.id}
                          onClick={() => handleQuickMark(staff, 'ABSENT')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          অনুপস্থিত
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

      {/* Hidden Printable Attendance Sheet */}
      <div id="printable-staff-attendance-sheet" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        {includeLetterhead ? (
          <MosqueOfficialLetterhead
            mosque={currentMosque}
            documentTitle="দৈনিক কর্মী হাজিরা শিট"
            dateStr={`তারিখ: ${formatDate(selectedDate, language)}`}
          />
        ) : (
          <div className="text-center pb-4 border-b border-slate-300 mb-6">
            <h1 className="text-xl font-bold font-siliguri">দৈনিক কর্মী হাজিরা শিট</h1>
            <p className="text-xs text-slate-600 mt-1">তারিখ: {formatDate(selectedDate, language)}</p>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="p-2 border border-slate-300">ক্রমিক</th>
              <th className="p-2 border border-slate-300">নাম ও পদবী</th>
              <th className="p-2 border border-slate-300 text-center">ফজর</th>
              <th className="p-2 border border-slate-300 text-center">যোহর</th>
              <th className="p-2 border border-slate-300 text-center">আসর</th>
              <th className="p-2 border border-slate-300 text-center">মাগরিব</th>
              <th className="p-2 border border-slate-300 text-center">এশা</th>
              <th className="p-2 border border-slate-300 text-center">স্ট্যাটাস</th>
              <th className="p-2 border border-slate-300 text-right">স্বাক্ষর</th>
            </tr>
          </thead>
          <tbody>
            {activeStaff.map((staff, idx) => {
              const rec = staff.attendanceRecords?.find((r) => r.date === selectedDate);
              return (
                <tr key={staff.id} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-2 border border-slate-300 font-bold font-siliguri">
                    {staff.fullNameBn || staff.name} ({staff.designationBn})
                  </td>
                  <td className="p-2 border border-slate-300 text-center">✓</td>
                  <td className="p-2 border border-slate-300 text-center">✓</td>
                  <td className="p-2 border border-slate-300 text-center">✓</td>
                  <td className="p-2 border border-slate-300 text-center">✓</td>
                  <td className="p-2 border border-slate-300 text-center">✓</td>
                  <td className="p-2 border border-slate-300 text-center">{rec?.status || 'PRESENT'}</td>
                  <td className="p-2 border border-slate-300"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

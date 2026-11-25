import React, { useState } from 'react';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  Fingerprint,
  Search,
  AlertCircle,
  Printer,
  Loader2,
  Info,
} from 'lucide-react';
import { Staff, StaffAttendanceStatus, Mosque } from '../types';
import { Language, formatDate, toBanglaNumber } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { AiAttendanceSummaryPanel } from './staff/AiAttendanceSummaryPanel';
import { FormAlertAssistant } from './common/FormAlertAssistant';

type PrayerKey = 'FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA' | 'JUMA';

const DAILY_PRAYERS: Array<{ key: PrayerKey; labelBn: string }> = [
  { key: 'FAJR', labelBn: 'ফজর' },
  { key: 'DHUHR', labelBn: 'যোহর' },
  { key: 'ASR', labelBn: 'আসর' },
  { key: 'MAGHRIB', labelBn: 'মাগরিব' },
  { key: 'ISHA', labelBn: 'এশা' },
];

function isKhatibStaff(staff: Staff): boolean {
  const d = String(staff.designation || '').toUpperCase();
  const bn = String(staff.designationBn || '');
  return d === 'KHATIB' || bn.includes('খতিব');
}

function isFridayDateStr(dateStr: string): boolean {
  if (!dateStr) return false;
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (isNaN(parsed.getTime())) return false;
  return parsed.getDay() === 5;
}

function normalizePrayers(list?: string[]): PrayerKey[] {
  if (!Array.isArray(list)) return [];
  const mapped = list
    .map((item) => String(item || '').trim().toUpperCase())
    .filter((k): k is PrayerKey =>
      ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA', 'JUMA'].includes(k)
    );
  return Array.from(new Set(mapped));
}

interface StaffAttendanceSectionProps {
  staffList: Staff[];
  currentMosque?: Mosque | null;
  onLogAttendance: (data: {
    staffId: string;
    date: string;
    status: StaffAttendanceStatus;
    inTime?: string;
    outTime?: string;
    prayersAttended?: PrayerKey[];
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
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFriday = isFridayDateStr(selectedDate);

  // Active staff only for attendance
  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');
  const activeKhatibCount = activeStaff.filter(isKhatibStaff).length;

  // Filtered staff
  const filteredStaff = activeStaff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.fullNameBn && s.fullNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.designationBn && s.designationBn.includes(searchQuery))
  );

  // KPI calculations respecting Khatib Jumuah-only rule
  const totalStaff = activeStaff.length;
  const presentCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    return rec?.status === 'PRESENT' || rec?.status === 'OFFICIAL_DUTY';
  }).length;
  const lateCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    return rec?.status === 'LATE';
  }).length;
  const leaveCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    return rec?.status === 'ON_LEAVE';
  }).length;
  const absentCount = activeStaff.filter((s) => {
    const rec = s.attendanceRecords?.find((r) => r.date === selectedDate);
    // Non-Friday days: Khatibs do not have mandatory 5-waqt attendance, never auto-count them as Absent
    if (isKhatibStaff(s) && !isFriday) {
      return rec?.status === 'ABSENT';
    }
    return !rec || rec.status === 'ABSENT';
  }).length;

  const getCurrentTimeHHMM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Quick mark status (উপস্থিত / দেরি / ছুটি / অনুপস্থিত)
  const handleQuickMark = async (staff: Staff, status: StaffAttendanceStatus) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingStaffId(staff.id);
    const khatib = isKhatibStaff(staff);

    try {
      const existingRec = staff.attendanceRecords?.find((r) => r.date === selectedDate);
      const existingPrayers = normalizePrayers(existingRec?.prayersAttended);

      let prayersToSave: PrayerKey[] = [];
      if (status === 'PRESENT' || status === 'LATE') {
        if (khatib) {
          prayersToSave = ['JUMA'];
        } else {
          prayersToSave =
            existingPrayers.length > 0 && !existingPrayers.every((p) => p === 'JUMA')
              ? existingPrayers
              : ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'];
        }
      } else {
        prayersToSave = [];
      }

      await onLogAttendance({
        staffId: staff.id,
        date: selectedDate,
        status,
        inTime:
          status === 'PRESENT' || status === 'LATE'
            ? existingRec?.inTime || getCurrentTimeHHMM()
            : '',
        prayersAttended: prayersToSave,
        remarks: khatib
          ? isFriday
            ? 'জুমাবার খতিব হাজিরা এন্ট্রি'
            : 'খতিব (শুধু জুমাবারে প্রযোজ্য)'
          : 'সরাসরি হাজিরা রেজিস্টার থেকে এন্ট্রি',
      });

      const nameBn = staff.fullNameBn || staff.name;
      const statusLabel =
        status === 'PRESENT'
          ? 'উপস্থিত'
          : status === 'LATE'
          ? 'দেরি'
          : status === 'ON_LEAVE'
          ? 'ছুটি'
          : 'অনুপস্থিত';
      setSuccessMessage(`${nameBn}-এর হাজিরা "${statusLabel}" হিসেবে সংরক্ষিত হয়েছে।`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'হাজিরা সংরক্ষণ করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setSavingStaffId(null);
    }
  };

  // Interactive individual Waqt / Jumuah prayer toggle
  const handleTogglePrayer = async (staff: Staff, prayerKey: PrayerKey) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingStaffId(staff.id);
    const khatib = isKhatibStaff(staff);

    try {
      const existingRec = staff.attendanceRecords?.find((r) => r.date === selectedDate);
      const currentPrayers = normalizePrayers(existingRec?.prayersAttended);

      const exists = currentPrayers.includes(prayerKey);
      const updatedPrayers = exists
        ? currentPrayers.filter((p) => p !== prayerKey)
        : [...currentPrayers, prayerKey];

      let nextStatus: StaffAttendanceStatus = existingRec?.status || 'ABSENT';
      if (updatedPrayers.length > 0) {
        nextStatus = existingRec?.status === 'LATE' ? 'LATE' : 'PRESENT';
      } else if (existingRec?.status !== 'ON_LEAVE') {
        nextStatus = 'ABSENT';
      }

      await onLogAttendance({
        staffId: staff.id,
        date: selectedDate,
        status: nextStatus,
        inTime:
          nextStatus === 'PRESENT' || nextStatus === 'LATE'
            ? existingRec?.inTime || getCurrentTimeHHMM()
            : '',
        prayersAttended: updatedPrayers,
        remarks: khatib ? 'জুমার নামাজ উপস্থিতি আপডেট' : 'ওয়াক্তভিত্তিক হাজিরা আপডেট',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'ওয়াক্ত উপস্থিতি আপডেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setSavingStaffId(null);
    }
  };

  // Bulk mark all active required staff as Present (excludes non-Friday Khatibs)
  const handleBulkMarkPresent = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setBulkSaving(true);
    try {
      let updated = 0;
      for (const staff of activeStaff) {
        const khatib = isKhatibStaff(staff);
        if (khatib && !isFriday) {
          // Khatib only attends Jumuah on Friday; never force mark 5 waqt on non-Friday
          continue;
        }
        const existing = staff.attendanceRecords?.find((r) => r.date === selectedDate);
        if (!existing) {
          await onLogAttendance({
            staffId: staff.id,
            date: selectedDate,
            status: 'PRESENT',
            inTime: khatib ? '12:45' : '05:00',
            prayersAttended: khatib ? ['JUMA'] : ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'],
            remarks: khatib ? 'জুমাবার একত্রে হাজিরা' : 'একত্রে সকল কর্মীর হাজিরা এন্ট্রি',
          });
          updated++;
        }
      }
      if (updated > 0) {
        setSuccessMessage(`${toBanglaNumber(updated)} জন প্রযোজ্য কর্মীকে উপস্থিত হিসেবে সংরক্ষণ করা হয়েছে।`);
      } else {
        setSuccessMessage('প্রযোজ্য সকল সক্রিয় কর্মীর আজকের হাজিরা ইতিমধ্যে সম্পন্ন রয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'একত্রে হাজিরা সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setBulkSaving(false);
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
          <div className="flex flex-wrap items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 font-siliguri">দৈনিক নামাজভিত্তিক হাজিরা হাব</h3>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center space-x-1">
              <Fingerprint className="w-3 h-3" />
              <span>ফিঙ্গারপ্রিন্ট ও ম্যানুয়াল অডিট সক্রিয়</span>
            </span>
            {isFriday && (
              <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-full">
                🕌 আজ জুমাবার (খতিব হাজিরা সক্রিয়)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-tiro">
            ইমাম, মুয়াজ্জিন ও খাদেমদের পাঁচ ওয়াক্ত নামাজ এবং জুমাবার খতিব সাহেবের উপস্থিতি সংরক্ষণ
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
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={bulkSaving}
            onClick={handleBulkMarkPresent}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-indigo-200 transition-colors cursor-pointer"
          >
            {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{bulkSaving ? 'সংরক্ষণ হচ্ছে...' : 'সবাইকে উপস্থিত করুন'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট শিট</span>
          </button>
        </div>
      </div>

      {/* Feedback & Universal AI Alert Assistant */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <FormAlertAssistant
            alertMessage={errorMessage}
            formNameBn="দৈনিক নামাজভিত্তিক হাজিরা হাব"
            moduleKey="STAFF_ATTENDANCE"
            alertType="ERROR"
            fieldValuesSnapshot={{ selectedDate, isFriday, activeStaffCount: activeStaff.length }}
          />
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* AI Monthly Attendance Summary & Alert Panel */}
      <AiAttendanceSummaryPanel
        selectedDate={selectedDate}
        activeStaffCount={activeStaff.length}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">মোট সক্রিয় কর্মী</span>
          <div className="text-xl font-bold text-slate-900 font-baloo mt-0.5">{toBanglaNumber(totalStaff)} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">উপস্থিত</span>
          <div className="text-xl font-bold text-emerald-700 font-baloo mt-0.5">{toBanglaNumber(presentCount)} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase">দেরিতে উপস্থিত / ছুটি</span>
          <div className="text-xl font-bold text-amber-700 font-baloo mt-0.5">{toBanglaNumber(lateCount + leaveCount)} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 uppercase">অনুপস্থিত</span>
          <div className="text-xl font-bold text-rose-700 font-baloo mt-0.5">{toBanglaNumber(absentCount)} জন</div>
          {!isFriday && activeKhatibCount > 0 && (
            <div className="text-[10px] text-slate-500 mt-0.5 font-tiro">
              * খতিব ({toBanglaNumber(activeKhatibCount)} জন) শুধু জুমাবারে প্রযোজ্য
            </div>
          )}
        </div>
      </div>

      {/* Attendance Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
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
          <span className="text-xs font-bold text-slate-500">
            তারিখ: {formatDate(selectedDate, language)} {isFriday ? '(জুমাবার)' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">কর্মী ও পদবী</th>
                <th className="p-3 text-center">ওয়াক্ত / জুমার নামাজ উপস্থিতি (ক্লিক করে টগল করুন)</th>
                <th className="p-3">ইন টাইম</th>
                <th className="p-3">বর্তমান স্ট্যাটাস</th>
                <th className="p-3 text-right">দ্রুত অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => {
                const record = staff.attendanceRecords?.find((r) => r.date === selectedDate);
                const khatib = isKhatibStaff(staff);
                const isNonFridayKhatib = khatib && !isFriday;
                const currentStatus: StaffAttendanceStatus | 'JUMA_ONLY_WAIT' =
                  record?.status || (isNonFridayKhatib ? 'JUMA_ONLY_WAIT' : 'ABSENT');
                const attendedPrayers = normalizePrayers(record?.prayersAttended);
                const isSaving = savingStaffId === staff.id;

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 font-bold text-indigo-700">
                          {staff.photoUrl ? (
                            <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (staff.fullNameBn || staff.name).charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block font-siliguri">
                            {staff.fullNameBn || staff.name}
                          </span>
                          <span className="text-[11px] text-indigo-700 font-medium">{staff.designationBn}</span>
                        </div>
                      </div>
                    </td>

                    {/* Interactive Prayer Checkboxes OR Khatib Jumuah Rule */}
                    <td className="p-3">
                      {isNonFridayKhatib ? (
                        <div className="flex items-center justify-center">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1">
                            <span>🕌 শুধু জুমার নামাজ (জুমাবার প্রযোজ্য)</span>
                          </span>
                        </div>
                      ) : khatib ? (
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleTogglePrayer(staff, 'JUMA')}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                              attendedPrayers.includes('JUMA')
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-emerald-50 hover:border-emerald-300'
                            }`}
                          >
                            {attendedPrayers.includes('JUMA') ? '✓ জুমার নামাজ উপস্থিত' : 'জুমার নামাজ'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {DAILY_PRAYERS.map((p) => {
                            const active =
                              attendedPrayers.includes(p.key) ||
                              (attendedPrayers.length === 0 && record?.status === 'PRESENT');
                            return (
                              <button
                                key={p.key}
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleTogglePrayer(staff, p.key)}
                                title={`${p.labelBn} ওয়াক্ত উপস্থিতি টগল করুন`}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                                  active
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                                }`}
                              >
                                {active ? `✓ ${p.labelBn}` : p.labelBn}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    <td className="p-3 font-mono text-slate-700">{record?.inTime || '-'}</td>

                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          currentStatus === 'PRESENT' || currentStatus === 'OFFICIAL_DUTY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentStatus === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : currentStatus === 'ON_LEAVE'
                            ? 'bg-blue-100 text-blue-800'
                            : currentStatus === 'JUMA_ONLY_WAIT'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span>
                          {currentStatus === 'PRESENT' || currentStatus === 'OFFICIAL_DUTY'
                            ? '● উপস্থিত'
                            : currentStatus === 'LATE'
                            ? '● দেরিতে'
                            : currentStatus === 'ON_LEAVE'
                            ? '● ছুটিতে'
                            : currentStatus === 'JUMA_ONLY_WAIT'
                            ? '● শুধু জুমাবার প্রযোজ্য'
                            : '● অনুপস্থিত'}
                        </span>
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {isNonFridayKhatib ? (
                        <div className="inline-flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                          <Info className="w-3.5 h-3.5 text-indigo-500" />
                          <span>জুমাবারে হাজিরা সক্রিয় হবে</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleQuickMark(staff, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            উপস্থিত
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleQuickMark(staff, 'LATE')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                              currentStatus === 'LATE'
                                ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                          >
                            দেরি
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleQuickMark(staff, 'ON_LEAVE')}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                              currentStatus === 'ON_LEAVE'
                                ? 'bg-blue-700 text-white ring-2 ring-blue-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            ছুটি
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleQuickMark(staff, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-700 text-white ring-2 ring-rose-300'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                          >
                            অনুপস্থিত
                          </button>
                        </div>
                      )}
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
              const khatib = isKhatibStaff(staff);
              const prayers = normalizePrayers(rec?.prayersAttended);
              const mark = (k: PrayerKey) => (prayers.includes(k) || (prayers.length === 0 && rec?.status === 'PRESENT') ? '✓' : '—');
              const statusText =
                khatib && !isFriday && !rec
                  ? 'শুধু জুমাবার'
                  : rec?.status === 'PRESENT'
                  ? 'উপস্থিত'
                  : rec?.status === 'LATE'
                  ? 'দেরি'
                  : rec?.status === 'ON_LEAVE'
                  ? 'ছুটি'
                  : 'অনুপস্থিত';

              return (
                <tr key={staff.id} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-300 text-center">{toBanglaNumber(idx + 1)}</td>
                  <td className="p-2 border border-slate-300 font-bold font-siliguri">
                    {staff.fullNameBn || staff.name} ({staff.designationBn})
                  </td>
                  {khatib ? (
                    <td colSpan={5} className="p-2 border border-slate-300 text-center font-medium">
                      {isFriday
                        ? prayers.includes('JUMA') || rec?.status === 'PRESENT'
                          ? '✓ জুমার নামাজ'
                          : 'জুমাবার নির্ধারিত'
                        : 'শুধু জুমার নামাজ (জুমাবার প্রযোজ্য)'}
                    </td>
                  ) : (
                    <>
                      <td className="p-2 border border-slate-300 text-center">{mark('FAJR')}</td>
                      <td className="p-2 border border-slate-300 text-center">{mark('DHUHR')}</td>
                      <td className="p-2 border border-slate-300 text-center">{mark('ASR')}</td>
                      <td className="p-2 border border-slate-300 text-center">{mark('MAGHRIB')}</td>
                      <td className="p-2 border border-slate-300 text-center">{mark('ISHA')}</td>
                    </>
                  )}
                  <td className="p-2 border border-slate-300 text-center">{statusText}</td>
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

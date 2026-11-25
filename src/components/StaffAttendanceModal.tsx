import React, { useState, useEffect } from 'react';
import { X, CalendarCheck, Save, AlertCircle } from 'lucide-react';
import { Staff } from '../types';
import { Language } from '../lib/i18n';
import { FormAlertAssistant } from './common/FormAlertAssistant';

interface StaffAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onSubmit: (data: {
    date: string;
    records: Array<{
      staffId: string;
      status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
      inTime?: string;
      outTime?: string;
      remarks?: string;
      prayersAttended?: string[];
    }>;
  }) => Promise<void>;
  language?: Language;
}

function isKhatibStaff(staff: Staff): boolean {
  const d = String(staff.designation || '').toUpperCase();
  const bn = String(staff.designationBn || '');
  return d === 'KHATIB' || bn.includes('খতিব');
}

function isFridayDateStr(dateStr: string): boolean {
  if (!dateStr) return false;
  const parsed = new Date(`${dateStr}T12:00:00`);
  return !isNaN(parsed.getTime()) && parsed.getDay() === 5;
}

function normalizePrayerIds(arr?: string[]): string[] {
  if (!Array.isArray(arr)) return [];
  return Array.from(
    new Set(
      arr
        .map((x) => String(x || '').trim().toUpperCase())
        .filter((k) => ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA', 'JUMA'].includes(k))
    )
  );
}

export const StaffAttendanceModal: React.FC<StaffAttendanceModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  onSubmit,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<
      string,
      {
        status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE';
        inTime: string;
        outTime: string;
        remarks: string;
        prayersAttended: string[];
      }
    >
  >({});

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isFriday = isFridayDateStr(date);

  useEffect(() => {
    if (!isOpen) return;
    const map: Record<string, any> = {};
    staffList.forEach((s) => {
      const khatib = isKhatibStaff(s);
      const existing = (s.attendanceRecords || []).find((a) => a.date === date);
      const existingPrayers = normalizePrayerIds(existing?.prayersAttended);

      map[s.id] = {
        status: existing?.status || (s.status === 'ON_LEAVE' ? 'ON_LEAVE' : 'PRESENT'),
        inTime: existing?.inTime || (khatib ? '12:45' : '05:00'),
        outTime: existing?.outTime || (khatib ? '14:00' : '21:00'),
        remarks: existing?.remarks || '',
        prayersAttended:
          existingPrayers.length > 0
            ? existingPrayers
            : khatib
            ? isFriday
              ? ['JUMA']
              : []
            : ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'],
      };
    });
    setAttendanceMap(map);
    setError(null);
  }, [isOpen, date, staffList, isFriday]);

  if (!isOpen) return null;

  const prayerList = [
    { id: 'FAJR', name: 'ফজর' },
    { id: 'DHUHR', name: 'যোহর' },
    { id: 'ASR', name: 'আসর' },
    { id: 'MAGHRIB', name: 'মাগরিব' },
    { id: 'ISHA', name: 'এশা' },
  ];

  const handleStatusChange = (staffId: string, status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { inTime: '05:00', outTime: '21:00', remarks: '', prayersAttended: [] }),
        status,
        prayersAttended:
          status === 'ABSENT' || status === 'ON_LEAVE'
            ? []
            : prev[staffId]?.prayersAttended || [],
      },
    }));
  };

  const handlePrayerToggle = (staffId: string, prayerId: string) => {
    setAttendanceMap((prev) => {
      const cur = prev[staffId]?.prayersAttended || [];
      const updated = cur.includes(prayerId) ? cur.filter((p) => p !== prayerId) : [...cur, prayerId];
      return {
        ...prev,
        [staffId]: {
          ...(prev[staffId] || { status: 'PRESENT', inTime: '05:00', outTime: '21:00', remarks: '' }),
          status: updated.length > 0 ? (prev[staffId]?.status === 'LATE' ? 'LATE' : 'PRESENT') : prev[staffId]?.status || 'PRESENT',
          prayersAttended: updated,
        },
      };
    });
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, any> = {};
    staffList.forEach((s) => {
      const khatib = isKhatibStaff(s);
      if (khatib && !isFriday) {
        if (attendanceMap[s.id]) updated[s.id] = attendanceMap[s.id];
        return;
      }
      updated[s.id] = {
        status: 'PRESENT',
        inTime: khatib ? '12:45' : '05:00',
        outTime: khatib ? '14:00' : '21:00',
        remarks: '',
        prayersAttended: khatib ? ['JUMA'] : ['FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA'],
      };
    });
    setAttendanceMap(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const records = Object.entries(attendanceMap)
      .filter(([staffId]) => {
        const s = staffList.find((item) => item.id === staffId);
        if (!s) return false;
        // Skip unmarked non-Friday Khatibs so they are never marked absent/present erroneously
        if (isKhatibStaff(s) && !isFriday) {
          const cur = attendanceMap[staffId];
          return cur?.status === 'ON_LEAVE' || (s.attendanceRecords || []).some((r) => r.date === date);
        }
        return true;
      })
      .map(([staffId, data]: [string, any]) => ({
        staffId,
        status: data.status,
        inTime: data.inTime,
        outTime: data.outTime,
        remarks: data.remarks,
        prayersAttended: data.prayersAttended,
      }));

    if (records.length === 0) {
      setError('সংরক্ষণের জন্য কমপক্ষে একজন প্রযোজ্য কর্মীর উপস্থিতি নির্বাচন করুন।');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({ date, records });
      onClose();
    } catch (err: any) {
      setError(err.message || 'উপস্থিতি সংরক্ষণ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-siliguri">স্টাফ দৈনিক উপস্থিতি ও সালাত হাজিরা</h3>
              <p className="text-xs text-slate-300 font-tiro">
                ইমাম, মুয়াজ্জিন, খাদেম ও খতিব (শুধু জুমাবার)-এর উপস্থিতি ও জামাত লগ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">উপস্থিতির তারিখ:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
            />
            {isFriday && (
              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-[11px] font-bold">
                🕌 জুমাবার
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            ✓ প্রযোজ্য সকলকে উপস্থিত চিহ্নিত করুন
          </button>
        </div>

        {/* Staff Attendance List */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <FormAlertAssistant
                alertMessage={error}
                formNameBn="স্টাফ দৈনিক উপস্থিতি মোডাল"
                moduleKey="STAFF_ATTENDANCE_MODAL"
                alertType="ERROR"
                fieldValuesSnapshot={{ date, isFriday, staffCount: staffList.length }}
                compact
              />
            </div>
          )}

          <div className="space-y-3">
            {staffList.map((s) => {
              const khatib = isKhatibStaff(s);
              const isNonFridayKhatib = khatib && !isFriday;
              const cur = attendanceMap[s.id] || {
                status: 'PRESENT',
                inTime: '05:00',
                outTime: '21:00',
                remarks: '',
                prayersAttended: [],
              };

              return (
                <div
                  key={s.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-blue-300 transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-siliguri">{s.fullNameBn || s.name}</h4>
                      <p className="text-xs text-slate-500">
                        {s.designationBn} ({s.staffCode || 'আইডি নাই'}) | {s.phone}
                      </p>
                    </div>

                    {isNonFridayKhatib ? (
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold">
                        🕌 শুধু জুমার নামাজ (জুমাবার প্রযোজ্য)
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'PRESENT')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                            cur.status === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          উপস্থিত
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'LATE')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                            cur.status === 'LATE'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          দেরি
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'ON_LEAVE')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                            cur.status === 'ON_LEAVE'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ছুটিতে
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(s.id, 'ABSENT')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                            cur.status === 'ABSENT'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          অনুপস্থিত
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Prayer Attendance checkmarks */}
                  {!isNonFridayKhatib && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-600">সালাত জামাত উপস্থিতি:</span>
                        {khatib ? (
                          <button
                            type="button"
                            onClick={() => handlePrayerToggle(s.id, 'JUMA')}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
                              cur.prayersAttended.includes('JUMA')
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {cur.prayersAttended.includes('JUMA') ? '✓ জুমার নামাজ' : 'জুমার নামাজ'}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {prayerList.map((pr) => {
                              const isChecked = cur.prayersAttended.includes(pr.id);
                              return (
                                <button
                                  key={pr.id}
                                  type="button"
                                  onClick={() => handlePrayerToggle(s.id, pr.id)}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
                                    isChecked
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  {pr.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="মন্তব্য (ঐচ্ছিক)"
                          value={cur.remarks}
                          onChange={(e) =>
                            setAttendanceMap((prev) => ({
                              ...prev,
                              [s.id]: { ...(prev[s.id] || cur), remarks: e.target.value },
                            }))
                          }
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white flex-1 sm:w-48"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'উপস্থিতি তালিকা সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, CalendarCheck, Save, AlertCircle, Check, Clock, User, CheckCircle2 } from 'lucide-react';
import { Staff } from '../types';
import { Language, translations } from '../lib/i18n';

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

export const StaffAttendanceModal: React.FC<StaffAttendanceModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  onSubmit,
  language = 'bn'
}) => {
  const t = translations[language] || translations.bn;

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
  >(() => {
    const map: any = {};
    staffList.forEach((s) => {
      // Find if today already logged
      const existing = (s.attendanceRecords || []).find((a) => a.date === new Date().toISOString().split('T')[0]);
      map[s.id] = {
        status: existing?.status || (s.status === 'ON_LEAVE' ? 'ON_LEAVE' : 'PRESENT'),
        inTime: existing?.inTime || '05:00',
        outTime: existing?.outTime || '21:00',
        remarks: existing?.remarks || '',
        prayersAttended: existing?.prayersAttended || ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
      };
    });
    return map;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const prayerList = [
    { id: 'Fajr', name: 'ফজর' },
    { id: 'Dhuhr', name: 'যোহর' },
    { id: 'Asr', name: 'আসর' },
    { id: 'Maghrib', name: 'মাগরিব' },
    { id: 'Isha', name: 'ইশা' }
  ];

  const handleStatusChange = (staffId: string, status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { inTime: '05:00', outTime: '21:00', remarks: '', prayersAttended: [] }),
        status
      }
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
          prayersAttended: updated
        }
      };
    });
  };

  const handleMarkAllPresent = () => {
    const updated: any = {};
    staffList.forEach((s) => {
      updated[s.id] = {
        status: 'PRESENT',
        inTime: '05:00',
        outTime: '21:00',
        remarks: '',
        prayersAttended: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
      };
    });
    setAttendanceMap(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const records = Object.entries(attendanceMap).map(([staffId, data]: [string, any]) => ({
      staffId,
      status: data.status,
      inTime: data.inTime,
      outTime: data.outTime,
      remarks: data.remarks,
      prayersAttended: data.prayersAttended
    }));

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
              <h3 className="text-lg font-bold">স্টাফ দৈনিক উপস্থিতি ও সালাত হাজিরা</h3>
              <p className="text-xs text-slate-300">ইমাম, মুয়াজ্জিন ও খাদেমদের উপস্থিতি ও জামাত উপস্থিতি লগ</p>
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
          </div>

          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition"
          >
            ✓ সকলকে উপস্থিত চিহ্নিত করুন
          </button>
        </div>

        {/* Staff Attendance List */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {staffList.map((s) => {
              const cur = attendanceMap[s.id] || {
                status: 'PRESENT',
                inTime: '05:00',
                outTime: '21:00',
                remarks: '',
                prayersAttended: []
              };

              return (
                <div
                  key={s.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-blue-300 transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                      <p className="text-xs text-slate-500">
                        {s.designationBn} ({s.staffCode || 'আইডি নাই'}) | {s.phone}
                      </p>
                    </div>

                    {/* Status Radio Buttons */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(s.id, 'PRESENT')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
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
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
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
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
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
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                          cur.status === 'ABSENT'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        অনুপস্থিত
                      </button>
                    </div>
                  </div>

                  {/* Prayer Attendance checkmarks for Imam, Muezzin, Staff */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">সালাত জামাত উপস্থিতি:</span>
                      <div className="flex items-center gap-1.5">
                        {prayerList.map((pr) => {
                          const isChecked = cur.prayersAttended.includes(pr.id);
                          return (
                            <button
                              key={pr.id}
                              type="button"
                              onClick={() => handlePrayerToggle(s.id, pr.id)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${
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
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="মন্তব্য (ঐচ্ছিক)"
                        value={cur.remarks}
                        onChange={(e) =>
                          setAttendanceMap((prev) => ({
                            ...prev,
                            [s.id]: { ...(prev[s.id] || cur), remarks: e.target.value }
                          }))
                        }
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white flex-1 sm:w-48"
                      />
                    </div>
                  </div>
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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2"
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

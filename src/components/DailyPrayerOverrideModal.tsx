import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatTime12Hour, toBanglaDigits, MonthlyDayPrayerItem } from '../lib/prayerEngine';
import { api } from '../lib/api';

interface DailyPrayerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayItem: MonthlyDayPrayerItem | null;
  existingOverride?: any;
  defaultJamaatSettings?: any;
  onSuccess: () => Promise<void>;
}

export const DailyPrayerOverrideModal: React.FC<DailyPrayerOverrideModalProps> = ({
  isOpen,
  onClose,
  dayItem,
  existingOverride,
  defaultJamaatSettings,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    fajrAdhan: '',
    fajrJamaat: '',
    dhuhrAdhan: '',
    dhuhrJamaat: '',
    asrAdhan: '',
    asrJamaat: '',
    maghribAdhan: '',
    maghribJamaat: '',
    ishaAdhan: '',
    ishaJamaat: '',
    jumuahAdhan: '',
    jumuahKhutbah: '',
    jumuahJamaat: '',
    notes: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (dayItem) {
      const o = existingOverride || {};
      const def = defaultJamaatSettings || {};

      setFormData({
        fajrAdhan: o.fajr?.adhan || dayItem.fajrAzan12 || def.fajr?.azan || '4:28 AM',
        fajrJamaat: o.fajr?.jamaat || dayItem.fajrJamaat12 || def.fajr?.jamaat || '5:15 AM',
        dhuhrAdhan: o.dhuhr?.adhan || dayItem.dhuhrAzan12 || def.dhuhr?.azan || '12:30 PM',
        dhuhrJamaat: o.dhuhr?.jamaat || dayItem.dhuhrJamaat12 || def.dhuhr?.jamaat || '1:30 PM',
        asrAdhan: o.asr?.adhan || dayItem.asrAzan12 || def.asr?.azan || '4:21 PM',
        asrJamaat: o.asr?.jamaat || dayItem.asrJamaat12 || def.asr?.jamaat || '4:45 PM',
        maghribAdhan: o.maghrib?.adhan || dayItem.maghribAzan12 || def.maghrib?.azan || '6:05 PM',
        maghribJamaat: o.maghrib?.jamaat || dayItem.maghribJamaat12 || def.maghrib?.jamaat || '6:30 PM',
        ishaAdhan: o.isha?.adhan || dayItem.ishaAzan12 || def.isha?.azan || '7:21 PM',
        ishaJamaat: o.isha?.jamaat || dayItem.ishaJamaat12 || def.isha?.jamaat || '8:15 PM',
        jumuahAdhan: o.jumuah?.adhan || dayItem.jumuahAzan12 || def.jumuah?.azan || '12:30 PM',
        jumuahKhutbah: o.jumuah?.khutbah || dayItem.jumuahKhutbah12 || def.jumuah?.khutbah || '1:00 PM',
        jumuahJamaat: o.jumuah?.jamaat || dayItem.jumuahJamaat12 || def.jumuah?.jamaat || '1:30 PM',
        notes: o.notes || '',
      });
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [dayItem, existingOverride, defaultJamaatSettings]);

  if (!isOpen || !dayItem) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMsg(null);

      const overridePayload = {
        fajr: {
          adhan: formatTime12Hour(formData.fajrAdhan),
          jamaat: formatTime12Hour(formData.fajrJamaat),
        },
        dhuhr: {
          adhan: formatTime12Hour(formData.dhuhrAdhan),
          jamaat: formatTime12Hour(formData.dhuhrJamaat),
        },
        asr: {
          adhan: formatTime12Hour(formData.asrAdhan),
          jamaat: formatTime12Hour(formData.asrJamaat),
        },
        maghrib: {
          adhan: formatTime12Hour(formData.maghribAdhan),
          jamaat: formatTime12Hour(formData.maghribJamaat),
        },
        isha: {
          adhan: formatTime12Hour(formData.ishaAdhan),
          jamaat: formatTime12Hour(formData.ishaJamaat),
        },
        jumuah: dayItem.isFriday
          ? {
              adhan: formatTime12Hour(formData.jumuahAdhan),
              khutbah: formatTime12Hour(formData.jumuahKhutbah),
              jamaat: formatTime12Hour(formData.jumuahJamaat),
            }
          : undefined,
        notes: formData.notes.trim() || undefined,
      };

      await api.updateDailyPrayerOverride(dayItem.dateStr, overridePayload, 'UPDATE');
      setSuccessMsg('এই নির্দিষ্ট দিনের নামাজের সময়সূচি সফলভাবে সংরক্ষিত হয়েছে।');
      await onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm('আপনি কি নিশ্চিত যে এই নির্দিষ্ট দিনের ম্যানুয়াল কাস্টম সময়সূচি মুছে দিয়ে মসজিদের সাধারণ ডিফল্ট সেটিংসে ফিরে যেতে চান?')) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await api.updateDailyPrayerOverride(dayItem.dateStr, null, 'DELETE');
      setSuccessMsg('এই দিনের কাস্টম সময়সূচি মুছে সাধারণ সময়সূচিতে ফিরে আসা হয়েছে।');
      await onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'রিসেট করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden font-siliguri animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>একক দিনের নামাজের সময়সূচি নির্ধারণ (Manual Override)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              তারিখ: <strong className="text-slate-800">{dayItem.dateStr} ({dayItem.dayNameBn}বার)</strong> • হিজরি: {dayItem.hijriDateBn} • বঙ্গাব্দ: {dayItem.bengaliDateBn}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
            💡 <strong>উল্লেখ্য:</strong> এখানে প্রদত্ত সময় শুধুমাত্র <strong>{dayItem.dateStr}</strong> তারিখের জন্য কার্যকর হবে। পুরো মাসের সাধারণ সময়সূচি অপরিবর্তিত থাকবে।
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fajr */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">ফজর</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">আজান</label>
                  <input
                    type="text"
                    value={formData.fajrAdhan}
                    onChange={(e) => setFormData({ ...formData, fajrAdhan: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="4:28 AM"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5 font-bold text-emerald-700">জামাত</label>
                  <input
                    type="text"
                    value={formData.fajrJamaat}
                    onChange={(e) => setFormData({ ...formData, fajrJamaat: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                    placeholder="5:15 AM"
                  />
                </div>
              </div>
            </div>

            {/* Dhuhr / Jumuah */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                {dayItem.isFriday ? 'যোহর (সাধারণ ওয়াক্ত)' : 'যোহর'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">আজান</label>
                  <input
                    type="text"
                    value={formData.dhuhrAdhan}
                    onChange={(e) => setFormData({ ...formData, dhuhrAdhan: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="12:30 PM"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5 font-bold text-emerald-700">জামাত</label>
                  <input
                    type="text"
                    value={formData.dhuhrJamaat}
                    onChange={(e) => setFormData({ ...formData, dhuhrJamaat: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                    placeholder="1:30 PM"
                  />
                </div>
              </div>
            </div>

            {/* Asr */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">আসর</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">আজান</label>
                  <input
                    type="text"
                    value={formData.asrAdhan}
                    onChange={(e) => setFormData({ ...formData, asrAdhan: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="4:21 PM"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5 font-bold text-emerald-700">জামাত</label>
                  <input
                    type="text"
                    value={formData.asrJamaat}
                    onChange={(e) => setFormData({ ...formData, asrJamaat: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                    placeholder="4:45 PM"
                  />
                </div>
              </div>
            </div>

            {/* Maghrib */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">মাগরিব / ইফতার</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">আজান / ইফতার</label>
                  <input
                    type="text"
                    value={formData.maghribAdhan}
                    onChange={(e) => setFormData({ ...formData, maghribAdhan: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-rose-800"
                    placeholder="6:05 PM"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5 font-bold text-emerald-700">জামাত</label>
                  <input
                    type="text"
                    value={formData.maghribJamaat}
                    onChange={(e) => setFormData({ ...formData, maghribJamaat: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                    placeholder="6:30 PM"
                  />
                </div>
              </div>
            </div>

            {/* Isha */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">এশা</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">আজান</label>
                  <input
                    type="text"
                    value={formData.ishaAdhan}
                    onChange={(e) => setFormData({ ...formData, ishaAdhan: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="7:21 PM"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5 font-bold text-emerald-700">জামাত</label>
                  <input
                    type="text"
                    value={formData.ishaJamaat}
                    onChange={(e) => setFormData({ ...formData, ishaJamaat: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 text-emerald-900"
                    placeholder="8:15 PM"
                  />
                </div>
              </div>
            </div>

            {/* If Friday: Jumuah Settings */}
            {dayItem.isFriday && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-2">
                <span className="text-xs font-extrabold text-purple-900 block">জুমার বিশেষ সময়সূচি</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10.5px] text-slate-500 block mb-0.5">আজান</label>
                    <input
                      type="text"
                      value={formData.jumuahAdhan}
                      onChange={(e) => setFormData({ ...formData, jumuahAdhan: e.target.value })}
                      className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-white border border-purple-300 rounded-lg"
                      placeholder="12:30 PM"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-500 block mb-0.5">খুতবা</label>
                    <input
                      type="text"
                      value={formData.jumuahKhutbah}
                      onChange={(e) => setFormData({ ...formData, jumuahKhutbah: e.target.value })}
                      className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-white border border-purple-300 rounded-lg"
                      placeholder="1:00 PM"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-emerald-800 font-bold block mb-0.5">জামাত</label>
                    <input
                      type="text"
                      value={formData.jumuahJamaat}
                      onChange={(e) => setFormData({ ...formData, jumuahJamaat: e.target.value })}
                      className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-white border border-emerald-400 rounded-lg text-emerald-950 font-bold"
                      placeholder="1:30 PM"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              বিশেষ মন্তব্য বা কারণ (ঐচ্ছিক):
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
              placeholder="উদা: বিশেষ দোয়া বা ওয়াজ মাহফিল উপলক্ষে আজান ও জামাত ১০ মিনিট পেছানো হলো"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            {existingOverride ? (
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 flex items-center space-x-1.5 text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>কাস্টম মুছে ডিফল্ট সেটিংসে ফিরুন</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow flex items-center space-x-1.5 text-xs transition"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

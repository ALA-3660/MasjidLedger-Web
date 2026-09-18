import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { Staff } from '../types';
import { Language, translations } from '../lib/i18n';

interface StaffLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  preselectedStaffId?: string;
  onSubmit: (data: {
    staffId: string;
    leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'EMERGENCY' | 'OTHER';
    leaveTypeBn?: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason?: string;
    emergencyContact?: string;
    notes?: string;
    autoApprove?: boolean;
  }) => Promise<void>;
  language?: Language;
}

export const StaffLeaveModal: React.FC<StaffLeaveModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  preselectedStaffId,
  onSubmit,
  language = 'bn'
}) => {
  const t = translations[language] || translations.bn;

  const [staffId, setStaffId] = useState<string>(preselectedStaffId || (staffList[0]?.id || ''));
  const [leaveType, setLeaveType] = useState<'CASUAL' | 'SICK' | 'ANNUAL' | 'EMERGENCY' | 'OTHER'>('CASUAL');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [daysCount, setDaysCount] = useState<number>(1);
  const [reason, setReason] = useState<string>('ব্যক্তিগত ছুটি');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto calculate days count when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const diffTime = e.getTime() - s.getTime();
        const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        setDaysCount(diffDays);
      }
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  const selectedStaff = staffList.find((s) => s.id === staffId);

  const leaveTypeNames: Record<string, string> = {
    CASUAL: 'নৈমিত্তিক ছুটি (Casual Leave)',
    SICK: 'অসুস্থতাজনিত ছুটি (Sick Leave)',
    ANNUAL: 'বাৎসরিক ছুটি (Annual Leave)',
    EMERGENCY: 'জরুরি ছুটি (Emergency Leave)',
    OTHER: 'অন্যান্য ছুটি (Other Leave)'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffId) {
      setError('অনুগ্রহ করে স্টাফ নির্বাচন করুন।');
      return;
    }
    if (!startDate || !endDate) {
      setError('ছুটির শুরুর ও সমাপ্তির তারিখ নির্বাচন করুন।');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('ছুটি সমাপ্তির তারিখ শুরুর তারিখের পূর্ববর্তী হতে পারে না।');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        staffId,
        leaveType,
        leaveTypeBn: leaveTypeNames[leaveType],
        startDate,
        endDate,
        daysCount,
        reason,
        emergencyContact,
        notes,
        autoApprove
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'ছুটি নথিভুক্ত করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">স্টাফ ছুটি আবেদন ও নথিভুক্তি</h3>
              <p className="text-xs text-slate-300">ছুটির রেকর্ড সংরক্ষণ ও স্ট্যাটাস ব্যবস্থাপনা</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Staff */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              স্টাফের নাম <span className="text-rose-500">*</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">-- স্টাফ নির্বাচন করুন --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designationBn})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ছুটির ধরন <span className="text-rose-500">*</span>
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="CASUAL">নৈমিত্তিক ছুটি (Casual Leave)</option>
              <option value="SICK">অসুস্থতাজনিত ছুটি (Sick Leave)</option>
              <option value="ANNUAL">বাৎসরিক ছুটি (Annual Leave)</option>
              <option value="EMERGENCY">জরুরি ছুটি (Emergency Leave)</option>
              <option value="OTHER">অন্যান্য ছুটি (Other)</option>
            </select>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ছুটি শুরুর তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ছুটি সমাপ্তির তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Days count highlight */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <span>মোট ছুটির মেয়াদকাল:</span>
            <span className="text-sm font-bold text-amber-950">{daysCount} দিন</span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ছুটির কারণ
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: গ্রামের বাড়ি গমন / শারীরিক অসুস্থতা"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Emergency Contact & Substitute */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ছুটিকালীন বিকল্প দায়িত্বপ্রাপ্ত ব্যক্তি / জরুরি যোগাযোগ নম্বর
            </label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="নাম ও মোবাইল নম্বর"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Approval Toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoApprove"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
            />
            <label htmlFor="autoApprove" className="text-xs font-medium text-slate-700">
              কমিটি কর্তৃক অনুমোদিত হিসেবে সরাসরি চিহ্নিত করুন
            </label>
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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'ছুটি নথিভুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

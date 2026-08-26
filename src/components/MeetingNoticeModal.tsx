import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  FileText,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Building2,
  Download
} from 'lucide-react';
import { CommitteeMeetingNotice, Mosque, CommitteeMember } from '../types';
import { formatDate } from '../lib/i18n';

interface MeetingNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNotice?: (data: any) => Promise<void>;
  onSave?: (data: any) => Promise<void>;
  mosque: Mosque | null;
  members?: CommitteeMember[];
  existingNoticesCount?: number;
  language?: any;
}

const BENGALI_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

export const MeetingNoticeModal: React.FC<MeetingNoticeModalProps> = ({
  isOpen,
  onClose,
  onSaveNotice,
  onSave,
  mosque,
  members = [],
  existingNoticesCount = 0,
}) => {
  const currentYear = new Date().getFullYear();
  const nextSeq = String(existingNoticesCount + 1).padStart(3, '0');
  const defaultMemo = `MJMWS-${currentYear}/${nextSeq}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const [memoNo, setMemoNo] = useState(defaultMemo);
  const [serialNumber, setSerialNumber] = useState(String(existingNoticesCount + 1));
  const [noticeDate, setNoticeDate] = useState(todayStr);
  const [meetingDate, setMeetingDate] = useState(todayStr);
  const [dayName, setDayName] = useState('শুক্রবার');
  const [time, setTime] = useState('বাদ আসর');
  const [venue, setVenue] = useState(mosque?.name ? `${mosque.name} কার্যালয়` : 'মসজিদ কার্যালয়');
  const [meetingType, setMeetingType] = useState('GENERAL');
  const [meetingTypeBn, setMeetingTypeBn] = useState('সাধারণ সভা');
  const [agendas, setAgendas] = useState<string[]>([
    'বিগত সভার কার্যবিবরণী পাঠ ও অনুমোদন।',
    'মসজিদের মাসিক আয়-ব্যয়ের হিসাব পেশ।',
    'বিবিধ।'
  ]);
  const [remarks, setRemarks] = useState('সকল সম্মানিত সদস্যবৃন্দকে যথাসময়ে উপস্থিত থাকার জন্য বিশেষভাবে অনুরোধ জানানো হচ্ছে।');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const calculateBengaliDay = (dStr: string) => {
    if (!dStr) return 'শুক্রবার';
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return BENGALI_DAYS[d.getDay()];
    }
    return 'শুক্রবার';
  };

  const handleMeetingDateChange = (val: string) => {
    setMeetingDate(val);
    setDayName(calculateBengaliDay(val));
  };

  const handleAddAgenda = () => {
    setAgendas([...agendas, '']);
  };

  const handleUpdateAgenda = (idx: number, val: string) => {
    const next = [...agendas];
    next[idx] = val;
    setAgendas(next);
  };

  const handleRemoveAgenda = (idx: number) => {
    if (agendas.length <= 1) return;
    setAgendas(agendas.filter((_, i) => i !== idx));
  };

  const handleMeetingTypeChange = (val: string) => {
    setMeetingType(val);
    const map: Record<string, string> = {
      GENERAL: 'সাধারণ সভা',
      MONTHLY: 'মাসিক সভা',
      EMERGENCY: 'জরুরি সভা',
      SPECIAL: 'বিশেষ সভা',
      ANNUAL: 'বার্ষিক সভা',
      OTHER: 'অন্যান্য সভা',
    };
    setMeetingTypeBn(map[val] || 'সাধারণ সভা');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!memoNo.trim()) {
      setFormError('স্মারক নং প্রদান করুন।');
      return;
    }
    if (!meetingDate) {
      setFormError('মিটিংয়ের তারিখ নির্ধারণ করুন।');
      return;
    }

    const cleanAgendas = agendas.filter(a => a.trim() !== '');
    if (cleanAgendas.length === 0) {
      setFormError('কমপক্ষে একটি এজেন্ডা বা আলোচ্যসূচি যুক্ত করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const saveFunction = onSaveNotice || onSave;
      if (saveFunction) {
        await saveFunction({
          memoNo,
          serialNumber,
          noticeDate,
          meetingDate,
          dayName,
          time,
          venue,
          meetingType,
          meetingTypeBn,
          agendas: cleanAgendas,
          remarks,
        });
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'নোটিশ তৈরিতে ত্রুটি দেখা দিয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-siliguri">
                নতুন মিটিং আহবান নোটিশ (Create Meeting Notice)
              </h2>
              <p className="text-[11px] text-slate-400 font-baloo">
                কমিটি সদস্যদের জন্য অফিসিয়াল মিটিং আহবানের চিঠি
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 font-baloo flex-1">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">স্মারক নং (Memo No)</label>
              <input
                type="text"
                value={memoNo}
                onChange={(e) => setMemoNo(e.target.value)}
                placeholder="MJMWS-2026/0001"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">মিটিং ক্রমিক নং</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="১ / ০২"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">নোটিশ জারির তারিখ</label>
              <input
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">মিটিংয়ের ধরণ</label>
              <select
                value={meetingType}
                onChange={(e) => handleMeetingTypeChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold"
              >
                <option value="GENERAL">সাধারণ সভা</option>
                <option value="MONTHLY">মাসিক সভা</option>
                <option value="EMERGENCY">জরুরি সভা</option>
                <option value="SPECIAL">বিশেষ সভা</option>
                <option value="ANNUAL">বার্ষিক সভা</option>
                <option value="OTHER">অন্যান্য সভা</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">মিটিংয়ের তারিখ</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => handleMeetingDateChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">বার / দিন</label>
              <input
                type="text"
                value={dayName}
                onChange={(e) => setDayName(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2 text-xs text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">সময়</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="বাদ আসর / ০৪:৩০ PM"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">স্থান / ভেন্যু</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="মসজিদ কার্যালয়"
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                required
              />
            </div>
          </div>

          {/* Agendas */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <label className="text-xs font-bold text-slate-800 font-siliguri uppercase">
                মিটিংয়ের এজেন্ডা / আলোচ্যসূচি
              </label>
              <button
                type="button"
                onClick={handleAddAgenda}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>এজেন্ডা যোগ করুন</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {agendas.map((ag, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="w-6 text-xs font-bold text-slate-500 text-center font-siliguri">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={ag}
                    onChange={(e) => handleUpdateAgenda(idx, e.target.value)}
                    placeholder={`এজেন্ডা #${idx + 1}...`}
                    className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAgenda(idx)}
                    disabled={agendas.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="pt-1">
            <label className="block text-slate-700 font-bold text-xs mb-1">মন্তব্য / বিশেষ অনুরোধ</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
            />
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'নোটিশ তৈরি ও সংরক্ষণ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// 2. MEETING NOTICE PRINT DOCUMENT MODAL
// ============================================================
interface MeetingNoticePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: CommitteeMeetingNotice | null;
  mosque: Mosque | null;
  members: CommitteeMember[];
}

export const MeetingNoticePrintModal: React.FC<MeetingNoticePrintModalProps> = ({
  isOpen,
  onClose,
  notice,
  mosque,
  members,
}) => {
  if (!isOpen || !notice) return null;

  const toBanglaNum = (n: number | string): string => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  const handlePrint = () => {
    window.print();
  };

  const president = members.find(m => m.position === 'PRESIDENT');
  const secretary = members.find(m => m.position === 'SECRETARY');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto report-modal-print-wrapper">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto report-modal-print-card">
        
        {/* Controls - hidden on print */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold font-siliguri block">
                মিটিং আহবান নোটিশ (Print Letterhead)
              </span>
              <span className="text-[10px] text-slate-400 font-baloo">
                স্মারক নং: {notice.memoNo}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-print-notice-action"
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold font-siliguri flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Document Body */}
        <div className="p-6 sm:p-10 max-h-[85vh] overflow-y-auto print:overflow-visible print:max-h-none print:p-0 bg-slate-50/50 print:bg-white report-modal-print-body font-print-body text-slate-900">
          <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-6 min-h-[297mm] flex flex-col justify-between">
            <div>
              {/* Bismillah */}
              <div className="text-center mb-3">
                <p className="font-arabic-bismillah text-lg text-slate-800 leading-none">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              </div>

              {/* Letterhead Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
                  {mosque?.logoUrl ? (
                    <img src={mosque.logoUrl} alt={mosque.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-900 text-white rounded-lg p-1 text-center">
                      <Building2 className="w-6 h-6 mb-0.5 opacity-80" />
                      <span className="text-[9px] font-bold font-siliguri">মসজিদ</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center px-4">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-mosque-name text-slate-950 tracking-tight leading-tight">
                    {mosque?.name || 'মসজিদ কমপ্লেক্স'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-700 font-letterhead mt-1">
                    {mosque?.address || 'মসজিদ রোড, ঢাকা, বাংলাদেশ'}
                  </p>
                  <p className="text-xs text-slate-600 font-letterhead mt-0.5">
                    {mosque?.phone && <span>মোবাইল: {mosque.phone}</span>}
                    {mosque?.registrationNumber && <span> • রেজিঃ নং: {mosque.registrationNumber}</span>}
                  </p>
                </div>

                <div className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-slate-50/80 p-1 text-center">
                  <span className="text-[9px] font-bold text-slate-500 font-baloo uppercase">নোটিশ নং</span>
                  <span className="text-xs font-extrabold text-blue-950 font-siliguri mt-0.5">
                    {notice.serialNumber || '০১'}
                  </span>
                </div>
              </div>

              {/* Memo and Date Row */}
              <div className="flex items-center justify-between text-xs font-baloo text-slate-800 mb-5 border-b border-slate-200 pb-2">
                <div>
                  <span className="font-bold text-slate-900">স্মারক নং: </span>
                  <span>{notice.memoNo}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">তারিখ: </span>
                  <span>{formatDate(notice.noticeDate, 'bn')}</span>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center mb-6">
                <div className="inline-block bg-slate-900 text-white px-6 py-1 rounded-md shadow-xs">
                  <h2 className="text-base font-bold font-siliguri tracking-wide">
                    মিটিং আহবান নোটিশ
                  </h2>
                </div>
                <p className="text-xs font-baloo text-blue-900 mt-1 font-semibold">
                  [{notice.meetingTypeBn || 'সাধারণ সভা'}]
                </p>
              </div>

              {/* Notice Body Text */}
              <div className="space-y-4 text-xs sm:text-sm font-baloo text-slate-900 leading-relaxed">
                <p>
                  সম্মানিত সদস্যবৃন্দ,
                </p>
                <p className="text-justify">
                  আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। অত্র মসজিদ পরিচালনা কমিটির সকল সম্মানিত সদস্যবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, আগামী <span className="font-bold text-slate-950">{formatDate(notice.meetingDate, 'bn')}</span> রোজ <span className="font-bold text-slate-950">{notice.dayName}</span>, সময়: <span className="font-bold text-slate-950">{notice.time}</span> ঘটিকায় <span className="font-bold text-slate-950">{notice.venue}</span>-এ কমিটির এক গুরুত্বপূর্ণ <span className="font-bold text-slate-950">{notice.meetingTypeBn || 'সাধারণ সভা'}</span> অনুষ্ঠিত হবে, ইনশাআল্লাহ।
                </p>

                {/* Agendas Box */}
                <div className="my-4 border border-slate-300 rounded-xl p-4 bg-slate-50/60">
                  <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    সভার আলোচ্যসূচি (এজেন্ডা):
                  </h3>
                  <ol className="space-y-1.5 text-xs sm:text-sm list-none pl-0">
                    {notice.agendas.map((ag, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="font-bold text-blue-900 w-5 flex-shrink-0">
                          {toBanglaNum(idx + 1)}.
                        </span>
                        <span className="flex-1">{ag}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {notice.remarks && (
                  <p className="p-3 bg-blue-50/50 border-l-4 border-blue-600 text-xs text-slate-800 italic">
                    {notice.remarks}
                  </p>
                )}

                <p className="pt-2">
                  উক্ত সভায় সংশ্লিষ্ট সকলকে যথাসময়ে উপস্থিত থেকে মসজিদের সার্বিক উন্নয়নে সুচিন্তিত মতামত প্রদানের জন্য অনুরোধ করা হলো।
                </p>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="mt-12 pt-6 border-t border-slate-200">
              <div className="flex items-end justify-between px-6">
                <div className="text-center w-48">
                  {mosque?.presidentSignatureUrl ? (
                    <div className="h-12 flex items-end justify-center mb-1">
                      <img src={mosque.presidentSignatureUrl} alt="সভাপতি" className="max-h-10 object-contain" />
                    </div>
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="text-xs font-bold font-siliguri text-slate-950">
                      {president?.name || 'সভাপতি'}
                    </p>
                    <p className="text-[10px] text-slate-600 font-baloo">সভাপতি</p>
                    <p className="text-[9px] text-slate-500 font-baloo">{mosque?.name}</p>
                  </div>
                </div>

                <div className="text-center w-48">
                  {mosque?.secretarySignatureUrl ? (
                    <div className="h-12 flex items-end justify-center mb-1">
                      <img src={mosque.secretarySignatureUrl} alt="সেক্রেটারী" className="max-h-10 object-contain" />
                    </div>
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="text-[10px] text-slate-500 font-baloo font-semibold">অনুরোধক্রমে,</p>
                    <p className="text-xs font-bold font-siliguri text-slate-950">
                      {secretary?.name || 'সাধারণ সম্পাদক'}
                    </p>
                    <p className="text-[10px] text-slate-600 font-baloo">সেক্রেটারী / মোতাওয়াল্লী</p>
                    <p className="text-[9px] text-slate-500 font-baloo">{mosque?.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400 font-baloo flex items-center justify-between">
                <span>স্মারক নং: {notice.memoNo}</span>
                <span>MasjidLedger • অফিসিয়াল মিটিং আহবান নোটিশ</span>
                <span>নোটিশ আইডি: {notice.id}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

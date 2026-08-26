import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  Award,
  FileCheck2,
  Sparkles,
  HelpCircle,
  AlertCircle,
  History,
  FileText,
  UserPlus,
  ArrowRight,
  Printer
} from 'lucide-react';
import {
  CommitteeMeeting,
  CommitteeMember,
  CommitteeMeetingNotice,
  ResponsibleMember,
  MeetingAttendee,
  MeetingStatus,
  Mosque
} from '../types';

interface MeetingMinutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeeting?: (meetingData: any) => Promise<void>;
  onSave?: (meetingData: any) => Promise<void>;
  members: CommitteeMember[];
  notices: CommitteeMeetingNotice[];
  existingMeeting?: CommitteeMeeting | null;
  initialMeeting?: CommitteeMeeting | null;
  isRevisionMode?: boolean;
  mosque?: Mosque | null;
  language?: any;
}

const BENGALI_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

export const MeetingMinutesModal: React.FC<MeetingMinutesModalProps> = ({
  isOpen,
  onClose,
  onSaveMeeting,
  onSave,
  members,
  notices,
  existingMeeting,
  initialMeeting,
  isRevisionMode = false,
  mosque,
}) => {
  const currentTargetMeeting = existingMeeting || initialMeeting;
  const activeMembers = members.filter(m => m.status === 'ACTIVE');

  // Form State
  const [selectedNoticeId, setSelectedNoticeId] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [memoNumber, setMemoNumber] = useState<string>('');
  const [meetingNumber, setMeetingNumber] = useState<string>('');
  const [noticeDate, setNoticeDate] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [dayName, setDayName] = useState<string>('শুক্রবার');
  const [time, setTime] = useState<string>('বাদ আসর');
  const [closingTime, setClosingTime] = useState<string>('সন্ধ্যা ০৬:৩০');
  const [location, setLocation] = useState<string>('মসজিদ কার্যালয়');
  const [meetingType, setMeetingType] = useState<string>('GENERAL');
  const [meetingTypeBn, setMeetingTypeBn] = useState<string>('সাধারণ সভা');

  // Leadership
  const [conductor, setConductor] = useState<string>('');
  const [conductorMemberId, setConductorMemberId] = useState<string>('');
  const [chairman, setChairman] = useState<string>('');
  const [chairmanMemberId, setChairmanMemberId] = useState<string>('');
  const [chairmanDesignation, setChairmanDesignation] = useState<string>('সভাপতি');
  const [secretary, setSecretary] = useState<string>('');
  const [secretaryMemberId, setSecretaryMemberId] = useState<string>('');
  const [duaLeader, setDuaLeader] = useState<string>('');
  const [duaLeaderMemberId, setDuaLeaderMemberId] = useState<string>('');

  // Agendas & Decisions
  const [agendas, setAgendas] = useState<string[]>(['বিগত সভার কার্যবিবরণী পাঠ ও অনুমোদন', 'মাসিক আয়-ব্যয়ের হিসাব পেশ']);
  const [decisions, setDecisions] = useState<string[]>([
    'বিগত সভার কার্যবিবরণী সর্বসম্মতিক্রমে অনুমোদিত হলো।',
    'চলতি মাসের সকল আয়-ব্যয়ের হিসাব নিরীক্ষা শেষে চূড়ান্তভাবে গৃহিত হলো।'
  ]);
  const [miscellaneous, setMiscellaneous] = useState<string>('');

  // Responsible Members
  const [responsibleMembers, setResponsibleMembers] = useState<ResponsibleMember[]>([]);

  // Attendees Management
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);

  // Revision handling
  const [revisionReason, setRevisionReason] = useState<string>('');
  const [status, setStatus] = useState<MeetingStatus>('FINAL');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Auto-calculate day name from date
  const calculateBengaliDay = (dateStr: string) => {
    if (!dateStr) return 'শুক্রবার';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return BENGALI_DAYS[d.getDay()];
    }
    return 'শুক্রবার';
  };

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      setFormError('');
      if (currentTargetMeeting) {
        setDocumentNumber(currentTargetMeeting.documentNumber || '');
        setMemoNumber(currentTargetMeeting.memoNumber || '');
        setMeetingNumber(currentTargetMeeting.meetingNumber || '');
        setSelectedNoticeId(currentTargetMeeting.meetingNoticeId || '');
        setNoticeDate(currentTargetMeeting.noticeDate || '');
        setDate(currentTargetMeeting.date || new Date().toISOString().split('T')[0]);
        setDayName(currentTargetMeeting.dayName || calculateBengaliDay(currentTargetMeeting.date));
        setTime(currentTargetMeeting.time || 'বাদ আসর');
        setClosingTime(currentTargetMeeting.closingTime || '');
        setLocation(currentTargetMeeting.location || 'মসজিদ কার্যালয়');
        setMeetingType(currentTargetMeeting.meetingType || 'GENERAL');
        setMeetingTypeBn(currentTargetMeeting.meetingTypeBn || 'সাধারণ সভা');

        setConductor(currentTargetMeeting.conductor || '');
        setConductorMemberId(currentTargetMeeting.conductorMemberId || '');
        setChairman(currentTargetMeeting.chairman || '');
        setChairmanMemberId(currentTargetMeeting.chairmanMemberId || '');
        setChairmanDesignation(currentTargetMeeting.chairmanDesignation || 'সভাপতি');
        setSecretary(currentTargetMeeting.secretary || '');
        setSecretaryMemberId(currentTargetMeeting.secretaryMemberId || '');
        setDuaLeader(currentTargetMeeting.duaLeader || '');
        setDuaLeaderMemberId(currentTargetMeeting.duaLeaderMemberId || '');

        setAgendas(currentTargetMeeting.agenda && currentTargetMeeting.agenda.length > 0 ? currentTargetMeeting.agenda : ['সাধারণ আলোচ্যসূচি']);
        setDecisions(currentTargetMeeting.decisions && currentTargetMeeting.decisions.length > 0 ? currentTargetMeeting.decisions : ['সিদ্ধান্ত']);
        setMiscellaneous(currentTargetMeeting.miscellaneous || '');
        setResponsibleMembers(currentTargetMeeting.responsibleMembers || []);
        setStatus(isRevisionMode ? 'REVISED' : currentTargetMeeting.status || 'FINAL');

        if (currentTargetMeeting.attendees && currentTargetMeeting.attendees.length > 0) {
          setAttendees(currentTargetMeeting.attendees);
        } else {
          // Initialize from active members
          const initialAttendees: MeetingAttendee[] = activeMembers.map(m => ({
            memberId: m.id,
            name: m.name,
            designation: m.positionCustomBn || m.position,
            phone: m.phone,
            attendanceStatus: currentTargetMeeting.membersPresent?.includes(m.name) ? 'PRESENT' : 'ABSENT',
          }));
          setAttendees(initialAttendees);
        }
      } else {
        // Fresh creation
        const todayStr = new Date().toISOString().split('T')[0];
        const count = 1;
        const currentYear = new Date().getFullYear();
        setDocumentNumber(`MM-${currentYear}-${String(Date.now()).slice(-4)}`);
        setMemoNumber(`MJMWS-${currentYear}/${String(Math.floor(Math.random() * 900) + 100)}`);
        setMeetingNumber('১');
        setSelectedNoticeId('');
        setNoticeDate(todayStr);
        setDate(todayStr);
        setDayName(calculateBengaliDay(todayStr));
        setTime('বাদ আসর');
        setClosingTime('সন্ধ্যা ০৬:৩০');
        setLocation(mosque?.name ? `${mosque.name} কার্যালয়` : 'মসজিদ কার্যালয়');
        setMeetingType('GENERAL');
        setMeetingTypeBn('সাধারণ সভা');

        // Pre-fill leaders from active committee members
        const pres = activeMembers.find(m => m.position === 'PRESIDENT');
        const sec = activeMembers.find(m => m.position === 'SECRETARY');
        const imam = activeMembers.find(m => m.position === 'IMAM');

        if (pres) {
          setChairman(pres.name);
          setChairmanMemberId(pres.id);
          setChairmanDesignation(pres.positionCustomBn || 'সভাপতি');
        } else {
          setChairman('');
          setChairmanMemberId('');
          setChairmanDesignation('সভাপতি');
        }

        if (sec) {
          setConductor(sec.name);
          setConductorMemberId(sec.id);
          setSecretary(sec.name);
          setSecretaryMemberId(sec.id);
        } else {
          setConductor('');
          setConductorMemberId('');
          setSecretary('');
          setSecretaryMemberId('');
        }

        if (imam) {
          setDuaLeader(imam.name);
          setDuaLeaderMemberId(imam.id);
        } else {
          setDuaLeader('');
          setDuaLeaderMemberId('');
        }

        setAgendas(['বিগত সভার কার্যবিবরণী পর্যালোচনা ও অনুমোদন', 'মসজিদের সার্বিক ব্যবস্থাপনা ও উন্নয়ন আলোচনা', 'বিবিধ']);
        setDecisions(['বিগত সভার সিদ্ধান্তসমূহ পর্যালোচনা করে সন্তোষ প্রকাশ করা হলো ও অনুমোদন দেওয়া হলো।']);
        setMiscellaneous('');
        setResponsibleMembers([]);
        setStatus('FINAL');
        setRevisionReason('');

        // Attendees default all present
        const initialAttendees: MeetingAttendee[] = activeMembers.map(m => ({
          memberId: m.id,
          name: m.name,
          designation: m.positionCustomBn || m.position,
          phone: m.phone,
          attendanceStatus: 'PRESENT',
        }));
        setAttendees(initialAttendees);
      }
    }
  }, [isOpen, currentTargetMeeting, isRevisionMode]);

  // Handle Notice selection auto-population
  const handleSelectNotice = (noticeId: string) => {
    setSelectedNoticeId(noticeId);
    if (!noticeId) return;
    const n = notices.find(item => item.id === noticeId);
    if (n) {
      setMemoNumber(n.memoNo);
      setMeetingNumber(n.serialNumber || '১');
      setNoticeDate(n.noticeDate);
      setDate(n.meetingDate);
      setDayName(n.dayName || calculateBengaliDay(n.meetingDate));
      setTime(n.time || 'বাদ আসর');
      setLocation(n.venue || 'মসজিদ কার্যালয়');
      if (n.meetingType) setMeetingType(n.meetingType);
      if (n.meetingTypeBn) setMeetingTypeBn(n.meetingTypeBn);
      if (n.agendas && n.agendas.length > 0) {
        setAgendas([...n.agendas]);
      }
    }
  };

  // Date change handler
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setDayName(calculateBengaliDay(newDate));
  };

  // Agenda list handlers
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

  // Decisions list handlers
  const handleAddDecision = () => {
    setDecisions([...decisions, '']);
  };

  const handleUpdateDecision = (idx: number, val: string) => {
    const next = [...decisions];
    next[idx] = val;
    setDecisions(next);
  };

  const handleRemoveDecision = (idx: number) => {
    if (decisions.length <= 1) return;
    setDecisions(decisions.filter((_, i) => i !== idx));
  };

  // Responsible member row handlers
  const handleAddResponsibleMember = () => {
    const firstMember = activeMembers[0];
    setResponsibleMembers([
      ...responsibleMembers,
      {
        memberId: firstMember?.id,
        name: firstMember?.name || '',
        designation: firstMember?.positionCustomBn || firstMember?.position || 'সদস্য',
        roleDescription: '',
      },
    ]);
  };

  const handleUpdateResponsibleMember = (idx: number, field: keyof ResponsibleMember, val: string) => {
    const next = [...responsibleMembers];
    if (field === 'memberId') {
      const selected = activeMembers.find(m => m.id === val);
      next[idx].memberId = val;
      next[idx].name = selected?.name || '';
      next[idx].designation = selected?.positionCustomBn || selected?.position || 'সদস্য';
    } else {
      (next[idx] as any)[field] = val;
    }
    setResponsibleMembers(next);
  };

  const handleRemoveResponsibleMember = (idx: number) => {
    setResponsibleMembers(responsibleMembers.filter((_, i) => i !== idx));
  };

  // Attendee Status Toggle
  const handleSetAllAttendance = (attStatus: 'PRESENT' | 'ABSENT') => {
    setAttendees(attendees.map(a => ({ ...a, attendanceStatus: attStatus })));
  };

  const handleAttendeeStatusChange = (idx: number, attStatus: 'PRESENT' | 'ABSENT' | 'LEAVE') => {
    const next = [...attendees];
    next[idx].attendanceStatus = attStatus;
    setAttendees(next);
  };

  // Meeting Type change
  const handleMeetingTypeChange = (typeVal: string) => {
    setMeetingType(typeVal);
    const map: Record<string, string> = {
      GENERAL: 'সাধারণ সভা',
      MONTHLY: 'মাসিক সভা',
      EMERGENCY: 'জরুরি সভা',
      SPECIAL: 'বিশেষ সভা',
      ANNUAL: 'বার্ষিক সভা',
      OTHER: 'অন্যান্য সভা',
    };
    setMeetingTypeBn(map[typeVal] || 'সাধারণ সভা');
  };

  // Submit form
  const handleSubmit = async (submitStatus: MeetingStatus) => {
    setFormError('');
    if (!chairman.trim()) {
      setFormError('দয়া করে সভাপতির নাম নির্বাচন বা প্রদান করুন।');
      return;
    }
    if (!date) {
      setFormError('মিটিংয়ের তারিখ নির্ধারণ করুন।');
      return;
    }
    if (isRevisionMode && !revisionReason.trim()) {
      setFormError('সংশোধিত কার্যবিবরণী সংরক্ষণের কারণ উল্লেখ করুন।');
      return;
    }

    const cleanAgendas = agendas.filter(a => a.trim() !== '');
    const cleanDecisions = decisions.filter(d => d.trim() !== '');

    if (cleanAgendas.length === 0) {
      setFormError('কমপক্ষে একটি এজেন্ডা বা আলোচ্যসূচি যুক্ত করুন।');
      return;
    }

    if (cleanDecisions.length === 0 && submitStatus === 'FINAL') {
      setFormError('চূড়ান্ত কার্যবিবরণীতে কমপক্ষে একটি গৃহীত সিদ্ধান্ত থাকা আবশ্যক।');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        documentNumber: documentNumber || undefined,
        meetingNumber: meetingNumber || '১',
        memoNumber: memoNumber || undefined,
        meetingNoticeId: selectedNoticeId || undefined,
        noticeDate: noticeDate || undefined,
        date,
        dayName,
        time,
        closingTime: closingTime || undefined,
        location,
        meetingType,
        meetingTypeBn,
        conductor: conductor || undefined,
        conductorMemberId: conductorMemberId || undefined,
        chairman,
        chairmanMemberId: chairmanMemberId || undefined,
        chairmanDesignation: chairmanDesignation || 'সভাপতি',
        secretary: secretary || undefined,
        secretaryMemberId: secretaryMemberId || undefined,
        duaLeader: duaLeader || undefined,
        duaLeaderMemberId: duaLeaderMemberId || undefined,
        agenda: cleanAgendas,
        decisions: cleanDecisions,
        resolutions: cleanDecisions,
        miscellaneous: miscellaneous || undefined,
        responsibleMembers: responsibleMembers.filter(r => r.name && r.roleDescription),
        attendees,
        status: isRevisionMode ? 'REVISED' : submitStatus,
        isRevision: isRevisionMode,
        revisionReason: revisionReason || undefined,
      };

      const saveFn = onSaveMeeting || onSave;
      if (saveFn) {
        await saveFn(payload);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'কার্যবিবরণী সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-siliguri flex items-center space-x-2">
                <span>
                  {isRevisionMode
                    ? 'মিটিং কার্যবিবরণী সংশোধন (Create Revised Minutes)'
                    : existingMeeting
                    ? 'মিটিং কার্যবিবরণী সম্পাদন (Edit Minutes)'
                    : 'নতুন মিটিং কার্যবিবরণী ও গৃহীত সিদ্ধান্ত (Meeting Minutes Entry)'}
                </span>
                {isRevisionMode && (
                  <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] rounded-full border border-purple-400/30 font-bold">
                    রিভিশন মোড
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 font-baloo">
                অফিসিয়াল লেটারহেড সম্বলিত প্রিন্টযোগ্য রেজোলিউশন তৈরির এন্ট্রি ফর্ম
              </p>
            </div>
          </div>
          <button
            id="btn-close-meeting-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 font-baloo">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Revision Reason banner if in revision mode */}
          {isRevisionMode && (
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-purple-900 font-bold text-xs font-siliguri">
                <History className="w-4 h-4 text-purple-700" />
                <span>সংশোধনের বিবরণ (Revision Reason)</span>
              </div>
              <input
                id="input-revision-reason"
                type="text"
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="যেমন: সিদ্ধান্ত নং ২-এ বাজেট সংশোধিত হয়েছে..."
                className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          )}

          {/* 1. Notice Link & Auto-populate Section */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-blue-950 font-siliguri flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>মিটিং আহবান (Notice) থেকে তথ্য নির্বাচন করুন</span>
              </span>
              <span className="text-[11px] text-blue-700">
                (ইস্যুকৃত নোটিশ সিলেক্ট করলে তথ্য স্বয়ংক্রিয়ভাবে পূরণ হবে)
              </span>
            </div>
            <select
              id="select-meeting-notice-link"
              value={selectedNoticeId}
              onChange={(e) => handleSelectNotice(e.target.value)}
              className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- মিটিং আহবান নোটিশ নির্বাচন করুন (ঐচ্ছিক) --</option>
              {notices.map((n) => (
                <option key={n.id} value={n.id}>
                  স্মারক: {n.memoNo} • তারিখ: {n.meetingDate} ({n.dayName}) • {n.meetingTypeBn || n.meetingType} • {n.venue}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Basic Meta Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>১. মিটিং ও নথির মৌলিক তথ্য</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">স্মারক নং (Memo No)</label>
                <input
                  id="input-meeting-memo"
                  type="text"
                  value={memoNumber}
                  onChange={(e) => setMemoNumber(e.target.value)}
                  placeholder="MJMWS-2026/0001"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">মিটিং ক্রমিক নং</label>
                <input
                  id="input-meeting-serial"
                  type="text"
                  value={meetingNumber}
                  onChange={(e) => setMeetingNumber(e.target.value)}
                  placeholder="১ / MEET-01"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">মিটিংয়ের ধরণ</label>
                <select
                  id="select-meeting-type"
                  value={meetingType}
                  onChange={(e) => handleMeetingTypeChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  id="input-meeting-date"
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">বার / দিন (Auto)</label>
                <input
                  id="input-meeting-day"
                  type="text"
                  value={dayName}
                  onChange={(e) => setDayName(e.target.value)}
                  className="w-full border border-slate-300 bg-slate-50 rounded-lg p-2 text-xs text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">মিটিং শুরু ও সমাপ্তির সময়</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    id="input-meeting-time-start"
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="বাদ আসর / ০৪:৩০ PM"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    id="input-meeting-time-close"
                    type="text"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    placeholder="সমাপ্তি: ০৬:৩০ PM"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-700 font-bold mb-1">মিটিংয়ের স্থান / ভেন্যু</label>
                <input
                  id="input-meeting-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="মসজিদ কার্যালয় / ২য় তলা"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Leadership & Conducting */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>২. সভা পরিচালনা, সভাপতিত্ব ও মোনাজাত</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              {/* Conductor */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">মিটিং পরিচালনাকারী</label>
                <select
                  id="select-meeting-conductor"
                  value={conductorMemberId}
                  onChange={(e) => {
                    const mem = activeMembers.find(m => m.id === e.target.value);
                    setConductorMemberId(e.target.value);
                    if (mem) setConductor(mem.name);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold mb-1"
                >
                  <option value="">-- সদস্য তালিকা থেকে নির্বাচন --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.positionCustomBn || m.position})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={conductor}
                  onChange={(e) => setConductor(e.target.value)}
                  placeholder="বা সরাসরি নাম লিখুন"
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-800"
                />
              </div>

              {/* Chairperson */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">সভাপতিত্বকারী (আবশ্যক)</label>
                <select
                  id="select-meeting-chairman"
                  value={chairmanMemberId}
                  onChange={(e) => {
                    const mem = activeMembers.find(m => m.id === e.target.value);
                    setChairmanMemberId(e.target.value);
                    if (mem) {
                      setChairman(mem.name);
                      setChairmanDesignation(mem.positionCustomBn || 'সভাপতি');
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold mb-1"
                >
                  <option value="">-- সভাপতি নির্বাচন --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.positionCustomBn || m.position})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={chairman}
                    onChange={(e) => setChairman(e.target.value)}
                    placeholder="সভাপতির নাম"
                    className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-800"
                  />
                  <input
                    type="text"
                    value={chairmanDesignation}
                    onChange={(e) => setChairmanDesignation(e.target.value)}
                    placeholder="পদবি (যেমন: সভাপতি)"
                    className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-800"
                  />
                </div>
              </div>

              {/* Dua Leader */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">মোনাজাত পরিচালনাকারী</label>
                <select
                  id="select-meeting-dua-leader"
                  value={duaLeaderMemberId}
                  onChange={(e) => {
                    const mem = activeMembers.find(m => m.id === e.target.value);
                    setDuaLeaderMemberId(e.target.value);
                    if (mem) setDuaLeader(mem.name);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold mb-1"
                >
                  <option value="">-- ইমাম / সদস্য নির্বাচন --</option>
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.positionCustomBn || m.position})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={duaLeader}
                  onChange={(e) => setDuaLeader(e.target.value)}
                  placeholder="বা সরাসরি নাম লিখুন"
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 4. Meeting Agendas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>৩. সভার আলোচ্যসূচি (এজেন্ডা)</span>
              </h3>
              <button
                id="btn-add-agenda-row"
                type="button"
                onClick={handleAddAgenda}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>এজেন্ডা যোগ করুন</span>
              </button>
            </div>

            <div className="space-y-2">
              {agendas.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="w-6 text-xs font-bold text-slate-500 text-center font-siliguri">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleUpdateAgenda(idx, e.target.value)}
                    placeholder={`এজেন্ডা #${idx + 1} লিখুন...`}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAgenda(idx)}
                    disabled={agendas.length <= 1}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30 cursor-pointer"
                    title="এজেন্ডা মুছুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Decisions & Resolutions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>৪. বিস্তারিত কার্যবিবরণী ও গৃহীত সিদ্ধান্ত / রেজোলিউশন</span>
              </h3>
              <button
                id="btn-add-decision-row"
                type="button"
                onClick={handleAddDecision}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>সিদ্ধান্ত যোগ করুন</span>
              </button>
            </div>

            <div className="space-y-3">
              {decisions.map((dec, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 font-siliguri">
                      সিদ্ধান্ত-{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDecision(idx)}
                      disabled={decisions.length <= 1}
                      className="text-xs text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                    >
                      মুছুন
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={dec}
                    onChange={(e) => handleUpdateDecision(idx, e.target.value)}
                    placeholder={`গৃহীত সিদ্ধান্ত #${idx + 1}-এর বিস্তারিত বিবরণ লিখুন...`}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 6. Miscellaneous (বিবিধ) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1.5">
              ৫. বিবিধ আলোচনা (ঐচ্ছিক)
            </h3>
            <textarea
              rows={2}
              value={miscellaneous}
              onChange={(e) => setMiscellaneous(e.target.value)}
              placeholder="অন্যান্য কোনো প্রাসঙ্গিক আলোচনা থাকলে এখানে লিখুন..."
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 7. Responsible Members & Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-blue-600" />
                <span>৬. দায়িত্বপ্রাপ্ত সদস্য ও অর্পিত দায়িত্ব (অ্যাকশন আইটেম)</span>
              </h3>
              <button
                id="btn-add-responsible-member"
                type="button"
                onClick={handleAddResponsibleMember}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>দায়িত্ব অর্পণ করুন</span>
              </button>
            </div>

            {responsibleMembers.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center">
                কোনো সদস্যের ওপর বিশেষ দায়িত্ব অর্পণ করা হলে তা যোগ করতে উপরের বাটনে ক্লিক করুন।
              </p>
            ) : (
              <div className="space-y-2">
                {responsibleMembers.map((resp, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4">
                      <select
                        value={resp.memberId}
                        onChange={(e) => handleUpdateResponsibleMember(idx, 'memberId', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900 font-semibold"
                      >
                        {activeMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.positionCustomBn || m.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-7">
                      <input
                        type="text"
                        value={resp.roleDescription}
                        onChange={(e) => handleUpdateResponsibleMember(idx, 'roleDescription', e.target.value)}
                        placeholder="অর্পিত দায়িত্বের বিবরণ (যেমন: সাউন্ড সিস্টেম মেরামত তদারকি)"
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveResponsibleMember(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8. Attendees & Attendance Matrix */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>৭. সভায় উপস্থিত সদস্যদের উপস্থিতি ও স্বাক্ষর তালিকা</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSetAllAttendance('PRESENT')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded cursor-pointer"
                >
                  সবাই উপস্থিত
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllAttendance('ABSENT')}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded cursor-pointer"
                >
                  রিসেট
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              * শুধুমাত্র ‘উপস্থিত’ সদস্যদের নাম অফিসিয়াল প্রিন্ট ডকুমেন্টের স্বাক্ষর তালিকায় যুক্ত হবে।
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-800 sticky top-0 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-10 text-center">#</th>
                    <th className="p-2">সদস্যের নাম</th>
                    <th className="p-2">পদবি</th>
                    <th className="p-2">মোবাইল</th>
                    <th className="p-2 text-center w-36">উপস্থিতি স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {attendees.map((att, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${att.attendanceStatus === 'PRESENT' ? 'bg-emerald-50/20' : ''}`}>
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-900">{att.name}</td>
                      <td className="p-2 text-slate-700">{att.designation}</td>
                      <td className="p-2 text-slate-600 font-mono text-[11px]">{att.phone}</td>
                      <td className="p-2 text-center">
                        <select
                          value={att.attendanceStatus}
                          onChange={(e) => handleAttendeeStatusChange(idx, e.target.value as any)}
                          className={`p-1 rounded text-xs font-bold border ${
                            att.attendanceStatus === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : att.attendanceStatus === 'LEAVE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          <option value="PRESENT">উপস্থিত (Present)</option>
                          <option value="ABSENT">অনুপস্থিত (Absent)</option>
                          <option value="LEAVE">ছুটি (Leave)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-baloo">
            মোট উপস্থিত সদস্য: <span className="font-bold text-slate-900">{attendees.filter(a => a.attendanceStatus === 'PRESENT').length} জন</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-meeting-modal"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              বাতিল
            </button>

            {!isRevisionMode && (
              <button
                id="btn-save-meeting-draft"
                type="button"
                onClick={() => handleSubmit('DRAFT')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ (Save Draft)'}
              </button>
            )}

            <button
              id="btn-finalize-meeting-minutes"
              type="button"
              onClick={() => handleSubmit('FINAL')}
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'প্রক্রিয়াধীন...'
                  : isRevisionMode
                  ? 'সংশোধিত কার্যবিবরণী চূড়ান্ত করুন'
                  : 'কার্যবিবরণী চূড়ান্ত করুন (Finalize)'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
